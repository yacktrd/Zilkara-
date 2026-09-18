/* ============================================================================
 * FILE: lib/xyvala/search/domains/financial-news/search-financial-news-runtime-policy-composition.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search Financial News runtime policy composition
 *
 * ROLE
 * - compose the already-governed Financial News v1 policy-value chain
 * - materialize the complete zero-input non-calibration binding set
 * - materialize the eleven non-calibration Financial News policy artifacts
 * - admit one explicitly authorized Behavioral Calibration policy through its
 *   dedicated artifact boundary
 * - converge the resulting 11 + 1 artifacts through the canonical runtime
 *   policy assembly
 * - return one complete twenty-policy Financial News runtime policy
 *   configuration
 *
 * CLASSIFICATION
 * - SEARCH DOMAIN
 * - FINANCIAL NEWS
 * - POLICY GOVERNANCE
 * - POLICY COMPOSITION
 * - APPLICATION-SCOPED CONFIGURATION
 * - DETERMINISTIC
 * - EXPLICIT EXTERNAL CALIBRATION INPUT
 * - BIND / MATERIALIZE / ASSEMBLE
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
 * createSearchFinancialNewsRuntimePolicyBindingValues()
 *        ↓
 * 3 closed Financial News v1 bindings
 *        ↓
 * createSearchFinancialNewsRuntimePolicyArtifactValues(...)
 *        ↓
 * 11 non-calibration policy artifacts
 *
 * explicit authorized Behavioral Calibration policy
 *        ↓
 * createSearchFinancialNewsBehavioralCalibrationPolicyArtifact(...)
 *        ↓
 * 1 Behavioral Calibration policy artifact
 *
 * 11 + 1
 *        ↓
 * createSearchFinancialNewsRuntimePolicyAssembly(...)
 *        ↓
 * 20-policy Financial News runtime policy configuration
 *        ↓
 * search-financial-news-runtime-configuration.ts
 *        ↓
 * SearchRuntimeProducerAdapterDependencies
 *
 * COMPOSITION != POLICY CREATION
 * ----------------------------------------------------------------------------
 * This module creates no analytical or policy truth.
 *
 * It composes truths already owned by:
 *
 * - Financial News analytical overlap-group cap governance;
 * - Financial News runtime policy binding governance;
 * - Financial News non-calibration policy-value governance;
 * - the authorized Behavioral Calibration configuration/calibration
 *   lifecycle;
 * - canonical Search producer-owned policy presets selected by the runtime
 *   policy profile.
 *
 * It MUST NOT redefine any of those values.
 *
 * CLOSED NON-CALIBRATION CHAIN
 * ----------------------------------------------------------------------------
 * The three formerly explicit runtime-policy bindings are now closed:
 *
 * 1. analytical_overlap_group_caps
 * 2. cohort_normalization_method
 * 3. public_availability_priority
 *
 * Therefore this composition MUST obtain them only through:
 *
 * createSearchFinancialNewsRuntimePolicyBindingValues()
 *
 * It MUST NOT accept caller-supplied replacements.
 *
 * BEHAVIORAL CALIBRATION — ONLY EXPLICIT POLICY INPUT
 * ----------------------------------------------------------------------------
 * Behavioral Calibration intentionally remains the only policy value supplied
 * to this composition.
 *
 * Reason:
 * - bootstrap configuration is valid for initial operation;
 * - a later authorized offline calibration lifecycle may produce a calibrated
 *   replacement;
 * - this composition must remain neutral between those authorized lifecycle
 *   outputs;
 * - no hidden bootstrap fallback is permitted.
 *
 * Therefore this module MUST NOT import or silently select:
 *
 * XYVALA_SEARCH_FINANCIAL_NEWS_BEHAVIORAL_CALIBRATION_BOOTSTRAP_POLICY_V1
 *
 * A bootstrap/application root may explicitly provide that policy.
 *
 * A future offline calibration root may explicitly provide another authorized
 * policy satisfying the same canonical contract.
 *
 * CURRENT-CYCLE CALIBRATION IS FORBIDDEN
 * ----------------------------------------------------------------------------
 * This module MUST NOT:
 * - inspect current-run behavioral observations;
 * - calculate CTR;
 * - reconstruct POSITION_ADJUSTED_CTR;
 * - calibrate thresholds or weights;
 * - modify policy_version;
 * - derive a replacement policy from the current analytical cycle.
 *
 * The current run consumes an already-authorized policy only.
 *
 * EXACT REFERENCE PRESERVATION
 * ----------------------------------------------------------------------------
 * The following identity must hold through the entire composition:
 *
 * finalConfiguration.behavioral_calibration_scoring_policy
 * ===
 * input.behavioral_calibration_scoring_policy
 *
 * Likewise:
 *
 * runtimePolicyArtifacts policy references
 * ===
 * the policy references materialized by the dedicated artifact-value boundary.
 *
 * No nested policy object is:
 * - cloned;
 * - merged;
 * - spread into a reconstructed policy;
 * - normalized;
 * - repaired;
 * - mutated;
 * - deep-frozen here.
 *
 * Only temporary composition envelopes may be newly created.
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * This module derives its Behavioral Calibration input type from the exact
 * input contract of:
 *
 * createSearchFinancialNewsBehavioralCalibrationPolicyArtifact(...)
 *
 * It delegates:
 *
 * - binding construction to the binding-value owner;
 * - non-calibration artifact materialization to the artifact-value owner;
 * - Behavioral Calibration admission to the dedicated calibration artifact
 *   boundary;
 * - 11 + 1 convergence and 20-policy completion to the canonical assembly and
 *   runtime policy profile.
 *
 * No producer policy contract is duplicated locally.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * closed Financial News binding divergence
 * => search-financial-news-runtime-policy-binding-values.ts
 *
 * non-calibration policy-value divergence
 * => search-financial-news-runtime-policy-artifact-values.ts
 *
 * Behavioral Calibration policy artifact divergence
 * => search-financial-news-behavioral-calibration-policy-artifact.ts
 *
 * Behavioral Calibration lifecycle/value divergence
 * => authorized configuration/calibration lifecycle upstream of THIS module
 *
 * 11 + 1 assembly divergence
 * => search-financial-news-runtime-policy-assembly.ts
 *
 * producer-owned preset divergence
 * => search-financial-news-runtime-policy-profile.ts
 *
 * This module MUST NOT repair any divergence.
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - zero-input non-calibration binding materialization
 * - exact non-calibration artifact boundary
 * - one explicit authorized Behavioral Calibration policy input
 * - exact Behavioral Calibration artifact boundary
 * - exact canonical 11 + 1 runtime policy assembly
 * - exact policy-reference preservation
 * - application-scoped configuration only
 *
 * - no caller-supplied non-calibration bindings
 * - no hidden Behavioral Calibration bootstrap selection
 * - no implicit default
 * - no fallback
 * - no policy synthesis
 * - no policy cloning
 * - no policy merging
 * - no policy normalization
 * - no policy mutation
 * - no policy repair
 * - no calibration
 * - no observation-derived policy
 * - no current-run policy derivation
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
 * - unavailable != zero
 * - calibration outside current analytical cycle
 * - current-cycle policy immutability
 * - Configuration != Composition != Execution
 * - application-scoped configuration != run-scoped execution
 * ========================================================================== */

