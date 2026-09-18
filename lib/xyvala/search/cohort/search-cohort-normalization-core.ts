/* ============================================================================
 * FILE: lib/xyvala/search/cohort/search-cohort-normalization-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical cohort normalization core
 *
 * ROLE
 * - consume the canonical SearchCohortBatch
 * - consume canonical SearchEligibilityResult truth without recalculation
 * - select ranking-eligible candidates for distribution participation
 * - consume canonical SearchGlobalScore.final_raw_score without reconstruction
 * - validate cohort, query, document and distribution identities
 * - validate deterministic temporal causality
 * - determine whether a canonical statistical distribution can exist
 * - own canonical cohort-normalization availability semantics
 * - calculate deterministic descriptive cohort statistics when available
 * - bind the distribution to one explicit normalization policy
 * - propagate canonical degradation without repairing upstream truth
 * - produce SearchOptionalEvidence<SearchCohortDistribution>
 *
 * CLASSIFICATION
 * - PRIVATE ANALYTICAL ENGINE
 * - SEARCH DOMAIN
 * - COHORT_NORMALIZATION
 * - CANONICAL PRODUCER
 * - COMPUTE
 * - PURE
 * - DETERMINISTIC
 * - NON-MUTATING
 * - NON-ORCHESTRATING
 * - NON-PUBLIC
 *
 * POSITION IN OFFICIAL CHAIN
 * ----------------------------------------------------------------------------
 *
 * ELIGIBILITY_EVALUATION
 *          ↓
 * SearchCohortBatch
 *          ↓
 * COHORT_NORMALIZATION
 *          ↓
 * SearchOptionalEvidence<SearchCohortDistribution>
 *          ↓
 * RELATIVE_COHORT_EVALUATION
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchCohortDefinition
 * - SearchCohortCandidate
 * - SearchCohortBatch
 * - SearchGlobalScore
 * - SearchEligibilityResult
 * - SearchCohortDistribution
 * - SearchOptionalEvidence
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - One Identity Per Analytical Reality
 * - One Canonical Producer Per Analytical Reality
 * - Availability Before Value Rule
 * - Availability Ownership Rule
 * - Failure Classification Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 * - Compute / Observe / Mutate Separation
 *
 * CONSUMERS
 * - Xyvala Search relative cohort evaluation engine
 * - Xyvala Search private decision engine
 * - Xyvala Search calibration engine
 * - Xyvala Search private snapshot builder
 * - Xyvala Search runtime producer adapter
 *
 * AVAILABILITY OWNERSHIP
 * ----------------------------------------------------------------------------
 * COHORT_NORMALIZATION is the sole analytical owner of the statement:
 *
 * "A canonical SearchCohortDistribution can / cannot be produced from this
 * ranking-eligible population under this explicit policy."
 *
 * Therefore:
 *
 * - insufficient eligible population
 *   -> INSUFFICIENT_DATA
 *
 * - canonical score ties forbidden by an explicit selected policy
 *   -> INVALID
 *
 * - valid statistical population
 *   -> AVAILABLE<SearchCohortDistribution>
 *
 * Contract, identity, policy-shape and temporal-boundary violations remain
 * exceptions because they are invalid execution states, not legitimate
 * analytical unavailability.
 *
 * Runtime adapters must propagate this availability truth unchanged.
 *
 * DIRECTIVES
 * - cohort distribution only
 * - consume canonical upstream contracts only
 * - consume canonical final_raw_score without recalculation
 * - consume canonical ranking eligibility without recalculation
 * - preserve canonical document identity
 * - preserve canonical query identity
 * - preserve canonical cohort identity
 * - preserve canonical distribution identity
 * - own distribution availability semantics
 * - propagate canonical degradation explicitly
 * - use explicit normalization policy only
 * - use explicit deterministic statistical definitions only
 * - no document scoring
 * - no positive-score recalculation
 * - no penalty recalculation
 * - no global-score recalculation
 * - no eligibility recalculation
 * - no query-relevance recalculation
 * - no document reconstruction
 * - no signal reconstruction
 * - no score reconstruction
 * - no unavailable-evidence reconstruction
 * - no validation-state repair
 * - no REJECTED-to-DEGRADED conversion
 * - no UNVALIDATED-to-DEGRADED conversion
 * - no normalized document score production
 * - no percentile production
 * - no relative-position production
 * - no public ranking
 * - no private decision
 * - no BLOCK / WATCH / ALLOW production
 * - no calibration
 * - no implicit cohort expansion
 * - no artificial tie breaking
 * - no duplicate document identity
 * - no hidden normalization method
 * - no hidden statistical policy
 * - no implicit availability inference outside this producer
 * - no catch-all error-to-unavailable conversion
 * - no persistence
 * - no network access
 * - no file-system access
 * - no database access
 * - no queue access
 * - no cache mutation
 * - no event publication
 * - no runtime mutation
 * - no runtime clock access
 * - no implicit timestamp generation
 * - no random ordering
 *
 * INPUTS
 * - canonical SearchCohortBatch
 * - explicit SearchCohortNormalizationPolicy
 * - explicit deterministic creation timestamp
 *
 * OUTPUTS
 * - SearchOptionalEvidence<SearchCohortDistribution>
 *
 * INVARIANTS
 * - SearchCohortDefinition and SearchCohortBatch belong to the same cohort
 * - SearchCohortDefinition and SearchCohortBatch belong to the same query
 * - every candidate belongs to the batch query
 * - every candidate global score belongs to the candidate document and query
 * - every candidate eligibility result belongs to the candidate document
 *   and query
 * - candidate_count matches SearchCohortBatch.candidates.length
 * - document identities are unique inside one cohort
 * - only ranking-eligible candidates participate in the distribution
 * - ranking-ineligible candidates are never converted into eligible candidates
 * - final_raw_score is consumed without modification
 * - no canonical score is reconstructed from descriptive statistics
 * - distribution_id originates only from SearchCohortBatch
 * - minimum cohort size governs distribution availability
 * - insufficient cohort size never creates a synthetic distribution
 * - insufficient cohort size never becomes a technical exception
 * - all statistics are deterministic
 * - quartiles use one explicit deterministic definition
 * - standard deviation uses one explicit deterministic population definition
 * - VALID and DEGRADED authorized upstream truth may cross the boundary
 * - REJECTED upstream truth may never cross the boundary
 * - UNVALIDATED upstream truth may never cross the boundary
 * - degraded upstream truth remains explicitly degraded downstream
 * - distribution creation cannot predate canonical upstream producers
 * - no input contract is mutated
 * - no runtime clock is read
 * - no random value is generated
 *
 * FAILURE CLASSIFICATION
 * ----------------------------------------------------------------------------
 * THROW:
 * - malformed contract
 * - invalid identity
 * - duplicate document identity
 * - invalid policy structure
 * - non-finite canonical score
 * - REJECTED / UNVALIDATED upstream truth
 * - temporal causality violation
 *
 * RETURN INSUFFICIENT_DATA:
 * - eligible statistical population is smaller than minimum_cohort_size
 *
 * RETURN INVALID:
 * - explicit selected normalization policy cannot accept the otherwise
 *   canonical statistical population
 *
 * RETURN AVAILABLE:
 * - canonical distribution exists
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/search/contracts/search-pipeline-contract
 *
 * SENSITIVE AREAS
 * - cohort comparability
 * - ranking-eligibility filtering
 * - candidate identity duplication
 * - insufficient cohort size
 * - distribution availability ownership
 * - distribution identity
 * - deterministic quartile calculation
 * - deterministic standard-deviation calculation
 * - final_raw_score propagation
 * - validation-state propagation
 * - degradation propagation
 * - normalization-policy lineage
 * - temporal causality
 * ========================================================================== */

