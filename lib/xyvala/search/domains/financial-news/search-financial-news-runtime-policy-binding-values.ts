/* ============================================================================
 * FILE: lib/xyvala/search/domains/financial-news/search-financial-news-runtime-policy-binding-values.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search Financial News canonical runtime policy binding values
 *
 * ROLE
 * - materialize the complete Financial News v1 binding set required by
 *   search-financial-news-runtime-policy-artifact-values.ts
 * - bind the canonical Financial News v1 analytical overlap-group caps
 * - own the explicit Financial News v1 cohort-normalization method
 * - own the explicit Financial News v1 public availability-priority ordering
 * - expose one deterministic, zero-input binding factory
 *
 * CLASSIFICATION
 * - SEARCH DOMAIN
 * - FINANCIAL NEWS
 * - POLICY GOVERNANCE
 * - BINDING VALUES
 * - CONFIGURATION
 * - DETERMINISTIC
 * - ZERO-INPUT
 * - IMMUTABLE
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING EXECUTION
 * - NON-CALIBRATING
 * - NON-EXECUTING
 * - NON-MUTATING
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * search-financial-news-analytical-overlap-group-caps.ts
 *        ↓
 * canonical Financial News v1 analytical_overlap_group_caps
 *        +
 * explicit Financial News v1 cohort normalization
 *        +
 * explicit Financial News v1 public availability priority
 *        ↓
 * THIS MODULE
 *        ↓
 * SearchFinancialNewsRuntimePolicyArtifactValueBindings
 *        ↓
 * createSearchFinancialNewsRuntimePolicyArtifactValues(...)
 *        ↓
 * ten Financial News non-calibration policy artifacts
 *
 * FIRST DIVERGENCE CORRECTED
 * ----------------------------------------------------------------------------
 * A previous version still accepted:
 *
 * SearchFinancialNewsRuntimePolicyBindingValuesInput
 *   .analytical_overlap_group_caps
 *
 * That was correct while overlap-group identities and caps were unresolved.
 *
 * It is no longer correct because:
 *
 * search-financial-news-analytical-overlap-group-caps.ts
 *
 * now owns the explicit Financial News v1 cap values and preserves the
 * canonical scorer/policy-owned group identities.
 *
 * Keeping the external input would create two potential authorities for the
 * same binding value:
 *
 * caller-supplied caps
 * vs
 * canonical Financial News v1 caps
 *
 * This implementation removes that ambiguity.
 *
 * THREE BINDINGS — THREE CLOSED TRUTHS
 * ----------------------------------------------------------------------------
 *
 * 1. analytical_overlap_group_caps
 *
 *    owner:
 *    search-financial-news-analytical-overlap-group-caps.ts
 *
 *    bound here by exact reference:
 *    XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_V1
 *
 * 2. cohort_normalization_method
 *
 *    Financial News v1 explicit governance decision:
 *    "ROBUST_Z_SCORE"
 *
 * 3. public_availability_priority
 *
 *    Financial News v1 explicit governance ordering over the complete
 *    canonical SearchAvailabilityState domain.
 *
 * EXTERNAL BINDING COUNT
 * ----------------------------------------------------------------------------
 * External runtime binding input required here:
 *
 *   0
 *
 * This factory is therefore:
 *
 * deterministic
 * +
 * application-scoped
 * +
 * zero-input
 *
 * It MUST NOT read runtime observations or execution state.
 *
 * ANALYTICAL OVERLAP-GROUP CAPS
 * ----------------------------------------------------------------------------
 * This module does NOT create, reconstruct or modify cap truth.
 *
 * It imports the canonical Financial News v1 cap object directly.
 *
 * Invariant:
 *
 * result.analytical_overlap_group_caps
 * ===
 * XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_V1
 *
 * No:
 * - clone
 * - merge
 * - normalization
 * - key reconstruction
 * - cap recalculation
 *
 * is authorized here.
 *
 * COHORT NORMALIZATION — FINANCIAL NEWS V1
 * ----------------------------------------------------------------------------
 * Canonical allowed methods include:
 *
 * - MIN_MAX
 * - Z_SCORE
 * - ROBUST_Z_SCORE
 * - PERCENTILE_ONLY
 * - CUSTOM
 *
 * Financial News v1 explicitly selects:
 *
 *   ROBUST_Z_SCORE
 *
 * This is a domain policy decision, not a producer default.
 *
 * PUBLIC AVAILABILITY PRIORITY — FINANCIAL NEWS V1
 * ----------------------------------------------------------------------------
 * Canonical SearchAvailabilityState domain:
 *
 * - AVAILABLE
 * - UNAVAILABLE
 * - INSUFFICIENT_DATA
 * - INSUFFICIENT_HISTORY
 * - UNSUPPORTED
 * - INVALID
 *
 * Financial News v1 ordering:
 *
 * AVAILABLE
 * > INSUFFICIENT_DATA
 * > INSUFFICIENT_HISTORY
 * > UNAVAILABLE
 * > UNSUPPORTED
 * > INVALID
 *
 * Priority ordering is descriptive/public-ranking policy only.
 *
 * It MUST NOT mutate availability truth.
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * The output must satisfy exactly:
 *
 * SearchFinancialNewsRuntimePolicyArtifactValueBindings
 *
 * No local duplicate binding contract is created.
 *
 * If:
 * - analytical-overlap cap type changes;
 * - cohort normalization domain changes;
 * - public availability-priority type changes;
 *
 * compilation must fail at this boundary until explicitly reconciled.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * analytical overlap-group cap divergence
 * => search-financial-news-analytical-overlap-group-caps.ts
 *
 * cohort normalization policy decision divergence
 * => THIS Financial News governance module
 *
 * public availability-priority divergence
 * => THIS Financial News governance module
 *
 * canonical target-contract divergence
 * => compile-time failure here
 *
 * This module MUST NOT repair any divergence.
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - zero-input factory
 * - direct canonical cap import
 * - exact reference preservation
 * - explicit Financial News v1 normalization choice
 * - exhaustive public availability priority
 * - immutable output envelope
 *
 * - no external overlap-cap injection
 * - no overlap-group invention
 * - no cap reconstruction
 * - no fallback
 * - no state conversion
 * - no score calculation
 * - no ranking execution
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
 * - application-scoped configuration != run-scoped execution
 * ========================================================================== */

