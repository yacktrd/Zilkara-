/* ============================================================================
 * FILE: lib/xyvala/search/decision/search-private-decision-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical private decision engine
 *
 * ROLE
 * - consume canonical SearchGlobalScore truth
 * - consume canonical SearchEligibilityResult truth
 * - consume optional canonical SearchRelativeEvaluationContext evidence
 * - preserve canonical document, query and cohort identities
 * - preserve explicit relative-evaluation availability semantics
 * - enforce canonical blocking truth produced upstream
 * - enforce ranking participation and ALLOW eligibility
 * - apply one explicit private decision policy
 * - produce the canonical SearchPrivateDecision
 *
 * CLASSIFICATION
 * - PRIVATE ANALYTICAL ENGINE
 * - SEARCH DOMAIN
 * - PRIVATE DECISION
 * - COMPUTE
 * - PURE
 * - DETERMINISTIC
 * - NON-MUTATING
 * - NON-PUBLIC
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchGlobalScore
 * - SearchEligibilityResult
 * - SearchRelativeEvaluationContext
 * - SearchPrivateDecision
 * - SearchOptionalEvidence
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 * - Public Exposure Governance System
 *
 * CONSUMERS
 * - Xyvala Search calibration engine
 * - Xyvala Search private snapshot builder
 * - Xyvala Search private diagnostics
 * - Xyvala Search private traceability
 *
 * DIRECTIVES
 * - private decision only
 * - consume canonical upstream truth without recalculation
 * - preserve explicit unavailable evidence
 * - never reconstruct relative cohort evaluation
 * - never fabricate cohort identity
 * - BLOCK only from governed blocking conditions
 * - ALLOW only when upstream ALLOW eligibility is true
 * - ALLOW requires available canonical relative evaluation
 * - WATCH remains the defensive non-blocking fallback
 * - explicit policy only
 * - no hidden threshold
 * - no threshold default
 * - no document scoring
 * - no query relevance scoring
 * - no penalty calculation
 * - no global-score calculation
 * - no eligibility calculation
 * - no cohort normalization
 * - no relative-position recalculation
 * - no percentile recalculation
 * - no confidence recalculation
 * - no validation-state repair
 * - no public ranking
 * - no public label
 * - no snapshot construction
 * - no calibration
 * - no persistence
 * - no logging
 * - no runtime mutation
 * - no runtime clock access
 * - no implicit timestamp
 * - no random value generation
 * - no public exposure
 *
 * INPUTS
 * - canonical SearchGlobalScore
 * - canonical SearchEligibilityResult
 * - SearchOptionalEvidence<SearchRelativeEvaluationContext>
 * - explicit canonical cohort identity
 * - explicit SearchPrivateDecisionPolicy
 * - explicit deterministic creation timestamp
 *
 * OUTPUTS
 * - canonical SearchPrivateDecision
 *
 * DECISION PRECEDENCE
 * 1. critical upstream constraint
 *    => BLOCK
 *
 * 2. ranking ineligible
 *    => BLOCK
 *
 * 3. ranking eligible but ALLOW-ineligible
 *    => WATCH
 *
 * 4. ALLOW-eligible but canonical relative evaluation unavailable
 *    => WATCH
 *
 * 5. ALLOW-eligible with relative evaluation available but private policy
 *    requirements not satisfied
 *    => WATCH
 *
 * 6. ALLOW-eligible with relative evaluation available and all private policy
 *    requirements satisfied
 *    => ALLOW
 *
 * INVARIANTS
 * - global score and eligibility belong to the same document
 * - global score and eligibility belong to the same query
 * - cohort identity is supplied explicitly by the authorized orchestrator
 * - available relative evaluation belongs to the same document
 * - available relative evaluation belongs to the same query
 * - available relative evaluation belongs to the explicit cohort
 * - available relative evaluation references final_raw_score exactly
 * - available relative evaluation agrees with ranking eligibility
 * - relative evaluation may be unavailable without fabrication
 * - decision timestamp cannot predate canonical upstream truth
 * - global score is never modified
 * - eligibility is never modified
 * - relative evaluation is never modified
 * - critical_constraint_active is consumed from SearchPenaltyVector
 * - ranking_eligible is consumed from SearchEligibilityResult
 * - allow_eligible is consumed from SearchEligibilityResult
 * - percentile is consumed only from available SearchRelativeEvaluationContext
 * - aggregate_confidence is consumed from SearchGlobalScore
 * - decision confidence does not create a second confidence model
 * - WATCH is not equivalent to BLOCK
 * - WATCH is not equivalent to ALLOW
 * - ALLOW never bypasses upstream eligibility
 * - ALLOW never bypasses unavailable relative evidence
 * - BLOCK never originates from an arbitrary score threshold
 * - decision remains PRIVATE
 * - no input contract is mutated
 * - no runtime clock is read
 * - no random value is generated
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/search/contracts/search-pipeline-contract
 *
 * SENSITIVE AREAS
 * - BLOCK / WATCH / ALLOW precedence
 * - optional relative-evaluation evidence
 * - ALLOW eligibility
 * - critical blocking constraints
 * - percentile threshold governance
 * - confidence threshold governance
 * - document/query/cohort lineage
 * - temporal causality
 * - private/public separation
 * ========================================================================== */

