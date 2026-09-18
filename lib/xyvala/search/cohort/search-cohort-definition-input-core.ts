/* ============================================================================
 * FILE: lib/xyvala/search/cohort/search-cohort-definition-input-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical SearchCohortDefinition input core
 *
 * ROLE
 * - consume explicit application/runtime cohort-definition truth
 * - validate the SearchCohortDefinition producer input boundary
 * - preserve explicit cohort identity
 * - preserve explicit query identity
 * - preserve explicit creation timestamp
 * - preserve explicit language and filtering truth
 * - preserve explicit corpus identity
 * - preserve explicit cohort-size configuration
 * - preserve explicit comparability-policy identity
 * - preserve explicit ranking-policy identity
 * - qualify canonical SearchCohortDefinition validation state
 * - produce exactly one canonical SearchCohortDefinition
 *
 * CLASSIFICATION
 * - SEARCH COHORT DEFINITION INPUT PRODUCER
 * - SEARCH DOMAIN
 * - APPLICATION / RUNTIME INPUT BOUNDARY
 * - CANONICAL CONTRACT PRODUCER
 * - READ / VALIDATE / ASSEMBLE
 * - PURE
 * - DETERMINISTIC
 * - NON-ANALYTICAL
 * - NON-NORMALIZING
 * - NON-COMPARING
 * - NON-RANKING
 * - NON-MUTATING
 *
 * POSITION
 * ----------------------------------------------------------------------------
 * This producer exists BEFORE cohort execution.
 *
 * It does NOT introduce a SearchPipelineLayer.
 *
 * Application / configuration truth
 * -> SearchCohortDefinition Input Core
 * -> SearchCohortDefinition
 * -> SearchRuntimeInput
 * -> Search runtime
 * -> SEARCH_COHORT_BATCH
 * -> COHORT_NORMALIZATION
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchCohortDefinition
 * - search-pipeline-contract.ts
 * - SearchRuntimeInput
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - One Canonical Producer Per Reality
 * - Variable Governance System
 * - Variable Lineage Registry
 * - Compute / Observe / Mutate Separation
 *
 * PRODUCER OUTPUT
 * - SearchCohortDefinition
 *
 * CONSUMERS
 * - SearchRuntimeInput.cohort_definition
 * - SEARCH_COHORT_BATCH transport boundary
 * - cohort-definition tests
 * - runtime integration tests
 *
 * OWNERSHIP
 * ----------------------------------------------------------------------------
 * SearchCohortDefinition.contract_version
 * <- canonical search-pipeline-contract.ts
 *
 * SearchCohortDefinition.cohort_id
 * <- explicit application orchestration input
 *
 * SearchCohortDefinition.query_id
 * <- explicit application orchestration input
 *
 * SearchCohortDefinition.created_at
 * <- explicit application orchestration input
 *
 * SearchCohortDefinition.language
 * <- explicit application/configuration truth
 *
 * SearchCohortDefinition.domain
 * <- explicit application/configuration truth
 *
 * SearchCohortDefinition.allowed_source_types
 * <- explicit application/configuration truth
 *
 * SearchCohortDefinition.time_window
 * <- explicit application/configuration truth
 *
 * SearchCohortDefinition.corpus_version
 * <- explicit Search corpus configuration
 *
 * SearchCohortDefinition.minimum_cohort_size
 * <- explicit cohort configuration
 *
 * SearchCohortDefinition.comparability_policy_version
 * <- explicit policy configuration
 *
 * SearchCohortDefinition.ranking_policy_version
 * <- explicit policy configuration
 *
 * SearchCohortDefinition.validation_state
 * <- SEARCH_COHORT_DEFINITION_INPUT_CORE
 *
 * SearchCohortDefinition.rejection_reasons
 * <- SEARCH_COHORT_DEFINITION_INPUT_CORE
 *
 * NON-OWNERSHIP
 * ----------------------------------------------------------------------------
 * SearchQuery
 * <- SearchQuery Input Core
 *
 * SearchQueryProfile
 * <- QUERY_NORMALIZATION / QUERY_PROFILING
 *
 * SearchCohortBatch
 * <- SEARCH_COHORT_BATCH
 *
 * SearchCohortDistribution
 * <- COHORT_NORMALIZATION
 *
 * relative_position / percentile
 * <- RELATIVE_COHORT_EVALUATION
 *
 * public_position
 * <- PUBLIC_RANKING
 *
 * distribution_id
 * <- explicit canonical runtime resolver
 *
 * DIRECTIVES
 * ----------------------------------------------------------------------------
 * - one SearchCohortDefinition truth = one canonical producer
 * - consume explicit inputs only
 * - cohort_id must be supplied
 * - query_id must be supplied
 * - created_at must be supplied
 * - corpus_version must be supplied
 * - comparability_policy_version must be supplied
 * - ranking_policy_version must be supplied
 * - minimum_cohort_size must be supplied
 * - no policy fallback
 * - no policy selection
 * - no policy inference
 * - no corpus-version inference
 * - no language inference
 * - no domain inference
 * - no source-type inference
 * - no time-window inference
 *
 * - do not derive cohort fields from SearchQuery
 * - do not compare SearchQuery filters here
 * - do not repair cross-contract disagreement
 * - do not normalize source-type collections
 * - do not deduplicate source types
 * - do not reorder source types
 * - do not repair time windows
 * - do not complete missing time-window bounds
 *
 * - no acquisition
 * - no scoring
 * - no eligibility
 * - no cohort candidate construction
 * - no cohort distribution calculation
 * - no cohort normalization
 * - no relative evaluation
 * - no private decision
 * - no calibration
 * - no public transformation
 * - no public ranking
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
 * CROSS-CONTRACT GOVERNANCE
 * ----------------------------------------------------------------------------
 * SearchQuery and SearchCohortDefinition share query scope and may contain
 * related filtering truth.
 *
 * This producer deliberately does NOT:
 * - consume SearchQuery;
 * - derive cohort configuration from SearchQuery;
 * - assert query/cohort filter equivalence;
 * - decide which contract wins when configuration differs.
 *
 * Such concordance belongs to the application/runtime input assembly boundary.
 *
 * This prevents SearchCohortDefinition from becoming a downstream
 * reconstruction of SearchQuery.
 *
 * VALIDATION MODEL
 * ----------------------------------------------------------------------------
 * 1. HARD CONTRACT VIOLATION
 *
 * No legal SearchCohortDefinition can be created.
 *
 * Examples:
 * - malformed cohort_id
 * - malformed query_id
 * - malformed created_at
 * - malformed allowed_source_types runtime shape
 * - unsupported SearchSourceType runtime value
 * - malformed minimum_cohort_size primitive
 *
 * => throw immediately.
 *
 * 2. CANONICAL COHORT DEFINITION REJECTION
 *
 * Structurally transportable truth exists but the definition is not valid for
 * runtime use.
 *
 * Examples:
 * - empty language
 * - empty explicitly supplied domain
 * - empty corpus version
 * - empty comparability policy version
 * - empty ranking policy version
 * - invalid time-window timestamp
 * - inverted time window
 *
 * => preserve the supplied truth and produce:
 *
 * validation_state = "REJECTED"
 * rejection_reasons = [...]
 *
 * No repair is authorized.
 *
 * MINIMUM COHORT SIZE
 * ----------------------------------------------------------------------------
 * SearchCount is treated structurally as a non-negative integer.
 *
 * This producer deliberately does NOT invent a stricter minimum such as 1.
 *
 * Therefore:
 * - negative / fractional / non-finite values are contract violations;
 * - zero remains structurally representable unless a canonical policy defines
 *   a stricter semantic constraint elsewhere.
 *
 * ALLOWED SOURCE TYPES
 * ----------------------------------------------------------------------------
 * The canonical contract does not currently require a non-empty collection.
 *
 * Therefore this producer does NOT invent such a rule.
 *
 * It validates only:
 * - array shape;
 * - canonical SearchSourceType membership.
 *
 * Empty collections and repeated canonical source types remain explicit
 * upstream truth and are not silently repaired.
 *
 * INVARIANTS
 * ----------------------------------------------------------------------------
 * - exactly one SearchCohortDefinition is produced per invocation
 * - canonical pipeline contract version is used
 * - cohort_id is propagated unchanged
 * - query_id is propagated unchanged
 * - created_at is propagated unchanged
 * - language is propagated unchanged
 * - domain is propagated unchanged
 * - allowed_source_types values and order are propagated unchanged
 * - time_window is propagated unchanged
 * - corpus_version is propagated unchanged
 * - minimum_cohort_size is propagated unchanged
 * - comparability_policy_version is propagated unchanged
 * - ranking_policy_version is propagated unchanged
 * - no source type is deduplicated
 * - no policy is selected locally
 * - no cohort analytical truth is produced
 * - VALID means rejection_reasons is empty
 * - REJECTED means rejection_reasons is non-empty
 * - this producer never emits DEGRADED
 * - this producer never emits UNVALIDATED
 * - output is immutable
 * - same input produces same output
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * generated cohort_id
 * => application orchestration ownership violation
 *
 * generated query_id
 * => SearchQuery / application orchestration ownership violation
 *
 * runtime-generated created_at
 * => application orchestration ownership violation
 *
 * inferred language
 * => configuration ownership violation
 *
 * inferred corpus_version
 * => corpus configuration ownership violation
 *
 * locally selected ranking policy
 * => policy ownership violation
 *
 * locally selected comparability policy
 * => policy ownership violation
 *
 * deduplicated/reordered allowed_source_types
 * => request/configuration truth mutation
 *
 * reconstructed time window
 * => configuration truth mutation
 *
 * derived cohort definition from SearchQuery
 * => downstream reconstruction violation
 *
 * cohort distribution calculated here
 * => COHORT_NORMALIZATION ownership violation
 * ========================================================================== */

