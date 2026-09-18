/* ============================================================================
 * FILE: lib/xyvala/search/cohort/search-relative-cohort-evaluation-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical relative cohort evaluation core
 *
 * ROLE
 * - consume one authorized canonical SearchCohortBatch
 * - consume its authorized canonical SearchCohortDistribution
 * - consume one canonical ranking-eligible cohort candidate
 * - validate cohort, distribution, query and document lineage
 * - preserve canonical SearchGlobalScore and SearchEligibilityResult truth
 * - consume SearchGlobalScore.final_raw_score without reconstruction
 * - calculate the candidate's private relative cohort position
 * - calculate the candidate's private percentile
 * - calculate only the normalization declared by SearchCohortDistribution
 * - calculate signed distance from the canonical cohort median
 * - calculate deterministic distances from adjacent eligible candidates
 * - produce the canonical SearchRelativeEvaluationContext
 *
 * CLASSIFICATION
 * - PRIVATE ANALYTICAL ENGINE
 * - SEARCH DOMAIN
 * - RELATIVE COHORT EVALUATION
 * - COMPUTE
 * - PURE
 * - DETERMINISTIC
 * - NON-MUTATING
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchCohortDefinition
 * - SearchCohortCandidate
 * - SearchCohortBatch
 * - SearchCohortDistribution
 * - SearchGlobalScore
 * - SearchEligibilityResult
 * - SearchRelativeEvaluationContext
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 *
 * CONSUMERS
 * - Xyvala Search private decision engine
 * - Xyvala Search calibration engine
 * - Xyvala Search private snapshot builder
 *
 * DIRECTIVES
 * - relative cohort evaluation only
 * - consume canonical upstream contracts only
 * - accept authorized VALID and DEGRADED upstream truth only
 * - reject REJECTED upstream truth
 * - reject UNVALIDATED upstream truth
 * - consume final_raw_score without recalculation
 * - consume ranking eligibility without recalculation
 * - consume cohort distribution without reconstruction
 * - preserve cohort identity
 * - preserve distribution identity
 * - preserve query identity
 * - preserve document identity
 * - preserve deterministic temporal causality
 * - no document scoring
 * - no positive score calculation
 * - no penalty calculation
 * - no global score calculation
 * - no eligibility calculation
 * - no cohort distribution recalculation
 * - no ranking-eligibility recalculation
 * - no public ranking
 * - no public position production
 * - no BLOCK
 * - no WATCH
 * - no ALLOW
 * - no calibration
 * - no snapshot construction
 * - no persistence
 * - no event publication
 * - no runtime mutation
 * - no runtime clock access
 * - no implicit timestamp
 * - no implicit normalization fallback
 * - no normalization-method substitution
 * - no normalization clamp unless explicitly defined by the method
 * - no fabricated neighbour distance
 * - no fabricated relative evaluation for an ineligible candidate
 * - no repair of invalid upstream analytical truth
 *
 * INPUTS
 * - canonical SearchCohortBatch
 * - canonical SearchCohortDistribution
 * - canonical target SearchDocumentId
 * - explicit SearchRelativeCohortEvaluationPolicy
 * - explicit deterministic creation timestamp
 *
 * OUTPUTS
 * - canonical SearchRelativeEvaluationContext
 *
 * INVARIANTS
 * - batch and distribution belong to the same cohort
 * - batch and distribution belong to the same query
 * - batch and distribution share one canonical distribution identity
 * - distribution candidate_count matches ranking-eligible cohort population
 * - target document occurs exactly once in the cohort
 * - target candidate is ranking-eligible
 * - every candidate belongs to the batch query
 * - every candidate global score belongs to its candidate document and query
 * - every candidate eligibility result belongs to its candidate document/query
 * - unauthorized global scores never participate in relative evaluation
 * - final_raw_score is consumed without reconstruction
 * - target final_raw_score belongs to canonical distribution bounds
 * - relative position is private cohort context, never public ranking
 * - equal scores retain equal analytical rank
 * - deterministic document identity stabilizes traversal only
 * - deterministic document identity never changes analytical rank
 * - percentile treatment of ties is explicit
 * - unavailable neighbour distance remains explicitly unavailable
 * - normalization method originates exclusively from SearchCohortDistribution
 * - degenerate normalization never silently changes normalization method
 * - MIN_MAX remains bounded by its own mathematical definition
 * - PERCENTILE_ONLY remains bounded by its own mathematical definition
 * - Z_SCORE may legitimately be negative or greater than one
 * - ROBUST_Z_SCORE may legitimately be negative or greater than one
 * - CUSTOM normalization is rejected without an authorized implementation
 * - relative evaluation timestamp cannot predate canonical upstream truth
 * - no input contract is mutated
 * - no runtime clock is read
 * - no random value is generated
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/search/contracts/search-pipeline-contract
 *
 * SENSITIVE AREAS
 * - producer authorization
 * - cohort identity
 * - distribution identity
 * - query identity
 * - candidate identity
 * - distribution population integrity
 * - ranking eligibility
 * - upstream validation-state integrity
 * - temporal causality
 * - tie handling
 * - percentile semantics
 * - degenerate distributions
 * - normalization-method integrity
 * - neighbour-distance semantics
 * ========================================================================== */

