/* ============================================================================
 * FILE: lib/xyvala/search/eligibility/search-eligibility-evaluation-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical eligibility evaluation engine
 *
 * ROLE
 * - consume the canonical SearchGlobalScore
 * - validate the SearchGlobalScore producer boundary
 * - evaluate candidate participation eligibility
 * - evaluate private ALLOW eligibility without producing a private decision
 * - translate canonical blocking constraints into canonical eligibility reasons
 * - apply explicit confidence and query-relevance eligibility policy
 * - preserve document and query identities
 * - preserve deterministic temporal ordering
 * - produce the canonical SearchEligibilityResult
 *
 * CLASSIFICATION
 * - PRIVATE ANALYTICAL ENGINE
 * - SEARCH DOMAIN
 * - ELIGIBILITY EVALUATION
 * - COMPUTE
 * - PURE
 * - DETERMINISTIC
 * - NON-MUTATING
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchGlobalScore
 * - SearchPenaltyVector
 * - SearchPositiveScoreVector
 * - SearchEligibilityResult
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 *
 * CONSUMERS
 * - Xyvala Search cohort construction engine
 * - Xyvala Search cohort normalization engine
 * - Xyvala Search relative cohort evaluation engine
 * - Xyvala Search private decision engine
 * - Xyvala Search calibration engine
 * - Xyvala Search private snapshot builder
 *
 * DIRECTIVES
 * - eligibility only
 * - consume validated canonical downstream analytical truth
 * - accept VALID and DEGRADED SearchGlobalScore only
 * - reject REJECTED and UNVALIDATED SearchGlobalScore
 * - preserve canonical penalty semantics
 * - preserve canonical critical-constraint semantics
 * - never escalate a non-critical penalty into a critical eligibility reason
 * - no documentary-source access
 * - no lexical reconstruction
 * - no anchor reconstruction
 * - no context reconstruction
 * - no query-signal reconstruction
 * - no link reconstruction
 * - no temporal reconstruction
 * - no behavioral reconstruction
 * - no positive score recalculation
 * - no penalty recalculation
 * - no global score recalculation
 * - no confidence recalculation
 * - no validation-state repair
 * - no ranking calculation
 * - no cohort normalization
 * - no percentile calculation
 * - no private decision
 * - never produce BLOCK
 * - never produce WATCH
 * - never produce ALLOW
 * - no calibration
 * - no persistence
 * - no runtime mutation
 * - no runtime clock access
 * - no implicit timestamp
 * - no hidden eligibility threshold
 *
 * INPUTS
 * - canonical SearchGlobalScore
 * - explicit SearchEligibilityEvaluationPolicy
 * - explicit deterministic creation timestamp
 *
 * OUTPUTS
 * - canonical SearchEligibilityResult
 *
 * INVARIANTS
 * - document identity originates from SearchGlobalScore
 * - query identity originates from SearchGlobalScore
 * - eligibility timestamp cannot predate SearchGlobalScore
 * - global score is never modified
 * - aggregate confidence is consumed without recalculation
 * - query relevance is consumed from its canonical SearchSubScore
 * - penalty truth is consumed from SearchGlobalScore.penalty_vector
 * - blocking constraints are never reconstructed
 * - only critical blocking constraints create critical eligibility reasons
 * - non-critical penalties never become critical reasons
 * - critical constraints prevent ranking eligibility
 * - ranking ineligibility prevents ALLOW eligibility
 * - ALLOW eligibility is not an ALLOW decision
 * - degraded evidence is handled explicitly by policy
 * - REJECTED upstream truth cannot cross this boundary
 * - UNVALIDATED upstream truth cannot cross this boundary
 * - blocking reasons contain only canonical SearchEligibilityReason values
 * - limiting reasons contain only canonical SearchEligibilityReason values
 * - duplicate reasons are removed deterministically
 * - output is immutable
 * - no input contract is mutated
 * - no runtime clock is read
 * - no random value is generated
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/search/contracts/search-pipeline-contract
 *
 * SENSITIVE AREAS
 * - eligibility/private-decision separation
 * - ranking eligibility
 * - ALLOW eligibility
 * - critical constraint propagation
 * - penalty semantic preservation
 * - query relevance threshold governance
 * - aggregate confidence threshold governance
 * - degraded global score handling
 * - temporal causality
 * - reason classification
 * ========================================================================== */

