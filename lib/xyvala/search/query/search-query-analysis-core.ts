/* ============================================================================
 * FILE: lib/xyvala/search/query/search-query-analysis-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical query analysis core
 *
 * ROLE
 * - consume one canonical SearchQuery
 * - consume one explicitly selected SearchQueryAnalysisPolicy
 * - validate the query-analysis boundary
 * - normalize raw query text deterministically
 * - tokenize normalized query text deterministically
 * - construct canonical SearchQueryTerm objects
 * - preserve explicit query identity and timestamp
 * - preserve unknown semantics when no governed evidence exists
 * - produce one canonical SearchQueryProfile
 *
 * CLASSIFICATION
 * - SEARCH DOMAIN
 * - QUERY ANALYSIS
 * - QUERY_NORMALIZATION
 * - QUERY_PROFILING
 * - CANONICAL PRODUCER
 * - COMPUTE
 * - PURE
 * - DETERMINISTIC
 * - NON-MUTATING
 * - NON-ORCHESTRATING
 * - NON-PUBLIC
 * - PRIVATE ANALYTICAL PIPELINE
 *
 * POSITION IN OFFICIAL CHAIN
 * ----------------------------------------------------------------------------
 *
 * SearchQuery
 *      ↓
 * QUERY_NORMALIZATION
 *      ↓
 * QUERY_PROFILING
 *      ↓
 * SearchQueryProfile
 *      ↓
 * QUERY_DOCUMENT_SIGNAL_DETECTION
 *
 * RUNTIME GOVERNANCE
 * ----------------------------------------------------------------------------
 *
 * Authorized policy governance
 *          ↓
 * runtime policy resolver
 *          ↓
 * runtime producer adapter
 *          ↓
 * buildSearchQueryProfile()
 *
 * The canonical core consumes the selected policy.
 *
 * It never selects:
 * - a default policy;
 * - a fallback policy;
 * - a policy from runtime state;
 * - a policy from query content.
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchQuery
 * - SearchQueryProfile
 * - SearchQueryTerm
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - One Identity Per Analytical Reality
 * - One Canonical Producer Per Analytical Reality
 * - Explicit Policy Rule
 * - Policy Version Governance
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 * - Compute / Observe / Mutate Separation
 *
 * PRODUCER INPUT
 * - authorized Search runtime adapter
 * - private test orchestration
 * - calibration evaluation orchestration
 * - simulation / replay orchestration
 *
 * CONSUMERS
 * - Query-Document Signal Detection
 * - Query Relevance Scoring
 * - Search private snapshot propagation where authorized
 * - Search orchestration
 *
 * DIRECTIVES
 * - query analysis only
 * - query normalization only
 * - query profiling only
 * - deterministic text normalization
 * - deterministic term extraction
 * - explicit analytical policy
 * - explicit policy version
 * - explicit unknown semantics
 * - preserve canonical query_id
 * - preserve canonical created_at
 * - no implicit DEFAULT_* policy
 * - no policy fallback
 * - no policy selection
 * - no document access
 * - no document lexical analysis
 * - no corpus-frequency analysis
 * - no anchor detection
 * - no context reconstruction
 * - no query-document scoring
 * - no document scoring
 * - no penalty evaluation
 * - no analytical aggregation
 * - no eligibility evaluation
 * - no cohort normalization
 * - no relative cohort evaluation
 * - no private decision
 * - no calibration mutation
 * - no snapshot construction
 * - no public transformation
 * - no public ranking
 * - no persistence
 * - no logging
 * - no event publication
 * - no local clock access
 * - no random identifier generation
 * - no semantic inference without governed evidence
 * - no invented language detection
 * - no invented intent detection
 * - no hidden stop-word policy
 * - no unavailable-to-neutral conversion
 *
 * INPUTS
 * - canonical SearchQuery
 * - explicit SearchQueryAnalysisPolicy
 *
 * OUTPUTS
 * - canonical SearchQueryProfile
 *
 * OWNERSHIP
 * ----------------------------------------------------------------------------
 * normalized_query
 * <- QUERY_NORMALIZATION
 *
 * query_terms
 * <- QUERY_PROFILING
 *
 * excluded_terms
 * <- QUERY_PROFILING
 *
 * query_intent
 * <- QUERY_PROFILING
 *
 * detected_language
 * <- QUERY_PROFILING
 *
 * query_id
 * <- SearchQuery
 *
 * created_at
 * <- SearchQuery
 *
 * policy selection
 * <- EXTERNAL AUTHORIZED POLICY GOVERNANCE
 *
 * NON-OWNERSHIP
 * ----------------------------------------------------------------------------
 * requested source constraints
 * <- SearchQuery / orchestration
 *
 * requested time constraints
 * <- SearchQuery / orchestration
 *
 * documentary relevance
 * <- QUERY_RELEVANCE_SCORING
 *
 * public ranking
 * <- PUBLIC_RANKING
 *
 * INVARIANTS
 * - query_id is never generated here
 * - created_at is never generated here
 * - contract_version is explicit
 * - policy is mandatory
 * - policy_version is explicit
 * - policy is never selected locally
 * - normalized_query never contains leading/trailing whitespace
 * - normalized_query uses canonical Unicode compatibility normalization
 * - repeated whitespace is collapsed deterministically
 * - query terms are deterministic for identical input and policy
 * - duplicate normalized terms are represented once
 * - every active emitted query term has a finite strictly-positive weight
 * - no term is marked EXCLUDED without explicit governed exclusion policy
 * - no term is marked PRIMARY / SECONDARY / MODIFIER without governed evidence
 * - V1 therefore uses UNKNOWN term_role for active terms
 * - query_intent remains UNKNOWN without governed intent evidence
 * - detected_language remains explicitly unavailable without governed detection
 * - empty or unusable query input produces REJECTED
 * - VALID/DEGRADED output always contains at least one active weighted term
 * - REJECTED / UNVALIDATED upstream state is never silently repaired
 * - no input contract is mutated
 * - no runtime clock is read
 * - no random value is generated
 *
 * FAILURE CLASSIFICATION
 * ----------------------------------------------------------------------------
 * THROW
 * - malformed or invalid policy
 * - impossible internal producer invariant
 *
 * RETURN REJECTED PROFILE
 * - malformed SearchQuery truth
 * - upstream REJECTED SearchQuery
 * - upstream UNVALIDATED SearchQuery
 * - empty normalized query
 * - no usable terms
 * - query exceeds explicit processing policy boundary
 * - produced profile fails canonical output validation
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * malformed SearchQuery
 * => SearchQuery producer / query-analysis boundary
 *
 * missing query_id
 * => SearchQuery producer
 *
 * missing created_at
 * => SearchQuery producer
 *
 * empty raw_query
 * => SearchQuery producer
 *
 * query marked REJECTED upstream
 * => SearchQuery producer
 *
 * query marked UNVALIDATED upstream
 * => SearchQuery producer
 *
 * missing analytical policy
 * => runtime policy-resolution / adapter boundary
 *
 * malformed analytical policy
 * => policy-governance boundary
 *
 * no usable normalized terms
 * => Query Normalization / Query Profiling boundary
 *
 * semantic role required without governed producer
 * => query profiling governance
 *
 * language required without detector
 * => query profiling governance
 *
 * intent required without governed producer
 * => query profiling governance
 *
 * SENSITIVE AREAS
 * - Unicode normalization
 * - token boundaries
 * - query identity
 * - timestamp propagation
 * - term weighting
 * - policy lineage
 * - semantic-role inference
 * - language inference
 * - intent inference
 * ========================================================================== */

