/* ============================================================================
 * FILE:
 * lib/xyvala/search/runtime/
 * search-runtime-execution-boundary-observation-port.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search runtime execution-boundary observation port
 *
 * ROLE
 * - define the canonical runtime source boundary for execution facts that are
 *   not directly produced by canonical analytical producer contracts
 * - require explicit producer-boundary observation of missing execution facts
 * - expose producer-specific request and resolution contracts
 * - preserve strict Compute / Observe / Mutate separation
 * - provide one cross-cutting source boundary usable by runtime adapters and,
 *   after explicit audit, directly bound runtime producers
 *
 * CLASSIFICATION
 * - SEARCH RUNTIME
 * - EXECUTION PLANE
 * - OBSERVE
 * - CROSS-CUTTING
 * - PRIVATE
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING
 * - NON-CALIBRATING
 * - NON-MUTATING
 * - NON-TRACE-OWNING
 * - NON-LINEAGE-PRODUCING
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * exact producer execution boundary
 *              ↓
 * THIS PORT
 *              ↓
 * explicit boundary-owned execution facts
 *              ↓
 * Producer Execution Observation Core
 *              ↓
 * Runtime Execution Observation Core
 *              ↓
 * observe_execution
 *              ↓
 * Execution Traceability Core
 *              ↓
 * SearchTraceRecord
 *
 * TWO DISTINCT OBSERVATION BOUNDARIES
 * ----------------------------------------------------------------------------
 *
 * observe_execution_boundary
 *
 * SOURCE boundary.
 *
 * It obtains explicitly observed execution facts that do not already belong
 * to the canonical analytical producer output.
 *
 *
 * observe_execution
 *
 * TRANSPORT boundary.
 *
 * It transports an already-materialized runtime execution observation toward
 * Execution Traceability.
 *
 *
 * These boundaries MUST NOT be merged.
 *
 * OWNERSHIP
 * ----------------------------------------------------------------------------
 *
 * This module owns:
 * - the execution-boundary observation PORT CONTRACT;
 * - producer-specific request contracts;
 * - producer-specific resolution contracts;
 * - structural request/resolution validation;
 * - exact request/resolution registry concordance.
 *
 * This module does NOT own:
 * - the concrete observed runtime value;
 * - canonical analytical inputs;
 * - canonical analytical outputs;
 * - analytical validation;
 * - analytical confidence;
 * - analytical policy;
 * - producer execution;
 * - SearchRuntimeExecutionObservedFacts;
 * - SearchExecutionTraceObservationInput;
 * - SearchTraceRecord;
 * - SearchTraceId;
 * - SearchVariableLineage;
 * - trace collection;
 * - runtime orchestration;
 * - snapshot construction.
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 *
 * A producer may enter this boundary only after:
 *
 * 1. its canonical producer contract has been audited;
 * 2. its execution-observation provenance has been registered;
 * 3. the exact missing execution truth has been identified;
 * 4. the minimum required observation input surface has been established;
 * 5. a producer-specific request/resolution contract has been declared here.
 *
 * There is NO generic fallback for every SearchRuntimePort.
 *
 * CURRENT AUTHORIZED DOMAIN
 * ----------------------------------------------------------------------------
 *
 * Current producer:
 *
 * detect_anchor_signals
 *
 * Current execution-boundary-owned truth:
 *
 * missing_data
 *
 * Anchor validation_state does NOT originate here because the canonical
 * SearchAnchorSignals output already owns one canonical validation_state.
 *
 * Anchor confidence does NOT originate here.
 *
 * Anchor degradation reasons do NOT originate here as missing_data.
 *
 * Future producers are added one-by-one only after producer audit.
 *
 * MISSING-DATA SEMANTICS
 * ----------------------------------------------------------------------------
 *
 * missing_data represents execution information explicitly observed as absent
 * from the invocation boundary.
 *
 * It MUST NOT be reconstructed from:
 * - degradation_reasons;
 * - rejection_reasons;
 * - SearchSubScore.missing_data;
 * - analytical confidence;
 * - output availability;
 * - successful execution;
 * - failed execution;
 * - downstream state;
 * - private snapshot;
 * - public projection.
 *
 * [] is valid only when the authorized boundary observer explicitly observed
 * that no execution information governed by that observer was missing.
 *
 * Therefore:
 *
 * successful execution
 *      ≠
 * implicit missing_data: []
 *
 * ANCHOR SEMANTICS
 * ----------------------------------------------------------------------------
 *
 * For detect_anchor_signals, missing_data is NOT:
 *
 * - LOCAL_RARITY_EVIDENCE_ONLY
 * - SOME_SELECTED_TERMS_HAVE_NO_SENTENCE_MATCH
 * - NO_FREQUENT_RARE_CONVERGENCE_ANCHOR
 * - ONLY_FREQUENT_TERM_ANCHORS
 * - ONLY_RARE_TERM_ANCHORS
 * - LOW_ANCHOR_SENTENCE_COVERAGE
 * - Anchor rejection reasons
 *
 * Those remain analytical truths owned by ANCHOR_SIGNAL_DETECTION.
 *
 * MINIMUM INPUT SURFACE
 * ----------------------------------------------------------------------------
 *
 * Current Anchor observation receives:
 *
 * SearchAnchorSignalsInput
 *
 * only.
 *
 * It deliberately does NOT receive SearchAnchorSignals output.
 *
 * Therefore current Anchor missing_data cannot be reconstructed from:
 * - validation_state;
 * - degradation_reasons;
 * - anchors;
 * - anchor_count;
 * - output acceptance.
 *
 * POLICY
 * ----------------------------------------------------------------------------
 *
 * producer_input.detection_policy must already contain the exact policy
 * resolved by runtime governance.
 *
 * This boundary:
 * - does not select policy;
 * - does not default policy;
 * - does not merge policy;
 * - does not repair policy;
 * - does not read current calibration state.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 *
 * missing concrete observer
 * => runtime composition boundary
 *
 * malformed observer result
 * => concrete execution-boundary observer
 *
 * request / resolution port mismatch
 * => execution-boundary transport divergence
 *
 * missing_data absent
 * => execution-boundary observer
 *
 * adapter creates missing_data
 * => adapter ownership violation
 *
 * degradation_reasons become missing_data
 * => analytical / execution semantic violation
 *
 * producer output used to reconstruct Anchor missing_data
 * => downstream reconstruction violation
 *
 * default policy selected here
 * => policy ownership violation
 *
 * unsupported returned field
 * => boundary contract violation
 *
 * DIRECTIVES
 * - Contract Before Runtime
 * - First Divergence Before Correction
 * - Reality Before Interpretation
 * - One Truth = One Canonical Owner
 * - Minimum Input Surface
 * - explicit observation only
 * - no generic observation fallback
 * - no analytical reconstruction
 * - no downstream reconstruction
 * - no producer execution
 * - no producer wrapping
 * - no policy resolution
 * - no policy fallback
 * - no validation fabrication
 * - no confidence fabrication
 * - no timestamp generation
 * - no duration generation
 * - no trace generation
 * - no trace identity generation
 * - no lineage generation
 * - no trace collection
 * - no silent failure
 * - no persistence
 * - no logging
 * - no network access
 *
 * INVARIANTS
 * - every authorized request port is a traceable producer port
 * - request registry keys match request port_name exactly
 * - resolution registry keys match resolution port_name exactly
 * - request and resolution registry coverage is symmetrical
 * - no unsupported producer enters this boundary
 * - no unsupported field exits this boundary
 * - producer input is never mutated
 * - analytical output is never read for current Anchor missing_data
 * - no SearchTraceRecord is created here
 * - no SearchVariableLineage is created here
 * ========================================================================== */

