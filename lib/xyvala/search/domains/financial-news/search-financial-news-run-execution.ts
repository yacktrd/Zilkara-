/* ============================================================================
 * FILE: lib/xyvala/search/domains/financial-news/search-financial-news-run-execution.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search Financial News prepared-run execution boundary
 *
 * ROLE
 * - consume one already-prepared query-scoped Financial News run
 * - create one fresh Financial News application composition from the prepared
 *   application-composition input
 * - assemble one exact canonical SearchRuntimeApplicationExecutionInput
 * - preserve the exact prepared SearchQuery reference
 * - transport explicit analytical created_at, publication_reference_at and
 *   snapshot_version supplied by external application orchestration
 * - execute exactly one canonical application.run(...) call per function call
 * - return the canonical SearchPublicRankingProjection promise unchanged
 *
 * CLASSIFICATION
 * - SEARCH DOMAIN
 * - FINANCIAL NEWS
 * - RUN EXECUTION BOUNDARY
 * - QUERY-SCOPED EXECUTION COORDINATION
 * - PREPARED APPLICATION EXECUTION
 * - COMPOSE / VALIDATE / TRANSPORT / EXECUTE
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING
 * - NON-TRANSFORMING
 * - NON-CALIBRATING
 * - NON-TRACE-OWNING
 * - NON-LINEAGE-OWNING
 * - NON-IDENTITY-PRODUCING
 * - NON-TIMESTAMP-PRODUCING
 * - NON-MUTATING
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * durable Financial News source
 *        ↓
 * acquisition preparation
 *        ↓
 * prepared query-scoped acquisition source
 *        ↓
 * prepareSearchFinancialNewsRun(...)
 *        ↓
 * SearchFinancialNewsPreparedRun
 *
 * external application orchestration
 *        ├── canonical SearchCohortDefinition
 *        ├── analytical created_at
 *        ├── publication_reference_at
 *        └── snapshot_version
 *        ↓
 * THIS MODULE
 *        ↓
 * createSearchFinancialNewsApplicationComposition(
 *   prepared_run.application_composition_input
 * )
 *        ↓
 * fresh query-scoped SearchRuntimeApplication
 *        ↓
 * application.run({
 *   query: prepared_run.query,
 *   cohort_definition,
 *   created_at,
 *   publication_reference_at,
 *   snapshot_version
 * })
 *        ↓
 * canonical Search runtime
 *        ↓
 * SearchPublicRankingProjection
 *
 * IMPORTANT — PREPARATION != EXECUTION
 * ----------------------------------------------------------------------------
 * This module does NOT perform acquisition preparation.
 *
 * It requires an already-produced:
 *
 * SearchFinancialNewsPreparedRun
 *
 * from:
 *
 * prepareSearchFinancialNewsRun(...)
 *
 * This prevents a live network acquisition from being hidden inside an
 * analytical run that reuses a timestamp observed before acquisition.
 *
 * The intended external sequence is:
 *
 * request_started_at observed externally
 *        ↓
 * await prepareSearchFinancialNewsRun(...)
 *        ↓
 * acquisition is complete
 *        ↓
 * analytical created_at observed externally
 *        ↓
 * executeSearchFinancialNewsPreparedRun(...)
 *
 * THIS module never generates either timestamp.
 *
 * QUERY REFERENCE GOVERNANCE
 * ----------------------------------------------------------------------------
 * The exact canonical SearchQuery reference prepared upstream MUST be the query
 * entering application.run(...).
 *
 * Therefore:
 *
 * executionInput.query
 * ===
 * prepared_run.query
 * ===
 * prepared_run.acquisition_preparation.acquisition_input.query
 *
 * This module MUST NOT:
 * - clone SearchQuery;
 * - rebuild SearchQuery;
 * - derive another query from raw_query;
 * - accept a replacement query at this execution boundary.
 *
 * No `query` field exists on SearchFinancialNewsRunExecutionInput.
 *
 * This removes the possibility of accidentally executing the prepared
 * acquisition source with a second query object.
 *
 * PREPARED ACQUISITION GOVERNANCE
 * ----------------------------------------------------------------------------
 * The prepared application-composition input MUST preserve:
 *
 * application_composition_input.authorized_acquisition_source
 * ===
 * acquisition_preparation.authorized_acquisition_source
 *
 * That prepared source remains the owner of the query-binding and acquisition
 * causality gate.
 *
 * During application.run(...), when the runtime invokes acquire_documents, the
 * prepared source verifies:
 *
 * - exact canonical SearchQuery reference;
 * - matching query_id;
 * - analytical created_at is not earlier than preparation/acquisition truth;
 * - retained acquisition batch reference/order/timestamps have not diverged.
 *
 * THIS module deliberately does NOT duplicate those validations.
 *
 * TEMPORAL GOVERNANCE
 * ----------------------------------------------------------------------------
 * Four temporal realities remain distinct:
 *
 * request / preparation created_at
 * - belongs to acquisition preparation input / external orchestration
 *
 * acquisition fetched_at / acquisition created_at
 * - belong to Acquisition observations
 *
 * analytical created_at
 * - explicit execution timestamp supplied to THIS boundary
 *
 * publication_reference_at
 * - explicit independent analytical temporal reference supplied to THIS boundary
 *
 * This module MUST NOT:
 * - call Date.now();
 * - call new Date();
 * - copy acquisition timestamps into analytical created_at;
 * - compute max(acquisition time, runtime time);
 * - derive publication_reference_at from created_at;
 * - derive created_at from publication_reference_at;
 * - inspect or replace source_published_at.
 *
 * Temporal validation remains distributed to its canonical boundaries:
 *
 * - prepared acquisition source:
 *   analytical created_at vs preparation/acquisition timestamps
 *
 * - SearchRuntimeApplication / SearchRuntimeOrchestrator:
 *   runtime input qualification
 *
 * - Temporal producer:
 *   publication-derived analytical truth
 *
 * APPLICATION LIFECYCLE
 * ----------------------------------------------------------------------------
 * A fresh Financial News application composition is created for each call to:
 *
 * executeSearchFinancialNewsPreparedRun(...)
 *
 * This is intentional because the acquisition capability embedded in the
 * prepared run is query-scoped.
 *
 * The resulting application MUST NOT be cached globally as a multi-query
 * application singleton.
 *
 * SearchRuntimeApplication itself still owns:
 * - one fresh execution context per run;
 * - one fresh trace collector per run;
 * - one fresh bootstrap per run;
 * - canonical runtime invocation.
 *
 * THIS module does not recreate those lifecycle rules.
 *
 * REPLAY
 * ----------------------------------------------------------------------------
 * Calling this function again with the SAME prepared run is not prohibited by
 * this boundary.
 *
 * The prepared acquisition source may support replay for the same canonical
 * query according to its own contract.
 *
 * Each call still creates:
 * - a fresh Financial News application composition;
 * - a fresh application.run(...) execution lifecycle.
 *
 * This module invents no execution identity and imposes no single-use token.
 *
 * COHORT GOVERNANCE
 * ----------------------------------------------------------------------------
 * SearchCohortDefinition is supplied explicitly.
 *
 * This module does NOT:
 * - derive cohort filters from SearchQuery;
 * - clone or repair SearchCohortDefinition;
 * - infer language/domain/source/time-window concordance.
 *
 * Canonical application execution validates:
 *
 * prepared_run.query.query_id
 * ===
 * cohort_definition.query_id
 *
 * and requires already-qualified canonical inputs.
 *
 * OUTPUT GOVERNANCE
 * ----------------------------------------------------------------------------
 * The returned promise resolves to canonical PUBLIC_RANKING truth.
 *
 * This module MUST NOT:
 * - await and rebuild the projection;
 * - clone results;
 * - filter results;
 * - sort results;
 * - assign public_position;
 * - expose private snapshot truth.
 *
 * Public API validation remains downstream.
 *
 * FAILURE SEMANTICS
 * ----------------------------------------------------------------------------
 * Any failure from:
 *
 * - Financial News application composition;
 * - runtime configuration;
 * - prepared acquisition source;
 * - Search runtime bootstrap;
 * - analytical producer;
 * - traceability / lineage;
 * - public ranking
 *
 * propagates unchanged.
 *
 * No catch-and-repair.
 * No empty projection fallback.
 * No unavailable synthesis.
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * No parallel execution schema is introduced.
 *
 * Types are derived directly from:
 *
 * - SearchFinancialNewsPreparedRun
 * - SearchFinancialNewsApplicationCompositionInput
 * - SearchRuntimeApplicationExecutionInput
 * - createSearchFinancialNewsApplicationComposition(...)
 *
 * Compile-time guards require the canonical application execution input to
 * remain exactly:
 *
 * - query
 * - cohort_definition
 * - created_at
 * - publication_reference_at
 * - snapshot_version
 *
 * Any future field change forces explicit reconciliation here.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * prepared_run query reference changed
 * => THIS execution boundary
 *
 * prepared acquisition source changed before execution
 * => THIS execution boundary
 *
 * prepared source receives another query
 * => acquisition-preparation boundary
 *
 * analytical created_at predates acquisition
 * => acquisition-preparation boundary
 *
 * invalid query / cohort / query scope
 * => SearchRuntimeApplication boundary
 *
 * invalid runtime timestamp / publication reference / snapshot version
 * => SearchRuntimeOrchestrator boundary
 *
 * application composition divergence
 * => Financial News application-composition boundary
 *
 * analytical execution divergence
 * => corresponding canonical producer
 *
 * This module MUST NOT repair any divergence.
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - prepared run required
 * - exact SearchQuery reference required
 * - exact prepared acquisition source required
 * - exact application-composition input required
 * - explicit cohort definition required
 * - explicit analytical created_at required
 * - explicit publication_reference_at required
 * - explicit snapshot_version required
 * - canonical Financial News application composition only
 * - canonical application.run(...) only
 * - return runtime promise unchanged
 *
 * - no acquisition preparation
 * - no live source selection
 * - no query replacement
 * - no query cloning
 * - no cohort reconstruction
 * - no timestamp generation
 * - no timestamp repair
 * - no clock access
 * - no policy creation
 * - no policy selection
 * - no provider invocation outside canonical runtime
 * - no analytical calculation
 * - no score calculation
 * - no ranking calculation
 * - no public transformation
 * - no calibration
 * - no trace creation
 * - no lineage creation
 * - no identity generation
 * - no projection reconstruction
 *
 * - no Date.now()
 * - no new Date()
 * - no randomUUID()
 * - no randomness
 * - no persistence
 * - no module-level mutable state
 * - no cache
 * - no logging
 * - no direct HTTP access
 * - no file-system access
 *
 * PROTOCOL
 * ----------------------------------------------------------------------------
 * - Xyvala Search Protocol 3.0
 * - Search VLR OFFICIAL / NORMATIVE
 * - Contract Before Runtime
 * - First Divergence Before Correction
 * - reality before interpretation
 * - one truth = one canonical owner
 * - no downstream reconstruction
 * - explicit availability
 * - unavailable != zero
 * - provider failure != empty result
 * - Compute / Observe / Mutate separation
 * - Configuration != Preparation != Composition != Execution
 * - query-scoped preparation != run-scoped execution
 * ========================================================================== */

