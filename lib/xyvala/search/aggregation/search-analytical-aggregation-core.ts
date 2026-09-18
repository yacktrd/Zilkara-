/* ============================================================================
 * FILE: lib/xyvala/search/aggregation/search-analytical-aggregation-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical analytical aggregation engine
 *
 * ROLE
 * - consume the canonical SearchPositiveScoreVector
 * - consume the canonical SearchPenaltyVector
 * - preserve explicit optional positive-score evidence
 * - validate each producer according to its own canonical contract
 * - validate canonical score identities and analytical families
 * - apply one explicit private aggregation policy
 * - control analytical overlap between available positive score families
 * - calculate the canonical positive aggregate score
 * - consume canonical penalty truth without recalculation
 * - calculate the canonical SearchGlobalScore
 * - calculate aggregate diagnostic confidence
 * - preserve document, query, version and temporal lineage
 * - propagate canonical degradation without reconstructing upstream truth
 *
 * CLASSIFICATION
 * - PRIVATE ANALYTICAL ENGINE
 * - SEARCH DOMAIN
 * - ANALYTICAL AGGREGATION
 * - COMPUTE
 * - PURE
 * - DETERMINISTIC
 * - NON-MUTATING
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchPositiveScoreVector
 * - SearchPenaltyVector
 * - SearchGlobalScore
 * - SearchOptionalEvidence
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 *
 * CONSUMERS
 * - Xyvala Search eligibility engine
 * - Xyvala Search cohort normalization engine
 * - Xyvala Search relative cohort evaluation engine
 * - Xyvala Search private decision engine
 * - Xyvala Search calibration engine
 * - Xyvala Search private snapshot builder
 *
 * DIRECTIVES
 * - analytical aggregation only
 * - consume canonical positive scores and canonical penalty truth only
 * - preserve optional positive-score availability exactly
 * - validate every available score according to its canonical contract
 * - preserve canonical score identities
 * - preserve canonical penalty identities
 * - preserve document identity
 * - preserve query identity
 * - preserve temporal causality
 * - preserve unavailable-evidence semantics
 * - distinguish score absence from score value zero
 * - distinguish score confidence from score availability
 * - distinguish confidence from validation state
 * - no documentary-source access
 * - no lexical-signal access
 * - no anchor-signal access
 * - no context-aggregation access
 * - no query-signal access
 * - no link-signal access
 * - no temporal-signal access
 * - no behavioral-signal access
 * - no sub-score recalculation
 * - no sub-score modification
 * - no penalty recalculation
 * - no penalty modification
 * - no producer validation-state fabrication
 * - no validation-state repair
 * - no confidence-to-validation substitution
 * - no unavailable-score fabrication
 * - no unavailable-score-to-zero conversion
 * - no unavailable-confidence-to-zero conversion
 * - no threshold invention
 * - no hidden weight
 * - no hidden overlap control
 * - no implicit score fabrication
 * - no local reconstruction
 * - no eligibility evaluation
 * - no cohort normalization
 * - no relative cohort evaluation
 * - no ranking
 * - no private decision
 * - no calibration
 * - no public projection
 * - no persistence
 * - no event publication
 * - no runtime mutation
 * - no runtime clock access
 * - no implicit timestamp
 * - no random value generation
 *
 * INPUTS
 * - canonical SearchPositiveScoreVector
 * - canonical SearchPenaltyVector
 * - explicit SearchAnalyticalAggregationPolicy
 * - explicit deterministic creation timestamp
 *
 * OUTPUTS
 * - canonical SearchGlobalScore
 *
 * INVARIANTS
 * - positive score vector and penalty vector belong to the same document
 * - positive score vector and penalty vector belong to the same query
 * - required positive scores always carry canonical SearchSubScore truth
 * - optional Link Authority evidence may legitimately be unavailable
 * - optional Behavioral Calibration evidence may legitimately be unavailable
 * - unavailable optional scores never receive synthetic SearchSubScore truth
 * - unavailable optional scores never contribute numerical score truth
 * - every available score keeps its canonical identity
 * - every available score keeps its canonical signal family
 * - every available query-relative score keeps canonical query identity
 * - every intrinsic score remains query-independent
 * - requested weights originate exclusively from explicit policy
 * - effective weights originate exclusively from requested weights, explicit
 *   overlap caps and explicit availability handling
 * - no score contribution exists without a canonical SearchSubScore
 * - total effective included weight is normalized deterministically
 * - penalty_value equals SearchPenaltyVector.total_penalty_value exactly
 * - penalty items are never recomputed
 * - blocking constraints are never interpreted as scores
 * - final_raw_score is calculated only after positive aggregation
 * - final_raw_score is never implicitly clamped
 * - aggregate confidence is diagnostic and does not redefine validation
 * - reduced confidence alone does not make a contract DEGRADED
 * - explicit missing evidence may degrade analytical aggregation
 * - excluded evidence remains explicitly observable
 * - degraded penalty truth remains explicitly degraded downstream
 * - no input contract is mutated
 * - no runtime clock is read
 * - no random value is generated
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/search/contracts/search-pipeline-contract
 *
 * SENSITIVE AREAS
 * - producer authorization
 * - positive/negative analytical separation
 * - analytical double counting
 * - overlap-group governance
 * - score availability semantics
 * - missing-data handling
 * - confidence / validation separation
 * - weight normalization
 * - aggregate confidence
 * - penalty propagation
 * - document identity
 * - query identity
 * - temporal causality
 * ========================================================================== */

