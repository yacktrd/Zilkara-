/* ============================================================================
 * FILE: lib/xyvala/search/scoring/search-document-scoring-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical intrinsic document scoring core
 *
 * ROLE
 * - consume validated intrinsic documentary contracts
 * - consume one explicit authorized intrinsic scoring policy
 * - calculate query-independent positive documentary sub-scores
 * - produce the canonical SearchIntrinsicDocumentScoreVector
 * - preserve score identity, analytical family and producer lineage
 * - expose deterministic and auditable intrinsic scoring truth
 *
 * CLASSIFICATION
 * - PRIVATE ANALYTICAL ENGINE
 * - SEARCH DOMAIN
 * - INTRINSIC_DOCUMENT_SCORING
 * - CANONICAL PRODUCER
 * - COMPUTE
 * - PURE
 * - DETERMINISTIC
 * - NON-MUTATING
 * - NON-ORCHESTRATING
 * - NON-PUBLIC
 *
 * POSITION IN OFFICIAL CHAIN
 * ----------------------------------------------------------------------------
 *
 * LEXICAL_ANALYSIS
 * FREQUENCY_SIGNAL_DETECTION
 * ANCHOR_SIGNAL_DETECTION
 * CONTEXT_AGGREGATION
 *          ↓
 * INTRINSIC_DOCUMENT_SCORING
 *          ↓
 * SearchIntrinsicDocumentScoreVector
 *          ↓
 * POSITIVE_SCORE_ASSEMBLY
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchLexicalDocument
 * - SearchFrequencySignals
 * - SearchAnchorSignals
 * - SearchContextAggregation
 * - SearchIntrinsicDocumentScoreVector
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - One Identity Per Analytical Reality
 * - One Source of Truth Per Critical Variable
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 * - Compute / Observe / Mutate Separation
 *
 * CONSUMERS
 * - Xyvala Search positive score assembler
 * - Xyvala Search private snapshot builder
 * - Xyvala Search scoring tests
 * - Xyvala Search calibration datasets
 * - Xyvala Search traceability system
 *
 * POLICY GOVERNANCE
 * ----------------------------------------------------------------------------
 * The active SearchIntrinsicDocumentScoringPolicy is selected outside this
 * COMPUTE module.
 *
 * Authorized flow:
 *
 * policy governance / calibrated configuration
 *              ↓
 * runtime producer adapter
 *              ↓
 * SearchIntrinsicDocumentScoringInput.policy
 *              ↓
 * computeSearchIntrinsicDocumentScoreVector()
 *
 * This core validates and consumes the supplied policy.
 *
 * This core never:
 * - selects the active analytical policy;
 * - activates a default policy because policy is absent;
 * - performs same-query calibration;
 * - mutates policy state;
 * - repairs an invalid policy.
 *
 * A reference policy may remain exported for explicit bootstrap, tests or
 * explicit composition configuration.
 *
 * Its existence does NOT authorize implicit fallback inside COMPUTE.
 *
 * DIRECTIVES
 * - intrinsic documentary scoring only
 * - query-independent computation only
 * - canonical producers only
 * - explicit active policy only
 * - deterministic output for identical inputs and policy
 * - preserve canonical document identity
 * - preserve canonical timestamps
 * - preserve producer validation truth
 * - preserve missing-data declarations
 * - distinguish confidence from validation state
 * - no query relevance calculation
 * - no temporal scoring
 * - no 24H / 7D temporal qualification
 * - no link authority scoring
 * - no behavioral calibration scoring
 * - no positive-score assembly
 * - no penalty evaluation
 * - no analytical aggregation
 * - no eligibility evaluation
 * - no cohort normalization
 * - no relative cohort evaluation
 * - no ranking
 * - no private decision
 * - no calibration execution
 * - no public transformation
 * - no persistence
 * - no runtime mutation
 * - no upstream reconstruction
 * - no downstream reconstruction
 * - no hidden score fallback
 * - no hidden policy fallback
 * - no unavailable evidence reconstruction
 * - no implicit current timestamp
 * - no Date.now()
 * - no new Date()
 * - no random identifier generation
 *
 * INPUTS
 * - SearchLexicalDocument
 * - SearchFrequencySignals
 * - SearchAnchorSignals
 * - SearchContextAggregation
 * - explicit SearchIntrinsicDocumentScoringPolicy
 * - explicit deterministic creation timestamp
 *
 * OUTPUTS
 * - SearchIntrinsicDocumentScoreVector
 *
 * CANONICAL SCORE OWNERSHIP
 * ----------------------------------------------------------------------------
 * lexical_score
 * <- INTRINSIC_DOCUMENT_SCORING
 *
 * anchor_score
 * <- INTRINSIC_DOCUMENT_SCORING
 *
 * occurrence_score
 * <- INTRINSIC_DOCUMENT_SCORING
 *
 * frequency_score
 * <- INTRINSIC_DOCUMENT_SCORING
 *
 * convergence_score
 * <- INTRINSIC_DOCUMENT_SCORING
 *
 * document_quality_score
 * <- INTRINSIC_DOCUMENT_SCORING
 *
 * INVARIANTS
 * - every input belongs to exactly one canonical document
 * - every input contract is VALID or DEGRADED
 * - REJECTED input cannot cross this boundary
 * - UNVALIDATED input cannot cross this boundary
 * - scorer created_at is explicit
 * - scorer created_at cannot predate any consumed producer
 * - every score is normalized between zero and one
 * - every confidence is normalized between zero and one
 * - reduced confidence alone does not redefine validation_state
 * - every score identifies its canonical source features
 * - every score identifies its canonical overlap group
 * - every score remains query-independent
 * - no SearchSubScore receives query_id
 * - no input contract is mutated
 * - no score is inferred from another score
 * - no temporal evidence is reconstructed
 * - no external score is fabricated
 * - no runtime clock is read internally
 * - no random value is generated
 *
 * ZERO SEMANTICS
 * ----------------------------------------------------------------------------
 * A numerical zero produced by this core is permitted only when it is the
 * deterministic result of canonical observed intrinsic evidence.
 *
 * Examples:
 * - canonical token_count === 0;
 * - canonical anchor_count === 0;
 * - canonical selected signal collection is empty.
 *
 * Such cases must also preserve the corresponding missing_data declaration
 * where analytical evidence is incomplete.
 *
 * Non-finite or structurally invalid numerical input is NOT converted to zero.
 * It is rejected at the contract boundary.
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/search/contracts/search-pipeline-contract
 *
 * SENSITIVE AREAS
 * - policy ownership
 * - implicit policy fallback
 * - document identity
 * - temporal causality
 * - score overlap
 * - short-document behavior
 * - vocabulary normalization
 * - anchor convergence weighting
 * - degraded-input confidence
 * - confidence / validation separation
 * - missing-data semantics
 * - document-quality interpretation
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * missing explicit policy
 * => policy-governance / runtime-adapter boundary
 *
 * document identity mismatch
 * => upstream producer propagation boundary
 *
 * REJECTED / UNVALIDATED input
 * => upstream producer validation boundary
 *
 * producer timestamp after scorer timestamp
 * => temporal propagation boundary
 *
 * non-finite analytical input
 * => source contract boundary
 *
 * query identity introduced into intrinsic score
 * => intrinsic/query-relative ownership violation
 *
 * temporal qualification introduced here
 * => TEMPORAL_SIGNAL_DETECTION ownership violation
 *
 * policy selected locally
 * => policy-governance ownership violation
 * ========================================================================== */

