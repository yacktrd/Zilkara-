/* ============================================================================
 * FILE: lib/xyvala/search/temporal/search-temporal-signals-search.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search temporal-signal execution boundary
 *
 * ROLE
 * - provide the unique execution boundary for Search Temporal Signal Detection
 * - receive already-authorized current and historical Search observations
 * - receive explicit canonical source publication evidence
 * - receive explicit analytical publication reference timestamp
 * - receive one explicitly resolved temporal producer policy
 * - enforce execution-boundary identity and propagation invariants
 * - assemble the canonical SearchTemporalSignalsSearchInput
 * - invoke the canonical temporal producer exactly once
 * - return canonical SearchTemporalSignals without reconstruction or mutation
 *
 * CLASSIFICATION
 * - PRIVATE ORCHESTRATION
 * - SEARCH DOMAIN
 * - EXECUTION BOUNDARY
 * - DETERMINISTIC
 * - NON-PERSISTENT
 * - NON-CANONICAL-PRODUCER
 * - NON-SCORING
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 * - Compute / Observe / Mutate Separation
 *
 * ORCHESTRATES
 * - Search Temporal Signal Detection
 *
 * CANONICAL PRODUCER
 * - lib/xyvala/search/temporal/search-temporal-signals-search-core.ts
 *
 * PRODUCER ENTRYPOINT
 * - buildSearchTemporalSignals()
 *
 * PRODUCES
 * - no independent analytical truth
 *
 * RETURNS
 * - canonical SearchTemporalSignals produced exclusively by
 *   buildSearchTemporalSignals()
 *
 * PIPELINE OWNERSHIP
 * - TEMPORAL_SIGNAL_DETECTION
 *
 * AUTHORIZED UPSTREAM INPUT
 * - document identity already established upstream
 * - deterministic execution timestamp supplied by authorized caller
 * - explicit source publication evidence
 * - explicit analytical publication reference timestamp
 * - one explicit current Search temporal observation
 * - zero or more explicit historical Search temporal observations
 * - one explicitly resolved temporal producer policy
 *
 * AUTHORIZED DOWNSTREAM CONSUMERS
 * - Temporal Document Scoring
 * - Penalty Evaluation
 * - Private Snapshot
 * - authorized Search orchestration layers
 *
 * PUBLICATION-TIME GOVERNANCE
 * ----------------------------------------------------------------------------
 * published_at is source temporal truth.
 *
 * publication_reference_at is analytical reference-time input.
 *
 * They are distinct realities.
 *
 * This boundary does NOT:
 * - derive published_at from observed_at;
 * - derive published_at from created_at;
 * - derive published_at from fetched_at;
 * - replace unavailable publication evidence with another timestamp;
 * - derive publication_reference_at from created_at;
 * - derive publication_reference_at from observed_at;
 * - derive publication_reference_at from published_at;
 * - derive publication_reference_at from fetched_at;
 * - calculate publication age.
 *
 * It only validates their transport shape and sends the exact supplied values
 * to the canonical temporal producer.
 *
 * TEMPORAL POLICY GOVERNANCE
 * ----------------------------------------------------------------------------
 * Temporal producer policy is mandatory at this execution boundary.
 *
 * This boundary does NOT:
 * - choose a default policy;
 * - infer a policy;
 * - mutate a policy;
 * - merge policies;
 * - repair a missing policy.
 *
 * Policy resolution belongs to authorized runtime/composition configuration
 * upstream of this boundary.
 *
 * DIRECTIVES
 * - one execution boundary for SearchTemporalSignals production
 * - call the canonical temporal producer exactly once per execution
 * - never reproduce producer calculations locally
 * - never create SearchTemporalSignals manually
 * - never alter producer output
 * - never create historical observations
 * - never infer missing historical observations
 * - never fetch persistence
 * - never persist
 * - never generate observation identifiers
 * - never generate implicit timestamps
 * - never reconstruct source publication time
 * - never reconstruct analytical publication reference time
 * - never select an implicit temporal producer policy
 * - never create downstream query-relative temporal truth
 * - never score
 * - never rank
 * - never decide
 * - never calibrate
 * - never expose private analytical truth publicly
 *
 * INPUTS
 * - SearchTemporalSignalsSearchExecutionInput
 *
 * OUTPUTS
 * - SearchTemporalSignals
 *
 * INVARIANTS
 * - execution document_id must equal current observation document_id
 * - every observation must belong to the explicit execution document_series_id
 * - historical observations retain their original document-version IDs
 * - current observation must be unique
 * - historical observations must not contain current observation identity
 * - historical observations must precede current observation
 * - execution created_at is supplied explicitly
 * - execution timestamp is not generated internally
 * - published_at is supplied explicitly as availability-qualified evidence
 * - published_at is transported without semantic alteration
 * - unavailable published_at never becomes another timestamp
 * - publication_reference_at is supplied explicitly
 * - publication_reference_at is never synthesized by this boundary
 * - publication_reference_at is transported without semantic alteration
 * - producer policy is supplied explicitly
 * - producer policy is passed without semantic alteration
 * - canonical producer is invoked exactly once
 * - output is returned without mutation
 * - output document_id must equal execution document_id
 * - output created_at must equal execution created_at
 * - output published_at must preserve execution publication evidence
 * - rejected canonical output remains rejected
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * missing published_at at execution boundary
 * => source temporal propagation boundary
 *
 * missing publication_reference_at at execution boundary
 * => analytical temporal-reference propagation boundary
 *
 * published_at reconstructed from created_at / observed_at / fetched_at
 * => temporal provenance violation
 *
 * publication_reference_at reconstructed from another timestamp
 * => analytical temporal-reference provenance violation
 *
 * missing producer policy repaired with a default
 * => policy ownership violation
 *
 * producer policy altered locally
 * => execution-boundary ownership violation
 *
 * temporal calculation reproduced locally
 * => canonical producer ownership violation
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/search/contracts/search-pipeline-contract
 * - lib/xyvala/search/temporal/search-temporal-signals-search-core
 *
 * SENSITIVE AREAS
 * - producer uniqueness
 * - historical observation provenance
 * - document identity propagation
 * - publication timestamp propagation
 * - analytical reference timestamp propagation
 * - execution timestamp propagation
 * - producer policy propagation
 * - accidental local reconstruction
 * - duplicate producer invocation
 * ========================================================================== */