import type {
  SearchBlockingConstraint,
  SearchContractVersion,
  SearchDocumentId,
  SearchEligibilityReason,
  SearchEligibilityResult,
  SearchGlobalScore,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchNormalizedScore,
  SearchPolicyVersion,
  SearchQueryId,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME =
  "xyvala-search-eligibility-evaluation-core" as const;

export const XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_VERSION:
  SearchModuleVersion = "1.0.0";

export const XYVALA_SEARCH_ELIGIBILITY_RESULT_CONTRACT_VERSION:
  SearchContractVersion = "2.0.0";

/* ============================================================================
 * 2. ELIGIBILITY POLICY
 * ========================================================================== */

export interface SearchEligibilityEvaluationPolicy {
  readonly policy_version:
    SearchPolicyVersion;

  readonly minimum_ranking_confidence:
    SearchNormalizedScore;

  readonly minimum_allow_confidence:
    SearchNormalizedScore;

  readonly minimum_ranking_query_relevance:
    SearchNormalizedScore;

  readonly minimum_allow_query_relevance:
    SearchNormalizedScore;

  readonly degraded_global_score_ranking_allowed:
    boolean;

  readonly degraded_global_score_allow_allowed:
    boolean;
}

/* ============================================================================
 * 3. INPUT CONTRACT
 * ========================================================================== */

export interface SearchEligibilityEvaluationInput {
  readonly global_score:
    SearchGlobalScore;

  readonly policy:
    SearchEligibilityEvaluationPolicy;

  /**
   * Explicit deterministic timestamp supplied by the authorized orchestrator.
   *
   * This module never reads the runtime clock.
   */
  readonly created_at:
    SearchIsoTimestamp;
}

/* ============================================================================
 * 4. INTERNAL ELIGIBILITY STATE
 * ========================================================================== */

interface SearchEligibilityAccumulator {
  readonly blocking_reasons:
    SearchEligibilityReason[];

  readonly limiting_reasons:
    SearchEligibilityReason[];
}

interface SearchEligibilityGate {
  readonly ranking_allowed:
    boolean;

  readonly allow_allowed:
    boolean;
}

/* ============================================================================
 * 5. BASIC CONTRACT ASSERTIONS
 * ========================================================================== */

function assertNonEmptyString(
  value: string,
  fieldName: string,
): void {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a non-empty string.`,
    );
  }
}

function assertFiniteNumber(
  value: number,
  fieldName: string,
): void {
  if (!Number.isFinite(value)) {
    throw new Error(
      `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be finite.`,
    );
  }
}

function assertNormalizedNumber(
  value: number,
  fieldName: string,
): void {
  assertFiniteNumber(
    value,
    fieldName,
  );

  if (
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be between 0 and 1.`,
    );
  }
}

