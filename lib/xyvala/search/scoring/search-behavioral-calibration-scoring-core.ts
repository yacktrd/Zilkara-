/* ============================================================================
 * FILE: lib/xyvala/search/scoring/search-behavioral-calibration-scoring-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Search canonical behavioral calibration scoring core
 *
 * ROLE
 * - consume canonical SearchBehavioralSignals
 * - produce canonical SearchBehavioralCalibrationScoreVector evidence
 * - calibrate observed ranking-performance evidence without recreating
 *   behavioral truth
 * - preserve canonical document and query identities
 * - preserve behavioral sample confidence
 * - preserve explicit missing-data semantics
 * - preserve scoring-policy lineage
 *
 * CLASSIFICATION
 * - PRIVATE CORE
 * - SEARCH DOMAIN
 * - BEHAVIORAL_CALIBRATION_SCORING
 * - COMPUTE
 * - PURE
 * - DETERMINISTIC
 * - NON-MUTATING
 * - NON-PUBLIC
 * - CANONICAL PRODUCER
 *
 * POSITION IN OFFICIAL PIPELINE
 * ----------------------------------------------------------------------------
 *
 * BEHAVIORAL_SIGNAL_DETECTION
 *        ↓
 * SearchBehavioralSignals
 *        ↓
 * BEHAVIORAL_CALIBRATION_SCORING
 *        ↓
 * SearchOptionalEvidence<SearchBehavioralCalibrationScoreVector>
 *        ↓
 * POSITIVE_SCORE_ASSEMBLY
 *
 * PRODUCES
 * - SearchOptionalEvidence<SearchBehavioralCalibrationScoreVector>
 *
 * DOES NOT PRODUCE
 * - SearchBehavioralSignals
 * - observed_ctr
 * - expected_ctr_at_position
 * - position_adjusted_ctr
 * - sample_confidence
 * - query relevance
 * - document quality
 * - eligibility
 * - private decision
 * - public ranking
 *
 * PARENTS
 * - Xyvala official protocol
 * - Xyvala Search official protocol
 * - SearchBehavioralSignals
 * - SearchBehavioralCalibrationScoreVector
 * - SearchSubScore
 * - SearchOptionalEvidence
 * - Contract Before Runtime Rule
 * - First Divergence Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Compute / Observe / Mutate Separation
 * - Missing Data Explicitness Rule
 *
 * CONSUMERS
 * - Search Positive Score Assembler
 * - Search Runtime Orchestrator
 * - Search Private Snapshot Builder
 * - Search traceability
 * - Search integration tests
 *
 * DIRECTIVES
 * - consume SearchBehavioralSignals only
 * - one canonical behavioral calibration scorer
 * - explicit scoring policy
 * - explicit CTR basis
 * - explicit normalization policy
 * - explicit missing-evidence policy
 * - explicit policy lineage
 * - no SearchQueryDocumentSignals access
 * - no SearchGlobalScore access
 * - no SearchEligibilityResult access
 * - no SearchPrivateDecision access
 * - no public-ranking access
 * - no raw behavioral observation access
 * - no runtime clock access
 * - no random identifier generation
 * - no persistence
 * - no logging
 * - no network access
 * - no provider access
 * - no hidden fallback
 * - no default scoring policy
 * - no unavailable-to-zero conversion
 * - no unavailable-to-neutral conversion
 * - no observed_ctr reconstruction
 * - no position_adjusted_ctr reconstruction
 * - no sample_confidence reconstruction
 * - no dwell-time normalization invented locally
 * - no impression-count normalization invented locally
 * - no click-count normalization invented locally
 *
 * BEHAVIORAL STATE GOVERNANCE
 * ----------------------------------------------------------------------------
 * CALIBRATED
 * - behavioral evidence may cross this scoring boundary;
 * - field-level availability remains authoritative;
 * - the scoring policy still determines whether required score evidence exists.
 *
 * INSUFFICIENT_DATA
 * - no behavioral calibration score may be produced;
 * - result remains explicitly INSUFFICIENT_DATA.
 *
 * UNAVAILABLE
 * - no behavioral calibration score may be produced;
 * - result remains explicitly UNAVAILABLE.
 *
 * This scorer never promotes INSUFFICIENT_DATA to calibrated truth.
 *
 * SAMPLE CONFIDENCE GOVERNANCE
 * ----------------------------------------------------------------------------
 * SearchBehavioralSignals.sample_confidence is canonical upstream truth.
 *
 * It is consumed as:
 *
 * SearchSubScore.confidence
 *
 * It is NOT:
 * - a scoring feature;
 * - multiplied into behavioral_calibration_score;
 * - reconstructed from impressions;
 * - reconstructed from clicks;
 * - reconstructed from CTR;
 * - reduced locally because another optional feature is unavailable.
 *
 * Feature degradation is represented through:
 * - validation_state;
 * - degradation_reasons;
 * - SearchSubScore.missing_data.
 *
 * CTR BASIS GOVERNANCE
 * ----------------------------------------------------------------------------
 * Exactly one CTR basis is selected by policy:
 *
 * OBSERVED_CTR
 * - consumes SearchBehavioralSignals.observed_ctr;
 *
 * POSITION_ADJUSTED_CTR
 * - consumes SearchBehavioralSignals.position_adjusted_ctr.
 *
 * There is NO implicit fallback.
 *
 * Example:
 *
 * policy.ctr_basis === "POSITION_ADJUSTED_CTR"
 *
 * and position_adjusted_ctr is unavailable:
 *
 * => score is unavailable
 *
 * even if observed_ctr is AVAILABLE.
 *
 * Falling back automatically would create a second, hidden scoring policy.
 *
 * NORMALIZATION GOVERNANCE
 * ----------------------------------------------------------------------------
 * observed_ctr is canonically bounded to [0, 1].
 *
 * position_adjusted_ctr is not assumed to be bounded to [0, 1].
 *
 * Therefore CTR score normalization is policy-controlled.
 *
 * Supported methods:
 *
 * IDENTITY_UNIT_INTERVAL
 * - source value must already belong to [0, 1];
 * - no transformation except identity.
 *
 * LINEAR_RANGE
 * - explicit minimum and maximum belong to the policy;
 * - value is normalized deterministically to [0, 1];
 * - out-of-range handling is explicit:
 *   - CLAMP
 *   - RETURN_UNAVAILABLE
 *
 * No hidden range, cap or saturation curve exists.
 *
 * RETURN-TO-RESULTS GOVERNANCE
 * ----------------------------------------------------------------------------
 * SearchBehavioralSignals.return_to_results_rate is already a canonical
 * [0, 1] rate.
 *
 * It is interpreted as negative calibration evidence:
 *
 * contribution = 1 - return_to_results_rate
 *
 * Its weight and requirement status are explicit policy truth.
 *
 * If it is optional and unavailable:
 *
 * EXCLUDE_AND_RENORMALIZE
 * - the missing feature receives no numerical value;
 * - available weight is renormalized;
 * - output becomes DEGRADED.
 *
 * RETURN_UNAVAILABLE
 * - no score vector is produced.
 *
 * RAW BEHAVIORAL VALUES NOT SCORED HERE
 * ----------------------------------------------------------------------------
 * impressions
 * - observed count only;
 * - no local count-to-score normalization contract exists.
 *
 * clicks
 * - observed count only;
 * - no local count-to-score normalization contract exists.
 *
 * expected_ctr_at_position
 * - behavioral reference evidence;
 * - position_adjusted_ctr already owns the canonical adjusted truth;
 * - this scorer must not reconstruct that adjustment.
 *
 * dwell_time_ms
 * - observed duration evidence;
 * - no canonical Search normalization method currently exists at this layer;
 * - therefore it does not enter behavioral_calibration_score.
 *
 * sample_confidence
 * - reliability evidence only;
 * - transported as SearchSubScore.confidence.
 *
 * SCORE FORM
 * ----------------------------------------------------------------------------
 * behavioral_calibration_score is a weighted average of AVAILABLE authorized
 * score contributions only.
 *
 * Missing evidence never contributes:
 * - 0;
 * - 0.5;
 * - any neutral synthetic value.
 *
 * INVARIANTS
 * - one score belongs to exactly one document
 * - one score belongs to exactly one query
 * - same canonical input + same policy => same output
 * - no input object is mutated
 * - no upstream behavioral identity is reconstructed
 * - no unavailable evidence becomes zero
 * - no unavailable evidence enters arithmetic
 * - one explicit CTR basis is used
 * - no automatic CTR fallback exists
 * - sample_confidence is transported unchanged
 * - score value remains within [0, 1]
 * - query identity is preserved exactly
 * - document identity is preserved exactly
 * - created_at is supplied explicitly
 * - scoring policy is supplied explicitly
 * - no default policy exists
 *
 * FIRST DIVERGENCE
 * ----------------------------------------------------------------------------
 * malformed SearchBehavioralSignals
 * => Behavioral Signal Detection / scoring input boundary
 *
 * REJECTED or UNVALIDATED behavioral truth
 * => Behavioral Signal Detection boundary
 *
 * INSUFFICIENT_DATA behavioral state
 * => Behavioral Signal Detection boundary
 *
 * UNAVAILABLE behavioral state
 * => Behavioral Signal Detection boundary
 *
 * selected CTR basis unavailable
 * => Behavioral Calibration Scoring policy/evidence boundary
 *
 * sample_confidence unavailable for CALIBRATED state
 * => Behavioral Signal Detection contract divergence
 *
 * sample_confidence below active scoring threshold
 * => Behavioral Calibration Scoring policy boundary
 *
 * observed_ctr reconstructed here
 * => Behavioral Signal Detection ownership violation
 *
 * position_adjusted_ctr reconstructed here
 * => Behavioral Signal Detection ownership violation
 *
 * sample_confidence reconstructed here
 * => Behavioral Signal Detection ownership violation
 *
 * relevance accessed here
 * => scorer ownership violation
 *
 * public ranking accessed here
 * => private/public boundary violation
 * ========================================================================== */

