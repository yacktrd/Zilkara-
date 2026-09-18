/* ============================================================================
 * FILE: lib/xyvala/search/scoring/search-query-relevance-scoring-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search query relevance scoring core
 *
 * ROLE
 * - consume validated query-relative documentary signals
 * - calculate the canonical query relevance sub-score
 * - produce the canonical SearchQueryRelativeScoreVector
 * - preserve the separation between document truth and query-relative truth
 * - expose deterministic, traceable and auditable relevance evidence
 *
 * CLASSIFICATION
 * - PRIVATE ANALYTICAL ENGINE
 * - SEARCH DOMAIN
 * - QUERY RELEVANCE SCORING
 * - COMPUTE
 * - PURE
 * - NON-MUTATING
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchQueryProfile
 * - SearchQueryDocumentSignals
 * - SearchQueryRelativeScoreVector
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 *
 * CONSUMERS
 * - Xyvala Search positive score assembler
 * - Xyvala Search penalty evaluation engine
 * - Xyvala Search private snapshot builder
 * - Xyvala Search calibration datasets
 * - Xyvala Search scoring tests
 *
 * DIRECTIVES
 * - query-relative scoring only
 * - deterministic output for identical inputs and policy
 * - no intrinsic document scoring
 * - no lexical reconstruction
 * - no query normalization
 * - no query profiling
 * - no query-document signal reconstruction
 * - no temporal scoring
 * - no link authority scoring
 * - no behavioral calibration scoring
 * - no penalty evaluation
 * - no positive score assembly
 * - no global aggregation
 * - no eligibility evaluation
 * - no cohort normalization
 * - no ranking
 * - no private decision
 * - no persistence
 * - no runtime mutation
 * - no implicit timestamp
 * - no implicit neutral replacement for unavailable evidence
 *
 * INPUTS
 * - SearchQueryProfile
 * - SearchQueryDocumentSignals
 * - SearchQueryRelevanceScoringPolicy
 * - explicit deterministic creation timestamp
 *
 * OUTPUTS
 * - SearchQueryRelativeScoreVector
 *
 * INVARIANTS
 * - query profile and query-document signals belong to the same query
 * - output document identity comes only from SearchQueryDocumentSignals
 * - output query identity comes from validated input identity
 * - every score is normalized between zero and one
 * - every confidence is normalized between zero and one
 * - every source feature identifies validated upstream evidence
 * - query relevance never modifies intrinsic documentary truth
 * - no input contract is mutated
 * - no runtime clock is read internally
 * - no random value is generated
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/search/contracts/search-pipeline-contract
 *
 * SENSITIVE AREAS
 * - exact-match over-weighting
 * - rare-term over-weighting
 * - query-anchor overlap
 * - concentration versus dispersion interpretation
 * - unavailable concept evidence
 * - empty or excluded-only queries
 * - degraded upstream confidence
 * ========================================================================== */

