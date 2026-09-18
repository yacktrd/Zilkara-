/* ============================================================================
 * FILE: lib/xyvala/search/domains/financial-news/search-financial-news-analytical-overlap-group-caps.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search Financial News analytical overlap-group caps
 *
 * ROLE
 * - own the explicit Financial News v1 cap values applied by Analytical
 *   Aggregation to canonical score overlap groups
 * - preserve canonical overlap-group identities exactly as emitted by their
 *   owning scorers or active policies
 * - prevent demonstrated correlated score families from being counted as
 *   fully independent evidence
 *
 * CLASSIFICATION
 * - SEARCH DOMAIN
 * - FINANCIAL NEWS
 * - POLICY GOVERNANCE
 * - ANALYTICAL AGGREGATION POLICY INPUT
 * - DETERMINISTIC
 * - IMMUTABLE
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-AGGREGATING
 * - NON-CALIBRATING
 * - NON-EXECUTING
 * - NON-MUTATING
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * canonical scorer-owned overlap-group identities
 *        +
 * active policy-owned overlap-group identities
 *        +
 * explicit Financial News v1 cap decisions
 *        ↓
 * THIS MODULE
 *        ↓
 * analytical_overlap_group_caps
 *        ↓
 * search-financial-news-runtime-policy-binding-values.ts
 *        ↓
 * search-financial-news-runtime-policy-artifact-values.ts
 *        ↓
 * SearchAnalyticalAggregationPolicy.overlap_group_caps
 *
 * OWNERSHIP MODEL
 * ----------------------------------------------------------------------------
 * Overlap-group IDENTITIES remain owned by:
 * - canonical scorers, when emitted directly by scorer code;
 * - the active scoring policy, when the scorer transports
 *   input.policy.overlap_group.
 *
 * This module owns ONLY:
 * - Financial News v1 CAP VALUES for those already-canonical identities.
 *
 * It does NOT own or redefine scorer identity truth.
 *
 * CANONICAL SCORE -> OVERLAP GROUP MAP
 * ----------------------------------------------------------------------------
 *
 * lexical_score
 * -> intrinsic_lexical_structure
 *
 * anchor_score
 * -> intrinsic_anchor_structure
 *
 * occurrence_score
 * -> intrinsic_frequency_occurrence
 *
 * frequency_score
 * -> intrinsic_frequency_occurrence
 *
 * convergence_score
 * -> intrinsic_anchor_convergence
 *
 * document_quality_score
 * -> intrinsic_document_quality
 *
 * correlation_score
 * -> temporal_evolution_coherence
 *
 * duration_score
 * -> temporal_persistence_duration
 *
 * query_relevance_score
 * -> query_relevance_evidence
 *
 * link_authority_score
 * -> active Financial News Link Authority policy overlap_group
 *
 * behavioral_calibration_score
 * -> active Financial News Behavioral Calibration bootstrap policy
 *    overlap_group
 *
 * IMPORTANT — 11 SCORES != 11 INDEPENDENT REALITIES
 * ----------------------------------------------------------------------------
 * occurrence_score and frequency_score both belong to:
 *
 *   intrinsic_frequency_occurrence
 *
 * Their requested Financial News v1 aggregation weights are:
 *
 *   occurrence_score = 0.06
 *   frequency_score  = 0.06
 *
 * Requested group weight:
 *
 *   0.12
 *
 * Financial News v1 cap:
 *
 *   0.10
 *
 * This is the only deliberately restrictive cap in v1.
 *
 * The cap prevents correlated occurrence/frequency evidence from receiving the
 * full weight of two independent analytical realities.
 *
 * All other current groups contain one canonical score and therefore receive a
 * cap equal to that score's current requested Financial News v1 weight.
 *
 * This avoids arbitrary attenuation where no overlap has been demonstrated.
 *
 * POLICY-OWNED GROUP IDENTITIES
 * ----------------------------------------------------------------------------
 * Link Authority:
 * - derived directly from
 *   XYVALA_SEARCH_FINANCIAL_NEWS_LINK_AUTHORITY_SCORING_POLICY_V1.overlap_group
 *
 * Behavioral Calibration:
 * - derived directly from
 *   XYVALA_SEARCH_FINANCIAL_NEWS_BEHAVIORAL_CALIBRATION_OVERLAP_GROUP_V1
 *
 * No downstream string reconstruction is authorized.
 *
 * CAP VALUES — FINANCIAL NEWS V1
 * ----------------------------------------------------------------------------
 *
 * intrinsic_lexical_structure
 * -> 0.07
 *
 * intrinsic_anchor_structure
 * -> 0.07
 *
 * intrinsic_frequency_occurrence
 * -> 0.10
 *
 * intrinsic_anchor_convergence
 * -> 0.07
 *
 * intrinsic_document_quality
 * -> 0.20
 *
 * temporal_evolution_coherence
 * -> 0.05
 *
 * temporal_persistence_duration
 * -> 0.05
 *
 * query_relevance_evidence
 * -> 0.22
 *
 * active Link Authority policy group
 * -> 0.10
 *
 * active Behavioral Calibration bootstrap policy group
 * -> 0.05
 *
 * IMPORTANT — CAP != SCORE WEIGHT
 * ----------------------------------------------------------------------------
 * A cap is a maximum effective group contribution.
 *
 * It MUST NOT:
 * - rewrite source score weights;
 * - mutate source scores;
 * - create a missing score;
 * - convert unavailable evidence to zero;
 * - alter scorer overlap_group identities;
 * - infer analytical truth downstream.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * canonical SearchScoreName domain changes
 * => compile-time score/group-map divergence here
 *
 * canonical scorer overlap_group changes
 * => scorer-owned identity divergence; this policy must be explicitly reviewed
 *
 * active Link Authority policy overlap_group changes
 * => imported policy-owned identity changes here
 *
 * active Behavioral Calibration policy overlap_group changes
 * => imported policy-owned identity changes here
 *
 * cap decision changes
 * => new Financial News policy version required
 *
 * This module MUST NOT silently repair divergence.
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - exact canonical score-name coverage
 * - exact canonical overlap-group references
 * - explicit Financial News cap decisions
 * - one demonstrated correlated group receives one explicit restrictive cap
 * - immutable result
 *
 * - no overlap-group inference from score names
 * - no overlap-group inference from module names
 * - no catch-all group
 * - no implicit default
 * - no score mutation
 * - no score reconstruction
 * - no aggregation execution
 * - no calibration
 * - no runtime execution
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
 * - Xyvala Search Protocol 3.0
 * - Search VLR OFFICIAL / NORMATIVE
 * - Contract Before Runtime
 * - First Divergence Before Correction
 * - reality before interpretation
 * - one truth = one canonical owner
 * - no downstream reconstruction
 * - explicit availability
 * - unavailable != zero
 * - invalid != unavailable
 * - missing != unavailable
 * - Configuration != Composition != Execution
 * ========================================================================== */