import type {
  SearchAvailabilityState,
  SearchBehavioralCalibrationScoreVector,
  SearchBehavioralSignals,
  SearchConfidenceScore,
  SearchContractVersion,
  SearchCount,
  SearchIsoTimestamp,
  SearchModuleVersion,
  SearchNormalizedScore,
  SearchOptionalEvidence,
  SearchPolicyVersion,
  SearchRatio,
  SearchScoreName,
  SearchSignalFamily,
  SearchSubScore,
  SearchValidationState,
  SearchWeight,
} from "../contracts/search-pipeline-contract";

/* ============================================================================
 * 1. MODULE IDENTITY
 * ========================================================================== */

export const XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SCORING_MODULE_NAME =
  "xyvala-search-behavioral-calibration-scoring-core" as const;

export const XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SCORING_MODULE_VERSION:
  SearchModuleVersion =
    "1.0.0";

export const XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SCORING_CONTRACT_VERSION:
  SearchContractVersion =
    "1.0.0";

export const XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SCORE_NAME:
  SearchScoreName =
    "behavioral_calibration_score";

export const XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SIGNAL_FAMILY:
  SearchSignalFamily =
    "BEHAVIORAL_CALIBRATION";

/* ============================================================================
 * 2. CTR BASIS
 * ----------------------------------------------------------------------------
 * Exactly one canonical CTR truth is selected.
 *
 * No implicit fallback exists.
 * ========================================================================== */

export type SearchBehavioralCalibrationCtrBasis =
  | "OBSERVED_CTR"
  | "POSITION_ADJUSTED_CTR";

/* ============================================================================
 * 3. CTR NORMALIZATION POLICY
 * ========================================================================== */

export interface SearchBehavioralCalibrationIdentityNormalization {
  readonly method:
    "IDENTITY_UNIT_INTERVAL";
}

export interface SearchBehavioralCalibrationLinearRangeNormalization {
  readonly method:
    "LINEAR_RANGE";

  readonly minimum:
    number;

  readonly maximum:
    number;

  readonly out_of_range_method:
    | "CLAMP"
    | "RETURN_UNAVAILABLE";
}

export type SearchBehavioralCalibrationCtrNormalization =
  | SearchBehavioralCalibrationIdentityNormalization
  | SearchBehavioralCalibrationLinearRangeNormalization;

/* ============================================================================
 * 4. OPTIONAL FEATURE MISSING-EVIDENCE METHOD
 * ========================================================================== */

export type SearchBehavioralCalibrationMissingEvidenceMethod =
  | "EXCLUDE_AND_RENORMALIZE"
  | "RETURN_UNAVAILABLE";

/* ============================================================================
 * 5. SCORING POLICY
 * ----------------------------------------------------------------------------
 * No default policy is declared by this canonical core.
 *
 * Active policy must be supplied by the application/calibration lifecycle.
 * ========================================================================== */

export interface SearchBehavioralCalibrationScoringPolicy {
  readonly policy_version:
    SearchPolicyVersion;

  readonly scoring_method:
    string;

  readonly overlap_group:
    string;

