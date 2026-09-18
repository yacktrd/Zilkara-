/* ============================================================================
 * FILE: lib/xyvala/search/ranking/search-public-ranking-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical public ranking core
 *
 * ROLE
 * - consume public-safe SearchPublicResultCandidate contracts only
 * - validate canonical Transformation contract identity
 * - validate public candidate identity and query consistency
 * - validate transformed public-safe contract integrity
 * - preserve canonical transformation lineage
 * - preserve canonical publication evidence
 * - apply one explicit deterministic public ranking policy
 * - order public candidates using authorized public ranking domains only
 * - assign the canonical public_position
 * - produce canonical SearchPublicSearchResult contracts
 * - assemble the canonical SearchPublicRankingProjection
 *
 * CLASSIFICATION
 * - PUBLIC RANKING ENGINE
 * - SEARCH DOMAIN
 * - PUBLIC_RANKING
 * - READ / VALIDATE / ORDER / PROJECT
 * - PURE
 * - DETERMINISTIC
 * - NON-ANALYTICAL
 * - NON-SCORING
 * - NON-CALIBRATING
 * - NON-MUTATING
 * - PUBLIC-SAFE
 *
 * POSITION IN OFFICIAL LIVE CHAIN
 * ----------------------------------------------------------------------------
 *
 * ACQUISITION
 * -> EXTRACTION
 * -> SEGMENTATION
 * -> LEXICAL_ANALYSIS
 * -> FREQUENCY_SIGNAL_DETECTION
 * -> ANCHOR_SIGNAL_DETECTION
 * -> CONTEXT_AGGREGATION
 * -> LINK_SIGNAL_DETECTION
 * -> TEMPORAL_SIGNAL_DETECTION
 * -> BEHAVIORAL_SIGNAL_DETECTION
 * -> QUERY_NORMALIZATION
 * -> QUERY_PROFILING
 * -> QUERY_DOCUMENT_SIGNAL_DETECTION
 * -> INTRINSIC_DOCUMENT_SCORING
 * -> TEMPORAL_DOCUMENT_SCORING
 * -> QUERY_RELEVANCE_SCORING
 * -> LINK_AUTHORITY_SCORING
 * -> BEHAVIORAL_CALIBRATION_SCORING
 * -> POSITIVE_SCORE_ASSEMBLY
 * -> PENALTY_EVALUATION
 * -> ANALYTICAL_AGGREGATION
 * -> ELIGIBILITY_EVALUATION
 * -> SEARCH_COHORT_BATCH
 * -> COHORT_NORMALIZATION
 * -> RELATIVE_COHORT_EVALUATION
 * -> PRIVATE_DECISION
 * -> PRIVATE_SNAPSHOT
 * -> TRANSFORMATION
 * -> PUBLIC_RANKING
 * -> API
 * -> INTERFACE
 *
 * CALIBRATION GOVERNANCE
 * ----------------------------------------------------------------------------
 * Calibration is outside the current live Search execution cycle.
 *
 * PUBLIC_RANKING consumes an already-authorized explicit ranking policy.
 *
 * It never:
 * - executes calibration;
 * - modifies ranking policy during the current execution;
 * - derives ranking policy from current-query analytical truth.
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchPublicResultCandidate
 * - SearchPublicSearchResult
 * - SearchPublicRankingProjection
 * - SearchPublicRankingPolicy
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 * - Public Exposure Governance System
 * - Ranking Governance System
 *
 * PRODUCER INPUT
 * - lib/xyvala/search/transformers/search-public-result-transformer.ts
 *
 * CONSUMERS
 * - Xyvala Search public API orchestration
 * - Xyvala Search public API
 * - Xyvala Search interface
 * - public ranking tests
 * - public/private boundary audits
 * - propagation audits
 *
 * OWNERSHIP
 * ----------------------------------------------------------------------------
 * title
 * <- TRANSFORMATION
 *
 * source
 * <- TRANSFORMATION
 *
 * published_at
 * <- TRANSFORMATION projection
 * <- TEMPORAL_SIGNAL_DETECTION truth
 * <- ACQUISITION source publication lineage
 *
 * excerpts
 * <- TRANSFORMATION
 *
 * matched_terms
 * <- TRANSFORMATION transport
 * <- QUERY_DOCUMENT_SIGNAL_DETECTION truth
 *
 * relevance_label
 * <- TRANSFORMATION
 *
 * evidence_labels
 * <- TRANSFORMATION
 *
 * language
 * <- TRANSFORMATION
 *
 * availability_state
 * <- TRANSFORMATION
 *
 * public_position
 * <- PUBLIC_RANKING
 *
 * SearchPublicSearchResult
 * <- PUBLIC_RANKING
 *
 * SearchPublicRankingProjection
 * <- PUBLIC_RANKING
 *
 * RANKING GOVERNANCE
 * ----------------------------------------------------------------------------
 * Ranking uses only the explicitly governed public dimensions:
 *
 * 1. availability_priority
 * 2. relevance_priority
 * 3. evidence_priority
 *
 * After those public ranking dimensions are exhausted:
 *
 * document_id
 *
 * is used exclusively as a deterministic final identity tie-break.
 *
 * Ranking MUST NOT silently introduce additional criteria such as:
 * - number of evidence labels;
 * - title lexical order;
 * - source URI lexical order;
 * - snapshot identifier;
 * - publication timestamp;
 * - private score;
 * - private percentile;
 * - private relative position;
 * - input-array position.
 *
 * PUBLICATION GOVERNANCE
 * ----------------------------------------------------------------------------
 * SearchPublicResultSource.published_at is canonical transformed public
 * publication evidence.
 *
 * PUBLIC_RANKING:
 * - validates the evidence envelope;
 * - preserves it unchanged;
 * - never substitutes fetched_at;
 * - never calculates publication age;
 * - never uses publication time as an implicit ranking criterion.
 *
 * MATCHED TERM GOVERNANCE
 * ----------------------------------------------------------------------------
 * matched_terms are already-transformed canonical evidence.
 *
 * PUBLIC_RANKING validates only that transported terms are structurally valid.
 *
 * It MUST NOT:
 * - trim them;
 * - deduplicate them;
 * - sort them;
 * - normalize them;
 * - reject them merely because the upstream canonical truth contains repeated
 *   values, unless the canonical contract itself explicitly forbids repetition.
 *
 * DIRECTIVES
 * - public ranking only
 * - consume SearchPublicResultCandidate only
 * - consume PUBLIC contracts only
 * - exact Transformation contract version
 * - consume transformed public-safe truth only
 * - preserve transformed public fields without reinterpretation
 * - explicit public ranking policy only
 * - deterministic ordering only
 * - no undeclared ranking criterion
 * - public_position ownership belongs exclusively here
 * - contract version and policy version remain distinct identities
 * - ranking policy never becomes contract version
 * - no private snapshot access
 * - no SearchPrivateDocumentSnapshot dependency
 * - no SearchGlobalScore dependency
 * - no SearchRelativeEvaluationContext dependency
 * - no SearchPrivateDecision dependency
 * - no SearchPenaltyVector dependency
 * - no SearchCohortDistribution dependency
 * - no SearchEligibilityResult dependency
 * - no raw analytical score access
 * - no final_raw_score access
 * - no normalized private score access
 * - no percentile access
 * - no private relative_position access
 * - no private decision access
 * - no BLOCK / WATCH / ALLOW access
 * - no behavioral signal access
 * - no calibration execution
 * - no private threshold access
 * - no public-label reconstruction
 * - no excerpt reconstruction
 * - no matched-term normalization
 * - no source reconstruction
 * - no publication reconstruction
 * - no language reconstruction
 * - no availability reconstruction
 * - no document analysis
 * - no score computation
 * - no hidden ranking score
 * - no hidden ranking threshold
 * - no hidden ranking dimension
 * - no implicit priority fallback
 * - no silent duplicate elimination
 * - no persistence
 * - no logging
 * - no event publication
 * - no local clock access
 * - no random tie-breaker
 *
 * INVARIANTS
 * - all candidates belong to exactly one query
 * - all candidates are PUBLIC
 * - all candidates use the canonical SearchPublicResultCandidate contract
 * - candidates are unranked on entry
 * - one document may appear at most once per ranking execution
 * - one snapshot reference may identify at most one ranked document
 * - transformed labels are never recalculated
 * - transformed excerpts are never recalculated
 * - matched terms are never normalized or reconstructed
 * - transformed source metadata is never recalculated
 * - transformed published_at evidence is never recalculated
 * - transformed language evidence is never recalculated
 * - transformed availability is never recalculated
 * - empty evidence-label collections are rejected
 * - duplicate evidence labels are rejected
 * - malformed excerpt identity is rejected
 * - private relative_position never becomes public_position
 * - public_position starts at 1
 * - public_position is contiguous
 * - public_position is unique within the projection
 * - public ranking policy is explicit
 * - every priority domain is explicit and exhaustive
 * - no missing policy priority receives an implicit fallback
 * - no undeclared presentation field participates in ranking
 * - tie resolution is deterministic
 * - document identity is used only as deterministic final tie-break
 * - candidate input-array order never determines final tie resolution
 * - result limiting occurs only after deterministic ordering
 * - contract version never derives from policy version
 * - no private analytical truth crosses this layer
 * - no input contract is mutated
 * - no runtime clock is read
 * - no random value is generated
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * non-public candidate
 * => TRANSFORMATION / PUBLIC_RANKING boundary
 *
 * unexpected candidate contract version
 * => TRANSFORMATION / PUBLIC_RANKING contract boundary
 *
 * candidate from another query
 * => ranking input orchestration
 *
 * duplicate document candidate
 * => ranking input orchestration
 *
 * duplicate snapshot reference
 * => transformation / ranking lineage
 *
 * malformed public publication evidence
 * => Temporal -> Snapshot -> Transformation propagation
 *
 * malformed public label
 * => TRANSFORMATION boundary
 *
 * malformed public source
 * => Acquisition -> Snapshot -> Transformation propagation
 *
 * malformed excerpt
 * => Segmentation / Transformation propagation
 *
 * public_position supplied upstream
 * => PUBLIC_RANKING ownership violation
 *
 * evidence-label count used as undeclared priority
 * => ranking-policy governance violation
 *
 * title or source URI used as undeclared ranking criterion
 * => ranking-policy governance violation
 *
 * matched terms normalized/rejected under a locally invented semantic rule
 * => transformation-lineage violation
 *
 * private analytical field required for ranking
 * => ranking architecture violation
 *
 * policy version used as contract version
 * => version-governance violation
 * ========================================================================== */

