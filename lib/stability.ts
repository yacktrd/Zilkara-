/*
 * FILE: lib/stability.ts
 *
 * ROLE
 * - compute lightweight public stability helpers
 * - keep legacy UI ranking helpers aligned with public ScanAsset usage
 *
 * DIRECTIVES
 * - public helper only
 * - no RFS recomputation
 * - no MCI recomputation
 * - no private decision exposure
 * - no opportunity logic
 * - no calibration logic
 * - deterministic output only
 * - same input => same output
 */

import { clamp } from "./utils";

import type { CalibrationRegime } from "@/lib/xyvala/calibration/calibration-contracts";

export type Timeframe = "24H" | "7D" | "30D";

export type Regime = CalibrationRegime;

/* ============================================================================
 * 1. REGIME HELPER
 * ========================================================================== */

export function regimeFromChg24(chg24Pct: number): Regime {
  const absoluteChange = Math.abs(chg24Pct);

  if (absoluteChange <= 3) {
    return "STABLE";
  }

  if (absoluteChange <= 8) {
    return "TRANSITION";
  }

  return "VOLATILE";
}

/* ============================================================================
 * 2. NORMALIZATION HELPERS
 * ========================================================================== */

function normalizeAbsolutePercent(absPct: number, cap: number): number {
  if (!Number.isFinite(absPct) || !Number.isFinite(cap) || cap <= 0) {
    return 0;
  }

  return clamp(absPct / cap, 0, 1);
}

function normalizeLog10(
  value: number | null | undefined,
  low: number,
  high: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    high <= low
  ) {
    return 0.5;
  }

  const scaled = Math.log10(value);

  return clamp((scaled - low) / (high - low), 0, 1);
}

/* ============================================================================
 * 3. STABILITY INDEX
 * ========================================================================== */

export function computeStabilityIndex(input: {
  timeframe: Timeframe;
  chg24Pct: number;
  marketCap?: number | null;
  volume24h?: number | null;
}): number {
  const absoluteChange = Math.abs(input.chg24Pct);

  const volatility = normalizeAbsolutePercent(absoluteChange, 10);
  const inverseVolatility = 1 - volatility;

  const marketCapScore = normalizeLog10(input.marketCap, 8, 12);
  const volumeScore = normalizeLog10(input.volume24h, 7, 11);

  const weights =
    input.timeframe === "24H"
      ? { inverseVolatility: 0.6, marketCap: 0.25, volume: 0.15 }
      : input.timeframe === "7D"
        ? { inverseVolatility: 0.65, marketCap: 0.22, volume: 0.13 }
        : { inverseVolatility: 0.55, marketCap: 0.3, volume: 0.15 };

  const rawScore =
    weights.inverseVolatility * inverseVolatility +
    weights.marketCap * marketCapScore +
    weights.volume * volumeScore;

  return clamp(Math.round(rawScore * 100), 0, 100);
}

/* ============================================================================
 * 4. PUBLIC RANK SCORE
 * ========================================================================== */

export function computeRankScore(input: {
  stabilityIndex: number;
  regime: Regime;
  timeframe: Timeframe;
}): number {
  const regimeModifier =
    input.regime === "STABLE" ? 1 : input.regime === "TRANSITION" ? 0.9 : 0.78;

  const timeframeModifier =
    input.timeframe === "24H" ? 1 : input.timeframe === "7D" ? 0.98 : 0.96;

  const rawScore = input.stabilityIndex * regimeModifier * timeframeModifier;

  return clamp(Math.round(rawScore), 0, 100);
}
