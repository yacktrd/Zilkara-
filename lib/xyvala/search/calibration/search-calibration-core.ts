/* ============================================================================
 * FILE: lib/xyvala/search/calibration/search-calibration-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical calibration selection engine
 *
 * ROLE
 * - consume one canonical SearchCalibrationDataset
 * - consume already-evaluated SearchCalibrationPolicyCandidate instances
 * - validate calibration candidate integrity
 * - validate supplied calibration evaluation truth
 * - qualify candidates against explicit metric availability requirements
 * - select exactly one candidate through governed lexicographic criteria
 * - preserve evaluation truth without reconstructing ranking metrics
 * - produce the canonical SearchCalibrationResult
 *
 * CLASSIFICATION
 * - PRIVATE CALIBRATION ENGINE
 * - SEARCH DOMAIN
 * - CALIBRATION
 * - COMPUTE
 * - PURE
 * - DETERMINISTIC
 * - NON-MUTATING
 * - NON-PUBLIC
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchCalibrationDataset
 * - SearchCalibrationPolicyCandidate
 * - SearchCalibrationEvaluation
 * - SearchCalibrationResult
 * - SearchScoreName
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Boundary Protection System
 *
 * CONSUMERS
 * - Xyvala Search policy registry
 * - Xyvala Search calibration audit
 * - Xyvala Search regression tests
 * - future Xyvala Search executions through an explicitly activated policy
 *
 * DIRECTIVES
 * - calibration selection only
 * - consume supplied evaluation metrics without recalculation
 * - calibration affects future policy only
 * - never alter analytical truth from the execution used for calibration
 * - preserve candidate policy identity
 * - preserve calibration dataset identity
 * - preserve resulting policy version identity
 * - preserve unavailable metric evidence
 * - explicit ordered selection criteria only
 * - explicit optimization direction only
 * - deterministic identity tie-break only
 * - no document analysis
 * - no lexical analysis
 * - no signal computation
 * - no score computation
 * - no penalty computation
 * - no analytical aggregation
 * - no eligibility computation
 * - no cohort normalization
 * - no relative cohort evaluation
 * - no BLOCK / WATCH / ALLOW decision
 * - no ranking metric reconstruction
 * - no synthetic relevance labels
 * - no hidden objective weighting
 * - no hidden threshold
 * - no automatic policy activation
 * - no automatic policy mutation
 * - no current-truth feedback
 * - no private snapshot reconstruction
 * - no public projection
 * - no persistence
 * - no logging
 * - no runtime mutation
 * - no runtime clock access
 * - no implicit timestamp
 * - no random identifier generation
 *
 * INPUTS
 * - canonical SearchCalibrationDataset
 * - already-evaluated SearchCalibrationPolicyCandidate instances
 * - explicit SearchCalibrationSelectionPolicy
 * - explicit calibration_result_id
 * - explicit deterministic created_at
 *
 * OUTPUTS
 * - canonical SearchCalibrationResult
 *
 * IMPORTANT
 * - SearchCalibrationDataset does not contain sufficient ground-truth
 *   judgments to calculate ranking metrics by itself.
 *
 * - Metric production therefore belongs to an authorized calibration
 *   evaluation producer.
 *
 * - This module consumes those metrics only.
 *
 * - SearchCalibrationResult represents a policy-selection result.
 *
 * - It does not activate that policy.
 *
 * - Policy activation belongs to a separate governed registry/configuration
 *   boundary and applies only to future executions.
 *
 * INVARIANTS
 * - one calibration selection references one canonical dataset
 * - every candidate has one unique candidate_policy_id
 * - every canonical score identity appears exactly once in candidate weights
 * - no unknown score identity participates in aggregation-weight calibration
 * - candidate timestamps cannot postdate calibration selection
 * - calibration selection timestamp cannot predate its dataset
 * - policy metrics are never reconstructed
 * - unavailable metrics remain unavailable
 * - unavailable metrics never become zero
 * - required unavailable metrics reject candidate participation
 * - optional unavailable metrics explicitly degrade candidate qualification
 * - available metric evidence always outranks unavailable evidence for the
 *   same optional criterion
 * - primary selection criteria are explicitly governed
 * - metric optimization direction is explicit
 * - criteria are evaluated lexicographically
 * - no composite hidden calibration score exists
 * - candidate selection is deterministic
 * - identity tie-breaking never changes analytical metric values
 * - selected policy candidate is never mutated
 * - resulting policy version is supplied explicitly
 * - SearchCalibrationResult does not activate a policy
 * - calibration never modifies current document truth
 * - calibration never modifies current score truth
 * - calibration never modifies current eligibility truth
 * - calibration never modifies current cohort truth
 * - calibration never modifies current private decision truth
 * - calibration never modifies current snapshot truth
 * - no input contract is mutated
 * - no runtime clock is read
 * - no random value is generated
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/search/contracts/search-pipeline-contract
 *
 * SENSITIVE AREAS
 * - metric ownership
 * - calibration/current-truth separation
 * - future-policy activation boundary
 * - candidate comparability
 * - score identity completeness
 * - missing metric semantics
 * - metric optimization direction
 * - deterministic tie handling
 * - resulting policy version lineage
 * - temporal causality
 * ========================================================================== */