import type {
  SearchModuleVersion,
} from "../../contracts/search-pipeline-contract";

import {
  createSearchFinancialNewsBehavioralCalibrationPolicyArtifact,
} from "./search-financial-news-behavioral-calibration-policy-artifact";

import {
  createSearchFinancialNewsRuntimePolicyArtifactValues,
} from "./search-financial-news-runtime-policy-artifact-values";

import {
  createSearchFinancialNewsRuntimePolicyAssembly,
} from "./search-financial-news-runtime-policy-assembly";

import {
  createSearchFinancialNewsRuntimePolicyBindingValues,
} from "./search-financial-news-runtime-policy-binding-values";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_COMPOSITION_MODULE_NAME =
  "xyvala-search-financial-news-runtime-policy-composition" as const;

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_COMPOSITION_MODULE_VERSION:
  SearchModuleVersion =
    "2.0.0";

/* ============================================================================
 * 2. EXACT DERIVED INPUT / OUTPUT TYPES
 * ----------------------------------------------------------------------------
 * Behavioral Calibration input type is derived from the dedicated artifact
 * boundary rather than duplicated locally.
 *
 * Final output type is derived from the canonical assembly.
 * ========================================================================== */

type SearchFinancialNewsBehavioralCalibrationPolicyArtifactInput =
  Parameters<
    typeof createSearchFinancialNewsBehavioralCalibrationPolicyArtifact
  >[0];