import {
  XYVALA_SEARCH_PIPELINE_CONTRACT,
} from "../contracts/search-pipeline-contract";

import type {
  SearchCohortDefinition,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchSourceType,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_COHORT_DEFINITION_INPUT_CORE_MODULE_NAME =
  "xyvala-search-cohort-definition-input-core" as const;

export const XYVALA_SEARCH_COHORT_DEFINITION_INPUT_CORE_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

/**
 * SearchCohortDefinition belongs to the canonical Search pipeline contract.
 *
 * No parallel local contract-version authority is introduced.
 */
export const XYVALA_SEARCH_COHORT_DEFINITION_CONTRACT_VERSION =
  XYVALA_SEARCH_PIPELINE_CONTRACT.contract_version;

/* ============================================================================
 * 2. CANONICAL PRODUCER INPUT
 * ----------------------------------------------------------------------------
 * Producer-owned fields are excluded:
 *
 * - contract_version
 * - validation_state
 * - rejection_reasons
 *
 * Every remaining SearchCohortDefinition truth is supplied explicitly.
 * ========================================================================== */

export type SearchCohortDefinitionBuildInput =
  Readonly<
    Pick<
      SearchCohortDefinition,
      | "cohort_id"
      | "query_id"
      | "created_at"
      | "language"
      | "domain"
      | "allowed_source_types"
      | "time_window"
      | "corpus_version"
      | "minimum_cohort_size"
      | "comparability_policy_version"
      | "ranking_policy_version"
    >
  >;

/* ============================================================================
 * 3. REJECTION IDENTITIES
 * ----------------------------------------------------------------------------
 * Producer-owned qualification only.
 *
 * These are NOT:
 * - eligibility reasons
 * - penalties
 * - private decisions
 * - ranking states
 * - analytical evidence
 * ========================================================================== */

export type SearchCohortDefinitionInputRejectionReason =
  | "EMPTY_LANGUAGE"
  | "EMPTY_DOMAIN"
  | "EMPTY_CORPUS_VERSION"
  | "EMPTY_COMPARABILITY_POLICY_VERSION"
  | "EMPTY_RANKING_POLICY_VERSION"
  | "INVALID_TIME_WINDOW_START"
  | "INVALID_TIME_WINDOW_END"
  | "TIME_WINDOW_INVERTED";

/* ============================================================================
 * 4. CANONICAL SOURCE TYPE RUNTIME DOMAIN
 * ========================================================================== */

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
 * Any SearchSourceType contract evolution forces explicit review here.
 * ========================================================================== */

type DeclaredSearchSourceType =
  (
    typeof CANONICAL_SOURCE_TYPES
  )[number];

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

const XYVALA_SEARCH_COHORT_SOURCE_TYPE_RUNTIME_DOMAIN_IS_EXACT:
  SearchSourceTypeRuntimeDomainIsExact =
    true;

void XYVALA_SEARCH_COHORT_SOURCE_TYPE_RUNTIME_DOMAIN_IS_EXACT;

/* ============================================================================
 * 6. RUNTIME DOMAIN SET
 * ========================================================================== */

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
      `[${XYVALA_SEARCH_COHORT_DEFINITION_INPUT_CORE_MODULE_NAME}] ` +
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
      `[${XYVALA_SEARCH_COHORT_DEFINITION_INPUT_CORE_MODULE_NAME}] ` +
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
      `[${XYVALA_SEARCH_COHORT_DEFINITION_INPUT_CORE_MODULE_NAME}] ` +
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
      `[${XYVALA_SEARCH_COHORT_DEFINITION_INPUT_CORE_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be an object.`,
    );
  }
}

