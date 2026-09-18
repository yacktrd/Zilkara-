/* ============================================================================
 * FILE: lib/xyvala/search/runtime/search-runtime-bootstrap.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical runtime bootstrap
 *
 * ROLE
 * - provide the concrete application composition root for Xyvala Search
 * - bind directly-bindable canonical Search producers
 * - require externally owned direct runtime capabilities
 * - require the complete governed producer-adapter dependency set
 * - require the complete cross-cutting Execution Plane observation capability set
 * - validate bootstrap-owned configuration boundaries
 * - construct one exact SearchRuntimeCompositionInput
 * - delegate runtime composition to search-runtime-composition.ts
 * - expose one configured SearchRuntimeOrchestrator
 *
 * CLASSIFICATION
 * - SEARCH RUNTIME BOOTSTRAP
 * - SEARCH DOMAIN
 * - APPLICATION COMPOSITION ROOT
 * - DEPENDENCY ASSEMBLY
 * - CONFIGURATION BOUNDARY
 * - NON-ANALYTICAL
 * - NON-COMPUTE
 * - NON-OBSERVE
 * - NON-MUTATE
 * - NON-SCORING
 * - NON-RANKING
 * - NON-CALIBRATING
 * - NON-TRANSFORMING
 * - NON-IDENTITY-PRODUCING
 * - NON-TRACE-PRODUCING
 * - DETERMINISTIC GIVEN DETERMINISTIC DEPENDENCIES
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * Canonical directly-bindable producers
 *                  +
 * externally supplied direct runtime capabilities
 *                  +
 * governed producer-adapter dependencies
 *                  +
 * cross-cutting Execution Plane observation capabilities
 *                  ↓
 * search-runtime-bootstrap.ts
 *                  ↓
 * SearchRuntimeCompositionInput
 *                  ↓
 * search-runtime-composition.ts
 *                  ↓
 * search-runtime-bindings.ts
 *                  ↓
 * SearchRuntimePorts
 *                  ↓
 * search-runtime-orchestrator.ts
 *                  ↓
 * SearchPublicRankingProjection
 *
 * THREE DEPENDENCY DOMAINS
 * ----------------------------------------------------------------------------
 *
 * 1. external_direct_sources
 *
 * Runtime-port-compatible external capabilities:
 * - acquire_documents
 * - resolve_snapshot_traceability
 *
 * 2. producer_adapter_dependencies
 *
 * Analytical policy resolvers and analytical observation providers.
 *
 * 3. execution_observation_ports
 *
 * Cross-cutting Execution Plane capabilities:
 * - observe_execution_boundary
 * - observe_execution
 *
 * These domains MUST remain structurally separated.
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * SearchRuntimeDirectBindingSources defines the complete direct runtime domain.
 *
 * Bootstrap classifies this domain into exactly:
 *
 * 1. canonical directly-bindable Search producers;
 * 2. externally supplied direct runtime capabilities.
 *
 * execution_observation_ports do NOT participate in that direct runtime-port
 * partition because they are not SearchRuntimePorts.
 *
 * DISTRIBUTION IDENTITY GOVERNANCE
 * ----------------------------------------------------------------------------
 * SearchDistributionId has one canonical Search producer:
 *
 * buildSearchDistributionId
 * <- search-distribution-identity-core.ts
 *
 * Bootstrap binds that producer as an exact direct reference.
 *
 * Producer ownership remains:
 *
 * SearchDistributionId
 * <- SEARCH_DISTRIBUTION_IDENTITY
 *
 * Runtime execution boundary:
 *
 * resolve_distribution_id
 * <- exact reference to buildSearchDistributionId
 *
 * SNAPSHOT IDENTITY GOVERNANCE
 * ----------------------------------------------------------------------------
 * Search snapshot_id has one canonical Search producer:
 *
 * buildSearchSnapshotId
 * <- search-snapshot-identity-core.ts
 *
 * Bootstrap binds that producer as an exact direct reference.
 *
 * Producer ownership remains:
 *
 * snapshot_id
 * <- SEARCH_SNAPSHOT_IDENTITY
 *
 * Runtime execution boundary:
 *
 * resolve_snapshot_id
 * <- exact reference to buildSearchSnapshotId
 *
 * TRACEABILITY GOVERNANCE
 * ----------------------------------------------------------------------------
 * resolve_snapshot_traceability transports already-existing canonical
 * governance truths:
 *
 * execution traces
 * <- EXECUTION_TRACEABILITY
 *
 * variable lineage
 * <- VARIABLE_LINEAGE_GOVERNANCE
 *
 * It does not create either truth.
 *
 * EXECUTION OBSERVATION GOVERNANCE
 * ----------------------------------------------------------------------------
 *
 * observe_execution_boundary
 * <- explicit dynamic execution-fact SOURCE boundary
 *
 * observe_execution
 * <- canonical runtime execution-observation TRANSPORT boundary
 *
 * Bootstrap:
 * - requires both capabilities explicitly;
 * - transports their exact references;
 * - never calls them;
 * - never wraps them;
 * - never substitutes them;
 * - never creates missing_data;
 * - never creates runtime execution observations;
 * - never creates SearchTraceRecord;
 * - never stores traces.
 *
 * EXECUTION_TRACEABILITY remains trace owner.
 *
 * DIRECT CANONICAL PRODUCER OWNERSHIP
 * ----------------------------------------------------------------------------
 *
 * extract_document
 * -> buildSearchExtractedDocument
 *
 * segment_document
 * -> buildSearchSegmentedDocument
 *
 * analyze_lexical_document
 * -> buildSearchLexicalDocument
 *
 * detect_frequency_signals
 * -> buildSearchFrequencySignals
 *
 * resolve_distribution_id
 * -> buildSearchDistributionId
 * -> SEARCH_DISTRIBUTION_IDENTITY
 *
 * build_cohort_batch
 * -> buildSearchCohortBatch
 * -> SEARCH_COHORT_BATCH
 *
 * resolve_snapshot_id
 * -> buildSearchSnapshotId
 * -> SEARCH_SNAPSHOT_IDENTITY
 *
 * build_private_snapshot
 * -> buildSearchPrivateDocumentSnapshot
 * -> PRIVATE_SNAPSHOT
 *
 * EXTERNALLY SUPPLIED DIRECT PORTS
 * ----------------------------------------------------------------------------
 *
 * acquire_documents
 * -> authorized Acquisition provider
 *
 * resolve_snapshot_traceability
 * -> authorized transport resolver for existing traceability / lineage truths
 *
 * ADAPTED PRODUCERS
 * ----------------------------------------------------------------------------
 * Adapted runtime ports are NOT created individually here.
 *
 * Their analytical policy resolvers and analytical observation providers enter
 * through:
 *
 * SearchRuntimeProducerAdapterDependencies
 *
 * Cross-cutting execution-observation capabilities remain in the distinct:
 *
 * SearchRuntimeExecutionObservationPorts
 *
 * RESPONSIBILITY
 * ----------------------------------------------------------------------------
 * Bootstrap owns:
 * - direct-port classification;
 * - concrete canonical direct producer references;
 * - validation of externally supplied direct capabilities;
 * - structural direct-source assembly;
 * - structural dependency-root validation;
 * - SearchRuntimeCompositionInput assembly;
 * - delegation to canonical composition.
 *
 * Bootstrap does NOT own:
 * - document acquisition implementation;
 * - distribution identity generation;
 * - snapshot identity generation;
 * - execution-observation facts;
 * - execution-observation materialization;
 * - execution trace production;
 * - variable-lineage production;
 * - policy selection;
 * - analytical observation production;
 * - analytical computation;
 * - cohort statistics;
 * - private decision;
 * - public transformation;
 * - public ranking;
 * - persistence;
 * - HTTP.
 *
 * DIRECTIVES
 * - bootstrap / composition-root logic only
 * - canonical producers only
 * - exact direct-port coverage
 * - exact canonical/external direct partition
 * - explicit external dependencies
 * - explicit producer-adapter dependencies
 * - explicit Execution Plane capabilities
 * - preserve producer function identity
 * - preserve execution-observation capability identity
 * - no wrapper around directly-bindable canonical producers
 * - no wrapper around execution-observation capabilities
 * - no hidden fallback
 * - no DEFAULT_* policy selection
 * - no implicit acquisition provider
 * - no implicit traceability provider
 * - no implicit execution-observation capability
 * - no synthetic unavailable evidence
 * - no reconstruction of upstream truth
 * - no execution-observation reconstruction
 * - no analytical calculation
 * - no runtime clock access
 * - no Date.now()
 * - no new Date()
 * - no randomUUID()
 * - no local identity generation
 * - no local trace generation
 * - no local lineage generation
 * - no persistence
 * - no logging
 * - no network access
 * - no file-system access
 * - no database access
 * - no queue access
 * - no cache mutation
 * - no HTTP dependency
 *
 * INVARIANTS
 * - every direct runtime port is classified exactly once
 * - canonical and external direct port domains never overlap
 * - canonical + external direct ports exactly cover direct runtime ports
 * - execution-observation capabilities remain outside SearchRuntimePorts
 * - canonical direct producer references remain unchanged
 * - execution-observation capability references remain unchanged
 * - acquisition implementation remains externally owned
 * - distribution identity has one canonical Search producer
 * - snapshot identity has one canonical Search producer
 * - EXECUTION_TRACEABILITY remains trace owner
 * - VARIABLE_LINEAGE_GOVERNANCE remains lineage owner
 * - traceability resolver transports existing truths only
 * - policies remain externally governed
 * - adapted producers remain adapter-owned
 * - composition validation remains composition-owned
 * - execution order remains orchestrator-owned
 * - bootstrap creates no canonical analytical or governance truth
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * canonical producer signature differs from runtime port
 * => producer/runtime contract boundary
 *
 * direct runtime port missing from bootstrap classification
 * => bootstrap governance boundary
 *
 * canonical/external direct domains overlap
 * => bootstrap classification violation
 *
 * acquisition provider absent
 * => acquisition configuration boundary
 *
 * snapshot traceability resolver absent
 * => traceability transport configuration boundary
 *
 * execution-observation capability root absent
 * => Execution Plane configuration boundary
 *
 * producer-adapter dependency malformed
 * => composition / producer-adapter configuration boundary
 *
 * bootstrap generates identity
 * => bootstrap ownership violation
 *
 * bootstrap creates execution observation
 * => Execution Plane ownership violation
 *
 * bootstrap creates execution trace
 * => EXECUTION_TRACEABILITY ownership violation
 *
 * bootstrap creates variable lineage
 * => VARIABLE_LINEAGE_GOVERNANCE ownership violation
 *
 * bootstrap creates analytical truth
 * => bootstrap ownership violation
 * ========================================================================== */

