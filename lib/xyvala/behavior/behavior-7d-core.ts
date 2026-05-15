/* ============================================================================
 * FILE: lib/xyvala/behavior/behavior-7d-core.ts
 * VERSION: v2 (Xyvala aligned)
 * ========================================================================== */

export type BehaviorType = "KANGAROO" | "PUMA" | "SERPENT";

export interface Behavior7DOutput {
  score: number; // 0 → 100 (normalisé)
  raw_score: number; // -100 → +100 (interne)
  type: BehaviorType;
}

/* ============================================================================
 * CORE METRICS
 * ========================================================================== */

function computeReturns(prices: number[]): number[] {
  const returns: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    const curr = prices[i];

    if (
      typeof prev !== "number" ||
      typeof curr !== "number" ||
      !Number.isFinite(prev) ||
      !Number.isFinite(curr) ||
      prev === 0
    ) {
      continue;
    }

    returns.push((curr - prev) / prev);
  }

  return returns;
}

function computeVolatility(returns: number[]): number {
  if (returns.length < 2) return 0;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;

  const variance =
    returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
    returns.length;

  return Math.sqrt(variance);
}

function computeTrend(prices: number[]): number {
  if (prices.length < 2) return 0;

  const first = prices[0];
  const last = prices[prices.length - 1];

  if (
    typeof first !== "number" ||
    typeof last !== "number" ||
    !Number.isFinite(first) ||
    !Number.isFinite(last) ||
    first === 0
  ) {
    return 0;
  }

  return (last - first) / first;
}

function computeAmplitude(prices: number[]): number {
  if (prices.length < 2) return 0;

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  if (min === 0) return 0;

  return (max - min) / min;
}

/* ============================================================================
 * MAIN
 * ========================================================================== */

export function computeBehavior7D(prices: number[]): Behavior7DOutput {
  if (!prices || prices.length < 5) {
    return {
      score: 50,
      raw_score: 0,
      type: "KANGAROO",
    };
  }

  const returns = computeReturns(prices);

  const volatility = computeVolatility(returns);
  const trend = computeTrend(prices);
  const amplitude = computeAmplitude(prices);

  /* ============================================================================
   * SCORE BUILD (STRUCTURED)
   * ========================================================================== */

  let rawScore = 0;

  // --- 1. TREND (direction)
  rawScore += trend * 120;

  // --- 2. VOLATILITY (instability)
  rawScore -= volatility * 80;

  // --- 3. AMPLITUDE (explosiveness)
  rawScore += amplitude * 40;

  // --- 4. NEUTRAL ZONE (range)
  if (Math.abs(trend) < 0.01) {
    rawScore *= 0.6;
  }

  // Clamp
  rawScore = Math.max(-100, Math.min(100, rawScore));

  /* ============================================================================
   * NORMALIZATION (0 → 100)
   * ========================================================================== */

  const normalizedScore = Math.round(((rawScore + 100) / 200) * 100);

  /* ============================================================================
   * TYPE CLASSIFICATION (DYNAMIC)
   * ========================================================================== */

  let type: BehaviorType = "KANGAROO";

  if (normalizedScore >= 65) {
    type = "PUMA";
  } else if (normalizedScore <= 35) {
    type = "SERPENT";
  } else {
    type = "KANGAROO";
  }

  return {
    score: normalizedScore,
    raw_score: rawScore,
    type,
  };
}
