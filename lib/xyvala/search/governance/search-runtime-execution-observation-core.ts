/* ============================================================================
 * FILE:
 * lib/xyvala/search/governance/search-runtime-execution-observation-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search runtime execution observation core
 *
 * ROLE
 * - assemble one explicit Search execution observation
 * - consume static runtime execution descriptor truth
 * - consume static producer execution-contract truth
 * - consume explicit dynamic facts observed during actual execution
 * - preserve canonical producer module identity supplied at execution boundary
 * - preserve actual policy / corpus provenance when explicitly observed
 * - delegate SearchTraceRecord production exclusively to
 *   EXECUTION_TRACEABILITY
 *
 * CLASSIFICATION
 * - SEARCH GOVERNANCE
 * - EXECUTION OBSERVATION BOUNDARY
 * - OBSERVE
 * - ASSEMBLY
 * - PURE
 * - DETERMINISTIC
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
 * Search Runtime Execution Descriptor Registry
 *                +
 * Search Producer Execution Contract Registry
 *                +
 * explicit dynamic execution facts
 *                ↓
 * search-runtime-execution-observation-core.ts
 *                ↓
 * SearchExecutionTraceObservationInput
 *                ↓
 * search-execution-traceability-core.ts
 *                ↓
 * SearchTraceRecord
 *
 * STATIC TRUTH
 * ----------------------------------------------------------------------------
 * Runtime Execution Descriptor Registry owns:
 *
 * - runtime port identity;
 * - canonical ownership relationship;
 * - SearchPipelineLayer membership;
 * - execution causality relative to Private Snapshot.
 *
 * Producer Execution Contract Registry owns:
 *
 * - execution_nature;
 * - method;
 * - input_contracts;
 * - output_contract.
 *
 * This module reads those truths.
 *
 * It does NOT recreate them.
 *
 * DYNAMIC TRUTH
 * ----------------------------------------------------------------------------
 * The caller must supply the facts actually observed during execution:
 *
 * - created_at;
 * - optional document_id;
 * - optional query_id;
 * - optional cohort_id;
 * - module_name;
 * - module_version;
 * - parameters;
 * - validation_state;
 * - missing_data;
 * - confidence;
 * - optional corpus_version;
 * - optional policy_version;
 * - optional duration_ms.
 *
 * No dynamic value receives a fallback here.
 *
 * MODULE IDENTITY GOVERNANCE
 * ----------------------------------------------------------------------------
 * module_name and module_version MUST originate from the canonical producer
 * identity actually executed.
 *
 * Where canonical producers export:
 *
 * *_MODULE_NAME
 * *_MODULE_VERSION
 *
 * runtime instrumentation must transport those exact exported values.
 *
 * This module deliberately does NOT derive module identity from:
 *
 * - module_path;
 * - function_name;
 * - runtime port name;
 * - output shape;
 * - VLR;
 * - source-code filename.
 *
 * POLICY PROVENANCE
 * ----------------------------------------------------------------------------
 * When the Runtime Execution Descriptor declares:
 *
 * requires_dynamic_policy_provenance === true
 *
 * policy_version must be supplied explicitly from the policy actually used by
 * that execution.
 *
 * The current policy must never be looked up after execution.
 *
 * OBSERVATION / PROVIDER PROVENANCE
 * ----------------------------------------------------------------------------
 * Some descriptors also declare:
 *
 * requires_dynamic_observation_provenance
 * requires_external_provider_identity
 *
 * SearchTraceRecord currently exposes no dedicated canonical field for those
 * identities.
 *
 * Therefore this module does NOT invent one and does NOT silently encode those
 * identities into parameters.
 *
 * Any future dedicated provider/observation provenance representation must be
 * added contractually before this module transports it.
 *
 * PARAMETERS GOVERNANCE
 * ----------------------------------------------------------------------------
 * parameters must already represent explicit execution facts.
 *
 * This module does not manufacture parameters from:
 *
 * - policies;
 * - observations;
 * - analytical outputs;
 * - scores;
 * - current configuration.
 *
 * MISSING-DATA GOVERNANCE
 * ----------------------------------------------------------------------------
 * missing_data must be supplied explicitly.
 *
 * In particular:
 *
 * degradation_reasons != missing_data
 *
 * No conversion between the two is authorized.
 *
 * CONFIDENCE GOVERNANCE
 * ----------------------------------------------------------------------------
 * confidence must already satisfy the canonical Search trace evidence
 * semantics.
 *
 * analytical confidence != execution confidence
 *
 * No score or analytical confidence is converted here.
 *
 * TRACE OWNERSHIP
 * ----------------------------------------------------------------------------
 * This module may assemble SearchExecutionTraceObservationInput.
 *
 * It does NOT own SearchTraceRecord.
 *
 * When materialization is requested it delegates unchanged to:
 *
 * buildSearchExecutionTraceRecord(...)
 *
 * canonical owner:
 *
 * EXECUTION_TRACEABILITY
 *
 * TRACE CAUSALITY
 * ----------------------------------------------------------------------------
 * Only runtime ports whose descriptor declares:
 *
 * current_snapshot_trace_scope === "CURRENT_PRIVATE_SNAPSHOT"
 *
 * may enter this boundary.
 *
 * Therefore current-snapshot observation rejects:
 *
 * - resolve_distribution_id
 * - build_cohort_batch
 * - resolve_snapshot_id
 * - resolve_snapshot_traceability
 * - build_private_snapshot
 * - transform_public_result
 * - rank_public_results
 *
 * No layer is fabricated for transverse boundaries.
 * No downstream execution is backfilled into Private Snapshot.
 *
 * DIRECTIVES
 * - Contract Before Runtime
 * - First Divergence Before Correction
 * - static truth from canonical registries only
 * - dynamic truth explicitly observed only
 * - no producer execution
 * - no producer wrapping
 * - no producer substitution
 * - no policy resolution
 * - no provider resolution
 * - no module inference
 * - no method inference
 * - no execution-nature inference
 * - no input-contract inference
 * - no output-contract inference
 * - no missing-data reconstruction
 * - no confidence reconstruction
 * - no duration calculation
 * - no runtime clock
 * - no Date.now()
 * - no new Date()
 * - no randomUUID()
 * - no trace collection
 * - no persistence
 * - no logging
 * - no network access
 *
 * INVARIANTS
 * - only current-snapshot-traceable ports may be observed here
 * - pipeline layer comes exclusively from execution descriptor governance
 * - execution nature comes exclusively from producer execution contract
 * - method comes exclusively from producer execution contract
 * - input contracts come exclusively from producer execution contract
 * - output contract comes exclusively from producer execution contract
 * - module identity remains explicitly observed
 * - dynamic policy provenance cannot disappear when contractually required
 * - no SearchTraceRecord is locally reconstructed
 * - canonical trace materialization remains EXECUTION_TRACEABILITY-owned
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * non-traceable port enters observation
 * => trace-causality boundary
 *
 * descriptor has no pipeline layer
 * => execution-descriptor boundary
 *
 * descriptor / execution contract disagree on port identity
 * => execution-governance boundary
 *
 * required policy_version absent
 * => runtime policy-provenance boundary
 *
 * module identity inferred from module path
 * => module-provenance violation
 *
 * missing_data derived from degradation_reasons
 * => semantic reconstruction violation
 *
 * confidence derived from analytical score
 * => confidence reconstruction violation
 *
 * provider identity encoded implicitly into parameters
 * => undeclared trace-contract extension
 *
 * trace produced locally without canonical traceability core
 * => EXECUTION_TRACEABILITY ownership violation
 * ========================================================================== */

