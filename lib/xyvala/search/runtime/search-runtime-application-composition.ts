/* ============================================================================
 * FILE:
 * lib/xyvala/search/runtime/search-runtime-application-composition.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical runtime application composition root
 *
 * ROLE
 * - compose the application-scoped Search runtime dependency root
 * - bind canonical external direct sources unchanged
 * - bind canonical producer-adapter dependencies unchanged
 * - bind the canonical Private Snapshot variable-lineage resolver into
 *   SearchRuntimeExecutionContextDependencies
 * - validate producer module-version governance before any Search run
 * - delegate run-scoped execution lifecycle creation exclusively to
 *   createSearchRuntimeApplication(...)
 *
 * CLASSIFICATION
 * - SEARCH RUNTIME
 * - APPLICATION COMPOSITION ROOT
 * - DEPENDENCY BINDING
 * - GOVERNANCE-TO-RUNTIME WIRING
 * - VALIDATE / COMPOSE / BIND
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING
 * - NON-TRANSFORMING
 * - NON-CALIBRATING
 * - NON-TRACE-PRODUCING
 * - NON-LINEAGE-PRODUCING
 * - NON-IDENTITY-PRODUCING
 * - NON-SNAPSHOT-PRODUCING
 * - NON-MUTATING
 * - DETERMINISTIC GIVEN DETERMINISTIC DEPENDENCIES
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * canonical external acquisition source
 *        +
 * canonical producer-adapter dependencies
 *        +
 * canonical Search VLR / producer-version governance
 *        +
 * resolveSearchRuntimeSnapshotVariableLineage
 *        ↓
 * THIS APPLICATION COMPOSITION ROOT
 *        ↓
 * SearchRuntimeApplicationDependencies
 *        ↓
 * createSearchRuntimeApplication(...)
 *        ↓
 * application.run(...)
 *        ↓
 * fresh SearchRuntimeExecutionContext
 *        ↓
 * fresh execution trace collector
 *        ↓
 * fresh resolve_snapshot_traceability capability
 *        ↓
 * fresh SearchRuntimeBootstrapDependencies
 *        ↓
 * fresh configured SearchRuntimeOrchestrator
 *        ↓
 * canonical PUBLIC_RANKING truth
 *
 * IMPORTANT — APPLICATION COMPOSITION != ANALYTICAL COMPOSITION
 * ----------------------------------------------------------------------------
 * search-runtime-composition.ts governs the canonical analytical/runtime port
 * composition boundary.
 *
 * This file governs the higher application dependency root.
 *
 * These responsibilities remain distinct.
 *
 * THIS FILE MUST NOT:
 * - call createSearchRuntimeExecutionContext(...)
 * - call createSearchRuntimeBootstrap(...)
 * - call createSearchRuntimeComposition(...)
 * - create an orchestrator
 * - create an execution trace collector
 * - create execution-observation ports
 * - create resolve_snapshot_traceability
 * - execute application.run(...)
 *
 * Run-scoped capabilities remain owned by search-runtime-application.ts and
 * search-runtime-execution-context.ts.
 *
 * VARIABLE LINEAGE GOVERNANCE
 * ----------------------------------------------------------------------------
 * Variable-lineage truth remains owned by:
 *
 * VARIABLE_LINEAGE_GOVERNANCE
 *
 * Producer module-version truth remains owned by:
 *
 * CONFIGURED_CANONICAL_PRODUCER
 *
 * The producer-module -> producer-version governed reference remains owned by:
 *
 * SEARCH_PRODUCER_MODULE_VERSION_REGISTRY
 *
 * This composition root binds only:
 *
 * resolve_snapshot_variable_lineage
 *        ->
 * resolveSearchRuntimeSnapshotVariableLineage
 *
 * It does NOT:
 * - materialize SearchVariableLineage directly
 * - reconstruct lineage from runtime state
 * - inspect traces
 * - inspect documents
 * - inspect query state
 * - inspect cohort state
 * - inspect decisions
 * - inspect snapshots
 *
 * TRACEABILITY GOVERNANCE
 * ----------------------------------------------------------------------------
 * Execution trace truth remains owned by:
 *
 * EXECUTION_TRACEABILITY
 *
 * This file does NOT bind resolve_snapshot_traceability directly.
 *
 * That capability is created fresh per application.run(...) by:
 *
 * createSearchRuntimeExecutionContext(...)
 *
 * and later transported into SearchRuntimeBootstrapDependencies by:
 *
 * search-runtime-application.ts
 *
 * PRODUCER VERSION VALIDATION
 * ----------------------------------------------------------------------------
 * validateSearchProducerModuleVersionRegistry() is executed at application
 * composition time.
 *
 * This is intentional:
 *
 * Contract Before Runtime
 *        ↓
 * validate canonical VLR + ACTIVE producer coverage + snapshot coverage
 *        ↓
 * create application configuration root
 *        ↓
 * future application.run(...)
 *
 * The validation is:
 * - pure
 * - deterministic
 * - non-analytical
 * - non-lineage-producing
 * - non-trace-producing
 *
 * It is deliberately NOT executed inside the per-snapshot resolver.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * invalid composition input root
 * => application composition boundary
 *
 * invalid VLR / producer module-version registry
 * => producer module-version governance boundary
 *
 * invalid external direct source
 * => SearchRuntimeApplication dependency validation
 *
 * invalid producer-adapter dependency
 * => SearchRuntimeApplication / Bootstrap dependency validation
 *
 * invalid snapshot variable-lineage resolution
 * => canonical snapshot variable-lineage resolver / VLR boundary
 *
 * This module MUST NOT repair any divergence.
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * This module introduces no second runtime contract.
 *
 * Input field types are derived directly from:
 *
 * SearchRuntimeApplicationDependencies
 *
 * The final dependency object is checked with:
 *
 * satisfies SearchRuntimeApplicationDependencies
 *
 * No local duplicate of:
 * - SearchRuntimeApplicationExternalDirectSources
 * - SearchRuntimeBootstrapDependencies
 * - SearchRuntimeExecutionContextDependencies
 * is created.
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - preserve dependency references unchanged
 * - exact canonical resolver binding only
 * - validate governance before application creation
 * - delegate application dependency validation to canonical application factory
 * - preserve run-scoped lifecycle ownership
 *
 * - no local fallback
 * - no inferred dependency
 * - no alternate resolver
 * - no synthetic traceability owner
 * - no lineage reconstruction
 * - no trace reconstruction
 * - no snapshot reconstruction
 * - no analytical calculation
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
 * - Search VLR OFFICIAL / NORMATIVE
 * - Contract Before Runtime
 * - First Divergence Before Correction
 * - one truth = one canonical owner
 * - no downstream reconstruction
 * - Compute / Observe / Mutate separation
 * - application-scoped configuration != run-scoped execution
 * ========================================================================== */

