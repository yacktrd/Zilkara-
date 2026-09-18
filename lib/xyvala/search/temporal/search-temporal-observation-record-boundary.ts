/* ============================================================================
 * FILE: lib/xyvala/search/temporal/search-temporal-observation-record-boundary.ts
 * Persistence input validation and immutable transport. No observation creation.
 *
 * Input is unknown at the storage boundary. Validate every canonical field,
 * preserve supplied values and return a detached, deeply frozen structural copy.
 * Unknown keys, accessors, sparse arrays and non-data objects are rejected.
 * No default evidence, score calculation, status promotion or identity inference.
 * Existing observation validation_state is transported, never requalified here.
 *
 * Timestamp acceptance follows the existing temporal core's Date.parse rule.
 * This does not introduce a stricter ISO grammar or normalize timestamps.
 * Cross-record identity/hash conflicts and chronological reads belong to the
 * repository transaction. Source provenance authenticity belongs upstream.
 * This module performs no storage, collection, clock access or HTTP exposure.
 * ========================================================================== */

import type {
  SearchOptionalEvidence,
  SearchUnavailableValue,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";
import type {
  SearchTemporalObservationProvenance,
  SearchTemporalObservationRecord,
} from "../contracts/search-temporal-observation-store-contract";
import type { SearchTemporalSearchObservation } from "./search-temporal-signals-search-core";
import { assertSearchTemporalDocumentSeriesId } from "./search-temporal-document-series-identity";

export const XYVALA_SEARCH_TEMPORAL_OBSERVATION_RECORD_BOUNDARY_MODULE_VERSION =
  "1.0.0" as const;

export class SearchTemporalObservationRecordBoundaryError extends Error {
  readonly code = "INVALID_TEMPORAL_OBSERVATION_RECORD" as const;

  constructor(readonly field: string) {
    super(`[search-temporal-observation-record-boundary] Invalid field: ${field}`);
    this.name = "SearchTemporalObservationRecordBoundaryError";
  }
}

type Reader<T> = (value: unknown, field: string) => T;
type Schema<T> = { readonly [K in keyof T]-?: Reader<T[K]> };

function fail(field: string): never {
  throw new SearchTemporalObservationRecordBoundaryError(field);
}

function dataObject(value: unknown, field: string): object {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return fail(field);
  }

  const prototype: unknown = Object.getPrototypeOf(value);

  if (prototype !== Object.prototype && prototype !== null) return fail(field);

  return value;
}

function ownData(value: object, key: string, field: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);

  if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
    return fail(field);
  }

  return descriptor.value;
}

function readObject<T>(value: unknown, field: string, schema: Schema<T>): T {
  const source = dataObject(value, field);
  const keys = Object.keys(schema) as (keyof T & string)[];

  if (Reflect.ownKeys(source).length !== keys.length) return fail(field);

  const result: Partial<T> = {};

  for (const key of keys) {
    const path = `${field}.${key}`;
    result[key] = schema[key](ownData(source, key, path), path);
  }

  // Every required key was checked with its canonical field reader above.
  return Object.freeze(result) as T;
}

const nonEmptyString: Reader<string> = (value, field) => {
  if (typeof value !== "string" || value.trim().length === 0) return fail(field);
  return value;
};

const normalizedNumber: Reader<number> = (value, field) => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    return fail(field);
  }

  return value;
};

const unavailableStates = Object.freeze({
  UNAVAILABLE: true,
  INSUFFICIENT_DATA: true,
  INSUFFICIENT_HISTORY: true,
  UNSUPPORTED: true,
  INVALID: true,
} satisfies Record<SearchUnavailableValue["availability_state"], true>);

const validationStates = Object.freeze({
  VALID: true,
  DEGRADED: true,
  REJECTED: true,
  UNVALIDATED: true,
} satisfies Record<SearchValidationState, true>);

function member<K extends string>(table: Record<K, true>): Reader<K> {
  return (value, field) => {
    if (
      typeof value !== "string" ||
      !Object.prototype.hasOwnProperty.call(table, value)
    ) {
      return fail(field);
    }

    return value as K;
  };
}

function evidence<T>(readValue: Reader<T>): Reader<SearchOptionalEvidence<T>> {
  return (value, field) => {
    const source = dataObject(value, field);
    const state = ownData(
      source,
      "availability_state",
      `${field}.availability_state`,
    );

    if (state === "AVAILABLE") {
      return readObject(value, field, {
        availability_state: (candidate, path) =>
          candidate === "AVAILABLE" ? candidate : fail(path),
        value: readValue,
      } satisfies Schema<{
        readonly availability_state: "AVAILABLE";
        readonly value: T;
      }>);
    }

    return readObject<SearchUnavailableValue>(value, field, {
      availability_state: member(unavailableStates),
      reason: nonEmptyString,
    });
  };
}

const reasons: Reader<readonly string[]> = (value, field) => {
  if (!Array.isArray(value)) return fail(field);
  if (Reflect.ownKeys(value).length !== value.length + 1) return fail(field);

  const result: string[] = [];

  for (let i = 0; i < value.length; i += 1) {
    result.push(
      nonEmptyString(
        ownData(value, String(i), `${field}[${i}]`),
        `${field}[${i}]`,
      ),
    );
  }

  return Object.freeze(result);
};

const observationSchema: Schema<SearchTemporalSearchObservation> = {
  document_series_id: (value, field) => {
    const id = nonEmptyString(value, field);

    try {
      assertSearchTemporalDocumentSeriesId(id);
    } catch {
      return fail(field);
    }

    return id;
  },

  observation_id: nonEmptyString,

  document_id: nonEmptyString,

  observed_at: (value, field) => {
    const timestamp = nonEmptyString(value, field);

    if (!Number.isFinite(Date.parse(timestamp))) return fail(field);

    return timestamp;
  },

  content_hash: evidence(nonEmptyString),

  frequency_structure_value: evidence(normalizedNumber),

  anchor_structure_value: evidence(normalizedNumber),

  convergence_value: evidence(normalizedNumber),

  link_profile_value: evidence(normalizedNumber),

  validation_state: member(validationStates),

  degradation_reasons: reasons,
};

const provenanceSchema: Schema<SearchTemporalObservationProvenance> = {
  producer_module: nonEmptyString,
  producer_version: nonEmptyString,
  source_reference: nonEmptyString,
};

export function validateAndCopySearchTemporalObservationRecord(
  input: unknown,
): SearchTemporalObservationRecord {
  return readObject<SearchTemporalObservationRecord>(input, "record", {
    observation: (value, field) => {
      const observation = readObject(value, field, observationSchema);

      if (
        observation.validation_state === "VALID" &&
        observation.degradation_reasons.length > 0
      ) {
        return fail(`${field}.degradation_reasons`);
      }

      return observation;
    },

    provenance: (value, field) =>
      readObject(value, field, provenanceSchema),
  });
}