  /**
   * Exactly one canonical CTR basis.
   */
  readonly ctr_basis:
    SearchBehavioralCalibrationCtrBasis;

  /**
   * Explicit normalization for the selected CTR basis.
   */
  readonly ctr_normalization:
    SearchBehavioralCalibrationCtrNormalization;

  /**
   * Primary calibration feature.
   *
   * Must be strictly positive.
   */
  readonly ctr_weight:
    SearchWeight;

  /**
   * Optional negative behavioral-quality evidence.
   *
   * 0 disables the feature.
   */
  readonly return_to_results_rate_weight:
    SearchWeight;

  /**
   * If true and return_to_results_rate_weight > 0, the field must be
   * AVAILABLE.
   */
  readonly return_to_results_rate_required:
    boolean;

  /**
   * Governs missing optional return-to-results evidence.
   */
  readonly missing_optional_evidence_method:
    SearchBehavioralCalibrationMissingEvidenceMethod;

  /**
   * Minimum canonical behavioral sample confidence required before scoring.
   *
   * This threshold qualifies whether scoring is authorized.
   *
   * It does NOT alter the confidence value.
   */
  readonly minimum_sample_confidence:
    SearchConfidenceScore;
}

/* ============================================================================
 * 6. CANONICAL SCORER INPUT
 * ========================================================================== */

export interface SearchBehavioralCalibrationScoringInput {
  readonly behavioral_signals:
    SearchBehavioralSignals;

  /**
   * Explicit scorer timestamp.
   *
   * No local runtime clock is read.
   */
  readonly created_at:
    SearchIsoTimestamp;

  readonly policy:
    SearchBehavioralCalibrationScoringPolicy;
}

/* ============================================================================
 * 7. VALIDATION RESULT
 * ========================================================================== */

export interface SearchBehavioralCalibrationScoringValidationResult {
  readonly valid:
    boolean;

  readonly errors:
    readonly string[];
}

/* ============================================================================
 * 8. INTERNAL SCORE CONTRIBUTION
 * ========================================================================== */

interface SearchBehavioralCalibrationContribution {
  readonly feature_name:
    "observed_ctr"
    | "position_adjusted_ctr"
    | "return_to_results_rate";

  readonly source_value:
    number;

  readonly contribution_value:
    SearchNormalizedScore;

  readonly weight:
    SearchWeight;
}

/* ============================================================================
 * 9. PRIMITIVE HELPERS
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

function isFiniteNumber(
  value:
    unknown,
): value is number {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
  );
}

function isNonNegativeFiniteNumber(
  value:
    unknown,
): value is number {
  return (
    isFiniteNumber(
      value,
    ) &&
    value >= 0
  );
}

function isNonNegativeInteger(
  value:
    unknown,
): value is number {
  return (
    Number.isInteger(
      value,
    ) &&
    isNonNegativeFiniteNumber(
      value,
    )
  );
}

function isUnitIntervalNumber(
  value:
    unknown,
): value is number {
  return (
    isFiniteNumber(
      value,
    ) &&
    value >= 0 &&
    value <= 1
  );
}

function isValidIsoTimestamp(
  value:
    unknown,
): value is SearchIsoTimestamp {
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
 * 10. OPTIONAL EVIDENCE STRUCTURE
 * ========================================================================== */

function validateOptionalEvidenceStructure<T>(
  evidence:
    SearchOptionalEvidence<T>,

  fieldName:
    string,
): readonly string[] {
  const errors:
    string[] =
    [];

  if (
    evidence === null ||
    typeof evidence !==
      "object"
  ) {
    errors.push(
      `${fieldName} must be explicit SearchOptionalEvidence.`,
    );

    return errors;
  }

  if (
    evidence.availability_state ===
      "AVAILABLE"
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        evidence,
        "value",
      )
    ) {
      errors.push(
        `${fieldName} AVAILABLE evidence must contain value.`,
      );
    }

    return errors;
  }

  if (
    evidence.availability_state !==
      "UNAVAILABLE" &&
    evidence.availability_state !==
      "INSUFFICIENT_DATA" &&
    evidence.availability_state !==
      "INSUFFICIENT_HISTORY" &&
    evidence.availability_state !==
      "UNSUPPORTED" &&
    evidence.availability_state !==
      "INVALID"
  ) {
    errors.push(
      `${fieldName} has unsupported availability_state.`,
    );

    return errors;
  }

  if (
    !isNonEmptyString(
      evidence.reason,
    )
  ) {
    errors.push(
      `${fieldName} non-AVAILABLE evidence requires a non-empty reason.`,
    );
  }

  return errors;
}

/* ============================================================================
 * 11. COUNT EVIDENCE VALIDATION
 * ========================================================================== */

function validateCountEvidence(
  evidence:
    SearchOptionalEvidence<SearchCount>,

  fieldName:
    string,
): readonly string[] {
  const errors =
    [
      ...validateOptionalEvidenceStructure(
        evidence,
        fieldName,
      ),
    ];

  if (
    evidence.availability_state ===
      "AVAILABLE" &&
    !isNonNegativeInteger(
      evidence.value,
    )
  ) {
    errors.push(
      `${fieldName} AVAILABLE value must be a non-negative integer.`,
    );
  }

  return errors;
}

/* ============================================================================
 * 12. UNIT-RATIO EVIDENCE VALIDATION
 * ========================================================================== */

function validateUnitRatioEvidence(
  evidence:
    SearchOptionalEvidence<SearchRatio>,

  fieldName:
    string,
): readonly string[] {
  const errors =
    [
      ...validateOptionalEvidenceStructure(
        evidence,
        fieldName,
      ),
    ];

  if (
    evidence.availability_state ===
      "AVAILABLE" &&
    !isUnitIntervalNumber(
      evidence.value,
    )
  ) {
    errors.push(
      `${fieldName} AVAILABLE value must be a finite number between 0 and 1.`,
    );
  }

  return errors;
}

/* ============================================================================
 * 13. POSITION-ADJUSTED CTR VALIDATION
 * ----------------------------------------------------------------------------
 * Position-adjusted CTR is not assumed to be unit bounded.
 * ========================================================================== */

function validatePositionAdjustedCtrEvidence(
  evidence:
    SearchOptionalEvidence<SearchRatio>,

  fieldName:
    string,
): readonly string[] {
  const errors =
    [
      ...validateOptionalEvidenceStructure(
        evidence,
        fieldName,
      ),
    ];

  if (
    evidence.availability_state ===
      "AVAILABLE" &&
    !isNonNegativeFiniteNumber(
      evidence.value,
    )
  ) {
    errors.push(
      `${fieldName} AVAILABLE value must be a finite non-negative number.`,
    );
  }

  return errors;
}