import type {
  SearchContractVersion,
  SearchLanguageCode,
  SearchModuleVersion,
  SearchOptionalEvidence,
  SearchPolicyVersion,
  SearchQuery,
  SearchQueryProfile,
  SearchQueryTerm,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_QUERY_ANALYSIS_MODULE_NAME =
  "xyvala-search-query-analysis-core" as const;

export const XYVALA_SEARCH_QUERY_ANALYSIS_MODULE_VERSION:
  SearchModuleVersion =
    "1.1.0";

export const XYVALA_SEARCH_QUERY_NORMALIZER_VERSION =
  "1.0.0" satisfies SearchModuleVersion;

export const XYVALA_SEARCH_QUERY_PROFILER_VERSION =
  "1.0.0" satisfies SearchModuleVersion;

export const XYVALA_SEARCH_QUERY_PROFILE_CONTRACT_VERSION =
  "2.0.0" satisfies SearchContractVersion;

export const XYVALA_SEARCH_QUERY_ANALYSIS_POLICY_VERSION =
  "1.0.0" satisfies SearchPolicyVersion;

/* ============================================================================
 * 2. METHODS
 * ----------------------------------------------------------------------------
 * These strings are traceable method identities.
 *
 * They are not:
 * - analytical scores
 * - policies
 * - semantic claims
 * ========================================================================== */

export const XYVALA_SEARCH_QUERY_NORMALIZATION_METHOD =
  "NFKC_LOWERCASE_WHITESPACE_V1" as const;

export const XYVALA_SEARCH_QUERY_PROFILING_METHOD =
  "UNIFORM_UNKNOWN_ROLE_V1" as const;

/* ============================================================================
 * 3. QUERY ANALYSIS POLICY
 * ----------------------------------------------------------------------------
 * Policy is explicit and externally selected.
 *
 * The core validates and consumes the supplied policy.
 *
 * It never selects a policy.
 * ========================================================================== */

export interface SearchQueryAnalysisPolicy {
  /**
   * Explicit policy identity.
   *
   * Policy selection belongs to authorized external governance.
   */
  readonly policy_version:
    SearchPolicyVersion;

  /**
   * Uniform positive term weight.
   *
   * V1 intentionally does not infer importance from term position,
   * frequency, syntax or semantics.
   */
  readonly active_term_weight:
    number;

  /**
   * Hard deterministic processing boundary.
   *
   * This is not a relevance threshold or ranking threshold.
   */
  readonly maximum_query_term_count:
    number;
}

/**
 * Reference policy.
 *
 * This object may be selected explicitly by:
 * - application configuration;
 * - tests;
 * - simulations;
 * - controlled bootstrap configuration.
 *
 * The canonical core never selects it automatically.
 */
export const XYVALA_SEARCH_QUERY_ANALYSIS_REFERENCE_POLICY:
  SearchQueryAnalysisPolicy =
  Object.freeze({
    policy_version:
      XYVALA_SEARCH_QUERY_ANALYSIS_POLICY_VERSION,

    active_term_weight:
      1,

    maximum_query_term_count:
      64,
  });

/**
 * Compatibility export only.
 *
 * @deprecated
 * Prefer XYVALA_SEARCH_QUERY_ANALYSIS_REFERENCE_POLICY.
 *
 * This alias does NOT authorize implicit runtime fallback.
 */
export const DEFAULT_XYVALA_SEARCH_QUERY_ANALYSIS_POLICY =
  XYVALA_SEARCH_QUERY_ANALYSIS_REFERENCE_POLICY;

/* ============================================================================
 * 4. INPUT CONTRACT
 * ----------------------------------------------------------------------------
 * Policy is mandatory.
 *
 * Any caller without an explicit policy is outside the canonical producer
 * contract.
 * ========================================================================== */

export interface SearchQueryAnalysisInput {
  readonly query:
    SearchQuery;

  readonly policy:
    SearchQueryAnalysisPolicy;
}

/* ============================================================================
 * 5. VALIDATION RESULT
 * ========================================================================== */

export interface SearchQueryAnalysisValidationResult {
  readonly validation_state:
    SearchValidationState;

  readonly rejection_reasons:
    readonly string[];
}

/* ============================================================================
 * 6. SAFE PRIMITIVE VALIDATION
 * ========================================================================== */

function isNonEmptyString(
  value:
    unknown,
): value is string {
  return (
    typeof value ===
      "string" &&
    value.trim().length >
      0
  );
}

function isFinitePositiveNumber(
  value:
    number,
): boolean {
  return (
    Number.isFinite(
      value,
    ) &&
    value >
      0
  );
}

function isPositiveInteger(
  value:
    number,
): boolean {
  return (
    Number.isInteger(
      value,
    ) &&
    value >
      0
  );
}

function isValidIsoTimestamp(
  value:
    string,
): boolean {
  if (
    !isNonEmptyString(
      value,
    )
  ) {
    return false;
  }

  return Number.isFinite(
    Date.parse(
      value,
    ),
  );
}

/* ============================================================================
 * 7. POLICY VALIDATION
 * ----------------------------------------------------------------------------
 * Invalid policy is a configuration / governance failure.
 *
 * It does not become a REJECTED SearchQueryProfile because policy validity is
 * not documentary/query analytical truth.
 * ========================================================================== */

function validatePolicy(
  policy:
    SearchQueryAnalysisPolicy,
): void {
  if (
    !isNonEmptyString(
      policy.policy_version,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_ANALYSIS_MODULE_NAME}] ` +
        "Policy violation: policy_version must be a non-empty string.",
    );
  }

  if (
    !isFinitePositiveNumber(
      policy.active_term_weight,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_ANALYSIS_MODULE_NAME}] ` +
        "Policy violation: active_term_weight must be a finite positive number.",
    );
  }

  if (
    !isPositiveInteger(
      policy.maximum_query_term_count,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_QUERY_ANALYSIS_MODULE_NAME}] ` +
        "Policy violation: maximum_query_term_count must be a positive integer.",
    );
  }
}

/* ============================================================================
 * 8. INPUT VALIDATION
 * ----------------------------------------------------------------------------
 * Validation qualifies upstream SearchQuery truth.
 *
 * It does not:
 * - repair malformed input;
 * - repair validation_state;
 * - invent a query identity;
 * - invent a timestamp;
 * - choose a policy.
 * ========================================================================== */

export function validateSearchQueryAnalysisInput(
  input:
    SearchQueryAnalysisInput,
): SearchQueryAnalysisValidationResult {
  const rejectionReasons =
    new Set<string>();

  const query =
    input.query;

  if (
    !isNonEmptyString(
      query.contract_version,
    )
  ) {
    rejectionReasons.add(
      "QUERY_CONTRACT_VERSION_EMPTY",
    );
  }

  if (
    !isNonEmptyString(
      query.query_id,
    )
  ) {
    rejectionReasons.add(
      "QUERY_ID_EMPTY",
    );
  }

  if (
    !isValidIsoTimestamp(
      query.created_at,
    )
  ) {
    rejectionReasons.add(
      "QUERY_CREATED_AT_INVALID",
    );
  }

  if (
    !isNonEmptyString(
      query.raw_query,
    )
  ) {
    rejectionReasons.add(
      "RAW_QUERY_EMPTY",
    );
  }

  if (
    query.validation_state ===
    "REJECTED"
  ) {
    rejectionReasons.add(
      "QUERY_REJECTED_UPSTREAM",
    );
  }

  if (
    query.validation_state ===
    "UNVALIDATED"
  ) {
    rejectionReasons.add(
      "QUERY_UNVALIDATED_UPSTREAM",
    );
  }

  if (
    query.rejection_reasons.length >
    0
  ) {
    rejectionReasons.add(
      "QUERY_REJECTION_REASONS_PRESENT",
    );
  }

  return Object.freeze({
    validation_state:
      rejectionReasons.size >
      0
        ? "REJECTED"
        : query.validation_state,

    rejection_reasons:
      Object.freeze([
        ...rejectionReasons,
      ]),
  });
}

/* ============================================================================
 * 9. CANONICAL QUERY NORMALIZATION
 * ----------------------------------------------------------------------------
 * V1 performs only deterministic text-shape normalization:
 *
 * 1. Unicode compatibility normalization (NFKC)
 * 2. Unicode lowercase conversion
 * 3. whitespace collapse
 * 4. boundary trimming
 *
 * It does NOT:
 * - stem
 * - lemmatize
 * - translate
 * - expand synonyms
 * - remove stop words
 * - infer semantic meaning
 * ========================================================================== */

export function normalizeSearchQueryText(
  rawQuery:
    string,
): string {
  return rawQuery
    .normalize(
      "NFKC",
    )
    .toLocaleLowerCase(
      "und",
    )
    .replace(
      /\s+/gu,
      " ",
    )
    .trim();
}

/* ============================================================================
 * 10. QUERY TERM EXTRACTION
 * ----------------------------------------------------------------------------
 * Token extraction remains lexical and conservative.
 *
 * Supported token body:
 * - Unicode letters
 * - Unicode numbers
 * - combining marks
 *
 * Apostrophes and hyphens may remain internal to a token.
 *
 * No semantic interpretation occurs here.
 * ========================================================================== */

const QUERY_TERM_PATTERN =
  /[\p{L}\p{N}\p{M}]+(?:['’\-][\p{L}\p{N}\p{M}]+)*/gu;

function extractNormalizedTerms(
  normalizedQuery:
    string,
): readonly string[] {
  const matches =
    normalizedQuery.match(
      QUERY_TERM_PATTERN,
    );

  if (
    matches ===
    null
  ) {
    return Object.freeze([]);
  }

  const seen =
    new Set<string>();

  const terms:
    string[] = [];

  for (
    const match of
    matches
  ) {
    const normalizedTerm =
      match
        .normalize(
          "NFKC",
        )
        .toLocaleLowerCase(
          "und",
        )
        .trim();

    if (
      normalizedTerm.length ===
      0
    ) {
      continue;
    }

    if (
      seen.has(
        normalizedTerm,
      )
    ) {
      continue;
    }

    seen.add(
      normalizedTerm,
    );

    terms.push(
      normalizedTerm,
    );
  }

  return Object.freeze(
    terms,
  );
}

/* ============================================================================
 * 11. QUERY TERM BUILDING
 * ----------------------------------------------------------------------------
 * V1 deliberately emits UNKNOWN semantic role.
 *
 * Reasons:
 * - no canonical semantic-role producer exists here;
 * - position is not proof of importance;
 * - lexical form is not proof of semantic role;
 * - downstream consumers already support UNKNOWN.
 *
 * Uniform positive weighting keeps every active term usable without inventing
 * a semantic hierarchy.
 * ========================================================================== */

function buildQueryTerms(
  normalizedTerms:
    readonly string[],

  policy:
    SearchQueryAnalysisPolicy,
): readonly SearchQueryTerm[] {
  return Object.freeze(
    normalizedTerms.map(
      (
        normalizedTerm,
      ) =>
        Object.freeze({
          raw_term:
            normalizedTerm,

          normalized_term:
            normalizedTerm,

          term_weight:
            policy.active_term_weight,

          term_role:
            "UNKNOWN",
        } satisfies SearchQueryTerm),
    ),
  );
}

/* ============================================================================
 * 12. LANGUAGE EVIDENCE
 * ----------------------------------------------------------------------------
 * requested_language is NOT relabelled as detected_language.
 *
 * SearchQuery.requested_language expresses caller/request truth.
 *
 * SearchQueryProfile.detected_language represents detection evidence.
 *
 * No canonical language detector exists in this producer.
 * ========================================================================== */

function buildUnavailableLanguageEvidence():
  SearchOptionalEvidence<SearchLanguageCode> {
  return Object.freeze({
    availability_state:
      "UNAVAILABLE",

    reason:
      "QUERY_LANGUAGE_DETECTION_NOT_GOVERNED",
  });
}

/* ============================================================================
 * 13. QUERY INTENT
 * ----------------------------------------------------------------------------
 * Intent inference is intentionally absent.
 *
 * No lexical shortcut is authorized without an explicit governed producer.
 * ========================================================================== */

function resolveQueryIntent():
  SearchQueryProfile["query_intent"] {
  return "UNKNOWN";
}

/* ============================================================================
 * 14. EXCLUDED TERMS
 * ----------------------------------------------------------------------------
 * No hidden stop-word or exclusion policy exists in V1.
 *
 * Therefore no term becomes EXCLUDED.
 * ========================================================================== */

function buildExcludedTerms():
  readonly string[] {
  return Object.freeze([]);
}

/* ============================================================================
 * 15. OUTPUT VALIDATION
 * ----------------------------------------------------------------------------
 * The producer validates the truth it owns before crossing the next boundary.
 *
 * VALID / DEGRADED SearchQueryProfile requires:
 * - canonical identity
 * - canonical timestamp
 * - normalized query
 * - at least one query term
 * - at least one active positively weighted term
 * - coherent validation metadata
 *
 * Validation detects divergence.
 * It does not repair output.
 * ========================================================================== */

export function validateSearchQueryProfileOutput(
  profile:
    SearchQueryProfile,
): SearchQueryAnalysisValidationResult {
  const rejectionReasons =
    new Set<string>();

  if (
    !isNonEmptyString(
      profile.contract_version,
    )
  ) {
    rejectionReasons.add(
      "PROFILE_CONTRACT_VERSION_EMPTY",
    );
  }

  if (
    !isNonEmptyString(
      profile.query_id,
    )
  ) {
    rejectionReasons.add(
      "PROFILE_QUERY_ID_EMPTY",
    );
  }

  if (
    !isValidIsoTimestamp(
      profile.created_at,
    )
  ) {
    rejectionReasons.add(
      "PROFILE_CREATED_AT_INVALID",
    );
  }

  if (
    profile.validation_state ===
    "REJECTED"
  ) {
    rejectionReasons.add(
      "PROFILE_REJECTED",
    );
  }

  if (
    profile.validation_state ===
    "UNVALIDATED"
  ) {
    rejectionReasons.add(
      "PROFILE_UNVALIDATED",
    );
  }

  if (
    !isNonEmptyString(
      profile.normalized_query,
    )
  ) {
    rejectionReasons.add(
      "NORMALIZED_QUERY_EMPTY",
    );
  }

  if (
    profile.query_terms.length ===
    0
  ) {
    rejectionReasons.add(
      "QUERY_TERMS_EMPTY",
    );
  }

  const seenNormalizedTerms =
    new Set<string>();

  let activeTermCount =
    0;

  for (
    const queryTerm of
    profile.query_terms
  ) {
    if (
      !isNonEmptyString(
        queryTerm.raw_term,
      )
    ) {
      rejectionReasons.add(
        "QUERY_TERM_RAW_TERM_EMPTY",
      );
    }

    if (
      !isNonEmptyString(
        queryTerm.normalized_term,
      )
    ) {
      rejectionReasons.add(
        "QUERY_TERM_NORMALIZED_TERM_EMPTY",
      );

      continue;
    }

    if (
      seenNormalizedTerms.has(
        queryTerm.normalized_term,
      )
    ) {
      rejectionReasons.add(
        "QUERY_TERM_NORMALIZED_TERM_DUPLICATE",
      );
    }

    seenNormalizedTerms.add(
      queryTerm.normalized_term,
    );

    if (
      !Number.isFinite(
        queryTerm.term_weight,
      ) ||
      queryTerm.term_weight <
        0
    ) {
      rejectionReasons.add(
        "QUERY_TERM_WEIGHT_INVALID",
      );

      continue;
    }

    if (
      queryTerm.term_role !==
      "EXCLUDED"
    ) {
      if (
        queryTerm.term_weight <=
        0
      ) {
        rejectionReasons.add(
          "ACTIVE_QUERY_TERM_WEIGHT_NOT_POSITIVE",
        );

        continue;
      }

      activeTermCount +=
        1;
    }
  }

  if (
    activeTermCount ===
    0
  ) {
    rejectionReasons.add(
      "NO_ACTIVE_WEIGHTED_QUERY_TERMS",
    );
  }

  if (
    !isNonEmptyString(
      profile.normalization_method,
    )
  ) {
    rejectionReasons.add(
      "NORMALIZATION_METHOD_EMPTY",
    );
  }

  if (
    !isNonEmptyString(
      profile.profiling_method,
    )
  ) {
    rejectionReasons.add(
      "PROFILING_METHOD_EMPTY",
    );
  }

  if (
    !isNonEmptyString(
      profile.query_normalizer_version,
    )
  ) {
    rejectionReasons.add(
      "QUERY_NORMALIZER_VERSION_EMPTY",
    );
  }

  if (
    !isNonEmptyString(
      profile.query_profiler_version,
    )
  ) {
    rejectionReasons.add(
      "QUERY_PROFILER_VERSION_EMPTY",
    );
  }

  if (
    profile.validation_state ===
      "VALID" &&
    profile.degradation_reasons.length >
      0
  ) {
    rejectionReasons.add(
      "VALID_PROFILE_HAS_DEGRADATION_REASONS",
    );
  }

  if (
    profile.validation_state ===
      "DEGRADED" &&
    profile.degradation_reasons.length ===
      0
  ) {
    rejectionReasons.add(
      "DEGRADED_PROFILE_HAS_NO_DEGRADATION_REASON",
    );
  }

  return Object.freeze({
    validation_state:
      rejectionReasons.size >
      0
        ? "REJECTED"
        : profile.validation_state,

    rejection_reasons:
      Object.freeze([
        ...rejectionReasons,
      ]),
  });
}

/* ============================================================================
 * 16. REJECTED PROFILE
 * ----------------------------------------------------------------------------
 * Rejection remains explicit.
 *
 * No synthetic term or neutral analytical truth is created to make an invalid
 * query appear usable.
 * ========================================================================== */

function buildRejectedSearchQueryProfile(
  input:
    SearchQueryAnalysisInput,

  rejectionReasons:
    readonly string[],
): SearchQueryProfile {
  const query =
    input.query;

  return Object.freeze({
    contract_version:
      XYVALA_SEARCH_QUERY_PROFILE_CONTRACT_VERSION,

    created_at:
      query.created_at,

    query_id:
      query.query_id,

    normalized_query:
      "",

    detected_language:
      buildUnavailableLanguageEvidence(),

    query_terms:
      Object.freeze([]),

    excluded_terms:
      Object.freeze([]),

    query_intent:
      "UNKNOWN",

    normalization_method:
      XYVALA_SEARCH_QUERY_NORMALIZATION_METHOD,

    profiling_method:
      XYVALA_SEARCH_QUERY_PROFILING_METHOD,

    query_normalizer_version:
      XYVALA_SEARCH_QUERY_NORMALIZER_VERSION,

    query_profiler_version:
      XYVALA_SEARCH_QUERY_PROFILER_VERSION,

    validation_state:
      "REJECTED",

    degradation_reasons:
      Object.freeze([
        ...rejectionReasons,
      ]),
  });
}

/* ============================================================================
 * 17. OUTPUT STATE RESOLUTION
 * ----------------------------------------------------------------------------
 * Only authorized VALID / DEGRADED source truth reaches this function.
 *
 * REJECTED / UNVALIDATED are stopped by the input boundary.
 *
 * No state is repaired.
 * ========================================================================== */

function resolveOutputValidationState(
  sourceState:
    SearchValidationState,
): SearchValidationState {
  switch (
    sourceState
  ) {
    case "VALID":
      return "VALID";

    case "DEGRADED":
      return "DEGRADED";

    case "REJECTED":
    case "UNVALIDATED":
      throw new Error(
        `[${XYVALA_SEARCH_QUERY_ANALYSIS_MODULE_NAME}] ` +
          `Internal boundary invariant violation: ${sourceState} source state reached accepted profile construction.`,
      );

    default: {
      const unreachable:
        never =
        sourceState;

      throw new Error(
        `[${XYVALA_SEARCH_QUERY_ANALYSIS_MODULE_NAME}] ` +
          `Internal boundary invariant violation: unsupported validation state ${String(unreachable)}.`,
      );
    }
  }
}

/* ============================================================================
 * 18. DEGRADATION PROPAGATION
 * ----------------------------------------------------------------------------
 * Upstream DEGRADED state remains explicitly DEGRADED.
 *
 * UNKNOWN query intent and unavailable language evidence are valid modeled
 * states and do not themselves create degradation.
 * ========================================================================== */

function collectDegradationReasons(
  query:
    SearchQuery,
): readonly string[] {
  if (
    query.validation_state !==
    "DEGRADED"
  ) {
    return Object.freeze([]);
  }

  return Object.freeze([
    "UPSTREAM_QUERY_DEGRADED",
  ]);
}

/* ============================================================================
 * 19. CANONICAL QUERY PROFILE PRODUCER
 * ----------------------------------------------------------------------------
 * Pure deterministic QUERY_NORMALIZATION + QUERY_PROFILING boundary.
 *
 * This function:
 * - validates the explicit selected policy
 * - validates SearchQuery
 * - normalizes raw_query
 * - extracts deterministic lexical terms
 * - removes duplicate normalized terms
 * - applies explicit uniform non-semantic weighting
 * - preserves UNKNOWN term roles
 * - preserves UNKNOWN intent
 * - preserves unavailable language evidence
 * - preserves query_id
 * - preserves created_at
 * - validates its own output
 *
 * It performs no:
 * - policy selection
 * - DEFAULT_* fallback
 * - document analysis
 * - relevance scoring
 * - corpus analysis
 * - semantic role inference
 * - language guessing
 * - intent guessing
 * - stop-word exclusion
 * - ranking
 * - decision
 * - calibration mutation
 * - orchestration
 * ========================================================================== */

export function buildSearchQueryProfile(
  input:
    SearchQueryAnalysisInput,
): SearchQueryProfile {
  /*
   * Explicit policy only.
   *
   * The caller must resolve the selected policy before entering this canonical
   * producer.
   */
  const policy =
    input.policy;

  validatePolicy(
    policy,
  );

  const boundaryValidation =
    validateSearchQueryAnalysisInput(
      input,
    );

  if (
    boundaryValidation
      .validation_state ===
    "REJECTED"
  ) {
    return buildRejectedSearchQueryProfile(
      input,
      boundaryValidation
        .rejection_reasons,
    );
  }

  const normalizedQuery =
    normalizeSearchQueryText(
      input.query.raw_query,
    );

  if (
    normalizedQuery.length ===
    0
  ) {
    return buildRejectedSearchQueryProfile(
      input,
      Object.freeze([
        "NORMALIZED_QUERY_EMPTY",
      ]),
    );
  }

  const allNormalizedTerms =
    extractNormalizedTerms(
      normalizedQuery,
    );

  if (
    allNormalizedTerms.length ===
    0
  ) {
    return buildRejectedSearchQueryProfile(
      input,
      Object.freeze([
        "NO_USABLE_QUERY_TERMS",
      ]),
    );
  }

  if (
    allNormalizedTerms.length >
    policy.maximum_query_term_count
  ) {
    return buildRejectedSearchQueryProfile(
      input,
      Object.freeze([
        "QUERY_TERM_COUNT_EXCEEDS_POLICY_BOUNDARY",
      ]),
    );
  }

  const queryTerms =
    buildQueryTerms(
      allNormalizedTerms,
      policy,
    );

  const profile:
    SearchQueryProfile =
    Object.freeze({
      contract_version:
        XYVALA_SEARCH_QUERY_PROFILE_CONTRACT_VERSION,

      created_at:
        input.query.created_at,

      query_id:
        input.query.query_id,

      normalized_query:
        normalizedQuery,

      detected_language:
        buildUnavailableLanguageEvidence(),

      query_terms:
        queryTerms,

      excluded_terms:
        buildExcludedTerms(),

      query_intent:
        resolveQueryIntent(),

      normalization_method:
        XYVALA_SEARCH_QUERY_NORMALIZATION_METHOD,

      profiling_method:
        XYVALA_SEARCH_QUERY_PROFILING_METHOD,

      query_normalizer_version:
        XYVALA_SEARCH_QUERY_NORMALIZER_VERSION,

      query_profiler_version:
        XYVALA_SEARCH_QUERY_PROFILER_VERSION,

      validation_state:
        resolveOutputValidationState(
          input.query
            .validation_state,
        ),

      degradation_reasons:
        collectDegradationReasons(
          input.query,
        ),
    });

  const outputValidation =
    validateSearchQueryProfileOutput(
      profile,
    );

  if (
    outputValidation
      .validation_state ===
    "REJECTED"
  ) {
    return buildRejectedSearchQueryProfile(
      input,
      outputValidation
        .rejection_reasons,
    );
  }

  return profile;
}

/* ============================================================================
 * 20. ACCEPTANCE HELPER
 * ----------------------------------------------------------------------------
 * Convenience predicate only.
 *
 * It observes SearchQueryProfile truth.
 *
 * It creates no analytical truth and performs no repair.
 * ========================================================================== */

export function isSearchQueryProfileAccepted(
  profile:
    SearchQueryProfile,
): boolean {
  if (
    profile.validation_state !==
      "VALID" &&
    profile.validation_state !==
      "DEGRADED"
  ) {
    return false;
  }

  if (
    profile.normalized_query
      .trim()
      .length ===
    0
  ) {
    return false;
  }

  if (
    profile.query_terms.length ===
    0
  ) {
    return false;
  }

  return profile.query_terms.some(
    (
      queryTerm,
    ) =>
      queryTerm.term_role !==
        "EXCLUDED" &&
      Number.isFinite(
        queryTerm.term_weight,
      ) &&
      queryTerm.term_weight >
        0,
  );
}

/* ============================================================================
 * 21. STATIC OWNERSHIP DECLARATION
 * ----------------------------------------------------------------------------
 * Architecture / audit metadata only.
 *
 * It creates no query truth and selects no policy.
 * ========================================================================== */

export const XYVALA_SEARCH_QUERY_ANALYSIS_OWNERSHIP =
  Object.freeze({
    runtime_port:
      "analyze_query",

    canonical_output:
      "SearchQueryProfile",

    canonical_input:
      "SearchQuery",

    normalization_owner:
      "QUERY_NORMALIZATION",

    profiling_owner:
      "QUERY_PROFILING",

    policy_identity:
      "SearchQueryAnalysisPolicy",

    policy_selection_owner:
      "EXTERNAL_AUTHORIZED_POLICY_GOVERNANCE",

    policy_fallback_allowed:
      false,

    language_detection_owner:
      "NOT_IMPLEMENTED_IN_THIS_PRODUCER",

    intent_inference_owner:
      "NOT_IMPLEMENTED_IN_THIS_PRODUCER",

    semantic_role_inference_owner:
      "NOT_IMPLEMENTED_IN_THIS_PRODUCER",

    document_access_allowed:
      false,

    analytical_scoring_allowed:
      false,

    public_ranking_allowed:
      false,

    runtime_clock_access_allowed:
      false,

    random_identity_generation_allowed:
      false,

    runtime_mutation_allowed:
      false,
  } as const);
