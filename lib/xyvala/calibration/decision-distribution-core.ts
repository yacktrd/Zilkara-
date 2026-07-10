/* ============================================================================
 * FILE: lib/xyvala/calibration/decision-distribution-core.ts
 * ========================================================================== */

import type {
  CalibrationDecision,
  CalibrationPolicy,
  CalibrationPolicySource,
  CalibrationRegime,
  DecisionDistribution,
  DecisionPressure,
  DecisionSample,
  EvaluationHorizon,
  PolicyBuildInput,
  PolicyResult,
  PressureState,
  ReasonDistribution,
  RegimeDistribution,
} from "@/lib/xyvala/calibration/calibration-contracts";

/* ============================================================================
 * 1. CONSTANTS
 * ========================================================================== */

const DECISIONS: readonly CalibrationDecision[] = ["ALLOW", "WATCH", "BLOCK"];

const REGIMES: readonly CalibrationRegime[] = [
  "STABLE",
  "TRANSITION",
  "VOLATILE",
];

const TARGET_DISTRIBUTION: DecisionDistribution = {
  allow: 15,
  watch: 70,
  block: 15,
};

const EMPTY_DISTRIBUTION: DecisionDistribution = {
  allow: 0,
  watch: 0,
  block: 0,
};

const DEFENSIVE_POLICY: CalibrationPolicy = {
  allow: 76,
  block: 72,
  risk: 70,
  support: 50,
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function clamp(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function clampScore(value: number): number {
  return Math.round(clamp(value) * 100) / 100;
}

function safeString(value: unknown, fallback = "unknown"): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCalibrationDecision(value: unknown): value is CalibrationDecision {
  return DECISIONS.includes(value as CalibrationDecision);
}

function isCalibrationRegime(value: unknown): value is CalibrationRegime {
  return REGIMES.includes(value as CalibrationRegime);
}

function percentile(values: number[], pct: number): number {
  const clean = values.filter(isFiniteNumber).map(clampScore);

  if (clean.length === 0) return 0;

  const sorted = [...clean].sort((a, b) => a - b);
  const index = Math.floor((clamp(pct, 0, 100) / 100) * (sorted.length - 1));

  return sorted[index] ?? 0;
}

function emptyDistribution(): DecisionDistribution {
  return { ...EMPTY_DISTRIBUTION };
}

/* ============================================================================
 * 3. SAMPLE VALIDATION
 * ========================================================================== */

function isValidPolicySample(input: {
  sample: DecisionSample;
  analytical_version: string;
  horizon: EvaluationHorizon;
}): boolean {
  const { sample, analytical_version, horizon } = input;

  if (!sample || typeof sample !== "object") return false;
  if (sample.observed_analytical_version !== analytical_version) return false;
  if (sample.observed_horizon !== horizon) return false;

  if (!isCalibrationDecision(sample.observed_decision)) return false;
  if (!isCalibrationRegime(sample.observed_regime)) return false;
  if (!isCalibrationDecision(sample.mci_final_decision)) return false;

  return (
    isFiniteNumber(sample.mci_decision_score) &&
    isFiniteNumber(sample.mci_allow_raw_score) &&
    isFiniteNumber(sample.mci_block_raw_score) &&
    isFiniteNumber(sample.mci_decision_support_probability) &&
    isFiniteNumber(sample.mci_risk_rupture_probability)
  );
}

function resolveInputSamples(input: PolicyBuildInput): DecisionSample[] {
  return Array.isArray(input.samples) ? input.samples : [];
}

function filterSamples(input: PolicyBuildInput): DecisionSample[] {
  return resolveInputSamples(input).filter((sample) =>
    isValidPolicySample({
      sample,
      analytical_version: input.analytical_version,
      horizon: input.horizon,
    }),
  );
}

/* ============================================================================
 * 4. DISTRIBUTION COMPUTATION
 * ========================================================================== */

export function computeDecisionDistribution(
  samples: DecisionSample[],
): DecisionDistribution {
  if (samples.length === 0) return emptyDistribution();

  let allow = 0;
  let watch = 0;
  let block = 0;

  for (const sample of samples) {
    if (sample.observed_decision === "ALLOW") {
      allow += 1;
      continue;
    }

    if (sample.observed_decision === "BLOCK") {
      block += 1;
      continue;
    }

    watch += 1;
  }

  const total = samples.length;

  return {
    allow: clampScore((allow / total) * 100),
    watch: clampScore((watch / total) * 100),
    block: clampScore((block / total) * 100),
  };
}

export function computeRegimeDistribution(
  samples: DecisionSample[],
): RegimeDistribution {
  const grouped: Record<CalibrationRegime, DecisionSample[]> = {
    STABLE: [],
    TRANSITION: [],
    VOLATILE: [],
  };

  for (const sample of samples) {
    grouped[sample.observed_regime].push(sample);
  }

  return {
    STABLE: computeDecisionDistribution(grouped.STABLE),
    TRANSITION: computeDecisionDistribution(grouped.TRANSITION),
    VOLATILE: computeDecisionDistribution(grouped.VOLATILE),
  };
}

export function computeReasonDistribution(
  samples: DecisionSample[],
): ReasonDistribution {
  const reasonDistribution: ReasonDistribution = {};

  for (const sample of samples) {
    const reason = safeString(
      sample.observed_reason ?? sample.mci_decision_reason ?? sample.reason,
      "unknown",
    );

    reasonDistribution[reason] = (reasonDistribution[reason] ?? 0) + 1;
  }

  return reasonDistribution;
}

/* ============================================================================
 * 5. DECISION PRESSURE
 * ========================================================================== */

function pressureState(score: number): PressureState {
  if (score < 20) return "LOW";
  if (score < 45) return "NORMAL";
  if (score < 70) return "ELEVATED";

  return "EXCESSIVE";
}

export function computeDecisionPressure(
  distribution: DecisionDistribution,
): DecisionPressure {
  const allowPressure = clampScore(
    Math.max(0, distribution.allow - TARGET_DISTRIBUTION.allow) * 4,
  );

  const watchPressure = clampScore(
    Math.max(0, distribution.watch - TARGET_DISTRIBUTION.watch) * 3,
  );

  const blockPressure = clampScore(
    Math.max(0, distribution.block - TARGET_DISTRIBUTION.block) * 4,
  );

  return {
    allow_pressure_score: allowPressure,
    watch_pressure_score: watchPressure,
    block_pressure_score: blockPressure,

    allow_pressure_state: pressureState(allowPressure),
    watch_pressure_state: pressureState(watchPressure),
    block_pressure_state: pressureState(blockPressure),
  };
}

/* ============================================================================
 * 6. GOVERNANCE OBSERVATION
 * ========================================================================== */

function hasNeutralizedSamples(samples: DecisionSample[]): boolean {
  return samples.some((sample) => sample.neutralized === true);
}

function hasWorseningRupture(samples: DecisionSample[]): boolean {
  return samples.some((sample) => sample.rupture_evolution_state === "worsening");
}

function hasExplosiveRupture(samples: DecisionSample[]): boolean {
  return samples.some((sample) => sample.rupture_evolution_state === "explosive");
}

/* ============================================================================
 * 7. POLICY COMPUTATION
 * ========================================================================== */

function computePolicy(samples: DecisionSample[]): CalibrationPolicy {
  if (samples.length === 0) return { ...DEFENSIVE_POLICY };

  return {
    allow: percentile(
      samples.map((sample) => sample.mci_allow_raw_score),
      75,
    ),

    block: percentile(
      samples.map((sample) => sample.mci_block_raw_score),
      75,
    ),

    risk: percentile(
      samples.map((sample) => sample.mci_risk_rupture_probability),
      75,
    ),

    support: percentile(
      samples.map((sample) => sample.mci_decision_support_probability),
      50,
    ),
  };
}

function resolvePolicySource(
  effectiveSampleSize: number,
): CalibrationPolicySource {
  return effectiveSampleSize === 0 ? "fallback" : "calibrated";
}

function resolveWarnings(input: {
  sample_size: number;
  effective_sample_size: number;
  samples: DecisionSample[];
}): string[] {
  const warnings: string[] = [];

  if (input.sample_size === 0) {
    warnings.push("calibration_no_samples");
  }

  if (input.sample_size > 0 && input.effective_sample_size === 0) {
    warnings.push("calibration_no_valid_samples");
  }

  if (
    input.sample_size > 0 &&
    input.effective_sample_size > 0 &&
    input.effective_sample_size < input.sample_size
  ) {
    warnings.push("calibration_some_samples_rejected");
  }

  if (input.effective_sample_size === 0) {
    warnings.push("calibration_fallback_policy_active");
  }

  if (hasNeutralizedSamples(input.samples)) {
    warnings.push("calibration_neutralized_samples_detected");
  }

  if (hasWorseningRupture(input.samples)) {
    warnings.push("calibration_worsening_rupture_detected");
  }

  if (hasExplosiveRupture(input.samples)) {
    warnings.push("calibration_explosive_rupture_detected");
  }

  return [...new Set(warnings)];
}

/* ============================================================================
 * 8. PUBLIC CORE FUNCTION
 * ========================================================================== */

export function buildDecisionDistributionPolicy(
  input: PolicyBuildInput,
): PolicyResult {
  const samples = resolveInputSamples(input);
  const filteredSamples = filterSamples(input);

  const observedDistribution = computeDecisionDistribution(filteredSamples);
  const regimeDistribution = computeRegimeDistribution(filteredSamples);
  const reasonDistribution = computeReasonDistribution(filteredSamples);

  const policy = computePolicy(filteredSamples);
  const policySource = resolvePolicySource(filteredSamples.length);

  return {
    policy,
    policy_source: policySource,

    sample_size: samples.length,
    effective_sample_size: filteredSamples.length,

    observed_distribution: observedDistribution,
    regime_distribution: regimeDistribution,
    reason_distribution: reasonDistribution,

    warnings: resolveWarnings({
      sample_size: samples.length,
      effective_sample_size: filteredSamples.length,
      samples: filteredSamples,
    }),
  };
}