import type {
  SearchModuleVersion,
} from "../contracts/search-pipeline-contract";

import {
  buildSearchExtractedDocument,
} from "../extraction/search-extraction-core";

import {
  buildSearchSegmentedDocument,
} from "../segmentation/search-segmentation-core";

import {
  buildSearchLexicalDocument,
} from "../lexical/search-lexical-analysis-core";

import {
  buildSearchFrequencySignals,
} from "../signals/search-frequency-signals-core";

import {
  buildSearchDistributionId,
} from "../cohort/search-distribution-identity-core";

import {
  buildSearchCohortBatch,
} from "../cohort/search-cohort-batch-core";

import {
  buildSearchSnapshotId,
} from "../snapshot/search-snapshot-identity-core";

import {
  buildSearchPrivateDocumentSnapshot,
} from "../snapshot/search-private-snapshot-builder";

import {
  createConfiguredSearchRuntime,
  XYVALA_SEARCH_RUNTIME_DIRECT_PORT_NAMES,
} from "./search-runtime-composition";

import type {
  SearchRuntimeCompositionInput,
  SearchRuntimeDirectBindingSources,
} from "./search-runtime-composition";

import type {
  SearchRuntimeProducerAdapterDependencies,
} from "./search-runtime-producer-adapters";

import type {
  SearchRuntimeExecutionObservationPorts,
} from "./search-runtime-execution-observation-ports";

