/* ============================================================================
 * FILE: lib/xyvala/engine/mci/mci-sample-mapper.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala MCI decision sample mapper
 *
 * ROLE
 * - map MCI orchestrator outputs into DecisionSampleInput
 * - isolate calibration sample construction outside mci-orchestrator.ts
 * - propagate governance signals without recalculation
 * - preserve contract stability during MCI / calibration evolution
 *
 * DIRECTIVES
 * - mapper only
 * - no scoring logic
 * - no decision logic
 * - no calibration logic
 * - no store mutation
 * - no UI logic
 * - no API logic
 * - no public exposure
 * - no destructive contract change
 * - no free string values outside contract normalization
 * - undefined must not be injected into optional fields
 * - same input => same output shape
 * ========================================================================== */

import type {
  CalibrationDecision,
  CalibrationPolicySource,
  CalibrationRegime,
  DecisionSampleInput,
  DominanceState,
  EvaluationHorizon,
  NeutralizationReason,
  NeutralizationSeverity,
  ReliabilityLevel,
  RuptureEvolutionState,
  ValidityState,
} from "@/lib/xyvala/calibration/calibration-contracts";

import type {
  MciFunnelDecision,
  MciFunnelDecisionReason,
  MciFunnelDominanceState,
  MciFunnelRegime,
} from "@/lib/xyvala/engine/mci-decision-funnel";

/* ============================================================================
 * 1. LOCAL TYPES
 * ========================================================================== */

export type MciSampleCoreLike = {
  decision?: unknown;
  dominance_state?: unknown;

  rupture_score?: unknown;
  rupture_probability?: unknown;
  rupture_detected?: unknown;
  rupture_reason?: unknown;
  rupture_validity?: unknown;

  rupture_evolution_score?: unknown;
  rupture_evolution_state?: unknown;
  rupture_acceleration_score?: unknown;
  rupture_evolution_validity?: unknown;

  neutralized?: unknown;
  neutralization_reason?: unknown;
  neutralization_severity?: unknown;
  neutralization_validity?: unknown;
};

export type MciSampleFunnelLike = {
  decision: MciFunnelDecision;
  decision_reason: MciFunnelDecisionReason;

  decision_score: number;
  allow_raw_score: number;
  block_raw_score: number;

  recovery_rupture_dominance: number;

  hard_block: boolean;
  hard_allow_candidate: boolean;
};