import {
  assertSearchTemporalDocumentSeriesId,
  type SearchTemporalDocumentSeriesId,
} from "./search-temporal-document-series-identity";

import type {
  SearchDocumentId,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchOptionalEvidence,
  SearchTemporalSignals,
} from "../contracts/search-pipeline-contract";

import {
  buildSearchTemporalSignals,
  type SearchTemporalSearchObservation,
  type SearchTemporalSignalsSearchPolicy,
} from "./search-temporal-signals-search-core";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ----------------------------------------------------------------------------
 * v2 introduces explicit publication_reference_at propagation.
 *
 * This is a breaking execution-boundary evolution because callers must now
 * provide the analytical reference timestamp explicitly.
 * ========================================================================== */

export const XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_MODULE_NAME =
  "xyvala-search-temporal-signals-search" as const;

export const XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_MODULE_VERSION:
  SearchModuleVersion =
    "3.0.0";

/* ============================================================================
 * 2. EXECUTION INPUT
 * ----------------------------------------------------------------------------
 * This contract belongs to the execution boundary.
 *
 * It does not create new analytical identities or temporal truth.
 *
 * It transports already-authorized evidence, explicit temporal reference
 * context and one explicitly resolved producer policy to the canonical
 * producer.
 * ========================================================================== */

export interface SearchTemporalSignalsSearchExecutionInput {
  readonly document_series_id:
    SearchTemporalDocumentSeriesId;

  readonly document_id:
    SearchDocumentId;

