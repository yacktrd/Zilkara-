/* ============================================================================
 * FILE: lib/xyvala/search/runtime/search-runtime-execution-trace-collector.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical runtime execution-trace collector
 *
 * ROLE
 * - receive canonical runtime execution observations through observe_execution
 * - invoke EXECUTION_TRACEABILITY as the sole canonical SearchTraceRecord
 *   producer
 * - retain canonical SearchTraceRecord references in exact observation order
 * - preserve repeated observations without sorting or deduplication
 * - expose the causally available trace prefix for one private-snapshot scope
 * - filter only by explicit canonical execution/query/cohort/document scope
 * - provide execution-trace transport/lifecycle without owning trace truth
 *
 * CLASSIFICATION
 * - SEARCH EXECUTION PLANE
 * - RUNTIME TRACE TRANSPORT
 * - RUNTIME TRACE LIFECYCLE
 * - OBSERVE / COLLECT / READ
 * - PRIVATE
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING
 * - NON-CALIBRATING
 * - NON-TRACE-OWNING
 * - NON-LINEAGE-OWNING
 * - NON-SNAPSHOT-OWNING
 * - NON-PERSISTENT
 * - DETERMINISTIC GIVEN DETERMINISTIC OBSERVATIONS
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * canonical producer execution
 *        ↓
 * buildSearchRuntimeExecutionTraceObservation(...)
 *        ↓
 * observe_execution
 *        ↓
 * SEARCH RUNTIME EXECUTION TRACE COLLECTOR
 *        ↓
 * buildSearchExecutionTraceRecord(...)
 *        ↓
 * canonical SearchTraceRecord
 *        ↓
 * ordered execution-scoped in-memory collection
 *        ↓
 * resolve_snapshot_traces(...)
 *        ↓
 * causally available + explicitly scope-compatible SearchTraceRecord[]
 *        ↓
 * resolve_snapshot_traceability
 *        +
 * Variable Lineage producer / resolver
 *        ↓
 * SearchRuntimeSnapshotTraceability
 *        ↓
 * PRIVATE_SNAPSHOT
 *
 * CANONICAL OWNERSHIP
 * ----------------------------------------------------------------------------
 *
 * SearchTraceRecord
 * <- EXECUTION_TRACEABILITY
 * <- search-execution-traceability-core.ts
 *
 * SearchTraceId
 * <- EXECUTION_TRACEABILITY
 *
 * runtime observation assembly
 * <- search-runtime-execution-observation-core.ts
 *
 * execution-observation transport contract
 * <- search-runtime-execution-observation-port.ts
 *
 * runtime trace collection lifecycle
 * <- THIS MODULE
 *
 * SearchVariableLineage
 * <- VARIABLE_LINEAGE_GOVERNANCE
 *
 * SearchRuntimeSnapshotTraceability assembly
 * <- resolve_snapshot_traceability provider
 *
 * SearchPrivateDocumentSnapshot
 * <- PRIVATE_SNAPSHOT
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * This collector DOES NOT create trace truth itself.
 *
 * It invokes the canonical EXECUTION_TRACEABILITY producer:
 *
 * buildSearchExecutionTraceRecord(...)
 *
 * and stores the returned canonical SearchTraceRecord reference unchanged.
 *
 * It MUST NOT:
 * - construct SearchTraceRecord locally;
 * - construct SearchTraceId locally;
 * - alter an observation before canonical trace materialization;
 * - reconstruct an observation from final runtime state;
 * - reconstruct missing_data;
 * - reconstruct validation_state;
 * - infer module/method/contracts;
 * - resolve policy or corpus provenance;
 * - create Variable Lineage;
 * - assemble SearchRuntimeSnapshotTraceability;
 * - create Private Snapshot truth.
 *
 * EXECUTION-SCOPE LIFECYCLE
 * ----------------------------------------------------------------------------
 * A collector instance belongs to exactly ONE canonical Search runtime
 * execution.
 *
 * The first canonical trace observed binds the collector to that trace's
 * explicit created_at.
 *
 * Later traces with another created_at are rejected as a lifecycle divergence.
 *
 * Explicit query_id and cohort_id, when first observed, also bind their
 * corresponding execution scopes.
 *
 * Different document_id values are expected and allowed because one Search
 * execution may process multiple documents.
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * The current SearchTraceRecord contract has no canonical physical
 * execution_instance_id.
 *
 * Therefore this collector MUST NOT invent one.
 *
 * Callers MUST instantiate one collector per canonical runtime execution.
 *
 * The created_at/query/cohort guards detect many accidental cross-execution
 * reuses, but they cannot distinguish two physically separate executions that
 * are contractually indistinguishable.
 *
 * If stronger physical execution-instance distinction becomes necessary, it
 * must be introduced Contract Before Runtime.
 *
 * CAUSAL SNAPSHOT SEMANTICS
 * ----------------------------------------------------------------------------
 * resolve_snapshot_traces(...) reads ONLY records already present when the
 * function is invoked.
 *
 * That current immutable collection reference is the causal cut.
 *
 * The collector MUST NOT:
 * - wait for future traces;
 * - inspect later runtime state;
 * - append a trace for the read itself;
 * - append a trace for build_private_snapshot;
 * - append a trace for Transformation;
 * - append a trace for Public Ranking;
 * - reconstruct chronology from timestamps.
 *
 * Execution order is the exact observe_execution insertion order.
 *
 * No sort.
 * No deduplication.
 * No merge.
 *
 * SNAPSHOT-SCOPE FILTERING
 * ----------------------------------------------------------------------------
 * The snapshot target has explicit:
 * - document_id
 * - query_id
 * - cohort_id
 * - created_at
 *
 * A causally available trace is scope-compatible when every scope identity it
 * explicitly carries agrees with the target.
 *
 * Therefore:
 *
 * trace.document_id defined and different
 * -> excluded
 *
 * trace.query_id defined and different
 * -> excluded
 *
 * trace.cohort_id defined and different
 * -> excluded
 *
 * trace.created_at different
 * -> excluded / lifecycle divergence
 *
 * Undefined optional trace scope identities are NOT invented.
 *
 * Examples:
 *
 * document-scoped trace
 * -> only the matching document snapshot
 *
 * query-scoped trace with no document_id
 * -> all matching document snapshots in that execution
 *
 * cohort-scoped trace with no document_id
 * -> all matching document snapshots in that cohort
 *
 * execution-global trace with no optional identity
 * -> may apply to all snapshots of this collector instance
 *
 * This is structural scope compatibility only.
 *
 * It is NOT analytical interpretation.
 *
 * REPEATED OBSERVATIONS
 * ----------------------------------------------------------------------------
 * Repeated SearchTraceRecord values are preserved.
 *
 * Even when two physically repeated observations have the same deterministic
 * SearchTraceId, this collector does NOT deduplicate them.
 *
 * The current canonical trace identity identifies canonical observation truth,
 * not an invented runtime sequence number.
 *
 * FAILURE SEMANTICS
 * ----------------------------------------------------------------------------
 * If canonical trace materialization fails:
 * - the error propagates;
 * - no record is appended.
 *
 * If execution-scope validation fails:
 * - the error propagates;
 * - no record is appended.
 *
 * No catch-and-ignore.
 * No fire-and-forget.
 * No fallback trace.
 *
 * COMPUTE / OBSERVE / MUTATE
 * ----------------------------------------------------------------------------
 * This module is part of the Execution Plane.
 *
 * observe_execution:
 * - consumes an already canonical runtime execution observation;
 * - invokes canonical trace materialization;
 * - performs authorized private lifecycle collection.
 *
 * The only mutation authorized here is replacement of this collector's
 * private execution-scoped collection reference.
 *
 * Canonical SearchTraceRecord objects are never mutated.
 *
 * No analytical truth is mutated.
 * No snapshot truth is mutated.
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * This module introduces NO second:
 * - trace schema;
 * - trace identity;
 * - runtime observation schema;
 * - snapshot traceability schema;
 * - Variable Lineage schema.
 *
 * Public types are derived directly from existing canonical contracts.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * observation cannot materialize through EXECUTION_TRACEABILITY
 * => execution-observation boundary
 *
 * collector locally constructs SearchTraceRecord
 * => EXECUTION_TRACEABILITY ownership violation
 *
 * collector locally constructs SearchTraceId
 * => EXECUTION_TRACEABILITY ownership violation
 *
 * trace created_at changes inside one collector
 * => execution-collector lifecycle violation
 *
 * explicit query_id changes inside one collector
 * => execution query-scope violation
 *
 * explicit cohort_id changes inside one collector
 * => execution cohort-scope violation
 *
 * different document_id appears
 * => allowed; multi-document execution
 *
 * trace sorted/deduplicated/merged
 * => execution-history mutation violation
 *
 * trace from another document enters document snapshot
 * => snapshot-scope transport violation
 *
 * future trace enters earlier snapshot read
 * => causal-boundary violation
 *
 * collector reconstructs Variable Lineage
 * => VARIABLE_LINEAGE_GOVERNANCE ownership violation
 *
 * collector assembles SearchRuntimeSnapshotTraceability
 * => snapshot-traceability provider ownership violation
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - one collector instance per canonical Search runtime execution
 * - canonical observation input only
 * - canonical trace producer only
 * - exact trace reference preservation
 * - exact insertion order preservation
 * - repeated observations preserved
 * - causal-prefix reads only
 * - explicit scope compatibility only
 * - no local clock
 * - no Date.now()
 * - no new Date()
 * - no randomUUID()
 * - no process-local sequence identity
 * - no sorting
 * - no deduplication
 * - no merging
 * - no trace reconstruction
 * - no analytical reconstruction
 * - no Variable Lineage production
 * - no snapshot-traceability assembly
 * - no persistence
 * - no cache
 * - no logging
 * - no event publication
 * - no network access
 * ========================================================================== */

