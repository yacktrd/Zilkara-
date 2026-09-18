/* ============================================================================
 * FILE:
 * lib/xyvala/search/governance/
 * search-producer-execution-observation-contract-registry.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical producer execution observation contract registry
 *
 * ROLE
 * - govern the provenance of dynamic execution-observation facts
 * - define where each SearchTraceRecord dynamic fact is allowed to originate
 * - distinguish producer output truth from execution observation truth
 * - distinguish analytical confidence from execution confidence
 * - distinguish degradation reasons from execution missing-data truth
 * - preserve policy provenance at the actual execution boundary
 * - preserve module identity provenance without duplicating module identity
 * - prevent downstream reconstruction before runtime trace instrumentation
 *
 * CLASSIFICATION
 * - SEARCH GOVERNANCE
 * - EXECUTION OBSERVATION GOVERNANCE
 * - CONTRACT REGISTRY
 * - CONTRACT BEFORE RUNTIME
 * - STATIC
 * - DETERMINISTIC
 * - NON-ANALYTICAL
 * - NON-COMPUTE
 * - NON-OBSERVE
 * - NON-MUTATE
 * - NON-TRACE-PRODUCING
 * - NON-LINEAGE-PRODUCING
 * - PRIVATE
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * Search Runtime Execution Descriptor Registry
 *                  +
 * Search Producer Execution Contract Registry
 *                  ↓
 * THIS REGISTRY
 *                  ↓
 * authorized provenance of dynamic execution facts
 *                  ↓
 * actual execution-boundary observation
 *                  ↓
 * Search Runtime Execution Observation Core
 *                  ↓
 * Search Execution Traceability Core
 *                  ↓
 * SearchTraceRecord
 *
 * PURPOSE
 * ----------------------------------------------------------------------------
 * SearchTraceRecord requires dynamic facts including:
 *
 * - created_at
 * - optional document_id / query_id / cohort_id
 * - module_name
 * - module_version
 * - parameters
 * - validation_state
 * - missing_data
 * - confidence
 * - optional corpus_version
 * - optional policy_version
 * - optional duration_ms
 *
 * Not every canonical Search producer exposes all of those facts directly in
 * its analytical output.
 *
 * This registry therefore answers:
 *
 * "Where is each dynamic trace fact legally allowed to originate?"
 *
 * It does NOT answer:
 *
 * "What value should we invent when no value exists?"
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * Runtime instrumentation MUST NOT begin before the observation provenance of
 * every required trace field is governed.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * missing module identity
 * => producer/provider execution boundary
 *
 * missing required policy_version
 * => resolved-policy execution boundary
 *
 * missing execution parameters
 * => explicit execution observation boundary
 *
 * missing execution missing_data
 * => explicit execution observation boundary
 *
 * degradation_reasons reused as missing_data
 * => semantic reconstruction violation
 *
 * SearchSubScore.confidence reused as execution confidence
 * => confidence ownership violation
 *
 * aggregate_confidence reused as execution confidence
 * => confidence ownership violation
 *
 * decision_confidence reused as execution confidence
 * => confidence ownership violation
 *
 * output validation_state reused where no invocation-level validation contract
 * exists
 * => validation provenance violation
 *
 * current policy read after execution
 * => policy provenance violation
 *
 * provider identity encoded inside parameters because no canonical trace field
 * exists
 * => contract-extension violation
 *
 * CONFIDENCE SEMANTICS
 * ----------------------------------------------------------------------------
 * Current canonical Search producer contracts do not expose a dedicated
 * invocation-level "execution confidence" truth.
 *
 * Existing confidence values belong to analytical realities such as:
 *
 * - SearchSubScore.confidence
 * - SearchLinkSignals.link_signal_confidence
 * - SearchTemporalSignals.temporal_confidence
 * - SearchBehavioralSignals.sample_confidence
 * - SearchGlobalScore.aggregate_confidence
 * - SearchPrivateDecision.decision_confidence
 *
 * Those values MUST NOT be reused as SearchTraceRecord.confidence.
 *
 * Therefore, for the current Search runtime producer domain:
 *
 * execution confidence
 * = NOT PRODUCED BY CURRENT PRODUCER CONTRACT
 *
 * The canonical SearchTraceRecord representation remains:
 *
 * SearchOptionalEvidence<SearchConfidenceScore>
 *
 * Runtime observation may materialize explicit UNAVAILABLE evidence only from
 * this contractually declared absence.
 *
 * It is not a fallback.
 *
 * PARAMETERS SEMANTICS
 * ----------------------------------------------------------------------------
 * SearchTraceRecord.parameters is an invocation-level execution observation.
 *
 * Existing SearchSubScore.parameters belongs to analytical sub-score truth.
 *
 * Therefore it MUST NOT be:
 *
 * - selected from one sub-score;
 * - merged across sub-scores;
 * - copied automatically from analytical output;
 * - reconstructed from current policy state.
 *
 * parameters must be explicitly observed at the actual producer invocation
 * boundary according to a producer-specific observation implementation.
 *
 * Empty {} is NOT a fallback.
 *
 * MISSING-DATA SEMANTICS
 * ----------------------------------------------------------------------------
 * SearchTraceRecord.missing_data is execution-observation truth.
 *
 * It is NOT:
 *
 * - degradation_reasons;
 * - rejection_reasons;
 * - unavailable downstream evidence;
 * - union of SearchSubScore.missing_data;
 * - inferred absence of output fields.
 *
 * It must be explicitly observed at the execution boundary.
 *
 * Empty [] is NOT a fallback.
 *
 * VALIDATION SEMANTICS
 * ----------------------------------------------------------------------------
 * Some canonical producer outputs expose a direct top-level validation_state.
 *
 * Those outputs may be used as the canonical source of execution observation
 * validation only where this registry explicitly authorizes it.
 *
 * Other producer boundaries do NOT expose an invocation-level validation
 * state.
 *
 * Those boundaries require explicit execution observation.
 *
 * No "VALID" default is authorized.
 * No "UNVALIDATED" default is authorized.
 *
 * OPTIONAL-EVIDENCE OUTPUTS
 * ----------------------------------------------------------------------------
 * Some producers return Optional Evidence envelopes.
 *
 * When AVAILABLE:
 * - a canonical payload may expose validation_state.
 *
 * When non-AVAILABLE:
 * - no downstream layer may fabricate an invocation validation state from the
 *   availability reason.
 *
 * Such ports therefore use:
 *
 * CANONICAL_AVAILABLE_OUTPUT_OR_EXPLICIT_EXECUTION_BOUNDARY
 *
 * POLICY VERSION
 * ----------------------------------------------------------------------------
 * Policy provenance is governed by the Runtime Execution Descriptor Registry.
 *
 * When:
 *
 * requires_dynamic_policy_provenance === true
 *
 * policy_version must come from the exact resolved policy object actually
 * passed to the canonical producer.
 *
 * No later policy lookup is permitted.
 *
 * MODULE IDENTITY
 * ----------------------------------------------------------------------------
 * Module identity ownership remains outside this registry.
 *
 * This registry references:
 *
 * Search Runtime Execution Descriptor Registry.module_identity_source
 *
 * It does NOT duplicate:
 *
 * - module names;
 * - module versions;
 * - module paths;
 * - producer function names.
 *
 * Actual module_name / module_version values must be observed from the
 * canonical producer/provider identity actually executed.
 *
 * PROVIDER / OBSERVATION PROVENANCE
 * ----------------------------------------------------------------------------
 * Runtime descriptors may require:
 *
 * - dynamic observation provenance;
 * - external provider identity.
 *
 * SearchTraceRecord currently exposes no dedicated provider identity field.
 *
 * Therefore:
 *
 * - provider identity MUST NOT be encoded silently into parameters;
 * - observation identity MUST NOT be encoded silently into parameters;
 * - no new trace field is invented here.
 *
 * A future trace-contract extension must occur before such provenance receives
 * a dedicated SearchTraceRecord field.
 *
 * DURATION
 * ----------------------------------------------------------------------------
 * duration_ms is optional.
 *
 * It may be transported only when explicitly observed by an authorized
 * execution timing boundary.
 *
 * This registry does NOT authorize:
 *
 * - Date.now()
 * - new Date()
 * - later clock reads
 * - duration reconstruction
 *
 * DIRECTIVES
 * - Contract Before Runtime
 * - First Divergence Before Correction
 * - one canonical provenance rule per trace fact
 * - exact current-snapshot traceable-port coverage
 * - no output-shape inference
 * - no downstream reconstruction
 * - no policy fallback
 * - no module identity duplication
 * - no analytical confidence reuse
 * - no degradation-reasons-to-missing-data conversion
 * - no empty parameters fallback
 * - no empty missing-data fallback
 * - no validation fallback
 * - no provider identity parameter smuggling
 * - no observation identity parameter smuggling
 * - no runtime execution
 * - no producer wrapping
 * - no trace generation
 * - no lineage generation
 * - no persistence
 * - no logging
 * - no network access
 *
 * INVARIANTS
 * - every current-snapshot-traceable producer has exactly one observation
 *   contract
 * - no post-snapshot producer enters this registry
 * - no transverse identity boundary enters this registry
 * - module identity source remains descriptor-owned
 * - policy provenance requirement remains descriptor-owned
 * - parameters always require explicit execution observation
 * - missing_data always requires explicit execution observation
 * - analytical confidence never becomes execution confidence
 * - no optional evidence becomes a value through fallback
 * - no producer executes during registry access
 * ========================================================================== */