import type {
  SearchAggregationWeight,
  SearchConfidenceScore,
  SearchContractVersion,
  SearchDocumentId,
  SearchGlobalScore,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchOptionalEvidence,
  SearchOverlapControl,
  SearchPenaltyVector,
  SearchPolicyVersion,
  SearchPositiveScoreVector,
  SearchQueryId,
  SearchRawScore,
  SearchScoreContribution,
  SearchScoreName,
  SearchSignalFamily,
  SearchSubScore,
  SearchValidationState,
  SearchWeight,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME =
  "xyvala-search-analytical-aggregation-core" as const;

export const XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_VERSION:
  SearchModuleVersion = "1.1.0";

export const XYVALA_SEARCH_GLOBAL_SCORE_CONTRACT_VERSION:
  SearchContractVersion = "2.1.0";

export const XYVALA_SEARCH_ANALYTICAL_AGGREGATION_METHOD =
  "WEIGHTED_POSITIVE_SCORE_WITH_OVERLAP_CONTROL_AND_CANONICAL_PENALTY" as const;

/* ============================================================================
 * 2. POLICY TYPES
 * ========================================================================== */

export type SearchAggregationMissingScoreHandlingMethod =
  | "EXCLUDE_AND_RENORMALIZE"
  | "BLOCK_AGGREGATION"
  | "DEGRADE_CONFIDENCE";

export type SearchAggregateConfidenceMethod =
  | "EFFECTIVE_WEIGHTED_MEAN"
  | "MINIMUM_INCLUDED_SCORE_CONFIDENCE";

/* ============================================================================
 * 3. AGGREGATION POLICY
 * ----------------------------------------------------------------------------
 * MISSING SCORE SEMANTICS
 *
 * EXCLUDE_AND_RENORMALIZE
 * - unavailable/incomplete score evidence is excluded;
 * - remaining effective positive weights are normalized.
 *
 * BLOCK_AGGREGATION
 * - unavailable/incomplete score evidence blocks aggregation.
 *
 * DEGRADE_CONFIDENCE
 * - an existing SearchSubScore with incomplete evidence remains eligible for
 *   inclusion and retains its canonical value/confidence;
 * - a completely absent SearchSubScore cannot be included numerically;
 * - such absent evidence receives effective_weight = 0;
 * - remaining positive-score weights are normalized;
 * - aggregate diagnostic confidence is reduced by explicit requested-weight
 *   evidence coverage.
 *
 * This distinction prevents a missing SearchSubScore from becoming an implicit
 * numerical zero.
 * ========================================================================== */

export interface SearchAnalyticalAggregationPolicy {
  readonly policy_version:
    SearchPolicyVersion;

  /**
   * Explicit requested weight for every canonical positive score identity.
   *
   * Zero is authorized.
   * Negative and non-finite values are forbidden.
   */
  readonly score_weights:
    Readonly<
      Record<
        SearchScoreName,
        SearchWeight
      >
    >;

  /**
   * Explicit maximum pre-normalization weight for every observable overlap
   * group.
   *
   * No overlap group is reconstructed for a completely unavailable score.
   */
  readonly overlap_group_caps:
    Readonly<
      Record<
        string,
        SearchWeight
      >
    >;

  readonly missing_score_handling_method:
    SearchAggregationMissingScoreHandlingMethod;

  readonly aggregate_confidence_method:
    SearchAggregateConfidenceMethod;
}

/* ============================================================================
 * 4. INPUT CONTRACT
 * ========================================================================== */

export interface SearchAnalyticalAggregationInput {
  readonly positive_score_vector:
    SearchPositiveScoreVector;

  readonly penalty_vector:
    SearchPenaltyVector;

  readonly policy:
    SearchAnalyticalAggregationPolicy;

  readonly created_at:
    SearchIsoTimestamp;
}

/* ============================================================================
 * 5. INTERNAL SCORE DESCRIPTOR
 * ----------------------------------------------------------------------------
 * All canonical score identities remain represented.
 *
 * score_evidence distinguishes:
 *
 * AVAILABLE
 * - a canonical SearchSubScore exists.
 *
 * Non-AVAILABLE
 * - no canonical SearchSubScore exists;
 * - numerical score truth must not be fabricated.
 * ========================================================================== */

interface SearchCanonicalScoreDescriptor {
  readonly score_name:
    SearchScoreName;

  readonly expected_signal_family:
    SearchSignalFamily;

  readonly score_evidence:
    SearchOptionalEvidence<
      SearchSubScore
    >;

  readonly query_scope:
    "INTRINSIC" | "QUERY_RELATIVE";
}

interface SearchAvailableCanonicalScoreDescriptor {
  readonly score_name:
    SearchScoreName;

  readonly expected_signal_family:
    SearchSignalFamily;

  readonly score:
    SearchSubScore;

  readonly query_scope:
    "INTRINSIC" | "QUERY_RELATIVE";
}

/* ============================================================================
 * 6. INTERNAL PRE-NORMALIZATION WEIGHT
 * ========================================================================== */

interface SearchPreNormalizedWeight {
  readonly score_name:
    SearchScoreName;

  readonly score_evidence:
    SearchOptionalEvidence<
      SearchSubScore
    >;

  readonly requested_weight:
    SearchWeight;

  /**
   * Weight after explicit overlap-group control only.
   *
   * For a score with no canonical SearchSubScore, no overlap group exists to
   * inspect. Its requested weight is therefore preserved here unchanged.
   *
   * Numerical exclusion is represented separately through score_included and
   * effective_weight.
   */
  readonly overlap_adjusted_weight:
    SearchWeight;

  readonly score_available:
    boolean;

  readonly score_included:
    boolean;

  readonly exclusion_reason?:
    string;
}

/* ============================================================================
 * 7. SAFE PRIMITIVE ASSERTIONS
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
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
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
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
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

  if (value < 0) {
    throw new Error(
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be non-negative.`,
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
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
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
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a valid ISO timestamp.`,
    );
  }
}

function assertAuthorizedPenaltyValidationState(
  validationState:
    SearchValidationState,
): void {
  if (
    validationState === "REJECTED" ||
    validationState === "UNVALIDATED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
        "Boundary rejection: SearchPenaltyVector is not authorized for analytical aggregation.",
    );
  }

  if (
    validationState !== "VALID" &&
    validationState !== "DEGRADED"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
        `Boundary rejection: SearchPenaltyVector has unsupported validation state ${validationState}.`,
    );
  }
}

/* ============================================================================
 * 8. OPTIONAL SCORE-EVIDENCE HELPERS
 * ========================================================================== */

function toAvailableScoreEvidence(
  score: SearchSubScore,
): SearchOptionalEvidence<SearchSubScore> {
  return Object.freeze({
    availability_state:
      "AVAILABLE",

    value:
      score,
  });
}

function projectScoreConfidenceEvidence(
  evidence:
    SearchOptionalEvidence<SearchSubScore>,
): SearchOptionalEvidence<SearchConfidenceScore> {
  if (
    evidence.availability_state !==
    "AVAILABLE"
  ) {
    return evidence;
  }

  return Object.freeze({
    availability_state:
      "AVAILABLE",

    value:
      evidence.value.confidence,
  });
}

/* ============================================================================
 * 9. CANONICAL SCORE REGISTRY
 * ----------------------------------------------------------------------------
 * This registry performs no analytical calculation.
 *
 * Required score identities are represented as AVAILABLE because their
 * canonical SearchSubScore objects already exist.
 *
 * Link Authority and Behavioral Calibration preserve their canonical optional
 * evidence envelope unchanged.
 * ========================================================================== */

function buildCanonicalScoreRegistry(
  vector: SearchPositiveScoreVector,
): readonly SearchCanonicalScoreDescriptor[] {
  return Object.freeze([
    Object.freeze({
      score_name:
        "lexical_score",

      expected_signal_family:
        "LEXICAL",

      score_evidence:
        toAvailableScoreEvidence(
          vector.lexical_score,
        ),

      query_scope:
        "INTRINSIC",
    }),

    Object.freeze({
      score_name:
        "anchor_score",

      expected_signal_family:
        "ANCHOR",

      score_evidence:
        toAvailableScoreEvidence(
          vector.anchor_score,
        ),

      query_scope:
        "INTRINSIC",
    }),

    Object.freeze({
      score_name:
        "occurrence_score",

      expected_signal_family:
        "OCCURRENCE",

      score_evidence:
        toAvailableScoreEvidence(
          vector.occurrence_score,
        ),

      query_scope:
        "INTRINSIC",
    }),

    Object.freeze({
      score_name:
        "frequency_score",

      expected_signal_family:
        "FREQUENCY",

      score_evidence:
        toAvailableScoreEvidence(
          vector.frequency_score,
        ),

      query_scope:
        "INTRINSIC",
    }),

    Object.freeze({
      score_name:
        "convergence_score",

      expected_signal_family:
        "CONVERGENCE",

      score_evidence:
        toAvailableScoreEvidence(
          vector.convergence_score,
        ),

      query_scope:
        "INTRINSIC",
    }),

    Object.freeze({
      score_name:
        "correlation_score",

      expected_signal_family:
        "EVOLUTION",

      score_evidence:
        toAvailableScoreEvidence(
          vector.correlation_score,
        ),

      query_scope:
        "INTRINSIC",
    }),

    Object.freeze({
      score_name:
        "duration_score",

      expected_signal_family:
        "DURATION",

      score_evidence:
        toAvailableScoreEvidence(
          vector.duration_score,
        ),

      query_scope:
        "INTRINSIC",
    }),

    Object.freeze({
      score_name:
        "query_relevance_score",

      expected_signal_family:
        "QUERY_RELEVANCE",

      score_evidence:
        toAvailableScoreEvidence(
          vector.query_relevance_score,
        ),

      query_scope:
        "QUERY_RELATIVE",
    }),

    Object.freeze({
      score_name:
        "link_authority_score",

      expected_signal_family:
        "LINK_AUTHORITY",

      score_evidence:
        vector.link_authority_score,

      query_scope:
        "INTRINSIC",
    }),

    Object.freeze({
      score_name:
        "behavioral_calibration_score",

      expected_signal_family:
        "BEHAVIORAL_CALIBRATION",

      score_evidence:
        vector.behavioral_calibration_score,

      query_scope:
        "QUERY_RELATIVE",
    }),

    Object.freeze({
      score_name:
        "document_quality_score",

      expected_signal_family:
        "DOCUMENT_QUALITY",

      score_evidence:
        toAvailableScoreEvidence(
          vector.document_quality_score,
        ),

      query_scope:
        "INTRINSIC",
    }),
  ]);
}

/* ============================================================================
 * 10. POSITIVE SCORE VECTOR BOUNDARY
 * ========================================================================== */

function validatePositiveScoreVectorBoundary(
  vector: SearchPositiveScoreVector,
): void {
  assertNonEmptyString(
    vector.contract_version,
    "positive_score_vector.contract_version",
  );

  assertValidIsoTimestamp(
    vector.created_at,
    "positive_score_vector.created_at",
  );

  assertNonEmptyString(
    vector.document_id,
    "positive_score_vector.document_id",
  );

  assertNonEmptyString(
    vector.query_id,
    "positive_score_vector.query_id",
  );
}

/* ============================================================================
 * 11. PENALTY VECTOR BOUNDARY
 * ========================================================================== */

function validatePenaltyVectorBoundary(
  vector: SearchPenaltyVector,
): void {
  assertNonEmptyString(
    vector.contract_version,
    "penalty_vector.contract_version",
  );

  assertValidIsoTimestamp(
    vector.created_at,
    "penalty_vector.created_at",
  );

  assertNonEmptyString(
    vector.document_id,
    "penalty_vector.document_id",
  );

  assertNonEmptyString(
    vector.query_id,
    "penalty_vector.query_id",
  );

  assertNonEmptyString(
    vector.evaluator_module_version,
    "penalty_vector.evaluator_module_version",
  );

  assertNonEmptyString(
    vector.penalty_policy_version,
    "penalty_vector.penalty_policy_version",
  );

  assertAuthorizedPenaltyValidationState(
    vector.validation_state,
  );

  assertNormalizedNumber(
    vector.total_penalty_value,
    "penalty_vector.total_penalty_value",
  );

  for (
    const [
      index,
      penalty,
    ] of vector.penalties.entries()
  ) {
    assertNormalizedNumber(
      penalty.severity,
      `penalty_vector.penalties[${String(index)}].severity`,
    );

    assertNormalizedNumber(
      penalty.confidence,
      `penalty_vector.penalties[${String(index)}].confidence`,
    );

    assertNonEmptyString(
      penalty.method,
      `penalty_vector.penalties[${String(index)}].method`,
    );

    assertNonEmptyString(
      penalty.module_name,
      `penalty_vector.penalties[${String(index)}].module_name`,
    );

    assertNonEmptyString(
      penalty.module_version,
      `penalty_vector.penalties[${String(index)}].module_version`,
    );

    assertNonEmptyString(
      penalty.policy_version,
      `penalty_vector.penalties[${String(index)}].policy_version`,
    );
  }

  for (
    const [
      index,
      constraint,
    ] of vector.blocking_constraints.entries()
  ) {
    assertNormalizedNumber(
      constraint.confidence,
      `penalty_vector.blocking_constraints[${String(index)}].confidence`,
    );

    assertNonEmptyString(
      constraint.reason,
      `penalty_vector.blocking_constraints[${String(index)}].reason`,
    );

    assertNonEmptyString(
      constraint.evaluator_module_version,
      `penalty_vector.blocking_constraints[${String(index)}].evaluator_module_version`,
    );

    assertNonEmptyString(
      constraint.policy_version,
      `penalty_vector.blocking_constraints[${String(index)}].policy_version`,
    );
  }

  const observableCriticalConstraintState =
    vector.blocking_constraints.some(
      (constraint) =>
        constraint.active,
    );

  if (
    observableCriticalConstraintState !==
    vector.critical_constraint_active
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
        "Boundary violation: penalty_vector.critical_constraint_active is inconsistent with canonical blocking constraints.",
    );
  }
}