import type {
  SearchModuleVersion,
  SearchTraceRecord,
} from "../contracts/search-pipeline-contract";

import {
  buildSearchExecutionTraceRecord,
} from "./search-execution-traceability-core";

import type {
  SearchExecutionTraceObservationInput,
} from "./search-execution-traceability-core";

import {
  getSearchRuntimeExecutionDescriptor,
  validateSearchRuntimeExecutionDescriptorRegistry,
} from "./search-runtime-execution-descriptor-registry";

import type {
  SearchRuntimeExecutionPortName,
} from "./search-runtime-execution-descriptor-registry";

import {
  getSearchProducerExecutionContract,
  isSearchProducerExecutionTraceablePort,
  validateSearchProducerExecutionContractRegistry,
} from "./search-producer-execution-contract-registry";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_MODULE_NAME =
  "xyvala-search-runtime-execution-observation-core" as const;

export const XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

/* ============================================================================
 * 2. DYNAMIC OBSERVED FACT DOMAIN
 * ----------------------------------------------------------------------------
 * Everything NOT owned by the two static execution registries remains explicit
 * execution-observation input.
 *
 * Static fields removed here:
 *
 * - layer
 * - execution_nature
 * - method
 * - input_contracts
 * - output_contract
 *
 * No parallel primitive trace schema is introduced.
 * ========================================================================== */

