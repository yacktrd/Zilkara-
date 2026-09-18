/* ============================================================================
 * FILE: lib/xyvala/search/temporal/search-temporal-signals-search-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical temporal-signal producer
 *
 * ROLE
 * - produce the canonical SearchTemporalSignals truth for one document
 * - consume explicit source publication evidence without reconstructing it
 * - consume one explicit analytical publication reference timestamp
 * - derive canonical publication_age_ms from explicit publication evidence
 *   and the explicit analytical publication reference timestamp
 * - compare explicit, comparable Search observations across time
 * - measure temporal persistence
 * - measure anchor persistence
 * - measure frequency evolution
 * - measure convergence evolution
 * - detect structural temporal ruptures
 * - qualify rupture evolution
 * - preserve unavailable temporal evidence explicitly
 *
 * CLASSIFICATION
 * - PRIVATE COMPUTE
 * - SEARCH DOMAIN
 * - TEMPORAL_SIGNAL_DETECTION
 * - CANONICAL PRODUCER
 * - PURE
 * - DETERMINISTIC
 * - NON-ORCHESTRATING
 * - NON-PERSISTENT
 * - NON-MUTATING
 * - NON-PUBLIC
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - Search pipeline canonical contract
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 * - Missing Data Explicitness Rule
 *
 * PRODUCES
 * - SearchTemporalSignals
 *
 * PIPELINE OWNERSHIP
 * - TEMPORAL_SIGNAL_DETECTION
 *
 * AUTHORIZED UPSTREAM TRUTHS
 * - deterministic document identity
 * - explicit source publication evidence
 * - explicit analytical publication reference timestamp
 * - observations explicitly supplied by the authorized Search orchestration
 *   boundary
 * - observations derived only from truths available before
 *   TEMPORAL_SIGNAL_DETECTION
 *
 * AUTHORIZED DOWNSTREAM CONSUMERS
 * - Temporal Document Scoring
 * - Penalty Evaluation
 * - Positive Score Assembly through canonical temporal score vectors
 * - Private Snapshot
 * - authorized private consumers
 *
 * DIRECTIVES
 * - one canonical producer for SearchTemporalSignals
 * - explicit producer policy
 * - explicit analytical publication reference timestamp
 * - no implicit policy selection
 * - no runtime orchestration
 * - no history-store access
 * - no network access
 * - no persistence
 * - no event publication
 * - no ranking
 * - no scoring-vector production
 * - no penalty evaluation
 * - no eligibility evaluation
 * - no private decision
 * - no calibration
 * - no public projection
 * - no implicit runtime timestamp
 * - no publication timestamp generation
 * - no analytical reference timestamp generation
 * - no observation identifier generation
 * - no downstream truth reconstruction
 * - no source publication reconstruction
 * - no first_observed_at -> published_at substitution
 * - no created_at -> publication_reference_at substitution
 * - no observation timestamp -> publication_reference_at substitution
 * - no unavailable -> zero conversion
 * - no unavailable -> neutral conversion
 * - missing temporal evidence remains explicitly unavailable
 *
 * IMPORTANT — TEMPORAL TIMESTAMP OWNERSHIP
 * ----------------------------------------------------------------------------
 * created_at:
 * - is contract / producer creation metadata;
 * - is supplied explicitly;
 * - is transported into SearchTemporalSignals;
 * - is NOT the analytical publication-age reference.
 *
 * publication_reference_at:
 * - is an explicit analytical input;
 * - is supplied by the authorized execution boundary;
 * - is never generated or inferred here;
 * - is the sole reference timestamp used to calculate publication_age_ms.
 *
 * published_at:
 * - is upstream source truth;
 * - is received explicitly;
 * - is validated;
 * - is transported without analytical reconstruction.
 *
 * This producer must never derive published_at from:
 * - first_observed_at;
 * - last_observed_at;
 * - current observation timestamp;
 * - created_at;
 * - snapshot creation time;
 * - runtime clock.
 *
 * This producer must never derive publication_reference_at from:
 * - created_at;
 * - current_observation.observed_at;
 * - first_observed_at;
 * - last_observed_at;
 * - snapshot time;
 * - runtime clock.
 *
 * publication_age_ms is canonical TEMPORAL_SIGNAL_DETECTION truth:
 *
 * publication_age_ms =
 *   publication_reference_at - published_at
 *
 * only when published_at is explicitly AVAILABLE and chronologically valid.
 *
 * If published_at is unavailable:
 * - publication_age_ms preserves non-availability semantics.
 *
 * If published_at occurs after publication_reference_at:
 * - publication_age_ms becomes explicit INVALID evidence.
 *
 * No zero fallback is allowed.
 *
 * IMPORTANT — TEMPORAL CONFIDENCE
 * ----------------------------------------------------------------------------
 * temporal_confidence is explicit optional evidence.
 *
 * UNAVAILABLE temporal evidence must NOT become:
 *
 * temporal_confidence = 0
 *
 * because unavailable != zero.
 *
 * A numerical confidence is produced only when temporal evidence supports
 * a confidence calculation.
 *
 * IMPORTANT PIPELINE RESTRICTION
 * ----------------------------------------------------------------------------
 * QUERY_RELEVANCE rupture events are NOT produced here.
 *
 * QUERY_RELEVANCE_SCORING occurs after TEMPORAL_SIGNAL_DETECTION.
 *
 * Producing QUERY_RELEVANCE temporal truth here would create a backward
 * dependency and violate the canonical Search pipeline.
 *
 * INPUTS
 * - deterministic document identity
 * - deterministic creation timestamp supplied by the authorized orchestrator
 * - explicit analytical publication reference timestamp
 * - explicit publication evidence supplied by an authorized upstream adapter
 * - explicit current Search temporal observation
 * - explicit historical Search temporal observations
 * - explicit producer policy
 *
 * OUTPUTS
 * - SearchTemporalSignals
 *
 * INVARIANTS
 * - document identity is never reconstructed
 * - observation identity is never generated internally
 * - created_at is never generated internally
 * - publication_reference_at is never generated internally
 * - created_at is never used as publication_reference_at
 * - published_at is never generated internally
 * - published_at is never reconstructed from temporal observations
 * - publication_age_ms is calculated only from explicit published_at and
 *   publication_reference_at
 * - publication_reference_at cannot occur after created_at
 * - current observation cannot occur after publication_reference_at
 * - historical observations are never fetched internally
 * - current observation must identify the current document version
 * - historical versions must belong to the explicitly supplied document series
 * - observations from another series are rejected
 * - one document version cannot carry conflicting available content hashes
 * - observation timestamps are deterministic inputs
 * - observations are ordered deterministically before analysis
 * - duplicated observation identities are rejected
 * - duplicated observation timestamps are rejected
 * - normalized scores remain within [0, 1]
 * - normalized trends remain within [-1, 1]
 * - missing historical evidence never becomes synthetic neutral evidence
 * - unavailable confidence never becomes numerical zero
 * - insufficient history remains explicitly qualified
 * - temporal rupture events originate only from validated comparable evidence
 * - content replacement is never inferred from absent content hashes
 * - no input contract is mutated
 * - no runtime clock is read
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * publication_age_ms calculated from created_at
 * => temporal timestamp ownership violation
 *
 * publication_reference_at reconstructed from created_at
 * => analytical-time reconstruction violation
 *
 * SearchTemporalSignals requires published_at / publication_age_ms but
 * producer omits them
 * => TEMPORAL_SIGNAL_DETECTION contract divergence
 *
 * SearchTemporalSignals.temporal_confidence is explicit optional evidence but
 * producer emits number
 * => missing-data contract divergence
 *
 * unavailable temporal confidence converted to 0
 * => Missing Data Explicitness violation
 *
 * published_at reconstructed from observation timestamp
 * => source temporal lineage violation
 *
 * producer policy silently selected inside core
 * => policy ownership / execution-boundary violation
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/search/contracts/search-pipeline-contract
 * ========================================================================== */

import {
  assertSearchTemporalDocumentSeriesId,
  type SearchTemporalDocumentSeriesId,
} from "./search-temporal-document-series-identity";

