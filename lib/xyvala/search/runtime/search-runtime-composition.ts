/* ============================================================================
 * FILE: lib/xyvala/search/runtime/search-runtime-composition.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical runtime composition boundary
 *
 * ROLE
 * - compose the complete canonical Search runtime
 * - combine directly bindable canonical producers with governed producer
 *   adapters
 * - receive explicit cross-cutting Execution Plane observation capabilities
 * - validate exact runtime-port ownership
 * - validate exact direct/adapted port partition
 * - validate producer-adapter dependency completeness
 * - validate execution-observation capability completeness
 * - preserve canonical transport/governance identities
 * - bind every SearchRuntimePorts entry through the canonical binding layer
 * - create one immutable configured SearchRuntimeOrchestrator
 * - expose one controlled runtime execution surface
 *
 * CLASSIFICATION
 * - SEARCH RUNTIME COMPOSITION
 * - SEARCH DOMAIN
 * - COMPOSITION BOUNDARY
 * - DEPENDENCY BINDING
 * - VALIDATE / COMPOSE / BIND / SEAL
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING
 * - NON-TRANSFORMING
 * - NON-CALIBRATING
 * - NON-IDENTITY-PRODUCING
 * - NON-OBSERVING
 * - NON-TRACE-PRODUCING
 * - NON-LINEAGE-PRODUCING
 * - NON-MUTATING
 * - DETERMINISTIC GIVEN DETERMINISTIC DEPENDENCIES
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * Canonical direct runtime sources
 *                  +
 * governed analytical policy / observation dependencies
 *                  +
 * cross-cutting Execution Plane observation capabilities
 *                  ↓
 * search-runtime-composition.ts
 *                  ↓
 * createSearchRuntimeProducerAdapters(...)
 *                  ↓
 * SearchRuntimeBindingSources
 *                  ↓
 * search-runtime-bindings.ts
 *                  ↓
 * SearchRuntimePorts
 *                  ↓
 * search-runtime-orchestrator.ts
 *                  ↓
 * SearchPublicRankingProjection
 *                  ↓
 * Search Public API Core
 *                  ↓
 * Search Public Response Builder
 *                  ↓
 * HTTP Route
 *                  ↓
 * Interface
 *
 * THREE DISTINCT COMPOSITION DOMAINS
 * ----------------------------------------------------------------------------
 *
 * 1. DIRECT RUNTIME SOURCES
 *
 * Canonical or externally configured functions whose signatures already match
 * SearchRuntimePorts.
 *
 * They participate in the SearchRuntimePorts direct/adapted partition.
 *
 * 2. PRODUCER ADAPTER DEPENDENCIES
 *
 * Explicit analytical policies and analytical observation providers consumed
 * by canonical runtime adapters.
 *
 * They are NOT SearchRuntimePorts.
 *
 * 3. EXECUTION OBSERVATION PORTS
 *
 * Cross-cutting Execution Plane capabilities:
 *
 * observe_execution_boundary
 * -> SOURCE boundary for explicitly observed execution facts that are not
 *    produced by the analytical producer contract.
 *
 * observe_execution
 * -> TRANSPORT boundary for an already canonically assembled runtime execution
 *    observation.
 *
 * They are NOT:
 * - SearchRuntimePorts;
 * - SearchRuntimeBindingSources;
 * - analytical producer-adapter dependencies;
 * - analytical producers;
 * - trace owners;
 * - variable-lineage owners.
 *
 * This separation is mandatory.
 *
 * CANONICAL COHORT BOUNDARY
 * ----------------------------------------------------------------------------
 *
 * ELIGIBILITY_EVALUATION
 *        ↓
 * canonical SearchDistributionId
 *        ↓
 * SEARCH_COHORT_BATCH
 *        ↓
 * COHORT_NORMALIZATION
 *        ↓
 * RELATIVE_COHORT_EVALUATION
 *
 * SEARCH_COHORT_BATCH is the canonical Search transport-boundary identity.
 *
 * Composition MUST NOT introduce another identity for the same transport
 * reality.
 *
 * DISTRIBUTION IDENTITY GOVERNANCE
 * ----------------------------------------------------------------------------
 *
 * SearchDistributionId has one canonical Search producer:
 *
 * buildSearchDistributionId
 * <- search-distribution-identity-core.ts
 *
 * Bootstrap binds that producer by exact reference through:
 *
 * resolve_distribution_id
 *
 * Composition receives the already-authorized direct source.
 *
 * Composition does NOT:
 * - generate SearchDistributionId;
 * - reconstruct SearchDistributionId;
 * - derive SearchDistributionId from cohort statistics;
 * - transfer SearchDistributionId ownership to COHORT_NORMALIZATION.
 *
 * Canonical ownership remains:
 *
 * SEARCH_DISTRIBUTION_IDENTITY
 *
 * SNAPSHOT IDENTITY GOVERNANCE
 * ----------------------------------------------------------------------------
 *
 * Search snapshot_id has one canonical Search producer:
 *
 * buildSearchSnapshotId
 * <- search-snapshot-identity-core.ts
 *
 * Bootstrap binds that producer by exact reference through:
 *
 * resolve_snapshot_id
 *
 * Composition receives and binds the exact direct source.
 *
 * Canonical ownership remains:
 *
 * SEARCH_SNAPSHOT_IDENTITY
 *
 * TRACEABILITY GOVERNANCE
 * ----------------------------------------------------------------------------
 *
 * Two execution-time boundaries must remain distinct:
 *
 * A. observe_execution
 *
 * transports an already-canonical execution observation toward the authorized
 * Execution Traceability implementation.
 *
 * It does not create SearchTraceRecord here.
 *
 * B. resolve_snapshot_traceability
 *
 * retrieves/transports already-existing canonical governance truths required
 * by the private snapshot boundary:
 *
 * execution traces
 * <- EXECUTION_TRACEABILITY
 *
 * variable lineage
 * <- VARIABLE_LINEAGE_GOVERNANCE
 *
 * Composition MUST NOT:
 * - merge these owners;
 * - create synthetic TRACEABILITY_GOVERNANCE ownership;
 * - reconstruct traces;
 * - reconstruct lineage;
 * - manufacture snapshot traceability.
 *
 * PRIVATE_SNAPSHOT consumes those truths but does not own their production.
 *
 * EXECUTION OBSERVATION GOVERNANCE
 * ----------------------------------------------------------------------------
 *
 * execution_observation_ports is a cross-cutting Execution Plane dependency
 * root.
 *
 * Composition validates:
 * - exact capability identities;
 * - exact capability cardinality;
 * - callability.
 *
 * Composition does NOT:
 * - call execution-observation capabilities during composition;
 * - inspect observation payloads;
 * - source missing_data;
 * - infer validation_state;
 * - reconstruct execution confidence;
 * - materialize SearchTraceRecord;
 * - persist traces.
 *
 * The capability references are passed unchanged to the producer-adapter
 * factory.
 *
 * Currently only Anchor is authorized to consume those capabilities through
 * the adapter layer.
 *
 * Future direct-producer execution observation requires an explicit
 * Execution Plane integration contract before runtime modification.
 *
 * IMPORTANT — COMPOSITION IS NOT A PRODUCER
 * ----------------------------------------------------------------------------
 * Composition does not:
 * - acquire documents;
 * - calculate signals;
 * - calculate scores;
 * - calculate penalties;
 * - aggregate analytical truth;
 * - evaluate eligibility;
 * - generate distribution identities;
 * - assemble SearchCohortBatch locally;
 * - normalize cohorts;
 * - calculate relative cohort truth;
 * - calculate private decisions;
 * - generate snapshot identities;
 * - generate execution-observation facts;
 * - generate execution traces;
 * - reconstruct variable lineage;
 * - transform private truth;
 * - rank public candidates.
 *
 * Direct producers and adapted producers remain canonically owned elsewhere.
 *
 * Composition establishes only which authorized function or capability
 * satisfies each declared runtime/composition contract.
 *
 * CANONICAL RUNTIME PORT DOMAIN
 * ----------------------------------------------------------------------------
 *
 * search-runtime-bindings.ts owns the canonical complete SearchRuntimePorts
 * identity declaration through:
 *
 * XYVALA_SEARCH_RUNTIME_PORT_IDENTITIES
 *
 * Composition reuses that declaration.
 *
 * No second complete SearchRuntimePorts tuple is authorized.
 *
 * EXECUTION OBSERVATION CAPABILITY DOMAIN
 * ----------------------------------------------------------------------------
 *
 * search-runtime-execution-observation-ports.ts owns the canonical capability
 * set:
 *
 * XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT_NAMES
 *
 * Composition reuses that declaration.
 *
 * No second execution-observation capability registry is authorized here.
 *
 * ADAPTER PARTITION
 * ----------------------------------------------------------------------------
 *
 * Adapted runtime ports are defined by:
 *
 * SearchRuntimeProducerAdapterPorts
 *
 * Direct runtime ports are:
 *
 * SearchRuntimeBindingSources
 * MINUS
 * SearchRuntimeProducerAdapterPorts
 *
 * Therefore:
 * - adapted and direct runtime domains are disjoint;
 * - their union equals the complete SearchRuntimePorts domain;
 * - execution-observation capabilities are outside that partition.
 *
 * POLICY GOVERNANCE
 * ----------------------------------------------------------------------------
 *
 * Producer policies remain explicit dependencies.
 *
 * Composition:
 * - receives policy resolvers;
 * - validates exact presence and callability;
 * - passes them unchanged to producer adapters.
 *
 * Composition never:
 * - chooses policy values;
 * - creates a policy;
 * - supplies DEFAULT_* fallback;
 * - mutates a policy;
 * - executes calibration;
 * - interprets calibration state.
 *
 * ANALYTICAL OBSERVATION GOVERNANCE
 * ----------------------------------------------------------------------------
 *
 * Analytical observations remain provider-owned.
 *
 * Composition may bind analytical observation providers but never:
 * - invokes them during composition;
 * - fetches observations itself;
 * - reconstructs observations;
 * - creates missing observations;
 * - converts unavailable evidence to zero;
 * - converts unavailable evidence to neutral.
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchRuntimePorts
 * - SearchRuntimeBindingSources
 * - SearchRuntimeProducerAdapterPorts
 * - SearchRuntimeExecutionObservationPorts
 * - SearchRuntimeOrchestrator
 * - SearchPipelineLayer
 * - SearchTransportBoundary
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - One Canonical Producer Per Reality
 * - Minimum Input Surface Rule
 * - Availability Before Value Rule
 * - Missing Data Explicitness Rule
 * - Variable Governance System
 * - Variable Lineage Registry
 * - Execution Traceability
 * - Compute / Observe / Mutate Separation
 * - Boundary Protection System
 * - Public Exposure Governance System
 * - Ranking Governance System
 *
 * DIRECTIVES
 * - composition only
 * - canonical binding layer only
 * - canonical producer adapters only
 * - exact runtime-port coverage
 * - exact direct/adapted partition
 * - exact producer-adapter dependency coverage
 * - exact execution-observation capability coverage
 * - exact composition-root field coverage
 * - canonical governance identities only
 * - canonical transport identities only
 * - no complete runtime-port list duplication
 * - no execution-observation capability duplication
 * - no hidden fallback
 * - no partial composition
 * - no producer implementation
 * - no analytical calculation
 * - no score calculation
 * - no penalty calculation
 * - no aggregation calculation
 * - no eligibility calculation
 * - no distribution identity generation
 * - no cohort batch reconstruction
 * - no cohort normalization calculation
 * - no relative cohort calculation
 * - no private decision calculation
 * - no public transformation
 * - no public ranking
 * - no calibration execution
 * - no policy selection
 * - no analytical observation reconstruction
 * - no execution-observation reconstruction
 * - no execution-trace reconstruction
 * - no variable-lineage reconstruction
 * - no unavailable-to-zero conversion
 * - no unavailable-to-neutral conversion
 * - no Date.now()
 * - no new Date()
 * - no crypto.randomUUID()
 * - no persistence
 * - no logging
 * - no HTTP dependency
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 *
 * SearchRuntimePorts differs from SearchRuntimeBindingSources
 * => binding-contract boundary
 *
 * canonical runtime port lacks ownership/responsibility declaration
 * => composition governance boundary
 *
 * adapted runtime port lacks adapter ownership
 * => producer-adapter boundary
 *
 * adapter ownership disagrees with runtime responsibility
 * => composition/adapter ownership divergence
 *
 * direct and adapted runtime port domains overlap
 * => composition partition violation
 *
 * required direct producer missing
 * => application configuration boundary
 *
 * undeclared direct producer supplied
 * => application configuration boundary
 *
 * producer-adapter dependency missing
 * => producer-adapter configuration boundary
 *
 * undeclared producer-adapter dependency supplied
 * => producer-adapter configuration boundary
 *
 * execution-observation capability missing
 * => Execution Plane configuration boundary
 *
 * undeclared execution-observation capability supplied
 * => Execution Plane configuration boundary
 *
 * execution-observation capability inserted into SearchRuntimePorts
 * => analytical/execution boundary violation
 *
 * execution-observation capability inserted into analytical adapter
 * dependencies
 * => dependency ownership violation
 *
 * resolve_distribution_id absent
 * => SEARCH_DISTRIBUTION_IDENTITY runtime binding boundary
 *
 * resolve_snapshot_id absent
 * => SEARCH_SNAPSHOT_IDENTITY runtime binding boundary
 *
 * build_cohort_batch absent
 * => SEARCH_COHORT_BATCH transport boundary
 *
 * local distribution identity generation
 * => composition ownership violation
 *
 * local snapshot identity generation
 * => composition ownership violation
 *
 * local SearchCohortBatch assembly
 * => composition ownership violation
 *
 * synthetic TRACEABILITY_GOVERNANCE ownership introduced
 * => governance identity divergence
 *
 * local execution-observation reconstruction
 * => Execution Plane ownership violation
 *
 * local execution trace creation
 * => EXECUTION_TRACEABILITY ownership violation
 *
 * local variable-lineage reconstruction
 * => VARIABLE_LINEAGE_GOVERNANCE ownership violation
 *
 * local analytical calculation
 * => composition ownership violation
 *
 * runtime clock / random identity usage
 * => composition ownership violation
 *
 * INVARIANTS
 * ----------------------------------------------------------------------------
 * - SearchRuntimePorts and SearchRuntimeBindingSources have identical key sets
 * - every runtime port has explicit canonical responsibility
 * - every adapted runtime port has explicit adapter ownership
 * - adapter ownership and runtime responsibility agree
 * - direct and adapted runtime port sets are disjoint
 * - direct + adapted runtime ports exactly cover SearchRuntimePorts
 * - execution-observation capabilities remain outside SearchRuntimePorts
 * - producer-adapter dependency registry is exact and duplicate-free
 * - execution-observation capability registry is exact and duplicate-free
 * - composition-root field registry is exact and duplicate-free
 * - no missing direct producer receives a fallback
 * - no missing adapted producer receives a fallback
 * - no missing adapter dependency receives a fallback
 * - no missing execution-observation capability receives a fallback
 * - producer functions never execute during composition
 * - observation capabilities never execute during composition
 * - producer results are never modified during composition
 * - direct producer references remain unchanged through composition
 * - execution-observation capability references remain unchanged
 * - SEARCH_DISTRIBUTION_IDENTITY remains distribution identity owner
 * - SEARCH_SNAPSHOT_IDENTITY remains snapshot identity owner
 * - SEARCH_COHORT_BATCH remains cohort transport owner
 * - COHORT_NORMALIZATION remains distribution producer
 * - EXECUTION_TRACEABILITY remains execution trace owner
 * - VARIABLE_LINEAGE_GOVERNANCE remains lineage owner
 * - runtime execution order remains orchestrator-owned
 * - no runtime clock is read
 * - no random identity is generated
 * ========================================================================== */

