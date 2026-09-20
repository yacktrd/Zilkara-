/* ============================================================================
 * FILE: lib/xyvala/search/storage/search-temporal-observation-postgres-repository.ts
 * PostgreSQL persistence for explicit Search temporal observation records.
 * Requires search-temporal-observation-schema.sql, installed separately.
 *
 * Inject the Search transaction port capability and a statement timeout.
 * The PostgreSQL adapter owns configuration, connections and transaction lifecycle.
 * Writes use READ COMMITTED and a table lock before inspecting existing truth.
 * This initial version serializes writers; it makes no throughput claim.
 * Reads use one REPEATABLE READ, READ ONLY transaction, without truncation.
 * Never expose diagnostic reasons or stored records directly through HTTP.
 * No observation production, migration execution, environment lookup or retry.
 * No UPDATE, DELETE, TRUNCATE, clock or random identity generation.
 * ========================================================================== */
import { isDeepStrictEqual } from "node:util";
import type {
  SearchTemporalPostgresTransactionClient,
  SearchTemporalPostgresWithTransaction,
} from "../contracts/search-temporal-postgres-transaction-port-contract";
import type {
  SearchTemporalObservationRecord as RecordValue,
  SearchTemporalObservationReadInput as ReadInput,
  SearchTemporalObservationReadResult as ReadResult,
  SearchTemporalObservationWriteResult as WriteResult,
  SearchTemporalObservationStore as Store,
  SearchTemporalObservationStoreFailure as Failure,
} from "../contracts/search-temporal-observation-store-contract";
import {
  validateAndCopySearchTemporalObservationRecord as copyRecord,
  SearchTemporalObservationRecordBoundaryError,
} from "../temporal/search-temporal-observation-record-boundary";
import { assertSearchTemporalDocumentSeriesId } from "../temporal/search-temporal-document-series-identity";
export const XYVALA_SEARCH_TEMPORAL_OBSERVATION_POSTGRES_REPOSITORY_MODULE_VERSION =
  "2.0.1" as const;
export interface SearchTemporalPostgresDependencies {
  readonly with_transaction: SearchTemporalPostgresWithTransaction;
  readonly statement_timeout_ms: number;
}