export type BuildMciDecisionSampleInput = {
  now: number;

  analytical_version: string;
  horizon: EvaluationHorizon;
  calibration_source: CalibrationPolicySource;

  regime: MciFunnelRegime;
  core: MciSampleCoreLike;
  funnel: MciSampleFunnelLike;

  stability: number;
  opportunity: number;
  convergence: number;
  confidence: number;

  risk_rupture_probability: number;
  decision_support_probability: number;
  recovery_probability: number;

  dominance: MciFunnelDominanceState;
  sample_reliability?: ReliabilityLevel;
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown, fallback = "unknown"): string {
  if (typeof value !== "string") return fallback;

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : fallback;
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function clampScore(value: unknown): number {
  const numeric = safeNumber(value, 0);

  return Math.round(Math.max(0, Math.min(100, numeric)) * 100) / 100;
}

function normalizeCalibrationDecision(value: unknown): CalibrationDecision {
  if (value === "ALLOW") return "ALLOW";
  if (value === "BLOCK") return "BLOCK";

  return "WATCH";
}

function normalizeCalibrationRegime(value: MciFunnelRegime): CalibrationRegime {
  if (value === "STABLE") return "STABLE";
  if (value === "VOLATILE") return "VOLATILE";

  return "TRANSITION";
}

function normalizeReliability(value: unknown): ReliabilityLevel {
  if (value === "high") return "high";
  if (value === "medium") return "medium";
  if (value === "low") return "low";
  if (value === "none") return "none";

  return "high";
}

function normalizeValidity(value: unknown): ValidityState {
  if (value === "computed") return "computed";
  if (value === "invalid") return "invalid";
  if (value === "insufficient_data") return "insufficient_data";
  if (value === "unavailable") return "unavailable";
  if (value === "degraded") return "degraded";

  return "computed";
}

function normalizeNeutralizationReason(value: unknown): NeutralizationReason {
  if (value === "insufficient_data") return "insufficient_data";
  if (value === "contradictory_structure") return "contradictory_structure";
  if (value === "unstable_distribution") return "unstable_distribution";
  if (value === "excessive_decay") return "excessive_decay";
  if (value === "excessive_rupture") return "excessive_rupture";
  if (value === "invalid_temporal_alignment") {
    return "invalid_temporal_alignment";
  }
  if (value === "low_confidence") return "low_confidence";
  if (value === "degraded_snapshot") return "degraded_snapshot";
  if (value === "corrupted_distribution") return "corrupted_distribution";

  return "none";
}

function normalizeNeutralizationSeverity(value: unknown): NeutralizationSeverity {
  if (value === "low") return "low";
  if (value === "medium") return "medium";
  if (value === "high") return "high";
  if (value === "critical") return "critical";

  return "none";
}

function normalizeRuptureEvolutionState(
  value: unknown,
): RuptureEvolutionState {
  if (value === "improving") return "improving";
  if (value === "stable") return "stable";
  if (value === "worsening") return "worsening";
  if (value === "explosive") return "explosive";

  return "unknown";
}

/* ============================================================================
 * 3. DOMINANCE MAPPING
 * ========================================================================== */

export function resolveMciDominanceState(
  core: MciSampleCoreLike,
): MciFunnelDominanceState {
  const value = core.dominance_state;

  if (value === "RECOVERY") return "RECOVERY";
  if (value === "RUPTURE") return "RUPTURE";
  if (value === "NEUTRAL") return "NEUTRAL";

  if (value === "recovery_dominant") return "RECOVERY";
  if (value === "rupture_dominant") return "RUPTURE";
  if (value === "balanced") return "NEUTRAL";

  return "NEUTRAL";
}

export function normalizeDominanceForSample(
  value: MciFunnelDominanceState,
): DominanceState {
  if (value === "RECOVERY") return "recovery_dominant";
  if (value === "RUPTURE") return "rupture_dominant";

  return "balanced";
}

/* ============================================================================
 * 4. CORE DECISION RESOLUTION
 * ========================================================================== */

export function resolveCoreDecision(core: MciSampleCoreLike): CalibrationDecision {
  return normalizeCalibrationDecision(core.decision);
}

/* ============================================================================
 * 5. SAMPLE BUILDER
 * ========================================================================== */

export function buildMciDecisionSample(
  input: BuildMciDecisionSampleInput,
): DecisionSampleInput {
  const finalDecision = normalizeCalibrationDecision(input.funnel.decision);
  const regime = normalizeCalibrationRegime(input.regime);
  const dominanceState = normalizeDominanceForSample(input.dominance);
  const sampleReliability = normalizeReliability(input.sample_reliability);

  const ruptureScore = clampScore(input.core.rupture_score);
  const ruptureProbability = clampScore(input.core.rupture_probability);
  const ruptureEvolutionScore = clampScore(input.core.rupture_evolution_score);
  const ruptureAccelerationScore = clampScore(
    input.core.rupture_acceleration_score,
  );

  const neutralized = Boolean(input.core.neutralized);

  return {
    observed_ts: input.now,

    observed_analytical_version: input.analytical_version,
    observed_horizon: input.horizon,
    observed_policy_version: input.analytical_version,

    observed_regime: regime,
    observed_decision: finalDecision,
    observed_reason: input.funnel.decision_reason,
    observed_reliability: sampleReliability,

    mci_decision_score: clampScore(input.funnel.decision_score),
    mci_allow_raw_score: clampScore(input.funnel.allow_raw_score),
    mci_block_raw_score: clampScore(input.funnel.block_raw_score),

    mci_decision_support_probability: clampScore(
      input.decision_support_probability,
    ),

    mci_risk_rupture_probability: clampScore(
      input.risk_rupture_probability,
    ),

    mci_final_decision: finalDecision,
    mci_decision_reason: input.funnel.decision_reason,

    stability_score: clampScore(input.stability),
    opportunity_score: clampScore(input.opportunity),
    convergence_score: clampScore(input.convergence),
    confidence_score: clampScore(input.confidence),

    recovery_probability: clampScore(input.recovery_probability),

    recovery_rupture_dominance: clampScore(
      input.funnel.recovery_rupture_dominance,
    ),

    recovery_validity: "computed",

    dominance_state: dominanceState,

    rupture_score: ruptureScore,
    rupture_probability: ruptureProbability,
    rupture_detected: input.core.rupture_detected === true,
    rupture_reason: safeString(input.core.rupture_reason, "unknown"),
    rupture_validity: normalizeValidity(input.core.rupture_validity),

    rupture_evolution_score: ruptureEvolutionScore,

    rupture_evolution_state: normalizeRuptureEvolutionState(
      input.core.rupture_evolution_state,
    ),

    rupture_acceleration_score: ruptureAccelerationScore,

    rupture_evolution_validity: normalizeValidity(
      input.core.rupture_evolution_validity,
    ),

    neutralized,

    neutralization_reason: neutralized
      ? normalizeNeutralizationReason(input.core.neutralization_reason)
      : "none",

    neutralization_severity: neutralized
      ? normalizeNeutralizationSeverity(input.core.neutralization_severity)
      : "none",

    neutralization_validity: normalizeValidity(
      input.core.neutralization_validity,
    ),

    hard_block: Boolean(input.funnel.hard_block),
    hard_allow_candidate: Boolean(input.funnel.hard_allow_candidate),

    ts: input.now,
    analytical_version: input.analytical_version,
    policy_version: input.analytical_version,
    horizon: input.horizon,

    regime,
    final_decision: finalDecision,
    decision_reason: input.funnel.decision_reason,
    reason: input.funnel.decision_reason,

    decision_score: clampScore(input.funnel.decision_score),
    allow_raw_score: clampScore(input.funnel.allow_raw_score),
    block_raw_score: clampScore(input.funnel.block_raw_score),

    risk_rupture_probability: clampScore(input.risk_rupture_probability),

    decision_support_probability: clampScore(
      input.decision_support_probability,
    ),

    sample_reliability: sampleReliability,
    reliability: sampleReliability,
  };
}