import type {
  SearchConfidenceScore,
  SearchContractVersion,
  SearchEligibilityResult,
  SearchGlobalScore,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchOptionalEvidence,
  SearchPercentile,
  SearchPolicyVersion,
  SearchPrivateDecision,
  SearchPrivateDecisionCategory,
  SearchRelativeEvaluationContext,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME =
  "xyvala-search-private-decision-core" as const;

export const XYVALA_SEARCH_PRIVATE_DECISION_MODULE_VERSION:
  SearchModuleVersion = "1.0.0";

export const XYVALA_SEARCH_PRIVATE_DECISION_CONTRACT_VERSION:
  SearchContractVersion = "2.0.0";

/* ============================================================================
 * 2. GOVERNED RULE IDENTITIES
 * ----------------------------------------------------------------------------
 * Rule IDs are stable private analytical identities.
 *
 * They are not public labels and must never cross the private/public boundary.
 * ========================================================================== */

export const XYVALA_SEARCH_PRIVATE_DECISION_RULE_IDS =
  Object.freeze({
    CRITICAL_CONSTRAINT:
      "SEARCH_PRIVATE_DECISION_CRITICAL_CONSTRAINT",

    RANKING_INELIGIBLE:
      "SEARCH_PRIVATE_DECISION_RANKING_INELIGIBLE",

    ALLOW_INELIGIBLE:
      "SEARCH_PRIVATE_DECISION_ALLOW_INELIGIBLE",

    RELATIVE_EVALUATION_UNAVAILABLE:
      "SEARCH_PRIVATE_DECISION_RELATIVE_EVALUATION_UNAVAILABLE",

    ALLOW_PERCENTILE_BELOW_POLICY:
      "SEARCH_PRIVATE_DECISION_ALLOW_PERCENTILE_BELOW_POLICY",

    ALLOW_CONFIDENCE_BELOW_POLICY:
      "SEARCH_PRIVATE_DECISION_ALLOW_CONFIDENCE_BELOW_POLICY",

    ALLOW_REQUIREMENTS_SATISFIED:
      "SEARCH_PRIVATE_DECISION_ALLOW_REQUIREMENTS_SATISFIED",
  } as const);

/* ============================================================================
 * 3. PRIVATE DECISION POLICY
 * ----------------------------------------------------------------------------
 * No threshold is embedded in the engine.
 *
 * BLOCK does not originate from these thresholds.
 *
 * These requirements govern ALLOW only.
 * ========================================================================== */

export interface SearchPrivateDecisionPolicy {
  readonly policy_version:
    SearchPolicyVersion;

  readonly minimum_allow_percentile:
    SearchPercentile;

  readonly minimum_allow_confidence:
    SearchConfidenceScore;
}

/* ============================================================================
 * 4. INPUT CONTRACT
 * ----------------------------------------------------------------------------
 * Cohort identity is explicit orchestration truth.
 *
 * It must not be inferred from optional relative evaluation because relative
 * evaluation may legitimately be unavailable.
 * ========================================================================== */

export interface SearchPrivateDecisionInput {
  readonly global_score:
    SearchGlobalScore;

  readonly eligibility:
    SearchEligibilityResult;

  readonly relative_evaluation:
    SearchOptionalEvidence<SearchRelativeEvaluationContext>;

  /**
   * Explicit canonical cohort identity supplied by the authorized orchestrator.
   *
   * This prevents the decision layer from reconstructing cohort identity when
   * relative evaluation is unavailable.
   */
  readonly cohort_id:
    SearchPrivateDecision["cohort_id"];

  readonly policy:
    SearchPrivateDecisionPolicy;

  /**
   * Explicit deterministic timestamp supplied by the authorized orchestrator.
   *
   * This module never reads the runtime clock.
   */
  readonly created_at:
    SearchIsoTimestamp;
}

/* ============================================================================
 * 5. INTERNAL DECISION RESULT
 * ========================================================================== */

interface SearchPrivateDecisionResolution {
  readonly category:
    SearchPrivateDecisionCategory;

  readonly triggered_rule_ids:
    readonly string[];

  readonly decision_reasons:
    readonly string[];
}

/* ============================================================================
 * 6. SAFE CONTRACT ASSERTIONS
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
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
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
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be finite.`,
    );
  }
}

function assertNormalizedConfidence(
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
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be between 0 and 1.`,
    );
  }
}

function assertPercentile(
  value: number,
  fieldName: string,
): void {
  assertFiniteNumber(
    value,
    fieldName,
  );

  if (
    value < 0 ||
    value > 100
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be between 0 and 100.`,
    );
  }
}

function assertPositiveInteger(
  value: number,
  fieldName: string,
): void {
  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a positive integer.`,
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

  const parsedTimestamp =
    Date.parse(value);

  if (
    !Number.isFinite(
      parsedTimestamp,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a valid ISO timestamp.`,
    );
  }
}

/* ============================================================================
 * 7. POLICY VALIDATION
 * ========================================================================== */

function validatePolicy(
  policy:
    SearchPrivateDecisionPolicy,
): void {
  assertNonEmptyString(
    policy.policy_version,
    "policy.policy_version",
  );

  assertPercentile(
    policy.minimum_allow_percentile,
    "policy.minimum_allow_percentile",
  );

  assertNormalizedConfidence(
    policy.minimum_allow_confidence,
    "policy.minimum_allow_confidence",
  );
}

/* ============================================================================
 * 8. GLOBAL SCORE PRODUCER BOUNDARY
 * ========================================================================== */

function validateGlobalScore(
  searchGlobalScore:
    SearchGlobalScore,
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

  assertFiniteNumber(
    searchGlobalScore.final_raw_score,
    "global_score.final_raw_score",
  );

  assertNormalizedConfidence(
    searchGlobalScore.aggregate_confidence,
    "global_score.aggregate_confidence",
  );

  if (
    searchGlobalScore.validation_state ===
      "REJECTED" ||
    searchGlobalScore.validation_state ===
      "UNVALIDATED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        "Boundary rejection: SearchGlobalScore is not authorized for private decision.",
    );
  }

  if (
    searchGlobalScore.validation_state !==
      "VALID" &&
    searchGlobalScore.validation_state !==
      "DEGRADED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        `Boundary rejection: SearchGlobalScore has unsupported validation state ${searchGlobalScore.validation_state}.`,
    );
  }

  if (
    searchGlobalScore.penalty_vector.document_id !==
    searchGlobalScore.document_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        "Boundary violation: propagated SearchPenaltyVector belongs to a different document.",
    );
  }

  if (
    searchGlobalScore.penalty_vector.query_id !==
    searchGlobalScore.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        "Boundary violation: propagated SearchPenaltyVector belongs to a different query.",
    );
  }

  const searchCanonicalCriticalConstraintState =
    searchGlobalScore.penalty_vector
      .blocking_constraints.some(
        (searchBlockingConstraint) =>
          searchBlockingConstraint.active,
      );

  if (
    searchCanonicalCriticalConstraintState !==
    searchGlobalScore.penalty_vector
      .critical_constraint_active
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        "Boundary violation: SearchPenaltyVector critical constraint state is inconsistent.",
    );
  }
}