export type SearchRuntimeExecutionObservedFacts =
  Readonly<
    Omit<
      SearchExecutionTraceObservationInput,
      | "layer"
      | "execution_nature"
      | "method"
      | "input_contracts"
      | "output_contract"
    >
  >;

/* ============================================================================
 * 3. OBSERVATION ASSEMBLY INPUT
 * ========================================================================== */

export interface SearchRuntimeExecutionObservationInput {
  readonly port_name:
    SearchRuntimeExecutionPortName;

  readonly observed_facts:
    SearchRuntimeExecutionObservedFacts;
}

/* ============================================================================
 * 4. BASIC ASSERTIONS
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
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        `Execution observation violation: ${fieldName} must be a non-empty string.`,
    );
  }
}

/* ============================================================================
 * 5. STATIC GOVERNANCE VALIDATION
 * ========================================================================== */

function validateSearchRuntimeExecutionObservationGovernance(): void {
  validateSearchRuntimeExecutionDescriptorRegistry();

  validateSearchProducerExecutionContractRegistry();
}

/* ============================================================================
 * 6. DYNAMIC OBSERVATION VALIDATION
 * ----------------------------------------------------------------------------
 * Complete SearchTraceRecord-compatible validation remains canonical
 * EXECUTION_TRACEABILITY responsibility.
 *
 * This boundary validates only facts necessary to protect its own assembly
 * responsibilities.
 * ========================================================================== */

function validateSearchRuntimeExecutionObservedFacts(
  portName:
    SearchRuntimeExecutionPortName,

  facts:
    SearchRuntimeExecutionObservedFacts,
): void {
  assertNonEmptyString(
    facts.module_name,
    `${portName}.module_name`,
  );

  assertNonEmptyString(
    facts.module_version,
    `${portName}.module_version`,
  );

  const descriptor =
    getSearchRuntimeExecutionDescriptor(
      portName,
    );

  if (
    descriptor
      .requires_dynamic_policy_provenance &&
    facts.policy_version ===
      undefined
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        `Execution observation violation: ${portName} requires the policy_version actually used by the execution.`,
    );
  }

  if (
    facts.policy_version !==
    undefined
  ) {
    assertNonEmptyString(
      facts.policy_version,
      `${portName}.policy_version`,
    );
  }

  if (
    facts.corpus_version !==
    undefined
  ) {
    assertNonEmptyString(
      facts.corpus_version,
      `${portName}.corpus_version`,
    );
  }
}

/* ============================================================================
 * 7. TRACEABLE EXECUTION SCOPE VALIDATION
 * ----------------------------------------------------------------------------
 * SearchTraceRecord requires SearchPipelineLayer.
 *
 * Transverse runtime boundaries are therefore rejected rather than assigned an
 * invented layer.
 * ========================================================================== */