import type {
  SearchConfidenceScore,
  SearchContractVersion,
  SearchCount,
  SearchDocumentId,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchNormalizedScore,
  SearchObservationId,
  SearchOptionalEvidence,
  SearchPolicyVersion,
  SearchRatio,
  SearchRuptureEvolutionState,
  SearchTemporalRuptureEvent,
  SearchTemporalSignals,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME =
  "xyvala-search-temporal-signals-search-core" as const;

/**
 * v3.0 requires explicit document_series_id on input and every observation.
 * Current document-version equality remains required; historical versions may
 * differ only within the same series. Timestamp separation from v2.1 remains.
 *
 * Output contract remains unchanged:
 * - published_at transport
 * - publication_age_ms production
 * - explicit temporal_confidence availability
 *
 * Input boundary now requires:
 * - explicit publication_reference_at
 * - explicit document_series_id on input and every observation
 */
export const XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_VERSION:
  SearchModuleVersion =
    "3.0.0";

export const XYVALA_SEARCH_TEMPORAL_SIGNALS_CONTRACT_VERSION:
  SearchContractVersion =
    "2.0.0";

/* ============================================================================
 * 2. CANONICAL PROPERTY ALIASES
 * ----------------------------------------------------------------------------
 * These aliases are derived from SearchTemporalSignals.
 *
 * They do not redefine the canonical output contract.
 * ========================================================================== */

type SearchTemporalPublishedAtEvidence =
  SearchTemporalSignals["published_at"];

type SearchTemporalPublicationAgeEvidence =
  SearchTemporalSignals["publication_age_ms"];

type SearchTemporalConfidenceEvidence =
  SearchTemporalSignals["temporal_confidence"];

/* ============================================================================
 * 3. PRODUCER POLICY
 * ========================================================================== */

export interface SearchTemporalSignalsSearchPolicy {
  readonly policy_version:
    SearchPolicyVersion;

  readonly minimum_calibrated_observation_count:
    SearchCount;

  readonly full_confidence_observation_count:
    SearchCount;

  readonly rupture_detection_threshold:
    SearchNormalizedScore;

  readonly explosive_rupture_threshold:
    SearchNormalizedScore;

  readonly persistence_tolerance:
    SearchNormalizedScore;

  readonly rupture_evolution_stability_tolerance:
    SearchNormalizedScore;

  readonly minimum_material_trend:
    number;

  readonly full_scale_trend_per_day:
    number;

  readonly observation_volume_confidence_weight:
    SearchRatio;

  readonly evidence_availability_confidence_weight:
    SearchRatio;

  readonly observation_validation_confidence_weight:
    SearchRatio;
}

/**
 * Explicit reusable policy preset.
 *
 * Exporting this preset does not authorize implicit core fallback.
 * An authorized policy-resolution boundary must bind it explicitly.
 */
export const DEFAULT_XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_POLICY:
  SearchTemporalSignalsSearchPolicy =
    Object.freeze({
      policy_version:
        "1.0.0",

      minimum_calibrated_observation_count:
        3,

      full_confidence_observation_count:
        8,

      rupture_detection_threshold:
        0.25,

      explosive_rupture_threshold:
        0.75,

      persistence_tolerance:
        0.2,

      rupture_evolution_stability_tolerance:
        0.08,

      minimum_material_trend:
        0.05,

      full_scale_trend_per_day:
        0.1,

      observation_volume_confidence_weight:
        0.4,

      evidence_availability_confidence_weight:
        0.35,

      observation_validation_confidence_weight:
        0.25,
    });

/* ============================================================================
 * 4. TEMPORAL OBSERVATION INPUT CONTRACT
 * ========================================================================== */

export interface SearchTemporalSearchObservation {
  readonly document_series_id:
    SearchTemporalDocumentSeriesId;

  readonly observation_id:
    SearchObservationId;

  readonly document_id:
    SearchDocumentId;

  readonly observed_at:
    SearchIsoTimestamp;

  readonly content_hash:
    SearchOptionalEvidence<string>;

  readonly frequency_structure_value:
    SearchOptionalEvidence<SearchNormalizedScore>;

  readonly anchor_structure_value:
    SearchOptionalEvidence<SearchNormalizedScore>;

  readonly convergence_value:
    SearchOptionalEvidence<SearchNormalizedScore>;

  readonly link_profile_value:
    SearchOptionalEvidence<SearchNormalizedScore>;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 5. PRODUCER INPUT
 * ========================================================================== */

export interface SearchTemporalSignalsSearchInput {
  readonly document_series_id:
    SearchTemporalDocumentSeriesId;

  readonly document_id:
    SearchDocumentId;

  /**
   * Contract / producer creation timestamp.
   *
   * This is metadata and MUST NOT be used as the publication-age reference.
   */
  readonly created_at:
    SearchIsoTimestamp;

  /**
   * Explicit analytical reference timestamp.
   *
   * This is the sole temporal reference authorized for publication_age_ms.
   *
   * It must be resolved upstream and transported explicitly.
   */
  readonly publication_reference_at:
    SearchIsoTimestamp;

  /**
   * Canonical source-publication evidence.
   *
   * Must originate from an authorized upstream source.
   *
   * This producer does not reconstruct it.
   */
  readonly published_at:
    SearchTemporalPublishedAtEvidence;

  readonly current_observation:
    SearchTemporalSearchObservation;

  readonly historical_observations:
    readonly SearchTemporalSearchObservation[];

  /**
   * Explicit producer policy.
   *
   * No automatic fallback policy is selected inside this core.
   */
  readonly policy:
    SearchTemporalSignalsSearchPolicy;
}

/* ============================================================================
 * 6. INTERNAL RESULT TYPES
 * ========================================================================== */

interface SearchTemporalBoundaryValidation {
  readonly validation_state:
    SearchValidationState;

  readonly rejection_reasons:
    readonly string[];
}

interface SearchComparablePair {
  readonly previous:
    SearchTemporalSearchObservation;

  readonly current:
    SearchTemporalSearchObservation;
}

interface SearchNumericTrendCalculation {
  readonly evidence:
    SearchOptionalEvidence<number>;

  readonly source_observation_count:
    SearchCount;
}

interface SearchPersistenceCalculation {
  readonly evidence:
    SearchOptionalEvidence<SearchNormalizedScore>;

  readonly comparable_pair_count:
    SearchCount;
}

interface SearchTemporalRuptureDetectionResult {
  readonly rupture_events:
    readonly SearchTemporalRuptureEvent[];

  readonly pair_rupture_severities:
    readonly SearchNormalizedScore[];
}

/* ============================================================================
 * 7. BASIC ASSERTIONS
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
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
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
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} must be a valid ISO timestamp.`,
    );
  }
}

function assertFiniteNumber(
  value:
    number,
  fieldName:
    string,
): void {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} must be finite.`,
    );
  }
}

function assertFiniteNonNegativeNumber(
  value:
    number,
  fieldName:
    string,
): void {
  assertFiniteNumber(
    value,
    fieldName,
  );

  if (
    value <
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} must be non-negative.`,
    );
  }
}

function assertNormalizedNumber(
  value:
    number,
  fieldName:
    string,
): void {
  assertFiniteNumber(
    value,
    fieldName,
  );

  if (
    value <
      0 ||
    value >
      1
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} must be within [0, 1].`,
    );
  }
}

function assertPositiveInteger(
  value:
    number,
  fieldName:
    string,
): void {
  if (
    !Number.isInteger(
      value,
    ) ||
    value <=
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} must be a positive integer.`,
    );
  }
}

/* ============================================================================
 * 8. NUMERICAL HELPERS
 * ========================================================================== */

function clamp01(
  value:
    number,
): SearchNormalizedScore {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Internal invariant violation: normalized value must be finite.",
    );
  }

  if (
    value <=
    0
  ) {
    return 0;
  }

  if (
    value >=
    1
  ) {
    return 1;
  }

  return value;
}

function clampSignedUnit(
  value:
    number,
): number {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Internal invariant violation: signed normalized value must be finite.",
    );
  }

  if (
    value <=
    -1
  ) {
    return -1;
  }

  if (
    value >=
    1
  ) {
    return 1;
  }

  return value;
}

function safeRatio(
  numerator:
    number,
  denominator:
    number,
): number {
  if (
    !Number.isFinite(
      numerator,
    ) ||
    !Number.isFinite(
      denominator,
    ) ||
    denominator <=
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Internal invariant violation: invalid ratio arguments.",
    );
  }

  return (
    numerator /
    denominator
  );
}

function arithmeticMean(
  values:
    readonly number[],
): number {
  if (
    values.length ===
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Internal invariant violation: arithmetic mean requires values.",
    );
  }

  const total =
    values.reduce(
      (
        sum,
        value,
      ) =>
        sum +
        value,
      0,
    );

  return (
    total /
    values.length
  );
}

/* ============================================================================
 * 9. AVAILABILITY HELPERS
 * ========================================================================== */

function available<T>(
  value:
    T,
): SearchOptionalEvidence<T> {
  return Object.freeze({
    availability_state:
      "AVAILABLE",

    value,
  });
}

function unavailable<T>(
  reason:
    string,
): SearchOptionalEvidence<T> {
  assertNonEmptyString(
    reason,
    "availability.reason",
  );

  return Object.freeze({
    availability_state:
      "UNAVAILABLE",

    reason,
  });
}

function insufficientHistory<T>(
  reason:
    string,
): SearchOptionalEvidence<T> {
  assertNonEmptyString(
    reason,
    "availability.reason",
  );

  return Object.freeze({
    availability_state:
      "INSUFFICIENT_HISTORY",

    reason,
  });
}

function invalidEvidence<T>(
  reason:
    string,
): SearchOptionalEvidence<T> {
  assertNonEmptyString(
    reason,
    "availability.reason",
  );

  return Object.freeze({
    availability_state:
      "INVALID",

    reason,
  });
}

function isAvailable<T>(
  evidence:
    SearchOptionalEvidence<T>,
): evidence is {
  readonly availability_state:
    "AVAILABLE";

  readonly value:
    T;
} {
  return (
    evidence
      .availability_state ===
    "AVAILABLE"
  );
}

/* ============================================================================
 * 10. OPTIONAL EVIDENCE VALIDATION
 * ========================================================================== */