import type {
  SearchCohortBatch,
  SearchCohortCandidate,
  SearchCohortDistribution,
  SearchContractVersion,
  SearchDocumentId,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchNormalizedScore,
  SearchOptionalEvidence,
  SearchPercentile,
  SearchPolicyVersion,
  SearchRank,
  SearchRawScore,
  SearchRelativeEvaluationContext,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME =
  "xyvala-search-relative-cohort-evaluation-core" as const;

export const XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_VERSION:
  SearchModuleVersion = "1.0.0";

export const XYVALA_SEARCH_RELATIVE_EVALUATION_CONTRACT_VERSION:
  SearchContractVersion = "2.0.0";

/* ============================================================================
 * 2. GOVERNED RELATIVE-EVALUATION POLICY
 * ----------------------------------------------------------------------------
 * Tie, percentile and neighbour semantics are explicit private policy.
 *
 * The normalization method is not selected here.
 *
 * SearchCohortDistribution remains the single canonical source of truth for
 * the normalization method applied to the cohort.
 * ========================================================================== */

export type SearchRelativePositionTieMethod =
  "COMPETITION";

export type SearchPercentileMethod =
  "MIDRANK";

export type SearchNeighbourDistanceMethod =
  "ADJACENT_ELIGIBLE_RAW_SCORE";

export interface SearchRelativeCohortEvaluationPolicy {
  readonly policy_version:
    SearchPolicyVersion;

  /**
   * Equal final_raw_score values receive the same analytical position.
   *
   * Example:
   *
   * scores:
   * 90, 90, 80
   *
   * positions:
   * 1, 1, 3
   */
  readonly relative_position_tie_method:
    SearchRelativePositionTieMethod;

  /**
   * MIDRANK:
   *
   * percentile =
   *   (
   *     count_below +
   *     0.5 * count_equal
   *   )
   *   / cohort_size
   *   * 100
   */
  readonly percentile_method:
    SearchPercentileMethod;

  /**
   * Neighbour distances are calculated exclusively from ranking-eligible
   * candidates participating in the canonical cohort distribution.
   */
  readonly neighbour_distance_method:
    SearchNeighbourDistanceMethod;
}

/* ============================================================================
 * 3. INPUT CONTRACT
 * ========================================================================== */

export interface SearchRelativeCohortEvaluationInput {
  readonly cohort_batch:
    SearchCohortBatch;

  readonly cohort_distribution:
    SearchCohortDistribution;

  readonly document_id:
    SearchDocumentId;

  readonly policy:
    SearchRelativeCohortEvaluationPolicy;

  /**
   * Explicit deterministic timestamp supplied by the authorized orchestrator.
   *
   * This module never reads the runtime clock.
   */
  readonly created_at:
    SearchIsoTimestamp;
}

/* ============================================================================
 * 4. SAFE CONTRACT ASSERTIONS
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
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
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
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be finite.`,
    );
  }
}

function assertNonNegativeInteger(
  value: number,
  fieldName: string,
): void {
  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a non-negative integer.`,
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
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
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

  if (
    !Number.isFinite(
      Date.parse(value),
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
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
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        `Boundary rejection: ${producerName} is not authorized for relative cohort evaluation.`,
    );
  }

  if (
    validationState !== "VALID" &&
    validationState !== "DEGRADED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        `Boundary rejection: ${producerName} has unsupported validation state ${String(validationState)}.`,
    );
  }
}

/* ============================================================================
 * 5. POLICY VALIDATION
 * ========================================================================== */

function validatePolicy(
  policy:
    SearchRelativeCohortEvaluationPolicy,
): void {
  assertNonEmptyString(
    policy.policy_version,
    "policy.policy_version",
  );

  if (
    policy.relative_position_tie_method !==
    "COMPETITION"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Policy violation: unsupported relative-position tie method.",
    );
  }

  if (
    policy.percentile_method !==
    "MIDRANK"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Policy violation: unsupported percentile method.",
    );
  }

  if (
    policy.neighbour_distance_method !==
    "ADJACENT_ELIGIBLE_RAW_SCORE"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Policy violation: unsupported neighbour-distance method.",
    );
  }
}

/* ============================================================================
 * 6. COHORT BATCH BOUNDARY
 * ========================================================================== */

function validateCohortBatch(
  searchCohortBatch:
    SearchCohortBatch,
): void {
  assertNonEmptyString(
    searchCohortBatch.contract_version,
    "cohort_batch.contract_version",
  );

  assertValidIsoTimestamp(
    searchCohortBatch.created_at,
    "cohort_batch.created_at",
  );

  assertNonEmptyString(
    searchCohortBatch.cohort_id,
    "cohort_batch.cohort_id",
  );

  assertNonEmptyString(
    searchCohortBatch.query_id,
    "cohort_batch.query_id",
  );

  assertNonEmptyString(
    searchCohortBatch.distribution_id,
    "cohort_batch.distribution_id",
  );

  assertNonNegativeInteger(
    searchCohortBatch.candidate_count,
    "cohort_batch.candidate_count",
  );

  assertAuthorizedValidationState(
    searchCohortBatch.validation_state,
    "SearchCohortBatch",
  );

  if (
    searchCohortBatch.candidate_count !==
    searchCohortBatch.candidates.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Boundary violation: cohort_batch.candidate_count does not match candidates.length.",
    );
  }

  if (
    searchCohortBatch.cohort_definition.cohort_id !==
    searchCohortBatch.cohort_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Boundary violation: SearchCohortDefinition and SearchCohortBatch have different cohort identities.",
    );
  }

  if (
    searchCohortBatch.cohort_definition.query_id !==
    searchCohortBatch.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Boundary violation: SearchCohortDefinition and SearchCohortBatch have different query identities.",
    );
  }

  assertAuthorizedValidationState(
    searchCohortBatch.cohort_definition.validation_state,
    "SearchCohortDefinition",
  );

  if (
    searchCohortBatch.cohort_definition
      .rejection_reasons.length > 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Boundary rejection: SearchCohortDefinition contains canonical rejection reasons.",
    );
  }
}

