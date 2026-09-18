/* ============================================================================
 * FILE:
 * lib/xyvala/search/runtime/search-runtime-producer-adapter-dependencies.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical runtime producer-adapter dependency configuration
 *
 * ROLE
 * - bind explicitly selected analytical policy values to the existing
 *   SearchRuntimeProducerAdapterDependencies policy-resolver contract
 * - bind explicitly configured analytical observation providers unchanged
 * - preserve exact policy/provider references
 * - validate the complete analytical dependency configuration boundary before
 *   runtime producer-adapter creation
 *
 * CLASSIFICATION
 * - SEARCH RUNTIME
 * - ANALYTICAL DEPENDENCY CONFIGURATION
 * - POLICY BINDING
 * - OBSERVATION PROVIDER BINDING
 * - CONFIGURE / VALIDATE / BIND
 * - PURE
 * - DETERMINISTIC GIVEN DETERMINISTIC DEPENDENCIES
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING
 * - NON-CALIBRATING
 * - NON-TRACE-PRODUCING
 * - NON-LINEAGE-PRODUCING
 * - NON-IDENTITY-PRODUCING
 * - NON-MUTATING
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * explicitly selected producer-owned policy values
 *        +
 * explicitly configured analytical observation providers
 *        ↓
 * THIS CONFIGURATION BOUNDARY
 *        ↓
 * SearchRuntimeProducerAdapterDependencies
 *        ↓
 * createSearchRuntimeProducerAdapters(...)
 *        ↓
 * canonical runtime producer adapters
 *        ↓
 * canonical Search producers
 *
 * IMPORTANT — THIS MODULE IS NOT A POLICY OWNER
 * ----------------------------------------------------------------------------
 * Policy truth remains owned by the canonical producer/configuration source
 * that supplied each policy value.
 *
 * This module owns only the binding:
 *
 * explicitly configured policy value
 *        ↓
 * exact runtime policy-resolver function
 *
 * The resolver returns the exact configured policy reference unchanged.
 *
 * This module MUST NOT:
 * - choose a DEFAULT_* policy implicitly
 * - import DEFAULT_* policies for automatic runtime selection
 * - merge policies
 * - clone policies
 * - normalize policies
 * - repair policies
 * - infer policies from runtime input
 * - reconstruct policies from producer output
 *
 * DEFAULT POLICY SEMANTICS
 * ----------------------------------------------------------------------------
 * A producer-owned DEFAULT_* policy may be used only when an upstream
 * application/domain composition root explicitly selects that value and
 * supplies it to this configuration boundary.
 *
 * DEFAULT policy != implicit runtime fallback
 *
 * explicitly selected DEFAULT policy == valid configured policy input
 *
 * ANALYTICAL OBSERVATION PROVIDERS
 * ----------------------------------------------------------------------------
 * The three provider dependencies remain exact externally configured
 * functions:
 *
 * - link_observation_provider
 * - temporal_observation_provider
 * - behavioral_observation_provider
 *
 * They are transported unchanged to:
 *
 * - resolve_link_observations
 * - resolve_temporal_observations
 * - resolve_behavioral_observation_evidence
 *
 * This module does NOT call those providers or manufacture observations.
 *
 * EXECUTION PLANE SEPARATION
 * ----------------------------------------------------------------------------
 * SearchRuntimeExecutionObservationPorts are intentionally absent.
 *
 * This module configures only SearchRuntimeProducerAdapterDependencies.
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * This module introduces no duplicate runtime dependency contract.
 *
 * All policy value types and provider types are derived from:
 * SearchRuntimeProducerAdapterDependencies.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * missing/invalid configuration root
 * => THIS configuration boundary
 *
 * missing/invalid configured policy reference
 * => THIS configuration boundary
 *
 * missing/invalid observation provider reference
 * => THIS configuration boundary
 *
 * invalid policy internals
 * => canonical producer / producer policy contract boundary
 *
 * observation provider failure
 * => configured provider boundary
 *
 * This module MUST NOT repair any divergence.
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - explicit configuration only
 * - exact policy references only
 * - exact provider references only
 * - complete 22-dependency coverage
 * - policy values become resolvers without mutation
 *
 * - no implicit defaults
 * - no fallback
 * - no merge
 * - no clone
 * - no spread-copy of policy values
 * - no policy normalization
 * - no policy inference
 * - no provider wrapping
 * - no provider fallback
 *
 * - no analytical calculation
 * - no scoring
 * - no ranking
 * - no calibration
 * - no trace generation
 * - no lineage generation
 * - no identity generation
 *
 * - no Date.now()
 * - no new Date()
 * - no randomUUID()
 * - no randomness
 * - no persistence
 * - no global mutable state
 * - no cache mutation
 * - no logging
 * - no network
 * - no file-system access
 *
 * PROTOCOL
 * ----------------------------------------------------------------------------
 * - Xyvala Search Protocol 3.0
 * - Contract Before Runtime
 * - First Divergence Before Correction
 * - one truth = one canonical owner
 * - no downstream reconstruction
 * - explicit availability
 * - Compute / Observe / Mutate separation
 * - analytical dependencies != Execution Plane capabilities
 * ========================================================================== */

