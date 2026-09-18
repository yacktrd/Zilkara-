/* ============================================================================
 * FILE: lib/xyvala/search/domains/financial-news/search-financial-news-runtime-configuration.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search Financial News runtime analytical configuration binding
 *
 * ROLE
 * - receive one already-resolved complete twenty-policy Financial News
 *   runtime policy configuration
 * - bind the three explicitly authorized Financial News observation sources
 *   through their canonical domain provider boundaries
 * - map the exact nineteen generic Search policy references plus the three provider references
 *   into SearchRuntimeProducerAdapterDependencyConfiguration
 * - delegate generic resolver/provider materialization to
 *   createSearchRuntimeProducerAdapterDependencies(...)
 *
 * CLASSIFICATION
 * - SEARCH DOMAIN
 * - FINANCIAL NEWS
 * - RUNTIME CONFIGURATION
 * - CONFIGURATION PLANE
 * - ANALYTICAL DEPENDENCY BINDING
 * - BIND / VALIDATE / DELEGATE
 * - PURE
 * - DETERMINISTIC GIVEN DETERMINISTIC DEPENDENCIES
 * - NON-POLICY-SELECTING
 * - NON-POLICY-CREATING
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING
 * - NON-CALIBRATING
 * - NON-TRACE-PRODUCING
 * - NON-LINEAGE-PRODUCING
 * - NON-IDENTITY-PRODUCING
 * - NON-OBSERVATION-PRODUCING
 * - NON-EXECUTING
 * - NON-MUTATING
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * search-financial-news-runtime-policy-composition.ts
 *        ↓
 * complete twenty-policy
 * SearchFinancialNewsRuntimePolicyConfiguration
 *        +
 * three explicitly authorized Financial News observation sources
 *        ↓
 * THIS MODULE
 *        ↓
 * SearchRuntimeProducerAdapterDependencyConfiguration
 *        ↓
 * createSearchRuntimeProducerAdapterDependencies(...)
 *        ↓
 * SearchRuntimeProducerAdapterDependencies
 *        ↓
 * Financial News application composition
 *        ↓
 * generic Search application composition
 *        ↓
 * SearchRuntimeApplication
 *
 * IMPORTANT — POLICY COMPOSITION != RUNTIME CONFIGURATION
 * ----------------------------------------------------------------------------
 * This module no longer selects policy references independently.
 *
 * Policy selection/convergence belongs upstream to:
 *
 * search-financial-news-runtime-policy-composition.ts
 *
 * THIS module receives that already-resolved configuration as one object and
 * binds it to the three authorized observation providers.
 *
 * This separation prevents two competing policy-selection authorities.
 *
 * CONFIGURATION INPUT
 * ----------------------------------------------------------------------------
 * Exactly four top-level inputs are accepted:
 *
 * 1. runtime_policy_configuration
 *    - complete twenty-policy Financial News configuration
 *
 * 2. authorized_link_observation_source
 *
 * 3. authorized_temporal_observation_source
 *
 * 4. authorized_behavioral_observation_source
 *
 * No individual policy field is accepted directly at the root.
 *
 * POLICY OWNERSHIP
 * ----------------------------------------------------------------------------
 * This module does NOT own policy truth.
 *
 * It MUST NOT:
 * - choose producer presets;
 * - choose Behavioral Calibration policy;
 * - import DEFAULT_* policies for automatic selection;
 * - infer which policy should be active;
 * - create a missing policy;
 * - merge policies;
 * - clone policies;
 * - normalize policies;
 * - repair policies;
 * - derive policies from runtime input;
 * - derive policies from document/query/observation state;
 * - silently substitute a missing policy.
 *
 * The already-resolved policy references are transported unchanged.
 *
 * POLICY COVERAGE
 * ----------------------------------------------------------------------------
 * The complete current Financial News runtime policy configuration contains
 * exactly twenty policy references:
 *
 *  1. anchor_detection_policy
 *  2. link_signals_policy
 *  3. temporal_signals_policy
 *  4. behavioral_signals_policy
 *  5. query_analysis_policy
 *  6. query_document_signals_policy
 *  7. intrinsic_document_scoring_policy
 *  8. temporal_document_scoring_policy
 *  9. query_relevance_scoring_policy
 * 10. link_authority_scoring_policy
 * 11. behavioral_calibration_scoring_policy
 * 12. penalty_evaluation_policy
 * 13. analytical_aggregation_policy
 * 14. eligibility_evaluation_policy
 * 15. cohort_normalization_policy
 * 16. relative_cohort_evaluation_policy
 * 17. private_decision_policy
 * 18. public_transformation_policy
 * 19. public_ranking_policy
 * 20. recency_policy
 *
 * This explicit field set is retained intentionally.
 *
 * If the generic Search runtime dependency contract gains, removes or renames
 * a policy field, compile-time exact-coverage checks must force an explicit
 * Financial News reconciliation.
 *
 * OBSERVATION PROVIDERS
 * ----------------------------------------------------------------------------
 * Three external analytical observation truths are required:
 *
 * - link
 * - temporal
 * - behavioral
 *
 * Their authorized source functions pass through the existing Financial News
 * provider boundaries.
 *
 * This module MUST NOT:
 * - invoke those providers;
 * - fabricate observations;
 * - substitute empty arrays;
 * - fabricate unavailable evidence;
 * - infer observations from Search state;
 * - wrap or swallow provider failures.
 *
 * ACQUISITION SEPARATION
 * ----------------------------------------------------------------------------
 * Search acquisition does NOT belong to this file.
 *
 * Financial News acquisition remains owned by:
 *
 * - search-financial-news-acquisition-provider.ts
 * - search-financial-news-acquisition-adapter.ts
 *
 * Acquisition joins these producer-adapter dependencies later at the
 * Financial News application-composition boundary.
 *
 * EXECUTION PLANE SEPARATION
 * ----------------------------------------------------------------------------
 * This module MUST NOT create:
 *
 * - SearchRuntimeExecutionContext
 * - SearchRuntimeExecutionTraceCollector
 * - SearchRuntimeBootstrap
 * - SearchRuntimeOrchestrator
 * - SearchRuntimeApplication
 *
 * It MUST NOT:
 * - execute Search;
 * - create execution traces;
 * - materialize VLR lineage;
 * - read a runtime clock;
 * - generate runtime identities.
 *
 * CONFIGURATION ENVELOPE VS REFERENCE TRUTH
 * ----------------------------------------------------------------------------
 * This module may create a new generic configuration envelope.
 *
 * It MUST preserve every contained reference exactly:
 *
 * configured policy reference
 * ===
 * runtime_policy_configuration policy reference
 *
 * configured provider reference
 * ===
 * authorized provider-boundary result
 * ===
 * authorized upstream provider reference
 *
 * No policy or observation semantic value is copied or rebuilt.
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * Canonical generic runtime dependency contract:
 *
 * SearchRuntimeProducerAdapterDependencyConfiguration
 *
 * Financial News policy configuration type:
 *
 * SearchFinancialNewsRuntimePolicyConfiguration
 *
 * This module derives every policy field type directly from the canonical
 * generic configuration contract.
 *
 * No producer policy contract is duplicated locally.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * invalid Financial News configuration root
 * => THIS boundary
 *
 * invalid/non-object runtime_policy_configuration
 * => THIS boundary for root shape;
 *    canonical policy/profile boundaries for policy semantics
 *
 * missing/renamed generic runtime policy field
 * => compile-time exact-coverage divergence here
 *
 * invalid/missing authorized observation source
 * => corresponding Financial News provider boundary
 *
 * provider execution failure
 * => authorized upstream source boundary
 *
 * producer policy semantic failure
 * => canonical producer boundary
 *
 * This module MUST NOT repair any divergence.
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - one precomposed twenty-policy configuration only
 * - complete policy coverage only
 * - exact policy references only
 * - exact provider references only
 * - domain provider boundaries only
 * - generic dependency factory only
 *
 * - no individual root policy selection
 * - no implicit defaults
 * - no fallback
 * - no merge
 * - no clone of policy/provider values
 * - no normalization
 * - no reconstruction
 * - no provider invocation
 * - no acquisition
 * - no execution
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
 * - no network access initiated here
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
 * - Compute / Observe / Mutate separation
 * - Configuration != Composition != Execution
 * - application-scoped configuration != run-scoped execution
 * ========================================================================== */