import type {
  SearchAnchorSignals,
  SearchConfidenceScore,
  SearchContextAggregation,
  SearchContractVersion,
  SearchCount,
  SearchFrequencySignals,
  SearchIntrinsicDocumentScoreVector,
  SearchIsoTimestamp,
  SearchLexicalDocument,
  SearchModuleVersion,
  SearchNormalizedScore,
  SearchPolicyVersion,
  SearchSubScore,
  SearchValidationState,
  SearchWeight,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME =
  "xyvala-search-document-scoring-core" as const;

export const XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_VERSION:
  SearchModuleVersion =
    "1.1.0";

export const XYVALA_SEARCH_DOCUMENT_SCORING_CONTRACT_VERSION:
  SearchContractVersion =
    "2.0.0";

export const XYVALA_SEARCH_DOCUMENT_SCORING_POLICY_VERSION:
  SearchPolicyVersion =
    "1.0.0";

/* ============================================================================
 * 2. CANONICAL POLICY CONTRACT
 * ----------------------------------------------------------------------------
 * SearchIntrinsicDocumentScoringPolicy is the canonical policy identity of
 * INTRINSIC_DOCUMENT_SCORING.
 *
 * Policy selection remains externally owned.
 * ========================================================================== */

export interface SearchIntrinsicDocumentScoringPolicy {
  readonly policy_version:
    SearchPolicyVersion;

  /**
   * Minimum token volume expected for full lexical confidence.
   */
  readonly lexical_full_confidence_token_count:
    SearchCount;

  /**
   * Minimum vocabulary volume expected for full lexical confidence.
   */
  readonly lexical_full_confidence_vocabulary_size:
    SearchCount;

  /**
   * Token volume considered sufficient for document-quality scoring.
   */
  readonly document_quality_target_token_count:
    SearchCount;

  /**
   * Vocabulary volume considered sufficient for document-quality scoring.
   */
  readonly document_quality_target_vocabulary_size:
    SearchCount;

  /**
   * Minimum number of selected frequency signals expected for full
   * frequency-score confidence.
   */
  readonly frequency_signal_target_count:
    SearchCount;

  /**
   * Minimum number of anchors expected for full anchor confidence.
   */
  readonly anchor_target_count:
    SearchCount;

  /**
   * Minimum number of frequent/rare pair contexts expected for full
   * convergence confidence.
   */
  readonly convergence_pair_target_count:
    SearchCount;

  /* --------------------------------------------------------------------------
   * Lexical score weights
   * ----------------------------------------------------------------------- */

  readonly lexical_diversity_weight:
    SearchWeight;

  readonly lexical_entropy_weight:
    SearchWeight;

  /* --------------------------------------------------------------------------
   * Anchor score weights
   * ----------------------------------------------------------------------- */

  readonly anchor_coverage_weight:
    SearchWeight;

  readonly anchor_dispersion_weight:
    SearchWeight;

  readonly anchor_position_weight:
    SearchWeight;

  /* --------------------------------------------------------------------------
   * Occurrence score weights
   * ----------------------------------------------------------------------- */

  readonly occurrence_frequent_coverage_weight:
    SearchWeight;

  readonly occurrence_rare_coverage_weight:
    SearchWeight;

  readonly occurrence_anchor_coverage_weight:
    SearchWeight;

  /* --------------------------------------------------------------------------
   * Frequency score weights
   * ----------------------------------------------------------------------- */

  readonly frequency_distribution_weight:
    SearchWeight;

  readonly frequency_signal_balance_weight:
    SearchWeight;

  /* --------------------------------------------------------------------------
   * Convergence score weights
   * ----------------------------------------------------------------------- */

  readonly convergence_mean_weight:
    SearchWeight;

  readonly convergence_maximum_weight:
    SearchWeight;

  readonly convergence_pair_weight:
    SearchWeight;

  /* --------------------------------------------------------------------------
   * Document-quality score weights
   * ----------------------------------------------------------------------- */

  readonly document_quality_token_volume_weight:
    SearchWeight;

  readonly document_quality_vocabulary_volume_weight:
    SearchWeight;

  readonly document_quality_information_density_weight:
    SearchWeight;

  readonly document_quality_contract_health_weight:
    SearchWeight;
}

/* ============================================================================
 * 3. EXPLICIT REFERENCE POLICY
 * ----------------------------------------------------------------------------
 * Static reference policy only.
 *
 * It may be explicitly selected by:
 * - composition;
 * - configuration;
 * - calibration bootstrap;
 * - tests.
 *
 * It is NEVER implicitly activated by this core.
 * ========================================================================== */

export const XYVALA_SEARCH_INTRINSIC_DOCUMENT_SCORING_REFERENCE_POLICY:
  SearchIntrinsicDocumentScoringPolicy =
  Object.freeze({
    policy_version:
      XYVALA_SEARCH_DOCUMENT_SCORING_POLICY_VERSION,

    lexical_full_confidence_token_count:
      200,

    lexical_full_confidence_vocabulary_size:
      80,

    document_quality_target_token_count:
      300,

    document_quality_target_vocabulary_size:
      120,

    frequency_signal_target_count:
      10,

    anchor_target_count:
      8,

    convergence_pair_target_count:
      5,

    lexical_diversity_weight:
      0.5,

    lexical_entropy_weight:
      0.5,

    anchor_coverage_weight:
      0.4,

    anchor_dispersion_weight:
      0.35,

    anchor_position_weight:
      0.25,

    occurrence_frequent_coverage_weight:
      0.35,

    occurrence_rare_coverage_weight:
      0.35,

    occurrence_anchor_coverage_weight:
      0.3,

    frequency_distribution_weight:
      0.65,

    frequency_signal_balance_weight:
      0.35,

    convergence_mean_weight:
      0.45,

    convergence_maximum_weight:
      0.2,

    convergence_pair_weight:
      0.35,

    document_quality_token_volume_weight:
      0.25,

    document_quality_vocabulary_volume_weight:
      0.2,

    document_quality_information_density_weight:
      0.35,

    document_quality_contract_health_weight:
      0.2,
  });

/* ============================================================================
 * 4. LEGACY POLICY COMPATIBILITY
 * ----------------------------------------------------------------------------
 * Compatibility aliases only.
 *
 * They introduce no second analytical identity and no second policy object.
 *
 * New runtime code should use:
 * - SearchIntrinsicDocumentScoringPolicy
 * - XYVALA_SEARCH_INTRINSIC_DOCUMENT_SCORING_REFERENCE_POLICY
 * ========================================================================== */

/**
 * @deprecated
 * Use SearchIntrinsicDocumentScoringPolicy.
 */
export type SearchDocumentScoringPolicy =
  SearchIntrinsicDocumentScoringPolicy;

/**
 * @deprecated
 * Explicit compatibility reference only.
 *
 * This constant is NOT consumed as an implicit fallback by the canonical core.
 */
export const DEFAULT_XYVALA_SEARCH_DOCUMENT_SCORING_POLICY =
  XYVALA_SEARCH_INTRINSIC_DOCUMENT_SCORING_REFERENCE_POLICY;

/* ============================================================================
 * 5. CANONICAL INPUT CONTRACT
 * ----------------------------------------------------------------------------
 * The scorer receives only the minimum canonical contracts required by
 * INTRINSIC_DOCUMENT_SCORING.
 *
 * It deliberately does not consume:
 * - SearchScoringInput;
 * - query evidence;
 * - temporal evidence;
 * - link evidence;
 * - behavioral evidence.
 *
 * policy is mandatory.
 * ========================================================================== */

export interface SearchIntrinsicDocumentScoringInput {
  readonly lexical_document:
    SearchLexicalDocument;

  readonly frequency_signals:
    SearchFrequencySignals;

  readonly intrinsic_anchor_signals:
    SearchAnchorSignals;

  readonly context_aggregation:
    SearchContextAggregation;

  /**
   * Explicit deterministic timestamp supplied by the authorized runtime
   * orchestration boundary.
   */
  readonly created_at:
    SearchIsoTimestamp;

  /**
   * Explicit active analytical policy.
   *
   * Policy selection is externally owned.
   *
   * No implicit fallback is permitted inside this core.
   */
  readonly policy:
    SearchIntrinsicDocumentScoringPolicy;
}

/**
 * @deprecated
 * Compatibility alias only.
 *
 * New runtime code should use SearchIntrinsicDocumentScoringInput.
 */
export type SearchDocumentScoringInput =
  SearchIntrinsicDocumentScoringInput;

/* ============================================================================
 * 6. INTERNAL TYPES
 * ========================================================================== */

type SearchIntrinsicScoreName =
  | "lexical_score"
  | "anchor_score"
  | "occurrence_score"
  | "frequency_score"
  | "convergence_score"
  | "document_quality_score";

interface SearchCalculatedScore {
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
 * 7. SAFE NUMERIC PRIMITIVES
 * ----------------------------------------------------------------------------
 * Invalid numerical state is rejected.
 *
 * It is never silently converted to zero.
 *
 * Explicit zero remains authorized for canonical observed empty populations.
 * ========================================================================== */

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
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be finite.`,
    );
  }
}

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
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: normalized analytical value must be finite.",
    );
  }

  if (
    value <= 0
  ) {
    return 0;
  }

  if (
    value >= 1
  ) {
    return 1;
  }

  return value;
}

/**
 * Ratio helper for canonical observed quantities.
 *
 * denominator === 0 is interpreted only as an explicitly observed empty
 * population and returns zero.
 *
 * Invalid / non-finite values are rejected.
 */
function observedRatioOrZero(
  numerator:
    number,

  denominator:
    number,

  fieldName:
    string,
): number {
  assertFiniteNumber(
    numerator,
    `${fieldName}.numerator`,
  );

  assertFiniteNumber(
    denominator,
    `${fieldName}.denominator`,
  );

  if (
    numerator < 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Contract violation: ${fieldName}.numerator must be non-negative.`,
    );
  }

  if (
    denominator < 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Contract violation: ${fieldName}.denominator must be non-negative.`,
    );
  }

  if (
    denominator === 0
  ) {
    return 0;
  }

  return numerator /
    denominator;
}

/**
 * Mean of a canonical observed collection.
 *
 * An empty observed collection has a deterministic contribution of zero.
 * Its analytical incompleteness remains separately represented through
 * missing_data by the owning score function.
 */
function observedMeanOrZero(
  values:
    readonly number[],
): number {
  if (
    values.length ===
    0
  ) {
    return 0;
  }

  let total =
    0;

  for (
    const value of
    values
  ) {
    assertFiniteNumber(
      value,
      "observed_mean.value",
    );

    total +=
      value;
  }

  return total /
    values.length;
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
    assertFiniteNumber(
      entry.value,
      `weighted_mean[${String(index)}].value`,
    );

    assertFiniteNumber(
      entry.weight,
      `weighted_mean[${String(index)}].weight`,
    );

    if (
      entry.weight <
      0
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
          "Internal invariant violation: weighted mean cannot consume a negative weight.",
      );
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
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: weighted mean requires a positive total weight.",
    );
  }

  return clamp01(
    weightedTotal /
      totalWeight,
  );
}

function normalizeAgainstTarget(
  value:
    number,

  target:
    number,
): SearchNormalizedScore {
  assertFiniteNumber(
    value,
    "normalize_against_target.value",
  );

  assertFiniteNumber(
    target,
    "normalize_against_target.target",
  );

  if (
    value < 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: normalization value must be non-negative.",
    );
  }

  if (
    target <= 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: normalization target must be positive.",
    );
  }

  return clamp01(
    value /
      target,
  );
}

function normalizedBalance(
  leftCount:
    number,

  rightCount:
    number,
): SearchNormalizedScore {
  assertFiniteNumber(
    leftCount,
    "normalized_balance.left_count",
  );

  assertFiniteNumber(
    rightCount,
    "normalized_balance.right_count",
  );

  if (
    leftCount < 0 ||
    rightCount < 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: balance counts must be non-negative.",
    );
  }

  const maximum =
    Math.max(
      leftCount,
      rightCount,
    );

  if (
    maximum ===
    0
  ) {
    return 0;
  }

  return clamp01(
    Math.min(
      leftCount,
      rightCount,
    ) /
      maximum,
  );
}

/* ============================================================================
 * 8. CONTRACT PRIMITIVE ASSERTIONS
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
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must not be empty.`,
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
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a valid ISO timestamp.`,
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
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a finite non-negative number.`,
    );
  }
}

