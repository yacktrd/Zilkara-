/* ============================================================================
 * FILE: lib/xyvala/search/runtime/search-runtime-execution-context.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical run-scoped execution context
 *
 * ROLE
 * - create one isolated Execution Plane context for one canonical Search run
 * - create one fresh runtime execution-trace collector per Search run
 * - expose the canonical execution-observation capability pair for that run
 * - bind the canonical stateless execution-boundary observer
 * - bind the run-scoped observe_execution transport to the fresh collector
 * - assemble resolve_snapshot_traceability from:
 *     1. causally available canonical execution traces;
 *     2. externally produced canonical Variable Lineage truth
 * - preserve trace / lineage ownership boundaries
 * - prevent application-scoped reuse of run-scoped trace collection state
 *
 * CLASSIFICATION
 * - SEARCH EXECUTION PLANE
 * - RUN-SCOPED COMPOSITION
 * - EXECUTION CONTEXT
 * - TRACEABILITY TRANSPORT ASSEMBLY
 * - PRIVATE
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING
 * - NON-CALIBRATING
 * - NON-TRACE-OWNING
 * - NON-LINEAGE-OWNING
 * - NON-SNAPSHOT-OWNING
 * - NON-PERSISTENT
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * APPLICATION-SCOPED CONFIGURATION
 *        +
 * canonical Variable Lineage resolver capability
 *        ↓
 * createSearchRuntimeExecutionContext(...)
 *        ↓
 * ONE FRESH RUN-SCOPED CONTEXT
 *        ├── observe_execution_boundary
 *        │     <- canonical stateless Anchor boundary observer
 *        │
 *        ├── observe_execution
 *        │     <- fresh SearchRuntimeExecutionTraceCollector
 *        │
 *        └── resolve_snapshot_traceability
 *              ├── collector.resolve_snapshot_traces(...)
 *              └── resolve_snapshot_variable_lineage(...)
 *        ↓
 * SearchRuntimeBootstrapDependencies for THIS run
 *        ↓
 * Search runtime
 *
 * WHY THIS MODULE EXISTS
 * ----------------------------------------------------------------------------
 * SearchRuntimeApplication may execute more than once.
 *
 * SearchRuntimeExecutionTraceCollector deliberately has:
 *
 * one collector instance = one canonical Search runtime execution
 *
 * Therefore the collector MUST NOT be created once at application bootstrap
 * and then reused by multiple application.run(...) calls.
 *
 * This module establishes the missing lifecycle boundary:
 *
 * application scope
 * ≠ execution scope
 *
 * Each canonical Search run receives:
 * - one fresh collector;
 * - one fresh observe_execution transport bound to that collector;
 * - one run-scoped resolve_snapshot_traceability capability reading that same
 *   collector.
 *
 * `observe_execution_boundary` is currently stateless and canonical, so its
 * function identity may safely be reused across run contexts.
 *
 * THREE DISTINCT RESPONSIBILITIES
 * ----------------------------------------------------------------------------
 *
 * 1. EXECUTION BOUNDARY OBSERVATION
 *
 * observe_execution_boundary
 * <- search-anchor-execution-boundary-observer.ts
 *
 * Owns only authorized execution-boundary observation facts.
 *
 * 2. EXECUTION TRACE TRUTH
 *
 * observe_execution
 * -> SearchRuntimeExecutionTraceCollector
 * -> buildSearchExecutionTraceRecord(...)
 *
 * SearchTraceRecord / SearchTraceId remain owned by EXECUTION_TRACEABILITY.
 *
 * 3. SNAPSHOT TRACEABILITY TRANSPORT
 *
 * resolve_snapshot_traceability
 * -> existing causal execution traces
 * + existing canonical Variable Lineage
 * -> SearchRuntimeSnapshotTraceability transport object
 *
 * This context owns only the assembly boundary.
 *
 * It does NOT own either underlying truth.
 *
 * VARIABLE LINEAGE GOVERNANCE
 * ----------------------------------------------------------------------------
 * This module deliberately does NOT import or invoke a guessed VLR
 * materializer.
 *
 * Instead it requires:
 *
 * resolve_snapshot_variable_lineage
 *
 * as an explicit canonical capability.
 *
 * That dependency MUST return already-produced / canonically materialized
 * SearchVariableLineage truth for the exact SearchRuntimeTraceabilityInput.
 *
 * This context MUST NOT:
 * - derive Variable Lineage from document state;
 * - infer Variable Lineage from SearchTraceRecord;
 * - reconstruct VLR from the snapshot;
 * - generate fallback lineage;
 * - merge invented lineage entries.
 *
 * Once the canonical VLR snapshot resolver/materializer is confirmed, the
 * application composition may bind that exact capability here.
 *
 * SNAPSHOT TRACEABILITY GOVERNANCE
 * ----------------------------------------------------------------------------
 * SearchRuntimeSnapshotTraceability contains:
 *
 * traces
 * variable_lineage
 *
 * This module is authorized to assemble that transport envelope because it is
 * the concrete run-scoped provider for:
 *
 * SearchRuntimePorts["resolve_snapshot_traceability"]
 *
 * Assembly means:
 * - preserve exact trace collection returned by the collector;
 * - preserve exact lineage collection returned by the canonical lineage
 *   resolver;
 * - place both references in the existing canonical transport contract.
 *
 * Assembly does NOT mean:
 * - producing SearchTraceRecord;
 * - producing SearchVariableLineage;
 * - validating analytical semantics;
 * - reconstructing either collection.
 *
 * CAUSALITY
 * ----------------------------------------------------------------------------
 * The collector performs the canonical causal trace cut.
 *
 * Therefore resolve_snapshot_traceability MUST call:
 *
 * collector.resolve_snapshot_traces(input)
 *
 * before returning the snapshot traceability envelope.
 *
 * It MUST NOT:
 * - request future traces;
 * - sort traces by timestamp;
 * - deduplicate traces;
 * - add a trace representing resolve_snapshot_traceability itself;
 * - add build_private_snapshot / Transformation / Public Ranking traces to the
 *   current snapshot after the causal read.
 *
 * LIFECYCLE
 * ----------------------------------------------------------------------------
 * createSearchRuntimeExecutionContext(...)
 * MUST be called once per application run.
 *
 * The resulting context MUST NOT be cached as an application singleton.
 *
 * No execution_instance_id is invented because the current canonical Search
 * contract does not define one.
 *
 * If physical execution identity becomes required, it must be introduced
 * Contract Before Runtime.
 *
 * FAILURE SEMANTICS
 * ----------------------------------------------------------------------------
 * If:
 * - trace collection rejects;
 * - trace materialization rejects;
 * - lineage resolution rejects;
 * - lineage resolution returns a non-array value;
 *
 * the failure propagates.
 *
 * No catch-and-ignore.
 * No empty-lineage fallback.
 * No synthetic traceability.
 *
 * EMPTY COLLECTION SEMANTICS
 * ----------------------------------------------------------------------------
 * This context does NOT convert an empty trace or lineage collection into a
 * synthetic value.
 *
 * The canonical runtime orchestrator already owns the current execution gate:
 *
 * snapshot traces must not be empty
 * snapshot variable lineage must not be empty
 *
 * This context therefore transports collections as they exist.
 *
 * It does not duplicate that semantic eligibility rule.
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * This module introduces no second schema for:
 * - execution observations;
 * - execution-boundary observations;
 * - SearchTraceRecord;
 * - SearchVariableLineage;
 * - SearchRuntimeSnapshotTraceability.
 *
 * All exposed types are derived from existing canonical Search contracts.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * one collector reused by multiple Search runs
 * => execution-context lifecycle violation
 *
 * context generates SearchTraceRecord
 * => EXECUTION_TRACEABILITY ownership violation
 *
 * context generates SearchTraceId
 * => EXECUTION_TRACEABILITY ownership violation
 *
 * context reconstructs Variable Lineage
 * => VARIABLE_LINEAGE_GOVERNANCE ownership violation
 *
 * context fabricates empty Variable Lineage
 * => missing-governance-truth fallback violation
 *
 * context sorts/deduplicates traces
 * => execution-history mutation violation
 *
 * context generates execution boundary facts
 * => boundary-observer ownership violation
 *
 * context selects analytical policy
 * => policy ownership violation
 *
 * context generates runtime timestamp
 * => execution provenance violation
 *
 * context persists collector across application runs
 * => execution lifecycle violation
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - one context per canonical Search run
 * - one fresh collector per context
 * - canonical boundary observer only
 * - canonical observe_execution transport only
 * - explicit Variable Lineage resolver dependency
 * - preserve trace collection reference
 * - preserve Variable Lineage collection reference
 * - no fallback
 * - no trace reconstruction
 * - no lineage reconstruction
 * - no analytical reconstruction
 * - no policy selection
 * - no runtime clock
 * - no Date.now()
 * - no new Date()
 * - no randomUUID()
 * - no persistence
 * - no cache
 * - no logging
 * - no event publication
 * - no network access
 * ========================================================================== */