export type SearchFinancialNewsRuntimePolicyCompositionBehavioralCalibrationPolicy =
  SearchFinancialNewsBehavioralCalibrationPolicyArtifactInput[
    "behavioral_calibration_scoring_policy"
  ];

export type SearchFinancialNewsRuntimePolicyCompositionOutput =
  ReturnType<
    typeof createSearchFinancialNewsRuntimePolicyAssembly
  >;

/* ============================================================================
 * 3. COMPOSITION INPUT
 * ----------------------------------------------------------------------------
 * Exactly one externally supplied policy truth remains:
 *
 * - behavioral_calibration_scoring_policy
 *
 * No non-calibration binding input is authorized.
 * ========================================================================== */

export interface SearchFinancialNewsRuntimePolicyCompositionInput {
  readonly behavioral_calibration_scoring_policy:
    SearchFinancialNewsRuntimePolicyCompositionBehavioralCalibrationPolicy;
}

/* ============================================================================
 * 4. ROOT-SHAPE ASSERTION
 * ----------------------------------------------------------------------------
 * Composition-level root validation only.
 *
 * Behavioral Calibration policy shape/semantics remain owned by the dedicated
 * artifact boundary and canonical producer validator.
 * ========================================================================== */

function assertSearchFinancialNewsRuntimePolicyCompositionInput(
  input:
    SearchFinancialNewsRuntimePolicyCompositionInput,
): void {
  if (
    input ===
      null ||
    typeof input !==
      "object" ||
    Array.isArray(
      input,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_COMPOSITION_MODULE_NAME}] ` +
        "Runtime policy composition violation: input must be an object.",
    );
  }
}

/* ============================================================================
 * 5. CANONICAL FINANCIAL NEWS RUNTIME POLICY COMPOSITION
 * ----------------------------------------------------------------------------
 * OFFICIAL FLOW
 *
 * zero-input binding values
 *        ↓
 * 11 non-calibration artifacts
 *
 * explicit authorized Behavioral Calibration policy
 *        ↓
 * 1 calibration artifact
 *
 * 11 + 1
 *        ↓
 * canonical runtime policy assembly
 *        ↓
 * complete 20-policy runtime configuration
 *
 * No policy truth is created or recalculated here.
 * ========================================================================== */

export function createSearchFinancialNewsRuntimePolicyComposition(
  input:
    SearchFinancialNewsRuntimePolicyCompositionInput,
): SearchFinancialNewsRuntimePolicyCompositionOutput {
  assertSearchFinancialNewsRuntimePolicyCompositionInput(
    input,
  );

  const runtimePolicyBindings =
    createSearchFinancialNewsRuntimePolicyBindingValues();

  const runtimePolicyArtifacts =
    createSearchFinancialNewsRuntimePolicyArtifactValues(
      runtimePolicyBindings,
    );

  const behavioralCalibrationArtifactInput = {
    behavioral_calibration_scoring_policy:
      input
        .behavioral_calibration_scoring_policy,
  } satisfies SearchFinancialNewsBehavioralCalibrationPolicyArtifactInput;

  const behavioralCalibrationPolicyArtifact =
    createSearchFinancialNewsBehavioralCalibrationPolicyArtifact(
      behavioralCalibrationArtifactInput,
    );

  const assemblyInput = {
    runtime_policy_artifacts:
      runtimePolicyArtifacts,

    behavioral_calibration_policy_artifact:
      behavioralCalibrationPolicyArtifact,
  } satisfies Parameters<
    typeof createSearchFinancialNewsRuntimePolicyAssembly
  >[0];

  return createSearchFinancialNewsRuntimePolicyAssembly(
    assemblyInput,
  );
}

/* ============================================================================
 * 6. STATIC COMPOSITION MANIFEST
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_COMPOSITION_MANIFEST =
  Object.freeze({
    composition:
      "FINANCIAL_NEWS_RUNTIME_POLICY_COMPOSITION_V1",

    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_COMPOSITION_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_COMPOSITION_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    closed_non_calibration_binding_count:
      3,

    non_calibration_artifact_policy_count:
      11,

    behavioral_calibration_artifact_policy_count:
      1,

    final_runtime_policy_count:
      20,

    governed_unbound_domain_policy_count:
      1,

    governed_unbound_domain_policy:
      "recency_policy",

    recency_runtime_binding:
      false,

    external_policy_input_count:
      1,

    external_policy_input:
      "behavioral_calibration_scoring_policy",

    hidden_bootstrap_selection:
      false,

    current_cycle_calibration:
      false,

    current_cycle_policy_derivation:
      false,

    runtime_execution:
      false,

    policy_reference_preservation:
      true,
  } as const);

/* ============================================================================
 * 7. STATIC OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_COMPOSITION_OWNERSHIP =
  Object.freeze({
    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_COMPOSITION_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_COMPOSITION_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    architectural_plane:
      "COMPOSITION_PLANE",

    architectural_role:
      "DOMAIN_RUNTIME_POLICY_COMPOSITION_ROOT",

    non_calibration_binding_owner:
      "FINANCIAL_NEWS_RUNTIME_POLICY_BINDING_VALUES",

    non_calibration_policy_value_owner:
      "FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACT_VALUES",

    behavioral_calibration_policy_truth_owner:
      "AUTHORIZED_CALIBRATION_OR_CONFIGURATION_LIFECYCLE",

    behavioral_calibration_artifact_owner:
      "FINANCIAL_NEWS_BEHAVIORAL_CALIBRATION_POLICY_ARTIFACT",

    runtime_policy_assembly_owner:
      "FINANCIAL_NEWS_RUNTIME_POLICY_ASSEMBLY",

    producer_preset_selection_owner:
      "FINANCIAL_NEWS_RUNTIME_POLICY_PROFILE",

    non_calibration_bindings_created_here:
      false,

    non_calibration_bindings_materialized_here:
      true,

    non_calibration_policy_values_created_here:
      false,

    non_calibration_artifacts_materialized_here:
      true,

    behavioral_calibration_policy_created_here:
      false,

    behavioral_calibration_policy_admitted_here:
      true,

    behavioral_calibration_artifact_created_here:
      false,

    behavioral_calibration_artifact_materialized_here:
      true,

    final_runtime_policy_configuration_created_here:
      false,

    final_runtime_policy_configuration_requested_here:
      true,

    producer_preset_selected_here:
      false,

    analytical_truth_created_here:
      false,

    observation_consumed_here:
      false,

    calibration_executed_here:
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
 * 8. STATIC GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_COMPOSITION_GOVERNANCE =
  Object.freeze({
    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    reality_before_interpretation:
      true,

    one_policy_truth_one_owner:
      true,

    application_scoped_configuration_required:
      true,

    run_scoped_execution_allowed:
      false,

    zero_input_non_calibration_binding_materialization_required:
      true,

    caller_supplied_non_calibration_binding_allowed:
      false,

    exact_non_calibration_artifact_boundary_required:
      true,

    explicit_behavioral_calibration_policy_input_required:
      true,

    hidden_behavioral_calibration_bootstrap_selection_allowed:
      false,

    exact_behavioral_calibration_artifact_boundary_required:
      true,

    exact_runtime_policy_assembly_required:
      true,

    exact_policy_reference_preservation_required:
      true,

    producer_preset_selection_allowed_here:
      false,

    producer_preset_redefinition_allowed:
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
        "caller_supplied_non_calibration_binding",
        "hidden_behavioral_calibration_bootstrap_selection",
        "implicit_behavioral_calibration_default",
        "missing_behavioral_calibration_fallback",

        "duplicate_non_calibration_artifact_boundary",
        "duplicate_behavioral_calibration_artifact_boundary",
        "duplicate_runtime_policy_assembly",

        "redefine_producer_owned_preset",
        "select_producer_owned_preset_inside_composition",

        "invent_policy",
        "invent_policy_threshold",
        "invent_policy_weight",
        "invent_policy_method",

        "clone_policy",
        "merge_policy",
        "normalize_policy",
        "repair_policy",
        "mutate_policy",

        "derive_policy_from_current_run",
        "derive_policy_from_document_state",
        "derive_policy_from_query_state",
        "derive_policy_from_observation_state",

        "current_run_calibration",
        "derive_behavioral_calibration_from_current_run",
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