  /**
   * Explicit deterministic execution timestamp.
   *
   * This value must be supplied by the authorized caller.
   *
   * It identifies execution time only.
   *
   * It must not silently replace publication_reference_at.
   *
   * Forbidden here:
   * - Date.now()
   * - new Date()
   * - performance.now()
   * - any implicit runtime clock
   */
  readonly created_at:
    SearchIsoTimestamp;

  /**
   * Explicit source publication evidence.
   *
   * This value belongs to source temporal provenance.
   *
   * It must not be reconstructed from:
   * - current_observation.observed_at;
   * - created_at;
   * - fetched_at;
   * - publication_reference_at;
   * - snapshot time;
   * - public transformation time.
   */
  readonly published_at:
    SearchOptionalEvidence<SearchIsoTimestamp>;

  /**
   * Explicit analytical reference timestamp used by the canonical temporal
   * producer for publication-age analysis.
   *
   * This boundary does not decide what timestamp should be used.
   *
   * Its legitimate upstream owner must resolve and supply it explicitly.
   *
   * It must never be silently substituted with:
   * - created_at;
   * - published_at;
   * - current_observation.observed_at;
   * - fetched_at;
   * - snapshot time;
   * - publication time.
   */
  readonly publication_reference_at:
    SearchIsoTimestamp;

  /**
   * Current canonical temporal observation projection.
   *
   * This boundary does not construct its analytical contents.
   */
  readonly current_observation:
    SearchTemporalSearchObservation;

  /**
   * Explicit historical observation projections.
   *
   * They must already have been acquired by an authorized upstream boundary.
   *
   * This execution boundary:
   * - does not fetch them;
   * - does not persist them;
   * - does not reconstruct them;
   * - does not fabricate missing observations.
   */
  readonly historical_observations:
    readonly SearchTemporalSearchObservation[];

  /**
   * Explicitly resolved canonical temporal producer policy.
   *
   * Mandatory by design.
   *
   * This execution boundary must never select a default policy.
   */
  readonly policy:
    SearchTemporalSignalsSearchPolicy;
}

/* ============================================================================
 * 3. EXECUTION RESULT
 * ----------------------------------------------------------------------------
 * Optional enriched orchestration result.
 *
 * This does NOT create analytical truth.
 *
 * temporal_signals remains exclusively produced by the canonical core.
 *
 * publication_reference_at is deliberately not copied into this result:
 * - it remains an input/reference context;
 * - the canonical analytical output remains SearchTemporalSignals;
 * - this wrapper must not become a competing temporal contract.
 * ========================================================================== */

export interface SearchTemporalSignalsSearchExecutionResult {
  readonly document_id:
    SearchDocumentId;

  readonly created_at:
    SearchIsoTimestamp;

  readonly temporal_signals:
    SearchTemporalSignals;

  readonly orchestrator_module_name:
    typeof XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_MODULE_NAME;

  readonly orchestrator_module_version:
    SearchModuleVersion;
}

/* ============================================================================
 * 4. BASIC BOUNDARY ASSERTIONS
 * ========================================================================== */

function assertNonEmptyString(
  value:
    string,
  fieldName:
    string,
): void {
  if (
    typeof value !==
      "string" ||
    value.trim().length ===
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} must be a non-empty string.`,
    );
  }
}

function assertValidIsoTimestamp(
  value:
    SearchIsoTimestamp,
  fieldName:
    string,
): void {
  assertNonEmptyString(
    value,
    fieldName,
  );

  if (
    !Number.isFinite(
      Date.parse(
        value,
      ),
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} must be a valid ISO timestamp.`,
    );
  }
}

/* ============================================================================
 * 5. OPTIONAL TIMESTAMP EVIDENCE ASSERTION
 * ----------------------------------------------------------------------------
 * Availability is validated only.
 *
 * No unavailable state is converted into a timestamp.
 * ========================================================================== */

