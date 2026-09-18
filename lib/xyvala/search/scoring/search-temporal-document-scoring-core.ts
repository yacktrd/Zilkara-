/* ============================================================================
 * FILE: lib/xyvala/search/scoring/search-temporal-document-scoring-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical temporal document scoring core
 *
 * ROLE
 * - consume canonical validated SearchTemporalSignals
 * - calculate canonical temporal correlation and duration sub-scores
 * - preserve explicit availability semantics
 * - preserve upstream temporal-confidence availability without fabricating
 *   missing confidence
 * - produce the canonical SearchTemporalDocumentScoreVector
 * - expose deterministic, traceable and auditable temporal scoring evidence
 *
 * CLASSIFICATION
 * - PRIVATE ANALYTICAL ENGINE
 * - SEARCH DOMAIN
 * - TEMPORAL_DOCUMENT_SCORING
 * - COMPUTE
 * - PURE
 * - DETERMINISTIC
 * - NON-MUTATING
 * - NON-PUBLIC
 * - CANONICAL PRODUCER
 *
 * POSITION IN OFFICIAL PIPELINE
 * ----------------------------------------------------------------------------
 *
 * TEMPORAL_SIGNAL_DETECTION
 *        ↓
 * SearchTemporalSignals
 *        ↓
 * TEMPORAL_DOCUMENT_SCORING
 *        ↓
 * SearchTemporalDocumentScoreVector
 *        ↓
 * POSITIVE_SCORE_ASSEMBLY
 *
 * TEMPORAL PUBLICATION LINEAGE
 * ----------------------------------------------------------------------------
 *
 * search.acquisition.source_published_at
 *        ↓ Reference / governed temporal input
 * search.temporal.published_at
 *        ↓
 * search.temporal.publication_age_ms
 *
 * This scorer:
 * - may validate these canonical temporal fields structurally;
 * - does NOT produce them;
 * - does NOT normalize publication dates;
 * - does NOT calculate publication_age_ms;
 * - does NOT substitute fetched_at for published_at;
 * - does NOT convert missing publication evidence into zero age.
 *
 * CONFIDENCE GOVERNANCE
 * ----------------------------------------------------------------------------
 *
 * SearchTemporalSignals.temporal_confidence uses explicit availability.
 *
 * AVAILABLE(0)
 * - canonical Temporal confidence exists and equals zero.
 *
 * non-AVAILABLE
 * - no canonical Temporal confidence exists.
 *
 * Therefore this scorer must never perform:
 *
 * temporal_confidence unavailable
 * -> 0
 *
 * The scorer may produce its own SearchSubScore.confidence from the evidence
 * it canonically owns at this layer, but unavailable upstream confidence is:
 *
 * - excluded from confidence arithmetic;
 * - recorded in missing_data;
 * - reflected through explicit degradation.
 *
 * It is never inserted as a synthetic numerical contribution.
 *
 * POLICY GOVERNANCE
 * ----------------------------------------------------------------------------
 *
 * The active policy must be supplied explicitly.
 *
 * Policy selection belongs to the authorized Producer Adapter / runtime
 * composition boundary.
 *
 * This core does NOT:
 * - select a runtime policy;
 * - infer a missing policy;
 * - silently activate a fallback policy.
 *
 * DEFAULT_XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_POLICY remains exported as a
 * compatibility / explicit policy preset only.
 *
 * Merely omitting policy from compute input never activates it.
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - Search Pipeline Contract 2.1
 * - SearchTemporalSignals
 * - SearchTemporalDocumentScoreVector
 * - SearchSubScore
 * - SearchOptionalEvidence
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage Registry
 * - Boundary Protection System
 * - Compute / Observe / Mutate Separation
 *
 * CONSUMERS
 * - Xyvala Search Positive Score Assembler
 * - Xyvala Search Runtime Producer Adapter
 * - Xyvala Search Private Snapshot Builder
 * - Xyvala Search traceability
 * - Xyvala Search integration tests
 *
 * DIRECTIVES
 * - temporal documentary scoring only
 * - explicit scoring policy
 * - deterministic output for identical inputs and policy
 * - no historical observation reconstruction
 * - no publication timestamp reconstruction
 * - no publication age reconstruction
 * - no rupture-event reconstruction
 * - no intrinsic lexical scoring
 * - no query-relative scoring
 * - no link authority scoring
 * - no behavioral calibration scoring
 * - no penalty evaluation
 * - no positive score assembly
 * - no global aggregation
 * - no cohort normalization
 * - no ranking
 * - no private decision
 * - no persistence
 * - no runtime mutation
 * - no runtime clock
 * - no implicit timestamp
 * - no unavailable-to-zero conversion
 * - no unavailable-to-neutral conversion
 * - no fabricated temporal confidence
 *
 * INPUTS
 * - SearchTemporalSignals
 * - explicit SearchTemporalDocumentScoringPolicy
 * - explicit deterministic creation timestamp
 *
 * OUTPUTS
 * - SearchTemporalDocumentScoreVector
 *
 * INVARIANTS
 * - temporal evidence is never reconstructed
 * - unavailable evidence is excluded and explicitly reported
 * - AVAILABLE(0) remains distinguishable from unavailable
 * - temporal_confidence unavailable never participates numerically
 * - publication_age_ms is never recalculated here
 * - published_at is never reconstructed here
 * - every produced score is normalized between zero and one
 * - every produced sub-score confidence is normalized between zero and one
 * - every score identifies its canonical source features
 * - correlation_score belongs only to TEMPORAL_DOCUMENT_SCORING
 * - duration_score belongs only to TEMPORAL_DOCUMENT_SCORING
 * - temporal rupture events are read but never modified
 * - no input contract is mutated
 * - no runtime clock is read
 * - no random value is generated
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 *
 * SearchTemporalSignals.temporal_confidence treated as number
 * => Search 2.1 explicit-availability migration boundary
 *
 * missing temporal confidence converted to zero
 * => Missing Data Explicitness / VLR violation
 *
 * publication_age_ms recalculated here
 * => TEMPORAL_SIGNAL_DETECTION ownership violation
 *
 * published_at reconstructed here
 * => temporal lineage violation
 *
 * policy omitted and silently defaulted
 * => runtime policy-ownership violation
 * ========================================================================== */

