/* ============================================================================
 * FILE:
  lib/xyvala/search/domains/financial-news/search-financial-news-runtime-policy-artifact-values.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search Financial News v1 runtime policy artifact values
 *
 * ROLE
 * - own the explicit Financial News v1 values for the eleven NON-CALIBRATION
 *   externally governed Search runtime policies
 * - preserve canonical producer contracts by deriving every policy type from
 *   SearchFinancialNewsRuntimePolicyArtifacts
 * - require explicit canonical bindings where a value depends on upstream
 *   contract identities that this domain module must not invent
 * - materialize the eleven policies through
 *   createSearchFinancialNewsRuntimePolicyArtifacts(...)
 *
 * CLASSIFICATION
 * - SEARCH DOMAIN
 * - FINANCIAL NEWS
 * - POLICY GOVERNANCE
 * - DOMAIN POLICY VALUE OWNER
 * - NON-CALIBRATION
 * - CONFIGURATION
 * - DETERMINISTIC
 * - IMMUTABLE
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING EXECUTION
 * - NON-TRANSFORMING EXECUTION
 * - NON-CALIBRATING
 * - NON-EXECUTING
 * - NON-OBSERVATION-PRODUCING
 * - NON-TRACE-PRODUCING
 * - NON-LINEAGE-PRODUCING
 * - NON-IDENTITY-PRODUCING
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * canonical Search producer policy contracts
 *        +
 * Financial News v1 explicit governance decisions
 *        +
 * explicit canonical bindings for unresolved upstream identities
 *        ↓
 * THIS MODULE
 *        ↓
 * eleven Financial News non-calibration policy values
 *        ↓
 * createSearchFinancialNewsRuntimePolicyArtifacts(...)
 *        ↓
 * SearchFinancialNewsRuntimePolicyArtifacts
 *        +
 * separate Behavioral Calibration policy artifact
 *        ↓
 * search-financial-news-runtime-policy-assembly.ts
 *
 * IMPORTANT — DOMAIN VALUES ARE NOT PRODUCER DEFAULTS
 * ----------------------------------------------------------------------------
 * Values defined here are explicit Financial News v1 governance decisions.
 *
 * They are NOT:
 * - canonical producer defaults;
 * - hidden fallbacks;
 * - calibration outputs;
 * - reconstructed runtime truths.
 *
 * The canonical producer remains owner of:
 * - policy contract shape;
 * - policy semantic validation;
 * - analytical/scoring behavior.
 *
 * This module owns only the active Financial News v1 value selection for the
 * eleven non-calibration externally governed policies.
 *
 * BEHAVIORAL CALIBRATION EXCLUSION
 * ----------------------------------------------------------------------------
 * behavioral_calibration_scoring_policy MUST NOT appear here.
 *
 * Its value remains owned by the separate authorized calibration /
 * configuration lifecycle and enters runtime through:
 *
 * search-financial-news-behavioral-calibration-policy-artifact.ts
 *
 * CONTRACT-DEPENDENT BINDINGS
 * ----------------------------------------------------------------------------
 * Three values are intentionally NOT guessed here:
 *
 * 1. analytical_overlap_group_caps
 *    - overlap-group identities originate in canonical score producers;
 *    - this module must not invent group names that may not correspond to
 *      observable producer overlap groups.
 *
 * 2. cohort_normalization_method
 *    - the exact literal domain belongs to SearchCohortDistribution /
 *      SearchCohortNormalizationPolicy;
 *    - this module consumes one explicitly authorized canonical value.
 *
 * 3. public_availability_priority
 *    - SearchAvailabilityState is a canonical public contract domain;
 *    - this module does not reconstruct that domain from memory or inference.
 *
 * Requiring these bindings is deliberate Contract Before Runtime behavior.
 * Missing bindings are configuration divergence, not an excuse to invent
 * values.
 *
 * POLICY DESIGN — FINANCIAL NEWS V1
 * ----------------------------------------------------------------------------
 * Behavioral Signals
 * - require a meaningful impression sample before CALIBRATED state;
 * - 200 impressions is deliberately conservative for v1.
 *
 * Link Authority
 * - reward source diversity and useful anchor convergence;
 * - penalize reciprocal-link concentration, suspected clusters and repeated
 *   anchor-text concentration;
 * - allow partial evidence with explicit renormalization;
 * - require at least two available features and 50% requested weight coverage.
 *
 * Penalty Evaluation
 * - permit short legitimate financial briefs while penalizing very low volume;
 * - keep critical thresholds strictly beyond ordinary thresholds;
 * - preserve degraded/unvalidated evidence as lower-confidence evidence rather
 *   than converting absence to zero.
 *
 * Analytical Aggregation
 * - query relevance and document quality receive the largest requested
 *   weights;
 * - missing score truth never becomes zero;
 * - DEGRADE_CONFIDENCE preserves legitimate partial evidence;
 * - EFFECTIVE_WEIGHTED_MEAN keeps confidence tied to included evidence.
 *
 * Eligibility
 * - ranking is less strict than private ALLOW;
 * - degraded global score may rank;
 * - degraded global score may NOT authorize ALLOW.
 *
 * Cohort
 * - canonical score ties remain legitimate;
 * - require_distinct_scores is therefore false;
 * - relative evaluation uses the only currently authorized canonical methods:
 *   COMPETITION / MIDRANK / ADJACENT_ELIGIBLE_RAW_SCORE.
 *
 * Private Decision
 * - ALLOW only above a high relative percentile and confidence;
 * - this policy does NOT create BLOCK.
 *
 * Public Transformation
 * - public labels remain descriptive;
 * - public thresholds do not leak back into private decision or aggregation;
 * - FIRST_HEADING is the preferred controlled title fallback.
 *
 * Public Ranking
 * - relevance dominates evidence, then availability;
 * - final public position remains owned by Public Ranking.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * invalid/missing canonical binding
 * => THIS module
 *
 * policy object incompatible with canonical contract
 * => compile-time `satisfies` divergence
 *
 * malformed policy semantics
 * => canonical producer/runtime policy validator
 *
 * Behavioral Calibration requested here
 * => architectural ownership violation
 *
 * runtime attempts to mutate these values
 * => architectural violation
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - explicit Financial News v1 values only
 * - exact canonical policy types
 * - immutable policy objects
 * - canonical artifact boundary only
 * - no Behavioral Calibration
 *
 * - no implicit default
 * - no fallback
 * - no runtime inference
 * - no observation-derived policy
 * - no current-cycle calibration
 * - no downstream reconstruction
 *
 * - no Date.now()
 * - no new Date()
 * - no randomUUID()
 * - no randomness
 * - no persistence
 * - no mutable global state
 * - no cache mutation
 * - no logging
 * - no network access
 * - no file-system access
 *
 * PROTOCOL
 * ----------------------------------------------------------------------------
 * - Xyvala Search Protocol 3.1
 * - Search VLR OFFICIAL / NORMATIVE
 * - Contract Before Runtime
 * - First Divergence Before Correction
 * - reality before interpretation
 * - one truth = one canonical owner
 * - no downstream reconstruction
 * - explicit availability
 * - unavailable != zero
 * - calibration outside current analytical cycle
 * - Configuration != Composition != Execution
 * ========================================================================== */

