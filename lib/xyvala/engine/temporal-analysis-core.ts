/* ============================================================================
 * FILE: lib/xyvala/engine/temporal-analysis-core.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - compute temporal structural analysis above the stable RFS core
 * - evaluate structural variables through five mandatory axes:
 *   occurrence, frequency, convergence, evolution, growth
 * - optionally enrich temporal analysis with filtered live support
 * - expose deterministic, auditable, MCI-ready temporal outputs
 *
 * PARENTS
 * - lib/xyvala/engine/rfs-market.ts
 * - lib/xyvala/live/live-temporal-bridge.ts
 * - lib/xyvala/engine/mci-market.ts
 *
 * DIRECTIVES
 * - do not modify or reinterpret the RFS contract itself
 * - no provider parsing here
 * - no route logic here
 * - no UI logic here
 * - no decision logic here
 * - deterministic outputs only
 * - same input => same output
 * - correlation is not a primary axis; it is an internal sub-measure of evolution
 * - live support enriches temporal reading but never replaces structural truth
 *
 * INPUTS
 * - RfsMarketResult
 * - optional liveSupport
 *
 * OUTPUTS
 * - TemporalAnalysisResult
 *
 * INVARIANTS
 * - all scores remain in [0, 100]
 * - all probabilities remain in [0, 100]
 * - target events stay explicit
 * - live support must not override occurrence
 * - live support must not directly mutate regime or stability
 *
 * SENSITIVE ZONES
 * - temporal axis calibration
 * - evolution sub-measure composition
 * - probability shaping
 * - live support weighting
 * ========================================================================== */

import type { RfsMarketResult } from "@/lib/xyvala/engine/rfs-market";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type TemporalAxisName =
  | "occurrence"
  | "frequency"
  | "convergence"
  | "evolution"
  | "growth";

export type ObservableProbability = {
  raw_score: number;
  calibrated_score: number;
  probability: number;
  target_event: string;
};

export type TemporalAxes = {
  occurrence: ObservableProbability;
  frequency: ObservableProbability;
  convergence: ObservableProbability;
  evolution: ObservableProbability;
  growth: ObservableProbability;
};

export type TemporalEvolutionInternals = {
  correlation_subscore: number;
  continuity_subscore: number;
  rupture_inverse_subscore: number;
};

export type TemporalLiveSupport = {
  quality_score: number;
  noise_score: number;
  micro_volatility: number;
  price_velocity: number;
  temporal_growth_hint: number;
  temporal_convergence_hint: number;
  temporal_evolution_hint: number;
  micro_rupture_pressure: number;
};

export type RunTemporalAnalysisInput = {
  rfs: RfsMarketResult;
  liveSupport?: TemporalLiveSupport | null;
};

export type TemporalAnalysisResult = {
  axes: TemporalAxes;
  evolution_internals: TemporalEvolutionInternals;
  live_context: {
    applied: boolean;
    quality_score: number | null;
    noise_score: number | null;
    micro_volatility: number | null;
    price_velocity: number | null;
    live_frequency_support: number | null;
  };
  aggregate: {
    structural_probability: number;
    temporal_coherence: number;
    temporal_support_probability: number;
  };
  warnings: string[];
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;

  return clampScore(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
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

  return [
    ...new Set(
      merged.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      ),
    ),
  ];
}

function normalizeLiveSupport(
  liveSupport?: TemporalLiveSupport | null,
): TemporalLiveSupport | null {
  if (!liveSupport) return null;

  return {
    quality_score: clampScore(liveSupport.quality_score),
    noise_score: clampScore(liveSupport.noise_score),
    micro_volatility: clampScore(liveSupport.micro_volatility),
    price_velocity: Number.isFinite(liveSupport.price_velocity)
      ? Math.round(liveSupport.price_velocity * 100) / 100
      : 0,
    temporal_growth_hint: clampScore(liveSupport.temporal_growth_hint),
    temporal_convergence_hint: clampScore(liveSupport.temporal_convergence_hint),
    temporal_evolution_hint: clampScore(liveSupport.temporal_evolution_hint),
    micro_rupture_pressure: clampScore(liveSupport.micro_rupture_pressure),
  };
}