import type {
  SearchCalibrationDataset,
  SearchCalibrationEvaluation,
  SearchCalibrationPolicyCandidate,
  SearchCalibrationResult,
  SearchContractVersion,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchOptionalEvidence,
  SearchPolicyVersion,
  SearchScoreName,
  SearchValidationState,
  SearchWeight,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_CALIBRATION_MODULE_NAME =
  "xyvala-search-calibration-core" as const;

export const XYVALA_SEARCH_CALIBRATION_MODULE_VERSION:
  SearchModuleVersion = "1.0.0";

export const XYVALA_SEARCH_CALIBRATION_RESULT_CONTRACT_VERSION:
  SearchContractVersion = "2.0.0";

/* ============================================================================
 * 2. GOVERNED CALIBRATION METRICS
 * ========================================================================== */

export type SearchCalibrationMetricName =
  | "precision_at_k"
  | "recall_at_k"
  | "mean_reciprocal_rank"
  | "normalized_discounted_cumulative_gain"
  | "block_false_negative_rate"
  | "allow_false_positive_rate";

export type SearchCalibrationMetricDirection =
  | "MAXIMIZE"
  | "MINIMIZE";

/* ============================================================================
 * 3. SELECTION CRITERION
 * ----------------------------------------------------------------------------
 * Criteria are applied lexicographically.
 *
 * No local composite score is authorized.
 * ========================================================================== */

export interface SearchCalibrationSelectionCriterion {
  readonly metric_name:
    SearchCalibrationMetricName;

  readonly direction:
    SearchCalibrationMetricDirection;

  /**
   * Required metric:
   * - unavailable => candidate rejected.
   *
   * Optional metric:
   * - available beats unavailable;
   * - unavailable versus unavailable remains tied.
   */
  readonly required:
    boolean;
}

/* ============================================================================
 * 4. CALIBRATION SELECTION POLICY
 * ========================================================================== */

export interface SearchCalibrationSelectionPolicy {
  readonly policy_version:
    SearchPolicyVersion;

  readonly criteria:
    readonly SearchCalibrationSelectionCriterion[];

  readonly minimum_candidate_count:
    number;

  readonly final_tie_break_method:
    "CANDIDATE_POLICY_ID_ASC";
}

/* ============================================================================
 * 5. EVALUATED POLICY CANDIDATE
 * ----------------------------------------------------------------------------
 * Evaluation truth must already exist before entering this module.
 *
 * resulting_policy_version identifies the future policy version that may be
 * activated by the authorized policy registry after selection.
 * ========================================================================== */

export interface SearchEvaluatedCalibrationPolicyCandidate {
  readonly candidate:
    SearchCalibrationPolicyCandidate;

  readonly evaluation:
    SearchCalibrationEvaluation;

  readonly resulting_policy_version:
    SearchPolicyVersion;
}

/* ============================================================================
 * 6. CALIBRATION INPUT
 * ========================================================================== */

export interface SearchCalibrationInput {
  readonly dataset:
    SearchCalibrationDataset;

  readonly evaluated_candidates:
    readonly SearchEvaluatedCalibrationPolicyCandidate[];

  readonly selection_policy:
    SearchCalibrationSelectionPolicy;

  /**
   * Deterministic orchestration-owned identifier.
   */
  readonly calibration_result_id:
    string;

  /**
   * Deterministic orchestration-owned timestamp.
   *
   * This module never reads the runtime clock.
   */
  readonly created_at:
    SearchIsoTimestamp;
}

/* ============================================================================
 * 7. INTERNAL QUALIFIED CANDIDATE
 * ========================================================================== */

interface SearchQualifiedCalibrationCandidate {
  readonly evaluated_candidate:
    SearchEvaluatedCalibrationPolicyCandidate;

  readonly validation_state:
    SearchValidationState;

  readonly degradation_reasons:
    readonly string[];
}

/* ============================================================================
 * 8. SAFE PRIMITIVE ASSERTIONS
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
      `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a non-empty string.`,
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
      `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a valid ISO timestamp.`,
    );
  }
}

function assertFiniteNumber(
  value: number,
  fieldName: string,
): void {
  if (!Number.isFinite(value)) {
    throw new Error(
      `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
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
      `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must not be negative.`,
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
      `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be a positive integer.`,
    );
  }
}

function assertNormalizedMetric(
  value: number,
  fieldName: string,
): void {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
        `Contract violation: ${fieldName} must be between 0 and 1.`,
    );
  }
}

/* ============================================================================
 * 9. DETERMINISTIC STRING HELPERS
 * ========================================================================== */

function compareStrings(
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

function canonicalStrings(
  values:
    readonly string[],
): readonly string[] {
  return Object.freeze(
    [...new Set(values)]
      .map(
        (value) =>
          value.trim(),
      )
      .filter(
        (value) =>
          value.length > 0,
      )
      .sort(
        compareStrings,
      ),
  );
}

/* ============================================================================
 * 10. DATASET VALIDATION
 * ========================================================================== */

function validateCalibrationDataset(
  dataset:
    SearchCalibrationDataset,
): void {
  assertNonEmptyString(
    dataset.contract_version,
    "dataset.contract_version",
  );

  assertValidIsoTimestamp(
    dataset.created_at,
    "dataset.created_at",
  );

  assertNonEmptyString(
    dataset.calibration_dataset_id,
    "dataset.calibration_dataset_id",
  );

  assertNonEmptyString(
    dataset.corpus_version,
    "dataset.corpus_version",
  );

  assertNonEmptyString(
    dataset.dataset_hash,
    "dataset.dataset_hash",
  );

  if (
    dataset.query_ids.length ===
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
        "Contract violation: calibration dataset must contain at least one query identity.",
    );
  }

  if (
    dataset.document_ids.length ===
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
        "Contract violation: calibration dataset must contain at least one document identity.",
    );
  }

  for (
    const [
      index,
      queryId,
    ] of dataset.query_ids.entries()
  ) {
    assertNonEmptyString(
      queryId,
      `dataset.query_ids[${String(index)}]`,
    );
  }

  for (
    const [
      index,
      documentId,
    ] of dataset.document_ids.entries()
  ) {
    assertNonEmptyString(
      documentId,
      `dataset.document_ids[${String(index)}]`,
    );
  }

  if (
    new Set(
      dataset.query_ids,
    ).size !==
    dataset.query_ids.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
        "Contract violation: calibration dataset contains duplicate query identities.",
    );
  }

  if (
    new Set(
      dataset.document_ids,
    ).size !==
    dataset.document_ids.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
        "Contract violation: calibration dataset contains duplicate document identities.",
    );
  }
}

