/* ============================================================================
 * FILE:
 lib/xyvala/search/domains/financial-news/search-financial-news-runtime-policy-artifacts.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search Financial News non-calibration runtime policy artifacts
 *
 * ROLE
 * - define the explicit Financial News boundary for the ten externally
 *   governed runtime policy artifacts that do NOT belong to the behavioral
 *   calibration lifecycle
 * - require every non-calibration policy artifact explicitly
 * - preserve every supplied policy reference unchanged
 * - expose one immutable configuration envelope for later assembly with the
 *   separately governed behavioral-calibration policy artifact
 *
 * CLASSIFICATION
 * - SEARCH DOMAIN
 * - FINANCIAL NEWS
 * - POLICY GOVERNANCE BOUNDARY
 * - RUNTIME POLICY ARTIFACT TRANSPORT
 * - NON-CALIBRATION POLICY SET
 * - CONFIGURE / VALIDATE / BIND
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING
 * - NON-TRANSFORMING
 * - NON-CALIBRATING
 * - NON-EXECUTING
 * - NON-TRACE-PRODUCING
 * - NON-LINEAGE-PRODUCING
 * - NON-IDENTITY-PRODUCING
 * - NON-MUTATING
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * authorized external/domain policy governance
 *        ↓
 * eleven non-calibration Financial News policy artifacts
 *        ↓
 * THIS BOUNDARY
 *        ↓
 * SearchFinancialNewsRuntimePolicyArtifacts
 *        +
 * separately governed behavioral-calibration artifact
 *        ↓
 * search-financial-news-runtime-policy-profile.ts
 *        ↓
 * SearchFinancialNewsRuntimePolicyConfiguration
 *        ↓
 * search-financial-news-runtime-configuration.ts
 *
 * WHY THIS MODULE EXISTS
 * ----------------------------------------------------------------------------
 * The canonical Search producer cores deliberately do not provide universally
 * active presets for every policy.
 *
 * In particular, the Financial News runtime requires explicit application /
 * domain governance for:
 *
 * - behavioral signals
 * - link authority scoring
 * - penalty evaluation
 * - analytical aggregation
 * - eligibility evaluation
 * - cohort normalization
 * - relative cohort evaluation
 * - private decision
 * - public transformation
 * - public ranking
 *
 * Behavioral Calibration is intentionally NOT included here.
 *
 * It belongs to a separate lifecycle because:
 *
 * calibration
 * !=
 * current analytical execution
 *
 * and:
 *
 * prior authorized calibration/configuration artifact
 *        ↓
 * current runtime policy selection
 *
 * NEVER:
 *
 * current runtime observations
 *        ↓
 * current runtime recalibration
 *        ↓
 * mutation of current-cycle policy
 *
 * POLICY OWNERSHIP
 * ----------------------------------------------------------------------------
 * This module owns only:
 *
 * - the Financial News non-calibration policy artifact boundary
 * - complete field coverage for that boundary
 * - shallow artifact-shape validation
 * - exact reference transport
 * - immutable envelope construction
 *
 * It does NOT own:
 *
 * - producer policy contracts
 * - analytical formulas
 * - thresholds
 * - weights
 * - scoring methods
 * - ranking priorities
 * - public projection thresholds
 * - private-decision thresholds
 * - calibration output
 * - producer semantic validation
 *
 * EXPLICIT ARTIFACTS
 * ----------------------------------------------------------------------------
 * The ten required artifacts are:
 *
 *  1. behavioral_signals_policy
 *  2. link_authority_scoring_policy
 *  3. penalty_evaluation_policy
 *  4. analytical_aggregation_policy
 *  5. eligibility_evaluation_policy
 *  6. cohort_normalization_policy
 *  7. relative_cohort_evaluation_policy
 *  8. private_decision_policy
 *  9. public_transformation_policy
 * 10. public_ranking_policy
 *
 * No field is optional.
 *
 * No default is selected here.
 * No missing policy is synthesized here.
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * Every artifact type is derived directly from:
 *
 * SearchFinancialNewsRuntimePolicyConfiguration
 *
 * No producer policy interface is duplicated locally.
 *
 * Exact compile-time coverage ensures that:
 *
 * - every declared non-calibration artifact field exists in the canonical
 *   Financial News runtime policy configuration;
 * - the behavioral-calibration field remains deliberately excluded;
 * - a future policy-contract change requires explicit reconciliation.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * invalid root input
 * => THIS boundary
 *
 * missing/non-object policy artifact
 * => THIS boundary
 *
 * malformed policy semantics
 * => canonical generic runtime configuration / canonical producer validator
 *
 * behavioral-calibration artifact supplied here
 * => architectural ownership violation
 *
 * missing behavioral-calibration artifact
 * => separate behavioral-calibration artifact boundary
 *
 * This module MUST NOT repair a divergence.
 *
 * REFERENCE PRESERVATION
 * ----------------------------------------------------------------------------
 * For every policy field:
 *
 * output.<field>
 * ===
 * input.<field>
 *
 * This module creates only a new immutable envelope.
 *
 * It MUST NOT:
 * - clone nested policy objects
 * - merge policy objects
 * - normalize policy objects
 * - rewrite policy versions
 * - inject missing fields
 * - mutate policy arrays
 * - reorder policy arrays
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - exact policy references only
 * - explicit artifacts only
 * - complete ten-field coverage
 * - behavioral calibration excluded
 * - immutable envelope only
 *
 * - no implicit defaults
 * - no producer preset invention
 * - no threshold invention
 * - no weight invention
 * - no policy synthesis
 * - no policy fallback
 * - no policy merge
 * - no policy clone
 * - no policy normalization
 * - no policy mutation
 * - no calibration
 * - no runtime execution
 *
 * - no Date.now()
 * - no new Date()
 * - no randomUUID()
 * - no randomness
 * - no persistence
 * - no global mutable state
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

import type {
  SearchFinancialNewsRuntimePolicyConfiguration,
} from "./search-financial-news-runtime-configuration";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACTS_MODULE_NAME =
  "xyvala-search-financial-news-runtime-policy-artifacts" as const;

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACTS_MODULE_VERSION:
  SearchModuleVersion =
    "2.0.0";

/* ============================================================================
 * 2. CALIBRATION FIELD
 * ----------------------------------------------------------------------------
 * Explicitly isolated from this boundary.
 * ========================================================================== */