import type {
  SearchRuntimeOrchestrator,
} from "./search-runtime-orchestrator";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_BOOTSTRAP_MODULE_NAME =
  "xyvala-search-runtime-bootstrap" as const;

export const XYVALA_SEARCH_RUNTIME_BOOTSTRAP_MODULE_VERSION:
  SearchModuleVersion =
    "1.4.0";

/* ============================================================================
 * 2. CANONICAL DIRECT PORT IDENTITIES
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_BOOTSTRAP_CANONICAL_DIRECT_PORT_NAMES =
  Object.freeze([
    "extract_document",
    "segment_document",
    "analyze_lexical_document",
    "detect_frequency_signals",
    "resolve_distribution_id",
    "build_cohort_batch",
    "resolve_snapshot_id",
    "build_private_snapshot",
  ] as const satisfies readonly (
    keyof SearchRuntimeDirectBindingSources
  )[]);

export type SearchRuntimeBootstrapCanonicalDirectPortName =
  (
    typeof XYVALA_SEARCH_RUNTIME_BOOTSTRAP_CANONICAL_DIRECT_PORT_NAMES
  )[number];

/* ============================================================================
 * 3. EXTERNAL DIRECT PORT IDENTITIES
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_BOOTSTRAP_EXTERNAL_DIRECT_PORT_NAMES =
  Object.freeze([
    "acquire_documents",
    "resolve_snapshot_traceability",
  ] as const satisfies readonly (
    keyof SearchRuntimeDirectBindingSources
  )[]);

export type SearchRuntimeBootstrapExternalDirectPortName =
  (
    typeof XYVALA_SEARCH_RUNTIME_BOOTSTRAP_EXTERNAL_DIRECT_PORT_NAMES
  )[number];

export type SearchRuntimeBootstrapDeclaredDirectPortName =
  | SearchRuntimeBootstrapCanonicalDirectPortName
  | SearchRuntimeBootstrapExternalDirectPortName;

/* ============================================================================
 * 4. DIRECT PORT CLASSIFICATION EXACTNESS
 * ========================================================================== */