import type {
  SearchAvailabilityState,
  SearchContractVersion,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchOptionalEvidence,
  SearchPolicyVersion,
  SearchPublicEvidenceLabel,
  SearchPublicRankingProjection,
  SearchPublicRelevanceLabel,
  SearchPublicResultCandidate,
  SearchPublicSearchResult,
  SearchQueryId,
  SearchSourceType,
} from "../contracts/search-pipeline-contract";

import {
  XYVALA_SEARCH_PUBLIC_RESULT_CANDIDATE_CONTRACT_VERSION,
} from "../transformers/search-public-result-transformer";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME =
  "xyvala-search-public-ranking-core" as const;

export const XYVALA_SEARCH_PUBLIC_RANKING_MODULE_VERSION:
  SearchModuleVersion =
    "1.1.0";

export const XYVALA_SEARCH_PUBLIC_SEARCH_RESULT_CONTRACT_VERSION:
  SearchContractVersion =
    "2.0.0";

export const XYVALA_SEARCH_PUBLIC_RANKING_PROJECTION_CONTRACT_VERSION:
  SearchContractVersion =
    "2.0.0";

/* ============================================================================
 * 2. PUBLIC RANKING POLICY
 * ----------------------------------------------------------------------------
 * The ranking policy governs public ordering only.
 *
 * It is NOT:
 * - an analytical scoring policy;
 * - a private decision policy;
 * - a calibration policy;
 * - a cohort-normalization policy;
 * - a contract-version declaration.
 * ========================================================================== */

