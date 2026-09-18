/* ============================================================================
 * FILE: lib/xyvala/search/cohort/search-cohort-batch-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical cohort batch core
 *
 * ROLE
 * - assemble one canonical SearchCohortBatch
 * - bind one validated SearchCohortDefinition to canonical cohort candidates
 * - preserve canonical document, query and cohort identities
 * - preserve one explicitly supplied distribution identity
 * - validate upstream propagation at the cohort assembly boundary
 * - propagate authorized upstream degradation
 * - produce the canonical input consumed by Cohort Normalization and
 *   Relative Cohort Evaluation
 *
 * CLASSIFICATION
 * - SEARCH COHORT BATCH CORE
 * - SEARCH DOMAIN
 * - COMPUTE
 * - CANONICAL TRANSPORT ASSEMBLY
 * - NON-SCORING
 * - NON-NORMALIZING
 * - NON-RANKING
 * - NON-DECISION
 * - NON-CALIBRATING
 * - NON-MUTATING
 * - DETERMINISTIC
 *
 * ARCHITECTURAL POSITION
 * ----------------------------------------------------------------------------
 *
 * SearchGlobalScore
 *        +
 * SearchEligibilityResult
 *        ↓
 * SearchCohortCandidate[]
 *        +
 * SearchCohortDefinition
 *        +
 * explicit SearchDistributionId
 *        ↓
 * search-cohort-batch-core.ts
 *        ↓
 * SearchCohortBatch
 *        ↓
 * COHORT_NORMALIZATION
 *        ↓
 * SearchCohortDistribution
 *        ↓
 * RELATIVE_COHORT_EVALUATION
 *
 * PIPELINE GOVERNANCE
 * ----------------------------------------------------------------------------
 * SearchCohortBatch is a canonical transport boundary.
 *
 * It is NOT introduced as an additional SearchPipelineLayer.
 *
 * Official analytical ordering therefore remains:
 *
 * ELIGIBILITY_EVALUATION
 * -> COHORT_NORMALIZATION
 * -> RELATIVE_COHORT_EVALUATION
 *
 * This core prepares the canonical input consumed at the
 * COHORT_NORMALIZATION boundary.
 *
 * OWNERSHIP
 * ----------------------------------------------------------------------------
 * cohort_definition
 * <- upstream canonical SearchCohortDefinition
 *
 * candidates
 * <- canonical SearchGlobalScore + SearchEligibilityResult projection
 *
 * candidate_count
 * <- this producer, exclusively from candidates.length
 *
 * distribution_id
 * <- authorized external identity owner
 * -> transported unchanged by this producer
 *
 * cohort_id
 * <- SearchCohortDefinition.cohort_id
 *
 * query_id
 * <- SearchCohortDefinition.query_id
 *
 * validation_state
 * <- this producer's transport/boundary validation
 *
 * degradation_reasons
 * <- deterministic propagation of authorized upstream degradation
 *
 * IMPORTANT
 * ----------------------------------------------------------------------------
 * This producer does NOT generate distribution_id.
 *
 * Identity-generation strategy is application/governance ownership and must
 * remain explicit until a dedicated canonical identity contract exists.
 *
 * The producer therefore receives one SearchDistributionId and transports it
 * unchanged.
 *
 * This avoids:
 * - hidden random identity generation;
 * - timestamp-derived identity fabrication;
 * - undocumented hashing strategies;
 * - identity reconstruction inside Cohort Normalization;
 * - distribution identity being created downstream.
 *
 * DIRECTIVES
 * - contracts before runtime
 * - one identity per analytical reality
 * - one source of truth per critical variable
 * - preserve canonical candidate references
 * - preserve canonical cohort definition reference
 * - explicit distribution identity
 * - explicit deterministic timestamp
 * - no document scoring
 * - no query relevance computation
 * - no penalty computation
 * - no analytical aggregation
 * - no eligibility recalculation
 * - no ranking-eligibility recalculation
 * - no cohort normalization
 * - no distribution statistics
 * - no normalized score
 * - no percentile
 * - no relative position
 * - no private decision
 * - no public ranking
 * - no policy selection
 * - no runtime clock read
 * - no random identifier generation
 * - no persistence
 * - no logging
 * - no unavailable-to-zero conversion
 * - no unavailable-to-neutral conversion
 *
 * EMPTY COHORT SEMANTICS
 * ----------------------------------------------------------------------------
 * An empty candidate collection is structurally valid at this boundary.
 *
 * This core must not reinterpret:
 *
 * candidates.length === 0
 *
 * as:
 * - an invalid cohort;
 * - a synthetic distribution;
 * - a zero-valued distribution;
 * - ranking eligibility failure.
 *
 * Minimum population semantics belong exclusively to the canonical Cohort
 * Normalization policy.
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * cohort definition query mismatch
 * => cohort-definition propagation boundary
 *
 * candidate query mismatch
 * => cohort-candidate projection boundary
 *
 * candidate/global-score document mismatch
 * => analytical-aggregation propagation boundary
 *
 * candidate/global-score query mismatch
 * => analytical-aggregation propagation boundary
 *
 * candidate/eligibility document mismatch
 * => eligibility propagation boundary
 *
 * candidate/eligibility query mismatch
 * => eligibility propagation boundary
 *
 * duplicate candidate document identity
 * => cohort assembly boundary
 *
 * rejected or unvalidated upstream global score
 * => analytical-aggregation boundary
 *
 * rejected or unvalidated cohort definition
 * => cohort-definition boundary
 *
 * missing distribution identity
 * => distribution-identity boundary
 *
 * temporal causality violation
 * => upstream propagation boundary
 *
 * INVARIANTS
 * - exactly one cohort identity per batch
 * - exactly one query identity per batch
 * - all candidates belong to that query
 * - each candidate represents one unique document identity
 * - candidate global score preserves candidate document/query identity
 * - candidate eligibility preserves candidate document/query identity
 * - candidate_count always equals candidates.length
 * - distribution_id is transported unchanged
 * - no ranking participation truth is recreated
 * - no statistical distribution truth is created
 * - no analytical score is modified
 * - no eligibility result is modified
 * - canonical candidate objects are preserved by reference
 * - canonical cohort definition is preserved by reference
 * ========================================================================== */