/* ============================================================================
 * 7. COHORT DISTRIBUTION BOUNDARY
 * ----------------------------------------------------------------------------
 * SearchCohortDistribution is canonical cohort-level statistical truth.
 *
 * This layer validates it but never reconstructs it.
 * ========================================================================== */

function validateCohortDistribution(
  searchCohortDistribution:
    SearchCohortDistribution,
): void {
  assertNonEmptyString(
    searchCohortDistribution.contract_version,
    "cohort_distribution.contract_version",
  );

  assertValidIsoTimestamp(
    searchCohortDistribution.created_at,
    "cohort_distribution.created_at",
  );

  assertNonEmptyString(
    searchCohortDistribution.cohort_id,
    "cohort_distribution.cohort_id",
  );

  assertNonEmptyString(
    searchCohortDistribution.query_id,
    "cohort_distribution.query_id",
  );

  assertNonEmptyString(
    searchCohortDistribution.distribution_id,
    "cohort_distribution.distribution_id",
  );

  assertNonEmptyString(
    searchCohortDistribution.normalizer_module_version,
    "cohort_distribution.normalizer_module_version",
  );

  assertNonEmptyString(
    searchCohortDistribution.normalization_policy_version,
    "cohort_distribution.normalization_policy_version",
  );

  assertAuthorizedValidationState(
    searchCohortDistribution.validation_state,
    "SearchCohortDistribution",
  );

  assertPositiveInteger(
    searchCohortDistribution.candidate_count,
    "cohort_distribution.candidate_count",
  );

  assertFiniteNumber(
    searchCohortDistribution.minimum_score,
    "cohort_distribution.minimum_score",
  );

  assertFiniteNumber(
    searchCohortDistribution.maximum_score,
    "cohort_distribution.maximum_score",
  );

  assertFiniteNumber(
    searchCohortDistribution.mean_score,
    "cohort_distribution.mean_score",
  );

  assertFiniteNumber(
    searchCohortDistribution.median_score,
    "cohort_distribution.median_score",
  );

  assertFiniteNumber(
    searchCohortDistribution.standard_deviation,
    "cohort_distribution.standard_deviation",
  );

  assertFiniteNumber(
    searchCohortDistribution.first_quartile_score,
    "cohort_distribution.first_quartile_score",
  );

  assertFiniteNumber(
    searchCohortDistribution.third_quartile_score,
    "cohort_distribution.third_quartile_score",
  );

  if (
    searchCohortDistribution.standard_deviation < 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Contract violation: cohort_distribution.standard_deviation must be non-negative.",
    );
  }

  if (
    searchCohortDistribution.minimum_score >
    searchCohortDistribution.maximum_score
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Contract violation: cohort distribution minimum exceeds maximum.",
    );
  }

  if (
    searchCohortDistribution.minimum_score >
      searchCohortDistribution.first_quartile_score ||
    searchCohortDistribution.first_quartile_score >
      searchCohortDistribution.median_score ||
    searchCohortDistribution.median_score >
      searchCohortDistribution.third_quartile_score ||
    searchCohortDistribution.third_quartile_score >
      searchCohortDistribution.maximum_score
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Contract violation: canonical cohort distribution ordering must satisfy minimum <= Q1 <= median <= Q3 <= maximum.",
    );
  }

  if (
    searchCohortDistribution.mean_score <
      searchCohortDistribution.minimum_score ||
    searchCohortDistribution.mean_score >
      searchCohortDistribution.maximum_score
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Contract violation: cohort_distribution.mean_score lies outside canonical distribution bounds.",
    );
  }
}

/* ============================================================================
 * 8. BATCH / DISTRIBUTION LINEAGE
 * ========================================================================== */

function validateBatchDistributionLineage(
  searchCohortBatch:
    SearchCohortBatch,

  searchCohortDistribution:
    SearchCohortDistribution,
): void {
  if (
    searchCohortBatch.cohort_id !==
    searchCohortDistribution.cohort_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Boundary violation: SearchCohortBatch and SearchCohortDistribution have different cohort identities.",
    );
  }

  if (
    searchCohortBatch.query_id !==
    searchCohortDistribution.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Boundary violation: SearchCohortBatch and SearchCohortDistribution have different query identities.",
    );
  }

  if (
    searchCohortBatch.distribution_id !==
    searchCohortDistribution.distribution_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Boundary violation: SearchCohortBatch and SearchCohortDistribution have different distribution identities.",
    );
  }

  if (
    Date.parse(
      searchCohortDistribution.created_at,
    ) <
    Date.parse(
      searchCohortBatch.created_at,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Temporal boundary violation: SearchCohortDistribution predates SearchCohortBatch.",
    );
  }
}

