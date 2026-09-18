/* ============================================================================
 * FILE:
 * lib/xyvala/search/runtime/search-runtime-execution-observation-port.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search runtime execution observation transport port
 *
 * ROLE
 * - define the unique runtime transport boundary for Search execution
 *   observations
 * - transport already-materialized execution observations toward the
 *   Execution Traceability domain
 * - provide one shared observation channel for adapted and direct runtime ports
 *
 * CLASSIFICATION
 * - SEARCH RUNTIME
 * - EXECUTION PLANE
 * - OBSERVE TRANSPORT
 * - CROSS-CUTTING
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING
 * - NON-CALIBRATING
 * - NON-MUTATING
 * - NON-TRACE-OWNING
 * - NON-LINEAGE-PRODUCING
 * - PRIVATE
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * canonical producer execution
 *           ↓
 * producer execution observation
 *           ↓
 * SearchRuntimeExecutionObservedFacts
 *           ↓
 * THIS PORT
 *           ↓
 * Runtime Execution Observation Core
 *           ↓
 * Execution Traceability Core
 *           ↓
 * SearchTraceRecord
 *
 * SHARED DOMAIN
 * ----------------------------------------------------------------------------
 * This port is intentionally NOT owned by:
 * - producer adapters;
 * - direct producer bindings;
 * - analytical producers;
 * - snapshot builder;
 * - public transformation;
 * - public ranking.
 *
 * It is a transverse Execution Plane boundary usable by both:
 *
 * adapted canonical producers
 * and
 * directly bound canonical producers.
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * The transported input contract is derived directly from:
 *
 * buildSearchRuntimeExecutionTraceObservation(...)
 *
 * No second manually maintained observation transport schema is introduced.
 *
 * OWNERSHIP
 * ----------------------------------------------------------------------------
 * This module owns:
 * - runtime observation transport boundary type only.
 *
 * This module does NOT own:
 * - observed analytical facts;
 * - SearchRuntimeExecutionObservedFacts;
 * - static producer descriptors;
 * - producer execution contracts;
 * - SearchExecutionTraceObservationInput semantics;
 * - SearchTraceRecord;
 * - SearchTraceId;
 * - SearchVariableLineage;
 * - trace collection storage;
 * - snapshot traceability.
 *
 * DIRECTIVES
 * - Contract Before Runtime
 * - First Divergence Before Correction
 * - one observation channel
 * - exact observation contract reuse
 * - no observation reconstruction
 * - no trace reconstruction
 * - no analytical reconstruction
 * - no producer execution
 * - no producer wrapping
 * - no binding substitution
 * - no timestamp generation
 * - no sequence generation
 * - no fallback
 * - no logging
 * - no persistence
 * - no network access
 *
 * ORDERING
 * ----------------------------------------------------------------------------
 * This port transports observations in the order in which its caller submits
 * them.
 *
 * It does NOT create:
 * - execution sequence;
 * - invocation index;
 * - start order;
 * - completion order.
 *
 * If physical invocation ordering must later become canonical truth, that fact
 * must first exist in the canonical trace contract.
 *
 * No synthetic sequence is authorized here.
 *
 * FAILURE SEMANTICS
 * ----------------------------------------------------------------------------
 * Observation delivery is explicit.
 *
 * This contract defines no:
 * - silent catch;
 * - best-effort fallback;
 * - ignored trace failure.
 *
 * Runtime composition owns the concrete failure policy.
 *
 * Until such policy is explicitly changed, callers must await this port and
 * allow observation failure to remain visible.
 *
 * INVARIANTS
 * - transported input is already canonical observation input
 * - no field is added
 * - no field is removed
 * - no field is transformed
 * - no field is inferred
 * - no observation is reordered here
 * ========================================================================== */

import type {
  SearchModuleVersion,
} from "../contracts/search-pipeline-contract";

import type {
  buildSearchRuntimeExecutionTraceObservation,
} from "../governance/search-runtime-execution-observation-core";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT_MODULE_NAME =
  "xyvala-search-runtime-execution-observation-port" as const;

export const XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT_MODULE_VERSION =
  "1.0.0" satisfies SearchModuleVersion;