/* ============================================================================
 * 12. CANONICAL SCOPE RESOLUTION
 * ========================================================================== */

function resolveCanonicalDocumentId(
  input: SearchAnalyticalAggregationInput,
): SearchDocumentId {
  const documentId =
    input.positive_score_vector.document_id;

  if (
    input.penalty_vector.document_id !==
    documentId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
        "Boundary violation: positive score vector and penalty vector belong to different documents.",
    );
  }

  return documentId;
}

function resolveCanonicalQueryId(
  input: SearchAnalyticalAggregationInput,
): SearchQueryId {
  const queryId =
    input.positive_score_vector.query_id;

  if (
    input.penalty_vector.query_id !==
    queryId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
        "Boundary violation: positive score vector and penalty vector belong to different queries.",
    );
  }

  return queryId;
}

/* ============================================================================
 * 13. AGGREGATION TEMPORAL BOUNDARY
 * ========================================================================== */

function validateAggregationTemporalBoundary(
  input: SearchAnalyticalAggregationInput,
): void {
  const aggregationTimestamp =
    Date.parse(
      input.created_at,
    );

  const positiveVectorTimestamp =
    Date.parse(
      input.positive_score_vector.created_at,
    );

  const penaltyVectorTimestamp =
    Date.parse(
      input.penalty_vector.created_at,
    );

  if (
    aggregationTimestamp <
    positiveVectorTimestamp
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
        "Temporal boundary violation: analytical aggregation predates SearchPositiveScoreVector.",
    );
  }

  if (
    aggregationTimestamp <
    penaltyVectorTimestamp
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
        "Temporal boundary violation: analytical aggregation predates SearchPenaltyVector.",
    );
  }
}