import type {
  SearchCohortBatch,
  SearchCohortCandidate,
  SearchCohortDefinition,
  SearchContractVersion,
  SearchDistributionId,
  SearchDocumentId,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchQueryId,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_COHORT_BATCH_MODULE_NAME =
  "xyvala-search-cohort-batch-core" as const;

export const XYVALA_SEARCH_COHORT_BATCH_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

export const XYVALA_SEARCH_COHORT_BATCH_CONTRACT_VERSION:
  SearchContractVersion =
    "1.0.0";

/* ============================================================================
 * 2. CANONICAL INPUT CONTRACT
 * ----------------------------------------------------------------------------
 * distribution_id is deliberately supplied explicitly.
 *
 * This core is not an identity generator.
 * ========================================================================== */

export interface SearchCohortBatchInput {
  readonly cohort_definition:
    SearchCohortDefinition;

  readonly candidates:
    readonly SearchCohortCandidate[];

  readonly distribution_id:
    SearchDistributionId;

  /**
   * Explicit deterministic orchestration timestamp.
   *
   * This producer never reads a runtime clock.
   */
  readonly created_at:
    SearchIsoTimestamp;
}

/* ============================================================================
 * 3. VALIDATION RESULT
 * ----------------------------------------------------------------------------
 * Hard structural divergence throws at first divergence.
 *
 * Authorized upstream DEGRADED state remains usable and is propagated into
 * the resulting SearchCohortBatch.
 * ========================================================================== */

export interface SearchCohortBatchValidationResult {
  readonly validation_state:
    Extract<
      SearchValidationState,
      "VALID" | "DEGRADED"
    >;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 4. SAFE PRIMITIVE ASSERTIONS
 * ========================================================================== */

function assertNonEmptyString(
  value:
    string,

  fieldName:
    string,
): void {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_BATCH_MODULE_NAME}] ` +
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

  const parsedTimestamp =
    Date.parse(
      value,
    );

  if (
    !Number.isFinite(
      parsedTimestamp,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_BATCH_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a valid ISO timestamp.`,
    );
  }
}