import type {
  SearchModuleVersion,
  SearchTraceRecord,
} from "../contracts/search-pipeline-contract";

import type {
  SearchProducerExecutionTraceablePortName,
} from "../governance/search-producer-execution-contract-registry";

import type {
  SearchAnchorSignalsInput,
} from "../signals/search-anchor-signals-core";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_BOUNDARY_OBSERVATION_PORT_MODULE_NAME =
  "xyvala-search-runtime-execution-boundary-observation-port" as const;

export const XYVALA_SEARCH_RUNTIME_EXECUTION_BOUNDARY_OBSERVATION_PORT_MODULE_VERSION =
  "1.1.0" satisfies SearchModuleVersion;

/* ============================================================================
 * 2. ASYNC SUPPORT
 * ----------------------------------------------------------------------------
 * Concrete observation providers may be synchronous or asynchronous.
 *
 * This contract owns no scheduling or concurrency policy.
 * ========================================================================== */

export type SearchRuntimeExecutionBoundaryObservationResult<T> =
  T | Promise<T>;

/* ============================================================================
 * 3. CANONICAL MISSING-DATA TYPE
 * ----------------------------------------------------------------------------
 * No second missing-data identity is introduced.
 *
 * The field shape remains derived from the canonical trace contract.
 *
 * Referencing its type does not transfer trace ownership to this module.
 * ========================================================================== */

