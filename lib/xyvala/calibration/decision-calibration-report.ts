/* ============================================================================
 * FILE: lib/xyvala/calibration/decision-calibration-report.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala decision calibration report
 *
 * ROLE
 * - analyze current private / legacy-compatible scan decision outputs
 * - measure score distribution without mutating assets
 * - derive explicit ALLOW / WATCH threshold recommendations
 * - detect over-filtering / under-filtering
 *
 * DIRECTIVES
 * - calibration report only
 * - no threshold mutation
 * - no MCI override
 * - no RFS recomputation
 * - no public API leakage
 * - deterministic output only
 * - tolerate transitional contracts through local readers
 * ========================================================================== */

import type {
  CalibrationDecision,
  CalibrationRegime,
} from "@/lib/xyvala/calibration/calibration-contracts";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type ReportAsset = {
  stability_score?: number | null;
  opportunity_score?: number | null;

  chg_24h_pct?: number | null;
  chg_7d_pct?: number | null;

  regime?: CalibrationRegime | null;
  decision?: CalibrationDecision | null;
  final_decision?: CalibrationDecision | null;
};

export type DecisionCalibrationStats = {
  min: number;
  max: number;
  p25: number;
  p40: number;
  p50: number;
  p75: number;
  p90: number;
};

export type DecisionDistribution = {
  allow_pct: number;
  watch_pct: number;
  block_pct: number;
};

export type DecisionByRegime = Record<
  CalibrationRegime,
  DecisionDistribution
>;

export type DecisionThresholds = {
  allow_min: number;
  watch_min: number;
};

export type DecisionCalibrationReport = {
  sample_size: number;
  score_stats: DecisionCalibrationStats;
  thresholds: DecisionThresholds;
  distribution: DecisionDistribution;
  by_regime: DecisionByRegime;
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
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  const lowerValue = sorted[lower] ?? 0;
  const upperValue = sorted[upper] ?? lowerValue;

  if (lower === upper) return lowerValue;

  return lowerValue + (upperValue - lowerValue) * (index - lower);
}

function computeStats(values: number[]): DecisionCalibrationStats {
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

  return {
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    p25: percentile(sorted, 0.25),
    p40: percentile(sorted, 0.4),
    p50: percentile(sorted, 0.5),
    p75: percentile(sorted, 0.75),
    p90: percentile(sorted, 0.9),
  };
}

function computePct(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

/* ============================================================================
 * 3. CONTRACT READERS
 * ----------------------------------------------------------------------------
 * Transitional protection:
 * - Public ScanAsset may not expose regime / decision / opportunity.
 * - Private/internal objects may still expose them.
 * - This report reads safely without forcing public contract leakage.
 * ========================================================================== */

function readDecision(asset: ReportAsset): CalibrationDecision {
  if (asset.final_decision === "ALLOW" || asset.decision === "ALLOW") {
    return "ALLOW";
  }

  if (asset.final_decision === "BLOCK" || asset.decision === "BLOCK") {
    return "BLOCK";
  }

  return "WATCH";
}

function readRegime(asset: ReportAsset): CalibrationRegime {
  if (asset.regime === "STABLE") return "STABLE";
  if (asset.regime === "VOLATILE") return "VOLATILE";

  return "TRANSITION";
}

function readStability(asset: ReportAsset): number {
  return clampScore(asset.stability_score);
}

function readOpportunity(asset: ReportAsset): number {
  return clampScore(asset.opportunity_score);
}

/* ============================================================================
 * 4. CALIBRATION SCORE MODEL
 * ========================================================================== */

function mapRegime(regime: CalibrationRegime): number {
  switch (regime) {
    case "STABLE":
      return 100;
    case "TRANSITION":
      return 60;
    case "VOLATILE":
      return 20;
    default:
      return 50;
  }
}

function computeMomentum(asset: ReportAsset): number {
  const chg24 = isFiniteNumber(asset.chg_24h_pct) ? asset.chg_24h_pct : 0;
  const chg7d = isFiniteNumber(asset.chg_7d_pct) ? asset.chg_7d_pct : 0;

  if (chg24 > 0 && chg7d > 0) return 100;
  if (chg24 < 0 && chg7d < 0) return 20;

  return 60;
}

function extractScore(asset: ReportAsset): number {
  const stability = readStability(asset);
  const opportunity = readOpportunity(asset);
  const regimeScore = mapRegime(readRegime(asset));
  const momentumScore = computeMomentum(asset);

  return Math.round(
    stability * 0.4 +
      opportunity * 0.3 +
      regimeScore * 0.2 +
      momentumScore * 0.1,
  );
}

/* ============================================================================
 * 5. DISTRIBUTION HELPERS
 * ========================================================================== */

function computeDistribution(assets: ReportAsset[]): DecisionDistribution {
  const total = assets.length;

  const allow = assets.filter((asset) => readDecision(asset) === "ALLOW").length;
  const watch = assets.filter((asset) => readDecision(asset) === "WATCH").length;
  const block = assets.filter((asset) => readDecision(asset) === "BLOCK").length;

  return {
    allow_pct: computePct(allow, total),
    watch_pct: computePct(watch, total),
    block_pct: computePct(block, total),
  };
}

function computeByRegime(assets: ReportAsset[]): DecisionByRegime {
  const stableAssets = assets.filter((asset) => readRegime(asset) === "STABLE");

  const transitionAssets = assets.filter(
    (asset) => readRegime(asset) === "TRANSITION",
  );

  const volatileAssets = assets.filter(
    (asset) => readRegime(asset) === "VOLATILE",
  );

  return {
    STABLE: computeDistribution(stableAssets),
    TRANSITION: computeDistribution(transitionAssets),
    VOLATILE: computeDistribution(volatileAssets),
  };
}

/* ============================================================================
 * 6. DYNAMIC THRESHOLDS
 * ========================================================================== */

function computeThresholds(
  stats: DecisionCalibrationStats,
): DecisionThresholds {
  return {
    allow_min: Math.round(stats.p75),
    watch_min: Math.round(stats.p40),
  };
}

/* ============================================================================
 * 7. WARNING SYSTEM
 * ========================================================================== */

function detectWarnings(
  distribution: DecisionDistribution,
  byRegime: DecisionByRegime,
): string[] {
  const warnings: string[] = [];

  if (distribution.allow_pct < 2) {
    warnings.push("ALLOW too rare: possible over-filtering");
  }

  if (distribution.block_pct > 80) {
    warnings.push("BLOCK too dominant: thresholds too strict");
  }

  if (distribution.watch_pct < 20) {
    warnings.push("WATCH too rare: watch zone likely too narrow");
  }

  if (byRegime.TRANSITION.block_pct > 70) {
    warnings.push("TRANSITION over-blocked: WATCH zone likely too narrow");
  }

  if (byRegime.STABLE.block_pct > 60) {
    warnings.push("STABLE over-blocked: MCI may be too restrictive");
  }

  return warnings;
}

/* ============================================================================
 * 8. MAIN
 * ========================================================================== */

export function computeDecisionCalibrationReport(
  assets: ReportAsset[],
): DecisionCalibrationReport {
  const sampleSize = assets.length;

  const scores = assets.map(extractScore);
  const scoreStats = computeStats(scores);

  const thresholds = computeThresholds(scoreStats);
  const distribution = computeDistribution(assets);
  const byRegime = computeByRegime(assets);
  const warnings = detectWarnings(distribution, byRegime);

  return {
    sample_size: sampleSize,
    score_stats: scoreStats,
    thresholds,
    distribution,
    by_regime: byRegime,
    warnings,
  };
}