import type {
  SearchCohortBatch,
  SearchCohortCandidate,
  SearchCohortDistribution,
  SearchContractVersion,
  SearchCount,
  SearchDocumentId,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchOptionalEvidence,
  SearchPolicyVersion,
  SearchQueryId,
  SearchRawScore,
  SearchValidationState,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME =
  "xyvala-search-cohort-normalization-core" as const;

export const XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_VERSION:
  SearchModuleVersion = "1.1.0";

export const XYVALA_SEARCH_COHORT_DISTRIBUTION_CONTRACT_VERSION:
  SearchContractVersion = "2.0.0";

export const XYVALA_SEARCH_COHORT_QUARTILE_METHOD =
  "LINEAR_INTERPOLATION_R7" as const;

export const XYVALA_SEARCH_COHORT_STANDARD_DEVIATION_METHOD =
  "POPULATION_STANDARD_DEVIATION" as const;

/* ============================================================================
 * 2. NORMALIZATION METHOD
 * ----------------------------------------------------------------------------
 * This producer creates descriptive distribution truth.
 *
 * It does not calculate candidate-level normalized scores.
 * ========================================================================== */

export type SearchCohortNormalizationMethod =
  SearchCohortDistribution["normalization_method"];

/* ============================================================================
 * 3. NORMALIZATION POLICY
 * ----------------------------------------------------------------------------
 * Statistical policy is explicit and versioned.
 *
 * Policy selection belongs to the authorized outer policy-governance /
 * runtime-adapter boundary.
 *
 * This core validates and consumes the supplied policy.
 * It never selects another policy implicitly.
 * ========================================================================== */

export interface SearchCohortNormalizationPolicy {
  readonly policy_version:
    SearchPolicyVersion;

  /**
   * Method consumed later by the canonical relative cohort evaluator.
   *
   * This producer records the method but does not calculate an individual
   * normalized candidate score.
   */
  readonly normalization_method:
    SearchCohortNormalizationMethod;

  /**
   * Optional strict statistical admissibility constraint.
   *
   * Canonical ties are valid analytical outcomes and are never artificially
   * broken by this producer.
   *
   * When this flag is true and ties exist, distribution availability becomes
   * INVALID rather than mutating canonical raw scores.
   */
  readonly require_distinct_scores:
    boolean;
}

/* ============================================================================
 * 4. INPUT CONTRACT
 * ========================================================================== */

export interface SearchCohortNormalizationInput {
  readonly cohort_batch:
    SearchCohortBatch;

  readonly policy:
    SearchCohortNormalizationPolicy;

  /**
   * Explicit deterministic orchestration timestamp.
   *
   * This COMPUTE module never reads the runtime clock.
   */
  readonly created_at:
    SearchIsoTimestamp;
}

/* ============================================================================
 * 5. OPTIONAL-EVIDENCE CONSTRUCTORS
 * ----------------------------------------------------------------------------
 * These constructors only express the analytical availability truth owned by
 * this producer.
 *
 * They do not transform arbitrary exceptions into availability states.
 * ========================================================================== */

function available<T>(
  value: T,
): SearchOptionalEvidence<T> {
  return Object.freeze({
    availability_state:
      "AVAILABLE",
    value,
  });
}

function insufficientData<T>(
  reason: string,
): SearchOptionalEvidence<T> {
  assertNonEmptyString(
    reason,
    "insufficient_data.reason",
  );

  return Object.freeze({
    availability_state:
      "INSUFFICIENT_DATA",
    reason,
  });
}

function invalidEvidence<T>(
  reason: string,
): SearchOptionalEvidence<T> {
  assertNonEmptyString(
    reason,
    "invalid_evidence.reason",
  );

  return Object.freeze({
    availability_state:
      "INVALID",
    reason,
  });
}

/* ============================================================================
 * 6. SAFE PRIMITIVE ASSERTIONS
 * ========================================================================== */

function assertNonEmptyString(
  value: string,
  fieldName: string,
): void {
  if (
    typeof value !==
      "string" ||
    value.trim().length ===
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a non-empty string.`,
    );
  }
}

function assertBoolean(
  value: boolean,
  fieldName: string,
): void {
  if (
    typeof value !==
    "boolean"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        `Policy violation: ${fieldName} must be boolean.`,
    );
  }
}

function assertFiniteNumber(
  value: number,
  fieldName: string,
): void {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be finite.`,
    );
  }
}