import type {
  SearchModuleVersion,
  SearchPipelineLayer,
  SearchPublicRankingProjection,
  SearchTransportBoundary,
} from "../contracts/search-pipeline-contract";

import {
  bindSearchRuntimePorts,
  XYVALA_SEARCH_RUNTIME_PORT_IDENTITIES,
} from "./search-runtime-bindings";

import type {
  SearchRuntimeBindingSources,
} from "./search-runtime-bindings";

import {
  createSearchRuntimeProducerAdapters,
  XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_OWNERSHIP,
} from "./search-runtime-producer-adapters";

import type {
  SearchRuntimeProducerAdapterDependencies,
  SearchRuntimeProducerAdapterPorts,
} from "./search-runtime-producer-adapters";

import {
  XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT_NAMES,
} from "./search-runtime-execution-observation-ports";

import type {
  SearchRuntimeExecutionObservationPorts,
} from "./search-runtime-execution-observation-ports";

import {
  createSearchRuntimeOrchestrator,
} from "./search-runtime-orchestrator";

import type {
  SearchRuntimeInput,
  SearchRuntimeOrchestrator,
  SearchRuntimePorts,
} from "./search-runtime-orchestrator";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME =
  "xyvala-search-runtime-composition" as const;

export const XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_VERSION:
  SearchModuleVersion =
    "1.4.0";

/* ============================================================================
 * 2. RUNTIME PORT DOMAIN
 * ========================================================================== */

export type SearchRuntimePortName =
  keyof SearchRuntimePorts;

export type SearchRuntimeBindingPortName =
  keyof SearchRuntimeBindingSources;