import type {
  SearchModuleVersion,
} from "../contracts/search-pipeline-contract";

import {
  XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY,
  getSearchRuntimeExecutionDescriptor,
  validateSearchRuntimeExecutionDescriptorRegistry,
} from "./search-runtime-execution-descriptor-registry";

import {
  getSearchProducerExecutionContract,
  isSearchProducerExecutionTraceablePort,
  validateSearchProducerExecutionContractRegistry,
} from "./search-producer-execution-contract-registry";

import type {
  SearchProducerExecutionTraceablePortName,
} from "./search-producer-execution-contract-registry";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY_MODULE_NAME =
  "xyvala-search-producer-execution-observation-contract-registry" as const;

export const XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

/* ============================================================================
 * 2. DESCRIPTOR REGISTRY TYPE
 * ========================================================================== */

type SearchRuntimeExecutionDescriptorRegistry =
  typeof XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY;

/* ============================================================================
 * 3. MODULE IDENTITY PROVENANCE
 * ----------------------------------------------------------------------------
 * Exact module identity source remains owned by the runtime execution
 * descriptor.
 * ========================================================================== */

export type SearchProducerExecutionObservationModuleIdentitySource =
  SearchRuntimeExecutionDescriptorRegistry[
    SearchProducerExecutionTraceablePortName
  ]["module_identity_source"];

/* ============================================================================
 * 4. POLICY VERSION PROVENANCE
 * ========================================================================== */

export type SearchProducerExecutionObservationPolicyVersionSource =
  | "RESOLVED_POLICY_USED_BY_EXECUTION"
  | "NOT_APPLICABLE";

/* ============================================================================
 * 5. VALIDATION-STATE PROVENANCE
 * ========================================================================== */

export type SearchProducerExecutionObservationValidationSource =
  | "CANONICAL_OUTPUT_VALIDATION_STATE"
  | "CANONICAL_AVAILABLE_OUTPUT_OR_EXPLICIT_EXECUTION_BOUNDARY"
  | "EXPLICIT_EXECUTION_BOUNDARY_REQUIRED";

/* ============================================================================
 * 6. PARAMETERS PROVENANCE
 * ========================================================================== */

export type SearchProducerExecutionObservationParametersSource =
  "EXPLICIT_EXECUTION_BOUNDARY_REQUIRED";

/* ============================================================================
 * 7. MISSING-DATA PROVENANCE
 * ========================================================================== */

export type SearchProducerExecutionObservationMissingDataSource =
  "EXPLICIT_EXECUTION_BOUNDARY_REQUIRED";

/* ============================================================================
 * 8. EXECUTION CONFIDENCE PROVENANCE
 * ========================================================================== */

export type SearchProducerExecutionObservationConfidenceSource =
  "NOT_PRODUCED_BY_CURRENT_PRODUCER_CONTRACT";

export const XYVALA_SEARCH_EXECUTION_CONFIDENCE_UNAVAILABLE_REASON =
  "EXECUTION_CONFIDENCE_NOT_PRODUCED_BY_CURRENT_PRODUCER_CONTRACT" as const;