/* ============================================================================
 * 9. CANDIDATE BOUNDARY VALIDATION
 * ========================================================================== */

function validateCandidate(
  searchCohortCandidate:
    SearchCohortCandidate,

  searchCohortBatch:
    SearchCohortBatch,

  candidateIndex:
    number,
): void {
  const fieldPrefix =
    `cohort_batch.candidates[${String(candidateIndex)}]`;

  assertNonEmptyString(
    searchCohortCandidate.document_id,
    `${fieldPrefix}.document_id`,
  );

  assertNonEmptyString(
    searchCohortCandidate.query_id,
    `${fieldPrefix}.query_id`,
  );

  if (
    searchCohortCandidate.query_id !==
    searchCohortBatch.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        `Boundary violation: ${fieldPrefix} belongs to a different query.`,
    );
  }

  const searchGlobalScore =
    searchCohortCandidate.global_score;

  if (
    searchGlobalScore.document_id !==
    searchCohortCandidate.document_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        `Boundary violation: ${fieldPrefix}.global_score belongs to a different document.`,
    );
  }

  if (
    searchGlobalScore.query_id !==
    searchCohortCandidate.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        `Boundary violation: ${fieldPrefix}.global_score belongs to a different query.`,
    );
  }

  assertAuthorizedValidationState(
    searchGlobalScore.validation_state,
    `${fieldPrefix}.SearchGlobalScore`,
  );

  assertFiniteNumber(
    searchGlobalScore.final_raw_score,
    `${fieldPrefix}.global_score.final_raw_score`,
  );

  const searchEligibility =
    searchCohortCandidate.eligibility;

  if (
    searchEligibility.document_id !==
    searchCohortCandidate.document_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        `Boundary violation: ${fieldPrefix}.eligibility belongs to a different document.`,
    );
  }

  if (
    searchEligibility.query_id !==
    searchCohortCandidate.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        `Boundary violation: ${fieldPrefix}.eligibility belongs to a different query.`,
    );
  }

  assertNonEmptyString(
    searchEligibility.evaluator_module_version,
    `${fieldPrefix}.eligibility.evaluator_module_version`,
  );

  assertNonEmptyString(
    searchEligibility.eligibility_policy_version,
    `${fieldPrefix}.eligibility.eligibility_policy_version`,
  );

  if (
    Date.parse(
      searchEligibility.created_at,
    ) <
    Date.parse(
      searchGlobalScore.created_at,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        `Temporal boundary violation: ${fieldPrefix}.eligibility predates its canonical SearchGlobalScore.`,
    );
  }
}

/* ============================================================================
 * 10. UNIQUE DOCUMENT IDENTITY
 * ========================================================================== */

function validateUniqueCandidateIdentities(
  searchCohortCandidates:
    readonly SearchCohortCandidate[],
): void {
  const searchDocumentIds =
    new Set<SearchDocumentId>();

  for (
    const searchCohortCandidate of
    searchCohortCandidates
  ) {
    if (
      searchDocumentIds.has(
        searchCohortCandidate.document_id,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
          `Boundary violation: duplicate cohort document identity ${searchCohortCandidate.document_id}.`,
      );
    }

    searchDocumentIds.add(
      searchCohortCandidate.document_id,
    );
  }
}

/* ============================================================================
 * 11. RANKING-ELIGIBLE DISTRIBUTION POPULATION
 * ----------------------------------------------------------------------------
 * Ranking eligibility is consumed from SearchEligibilityResult.
 *
 * It is never recomputed in this layer.
 * ========================================================================== */

function selectRankingEligibleCandidates(
  searchCohortBatch:
    SearchCohortBatch,
): readonly SearchCohortCandidate[] {
  return Object.freeze(
    searchCohortBatch.candidates.filter(
      (searchCohortCandidate) =>
        searchCohortCandidate
          .eligibility
          .ranking_eligible,
    ),
  );
}

function validateDistributionPopulation(
  searchEligibleCandidates:
    readonly SearchCohortCandidate[],

  searchCohortDistribution:
    SearchCohortDistribution,
): void {
  if (
    searchEligibleCandidates.length !==
    searchCohortDistribution.candidate_count
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Boundary violation: SearchCohortDistribution.candidate_count does not match the canonical ranking-eligible cohort population.",
    );
  }
}

/* ============================================================================
 * 12. DISTRIBUTION SCORE BOUNDARY
 * ----------------------------------------------------------------------------
 * Every ranking-eligible candidate contributed to the canonical distribution.
 *
 * Its final_raw_score must therefore lie within that distribution's canonical
 * minimum and maximum bounds.
 * ========================================================================== */

function validateEligibleScoresWithinDistribution(
  searchEligibleCandidates:
    readonly SearchCohortCandidate[],

  searchCohortDistribution:
    SearchCohortDistribution,
): void {
  for (
    const searchEligibleCandidate of
    searchEligibleCandidates
  ) {
    const searchRawScore =
      searchEligibleCandidate
        .global_score
        .final_raw_score;

    if (
      searchRawScore <
        searchCohortDistribution.minimum_score ||
      searchRawScore >
        searchCohortDistribution.maximum_score
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
          `Boundary violation: ranking-eligible candidate ${searchEligibleCandidate.document_id} has final_raw_score outside the canonical cohort distribution.`,
      );
    }
  }
}