function assertNonNegativeInteger(
  value:
    unknown,

  fieldName:
    string,
): asserts value is number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value,
    ) ||
    !Number.isInteger(
      value,
    ) ||
    value <
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_DEFINITION_INPUT_CORE_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a non-negative integer.`,
    );
  }
}

/* ============================================================================
 * 8. ALLOWED SOURCE TYPE VALIDATION
 * ----------------------------------------------------------------------------
 * Structural validation only.
 *
 * No:
 * - deduplication
 * - sorting
 * - implicit default
 * - fallback source type
 * ========================================================================== */

function assertAllowedSourceTypes(
  value:
    unknown,
): asserts value is readonly SearchSourceType[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_DEFINITION_INPUT_CORE_MODULE_NAME}] ` +
        "Contract violation: allowed_source_types must be an array.",
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
        `[${XYVALA_SEARCH_COHORT_DEFINITION_INPUT_CORE_MODULE_NAME}] ` +
          `Contract violation: allowed_source_types[${String(index)}] contains unsupported source type ${String(sourceType)}.`,
      );
    }
  }
}

/* ============================================================================
 * 9. OPTIONAL INPUT SHAPE VALIDATION
 * ----------------------------------------------------------------------------
 * Shape only.
 *
 * Semantic validity is qualified separately through canonical
 * validation_state / rejection_reasons.
 * ========================================================================== */