/* ============================================================================
 * 14. DURATION EVIDENCE VALIDATION
 * ----------------------------------------------------------------------------
 * Dwell time is validated as canonical upstream truth.
 *
 * It does not enter score arithmetic in this version.
 * ========================================================================== */

function validateDurationEvidence(
  evidence:
    SearchBehavioralSignals["dwell_time_ms"],

  fieldName:
    string,
): readonly string[] {
  const errors =
    [
      ...validateOptionalEvidenceStructure(
        evidence,
        fieldName,
      ),
    ];

  if (
    evidence.availability_state ===
      "AVAILABLE" &&
    !isNonNegativeFiniteNumber(
      evidence.value,
    )
  ) {
    errors.push(
      `${fieldName} AVAILABLE value must be a finite non-negative duration.`,
    );
  }

  return errors;
}

/* ============================================================================
 * 15. CONFIDENCE EVIDENCE VALIDATION
 * ========================================================================== */

function validateConfidenceEvidence(
  evidence:
    SearchOptionalEvidence<SearchConfidenceScore>,

  fieldName:
    string,
): readonly string[] {
  const errors =
    [
      ...validateOptionalEvidenceStructure(
        evidence,
        fieldName,
      ),
    ];

  if (
    evidence.availability_state ===
      "AVAILABLE" &&
    !isUnitIntervalNumber(
      evidence.value,
    )
  ) {
    errors.push(
      `${fieldName} AVAILABLE value must be a finite number between 0 and 1.`,
    );
  }

  return errors;
}

/* ============================================================================
 * 16. POLICY VALIDATION
 * ========================================================================== */

function validateBehavioralCalibrationScoringPolicy(
  policy:
    SearchBehavioralCalibrationScoringPolicy,
): readonly string[] {
  const errors:
    string[] =
    [];

  if (
    !isNonEmptyString(
      policy.policy_version,
    )
  ) {
    errors.push(
      "policy.policy_version must be a non-empty string.",
    );
  }

  if (
    !isNonEmptyString(
      policy.scoring_method,
    )
  ) {
    errors.push(
      "policy.scoring_method must be a non-empty string.",
    );
  }

  if (
    !isNonEmptyString(
      policy.overlap_group,
    )
  ) {
    errors.push(
      "policy.overlap_group must be a non-empty string.",
    );
  }

  if (
    policy.ctr_basis !==
      "OBSERVED_CTR" &&
    policy.ctr_basis !==
      "POSITION_ADJUSTED_CTR"
  ) {
    errors.push(
      "policy.ctr_basis must be OBSERVED_CTR or POSITION_ADJUSTED_CTR.",
    );
  }

  if (
    !isFiniteNumber(
      policy.ctr_weight,
    ) ||
    policy.ctr_weight <=
      0
  ) {
    errors.push(
      "policy.ctr_weight must be finite and strictly positive.",
    );
  }

  if (
    !isFiniteNumber(
      policy.return_to_results_rate_weight,
    ) ||
    policy.return_to_results_rate_weight <
      0
  ) {
    errors.push(
      "policy.return_to_results_rate_weight must be finite and non-negative.",
    );
  }

  if (
    typeof policy.return_to_results_rate_required !==
      "boolean"
  ) {
    errors.push(
      "policy.return_to_results_rate_required must be boolean.",
    );
  }

  if (
    policy.return_to_results_rate_required &&
    policy.return_to_results_rate_weight <=
      0
  ) {
    errors.push(
      "required return_to_results_rate requires a strictly positive weight.",
    );
  }

  if (
    policy.missing_optional_evidence_method !==
      "EXCLUDE_AND_RENORMALIZE" &&
    policy.missing_optional_evidence_method !==
      "RETURN_UNAVAILABLE"
  ) {
    errors.push(
      "policy.missing_optional_evidence_method is invalid.",
    );
  }

  if (
    !isUnitIntervalNumber(
      policy.minimum_sample_confidence,
    )
  ) {
    errors.push(
      "policy.minimum_sample_confidence must be between 0 and 1.",
    );
  }

  switch (
    policy.ctr_normalization.method
  ) {
    case "IDENTITY_UNIT_INTERVAL":
      break;

    case "LINEAR_RANGE": {
      if (
        !isFiniteNumber(
          policy.ctr_normalization.minimum,
        )
      ) {
        errors.push(
          "policy.ctr_normalization.minimum must be finite.",
        );
      }

      if (
        !isFiniteNumber(
          policy.ctr_normalization.maximum,
        )
      ) {
        errors.push(
          "policy.ctr_normalization.maximum must be finite.",
        );
      }

      if (
        isFiniteNumber(
          policy.ctr_normalization.minimum,
        ) &&
        isFiniteNumber(
          policy.ctr_normalization.maximum,
        ) &&
        policy.ctr_normalization.maximum <=
          policy.ctr_normalization.minimum
      ) {
        errors.push(
          "policy.ctr_normalization.maximum must be greater than minimum.",
        );
      }

      if (
        policy.ctr_normalization.out_of_range_method !==
          "CLAMP" &&
        policy.ctr_normalization.out_of_range_method !==
          "RETURN_UNAVAILABLE"
      ) {
        errors.push(
          "policy.ctr_normalization.out_of_range_method is invalid.",
        );
      }

      break;
    }

    default: {
      const exhaustiveCheck:
        never =
        policy.ctr_normalization;

      void exhaustiveCheck;
    }
  }

  return errors;
}

/* ============================================================================
 * 17. BEHAVIORAL SIGNAL STRUCTURAL VALIDATION
 * ========================================================================== */