export interface SearchPublicRankingPolicy {
  readonly policy_version:
    SearchPolicyVersion;

  readonly relevance_priority:
    readonly SearchPublicRelevanceLabel[];

  readonly evidence_priority:
    readonly SearchPublicEvidenceLabel[];

  readonly availability_priority:
    readonly SearchAvailabilityState[];

  readonly maximum_result_count:
    number;
}

/* ============================================================================
 * 3. PUBLIC RANKING INPUT
 * ========================================================================== */

export interface SearchPublicRankingInput {
  readonly query_id:
    SearchQueryId;

  readonly candidates:
    readonly SearchPublicResultCandidate[];

  readonly policy:
    SearchPublicRankingPolicy;

  readonly created_at:
    SearchIsoTimestamp;
}

/* ============================================================================
 * 4. CANONICAL PUBLIC RUNTIME DOMAINS
 * ----------------------------------------------------------------------------
 * Type unions are erased at runtime.
 *
 * These registries exist solely for exact runtime validation.
 *
 * Compile-time guards below ensure that they remain exact representations of
 * their canonical contract unions.
 * ========================================================================== */

const CANONICAL_RELEVANCE_LABELS =
  Object.freeze([
    "HIGH_RELEVANCE",
    "RELEVANT",
    "CONTEXTUAL",
    "LIMITED_RELEVANCE",
    "UNAVAILABLE",
  ] as const satisfies readonly SearchPublicRelevanceLabel[]);

const CANONICAL_EVIDENCE_LABELS =
  Object.freeze([
    "STRONG_DOCUMENT_MATCH",
    "ANCHOR_SUPPORTED",
    "SOURCE_SUPPORTED",
    "LIMITED_EVIDENCE",
    "INSUFFICIENT_DATA",
  ] as const satisfies readonly SearchPublicEvidenceLabel[]);

const CANONICAL_AVAILABILITY_STATES =
  Object.freeze([
    "AVAILABLE",
    "UNAVAILABLE",
    "INSUFFICIENT_DATA",
    "INSUFFICIENT_HISTORY",
    "UNSUPPORTED",
    "INVALID",
  ] as const satisfies readonly SearchAvailabilityState[]);

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
 * Adding/removing a canonical union member must fail compilation until this
 * runtime validation registry is explicitly updated.
 * ========================================================================== */

type DeclaredPublicRelevanceLabel =
  (
    typeof CANONICAL_RELEVANCE_LABELS
  )[number];

type DeclaredPublicEvidenceLabel =
  (
    typeof CANONICAL_EVIDENCE_LABELS
  )[number];

type DeclaredPublicAvailabilityState =
  (
    typeof CANONICAL_AVAILABILITY_STATES
  )[number];

type DeclaredPublicSourceType =
  (
    typeof CANONICAL_SOURCE_TYPES
  )[number];

type SearchPublicRankingRuntimeDomainsAreExact =
  [
    Exclude<
      SearchPublicRelevanceLabel,
      DeclaredPublicRelevanceLabel
    >,
    Exclude<
      DeclaredPublicRelevanceLabel,
      SearchPublicRelevanceLabel
    >,

    Exclude<
      SearchPublicEvidenceLabel,
      DeclaredPublicEvidenceLabel
    >,
    Exclude<
      DeclaredPublicEvidenceLabel,
      SearchPublicEvidenceLabel
    >,

    Exclude<
      SearchAvailabilityState,
      DeclaredPublicAvailabilityState
    >,
    Exclude<
      DeclaredPublicAvailabilityState,
      SearchAvailabilityState
    >,

    Exclude<
      SearchSourceType,
      DeclaredPublicSourceType
    >,
    Exclude<
      DeclaredPublicSourceType,
      SearchSourceType
    >,
  ] extends [
    never,
    never,
    never,
    never,
    never,
    never,
    never,
    never,
  ]
    ? true
    : false;