function assertNonNegativeNumber(
  value: number,
  fieldName: string,
): void {
  assertFiniteNumber(
    value,
    fieldName,
  );

  if (
    value < 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be non-negative.`,
    );
  }
}

function assertNonNegativeInteger(
  value: number,
  fieldName: string,
): void {
  if (
    !Number.isInteger(
      value,
    ) ||
    value < 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a non-negative integer.`,
    );
  }
}

function assertPositiveInteger(
  value: number,
  fieldName: string,
): void {
  if (
    !Number.isInteger(
      value,
    ) ||
    value <= 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
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
      Date.parse(
        value,
      ),
    )
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a valid ISO timestamp.`,
    );
  }
}

function assertAuthorizedValidationState(
  validationState:
    SearchValidationState,
  producerName: string,
): void {
  if (
    validationState ===
      "REJECTED" ||
    validationState ===
      "UNVALIDATED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        `Boundary rejection: ${producerName} is not authorized for cohort normalization.`,
    );
  }

  if (
    validationState !==
      "VALID" &&
    validationState !==
      "DEGRADED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        `Boundary rejection: ${producerName} has unsupported validation state ${String(validationState)}.`,
    );
  }
}

/* ============================================================================
 * 7. NORMALIZATION POLICY VALIDATION
 * ========================================================================== */

function validateNormalizationPolicy(
  policy:
    SearchCohortNormalizationPolicy,
): void {
  if (
    policy === null ||
    typeof policy !==
      "object"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Policy boundary violation: an explicit SearchCohortNormalizationPolicy is required.",
    );
  }

  assertNonEmptyString(
    policy.policy_version,
    "policy.policy_version",
  );

  assertBoolean(
    policy.require_distinct_scores,
    "policy.require_distinct_scores",
  );

  switch (
    policy.normalization_method
  ) {
    case "MIN_MAX":
    case "Z_SCORE":
    case "ROBUST_Z_SCORE":
    case "PERCENTILE_ONLY":
    case "CUSTOM":
      break;

    default: {
      const unreachable:
        never =
        policy.normalization_method;

      throw new Error(
        `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
          `Policy violation: unsupported normalization method ${String(unreachable)}.`,
      );
    }
  }
}

/* ============================================================================
 * 8. COHORT DEFINITION PRODUCER BOUNDARY
 * ----------------------------------------------------------------------------
 * SearchCohortDefinition is canonical cohort-comparability truth.
 *
 * It is consumed without reinterpretation or repair.
 * ========================================================================== */

function validateCohortDefinition(
  batch:
    SearchCohortBatch,
): void {
  const searchCohortDefinition =
    batch.cohort_definition;

  assertNonEmptyString(
    searchCohortDefinition.contract_version,
    "cohort_definition.contract_version",
  );

  assertValidIsoTimestamp(
    searchCohortDefinition.created_at,
    "cohort_definition.created_at",
  );

  assertNonEmptyString(
    searchCohortDefinition.cohort_id,
    "cohort_definition.cohort_id",
  );

  assertNonEmptyString(
    searchCohortDefinition.query_id,
    "cohort_definition.query_id",
  );

  assertNonEmptyString(
    searchCohortDefinition.language,
    "cohort_definition.language",
  );

  assertNonEmptyString(
    searchCohortDefinition.corpus_version,
    "cohort_definition.corpus_version",
  );

  assertNonEmptyString(
    searchCohortDefinition.comparability_policy_version,
    "cohort_definition.comparability_policy_version",
  );

  assertNonEmptyString(
    searchCohortDefinition.ranking_policy_version,
    "cohort_definition.ranking_policy_version",
  );

  assertPositiveInteger(
    searchCohortDefinition.minimum_cohort_size,
    "cohort_definition.minimum_cohort_size",
  );

  assertAuthorizedValidationState(
    searchCohortDefinition.validation_state,
    "SearchCohortDefinition",
  );

  if (
    searchCohortDefinition
      .rejection_reasons
      .length >
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Boundary rejection: SearchCohortDefinition contains canonical rejection reasons.",
    );
  }
}

/* ============================================================================
 * 9. COHORT BATCH PRODUCER BOUNDARY
 * ----------------------------------------------------------------------------
 * SearchCohortBatch is canonical transport truth.
 *
 * This producer does not alter the supplied population.
 *
 * Statistical participation is derived only from canonical ranking_eligible
 * truth already present on each candidate.
 * ========================================================================== */

function validateCohortBatchBase(
  batch:
    SearchCohortBatch,
): void {
  assertNonEmptyString(
    batch.contract_version,
    "cohort_batch.contract_version",
  );

  assertValidIsoTimestamp(
    batch.created_at,
    "cohort_batch.created_at",
  );

  assertNonEmptyString(
    batch.cohort_id,
    "cohort_batch.cohort_id",
  );

  assertNonEmptyString(
    batch.query_id,
    "cohort_batch.query_id",
  );

  assertNonEmptyString(
    batch.distribution_id,
    "cohort_batch.distribution_id",
  );

  assertNonNegativeInteger(
    batch.candidate_count,
    "cohort_batch.candidate_count",
  );

  assertAuthorizedValidationState(
    batch.validation_state,
    "SearchCohortBatch",
  );

  if (
    batch.candidate_count !==
    batch.candidates.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Boundary violation: cohort_batch.candidate_count does not match candidates.length.",
    );
  }

  if (
    batch.cohort_definition
      .cohort_id !==
    batch.cohort_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Boundary violation: SearchCohortDefinition and SearchCohortBatch have different cohort identities.",
    );
  }

  if (
    batch.cohort_definition
      .query_id !==
    batch.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Boundary violation: SearchCohortDefinition and SearchCohortBatch have different query identities.",
    );
  }
}

/* ============================================================================
 * 10. CANDIDATE PRODUCER BOUNDARY
 * ----------------------------------------------------------------------------
 * SearchCohortCandidate binds canonical:
 *
 * - document identity
 * - query identity
 * - SearchGlobalScore
 * - SearchEligibilityResult
 *
 * None of these truths are reconstructed here.
 * ========================================================================== */