import type {
  SearchModuleVersion,
  SearchScoreName,
} from "../../contracts/search-pipeline-contract";

import {
  XYVALA_SEARCH_FINANCIAL_NEWS_BEHAVIORAL_CALIBRATION_OVERLAP_GROUP_V1,
} from "./search-financial-news-behavioral-calibration-bootstrap-policy";

import {
  XYVALA_SEARCH_FINANCIAL_NEWS_LINK_AUTHORITY_SCORING_POLICY_V1,
  type SearchFinancialNewsRuntimePolicyArtifactValueBindings,
} from "./search-financial-news-runtime-policy-artifact-values";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_MODULE_NAME =
  "xyvala-search-financial-news-analytical-overlap-group-caps" as const;

export const XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

export const XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_POLICY_VERSION =
  "1.0.0" as const;

/* ============================================================================
 * 2. CANONICAL TARGET TYPE
 * ----------------------------------------------------------------------------
 * Derived from the already-authorized Financial News artifact-value binding
 * contract.
 * ========================================================================== */

export type SearchFinancialNewsAnalyticalOverlapGroupCaps =
  SearchFinancialNewsRuntimePolicyArtifactValueBindings[
    "analytical_overlap_group_caps"
  ];

type SearchFinancialNewsAnalyticalOverlapGroupCapValue =
  SearchFinancialNewsAnalyticalOverlapGroupCaps[
    string
  ];

/* ============================================================================
 * 3. POLICY-OWNED GROUP REFERENCES
 * ----------------------------------------------------------------------------
 * Exact references only.
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_LINK_AUTHORITY_OVERLAP_GROUP_V1 =
  XYVALA_SEARCH_FINANCIAL_NEWS_LINK_AUTHORITY_SCORING_POLICY_V1
    .overlap_group;

export const XYVALA_SEARCH_FINANCIAL_NEWS_ACTIVE_BEHAVIORAL_CALIBRATION_OVERLAP_GROUP_V1 =
  XYVALA_SEARCH_FINANCIAL_NEWS_BEHAVIORAL_CALIBRATION_OVERLAP_GROUP_V1;

/* ============================================================================
 * 4. FINANCIAL NEWS V1 OVERLAP-GROUP DOMAIN
 * ========================================================================== */

