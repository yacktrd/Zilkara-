/* ============================================================================
 * FILE: lib/xyvala/calibration/store/decision-distribution-normalizers.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala decision distribution normalizers
 *
 * ROLE
 * - centralize deterministic normalization helpers
 * - normalize DecisionSampleInput into stable DecisionSample contracts
 * - isolate normalization from validation and persistence layers
 *
 * DIRECTIVES
 * - normalization only
 * - no persistence logic
 * - no validation logic
 * - no store logic
 * - no orchestration logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no UI logic
 * - no API logic
 * - deterministic transformations only
 *
 * INPUTS
 * - DecisionSampleInput
 * - primitive unknown values
 *
 * OUTPUTS
 * - normalized primitives
 * - normalized DecisionSample
 *
 * INVARIANTS
 * - same input => same output
 * - normalization never mutates source input
 * - normalization never recalculates analytical truth
 * - normalization only stabilizes structures
 * - governance propagation remains explicit
 *
 * CRITICAL DEPENDENCIES
 * - calibration-contracts.ts
 *
 * SENSITIVE ZONES
 * - migration mirrors
 * - confidence propagation
 * - neutralization propagation
 * - rupture evolution propagation
 * - exactOptionalPropertyTypes compatibility
 * ========================================================================== */

import type {
  CalibrationDecision,
  CalibrationRegime,
  DecisionSample,
  DecisionSampleInput,
  DominanceState,
  EvaluationHorizon,
  NeutralizationReason,
  NeutralizationSeverity,
  ReliabilityLevel,
  RuptureEvolutionState,
  ValidityState,
} from "@/lib/xyvala/calibration/calibration-contracts";

/* ============================================================================
 * 1. SAFE PRIMITIVES
 * ========================================================================== */

export function safeStr(
  value: unknown,
  fallback = "",
): string {
  return typeof value === "string" &&
    value.trim().length > 0
    ? value.trim()
    : fallback;
}

export function safeFinite(
  value: unknown,
  fallback = 0,
): number {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : fallback;
}

export function clampScore(
  value: unknown,
): number {
  const numeric = safeFinite(value, 0);

  return (
    Math.round(
      Math.max(
        0,
        Math.min(100, numeric),
      ) * 100,
    ) / 100
  );
}

/* ============================================================================
 * 2. TEMPORAL NORMALIZERS
 * ========================================================================== */

export function normalizeTs(
  value: unknown,
): number {
  const ts = safeFinite(
    value,
    Date.now(),
  );

  return ts > 0
    ? Math.trunc(ts)
    : Date.now();
}

export function normalizeLimit(
  value: unknown,
  max = 5_000,
): number {
  const parsed = Math.trunc(
    safeFinite(value, 250),
  );

  if (parsed < 1) return 1;

  if (parsed > max) return max;

  return parsed;
}

/* ============================================================================
 * 3. ENUM NORMALIZERS
 * ========================================================================== */

export function normalizeDecision(
  value: unknown,
): CalibrationDecision {
  if (value === "ALLOW") {
    return "ALLOW";
  }

  if (value === "BLOCK") {
    return "BLOCK";
  }

  return "WATCH";
}

export function normalizeRegime(
  value: unknown,
): CalibrationRegime {
  if (value === "STABLE") {
    return "STABLE";
  }

  if (value === "VOLATILE") {
    return "VOLATILE";
  }

  return "TRANSITION";
}

export function normalizeEvaluationHorizon(
  value: unknown,
): EvaluationHorizon {
  if (value === "24H") return "24H";
  if (value === "7D") return "7D";
  if (value === "14D") return "14D";
  if (value === "30D") return "30D";
  if (value === "default") return "default";

  return "7D";
}

export function normalizeReliability(
  value: unknown,
): ReliabilityLevel {
  if (value === "high") {
    return "high";
  }

  if (value === "medium") {
    return "medium";
  }

  if (value === "low") {
    return "low";
  }

  return "none";
}

export function normalizeDominanceState(
  value: unknown,
): DominanceState {
  if (value === "recovery_dominant") {
    return "recovery_dominant";
  }

  if (value === "rupture_dominant") {
    return "rupture_dominant";
  }

  if (value === "balanced") {
    return "balanced";
  }

  /**
   * Legacy compatibility
   */

  if (value === "RECOVERY") {
    return "recovery_dominant";
  }

  if (value === "RUPTURE") {
    return "rupture_dominant";
  }

  if (value === "NEUTRAL") {
    return "balanced";
  }

  return "unknown";
}

/* ============================================================================
 * 4. GOVERNANCE NORMALIZERS
 * ========================================================================== */

export function normalizeNeutralizationReason(
  value: unknown,
): NeutralizationReason {
  switch (value) {
    case "insufficient_data":
    case "contradictory_structure":
    case "unstable_distribution":
    case "excessive_decay":
    case "excessive_rupture":
    case "invalid_temporal_alignment":
    case "low_confidence":
    case "degraded_snapshot":
    case "corrupted_distribution":
      return value;

    default:
      return "none";
  }
}

export function normalizeNeutralizationSeverity(
  value: unknown,
): NeutralizationSeverity {
  switch (value) {
    case "low":
    case "medium":
    case "high":
    case "critical":
      return value;

    default:
      return "none";
  }
}

export function normalizeValidityState(
  value: unknown,
): ValidityState {
  switch (value) {
    case "computed":
    case "invalid":
    case "insufficient_data":
    case "unavailable":
    case "degraded":
      return value;

    default:
      return "computed";
  }
}