export type SearchRuntimeExecutionBoundaryMissingData =
  SearchTraceRecord["missing_data"];

/* ============================================================================
 * 4. PRODUCER-SPECIFIC REQUEST BASE
 * ----------------------------------------------------------------------------
 * Only canonical current-snapshot traceable producer ports may specialize
 * this base.
 * ========================================================================== */

interface SearchRuntimeExecutionBoundaryObservationRequestBase<
  TPortName extends SearchProducerExecutionTraceablePortName,
> {
  readonly port_name:
    TPortName;
}

/* ============================================================================
 * 5. ANCHOR EXECUTION-BOUNDARY REQUEST
 * ----------------------------------------------------------------------------
 * Exact canonical producer input.
 *
 * Producer output is intentionally absent.
 * ========================================================================== */

export interface SearchAnchorRuntimeExecutionBoundaryObservationRequest
  extends SearchRuntimeExecutionBoundaryObservationRequestBase<
    "detect_anchor_signals"
  > {
  readonly producer_input:
    SearchAnchorSignalsInput;
}

/* ============================================================================
 * 6. PRODUCER-SPECIFIC REQUEST REGISTRY
 * ----------------------------------------------------------------------------
 * This registry is deliberately narrow.
 *
 * New producers require explicit audit before being added.
 * ========================================================================== */

export interface SearchRuntimeExecutionBoundaryObservationRequestRegistry {
  readonly detect_anchor_signals:
    SearchAnchorRuntimeExecutionBoundaryObservationRequest;
}

/* ============================================================================
 * 7. AUTHORIZED OBSERVATION PORT DOMAIN
 * ----------------------------------------------------------------------------
 * Derived from the request registry.
 *
 * No duplicate handwritten union.
 * ========================================================================== */

export type SearchRuntimeExecutionBoundaryObservationPortName =
  keyof SearchRuntimeExecutionBoundaryObservationRequestRegistry;

/* ============================================================================
 * 8. REQUEST REGISTRY GOVERNANCE ASSERTIONS
 * ----------------------------------------------------------------------------
 * Compile-time only.
 *
 * Ensures:
 * - every registry key belongs to the current traceable producer domain;
 * - every request's literal port_name equals its registry key.
 * ========================================================================== */

type SearchRuntimeExecutionBoundaryUnsupportedRequestPorts =
  Exclude<
    SearchRuntimeExecutionBoundaryObservationPortName,
    SearchProducerExecutionTraceablePortName
  >;

type SearchRuntimeExecutionBoundaryMisalignedRequestPorts =
  {
    [TPortName in
      SearchRuntimeExecutionBoundaryObservationPortName]:
        SearchRuntimeExecutionBoundaryObservationRequestRegistry[
          TPortName
        ] extends Readonly<{
          port_name: TPortName;
        }>
          ? never
          : TPortName;
  }[
    SearchRuntimeExecutionBoundaryObservationPortName
  ];

const SEARCH_RUNTIME_EXECUTION_BOUNDARY_REQUEST_PORT_DOMAIN_VALID:
  SearchRuntimeExecutionBoundaryUnsupportedRequestPorts extends never
    ? true
    : never =
      true;

const SEARCH_RUNTIME_EXECUTION_BOUNDARY_REQUEST_PORT_ALIGNMENT_VALID:
  SearchRuntimeExecutionBoundaryMisalignedRequestPorts extends never
    ? true
    : never =
      true;

void SEARCH_RUNTIME_EXECUTION_BOUNDARY_REQUEST_PORT_DOMAIN_VALID;
void SEARCH_RUNTIME_EXECUTION_BOUNDARY_REQUEST_PORT_ALIGNMENT_VALID;