import type {
  SearchModuleVersion,
} from "../../contracts/search-pipeline-contract";

import {
  createSearchFinancialNewsRuntimePolicyArtifacts,
  type SearchFinancialNewsRuntimePolicyArtifacts,
} from "./search-financial-news-runtime-policy-artifacts";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACT_VALUES_MODULE_NAME =
  "xyvala-search-financial-news-runtime-policy-artifact-values" as const;

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACT_VALUES_MODULE_VERSION:
  SearchModuleVersion =
    "2.0.0";

/*
 * Version identities are deliberately separated:
 *
 * - POLICY_SET_SCHEMA_VERSION identifies the required eleven-policy shape.
 * - RUNTIME_POLICY_VALUES_VERSION identifies the selected policy-set values.
 * - LEGACY_POLICY_VALUE_VERSION_V1 preserves the unchanged value identity of
 *   the ten policies that already existed before Recency governance.
 * - RECENCY_POLICY_VALUE_VERSION identifies the Recency policy itself.
 *
 * Equal version strings would not transfer ownership between these identities.
 */
export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_SET_SCHEMA_VERSION =
  "2.0.0" as const;

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_VALUES_VERSION =
  "2.0.0" as const;

export const XYVALA_SEARCH_FINANCIAL_NEWS_LEGACY_POLICY_VALUE_VERSION_V1 =
  "1.0.0" as const;

