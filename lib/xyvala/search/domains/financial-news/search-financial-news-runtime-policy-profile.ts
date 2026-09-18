/* ============================================================================
 * FILE: lib/xyvala/search/domains/financial-news/search-financial-news-runtime-policy-profile.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search Financial News canonical runtime policy profile
 *
 * ROLE
 * - compose the complete Financial News runtime policy configuration
 * - select exactly eight producer-owned canonical preset policies
 * - bind exactly eleven externally governed policy references
 * - preserve every selected/supplied policy reference unchanged
 *
 * CLASSIFICATION
 * - SEARCH DOMAIN
 * - FINANCIAL NEWS
 * - POLICY GOVERNANCE
 * - POLICY PROFILE
 * - CONFIGURATION COMPOSITION
 * - DETERMINISTIC
 * - IMMUTABLE OUTER ENVELOPE
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING EXECUTION
 * - NON-TRANSFORMING EXECUTION
 * - NON-CALIBRATING
 * - NON-EXECUTING
 * - NON-MUTATING
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * eight producer-owned canonical presets
 *        +
 * eleven externally governed policy references
 *        ↓
 * THIS PROFILE
 *        ↓
 * SearchFinancialNewsRuntimePolicyConfiguration
 *        ↓
 * search-financial-news-runtime-configuration.ts
 *
 * FIRST DIVERGENCE CORRECTED
 * ----------------------------------------------------------------------------
 * A previous profile implementation reconstructed eight supposed
 * producer-owned presets locally and forced them through:
 *
 *   unknown as T
 *
 * That was structurally invalid even when TypeScript remained silent:
 *
 * - producer policy truth was duplicated downstream;
 * - policy fields could be invented;
 * - overlap_group values could diverge from the actual canonical scorers;
 * - compile-time contract protection was bypassed.
 *
 * This implementation removes that entire pattern.
 *
 * The profile now imports the actual producer-owned canonical presets directly
 * from their owning cores.
 *
 * No producer preset is recreated here.
 *
 * PRODUCER-OWNED PRESET SOURCES
 * ----------------------------------------------------------------------------
 *
 * anchor_detection_policy
 * <- XYVALA_SEARCH_DEFAULT_ANCHOR_DETECTION_POLICY
 *
 * link_signals_policy
 * <- DEFAULT_XYVALA_SEARCH_LINK_SIGNALS_SEARCH_POLICY
 *
 * temporal_signals_policy
 * <- DEFAULT_XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_POLICY
 *
 * query_analysis_policy
 * <- DEFAULT_XYVALA_SEARCH_QUERY_ANALYSIS_POLICY
 *
 * query_document_signals_policy
 * <- DEFAULT_XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_POLICY
 *
 * intrinsic_document_scoring_policy
 * <- DEFAULT_XYVALA_SEARCH_DOCUMENT_SCORING_POLICY
 *
 * temporal_document_scoring_policy
 * <- DEFAULT_XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_POLICY
 *
 * query_relevance_scoring_policy
 * <- DEFAULT_XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_POLICY
 *
 * IMPORTANT — DEFAULT != IMPLICIT FALLBACK
 * ----------------------------------------------------------------------------
 * These constants are producer-owned canonical presets.
 *
 * Their use here is an EXPLICIT Financial News profile selection.
 *
 * Therefore:
 *
 * producer-owned DEFAULT constant
 * !=
 * hidden runtime fallback
 *
 * If this profile is selected, these eight references are selected explicitly
 * and deterministically.
 *
 * EXTERNALLY GOVERNED POLICY INPUT
 * ----------------------------------------------------------------------------
 * These eleven policy fields are NOT selected here:
 *
 * - behavioral_signals_policy
 * - link_authority_scoring_policy
 * - behavioral_calibration_scoring_policy
 * - penalty_evaluation_policy
 * - analytical_aggregation_policy
 * - eligibility_evaluation_policy
 * - cohort_normalization_policy
 * - relative_cohort_evaluation_policy
 * - private_decision_policy
 * - public_transformation_policy
 * - public_ranking_policy
 *
 * Their values enter through their dedicated Financial News governance
 * boundaries.
 *
 * BEHAVIORAL CALIBRATION
 * ----------------------------------------------------------------------------
 * Behavioral Calibration remains externally governed.
 *
 * This profile:
 * - does not create its active policy;
 * - does not calibrate;
 * - does not read current-run behavioral evidence;
 * - does not mutate a current-cycle policy.
 *
 * REFERENCE PRESERVATION
 * ----------------------------------------------------------------------------
 * For every producer-owned preset:
 *
 * result.<field>
 * ===
 * imported canonical producer preset
 *
 * For every externally governed policy:
 *
 * result.<field>
 * ===
 * input.<field>
 *
 * No nested policy object is:
 * - cloned
 * - merged
 * - normalized
 * - repaired
 * - rewritten
 * - deep-frozen
 *
 * Only the newly created outer configuration envelope is frozen.
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * The complete profile must satisfy:
 *
 * SearchFinancialNewsRuntimePolicyConfiguration
 *
 * without:
 * - `unknown as T`
 * - `any`
 * - local producer-policy reconstruction
 * - local producer-policy type duplication
 *
 * COMPILE-TIME COVERAGE
 * ----------------------------------------------------------------------------
 * The profile explicitly declares:
 *
 * 8 producer-owned fields
 * +
 * 12 externally governed fields
 * =
 * exact SearchFinancialNewsRuntimePolicyConfiguration field set
 *
 * Any future contract drift must fail compilation until explicitly reconciled.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * producer-owned preset contract/value divergence
 * => canonical producer core
 *
 * externally governed policy divergence
 * => dedicated Financial News policy governance boundary
 *
 * profile field-set divergence
 * => THIS module at compile time
 *
 * runtime policy semantic divergence
 * => canonical producer/runtime policy validator
 *
 * This module MUST NOT repair any divergence.
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - direct canonical producer preset imports only
 * - explicit selection only
 * - exact policy reference preservation
 * - explicit 8 + 12 coverage
 * - immutable outer envelope
 *
 * - no local producer preset construction
 * - no `unknown as`
 * - no `any`
 * - no implicit fallback
 * - no policy invention
 * - no policy mutation
 * - no overlap_group reconstruction
 * - no calibration
 * - no analytical execution
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
 * - calibration outside current analytical cycle
 * - Configuration != Composition != Execution
 * ========================================================================== */