/* ============================================================================
 * 3. PORT CONTRACT EQUIVALENCE
 * ----------------------------------------------------------------------------
 * Compile-time Contract Before Runtime protection.
 *
 * SearchRuntimePorts and SearchRuntimeBindingSources must expose exactly the
 * same property identities.
 * ========================================================================== */

type SearchRuntimePortsMissingFromBindings =
  Exclude<
    SearchRuntimePortName,
    SearchRuntimeBindingPortName
  >;

type SearchRuntimeBindingsMissingFromPorts =
  Exclude<
    SearchRuntimeBindingPortName,
    SearchRuntimePortName
  >;

type SearchRuntimePortContractsAreEquivalent =
  [
    SearchRuntimePortsMissingFromBindings,
    SearchRuntimeBindingsMissingFromPorts,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_RUNTIME_PORT_CONTRACTS_ARE_EQUIVALENT:
  SearchRuntimePortContractsAreEquivalent =
    true;

void XYVALA_SEARCH_RUNTIME_PORT_CONTRACTS_ARE_EQUIVALENT;

/* ============================================================================
 * 4. ADAPTED / DIRECT RUNTIME PORT DOMAIN
 * ----------------------------------------------------------------------------
 * Execution-observation capabilities are intentionally absent from this
 * partition.
 * ========================================================================== */

export type SearchRuntimeAdaptedPortName =
  keyof SearchRuntimeProducerAdapterPorts;

export type SearchRuntimeDirectPortName =
  Exclude<
    SearchRuntimeBindingPortName,
    SearchRuntimeAdaptedPortName
  >;

export type SearchRuntimeDirectBindingSources =
  Pick<
    SearchRuntimeBindingSources,
    SearchRuntimeDirectPortName
  >;

/* ============================================================================
 * 5. ADAPTER OWNERSHIP EXACTNESS
 * ========================================================================== */

type SearchRuntimeDeclaredAdapterPortName =
  keyof typeof XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_OWNERSHIP;

type SearchRuntimeAdapterOwnershipMissingPort =
  Exclude<
    SearchRuntimeAdaptedPortName,
    SearchRuntimeDeclaredAdapterPortName
  >;

type SearchRuntimeAdapterOwnershipUnknownPort =
  Exclude<
    SearchRuntimeDeclaredAdapterPortName,
    SearchRuntimeAdaptedPortName
  >;

type SearchRuntimeAdapterOwnershipIsExact =
  [
    SearchRuntimeAdapterOwnershipMissingPort,
    SearchRuntimeAdapterOwnershipUnknownPort,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_RUNTIME_ADAPTER_OWNERSHIP_IS_EXACT:
  SearchRuntimeAdapterOwnershipIsExact =
    true;

void XYVALA_SEARCH_RUNTIME_ADAPTER_OWNERSHIP_IS_EXACT;

/* ============================================================================
 * 6. DIRECT / ADAPTED RUNTIME PORT PARTITION EXACTNESS
 * ========================================================================== */

type SearchRuntimeDirectAdaptedOverlap =
  Extract<
    SearchRuntimeDirectPortName,
    SearchRuntimeAdaptedPortName
  >;

type SearchRuntimePortPartitionMissingPort =
  Exclude<
    SearchRuntimeBindingPortName,
    | SearchRuntimeDirectPortName
    | SearchRuntimeAdaptedPortName
  >;

type SearchRuntimePortPartitionIsExact =
  [
    SearchRuntimeDirectAdaptedOverlap,
    SearchRuntimePortPartitionMissingPort,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_RUNTIME_PORT_PARTITION_IS_EXACT:
  SearchRuntimePortPartitionIsExact =
    true;

void XYVALA_SEARCH_RUNTIME_PORT_PARTITION_IS_EXACT;

/* ============================================================================
 * 7. RUNTIME PORT RESPONSIBILITY DOMAIN
 * ----------------------------------------------------------------------------
 * Most runtime ports correspond to one canonical SearchPipelineLayer.
 *
 * Certain runtime ports instead expose:
 * - a canonical transport boundary;
 * - a canonical identity execution boundary;
 * - cross-cutting governance transport.
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * "DISTRIBUTION_IDENTITY" and "SNAPSHOT_IDENTITY" below are runtime
 * responsibility categories.
 *
 * Canonical truth ownership remains:
 * - SEARCH_DISTRIBUTION_IDENTITY
 * - SEARCH_SNAPSHOT_IDENTITY
 *
 * Traceability remains two distinct governance owners.
 * ========================================================================== */

export type SearchRuntimeIdentityResponsibility =
  | "DISTRIBUTION_IDENTITY"
  | "SNAPSHOT_IDENTITY";

export type SearchRuntimeTraceabilityResponsibility =
  readonly [
    "EXECUTION_TRACEABILITY",
    "VARIABLE_LINEAGE_GOVERNANCE",
  ];

export type SearchRuntimePortResponsibility =
  | SearchPipelineLayer
  | SearchTransportBoundary
  | SearchRuntimeIdentityResponsibility
  | SearchRuntimeTraceabilityResponsibility;

/* ============================================================================
 * 8. CANONICAL RUNTIME PORT RESPONSIBILITY
 * ----------------------------------------------------------------------------
 * Static governance metadata only.
 *
 * This declaration does not transfer analytical or identity ownership.
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_PORT_OWNERSHIP =
  Object.freeze({
    acquire_documents:
      "ACQUISITION",

    extract_document:
      "EXTRACTION",

    segment_document:
      "SEGMENTATION",

    analyze_lexical_document:
      "LEXICAL_ANALYSIS",

    detect_frequency_signals:
      "FREQUENCY_SIGNAL_DETECTION",

    detect_anchor_signals:
      "ANCHOR_SIGNAL_DETECTION",

    aggregate_context:
      "CONTEXT_AGGREGATION",

    detect_link_signals:
      "LINK_SIGNAL_DETECTION",

    detect_temporal_signals:
      "TEMPORAL_SIGNAL_DETECTION",

    detect_behavioral_signals:
      "BEHAVIORAL_SIGNAL_DETECTION",

    /*
     * Consolidated runtime entrypoint:
     *
     * QUERY_NORMALIZATION
     * -> QUERY_PROFILING
     *
     * Returned canonical truth:
     * SearchQueryProfile
     */
    analyze_query:
      "QUERY_PROFILING",

    detect_query_document_signals:
      "QUERY_DOCUMENT_SIGNAL_DETECTION",

    score_intrinsic_document:
      "INTRINSIC_DOCUMENT_SCORING",

    score_temporal_document:
      "TEMPORAL_DOCUMENT_SCORING",

    score_query_relevance:
      "QUERY_RELEVANCE_SCORING",

    score_link_authority:
      "LINK_AUTHORITY_SCORING",

    score_behavioral_calibration:
      "BEHAVIORAL_CALIBRATION_SCORING",

    assemble_positive_score_vector:
      "POSITIVE_SCORE_ASSEMBLY",

    evaluate_penalties:
      "PENALTY_EVALUATION",

    aggregate_analytical_score:
      "ANALYTICAL_AGGREGATION",

    evaluate_eligibility:
      "ELIGIBILITY_EVALUATION",

    /*
     * Runtime responsibility category only.
     *
     * Canonical producer:
     * buildSearchDistributionId
     *
     * Canonical owner:
     * SEARCH_DISTRIBUTION_IDENTITY
     */
    resolve_distribution_id:
      "DISTRIBUTION_IDENTITY",

    /*
     * Canonical transport boundary:
     * SearchTransportBoundary = "SEARCH_COHORT_BATCH"
     */
    build_cohort_batch:
      "SEARCH_COHORT_BATCH",

    normalize_cohort:
      "COHORT_NORMALIZATION",

    evaluate_relative_cohort:
      "RELATIVE_COHORT_EVALUATION",

    resolve_private_decision:
      "PRIVATE_DECISION",

    /*
     * Runtime responsibility category only.
     *
     * Canonical producer:
     * buildSearchSnapshotId
     *
     * Canonical owner:
     * SEARCH_SNAPSHOT_IDENTITY
     */
    resolve_snapshot_id:
      "SNAPSHOT_IDENTITY",

    /*
     * One runtime resolver transports two separately owned canonical
     * governance truths.
     *
     * No synthetic TRACEABILITY_GOVERNANCE owner is introduced.
     */
    resolve_snapshot_traceability:
      Object.freeze([
        "EXECUTION_TRACEABILITY",
        "VARIABLE_LINEAGE_GOVERNANCE",
      ] as const),

    build_private_snapshot:
      "PRIVATE_SNAPSHOT",

    transform_public_result:
      "TRANSFORMATION",

    rank_public_results:
      "PUBLIC_RANKING",
  } as const satisfies Readonly<
    Record<
      SearchRuntimePortName,
      SearchRuntimePortResponsibility
    >
  >);

/* ============================================================================
 * 9. CANONICAL COMPLETE RUNTIME PORT IDENTITIES
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_PORT_NAMES =
  XYVALA_SEARCH_RUNTIME_PORT_IDENTITIES;

/* ============================================================================
 * 10. SAFE STRING ORDER / UNIQUENESS
 * ========================================================================== */

function assertUniqueStringCollection(
  values:
    readonly string[],

  fieldName:
    string,
): void {
  const seen =
    new Set<string>();

  for (
    const value of
    values
  ) {
    if (
      seen.has(
        value,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Architecture violation: ${fieldName} contains duplicate identity ${value}.`,
      );
    }

    seen.add(
      value,
    );
  }
}

/* ============================================================================
 * 11. ADAPTED RUNTIME PORT NAME SET
 * ========================================================================== */

const SEARCH_RUNTIME_ADAPTED_PORT_NAME_SET:
  ReadonlySet<string> =
    new Set<string>(
      Object.keys(
        XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_OWNERSHIP,
      ),
    );

/* ============================================================================
 * 12. ADAPTED RUNTIME PORT TYPE GUARD
 * ========================================================================== */

function isSearchRuntimeAdaptedPortName(
  portName:
    SearchRuntimePortName,
): portName is SearchRuntimeAdaptedPortName {
  return SEARCH_RUNTIME_ADAPTED_PORT_NAME_SET.has(
    portName,
  );
}

/* ============================================================================
 * 13. ADAPTED RUNTIME PORT IDENTITIES
 * ----------------------------------------------------------------------------
 * Preserve canonical complete runtime-port order.
 *
 * Adapter metadata insertion order is deliberately not used as the canonical
 * ordering source.
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_ADAPTED_PORT_NAMES =
  Object.freeze(
    XYVALA_SEARCH_RUNTIME_PORT_NAMES.filter(
      (
        portName,
      ): portName is SearchRuntimeAdaptedPortName =>
        isSearchRuntimeAdaptedPortName(
          portName,
        ),
    ),
  );

/* ============================================================================
 * 14. DIRECT RUNTIME PORT IDENTITIES
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_DIRECT_PORT_NAMES =
  Object.freeze(
    XYVALA_SEARCH_RUNTIME_PORT_NAMES.filter(
      (
        portName,
      ): portName is SearchRuntimeDirectPortName =>
        !isSearchRuntimeAdaptedPortName(
          portName,
        ),
    ),
  );

/* ============================================================================
 * 15. RUNTIME PORT NAME SETS
 * ========================================================================== */

const SEARCH_RUNTIME_PORT_NAME_SET:
  ReadonlySet<string> =
    new Set<string>(
      XYVALA_SEARCH_RUNTIME_PORT_NAMES,
    );

const SEARCH_RUNTIME_DIRECT_PORT_NAME_SET:
  ReadonlySet<string> =
    new Set<string>(
      XYVALA_SEARCH_RUNTIME_DIRECT_PORT_NAMES,
    );

/* ============================================================================
 * 16. PRODUCER ADAPTER DEPENDENCY IDENTITIES
 * ----------------------------------------------------------------------------
 * Runtime-validation registry only.
 *
 * SearchRuntimeProducerAdapterDependencies remains the canonical analytical
 * dependency contract.
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * Execution Plane capabilities MUST NOT be added here.
 *
 * Specifically forbidden:
 * - observe_execution_boundary
 * - observe_execution
 *
 * Those belong exclusively to SearchRuntimeExecutionObservationPorts.
 *
 * This registry exists because TypeScript interfaces are erased at runtime.
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCY_NAMES =
  Object.freeze([
    "resolve_anchor_detection_policy",

    "resolve_link_observations",
    "resolve_link_signals_policy",

    "resolve_temporal_observations",
    "resolve_temporal_signals_policy",

    "resolve_behavioral_observation_evidence",
    "resolve_behavioral_signals_policy",

    "resolve_query_analysis_policy",

    "resolve_query_document_signals_policy",

    "resolve_intrinsic_document_scoring_policy",

    "resolve_temporal_document_scoring_policy",

    "resolve_query_relevance_scoring_policy",

    "resolve_link_authority_scoring_policy",

    "resolve_behavioral_calibration_scoring_policy",

    "resolve_penalty_evaluation_policy",

    "resolve_analytical_aggregation_policy",

    "resolve_eligibility_evaluation_policy",

    "resolve_cohort_normalization_policy",

    "resolve_relative_cohort_evaluation_policy",

    "resolve_private_decision_policy",

    "resolve_public_transformation_policy",

    "resolve_public_ranking_policy",
  ] as const satisfies readonly (
    keyof SearchRuntimeProducerAdapterDependencies
  )[]);

/* ============================================================================
 * 17. PRODUCER ADAPTER DEPENDENCY COVERAGE
 * ========================================================================== */

type SearchRuntimeProducerAdapterDependencyName =
  keyof SearchRuntimeProducerAdapterDependencies;

type SearchRuntimeDeclaredProducerAdapterDependencyName =
  (
    typeof XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCY_NAMES
  )[number];

type SearchRuntimeMissingProducerAdapterDependency =
  Exclude<
    SearchRuntimeProducerAdapterDependencyName,
    SearchRuntimeDeclaredProducerAdapterDependencyName
  >;

type SearchRuntimeUnknownProducerAdapterDependency =
  Exclude<
    SearchRuntimeDeclaredProducerAdapterDependencyName,
    SearchRuntimeProducerAdapterDependencyName
  >;

type SearchRuntimeProducerAdapterDependencyCoverageIsExact =
  [
    SearchRuntimeMissingProducerAdapterDependency,
    SearchRuntimeUnknownProducerAdapterDependency,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCY_COVERAGE_IS_EXACT:
  SearchRuntimeProducerAdapterDependencyCoverageIsExact =
    true;

void XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCY_COVERAGE_IS_EXACT;

const SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCY_NAME_SET:
  ReadonlySet<string> =
    new Set<string>(
      XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCY_NAMES,
    );

/* ============================================================================
 * 18. EXECUTION OBSERVATION CAPABILITY DOMAIN
 * ----------------------------------------------------------------------------
 * Canonical identities come exclusively from:
 *
 * search-runtime-execution-observation-ports.ts
 *
 * No second capability tuple is declared here.
 * ========================================================================== */

const SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT_NAME_SET:
  ReadonlySet<string> =
    new Set<string>(
      XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT_NAMES,
    );

/* ============================================================================
 * 19. COMPOSITION INPUT
 * ----------------------------------------------------------------------------
 * Three distinct dependency roots.
 *
 * No cross-domain flattening is authorized.
 * ========================================================================== */

export interface SearchRuntimeCompositionInput {
  readonly direct_sources:
    SearchRuntimeDirectBindingSources;

  readonly producer_adapter_dependencies:
    SearchRuntimeProducerAdapterDependencies;

  readonly execution_observation_ports:
    SearchRuntimeExecutionObservationPorts;
}

/* ============================================================================
 * 20. COMPOSITION INPUT FIELD IDENTITIES
 * ----------------------------------------------------------------------------
 * Exact root-contract registry.
 *
 * Any future root dependency addition requires explicit architecture review.
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_COMPOSITION_INPUT_FIELD_NAMES =
  Object.freeze([
    "direct_sources",
    "producer_adapter_dependencies",
    "execution_observation_ports",
  ] as const satisfies readonly (
    keyof SearchRuntimeCompositionInput
  )[]);

type SearchRuntimeCompositionInputFieldName =
  keyof SearchRuntimeCompositionInput;

type SearchRuntimeDeclaredCompositionInputFieldName =
  (
    typeof XYVALA_SEARCH_RUNTIME_COMPOSITION_INPUT_FIELD_NAMES
  )[number];

type SearchRuntimeMissingCompositionInputField =
  Exclude<
    SearchRuntimeCompositionInputFieldName,
    SearchRuntimeDeclaredCompositionInputFieldName
  >;

type SearchRuntimeUnknownCompositionInputField =
  Exclude<
    SearchRuntimeDeclaredCompositionInputFieldName,
    SearchRuntimeCompositionInputFieldName
  >;

type SearchRuntimeCompositionInputFieldCoverageIsExact =
  [
    SearchRuntimeMissingCompositionInputField,
    SearchRuntimeUnknownCompositionInputField,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_RUNTIME_COMPOSITION_INPUT_FIELD_COVERAGE_IS_EXACT:
  SearchRuntimeCompositionInputFieldCoverageIsExact =
    true;

void XYVALA_SEARCH_RUNTIME_COMPOSITION_INPUT_FIELD_COVERAGE_IS_EXACT;

const SEARCH_RUNTIME_COMPOSITION_INPUT_FIELD_NAME_SET:
  ReadonlySet<string> =
    new Set<string>(
      XYVALA_SEARCH_RUNTIME_COMPOSITION_INPUT_FIELD_NAMES,
    );

/* ============================================================================
 * 21. COMPOSITION RESULT
 * ----------------------------------------------------------------------------
 * Individual producer ports remain hidden.
 *
 * Runtime execution remains orchestrator-owned.
 * ========================================================================== */

export interface SearchRuntimeComposition {
  readonly module_name:
    typeof XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME;

  readonly module_version:
    SearchModuleVersion;

  readonly orchestrator:
    SearchRuntimeOrchestrator;

  readonly run:
    (
      input:
        SearchRuntimeInput,
    ) =>
      Promise<SearchPublicRankingProjection>;
}

/* ============================================================================
 * 22. SAFE RECORD GUARD
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
 * 23. SAFE FUNCTION ASSERTION
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
      `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
        `Composition violation: ${fieldName} must be a function.`,
    );
  }
}

/* ============================================================================
 * 24. COMPLETE RUNTIME PORT IDENTITY VALIDATION
 * ========================================================================== */

function validateCanonicalRuntimePortIdentities(): void {
  assertUniqueStringCollection(
    XYVALA_SEARCH_RUNTIME_PORT_NAMES,
    "XYVALA_SEARCH_RUNTIME_PORT_NAMES",
  );

  if (
    SEARCH_RUNTIME_PORT_NAME_SET.size !==
    XYVALA_SEARCH_RUNTIME_PORT_NAMES.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
        "Architecture violation: canonical runtime-port identity registry is not unique.",
    );
  }
}

/* ============================================================================
 * 25. RUNTIME PORT RESPONSIBILITY VALIDATION
 * ========================================================================== */

function validateRuntimePortOwnershipDeclaration(): void {
  const ownershipKeys =
    Object.keys(
      XYVALA_SEARCH_RUNTIME_PORT_OWNERSHIP,
    );

  assertUniqueStringCollection(
    ownershipKeys,
    "XYVALA_SEARCH_RUNTIME_PORT_OWNERSHIP",
  );

  if (
    ownershipKeys.length !==
    XYVALA_SEARCH_RUNTIME_PORT_NAMES.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
        "Architecture violation: runtime-port ownership cardinality differs " +
        "from canonical runtime-port cardinality.",
    );
  }

  for (
    const portName of
    XYVALA_SEARCH_RUNTIME_PORT_NAMES
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        XYVALA_SEARCH_RUNTIME_PORT_OWNERSHIP,
        portName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Architecture violation: runtime port ${portName} has no ownership declaration.`,
      );
    }

    const responsibility =
      XYVALA_SEARCH_RUNTIME_PORT_OWNERSHIP[
        portName
      ];

    if (
      Array.isArray(
        responsibility,
      )
    ) {
      if (
        responsibility.length !==
          2 ||
        responsibility[0] !==
          "EXECUTION_TRACEABILITY" ||
        responsibility[1] !==
          "VARIABLE_LINEAGE_GOVERNANCE"
      ) {
        throw new Error(
          `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
            `Architecture violation: runtime port ${portName} exposes invalid traceability governance ownership.`,
        );
      }

      continue;
    }

    if (
      typeof responsibility !==
        "string" ||
      responsibility.trim().length ===
        0
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Architecture violation: runtime port ${portName} has no explicit canonical responsibility.`,
      );
    }
  }

  for (
    const ownershipKey of
    ownershipKeys
  ) {
    if (
      !SEARCH_RUNTIME_PORT_NAME_SET.has(
        ownershipKey,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Architecture violation: ownership declaration contains unknown runtime port ${ownershipKey}.`,
      );
    }
  }
}

