/* ============================================================================
 * FILE:
 * lib/xyvala/search/governance/
 * search-producer-execution-observation-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical producer execution observation core
 *
 * ROLE
 * - materialize explicit dynamic producer-execution observations
 * - enforce canonical execution-observation provenance contracts
 * - preserve actual producer module identity
 * - preserve actual resolved policy provenance
 * - preserve explicit invocation parameters
 * - preserve explicit invocation missing-data truth
 * - select only the authorized execution validation source
 * - materialize canonical execution-confidence unavailability
 * - preserve optional corpus and duration observations
 * - produce SearchRuntimeExecutionObservedFacts only
 *
 * CLASSIFICATION
 * - SEARCH GOVERNANCE
 * - PRODUCER EXECUTION OBSERVATION
 * - OBSERVE
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
 * actual producer invocation boundary
 *              ↓
 * explicitly observed dynamic facts
 *              ↓
 * Producer Execution Observation Contract Registry
 *              ↓
 * THIS MODULE
 *              ↓
 * SearchRuntimeExecutionObservedFacts
 *              ↓
 * Runtime Execution Observation Core
 *              ↓
 * SearchExecutionTraceObservationInput
 *              ↓
 * Execution Traceability Core
 *              ↓
 * SearchTraceRecord
 *
 * OWNERSHIP
 * ----------------------------------------------------------------------------
 *
 * This module owns:
 * - dynamic execution-observation materialization;
 * - enforcement of observation provenance rules;
 * - producer-specific observation mapping when explicitly defined here.
 *
 * This module does NOT own:
 * - SearchTraceRecord;
 * - SearchTraceId;
 * - SearchVariableLineage;
 * - producer analytical outputs;
 * - analytical confidence;
 * - analytical policy;
 * - producer execution;
 * - producer binding;
 * - runtime orchestration.
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * Every execution observation must already be authorized by:
 *
 * search-producer-execution-observation-contract-registry.ts
 *
 * This module never invents provenance rules locally.
 *
 * PARAMETERS
 * ----------------------------------------------------------------------------
 * parameters are explicit invocation-level execution observations.
 *
 * They MUST NOT be:
 * - reconstructed from downstream output;
 * - selected from SearchSubScore;
 * - merged across SearchSubScore objects;
 * - reconstructed from current configuration;
 * - replaced by {} merely because no value was observed.
 *
 * An explicitly observed empty parameter record remains valid.
 *
 * MISSING DATA
 * ----------------------------------------------------------------------------
 * missing_data is explicit invocation-level missing-data truth.
 *
 * It MUST NOT be:
 * - degradation_reasons;
 * - rejection_reasons;
 * - a union of analytical subscore missing_data;
 * - inferred from output availability;
 * - replaced by [] merely because execution succeeded.
 *
 * An explicitly observed empty missing-data collection remains valid.
 *
 * VALIDATION
 * ----------------------------------------------------------------------------
 * Validation provenance is governed port-by-port by the canonical observation
 * contract.
 *
 * CANONICAL_OUTPUT_VALIDATION_STATE
 * - canonical_output_validation_state is mandatory;
 * - explicit_execution_validation_state is forbidden.
 *
 * CANONICAL_AVAILABLE_OUTPUT_OR_EXPLICIT_EXECUTION_BOUNDARY
 * - exactly one source must exist.
 *
 * EXPLICIT_EXECUTION_BOUNDARY_REQUIRED
 * - explicit_execution_validation_state is mandatory;
 * - canonical_output_validation_state is forbidden.
 *
 * No default execution validation state exists.
 *
 * CONFIDENCE
 * ----------------------------------------------------------------------------
 * Current Search producer contracts do not expose one canonical invocation-
 * level execution confidence.
 *
 * Consequently, execution confidence remains explicitly UNAVAILABLE when and
 * only when the canonical observation registry declares:
 *
 * NOT_PRODUCED_BY_CURRENT_PRODUCER_CONTRACT
 *
 * Analytical confidence MUST NEVER be substituted.
 *
 * POLICY
 * ----------------------------------------------------------------------------
 * policy_version is the exact version of the policy actually used by the
 * invocation.
 *
 * No:
 * - default-policy reconstruction;
 * - latest-policy lookup;
 * - later configuration lookup;
 * - output-based policy inference.
 *
 * MODULE IDENTITY
 * ----------------------------------------------------------------------------
 * Producer module identity must originate from the actual canonical producer
 * or an explicitly authorized provider.
 *
 * It is never inferred from:
 * - runtime port name;
 * - module path metadata;
 * - function name metadata;
 * - current source code.
 *
 * DURATION
 * ----------------------------------------------------------------------------
 * duration_ms is transported only when explicitly observed by an authorized
 * execution timing boundary.
 *
 * This module never accesses a clock.
 *
 * DIRECTIVES
 * - Contract Before Runtime
 * - First Divergence Before Correction
 * - one truth = one canonical owner
 * - explicit facts only
 * - no analytical reconstruction
 * - no downstream repair
 * - no producer execution
 * - no producer wrapper
 * - no policy fallback
 * - no module inference
 * - no confidence inference
 * - no missing-data inference
 * - no validation fallback
 * - no trace generation
 * - no trace identity generation
 * - no variable-lineage generation
 * - no persistence
 * - no logging
 * - no network access
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * missing parameters observation
 * => producer execution observation boundary
 *
 * missing missing_data observation
 * => producer execution observation boundary
 *
 * missing required policy_version
 * => resolved-policy boundary
 *
 * missing canonical validation
 * => canonical producer output boundary
 *
 * missing explicit execution validation
 * => execution observation boundary
 *
 * conflicting validation sources
 * => execution provenance boundary
 *
 * degradation_reasons used as missing_data
 * => upstream semantic reconstruction violation
 *
 * analytical confidence used as execution confidence
 * => confidence ownership violation
 *
 * reconstructed module identity
 * => producer provenance violation
 *
 * INVARIANTS
 * - only current-snapshot traceable producer ports enter this module
 * - observation provenance contract is authoritative
 * - no unavailable truth becomes zero or neutral
 * - no dynamic observation is reconstructed downstream
 * - no SearchTraceRecord is produced here
 * - no SearchVariableLineage is produced here
 * ========================================================================== */

