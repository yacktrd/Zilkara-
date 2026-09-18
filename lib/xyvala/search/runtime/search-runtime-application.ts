/* ============================================================================
 * FILE: lib/xyvala/search/runtime/search-runtime-application.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical runtime application composition root
 *
 * ROLE
 * - consume explicit application-scoped canonical Search dependencies
 * - consume already-produced canonical SearchQuery truth
 * - consume already-produced canonical SearchCohortDefinition truth
 * - validate application-level execution scope
 * - preserve explicit runtime timestamps unchanged
 * - preserve explicit snapshot version unchanged
 * - create one fresh run-scoped Search execution context per application run
 * - create one fresh canonical Search runtime composition per application run
 * - assemble one exact SearchRuntimeInput transport envelope
 * - execute the canonical Search runtime orchestrator
 * - return the canonical SearchPublicRankingProjection unchanged
 *
 * CLASSIFICATION
 * - SEARCH APPLICATION COMPOSITION ROOT
 * - SEARCH DOMAIN
 * - APPLICATION / RUNTIME BOUNDARY
 * - RUN-SCOPED COMPOSITION COORDINATION
 * - COMPOSE / VALIDATE / TRANSPORT / EXECUTE
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-TRANSFORMING
 * - NON-RANKING
 * - NON-CALIBRATING
 * - NON-TRACE-OWNING
 * - NON-LINEAGE-OWNING
 * - NON-MUTATING OF ANALYTICAL TRUTH
 *
 * POSITION
 * ----------------------------------------------------------------------------
 *
 * SearchQuery Input Core
 *        ↓
 * SearchQuery
 *        +
 * SearchCohortDefinition Input Core
 *        ↓
 * SearchCohortDefinition
 *        +
 * explicit runtime metadata
 *        +
 * APPLICATION-SCOPED DEPENDENCIES
 *        ↓
 * SEARCH RUNTIME APPLICATION
 *        ↓
 * application.run(...)
 *        ↓
 * createSearchRuntimeExecutionContext(...)
 *        ↓
 * fresh run-scoped:
 *   - execution trace collector
 *   - execution_observation_ports
 *   - resolve_snapshot_traceability
 *        ↓
 * SearchRuntimeBootstrapDependencies
 * assembled for THIS execution only
 *        ↓
 * createSearchRuntimeBootstrap(...)
 *        ↓
 * configured SearchRuntimeOrchestrator
 * for THIS execution only
 *        ↓
 * SearchRuntimeInput
 *        ↓
 * canonical Search runtime
 *        ↓
 * SearchPublicRankingProjection
 *        ↓
 * Search Public API Core
 *        ↓
 * Search Public Response Builder
 *        ↓
 * HTTP adapter
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * This module is NOT a new SearchPipelineLayer.
 *
 * It is the application composition/execution boundary surrounding the
 * canonical Search runtime.
 *
 * APPLICATION SCOPE
 * ----------------------------------------------------------------------------
 * One SearchRuntimeApplication instance may execute several independent
 * Search runs.
 *
 * Therefore application scope MUST NOT own:
 * - execution-trace collection state;
 * - one shared observe_execution collector;
 * - one shared resolve_snapshot_traceability closure;
 * - one shared configured runtime whose execution capabilities contain
 *   mutable run-scoped trace state.
 *
 * RUN SCOPE
 * ----------------------------------------------------------------------------
 * Every application.run(...) MUST create:
 *
 * 1. one fresh SearchRuntimeExecutionContext;
 * 2. one fresh SearchRuntimeExecutionTraceCollector through that context;
 * 3. one fresh execution_observation_ports capability set;
 * 4. one fresh resolve_snapshot_traceability capability;
 * 5. one fresh SearchRuntimeBootstrapDependencies transport envelope;
 * 6. one configured Search runtime bound to that execution context.
 *
 * This guarantees:
 *
 * one application run
 * =
 * one execution context
 * =
 * one trace collector
 *
 * EXECUTION CONTEXT GOVERNANCE
 * ----------------------------------------------------------------------------
 * SearchRuntimeExecutionContext owns execution lifecycle composition only.
 *
 * It does NOT own:
 * - SearchTraceRecord truth;
 * - SearchTraceId truth;
 * - SearchVariableLineage truth;
 * - analytical truth.
 *
 * SearchTraceRecord / SearchTraceId
 * <- EXECUTION_TRACEABILITY
 *
 * SearchVariableLineage
 * <- VARIABLE_LINEAGE_GOVERNANCE
 *
 * The application provides the canonical Variable Lineage resolver capability
 * required by SearchRuntimeExecutionContext.
 *
 * The application MUST NOT invoke that resolver itself to rebuild lineage.
 *
 * APPLICATION DEPENDENCY DOMAINS
 * ----------------------------------------------------------------------------
 *
 * 1. external_direct_sources
 *
 * Application-scoped external direct capabilities:
 *
 * - acquire_documents
 *
 * resolve_snapshot_traceability is deliberately NOT application-scoped.
 *
 * It is created per run by SearchRuntimeExecutionContext.
 *
 * 2. producer_adapter_dependencies
 *
 * Explicit Search analytical policy / observation configuration.
 *
 * These dependencies remain application-scoped configuration and are
 * transported unchanged into each run-specific bootstrap.
 *
 * 3. execution_context_dependencies
 *
 * Canonical governance capabilities required to create one execution context.
 *
 * Current dependency:
 *
 * - resolve_snapshot_variable_lineage
 *
 * This is a canonical Variable Lineage capability.
 *
 * It is NOT a fallback lineage producer.
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * execution_observation_ports are deliberately absent from
 * SearchRuntimeApplicationDependencies.
 *
 * They are run-scoped and created by:
 *
 * createSearchRuntimeExecutionContext(...)
 *
 * resolve_snapshot_traceability is deliberately absent from application
 * external_direct_sources.
 *
 * It is also run-scoped and created by:
 *
 * createSearchRuntimeExecutionContext(...)
 *
 * It owns:
 * - application dependency classification;
 * - application execution-envelope assembly;
 * - canonical query/cohort execution-scope validation;
 * - creation of one fresh execution context per run;
 * - assembly of one exact bootstrap dependency envelope per run;
 * - canonical runtime bootstrap invocation per run.
 *
 * It does NOT own:
 * - SearchQuery production;
 * - SearchCohortDefinition production;
 * - acquisition;
 * - analytical policies;
 * - analytical observation evidence;
 * - execution-boundary observation evidence;
 * - distribution identity;
 * - snapshot identity;
 * - execution trace truth;
 * - execution trace identity;
 * - variable lineage truth;
 * - analytical calculations;
 * - public transformation;
 * - public ranking.
 *
 * PARENTS
 * ----------------------------------------------------------------------------
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchQuery
 * - SearchCohortDefinition
 * - SearchRuntimeInput
 * - SearchRuntimeBootstrapDependencies
 * - SearchRuntimeExecutionContext
 * - SearchRuntimeOrchestrator
 * - SearchPublicRankingProjection
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - One Canonical Producer Per Reality
 * - Variable Governance System
 * - Variable Lineage Registry
 * - Compute / Observe / Mutate Separation
 *
 * DIRECT INPUT PRODUCERS
 * ----------------------------------------------------------------------------
 * SearchQuery
 * <- lib/xyvala/search/query/search-query-input-core.ts
 *
 * SearchCohortDefinition
 * <- lib/xyvala/search/cohort/search-cohort-definition-input-core.ts
 *
 * RUNTIME COMPOSITION
 * ----------------------------------------------------------------------------
 * application-scoped dependencies
 *        ↓
 * createSearchRuntimeExecutionContext(...)
 *        ↓
 * fresh run-scoped execution capabilities
 *        ↓
 * exact SearchRuntimeBootstrapDependencies
 *        ↓
 * createSearchRuntimeBootstrap(...)
 *        ↓
 * SearchRuntimeOrchestrator
 *
 * RUNTIME EXECUTION
 * ----------------------------------------------------------------------------
 * SearchRuntimeApplicationExecutionInput
 *        ↓
 * exact SearchRuntimeInput
 *        ↓
 * run-scoped SearchRuntimeOrchestrator.run(...)
 *        ↓
 * SearchPublicRankingProjection
 *
 * OWNERSHIP
 * ----------------------------------------------------------------------------
 * query
 * <- SearchQuery canonical producer
 *
 * cohort_definition
 * <- SearchCohortDefinition canonical producer
 *
 * created_at
 * <- explicit application orchestration truth
 *
 * publication_reference_at
 * <- explicit application orchestration truth
 *
 * snapshot_version
 * <- explicit Search snapshot configuration truth
 *
 * acquire_documents
 * <- externally configured Acquisition capability
 *
 * producer_adapter_dependencies
 * <- explicit Search analytical policy / observation configuration
 *
 * resolve_snapshot_variable_lineage
 * <- canonical VARIABLE_LINEAGE_GOVERNANCE capability
 *
 * execution context lifecycle
 * <- SEARCH_RUNTIME_EXECUTION_CONTEXT
 *
 * execution trace collection lifecycle
 * <- SEARCH_RUNTIME_EXECUTION_TRACE_COLLECTOR
 *
 * execution_observation_ports
 * <- created by SEARCH_RUNTIME_EXECUTION_CONTEXT for each run
 *
 * resolve_snapshot_traceability
 * <- created by SEARCH_RUNTIME_EXECUTION_CONTEXT for each run
 *
 * SearchRuntimeInput envelope
 * <- SEARCH_RUNTIME_APPLICATION
 * <- transport only
 *
 * SearchRuntimeBootstrapDependencies envelope
 * <- SEARCH_RUNTIME_APPLICATION
 * <- per-run composition transport only
 *
 * SearchPublicRankingProjection
 * <- PUBLIC_RANKING
 * <- transported unchanged through this boundary
 *
 * NON-OWNERSHIP
 * ----------------------------------------------------------------------------
 * query_id
 * <- SearchQuery / application orchestration
 *
 * cohort_id
 * <- SearchCohortDefinition / application orchestration
 *
 * raw_query
 * <- caller truth
 *
 * query normalization / profile
 * <- QUERY_NORMALIZATION / QUERY_PROFILING
 *
 * acquisition truth
 * <- ACQUISITION
 *
 * distribution_id
 * <- SEARCH_DISTRIBUTION_IDENTITY
 *
 * snapshot_id
 * <- SEARCH_SNAPSHOT_IDENTITY
 *
 * execution traces
 * <- EXECUTION_TRACEABILITY
 *
 * variable lineage
 * <- VARIABLE_LINEAGE_GOVERNANCE
 *
 * SearchCohortBatch
 * <- SEARCH_COHORT_BATCH
 *
 * cohort distribution
 * <- COHORT_NORMALIZATION
 *
 * private decision
 * <- PRIVATE_DECISION
 *
 * public result transformation
 * <- TRANSFORMATION
 *
 * public ranking
 * <- PUBLIC_RANKING
 *
 * public_position
 * <- PUBLIC_RANKING
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - application composition only
 * - canonical dependencies only
 * - bootstrap through createSearchRuntimeBootstrap only
 * - one fresh execution context per application run
 * - one fresh runtime bootstrap per application run
 * - no application-scoped execution trace collector
 * - no application-scoped observe_execution transport
 * - no application-scoped resolve_snapshot_traceability closure
 *
 * - canonical query required
 * - canonical cohort definition required
 * - VALID query required for execution
 * - VALID cohort definition required for execution
 * - query/cohort query_id must match exactly
 * - preserve SearchQuery reference unchanged
 * - preserve SearchCohortDefinition reference unchanged
 * - preserve created_at unchanged
 * - preserve publication_reference_at unchanged
 * - preserve snapshot_version unchanged
 * - return runtime projection unchanged
 *
 * - no SearchQuery reconstruction
 * - no SearchCohortDefinition reconstruction
 * - no query normalization
 * - no query profiling
 * - no source acquisition
 * - no scoring
 * - no penalties
 * - no eligibility
 * - no cohort normalization
 * - no relative evaluation
 * - no private decision
 * - no public transformation
 * - no public ranking
 *
 * - no policy creation
 * - no policy selection
 * - no policy fallback
 * - no analytical observation creation
 * - no execution observation reconstruction
 * - no external capability fallback
 *
 * - no distribution_id generation
 * - no snapshot_id generation
 * - no SearchTraceRecord generation
 * - no SearchTraceId generation
 * - no variable-lineage reconstruction
 *
 * - no runtime clock access
 * - no Date.now()
 * - no local new Date()
 * - no random identity generation
 * - no crypto.randomUUID()
 *
 * - no persistence
 * - no cache mutation
 * - no logging
 * - no event publication
 *
 * QUERY / COHORT CONCORDANCE GOVERNANCE
 * ----------------------------------------------------------------------------
 * SearchQuery and SearchCohortDefinition share query scope.
 *
 * Exact identity concordance IS canonical:
 *
 * query.query_id === cohort_definition.query_id
 *
 * Therefore this application boundary validates it.
 *
 * Other apparently related values are NOT assumed equivalent here:
 *
 * SearchQuery.requested_language
 * ≠ automatically SearchCohortDefinition.language
 *
 * SearchQuery.requested_domain
 * ≠ automatically SearchCohortDefinition.domain
 *
 * SearchQuery.requested_source_types
 * ≠ automatically SearchCohortDefinition.allowed_source_types
 *
 * SearchQuery.requested_time_window
 * ≠ automatically SearchCohortDefinition.time_window
 *
 * No canonical concordance policy currently establishes exact equivalence
 * semantics for those fields.
 *
 * Therefore this module MUST NOT:
 * - derive one contract from the other;
 * - repair disagreement;
 * - intersect filters;
 * - union filters;
 * - choose a winning contract;
 * - silently replace one value with another.
 *
 * A future cross-contract concordance rule requires an explicit canonical
 * contract / policy BEFORE runtime implementation.
 *
 * VALIDATION OWNERSHIP
 * ----------------------------------------------------------------------------
 * SearchQuery producer owns:
 * - SearchQuery.validation_state
 * - SearchQuery.rejection_reasons
 *
 * SearchCohortDefinition producer owns:
 * - SearchCohortDefinition.validation_state
 * - SearchCohortDefinition.rejection_reasons
 *
 * This application layer does NOT reproduce those validations.
 *
 * It only decides whether already-qualified canonical input is executable.
 *
 * Current canonical producer semantics:
 *
 * VALID
 * -> executable
 *
 * REJECTED
 * -> must not enter runtime
 *
 * DEGRADED / UNVALIDATED
 * -> not produced by the current canonical input producers and therefore not
 *    accepted by this application execution boundary.
 *
 * DEPENDENCY VALIDATION OWNERSHIP
 * ----------------------------------------------------------------------------
 * Application validates only its own dependency-root structure.
 *
 * Exact analytical adapter dependency validation remains owned by:
 *
 * search-runtime-composition.ts
 * search-runtime-producer-adapters.ts
 *
 * Exact run-scoped Execution Plane dependency validation remains owned by:
 *
 * search-runtime-execution-context.ts
 *
 * Exact bootstrap dependency validation remains owned by:
 *
 * search-runtime-bootstrap.ts
 * search-runtime-composition.ts
 *
 * Application MUST NOT reproduce those detailed validations.
 *
 * BOOTSTRAP GOVERNANCE
 * ----------------------------------------------------------------------------
 * SearchRuntimeBootstrapDependencies remains the canonical bootstrap contract.
 *
 * Application assembles one exact instance per execution from:
 *
 * application external Acquisition capability
 * +
 * application producer-adapter dependencies
 * +
 * fresh execution-context capabilities
 *
 * The resulting bootstrap dependency envelope is transport only.
 *
 * It MUST NOT:
 * - inspect policy values;
 * - reconstruct missing dependencies;
 * - wrap analytical producer capabilities;
 * - create fallback providers;
 * - replace the canonical execution context.
 *
 * OUTPUT GOVERNANCE
 * ----------------------------------------------------------------------------
 * SearchPublicRankingProjection belongs exclusively to PUBLIC_RANKING.
 *
 * This application module:
 * - does not validate its analytical/public semantics;
 * - does not clone it;
 * - does not filter it;
 * - does not sort it;
 * - does not rebuild it;
 * - does not mutate it.
 *
 * Public validation remains downstream in:
 *
 * search-public-api-core.ts
 *
 * CONCURRENCY GOVERNANCE
 * ----------------------------------------------------------------------------
 * Concurrent calls to one SearchRuntimeApplication instance are allowed from
 * this composition perspective because every run creates its own:
 *
 * - SearchRuntimeExecutionContext;
 * - SearchRuntimeExecutionTraceCollector;
 * - execution_observation_ports;
 * - resolve_snapshot_traceability;
 * - configured runtime orchestrator.
 *
 * No execution-trace collection state is shared between runs by this module.
 *
 * INVARIANTS
 * ----------------------------------------------------------------------------
 * - SearchRuntimeInput field coverage is compile-time exact
 * - SearchQuery reference remains exact
 * - SearchCohortDefinition reference remains exact
 * - query and cohort query_id are identical
 * - only VALID canonical query input executes
 * - only VALID canonical cohort definition executes
 * - runtime metadata remains explicit
 * - one fresh execution context exists per run
 * - one fresh trace collector exists per run
 * - one fresh runtime composition exists per run
 * - application-scoped Acquisition reference remains unchanged
 * - producer-adapter dependency root remains unchanged
 * - Variable Lineage resolver reference remains explicit
 * - bootstrap dependencies are assembled exactly per run
 * - runtime is created through canonical bootstrap only
 * - individual SearchRuntimePorts are never exposed
 * - SearchPublicRankingProjection is returned unchanged
 * - no analytical truth is reconstructed
 * - no execution trace truth is reconstructed
 * - no Variable Lineage truth is reconstructed
 * - no runtime clock is read
 * - no random identity is generated
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * REJECTED SearchQuery reaches execution
 * => Search application input orchestration
 *
 * REJECTED SearchCohortDefinition reaches execution
 * => Search application input orchestration
 *
 * query.query_id !== cohort_definition.query_id
 * => Search application input assembly
 *
 * one collector shared across application runs
 * => application / execution lifecycle violation
 *
 * application receives observe_execution directly
 * => execution-context lifecycle violation
 *
 * application receives resolve_snapshot_traceability directly
 * => execution-context lifecycle violation
 *
 * application derives cohort filters from SearchQuery
 * => downstream reconstruction violation
 *
 * application chooses policy versions
 * => policy ownership violation
 *
 * application creates analytical observation evidence
 * => observation-provider ownership violation
 *
 * application creates execution-boundary evidence
 * => Execution Plane ownership violation
 *
 * application generates distribution_id
 * => SEARCH_DISTRIBUTION_IDENTITY ownership violation
 *
 * application generates snapshot_id
 * => SEARCH_SNAPSHOT_IDENTITY ownership violation
 *
 * application generates SearchTraceRecord
 * => EXECUTION_TRACEABILITY ownership violation
 *
 * application reconstructs Variable Lineage
 * => VARIABLE_LINEAGE_GOVERNANCE ownership violation
 *
 * application modifies SearchPublicRankingProjection
 * => PUBLIC_RANKING ownership violation
 * ========================================================================== */

