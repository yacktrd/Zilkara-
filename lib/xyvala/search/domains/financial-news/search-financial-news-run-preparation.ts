/* ============================================================================
 * FILE: lib/xyvala/search/domains/financial-news/search-financial-news-run-preparation.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search Financial News query-scoped run preparation
 *
 * ROLE
 * - prepare one Financial News acquisition batch BEFORE analytical execution
 * - bind the resulting prepared acquisition source to the exact canonical query
 * - assemble the exact input expected by Financial News application composition
 * - preserve Behavioral Calibration and observation-source references unchanged
 * - return a query-scoped preparation envelope for a later execution boundary
 *
 * CLASSIFICATION
 * - SEARCH DOMAIN
 * - FINANCIAL NEWS
 * - RUN PREPARATION
 * - QUERY-SCOPED COMPOSITION
 * - PRE-EXECUTION BOUNDARY
 * - APPLICATION INPUT PREPARATION
 * - ASYNC PREPARATION
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-RANKING
 * - NON-TRANSFORMING
 * - NON-CALIBRATING
 * - NON-TRACE-PRODUCING
 * - NON-LINEAGE-PRODUCING
 * - NON-IDENTITY-PRODUCING
 * - NON-SNAPSHOT-PRODUCING
 * - NON-RUNTIME-EXECUTING
 * - NON-MUTATING
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * canonical SearchQuery
 *        +
 * explicit acquisition preparation input
 *        +
 * authorized durable Financial News acquisition source
 *        ↓
 * prepareSearchFinancialNewsAcquisition(...)
 *        ↓
 * one query-scoped prepared acquisition source
 *        +
 * exact upstream acquisition observations retained in memory
 *
 * explicit Behavioral Calibration policy
 *        +
 * three authorized Financial News observation sources
 *        ↓
 * THIS MODULE
 *        ↓
 * query-scoped SearchFinancialNewsApplicationCompositionInput
 *        ↓
 * LATER EXECUTION BOUNDARY
 *        ↓
 * createSearchFinancialNewsApplicationComposition(...)
 *        ↓
 * application.run(...)
 *
 * IMPORTANT — PREPARATION != APPLICATION COMPOSITION != EXECUTION
 * ----------------------------------------------------------------------------
 * This module MUST NOT call:
 *
 * - createSearchFinancialNewsApplicationComposition(...)
 * - createSearchRuntimeApplication(...)
 * - application.run(...)
 *
 * It prepares only the exact inputs required by the existing Financial News
 * application-composition boundary.
 *
 * This separation is deliberate:
 *
 * CONFIGURATION
 *        !=
 * ACQUISITION PREPARATION
 *        !=
 * APPLICATION COMPOSITION
 *        !=
 * ANALYTICAL EXECUTION
 *
 * WHY THIS MODULE EXISTS
 * ----------------------------------------------------------------------------
 * Live Financial News acquisition may finish after the timestamp representing
 * the start of a request.
 *
 * Canonical Extraction rejects:
 *
 * extraction.created_at < raw_document.fetched_at
 *
 * Therefore a live network acquisition must not be hidden inside a runtime
 * execution that continues to reuse a timestamp observed before acquisition.
 *
 * The official Financial News flow for this integration is:
 *
 * request / orchestration context
 *        ↓
 * acquisition preparation
 *        ↓
 * acquisition completes with real fetched_at / created_at truth
 *        ↓
 * caller explicitly observes analytical created_at AFTER awaiting preparation
 *        ↓
 * later application.run(...)
 *
 * This module does NOT observe that later analytical timestamp.
 *
 * The prepared acquisition source itself enforces temporal compatibility when
 * the runtime later invokes it.
 *
 * QUERY SCOPE
 * ----------------------------------------------------------------------------
 * One preparation belongs to exactly one canonical SearchQuery reference.
 *
 * The acquisition-preparation boundary already enforces:
 *
 * runtime query reference
 * ===
 * preparation query reference
 *
 * and:
 *
 * runtime query_id
 * ===
 * preparation query_id
 *
 * Therefore this module MUST preserve the exact SearchQuery reference.
 *
 * It MUST NOT:
 * - clone SearchQuery;
 * - rebuild SearchQuery;
 * - normalize SearchQuery;
 * - replace query_id;
 * - derive a new query from raw_query.
 *
 * ACQUISITION OWNERSHIP
 * ----------------------------------------------------------------------------
 * The authorized acquisition source owns acquisition observations.
 *
 * The existing acquisition-preparation boundary owns:
 * - one explicit invocation of that source;
 * - query binding for the prepared source;
 * - observation-array/reference preservation;
 * - acquisition/execution timestamp compatibility checks.
 *
 * This module does NOT duplicate those rules.
 *
 * SearchRawDocument remains owned by:
 *
 * SEARCH_ACQUISITION_CORE
 *
 * and is created later through the existing Financial News acquisition adapter.
 *
 * APPLICATION INPUT OWNERSHIP
 * ----------------------------------------------------------------------------
 * The canonical Financial News application-composition input currently contains:
 *
 * 1. authorized_acquisition_source
 * 2. behavioral_calibration_scoring_policy
 * 3. authorized_link_observation_source
 * 4. authorized_temporal_observation_source
 * 5. authorized_behavioral_observation_source
 *
 * THIS module assembles that envelope using:
 *
 * authorized_acquisition_source
 * <- prepared query-scoped acquisition source
 *
 * all other fields
 * <- exact caller-supplied references
 *
 * No policy or observation source is created, wrapped, selected or replaced.
 *
 * LIFECYCLE
 * ----------------------------------------------------------------------------
 * The returned application_composition_input is QUERY-SCOPED.
 *
 * It MUST NOT be:
 * - installed as a global application singleton;
 * - cached as the acquisition source for unrelated queries;
 * - reused with a cloned/different SearchQuery;
 * - treated as a provider-independent application configuration root.
 *
 * A higher execution boundary may create a fresh Financial News application
 * composition from it for the prepared query.
 *
 * The prepared acquisition source may support replay for the SAME canonical
 * query according to the acquisition-preparation contract.
 *
 * TEMPORAL GOVERNANCE
 * ----------------------------------------------------------------------------
 * This module:
 * - reads no clock;
 * - generates no timestamp;
 * - repairs no timestamp;
 * - computes no "latest" timestamp;
 * - does not select max(fetched_at, created_at);
 * - does not copy acquisition time into analytical time;
 * - does not copy runtime time into acquisition observations.
 *
 * `acquisition_input.created_at` remains preparation input truth.
 *
 * The later analytical `created_at` remains owned by:
 *
 * EXTERNAL APPLICATION ORCHESTRATION
 *
 * and MUST be observed explicitly after this async preparation resolves.
 *
 * `publication_reference_at` remains a separate later runtime input.
 *
 * `source_published_at` remains Acquisition-owned evidence and is not inspected
 * or interpreted here.
 *
 * BEHAVIORAL CALIBRATION
 * ----------------------------------------------------------------------------
 * Behavioral Calibration remains explicitly supplied.
 *
 * This module MUST NOT:
 * - select the bootstrap policy implicitly;
 * - execute calibration;
 * - inspect current-run behavioral observations;
 * - derive or mutate a calibration policy.
 *
 * The exact reference is merely transported into the future application input.
 *
 * OBSERVATION SOURCES
 * ----------------------------------------------------------------------------
 * Link, Temporal and Behavioral observation sources remain external truths.
 *
 * This module MUST NOT:
 * - invoke them;
 * - inspect their evidence;
 * - wrap them;
 * - create fallback providers;
 * - convert provider failure into unavailable evidence.
 *
 * They are transported unchanged to the existing application-composition path.
 *
 * FAILURE SEMANTICS
 * ----------------------------------------------------------------------------
 * If acquisition preparation fails:
 *
 * - the original failure propagates;
 * - no application-composition input is produced;
 * - no empty-result fallback is created.
 *
 * A successful empty acquisition batch is valid preparation truth and remains
 * distinguishable from source failure.
 *
 * This module catches nothing and repairs nothing.
 *
 * CONTRACT BEFORE RUNTIME
 * ----------------------------------------------------------------------------
 * No duplicate canonical schema is introduced.
 *
 * Types are derived from:
 *
 * - SearchFinancialNewsAcquisitionPreparationInput
 * - SearchFinancialNewsAcquisitionPreparation
 * - SearchFinancialNewsApplicationCompositionInput
 *
 * The expected application-input field set is also checked bidirectionally at
 * compile time.
 *
 * If the Financial News application-composition contract changes, this module
 * must fail compilation until explicitly reconciled.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * invalid acquisition preparation input
 * => search-financial-news-acquisition-preparation.ts
 *
 * acquisition source failure
 * => authorized acquisition source
 *
 * different query reaches prepared acquisition source
 * => search-financial-news-acquisition-preparation.ts
 *
 * incompatible analytical timestamp reaches prepared acquisition source
 * => search-financial-news-acquisition-preparation.ts
 *
 * Behavioral Calibration policy divergence
 * => Financial News policy composition / calibration artifact boundary
 *
 * observation-source divergence
 * => corresponding Financial News observation-provider boundary
 *
 * application-composition contract changes
 * => compile-time divergence HERE
 *
 * This module MUST NOT repair any divergence.
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - one explicit acquisition preparation per call
 * - exact canonical SearchQuery reference preservation
 * - exact prepared acquisition-source reference
 * - exact policy reference transport
 * - exact observation-source reference transport
 * - explicit application-input assembly only
 * - query-scoped lifecycle only
 *
 * - no application creation
 * - no application.run(...)
 * - no runtime bootstrap
 * - no orchestrator creation
 * - no runtime execution
 * - no clock access
 * - no Date.now()
 * - no new Date()
 * - no randomUUID()
 * - no randomness
 *
 * - no SearchQuery reconstruction
 * - no SearchRawDocument creation
 * - no acquisition-observation reconstruction
 * - no policy creation
 * - no policy selection
 * - no policy fallback
 * - no observation-provider invocation
 * - no analytical calculation
 * - no scoring
 * - no ranking
 * - no public transformation
 * - no calibration
 * - no trace generation
 * - no lineage generation
 * - no snapshot generation
 *
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
 * - unavailable != zero
 * - provider failure != empty result
 * - Compute / Observe / Mutate separation
 * - Configuration != Preparation != Composition != Execution
 * - application-scoped configuration != query-scoped preparation
 * - query-scoped preparation != run-scoped execution
 * ========================================================================== */