import type {
  SearchModuleVersion,
} from "../../contracts/search-pipeline-contract";

import {
  createSearchFinancialNewsApplicationComposition,
} from "./search-financial-news-application-composition";

import type {
  SearchFinancialNewsPreparedRun,
} from "./search-financial-news-run-preparation";

import type {
  SearchRuntimeApplicationExecutionInput,
} from "../../runtime/search-runtime-application";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUN_EXECUTION_MODULE_NAME =
  "xyvala-search-financial-news-run-execution" as const;

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUN_EXECUTION_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

/* ============================================================================
 * 2. CANONICAL APPLICATION / RESULT TYPES
 * ========================================================================== */

type SearchFinancialNewsPreparedApplication =
  ReturnType<
    typeof createSearchFinancialNewsApplicationComposition
  >;

export type SearchFinancialNewsRunExecutionResult =
  Awaited<
    ReturnType<
      SearchFinancialNewsPreparedApplication[
        "run"
      ]
    >
  >;

/* ============================================================================
 * 3. CANONICAL APPLICATION EXECUTION INPUT COVERAGE
 * ========================================================================== */

type SearchFinancialNewsCanonicalApplicationExecutionField =
  | "query"
  | "cohort_definition"
  | "created_at"
  | "publication_reference_at"
  | "snapshot_version";