/* ============================================================================
 * 9. OPTIONAL CORPUS VERSION PROVENANCE
 * ========================================================================== */

export type SearchProducerExecutionObservationCorpusVersionSource =
  "EXPLICIT_EXECUTION_BOUNDARY_IF_OBSERVED";

/* ============================================================================
 * 10. OPTIONAL DURATION PROVENANCE
 * ========================================================================== */

export type SearchProducerExecutionObservationDurationSource =
  "EXPLICIT_AUTHORIZED_EXECUTION_TIMING_IF_OBSERVED";

/* ============================================================================
 * 11. SCOPE IDENTITY PROVENANCE
 * ========================================================================== */

export type SearchProducerExecutionObservationScopeIdentitySource =
  "EXPLICIT_EXECUTION_INPUT_IDENTITY";

/* ============================================================================
 * 12. MODULE IDENTITY OBSERVATION CONTRACT
 * ========================================================================== */

export interface SearchProducerExecutionModuleIdentityObservationContract {
  readonly source:
    SearchProducerExecutionObservationModuleIdentitySource;

  readonly explicit_module_name_required:
    true;

  readonly explicit_module_version_required:
    true;

  readonly module_path_inference_allowed:
    false;

  readonly producer_function_name_inference_allowed:
    false;

  readonly current_source_version_lookup_allowed:
    false;
}

/* ============================================================================
 * 13. POLICY VERSION OBSERVATION CONTRACT
 * ========================================================================== */

export interface SearchProducerExecutionPolicyVersionObservationContract {
  readonly source:
    SearchProducerExecutionObservationPolicyVersionSource;

  readonly required:
    boolean;

  readonly current_policy_lookup_allowed:
    false;

  readonly default_policy_fallback_allowed:
    false;

  readonly policy_version_inference_allowed:
    false;
}

/* ============================================================================
 * 14. VALIDATION OBSERVATION CONTRACT
 * ========================================================================== */

export interface SearchProducerExecutionValidationObservationContract {
  readonly source:
    SearchProducerExecutionObservationValidationSource;

  readonly canonical_output_field:
    "validation_state";

  readonly explicit_boundary_required_when_output_field_unavailable:
    boolean;

  readonly default_validation_state:
    null;

  readonly valid_fallback_allowed:
    false;

  readonly degraded_fallback_allowed:
    false;

  readonly rejected_fallback_allowed:
    false;

  readonly unvalidated_fallback_allowed:
    false;
}

/* ============================================================================
 * 15. PARAMETERS OBSERVATION CONTRACT
 * ========================================================================== */

export interface SearchProducerExecutionParametersObservationContract {
  readonly source:
    SearchProducerExecutionObservationParametersSource;

  readonly explicit_observation_required:
    true;

  readonly empty_record_fallback_allowed:
    false;

  readonly current_policy_reconstruction_allowed:
    false;

  readonly analytical_subscore_parameters_reuse_allowed:
    false;

  readonly downstream_output_reconstruction_allowed:
    false;
}

/* ============================================================================
 * 16. MISSING-DATA OBSERVATION CONTRACT
 * ========================================================================== */

export interface SearchProducerExecutionMissingDataObservationContract {
  readonly source:
    SearchProducerExecutionObservationMissingDataSource;

  readonly explicit_observation_required:
    true;

  readonly empty_array_fallback_allowed:
    false;

  readonly degradation_reasons_conversion_allowed:
    false;

  readonly rejection_reasons_conversion_allowed:
    false;

  readonly subscore_missing_data_union_allowed:
    false;

  readonly unavailable_output_inference_allowed:
    false;

  readonly downstream_reconstruction_allowed:
    false;
}

/* ============================================================================
 * 17. CONFIDENCE OBSERVATION CONTRACT
 * ========================================================================== */

export interface SearchProducerExecutionConfidenceObservationContract {
  readonly source:
    SearchProducerExecutionObservationConfidenceSource;

  readonly canonical_availability_state:
    "UNAVAILABLE";

  readonly canonical_unavailable_reason:
    typeof XYVALA_SEARCH_EXECUTION_CONFIDENCE_UNAVAILABLE_REASON;

  readonly analytical_confidence_reuse_allowed:
    false;

  readonly subscore_confidence_reuse_allowed:
    false;

  readonly signal_confidence_reuse_allowed:
    false;

  readonly aggregate_confidence_reuse_allowed:
    false;

  readonly decision_confidence_reuse_allowed:
    false;

  readonly zero_fallback_allowed:
    false;
}

/* ============================================================================
 * 18. CORPUS VERSION OBSERVATION CONTRACT
 * ========================================================================== */

export interface SearchProducerExecutionCorpusVersionObservationContract {
  readonly source:
    SearchProducerExecutionObservationCorpusVersionSource;

  readonly required:
    false;

  readonly current_corpus_lookup_allowed:
    false;

  readonly unavailable_evidence_value_extraction_allowed:
    false;

  readonly later_resolution_allowed:
    false;
}

/* ============================================================================
 * 19. DURATION OBSERVATION CONTRACT
 * ========================================================================== */

export interface SearchProducerExecutionDurationObservationContract {
  readonly source:
    SearchProducerExecutionObservationDurationSource;

  readonly required:
    false;

  readonly runtime_clock_read_allowed_here:
    false;

  readonly later_clock_reconstruction_allowed:
    false;

  readonly default_zero_allowed:
    false;
}

/* ============================================================================
 * 20. SCOPE IDENTITY OBSERVATION CONTRACT
 * ========================================================================== */

export interface SearchProducerExecutionScopeIdentityObservationContract {
  readonly source:
    SearchProducerExecutionObservationScopeIdentitySource;

  readonly document_id_optional:
    true;

  readonly query_id_optional:
    true;

  readonly cohort_id_optional:
    true;

  readonly downstream_identity_reconstruction_allowed:
    false;
}

/* ============================================================================
 * 21. PROVIDER / OBSERVATION PROVENANCE CONTRACT
 * ========================================================================== */

export interface SearchProducerExecutionExternalProvenanceObservationContract {
  readonly dynamic_observation_provenance_required:
    boolean;

  readonly external_provider_identity_required:
    boolean;

  /**
   * Current SearchTraceRecord exposes no dedicated canonical provider field.
   */
  readonly dedicated_trace_field_available:
    false;

