/* ============================================================================
 * FILE: lib/xyvala/search/runtime/search-runtime-bindings.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical runtime port bindings
 *
 * ROLE
 * - bind every SearchRuntimePorts entry to exactly one authorized canonical
 *   Search producer
 * - establish the governed producer -> runtime-port binding boundary
 * - preserve producer function identity
 * - preserve explicit dependency injection
 * - reject incomplete or undeclared bindings
 * - prevent local producer substitution
 * - prevent hidden fallback behavior
 * - produce one immutable SearchRuntimePorts object
 *
 * CLASSIFICATION
 * - SEARCH RUNTIME BINDING LAYER
 * - SEARCH DOMAIN
 * - RUNTIME
 * - DEPENDENCY BINDING
 * - NON-ANALYTICAL
 * - NON-COMPUTE
 * - NON-OBSERVE
 * - NON-MUTATING
 * - NON-PUBLIC
 * - DETERMINISTIC
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * Canonical Search producers
 *        +
 * Governed producer adapters
 *        +
 * Explicit infrastructure / governance producers
 *        ↓
 * search-runtime-bindings.ts
 *        ↓
 * SearchRuntimePorts
 *        ↓
 * search-runtime-composition.ts
 *        ↓
 * search-runtime-orchestrator.ts
 *        ↓
 * SearchPublicRankingProjection
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * SearchRuntimePorts is the canonical execution dependency contract.
 *
 * SearchRuntimeBindingSources is derived directly from SearchRuntimePorts.
 *
 * Therefore this layer does NOT maintain a second manually duplicated runtime
 * producer contract.
 *
 * The only complete explicit port identity registry owned by this file is:
 *
 * XYVALA_SEARCH_RUNTIME_PORT_IDENTITIES
 *
 * It exists for:
 * - runtime boundary validation;
 * - auditability;
 * - deterministic port identity enumeration;
 * - explicit contract evolution detection.
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * This module does NOT:
 * - configure analytical policies;
 * - resolve observation evidence;
 * - create producer adapters;
 * - execute producers;
 * - infer producers;
 * - discover producers dynamically;
 * - reconstruct analytical truth;
 * - alter producer input;
 * - alter producer output;
 * - generate identities;
 * - read runtime time.
 *
 * Policies, providers and adapters must already be legitimately configured
 * before entering this boundary.
 *
 * BINDING OWNERSHIP
 * ----------------------------------------------------------------------------
 * Canonical analytical / transport behavior
 * <- canonical producer
 *
 * Policy ownership
 * <- producer-specific governance layer
 *
 * Observation ownership
 * <- authorized provider
 *
 * Adaptation ownership
 * <- search-runtime-producer-adapters.ts
 *
 * Binding ownership
 * <- this file
 *
 * Composition ownership
 * <- search-runtime-composition.ts
 *
 * Runtime execution order
 * <- search-runtime-orchestrator.ts
 *
 * COHORT BOUNDARY
 * ----------------------------------------------------------------------------
 * Runtime binding preserves the canonical chain:
 *
 * evaluate_eligibility
 * -> resolve_distribution_id
 * -> build_cohort_batch
 * -> normalize_cohort
 * -> evaluate_relative_cohort
 *
 * This file does not execute or recreate any of those responsibilities.
 *
 * In particular:
 *
 * resolve_distribution_id
 * - references the externally authorized deterministic identity producer;
 *
 * build_cohort_batch
 * - references the canonical SEARCH_COHORT_BATCH producer;
 *
 * normalize_cohort
 * - references the canonical COHORT_NORMALIZATION producer.
 *
 * None may substitute for another.
 *
 * TRACEABILITY BOUNDARY
 * ----------------------------------------------------------------------------
 * resolve_snapshot_traceability may transport:
 * - canonical execution traces;
 * - canonical variable lineage.
 *
 * This binding layer does not create or merge those governance truths.
 *
 * DIRECTIVES
 * - binding only
 * - one runtime port -> one supplied producer reference
 * - SearchRuntimeBindingSources derived from SearchRuntimePorts
 * - one explicit complete runtime-port identity registry
 * - exact port coverage
 * - exact runtime key validation
 * - duplicate port identities forbidden
 * - no local analytical implementation
 * - no producer inference
 * - no dynamic producer discovery
 * - no fallback producer
 * - no default producer
 * - no hidden policy
 * - no hidden provider
 * - no runtime policy selection
 * - no calibration execution
 * - no observation reconstruction
 * - no signal computation
 * - no scoring
 * - no penalty computation
 * - no aggregation computation
 * - no eligibility computation
 * - no cohort normalization
 * - no relative cohort evaluation
 * - no private decision computation
 * - no snapshot construction
 * - no transformation
 * - no public ranking
 * - no API projection
 * - no persistence
 * - no logging
 * - no event publication
 * - no runtime clock access
 * - no random identifier generation
 * - no unavailable-to-zero conversion
 * - no unavailable-to-neutral conversion
 *
 * INVARIANTS
 * - SearchRuntimeBindingSources has exactly SearchRuntimePorts keys
 * - every SearchRuntimePorts member is explicitly present
 * - no undeclared runtime binding is accepted
 * - every binding is callable
 * - no binding is optional
 * - no missing binding receives a fallback
 * - no producer is selected by string identity
 * - no producer executes during binding
 * - producer function identity is preserved
 * - producer errors are not intercepted here
 * - producer inputs are not changed here
 * - producer outputs are not changed here
 * - unavailable evidence is not reconstructed here
 * - no runtime clock is accessed
 * - no identifier is generated
 * - returned port collection is immutable
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * SearchRuntimePorts evolves
 * but port identity registry does not
 * => binding contract divergence
 *
 * duplicate canonical port identity
 * => binding registry violation
 *
 * missing producer binding
 * => composition / binding boundary
 *
 * undeclared producer binding
 * => composition / binding boundary
 *
 * non-function binding
 * => composition / binding boundary
 *
 * producer signature divergence
 * => producer adapter / binding boundary
 *
 * hidden fallback added here
 * => binding ownership violation
 *
 * analytical calculation added here
 * => producer ownership violation
 *
 * policy selection added here
 * => policy ownership violation
 *
 * provider observation created here
 * => observation ownership violation
 *
 * wrapper changes function identity
 * => binding identity violation
 * ========================================================================== */