import type {
  SearchModuleVersion,
} from "../../contracts/search-pipeline-contract";

import {
  XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_V1,
} from "./search-financial-news-analytical-overlap-group-caps";

import type {
  SearchFinancialNewsRuntimePolicyArtifactValueBindings,
} from "./search-financial-news-runtime-policy-artifact-values";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_BINDING_VALUES_MODULE_NAME =
  "xyvala-search-financial-news-runtime-policy-binding-values" as const;

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_BINDING_VALUES_MODULE_VERSION:
  SearchModuleVersion =
    "1.1.0";

/* ============================================================================
 * 2. CANONICAL DERIVED BINDING TYPES
 * ----------------------------------------------------------------------------
 * Types are derived from the already-canonical artifact-value binding
 * contract.
 * ========================================================================== */

type SearchFinancialNewsCohortNormalizationMethod =
  SearchFinancialNewsRuntimePolicyArtifactValueBindings[
    "cohort_normalization_method"
  ];

type SearchFinancialNewsPublicAvailabilityPriority =
  SearchFinancialNewsRuntimePolicyArtifactValueBindings[
    "public_availability_priority"
  ];

/* ============================================================================
 * 3. FINANCIAL NEWS V1 COHORT NORMALIZATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_COHORT_NORMALIZATION_METHOD_V1 =
  "ROBUST_Z_SCORE" satisfies SearchFinancialNewsCohortNormalizationMethod;

/* ============================================================================
 * 4. FINANCIAL NEWS V1 PUBLIC AVAILABILITY PRIORITY
 * ----------------------------------------------------------------------------
 * Exhaustive canonical SearchAvailabilityState ordering.
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_PUBLIC_AVAILABILITY_PRIORITY_V1 =
  Object.freeze([
    "AVAILABLE",
    "INSUFFICIENT_DATA",
    "INSUFFICIENT_HISTORY",
    "UNAVAILABLE",
    "UNSUPPORTED",
    "INVALID",
  ] as const satisfies SearchFinancialNewsPublicAvailabilityPriority);

/* ============================================================================
 * 5. CANONICAL FINANCIAL NEWS V1 BINDING SET
 * ----------------------------------------------------------------------------
 * All three bindings are now closed.
 *
 * Reference invariant:
 *
 * bindings.analytical_overlap_group_caps
 * ===
 * XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_V1
 *
 * No external input is accepted.
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_BINDING_VALUES_V1 =
  Object.freeze({
    analytical_overlap_group_caps:
      XYVALA_SEARCH_FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_V1,

    cohort_normalization_method:
      XYVALA_SEARCH_FINANCIAL_NEWS_COHORT_NORMALIZATION_METHOD_V1,

    public_availability_priority:
      XYVALA_SEARCH_FINANCIAL_NEWS_PUBLIC_AVAILABILITY_PRIORITY_V1,
  } satisfies SearchFinancialNewsRuntimePolicyArtifactValueBindings);

/* ============================================================================
 * 6. ZERO-INPUT CANONICAL FACTORY
 * ----------------------------------------------------------------------------
 * Invariant:
 *
 * result
 * ===
 * XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_BINDING_VALUES_V1
 *
 * Returning the canonical immutable binding-set reference avoids rebuilding
 * the same application-scoped configuration envelope on every call.
 * ========================================================================== */