import type {
  SearchModuleVersion,
} from "../contracts/search-pipeline-contract";

import {
  observeSearchRuntimeExecutionBoundary,
} from "./search-anchor-execution-boundary-observer";

import {
  createSearchRuntimeExecutionTraceCollector,
} from "./search-runtime-execution-trace-collector";

import type {
  SearchRuntimeExecutionObservationPorts,
} from "./search-runtime-execution-observation-ports";

import type {
  SearchRuntimePorts,
  SearchRuntimeSnapshotTraceability,
  SearchRuntimeTraceabilityInput,
} from "./search-runtime-orchestrator";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_CONTEXT_MODULE_NAME =
  "xyvala-search-runtime-execution-context" as const;

export const XYVALA_SEARCH_RUNTIME_EXECUTION_CONTEXT_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

/* ============================================================================
 * 2. CANONICAL DERIVED TYPES
 * ----------------------------------------------------------------------------
 * No parallel snapshot-traceability schema.
 * ========================================================================== */

type SearchRuntimeSnapshotTraceabilityPort =
  SearchRuntimePorts[
    "resolve_snapshot_traceability"
  ];

type SearchRuntimeSnapshotTraceabilityPortInput =
  Parameters<
    SearchRuntimeSnapshotTraceabilityPort
  >[0];