/* ============================================================================
 * 9. ELIGIBILITY PRODUCER BOUNDARY
 * ========================================================================== */

function validateEligibility(
  searchEligibility:
    SearchEligibilityResult,
): void {
  assertNonEmptyString(
    searchEligibility.contract_version,
    "eligibility.contract_version",
  );

  assertValidIsoTimestamp(
    searchEligibility.created_at,
    "eligibility.created_at",
  );

  assertNonEmptyString(
    searchEligibility.document_id,
    "eligibility.document_id",
  );

  assertNonEmptyString(
    searchEligibility.query_id,
    "eligibility.query_id",
  );

  assertNonEmptyString(
    searchEligibility.evaluator_module_version,
    "eligibility.evaluator_module_version",
  );

  assertNonEmptyString(
    searchEligibility.eligibility_policy_version,
    "eligibility.eligibility_policy_version",
  );

  if (
    searchEligibility.allow_eligible &&
    !searchEligibility.ranking_eligible
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        "Contract violation: ALLOW eligibility cannot be true when ranking eligibility is false.",
    );
  }
}

/* ============================================================================
 * 10. OPTIONAL RELATIVE-EVALUATION EVIDENCE
 * ----------------------------------------------------------------------------
 * Relative cohort evaluation is optional canonical evidence.
 *
 * This layer must preserve the exact availability semantics produced upstream.
 *
 * No unavailable state may be converted into a neutral value.
 * No relative evaluation may be reconstructed locally.
 * No type assertion may be used to bypass the canonical evidence contract.
 * ========================================================================== */