function validateOptionalTimestampEvidence(
  evidence:
    SearchOptionalEvidence<SearchIsoTimestamp>,
  fieldName:
    string,
): void {
  if (
    evidence
      .availability_state ===
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

function validateOptionalNormalizedEvidence(
  evidence:
    SearchOptionalEvidence<SearchNormalizedScore>,
  fieldName:
    string,
): void {
  if (
    evidence
      .availability_state ===
    "AVAILABLE"
  ) {
    assertNormalizedNumber(
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

function validateOptionalStringEvidence(
  evidence:
    SearchOptionalEvidence<string>,
  fieldName:
    string,
): void {
  if (
    evidence
      .availability_state ===
    "AVAILABLE"
  ) {
    assertNonEmptyString(
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

function validateOptionalNonNegativeNumberEvidence(
  evidence:
    SearchOptionalEvidence<number>,
  fieldName:
    string,
): void {
  if (
    evidence
      .availability_state ===
    "AVAILABLE"
  ) {
    assertFiniteNonNegativeNumber(
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
 * 11. POLICY VALIDATION
 * ========================================================================== */

function validatePolicy(
  policy:
    SearchTemporalSignalsSearchPolicy,
): void {
  assertNonEmptyString(
    policy.policy_version,
    "policy.policy_version",
  );

  assertPositiveInteger(
    policy
      .minimum_calibrated_observation_count,
    "policy.minimum_calibrated_observation_count",
  );

  assertPositiveInteger(
    policy
      .full_confidence_observation_count,
    "policy.full_confidence_observation_count",
  );

  if (
    policy
      .full_confidence_observation_count <
    policy
      .minimum_calibrated_observation_count
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Policy violation: full_confidence_observation_count must be >= " +
        "minimum_calibrated_observation_count.",
    );
  }

  assertNormalizedNumber(
    policy
      .rupture_detection_threshold,
    "policy.rupture_detection_threshold",
  );

  assertNormalizedNumber(
    policy
      .explosive_rupture_threshold,
    "policy.explosive_rupture_threshold",
  );

  if (
    policy
      .explosive_rupture_threshold <
    policy
      .rupture_detection_threshold
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Policy violation: explosive_rupture_threshold must be >= " +
        "rupture_detection_threshold.",
    );
  }

  assertNormalizedNumber(
    policy
      .persistence_tolerance,
    "policy.persistence_tolerance",
  );

  assertNormalizedNumber(
    policy
      .rupture_evolution_stability_tolerance,
    "policy.rupture_evolution_stability_tolerance",
  );

  assertFiniteNumber(
    policy
      .minimum_material_trend,
    "policy.minimum_material_trend",
  );

  if (
    policy.minimum_material_trend <
      0 ||
    policy.minimum_material_trend >
      1
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Policy violation: minimum_material_trend must be within [0, 1].",
    );
  }

  assertFiniteNumber(
    policy
      .full_scale_trend_per_day,
    "policy.full_scale_trend_per_day",
  );

  if (
    policy
      .full_scale_trend_per_day <=
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Policy violation: full_scale_trend_per_day must be > 0.",
    );
  }

  const confidenceWeights =
    [
      policy
        .observation_volume_confidence_weight,

      policy
        .evidence_availability_confidence_weight,

      policy
        .observation_validation_confidence_weight,
    ] as const;

  for (
    const [
      index,
      weight,
    ] of confidenceWeights.entries()
  ) {
    assertNormalizedNumber(
      weight,
      `policy.confidence_weight[${String(index)}]`,
    );
  }

  const totalWeight =
    confidenceWeights.reduce(
      (
        total,
        weight,
      ) =>
        total +
        weight,
      0,
    );

  if (
    Math.abs(
      totalWeight -
        1,
    ) >
    1e-9
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Policy violation: temporal confidence weights must sum to 1.",
    );
  }
}

/* ============================================================================
 * 12. OBSERVATION VALIDATION
 * ========================================================================== */

function validateObservation(
  observation:
    SearchTemporalSearchObservation,
  expectedSeriesId:
    SearchTemporalDocumentSeriesId,
  fieldName:
    string,
): void {
  assertNonEmptyString(
    observation
      .observation_id,
    `${fieldName}.observation_id`,
  );

  assertNonEmptyString(
    observation.document_id,
    `${fieldName}.document_id`,
  );

  if (
    observation.document_series_id !==
    expectedSeriesId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName}.document_series_id does not match input.document_series_id.`,
    );
  }

  assertValidIsoTimestamp(
    observation.observed_at,
    `${fieldName}.observed_at`,
  );

  validateOptionalStringEvidence(
    observation.content_hash,
    `${fieldName}.content_hash`,
  );

  validateOptionalNormalizedEvidence(
    observation
      .frequency_structure_value,
    `${fieldName}.frequency_structure_value`,
  );

  validateOptionalNormalizedEvidence(
    observation
      .anchor_structure_value,
    `${fieldName}.anchor_structure_value`,
  );

  validateOptionalNormalizedEvidence(
    observation
      .convergence_value,
    `${fieldName}.convergence_value`,
  );

  validateOptionalNormalizedEvidence(
    observation
      .link_profile_value,
    `${fieldName}.link_profile_value`,
  );

  if (
    observation
      .validation_state ===
      "VALID" &&
    observation
      .degradation_reasons
      .length >
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} is VALID but contains degradation reasons.`,
    );
  }
}

/* ============================================================================
 * 13. INPUT BOUNDARY VALIDATION
 * ========================================================================== */

function validateSearchTemporalSignalsSearchInput(
  input:
    SearchTemporalSignalsSearchInput,
): SearchTemporalBoundaryValidation {
  const rejectionReasons =
    new Set<string>();

  try {
    assertSearchTemporalDocumentSeriesId(input.document_series_id);

    assertNonEmptyString(
      input.document_id,
      "document_id",
    );

    assertValidIsoTimestamp(
      input.created_at,
      "created_at",
    );

    assertValidIsoTimestamp(
      input.publication_reference_at,
      "publication_reference_at",
    );

    validatePolicy(
      input.policy,
    );

    validateOptionalTimestampEvidence(
      input.published_at,
      "published_at",
    );

    validateObservation(
      input.current_observation,
      input.document_series_id,
      "current_observation",
    );

    if (input.current_observation.document_id !== input.document_id) {
      throw new Error(
        `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
          "Boundary violation: current_observation.document_id does not match input.document_id.",
      );
    }

    const createdAtTimestamp =
      Date.parse(
        input.created_at,
      );

    const publicationReferenceTimestamp =
      Date.parse(
        input.publication_reference_at,
      );

    if (
      publicationReferenceTimestamp >
      createdAtTimestamp
    ) {
      rejectionReasons.add(
        "PUBLICATION_REFERENCE_AFTER_TEMPORAL_CREATED_AT",
      );
    }

    const observationIds =
      new Set<string>();

    const observationTimestamps =
      new Set<string>();

    const contentHashByDocumentVersion = new Map<string, string>();

    const allObservations =
      [
        ...input
          .historical_observations,

        input.current_observation,
      ];

    for (
      let index =
        0;
      index <
      allObservations.length;
      index +=
        1
    ) {
      const observation =
        allObservations[
          index
        ];

      if (
        observation ===
        undefined
      ) {
        rejectionReasons.add(
          `TEMPORAL_OBSERVATION_UNDEFINED:${String(index)}`,
        );

        continue;
      }

      try {
        validateObservation(
          observation,
          input.document_series_id,
          `observations[${String(index)}]`,
        );
      } catch (
        error
      ) {
        rejectionReasons.add(
          error instanceof
            Error
            ? error.message
            : `INVALID_TEMPORAL_OBSERVATION:${String(index)}`,
        );

        continue;
      }

      if (observation.content_hash.availability_state === "AVAILABLE") {
        const hash = observation.content_hash.value;
        const existingHash = contentHashByDocumentVersion.get(observation.document_id);
        if (existingHash !== undefined && existingHash !== hash) {
          rejectionReasons.add(`DOCUMENT_VERSION_CONTENT_HASH_CONFLICT:${observation.document_id}`);
        }
        contentHashByDocumentVersion.set(observation.document_id, hash);
      }

      if (
        observationIds.has(
          observation
            .observation_id,
        )
      ) {
        rejectionReasons.add(
          `DUPLICATE_OBSERVATION_ID:${observation.observation_id}`,
        );
      }

      observationIds.add(
        observation
          .observation_id,
      );

      if (
        observationTimestamps.has(
          observation
            .observed_at,
        )
      ) {
        rejectionReasons.add(
          `DUPLICATE_OBSERVATION_TIMESTAMP:${observation.observed_at}`,
        );
      }

      observationTimestamps.add(
        observation
          .observed_at,
      );
    }

    const currentTimestamp =
      Date.parse(
        input
          .current_observation
          .observed_at,
      );

    if (
      currentTimestamp >
      publicationReferenceTimestamp
    ) {
      rejectionReasons.add(
        "CURRENT_OBSERVATION_AFTER_PUBLICATION_REFERENCE",
      );
    }

    for (
      const historicalObservation of
        input
          .historical_observations
    ) {
      const historicalTimestamp =
        Date.parse(
          historicalObservation
            .observed_at,
        );

      if (
        historicalTimestamp >=
        currentTimestamp
      ) {
        rejectionReasons.add(
          `HISTORICAL_OBSERVATION_NOT_BEFORE_CURRENT:${historicalObservation.observation_id}`,
        );
      }
    }
  } catch (
    error
  ) {
    rejectionReasons.add(
      error instanceof
        Error
        ? error.message
        : "UNKNOWN_TEMPORAL_BOUNDARY_VIOLATION",
    );
  }

  return Object.freeze({
    validation_state:
      rejectionReasons.size ===
        0
        ? "VALID"
        : "REJECTED",

    rejection_reasons:
      Object.freeze(
        [
          ...rejectionReasons,
        ].sort(),
      ),
  });
}

/* ============================================================================
 * 14. PUBLICATION AGE
 * ----------------------------------------------------------------------------
 * Legitimate TEMPORAL_SIGNAL_DETECTION calculation.
 *
 * published_at itself is NOT created here.
 *
 * created_at is NOT used here.
 * ========================================================================== */

function computePublicationAgeMs(
  publishedAt:
    SearchTemporalPublishedAtEvidence,
  publicationReferenceAt:
    SearchIsoTimestamp,
): SearchTemporalPublicationAgeEvidence {
  if (
    publishedAt
      .availability_state !==
    "AVAILABLE"
  ) {
    switch (
      publishedAt
        .availability_state
    ) {
      case "UNAVAILABLE":
        return unavailable<number>(
          publishedAt.reason,
        );

      case "INSUFFICIENT_DATA":
        return Object.freeze({
          availability_state:
            "INSUFFICIENT_DATA",

          reason:
            publishedAt.reason,
        });

      case "INSUFFICIENT_HISTORY":
        return insufficientHistory<number>(
          publishedAt.reason,
        );

      case "UNSUPPORTED":
        return Object.freeze({
          availability_state:
            "UNSUPPORTED",

          reason:
            publishedAt.reason,
        });

      case "INVALID":
        return invalidEvidence<number>(
          publishedAt.reason,
        );
    }
  }

  const publicationReferenceTimestamp =
    Date.parse(
      publicationReferenceAt,
    );

  const publishedAtTimestamp =
    Date.parse(
      publishedAt.value,
    );

  const publicationAgeMs =
    publicationReferenceTimestamp -
    publishedAtTimestamp;

  if (
    !Number.isFinite(
      publicationAgeMs,
    )
  ) {
    return invalidEvidence<number>(
      "PUBLICATION_AGE_INVALID:NON_FINITE_TIMESTAMP_DIFFERENCE",
    );
  }

  if (
    publicationAgeMs <
    0
  ) {
    return invalidEvidence<number>(
      "PUBLICATION_AGE_INVALID:PUBLISHED_AT_AFTER_PUBLICATION_REFERENCE",
    );
  }

  return available<number>(
    publicationAgeMs,
  );
}

/* ============================================================================
 * 15. PUBLICATION AGE INTERNAL INVARIANT
 * ----------------------------------------------------------------------------
 * Validation only.
 *
 * This does not produce a second publication_age_ms truth.
 * ========================================================================== */

function assertPublicationAgeMatchesReference(
  publishedAt:
    SearchTemporalPublishedAtEvidence,
  publicationAgeMs:
    SearchTemporalPublicationAgeEvidence,
  publicationReferenceAt:
    SearchIsoTimestamp,
): void {
  if (
    publishedAt
      .availability_state !==
      "AVAILABLE" ||
    publicationAgeMs
      .availability_state !==
      "AVAILABLE"
  ) {
    return;
  }

  const expectedPublicationAge =
    Date.parse(
      publicationReferenceAt,
    ) -
    Date.parse(
      publishedAt.value,
    );

  if (
    expectedPublicationAge <
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Internal invariant violation: AVAILABLE publication age cannot be based on a publication timestamp after publication_reference_at.",
    );
  }

  if (
    publicationAgeMs.value !==
    expectedPublicationAge
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Internal invariant violation: publication_age_ms diverges from the explicit publication reference.",
    );
  }
}

/* ============================================================================
 * 16. DETERMINISTIC OBSERVATION ORDERING
 * ========================================================================== */

function sortObservations(
  input:
    SearchTemporalSignalsSearchInput,
): readonly SearchTemporalSearchObservation[] {
  const observations =
    [
      ...input
        .historical_observations,

      input.current_observation,
    ];

  observations.sort(
    (
      left,
      right,
    ) => {
      const leftTimestamp =
        Date.parse(
          left.observed_at,
        );

      const rightTimestamp =
        Date.parse(
          right.observed_at,
        );

      if (
        leftTimestamp !==
        rightTimestamp
      ) {
        return (
          leftTimestamp -
          rightTimestamp
        );
      }

      return left
        .observation_id
        .localeCompare(
          right
            .observation_id,
        );
    },
  );

  return Object.freeze(
    observations,
  );
}

/* ============================================================================
 * 17. COMPARABLE PAIRS
 * ========================================================================== */

function buildComparablePairs(
  observations:
    readonly SearchTemporalSearchObservation[],
): readonly SearchComparablePair[] {
  if (
    observations.length <
    2
  ) {
    return Object.freeze(
      [],
    );
  }

  const pairs:
    SearchComparablePair[] =
    [];

  for (
    let index =
      1;
    index <
    observations.length;
    index +=
      1
  ) {
    const previous =
      observations[
        index -
        1
      ];

    const current =
      observations[
        index
      ];

    if (
      previous ===
        undefined ||
      current ===
        undefined
    ) {
      continue;
    }

    pairs.push(
      Object.freeze({
        previous,
        current,
      }),
    );
  }

  return Object.freeze(
    pairs,
  );
}

/* ============================================================================
 * 18. FIRST / LAST OBSERVATION
 * ========================================================================== */

function resolveFirstObservedAt(
  observations:
    readonly SearchTemporalSearchObservation[],
): SearchOptionalEvidence<SearchIsoTimestamp> {
  const first =
    observations[
      0
    ];

  if (
    first ===
    undefined
  ) {
    return unavailable<SearchIsoTimestamp>(
      "TEMPORAL_FIRST_OBSERVED_AT_UNAVAILABLE:NO_OBSERVATIONS",
    );
  }

  return available<SearchIsoTimestamp>(
    first.observed_at,
  );
}

function resolveLastObservedAt(
  observations:
    readonly SearchTemporalSearchObservation[],
): SearchOptionalEvidence<SearchIsoTimestamp> {
  const last =
    observations[
      observations.length -
        1
    ];

  if (
    last ===
    undefined
  ) {
    return unavailable<SearchIsoTimestamp>(
      "TEMPORAL_LAST_OBSERVED_AT_UNAVAILABLE:NO_OBSERVATIONS",
    );
  }

  return available<SearchIsoTimestamp>(
    last.observed_at,
  );
}

/* ============================================================================
 * 19. TEMPORAL STATE
 * ========================================================================== */

function hasAnyComparableNumericEvidence(
  observations:
    readonly SearchTemporalSearchObservation[],
): boolean {
  for (
    const observation of
      observations
  ) {
    if (
      isAvailable(
        observation
          .frequency_structure_value,
      ) ||
      isAvailable(
        observation
          .anchor_structure_value,
      ) ||
      isAvailable(
        observation
          .convergence_value,
      ) ||
      isAvailable(
        observation
          .link_profile_value,
      )
    ) {
      return true;
    }
  }

  return false;
}

function resolveTemporalState(
  observations:
    readonly SearchTemporalSearchObservation[],
  policy:
    SearchTemporalSignalsSearchPolicy,
): SearchTemporalSignals["temporal_state"] {
  if (
    observations.length ===
      0 ||
    !hasAnyComparableNumericEvidence(
      observations,
    )
  ) {
    return "UNAVAILABLE";
  }

  if (
    observations.length <
    policy
      .minimum_calibrated_observation_count
  ) {
    return "INSUFFICIENT_HISTORY";
  }

  return "CALIBRATED";
}

/* ============================================================================
 * 20. NUMERIC EVIDENCE EXTRACTION
 * ========================================================================== */

type SearchTemporalNumericSelector =
  (
    observation:
      SearchTemporalSearchObservation,
  ) =>
    SearchOptionalEvidence<SearchNormalizedScore>;

interface SearchTimeValuePoint {
  readonly day:
    number;

  readonly value:
    SearchNormalizedScore;
}

function collectAvailableTimeValuePoints(
  observations:
    readonly SearchTemporalSearchObservation[],
  selector:
    SearchTemporalNumericSelector,
): readonly SearchTimeValuePoint[] {
  if (
    observations.length ===
    0
  ) {
    return Object.freeze(
      [],
    );
  }

  const first =
    observations[
      0
    ];

  if (
    first ===
    undefined
  ) {
    return Object.freeze(
      [],
    );
  }

  const originTimestamp =
    Date.parse(
      first.observed_at,
    );

  const millisecondsPerDay =
    86_400_000;

  const points:
    SearchTimeValuePoint[] =
    [];

  for (
    const observation of
      observations
  ) {
    const evidence =
      selector(
        observation,
      );

    if (
      !isAvailable(
        evidence,
      )
    ) {
      continue;
    }

    const timestamp =
      Date.parse(
        observation
          .observed_at,
      );

    points.push(
      Object.freeze({
        day:
          (
            timestamp -
            originTimestamp
          ) /
          millisecondsPerDay,

        value:
          evidence.value,
      }),
    );
  }

  return Object.freeze(
    points,
  );
}

/* ============================================================================
 * 21. LINEAR TEMPORAL TREND
 * ========================================================================== */

function computeNormalizedTemporalTrend(
  observations:
    readonly SearchTemporalSearchObservation[],
  selector:
    SearchTemporalNumericSelector,
  unavailableReason:
    string,
  policy:
    SearchTemporalSignalsSearchPolicy,
): SearchNumericTrendCalculation {
  const points =
    collectAvailableTimeValuePoints(
      observations,
      selector,
    );

  if (
    points.length <
    2
  ) {
    return Object.freeze({
      evidence:
        observations.length <
        policy
          .minimum_calibrated_observation_count
          ? insufficientHistory<number>(
              unavailableReason,
            )
          : unavailable<number>(
              unavailableReason,
            ),

      source_observation_count:
        points.length,
    });
  }

  const xValues =
    points.map(
      (
        point,
      ) =>
        point.day,
    );

  const yValues =
    points.map(
      (
        point,
      ) =>
        point.value,
    );

  const meanX =
    arithmeticMean(
      xValues,
    );

  const meanY =
    arithmeticMean(
      yValues,
    );

  let covariance =
    0;

  let varianceX =
    0;

  for (
    let index =
      0;
    index <
    points.length;
    index +=
      1
  ) {
    const x =
      xValues[
        index
      ];

    const y =
      yValues[
        index
      ];

    if (
      x ===
        undefined ||
      y ===
        undefined
    ) {
      continue;
    }

    const xDelta =
      x -
      meanX;

    covariance +=
      xDelta *
      (
        y -
        meanY
      );

    varianceX +=
      xDelta *
      xDelta;
  }

  if (
    varianceX <=
    0
  ) {
    return Object.freeze({
      evidence:
        unavailable<number>(
          `${unavailableReason}:ZERO_TEMPORAL_SPAN`,
        ),

      source_observation_count:
        points.length,
    });
  }

  const slopePerDay =
    covariance /
    varianceX;

  const normalizedTrend =
    clampSignedUnit(
      slopePerDay /
        policy
          .full_scale_trend_per_day,
    );

  return Object.freeze({
    evidence:
      available<number>(
        normalizedTrend,
      ),

    source_observation_count:
      points.length,
  });
}

/* ============================================================================
 * 22. PERSISTENCE
 * ========================================================================== */

function computePersistenceScore(
  pairs:
    readonly SearchComparablePair[],
  selector:
    SearchTemporalNumericSelector,
  unavailableReason:
    string,
  policy:
    SearchTemporalSignalsSearchPolicy,
): SearchPersistenceCalculation {
  if (
    pairs.length ===
    0
  ) {
    return Object.freeze({
      evidence:
        insufficientHistory<SearchNormalizedScore>(
          unavailableReason,
        ),

      comparable_pair_count:
        0,
    });
  }

  const pairPersistenceValues:
    number[] =
    [];

  for (
    const pair of
      pairs
  ) {
    const previousEvidence =
      selector(
        pair.previous,
      );

    const currentEvidence =
      selector(
        pair.current,
      );

    if (
      !isAvailable(
        previousEvidence,
      ) ||
      !isAvailable(
        currentEvidence,
      )
    ) {
      continue;
    }

    const absoluteDelta =
      Math.abs(
        currentEvidence.value -
          previousEvidence.value,
      );

    const normalizedInstability =
      policy
        .persistence_tolerance ===
      0
        ? absoluteDelta >
          0
          ? 1
          : 0
        : clamp01(
            absoluteDelta /
              policy
                .persistence_tolerance,
          );

    pairPersistenceValues.push(
      clamp01(
        1 -
          normalizedInstability,
      ),
    );
  }

  if (
    pairPersistenceValues.length ===
    0
  ) {
    return Object.freeze({
      evidence:
        unavailable<SearchNormalizedScore>(
          unavailableReason,
        ),

      comparable_pair_count:
        0,
    });
  }

  return Object.freeze({
    evidence:
      available<SearchNormalizedScore>(
        clamp01(
          arithmeticMean(
            pairPersistenceValues,
          ),
        ),
      ),

    comparable_pair_count:
      pairPersistenceValues.length,
  });
}

/* ============================================================================
 * 23. SIGNAL PERSISTENCE
 * ========================================================================== */

function computeSignalPersistenceScore(
  pairs:
    readonly SearchComparablePair[],
  policy:
    SearchTemporalSignalsSearchPolicy,
): SearchPersistenceCalculation {
  if (
    pairs.length ===
    0
  ) {
    return Object.freeze({
      evidence:
        insufficientHistory<SearchNormalizedScore>(
          "SIGNAL_PERSISTENCE_UNAVAILABLE:NO_TEMPORAL_PAIRS",
        ),

      comparable_pair_count:
        0,
    });
  }

  const values:
    number[] =
    [];

  let comparablePairCount =
    0;

  for (
    const pair of
      pairs
  ) {
    const pairComponents:
      number[] =
      [];

    const previousFrequency =
      pair.previous
        .frequency_structure_value;

    const currentFrequency =
      pair.current
        .frequency_structure_value;

    if (
      isAvailable(
        previousFrequency,
      ) &&
      isAvailable(
        currentFrequency,
      )
    ) {
      const delta =
        Math.abs(
          currentFrequency.value -
            previousFrequency.value,
        );

      const instability =
        policy
          .persistence_tolerance ===
        0
          ? delta >
            0
            ? 1
            : 0
          : clamp01(
              delta /
                policy
                  .persistence_tolerance,
            );

      pairComponents.push(
        clamp01(
          1 -
            instability,
        ),
      );
    }

    const previousConvergence =
      pair.previous
        .convergence_value;

    const currentConvergence =
      pair.current
        .convergence_value;

    if (
      isAvailable(
        previousConvergence,
      ) &&
      isAvailable(
        currentConvergence,
      )
    ) {
      const delta =
        Math.abs(
          currentConvergence.value -
            previousConvergence.value,
        );

      const instability =
        policy
          .persistence_tolerance ===
        0
          ? delta >
            0
            ? 1
            : 0
          : clamp01(
              delta /
                policy
                  .persistence_tolerance,
            );

      pairComponents.push(
        clamp01(
          1 -
            instability,
        ),
      );
    }

    if (
      pairComponents.length >
      0
    ) {
      values.push(
        arithmeticMean(
          pairComponents,
        ),
      );

      comparablePairCount +=
        1;
    }
  }

  if (
    values.length ===
    0
  ) {
    return Object.freeze({
      evidence:
        unavailable<SearchNormalizedScore>(
          "SIGNAL_PERSISTENCE_UNAVAILABLE:NO_COMPARABLE_TEMPORAL_SIGNAL_EVIDENCE",
        ),

      comparable_pair_count:
        0,
    });
  }

  return Object.freeze({
    evidence:
      available<SearchNormalizedScore>(
        clamp01(
          arithmeticMean(
            values,
          ),
        ),
      ),

    comparable_pair_count:
      comparablePairCount,
  });
}

/* ============================================================================
 * 24. OBSERVATION VALIDATION CONFIDENCE
 * ========================================================================== */

function validationStateConfidence(
  state:
    SearchValidationState,
): SearchConfidenceScore {
  switch (
    state
  ) {
    case "VALID":
      return 1;

    case "DEGRADED":
      return 0.65;

    case "UNVALIDATED":
      return 0.35;

    case "REJECTED":
      return 0;

    default: {
      const exhaustiveCheck:
        never =
        state;

      return exhaustiveCheck;
    }
  }
}

function computePairConfidence(
  previous:
    SearchTemporalSearchObservation,
  current:
    SearchTemporalSearchObservation,
): SearchConfidenceScore {
  return clamp01(
    (
      validationStateConfidence(
        previous
          .validation_state,
      ) +
      validationStateConfidence(
        current
          .validation_state,
      )
    ) /
      2,
  );
}

/* ============================================================================
 * 25. RUPTURE EVENT FACTORY
 * ========================================================================== */

function buildTemporalRuptureEvent(
  args: {
    readonly observation:
      SearchTemporalSearchObservation;

    readonly rupture_kind:
      SearchTemporalRuptureEvent["rupture_kind"];

    readonly severity:
      SearchNormalizedScore;

    readonly confidence:
      SearchConfidenceScore;

    readonly explanation:
      string;
  },
): SearchTemporalRuptureEvent {
  return Object.freeze({
    observation_id:
      args
        .observation
        .observation_id,

    observed_at:
      args
        .observation
        .observed_at,

    rupture_kind:
      args
        .rupture_kind,

    severity:
      clamp01(
        args.severity,
      ),

    confidence:
      clamp01(
        args.confidence,
      ),

    explanation:
      args.explanation,
  });
}

/* ============================================================================
 * 26. NUMERIC RUPTURE DETECTION
 * ========================================================================== */

function maybeBuildNumericRupture(
  args: {
    readonly previous:
      SearchOptionalEvidence<SearchNormalizedScore>;

    readonly current:
      SearchOptionalEvidence<SearchNormalizedScore>;

    readonly current_observation:
      SearchTemporalSearchObservation;

    readonly rupture_kind:
      SearchTemporalRuptureEvent["rupture_kind"];

    readonly source_name:
      string;

    readonly policy:
      SearchTemporalSignalsSearchPolicy;

    readonly pair_confidence:
      SearchConfidenceScore;
  },
): SearchTemporalRuptureEvent | null {
  if (
    !isAvailable(
      args.previous,
    ) ||
    !isAvailable(
      args.current,
    )
  ) {
    return null;
  }

  const delta =
    args.current.value -
    args.previous.value;

  const absoluteDelta =
    Math.abs(
      delta,
    );

  if (
    absoluteDelta <
    args.policy
      .rupture_detection_threshold
  ) {
    return null;
  }

  return buildTemporalRuptureEvent({
    observation:
      args
        .current_observation,

    rupture_kind:
      args
        .rupture_kind,

    severity:
      absoluteDelta,

    confidence:
      args
        .pair_confidence,

    explanation:
      `${args.source_name} changed by ${delta.toFixed(6)} between consecutive validated temporal observations.`,
  });
}

/* ============================================================================
 * 27. CONTENT REPLACEMENT DETECTION
 * ========================================================================== */

function maybeBuildContentReplacementRupture(
  pair:
    SearchComparablePair,
): SearchTemporalRuptureEvent | null {
  const previousHash =
    pair.previous
      .content_hash;

  const currentHash =
    pair.current
      .content_hash;

  if (
    !isAvailable(
      previousHash,
    ) ||
    !isAvailable(
      currentHash,
    )
  ) {
    return null;
  }

  if (
    previousHash.value ===
    currentHash.value
  ) {
    return null;
  }

  return buildTemporalRuptureEvent({
    observation:
      pair.current,

    rupture_kind:
      "CONTENT_REPLACEMENT",

    severity:
      1,

    confidence:
      computePairConfidence(
        pair.previous,
        pair.current,
      ),

    explanation:
      "Canonical content hash changed between consecutive validated observations.",
  });
}

/* ============================================================================
 * 28. RUPTURE-COMPARABILITY CHECK
 * ========================================================================== */

function hasComparableRuptureEvidence(
  pair:
    SearchComparablePair,
): boolean {
  const numericComparable =
    (
      isAvailable(
        pair.previous
          .frequency_structure_value,
      ) &&
      isAvailable(
        pair.current
          .frequency_structure_value,
      )
    ) ||
    (
      isAvailable(
        pair.previous
          .anchor_structure_value,
      ) &&
      isAvailable(
        pair.current
          .anchor_structure_value,
      )
    ) ||
    (
      isAvailable(
        pair.previous
          .link_profile_value,
      ) &&
      isAvailable(
        pair.current
          .link_profile_value,
      )
    );

  const contentComparable =
    isAvailable(
      pair.previous
        .content_hash,
    ) &&
    isAvailable(
      pair.current
        .content_hash,
    );

  return (
    numericComparable ||
    contentComparable
  );
}

/* ============================================================================
 * 29. RUPTURE DETECTION
 * ========================================================================== */

function detectTemporalRuptures(
  pairs:
    readonly SearchComparablePair[],
  policy:
    SearchTemporalSignalsSearchPolicy,
): SearchTemporalRuptureDetectionResult {
  const ruptureEvents:
    SearchTemporalRuptureEvent[] =
    [];

  const pairRuptureSeverities:
    SearchNormalizedScore[] =
    [];

  for (
    const pair of
      pairs
  ) {
    if (
      !hasComparableRuptureEvidence(
        pair,
      )
    ) {
      continue;
    }

    const pairConfidence =
      computePairConfidence(
        pair.previous,
        pair.current,
      );

    const pairEvents:
      SearchTemporalRuptureEvent[] =
      [];

    const frequencyRupture =
      maybeBuildNumericRupture({
        previous:
          pair.previous
            .frequency_structure_value,

        current:
          pair.current
            .frequency_structure_value,

        current_observation:
          pair.current,

        rupture_kind:
          "TERM_DISTRIBUTION",

        source_name:
          "frequency_structure_value",

        policy,

        pair_confidence:
          pairConfidence,
      });

    if (
      frequencyRupture !==
      null
    ) {
      pairEvents.push(
        frequencyRupture,
      );
    }

    const anchorRupture =
      maybeBuildNumericRupture({
        previous:
          pair.previous
            .anchor_structure_value,

        current:
          pair.current
            .anchor_structure_value,

        current_observation:
          pair.current,

        rupture_kind:
          "ANCHOR_STRUCTURE",

        source_name:
          "anchor_structure_value",

        policy,

        pair_confidence:
          pairConfidence,
      });

    if (
      anchorRupture !==
      null
    ) {
      pairEvents.push(
        anchorRupture,
      );
    }

    const linkRupture =
      maybeBuildNumericRupture({
        previous:
          pair.previous
            .link_profile_value,

        current:
          pair.current
            .link_profile_value,

        current_observation:
          pair.current,

        rupture_kind:
          "LINK_PROFILE",

        source_name:
          "link_profile_value",

        policy,

        pair_confidence:
          pairConfidence,
      });

    if (
      linkRupture !==
      null
    ) {
      pairEvents.push(
        linkRupture,
      );
    }

    const contentReplacement =
      maybeBuildContentReplacementRupture(
        pair,
      );

    if (
      contentReplacement !==
      null
    ) {
      pairEvents.push(
        contentReplacement,
      );
    }

    if (
      pairEvents.length >
      0
    ) {
      const pairSeverity =
        Math.max(
          ...pairEvents.map(
            (
              event,
            ) =>
              event.severity,
          ),
        );

      pairRuptureSeverities.push(
        clamp01(
          pairSeverity,
        ),
      );

      ruptureEvents.push(
        ...pairEvents,
      );
    } else {
      /*
       * Legitimate zero.
       *
       * Comparable evidence exists for the pair and no configured rupture
       * threshold was reached.
       */
      pairRuptureSeverities.push(
        0,
      );
    }
  }

  ruptureEvents.sort(
    (
      left,
      right,
    ) => {
      const timestampDelta =
        Date.parse(
          left.observed_at,
        ) -
        Date.parse(
          right.observed_at,
        );

      if (
        timestampDelta !==
        0
      ) {
        return timestampDelta;
      }

      const observationDelta =
        left
          .observation_id
          .localeCompare(
            right
              .observation_id,
          );

      if (
        observationDelta !==
        0
      ) {
        return observationDelta;
      }

      return left
        .rupture_kind
        .localeCompare(
          right
            .rupture_kind,
        );
    },
  );

  return Object.freeze({
    rupture_events:
      Object.freeze([
        ...ruptureEvents,
      ]),

    pair_rupture_severities:
      Object.freeze([
        ...pairRuptureSeverities,
      ]),
  });
}

/* ============================================================================
 * 30. RUPTURE EVOLUTION
 * ========================================================================== */

function resolveRuptureEvolutionState(
  args: {
    readonly temporal_state:
      SearchTemporalSignals["temporal_state"];

    readonly pair_rupture_severities:
      readonly SearchNormalizedScore[];

    readonly policy:
      SearchTemporalSignalsSearchPolicy;
  },
): SearchRuptureEvolutionState {
  if (
    args
      .temporal_state ===
      "UNAVAILABLE" ||
    args
      .temporal_state ===
      "INSUFFICIENT_HISTORY"
  ) {
    return "INSUFFICIENT_HISTORY";
  }

  const severities =
    args
      .pair_rupture_severities;

  if (
    severities.length ===
    0
  ) {
    /*
     * SearchRuptureEvolutionState currently has no UNAVAILABLE member.
     *
     * No numerical rupture evidence is synthesized.
     * Availability remains represented by temporal state and degradation
     * metadata.
     */
    return "INSUFFICIENT_HISTORY";
  }

  const latestSeverity =
    severities[
      severities.length -
        1
    ];

  if (
    latestSeverity ===
    undefined
  ) {
    return "INSUFFICIENT_HISTORY";
  }

  if (
    latestSeverity >=
    args.policy
      .explosive_rupture_threshold
  ) {
    return "EXPLOSIVE";
  }

  const nonZeroSeverities =
    severities.filter(
      (
        severity,
      ) =>
        severity >
        0,
    );

  if (
    nonZeroSeverities.length ===
    0
  ) {
    return "NONE";
  }

  if (
    nonZeroSeverities.length ===
    1
  ) {
    return "PERSISTENT";
  }

  const previousSeverity =
    nonZeroSeverities[
      nonZeroSeverities.length -
        2
    ];

  const currentSeverity =
    nonZeroSeverities[
      nonZeroSeverities.length -
        1
    ];

  if (
    previousSeverity ===
      undefined ||
    currentSeverity ===
      undefined
  ) {
    return "PERSISTENT";
  }

  const delta =
    currentSeverity -
    previousSeverity;

  if (
    Math.abs(
      delta,
    ) <=
    args.policy
      .rupture_evolution_stability_tolerance
  ) {
    return "STABLE";
  }

  if (
    delta >
    0
  ) {
    return "GROWING";
  }

  return "DECLINING";
}

/* ============================================================================
 * 31. TEMPORAL CONFIDENCE
 * ========================================================================== */

function observationEvidenceAvailabilityRatio(
  observation:
    SearchTemporalSearchObservation,
): SearchRatio {
  const evidences =
    [
      observation
        .frequency_structure_value,

      observation
        .anchor_structure_value,

      observation
        .convergence_value,

      observation
        .link_profile_value,
    ] as const;

  const availableCount =
    evidences.reduce(
      (
        count,
        evidence,
      ) =>
        count +
        (
          evidence
            .availability_state ===
          "AVAILABLE"
            ? 1
            : 0
        ),
      0,
    );

  return clamp01(
    safeRatio(
      availableCount,
      evidences.length,
    ),
  );
}

function computeTemporalConfidence(
  observations:
    readonly SearchTemporalSearchObservation[],
  temporalState:
    SearchTemporalSignals["temporal_state"],
  policy:
    SearchTemporalSignalsSearchPolicy,
): SearchTemporalConfidenceEvidence {
  if (
    observations.length ===
      0 ||
    temporalState ===
      "UNAVAILABLE"
  ) {
    return unavailable<SearchConfidenceScore>(
      "TEMPORAL_CONFIDENCE_UNAVAILABLE:TEMPORAL_EVIDENCE_UNAVAILABLE",
    );
  }

  const volumeConfidence =
    clamp01(
      observations.length /
        policy
          .full_confidence_observation_count,
    );

  const availabilityConfidence =
    arithmeticMean(
      observations.map(
        observationEvidenceAvailabilityRatio,
      ),
    );

  const validationConfidence =
    arithmeticMean(
      observations.map(
        (
          observation,
        ) =>
          validationStateConfidence(
            observation
              .validation_state,
          ),
      ),
    );

  let confidence =
    volumeConfidence *
      policy
        .observation_volume_confidence_weight +
    availabilityConfidence *
      policy
        .evidence_availability_confidence_weight +
    validationConfidence *
      policy
        .observation_validation_confidence_weight;

  if (
    temporalState ===
    "INSUFFICIENT_HISTORY"
  ) {
    confidence =
      Math.min(
        confidence,
        0.65,
      );
  }

  return available<SearchConfidenceScore>(
    clamp01(
      confidence,
    ),
  );
}

/* ============================================================================
 * 32. OUTPUT VALIDATION STATE
 * ========================================================================== */

function resolveOutputValidationState(
  args: {
    readonly temporal_state:
      SearchTemporalSignals["temporal_state"];

    readonly observations:
      readonly SearchTemporalSearchObservation[];

    readonly published_at:
      SearchTemporalPublishedAtEvidence;

    readonly publication_age_ms:
      SearchTemporalPublicationAgeEvidence;

    readonly temporal_confidence:
      SearchTemporalConfidenceEvidence;

    readonly signal_persistence_score:
      SearchOptionalEvidence<SearchNormalizedScore>;

    readonly anchor_persistence_score:
      SearchOptionalEvidence<SearchNormalizedScore>;

    readonly frequency_trend:
      SearchOptionalEvidence<number>;

    readonly convergence_trend:
      SearchOptionalEvidence<number>;
  },
): {
  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
} {
  const degradationReasons =
    new Set<string>();

  if (
    args
      .temporal_state ===
    "INSUFFICIENT_HISTORY"
  ) {
    degradationReasons.add(
      "TEMPORAL_SIGNAL_DETECTION:INSUFFICIENT_HISTORY",
    );
  }

  if (
    args
      .temporal_state ===
    "UNAVAILABLE"
  ) {
    degradationReasons.add(
      "TEMPORAL_SIGNAL_DETECTION:TEMPORAL_EVIDENCE_UNAVAILABLE",
    );
  }

  if (
    args
      .published_at
      .availability_state !==
    "AVAILABLE"
  ) {
    degradationReasons.add(
      `TEMPORAL_SIGNAL_DETECTION:PUBLISHED_AT:${args.published_at.availability_state}`,
    );
  }

  if (
    args
      .publication_age_ms
      .availability_state !==
    "AVAILABLE"
  ) {
    degradationReasons.add(
      `TEMPORAL_SIGNAL_DETECTION:PUBLICATION_AGE_MS:${args.publication_age_ms.availability_state}`,
    );
  }

  if (
    args
      .temporal_confidence
      .availability_state !==
    "AVAILABLE"
  ) {
    degradationReasons.add(
      `TEMPORAL_SIGNAL_DETECTION:TEMPORAL_CONFIDENCE:${args.temporal_confidence.availability_state}`,
    );
  }

  for (
    const observation of
      args.observations
  ) {
    if (
      observation
        .validation_state ===
      "DEGRADED"
    ) {
      degradationReasons.add(
        `TEMPORAL_OBSERVATION_DEGRADED:${observation.observation_id}`,
      );
    }

    if (
      observation
        .validation_state ===
      "UNVALIDATED"
    ) {
      degradationReasons.add(
        `TEMPORAL_OBSERVATION_UNVALIDATED:${observation.observation_id}`,
      );
    }

    for (
      const reason of
        observation
          .degradation_reasons
    ) {
      degradationReasons.add(
        `TEMPORAL_OBSERVATION:${observation.observation_id}:${reason}`,
      );
    }
  }

  const evidences =
    [
      [
        "SIGNAL_PERSISTENCE_UNAVAILABLE",
        args
          .signal_persistence_score,
      ],

      [
        "ANCHOR_PERSISTENCE_UNAVAILABLE",
        args
          .anchor_persistence_score,
      ],

      [
        "FREQUENCY_TREND_UNAVAILABLE",
        args
          .frequency_trend,
      ],

      [
        "CONVERGENCE_TREND_UNAVAILABLE",
        args
          .convergence_trend,
      ],
    ] as const;

  for (
    const [
      reason,
      evidence,
    ] of evidences
  ) {
    if (
      evidence
        .availability_state !==
      "AVAILABLE"
    ) {
      degradationReasons.add(
        reason,
      );
    }
  }

  return Object.freeze({
    validation_state:
      degradationReasons.size ===
        0
        ? "VALID"
        : "DEGRADED",

    degradation_reasons:
      Object.freeze(
        [
          ...degradationReasons,
        ].sort(),
      ),
  });
}

/* ============================================================================
 * 33. REJECTED OUTPUT
 * ========================================================================== */

function resolveRejectedPublishedAt(
  publishedAt:
    SearchTemporalPublishedAtEvidence,
  rejectionReason:
    string,
): SearchTemporalPublishedAtEvidence {
  try {
    validateOptionalTimestampEvidence(
      publishedAt,
      "published_at",
    );

    /*
     * Valid upstream source evidence is preserved even when another part of
     * the producer input causes rejection.
     */
    return publishedAt;
  } catch {
    return invalidEvidence<SearchIsoTimestamp>(
      rejectionReason,
    );
  }
}

function buildRejectedSearchTemporalSignals(
  input:
    SearchTemporalSignalsSearchInput,
  rejectionReasons:
    readonly string[],
): SearchTemporalSignals {
  const reason =
    rejectionReasons.length >
      0
      ? rejectionReasons.join(
          "; ",
        )
      : "TEMPORAL_SIGNALS_INPUT_REJECTED";

  const suppliedObservationCount =
    input
      .historical_observations
      .length +
    1;

  return Object.freeze({
    contract_version:
      XYVALA_SEARCH_TEMPORAL_SIGNALS_CONTRACT_VERSION,

    created_at:
      input.created_at,

    document_id:
      input.document_id,

    published_at:
      resolveRejectedPublishedAt(
        input.published_at,
        reason,
      ),

    /*
     * No canonical derived temporal truth is emitted from a rejected
     * execution boundary.
     */
    publication_age_ms:
      invalidEvidence<number>(
        reason,
      ),

    temporal_state:
      "UNAVAILABLE",

    first_observed_at:
      unavailable<SearchIsoTimestamp>(
        reason,
      ),

    last_observed_at:
      unavailable<SearchIsoTimestamp>(
        reason,
      ),

    observation_count:
      suppliedObservationCount,

    signal_persistence_score:
      unavailable<SearchNormalizedScore>(
        reason,
      ),

    anchor_persistence_score:
      unavailable<SearchNormalizedScore>(
        reason,
      ),

    frequency_trend:
      unavailable<number>(
        reason,
      ),

    convergence_trend:
      unavailable<number>(
        reason,
      ),

    rupture_evolution_state:
      "INSUFFICIENT_HISTORY",

    rupture_events:
      Object.freeze(
        [],
      ),

    temporal_confidence:
      invalidEvidence<SearchConfidenceScore>(
        reason,
      ),

    validation_state:
      "REJECTED",

    degradation_reasons:
      Object.freeze(
        rejectionReasons.length >
          0
          ? [
              ...rejectionReasons,
            ].sort()
          : [
              "TEMPORAL_SIGNALS_INPUT_REJECTED",
            ],
      ),
  });
}

/* ============================================================================
 * 34. OUTPUT ASSERTIONS
 * ----------------------------------------------------------------------------
 * Contract-shape validation only.
 *
 * Exact publication-age/reference consistency is validated privately inside
 * the canonical producer because publication_reference_at is an input
 * dependency and is not part of SearchTemporalSignals.
 * ========================================================================== */

function validateOptionalTrendEvidence(
  evidence:
    SearchOptionalEvidence<number>,
  fieldName:
    string,
): void {
  if (
    evidence
      .availability_state ===
    "AVAILABLE"
  ) {
    assertFiniteNumber(
      evidence.value,
      `${fieldName}.value`,
    );

    if (
      evidence.value <
        -1 ||
      evidence.value >
        1
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
          `Output invariant violation: ${fieldName}.value must be within [-1, 1].`,
      );
    }

    return;
  }

  assertNonEmptyString(
    evidence.reason,
    `${fieldName}.reason`,
  );
}

export function validateSearchTemporalSignalsOutput(
  signals:
    SearchTemporalSignals,
): void {
  assertNonEmptyString(
    signals.document_id,
    "signals.document_id",
  );

  assertValidIsoTimestamp(
    signals.created_at,
    "signals.created_at",
  );

  validateOptionalTimestampEvidence(
    signals.published_at,
    "signals.published_at",
  );

  validateOptionalNonNegativeNumberEvidence(
    signals.publication_age_ms,
    "signals.publication_age_ms",
  );

  if (
    signals
      .published_at
      .availability_state !==
      "AVAILABLE" &&
    signals
      .publication_age_ms
      .availability_state ===
      "AVAILABLE"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Output invariant violation: publication_age_ms cannot be AVAILABLE when published_at is unavailable.",
    );
  }

  if (
    !Number.isInteger(
      signals
        .observation_count,
    ) ||
    signals
      .observation_count <
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Output invariant violation: observation_count must be a non-negative integer.",
    );
  }

  validateOptionalNormalizedEvidence(
    signals.temporal_confidence,
    "signals.temporal_confidence",
  );

  validateOptionalNormalizedEvidence(
    signals
      .signal_persistence_score,
    "signals.signal_persistence_score",
  );

  validateOptionalNormalizedEvidence(
    signals
      .anchor_persistence_score,
    "signals.anchor_persistence_score",
  );

  validateOptionalTrendEvidence(
    signals
      .frequency_trend,
    "signals.frequency_trend",
  );

  validateOptionalTrendEvidence(
    signals
      .convergence_trend,
    "signals.convergence_trend",
  );

  validateOptionalTimestampEvidence(
    signals.first_observed_at,
    "signals.first_observed_at",
  );

  validateOptionalTimestampEvidence(
    signals.last_observed_at,
    "signals.last_observed_at",
  );

  if (
    signals
      .first_observed_at
      .availability_state ===
      "AVAILABLE" &&
    signals
      .last_observed_at
      .availability_state ===
      "AVAILABLE" &&
    Date.parse(
      signals
        .first_observed_at
        .value,
    ) >
    Date.parse(
      signals
        .last_observed_at
        .value,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Output invariant violation: first_observed_at cannot be after last_observed_at.",
    );
  }

  for (
    const ruptureEvent of
      signals
        .rupture_events
  ) {
    assertNonEmptyString(
      ruptureEvent
        .observation_id,
      "signals.rupture_events.observation_id",
    );

    assertValidIsoTimestamp(
      ruptureEvent
        .observed_at,
      "signals.rupture_events.observed_at",
    );

    assertNormalizedNumber(
      ruptureEvent
        .severity,
      "signals.rupture_events.severity",
    );

    assertNormalizedNumber(
      ruptureEvent
        .confidence,
      "signals.rupture_events.confidence",
    );

    assertNonEmptyString(
      ruptureEvent
        .explanation,
      "signals.rupture_events.explanation",
    );

    if (
      ruptureEvent
        .rupture_kind ===
      "QUERY_RELEVANCE"
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
          "Output invariant violation: QUERY_RELEVANCE rupture cannot be produced " +
          "inside TEMPORAL_SIGNAL_DETECTION.",
      );
    }
  }

  if (
    signals
      .temporal_state ===
      "UNAVAILABLE" &&
    signals
      .temporal_confidence
      .availability_state ===
      "AVAILABLE"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Output invariant violation: UNAVAILABLE temporal state cannot expose AVAILABLE temporal_confidence.",
    );
  }

  if (
    signals
      .temporal_state !==
      "UNAVAILABLE" &&
    signals
      .validation_state !==
      "REJECTED" &&
    signals
      .temporal_confidence
      .availability_state !==
      "AVAILABLE"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Output invariant violation: non-UNAVAILABLE accepted temporal state requires explicit AVAILABLE temporal_confidence.",
    );
  }

  if (
    signals
      .validation_state ===
      "VALID" &&
    signals
      .degradation_reasons
      .length >
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Output invariant violation: VALID output cannot contain degradation reasons.",
    );
  }

  if (
    signals
      .validation_state ===
      "DEGRADED" &&
    signals
      .degradation_reasons
      .length ===
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Output invariant violation: DEGRADED output must contain degradation reasons.",
    );
  }

  if (
    signals
      .validation_state ===
      "REJECTED" &&
    signals
      .degradation_reasons
      .length ===
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_CORE_MODULE_NAME}] ` +
        "Output invariant violation: REJECTED output must contain rejection reasons.",
    );
  }
}

/* ============================================================================
 * 35. CANONICAL PRODUCER
 * ========================================================================== */

export function buildSearchTemporalSignals(
  input:
    SearchTemporalSignalsSearchInput,
): SearchTemporalSignals {
  const boundaryValidation =
    validateSearchTemporalSignalsSearchInput(
      input,
    );

  if (
    boundaryValidation
      .validation_state ===
    "REJECTED"
  ) {
    const rejected =
      buildRejectedSearchTemporalSignals(
        input,
        boundaryValidation
          .rejection_reasons,
      );

    validateSearchTemporalSignalsOutput(
      rejected,
    );

    return rejected;
  }

  /*
   * Upstream source publication truth is transported unchanged.
   */
  const publishedAt =
    input.published_at;

  /*
   * Canonical temporal calculation.
   *
   * IMPORTANT:
   * created_at is deliberately not involved.
   */
  const publicationAgeMs =
    computePublicationAgeMs(
      publishedAt,
      input.publication_reference_at,
    );

  assertPublicationAgeMatchesReference(
    publishedAt,
    publicationAgeMs,
    input.publication_reference_at,
  );

  const observations =
    sortObservations(
      input,
    );

  const pairs =
    buildComparablePairs(
      observations,
    );

  const temporalState =
    resolveTemporalState(
      observations,
      input.policy,
    );

  const firstObservedAt =
    resolveFirstObservedAt(
      observations,
    );

  const lastObservedAt =
    resolveLastObservedAt(
      observations,
    );

  const signalPersistence =
    computeSignalPersistenceScore(
      pairs,
      input.policy,
    );

  const anchorPersistence =
    computePersistenceScore(
      pairs,

      (
        observation,
      ) =>
        observation
          .anchor_structure_value,

      "ANCHOR_PERSISTENCE_UNAVAILABLE:NO_COMPARABLE_ANCHOR_HISTORY",

      input.policy,
    );

  const frequencyTrendCalculation =
    computeNormalizedTemporalTrend(
      observations,

      (
        observation,
      ) =>
        observation
          .frequency_structure_value,

      "FREQUENCY_TREND_UNAVAILABLE:INSUFFICIENT_COMPARABLE_HISTORY",

      input.policy,
    );

  const convergenceTrendCalculation =
    computeNormalizedTemporalTrend(
      observations,

      (
        observation,
      ) =>
        observation
          .convergence_value,

      "CONVERGENCE_TREND_UNAVAILABLE:INSUFFICIENT_COMPARABLE_HISTORY",

      input.policy,
    );

  const ruptureDetection =
    detectTemporalRuptures(
      pairs,
      input.policy,
    );

  const ruptureEvolutionState =
    resolveRuptureEvolutionState({
      temporal_state:
        temporalState,

      pair_rupture_severities:
        ruptureDetection
          .pair_rupture_severities,

      policy:
        input.policy,
    });

  const temporalConfidence =
    computeTemporalConfidence(
      observations,
      temporalState,
      input.policy,
    );

  const outputValidation =
    resolveOutputValidationState({
      temporal_state:
        temporalState,

      observations,

      published_at:
        publishedAt,

      publication_age_ms:
        publicationAgeMs,

      temporal_confidence:
        temporalConfidence,

      signal_persistence_score:
        signalPersistence
          .evidence,

      anchor_persistence_score:
        anchorPersistence
          .evidence,

      frequency_trend:
        frequencyTrendCalculation
          .evidence,

      convergence_trend:
        convergenceTrendCalculation
          .evidence,
    });

  const signals:
    SearchTemporalSignals =
    Object.freeze({
      contract_version:
        XYVALA_SEARCH_TEMPORAL_SIGNALS_CONTRACT_VERSION,

      /*
       * Producer creation timestamp only.
       */
      created_at:
        input.created_at,

      document_id:
        input.document_id,

      /*
       * Exact upstream source publication evidence.
       */
      published_at:
        publishedAt,

      /*
       * Canonical TEMPORAL_SIGNAL_DETECTION derived truth.
       */
      publication_age_ms:
        publicationAgeMs,

      temporal_state:
        temporalState,

      first_observed_at:
        firstObservedAt,

      last_observed_at:
        lastObservedAt,

      observation_count:
        observations.length,

      signal_persistence_score:
        signalPersistence
          .evidence,

      anchor_persistence_score:
        anchorPersistence
          .evidence,

      frequency_trend:
        frequencyTrendCalculation
          .evidence,

      convergence_trend:
        convergenceTrendCalculation
          .evidence,

      rupture_evolution_state:
        ruptureEvolutionState,

      rupture_events:
        ruptureDetection
          .rupture_events,

      temporal_confidence:
        temporalConfidence,

      validation_state:
        outputValidation
          .validation_state,

      degradation_reasons:
        outputValidation
          .degradation_reasons,
    });

  validateSearchTemporalSignalsOutput(
    signals,
  );

  return signals;
}

/* ============================================================================
 * 36. ACCEPTANCE HELPER
 * ========================================================================== */

export function isSearchTemporalSignalsAccepted(
  signals:
    SearchTemporalSignals,
): boolean {
  return (
    signals
      .validation_state ===
      "VALID" ||
    signals
      .validation_state ===
      "DEGRADED"
  );
}
