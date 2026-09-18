/* ============================================================================
 * FILE:
 * lib/xyvala/search/domains/financial-news/
 * search-financial-news-runtime-policy-assembly.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search Financial News canonical runtime policy assembly
 *
 * ROLE
 * - assemble the two already-governed Financial News policy artifact
 *   boundaries into the exact externally governed input expected by the
 *   canonical Financial News runtime policy profile
 * - preserve all policy references exactly
 * - delegate selection of the eight producer-owned canonical presets to
 *   createSearchFinancialNewsRuntimePolicyProfile(...)
 * - return one complete twenty-policy
 *   SearchFinancialNewsRuntimePolicyConfiguration
 *
 * CLASSIFICATION
 * - SEARCH DOMAIN
 * - FINANCIAL NEWS
 * - POLICY GOVERNANCE
 * - POLICY ASSEMBLY
 * - APPLICATION CONFIGURATION
 * - BIND / VALIDATE / DELEGATE
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING
 * - NON-TRANSFORMING
 * - NON-CALIBRATING
 * - NON-EXECUTING
 * - NON-OBSERVATION-PRODUCING
 * - NON-TRACE-PRODUCING
 * - NON-LINEAGE-PRODUCING
 * - NON-IDENTITY-PRODUCING
 * - NON-MUTATING
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * ten canonical non-calibration Financial News policy artifacts
 *        +
 * one canonical Behavioral Calibration policy artifact
 *        ↓
 * THIS ASSEMBLY
 *        ↓
 * exact eleven-field externally governed profile input
 *        ↓
 * createSearchFinancialNewsRuntimePolicyProfile(...)
 *        ↓
 * eight explicit producer-owned preset selections
 *        +
 * eleven exact externally governed policy references
 *        ↓
 * complete twenty-policy
 * SearchFinancialNewsRuntimePolicyConfiguration
 *        ↓
 * search-financial-news-runtime-configuration.ts
 *        ↓
 * SearchRuntimeProducerAdapterDependencies
 *
 * IMPORTANT — ASSEMBLY != POLICY CREATION
 * ----------------------------------------------------------------------------
 * This module does NOT create any policy truth.
 *
 * It receives:
 *
 * 1. SearchFinancialNewsRuntimePolicyArtifacts
 *    - eleven non-calibration policy references already admitted by the dedicated
 *      Financial News artifact boundary;
 *
 * 2. SearchFinancialNewsBehavioralCalibrationPolicyArtifact
 *    - one Behavioral Calibration policy reference already admitted by the
 *      dedicated calibration artifact boundary.
 *
 * It then maps those exact eleven references into:
 *
 * SearchFinancialNewsRuntimePolicyProfileInput
 *
 * and delegates the final twenty-policy selection to:
 *
 * createSearchFinancialNewsRuntimePolicyProfile(...)
 *
 * This module MUST NOT:
 * - define producer presets
 * - define policy thresholds
 * - define policy weights
 * - define scoring methods
 * - define ranking priorities
 * - define public transformation thresholds
 * - define private-decision thresholds
 * - define calibration parameters
 *
 * EIGHT + TEN + ONE
 * ----------------------------------------------------------------------------
 * Complete Financial News runtime policy coverage is:
 *
 * 8 producer-owned preset selections
 *        +
 * 11 non-calibration externally governed artifacts
 *        +
 * 1 Behavioral Calibration externally governed artifact
 *        =
 * 20 runtime policies
 *
 * The eight producer-owned preset references are NOT transported into this
 * assembly input.
 *
 * They remain selected by:
 *
 * search-financial-news-runtime-policy-profile.ts
 *
 * This prevents duplicated ownership of producer preset selection.
 *
 * BEHAVIORAL CALIBRATION SEPARATION
 * ----------------------------------------------------------------------------
 * Behavioral Calibration remains structurally separate until this final
 * assembly point.
 *
 * The assembly consumes an ALREADY RESOLVED artifact only.
 *
 * It MUST NOT:
 * - execute calibration
 * - inspect current-run behavioral observations
 * - derive CTR from current-run observations
 * - change ctr_basis
 * - change ctr_normalization
 * - change calibration weights
 * - change minimum_sample_confidence
 * - mutate policy_version
 *
 * Lifecycle:
 *
 * prior authorized calibration/configuration lifecycle
 *        ↓
 * Behavioral Calibration policy artifact
 *        ↓
 * THIS assembly
 *        ↓
 * current runtime policy profile
 *
 * NEVER:
 *
 * current analytical run
 *        ↓
 * current-run calibration
 *        ↓
 * current-run policy mutation
 *
 * ARTIFACT BOUNDARY OWNERSHIP
 * ----------------------------------------------------------------------------
 * This assembly does NOT re-run:
 *
 * createSearchFinancialNewsRuntimePolicyArtifacts(...)
 *
 * or:
 *
 * createSearchFinancialNewsBehavioralCalibrationPolicyArtifact(...)
 *
 * because its inputs are the canonical outputs of those boundaries.
 *
 * Re-running those factories here would duplicate boundary responsibility.
 *
 * The authorized caller is responsible for obtaining the two canonical
 * artifact envelopes before invoking this assembly.
 *
 * PROFILE OWNERSHIP
 * ----------------------------------------------------------------------------
 * The runtime policy profile remains the canonical owner of:
 *
 * - the eight producer-owned preset selections;
 * - exact twenty-policy profile coverage;
 * - the final SearchFinancialNewsRuntimePolicyConfiguration envelope.
 *
 * This assembly owns only:
 *
 * - exact 11 + 1 externally governed field convergence;
 * - compile-time compatibility with
 *   SearchFinancialNewsRuntimePolicyProfileInput;
 * - explicit reference transport into the profile.
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * The following contracts are canonical and imported directly:
 *
 * - SearchFinancialNewsRuntimePolicyArtifacts
 * - SearchFinancialNewsBehavioralCalibrationPolicyArtifact
 * - SearchFinancialNewsRuntimePolicyProfileInput
 * - SearchFinancialNewsRuntimePolicyConfiguration
 *
 * No local producer policy contract is recreated.
 *
 * EXACT COVERAGE
 * ----------------------------------------------------------------------------
 * Compile-time guards enforce:
 *
 * - every profile-input field is supplied by exactly one of the two artifact
 *   boundaries;
 * - no artifact field is unknown to the runtime policy profile;
 * - the non-calibration and calibration artifact field sets do not overlap.
 *
 * Therefore any future change in externally governed policy coverage forces an
 * explicit reconciliation at this assembly boundary.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * invalid assembly root
 * => THIS boundary
 *
 * invalid/non-object non-calibration artifact envelope
 * => THIS boundary for assembly shape;
 *    canonical artifact boundary for artifact semantics
 *
 * invalid/non-object Behavioral Calibration artifact envelope
 * => THIS boundary for assembly shape;
 *    canonical calibration-artifact boundary for artifact semantics
 *
 * missing externally governed policy field
 * => compile-time profile-input divergence in typed code;
 *    canonical downstream validation in untyped runtime input
 *
 * malformed policy semantics
 * => canonical producer/runtime validation boundary
 *
 * producer-owned preset divergence
 * => canonical Financial News runtime policy profile
 *
 * current-cycle calibration attempt
 * => architectural violation before this assembly
 *
 * This module MUST NOT repair any divergence.
 *
 * REFERENCE PRESERVATION
 * ----------------------------------------------------------------------------
 * For every externally governed policy:
 *
 * profile input field
 * ===
 * originating artifact policy field
 *
 * And because the canonical profile preserves externally supplied references:
 *
 * final runtime configuration field
 * ===
 * originating artifact policy field
 *
 * No nested policy value is:
 * - cloned
 * - merged
 * - spread into a reconstructed policy
 * - normalized
 * - repaired
 * - mutated
 * - reordered
 * - deep-frozen
 *
 * Only the temporary twelve-field profile-input envelope is newly created and
 * frozen before delegation.
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - exact 11 + 1 artifact convergence
 * - explicit field mapping only
 * - exact policy references only
 * - canonical profile factory only
 * - compile-time bidirectional coverage
 * - calibration artifact kept separate until assembly
 *
 * - no object spread for policy reconstruction
 * - no implicit default
 * - no fallback
 * - no policy synthesis
 * - no policy cloning
 * - no policy merging
 * - no policy normalization
 * - no policy mutation
 * - no threshold invention
 * - no weight invention
 * - no method invention
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
 * - Xyvala Search Protocol 3.1
 * - Search VLR OFFICIAL / NORMATIVE
 * - Contract Before Runtime
 * - First Divergence Before Correction
 * - reality before interpretation
 * - one truth = one canonical owner
 * - no downstream reconstruction
 * - explicit availability
 * - calibration outside current analytical cycle
 * - current-cycle policy immutability
 * - Configuration != Composition != Execution
 * ========================================================================== */

