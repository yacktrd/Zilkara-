/* ============================================================================
 * FILE: lib/xyvala/engine/rupture-analysis-core.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - compute structured rupture analysis above the stable RFS core
 * - evaluate rupture through five temporal dimensions:
 *   occurrence, frequency, convergence, evolution, growth
 * - expose both rupture pressure and contractual risk_rupture_score
 *
 * PARENTS
 * - lib/xyvala/engine/rfs-market.ts
 * - lib/xyvala/engine/temporal-analysis-core.ts
 * - lib/xyvala/engine/mci-market.ts
 *
 * DIRECTIVES
 * - no provider parsing here
 * - no route logic here
 * - no UI logic here
 * - no decision logic here
 * - deterministic outputs only
 * - same input => same output
 *
 * INPUTS
 * - rfs
 * - optional liveSupport
 *
 * OUTPUTS
 * - RuptureAnalysisResult
 * ========================================================================== */

import type { RfsMarketResult } from "@/lib/xyvala/engine/rfs-market";
import type { TemporalLiveSupport } from "@/lib/xyvala/engine/temporal-analysis-core";

export type RuptureAxisName =
  | "occurrence"
  | "frequency"
  | "convergence"
  | "evolution"
  | "growth";

export type RuptureObservableProbability = {
  raw_score: number;
  calibrated_score: number;
  probability: number;
  target_event: string;
};

export type RuptureAxes = {
  occurrence: RuptureObservableProbability;
  frequency: RuptureObservableProbability;
  convergence: RuptureObservableProbability;
  evolution: RuptureObservableProbability;
  growth: RuptureObservableProbability;
};

export type RuptureAnalysisResult = {
  axes: RuptureAxes;
  rupture: RuptureObservableProbability;
  risk_rupture_score: RuptureObservableProbability;
  aggregate: {
    rupture_support_probability: number;
    rupture_coherence: number;
    anti_continuity_probability: number;
  };
  diagnostics: {
    rupture_event_density: number;
    rupture_direction_instability: number;
    rupture_growth_pressure: number;
  };
  warnings: string[];
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return clampScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [...new Set(merged.filter((item): item is string => Boolean(item?.trim())))];
}

function calibrateAxisScore(axis: RuptureAxisName, rawScore: number): number {
  const raw = clampScore(rawScore);

  switch (axis) {
    case "occurrence":
      return clampScore(raw * 0.95 + 2);
    case "frequency":
      return clampScore(raw * 0.96 + 2);
    case "convergence":
      return clampScore(raw * 0.94 + 3);
    case "evolution":
      return clampScore(raw * 0.97 + 1.5);
    case "growth":
      return clampScore(raw * 0.95 + 2.5);
    default:
      return raw;
  }
}

function scoreToProbability(axis: RuptureAxisName, calibratedScore: number): number {
  const score = clampScore(calibratedScore);

  switch (axis) {
    case "occurrence":
      return clampScore(score * 0.97);
    case "frequency":
      return clampScore(score * 0.97);
    case "convergence":
      return clampScore(score * 0.98);
    case "evolution":
      return clampScore(score * 0.99);
    case "growth":
      return clampScore(score * 0.98);
    default:
      return score;
  }
}

function buildAxisProbability(input: {
  axis: RuptureAxisName;
  raw_score: number;
  target_event: string;
}): RuptureObservableProbability {
  const raw = clampScore(input.raw_score);
  const calibrated = calibrateAxisScore(input.axis, raw);
  const probability = scoreToProbability(input.axis, calibrated);

  return {
    raw_score: raw,
    calibrated_score: calibrated,
    probability,
    target_event: input.target_event,
  };
}

function computeRuptureEventDensity(rfs: RfsMarketResult): number {
  const sampleSize = Math.max(1, rfs.metrics.sample_size);
  return clampScore((rfs.metrics.rupture_events / sampleSize) * 100);
}

function computeRuptureDirectionInstability(rfs: RfsMarketResult): number {
  const sampleSize = Math.max(1, rfs.metrics.sample_size);
  return clampScore((rfs.metrics.direction_changes / sampleSize) * 100);
}

function computeRuptureGrowthPressure(
  rfs: RfsMarketResult,
  liveSupport?: TemporalLiveSupport | null,
): number {
  const liveRupturePressure = clampScore(liveSupport?.micro_rupture_pressure ?? 0);

  return clampScore(
    rfs.scores.rupture * 0.5 +
      (100 - rfs.scores.frequency) * 0.16 +
      (100 - rfs.scores.duration) * 0.14 +
      (100 - rfs.scores.stability) * 0.1 +
      liveRupturePressure * 0.1,
  );
}

function computeOccurrenceRaw(rfs: RfsMarketResult): number {
  const eventDensity = computeRuptureEventDensity(rfs);

  return clampScore(
    eventDensity * 0.55 +
      rfs.scores.rupture * 0.3 +
      Math.min(100, rfs.metrics.rupture_events * 12) * 0.15,
  );
}

function computeFrequencyRaw(
  rfs: RfsMarketResult,
  liveSupport?: TemporalLiveSupport | null,
): number {
  const eventDensity = computeRuptureEventDensity(rfs);
  const directionInstability = computeRuptureDirectionInstability(rfs);
  const liveNoise = clampScore(liveSupport?.noise_score ?? 0);

  return clampScore(
    eventDensity * 0.4 +
      directionInstability * 0.2 +
      (100 - rfs.scores.frequency) * 0.3 +
      liveNoise * 0.1,
  );
}