type SearchRuntimeBootstrapMissingDirectPort =
  Exclude<
    keyof SearchRuntimeDirectBindingSources,
    SearchRuntimeBootstrapDeclaredDirectPortName
  >;

type SearchRuntimeBootstrapUnknownDirectPort =
  Exclude<
    SearchRuntimeBootstrapDeclaredDirectPortName,
    keyof SearchRuntimeDirectBindingSources
  >;

type SearchRuntimeBootstrapDirectPortCoverageIsExact =
  [
    SearchRuntimeBootstrapMissingDirectPort,
    SearchRuntimeBootstrapUnknownDirectPort,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_RUNTIME_BOOTSTRAP_DIRECT_PORT_COVERAGE_IS_EXACT:
  SearchRuntimeBootstrapDirectPortCoverageIsExact =
    true;

void XYVALA_SEARCH_RUNTIME_BOOTSTRAP_DIRECT_PORT_COVERAGE_IS_EXACT;

/* ============================================================================
 * 5. DIRECT PORT PARTITION DISJOINTNESS
 * ========================================================================== */

type SearchRuntimeBootstrapDirectPortOverlap =
  Extract<
    SearchRuntimeBootstrapCanonicalDirectPortName,
    SearchRuntimeBootstrapExternalDirectPortName
  >;

type SearchRuntimeBootstrapDirectPortPartitionIsDisjoint =
  SearchRuntimeBootstrapDirectPortOverlap extends never
    ? true
    : false;

const XYVALA_SEARCH_RUNTIME_BOOTSTRAP_DIRECT_PORT_PARTITION_IS_DISJOINT:
  SearchRuntimeBootstrapDirectPortPartitionIsDisjoint =
    true;

void XYVALA_SEARCH_RUNTIME_BOOTSTRAP_DIRECT_PORT_PARTITION_IS_DISJOINT;

/* ============================================================================
 * 6. CANONICAL DIRECT SOURCE CONTRACT
 * ========================================================================== */

type SearchRuntimeBootstrapCanonicalDirectSources =
  Pick<
    SearchRuntimeDirectBindingSources,
    SearchRuntimeBootstrapCanonicalDirectPortName
  >;

const XYVALA_SEARCH_RUNTIME_BOOTSTRAP_CANONICAL_DIRECT_SOURCES =
  Object.freeze({
    extract_document:
      buildSearchExtractedDocument,

    segment_document:
      buildSearchSegmentedDocument,

    analyze_lexical_document:
      buildSearchLexicalDocument,

    detect_frequency_signals:
      buildSearchFrequencySignals,

    resolve_distribution_id:
      buildSearchDistributionId,

    build_cohort_batch:
      buildSearchCohortBatch,

    resolve_snapshot_id:
      buildSearchSnapshotId,

    build_private_snapshot:
      buildSearchPrivateDocumentSnapshot,
  } satisfies SearchRuntimeBootstrapCanonicalDirectSources);

/* ============================================================================
 * 7. EXTERNAL DIRECT SOURCE CONTRACT
 * ========================================================================== */

export type SearchRuntimeBootstrapExternalDirectSources =
  Pick<
    SearchRuntimeDirectBindingSources,
    SearchRuntimeBootstrapExternalDirectPortName
  >;

/* ============================================================================
 * 8. BOOTSTRAP DEPENDENCIES
 * ----------------------------------------------------------------------------
 * Three dependency domains remain strictly separated.
 * ========================================================================== */

export interface SearchRuntimeBootstrapDependencies {
  readonly external_direct_sources:
    SearchRuntimeBootstrapExternalDirectSources;

  readonly producer_adapter_dependencies:
    SearchRuntimeProducerAdapterDependencies;

  readonly execution_observation_ports:
    SearchRuntimeExecutionObservationPorts;
}

/* ============================================================================
 * 9. SAFE RECORD GUARD
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
 * 10. SAFE FUNCTION ASSERTION
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
      `[${XYVALA_SEARCH_RUNTIME_BOOTSTRAP_MODULE_NAME}] ` +
        `Bootstrap configuration violation: ${fieldName} must be a function.`,
    );
  }
}

/* ============================================================================
 * 11. STRING COLLECTION UNIQUENESS
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
        `[${XYVALA_SEARCH_RUNTIME_BOOTSTRAP_MODULE_NAME}] ` +
          `Bootstrap architecture violation: ${fieldName} contains duplicate identity ${value}.`,
      );
    }

    seen.add(
      value,
    );
  }
}

/* ============================================================================
 * 12. BOOTSTRAP DIRECT-PORT ARCHITECTURE VALIDATION
 * ========================================================================== */

function validateSearchRuntimeBootstrapDirectPortClassification(): void {
  assertUniqueStringCollection(
    XYVALA_SEARCH_RUNTIME_BOOTSTRAP_CANONICAL_DIRECT_PORT_NAMES,
    "canonical_direct_port_names",
  );

  assertUniqueStringCollection(
    XYVALA_SEARCH_RUNTIME_BOOTSTRAP_EXTERNAL_DIRECT_PORT_NAMES,
    "external_direct_port_names",
  );

  const canonicalSet =
    new Set<string>(
      XYVALA_SEARCH_RUNTIME_BOOTSTRAP_CANONICAL_DIRECT_PORT_NAMES,
    );

  const externalSet =
    new Set<string>(
      XYVALA_SEARCH_RUNTIME_BOOTSTRAP_EXTERNAL_DIRECT_PORT_NAMES,
    );

  if (
    canonicalSet.size +
      externalSet.size !==
    XYVALA_SEARCH_RUNTIME_DIRECT_PORT_NAMES.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_BOOTSTRAP_MODULE_NAME}] ` +
        "Bootstrap architecture violation: canonical/external direct-port " +
        "classification does not cover the complete direct runtime-port domain.",
    );
  }

  for (
    const portName of
    XYVALA_SEARCH_RUNTIME_DIRECT_PORT_NAMES
  ) {
    const canonical =
      canonicalSet.has(
        portName,
      );

    const external =
      externalSet.has(
        portName,
      );

    if (
      canonical ===
      external
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_BOOTSTRAP_MODULE_NAME}] ` +
          `Bootstrap architecture violation: direct runtime port ${portName} must belong to exactly one bootstrap classification.`,
      );
    }
  }
}