function assertNonNegativeInteger(
  value:
    number,

  fieldName:
    string,
): void {
  if (
    !Number.isInteger(
      value,
    ) ||
    value < 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_BATCH_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a non-negative integer.`,
    );
  }
}

/* ============================================================================
 * 5. TEMPORAL CAUSALITY
 * ----------------------------------------------------------------------------
 * Equal timestamps are authorized.
 *
 * One deterministic orchestration timestamp may legitimately cross adjacent
 * pure COMPUTE stages.
 * ========================================================================== */

function assertNotCreatedBefore(
  downstreamTimestamp:
    SearchIsoTimestamp,

  upstreamTimestamp:
    SearchIsoTimestamp,

  fieldName:
    string,
): void {
  const downstream =
    Date.parse(
      downstreamTimestamp,
    );

  const upstream =
    Date.parse(
      upstreamTimestamp,
    );

  if (
    !Number.isFinite(
      downstream,
    ) ||
    !Number.isFinite(
      upstream,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_BATCH_MODULE_NAME}] ` +
        `Temporal boundary violation: ${fieldName} contains an invalid timestamp.`,
    );
  }

  if (
    downstream <
    upstream
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_BATCH_MODULE_NAME}] ` +
        `Temporal boundary violation: ${fieldName} was produced after the cohort batch timestamp.`,
    );
  }
}

/* ============================================================================
 * 6. AUTHORIZED UPSTREAM VALIDATION STATE
 * ========================================================================== */

function assertAuthorizedValidationState(
  validationState:
    SearchValidationState,

  fieldName:
    string,
): void {
  if (
    validationState ===
      "REJECTED" ||
    validationState ===
      "UNVALIDATED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_BATCH_MODULE_NAME}] ` +
        `Boundary rejection: ${fieldName} has unauthorized validation_state ${validationState}.`,
    );
  }
}

/* ============================================================================
 * 7. COHORT DEFINITION VALIDATION
 * ========================================================================== */

function validateCohortDefinition(
  cohortDefinition:
    SearchCohortDefinition,

  createdAt:
    SearchIsoTimestamp,
): void {
  assertNonEmptyString(
    cohortDefinition.contract_version,
    "cohort_definition.contract_version",
  );

  assertValidIsoTimestamp(
    cohortDefinition.created_at,
    "cohort_definition.created_at",
  );

  assertNonEmptyString(
    cohortDefinition.cohort_id,
    "cohort_definition.cohort_id",
  );

  assertNonEmptyString(
    cohortDefinition.query_id,
    "cohort_definition.query_id",
  );

  assertNonEmptyString(
    cohortDefinition.language,
    "cohort_definition.language",
  );

  assertNonEmptyString(
    cohortDefinition.corpus_version,
    "cohort_definition.corpus_version",
  );

  assertNonEmptyString(
    cohortDefinition.comparability_policy_version,
    "cohort_definition.comparability_policy_version",
  );

  assertNonEmptyString(
    cohortDefinition.ranking_policy_version,
    "cohort_definition.ranking_policy_version",
  );

  assertNonNegativeInteger(
    cohortDefinition.minimum_cohort_size,
    "cohort_definition.minimum_cohort_size",
  );

  assertAuthorizedValidationState(
    cohortDefinition.validation_state,
    "cohort_definition",
  );

  assertNotCreatedBefore(
    createdAt,
    cohortDefinition.created_at,
    "cohort_definition.created_at",
  );
}

/* ============================================================================
 * 8. DOCUMENT / QUERY IDENTITY ASSERTIONS
 * ========================================================================== */