/* ============================================================================
 * 3. AXIS CALIBRATION
 * ----------------------------------------------------------------------------
 * ROLE
 * - preserve a stable deterministic transform from raw score to calibrated score
 * - this is a bounded local calibration, not a market-wide adaptive one
 * ========================================================================== */

function calibrateAxisScore(input: {
  axis: TemporalAxisName;
  raw_score: number;
}): number {
  const raw = clampScore(input.raw_score);

  switch (input.axis) {
    case "occurrence":
      return clampScore(raw * 0.92 + 4);

    case "frequency":
      return clampScore(raw * 0.9 + 5);

    case "convergence":
      return clampScore(raw * 0.94 + 3);

    case "evolution":
      return clampScore(raw * 0.96 + 2);

    case "growth":
      return clampScore(raw * 0.9 + 4);

    default:
      return raw;
  }
}

function scoreToProbability(input: {
  axis: TemporalAxisName;
  calibrated_score: number;
}): number {
  const score = clampScore(input.calibrated_score);

  switch (input.axis) {
    case "occurrence":
      return clampScore(score * 0.95);

    case "frequency":
      return clampScore(score * 0.93);

    case "convergence":
      return clampScore(score * 0.96);

    case "evolution":
      return clampScore(score * 0.97);

    case "growth":
      return clampScore(score * 0.94);

    default:
      return score;
  }
}

function buildAxisProbability(input: {
  axis: TemporalAxisName;
  raw_score: number;
  target_event: string;
}): ObservableProbability {
  const raw = clampScore(input.raw_score);

  const calibrated = calibrateAxisScore({
    axis: input.axis,
    raw_score: raw,
  });

  const probability = scoreToProbability({
    axis: input.axis,
    calibrated_score: calibrated,
  });

  return {
    raw_score: raw,
    calibrated_score: calibrated,
    probability,
    target_event: input.target_event,
  };
}

/* ============================================================================
 * 4. RAW AXIS BUILDERS
 * ----------------------------------------------------------------------------
 * TAXONOMY
 * - occurrence = repetition
 * - frequency  = rhythm
 * - convergence = direction
 * - evolution = transformation
 * - growth = intensity
 *
 * NOTE
 * - correlation is handled as an internal sub-measure of evolution
 * - live support enriches frequency / convergence / evolution / growth only
 * ========================================================================== */

function computeOccurrenceBaseRaw(rfs: RfsMarketResult): number {
  return clampScore(
    rfs.scores.occurrence * 0.7 +
      Math.min(100, rfs.metrics.pattern_count * 8) * 0.3,
  );
}

function computeFrequencyBaseRaw(rfs: RfsMarketResult): number {
  return clampScore(
    rfs.scores.frequency * 0.7 +
      (100 - clampScore(rfs.metrics.direction_changes * 8)) * 0.3,
  );
}

function computeConvergenceBaseRaw(rfs: RfsMarketResult): number {
  return clampScore(
    rfs.scores.convergence * 0.75 +
      rfs.metrics.dominant_direction_ratio * 0.25,
  );
}

function computeEvolutionInternals(rfs: RfsMarketResult): TemporalEvolutionInternals {
  return {
    correlation_subscore: clampScore(rfs.scores.correlation),
    continuity_subscore: clampScore(rfs.probabilities.continuity_probability),
    rupture_inverse_subscore: clampScore(
      100 - rfs.probabilities.rupture_probability,
    ),
  };
}

function computeEvolutionBaseRaw(input: {
  rfs: RfsMarketResult;
  internals: TemporalEvolutionInternals;
}): number {
  const { rfs, internals } = input;

  return clampScore(
    internals.correlation_subscore * 0.45 +
      internals.continuity_subscore * 0.3 +
      internals.rupture_inverse_subscore * 0.15 +
      rfs.scores.duration * 0.1,
  );
}

