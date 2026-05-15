/*
 * FILE: scripts/backtest-xyvala.ts
 *
 * PARENTS
 * - lib/xyvala/rfs-core.ts
 * - lib/xyvala/opportunity-core.ts
 *
 * DIRECTIVES
 * - deterministic backtest only
 * - no future leakage inside RFS / MCI inputs
 * - no UI logic
 * - no calibration mutation
 * - no hidden prediction
 * - READ -> VALIDATE -> USE
 * - local audit variables must not leak into MCI contracts
 */

import { runRFS } from "@/lib/xyvala/rfs-core";
import {
  runMCI,
  type PatternKind,
  type PatternOccurrence,
} from "@/lib/xyvala/opportunity-core";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type BacktestPoint = {
  ts: number;
  price: number;
};

type InternalPatternOccurrence = {
  start: number;
  size: number;
  last: number;
  next: number;
  mean: number;
  kind: PatternKind;
  similarity_score: number;
  led_to_correction: boolean;
  led_to_continuation: boolean;
};

type BacktestSignal = {
  index: number;
  ts: number;
  price: number;

  regime: string;
  stability_score: number;
  opportunity_score: number;
  decision: string;

  correction_probability: number;
  continuation_probability: number;

  return_24h: number | null;
  return_48h: number | null;
  return_72h: number | null;
};

type BacktestSummary = {
  total_signals: number;

  allow_count: number;
  watch_count: number;
  block_count: number;

  avg_return_24h: number;
  avg_return_48h: number;
  avg_return_72h: number;

  allow_avg_return_24h: number;
  allow_avg_return_48h: number;
  allow_avg_return_72h: number;

  block_avg_return_24h: number;
  block_avg_return_48h: number;
  block_avg_return_72h: number;

  high_opportunity_count: number;
  high_opportunity_avg_return_24h: number;
  high_opportunity_avg_return_48h: number;
  high_opportunity_avg_return_72h: number;
};

type BuildMockSeriesInput = {
  length?: number;
  base_price?: number;
  volatility?: number;
  seed?: number;
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;

  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    values.length;

  return Math.sqrt(variance);
}

function pctChange(from: number, to: number): number {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) {
    return 0;
  }

  return ((to - from) / from) * 100;
}

function normalizePrices(values: unknown): number[] {
  if (!Array.isArray(values)) return [];

  return values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );
}

function nonNullNumbers(values: Array<number | null>): number[] {
  return values.filter((value): value is number => value !== null);
}

function isValidBacktestPoint(point: unknown): point is BacktestPoint {
  if (!point || typeof point !== "object") return false;

  const candidate = point as Partial<BacktestPoint>;

  return (
    typeof candidate.ts === "number" &&
    Number.isFinite(candidate.ts) &&
    typeof candidate.price === "number" &&
    Number.isFinite(candidate.price)
  );
}

function getFutureReturn(
  points: BacktestPoint[],
  currentIndex: number,
  forward: number,
): number | null {
  const current = points[currentIndex];
  const future = points[currentIndex + forward];

  if (!isValidBacktestPoint(current) || !isValidBacktestPoint(future)) {
    return null;
  }

  return round2(pctChange(current.price, future.price));
}

/* ============================================================================
 * 3. PATTERN HELPERS
 * ========================================================================== */