import type {
  SearchModuleVersion,
} from "../../contracts/search-pipeline-contract";

import {
  DEFAULT_XYVALA_SEARCH_QUERY_ANALYSIS_POLICY,
} from "../../query/search-query-analysis-core";

import {
  DEFAULT_XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_POLICY,
} from "../../query/search-query-document-signals-core";

import {
  DEFAULT_XYVALA_SEARCH_DOCUMENT_SCORING_POLICY,
} from "../../scoring/search-document-scoring-core";

import {
  DEFAULT_XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_POLICY,
} from "../../scoring/search-query-relevance-scoring-core";

import {
  DEFAULT_XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_POLICY,
} from "../../scoring/search-temporal-document-scoring-core";

import {
  XYVALA_SEARCH_DEFAULT_ANCHOR_DETECTION_POLICY,
} from "../../signals/search-anchor-signals-core";

import {
  DEFAULT_XYVALA_SEARCH_LINK_SIGNALS_SEARCH_POLICY,
} from "../../signals/search-link-signals-search-core";

import {
  DEFAULT_XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_POLICY,
} from "../../temporal/search-temporal-signals-search-core";

import type {
  SearchFinancialNewsRuntimePolicyConfiguration,
} from "./search-financial-news-runtime-configuration";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_MODULE_NAME =
  "xyvala-search-financial-news-runtime-policy-profile" as const;

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_MODULE_VERSION:
  SearchModuleVersion =
    "2.0.0";

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_ID =
  "FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_V1" as const;

/* ============================================================================
 * 2. PRODUCER-OWNED PRESET FIELD SET
 * ========================================================================== */

export type SearchFinancialNewsRuntimePolicyProfileProducerOwnedField =
  | "anchor_detection_policy"
  | "link_signals_policy"
  | "temporal_signals_policy"
  | "query_analysis_policy"
  | "query_document_signals_policy"
  | "intrinsic_document_scoring_policy"
  | "temporal_document_scoring_policy"
  | "query_relevance_scoring_policy";