import type {
  SearchCohortId,
  SearchDocumentId,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchQueryId,
  SearchTraceRecord,
} from "../contracts/search-pipeline-contract";

import {
  buildSearchExecutionTraceRecord,
} from "../governance/search-execution-traceability-core";

import type {
  SearchRuntimeExecutionObservationPort,
} from "./search-runtime-execution-observation-port";

import type {
  SearchRuntimeTraceabilityInput,
} from "./search-runtime-orchestrator";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_TRACE_COLLECTOR_MODULE_NAME =
  "xyvala-search-runtime-execution-trace-collector" as const;

export const XYVALA_SEARCH_RUNTIME_EXECUTION_TRACE_COLLECTOR_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

/* ============================================================================
 * 2. CANONICAL SNAPSHOT TRACE RESOLVER
 * ----------------------------------------------------------------------------
 * Internal Execution Plane read capability.
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * This is NOT SearchRuntimePorts["resolve_snapshot_traceability"].
 *
 * It resolves only canonical execution traces.
 *
 * Variable Lineage remains independent and must be assembled later by the
 * authorized resolve_snapshot_traceability provider.
 * ========================================================================== */

export type SearchRuntimeExecutionTraceSnapshotResolver =
  (
    input:
      SearchRuntimeTraceabilityInput,
  ) =>
    readonly SearchTraceRecord[];