import type {
  SearchModuleVersion,
} from "../../contracts/search-pipeline-contract";

import type {
  SearchFinancialNewsBehavioralCalibrationPolicyArtifact,
} from "./search-financial-news-behavioral-calibration-policy-artifact";

import type {
  SearchFinancialNewsRuntimePolicyArtifacts,
} from "./search-financial-news-runtime-policy-artifacts";

import {
  createSearchFinancialNewsRuntimePolicyProfile,
  type SearchFinancialNewsRuntimePolicyProfileInput,
} from "./search-financial-news-runtime-policy-profile";

import type {
  SearchFinancialNewsRuntimePolicyConfiguration,
} from "./search-financial-news-runtime-configuration";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ASSEMBLY_MODULE_NAME =
  "xyvala-search-financial-news-runtime-policy-assembly" as const;

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ASSEMBLY_MODULE_VERSION:
  SearchModuleVersion =
    "2.0.0";

/* ============================================================================
 * 2. ASSEMBLY INPUT
 * ----------------------------------------------------------------------------
 * Two canonical artifact envelopes only.
 *
 * No raw policy-definition input is accepted directly here.
 * ========================================================================== */

export interface SearchFinancialNewsRuntimePolicyAssemblyInput {
  readonly runtime_policy_artifacts:
    SearchFinancialNewsRuntimePolicyArtifacts;

