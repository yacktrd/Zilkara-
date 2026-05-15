/* ============================================================================
 * FILE: lib/xyvala/calibration/calibration-layer.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - transform RFS structural outputs into calibrated probabilistic outputs
 * - preserve OCC / CONV / DUR / FREQ / CORR as the core structural method
 * - add statistical normalization and probability shaping before MCI
 *
 * PARENTS
 * - lib/xyvala/engine/rfs-market.ts
 * - lib/xyvala/engine/mci-market.ts
 * - lib/xyvala/calibration/threshold-optimizer.ts
 *
 * DIRECTIVES
 * - no provider parsing here
 * - no route logic here
 * - no snapshot shaping here
 * - no decision logic here
 * - deterministic outputs only
 * - same input + same calibration config => same output
 *
 * INPUTS
 * - RfsMarketResult
 * - optional calibration stats
 *
 * OUTPUTS
 * - CalibrationLayerResult
 *
 * INVARIANTS
 * - probabilities remain in [0, 100]
 * - confidence remains a secondary modulator
 * - regime remains a contextual modulator only
 * ========================================================================== */

import type { RfsMarketResult } from "@/lib/xyvala/engine/rfs-market";

export type CalibrationStats = {
  p50: number;
  p75: number;
  p90: number;
};

export type CalibrationConfig = {
  logistic_k: number;
  default_stats: {
    structure: CalibrationStats;
    continuity: CalibrationStats;
    opportunity: CalibrationStats;
  };
};

export type CalibrationLayerResult = {
  base: {
    structure: number;
    continuity: number;
    rupture: number;
    opportunity_context: number;
  };
  normalized: {
    structure: number;
    continuity: number;
    opportunity_context: number;
  };
  probabilities: {
    structure: number;
    continuity: number;
    rupture: number;
    opportunity_context: number;
    adjusted_final: number;
  };
  warnings: string[];
};

const DEFAULT_CONFIG: CalibrationConfig = {
  logistic_k: 4,
  default_stats: {
    structure: { p50: 50, p75: 70, p90: 85 },
    continuity: { p50: 50, p75: 68, p90: 82 },
    opportunity: { p50: 50, p75: 70, p90: 85 },
  },
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

function normalizeAgainstStats(value: number, stats: CalibrationStats): number {
  const denominator = Math.max(1, stats.p90 - stats.p50);
  const normalized = (value - stats.p50) / denominator;
  return Math.max(-3, Math.min(3, normalized));
}

function logisticToPct(x: number, k: number): number {
  const p = 1 / (1 + Math.exp(-k * x));
  return clampScore(p * 100);
}

function regimeFactor(regime: RfsMarketResult["states"]["regime"]): number {
  if (regime === "STABLE") return 1.08;
  if (regime === "TRANSITION") return 0.96;
  return 0.72;
}

export function runCalibrationLayer(
  rfs: RfsMarketResult,
  config: CalibrationConfig = DEFAULT_CONFIG,
): CalibrationLayerResult {
  const baseStructure = clampScore(
    rfs.scores.occurrence * 0.20 +
      rfs.scores.convergence * 0.25 +
      rfs.scores.duration * 0.20 +
      rfs.scores.frequency * 0.20 +
      rfs.scores.correlation * 0.15,
  );

  const baseContinuity = clampScore(
    rfs.scores.convergence * 0.40 +
      rfs.scores.duration * 0.30 +
      (100 - rfs.scores.rupture) * 0.30,
  );

  const baseRupture = clampScore(100 - baseContinuity);

  const baseOpportunityContext = clampScore(
    rfs.scores.stability * 0.30 +
      rfs.scores.mid_term * 0.20 +
      rfs.scores.convergence * 0.20 +
      rfs.scores.correlation * 0.15 +
      (100 - rfs.scores.rupture) * 0.15,
  );

  const normalizedStructure = normalizeAgainstStats(
    baseStructure,
    config.default_stats.structure,
  );
  const normalizedContinuity = normalizeAgainstStats(
    baseContinuity,
    config.default_stats.continuity,
  );
  const normalizedOpportunity = normalizeAgainstStats(
    baseOpportunityContext,
    config.default_stats.opportunity,
  );

  const pStructure = logisticToPct(normalizedStructure, config.logistic_k);
  const pContinuity = logisticToPct(normalizedContinuity, config.logistic_k);
  const pOpportunityContext = logisticToPct(
    normalizedOpportunity,
    config.logistic_k,
  );

  const adjustedFinal = clampScore(
    (
      (pStructure * 0.45 +
        pContinuity * 0.30 +
        pOpportunityContext * 0.25) *
      regimeFactor(rfs.states.regime) *
      (rfs.quality.confidence / 100)
    ),
  );

  const warnings: string[] = [];

  if (rfs.states.rfs_status === "INSUFFICIENT_DATA") {
    warnings.push("calibration_insufficient_data");
  }

  if (rfs.states.rfs_status === "INVALID") {
    warnings.push("calibration_invalid_rfs");
  }

  return {
    base: {
      structure: baseStructure,
      continuity: baseContinuity,
      rupture: baseRupture,
      opportunity_context: baseOpportunityContext,
    },
    normalized: {
      structure: normalizedStructure,
      continuity: normalizedContinuity,
      opportunity_context: normalizedOpportunity,
    },
    probabilities: {
      structure: pStructure,
      continuity: pContinuity,
      rupture: clampScore(100 - pContinuity),
      opportunity_context: pOpportunityContext,
      adjusted_final: adjustedFinal,
    },
    warnings,
  };
}