import type {
  SearchRuntimePorts,
} from "./search-runtime-orchestrator";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_BINDINGS_MODULE_NAME =
  "xyvala-search-runtime-bindings" as const;

export const XYVALA_SEARCH_RUNTIME_BINDINGS_MODULE_VERSION =
  "1.1.0" as const;

/* ============================================================================
 * 2. CANONICAL BINDING SOURCES
 * ----------------------------------------------------------------------------
 * SearchRuntimePorts owns the canonical runtime dependency surface.
 *
 * SearchRuntimeBindingSources represents the producer references entering the
 * binding boundary.
 *
 * Its shape is derived directly from SearchRuntimePorts.
 *
 * No second manually maintained complete interface is authorized.
 * ========================================================================== */

export type SearchRuntimeBindingSources =
  Readonly<{
    [TPortName in keyof SearchRuntimePorts]:
      SearchRuntimePorts[TPortName];
  }>;

/* ============================================================================
 * 3. CANONICAL PORT IDENTITIES
 * ----------------------------------------------------------------------------
 * This is the unique explicit complete runtime-port identity registry owned by
 * the binding layer.
 *
 * It is metadata only.
 *
 * Runtime execution ordering remains exclusively orchestrator-owned.
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_PORT_IDENTITIES =
  Object.freeze([
    "acquire_documents",

    "extract_document",

    "segment_document",

    "analyze_lexical_document",

    "detect_frequency_signals",

    "detect_anchor_signals",

    "aggregate_context",

    "detect_link_signals",

    "detect_temporal_signals",

    "detect_behavioral_signals",

    "analyze_query",

    "detect_query_document_signals",

    "score_intrinsic_document",

    "score_temporal_document",

    "score_query_relevance",

    "score_link_authority",

    "score_behavioral_calibration",

    "assemble_positive_score_vector",

    "evaluate_penalties",

    "aggregate_analytical_score",

    "evaluate_eligibility",

    "resolve_distribution_id",

    "build_cohort_batch",

    "normalize_cohort",

    "evaluate_relative_cohort",

    "resolve_private_decision",

    "resolve_snapshot_id",

    "resolve_snapshot_traceability",

    "build_private_snapshot",

    "transform_public_result",

    "rank_public_results",
  ] as const satisfies readonly (
    keyof SearchRuntimePorts
  )[]);

/* ============================================================================
 * 4. COMPILE-TIME PORT COVERAGE
 * ----------------------------------------------------------------------------
 * Contract evolution must fail here when:
 * - SearchRuntimePorts gains an undeclared port;
 * - the identity registry contains an unknown port.
 *
 * Duplicate tuple entries are validated separately at runtime because union
 * coverage alone cannot detect duplicates.
 * ========================================================================== */