function assertValidIsoTimestamp(
  value: SearchIsoTimestamp,
  fieldName: string,
): void {
  assertNonEmptyString(
    value,
    fieldName,
  );

  if (
    !Number.isFinite(
      Date.parse(value),
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a valid ISO timestamp.`,
    );
  }
}

function assertAuthorizedValidationState(
  validationState: SearchValidationState,
  producerName: string,
): void {
  if (
    validationState === "REJECTED" ||
    validationState === "UNVALIDATED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
        `Boundary rejection: ${producerName} is not authorized for eligibility evaluation.`,
    );
  }

  if (
    validationState !== "VALID" &&
    validationState !== "DEGRADED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
        `Boundary rejection: ${producerName} has unsupported validation state ${validationState}.`,
    );
  }
}

/* ============================================================================
 * 6. POLICY VALIDATION
 * ========================================================================== */

function validateEligibilityPolicy(
  policy: SearchEligibilityEvaluationPolicy,
): void {
  assertNonEmptyString(
    policy.policy_version,
    "policy.policy_version",
  );

  assertNormalizedNumber(
    policy.minimum_ranking_confidence,
    "policy.minimum_ranking_confidence",
  );

  assertNormalizedNumber(
    policy.minimum_allow_confidence,
    "policy.minimum_allow_confidence",
  );

  assertNormalizedNumber(
    policy.minimum_ranking_query_relevance,
    "policy.minimum_ranking_query_relevance",
  );

  assertNormalizedNumber(
    policy.minimum_allow_query_relevance,
    "policy.minimum_allow_query_relevance",
  );

  if (
    policy.minimum_allow_confidence <
    policy.minimum_ranking_confidence
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
        "Policy violation: minimum_allow_confidence must be greater than or equal to minimum_ranking_confidence.",
    );
  }

  if (
    policy.minimum_allow_query_relevance <
    policy.minimum_ranking_query_relevance
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
        "Policy violation: minimum_allow_query_relevance must be greater than or equal to minimum_ranking_query_relevance.",
    );
  }

  if (
    policy.degraded_global_score_allow_allowed &&
    !policy.degraded_global_score_ranking_allowed
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
        "Policy violation: degraded global score cannot remain ALLOW eligible when degraded ranking participation is forbidden.",
    );
  }
}

/* ============================================================================
 * 7. GLOBAL SCORE PRODUCER BOUNDARY
 * ----------------------------------------------------------------------------
 * SearchGlobalScore is the canonical analytical truth consumed by this layer.
 *
 * This boundary validates only properties that belong to the canonical
 * SearchGlobalScore contract and to the canonical contracts explicitly
 * transported by it.
 *
 * It must never:
 * - invent missing producer metadata;
 * - infer a validation state for SearchPositiveScoreVector when that state is
 *   not part of its canonical contract;
 * - reconstruct positive analytical truth;
 * - reconstruct penalty truth;
 * - repair upstream identities;
 * - reinterpret canonical penalty semantics.
 *
 * SearchGlobalScore.validation_state is the authoritative downstream
 * authorization state for this boundary.
 * ========================================================================== */

function validateGlobalScoreBoundary(
  searchGlobalScore: SearchGlobalScore,
): void {
  assertNonEmptyString(
    searchGlobalScore.contract_version,
    "global_score.contract_version",
  );

  assertValidIsoTimestamp(
    searchGlobalScore.created_at,
    "global_score.created_at",
  );

  assertNonEmptyString(
    searchGlobalScore.document_id,
    "global_score.document_id",
  );

  assertNonEmptyString(
    searchGlobalScore.query_id,
    "global_score.query_id",
  );

  assertNonEmptyString(
    searchGlobalScore.aggregation_method,
    "global_score.aggregation_method",
  );

  assertNonEmptyString(
    searchGlobalScore.aggregator_module_version,
    "global_score.aggregator_module_version",
  );

  assertNonEmptyString(
    searchGlobalScore.aggregation_policy_version,
    "global_score.aggregation_policy_version",
  );

  /**
   * Canonical producer authorization.
   *
   * Eligibility consumes SearchGlobalScore as the authoritative producer
   * boundary. VALID and DEGRADED may cross. REJECTED and UNVALIDATED may not.
   */
  assertAuthorizedValidationState(
    searchGlobalScore.validation_state,
    "SearchGlobalScore",
  );

  assertFiniteNumber(
    searchGlobalScore.positive_score,
    "global_score.positive_score",
  );

  assertNormalizedNumber(
    searchGlobalScore.penalty_value,
    "global_score.penalty_value",
  );

  assertFiniteNumber(
    searchGlobalScore.final_raw_score,
    "global_score.final_raw_score",
  );

  assertNormalizedNumber(
    searchGlobalScore.aggregate_confidence,
    "global_score.aggregate_confidence",
  );

  /**
   * Positive-score vector identity propagation.
   *
   * SearchPositiveScoreVector is transported as canonical analytical
   * reference truth. This layer validates the identities actually exposed by
   * that contract and never assumes an undeclared validation_state.
   */
  assertNonEmptyString(
    searchGlobalScore.score_vector.contract_version,
    "global_score.score_vector.contract_version",
  );

  assertValidIsoTimestamp(
    searchGlobalScore.score_vector.created_at,
    "global_score.score_vector.created_at",
  );

  assertNonEmptyString(
    searchGlobalScore.score_vector.document_id,
    "global_score.score_vector.document_id",
  );

  assertNonEmptyString(
    searchGlobalScore.score_vector.query_id,
    "global_score.score_vector.query_id",
  );

  if (
    searchGlobalScore.score_vector.document_id !==
    searchGlobalScore.document_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
        "Boundary violation: SearchPositiveScoreVector belongs to a different document.",
    );
  }

  if (
    searchGlobalScore.score_vector.query_id !==
    searchGlobalScore.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
        "Boundary violation: SearchPositiveScoreVector belongs to a different query.",
    );
  }

  /**
   * Penalty-vector identity and authorization.
   *
   * SearchPenaltyVector owns canonical negative analytical truth and exposes
   * its own validation state, which must remain independently authorized.
   */
  assertNonEmptyString(
    searchGlobalScore.penalty_vector.contract_version,
    "global_score.penalty_vector.contract_version",
  );

  assertValidIsoTimestamp(
    searchGlobalScore.penalty_vector.created_at,
    "global_score.penalty_vector.created_at",
  );

  assertNonEmptyString(
    searchGlobalScore.penalty_vector.document_id,
    "global_score.penalty_vector.document_id",
  );

  assertNonEmptyString(
    searchGlobalScore.penalty_vector.query_id,
    "global_score.penalty_vector.query_id",
  );

  if (
    searchGlobalScore.penalty_vector.document_id !==
    searchGlobalScore.document_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
        "Boundary violation: SearchPenaltyVector belongs to a different document.",
    );
  }

  if (
    searchGlobalScore.penalty_vector.query_id !==
    searchGlobalScore.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
        "Boundary violation: SearchPenaltyVector belongs to a different query.",
    );
  }

  assertAuthorizedValidationState(
    searchGlobalScore.penalty_vector.validation_state,
    "SearchPenaltyVector",
  );

  /**
   * Canonical penalty propagation.
   *
   * Eligibility must consume the exact penalty truth already produced by the
   * analytical aggregation layer. No local recomputation is authorized.
   */
  if (
    searchGlobalScore.penalty_value !==
    searchGlobalScore.penalty_vector.total_penalty_value
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
        "Boundary violation: global_score.penalty_value differs from canonical SearchPenaltyVector.total_penalty_value.",
    );
  }

  /**
   * Canonical critical-constraint consistency.
   *
   * The boolean summary must exactly reflect the transported blocking
   * constraints. Eligibility consumes this state but never rebuilds it.
   */
  const canonicalCriticalConstraintState =
    searchGlobalScore.penalty_vector
      .blocking_constraints.some(
        (searchBlockingConstraint) =>
          searchBlockingConstraint.active,
      );

  if (
    canonicalCriticalConstraintState !==
    searchGlobalScore.penalty_vector
      .critical_constraint_active
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
        "Boundary violation: SearchPenaltyVector critical constraint state is inconsistent with canonical blocking constraints.",
    );
  }
}

/* ============================================================================
 * 8. TEMPORAL BOUNDARY
 * ========================================================================== */

function validateEligibilityTemporalBoundary(
  input: SearchEligibilityEvaluationInput,
): void {
  const eligibilityTimestamp =
    Date.parse(
      input.created_at,
    );

  const searchGlobalScoreTimestamp =
    Date.parse(
      input.global_score.created_at,
    );

  if (
    eligibilityTimestamp <
    searchGlobalScoreTimestamp
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
        "Temporal boundary violation: eligibility evaluation predates SearchGlobalScore.",
    );
  }
}

/* ============================================================================
 * 9. IDENTITY RESOLUTION
 * ========================================================================== */

function resolveCanonicalDocumentId(
  searchGlobalScore: SearchGlobalScore,
): SearchDocumentId {
  return searchGlobalScore.document_id;
}

function resolveCanonicalQueryId(
  searchGlobalScore: SearchGlobalScore,
): SearchQueryId {
  return searchGlobalScore.query_id;
}

/* ============================================================================
 * 10. QUERY RELEVANCE BOUNDARY
 * ========================================================================== */

function readCanonicalQueryRelevance(
  searchGlobalScore: SearchGlobalScore,
): SearchNormalizedScore {
  const searchQueryRelevanceScore =
    searchGlobalScore.score_vector
      .query_relevance_score;

  if (
    searchQueryRelevanceScore.score_name !==
    "query_relevance_score"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
        "Contract violation: canonical query relevance score has an invalid score identity.",
    );
  }

  if (
    searchQueryRelevanceScore.signal_family !==
    "QUERY_RELEVANCE"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
        "Contract violation: query_relevance_score must belong to QUERY_RELEVANCE.",
    );
  }

  if (
    searchQueryRelevanceScore.document_id !==
    searchGlobalScore.document_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
        "Boundary violation: query_relevance_score belongs to a different document.",
    );
  }

  if (
    searchQueryRelevanceScore.query_id === undefined ||
    searchQueryRelevanceScore.query_id !==
      searchGlobalScore.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
        "Boundary violation: query_relevance_score belongs to a different query or has no query identity.",
    );
  }

  assertNormalizedNumber(
    searchQueryRelevanceScore.value,
    "query_relevance_score.value",
  );

  assertNormalizedNumber(
    searchQueryRelevanceScore.confidence,
    "query_relevance_score.confidence",
  );

  return searchQueryRelevanceScore.value;
}

/* ============================================================================
 * 11. BLOCKING CONSTRAINT → ELIGIBILITY REASON
 * ----------------------------------------------------------------------------
 * Critical eligibility reasons originate only from canonical critical
 * blocking constraints.
 * ========================================================================== */

function mapBlockingConstraintToEligibilityReason(
  constraint: SearchBlockingConstraint,
): SearchEligibilityReason {
  switch (
    constraint.constraint_kind
  ) {
    case "INVALID_SOURCE":
      return "INVALID_SOURCE";

    case "UNSUPPORTED_DOCUMENT_TYPE":
      return "UNSUPPORTED_DOCUMENT_TYPE";

    case "CRITICAL_DUPLICATION":
      return "DUPLICATE_CONTENT";

    case "CRITICAL_LINK_MANIPULATION":
      return "CRITICAL_MANIPULATION";

    case "CRITICAL_QUERY_MISMATCH":
      return "LOW_QUERY_RELEVANCE";

    case "CRITICAL_TEMPORAL_RUPTURE":
      return "CRITICAL_RUPTURE";

    case "CONTRACT_VIOLATION":
      return "CONTRACT_VIOLATION";
  }
}

/* ============================================================================
 * 12. PENALTY → LIMITING REASON
 * ----------------------------------------------------------------------------
 * A non-critical penalty may only map to a semantically equivalent
 * non-escalating eligibility reason.
 *
 * No ordinary penalty is renamed CRITICAL_*.
 * ========================================================================== */

function mapPenaltyToEligibilityReason(
  penaltyKind:
    SearchGlobalScore["penalty_vector"]["penalties"][number]["penalty_kind"],
): SearchEligibilityReason | undefined {
  switch (
    penaltyKind
  ) {
    case "LOW_TEXT_VOLUME":
      return "LOW_TEXT_VOLUME";

    case "DUPLICATE_CONTENT":
      return "DUPLICATE_CONTENT";

    case "INVALID_SOURCE":
      return "INVALID_SOURCE";

    case "UNSUPPORTED_DOCUMENT_TYPE":
      return "UNSUPPORTED_DOCUMENT_TYPE";

    case "QUERY_MISMATCH":
      return "LOW_QUERY_RELEVANCE";

    case "LINK_MANIPULATION":
    case "SOURCE_CLUSTER_CONCENTRATION":
    case "RECIPROCAL_LINK_ABUSE":
    case "ANCHOR_TEXT_MANIPULATION":
    case "TEMPORAL_RUPTURE":
    case "CONTENT_REPLACEMENT":
    case "EXCESSIVE_REPETITION":
    case "LOW_INFORMATION_DENSITY":
    case "STRUCTURAL_INCOHERENCE":
      return undefined;
  }
}

/* ============================================================================
 * 13. UNIQUE REASON APPEND
 * ========================================================================== */

function appendUniqueReason(
  target: SearchEligibilityReason[],
  reason: SearchEligibilityReason,
): void {
  if (
    !target.includes(reason)
  ) {
    target.push(reason);
  }
}

/* ============================================================================
 * 14. CANONICAL BLOCKING REASON COLLECTION
 * ========================================================================== */

function collectCanonicalBlockingReasons(
  searchGlobalScore: SearchGlobalScore,
  accumulator: SearchEligibilityAccumulator,
): void {
  for (
    const searchBlockingConstraint of
    searchGlobalScore.penalty_vector
      .blocking_constraints
  ) {
    if (
      !searchBlockingConstraint.active
    ) {
      continue;
    }

    assertNormalizedNumber(
      searchBlockingConstraint.confidence,
      "blocking_constraint.confidence",
    );

    const searchEligibilityReason =
      mapBlockingConstraintToEligibilityReason(
        searchBlockingConstraint,
      );

    appendUniqueReason(
      accumulator.blocking_reasons,
      searchEligibilityReason,
    );
  }
}

/* ============================================================================
 * 15. CANONICAL PENALTY LIMITATIONS
 * ========================================================================== */

function collectCanonicalPenaltyLimitations(
  searchGlobalScore: SearchGlobalScore,
  accumulator: SearchEligibilityAccumulator,
): void {
  for (
    const searchPenalty of
    searchGlobalScore.penalty_vector.penalties
  ) {
    assertNormalizedNumber(
      searchPenalty.severity,
      "penalty.severity",
    );

    assertNormalizedNumber(
      searchPenalty.confidence,
      "penalty.confidence",
    );

    const searchEligibilityReason =
      mapPenaltyToEligibilityReason(
        searchPenalty.penalty_kind,
      );

    if (
      searchEligibilityReason === undefined
    ) {
      continue;
    }

    appendUniqueReason(
      accumulator.limiting_reasons,
      searchEligibilityReason,
    );
  }
}

/* ============================================================================
 * 16. GLOBAL SCORE VALIDATION-STATE ELIGIBILITY
 * ----------------------------------------------------------------------------
 * Only VALID and DEGRADED reach this function.
 * ========================================================================== */

function evaluateValidationState(
  validationState: SearchValidationState,
  policy: SearchEligibilityEvaluationPolicy,
  accumulator: SearchEligibilityAccumulator,
): SearchEligibilityGate {
  switch (
    validationState
  ) {
    case "VALID":
      return Object.freeze({
        ranking_allowed: true,
        allow_allowed: true,
      });

    case "DEGRADED":
      appendUniqueReason(
        accumulator.limiting_reasons,
        "INSUFFICIENT_DATA",
      );

      return Object.freeze({
        ranking_allowed:
          policy
            .degraded_global_score_ranking_allowed,

        allow_allowed:
          policy
            .degraded_global_score_allow_allowed,
      });

    case "UNVALIDATED":
    case "REJECTED":
      throw new Error(
        `[${XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_NAME}] ` +
          "Internal invariant violation: unauthorized SearchGlobalScore crossed the eligibility producer boundary.",
      );
  }
}

/* ============================================================================
 * 17. CONFIDENCE ELIGIBILITY
 * ========================================================================== */

function evaluateConfidence(
  searchGlobalScore: SearchGlobalScore,
  policy: SearchEligibilityEvaluationPolicy,
  accumulator: SearchEligibilityAccumulator,
): SearchEligibilityGate {
  const searchAggregateConfidence =
    searchGlobalScore.aggregate_confidence;

  assertNormalizedNumber(
    searchAggregateConfidence,
    "global_score.aggregate_confidence",
  );

  if (
    searchAggregateConfidence <
    policy.minimum_ranking_confidence
  ) {
    appendUniqueReason(
      accumulator.blocking_reasons,
      "LOW_CONFIDENCE",
    );

    return Object.freeze({
      ranking_allowed: false,
      allow_allowed: false,
    });
  }

  if (
    searchAggregateConfidence <
    policy.minimum_allow_confidence
  ) {
    appendUniqueReason(
      accumulator.limiting_reasons,
      "LOW_CONFIDENCE",
    );

    return Object.freeze({
      ranking_allowed: true,
      allow_allowed: false,
    });
  }

  return Object.freeze({
    ranking_allowed: true,
    allow_allowed: true,
  });
}

/* ============================================================================
 * 18. QUERY RELEVANCE ELIGIBILITY
 * ========================================================================== */

function evaluateQueryRelevance(
  searchGlobalScore: SearchGlobalScore,
  policy: SearchEligibilityEvaluationPolicy,
  accumulator: SearchEligibilityAccumulator,
): SearchEligibilityGate {
  const searchQueryRelevance =
    readCanonicalQueryRelevance(
      searchGlobalScore,
    );

  if (
    searchQueryRelevance <
    policy.minimum_ranking_query_relevance
  ) {
    appendUniqueReason(
      accumulator.blocking_reasons,
      "LOW_QUERY_RELEVANCE",
    );

    return Object.freeze({
      ranking_allowed: false,
      allow_allowed: false,
    });
  }

  if (
    searchQueryRelevance <
    policy.minimum_allow_query_relevance
  ) {
    appendUniqueReason(
      accumulator.limiting_reasons,
      "LOW_QUERY_RELEVANCE",
    );

    return Object.freeze({
      ranking_allowed: true,
      allow_allowed: false,
    });
  }

  return Object.freeze({
    ranking_allowed: true,
    allow_allowed: true,
  });
}

/* ============================================================================
 * 19. SCORE-EVIDENCE COMPLETENESS
 * ----------------------------------------------------------------------------
 * Eligibility consumes aggregation metadata only.
 *
 * It never returns to documentary or signal producers.
 * ========================================================================== */

function evaluateScoreEvidenceCompleteness(
  searchGlobalScore: SearchGlobalScore,
  accumulator: SearchEligibilityAccumulator,
): void {
  const hasExcludedScore =
    searchGlobalScore.excluded_score_names.length >
    0;

  const hasIncludedUnavailableScore =
    searchGlobalScore.weights_used.some(
      (searchAggregationWeight) =>
        searchAggregationWeight.score_included &&
        !searchAggregationWeight.score_available,
    );

  if (
    hasExcludedScore ||
    hasIncludedUnavailableScore
  ) {
    appendUniqueReason(
      accumulator.limiting_reasons,
      "INSUFFICIENT_DATA",
    );
  }
}

/* ============================================================================
 * 20. CRITICAL CONSTRAINT ELIGIBILITY
 * ========================================================================== */

function evaluateCriticalConstraints(
  searchGlobalScore: SearchGlobalScore,
): SearchEligibilityGate {
  if (
    searchGlobalScore.penalty_vector
      .critical_constraint_active
  ) {
    return Object.freeze({
      ranking_allowed: false,
      allow_allowed: false,
    });
  }

  return Object.freeze({
    ranking_allowed: true,
    allow_allowed: true,
  });
}

/* ============================================================================
 * 21. ELIGIBILITY RESOLUTION
 * ========================================================================== */

function resolveEligibility(args: {
  readonly validation:
    SearchEligibilityGate;

  readonly confidence:
    SearchEligibilityGate;

  readonly query_relevance:
    SearchEligibilityGate;

  readonly critical_constraints:
    SearchEligibilityGate;
}): {
  readonly ranking_eligible:
    boolean;

  readonly allow_eligible:
    boolean;
} {
  const searchRankingEligible =
    args.validation.ranking_allowed &&
    args.confidence.ranking_allowed &&
    args.query_relevance.ranking_allowed &&
    args.critical_constraints.ranking_allowed;

  const searchAllowEligible =
    searchRankingEligible &&
    args.validation.allow_allowed &&
    args.confidence.allow_allowed &&
    args.query_relevance.allow_allowed &&
    args.critical_constraints.allow_allowed;

  return Object.freeze({
    ranking_eligible:
      searchRankingEligible,

    allow_eligible:
      searchAllowEligible,
  });
}

/* ============================================================================
 * 22. FINAL REASON NORMALIZATION
 * ----------------------------------------------------------------------------
 * Canonical eligibility reasons are normalized deterministically.
 *
 * Rules:
 * - duplicate reasons are removed;
 * - blocking reasons dominate identical limiting reasons;
 * - ordering is deterministic;
 * - ELIGIBLE is emitted only when no defensive condition remains;
 * - ELIGIBLE remains a canonical SearchEligibilityReason, never a free string;
 * - no reason is invented at this boundary.
 * ========================================================================== */

function finalizeReasons(args: {
  readonly ranking_eligible:
    boolean;

  readonly allow_eligible:
    boolean;

  readonly accumulator:
    SearchEligibilityAccumulator;
}): {
  readonly blocking_reasons:
    readonly SearchEligibilityReason[];

  readonly limiting_reasons:
    readonly SearchEligibilityReason[];
} {
  const searchBlockingReasons:
    SearchEligibilityReason[] = [
      ...new Set<SearchEligibilityReason>(
        args.accumulator
          .blocking_reasons,
      ),
    ].sort();

  const searchLimitingReasons:
    SearchEligibilityReason[] = [
      ...new Set<SearchEligibilityReason>(
        args.accumulator
          .limiting_reasons,
      ),
    ]
      .filter(
        (
          searchEligibilityReason:
            SearchEligibilityReason,
        ) =>
          !searchBlockingReasons.includes(
            searchEligibilityReason,
          ),
      )
      .sort();

  /**
   * Canonical fully eligible state.
   *
   * ELIGIBLE is descriptive eligibility truth only.
   * It is not a private ALLOW decision.
   */
  if (
    args.ranking_eligible &&
    args.allow_eligible &&
    searchBlockingReasons.length === 0 &&
    searchLimitingReasons.length === 0
  ) {
    const eligibleReason:
      SearchEligibilityReason =
      "ELIGIBLE";

    return Object.freeze({
      blocking_reasons:
        Object.freeze(
          [] as SearchEligibilityReason[],
        ),

      limiting_reasons:
        Object.freeze([
          eligibleReason,
        ]),
    });
  }

  return Object.freeze({
    blocking_reasons:
      Object.freeze(
        searchBlockingReasons,
      ),

    limiting_reasons:
      Object.freeze(
        searchLimitingReasons,
      ),
  });
}

/* ============================================================================
 * 23. CANONICAL PRODUCER
 * ----------------------------------------------------------------------------
 * SearchGlobalScore
 * + explicit eligibility policy
 * → SearchEligibilityResult
 *
 * This function does not produce BLOCK / WATCH / ALLOW.
 * ========================================================================== */

export function evaluateSearchEligibility(
  input: SearchEligibilityEvaluationInput,
): SearchEligibilityResult {
  assertValidIsoTimestamp(
    input.created_at,
    "created_at",
  );

  validateEligibilityPolicy(
    input.policy,
  );

  validateGlobalScoreBoundary(
    input.global_score,
  );

  validateEligibilityTemporalBoundary(
    input,
  );

  const searchDocumentId =
    resolveCanonicalDocumentId(
      input.global_score,
    );

  const searchQueryId =
    resolveCanonicalQueryId(
      input.global_score,
    );

  const searchEligibilityAccumulator:
    SearchEligibilityAccumulator = {
    blocking_reasons: [],
    limiting_reasons: [],
  };

  collectCanonicalBlockingReasons(
    input.global_score,
    searchEligibilityAccumulator,
  );

  collectCanonicalPenaltyLimitations(
    input.global_score,
    searchEligibilityAccumulator,
  );

  evaluateScoreEvidenceCompleteness(
    input.global_score,
    searchEligibilityAccumulator,
  );

  const searchValidationEligibility =
    evaluateValidationState(
      input.global_score.validation_state,
      input.policy,
      searchEligibilityAccumulator,
    );

  const searchConfidenceEligibility =
    evaluateConfidence(
      input.global_score,
      input.policy,
      searchEligibilityAccumulator,
    );

  const searchQueryRelevanceEligibility =
    evaluateQueryRelevance(
      input.global_score,
      input.policy,
      searchEligibilityAccumulator,
    );

  const searchCriticalConstraintEligibility =
    evaluateCriticalConstraints(
      input.global_score,
    );

  const {
    ranking_eligible:
      searchRankingEligible,

    allow_eligible:
      searchAllowEligible,
  } =
    resolveEligibility({
      validation:
        searchValidationEligibility,

      confidence:
        searchConfidenceEligibility,

      query_relevance:
        searchQueryRelevanceEligibility,

      critical_constraints:
        searchCriticalConstraintEligibility,
    });

  const {
    blocking_reasons:
      searchBlockingReasons,

    limiting_reasons:
      searchLimitingReasons,
  } =
    finalizeReasons({
      ranking_eligible:
        searchRankingEligible,

      allow_eligible:
        searchAllowEligible,

      accumulator:
        searchEligibilityAccumulator,
    });

  return Object.freeze({
    contract_version:
      XYVALA_SEARCH_ELIGIBILITY_RESULT_CONTRACT_VERSION,

    created_at:
      input.created_at,

    document_id:
      searchDocumentId,

    query_id:
      searchQueryId,

    ranking_eligible:
      searchRankingEligible,

    allow_eligible:
      searchAllowEligible,

    blocking_reasons:
      searchBlockingReasons,

    limiting_reasons:
      searchLimitingReasons,

    evaluator_module_version:
      XYVALA_SEARCH_ELIGIBILITY_EVALUATION_MODULE_VERSION,

    eligibility_policy_version:
      input.policy.policy_version,
  });
}