function assertSameDocument(
  actual:
    SearchDocumentId,

  expected:
    SearchDocumentId,

  fieldName:
    string,
): void {
  assertNonEmptyString(
    actual,
    `${fieldName}.document_id`,
  );

  if (
    actual !==
    expected
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_BATCH_MODULE_NAME}] ` +
        `First divergence: ${fieldName} belongs to another document.`,
    );
  }
}

function assertSameQuery(
  actual:
    SearchQueryId,

  expected:
    SearchQueryId,

  fieldName:
    string,
): void {
  assertNonEmptyString(
    actual,
    `${fieldName}.query_id`,
  );

  if (
    actual !==
    expected
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_BATCH_MODULE_NAME}] ` +
        `First divergence: ${fieldName} belongs to another query.`,
    );
  }
}

/* ============================================================================
 * 9. GLOBAL SCORE BOUNDARY
 * ========================================================================== */

function validateCandidateGlobalScore(
  candidate:
    SearchCohortCandidate,

  expectedQueryId:
    SearchQueryId,

  createdAt:
    SearchIsoTimestamp,

  candidateIndex:
    number,
): void {
  const globalScore =
    candidate.global_score;

  const prefix =
    `candidates[${String(candidateIndex)}].global_score`;

  assertNonEmptyString(
    globalScore.contract_version,
    `${prefix}.contract_version`,
  );

  assertValidIsoTimestamp(
    globalScore.created_at,
    `${prefix}.created_at`,
  );

  assertSameDocument(
    globalScore.document_id,
    candidate.document_id,
    prefix,
  );

  assertSameQuery(
    globalScore.query_id,
    expectedQueryId,
    prefix,
  );

  assertAuthorizedValidationState(
    globalScore.validation_state,
    prefix,
  );

  assertNotCreatedBefore(
    createdAt,
    globalScore.created_at,
    `${prefix}.created_at`,
  );

  if (
    !Number.isFinite(
      globalScore.final_raw_score,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_BATCH_MODULE_NAME}] ` +
        `Contract violation: ${prefix}.final_raw_score must be finite.`,
    );
  }
}

/* ============================================================================
 * 10. ELIGIBILITY BOUNDARY
 * ----------------------------------------------------------------------------
 * This core does not recalculate eligibility.
 *
 * It validates only propagation coherence.
 * ========================================================================== */

function validateCandidateEligibility(
  candidate:
    SearchCohortCandidate,

  expectedQueryId:
    SearchQueryId,

  createdAt:
    SearchIsoTimestamp,

  candidateIndex:
    number,
): void {
  const eligibility =
    candidate.eligibility;

  const prefix =
    `candidates[${String(candidateIndex)}].eligibility`;

  assertNonEmptyString(
    eligibility.contract_version,
    `${prefix}.contract_version`,
  );

  assertValidIsoTimestamp(
    eligibility.created_at,
    `${prefix}.created_at`,
  );

  assertSameDocument(
    eligibility.document_id,
    candidate.document_id,
    prefix,
  );

  assertSameQuery(
    eligibility.query_id,
    expectedQueryId,
    prefix,
  );

  assertNonEmptyString(
    eligibility.evaluator_module_version,
    `${prefix}.evaluator_module_version`,
  );

  assertNonEmptyString(
    eligibility.eligibility_policy_version,
    `${prefix}.eligibility_policy_version`,
  );

  assertNotCreatedBefore(
    createdAt,
    eligibility.created_at,
    `${prefix}.created_at`,
  );

  /*
   * This is a propagation invariant, not an eligibility calculation.
   *
   * ALLOW participation may never bypass ranking participation.
   */
  if (
    eligibility.allow_eligible &&
    !eligibility.ranking_eligible
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_BATCH_MODULE_NAME}] ` +
        `Boundary violation: ${prefix}.allow_eligible cannot be true while ranking_eligible is false.`,
    );
  }
}