type SearchRuntimePortIdentity =
  keyof SearchRuntimePorts;

type SearchRuntimeDeclaredPortIdentity =
  (
    typeof XYVALA_SEARCH_RUNTIME_PORT_IDENTITIES
  )[number];

type SearchRuntimeMissingDeclaredPort =
  Exclude<
    SearchRuntimePortIdentity,
    SearchRuntimeDeclaredPortIdentity
  >;

type SearchRuntimeUnknownDeclaredPort =
  Exclude<
    SearchRuntimeDeclaredPortIdentity,
    SearchRuntimePortIdentity
  >;

type SearchRuntimeExactPortCoverage =
  [
    SearchRuntimeMissingDeclaredPort,
    SearchRuntimeUnknownDeclaredPort,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_RUNTIME_PORT_COVERAGE_IS_EXACT:
  SearchRuntimeExactPortCoverage =
    true;

void XYVALA_SEARCH_RUNTIME_PORT_COVERAGE_IS_EXACT;

/* ============================================================================
 * 5. RUNTIME PORT IDENTITY SET
 * ========================================================================== */

const SEARCH_RUNTIME_PORT_IDENTITY_SET:
  ReadonlySet<string> =
    new Set<string>(
      XYVALA_SEARCH_RUNTIME_PORT_IDENTITIES,
    );

/* ============================================================================
 * 6. SAFE RECORD GUARD
 * ========================================================================== */

function isRecord(
  value:
    unknown,
): value is Readonly<
  Record<string, unknown>
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

/* ============================================================================
 * 7. SAFE FUNCTION ASSERTION
 * ----------------------------------------------------------------------------
 * Producer callability is validated without invoking the producer.
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
      `[${XYVALA_SEARCH_RUNTIME_BINDINGS_MODULE_NAME}] ` +
        `Binding violation: ${fieldName} must reference an authorized runtime producer function.`,
    );
  }
}

/* ============================================================================
 * 8. CANONICAL PORT REGISTRY VALIDATION
 * ----------------------------------------------------------------------------
 * Union-based compile-time coverage cannot detect duplicate tuple identities.
 *
 * Runtime validation therefore protects the explicit identity registry itself.
 * ========================================================================== */

function validateSearchRuntimePortIdentityRegistry(): void {
  if (
    SEARCH_RUNTIME_PORT_IDENTITY_SET.size !==
    XYVALA_SEARCH_RUNTIME_PORT_IDENTITIES.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_BINDINGS_MODULE_NAME}] ` +
        "Architecture violation: canonical runtime-port identity registry contains duplicate identities.",
    );
  }
}

/* ============================================================================
 * 9. COMPLETE BINDING VALIDATION
 * ----------------------------------------------------------------------------
 * Protects TypeScript and dynamically assembled JavaScript integration
 * boundaries.
 *
 * Requirements:
 * - source root must be an object;
 * - exact cardinality;
 * - every canonical port present;
 * - every canonical port callable;
 * - no undeclared port.
 *
 * No producer executes.
 * ========================================================================== */

function validateSearchRuntimeBindingSources(
  sources:
    SearchRuntimeBindingSources,
): void {
  if (
    !isRecord(
      sources,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_BINDINGS_MODULE_NAME}] ` +
        "Binding violation: SearchRuntimeBindingSources must be an object.",
    );
  }

  const actualPortNames =
    Object.keys(
      sources,
    );

  if (
    actualPortNames.length !==
    XYVALA_SEARCH_RUNTIME_PORT_IDENTITIES.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_BINDINGS_MODULE_NAME}] ` +
        "Binding violation: runtime binding cardinality differs from canonical runtime-port cardinality.",
    );
  }

  for (
    const portName of
    XYVALA_SEARCH_RUNTIME_PORT_IDENTITIES
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        sources,
        portName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_BINDINGS_MODULE_NAME}] ` +
          `Binding violation: required runtime producer ${portName} is missing.`,
      );
    }

    assertFunction(
      sources[
        portName
      ],
      `sources.${portName}`,
    );
  }

  for (
    const actualPortName of
    actualPortNames
  ) {
    if (
      !SEARCH_RUNTIME_PORT_IDENTITY_SET.has(
        actualPortName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_BINDINGS_MODULE_NAME}] ` +
          `Binding violation: undeclared runtime producer ${actualPortName} is not authorized.`,
      );
    }
  }
}

/* ============================================================================
 * 10. DIRECT STRUCTURAL BINDING
 * ----------------------------------------------------------------------------
 * SearchRuntimeBindingSources already has exactly the canonical
 * SearchRuntimePorts shape.
 *
 * Therefore the binding operation is a structural copy only.
 *
 * No second manually enumerated object mapping is maintained here.
 *
 * The copy:
 * - creates no analytical truth;
 * - executes no producer;
 * - changes no producer reference;
 * - introduces no wrapper;
 * - introduces no fallback.
 * ========================================================================== */

function buildSearchRuntimePorts(
  sources:
    SearchRuntimeBindingSources,
): SearchRuntimePorts {
  const ports = {
    ...sources,
  } satisfies SearchRuntimePorts;

  return Object.freeze(
    ports,
  );
}

/* ============================================================================
 * 11. BINDING CONSISTENCY ASSERTION
 * ----------------------------------------------------------------------------
 * Every runtime port must preserve the exact producer function reference
 * supplied to the binding boundary.
 * ========================================================================== */

function assertBindingConsistency(
  sources:
    SearchRuntimeBindingSources,

  ports:
    SearchRuntimePorts,
): void {
  for (
    const portName of
    XYVALA_SEARCH_RUNTIME_PORT_IDENTITIES
  ) {
    if (
      ports[
        portName
      ] !==
      sources[
        portName
      ]
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_BINDINGS_MODULE_NAME}] ` +
          `Binding invariant violation: ${portName} does not preserve the supplied canonical producer reference.`,
      );
    }
  }
}