import type {
  SearchConfidenceScore,
  SearchContractVersion,
  SearchCount,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchNormalizedScore,
  SearchPolicyVersion,
  SearchQueryDocumentSignals,
  SearchQueryProfile,
  SearchQueryRelativeScoreVector,
  SearchSubScore,
  SearchValidationState,
  SearchWeight,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_MODULE_NAME =
  "xyvala-search-query-relevance-scoring-core" as const;

export const XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_MODULE_VERSION:
  SearchModuleVersion = "1.0.0";

export const XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_CONTRACT_VERSION:
  SearchContractVersion = "2.0.0";

export const XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_POLICY_VERSION:
  SearchPolicyVersion = "1.0.0";

/* ============================================================================
 * 2. POLICY CONTRACT
 * ----------------------------------------------------------------------------
 * The policy is explicit, immutable and versioned.
 *
 * It governs only query relevance scoring.
 * It does not govern penalties, aggregation, cohorts or decisions.
 * ========================================================================== */

export interface SearchQueryRelevanceScoringPolicy {
  readonly policy_version: SearchPolicyVersion;

  /**
   * Weight of literal query-term coverage.
   */
  readonly exact_query_term_coverage_weight: SearchWeight;

  /**
   * Weight of normalized query-term coverage.
   */
  readonly normalized_query_term_coverage_weight: SearchWeight;

  /**
   * Weight of query support from intrinsic anchors.
   */
  readonly query_anchor_coverage_weight: SearchWeight;

  /**
   * Weight of proximity between query terms and rare documentary signals.
   */
  readonly query_rare_term_proximity_weight: SearchWeight;

  /**
   * Weight of proximity between query terms and frequent documentary signals.
   */
  readonly query_frequent_term_proximity_weight: SearchWeight;

  /**
   * Weight of optional concept-level query coverage.
   */
  readonly query_concept_coverage_weight: SearchWeight;

  /**
   * Weight of query-signal distribution across the document.
   */
  readonly query_signal_dispersion_weight: SearchWeight;

  /**
   * Weight of local query-signal concentration.
   *
   * Concentration is supporting evidence only and must not dominate broad
   * documentary coverage.
   */
  readonly query_signal_concentration_weight: SearchWeight;

  /**
   * Relative weights used inside each query-anchor signal.
   */
  readonly anchor_term_coverage_weight: SearchWeight;
  readonly anchor_proximity_weight: SearchWeight;
  readonly anchor_convergence_weight: SearchWeight;

  /**
   * Evidence targets used exclusively for confidence calculation.
   */
  readonly full_confidence_query_term_count: SearchCount;
  readonly full_confidence_query_anchor_count: SearchCount;

  /**
   * Maximum share that optional concept evidence may represent after
   * renormalization.
   */
  readonly concept_evidence_weight_cap: SearchWeight;

  /**
   * Confidence retained when concept evidence is unavailable.
   *
   * The unavailable concept score is excluded and weights are renormalized.
   * This factor only reflects the reduced breadth of evidence.
   */
  readonly unavailable_concept_confidence_factor: SearchConfidenceScore;
}

export const DEFAULT_XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_POLICY:
  SearchQueryRelevanceScoringPolicy = Object.freeze({
    policy_version:
      XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_POLICY_VERSION,

    exact_query_term_coverage_weight: 0.14,
    normalized_query_term_coverage_weight: 0.2,
    query_anchor_coverage_weight: 0.18,
    query_rare_term_proximity_weight: 0.12,
    query_frequent_term_proximity_weight: 0.08,
    query_concept_coverage_weight: 0.1,
    query_signal_dispersion_weight: 0.11,
    query_signal_concentration_weight: 0.07,

    anchor_term_coverage_weight: 0.4,
    anchor_proximity_weight: 0.25,
    anchor_convergence_weight: 0.35,

    full_confidence_query_term_count: 3,
    full_confidence_query_anchor_count: 4,

    concept_evidence_weight_cap: 0.15,
    unavailable_concept_confidence_factor: 0.85,
  });

/* ============================================================================
 * 3. INPUT CONTRACT
 * ----------------------------------------------------------------------------
 * This scorer receives only canonical query profile and query-document signals.
 *
 * It does not consume:
 * - raw query text directly;
 * - lexical documents;
 * - intrinsic document score vectors;
 * - temporal, link or behavioral evidence;
 * - global scoring input.
 * ========================================================================== */

export interface SearchQueryRelevanceScoringInput {
  readonly query_profile: SearchQueryProfile;

  readonly query_document_signals:
    SearchQueryDocumentSignals;

  /**
   * Explicit deterministic timestamp.
   *
   * The scorer must not read the runtime clock.
   */
  readonly created_at: SearchIsoTimestamp;

  readonly policy?: SearchQueryRelevanceScoringPolicy;
}

/* ============================================================================
 * 4. INTERNAL CONTRACTS
 * ========================================================================== */

interface SearchWeightedEvidence {
  readonly source_feature: string;
  readonly value: SearchNormalizedScore;
  readonly requested_weight: SearchWeight;
  readonly available: boolean;
}

interface SearchQueryRelevanceCalculation {
  readonly value: SearchNormalizedScore;
  readonly confidence: SearchConfidenceScore;

  readonly source_features: readonly string[];
  readonly missing_data: readonly string[];

  readonly explanation: string;

  readonly parameters:
    Readonly<Record<string, unknown>>;
}

/* ============================================================================
 * 5. NUMERIC PRIMITIVES
 * ========================================================================== */

function clamp01(value: number): SearchNormalizedScore {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
}

function safeRatio(
  numerator: number,
  denominator: number,
): number {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return 0;
  }

  return numerator / denominator;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );
}

function normalizeAgainstTarget(
  value: number,
  target: number,
): SearchNormalizedScore {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(target) ||
    target <= 0
  ) {
    return 0;
  }

  return clamp01(value / target);
}