/* ============================================================================
 * 3. COLLECTOR CAPABILITIES
 * ----------------------------------------------------------------------------
 * No second execution-observation payload is introduced.
 *
 * observe_execution uses the already canonical transport port contract.
 * ========================================================================== */

export interface SearchRuntimeExecutionTraceCollector {
  readonly observe_execution:
    SearchRuntimeExecutionObservationPort;

  readonly resolve_snapshot_traces:
    SearchRuntimeExecutionTraceSnapshotResolver;
}

/* ============================================================================
 * 4. EXECUTION-SCOPE STATE
 * ----------------------------------------------------------------------------
 * Private lifecycle metadata only.
 *
 * These values are copied from explicit canonical traces.
 *
 * They are NOT generated identities.
 * ========================================================================== */

interface SearchRuntimeExecutionTraceCollectorScope {
  readonly created_at:
    SearchIsoTimestamp;

  readonly query_id?:
    SearchQueryId;

  readonly cohort_id?:
    SearchCohortId;
}

/* ============================================================================
 * 5. BASIC ASSERTIONS
 * ========================================================================== */

function assertNonEmptyString(
  value:
    string,

  fieldName:
    string,
): void {
  if (
    typeof value !==
      "string" ||
    value.trim().length ===
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_TRACE_COLLECTOR_MODULE_NAME}] ` +
        `Execution trace collection violation: ${fieldName} must be a non-empty string.`,
    );
  }
}

/* ============================================================================
 * 6. SNAPSHOT TARGET SCOPE
 * ----------------------------------------------------------------------------
 * Exact canonical identities only.
 *
 * No analytical truth is interpreted.
 * ========================================================================== */

interface SearchRuntimeExecutionTraceSnapshotScope {
  readonly created_at:
    SearchIsoTimestamp;

  readonly document_id:
    SearchDocumentId;

  readonly query_id:
    SearchQueryId;

  readonly cohort_id:
    SearchCohortId;
}

function resolveSearchRuntimeExecutionTraceSnapshotScope(
  input:
    SearchRuntimeTraceabilityInput,
): SearchRuntimeExecutionTraceSnapshotScope {
  const createdAt =
    input.created_at;

  const documentId =
    input.document
      .raw_document
      .document_id;

  const queryId =
    input.query
      .query_id;

  const cohortId =
    input.cohort_definition
      .cohort_id;

  assertNonEmptyString(
    createdAt,
    "snapshot_scope.created_at",
  );

  assertNonEmptyString(
    documentId,
    "snapshot_scope.document_id",
  );

  assertNonEmptyString(
    queryId,
    "snapshot_scope.query_id",
  );

  assertNonEmptyString(
    cohortId,
    "snapshot_scope.cohort_id",
  );

  /*
   * Shared query scope is explicit canonical identity truth.
   *
   * No filter or analytical equivalence is inferred here.
   */
  if (
    input.cohort_definition
      .query_id !==
    queryId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_TRACE_COLLECTOR_MODULE_NAME}] ` +
        "First divergence: snapshot traceability input cohort definition belongs to another query.",
    );
  }

  if (
    input.cohort_distribution
      .query_id !==
    queryId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_TRACE_COLLECTOR_MODULE_NAME}] ` +
        "First divergence: snapshot traceability input cohort distribution belongs to another query.",
    );
  }

  if (
    input.cohort_distribution
      .cohort_id !==
    cohortId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_TRACE_COLLECTOR_MODULE_NAME}] ` +
        "First divergence: snapshot traceability input cohort distribution belongs to another cohort.",
    );
  }

  return Object.freeze({
    created_at:
      createdAt,

    document_id:
      documentId,

    query_id:
      queryId,

    cohort_id:
      cohortId,
  });
}