export const XYVALA_SEARCH_FINANCIAL_NEWS_RECENCY_POLICY_VALUE_VERSION =
  "1.0.0" as const;

/* ============================================================================
 * 2. CANONICAL POLICY TYPE ALIASES
 * ----------------------------------------------------------------------------
 * These aliases derive directly from the already-canonical artifact contract.
 * No producer policy interface is duplicated here.
 * ========================================================================== */

type SearchFinancialNewsBehavioralSignalsPolicy =
  SearchFinancialNewsRuntimePolicyArtifacts[
    "behavioral_signals_policy"
  ];

type SearchFinancialNewsLinkAuthorityScoringPolicy =
  SearchFinancialNewsRuntimePolicyArtifacts[
    "link_authority_scoring_policy"
  ];

type SearchFinancialNewsPenaltyEvaluationPolicy =
  SearchFinancialNewsRuntimePolicyArtifacts[
    "penalty_evaluation_policy"
  ];

type SearchFinancialNewsAnalyticalAggregationPolicy =
  SearchFinancialNewsRuntimePolicyArtifacts[
    "analytical_aggregation_policy"
  ];

type SearchFinancialNewsEligibilityEvaluationPolicy =
  SearchFinancialNewsRuntimePolicyArtifacts[
    "eligibility_evaluation_policy"
  ];

type SearchFinancialNewsCohortNormalizationPolicy =
  SearchFinancialNewsRuntimePolicyArtifacts[
    "cohort_normalization_policy"
  ];

type SearchFinancialNewsRelativeCohortEvaluationPolicy =
  SearchFinancialNewsRuntimePolicyArtifacts[
    "relative_cohort_evaluation_policy"
  ];

type SearchFinancialNewsPrivateDecisionPolicy =
  SearchFinancialNewsRuntimePolicyArtifacts[
    "private_decision_policy"
  ];

type SearchFinancialNewsPublicTransformationPolicy =
  SearchFinancialNewsRuntimePolicyArtifacts[
    "public_transformation_policy"
  ];

type SearchFinancialNewsPublicRankingPolicy =
  SearchFinancialNewsRuntimePolicyArtifacts[
    "public_ranking_policy"
  ];

type SearchFinancialNewsRecencyPolicy =
  SearchFinancialNewsRuntimePolicyArtifacts[
    "recency_policy"
  ];

/* ============================================================================
 * 3. EXPLICIT CANONICAL BINDINGS
 * ----------------------------------------------------------------------------
 * These values depend on canonical domains that this module must not invent.
 * ========================================================================== */

export interface SearchFinancialNewsRuntimePolicyArtifactValueBindings {
  readonly analytical_overlap_group_caps:
    SearchFinancialNewsAnalyticalAggregationPolicy[
      "overlap_group_caps"
    ];

  readonly cohort_normalization_method:
    SearchFinancialNewsCohortNormalizationPolicy[
      "normalization_method"
    ];

  readonly public_availability_priority:
    SearchFinancialNewsPublicRankingPolicy[
      "availability_priority"
    ];
}

/* ============================================================================
 * 4. BINDING ASSERTIONS
 * ----------------------------------------------------------------------------
 * Root-shape only.
 *
 * Exact semantic validation remains owned by canonical producer boundaries.
 * ========================================================================== */