export type SearchFinancialNewsBehavioralCalibrationPolicyField =
  "behavioral_calibration_scoring_policy";

/* ============================================================================
 * 3. EXPLICIT NON-CALIBRATION ARTIFACT FIELD SET
 * ----------------------------------------------------------------------------
 * Keep this union explicit.
 *
 * Do not derive it by blindly excluding calibration from all runtime policy
 * fields without an exact coverage guard.
 * ========================================================================== */

export type SearchFinancialNewsRuntimePolicyArtifactField =
  | "behavioral_signals_policy"
  | "link_authority_scoring_policy"
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
 * 4. CANONICAL EXTERNALLY GOVERNED FIELD SET
 * ----------------------------------------------------------------------------
 * The eight producer-owned preset fields are deliberately not part of this
 * boundary.
 *
 * This type represents all Financial News policy fields not covered by the
 * producer-owned preset selection established by the runtime policy profile.
 * ========================================================================== */

type SearchFinancialNewsProducerOwnedPresetPolicyField =
  | "anchor_detection_policy"
  | "link_signals_policy"
  | "temporal_signals_policy"
  | "query_analysis_policy"
  | "query_document_signals_policy"
  | "intrinsic_document_scoring_policy"
  | "temporal_document_scoring_policy"
  | "query_relevance_scoring_policy";

type SearchFinancialNewsExternallyGovernedRuntimePolicyField =
  Exclude<
    keyof SearchFinancialNewsRuntimePolicyConfiguration,
    SearchFinancialNewsProducerOwnedPresetPolicyField
  >;

/* ============================================================================
 * 5. EXACT COVERAGE ASSERTIONS
 * ----------------------------------------------------------------------------
 * Expected externally governed set:
 *
 * eleven non-calibration artifacts
 * +
 * one behavioral-calibration artifact
 *
 * =
 * twelve externally governed policies.
 * ========================================================================== */

type SearchFinancialNewsDeclaredExternallyGovernedPolicyField =
  | SearchFinancialNewsRuntimePolicyArtifactField
  | SearchFinancialNewsBehavioralCalibrationPolicyField;

type SearchFinancialNewsMissingExternallyGovernedPolicyField =
  Exclude<
    SearchFinancialNewsExternallyGovernedRuntimePolicyField,
    SearchFinancialNewsDeclaredExternallyGovernedPolicyField
  >;

type SearchFinancialNewsUnknownExternallyGovernedPolicyField =
  Exclude<
    SearchFinancialNewsDeclaredExternallyGovernedPolicyField,
    SearchFinancialNewsExternallyGovernedRuntimePolicyField
  >;