function validateBehavioralSignalsForScoring(
  signals:
    SearchBehavioralSignals,
): readonly string[] {
  const errors:
    string[] =
    [];

  if (
    !isNonEmptyString(
      signals.contract_version,
    )
  ) {
    errors.push(
      "behavioral_signals.contract_version must be a non-empty string.",
    );
  }

  if (
    !isValidIsoTimestamp(
      signals.created_at,
    )
  ) {
    errors.push(
      "behavioral_signals.created_at must be a valid ISO timestamp.",
    );
  }

  if (
    !isNonEmptyString(
      signals.document_id,
    )
  ) {
    errors.push(
      "behavioral_signals.document_id must be a non-empty string.",
    );
  }

  if (
    !isNonEmptyString(
      signals.query_id,
    )
  ) {
    errors.push(
      "behavioral_signals.query_id must be a non-empty string.",
    );
  }

  if (
    !isNonEmptyString(
      signals.minimum_impressions_policy_version,
    )
  ) {
    errors.push(
      "behavioral_signals.minimum_impressions_policy_version must be a non-empty string.",
    );
  }

  errors.push(
    ...validateCountEvidence(
      signals.impressions,
      "behavioral_signals.impressions",
    ),

    ...validateCountEvidence(
      signals.clicks,
      "behavioral_signals.clicks",
    ),

    ...validateUnitRatioEvidence(
      signals.observed_ctr,
      "behavioral_signals.observed_ctr",
    ),

    ...validateUnitRatioEvidence(
      signals.expected_ctr_at_position,
      "behavioral_signals.expected_ctr_at_position",
    ),

    ...validatePositionAdjustedCtrEvidence(
      signals.position_adjusted_ctr,
      "behavioral_signals.position_adjusted_ctr",
    ),

    ...validateDurationEvidence(
      signals.dwell_time_ms,
      "behavioral_signals.dwell_time_ms",
    ),

    ...validateUnitRatioEvidence(
      signals.return_to_results_rate,
      "behavioral_signals.return_to_results_rate",
    ),

    ...validateConfidenceEvidence(
      signals.sample_confidence,
      "behavioral_signals.sample_confidence",
    ),
  );

  /* --------------------------------------------------------------------------
   * Canonical count coherence
   * ----------------------------------------------------------------------- */

  if (
    signals.impressions
      .availability_state ===
      "AVAILABLE" &&
    signals.clicks
      .availability_state ===
      "AVAILABLE" &&
    signals.clicks.value >
      signals.impressions.value
  ) {
    errors.push(
      "behavioral_signals.clicks cannot exceed canonical impressions.",
    );
  }

  /* --------------------------------------------------------------------------
   * observed_ctr dependencies
   * ----------------------------------------------------------------------- */

  if (
    signals.observed_ctr
      .availability_state ===
      "AVAILABLE"
  ) {
    if (
      signals.impressions
        .availability_state !==
        "AVAILABLE"
    ) {
      errors.push(
        "AVAILABLE observed_ctr requires AVAILABLE impressions.",
      );
    }

    if (
      signals.clicks
        .availability_state !==
        "AVAILABLE"
    ) {
      errors.push(
        "AVAILABLE observed_ctr requires AVAILABLE clicks.",
      );
    }

    if (
      signals.impressions
        .availability_state ===
        "AVAILABLE" &&
      signals.impressions.value ===
        0
    ) {
      errors.push(
        "AVAILABLE observed_ctr is not authorized when impressions equals zero.",
      );
    }
  }

  /* --------------------------------------------------------------------------
   * position_adjusted_ctr dependencies
   * ----------------------------------------------------------------------- */

  if (
    signals.position_adjusted_ctr
      .availability_state ===
      "AVAILABLE"
  ) {
    if (
      signals.observed_ctr
        .availability_state !==
        "AVAILABLE"
    ) {
      errors.push(
        "AVAILABLE position_adjusted_ctr requires AVAILABLE observed_ctr.",
      );
    }

    if (
      signals.expected_ctr_at_position
        .availability_state !==
        "AVAILABLE"
    ) {
      errors.push(
        "AVAILABLE position_adjusted_ctr requires AVAILABLE expected_ctr_at_position.",
      );
    }
  }

  /* --------------------------------------------------------------------------
   * Behavioral-state coherence
   * ----------------------------------------------------------------------- */

  if (
    signals.behavioral_state ===
      "CALIBRATED"
  ) {
    if (
      signals.impressions
        .availability_state !==
        "AVAILABLE"
    ) {
      errors.push(
        "CALIBRATED behavioral signals require AVAILABLE impressions.",
      );
    }

    if (
      signals.clicks
        .availability_state !==
        "AVAILABLE"
    ) {
      errors.push(
        "CALIBRATED behavioral signals require AVAILABLE clicks.",
      );
    }

    if (
      signals.observed_ctr
        .availability_state !==
        "AVAILABLE"
    ) {
      errors.push(
        "CALIBRATED behavioral signals require AVAILABLE observed_ctr.",
      );
    }

    if (
      signals.sample_confidence
        .availability_state !==
        "AVAILABLE"
    ) {
      errors.push(
        "CALIBRATED behavioral signals require AVAILABLE sample_confidence.",
      );
    }
  }

  if (
    signals.behavioral_state ===
      "UNAVAILABLE"
  ) {
    const evidenceStates =
      [
        signals.impressions,
        signals.clicks,
        signals.observed_ctr,
        signals.expected_ctr_at_position,
        signals.position_adjusted_ctr,
        signals.dwell_time_ms,
        signals.return_to_results_rate,
        signals.sample_confidence,
      ];

    if (
      evidenceStates.some(
        (evidence) =>
          evidence.availability_state ===
            "AVAILABLE",
      )
    ) {
      errors.push(
        "UNAVAILABLE behavioral_state cannot contain AVAILABLE behavioral evidence.",
      );
    }
  }

  return errors;
}

/* ============================================================================
 * 18. CANONICAL INPUT VALIDATION
 * ========================================================================== */

export function validateSearchBehavioralCalibrationScoringInput(
  input:
    SearchBehavioralCalibrationScoringInput,
): SearchBehavioralCalibrationScoringValidationResult {
  const errors:
    string[] =
    [];

  if (
    !isValidIsoTimestamp(
      input.created_at,
    )
  ) {
    errors.push(
      "created_at must be a valid ISO timestamp.",
    );
  }

  errors.push(
    ...validateBehavioralSignalsForScoring(
      input.behavioral_signals,
    ),

    ...validateBehavioralCalibrationScoringPolicy(
      input.policy,
    ),
  );

  if (
    isValidIsoTimestamp(
      input.created_at,
    ) &&
    isValidIsoTimestamp(
      input.behavioral_signals.created_at,
    ) &&
    Date.parse(
      input.created_at,
    ) <
      Date.parse(
        input.behavioral_signals.created_at,
      )
  ) {
    errors.push(
      "created_at cannot predate canonical behavioral_signals.created_at.",
    );
  }

  return Object.freeze({
    valid:
      errors.length ===
      0,

    errors:
      Object.freeze([
        ...errors,
      ]),
  });
}

/* ============================================================================
 * 19. NON-AVAILABLE RESULT FACTORY
 * ========================================================================== */

function unavailableBehavioralCalibrationScoreVector(
  availabilityState:
    Exclude<
      SearchAvailabilityState,
      "AVAILABLE"
    >,

  reason:
    string,
): SearchOptionalEvidence<SearchBehavioralCalibrationScoreVector> {
  return Object.freeze({
    availability_state:
      availabilityState,

    reason,
  });
}