function assertNonNegativeInteger(
  value:
    number,

  fieldName:
    string,
): void {
  if (
    !Number.isInteger(
      value,
    ) ||
    value <
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a non-negative integer.`,
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
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Policy violation: ${fieldName} must be a positive integer.`,
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
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be between zero and one.`,
    );
  }
}

function assertWeightGroup(
  weights:
    readonly number[],

  groupName:
    string,
): void {
  let total =
    0;

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

    total +=
      weight;
  }

  if (
    total <=
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Policy violation: ${groupName} must contain a positive total weight.`,
    );
  }
}

/* ============================================================================
 * 9. POLICY VALIDATION
 * ----------------------------------------------------------------------------
 * Policy validity belongs to the canonical producer consuming the policy.
 *
 * Policy selection does not.
 * ========================================================================== */

function validatePolicy(
  policy:
    SearchIntrinsicDocumentScoringPolicy,
): void {
  if (
    policy === null ||
    typeof policy !==
      "object"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Policy boundary violation: an explicit SearchIntrinsicDocumentScoringPolicy is required.",
    );
  }

  assertNonEmptyString(
    policy.policy_version,
    "policy.policy_version",
  );

  assertPositiveInteger(
    policy.lexical_full_confidence_token_count,
    "policy.lexical_full_confidence_token_count",
  );

  assertPositiveInteger(
    policy.lexical_full_confidence_vocabulary_size,
    "policy.lexical_full_confidence_vocabulary_size",
  );

  assertPositiveInteger(
    policy.document_quality_target_token_count,
    "policy.document_quality_target_token_count",
  );

  assertPositiveInteger(
    policy.document_quality_target_vocabulary_size,
    "policy.document_quality_target_vocabulary_size",
  );

  assertPositiveInteger(
    policy.frequency_signal_target_count,
    "policy.frequency_signal_target_count",
  );

  assertPositiveInteger(
    policy.anchor_target_count,
    "policy.anchor_target_count",
  );

  assertPositiveInteger(
    policy.convergence_pair_target_count,
    "policy.convergence_pair_target_count",
  );

  assertWeightGroup(
    [
      policy.lexical_diversity_weight,
      policy.lexical_entropy_weight,
    ],
    "policy.lexical_score_weights",
  );

  assertWeightGroup(
    [
      policy.anchor_coverage_weight,
      policy.anchor_dispersion_weight,
      policy.anchor_position_weight,
    ],
    "policy.anchor_score_weights",
  );

  assertWeightGroup(
    [
      policy.occurrence_frequent_coverage_weight,
      policy.occurrence_rare_coverage_weight,
      policy.occurrence_anchor_coverage_weight,
    ],
    "policy.occurrence_score_weights",
  );

  assertWeightGroup(
    [
      policy.frequency_distribution_weight,
      policy.frequency_signal_balance_weight,
    ],
    "policy.frequency_score_weights",
  );

  assertWeightGroup(
    [
      policy.convergence_mean_weight,
      policy.convergence_maximum_weight,
      policy.convergence_pair_weight,
    ],
    "policy.convergence_score_weights",
  );

  assertWeightGroup(
    [
      policy.document_quality_token_volume_weight,
      policy.document_quality_vocabulary_volume_weight,
      policy.document_quality_information_density_weight,
      policy.document_quality_contract_health_weight,
    ],
    "policy.document_quality_score_weights",
  );
}

/* ============================================================================
 * 10. INPUT VALIDATION-STATE AUTHORIZATION
 * ----------------------------------------------------------------------------
 * INTRINSIC_DOCUMENT_SCORING consumes validated canonical truth.
 *
 * VALID and DEGRADED may cross.
 * REJECTED and UNVALIDATED may not.
 * ========================================================================== */

function assertAuthorizedInputValidationState(
  validationState:
    SearchValidationState,

  contractName:
    string,
): void {
  if (
    validationState ===
      "REJECTED" ||
    validationState ===
      "UNVALIDATED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Boundary rejection: ${contractName} has unauthorized validation_state ${validationState}.`,
    );
  }

  if (
    validationState !==
      "VALID" &&
    validationState !==
      "DEGRADED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        `Boundary rejection: ${contractName} has unsupported validation_state ${validationState}.`,
    );
  }
}

/* ============================================================================
 * 11. INPUT IDENTITY VALIDATION
 * ========================================================================== */

function validateInputIdentity(
  input:
    SearchIntrinsicDocumentScoringInput,
): void {
  const documentIds =
    [
      input.lexical_document
        .document_id,

      input.frequency_signals
        .document_id,

      input.intrinsic_anchor_signals
        .document_id,

      input.context_aggregation
        .document_id,
    ] as const;

  for (
    const [
      index,
      documentId,
    ] of documentIds.entries()
  ) {
    assertNonEmptyString(
      documentId,
      `document_identity[${String(index)}]`,
    );
  }

  const expectedDocumentId =
    documentIds[0];

  for (
    const documentId of
    documentIds
  ) {
    if (
      documentId !==
      expectedDocumentId
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
          "Boundary violation: all intrinsic scoring inputs must belong to the same canonical document.",
      );
    }
  }
}

/* ============================================================================
 * 12. TEMPORAL CAUSALITY
 * ----------------------------------------------------------------------------
 * The scorer may not produce truth before any canonical input it consumes.
 *
 * This validates lineage only.
 *
 * It performs no temporal scoring and creates no 24H / 7D truth.
 * ========================================================================== */

function validateTemporalCausality(
  input:
    SearchIntrinsicDocumentScoringInput,
): void {
  assertValidIsoTimestamp(
    input.created_at,
    "created_at",
  );

  const scoringTimestamp =
    Date.parse(
      input.created_at,
    );

  const upstreamTimestamps =
    [
      [
        "lexical_document.created_at",
        input.lexical_document
          .created_at,
      ],
      [
        "frequency_signals.created_at",
        input.frequency_signals
          .created_at,
      ],
      [
        "intrinsic_anchor_signals.created_at",
        input.intrinsic_anchor_signals
          .created_at,
      ],
      [
        "context_aggregation.created_at",
        input.context_aggregation
          .created_at,
      ],
    ] as const;

  for (
    const [
      fieldName,
      timestamp,
    ] of upstreamTimestamps
  ) {
    assertValidIsoTimestamp(
      timestamp,
      fieldName,
    );

    if (
      Date.parse(
        timestamp,
      ) >
      scoringTimestamp
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
          `Temporal boundary violation: ${fieldName} postdates intrinsic scoring created_at.`,
      );
    }
  }
}

/* ============================================================================
 * 13. LEXICAL CONTRACT VALIDATION
 * ========================================================================== */

function validateLexicalContract(
  lexicalDocument:
    SearchLexicalDocument,
): void {
  assertNonEmptyString(
    lexicalDocument.contract_version,
    "lexical_document.contract_version",
  );

  assertNonEmptyString(
    lexicalDocument.document_id,
    "lexical_document.document_id",
  );

  assertValidIsoTimestamp(
    lexicalDocument.created_at,
    "lexical_document.created_at",
  );

  assertAuthorizedInputValidationState(
    lexicalDocument.validation_state,
    "SearchLexicalDocument",
  );

  assertNonNegativeInteger(
    lexicalDocument.token_count,
    "lexical_document.token_count",
  );

  assertNonNegativeInteger(
    lexicalDocument.vocabulary_size,
    "lexical_document.vocabulary_size",
  );

  if (
    lexicalDocument
      .vocabulary_size >
    lexicalDocument
      .token_count
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Contract violation: vocabulary_size cannot exceed token_count.",
    );
  }

  for (
    const statistic of
    lexicalDocument
      .term_statistics
  ) {
    assertNonEmptyString(
      statistic.normalized_term,
      "lexical_document.term_statistics.normalized_term",
    );

    assertNonNegativeInteger(
      statistic.occurrence_count,
      `term_statistics.${statistic.normalized_term}.occurrence_count`,
    );

    assertNonNegativeInteger(
      statistic.sentence_frequency_count,
      `term_statistics.${statistic.normalized_term}.sentence_frequency_count`,
    );

    assertNormalizedNumber(
      statistic.document_frequency_ratio,
      `term_statistics.${statistic.normalized_term}.document_frequency_ratio`,
    );
  }
}