/* ============================================================================
 * 11. CANONICAL SCORE IDENTITIES
 * ========================================================================== */

const CANONICAL_SCORE_NAMES:
  readonly SearchScoreName[] =
  Object.freeze([
    "lexical_score",
    "anchor_score",
    "occurrence_score",
    "frequency_score",
    "convergence_score",
    "correlation_score",
    "duration_score",
    "query_relevance_score",
    "link_authority_score",
    "behavioral_calibration_score",
    "document_quality_score",
  ]);

/* ============================================================================
 * 12. AGGREGATION-WEIGHT VALIDATION
 * ----------------------------------------------------------------------------
 * Calibration validates candidate policy shape.
 *
 * It does not normalize candidate weights.
 * ========================================================================== */

function validateAggregationWeights(
  weights:
    Readonly<
      Record<
        SearchScoreName,
        SearchWeight
      >
    >,
): void {
  const runtimeScoreNames =
    Object.keys(
      weights,
    );

  if (
    runtimeScoreNames.length !==
    CANONICAL_SCORE_NAMES.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
        "Contract violation: candidate aggregation weights must contain exactly the canonical Search score identities.",
    );
  }

  for (
    const scoreName of
    CANONICAL_SCORE_NAMES
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        weights,
        scoreName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
          `Contract violation: candidate aggregation weight is missing for ${scoreName}.`,
      );
    }

    assertNonNegativeNumber(
      weights[scoreName],
      `candidate.aggregation_weights.${scoreName}`,
    );
  }

  const canonicalScoreNameSet =
    new Set<string>(
      CANONICAL_SCORE_NAMES,
    );

  for (
    const runtimeScoreName of
    runtimeScoreNames
  ) {
    if (
      !canonicalScoreNameSet.has(
        runtimeScoreName,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
          `Contract violation: unknown aggregation score identity ${runtimeScoreName}.`,
      );
    }
  }
}