type SearchRuntimeSnapshotTraceabilityPortOutput =
  Awaited<
    ReturnType<
      SearchRuntimeSnapshotTraceabilityPort
    >
  >;

type SearchRuntimeSnapshotVariableLineage =
  SearchRuntimeSnapshotTraceability[
    "variable_lineage"
  ];

/* ============================================================================
 * 3. COMPILE-TIME CONTRACT IDENTITY CHECKS
 * ----------------------------------------------------------------------------
 * SearchRuntimeTraceabilityInput and the canonical runtime port input must
 * remain the same execution boundary.
 * ========================================================================== */

type SearchRuntimeExecutionContextTraceabilityInputIsExact =
  [
    SearchRuntimeTraceabilityInput,
    SearchRuntimeSnapshotTraceabilityPortInput,
  ] extends [
    SearchRuntimeSnapshotTraceabilityPortInput,
    SearchRuntimeTraceabilityInput,
  ]
    ? true
    : false;

const XYVALA_SEARCH_RUNTIME_EXECUTION_CONTEXT_TRACEABILITY_INPUT_IS_EXACT:
  SearchRuntimeExecutionContextTraceabilityInputIsExact =
    true;

void XYVALA_SEARCH_RUNTIME_EXECUTION_CONTEXT_TRACEABILITY_INPUT_IS_EXACT;

type SearchRuntimeExecutionContextTraceabilityOutputIsExact =
  [
    SearchRuntimeSnapshotTraceability,
    SearchRuntimeSnapshotTraceabilityPortOutput,
  ] extends [
    SearchRuntimeSnapshotTraceabilityPortOutput,
    SearchRuntimeSnapshotTraceability,
  ]
    ? true
    : false;

const XYVALA_SEARCH_RUNTIME_EXECUTION_CONTEXT_TRACEABILITY_OUTPUT_IS_EXACT:
  SearchRuntimeExecutionContextTraceabilityOutputIsExact =
    true;

void XYVALA_SEARCH_RUNTIME_EXECUTION_CONTEXT_TRACEABILITY_OUTPUT_IS_EXACT;