/* ============================================================================
 * 14. FREQUENCY CONTRACT VALIDATION
 * ========================================================================== */

function validateFrequencyContract(
  frequencySignals:
    SearchFrequencySignals,
): void {
  assertNonEmptyString(
    frequencySignals.contract_version,
    "frequency_signals.contract_version",
  );

  assertNonEmptyString(
    frequencySignals.document_id,
    "frequency_signals.document_id",
  );

  assertValidIsoTimestamp(
    frequencySignals.created_at,
    "frequency_signals.created_at",
  );

  assertAuthorizedInputValidationState(
    frequencySignals.validation_state,
    "SearchFrequencySignals",
  );

  assertNonNegativeInteger(
    frequencySignals.requested_frequent_term_limit,
    "frequency_signals.requested_frequent_term_limit",
  );

  assertNonNegativeInteger(
    frequencySignals.requested_rare_term_limit,
    "frequency_signals.requested_rare_term_limit",
  );

  const allSignals =
    [
      ...frequencySignals
        .frequent_terms,

      ...frequencySignals
        .rare_terms,
    ];

  for (
    const signal of
    allSignals
  ) {
    assertNonEmptyString(
      signal.normalized_term,
      "frequency_signals.normalized_term",
    );

    assertNonNegativeInteger(
      signal.occurrence_count,
      `frequency_signals.${signal.normalized_term}.occurrence_count`,
    );

    assertNormalizedNumber(
      signal.local_frequency_ratio,
      `frequency_signals.${signal.normalized_term}.local_frequency_ratio`,
    );
  }
}

/* ============================================================================
 * 15. ANCHOR CONTRACT VALIDATION
 * ========================================================================== */

function validateAnchorContract(
  anchorSignals:
    SearchAnchorSignals,
): void {
  assertNonEmptyString(
    anchorSignals.contract_version,
    "intrinsic_anchor_signals.contract_version",
  );

  assertNonEmptyString(
    anchorSignals.document_id,
    "intrinsic_anchor_signals.document_id",
  );

  assertValidIsoTimestamp(
    anchorSignals.created_at,
    "intrinsic_anchor_signals.created_at",
  );

  assertAuthorizedInputValidationState(
    anchorSignals.validation_state,
    "SearchAnchorSignals",
  );

  assertNonNegativeInteger(
    anchorSignals.anchor_count,
    "intrinsic_anchor_signals.anchor_count",
  );

  if (
    anchorSignals.anchor_count !==
    anchorSignals.anchors.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Contract violation: anchor_count must equal anchors.length.",
    );
  }

  for (
    const anchor of
    anchorSignals.anchors
  ) {
    assertNonEmptyString(
      anchor.anchor_id,
      "anchor.anchor_id",
    );

    assertNonEmptyString(
      anchor.sentence_id,
      "anchor.sentence_id",
    );

    assertNormalizedNumber(
      anchor.local_convergence_score,
      `anchor.${anchor.anchor_id}.local_convergence_score`,
    );

    assertNormalizedNumber(
      anchor.position_weight,
      `anchor.${anchor.anchor_id}.position_weight`,
    );
  }
}

/* ============================================================================
 * 16. CONTEXT AGGREGATION CONTRACT VALIDATION
 * ========================================================================== */

function validateContextAggregationContract(
  contextAggregation:
    SearchContextAggregation,
): void {
  assertNonEmptyString(
    contextAggregation.contract_version,
    "context_aggregation.contract_version",
  );

  assertNonEmptyString(
    contextAggregation.document_id,
    "context_aggregation.document_id",
  );

  assertValidIsoTimestamp(
    contextAggregation.created_at,
    "context_aggregation.created_at",
  );

  assertAuthorizedInputValidationState(
    contextAggregation.validation_state,
    "SearchContextAggregation",
  );

  assertNonNegativeInteger(
    contextAggregation.anchor_sentence_count,
    "context_aggregation.anchor_sentence_count",
  );

  assertNonNegativeInteger(
    contextAggregation.frequent_term_anchor_count,
    "context_aggregation.frequent_term_anchor_count",
  );

  assertNonNegativeInteger(
    contextAggregation.rare_term_anchor_count,
    "context_aggregation.rare_term_anchor_count",
  );

  assertNonNegativeInteger(
    contextAggregation
      .frequent_rare_convergence_anchor_count,
    "context_aggregation.frequent_rare_convergence_anchor_count",
  );

  assertNonNegativeInteger(
    contextAggregation
      .unique_matched_frequent_term_count,
    "context_aggregation.unique_matched_frequent_term_count",
  );

  assertNonNegativeInteger(
    contextAggregation
      .unique_matched_rare_term_count,
    "context_aggregation.unique_matched_rare_term_count",
  );

  assertNormalizedNumber(
    contextAggregation
      .anchor_sentence_coverage_ratio,
    "context_aggregation.anchor_sentence_coverage_ratio",
  );

  assertNormalizedNumber(
    contextAggregation
      .mean_local_convergence_score,
    "context_aggregation.mean_local_convergence_score",
  );

  assertNormalizedNumber(
    contextAggregation
      .maximum_local_convergence_score,
    "context_aggregation.maximum_local_convergence_score",
  );

  assertNormalizedNumber(
    contextAggregation
      .mean_anchor_position_weight,
    "context_aggregation.mean_anchor_position_weight",
  );

  assertNormalizedNumber(
    contextAggregation
      .anchor_dispersion_score,
    "context_aggregation.anchor_dispersion_score",
  );

  assertNormalizedNumber(
    contextAggregation
      .anchor_concentration_score,
    "context_aggregation.anchor_concentration_score",
  );

  assertNormalizedNumber(
    contextAggregation
      .adjacent_anchor_ratio,
    "context_aggregation.adjacent_anchor_ratio",
  );

  for (
    const pairContext of
    contextAggregation
      .frequent_rare_pair_contexts
  ) {
    assertNonEmptyString(
      pairContext.frequent_term,
      "context_aggregation.pair.frequent_term",
    );

    assertNonEmptyString(
      pairContext.rare_term,
      "context_aggregation.pair.rare_term",
    );

    assertNonNegativeInteger(
      pairContext.cooccurrence_sentence_count,
      "context_aggregation.pair.cooccurrence_sentence_count",
    );

    if (
      pairContext
        .cooccurrence_sentence_count !==
      pairContext
        .cooccurrence_sentence_ids
        .length
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
          "Contract violation: pair cooccurrence_sentence_count must equal cooccurrence_sentence_ids.length.",
      );
    }

    assertNormalizedNumber(
      pairContext.proximity_score,
      "context_aggregation.pair.proximity_score",
    );

    assertNormalizedNumber(
      pairContext.convergence_evidence_score,
      "context_aggregation.pair.convergence_evidence_score",
    );
  }
}

/* ============================================================================
 * 17. COMPLETE INPUT CONTRACT VALIDATION
 * ========================================================================== */

function validateInputContracts(
  input:
    SearchIntrinsicDocumentScoringInput,
): void {
  validatePolicy(
    input.policy,
  );

  validateInputIdentity(
    input,
  );

  validateTemporalCausality(
    input,
  );

  validateLexicalContract(
    input.lexical_document,
  );

  validateFrequencyContract(
    input.frequency_signals,
  );

  validateAnchorContract(
    input.intrinsic_anchor_signals,
  );

  validateContextAggregationContract(
    input.context_aggregation,
  );
}

/* ============================================================================
 * 18. VALIDATION-STATE CONFIDENCE
 * ----------------------------------------------------------------------------
 * Validation state contributes to score confidence.
 *
 * Confidence does not redefine producer validation state.
 *
 * REJECTED / UNVALIDATED states cannot legitimately reach these calculations.
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

    case "REJECTED":
    case "UNVALIDATED":
      throw new Error(
        `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
          `Internal invariant violation: unauthorized validation_state ${validationState} reached intrinsic score calculation.`,
      );
  }
}

function combinedValidationConfidence(
  validationStates:
    readonly SearchValidationState[],
): SearchConfidenceScore {
  if (
    validationStates.length ===
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: validation confidence requires at least one canonical input state.",
    );
  }

  return clamp01(
    Math.min(
      ...validationStates.map(
        (
          state,
        ) =>
          validationStateConfidence(
            state,
          ),
      ),
    ),
  );
}

/* ============================================================================
 * 19. LEXICAL SCORE
 * ----------------------------------------------------------------------------
 * Measures:
 * - lexical diversity
 * - normalized vocabulary entropy
 *
 * It does not measure:
 * - query relevance
 * - temporal freshness
 * - document authority
 * ========================================================================== */