import type {
  SearchModuleVersion,
} from "../contracts/search-pipeline-contract";

import {
  validateSearchProducerModuleVersionRegistry,
} from "../governance/search-producer-module-version-registry";

import {
  createSearchRuntimeApplication,
} from "./search-runtime-application";

import type {
  SearchRuntimeApplicationDependencies,
} from "./search-runtime-application";

import {
  resolveSearchRuntimeSnapshotVariableLineage,
} from "./search-runtime-snapshot-variable-lineage-resolver";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_APPLICATION_COMPOSITION_MODULE_NAME =
  "xyvala-search-runtime-application-composition" as const;

export const XYVALA_SEARCH_RUNTIME_APPLICATION_COMPOSITION_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

/* ============================================================================
 * 2. APPLICATION COMPOSITION INPUT
 * ----------------------------------------------------------------------------
 * Only application-scoped externally supplied roots are accepted here.
 *
 * execution_context_dependencies is intentionally NOT accepted from the
 * caller because this composition root owns the canonical binding of:
 *
 * resolve_snapshot_variable_lineage
 * ->
 * resolveSearchRuntimeSnapshotVariableLineage
 *
 * Run-scoped execution context creation itself remains elsewhere.
 * ========================================================================== */

export interface SearchRuntimeApplicationCompositionInput {
  readonly external_direct_sources:
    SearchRuntimeApplicationDependencies[
      "external_direct_sources"
    ];

  readonly producer_adapter_dependencies:
    SearchRuntimeApplicationDependencies[
      "producer_adapter_dependencies"
    ];
}

/* ============================================================================
 * 3. COMPOSITION INPUT FIELD COVERAGE
 * ----------------------------------------------------------------------------
 * Compile-time declaration governance.
 * ========================================================================== */

type SearchRuntimeApplicationCompositionDeclaredInputField =
  | "external_direct_sources"
  | "producer_adapter_dependencies";

type SearchRuntimeApplicationCompositionMissingInputField =
  Exclude<
    keyof SearchRuntimeApplicationCompositionInput,
    SearchRuntimeApplicationCompositionDeclaredInputField
  >;

type SearchRuntimeApplicationCompositionUnknownInputField =
  Exclude<
    SearchRuntimeApplicationCompositionDeclaredInputField,
    keyof SearchRuntimeApplicationCompositionInput
  >;