/* ============================================================================
 * 12. CANONICAL BINDING API
 * ----------------------------------------------------------------------------
 * configured producer references
 * -> validate canonical identity registry
 * -> validate exact binding source surface
 * -> structural immutable binding
 * -> validate producer-reference identity preservation
 * -> SearchRuntimePorts
 *
 * No producer executes.
 * ========================================================================== */

export function bindSearchRuntimePorts(
  sources:
    SearchRuntimeBindingSources,
): SearchRuntimePorts {
  validateSearchRuntimePortIdentityRegistry();

  validateSearchRuntimeBindingSources(
    sources,
  );

  const ports =
    buildSearchRuntimePorts(
      sources,
    );

  assertBindingConsistency(
    sources,
    ports,
  );

  return ports;
}

/* ============================================================================
 * 13. BOUND RUNTIME PORT SET
 * ----------------------------------------------------------------------------
 * Structural composition wrapper only.
 *
 * No analytical state belongs here.
 * ========================================================================== */

export interface SearchRuntimeBoundPorts {
  readonly binding_module_name:
    typeof XYVALA_SEARCH_RUNTIME_BINDINGS_MODULE_NAME;

  readonly binding_module_version:
    typeof XYVALA_SEARCH_RUNTIME_BINDINGS_MODULE_VERSION;

  readonly ports:
    SearchRuntimePorts;
}

/* ============================================================================
 * 14. BOUND PORT SET FACTORY
 * ========================================================================== */

export function createSearchRuntimeBoundPorts(
  sources:
    SearchRuntimeBindingSources,
): SearchRuntimeBoundPorts {
  const ports =
    bindSearchRuntimePorts(
      sources,
    );

  return Object.freeze({
    binding_module_name:
      XYVALA_SEARCH_RUNTIME_BINDINGS_MODULE_NAME,

    binding_module_version:
      XYVALA_SEARCH_RUNTIME_BINDINGS_MODULE_VERSION,

    ports,
  });
}