/* ============================================================================
 * 7. EXECUTION-SCOPE BINDING
 * ----------------------------------------------------------------------------
 * The first trace binds the collector's execution created_at.
 *
 * query_id and cohort_id are bound when first explicitly observed.
 *
 * document_id is deliberately NOT bound because a canonical Search execution
 * may contain many documents.
 * ========================================================================== */

function bindSearchRuntimeExecutionTraceCollectorScope(
  current:
    SearchRuntimeExecutionTraceCollectorScope | undefined,

  trace:
    SearchTraceRecord,
): SearchRuntimeExecutionTraceCollectorScope {
  if (
    current ===
    undefined
  ) {
    return Object.freeze({
      created_at:
        trace.created_at,

      ...(
        trace.query_id !==
        undefined
          ? {
              query_id:
                trace.query_id,
            }
          : {}
      ),

      ...(
        trace.cohort_id !==
        undefined
          ? {
              cohort_id:
                trace.cohort_id,
            }
          : {}
      ),
    });
  }

  if (
    trace.created_at !==
    current.created_at
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_TRACE_COLLECTOR_MODULE_NAME}] ` +
        "First divergence: one execution trace collector received traces from different explicit created_at execution scopes.",
    );
  }

  if (
    trace.query_id !==
      undefined &&
    current.query_id !==
      undefined &&
    trace.query_id !==
      current.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_TRACE_COLLECTOR_MODULE_NAME}] ` +
        "First divergence: one execution trace collector received traces from different query scopes.",
    );
  }

  if (
    trace.cohort_id !==
      undefined &&
    current.cohort_id !==
      undefined &&
    trace.cohort_id !==
      current.cohort_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_TRACE_COLLECTOR_MODULE_NAME}] ` +
        "First divergence: one execution trace collector received traces from different cohort scopes.",
    );
  }

  /*
   * Preserve the first explicitly observed query/cohort identities.
   *
   * This is lifecycle metadata only.
   * No identity is generated or rewritten.
   */
  if (
    current.query_id ===
      undefined &&
    trace.query_id !==
      undefined
  ) {
    return Object.freeze({
      created_at:
        current.created_at,

      query_id:
        trace.query_id,

      ...(
        current.cohort_id !==
        undefined
          ? {
              cohort_id:
                current.cohort_id,
            }
          : {}
      ),
    });
  }

  if (
    current.cohort_id ===
      undefined &&
    trace.cohort_id !==
      undefined
  ) {
    return Object.freeze({
      created_at:
        current.created_at,

      ...(
        current.query_id !==
        undefined
          ? {
              query_id:
                current.query_id,
            }
          : {}
      ),

      cohort_id:
        trace.cohort_id,
    });
  }

  return current;
}

/* ============================================================================
 * 8. SNAPSHOT-SCOPE VS COLLECTOR-SCOPE VALIDATION
 * ----------------------------------------------------------------------------
 * Protects accidental collector reuse across canonical executions.
 *
 * It does NOT generate or repair scope.
 * ========================================================================== */

function validateSearchRuntimeExecutionTraceSnapshotScopeAgainstCollector(
  snapshotScope:
    SearchRuntimeExecutionTraceSnapshotScope,

  collectorScope:
    SearchRuntimeExecutionTraceCollectorScope | undefined,
): void {
  if (
    collectorScope ===
    undefined
  ) {
    return;
  }

  if (
    snapshotScope.created_at !==
    collectorScope.created_at
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_TRACE_COLLECTOR_MODULE_NAME}] ` +
        "First divergence: snapshot trace resolution requested another explicit execution created_at than the collector scope.",
    );
  }

  if (
    collectorScope.query_id !==
      undefined &&
    snapshotScope.query_id !==
      collectorScope.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_TRACE_COLLECTOR_MODULE_NAME}] ` +
        "First divergence: snapshot trace resolution requested another query than the collector scope.",
    );
  }

  if (
    collectorScope.cohort_id !==
      undefined &&
    snapshotScope.cohort_id !==
      collectorScope.cohort_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_TRACE_COLLECTOR_MODULE_NAME}] ` +
        "First divergence: snapshot trace resolution requested another cohort than the collector scope.",
    );
  }
}