const XYVALA_SEARCH_PUBLIC_RANKING_RUNTIME_DOMAINS_ARE_EXACT:
  SearchPublicRankingRuntimeDomainsAreExact =
    true;

void XYVALA_SEARCH_PUBLIC_RANKING_RUNTIME_DOMAINS_ARE_EXACT;

/* ============================================================================
 * 6. SAFE PRIMITIVE ASSERTIONS
 * ========================================================================== */

function assertNonEmptyString(
  value:
    unknown,

  fieldName:
    string,
): asserts value is string {
  if (
    typeof value !==
      "string" ||
    value.trim().length ===
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a non-empty string.`,
    );
  }
}

function assertValidIsoTimestamp(
  value:
    SearchIsoTimestamp,

  fieldName:
    string,
): void {
  assertNonEmptyString(
    value,
    fieldName,
  );

  if (
    !Number.isFinite(
      Date.parse(
        value,
      ),
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a valid ISO timestamp.`,
    );
  }
}

function assertPositiveInteger(
  value:
    unknown,

  fieldName:
    string,
): asserts value is number {
  if (
    typeof value !==
      "number" ||
    !Number.isInteger(
      value,
    ) ||
    value <=
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a positive integer.`,
    );
  }
}

/* ============================================================================
 * 7. DETERMINISTIC STRING COMPARATOR
 * ========================================================================== */

function compareStrings(
  left:
    string,

  right:
    string,
): number {
  if (
    left <
    right
  ) {
    return -1;
  }

  if (
    left >
    right
  ) {
    return 1;
  }

  return 0;
}

/* ============================================================================
 * 8. OPTIONAL EVIDENCE VALIDATION
 * ========================================================================== */

function validateOptionalEvidence<T>(
  evidence:
    SearchOptionalEvidence<T>,

  fieldName:
    string,
): void {
  if (
    evidence.availability_state ===
    "AVAILABLE"
  ) {
    return;
  }

  assertNonEmptyString(
    evidence.reason,
    `${fieldName}.reason`,
  );
}

/* ============================================================================
 * 9. OPTIONAL TIMESTAMP EVIDENCE VALIDATION
 * ----------------------------------------------------------------------------
 * Validates canonical transformed publication evidence only.
 *
 * No fallback.
 * No timestamp substitution.
 * No publication-age calculation.
 * ========================================================================== */

function validateOptionalIsoTimestampEvidence(
  evidence:
    SearchOptionalEvidence<SearchIsoTimestamp>,

  fieldName:
    string,
): void {
  if (
    evidence.availability_state ===
    "AVAILABLE"
  ) {
    assertValidIsoTimestamp(
      evidence.value,
      `${fieldName}.value`,
    );

    return;
  }

  assertNonEmptyString(
    evidence.reason,
    `${fieldName}.reason`,
  );
}

/* ============================================================================
 * 10. POLICY DOMAIN VALIDATION
 * ========================================================================== */

function validateExactPriorityDomain<
  T extends string,
>(
  actual:
    readonly T[],

  canonical:
    readonly T[],

  fieldName:
    string,
): void {
  if (
    actual.length !==
    canonical.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
        `Policy violation: ${fieldName} must contain every canonical value exactly once.`,
    );
  }

  const actualSet =
    new Set<T>(
      actual,
    );

  if (
    actualSet.size !==
    actual.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
        `Policy violation: ${fieldName} contains duplicate values.`,
    );
  }

  for (
    const canonicalValue of
    canonical
  ) {
    if (
      !actualSet.has(
        canonicalValue,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
          `Policy violation: ${fieldName} is missing canonical value ${canonicalValue}.`,
      );
    }
  }
}

/* ============================================================================
 * 11. POLICY VALIDATION
 * ========================================================================== */

function validatePolicy(
  policy:
    SearchPublicRankingPolicy,
): void {
  assertNonEmptyString(
    policy.policy_version,
    "policy.policy_version",
  );

  assertPositiveInteger(
    policy.maximum_result_count,
    "policy.maximum_result_count",
  );

  validateExactPriorityDomain(
    policy.relevance_priority,
    CANONICAL_RELEVANCE_LABELS,
    "policy.relevance_priority",
  );

  validateExactPriorityDomain(
    policy.evidence_priority,
    CANONICAL_EVIDENCE_LABELS,
    "policy.evidence_priority",
  );

  validateExactPriorityDomain(
    policy.availability_priority,
    CANONICAL_AVAILABILITY_STATES,
    "policy.availability_priority",
  );
}

/* ============================================================================
 * 12. PRIORITY MAP
 * ----------------------------------------------------------------------------
 * Lower index means stronger explicitly configured public priority.
 * ========================================================================== */

function buildPriorityMap<
  T extends string,
>(
  values:
    readonly T[],
): ReadonlyMap<T, number> {
  const priorityMap =
    new Map<T, number>();

  values.forEach(
    (
      value,
      index,
    ) => {
      priorityMap.set(
        value,
        index,
      );
    },
  );

  return priorityMap;
}

/* ============================================================================
 * 13. PUBLIC SOURCE VALIDATION
 * ----------------------------------------------------------------------------
 * Public source truth belongs to TRANSFORMATION.
 *
 * PUBLIC_RANKING validates transport integrity only.
 * ========================================================================== */

function validateCandidateSource(
  candidate:
    SearchPublicResultCandidate,
): void {
  assertNonEmptyString(
    candidate.source.source_uri,
    "candidate.source.source_uri",
  );

  assertValidIsoTimestamp(
    candidate.source.fetched_at,
    "candidate.source.fetched_at",
  );

  validateOptionalIsoTimestampEvidence(
    candidate.source.published_at,
    "candidate.source.published_at",
  );

  if (
    !CANONICAL_SOURCE_TYPES.includes(
      candidate.source.source_type,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
        `Boundary violation: document ${candidate.document_id} exposes unsupported public source_type ${candidate.source.source_type}.`,
    );
  }

  if (
    candidate.source.source_domain !==
    undefined
  ) {
    assertNonEmptyString(
      candidate.source.source_domain,
      "candidate.source.source_domain",
    );
  }
}

/* ============================================================================
 * 14. PUBLIC EXCERPT VALIDATION
 * ----------------------------------------------------------------------------
 * Excerpts and matched terms are transformed public truth.
 *
 * PUBLIC_RANKING validates them but does not normalize or reinterpret them.
 * ========================================================================== */

function validateCandidateExcerpts(
  candidate:
    SearchPublicResultCandidate,
): void {
  const sentenceIds =
    new Set<string>();

  for (
    const [
      index,
      excerpt,
    ] of candidate.excerpts.entries()
  ) {
    assertNonEmptyString(
      excerpt.sentence_id,
      `candidate.excerpts[${String(index)}].sentence_id`,
    );

    assertNonEmptyString(
      excerpt.excerpt,
      `candidate.excerpts[${String(index)}].excerpt`,
    );

    if (
      sentenceIds.has(
        excerpt.sentence_id,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
          `Boundary violation: document ${candidate.document_id} contains duplicate public excerpt sentence ${excerpt.sentence_id}.`,
      );
    }

    sentenceIds.add(
      excerpt.sentence_id,
    );

    /*
     * Exact transformed term transport validation.
     *
     * No Set.
     * No deduplication.
     * No sorting.
     * No trimming.
     */
    for (
      const [
        termIndex,
        matchedTerm,
      ] of excerpt.matched_terms.entries()
    ) {
      assertNonEmptyString(
        matchedTerm,
        `candidate.excerpts[${String(index)}].matched_terms[${String(termIndex)}]`,
      );
    }
  }
}

/* ============================================================================
 * 15. PUBLIC EVIDENCE LABEL VALIDATION
 * ========================================================================== */

function validateCandidateEvidenceLabels(
  candidate:
    SearchPublicResultCandidate,
): void {
  if (
    candidate.evidence_labels.length ===
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
        `Boundary violation: document ${candidate.document_id} has no public evidence label.`,
    );
  }

  const uniqueLabels =
    new Set<SearchPublicEvidenceLabel>();

  for (
    const label of
    candidate.evidence_labels
  ) {
    if (
      !CANONICAL_EVIDENCE_LABELS.includes(
        label,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
          `Boundary violation: document ${candidate.document_id} exposes invalid evidence label ${label}.`,
      );
    }

    if (
      uniqueLabels.has(
        label,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
          `Boundary violation: document ${candidate.document_id} contains duplicate public evidence label ${label}.`,
      );
    }

    uniqueLabels.add(
      label,
    );
  }
}

/* ============================================================================
 * 16. CANDIDATE CONTRACT VALIDATION
 * ----------------------------------------------------------------------------
 * PUBLIC_RANKING consumes exactly the canonical Transformation contract.
 *
 * It also rejects public_position on input because that truth is owned here.
 * ========================================================================== */

function validateCandidate(
  candidate:
    SearchPublicResultCandidate,

  queryId:
    SearchQueryId,
): void {
  assertNonEmptyString(
    candidate.contract_version,
    "candidate.contract_version",
  );

  if (
    candidate.contract_version !==
    XYVALA_SEARCH_PUBLIC_RESULT_CANDIDATE_CONTRACT_VERSION
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
        `Contract boundary violation: document ${candidate.document_id} uses SearchPublicResultCandidate contract version ${candidate.contract_version}, expected ${XYVALA_SEARCH_PUBLIC_RESULT_CANDIDATE_CONTRACT_VERSION}.`,
    );
  }

  assertValidIsoTimestamp(
    candidate.created_at,
    "candidate.created_at",
  );

  assertNonEmptyString(
    candidate.document_id,
    "candidate.document_id",
  );

  assertNonEmptyString(
    candidate.query_id,
    "candidate.query_id",
  );

  assertNonEmptyString(
    candidate.title,
    "candidate.title",
  );

  assertNonEmptyString(
    candidate.snapshot_reference,
    "candidate.snapshot_reference",
  );

  assertNonEmptyString(
    candidate
      .public_transformation_policy_version,
    "candidate.public_transformation_policy_version",
  );

  assertNonEmptyString(
    candidate.transformer_version,
    "candidate.transformer_version",
  );

  if (
    candidate.visibility !==
    "PUBLIC"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
        "Boundary violation: Public Ranking accepts PUBLIC candidates only.",
    );
  }

  /*
   * PUBLIC_RANKING is the sole owner of public_position.
   *
   * Runtime JavaScript objects may contain undeclared fields even when the
   * TypeScript contract does not, therefore this ownership boundary is checked
   * explicitly.
   */
  if (
    Object.prototype.hasOwnProperty.call(
      candidate,
      "public_position",
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
        `Ownership violation: document ${candidate.document_id} already exposes public_position before PUBLIC_RANKING.`,
    );
  }

  if (
    candidate.query_id !==
    queryId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
        `Query boundary violation: document ${candidate.document_id} belongs to another query.`,
    );
  }

  if (
    !CANONICAL_RELEVANCE_LABELS.includes(
      candidate.relevance_label,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
        `Boundary violation: document ${candidate.document_id} exposes invalid relevance label ${candidate.relevance_label}.`,
    );
  }

  if (
    !CANONICAL_AVAILABILITY_STATES.includes(
      candidate.availability_state,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
        `Boundary violation: document ${candidate.document_id} exposes invalid availability state ${candidate.availability_state}.`,
    );
  }

  validateOptionalEvidence(
    candidate.language,
    "candidate.language",
  );

  if (
    candidate.language
      .availability_state ===
      "AVAILABLE"
  ) {
    assertNonEmptyString(
      candidate.language.value,
      "candidate.language.value",
    );
  }

  validateCandidateSource(
    candidate,
  );

  validateCandidateExcerpts(
    candidate,
  );

  validateCandidateEvidenceLabels(
    candidate,
  );
}

/* ============================================================================
 * 17. BATCH VALIDATION
 * ----------------------------------------------------------------------------
 * Nothing is silently deduplicated.
 * ========================================================================== */

function validateCandidates(
  candidates:
    readonly SearchPublicResultCandidate[],

  queryId:
    SearchQueryId,
): void {
  const documentIds =
    new Set<string>();

  const snapshotReferences =
    new Set<string>();

  for (
    const candidate of
    candidates
  ) {
    validateCandidate(
      candidate,
      queryId,
    );

    if (
      documentIds.has(
        candidate.document_id,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
          `Boundary violation: duplicate public candidate for document ${candidate.document_id}.`,
      );
    }

    documentIds.add(
      candidate.document_id,
    );

    if (
      snapshotReferences.has(
        candidate.snapshot_reference,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
          `Boundary violation: duplicate public snapshot reference ${candidate.snapshot_reference}.`,
      );
    }

    snapshotReferences.add(
      candidate.snapshot_reference,
    );
  }
}

/* ============================================================================
 * 18. EVIDENCE PRIORITY RESOLUTION
 * ----------------------------------------------------------------------------
 * The strongest configured PUBLIC evidence label is used.
 *
 * No analytical evidence score is calculated.
 * ========================================================================== */

function resolveBestEvidencePriority(
  candidate:
    SearchPublicResultCandidate,

  priorityMap:
    ReadonlyMap<
      SearchPublicEvidenceLabel,
      number
    >,
): number {
  const firstLabel =
    candidate.evidence_labels[
      0
    ];

  if (
    firstLabel ===
    undefined
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
        "Internal invariant violation: validated candidate has no evidence labels.",
    );
  }

  const firstPriority =
    priorityMap.get(
      firstLabel,
    );

  if (
    firstPriority ===
    undefined
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
        `Policy violation: no evidence priority exists for ${firstLabel}.`,
    );
  }

  let bestPriority =
    firstPriority;

  for (
    const label of
    candidate.evidence_labels.slice(
      1,
    )
  ) {
    const priority =
      priorityMap.get(
        label,
      );

    if (
      priority ===
      undefined
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
          `Policy violation: no evidence priority exists for ${label}.`,
      );
    }

    if (
      priority <
      bestPriority
    ) {
      bestPriority =
        priority;
    }
  }

  return bestPriority;
}

/* ============================================================================
 * 19. CANDIDATE COMPARATOR
 * ----------------------------------------------------------------------------
 * CANONICAL PUBLIC ORDER
 *
 * 1. explicitly configured public availability priority
 * 2. explicitly configured public relevance priority
 * 3. explicitly configured strongest public evidence priority
 * 4. canonical document_id as deterministic identity tie-break
 *
 * No other transformed field influences ordering.
 *
 * In particular:
 * - evidence-label count is NOT a ranking criterion;
 * - title is NOT a ranking criterion;
 * - source URI is NOT a ranking criterion;
 * - publication timestamp is NOT a ranking criterion;
 * - snapshot_reference is NOT a ranking criterion.
 * ========================================================================== */

function createCandidateComparator(
  policy:
    SearchPublicRankingPolicy,
): (
  left:
    SearchPublicResultCandidate,

  right:
    SearchPublicResultCandidate,
) => number {
  const availabilityPriority =
    buildPriorityMap(
      policy.availability_priority,
    );

  const relevancePriority =
    buildPriorityMap(
      policy.relevance_priority,
    );

  const evidencePriority =
    buildPriorityMap(
      policy.evidence_priority,
    );

  return (
    left,
    right,
  ): number => {
    /* ------------------------------------------------------------------------
     * 1. AVAILABILITY
     * --------------------------------------------------------------------- */

    const leftAvailabilityPriority =
      availabilityPriority.get(
        left.availability_state,
      );

    const rightAvailabilityPriority =
      availabilityPriority.get(
        right.availability_state,
      );

    if (
      leftAvailabilityPriority ===
        undefined ||
      rightAvailabilityPriority ===
        undefined
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
          "Policy violation: candidate availability has no configured public priority.",
      );
    }

    if (
      leftAvailabilityPriority !==
      rightAvailabilityPriority
    ) {
      return (
        leftAvailabilityPriority -
        rightAvailabilityPriority
      );
    }

    /* ------------------------------------------------------------------------
     * 2. RELEVANCE
     * --------------------------------------------------------------------- */

    const leftRelevancePriority =
      relevancePriority.get(
        left.relevance_label,
      );

    const rightRelevancePriority =
      relevancePriority.get(
        right.relevance_label,
      );

    if (
      leftRelevancePriority ===
        undefined ||
      rightRelevancePriority ===
        undefined
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_PUBLIC_RANKING_MODULE_NAME}] ` +
          "Policy violation: candidate relevance has no configured public priority.",
      );
    }

    if (
      leftRelevancePriority !==
      rightRelevancePriority
    ) {
      return (
        leftRelevancePriority -
        rightRelevancePriority
      );
    }

    /* ------------------------------------------------------------------------
     * 3. STRONGEST EXPLICIT PUBLIC EVIDENCE
     * --------------------------------------------------------------------- */

    const leftEvidencePriority =
      resolveBestEvidencePriority(
        left,
        evidencePriority,
      );

    const rightEvidencePriority =
      resolveBestEvidencePriority(
        right,
        evidencePriority,
      );

    if (
      leftEvidencePriority !==
      rightEvidencePriority
    ) {
      return (
        leftEvidencePriority -
        rightEvidencePriority
      );
    }

    /* ------------------------------------------------------------------------
     * 4. CANONICAL IDENTITY TIE-BREAK
     *
     * document_id is already required to be unique within the execution.
     *
     * Therefore valid distinct candidates cannot remain tied after this step,
     * and input-array order can never decide final ranking.
     * --------------------------------------------------------------------- */

    return compareStrings(
      left.document_id,
      right.document_id,
    );
  };
}

