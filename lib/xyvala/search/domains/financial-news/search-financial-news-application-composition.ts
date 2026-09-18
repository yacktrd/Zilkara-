/* ============================================================================
 * FILE: lib/xyvala/search/domains/financial-news/search-financial-news-application-composition.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search Financial News canonical application composition
 *
 * ROLE
 * - compose the concrete Financial News Search application root
 * - bind one explicitly authorized Financial News acquisition source
 * - compose the complete Financial News runtime policy configuration from one
 *   explicitly authorized Behavioral Calibration policy
 * - bind the three explicitly authorized Financial News observation sources
 * - create the complete Financial News producer-adapter dependencies through
 *   the canonical runtime-configuration boundary
 * - delegate final application composition to
 *   createSearchRuntimeApplicationComposition(...)
 *
 * CLASSIFICATION
 * - SEARCH DOMAIN
 * - FINANCIAL NEWS
 * - APPLICATION COMPOSITION
 * - DOMAIN-TO-RUNTIME WIRING
 * - COMPOSITION PLANE
 * - CONFIGURE / VALIDATE / COMPOSE / BIND
 * - APPLICATION-SCOPED
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING
 * - NON-TRANSFORMING
 * - NON-CALIBRATING
 * - NON-TRACE-PRODUCING
 * - NON-LINEAGE-PRODUCING
 * - NON-IDENTITY-PRODUCING
 * - NON-SNAPSHOT-PRODUCING
 * - NON-EXECUTING
 * - NON-MUTATING
 * - DETERMINISTIC GIVEN DETERMINISTIC DEPENDENCIES
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * authorized external Financial News acquisition source
 *        ↓
 * createSearchFinancialNewsAcquisitionAdapter(...)
 *        ↓
 * canonical SearchRuntimePorts["acquire_documents"]
 *        ↓
 * buildSearchFinancialNewsAcquisitionPort(...)
 *        ↓
 * canonical Financial News acquisition boundary
 *
 * explicit authorized Behavioral Calibration policy
 *        ↓
 * createSearchFinancialNewsRuntimePolicyComposition(...)
 *        ↓
 * complete nineteen-policy Financial News runtime policy configuration
 *
 * three authorized Financial News observation sources
 *        +
 * complete nineteen-policy configuration
 *        ↓
 * createSearchFinancialNewsRuntimeProducerAdapterDependencies(...)
 *        ↓
 * SearchRuntimeProducerAdapterDependencies
 *
 * acquisition capability
 *        +
 * producer-adapter dependencies
 *        ↓
 * THIS DOMAIN APPLICATION COMPOSITION
 *        ↓
 * createSearchRuntimeApplicationComposition(...)
 *        ↓
 * canonical SearchRuntimeApplication
 *        ↓
 * future application.run(...)
 *
 * IMPORTANT — APPLICATION COMPOSITION != EXECUTION
 * ----------------------------------------------------------------------------
 * This module creates an application-scoped composition root.
 *
 * It MUST NOT execute:
 *
 * application.run(...)
 *
 * Run-scoped lifecycle remains owned by:
 *
 * search-runtime-application.ts
 *        ↓
 * search-runtime-execution-context.ts
 *        ↓
 * search-runtime-bootstrap.ts
 *        ↓
 * search-runtime-composition.ts
 *        ↓
 * search-runtime-orchestrator.ts
 *
 * Therefore this file MUST NOT create directly:
 *
 * - SearchRuntimeExecutionContext
 * - SearchRuntimeExecutionTraceCollector
 * - SearchRuntimeBootstrap
 * - SearchRuntimeOrchestrator
 * - resolve_snapshot_traceability
 * - execution-observation ports
 *
 * ACQUISITION OWNERSHIP
 * ----------------------------------------------------------------------------
 * The external acquisition source owns external Financial News acquisition
 * observations.
 *
 * search-financial-news-acquisition-adapter.ts owns the authorized adaptation:
 *
 * SearchFinancialNewsAcquisitionInput
 *        ↓
 * SearchAcquisitionInput
 *        ↓
 * canonical buildSearchRawDocument(...)
 *
 * THIS file does NOT:
 *
 * - fetch news
 * - choose an external news source
 * - create acquisition observations
 * - create SearchRawDocument values
 * - reconstruct source metadata
 * - generate fetched_at
 * - generate source_published_at
 * - convert fetched_at into published_at
 * - convert published_at into fetched_at
 * - manufacture an empty acquisition result
 * - catch acquisition-provider failures
 *
 * The acquisition adapter itself is not invoked at application-composition
 * time. It is only constructed here as the canonical acquire_documents
 * capability that will execute later during application.run(...).
 *
 * ACQUISITION PROVIDER BOUNDARY
 * ----------------------------------------------------------------------------
 * The adapter result already satisfies the canonical Search runtime
 * acquire_documents port.
 *
 * It is then passed unchanged through:
 *
 * buildSearchFinancialNewsAcquisitionPort(...)
 *
 * This preserves the explicit Financial News domain authorization boundary
 * without introducing another adaptation.
 *
 * Invariant:
 *
 * canonicalAcquisitionPort
 * ===
 * acquisitionAdapter
 *
 * POLICY COMPOSITION OWNERSHIP
 * ----------------------------------------------------------------------------
 * Policy selection and convergence no longer belong to runtime configuration
 * or to this application composition.
 *
 * They are owned by:
 *
 * search-financial-news-runtime-policy-composition.ts
 *
 * This module supplies only the explicitly authorized Behavioral Calibration
 * policy required by that policy-composition boundary.
 *
 * The resulting complete nineteen-policy configuration is consumed unchanged
 * by:
 *
 * search-financial-news-runtime-configuration.ts
 *
 * IMPORTANT:
 *
 * this module MUST NOT:
 * - select producer-owned presets
 * - import DEFAULT_* policies
 * - select the Behavioral Calibration bootstrap implicitly
 * - create policy thresholds
 * - create policy weights
 * - create policy methods
 * - reconstruct any of the nineteen policies
 *
 * A bootstrap/application root may explicitly pass:
 *
 * XYVALA_SEARCH_FINANCIAL_NEWS_BEHAVIORAL_CALIBRATION_BOOTSTRAP_POLICY_V1
 *
 * A future authorized offline calibration lifecycle may pass another policy
 * satisfying the same canonical Behavioral Calibration contract.
 *
 * OBSERVATION-SOURCE OWNERSHIP
 * ----------------------------------------------------------------------------
 * Link, Temporal and Behavioral observation truths remain owned by the three
 * explicitly authorized external sources.
 *
 * Their provider authorization boundaries remain owned by:
 *
 * - search-financial-news-link-observation-provider.ts
 * - search-financial-news-temporal-observation-provider.ts
 * - search-financial-news-behavioral-observation-provider.ts
 *
 * This application composition transports those source references to the
 * runtime-configuration boundary.
 *
 * It MUST NOT:
 * - invoke observation providers
 * - create link observations
 * - create temporal observations
 * - create behavioral observations
 * - fabricate unavailable evidence
 * - swallow provider failures
 *
 * RUNTIME CONFIGURATION OWNERSHIP
 * ----------------------------------------------------------------------------
 * Runtime dependency binding remains owned by:
 *
 * search-financial-news-runtime-configuration.ts
 *
 * This module supplies:
 *
 * - one precomposed nineteen-policy configuration;
 * - three authorized observation sources.
 *
 * It delegates conversion to:
 *
 * createSearchFinancialNewsRuntimeProducerAdapterDependencies(...)
 *
 * GENERIC APPLICATION COMPOSITION OWNERSHIP
 * ----------------------------------------------------------------------------
 * The canonical generic application composition remains:
 *
 * createSearchRuntimeApplicationComposition(...)
 *
 * It owns:
 *
 * - producer module-version governance validation before runtime;
 * - canonical snapshot variable-lineage resolver binding;
 * - construction of SearchRuntimeApplicationDependencies;
 * - delegation to createSearchRuntimeApplication(...).
 *
 * THIS Financial News composition MUST NOT duplicate those responsibilities.
 *
 * It supplies only:
 *
 * external_direct_sources.acquire_documents
 *        +
 * producer_adapter_dependencies
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * Types are derived directly from existing canonical contracts:
 *
 * - SearchFinancialNewsAcquisitionSourcePort
 * - SearchFinancialNewsRuntimePolicyCompositionInput
 * - SearchFinancialNewsRuntimeConfigurationInput
 * - SearchRuntimeApplicationCompositionInput
 * - SearchRuntimeApplicationComposition
 *
 * No duplicate producer policy, runtime dependency or application contract is
 * introduced.
 *
 * EXACT APPLICATION INPUT
 * ----------------------------------------------------------------------------
 * Exactly five application-scoped external truths are accepted:
 *
 * 1. authorized_acquisition_source
 * 2. behavioral_calibration_scoring_policy
 * 3. authorized_link_observation_source
 * 4. authorized_temporal_observation_source
 * 5. authorized_behavioral_observation_source
 *
 * No preassembled runtime configuration is accepted.
 *
 * No individual non-calibration policy is accepted.
 *
 * No execution-scoped capability is accepted.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * invalid Financial News application composition root
 * => THIS boundary
 *
 * invalid authorized acquisition source
 * => Financial News acquisition adapter / provider boundary
 *
 * invalid Behavioral Calibration policy
 * => Financial News Behavioral Calibration artifact / policy composition
 *    boundary
 *
 * invalid policy composition
 * => Financial News runtime policy composition boundary
 *
 * invalid authorized observation source
 * => corresponding Financial News observation-provider boundary
 *
 * invalid Financial News runtime dependency configuration
 * => Financial News runtime configuration boundary
 *
 * invalid generic producer-adapter dependency configuration
 * => generic Search producer-adapter dependency boundary
 *
 * invalid VLR / producer-version governance
 * => generic Search application-composition governance boundary
 *
 * acquisition or observation execution failure
 * => corresponding authorized external source boundary
 *
 * run-scoped execution failure
 * => canonical runtime execution boundary
 *
 * This module MUST NOT repair any divergence.
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - explicit dependency injection only
 * - exact source references only
 * - canonical acquisition adapter only
 * - canonical acquisition provider boundary only
 * - canonical runtime policy composition only
 * - canonical Financial News runtime configuration only
 * - canonical generic application composition only
 *
 * - no implicit source
 * - no source selection
 * - no fallback source
 * - no implicit Behavioral Calibration bootstrap
 * - no individual non-calibration policy input
 * - no policy reconstruction
 * - no implicit default policy
 * - no provider fallback
 * - no acquisition execution
 * - no observation-provider execution
 * - no runtime execution
 * - no analytical calculation
 * - no score calculation
 * - no ranking calculation
 * - no public transformation
 * - no calibration
 * - no trace reconstruction
 * - no lineage reconstruction
 * - no snapshot reconstruction
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
 * - Xyvala Search Protocol 3.0
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
  createSearchRuntimeApplicationComposition,
  type SearchRuntimeApplicationComposition,
  type SearchRuntimeApplicationCompositionInput,
} from "../../runtime/search-runtime-application-composition";

import {
  createSearchFinancialNewsAcquisitionAdapter,
  type SearchFinancialNewsAcquisitionSourcePort,
} from "./search-financial-news-acquisition-adapter";

import {
  buildSearchFinancialNewsAcquisitionPort,
} from "./search-financial-news-acquisition-provider";

import {
  createSearchFinancialNewsRuntimeProducerAdapterDependencies,
  type SearchFinancialNewsRuntimeConfigurationInput,
} from "./search-financial-news-runtime-configuration";

import {
  createSearchFinancialNewsRuntimePolicyComposition,
  type SearchFinancialNewsRuntimePolicyCompositionInput,
} from "./search-financial-news-runtime-policy-composition";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_APPLICATION_COMPOSITION_MODULE_NAME =
  "xyvala-search-financial-news-application-composition" as const;

export const XYVALA_SEARCH_FINANCIAL_NEWS_APPLICATION_COMPOSITION_MODULE_VERSION:
  SearchModuleVersion =
    "1.1.0";

/* ============================================================================
 * 2. DOMAIN APPLICATION COMPOSITION INPUT
 * ========================================================================== */