  readonly behavioral_calibration_policy_artifact:
    SearchFinancialNewsBehavioralCalibrationPolicyArtifact;
}

/* ============================================================================
 * 3. ARTIFACT FIELD SETS
 * ========================================================================== */

export type SearchFinancialNewsRuntimePolicyAssemblyNonCalibrationField =
  keyof SearchFinancialNewsRuntimePolicyArtifacts;

export type SearchFinancialNewsRuntimePolicyAssemblyCalibrationField =
  keyof SearchFinancialNewsBehavioralCalibrationPolicyArtifact;

export type SearchFinancialNewsRuntimePolicyAssemblyExternallyGovernedField =
  | SearchFinancialNewsRuntimePolicyAssemblyNonCalibrationField
  | SearchFinancialNewsRuntimePolicyAssemblyCalibrationField;

/* ============================================================================
 * 4. EXACT PROFILE-INPUT COVERAGE
 * ----------------------------------------------------------------------------
 * The 11 + 1 artifact field set must match the canonical externally governed
 * profile-input field set in both directions.
 * ========================================================================== */

type SearchFinancialNewsRuntimePolicyAssemblyMissingProfileField =
  Exclude<
    keyof SearchFinancialNewsRuntimePolicyProfileInput,
    SearchFinancialNewsRuntimePolicyAssemblyExternallyGovernedField
  >;

type SearchFinancialNewsRuntimePolicyAssemblyUnknownArtifactField =
  Exclude<
    SearchFinancialNewsRuntimePolicyAssemblyExternallyGovernedField,
    keyof SearchFinancialNewsRuntimePolicyProfileInput
  >;