function weightedMean(
  entries: readonly {
    readonly value: number;
    readonly weight: number;
  }[],
): SearchNormalizedScore {
  const validEntries = entries.filter(
    (entry) =>
      Number.isFinite(entry.value) &&
      Number.isFinite(entry.weight) &&
      entry.weight > 0,
  );

  const totalWeight = validEntries.reduce(
    (sum, entry) => sum + entry.weight,
    0,
  );

  if (totalWeight <= 0) {
    return 0;
  }

  const weightedTotal = validEntries.reduce(
    (sum, entry) =>
      sum + clamp01(entry.value) * entry.weight,
    0,
  );

  return clamp01(weightedTotal / totalWeight);
}

function weightedAvailableEvidenceMean(
  evidence: readonly SearchWeightedEvidence[],
): SearchNormalizedScore {
  const availableEvidence = evidence.filter(
    (entry) =>
      entry.available &&
      Number.isFinite(entry.requested_weight) &&
      entry.requested_weight > 0,
  );

  return weightedMean(
    availableEvidence.map((entry) => ({
      value: entry.value,
      weight: entry.requested_weight,
    })),
  );
}

/* ============================================================================
 * 6. CONTRACT ASSERTIONS
 * ========================================================================== */

function assertNonEmptyString(
  value: string,
  fieldName: string,
): void {
  if (value.trim().length === 0) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must not be empty.`,
    );
  }
}

function assertFiniteNonNegativeNumber(
  value: number,
  fieldName: string,
): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a finite non-negative number.`,
    );
  }
}

function assertPositiveNumber(
  value: number,
  fieldName: string,
): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_MODULE_NAME}] ` +
        `Policy violation: ${fieldName} must be greater than zero.`,
    );
  }
}

function assertNormalizedNumber(
  value: number,
  fieldName: string,
): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be between zero and one.`,
    );
  }
}

function assertWeightGroup(
  weights: readonly number[],
  groupName: string,
): void {
  for (const [index, weight] of weights.entries()) {
    assertFiniteNonNegativeNumber(
      weight,
      `${groupName}[${String(index)}]`,
    );
  }

  const totalWeight = weights.reduce(
    (sum, weight) => sum + weight,
    0,
  );

  if (totalWeight <= 0) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_MODULE_NAME}] ` +
        `Policy violation: ${groupName} must have a positive total weight.`,
    );
  }
}

/* ============================================================================
 * 7. POLICY VALIDATION
 * ========================================================================== */

function validatePolicy(
  policy: SearchQueryRelevanceScoringPolicy,
): void {
  assertNonEmptyString(
    policy.policy_version,
    "policy.policy_version",
  );

  assertWeightGroup(
    [
      policy.exact_query_term_coverage_weight,
      policy.normalized_query_term_coverage_weight,
      policy.query_anchor_coverage_weight,
      policy.query_rare_term_proximity_weight,
      policy.query_frequent_term_proximity_weight,
      policy.query_concept_coverage_weight,
      policy.query_signal_dispersion_weight,
      policy.query_signal_concentration_weight,
    ],
    "policy.query_relevance_weights",
  );

  assertWeightGroup(
    [
      policy.anchor_term_coverage_weight,
      policy.anchor_proximity_weight,
      policy.anchor_convergence_weight,
    ],
    "policy.query_anchor_weights",
  );

  assertPositiveNumber(
    policy.full_confidence_query_term_count,
    "policy.full_confidence_query_term_count",
  );

  assertPositiveNumber(
    policy.full_confidence_query_anchor_count,
    "policy.full_confidence_query_anchor_count",
  );

  assertNormalizedNumber(
    policy.concept_evidence_weight_cap,
    "policy.concept_evidence_weight_cap",
  );

  assertNormalizedNumber(
    policy.unavailable_concept_confidence_factor,
    "policy.unavailable_concept_confidence_factor",
  );

  if (
    policy.query_concept_coverage_weight >
    policy.concept_evidence_weight_cap
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_MODULE_NAME}] ` +
        "Policy violation: query_concept_coverage_weight cannot exceed concept_evidence_weight_cap.",
    );
  }
}

/* ============================================================================
 * 8. INPUT IDENTITY VALIDATION
 * ========================================================================== */