/* ============================================================================
 * 13. TARGET CANDIDATE RESOLUTION
 * ========================================================================== */

function resolveTargetCandidate(
  searchCohortCandidates:
    readonly SearchCohortCandidate[],

  searchDocumentId:
    SearchDocumentId,
): SearchCohortCandidate {
  assertNonEmptyString(
    searchDocumentId,
    "document_id",
  );

  const searchCandidateMatches =
    searchCohortCandidates.filter(
      (searchCohortCandidate) =>
        searchCohortCandidate.document_id ===
        searchDocumentId,
    );

  if (
    searchCandidateMatches.length === 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        `Boundary violation: target document ${searchDocumentId} is absent from the canonical cohort.`,
    );
  }

  if (
    searchCandidateMatches.length > 1
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        `Boundary violation: target document ${searchDocumentId} occurs more than once in the canonical cohort.`,
    );
  }

  const searchTargetCandidate =
    searchCandidateMatches[0];

  if (
    searchTargetCandidate === undefined
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Internal invariant violation: resolved target candidate is unavailable.",
    );
  }

  return searchTargetCandidate;
}

function assertTargetRankingEligible(
  searchTargetCandidate:
    SearchCohortCandidate,
): void {
  if (
    !searchTargetCandidate
      .eligibility
      .ranking_eligible
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Relative cohort evaluation unavailable: target candidate is not ranking-eligible.",
    );
  }
}

/* ============================================================================
 * 14. DETERMINISTIC ELIGIBLE ORDER
 * ----------------------------------------------------------------------------
 * Primary order:
 * - final_raw_score descending
 *
 * Exact-score ties:
 * - document_id ascending
 *
 * document_id stabilizes traversal only.
 *
 * It never changes competition rank or percentile.
 * ========================================================================== */

function compareSearchDocumentIdentity(
  leftSearchDocumentId:
    SearchDocumentId,

  rightSearchDocumentId:
    SearchDocumentId,
): number {
  if (
    leftSearchDocumentId <
    rightSearchDocumentId
  ) {
    return -1;
  }

  if (
    leftSearchDocumentId >
    rightSearchDocumentId
  ) {
    return 1;
  }

  return 0;
}

function sortEligibleCandidates(
  searchEligibleCandidates:
    readonly SearchCohortCandidate[],
): readonly SearchCohortCandidate[] {
  return Object.freeze(
    [...searchEligibleCandidates].sort(
      (
        leftSearchCandidate,
        rightSearchCandidate,
      ) => {
        const searchScoreDifference =
          rightSearchCandidate
            .global_score
            .final_raw_score -
          leftSearchCandidate
            .global_score
            .final_raw_score;

        if (
          searchScoreDifference !== 0
        ) {
          return searchScoreDifference;
        }

        return compareSearchDocumentIdentity(
          leftSearchCandidate.document_id,
          rightSearchCandidate.document_id,
        );
      },
    ),
  );
}

/* ============================================================================
 * 15. PRIVATE RELATIVE POSITION
 * ----------------------------------------------------------------------------
 * COMPETITION:
 *
 * position =
 *   1 +
 *   count(candidate_score > target_score)
 *
 * Exact score ties receive the same analytical position.
 *
 * This value is private analytical context.
 * It is not a public result position.
 * ========================================================================== */

function calculateRelativePosition(
  searchTargetRawScore:
    SearchRawScore,

  searchEligibleCandidates:
    readonly SearchCohortCandidate[],
): SearchRank {
  const searchStrictlyHigherCount =
    searchEligibleCandidates.reduce(
      (
        count,
        searchCohortCandidate,
      ) =>
        searchCohortCandidate
          .global_score
          .final_raw_score >
        searchTargetRawScore
          ? count + 1
          : count,
      0,
    );

  return (
    searchStrictlyHigherCount + 1
  );
}

/* ============================================================================
 * 16. PRIVATE PERCENTILE
 * ----------------------------------------------------------------------------
 * MIDRANK:
 *
 * percentile =
 *   (
 *     count_below +
 *     0.5 * count_equal
 *   )
 *   / cohort_size
 *   * 100
 *
 * Equal scores therefore receive the same percentile.
 * ========================================================================== */

function calculatePercentile(
  searchTargetRawScore:
    SearchRawScore,

  searchEligibleCandidates:
    readonly SearchCohortCandidate[],
): SearchPercentile {
  const searchCohortSize =
    searchEligibleCandidates.length;

  if (
    searchCohortSize <= 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Internal invariant violation: percentile requires a non-empty ranking-eligible cohort.",
    );
  }

  let searchBelowCount = 0;
  let searchEqualCount = 0;

  for (
    const searchCohortCandidate of
    searchEligibleCandidates
  ) {
    const searchCandidateRawScore =
      searchCohortCandidate
        .global_score
        .final_raw_score;

    if (
      searchCandidateRawScore <
      searchTargetRawScore
    ) {
      searchBelowCount += 1;
      continue;
    }

    if (
      searchCandidateRawScore ===
      searchTargetRawScore
    ) {
      searchEqualCount += 1;
    }
  }

  const searchPercentile =
    (
      (
        searchBelowCount +
        0.5 * searchEqualCount
      ) /
      searchCohortSize
    ) *
    100;

  assertFiniteNumber(
    searchPercentile,
    "percentile",
  );

  if (
    searchPercentile < 0 ||
    searchPercentile > 100
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Internal invariant violation: calculated percentile must remain between 0 and 100.",
    );
  }

  return searchPercentile;
}