export function createSearchFinancialNewsRuntimePolicyBindingValues():
  SearchFinancialNewsRuntimePolicyArtifactValueBindings {
  return XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_BINDING_VALUES_V1;
}

/* ============================================================================
 * 7. STATIC MANIFEST
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_BINDING_VALUES_MANIFEST =
  Object.freeze({
    binding_set:
      "FINANCIAL_NEWS_RUNTIME_POLICY_BINDING_VALUES_V1",

    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_BINDING_VALUES_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_BINDING_VALUES_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    total_binding_count:
      3,

    locally_closed_binding_count:
      3,

    externally_bound_binding_count:
      0,

    zero_input_factory:
      true,

    analytical_overlap_group_caps_source:
      "FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS_V1",

    analytical_overlap_group_caps_reference_preserved:
      true,

    cohort_normalization_method:
      XYVALA_SEARCH_FINANCIAL_NEWS_COHORT_NORMALIZATION_METHOD_V1,

    public_availability_priority:
      XYVALA_SEARCH_FINANCIAL_NEWS_PUBLIC_AVAILABILITY_PRIORITY_V1,

    overlap_group_identity_invention:
      false,

    runtime_observation_dependency:
      false,
  } as const);

/* ============================================================================
 * 8. STATIC OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_BINDING_VALUES_OWNERSHIP =
  Object.freeze({
    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_BINDING_VALUES_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_BINDING_VALUES_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    architectural_plane:
      "GOVERNANCE_PLANE",

    architectural_role:
      "DOMAIN_RUNTIME_POLICY_BINDING_VALUE_ASSEMBLER",

    canonical_binding_contract:
      "SearchFinancialNewsRuntimePolicyArtifactValueBindings",

    analytical_overlap_group_identity_owner:
      "CANONICAL_SCORE_PRODUCERS_AND_ACTIVE_SCORING_POLICIES",

    analytical_overlap_group_caps_owner:
      "FINANCIAL_NEWS_ANALYTICAL_OVERLAP_GROUP_CAPS",

    cohort_normalization_method_owner:
      "FINANCIAL_NEWS_POLICY_GOVERNANCE",

    public_availability_priority_owner:
      "FINANCIAL_NEWS_POLICY_GOVERNANCE",

    analytical_overlap_group_caps_created_here:
      false,

    analytical_overlap_group_caps_bound_here:
      true,

    analytical_overlap_group_caps_reference_preserved:
      true,

    cohort_normalization_method_created_here:
      true,

    public_availability_priority_created_here:
      true,

    complete_binding_set_created_here:
      true,

    external_binding_input_required:
      false,

    analytical_truth_created_here:
      false,

    runtime_execution_started_here:
      false,

    calibration_executed_here:
      false,

    runtime_clock_read:
      false,

    persistence_performed:
      false,

    mutable_global_state_created:
      false,
  } as const);

/* ============================================================================
 * 9. STATIC GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_BINDING_VALUES_GOVERNANCE =
  Object.freeze({
    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    reality_before_interpretation:
      true,

    one_truth_one_owner:
      true,

    exact_canonical_type_derivation_required:
      true,

    complete_three_binding_closure_required:
      true,

    zero_input_factory_required:
      true,

    external_overlap_group_caps_input_allowed:
      false,

    canonical_overlap_group_caps_import_required:
      true,

    exact_overlap_group_caps_reference_preservation_required:
      true,

    exhaustive_public_availability_state_priority_required:
      true,

    robust_z_score_selected_for_financial_news_v1:
      true,

    analytical_overlap_group_identity_invention_allowed:
      false,

    analytical_overlap_group_name_from_score_name_allowed:
      false,

    analytical_overlap_group_name_from_module_name_allowed:
      false,

    analytical_overlap_group_catch_all_allowed:
      false,

    overlap_group_caps_reconstruction_allowed:
      false,

    availability_state_conversion_allowed:
      false,

    unavailable_as_invalid_allowed:
      false,

    invalid_as_unavailable_allowed:
      false,

    missing_as_unavailable_allowed:
      false,

    implicit_fallback_allowed:
      false,

    runtime_observation_dependency_allowed:
      false,

    scoring_allowed:
      false,

    ranking_execution_allowed:
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
        "external_overlap_group_caps_injection",
        "invent_overlap_group_identity",
        "derive_overlap_group_from_score_name",
        "derive_overlap_group_from_module_name",
        "catch_all_overlap_group",
        "reconstruct_overlap_group_caps",
        "implicit_binding_fallback",
        "availability_state_conversion",
        "runtime_observation_dependency",
        "score_reconstruction",
        "ranking_execution",
        "current_cycle_calibration",
        "runtime_clock_access",
        "persistence",
        "mutable_global_state",
        "cache_mutation",
        "logging",
        "network_access",
      ] as const),
  } as const);