import type {
  SearchModuleVersion,
} from "../../contracts/search-pipeline-contract";

import {
  createSearchRuntimeProducerAdapterDependencies,
  type SearchRuntimeProducerAdapterDependencyConfiguration,
} from "../../runtime/search-runtime-producer-adapter-dependencies";

import type {
  SearchRuntimeProducerAdapterDependencies,
} from "../../runtime/search-runtime-producer-adapters";

import {
  buildSearchFinancialNewsBehavioralObservationProvider,
  type SearchFinancialNewsAuthorizedBehavioralObservationSource,
} from "./search-financial-news-behavioral-observation-provider";

import {
  buildSearchFinancialNewsLinkObservationProvider,
  type SearchFinancialNewsAuthorizedLinkObservationSource,
} from "./search-financial-news-link-observation-provider";

import {
  buildSearchFinancialNewsTemporalObservationProvider,
  type SearchFinancialNewsAuthorizedTemporalObservationSource,
} from "./search-financial-news-temporal-observation-provider";

import type {
  SearchFinancialNewsRecencyPolicy,
} from "./search-financial-news-recency-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_CONFIGURATION_MODULE_NAME =
  "xyvala-search-financial-news-runtime-configuration" as const;

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_CONFIGURATION_MODULE_VERSION:
  SearchModuleVersion =
    "2.0.0";