function assertSearchFinancialNewsRuntimePolicyArtifactValueBindings(
  bindings:
    SearchFinancialNewsRuntimePolicyArtifactValueBindings,
): void {
  if (
    bindings ===
      null ||
    typeof bindings !==
      "object" ||
    Array.isArray(
      bindings,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACT_VALUES_MODULE_NAME}] ` +
        "Policy-value binding violation: bindings must be an object.",
    );
  }

  if (
    bindings
      .analytical_overlap_group_caps ===
      null ||
    typeof bindings
      .analytical_overlap_group_caps !==
      "object" ||
    Array.isArray(
      bindings
        .analytical_overlap_group_caps,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACT_VALUES_MODULE_NAME}] ` +
        "Policy-value binding violation: analytical_overlap_group_caps must be an object.",
    );
  }

  if (
    !Array.isArray(
      bindings
        .public_availability_priority,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACT_VALUES_MODULE_NAME}] ` +
        "Policy-value binding violation: public_availability_priority must be an array.",
    );
  }

  if (
    bindings
      .cohort_normalization_method ===
      null ||
    bindings
      .cohort_normalization_method ===
      undefined
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACT_VALUES_MODULE_NAME}] ` +
        "Policy-value binding violation: cohort_normalization_method is required.",
    );
  }
}

/* ============================================================================
 * 5. BEHAVIORAL SIGNALS — FINANCIAL NEWS V1
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_BEHAVIORAL_SIGNALS_POLICY_V1 =
  Object.freeze({
    policy_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_LEGACY_POLICY_VALUE_VERSION_V1,

    minimum_impressions:
      200,
  } satisfies SearchFinancialNewsBehavioralSignalsPolicy);

/* ============================================================================
 * 6. LINK AUTHORITY — FINANCIAL NEWS V1
 * ----------------------------------------------------------------------------
 * Positive evidence:
 * - source diversity
 * - semantically convergent anchor evidence
 *
 * Negative evidence:
 * - reciprocal-link concentration
 * - suspected link clusters
 * - repeated anchor-text concentration
 * ========================================================================== */

const XYVALA_SEARCH_FINANCIAL_NEWS_LINK_AUTHORITY_FEATURES_V1 =
  Object.freeze([
    Object.freeze({
      feature_name:
        "source_diversity_score",

      direction:
        "POSITIVE",

      weight:
        0.30,

      required:
        true,
    }),

    Object.freeze({
      feature_name:
        "anchor_text_convergence_score",

      direction:
        "POSITIVE",

      weight:
        0.15,

      required:
        false,
    }),

    Object.freeze({
      feature_name:
        "reciprocal_link_ratio",

      direction:
        "NEGATIVE",

      weight:
        0.15,

      required:
        false,
    }),

    Object.freeze({
      feature_name:
        "suspected_link_cluster_ratio",

      direction:
        "NEGATIVE",

      weight:
        0.20,

      required:
        false,
    }),

    Object.freeze({
      feature_name:
        "repeated_anchor_text_ratio",

      direction:
        "NEGATIVE",

      weight:
        0.20,

      required:
        false,
    }),
  ] as const);

export const XYVALA_SEARCH_FINANCIAL_NEWS_LINK_AUTHORITY_SCORING_POLICY_V1 =
  Object.freeze({
    policy_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_LEGACY_POLICY_VALUE_VERSION_V1,

    scoring_method:
      "FINANCIAL_NEWS_WEIGHTED_DIRECTIONAL_LINK_AUTHORITY_V1",

    overlap_group:
      "FINANCIAL_NEWS_LINK_AUTHORITY",

    features:
      XYVALA_SEARCH_FINANCIAL_NEWS_LINK_AUTHORITY_FEATURES_V1,

    minimum_available_feature_count:
      2,

    minimum_available_weight_ratio:
      0.50,

    missing_evidence_method:
      "EXCLUDE_AND_RENORMALIZE",
  } satisfies SearchFinancialNewsLinkAuthorityScoringPolicy);

