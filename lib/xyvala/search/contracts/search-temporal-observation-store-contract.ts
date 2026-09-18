/* ============================================================================
 * FILE: lib/xyvala/search/contracts/search-temporal-observation-store-contract.ts
 * Search temporal observation persistence boundary, version 1.0.0.
 *
 * CONTRACT ONLY. No database, collector or runtime binding is activated here.
 * SearchTemporalSearchObservation remains owned by the temporal input contract.
 * This boundary owns persistence outcomes and recorded-history read semantics.
 * It creates no SearchPipelineLayer and exposes no public HTTP payload.
 *
 * WRITE RULES
 * - Consume an explicitly produced, validated observation and provenance.
 * - observation_id is the globally unique immutable record key.
 * - Atomically insert or compare the existing record, including provenance.
 * - Identical retry: ALREADY_PRESENT. Different truth: CONFLICT.
 * - Equality is structural, preserves array order and exact strings, and ignores
 *   object property order. Never use JSON serialization order as truth equality.
 * - Never overwrite an existing observation, even when its series differs.
 * - Validate runtime shapes and canonical evidence before persistence.
 * - Reject a version/hash contradiction within a series: two AVAILABLE hashes
 *   for the same document_id cannot differ, even under different observation IDs.
 * - Database constraints and transactions must preserve these rules concurrently.
 * - No timestamp, identity, evidence or analytical value is generated here.
 *
 * READ RULES
 * - Read the exact stored current observation and its strictly earlier history
 *   in one consistent database snapshot, within the requested series.
 * - Verify the current observation matches both requested identity fields.
 * - History contains every stored observation with observed_at < current time.
 * - Order history by parsed observed_at ascending, then observation_id using
 *   exact string code-unit order. Exclude current and equal-time observations.
 * - AVAILABLE + empty history means no earlier record in this store snapshot.
 *   It does NOT prove the document never existed or changed before collection.
 * - Recorded history does NOT establish continuous real-world observation.
 * - No silent limit, pagination truncation, retention gap or partial result may
 *   be presented as complete history. Known gaps return INSUFFICIENT_HISTORY.
 * - Missing current observation returns NOT_FOUND, never AVAILABLE(empty).
 * - Storage failure returns UNAVAILABLE, never NOT_FOUND or empty history.
 * - Malformed stored truth returns INVALID; no repair or removal during reading.
 * - Return detached, deeply immutable records; do not freeze caller-owned input.
 *
 * No SELECT/INSERT implementation, retries, cache, clock, logging, policy
 * selection, UPDATE, DELETE or TRUNCATE capability belongs to this file.
 * Provenance and failure reasons remain private diagnostic truth.
 * ========================================================================== */

import type { SearchModuleVersion } from "./search-pipeline-contract";
import type {
  SearchTemporalSearchObservation,
} from "../temporal/search-temporal-signals-search-core";

export const XYVALA_SEARCH_TEMPORAL_OBSERVATION_STORE_CONTRACT =
  Object.freeze({
    contract_name: "SearchTemporalObservationStore",
    contract_version: "1.0.0",
  } as const);

/** Supplied by the observation producer, never inferred by the repository. */
export interface SearchTemporalObservationProvenance {
  readonly producer_module: string;
  readonly producer_version: SearchModuleVersion;
  readonly source_reference: string;
}

/** Non-empty provenance fields are required at the runtime boundary. */
export interface SearchTemporalObservationRecord {
  readonly observation: SearchTemporalSearchObservation;
  readonly provenance: SearchTemporalObservationProvenance;
}

export type SearchTemporalObservationStoreFailure = Readonly<{
  status: "UNAVAILABLE" | "INVALID";
  reason: string;
}>;

export type SearchTemporalObservationWriteResult =
  | Readonly<{
      status: "STORED" | "ALREADY_PRESENT";
      record: SearchTemporalObservationRecord;
    }>
  | Readonly<{
      status: "CONFLICT";
      reason: "OBSERVATION_ID_CONFLICT" | "DOCUMENT_CONTENT_HASH_CONFLICT";
      existing_record: SearchTemporalObservationRecord;
    }>
  | SearchTemporalObservationStoreFailure;

export interface SearchTemporalObservationReadInput {
  readonly document_series_id:
    SearchTemporalSearchObservation["document_series_id"];
  readonly current_observation_id:
    SearchTemporalSearchObservation["observation_id"];
}

export type SearchTemporalObservationReadResult =
  | Readonly<{
      status: "AVAILABLE";
      coverage: "ALL_RECORDED_BEFORE_CURRENT";
      current_record: SearchTemporalObservationRecord;
      historical_records: readonly SearchTemporalObservationRecord[];
    }>
  | Readonly<{
      status: "NOT_FOUND";
      reason: "CURRENT_OBSERVATION_NOT_FOUND";
    }>
  | Readonly<{
      status: "INSUFFICIENT_HISTORY";
      reason: string;
    }>
  | SearchTemporalObservationStoreFailure;

/** Asynchronous capabilities are separated to permit read-only injection. */
export interface SearchTemporalObservationReader {
  readonly read: (
    input: SearchTemporalObservationReadInput,
  ) => Promise<SearchTemporalObservationReadResult>;
}

export interface SearchTemporalObservationWriter {
  readonly write: (
    record: SearchTemporalObservationRecord,
  ) => Promise<SearchTemporalObservationWriteResult>;
}

export type SearchTemporalObservationStore =
  SearchTemporalObservationReader & SearchTemporalObservationWriter;