function validateInputIdentity(
  input: SearchQueryRelevanceScoringInput,
): void {
  assertNonEmptyString(
    input.query_profile.query_id,
    "query_profile.query_id",
  );

  assertNonEmptyString(
    input.query_document_signals.query_id,
    "query_document_signals.query_id",
  );

  assertNonEmptyString(
    input.query_document_signals.document_id,
    "query_document_signals.document_id",
  );

  assertNonEmptyString(
    input.created_at,
    "created_at",
  );

  if (
    input.query_profile.query_id !==
    input.query_document_signals.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_MODULE_NAME}] ` +
        "Boundary violation: query profile and query-document signals must belong to the same query.",
    );
  }
}

/* ============================================================================
 * 9. QUERY PROFILE VALIDATION
 * ========================================================================== */

function validateQueryProfile(
  queryProfile: SearchQueryProfile,
): void {
  assertNonEmptyString(
    queryProfile.normalized_query,
    "query_profile.normalized_query",
  );

  if (queryProfile.query_terms.length === 0) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_MODULE_NAME}] ` +
        "Boundary rejection: query profile contains no query terms.",
    );
  }

  for (const queryTerm of queryProfile.query_terms) {
    assertNonEmptyString(
      queryTerm.raw_term,
      "query_profile.query_terms.raw_term",
    );

    assertNonEmptyString(
      queryTerm.normalized_term,
      "query_profile.query_terms.normalized_term",
    );

    assertFiniteNonNegativeNumber(
      queryTerm.term_weight,
      `query_profile.query_terms.${queryTerm.normalized_term}.term_weight`,
    );
  }

  const activeQueryTermCount =
    queryProfile.query_terms.filter(
      (queryTerm) =>
        queryTerm.term_role !== "EXCLUDED" &&
        queryTerm.term_weight > 0,
    ).length;

  if (activeQueryTermCount === 0) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_MODULE_NAME}] ` +
        "Boundary rejection: query profile contains no active weighted query terms.",
    );
  }
}

/* ============================================================================
 * 10. QUERY-DOCUMENT SIGNAL VALIDATION
 * ========================================================================== */

function validateQueryAnchorSignals(
  signals: SearchQueryDocumentSignals,
): void {
  const seenAnchorIds = new Set<string>();

  for (const anchorSignal of signals.query_anchor_signals) {
    assertNonEmptyString(
      anchorSignal.anchor_id,
      "query_document_signals.query_anchor_signals.anchor_id",
    );

    assertNonEmptyString(
      anchorSignal.sentence_id,
      `query_anchor_signal.${anchorSignal.anchor_id}.sentence_id`,
    );

    if (seenAnchorIds.has(anchorSignal.anchor_id)) {
      throw new Error(
        `[${XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_MODULE_NAME}] ` +
          `Contract violation: duplicate query anchor id ${anchorSignal.anchor_id}.`,
      );
    }

    seenAnchorIds.add(anchorSignal.anchor_id);

    assertNormalizedNumber(
      anchorSignal.query_term_coverage_score,
      `query_anchor_signal.${anchorSignal.anchor_id}.query_term_coverage_score`,
    );

    assertNormalizedNumber(
      anchorSignal.query_anchor_proximity_score,
      `query_anchor_signal.${anchorSignal.anchor_id}.query_anchor_proximity_score`,
    );

    assertNormalizedNumber(
      anchorSignal.query_anchor_convergence_score,
      `query_anchor_signal.${anchorSignal.anchor_id}.query_anchor_convergence_score`,
    );
  }
}

function validateQueryDocumentSignals(
  signals: SearchQueryDocumentSignals,
): void {
  assertNormalizedNumber(
    signals.exact_query_term_coverage_score,
    "query_document_signals.exact_query_term_coverage_score",
  );

  assertNormalizedNumber(
    signals.normalized_query_term_coverage_score,
    "query_document_signals.normalized_query_term_coverage_score",
  );

  assertNormalizedNumber(
    signals.query_rare_term_proximity_score,
    "query_document_signals.query_rare_term_proximity_score",
  );

  assertNormalizedNumber(
    signals.query_frequent_term_proximity_score,
    "query_document_signals.query_frequent_term_proximity_score",
  );

  assertNormalizedNumber(
    signals.query_anchor_coverage_score,
    "query_document_signals.query_anchor_coverage_score",
  );

  assertNormalizedNumber(
    signals.query_signal_dispersion_score,
    "query_document_signals.query_signal_dispersion_score",
  );

  assertNormalizedNumber(
    signals.query_signal_concentration_score,
    "query_document_signals.query_signal_concentration_score",
  );

  if (
    signals.query_concept_coverage_score.availability_state ===
    "AVAILABLE"
  ) {
    assertNormalizedNumber(
      signals.query_concept_coverage_score.value,
      "query_document_signals.query_concept_coverage_score.value",
    );
  } else {
    assertNonEmptyString(
      signals.query_concept_coverage_score.reason,
      "query_document_signals.query_concept_coverage_score.reason",
    );
  }

  validateQueryAnchorSignals(signals);
}

function validateInputContracts(
  input: SearchQueryRelevanceScoringInput,
): void {
  validateInputIdentity(input);
  validateQueryProfile(input.query_profile);
  validateQueryDocumentSignals(
    input.query_document_signals,
  );
}

/* ============================================================================
 * 11. VALIDATION-STATE GOVERNANCE
 * ----------------------------------------------------------------------------
 * Upstream validation state affects confidence.
 *
 * REJECTED contracts are refused at the boundary.
 * ========================================================================== */

function validationStateConfidence(
  validationState: SearchValidationState,
): SearchConfidenceScore {
  switch (validationState) {
    case "VALID":
      return 1;

    case "DEGRADED":
      return 0.65;

    case "UNVALIDATED":
      return 0.35;

    case "REJECTED":
      return 0;
  }
}

function assertInputNotRejected(
  contractName: string,
  validationState: SearchValidationState,
): void {
  if (validationState === "REJECTED") {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_MODULE_NAME}] ` +
        `Boundary rejection: ${contractName} has validation_state REJECTED.`,
    );
  }
}