const TABLE = "public.xyvala_search_temporal_observations";
const COLUMNS = "observation_key, document_series_id, document_key, observed_at_ms, record_format, payload";
const FORMAT = "1.0.0";
const NEGATIVE_ZERO = "$search_negative_zero_v1";
class InvalidStoredRecord extends Error {}
function invalidStored(): never {
  throw new InvalidStoredRecord("INVALID_STORED_RECORD");
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function key(value: string): string {
  return JSON.stringify(value);
}
function encode(record: RecordValue): string {
  return JSON.stringify(record, (_key, value: unknown) =>
    typeof value === "number" && Object.is(value, -0)
      ? { [NEGATIVE_ZERO]: true }
      : value,
  );
}
function decode(row: unknown): RecordValue {
  if (!object(row) || row.record_format !== FORMAT || typeof row.payload !== "string") {
    return invalidStored();
  }
  let record: RecordValue;
  try {
    const parsed: unknown = JSON.parse(row.payload, (_key, value: unknown) =>
      object(value) && Object.keys(value).length === 1 && value[NEGATIVE_ZERO] === true
        ? -0
        : value,
    );
    record = copyRecord(parsed);
  } catch {
    return invalidStored();
  }
  const observation = record.observation;
  const milliseconds = Date.parse(observation.observed_at);
  if (
    row.observation_key !== key(observation.observation_id) ||
    row.document_series_id !== observation.document_series_id ||
    row.document_key !== key(observation.document_id) ||
    (row.observed_at_ms !== milliseconds && row.observed_at_ms !== String(milliseconds))
  ) return invalidStored();
  return record;
}
function failure(status: Failure["status"], reason: string): Failure {
  return Object.freeze({ status, reason });
}
function readInput(input: ReadInput): ReadInput {
  if (!object(input) || Reflect.ownKeys(input).length !== 2) {
    throw new SearchTemporalObservationRecordBoundaryError("read_input");
  }
  const series = Object.getOwnPropertyDescriptor(input, "document_series_id");
  const current = Object.getOwnPropertyDescriptor(input, "current_observation_id");
  if (!series || !("value" in series) || !current || !("value" in current)) {
    throw new SearchTemporalObservationRecordBoundaryError("read_input");
  }
  const id: unknown = current.value;
  const seriesId: unknown = series.value;
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new SearchTemporalObservationRecordBoundaryError("current_observation_id");
  }
  try { assertSearchTemporalDocumentSeriesId(seriesId); } catch {
    throw new SearchTemporalObservationRecordBoundaryError("document_series_id");
  }
  return Object.freeze({ document_series_id: seriesId, current_observation_id: id });
}
function compareRecords(a: RecordValue, b: RecordValue): number {
  const delta = Date.parse(a.observation.observed_at) - Date.parse(b.observation.observed_at);
  if (delta !== 0) return delta;
  const left = a.observation.observation_id;
  const right = b.observation.observation_id;
  return left < right ? -1 : left > right ? 1 : 0;
}
export function createSearchTemporalObservationPostgresRepository(
  dependencies: SearchTemporalPostgresDependencies,
): Store {
  if (!dependencies || typeof dependencies.with_transaction !== "function" ||
      !Number.isSafeInteger(dependencies.statement_timeout_ms) ||
      dependencies.statement_timeout_ms <= 0 || dependencies.statement_timeout_ms > 2147483647) {
    throw new Error("Canonical PostgreSQL transaction operation and positive statement timeout required.");
  }
  const withTransaction = dependencies.with_transaction;
  const timeout = String(dependencies.statement_timeout_ms);
  async function transaction<T>(
    write: boolean,
    operation: (client: SearchTemporalPostgresTransactionClient) => Promise<T>,
  ): Promise<T | Failure> {
    let invalidRecord = false;
    try {
      const result = await withTransaction(async (client) => {
        try {
          await client.query("SELECT set_config('statement_timeout', $1, true)", [timeout]);
          if (write) await client.query(`LOCK TABLE ${TABLE} IN SHARE ROW EXCLUSIVE MODE`);
          return await operation(client);
        } catch (error) {
          invalidRecord = error instanceof InvalidStoredRecord;
          // The bound transaction provider must roll back before this becomes INVALID.
          throw error;
        }
      }, write ? "READ_COMMITTED" : "REPEATABLE_READ_READ_ONLY");

      if (result.ok) return result.data;
      if (write && result.outcome === "UNKNOWN") {
        return failure("UNAVAILABLE", "WRITE_OUTCOME_UNKNOWN");
      }
      if (invalidRecord && result.outcome === "ROLLED_BACK") {
        return failure("INVALID", "INVALID_STORED_RECORD");
      }
      return failure("UNAVAILABLE", "STORAGE_OPERATION_FAILED");
    } catch {
      // An unexpected executor rejection provides no confirmed write outcome.
      return failure("UNAVAILABLE", write ? "WRITE_OUTCOME_UNKNOWN" : "STORAGE_OPERATION_FAILED");
    }
  }
  return Object.freeze({
    async write(input: RecordValue): Promise<WriteResult> {
      let record: RecordValue;
      try { record = copyRecord(input); } catch (error) {
        if (!(error instanceof SearchTemporalObservationRecordBoundaryError)) throw error;
        return failure("INVALID", "INVALID_INPUT_RECORD");
      }
      return transaction<WriteResult>(true, async (client) => {
        const observation = record.observation;
        const existing = await client.query(
          `SELECT ${COLUMNS} FROM ${TABLE} WHERE observation_key = $1`,
          [key(observation.observation_id)],
        );
        if (existing.rows.length > 1) return invalidStored();
        if (existing.rows.length === 1) {
          const stored = decode(existing.rows[0]);
          return isDeepStrictEqual(stored, record)
            ? Object.freeze({ status: "ALREADY_PRESENT", record: stored })
            : Object.freeze({ status: "CONFLICT", reason: "OBSERVATION_ID_CONFLICT", existing_record: stored });
        }
        const versions = await client.query(
          `SELECT ${COLUMNS} FROM ${TABLE} WHERE document_series_id = $1 AND document_key = $2`,
          [observation.document_series_id, key(observation.document_id)],
        );
        const storedVersions = versions.rows.map(decode).sort(compareRecords);
        for (const stored of storedVersions) {
          if (stored.observation.document_series_id !== observation.document_series_id ||
              stored.observation.document_id !== observation.document_id) return invalidStored();
          const oldHash = stored.observation.content_hash;
          const newHash = observation.content_hash;
          if (oldHash.availability_state === "AVAILABLE" && newHash.availability_state === "AVAILABLE" &&
              oldHash.value !== newHash.value) {
            return Object.freeze({ status: "CONFLICT", reason: "DOCUMENT_CONTENT_HASH_CONFLICT", existing_record: stored });
          }
        }
        const inserted = await client.query(
          `INSERT INTO ${TABLE} (${COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLUMNS}`,
          [key(observation.observation_id), observation.document_series_id, key(observation.document_id),
            Date.parse(observation.observed_at), FORMAT, encode(record)],
        );
        if (inserted.rows.length !== 1 || inserted.row_count !== 1) return invalidStored();
        const stored = decode(inserted.rows[0]);
        if (!isDeepStrictEqual(stored, record)) return invalidStored();
        return Object.freeze({ status: "STORED", record: stored });
      });
    },
    async read(input: ReadInput): Promise<ReadResult> {
      let request: ReadInput;
      try { request = readInput(input); } catch (error) {
        if (!(error instanceof SearchTemporalObservationRecordBoundaryError)) throw error;
        return failure("INVALID", "INVALID_READ_INPUT");
      }
      return transaction<ReadResult>(false, async (client) => {
        const currentRows = await client.query(
          `SELECT ${COLUMNS} FROM ${TABLE} WHERE observation_key = $1`,
          [key(request.current_observation_id)],
        );
        if (currentRows.rows.length === 0) {
          return Object.freeze({ status: "NOT_FOUND", reason: "CURRENT_OBSERVATION_NOT_FOUND" });
        }
        if (currentRows.rows.length !== 1) return invalidStored();
        const current = decode(currentRows.rows[0]);
        if (current.observation.document_series_id !== request.document_series_id ||
            current.observation.observation_id !== request.current_observation_id) {
          return failure("INVALID", "CURRENT_OBSERVATION_IDENTITY_MISMATCH");
        }
        const currentTime = Date.parse(current.observation.observed_at);
        const historyRows = await client.query(
          `SELECT ${COLUMNS} FROM ${TABLE} WHERE document_series_id = $1 AND observed_at_ms < $2`,
          [request.document_series_id, currentTime],
        );
        const history = historyRows.rows.map(decode).sort(compareRecords);
        const ids = new Set([current.observation.observation_id]);
        const hashes = new Map<string, string>();
        for (const record of [current, ...history]) {
          const observation = record.observation;
          if (observation.document_series_id !== request.document_series_id) return invalidStored();
          const hash = observation.content_hash;
          if (hash.availability_state === "AVAILABLE") {
            const previous = hashes.get(observation.document_id);
            if (previous !== undefined && previous !== hash.value) return invalidStored();
            hashes.set(observation.document_id, hash.value);
          }
        }
        for (const record of history) {
          if (ids.has(record.observation.observation_id) ||
              Date.parse(record.observation.observed_at) >= currentTime) return invalidStored();
          ids.add(record.observation.observation_id);
        }
        return Object.freeze({ status: "AVAILABLE", coverage: "ALL_RECORDED_BEFORE_CURRENT",
          current_record: current, historical_records: Object.freeze(history) });
      });
    },
  });
}