function computeGrowthBaseRaw(rfs: RfsMarketResult): number {
  const midTerm = clampScore(rfs.scores.mid_term);

  const confirmationSupport = clampScore(
    rfs.metrics.confirmation_alignment === "ALIGNED"
      ? 85
      : rfs.metrics.confirmation_alignment === "NEUTRAL"
        ? 55
        : rfs.metrics.confirmation_alignment === "UNAVAILABLE"
          ? 40
          : 15,
  );

  const ruptureInverse = clampScore(100 - rfs.scores.rupture);

  return clampScore(
    midTerm * 0.5 +
      ruptureInverse * 0.2 +
      rfs.scores.duration * 0.15 +
      rfs.scores.frequency * 0.05 +
      confirmationSupport * 0.1,
  );
}

/* ============================================================================
 * 5. LIVE SUPPORT ENRICHMENT
 * ----------------------------------------------------------------------------
 * ROLE
 * - enrich temporal reading without allowing live noise to become structural truth
 * - occurrence is intentionally not enriched by live data
 * ========================================================================== */

function computeLiveFrequencySupport(
  liveSupport: TemporalLiveSupport | null,
): number | null {
  if (!liveSupport) return null;

  return clampScore(
    (100 - liveSupport.noise_score) * 0.4 +
      (100 - liveSupport.micro_volatility) * 0.2 +
      liveSupport.quality_score * 0.4,
  );
}

function enrichFrequencyRaw(input: {
  baseRaw: number;
  liveSupport: TemporalLiveSupport | null;
}): number {
  const liveFrequencySupport = computeLiveFrequencySupport(input.liveSupport);

  return clampScore(
    input.baseRaw * 0.88 +
      (liveFrequencySupport ?? input.baseRaw) * 0.12,
  );
}

function enrichConvergenceRaw(input: {
  baseRaw: number;
  liveSupport: TemporalLiveSupport | null;
}): number {
  return clampScore(
    input.baseRaw * 0.82 +
      (input.liveSupport?.temporal_convergence_hint ?? input.baseRaw) * 0.18,
  );
}

function enrichEvolutionRaw(input: {
  baseRaw: number;
  liveSupport: TemporalLiveSupport | null;
}): number {
  return clampScore(
    input.baseRaw * 0.82 +
      (input.liveSupport?.temporal_evolution_hint ?? input.baseRaw) * 0.18,
  );
}

function enrichGrowthRaw(input: {
  baseRaw: number;
  liveSupport: TemporalLiveSupport | null;
}): number {
  return clampScore(
    input.baseRaw * 0.78 +
      (input.liveSupport?.temporal_growth_hint ?? input.baseRaw) * 0.22,
  );
}

/* ============================================================================
 * 6. AGGREGATION
 * ========================================================================== */

function computeTemporalCoherence(axes: TemporalAxes): number {
  const probabilities = [
    axes.occurrence.probability,
    axes.frequency.probability,
    axes.convergence.probability,
    axes.evolution.probability,
    axes.growth.probability,
  ];

  const deviation = stdDev(probabilities);

  return clampScore(100 - deviation * 2.2);
}

function computeStructuralProbability(axes: TemporalAxes): number {
  return clampScore(
    axes.occurrence.probability * 0.2 +
      axes.frequency.probability * 0.18 +
      axes.convergence.probability * 0.24 +
      axes.evolution.probability * 0.24 +
      axes.growth.probability * 0.14,
  );
}

function computeTemporalSupportProbability(input: {
  structural_probability: number;
  temporal_coherence: number;
}): number {
  return clampScore(
    input.structural_probability * 0.72 +
      input.temporal_coherence * 0.28,
  );
}

/* ============================================================================
 * 7. PUBLIC API
 * ========================================================================== */