function isAvailableRelativeEvaluationEvidence(
  searchRelativeEvaluationEvidence:
    SearchOptionalEvidence<SearchRelativeEvaluationContext>,
): searchRelativeEvaluationEvidence is
  SearchOptionalEvidence<SearchRelativeEvaluationContext> & {
    readonly value:
      SearchRelativeEvaluationContext;
  } {
  return (
    "value" in
    searchRelativeEvaluationEvidence
  );
}

function readAvailableRelativeEvaluation(
  searchRelativeEvaluationEvidence:
    SearchOptionalEvidence<SearchRelativeEvaluationContext>,
): SearchRelativeEvaluationContext | undefined {
  if (
    !isAvailableRelativeEvaluationEvidence(
      searchRelativeEvaluationEvidence,
    )
  ) {
    return undefined;
  }

  return searchRelativeEvaluationEvidence.value;
}

function validateRelativeEvaluationEvidence(
  searchRelativeEvaluationEvidence:
    SearchOptionalEvidence<SearchRelativeEvaluationContext>,
): void {
  if (
    isAvailableRelativeEvaluationEvidence(
      searchRelativeEvaluationEvidence,
    )
  ) {
    validateRelativeEvaluation(
      searchRelativeEvaluationEvidence.value,
    );

    return;
  }

  /**
   * Canonical unavailable evidence is intentionally accepted here.
   *
   * Its exact upstream unavailable-state semantics remain owned by the
   * SearchOptionalEvidence contract and are not reconstructed by the
   * private decision engine.
   */
}

/* ============================================================================
 * 11. RELATIVE EVALUATION PRODUCER BOUNDARY
 * ========================================================================== */