/* ============================================================================
 * 9. PRODUCER-SPECIFIC RESOLUTION BASE
 * ----------------------------------------------------------------------------
 * The exact requested port identity is preserved.
 *
 * missing_data is already-observed execution-boundary truth.
 * ========================================================================== */

interface SearchRuntimeExecutionBoundaryObservationResolutionBase<
  TPortName extends
    SearchRuntimeExecutionBoundaryObservationPortName,
> {
  readonly port_name:
    TPortName;

  /**
   * Explicit invocation-level execution missing-data truth.
   *
   * [] is legal only when explicitly observed.
   */
  readonly missing_data:
    SearchRuntimeExecutionBoundaryMissingData;
}

/* ============================================================================
 * 10. ANCHOR EXECUTION-BOUNDARY RESOLUTION
 * ----------------------------------------------------------------------------
 * Anchor currently adds no producer-specific resolution field.
 *
 * A type alias is intentional:
 * - no empty interface;
 * - no duplicate schema;
 * - no false semantic specialization.
 * ========================================================================== */

export type SearchAnchorRuntimeExecutionBoundaryObservationResolution =
  SearchRuntimeExecutionBoundaryObservationResolutionBase<
    "detect_anchor_signals"
  >;

/* ============================================================================
 * 11. PRODUCER-SPECIFIC RESOLUTION REGISTRY
 * ========================================================================== */

export interface SearchRuntimeExecutionBoundaryObservationResolutionRegistry {
  readonly detect_anchor_signals:
    SearchAnchorRuntimeExecutionBoundaryObservationResolution;
}

/* ============================================================================
 * 12. REQUEST / RESOLUTION COVERAGE GOVERNANCE
 * ----------------------------------------------------------------------------
 * Compile-time only.
 *
 * Guarantees symmetrical registry coverage and literal port alignment.
 * ========================================================================== */

type SearchRuntimeExecutionBoundaryRequestPortName =
  keyof SearchRuntimeExecutionBoundaryObservationRequestRegistry;

type SearchRuntimeExecutionBoundaryResolutionPortName =
  keyof SearchRuntimeExecutionBoundaryObservationResolutionRegistry;

type SearchRuntimeExecutionBoundaryMissingResolutionPorts =
  Exclude<
    SearchRuntimeExecutionBoundaryRequestPortName,
    SearchRuntimeExecutionBoundaryResolutionPortName
  >;

type SearchRuntimeExecutionBoundaryOrphanResolutionPorts =
  Exclude<
    SearchRuntimeExecutionBoundaryResolutionPortName,
    SearchRuntimeExecutionBoundaryRequestPortName
  >;

type SearchRuntimeExecutionBoundaryMisalignedResolutionPorts =
  {
    [TPortName in
      SearchRuntimeExecutionBoundaryResolutionPortName]:
        SearchRuntimeExecutionBoundaryObservationResolutionRegistry[
          TPortName
        ] extends Readonly<{
          port_name: TPortName;
        }>
          ? never
          : TPortName;
  }[
    SearchRuntimeExecutionBoundaryResolutionPortName
  ];

const SEARCH_RUNTIME_EXECUTION_BOUNDARY_REQUEST_COVERAGE_VALID:
  SearchRuntimeExecutionBoundaryMissingResolutionPorts extends never
    ? true
    : never =
      true;

const SEARCH_RUNTIME_EXECUTION_BOUNDARY_RESOLUTION_COVERAGE_VALID:
  SearchRuntimeExecutionBoundaryOrphanResolutionPorts extends never
    ? true
    : never =
      true;

const SEARCH_RUNTIME_EXECUTION_BOUNDARY_RESOLUTION_PORT_ALIGNMENT_VALID:
  SearchRuntimeExecutionBoundaryMisalignedResolutionPorts extends never
    ? true
    : never =
      true;

void SEARCH_RUNTIME_EXECUTION_BOUNDARY_REQUEST_COVERAGE_VALID;
void SEARCH_RUNTIME_EXECUTION_BOUNDARY_RESOLUTION_COVERAGE_VALID;
void SEARCH_RUNTIME_EXECUTION_BOUNDARY_RESOLUTION_PORT_ALIGNMENT_VALID;

/* ============================================================================
 * 13. INDEXED REQUEST / RESOLUTION TYPES
 * ========================================================================== */

export type SearchRuntimeExecutionBoundaryObservationRequest<
  TPortName extends
    SearchRuntimeExecutionBoundaryObservationPortName,