/* ============================================================================
 * 26. ADAPTER OWNERSHIP VALIDATION
 * ----------------------------------------------------------------------------
 * Adapter ownership must:
 * - cover exactly SearchRuntimeProducerAdapterPorts;
 * - agree with complete runtime responsibility declaration.
 * ========================================================================== */

function validateProducerAdapterOwnershipDeclaration(): void {
  const ownershipKeys =
    Object.keys(
      XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_OWNERSHIP,
    );

  assertUniqueStringCollection(
    ownershipKeys,
    "XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_OWNERSHIP",
  );

  if (
    ownershipKeys.length !==
    XYVALA_SEARCH_RUNTIME_ADAPTED_PORT_NAMES.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
        "Architecture violation: producer-adapter ownership cardinality is inconsistent.",
    );
  }

  for (
    const portName of
    XYVALA_SEARCH_RUNTIME_ADAPTED_PORT_NAMES
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_OWNERSHIP,
        portName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Architecture violation: adapted runtime port ${portName} lacks adapter ownership.`,
      );
    }

    const adapterOwner =
      XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_OWNERSHIP[
        portName
      ];

    const runtimeOwner =
      XYVALA_SEARCH_RUNTIME_PORT_OWNERSHIP[
        portName
      ];

    if (
      Array.isArray(
        runtimeOwner,
      ) ||
      adapterOwner !==
        runtimeOwner
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Architecture violation: adapted runtime port ${portName} ownership diverges between adapter and composition declarations.`,
      );
    }
  }

  for (
    const ownershipKey of
    ownershipKeys
  ) {
    if (
      !SEARCH_RUNTIME_ADAPTED_PORT_NAME_SET.has(
        ownershipKey,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Architecture violation: producer-adapter ownership contains undeclared adapted port ${ownershipKey}.`,
      );
    }
  }
}

/* ============================================================================
 * 27. DIRECT / ADAPTED RUNTIME PORT PARTITION VALIDATION
 * ========================================================================== */

function validateRuntimePortPartition(): void {
  assertUniqueStringCollection(
    XYVALA_SEARCH_RUNTIME_ADAPTED_PORT_NAMES,
    "XYVALA_SEARCH_RUNTIME_ADAPTED_PORT_NAMES",
  );

  assertUniqueStringCollection(
    XYVALA_SEARCH_RUNTIME_DIRECT_PORT_NAMES,
    "XYVALA_SEARCH_RUNTIME_DIRECT_PORT_NAMES",
  );

  if (
    XYVALA_SEARCH_RUNTIME_DIRECT_PORT_NAMES.length +
      XYVALA_SEARCH_RUNTIME_ADAPTED_PORT_NAMES.length !==
    XYVALA_SEARCH_RUNTIME_PORT_NAMES.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
        "Architecture violation: direct/adapted runtime-port cardinality " +
        "does not cover canonical runtime ports exactly.",
    );
  }

  for (
    const portName of
    XYVALA_SEARCH_RUNTIME_ADAPTED_PORT_NAMES
  ) {
    if (
      SEARCH_RUNTIME_DIRECT_PORT_NAME_SET.has(
        portName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Architecture violation: runtime port ${portName} belongs to both direct and adapted domains.`,
      );
    }
  }

  for (
    const portName of
    XYVALA_SEARCH_RUNTIME_PORT_NAMES
  ) {
    const direct =
      SEARCH_RUNTIME_DIRECT_PORT_NAME_SET.has(
        portName,
      );

    const adapted =
      SEARCH_RUNTIME_ADAPTED_PORT_NAME_SET.has(
        portName,
      );

    if (
      direct ===
      adapted
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Architecture violation: runtime port ${portName} must belong to exactly one of direct/adapted domains.`,
      );
    }
  }
}

/* ============================================================================
 * 28. DIRECT BINDING SOURCE VALIDATION
 * ========================================================================== */

function validateDirectBindingSources(
  directSources:
    SearchRuntimeDirectBindingSources,
): void {
  if (
    !isRecord(
      directSources,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
        "Composition violation: direct_sources must be an object.",
    );
  }

  const actualNames =
    Object.keys(
      directSources,
    );

  assertUniqueStringCollection(
    actualNames,
    "direct_sources",
  );

  if (
    actualNames.length !==
    XYVALA_SEARCH_RUNTIME_DIRECT_PORT_NAMES.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
        "Composition violation: direct-source cardinality differs from " +
        "the canonical direct runtime-port domain.",
    );
  }

  for (
    const expectedPortName of
    XYVALA_SEARCH_RUNTIME_DIRECT_PORT_NAMES
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        directSources,
        expectedPortName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Composition violation: required direct runtime producer ${expectedPortName} is missing.`,
      );
    }

    assertFunction(
      directSources[
        expectedPortName
      ],
      `direct_sources.${expectedPortName}`,
    );
  }

  for (
    const actualName of
    actualNames
  ) {
    if (
      !SEARCH_RUNTIME_DIRECT_PORT_NAME_SET.has(
        actualName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Composition violation: undeclared direct runtime producer ${actualName} is not authorized.`,
      );
    }
  }
}

/* ============================================================================
 * 29. PRODUCER ADAPTER DEPENDENCY REGISTRY VALIDATION
 * ========================================================================== */

function validateProducerAdapterDependencyRegistry(): void {
  assertUniqueStringCollection(
    XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCY_NAMES,
    "XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCY_NAMES",
  );

  if (
    SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCY_NAME_SET.size !==
    XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCY_NAMES.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
        "Architecture violation: producer-adapter dependency identity registry contains duplicates.",
    );
  }
}

/* ============================================================================
 * 30. PRODUCER ADAPTER DEPENDENCY VALIDATION
 * ----------------------------------------------------------------------------
 * Resolver/provider functions are validated only for:
 * - exact identity presence;
 * - absence of undeclared keys;
 * - callability.
 *
 * They are never invoked during composition.
 * ========================================================================== */

function validateProducerAdapterDependencies(
  dependencies:
    SearchRuntimeProducerAdapterDependencies,
): void {
  if (
    !isRecord(
      dependencies,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
        "Composition violation: producer_adapter_dependencies must be an object.",
    );
  }

  const actualNames =
    Object.keys(
      dependencies,
    );

  assertUniqueStringCollection(
    actualNames,
    "producer_adapter_dependencies",
  );

  if (
    actualNames.length !==
    XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCY_NAMES.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
        "Composition violation: producer-adapter dependency cardinality is inconsistent.",
    );
  }

  for (
    const dependencyName of
    XYVALA_SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCY_NAMES
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        dependencies,
        dependencyName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Composition violation: producer-adapter dependency ${dependencyName} is missing.`,
      );
    }

    assertFunction(
      dependencies[
        dependencyName
      ],
      `producer_adapter_dependencies.${dependencyName}`,
    );
  }

  for (
    const actualName of
    actualNames
  ) {
    if (
      !SEARCH_RUNTIME_PRODUCER_ADAPTER_DEPENDENCY_NAME_SET.has(
        actualName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Composition violation: undeclared producer-adapter dependency ${actualName} is not authorized.`,
      );
    }
  }
}

/* ============================================================================
 * 31. EXECUTION OBSERVATION CAPABILITY REGISTRY VALIDATION
 * ----------------------------------------------------------------------------
 * The canonical capability tuple is imported.
 *
 * Composition validates uniqueness only.
 *
 * It does not redefine the capability domain.
 * ========================================================================== */

function validateExecutionObservationPortRegistry(): void {
  assertUniqueStringCollection(
    XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT_NAMES,
    "XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT_NAMES",
  );

  if (
    SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT_NAME_SET.size !==
    XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT_NAMES.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
        "Architecture violation: execution-observation capability registry contains duplicates.",
    );
  }
}

/* ============================================================================
 * 32. EXECUTION OBSERVATION CAPABILITY VALIDATION
 * ----------------------------------------------------------------------------
 * Validation only.
 *
 * No capability executes here.
 *
 * No observation payload is inspected.
 * No execution fact is reconstructed.
 * ========================================================================== */

function validateExecutionObservationPorts(
  ports:
    SearchRuntimeExecutionObservationPorts,
): void {
  if (
    !isRecord(
      ports,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
        "Composition violation: execution_observation_ports must be an object.",
    );
  }

  const actualNames =
    Object.keys(
      ports,
    );

  assertUniqueStringCollection(
    actualNames,
    "execution_observation_ports",
  );

  if (
    actualNames.length !==
    XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT_NAMES.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
        "Composition violation: execution-observation capability cardinality is inconsistent.",
    );
  }

  for (
    const capabilityName of
    XYVALA_SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT_NAMES
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        ports,
        capabilityName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Composition violation: execution-observation capability ${capabilityName} is missing.`,
      );
    }

    assertFunction(
      ports[
        capabilityName
      ],
      `execution_observation_ports.${capabilityName}`,
    );
  }

  for (
    const actualName of
    actualNames
  ) {
    if (
      !SEARCH_RUNTIME_EXECUTION_OBSERVATION_PORT_NAME_SET.has(
        actualName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Composition violation: undeclared execution-observation capability ${actualName} is not authorized.`,
      );
    }
  }
}

/* ============================================================================
 * 33. ADAPTED PRODUCER PORT VALIDATION
 * ========================================================================== */

function validateAdaptedProducerPorts(
  adaptedPorts:
    SearchRuntimeProducerAdapterPorts,
): void {
  if (
    !isRecord(
      adaptedPorts,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
        "Composition violation: adapted producer ports must be an object.",
    );
  }

  const actualNames =
    Object.keys(
      adaptedPorts,
    );

  assertUniqueStringCollection(
    actualNames,
    "adapted_ports",
  );

  if (
    actualNames.length !==
    XYVALA_SEARCH_RUNTIME_ADAPTED_PORT_NAMES.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
        "Composition violation: adapted producer-port cardinality is inconsistent.",
    );
  }

  for (
    const portName of
    XYVALA_SEARCH_RUNTIME_ADAPTED_PORT_NAMES
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        adaptedPorts,
        portName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Composition violation: adapted runtime producer ${portName} is missing.`,
      );
    }

    assertFunction(
      adaptedPorts[
        portName
      ],
      `adapted_ports.${portName}`,
    );
  }

  for (
    const actualName of
    actualNames
  ) {
    if (
      !SEARCH_RUNTIME_ADAPTED_PORT_NAME_SET.has(
        actualName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Composition violation: adapted producer ${actualName} is outside the canonical adapted-port domain.`,
      );
    }
  }
}

/* ============================================================================
 * 34. COMPLETE RUNTIME BINDING SOURCE VALIDATION
 * ----------------------------------------------------------------------------
 * Used by:
 * - canonical composition path;
 * - defineSearchRuntimePorts() advanced integration path.
 *
 * Execution-observation capabilities are deliberately absent.
 * ========================================================================== */

function validateCompleteBindingSources(
  sources:
    SearchRuntimeBindingSources,
): void {
  if (
    !isRecord(
      sources,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
        "Composition violation: complete runtime binding sources must be an object.",
    );
  }

  const actualNames =
    Object.keys(
      sources,
    );

  assertUniqueStringCollection(
    actualNames,
    "runtime_binding_sources",
  );

  if (
    actualNames.length !==
    XYVALA_SEARCH_RUNTIME_PORT_NAMES.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
        "Composition violation: complete runtime binding-source cardinality differs from canonical runtime-port cardinality.",
    );
  }

  for (
    const portName of
    XYVALA_SEARCH_RUNTIME_PORT_NAMES
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        sources,
        portName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Composition violation: complete runtime binding source ${portName} is missing.`,
      );
    }

    assertFunction(
      sources[
        portName
      ],
      `runtime_binding_sources.${portName}`,
    );
  }

  for (
    const actualName of
    actualNames
  ) {
    if (
      !SEARCH_RUNTIME_PORT_NAME_SET.has(
        actualName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Composition violation: undeclared runtime binding source ${actualName} is not authorized.`,
      );
    }
  }
}

/* ============================================================================
 * 35. COMPLETE RUNTIME BINDING SOURCE ASSEMBLY
 * ----------------------------------------------------------------------------
 * Structural composition only.
 *
 * Execution-observation capabilities do NOT enter SearchRuntimeBindingSources.
 *
 * No producer executes.
 * No analytical value is inspected.
 * No analytical value is reconstructed.
 * ========================================================================== */

function buildSearchRuntimeBindingSources(
  directSources:
    SearchRuntimeDirectBindingSources,

  adaptedPorts:
    SearchRuntimeProducerAdapterPorts,
): SearchRuntimeBindingSources {
  validateDirectBindingSources(
    directSources,
  );

  validateAdaptedProducerPorts(
    adaptedPorts,
  );

  const bindingSources = {
    ...directSources,
    ...adaptedPorts,
  } satisfies SearchRuntimeBindingSources;

  validateCompleteBindingSources(
    bindingSources,
  );

  return Object.freeze(
    bindingSources,
  );
}

/* ============================================================================
 * 36. STATIC ARCHITECTURE VALIDATION
 * ----------------------------------------------------------------------------
 * Centralized architecture validation avoids partial declaration validation
 * through multiple composition entrypoints.
 *
 * No producer/provider/resolver/capability executes here.
 * ========================================================================== */

function validateSearchRuntimeCompositionArchitecture(): void {
  validateCanonicalRuntimePortIdentities();

  validateRuntimePortOwnershipDeclaration();

  validateProducerAdapterOwnershipDeclaration();

  validateRuntimePortPartition();

  validateProducerAdapterDependencyRegistry();

  validateExecutionObservationPortRegistry();

  assertUniqueStringCollection(
    XYVALA_SEARCH_RUNTIME_COMPOSITION_INPUT_FIELD_NAMES,
    "XYVALA_SEARCH_RUNTIME_COMPOSITION_INPUT_FIELD_NAMES",
  );

  if (
    SEARCH_RUNTIME_COMPOSITION_INPUT_FIELD_NAME_SET.size !==
    XYVALA_SEARCH_RUNTIME_COMPOSITION_INPUT_FIELD_NAMES.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
        "Architecture violation: composition-input field registry contains duplicates.",
    );
  }
}

/* ============================================================================
 * 37. COMPOSITION INPUT VALIDATION
 * ----------------------------------------------------------------------------
 * Exact root-field validation first.
 *
 * Then each dependency domain validates only its own structure.
 * ========================================================================== */

function validateSearchRuntimeCompositionInput(
  input:
    SearchRuntimeCompositionInput,
): void {
  if (
    !isRecord(
      input,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
        "Composition violation: runtime composition input must be an object.",
    );
  }

  const actualFieldNames =
    Object.keys(
      input,
    );

  assertUniqueStringCollection(
    actualFieldNames,
    "runtime_composition_input",
  );

  if (
    actualFieldNames.length !==
    XYVALA_SEARCH_RUNTIME_COMPOSITION_INPUT_FIELD_NAMES.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
        "Composition violation: runtime composition input cardinality is inconsistent.",
    );
  }

  for (
    const fieldName of
    XYVALA_SEARCH_RUNTIME_COMPOSITION_INPUT_FIELD_NAMES
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        input,
        fieldName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Composition violation: required composition input field ${fieldName} is missing.`,
      );
    }
  }

  for (
    const actualFieldName of
    actualFieldNames
  ) {
    if (
      !SEARCH_RUNTIME_COMPOSITION_INPUT_FIELD_NAME_SET.has(
        actualFieldName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME}] ` +
          `Composition violation: undeclared composition input field ${actualFieldName} is not authorized.`,
      );
    }
  }

  validateDirectBindingSources(
    input.direct_sources,
  );

  validateProducerAdapterDependencies(
    input.producer_adapter_dependencies,
  );

  validateExecutionObservationPorts(
    input.execution_observation_ports,
  );
}

/* ============================================================================
 * 38. CANONICAL FULL BINDING DEFINITION
 * ----------------------------------------------------------------------------
 * Advanced integration path for a complete, already-configured set of
 * SearchRuntimeBindingSources.
 *
 * This path only defines SearchRuntimePorts.
 *
 * It does NOT create the canonical application composition because it has no
 * Execution Plane capability root.
 *
 * Runtime execution observation must therefore be integrated through the
 * canonical composition/bootstrap path when required.
 * ========================================================================== */

export function defineSearchRuntimePorts(
  sources:
    SearchRuntimeBindingSources,
): SearchRuntimePorts {
  validateSearchRuntimeCompositionArchitecture();

  validateCompleteBindingSources(
    sources,
  );

  return bindSearchRuntimePorts(
    sources,
  );
}

/* ============================================================================
 * 39. COMPOSE CANONICAL RUNTIME PORTS
 * ----------------------------------------------------------------------------
 * direct runtime sources
 * + analytical producer-adapter dependencies
 * + cross-cutting execution-observation capabilities
 * -> validate static architecture
 * -> validate exact configuration
 * -> create canonical producer adapters
 * -> validate adapted ports
 * -> assemble complete SearchRuntimeBindingSources
 * -> canonical binding layer
 * -> SearchRuntimePorts
 *
 * No producer executes during this function.
 *
 * No execution-observation capability executes during this function.
 * ========================================================================== */

export function createSearchRuntimePorts(
  input:
    SearchRuntimeCompositionInput,
): SearchRuntimePorts {
  validateSearchRuntimeCompositionArchitecture();

  validateSearchRuntimeCompositionInput(
    input,
  );

  const adaptedPorts =
    createSearchRuntimeProducerAdapters(
      input.producer_adapter_dependencies,
      input.execution_observation_ports,
    );

  validateAdaptedProducerPorts(
    adaptedPorts,
  );

  const bindingSources =
    buildSearchRuntimeBindingSources(
      input.direct_sources,
      adaptedPorts,
    );

  return bindSearchRuntimePorts(
    bindingSources,
  );
}

/* ============================================================================
 * 40. CANONICAL RUNTIME COMPOSITION FACTORY
 * ----------------------------------------------------------------------------
 * Creates one configured immutable Search runtime.
 *
 * Runtime ports are bound once and captured by the orchestrator.
 *
 * Individual producer ports and cross-cutting execution-observation
 * capabilities are intentionally not exposed through the composition result.
 * ========================================================================== */

export function createSearchRuntimeComposition(
  input:
    SearchRuntimeCompositionInput,
): SearchRuntimeComposition {
  const ports =
    createSearchRuntimePorts(
      input,
    );

  const orchestrator =
    createSearchRuntimeOrchestrator(
      ports,
    );

  const run:
    SearchRuntimeComposition["run"] =
      (
        runtimeInput,
      ) =>
        orchestrator.run(
          runtimeInput,
        );

  return Object.freeze({
    module_name:
      XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_RUNTIME_COMPOSITION_MODULE_VERSION,

    orchestrator,

    run,
  });
}

/* ============================================================================
 * 41. DIRECT CONFIGURED RUNTIME FACTORY
 * ----------------------------------------------------------------------------
 * Convenience projection only.
 *
 * No alternative binding or composition path is introduced.
 * ========================================================================== */

export function createConfiguredSearchRuntime(
  input:
    SearchRuntimeCompositionInput,
): SearchRuntimeOrchestrator {
  return createSearchRuntimeComposition(
    input,
  ).orchestrator;
}

/* ============================================================================
 * 42. STATIC COMPOSITION OWNERSHIP DECLARATION
 * ----------------------------------------------------------------------------
 * Governance metadata only.
 *
 * Composition binds capabilities but does not become owner of their canonical
 * truths.
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_COMPOSITION_OWNERSHIP =
  Object.freeze({
    complete_runtime_port_identity_owner:
      "search-runtime-bindings.ts",

    execution_observation_capability_identity_owner:
      "search-runtime-execution-observation-ports.ts",

    producer_adapter_owner:
      "search-runtime-producer-adapters.ts",

    direct_producer_configuration_owner:
      "SEARCH_RUNTIME_BOOTSTRAP",

    runtime_binding_owner:
      "search-runtime-bindings.ts",

    runtime_execution_order_owner:
      "search-runtime-orchestrator.ts",

    distribution_identity_owner:
      "SEARCH_DISTRIBUTION_IDENTITY",

    distribution_identity_producer:
      "search-distribution-identity-core.ts",

    snapshot_identity_owner:
      "SEARCH_SNAPSHOT_IDENTITY",

    snapshot_identity_producer:
      "search-snapshot-identity-core.ts",

    cohort_batch_transport_owner:
      "SEARCH_COHORT_BATCH",

    cohort_distribution_owner:
      "COHORT_NORMALIZATION",

    relative_cohort_evaluation_owner:
      "RELATIVE_COHORT_EVALUATION",

    execution_observation_boundary_contract:
      "search-runtime-execution-boundary-observation-port.ts",

    execution_observation_transport_contract:
      "search-runtime-execution-observation-port.ts",

    execution_observation_capability_set:
      "search-runtime-execution-observation-ports.ts",

    execution_trace_owner:
      "EXECUTION_TRACEABILITY",

    variable_lineage_owner:
      "VARIABLE_LINEAGE_GOVERNANCE",

    private_snapshot_owner:
      "PRIVATE_SNAPSHOT",

    composition_creates_analytical_truth:
      false,

    composition_creates_governance_truth:
      false,

    composition_generates_distribution_id:
      false,

    composition_generates_snapshot_id:
      false,

    composition_builds_cohort_batch:
      false,

    composition_normalizes_cohort:
      false,

    composition_sources_execution_observation_facts:
      false,

    composition_materializes_execution_observation:
      false,

    composition_generates_execution_trace:
      false,

    composition_reconstructs_execution_trace:
      false,

    composition_reconstructs_variable_lineage:
      false,

    composition_selects_policy:
      false,

    composition_executes_calibration:
      false,

    composition_reads_runtime_clock:
      false,

    composition_generates_random_identity:
      false,

    composition_persists:
      false,

    composition_mutates_runtime:
      false,
  } as const);

/* ============================================================================
 * 43. STATIC COMPOSITION GOVERNANCE DECLARATION
 * ----------------------------------------------------------------------------
 * Audit metadata only.
 *
 * Explicitly records the architectural capabilities and prohibitions of this
 * layer.
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_COMPOSITION_GOVERNANCE =
  Object.freeze({
    /* ------------------------------------------------------------------------
     * ROLE
     * --------------------------------------------------------------------- */

    composition_only:
      true,

    analytical_owner:
      false,

    canonical_producer:
      false,

    execution_observation_owner:
      false,

    execution_trace_owner:
      false,

    variable_lineage_owner:
      false,

    /* ------------------------------------------------------------------------
     * CONTRACT BEFORE RUNTIME
     * --------------------------------------------------------------------- */

    canonical_binding_required:
      true,

    exact_runtime_port_coverage_required:
      true,

    exact_direct_adapted_partition_required:
      true,

    exact_adapter_dependency_coverage_required:
      true,

    exact_execution_observation_capability_coverage_required:
      true,

    exact_composition_input_field_coverage_required:
      true,

    duplicate_port_identity_allowed:
      false,

    duplicate_adapter_dependency_identity_allowed:
      false,

    duplicate_execution_observation_capability_identity_allowed:
      false,

    duplicate_composition_input_field_identity_allowed:
      false,

    hidden_fallback_allowed:
      false,

    partial_composition_allowed:
      false,

    /* ------------------------------------------------------------------------
     * RUNTIME PORT / EXECUTION PLANE SEPARATION
     * --------------------------------------------------------------------- */

    execution_observation_capabilities_are_runtime_ports:
      false,

    execution_observation_capabilities_are_binding_sources:
      false,

    execution_observation_capabilities_are_analytical_adapter_dependencies:
      false,

    execution_observation_capability_transport_to_adapter_factory_allowed:
      true,

    execution_observation_capability_invocation_during_composition_allowed:
      false,

    execution_observation_capability_wrapping_allowed:
      false,

    execution_observation_capability_substitution_allowed:
      false,

    /* ------------------------------------------------------------------------
     * PRODUCER EXECUTION
     * --------------------------------------------------------------------- */

    producer_execution_during_composition_allowed:
      false,

    producer_output_inspection_allowed:
      false,

    producer_output_mutation_allowed:
      false,

    producer_output_reconstruction_allowed:
      false,

    /* ------------------------------------------------------------------------
     * POLICY
     * --------------------------------------------------------------------- */

    policy_selection_allowed:
      false,

    policy_fallback_allowed:
      false,

    policy_mutation_allowed:
      false,

    policy_reconstruction_allowed:
      false,

    calibration_execution_allowed:
      false,

    /* ------------------------------------------------------------------------
     * ANALYTICAL OBSERVATIONS
     * --------------------------------------------------------------------- */

    analytical_observation_provider_binding_allowed:
      true,

    analytical_observation_provider_invocation_during_composition_allowed:
      false,

    analytical_observation_creation_allowed:
      false,

    analytical_observation_reconstruction_allowed:
      false,

    /* ------------------------------------------------------------------------
     * EXECUTION OBSERVATION
     * --------------------------------------------------------------------- */

    execution_observation_boundary_binding_allowed:
      true,

    execution_observation_transport_binding_allowed:
      true,

    execution_observation_fact_creation_allowed:
      false,

    execution_observation_fact_inference_allowed:
      false,

    execution_observation_reconstruction_allowed:
      false,

    execution_observation_missing_data_reconstruction_allowed:
      false,

    execution_observation_validation_state_reconstruction_allowed:
      false,

    execution_observation_confidence_reconstruction_allowed:
      false,

    /* ------------------------------------------------------------------------
     * ANALYTICAL TRUTH
     * --------------------------------------------------------------------- */

    analytical_truth_reconstruction_allowed:
      false,

    score_calculation_allowed:
      false,

    penalty_calculation_allowed:
      false,

    aggregation_calculation_allowed:
      false,

    eligibility_calculation_allowed:
      false,

    cohort_distribution_calculation_allowed:
      false,

    relative_evaluation_calculation_allowed:
      false,

    private_decision_calculation_allowed:
      false,

    public_transformation_allowed:
      false,

    public_ranking_allowed:
      false,

    /* ------------------------------------------------------------------------
     * IDENTITY
     * --------------------------------------------------------------------- */

    distribution_identity_generation_allowed:
      false,

    distribution_identity_reconstruction_allowed:
      false,

    snapshot_identity_generation_allowed:
      false,

    snapshot_identity_reconstruction_allowed:
      false,

    canonical_distribution_identity_owner:
      "SEARCH_DISTRIBUTION_IDENTITY",

    canonical_snapshot_identity_owner:
      "SEARCH_SNAPSHOT_IDENTITY",

    /* ------------------------------------------------------------------------
     * COHORT
     * --------------------------------------------------------------------- */

    cohort_batch_reconstruction_allowed:
      false,

    cohort_distribution_reconstruction_allowed:
      false,

    canonical_cohort_transport_boundary:
      "SEARCH_COHORT_BATCH",

    /* ------------------------------------------------------------------------
     * TRACEABILITY / LINEAGE
     * --------------------------------------------------------------------- */

    execution_trace_generation_allowed:
      false,

    execution_trace_reconstruction_allowed:
      false,

    execution_trace_mutation_allowed:
      false,

    variable_lineage_generation_allowed:
      false,

    variable_lineage_reconstruction_allowed:
      false,

    variable_lineage_mutation_allowed:
      false,

    canonical_trace_governance:
      "EXECUTION_TRACEABILITY",

    canonical_lineage_governance:
      "VARIABLE_LINEAGE_GOVERNANCE",

    synthetic_traceability_owner_allowed:
      false,

    /* ------------------------------------------------------------------------
     * AVAILABILITY
     * --------------------------------------------------------------------- */

    unavailable_to_zero_allowed:
      false,

    unavailable_to_neutral_allowed:
      false,

    unavailable_to_watch_allowed:
      false,

    unavailable_to_available_allowed:
      false,

    /* ------------------------------------------------------------------------
     * EXECUTION / SIDE EFFECTS
     * --------------------------------------------------------------------- */

    runtime_clock_access_allowed:
      false,

    random_identity_generation_allowed:
      false,

    persistence_allowed:
      false,

    runtime_mutation_allowed:
      false,

    logging_allowed:
      false,

    event_publication_allowed:
      false,

    direct_http_dependency_allowed:
      false,

    network_access_allowed:
      false,

    /* ------------------------------------------------------------------------
     * EXPLICIT PROHIBITIONS
     * --------------------------------------------------------------------- */

    prohibited_shortcuts:
      Object.freeze([
        /*
         * Composition / analytical ownership.
         */
        "composition_generated_analytical_truth",
        "composition_reconstructed_upstream_truth",
        "composition_recalculated_score",
        "composition_calculated_penalty",
        "composition_calculated_eligibility",

        /*
         * Policies.
         */
        "composition_selected_default_policy",
        "composition_repaired_missing_policy",
        "composition_mutated_policy",
        "composition_invoked_calibration",

        /*
         * Analytical observations.
         */
        "composition_generated_analytical_observation",
        "composition_reconstructed_analytical_observation",

        /*
         * Execution-observation plane.
         */
        "execution_observation_capability_as_search_runtime_port",
        "execution_observation_capability_as_runtime_binding_source",
        "execution_observation_capability_as_analytical_adapter_dependency",
        "composition_invoked_execution_observation_capability",
        "composition_generated_execution_observation_fact",
        "composition_inferred_execution_observation_fact",
        "composition_reconstructed_execution_observation",
        "composition_reconstructed_execution_missing_data",
        "composition_reconstructed_execution_validation_state",
        "composition_reconstructed_execution_confidence",
        "composition_wrapped_execution_observation_capability",
        "composition_substituted_execution_observation_capability",

        /*
         * Distribution / snapshot identity.
         */
        "composition_generated_distribution_id",
        "composition_reconstructed_distribution_id",
        "composition_generated_snapshot_id",
        "composition_reconstructed_snapshot_id",

        /*
         * Cohort.
         */
        "composition_created_search_cohort_batch",
        "composition_reconstructed_search_cohort_batch",
        "composition_created_cohort_statistics",
        "composition_reconstructed_cohort_distribution",
        "composition_created_relative_evaluation",

        "cohort_batch_assembly_as_second_transport_identity",

        /*
         * Decision / public.
         */
        "composition_inferred_private_decision",
        "composition_generated_public_label",
        "composition_generated_public_position",

        /*
         * Trace / lineage.
         */
        "composition_generated_execution_trace",
        "composition_reconstructed_execution_trace",
        "composition_generated_variable_lineage",
        "composition_reconstructed_variable_lineage",
        "synthetic_traceability_governance_owner",

        /*
         * Availability.
         */
        "unavailable_to_zero",
        "unavailable_to_neutral",
        "unavailable_to_watch",
        "unavailable_to_available",

        /*
         * Side effects.
         */
        "composition_runtime_clock_access",
        "composition_random_identity_generation",
        "composition_persistence",
        "composition_runtime_mutation",
        "composition_logging",
        "composition_event_publication",
        "composition_network_access",
      ] as const),
  } as const);