function validateRelativeEvaluation(
  searchRelativeEvaluation:
    SearchRelativeEvaluationContext,
): void {
  assertNonEmptyString(
    searchRelativeEvaluation.contract_version,
    "relative_evaluation.contract_version",
  );

  assertValidIsoTimestamp(
    searchRelativeEvaluation.created_at,
    "relative_evaluation.created_at",
  );

  assertNonEmptyString(
    searchRelativeEvaluation.document_id,
    "relative_evaluation.document_id",
  );

  assertNonEmptyString(
    searchRelativeEvaluation.query_id,
    "relative_evaluation.query_id",
  );

  assertNonEmptyString(
    searchRelativeEvaluation.cohort_id,
    "relative_evaluation.cohort_id",
  );

  assertNonEmptyString(
    searchRelativeEvaluation.distribution_id,
    "relative_evaluation.distribution_id",
  );

  assertNonEmptyString(
    searchRelativeEvaluation.evaluator_module_version,
    "relative_evaluation.evaluator_module_version",
  );

  assertNonEmptyString(
    searchRelativeEvaluation
      .relative_evaluation_policy_version,
    "relative_evaluation.relative_evaluation_policy_version",
  );

  assertFiniteNumber(
    searchRelativeEvaluation.raw_score,
    "relative_evaluation.raw_score",
  );

  assertFiniteNumber(
    searchRelativeEvaluation.normalized_score,
    "relative_evaluation.normalized_score",
  );

  assertPercentile(
    searchRelativeEvaluation.percentile,
    "relative_evaluation.percentile",
  );

  assertPositiveInteger(
    searchRelativeEvaluation.relative_position,
    "relative_evaluation.relative_position",
  );

  assertPositiveInteger(
    searchRelativeEvaluation.cohort_size,
    "relative_evaluation.cohort_size",
  );

  if (
    searchRelativeEvaluation.relative_position >
    searchRelativeEvaluation.cohort_size
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        "Contract violation: relative position exceeds cohort size.",
    );
  }

  /**
   * The canonical relative-cohort evaluator produces context only for
   * ranking-eligible candidates.
   */
  if (
    !searchRelativeEvaluation.ranking_eligible
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        "Boundary violation: available SearchRelativeEvaluationContext is not ranking-eligible.",
    );
  }
}

/* ============================================================================
 * 12. IDENTITY AND LINEAGE VALIDATION
 * ========================================================================== */

function validateInputLineage(
  input:
    SearchPrivateDecisionInput,
): void {
  const searchDocumentId =
    input.global_score.document_id;

  const searchQueryId =
    input.global_score.query_id;

  if (
    input.eligibility.document_id !==
    searchDocumentId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        "Boundary violation: SearchEligibilityResult belongs to a different document.",
    );
  }

  if (
    input.eligibility.query_id !==
    searchQueryId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        "Boundary violation: SearchEligibilityResult belongs to a different query.",
    );
  }

  const searchRelativeEvaluation =
    readAvailableRelativeEvaluation(
      input.relative_evaluation,
    );

  if (
    searchRelativeEvaluation === undefined
  ) {
    return;
  }

  if (
    searchRelativeEvaluation.document_id !==
    searchDocumentId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        "Boundary violation: SearchRelativeEvaluationContext belongs to a different document.",
    );
  }

  if (
    searchRelativeEvaluation.query_id !==
    searchQueryId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        "Boundary violation: SearchRelativeEvaluationContext belongs to a different query.",
    );
  }

  if (
    searchRelativeEvaluation.cohort_id !==
    input.cohort_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        "Boundary violation: SearchRelativeEvaluationContext belongs to a different cohort.",
    );
  }

  if (
    searchRelativeEvaluation.raw_score !==
    input.global_score.final_raw_score
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        "Boundary violation: relative evaluation raw_score does not reference canonical SearchGlobalScore.final_raw_score.",
    );
  }

  if (
    searchRelativeEvaluation.ranking_eligible !==
    input.eligibility.ranking_eligible
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        "Boundary violation: relative evaluation and eligibility disagree on ranking eligibility.",
    );
  }
}

/* ============================================================================
 * 13. TEMPORAL BOUNDARY
 * ----------------------------------------------------------------------------
 * Decision truth may not predate its canonical upstream truth.
 *
 * Relative-evaluation time is checked only when that evidence exists.
 * ========================================================================== */

function validateDecisionTemporalBoundary(
  input:
    SearchPrivateDecisionInput,
): void {
  const searchDecisionTimestamp =
    Date.parse(
      input.created_at,
    );

  const searchGlobalScoreTimestamp =
    Date.parse(
      input.global_score.created_at,
    );

  const searchEligibilityTimestamp =
    Date.parse(
      input.eligibility.created_at,
    );

  if (
    searchDecisionTimestamp <
    searchGlobalScoreTimestamp
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        "Temporal boundary violation: private decision predates SearchGlobalScore.",
    );
  }

  if (
    searchDecisionTimestamp <
    searchEligibilityTimestamp
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        "Temporal boundary violation: private decision predates SearchEligibilityResult.",
    );
  }

  const searchRelativeEvaluation =
    readAvailableRelativeEvaluation(
      input.relative_evaluation,
    );

  if (
    searchRelativeEvaluation === undefined
  ) {
    return;
  }

  const searchRelativeEvaluationTimestamp =
    Date.parse(
      searchRelativeEvaluation.created_at,
    );

  if (
    searchDecisionTimestamp <
    searchRelativeEvaluationTimestamp
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        "Temporal boundary violation: private decision predates SearchRelativeEvaluationContext.",
    );
  }
}