/* ============================================================================
 * 17. NORMALIZED SCORE
 * ----------------------------------------------------------------------------
 * SearchCohortDistribution.normalization_method is the sole source of truth.
 *
 * No fallback or normalization substitution is permitted.
 *
 * IMPORTANT
 *
 * SearchNormalizedScore is a semantic number type.
 * This function must not assume that every normalization method maps to [0,1].
 *
 * MIN_MAX
 *   (raw - minimum) / (maximum - minimum)
 *
 * Z_SCORE
 *   (raw - mean) / standard_deviation
 *
 * ROBUST_Z_SCORE
 *   (raw - median) / (Q3 - Q1)
 *
 * PERCENTILE_ONLY
 *   percentile / 100
 *
 * CUSTOM
 *   unavailable until an official custom normalization producer exists.
 * ========================================================================== */

function calculateNormalizedScore(input: {
  readonly search_raw_score:
    SearchRawScore;

  readonly search_percentile:
    SearchPercentile;

  readonly search_cohort_distribution:
    SearchCohortDistribution;
}): SearchNormalizedScore {
  const searchCohortDistribution =
    input.search_cohort_distribution;

  switch (
    searchCohortDistribution.normalization_method
  ) {
    case "MIN_MAX": {
      const searchDistributionRange =
        searchCohortDistribution.maximum_score -
        searchCohortDistribution.minimum_score;

      if (
        searchDistributionRange === 0
      ) {
        throw new Error(
          `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
            "Relative cohort evaluation unavailable: MIN_MAX normalization has a degenerate zero-width distribution.",
        );
      }

      const searchNormalizedScore =
        (
          input.search_raw_score -
          searchCohortDistribution.minimum_score
        ) /
        searchDistributionRange;

      assertFiniteNumber(
        searchNormalizedScore,
        "normalized_score",
      );

      if (
        searchNormalizedScore < 0 ||
        searchNormalizedScore > 1
      ) {
        throw new Error(
          `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
            "Internal invariant violation: canonical MIN_MAX normalized score lies outside [0,1].",
        );
      }

      return searchNormalizedScore;
    }

    case "Z_SCORE": {
      if (
        searchCohortDistribution
          .standard_deviation === 0
      ) {
        throw new Error(
          `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
            "Relative cohort evaluation unavailable: Z_SCORE normalization requires non-zero standard deviation.",
        );
      }

      const searchNormalizedScore =
        (
          input.search_raw_score -
          searchCohortDistribution.mean_score
        ) /
        searchCohortDistribution
          .standard_deviation;

      assertFiniteNumber(
        searchNormalizedScore,
        "normalized_score",
      );

      return searchNormalizedScore;
    }

    case "ROBUST_Z_SCORE": {
      const searchInterquartileRange =
        searchCohortDistribution
          .third_quartile_score -
        searchCohortDistribution
          .first_quartile_score;

      if (
        searchInterquartileRange === 0
      ) {
        throw new Error(
          `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
            "Relative cohort evaluation unavailable: ROBUST_Z_SCORE normalization requires a non-zero interquartile range.",
        );
      }

      const searchNormalizedScore =
        (
          input.search_raw_score -
          searchCohortDistribution.median_score
        ) /
        searchInterquartileRange;

      assertFiniteNumber(
        searchNormalizedScore,
        "normalized_score",
      );

      return searchNormalizedScore;
    }

    case "PERCENTILE_ONLY": {
      const searchNormalizedScore =
        input.search_percentile /
        100;

      assertFiniteNumber(
        searchNormalizedScore,
        "normalized_score",
      );

      if (
        searchNormalizedScore < 0 ||
        searchNormalizedScore > 1
      ) {
        throw new Error(
          `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
            "Internal invariant violation: PERCENTILE_ONLY normalized score lies outside [0,1].",
        );
      }

      return searchNormalizedScore;
    }

    case "CUSTOM":
      throw new Error(
        `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
          "Relative cohort evaluation unavailable: CUSTOM normalization has no authorized canonical implementation at this boundary.",
      );
  }
}

/* ============================================================================
 * 18. DISTANCE FROM MEDIAN
 * ----------------------------------------------------------------------------
 * Signed canonical raw-score distance:
 *
 * positive => candidate above cohort median
 * zero     => candidate equal to cohort median
 * negative => candidate below cohort median
 *
 * No normalization is applied.
 * ========================================================================== */

function calculateDistanceFromMedian(
  searchRawScore:
    SearchRawScore,

  searchCohortDistribution:
    SearchCohortDistribution,
): number {
  const searchDistanceFromMedian =
    searchRawScore -
    searchCohortDistribution.median_score;

  assertFiniteNumber(
    searchDistanceFromMedian,
    "distance_from_median",
  );

  return searchDistanceFromMedian;
}

/* ============================================================================
 * 19. OPTIONAL EVIDENCE FACTORIES
 * ========================================================================== */

function availableEvidence<T>(
  value: T,
): SearchOptionalEvidence<T> {
  return Object.freeze({
    availability_state:
      "AVAILABLE",

    value,
  });
}

function unavailableEvidence(
  reason: string,
): SearchOptionalEvidence<number> {
  return Object.freeze({
    availability_state:
      "UNAVAILABLE",

    reason,
  });
}

/* ============================================================================
 * 20. TARGET INDEX RESOLUTION
 * ========================================================================== */

function resolveTargetIndex(
  searchSortedCandidates:
    readonly SearchCohortCandidate[],

  searchDocumentId:
    SearchDocumentId,
): number {
  const searchTargetIndex =
    searchSortedCandidates.findIndex(
      (searchCohortCandidate) =>
        searchCohortCandidate.document_id ===
        searchDocumentId,
    );

  if (
    searchTargetIndex < 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Internal invariant violation: target candidate is absent from the canonical sorted eligible cohort.",
    );
  }

  return searchTargetIndex;
}

/* ============================================================================
 * 21. DISTANCE FROM PREVIOUS
 * ----------------------------------------------------------------------------
 * previous:
 * - immediately preceding candidate in deterministic descending score order
 *
 * distance:
 * - previous_score - target_score
 *
 * Exact-score ties legitimately produce zero.
 * ========================================================================== */

function calculateDistanceFromPrevious(input: {
  readonly search_sorted_candidates:
    readonly SearchCohortCandidate[];

  readonly search_target_index:
    number;

  readonly search_target_raw_score:
    SearchRawScore;
}): SearchOptionalEvidence<number> {
  if (
    input.search_target_index === 0
  ) {
    return unavailableEvidence(
      "NO_PREVIOUS_ELIGIBLE_CANDIDATE",
    );
  }

  const searchPreviousCandidate =
    input.search_sorted_candidates[
      input.search_target_index - 1
    ];

  if (
    searchPreviousCandidate === undefined
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Internal invariant violation: previous eligible candidate is unavailable.",
    );
  }

  const searchDistanceFromPrevious =
    searchPreviousCandidate
      .global_score
      .final_raw_score -
    input.search_target_raw_score;

  assertFiniteNumber(
    searchDistanceFromPrevious,
    "distance_from_previous",
  );

  if (
    searchDistanceFromPrevious < 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Internal invariant violation: previous candidate distance is negative.",
    );
  }

  return availableEvidence(
    searchDistanceFromPrevious,
  );
}