import type {
  SearchAnchorSignals,
  SearchConfidenceScore,
  SearchModuleVersion,
  SearchOptionalEvidence,
  SearchPolicyVersion,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";

import type {
  SearchAnchorDetectionPolicy,
  SearchAnchorSignalsInput,
} from "../signals/search-anchor-signals-core";

import {
  XYVALA_SEARCH_ANCHOR_SIGNALS_MODULE_NAME,
  XYVALA_SEARCH_ANCHOR_SIGNALS_MODULE_VERSION,
} from "../signals/search-anchor-signals-core";

import type {
  SearchRuntimeExecutionObservedFacts,
} from "./search-runtime-execution-observation-core";

import {
  getSearchProducerExecutionObservationContract,
} from "./search-producer-execution-observation-contract-registry";

import type {
  SearchProducerExecutionObservationValidationSource,
} from "./search-producer-execution-observation-contract-registry";

import type {
  SearchProducerExecutionTraceablePortName,
} from "./search-producer-execution-contract-registry";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME =
  "xyvala-search-producer-execution-observation-core" as const;

export const XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_VERSION =
  "1.1.0" satisfies SearchModuleVersion;

/* ============================================================================
 * 2. GENERIC EXPLICIT EXECUTION OBSERVATION INPUT
 * ----------------------------------------------------------------------------
 * This is an execution-observation transport contract.
 *
 * Required dynamic facts must already exist before entering this function.
 *
 * This input is NOT:
 * - a second analytical producer contract;
 * - a trace contract;
 * - a reconstruction schema.
 * ========================================================================== */

export interface SearchProducerExecutionObservationInput {
  readonly port_name:
    SearchProducerExecutionTraceablePortName;

  readonly created_at:
    SearchRuntimeExecutionObservedFacts["created_at"];

  readonly document_id?:
    SearchRuntimeExecutionObservedFacts["document_id"];

  readonly query_id?:
    SearchRuntimeExecutionObservedFacts["query_id"];

  readonly cohort_id?:
    SearchRuntimeExecutionObservedFacts["cohort_id"];

  readonly module_name:
    SearchRuntimeExecutionObservedFacts["module_name"];

  readonly module_version:
    SearchRuntimeExecutionObservedFacts["module_version"];

  /**
   * Explicit invocation-level execution parameters.
   *
   * {} is legal only when explicitly observed as the complete parameter truth.
   */
  readonly parameters:
    SearchRuntimeExecutionObservedFacts["parameters"];

  /**
   * Explicit invocation-level missing-data truth.
   *
   * [] is legal only when explicitly observed as the complete missing-data
   * truth for this invocation.
   */
  readonly missing_data:
    SearchRuntimeExecutionObservedFacts["missing_data"];

  readonly canonical_output_validation_state?:
    SearchValidationState;

  readonly explicit_execution_validation_state?:
    SearchValidationState;

  /**
   * Exact resolved policy version used by this invocation.
   */
  readonly policy_version?:
    SearchPolicyVersion;

  /**
   * Optional explicitly observed execution corpus provenance.
   */
  readonly corpus_version?:
    SearchRuntimeExecutionObservedFacts["corpus_version"];

  /**
   * Optional duration already produced by an authorized timing boundary.
   */
  readonly duration_ms?:
    SearchRuntimeExecutionObservedFacts["duration_ms"];
}

/* ============================================================================
 * 3. BASIC RECORD GUARD
 * ========================================================================== */

function isRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

/* ============================================================================
 * 4. NON-EMPTY STRING ASSERTION
 * ========================================================================== */

function assertNonEmptyString(
  value: string,
  fieldName: string,
): void {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        `Execution observation violation: ${fieldName} must be a non-empty string.`,
    );
  }
}