/* ============================================================================
 * 14. COMPLETE INPUT VALIDATION
 * ========================================================================== */

function validateInput(
  input:
    SearchPrivateDecisionInput,
): void {
  assertValidIsoTimestamp(
    input.created_at,
    "created_at",
  );

  assertNonEmptyString(
    input.cohort_id,
    "cohort_id",
  );

  validatePolicy(
    input.policy,
  );

  validateGlobalScore(
    input.global_score,
  );

  validateEligibility(
    input.eligibility,
  );

  validateRelativeEvaluationEvidence(
    input.relative_evaluation,
  );

  validateInputLineage(
    input,
  );

  validateDecisionTemporalBoundary(
    input,
  );
}

/* ============================================================================
 * 15. DETERMINISTIC STRING COLLECTION
 * ========================================================================== */

function compareCanonicalStrings(
  left: string,
  right: string,
): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function canonicalizeStrings(
  values:
    readonly string[],
): readonly string[] {
  return Object.freeze(
    [...new Set(values)]
      .filter(
        (value) =>
          value.trim().length > 0,
      )
      .sort(
        compareCanonicalStrings,
      ),
  );
}

/* ============================================================================
 * 16. BLOCK RESOLUTION
 * ----------------------------------------------------------------------------
 * BLOCK originates only from governed upstream blocking truth:
 *
 * - active canonical critical constraint
 * - ranking ineligibility
 *
 * Percentile, relative score and ALLOW thresholds never create BLOCK here.
 * ========================================================================== */

function resolveBlockingDecision(
  input:
    SearchPrivateDecisionInput,
): SearchPrivateDecisionResolution | null {
  const searchTriggeredRuleIds:
    string[] = [];

  const searchDecisionReasons:
    string[] = [];

  if (
    input.global_score
      .penalty_vector
      .critical_constraint_active
  ) {
    searchTriggeredRuleIds.push(
      XYVALA_SEARCH_PRIVATE_DECISION_RULE_IDS
        .CRITICAL_CONSTRAINT,
    );

    searchDecisionReasons.push(
      "At least one canonical critical blocking constraint is active.",
    );
  }

  if (
    !input.eligibility
      .ranking_eligible
  ) {
    searchTriggeredRuleIds.push(
      XYVALA_SEARCH_PRIVATE_DECISION_RULE_IDS
        .RANKING_INELIGIBLE,
    );

    searchDecisionReasons.push(
      "The candidate is not eligible to participate in ranking.",
    );
  }

  if (
    searchTriggeredRuleIds.length ===
    0
  ) {
    return null;
  }

  return Object.freeze({
    category:
      "BLOCK",

    triggered_rule_ids:
      canonicalizeStrings(
        searchTriggeredRuleIds,
      ),

    decision_reasons:
      canonicalizeStrings(
        searchDecisionReasons,
      ),
  });
}

/* ============================================================================
 * 17. ALLOW ELIGIBILITY GATE
 * ----------------------------------------------------------------------------
 * allow_eligible is canonical upstream truth.
 *
 * This layer consumes it and never recreates it.
 * ========================================================================== */

function resolveAllowEligibilityDecision(
  input:
    SearchPrivateDecisionInput,
): SearchPrivateDecisionResolution | null {
  if (
    input.eligibility
      .allow_eligible
  ) {
    return null;
  }

  return Object.freeze({
    category:
      "WATCH",

    triggered_rule_ids:
      Object.freeze([
        XYVALA_SEARCH_PRIVATE_DECISION_RULE_IDS
          .ALLOW_INELIGIBLE,
      ]),

    decision_reasons:
      Object.freeze([
        "The candidate is ranking-eligible but is not eligible for private ALLOW.",
      ]),
  });
}