function combinedValidationConfidence(
  validationStates: readonly SearchValidationState[],
): SearchConfidenceScore {
  if (validationStates.length === 0) {
    return 0;
  }

  return clamp01(
    Math.min(
      ...validationStates.map((validationState) =>
        validationStateConfidence(validationState),
      ),
    ),
  );
}

/* ============================================================================
 * 12. QUERY PROFILE EVIDENCE
 * ========================================================================== */

function getActiveQueryTerms(
  queryProfile: SearchQueryProfile,
): SearchQueryProfile["query_terms"] {
  return queryProfile.query_terms.filter(
    (queryTerm) =>
      queryTerm.term_role !== "EXCLUDED" &&
      queryTerm.term_weight > 0,
  );
}

function computeQueryProfileStrength(
  queryProfile: SearchQueryProfile,
): SearchNormalizedScore {
  const activeTerms = getActiveQueryTerms(queryProfile);

  if (activeTerms.length === 0) {
    return 0;
  }

  const totalWeight = activeTerms.reduce(
    (sum, queryTerm) => sum + queryTerm.term_weight,
    0,
  );

  if (totalWeight <= 0) {
    return 0;
  }

  const primaryAndSecondaryWeight = activeTerms.reduce(
    (sum, queryTerm) => {
      if (
        queryTerm.term_role === "PRIMARY" ||
        queryTerm.term_role === "SECONDARY"
      ) {
        return sum + queryTerm.term_weight;
      }

      return sum;
    },
    0,
  );

  return clamp01(
    safeRatio(
      primaryAndSecondaryWeight,
      totalWeight,
    ),
  );
}

/* ============================================================================
 * 13. QUERY-ANCHOR EVIDENCE
 * ----------------------------------------------------------------------------
 * Anchor evidence is calculated from canonical SearchQueryAnchorSignal values.
 *
 * The scorer does not reopen sentences or rebuild anchor relationships.
 * ========================================================================== */

function computeMeanQueryAnchorEvidence(
  signals: SearchQueryDocumentSignals,
  policy: SearchQueryRelevanceScoringPolicy,
): SearchNormalizedScore {
  if (signals.query_anchor_signals.length === 0) {
    return 0;
  }

  return clamp01(
    mean(
      signals.query_anchor_signals.map(
        (anchorSignal) =>
          weightedMean([
            {
              value:
                anchorSignal.query_term_coverage_score,
              weight:
                policy.anchor_term_coverage_weight,
            },
            {
              value:
                anchorSignal.query_anchor_proximity_score,
              weight:
                policy.anchor_proximity_weight,
            },
            {
              value:
                anchorSignal.query_anchor_convergence_score,
              weight:
                policy.anchor_convergence_weight,
            },
          ]),
      ),
    ),
  );
}

function computeQueryAnchorStrength(
  signals: SearchQueryDocumentSignals,
  policy: SearchQueryRelevanceScoringPolicy,
): SearchNormalizedScore {
  const meanAnchorEvidence =
    computeMeanQueryAnchorEvidence(
      signals,
      policy,
    );

  return weightedMean([
    {
      value: signals.query_anchor_coverage_score,
      weight: 0.6,
    },
    {
      value: meanAnchorEvidence,
      weight: 0.4,
    },
  ]);
}