function computeNormalizedLexicalEntropy(
  lexicalDocument:
    SearchLexicalDocument,
): SearchNormalizedScore {
  const tokenCount =
    lexicalDocument
      .token_count;

  const vocabularySize =
    lexicalDocument
      .vocabulary_size;

  if (
    tokenCount ===
      0 ||
    vocabularySize <=
      1
  ) {
    return 0;
  }

  const probabilities =
    lexicalDocument
      .term_statistics
      .map(
        (
          statistic,
        ) =>
          observedRatioOrZero(
            statistic
              .occurrence_count,
            tokenCount,
            "lexical_entropy.term_probability",
          ),
      )
      .filter(
        (
          probability,
        ) =>
          probability >
          0,
      );

  if (
    probabilities.length ===
    0
  ) {
    return 0;
  }

  const entropy =
    probabilities.reduce(
      (
        sum,
        probability,
      ) =>
        sum -
        probability *
          Math.log(
            probability,
          ),
      0,
    );

  const maximumEntropy =
    Math.log(
      vocabularySize,
    );

  assertFiniteNumber(
    entropy,
    "lexical_entropy.entropy",
  );

  assertFiniteNumber(
    maximumEntropy,
    "lexical_entropy.maximum_entropy",
  );

  return clamp01(
    observedRatioOrZero(
      entropy,
      maximumEntropy,
      "lexical_entropy.normalization",
    ),
  );
}

function calculateLexicalScore(
  lexicalDocument:
    SearchLexicalDocument,

  policy:
    SearchIntrinsicDocumentScoringPolicy,
): SearchCalculatedScore {
  const lexicalDiversity =
    clamp01(
      observedRatioOrZero(
        lexicalDocument
          .vocabulary_size,

        lexicalDocument
          .token_count,

        "lexical_score.lexical_diversity",
      ),
    );

  const lexicalEntropy =
    computeNormalizedLexicalEntropy(
      lexicalDocument,
    );

  const value =
    weightedMean([
      {
        value:
          lexicalDiversity,

        weight:
          policy
            .lexical_diversity_weight,
      },
      {
        value:
          lexicalEntropy,

        weight:
          policy
            .lexical_entropy_weight,
      },
    ]);

  const tokenConfidence =
    normalizeAgainstTarget(
      lexicalDocument
        .token_count,

      policy
        .lexical_full_confidence_token_count,
    );

  const vocabularyConfidence =
    normalizeAgainstTarget(
      lexicalDocument
        .vocabulary_size,

      policy
        .lexical_full_confidence_vocabulary_size,
    );

  const validationConfidence =
    validationStateConfidence(
      lexicalDocument
        .validation_state,
    );

  const confidence =
    weightedMean([
      {
        value:
          tokenConfidence,

        weight:
          0.45,
      },
      {
        value:
          vocabularyConfidence,

        weight:
          0.35,
      },
      {
        value:
          validationConfidence,

        weight:
          0.2,
      },
    ]);

  const missingData:
    string[] =
    [];

  if (
    lexicalDocument
      .token_count ===
    0
  ) {
    missingData.push(
      "lexical_document.tokens",
    );
  }

  if (
    lexicalDocument
      .vocabulary_size ===
    0
  ) {
    missingData.push(
      "lexical_document.vocabulary",
    );
  }

  return Object.freeze({
    value,

    confidence,

    source_features:
      Object.freeze([
        "lexical_document.token_count",
        "lexical_document.vocabulary_size",
        "lexical_document.term_statistics[].occurrence_count",
      ]),

    missing_data:
      Object.freeze([
        ...missingData,
      ]),

    explanation:
      "Measures intrinsic lexical diversity and normalized vocabulary entropy.",

    parameters:
      Object.freeze({
        lexical_diversity_weight:
          policy
            .lexical_diversity_weight,

        lexical_entropy_weight:
          policy
            .lexical_entropy_weight,

        lexical_full_confidence_token_count:
          policy
            .lexical_full_confidence_token_count,

        lexical_full_confidence_vocabulary_size:
          policy
            .lexical_full_confidence_vocabulary_size,
      }),
  });
}

/* ============================================================================
 * 20. ANCHOR SCORE
 * ----------------------------------------------------------------------------
 * Measures:
 * - documentary anchor coverage
 * - anchor dispersion
 * - anchor positional quality
 *
 * Local convergence remains owned by convergence_score.
 * ========================================================================== */

function calculateAnchorScore(
  anchorSignals:
    SearchAnchorSignals,

  contextAggregation:
    SearchContextAggregation,

  policy:
    SearchIntrinsicDocumentScoringPolicy,
): SearchCalculatedScore {
  const value =
    weightedMean([
      {
        value:
          contextAggregation
            .anchor_sentence_coverage_ratio,

        weight:
          policy
            .anchor_coverage_weight,
      },
      {
        value:
          contextAggregation
            .anchor_dispersion_score,

        weight:
          policy
            .anchor_dispersion_weight,
      },
      {
        value:
          contextAggregation
            .mean_anchor_position_weight,

        weight:
          policy
            .anchor_position_weight,
      },
    ]);

  const volumeConfidence =
    normalizeAgainstTarget(
      anchorSignals
        .anchor_count,

      policy
        .anchor_target_count,
    );

  const validationConfidence =
    combinedValidationConfidence([
      anchorSignals
        .validation_state,

      contextAggregation
        .validation_state,
    ]);

  const confidence =
    weightedMean([
      {
        value:
          volumeConfidence,

        weight:
          0.7,
      },
      {
        value:
          validationConfidence,

        weight:
          0.3,
      },
    ]);

  const missingData:
    string[] =
    [];

  if (
    anchorSignals
      .anchor_count ===
    0
  ) {
    missingData.push(
      "intrinsic_anchor_signals.anchors",
    );
  }

  return Object.freeze({
    value,

    confidence,

    source_features:
      Object.freeze([
        "context_aggregation.anchor_sentence_coverage_ratio",
        "context_aggregation.anchor_dispersion_score",
        "context_aggregation.mean_anchor_position_weight",
        "intrinsic_anchor_signals.anchor_count",
      ]),

    missing_data:
      Object.freeze([
        ...missingData,
      ]),

    explanation:
      "Measures the documentary coverage, dispersion and positional quality of validated intrinsic anchors.",

    parameters:
      Object.freeze({
        anchor_coverage_weight:
          policy
            .anchor_coverage_weight,

        anchor_dispersion_weight:
          policy
            .anchor_dispersion_weight,

        anchor_position_weight:
          policy
            .anchor_position_weight,

        anchor_target_count:
          policy
            .anchor_target_count,
      }),
  });
}

/* ============================================================================
 * 21. OCCURRENCE SCORE
 * ----------------------------------------------------------------------------
 * Measures whether selected frequent and rare terms are materially represented
 * and supported by canonical anchor coverage.
 *
 * It does not reinterpret rarity or calculate new convergence truth.
 * ========================================================================== */

function sumSignalOccurrences(
  signals:
    readonly {
      readonly occurrence_count:
        SearchCount;
    }[],
): SearchCount {
  return signals.reduce(
    (
      sum,
      signal,
    ) =>
      sum +
      signal
        .occurrence_count,
    0,
  );
}

function calculateOccurrenceScore(
  lexicalDocument:
    SearchLexicalDocument,

  frequencySignals:
    SearchFrequencySignals,

  contextAggregation:
    SearchContextAggregation,

  policy:
    SearchIntrinsicDocumentScoringPolicy,
): SearchCalculatedScore {
  const frequentOccurrenceCount =
    sumSignalOccurrences(
      frequencySignals
        .frequent_terms,
    );

  const rareOccurrenceCount =
    sumSignalOccurrences(
      frequencySignals
        .rare_terms,
    );

  const frequentOccurrenceCoverage =
    clamp01(
      observedRatioOrZero(
        frequentOccurrenceCount,

        lexicalDocument
          .token_count,

        "occurrence_score.frequent_occurrence_coverage",
      ),
    );

  /**
   * Canonical selected rare-term evidence is normalized against the selected
   * rare-signal population.
   *
   * The `Math.max(1, ...)` denominator is not a missing-data fallback:
   * missing selected rare evidence remains explicitly represented through
   * missing_data / selected-signal evidence.
   */
  const rareOccurrenceCoverage =
    clamp01(
      observedRatioOrZero(
        rareOccurrenceCount,

        Math.max(
          1,
          frequencySignals
            .rare_terms
            .length,
        ),

        "occurrence_score.rare_occurrence_coverage",
      ),
    );

  const value =
    weightedMean([
      {
        value:
          frequentOccurrenceCoverage,

        weight:
          policy
            .occurrence_frequent_coverage_weight,
      },
      {
        value:
          rareOccurrenceCoverage,

        weight:
          policy
            .occurrence_rare_coverage_weight,
      },
      {
        value:
          contextAggregation
            .anchor_sentence_coverage_ratio,

        weight:
          policy
            .occurrence_anchor_coverage_weight,
      },
    ]);

  const selectedSignalCount =
    frequencySignals
      .frequent_terms
      .length +
    frequencySignals
      .rare_terms
      .length;

  const signalConfidence =
    normalizeAgainstTarget(
      selectedSignalCount,

      policy
        .frequency_signal_target_count,
    );

  const validationConfidence =
    combinedValidationConfidence([
      lexicalDocument
        .validation_state,

      frequencySignals
        .validation_state,

      contextAggregation
        .validation_state,
    ]);

  const confidence =
    weightedMean([
      {
        value:
          signalConfidence,

        weight:
          0.65,
      },
      {
        value:
          validationConfidence,

        weight:
          0.35,
      },
    ]);

  const missingData:
    string[] =
    [];

  if (
    lexicalDocument
      .token_count ===
    0
  ) {
    missingData.push(
      "lexical_document.token_count",
    );
  }

  if (
    selectedSignalCount ===
    0
  ) {
    missingData.push(
      "frequency_signals.selected_terms",
    );
  }

  return Object.freeze({
    value,

    confidence,

    source_features:
      Object.freeze([
        "frequency_signals.frequent_terms[].occurrence_count",
        "frequency_signals.rare_terms[].occurrence_count",
        "lexical_document.token_count",
        "context_aggregation.anchor_sentence_coverage_ratio",
      ]),

    missing_data:
      Object.freeze([
        ...missingData,
      ]),

    explanation:
      "Measures the material occurrence of selected intrinsic frequency signals and their anchor-supported coverage.",

    parameters:
      Object.freeze({
        occurrence_frequent_coverage_weight:
          policy
            .occurrence_frequent_coverage_weight,

        occurrence_rare_coverage_weight:
          policy
            .occurrence_rare_coverage_weight,

        occurrence_anchor_coverage_weight:
          policy
            .occurrence_anchor_coverage_weight,

        frequency_signal_target_count:
          policy
            .frequency_signal_target_count,
      }),
  });
}