/* ============================================================================
 * 2. GENERIC PROVIDER FIELD SET
 * ========================================================================== */

type SearchFinancialNewsGenericObservationProviderField =
  | "link_observation_provider"
  | "temporal_observation_provider"
  | "behavioral_observation_provider";

/* ============================================================================
 * 3. EXPLICIT FINANCIAL NEWS POLICY FIELD SET
 * ========================================================================== */

type SearchFinancialNewsDeclaredGenericRuntimePolicyField =
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

export type SearchFinancialNewsDomainRuntimePolicyField =
  "recency_policy";

export type SearchFinancialNewsRuntimePolicyField =
  | SearchFinancialNewsDeclaredGenericRuntimePolicyField
  | SearchFinancialNewsDomainRuntimePolicyField;

/* ============================================================================
 * 4. COMPILE-TIME POLICY COVERAGE
 * ----------------------------------------------------------------------------
 * The nineteen generic Search policy fields must remain an exact projection of
 * SearchRuntimeProducerAdapterDependencyConfiguration.
 *
 * recency_policy is a Financial News domain policy. It is governed in the
 * Financial News policy configuration but is deliberately not part of the
 * generic Search producer-adapter dependency contract until its separate
 * runtime binding is explicitly opened.
 * ========================================================================== */

type SearchFinancialNewsGenericRuntimePolicyField =
  Exclude<
    keyof SearchRuntimeProducerAdapterDependencyConfiguration,
    SearchFinancialNewsGenericObservationProviderField
  >;

type SearchFinancialNewsMissingGenericRuntimePolicyField =
  Exclude<
    SearchFinancialNewsGenericRuntimePolicyField,
    SearchFinancialNewsDeclaredGenericRuntimePolicyField
  >;

type SearchFinancialNewsUnknownGenericRuntimePolicyField =
  Exclude<
    SearchFinancialNewsDeclaredGenericRuntimePolicyField,
    SearchFinancialNewsGenericRuntimePolicyField
  >;