/* ============================================================================
 * 4. VARIABLE LINEAGE RESOLVER CAPABILITY
 * ----------------------------------------------------------------------------
 * This is a CAPABILITY contract, not a second Variable Lineage truth schema.
 *
 * The output type is derived directly from:
 *
 * SearchRuntimeSnapshotTraceability["variable_lineage"]
 *
 * The implementation must be bound to the canonical VLR producer/resolver by
 * higher-level application configuration.
 * ========================================================================== */

export type SearchRuntimeSnapshotVariableLineageResolver =
  (
    input:
      SearchRuntimeTraceabilityInput,
  ) =>
    SearchRuntimeSnapshotVariableLineage |
    Promise<SearchRuntimeSnapshotVariableLineage>;

/* ============================================================================
 * 5. EXECUTION CONTEXT DEPENDENCIES
 * ----------------------------------------------------------------------------
 * Only truth that this module cannot own is injected.
 *
 * Boundary observation is already represented by the canonical concrete
 * stateless observer and therefore is bound directly.
 *
 * Execution trace collection is run-scoped and therefore is created here.
 * ========================================================================== */

export interface SearchRuntimeExecutionContextDependencies {
  readonly resolve_snapshot_variable_lineage:
    SearchRuntimeSnapshotVariableLineageResolver;
}

/* ============================================================================
 * 6. EXECUTION CONTEXT
 * ----------------------------------------------------------------------------
 * These are the two capabilities that must share the same run lifecycle:
 *
 * execution_observation_ports.observe_execution
 * resolve_snapshot_traceability
 *
 * Both are backed by the same fresh collector instance.
 * ========================================================================== */

export interface SearchRuntimeExecutionContext {
  readonly execution_observation_ports:
    SearchRuntimeExecutionObservationPorts;

  readonly resolve_snapshot_traceability:
    SearchRuntimeSnapshotTraceabilityPort;
}

/* ============================================================================
 * 7. SAFE FUNCTION ASSERTION
 * ========================================================================== */

function assertFunction(
  value:
    unknown,

  fieldName:
    string,
): asserts value is (
  ...args: readonly unknown[]
) => unknown {
  if (
    typeof value !==
      "function"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_CONTEXT_MODULE_NAME}] ` +
        `Execution-context configuration violation: ${fieldName} must be a function.`,
    );
  }
}

/* ============================================================================
 * 8. SAFE ARRAY ASSERTION
 * ----------------------------------------------------------------------------
 * Structural transport validation only.
 *
 * Individual SearchVariableLineage semantics remain owned by
 * VARIABLE_LINEAGE_GOVERNANCE.
 * ========================================================================== */

function assertArray(
  value:
    unknown,

  fieldName:
    string,
): asserts value is readonly unknown[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_CONTEXT_MODULE_NAME}] ` +
        `Execution-context transport violation: ${fieldName} must be an array.`,
    );
  }
}

/* ============================================================================
 * 9. DEPENDENCY VALIDATION
 * ----------------------------------------------------------------------------
 * No fallback capability is created.
 * ========================================================================== */