function validateOptionalInputShape(
  input:
    SearchCohortDefinitionBuildInput,
): void {
  if (
    input.domain !==
    undefined
  ) {
    assertString(
      input.domain,
      "domain",
    );
  }

  if (
    input.time_window !==
    undefined
  ) {
    assertRecord(
      input.time_window,
      "time_window",
    );

    if (
      input.time_window
        .start_at !==
      undefined
    ) {
      assertString(
        input.time_window
          .start_at,
        "time_window.start_at",
      );
    }

    if (
      input.time_window
        .end_at !==
      undefined
    ) {
      assertString(
        input.time_window
          .end_at,
        "time_window.end_at",
      );
    }
  }
}

/* ============================================================================
 * 10. HARD PRODUCER INPUT VALIDATION
 * ----------------------------------------------------------------------------
 * Failure here means the input cannot legally form a canonical
 * SearchCohortDefinition contract.
 * ========================================================================== */

function validateProducerInputBoundary(
  input:
    SearchCohortDefinitionBuildInput,
): void {
  assertNonEmptyString(
    input.cohort_id,
    "cohort_id",
  );

  assertNonEmptyString(
    input.query_id,
    "query_id",
  );

  assertValidIsoTimestamp(
    input.created_at,
    "created_at",
  );

  assertString(
    input.language,
    "language",
  );

  assertAllowedSourceTypes(
    input.allowed_source_types,
  );

  assertString(
    input.corpus_version,
    "corpus_version",
  );

  assertNonNegativeInteger(
    input.minimum_cohort_size,
    "minimum_cohort_size",
  );

  assertString(
    input.comparability_policy_version,
    "comparability_policy_version",
  );

  assertString(
    input.ranking_policy_version,
    "ranking_policy_version",
  );

  validateOptionalInputShape(
    input,
  );
}

