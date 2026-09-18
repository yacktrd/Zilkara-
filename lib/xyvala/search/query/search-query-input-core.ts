/* ============================================================================
 * FILE: lib/xyvala/search/query/search-query-input-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical SearchQuery input core
 *
 * ROLE
 * - consume explicit application/request query truth
 * - validate the SearchQuery producer input boundary
 * - preserve raw caller query truth unchanged
 * - preserve explicit query identity
 * - preserve explicit query creation timestamp
 * - preserve explicit requested filters unchanged
 * - preserve explicit query origin unchanged
 * - qualify canonical SearchQuery validation state
 * - produce exactly one canonical SearchQuery
 *
 * CLASSIFICATION
 * - SEARCH QUERY INPUT PRODUCER
 * - SEARCH DOMAIN
 * - APPLICATION / QUERY BOUNDARY
 * - CANONICAL CONTRACT PRODUCER
 * - READ / VALIDATE / ASSEMBLE
 * - PURE
 * - DETERMINISTIC
 * - NON-ANALYTICAL
 * - NON-NORMALIZING
 * - NON-PROFILING
 * - NON-MUTATING
 *
 * POSITION
 * ----------------------------------------------------------------------------
 * This producer exists immediately BEFORE the active Search analytical
 * pipeline.
 *
 * It does NOT introduce a new SearchPipelineLayer.
 *
 * Application / HTTP / Test / Simulation input
 * -> SearchQuery Input Core
 * -> SearchQuery
 * -> QUERY_NORMALIZATION
 * -> QUERY_PROFILING
 * -> remaining canonical Search pipeline
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchQuery
 * - search-pipeline-contract.ts
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage Registry
 * - Compute / Observe / Mutate Separation
 *
 * PRODUCER OUTPUT
 * - SearchQuery
 *
 * CONSUMERS
 * - lib/xyvala/search/query/search-query-analysis-core.ts
 * - Search runtime orchestrator through SearchRuntimeInput.query
 * - Search query input tests
 *
 * OWNERSHIP
 * ----------------------------------------------------------------------------
 * SearchQuery.contract_version
 * <- canonical search-pipeline-contract.ts
 *
 * SearchQuery.query_id
 * <- explicit application orchestration input
 *
 * SearchQuery.created_at
 * <- explicit application orchestration input
 *
 * SearchQuery.raw_query
 * <- caller/request truth
 * <- preserved byte-for-byte as JavaScript string content
 *
 * SearchQuery.requested_language
 * <- caller/request truth
 *
 * SearchQuery.requested_source_types
 * <- caller/request truth
 *
 * SearchQuery.requested_domain
 * <- caller/request truth
 *
 * SearchQuery.requested_time_window
 * <- caller/request truth
 *
 * SearchQuery.query_origin
 * <- explicit orchestration truth
 *
 * SearchQuery.validation_state
 * <- SEARCH_QUERY_INPUT_CORE
 *
 * SearchQuery.rejection_reasons
 * <- SEARCH_QUERY_INPUT_CORE
 *
 * NON-OWNERSHIP
 * ----------------------------------------------------------------------------
 * normalized_query
 * <- QUERY_NORMALIZATION
 *
 * query_terms
 * <- QUERY_NORMALIZATION / QUERY_PROFILING
 *
 * detected_language
 * <- QUERY_PROFILING
 *
 * query_intent
 * <- QUERY_PROFILING
 *
 * normalization_method
 * <- QUERY_NORMALIZATION
 *
 * profiling_method
 * <- QUERY_PROFILING
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - one SearchQuery truth = one canonical producer
 * - consume explicit inputs only
 * - query_id must be supplied
 * - created_at must be supplied
 * - query_origin must be supplied
 * - raw_query must remain unchanged
 * - requested source-type order must remain unchanged
 * - duplicate requested source types must not be silently removed
 * - requested time-window values must remain unchanged
 * - no implicit query origin
 * - no implicit requested language
 * - no implicit requested domain
 * - no implicit requested source type
 * - no implicit requested time window
 *
 * - no query normalization
 * - no query trimming in produced truth
 * - no lowercasing
 * - no Unicode normalization
 * - no tokenization
 * - no term generation
 * - no stop-word processing
 * - no stemming
 * - no lemmatization
 * - no language detection
 * - no intent detection
 * - no query profiling
 * - no scoring
 * - no acquisition
 * - no ranking
 * - no calibration
 *
 * - no runtime clock access
 * - no Date.now()
 * - no new Date() for canonical truth
 * - no random identity generation
 * - no crypto.randomUUID()
 * - no persistence
 * - no cache mutation
 * - no logging
 * - no event publication
 *
 * VALIDATION MODEL
 * ----------------------------------------------------------------------------
 * Two categories are deliberately separated.
 *
 * 1. HARD CONTRACT VIOLATION
 *
 * The producer cannot legally create a SearchQuery.
 *
 * Examples:
 * - empty query_id
 * - invalid created_at
 * - unsupported query_origin
 * - malformed requested_source_types runtime shape
 * - unknown SearchSourceType runtime value
 *
 * => throw immediately.
 *
 * 2. CANONICAL QUERY REJECTION
 *
 * The caller supplied structurally transportable query truth, but the query
 * itself is not valid for Search execution.
 *
 * Examples:
 * - empty raw_query
 * - empty explicitly supplied language
 * - empty explicitly supplied domain
 * - invalid requested time-window timestamp
 * - inverted requested time window
 *
 * => produce SearchQuery with:
 *
 * validation_state = "REJECTED"
 * rejection_reasons = [...]
 *
 * The producer does NOT repair the rejected truth.
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * A REJECTED SearchQuery must not subsequently be treated as VALID by
 * downstream orchestration.
 *
 * Downstream layers must reject it rather than repair or reinterpret it.
 *
 * INVARIANTS
 * ----------------------------------------------------------------------------
 * - exactly one SearchQuery is produced per invocation
 * - canonical pipeline contract version is used
 * - raw_query is propagated unchanged
 * - query_id is propagated unchanged
 * - created_at is propagated unchanged
 * - query_origin is propagated unchanged
 * - optional request truth is propagated unchanged
 * - requested source-type ordering is propagated unchanged
 * - requested source types are never deduplicated
 * - no query analytical truth is produced
 * - VALID means rejection_reasons is empty
 * - REJECTED means rejection_reasons is non-empty
 * - this producer never emits DEGRADED
 * - this producer never emits UNVALIDATED
 * - output is immutable
 * - same input produces same output
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * generated query_id
 * => application orchestration ownership violation
 *
 * runtime-generated created_at
 * => application orchestration ownership violation
 *
 * trimmed or normalized raw_query
 * => QUERY_NORMALIZATION ownership violation
 *
 * inferred query language
 * => QUERY_PROFILING ownership violation
 *
 * inferred query intent
 * => QUERY_PROFILING ownership violation
 *
 * deduplicated/reordered requested_source_types
 * => request-truth mutation
 *
 * repaired invalid time window
 * => request-truth mutation
 *
 * missing rejection qualification
 * => SearchQuery producer violation
 * ========================================================================== */