/* ============================================================================
 * 13. CANONICAL DIRECT SOURCE VALIDATION
 * ========================================================================== */

function validateSearchRuntimeBootstrapCanonicalDirectSources(): void {
  for (
    const portName of
    XYVALA_SEARCH_RUNTIME_BOOTSTRAP_CANONICAL_DIRECT_PORT_NAMES
  ) {
    assertFunction(
      XYVALA_SEARCH_RUNTIME_BOOTSTRAP_CANONICAL_DIRECT_SOURCES[
        portName
      ],
      `canonical_direct_sources.${portName}`,
    );
  }
}

/* ============================================================================
 * 14. EXTERNAL DIRECT SOURCE VALIDATION
 * ========================================================================== */

function validateSearchRuntimeBootstrapExternalDirectSources(
  sources:
    SearchRuntimeBootstrapExternalDirectSources,
): void {
  if (
    !isRecord(
      sources,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_BOOTSTRAP_MODULE_NAME}] ` +
        "Bootstrap configuration violation: external_direct_sources must be an object.",
    );
  }

  const actualNames =
    Object.keys(
      sources,
    );

  if (
    actualNames.length !==
    XYVALA_SEARCH_RUNTIME_BOOTSTRAP_EXTERNAL_DIRECT_PORT_NAMES.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_BOOTSTRAP_MODULE_NAME}] ` +
        "Bootstrap configuration violation: external direct-source cardinality is inconsistent.",
    );
  }

  const expectedNameSet =
    new Set<string>(
      XYVALA_SEARCH_RUNTIME_BOOTSTRAP_EXTERNAL_DIRECT_PORT_NAMES,
    );

  for (
    const portName of
    XYVALA_SEARCH_RUNTIME_BOOTSTRAP_EXTERNAL_DIRECT_PORT_NAMES
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        sources,
        portName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_BOOTSTRAP_MODULE_NAME}] ` +
          `Bootstrap configuration violation: required external runtime capability ${portName} is missing.`,
      );
    }

    assertFunction(
      sources[
        portName
      ],
      `external_direct_sources.${portName}`,
    );
  }

  for (
    const actualName of
    actualNames
  ) {
    if (
      !expectedNameSet.has(
        actualName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_BOOTSTRAP_MODULE_NAME}] ` +
          `Bootstrap configuration violation: undeclared external runtime capability ${actualName} is not authorized.`,
      );
    }
  }
}