import {
  XYVALA_SEARCH_PIPELINE_CONTRACT,
} from "../contracts/search-pipeline-contract";

import type {
  SearchModuleVersion,
  SearchPublicRankingProjection,
} from "../contracts/search-pipeline-contract";

import {
  createSearchRuntimeBootstrap,
} from "./search-runtime-bootstrap";

import type {
  SearchRuntimeBootstrapDependencies,
  SearchRuntimeBootstrapExternalDirectSources,
} from "./search-runtime-bootstrap";

import {
  createSearchRuntimeExecutionContext,
} from "./search-runtime-execution-context";

import type {
  SearchRuntimeExecutionContext,
  SearchRuntimeExecutionContextDependencies,
} from "./search-runtime-execution-context";

import type {
  SearchRuntimeInput,
} from "./search-runtime-orchestrator";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_APPLICATION_MODULE_NAME =
  "xyvala-search-runtime-application" as const;

export const XYVALA_SEARCH_RUNTIME_APPLICATION_MODULE_VERSION:
  SearchModuleVersion =
    "1.1.0";

/* ============================================================================
 * 2. APPLICATION-SCOPED EXTERNAL DIRECT SOURCES
 * ----------------------------------------------------------------------------
 * resolve_snapshot_traceability is deliberately excluded.
 *
 * It is run-scoped and produced by SearchRuntimeExecutionContext.
 *
 * Acquisition remains application-configured.
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_APPLICATION_EXTERNAL_DIRECT_PORT_NAMES =
  Object.freeze([
    "acquire_documents",
  ] as const satisfies readonly (
    keyof SearchRuntimeBootstrapExternalDirectSources
  )[]);

export type SearchRuntimeApplicationExternalDirectPortName =
  (
    typeof XYVALA_SEARCH_RUNTIME_APPLICATION_EXTERNAL_DIRECT_PORT_NAMES
  )[number];

export type SearchRuntimeApplicationExternalDirectSources =
  Pick<
    SearchRuntimeBootstrapExternalDirectSources,
    SearchRuntimeApplicationExternalDirectPortName
  >;

/* ============================================================================
 * 3. APPLICATION DEPENDENCIES
 * ----------------------------------------------------------------------------
 * Application scope and execution scope are now explicitly separated.
 *
 * APPLICATION-SCOPED
 * ----------------------------------------------------------------------------
 * external_direct_sources
 * -> currently acquire_documents only
 *
 * producer_adapter_dependencies
 * -> stable analytical configuration / providers
 *
 * execution_context_dependencies
 * -> canonical capabilities needed to construct one fresh run context
 *
 * RUN-SCOPED AND THEREFORE ABSENT HERE
 * ----------------------------------------------------------------------------
 * execution_observation_ports
 * resolve_snapshot_traceability
 * execution trace collector
 * ========================================================================== */