import type {
  SearchModuleVersion,
} from "../contracts/search-pipeline-contract";

import type {
  SearchRuntimeProducerAdapterDependencies,
} from "./search-runtime-producer-adapters";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCIES_MODULE_NAME =
  "xyvala-search-runtime-producer-adapter-dependencies" as const;

export const XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCIES_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

/* ============================================================================
 * 2. POLICY VALUE TYPE DERIVATION
 * ========================================================================== */

type SearchConfiguredAnchorDetectionPolicy =
  Awaited<
    ReturnType<
      SearchRuntimeProducerAdapterDependencies[
        "resolve_anchor_detection_policy"
      ]
    >
  >;

type SearchConfiguredLinkSignalsPolicy =
  Awaited<
    ReturnType<
      SearchRuntimeProducerAdapterDependencies[
        "resolve_link_signals_policy"
      ]
    >
  >;

type SearchConfiguredTemporalSignalsPolicy =
  Awaited<
    ReturnType<
      SearchRuntimeProducerAdapterDependencies[
        "resolve_temporal_signals_policy"
      ]
    >
  >;

type SearchConfiguredBehavioralSignalsPolicy =
  Awaited<
    ReturnType<
      SearchRuntimeProducerAdapterDependencies[
        "resolve_behavioral_signals_policy"
      ]
    >
  >;

type SearchConfiguredQueryAnalysisPolicy =
  Awaited<
    ReturnType<
      SearchRuntimeProducerAdapterDependencies[
        "resolve_query_analysis_policy"
      ]
    >
  >;

type SearchConfiguredQueryDocumentSignalsPolicy =
  Awaited<
    ReturnType<
      SearchRuntimeProducerAdapterDependencies[
        "resolve_query_document_signals_policy"
      ]
    >
  >;

type SearchConfiguredIntrinsicDocumentScoringPolicy =
  Awaited<
    ReturnType<
      SearchRuntimeProducerAdapterDependencies[
        "resolve_intrinsic_document_scoring_policy"
      ]
    >
  >;

type SearchConfiguredTemporalDocumentScoringPolicy =
  Awaited<
    ReturnType<
      SearchRuntimeProducerAdapterDependencies[
        "resolve_temporal_document_scoring_policy"
      ]
    >
  >;

type SearchConfiguredQueryRelevanceScoringPolicy =
  Awaited<
    ReturnType<
      SearchRuntimeProducerAdapterDependencies[
        "resolve_query_relevance_scoring_policy"
      ]
    >
  >;

type SearchConfiguredLinkAuthorityScoringPolicy =
  Awaited<
    ReturnType<
      SearchRuntimeProducerAdapterDependencies[
        "resolve_link_authority_scoring_policy"
      ]
    >
  >;

type SearchConfiguredBehavioralCalibrationScoringPolicy =
  Awaited<
    ReturnType<
      SearchRuntimeProducerAdapterDependencies[
        "resolve_behavioral_calibration_scoring_policy"
      ]
    >
  >;

type SearchConfiguredPenaltyEvaluationPolicy =
  Awaited<
    ReturnType<
      SearchRuntimeProducerAdapterDependencies[
        "resolve_penalty_evaluation_policy"
      ]
    >
  >;