/* ============================================================================
 * 20. RANKED RESULT PROJECTION
 * ----------------------------------------------------------------------------
 * Every transformed public field is transported unchanged.
 *
 * PUBLIC_RANKING creates only its legitimate downstream truth:
 * - SearchPublicSearchResult contract;
 * - public_position;
 * - ranking policy lineage;
 * - ranking module lineage.
 * ========================================================================== */

function buildRankedResult(
  candidate:
    SearchPublicResultCandidate,

  publicPosition:
    number,

  policy:
    SearchPublicRankingPolicy,

  createdAt:
    SearchIsoTimestamp,
): SearchPublicSearchResult {
  assertPositiveInteger(
    publicPosition,
    "public_position",
  );

  const result = {
    contract_version:
      XYVALA_SEARCH_PUBLIC_SEARCH_RESULT_CONTRACT_VERSION,

    created_at:
      createdAt,

    document_id:
      candidate.document_id,

    query_id:
      candidate.query_id,

    public_position:
      publicPosition,

    title:
      candidate.title,

    source:
      candidate.source,

    excerpts:
      candidate.excerpts,

    relevance_label:
      candidate.relevance_label,

    evidence_labels:
      candidate.evidence_labels,

    language:
      candidate.language,

    availability_state:
      candidate.availability_state,

    snapshot_reference:
      candidate.snapshot_reference,

    public_transformation_policy_version:
      candidate
        .public_transformation_policy_version,

    transformer_version:
      candidate.transformer_version,

    public_ranking_policy_version:
      policy.policy_version,

    ranking_module_version:
      XYVALA_SEARCH_PUBLIC_RANKING_MODULE_VERSION,

    visibility:
      "PUBLIC",
  } satisfies SearchPublicSearchResult;

  return Object.freeze(
    result,
  );
}

