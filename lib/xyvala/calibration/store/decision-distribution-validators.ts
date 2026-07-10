/* ============================================================================
 * FILE: lib/xyvala/calibration/store/decision-distribution-validators.ts
 * ========================================================================== */

import type {
  CalibrationDecision,
  CalibrationRegime,
  DecisionSample,
  DominanceState,
  EvaluationHorizon,
  NeutralizationReason,
  NeutralizationSeverity,
  ReliabilityLevel,
  RuptureEvolutionState,
  ValidityState,
} from "@/lib/xyvala/calibration/calibration-contracts";

export type ValidationReason =
  | "INVALID_SAMPLE_INPUT"
  | "INVALID_SAMPLE_CONTRACT"
  | "INVALID_SAMPLE_REQUIRED_FIELD"
  | "INVALID_SAMPLE_REQUIRED_NUMERIC"
  | "INVALID_GOVERNANCE_CONTRACT";

export type ValidationIssue = {
  reason: ValidationReason;
  detail: string;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; issues: ValidationIssue[] };

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidDecision(value: unknown): value is CalibrationDecision {
  return value === "ALLOW" || value === "WATCH" || value === "BLOCK";
}

export function isValidRegime(value: unknown): value is CalibrationRegime {
  return value === "STABLE" || value === "TRANSITION" || value === "VOLATILE";
}

function isValidHorizon(value: unknown): value is EvaluationHorizon {
  return (
    value === "24H" ||
    value === "7D" ||
    value === "14D" ||
    value === "30D" ||
    value === "default"
  );
}

function isValidReliability(value: unknown): value is ReliabilityLevel {
  return value === "none" || value === "low" || value === "medium" || value === "high";
}

function isValidDominanceState(value: unknown): value is DominanceState {
  return (
    value === "recovery_dominant" ||
    value === "rupture_dominant" ||
    value === "balanced" ||
    value === "unknown"
  );
}

function isValidNeutralizationReason(
  value: unknown,
): value is NeutralizationReason {
  return (
    value === "none" ||
    value === "insufficient_data" ||
    value === "contradictory_structure" ||
    value === "unstable_distribution" ||
    value === "excessive_decay" ||
    value === "excessive_rupture" ||
    value === "invalid_temporal_alignment" ||
    value === "low_confidence" ||
    value === "degraded_snapshot" ||
    value === "corrupted_distribution"
  );
}

function isValidNeutralizationSeverity(
  value: unknown,
): value is NeutralizationSeverity {
  return (
    value === "none" ||
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "critical"
  );
}

function isValidValidityState(value: unknown): value is ValidityState {
  return (
    value === "computed" ||
    value === "invalid" ||
    value === "insufficient_data" ||
    value === "unavailable" ||
    value === "degraded"
  );
}

function isValidRuptureEvolutionState(
  value: unknown,
): value is RuptureEvolutionState {
  return (
    value === "improving" ||
    value === "stable" ||
    value === "worsening" ||
    value === "explosive" ||
    value === "unknown"
  );
}

function pushIssue(
  issues: ValidationIssue[],
  reason: ValidationReason,
  detail: string,
): void {
  issues.push({ reason, detail });
}

function pushRequiredTextIssue(
  issues: ValidationIssue[],
  value: unknown,
  field: string,
): void {
  if (!hasText(value)) {
    pushIssue(
      issues,
      "INVALID_SAMPLE_REQUIRED_FIELD",
      `${field} is required and must be a non-empty string`,
    );
  }
}

function pushRequiredNumberIssue(
  issues: ValidationIssue[],
  value: unknown,
  field: string,
): void {
  if (!isFiniteNumber(value)) {
    pushIssue(
      issues,
      "INVALID_SAMPLE_REQUIRED_NUMERIC",
      `${field} is required and must be a finite number`,
    );
  }
}

function pushScoreIssueIfInvalid(
  issues: ValidationIssue[],
  value: unknown,
  field: string,
): void {
  if (!isFiniteNumber(value)) {
    pushIssue(
      issues,
      "INVALID_SAMPLE_REQUIRED_NUMERIC",
      `${field} must be a finite number`,
    );
    return;
  }

  if (value < 0 || value > 100) {
    pushIssue(
      issues,
      "INVALID_SAMPLE_CONTRACT",
      `${field} must be inside [0, 100]`,
    );
  }
}

function validateObservedContract(
  sample: DecisionSample,
  issues: ValidationIssue[],
): void {
  pushRequiredNumberIssue(issues, sample.observed_ts, "observed_ts");
  pushRequiredTextIssue(
    issues,
    sample.observed_analytical_version,
    "observed_analytical_version",
  );
  pushRequiredTextIssue(
    issues,
    sample.observed_policy_version,
    "observed_policy_version",
  );
  pushRequiredTextIssue(issues, sample.observed_reason, "observed_reason");

  if (!isValidHorizon(sample.observed_horizon)) {
    pushIssue(issues, "INVALID_SAMPLE_CONTRACT", "observed_horizon is invalid");
  }

  if (!isValidDecision(sample.observed_decision)) {
    pushIssue(issues, "INVALID_SAMPLE_CONTRACT", "observed_decision is invalid");
  }

  if (!isValidRegime(sample.observed_regime)) {
    pushIssue(issues, "INVALID_SAMPLE_CONTRACT", "observed_regime is invalid");
  }

  if (!isValidReliability(sample.observed_reliability)) {
    pushIssue(
      issues,
      "INVALID_SAMPLE_CONTRACT",
      "observed_reliability is invalid",
    );
  }
}