type SearchConfiguredAnalyticalAggregationPolicy =
  Awaited<
    ReturnType<
      SearchRuntimeProducerAdapterDependencies[
        "resolve_analytical_aggregation_policy"
      ]
    >
  >;

type SearchConfiguredEligibilityEvaluationPolicy =
  Awaited<
    ReturnType<
      SearchRuntimeProducerAdapterDependencies[
        "resolve_eligibility_evaluation_policy"
      ]
    >
  >;

type SearchConfiguredCohortNormalizationPolicy =
  Awaited<
    ReturnType<
      SearchRuntimeProducerAdapterDependencies[
        "resolve_cohort_normalization_policy"
      ]
    >
  >;

type SearchConfiguredRelativeCohortEvaluationPolicy =
  Awaited<
    ReturnType<
      SearchRuntimeProducerAdapterDependencies[
        "resolve_relative_cohort_evaluation_policy"
      ]
    >
  >;

type SearchConfiguredPrivateDecisionPolicy =
  Awaited<
    ReturnType<
      SearchRuntimeProducerAdapterDependencies[
        "resolve_private_decision_policy"
      ]
    >
  >;

type SearchConfiguredPublicTransformationPolicy =
  Awaited<
    ReturnType<
      SearchRuntimeProducerAdapterDependencies[
        "resolve_public_transformation_policy"
      ]
    >
  >;

type SearchConfiguredPublicRankingPolicy =
  Awaited<
    ReturnType<
      SearchRuntimeProducerAdapterDependencies[
        "resolve_public_ranking_policy"
      ]
    >
  >;

/* ============================================================================
 * 3. EXPLICIT ANALYTICAL DEPENDENCY CONFIGURATION
 * ========================================================================== */

export interface SearchRuntimeProducerAdapterDependencyConfiguration {
  readonly link_observation_provider:
    SearchRuntimeProducerAdapterDependencies[
      "resolve_link_observations"
    ];

  readonly temporal_observation_provider:
    SearchRuntimeProducerAdapterDependencies[
      "resolve_temporal_observations"
    ];

  readonly behavioral_observation_provider:
    SearchRuntimeProducerAdapterDependencies[
      "resolve_behavioral_observation_evidence"
    ];

  readonly anchor_detection_policy:
    SearchConfiguredAnchorDetectionPolicy;

  readonly link_signals_policy:
    SearchConfiguredLinkSignalsPolicy;

  readonly temporal_signals_policy:
    SearchConfiguredTemporalSignalsPolicy;

  readonly behavioral_signals_policy:
    SearchConfiguredBehavioralSignalsPolicy;

  readonly query_analysis_policy:
    SearchConfiguredQueryAnalysisPolicy;

  readonly query_document_signals_policy:
    SearchConfiguredQueryDocumentSignalsPolicy;

  readonly intrinsic_document_scoring_policy:
    SearchConfiguredIntrinsicDocumentScoringPolicy;

  readonly temporal_document_scoring_policy:
    SearchConfiguredTemporalDocumentScoringPolicy;

  readonly query_relevance_scoring_policy:
    SearchConfiguredQueryRelevanceScoringPolicy;

  readonly link_authority_scoring_policy:
    SearchConfiguredLinkAuthorityScoringPolicy;

  readonly behavioral_calibration_scoring_policy:
    SearchConfiguredBehavioralCalibrationScoringPolicy;

  readonly penalty_evaluation_policy:
    SearchConfiguredPenaltyEvaluationPolicy;

  readonly analytical_aggregation_policy:
    SearchConfiguredAnalyticalAggregationPolicy;

  readonly eligibility_evaluation_policy:
    SearchConfiguredEligibilityEvaluationPolicy;

  readonly cohort_normalization_policy:
    SearchConfiguredCohortNormalizationPolicy;

  readonly relative_cohort_evaluation_policy:
    SearchConfiguredRelativeCohortEvaluationPolicy;

  readonly private_decision_policy:
    SearchConfiguredPrivateDecisionPolicy;

  readonly public_transformation_policy:
    SearchConfiguredPublicTransformationPolicy;

  readonly public_ranking_policy:
    SearchConfiguredPublicRankingPolicy;
}

/* ============================================================================
 * 4. CONFIGURATION FIELD COVERAGE
 * ========================================================================== */

