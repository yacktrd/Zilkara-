/* ============================================================================
 * FILE: lib/xyvala/pattern-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical pattern core
 *
 * ROLE
 * - centralize pattern classification
 * - expose pattern-derived price metrics
 * - compute pattern quality
 * - compute pattern kind similarity
 * - provide legacy pattern adapters
 *
 * DIRECTIVES
 * - pattern logic only
 * - no RFS orchestration
 * - no MCI decision logic
 * - no calibration logic
 * - no API logic
 * - no UI logic
 * - deterministic and side-effect free
 * - undefined must never be exposed
 * ========================================================================== */

export type PatternKind =
  | "UPTREND"
  | "DOWNTREND"
  | "RANGE"
  | "COMPRESSION"
  | "REVERSAL";

export type LegacyPatternKind =
  | "UP_STREAK"
  | "DOWN_STREAK"
  | "COMPRESSION"
  | "BREAKOUT"
  | "BREAKDOWN"
  | "MEAN_REVERTING"
  | "CHAOTIC"
  | "MIXED";

export type PatternMetrics = {
  mean_price: number;
  slope_pct: number;
  amplitude_pct: number;
  instability_score: number;
  break_rate: number;
  directional_bias: number;
  quality_score: number;
  reversal_detected: boolean;
  size: number;
};

/* ============================================================================
 * 1. SAFE HELPERS
 * ========================================================================== */

function clamp(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function average(values: number[]): number {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values: number[]): number {
  if (!Array.isArray(values) || values.length <= 1) return 0;
  const mean = average(values);
  return average(values.map((value) => (value - mean) ** 2));
}

function standardDeviation(values: number[]): number {
  return Math.sqrt(variance(values));
}

function pctChange(from: number, to: number): number {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) {
    return 0;
  }

  return ((to - from) / Math.abs(from)) * 100;
}

function sign(value: number): -1 | 0 | 1 {
  if (value > 0) return 1;
  if (value < 0) return -1;
  return 0;
}

function minValue(values: number[]): number {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return Math.min(...values);
}

function maxValue(values: number[]): number {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return Math.max(...values);
}

/* ============================================================================
 * 2. PRICE-DERIVED PATTERN METRICS
 * ========================================================================== */

export function buildPatternReturns(prices: number[]): number[] {
  if (!Array.isArray(prices) || prices.length < 2) return [];

  const returns: number[] = [];

  for (let index = 1; index < prices.length; index += 1) {
    const previous = prices[index - 1];
    const current = prices[index];

    if (
      typeof previous !== "number" ||
      typeof current !== "number" ||
      !Number.isFinite(previous) ||
      !Number.isFinite(current) ||
      previous === 0
    ) {
      continue;
    }

    returns.push(pctChange(previous, current));
  }

  return returns;
}

export function computePatternMeanPrice(prices: number[]): number {
  if (!Array.isArray(prices) || prices.length === 0) return 0;
  return round2(average(prices));
}

export function computePatternSlopePct(prices: number[]): number {
  if (!Array.isArray(prices) || prices.length < 2) return 0;

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

  return round2(pctChange(first, last));
}

export function computePatternAmplitudePct(prices: number[]): number {
  if (!Array.isArray(prices) || prices.length < 2) return 0;

  const low = minValue(prices);
  const high = maxValue(prices);

  if (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0) {
    return 0;
  }

  return round2(((high - low) / low) * 100);
}

export function computePatternInstabilityScore(prices: number[]): number {
  const returns = buildPatternReturns(prices);

  if (returns.length === 0) return 0;

  const volatility = standardDeviation(returns);
  const amplitude = computePatternAmplitudePct(prices);

  const volatilityScore = clamp((volatility / 12) * 100);
  const amplitudeScore = clamp((amplitude / 40) * 100);

  return round2(volatilityScore * 0.7 + amplitudeScore * 0.3);
}

export function computePatternBreakRate(prices: number[]): number {
  const returns = buildPatternReturns(prices);

  if (returns.length < 2) return 0;

  let breaks = 0;

  for (let index = 1; index < returns.length; index += 1) {
    const previous = returns[index - 1];
    const current = returns[index];

    if (
      typeof previous !== "number" ||
      typeof current !== "number" ||
      !Number.isFinite(previous) ||
      !Number.isFinite(current)
    ) {
      continue;
    }

    const signFlip =
      sign(previous) !== 0 &&
      sign(current) !== 0 &&
      sign(previous) !== sign(current);

    const shock = Math.abs(current - previous) >= 4;

    if (signFlip || shock) {
      breaks += 1;
    }
  }

  return round2(breaks / (returns.length - 1));
}

export function computePatternDirectionalBias(
  slopePct: number,
  breakRate: number,
): number {
  return round2(clamp(Math.abs(slopePct) * 2 - breakRate * 40));
}

export function detectPatternReversal(prices: number[]): boolean {
  const returns = buildPatternReturns(prices);

  if (returns.length < 4) return false;

  const mid = Math.floor(returns.length / 2);
  const firstHalf = average(returns.slice(0, mid));
  const secondHalf = average(returns.slice(mid));

  return (
    sign(firstHalf) !== 0 &&
    sign(secondHalf) !== 0 &&
    sign(firstHalf) !== sign(secondHalf)
  );
}