/* ============================================================================
 * 22. DISTANCE FROM NEXT
 * ----------------------------------------------------------------------------
 * next:
 * - immediately following candidate in deterministic descending score order
 *
 * distance:
 * - target_score - next_score
 *
 * Exact-score ties legitimately produce zero.
 * ========================================================================== */

function calculateDistanceFromNext(input: {
  readonly search_sorted_candidates:
    readonly SearchCohortCandidate[];

  readonly search_target_index:
    number;

  readonly search_target_raw_score:
    SearchRawScore;
}): SearchOptionalEvidence<number> {
  const searchNextIndex =
    input.search_target_index + 1;

  if (
    searchNextIndex >=
    input.search_sorted_candidates.length
  ) {
    return unavailableEvidence(
      "NO_NEXT_ELIGIBLE_CANDIDATE",
    );
  }

  const searchNextCandidate =
    input.search_sorted_candidates[
      searchNextIndex
    ];

  if (
    searchNextCandidate === undefined
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Internal invariant violation: next eligible candidate is unavailable.",
    );
  }

  const searchDistanceFromNext =
    input.search_target_raw_score -
    searchNextCandidate
      .global_score
      .final_raw_score;

  assertFiniteNumber(
    searchDistanceFromNext,
    "distance_from_next",
  );

  if (
    searchDistanceFromNext < 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Internal invariant violation: next candidate distance is negative.",
    );
  }

  return availableEvidence(
    searchDistanceFromNext,
  );
}

/* ============================================================================
 * 23. TEMPORAL BOUNDARY
 * ----------------------------------------------------------------------------
 * Relative cohort evaluation is downstream of:
 *
 * SearchCohortBatch
 * → SearchCohortDistribution
 * → SearchRelativeEvaluationContext
 *
 * The resulting context cannot predate its canonical producers.
 * ========================================================================== */