type SearchRuntimeProducerAdapterDependencyConfigurationDeclaredField =
  | "link_observation_provider"
  | "temporal_observation_provider"
  | "behavioral_observation_provider"
  | "anchor_detection_policy"
  | "link_signals_policy"
  | "temporal_signals_policy"
  | "behavioral_signals_policy"
  | "query_analysis_policy"
  | "query_document_signals_policy"
  | "intrinsic_document_scoring_policy"
  | "temporal_document_scoring_policy"
  | "query_relevance_scoring_policy"
  | "link_authority_scoring_policy"
  | "behavioral_calibration_scoring_policy"
  | "penalty_evaluation_policy"
  | "analytical_aggregation_policy"
  | "eligibility_evaluation_policy"
  | "cohort_normalization_policy"
  | "relative_cohort_evaluation_policy"
  | "private_decision_policy"
  | "public_transformation_policy"
  | "public_ranking_policy";

type SearchRuntimeProducerAdapterDependencyConfigurationMissingField =
  Exclude<
    keyof SearchRuntimeProducerAdapterDependencyConfiguration,
    SearchRuntimeProducerAdapterDependencyConfigurationDeclaredField
  >;

type SearchRuntimeProducerAdapterDependencyConfigurationUnknownField =
  Exclude<
    SearchRuntimeProducerAdapterDependencyConfigurationDeclaredField,
    keyof SearchRuntimeProducerAdapterDependencyConfiguration
  >;

type SearchRuntimeProducerAdapterDependencyConfigurationCoverageIsExact =
  [
    SearchRuntimeProducerAdapterDependencyConfigurationMissingField,
    SearchRuntimeProducerAdapterDependencyConfigurationUnknownField,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCY_CONFIGURATION_COVERAGE_IS_EXACT:
  SearchRuntimeProducerAdapterDependencyConfigurationCoverageIsExact =
    true;

void XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCY_CONFIGURATION_COVERAGE_IS_EXACT;

/* ============================================================================
 * 5. BASIC CONFIGURATION ASSERTIONS
 * ========================================================================== */

function assertConfigurationObject(
  value:
    unknown,
): asserts value is object {
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
      `[${XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCIES_MODULE_NAME}] ` +
        "Configuration violation: producer-adapter dependency configuration must be an object.",
    );
  }
}

function assertConfiguredPolicyReference(
  value:
    unknown,

  fieldName:
    string,
): asserts value is object {
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
      `[${XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCIES_MODULE_NAME}] ` +
        `Configuration violation: ${fieldName} must be an explicitly configured policy object.`,
    );
  }
}