import type {
  SearchConfidenceScore,
  SearchContractVersion,
  SearchCount,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchNormalizedScore,
  SearchOptionalEvidence,
  SearchPolicyVersion,
  SearchRuptureEvolutionState,
  SearchSubScore,
  SearchTemporalDocumentScoreVector,
  SearchTemporalSignals,
  SearchValidationState,
  SearchWeight,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME =
  "xyvala-search-temporal-document-scoring-core" as const;

export const XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

export const XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_CONTRACT_VERSION:
  SearchContractVersion =
    "2.0.0";

export const XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_POLICY_VERSION:
  SearchPolicyVersion =
    "1.0.0";

/* ============================================================================
 * 2. POLICY CONTRACT
 * ----------------------------------------------------------------------------
 * Policy governs TEMPORAL_DOCUMENT_SCORING only.
 *
 * It does not govern:
 * - temporal signal production;
 * - publication-time production;
 * - rupture detection;
 * - penalties;
 * - aggregation;
 * - cohort evaluation;
 * - private decisions.
 * ========================================================================== */

export interface SearchTemporalDocumentScoringPolicy {
  readonly policy_version:
    SearchPolicyVersion;

  /* --------------------------------------------------------------------------
   * Correlation score
   * ----------------------------------------------------------------------- */

  readonly frequency_convergence_alignment_weight:
    SearchWeight;

  readonly persistence_alignment_weight:
    SearchWeight;

  readonly rupture_evolution_coherence_weight:
    SearchWeight;

  /* --------------------------------------------------------------------------
   * Duration score
   * ----------------------------------------------------------------------- */

  readonly observation_count_weight:
    SearchWeight;

  readonly observation_span_weight:
    SearchWeight;

  readonly signal_persistence_weight:
    SearchWeight;

  readonly anchor_persistence_weight:
    SearchWeight;

  /* --------------------------------------------------------------------------
   * Evidence targets
   * ----------------------------------------------------------------------- */

  readonly full_confidence_observation_count:
    SearchCount;

  readonly full_confidence_observation_span_days:
    number;

  readonly minimum_trend_magnitude:
    number;

  /* --------------------------------------------------------------------------
   * Explicit degradation policy
   * ----------------------------------------------------------------------- */

  readonly partial_evidence_confidence_factor:
    SearchConfidenceScore;

  readonly insufficient_history_confidence_cap:
    SearchConfidenceScore;
}

/* ============================================================================
 * 2.1. EXPLICIT POLICY PRESET
 * ----------------------------------------------------------------------------
 * Compatibility / configuration export only.
 *
 * CRITICAL:
 * This value is never selected implicitly by the canonical producer.
 *
 * An authorized Producer Adapter may explicitly select and inject it.
 * ========================================================================== */

export const DEFAULT_XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_POLICY:
  SearchTemporalDocumentScoringPolicy =
  Object.freeze({
    policy_version:
      XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_POLICY_VERSION,

    frequency_convergence_alignment_weight:
      0.45,

    persistence_alignment_weight:
      0.3,

    rupture_evolution_coherence_weight:
      0.25,

    observation_count_weight:
      0.25,

    observation_span_weight:
      0.25,

    signal_persistence_weight:
      0.3,

    anchor_persistence_weight:
      0.2,

    full_confidence_observation_count:
      8,

    full_confidence_observation_span_days:
      30,

    minimum_trend_magnitude:
      0.01,

    partial_evidence_confidence_factor:
      0.85,

    insufficient_history_confidence_cap:
      0.35,
  });

/* ============================================================================
 * 3. INPUT CONTRACT
 * ----------------------------------------------------------------------------
 * Policy is mandatory at this boundary.
 *
 * Runtime Producer Adapters own policy selection/injection.
 * ========================================================================== */

export interface SearchTemporalDocumentScoringInput {
  readonly temporal_signals:
    SearchTemporalSignals;

  /**
   * Explicit deterministic scoring timestamp.
   *
   * The scorer never reads the runtime clock.
   */
  readonly created_at:
    SearchIsoTimestamp;

  readonly policy:
    SearchTemporalDocumentScoringPolicy;
}

/* ============================================================================
 * 4. INTERNAL CONTRACTS
 * ========================================================================== */

interface SearchAvailableNumericEvidence {
  readonly source_feature:
    string;

  readonly value:
    number;

  readonly weight:
    SearchWeight;
}

interface SearchWeightedConfidenceEvidence {
  readonly source_feature:
    string;

  readonly value:
    SearchConfidenceScore;

  readonly weight:
    SearchWeight;
}

interface SearchTemporalScoreCalculation {
  readonly value:
    SearchNormalizedScore;

  readonly confidence:
    SearchConfidenceScore;

  readonly source_features:
    readonly string[];

  readonly missing_data:
    readonly string[];

  readonly explanation:
    string;

  readonly parameters:
    Readonly<Record<string, unknown>>;
}

/* ============================================================================
 * 5. NUMERIC PRIMITIVES
 * ========================================================================== */

const MILLISECONDS_PER_DAY =
  86_400_000;

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
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: normalized calculation produced a non-finite number.",
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

function ratio(
  numerator:
    number,

  denominator:
    number,

  fieldName:
    string,
): number {
  if (
    !Number.isFinite(
      numerator,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Internal invariant violation: ${fieldName} numerator must be finite.`,
    );
  }

  if (
    !Number.isFinite(
      denominator,
    ) ||
    denominator <=
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Internal invariant violation: ${fieldName} denominator must be finite and positive.`,
    );
  }

  return (
    numerator /
    denominator
  );
}

function normalizeAgainstTarget(
  value:
    number,

  target:
    number,
): SearchNormalizedScore {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: normalization source value must be finite.",
    );
  }

  if (
    !Number.isFinite(
      target,
    ) ||
    target <=
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: normalization target must be finite and positive.",
    );
  }

  return clamp01(
    value /
      target,
  );
}

function weightedMean(
  entries:
    readonly {
      readonly value:
        number;

      readonly weight:
        number;
    }[],
): SearchNormalizedScore {
  if (
    entries.length ===
      0
  ) {
    /*
     * Canonical score semantics:
     *
     * SearchTemporalDocumentScoreVector remains a mandatory producer boundary.
     * Therefore absence of all score evidence is represented by:
     *
     * - score value 0 produced by THIS scorer;
     * - explicit missing_data;
     * - DEGRADED output state.
     *
     * This is not an upstream evidence substitution. No missing upstream
     * variable is materialized as AVAILABLE(0).
     */
    return 0;
  }

  let totalWeight =
    0;

  let weightedTotal =
    0;

  for (
    const [
      index,
      entry,
    ] of entries.entries()
  ) {
    if (
      !Number.isFinite(
        entry.value,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
          `Internal invariant violation: weighted_mean[${String(index)}].value must be finite.`,
      );
    }

    if (
      !Number.isFinite(
        entry.weight,
      ) ||
      entry.weight <
        0
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
          `Internal invariant violation: weighted_mean[${String(index)}].weight must be finite and non-negative.`,
      );
    }

    if (
      entry.weight ===
        0
    ) {
      continue;
    }

    totalWeight +=
      entry.weight;

    weightedTotal +=
      clamp01(
        entry.value,
      ) *
      entry.weight;
  }

  if (
    totalWeight <=
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: weighted mean requires positive effective weight when entries exist.",
    );
  }

  return clamp01(
    weightedTotal /
      totalWeight,
  );
}

function weightedAvailableEvidenceMean(
  evidence:
    readonly SearchAvailableNumericEvidence[],
): SearchNormalizedScore {
  return weightedMean(
    evidence.map(
      (
        entry,
      ) => ({
        value:
          entry.value,

        weight:
          entry.weight,
      }),
    ),
  );
}

function weightedConfidenceMean(
  evidence:
    readonly SearchWeightedConfidenceEvidence[],
): SearchConfidenceScore {
  return weightedMean(
    evidence.map(
      (
        entry,
      ) => ({
        value:
          entry.value,

        weight:
          entry.weight,
      }),
    ),
  );
}