  readonly provider_identity_in_parameters_allowed:
    false;

  readonly observation_identity_in_parameters_allowed:
    false;

  readonly fabricated_trace_field_allowed:
    false;
}

/* ============================================================================
 * 22. PRODUCER EXECUTION OBSERVATION CONTRACT
 * ========================================================================== */

export interface SearchProducerExecutionObservationContract<
  TPortName extends SearchProducerExecutionTraceablePortName =
    SearchProducerExecutionTraceablePortName,
> {
  readonly port_name:
    TPortName;

  readonly module_identity:
    SearchProducerExecutionModuleIdentityObservationContract;

  readonly policy_version:
    SearchProducerExecutionPolicyVersionObservationContract;

  readonly validation_state:
    SearchProducerExecutionValidationObservationContract;

  readonly parameters:
    SearchProducerExecutionParametersObservationContract;

  readonly missing_data:
    SearchProducerExecutionMissingDataObservationContract;

  readonly confidence:
    SearchProducerExecutionConfidenceObservationContract;

  readonly corpus_version:
    SearchProducerExecutionCorpusVersionObservationContract;

  readonly duration:
    SearchProducerExecutionDurationObservationContract;

  readonly scope_identity:
    SearchProducerExecutionScopeIdentityObservationContract;

  readonly external_provenance:
    SearchProducerExecutionExternalProvenanceObservationContract;
}

/* ============================================================================
 * 23. EXACT REGISTRY TYPE
 * ========================================================================== */

export type SearchProducerExecutionObservationContractRegistry =
  Readonly<{
    [TPortName in SearchProducerExecutionTraceablePortName]:
      SearchProducerExecutionObservationContract<TPortName>;
  }>;

/* ============================================================================
 * 24. STATIC SHARED CONTRACT FRAGMENTS
 * ========================================================================== */

const SEARCH_EXECUTION_PARAMETERS_OBSERVATION_CONTRACT =
  Object.freeze({
    source:
      "EXPLICIT_EXECUTION_BOUNDARY_REQUIRED",

    explicit_observation_required:
      true,

    empty_record_fallback_allowed:
      false,

    current_policy_reconstruction_allowed:
      false,

    analytical_subscore_parameters_reuse_allowed:
      false,

    downstream_output_reconstruction_allowed:
      false,
  } satisfies SearchProducerExecutionParametersObservationContract);

const SEARCH_EXECUTION_MISSING_DATA_OBSERVATION_CONTRACT =
  Object.freeze({
    source:
      "EXPLICIT_EXECUTION_BOUNDARY_REQUIRED",

    explicit_observation_required:
      true,

    empty_array_fallback_allowed:
      false,

    degradation_reasons_conversion_allowed:
      false,

    rejection_reasons_conversion_allowed:
      false,

    subscore_missing_data_union_allowed:
      false,

    unavailable_output_inference_allowed:
      false,

    downstream_reconstruction_allowed:
      false,
  } satisfies SearchProducerExecutionMissingDataObservationContract);

const SEARCH_EXECUTION_CONFIDENCE_OBSERVATION_CONTRACT =
  Object.freeze({
    source:
      "NOT_PRODUCED_BY_CURRENT_PRODUCER_CONTRACT",

    canonical_availability_state:
      "UNAVAILABLE",

    canonical_unavailable_reason:
      XYVALA_SEARCH_EXECUTION_CONFIDENCE_UNAVAILABLE_REASON,

    analytical_confidence_reuse_allowed:
      false,

    subscore_confidence_reuse_allowed:
      false,

    signal_confidence_reuse_allowed:
      false,

    aggregate_confidence_reuse_allowed:
      false,

    decision_confidence_reuse_allowed:
      false,

    zero_fallback_allowed:
      false,
  } satisfies SearchProducerExecutionConfidenceObservationContract);

const SEARCH_EXECUTION_CORPUS_VERSION_OBSERVATION_CONTRACT =
  Object.freeze({
    source:
      "EXPLICIT_EXECUTION_BOUNDARY_IF_OBSERVED",

    required:
      false,

    current_corpus_lookup_allowed:
      false,

    unavailable_evidence_value_extraction_allowed:
      false,

    later_resolution_allowed:
      false,
  } satisfies SearchProducerExecutionCorpusVersionObservationContract);

const SEARCH_EXECUTION_DURATION_OBSERVATION_CONTRACT =
  Object.freeze({
    source:
      "EXPLICIT_AUTHORIZED_EXECUTION_TIMING_IF_OBSERVED",

    required:
      false,

    runtime_clock_read_allowed_here:
      false,

    later_clock_reconstruction_allowed:
      false,

    default_zero_allowed:
      false,
  } satisfies SearchProducerExecutionDurationObservationContract);

const SEARCH_EXECUTION_SCOPE_IDENTITY_OBSERVATION_CONTRACT =
  Object.freeze({
    source:
      "EXPLICIT_EXECUTION_INPUT_IDENTITY",

    document_id_optional:
      true,

    query_id_optional:
      true,

    cohort_id_optional:
      true,

    downstream_identity_reconstruction_allowed:
      false,
  } satisfies SearchProducerExecutionScopeIdentityObservationContract);

/* ============================================================================
 * 25. VALIDATION SOURCE BUILDERS
 * ========================================================================== */

function buildCanonicalOutputValidationContract():
  SearchProducerExecutionValidationObservationContract {
  return Object.freeze({
    source:
      "CANONICAL_OUTPUT_VALIDATION_STATE",

    canonical_output_field:
      "validation_state",

    explicit_boundary_required_when_output_field_unavailable:
      false,

    default_validation_state:
      null,

    valid_fallback_allowed:
      false,

    degraded_fallback_allowed:
      false,

    rejected_fallback_allowed:
      false,

    unvalidated_fallback_allowed:
      false,
  });
}

function buildAvailableOutputOrExplicitValidationContract():
  SearchProducerExecutionValidationObservationContract {
  return Object.freeze({
    source:
      "CANONICAL_AVAILABLE_OUTPUT_OR_EXPLICIT_EXECUTION_BOUNDARY",

    canonical_output_field:
      "validation_state",

    explicit_boundary_required_when_output_field_unavailable:
      true,

    default_validation_state:
      null,

    valid_fallback_allowed:
      false,

    degraded_fallback_allowed:
      false,

    rejected_fallback_allowed:
      false,

    unvalidated_fallback_allowed:
      false,
  });
}