function validateCandidate(
  candidate:
    SearchCohortCandidate,

  canonicalQueryId:
    SearchQueryId,

  candidateIndex:
    number,
): void {
  const prefix =
    `cohort_batch.candidates[${String(candidateIndex)}]`;

  assertNonEmptyString(
    candidate.document_id,
    `${prefix}.document_id`,
  );

  assertNonEmptyString(
    candidate.query_id,
    `${prefix}.query_id`,
  );

  if (
    candidate.query_id !==
    canonicalQueryId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        `Boundary violation: ${prefix} belongs to a different query.`,
    );
  }

  const searchGlobalScore =
    candidate.global_score;

  assertNonEmptyString(
    searchGlobalScore.contract_version,
    `${prefix}.global_score.contract_version`,
  );

  assertValidIsoTimestamp(
    searchGlobalScore.created_at,
    `${prefix}.global_score.created_at`,
  );

  assertNonEmptyString(
    searchGlobalScore.document_id,
    `${prefix}.global_score.document_id`,
  );

  assertNonEmptyString(
    searchGlobalScore.query_id,
    `${prefix}.global_score.query_id`,
  );

  if (
    searchGlobalScore.document_id !==
    candidate.document_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        `Boundary violation: ${prefix}.global_score belongs to a different document.`,
    );
  }

  if (
    searchGlobalScore.query_id !==
    canonicalQueryId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        `Boundary violation: ${prefix}.global_score belongs to a different query.`,
    );
  }

  assertAuthorizedValidationState(
    searchGlobalScore.validation_state,
    `${prefix}.global_score`,
  );

  assertFiniteNumber(
    searchGlobalScore.final_raw_score,
    `${prefix}.global_score.final_raw_score`,
  );

  const searchEligibility =
    candidate.eligibility;

  assertNonEmptyString(
    searchEligibility.contract_version,
    `${prefix}.eligibility.contract_version`,
  );

  assertValidIsoTimestamp(
    searchEligibility.created_at,
    `${prefix}.eligibility.created_at`,
  );

  assertNonEmptyString(
    searchEligibility.document_id,
    `${prefix}.eligibility.document_id`,
  );

  assertNonEmptyString(
    searchEligibility.query_id,
    `${prefix}.eligibility.query_id`,
  );

  if (
    searchEligibility.document_id !==
    candidate.document_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        `Boundary violation: ${prefix}.eligibility belongs to a different document.`,
    );
  }

  if (
    searchEligibility.query_id !==
    canonicalQueryId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        `Boundary violation: ${prefix}.eligibility belongs to a different query.`,
    );
  }

  assertNonEmptyString(
    searchEligibility.evaluator_module_version,
    `${prefix}.eligibility.evaluator_module_version`,
  );

  assertNonEmptyString(
    searchEligibility.eligibility_policy_version,
    `${prefix}.eligibility.eligibility_policy_version`,
  );

  if (
    searchEligibility.allow_eligible &&
    !searchEligibility.ranking_eligible
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        `Boundary violation: ${prefix}.eligibility cannot be ALLOW eligible while ranking ineligible.`,
    );
  }
}

/* ============================================================================
 * 11. UNIQUE DOCUMENT IDENTITY VALIDATION
 * ----------------------------------------------------------------------------
 * One canonical document identity may occur only once in one cohort.
 *
 * Duplicate participation would distort the statistical population and is a
 * boundary violation rather than an analytical signal.
 * ========================================================================== */

function validateUniqueDocumentIdentities(
  candidates:
    readonly SearchCohortCandidate[],
): void {
  const searchDocumentIds =
    new Set<SearchDocumentId>();

  for (
    const candidate of
    candidates
  ) {
    if (
      searchDocumentIds.has(
        candidate.document_id,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
          `Boundary violation: duplicate cohort document identity ${candidate.document_id}.`,
      );
    }

    searchDocumentIds.add(
      candidate.document_id,
    );
  }
}

/* ============================================================================
 * 12. TEMPORAL CAUSALITY
 * ----------------------------------------------------------------------------
 * Canonical production order:
 *
 * SearchCohortDefinition
 * -> SearchGlobalScore
 * -> SearchEligibilityResult
 * -> SearchCohortBatch
 * -> SearchCohortDistribution
 *
 * Equal timestamps remain valid when orchestration deliberately supplies one
 * deterministic timestamp across adjacent pure stages.
 *
 * Date.parse() is used only to validate supplied timestamps.
 * No runtime clock is read.
 * ========================================================================== */

function validateNormalizationTemporalBoundary(
  input:
    SearchCohortNormalizationInput,
): void {
  const normalizationTimestamp =
    Date.parse(
      input.created_at,
    );

  const searchCohortBatch =
    input.cohort_batch;

  const searchCohortBatchTimestamp =
    Date.parse(
      searchCohortBatch.created_at,
    );

  const searchCohortDefinitionTimestamp =
    Date.parse(
      searchCohortBatch
        .cohort_definition
        .created_at,
    );

  if (
    searchCohortBatchTimestamp <
    searchCohortDefinitionTimestamp
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Temporal boundary violation: SearchCohortBatch predates SearchCohortDefinition.",
    );
  }

  if (
    normalizationTimestamp <
    searchCohortBatchTimestamp
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Temporal boundary violation: cohort normalization predates SearchCohortBatch.",
    );
  }

  for (
    const [
      index,
      candidate,
    ] of searchCohortBatch
      .candidates
      .entries()
  ) {
    const searchGlobalScoreTimestamp =
      Date.parse(
        candidate.global_score.created_at,
      );

    const searchEligibilityTimestamp =
      Date.parse(
        candidate.eligibility.created_at,
      );

    if (
      searchEligibilityTimestamp <
      searchGlobalScoreTimestamp
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
          `Temporal boundary violation: cohort_batch.candidates[${String(index)}].eligibility predates its SearchGlobalScore.`,
      );
    }

    if (
      searchCohortBatchTimestamp <
      searchGlobalScoreTimestamp
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
          `Temporal boundary violation: SearchCohortBatch predates cohort_batch.candidates[${String(index)}].global_score.`,
      );
    }

    if (
      searchCohortBatchTimestamp <
      searchEligibilityTimestamp
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
          `Temporal boundary violation: SearchCohortBatch predates cohort_batch.candidates[${String(index)}].eligibility.`,
      );
    }
  }
}