/* ============================================================================
 * 22. FREQUENCY SCORE
 * ----------------------------------------------------------------------------
 * Measures:
 * - distribution quality among selected intrinsic frequency signals
 * - balance between frequent and rare selected evidence
 *
 * It does not calculate lexical entropy or query relevance.
 * ========================================================================== */

function computeSelectedFrequencyEntropy(
  frequencySignals:
    SearchFrequencySignals,
): SearchNormalizedScore {
  const selectedSignals =
    [
      ...frequencySignals
        .frequent_terms,

      ...frequencySignals
        .rare_terms,
    ];

  if (
    selectedSignals.length <=
    1
  ) {
    return selectedSignals.length ===
      1
      ? 1
      : 0;
  }

  const totalOccurrences =
    selectedSignals.reduce(
      (
        sum,
        signal,
      ) =>
        sum +
        signal
          .occurrence_count,
      0,
    );

  if (
    totalOccurrences ===
    0
  ) {
    return 0;
  }

  const entropy =
    selectedSignals.reduce(
      (
        sum,
        signal,
      ) => {
        const probability =
          observedRatioOrZero(
            signal
              .occurrence_count,

            totalOccurrences,

            "frequency_score.selected_signal_probability",
          );

        if (
          probability <=
          0
        ) {
          return sum;
        }

        return sum -
          probability *
            Math.log(
              probability,
            );
      },
      0,
    );

  const maximumEntropy =
    Math.log(
      selectedSignals
        .length,
    );

  assertFiniteNumber(
    entropy,
    "frequency_score.entropy",
  );

  assertFiniteNumber(
    maximumEntropy,
    "frequency_score.maximum_entropy",
  );

  return clamp01(
    observedRatioOrZero(
      entropy,

      maximumEntropy,

      "frequency_score.entropy_normalization",
    ),
  );
}

function calculateFrequencyScore(
  frequencySignals:
    SearchFrequencySignals,

  policy:
    SearchIntrinsicDocumentScoringPolicy,
): SearchCalculatedScore {
  const distributionScore =
    computeSelectedFrequencyEntropy(
      frequencySignals,
    );

  const balanceScore =
    normalizedBalance(
      frequencySignals
        .frequent_terms
        .length,

      frequencySignals
        .rare_terms
        .length,
    );

  const value =
    weightedMean([
      {
        value:
          distributionScore,

        weight:
          policy
            .frequency_distribution_weight,
      },
      {
        value:
          balanceScore,

        weight:
          policy
            .frequency_signal_balance_weight,
      },
    ]);

  const selectedSignalCount =
    frequencySignals
      .frequent_terms
      .length +
    frequencySignals
      .rare_terms
      .length;

  const volumeConfidence =
    normalizeAgainstTarget(
      selectedSignalCount,

      policy
        .frequency_signal_target_count,
    );

  const validationConfidence =
    validationStateConfidence(
      frequencySignals
        .validation_state,
    );

  const confidence =
    weightedMean([
      {
        value:
          volumeConfidence,

        weight:
          0.75,
      },
      {
        value:
          validationConfidence,

        weight:
          0.25,
      },
    ]);

  const missingData:
    string[] =
    [];

  if (
    selectedSignalCount ===
    0
  ) {
    missingData.push(
      "frequency_signals.selected_terms",
    );
  }

  if (
    frequencySignals
      .frequent_terms
      .length ===
    0
  ) {
    missingData.push(
      "frequency_signals.frequent_terms",
    );
  }

  if (
    frequencySignals
      .rare_terms
      .length ===
    0
  ) {
    missingData.push(
      "frequency_signals.rare_terms",
    );
  }

  return Object.freeze({
    value,

    confidence,

    source_features:
      Object.freeze([
        "frequency_signals.frequent_terms[].occurrence_count",
        "frequency_signals.rare_terms[].occurrence_count",
        "frequency_signals.frequent_terms.length",
        "frequency_signals.rare_terms.length",
      ]),

    missing_data:
      Object.freeze([
        ...missingData,
      ]),

    explanation:
      "Measures distribution quality and balance across selected frequent and rare documentary signals.",

    parameters:
      Object.freeze({
        frequency_distribution_weight:
          policy
            .frequency_distribution_weight,

        frequency_signal_balance_weight:
          policy
            .frequency_signal_balance_weight,

        frequency_signal_target_count:
          policy
            .frequency_signal_target_count,
      }),
  });
}

/* ============================================================================
 * 23. CONVERGENCE SCORE
 * ----------------------------------------------------------------------------
 * Measures:
 * - mean canonical anchor convergence
 * - strongest canonical convergence
 * - frequent/rare pair convergence evidence
 *
 * It consumes canonical Context Aggregation.
 *
 * It never rebuilds anchors or pair evidence.
 * ========================================================================== */

function calculateConvergenceScore(
  contextAggregation:
    SearchContextAggregation,

  policy:
    SearchIntrinsicDocumentScoringPolicy,
): SearchCalculatedScore {
  const pairConvergenceScore =
    observedMeanOrZero(
      contextAggregation
        .frequent_rare_pair_contexts
        .map(
          (
            pairContext,
          ) =>
            weightedMean([
              {
                value:
                  pairContext
                    .proximity_score,

                weight:
                  0.4,
              },
              {
                value:
                  pairContext
                    .convergence_evidence_score,

                weight:
                  0.6,
              },
            ]),
        ),
    );

  const value =
    weightedMean([
      {
        value:
          contextAggregation
            .mean_local_convergence_score,

        weight:
          policy
            .convergence_mean_weight,
      },
      {
        value:
          contextAggregation
            .maximum_local_convergence_score,

        weight:
          policy
            .convergence_maximum_weight,
      },
      {
        value:
          pairConvergenceScore,

        weight:
          policy
            .convergence_pair_weight,
      },
    ]);

  const pairConfidence =
    normalizeAgainstTarget(
      contextAggregation
        .frequent_rare_pair_contexts
        .length,

      policy
        .convergence_pair_target_count,
    );

  const anchorConfidence =
    normalizeAgainstTarget(
      contextAggregation
        .frequent_rare_convergence_anchor_count,

      policy
        .anchor_target_count,
    );

  const validationConfidence =
    validationStateConfidence(
      contextAggregation
        .validation_state,
    );

  const confidence =
    weightedMean([
      {
        value:
          pairConfidence,

        weight:
          0.45,
      },
      {
        value:
          anchorConfidence,

        weight:
          0.35,
      },
      {
        value:
          validationConfidence,

        weight:
          0.2,
      },
    ]);

  const missingData:
    string[] =
    [];

  if (
    contextAggregation
      .frequent_rare_pair_contexts
      .length ===
    0
  ) {
    missingData.push(
      "context_aggregation.frequent_rare_pair_contexts",
    );
  }

  if (
    contextAggregation
      .frequent_rare_convergence_anchor_count ===
    0
  ) {
    missingData.push(
      "context_aggregation.frequent_rare_convergence_anchor_count",
    );
  }

  return Object.freeze({
    value,

    confidence,

    source_features:
      Object.freeze([
        "context_aggregation.mean_local_convergence_score",
        "context_aggregation.maximum_local_convergence_score",
        "context_aggregation.frequent_rare_pair_contexts[].proximity_score",
        "context_aggregation.frequent_rare_pair_contexts[].convergence_evidence_score",
        "context_aggregation.frequent_rare_convergence_anchor_count",
      ]),

    missing_data:
      Object.freeze([
        ...missingData,
      ]),

    explanation:
      "Measures validated convergence between frequent and rare documentary evidence without reconstructing upstream anchors.",

    parameters:
      Object.freeze({
        convergence_mean_weight:
          policy
            .convergence_mean_weight,

        convergence_maximum_weight:
          policy
            .convergence_maximum_weight,

        convergence_pair_weight:
          policy
            .convergence_pair_weight,

        convergence_pair_target_count:
          policy
            .convergence_pair_target_count,
      }),
  });
}