/* ============================================================================
 * 13. POLICY CANDIDATE VALIDATION
 * ========================================================================== */

function validatePolicyCandidate(
  candidate:
    SearchCalibrationPolicyCandidate,
): void {
  assertNonEmptyString(
    candidate.contract_version,
    "candidate.contract_version",
  );

  assertValidIsoTimestamp(
    candidate.created_at,
    "candidate.created_at",
  );

  assertNonEmptyString(
    candidate.candidate_policy_id,
    "candidate.candidate_policy_id",
  );

  validateAggregationWeights(
    candidate.aggregation_weights,
  );

  for (
    const [
      overlapGroup,
      familyCap,
    ] of Object.entries(
      candidate.overlap_group_caps,
    )
  ) {
    assertNonEmptyString(
      overlapGroup,
      "candidate.overlap_group_caps key",
    );

    assertNonNegativeNumber(
      familyCap,
      `candidate.overlap_group_caps.${overlapGroup}`,
    );
  }

  for (
    const [
      thresholdName,
      thresholdValue,
    ] of Object.entries(
      candidate.block_thresholds,
    )
  ) {
    assertNonEmptyString(
      thresholdName,
      "candidate.block_thresholds key",
    );

    assertFiniteNumber(
      thresholdValue,
      `candidate.block_thresholds.${thresholdName}`,
    );
  }

  for (
    const [
      thresholdName,
      thresholdValue,
    ] of Object.entries(
      candidate.allow_thresholds,
    )
  ) {
    assertNonEmptyString(
      thresholdName,
      "candidate.allow_thresholds key",
    );

    assertFiniteNumber(
      thresholdValue,
      `candidate.allow_thresholds.${thresholdName}`,
    );
  }
}

/* ============================================================================
 * 14. OPTIONAL METRIC VALIDATION
 * ========================================================================== */