export interface SearchFinancialNewsApplicationCompositionInput {
  readonly authorized_acquisition_source:
    SearchFinancialNewsAcquisitionSourcePort;

  readonly behavioral_calibration_scoring_policy:
    SearchFinancialNewsRuntimePolicyCompositionInput[
      "behavioral_calibration_scoring_policy"
    ];

  readonly authorized_link_observation_source:
    SearchFinancialNewsRuntimeConfigurationInput[
      "authorized_link_observation_source"
    ];

  readonly authorized_temporal_observation_source:
    SearchFinancialNewsRuntimeConfigurationInput[
      "authorized_temporal_observation_source"
    ];

  readonly authorized_behavioral_observation_source:
    SearchFinancialNewsRuntimeConfigurationInput[
      "authorized_behavioral_observation_source"
    ];
}

/* ============================================================================
 * 3. EXACT INPUT COVERAGE
 * ========================================================================== */

type SearchFinancialNewsApplicationCompositionExpectedInputField =
  | "authorized_acquisition_source"
  | "behavioral_calibration_scoring_policy"
  | "authorized_link_observation_source"
  | "authorized_temporal_observation_source"
  | "authorized_behavioral_observation_source";

type SearchFinancialNewsApplicationCompositionMissingInputField =
  Exclude<
    SearchFinancialNewsApplicationCompositionExpectedInputField,
    keyof SearchFinancialNewsApplicationCompositionInput
  >;

