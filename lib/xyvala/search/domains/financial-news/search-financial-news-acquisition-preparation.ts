/* ============================================================================
 * FILE:
 * lib/xyvala/search/domains/financial-news/search-financial-news-acquisition-preparation.ts
 * ----------------------------------------------------------------------------
 * Xyvala Search Financial News - query-scoped acquisition preparation
 *
 * ROLE
 * - invoke one explicitly authorized acquisition source once per preparation;
 * - await acquisition observations BEFORE the analytical application run;
 * - retain the exact acquisition input, query and returned observation array;
 * - expose a prepared SearchFinancialNewsAcquisitionSourcePort;
 * - reject a different query or an analytical timestamp preceding preparation
 *   input / any retained observation timestamp;
 * - leave SearchRawDocument creation to the existing adapter / Acquisition core.
 *
 * FLOW
 * authorized source + explicit acquisition_input
 *     -> prepareSearchFinancialNewsAcquisition(...)
 *     -> caller observes the analytical timestamp AFTER awaiting preparation
 *     -> application composition binds result.authorized_acquisition_source
 *     -> application.run(...) with the SAME canonical query reference
 *     -> prepared source returns the exact observation array without new I/O
 *     -> existing Financial News adapter -> Acquisition core -> Extraction.
 *
 * TIME / PROVENANCE
 * - acquisition_input.created_at is supplied by the caller for preparation;
 * - runtime port input.created_at is supplied later for analytical execution;
 * - these are distinct roles; the earlier value is never overwritten;
 * - analytical created_at must be >= preparation input.created_at, fetched_at
 *   and acquisition created_at for EVERY observation;
 * - equality is allowed; historical observations are allowed;
 * - zoned ISO timestamps with millisecond-or-coarser precision are required for
 *   comparisons; unsupported representations are rejected, never normalized;
 * - no prepared_at timestamp is fabricated from document dates;
 * - no timestamp is selected with max(), read from a clock or repaired;
 * - source_published_at is NOT inspected, copied, replaced or classified;
 * - publication_reference_at is not an input to this boundary.
 *
 * OWNERSHIP / FAILURE
 * - one explicit prepare call = one upstream source invocation, no retry;
 * - upstream rejection propagates unchanged, never as [] / UNAVAILABLE;
 * - a successful empty array remains the exact empty array received;
 * - preparation validates transport shape, query binding and temporal scope;
 * - canonical acquisition/content/MIME/identity validation remains core-owned;
 * - no source selection, provider fallback, policy creation or calibration;
 * - no RawDocument, document_id, hash, score, trace, lineage or snapshot creation;
 * - no hidden validation_state promotion or analytical availability generation;
 * - preparation I/O is not claimed to be an analytical-run acquisition trace.
 *
 * REFERENCES / LIFECYCLE
 * - one preparation owns one query-bound in-memory closure, not a global cache;
 * - distinct preparations have independent bindings;
 * - repeated reads for the SAME canonical query are permitted for replay;
 * - this is not a one-use token and does not invent a run identity;
 * - no caller-owned array, observation, policy or query is cloned or frozen;
 * - only newly owned envelopes / private transport guards are frozen;
 * - private guards retain references / timestamps only, not rebuilt documents;
 * - upstream canonical objects MUST remain read-only while retained;
 * - guards detect query binding, array membership/order and timestamp changes,
 *   NOT every possible mutation of nested content or Uint8Array bytes;
 * - caller must not reuse this preparation for another query or install a
 *   per-request prepared source as a global multi-query singleton.
 *
 * CLASSIFICATION
 * - DOMAIN EXECUTION PREPARATION / QUERY-SCOPED TRANSPORT
 * - source invocation allowed ONLY in the explicit async preparation operation
 * - prepared reads: no I/O, clock, retry, mutation or analytical calculation
 * - deterministic prepared reads given unchanged canonical inputs
 * - no promise of determinism for the injected external source itself
 *
 * PROTOCOL
 * - Xyvala Search Protocol / VLR: Contract Before Runtime
 * - First Divergence Before Correction; one truth = one canonical owner
 * - unavailable != zero; upstream error != empty result
 * - Configuration != Preparation != Analytical Execution
 * ========================================================================== */

import type {
  SearchModuleVersion,
} from "../../contracts/search-pipeline-contract";

import type {
  SearchFinancialNewsAcquisitionSourcePort,
} from "./search-financial-news-acquisition-adapter";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_ACQUISITION_PREPARATION_MODULE_NAME =
  "xyvala-search-financial-news-acquisition-preparation" as const;

export const XYVALA_SEARCH_FINANCIAL_NEWS_ACQUISITION_PREPARATION_MODULE_VERSION:
  SearchModuleVersion = "1.0.0";