> =
  SearchRuntimeExecutionBoundaryObservationRequestRegistry[
    TPortName
  ];

export type SearchRuntimeExecutionBoundaryObservationResolution<
  TPortName extends
    SearchRuntimeExecutionBoundaryObservationPortName,
> =
  SearchRuntimeExecutionBoundaryObservationResolutionRegistry[
    TPortName
  ];

/* ============================================================================
 * 14. DISCRIMINATED REQUEST UNION
 * ----------------------------------------------------------------------------
 * Required for safe exhaustive runtime dispatch.
 *
 * TypeScript cannot reliably reduce a correlated indexed generic to never.
 *
 * The union is therefore derived from the registry rather than handwritten.
 *
 * No cast.
 * No `as never`.
 * ========================================================================== */

export type SearchRuntimeExecutionBoundaryObservationAnyRequest =
  {
    [TPortName in
      SearchRuntimeExecutionBoundaryObservationPortName]:
        SearchRuntimeExecutionBoundaryObservationRequest<
          TPortName
        >;
  }[
    SearchRuntimeExecutionBoundaryObservationPortName
  ];

/* ============================================================================
 * 15. DISCRIMINATED RESOLUTION UNION
 * ----------------------------------------------------------------------------
 * Kept derived for future producer-specific structural validation.
 * ========================================================================== */

export type SearchRuntimeExecutionBoundaryObservationAnyResolution =
  {
    [TPortName in
      SearchRuntimeExecutionBoundaryObservationPortName]:
        SearchRuntimeExecutionBoundaryObservationResolution<
          TPortName
        >;
  }[
    SearchRuntimeExecutionBoundaryObservationPortName
  ];

/* ============================================================================
 * 16. CANONICAL EXECUTION-BOUNDARY OBSERVATION PORT
 * ----------------------------------------------------------------------------
 * Correlation is preserved:
 *
 * request(port X)
 *        ↓
 * resolution(port X)
 *
 * This port produces execution-boundary facts only.
 * ========================================================================== */

export type SearchRuntimeExecutionBoundaryObservationPort =
  <
    TPortName extends
      SearchRuntimeExecutionBoundaryObservationPortName,
  >(
    input:
      SearchRuntimeExecutionBoundaryObservationRequest<
        TPortName
      >,
  ) =>
    SearchRuntimeExecutionBoundaryObservationResult<
      SearchRuntimeExecutionBoundaryObservationResolution<
        TPortName
      >
    >;

/* ============================================================================
 * 17. RUNTIME PORT SET
 * ========================================================================== */

export interface SearchRuntimeExecutionBoundaryObservationPorts {
  readonly observe_execution_boundary:
    SearchRuntimeExecutionBoundaryObservationPort;
}

/* ============================================================================
 * 18. BASIC STRUCTURAL ASSERTIONS
 * ========================================================================== */

function assertObject(
  value:
    unknown,

  fieldName:
    string,
): asserts value is object {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_BOUNDARY_OBSERVATION_PORT_MODULE_NAME}] ` +
        `Boundary observation violation: ${fieldName} must be an object.`,
    );
  }
}

function assertNonEmptyString(
  value:
    unknown,

  fieldName:
    string,
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_BOUNDARY_OBSERVATION_PORT_MODULE_NAME}] ` +
        `Boundary observation violation: ${fieldName} must be a non-empty string.`,
    );
  }
}

/* ============================================================================
 * 19. EXACT KEY VALIDATION
 * ----------------------------------------------------------------------------
 * Boundary providers may not smuggle unsupported fields through structurally
 * wider runtime objects.
 * ========================================================================== */

function assertExactObjectKeys(
  value:
    object,

  allowedKeys:
    ReadonlySet<string>,

  fieldName:
    string,
): void {
  for (
    const key of Object.keys(value)
  ) {
    if (!allowedKeys.has(key)) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_EXECUTION_BOUNDARY_OBSERVATION_PORT_MODULE_NAME}] ` +
          `Boundary observation violation: ${fieldName} contains unauthorized field ${key}.`,
      );
    }
  }
}

/* ============================================================================
 * 20. MISSING-DATA STRUCTURAL VALIDATION
 * ----------------------------------------------------------------------------
 * Shape only.
 *
 * This module does not decide which information should be considered missing.
 * ========================================================================== */

function validateSearchRuntimeExecutionBoundaryMissingData(
  missingData:
    SearchRuntimeExecutionBoundaryMissingData,
): void {
  if (!Array.isArray(missingData)) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_BOUNDARY_OBSERVATION_PORT_MODULE_NAME}] ` +
        "Boundary observation violation: missing_data must be an explicitly observed array.",
    );
  }

  for (
    let index = 0;
    index < missingData.length;
    index += 1
  ) {
    assertNonEmptyString(
      missingData[index],
      `missing_data[${String(index)}]`,
    );
  }
}