/* ============================================================================
 * 14. CANONICAL SCORE-EVIDENCE VALIDATION
 * ========================================================================== */

function validateCanonicalScoreEvidence(
  descriptor:
    SearchCanonicalScoreDescriptor,
  canonicalDocumentId:
    SearchDocumentId,
  canonicalQueryId:
    SearchQueryId,
  vectorCreatedAt:
    SearchIsoTimestamp,
): void {
  const evidence =
    descriptor.score_evidence;

  const fieldName =
    descriptor.score_name;

  if (
    evidence.availability_state !==
    "AVAILABLE"
  ) {
    assertNonEmptyString(
      evidence.reason,
      `${fieldName}.reason`,
    );

    return;
  }

  const score =
    evidence.value;

  assertNonEmptyString(
    score.contract_version,
    `${fieldName}.contract_version`,
  );

  assertValidIsoTimestamp(
    score.created_at,
    `${fieldName}.created_at`,
  );

  assertNonEmptyString(
    score.document_id,
    `${fieldName}.document_id`,
  );

  if (
    score.document_id !==
    canonicalDocumentId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} belongs to a different document.`,
    );
  }

  if (
    score.score_name !==
    descriptor.score_name
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
        `Contract violation: expected ${descriptor.score_name}, received ${score.score_name}.`,
    );
  }

  if (
    score.signal_family !==
    descriptor.expected_signal_family
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must belong to ${descriptor.expected_signal_family}.`,
    );
  }

  assertNormalizedNumber(
    score.value,
    `${fieldName}.value`,
  );

  assertNormalizedNumber(
    score.confidence,
    `${fieldName}.confidence`,
  );

  assertNonEmptyString(
    score.overlap_group,
    `${fieldName}.overlap_group`,
  );

  assertNonEmptyString(
    score.method,
    `${fieldName}.method`,
  );

  assertNonEmptyString(
    score.module_name,
    `${fieldName}.module_name`,
  );

  assertNonEmptyString(
    score.module_version,
    `${fieldName}.module_version`,
  );

  if (
    Date.parse(score.created_at) >
    Date.parse(vectorCreatedAt)
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
        `Temporal boundary violation: ${fieldName} postdates SearchPositiveScoreVector.`,
    );
  }

  if (
    descriptor.query_scope ===
    "INTRINSIC"
  ) {
    if (
      score.query_id !== undefined
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
          `Boundary violation: ${fieldName} must remain query-independent.`,
      );
    }

    return;
  }

  if (
    score.query_id === undefined
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} must be query-relative.`,
    );
  }

  assertNonEmptyString(
    score.query_id,
    `${fieldName}.query_id`,
  );

  if (
    score.query_id !==
    canonicalQueryId
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
        `Boundary violation: ${fieldName} belongs to a different query.`,
    );
  }
}

/* ============================================================================
 * 15. AVAILABLE SCORE DESCRIPTORS
 * ----------------------------------------------------------------------------
 * Overlap grouping requires a canonical overlap_group.
 *
 * Completely unavailable score evidence owns no SearchSubScore and therefore
 * no canonical overlap_group.
 *
 * Such a group must never be reconstructed from score name or local defaults.
 * ========================================================================== */

function collectAvailableScoreDescriptors(
  scores:
    readonly SearchCanonicalScoreDescriptor[],
): readonly SearchAvailableCanonicalScoreDescriptor[] {
  const available:
    SearchAvailableCanonicalScoreDescriptor[] = [];

  for (
    const descriptor of
    scores
  ) {
    if (
      descriptor.score_evidence
        .availability_state !==
      "AVAILABLE"
    ) {
      continue;
    }

    available.push(
      Object.freeze({
        score_name:
          descriptor.score_name,

        expected_signal_family:
          descriptor.expected_signal_family,

        score:
          descriptor
            .score_evidence
            .value,

        query_scope:
          descriptor.query_scope,
      }),
    );
  }

  return Object.freeze(
    available,
  );
}

/* ============================================================================
 * 16. POLICY VALIDATION
 * ========================================================================== */

function validateAggregationPolicy(
  policy:
    SearchAnalyticalAggregationPolicy,
  scores:
    readonly SearchCanonicalScoreDescriptor[],
): void {
  assertNonEmptyString(
    policy.policy_version,
    "policy.policy_version",
  );

  switch (
    policy.missing_score_handling_method
  ) {
    case "EXCLUDE_AND_RENORMALIZE":
    case "BLOCK_AGGREGATION":
    case "DEGRADE_CONFIDENCE":
      break;
  }

  switch (
    policy.aggregate_confidence_method
  ) {
    case "EFFECTIVE_WEIGHTED_MEAN":
    case "MINIMUM_INCLUDED_SCORE_CONFIDENCE":
      break;
  }

  for (
    const descriptor of
    scores
  ) {
    const requestedWeight =
      policy.score_weights[
        descriptor.score_name
      ];

    if (
      requestedWeight === undefined
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
          `Policy violation: missing explicit weight for ${descriptor.score_name}.`,
      );
    }

    assertNonNegativeNumber(
      requestedWeight,
      `policy.score_weights.${descriptor.score_name}`,
    );

    if (
      descriptor.score_evidence
        .availability_state !==
      "AVAILABLE"
    ) {
      continue;
    }

    const overlapGroup =
      descriptor
        .score_evidence
        .value
        .overlap_group;

    const overlapCap =
      policy.overlap_group_caps[
        overlapGroup
      ];

    if (
      overlapCap === undefined
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
          `Policy violation: missing explicit overlap cap for group ${overlapGroup}.`,
      );
    }

    assertNonNegativeNumber(
      overlapCap,
      `policy.overlap_group_caps.${overlapGroup}`,
    );
  }
}

/* ============================================================================
 * 17. SCORE AVAILABILITY
 * ========================================================================== */

function isScoreAnalyticallyAvailable(
  score: SearchSubScore,
): boolean {
  return (
    score.missing_data.length === 0 &&
    score.confidence > 0
  );
}

/* ============================================================================
 * 18. SCORE INCLUSION RESOLUTION
 * ----------------------------------------------------------------------------
 * Two distinct forms of incompleteness exist:
 *
 * 1. SearchSubScore exists but reports incomplete evidence.
 * 2. No SearchSubScore exists at all.
 *
 * They must never be conflated.
 * ========================================================================== */

function resolveScoreInclusion(args: {
  readonly descriptor:
    SearchCanonicalScoreDescriptor;

  readonly handling_method:
    SearchAggregationMissingScoreHandlingMethod;
}): {
  readonly score_available:
    boolean;

  readonly score_included:
    boolean;

  readonly exclusion_reason?:
    string;
} {
  const evidence =
    args.descriptor.score_evidence;

  if (
    evidence.availability_state !==
    "AVAILABLE"
  ) {
    switch (
      args.handling_method
    ) {
      case "EXCLUDE_AND_RENORMALIZE":
        return Object.freeze({
          score_available:
            false,

          score_included:
            false,

          exclusion_reason:
            "UPSTREAM_SCORE_EVIDENCE_UNAVAILABLE",
        });

      case "BLOCK_AGGREGATION":
        throw new Error(
          `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
            `Aggregation blocked: ${args.descriptor.score_name} has no canonical SearchSubScore ` +
            `(${evidence.availability_state}: ${evidence.reason}).`,
        );

      case "DEGRADE_CONFIDENCE":
        /**
         * No canonical numerical score exists.
         *
         * Therefore:
         * - it cannot contribute to positive_score;
         * - it cannot receive an effective numerical contribution weight;
         * - its absence will explicitly reduce aggregate confidence later.
         */
        return Object.freeze({
          score_available:
            false,

          score_included:
            false,

          exclusion_reason:
            "UPSTREAM_SCORE_EVIDENCE_UNAVAILABLE_CONFIDENCE_DEGRADED",
        });
    }
  }

  const score =
    evidence.value;

  const scoreAvailable =
    isScoreAnalyticallyAvailable(
      score,
    );

  if (scoreAvailable) {
    return Object.freeze({
      score_available:
        true,

      score_included:
        true,
    });
  }

  switch (
    args.handling_method
  ) {
    case "EXCLUDE_AND_RENORMALIZE":
      return Object.freeze({
        score_available:
          false,

        score_included:
          false,

        exclusion_reason:
          "UPSTREAM_SCORE_EVIDENCE_INCOMPLETE",
      });

    case "BLOCK_AGGREGATION":
      throw new Error(
        `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
          `Aggregation blocked: ${score.score_name} contains incomplete upstream evidence.`,
      );

    case "DEGRADE_CONFIDENCE":
      /**
       * A canonical score exists.
       *
       * It may therefore remain included with its exact producer-owned value
       * and confidence.
       */
      return Object.freeze({
        score_available:
          false,

        score_included:
          true,
      });
  }
}

/* ============================================================================
 * 19. OVERLAP GROUPING
 * ========================================================================== */

function groupScoresByOverlapGroup(
  scores:
    readonly SearchAvailableCanonicalScoreDescriptor[],
): ReadonlyMap<
  string,
  readonly SearchAvailableCanonicalScoreDescriptor[]
> {
  const mutableGroups =
    new Map<
      string,
      SearchAvailableCanonicalScoreDescriptor[]
    >();

  for (
    const descriptor of
    scores
  ) {
    const overlapGroup =
      descriptor.score.overlap_group;

    const currentMembers =
      mutableGroups.get(
        overlapGroup,
      );

    if (
      currentMembers === undefined
    ) {
      mutableGroups.set(
        overlapGroup,
        [descriptor],
      );

      continue;
    }

    currentMembers.push(
      descriptor,
    );
  }

  const immutableGroups =
    new Map<
      string,
      readonly SearchAvailableCanonicalScoreDescriptor[]
    >();

  for (
    const [
      overlapGroup,
      members,
    ] of mutableGroups
  ) {
    immutableGroups.set(
      overlapGroup,
      Object.freeze(
        [...members],
      ),
    );
  }

  return immutableGroups;
}

/* ============================================================================
 * 20. OVERLAP CONTROL
 * ----------------------------------------------------------------------------
 * Overlap control applies exclusively where a canonical SearchSubScore and
 * canonical overlap_group actually exist.
 *
 * An overlap group is never reconstructed for unavailable score evidence.
 * ========================================================================== */

function calculateOverlapAdjustedWeights(args: {
  readonly scores:
    readonly SearchCanonicalScoreDescriptor[];

  readonly policy:
    SearchAnalyticalAggregationPolicy;
}): {
  readonly pre_normalized_weights:
    readonly SearchPreNormalizedWeight[];

  readonly overlap_controls:
    readonly SearchOverlapControl[];
} {
  const availableScores =
    collectAvailableScoreDescriptors(
      args.scores,
    );

  const groups =
    groupScoresByOverlapGroup(
      availableScores,
    );

  const overlapAdjustedWeightByScore =
    new Map<
      SearchScoreName,
      SearchWeight
    >();

  const overlapControls:
    SearchOverlapControl[] = [];

  for (
    const [
      overlapGroup,
      members,
    ] of groups
  ) {
    const requestedGroupWeight =
      members.reduce(
        (
          total,
          member,
        ) => {
          const memberWeight =
            args.policy.score_weights[
              member.score_name
            ];

          if (
            memberWeight === undefined
          ) {
            throw new Error(
              `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
                `Policy violation: missing explicit weight for ${member.score_name}.`,
            );
          }

          return (
            total +
            memberWeight
          );
        },
        0,
      );

    const familyCap =
      args.policy.overlap_group_caps[
        overlapGroup
      ];

    if (
      familyCap === undefined
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
          `Policy violation: overlap group ${overlapGroup} has no explicit cap.`,
      );
    }

    const groupRequiresAdjustment =
      requestedGroupWeight >
      familyCap;

    const scalingFactor =
      groupRequiresAdjustment &&
      requestedGroupWeight > 0
        ? familyCap /
          requestedGroupWeight
        : 1;

    const effectiveGroupWeight =
      groupRequiresAdjustment
        ? familyCap
        : requestedGroupWeight;

    for (
      const member of
      members
    ) {
      const requestedWeight =
        args.policy.score_weights[
          member.score_name
        ];

      if (
        requestedWeight === undefined
      ) {
        throw new Error(
          `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
            `Policy violation: missing explicit weight for ${member.score_name}.`,
        );
      }

      overlapAdjustedWeightByScore.set(
        member.score_name,
        requestedWeight *
          scalingFactor,
      );
    }

    overlapControls.push(
      Object.freeze({
        overlap_group:
          overlapGroup,

        member_scores:
          Object.freeze(
            members.map(
              (member) =>
                member.score_name,
            ),
          ),

        requested_group_weight:
          requestedGroupWeight,

        family_cap:
          familyCap,

        effective_group_weight:
          effectiveGroupWeight,

        applied_adjustment:
          requestedGroupWeight -
          effectiveGroupWeight,

        adjustment_reason:
          groupRequiresAdjustment
            ? "EXPLICIT_OVERLAP_GROUP_CAP_APPLIED"
            : "NO_OVERLAP_ADJUSTMENT_REQUIRED",

        policy_version:
          args.policy.policy_version,
      }),
    );
  }

  const preNormalizedWeights =
    args.scores.map(
      (
        descriptor,
      ): SearchPreNormalizedWeight => {
        const requestedWeight =
          args.policy.score_weights[
            descriptor.score_name
          ];

        if (
          requestedWeight === undefined
        ) {
          throw new Error(
            `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
              `Policy violation: missing explicit weight for ${descriptor.score_name}.`,
          );
        }

        const inclusion =
          resolveScoreInclusion({
            descriptor,

            handling_method:
              args.policy
                .missing_score_handling_method,
          });

        let overlapAdjustedWeight =
          requestedWeight;

        if (
          descriptor.score_evidence
            .availability_state ===
          "AVAILABLE"
        ) {
          const governedWeight =
            overlapAdjustedWeightByScore.get(
              descriptor.score_name,
            );

          if (
            governedWeight === undefined
          ) {
            throw new Error(
              `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
                `Internal invariant violation: no overlap-adjusted weight exists for ${descriptor.score_name}.`,
            );
          }

          overlapAdjustedWeight =
            governedWeight;
        }

        return Object.freeze({
          score_name:
            descriptor.score_name,

          score_evidence:
            descriptor.score_evidence,

          requested_weight:
            requestedWeight,

          overlap_adjusted_weight:
            overlapAdjustedWeight,

          score_available:
            inclusion.score_available,

          score_included:
            inclusion.score_included,

          ...(inclusion.exclusion_reason !==
          undefined
            ? {
                exclusion_reason:
                  inclusion.exclusion_reason,
              }
            : {}),
        });
      },
    );

  return Object.freeze({
    pre_normalized_weights:
      Object.freeze(
        preNormalizedWeights,
      ),

    overlap_controls:
      Object.freeze(
        [...overlapControls].sort(
          (
            left,
            right,
          ) =>
            left.overlap_group.localeCompare(
              right.overlap_group,
            ),
        ),
      ),
  });
}

/* ============================================================================
 * 21. EFFECTIVE WEIGHT NORMALIZATION
 * ========================================================================== */

function calculateEffectiveWeights(
  weights:
    readonly SearchPreNormalizedWeight[],
): readonly SearchAggregationWeight[] {
  const totalIncludedWeight =
    weights.reduce(
      (
        total,
        entry,
      ) =>
        entry.score_included
          ? total +
            entry.overlap_adjusted_weight
          : total,
      0,
    );

  if (
    !Number.isFinite(
      totalIncludedWeight,
    ) ||
    totalIncludedWeight <= 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
        "Aggregation blocked: total included analytical weight must be greater than zero.",
    );
  }

  return Object.freeze(
    weights.map(
      (
        entry,
      ): SearchAggregationWeight => {
        const effectiveWeight =
          entry.score_included
            ? entry.overlap_adjusted_weight /
              totalIncludedWeight
            : 0;

        assertNormalizedNumber(
          effectiveWeight,
          `${entry.score_name}.effective_weight`,
        );

        const overlapAdjustmentApplied =
          entry.score_evidence
            .availability_state ===
            "AVAILABLE" &&
          entry.overlap_adjusted_weight !==
            entry.requested_weight;

        return Object.freeze({
          score_name:
            entry.score_name,

          requested_weight:
            entry.requested_weight,

          effective_weight:
            effectiveWeight,

          score_confidence:
            projectScoreConfidenceEvidence(
              entry.score_evidence,
            ),

          score_available:
            entry.score_available,

          score_included:
            entry.score_included,

          ...(entry.exclusion_reason !==
          undefined
            ? {
                exclusion_reason:
                  entry.exclusion_reason,
              }
            : {}),

          overlap_adjustment_applied:
            overlapAdjustmentApplied,

          ...(overlapAdjustmentApplied
            ? {
                overlap_adjustment_reason:
                  "EXPLICIT_OVERLAP_GROUP_CAP",
              }
            : {}),
        });
      },
    ),
  );
}

/* ============================================================================
 * 22. SCORE CONTRIBUTIONS
 * ----------------------------------------------------------------------------
 * A SearchScoreContribution can exist only when a canonical SearchSubScore
 * exists and the score is explicitly included.
 * ========================================================================== */

function calculateScoreContributions(args: {
  readonly scores:
    readonly SearchCanonicalScoreDescriptor[];

  readonly weights:
    readonly SearchAggregationWeight[];
}): readonly SearchScoreContribution[] {
  const weightByScore =
    new Map<
      SearchScoreName,
      SearchAggregationWeight
    >(
      args.weights.map(
        (weight) => [
          weight.score_name,
          weight,
        ],
      ),
    );

  const contributions:
    SearchScoreContribution[] = [];

  for (
    const descriptor of
    args.scores
  ) {
    const weight =
      weightByScore.get(
        descriptor.score_name,
      );

    if (
      weight === undefined
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
          `Internal invariant violation: effective weight is missing for ${descriptor.score_name}.`,
      );
    }

    if (
      !weight.score_included
    ) {
      continue;
    }

    if (
      descriptor.score_evidence
        .availability_state !==
      "AVAILABLE"
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
          `Internal invariant violation: ${descriptor.score_name} cannot be included without a canonical SearchSubScore.`,
      );
    }

    const score =
      descriptor.score_evidence.value;

    const weightedContribution =
      score.value *
      weight.effective_weight;

    assertFiniteNumber(
      weightedContribution,
      `${descriptor.score_name}.weighted_contribution`,
    );

    contributions.push(
      Object.freeze({
        score_name:
          descriptor.score_name,

        source_score_value:
          score.value,

        source_score_confidence:
          score.confidence,

        effective_weight:
          weight.effective_weight,

        weighted_contribution:
          weightedContribution,

        overlap_group:
          score.overlap_group,
      }),
    );
  }

  return Object.freeze(
    contributions,
  );
}

/* ============================================================================
 * 23. POSITIVE AGGREGATE SCORE
 * ========================================================================== */

function calculatePositiveScore(
  contributions:
    readonly SearchScoreContribution[],
): SearchRawScore {
  if (
    contributions.length === 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
        "Aggregation blocked: no positive score contribution remains.",
    );
  }

  const positiveScore =
    contributions.reduce(
      (
        total,
        contribution,
      ) =>
        total +
        contribution.weighted_contribution,
      0,
    );

  assertNormalizedNumber(
    positiveScore,
    "positive_score",
  );

  return positiveScore;
}

/* ============================================================================
 * 24. REQUESTED EVIDENCE COVERAGE
 * ----------------------------------------------------------------------------
 * Used exclusively by DEGRADE_CONFIDENCE when a canonical SearchSubScore does
 * not exist.
 *
 * The calculation uses explicit requested policy weights because an absent
 * SearchSubScore owns no canonical overlap_group and therefore no authorized
 * overlap-adjusted analytical identity exists.
 *
 * No score value and no score confidence are fabricated.
 * ========================================================================== */

function calculateRequestedEvidenceCoverageRatio(
  weights:
    readonly SearchAggregationWeight[],
): number {
  const totalRequestedWeight =
    weights.reduce(
      (
        total,
        weight,
      ) =>
        total +
        weight.requested_weight,
      0,
    );

  assertFiniteNumber(
    totalRequestedWeight,
    "requested_evidence_total_weight",
  );

  if (
    totalRequestedWeight <= 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
        "Aggregation blocked: requested evidence coverage requires positive explicit requested weight.",
    );
  }

  const representedRequestedWeight =
    weights.reduce(
      (
        total,
        weight,
      ) =>
        weight.score_confidence
          .availability_state ===
        "AVAILABLE"
          ? total +
            weight.requested_weight
          : total,
      0,
    );

  const coverageRatio =
    representedRequestedWeight /
    totalRequestedWeight;

  assertNormalizedNumber(
    coverageRatio,
    "requested_evidence_coverage_ratio",
  );

  return coverageRatio;
}

/* ============================================================================
 * 25. AGGREGATE CONFIDENCE
 * ----------------------------------------------------------------------------
 * Confidence remains diagnostic analytical evidence.
 *
 * Existing SearchSubScore confidence is consumed unchanged.
 *
 * When DEGRADE_CONFIDENCE encounters a completely absent SearchSubScore:
 * - no synthetic source confidence is created;
 * - base aggregate confidence is calculated from existing contributions;
 * - the result is reduced by explicit requested evidence coverage.
 *
 * This keeps:
 * - source confidence truth;
 * - availability truth;
 * - aggregate confidence truth
 *
 * as three separate realities.
 * ========================================================================== */

function calculateAggregateConfidence(args: {
  readonly contributions:
    readonly SearchScoreContribution[];

  readonly weights:
    readonly SearchAggregationWeight[];

  readonly method:
    SearchAggregateConfidenceMethod;

  readonly missing_score_handling_method:
    SearchAggregationMissingScoreHandlingMethod;
}): SearchConfidenceScore {
  if (
    args.contributions.length === 0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_NAME}] ` +
        "Aggregation blocked: aggregate confidence requires at least one included score.",
    );
  }

  let baseConfidence:
    SearchConfidenceScore;

  switch (
    args.method
  ) {
    case "EFFECTIVE_WEIGHTED_MEAN":
      baseConfidence =
        args.contributions.reduce(
          (
            total,
            contribution,
          ) =>
            total +
            contribution
              .source_score_confidence *
              contribution
                .effective_weight,
          0,
        );

      break;

    case "MINIMUM_INCLUDED_SCORE_CONFIDENCE":
      baseConfidence =
        Math.min(
          ...args.contributions.map(
            (contribution) =>
              contribution
                .source_score_confidence,
          ),
        );

      break;
  }

  assertNormalizedNumber(
    baseConfidence,
    "base_aggregate_confidence",
  );

  if (
    args.missing_score_handling_method !==
    "DEGRADE_CONFIDENCE"
  ) {
    return baseConfidence;
  }

  const evidenceCoverageRatio =
    calculateRequestedEvidenceCoverageRatio(
      args.weights,
    );

  const aggregateConfidence =
    baseConfidence *
    evidenceCoverageRatio;

  assertNormalizedNumber(
    aggregateConfidence,
    "aggregate_confidence",
  );

  return aggregateConfidence;
}

/* ============================================================================
 * 26. FINAL RAW SCORE
 * ========================================================================== */

function calculateFinalRawScore(
  positiveScore:
    SearchRawScore,
  canonicalPenaltyValue:
    number,
): SearchRawScore {
  assertNormalizedNumber(
    canonicalPenaltyValue,
    "canonical_penalty_value",
  );

  const finalRawScore =
    positiveScore -
    canonicalPenaltyValue;

  assertFiniteNumber(
    finalRawScore,
    "final_raw_score",
  );

  return finalRawScore;
}

/* ============================================================================
 * 27. EXCLUDED SCORE IDENTITIES
 * ========================================================================== */

function collectExcludedScoreNames(
  weights:
    readonly SearchAggregationWeight[],
): readonly SearchScoreName[] {
  return Object.freeze(
    weights
      .filter(
        (weight) =>
          !weight.score_included,
      )
      .map(
        (weight) =>
          weight.score_name,
      )
      .sort(),
  );
}

/* ============================================================================
 * 28. DEGRADATION PROPAGATION
 * ========================================================================== */

function collectAggregationDegradationReasons(args: {
  readonly scores:
    readonly SearchCanonicalScoreDescriptor[];

  readonly weights:
    readonly SearchAggregationWeight[];

  readonly penalty_vector:
    SearchPenaltyVector;
}): readonly string[] {
  const reasons =
    new Set<string>();

  if (
    args.penalty_vector
      .validation_state ===
      "DEGRADED"
  ) {
    reasons.add(
      "ANALYTICAL_AGGREGATION:PENALTY_VECTOR:DEGRADED",
    );
  }

  for (
    const reason of
    args.penalty_vector
      .degradation_reasons
  ) {
    reasons.add(
      `ANALYTICAL_AGGREGATION:PENALTY_VECTOR:${reason}`,
    );
  }

  for (
    const descriptor of
    args.scores
  ) {
    const evidence =
      descriptor.score_evidence;

    if (
      evidence.availability_state !==
      "AVAILABLE"
    ) {
      reasons.add(
        `ANALYTICAL_AGGREGATION:` +
          `${descriptor.score_name}:` +
          `${evidence.availability_state}:` +
          `${evidence.reason}`,
      );

      continue;
    }

    for (
      const missingData of
      evidence.value.missing_data
    ) {
      reasons.add(
        `ANALYTICAL_AGGREGATION:` +
          `${descriptor.score_name}:` +
          `${missingData}`,
      );
    }
  }

  for (
    const weight of
    args.weights
  ) {
    if (
      !weight.score_included
    ) {
      reasons.add(
        `ANALYTICAL_AGGREGATION:` +
          `${weight.score_name}:` +
          `${
            weight.exclusion_reason ??
            "EXCLUDED"
          }`,
      );
    }

    if (
      !weight.score_available &&
      weight.score_included
    ) {
      reasons.add(
        `ANALYTICAL_AGGREGATION:` +
          `${weight.score_name}:` +
          "INCOMPLETE_EVIDENCE_INCLUDED_BY_POLICY",
      );
    }
  }

  return Object.freeze(
    [...reasons].sort(),
  );
}

/* ============================================================================
 * 29. OUTPUT VALIDATION STATE
 * ========================================================================== */

function resolveAggregationValidationState(args: {
  readonly penalty_validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}): SearchValidationState {
  if (
    args.penalty_validation_state ===
      "DEGRADED" ||
    args.degradation_reasons.length > 0
  ) {
    return "DEGRADED";
  }

  return "VALID";
}

/* ============================================================================
 * 30. PUBLIC COMPUTE FUNCTION
 * ========================================================================== */

export function aggregateSearchAnalyticalScores(
  input:
    SearchAnalyticalAggregationInput,
): SearchGlobalScore {
  assertValidIsoTimestamp(
    input.created_at,
    "created_at",
  );

  validatePositiveScoreVectorBoundary(
    input.positive_score_vector,
  );

  validatePenaltyVectorBoundary(
    input.penalty_vector,
  );

  const canonicalDocumentId =
    resolveCanonicalDocumentId(
      input,
    );

  const canonicalQueryId =
    resolveCanonicalQueryId(
      input,
    );

  validateAggregationTemporalBoundary(
    input,
  );

  const canonicalScores =
    buildCanonicalScoreRegistry(
      input.positive_score_vector,
    );

  for (
    const descriptor of
    canonicalScores
  ) {
    validateCanonicalScoreEvidence(
      descriptor,
      canonicalDocumentId,
      canonicalQueryId,
      input.positive_score_vector.created_at,
    );
  }

  validateAggregationPolicy(
    input.policy,
    canonicalScores,
  );

  const {
    pre_normalized_weights:
      preNormalizedWeights,

    overlap_controls:
      overlapControls,
  } =
    calculateOverlapAdjustedWeights({
      scores:
        canonicalScores,

      policy:
        input.policy,
    });

  const weightsUsed =
    calculateEffectiveWeights(
      preNormalizedWeights,
    );

  const scoreContributions =
    calculateScoreContributions({
      scores:
        canonicalScores,

      weights:
        weightsUsed,
    });

  const positiveScore =
    calculatePositiveScore(
      scoreContributions,
    );

  /**
   * Canonical negative analytical truth.
   *
   * No local reconstruction is authorized.
   */
  const penaltyValue =
    input.penalty_vector
      .total_penalty_value;

  const finalRawScore =
    calculateFinalRawScore(
      positiveScore,
      penaltyValue,
    );

  const aggregateConfidence =
    calculateAggregateConfidence({
      contributions:
        scoreContributions,

      weights:
        weightsUsed,

      method:
        input.policy
          .aggregate_confidence_method,

      missing_score_handling_method:
        input.policy
          .missing_score_handling_method,
    });

  const excludedScoreNames =
    collectExcludedScoreNames(
      weightsUsed,
    );

  const degradationReasons =
    collectAggregationDegradationReasons({
      scores:
        canonicalScores,

      weights:
        weightsUsed,

      penalty_vector:
        input.penalty_vector,
    });

  const validationState =
    resolveAggregationValidationState({
      penalty_validation_state:
        input.penalty_vector
          .validation_state,

      degradation_reasons:
        degradationReasons,
    });

  return Object.freeze({
    contract_version:
      XYVALA_SEARCH_GLOBAL_SCORE_CONTRACT_VERSION,

    created_at:
      input.created_at,

    document_id:
      canonicalDocumentId,

    query_id:
      canonicalQueryId,

    positive_score:
      positiveScore,

    penalty_value:
      penaltyValue,

    final_raw_score:
      finalRawScore,

    aggregate_confidence:
      aggregateConfidence,

    score_vector:
      input.positive_score_vector,

    penalty_vector:
      input.penalty_vector,

    score_contributions:
      scoreContributions,

    weights_used:
      weightsUsed,

    overlap_controls:
      overlapControls,

    aggregation_method:
      XYVALA_SEARCH_ANALYTICAL_AGGREGATION_METHOD,

    aggregator_module_version:
      XYVALA_SEARCH_ANALYTICAL_AGGREGATION_MODULE_VERSION,

    aggregation_policy_version:
      input.policy.policy_version,

    missing_score_handling_method:
      input.policy
        .missing_score_handling_method,

    excluded_score_names:
      excludedScoreNames,

    validation_state:
      validationState,

    degradation_reasons:
      degradationReasons,
  });
}