function meanAbsoluteDifferenceScore(
  left:
    number,

  right:
    number,
): SearchNormalizedScore {
  if (
    !Number.isFinite(
      left,
    ) ||
    !Number.isFinite(
      right,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: difference-score inputs must be finite.",
    );
  }

  return clamp01(
    1 -
      Math.min(
        1,
        Math.abs(
          left -
            right,
        ),
      ),
  );
}

/* ============================================================================
 * 6. CONTRACT ASSERTIONS
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
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must not be empty.`,
    );
  }
}

function assertFiniteNonNegativeNumber(
  value:
    number,

  fieldName:
    string,
): void {
  if (
    !Number.isFinite(
      value,
    ) ||
    value <
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a finite non-negative number.`,
    );
  }
}

function assertPositiveNumber(
  value:
    number,

  fieldName:
    string,
): void {
  if (
    !Number.isFinite(
      value,
    ) ||
    value <=
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Policy violation: ${fieldName} must be greater than zero.`,
    );
  }
}

function assertNormalizedNumber(
  value:
    number,

  fieldName:
    string,
): void {
  if (
    !Number.isFinite(
      value,
    ) ||
    value <
      0 ||
    value >
      1
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be between zero and one.`,
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
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be finite.`,
    );
  }
}

function assertWeightGroup(
  weights:
    readonly number[],

  groupName:
    string,
): void {
  for (
    const [
      index,
      weight,
    ] of weights.entries()
  ) {
    assertFiniteNonNegativeNumber(
      weight,
      `${groupName}[${String(index)}]`,
    );
  }

  const totalWeight =
    weights.reduce(
      (
        sum,
        weight,
      ) =>
        sum +
        weight,
      0,
    );

  if (
    totalWeight <=
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Policy violation: ${groupName} must have a positive total weight.`,
    );
  }
}

function parseIsoTimestamp(
  timestamp:
    SearchIsoTimestamp,

  fieldName:
    string,
): number {
  assertNonEmptyString(
    timestamp,
    fieldName,
  );

  const parsedTimestamp =
    Date.parse(
      timestamp,
    );

  if (
    !Number.isFinite(
      parsedTimestamp,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a valid ISO timestamp.`,
    );
  }

  return parsedTimestamp;
}

/* ============================================================================
 * 7. POLICY VALIDATION
 * ========================================================================== */

function validatePolicy(
  policy:
    SearchTemporalDocumentScoringPolicy,
): void {
  assertNonEmptyString(
    policy.policy_version,
    "policy.policy_version",
  );

  assertWeightGroup(
    [
      policy
        .frequency_convergence_alignment_weight,

      policy
        .persistence_alignment_weight,

      policy
        .rupture_evolution_coherence_weight,
    ],
    "policy.correlation_score_weights",
  );

  assertWeightGroup(
    [
      policy
        .observation_count_weight,

      policy
        .observation_span_weight,

      policy
        .signal_persistence_weight,

      policy
        .anchor_persistence_weight,
    ],
    "policy.duration_score_weights",
  );

  assertPositiveNumber(
    policy
      .full_confidence_observation_count,
    "policy.full_confidence_observation_count",
  );

  assertPositiveNumber(
    policy
      .full_confidence_observation_span_days,
    "policy.full_confidence_observation_span_days",
  );

  assertFiniteNonNegativeNumber(
    policy.minimum_trend_magnitude,
    "policy.minimum_trend_magnitude",
  );

  assertNormalizedNumber(
    policy
      .partial_evidence_confidence_factor,
    "policy.partial_evidence_confidence_factor",
  );

  assertNormalizedNumber(
    policy
      .insufficient_history_confidence_cap,
    "policy.insufficient_history_confidence_cap",
  );
}

/* ============================================================================
 * 8. OPTIONAL EVIDENCE VALIDATION
 * ========================================================================== */