/* ============================================================================
 * 21. ANCHOR REQUEST VALIDATION
 * ----------------------------------------------------------------------------
 * Structural observation-boundary validation only.
 *
 * Analytical Anchor validation remains exclusively owned by the canonical
 * Anchor producer.
 * ========================================================================== */

function validateSearchAnchorRuntimeExecutionBoundaryObservationRequest(
  input:
    SearchAnchorRuntimeExecutionBoundaryObservationRequest,
): void {
  assertObject(
    input.producer_input,
    "detect_anchor_signals.producer_input",
  );

  assertObject(
    input.producer_input.segmented_document,
    "detect_anchor_signals.producer_input.segmented_document",
  );

  assertObject(
    input.producer_input.lexical_document,
    "detect_anchor_signals.producer_input.lexical_document",
  );

  assertObject(
    input.producer_input.frequency_signals,
    "detect_anchor_signals.producer_input.frequency_signals",
  );

  assertNonEmptyString(
    input.producer_input.created_at,
    "detect_anchor_signals.producer_input.created_at",
  );

  if (
    input.producer_input.detection_policy ===
    undefined
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_BOUNDARY_OBSERVATION_PORT_MODULE_NAME}] ` +
        "First divergence: detect_anchor_signals boundary observation requires the exact explicitly resolved detection_policy.",
    );
  }

  assertObject(
    input.producer_input.detection_policy,
    "detect_anchor_signals.producer_input.detection_policy",
  );
}

/* ============================================================================
 * 22. REQUEST VALIDATION
 * ----------------------------------------------------------------------------
 * Current authorized execution-boundary observation domain contains exactly
 * one producer:
 *
 * detect_anchor_signals
 *
 * Therefore no synthetic multi-producer dispatch is introduced.
 *
 * Contract Before Runtime:
 * - the request type already restricts the domain to the canonical registry;
 * - the registry currently exposes only detect_anchor_signals;
 * - Anchor-specific validation is therefore called directly.
 *
 * When a second producer is contractually authorized, this section may evolve
 * to a discriminated-union switch derived from the registry.
 *
 * No:
 * - default branch;
 * - `as never`;
 * - cast;
 * - generic fallback;
 * - unsupported producer handling is required at the current contract version.
 * ========================================================================== */

export function validateSearchRuntimeExecutionBoundaryObservationRequest(
  input:
    SearchRuntimeExecutionBoundaryObservationAnyRequest,
): void {
  validateSearchAnchorRuntimeExecutionBoundaryObservationRequest(
    input,
  );
}

/* ============================================================================
 * 23. ANCHOR RESOLUTION VALIDATION
 * ----------------------------------------------------------------------------
 * Current Anchor resolution authorizes exactly:
 *
 * - port_name
 * - missing_data
 *
 * Nothing else.
 * ========================================================================== */

function validateSearchAnchorRuntimeExecutionBoundaryObservationResolution(
  resolution:
    SearchAnchorRuntimeExecutionBoundaryObservationResolution,
): void {
  validateSearchRuntimeExecutionBoundaryMissingData(
    resolution.missing_data,
  );

  assertExactObjectKeys(
    resolution,
    new Set<string>([
      "port_name",
      "missing_data",
    ]),
    "detect_anchor_signals.boundary_observation_resolution",
  );
}

/* ============================================================================
 * 24. RESOLUTION VALIDATION
 * ----------------------------------------------------------------------------
 * Request identity and returned resolution identity must remain exactly equal.
 *
 * No silent repair.
 * ========================================================================== */

export function validateSearchRuntimeExecutionBoundaryObservationResolution<
  TPortName extends
    SearchRuntimeExecutionBoundaryObservationPortName,
>(
  request:
    SearchRuntimeExecutionBoundaryObservationRequest<
      TPortName
    >,

  resolution:
    SearchRuntimeExecutionBoundaryObservationResolution<
      TPortName
    >,
): void {
  assertObject(
    resolution,
    `${request.port_name}.boundary_observation_resolution`,
  );

  if (
    resolution.port_name !==
    request.port_name
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_EXECUTION_BOUNDARY_OBSERVATION_PORT_MODULE_NAME}] ` +
        `First divergence: execution-boundary observation resolution changed port identity from ${request.port_name} to ${resolution.port_name}.`,
    );
  }

  /*
   * Current authorized registry contains only Anchor.
   *
   * This explicit call is intentional.
   *
   * When another producer enters the registry, resolution dispatch must be
   * extended contract-first rather than given a generic fallback.
   */
  validateSearchAnchorRuntimeExecutionBoundaryObservationResolution(
    resolution,
  );
}