/* ============================================================================
 * 2. CANONICAL TRANSPORT INPUT
 * ----------------------------------------------------------------------------
 * `observe_execution` transports an execution observation AFTER static and
 * dynamic execution facts have been canonically assembled by:
 *
 * buildSearchRuntimeExecutionTraceObservation(...)
 *
 * Therefore this port consumes the exact OUTPUT of that canonical builder.
 *
 * It does NOT consume:
 * - raw producer facts;
 * - producer-specific boundary observations;
 * - SearchRuntimeExecutionObservedFacts directly;
 * - analytical producer outputs.
 *
 * This preserves:
 *
 * Producer Execution Observation Core
 *          ↓
 * SearchRuntimeExecutionObservedFacts
 *          ↓
 * Runtime Execution Observation Core
 *          ↓
 * SearchExecutionTraceObservationInput
 *          ↓
 * observe_execution
 *          ↓
 * Execution Traceability
 *
 * No second observation schema is declared here.
 * ========================================================================== */

export type SearchRuntimeExecutionObservationTransportInput =
  ReturnType<
    typeof buildSearchRuntimeExecutionTraceObservation
  >;

/* ============================================================================
 * 3. OBSERVATION PORT
 * ----------------------------------------------------------------------------
 * Receives one canonically materialized Search execution observation.
 *
 * The observation has already passed through:
 *
 * - Producer Execution Observation Core
 * - Runtime Execution Observation Core
 *
 * This port performs transport only.
 *
 * It may be synchronous or asynchronous.
 *
 * It returns no analytical value.
 * ========================================================================== */

export type SearchRuntimeExecutionObservationPort =
  (
    input:
      SearchRuntimeExecutionObservationTransportInput,
  ) =>
    void | Promise<void>;

/* ============================================================================
 * 4. PORT SET
 * ----------------------------------------------------------------------------
 * Named port shape intended for dependency composition.
 *
 * `observe_execution` is the single authorized runtime observation channel.
 * ========================================================================== */

export interface SearchRuntimeExecutionObservationPorts {
  readonly observe_execution:
    SearchRuntimeExecutionObservationPort;
}