function buildExplicitExecutionValidationContract():
  SearchProducerExecutionValidationObservationContract {
  return Object.freeze({
    source:
      "EXPLICIT_EXECUTION_BOUNDARY_REQUIRED",

    canonical_output_field:
      "validation_state",

    explicit_boundary_required_when_output_field_unavailable:
      true,

    default_validation_state:
      null,

    valid_fallback_allowed:
      false,

    degraded_fallback_allowed:
      false,

    rejected_fallback_allowed:
      false,

    unvalidated_fallback_allowed:
      false,
  });
}

/* ============================================================================
 * 26. CONTRACT FACTORY
 * ----------------------------------------------------------------------------
 * Reads descriptor-owned governance facts.
 *
 * It does NOT duplicate them.
 * ========================================================================== */

function defineSearchProducerExecutionObservationContract<
  TPortName extends SearchProducerExecutionTraceablePortName,
>(
  portName:
    TPortName,

  validationState:
    SearchProducerExecutionValidationObservationContract,
): SearchProducerExecutionObservationContract<TPortName> {
  const descriptor =
    XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY[
      portName
    ];

  const policyVersionSource:
    SearchProducerExecutionObservationPolicyVersionSource =
      descriptor
        .requires_dynamic_policy_provenance
        ? "RESOLVED_POLICY_USED_BY_EXECUTION"
        : "NOT_APPLICABLE";

  return Object.freeze({
    port_name:
      portName,

    module_identity:
      Object.freeze({
        source:
          descriptor
            .module_identity_source,

        explicit_module_name_required:
          true,

        explicit_module_version_required:
          true,

        module_path_inference_allowed:
          false,

        producer_function_name_inference_allowed:
          false,

        current_source_version_lookup_allowed:
          false,
      }),

    policy_version:
      Object.freeze({
        source:
          policyVersionSource,

        required:
          descriptor
            .requires_dynamic_policy_provenance,

        current_policy_lookup_allowed:
          false,

        default_policy_fallback_allowed:
          false,

        policy_version_inference_allowed:
          false,
      }),

    validation_state:
      validationState,

    parameters:
      SEARCH_EXECUTION_PARAMETERS_OBSERVATION_CONTRACT,

    missing_data:
      SEARCH_EXECUTION_MISSING_DATA_OBSERVATION_CONTRACT,

    confidence:
      SEARCH_EXECUTION_CONFIDENCE_OBSERVATION_CONTRACT,

    corpus_version:
      SEARCH_EXECUTION_CORPUS_VERSION_OBSERVATION_CONTRACT,

    duration:
      SEARCH_EXECUTION_DURATION_OBSERVATION_CONTRACT,

    scope_identity:
      SEARCH_EXECUTION_SCOPE_IDENTITY_OBSERVATION_CONTRACT,

    external_provenance:
      Object.freeze({
        dynamic_observation_provenance_required:
          descriptor
            .requires_dynamic_observation_provenance,

        external_provider_identity_required:
          descriptor
            .requires_external_provider_identity,

        dedicated_trace_field_available:
          false,

        provider_identity_in_parameters_allowed:
          false,

        observation_identity_in_parameters_allowed:
          false,

        fabricated_trace_field_allowed:
          false,
      }),
  });
}

/* ============================================================================
 * 27. CANONICAL REGISTRY
 * ----------------------------------------------------------------------------
 * VALIDATION SOURCE CLASSIFICATION
 *
 * CANONICAL_OUTPUT_VALIDATION_STATE
 * - producer result exposes one direct top-level validation_state.
 *
 * CANONICAL_AVAILABLE_OUTPUT_OR_EXPLICIT_EXECUTION_BOUNDARY
 * - producer returns Optional Evidence;
 * - AVAILABLE payload exposes validation_state;
 * - non-AVAILABLE envelope does not authorize validation reconstruction.
 *
 * EXPLICIT_EXECUTION_BOUNDARY_REQUIRED
 * - no canonical invocation-level validation_state exists in the current
 *   producer output contract.
 * ========================================================================== */