type SearchFinancialNewsRuntimePolicyAssemblyCoverageIsExact =
  [
    SearchFinancialNewsRuntimePolicyAssemblyMissingProfileField,
    SearchFinancialNewsRuntimePolicyAssemblyUnknownArtifactField,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ASSEMBLY_COVERAGE_IS_EXACT:
  SearchFinancialNewsRuntimePolicyAssemblyCoverageIsExact =
    true;

void XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ASSEMBLY_COVERAGE_IS_EXACT;

/* ============================================================================
 * 5. NON-CALIBRATION / CALIBRATION DISJOINTNESS
 * ----------------------------------------------------------------------------
 * One externally governed field must never be owned by both artifact
 * boundaries.
 * ========================================================================== */

type SearchFinancialNewsRuntimePolicyAssemblyOverlappingArtifactField =
  Extract<
    SearchFinancialNewsRuntimePolicyAssemblyNonCalibrationField,
    SearchFinancialNewsRuntimePolicyAssemblyCalibrationField
  >;

type SearchFinancialNewsRuntimePolicyAssemblyArtifactSetsAreDisjoint =
  SearchFinancialNewsRuntimePolicyAssemblyOverlappingArtifactField extends never
    ? true
    : false;

const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ASSEMBLY_ARTIFACT_SETS_ARE_DISJOINT:
  SearchFinancialNewsRuntimePolicyAssemblyArtifactSetsAreDisjoint =
    true;

void XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ASSEMBLY_ARTIFACT_SETS_ARE_DISJOINT;

/* ============================================================================
 * 6. ROOT-SHAPE ASSERTION
 * ----------------------------------------------------------------------------
 * Assembly-level structural validation only.
 *
 * Artifact semantics remain owned by their dedicated boundaries and producer
 * validators.
 * ========================================================================== */

function assertSearchFinancialNewsRuntimePolicyAssemblyObject(
  value:
    unknown,

  fieldName:
    | "input"
    | "runtime_policy_artifacts"
    | "behavioral_calibration_policy_artifact",
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
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ASSEMBLY_MODULE_NAME}] ` +
        `Policy assembly violation: ${fieldName} must be an object.`,
    );
  }
}

function assertSearchFinancialNewsRuntimePolicyAssemblyInput(
  input:
    SearchFinancialNewsRuntimePolicyAssemblyInput,
): void {
  assertSearchFinancialNewsRuntimePolicyAssemblyObject(
    input,
    "input",
  );

  assertSearchFinancialNewsRuntimePolicyAssemblyObject(
    input
      .runtime_policy_artifacts,
    "runtime_policy_artifacts",
  );

  assertSearchFinancialNewsRuntimePolicyAssemblyObject(
    input
      .behavioral_calibration_policy_artifact,
    "behavioral_calibration_policy_artifact",
  );
}

/* ============================================================================
 * 7. EXACT EXTERNALLY GOVERNED PROFILE-INPUT ASSEMBLY
 * ----------------------------------------------------------------------------
 * Explicit mapping is intentional.
 *
 * Do NOT replace this with object spread.
 *
 * Explicit mapping:
 * - makes ownership visible;
 * - prevents accidental field admission;
 * - preserves exact field lineage;
 * - forces reconciliation when the profile contract changes.
 * ========================================================================== */

function createSearchFinancialNewsRuntimePolicyProfileInput(
  input:
    SearchFinancialNewsRuntimePolicyAssemblyInput,
): SearchFinancialNewsRuntimePolicyProfileInput {
  const runtimePolicyArtifacts =
    input
      .runtime_policy_artifacts;

  const behavioralCalibrationPolicyArtifact =
    input
      .behavioral_calibration_policy_artifact;

  const profileInput = {
    behavioral_signals_policy:
      runtimePolicyArtifacts
        .behavioral_signals_policy,

    link_authority_scoring_policy:
      runtimePolicyArtifacts
        .link_authority_scoring_policy,

    behavioral_calibration_scoring_policy:
      behavioralCalibrationPolicyArtifact
        .behavioral_calibration_scoring_policy,

    penalty_evaluation_policy:
      runtimePolicyArtifacts
        .penalty_evaluation_policy,

    analytical_aggregation_policy:
      runtimePolicyArtifacts
        .analytical_aggregation_policy,

    eligibility_evaluation_policy:
      runtimePolicyArtifacts
        .eligibility_evaluation_policy,

    cohort_normalization_policy:
      runtimePolicyArtifacts
        .cohort_normalization_policy,

    relative_cohort_evaluation_policy:
      runtimePolicyArtifacts
        .relative_cohort_evaluation_policy,

    private_decision_policy:
      runtimePolicyArtifacts
        .private_decision_policy,

    public_transformation_policy:
      runtimePolicyArtifacts
        .public_transformation_policy,

    public_ranking_policy:
      runtimePolicyArtifacts
        .public_ranking_policy,

    recency_policy:
      runtimePolicyArtifacts
        .recency_policy,
  } satisfies SearchFinancialNewsRuntimePolicyProfileInput;

  return Object.freeze(
    profileInput,
  );
}

/* ============================================================================
 * 8. CANONICAL FINANCIAL NEWS RUNTIME POLICY ASSEMBLY
 * ----------------------------------------------------------------------------
 * OFFICIAL FLOW
 *
 * 11 non-calibration policy artifacts
 *        +
 * 1 Behavioral Calibration policy artifact
 *        ↓
 * exact SearchFinancialNewsRuntimePolicyProfileInput
 *        ↓
 * createSearchFinancialNewsRuntimePolicyProfile(...)
 *        ↓
 * 8 producer-owned presets + 12 external artifacts
 *        ↓
 * complete SearchFinancialNewsRuntimePolicyConfiguration
 *
 * No policy is calculated or mutated here.
 * ========================================================================== */

export function createSearchFinancialNewsRuntimePolicyAssembly(
  input:
    SearchFinancialNewsRuntimePolicyAssemblyInput,
): SearchFinancialNewsRuntimePolicyConfiguration {
  assertSearchFinancialNewsRuntimePolicyAssemblyInput(
    input,
  );

  return createSearchFinancialNewsRuntimePolicyProfile(
    createSearchFinancialNewsRuntimePolicyProfileInput(
      input,
    ),
  );
}

/* ============================================================================
 * 9. STATIC ASSEMBLY MANIFEST
 * ----------------------------------------------------------------------------
 * Descriptive governance only.
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ASSEMBLY_MANIFEST =
  Object.freeze({
    assembly:
      "FINANCIAL_NEWS_RUNTIME_POLICY_ASSEMBLY_V1",

    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ASSEMBLY_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ASSEMBLY_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    producer_owned_preset_policy_count:
      8,

    non_calibration_artifact_policy_count:
      11,

    behavioral_calibration_artifact_policy_count:
      1,

    externally_governed_policy_count:
      12,

    final_runtime_policy_count:
      20,

    non_calibration_artifact_boundary:
      "FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACTS",

    behavioral_calibration_artifact_boundary:
      "FINANCIAL_NEWS_BEHAVIORAL_CALIBRATION_POLICY_ARTIFACT",

    runtime_policy_profile_boundary:
      "FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE",

    behavioral_calibration_kept_separate_until_assembly:
      true,

    current_cycle_calibration:
      false,

    policy_reference_preservation:
      true,
  } as const);

/* ============================================================================
 * 10. STATIC OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ASSEMBLY_OWNERSHIP =
  Object.freeze({
    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ASSEMBLY_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ASSEMBLY_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    architectural_plane:
      "GOVERNANCE_PLANE",

    architectural_role:
      "DOMAIN_RUNTIME_POLICY_ASSEMBLY_BOUNDARY",

    canonical_non_calibration_artifact_owner:
      "FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACTS",

    canonical_behavioral_calibration_artifact_owner:
      "FINANCIAL_NEWS_BEHAVIORAL_CALIBRATION_POLICY_ARTIFACT",

    canonical_runtime_policy_profile_owner:
      "FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE",

    canonical_runtime_policy_configuration_contract:
      "SearchFinancialNewsRuntimePolicyConfiguration",

    producer_preset_selection_owner:
      "FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE",

    non_calibration_policy_truth_owner:
      "AUTHORIZED_FINANCIAL_NEWS_POLICY_GOVERNANCE",

    behavioral_calibration_policy_truth_owner:
      "AUTHORIZED_CALIBRATION_OR_CONFIGURATION_LIFECYCLE",

    externally_governed_profile_input_assembled_here:
      true,

    final_runtime_policy_profile_requested_here:
      true,

    producer_preset_selected_here:
      false,

    policy_value_created_here:
      false,

    policy_contract_created_here:
      false,

    policy_semantics_validated_here:
      false,

    calibration_executed_here:
      false,

    observation_consumed_here:
      false,

    runtime_execution_started_here:
      false,

    execution_trace_created_here:
      false,

    variable_lineage_created_here:
      false,

    identity_created_here:
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
 * 11. STATIC GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ASSEMBLY_GOVERNANCE =
  Object.freeze({
    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    reality_before_interpretation:
      true,

    one_policy_truth_one_owner:
      true,

    exact_artifact_coverage_required:
      true,

    non_calibration_calibration_disjointness_required:
      true,

    explicit_field_mapping_required:
      true,

    canonical_runtime_policy_profile_required:
      true,

    exact_policy_reference_preservation_required:
      true,

    behavioral_calibration_separation_until_assembly_required:
      true,

    current_cycle_policy_immutability_required:
      true,

    producer_preset_selection_allowed_here:
      false,

    producer_preset_redefinition_allowed:
      false,

    artifact_factory_reexecution_required:
      false,

    artifact_semantic_validation_duplication_allowed:
      false,

    object_spread_policy_reconstruction_allowed:
      false,

    implicit_default_policy_allowed:
      false,

    missing_policy_fallback_allowed:
      false,

    policy_creation_allowed:
      false,

    policy_contract_duplication_allowed:
      false,

    policy_threshold_invention_allowed:
      false,

    policy_weight_invention_allowed:
      false,

    policy_method_invention_allowed:
      false,

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

    policy_array_reordering_allowed:
      false,

    current_run_policy_inference_allowed:
      false,

    current_run_observation_consumption_allowed:
      false,

    current_run_calibration_allowed:
      false,

    current_run_policy_derivation_allowed:
      false,

    current_run_policy_mutation_allowed:
      false,

    analytical_calculation_allowed:
      false,

    scoring_allowed:
      false,

    ranking_allowed:
      false,

    transformation_allowed:
      false,

    runtime_execution_allowed:
      false,

    execution_trace_generation_allowed:
      false,

    variable_lineage_generation_allowed:
      false,

    identity_generation_allowed:
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
        "duplicate_non_calibration_artifact_boundary",
        "duplicate_behavioral_calibration_artifact_boundary",
        "reexecute_artifact_factories_inside_assembly",

        "redefine_producer_owned_preset",
        "select_producer_owned_preset_inside_assembly",

        "object_spread_policy_reconstruction",
        "implicit_default_policy",
        "missing_policy_fallback",
        "invent_policy",
        "invent_policy_threshold",
        "invent_policy_weight",
        "invent_policy_method",

        "clone_policy",
        "merge_policy",
        "normalize_policy",
        "repair_policy",
        "mutate_policy",
        "reorder_policy_arrays",

        "derive_policy_from_current_run",
        "derive_policy_from_document_state",
        "derive_policy_from_query_state",
        "derive_policy_from_observation_state",

        "current_run_calibration",
        "derive_behavioral_calibration_from_current_run",
        "mutate_behavioral_calibration_artifact",
        "retroactively_change_current_cycle_policy",

        "analytical_recalculation",
        "score_reconstruction",
        "ranking_reconstruction",
        "public_transformation_reconstruction",

        "execution_trace_generation",
        "variable_lineage_generation",
        "identity_generation",

        "runtime_clock_access",
        "random_identity_generation",

        "persistence",
        "mutable_global_state",
        "cache_mutation",
        "logging",
        "network_access",
      ] as const),
  } as const);