/* ============================================================================
 * 13. COMPLETE INPUT VALIDATION
 * ----------------------------------------------------------------------------
 * Contract Before Runtime:
 *
 * no statistical qualification or calculation begins before all canonical
 * producer boundaries are validated.
 * ========================================================================== */

function validateNormalizationInput(
  input:
    SearchCohortNormalizationInput,
): void {
  assertValidIsoTimestamp(
    input.created_at,
    "created_at",
  );

  validateNormalizationPolicy(
    input.policy,
  );

  validateCohortDefinition(
    input.cohort_batch,
  );

  validateCohortBatchBase(
    input.cohort_batch,
  );

  validateUniqueDocumentIdentities(
    input.cohort_batch.candidates,
  );

  for (
    const [
      index,
      candidate,
    ] of input.cohort_batch
      .candidates
      .entries()
  ) {
    validateCandidate(
      candidate,
      input.cohort_batch.query_id,
      index,
    );
  }

  validateNormalizationTemporalBoundary(
    input,
  );
}

/* ============================================================================
 * 14. RANKING-ELIGIBLE COHORT SELECTION
 * ----------------------------------------------------------------------------
 * SearchEligibilityResult is the sole participation authority.
 *
 * This producer does not reconsider eligibility.
 * ========================================================================== */

function selectRankingEligibleCandidates(
  batch:
    SearchCohortBatch,
): readonly SearchCohortCandidate[] {
  return Object.freeze(
    batch.candidates.filter(
      (
        candidate,
      ) =>
        candidate
          .eligibility
          .ranking_eligible,
    ),
  );
}

/* ============================================================================
 * 15. MINIMUM COHORT AVAILABILITY
 * ----------------------------------------------------------------------------
 * Insufficient population is a legitimate analytical outcome.
 *
 * It is not:
 * - a malformed input
 * - a technical runtime failure
 * - a synthetic zero distribution
 *
 * COHORT_NORMALIZATION owns this determination.
 * ========================================================================== */

function hasMinimumCohortSize(
  candidates:
    readonly SearchCohortCandidate[],
  minimumCohortSize:
    SearchCount,
): boolean {
  return (
    candidates.length >=
    minimumCohortSize
  );
}

function buildInsufficientCohortReason(
  candidates:
    readonly SearchCohortCandidate[],
  minimumCohortSize:
    SearchCount,
): string {
  return (
    "COHORT_NORMALIZATION:" +
    "INSUFFICIENT_RANKING_ELIGIBLE_CANDIDATES:" +
    `available=${String(candidates.length)}:` +
    `required=${String(minimumCohortSize)}`
  );
}

/* ============================================================================
 * 16. CANONICAL RAW SCORE EXTRACTION
 * ----------------------------------------------------------------------------
 * SearchGlobalScore.final_raw_score is canonical input truth.
 *
 * It is never reconstructed from positive_score and penalty_value.
 * ========================================================================== */

function extractCanonicalRawScores(
  candidates:
    readonly SearchCohortCandidate[],
): readonly SearchRawScore[] {
  return Object.freeze(
    candidates.map(
      (
        candidate,
        index,
      ) => {
        const searchRawScore =
          candidate
            .global_score
            .final_raw_score;

        assertFiniteNumber(
          searchRawScore,
          `eligible_candidates[${String(index)}].global_score.final_raw_score`,
        );

        return searchRawScore;
      },
    ),
  );
}

/* ============================================================================
 * 17. DISTINCT SCORE POLICY
 * ----------------------------------------------------------------------------
 * Equal canonical raw scores remain valid analytical truth.
 *
 * They are never modified to manufacture ordering.
 *
 * If the externally selected policy explicitly requires distinct values,
 * canonical ties make this distribution unavailable under that policy.
 *
 * The scores themselves remain unchanged.
 * ========================================================================== */

function containsCanonicalScoreTies(
  scores:
    readonly SearchRawScore[],
): boolean {
  return (
    new Set(
      scores,
    ).size !==
    scores.length
  );
}

function buildDistinctScorePolicyFailureReason(): string {
  return (
    "COHORT_NORMALIZATION:" +
    "DISTINCT_SCORE_POLICY_NOT_SATISFIED:" +
    "CANONICAL_RAW_SCORE_TIES_PRESENT"
  );
}

/* ============================================================================
 * 18. DETERMINISTIC SCORE SORTING
 * ----------------------------------------------------------------------------
 * Numerical ascending ordering only.
 *
 * Candidate identity, locale, timestamps and insertion ordering never alter
 * descriptive cohort statistics.
 * ========================================================================== */

function sortScoresAscending(
  scores:
    readonly SearchRawScore[],
): readonly SearchRawScore[] {
  return Object.freeze(
    [
      ...scores,
    ].sort(
      (
        left,
        right,
      ) =>
        left -
        right,
    ),
  );
}

/* ============================================================================
 * 19. ARITHMETIC MEAN
 * ========================================================================== */

function calculateMean(
  scores:
    readonly SearchRawScore[],
): SearchRawScore {
  if (
    scores.length ===
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Internal invariant violation: mean requires at least one canonical raw score.",
    );
  }

  const searchTotal =
    scores.reduce(
      (
        accumulator,
        searchRawScore,
      ) =>
        accumulator +
        searchRawScore,
      0,
    );

  const searchMean =
    searchTotal /
    scores.length;

  assertFiniteNumber(
    searchMean,
    "mean_score",
  );

  return searchMean;
}

/* ============================================================================
 * 20. QUANTILE — R7 LINEAR INTERPOLATION
 * ----------------------------------------------------------------------------
 * Canonical deterministic definition:
 *
 * h = (n - 1) * p
 *
 * lower = floor(h)
 * upper = ceil(h)
 *
 * Q(p) =
 * lower_value +
 * (upper_value - lower_value) * (h - lower)
 *
 * This corresponds to R-7 linear interpolation.
 * ========================================================================== */