/* ============================================================================
 * 3. EXTERNALLY GOVERNED FIELD SET
 * ========================================================================== */

export type SearchFinancialNewsRuntimePolicyProfileExternallyGovernedField =
  | "behavioral_signals_policy"
  | "link_authority_scoring_policy"
  | "behavioral_calibration_scoring_policy"
  | "penalty_evaluation_policy"
  | "analytical_aggregation_policy"
  | "eligibility_evaluation_policy"
  | "cohort_normalization_policy"
  | "relative_cohort_evaluation_policy"
  | "private_decision_policy"
  | "public_transformation_policy"
  | "public_ranking_policy"
  | "recency_policy";

/* ============================================================================
 * 4. EXTERNALLY GOVERNED PROFILE INPUT
 * ========================================================================== */

export type SearchFinancialNewsRuntimePolicyProfileInput =
  Readonly<
    Pick<
      SearchFinancialNewsRuntimePolicyConfiguration,
      SearchFinancialNewsRuntimePolicyProfileExternallyGovernedField
    >
  >;

/* ============================================================================
 * 5. EXACT FIELD-SET COVERAGE
 * ========================================================================== */

type SearchFinancialNewsRuntimePolicyProfileDeclaredField =
  | SearchFinancialNewsRuntimePolicyProfileProducerOwnedField
  | SearchFinancialNewsRuntimePolicyProfileExternallyGovernedField;

type SearchFinancialNewsRuntimePolicyProfileMissingField =
  Exclude<
    keyof SearchFinancialNewsRuntimePolicyConfiguration,
    SearchFinancialNewsRuntimePolicyProfileDeclaredField
  >;

type SearchFinancialNewsRuntimePolicyProfileUnknownField =
  Exclude<
    SearchFinancialNewsRuntimePolicyProfileDeclaredField,
    keyof SearchFinancialNewsRuntimePolicyConfiguration
  >;

