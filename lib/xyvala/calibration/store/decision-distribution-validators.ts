/* ============================================================================
 * FILE: lib/xyvala/calibration/store/decision-distribution-validators.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala decision distribution validators
 *
 * ROLE
 * - validate normalized DecisionSample objects before storage
 * - isolate validation from normalization and store orchestration
 * - enforce calibration sample contract integrity
 *
 * DIRECTIVES
 * - validation only
 * - no normalization logic
 * - no persistence logic
 * - no store mutation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no UI logic
 * - no API logic
 * - deterministic validation only
 *
 * INVARIANTS
 * - validation never mutates input
 * - invalid samples are rejected explicitly
 * - required MCI fields must remain finite
 * - governance fields must use contract-approved values
 * ========================================================================== */

import type {
  CalibrationDecision,
  CalibrationRegime,
  DecisionSample,
  NeutralizationReason,
  NeutralizationSeverity,
  RuptureEvolutionState,
  ValidityState,
} from "@/lib/xyvala/calibration/calibration-contracts";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

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

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/* ============================================================================
 * 3. CONTRACT GUARDS
 * ========================================================================== */

export function isValidDecision(
  value: unknown,
): value is CalibrationDecision {
  return value === "ALLOW" || value === "WATCH" || value === "BLOCK";
}

export function isValidRegime(
  value: unknown,
): value is CalibrationRegime {
  return value === "STABLE" || value === "TRANSITION" || value === "VOLATILE";
}

function isValidNeutralizationReason(
  value: unknown,
): value is NeutralizationReason {
  return (
    value === "insufficient_data" ||
    value === "contradictory_structure" ||
    value === "unstable_distribution" ||
    value === "excessive_decay" ||
    value === "excessive_rupture" ||
    value === "invalid_temporal_alignment" ||
    value === "low_confidence" ||
    value === "degraded_snapshot" ||
    value === "corrupted_distribution" ||
    value === "none"
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

/* ============================================================================
 * 4. VALIDATION HELPERS
 * ========================================================================== */

function pushRequiredTextIssue(
  issues: ValidationIssue[],
  value: unknown,
  field: string,
): void {
  if (!hasText(value)) {
    issues.push({
      reason: "INVALID_SAMPLE_REQUIRED_FIELD",
      detail: `${field} is required and must be a non-empty string`,
    });
  }
}

function pushRequiredNumberIssue(
  issues: ValidationIssue[],
  value: unknown,
  field: string,
): void {
  if (!isFiniteNumber(value)) {
    issues.push({
      reason: "INVALID_SAMPLE_REQUIRED_NUMERIC",
      detail: `${field} is required and must be a finite number`,
    });
  }
}

function pushScoreIssueIfInvalid(
  issues: ValidationIssue[],
  value: unknown,
  field: string,
): void {
  if (!isFiniteNumber(value)) {
    issues.push({
      reason: "INVALID_SAMPLE_REQUIRED_NUMERIC",
      detail: `${field} must be a finite number`,
    });

    return;
  }

  if (value < 0 || value > 100) {
    issues.push({
      reason: "INVALID_SAMPLE_CONTRACT",
      detail: `${field} must be inside [0, 100]`,
    });
  }
}

/* ============================================================================
 * 5. GOVERNANCE VALIDATION
 * ========================================================================== */

function validateNeutralizationContract(
  sample: DecisionSample,
  issues: ValidationIssue[],
): void {
  if (typeof sample.neutralized !== "boolean") {
    issues.push({
      reason: "INVALID_GOVERNANCE_CONTRACT",
      detail: "neutralized must be a boolean",
    });
  }

  if (!isValidNeutralizationReason(sample.neutralization_reason)) {
    issues.push({
      reason: "INVALID_GOVERNANCE_CONTRACT",
      detail: "neutralization_reason is invalid",
    });
  }

  if (!isValidNeutralizationSeverity(sample.neutralization_severity)) {
    issues.push({
      reason: "INVALID_GOVERNANCE_CONTRACT",
      detail: "neutralization_severity is invalid",
    });
  }

  if (!isValidValidityState(sample.neutralization_validity)) {
    issues.push({
      reason: "INVALID_GOVERNANCE_CONTRACT",
      detail: "neutralization_validity is invalid",
    });
  }
}

function validateRuptureContract(
  sample: DecisionSample,
  issues: ValidationIssue[],
): void {
  if (!isValidValidityState(sample.rupture_validity)) {
    issues.push({
      reason: "INVALID_GOVERNANCE_CONTRACT",
      detail: "rupture_validity is invalid",
    });
  }
}

function validateRecoveryContract(
  sample: DecisionSample,
  issues: ValidationIssue[],
): void {
  pushScoreIssueIfInvalid(
    issues,
    sample.recovery_probability,
    "recovery_probability",
  );

  pushScoreIssueIfInvalid(
    issues,
    sample.recovery_rupture_dominance,
    "recovery_rupture_dominance",
  );

  if (!isValidValidityState(sample.recovery_validity)) {
    issues.push({
      reason: "INVALID_GOVERNANCE_CONTRACT",
      detail: "recovery_validity is invalid",
    });
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
    issues.push({
      reason: "INVALID_GOVERNANCE_CONTRACT",
      detail: "rupture_evolution_state is invalid",
    });
  }

  if (!isValidValidityState(sample.rupture_evolution_validity)) {
    issues.push({
      reason: "INVALID_GOVERNANCE_CONTRACT",
      detail: "rupture_evolution_validity is invalid",
    });
  }
}

/* ============================================================================
 * 6. MAIN VALIDATOR
 * ========================================================================== */

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

  pushRequiredNumberIssue(issues, sample.observed_ts, "observed_ts");

  pushRequiredTextIssue(
    issues,
    sample.observed_analytical_version,
    "observed_analytical_version",
  );

  if (!isValidDecision(sample.observed_decision)) {
    issues.push({
      reason: "INVALID_SAMPLE_CONTRACT",
      detail: "observed_decision is invalid",
    });
  }

  if (!isValidRegime(sample.observed_regime)) {
    issues.push({
      reason: "INVALID_SAMPLE_CONTRACT",
      detail: "observed_regime is invalid",
    });
  }

  if (!isValidDecision(sample.mci_final_decision)) {
    issues.push({
      reason: "INVALID_SAMPLE_CONTRACT",
      detail: "mci_final_decision is invalid",
    });
  }

  const requiredMciNumericFields: Array<[unknown, string]> = [
    [sample.mci_decision_score, "mci_decision_score"],
    [sample.mci_allow_raw_score, "mci_allow_raw_score"],
    [sample.mci_block_raw_score, "mci_block_raw_score"],
    [
      sample.mci_decision_support_probability,
      "mci_decision_support_probability",
    ],
    [
      sample.mci_risk_rupture_probability,
      "mci_risk_rupture_probability",
    ],
    [sample.confidence_score, "confidence_score"],
  ];

  for (const [value, field] of requiredMciNumericFields) {
    pushScoreIssueIfInvalid(issues, value, field);
  }

  validateNeutralizationContract(sample, issues);
  validateRuptureContract(sample, issues);
  validateRecoveryContract(sample, issues);
  validateRuptureEvolutionContract(sample, issues);

  return issues.length > 0 ? { ok: false, issues } : { ok: true };
}