/* ============================================================================
 * 20. SELECTED CTR EVIDENCE
 * ----------------------------------------------------------------------------
 * Explicit selection only.
 *
 * No fallback between CTR identities.
 * ========================================================================== */

function getSelectedCtrEvidence(
  signals:
    SearchBehavioralSignals,

  basis:
    SearchBehavioralCalibrationCtrBasis,
): SearchOptionalEvidence<SearchRatio> {
  switch (
    basis
  ) {
    case "OBSERVED_CTR":
      return signals
        .observed_ctr;

    case "POSITION_ADJUSTED_CTR":
      return signals
        .position_adjusted_ctr;
  }
}

/* ============================================================================
 * 21. SELECTED CTR FEATURE NAME
 * ========================================================================== */

function getSelectedCtrFeatureName(
  basis:
    SearchBehavioralCalibrationCtrBasis,
):
  | "observed_ctr"
  | "position_adjusted_ctr" {
  switch (
    basis
  ) {
    case "OBSERVED_CTR":
      return "observed_ctr";

    case "POSITION_ADJUSTED_CTR":
      return "position_adjusted_ctr";
  }
}

/* ============================================================================
 * 22. CTR NORMALIZATION
 * ----------------------------------------------------------------------------
 * No default normalization exists.
 *
 * Every transformation is declared by active policy.
 * ========================================================================== */

function normalizeBehavioralCtr(
  value:
    number,

  normalization:
    SearchBehavioralCalibrationCtrNormalization,
): SearchOptionalEvidence<SearchNormalizedScore> {
  switch (
    normalization.method
  ) {
    case "IDENTITY_UNIT_INTERVAL": {
      if (
        !isUnitIntervalNumber(
          value,
        )
      ) {
        return Object.freeze({
          availability_state:
            "UNSUPPORTED",

          reason:
            "selected_ctr_value_outside_identity_unit_interval_domain",
        });
      }

      return Object.freeze({
        availability_state:
          "AVAILABLE",

        value,
      });
    }

    case "LINEAR_RANGE": {
      const minimum =
        normalization.minimum;

      const maximum =
        normalization.maximum;

      if (
        value <
          minimum ||
        value >
          maximum
      ) {
        if (
          normalization.out_of_range_method ===
            "RETURN_UNAVAILABLE"
        ) {
          return Object.freeze({
            availability_state:
              "UNSUPPORTED",

            reason:
              "selected_ctr_value_outside_configured_linear_range",
          });
        }
      }

      const boundedValue =
        normalization.out_of_range_method ===
          "CLAMP"
          ? Math.min(
              maximum,
              Math.max(
                minimum,
                value,
              ),
            )
          : value;

      const normalized =
        (
          boundedValue -
          minimum
        ) /
        (
          maximum -
          minimum
        );

      return Object.freeze({
        availability_state:
          "AVAILABLE",

        value:
          Math.min(
            1,
            Math.max(
              0,
              normalized,
            ),
          ),
      });
    }
  }
}

/* ============================================================================
 * 23. AVAILABILITY PRESERVATION
 * ----------------------------------------------------------------------------
 * Used when required upstream evidence cannot participate.
 *
 * No missing state is converted into a number.
 * ========================================================================== */

function preserveUnavailableState<T>(
  evidence:
    SearchOptionalEvidence<T>,

  fallbackReason:
    string,
): SearchOptionalEvidence<SearchBehavioralCalibrationScoreVector> {
  if (
    evidence.availability_state ===
      "AVAILABLE"
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: preserveUnavailableState received AVAILABLE evidence.",
    );
  }

  return unavailableBehavioralCalibrationScoreVector(
    evidence.availability_state,
    isNonEmptyString(
      evidence.reason,
    )
      ? evidence.reason
      : fallbackReason,
  );
}

/* ============================================================================
 * 24. WEIGHTED SCORE COMPUTATION
 * ----------------------------------------------------------------------------
 * Only AVAILABLE contributions enter arithmetic.
 * ========================================================================== */

function computeBehavioralCalibrationScore(
  contributions:
    readonly SearchBehavioralCalibrationContribution[],
): SearchNormalizedScore {
  let totalWeight =
    0;

  let weightedValue =
    0;

  for (
    const contribution of
    contributions
  ) {
    if (
      contribution.weight <=
        0
    ) {
      continue;
    }

    totalWeight +=
      contribution.weight;

    weightedValue +=
      contribution.contribution_value *
      contribution.weight;
  }

  if (
    totalWeight <=
      0
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: behavioral calibration score has no positive available weight.",
    );
  }

  const score =
    weightedValue /
    totalWeight;

  /*
   * All contribution values are already governed inside [0, 1].
   *
   * Clamp protects floating-point representation only.
   */
  return Math.min(
    1,
    Math.max(
      0,
      score,
    ),
  );
}

/* ============================================================================
 * 25. OUTPUT VALIDATION
 * ========================================================================== */