export function computePatternQualityFromMetrics(input: {
  slope_pct: number;
  amplitude_pct: number;
  instability_score: number;
  break_rate: number;
}): number {
  const slopeClarity = clamp(Math.abs(input.slope_pct) * 8);
  const breakPenalty = clamp(input.break_rate * 100);
  const instabilityPenalty = clamp(input.instability_score);
  const amplitudePenalty = clamp((input.amplitude_pct / 45) * 100);

  return round2(
    clamp(
      slopeClarity * 0.26 +
        (100 - breakPenalty) * 0.32 +
        (100 - instabilityPenalty) * 0.28 +
        (100 - amplitudePenalty) * 0.14,
    ),
  );
}

export function computePatternMetrics(prices: number[]): PatternMetrics {
  const safeSize = Array.isArray(prices) ? prices.length : 0;

  const slopePct = computePatternSlopePct(prices);
  const amplitudePct = computePatternAmplitudePct(prices);
  const instabilityScore = computePatternInstabilityScore(prices);
  const breakRate = computePatternBreakRate(prices);
  const directionalBias = computePatternDirectionalBias(slopePct, breakRate);
  const reversalDetected = detectPatternReversal(prices);

  const qualityScore = computePatternQualityFromMetrics({
    slope_pct: slopePct,
    amplitude_pct: amplitudePct,
    instability_score: instabilityScore,
    break_rate: breakRate,
  });

  return {
    mean_price: computePatternMeanPrice(prices),
    slope_pct: round2(slopePct),
    amplitude_pct: round2(amplitudePct),
    instability_score: round2(instabilityScore),
    break_rate: round2(breakRate),
    directional_bias: round2(directionalBias),
    quality_score: round2(qualityScore),
    reversal_detected: reversalDetected,
    size: safeSize,
  };
}

/* ============================================================================
 * 3. CANONICAL PATTERN API
 * ========================================================================== */

export function classifyPattern(prices: number[]): PatternKind {
  if (!Array.isArray(prices) || prices.length < 3) {
    return "RANGE";
  }

  const metrics = computePatternMetrics(prices);
  const absSlope = Math.abs(metrics.slope_pct);

  if (metrics.reversal_detected && metrics.amplitude_pct >= 4) {
    return "REVERSAL";
  }

  if (
    metrics.amplitude_pct <= 6 &&
    absSlope <= 2 &&
    metrics.instability_score <= 35
  ) {
    return "COMPRESSION";
  }

  if (
    absSlope <= 3 &&
    metrics.amplitude_pct <= 12 &&
    metrics.break_rate <= 0.45
  ) {
    return "RANGE";
  }

  if (metrics.slope_pct >= 3) return "UPTREND";
  if (metrics.slope_pct <= -3) return "DOWNTREND";

  return "RANGE";
}

export function computePatternQuality(prices: number[]): number {
  if (!Array.isArray(prices) || prices.length < 3) return 0;
  return computePatternMetrics(prices).quality_score;
}

export function computePatternKindSimilarity(
  a: PatternKind,
  b: PatternKind,
): number {
  if (a === b) return 100;

  const directional =
    (a === "UPTREND" || a === "DOWNTREND") &&
    (b === "UPTREND" || b === "DOWNTREND");

  const ranging =
    (a === "RANGE" || a === "COMPRESSION") &&
    (b === "RANGE" || b === "COMPRESSION");

  if (directional) return 60;
  if (ranging) return 78;

  if (
    (a === "REVERSAL" && b === "RANGE") ||
    (a === "RANGE" && b === "REVERSAL")
  ) {
    return 42;
  }

  if (
    (a === "REVERSAL" && b === "COMPRESSION") ||
    (a === "COMPRESSION" && b === "REVERSAL")
  ) {
    return 38;
  }

  return 25;
}

export function computePatternOccurrenceSimilarity(
  currentKind: PatternKind,
  historicalKind: PatternKind,
  historicalSimilarityScore: number,
): number {
  const kindSimilarity = computePatternKindSimilarity(currentKind, historicalKind);
  const historicalScore = clamp(historicalSimilarityScore);

  return round2(clamp(kindSimilarity * 0.65 + historicalScore * 0.35));
}

/* ============================================================================
 * 4. LEGACY ADAPTERS
 * ========================================================================== */

export function toLegacyPatternKind(kind: PatternKind): LegacyPatternKind {
  switch (kind) {
    case "UPTREND":
      return "UP_STREAK";
    case "DOWNTREND":
      return "DOWN_STREAK";
    case "COMPRESSION":
      return "COMPRESSION";
    case "REVERSAL":
      return "MEAN_REVERTING";
    case "RANGE":
    default:
      return "MIXED";
  }
}

export function fromLegacyPatternKind(kind: LegacyPatternKind): PatternKind {
  switch (kind) {
    case "UP_STREAK":
    case "BREAKOUT":
      return "UPTREND";
    case "DOWN_STREAK":
    case "BREAKDOWN":
      return "DOWNTREND";
    case "COMPRESSION":
      return "COMPRESSION";
    case "MEAN_REVERTING":
      return "REVERSAL";
    case "CHAOTIC":
    case "MIXED":
    default:
      return "RANGE";
  }
}