/* ============================================================================
 * 9. STRUCTURAL TRACE / SNAPSHOT SCOPE COMPATIBILITY
 * ----------------------------------------------------------------------------
 * Every explicit trace scope identity must agree with the target snapshot.
 *
 * Undefined optional trace identities remain undefined and are never inferred.
 * ========================================================================== */

function isSearchExecutionTraceCompatibleWithSnapshotScope(
  trace:
    SearchTraceRecord,

  snapshotScope:
    SearchRuntimeExecutionTraceSnapshotScope,
): boolean {
  if (
    trace.created_at !==
    snapshotScope.created_at
  ) {
    return false;
  }

  if (
    trace.document_id !==
      undefined &&
    trace.document_id !==
      snapshotScope.document_id
  ) {
    return false;
  }

  if (
    trace.query_id !==
      undefined &&
    trace.query_id !==
      snapshotScope.query_id
  ) {
    return false;
  }

  if (
    trace.cohort_id !==
      undefined &&
    trace.cohort_id !==
      snapshotScope.cohort_id
  ) {
    return false;
  }

  return true;
}

/* ============================================================================
 * 10. COLLECTOR FACTORY
 * ----------------------------------------------------------------------------
 * One returned instance = one canonical Search runtime execution.
 *
 * The collection is private.
 *
 * No global mutable state.
 * No module-level trace array.
 * ========================================================================== */