/* ============================================================================
 * 11. CANONICAL COHORT VALIDITY QUALIFICATION
 * ----------------------------------------------------------------------------
 * Inspects supplied truth.
 *
 * Never repairs it.
 * Never substitutes it.
 * Never derives another value.
 * ========================================================================== */

function collectCohortDefinitionRejectionReasons(
  input:
    SearchCohortDefinitionBuildInput,
): readonly SearchCohortDefinitionInputRejectionReason[] {
  const rejectionReasons:
    SearchCohortDefinitionInputRejectionReason[] =
    [];

  /* --------------------------------------------------------------------------
   * LANGUAGE
   * ----------------------------------------------------------------------- */

  if (
    input.language
      .trim()
      .length ===
    0
  ) {
    rejectionReasons.push(
      "EMPTY_LANGUAGE",
    );
  }

  /* --------------------------------------------------------------------------
   * DOMAIN
   * ----------------------------------------------------------------------- */

  if (
    input.domain !==
      undefined &&
    input.domain
      .trim()
      .length ===
      0
  ) {
    rejectionReasons.push(
      "EMPTY_DOMAIN",
    );
  }

  /* --------------------------------------------------------------------------
   * CORPUS VERSION
   * ----------------------------------------------------------------------- */

  if (
    input.corpus_version
      .trim()
      .length ===
    0
  ) {
    rejectionReasons.push(
      "EMPTY_CORPUS_VERSION",
    );
  }

  /* --------------------------------------------------------------------------
   * COMPARABILITY POLICY VERSION
   * ----------------------------------------------------------------------- */

  if (
    input
      .comparability_policy_version
      .trim()
      .length ===
    0
  ) {
    rejectionReasons.push(
      "EMPTY_COMPARABILITY_POLICY_VERSION",
    );
  }

  /* --------------------------------------------------------------------------
   * RANKING POLICY VERSION
   * ----------------------------------------------------------------------- */

  if (
    input
      .ranking_policy_version
      .trim()
      .length ===
    0
  ) {
    rejectionReasons.push(
      "EMPTY_RANKING_POLICY_VERSION",
    );
  }

  /* --------------------------------------------------------------------------
   * TIME WINDOW
   * ----------------------------------------------------------------------- */

  const timeWindow =
    input.time_window;

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
        "INVALID_TIME_WINDOW_START",
      );
    }

    if (
      endAt !==
        undefined &&
      !validEnd
    ) {
      rejectionReasons.push(
        "INVALID_TIME_WINDOW_END",
      );
    }

    /*
     * Compare only two individually valid supplied timestamps.
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
        "TIME_WINDOW_INVERTED",
      );
    }
  }

  return Object.freeze(
    rejectionReasons,
  );
}

/* ============================================================================
 * 12. VALIDATION STATE
 * ----------------------------------------------------------------------------
 * This canonical producer emits only:
 *
 * VALID
 * REJECTED
 *
 * No canonical DEGRADED semantics are currently defined for cohort-definition
 * input.
 *
 * UNVALIDATED would contradict the role of this producer.
 * ========================================================================== */

function resolveCohortDefinitionValidationState(
  rejectionReasons:
    readonly SearchCohortDefinitionInputRejectionReason[],
): SearchValidationState {
  return rejectionReasons.length ===
    0
    ? "VALID"
    : "REJECTED";
}

/* ============================================================================
 * 13. ALLOWED SOURCE TYPE TRANSPORT
 * ----------------------------------------------------------------------------
 * Immutable structural copy.
 *
 * Exact:
 * - values
 * - multiplicity
 * - order
 *
 * are preserved.
 * ========================================================================== */

function transportAllowedSourceTypes(
  sourceTypes:
    readonly SearchSourceType[],
): readonly SearchSourceType[] {
  return Object.freeze([
    ...sourceTypes,
  ]);
}

/* ============================================================================
 * 14. TIME WINDOW TRANSPORT
 * ----------------------------------------------------------------------------
 * Structural immutable transport only.
 *
 * No:
 * - normalization
 * - completion
 * - default
 * - timestamp replacement
 * ========================================================================== */

