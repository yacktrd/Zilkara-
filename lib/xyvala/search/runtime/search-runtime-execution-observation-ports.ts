/* ============================================================================
 * FILE: lib/xyvala/search/runtime/search-runtime-execution-observation-ports.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search runtime execution observation port set
 *
 * ROLE
 * - assemble the two canonical cross-cutting execution-observation
 *   capabilities required by Search runtime execution
 * - preserve their existing canonical contracts unchanged
 * - expose one structural dependency set to bootstrap/composition
 *
 * CLASSIFICATION
 * - SEARCH EXECUTION PLANE
 * - CROSS-CUTTING RUNTIME CAPABILITY SET
 * - CONTRACT ASSEMBLY
 * - NON-ANALYTICAL
 * - NON-PRODUCER
 * - NON-TRACE-OWNER
 * - NON-LINEAGE-OWNER
 * - NON-MUTATING
 *
 * ARCHITECTURE
 * ----------------------------------------------------------------------------
 *
 * observe_execution_boundary
 * <- dynamic execution-fact SOURCE boundary
 *
 * observe_execution
 * <- canonical execution-observation TRANSPORT boundary
 *
 * This module introduces:
 * - no third observation capability;
 * - no second payload schema;
 * - no analytical truth;
 * - no trace truth;
 * - no variable lineage truth.
 *
 * It only groups two already-canonical execution-plane capabilities.
 * ========================================================================== */

import type {
  SearchModuleVersion,
} from "../contracts/search-pipeline-contract";

import type {
  SearchRuntimeExecutionBoundaryObservationPort,
} from "./search-runtime-execution-boundary-observation-port";

import type {
  SearchRuntimeExecutionObservationPort,
} from "./search-runtime-execution-observation-port";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORTS_MODULE_NAME =
  "xyvala-search-runtime-execution-observation-ports" as const;

export const XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORTS_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

/* ============================================================================
 * 2. CANONICAL CAPABILITY SET
 * ========================================================================== */

export interface SearchRuntimeExecutionObservationPorts {
  readonly observe_execution_boundary:
    SearchRuntimeExecutionBoundaryObservationPort;

  readonly observe_execution:
    SearchRuntimeExecutionObservationPort;
}

/* ============================================================================
 * 3. CAPABILITY IDENTITIES
 * ----------------------------------------------------------------------------
 * Runtime validation registry only.
 *
 * Exactness is compile-time checked against the canonical capability set.
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT_NAMES =
  Object.freeze([
    "observe_execution_boundary",
    "observe_execution",
  ] as const satisfies readonly (
    keyof SearchRuntimeExecutionObservationPorts
  )[]);

export type SearchRuntimeExecutionObservationPortName =
  keyof SearchRuntimeExecutionObservationPorts;

type SearchRuntimeDeclaredExecutionObservationPortName =
  (
    typeof XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT_NAMES
  )[number];

type SearchRuntimeMissingExecutionObservationPort =
  Exclude<
    SearchRuntimeExecutionObservationPortName,
    SearchRuntimeDeclaredExecutionObservationPortName
  >;

type SearchRuntimeUnknownExecutionObservationPort =
  Exclude<
    SearchRuntimeDeclaredExecutionObservationPortName,
    SearchRuntimeExecutionObservationPortName
  >;

type SearchRuntimeExecutionObservationPortCoverageIsExact =
  [
    SearchRuntimeMissingExecutionObservationPort,
    SearchRuntimeUnknownExecutionObservationPort,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT_COVERAGE_IS_EXACT:
  SearchRuntimeExecutionObservationPortCoverageIsExact =
    true;

void XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT_COVERAGE_IS_EXACT;

/* ============================================================================
 * 4. GOVERNANCE
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORTS_GOVERNANCE =
  Object.freeze({
    execution_plane_boundary:
      true,

    cross_cutting:
      true,

    structural_assembly_only:
      true,

    analytical_owner:
      false,

    execution_trace_owner:
      false,

    variable_lineage_owner:
      false,

    boundary_observation_owner:
      false,

    transport_observation_owner:
      false,

    canonical_boundary_port_preserved:
      true,

    canonical_transport_port_preserved:
      true,

    second_observation_schema_allowed:
      false,

    observation_reconstruction_allowed:
      false,

    execution_trace_reconstruction_allowed:
      false,

    variable_lineage_reconstruction_allowed:
      false,

    producer_execution_allowed:
      false,

    runtime_clock_access_allowed:
      false,

    persistence_allowed:
      false,

    logging_allowed:
      false,

    network_access_allowed:
      false,

    prohibited_shortcuts:
      Object.freeze([
        "second_execution_observation_schema",
        "execution_observation_payload_reconstruction",
        "execution_boundary_fact_reconstruction",
        "execution_trace_reconstruction",
        "variable_lineage_reconstruction",
        "analytical_truth_creation",
        "runtime_clock_access",
        "persistence",
      ] as const),
  } as const);