export function createSearchRuntimeExecutionTraceCollector():
  SearchRuntimeExecutionTraceCollector {
  let collectorScope:
    SearchRuntimeExecutionTraceCollectorScope | undefined;

  let observedTraces:
    readonly SearchTraceRecord[] =
      Object.freeze([]);

  /* --------------------------------------------------------------------------
   * observe_execution
   * --------------------------------------------------------------------------
   * Transport boundary:
   *
   * canonical runtime execution observation
   * -> canonical EXECUTION_TRACEABILITY producer
   * -> exact SearchTraceRecord reference
   * -> ordered private collection
   *
   * IMPORTANT
   * --------------------------------------------------------------------------
   * No observation field is rewritten here.
   * ----------------------------------------------------------------------- */

  const observeExecution:
    SearchRuntimeExecutionObservationPort =
      (
        observation,
      ): void => {
        /*
         * Canonical trace materialization.
         *
         * If this throws, collection state remains unchanged.
         */
        const trace =
          buildSearchExecutionTraceRecord(
            observation,
          );

        /*
         * Validate/bind execution lifecycle before append.
         *
         * If this throws, collection state remains unchanged.
         */
        const nextCollectorScope =
          bindSearchRuntimeExecutionTraceCollectorScope(
            collectorScope,
            trace,
          );

        /*
         * Append exact canonical trace reference.
         *
         * No sort.
         * No deduplication.
         * No merge.
         *
         * Replacing the private collection reference prevents mutation of
         * previously returned collection arrays.
         */
        const nextObservedTraces =
          Object.freeze([
            ...observedTraces,
            trace,
          ]);

        collectorScope =
          nextCollectorScope;

        observedTraces =
          nextObservedTraces;
      };

  /* --------------------------------------------------------------------------
   * resolve_snapshot_traces
   * --------------------------------------------------------------------------
   * Read-only causal cut.
   *
   * The `causalPrefix` reference captures exactly what had already been
   * observed before this read began.
   *
   * Later observations cannot enter this returned snapshot trace collection.
   * ----------------------------------------------------------------------- */

  const resolveSnapshotTraces:
    SearchRuntimeExecutionTraceSnapshotResolver =
      (
        input,
      ) => {
        const snapshotScope =
          resolveSearchRuntimeExecutionTraceSnapshotScope(
            input,
          );

        validateSearchRuntimeExecutionTraceSnapshotScopeAgainstCollector(
          snapshotScope,
          collectorScope,
        );

        /*
         * Causal cut.
         *
         * Do not read `observedTraces` again below.
         */
        const causalPrefix =
          observedTraces;

        const snapshotTraces:
          SearchTraceRecord[] =
            [];

        for (
          const trace of
            causalPrefix
        ) {
          if (
            isSearchExecutionTraceCompatibleWithSnapshotScope(
              trace,
              snapshotScope,
            )
          ) {
            /*
             * Preserve exact canonical SearchTraceRecord reference.
             */
            snapshotTraces.push(
              trace,
            );
          }
        }

        return Object.freeze(
          snapshotTraces,
        );
      };

  return Object.freeze({
    observe_execution:
      observeExecution,

    resolve_snapshot_traces:
      resolveSnapshotTraces,
  });
}