type SearchFinancialNewsGenericRuntimePolicyCoverageIsExact =
  [
    SearchFinancialNewsMissingGenericRuntimePolicyField,
    SearchFinancialNewsUnknownGenericRuntimePolicyField,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_FINANCIAL_NEWS_GENERIC_RUNTIME_POLICY_COVERAGE_IS_EXACT:
  SearchFinancialNewsGenericRuntimePolicyCoverageIsExact =
    true;

void XYVALA_SEARCH_FINANCIAL_NEWS_GENERIC_RUNTIME_POLICY_COVERAGE_IS_EXACT;

/* ============================================================================
 * 5. COMPLETE FINANCIAL NEWS POLICY CONFIGURATION CONTRACT
 * ----------------------------------------------------------------------------
 * Nineteen generic Search policies + one Financial News Recency policy.
 *
 * The Recency policy is governance-complete here but remains deliberately
 * unbound by createSearchFinancialNewsRuntimeConfiguration(...).
 * ========================================================================== */

type SearchFinancialNewsGenericRuntimePolicyConfiguration =
  Readonly<
    Pick<
      SearchRuntimeProducerAdapterDependencyConfiguration,
      SearchFinancialNewsDeclaredGenericRuntimePolicyField
    >
  >;

export type SearchFinancialNewsRuntimePolicyConfiguration =
  Readonly<
    SearchFinancialNewsGenericRuntimePolicyConfiguration & {
      readonly recency_policy:
        SearchFinancialNewsRecencyPolicy;
    }
  >;

/* ============================================================================
 * 6. FINANCIAL NEWS RUNTIME CONFIGURATION INPUT
 * ========================================================================== */

export interface SearchFinancialNewsRuntimeConfigurationInput {
  readonly runtime_policy_configuration:
    SearchFinancialNewsRuntimePolicyConfiguration;

  readonly authorized_link_observation_source:
    SearchFinancialNewsAuthorizedLinkObservationSource;

  readonly authorized_temporal_observation_source:
    SearchFinancialNewsAuthorizedTemporalObservationSource;

  readonly authorized_behavioral_observation_source:
    SearchFinancialNewsAuthorizedBehavioralObservationSource;
}

/* ============================================================================
 * 7. ROOT CONFIGURATION ASSERTION
 * ========================================================================== */

function assertSearchFinancialNewsRuntimeConfigurationObject(
  value:
    unknown,

  fieldName:
    | "input"
    | "runtime_policy_configuration",
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
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_CONFIGURATION_MODULE_NAME}] ` +
        `Configuration violation: ${fieldName} must be an object.`,
    );
  }
}

function assertSearchFinancialNewsRuntimeConfigurationInput(
  input:
    SearchFinancialNewsRuntimeConfigurationInput,
): void {
  assertSearchFinancialNewsRuntimeConfigurationObject(
    input,
    "input",
  );

  assertSearchFinancialNewsRuntimeConfigurationObject(
    input
      .runtime_policy_configuration,
    "runtime_policy_configuration",
  );
}

/* ============================================================================
 * 8. CANONICAL DOMAIN CONFIGURATION BINDING
 * ========================================================================== */

export function createSearchFinancialNewsRuntimeConfiguration(
  input:
    SearchFinancialNewsRuntimeConfigurationInput,
): SearchRuntimeProducerAdapterDependencyConfiguration {
  assertSearchFinancialNewsRuntimeConfigurationInput(
    input,
  );

  const runtimePolicyConfiguration =
    input
      .runtime_policy_configuration;

  const linkObservationProvider =
    buildSearchFinancialNewsLinkObservationProvider({
      authorized_link_observation_source:
        input
          .authorized_link_observation_source,
    });

  const temporalObservationProvider =
    buildSearchFinancialNewsTemporalObservationProvider({
      authorized_temporal_observation_source:
        input
          .authorized_temporal_observation_source,
    });

  const behavioralObservationProvider =
    buildSearchFinancialNewsBehavioralObservationProvider({
      authorized_behavioral_observation_source:
        input
          .authorized_behavioral_observation_source,
    });

  const configuration = {
    link_observation_provider:
      linkObservationProvider,

    temporal_observation_provider:
      temporalObservationProvider,

    behavioral_observation_provider:
      behavioralObservationProvider,

    anchor_detection_policy:
      runtimePolicyConfiguration
        .anchor_detection_policy,

    link_signals_policy:
      runtimePolicyConfiguration
        .link_signals_policy,

    temporal_signals_policy:
      runtimePolicyConfiguration
        .temporal_signals_policy,

    behavioral_signals_policy:
      runtimePolicyConfiguration
        .behavioral_signals_policy,

    query_analysis_policy:
      runtimePolicyConfiguration
        .query_analysis_policy,

    query_document_signals_policy:
      runtimePolicyConfiguration
        .query_document_signals_policy,

    intrinsic_document_scoring_policy:
      runtimePolicyConfiguration
        .intrinsic_document_scoring_policy,

    temporal_document_scoring_policy:
      runtimePolicyConfiguration
        .temporal_document_scoring_policy,

    query_relevance_scoring_policy:
      runtimePolicyConfiguration
        .query_relevance_scoring_policy,

    link_authority_scoring_policy:
      runtimePolicyConfiguration
        .link_authority_scoring_policy,

    behavioral_calibration_scoring_policy:
      runtimePolicyConfiguration
        .behavioral_calibration_scoring_policy,

    penalty_evaluation_policy:
      runtimePolicyConfiguration
        .penalty_evaluation_policy,

    analytical_aggregation_policy:
      runtimePolicyConfiguration
        .analytical_aggregation_policy,

    eligibility_evaluation_policy:
      runtimePolicyConfiguration
        .eligibility_evaluation_policy,

    cohort_normalization_policy:
      runtimePolicyConfiguration
        .cohort_normalization_policy,

    relative_cohort_evaluation_policy:
      runtimePolicyConfiguration
        .relative_cohort_evaluation_policy,

    private_decision_policy:
      runtimePolicyConfiguration
        .private_decision_policy,

    public_transformation_policy:
      runtimePolicyConfiguration
        .public_transformation_policy,

    public_ranking_policy:
      runtimePolicyConfiguration
        .public_ranking_policy,
  } satisfies SearchRuntimeProducerAdapterDependencyConfiguration;

  return Object.freeze(
    configuration,
  );
}

/* ============================================================================
 * 9. CANONICAL PRODUCER-ADAPTER DEPENDENCY CREATION
 * ========================================================================== */

export function createSearchFinancialNewsRuntimeProducerAdapterDependencies(
  input:
    SearchFinancialNewsRuntimeConfigurationInput,
): SearchRuntimeProducerAdapterDependencies {
  return createSearchRuntimeProducerAdapterDependencies(
    createSearchFinancialNewsRuntimeConfiguration(
      input,
    ),
  );
}

/* ============================================================================
 * 10. STATIC MANIFEST
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_CONFIGURATION_MANIFEST =
  Object.freeze({
    configuration:
      "FINANCIAL_NEWS_RUNTIME_CONFIGURATION_V1",

    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_CONFIGURATION_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_CONFIGURATION_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    runtime_policy_configuration_field_count:
      20,

    generic_runtime_policy_field_count:
      19,

    financial_news_domain_policy_field_count:
      1,

    deferred_runtime_policy_binding_count:
      1,

    deferred_runtime_policy_field:
      "recency_policy",

    recency_policy_bound_to_generic_runtime:
      false,

    authorized_observation_source_count:
      3,

    root_policy_field_count:
      0,

    policy_selection_here:
      false,

    policy_reference_preservation:
      true,

    observation_provider_invocation:
      false,

    runtime_execution:
      false,
  } as const);

/* ============================================================================
 * 11. STATIC OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_CONFIGURATION_OWNERSHIP =
  Object.freeze({
    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_CONFIGURATION_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_CONFIGURATION_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    architectural_plane:
      "CONFIGURATION_PLANE",

    architectural_role:
      "DOMAIN_RUNTIME_ANALYTICAL_CONFIGURATION_BINDER",

    canonical_configuration_contract:
      "SearchRuntimeProducerAdapterDependencyConfiguration",

    canonical_dependency_contract:
      "SearchRuntimeProducerAdapterDependencies",

    financial_news_policy_configuration_contract:
      "SearchFinancialNewsRuntimePolicyConfiguration",

    generic_dependency_factory:
      "createSearchRuntimeProducerAdapterDependencies",

    policy_truth_owner:
      "CANONICAL_POLICY_PRODUCER_OR_AUTHORIZED_CONFIGURATION_SOURCE",

    policy_composition_owner:
      "FINANCIAL_NEWS_RUNTIME_POLICY_COMPOSITION",

    policy_selection_required_here:
      false,

    precomposed_policy_configuration_required_here:
      true,

    policy_values_created_here:
      false,

    policy_values_mutated_here:
      false,

    policy_references_bound_here:
      true,

    observation_truth_owner:
      "AUTHORIZED_EXTERNAL_OBSERVATION_SOURCES",

    observation_provider_authorization_boundaries:
      Object.freeze([
        "FINANCIAL_NEWS_LINK_OBSERVATION_PROVIDER",
        "FINANCIAL_NEWS_TEMPORAL_OBSERVATION_PROVIDER",
        "FINANCIAL_NEWS_BEHAVIORAL_OBSERVATION_PROVIDER",
      ] as const),

    observation_values_created_here:
      false,

    observation_providers_invoked_here:
      false,

    configuration_envelope_created_here:
      true,

    producer_adapter_dependencies_created_here:
      true,

    acquisition_created_here:
      false,

    runtime_application_created_here:
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
 * 12. STATIC GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUNTIME_CONFIGURATION_GOVERNANCE =
  Object.freeze({
    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    reality_before_interpretation:
      true,

    configuration_composition_execution_separation_required:
      true,

    complete_policy_coverage_required:
      true,

    precomposed_policy_configuration_required:
      true,

    individual_root_policy_selection_allowed:
      false,

    policy_selection_allowed_here:
      false,

    exact_policy_reference_required:
      true,

    implicit_default_policy_selection_allowed:
      false,

    policy_merge_allowed:
      false,

    policy_clone_allowed:
      false,

    policy_normalization_allowed:
      false,

    policy_repair_allowed:
      false,

    policy_inference_allowed:
      false,

    policy_fallback_allowed:
      false,

    exact_provider_reference_required:
      true,

    explicit_observation_source_authorization_required:
      true,

    provider_boundary_bypass_allowed:
      false,

    provider_wrapping_allowed:
      false,

    provider_fallback_allowed:
      false,

    provider_invocation_allowed:
      false,

    provider_failure_swallowing_allowed:
      false,

    observation_creation_allowed:
      false,

    observation_reconstruction_allowed:
      false,

    observation_fallback_allowed:
      false,

    unavailable_evidence_fabrication_allowed:
      false,

    acquisition_configuration_allowed:
      false,

    analytical_calculation_allowed:
      false,

    scoring_allowed:
      false,

    ranking_allowed:
      false,

    calibration_execution_allowed:
      false,

    application_creation_allowed:
      false,

    runtime_execution_allowed:
      false,

    execution_context_creation_allowed:
      false,

    trace_collector_creation_allowed:
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

    network_access_initiated_here:
      false,

    file_system_access_allowed:
      false,

    prohibited_shortcuts:
      Object.freeze([
        "individual_root_policy_selection",
        "implicit_default_policy_import",
        "implicit_default_policy_selection",
        "missing_policy_fallback",
        "policy_merge",
        "policy_clone",
        "policy_normalization",
        "policy_repair",
        "policy_inference_from_runtime_input",
        "policy_inference_from_document_state",
        "policy_inference_from_query_state",
        "policy_inference_from_observation_state",

        "provider_boundary_bypass",
        "provider_wrapper",
        "provider_try_catch_fallback",
        "provider_failure_to_empty_observations",
        "provider_failure_to_unavailable_evidence",

        "synthetic_link_observations",
        "synthetic_temporal_observations",
        "synthetic_behavioral_evidence",

        "acquisition_reconstruction",
        "analytical_recalculation",
        "score_reconstruction",
        "ranking_reconstruction",

        "application_creation",
        "runtime_execution",
        "execution_context_creation",
        "trace_collector_creation",

        "execution_trace_generation",
        "variable_lineage_generation",
        "identity_generation",

        "runtime_clock_access",
        "random_identity_generation",

        "persistence",
        "mutable_global_state",
        "cache_mutation",
        "logging",
        "network_access_initiated_here",
      ] as const),
  } as const);