export function normalizeRuptureEvolutionState(
  value: unknown,
): RuptureEvolutionState {
  switch (value) {
    case "improving":
    case "stable":
    case "worsening":
    case "explosive":
      return value;

    default:
      return "unknown";
  }
}

/* ============================================================================
 * 5. SAMPLE NORMALIZATION
 * ========================================================================== */

export function normalizeSample(
  input: DecisionSampleInput,
): DecisionSample {
  const observedTs = normalizeTs(
    input.observed_ts ?? input.ts,
  );

  const observedDecision =
    normalizeDecision(
      input.observed_decision ??
        input.final_decision,
    );

  const observedRegime =
    normalizeRegime(
      input.observed_regime ??
        input.regime,
    );

  const observedHorizon =
    normalizeEvaluationHorizon(
      input.observed_horizon ??
        input.horizon,
    );

  const analyticalVersion = safeStr(
    input.observed_analytical_version ??
      input.analytical_version,
    "unknown",
  );

  const policyVersion = safeStr(
    input.observed_policy_version ??
      input.policy_version,
    analyticalVersion,
  );

  const decisionReason = safeStr(
    input.observed_reason ??
      input.mci_decision_reason ??
      input.decision_reason,
    "unknown",
  );

  const reliability =
    normalizeReliability(
      input.reliability ??
        input.sample_reliability ??
        input.observed_reliability,
    );

  const confidenceScore =
    clampScore(
      input.confidence_score ??
        input.confidence,
    );

  return {
    ...input,

    observed_ts: observedTs,

    observed_horizon: observedHorizon,

    observed_analytical_version:
      analyticalVersion,

    observed_policy_version:
      policyVersion,

    observed_decision:
      observedDecision,

    observed_regime:
      observedRegime,

    observed_reason:
      decisionReason,

    observed_reliability:
      reliability,

    mci_decision_score:
      clampScore(
        input.mci_decision_score ??
          input.decision_score,
      ),

    mci_allow_raw_score:
      clampScore(
        input.mci_allow_raw_score ??
          input.allow_raw_score,
      ),

    mci_block_raw_score:
      clampScore(
        input.mci_block_raw_score ??
          input.block_raw_score,
      ),

    mci_decision_support_probability:
      clampScore(
        input.mci_decision_support_probability ??
          input.decision_support_probability,
      ),

    mci_risk_rupture_probability:
      clampScore(
        input.mci_risk_rupture_probability ??
          input.risk_rupture_probability,
      ),

    mci_final_decision:
      normalizeDecision(
        input.mci_final_decision ??
          observedDecision,
      ),

    mci_decision_reason:
      decisionReason,

    stability_score:
      clampScore(
        input.stability_score ??
          input.stability,
      ),

    opportunity_score:
      clampScore(
        input.opportunity_score ??
          input.opportunity,
      ),

    convergence_score:
      clampScore(
        input.convergence_score ??
          input.convergence,
      ),

    confidence_score:
      confidenceScore,

    recovery_probability:
      clampScore(
        input.recovery_probability,
      ),

    recovery_rupture_dominance:
      clampScore(
        input.recovery_rupture_dominance,
      ),

    recovery_validity:
      normalizeValidityState(
        input.recovery_validity,
      ),

    dominance_state:
      normalizeDominanceState(
        input.dominance_state,
      ),

    neutralized:
      Boolean(input.neutralized),

    neutralization_reason:
      normalizeNeutralizationReason(
        input.neutralization_reason,
      ),

    neutralization_severity:
      normalizeNeutralizationSeverity(
        input.neutralization_severity,
      ),

    neutralization_validity:
      normalizeValidityState(
        input.neutralization_validity,
      ),

    rupture_score:
      clampScore(
        input.rupture_score,
      ),

    rupture_probability:
      clampScore(
        input.rupture_probability,
      ),

    rupture_severity_score:
      clampScore(
        input.rupture_severity_score,
      ),

    rupture_frequency_score:
      clampScore(
        input.rupture_frequency_score,
      ),

    rupture_duration_score:
      clampScore(
        input.rupture_duration_score,
      ),

    rupture_penalty_score:
      clampScore(
        input.rupture_penalty_score,
      ),

    rupture_detected:
      Boolean(input.rupture_detected),

    rupture_reason:
      safeStr(
        input.rupture_reason,
        "unknown",
      ),

    rupture_validity:
      normalizeValidityState(
        input.rupture_validity,
      ),

    rupture_evolution_score:
      clampScore(
        input.rupture_evolution_score,
      ),

    rupture_evolution_state:
      normalizeRuptureEvolutionState(
        input.rupture_evolution_state,
      ),

    rupture_acceleration_score:
      clampScore(
        input.rupture_acceleration_score,
      ),

    rupture_evolution_validity:
      normalizeValidityState(
        input.rupture_evolution_validity,
      ),

    ts: observedTs,

    analytical_version:
      analyticalVersion,

    policy_version:
      policyVersion,

    horizon: observedHorizon,

    regime: observedRegime,

    final_decision:
      observedDecision,

    decision_reason:
      decisionReason,

    reason: decisionReason,

    decision_score:
      clampScore(
        input.decision_score,
      ),

    allow_raw_score:
      clampScore(
        input.allow_raw_score,
      ),

    block_raw_score:
      clampScore(
        input.block_raw_score,
      ),

    decision_support_probability:
      clampScore(
        input.decision_support_probability,
      ),

    risk_rupture_probability:
      clampScore(
        input.risk_rupture_probability,
      ),

    confidence:
      confidenceScore,

    sample_reliability:
      reliability,

    reliability,

    recorded_at: new Date(
      observedTs,
    ).toISOString(),

    created_at: new Date(
      observedTs,
    ).toISOString(),
  };
}