type SearchFinancialNewsMissingCanonicalApplicationExecutionField =
  Exclude<
    keyof SearchRuntimeApplicationExecutionInput,
    SearchFinancialNewsCanonicalApplicationExecutionField
  >;

type SearchFinancialNewsUnknownCanonicalApplicationExecutionField =
  Exclude<
    SearchFinancialNewsCanonicalApplicationExecutionField,
    keyof SearchRuntimeApplicationExecutionInput
  >;

type SearchFinancialNewsCanonicalApplicationExecutionCoverageIsExact =
  [
    SearchFinancialNewsMissingCanonicalApplicationExecutionField,
    SearchFinancialNewsUnknownCanonicalApplicationExecutionField,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_FINANCIAL_NEWS_RUN_EXECUTION_APPLICATION_INPUT_COVERAGE_IS_EXACT:
  SearchFinancialNewsCanonicalApplicationExecutionCoverageIsExact =
    true;

void XYVALA_SEARCH_FINANCIAL_NEWS_RUN_EXECUTION_APPLICATION_INPUT_COVERAGE_IS_EXACT;

/* ============================================================================
 * 4. RUN EXECUTION INPUT
 * ========================================================================== */

export interface SearchFinancialNewsRunExecutionInput {
  readonly prepared_run:
    SearchFinancialNewsPreparedRun;

  readonly cohort_definition:
    SearchRuntimeApplicationExecutionInput[
      "cohort_definition"
    ];

  readonly created_at:
    SearchRuntimeApplicationExecutionInput[
      "created_at"
    ];

  readonly publication_reference_at:
    SearchRuntimeApplicationExecutionInput[
      "publication_reference_at"
    ];

  readonly snapshot_version:
    SearchRuntimeApplicationExecutionInput[
      "snapshot_version"
    ];
}

/* ============================================================================
 * 5. EXECUTION ROOT FIELD COVERAGE
 * ========================================================================== */

type SearchFinancialNewsRunExecutionExpectedField =
  | "prepared_run"
  | Exclude<
      keyof SearchRuntimeApplicationExecutionInput,
      "query"
    >;

type SearchFinancialNewsRunExecutionMissingField =
  Exclude<
    keyof SearchFinancialNewsRunExecutionInput,
    SearchFinancialNewsRunExecutionExpectedField
  >;

type SearchFinancialNewsRunExecutionUnknownField =
  Exclude<
    SearchFinancialNewsRunExecutionExpectedField,
    keyof SearchFinancialNewsRunExecutionInput
  >;

type SearchFinancialNewsRunExecutionInputCoverageIsExact =
  [
    SearchFinancialNewsRunExecutionMissingField,
    SearchFinancialNewsRunExecutionUnknownField,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_FINANCIAL_NEWS_RUN_EXECUTION_INPUT_COVERAGE_IS_EXACT:
  SearchFinancialNewsRunExecutionInputCoverageIsExact =
    true;

void XYVALA_SEARCH_FINANCIAL_NEWS_RUN_EXECUTION_INPUT_COVERAGE_IS_EXACT;

/* ============================================================================
 * 6. SAFE ROOT ASSERTION
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

function assertSearchFinancialNewsPreparedRunReferenceIntegrity(
  preparedRun:
    SearchFinancialNewsPreparedRun,
): void {
  if (
    !isRecord(
      preparedRun,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_RUN_EXECUTION_MODULE_NAME}] ` +
        "Run-execution violation: prepared_run must be an object.",
    );
  }

  if (
    !isRecord(
      preparedRun
        .acquisition_preparation,
    ) ||
    !isRecord(
      preparedRun
        .application_composition_input,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_RUN_EXECUTION_MODULE_NAME}] ` +
        "Run-execution violation: prepared_run transport envelope is invalid.",
    );
  }

  if (
    preparedRun.query !==
    preparedRun
      .acquisition_preparation
      .acquisition_input
      .query
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_RUN_EXECUTION_MODULE_NAME}] ` +
        "First divergence: prepared_run.query does not preserve the canonical acquisition-preparation SearchQuery reference.",
    );
  }

  if (
    preparedRun
      .application_composition_input
      .authorized_acquisition_source !==
    preparedRun
      .acquisition_preparation
      .authorized_acquisition_source
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_RUN_EXECUTION_MODULE_NAME}] ` +
        "First divergence: application composition input does not preserve the prepared acquisition-source reference.",
    );
  }
}

function assertSearchFinancialNewsRunExecutionInput(
  input:
    SearchFinancialNewsRunExecutionInput,
): void {
  if (
    !isRecord(
      input,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_RUN_EXECUTION_MODULE_NAME}] ` +
        "Run-execution violation: input must be an object.",
    );
  }

  assertSearchFinancialNewsPreparedRunReferenceIntegrity(
    input
      .prepared_run,
  );
}

/* ============================================================================
 * 7. EXACT CANONICAL APPLICATION EXECUTION INPUT
 * ========================================================================== */

function createSearchFinancialNewsApplicationExecutionInput(
  input:
    SearchFinancialNewsRunExecutionInput,
): SearchRuntimeApplicationExecutionInput {
  const executionInput = {
    query:
      input
        .prepared_run
        .query,

    cohort_definition:
      input
        .cohort_definition,

    created_at:
      input
        .created_at,

    publication_reference_at:
      input
        .publication_reference_at,

    snapshot_version:
      input
        .snapshot_version,
  } satisfies SearchRuntimeApplicationExecutionInput;

  return Object.freeze(
    executionInput,
  );
}

/* ============================================================================
 * 8. CANONICAL PREPARED-RUN EXECUTION
 * ========================================================================== */

export function executeSearchFinancialNewsPreparedRun(
  input:
    SearchFinancialNewsRunExecutionInput,
): ReturnType<
  SearchFinancialNewsPreparedApplication[
    "run"
  ]
> {
  assertSearchFinancialNewsRunExecutionInput(
    input,
  );

  const preparedRun =
    input
      .prepared_run;

  const application =
    createSearchFinancialNewsApplicationComposition(
      preparedRun
        .application_composition_input,
    );

  const executionInput =
    createSearchFinancialNewsApplicationExecutionInput(
      input,
    );

  return application.run(
    executionInput,
  );
}

/* ============================================================================
 * 9. STATIC MANIFEST
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUN_EXECUTION_MANIFEST =
  Object.freeze({
    execution:
      "FINANCIAL_NEWS_PREPARED_RUN_EXECUTION_V1",

    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUN_EXECUTION_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUN_EXECUTION_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    root_input_field_count:
      5,

    query_input_field_exposed:
      false,

    prepared_query_reference_required:
      true,

    prepared_acquisition_source_reference_required:
      true,

    application_composition_created_per_call:
      true,

    application_run_invoked_per_call:
      true,

    analytical_timestamp_generated:
      false,

    publication_reference_generated:
      false,

    snapshot_version_generated:
      false,

    runtime_clock_read:
      false,

    direct_network_access:
      false,

    output_reconstruction:
      false,
  } as const);

/* ============================================================================
 * 10. STATIC OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUN_EXECUTION_OWNERSHIP =
  Object.freeze({
    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUN_EXECUTION_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUN_EXECUTION_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    architectural_plane:
      "EXECUTION_COORDINATION_PLANE",

    architectural_role:
      "QUERY_SCOPED_PREPARED_RUN_EXECUTION_BOUNDARY",

    prepared_run_owner:
      "FINANCIAL_NEWS_RUN_PREPARATION",

    query_truth_owner:
      "SEARCH_QUERY_INPUT_CORE",

    cohort_definition_truth_owner:
      "SEARCH_COHORT_DEFINITION_INPUT_CORE",

    analytical_created_at_owner:
      "EXTERNAL_APPLICATION_ORCHESTRATION",

    publication_reference_at_owner:
      "EXTERNAL_APPLICATION_ORCHESTRATION",

    snapshot_version_owner:
      "SEARCH_SNAPSHOT_CONFIGURATION",

    application_composition_owner:
      "FINANCIAL_NEWS_APPLICATION_COMPOSITION",

    runtime_application_owner:
      "SEARCH_RUNTIME_APPLICATION",

    runtime_execution_owner:
      "SEARCH_RUNTIME_ORCHESTRATOR",

    public_projection_owner:
      "PUBLIC_RANKING",

    prepared_run_consumed_here:
      true,

    application_composition_requested_here:
      true,

    application_run_requested_here:
      true,

    query_created_here:
      false,

    query_cloned_here:
      false,

    cohort_definition_created_here:
      false,

    analytical_timestamp_created_here:
      false,

    publication_reference_created_here:
      false,

    snapshot_version_created_here:
      false,

    acquisition_preparation_executed_here:
      false,

    acquisition_observation_created_here:
      false,

    raw_document_created_here:
      false,

    policy_created_here:
      false,

    analytical_truth_created_here:
      false,

    execution_trace_created_here:
      false,

    variable_lineage_created_here:
      false,

    identity_created_here:
      false,

    public_projection_created_here:
      false,

    public_projection_rebuilt_here:
      false,

    persistence_performed:
      false,

    mutable_global_state_created:
      false,
  } as const);

/* ============================================================================
 * 11. STATIC GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUN_EXECUTION_GOVERNANCE =
  Object.freeze({
    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    reality_before_interpretation:
      true,

    one_truth_one_owner:
      true,

    prepared_run_required:
      true,

    exact_prepared_query_reference_required:
      true,

    exact_prepared_acquisition_source_reference_required:
      true,

    canonical_application_composition_required:
      true,

    canonical_application_run_required:
      true,

    canonical_application_execution_input_required:
      true,

    explicit_cohort_definition_required:
      true,

    explicit_analytical_created_at_required:
      true,

    explicit_publication_reference_at_required:
      true,

    explicit_snapshot_version_required:
      true,

    replacement_query_input_allowed:
      false,

    query_clone_allowed:
      false,

    query_reconstruction_allowed:
      false,

    cohort_reconstruction_allowed:
      false,

    acquisition_preparation_allowed_here:
      false,

    timestamp_generation_allowed:
      false,

    timestamp_repair_allowed:
      false,

    acquisition_timestamp_as_analytical_timestamp_allowed:
      false,

    publication_reference_from_created_at_allowed:
      false,

    created_at_from_publication_reference_allowed:
      false,

    source_publication_interpretation_allowed:
      false,

    runtime_clock_access_allowed:
      false,

    application_singleton_cache_allowed:
      false,

    prepared_application_global_reuse_allowed:
      false,

    policy_creation_allowed:
      false,

    policy_selection_allowed:
      false,

    policy_fallback_allowed:
      false,

    analytical_calculation_allowed:
      false,

    scoring_allowed:
      false,

    ranking_allowed:
      false,

    public_transformation_allowed:
      false,

    calibration_allowed:
      false,

    trace_generation_allowed:
      false,

    lineage_generation_allowed:
      false,

    identity_generation_allowed:
      false,

    output_projection_validation_allowed:
      false,

    output_projection_cloning_allowed:
      false,

    output_projection_filtering_allowed:
      false,

    output_projection_sorting_allowed:
      false,

    output_projection_reconstruction_allowed:
      false,

    failure_swallowing_allowed:
      false,

    empty_projection_fallback_allowed:
      false,

    unavailable_fallback_allowed:
      false,

    direct_http_access_allowed:
      false,

    persistence_allowed:
      false,

    module_level_mutable_state_allowed:
      false,

    cache_allowed:
      false,

    logging_allowed:
      false,

    file_system_access_allowed:
      false,

    prohibited_shortcuts:
      Object.freeze([
        "accept_replacement_query",
        "clone_prepared_query",
        "reconstruct_query_from_raw_query",
        "reconstruct_cohort_definition",

        "perform_acquisition_preparation_inside_execution",
        "bind_durable_live_source_instead_of_prepared_source",

        "read_runtime_clock",
        "generate_analytical_timestamp",
        "use_fetched_at_as_analytical_created_at",
        "use_acquisition_created_at_as_analytical_created_at",
        "repair_analytical_timestamp_with_max",

        "derive_publication_reference_from_created_at",
        "derive_created_at_from_publication_reference",
        "interpret_source_published_at",

        "cache_query_scoped_application_as_global_singleton",
        "reuse_prepared_application_for_unrelated_query",

        "create_policy",
        "select_policy",
        "policy_fallback",

        "analytical_recalculation",
        "score_reconstruction",
        "ranking_reconstruction",
        "public_transformation_reconstruction",

        "trace_generation",
        "lineage_generation",
        "identity_generation",

        "await_and_rebuild_public_projection",
        "clone_public_projection",
        "filter_public_projection",
        "sort_public_projection",

        "swallow_runtime_failure",
        "runtime_failure_to_empty_projection",
        "runtime_failure_to_unavailable",

        "direct_http_access",
        "persistence",
        "mutable_global_state",
        "cache",
        "logging",
      ] as const),
  } as const);