/* ============================================================================
 * 25. AUTHORIZED PORT-NAME GUARD
 * ----------------------------------------------------------------------------
 * Current runtime coverage is deliberately narrow.
 * ========================================================================== */

export function isSearchRuntimeExecutionBoundaryObservationPortName(
  value:
    string,
): value is SearchRuntimeExecutionBoundaryObservationPortName {
  return value ===
    "detect_anchor_signals";
}

/* ============================================================================
 * 26. OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_BOUNDARY_OBSERVATION_OWNERSHIP =
  Object.freeze({
    canonical_contract_owner:
      "SEARCH_RUNTIME_EXECUTION_BOUNDARY_OBSERVATION",

    execution_plane:
      true,

    analytical_plane:
      false,

    governance_plane:
      false,

    boundary_contract_owner:
      true,

    concrete_boundary_observation_owner:
      false,

    analytical_truth_owner:
      false,

    analytical_validation_owner:
      false,

    analytical_confidence_owner:
      false,

    analytical_policy_owner:
      false,

    producer_input_owner:
      false,

    producer_output_owner:
      false,

    runtime_execution_observed_facts_owner:
      false,

    runtime_execution_observation_owner:
      false,

    execution_trace_owner:
      false,

    trace_identity_owner:
      false,

    trace_collection_owner:
      false,

    variable_lineage_owner:
      false,

    producer_execution_owner:
      false,

    producer_binding_owner:
      false,

    runtime_orchestration_owner:
      false,

    snapshot_owner:
      false,

    public_projection_owner:
      false,
  } as const);

/* ============================================================================
 * 27. GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_BOUNDARY_OBSERVATION_GOVERNANCE =
  Object.freeze({
    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    reality_before_interpretation:
      true,

    one_truth_one_owner:
      true,

    observe_only:
      true,

    cross_cutting_execution_plane_boundary:
      true,

    producer_specific_contracts_required:
      true,

    minimum_input_surface_required:
      true,

    full_traceable_port_generic_fallback_allowed:
      false,

    request_registry_derived_port_domain:
      true,

    request_resolution_coverage_required:
      true,

    request_port_literal_alignment_required:
      true,

    resolution_port_literal_alignment_required:
      true,

    analytical_truth_creation_allowed:
      false,

    analytical_truth_reconstruction_allowed:
      false,

    downstream_truth_reconstruction_allowed:
      false,

    producer_execution_allowed:
      false,

    producer_wrapping_allowed:
      false,

    producer_substitution_allowed:
      false,

    producer_input_mutation_allowed:
      false,

    producer_output_access_required_for_anchor:
      false,

    producer_output_mutation_allowed:
      false,

    policy_resolution_allowed:
      false,

    policy_default_allowed:
      false,

    policy_merge_allowed:
      false,

    policy_reconstruction_allowed:
      false,

    calibration_lookup_allowed:
      false,

    missing_data_observation_allowed:
      true,

    missing_data_default_allowed:
      false,

    missing_data_reconstruction_allowed:
      false,

    explicitly_observed_empty_missing_data_allowed:
      true,

    successful_execution_as_empty_missing_data_allowed:
      false,

    degradation_reasons_as_missing_data_allowed:
      false,

    rejection_reasons_as_missing_data_allowed:
      false,

    analytical_missing_data_reuse_allowed:
      false,

    subscore_missing_data_union_allowed:
      false,

    output_availability_as_missing_data_allowed:
      false,

    anchor_output_as_missing_data_source_allowed:
      false,

    anchor_degradation_reasons_as_missing_data_allowed:
      false,

    anchor_rejection_reasons_as_missing_data_allowed:
      false,

    anchor_policy_presence_required:
      true,

    validation_state_generation_allowed:
      false,

    anchor_explicit_execution_validation_allowed:
      false,

    execution_confidence_generation_allowed:
      false,

    analytical_confidence_reuse_allowed:
      false,

    timestamp_generation_allowed:
      false,

    runtime_clock_access_allowed:
      false,

    duration_measurement_allowed:
      false,

    trace_generation_allowed:
      false,

    trace_reconstruction_allowed:
      false,

    trace_identity_generation_allowed:
      false,

    trace_collection_allowed:
      false,

    variable_lineage_generation_allowed:
      false,

    variable_lineage_reconstruction_allowed:
      false,

    downstream_state_access_allowed:
      false,

    private_snapshot_access_allowed:
      false,

    public_projection_access_allowed:
      false,

    unsupported_field_transport_allowed:
      false,

    silent_observer_failure_allowed:
      false,

    observer_fallback_allowed:
      false,

    persistence_allowed:
      false,

    logging_allowed:
      false,

    network_access_allowed:
      false,

    prohibited_shortcuts:
      Object.freeze([
        "generic_boundary_observation_for_all_runtime_ports",

        "adapter_generated_missing_data",
        "adapter_defaulted_missing_data",

        "successful_execution_implies_empty_missing_data",
        "rejected_execution_implies_missing_data",
        "degraded_execution_implies_missing_data",

        "anchor_output_used_to_reconstruct_missing_data",
        "anchor_degradation_reasons_as_missing_data",
        "anchor_rejection_reasons_as_missing_data",
        "anchor_unmatched_terms_as_missing_data",
        "anchor_low_coverage_as_missing_data",
        "anchor_no_convergence_as_missing_data",
        "anchor_rarity_degradation_as_missing_data",

        "boundary_observer_selected_default_policy",
        "boundary_observer_reconstructed_policy",
        "boundary_observer_merged_policy",
        "boundary_observer_read_calibration",

        "boundary_observer_generated_validation_state",
        "boundary_observer_generated_execution_confidence",
        "boundary_observer_reused_analytical_confidence",

        "boundary_observer_used_downstream_state",
        "boundary_observer_used_private_snapshot",
        "boundary_observer_used_public_projection",

        "boundary_observer_generated_timestamp",
        "boundary_observer_read_runtime_clock",
        "boundary_observer_generated_duration",

        "boundary_observer_generated_trace",
        "boundary_observer_reconstructed_trace",
        "boundary_observer_generated_trace_id",
        "boundary_observer_collected_trace",

        "boundary_observer_generated_variable_lineage",
        "boundary_observer_reconstructed_variable_lineage",

        "boundary_observer_smuggled_provider_identity",
        "boundary_observer_smuggled_analytical_value",
        "boundary_observer_returned_unsupported_field",

        "silent_boundary_observation_failure",
        "empty_boundary_observation_fallback",

        "boundary_observer_persistence",
        "boundary_observer_logging",
        "boundary_observer_network_access",
      ] as const),
  } as const);

/* ============================================================================
 * 28. STATUS
 * ----------------------------------------------------------------------------
 * Contract coverage is intentionally incomplete.
 *
 * Current authorization:
 * - Anchor boundary observation contract only.
 *
 * Runtime wiring has not yet been performed.
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_EXECUTION_BOUNDARY_OBSERVATION_STATUS =
  Object.freeze({
    boundary_contract_available:
      true,

    concrete_boundary_observer_available:
      false,

    anchor_boundary_contract_available:
      true,

    anchor_missing_data_contract_available:
      true,

    anchor_output_required:
      false,

    anchor_output_based_missing_data_allowed:
      false,

    anchor_runtime_instrumentation_complete:
      false,

    full_traceable_port_coverage:
      false,

    direct_port_coverage:
      false,

    explicit_execution_validation_coverage:
      false,

    runtime_execution_observation_transport_available:
      true,

    runtime_execution_trace_collection_complete:
      false,

    snapshot_trace_transport_complete:
      false,

    safe_to_reconstruct_missing_observations:
      false,
  } as const);