export const XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY =
  Object.freeze({
    /* ------------------------------------------------------------------------
     * ACQUISITION
     *
     * One acquisition invocation may produce several SearchRawDocument
     * objects, each carrying its own validation_state.
     *
     * No aggregate invocation-level validation state may be reconstructed.
     * --------------------------------------------------------------------- */

    acquire_documents:
      defineSearchProducerExecutionObservationContract(
        "acquire_documents",
        buildExplicitExecutionValidationContract(),
      ),

    /* ------------------------------------------------------------------------
     * DIRECT DOCUMENT PIPELINE
     * --------------------------------------------------------------------- */

    extract_document:
      defineSearchProducerExecutionObservationContract(
        "extract_document",
        buildCanonicalOutputValidationContract(),
      ),

    segment_document:
      defineSearchProducerExecutionObservationContract(
        "segment_document",
        buildCanonicalOutputValidationContract(),
      ),

    analyze_lexical_document:
      defineSearchProducerExecutionObservationContract(
        "analyze_lexical_document",
        buildCanonicalOutputValidationContract(),
      ),

    detect_frequency_signals:
      defineSearchProducerExecutionObservationContract(
        "detect_frequency_signals",
        buildCanonicalOutputValidationContract(),
      ),

    /* ------------------------------------------------------------------------
     * SIGNAL / CONTEXT PIPELINE
     * --------------------------------------------------------------------- */

    detect_anchor_signals:
      defineSearchProducerExecutionObservationContract(
        "detect_anchor_signals",
        buildCanonicalOutputValidationContract(),
      ),

    aggregate_context:
      defineSearchProducerExecutionObservationContract(
        "aggregate_context",
        buildCanonicalOutputValidationContract(),
      ),

    detect_link_signals:
      defineSearchProducerExecutionObservationContract(
        "detect_link_signals",
        buildCanonicalOutputValidationContract(),
      ),

    detect_temporal_signals:
      defineSearchProducerExecutionObservationContract(
        "detect_temporal_signals",
        buildCanonicalOutputValidationContract(),
      ),

    detect_behavioral_signals:
      defineSearchProducerExecutionObservationContract(
        "detect_behavioral_signals",
        buildCanonicalOutputValidationContract(),
      ),

    /* ------------------------------------------------------------------------
     * QUERY
     * --------------------------------------------------------------------- */

    analyze_query:
      defineSearchProducerExecutionObservationContract(
        "analyze_query",
        buildCanonicalOutputValidationContract(),
      ),

    detect_query_document_signals:
      defineSearchProducerExecutionObservationContract(
        "detect_query_document_signals",
        buildCanonicalOutputValidationContract(),
      ),

    /* ------------------------------------------------------------------------
     * MANDATORY SCORE VECTORS
     * --------------------------------------------------------------------- */

    score_intrinsic_document:
      defineSearchProducerExecutionObservationContract(
        "score_intrinsic_document",
        buildCanonicalOutputValidationContract(),
      ),

    score_temporal_document:
      defineSearchProducerExecutionObservationContract(
        "score_temporal_document",
        buildCanonicalOutputValidationContract(),
      ),

    score_query_relevance:
      defineSearchProducerExecutionObservationContract(
        "score_query_relevance",
        buildCanonicalOutputValidationContract(),
      ),

    /* ------------------------------------------------------------------------
     * OPTIONAL SCORE VECTORS
     *
     * AVAILABLE payload contains validation_state.
     * Non-AVAILABLE evidence does not.
     * --------------------------------------------------------------------- */

    score_link_authority:
      defineSearchProducerExecutionObservationContract(
        "score_link_authority",
        buildAvailableOutputOrExplicitValidationContract(),
      ),

    score_behavioral_calibration:
      defineSearchProducerExecutionObservationContract(
        "score_behavioral_calibration",
        buildAvailableOutputOrExplicitValidationContract(),
      ),

    /* ------------------------------------------------------------------------
     * POSITIVE SCORE ASSEMBLY
     *
     * Canonical producer result exposes validation_state.
     * --------------------------------------------------------------------- */

    assemble_positive_score_vector:
      defineSearchProducerExecutionObservationContract(
        "assemble_positive_score_vector",
        buildCanonicalOutputValidationContract(),
      ),

    /* ------------------------------------------------------------------------
     * PENALTIES / AGGREGATION
     * --------------------------------------------------------------------- */

    evaluate_penalties:
      defineSearchProducerExecutionObservationContract(
        "evaluate_penalties",
        buildCanonicalOutputValidationContract(),
      ),

    aggregate_analytical_score:
      defineSearchProducerExecutionObservationContract(
        "aggregate_analytical_score",
        buildCanonicalOutputValidationContract(),
      ),

    /* ------------------------------------------------------------------------
     * ELIGIBILITY
     *
     * SearchEligibilityResult exposes no invocation validation_state.
     * --------------------------------------------------------------------- */

    evaluate_eligibility:
      defineSearchProducerExecutionObservationContract(
        "evaluate_eligibility",
        buildExplicitExecutionValidationContract(),
      ),

    /* ------------------------------------------------------------------------
     * COHORT NORMALIZATION
     *
     * SearchOptionalEvidence<SearchCohortDistribution>
     *
     * AVAILABLE SearchCohortDistribution exposes validation_state.
     * Non-AVAILABLE envelope does not authorize reconstruction.
     * --------------------------------------------------------------------- */

    normalize_cohort:
      defineSearchProducerExecutionObservationContract(
        "normalize_cohort",
        buildAvailableOutputOrExplicitValidationContract(),
      ),

    /* ------------------------------------------------------------------------
     * RELATIVE COHORT
     *
     * SearchRelativeEvaluationContext exposes no validation_state.
     * --------------------------------------------------------------------- */

    evaluate_relative_cohort:
      defineSearchProducerExecutionObservationContract(
        "evaluate_relative_cohort",
        buildExplicitExecutionValidationContract(),
      ),

    /* ------------------------------------------------------------------------
     * PRIVATE DECISION
     *
     * SearchPrivateDecision.decision_confidence is analytical decision truth.
     * It is NOT execution confidence.
     *
     * SearchPrivateDecision exposes no validation_state.
     * --------------------------------------------------------------------- */

    resolve_private_decision:
      defineSearchProducerExecutionObservationContract(
        "resolve_private_decision",
        buildExplicitExecutionValidationContract(),
      ),
  } satisfies SearchProducerExecutionObservationContractRegistry);

/* ============================================================================
 * 28. COMPILE-TIME EXACT COVERAGE
 * ========================================================================== */

type SearchProducerExecutionObservationDeclaredPortName =
  keyof typeof XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY;

type SearchProducerExecutionObservationMissingPort =
  Exclude<
    SearchProducerExecutionTraceablePortName,
    SearchProducerExecutionObservationDeclaredPortName
  >;

type SearchProducerExecutionObservationUnknownPort =
  Exclude<
    SearchProducerExecutionObservationDeclaredPortName,
    SearchProducerExecutionTraceablePortName
  >;

