/* ============================================================================
 * FILE: lib/xyvala/opportunity-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private MCI opportunity core
 *
 * ROLE
 * - evaluate pattern occurrences after RFS
 * - measure private convergence, correction and continuation probabilities
 * - produce private MCI decision output only
 *
 * DIRECTIVES
 * - private analytical core only
 * - no public ScanAsset dependency
 * - no RFS recomputation
 * - no calibration logic
 * - no API logic
 * - no UI logic
 * - no public exposure
 * - deterministic output only
 * - same input => same output
 * - no unsafe array access
 * - no legacy rupture_detected dependency
 * ========================================================================== */

import type { RfsResult } from "@/lib/xyvala/rfs-core";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type MciDecision = "ALLOW" | "WATCH" | "BLOCK";

export type PatternKind =
  | "UP_STREAK"
  | "DOWN_STREAK"
  | "COMPRESSION"
  | "BREAKOUT"
  | "BREAKDOWN"
  | "MEAN_REVERTING"
  | "CHAOTIC"
  | "MIXED";

export type PatternOccurrence = {
  kind: PatternKind;
  similarity_score: number;
  led_to_correction: boolean;
  led_to_continuation: boolean;
};

export type MciInput = {
  rfs: RfsResult;
  prices: number[];
  timestamps?: number[];
  historical_patterns?: PatternOccurrence[];
};

