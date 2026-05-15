/* ============================================================================
 * FILE: lib/xyvala/calibration/threshold-optimizer.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala internal threshold optimizer
 *
 * ROLE
 * - analyze internal EngineAsset distributions
 * - compute stability / opportunity score distributions
 * - compute regime distribution from engine-level assets
 * - recommend non-destructive threshold adjustments
 *
 * DIRECTIVES
 * - calibration analysis only
 * - internal EngineAsset only
 * - no ScanAsset import here
 * - no public contract leakage
 * - no threshold mutation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no UI/API logic
 * - deterministic output only
 * ========================================================================== */

import type { EngineAsset } from "@/lib/xyvala/engine/types/engine-asset";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type DistributionStats = {
  min: number;
  max: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
};

export type RegimeDistribution = {
  stable_pct: number;
  transition_pct: number;
  volatile_pct: number;
};

export type DecisionDistribution = {
  allow_pct: number;
  watch_pct: number;
  block_pct: number;
};

export type ThresholdRecommendations = {
  stability: {
    high_min: number;
    medium_min: number;
  };
  opportunity: {
    high_min: number;
    medium_min: number;
  };
};

export type CalibrationReport = {
  sample_size: number;

  stability_stats: DistributionStats;
  opportunity_stats: DistributionStats;

  regime_distribution: RegimeDistribution;
  decision_distribution: DecisionDistribution;

  recommendations: ThresholdRecommendations;

  warnings: string[];
};

/* ============================================================================
 * 2. HELPERS
 * ========================================================================== */

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function clampScore(value: unknown): number {
  const parsed = safeNumber(value, 0);
  return Math.round(Math.max(0, Math.min(100, parsed)) * 100) / 100;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((p / 100) * sorted.length)),
  );

  return clampScore(sorted[index]);
}

function computeStats(values: number[]): DistributionStats {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      p25: 0,
      p50: 0,
      p75: 0,
      p90: 0,
    };
  }

  const normalized = values.map(clampScore);

  return {
    min: clampScore(Math.min(...normalized)),
    max: clampScore(Math.max(...normalized)),
    p25: percentile(normalized, 25),
    p50: percentile(normalized, 50),
    p75: percentile(normalized, 75),
    p90: percentile(normalized, 90),
  };
}

function computePct(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

/* ============================================================================
 * 3. DISTRIBUTIONS
 * ========================================================================== */

function computeRegimeDistribution(
  assets: EngineAsset[],
): RegimeDistribution {
  const total = assets.length;

  const stable = assets.filter((asset) => asset.regime === "STABLE").length;
  const transition = assets.filter(
    (asset) => asset.regime === "TRANSITION",
  ).length;
  const volatile = assets.filter(
    (asset) => asset.regime === "VOLATILE",
  ).length;

  return {
    stable_pct: computePct(stable, total),
    transition_pct: computePct(transition, total),
    volatile_pct: computePct(volatile, total),
  };
}

function computeDecisionDistribution(
  assets: EngineAsset[],
): DecisionDistribution {
  const total = assets.length;

  const allow = assets.filter((asset) => asset.decision === "ALLOW").length;
  const watch = assets.filter((asset) => asset.decision === "WATCH").length;
  const block = assets.filter((asset) => asset.decision === "BLOCK").length;

  return {
    allow_pct: computePct(allow, total),
    watch_pct: computePct(watch, total),
    block_pct: computePct(block, total),
  };
}

/* ============================================================================
 * 4. RECOMMENDATIONS
 * ========================================================================== */

function buildRecommendations(
  stabilityStats: DistributionStats,
  opportunityStats: DistributionStats,
): ThresholdRecommendations {
  return {
    stability: {
      high_min: Math.round(stabilityStats.p75),
      medium_min: Math.round(stabilityStats.p50),
    },
    opportunity: {
      high_min: Math.round(opportunityStats.p75),
      medium_min: Math.round(opportunityStats.p50),
    },
  };
}

/* ============================================================================
 * 5. WARNINGS
 * ========================================================================== */

function detectWarnings(input: {
  sample_size: number;
  regime_distribution: RegimeDistribution;
  decision_distribution: DecisionDistribution;
  stability_stats: DistributionStats;
  opportunity_stats: DistributionStats;
}): string[] {
  const warnings: string[] = [];

  if (input.sample_size === 0) {
    warnings.push("No engine samples available for threshold optimization");
  }

  if (input.regime_distribution.volatile_pct > 45) {
    warnings.push("Volatile regime concentration is elevated");
  }

  if (input.regime_distribution.stable_pct > 70) {
    warnings.push("Stable regime concentration is unusually high");
  }

  if (input.decision_distribution.block_pct > 80) {
    warnings.push("Decision distribution is heavily BLOCK");
  }

  if (input.decision_distribution.allow_pct < 2) {
    warnings.push("ALLOW distribution is very low");
  }

  if (input.stability_stats.p50 < 40) {
    warnings.push("Median stability is weak");
  }

  if (input.opportunity_stats.p50 < 30) {
    warnings.push("Median opportunity is weak");
  }

  return warnings;
}

/* ============================================================================
 * 6. MAIN
 * ========================================================================== */

export function optimizeThresholds(
  assets: EngineAsset[],
): CalibrationReport {
  const sampleSize = assets.length;

  const stabilityValues = assets.map((asset) =>
    clampScore(asset.stability_score),
  );

  const opportunityValues = assets.map((asset) =>
    clampScore(asset.opportunity_score),
  );

  const stabilityStats = computeStats(stabilityValues);
  const opportunityStats = computeStats(opportunityValues);

  const regimeDistribution = computeRegimeDistribution(assets);
  const decisionDistribution = computeDecisionDistribution(assets);

  const recommendations = buildRecommendations(
    stabilityStats,
    opportunityStats,
  );

  const warnings = detectWarnings({
    sample_size: sampleSize,
    regime_distribution: regimeDistribution,
    decision_distribution: decisionDistribution,
    stability_stats: stabilityStats,
    opportunity_stats: opportunityStats,
  });

  return {
    sample_size: sampleSize,

    stability_stats: stabilityStats,
    opportunity_stats: opportunityStats,

    regime_distribution: regimeDistribution,
    decision_distribution: decisionDistribution,

    recommendations,

    warnings,
  };
}