/* ============================================================================
 * 15. BOOTSTRAP DEPENDENCY ROOT VALIDATION
 * ----------------------------------------------------------------------------
 * Bootstrap validates only structural presence of dependency roots.
 *
 * Exact producer-adapter and execution-observation capability coverage remains
 * composition-owned.
 * ========================================================================== */

function validateSearchRuntimeBootstrapDependencies(
  dependencies:
    SearchRuntimeBootstrapDependencies,
): void {
  if (
    !isRecord(
      dependencies,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_BOOTSTRAP_MODULE_NAME}] ` +
        "Bootstrap configuration violation: dependencies must be an object.",
    );
  }

  validateSearchRuntimeBootstrapExternalDirectSources(
    dependencies
      .external_direct_sources,
  );

  if (
    !isRecord(
      dependencies
        .producer_adapter_dependencies,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_BOOTSTRAP_MODULE_NAME}] ` +
        "Bootstrap configuration violation: producer_adapter_dependencies must be an object.",
    );
  }

  if (
    !isRecord(
      dependencies
        .execution_observation_ports,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_BOOTSTRAP_MODULE_NAME}] ` +
        "Bootstrap configuration violation: execution_observation_ports must be an object.",
    );
  }
}

/* ============================================================================
 * 16. BOOTSTRAP DIRECT SOURCE ASSEMBLY
 * ========================================================================== */

export function buildSearchRuntimeBootstrapDirectSources(
  dependencies:
    SearchRuntimeBootstrapDependencies,
): SearchRuntimeDirectBindingSources {
  validateSearchRuntimeBootstrapDirectPortClassification();

  validateSearchRuntimeBootstrapCanonicalDirectSources();

  validateSearchRuntimeBootstrapDependencies(
    dependencies,
  );

  const directSources = {
    ...XYVALA_SEARCH_RUNTIME_BOOTSTRAP_CANONICAL_DIRECT_SOURCES,
    ...dependencies
      .external_direct_sources,
  } satisfies SearchRuntimeDirectBindingSources;

  return Object.freeze(
    directSources,
  );
}

/* ============================================================================
 * 17. CANONICAL COMPOSITION INPUT BUILDER
 * ----------------------------------------------------------------------------
 * All dependency references are transported unchanged.
 *
 * Bootstrap does not inspect:
 * - analytical policies;
 * - analytical observations;
 * - execution-observation payloads.
 * ========================================================================== */

export function buildSearchRuntimeBootstrapCompositionInput(
  dependencies:
    SearchRuntimeBootstrapDependencies,
): SearchRuntimeCompositionInput {
  validateSearchRuntimeBootstrapDependencies(
    dependencies,
  );

  return Object.freeze({
    direct_sources:
      buildSearchRuntimeBootstrapDirectSources(
        dependencies,
      ),

    producer_adapter_dependencies:
      dependencies
        .producer_adapter_dependencies,

    execution_observation_ports:
      dependencies
        .execution_observation_ports,
  });
}

/* ============================================================================
 * 18. CANONICAL SEARCH RUNTIME BOOTSTRAP
 * ========================================================================== */

export function createSearchRuntimeBootstrap(
  dependencies:
    SearchRuntimeBootstrapDependencies,
): SearchRuntimeOrchestrator {
  const compositionInput =
    buildSearchRuntimeBootstrapCompositionInput(
      dependencies,
    );

  return createConfiguredSearchRuntime(
    compositionInput,
  );
}

/* ============================================================================
 * 19. BOOTSTRAP OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_BOOTSTRAP_OWNERSHIP =
  Object.freeze({
    composition_root:
      true,

    canonical_direct_producer_count:
      XYVALA_SEARCH_RUNTIME_BOOTSTRAP_CANONICAL_DIRECT_PORT_NAMES
        .length,

    external_direct_provider_count:
      XYVALA_SEARCH_RUNTIME_BOOTSTRAP_EXTERNAL_DIRECT_PORT_NAMES
        .length,

    canonical_direct_producers:
      XYVALA_SEARCH_RUNTIME_BOOTSTRAP_CANONICAL_DIRECT_PORT_NAMES,

    external_direct_providers:
      XYVALA_SEARCH_RUNTIME_BOOTSTRAP_EXTERNAL_DIRECT_PORT_NAMES,

    acquisition_implementation_owner:
      "EXTERNAL_AUTHORIZED_ACQUISITION_PROVIDER",

    distribution_identity_owner:
      "SEARCH_DISTRIBUTION_IDENTITY",

    distribution_identity_producer:
      "search-distribution-identity-core.ts",

    snapshot_identity_owner:
      "SEARCH_SNAPSHOT_IDENTITY",

    snapshot_identity_producer:
      "search-snapshot-identity-core.ts",

    snapshot_traceability_transport_resolver:
      "EXTERNAL_AUTHORIZED_TRACEABILITY_PROVIDER",

    execution_observation_capability_contract:
      "search-runtime-execution-observation-ports.ts",

    execution_observation_configuration_owner:
      "APPLICATION_CONFIGURATION",

    execution_trace_owner:
      "EXECUTION_TRACEABILITY",

    variable_lineage_owner:
      "VARIABLE_LINEAGE_GOVERNANCE",

    cohort_batch_owner:
      "SEARCH_COHORT_BATCH",

    private_snapshot_owner:
      "PRIVATE_SNAPSHOT",

    adapter_owner:
      "search-runtime-producer-adapters.ts",

    binding_owner:
      "search-runtime-bindings.ts",

    composition_owner:
      "search-runtime-composition.ts",

    execution_order_owner:
      "search-runtime-orchestrator.ts",

    bootstrap_creates_analytical_truth:
      false,

    bootstrap_creates_governance_truth:
      false,

    bootstrap_selects_policy:
      false,

    bootstrap_creates_analytical_observations:
      false,

    bootstrap_sources_execution_observation_facts:
      false,

    bootstrap_materializes_execution_observation:
      false,

    bootstrap_invokes_execution_observation_capabilities:
      false,

    bootstrap_generates_distribution_id:
      false,

    bootstrap_generates_snapshot_id:
      false,

    bootstrap_generates_execution_trace:
      false,

    bootstrap_generates_variable_lineage:
      false,

    bootstrap_reads_runtime_clock:
      false,

    bootstrap_generates_random_identity:
      false,

    bootstrap_mutates_runtime:
      false,
  } as const);

/* ============================================================================
 * 20. BOOTSTRAP GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_BOOTSTRAP_GOVERNANCE =
  Object.freeze({
    bootstrap_only:
      true,

    analytical_owner:
      false,

    canonical_producer:
      false,

    canonical_direct_sources_are_exact_references:
      true,

    external_runtime_capabilities_are_mandatory:
      true,

    adapter_dependencies_are_mandatory:
      true,

    execution_observation_capabilities_are_mandatory:
      true,

    execution_observation_capabilities_are_runtime_ports:
      false,

    execution_observation_capabilities_are_direct_sources:
      false,

    execution_observation_capabilities_are_analytical_adapter_dependencies:
      false,

    execution_observation_capability_transport_allowed:
      true,

    execution_observation_capability_invocation_allowed:
      false,

    execution_observation_capability_wrapping_allowed:
      false,

    execution_observation_capability_substitution_allowed:
      false,

    execution_observation_fact_creation_allowed:
      false,

    execution_observation_reconstruction_allowed:
      false,

    exact_direct_port_coverage_required:
      true,

    direct_port_partition_must_be_disjoint:
      true,

    hidden_fallback_allowed:
      false,

    default_policy_selection_allowed:
      false,

    local_acquisition_allowed:
      false,

    local_identity_generation_allowed:
      false,

    local_execution_trace_generation_allowed:
      false,

    local_variable_lineage_generation_allowed:
      false,

    traceability_transport_allowed:
      true,

    traceability_truth_reconstruction_allowed:
      false,

    upstream_truth_reconstruction_allowed:
      false,

    analytical_calculation_allowed:
      false,

    analytical_observation_creation_allowed:
      false,

    analytical_observation_reconstruction_allowed:
      false,

    unavailable_to_zero_allowed:
      false,

    unavailable_to_neutral_allowed:
      false,

    persistence_allowed:
      false,

    network_access_allowed:
      false,

    runtime_clock_access_allowed:
      false,

    random_identity_generation_allowed:
      false,

    producer_wrapping_allowed:
      false,

    direct_producer_substitution_allowed:
      false,

    canonical_distribution_identity_owner:
      "SEARCH_DISTRIBUTION_IDENTITY",

    canonical_distribution_identity_producer:
      "search-distribution-identity-core.ts",

    canonical_distribution_identity_runtime_port:
      "resolve_distribution_id",

    canonical_snapshot_identity_owner:
      "SEARCH_SNAPSHOT_IDENTITY",

    canonical_snapshot_identity_producer:
      "search-snapshot-identity-core.ts",

    canonical_snapshot_identity_runtime_port:
      "resolve_snapshot_id",

    canonical_cohort_transport_boundary:
      "SEARCH_COHORT_BATCH",

    canonical_execution_trace_governance:
      "EXECUTION_TRACEABILITY",

    canonical_variable_lineage_governance:
      "VARIABLE_LINEAGE_GOVERNANCE",

    prohibited_shortcuts:
      Object.freeze([
        "bootstrap_generated_analytical_truth",
        "bootstrap_reconstructed_upstream_truth",

        "bootstrap_selected_default_policy",
        "bootstrap_repaired_missing_policy",

        "bootstrap_generated_analytical_observation",
        "bootstrap_reconstructed_analytical_observation",

        "execution_observation_capability_as_runtime_port",
        "execution_observation_capability_as_direct_source",
        "execution_observation_capability_as_analytical_adapter_dependency",
        "bootstrap_invoked_execution_observation_capability",
        "bootstrap_wrapped_execution_observation_capability",
        "bootstrap_substituted_execution_observation_capability",
        "bootstrap_generated_execution_observation_fact",
        "bootstrap_reconstructed_execution_observation",

        "bootstrap_generated_distribution_id",
        "bootstrap_generated_snapshot_id",

        "bootstrap_generated_execution_trace",
        "bootstrap_generated_variable_lineage",
        "synthetic_traceability_governance_owner",

        "bootstrap_reconstructed_search_cohort_batch",
        "bootstrap_calculated_cohort_statistics",

        "bootstrap_wrapped_canonical_direct_producer",
        "bootstrap_substituted_canonical_direct_producer",

        "unavailable_to_zero",
        "unavailable_to_neutral",

        "bootstrap_runtime_clock_access",
        "bootstrap_random_identity_generation",

        "bootstrap_persistence",
        "bootstrap_network_access",
      ] as const),
  } as const);