function assertOptionalIsoTimestampEvidence(
  evidence:
    SearchOptionalEvidence<SearchIsoTimestamp>,
  fieldName:
    string,
): void {
  if (
    evidence.availability_state ===
      "AVAILABLE"
  ) {
    assertValidIsoTimestamp(
      evidence.value,
      `${fieldName}.value`,
    );

    return;
  }

  assertNonEmptyString(
    evidence.reason,
    `${fieldName}.reason`,
  );
}

/* ============================================================================
 * 6. POLICY BOUNDARY ASSERTION
 * ----------------------------------------------------------------------------
 * The canonical producer remains responsible for detailed policy validation.
 *
 * The execution boundary verifies only that policy identity is explicitly
 * supplied.
 * ========================================================================== */

function assertProducerPolicyProvided(
  policy:
    SearchTemporalSignalsSearchPolicy,
): void {
  assertNonEmptyString(
    policy.policy_version,
    "policy.policy_version",
  );
}

/* ============================================================================
 * 7. OBSERVATION IDENTITY ASSERTIONS
 * ========================================================================== */

function assertObservationBelongsToDocument(
  observation:
    SearchTemporalSearchObservation,
  expectedDocumentId:
    SearchDocumentId,
  fieldName:
    string,
): void {
  assertNonEmptyString(
    observation.document_id,
    `${fieldName}.document_id`,
  );

  if (
    observation.document_id !==
    expectedDocumentId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName}.document_id does not match execution document_id.`,
    );
  }
}

function assertCurrentObservationIdentity(
  input:
    SearchTemporalSignalsSearchExecutionInput,
): void {
  assertNonEmptyString(
    input
      .current_observation
      .observation_id,
    "current_observation.observation_id",
  );

  assertObservationBelongsToDocument(
    input.current_observation,
    input.document_id,
    "current_observation",
  );

  assertObservationBelongsToSeries(
    input.current_observation,
    input.document_series_id,
    "current_observation",
  );

  assertValidIsoTimestamp(
    input
      .current_observation
      .observed_at,
    "current_observation.observed_at",
  );
}

function assertObservationBelongsToSeries(
  observation: SearchTemporalSearchObservation,
  expectedSeriesId: SearchTemporalDocumentSeriesId,
  fieldName: string,
): void {
  assertNonEmptyString(observation.document_id, `${fieldName}.document_id`);
  if (observation.document_series_id !== expectedSeriesId) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName}.document_series_id does not match execution document_series_id.`,
    );
  }
}

/* ============================================================================
 * 8. HISTORICAL OBSERVATION ASSERTIONS
 * ----------------------------------------------------------------------------
 * These checks intentionally duplicate only execution-boundary invariants.
 *
 * They do NOT duplicate temporal calculations owned by the canonical core.
 * ========================================================================== */

function assertHistoricalObservationBoundary(
  input:
    SearchTemporalSignalsSearchExecutionInput,
): void {
  const currentObservationId =
    input
      .current_observation
      .observation_id;

  const currentObservedAtEpoch =
    Date.parse(
      input
        .current_observation
        .observed_at,
    );

  const historicalObservationIds =
    new Set<string>();

  for (
    let index =
      0;
    index <
    input
      .historical_observations
      .length;
    index +=
      1
  ) {
    const observation =
      input
        .historical_observations[
        index
      ];

    if (
      observation ===
      undefined
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_MODULE_NAME}] ` +
          `Boundary violation: historical_observations[${String(index)}] is undefined.`,
      );
    }

    assertNonEmptyString(
      observation
        .observation_id,
      `historical_observations[${String(index)}].observation_id`,
    );

    assertObservationBelongsToSeries(
      observation,
      input.document_series_id,
      `historical_observations[${String(index)}]`,
    );

    assertValidIsoTimestamp(
      observation
        .observed_at,
      `historical_observations[${String(index)}].observed_at`,
    );

    if (
      observation
        .observation_id ===
      currentObservationId
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_MODULE_NAME}] ` +
          "Boundary violation: current observation must not also appear in historical_observations.",
      );
    }

    if (
      historicalObservationIds.has(
        observation
          .observation_id,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_MODULE_NAME}] ` +
          `Boundary violation: duplicate historical observation_id ${observation.observation_id}.`,
      );
    }

    historicalObservationIds.add(
      observation
        .observation_id,
    );

    const historicalObservedAtEpoch =
      Date.parse(
        observation
          .observed_at,
      );

    if (
      historicalObservedAtEpoch >=
      currentObservedAtEpoch
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_MODULE_NAME}] ` +
          `Boundary violation: historical observation ${observation.observation_id} ` +
          "must precede current_observation.",
      );
    }
  }
}