function validateMetricEvidence(
  evidence:
    SearchOptionalEvidence<number>,

  fieldName:
    string,
): void {
  if (
    evidence.availability_state ===
    "AVAILABLE"
  ) {
    assertNormalizedMetric(
      evidence.value,
      fieldName,
    );

    return;
  }

  assertNonEmptyString(
    evidence.reason,
    `${fieldName}.reason`,
  );
}

/* ============================================================================
 * 15. EVALUATION VALIDATION
 * ========================================================================== */

function validateEvaluation(
  evaluation:
    SearchCalibrationEvaluation,
): void {
  validateMetricEvidence(
    evaluation.precision_at_k,
    "evaluation.precision_at_k",
  );

  validateMetricEvidence(
    evaluation.recall_at_k,
    "evaluation.recall_at_k",
  );

  validateMetricEvidence(
    evaluation.mean_reciprocal_rank,
    "evaluation.mean_reciprocal_rank",
  );

  validateMetricEvidence(
    evaluation
      .normalized_discounted_cumulative_gain,
    "evaluation.normalized_discounted_cumulative_gain",
  );

  validateMetricEvidence(
    evaluation.block_false_negative_rate,
    "evaluation.block_false_negative_rate",
  );

  validateMetricEvidence(
    evaluation.allow_false_positive_rate,
    "evaluation.allow_false_positive_rate",
  );

  for (
    const [
      index,
      note,
    ] of evaluation
      .evaluation_notes
      .entries()
  ) {
    assertNonEmptyString(
      note,
      `evaluation.evaluation_notes[${String(index)}]`,
    );
  }
}

/* ============================================================================
 * 16. EVALUATED CANDIDATE VALIDATION
 * ========================================================================== */

function validateEvaluatedCandidate(
  evaluated:
    SearchEvaluatedCalibrationPolicyCandidate,
): void {
  validatePolicyCandidate(
    evaluated.candidate,
  );

  validateEvaluation(
    evaluated.evaluation,
  );

  assertNonEmptyString(
    evaluated.resulting_policy_version,
    "evaluated_candidate.resulting_policy_version",
  );
}

/* ============================================================================
 * 17. UNIQUE CANDIDATE IDENTITY
 * ========================================================================== */

function validateUniqueCandidateIdentities(
  candidates:
    readonly SearchEvaluatedCalibrationPolicyCandidate[],
): void {
  const candidateIds =
    new Set<string>();

  for (
    const evaluatedCandidate of
    candidates
  ) {
    const candidatePolicyId =
      evaluatedCandidate
        .candidate
        .candidate_policy_id;

    if (
      candidateIds.has(
        candidatePolicyId,
      )
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
          `Boundary violation: duplicate calibration candidate ${candidatePolicyId}.`,
      );
    }

    candidateIds.add(
      candidatePolicyId,
    );
  }
}

/* ============================================================================
 * 18. SELECTION POLICY VALIDATION
 * ========================================================================== */