type SearchFinancialNewsRuntimePolicyProfileCoverageIsExact =
  [
    SearchFinancialNewsRuntimePolicyProfileMissingField,
    SearchFinancialNewsRuntimePolicyProfileUnknownField,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_COVERAGE_IS_EXACT:
  SearchFinancialNewsRuntimePolicyProfileCoverageIsExact =
    true;

void XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_COVERAGE_IS_EXACT;

/* ============================================================================
 * 6. FIELD-SET DISJOINTNESS
 * ========================================================================== */

type SearchFinancialNewsRuntimePolicyProfileOverlappingField =
  Extract<
    SearchFinancialNewsRuntimePolicyProfileProducerOwnedField,
    SearchFinancialNewsRuntimePolicyProfileExternallyGovernedField
  >;

type SearchFinancialNewsRuntimePolicyProfileFieldSetsAreDisjoint =
  SearchFinancialNewsRuntimePolicyProfileOverlappingField extends never
    ? true
    : false;

const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_FIELD_SETS_ARE_DISJOINT:
  SearchFinancialNewsRuntimePolicyProfileFieldSetsAreDisjoint =
    true;

void XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_FIELD_SETS_ARE_DISJOINT;

/* ============================================================================
 * 7. PRODUCER PRESET TYPE-COMPATIBILITY GUARDS
 * ----------------------------------------------------------------------------
 * These assignments are intentionally direct.
 *
 * No cast is permitted.
 *
 * If a producer preset ever stops satisfying the exact Financial News runtime
 * policy field contract, compilation must fail here.
 * ========================================================================== */

const XYVALA_SEARCH_FINANCIAL_NEWS_ANCHOR_DETECTION_POLICY_SELECTION:
  SearchFinancialNewsRuntimePolicyConfiguration[
    "anchor_detection_policy"
  ] =
    XYVALA_SEARCH_DEFAULT_ANCHOR_DETECTION_POLICY;

const XYVALA_SEARCH_FINANCIAL_NEWS_LINK_SIGNALS_POLICY_SELECTION:
  SearchFinancialNewsRuntimePolicyConfiguration[
    "link_signals_policy"
  ] =
    DEFAULT_XYVALA_SEARCH_LINK_SIGNALS_SEARCH_POLICY;

const XYVALA_SEARCH_FINANCIAL_NEWS_TEMPORAL_SIGNALS_POLICY_SELECTION:
  SearchFinancialNewsRuntimePolicyConfiguration[
    "temporal_signals_policy"
  ] =
    DEFAULT_XYVALA_SEARCH_TEMPORAL_SIGNALS_SEARCH_POLICY;

const XYVALA_SEARCH_FINANCIAL_NEWS_QUERY_ANALYSIS_POLICY_SELECTION:
  SearchFinancialNewsRuntimePolicyConfiguration[
    "query_analysis_policy"
  ] =
    DEFAULT_XYVALA_SEARCH_QUERY_ANALYSIS_POLICY;

const XYVALA_SEARCH_FINANCIAL_NEWS_QUERY_DOCUMENT_SIGNALS_POLICY_SELECTION:
  SearchFinancialNewsRuntimePolicyConfiguration[
    "query_document_signals_policy"
  ] =
    DEFAULT_XYVALA_SEARCH_QUERY_DOCUMENT_SIGNALS_POLICY;

const XYVALA_SEARCH_FINANCIAL_NEWS_INTRINSIC_DOCUMENT_SCORING_POLICY_SELECTION:
  SearchFinancialNewsRuntimePolicyConfiguration[
    "intrinsic_document_scoring_policy"
  ] =
    DEFAULT_XYVALA_SEARCH_DOCUMENT_SCORING_POLICY;

const XYVALA_SEARCH_FINANCIAL_NEWS_TEMPORAL_DOCUMENT_SCORING_POLICY_SELECTION:
  SearchFinancialNewsRuntimePolicyConfiguration[
    "temporal_document_scoring_policy"
  ] =
    DEFAULT_XYVALA_SEARCH_TEMPORAL_DOCUMENT_SCORING_POLICY;

const XYVALA_SEARCH_FINANCIAL_NEWS_QUERY_RELEVANCE_SCORING_POLICY_SELECTION:
  SearchFinancialNewsRuntimePolicyConfiguration[
    "query_relevance_scoring_policy"
  ] =
    DEFAULT_XYVALA_SEARCH_QUERY_RELEVANCE_SCORING_POLICY;

/* ============================================================================
 * 8. CANONICAL PRODUCER-OWNED PRESET SET
 * ----------------------------------------------------------------------------
 * References are preserved exactly.
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_PRESETS_V1 =
  Object.freeze({
    anchor_detection_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_ANCHOR_DETECTION_POLICY_SELECTION,

    link_signals_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_LINK_SIGNALS_POLICY_SELECTION,

    temporal_signals_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_TEMPORAL_SIGNALS_POLICY_SELECTION,

    query_analysis_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_QUERY_ANALYSIS_POLICY_SELECTION,

    query_document_signals_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_QUERY_DOCUMENT_SIGNALS_POLICY_SELECTION,

    intrinsic_document_scoring_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_INTRINSIC_DOCUMENT_SCORING_POLICY_SELECTION,

    temporal_document_scoring_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_TEMPORAL_DOCUMENT_SCORING_POLICY_SELECTION,

    query_relevance_scoring_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_QUERY_RELEVANCE_SCORING_POLICY_SELECTION,
  } satisfies Readonly<
    Pick<
      SearchFinancialNewsRuntimePolicyConfiguration,
      SearchFinancialNewsRuntimePolicyProfileProducerOwnedField
    >
  >);

/* ============================================================================
 * 9. ROOT INPUT ASSERTION
 * ----------------------------------------------------------------------------
 * Shallow configuration-boundary validation only.
 *
 * Canonical policy semantic validation remains owned downstream.
 * ========================================================================== */

function assertSearchFinancialNewsRuntimePolicyProfileObject(
  value:
    unknown,

  fieldName:
    | "input"
    | SearchFinancialNewsRuntimePolicyProfileExternallyGovernedField,
): asserts value is Readonly<Record<string, unknown>> {
  if (
    value ===
      null ||
    typeof value !==
      "object" ||
    Array.isArray(
      value,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_MODULE_NAME}] ` +
        `Runtime policy profile violation: ${fieldName} must be an object.`,
    );
  }
}

function assertSearchFinancialNewsRuntimePolicyProfileInput(
  input:
    SearchFinancialNewsRuntimePolicyProfileInput,
): void {
  assertSearchFinancialNewsRuntimePolicyProfileObject(
    input,
    "input",
  );

  assertSearchFinancialNewsRuntimePolicyProfileObject(
    input
      .behavioral_signals_policy,
    "behavioral_signals_policy",
  );

  assertSearchFinancialNewsRuntimePolicyProfileObject(
    input
      .link_authority_scoring_policy,
    "link_authority_scoring_policy",
  );

  assertSearchFinancialNewsRuntimePolicyProfileObject(
    input
      .behavioral_calibration_scoring_policy,
    "behavioral_calibration_scoring_policy",
  );

  assertSearchFinancialNewsRuntimePolicyProfileObject(
    input
      .penalty_evaluation_policy,
    "penalty_evaluation_policy",
  );

  assertSearchFinancialNewsRuntimePolicyProfileObject(
    input
      .analytical_aggregation_policy,
    "analytical_aggregation_policy",
  );

  assertSearchFinancialNewsRuntimePolicyProfileObject(
    input
      .eligibility_evaluation_policy,
    "eligibility_evaluation_policy",
  );

  assertSearchFinancialNewsRuntimePolicyProfileObject(
    input
      .cohort_normalization_policy,
    "cohort_normalization_policy",
  );

  assertSearchFinancialNewsRuntimePolicyProfileObject(
    input
      .relative_cohort_evaluation_policy,
    "relative_cohort_evaluation_policy",
  );

  assertSearchFinancialNewsRuntimePolicyProfileObject(
    input
      .private_decision_policy,
    "private_decision_policy",
  );

  assertSearchFinancialNewsRuntimePolicyProfileObject(
    input
      .public_transformation_policy,
    "public_transformation_policy",
  );

  assertSearchFinancialNewsRuntimePolicyProfileObject(
    input
      .public_ranking_policy,
    "public_ranking_policy",
  );

  assertSearchFinancialNewsRuntimePolicyProfileObject(
    input
      .recency_policy,
    "recency_policy",
  );
}

/* ============================================================================
 * 10. CANONICAL FINANCIAL NEWS RUNTIME POLICY PROFILE
 * ----------------------------------------------------------------------------
 * Explicit 20-field mapping.
 *
 * No object spread is used for policy reconstruction.
 * ========================================================================== */

export function createSearchFinancialNewsRuntimePolicyProfile(
  input:
    SearchFinancialNewsRuntimePolicyProfileInput,
): SearchFinancialNewsRuntimePolicyConfiguration {
  assertSearchFinancialNewsRuntimePolicyProfileInput(
    input,
  );

  const configuration = {
    anchor_detection_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_PRESETS_V1
        .anchor_detection_policy,

    link_signals_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_PRESETS_V1
        .link_signals_policy,

    temporal_signals_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_PRESETS_V1
        .temporal_signals_policy,

    behavioral_signals_policy:
      input
        .behavioral_signals_policy,

    query_analysis_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_PRESETS_V1
        .query_analysis_policy,

    query_document_signals_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_PRESETS_V1
        .query_document_signals_policy,

    intrinsic_document_scoring_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_PRESETS_V1
        .intrinsic_document_scoring_policy,

    temporal_document_scoring_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_PRESETS_V1
        .temporal_document_scoring_policy,

    query_relevance_scoring_policy:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_PRESETS_V1
        .query_relevance_scoring_policy,

    link_authority_scoring_policy:
      input
        .link_authority_scoring_policy,

    behavioral_calibration_scoring_policy:
      input
        .behavioral_calibration_scoring_policy,

    penalty_evaluation_policy:
      input
        .penalty_evaluation_policy,

    analytical_aggregation_policy:
      input
        .analytical_aggregation_policy,

    eligibility_evaluation_policy:
      input
        .eligibility_evaluation_policy,

    cohort_normalization_policy:
      input
        .cohort_normalization_policy,

    relative_cohort_evaluation_policy:
      input
        .relative_cohort_evaluation_policy,

    private_decision_policy:
      input
        .private_decision_policy,

    public_transformation_policy:
      input
        .public_transformation_policy,

    public_ranking_policy:
      input
        .public_ranking_policy,

    recency_policy:
      input
        .recency_policy,
  } satisfies SearchFinancialNewsRuntimePolicyConfiguration;

  return Object.freeze(
    configuration,
  );
}

/* ============================================================================
 * 11. STATIC PROFILE MANIFEST
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_MANIFEST =
  Object.freeze({
    profile_id:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_ID,

    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    producer_owned_preset_policy_count:
      8,

    externally_governed_policy_count:
      12,

    total_runtime_policy_count:
      20,

    producer_owned_preset_source:
      "CANONICAL_PRODUCER_EXPORTS",

    producer_owned_preset_reconstruction:
      false,

    externally_governed_policy_reconstruction:
      false,

    behavioral_calibration_external:
      true,

    exact_reference_preservation:
      true,

    unsafe_type_casting:
      false,
  } as const);

/* ============================================================================
 * 12. STATIC OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_OWNERSHIP =
  Object.freeze({
    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    architectural_plane:
      "GOVERNANCE_PLANE",

    architectural_role:
      "DOMAIN_RUNTIME_POLICY_PROFILE",

    canonical_output_contract:
      "SearchFinancialNewsRuntimePolicyConfiguration",

    profile_composition_owner:
      "FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE",

    producer_policy_truth_owner:
      "CANONICAL_SEARCH_PRODUCERS",

    externally_governed_policy_truth_owner:
      "AUTHORIZED_FINANCIAL_NEWS_POLICY_GOVERNANCE",

    behavioral_calibration_policy_truth_owner:
      "AUTHORIZED_CALIBRATION_OR_CONFIGURATION_LIFECYCLE",

    producer_preset_selected_here:
      true,

    producer_preset_created_here:
      false,

    producer_preset_reconstructed_here:
      false,

    externally_governed_policy_created_here:
      false,

    policy_reference_bound_here:
      true,

    policy_reference_mutated_here:
      false,

    calibration_executed_here:
      false,

    analytical_truth_created_here:
      false,

    runtime_execution_started_here:
      false,

    execution_trace_created_here:
      false,

    variable_lineage_created_here:
      false,

    runtime_clock_read:
      false,

    persistence_performed:
      false,

    mutable_global_state_created:
      false,
  } as const);

/* ============================================================================
 * 13. STATIC GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE_GOVERNANCE =
  Object.freeze({
    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    reality_before_interpretation:
      true,

    one_policy_truth_one_owner:
      true,

    exact_field_coverage_required:
      true,

    producer_external_field_disjointness_required:
      true,

    producer_owned_preset_direct_import_required:
      true,

    explicit_producer_preset_selection_required:
      true,

    producer_default_as_implicit_fallback_allowed:
      false,

    producer_policy_reconstruction_allowed:
      false,

    producer_policy_contract_duplication_allowed:
      false,

    externally_governed_policy_reconstruction_allowed:
      false,

    unsafe_unknown_cast_allowed:
      false,

    any_type_escape_allowed:
      false,

    overlap_group_reconstruction_allowed:
      false,

    exact_reference_preservation_required:
      true,

    policy_clone_allowed:
      false,

    policy_merge_allowed:
      false,

    policy_normalization_allowed:
      false,

    policy_repair_allowed:
      false,

    policy_mutation_allowed:
      false,

    current_run_policy_inference_allowed:
      false,

    current_run_calibration_allowed:
      false,

    analytical_calculation_allowed:
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
        "unknown_as_policy",
        "any_as_policy",
        "local_producer_preset_reconstruction",
        "duplicate_producer_policy_truth",
        "invent_producer_policy_field",
        "invent_overlap_group",
        "producer_default_as_hidden_fallback",
        "externally_governed_policy_reconstruction",
        "policy_clone",
        "policy_merge",
        "policy_normalization",
        "policy_repair",
        "policy_mutation",
        "current_run_policy_inference",
        "current_run_calibration",
        "analytical_recalculation",
        "score_reconstruction",
        "ranking_reconstruction",
        "public_transformation_reconstruction",
        "execution_trace_generation",
        "variable_lineage_generation",
        "runtime_clock_access",
        "persistence",
        "mutable_global_state",
        "cache_mutation",
        "logging",
        "network_access",
      ] as const),
  } as const);