export interface SearchRuntimeApplicationDependencies {
  readonly external_direct_sources:
    SearchRuntimeApplicationExternalDirectSources;

  readonly producer_adapter_dependencies:
    SearchRuntimeBootstrapDependencies[
      "producer_adapter_dependencies"
    ];

  readonly execution_context_dependencies:
    SearchRuntimeExecutionContextDependencies;
}

/* ============================================================================
 * 4. APPLICATION DEPENDENCY FIELD COVERAGE
 * ----------------------------------------------------------------------------
 * Compile-time application contract governance.
 * ========================================================================== */

type SearchRuntimeApplicationDeclaredDependencyField =
  | "external_direct_sources"
  | "producer_adapter_dependencies"
  | "execution_context_dependencies";

type SearchRuntimeApplicationMissingDependencyField =
  Exclude<
    keyof SearchRuntimeApplicationDependencies,
    SearchRuntimeApplicationDeclaredDependencyField
  >;

type SearchRuntimeApplicationUnknownDependencyField =
  Exclude<
    SearchRuntimeApplicationDeclaredDependencyField,
    keyof SearchRuntimeApplicationDependencies
  >;

type SearchRuntimeApplicationDependencyCoverageIsExact =
  [
    SearchRuntimeApplicationMissingDependencyField,
    SearchRuntimeApplicationUnknownDependencyField,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_RUNTIME_APPLICATION_DEPENDENCY_COVERAGE_IS_EXACT:
  SearchRuntimeApplicationDependencyCoverageIsExact =
    true;

void XYVALA_SEARCH_RUNTIME_APPLICATION_DEPENDENCY_COVERAGE_IS_EXACT;

/* ============================================================================
 * 5. APPLICATION EXECUTION INPUT
 * ----------------------------------------------------------------------------
 * Derived directly from SearchRuntimeInput.
 *
 * This is an application-call boundary only.
 *
 * It introduces no new runtime truth.
 * ========================================================================== */

export type SearchRuntimeApplicationExecutionInput =
  Readonly<
    Pick<
      SearchRuntimeInput,
      | "query"
      | "cohort_definition"
      | "created_at"
      | "publication_reference_at"
      | "snapshot_version"
    >
  >;

/* ============================================================================
 * 6. RUNTIME INPUT FIELD COVERAGE
 * ----------------------------------------------------------------------------
 * Compile-time governance only.
 *
 * SearchRuntimeInput currently contains exactly these five fields.
 *
 * Any future change to SearchRuntimeInput forces explicit review of this
 * application composition boundary.
 * ========================================================================== */

type SearchRuntimeApplicationDeclaredInputField =
  | "query"
  | "cohort_definition"
  | "created_at"
  | "publication_reference_at"
  | "snapshot_version";

type SearchRuntimeApplicationMissingInputField =
  Exclude<
    keyof SearchRuntimeInput,
    SearchRuntimeApplicationDeclaredInputField
  >;

type SearchRuntimeApplicationUnknownInputField =
  Exclude<
    SearchRuntimeApplicationDeclaredInputField,
    keyof SearchRuntimeInput
  >;

type SearchRuntimeApplicationInputCoverageIsExact =
  [
    SearchRuntimeApplicationMissingInputField,
    SearchRuntimeApplicationUnknownInputField,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_RUNTIME_APPLICATION_INPUT_COVERAGE_IS_EXACT:
  SearchRuntimeApplicationInputCoverageIsExact =
    true;

void XYVALA_SEARCH_RUNTIME_APPLICATION_INPUT_COVERAGE_IS_EXACT;

/* ============================================================================
 * 7. APPLICATION RESULT
 * ----------------------------------------------------------------------------
 * The application exposes one operation only:
 *
 * canonical Search execution.
 *
 * Runtime ports remain hidden behind SearchRuntimeOrchestrator.
 * ========================================================================== */

export interface SearchRuntimeApplication {
  readonly run:
    (
      input:
        SearchRuntimeApplicationExecutionInput,
    ) =>
      Promise<SearchPublicRankingProjection>;
}

/* ============================================================================
 * 8. SAFE RECORD GUARD
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
 * 9. SAFE FUNCTION ASSERTION
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
      `[${XYVALA_SEARCH_RUNTIME_APPLICATION_MODULE_NAME}] ` +
        `Application configuration violation: ${fieldName} must be a function.`,
    );
  }
}

/* ============================================================================
 * 10. APPLICATION DEPENDENCY ROOT VALIDATION
 * ----------------------------------------------------------------------------
 * Only application-owned structural boundaries are validated here.
 *
 * Detailed adapter validation remains downstream.
 * Detailed execution-context validation remains execution-context-owned.
 * Detailed bootstrap validation remains bootstrap/composition-owned.
 * ========================================================================== */

function validateSearchRuntimeApplicationDependencies(
  dependencies:
    SearchRuntimeApplicationDependencies,
): void {
  if (
    !isRecord(
      dependencies,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_APPLICATION_MODULE_NAME}] ` +
        "Application configuration violation: dependencies must be an object.",
    );
  }

  if (
    !isRecord(
      dependencies
        .external_direct_sources,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_APPLICATION_MODULE_NAME}] ` +
        "Application configuration violation: external_direct_sources must be an object.",
    );
  }

  const externalDirectSourceNames =
    Object.keys(
      dependencies
        .external_direct_sources,
    );

  if (
    externalDirectSourceNames.length !==
    XYVALA_SEARCH_RUNTIME_APPLICATION_EXTERNAL_DIRECT_PORT_NAMES
      .length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_APPLICATION_MODULE_NAME}] ` +
        "Application configuration violation: application-scoped external direct-source cardinality is inconsistent.",
    );
  }

  const expectedExternalDirectSourceNames =
    new Set<string>(
      XYVALA_SEARCH_RUNTIME_APPLICATION_EXTERNAL_DIRECT_PORT_NAMES,
    );

  for (
    const actualName of
    externalDirectSourceNames
  ) {
    if (
      !expectedExternalDirectSourceNames.has(
        actualName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RUNTIME_APPLICATION_MODULE_NAME}] ` +
          `Application configuration violation: external direct capability ${actualName} is not application-scoped.`,
      );
    }
  }

  assertFunction(
    dependencies
      .external_direct_sources
      .acquire_documents,
    "external_direct_sources.acquire_documents",
  );

  if (
    !isRecord(
      dependencies
        .producer_adapter_dependencies,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_APPLICATION_MODULE_NAME}] ` +
        "Application configuration violation: producer_adapter_dependencies must be an object.",
    );
  }

  if (
    !isRecord(
      dependencies
        .execution_context_dependencies,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_APPLICATION_MODULE_NAME}] ` +
        "Application configuration violation: execution_context_dependencies must be an object.",
    );
  }

  assertFunction(
    dependencies
      .execution_context_dependencies
      .resolve_snapshot_variable_lineage,
    "execution_context_dependencies.resolve_snapshot_variable_lineage",
  );
}