/* ============================================================================
 * 2. TYPES DERIVED FROM THE EXISTING SOURCE PORT
 * ========================================================================== */

export type SearchFinancialNewsAcquisitionPreparationRequest =
  Parameters<SearchFinancialNewsAcquisitionSourcePort>[0];

export type SearchFinancialNewsPreparedAcquisitionInputs =
  Awaited<ReturnType<SearchFinancialNewsAcquisitionSourcePort>>;

type AcquisitionObservation = SearchFinancialNewsPreparedAcquisitionInputs[number];
type AcquisitionQuery = SearchFinancialNewsAcquisitionPreparationRequest["query"];

export interface SearchFinancialNewsAcquisitionPreparationInput {
  readonly authorized_acquisition_source: SearchFinancialNewsAcquisitionSourcePort;
  readonly acquisition_input: SearchFinancialNewsAcquisitionPreparationRequest;
}

export interface SearchFinancialNewsAcquisitionPreparation {
  /** Exact original request. Its created_at is never overwritten. */
  readonly acquisition_input: SearchFinancialNewsAcquisitionPreparationRequest;

  /** Exact upstream array and observation references, including an empty array. */
  readonly acquisition_inputs: SearchFinancialNewsPreparedAcquisitionInputs;

  /** Bind this source through the existing Financial News application path. */
  readonly authorized_acquisition_source: SearchFinancialNewsAcquisitionSourcePort;
}

// A new runtime acquisition field requires review of prepared-source binding.
type RequestFieldsAreExact =
  [keyof SearchFinancialNewsAcquisitionPreparationRequest] extends
    ["query" | "created_at"]
    ? ["query" | "created_at"] extends
        [keyof SearchFinancialNewsAcquisitionPreparationRequest] ? true : false
    : false;

const REQUEST_FIELDS_ARE_EXACT: RequestFieldsAreExact = true;
void REQUEST_FIELDS_ARE_EXACT;

/* ============================================================================
 * 3. BOUNDARY ERRORS - NOT SearchValidationState / SearchOptionalEvidence
 * ========================================================================== */

export type SearchFinancialNewsAcquisitionPreparationErrorCode =
  | "INVALID_PREPARATION_INPUT"
  | "INVALID_ACQUISITION_INPUT"
  | "INVALID_SOURCE_RESULT"
  | "INVALID_TIMESTAMP"
  | "INVALID_OBSERVATION_CAUSALITY"
  | "PREPARATION_INPUT_CHANGED"
  | "PREPARED_BATCH_CHANGED"
  | "QUERY_SCOPE_MISMATCH"
  | "QUERY_REFERENCE_MISMATCH"
  | "ANALYTICAL_TIMESTAMP_BEFORE_PREPARATION"
  | "ANALYTICAL_TIMESTAMP_BEFORE_ACQUISITION";

export class SearchFinancialNewsAcquisitionPreparationError extends Error {
  readonly code: SearchFinancialNewsAcquisitionPreparationErrorCode;
  readonly field: string;
  readonly observation_index: number | null;