function validateSelectionPolicy(
  policy:
    SearchCalibrationSelectionPolicy,
): void {
  assertNonEmptyString(
    policy.policy_version,
    "selection_policy.policy_version",
  );

  assertPositiveInteger(
    policy.minimum_candidate_count,
    "selection_policy.minimum_candidate_count",
  );

  if (
    policy.criteria.length ===
    0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
        "Policy violation: at least one calibration selection criterion is required.",
    );
  }

  const metricNames =
    policy.criteria.map(
      (criterion) =>
        criterion.metric_name,
    );

  if (
    new Set(
      metricNames,
    ).size !==
    metricNames.length
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
        "Policy violation: a calibration metric may appear only once in selection criteria.",
    );
  }

  for (
    const criterion of
    policy.criteria
  ) {
    switch (
      criterion.direction
    ) {
      case "MAXIMIZE":
      case "MINIMIZE":
        break;

      default: {
        const unreachable:
          never =
          criterion.direction;

        throw new Error(
          `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
            `Policy violation: unsupported metric direction ${String(unreachable)}.`,
        );
      }
    }
  }

  if (
    policy.final_tie_break_method !==
    "CANDIDATE_POLICY_ID_ASC"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
        "Policy violation: unsupported final calibration tie-break method.",
    );
  }
}

/* ============================================================================
 * 19. TEMPORAL BOUNDARY
 * ----------------------------------------------------------------------------
 * Calibration selection cannot predate:
 * - the calibration dataset;
 * - any candidate policy participating in that selection.
 *
 * Evaluation timestamps are not validated here because
 * SearchCalibrationEvaluation currently contains no timestamp identity.
 * ========================================================================== */

function validateCalibrationTemporalBoundary(
  input:
    SearchCalibrationInput,
): void {
  const calibrationTimestamp =
    Date.parse(
      input.created_at,
    );

  const datasetTimestamp =
    Date.parse(
      input.dataset.created_at,
    );

  if (
    calibrationTimestamp <
    datasetTimestamp
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
        "Temporal boundary violation: calibration selection predates SearchCalibrationDataset.",
    );
  }

  for (
    const evaluatedCandidate of
    input.evaluated_candidates
  ) {
    const candidateTimestamp =
      Date.parse(
        evaluatedCandidate
          .candidate
          .created_at,
      );

    if (
      calibrationTimestamp <
      candidateTimestamp
    ) {
      throw new Error(
        `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
          `Temporal boundary violation: calibration selection predates candidate ${evaluatedCandidate.candidate.candidate_policy_id}.`,
      );
    }
  }
}

/* ============================================================================
 * 20. METRIC READER
 * ----------------------------------------------------------------------------
 * Reads canonical supplied evaluation truth only.
 * ========================================================================== */

function readMetric(
  evaluation:
    SearchCalibrationEvaluation,

  metricName:
    SearchCalibrationMetricName,
): SearchOptionalEvidence<number> {
  switch (
    metricName
  ) {
    case "precision_at_k":
      return evaluation.precision_at_k;

    case "recall_at_k":
      return evaluation.recall_at_k;

    case "mean_reciprocal_rank":
      return evaluation.mean_reciprocal_rank;

    case "normalized_discounted_cumulative_gain":
      return evaluation
        .normalized_discounted_cumulative_gain;

    case "block_false_negative_rate":
      return evaluation
        .block_false_negative_rate;

    case "allow_false_positive_rate":
      return evaluation
        .allow_false_positive_rate;
  }
}

/* ============================================================================
 * 21. CANDIDATE QUALIFICATION
 * ----------------------------------------------------------------------------
 * Required missing evidence rejects candidate participation.
 *
 * Optional missing evidence degrades qualification but never becomes zero.
 * ========================================================================== */

function qualifyCandidate(
  evaluated:
    SearchEvaluatedCalibrationPolicyCandidate,

  policy:
    SearchCalibrationSelectionPolicy,
): SearchQualifiedCalibrationCandidate {
  const degradationReasons:
    string[] = [];

  let candidateRejected =
    false;

  for (
    const criterion of
    policy.criteria
  ) {
    const metricEvidence =
      readMetric(
        evaluated.evaluation,
        criterion.metric_name,
      );

    if (
      metricEvidence.availability_state ===
      "AVAILABLE"
    ) {
      continue;
    }

    degradationReasons.push(
      `CALIBRATION_METRIC_UNAVAILABLE:${criterion.metric_name}:${metricEvidence.availability_state}`,
    );

    if (
      criterion.required
    ) {
      candidateRejected =
        true;

      degradationReasons.push(
        `CALIBRATION_REQUIRED_METRIC_MISSING:${criterion.metric_name}`,
      );
    }
  }

  return Object.freeze({
    evaluated_candidate:
      evaluated,

    validation_state:
      candidateRejected
        ? "REJECTED"
        : degradationReasons.length >
            0
          ? "DEGRADED"
          : "VALID",

    degradation_reasons:
      canonicalStrings(
        degradationReasons,
      ),
  });
}