type SearchFinancialNewsExternallyGovernedPolicyCoverageIsExact =
  [
    SearchFinancialNewsMissingExternallyGovernedPolicyField,
    SearchFinancialNewsUnknownExternallyGovernedPolicyField,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_FINANCIAL_NEWS_EXTERNALLY_GOVERNED_POLICY_COVERAGE_IS_EXACT:
  SearchFinancialNewsExternallyGovernedPolicyCoverageIsExact =
    true;

void XYVALA_SEARCH_FINANCIAL_NEWS_EXTERNALLY_GOVERNED_POLICY_COVERAGE_IS_EXACT;

/* ============================================================================
 * 6. CALIBRATION EXCLUSION ASSERTION
 * ========================================================================== */

type SearchFinancialNewsCalibrationAccidentallyIncludedInRuntimeArtifacts =
  Extract<
    SearchFinancialNewsRuntimePolicyArtifactField,
    SearchFinancialNewsBehavioralCalibrationPolicyField
  >;

type SearchFinancialNewsCalibrationExclusionIsExact =
  SearchFinancialNewsCalibrationAccidentallyIncludedInRuntimeArtifacts extends never
    ? true
    : false;

const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACTS_CALIBRATION_EXCLUSION_IS_EXACT:
  SearchFinancialNewsCalibrationExclusionIsExact =
    true;

void XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACTS_CALIBRATION_EXCLUSION_IS_EXACT;

/* ============================================================================
 * 7. CANONICAL NON-CALIBRATION ARTIFACT CONTRACT
 * ----------------------------------------------------------------------------
 * Every field type is inherited directly from the canonical Financial News
 * runtime policy configuration.
 * ========================================================================== */

export type SearchFinancialNewsRuntimePolicyArtifacts =
  Readonly<
    Pick<
      SearchFinancialNewsRuntimePolicyConfiguration,
      SearchFinancialNewsRuntimePolicyArtifactField
    >
  >;

/* ============================================================================
 * 8. INPUT CONTRACT
 * ----------------------------------------------------------------------------
 * Intentionally identical to the artifact output contract.
 *
 * The factory exists to:
 * - establish the explicit domain boundary;
 * - validate runtime shape;
 * - freeze only the envelope;
 * - document ownership.
 * ========================================================================== */

export type SearchFinancialNewsRuntimePolicyArtifactsInput =
  SearchFinancialNewsRuntimePolicyArtifacts;

/* ============================================================================
 * 9. SHALLOW POLICY-ARTIFACT ASSERTION
 * ----------------------------------------------------------------------------
 * This validates only the presence of an object-shaped artifact.
 *
 * It intentionally does NOT validate:
 * - policy_version
 * - thresholds
 * - weights
 * - methods
 * - feature arrays
 * - priority arrays
 * - semantic relationships
 *
 * Those remain owned by canonical producer/runtime policy validation.
 * ========================================================================== */

function assertSearchFinancialNewsRuntimePolicyArtifact(
  value:
    unknown,

  fieldName:
    SearchFinancialNewsRuntimePolicyArtifactField,
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
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACTS_MODULE_NAME}] ` +
        `Policy artifact violation: ${fieldName} must be supplied as an object.`,
    );
  }
}

/* ============================================================================
 * 10. ROOT INPUT ASSERTION
 * ========================================================================== */

function assertSearchFinancialNewsRuntimePolicyArtifactsInput(
  input:
    SearchFinancialNewsRuntimePolicyArtifactsInput,
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
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACTS_MODULE_NAME}] ` +
        "Policy artifact configuration violation: input must be an object.",
    );
  }

  assertSearchFinancialNewsRuntimePolicyArtifact(
    input
      .behavioral_signals_policy,
    "behavioral_signals_policy",
  );

  assertSearchFinancialNewsRuntimePolicyArtifact(
    input
      .link_authority_scoring_policy,
    "link_authority_scoring_policy",
  );

  assertSearchFinancialNewsRuntimePolicyArtifact(
    input
      .penalty_evaluation_policy,
    "penalty_evaluation_policy",
  );

  assertSearchFinancialNewsRuntimePolicyArtifact(
    input
      .analytical_aggregation_policy,
    "analytical_aggregation_policy",
  );

  assertSearchFinancialNewsRuntimePolicyArtifact(
    input
      .eligibility_evaluation_policy,
    "eligibility_evaluation_policy",
  );

  assertSearchFinancialNewsRuntimePolicyArtifact(
    input
      .cohort_normalization_policy,
    "cohort_normalization_policy",
  );

  assertSearchFinancialNewsRuntimePolicyArtifact(
    input
      .relative_cohort_evaluation_policy,
    "relative_cohort_evaluation_policy",
  );

  assertSearchFinancialNewsRuntimePolicyArtifact(
    input
      .private_decision_policy,
    "private_decision_policy",
  );

  assertSearchFinancialNewsRuntimePolicyArtifact(
    input
      .public_transformation_policy,
    "public_transformation_policy",
  );

  assertSearchFinancialNewsRuntimePolicyArtifact(
    input
      .public_ranking_policy,
    "public_ranking_policy",
  );

  assertSearchFinancialNewsRuntimePolicyArtifact(
    input
      .recency_policy,
    "recency_policy",
  );
}