/* ============================================================================
 * 14. RELEVANCE VALUE CALCULATION
 * ----------------------------------------------------------------------------
 * Missing concept evidence is excluded and remaining weights are normalized.
 *
 * It is never converted into zero.
 * ========================================================================== */

function buildWeightedEvidence(args: {
  readonly signals: SearchQueryDocumentSignals;
  readonly policy: SearchQueryRelevanceScoringPolicy;
}): readonly SearchWeightedEvidence[] {
  const queryAnchorStrength =
    computeQueryAnchorStrength(
      args.signals,
      args.policy,
    );

  const conceptEvidenceAvailable =
    args.signals.query_concept_coverage_score
      .availability_state === "AVAILABLE";

  const conceptEvidenceValue =
    conceptEvidenceAvailable
      ? args.signals.query_concept_coverage_score.value
      : 0;

  return Object.freeze([
    {
      source_feature:
        "query_document_signals.exact_query_term_coverage_score",
      value:
        args.signals.exact_query_term_coverage_score,
      requested_weight:
        args.policy.exact_query_term_coverage_weight,
      available: true,
    },
    {
      source_feature:
        "query_document_signals.normalized_query_term_coverage_score",
      value:
        args.signals.normalized_query_term_coverage_score,
      requested_weight:
        args.policy.normalized_query_term_coverage_weight,
      available: true,
    },
    {
      source_feature:
        "query_document_signals.query_anchor_coverage_score",
      value: queryAnchorStrength,
      requested_weight:
        args.policy.query_anchor_coverage_weight,
      available: true,
    },
    {
      source_feature:
        "query_document_signals.query_rare_term_proximity_score",
      value:
        args.signals.query_rare_term_proximity_score,
      requested_weight:
        args.policy.query_rare_term_proximity_weight,
      available: true,
    },
    {
      source_feature:
        "query_document_signals.query_frequent_term_proximity_score",
      value:
        args.signals.query_frequent_term_proximity_score,
      requested_weight:
        args.policy.query_frequent_term_proximity_weight,
      available: true,
    },
    {
      source_feature:
        "query_document_signals.query_concept_coverage_score",
      value: conceptEvidenceValue,
      requested_weight:
        args.policy.query_concept_coverage_weight,
      available: conceptEvidenceAvailable,
    },
    {
      source_feature:
        "query_document_signals.query_signal_dispersion_score",
      value:
        args.signals.query_signal_dispersion_score,
      requested_weight:
        args.policy.query_signal_dispersion_weight,
      available: true,
    },
    {
      source_feature:
        "query_document_signals.query_signal_concentration_score",
      value:
        args.signals.query_signal_concentration_score,
      requested_weight:
        args.policy.query_signal_concentration_weight,
      available: true,
    },
  ]);
}

/* ============================================================================
 * 15. CONFIDENCE CALCULATION
 * ----------------------------------------------------------------------------
 * Confidence measures evidence sufficiency and contract health.
 *
 * It does not alter the observed relevance value.
 * ========================================================================== */

function computeEvidenceBreadthScore(
  signals: SearchQueryDocumentSignals,
): SearchNormalizedScore {
  const evidenceValues = [
    signals.exact_query_term_coverage_score,
    signals.normalized_query_term_coverage_score,
    signals.query_rare_term_proximity_score,
    signals.query_frequent_term_proximity_score,
    signals.query_anchor_coverage_score,
    signals.query_signal_dispersion_score,
    signals.query_signal_concentration_score,
  ];

  const positiveEvidenceCount = evidenceValues.filter(
    (value) => value > 0,
  ).length;

  return clamp01(
    safeRatio(
      positiveEvidenceCount,
      evidenceValues.length,
    ),
  );
}