/* ============================================================================
 * 11. STATIC OWNERSHIP
 * ----------------------------------------------------------------------------
 * Governance metadata only.
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_TRACE_COLLECTOR_OWNERSHIP =
  Object.freeze({
    execution_plane:
      true,

    canonical_owner:
      "SEARCH_RUNTIME_EXECUTION_TRACE_COLLECTION_LIFECYCLE",

    canonical_trace_owner:
      "EXECUTION_TRACEABILITY",

    canonical_trace_identity_owner:
      "EXECUTION_TRACEABILITY",

    canonical_trace_producer:
      "search-execution-traceability-core.ts",

    runtime_observation_owner:
      false,

    runtime_observation_transport_contract_owner:
      "SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT",

    collection_lifecycle_owner:
      "SEARCH_RUNTIME_EXECUTION_TRACE_COLLECTOR",

    collection_scope:
      "ONE_CANONICAL_SEARCH_RUNTIME_EXECUTION",

    collection_order_source:
      "OBSERVE_EXECUTION_INVOCATION_ORDER",

    snapshot_trace_read_owner:
      "SEARCH_RUNTIME_EXECUTION_TRACE_COLLECTOR",

    snapshot_traceability_assembly_owner:
      "RESOLVE_SNAPSHOT_TRACEABILITY",

    variable_lineage_owner:
      "VARIABLE_LINEAGE_GOVERNANCE",

    private_snapshot_owner:
      "PRIVATE_SNAPSHOT",

    analytical_owner:
      false,

    policy_owner:
      false,

    corpus_owner:
      false,

    confidence_owner:
      false,

    missing_data_owner:
      false,

    validation_state_owner:
      false,

    collector_generates_identity:
      false,

    collector_reads_runtime_clock:
      false,

    collector_reconstructs_history:
      false,

    collector_persists_history:
      false,
  } as const);

/* ============================================================================
 * 12. STATIC GOVERNANCE
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_TRACE_COLLECTOR_GOVERNANCE =
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

    analytical_owner:
      false,

    canonical_trace_owner:
      false,

    /* ------------------------------------------------------------------------
     * EXECUTION OBSERVATION
     * --------------------------------------------------------------------- */

    canonical_runtime_execution_observation_required:
      true,

    raw_observed_facts_transport_allowed:
      false,

    producer_boundary_resolution_transport_allowed:
      false,

    runtime_execution_observation_reconstruction_allowed:
      false,

    runtime_execution_observation_mutation_allowed:
      false,

    /* ------------------------------------------------------------------------
     * TRACE MATERIALIZATION
     * --------------------------------------------------------------------- */

    canonical_trace_materializer_required:
      true,

    local_search_trace_record_construction_allowed:
      false,

    local_search_trace_id_construction_allowed:
      false,

    trace_record_mutation_allowed:
      false,

    trace_identity_mutation_allowed:
      false,

    trace_field_reconstruction_allowed:
      false,

    missing_data_reconstruction_allowed:
      false,

    confidence_reconstruction_allowed:
      false,

    validation_state_reconstruction_allowed:
      false,

    module_inference_allowed:
      false,

    method_inference_allowed:
      false,

    input_contract_inference_allowed:
      false,

    output_contract_inference_allowed:
      false,

    policy_resolution_allowed:
      false,

    corpus_resolution_allowed:
      false,

    /* ------------------------------------------------------------------------
     * COLLECTION LIFECYCLE
     * --------------------------------------------------------------------- */

    one_collector_per_runtime_execution_required:
      true,

    private_execution_scoped_collection_allowed:
      true,

    module_global_collection_allowed:
      false,

    canonical_trace_reference_preservation_required:
      true,

    insertion_order_preservation_required:
      true,

    repeated_observation_preservation_required:
      true,

    collection_sorting_allowed:
      false,

    collection_deduplication_allowed:
      false,

    collection_merging_allowed:
      false,

    chronology_reconstruction_allowed:
      false,

    process_sequence_generation_allowed:
      false,

    database_sequence_generation_allowed:
      false,

    physical_execution_identity_fabrication_allowed:
      false,

    /* ------------------------------------------------------------------------
     * SCOPE
     * --------------------------------------------------------------------- */

    execution_created_at_scope_preservation_required:
      true,

    explicit_query_scope_preservation_required:
      true,

    explicit_cohort_scope_preservation_required:
      true,

    multiple_document_scope_allowed:
      true,

    optional_trace_scope_identity_inference_allowed:
      false,

    snapshot_scope_filtering_allowed:
      true,

    snapshot_scope_filtering_basis:
      "EXPLICIT_CANONICAL_SCOPE_IDENTITIES_ONLY",

    /* ------------------------------------------------------------------------
     * CAUSALITY
     * --------------------------------------------------------------------- */

    causal_prefix_read_required:
      true,

    future_trace_inclusion_allowed:
      false,

    snapshot_read_trace_generation_allowed:
      false,

    snapshot_build_trace_inclusion_after_read_allowed:
      false,

    transformation_trace_in_current_snapshot_allowed:
      false,

    public_ranking_trace_in_current_snapshot_allowed:
      false,

    timestamp_sort_as_execution_order_allowed:
      false,

    /* ------------------------------------------------------------------------
     * VARIABLE LINEAGE / SNAPSHOT
     * --------------------------------------------------------------------- */

    variable_lineage_generation_allowed:
      false,

    variable_lineage_reconstruction_allowed:
      false,

    snapshot_traceability_assembly_allowed:
      false,

    private_snapshot_construction_allowed:
      false,

    /* ------------------------------------------------------------------------
     * SIDE EFFECTS
     * --------------------------------------------------------------------- */

    runtime_clock_access_allowed:
      false,

    random_identity_generation_allowed:
      false,

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

    trace_materialization_failure_must_propagate:
      true,

    execution_scope_failure_must_propagate:
      true,

    catch_and_ignore_allowed:
      false,

    fallback_trace_allowed:
      false,

    fire_and_forget_observation_allowed:
      false,

    /* ------------------------------------------------------------------------
     * PROHIBITED SHORTCUTS
     * --------------------------------------------------------------------- */

    prohibited_shortcuts:
      Object.freeze([
        "collector_constructed_search_trace_record",
        "collector_constructed_search_trace_id",
        "collector_mutated_search_trace_record",
        "collector_reconstructed_runtime_execution_observation",

        "collector_reconstructed_missing_data",
        "collector_reconstructed_confidence",
        "collector_reconstructed_validation_state",
        "collector_inferred_module",
        "collector_inferred_method",
        "collector_inferred_input_contract",
        "collector_inferred_output_contract",
        "collector_resolved_policy_after_execution",
        "collector_resolved_corpus_after_execution",

        "collector_sorted_execution_history",
        "collector_deduplicated_execution_history",
        "collector_merged_execution_history",
        "collector_reconstructed_chronology",

        "collector_generated_process_sequence",
        "collector_generated_database_sequence",
        "collector_generated_execution_instance_id",

        "collector_reused_across_different_created_at_scopes",
        "collector_reused_across_different_query_scopes",
        "collector_reused_across_different_cohort_scopes",

        "collector_inferred_missing_optional_trace_scope",
        "collector_reconstructed_document_scope",
        "collector_reconstructed_query_scope",
        "collector_reconstructed_cohort_scope",

        "collector_waited_for_future_trace",
        "collector_used_timestamp_sort_as_execution_order",
        "collector_added_snapshot_read_trace_to_same_snapshot",
        "collector_added_private_snapshot_trace_to_same_snapshot",
        "collector_added_transformation_trace_to_current_snapshot",
        "collector_added_public_ranking_trace_to_current_snapshot",

        "collector_generated_variable_lineage",
        "collector_reconstructed_variable_lineage",
        "collector_assembled_snapshot_traceability",
        "collector_built_private_snapshot",

        "collector_read_runtime_clock",
        "collector_generated_random_identity",
        "collector_persisted_trace_history",
        "collector_cached_trace_history",
        "collector_logged_trace_history",
        "collector_published_trace_event",
        "collector_accessed_network",

        "collector_swallowed_trace_materialization_failure",
        "collector_swallowed_execution_scope_failure",
        "collector_created_fallback_trace",
        "collector_fire_and_forget_observation",
      ] as const),
  } as const);