/* ============================================================================
 * 5. OPTIONAL NON-EMPTY STRING ASSERTION
 * ========================================================================== */

function assertOptionalNonEmptyString(
  value: string | undefined,
  fieldName: string,
): void {
  if (value === undefined) {
    return;
  }

  assertNonEmptyString(
    value,
    fieldName,
  );
}

/* ============================================================================
 * 6. EXPLICIT PARAMETERS ASSERTION
 * ----------------------------------------------------------------------------
 * Empty record is legal.
 * Missing observation is not.
 * ========================================================================== */

function assertExplicitParameters(
  value:
    SearchRuntimeExecutionObservedFacts["parameters"],
): void {
  if (!isRecord(value)) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        "Execution observation violation: parameters must be an explicitly observed record.",
    );
  }
}

/* ============================================================================
 * 7. EXPLICIT MISSING-DATA ASSERTION
 * ----------------------------------------------------------------------------
 * Empty collection is legal.
 * Missing observation is not.
 * ========================================================================== */

function assertExplicitMissingData(
  values:
    SearchRuntimeExecutionObservedFacts["missing_data"],
): void {
  if (!Array.isArray(values)) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        "Execution observation violation: missing_data must be an explicitly observed array.",
    );
  }

  for (
    let index = 0;
    index < values.length;
    index += 1
  ) {
    const value = values[index];

    if (value === undefined) {
      throw new Error(
        `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
          `Execution observation violation: missing_data[${String(index)}] is missing.`,
      );
    }

    assertNonEmptyString(
      value,
      `missing_data[${String(index)}]`,
    );
  }
}

/* ============================================================================
 * 8. OPTIONAL DURATION ASSERTION
 * ========================================================================== */

function assertOptionalDuration(
  value:
    SearchRuntimeExecutionObservedFacts["duration_ms"],
): void {
  if (value === undefined) {
    return;
  }

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        "Execution observation violation: duration_ms must be a finite non-negative explicitly observed duration.",
    );
  }
}

/* ============================================================================
 * 9. VALIDATION STATE PROVENANCE
 * ----------------------------------------------------------------------------
 * This function selects an already-existing validation truth.
 *
 * It never computes or repairs validation.
 * ========================================================================== */

function resolveSearchProducerExecutionValidationState(
  portName:
    SearchProducerExecutionTraceablePortName,

  source:
    SearchProducerExecutionObservationValidationSource,

  canonicalOutputValidationState:
    SearchValidationState | undefined,

  explicitExecutionValidationState:
    SearchValidationState | undefined,
): SearchValidationState {
  switch (source) {
    case "CANONICAL_OUTPUT_VALIDATION_STATE": {
      if (canonicalOutputValidationState === undefined) {
        throw new Error(
          `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
            `First divergence: ${portName} requires canonical output validation_state, but none was observed.`,
        );
      }

      if (explicitExecutionValidationState !== undefined) {
        throw new Error(
          `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
            `Execution provenance conflict: ${portName} supplied explicit execution validation although canonical output validation is the authorized source.`,
        );
      }

      return canonicalOutputValidationState;
    }

    case "CANONICAL_AVAILABLE_OUTPUT_OR_EXPLICIT_EXECUTION_BOUNDARY": {
      const hasCanonicalValidation =
        canonicalOutputValidationState !== undefined;

      const hasExplicitValidation =
        explicitExecutionValidationState !== undefined;

      if (
        hasCanonicalValidation ===
        hasExplicitValidation
      ) {
        throw new Error(
          `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
            `Execution provenance violation: ${portName} requires exactly one authorized validation source.`,
        );
      }

      if (canonicalOutputValidationState !== undefined) {
        return canonicalOutputValidationState;
      }

      if (explicitExecutionValidationState === undefined) {
        throw new Error(
          `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
            `Execution provenance violation: ${portName} has no authorized validation observation.`,
        );
      }

      return explicitExecutionValidationState;
    }

    case "EXPLICIT_EXECUTION_BOUNDARY_REQUIRED": {
      if (explicitExecutionValidationState === undefined) {
        throw new Error(
          `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
            `First divergence: ${portName} requires explicit execution-boundary validation_state, but none was observed.`,
        );
      }

      if (canonicalOutputValidationState !== undefined) {
        throw new Error(
          `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
            `Execution provenance conflict: ${portName} supplied canonical output validation although explicit execution-boundary validation is required.`,
        );
      }

      return explicitExecutionValidationState;
    }

    default: {
      const exhaustiveCheck: never = source;

      throw new Error(
        `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
          `Unsupported execution validation source: ${String(exhaustiveCheck)}.`,
      );
    }
  }
}

