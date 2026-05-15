/* ============================================================================
 * FILE: lib/xyvala/engine/recovery-analysis-core.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - compute structured recovery analysis above the stable RFS core
 * - evaluate reconstruction capacity after weakness, compression or rupture
 * - expose recovery probability without replacing structure
 *
 * PARENTS
 * - lib/xyvala/engine/rfs-market.ts
 * - lib/xyvala/engine/temporal-analysis-core.ts
 * - lib/xyvala/engine/rupture-analysis-core.ts
 * - lib/xyvala/engine/mci-market.ts
 * ========================================================================== */

import type { RfsMarketResult } from "@/lib/xyvala/engine/rfs-market";
import type {
  TemporalAnalysisResult,
  TemporalLiveSupport,
} from "@/lib/xyvala/engine/temporal-analysis-core";
import type { RuptureAnalysisResult } from "@/lib/xyvala/engine/rupture-analysis-core";

export type RecoveryObservableProbability = {
  raw_score: number;
  calibrated_score: number;
  probability: number;
  target_event: string;
};

export type RecoveryAnalysisResult = {
  recovery: RecoveryObservableProbability;
  diagnostics: {
    restart_support: number;
    anti_rupture_pressure: number;
    reconstruction_quality: number;
  };
  warnings: string[];
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [...new Set(merged.filter((item): item is string => Boolean(item?.trim())))];
}

export function runRecoveryAnalysis(input: {
  rfs: RfsMarketResult;
  temporal: TemporalAnalysisResult;
  rupture: RuptureAnalysisResult;
  liveSupport?: TemporalLiveSupport | null;
}): RecoveryAnalysisResult {
  const { rfs, temporal, rupture, liveSupport = null } = input;

  const restartSupport = clampScore(
    temporal.axes.growth.probability * 0.35 +
      temporal.axes.convergence.probability * 0.25 +
      temporal.axes.frequency.probability * 0.12 +
      temporal.axes.evolution.probability * 0.18 +
      (liveSupport?.temporal_growth_hint ?? 50) * 0.1,
  );

  const antiRupturePressure = clampScore(
    100 - rupture.risk_rupture_score.probability,
  );

  const reconstructionQuality = clampScore(
    restartSupport * 0.45 +
      antiRupturePressure * 0.25 +
      temporal.aggregate.temporal_coherence * 0.15 +
      rfs.scores.stability * 0.15,
  );

  const raw = clampScore(
    restartSupport * 0.42 +
      antiRupturePressure * 0.28 +
      reconstructionQuality * 0.2 +
      temporal.aggregate.temporal_support_probability * 0.1,
  );

  const calibrated = clampScore(raw * 0.97 + 1.5);
  const probability = clampScore(calibrated);

  const warnings: string[] = [];

  if (probability >= 70) {
    warnings.push("recovery_analysis_high_probability");
  }

  if (rupture.risk_rupture_score.probability >= 70 && probability >= 60) {
    warnings.push("recovery_analysis_conflict_with_rupture");
  }

  return {
    recovery: {
      raw_score: raw,
      calibrated_score: calibrated,
      probability,
      target_event: "reconstruction_becomes_exploitable",
    },
    diagnostics: {
      restart_support: restartSupport,
      anti_rupture_pressure: antiRupturePressure,
      reconstruction_quality: reconstructionQuality,
    },
    warnings: uniqueWarnings(temporal.warnings, rupture.warnings, warnings),
  };
}