function assertConfiguredProviderReference(
  value:
    unknown,

  fieldName:
    string,
): asserts value is (...args: never[]) => unknown {
  if (
    typeof value !==
      "function"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCIES_MODULE_NAME}] ` +
        `Configuration violation: ${fieldName} must be an explicitly configured provider function.`,
    );
  }
}

/* ============================================================================
 * 6. COMPLETE CONFIGURATION VALIDATION
 * ========================================================================== */

export function validateSearchRuntimeProducerAdapterDependencyConfiguration(
  configuration:
    SearchRuntimeProducerAdapterDependencyConfiguration,
): void {
  assertConfigurationObject(
    configuration,
  );

  assertConfiguredProviderReference(
    configuration
      .link_observation_provider,
    "link_observation_provider",
  );

  assertConfiguredProviderReference(
    configuration
      .temporal_observation_provider,
    "temporal_observation_provider",
  );

  assertConfiguredProviderReference(
    configuration
      .behavioral_observation_provider,
    "behavioral_observation_provider",
  );

  assertConfiguredPolicyReference(
    configuration
      .anchor_detection_policy,
    "anchor_detection_policy",
  );

  assertConfiguredPolicyReference(
    configuration
      .link_signals_policy,
    "link_signals_policy",
  );

  assertConfiguredPolicyReference(
    configuration
      .temporal_signals_policy,
    "temporal_signals_policy",
  );

  assertConfiguredPolicyReference(
    configuration
      .behavioral_signals_policy,
    "behavioral_signals_policy",
  );

  assertConfiguredPolicyReference(
    configuration
      .query_analysis_policy,
    "query_analysis_policy",
  );

  assertConfiguredPolicyReference(
    configuration
      .query_document_signals_policy,
    "query_document_signals_policy",
  );

  assertConfiguredPolicyReference(
    configuration
      .intrinsic_document_scoring_policy,
    "intrinsic_document_scoring_policy",
  );

  assertConfiguredPolicyReference(
    configuration
      .temporal_document_scoring_policy,
    "temporal_document_scoring_policy",
  );

  assertConfiguredPolicyReference(
    configuration
      .query_relevance_scoring_policy,
    "query_relevance_scoring_policy",
  );

  assertConfiguredPolicyReference(
    configuration
      .link_authority_scoring_policy,
    "link_authority_scoring_policy",
  );

  assertConfiguredPolicyReference(
    configuration
      .behavioral_calibration_scoring_policy,
    "behavioral_calibration_scoring_policy",
  );

  assertConfiguredPolicyReference(
    configuration
      .penalty_evaluation_policy,
    "penalty_evaluation_policy",
  );

  assertConfiguredPolicyReference(
    configuration
      .analytical_aggregation_policy,
    "analytical_aggregation_policy",
  );

  assertConfiguredPolicyReference(
    configuration
      .eligibility_evaluation_policy,
    "eligibility_evaluation_policy",
  );

  assertConfiguredPolicyReference(
    configuration
      .cohort_normalization_policy,
    "cohort_normalization_policy",
  );

  assertConfiguredPolicyReference(
    configuration
      .relative_cohort_evaluation_policy,
    "relative_cohort_evaluation_policy",
  );

  assertConfiguredPolicyReference(
    configuration
      .private_decision_policy,
    "private_decision_policy",
  );

  assertConfiguredPolicyReference(
    configuration
      .public_transformation_policy,
    "public_transformation_policy",
  );

  assertConfiguredPolicyReference(
    configuration
      .public_ranking_policy,
    "public_ranking_policy",
  );
}

/* ============================================================================
 * 7. CANONICAL PRODUCER-ADAPTER DEPENDENCY FACTORY
 * ========================================================================== */

export function createSearchRuntimeProducerAdapterDependencies(
  configuration:
    SearchRuntimeProducerAdapterDependencyConfiguration,
): SearchRuntimeProducerAdapterDependencies {
  validateSearchRuntimeProducerAdapterDependencyConfiguration(
    configuration,
  );

  const dependencies = {
    resolve_anchor_detection_policy:
      () =>
        configuration
          .anchor_detection_policy,

    resolve_link_observations:
      configuration
        .link_observation_provider,

    resolve_link_signals_policy:
      () =>
        configuration
          .link_signals_policy,

    resolve_temporal_observations:
      configuration
        .temporal_observation_provider,

    resolve_temporal_signals_policy:
      () =>
        configuration
          .temporal_signals_policy,

    resolve_behavioral_observation_evidence:
      configuration
        .behavioral_observation_provider,

    resolve_behavioral_signals_policy:
      () =>
        configuration
          .behavioral_signals_policy,

    resolve_query_analysis_policy:
      () =>
        configuration
          .query_analysis_policy,

    resolve_query_document_signals_policy:
      () =>
        configuration
          .query_document_signals_policy,

    resolve_intrinsic_document_scoring_policy:
      () =>
        configuration
          .intrinsic_document_scoring_policy,

    resolve_temporal_document_scoring_policy:
      () =>
        configuration
          .temporal_document_scoring_policy,

    resolve_query_relevance_scoring_policy:
      () =>
        configuration
          .query_relevance_scoring_policy,

    resolve_link_authority_scoring_policy:
      () =>
        configuration
          .link_authority_scoring_policy,

    resolve_behavioral_calibration_scoring_policy:
      () =>
        configuration
          .behavioral_calibration_scoring_policy,

    resolve_penalty_evaluation_policy:
      () =>
        configuration
          .penalty_evaluation_policy,

    resolve_analytical_aggregation_policy:
      () =>
        configuration
          .analytical_aggregation_policy,

    resolve_eligibility_evaluation_policy:
      () =>
        configuration
          .eligibility_evaluation_policy,

    resolve_cohort_normalization_policy:
      () =>
        configuration
          .cohort_normalization_policy,

    resolve_relative_cohort_evaluation_policy:
      () =>
        configuration
          .relative_cohort_evaluation_policy,

    resolve_private_decision_policy:
      () =>
        configuration
          .private_decision_policy,

    resolve_public_transformation_policy:
      () =>
        configuration
          .public_transformation_policy,

    resolve_public_ranking_policy:
      () =>
        configuration
          .public_ranking_policy,
  } satisfies SearchRuntimeProducerAdapterDependencies;

  return Object.freeze(
    dependencies,
  );
}

/* ============================================================================
 * 8. STATIC OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCIES_OWNERSHIP =
  Object.freeze({
    module:
      XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCIES_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCIES_MODULE_VERSION,

    architectural_plane:
      "EXECUTION_PLANE",

    architectural_role:
      "ANALYTICAL_DEPENDENCY_CONFIGURATION_BOUNDARY",

    canonical_dependency_contract:
      "SearchRuntimeProducerAdapterDependencies",

    canonical_dependency_contract_owner:
      "SEARCH_RUNTIME_PRODUCER_ADAPTERS",

    configuration_binding_owner:
      "SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCY_CONFIGURATION",

    policy_truth_owner:
      "CONFIGURED_CANONICAL_PRODUCER_POLICY",

    observation_truth_owner:
      "CONFIGURED_ANALYTICAL_OBSERVATION_PROVIDER",

    execution_observation_truth_owner:
      "EXECUTION_TRACEABILITY",

    configured_policy_count:
      19,

    configured_observation_provider_count:
      3,

    canonical_dependency_count:
      22,

    policy_selection_performed_here:
      false,

    policy_binding_performed_here:
      true,

    policy_values_cloned_here:
      false,

    policy_values_merged_here:
      false,

    policy_values_normalized_here:
      false,

    observation_providers_wrapped_here:
      false,

    observation_providers_invoked_here:
      false,

    analytical_truth_created_here:
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
 * 9. STATIC GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCIES_GOVERNANCE =
  Object.freeze({
    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    canonical_dependency_contract_required:
      true,

    complete_dependency_coverage_required:
      true,

    configured_policy_count:
      19,

    configured_observation_provider_count:
      3,

    expected_dependency_count:
      22,

    explicit_policy_configuration_required:
      true,

    explicit_observation_provider_configuration_required:
      true,

    policy_reference_preservation_required:
      true,

    observation_provider_reference_preservation_required:
      true,

    implicit_default_policy_selection_allowed:
      false,

    configured_default_policy_reference_allowed:
      true,

    policy_fallback_allowed:
      false,

    policy_inference_allowed:
      false,

    policy_merge_allowed:
      false,

    policy_clone_allowed:
      false,

    policy_spread_copy_allowed:
      false,

    policy_normalization_allowed:
      false,

    policy_repair_allowed:
      false,

    policy_reconstruction_allowed:
      false,

    runtime_input_policy_inference_allowed:
      false,

    observation_provider_fallback_allowed:
      false,

    observation_provider_wrapping_allowed:
      false,

    observation_provider_invocation_allowed:
      false,

    observation_creation_allowed:
      false,

    observation_reconstruction_allowed:
      false,

    execution_plane_dependency_injection_allowed:
      false,

    execution_observation_port_configuration_allowed:
      false,

    execution_trace_generation_allowed:
      false,

    variable_lineage_generation_allowed:
      false,

    identity_generation_allowed:
      false,

    analytical_calculation_allowed:
      false,

    scoring_allowed:
      false,

    ranking_allowed:
      false,

    calibration_execution_allowed:
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
        "implicit_default_policy",
        "default_policy_runtime_fallback",
        "missing_policy_fallback",
        "policy_from_runtime_input",
        "policy_from_document_state",
        "policy_from_query_state",
        "policy_from_cohort_state",
        "policy_from_private_decision",
        "policy_from_execution_trace",
        "policy_from_private_snapshot",

        "policy_merge",
        "policy_clone",
        "policy_spread_copy",
        "policy_normalization",
        "policy_repair",
        "policy_reconstruction",

        "observation_provider_fallback",
        "observation_provider_wrapper",
        "observation_provider_invocation_during_configuration",
        "empty_observation_fabrication",
        "unavailable_observation_fabrication",

        "execution_observation_port_in_analytical_dependencies",
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