/* ============================================================================
 * 11. CANONICAL CONTRACT VERSION VALIDATION
 * ----------------------------------------------------------------------------
 * The current canonical SearchQuery and SearchCohortDefinition producers use
 * the official pipeline contract version.
 *
 * This validation prevents an obsolete/stale canonical input contract from
 * silently entering the configured runtime.
 *
 * No contract is rewritten here.
 * ========================================================================== */

function validateCanonicalInputContractVersions(
  input:
    SearchRuntimeApplicationExecutionInput,
): void {
  const canonicalContractVersion =
    XYVALA_SEARCH_PIPELINE_CONTRACT
      .contract_version;

  if (
    input.query
      .contract_version !==
    canonicalContractVersion
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_APPLICATION_MODULE_NAME}] ` +
        `Application boundary violation: SearchQuery contract version ` +
        `${input.query.contract_version} does not match canonical Search ` +
        `pipeline contract version ${canonicalContractVersion}.`,
    );
  }

  if (
    input
      .cohort_definition
      .contract_version !==
    canonicalContractVersion
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_APPLICATION_MODULE_NAME}] ` +
        `Application boundary violation: SearchCohortDefinition contract ` +
        `version ${input.cohort_definition.contract_version} does not match ` +
        `canonical Search pipeline contract version ${canonicalContractVersion}.`,
    );
  }
}