type SearchCohortDefinitionTimeWindow =
  NonNullable<
    SearchCohortDefinition[
      "time_window"
    ]
  >;

function transportTimeWindow(
  timeWindow:
    SearchCohortDefinition[
      "time_window"
    ],
):
  | SearchCohortDefinitionTimeWindow
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
  } satisfies SearchCohortDefinitionTimeWindow;

  return Object.freeze(
    transportedTimeWindow,
  );
}

/* ============================================================================
 * 15. CANONICAL SearchCohortDefinition PRODUCER
 * ----------------------------------------------------------------------------
 *
 * SearchCohortDefinitionBuildInput
 * -> hard contract-boundary validation
 * -> definition validity qualification
 * -> exact configuration-truth transport
 * -> SearchCohortDefinition
 *
 * No cohort analytical producer executes here.
 * ========================================================================== */

export function buildSearchCohortDefinition(
  input:
    SearchCohortDefinitionBuildInput,
): SearchCohortDefinition {
  validateProducerInputBoundary(
    input,
  );

  const rejectionReasons =
    collectCohortDefinitionRejectionReasons(
      input,
    );

  const validationState =
    resolveCohortDefinitionValidationState(
      rejectionReasons,
    );

  const allowedSourceTypes =
    transportAllowedSourceTypes(
      input.allowed_source_types,
    );

  const timeWindow =
    transportTimeWindow(
      input.time_window,
    );

  const cohortDefinition = {
    /*
     * Canonical contract identity.
     *
     * No competing local SearchCohortDefinition contract version.
     */
    contract_version:
      XYVALA_SEARCH_COHORT_DEFINITION_CONTRACT_VERSION,

    /*
     * Explicit orchestration truth.
     *
     * No runtime clock.
     */
    created_at:
      input.created_at,

    /*
     * Explicit orchestration identity.
     *
     * No UUID/random generation.
     */
    cohort_id:
      input.cohort_id,

    /*
     * Exact query-scope identity.
     *
     * This producer does not independently create query identity.
     */
    query_id:
      input.query_id,

    /*
     * Explicit configuration truth.
     *
     * No language inference.
     */
    language:
      input.language,

    ...(
      input.domain !==
      undefined
        ? {
            domain:
              input.domain,
          }
        : {}
    ),

    /*
     * Exact collection semantics preserved.
     */
    allowed_source_types:
      allowedSourceTypes,

    ...(
      timeWindow !==
      undefined
        ? {
            time_window:
              timeWindow,
          }
        : {}
    ),

    /*
     * Explicit corpus/configuration truth.
     */
    corpus_version:
      input.corpus_version,

    /*
     * Exact supplied count.
     *
     * No local minimum is invented.
     */
    minimum_cohort_size:
      input.minimum_cohort_size,

    /*
     * Explicit policy identities.
     *
     * No policy selection or fallback occurs here.
     */
    comparability_policy_version:
      input.comparability_policy_version,

    ranking_policy_version:
      input.ranking_policy_version,

    validation_state:
      validationState,

    rejection_reasons:
      rejectionReasons,
  } satisfies SearchCohortDefinition;

  return Object.freeze(
    cohortDefinition,
  );
}

/* ============================================================================
 * 16. STATIC OWNERSHIP DECLARATION
 * ----------------------------------------------------------------------------
 * Governance metadata only.
 *
 * No Search analytical behavior depends on this object.
 * ========================================================================== */