/* ============================================================================
 * 7. PENALTY EVALUATION — FINANCIAL NEWS V1
 * ----------------------------------------------------------------------------
 * Threshold ordering intentionally preserves:
 *
 * critical query coverage <= ordinary minimum query coverage
 * critical manipulation ratios >= ordinary manipulation ratios
 * critical temporal rupture >= ordinary temporal rupture threshold
 * valid confidence >= degraded confidence >= unvalidated confidence
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_PENALTY_EVALUATION_POLICY_V1 =
  Object.freeze({
    policy_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_LEGACY_POLICY_VALUE_VERSION_V1,

    minimum_token_count:
      80,

    minimum_information_density_ratio:
      0.20,

    excessive_repetition_ratio_threshold:
      0.45,

    minimum_query_term_coverage_score:
      0.25,

    critical_query_term_coverage_score:
      0.08,

    minimum_anchor_coverage_ratio:
      0.10,

    minimum_context_convergence_score:
      0.20,

    reciprocal_link_ratio_threshold:
      0.60,

    critical_reciprocal_link_ratio_threshold:
      0.85,

    suspected_link_cluster_ratio_threshold:
      0.50,

    critical_link_cluster_ratio_threshold:
      0.80,

    repeated_anchor_text_ratio_threshold:
      0.55,

    critical_repeated_anchor_text_ratio_threshold:
      0.85,

    temporal_rupture_penalty_threshold:
      0.60,

    critical_temporal_rupture_threshold:
      0.85,

    maximum_total_penalty:
      0.75,

    valid_evidence_confidence:
      0.90,

    degraded_evidence_confidence:
      0.60,

    unvalidated_evidence_confidence:
      0.30,
  } satisfies SearchFinancialNewsPenaltyEvaluationPolicy);

/* ============================================================================
 * 8. ANALYTICAL AGGREGATION — STATIC FINANCIAL NEWS V1 VALUES
 * ----------------------------------------------------------------------------
 * Requested weights sum to 1.00.
 *
 * Overlap-group caps are bound separately because their keys must correspond
 * to actual canonical producer overlap-group identities.
 * ========================================================================== */

const XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_SCORE_WEIGHTS_V1 =
  Object.freeze({
    lexical_score:
      0.07,

    anchor_score:
      0.07,

    occurrence_score:
      0.06,

    frequency_score:
      0.06,

    convergence_score:
      0.07,

    correlation_score:
      0.05,

    duration_score:
      0.05,

    query_relevance_score:
      0.22,

    link_authority_score:
      0.10,

    behavioral_calibration_score:
      0.05,

    document_quality_score:
      0.20,
  } satisfies SearchFinancialNewsAnalyticalAggregationPolicy[
    "score_weights"
  ]);

/* ============================================================================
 * 9. ELIGIBILITY — FINANCIAL NEWS V1
 * ----------------------------------------------------------------------------
 * ALLOW is intentionally stricter than ranking.
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_ELIGIBILITY_EVALUATION_POLICY_V1 =
  Object.freeze({
    policy_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_LEGACY_POLICY_VALUE_VERSION_V1,

    minimum_ranking_confidence:
      0.45,

    minimum_allow_confidence:
      0.70,

    minimum_ranking_query_relevance:
      0.40,

    minimum_allow_query_relevance:
      0.60,

    degraded_global_score_ranking_allowed:
      true,

    degraded_global_score_allow_allowed:
      false,
  } satisfies SearchFinancialNewsEligibilityEvaluationPolicy);

/* ============================================================================
 * 10. RELATIVE COHORT — FINANCIAL NEWS V1
 * ----------------------------------------------------------------------------
 * These are the currently authorized canonical methods.
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RELATIVE_COHORT_EVALUATION_POLICY_V1 =
  Object.freeze({
    policy_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_LEGACY_POLICY_VALUE_VERSION_V1,

    relative_position_tie_method:
      "COMPETITION",

    percentile_method:
      "MIDRANK",

    neighbour_distance_method:
      "ADJACENT_ELIGIBLE_RAW_SCORE",
  } satisfies SearchFinancialNewsRelativeCohortEvaluationPolicy);

/* ============================================================================
 * 11. PRIVATE DECISION — FINANCIAL NEWS V1
 * ----------------------------------------------------------------------------
 * SearchPercentile is expressed on the canonical 0..100 percentile scale.
 *
 * This policy governs ALLOW only.
 * It does not create BLOCK.
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_PRIVATE_DECISION_POLICY_V1 =
  Object.freeze({
    policy_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_LEGACY_POLICY_VALUE_VERSION_V1,

    minimum_allow_percentile:
      75,

    minimum_allow_confidence:
      0.70,
  } satisfies SearchFinancialNewsPrivateDecisionPolicy);

/* ============================================================================
 * 12. PUBLIC TRANSFORMATION — FINANCIAL NEWS V1
 * ----------------------------------------------------------------------------
 * Public descriptive labels only.
 *
 * These thresholds MUST NOT be reused as:
 * - private-decision thresholds;
 * - aggregation thresholds;
 * - calibration thresholds;
 * - public-ranking score reconstruction.
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_PUBLIC_TRANSFORMATION_POLICY_V1 =
  Object.freeze({
    policy_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_LEGACY_POLICY_VALUE_VERSION_V1,

    high_relevance_min:
      0.80,

    relevant_min:
      0.60,

    contextual_min:
      0.40,

    strong_document_match_min:
      0.75,

    anchor_support_min:
      0.60,

    source_support_min:
      0.55,

    maximum_excerpt_count:
      3,

    maximum_excerpt_length:
      280,

    maximum_title_length:
      160,

    title_fallback_mode:
      "FIRST_HEADING",

    include_source_domain:
      true,
  } satisfies SearchFinancialNewsPublicTransformationPolicy);

/* ============================================================================
 * 13. PUBLIC RANKING — STATIC FINANCIAL NEWS V1 PRIORITIES
 * ----------------------------------------------------------------------------
 * availability_priority is injected from the exact canonical
 * SearchAvailabilityState domain rather than reconstructed locally.
 * ========================================================================== */