/* ============================================================================
 * 21. INPUT VALIDATION
 * ========================================================================== */

function validateInput(
  input:
    SearchPublicRankingInput,
): void {
  assertNonEmptyString(
    input.query_id,
    "query_id",
  );

  assertValidIsoTimestamp(
    input.created_at,
    "created_at",
  );

  validatePolicy(
    input.policy,
  );

  validateCandidates(
    input.candidates,
    input.query_id,
  );
}

/* ============================================================================
 * 22. PUBLIC RANKING API
 * ----------------------------------------------------------------------------
 * SearchPublicResultCandidate[]
 * -> validate exact public Transformation boundary
 * -> validate explicit ranking policy
 * -> deterministic authorized public ordering
 * -> apply result limit
 * -> assign contiguous public_position
 * -> SearchPublicSearchResult[]
 * -> SearchPublicRankingProjection
 *
 * No hidden ranking criterion exists.
 * ========================================================================== */

export function rankSearchPublicResults(
  input:
    SearchPublicRankingInput,
): SearchPublicRankingProjection {
  validateInput(
    input,
  );

  /*
   * Copy before sort.
   *
   * Input candidate order is never mutated.
   */
  const orderedCandidates =
    [
      ...input.candidates,
    ].sort(
      createCandidateComparator(
        input.policy,
      ),
    );

  /*
   * Limiting occurs strictly AFTER complete deterministic ordering.
   */
  const selectedCandidates =
    orderedCandidates.slice(
      0,
      input.policy
        .maximum_result_count,
    );

  const publicResults =
    Object.freeze(
      selectedCandidates.map(
        (
          candidate,
          index,
        ) =>
          buildRankedResult(
            candidate,
            index +
              1,
            input.policy,
            input.created_at,
          ),
      ),
    );

  const projection = {
    contract_version:
      XYVALA_SEARCH_PUBLIC_RANKING_PROJECTION_CONTRACT_VERSION,

    created_at:
      input.created_at,

    query_id:
      input.query_id,

    public_results:
      publicResults,

    result_count:
      publicResults.length,

    /*
     * Existing canonical projection contract field.
     *
     * Its exact semantic ownership remains contract-defined and is deliberately
     * not reinterpreted by this refactor.
     */
    public_projection_version:
      input.policy.policy_version,

    ranking_module_version:
      XYVALA_SEARCH_PUBLIC_RANKING_MODULE_VERSION,

    source_contract:
      "SearchPublicResultCandidate",

    visibility:
      "PUBLIC",
  } satisfies SearchPublicRankingProjection;

  return Object.freeze(
    projection,
  );
}