export const XYVALA_SEARCH_COHORT_DEFINITION_INPUT_CORE_OWNERSHIP =
  Object.freeze({
    output_contract:
      "SearchCohortDefinition",

    canonical_output_producer:
      XYVALA_SEARCH_COHORT_DEFINITION_INPUT_CORE_MODULE_NAME,

    canonical_contract_owner:
      "search-pipeline-contract.ts",

    pipeline_layer_created:
      false,

    runtime_input_consumer:
      "SearchRuntimeInput",

    downstream_transport_boundary:
      "SEARCH_COHORT_BATCH",

    cohort_id_owner:
      "APPLICATION_ORCHESTRATION",

    query_id_owner:
      "SEARCH_QUERY_APPLICATION_ORCHESTRATION",

    created_at_owner:
      "APPLICATION_ORCHESTRATION",

    language_source:
      "APPLICATION_CONFIGURATION_TRUTH",

    domain_source:
      "APPLICATION_CONFIGURATION_TRUTH",

    allowed_source_types_source:
      "APPLICATION_CONFIGURATION_TRUTH",

    time_window_source:
      "APPLICATION_CONFIGURATION_TRUTH",

    corpus_version_owner:
      "SEARCH_CORPUS_CONFIGURATION",

    minimum_cohort_size_owner:
      "SEARCH_COHORT_CONFIGURATION",

    comparability_policy_version_owner:
      "SEARCH_POLICY_CONFIGURATION",

    ranking_policy_version_owner:
      "SEARCH_POLICY_CONFIGURATION",

    validation_state_owner:
      XYVALA_SEARCH_COHORT_DEFINITION_INPUT_CORE_MODULE_NAME,

    rejection_reasons_owner:
      XYVALA_SEARCH_COHORT_DEFINITION_INPUT_CORE_MODULE_NAME,

    cohort_batch_owner:
      "SEARCH_COHORT_BATCH",

    cohort_distribution_owner:
      "COHORT_NORMALIZATION",

    relative_evaluation_owner:
      "RELATIVE_COHORT_EVALUATION",

    public_position_owner:
      "PUBLIC_RANKING",
  } as const);

/* ============================================================================
 * 17. STATIC GOVERNANCE DECLARATION
 * ========================================================================== */

export const XYVALA_SEARCH_COHORT_DEFINITION_INPUT_CORE_GOVERNANCE =
  Object.freeze({
    canonical_cohort_definition_producer:
      true,

    analytical_producer:
      false,

    pipeline_layer_created:
      false,

    explicit_cohort_id_required:
      true,

    explicit_query_id_required:
      true,

    explicit_created_at_required:
      true,

    explicit_language_required:
      true,

    explicit_allowed_source_types_required:
      true,

    explicit_corpus_version_required:
      true,

    explicit_minimum_cohort_size_required:
      true,

    explicit_comparability_policy_version_required:
      true,

    explicit_ranking_policy_version_required:
      true,

    configuration_truth_preserved:
      true,

    source_type_order_preserved:
      true,

    source_type_multiplicity_preserved:
      true,

    rejected_definition_truth_preserved:
      true,

    query_derivation_allowed:
      false,

    query_filter_reconstruction_allowed:
      false,

    query_cohort_concordance_evaluation_allowed:
      false,

    language_inference_allowed:
      false,

    domain_inference_allowed:
      false,

    source_type_inference_allowed:
      false,

    time_window_inference_allowed:
      false,

    corpus_version_inference_allowed:
      false,

    comparability_policy_selection_allowed:
      false,

    ranking_policy_selection_allowed:
      false,

    policy_fallback_allowed:
      false,

    source_type_deduplication_allowed:
      false,

    source_type_reordering_allowed:
      false,

    time_window_repair_allowed:
      false,

    time_window_completion_allowed:
      false,

    cohort_candidate_construction_allowed:
      false,

    cohort_distribution_calculation_allowed:
      false,

    cohort_normalization_allowed:
      false,

    relative_evaluation_allowed:
      false,

    ranking_allowed:
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
        "cohort_definition_generated_cohort_id",
        "cohort_definition_generated_query_id",
        "cohort_definition_read_runtime_clock",

        "cohort_definition_derived_from_search_query",
        "cohort_definition_reconstructed_query_filters",

        "cohort_definition_inferred_language",
        "cohort_definition_inferred_domain",
        "cohort_definition_inferred_source_types",
        "cohort_definition_inferred_time_window",

        "cohort_definition_inferred_corpus_version",

        "cohort_definition_selected_comparability_policy",
        "cohort_definition_selected_ranking_policy",
        "cohort_definition_policy_fallback",

        "cohort_definition_deduplicated_source_types",
        "cohort_definition_reordered_source_types",

        "cohort_definition_repaired_time_window",
        "cohort_definition_completed_time_window",

        "cohort_definition_constructed_candidates",
        "cohort_definition_calculated_distribution",
        "cohort_definition_normalized_cohort",

        "cohort_definition_converted_rejected_to_valid",
      ] as const),
  } as const);