const XYVALA_SEARCH_FINANCIAL_NEWS_PUBLIC_RELEVANCE_PRIORITY_V1 =
  Object.freeze([
    "HIGH_RELEVANCE",
    "RELEVANT",
    "CONTEXTUAL",
    "LIMITED_RELEVANCE",
    "UNAVAILABLE",
  ] as const satisfies SearchFinancialNewsPublicRankingPolicy[
    "relevance_priority"
  ]);

const XYVALA_SEARCH_FINANCIAL_NEWS_PUBLIC_EVIDENCE_PRIORITY_V1 =
  Object.freeze([
    "STRONG_DOCUMENT_MATCH",
    "ANCHOR_SUPPORTED",
    "SOURCE_SUPPORTED",
    "LIMITED_EVIDENCE",
    "INSUFFICIENT_DATA",
  ] as const satisfies SearchFinancialNewsPublicRankingPolicy[
    "evidence_priority"
  ]);

/* ============================================================================
 * 14. FINANCIAL NEWS RECENCY — CANONICAL GOVERNED VALUE
 * ----------------------------------------------------------------------------
 * This policy applies the already-established inclusive 24H / 7D convention.
 *
 * It does not:
 * - read a clock;
 * - recompute publication age;
 * - activate the Recency producer;
 * - create a runtime binding;
 * - authorize Search -> MCI.
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RECENCY_POLICY_V1 =
  Object.freeze({
    policy_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RECENCY_POLICY_VALUE_VERSION,

    within_24h_max_age_ms:
      86_400_000,

    within_7d_max_age_ms:
      604_800_000,

    boundaries_inclusive:
      true,
  } satisfies SearchFinancialNewsRecencyPolicy);

/* ============================================================================
 * 15. DEPENDENT POLICY MATERIALIZATION
 * ----------------------------------------------------------------------------
 * Three policy values consume explicit canonical bindings:
 *
 * - analytical overlap-group caps
 * - cohort normalization method
 * - public availability priority
 *
 * No fallback exists.
 * ========================================================================== */

function createSearchFinancialNewsAnalyticalAggregationPolicyV1(
  bindings:
    SearchFinancialNewsRuntimePolicyArtifactValueBindings,
): SearchFinancialNewsAnalyticalAggregationPolicy {
  return Object.freeze({
    policy_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_LEGACY_POLICY_VALUE_VERSION_V1,

    score_weights:
      XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_SCORE_WEIGHTS_V1,

    overlap_group_caps:
      bindings
        .analytical_overlap_group_caps,

    missing_score_handling_method:
      "DEGRADE_CONFIDENCE",

    aggregate_confidence_method:
      "EFFECTIVE_WEIGHTED_MEAN",
  } satisfies SearchFinancialNewsAnalyticalAggregationPolicy);
}

function createSearchFinancialNewsCohortNormalizationPolicyV1(
  bindings:
    SearchFinancialNewsRuntimePolicyArtifactValueBindings,
): SearchFinancialNewsCohortNormalizationPolicy {
  return Object.freeze({
    policy_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_LEGACY_POLICY_VALUE_VERSION_V1,

    normalization_method:
      bindings
        .cohort_normalization_method,

    require_distinct_scores:
      false,
  } satisfies SearchFinancialNewsCohortNormalizationPolicy);
}