/* ============================================================================
 * 22. METRIC COMPARISON
 * ----------------------------------------------------------------------------
 * Return semantics:
 * - negative => left preferred
 * - positive => right preferred
 * - zero     => tied
 *
 * Optional unavailable evidence:
 * - AVAILABLE beats unavailable;
 * - unavailable against unavailable ties.
 * ========================================================================== */

function compareMetricEvidence(input: {
  readonly left:
    SearchOptionalEvidence<number>;

  readonly right:
    SearchOptionalEvidence<number>;

  readonly direction:
    SearchCalibrationMetricDirection;
}): number {
  const leftAvailable =
    input.left.availability_state ===
    "AVAILABLE";

  const rightAvailable =
    input.right.availability_state ===
    "AVAILABLE";

  if (
    leftAvailable &&
    !rightAvailable
  ) {
    return -1;
  }

  if (
    !leftAvailable &&
    rightAvailable
  ) {
    return 1;
  }

  if (
    !leftAvailable &&
    !rightAvailable
  ) {
    return 0;
  }

  if (
    input.left.availability_state !==
      "AVAILABLE" ||
    input.right.availability_state !==
      "AVAILABLE"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
        "Internal invariant violation: available metric comparison could not be narrowed.",
    );
  }

  const leftValue =
    input.left.value;

  const rightValue =
    input.right.value;

  if (
    leftValue ===
    rightValue
  ) {
    return 0;
  }

  switch (
    input.direction
  ) {
    case "MAXIMIZE":
      return leftValue >
        rightValue
        ? -1
        : 1;

    case "MINIMIZE":
      return leftValue <
        rightValue
        ? -1
        : 1;
  }
}

/* ============================================================================
 * 23. QUALIFIED CANDIDATE COMPARISON
 * ----------------------------------------------------------------------------
 * Ordered lexicographic comparison only.
 *
 * No hidden composite calibration score exists.
 * ========================================================================== */

function compareQualifiedCandidates(
  left:
    SearchQualifiedCalibrationCandidate,

  right:
    SearchQualifiedCalibrationCandidate,

  policy:
    SearchCalibrationSelectionPolicy,
): number {
  for (
    const criterion of
    policy.criteria
  ) {
    const metricComparison =
      compareMetricEvidence({
        left:
          readMetric(
            left
              .evaluated_candidate
              .evaluation,
            criterion.metric_name,
          ),

        right:
          readMetric(
            right
              .evaluated_candidate
              .evaluation,
            criterion.metric_name,
          ),

        direction:
          criterion.direction,
      });

    if (
      metricComparison !==
      0
    ) {
      return metricComparison;
    }
  }

  return compareStrings(
    left
      .evaluated_candidate
      .candidate
      .candidate_policy_id,

    right
      .evaluated_candidate
      .candidate
      .candidate_policy_id,
  );
}

/* ============================================================================
 * 24. SELECTABLE CANDIDATES
 * ========================================================================== */

function selectQualifiedCandidates(
  qualified:
    readonly SearchQualifiedCalibrationCandidate[],
): readonly SearchQualifiedCalibrationCandidate[] {
  return Object.freeze(
    qualified.filter(
      (candidate) =>
        candidate.validation_state !==
        "REJECTED",
    ),
  );
}

/* ============================================================================
 * 25. CALIBRATION RESULT VALIDATION STATE
 * ----------------------------------------------------------------------------
 * Result state describes the selected candidate's metric completeness.
 *
 * Missing required evidence never reaches selection.
 * ========================================================================== */