function calculateQueryRelevance(
  queryProfile: SearchQueryProfile,
  signals: SearchQueryDocumentSignals,
  policy: SearchQueryRelevanceScoringPolicy,
): SearchQueryRelevanceCalculation {
  const weightedEvidence = buildWeightedEvidence({
    signals,
    policy,
  });

  const relevanceValue =
    weightedAvailableEvidenceMean(weightedEvidence);

  const activeQueryTermCount =
    getActiveQueryTerms(queryProfile).length;

  const queryTermConfidence =
    normalizeAgainstTarget(
      activeQueryTermCount,
      policy.full_confidence_query_term_count,
    );

  const queryAnchorConfidence =
    normalizeAgainstTarget(
      signals.query_anchor_signals.length,
      policy.full_confidence_query_anchor_count,
    );

  const queryProfileStrength =
    computeQueryProfileStrength(queryProfile);

  const evidenceBreadth =
    computeEvidenceBreadthScore(signals);

  const validationConfidence =
    combinedValidationConfidence([
      queryProfile.validation_state,
      signals.validation_state,
    ]);

  const conceptEvidenceAvailable =
    signals.query_concept_coverage_score
      .availability_state === "AVAILABLE";

  const conceptConfidenceFactor =
    conceptEvidenceAvailable
      ? 1
      : policy.unavailable_concept_confidence_factor;

  const confidence = clamp01(
    weightedMean([
      {
        value: queryTermConfidence,
        weight: 0.25,
      },
      {
        value: queryAnchorConfidence,
        weight: 0.2,
      },
      {
        value: queryProfileStrength,
        weight: 0.15,
      },
      {
        value: evidenceBreadth,
        weight: 0.2,
      },
      {
        value: validationConfidence,
        weight: 0.2,
      },
    ]) * conceptConfidenceFactor,
  );

  const missingData: string[] = [];

  if (signals.query_anchor_signals.length === 0) {
    missingData.push(
      "query_document_signals.query_anchor_signals",
    );
  }

  if (!conceptEvidenceAvailable) {
    missingData.push(
      "query_document_signals.query_concept_coverage_score",
    );
  }

  const availableSourceFeatures =
    weightedEvidence
      .filter((evidence) => evidence.available)
      .map((evidence) => evidence.source_feature);

  availableSourceFeatures.push(
    "query_document_signals.query_anchor_signals[].query_term_coverage_score",
    "query_document_signals.query_anchor_signals[].query_anchor_proximity_score",
    "query_document_signals.query_anchor_signals[].query_anchor_convergence_score",
    "query_profile.query_terms[].term_weight",
    "query_profile.query_terms[].term_role",
  );

  return {
    value: relevanceValue,
    confidence,

    source_features: Object.freeze(
      [...new Set(availableSourceFeatures)].sort(),
    ),

    missing_data: Object.freeze(
      [...new Set(missingData)].sort(),
    ),

    explanation:
      "Measures query-relative relevance from validated term coverage, anchor support, documentary proximity, optional concept coverage and signal distribution without modifying intrinsic document truth.",

    parameters: Object.freeze({
      exact_query_term_coverage_weight:
        policy.exact_query_term_coverage_weight,
      normalized_query_term_coverage_weight:
        policy.normalized_query_term_coverage_weight,
      query_anchor_coverage_weight:
        policy.query_anchor_coverage_weight,
      query_rare_term_proximity_weight:
        policy.query_rare_term_proximity_weight,
      query_frequent_term_proximity_weight:
        policy.query_frequent_term_proximity_weight,
      query_concept_coverage_weight:
        policy.query_concept_coverage_weight,
      query_signal_dispersion_weight:
        policy.query_signal_dispersion_weight,
      query_signal_concentration_weight:
        policy.query_signal_concentration_weight,
      anchor_term_coverage_weight:
        policy.anchor_term_coverage_weight,
      anchor_proximity_weight:
        policy.anchor_proximity_weight,
      anchor_convergence_weight:
        policy.anchor_convergence_weight,
      full_confidence_query_term_count:
        policy.full_confidence_query_term_count,
      full_confidence_query_anchor_count:
        policy.full_confidence_query_anchor_count,
      unavailable_concept_confidence_factor:
        policy.unavailable_concept_confidence_factor,
      missing_evidence_handling:
        "EXCLUDE_AND_RENORMALIZE",
    }),
  };
}

/* ============================================================================
 * 16. SUB-SCORE BUILDER
 * ========================================================================== */

function buildQueryRelevanceSubScore(args: {
  readonly document_id: string;
  readonly query_id: string;
  readonly created_at: SearchIsoTimestamp;
  readonly calculation: SearchQueryRelevanceCalculation;
}): SearchSubScore {
  return Object.freeze({
    contract_version:
      XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_CONTRACT_VERSION,

    created_at: args.created_at,
    document_id: args.document_id,
    query_id: args.query_id,

    score_name: "query_relevance_score",
    signal_family: "QUERY_RELEVANCE",

    value: clamp01(args.calculation.value),
    confidence: clamp01(
      args.calculation.confidence,
    ),

    source_features: Object.freeze([
      ...args.calculation.source_features,
    ]),

    overlap_group: "query_relevance_evidence",

    method:
      "weighted_query_coverage_anchor_proximity_concept_and_distribution",

    module_name:
      XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_MODULE_VERSION,

    parameters: Object.freeze({
      ...args.calculation.parameters,
    }),

    missing_data: Object.freeze([
      ...args.calculation.missing_data,
    ]),

    explanation: args.calculation.explanation,
  });
}