export type SearchFinancialNewsAnalyticalOverlapGroup =
  | "intrinsic_lexical_structure"
  | "intrinsic_anchor_structure"
  | "intrinsic_frequency_occurrence"
  | "intrinsic_anchor_convergence"
  | "intrinsic_document_quality"
  | "temporal_evolution_coherence"
  | "temporal_persistence_duration"
  | "query_relevance_evidence"
  | typeof XYVALA_SEARCH_FINANCIAL_NEWS_LINK_AUTHORITY_OVERLAP_GROUP_V1
  | typeof XYVALA_SEARCH_FINANCIAL_NEWS_ACTIVE_BEHAVIORAL_CALIBRATION_OVERLAP_GROUP_V1;

/* ============================================================================
 * 5. CANONICAL SCORE -> OVERLAP GROUP REGISTRY
 * ----------------------------------------------------------------------------
 * This registry is descriptive governance / policy-binding evidence.
 *
 * It does NOT create scorer output.
 *
 * `satisfies Readonly<Record<SearchScoreName, ...>>` ensures that any future
 * SearchScoreName addition/removal causes a compile-time review here.
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_SCORE_OVERLAP_GROUP_REGISTRY_V1 =
  Object.freeze({
    lexical_score:
      "intrinsic_lexical_structure",

    anchor_score:
      "intrinsic_anchor_structure",

    occurrence_score:
      "intrinsic_frequency_occurrence",

    frequency_score:
      "intrinsic_frequency_occurrence",

    convergence_score:
      "intrinsic_anchor_convergence",

    document_quality_score:
      "intrinsic_document_quality",

    correlation_score:
      "temporal_evolution_coherence",

    duration_score:
      "temporal_persistence_duration",

    query_relevance_score:
      "query_relevance_evidence",

    link_authority_score:
      XYVALA_SEARCH_FINANCIAL_NEWS_LINK_AUTHORITY_OVERLAP_GROUP_V1,

    behavioral_calibration_score:
      XYVALA_SEARCH_FINANCIAL_NEWS_ACTIVE_BEHAVIORAL_CALIBRATION_OVERLAP_GROUP_V1,
  } satisfies Readonly<
    Record<
      SearchScoreName,
      SearchFinancialNewsAnalyticalOverlapGroup
    >
  >);

/* ============================================================================
 * 6. FINANCIAL NEWS V1 CAP VALUES
 * ----------------------------------------------------------------------------
 * Only intrinsic_frequency_occurrence is deliberately restrictive:
 *
 * requested:
 * - occurrence_score 0.06
 * - frequency_score  0.06
 * = 0.12
 *
 * cap:
 * - 0.10
 *
 * Every other v1 cap equals the current requested weight of its sole member
 * score.
 * ========================================================================== */

const XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_V1_EXACT =
  Object.freeze({
    intrinsic_lexical_structure:
      0.07,

    intrinsic_anchor_structure:
      0.07,

    intrinsic_frequency_occurrence:
      0.10,

    intrinsic_anchor_convergence:
      0.07,

    intrinsic_document_quality:
      0.20,

    temporal_evolution_coherence:
      0.05,

    temporal_persistence_duration:
      0.05,

    query_relevance_evidence:
      0.22,

    [XYVALA_SEARCH_FINANCIAL_NEWS_LINK_AUTHORITY_OVERLAP_GROUP_V1]:
      0.10,

    [XYVALA_SEARCH_FINANCIAL_NEWS_ACTIVE_BEHAVIORAL_CALIBRATION_OVERLAP_GROUP_V1]:
      0.05,
  } satisfies Readonly<
    Record<
      SearchFinancialNewsAnalyticalOverlapGroup,
      SearchFinancialNewsAnalyticalOverlapGroupCapValue
    >
  >);

/* ============================================================================
 * 7. CANONICAL CAP BINDING
 * ----------------------------------------------------------------------------
 * Direct assignment is intentional.
 *
 * No cast is used.
 *
 * If the canonical aggregation-policy cap type changes incompatibly,
 * compilation must fail here.
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_V1:
  SearchFinancialNewsAnalyticalOverlapGroupCaps =
    XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_V1_EXACT;

/* ============================================================================
 * 8. EXACT REFERENCE ACCESSOR
 * ----------------------------------------------------------------------------
 * Invariant:
 *
 * result
 * ===
 * XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_V1
 *
 * No clone, merge or normalization is performed.
 * ========================================================================== */