/* ============================================================================
 * 10. POLICY PROVENANCE
 * ----------------------------------------------------------------------------
 * Policy truth comes from the exact policy actually used.
 *
 * No default policy is resolved here.
 * ========================================================================== */

function validateSearchProducerExecutionPolicyProvenance(
  portName:
    SearchProducerExecutionTraceablePortName,

  policyVersion:
    SearchPolicyVersion | undefined,
): void {
  const observationContract =
    getSearchProducerExecutionObservationContract(
      portName,
    );

  if (observationContract.policy_version.required) {
    if (policyVersion === undefined) {
      throw new Error(
        `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
          `First divergence: ${portName} requires the exact policy_version used by the producer invocation.`,
      );
    }

    assertNonEmptyString(
      policyVersion,
      `${portName}.policy_version`,
    );

    return;
  }

  if (policyVersion !== undefined) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        `Policy provenance violation: ${portName} does not declare execution policy provenance, but policy_version was supplied.`,
    );
  }
}

/* ============================================================================
 * 11. CANONICAL EXECUTION CONFIDENCE UNAVAILABILITY
 * ----------------------------------------------------------------------------
 * Current producer execution contracts do not expose one canonical
 * invocation-level execution confidence.
 *
 * The registry, not this module, owns this unavailability rule.
 * ========================================================================== */

function buildSearchProducerExecutionUnavailableConfidence(
  portName:
    SearchProducerExecutionTraceablePortName,
): SearchOptionalEvidence<SearchConfidenceScore> {
  const observationContract =
    getSearchProducerExecutionObservationContract(
      portName,
    );

  if (
    observationContract.confidence.source !==
    "NOT_PRODUCED_BY_CURRENT_PRODUCER_CONTRACT"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        `Confidence provenance violation: ${portName} does not authorize current execution-confidence unavailability materialization.`,
    );
  }

  if (
    observationContract.confidence
      .canonical_availability_state !==
    "UNAVAILABLE"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        `Confidence availability violation: ${portName} must preserve execution confidence as UNAVAILABLE.`,
    );
  }

  return Object.freeze({
    availability_state: "UNAVAILABLE",

    reason:
      observationContract.confidence
        .canonical_unavailable_reason,
  });
}

/* ============================================================================
 * 12. GENERIC INPUT VALIDATION
 * ========================================================================== */

function validateSearchProducerExecutionObservationInput(
  input:
    SearchProducerExecutionObservationInput,
): void {
  assertNonEmptyString(
    input.port_name,
    "port_name",
  );

  assertNonEmptyString(
    input.created_at,
    `${input.port_name}.created_at`,
  );

  assertOptionalNonEmptyString(
    input.document_id,
    `${input.port_name}.document_id`,
  );

  assertOptionalNonEmptyString(
    input.query_id,
    `${input.port_name}.query_id`,
  );

  assertOptionalNonEmptyString(
    input.cohort_id,
    `${input.port_name}.cohort_id`,
  );

  assertNonEmptyString(
    input.module_name,
    `${input.port_name}.module_name`,
  );

  assertNonEmptyString(
    input.module_version,
    `${input.port_name}.module_version`,
  );

  assertExplicitParameters(
    input.parameters,
  );

  assertExplicitMissingData(
    input.missing_data,
  );

  assertOptionalNonEmptyString(
    input.corpus_version,
    `${input.port_name}.corpus_version`,
  );

  assertOptionalDuration(
    input.duration_ms,
  );

  validateSearchProducerExecutionPolicyProvenance(
    input.port_name,
    input.policy_version,
  );
}

/* ============================================================================
 * 13. GENERIC OBSERVED-FACT MATERIALIZATION
 * ----------------------------------------------------------------------------
 * Produces dynamic observed facts only.
 *
 * Static producer execution facts remain owned by:
 * - Runtime Execution Descriptor Registry
 * - Producer Execution Contract Registry
 *
 * SearchTraceRecord remains owned by:
 * - Execution Traceability Core
 * ========================================================================== */

export function buildSearchProducerExecutionObservedFacts(
  input:
    SearchProducerExecutionObservationInput,
): SearchRuntimeExecutionObservedFacts {
  validateSearchProducerExecutionObservationInput(
    input,
  );

  const observationContract =
    getSearchProducerExecutionObservationContract(
      input.port_name,
    );

  const validationState =
    resolveSearchProducerExecutionValidationState(
      input.port_name,

      observationContract.validation_state.source,

      input.canonical_output_validation_state,

      input.explicit_execution_validation_state,
    );

  const confidence =
    buildSearchProducerExecutionUnavailableConfidence(
      input.port_name,
    );

  const observedFacts = {
    created_at:
      input.created_at,

    ...(input.document_id !== undefined
      ? {
          document_id:
            input.document_id,
        }
      : {}),

    ...(input.query_id !== undefined
      ? {
          query_id:
            input.query_id,
        }
      : {}),

    ...(input.cohort_id !== undefined
      ? {
          cohort_id:
            input.cohort_id,
        }
      : {}),

    module_name:
      input.module_name,

    module_version:
      input.module_version,

    parameters:
      input.parameters,

    validation_state:
      validationState,

    missing_data:
      input.missing_data,

    confidence,

    ...(input.corpus_version !== undefined
      ? {
          corpus_version:
            input.corpus_version,
        }
      : {}),

    ...(input.policy_version !== undefined
      ? {
          policy_version:
            input.policy_version,
        }
      : {}),

    ...(input.duration_ms !== undefined
      ? {
          duration_ms:
            input.duration_ms,
        }
      : {}),
  } satisfies SearchRuntimeExecutionObservedFacts;

  return Object.freeze(
    observedFacts,
  );
}

/* ============================================================================
 * 14. STATIC VALIDATION SOURCE READER
 * ========================================================================== */

export function getSearchProducerExecutionRequiredValidationSource(
  portName:
    SearchProducerExecutionTraceablePortName,
): SearchProducerExecutionObservationValidationSource {
  return getSearchProducerExecutionObservationContract(
    portName,
  ).validation_state.source;
}

/* ============================================================================
 * 15. POLICY REQUIREMENT READER
 * ========================================================================== */

export function isSearchProducerExecutionPolicyVersionRequired(
  portName:
    SearchProducerExecutionTraceablePortName,
): boolean {
  return getSearchProducerExecutionObservationContract(
    portName,
  ).policy_version.required;
}

/* ============================================================================
 * 16. EXTERNAL PROVENANCE REQUIREMENT READER
 * ----------------------------------------------------------------------------
 * SearchTraceRecord currently has no dedicated external-provider identity
 * field.
 *
 * This reader exposes that limitation without smuggling provider identity into
 * parameters.
 * ========================================================================== */

export function getSearchProducerExecutionExternalProvenanceRequirements(
  portName:
    SearchProducerExecutionTraceablePortName,
): Readonly<{
  dynamic_observation_provenance_required: boolean;
  external_provider_identity_required: boolean;
  dedicated_trace_field_available: false;
}> {
  const externalProvenance =
    getSearchProducerExecutionObservationContract(
      portName,
    ).external_provenance;

  return Object.freeze({
    dynamic_observation_provenance_required:
      externalProvenance
        .dynamic_observation_provenance_required,

    external_provider_identity_required:
      externalProvenance
        .external_provider_identity_required,

    dedicated_trace_field_available:
      false,
  });
}

/* ============================================================================
 * 17. ANCHOR PRODUCER EXECUTION OBSERVATION INPUT
 * ----------------------------------------------------------------------------
 * Anchor is the first producer-specific golden pattern.
 *
 * This contract contains only facts present at the exact invocation boundary.
 *
 * No producer execution occurs here.
 * ========================================================================== */

export interface SearchAnchorProducerExecutionObservationInput {
  /**
   * Exact producer input supplied to buildSearchAnchorSignals().
   */
  readonly producer_input:
    SearchAnchorSignalsInput;

  /**
   * Exact policy resolved before invocation and transported in
   * producer_input.detection_policy.
   *
   * No defaulting occurs here.
   */
  readonly resolved_policy:
    SearchAnchorDetectionPolicy;

  /**
   * Exact canonical producer result.
   */
  readonly producer_output:
    SearchAnchorSignals;

  /**
   * Explicit invocation-level missing-data observation.
   *
   * [] is valid only if the execution boundary explicitly observed that no
   * required execution information was missing.
   */
  readonly missing_data:
    SearchRuntimeExecutionObservedFacts["missing_data"];
}

/* ============================================================================
 * 18. ANCHOR POLICY TRANSPORT VALIDATION
 * ----------------------------------------------------------------------------
 * We compare the exact policy semantics transported to the producer.
 *
 * No policy is looked up or defaulted here.
 * ========================================================================== */

function validateSearchAnchorExecutionPolicyTransport(
  input:
    SearchAnchorProducerExecutionObservationInput,
): void {
  const transportedPolicy =
    input.producer_input.detection_policy;

  if (transportedPolicy === undefined) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        "First divergence: detect_anchor_signals producer input does not contain the explicitly resolved Anchor policy.",
    );
  }

  if (
    transportedPolicy.policy_version !==
      input.resolved_policy.policy_version ||
    transportedPolicy.minimum_matched_term_count !==
      input.resolved_policy.minimum_matched_term_count ||
    transportedPolicy.minimum_convergent_term_count !==
      input.resolved_policy.minimum_convergent_term_count ||
    transportedPolicy.preserve_source_order !==
      input.resolved_policy.preserve_source_order
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        "First divergence: detect_anchor_signals transported policy differs from the exact resolved policy declared for the invocation.",
    );
  }
}

/* ============================================================================
 * 19. ANCHOR PRODUCER BOUNDARY VALIDATION
 * ----------------------------------------------------------------------------
 * This validates identity propagation only.
 *
 * It does not validate Anchor analytical semantics.
 * ========================================================================== */

function validateSearchAnchorExecutionBoundaryIdentity(
  input:
    SearchAnchorProducerExecutionObservationInput,
): void {
  const producerInput =
    input.producer_input;

  const producerOutput =
    input.producer_output;

  const documentId =
    producerInput.segmented_document.document_id;

  if (
    producerInput.lexical_document.document_id !==
      documentId ||
    producerInput.frequency_signals.document_id !==
      documentId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        "First divergence: detect_anchor_signals producer inputs do not share one canonical document_id.",
    );
  }

  if (
    producerOutput.document_id !==
    documentId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        "First divergence: detect_anchor_signals output document_id differs from the exact producer input document_id.",
    );
  }

  if (
    producerOutput.created_at !==
    producerInput.created_at
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        "First divergence: detect_anchor_signals output created_at differs from the exact producer input created_at.",
    );
  }

  assertNonEmptyString(
    producerOutput.detector_module_version,
    "detect_anchor_signals.producer_output.detector_module_version",
  );

  if (
    producerInput.detector_module_version !== undefined &&
    producerOutput.detector_module_version !==
      producerInput.detector_module_version
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        "First divergence: detect_anchor_signals output module version differs from the explicit producer input module version.",
    );
  }

  if (
    producerInput.detector_module_version === undefined &&
    producerOutput.detector_module_version !==
      XYVALA_SEARCH_ANCHOR_SIGNALS_MODULE_VERSION
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_MODULE_NAME}] ` +
        "First divergence: detect_anchor_signals output module version differs from the canonical producer module version.",
    );
  }
}

/* ============================================================================
 * 20. ANCHOR EXECUTION PARAMETERS
 * ----------------------------------------------------------------------------
 * These parameters are observed directly from the exact resolved policy used
 * for the invocation.
 *
 * policy_version remains outside parameters because SearchTraceRecord already
 * owns a dedicated policy_version field.
 *
 * No analytical output is read to build these parameters.
 * ========================================================================== */

function buildSearchAnchorExecutionParameters(
  policy:
    SearchAnchorDetectionPolicy,
): SearchRuntimeExecutionObservedFacts["parameters"] {
  return Object.freeze({
    minimum_matched_term_count:
      policy.minimum_matched_term_count,

    minimum_convergent_term_count:
      policy.minimum_convergent_term_count,

    preserve_source_order:
      policy.preserve_source_order,
  });
}

/* ============================================================================
 * 21. ANCHOR OBSERVED-FACT MATERIALIZATION
 * ----------------------------------------------------------------------------
 * Golden pattern:
 *
 * exact producer input
 * + exact resolved policy
 * + exact producer output
 * + explicit missing-data observation
 *               ↓
 * SearchRuntimeExecutionObservedFacts
 *
 * validation_state
 * - comes directly from SearchAnchorSignals.validation_state
 *
 * module_name
 * - comes from canonical producer-owned module identity
 *
 * module_version
 * - comes from the exact producer output after propagation validation
 *
 * policy_version
 * - comes from the exact policy used
 *
 * missing_data
 * - remains explicit execution-boundary truth
 *
 * degradation_reasons are NEVER converted to missing_data.
 * ========================================================================== */

export function buildSearchAnchorProducerExecutionObservedFacts(
  input:
    SearchAnchorProducerExecutionObservationInput,
): SearchRuntimeExecutionObservedFacts {
  validateSearchAnchorExecutionPolicyTransport(
    input,
  );

  validateSearchAnchorExecutionBoundaryIdentity(
    input,
  );

  return buildSearchProducerExecutionObservedFacts({
    port_name:
      "detect_anchor_signals",

    created_at:
      input.producer_input.created_at,

    document_id:
      input.producer_input
        .segmented_document
        .document_id,

    module_name:
      XYVALA_SEARCH_ANCHOR_SIGNALS_MODULE_NAME,

    module_version:
      input.producer_output
        .detector_module_version,

    parameters:
      buildSearchAnchorExecutionParameters(
        input.resolved_policy,
      ),

    missing_data:
      input.missing_data,

    canonical_output_validation_state:
      input.producer_output.validation_state,

    policy_version:
      input.resolved_policy.policy_version,
  });
}

/* ============================================================================
 * 22. OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_OWNERSHIP =
  Object.freeze({
    canonical_owner:
      "SEARCH_PRODUCER_EXECUTION_OBSERVATION",

    observation_contract_owner:
      "SEARCH_PRODUCER_EXECUTION_OBSERVATION_GOVERNANCE",

    runtime_execution_observation_owner:
      "SEARCH_RUNTIME_EXECUTION_OBSERVATION",

    execution_trace_owner:
      "EXECUTION_TRACEABILITY",

    variable_lineage_owner:
      "VARIABLE_LINEAGE_GOVERNANCE",

    module_identity_owner:
      false,

    policy_owner:
      false,

    analytical_validation_owner:
      false,

    analytical_parameters_owner:
      false,

    analytical_missing_data_owner:
      false,

    analytical_confidence_owner:
      false,

    dynamic_observation_materialization_owner:
      true,

    trace_record_owner:
      false,

    trace_identity_owner:
      false,

    producer_execution_owner:
      false,

    producer_wrapping_owner:
      false,
  } as const);

/* ============================================================================
 * 23. GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_GOVERNANCE =
  Object.freeze({
    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    observe_only:
      true,

    deterministic:
      true,

    analytical_owner:
      false,

    canonical_trace_owner:
      false,

    lineage_owner:
      false,

    explicit_parameters_required:
      true,

    empty_parameters_fallback_allowed:
      false,

    explicitly_observed_empty_parameters_allowed:
      true,

    subscore_parameters_reuse_allowed:
      false,

    merged_subscore_parameters_allowed:
      false,

    current_policy_parameter_reconstruction_allowed:
      false,

    explicit_missing_data_required:
      true,

    empty_missing_data_fallback_allowed:
      false,

    explicitly_observed_empty_missing_data_allowed:
      true,

    degradation_reasons_as_missing_data_allowed:
      false,

    rejection_reasons_as_missing_data_allowed:
      false,

    subscore_missing_data_union_allowed:
      false,

    validation_source_contract_required:
      true,

    validation_default_allowed:
      false,

    multiple_validation_sources_allowed:
      false,

    required_policy_provenance_enforced:
      true,

    policy_lookup_allowed:
      false,

    policy_fallback_allowed:
      false,

    module_identity_explicit:
      true,

    module_identity_inference_allowed:
      false,

    module_path_as_module_identity_allowed:
      false,

    producer_function_as_module_identity_allowed:
      false,

    execution_confidence_produced_here:
      false,

    execution_confidence_unavailability_materialized_here:
      true,

    analytical_confidence_as_execution_confidence_allowed:
      false,

    subscore_confidence_as_execution_confidence_allowed:
      false,

    signal_confidence_as_execution_confidence_allowed:
      false,

    aggregate_confidence_as_execution_confidence_allowed:
      false,

    decision_confidence_as_execution_confidence_allowed:
      false,

    unavailable_confidence_to_zero_allowed:
      false,

    corpus_lookup_allowed:
      false,

    corpus_late_resolution_allowed:
      false,

    duration_measurement_allowed:
      false,

    runtime_clock_access_allowed:
      false,

    producer_execution_allowed:
      false,

    producer_wrapping_allowed:
      false,

    producer_substitution_allowed:
      false,

    trace_generation_allowed:
      false,

    trace_identity_generation_allowed:
      false,

    lineage_generation_allowed:
      false,

    provider_identity_parameter_smuggling_allowed:
      false,

    observation_identity_parameter_smuggling_allowed:
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

    anchor_degradation_reasons_as_missing_data_allowed:
      false,

    anchor_default_policy_resolution_allowed:
      false,

    anchor_policy_output_reconstruction_allowed:
      false,

    anchor_module_identity_reconstruction_allowed:
      false,

    anchor_document_identity_reconstruction_allowed:
      false,

    anchor_execution_parameters_from_output_allowed:
      false,

    prohibited_shortcuts:
      Object.freeze([
        "parameters_from_analytical_output",
        "parameters_from_subscore",
        "merged_subscore_parameters",
        "empty_parameters_as_fallback",

        "missing_data_from_degradation_reasons",
        "missing_data_from_rejection_reasons",
        "missing_data_from_subscore_union",
        "missing_data_from_unavailable_output",
        "empty_missing_data_as_fallback",

        "default_valid_execution",
        "default_degraded_execution",
        "default_rejected_execution",
        "default_unvalidated_execution",

        "canonical_validation_and_explicit_validation_combined",
        "availability_reason_as_validation_state",

        "policy_version_from_current_policy",
        "default_policy_as_execution_policy",

        "module_name_from_module_path",
        "module_name_from_runtime_port",
        "module_version_from_current_source",

        "subscore_confidence_as_execution_confidence",
        "link_signal_confidence_as_execution_confidence",
        "temporal_confidence_as_execution_confidence",
        "behavioral_sample_confidence_as_execution_confidence",
        "aggregate_confidence_as_execution_confidence",
        "decision_confidence_as_execution_confidence",
        "execution_confidence_zero_fallback",

        "current_corpus_as_execution_corpus",
        "duration_from_runtime_clock",
        "duration_from_later_clock",

        "provider_identity_encoded_in_parameters",
        "observation_identity_encoded_in_parameters",

        "anchor_default_policy_used_by_observer",
        "anchor_degradation_reasons_as_missing_data",
        "anchor_validation_reconstructed_from_degradation",
        "anchor_module_name_from_path",
        "anchor_module_version_from_current_source_without_propagation_check",

        "observation_core_executed_producer",
        "observation_core_wrapped_producer",
        "observation_core_generated_trace",
        "observation_core_generated_trace_id",
        "observation_core_generated_variable_lineage",

        "unavailable_to_zero",
        "unavailable_to_neutral",

        "observation_core_persistence",
        "observation_core_logging",
        "observation_core_network_access",
      ] as const),
  } as const);

/* ============================================================================
 * 24. STATUS
 * ----------------------------------------------------------------------------
 * Generic dynamic observation materialization is available.
 *
 * Anchor producer-specific observation semantics are also available.
 *
 * Runtime instrumentation is intentionally still incomplete.
 * ========================================================================== */

export const XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_STATUS =
  Object.freeze({
    observation_contract_available:
      true,

    generic_observation_materializer_available:
      true,

    anchor_observation_materializer_available:
      true,

    anchor_runtime_instrumentation_complete:
      false,

    runtime_adapter_instrumentation_complete:
      false,

    direct_port_instrumentation_complete:
      false,

    ordered_runtime_trace_collection_complete:
      false,

    snapshot_trace_transport_complete:
      false,

    safe_to_reconstruct_missing_observations:
      false,
  } as const);