import type {
  SearchModuleVersion,
} from "../../contracts/search-pipeline-contract";

import type {
  SearchFinancialNewsApplicationCompositionInput,
} from "./search-financial-news-application-composition";

import {
  prepareSearchFinancialNewsAcquisition,
  type SearchFinancialNewsAcquisitionPreparation,
  type SearchFinancialNewsAcquisitionPreparationInput,
} from "./search-financial-news-acquisition-preparation";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUN_PREPARATION_MODULE_NAME =
  "xyvala-search-financial-news-run-preparation" as const;

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUN_PREPARATION_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

/* ============================================================================
 * 2. APPLICATION INPUT FIELD COVERAGE
 * ========================================================================== */

type SearchFinancialNewsPreparedApplicationInputExpectedField =
  | "authorized_acquisition_source"
  | "behavioral_calibration_scoring_policy"
  | "authorized_link_observation_source"
  | "authorized_temporal_observation_source"
  | "authorized_behavioral_observation_source";

type SearchFinancialNewsPreparedApplicationInputMissingField =
  Exclude<
    keyof SearchFinancialNewsApplicationCompositionInput,
    SearchFinancialNewsPreparedApplicationInputExpectedField
  >;

type SearchFinancialNewsPreparedApplicationInputUnknownField =
  Exclude<
    SearchFinancialNewsPreparedApplicationInputExpectedField,
    keyof SearchFinancialNewsApplicationCompositionInput
  >;