function countDirectionalStats(prices: number[]) {
  let upMoves = 0;
  let downMoves = 0;

  let currentUpStreak = 0;
  let currentDownStreak = 0;

  let maxUpStreak = 0;
  let maxDownStreak = 0;

  for (let index = 1; index < prices.length; index += 1) {
    const previous = prices[index - 1];
    const current = prices[index];

    if (
      typeof previous !== "number" ||
      typeof current !== "number" ||
      !Number.isFinite(previous) ||
      !Number.isFinite(current)
    ) {
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

function classifyBacktestPattern(inputPrices: number[]): PatternKind {
  const prices = normalizePrices(inputPrices);

  if (prices.length < 3) {
    return "MIXED";
  }

  const start = prices[0];
  const end = prices[prices.length - 1];

  if (
    typeof start !== "number" ||
    typeof end !== "number" ||
    !Number.isFinite(start) ||
    !Number.isFinite(end)
  ) {
    return "MIXED";
  }

  const stats = countDirectionalStats(prices);
  const mean = average(prices);
  const volatility = standardDeviation(prices);
  const changePct = pctChange(start, end);
  const distanceFromMean = mean > 0 ? Math.abs(pctChange(mean, end)) : 0;

  if (stats.up_streak_max >= 3 && changePct > 0) return "UP_STREAK";
  if (stats.down_streak_max >= 3 && changePct < 0) return "DOWN_STREAK";
  if (mean > 0 && volatility < mean * 0.01) return "COMPRESSION";
  if (changePct > 4 && stats.up_moves > stats.down_moves * 1.5) return "BREAKOUT";
  if (changePct < -4 && stats.down_moves > stats.up_moves * 1.5) return "BREAKDOWN";
  if (distanceFromMean < 1.5) return "MEAN_REVERTING";
  if (mean > 0 && volatility > mean * 0.04) return "CHAOTIC";

  return "MIXED";
}

/* ============================================================================
 * 4. HISTORICAL PATTERN OBSERVATION
 * ========================================================================== */

function buildInternalPatternOccurrences(
  prices: number[],
): InternalPatternOccurrence[] {
  const safePrices = normalizePrices(prices);

  if (safePrices.length < 5) {
    return [];
  }

  const occurrences: InternalPatternOccurrence[] = [];

  for (let size = 3; size <= Math.min(safePrices.length - 1, 6); size += 1) {
    for (let start = 0; start + size < safePrices.length; start += 1) {
      const window = safePrices.slice(start, start + size);
      const next = safePrices[start + size];
      const last = window[window.length - 1];

      if (
        window.length < size ||
        typeof next !== "number" ||
        typeof last !== "number" ||
        !Number.isFinite(next) ||
        !Number.isFinite(last)
      ) {
        continue;
      }

      const mean = average(window);

      if (!Number.isFinite(mean) || mean === 0) {
        continue;
      }

      const deviation = Math.abs(((last - mean) / mean) * 100);
      const similarityScore = round2(clamp(100 - deviation * 8, 0, 100));
      const ledToContinuation = next >= last;

      occurrences.push({
        start,
        size,
        last,
        next,
        mean,
        kind: classifyBacktestPattern(window),
        similarity_score: similarityScore,
        led_to_correction: !ledToContinuation,
        led_to_continuation: ledToContinuation,
      });
    }
  }

  return occurrences;
}

function buildHistoricalPatternOccurrences(
  prices: number[],
): PatternOccurrence[] {
  return buildInternalPatternOccurrences(prices).map((occurrence) => ({
    kind: occurrence.kind,
    similarity_score: occurrence.similarity_score,
    led_to_correction: occurrence.led_to_correction,
    led_to_continuation: occurrence.led_to_continuation,
  }));
}

/* ============================================================================
 * 5. SIGNAL EVALUATION
 * ========================================================================== */

function buildSignal(
  points: BacktestPoint[],
  currentIndex: number,
  historyWindow: BacktestPoint[],
): BacktestSignal | null {
  const currentPoint = points[currentIndex];

  if (!isValidBacktestPoint(currentPoint)) {
    return null;
  }

  const validHistoryWindow = historyWindow.filter(isValidBacktestPoint);

  if (validHistoryWindow.length < 5) {
    return null;
  }

  const prices = validHistoryWindow.map((point) => point.price);
  const timestamps = validHistoryWindow.map((point) => point.ts);

  if (prices.length < 5 || timestamps.length !== prices.length) {
    return null;
  }

  const rfs = runRFS({
    prices,
    timestamps,
  });

  const historicalPatterns = buildHistoricalPatternOccurrences(prices);

  const mci = runMCI({
    rfs,
    prices,
    timestamps,
    historical_patterns: historicalPatterns,
  });

  return {
    index: currentIndex,
    ts: currentPoint.ts,
    price: currentPoint.price,

    regime: rfs.regime,
    stability_score: round2(rfs.stability),
    opportunity_score: round2(mci.opportunity_score),
    decision: mci.decision,

    correction_probability: round2(mci.correction_probability),
    continuation_probability: round2(mci.continuation_probability),

    return_24h: getFutureReturn(points, currentIndex, 24),
    return_48h: getFutureReturn(points, currentIndex, 48),
    return_72h: getFutureReturn(points, currentIndex, 72),
  };
}

/* ============================================================================
 * 6. BACKTEST CORE
 * ========================================================================== */

export function backtestXyvala(points: BacktestPoint[]): BacktestSignal[] {
  const signals: BacktestSignal[] = [];

  const minHistory = 120;
  const maxLookahead = 72;

  const validPoints = points.filter(isValidBacktestPoint);

  if (validPoints.length < minHistory + maxLookahead) {
    return signals;
  }

  for (let index = minHistory; index < validPoints.length - maxLookahead; index += 1) {
    const currentPoint = validPoints[index];

    if (!isValidBacktestPoint(currentPoint)) {
      continue;
    }

    const historyWindow = validPoints.slice(0, index + 1);
    const signal = buildSignal(validPoints, index, historyWindow);

    if (!signal) {
      continue;
    }

    signals.push(signal);
  }

  return signals;
}

/* ============================================================================
 * 7. SUMMARY HELPERS
 * ========================================================================== */

export function summarizeBacktest(signals: BacktestSignal[]): BacktestSummary {
  const allowSignals = signals.filter((item) => item.decision === "ALLOW");
  const watchSignals = signals.filter((item) => item.decision === "WATCH");
  const blockSignals = signals.filter((item) => item.decision === "BLOCK");

  const highOpportunitySignals = signals.filter(
    (item) => item.opportunity_score >= 60,
  );

  return {
    total_signals: signals.length,

    allow_count: allowSignals.length,
    watch_count: watchSignals.length,
    block_count: blockSignals.length,

    avg_return_24h: round2(
      average(nonNullNumbers(signals.map((signal) => signal.return_24h))),
    ),
    avg_return_48h: round2(
      average(nonNullNumbers(signals.map((signal) => signal.return_48h))),
    ),
    avg_return_72h: round2(
      average(nonNullNumbers(signals.map((signal) => signal.return_72h))),
    ),

    allow_avg_return_24h: round2(
      average(nonNullNumbers(allowSignals.map((signal) => signal.return_24h))),
    ),
    allow_avg_return_48h: round2(
      average(nonNullNumbers(allowSignals.map((signal) => signal.return_48h))),
    ),
    allow_avg_return_72h: round2(
      average(nonNullNumbers(allowSignals.map((signal) => signal.return_72h))),
    ),

    block_avg_return_24h: round2(
      average(nonNullNumbers(blockSignals.map((signal) => signal.return_24h))),
    ),
    block_avg_return_48h: round2(
      average(nonNullNumbers(blockSignals.map((signal) => signal.return_48h))),
    ),
    block_avg_return_72h: round2(
      average(nonNullNumbers(blockSignals.map((signal) => signal.return_72h))),
    ),

    high_opportunity_count: highOpportunitySignals.length,
    high_opportunity_avg_return_24h: round2(
      average(
        nonNullNumbers(highOpportunitySignals.map((signal) => signal.return_24h)),
      ),
    ),
    high_opportunity_avg_return_48h: round2(
      average(
        nonNullNumbers(highOpportunitySignals.map((signal) => signal.return_48h)),
      ),
    ),
    high_opportunity_avg_return_72h: round2(
      average(
        nonNullNumbers(highOpportunitySignals.map((signal) => signal.return_72h)),
      ),
    ),
  };
}

/* ============================================================================
 * 8. RUNNER
 * ========================================================================== */

function buildMockSeries(input: BuildMockSeriesInput = {}): BacktestPoint[] {
  const { length = 400, base_price = 100, volatility = 0.8, seed = 1 } = input;

  if (length <= 0) {
    return [];
  }

  const points: BacktestPoint[] = [];

  const now = Date.now();
  let price = base_price;
  let rand = seed;

  function nextRand(): number {
    rand = (rand * 16807) % 2147483647;
    return rand / 2147483647;
  }

  for (let index = 0; index < length; index += 1) {
    const drift = Math.sin(index / 20) * volatility;
    const noise = (nextRand() - 0.5) * 0.3;
    const nextPrice = price + drift + noise;

    if (!Number.isFinite(nextPrice)) {
      continue;
    }

    price = Math.max(1, nextPrice);

    const ts = now + index * 60 * 60 * 1000;

    if (!Number.isFinite(ts)) {
      continue;
    }

    points.push({
      ts,
      price: round2(price),
    });
  }

  return points;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const series = buildMockSeries({
    length: 500,
    seed: 42,
  });

  if (series.length === 0) {
    console.error("Empty series");
    process.exit(1);
  }

  const signals = backtestXyvala(series);
  const summary = summarizeBacktest(signals);

  console.log(
    JSON.stringify(
      {
        ok: true,
        signal_count: signals.length,
        summary,
        sample_signals: signals.slice(-5),
      },
      null,
      2,
    ),
  );
}