/* ============================================================================
 * 11. CANONICAL NON-CALIBRATION POLICY ARTIFACT ASSEMBLY
 * ----------------------------------------------------------------------------
 * Reference invariants:
 *
 * output.behavioral_signals_policy
 * ===
 * input.behavioral_signals_policy
 *
 * ...same invariant for every field...
 *
 * Only the outer envelope is newly created and frozen.
 * ========================================================================== */

export function createSearchFinancialNewsRuntimePolicyArtifacts(
  input:
    SearchFinancialNewsRuntimePolicyArtifactsInput,
): SearchFinancialNewsRuntimePolicyArtifacts {
  assertSearchFinancialNewsRuntimePolicyArtifactsInput(
    input,
  );

  const artifacts = {
    behavioral_signals_policy:
      input
        .behavioral_signals_policy,

    link_authority_scoring_policy:
      input
        .link_authority_scoring_policy,

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
  } satisfies SearchFinancialNewsRuntimePolicyArtifacts;

  return Object.freeze(
    artifacts,
  );
}

/* ============================================================================
 * 12. STATIC ARTIFACT MANIFEST
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACTS_MANIFEST =
  Object.freeze({
    artifact_set:
      "FINANCIAL_NEWS_NON_CALIBRATION_RUNTIME_POLICY_ARTIFACTS_V2",

    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACTS_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACTS_MODULE_VERSION,

    policy_artifact_count:
      11,

    behavioral_calibration_included:
      false,

    fields:
      Object.freeze([
        "behavioral_signals_policy",
        "link_authority_scoring_policy",
        "penalty_evaluation_policy",
        "analytical_aggregation_policy",
        "eligibility_evaluation_policy",
        "cohort_normalization_policy",
        "relative_cohort_evaluation_policy",
        "private_decision_policy",
        "public_transformation_policy",
        "public_ranking_policy",
        "recency_policy",
      ] as const),

    behavioral_calibration_field:
      "behavioral_calibration_scoring_policy",

    behavioral_calibration_boundary:
      "SEPARATE_AUTHORIZED_POLICY_ARTIFACT",
  } as const);

/* ============================================================================
 * 13. STATIC OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACTS_OWNERSHIP =
  Object.freeze({
    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACTS_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACTS_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    architectural_plane:
      "EXECUTION_PLANE",

    architectural_role:
      "DOMAIN_NON_CALIBRATION_POLICY_ARTIFACT_BOUNDARY",

    canonical_target_contract:
      "SearchFinancialNewsRuntimePolicyConfiguration",

    policy_contract_truth_owner:
      "CANONICAL_SEARCH_PRODUCERS",

    policy_artifact_truth_owner:
      "AUTHORIZED_FINANCIAL_NEWS_POLICY_GOVERNANCE",

    behavioral_calibration_truth_owner:
      "AUTHORIZED_CALIBRATION_OR_CONFIGURATION_LIFECYCLE",

    behavioral_calibration_owned_here:
      false,

    policy_artifact_references_bound_here:
      true,

    policy_artifact_values_created_here:
      false,

    policy_contracts_created_here:
      false,

    policy_semantics_validated_here:
      false,

    immutable_envelope_created_here:
      true,

    analytical_truth_created_here:
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
 * 14. STATIC GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_POLICY_ARTIFACTS_GOVERNANCE =
  Object.freeze({
    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    reality_before_interpretation:
      true,

    one_policy_truth_one_owner:
      true,

    exact_non_calibration_policy_artifact_coverage_required:
      true,

    explicit_policy_artifact_required:
      true,

    behavioral_calibration_separation_required:
      true,

    behavioral_calibration_inclusion_allowed:
      false,

    exact_policy_reference_preservation_required:
      true,

    shallow_boundary_shape_validation_allowed:
      true,

    producer_semantic_validation_duplication_allowed:
      false,

    implicit_default_policy_selection_allowed:
      false,

    missing_policy_artifact_fallback_allowed:
      false,

    policy_contract_duplication_allowed:
      false,

    policy_value_creation_allowed:
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

    current_run_calibration_allowed:
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
        "behavioral_calibration_inside_non_calibration_artifact_set",

        "implicit_default_policy_selection",
        "missing_policy_artifact_fallback",
        "invent_policy_artifact",
        "invent_policy_threshold",
        "invent_policy_weight",
        "invent_policy_method",

        "duplicate_producer_policy_contract",
        "clone_policy_artifact",
        "merge_policy_artifact",
        "normalize_policy_artifact",
        "repair_policy_artifact",
        "mutate_policy_artifact",
        "reorder_policy_artifact_arrays",

        "infer_policy_from_current_run",
        "derive_policy_from_document_state",
        "derive_policy_from_query_state",
        "derive_policy_from_observation_state",

        "current_run_calibration",
        "reconstruct_calibration_artifact",

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