/* ============================================================================
 * 11. CANDIDATE VALIDATION
 * ========================================================================== */

function validateCandidate(
  candidate:
    SearchCohortCandidate,

  expectedQueryId:
    SearchQueryId,

  createdAt:
    SearchIsoTimestamp,

  candidateIndex:
    number,
): void {
  const prefix =
    `candidates[${String(candidateIndex)}]`;

  assertNonEmptyString(
    candidate.document_id,
    `${prefix}.document_id`,
  );

  assertNonEmptyString(
    candidate.query_id,
    `${prefix}.query_id`,
  );

  assertSameQuery(
    candidate.query_id,
    expectedQueryId,
    prefix,
  );

  validateCandidateGlobalScore(
    candidate,
    expectedQueryId,
    createdAt,
    candidateIndex,
  );

  validateCandidateEligibility(
    candidate,
    expectedQueryId,
    createdAt,
    candidateIndex,
  );
}

/* ============================================================================
 * 12. UNIQUE DOCUMENT IDENTITY
 * ========================================================================== */

function validateUniqueCandidateDocumentIds(
  candidates:
    readonly SearchCohortCandidate[],
): void {
  const documentIds =
    new Set<SearchDocumentId>();

  for (
    const candidate of
    candidates
  ) {
    if (
      documentIds.has(
        candidate.document_id,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_COHORT_BATCH_MODULE_NAME}] ` +
          `Boundary violation: duplicate cohort document identity ${candidate.document_id}.`,
      );
    }

    documentIds.add(
      candidate.document_id,
    );
  }
}

/* ============================================================================
 * 13. COMPLETE INPUT VALIDATION
 * ========================================================================== */

export function validateSearchCohortBatchInput(
  input:
    SearchCohortBatchInput,
): void {
  assertValidIsoTimestamp(
    input.created_at,
    "created_at",
  );

  assertNonEmptyString(
    input.distribution_id,
    "distribution_id",
  );

  validateCohortDefinition(
    input.cohort_definition,
    input.created_at,
  );

  validateUniqueCandidateDocumentIds(
    input.candidates,
  );

  for (
    const [
      candidateIndex,
      candidate,
    ] of
    input.candidates.entries()
  ) {
    validateCandidate(
      candidate,
      input.cohort_definition.query_id,
      input.created_at,
      candidateIndex,
    );
  }
}

/* ============================================================================
 * 14. DEGRADATION PROPAGATION
 * ----------------------------------------------------------------------------
 * Degradation is transported deterministically.
 *
 * This core does not repair upstream degradation and does not reinterpret
 * unavailable analytical evidence.
 * ========================================================================== */

function collectSearchCohortBatchDegradationReasons(
  input:
    SearchCohortBatchInput,
): readonly string[] {
  const degradationReasons =
    new Set<string>();

  const cohortDefinition =
    input.cohort_definition;

  if (
    cohortDefinition.validation_state ===
    "DEGRADED"
  ) {
    degradationReasons.add(
      "COHORT_BATCH:COHORT_DEFINITION:DEGRADED",
    );
  }

  for (
    const reason of
    cohortDefinition.rejection_reasons
  ) {
    degradationReasons.add(
      `COHORT_BATCH:COHORT_DEFINITION:${reason}`,
    );
  }

  for (
    const candidate of
    input.candidates
  ) {
    const globalScore =
      candidate.global_score;

    if (
      globalScore.validation_state ===
      "DEGRADED"
    ) {
      degradationReasons.add(
        `COHORT_BATCH:GLOBAL_SCORE:${candidate.document_id}:DEGRADED`,
      );
    }

    for (
      const reason of
      globalScore.degradation_reasons
    ) {
      degradationReasons.add(
        `COHORT_BATCH:GLOBAL_SCORE:${candidate.document_id}:${reason}`,
      );
    }
  }

  return Object.freeze([
    ...degradationReasons,
  ].sort());
}

/* ============================================================================
 * 15. BATCH VALIDATION STATE
 * ========================================================================== */

function resolveSearchCohortBatchValidationResult(
  input:
    SearchCohortBatchInput,
): SearchCohortBatchValidationResult {
  const degradationReasons =
    collectSearchCohortBatchDegradationReasons(
      input,
    );

  return Object.freeze({
    validation_state:
      degradationReasons.length > 0
        ? "DEGRADED"
        : "VALID",

    degradation_reasons:
      degradationReasons,
  });
}

/* ============================================================================
 * 16. CANONICAL CANDIDATE COLLECTION
 * ----------------------------------------------------------------------------
 * Candidate objects themselves are transported unchanged.
 *
 * Only the collection boundary is copied and frozen.
 * ========================================================================== */

function preserveCanonicalCandidates(
  candidates:
    readonly SearchCohortCandidate[],
): readonly SearchCohortCandidate[] {
  return Object.freeze([
    ...candidates,
  ]);
}

/* ============================================================================
 * 17. CANONICAL SEARCH COHORT BATCH PRODUCER
 * ----------------------------------------------------------------------------
 * INPUT
 *
 * SearchCohortDefinition
 * + SearchCohortCandidate[]
 * + explicit SearchDistributionId
 * + explicit created_at
 *
 * OUTPUT
 *
 * SearchCohortBatch
 *
 * This producer:
 * - validates boundary identities;
 * - validates temporal causality;
 * - validates upstream authorization;
 * - rejects duplicate document identities;
 * - preserves upstream objects unchanged;
 * - derives candidate_count exclusively from candidates.length;
 * - propagates degradation;
 * - transports distribution_id unchanged.
 *
 * It performs no:
 * - scoring;
 * - penalty calculation;
 * - analytical aggregation;
 * - eligibility calculation;
 * - cohort-size eligibility decision;
 * - distribution calculation;
 * - normalization;
 * - relative evaluation;
 * - decision;
 * - ranking;
 * - identity generation;
 * - persistence.
 * ========================================================================== */

export function buildSearchCohortBatch(
  input:
    SearchCohortBatchInput,
): SearchCohortBatch {
  validateSearchCohortBatchInput(
    input,
  );

  const validation =
    resolveSearchCohortBatchValidationResult(
      input,
    );

  const canonicalCandidates =
    preserveCanonicalCandidates(
      input.candidates,
    );

  return Object.freeze({
    contract_version:
      XYVALA_SEARCH_COHORT_BATCH_CONTRACT_VERSION,

    created_at:
      input.created_at,

    cohort_id:
      input.cohort_definition.cohort_id,

    query_id:
      input.cohort_definition.query_id,

    cohort_definition:
      input.cohort_definition,

    candidates:
      canonicalCandidates,

    candidate_count:
      canonicalCandidates.length,

    distribution_id:
      input.distribution_id,

    validation_state:
      validation.validation_state,

    degradation_reasons:
      validation.degradation_reasons,
  });
}

/* ============================================================================
 * 18. STATIC OWNERSHIP DECLARATION
 * ----------------------------------------------------------------------------
 * Audit metadata only.
 *
 * SearchCohortBatch assembly is a transport responsibility immediately before
 * canonical Cohort Normalization.
 *
 * No additional SearchPipelineLayer is created.
 * ========================================================================== */

export const XYVALA_SEARCH_COHORT_BATCH_OWNERSHIP =
  Object.freeze({
    output_contract:
      "SearchCohortBatch",

    downstream_pipeline_layer:
      "COHORT_NORMALIZATION",

    candidate_count_owner:
      XYVALA_SEARCH_COHORT_BATCH_MODULE_NAME,

    distribution_id_owner:
      "EXTERNAL_AUTHORIZED_IDENTITY_OWNER",

    distribution_id_transport:
      "UNCHANGED",

    analytical_truth_created:
      false,

    ranking_truth_created:
      false,

    eligibility_truth_created:
      false,

    cohort_statistics_created:
      false,
  } as const);