type SearchFinancialNewsApplicationCompositionUnknownInputField =
  Exclude<
    keyof SearchFinancialNewsApplicationCompositionInput,
    SearchFinancialNewsApplicationCompositionExpectedInputField
  >;

type SearchFinancialNewsApplicationCompositionInputCoverageIsExact =
  [
    SearchFinancialNewsApplicationCompositionMissingInputField,
    SearchFinancialNewsApplicationCompositionUnknownInputField,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_FINANCIAL_NEWS_APPLICATION_COMPOSITION_INPUT_COVERAGE_IS_EXACT:
  SearchFinancialNewsApplicationCompositionInputCoverageIsExact =
    true;

void XYVALA_SEARCH_FINANCIAL_NEWS_APPLICATION_COMPOSITION_INPUT_COVERAGE_IS_EXACT;

/* ============================================================================
 * 4. ROOT INPUT ASSERTION
 * ========================================================================== */

function assertSearchFinancialNewsApplicationCompositionInput(
  input:
    SearchFinancialNewsApplicationCompositionInput,
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
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_APPLICATION_COMPOSITION_MODULE_NAME}] ` +
        "Application composition violation: input must be an object.",
    );
  }
}

/* ============================================================================
 * 5. CANONICAL ACQUISITION CAPABILITY ASSEMBLY
 * ========================================================================== */

function createSearchFinancialNewsApplicationAcquisitionPort(
  authorizedAcquisitionSource:
    SearchFinancialNewsAcquisitionSourcePort,
): SearchRuntimeApplicationCompositionInput[
  "external_direct_sources"
]["acquire_documents"] {
  const acquisitionAdapter =
    createSearchFinancialNewsAcquisitionAdapter({
      authorized_source:
        authorizedAcquisitionSource,
    });

  return buildSearchFinancialNewsAcquisitionPort({
    authorized_acquisition_source:
      acquisitionAdapter,
  });
}

/* ============================================================================
 * 6. CANONICAL FINANCIAL NEWS APPLICATION COMPOSITION
 * ========================================================================== */

export function createSearchFinancialNewsApplicationComposition(
  input:
    SearchFinancialNewsApplicationCompositionInput,
): SearchRuntimeApplicationComposition {
  assertSearchFinancialNewsApplicationCompositionInput(
    input,
  );

  const acquireDocuments =
    createSearchFinancialNewsApplicationAcquisitionPort(
      input
        .authorized_acquisition_source,
    );

  const runtimePolicyConfiguration =
    createSearchFinancialNewsRuntimePolicyComposition({
      behavioral_calibration_scoring_policy:
        input
          .behavioral_calibration_scoring_policy,
    });

  const producerAdapterDependencies =
    createSearchFinancialNewsRuntimeProducerAdapterDependencies({
      runtime_policy_configuration:
        runtimePolicyConfiguration,

      authorized_link_observation_source:
        input
          .authorized_link_observation_source,

      authorized_temporal_observation_source:
        input
          .authorized_temporal_observation_source,

      authorized_behavioral_observation_source:
        input
          .authorized_behavioral_observation_source,
    });

  const externalDirectSources =
    Object.freeze({
      acquire_documents:
        acquireDocuments,
    } satisfies SearchRuntimeApplicationCompositionInput[
      "external_direct_sources"
    ]);

  const applicationCompositionInput =
    Object.freeze({
      external_direct_sources:
        externalDirectSources,

      producer_adapter_dependencies:
        producerAdapterDependencies,
    } satisfies SearchRuntimeApplicationCompositionInput);

  return createSearchRuntimeApplicationComposition(
    applicationCompositionInput,
  );
}

/* ============================================================================
 * 7. STATIC MANIFEST
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_APPLICATION_COMPOSITION_MANIFEST =
  Object.freeze({
    composition:
      "FINANCIAL_NEWS_APPLICATION_COMPOSITION_V1",

    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_APPLICATION_COMPOSITION_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_APPLICATION_COMPOSITION_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    application_scoped_external_input_count:
      5,

    acquisition_source_input_count:
      1,

    behavioral_calibration_policy_input_count:
      1,

    observation_source_input_count:
      3,

    preassembled_runtime_configuration_input:
      false,

    individual_non_calibration_policy_input:
      false,

    policy_composition_invoked:
      true,

    runtime_configuration_boundary_invoked:
      true,

    generic_application_composition_invoked:
      true,

    application_run_invoked:
      false,

    policy_reference_reconstruction:
      false,

    analytical_truth_created:
      false,
  } as const);

/* ============================================================================
 * 8. STATIC OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_APPLICATION_COMPOSITION_OWNERSHIP =
  Object.freeze({
    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_APPLICATION_COMPOSITION_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_APPLICATION_COMPOSITION_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    architectural_plane:
      "COMPOSITION_PLANE",

    architectural_role:
      "DOMAIN_APPLICATION_COMPOSITION_ROOT",

    generic_application_composition_owner:
      "SEARCH_RUNTIME_APPLICATION_COMPOSITION",

    generic_application_composition_factory:
      "createSearchRuntimeApplicationComposition",

    acquisition_external_truth_owner:
      "AUTHORIZED_EXTERNAL_FINANCIAL_NEWS_ACQUISITION_SOURCE",

    acquisition_adapter_owner:
      "FINANCIAL_NEWS_ACQUISITION_ADAPTER",

    acquisition_provider_boundary_owner:
      "FINANCIAL_NEWS_ACQUISITION_PROVIDER",

    raw_document_truth_owner:
      "SEARCH_ACQUISITION_CORE",

    policy_composition_owner:
      "FINANCIAL_NEWS_RUNTIME_POLICY_COMPOSITION",

    behavioral_calibration_policy_truth_owner:
      "AUTHORIZED_CALIBRATION_OR_CONFIGURATION_LIFECYCLE",

    analytical_runtime_configuration_owner:
      "FINANCIAL_NEWS_RUNTIME_CONFIGURATION",

    observation_truth_owner:
      "AUTHORIZED_EXTERNAL_OBSERVATION_SOURCES",

    producer_adapter_dependency_owner:
      "SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCIES",

    variable_lineage_truth_owner:
      "VARIABLE_LINEAGE_GOVERNANCE",

    execution_trace_truth_owner:
      "EXECUTION_TRACEABILITY",

    execution_context_owner:
      "SEARCH_RUNTIME_EXECUTION_CONTEXT",

    application_lifecycle_owner:
      "SEARCH_RUNTIME_APPLICATION",

    authorized_acquisition_source_bound_here:
      true,

    acquisition_adapter_constructed_here:
      true,

    acquisition_provider_boundary_applied_here:
      true,

    acquisition_source_invoked_here:
      false,

    raw_document_created_here:
      false,

    behavioral_calibration_policy_created_here:
      false,

    behavioral_calibration_policy_selected_here:
      false,

    runtime_policy_configuration_materialized_here:
      true,

    policy_truth_created_here:
      false,

    observation_source_references_bound_here:
      true,

    observation_providers_invoked_here:
      false,

    producer_adapter_dependencies_created_here:
      true,

    generic_application_composition_invoked_here:
      true,

    application_instance_returned_here:
      true,

    application_run_invoked_here:
      false,

    execution_context_created_here:
      false,

    bootstrap_created_here:
      false,

    orchestrator_created_here:
      false,

    execution_trace_collector_created_here:
      false,

    execution_trace_created_here:
      false,

    variable_lineage_materialized_here:
      false,

    private_snapshot_created_here:
      false,

    public_ranking_created_here:
      false,

    analytical_truth_created_here:
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

export const XYVALA_SEARCH_FINANCIAL_NEWS_APPLICATION_COMPOSITION_GOVERNANCE =
  Object.freeze({
    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    reality_before_interpretation:
      true,

    one_truth_one_owner:
      true,

    application_scoped_composition_required:
      true,

    run_scoped_execution_allowed:
      false,

    exact_five_field_external_input_required:
      true,

    explicit_acquisition_source_required:
      true,

    explicit_behavioral_calibration_policy_required:
      true,

    explicit_observation_sources_required:
      true,

    preassembled_runtime_configuration_input_allowed:
      false,

    individual_non_calibration_policy_input_allowed:
      false,

    canonical_acquisition_adapter_required:
      true,

    canonical_acquisition_provider_boundary_required:
      true,

    canonical_runtime_policy_composition_required:
      true,

    canonical_runtime_configuration_required:
      true,

    canonical_generic_application_composition_required:
      true,

    implicit_source_allowed:
      false,

    source_selection_allowed:
      false,

    source_fallback_allowed:
      false,

    hidden_behavioral_calibration_bootstrap_allowed:
      false,

    implicit_default_policy_allowed:
      false,

    policy_reconstruction_allowed:
      false,

    policy_selection_allowed_here:
      false,

    provider_fallback_allowed:
      false,

    acquisition_execution_allowed:
      false,

    observation_provider_execution_allowed:
      false,

    runtime_execution_allowed:
      false,

    analytical_calculation_allowed:
      false,

    scoring_allowed:
      false,

    ranking_allowed:
      false,

    public_transformation_allowed:
      false,

    calibration_allowed:
      false,

    trace_reconstruction_allowed:
      false,

    lineage_reconstruction_allowed:
      false,

    snapshot_reconstruction_allowed:
      false,

    execution_context_creation_allowed:
      false,

    trace_collector_creation_allowed:
      false,

    bootstrap_creation_allowed:
      false,

    orchestrator_creation_allowed:
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
        "preassembled_runtime_configuration_input",
        "individual_non_calibration_policy_input",

        "implicit_acquisition_source",
        "select_acquisition_source_inside_composition",
        "fallback_acquisition_source",

        "hidden_behavioral_calibration_bootstrap",
        "implicit_behavioral_calibration_default",
        "select_behavioral_calibration_policy_inside_composition",

        "reconstruct_runtime_policy_configuration",
        "invent_policy",
        "implicit_default_policy",

        "provider_fallback",
        "provider_failure_to_empty_observations",
        "provider_failure_to_unavailable_evidence",

        "acquisition_execution",
        "observation_provider_execution",
        "runtime_execution",

        "analytical_recalculation",
        "score_reconstruction",
        "ranking_reconstruction",
        "public_transformation_reconstruction",

        "current_run_calibration",
        "trace_reconstruction",
        "lineage_reconstruction",
        "snapshot_reconstruction",

        "execution_context_creation",
        "trace_collector_creation",
        "bootstrap_creation",
        "orchestrator_creation",

        "runtime_clock_access",
        "random_identity_generation",

        "persistence",
        "mutable_global_state",
        "cache_mutation",
        "logging",
        "network_access_initiated_here",
      ] as const),
  } as const);