/* ============================================================================
 * 9. EXECUTION INPUT VALIDATION
 * ========================================================================== */

export function validateSearchTemporalSignalsSearchExecutionInput(
  input:
    SearchTemporalSignalsSearchExecutionInput,
): void {
  assertSearchTemporalDocumentSeriesId(input.document_series_id);

  assertNonEmptyString(
    input.document_id,
    "document_id",
  );

  assertValidIsoTimestamp(
    input.created_at,
    "created_at",
  );

  assertOptionalIsoTimestampEvidence(
    input.published_at,
    "published_at",
  );

  /*
   * Transport-shape validation only.
   *
   * Chronological interpretation involving publication_reference_at belongs
   * to the canonical temporal producer.
   */
  assertValidIsoTimestamp(
    input.publication_reference_at,
    "publication_reference_at",
  );

  assertProducerPolicyProvided(
    input.policy,
  );

  assertCurrentObservationIdentity(
    input,
  );

  assertHistoricalObservationBoundary(
    input,
  );
}

/* ============================================================================
 * 10. PRODUCER INPUT ASSEMBLY
 * ----------------------------------------------------------------------------
 * This function creates transport only.
 *
 * It does not:
 * - normalize observations;
 * - reconstruct publication time;
 * - reconstruct analytical reference time;
 * - calculate publication age;
 * - resolve a producer policy;
 * - normalize a producer policy;
 * - compute temporal state;
 * - calculate persistence;
 * - calculate trends;
 * - detect ruptures;
 * - calculate confidence.
 *
 * Those responsibilities belong to their legitimate owners.
 * ========================================================================== */

function buildCanonicalProducerInput(
  input:
    SearchTemporalSignalsSearchExecutionInput,
): Parameters<
  typeof buildSearchTemporalSignals
>[0] {
  return Object.freeze({
    document_series_id:
      input.document_series_id,

    document_id:
      input.document_id,

    created_at:
      input.created_at,

    published_at:
      input.published_at,

    publication_reference_at:
      input.publication_reference_at,

    current_observation:
      input.current_observation,

    historical_observations:
      input.historical_observations,

    policy:
      input.policy,
  });
}

/* ============================================================================
 * 11. PUBLICATION EVIDENCE PROPAGATION ASSERTION
 * ----------------------------------------------------------------------------
 * The producer may freeze or structurally copy evidence.
 *
 * Therefore propagation is checked semantically rather than through object
 * reference identity.
 *
 * publication_reference_at is not part of SearchTemporalSignals output.
 * This boundary must therefore not reconstruct publication_age_ms merely to
 * assert it. That calculation belongs exclusively to the canonical producer.
 * ========================================================================== */