function createSearchFinancialNewsPublicRankingPolicyV1(
  bindings:
    SearchFinancialNewsRuntimePolicyArtifactValueBindings,
): SearchFinancialNewsPublicRankingPolicy {
  return Object.freeze({
    policy_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_LEGACY_POLICY_VALUE_VERSION_V1,

    relevance_priority:
      XYVALA_SEARCH_FINANCIAL_NEWS_PUBLIC_RELEVANCE_PRIORITY_V1,

    evidence_priority:
      XYVALA_SEARCH_FINANCIAL_NEWS_PUBLIC_EVIDENCE_PRIORITY_V1,

    availability_priority:
      bindings
        .public_availability_priority,

    maximum_result_count:
      20,
  } satisfies SearchFinancialNewsPublicRankingPolicy);
}

/* ============================================================================
 * 16. COMPLETE FINANCIAL NEWS V2 NON-CALIBRATION POLICY VALUE SET
 * ----------------------------------------------------------------------------
 * This is the only authorized public factory in this module.
 *
 * It creates exactly eleven policy values and immediately routes them through the
 * canonical Financial News runtime-policy artifact boundary.
 * ========================================================================== */

export function createSearchFinancialNewsRuntimePolicyArtifactValues(
  bindings:
    SearchFinancialNewsRuntimePolicyArtifactValueBindings,
): SearchFinancialNewsRuntimePolicyArtifacts {
  assertSearchFinancialNewsRuntimePolicyArtifactValueBindings(
    bindings,
  );

  const analyticalAggregationPolicy =
    createSearchFinancialNewsAnalyticalAggregationPolicyV1(
      bindings,
    );

  const cohortNormalizationPolicy =
    createSearchFinancialNewsCohortNormalizationPolicyV1(
      bindings,
    );

  const publicRankingPolicy =
    createSearchFinancialNewsPublicRankingPolicyV1(
      bindings,
    );

  return createSearchFinancialNewsRuntimePolicyArtifacts({
    behavioral_signals_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_BEHAVIORAL_SIGNALS_POLICY_V1,

    link_authority_scoring_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_LINK_AUTHORITY_SCORING_POLICY_V1,

    penalty_evaluation_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_PENALTY_EVALUATION_POLICY_V1,

    analytical_aggregation_policy:
      analyticalAggregationPolicy,

    eligibility_evaluation_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_ELIGIBILITY_EVALUATION_POLICY_V1,

    cohort_normalization_policy:
      cohortNormalizationPolicy,

    relative_cohort_evaluation_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_RELATIVE_COHORT_EVALUATION_POLICY_V1,

    private_decision_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_PRIVATE_DECISION_POLICY_V1,

    public_transformation_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_PUBLIC_TRANSFORMATION_POLICY_V1,

    public_ranking_policy:
      publicRankingPolicy,

    recency_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_RECENCY_POLICY_V1,
  });
}