export type MciResult = {
  pattern_kind: PatternKind;

  pattern_occurrence_count: number;
  comparable_occurrence_count: number;

  pattern_similarity_score: number;
  convergence_score: number;

  correction_probability: number;
  continuation_probability: number;

  opportunity_score: number;
  decision: MciDecision;

  reason: string;
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizePrices(values: number[]): number[] {
  return values.filter((value) => isFiniteNumber(value) && value > 0);
}

function firstNumber(values: readonly number[]): number | null {
  const value = values.at(0);
  return isFiniteNumber(value) ? value : null;
}

function lastNumber(values: readonly number[]): number | null {
  const value = values.at(-1);
  return isFiniteNumber(value) ? value : null;
}

function clamp(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: readonly number[]): number {
  if (values.length <= 1) return 0;

  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    values.length;

  return Math.sqrt(variance);
}

function pctChange(from: number | null, to: number | null): number {
  if (
    from === null ||
    to === null ||
    !Number.isFinite(from) ||
    !Number.isFinite(to) ||
    from === 0
  ) {
    return 0;
  }

  return ((to - from) / from) * 100;
}

function isRuptureDetected(rfs: RfsResult): boolean {
  return rfs.rupture_probability >= 60 || rfs.rupture_score >= 60;
}

/* ============================================================================
 * 3. PATTERN HELPERS
 * ========================================================================== */

function countDirectionalStats(prices: readonly number[]) {
  let upMoves = 0;
  let downMoves = 0;

  let currentUpStreak = 0;
  let currentDownStreak = 0;

  let maxUpStreak = 0;
  let maxDownStreak = 0;

  for (let index = 1; index < prices.length; index += 1) {
    const previous = prices[index - 1];
    const current = prices[index];

    if (!isFiniteNumber(previous) || !isFiniteNumber(current)) {
      currentUpStreak = 0;
      currentDownStreak = 0;
      continue;
    }

    if (current > previous) {
      upMoves += 1;
      currentUpStreak += 1;
      currentDownStreak = 0;
    } else if (current < previous) {
      downMoves += 1;
      currentDownStreak += 1;
      currentUpStreak = 0;
    } else {
      currentUpStreak = 0;
      currentDownStreak = 0;
    }

    maxUpStreak = Math.max(maxUpStreak, currentUpStreak);
    maxDownStreak = Math.max(maxDownStreak, currentDownStreak);
  }

  return {
    up_moves: upMoves,
    down_moves: downMoves,
    up_streak_max: maxUpStreak,
    down_streak_max: maxDownStreak,
  };
}

function classifyPattern(prices: readonly number[]): PatternKind {
  if (prices.length < 3) {
    return "MIXED";
  }

  const stats = countDirectionalStats(prices);
  const volatility = standardDeviation(prices);
  const mean = average(prices);
  const start = firstNumber(prices);
  const end = lastNumber(prices);
  const change = pctChange(start, end);

  if (stats.up_streak_max >= 3 && change > 0) {
    return "UP_STREAK";
  }

  if (stats.down_streak_max >= 3 && change < 0) {
    return "DOWN_STREAK";
  }

  if (mean > 0 && volatility < mean * 0.01) {
    return "COMPRESSION";
  }

  if (change > 4 && stats.up_moves > stats.down_moves * 1.5) {
    return "BREAKOUT";
  }

  if (change < -4 && stats.down_moves > stats.up_moves * 1.5) {
    return "BREAKDOWN";
  }

  if (Math.abs(pctChange(mean, end)) < 1.5) {
    return "MEAN_REVERTING";
  }

  if (mean > 0 && volatility > mean * 0.04) {
    return "CHAOTIC";
  }

  return "MIXED";
}

function computeCurrentPatternSimilarity(prices: readonly number[]): number {
  if (prices.length < 3) {
    return 0;
  }

  const stats = countDirectionalStats(prices);
  const volatility = standardDeviation(prices);
  const mean = average(prices);

  const moveCount = stats.up_moves + stats.down_moves;

  const directionalBalance =
    moveCount > 0 ? Math.abs(stats.up_moves - stats.down_moves) / moveCount : 0;

  const normalizedVolatility =
    mean > 0 ? clamp((volatility / mean) * 100, 0, 100) : 0;

  const streakStrength = clamp(
    Math.max(stats.up_streak_max, stats.down_streak_max) * 12,
    0,
    100,
  );

  return round2(
    clamp(
      streakStrength * 0.45 +
        (100 - normalizedVolatility) * 0.25 +
        directionalBalance * 100 * 0.3,
      0,
      100,
    ),
  );
}

/* ============================================================================
 * 4. HISTORICAL COMPARISON HELPERS
 * ========================================================================== */

function comparableOccurrences(
  patternKind: PatternKind,
  occurrences: PatternOccurrence[],
): PatternOccurrence[] {
  return occurrences.filter((item) => item.kind === patternKind);
}

function correctionRate(occurrences: PatternOccurrence[]): number {
  if (occurrences.length === 0) return 0;

  const correctionCount = occurrences.filter(
    (item) => item.led_to_correction,
  ).length;

  return round2((correctionCount / occurrences.length) * 100);
}

function continuationRate(occurrences: PatternOccurrence[]): number {
  if (occurrences.length === 0) return 0;

  const continuationCount = occurrences.filter(
    (item) => item.led_to_continuation,
  ).length;

  return round2((continuationCount / occurrences.length) * 100);
}

function averageHistoricalSimilarity(occurrences: PatternOccurrence[]): number {
  if (occurrences.length === 0) return 0;

  return round2(
    average(occurrences.map((item) => clamp(item.similarity_score, 0, 100))),
  );
}

/* ============================================================================
 * 5. CONVERGENCE HELPERS
 * ========================================================================== */

function computeConvergenceScore(input: {
  rfs: RfsResult;
  pattern_kind: PatternKind;
  prices: readonly number[];
}): number {
  const latest = lastNumber(input.prices);
  const mean = average(input.prices);
  const currentDistance = mean > 0 ? Math.abs(pctChange(mean, latest)) : 0;

  const ruptureDetected = isRuptureDetected(input.rfs);

  let score = 0;

  if (ruptureDetected) {
    score += 30;
  }

  if (input.rfs.stability >= 60) {
    score += 20;
  } else if (input.rfs.stability >= 45) {
    score += 10;
  }

  if (input.rfs.regime === "STABLE") {
    score += 20;
  } else if (input.rfs.regime === "TRANSITION") {
    score += 12;
  }

  if (input.pattern_kind !== "CHAOTIC") {
    score += 10;
  }

  if (currentDistance <= 4) {
    score += 20;
  } else if (currentDistance <= 8) {
    score += 10;
  }

  return round2(clamp(score, 0, 100));
}

/* ============================================================================
 * 6. MCI CORE
 * ========================================================================== */

export function runMCI(input: MciInput): MciResult {
  const prices = sanitizePrices(input.prices);
  const rfs = input.rfs;
  const historical = input.historical_patterns ?? [];

  if (prices.length < 3) {
    return {
      pattern_kind: "MIXED",

      pattern_occurrence_count: historical.length,
      comparable_occurrence_count: 0,

      pattern_similarity_score: 0,
      convergence_score: 0,

      correction_probability: 0,
      continuation_probability: 0,

      opportunity_score: 0,
      decision: "BLOCK",

      reason: "insufficient_prices",
    };
  }

  const patternKind = classifyPattern(prices);
  const patternSimilarityScore = computeCurrentPatternSimilarity(prices);

  const comparable = comparableOccurrences(patternKind, historical);

  const patternOccurrenceCount = historical.length;
  const comparableOccurrenceCount = comparable.length;

  const historicalCorrectionRate = correctionRate(comparable);
  const historicalContinuationRate = continuationRate(comparable);
  const historicalSimilarity = averageHistoricalSimilarity(comparable);

  const convergenceScore = computeConvergenceScore({
    rfs,
    pattern_kind: patternKind,
    prices,
  });

  const correctionProbability = round2(
    clamp(
      historicalCorrectionRate * 0.45 +
        convergenceScore * 0.3 +
        rfs.rupture_probability * 0.15 +
        historicalSimilarity * 0.1,
      0,
      100,
    ),
  );

  const continuationProbability = round2(
    clamp(
      historicalContinuationRate * 0.45 +
        rfs.continuity_probability * 0.35 +
        patternSimilarityScore * 0.2,
      0,
      100,
    ),
  );

  const opportunityScore = round2(
    clamp(
      correctionProbability * 0.55 +
        convergenceScore * 0.25 +
        rfs.stability * 0.2,
      0,
      100,
    ),
  );

  const ruptureDetected = isRuptureDetected(rfs);

  let decision: MciDecision = "BLOCK";

  if (
    ruptureDetected &&
    correctionProbability >= 60 &&
    convergenceScore >= 55 &&
    rfs.stability >= 55
  ) {
    decision = "ALLOW";
  } else if (
    (ruptureDetected && correctionProbability >= 40) ||
    opportunityScore >= 45
  ) {
    decision = "WATCH";
  }

  return {
    pattern_kind: patternKind,

    pattern_occurrence_count: patternOccurrenceCount,
    comparable_occurrence_count: comparableOccurrenceCount,

    pattern_similarity_score: patternSimilarityScore,
    convergence_score: convergenceScore,

    correction_probability: correctionProbability,
    continuation_probability: continuationProbability,

    opportunity_score: opportunityScore,
    decision,

    reason:
      `pattern=${patternKind}` +
      ` occ=${comparableOccurrenceCount}` +
      ` conv=${convergenceScore}` +
      ` corr=${correctionProbability}` +
      ` cont=${continuationProbability}`,
  };
}