function resolveTraceablePipelineLayer(
  portName:
    SearchRuntimeExecutionPortName,
): SearchTraceRecord["layer"] {
  if (
    !isSearchProducerExecutionTraceablePort(
      portName,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        `Execution observation scope violation: ${portName} is not authorized for the current Private Snapshot trace collection.`,
    );
  }

  const descriptor =
    getSearchRuntimeExecutionDescriptor(
      portName,
    );

  if (
    descriptor.pipeline_layer ===
    null
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        `Execution observation scope violation: ${portName} has no canonical SearchPipelineLayer.`,
    );
  }

  return descriptor
    .pipeline_layer;
}

/* ============================================================================
 * 8. EXECUTION CONTRACT CONCORDANCE
 * ========================================================================== */

function validateExecutionContractConcordance(
  portName:
    SearchRuntimeExecutionPortName,
): void {
  if (
    !isSearchProducerExecutionTraceablePort(
      portName,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        `Execution observation scope violation: ${portName} has no authorized current-snapshot producer execution contract.`,
    );
  }

  const descriptor =
    getSearchRuntimeExecutionDescriptor(
      portName,
    );

  const executionContract =
    getSearchProducerExecutionContract(
      portName,
    );

  if (
    descriptor.port_name !==
    executionContract.port_name
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        `Execution governance violation: ${portName} descriptor and producer execution contract disagree on canonical port identity.`,
    );
  }

  if (
    descriptor
      .current_snapshot_trace_scope !==
    "CURRENT_PRIVATE_SNAPSHOT"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        `Execution governance violation: ${portName} is outside current Private Snapshot trace causality.`,
    );
  }
}

/* ============================================================================
 * 9. CANONICAL EXECUTION OBSERVATION ASSEMBLY
 * ----------------------------------------------------------------------------
 * Static contractual facts:
 *
 * descriptor.pipeline_layer
 * executionContract.execution_nature
 * executionContract.method
 * executionContract.input_contracts
 * executionContract.output_contract
 *
 * Dynamic execution facts:
 *
 * input.observed_facts
 *
 * No field is reconstructed from downstream analytical state.
 * ========================================================================== */

export function buildSearchRuntimeExecutionTraceObservation(
  input:
    SearchRuntimeExecutionObservationInput,
): SearchExecutionTraceObservationInput {
  validateSearchRuntimeExecutionObservationGovernance();

  const portName =
    input.port_name;

  validateExecutionContractConcordance(
    portName,
  );

  validateSearchRuntimeExecutionObservedFacts(
    portName,
    input.observed_facts,
  );

  if (
    !isSearchProducerExecutionTraceablePort(
      portName,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        `Execution observation scope violation: ${portName} is not traceable in the current Private Snapshot.`,
    );
  }

  const layer =
    resolveTraceablePipelineLayer(
      portName,
    );

  const executionContract =
    getSearchProducerExecutionContract(
      portName,
    );

  const observation = {
    ...input
      .observed_facts,

    layer,

    execution_nature:
      executionContract
        .execution_nature,

    method:
      executionContract
        .method,

    input_contracts:
      executionContract
        .input_contracts,

    output_contract:
      executionContract
        .output_contract,
  } satisfies SearchExecutionTraceObservationInput;

  return Object.freeze(
    observation,
  );
}

/* ============================================================================
 * 10. CANONICAL TRACE MATERIALIZATION DELEGATION
 * ----------------------------------------------------------------------------
 * This function does NOT become SearchTraceRecord producer owner.
 *
 * It performs:
 *
 * runtime observation assembly
 * -> canonical EXECUTION_TRACEABILITY producer
 *
 * SearchTraceRecord remains produced exclusively by:
 *
 * buildSearchExecutionTraceRecord(...)
 * ========================================================================== */

export function materializeSearchRuntimeExecutionTrace(
  input:
    SearchRuntimeExecutionObservationInput,
): SearchTraceRecord {
  const observation =
    buildSearchRuntimeExecutionTraceObservation(
      input,
    );

  return buildSearchExecutionTraceRecord(
    observation,
  );
}