/* ============================================================================
 * 17. OUTPUT VALIDATION STATE
 * ========================================================================== */

function resolveOutputValidationState(args: {
  readonly query_profile_state:
    SearchValidationState;

  readonly query_document_signals_state:
    SearchValidationState;

  readonly query_relevance_score:
    SearchSubScore;
}): SearchValidationState {
  const inputStates = [
    args.query_profile_state,
    args.query_document_signals_state,
  ] as const;

  if (
    inputStates.some(
      (validationState) =>
        validationState === "REJECTED",
    )
  ) {
    return "REJECTED";
  }

  if (
    inputStates.some(
      (validationState) =>
        validationState === "DEGRADED" ||
        validationState === "UNVALIDATED",
    )
  ) {
    return "DEGRADED";
  }

  if (
    args.query_relevance_score.confidence < 1 ||
    args.query_relevance_score.missing_data.length > 0
  ) {
    return "DEGRADED";
  }

  return "VALID";
}

function collectDegradationReasons(args: {
  readonly query_profile: SearchQueryProfile;

  readonly query_document_signals:
    SearchQueryDocumentSignals;

  readonly query_relevance_score:
    SearchSubScore;
}): readonly string[] {
  const degradationReasons = new Set<string>();

  for (
    const reason of
    args.query_profile.degradation_reasons
  ) {
    degradationReasons.add(
      `QUERY_PROFILING:${reason}`,
    );
  }

  for (
    const reason of
    args.query_document_signals.degradation_reasons
  ) {
    degradationReasons.add(
      `QUERY_DOCUMENT_SIGNAL_DETECTION:${reason}`,
    );
  }

  for (
    const missingData of
    args.query_relevance_score.missing_data
  ) {
    degradationReasons.add(
      `QUERY_RELEVANCE_SCORING:${missingData}`,
    );
  }

  return Object.freeze(
    [...degradationReasons].sort(),
  );
}

/* ============================================================================
 * 18. PUBLIC COMPUTE FUNCTION
 * ----------------------------------------------------------------------------
 * Pure deterministic computation.
 *
 * This function:
 * - reads validated contracts;
 * - calculates one query-relative score;
 * - returns one canonical query-relative vector.
 *
 * It performs no persistence, event publication, cache mutation, ranking,
 * aggregation or runtime orchestration.
 * ========================================================================== */

export function computeSearchQueryRelativeScoreVector(
  input: SearchQueryRelevanceScoringInput,
): SearchQueryRelativeScoreVector {
  const policy =
    input.policy ??
    DEFAULT_XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_POLICY;

  validatePolicy(policy);
  validateInputContracts(input);

  assertInputNotRejected(
    "SearchQueryProfile",
    input.query_profile.validation_state,
  );

  assertInputNotRejected(
    "SearchQueryDocumentSignals",
    input.query_document_signals.validation_state,
  );

  const queryRelevanceCalculation =
    calculateQueryRelevance(
      input.query_profile,
      input.query_document_signals,
      policy,
    );

  const queryRelevanceScore =
    buildQueryRelevanceSubScore({
      document_id:
        input.query_document_signals.document_id,

      query_id:
        input.query_document_signals.query_id,

      created_at:
        input.created_at,

      calculation:
        queryRelevanceCalculation,
    });

  const validationState =
    resolveOutputValidationState({
      query_profile_state:
        input.query_profile.validation_state,

      query_document_signals_state:
        input.query_document_signals.validation_state,

      query_relevance_score:
        queryRelevanceScore,
    });

  const degradationReasons =
    collectDegradationReasons({
      query_profile:
        input.query_profile,

      query_document_signals:
        input.query_document_signals,

      query_relevance_score:
        queryRelevanceScore,
    });

  return Object.freeze({
    contract_version:
      XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_CONTRACT_VERSION,

    created_at:
      input.created_at,

    document_id:
      input.query_document_signals.document_id,

    query_id:
      input.query_document_signals.query_id,

    query_relevance_score:
      queryRelevanceScore,

    scorer_module_version:
      XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_MODULE_VERSION,

    scoring_policy_version:
      policy.policy_version,

    validation_state:
      validationState,

    degradation_reasons:
      degradationReasons,
  });
}