function validateOptionalNormalizedEvidence(
  evidence:
    SearchOptionalEvidence<SearchNormalizedScore>,

  fieldName:
    string,
): void {
  if (
    evidence.availability_state ===
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

function validateOptionalNumericEvidence(
  evidence:
    SearchOptionalEvidence<number>,

  fieldName:
    string,
): void {
  if (
    evidence.availability_state ===
      "AVAILABLE"
  ) {
    assertFiniteNumber(
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

function validateOptionalNonNegativeNumericEvidence(
  evidence:
    SearchOptionalEvidence<number>,

  fieldName:
    string,
): void {
  if (
    evidence.availability_state ===
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

function validateOptionalTimestampEvidence(
  evidence:
    SearchOptionalEvidence<SearchIsoTimestamp>,

  fieldName:
    string,
): void {
  if (
    evidence.availability_state ===
      "AVAILABLE"
  ) {
    parseIsoTimestamp(
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
 * 9. TEMPORAL CONTRACT VALIDATION
 * ----------------------------------------------------------------------------
 * This boundary validates canonical Temporal truth.
 *
 * It does not repair or reconstruct it.
 * ========================================================================== */

function validateTemporalSignals(
  temporalSignals:
    SearchTemporalSignals,
): void {
  assertNonEmptyString(
    temporalSignals.contract_version,
    "temporal_signals.contract_version",
  );

  parseIsoTimestamp(
    temporalSignals.created_at,
    "temporal_signals.created_at",
  );

  assertNonEmptyString(
    temporalSignals.document_id,
    "temporal_signals.document_id",
  );

  assertFiniteNonNegativeNumber(
    temporalSignals.observation_count,
    "temporal_signals.observation_count",
  );

  /* --------------------------------------------------------------------------
   * Search 2.1 publication lineage
   *
   * Validation only.
   *
   * No age or timestamp is reconstructed here.
   * ----------------------------------------------------------------------- */

  validateOptionalTimestampEvidence(
    temporalSignals.published_at,
    "temporal_signals.published_at",
  );

  validateOptionalNonNegativeNumericEvidence(
    temporalSignals.publication_age_ms,
    "temporal_signals.publication_age_ms",
  );

  /* --------------------------------------------------------------------------
   * Search 2.1 explicit temporal-confidence availability
   * ----------------------------------------------------------------------- */

  validateOptionalNormalizedEvidence(
    temporalSignals.temporal_confidence,
    "temporal_signals.temporal_confidence",
  );

  validateOptionalTimestampEvidence(
    temporalSignals.first_observed_at,
    "temporal_signals.first_observed_at",
  );

  validateOptionalTimestampEvidence(
    temporalSignals.last_observed_at,
    "temporal_signals.last_observed_at",
  );

  validateOptionalNormalizedEvidence(
    temporalSignals.signal_persistence_score,
    "temporal_signals.signal_persistence_score",
  );

  validateOptionalNormalizedEvidence(
    temporalSignals.anchor_persistence_score,
    "temporal_signals.anchor_persistence_score",
  );

  validateOptionalNumericEvidence(
    temporalSignals.frequency_trend,
    "temporal_signals.frequency_trend",
  );

  validateOptionalNumericEvidence(
    temporalSignals.convergence_trend,
    "temporal_signals.convergence_trend",
  );

  for (
    const ruptureEvent of
    temporalSignals.rupture_events
  ) {
    assertNonEmptyString(
      ruptureEvent.observation_id,
      "temporal_signals.rupture_events.observation_id",
    );

    parseIsoTimestamp(
      ruptureEvent.observed_at,
      `temporal_signals.rupture_events.${ruptureEvent.observation_id}.observed_at`,
    );

    assertNormalizedNumber(
      ruptureEvent.severity,
      `temporal_signals.rupture_events.${ruptureEvent.observation_id}.severity`,
    );

    assertNormalizedNumber(
      ruptureEvent.confidence,
      `temporal_signals.rupture_events.${ruptureEvent.observation_id}.confidence`,
    );

    assertNonEmptyString(
      ruptureEvent.explanation,
      `temporal_signals.rupture_events.${ruptureEvent.observation_id}.explanation`,
    );
  }

  const firstObservedAvailable =
    temporalSignals
      .first_observed_at
      .availability_state ===
    "AVAILABLE";

  const lastObservedAvailable =
    temporalSignals
      .last_observed_at
      .availability_state ===
    "AVAILABLE";

  if (
    firstObservedAvailable !==
    lastObservedAvailable
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Contract violation: first_observed_at and last_observed_at must be jointly available or jointly unavailable.",
    );
  }

  if (
    temporalSignals
      .first_observed_at
      .availability_state ===
      "AVAILABLE" &&
    temporalSignals
      .last_observed_at
      .availability_state ===
      "AVAILABLE"
  ) {
    const firstTimestamp =
      parseIsoTimestamp(
        temporalSignals
          .first_observed_at
          .value,
        "temporal_signals.first_observed_at.value",
      );

    const lastTimestamp =
      parseIsoTimestamp(
        temporalSignals
          .last_observed_at
          .value,
        "temporal_signals.last_observed_at.value",
      );

    if (
      lastTimestamp <
        firstTimestamp
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
          "Contract violation: last_observed_at cannot precede first_observed_at.",
      );
    }
  }

  if (
    temporalSignals.temporal_state ===
      "CALIBRATED" &&
    temporalSignals.observation_count ===
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Contract violation: CALIBRATED temporal state requires at least one observation.",
    );
  }
}

function validateInputContracts(
  input:
    SearchTemporalDocumentScoringInput,
): void {
  parseIsoTimestamp(
    input.created_at,
    "created_at",
  );

  validatePolicy(
    input.policy,
  );

  validateTemporalSignals(
    input.temporal_signals,
  );
}

/* ============================================================================
 * 10. VALIDATION-STATE GOVERNANCE
 * ========================================================================== */

function validationStateConfidence(
  validationState:
    SearchValidationState,
): SearchConfidenceScore {
  switch (
    validationState
  ) {
    case "VALID":
      return 1;

    case "DEGRADED":
      return 0.65;

    case "UNVALIDATED":
      return 0.35;

    case "REJECTED":
      throw new Error(
        `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
          "Internal invariant violation: rejected Temporal signals cannot produce scoring confidence.",
      );
  }
}

function assertInputNotRejected(
  temporalSignals:
    SearchTemporalSignals,
): void {
  if (
    temporalSignals.validation_state ===
      "REJECTED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Boundary rejection: SearchTemporalSignals has validation_state REJECTED.",
    );
  }
}

/* ============================================================================
 * 11. TREND CORRELATION
 * ----------------------------------------------------------------------------
 * Correlation measures directional and magnitude coherence between canonical
 * frequency and convergence trends.
 *
 * Neither upstream trend is reconstructed.
 * ========================================================================== */

function normalizeTrendMagnitude(
  trend:
    number,
): SearchNormalizedScore {
  assertFiniteNumber(
    trend,
    "trend",
  );

  return clamp01(
    Math.abs(
      trend,
    ),
  );
}

function computeTrendAlignmentScore(args: {
  readonly frequency_trend:
    number;

  readonly convergence_trend:
    number;

  readonly minimum_trend_magnitude:
    number;
}): SearchNormalizedScore {
  const frequencyMagnitude =
    Math.abs(
      args.frequency_trend,
    );

  const convergenceMagnitude =
    Math.abs(
      args.convergence_trend,
    );

  const bothBelowMinimum =
    frequencyMagnitude <
      args.minimum_trend_magnitude &&
    convergenceMagnitude <
      args.minimum_trend_magnitude;

  if (
    bothBelowMinimum
  ) {
    return 1;
  }

  const sameDirection =
    Math.sign(
      args.frequency_trend,
    ) ===
    Math.sign(
      args.convergence_trend,
    );

  const magnitudeSimilarity =
    meanAbsoluteDifferenceScore(
      normalizeTrendMagnitude(
        args.frequency_trend,
      ),
      normalizeTrendMagnitude(
        args.convergence_trend,
      ),
    );

  if (
    sameDirection
  ) {
    return weightedMean([
      {
        value:
          1,

        weight:
          0.6,
      },
      {
        value:
          magnitudeSimilarity,

        weight:
          0.4,
      },
    ]);
  }

  return weightedMean([
    {
      value:
        0,

      weight:
        0.7,
    },
    {
      value:
        magnitudeSimilarity,

      weight:
        0.3,
    },
  ]);
}

/* ============================================================================
 * 12. PERSISTENCE ALIGNMENT
 * ========================================================================== */

function computePersistenceAlignmentScore(
  signalPersistence:
    SearchNormalizedScore,

  anchorPersistence:
    SearchNormalizedScore,
): SearchNormalizedScore {
  const consistency =
    meanAbsoluteDifferenceScore(
      signalPersistence,
      anchorPersistence,
    );

  const sharedStrength =
    Math.min(
      signalPersistence,
      anchorPersistence,
    );

  return weightedMean([
    {
      value:
        consistency,

      weight:
        0.45,
    },
    {
      value:
        sharedStrength,

      weight:
        0.55,
    },
  ]);
}

/* ============================================================================
 * 13. RUPTURE EVOLUTION COHERENCE
 * ----------------------------------------------------------------------------
 * This mapping belongs to temporal document scoring.
 *
 * It qualifies coherence only.
 *
 * It does not:
 * - replace rupture severity;
 * - recreate rupture;
 * - create a penalty;
 * - create Crash truth.
 * ========================================================================== */

function ruptureEvolutionCoherenceScore(
  ruptureEvolutionState:
    SearchRuptureEvolutionState,
): SearchOptionalEvidence<SearchNormalizedScore> {
  switch (
    ruptureEvolutionState
  ) {
    case "NONE":
      return Object.freeze({
        availability_state:
          "AVAILABLE",

        value:
          1,
      });

    case "STABLE":
      return Object.freeze({
        availability_state:
          "AVAILABLE",

        value:
          0.85,
      });

    case "DECLINING":
      return Object.freeze({
        availability_state:
          "AVAILABLE",

        value:
          0.75,
      });

    case "PERSISTENT":
      return Object.freeze({
        availability_state:
          "AVAILABLE",

        value:
          0.45,
      });

    case "GROWING":
      return Object.freeze({
        availability_state:
          "AVAILABLE",

        value:
          0.25,
      });

    case "EXPLOSIVE":
      return Object.freeze({
        availability_state:
          "AVAILABLE",

        value:
          0,
      });

    case "INSUFFICIENT_HISTORY":
      return Object.freeze({
        availability_state:
          "INSUFFICIENT_HISTORY",

        reason:
          "Rupture evolution cannot be qualified without sufficient temporal history.",
      });
  }
}

/* ============================================================================
 * 14. OPTIONAL UPSTREAM CONFIDENCE CONTRIBUTION
 * ----------------------------------------------------------------------------
 * AVAILABLE(0) participates as real canonical zero.
 *
 * Non-AVAILABLE evidence does not participate numerically.
 * ========================================================================== */

function appendTemporalConfidenceEvidence(args: {
  readonly temporal_confidence:
    SearchOptionalEvidence<SearchConfidenceScore>;

  readonly evidence:
    SearchWeightedConfidenceEvidence[];

  readonly missing_data:
    Set<string>;

  readonly weight:
    SearchWeight;
}): void {
  if (
    args.temporal_confidence
      .availability_state ===
      "AVAILABLE"
  ) {
    args.evidence.push(
      Object.freeze({
        source_feature:
          "temporal_signals.temporal_confidence",

        value:
          args.temporal_confidence
            .value,

        weight:
          args.weight,
      }),
    );

    return;
  }

  args.missing_data.add(
    "temporal_signals.temporal_confidence",
  );
}

/* ============================================================================
 * 15. CORRELATION SCORE CALCULATION
 * ========================================================================== */

function calculateCorrelationScore(
  temporalSignals:
    SearchTemporalSignals,

  policy:
    SearchTemporalDocumentScoringPolicy,
): SearchTemporalScoreCalculation {
  const evidence:
    SearchAvailableNumericEvidence[] =
      [];

  const sourceFeatures =
    new Set<string>();

  const missingData =
    new Set<string>();

  /* --------------------------------------------------------------------------
   * Trend alignment
   * ----------------------------------------------------------------------- */

  if (
    temporalSignals
      .frequency_trend
      .availability_state ===
      "AVAILABLE" &&
    temporalSignals
      .convergence_trend
      .availability_state ===
      "AVAILABLE"
  ) {
    evidence.push(
      Object.freeze({
        source_feature:
          "temporal_signals.frequency_trend+convergence_trend",

        value:
          computeTrendAlignmentScore({
            frequency_trend:
              temporalSignals
                .frequency_trend
                .value,

            convergence_trend:
              temporalSignals
                .convergence_trend
                .value,

            minimum_trend_magnitude:
              policy
                .minimum_trend_magnitude,
          }),

        weight:
          policy
            .frequency_convergence_alignment_weight,
      }),
    );

    sourceFeatures.add(
      "temporal_signals.frequency_trend",
    );

    sourceFeatures.add(
      "temporal_signals.convergence_trend",
    );
  } else {
    if (
      temporalSignals
        .frequency_trend
        .availability_state !==
        "AVAILABLE"
    ) {
      missingData.add(
        "temporal_signals.frequency_trend",
      );
    }

    if (
      temporalSignals
        .convergence_trend
        .availability_state !==
        "AVAILABLE"
    ) {
      missingData.add(
        "temporal_signals.convergence_trend",
      );
    }
  }

  /* --------------------------------------------------------------------------
   * Persistence alignment
   * ----------------------------------------------------------------------- */

  if (
    temporalSignals
      .signal_persistence_score
      .availability_state ===
      "AVAILABLE" &&
    temporalSignals
      .anchor_persistence_score
      .availability_state ===
      "AVAILABLE"
  ) {
    evidence.push(
      Object.freeze({
        source_feature:
          "temporal_signals.signal_persistence_score+anchor_persistence_score",

        value:
          computePersistenceAlignmentScore(
            temporalSignals
              .signal_persistence_score
              .value,

            temporalSignals
              .anchor_persistence_score
              .value,
          ),

        weight:
          policy
            .persistence_alignment_weight,
      }),
    );

    sourceFeatures.add(
      "temporal_signals.signal_persistence_score",
    );

    sourceFeatures.add(
      "temporal_signals.anchor_persistence_score",
    );
  } else {
    if (
      temporalSignals
        .signal_persistence_score
        .availability_state !==
        "AVAILABLE"
    ) {
      missingData.add(
        "temporal_signals.signal_persistence_score",
      );
    }

    if (
      temporalSignals
        .anchor_persistence_score
        .availability_state !==
        "AVAILABLE"
    ) {
      missingData.add(
        "temporal_signals.anchor_persistence_score",
      );
    }
  }

  /* --------------------------------------------------------------------------
   * Rupture evolution
   * ----------------------------------------------------------------------- */

  const ruptureCoherenceEvidence =
    ruptureEvolutionCoherenceScore(
      temporalSignals
        .rupture_evolution_state,
    );

  if (
    ruptureCoherenceEvidence
      .availability_state ===
      "AVAILABLE"
  ) {
    evidence.push(
      Object.freeze({
        source_feature:
          "temporal_signals.rupture_evolution_state",

        value:
          ruptureCoherenceEvidence
            .value,

        weight:
          policy
            .rupture_evolution_coherence_weight,
      }),
    );

    sourceFeatures.add(
      "temporal_signals.rupture_evolution_state",
    );
  } else {
    missingData.add(
      "temporal_signals.rupture_evolution_state",
    );
  }

  /* --------------------------------------------------------------------------
   * Canonical score value
   * ----------------------------------------------------------------------- */

  const value =
    weightedAvailableEvidenceMean(
      evidence,
    );

  const requestedEvidenceWeight =
    policy
      .frequency_convergence_alignment_weight +
    policy
      .persistence_alignment_weight +
    policy
      .rupture_evolution_coherence_weight;

  const availableEvidenceWeight =
    evidence.reduce(
      (
        sum,
        item,
      ) =>
        sum +
        item.weight,
      0,
    );

  const evidenceAvailabilityRatio =
    clamp01(
      ratio(
        availableEvidenceWeight,
        requestedEvidenceWeight,
        "correlation_evidence_availability_ratio",
      ),
    );

  const observationConfidence =
    normalizeAgainstTarget(
      temporalSignals
        .observation_count,

      policy
        .full_confidence_observation_count,
    );

  const contractConfidence =
    validationStateConfidence(
      temporalSignals
        .validation_state,
    );

  /* --------------------------------------------------------------------------
   * Confidence evidence
   *
   * IMPORTANT:
   * temporal_confidence is added only when AVAILABLE.
   *
   * Its absence never contributes numeric zero.
   * ----------------------------------------------------------------------- */

  const confidenceEvidence:
    SearchWeightedConfidenceEvidence[] =
      [
        Object.freeze({
          source_feature:
            "scoring.evidence_availability_ratio",

          value:
            evidenceAvailabilityRatio,

          weight:
            0.4,
        }),

        Object.freeze({
          source_feature:
            "temporal_signals.observation_count",

          value:
            observationConfidence,

          weight:
            0.25,
        }),

        Object.freeze({
          source_feature:
            "temporal_signals.validation_state",

          value:
            contractConfidence,

          weight:
            0.15,
        }),
      ];

  appendTemporalConfidenceEvidence({
    temporal_confidence:
      temporalSignals
        .temporal_confidence,

    evidence:
      confidenceEvidence,

    missing_data:
      missingData,

    weight:
      0.2,
  });

  const baseConfidence =
    weightedConfidenceMean(
      confidenceEvidence,
    );

  const partialEvidenceFactor =
    missingData.size >
      0
      ? policy
          .partial_evidence_confidence_factor
      : 1;

  let confidence =
    clamp01(
      baseConfidence *
        partialEvidenceFactor,
    );

  if (
    temporalSignals.temporal_state ===
      "INSUFFICIENT_HISTORY"
  ) {
    confidence =
      Math.min(
        confidence,
        policy
          .insufficient_history_confidence_cap,
      );
  }

  /*
   * CRITICAL — Search 2.1
   *
   * No:
   *
   * temporal_state === "UNAVAILABLE"
   * -> confidence = 0
   *
   * is performed here.
   *
   * Upstream absence remains explicit through missing_data and the resulting
   * DEGRADED vector.
   */

  return Object.freeze({
    value,

    confidence,

    source_features:
      Object.freeze(
        [
          ...sourceFeatures,
        ].sort(),
      ),

    missing_data:
      Object.freeze(
        [
          ...missingData,
        ].sort(),
      ),

    explanation:
      "Measures temporal coherence from canonical frequency/convergence trend alignment, persistence alignment and rupture-evolution coherence without reconstructing temporal history or unavailable confidence.",

    parameters:
      Object.freeze({
        frequency_convergence_alignment_weight:
          policy
            .frequency_convergence_alignment_weight,

        persistence_alignment_weight:
          policy
            .persistence_alignment_weight,

        rupture_evolution_coherence_weight:
          policy
            .rupture_evolution_coherence_weight,

        minimum_trend_magnitude:
          policy
            .minimum_trend_magnitude,

        full_confidence_observation_count:
          policy
            .full_confidence_observation_count,

        missing_evidence_handling:
          "EXCLUDE_AND_RENORMALIZE",

        temporal_confidence_handling:
          "AVAILABLE_ONLY_NO_NUMERICAL_FALLBACK",
      }),
  });
}

/* ============================================================================
 * 16. OBSERVATION SPAN
 * ----------------------------------------------------------------------------
 * Observation span is derived only from canonical Temporal observation
 * boundaries.
 *
 * It is NOT publication_age_ms.
 *
 * It does not consume:
 * - source_published_at;
 * - published_at;
 * - fetched_at.
 * ========================================================================== */

function computeObservationSpanDays(
  temporalSignals:
    SearchTemporalSignals,
): SearchOptionalEvidence<number> {
  if (
    temporalSignals
      .first_observed_at
      .availability_state !==
      "AVAILABLE" ||
    temporalSignals
      .last_observed_at
      .availability_state !==
      "AVAILABLE"
  ) {
    return Object.freeze({
      availability_state:
        temporalSignals
          .temporal_state ===
        "INSUFFICIENT_HISTORY"
          ? "INSUFFICIENT_HISTORY"
          : "UNAVAILABLE",

      reason:
        "Observation span requires both canonical first_observed_at and last_observed_at.",
    });
  }

  const firstTimestamp =
    parseIsoTimestamp(
      temporalSignals
        .first_observed_at
        .value,

      "temporal_signals.first_observed_at.value",
    );

  const lastTimestamp =
    parseIsoTimestamp(
      temporalSignals
        .last_observed_at
        .value,

      "temporal_signals.last_observed_at.value",
    );

  if (
    lastTimestamp <
      firstTimestamp
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Contract violation: canonical observation span cannot be negative.",
    );
  }

  return Object.freeze({
    availability_state:
      "AVAILABLE",

    value:
      (
        lastTimestamp -
        firstTimestamp
      ) /
      MILLISECONDS_PER_DAY,
  });
}

/* ============================================================================
 * 17. DURATION SCORE CALCULATION
 * ----------------------------------------------------------------------------
 * Duration measures maturity and persistence of canonical Temporal evidence.
 *
 * It does NOT calculate publication age.
 * ========================================================================== */

function calculateDurationScore(
  temporalSignals:
    SearchTemporalSignals,

  policy:
    SearchTemporalDocumentScoringPolicy,
): SearchTemporalScoreCalculation {
  const evidence:
    SearchAvailableNumericEvidence[] =
      [];

  const sourceFeatures =
    new Set<string>();

  const missingData =
    new Set<string>();

  /* --------------------------------------------------------------------------
   * Observation count
   * ----------------------------------------------------------------------- */

  evidence.push(
    Object.freeze({
      source_feature:
        "temporal_signals.observation_count",

      value:
        normalizeAgainstTarget(
          temporalSignals
            .observation_count,

          policy
            .full_confidence_observation_count,
        ),

      weight:
        policy
          .observation_count_weight,
    }),
  );

  sourceFeatures.add(
    "temporal_signals.observation_count",
  );

  /* --------------------------------------------------------------------------
   * Observation span
   * ----------------------------------------------------------------------- */

  const observationSpanDays =
    computeObservationSpanDays(
      temporalSignals,
    );

  if (
    observationSpanDays
      .availability_state ===
      "AVAILABLE"
  ) {
    evidence.push(
      Object.freeze({
        source_feature:
          "temporal_signals.first_observed_at+last_observed_at",

        value:
          normalizeAgainstTarget(
            observationSpanDays
              .value,

            policy
              .full_confidence_observation_span_days,
          ),

        weight:
          policy
            .observation_span_weight,
      }),
    );

    sourceFeatures.add(
      "temporal_signals.first_observed_at",
    );

    sourceFeatures.add(
      "temporal_signals.last_observed_at",
    );
  } else {
    missingData.add(
      "temporal_signals.observation_span",
    );
  }

  /* --------------------------------------------------------------------------
   * Signal persistence
   * ----------------------------------------------------------------------- */

  if (
    temporalSignals
      .signal_persistence_score
      .availability_state ===
      "AVAILABLE"
  ) {
    evidence.push(
      Object.freeze({
        source_feature:
          "temporal_signals.signal_persistence_score",

        value:
          temporalSignals
            .signal_persistence_score
            .value,

        weight:
          policy
            .signal_persistence_weight,
      }),
    );

    sourceFeatures.add(
      "temporal_signals.signal_persistence_score",
    );
  } else {
    missingData.add(
      "temporal_signals.signal_persistence_score",
    );
  }

  /* --------------------------------------------------------------------------
   * Anchor persistence
   * ----------------------------------------------------------------------- */

  if (
    temporalSignals
      .anchor_persistence_score
      .availability_state ===
      "AVAILABLE"
  ) {
    evidence.push(
      Object.freeze({
        source_feature:
          "temporal_signals.anchor_persistence_score",

        value:
          temporalSignals
            .anchor_persistence_score
            .value,

        weight:
          policy
            .anchor_persistence_weight,
      }),
    );

    sourceFeatures.add(
      "temporal_signals.anchor_persistence_score",
    );
  } else {
    missingData.add(
      "temporal_signals.anchor_persistence_score",
    );
  }

  /* --------------------------------------------------------------------------
   * Canonical duration score
   * ----------------------------------------------------------------------- */

  const value =
    weightedAvailableEvidenceMean(
      evidence,
    );

  const requestedEvidenceWeight =
    policy
      .observation_count_weight +
    policy
      .observation_span_weight +
    policy
      .signal_persistence_weight +
    policy
      .anchor_persistence_weight;

  const availableEvidenceWeight =
    evidence.reduce(
      (
        sum,
        item,
      ) =>
        sum +
        item.weight,
      0,
    );

  const evidenceAvailabilityRatio =
    clamp01(
      ratio(
        availableEvidenceWeight,
        requestedEvidenceWeight,
        "duration_evidence_availability_ratio",
      ),
    );

  const observationConfidence =
    normalizeAgainstTarget(
      temporalSignals
        .observation_count,

      policy
        .full_confidence_observation_count,
    );

  const contractConfidence =
    validationStateConfidence(
      temporalSignals
        .validation_state,
    );

  const confidenceEvidence:
    SearchWeightedConfidenceEvidence[] =
      [
        Object.freeze({
          source_feature:
            "scoring.evidence_availability_ratio",

          value:
            evidenceAvailabilityRatio,

          weight:
            0.3,
        }),

        Object.freeze({
          source_feature:
            "temporal_signals.observation_count",

          value:
            observationConfidence,

          weight:
            0.25,
        }),

        Object.freeze({
          source_feature:
            "temporal_signals.validation_state",

          value:
            contractConfidence,

          weight:
            0.1,
        }),
      ];

  if (
    observationSpanDays
      .availability_state ===
      "AVAILABLE"
  ) {
    confidenceEvidence.push(
      Object.freeze({
        source_feature:
          "temporal_signals.observation_span",

        value:
          normalizeAgainstTarget(
            observationSpanDays
              .value,

            policy
              .full_confidence_observation_span_days,
          ),

        weight:
          0.2,
      }),
    );
  } else {
    missingData.add(
      "temporal_signals.observation_span_confidence",
    );
  }

  appendTemporalConfidenceEvidence({
    temporal_confidence:
      temporalSignals
        .temporal_confidence,

    evidence:
      confidenceEvidence,

    missing_data:
      missingData,

    weight:
      0.15,
  });

  const baseConfidence =
    weightedConfidenceMean(
      confidenceEvidence,
    );

  const partialEvidenceFactor =
    missingData.size >
      0
      ? policy
          .partial_evidence_confidence_factor
      : 1;

  let confidence =
    clamp01(
      baseConfidence *
        partialEvidenceFactor,
    );

  if (
    temporalSignals.temporal_state ===
      "INSUFFICIENT_HISTORY"
  ) {
    confidence =
      Math.min(
        confidence,
        policy
          .insufficient_history_confidence_cap,
      );
  }

  /*
   * Search 2.1:
   *
   * temporal_state UNAVAILABLE does not automatically become confidence 0.
   *
   * The missing evidence remains explicit and is excluded from arithmetic.
   */

  return Object.freeze({
    value,

    confidence,

    source_features:
      Object.freeze(
        [
          ...sourceFeatures,
        ].sort(),
      ),

    missing_data:
      Object.freeze(
        [
          ...missingData,
        ].sort(),
      ),

    explanation:
      "Measures temporal evidence maturity from canonical observation count, observation span and persistence evidence without reconstructing historical or publication-time truth.",

    parameters:
      Object.freeze({
        observation_count_weight:
          policy
            .observation_count_weight,

        observation_span_weight:
          policy
            .observation_span_weight,

        signal_persistence_weight:
          policy
            .signal_persistence_weight,

        anchor_persistence_weight:
          policy
            .anchor_persistence_weight,

        full_confidence_observation_count:
          policy
            .full_confidence_observation_count,

        full_confidence_observation_span_days:
          policy
            .full_confidence_observation_span_days,

        missing_evidence_handling:
          "EXCLUDE_AND_RENORMALIZE",

        temporal_confidence_handling:
          "AVAILABLE_ONLY_NO_NUMERICAL_FALLBACK",

        publication_age_ms_consumed:
          false,
      }),
  });
}

/* ============================================================================
 * 18. SUB-SCORE BUILDER
 * ========================================================================== */

function buildTemporalSubScore(args: {
  readonly document_id:
    string;

  readonly created_at:
    SearchIsoTimestamp;

  readonly score_name:
    | "correlation_score"
    | "duration_score";

  readonly signal_family:
    | "EVOLUTION"
    | "DURATION";

  readonly overlap_group:
    string;

  readonly method:
    string;

  readonly calculation:
    SearchTemporalScoreCalculation;
}): SearchSubScore {
  assertNonEmptyString(
    args.document_id,
    "sub_score.document_id",
  );

  parseIsoTimestamp(
    args.created_at,
    "sub_score.created_at",
  );

  assertNormalizedNumber(
    args.calculation.value,
    "sub_score.value",
  );

  assertNormalizedNumber(
    args.calculation.confidence,
    "sub_score.confidence",
  );

  return Object.freeze({
    contract_version:
      XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_CONTRACT_VERSION,

    created_at:
      args.created_at,

    document_id:
      args.document_id,

    score_name:
      args.score_name,

    signal_family:
      args.signal_family,

    value:
      args.calculation
        .value,

    confidence:
      args.calculation
        .confidence,

    source_features:
      Object.freeze([
        ...args
          .calculation
          .source_features,
      ]),

    overlap_group:
      args.overlap_group,

    method:
      args.method,

    module_name:
      XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_VERSION,

    parameters:
      Object.freeze({
        ...args
          .calculation
          .parameters,
      }),

    missing_data:
      Object.freeze([
        ...args
          .calculation
          .missing_data,
      ]),

    explanation:
      args.calculation
        .explanation,
  });
}

/* ============================================================================
 * 19. OUTPUT VALIDATION STATE
 * ========================================================================== */

function resolveOutputValidationState(args: {
  readonly temporal_signals:
    SearchTemporalSignals;

  readonly correlation_score:
    SearchSubScore;

  readonly duration_score:
    SearchSubScore;
}): SearchValidationState {
  if (
    args.temporal_signals
      .validation_state ===
      "REJECTED"
  ) {
    return "REJECTED";
  }

  if (
    args.temporal_signals
      .temporal_state ===
      "UNAVAILABLE"
  ) {
    return "DEGRADED";
  }

  if (
    args.temporal_signals
      .validation_state ===
      "DEGRADED" ||
    args.temporal_signals
      .validation_state ===
      "UNVALIDATED" ||
    args.temporal_signals
      .temporal_state ===
      "INSUFFICIENT_HISTORY"
  ) {
    return "DEGRADED";
  }

  if (
    args.temporal_signals
      .temporal_confidence
      .availability_state !==
      "AVAILABLE"
  ) {
    return "DEGRADED";
  }

  if (
    args.correlation_score
      .confidence <
      1 ||
    args.duration_score
      .confidence <
      1 ||
    args.correlation_score
      .missing_data
      .length >
      0 ||
    args.duration_score
      .missing_data
      .length >
      0
  ) {
    return "DEGRADED";
  }

  return "VALID";
}

/* ============================================================================
 * 20. DEGRADATION REASONS
 * ========================================================================== */

function collectDegradationReasons(args: {
  readonly temporal_signals:
    SearchTemporalSignals;

  readonly correlation_score:
    SearchSubScore;

  readonly duration_score:
    SearchSubScore;
}): readonly string[] {
  const degradationReasons =
    new Set<string>();

  for (
    const reason of
    args.temporal_signals
      .degradation_reasons
  ) {
    degradationReasons.add(
      `TEMPORAL_SIGNAL_DETECTION:${reason}`,
    );
  }

  if (
    args.temporal_signals
      .temporal_state ===
      "INSUFFICIENT_HISTORY"
  ) {
    degradationReasons.add(
      "TEMPORAL_DOCUMENT_SCORING:INSUFFICIENT_HISTORY",
    );
  }

  if (
    args.temporal_signals
      .temporal_state ===
      "UNAVAILABLE"
  ) {
    degradationReasons.add(
      "TEMPORAL_DOCUMENT_SCORING:TEMPORAL_SIGNALS_UNAVAILABLE",
    );
  }

  if (
    args.temporal_signals
      .temporal_confidence
      .availability_state !==
      "AVAILABLE"
  ) {
    degradationReasons.add(
      `TEMPORAL_DOCUMENT_SCORING:TEMPORAL_CONFIDENCE:${args.temporal_signals.temporal_confidence.availability_state}`,
    );
  }

  for (
    const missingData of
    args.correlation_score
      .missing_data
  ) {
    degradationReasons.add(
      `TEMPORAL_DOCUMENT_SCORING:correlation_score:${missingData}`,
    );
  }

  for (
    const missingData of
    args.duration_score
      .missing_data
  ) {
    degradationReasons.add(
      `TEMPORAL_DOCUMENT_SCORING:duration_score:${missingData}`,
    );
  }

  return Object.freeze(
    [
      ...degradationReasons,
    ].sort(),
  );
}

/* ============================================================================
 * 21. OUTPUT VALIDATION
 * ----------------------------------------------------------------------------
 * Producer-owned output validation only.
 * ========================================================================== */

function validateTemporalScoreVectorOutput(
  vector:
    SearchTemporalDocumentScoreVector,
): void {
  assertNonEmptyString(
    vector.contract_version,
    "vector.contract_version",
  );

  parseIsoTimestamp(
    vector.created_at,
    "vector.created_at",
  );

  assertNonEmptyString(
    vector.document_id,
    "vector.document_id",
  );

  if (
    vector.correlation_score
      .document_id !==
      vector.document_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: correlation_score changed canonical document identity.",
    );
  }

  if (
    vector.duration_score
      .document_id !==
      vector.document_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: duration_score changed canonical document identity.",
    );
  }

  if (
    vector.correlation_score
      .score_name !==
      "correlation_score"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: correlation score identity is invalid.",
    );
  }

  if (
    vector.duration_score
      .score_name !==
      "duration_score"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: duration score identity is invalid.",
    );
  }

  assertNormalizedNumber(
    vector.correlation_score
      .value,
    "vector.correlation_score.value",
  );

  assertNormalizedNumber(
    vector.duration_score
      .value,
    "vector.duration_score.value",
  );

  assertNormalizedNumber(
    vector.correlation_score
      .confidence,
    "vector.correlation_score.confidence",
  );

  assertNormalizedNumber(
    vector.duration_score
      .confidence,
    "vector.duration_score.confidence",
  );

  if (
    vector.scorer_module_version !==
      XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_VERSION
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: scorer module version diverges from canonical producer version.",
    );
  }

  assertNonEmptyString(
    vector.scoring_policy_version,
    "vector.scoring_policy_version",
  );

  if (
    vector.validation_state ===
      "REJECTED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: rejected Temporal input must not produce a canonical score vector.",
    );
  }

  if (
    vector.validation_state ===
      "VALID" &&
    vector.degradation_reasons
      .length >
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: VALID temporal score vector cannot contain degradation reasons.",
    );
  }

  if (
    vector.validation_state ===
      "DEGRADED" &&
    vector.degradation_reasons
      .length ===
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: DEGRADED temporal score vector requires explicit degradation reasons.",
    );
  }
}

/* ============================================================================
 * 22. CANONICAL PRODUCER
 * ----------------------------------------------------------------------------
 * Pure deterministic computation.
 *
 * The active policy must already have been selected by an authorized
 * Producer Adapter / composition boundary.
 *
 * This core performs no policy fallback.
 * ========================================================================== */

export function computeSearchTemporalDocumentScoreVector(
  input:
    SearchTemporalDocumentScoringInput,
): SearchTemporalDocumentScoreVector {
  validateInputContracts(
    input,
  );

  assertInputNotRejected(
    input.temporal_signals,
  );

  const policy =
    input.policy;

  const correlationCalculation =
    calculateCorrelationScore(
      input.temporal_signals,
      policy,
    );

  const durationCalculation =
    calculateDurationScore(
      input.temporal_signals,
      policy,
    );

  const correlationScore =
    buildTemporalSubScore({
      document_id:
        input.temporal_signals
          .document_id,

      created_at:
        input.created_at,

      score_name:
        "correlation_score",

      signal_family:
        "EVOLUTION",

      overlap_group:
        "temporal_evolution_coherence",

      method:
        "weighted_trend_persistence_and_rupture_evolution_coherence",

      calculation:
        correlationCalculation,
    });

  const durationScore =
    buildTemporalSubScore({
      document_id:
        input.temporal_signals
          .document_id,

      created_at:
        input.created_at,

      score_name:
        "duration_score",

      signal_family:
        "DURATION",

      overlap_group:
        "temporal_persistence_duration",

      method:
        "weighted_observation_span_count_and_persistence",

      calculation:
        durationCalculation,
    });

  const validationState =
    resolveOutputValidationState({
      temporal_signals:
        input.temporal_signals,

      correlation_score:
        correlationScore,

      duration_score:
        durationScore,
    });

  const degradationReasons =
    collectDegradationReasons({
      temporal_signals:
        input.temporal_signals,

      correlation_score:
        correlationScore,

      duration_score:
        durationScore,
    });

  const vector:
    SearchTemporalDocumentScoreVector =
    Object.freeze({
      contract_version:
        XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_CONTRACT_VERSION,

      created_at:
        input.created_at,

      document_id:
        input.temporal_signals
          .document_id,

      correlation_score:
        correlationScore,

      duration_score:
        durationScore,

      scorer_module_version:
        XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_MODULE_VERSION,

      scoring_policy_version:
        policy.policy_version,

      validation_state:
        validationState,

      degradation_reasons:
        degradationReasons,
    });

  validateTemporalScoreVectorOutput(
    vector,
  );

  return vector;
}

/* ============================================================================
 * 23. ACCEPTANCE GUARD
 * ----------------------------------------------------------------------------
 * Pure reader.
 *
 * No repair, mutation or fallback.
 * ========================================================================== */

export function isSearchTemporalDocumentScoreVectorAccepted(
  vector:
    SearchTemporalDocumentScoreVector,
): boolean {
  try {
    validateTemporalScoreVectorOutput(
      vector,
    );

    return (
      vector.validation_state ===
        "VALID" ||
      vector.validation_state ===
        "DEGRADED"
    );
  } catch {
    return false;
  }
}