type SearchProducerExecutionObservationCoverageIsExact =
  [
    SearchProducerExecutionObservationMissingPort,
    SearchProducerExecutionObservationUnknownPort,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_COVERAGE_IS_EXACT:
  SearchProducerExecutionObservationCoverageIsExact =
    true;

void XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_COVERAGE_IS_EXACT;

/* ============================================================================
 * 29. BASIC ASSERTION
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
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
        `Observation contract violation: ${fieldName} must be a non-empty string.`,
    );
  }
}

/* ============================================================================
 * 30. INDIVIDUAL CONTRACT VALIDATION
 * ========================================================================== */

function validateSearchProducerExecutionObservationContract<
  TPortName extends SearchProducerExecutionTraceablePortName,
>(
  portName:
    TPortName,

  contract:
    SearchProducerExecutionObservationContract<TPortName>,
): void {
  if (
    contract.port_name !==
    portName
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
        `Observation contract violation: registry key ${String(portName)} does not match contract.port_name ${String(contract.port_name)}.`,
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
    executionContract.port_name ||
    descriptor.port_name !==
    contract.port_name
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
        `Execution governance violation: ${String(portName)} descriptor, execution contract and observation contract disagree on canonical port identity.`,
    );
  }

  if (
    descriptor
      .current_snapshot_trace_scope !==
    "CURRENT_PRIVATE_SNAPSHOT"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
        `Trace-causality violation: ${String(portName)} is outside current Private Snapshot trace scope.`,
    );
  }

  if (
    contract
      .module_identity
      .source !==
    descriptor
      .module_identity_source
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
        `Module provenance violation: ${String(portName)} observation contract diverges from runtime descriptor module identity source.`,
    );
  }

  const policyRequired =
    descriptor
      .requires_dynamic_policy_provenance;

  if (
    contract
      .policy_version
      .required !==
    policyRequired
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
        `Policy provenance violation: ${String(portName)} policy requirement diverges from runtime execution descriptor.`,
    );
  }

  const expectedPolicySource:
    SearchProducerExecutionObservationPolicyVersionSource =
      policyRequired
        ? "RESOLVED_POLICY_USED_BY_EXECUTION"
        : "NOT_APPLICABLE";

  if (
    contract
      .policy_version
      .source !==
    expectedPolicySource
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
        `Policy provenance violation: ${String(portName)} has an invalid policy observation source.`,
    );
  }

  if (
    contract
      .external_provenance
      .dynamic_observation_provenance_required !==
    descriptor
      .requires_dynamic_observation_provenance
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
        `Observation provenance violation: ${String(portName)} diverges from descriptor observation-provenance requirement.`,
    );
  }

  if (
    contract
      .external_provenance
      .external_provider_identity_required !==
    descriptor
      .requires_external_provider_identity
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
        `Provider provenance violation: ${String(portName)} diverges from descriptor provider-identity requirement.`,
    );
  }

  if (
    contract
      .parameters
      .source !==
    "EXPLICIT_EXECUTION_BOUNDARY_REQUIRED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
        `Parameter provenance violation: ${String(portName)} must require explicit execution-boundary parameters.`,
    );
  }

  if (
    contract
      .missing_data
      .source !==
    "EXPLICIT_EXECUTION_BOUNDARY_REQUIRED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
        `Missing-data provenance violation: ${String(portName)} must require explicit execution-boundary missing_data.`,
    );
  }

  if (
    contract
      .confidence
      .source !==
    "NOT_PRODUCED_BY_CURRENT_PRODUCER_CONTRACT"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
        `Confidence provenance violation: ${String(portName)} must preserve the absence of canonical invocation-level execution confidence.`,
    );
  }

  if (
    contract
      .confidence
      .canonical_availability_state !==
    "UNAVAILABLE"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
        `Confidence availability violation: ${String(portName)} must preserve execution confidence as explicitly UNAVAILABLE under the current producer contract.`,
    );
  }

  assertNonEmptyString(
    contract
      .confidence
      .canonical_unavailable_reason,
    `${String(portName)}.confidence.canonical_unavailable_reason`,
  );

  if (
    contract
      .validation_state
      .default_validation_state !==
    null
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
        `Validation provenance violation: ${String(portName)} must not define a validation fallback.`,
    );
  }
}

/* ============================================================================
 * 31. COMPLETE REGISTRY VALIDATION
 * ========================================================================== */