/* ============================================================================
 * 12. EXECUTABLE QUERY VALIDATION
 * ----------------------------------------------------------------------------
 * SearchQuery validity is produced upstream.
 *
 * This module does NOT recalculate it.
 *
 * It only refuses to execute canonical input that is not explicitly VALID.
 * ========================================================================== */

function validateExecutableSearchQuery(
  input:
    SearchRuntimeApplicationExecutionInput,
): void {
  const query =
    input.query;

  if (
    query.validation_state !==
    "VALID"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_APPLICATION_MODULE_NAME}] ` +
        `Application execution rejected: SearchQuery ${query.query_id} has ` +
        `validation_state ${query.validation_state}.`,
    );
  }

  /*
   * Producer consistency check only.
   *
   * No rejection reason is reconstructed here.
   */
  if (
    query.rejection_reasons.length !==
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_APPLICATION_MODULE_NAME}] ` +
        `Application boundary violation: VALID SearchQuery ${query.query_id} ` +
        "contains rejection reasons.",
    );
  }
}

/* ============================================================================
 * 13. EXECUTABLE COHORT DEFINITION VALIDATION
 * ----------------------------------------------------------------------------
 * Same rule as SearchQuery:
 *
 * qualification belongs upstream;
 * execution authorization belongs here.
 * ========================================================================== */

function validateExecutableSearchCohortDefinition(
  input:
    SearchRuntimeApplicationExecutionInput,
): void {
  const cohortDefinition =
    input.cohort_definition;

  if (
    cohortDefinition.validation_state !==
    "VALID"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_APPLICATION_MODULE_NAME}] ` +
        `Application execution rejected: SearchCohortDefinition ` +
        `${cohortDefinition.cohort_id} has validation_state ` +
        `${cohortDefinition.validation_state}.`,
    );
  }

  if (
    cohortDefinition
      .rejection_reasons
      .length !==
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_APPLICATION_MODULE_NAME}] ` +
        `Application boundary violation: VALID SearchCohortDefinition ` +
        `${cohortDefinition.cohort_id} contains rejection reasons.`,
    );
  }
}

