/* ============================================================================
 * FILE: lib/xyvala/calibration/opportunity-calibration-report.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala opportunity calibration report
 *
 * ROLE
 * - calibrate opportunity_score distribution from EngineAsset[]
 * - derive LOW / MEDIUM / HIGH threshold recommendations
 * - segment opportunity by engine regime
 * - provide non-destructive calibration insights
 *
 * DIRECTIVES
 * - calibration layer only
 * - EngineAsset only
 * - no ScanAsset import
 * - no public contract leakage
 * - no decision override
 * - no asset mutation
 * - deterministic output only
 * - thresholds are recommendations only
 * ========================================================================== */

import type {
  EngineAsset,
  EngineRegime,
} from "@/lib/xyvala/engine/types/engine-asset";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type OpportunityStats = {
  min: number;
  max: number;
  p25: number;
  p40: number;
  p50: number;
  p75: number;
  p90: number;
};

type OpportunityThresholds = {
  low_max: number;
  medium_min: number;
  high_min: number;
};

type RegimeBreakdown = Record<
  EngineRegime,
  {
    count: number;
    avg_opportunity: number;
  }
>;

export type OpportunityCalibrationReport = {
  sample_size: number;
  stats: OpportunityStats;
  thresholds: OpportunityThresholds;
  by_regime: RegimeBreakdown;
  warnings: string[];
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clampScore(value: unknown): number {
  if (!isFiniteNumber(value)) return 0;
  return Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
}

function round(value: number): number {
  return Math.round(value);
}

/* ============================================================================
 * 3. STATS
 * ========================================================================== */

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;

  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  const lastValue = sorted[sorted.length - 1] ?? 0;
  const lowerValue = sorted[lower] ?? lastValue;
  const upperValue = sorted[upper] ?? lastValue;

  if (lower === upper) {
    return clampScore(lowerValue);
  }

  return clampScore(
    lowerValue + (upperValue - lowerValue) * (index - lower),
  );
}

function computeStats(values: number[]): OpportunityStats {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      p25: 0,
      p40: 0,
      p50: 0,
      p75: 0,
      p90: 0,
    };
  }

  const sorted = values.map(clampScore).sort((a, b) => a - b);
  const firstValue = sorted[0] ?? 0;
  const lastValue = sorted[sorted.length - 1] ?? firstValue;

  return {
    min: clampScore(firstValue),
    max: clampScore(lastValue),
    p25: percentile(sorted, 0.25),
    p40: percentile(sorted, 0.4),
    p50: percentile(sorted, 0.5),
    p75: percentile(sorted, 0.75),
    p90: percentile(sorted, 0.9),
  };
}

/* ============================================================================
 * 4. REGIME BREAKDOWN
 * ========================================================================== */

function createEmptyRegimeBreakdown(): RegimeBreakdown {
  return {
    STABLE: { count: 0, avg_opportunity: 0 },
    TRANSITION: { count: 0, avg_opportunity: 0 },
    VOLATILE: { count: 0, avg_opportunity: 0 },
  };
}

function computeByRegime(assets: EngineAsset[]): RegimeBreakdown {
  const breakdown = createEmptyRegimeBreakdown();

  const sums: Record<EngineRegime, number> = {
    STABLE: 0,
    TRANSITION: 0,
    VOLATILE: 0,
  };

  for (const asset of assets) {
    const regime = asset.regime;
    const opportunity = clampScore(asset.opportunity_score);

    breakdown[regime].count += 1;
    sums[regime] += opportunity;
  }

  for (const regime of Object.keys(breakdown) as EngineRegime[]) {
    const count = breakdown[regime].count;

    breakdown[regime].avg_opportunity =
      count > 0 ? round(sums[regime] / count) : 0;
  }

  return breakdown;
}

/* ============================================================================
 * 5. THRESHOLDS
 * ========================================================================== */

function computeThresholds(
  stats: OpportunityStats,
): OpportunityThresholds {
  return {
    low_max: round(stats.p40),
    medium_min: round(stats.p40),
    high_min: round(stats.p75),
  };
}

/* ============================================================================
 * 6. WARNINGS
 * ========================================================================== */

function computeWarnings(input: {
  sample_size: number;
  stats: OpportunityStats;
}): string[] {
  const warnings: string[] = [];

  if (input.sample_size < 20) {
    warnings.push("LOW_SAMPLE_SIZE");
  }

  if (input.stats.p75 - input.stats.p40 < 5) {
    warnings.push("LOW_SCORE_SPREAD");
  }

  return warnings;
}

/* ============================================================================
 * 7. PUBLIC API
 * ========================================================================== */

export function computeOpportunityCalibrationReport(
  assets: EngineAsset[],
): OpportunityCalibrationReport {
  const sampleSize = assets.length;

  const values = assets.map((asset) =>
    clampScore(asset.opportunity_score),
  );

  const stats = computeStats(values);
  const thresholds = computeThresholds(stats);
  const byRegime = computeByRegime(assets);
  const warnings = computeWarnings({
    sample_size: sampleSize,
    stats,
  });

  return {
    sample_size: sampleSize,
    stats,
    thresholds,
    by_regime: byRegime,
    warnings,
  };
}