/* ============================================================================
 * 11. OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_OWNERSHIP =
  Object.freeze({
    observation_boundary_owner:
      "SEARCH_RUNTIME_EXECUTION_OBSERVATION",

    runtime_execution_descriptor_owner:
      "SEARCH_RUNTIME_EXECUTION_GOVERNANCE",

    producer_execution_contract_owner:
      "SEARCH_PRODUCER_EXECUTION_CONTRACT_GOVERNANCE",

    execution_trace_owner:
      "EXECUTION_TRACEABILITY",

    execution_trace_producer:
      "search-execution-traceability-core.ts",

    variable_lineage_owner:
      "VARIABLE_LINEAGE_GOVERNANCE",

    runtime_execution_order_owner:
      "search-runtime-orchestrator.ts",

    runtime_adapter_owner:
      "search-runtime-producer-adapters.ts",

    observation_boundary_generates_trace_identity:
      false,

    observation_boundary_owns_trace_truth:
      false,

    observation_boundary_generates_lineage:
      false,

    observation_boundary_executes_producer:
      false,

    observation_boundary_resolves_policy:
      false,

    observation_boundary_reads_runtime_clock:
      false,
  } as const);

/* ============================================================================
 * 12. GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_GOVERNANCE =
  Object.freeze({
    observation_assembly_only:
      true,

    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    analytical_owner:
      false,

    canonical_trace_owner:
      false,

    canonical_lineage_owner:
      false,

    static_layer_from_descriptor_registry_required:
      true,

    static_execution_nature_from_contract_registry_required:
      true,

    static_method_from_contract_registry_required:
      true,

    static_input_contracts_from_contract_registry_required:
      true,

    static_output_contract_from_contract_registry_required:
      true,

    explicit_module_identity_required:
      true,

    explicit_dynamic_policy_provenance_required_when_declared:
      true,

    module_identity_inference_allowed:
      false,

    module_path_as_module_name_allowed:
      false,

    producer_function_as_method_allowed:
      false,

    analytical_method_as_execution_method_allowed:
      false,

    execution_nature_inference_allowed:
      false,

    input_contract_inference_allowed:
      false,

    output_contract_inference_allowed:
      false,

    policy_resolution_allowed:
      false,

    provider_resolution_allowed:
      false,

    missing_data_reconstruction_allowed:
      false,

    degradation_reason_to_missing_data_conversion_allowed:
      false,

    confidence_reconstruction_allowed:
      false,

    analytical_confidence_to_execution_confidence_allowed:
      false,

    duration_calculation_allowed:
      false,

    runtime_clock_access_allowed:
      false,

    producer_execution_allowed:
      false,

    producer_wrapping_allowed:
      false,

    producer_substitution_allowed:
      false,

    trace_collection_allowed:
      false,

    variable_lineage_generation_allowed:
      false,

    provider_identity_parameter_invention_allowed:
      false,

    observation_identity_parameter_invention_allowed:
      false,

    unavailable_to_zero_allowed:
      false,

    unavailable_to_neutral_allowed:
      false,

    persistence_allowed:
      false,

    logging_allowed:
      false,

    network_access_allowed:
      false,

    prohibited_shortcuts:
      Object.freeze([
        "observation_from_private_snapshot",
        "observation_from_final_runtime_state",

        "module_name_from_module_path",
        "module_version_from_current_source",
        "method_from_function_name",
        "execution_nature_from_pipeline_layer",

        "trace_input_contract_from_runtime_reflection",
        "trace_output_contract_from_output_shape",

        "current_policy_as_executed_policy",
        "missing_policy_version_fallback",

        "degradation_reasons_as_missing_data",
        "analytical_confidence_as_execution_confidence",

        "provider_identity_encoded_without_contract",
        "observation_identity_encoded_without_contract",

        "duration_from_runtime_clock",

        "observation_boundary_executed_producer",
        "observation_boundary_wrapped_producer",

        "observation_boundary_generated_trace_id",
        "observation_boundary_generated_variable_lineage",

        "unavailable_to_zero",
        "unavailable_to_neutral",

        "observation_boundary_persistence",
        "observation_boundary_logging",
        "observation_boundary_network_access",
      ] as const),
  } as const);