/* ============================================================================
 * 14. QUERY / COHORT SCOPE VALIDATION
 * ----------------------------------------------------------------------------
 * query_id identity is canonical shared scope.
 *
 * This is the ONLY query/cohort semantic relation asserted here.
 *
 * No filter equivalence is inferred.
 * ========================================================================== */

function validateQueryCohortScope(
  input:
    SearchRuntimeApplicationExecutionInput,
): void {
  if (
    input.query.query_id !==
    input.cohort_definition.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RUNTIME_APPLICATION_MODULE_NAME}] ` +
        `Application scope violation: SearchQuery ${input.query.query_id} ` +
        `and SearchCohortDefinition ${input.cohort_definition.cohort_id} ` +
        `do not share the same query_id.`,
    );
  }
}

/* ============================================================================
 * 15. COMPLETE APPLICATION INPUT VALIDATION
 * ----------------------------------------------------------------------------
 * This validates application-owned execution conditions only.
 *
 * SearchRuntimeInput timestamp/snapshot validation remains canonical
 * orchestrator responsibility.
 *
 * Policy/provider dependency validation remains bootstrap/composition
 * responsibility.
 * ========================================================================== */

function validateApplicationExecutionInput(
  input:
    SearchRuntimeApplicationExecutionInput,
): void {
  validateCanonicalInputContractVersions(
    input,
  );

  validateExecutableSearchQuery(
    input,
  );

  validateExecutableSearchCohortDefinition(
    input,
  );

  validateQueryCohortScope(
    input,
  );
}

/* ============================================================================
 * 16. SEARCH RUNTIME INPUT ASSEMBLY
 * ----------------------------------------------------------------------------
 * Transport-envelope assembly only.
 *
 * Exact references are retained for:
 *
 * - query
 * - cohort_definition
 *
 * Scalars are propagated unchanged.
 *
 * No Search truth is recalculated.
 * ========================================================================== */

function assembleSearchRuntimeInput(
  input:
    SearchRuntimeApplicationExecutionInput,
): SearchRuntimeInput {
  validateApplicationExecutionInput(
    input,
  );

  const runtimeInput = {
    /*
     * Exact canonical SearchQuery reference.
     */
    query:
      input.query,

    /*
     * Exact canonical SearchCohortDefinition reference.
     */
    cohort_definition:
      input.cohort_definition,

    /*
     * Explicit runtime execution timestamp.
     *
     * No local clock.
     */
    created_at:
      input.created_at,

    /*
     * Explicit analytical temporal reference.
     *
     * Never reconstructed from created_at.
     */
    publication_reference_at:
      input.publication_reference_at,

    /*
     * Explicit Search snapshot configuration.
     */
    snapshot_version:
      input.snapshot_version,
  } satisfies SearchRuntimeInput;

  return Object.freeze(
    runtimeInput,
  );
}

/* ============================================================================
 * 17. RUN-SCOPED BOOTSTRAP DEPENDENCY ASSEMBLY
 * ----------------------------------------------------------------------------
 * This is the crucial application -> execution lifecycle boundary.
 *
 * APPLICATION-SCOPED
 * ----------------------------------------------------------------------------
 * acquire_documents
 * producer_adapter_dependencies
 *
 * RUN-SCOPED
 * ----------------------------------------------------------------------------
 * resolve_snapshot_traceability
 * execution_observation_ports
 *
 * The resulting SearchRuntimeBootstrapDependencies object is valid only for
 * the current application.run(...) execution.
 *
 * No capability is wrapped, substituted or rebuilt.
 * ========================================================================== */

function assembleSearchRuntimeBootstrapDependencies(
  dependencies:
    SearchRuntimeApplicationDependencies,

  executionContext:
    SearchRuntimeExecutionContext,
): SearchRuntimeBootstrapDependencies {
  const externalDirectSources =
    Object.freeze({
      acquire_documents:
        dependencies
          .external_direct_sources
          .acquire_documents,

      resolve_snapshot_traceability:
        executionContext
          .resolve_snapshot_traceability,
    } satisfies SearchRuntimeBootstrapExternalDirectSources);

  const bootstrapDependencies = {
    external_direct_sources:
      externalDirectSources,

    producer_adapter_dependencies:
      dependencies
        .producer_adapter_dependencies,

    execution_observation_ports:
      executionContext
        .execution_observation_ports,
  } satisfies SearchRuntimeBootstrapDependencies;

  return Object.freeze(
    bootstrapDependencies,
  );
}

/* ============================================================================
 * 18. SEARCH RUNTIME APPLICATION FACTORY
 * ----------------------------------------------------------------------------
 * Creates one application-scoped configuration root.
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * It deliberately DOES NOT create SearchRuntimeOrchestrator here.
 *
 * Runtime composition is now run-scoped because execution trace collection is
 * run-scoped.
 *
 * EXECUTION
 * ----------------------------------------------------------------------------
 *
 * application.run(...)
 *        ↓
 * SearchRuntimeInput
 *        ↓
 * fresh SearchRuntimeExecutionContext
 *        ↓
 * fresh SearchRuntimeBootstrapDependencies
 *        ↓
 * fresh configured SearchRuntimeOrchestrator
 *        ↓
 * orchestrator.run(...)
 *        ↓
 * SearchPublicRankingProjection
 * ========================================================================== */

export function createSearchRuntimeApplication(
  dependencies:
    SearchRuntimeApplicationDependencies,
): SearchRuntimeApplication {
  /*
   * Validate only application-owned dependency structure here.
   *
   * Do NOT instantiate an execution context merely to validate it:
   * one context must correspond to one actual Search run.
   */
  validateSearchRuntimeApplicationDependencies(
    dependencies,
  );

  const application:
    SearchRuntimeApplication =
    Object.freeze({
      run:
        (
          input:
            SearchRuntimeApplicationExecutionInput,
        ):
          Promise<SearchPublicRankingProjection> => {
          /*
           * Application-owned input validation and exact runtime transport
           * assembly happen before run-scoped runtime composition.
           */
          const runtimeInput =
            assembleSearchRuntimeInput(
              input,
            );

          /*
           * ONE RUN
           * =
           * ONE FRESH EXECUTION CONTEXT
           *
           * This creates:
           * - one fresh execution trace collector;
           * - one fresh observe_execution transport;
           * - one fresh resolve_snapshot_traceability capability.
           */
          const executionContext =
            createSearchRuntimeExecutionContext(
              dependencies
                .execution_context_dependencies,
            );

          /*
           * Assemble exact canonical bootstrap dependencies for THIS run.
           *
           * Application-scoped analytical configuration references are
           * preserved.
           *
           * Run-scoped Execution Plane references originate exclusively from
           * executionContext.
           */
          const bootstrapDependencies =
            assembleSearchRuntimeBootstrapDependencies(
              dependencies,
              executionContext,
            );

          /*
           * Canonical bootstrap remains the only authorized runtime
           * composition path.
           *
           * A new configured orchestrator is deliberately created for each
           * execution so no run-scoped trace collection leaks across runs.
           */
          const orchestrator =
            createSearchRuntimeBootstrap(
              bootstrapDependencies,
            );

          /*
           * Return canonical PUBLIC_RANKING truth unchanged.
           *
           * No await-and-rebuild.
           * No projection clone.
           * No API validation here.
           */
          return orchestrator.run(
            runtimeInput,
          );
        },
    });

  return application;
}

/* ============================================================================
 * 19. STATIC APPLICATION OWNERSHIP
 * ----------------------------------------------------------------------------
 * Governance metadata only.
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_APPLICATION_OWNERSHIP =
  Object.freeze({
    application_boundary:
      "SEARCH_RUNTIME_APPLICATION",

    pipeline_layer_created:
      false,

    application_lifecycle_scope:
      "MULTI_RUN_CONFIGURATION_ROOT",

    execution_lifecycle_owner:
      "SEARCH_RUNTIME_EXECUTION_CONTEXT",

    execution_context_factory:
      "createSearchRuntimeExecutionContext",

    execution_context_scope:
      "ONE_CONTEXT_PER_APPLICATION_RUN",

    runtime_bootstrap_owner:
      "SEARCH_RUNTIME_BOOTSTRAP",

    runtime_bootstrap_scope:
      "ONE_BOOTSTRAP_PER_APPLICATION_RUN",

    runtime_composition_owner:
      "SEARCH_RUNTIME_COMPOSITION",

    runtime_execution_owner:
      "SEARCH_RUNTIME_ORCHESTRATOR",

    query_contract_owner:
      "SEARCH_QUERY_INPUT_CORE",

    cohort_definition_contract_owner:
      "SEARCH_COHORT_DEFINITION_INPUT_CORE",

    runtime_input_envelope_owner:
      "SEARCH_RUNTIME_APPLICATION",

    bootstrap_dependency_envelope_owner:
      "SEARCH_RUNTIME_APPLICATION",

    runtime_created_at_source:
      "APPLICATION_ORCHESTRATION",

    publication_reference_at_source:
      "APPLICATION_ORCHESTRATION",

    snapshot_version_source:
      "SEARCH_SNAPSHOT_CONFIGURATION",

    acquisition_owner:
      "ACQUISITION",

    application_external_direct_capabilities:
      XYVALA_SEARCH_RUNTIME_APPLICATION_EXTERNAL_DIRECT_PORT_NAMES,

    producer_adapter_dependency_owner:
      "APPLICATION_CONFIGURATION",

    execution_observation_ports_owner:
      "SEARCH_RUNTIME_EXECUTION_CONTEXT",

    execution_boundary_observation_owner:
      "SEARCH_ANCHOR_EXECUTION_BOUNDARY_OBSERVER",

    execution_trace_collection_lifecycle_owner:
      "SEARCH_RUNTIME_EXECUTION_TRACE_COLLECTOR",

    execution_trace_owner:
      "EXECUTION_TRACEABILITY",

    execution_trace_identity_owner:
      "EXECUTION_TRACEABILITY",

    snapshot_traceability_transport_owner:
      "SEARCH_RUNTIME_EXECUTION_CONTEXT",

    variable_lineage_owner:
      "VARIABLE_LINEAGE_GOVERNANCE",

    variable_lineage_resolver_configuration_owner:
      "APPLICATION_CONFIGURATION",

    cohort_batch_owner:
      "SEARCH_COHORT_BATCH",

    cohort_distribution_owner:
      "COHORT_NORMALIZATION",

    private_decision_owner:
      "PRIVATE_DECISION",

    public_transformation_owner:
      "TRANSFORMATION",

    public_ranking_owner:
      "PUBLIC_RANKING",

    output_contract:
      "SearchPublicRankingProjection",

    output_contract_owner:
      "PUBLIC_RANKING",

    application_creates_analytical_truth:
      false,

    application_creates_public_projection:
      false,

    application_creates_execution_trace_truth:
      false,

    application_creates_variable_lineage_truth:
      false,

    application_reconstructs_upstream_truth:
      false,

    application_reads_runtime_clock:
      false,

    application_generates_identity:
      false,

    application_persists_execution_state:
      false,

    application_mutates_analytical_truth:
      false,
  } as const);

/* ============================================================================
 * 20. STATIC APPLICATION GOVERNANCE
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_APPLICATION_GOVERNANCE =
  Object.freeze({
    /* ------------------------------------------------------------------------
     * FUNDAMENTAL
     * --------------------------------------------------------------------- */

    application_composition_root:
      true,

    analytical_producer:
      false,

    pipeline_layer_created:
      false,

    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    one_truth_one_owner:
      true,

    /* ------------------------------------------------------------------------
     * APPLICATION / RUN LIFECYCLE
     * --------------------------------------------------------------------- */

    application_may_execute_multiple_runs:
      true,

    one_execution_context_per_run_required:
      true,

    one_trace_collector_per_run_required:
      true,

    one_runtime_bootstrap_per_run_required:
      true,

    application_scoped_execution_context_allowed:
      false,

    application_scoped_trace_collector_allowed:
      false,

    cross_run_trace_collector_reuse_allowed:
      false,

    concurrent_run_trace_state_isolation_required:
      true,

    physical_execution_identity_generation_allowed:
      false,

    /* ------------------------------------------------------------------------
     * BOOTSTRAP
     * --------------------------------------------------------------------- */

    canonical_bootstrap_required:
      true,

    alternative_runtime_composition_allowed:
      false,

    individual_runtime_ports_exposed:
      false,

    bootstrap_dependency_assembly_allowed:
      true,

    bootstrap_dependency_reconstruction_allowed:
      false,

    /* ------------------------------------------------------------------------
     * INPUT
     * --------------------------------------------------------------------- */

    canonical_query_required:
      true,

    canonical_cohort_definition_required:
      true,

    valid_query_required:
      true,

    valid_cohort_definition_required:
      true,

    exact_query_scope_required:
      true,

    runtime_input_field_coverage_exact:
      true,

    canonical_query_reference_preserved:
      true,

    canonical_cohort_reference_preserved:
      true,

    publication_reference_preserved:
      true,

    snapshot_version_preserved:
      true,

    runtime_output_reference_semantics_preserved:
      true,

    /* ------------------------------------------------------------------------
     * QUERY / COHORT
     * --------------------------------------------------------------------- */

    query_reconstruction_allowed:
      false,

    cohort_definition_reconstruction_allowed:
      false,

    query_normalization_allowed:
      false,

    query_profiling_allowed:
      false,

    query_to_cohort_derivation_allowed:
      false,

    query_cohort_filter_equivalence_inference_allowed:
      false,

    query_cohort_filter_repair_allowed:
      false,

    query_cohort_filter_intersection_allowed:
      false,

    query_cohort_filter_union_allowed:
      false,

    query_cohort_contract_precedence_inference_allowed:
      false,

    cross_contract_filter_concordance_requires_canonical_policy:
      true,

    /* ------------------------------------------------------------------------
     * POLICY / OBSERVATION
     * --------------------------------------------------------------------- */

    policy_creation_allowed:
      false,

    policy_selection_allowed:
      false,

    policy_fallback_allowed:
      false,

    analytical_observation_creation_allowed:
      false,

    execution_boundary_observation_creation_allowed:
      false,

    execution_observation_reconstruction_allowed:
      false,

    external_capability_fallback_allowed:
      false,

    execution_observation_ports_application_dependency_allowed:
      false,

    execution_observation_ports_must_originate_from_execution_context:
      true,

    /* ------------------------------------------------------------------------
     * IDENTITY
     * --------------------------------------------------------------------- */

    distribution_identity_generation_allowed:
      false,

    snapshot_identity_generation_allowed:
      false,

    execution_identity_generation_allowed:
      false,

    /* ------------------------------------------------------------------------
     * TRACEABILITY / LINEAGE
     * --------------------------------------------------------------------- */

    trace_generation_allowed:
      false,

    trace_identity_generation_allowed:
      false,

    trace_reconstruction_allowed:
      false,

    variable_lineage_generation_allowed:
      false,

    variable_lineage_reconstruction_allowed:
      false,

    snapshot_traceability_reconstruction_allowed:
      false,

    application_scoped_snapshot_traceability_resolver_allowed:
      false,

    run_scoped_snapshot_traceability_resolver_required:
      true,

    canonical_variable_lineage_resolver_required:
      true,

    /* ------------------------------------------------------------------------
     * ANALYTICAL
     * --------------------------------------------------------------------- */

    scoring_allowed:
      false,

    eligibility_evaluation_allowed:
      false,

    cohort_normalization_allowed:
      false,

    relative_evaluation_allowed:
      false,

    private_decision_allowed:
      false,

    public_transformation_allowed:
      false,

    public_ranking_allowed:
      false,

    /* ------------------------------------------------------------------------
     * OUTPUT
     * --------------------------------------------------------------------- */

    output_projection_validation_allowed:
      false,

    output_projection_cloning_allowed:
      false,

    output_projection_filtering_allowed:
      false,

    output_projection_sorting_allowed:
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

    cache_mutation_allowed:
      false,

    logging_allowed:
      false,

    event_publication_allowed:
      false,

    /* ------------------------------------------------------------------------
     * PROHIBITED SHORTCUTS
     * --------------------------------------------------------------------- */

    prohibited_shortcuts:
      Object.freeze([
        "application_created_alternative_runtime",
        "application_exposed_individual_runtime_ports",

        "application_created_singleton_runtime_for_run_scoped_trace_state",
        "application_reused_execution_context_across_runs",
        "application_reused_trace_collector_across_runs",
        "application_reused_snapshot_traceability_resolver_across_runs",

        "application_received_execution_observation_ports_directly",
        "application_received_snapshot_traceability_resolver_directly",

        "application_reconstructed_search_query",
        "application_reconstructed_cohort_definition",

        "application_derived_cohort_from_query",
        "application_intersected_query_cohort_filters",
        "application_unioned_query_cohort_filters",
        "application_repaired_query_cohort_divergence",
        "application_selected_query_cohort_precedence",

        "application_selected_policy",
        "application_created_policy_fallback",

        "application_created_analytical_observation_evidence",
        "application_created_execution_boundary_observation_evidence",
        "application_reconstructed_execution_observation",
        "application_created_external_capability_fallback",

        "application_generated_distribution_id",
        "application_generated_snapshot_id",
        "application_generated_execution_instance_id",

        "application_generated_execution_trace",
        "application_generated_execution_trace_id",
        "application_reconstructed_execution_trace",

        "application_generated_variable_lineage",
        "application_reconstructed_variable_lineage",
        "application_inferred_variable_lineage_from_trace",
        "application_inferred_variable_lineage_from_runtime_state",

        "application_reconstructed_snapshot_traceability",

        "application_read_runtime_clock",
        "application_generated_random_identity",

        "application_rebuilt_public_projection",
        "application_cloned_public_projection",
        "application_filtered_public_projection",
        "application_sorted_public_projection",

        "application_converted_rejected_query_to_valid",
        "application_converted_rejected_cohort_to_valid",

        "application_persisted_execution_context",
        "application_cached_execution_context",
      ] as const),
  } as const);

/* ============================================================================
 * 21. EXPLICIT ARCHITECTURAL STATUS
 * ----------------------------------------------------------------------------
 * Audit metadata only.
 * ========================================================================== */

export const XYVALA_SEARCH_RUNTIME_APPLICATION_STATUS =
  Object.freeze({
    application_run_scope_separated:
      true,

    per_run_execution_context_required:
      true,

    per_run_trace_collector_required:
      true,

    per_run_bootstrap_required:
      true,

    application_scoped_execution_observation_ports_removed:
      true,

    application_scoped_snapshot_traceability_resolver_removed:
      true,

    canonical_variable_lineage_resolver_dependency_required:
      true,

    execution_trace_truth_remains_external_to_application:
      true,

    variable_lineage_truth_remains_external_to_application:
      true,

    end_to_end_runtime_integration_complete:
      false,
  } as const);