function assertPublishedAtPropagation(
  expected:
    SearchOptionalEvidence<SearchIsoTimestamp>,
  actual:
    SearchOptionalEvidence<SearchIsoTimestamp>,
): void {
  if (
    actual.availability_state !==
    expected.availability_state
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_MODULE_NAME}] ` +
        "Propagation violation: canonical SearchTemporalSignals.published_at " +
        "changed publication availability state.",
    );
  }

  if (
    expected.availability_state ===
      "AVAILABLE" &&
    actual.availability_state ===
      "AVAILABLE"
  ) {
    if (
      actual.value !==
      expected.value
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_MODULE_NAME}] ` +
          "Propagation violation: canonical SearchTemporalSignals.published_at " +
          "changed source publication timestamp.",
      );
    }

    return;
  }

  if (
    expected.availability_state !==
      "AVAILABLE" &&
    actual.availability_state !==
      "AVAILABLE" &&
    actual.reason !==
      expected.reason
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_MODULE_NAME}] ` +
        "Propagation violation: canonical SearchTemporalSignals.published_at " +
        "changed publication unavailability reason.",
    );
  }
}

/* ============================================================================
 * 12. CANONICAL OUTPUT PROPAGATION ASSERTIONS
 * ----------------------------------------------------------------------------
 * The execution boundary validates propagation only.
 *
 * It never validates or reconstructs temporal calculations.
 * ========================================================================== */

function assertCanonicalOutputPropagation(
  input:
    SearchTemporalSignalsSearchExecutionInput,
  output:
    SearchTemporalSignals,
): void {
  if (
    output.document_id !==
    input.document_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_MODULE_NAME}] ` +
        "Propagation violation: canonical SearchTemporalSignals.document_id " +
        "differs from execution document_id.",
    );
  }

  if (
    output.created_at !==
    input.created_at
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_MODULE_NAME}] ` +
        "Propagation violation: canonical SearchTemporalSignals.created_at " +
        "differs from execution created_at.",
    );
  }

  assertPublishedAtPropagation(
    input.published_at,
    output.published_at,
  );
}

/* ============================================================================
 * 13. UNIQUE EXECUTION BOUNDARY
 * ----------------------------------------------------------------------------
 * This is the official execution boundary of TEMPORAL_SIGNAL_DETECTION.
 *
 * Execution sequence:
 *
 * 1. validate orchestration boundary;
 * 2. assemble producer transport;
 * 3. invoke buildSearchTemporalSignals() exactly once;
 * 4. validate identity and source-time propagation;
 * 5. return canonical producer truth unchanged.
 *
 * IMPORTANT
 *
 * This function must never become a second temporal producer.
 * ========================================================================== */

export function runSearchTemporalSignalsSearch(
  input:
    SearchTemporalSignalsSearchExecutionInput,
): SearchTemporalSignals {
  validateSearchTemporalSignalsSearchExecutionInput(
    input,
  );

  const producerInput =
    buildCanonicalProducerInput(
      input,
    );

  /**
   * SINGLE CANONICAL PRODUCER INVOCATION.
   *
   * No other SearchTemporalSignals construction is authorized in this file.
   */
  const temporalSignals =
    buildSearchTemporalSignals(
      producerInput,
    );

  assertCanonicalOutputPropagation(
    input,
    temporalSignals,
  );

  return temporalSignals;
}

/* ============================================================================
 * 14. ENRICHED EXECUTION RESULT
 * ----------------------------------------------------------------------------
 * Optional orchestration metadata wrapper.
 *
 * temporal_signals remains untouched canonical producer truth.
 *
 * This helper must not become the pipeline's analytical contract.
 * ========================================================================== */

export function executeSearchTemporalSignalsSearch(
  input:
    SearchTemporalSignalsSearchExecutionInput,
): SearchTemporalSignalsSearchExecutionResult {
  const temporalSignals =
    runSearchTemporalSignalsSearch(
      input,
    );

  return Object.freeze({
    document_id:
      input.document_id,

    created_at:
      input.created_at,

    temporal_signals:
      temporalSignals,

    orchestrator_module_name:
      XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_MODULE_NAME,

    orchestrator_module_version:
      XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_MODULE_VERSION,
  });
}

/* ============================================================================
 * 15. ACCEPTANCE PROJECTION
 * ----------------------------------------------------------------------------
 * Read-only convenience projection.
 *
 * It creates no new analytical truth.
 * ========================================================================== */

export function isSearchTemporalSignalsSearchExecutionAccepted(
  result:
    SearchTemporalSignals,
): boolean {
  return (
    result.validation_state ===
      "VALID" ||
    result.validation_state ===
      "DEGRADED"
  );
}