function validateRelativeEvaluationTemporalBoundary(
  input:
    SearchRelativeCohortEvaluationInput,

  searchTargetCandidate:
    SearchCohortCandidate,
): void {
  const searchRelativeEvaluationTimestamp =
    Date.parse(
      input.created_at,
    );

  const searchCohortBatchTimestamp =
    Date.parse(
      input.cohort_batch.created_at,
    );

  const searchCohortDistributionTimestamp =
    Date.parse(
      input.cohort_distribution.created_at,
    );

  const searchTargetGlobalScoreTimestamp =
    Date.parse(
      searchTargetCandidate
        .global_score
        .created_at,
    );

  const searchTargetEligibilityTimestamp =
    Date.parse(
      searchTargetCandidate
        .eligibility
        .created_at,
    );

  if (
    searchRelativeEvaluationTimestamp <
    searchCohortBatchTimestamp
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Temporal boundary violation: relative cohort evaluation predates SearchCohortBatch.",
    );
  }

  if (
    searchRelativeEvaluationTimestamp <
    searchCohortDistributionTimestamp
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Temporal boundary violation: relative cohort evaluation predates SearchCohortDistribution.",
    );
  }

  if (
    searchRelativeEvaluationTimestamp <
    searchTargetGlobalScoreTimestamp
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Temporal boundary violation: relative cohort evaluation predates target SearchGlobalScore.",
    );
  }

  if (
    searchRelativeEvaluationTimestamp <
    searchTargetEligibilityTimestamp
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_NAME}] ` +
        "Temporal boundary violation: relative cohort evaluation predates target SearchEligibilityResult.",
    );
  }
}

/* ============================================================================
 * 24. COMPLETE INPUT BOUNDARY
 * ========================================================================== */

function validateInput(
  input:
    SearchRelativeCohortEvaluationInput,
): void {
  assertValidIsoTimestamp(
    input.created_at,
    "created_at",
  );

  assertNonEmptyString(
    input.document_id,
    "document_id",
  );

  validatePolicy(
    input.policy,
  );

  validateCohortBatch(
    input.cohort_batch,
  );

  validateCohortDistribution(
    input.cohort_distribution,
  );

  validateBatchDistributionLineage(
    input.cohort_batch,
    input.cohort_distribution,
  );

  validateUniqueCandidateIdentities(
    input.cohort_batch.candidates,
  );

  for (
    const [
      searchCandidateIndex,
      searchCohortCandidate,
    ] of input.cohort_batch
      .candidates.entries()
  ) {
    validateCandidate(
      searchCohortCandidate,
      input.cohort_batch,
      searchCandidateIndex,
    );
  }
}

/* ============================================================================
 * 25. CANONICAL PRODUCER
 * ----------------------------------------------------------------------------
 * SearchCohortBatch
 * + SearchCohortDistribution
 * + canonical target document identity
 * + explicit relative-evaluation policy
 * → SearchRelativeEvaluationContext
 *
 * This is private relative analytical context.
 *
 * It performs no public ranking and produces no private decision.
 * ========================================================================== */

export function evaluateSearchRelativeCohort(
  input:
    SearchRelativeCohortEvaluationInput,
): SearchRelativeEvaluationContext {
  validateInput(
    input,
  );

  const searchCohortBatch =
    input.cohort_batch;

  const searchCohortDistribution =
    input.cohort_distribution;

  const searchEligibleCandidates =
    selectRankingEligibleCandidates(
      searchCohortBatch,
    );

  validateDistributionPopulation(
    searchEligibleCandidates,
    searchCohortDistribution,
  );

  validateEligibleScoresWithinDistribution(
    searchEligibleCandidates,
    searchCohortDistribution,
  );

  const searchTargetCandidate =
    resolveTargetCandidate(
      searchCohortBatch.candidates,
      input.document_id,
    );

  assertTargetRankingEligible(
    searchTargetCandidate,
  );

  validateRelativeEvaluationTemporalBoundary(
    input,
    searchTargetCandidate,
  );

  const searchRawScore =
    searchTargetCandidate
      .global_score
      .final_raw_score;

  const searchSortedEligibleCandidates =
    sortEligibleCandidates(
      searchEligibleCandidates,
    );

  const searchTargetIndex =
    resolveTargetIndex(
      searchSortedEligibleCandidates,
      searchTargetCandidate.document_id,
    );

  const searchRelativePosition =
    calculateRelativePosition(
      searchRawScore,
      searchEligibleCandidates,
    );

  const searchPercentile =
    calculatePercentile(
      searchRawScore,
      searchEligibleCandidates,
    );

  const searchNormalizedScore =
    calculateNormalizedScore({
      search_raw_score:
        searchRawScore,

      search_percentile:
        searchPercentile,

      search_cohort_distribution:
        searchCohortDistribution,
    });

  const searchDistanceFromMedian =
    calculateDistanceFromMedian(
      searchRawScore,
      searchCohortDistribution,
    );

  const searchDistanceFromPrevious =
    calculateDistanceFromPrevious({
      search_sorted_candidates:
        searchSortedEligibleCandidates,

      search_target_index:
        searchTargetIndex,

      search_target_raw_score:
        searchRawScore,
    });

  const searchDistanceFromNext =
    calculateDistanceFromNext({
      search_sorted_candidates:
        searchSortedEligibleCandidates,

      search_target_index:
        searchTargetIndex,

      search_target_raw_score:
        searchRawScore,
    });

  return Object.freeze({
    contract_version:
      XYVALA_SEARCH_RELATIVE_EVALUATION_CONTRACT_VERSION,

    created_at:
      input.created_at,

    document_id:
      searchTargetCandidate.document_id,

    query_id:
      searchCohortBatch.query_id,

    cohort_id:
      searchCohortBatch.cohort_id,

    distribution_id:
      searchCohortDistribution.distribution_id,

    raw_score:
      searchRawScore,

    normalized_score:
      searchNormalizedScore,

    relative_position:
      searchRelativePosition,

    percentile:
      searchPercentile,

    cohort_size:
      searchCohortDistribution.candidate_count,

    distance_from_median:
      searchDistanceFromMedian,

    distance_from_previous:
      searchDistanceFromPrevious,

    distance_from_next:
      searchDistanceFromNext,

    ranking_eligible:
      searchTargetCandidate
        .eligibility
        .ranking_eligible,

    evaluator_module_version:
      XYVALA_SEARCH_RELATIVE_COHORT_EVALUATION_MODULE_VERSION,

    relative_evaluation_policy_version:
      input.policy.policy_version,
  });
}