function validateMciContract(
  sample: DecisionSample,
  issues: ValidationIssue[],
): void {
  if (!isValidDecision(sample.mci_final_decision)) {
    pushIssue(issues, "INVALID_SAMPLE_CONTRACT", "mci_final_decision is invalid");
  }

  pushRequiredTextIssue(issues, sample.mci_decision_reason, "mci_decision_reason");

  const requiredScores: Array<[unknown, string]> = [
    [sample.mci_decision_score, "mci_decision_score"],
    [sample.mci_allow_raw_score, "mci_allow_raw_score"],
    [sample.mci_block_raw_score, "mci_block_raw_score"],
    [
      sample.mci_decision_support_probability,
      "mci_decision_support_probability",
    ],
    [sample.mci_risk_rupture_probability, "mci_risk_rupture_probability"],
    [sample.confidence_score, "confidence_score"],
    [sample.stability_score, "stability_score"],
    [sample.opportunity_score, "opportunity_score"],
    [sample.convergence_score, "convergence_score"],
  ];

  for (const [value, field] of requiredScores) {
    pushScoreIssueIfInvalid(issues, value, field);
  }
}

function validateNeutralizationContract(
  sample: DecisionSample,
  issues: ValidationIssue[],
): void {
  if (typeof sample.neutralized !== "boolean") {
    pushIssue(
      issues,
      "INVALID_GOVERNANCE_CONTRACT",
      "neutralized must be a boolean",
    );
  }

  if (!isValidNeutralizationReason(sample.neutralization_reason)) {
    pushIssue(
      issues,
      "INVALID_GOVERNANCE_CONTRACT",
      "neutralization_reason is invalid",
    );
  }

  if (!isValidNeutralizationSeverity(sample.neutralization_severity)) {
    pushIssue(
      issues,
      "INVALID_GOVERNANCE_CONTRACT",
      "neutralization_severity is invalid",
    );
  }

  if (!isValidValidityState(sample.neutralization_validity)) {
    pushIssue(
      issues,
      "INVALID_GOVERNANCE_CONTRACT",
      "neutralization_validity is invalid",
    );
  }
}

function validateRecoveryContract(
  sample: DecisionSample,
  issues: ValidationIssue[],
): void {
  pushScoreIssueIfInvalid(issues, sample.recovery_probability, "recovery_probability");
  pushScoreIssueIfInvalid(
    issues,
    sample.recovery_rupture_dominance,
    "recovery_rupture_dominance",
  );

  if (!isValidValidityState(sample.recovery_validity)) {
    pushIssue(
      issues,
      "INVALID_GOVERNANCE_CONTRACT",
      "recovery_validity is invalid",
    );
  }

  if (!isValidDominanceState(sample.dominance_state)) {
    pushIssue(
      issues,
      "INVALID_GOVERNANCE_CONTRACT",
      "dominance_state is invalid",
    );
  }
}

function validateRuptureContract(
  sample: DecisionSample,
  issues: ValidationIssue[],
): void {
  const ruptureScores: Array<[unknown, string]> = [
    [sample.rupture_score, "rupture_score"],
    [sample.rupture_probability, "rupture_probability"],
    [sample.rupture_severity_score, "rupture_severity_score"],
    [sample.rupture_frequency_score, "rupture_frequency_score"],
    [sample.rupture_duration_score, "rupture_duration_score"],
    [sample.rupture_penalty_score, "rupture_penalty_score"],
  ];

  for (const [value, field] of ruptureScores) {
    pushScoreIssueIfInvalid(issues, value, field);
  }

  if (typeof sample.rupture_detected !== "boolean") {
    pushIssue(
      issues,
      "INVALID_GOVERNANCE_CONTRACT",
      "rupture_detected must be a boolean",
    );
  }

  pushRequiredTextIssue(issues, sample.rupture_reason, "rupture_reason");

  if (!isValidValidityState(sample.rupture_validity)) {
    pushIssue(
      issues,
      "INVALID_GOVERNANCE_CONTRACT",
      "rupture_validity is invalid",
    );
  }
}

function validateRuptureEvolutionContract(
  sample: DecisionSample,
  issues: ValidationIssue[],
): void {
  pushScoreIssueIfInvalid(
    issues,
    sample.rupture_evolution_score,
    "rupture_evolution_score",
  );

  pushScoreIssueIfInvalid(
    issues,
    sample.rupture_acceleration_score,
    "rupture_acceleration_score",
  );

  if (!isValidRuptureEvolutionState(sample.rupture_evolution_state)) {
    pushIssue(
      issues,
      "INVALID_GOVERNANCE_CONTRACT",
      "rupture_evolution_state is invalid",
    );
  }

  if (!isValidValidityState(sample.rupture_evolution_validity)) {
    pushIssue(
      issues,
      "INVALID_GOVERNANCE_CONTRACT",
      "rupture_evolution_validity is invalid",
    );
  }
}

export function validateNormalizedSample(
  sample: DecisionSample,
): ValidationResult {
  if (typeof sample !== "object" || sample === null) {
    return {
      ok: false,
      issues: [
        {
          reason: "INVALID_SAMPLE_INPUT",
          detail: "sample must be a non-null object",
        },
      ],
    };
  }

  const issues: ValidationIssue[] = [];

  validateObservedContract(sample, issues);
  validateMciContract(sample, issues);
  validateNeutralizationContract(sample, issues);
  validateRecoveryContract(sample, issues);
  validateRuptureContract(sample, issues);
  validateRuptureEvolutionContract(sample, issues);

  return issues.length > 0 ? { ok: false, issues } : { ok: true };
}