/* ============================================================================
 * 24. DOCUMENT QUALITY SCORE
 * ----------------------------------------------------------------------------
 * Measures intrinsic documentary usability from:
 * - token volume
 * - vocabulary volume
 * - information density
 * - upstream contract health
 *
 * It does not evaluate:
 * - factual truth
 * - external authority
 * - query relevance
 * - article freshness
 * - 7D eligibility
 * - 24H qualification
 * ========================================================================== */

function computeContractHealthScore(
  validationStates:
    readonly SearchValidationState[],
): SearchNormalizedScore {
  if (
    validationStates.length ===
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: contract health requires canonical validation states.",
    );
  }

  return clamp01(
    observedMeanOrZero(
      validationStates.map(
        (
          state,
        ) =>
          validationStateConfidence(
            state,
          ),
      ),
    ),
  );
}

function calculateDocumentQualityScore(
  lexicalDocument:
    SearchLexicalDocument,

  frequencySignals:
    SearchFrequencySignals,

  anchorSignals:
    SearchAnchorSignals,

  contextAggregation:
    SearchContextAggregation,

  policy:
    SearchIntrinsicDocumentScoringPolicy,
): SearchCalculatedScore {
  const tokenVolumeScore =
    normalizeAgainstTarget(
      lexicalDocument
        .token_count,

      policy
        .document_quality_target_token_count,
    );

  const vocabularyVolumeScore =
    normalizeAgainstTarget(
      lexicalDocument
        .vocabulary_size,

      policy
        .document_quality_target_vocabulary_size,
    );

  const lexicalDiversity =
    clamp01(
      observedRatioOrZero(
        lexicalDocument
          .vocabulary_size,

        lexicalDocument
          .token_count,

        "document_quality.lexical_diversity",
      ),
    );

  /**
   * Information density remains documentary quality evidence.
   *
   * It is not query relevance.
   */
  const informationDensityScore =
    weightedMean([
      {
        value:
          lexicalDiversity,

        weight:
          0.55,
      },
      {
        value:
          contextAggregation
            .anchor_sentence_coverage_ratio,

        weight:
          0.45,
      },
    ]);

  const contractHealthScore =
    computeContractHealthScore([
      lexicalDocument
        .validation_state,

      frequencySignals
        .validation_state,

      anchorSignals
        .validation_state,

      contextAggregation
        .validation_state,
    ]);

  const value =
    weightedMean([
      {
        value:
          tokenVolumeScore,

        weight:
          policy
            .document_quality_token_volume_weight,
      },
      {
        value:
          vocabularyVolumeScore,

        weight:
          policy
            .document_quality_vocabulary_volume_weight,
      },
      {
        value:
          informationDensityScore,

        weight:
          policy
            .document_quality_information_density_weight,
      },
      {
        value:
          contractHealthScore,

        weight:
          policy
            .document_quality_contract_health_weight,
      },
    ]);

  const evidenceVolumeConfidence =
    weightedMean([
      {
        value:
          tokenVolumeScore,

        weight:
          0.45,
      },
      {
        value:
          vocabularyVolumeScore,

        weight:
          0.3,
      },
      {
        value:
          normalizeAgainstTarget(
            anchorSignals
              .anchor_count,

            policy
              .anchor_target_count,
          ),

        weight:
          0.25,
      },
    ]);

  const confidence =
    weightedMean([
      {
        value:
          evidenceVolumeConfidence,

        weight:
          0.7,
      },
      {
        value:
          contractHealthScore,

        weight:
          0.3,
      },
    ]);

  const missingData:
    string[] =
    [];

  if (
    lexicalDocument
      .token_count ===
    0
  ) {
    missingData.push(
      "lexical_document.token_count",
    );
  }

  if (
    lexicalDocument
      .vocabulary_size ===
    0
  ) {
    missingData.push(
      "lexical_document.vocabulary_size",
    );
  }

  if (
    anchorSignals
      .anchor_count ===
    0
  ) {
    missingData.push(
      "intrinsic_anchor_signals.anchor_count",
    );
  }

  return Object.freeze({
    value,

    confidence,

    source_features:
      Object.freeze([
        "lexical_document.token_count",
        "lexical_document.vocabulary_size",
        "context_aggregation.anchor_sentence_coverage_ratio",
        "lexical_document.validation_state",
        "frequency_signals.validation_state",
        "intrinsic_anchor_signals.validation_state",
        "context_aggregation.validation_state",
      ]),

    missing_data:
      Object.freeze([
        ...missingData,
      ]),

    explanation:
      "Measures intrinsic document usability from volume, information density and upstream contract health.",

    parameters:
      Object.freeze({
        document_quality_target_token_count:
          policy
            .document_quality_target_token_count,

        document_quality_target_vocabulary_size:
          policy
            .document_quality_target_vocabulary_size,

        document_quality_token_volume_weight:
          policy
            .document_quality_token_volume_weight,

        document_quality_vocabulary_volume_weight:
          policy
            .document_quality_vocabulary_volume_weight,

        document_quality_information_density_weight:
          policy
            .document_quality_information_density_weight,

        document_quality_contract_health_weight:
          policy
            .document_quality_contract_health_weight,
      }),
  });
}

/* ============================================================================
 * 25. CANONICAL SUB-SCORE BUILDER
 * ----------------------------------------------------------------------------
 * SearchSubScore is created only from one canonical calculated score.
 *
 * Intrinsic scores deliberately receive no query_id.
 * ========================================================================== */

function buildSubScore(
  args: {
    readonly document_id:
      string;

    readonly created_at:
      SearchIsoTimestamp;

    readonly score_name:
      SearchIntrinsicScoreName;

    readonly signal_family:
      | "LEXICAL"
      | "ANCHOR"
      | "OCCURRENCE"
      | "FREQUENCY"
      | "CONVERGENCE"
      | "DOCUMENT_QUALITY";

    readonly overlap_group:
      string;

    readonly method:
      string;

    readonly calculation:
      SearchCalculatedScore;
  },
): SearchSubScore {
  assertNonEmptyString(
    args.document_id,
    "sub_score.document_id",
  );

  assertValidIsoTimestamp(
    args.created_at,
    "sub_score.created_at",
  );

  assertNonEmptyString(
    args.overlap_group,
    "sub_score.overlap_group",
  );

  assertNonEmptyString(
    args.method,
    "sub_score.method",
  );

  assertNormalizedNumber(
    args.calculation.value,
    `${args.score_name}.value`,
  );

  assertNormalizedNumber(
    args.calculation.confidence,
    `${args.score_name}.confidence`,
  );

  return Object.freeze({
    contract_version:
      XYVALA_SEARCH_DOCUMENT_SCORING_CONTRACT_VERSION,

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
        ...args.calculation
          .source_features,
      ]),

    overlap_group:
      args.overlap_group,

    method:
      args.method,

    module_name:
      XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_VERSION,

    parameters:
      Object.freeze({
        ...args.calculation
          .parameters,
      }),

    missing_data:
      Object.freeze([
        ...args.calculation
          .missing_data,
      ]),

    explanation:
      args.calculation
        .explanation,
  });
}

/* ============================================================================
 * 26. OUTPUT VALIDATION STATE
 * ----------------------------------------------------------------------------
 * Validation and confidence are different analytical concepts.
 *
 * Reduced confidence alone does NOT produce DEGRADED.
 *
 * DEGRADED is emitted only when:
 * - canonical upstream truth is explicitly DEGRADED; or
 * - one or more produced scores explicitly report missing_data.
 *
 * REJECTED / UNVALIDATED inputs never reach output production.
 * ========================================================================== */

function resolveOutputValidationState(
  args: {
    readonly input_states:
      readonly SearchValidationState[];

    readonly scores:
      readonly SearchSubScore[];
  },
): SearchValidationState {
  if (
    args.input_states.some(
      (
        validationState,
      ) =>
        validationState ===
        "REJECTED" ||
        validationState ===
        "UNVALIDATED",
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: unauthorized upstream validation state reached output qualification.",
    );
  }

  if (
    args.input_states.some(
      (
        validationState,
      ) =>
        validationState ===
        "DEGRADED",
    )
  ) {
    return "DEGRADED";
  }

  if (
    args.scores.some(
      (
        score,
      ) =>
        score
          .missing_data
          .length >
        0,
    )
  ) {
    return "DEGRADED";
  }

  return "VALID";
}

/* ============================================================================
 * 27. DEGRADATION PROPAGATION
 * ----------------------------------------------------------------------------
 * Canonical degradation is propagated.
 *
 * Confidence reduction alone is not rewritten as degradation.
 * ========================================================================== */