/* ============================================================================
 * 18. RELATIVE-EVALUATION AVAILABILITY GATE
 * ----------------------------------------------------------------------------
 * ALLOW requires canonical relative cohort evidence.
 *
 * Missing relative evidence does not imply failure and does not create BLOCK.
 * It prevents ALLOW and therefore resolves defensively to WATCH.
 * ========================================================================== */

function resolveRelativeEvaluationAvailabilityDecision(
  input:
    SearchPrivateDecisionInput,
): SearchPrivateDecisionResolution | null {
  const searchRelativeEvaluation =
    readAvailableRelativeEvaluation(
      input.relative_evaluation,
    );

  if (
    searchRelativeEvaluation !== undefined
  ) {
    return null;
  }

  return Object.freeze({
    category:
      "WATCH",

    triggered_rule_ids:
      Object.freeze([
        XYVALA_SEARCH_PRIVATE_DECISION_RULE_IDS
          .RELATIVE_EVALUATION_UNAVAILABLE,
      ]),

    decision_reasons:
      Object.freeze([
        "Canonical relative cohort evaluation is unavailable.",
      ]),
  });
}

/* ============================================================================
 * 19. PRIVATE ALLOW POLICY EVALUATION
 * ----------------------------------------------------------------------------
 * These thresholds govern ALLOW only.
 *
 * Failure to satisfy them produces WATCH, never BLOCK.
 *
 * This function requires already validated AVAILABLE relative evidence.
 * ========================================================================== */