export function validateSearchBehavioralCalibrationScoreVectorOutput(
  vector:
    SearchBehavioralCalibrationScoreVector,
): SearchBehavioralCalibrationScoringValidationResult {
  const errors:
    string[] =
    [];

  if (
    !isNonEmptyString(
      vector.contract_version,
    )
  ) {
    errors.push(
      "vector.contract_version must be a non-empty string.",
    );
  }

  if (
    !isValidIsoTimestamp(
      vector.created_at,
    )
  ) {
    errors.push(
      "vector.created_at must be a valid ISO timestamp.",
    );
  }

  if (
    !isNonEmptyString(
      vector.document_id,
    )
  ) {
    errors.push(
      "vector.document_id must be a non-empty string.",
    );
  }

  if (
    !isNonEmptyString(
      vector.query_id,
    )
  ) {
    errors.push(
      "vector.query_id must be a non-empty string.",
    );
  }

  const score =
    vector.behavioral_calibration_score;

  if (
    score.score_name !==
      XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SCORE_NAME
  ) {
    errors.push(
      "behavioral_calibration_score.score_name must be behavioral_calibration_score.",
    );
  }

  if (
    score.signal_family !==
      XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SIGNAL_FAMILY
  ) {
    errors.push(
      "behavioral_calibration_score.signal_family must be BEHAVIORAL_CALIBRATION.",
    );
  }

  if (
    score.document_id !==
      vector.document_id
  ) {
    errors.push(
      "behavioral_calibration_score.document_id must preserve vector document identity.",
    );
  }

  if (
    score.query_id !==
      vector.query_id
  ) {
    errors.push(
      "behavioral_calibration_score.query_id must preserve vector query identity.",
    );
  }

  if (
    !isUnitIntervalNumber(
      score.value,
    )
  ) {
    errors.push(
      "behavioral_calibration_score.value must be between 0 and 1.",
    );
  }

  if (
    !isUnitIntervalNumber(
      score.confidence,
    )
  ) {
    errors.push(
      "behavioral_calibration_score.confidence must be between 0 and 1.",
    );
  }

  if (
    !isNonEmptyString(
      score.overlap_group,
    )
  ) {
    errors.push(
      "behavioral_calibration_score.overlap_group must be a non-empty string.",
    );
  }

  if (
    !isNonEmptyString(
      score.method,
    )
  ) {
    errors.push(
      "behavioral_calibration_score.method must be a non-empty string.",
    );
  }

  if (
    score.module_name !==
      XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SCORING_MODULE_NAME
  ) {
    errors.push(
      "behavioral_calibration_score.module_name diverges from canonical producer identity.",
    );
  }

  if (
    score.module_version !==
      XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SCORING_MODULE_VERSION
  ) {
    errors.push(
      "behavioral_calibration_score.module_version diverges from canonical producer version.",
    );
  }

  if (
    vector.scorer_module_version !==
      XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SCORING_MODULE_VERSION
  ) {
    errors.push(
      "vector.scorer_module_version diverges from canonical producer version.",
    );
  }

  if (
    !isNonEmptyString(
      vector.scoring_policy_version,
    )
  ) {
    errors.push(
      "vector.scoring_policy_version must be a non-empty string.",
    );
  }

  if (
    vector.validation_state !==
      "VALID" &&
    vector.validation_state !==
      "DEGRADED"
  ) {
    errors.push(
      "canonical behavioral calibration vector must be VALID or DEGRADED.",
    );
  }

  if (
    vector.validation_state ===
      "VALID" &&
    vector.degradation_reasons.length >
      0
  ) {
    errors.push(
      "VALID behavioral calibration vector must not contain degradation reasons.",
    );
  }

  if (
    vector.validation_state ===
      "DEGRADED" &&
    vector.degradation_reasons.length ===
      0
  ) {
    errors.push(
      "DEGRADED behavioral calibration vector requires degradation reasons.",
    );
  }

  for (
    const [
      index,
      missingData,
    ] of score.missing_data.entries()
  ) {
    if (
      !isNonEmptyString(
        missingData,
      )
    ) {
      errors.push(
        `behavioral_calibration_score.missing_data[${String(index)}] must be non-empty.`,
      );
    }
  }

  for (
    const [
      index,
      degradationReason,
    ] of vector.degradation_reasons.entries()
  ) {
    if (
      !isNonEmptyString(
        degradationReason,
      )
    ) {
      errors.push(
        `vector.degradation_reasons[${String(index)}] must be non-empty.`,
      );
    }
  }

  return Object.freeze({
    valid:
      errors.length ===
      0,

    errors:
      Object.freeze([
        ...errors,
      ]),
  });
}

/* ============================================================================
 * 26. CANONICAL PRODUCER
 * ----------------------------------------------------------------------------
 * Produces explicit optional evidence.
 *
 * No behavioral truth is reconstructed here.
 * ========================================================================== */