type SearchFinancialNewsPreparedApplicationInputCoverageIsExact =
  [
    SearchFinancialNewsPreparedApplicationInputMissingField,
    SearchFinancialNewsPreparedApplicationInputUnknownField,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_FINANCIAL_NEWS_RUN_PREPARATION_APPLICATION_INPUT_COVERAGE_IS_EXACT:
  SearchFinancialNewsPreparedApplicationInputCoverageIsExact =
    true;

void XYVALA_SEARCH_FINANCIAL_NEWS_RUN_PREPARATION_APPLICATION_INPUT_COVERAGE_IS_EXACT;

/* ============================================================================
 * 3. RUN PREPARATION INPUT
 * ========================================================================== */

export interface SearchFinancialNewsRunPreparationInput {
  readonly authorized_acquisition_source:
    SearchFinancialNewsAcquisitionPreparationInput[
      "authorized_acquisition_source"
    ];

  readonly acquisition_input:
    SearchFinancialNewsAcquisitionPreparationInput[
      "acquisition_input"
    ];

  readonly behavioral_calibration_scoring_policy:
    SearchFinancialNewsApplicationCompositionInput[
      "behavioral_calibration_scoring_policy"
    ];

  readonly authorized_link_observation_source:
    SearchFinancialNewsApplicationCompositionInput[
      "authorized_link_observation_source"
    ];

  readonly authorized_temporal_observation_source:
    SearchFinancialNewsApplicationCompositionInput[
      "authorized_temporal_observation_source"
    ];

  readonly authorized_behavioral_observation_source:
    SearchFinancialNewsApplicationCompositionInput[
      "authorized_behavioral_observation_source"
    ];
}

/* ============================================================================
 * 4. RUN PREPARATION OUTPUT
 * ========================================================================== */

export interface SearchFinancialNewsPreparedRun {
  readonly query:
    SearchFinancialNewsRunPreparationInput[
      "acquisition_input"
    ][
      "query"
    ];

  readonly acquisition_preparation:
    SearchFinancialNewsAcquisitionPreparation;

  readonly application_composition_input:
    SearchFinancialNewsApplicationCompositionInput;
}

/* ============================================================================
 * 5. EXACT RUN-PREPARATION ROOT FIELD SET
 * ========================================================================== */

const XYVALA_SEARCH_FINANCIAL_NEWS_RUN_PREPARATION_INPUT_FIELDS =
  Object.freeze([
    "authorized_acquisition_source",
    "acquisition_input",
    "behavioral_calibration_scoring_policy",
    "authorized_link_observation_source",
    "authorized_temporal_observation_source",
    "authorized_behavioral_observation_source",
  ] as const satisfies readonly (
    keyof SearchFinancialNewsRunPreparationInput
  )[]);

type SearchFinancialNewsRunPreparationDeclaredField =
  (
    typeof XYVALA_SEARCH_FINANCIAL_NEWS_RUN_PREPARATION_INPUT_FIELDS
  )[number];

type SearchFinancialNewsRunPreparationMissingField =
  Exclude<
    keyof SearchFinancialNewsRunPreparationInput,
    SearchFinancialNewsRunPreparationDeclaredField
  >;

type SearchFinancialNewsRunPreparationUnknownField =
  Exclude<
    SearchFinancialNewsRunPreparationDeclaredField,
    keyof SearchFinancialNewsRunPreparationInput
  >;

type SearchFinancialNewsRunPreparationInputCoverageIsExact =
  [
    SearchFinancialNewsRunPreparationMissingField,
    SearchFinancialNewsRunPreparationUnknownField,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_FINANCIAL_NEWS_RUN_PREPARATION_INPUT_COVERAGE_IS_EXACT:
  SearchFinancialNewsRunPreparationInputCoverageIsExact =
    true;

void XYVALA_SEARCH_FINANCIAL_NEWS_RUN_PREPARATION_INPUT_COVERAGE_IS_EXACT;

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

function assertSearchFinancialNewsRunPreparationInput(
  input:
    SearchFinancialNewsRunPreparationInput,
): void {
  if (
    !isRecord(
      input,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_RUN_PREPARATION_MODULE_NAME}] ` +
        "Run-preparation violation: input must be an object.",
    );
  }

  const actualFields =
    Object.keys(
      input,
    );

  if (
    actualFields.length !==
    XYVALA_SEARCH_FINANCIAL_NEWS_RUN_PREPARATION_INPUT_FIELDS
      .length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_FINANCIAL_NEWS_RUN_PREPARATION_MODULE_NAME}] ` +
        "Run-preparation violation: root field cardinality is inconsistent.",
    );
  }

  const expectedFields =
    new Set<string>(
      XYVALA_SEARCH_FINANCIAL_NEWS_RUN_PREPARATION_INPUT_FIELDS,
    );

  for (
    const field of
      actualFields
  ) {
    if (
      !expectedFields.has(
        field,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_FINANCIAL_NEWS_RUN_PREPARATION_MODULE_NAME}] ` +
          `Run-preparation violation: unexpected root field ${field}.`,
      );
    }
  }
}

/* ============================================================================
 * 7. CANONICAL QUERY-SCOPED RUN PREPARATION
 * ========================================================================== */

export async function prepareSearchFinancialNewsRun(
  input:
    SearchFinancialNewsRunPreparationInput,
): Promise<SearchFinancialNewsPreparedRun> {
  assertSearchFinancialNewsRunPreparationInput(
    input,
  );

  const acquisitionPreparationInput =
    Object.freeze({
      authorized_acquisition_source:
        input
          .authorized_acquisition_source,

      acquisition_input:
        input
          .acquisition_input,
    } satisfies SearchFinancialNewsAcquisitionPreparationInput);

  const acquisitionPreparation =
    await prepareSearchFinancialNewsAcquisition(
      acquisitionPreparationInput,
    );

  const applicationCompositionInput =
    Object.freeze({
      authorized_acquisition_source:
        acquisitionPreparation
          .authorized_acquisition_source,

      behavioral_calibration_scoring_policy:
        input
          .behavioral_calibration_scoring_policy,

      authorized_link_observation_source:
        input
          .authorized_link_observation_source,

      authorized_temporal_observation_source:
        input
          .authorized_temporal_observation_source,

      authorized_behavioral_observation_source:
        input
          .authorized_behavioral_observation_source,
    } satisfies SearchFinancialNewsApplicationCompositionInput);

  return Object.freeze({
    query:
      input
        .acquisition_input
        .query,

    acquisition_preparation:
      acquisitionPreparation,

    application_composition_input:
      applicationCompositionInput,
  } satisfies SearchFinancialNewsPreparedRun);
}

/* ============================================================================
 * 8. STATIC MANIFEST
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUN_PREPARATION_MANIFEST =
  Object.freeze({
    preparation:
      "FINANCIAL_NEWS_QUERY_SCOPED_RUN_PREPARATION_V1",

    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUN_PREPARATION_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUN_PREPARATION_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    root_input_field_count:
      6,

    acquisition_preparation_count_per_call:
      1,

    prepared_application_input_field_count:
      5,

    application_created:
      false,

    application_run_invoked:
      false,

    runtime_bootstrap_created:
      false,

    runtime_clock_read:
      false,

    analytical_timestamp_generated:
      false,

    prepared_source_query_scoped:
      true,

    direct_network_access:
      false,

    authorized_acquisition_source_invoked_indirectly:
      true,
  } as const);

/* ============================================================================
 * 9. STATIC OWNERSHIP DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUN_PREPARATION_OWNERSHIP =
  Object.freeze({
    module:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUN_PREPARATION_MODULE_NAME,

    module_version:
      XYVALA_SEARCH_FINANCIAL_NEWS_RUN_PREPARATION_MODULE_VERSION,

    domain:
      "FINANCIAL_NEWS",

    architectural_plane:
      "PREPARATION_PLANE",

    architectural_role:
      "QUERY_SCOPED_RUN_PREPARATION_ROOT",

    acquisition_truth_owner:
      "AUTHORIZED_ACQUISITION_SOURCE",

    acquisition_preparation_owner:
      "FINANCIAL_NEWS_ACQUISITION_PREPARATION",

    prepared_acquisition_source_owner:
      "FINANCIAL_NEWS_ACQUISITION_PREPARATION",

    query_truth_owner:
      "SEARCH_QUERY_INPUT_CORE",

    analytical_timestamp_owner:
      "EXTERNAL_APPLICATION_ORCHESTRATION",

    behavioral_calibration_policy_truth_owner:
      "AUTHORIZED_CALIBRATION_OR_CONFIGURATION_LIFECYCLE",

    link_observation_truth_owner:
      "AUTHORIZED_LINK_OBSERVATION_SOURCE",

    temporal_observation_truth_owner:
      "AUTHORIZED_TEMPORAL_OBSERVATION_SOURCE",

    behavioral_observation_truth_owner:
      "AUTHORIZED_BEHAVIORAL_OBSERVATION_SOURCE",

    application_composition_owner:
      "FINANCIAL_NEWS_APPLICATION_COMPOSITION",

    runtime_application_owner:
      "SEARCH_RUNTIME_APPLICATION",

    exact_query_reference_preserved:
      true,

    acquisition_preparation_requested_here:
      true,

    acquisition_observations_created_here:
      false,

    raw_document_created_here:
      false,

    prepared_source_created_here:
      false,

    prepared_source_bound_here:
      true,

    application_composition_input_created_here:
      true,

    application_created_here:
      false,

    application_run_invoked_here:
      false,

    runtime_execution_started_here:
      false,

    analytical_timestamp_created_here:
      false,

    policy_created_here:
      false,

    observation_provider_invoked_here:
      false,

    analytical_truth_created_here:
      false,

    execution_trace_created_here:
      false,

    variable_lineage_created_here:
      false,

    identity_created_here:
      false,

    persistence_performed:
      false,

    mutable_global_state_created:
      false,
  } as const);

/* ============================================================================
 * 10. STATIC GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_FINANCIAL_NEWS_RUN_PREPARATION_GOVERNANCE =
  Object.freeze({
    contract_before_runtime:
      true,

    first_divergence_required:
      true,

    reality_before_interpretation:
      true,

    one_truth_one_owner:
      true,

    preparation_plane:
      true,

    query_scoped:
      true,

    application_scoped:
      false,

    run_scoped_execution:
      false,

    exact_root_input_coverage_required:
      true,

    exact_application_input_coverage_required:
      true,

    acquisition_preparation_boundary_required:
      true,

    exact_query_reference_preservation_required:
      true,

    prepared_acquisition_source_required:
      true,

    durable_source_directly_bound_to_future_application_allowed:
      false,

    prepared_source_global_singleton_allowed:
      false,

    prepared_source_cross_query_reuse_allowed:
      false,

    application_creation_allowed:
      false,

    application_run_invocation_allowed:
      false,

    runtime_bootstrap_creation_allowed:
      false,

    runtime_execution_allowed:
      false,

    analytical_timestamp_input_allowed_here:
      false,

    analytical_timestamp_generation_allowed:
      false,

    acquisition_timestamp_repair_allowed:
      false,

    runtime_clock_access_allowed:
      false,

    source_publication_interpretation_allowed:
      false,

    query_reconstruction_allowed:
      false,

    query_clone_allowed:
      false,

    raw_document_creation_allowed:
      false,

    acquisition_observation_reconstruction_allowed:
      false,

    policy_creation_allowed:
      false,

    policy_selection_allowed:
      false,

    hidden_behavioral_calibration_bootstrap_allowed:
      false,

    policy_fallback_allowed:
      false,

    observation_provider_invocation_allowed:
      false,

    observation_provider_wrapping_allowed:
      false,

    observation_provider_fallback_allowed:
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

    snapshot_generation_allowed:
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

    acquisition_failure_must_propagate:
      true,

    empty_acquisition_result_must_remain_distinct_from_failure:
      true,

    prohibited_shortcuts:
      Object.freeze([
        "bind_durable_live_source_directly_as_query_scoped_prepared_source",
        "cache_prepared_source_as_global_application_singleton",
        "reuse_prepared_source_for_different_query",

        "clone_search_query",
        "reconstruct_search_query",
        "derive_query_from_raw_query",

        "create_search_raw_document_here",
        "reconstruct_acquisition_observation",

        "read_clock_inside_run_preparation",
        "generate_analytical_timestamp_here",
        "use_acquisition_created_at_as_analytical_created_at",
        "use_fetched_at_as_analytical_created_at",
        "repair_timestamp_with_max",

        "interpret_source_published_at",
        "use_source_published_at_as_runtime_timestamp",

        "select_behavioral_calibration_bootstrap",
        "create_policy",
        "policy_fallback",

        "invoke_link_observation_provider",
        "invoke_temporal_observation_provider",
        "invoke_behavioral_observation_provider",
        "provider_fallback",

        "create_application_inside_run_preparation",
        "invoke_application_run_inside_run_preparation",
        "create_runtime_bootstrap_inside_run_preparation",

        "analytical_recalculation",
        "score_reconstruction",
        "ranking_reconstruction",
        "public_transformation_reconstruction",

        "trace_generation",
        "lineage_generation",
        "snapshot_generation",

        "direct_http_access",
        "persistence",
        "mutable_global_state",
        "cache",
        "logging",
      ] as const),
  } as const);