function calculateQuantileR7(
  sortedScores:
    readonly SearchRawScore[],
  probability:
    number,
): SearchRawScore {
  if (
    sortedScores.length ===
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Internal invariant violation: quantile requires at least one canonical raw score.",
    );
  }

  if (
    !Number.isFinite(
      probability,
    ) ||
    probability < 0 ||
    probability > 1
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Internal invariant violation: quantile probability must be between 0 and 1.",
    );
  }

  if (
    sortedScores.length ===
    1
  ) {
    const searchOnlyScore =
      sortedScores[0];

    if (
      searchOnlyScore ===
      undefined
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
          "Internal invariant violation: single-value cohort score is unavailable.",
      );
    }

    return searchOnlyScore;
  }

  const searchPosition =
    (
      sortedScores.length -
      1
    ) *
    probability;

  const searchLowerIndex =
    Math.floor(
      searchPosition,
    );

  const searchUpperIndex =
    Math.ceil(
      searchPosition,
    );

  const searchLowerValue =
    sortedScores[
      searchLowerIndex
    ];

  const searchUpperValue =
    sortedScores[
      searchUpperIndex
    ];

  if (
    searchLowerValue ===
      undefined ||
    searchUpperValue ===
      undefined
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Internal invariant violation: quantile index is outside the canonical sorted cohort.",
    );
  }

  if (
    searchLowerIndex ===
    searchUpperIndex
  ) {
    return searchLowerValue;
  }

  const searchInterpolationFraction =
    searchPosition -
    searchLowerIndex;

  const searchQuantile =
    searchLowerValue +
    (
      searchUpperValue -
      searchLowerValue
    ) *
      searchInterpolationFraction;

  assertFiniteNumber(
    searchQuantile,
    "quantile",
  );

  return searchQuantile;
}

/* ============================================================================
 * 21. MEDIAN
 * ========================================================================== */

function calculateMedian(
  sortedScores:
    readonly SearchRawScore[],
): SearchRawScore {
  return calculateQuantileR7(
    sortedScores,
    0.5,
  );
}

/* ============================================================================
 * 22. POPULATION STANDARD DEVIATION
 * ----------------------------------------------------------------------------
 * SearchCohortDistribution describes the complete ranking-eligible statistical
 * population supplied to this producer.
 *
 * Population variance is therefore canonical:
 *
 * variance = sum((x - mean)^2) / N
 *
 * No Bessel correction is applied.
 * ========================================================================== */

function calculatePopulationStandardDeviation(
  scores:
    readonly SearchRawScore[],
  mean:
    SearchRawScore,
): number {
  if (
    scores.length ===
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Internal invariant violation: standard deviation requires at least one canonical raw score.",
    );
  }

  const searchSquaredDeviationSum =
    scores.reduce(
      (
        accumulator,
        searchRawScore,
      ) => {
        const searchDeviation =
          searchRawScore -
          mean;

        return (
          accumulator +
          searchDeviation *
            searchDeviation
        );
      },
      0,
    );

  const searchVariance =
    searchSquaredDeviationSum /
    scores.length;

  const searchStandardDeviation =
    Math.sqrt(
      searchVariance,
    );

  assertNonNegativeNumber(
    searchStandardDeviation,
    "standard_deviation",
  );

  return searchStandardDeviation;
}

/* ============================================================================
 * 23. CANONICAL DISTRIBUTION STATISTICS
 * ========================================================================== */

interface SearchCalculatedCohortStatistics {
  readonly minimum_score:
    SearchRawScore;

  readonly maximum_score:
    SearchRawScore;

  readonly mean_score:
    SearchRawScore;

  readonly median_score:
    SearchRawScore;

  readonly standard_deviation:
    number;

  readonly first_quartile_score:
    SearchRawScore;

  readonly third_quartile_score:
    SearchRawScore;
}

function calculateCohortStatistics(
  scores:
    readonly SearchRawScore[],
): SearchCalculatedCohortStatistics {
  if (
    scores.length ===
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Internal invariant violation: cohort statistics require at least one canonical raw score.",
    );
  }

  const searchSortedScores =
    sortScoresAscending(
      scores,
    );

  const searchMinimumScore =
    searchSortedScores[0];

  const searchMaximumScore =
    searchSortedScores[
      searchSortedScores.length -
      1
    ];

  if (
    searchMinimumScore ===
      undefined ||
    searchMaximumScore ===
      undefined
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Internal invariant violation: canonical sorted cohort boundaries are unavailable.",
    );
  }

  const searchMeanScore =
    calculateMean(
      searchSortedScores,
    );

  const searchMedianScore =
    calculateMedian(
      searchSortedScores,
    );

  const searchFirstQuartileScore =
    calculateQuantileR7(
      searchSortedScores,
      0.25,
    );

  const searchThirdQuartileScore =
    calculateQuantileR7(
      searchSortedScores,
      0.75,
    );

  const searchStandardDeviation =
    calculatePopulationStandardDeviation(
      searchSortedScores,
      searchMeanScore,
    );

  return Object.freeze({
    minimum_score:
      searchMinimumScore,

    maximum_score:
      searchMaximumScore,

    mean_score:
      searchMeanScore,

    median_score:
      searchMedianScore,

    standard_deviation:
      searchStandardDeviation,

    first_quartile_score:
      searchFirstQuartileScore,

    third_quartile_score:
      searchThirdQuartileScore,
  });
}

/* ============================================================================
 * 24. DISTRIBUTION DEGRADATION PROPAGATION
 * ----------------------------------------------------------------------------
 * SearchCohortDistribution may be VALID or DEGRADED.
 *
 * Degradation originates only from canonical truth actually governing or
 * participating in distribution production:
 *
 * - SearchCohortDefinition validation state
 * - SearchCohortBatch validation state
 * - SearchCohortBatch degradation reasons
 * - ranking-eligible SearchGlobalScore validation states
 * - ranking-eligible SearchGlobalScore degradation reasons
 *
 * SearchEligibilityResult remains participation authority.
 *
 * Ranking-ineligible candidates do not contribute statistical degradation
 * because they do not participate in the distribution.
 * ========================================================================== */