export function runTemporalAnalysis(
  input: RunTemporalAnalysisInput,
): TemporalAnalysisResult {
  const { rfs } = input;
  const liveSupport = normalizeLiveSupport(input.liveSupport);

  const evolutionInternals = computeEvolutionInternals(rfs);

  const occurrenceBaseRaw = computeOccurrenceBaseRaw(rfs);
  const frequencyBaseRaw = computeFrequencyBaseRaw(rfs);
  const convergenceBaseRaw = computeConvergenceBaseRaw(rfs);
  const evolutionBaseRaw = computeEvolutionBaseRaw({
    rfs,
    internals: evolutionInternals,
  });
  const growthBaseRaw = computeGrowthBaseRaw(rfs);

  const occurrenceRaw = occurrenceBaseRaw;

  const frequencyRaw = enrichFrequencyRaw({
    baseRaw: frequencyBaseRaw,
    liveSupport,
  });

  const convergenceRaw = enrichConvergenceRaw({
    baseRaw: convergenceBaseRaw,
    liveSupport,
  });

  const evolutionRaw = enrichEvolutionRaw({
    baseRaw: evolutionBaseRaw,
    liveSupport,
  });

  const growthRaw = enrichGrowthRaw({
    baseRaw: growthBaseRaw,
    liveSupport,
  });

  const axes: TemporalAxes = {
    occurrence: buildAxisProbability({
      axis: "occurrence",
      raw_score: occurrenceRaw,
      target_event: "pattern_repeats_with_observable_recurrence",
    }),
    frequency: buildAxisProbability({
      axis: "frequency",
      raw_score: frequencyRaw,
      target_event: "pattern_rhythm_remains_consistent",
    }),
    convergence: buildAxisProbability({
      axis: "convergence",
      raw_score: convergenceRaw,
      target_event: "directional_alignment_persists",
    }),
    evolution: buildAxisProbability({
      axis: "evolution",
      raw_score: evolutionRaw,
      target_event: "structure_transforms_coherently_over_time",
    }),
    growth: buildAxisProbability({
      axis: "growth",
      raw_score: growthRaw,
      target_event: "progression_intensity_remains_constructive",
    }),
  };

  const structuralProbability = computeStructuralProbability(axes);
  const temporalCoherence = computeTemporalCoherence(axes);
  const temporalSupportProbability = computeTemporalSupportProbability({
    structural_probability: structuralProbability,
    temporal_coherence: temporalCoherence,
  });

  const liveFrequencySupport = computeLiveFrequencySupport(liveSupport);

  const warnings: string[] = [];

  if (temporalCoherence < 45) {
    warnings.push("temporal_analysis_low_coherence");
  }

  if (axes.growth.probability < 35 && axes.convergence.probability >= 60) {
    warnings.push("temporal_analysis_direction_without_growth");
  }

  if (axes.evolution.probability < 40 && axes.occurrence.probability >= 60) {
    warnings.push("temporal_analysis_repetition_without_clean_evolution");
  }

  if (liveSupport) {
    if (liveSupport.noise_score >= 75) {
      warnings.push("temporal_analysis_live_noise_high");
    }

    if (liveSupport.quality_score < 35) {
      warnings.push("temporal_analysis_live_quality_low");
    }

    if (liveSupport.micro_rupture_pressure >= 75) {
      warnings.push("temporal_analysis_live_micro_rupture_pressure_high");
    }
  }

  return {
    axes,
    evolution_internals: evolutionInternals,
    live_context: {
      applied: liveSupport !== null,
      quality_score: liveSupport?.quality_score ?? null,
      noise_score: liveSupport?.noise_score ?? null,
      micro_volatility: liveSupport?.micro_volatility ?? null,
      price_velocity: liveSupport?.price_velocity ?? null,
      live_frequency_support: liveFrequencySupport,
    },
    aggregate: {
      structural_probability: structuralProbability,
      temporal_coherence: temporalCoherence,
      temporal_support_probability: temporalSupportProbability,
    },
    warnings: uniqueWarnings(rfs.warnings, warnings),
  };
}