/* ============================================================================
 * 5. OWNERSHIP
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT_OWNERSHIP =
  Object.freeze({
    canonical_owner:
      "SEARCH_RUNTIME_EXECUTION_OBSERVATION_TRANSPORT",

    execution_plane:
      true,

    analytical_plane:
      false,

    governance_plane:
      false,

    observation_transport_owner:
      true,

    observation_truth_owner:
      false,

    execution_trace_owner:
      false,

    trace_identity_owner:
      false,

    variable_lineage_owner:
      false,

    producer_execution_owner:
      false,

    producer_binding_owner:
      false,

    runtime_orchestration_owner:
      false,

    trace_collection_owner:
      false,

    snapshot_owner:
      false,
  } as const);

/* ============================================================================
 * 6. GOVERNANCE
 * ----------------------------------------------------------------------------
 * Static governance declaration only.
 *
 * This object performs no runtime operation.
 *
 * `observe_execution` is a TRANSPORT boundary.
 *
 * It receives only a canonical runtime execution observation that has already
 * been assembled by:
 *
 * Producer Execution Observation Core
 *                ↓
 * Runtime Execution Observation Core
 *                ↓
 * SearchExecutionTraceObservationInput
 *                ↓
 * observe_execution
 *
 * It MUST NOT receive:
 * - raw producer facts;
 * - SearchRuntimeExecutionObservedFacts directly;
 * - execution-boundary observation resolutions;
 * - analytical producer outputs;
 * - partially reconstructed trace data.
 *
 * OWNERSHIP
 * ----------------------------------------------------------------------------
 * This transport:
 * - does not own observed execution facts;
 * - does not own static execution descriptors;
 * - does not own SearchTraceRecord;
 * - does not own SearchTraceId;
 * - does not own SearchVariableLineage;
 * - does not own trace collection;
 * - does not own snapshot traceability.
 *
 * ORDER
 * ----------------------------------------------------------------------------
 * Observation order is preserved from caller submission.
 *
 * This transport does NOT manufacture:
 * - sequence_id;
 * - invocation_index;
 * - start_order;
 * - completion_order.
 *
 * If physical invocation ordering later becomes canonical truth, the canonical
 * trace contract must be extended first.
 *
 * FAILURE
 * ----------------------------------------------------------------------------
 * No silent trace loss is authorized.
 *
 * This boundary defines no:
 * - catch-and-ignore;
 * - best effort;
 * - empty trace fallback;
 * - retry semantics;
 * - persistence semantics.
 *
 * Concrete runtime composition owns authorized execution behaviour.
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT_GOVERNANCE =
  Object.freeze({
    /* ------------------------------------------------------------------------
     * CONTRACT / ARCHITECTURE
     * --------------------------------------------------------------------- */

    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    reality_before_interpretation:
      true,

    one_truth_one_owner:
      true,

    cross_cutting_execution_plane_boundary:
      true,

    single_observation_channel:
      true,

    transport_only:
      true,

    observe_only:
      true,

    analytical_plane_owner:
      false,

    governance_truth_owner:
      false,

    execution_trace_owner:
      false,

    /* ------------------------------------------------------------------------
     * CANONICAL TRANSPORT CONTRACT
     * --------------------------------------------------------------------- */

    canonical_input_contract_derived:
      true,

    canonical_transport_contract_derived_from_runtime_observation_core:
      true,

    canonical_runtime_execution_observation_required:
      true,

    already_materialized_observation_transport_only:
      true,

    second_observation_schema_allowed:
      false,

    raw_observed_facts_transport_allowed:
      false,

    producer_boundary_resolution_transport_allowed:
      false,

    analytical_output_transport_as_execution_observation_allowed:
      false,

    partial_execution_observation_transport_allowed:
      false,

    runtime_execution_observation_reconstruction_allowed:
      false,

    /* ------------------------------------------------------------------------
     * OBSERVED FACTS
     * --------------------------------------------------------------------- */

    observation_fact_creation_allowed:
      false,

    observation_fact_inference_allowed:
      false,

    observation_fact_reconstruction_allowed:
      false,

    observation_fact_semantic_mutation_allowed:
      false,

    observation_field_addition_allowed:
      false,

    observation_field_removal_allowed:
      false,

    observation_field_reinterpretation_allowed:
      false,

    missing_data_reconstruction_allowed:
      false,

    validation_state_reconstruction_allowed:
      false,

    execution_confidence_reconstruction_allowed:
      false,

    policy_version_reconstruction_allowed:
      false,

    module_identity_reconstruction_allowed:
      false,

    /* ------------------------------------------------------------------------
     * ANALYTICAL SEPARATION
     * --------------------------------------------------------------------- */

    analytical_truth_creation_allowed:
      false,

    analytical_truth_reconstruction_allowed:
      false,

    analytical_truth_mutation_allowed:
      false,

    analytical_score_calculation_allowed:
      false,

    analytical_signal_calculation_allowed:
      false,

    analytical_validation_allowed:
      false,

    analytical_confidence_reuse_allowed:
      false,

    unavailable_to_zero_allowed:
      false,

    unavailable_to_neutral_allowed:
      false,

    unavailable_to_watch_allowed:
      false,

    /* ------------------------------------------------------------------------
     * TRACEABILITY
     * --------------------------------------------------------------------- */

    execution_trace_creation_allowed:
      false,

    execution_trace_reconstruction_allowed:
      false,

    execution_trace_mutation_allowed:
      false,

    trace_identity_generation_allowed:
      false,

    trace_identity_reconstruction_allowed:
      false,

    trace_collection_allowed:
      false,

    trace_collection_storage_allowed:
      false,

    snapshot_traceability_reconstruction_allowed:
      false,

    /* ------------------------------------------------------------------------
     * VARIABLE LINEAGE
     * --------------------------------------------------------------------- */

    variable_lineage_generation_allowed:
      false,

    variable_lineage_reconstruction_allowed:
      false,

    variable_lineage_mutation_allowed:
      false,

    /* ------------------------------------------------------------------------
     * PRODUCER / BINDING SEPARATION
     * --------------------------------------------------------------------- */

    producer_execution_allowed:
      false,

    producer_wrapping_allowed:
      false,

    producer_substitution_allowed:
      false,

    runtime_binding_wrapping_allowed:
      false,

    runtime_binding_substitution_allowed:
      false,

    adapter_ownership_transfer_allowed:
      false,

    direct_port_ownership_transfer_allowed:
      false,

    /* ------------------------------------------------------------------------
     * ORDERING
     * --------------------------------------------------------------------- */

    caller_submission_order_preservation_required:
      true,

    observation_reordering_allowed:
      false,

    execution_sequence_generation_allowed:
      false,

    invocation_index_generation_allowed:
      false,

    start_order_generation_allowed:
      false,

    completion_order_generation_allowed:
      false,

    synthetic_ordering_metadata_allowed:
      false,

    /* ------------------------------------------------------------------------
     * TIME
     * --------------------------------------------------------------------- */

    timestamp_generation_allowed:
      false,

    runtime_clock_access_allowed:
      false,

    duration_measurement_allowed:
      false,

    duration_reconstruction_allowed:
      false,

    /* ------------------------------------------------------------------------
     * FAILURE SEMANTICS
     * --------------------------------------------------------------------- */

    explicit_observation_delivery_required:
      true,

    silent_observation_failure_allowed:
      false,

    catch_and_ignore_allowed:
      false,

    best_effort_observation_allowed:
      false,

    fallback_observation_allowed:
      false,

    empty_observation_fallback_allowed:
      false,

    silent_trace_loss_allowed:
      false,

    /* ------------------------------------------------------------------------
     * SIDE EFFECTS
     * --------------------------------------------------------------------- */

    persistence_allowed:
      false,

    logging_allowed:
      false,

    event_publication_allowed:
      false,

    network_access_allowed:
      false,

    runtime_mutation_allowed:
      false,

    /* ------------------------------------------------------------------------
     * EXPLICIT PROHIBITIONS
     * --------------------------------------------------------------------- */

    prohibited_shortcuts:
      Object.freeze([
        /*
         * Wrong transport input.
         */
        "transport_raw_observed_facts",
        "transport_search_runtime_execution_observed_facts_directly",
        "transport_execution_boundary_resolution",
        "transport_analytical_producer_output",
        "transport_partial_execution_observation",

        /*
         * Second schema / reconstruction.
         */
        "duplicate_execution_observation_transport_schema",
        "transport_reconstructed_runtime_execution_observation",
        "transport_generated_observed_fact",
        "transport_inferred_observed_fact",
        "transport_mutated_observed_fact",
        "transport_added_observation_field",
        "transport_removed_observation_field",

        /*
         * Dynamic provenance reconstruction.
         */
        "transport_reconstructed_missing_data",
        "transport_reconstructed_validation_state",
        "transport_reconstructed_execution_confidence",
        "transport_reconstructed_policy_version",
        "transport_reconstructed_module_identity",

        /*
         * Analytical contamination.
         */
        "transport_generated_analytical_truth",
        "transport_reconstructed_analytical_truth",
        "transport_reused_analytical_confidence_as_execution_confidence",
        "unavailable_to_zero",
        "unavailable_to_neutral",
        "unavailable_to_watch",

        /*
         * Trace ownership violations.
         */
        "transport_generated_trace",
        "transport_reconstructed_trace",
        "transport_mutated_trace",
        "transport_generated_trace_id",
        "transport_reconstructed_trace_id",
        "transport_collected_trace",
        "transport_stored_trace",
        "transport_reconstructed_snapshot_traceability",

        /*
         * Lineage ownership violations.
         */
        "transport_generated_variable_lineage",
        "transport_reconstructed_variable_lineage",
        "transport_mutated_variable_lineage",

        /*
         * Producer / binding violations.
         */
        "transport_executed_producer",
        "transport_wrapped_producer",
        "transport_substituted_producer",
        "transport_wrapped_runtime_binding",
        "transport_substituted_runtime_binding",

        /*
         * Ordering fabrication.
         */
        "transport_reordered_observations",
        "transport_generated_execution_sequence",
        "transport_generated_invocation_index",
        "transport_generated_start_order",
        "transport_generated_completion_order",
        "transport_generated_synthetic_order_metadata",

        /*
         * Time reconstruction.
         */
        "transport_generated_timestamp",
        "transport_read_runtime_clock",
        "transport_measured_duration",
        "transport_reconstructed_duration",

        /*
         * Silent failure / fallback.
         */
        "silent_observation_failure",
        "catch_and_ignore_observation_failure",
        "best_effort_trace_transport",
        "fallback_execution_observation",
        "empty_execution_observation_fallback",
        "silent_trace_loss",

        /*
         * Side effects.
         */
        "transport_persistence",
        "transport_logging",
        "transport_event_publication",
        "transport_network_access",
        "transport_runtime_mutation",
      ] as const),
  } as const);

/* ============================================================================
 * 7. STATUS
 * ----------------------------------------------------------------------------
 * Contract only.
 *
 * No concrete runtime sink is implemented here.
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT_STATUS =
  Object.freeze({
    transport_contract_available:
      true,

    shared_by_adapted_and_direct_ports:
      true,

    concrete_observer_bound:
      false,

    anchor_instrumentation_complete:
      false,

    direct_port_instrumentation_complete:
      false,

    ordered_trace_collection_complete:
      false,

    snapshot_trace_transport_complete:
      false,
  } as const);