function collectCohortDistributionDegradationReasons(
  batch:
    SearchCohortBatch,

  eligibleCandidates:
    readonly SearchCohortCandidate[],
): readonly string[] {
  const searchDegradationReasons =
    new Set<string>();

  if (
    batch
      .cohort_definition
      .validation_state ===
    "DEGRADED"
  ) {
    searchDegradationReasons.add(
      "COHORT_NORMALIZATION:COHORT_DEFINITION:DEGRADED",
    );
  }

  if (
    batch.validation_state ===
    "DEGRADED"
  ) {
    searchDegradationReasons.add(
      "COHORT_NORMALIZATION:COHORT_BATCH:DEGRADED",
    );
  }

  for (
    const reason of
    batch.degradation_reasons
  ) {
    searchDegradationReasons.add(
      `COHORT_NORMALIZATION:COHORT_BATCH:${reason}`,
    );
  }

  for (
    const candidate of
    eligibleCandidates
  ) {
    const searchGlobalScore =
      candidate.global_score;

    if (
      searchGlobalScore
        .validation_state ===
      "DEGRADED"
    ) {
      searchDegradationReasons.add(
        `COHORT_NORMALIZATION:GLOBAL_SCORE:${candidate.document_id}:DEGRADED`,
      );
    }

    for (
      const reason of
      searchGlobalScore
        .degradation_reasons
    ) {
      searchDegradationReasons.add(
        `COHORT_NORMALIZATION:GLOBAL_SCORE:${candidate.document_id}:${reason}`,
      );
    }
  }

  return Object.freeze(
    [
      ...searchDegradationReasons,
    ].sort(),
  );
}

/* ============================================================================
 * 25. DISTRIBUTION VALIDATION STATE
 * ----------------------------------------------------------------------------
 * REJECTED and UNVALIDATED states are stopped before statistical computation.
 *
 * Therefore an AVAILABLE distribution may be:
 *
 * - VALID
 * - DEGRADED
 * ========================================================================== */

function resolveCohortDistributionValidationState(
  degradationReasons:
    readonly string[],
): SearchValidationState {
  return (
    degradationReasons.length >
    0
      ? "DEGRADED"
      : "VALID"
  );
}

/* ============================================================================
 * 26. CANONICAL DISTRIBUTION OUTPUT VALIDATION
 * ----------------------------------------------------------------------------
 * Defensive validation of the truth produced by this module.
 *
 * This validation never repairs output.
 * ========================================================================== */