/* ============================================================================
 * 23. STATIC PUBLIC RANKING OWNERSHIP
 * ========================================================================== */

export const XYVALA_SEARCH_PUBLIC_RANKING_OWNERSHIP =
  Object.freeze({
    public_ranking_owner:
      "PUBLIC_RANKING",

    input_contract_owner:
      "TRANSFORMATION",

    public_position_owner:
      "PUBLIC_RANKING",

    public_search_result_owner:
      "PUBLIC_RANKING",

    public_ranking_projection_owner:
      "PUBLIC_RANKING",

    publication_truth_owner:
      "TEMPORAL_SIGNAL_DETECTION",

    public_publication_projection_owner:
      "TRANSFORMATION",

    ranking_reads_private_truth:
      false,

    ranking_reconstructs_transformed_truth:
      false,

    ranking_creates_analytical_truth:
      false,

    ranking_executes_calibration:
      false,

    ranking_reads_runtime_clock:
      false,

    ranking_generates_random_value:
      false,

    ranking_mutates_runtime:
      false,
  } as const);

/* ============================================================================
 * 24. STATIC PUBLIC RANKING GOVERNANCE
 * ========================================================================== */

export const XYVALA_SEARCH_PUBLIC_RANKING_GOVERNANCE =
  Object.freeze({
    public_ranking_only:
      true,

    analytical_owner:
      false,

    public_position_owner:
      true,

    explicit_policy_required:
      true,

    exact_priority_domains_required:
      true,

    transformed_truth_reconstruction_allowed:
      false,

    publication_reconstruction_allowed:
      false,

    publication_age_calculation_allowed:
      false,

    matched_term_normalization_allowed:
      false,

    matched_term_deduplication_allowed:
      false,

    matched_term_reordering_allowed:
      false,

    public_label_reconstruction_allowed:
      false,

    excerpt_reconstruction_allowed:
      false,

    source_reconstruction_allowed:
      false,

    language_reconstruction_allowed:
      false,

    availability_reconstruction_allowed:
      false,

    private_analytical_access_allowed:
      false,

    hidden_ranking_score_allowed:
      false,

    hidden_ranking_threshold_allowed:
      false,

    undeclared_ranking_dimension_allowed:
      false,

    evidence_breadth_as_implicit_ranking_allowed:
      false,

    title_as_implicit_ranking_allowed:
      false,

    source_uri_as_implicit_ranking_allowed:
      false,

    publication_time_as_implicit_ranking_allowed:
      false,

    input_order_as_tie_break_allowed:
      false,

    document_identity_as_final_tie_break:
      true,

    result_limit_after_ordering:
      true,

    calibration_execution_allowed:
      false,

    runtime_clock_access_allowed:
      false,

    random_tie_break_allowed:
      false,

    persistence_allowed:
      false,

    logging_allowed:
      false,

    prohibited_shortcuts:
      Object.freeze([
        "private_score_as_public_ranking_input",
        "private_percentile_as_public_position",
        "private_relative_position_as_public_position",
        "private_decision_as_public_ranking_input",

        "ranking_reconstructed_public_label",
        "ranking_reconstructed_excerpt",
        "ranking_reconstructed_source",
        "ranking_reconstructed_publication",
        "ranking_reconstructed_language",
        "ranking_reconstructed_availability",

        "ranking_normalized_matched_terms",
        "ranking_deduplicated_matched_terms",
        "ranking_sorted_matched_terms",

        "evidence_label_count_as_hidden_priority",
        "title_as_hidden_priority",
        "source_uri_as_hidden_priority",
        "published_at_as_hidden_priority",

        "candidate_input_order_as_tie_break",
        "random_tie_break",

        "upstream_public_position",
        "ranking_runtime_clock_access",
        "ranking_persistence",
      ] as const),
  } as const);