type SearchRuntimeApplicationCompositionInputCoverageIsExact =
  [
    SearchRuntimeApplicationCompositionMissingInputField,
    SearchRuntimeApplicationCompositionUnknownInputField,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_RUNTIME_APPLICATION_COMPOSITION_INPUT_COVERAGE_IS_EXACT:
  SearchRuntimeApplicationCompositionInputCoverageIsExact =
    true;

void XYVALA_SEARCH_RUNTIME_APPLICATION_COMPOSITION_INPUT_COVERAGE_IS_EXACT;

/* ============================================================================
 * 4. RESULT TYPE
 * ----------------------------------------------------------------------------
 * Derived from the canonical application factory.
 *
 * No duplicate SearchRuntimeApplication contract is introduced.
 * ========================================================================== */

export type SearchRuntimeApplicationComposition =
  ReturnType<
    typeof createSearchRuntimeApplication
  >;

/* ============================================================================
 * 5. ROOT INPUT ASSERTION
 * ----------------------------------------------------------------------------
 * Only the composition-root object itself is checked here.
 *
 * Nested application dependency validation remains owned by:
 *
 * createSearchRuntimeApplication(...)
 *
 * This avoids duplicated validation semantics.
 * ========================================================================== */

function assertSearchRuntimeApplicationCompositionInput(
  input:
    SearchRuntimeApplicationCompositionInput,
): void {
  if (
    typeof input !==
      "object" ||
    input ===
      null
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_APPLICATION_COMPOSITION_MODULE_NAME}] ` +
        "Application composition violation: input must be an object.",
    );
  }
}

/* ============================================================================
 * 6. CANONICAL EXECUTION CONTEXT DEPENDENCY BINDING
 * ----------------------------------------------------------------------------
 * Application-scoped binding only.
 *
 * This does NOT create a SearchRuntimeExecutionContext.
 *
 * One fresh context remains created later for each application.run(...).
 * ========================================================================== */

const XYVALA_SEARCH_RUNTIME_APPLICATION_EXECUTION_CONTEXT_DEPENDENCIES =
  Object.freeze({
    resolve_snapshot_variable_lineage:
      resolveSearchRuntimeSnapshotVariableLineage,
  } satisfies SearchRuntimeApplicationDependencies[
    "execution_context_dependencies"
  ]);

/* ============================================================================
 * 7. CANONICAL APPLICATION COMPOSITION FACTORY
 * ----------------------------------------------------------------------------
 * OFFICIAL FLOW
 *
 * SearchRuntimeApplicationCompositionInput
 *        ↓
 * validate canonical producer-version governance
 *        ↓
 * preserve external direct sources unchanged
 *        ↓
 * preserve producer-adapter dependencies unchanged
 *        ↓
 * inject canonical snapshot variable-lineage resolver
 *        ↓
 * SearchRuntimeApplicationDependencies
 *        ↓
 * createSearchRuntimeApplication(...)
 *
 * No execution begins here.
 * ========================================================================== */

export function createSearchRuntimeApplicationComposition(
  input:
    SearchRuntimeApplicationCompositionInput,
): SearchRuntimeApplicationComposition {
  assertSearchRuntimeApplicationCompositionInput(
    input,
  );

  /*
   * Contract Before Runtime.
   *
   * Validate VLR / producer-version governance before constructing the
   * application configuration root.
   *
   * No analytical producer executes here.
   */
  validateSearchProducerModuleVersionRegistry();

  /*
   * Preserve canonical application-scoped dependency references unchanged.
   *
   * No wrapper.
   * No adapter.
   * No fallback.
   * No inferred capability.
   */
  const applicationDependencies =
    Object.freeze({
      external_direct_sources:
        input.external_direct_sources,

      producer_adapter_dependencies:
        input.producer_adapter_dependencies,

      execution_context_dependencies:
        XYVALA_SEARCH_RUNTIME_APPLICATION_EXECUTION_CONTEXT_DEPENDENCIES,
    } satisfies SearchRuntimeApplicationDependencies);

  /*
   * Canonical application factory remains the sole owner of:
   * - application dependency validation;
   * - application-scoped configuration root creation;
   * - per-run execution-context lifecycle;
   * - per-run bootstrap lifecycle.
   */
  return createSearchRuntimeApplication(
    applicationDependencies,
  );
}

/* ============================================================================
 * 8. STATIC OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_APPLICATION_COMPOSITION_OWNERSHIP =
  Object.freeze({
    module:
      XYVALA_SEARCH_RUNTIME_APPLICATION_COMPOSITION_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_RUNTIME_APPLICATION_COMPOSITION_MODULE_VERSION,

    architectural_plane:
      "EXECUTION_PLANE",

    architectural_role:
      "APPLICATION_COMPOSITION_ROOT",

    application_factory_owner:
      "SEARCH_RUNTIME_APPLICATION",

    application_factory:
      "createSearchRuntimeApplication",

    external_direct_source_truth_owner:
      "EXTERNAL_CONFIGURED_SOURCE",

    producer_adapter_dependency_truth_owner:
      "CANONICAL_RUNTIME_ADAPTER_CONFIGURATION",

    snapshot_variable_lineage_resolver_binding_owner:
      "SEARCH_RUNTIME_APPLICATION_COMPOSITION",

    snapshot_variable_lineage_resolver:
      "resolveSearchRuntimeSnapshotVariableLineage",

    variable_lineage_truth_owner:
      "VARIABLE_LINEAGE_GOVERNANCE",

    producer_module_version_truth_owner:
      "CONFIGURED_CANONICAL_PRODUCER",

    producer_module_version_reference_owner:
      "SEARCH_PRODUCER_MODULE_VERSION_REGISTRY",

    execution_trace_truth_owner:
      "EXECUTION_TRACEABILITY",

    execution_context_owner:
      "SEARCH_RUNTIME_EXECUTION_CONTEXT",

    private_snapshot_owner:
      "PRIVATE_SNAPSHOT",

    analytical_runtime_composition_owner:
      "SEARCH_RUNTIME_COMPOSITION",

    application_dependencies_composed_here:
      true,

    execution_context_created_here:
      false,

    bootstrap_created_here:
      false,

    orchestrator_created_here:
      false,

    execution_trace_collector_created_here:
      false,

    resolve_snapshot_traceability_created_here:
      false,

    variable_lineage_materialized_here:
      false,

    variable_lineage_reconstructed_here:
      false,

    execution_trace_created_here:
      false,

    private_snapshot_created_here:
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

export const XYVALA_SEARCH_RUNTIME_APPLICATION_COMPOSITION_GOVERNANCE =
  Object.freeze({
    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    canonical_application_factory_required:
      true,

    canonical_vlr_required:
      true,

    canonical_producer_version_registry_required:
      true,

    canonical_snapshot_variable_lineage_resolver_required:
      true,

    producer_version_registry_validation_before_application_creation:
      true,

    external_direct_sources_preserved_unchanged:
      true,

    producer_adapter_dependencies_preserved_unchanged:
      true,

    snapshot_variable_lineage_resolver_bound_by_exact_reference:
      true,

    execution_context_run_scoped:
      true,

    bootstrap_run_scoped:
      true,

    orchestrator_run_scoped:
      true,

    execution_trace_collector_run_scoped:
      true,

    analytical_runtime_composition_separate:
      true,

    execution_context_creation_allowed:
      false,

    bootstrap_creation_allowed:
      false,

    orchestrator_creation_allowed:
      false,

    execution_trace_collector_creation_allowed:
      false,

    resolve_snapshot_traceability_creation_allowed:
      false,

    execution_observation_port_creation_allowed:
      false,

    variable_lineage_materialization_allowed:
      false,

    variable_lineage_reconstruction_allowed:
      false,

    execution_trace_generation_allowed:
      false,

    execution_trace_reconstruction_allowed:
      false,

    private_snapshot_generation_allowed:
      false,

    private_snapshot_reconstruction_allowed:
      false,

    analytical_calculation_allowed:
      false,

    scoring_allowed:
      false,

    ranking_allowed:
      false,

    transformation_allowed:
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
        "direct_execution_context_creation",
        "direct_bootstrap_creation",
        "direct_orchestrator_creation",

        "application_composition_via_search_runtime_composition",

        "application_scoped_execution_trace_collector",
        "application_scoped_execution_observation_ports",
        "application_scoped_resolve_snapshot_traceability",

        "alternate_snapshot_variable_lineage_resolver",
        "snapshot_variable_lineage_resolver_fallback",

        "lineage_from_runtime_state",
        "lineage_from_document_state",
        "lineage_from_query_state",
        "lineage_from_cohort_state",
        "lineage_from_private_decision",
        "lineage_from_execution_trace",
        "lineage_from_private_snapshot",

        "producer_version_literal",
        "producer_version_inference",
        "producer_version_fallback",

        "execution_trace_generation",
        "execution_trace_reconstruction",
        "private_snapshot_reconstruction",

        "analytical_recalculation",
        "ranking_reconstruction",
        "projection_reconstruction",

        "runtime_clock_access",
        "random_identity_generation",

        "persistence",
        "mutable_global_state",
        "cache_mutation",
        "logging",
        "network_access",
      ] as const),
  } as const);