function resolveCalibrationValidationState(
  selected:
    SearchQualifiedCalibrationCandidate,
): SearchValidationState {
  if (
    selected.validation_state ===
    "DEGRADED"
  ) {
    return "DEGRADED";
  }

  if (
    selected.validation_state ===
    "VALID"
  ) {
    return "VALID";
  }

  throw new Error(
    `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
      "Internal invariant violation: rejected calibration candidate reached result production.",
  );
}

/* ============================================================================
 * 26. COMPLETE INPUT VALIDATION
 * ========================================================================== */

function validateInput(
  input:
    SearchCalibrationInput,
): void {
  assertValidIsoTimestamp(
    input.created_at,
    "created_at",
  );

  assertNonEmptyString(
    input.calibration_result_id,
    "calibration_result_id",
  );

  validateCalibrationDataset(
    input.dataset,
  );

  validateSelectionPolicy(
    input.selection_policy,
  );

  if (
    input.evaluated_candidates.length <
    input.selection_policy
      .minimum_candidate_count
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
        "Calibration unavailable: candidate population is below the governed minimum.",
    );
  }

  validateUniqueCandidateIdentities(
    input.evaluated_candidates,
  );

  for (
    const evaluatedCandidate of
    input.evaluated_candidates
  ) {
    validateEvaluatedCandidate(
      evaluatedCandidate,
    );
  }

  validateCalibrationTemporalBoundary(
    input,
  );
}

/* ============================================================================
 * 27. CANONICAL PRODUCER
 * ----------------------------------------------------------------------------
 * SearchCalibrationDataset
 * + evaluated SearchCalibrationPolicyCandidate instances
 * + explicit SearchCalibrationSelectionPolicy
 * → SearchCalibrationResult
 *
 * The result is a policy-selection truth only.
 *
 * It does NOT activate the selected policy.
 *
 * Policy activation belongs to a separate governed registry/configuration
 * boundary and applies only to future Search executions.
 * ========================================================================== */

export function runSearchCalibration(
  input:
    SearchCalibrationInput,
): SearchCalibrationResult {
  validateInput(
    input,
  );

  const searchQualifiedCandidates =
    Object.freeze(
      input.evaluated_candidates.map(
        (
          searchEvaluatedCandidate,
        ) =>
          qualifyCandidate(
            searchEvaluatedCandidate,
            input.selection_policy,
          ),
      ),
    );

  const searchSelectableCandidates =
    selectQualifiedCandidates(
      searchQualifiedCandidates,
    );

  if (
    searchSelectableCandidates.length <
    input.selection_policy
      .minimum_candidate_count
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
        "Calibration unavailable: insufficient candidates retain all required evaluation evidence.",
    );
  }

  const searchOrderedCandidates =
    [...searchSelectableCandidates].sort(
      (
        left,
        right,
      ) =>
        compareQualifiedCandidates(
          left,
          right,
          input.selection_policy,
        ),
    );

  const searchSelectedCandidate =
    searchOrderedCandidates[0];

  if (
    searchSelectedCandidate ===
    undefined
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_CALIBRATION_MODULE_NAME}] ` +
        "Internal invariant violation: no calibration candidate was selected.",
    );
  }

  const searchSelectedEvaluatedCandidate =
    searchSelectedCandidate
      .evaluated_candidate;

  return Object.freeze({
    contract_version:
      XYVALA_SEARCH_CALIBRATION_RESULT_CONTRACT_VERSION,

    created_at:
      input.created_at,

    calibration_result_id:
      input.calibration_result_id,

    calibration_dataset_id:
      input.dataset
        .calibration_dataset_id,

    selected_policy_id:
      searchSelectedEvaluatedCandidate
        .candidate
        .candidate_policy_id,

    evaluation:
      searchSelectedEvaluatedCandidate
        .evaluation,

    resulting_policy_version:
      searchSelectedEvaluatedCandidate
        .resulting_policy_version,

    calibrator_module_version:
      XYVALA_SEARCH_CALIBRATION_MODULE_VERSION,

    validation_state:
      resolveCalibrationValidationState(
        searchSelectedCandidate,
      ),
  });
}