function validateSearchRuntimeExecutionContextDependencies(
  dependencies:
    SearchRuntimeExecutionContextDependencies,
): void {
  if (
    dependencies ===
      null ||
    typeof dependencies !==
      "object" ||
    Array.isArray(
      dependencies,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_CONTEXT_MODULE_NAME}] ` +
        "Execution-context configuration violation: dependencies must be an object.",
    );
  }

  assertFunction(
    dependencies
      .resolve_snapshot_variable_lineage,
    "resolve_snapshot_variable_lineage",
  );
}

/* ============================================================================
 * 10. VARIABLE LINEAGE TRANSPORT VALIDATION
 * ----------------------------------------------------------------------------
 * Only collection shape is validated here.
 *
 * This module deliberately does NOT:
 * - validate lineage semantics;
 * - validate VLR ownership;
 * - rebuild lineage;
 * - infer missing entries;
 * - require non-empty lineage.
 *
 * The current orchestrator owns the non-empty snapshot traceability gate.
 * ========================================================================== */

function validateResolvedSnapshotVariableLineage(
  variableLineage:
    SearchRuntimeSnapshotVariableLineage,
): void {
  assertArray(
    variableLineage,
    "variable_lineage",
  );
}

/* ============================================================================
 * 11. SNAPSHOT TRACEABILITY ASSEMBLY
 * ----------------------------------------------------------------------------
 * Transport assembly only.
 *
 * Both component references are preserved unchanged.
 *
 * No trace is cloned.
 * No lineage entry is cloned.
 * No sorting.
 * No deduplication.
 * No semantic merge.
 * ========================================================================== */

function assembleSearchRuntimeSnapshotTraceability(
  traces:
    SearchRuntimeSnapshotTraceability[
      "traces"
    ],

  variableLineage:
    SearchRuntimeSnapshotVariableLineage,
): SearchRuntimeSnapshotTraceability {
  const traceability = {
    traces,

    variable_lineage:
      variableLineage,
  } satisfies SearchRuntimeSnapshotTraceability;

  return Object.freeze(
    traceability,
  );
}

/* ============================================================================
 * 12. EXECUTION CONTEXT FACTORY
 * ----------------------------------------------------------------------------
 * ONE CALL = ONE RUN-SCOPED CONTEXT.
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * Higher-level application composition MUST invoke this factory once for each
 * canonical Search application.run(...) execution.
 *
 * It MUST NOT cache the returned context across runs.
 * ========================================================================== */

export function createSearchRuntimeExecutionContext(
  dependencies:
    SearchRuntimeExecutionContextDependencies,
): SearchRuntimeExecutionContext {
  validateSearchRuntimeExecutionContextDependencies(
    dependencies,
  );

  /*
   * Fresh per-run collector.
   *
   * This is the central lifecycle invariant of the execution context.
   */
  const traceCollector =
    createSearchRuntimeExecutionTraceCollector();

  /*
   * Cross-cutting Execution Plane capabilities.
   *
   * observe_execution_boundary
   * <- canonical stateless concrete observer
   *
   * observe_execution
   * <- fresh run-scoped collector
   *
   * No wrapper is needed around either capability.
   */
  const executionObservationPorts =
    Object.freeze({
      observe_execution_boundary:
        observeSearchRuntimeExecutionBoundary,

      observe_execution:
        traceCollector
          .observe_execution,
    } satisfies SearchRuntimeExecutionObservationPorts);

  /*
   * Concrete run-scoped implementation of:
   *
   * SearchRuntimePorts["resolve_snapshot_traceability"]
   *
   * It assembles existing canonical governance truths only.
   */
  const resolveSnapshotTraceability:
    SearchRuntimeSnapshotTraceabilityPort =
      async (
        input,
      ) => {
        /*
         * Causal execution-trace read.
         *
         * The collector owns causal-prefix/scope transport.
         */
        const traces =
          traceCollector
            .resolve_snapshot_traces(
              input,
            );

        /*
         * Canonical Variable Lineage resolver.
         *
         * This context does not know or recreate its production algorithm.
         */
        const variableLineage =
          await dependencies
            .resolve_snapshot_variable_lineage(
              input,
            );

        validateResolvedSnapshotVariableLineage(
          variableLineage,
        );

        /*
         * Existing truth + existing truth -> transport envelope.
         *
         * No truth production occurs here.
         */
        return assembleSearchRuntimeSnapshotTraceability(
          traces,
          variableLineage,
        );
      };

  return Object.freeze({
    execution_observation_ports:
      executionObservationPorts,

    resolve_snapshot_traceability:
      resolveSnapshotTraceability,
  });
}

/* ============================================================================
 * 13. STATIC OWNERSHIP
 * ----------------------------------------------------------------------------
 * Governance metadata only.
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_CONTEXT_OWNERSHIP =
  Object.freeze({
    execution_plane:
      true,

    lifecycle_scope:
      "ONE_CANONICAL_SEARCH_RUNTIME_EXECUTION",

    lifecycle_owner:
      "SEARCH_RUNTIME_EXECUTION_CONTEXT",

    execution_boundary_observation_owner:
      "SEARCH_ANCHOR_EXECUTION_BOUNDARY_OBSERVER",

    execution_trace_collection_lifecycle_owner:
      "SEARCH_RUNTIME_EXECUTION_TRACE_COLLECTOR",

    execution_trace_owner:
      "EXECUTION_TRACEABILITY",

    execution_trace_identity_owner:
      "EXECUTION_TRACEABILITY",

    variable_lineage_owner:
      "VARIABLE_LINEAGE_GOVERNANCE",

    variable_lineage_resolver_owner:
      "EXTERNAL_CANONICAL_VARIABLE_LINEAGE_CAPABILITY",

    snapshot_traceability_transport_owner:
      "SEARCH_RUNTIME_EXECUTION_CONTEXT",

    private_snapshot_owner:
      "PRIVATE_SNAPSHOT",

    analytical_owner:
      false,

    policy_owner:
      false,

    corpus_owner:
      false,

    identity_owner:
      false,

    application_scope_owner:
      false,

    execution_order_owner:
      "SEARCH_RUNTIME_ORCHESTRATOR",

    context_creates_execution_trace_truth:
      false,

    context_creates_variable_lineage_truth:
      false,

    context_creates_analytical_truth:
      false,

    context_reads_runtime_clock:
      false,

    context_generates_random_identity:
      false,

    context_persists_state:
      false,
  } as const);

/* ============================================================================
 * 14. STATIC GOVERNANCE
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_CONTEXT_GOVERNANCE =
  Object.freeze({
    /* ------------------------------------------------------------------------
     * FUNDAMENTAL
     * --------------------------------------------------------------------- */

    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    reality_before_interpretation:
      true,

    one_truth_one_owner:
      true,

    execution_plane:
      true,

    run_scoped:
      true,

    analytical_owner:
      false,

    canonical_producer:
      false,

    /* ------------------------------------------------------------------------
     * LIFECYCLE
     * --------------------------------------------------------------------- */

    one_context_per_runtime_execution_required:
      true,

    fresh_trace_collector_per_context_required:
      true,

    application_singleton_context_allowed:
      false,

    cross_run_collector_reuse_allowed:
      false,

    physical_execution_identity_generation_allowed:
      false,

    /* ------------------------------------------------------------------------
     * EXECUTION BOUNDARY OBSERVATION
     * --------------------------------------------------------------------- */

    canonical_execution_boundary_observer_required:
      true,

    execution_boundary_observation_reconstruction_allowed:
      false,

    execution_boundary_fact_creation_allowed:
      false,

    execution_boundary_observer_wrapping_required:
      false,

    /* ------------------------------------------------------------------------
     * EXECUTION OBSERVATION / TRACE
     * --------------------------------------------------------------------- */

    canonical_execution_observation_transport_required:
      true,

    canonical_execution_trace_materialization_required:
      true,

    local_trace_construction_allowed:
      false,

    local_trace_identity_generation_allowed:
      false,

    execution_trace_reconstruction_allowed:
      false,

    execution_trace_mutation_allowed:
      false,

    trace_sorting_allowed:
      false,

    trace_deduplication_allowed:
      false,

    trace_merging_allowed:
      false,

    causal_trace_read_required:
      true,

    future_trace_inclusion_allowed:
      false,

    /* ------------------------------------------------------------------------
     * VARIABLE LINEAGE
     * --------------------------------------------------------------------- */

    canonical_variable_lineage_resolver_required:
      true,

    variable_lineage_generation_allowed:
      false,

    variable_lineage_reconstruction_allowed:
      false,

    variable_lineage_mutation_allowed:
      false,

    variable_lineage_inference_from_trace_allowed:
      false,

    variable_lineage_inference_from_snapshot_state_allowed:
      false,

    empty_variable_lineage_fallback_allowed:
      false,

    /* ------------------------------------------------------------------------
     * SNAPSHOT TRACEABILITY
     * --------------------------------------------------------------------- */

    snapshot_traceability_transport_assembly_allowed:
      true,

    snapshot_traceability_truth_reconstruction_allowed:
      false,

    snapshot_trace_collection_reference_preservation_required:
      true,

    snapshot_variable_lineage_reference_preservation_required:
      true,

    snapshot_traceability_sorting_allowed:
      false,

    snapshot_traceability_deduplication_allowed:
      false,

    snapshot_traceability_semantic_merge_allowed:
      false,

    private_snapshot_construction_allowed:
      false,

    /* ------------------------------------------------------------------------
     * ANALYTICAL / POLICY SEPARATION
     * --------------------------------------------------------------------- */

    analytical_truth_creation_allowed:
      false,

    analytical_truth_reconstruction_allowed:
      false,

    scoring_allowed:
      false,

    policy_creation_allowed:
      false,

    policy_selection_allowed:
      false,

    policy_fallback_allowed:
      false,

    calibration_execution_allowed:
      false,

    corpus_resolution_allowed:
      false,

    /* ------------------------------------------------------------------------
     * TIME / IDENTITY
     * --------------------------------------------------------------------- */

    runtime_clock_access_allowed:
      false,

    timestamp_generation_allowed:
      false,

    random_identity_generation_allowed:
      false,

    process_sequence_generation_allowed:
      false,

    /* ------------------------------------------------------------------------
     * SIDE EFFECTS
     * --------------------------------------------------------------------- */

    persistence_allowed:
      false,

    cache_allowed:
      false,

    logging_allowed:
      false,

    event_publication_allowed:
      false,

    network_access_allowed:
      false,

    /* ------------------------------------------------------------------------
     * FAILURE SEMANTICS
     * --------------------------------------------------------------------- */

    dependency_failure_must_propagate:
      true,

    trace_collection_failure_must_propagate:
      true,

    variable_lineage_resolution_failure_must_propagate:
      true,

    catch_and_ignore_allowed:
      false,

    synthetic_traceability_fallback_allowed:
      false,

    /* ------------------------------------------------------------------------
     * PROHIBITED SHORTCUTS
     * --------------------------------------------------------------------- */

    prohibited_shortcuts:
      Object.freeze([
        "execution_context_reused_across_application_runs",
        "execution_context_cached_as_application_singleton",
        "execution_context_reused_trace_collector",
        "execution_context_generated_execution_instance_id",

        "execution_context_generated_boundary_observation_fact",
        "execution_context_reconstructed_boundary_observation",

        "execution_context_constructed_search_trace_record",
        "execution_context_constructed_search_trace_id",
        "execution_context_reconstructed_execution_trace",
        "execution_context_sorted_execution_traces",
        "execution_context_deduplicated_execution_traces",
        "execution_context_merged_execution_traces",
        "execution_context_included_future_trace",

        "execution_context_generated_variable_lineage",
        "execution_context_reconstructed_variable_lineage",
        "execution_context_inferred_variable_lineage_from_trace",
        "execution_context_inferred_variable_lineage_from_snapshot_state",
        "execution_context_fabricated_empty_variable_lineage",

        "execution_context_rebuilt_snapshot_traceability_truth",
        "execution_context_cloned_trace_records",
        "execution_context_cloned_variable_lineage_entries",
        "execution_context_semantically_merged_traceability",

        "execution_context_created_analytical_truth",
        "execution_context_reconstructed_analytical_truth",
        "execution_context_calculated_score",

        "execution_context_selected_policy",
        "execution_context_created_policy_fallback",
        "execution_context_executed_calibration",
        "execution_context_resolved_corpus",

        "execution_context_read_runtime_clock",
        "execution_context_generated_timestamp",
        "execution_context_generated_random_identity",
        "execution_context_generated_process_sequence",

        "execution_context_persisted_state",
        "execution_context_cached_state",
        "execution_context_logged_state",
        "execution_context_published_event",
        "execution_context_accessed_network",

        "execution_context_swallowed_dependency_failure",
        "execution_context_swallowed_trace_failure",
        "execution_context_swallowed_lineage_failure",
        "execution_context_created_synthetic_traceability_fallback",
      ] as const),
  } as const);

/* ============================================================================
 * 15. EXPLICIT ARCHITECTURAL STATUS
 * ----------------------------------------------------------------------------
 * Audit metadata only.
 *
 * This status records the current integration boundary without pretending that
 * the higher-level application wiring is already complete.
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_CONTEXT_STATUS =
  Object.freeze({
    execution_context_contract_available:
      true,

    fresh_collector_per_context:
      true,

    canonical_boundary_observer_bound:
      true,

    canonical_execution_observation_transport_bound:
      true,

    snapshot_trace_resolution_bound:
      true,

    variable_lineage_resolution_requires_external_canonical_capability:
      true,

    application_per_run_integration_complete:
      false,

    bootstrap_per_run_integration_complete:
      false,

    end_to_end_runtime_integration_complete:
      false,
  } as const);