function resolveAllowPolicyDecision(
  input:
    SearchPrivateDecisionInput,
): SearchPrivateDecisionResolution {
  const searchRelativeEvaluation =
    readAvailableRelativeEvaluation(
      input.relative_evaluation,
    );

  if (
    searchRelativeEvaluation === undefined
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_PRIVATE_DECISION_MODULE_NAME}] ` +
        "Internal invariant violation: ALLOW policy evaluation requires available relative cohort evidence.",
    );
  }

  const searchTriggeredRuleIds:
    string[] = [];

  const searchDecisionReasons:
    string[] = [];

  if (
    searchRelativeEvaluation.percentile <
    input.policy.minimum_allow_percentile
  ) {
    searchTriggeredRuleIds.push(
      XYVALA_SEARCH_PRIVATE_DECISION_RULE_IDS
        .ALLOW_PERCENTILE_BELOW_POLICY,
    );

    searchDecisionReasons.push(
      "The candidate percentile is below the private ALLOW policy requirement.",
    );
  }

  if (
    input.global_score.aggregate_confidence <
    input.policy.minimum_allow_confidence
  ) {
    searchTriggeredRuleIds.push(
      XYVALA_SEARCH_PRIVATE_DECISION_RULE_IDS
        .ALLOW_CONFIDENCE_BELOW_POLICY,
    );

    searchDecisionReasons.push(
      "The aggregate score confidence is below the private ALLOW policy requirement.",
    );
  }

  if (
    searchTriggeredRuleIds.length >
    0
  ) {
    return Object.freeze({
      category:
        "WATCH",

      triggered_rule_ids:
        canonicalizeStrings(
          searchTriggeredRuleIds,
        ),

      decision_reasons:
        canonicalizeStrings(
          searchDecisionReasons,
        ),
    });
  }

  return Object.freeze({
    category:
      "ALLOW",

    triggered_rule_ids:
      Object.freeze([
        XYVALA_SEARCH_PRIVATE_DECISION_RULE_IDS
          .ALLOW_REQUIREMENTS_SATISFIED,
      ]),

    decision_reasons:
      Object.freeze([
        "The candidate is ALLOW-eligible and satisfies all private ALLOW policy requirements.",
      ]),
  });
}

/* ============================================================================
 * 20. DECISION RESOLUTION
 * ----------------------------------------------------------------------------
 * Canonical precedence:
 *
 * BLOCK
 *   critical constraint OR ranking ineligible
 *
 * WATCH
 *   ranking eligible but ALLOW-ineligible
 *
 * WATCH
 *   ALLOW-eligible but relative evaluation unavailable
 *
 * WATCH
 *   ALLOW-eligible with relative evidence but policy requirements unmet
 *
 * ALLOW
 *   ALLOW-eligible with relative evidence and all policy requirements met
 * ========================================================================== */

function resolveDecision(
  input:
    SearchPrivateDecisionInput,
): SearchPrivateDecisionResolution {
  const searchBlockingDecision =
    resolveBlockingDecision(
      input,
    );

  if (
    searchBlockingDecision !==
    null
  ) {
    return searchBlockingDecision;
  }

  const searchAllowEligibilityDecision =
    resolveAllowEligibilityDecision(
      input,
    );

  if (
    searchAllowEligibilityDecision !==
    null
  ) {
    return searchAllowEligibilityDecision;
  }

  const searchRelativeEvaluationAvailabilityDecision =
    resolveRelativeEvaluationAvailabilityDecision(
      input,
    );

  if (
    searchRelativeEvaluationAvailabilityDecision !==
    null
  ) {
    return searchRelativeEvaluationAvailabilityDecision;
  }

  return resolveAllowPolicyDecision(
    input,
  );
}

/* ============================================================================
 * 21. DECISION CONFIDENCE
 * ----------------------------------------------------------------------------
 * V1 propagates SearchGlobalScore.aggregate_confidence exactly.
 *
 * No second confidence model is created by the decision layer.
 * ========================================================================== */

function resolveDecisionConfidence(
  searchGlobalScore:
    SearchGlobalScore,
): SearchConfidenceScore {
  return searchGlobalScore
    .aggregate_confidence;
}

/* ============================================================================
 * 22. CANONICAL PRODUCER
 * ----------------------------------------------------------------------------
 * SearchGlobalScore
 * + SearchEligibilityResult
 * + optional SearchRelativeEvaluationContext evidence
 * + explicit cohort identity
 * + explicit private policy
 * → SearchPrivateDecision
 *
 * This function:
 * - validates canonical producer boundaries
 * - validates document/query/cohort lineage
 * - validates temporal causality
 * - preserves optional evidence semantics
 * - consumes canonical blocking truth
 * - consumes ranking eligibility
 * - consumes ALLOW eligibility
 * - gates ALLOW on relative-evaluation availability
 * - applies explicit ALLOW policy
 * - propagates canonical aggregate confidence
 * - produces SearchPrivateDecision
 *
 * It performs no:
 * - documentary analysis
 * - scoring
 * - penalty calculation
 * - global-score reconstruction
 * - eligibility calculation
 * - cohort normalization
 * - relative cohort evaluation
 * - percentile calculation
 * - confidence reconstruction
 * - public ranking
 * - calibration
 * - snapshot construction
 * - persistence
 * - public projection
 * - runtime mutation
 * ========================================================================== */

export function runSearchPrivateDecision(
  input:
    SearchPrivateDecisionInput,
): SearchPrivateDecision {
  validateInput(
    input,
  );

  const searchDecision =
    resolveDecision(
      input,
    );

  const searchDecisionConfidence =
    resolveDecisionConfidence(
      input.global_score,
    );

  return Object.freeze({
    contract_version:
      XYVALA_SEARCH_PRIVATE_DECISION_CONTRACT_VERSION,

    created_at:
      input.created_at,

    document_id:
      input.global_score.document_id,

    query_id:
      input.global_score.query_id,

    /**
     * Explicit orchestration identity.
     *
     * It is never reconstructed from optional relative evidence.
     */
    cohort_id:
      input.cohort_id,

    category:
      searchDecision.category,

    triggered_rule_ids:
      searchDecision.triggered_rule_ids,

    decision_reasons:
      searchDecision.decision_reasons,

    /**
     * Canonical SearchGlobalScore truth.
     */
    global_score_reference:
      input.global_score.final_raw_score,

    /**
     * Optional canonical evidence is propagated unchanged.
     */
    relative_evaluation_reference:
      input.relative_evaluation,

    /**
     * Canonical eligibility truth is propagated unchanged.
     */
    eligibility_reference:
      input.eligibility,

    decision_confidence:
      searchDecisionConfidence,

    decision_engine_version:
      XYVALA_SEARCH_PRIVATE_DECISION_MODULE_VERSION,

    decision_policy_version:
      input.policy.policy_version,

    visibility:
      "PRIVATE",
  });
}