function validateCohortDistributionOutput(
  distribution:
    SearchCohortDistribution,

  sourceBatch:
    SearchCohortBatch,

  expectedCandidateCount:
    SearchCount,
): void {
  assertNonEmptyString(
    distribution.contract_version,
    "distribution.contract_version",
  );

  assertValidIsoTimestamp(
    distribution.created_at,
    "distribution.created_at",
  );

  assertNonEmptyString(
    distribution.cohort_id,
    "distribution.cohort_id",
  );

  assertNonEmptyString(
    distribution.query_id,
    "distribution.query_id",
  );

  assertNonEmptyString(
    distribution.distribution_id,
    "distribution.distribution_id",
  );

  if (
    distribution.cohort_id !==
    sourceBatch.cohort_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Output invariant violation: distribution cohort identity diverged from SearchCohortBatch.",
    );
  }

  if (
    distribution.query_id !==
    sourceBatch.query_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Output invariant violation: distribution query identity diverged from SearchCohortBatch.",
    );
  }

  if (
    distribution.distribution_id !==
    sourceBatch.distribution_id
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Output invariant violation: distribution identity diverged from SearchCohortBatch.",
    );
  }

  assertNonNegativeInteger(
    distribution.candidate_count,
    "distribution.candidate_count",
  );

  if (
    distribution.candidate_count !==
    expectedCandidateCount
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Output invariant violation: distribution candidate_count does not match the canonical eligible population.",
    );
  }

  assertFiniteNumber(
    distribution.minimum_score,
    "distribution.minimum_score",
  );

  assertFiniteNumber(
    distribution.maximum_score,
    "distribution.maximum_score",
  );

  assertFiniteNumber(
    distribution.mean_score,
    "distribution.mean_score",
  );

  assertFiniteNumber(
    distribution.median_score,
    "distribution.median_score",
  );

  assertNonNegativeNumber(
    distribution.standard_deviation,
    "distribution.standard_deviation",
  );

  assertFiniteNumber(
    distribution.first_quartile_score,
    "distribution.first_quartile_score",
  );

  assertFiniteNumber(
    distribution.third_quartile_score,
    "distribution.third_quartile_score",
  );

  if (
    distribution.minimum_score >
    distribution.maximum_score
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Output invariant violation: minimum_score exceeds maximum_score.",
    );
  }

  if (
    distribution.first_quartile_score <
      distribution.minimum_score ||
    distribution.first_quartile_score >
      distribution.maximum_score
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Output invariant violation: first_quartile_score lies outside the canonical score range.",
    );
  }

  if (
    distribution.median_score <
      distribution.minimum_score ||
    distribution.median_score >
      distribution.maximum_score
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Output invariant violation: median_score lies outside the canonical score range.",
    );
  }

  if (
    distribution.third_quartile_score <
      distribution.minimum_score ||
    distribution.third_quartile_score >
      distribution.maximum_score
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Output invariant violation: third_quartile_score lies outside the canonical score range.",
    );
  }

  if (
    distribution.first_quartile_score >
    distribution.median_score
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Output invariant violation: first_quartile_score exceeds median_score.",
    );
  }

  if (
    distribution.median_score >
    distribution.third_quartile_score
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_NAME}] ` +
        "Output invariant violation: median_score exceeds third_quartile_score.",
    );
  }

  assertNonEmptyString(
    distribution.normalizer_module_version,
    "distribution.normalizer_module_version",
  );

  assertNonEmptyString(
    distribution.normalization_policy_version,
    "distribution.normalization_policy_version",
  );

  assertAuthorizedValidationState(
    distribution.validation_state,
    "SearchCohortDistribution",
  );
}

/* ============================================================================
 * 27. CANONICAL COHORT NORMALIZATION PRODUCER
 * ----------------------------------------------------------------------------
 * Canonical boundary:
 *
 * SearchCohortBatch
 * + explicit SearchCohortNormalizationPolicy
 * + explicit deterministic created_at
 * -> SearchOptionalEvidence<SearchCohortDistribution>
 *
 * This function:
 * - validates canonical producer boundaries
 * - validates explicit normalization policy
 * - validates cohort and query identities
 * - validates candidate document identities
 * - validates temporal causality
 * - consumes ranking eligibility without recalculation
 * - selects ranking-eligible candidates
 * - owns minimum-cohort availability
 * - consumes canonical final_raw_score
 * - preserves canonical score ties
 * - owns selected-policy admissibility of ties
 * - calculates deterministic descriptive statistics when available
 * - preserves canonical distribution identity
 * - propagates canonical degradation
 * - returns AVAILABLE only when SearchCohortDistribution exists
 *
 * It performs no:
 * - document scoring
 * - SearchGlobalScore recalculation
 * - SearchEligibilityResult recalculation
 * - penalty calculation
 * - query-relevance calculation
 * - individual normalized-score calculation
 * - percentile calculation
 * - relative-position calculation
 * - public ranking
 * - private decision
 * - BLOCK / WATCH / ALLOW production
 * - calibration
 * - validation-state repair
 * - persistence
 * - event publication
 * - runtime mutation
 * ========================================================================== */

export function normalizeSearchCohort(
  input:
    SearchCohortNormalizationInput,
): SearchOptionalEvidence<SearchCohortDistribution> {
  /*
   * Contract Before Runtime.
   *
   * Structural invalidity remains exceptional.
   *
   * Legitimate analytical unavailability is handled only after all canonical
   * boundaries have been validated.
   */
  validateNormalizationInput(
    input,
  );

  const searchCohortBatch =
    input.cohort_batch;

  const searchEligibleCandidates =
    selectRankingEligibleCandidates(
      searchCohortBatch,
    );

  /* --------------------------------------------------------------------------
   * Canonical availability:
   * insufficient statistical population.
   * ----------------------------------------------------------------------- */

  if (
    !hasMinimumCohortSize(
      searchEligibleCandidates,
      searchCohortBatch
        .cohort_definition
        .minimum_cohort_size,
    )
  ) {
    return insufficientData<SearchCohortDistribution>(
      buildInsufficientCohortReason(
        searchEligibleCandidates,
        searchCohortBatch
          .cohort_definition
          .minimum_cohort_size,
      ),
    );
  }

  const searchRawScores =
    extractCanonicalRawScores(
      searchEligibleCandidates,
    );

  /* --------------------------------------------------------------------------
   * Explicit selected-policy admissibility.
   *
   * Canonical ties are preserved.
   * No artificial tie breaking is authorized.
   * ----------------------------------------------------------------------- */

  if (
    input.policy
      .require_distinct_scores &&
    containsCanonicalScoreTies(
      searchRawScores,
    )
  ) {
    return invalidEvidence<SearchCohortDistribution>(
      buildDistinctScorePolicyFailureReason(),
    );
  }

  const searchCohortStatistics =
    calculateCohortStatistics(
      searchRawScores,
    );

  const searchDistributionDegradationReasons =
    collectCohortDistributionDegradationReasons(
      searchCohortBatch,
      searchEligibleCandidates,
    );

  const searchDistributionValidationState =
    resolveCohortDistributionValidationState(
      searchDistributionDegradationReasons,
    );

  const searchCohortDistribution:
    SearchCohortDistribution =
    Object.freeze({
      contract_version:
        XYVALA_SEARCH_COHORT_DISTRIBUTION_CONTRACT_VERSION,

      created_at:
        input.created_at,

      cohort_id:
        searchCohortBatch.cohort_id,

      query_id:
        searchCohortBatch.query_id,

      /**
       * Canonical distribution identity.
       *
       * COHORT_NORMALIZATION transports it.
       * It does not create it.
       */
      distribution_id:
        searchCohortBatch.distribution_id,

      /**
       * Canonical statistical population size.
       *
       * This is the ranking-eligible population, not necessarily the complete
       * SearchCohortBatch candidate population.
       */
      candidate_count:
        searchEligibleCandidates.length,

      minimum_score:
        searchCohortStatistics
          .minimum_score,

      maximum_score:
        searchCohortStatistics
          .maximum_score,

      mean_score:
        searchCohortStatistics
          .mean_score,

      median_score:
        searchCohortStatistics
          .median_score,

      standard_deviation:
        searchCohortStatistics
          .standard_deviation,

      first_quartile_score:
        searchCohortStatistics
          .first_quartile_score,

      third_quartile_score:
        searchCohortStatistics
          .third_quartile_score,

      normalization_method:
        input.policy
          .normalization_method,

      normalizer_module_version:
        XYVALA_SEARCH_COHORT_NORMALIZATION_MODULE_VERSION,

      normalization_policy_version:
        input.policy
          .policy_version,

      validation_state:
        searchDistributionValidationState,

      degradation_reasons:
        searchDistributionDegradationReasons,
    });

  validateCohortDistributionOutput(
    searchCohortDistribution,
    searchCohortBatch,
    searchEligibleCandidates.length,
  );

  return available(
    searchCohortDistribution,
  );
}

/* ============================================================================
 * 28. STATIC OWNERSHIP DECLARATION
 * ----------------------------------------------------------------------------
 * Audit / architecture metadata only.
 *
 * It performs no analytical calculation.
 * ========================================================================== */

export const XYVALA_SEARCH_COHORT_NORMALIZATION_OWNERSHIP =
  Object.freeze({
    pipeline_layer:
      "COHORT_NORMALIZATION",

    canonical_available_output:
      "SearchCohortDistribution",

    canonical_result:
      "SearchOptionalEvidence<SearchCohortDistribution>",

    availability_owner:
      "COHORT_NORMALIZATION",

    distribution_identity_owner:
      "UPSTREAM_EXPLICIT_IDENTITY_PROVIDER",

    distribution_identity_source:
      "SearchCohortBatch.distribution_id",

    policy_selection_owner:
      "EXTERNAL_AUTHORIZED_POLICY_GOVERNANCE",

    policy_fallback_allowed:
      false,

    minimum_population_unavailability:
      "INSUFFICIENT_DATA",

    invalid_policy_population:
      "INVALID",

    produces_percentile:
      false,

    produces_relative_position:
      false,

    produces_private_decision:
      false,

    produces_public_position:
      false,

    mutates_runtime:
      false,
  } as const);