/* ============================================================================
 * 17. STATIC POLICY MANIFEST
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACT_VALUES_MANIFEST =
  Object.freeze({
    policy_set:
      "FINANCIAL_NEWS_NON_CALIBRATION_RUNTIME_POLICY_VALUES_V2",

    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACT_VALUES_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACT_VALUES_MODULE_VERSION,

    policy_set_schema_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_SET_SCHEMA_VERSION,

    policy_set_values_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_VALUES_VERSION,

    policy_values_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_VALUES_VERSION,

    legacy_policy_value_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_LEGACY_POLICY_VALUE_VERSION_V1,

    recency_policy_value_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RECENCY_POLICY_VALUE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    policy_count:
      11,

    behavioral_calibration_included:
      false,

    fully_domain_owned_static_policy_count:
      8,

    contract_bound_policy_count:
      3,

    contract_bound_values:
      Object.freeze([
        "analytical_overlap_group_caps",
        "cohort_normalization_method",
        "public_availability_priority",
      ] as const),

    missing_score_handling:
      "DEGRADE_CONFIDENCE",

    aggregate_confidence_method:
      "EFFECTIVE_WEIGHTED_MEAN",

    cohort_ties_allowed:
      true,

    degraded_ranking_allowed:
      true,

    degraded_allow_allowed:
      false,

    current_cycle_calibration:
      false,

    runtime_inference:
      false,
  } as const);

/* ============================================================================
 * 18. STATIC OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACT_VALUES_OWNERSHIP =
  Object.freeze({
    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACT_VALUES_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACT_VALUES_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    architectural_plane:
      "GOVERNANCE_PLANE",

    architectural_role:
      "DOMAIN_NON_CALIBRATION_POLICY_VALUE_OWNER",

    canonical_policy_contract_owner:
      "CANONICAL_SEARCH_PRODUCERS",

    financial_news_policy_value_owner:
      "FINANCIAL_NEWS_POLICY_GOVERNANCE",

    behavioral_calibration_policy_value_owner:
      "AUTHORIZED_CALIBRATION_OR_CONFIGURATION_LIFECYCLE",

    canonical_artifact_boundary:
      "FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACTS",

    policy_values_created_here:
      true,

    producer_policy_contracts_created_here:
      false,

    producer_defaults_created_here:
      false,

    behavioral_calibration_created_here:
      false,

    analytical_truth_created_here:
      false,

    observation_consumed_here:
      false,

    runtime_execution_started_here:
      false,

    execution_trace_created_here:
      false,

    variable_lineage_created_here:
      false,

    runtime_clock_read:
      false,

    random_identity_generated:
      false,

    persistence_performed:
      false,

    mutable_global_state_created:
      false,
  } as const);

/* ============================================================================
 * 18. STATIC GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACT_VALUES_GOVERNANCE =
  Object.freeze({
    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    reality_before_interpretation:
      true,

    one_policy_truth_one_owner:
      true,

    explicit_domain_policy_values_required:
      true,

    exact_canonical_policy_types_required:
      true,

    canonical_artifact_boundary_required:
      true,

    behavioral_calibration_separation_required:
      true,

    unresolved_canonical_identity_invention_allowed:
      false,

    contract_dependent_binding_required:
      true,

    producer_default_claim_allowed:
      false,

    implicit_default_allowed:
      false,

    fallback_allowed:
      false,

    runtime_policy_inference_allowed:
      false,

    observation_derived_policy_allowed:
      false,

    current_run_calibration_allowed:
      false,

    current_run_policy_mutation_allowed:
      false,

    missing_evidence_as_zero_allowed:
      false,

    missing_evidence_as_neutral_allowed:
      false,

    policy_contract_duplication_allowed:
      false,

    analytical_recalculation_allowed:
      false,

    scoring_execution_allowed:
      false,

    ranking_execution_allowed:
      false,

    transformation_execution_allowed:
      false,

    runtime_execution_allowed:
      false,

    execution_trace_generation_allowed:
      false,

    variable_lineage_generation_allowed:
      false,

    runtime_clock_access_allowed:
      false,

    random_identity_generation_allowed:
      false,

    persistence_allowed:
      false,

    mutable_global_state_allowed:
      false,

    cache_mutation_allowed:
      false,

    logging_allowed:
      false,

    network_access_allowed:
      false,

    file_system_access_allowed:
      false,

    prohibited_shortcuts:
      Object.freeze([
        "behavioral_calibration_inside_non_calibration_values",
        "claim_domain_value_is_producer_default",

        "invent_overlap_group_identity",
        "invent_cohort_normalization_method",
        "invent_search_availability_state",

        "implicit_default_policy",
        "missing_policy_fallback",
        "runtime_policy_inference",
        "observation_derived_policy",
        "current_run_calibration",
        "current_run_policy_mutation",

        "missing_evidence_to_zero",
        "missing_evidence_to_neutral",

        "duplicate_producer_policy_contract",
        "analytical_recalculation",
        "score_reconstruction",
        "ranking_reconstruction",
        "public_transformation_reconstruction",

        "execution_trace_generation",
        "variable_lineage_generation",

        "runtime_clock_access",
        "random_identity_generation",

        "persistence",
        "mutable_global_state",
        "cache_mutation",
        "logging",
        "network_access",
      ] as const),
  } as const);