function computeConvergenceRaw(rfs: RfsMarketResult): number {
  const confirmationPenalty =
    rfs.metrics.confirmation_alignment === "OPPOSED"
      ? 100
      : rfs.metrics.confirmation_alignment === "NEUTRAL"
        ? 55
        : rfs.metrics.confirmation_alignment === "UNAVAILABLE"
          ? 45
          : 20;

  return clampScore(
    rfs.scores.rupture * 0.35 +
      (100 - rfs.scores.convergence) * 0.25 +
      confirmationPenalty * 0.2 +
      (100 - rfs.metrics.dominant_direction_ratio) * 0.2,
  );
}

function computeEvolutionRaw(rfs: RfsMarketResult): number {
  const antiContinuity = clampScore(100 - rfs.probabilities.continuity_probability);

  return clampScore(
    rfs.scores.rupture * 0.32 +
      antiContinuity * 0.28 +
      (100 - rfs.scores.correlation) * 0.16 +
      (100 - rfs.scores.duration) * 0.14 +
      (100 - rfs.scores.frequency) * 0.1,
  );
}

function computeGrowthRaw(
  rfs: RfsMarketResult,
  liveSupport?: TemporalLiveSupport | null,
): number {
  return computeRuptureGrowthPressure(rfs, liveSupport);
}

function computeRuptureCoherence(axes: RuptureAxes): number {
  const probabilities = [
    axes.occurrence.probability,
    axes.frequency.probability,
    axes.convergence.probability,
    axes.evolution.probability,
    axes.growth.probability,
  ];

  const deviation = stdDev(probabilities);
  return clampScore(100 - deviation * 2.1);
}

function computeRuptureSupportProbability(axes: RuptureAxes): number {
  return clampScore(
    axes.occurrence.probability * 0.18 +
      axes.frequency.probability * 0.18 +
      axes.convergence.probability * 0.2 +
      axes.evolution.probability * 0.26 +
      axes.growth.probability * 0.18,
  );
}

export function runRuptureAnalysis(input: {
  rfs: RfsMarketResult;
  liveSupport?: TemporalLiveSupport | null;
}): RuptureAnalysisResult {
  const { rfs, liveSupport = null } = input;

  const ruptureEventDensity = computeRuptureEventDensity(rfs);
  const ruptureDirectionInstability = computeRuptureDirectionInstability(rfs);
  const ruptureGrowthPressure = computeRuptureGrowthPressure(rfs, liveSupport);
  const antiContinuityProbability = clampScore(
    100 - rfs.probabilities.continuity_probability,
  );

  const axes: RuptureAxes = {
    occurrence: buildAxisProbability({
      axis: "occurrence",
      raw_score: computeOccurrenceRaw(rfs),
      target_event: "rupture_patterns_repeat_with_observable_recurrence",
    }),
    frequency: buildAxisProbability({
      axis: "frequency",
      raw_score: computeFrequencyRaw(rfs, liveSupport),
      target_event: "rupture_rhythm_density_increases",
    }),
    convergence: buildAxisProbability({
      axis: "convergence",
      raw_score: computeConvergenceRaw(rfs),
      target_event: "degradation_direction_aligns",
    }),
    evolution: buildAxisProbability({
      axis: "evolution",
      raw_score: computeEvolutionRaw(rfs),
      target_event: "structural_continuity_breaks_coherently_over_time",
    }),
    growth: buildAxisProbability({
      axis: "growth",
      raw_score: computeGrowthRaw(rfs, liveSupport),
      target_event: "rupture_intensity_accelerates",
    }),
  };

  const ruptureSupportProbability = computeRuptureSupportProbability(axes);
  const ruptureCoherence = computeRuptureCoherence(axes);

  const ruptureRaw = clampScore(
    ruptureSupportProbability * 0.56 +
      ruptureCoherence * 0.16 +
      antiContinuityProbability * 0.28,
  );

  const ruptureCalibrated = clampScore(ruptureRaw * 0.98 + 1);
  const ruptureProbability = clampScore(ruptureCalibrated * 0.99);

  const riskRuptureRaw = clampScore(
    ruptureProbability * 0.5 +
      ruptureCoherence * 0.2 +
      antiContinuityProbability * 0.2 +
      ruptureGrowthPressure * 0.1,
  );
  const riskRuptureCalibrated = clampScore(riskRuptureRaw * 0.99 + 0.5);
  const riskRuptureProbability = clampScore(riskRuptureCalibrated);

  const warnings: string[] = [];

  if (ruptureProbability >= 75) {
    warnings.push("rupture_analysis_high_probability");
  }

  if (ruptureCoherence >= 70 && ruptureProbability >= 65) {
    warnings.push("rupture_analysis_coherent_break_risk");
  }

  if (riskRuptureProbability >= 70) {
    warnings.push("risk_rupture_score_high");
  }

  if ((liveSupport?.noise_score ?? 0) >= 80) {
    warnings.push("rupture_analysis_live_noise_high");
  }

  return {
    axes,
    rupture: {
      raw_score: ruptureRaw,
      calibrated_score: ruptureCalibrated,
      probability: ruptureProbability,
      target_event: "major_structural_break_occurs",
    },
    risk_rupture_score: {
      raw_score: riskRuptureRaw,
      calibrated_score: riskRuptureCalibrated,
      probability: riskRuptureProbability,
      target_event: "structural_break_risk_dominates",
    },
    aggregate: {
      rupture_support_probability: ruptureSupportProbability,
      rupture_coherence: ruptureCoherence,
      anti_continuity_probability: antiContinuityProbability,
    },
    diagnostics: {
      rupture_event_density: ruptureEventDensity,
      rupture_direction_instability: ruptureDirectionInstability,
      rupture_growth_pressure: ruptureGrowthPressure,
    },
    warnings: uniqueWarnings(rfs.warnings, warnings),
  };
}