/* ============================================================================
 * 15. STATIC BINDING OWNERSHIP
 * ----------------------------------------------------------------------------
 * Governance metadata only.
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_BINDING_OWNERSHIP =
  Object.freeze({
    canonical_runtime_contract_owner:
      "search-runtime-orchestrator.ts",

    complete_port_identity_registry_owner:
      "search-runtime-bindings.ts",

    producer_implementation_owner:
      "CANONICAL_SEARCH_PRODUCERS",

    adapted_producer_owner:
      "search-runtime-producer-adapters.ts",

    composition_owner:
      "search-runtime-composition.ts",

    runtime_execution_order_owner:
      "search-runtime-orchestrator.ts",

    binding_layer_executes_producers:
      false,

    binding_layer_creates_analytical_truth:
      false,

    binding_layer_selects_policy:
      false,

    binding_layer_resolves_observations:
      false,

    binding_layer_generates_identity:
      false,

    binding_layer_reads_runtime_clock:
      false,

    binding_layer_mutates_runtime:
      false,
  } as const);

/* ============================================================================
 * 16. STATIC BINDING GOVERNANCE
 * ----------------------------------------------------------------------------
 * Audit metadata only.
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_BINDING_GOVERNANCE =
  Object.freeze({
    binding_only:
      true,

    analytical_owner:
      false,

    canonical_producer:
      false,

    exact_port_coverage_required:
      true,

    exact_binding_cardinality_required:
      true,

    undeclared_binding_allowed:
      false,

    duplicate_port_identity_allowed:
      false,

    producer_execution_allowed:
      false,

    producer_reference_wrapping_allowed:
      false,

    producer_reference_substitution_allowed:
      false,

    producer_input_mutation_allowed:
      false,

    producer_output_mutation_allowed:
      false,

    producer_error_suppression_allowed:
      false,

    producer_inference_allowed:
      false,

    dynamic_producer_discovery_allowed:
      false,

    fallback_producer_allowed:
      false,

    default_producer_allowed:
      false,

    policy_selection_allowed:
      false,

    policy_fallback_allowed:
      false,

    observation_resolution_allowed:
      false,

    observation_reconstruction_allowed:
      false,

    analytical_calculation_allowed:
      false,

    analytical_reconstruction_allowed:
      false,

    availability_reinterpretation_allowed:
      false,

    unavailable_to_zero_allowed:
      false,

    unavailable_to_neutral_allowed:
      false,

    identity_generation_allowed:
      false,

    runtime_clock_access_allowed:
      false,

    random_identity_generation_allowed:
      false,

    persistence_allowed:
      false,

    event_publication_allowed:
      false,

    logging_allowed:
      false,

    direct_http_dependency_allowed:
      false,

    canonical_cohort_transport_boundary:
      "SEARCH_COHORT_BATCH",

    prohibited_shortcuts:
      Object.freeze([
        "manual_duplicate_binding_source_contract",
        "manual_duplicate_complete_port_mapping",

        "missing_binding_fallback",
        "undeclared_runtime_binding",

        "binding_layer_producer_wrapper",
        "binding_layer_producer_substitution",
        "binding_layer_producer_execution",

        "binding_layer_policy_selection",
        "binding_layer_policy_fallback",

        "binding_layer_observation_resolution",
        "binding_layer_observation_reconstruction",

        "binding_layer_analytical_calculation",
        "binding_layer_analytical_reconstruction",

        "binding_layer_distribution_identity_generation",
        "binding_layer_cohort_batch_reconstruction",
        "binding_layer_cohort_normalization",

        "binding_layer_snapshot_identity_generation",
        "binding_layer_trace_reconstruction",
        "binding_layer_variable_lineage_reconstruction",

        "unavailable_to_zero",
        "unavailable_to_neutral",

        "binding_layer_runtime_clock_access",
        "binding_layer_random_identity_generation",

        "binding_layer_persistence",
        "binding_layer_event_publication",
      ] as const),
  } as const);