export function getSearchFinancialNewsAnalyticalOverlapGroupCapsV1():
  SearchFinancialNewsAnalyticalOverlapGroupCaps {
  return XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_V1;
}

/* ============================================================================
 * 9. STATIC MANIFEST
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_MANIFEST =
  Object.freeze({
    policy_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_POLICY_VERSION,

    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    canonical_score_count:
      11,

    canonical_overlap_group_count:
      10,

    restrictive_overlap_group_count:
      1,

    restrictive_overlap_group:
      "intrinsic_frequency_occurrence",

    requested_restrictive_group_weight:
      0.12,

    restrictive_group_cap:
      0.10,

    link_authority_overlap_group:
      XYVALA_SEARCH_FINANCIAL_NEWS_LINK_AUTHORITY_OVERLAP_GROUP_V1,

    behavioral_calibration_overlap_group:
      XYVALA_SEARCH_FINANCIAL_NEWS_ACTIVE_BEHAVIORAL_CALIBRATION_OVERLAP_GROUP_V1,

    overlap_group_identity_invention:
      false,

    score_mutation:
      false,

    aggregation_execution:
      false,
  } as const);

/* ============================================================================
 * 10. STATIC OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_OWNERSHIP =
  Object.freeze({
    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    architectural_plane:
      "GOVERNANCE_PLANE",

    architectural_role:
      "DOMAIN_ANALYTICAL_OVERLAP_GROUP_CAP_VALUE_OWNER",

    canonical_target_contract:
      "SearchAnalyticalAggregationPolicy.overlap_group_caps",

    scorer_overlap_group_identity_owner:
      "CANONICAL_SEARCH_SCORERS",

    policy_overlap_group_identity_owner:
      "ACTIVE_AUTHORIZED_SCORING_POLICIES",

    cap_value_owner:
      "FINANCIAL_NEWS_POLICY_GOVERNANCE",

    score_overlap_group_registry_created_here:
      true,

    scorer_overlap_group_identity_created_here:
      false,

    policy_overlap_group_identity_created_here:
      false,

    cap_values_created_here:
      true,

    score_weights_created_here:
      false,

    scores_created_here:
      false,

    scores_mutated_here:
      false,

    aggregation_executed_here:
      false,

    calibration_executed_here:
      false,

    runtime_execution_started_here:
      false,

    runtime_clock_read:
      false,

    persistence_performed:
      false,

    mutable_global_state_created:
      false,
  } as const);

/* ============================================================================
 * 11. STATIC GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_GOVERNANCE =
  Object.freeze({
    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    reality_before_interpretation:
      true,

    one_truth_one_owner:
      true,

    exact_search_score_name_coverage_required:
      true,

    canonical_overlap_group_identity_preservation_required:
      true,

    policy_owned_overlap_group_reference_required:
      true,

    demonstrated_overlap_only:
      true,

    arbitrary_group_attenuation_allowed:
      false,

    overlap_group_invention_allowed:
      false,

    overlap_group_from_score_name_inference_allowed:
      false,

    overlap_group_from_module_name_inference_allowed:
      false,

    catch_all_overlap_group_allowed:
      false,

    score_weight_rewrite_allowed:
      false,

    score_mutation_allowed:
      false,

    unavailable_score_as_zero_allowed:
      false,

    missing_score_creation_allowed:
      false,

    downstream_score_reconstruction_allowed:
      false,

    implicit_cap_fallback_allowed:
      false,

    aggregation_execution_allowed:
      false,

    calibration_allowed:
      false,

    runtime_execution_allowed:
      false,

    runtime_clock_access_allowed:
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
        "invent_overlap_group",
        "derive_overlap_group_from_score_name",
        "derive_overlap_group_from_module_name",
        "catch_all_overlap_group",
        "arbitrary_group_attenuation",
        "rewrite_score_weight",
        "mutate_source_score",
        "unavailable_score_to_zero",
        "create_missing_score",
        "reconstruct_score_downstream",
        "implicit_cap_fallback",
        "aggregation_execution",
        "current_cycle_calibration",
        "runtime_clock_access",
        "persistence",
        "mutable_global_state",
        "cache_mutation",
        "logging",
        "network_access",
      ] as const),
  } as const);