function collectDegradationReasons(
  args: {
    readonly lexical_document:
      SearchLexicalDocument;

    readonly frequency_signals:
      SearchFrequencySignals;

    readonly intrinsic_anchor_signals:
      SearchAnchorSignals;

    readonly context_aggregation:
      SearchContextAggregation;

    readonly scores:
      readonly SearchSubScore[];
  },
): readonly string[] {
  const reasons =
    new Set<string>();

  for (
    const reason of
    args.lexical_document
      .degradation_reasons
  ) {
    reasons.add(
      `LEXICAL_ANALYSIS:${reason}`,
    );
  }

  for (
    const reason of
    args.frequency_signals
      .degradation_reasons
  ) {
    reasons.add(
      `FREQUENCY_SIGNAL_DETECTION:${reason}`,
    );
  }

  for (
    const reason of
    args.intrinsic_anchor_signals
      .degradation_reasons
  ) {
    reasons.add(
      `ANCHOR_SIGNAL_DETECTION:${reason}`,
    );
  }

  for (
    const reason of
    args.context_aggregation
      .degradation_reasons
  ) {
    reasons.add(
      `CONTEXT_AGGREGATION:${reason}`,
    );
  }

  for (
    const score of
    args.scores
  ) {
    for (
      const missingData of
      score.missing_data
    ) {
      reasons.add(
        `INTRINSIC_DOCUMENT_SCORING:${score.score_name}:${missingData}`,
      );
    }
  }

  return Object.freeze(
    [...reasons].sort(),
  );
}

/* ============================================================================
 * 28. PUBLIC COMPUTE FUNCTION
 * ----------------------------------------------------------------------------
 * CANONICAL PRODUCER
 *
 * SearchLexicalDocument
 * + SearchFrequencySignals
 * + SearchAnchorSignals
 * + SearchContextAggregation
 * + explicit SearchIntrinsicDocumentScoringPolicy
 * + explicit deterministic created_at
 * -> SearchIntrinsicDocumentScoreVector
 *
 * The producer:
 * - validates the explicit policy
 * - validates canonical input contracts
 * - validates document identity
 * - validates temporal causality
 * - calculates intrinsic documentary scores
 * - preserves canonical score names and signal families
 * - preserves explicit missing_data
 * - preserves policy lineage
 * - produces one canonical intrinsic score vector
 *
 * It performs no:
 * - policy selection
 * - policy fallback
 * - query relevance scoring
 * - temporal scoring
 * - article-age calculation
 * - 24H / 7D qualification
 * - link scoring
 * - behavioral scoring
 * - positive-score assembly
 * - penalty evaluation
 * - analytical aggregation
 * - eligibility evaluation
 * - cohort normalization
 * - relative evaluation
 * - decision
 * - calibration execution
 * - public ranking
 * - persistence
 * - runtime mutation
 * ========================================================================== */

export function computeSearchIntrinsicDocumentScoreVector(
  input:
    SearchIntrinsicDocumentScoringInput,
): SearchIntrinsicDocumentScoreVector {
  /*
   * Contract Before Runtime.
   *
   * policy is mandatory and already selected by the authorized outer policy
   * governance / runtime adaptation boundary.
   */
  validateInputContracts(
    input,
  );

  const policy =
    input.policy;

  const documentId =
    input.lexical_document
      .document_id;

  /* --------------------------------------------------------------------------
   * lexical_score
   * ----------------------------------------------------------------------- */

  const lexicalScore =
    buildSubScore({
      document_id:
        documentId,

      created_at:
        input.created_at,

      score_name:
        "lexical_score",

      signal_family:
        "LEXICAL",

      overlap_group:
        "intrinsic_lexical_structure",

      method:
        "weighted_lexical_diversity_and_normalized_entropy",

      calculation:
        calculateLexicalScore(
          input.lexical_document,
          policy,
        ),
    });

  /* --------------------------------------------------------------------------
   * anchor_score
   * ----------------------------------------------------------------------- */

  const anchorScore =
    buildSubScore({
      document_id:
        documentId,

      created_at:
        input.created_at,

      score_name:
        "anchor_score",

      signal_family:
        "ANCHOR",

      overlap_group:
        "intrinsic_anchor_structure",

      method:
        "weighted_anchor_coverage_dispersion_and_position",

      calculation:
        calculateAnchorScore(
          input.intrinsic_anchor_signals,
          input.context_aggregation,
          policy,
        ),
    });

  /* --------------------------------------------------------------------------
   * occurrence_score
   * ----------------------------------------------------------------------- */

  const occurrenceScore =
    buildSubScore({
      document_id:
        documentId,

      created_at:
        input.created_at,

      score_name:
        "occurrence_score",

      signal_family:
        "OCCURRENCE",

      overlap_group:
        "intrinsic_frequency_occurrence",

      method:
        "weighted_selected_signal_occurrence_and_anchor_coverage",

      calculation:
        calculateOccurrenceScore(
          input.lexical_document,
          input.frequency_signals,
          input.context_aggregation,
          policy,
        ),
    });

  /* --------------------------------------------------------------------------
   * frequency_score
   * ----------------------------------------------------------------------- */

  const frequencyScore =
    buildSubScore({
      document_id:
        documentId,

      created_at:
        input.created_at,

      score_name:
        "frequency_score",

      signal_family:
        "FREQUENCY",

      overlap_group:
        "intrinsic_frequency_occurrence",

      method:
        "selected_signal_entropy_and_frequency_rarity_balance",

      calculation:
        calculateFrequencyScore(
          input.frequency_signals,
          policy,
        ),
    });

  /* --------------------------------------------------------------------------
   * convergence_score
   * ----------------------------------------------------------------------- */

  const convergenceScore =
    buildSubScore({
      document_id:
        documentId,

      created_at:
        input.created_at,

      score_name:
        "convergence_score",

      signal_family:
        "CONVERGENCE",

      overlap_group:
        "intrinsic_anchor_convergence",

      method:
        "weighted_anchor_and_frequent_rare_pair_convergence",

      calculation:
        calculateConvergenceScore(
          input.context_aggregation,
          policy,
        ),
    });

  /* --------------------------------------------------------------------------
   * document_quality_score
   * ----------------------------------------------------------------------- */

  const documentQualityScore =
    buildSubScore({
      document_id:
        documentId,

      created_at:
        input.created_at,

      score_name:
        "document_quality_score",

      signal_family:
        "DOCUMENT_QUALITY",

      overlap_group:
        "intrinsic_document_quality",

      method:
        "weighted_document_volume_density_and_contract_health",

      calculation:
        calculateDocumentQualityScore(
          input.lexical_document,
          input.frequency_signals,
          input.intrinsic_anchor_signals,
          input.context_aggregation,
          policy,
        ),
    });

  /* --------------------------------------------------------------------------
   * Canonical immutable score collection
   * ----------------------------------------------------------------------- */

  const scores =
    Object.freeze([
      lexicalScore,
      anchorScore,
      occurrenceScore,
      frequencyScore,
      convergenceScore,
      documentQualityScore,
    ]);

  const inputValidationStates =
    Object.freeze([
      input.lexical_document
        .validation_state,

      input.frequency_signals
        .validation_state,

      input.intrinsic_anchor_signals
        .validation_state,

      input.context_aggregation
        .validation_state,
    ]);

  const validationState =
    resolveOutputValidationState({
      input_states:
        inputValidationStates,

      scores,
    });

  const degradationReasons =
    collectDegradationReasons({
      lexical_document:
        input.lexical_document,

      frequency_signals:
        input.frequency_signals,

      intrinsic_anchor_signals:
        input.intrinsic_anchor_signals,

      context_aggregation:
        input.context_aggregation,

      scores,
    });

  return Object.freeze({
    contract_version:
      XYVALA_SEARCH_DOCUMENT_SCORING_CONTRACT_VERSION,

    created_at:
      input.created_at,

    document_id:
      documentId,

    lexical_score:
      lexicalScore,

    anchor_score:
      anchorScore,

    occurrence_score:
      occurrenceScore,

    frequency_score:
      frequencyScore,

    convergence_score:
      convergenceScore,

    document_quality_score:
      documentQualityScore,

    scorer_module_version:
      XYVALA_SEARCH_DOCUMENT_SCORING_MODULE_VERSION,

    /**
     * Explicit policy lineage.
     *
     * The exact externally selected active policy is preserved.
     */
    scoring_policy_version:
      policy.policy_version,

    validation_state:
      validationState,

    degradation_reasons:
      degradationReasons,
  });
}

/* ============================================================================
 * 29. STATIC OWNERSHIP DECLARATION
 * ----------------------------------------------------------------------------
 * Documentation / audit metadata only.
 *
 * No runtime calculation is performed here.
 * ========================================================================== */

export const XYVALA_SEARCH_INTRINSIC_DOCUMENT_SCORING_OWNERSHIP =
  Object.freeze({
    pipeline_layer:
      "INTRINSIC_DOCUMENT_SCORING",

    canonical_output:
      "SearchIntrinsicDocumentScoreVector",

    policy_identity:
      "SearchIntrinsicDocumentScoringPolicy",

    policy_selection_owner:
      "EXTERNAL_AUTHORIZED_POLICY_GOVERNANCE",

    policy_fallback_allowed:
      false,

    query_relative:
      false,

    temporal:
      false,

    public:
      false,

    scores:
      Object.freeze([
        "lexical_score",
        "anchor_score",
        "occurrence_score",
        "frequency_score",
        "convergence_score",
        "document_quality_score",
      ] as const),

    prohibited_reconstructions:
      Object.freeze([
        "query_relevance",
        "temporal_freshness",
        "article_age",
        "within_7d",
        "within_24h",
        "link_authority",
        "behavioral_calibration",
        "penalty_truth",
        "global_score",
        "eligibility",
        "relative_position",
        "private_decision",
      ] as const),
  } as const);