export function computeSearchBehavioralCalibrationScoreVector(
  input:
    SearchBehavioralCalibrationScoringInput,
): SearchOptionalEvidence<SearchBehavioralCalibrationScoreVector> {
  const inputValidation =
    validateSearchBehavioralCalibrationScoringInput(
      input,
    );

  if (
    !inputValidation.valid
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SCORING_MODULE_NAME}] ` +
        "Behavioral calibration scoring input rejected: " +
        inputValidation.errors.join(
          " | ",
        ),
    );
  }

  const signals =
    input.behavioral_signals;

  /* --------------------------------------------------------------------------
   * Upstream validation authorization
   * ----------------------------------------------------------------------- */

  if (
    signals.validation_state ===
      "REJECTED" ||
    signals.validation_state ===
      "UNVALIDATED"
  ) {
    return unavailableBehavioralCalibrationScoreVector(
      "INVALID",
      "canonical_behavioral_signals_not_authorized_for_scoring",
    );
  }

  /* --------------------------------------------------------------------------
   * Behavioral state authorization
   * ----------------------------------------------------------------------- */

  if (
    signals.behavioral_state ===
      "UNAVAILABLE"
  ) {
    return unavailableBehavioralCalibrationScoreVector(
      "UNAVAILABLE",
      "canonical_behavioral_evidence_unavailable",
    );
  }

  if (
    signals.behavioral_state ===
      "INSUFFICIENT_DATA"
  ) {
    return unavailableBehavioralCalibrationScoreVector(
      "INSUFFICIENT_DATA",
      "canonical_behavioral_evidence_insufficient_for_calibration_scoring",
    );
  }

  /* --------------------------------------------------------------------------
   * Canonical sample confidence
   * ----------------------------------------------------------------------- */

  if (
    signals.sample_confidence
      .availability_state !==
      "AVAILABLE"
  ) {
    return preserveUnavailableState(
      signals.sample_confidence,
      "canonical_behavioral_sample_confidence_unavailable",
    );
  }

  const sampleConfidence =
    signals.sample_confidence.value;

  if (
    sampleConfidence <
      input.policy.minimum_sample_confidence
  ) {
    return unavailableBehavioralCalibrationScoreVector(
      "INSUFFICIENT_DATA",
      "behavioral_sample_confidence_below_active_scoring_policy_requirement",
    );
  }

  /* --------------------------------------------------------------------------
   * Explicit CTR basis
   * ----------------------------------------------------------------------- */

  const selectedCtrEvidence =
    getSelectedCtrEvidence(
      signals,
      input.policy.ctr_basis,
    );

  if (
    selectedCtrEvidence
      .availability_state !==
      "AVAILABLE"
  ) {
    return preserveUnavailableState(
      selectedCtrEvidence,
      "selected_canonical_behavioral_ctr_unavailable",
    );
  }

  /* --------------------------------------------------------------------------
   * Explicit CTR normalization
   * ----------------------------------------------------------------------- */

  const normalizedCtrEvidence =
    normalizeBehavioralCtr(
      selectedCtrEvidence.value,
      input.policy.ctr_normalization,
    );

  if (
    normalizedCtrEvidence
      .availability_state !==
      "AVAILABLE"
  ) {
    return unavailableBehavioralCalibrationScoreVector(
      normalizedCtrEvidence.availability_state,
      normalizedCtrEvidence.reason,
    );
  }

  const selectedCtrFeatureName =
    getSelectedCtrFeatureName(
      input.policy.ctr_basis,
    );

  const contributions:
    SearchBehavioralCalibrationContribution[] =
    [
      Object.freeze({
        feature_name:
          selectedCtrFeatureName,

        source_value:
          selectedCtrEvidence.value,

        contribution_value:
          normalizedCtrEvidence.value,

        weight:
          input.policy.ctr_weight,
      }),
    ];

  const missingData:
    string[] =
    [];

  const degradationReasons:
    string[] =
    [];

  /* --------------------------------------------------------------------------
   * Optional return-to-results feature
   * ----------------------------------------------------------------------- */

  if (
    input.policy.return_to_results_rate_weight >
      0
  ) {
    const returnToResults =
      signals.return_to_results_rate;

    if (
      returnToResults
        .availability_state ===
        "AVAILABLE"
    ) {
      contributions.push(
        Object.freeze({
          feature_name:
            "return_to_results_rate",

          source_value:
            returnToResults.value,

          /*
           * Lower return-to-results rate represents stronger observed
           * engagement evidence.
           */
          contribution_value:
            1 -
            returnToResults.value,

          weight:
            input.policy
              .return_to_results_rate_weight,
        }),
      );
    } else {
      missingData.push(
        "return_to_results_rate",
      );

      if (
        input.policy
          .return_to_results_rate_required
      ) {
        return preserveUnavailableState(
          returnToResults,
          "required_return_to_results_rate_unavailable",
        );
      }

      if (
        input.policy
          .missing_optional_evidence_method ===
          "RETURN_UNAVAILABLE"
      ) {
        return preserveUnavailableState(
          returnToResults,
          "optional_return_to_results_rate_unavailable_under_active_policy",
        );
      }

      degradationReasons.push(
        "optional_return_to_results_rate_excluded_and_weights_renormalized",
      );
    }
  }

  /* --------------------------------------------------------------------------
   * Upstream degradation propagation
   * ----------------------------------------------------------------------- */

  if (
    signals.validation_state ===
      "DEGRADED"
  ) {
    degradationReasons.push(
      "upstream_behavioral_signals_degraded",
    );
  }

  /* --------------------------------------------------------------------------
   * Score
   * ----------------------------------------------------------------------- */

  const behavioralCalibrationScoreValue =
    computeBehavioralCalibrationScore(
      contributions,
    );

  const validationState:
    SearchValidationState =
    degradationReasons.length >
      0
      ? "DEGRADED"
      : "VALID";

  const sourceFeatures =
    Object.freeze(
      contributions.map(
        (contribution) =>
          contribution.feature_name,
      ),
    );

  const parameters:
    Readonly<Record<string, unknown>> =
    Object.freeze({
      scoring_policy_version:
        input.policy.policy_version,

      behavioral_evidence_policy_version:
        signals.minimum_impressions_policy_version,

      ctr_basis:
        input.policy.ctr_basis,

      ctr_normalization:
        Object.freeze({
          ...input.policy
            .ctr_normalization,
        }),

      ctr_weight:
        input.policy.ctr_weight,

      return_to_results_rate_weight:
        input.policy
          .return_to_results_rate_weight,

      return_to_results_rate_required:
        input.policy
          .return_to_results_rate_required,

      missing_optional_evidence_method:
        input.policy
          .missing_optional_evidence_method,

      minimum_sample_confidence:
        input.policy
          .minimum_sample_confidence,

      sample_confidence:
        sampleConfidence,

      active_feature_count:
        contributions.length,
    });

  const behavioralCalibrationSubScore:
    SearchSubScore =
    Object.freeze({
      contract_version:
        XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SCORING_CONTRACT_VERSION,

      created_at:
        input.created_at,

      document_id:
        signals.document_id,

      query_id:
        signals.query_id,

      score_name:
        XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SCORE_NAME,

      signal_family:
        XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SIGNAL_FAMILY,

      value:
        behavioralCalibrationScoreValue,

      /*
       * Canonical behavioral sample confidence is transported unchanged.
       *
       * It is not multiplied by score value and is not reconstructed.
       */
      confidence:
        sampleConfidence,

      source_features:
        sourceFeatures,

      overlap_group:
        input.policy.overlap_group,

      method:
        input.policy.scoring_method,

      module_name:
        XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SCORING_MODULE_NAME,

      module_version:
        XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SCORING_MODULE_VERSION,

      parameters,

      missing_data:
        Object.freeze([
          ...missingData,
        ]),

      explanation:
        "Canonical behavioral calibration score produced exclusively from authorized AVAILABLE SearchBehavioralSignals evidence under the active explicit scoring policy.",
    });

  const vector:
    SearchBehavioralCalibrationScoreVector =
    Object.freeze({
      contract_version:
        XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SCORING_CONTRACT_VERSION,

      created_at:
        input.created_at,

      document_id:
        signals.document_id,

      query_id:
        signals.query_id,

      behavioral_calibration_score:
        behavioralCalibrationSubScore,

      scorer_module_version:
        XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SCORING_MODULE_VERSION,

      scoring_policy_version:
        input.policy.policy_version,

      validation_state:
        validationState,

      degradation_reasons:
        Object.freeze([
          ...degradationReasons,
        ]),
    });

  const outputValidation =
    validateSearchBehavioralCalibrationScoreVectorOutput(
      vector,
    );

  if (
    !outputValidation.valid
  ) {
    throw new Error(
      `[${XYVALA_SEARCH_BEHAVIORAL_CALIBRATION_SCORING_MODULE_NAME}] ` +
        "Internal invariant violation: canonical SearchBehavioralCalibrationScoreVector is invalid: " +
        outputValidation.errors.join(
          " | ",
        ),
    );
  }

  return Object.freeze({
    availability_state:
      "AVAILABLE",

    value:
      vector,
  });
}

/* ============================================================================
 * 27. ACCEPTANCE GUARD
 * ----------------------------------------------------------------------------
 * Explicit non-AVAILABLE evidence is legitimate pipeline truth but is not an
 * accepted behavioral calibration score vector.
 *
 * AVAILABLE evidence must contain a valid canonical vector.
 * ========================================================================== */

export function isSearchBehavioralCalibrationScoreVectorAccepted(
  evidence:
    SearchOptionalEvidence<SearchBehavioralCalibrationScoreVector>,
): boolean {
  if (
    evidence.availability_state !==
      "AVAILABLE"
  ) {
    return false;
  }

  const validation =
    validateSearchBehavioralCalibrationScoreVectorOutput(
      evidence.value,
    );

  return validation.valid;
}