import {
  XYVALA_SEARCH_PIPELINE_CONTRACT,
} from "../contracts/search-pipeline-contract";

import type {
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchQuery,
  SearchSourceType,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_QUERY_INPUT_CORE_MODULE_NAME =
  "xyvala-search-query-input-core" as const;

export const XYVALA_SEARCH_QUERY_INPUT_CORE_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

/**
 * SearchQuery is canonically defined by search-pipeline-contract.ts.
 *
 * This producer deliberately does not create an independent competing
 * SearchQuery contract version.
 */
export const XYVALA_SEARCH_QUERY_CONTRACT_VERSION =
  XYVALA_SEARCH_PIPELINE_CONTRACT.contract_version;

/* ============================================================================
 * 2. CANONICAL PRODUCER INPUT
 * ----------------------------------------------------------------------------
 * Types are derived directly from SearchQuery.
 *
 * Producer-owned fields are intentionally excluded:
 *
 * - contract_version
 * - validation_state
 * - rejection_reasons
 *
 * Everything else must be supplied explicitly by upstream orchestration.
 * ========================================================================== */

export type SearchQueryBuildInput =
  Readonly<
    Pick<
      SearchQuery,
      | "query_id"
      | "created_at"
      | "raw_query"
      | "requested_language"
      | "requested_source_types"
      | "requested_domain"
      | "requested_time_window"
      | "query_origin"
    >
  >;

/* ============================================================================
 * 3. QUERY REJECTION IDENTITIES
 * ----------------------------------------------------------------------------
 * Stable producer-owned rejection identities.
 *
 * These are query-input validation reasons only.
 *
 * They are NOT:
 * - analytical penalties
 * - eligibility reasons
 * - private decisions
 * - scoring signals
 * ========================================================================== */

export type SearchQueryInputRejectionReason =
  | "EMPTY_RAW_QUERY"
  | "EMPTY_REQUESTED_LANGUAGE"
  | "EMPTY_REQUESTED_DOMAIN"
  | "INVALID_REQUESTED_TIME_WINDOW_START"
  | "INVALID_REQUESTED_TIME_WINDOW_END"
  | "REQUESTED_TIME_WINDOW_INVERTED";

/* ============================================================================
 * 4. RUNTIME CANONICAL DOMAINS
 * ----------------------------------------------------------------------------
 * Type unions disappear at runtime.
 *
 * These registries exist only to prevent malformed JavaScript/integration
 * input from creating an invalid SearchQuery contract.
 * ========================================================================== */

const CANONICAL_QUERY_ORIGINS =
  Object.freeze([
    "PUBLIC_INTERFACE",
    "PRIVATE_TEST",
    "API",
    "CALIBRATION",
    "SIMULATION",
  ] as const satisfies readonly SearchQuery["query_origin"][]);

const CANONICAL_SOURCE_TYPES =
  Object.freeze([
    "WEB_PAGE",
    "DOCUMENT",
    "ARTICLE",
    "CV",
    "TECHNICAL_DOCUMENT",
    "LEGAL_DOCUMENT",
    "API_RESOURCE",
    "MANUAL_TEXT",
    "OTHER",
  ] as const satisfies readonly SearchSourceType[]);

/* ============================================================================
 * 5. RUNTIME DOMAIN EXACTNESS
 * ----------------------------------------------------------------------------
 * Contract Before Runtime.
 *
 * If the canonical unions evolve, compilation must fail until these runtime
 * validation registries are explicitly reviewed.
 * ========================================================================== */

type DeclaredSearchQueryOrigin =
  (
    typeof CANONICAL_QUERY_ORIGINS
  )[number];

type DeclaredSearchSourceType =
  (
    typeof CANONICAL_SOURCE_TYPES
  )[number];

type SearchQueryOriginRuntimeDomainIsExact =
  [
    Exclude<
      SearchQuery["query_origin"],
      DeclaredSearchQueryOrigin
    >,
    Exclude<
      DeclaredSearchQueryOrigin,
      SearchQuery["query_origin"]
    >,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

type SearchSourceTypeRuntimeDomainIsExact =
  [
    Exclude<
      SearchSourceType,
      DeclaredSearchSourceType
    >,
    Exclude<
      DeclaredSearchSourceType,
      SearchSourceType
    >,
  ] extends [
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_QUERY_ORIGIN_RUNTIME_DOMAIN_IS_EXACT:
  SearchQueryOriginRuntimeDomainIsExact =
    true;

const XYVALA_SEARCH_QUERY_SOURCE_TYPE_RUNTIME_DOMAIN_IS_EXACT:
  SearchSourceTypeRuntimeDomainIsExact =
    true;

void XYVALA_SEARCH_QUERY_ORIGIN_RUNTIME_DOMAIN_IS_EXACT;
void XYVALA_SEARCH_QUERY_SOURCE_TYPE_RUNTIME_DOMAIN_IS_EXACT;

/* ============================================================================
 * 6. RUNTIME DOMAIN SETS
 * ========================================================================== */

const CANONICAL_QUERY_ORIGIN_SET:
  ReadonlySet<string> =
  new Set<string>(
    CANONICAL_QUERY_ORIGINS,
  );

const CANONICAL_SOURCE_TYPE_SET:
  ReadonlySet<string> =
  new Set<string>(
    CANONICAL_SOURCE_TYPES,
  );

/* ============================================================================
 * 7. SAFE PRIMITIVE ASSERTIONS
 * ========================================================================== */

function assertString(
  value:
    unknown,

  fieldName:
    string,
): asserts value is string {
  if (
    typeof value !==
    "string"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_INPUT_CORE_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a string.`,
    );
  }
}

function assertNonEmptyString(
  value:
    unknown,

  fieldName:
    string,
): asserts value is string {
  assertString(
    value,
    fieldName,
  );

  if (
    value.trim().length ===
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_INPUT_CORE_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a non-empty string.`,
    );
  }
}

function isValidIsoTimestamp(
  value:
    string,
): boolean {
  return Number.isFinite(
    Date.parse(
      value,
    ),
  );
}

function assertValidIsoTimestamp(
  value:
    unknown,

  fieldName:
    string,
): asserts value is SearchIsoTimestamp {
  assertNonEmptyString(
    value,
    fieldName,
  );

  if (
    !isValidIsoTimestamp(
      value,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_INPUT_CORE_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a valid ISO timestamp.`,
    );
  }
}

function assertRecord(
  value:
    unknown,

  fieldName:
    string,
): asserts value is Readonly<
  Record<string, unknown>
> {
  if (
    value ===
      null ||
    typeof value !==
      "object" ||
    Array.isArray(
      value,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_INPUT_CORE_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be an object.`,
    );
  }
}

/* ============================================================================
 * 8. QUERY ORIGIN VALIDATION
 * ----------------------------------------------------------------------------
 * query_origin is explicit caller/orchestration truth.
 *
 * No default is authorized.
 * ========================================================================== */

function assertCanonicalQueryOrigin(
  value:
    unknown,
): asserts value is SearchQuery["query_origin"] {
  if (
    typeof value !==
      "string" ||
    !CANONICAL_QUERY_ORIGIN_SET.has(
      value,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_INPUT_CORE_MODULE_NAME}] ` +
        `Contract violation: query_origin ${String(value)} is not canonical.`,
    );
  }
}

/* ============================================================================
 * 9. REQUESTED SOURCE TYPE VALIDATION
 * ----------------------------------------------------------------------------
 * Values and input ordering are preserved.
 *
 * No deduplication.
 * No sorting.
 * No fallback source type.
 * ========================================================================== */

function assertRequestedSourceTypes(
  value:
    unknown,
): asserts value is readonly SearchSourceType[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_INPUT_CORE_MODULE_NAME}] ` +
        "Contract violation: requested_source_types must be an array.",
    );
  }

  for (
    const [
      index,
      sourceType,
    ] of value.entries()
  ) {
    if (
      typeof sourceType !==
        "string" ||
      !CANONICAL_SOURCE_TYPE_SET.has(
        sourceType,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_QUERY_INPUT_CORE_MODULE_NAME}] ` +
          `Contract violation: requested_source_types[${String(index)}] contains unsupported source type ${String(sourceType)}.`,
      );
    }
  }
}

/* ============================================================================
 * 10. OPTIONAL INPUT SHAPE VALIDATION
 * ----------------------------------------------------------------------------
 * This validation verifies transport shape only.
 *
 * Semantic query validity is qualified separately through:
 *
 * validation_state
 * rejection_reasons
 * ========================================================================== */

function validateOptionalInputShape(
  input:
    SearchQueryBuildInput,
): void {
  if (
    input.requested_language !==
    undefined
  ) {
    assertString(
      input.requested_language,
      "requested_language",
    );
  }

  if (
    input.requested_domain !==
    undefined
  ) {
    assertString(
      input.requested_domain,
      "requested_domain",
    );
  }

  if (
    input.requested_time_window !==
    undefined
  ) {
    assertRecord(
      input.requested_time_window,
      "requested_time_window",
    );

    if (
      input.requested_time_window
        .start_at !==
      undefined
    ) {
      assertString(
        input.requested_time_window
          .start_at,
        "requested_time_window.start_at",
      );
    }

    if (
      input.requested_time_window
        .end_at !==
      undefined
    ) {
      assertString(
        input.requested_time_window
          .end_at,
        "requested_time_window.end_at",
      );
    }
  }
}

/* ============================================================================
 * 11. HARD PRODUCER INPUT VALIDATION
 * ----------------------------------------------------------------------------
 * Failure here means no legal SearchQuery contract can be produced.
 *
 * The producer throws rather than fabricating malformed canonical truth.
 * ========================================================================== */

function validateProducerInputBoundary(
  input:
    SearchQueryBuildInput,
): void {
  assertNonEmptyString(
    input.query_id,
    "query_id",
  );

  assertValidIsoTimestamp(
    input.created_at,
    "created_at",
  );

  assertString(
    input.raw_query,
    "raw_query",
  );

  assertRequestedSourceTypes(
    input.requested_source_types,
  );

  assertCanonicalQueryOrigin(
    input.query_origin,
  );

  validateOptionalInputShape(
    input,
  );
}

/* ============================================================================
 * 12. QUERY VALIDITY QUALIFICATION
 * ----------------------------------------------------------------------------
 * Produces rejection reasons without changing caller truth.
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * Validation may inspect trimmed text to determine emptiness.
 *
 * It MUST NOT store the trimmed value.
 *
 * SearchQuery.raw_query remains exactly input.raw_query.
 * ========================================================================== */

function collectQueryRejectionReasons(
  input:
    SearchQueryBuildInput,
): readonly SearchQueryInputRejectionReason[] {
  const rejectionReasons:
    SearchQueryInputRejectionReason[] =
    [];

  /* --------------------------------------------------------------------------
   * RAW QUERY
   * ----------------------------------------------------------------------- */

  if (
    input.raw_query
      .trim()
      .length ===
    0
  ) {
    rejectionReasons.push(
      "EMPTY_RAW_QUERY",
    );
  }

  /* --------------------------------------------------------------------------
   * REQUESTED LANGUAGE
   * ----------------------------------------------------------------------- */

  if (
    input.requested_language !==
      undefined &&
    input.requested_language
      .trim()
      .length ===
      0
  ) {
    rejectionReasons.push(
      "EMPTY_REQUESTED_LANGUAGE",
    );
  }

  /* --------------------------------------------------------------------------
   * REQUESTED DOMAIN
   * ----------------------------------------------------------------------- */

  if (
    input.requested_domain !==
      undefined &&
    input.requested_domain
      .trim()
      .length ===
      0
  ) {
    rejectionReasons.push(
      "EMPTY_REQUESTED_DOMAIN",
    );
  }

  /* --------------------------------------------------------------------------
   * REQUESTED TIME WINDOW
   * ----------------------------------------------------------------------- */

  const timeWindow =
    input.requested_time_window;

  if (
    timeWindow !==
    undefined
  ) {
    const startAt =
      timeWindow.start_at;

    const endAt =
      timeWindow.end_at;

    const validStart =
      startAt ===
        undefined ||
      isValidIsoTimestamp(
        startAt,
      );

    const validEnd =
      endAt ===
        undefined ||
      isValidIsoTimestamp(
        endAt,
      );

    if (
      startAt !==
        undefined &&
      !validStart
    ) {
      rejectionReasons.push(
        "INVALID_REQUESTED_TIME_WINDOW_START",
      );
    }

    if (
      endAt !==
        undefined &&
      !validEnd
    ) {
      rejectionReasons.push(
        "INVALID_REQUESTED_TIME_WINDOW_END",
      );
    }

    /*
     * Window ordering is evaluated only when both canonical timestamp
     * candidates are individually valid.
     *
     * No invalid timestamp receives a replacement value.
     */
    if (
      startAt !==
        undefined &&
      endAt !==
        undefined &&
      validStart &&
      validEnd &&
      Date.parse(
        startAt,
      ) >
        Date.parse(
          endAt,
        )
    ) {
      rejectionReasons.push(
        "REQUESTED_TIME_WINDOW_INVERTED",
      );
    }
  }

  return Object.freeze(
    rejectionReasons,
  );
}

/* ============================================================================
 * 13. VALIDATION STATE
 * ----------------------------------------------------------------------------
 * This producer intentionally emits only:
 *
 * VALID
 * REJECTED
 *
 * DEGRADED would imply usable but degraded query truth for which no canonical
 * semantics currently exist.
 *
 * UNVALIDATED would violate the role of this canonical producer.
 * ========================================================================== */

function resolveSearchQueryValidationState(
  rejectionReasons:
    readonly SearchQueryInputRejectionReason[],
): SearchValidationState {
  return rejectionReasons.length ===
    0
    ? "VALID"
    : "REJECTED";
}

/* ============================================================================
 * 14. REQUESTED SOURCE TYPE TRANSPORT
 * ----------------------------------------------------------------------------
 * Immutable owned collection.
 *
 * Values and ordering are unchanged.
 * ========================================================================== */

function transportRequestedSourceTypes(
  sourceTypes:
    readonly SearchSourceType[],
): readonly SearchSourceType[] {
  return Object.freeze([
    ...sourceTypes,
  ]);
}

/* ============================================================================
 * 15. REQUESTED TIME WINDOW TRANSPORT
 * ----------------------------------------------------------------------------
 * Immutable structural copy only.
 *
 * No timestamp normalization.
 * No boundary completion.
 * No missing start/end reconstruction.
 * ========================================================================== */

type SearchQueryRequestedTimeWindow =
  NonNullable<
    SearchQuery[
      "requested_time_window"
    ]
  >;

function transportRequestedTimeWindow(
  timeWindow:
    SearchQuery["requested_time_window"],
):
  | SearchQueryRequestedTimeWindow
  | undefined {
  if (
    timeWindow ===
    undefined
  ) {
    return undefined;
  }

  const transportedTimeWindow = {
    ...(
      timeWindow.start_at !==
      undefined
        ? {
            start_at:
              timeWindow.start_at,
          }
        : {}
    ),

    ...(
      timeWindow.end_at !==
      undefined
        ? {
            end_at:
              timeWindow.end_at,
          }
        : {}
    ),
  } satisfies SearchQueryRequestedTimeWindow;

  return Object.freeze(
    transportedTimeWindow,
  );
}

/* ============================================================================
 * 16. CANONICAL SearchQuery PRODUCER
 * ----------------------------------------------------------------------------
 * SearchQueryBuildInput
 * -> hard contract-boundary validation
 * -> query validity qualification
 * -> exact request-truth transport
 * -> SearchQuery
 *
 * No Query Analysis producer executes here.
 * ========================================================================== */

export function buildSearchQuery(
  input:
    SearchQueryBuildInput,
): SearchQuery {
  validateProducerInputBoundary(
    input,
  );

  const rejectionReasons =
    collectQueryRejectionReasons(
      input,
    );

  const validationState =
    resolveSearchQueryValidationState(
      rejectionReasons,
    );

  const requestedSourceTypes =
    transportRequestedSourceTypes(
      input.requested_source_types,
    );

  const requestedTimeWindow =
    transportRequestedTimeWindow(
      input.requested_time_window,
    );

  const query = {
    /*
     * Contract identity comes from the canonical owner.
     *
     * No local competing SearchQuery contract version is created.
     */
    contract_version:
      XYVALA_SEARCH_QUERY_CONTRACT_VERSION,

    /*
     * Explicit producer input.
     *
     * No runtime clock.
     */
    created_at:
      input.created_at,

    /*
     * Explicit producer input.
     *
     * No local UUID/random identity generation.
     */
    query_id:
      input.query_id,

    /*
     * Exact caller truth.
     *
     * No trim.
     * No normalization.
     */
    raw_query:
      input.raw_query,

    ...(
      input.requested_language !==
      undefined
        ? {
            requested_language:
              input.requested_language,
          }
        : {}
    ),

    requested_source_types:
      requestedSourceTypes,

    ...(
      input.requested_domain !==
      undefined
        ? {
            requested_domain:
              input.requested_domain,
          }
        : {}
    ),

    ...(
      requestedTimeWindow !==
      undefined
        ? {
            requested_time_window:
              requestedTimeWindow,
          }
        : {}
    ),

    /*
     * Explicit orchestration truth.
     *
     * No automatic PUBLIC_INTERFACE/API inference.
     */
    query_origin:
      input.query_origin,

    validation_state:
      validationState,

    rejection_reasons:
      rejectionReasons,
  } satisfies SearchQuery;

  return Object.freeze(
    query,
  );
}

/* ============================================================================
 * 17. STATIC OWNERSHIP DECLARATION
 * ----------------------------------------------------------------------------
 * Governance metadata only.
 *
 * No runtime analytical behavior depends on this object.
 * ========================================================================== */

export const XYVALA_SEARCH_QUERY_INPUT_CORE_OWNERSHIP =
  Object.freeze({
    output_contract:
      "SearchQuery",

    canonical_output_producer:
      XYVALA_SEARCH_QUERY_INPUT_CORE_MODULE_NAME,

    canonical_contract_owner:
      "search-pipeline-contract.ts",

    pipeline_layer_created:
      false,

    downstream_first_layer:
      "QUERY_NORMALIZATION",

    query_id_owner:
      "APPLICATION_ORCHESTRATION",

    created_at_owner:
      "APPLICATION_ORCHESTRATION",

    raw_query_source:
      "CALLER_REQUEST_TRUTH",

    requested_language_source:
      "CALLER_REQUEST_TRUTH",

    requested_source_types_source:
      "CALLER_REQUEST_TRUTH",

    requested_domain_source:
      "CALLER_REQUEST_TRUTH",

    requested_time_window_source:
      "CALLER_REQUEST_TRUTH",

    query_origin_owner:
      "APPLICATION_ORCHESTRATION",

    validation_state_owner:
      XYVALA_SEARCH_QUERY_INPUT_CORE_MODULE_NAME,

    rejection_reasons_owner:
      XYVALA_SEARCH_QUERY_INPUT_CORE_MODULE_NAME,

    normalized_query_owner:
      "QUERY_NORMALIZATION",

    query_terms_owner:
      "QUERY_NORMALIZATION_QUERY_PROFILING",

    detected_language_owner:
      "QUERY_PROFILING",

    query_intent_owner:
      "QUERY_PROFILING",
  } as const);

/* ============================================================================
 * 18. STATIC GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_QUERY_INPUT_CORE_GOVERNANCE =
  Object.freeze({
    canonical_query_producer:
      true,

    analytical_producer:
      false,

    pipeline_layer_created:
      false,

    explicit_query_id_required:
      true,

    explicit_created_at_required:
      true,

    explicit_query_origin_required:
      true,

    raw_query_preserved:
      true,

    requested_filter_truth_preserved:
      true,

    source_type_order_preserved:
      true,

    rejected_query_truth_preserved:
      true,

    query_normalization_allowed:
      false,

    raw_query_trimming_allowed:
      false,

    raw_query_lowercasing_allowed:
      false,

    unicode_normalization_allowed:
      false,

    source_type_deduplication_allowed:
      false,

    source_type_reordering_allowed:
      false,

    query_tokenization_allowed:
      false,

    query_term_generation_allowed:
      false,

    language_detection_allowed:
      false,

    intent_detection_allowed:
      false,

    query_profiling_allowed:
      false,

    implicit_query_origin_allowed:
      false,

    implicit_language_allowed:
      false,

    implicit_domain_allowed:
      false,

    implicit_source_type_allowed:
      false,

    implicit_time_window_allowed:
      false,

    time_window_repair_allowed:
      false,

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

    prohibited_shortcuts:
      Object.freeze([
        "query_input_generated_query_id",
        "query_input_read_runtime_clock",
        "query_input_trimmed_raw_query",
        "query_input_normalized_raw_query",
        "query_input_lowercased_raw_query",
        "query_input_tokenized_query",
        "query_input_generated_query_terms",
        "query_input_detected_language",
        "query_input_inferred_intent",
        "query_input_inferred_query_origin",
        "query_input_deduplicated_source_types",
        "query_input_reordered_source_types",
        "query_input_repaired_time_window",
        "query_input_replaced_invalid_time_window",
        "query_input_converted_rejected_to_valid",
      ] as const),
  } as const);
