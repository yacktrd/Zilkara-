// lib/stability.ts
import { clamp } from "./utils";
import type { Regime, Timeframe } from "./types";

export function regimeFromChg24(chg24Pct: number): Regime {
  const a = Math.abs(chg24Pct);
  if (a <= 3) return "STABLE";
  if (a <= 8) return "TRANSITION";
  return "VOLATILE";
}

// Normalisations simples, robustes, testables
function normAbsPct(absPct: number, cap: number) {
  // 0 => 0, cap => 1
  return clamp(absPct / cap, 0, 1);
}
function normLog10(v: number | undefined, low: number, high: number) {
  // log10 scale -> 0..1
  if (!v || v <= 0) return 0.5; // neutral if missing
  const x = Math.log10(v);
  return clamp((x - low) / (high - low), 0, 1);
}

/**
 * Stability index (0..100) — “quality of movement”
 * Uses only what we reliably have in CoinGecko markets endpoint:
 * - chg_24h_pct
 * - market_cap
 * - volume_24h
 *
 * Timeframe adaptation (V1):
 * - 24H is real
 * - 7D/30D are “weight adaptations” to avoid breaking UI/flow.
 *   (Later: replace by candle-based engine per TF)
 */
export function computeStabilityIndex(input: {
  timeframe: Timeframe;
  chg24Pct: number;
  marketCap?: number;
  volume24h?: number;
}) {
  const absChg = Math.abs(input.chg24Pct);

  // volatility proxy: smaller abs change => more stable
  const vol = normAbsPct(absChg, 10);      // 0..1
  const invVol = 1 - vol;                  // 1..0

  // liquidity proxies (more = more stable execution conditions)
  const mc = normLog10(input.marketCap, 8, 12);     // ~1e8..1e12
  const vv = normLog10(input.volume24h, 7, 11);     // ~1e7..1e11

  // Timeframe weights (V1 adaptation)
  // 24H: balanced
  // 7D: penalize volatility a bit more, rely slightly more on liquidity
  // 30D: emphasize liquidity more (slow regime)
  const w =
    input.timeframe === "24H"
      ? { invVol: 0.60, mc: 0.25, vv: 0.15 }
      : input.timeframe === "7D"
      ? { invVol: 0.65, mc: 0.22, vv: 0.13 }
      : { invVol: 0.55, mc: 0.30, vv: 0.15 };

  const raw01 = w.invVol * invVol + w.mc * mc + w.vv * vv;
  const score = Math.round(100 * clamp(raw01, 0, 1));

  return score; // 0..100
}

/**
 * Rank score used for sorting (0..100)
 * In V1, we use stability as the primary driver.
 * You can extend later with “shock”, “breaks”, “drift”, etc.
 */
export function computeRankScore(input: {
  stabilityIndex: number;
  regime: Regime;
  timeframe: Timeframe;
}) {
  // Regime modifier: volatile regimes slightly penalized for “discipline-first” ranking
  const regimeMod =
    input.regime === "STABLE" ? 1.0 : input.regime === "TRANSITION" ? 0.90 : 0.78;

  // TF modifier: keep ranking consistent (small effects only)
  const tfMod = input.timeframe === "24H" ? 1.0 : input.timeframe === "7D" ? 0.98 : 0.96;

  const raw = input.stabilityIndex * regimeMod * tfMod;
  return clamp(Math.round(raw), 0, 100);
}