export function validateSearchProducerExecutionObservationContractRegistry():
  void {
  validateSearchRuntimeExecutionDescriptorRegistry();

  validateSearchProducerExecutionContractRegistry();

  const descriptorPortNames =
    Object.keys(
      XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY,
    ) as (
      keyof SearchRuntimeExecutionDescriptorRegistry
    )[];

  for (
    const portName of
    descriptorPortNames
  ) {
    const descriptor =
      XYVALA_SEARCH_RUNTIME_EXECUTION_DESCRIPTOR_REGISTRY[
        portName
      ];

    const shouldHaveObservationContract =
      descriptor
        .current_snapshot_trace_scope ===
      "CURRENT_PRIVATE_SNAPSHOT";

    const hasObservationContract =
      Object.prototype.hasOwnProperty.call(
        XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY,
        portName,
      );

    if (
      shouldHaveObservationContract !==
      hasObservationContract
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
          `Observation contract coverage violation: runtime port ${String(portName)} has inconsistent current Private Snapshot observation-contract membership.`,
      );
    }
  }

  const observationPortNames =
    Object.keys(
      XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY,
    ) as SearchProducerExecutionTraceablePortName[];

  for (
    const portName of
    observationPortNames
  ) {
    if (
      !isSearchProducerExecutionTraceablePort(
        portName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY_MODULE_NAME}] ` +
          `Observation contract scope violation: ${String(portName)} is not an authorized current-snapshot traceable producer.`,
      );
    }

    validateSearchProducerExecutionObservationContract(
      portName,
      XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY[
        portName
      ],
    );
  }
}

/* ============================================================================
 * 32. CANONICAL LOOKUP
 * ----------------------------------------------------------------------------
 * Return type derives directly from the canonical registry entry.
 *
 * No cast.
 * No widened correlation.
 * ========================================================================== */

export function getSearchProducerExecutionObservationContract<
  TPortName extends keyof
    typeof XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY,
>(
  portName:
    TPortName,
): (
  typeof XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY
)[TPortName] {
  validateSearchProducerExecutionObservationContractRegistry();

  return XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY[
    portName
  ];
}

/* ============================================================================
 * 33. CONTRACT MEMBERSHIP GUARD
 * ========================================================================== */

export function hasSearchProducerExecutionObservationContract(
  portName:
    keyof SearchRuntimeExecutionDescriptorRegistry,
): portName is SearchProducerExecutionTraceablePortName {
  return Object.prototype.hasOwnProperty.call(
    XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY,
    portName,
  );
}

/* ============================================================================
 * 34. EXECUTION CONFIDENCE CONTRACT HELPER
 * ----------------------------------------------------------------------------
 * Static contract reader only.
 *
 * It does NOT materialize SearchOptionalEvidence.
 * It does NOT produce SearchTraceRecord.
 * ========================================================================== */

export function getSearchProducerExecutionConfidenceUnavailableReason(
  portName:
    SearchProducerExecutionTraceablePortName,
): typeof XYVALA_SEARCH_EXECUTION_CONFIDENCE_UNAVAILABLE_REASON {
  const contract =
    getSearchProducerExecutionObservationContract(
      portName,
    );

  return contract
    .confidence
    .canonical_unavailable_reason;
}

/* ============================================================================
 * 35. VALIDATION SOURCE READER
 * ========================================================================== */

export function getSearchProducerExecutionValidationObservationSource(
  portName:
    SearchProducerExecutionTraceablePortName,
): SearchProducerExecutionObservationValidationSource {
  const contract =
    getSearchProducerExecutionObservationContract(
      portName,
    );

  return contract
    .validation_state
    .source;
}

/* ============================================================================
 * 36. OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY_OWNERSHIP =
  Object.freeze({
    canonical_owner:
      "SEARCH_PRODUCER_EXECUTION_OBSERVATION_GOVERNANCE",

    runtime_execution_descriptor_owner:
      "SEARCH_RUNTIME_EXECUTION_GOVERNANCE",

    producer_execution_contract_owner:
      "SEARCH_PRODUCER_EXECUTION_CONTRACT_GOVERNANCE",

    execution_observation_boundary_owner:
      "SEARCH_RUNTIME_EXECUTION_OBSERVATION",

    execution_trace_owner:
      "EXECUTION_TRACEABILITY",

    variable_lineage_owner:
      "VARIABLE_LINEAGE_GOVERNANCE",

    registry_owns_module_identity:
      false,

    registry_owns_policy:
      false,

    registry_owns_analytical_validation:
      false,

    registry_owns_analytical_parameters:
      false,

    registry_owns_analytical_missing_data:
      false,

    registry_owns_analytical_confidence:
      false,

    registry_owns_execution_observation_provenance_contract:
      true,

    registry_executes_producer:
      false,

    registry_generates_trace:
      false,

    registry_generates_trace_identity:
      false,

    registry_generates_lineage:
      false,

    registry_resolves_policy:
      false,

    registry_reads_clock:
      false,
  } as const);

/* ============================================================================
 * 37. GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_REGISTRY_GOVERNANCE =
  Object.freeze({
    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    exact_traceable_port_coverage_required:
      true,

    one_observation_contract_per_traceable_port:
      true,

    analytical_owner:
      false,

    canonical_trace_owner:
      false,

    lineage_owner:
      false,

    module_identity_from_descriptor_required:
      true,

    module_identity_duplication_allowed:
      false,

    module_identity_inference_allowed:
      false,

    policy_provenance_from_descriptor_required:
      true,

    actual_resolved_policy_version_required_when_declared:
      true,

    current_policy_lookup_allowed:
      false,

    policy_fallback_allowed:
      false,

    parameters_require_explicit_execution_observation:
      true,

    empty_parameters_fallback_allowed:
      false,

    subscore_parameters_as_execution_parameters_allowed:
      false,

    missing_data_requires_explicit_execution_observation:
      true,

    empty_missing_data_fallback_allowed:
      false,

    degradation_reasons_as_missing_data_allowed:
      false,

    rejection_reasons_as_missing_data_allowed:
      false,

    subscore_missing_data_union_allowed:
      false,

    execution_confidence_produced_by_current_producer_contract:
      false,

    execution_confidence_unavailability_is_explicit:
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

    validation_default_allowed:
      false,

    output_validation_reconstruction_allowed:
      false,

    optional_output_availability_as_validation_allowed:
      false,

    corpus_version_late_resolution_allowed:
      false,

    duration_reconstruction_allowed:
      false,

    runtime_clock_access_allowed:
      false,

    provider_identity_trace_field_available:
      false,

    provider_identity_parameter_smuggling_allowed:
      false,

    observation_identity_parameter_smuggling_allowed:
      false,

    producer_execution_allowed:
      false,

    producer_wrapping_allowed:
      false,

    trace_generation_allowed:
      false,

    trace_identity_generation_allowed:
      false,

    lineage_generation_allowed:
      false,

    persistence_allowed:
      false,

    logging_allowed:
      false,

    network_access_allowed:
      false,

    prohibited_shortcuts:
      Object.freeze([
        "module_identity_from_module_path",
        "module_identity_from_function_name",
        "module_version_from_current_source_lookup",

        "policy_version_from_current_policy",
        "default_policy_as_executed_policy",

        "empty_execution_parameters_fallback",
        "subscore_parameters_as_execution_parameters",
        "merged_subscore_parameters_as_execution_parameters",

        "empty_execution_missing_data_fallback",
        "degradation_reasons_as_execution_missing_data",
        "rejection_reasons_as_execution_missing_data",
        "subscore_missing_data_union",

        "subscore_confidence_as_execution_confidence",
        "link_signal_confidence_as_execution_confidence",
        "temporal_confidence_as_execution_confidence",
        "behavioral_sample_confidence_as_execution_confidence",
        "aggregate_confidence_as_execution_confidence",
        "decision_confidence_as_execution_confidence",
        "unavailable_execution_confidence_to_zero",

        "default_valid_execution",
        "default_unvalidated_execution",
        "availability_reason_as_validation_state",

        "provider_identity_encoded_in_parameters",
        "observation_identity_encoded_in_parameters",
        "fabricated_provider_trace_field",

        "current_corpus_as_executed_corpus",
        "duration_from_later_clock",

        "observation_contract_executed_producer",
        "observation_contract_wrapped_producer",

        "observation_contract_generated_trace",
        "observation_contract_generated_trace_id",
        "observation_contract_generated_variable_lineage",

        "observation_contract_persistence",
        "observation_contract_logging",
        "observation_contract_network_access",
      ] as const),
  } as const);

/* ============================================================================
 * 38. CONTRACT STATUS
 * ----------------------------------------------------------------------------
 * Static declaration only.
 *
 * The registry is structurally complete.
 *
 * Runtime instrumentation still requires producer-specific execution-boundary
 * observation for:
 *
 * - parameters
 * - missing_data
 * - validation_state where explicitly required
 *
 * This is intentional.
 *
 * Contract completeness != runtime observation availability.
 * ========================================================================== */

export const XYVALA_SEARCH_PRODUCER_EXECUTION_OBSERVATION_CONTRACT_STATUS =
  Object.freeze({
    registry_contract_complete:
      true,

    runtime_instrumentation_complete:
      false,

    explicit_parameters_observation_still_required:
      true,

    explicit_missing_data_observation_still_required:
      true,

    explicit_validation_observation_required_for_some_ports:
      true,

    execution_confidence_contract_resolved:
      true,

    execution_confidence_current_state:
      "UNAVAILABLE",

    execution_confidence_reason:
      XYVALA_SEARCH_EXECUTION_CONFIDENCE_UNAVAILABLE_REASON,

    safe_to_reconstruct_missing_facts:
      false,
  } as const);