  constructor(
    code: SearchFinancialNewsAcquisitionPreparationErrorCode,
    field: string,
    observationIndex: number | null = null,
  ) {
    super(
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_ACQUISITION_PREPARATION_MODULE_NAME}] ` +
        `${code}; field=${field}; observation_index=${observationIndex ?? "none"}.`,
    );
    this.name = "SearchFinancialNewsAcquisitionPreparationError";
    this.code = code;
    this.field = field;
    this.observation_index = observationIndex;
  }
}

function fail(
  code: SearchFinancialNewsAcquisitionPreparationErrorCode,
  field: string,
  index: number | null = null,
): never {
  throw new SearchFinancialNewsAcquisitionPreparationError(code, field, index);
}

/* ============================================================================
 * 4. STRUCTURAL / TIMESTAMP CHECKS
 * ========================================================================== */

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Comparison only. No local clock, timestamp output or implicit timezone. */
function timestampValue(
  value: unknown,
  field: string,
  index: number | null = null,
): number {
  const syntax =
    /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

  if (typeof value !== "string" || !syntax.test(value)) {
    return fail("INVALID_TIMESTAMP", field, index);
  }

  // Reject calendar rollover rather than letting Date.parse repair it.
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const lastDay = month === 2 ? (leapYear ? 29 : 28) :
    ([4, 6, 9, 11].includes(month) ? 30 : 31);

  if (month < 1 || month > 12 || day < 1 || day > lastDay) {
    return fail("INVALID_TIMESTAMP", field, index);
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return fail("INVALID_TIMESTAMP", field, index);
  return parsed;
}

function validateAcquisitionRequest(
  input: SearchFinancialNewsAcquisitionPreparationRequest,
): void {
  if (!isRecord(input) || !isRecord(input.query) ||
      !isNonEmptyString(input.query.query_id) ||
      !isNonEmptyString(input.query.raw_query)) {
    fail("INVALID_ACQUISITION_INPUT", "acquisition_input");
  }
  // Semantic SearchQuery validity remains with its producer/application gate.
  timestampValue(input.created_at, "acquisition_input.created_at");
}

/* ============================================================================
 * 5. PRIVATE TRANSPORT GUARDS - NO ALTERNATIVE CANONICAL TRUTH
 * ========================================================================== */

interface RequestBinding {
  readonly input: SearchFinancialNewsAcquisitionPreparationRequest;
  readonly query: AcquisitionQuery;
  readonly query_id: AcquisitionQuery["query_id"];
  readonly raw_query: AcquisitionQuery["raw_query"];
  readonly created_at: SearchFinancialNewsAcquisitionPreparationRequest["created_at"];
  readonly created_at_value: number;
}

interface ObservationBinding {
  readonly observation: AcquisitionObservation;
  readonly fetched_at: AcquisitionObservation["fetched_at"];
  readonly created_at: AcquisitionObservation["created_at"];
  readonly fetched_at_value: number;
  readonly created_at_value: number;
}

function assertRequestUnchanged(binding: RequestBinding): void {
  if (binding.input.query !== binding.query ||
      binding.input.created_at !== binding.created_at ||
      binding.query.query_id !== binding.query_id ||
      binding.query.raw_query !== binding.raw_query) {
    fail("PREPARATION_INPUT_CHANGED", "acquisition_input");
  }
}

function bindObservationReferences(
  observations: SearchFinancialNewsPreparedAcquisitionInputs,
): readonly ObservationBinding[] {
  if (!isArray(observations)) {
    fail("INVALID_SOURCE_RESULT", "acquisition_inputs");
  }

  const bindings: ObservationBinding[] = [];

  for (let index = 0; index < observations.length; index += 1) {
    const observation = observations[index];

    if (!Object.prototype.hasOwnProperty.call(observations, index) ||
        !isRecord(observation)) {
      fail("INVALID_SOURCE_RESULT", "acquisition_inputs.item", index);
    }

    const fetchedAt = observation.fetched_at;
    const createdAt = observation.created_at;
    const fetchedAtValue = timestampValue(fetchedAt, "fetched_at", index);
    const createdAtValue = timestampValue(createdAt, "created_at", index);

    if (createdAtValue < fetchedAtValue) {
      fail("INVALID_OBSERVATION_CAUSALITY", "created_at", index);
    }

    bindings.push(Object.freeze({
      observation,
      fetched_at: fetchedAt,
      created_at: createdAt,
      fetched_at_value: fetchedAtValue,
      created_at_value: createdAtValue,
    }));
  }

  return Object.freeze(bindings);
}

function assertPreparedBatchUnchanged(
  observations: SearchFinancialNewsPreparedAcquisitionInputs,
  bindings: readonly ObservationBinding[],
): void {
  if (observations.length !== bindings.length) {
    fail("PREPARED_BATCH_CHANGED", "acquisition_inputs.length");
  }

  for (const [index, binding] of bindings.entries()) {
    if (!Object.prototype.hasOwnProperty.call(observations, index) ||
        observations[index] !== binding.observation ||
        binding.observation.fetched_at !== binding.fetched_at ||
        binding.observation.created_at !== binding.created_at) {
      fail("PREPARED_BATCH_CHANGED", "acquisition_inputs.item", index);
    }
  }
}

/* ============================================================================
 * 6. PREPARED SOURCE - NEVER RECEIVES THE LIVE SOURCE OR A CLOCK
 * ========================================================================== */

function bindPreparedAcquisitionSource(
  requestBinding: RequestBinding,
  observations: SearchFinancialNewsPreparedAcquisitionInputs,
  observationBindings: readonly ObservationBinding[],
): SearchFinancialNewsAcquisitionSourcePort {
  const preparedSource: SearchFinancialNewsAcquisitionSourcePort = (input) => {
    assertRequestUnchanged(requestBinding);
    validateAcquisitionRequest(input);

    if (input.query.query_id !== requestBinding.query_id) {
      fail("QUERY_SCOPE_MISMATCH", "query.query_id");
    }
    if (input.query !== requestBinding.query) {
      fail("QUERY_REFERENCE_MISMATCH", "query");
    }

    assertPreparedBatchUnchanged(observations, observationBindings);
    const analyticalTime = timestampValue(input.created_at, "analytical.created_at");

    if (analyticalTime < requestBinding.created_at_value) {
      fail("ANALYTICAL_TIMESTAMP_BEFORE_PREPARATION", "analytical.created_at");
    }

    // Check every observation, including late-acquired members of the page.
    for (const [index, binding] of observationBindings.entries()) {
      if (analyticalTime < binding.fetched_at_value ||
          analyticalTime < binding.created_at_value) {
        fail(
          "ANALYTICAL_TIMESTAMP_BEFORE_ACQUISITION",
          "analytical.created_at",
          index,
        );
      }
    }

    // No clone, filter, sort, reconstruction, fallback or additional source call.
    return observations;
  };

  return preparedSource;
}

/* ============================================================================
 * 7. EXPLICIT ASYNC PREPARATION
 * ========================================================================== */

export async function prepareSearchFinancialNewsAcquisition(
  input: SearchFinancialNewsAcquisitionPreparationInput,
): Promise<SearchFinancialNewsAcquisitionPreparation> {
  if (!isRecord(input) || typeof input.authorized_acquisition_source !== "function") {
    fail("INVALID_PREPARATION_INPUT", "authorized_acquisition_source");
  }

  const acquisitionInput = input.acquisition_input;
  const authorizedSource = input.authorized_acquisition_source;
  validateAcquisitionRequest(acquisitionInput);

  const requestBinding: RequestBinding = Object.freeze({
    input: acquisitionInput,
    query: acquisitionInput.query,
    query_id: acquisitionInput.query.query_id,
    raw_query: acquisitionInput.query.raw_query,
    created_at: acquisitionInput.created_at,
    created_at_value: timestampValue(acquisitionInput.created_at, "preparation.created_at"),
  });

  // Exactly one invocation. No catch: preserve the original upstream rejection.
  const observations = await authorizedSource(acquisitionInput);

  assertRequestUnchanged(requestBinding);
  const observationBindings = bindObservationReferences(observations);
  assertPreparedBatchUnchanged(observations, observationBindings);

  const preparedSource = bindPreparedAcquisitionSource(
    requestBinding,
    observations,
    observationBindings,
  );

  return Object.freeze({
    acquisition_input: acquisitionInput,
    acquisition_inputs: observations,
    authorized_acquisition_source: preparedSource,
  } satisfies SearchFinancialNewsAcquisitionPreparation);
}

/* ============================================================================
 * 8. STATIC OWNERSHIP / GOVERNANCE - NOT AN EXECUTION VALIDATION REPORT
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_ACQUISITION_PREPARATION_OWNERSHIP =
  Object.freeze({
    module: XYVALA_SEARCH_FINANCIAL_NEWS_ACQUISITION_PREPARATION_MODULE_NAME,
    module_version: XYVALA_SEARCH_FINANCIAL_NEWS_ACQUISITION_PREPARATION_MODULE_VERSION,
    domain: "FINANCIAL_NEWS",
    architectural_role: "QUERY_SCOPED_ACQUISITION_PREPARATION",
    lifecycle_scope: "ONE_EXPLICIT_PREPARATION_FOR_ONE_CANONICAL_QUERY",
    acquisition_observation_owner: "AUTHORIZED_ACQUISITION_SOURCE",
    raw_document_owner: "SEARCH_ACQUISITION_CORE",
    analytical_timestamp_owner: "EXTERNAL_APPLICATION_ORCHESTRATION",
    prepared_source_owner: "FINANCIAL_NEWS_ACQUISITION_PREPARATION",
    canonical_output_port: "SearchFinancialNewsAcquisitionSourcePort",
    upstream_invocations_per_preparation: 1,
    upstream_invocations_per_prepared_read: 0,
    acquisition_input_reference_preserved: true,
    observation_array_reference_preserved: true,
    observation_references_preserved: true,
    caller_owned_objects_frozen_here: false,
  } as const);

export const XYVALA_SEARCH_FINANCIAL_NEWS_ACQUISITION_PREPARATION_GOVERNANCE =
  Object.freeze({
    contract_before_runtime: true,
    first_divergence_required: true,
    prepared_query_reference_required: true,
    per_observation_temporal_gate_required: true,
    upstream_error_identity_preserved: true,
    empty_result_reference_preserved: true,
    replay_for_same_canonical_query_allowed: true,
    cross_query_reuse_allowed: false,
    source_selection_allowed: false,
    fallback_source_allowed: false,
    automatic_retry_allowed: false,
    raw_document_creation_allowed: false,
    observation_reconstruction_allowed: false,
    observation_mutation_allowed: false,
    source_publication_replacement_allowed: false,
    timestamp_generation_allowed: false,
    timestamp_repair_allowed: false,
    runtime_clock_access_allowed: false,
    analytical_calculation_allowed: false,
    policy_selection_allowed: false,
    calibration_allowed: false,
    execution_trace_creation_allowed: false,
    variable_lineage_creation_allowed: false,
    application_run_invocation_allowed: false,
    prepared_source_io_allowed: false,
    module_level_mutable_state_allowed: false,
    persistence_allowed: false,
    logging_allowed: false,
  } as const);
