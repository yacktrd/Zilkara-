/* ============================================================================
 * FILE: lib/xyvala/RFS-score.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala RFS structural score engine
 *
 * ROLE
 * - orchestrate deterministic RFS structural scoring
 * - transform real price / timestamp series into structural readings
 * - segment history into month / quarter / temporal windows
 * - compare current structure with historical structures
 * - expose stability, rupture, crash, 7D, 24H and coherence outputs
 *
 * DIRECTIVES
 * - RFS logic only
 * - no MCI decision logic
 * - no calibration logic
 * - no API logic
 * - no UI logic
 * - no cache logic
 * - pattern metrics must come from pattern-core.ts
 * - real data only
 * - same input => same output
 * - undefined must never be exposed
 * - invalid input must be stopped or degraded safely
 *
 * INPUTS
 * - real price series
 * - real timestamp series when available
 *
 * OUTPUTS
 * - deterministic RFS score result
 *
 * INVARIANTS
 * - stability is long-term structure
 * - mid_term_score is current quarter structure
 * - regime is short-term structural context
 * - 7D validates or degrades recent structure
 * - 24H validates timing only
 * - rupture is multi-axis
 * - crash_score measures rupture excess versus observed baseline
 * - RFS never produces final business decision
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/contracts/scan-contract.ts
 * - lib/xyvala/pattern-core.ts
 *
 * SENSITIVE ZONES
 * - input sanitation
 * - timestamp normalization
 * - historical comparison
 * - rupture scoring
 * - 7D / 24H degradation
 * ========================================================================== */

import type { RfsRegimeState } from "@/lib/xyvala/rfs/rfs-types";

import {
  classifyPattern,
  computePatternAmplitudePct,
  computePatternBreakRate,
  computePatternInstabilityScore,
  computePatternKindSimilarity,
  computePatternQuality,
  computePatternSlopePct,
  type PatternKind,
} from "@/lib/xyvala/pattern-core";

/* ============================================================================
 * 1. PUBLIC TYPES
 * ========================================================================== */

export type RfsScoreInput = {
  prices: number[];
  timestamps?: number[];
};

export type RfsHistoricalMode =
  | "INSUFFICIENT_HISTORY"
  | "MONTH_TO_MONTH"
  | "YEAR_PHASE_COMPARISON";

export type RfsTimingState = "GOOD" | "NEUTRAL" | "BAD";
export type RfsCrashState = "NONE" | "RISING" | "CRASH";

export type RfsStatus =
  | "computed"
  | "partial"
  | "insufficient_data"
  | "unavailable";

export type RfsCrashStatus =
  | "computed"
  | "baseline_missing"
  | "insufficient_data"
  | "unavailable";

export type RfsTemporalBlock = {
  price_score: number;
  change_pct: number;
  slope_pct: number;

  stability_score: number;
  rupture_score: number;
  rupture_probability: number;

  status: RfsStatus;
};

export type RfsScoreResult = {
  stability: number;
  mid_term_score: number;
  regime: RfsRegimeState;

  structure_score: number;
  market_score: number;
  confidence_score: number;
  coherence_score: number;

  occurrence_score: number;
  frequency_score: number;
  convergence_score: number;
  correlation_score: number;
  duration_score: number;

  pattern_score: number;
  pattern_frequency_score: number;

  rupture_occurrence_score: number;
  rupture_frequency_score: number;
  rupture_convergence_score: number;
  rupture_correlation_score: number;
  rupture_duration_score: number;

  rupture_probability: number;
  rupture_score: number;
  rupture_penalty_score: number;

  crash_score: number;
  crash_state: RfsCrashState;
  crash_status: RfsCrashStatus;

  continuity_probability: number;

  current_month_score: number;
  current_quarter_score: number;
  yearly_baseline_score: number;

  initial_7d: RfsTemporalBlock;
  rolling_7d: RfsTemporalBlock;

  initial_24h: RfsTemporalBlock;
  rolling_24h: RfsTemporalBlock;

  change_24h: number;
  slope_7d: number;
  timing_state: RfsTimingState;

  historical_mode: RfsHistoricalMode;
  comparison_count: number;
};

/* ============================================================================
 * 2. INTERNAL TYPES
 * ========================================================================== */

type SegmentWindow = {
  startIndex: number;
  endIndex: number;
  prices: number[];
  timestamps: number[];
  phaseIndex: 0 | 1 | 2 | 3;
  year: number;
  month: number;
};

type SegmentSignature = {
  kind: PatternKind;
  slope_pct: number;
  amplitude_pct: number;
  instability_score: number;
  break_rate: number;
  quality_score: number;
  duration_score: number;
  size: number;
};

type ComparisonResult = {
  similarity: number;
  rupture_gap: number;
  continuity_score: number;
  duration_similarity: number;
  reference_kind: PatternKind;
};

type QuarterBundle = {
  phaseIndex: 0 | 1 | 2 | 3;
  year: number;
  windows: SegmentWindow[];
};

type StructuralAxisScores = {
  occurrence_score: number;
  frequency_score: number;
  convergence_score: number;
  correlation_score: number;
  duration_score: number;
};

type RuptureAxisScores = {
  rupture_occurrence_score: number;
  rupture_frequency_score: number;
  rupture_convergence_score: number;
  rupture_correlation_score: number;
  rupture_duration_score: number;
};

type RealWindowResult = {
  prices: number[];
  timestamps: number[];
  status: RfsStatus;
};

/* ============================================================================
 * 3. CONSTANTS
 * ========================================================================== */

const MIN_PRICES = 8;
const MIN_SEGMENT_POINTS = 4;
const MIN_TEMPORAL_POINTS = 2;

const MILLIS_IN_HOUR = 3_600_000;
const MILLIS_IN_DAY = 86_400_000;
const APPROX_DAYS_IN_MONTH = 30;
const MONTHS_FOR_YEAR_PHASE_MODE = 12;

const FALLBACK_START_DATE = Date.UTC(2026, 0, 1);

const SCORE_NEUTRAL = 50;
const SCORE_LOW = 25;

/* ============================================================================
 * 4. SAFE HELPERS
 * ========================================================================== */

function clamp(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function mean(values: number[]): number {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stddev(values: number[]): number {
  if (!Array.isArray(values) || values.length < 2) return 0;

  const avg = mean(values);
  const variance = mean(values.map((value) => (value - avg) ** 2));

  return Math.sqrt(variance);
}

function safeDivide(numerator: number, denominator: number): number {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator === 0
  ) {
    return 0;
  }

  return numerator / denominator;
}

function pctChange(from: number, to: number): number {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) {
    return 0;
  }

  return ((to - from) / Math.abs(from)) * 100;
}

function lastNumber(values: number[]): number | null {
  if (!Array.isArray(values) || values.length === 0) return null;

  const value = values[values.length - 1];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function firstNumber(values: number[]): number | null {
  if (!Array.isArray(values) || values.length === 0) return null;

  const value = values[0];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeScore(value: number): number {
  return round2(clamp(value));
}

function scoreDistance(a: number, b: number): number {
  return normalizeScore(100 - Math.abs(a - b));
}

function computeStructuralScore(input: StructuralAxisScores): number {
  return normalizeScore(
    input.occurrence_score * 0.22 +
      input.frequency_score * 0.18 +
      input.convergence_score * 0.26 +
      input.correlation_score * 0.16 +
      input.duration_score * 0.18,
  );
}

/* ============================================================================
 * 5. INPUT SANITATION
 * ========================================================================== */

function buildFallbackTimestamps(length: number): number[] {
  const safeLength = Math.max(0, Math.trunc(length));

  return Array.from(
    { length: safeLength },
    (_, index) => FALLBACK_START_DATE + index * MILLIS_IN_DAY,
  );
}

function sanitizeTimestamps(
  timestamps: number[] | undefined,
  length: number,
): number[] {
  if (!Array.isArray(timestamps) || timestamps.length !== length) {
    return buildFallbackTimestamps(length);
  }

  const fallback = buildFallbackTimestamps(length);

  const safe: number[] = timestamps.map((value, index) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    return fallback[index] ?? FALLBACK_START_DATE + index * MILLIS_IN_DAY;
  });

  for (let index = 1; index < safe.length; index += 1) {
    const previous = safe[index - 1];
    const current = safe[index];

    if (
      typeof previous !== "number" ||
      typeof current !== "number" ||
      !Number.isFinite(previous) ||
      !Number.isFinite(current)
    ) {
      safe[index] = FALLBACK_START_DATE + index * MILLIS_IN_DAY;
      continue;
    }

    if (current <= previous) {
      safe[index] = previous + MILLIS_IN_DAY;
    }
  }

  return safe;
}

function sanitizeInput(input: RfsScoreInput): {
  prices: number[];
  timestamps: number[];
} {
  const rawPrices = Array.isArray(input.prices) ? input.prices : [];
  const rawTimestamps = sanitizeTimestamps(input.timestamps, rawPrices.length);

  const prices: number[] = [];
  const timestamps: number[] = [];

  for (let index = 0; index < rawPrices.length; index += 1) {
    const price = rawPrices[index];
    const timestamp = rawTimestamps[index];

    if (
      typeof price === "number" &&
      Number.isFinite(price) &&
      price > 0 &&
      typeof timestamp === "number" &&
      Number.isFinite(timestamp)
    ) {
      prices.push(price);
      timestamps.push(timestamp);
    }
  }

  if (prices.length < MIN_PRICES) {
    throw new Error(`RFS-score requires at least ${MIN_PRICES} valid prices`);
  }

  return { prices, timestamps };
}

/* ============================================================================
 * 6. TIME HELPERS
 * ========================================================================== */

function spanDaysFromTimestamps(timestamps: number[]): number {
  const first = firstNumber(timestamps);
  const last = lastNumber(timestamps);

  if (first === null || last === null) return 0;

  return Math.max(0, (last - first) / MILLIS_IN_DAY);
}

function monthSpanFromTimestamps(timestamps: number[]): number {
  return spanDaysFromTimestamps(timestamps) / APPROX_DAYS_IN_MONTH;
}

function getHistoricalMode(timestamps: number[]): RfsHistoricalMode {
  const months = monthSpanFromTimestamps(timestamps);

  if (months < 2) return "INSUFFICIENT_HISTORY";
  if (months < MONTHS_FOR_YEAR_PHASE_MODE) return "MONTH_TO_MONTH";

  return "YEAR_PHASE_COMPARISON";
}

function getQuarterIndex(timestamp: number): 0 | 1 | 2 | 3 {
  if (!Number.isFinite(timestamp)) return 0;

  const month = new Date(timestamp).getUTCMonth();
  const quarter = Math.floor(month / 3);

  if (quarter === 1) return 1;
  if (quarter === 2) return 2;
  if (quarter === 3) return 3;

  return 0;
}

function computeDurationScore(timestamps: number[]): number {
  const spanDays = spanDaysFromTimestamps(timestamps);

  if (spanDays <= 0) return 0;

  return normalizeScore((Math.min(spanDays, 120) / 120) * 100);
}

/* ============================================================================
 * 7. SEGMENTATION
 * ========================================================================== */

function chunkIndexesByMonth(
  timestamps: number[],
): Array<{
  start: number;
  end: number;
  phaseIndex: 0 | 1 | 2 | 3;
  year: number;
  month: number;
}> {
  if (!Array.isArray(timestamps) || timestamps.length === 0) {
    return [];
  }

  const chunks: Array<{
    start: number;
    end: number;
    phaseIndex: 0 | 1 | 2 | 3;
    year: number;
    month: number;
  }> = [];

  let start = 0;

  for (let index = 1; index <= timestamps.length; index += 1) {
    const previousTimestamp = timestamps[index - 1];
    const currentTimestamp = index < timestamps.length ? timestamps[index] : null;

    const previousDate =
      typeof previousTimestamp === "number" &&
      Number.isFinite(previousTimestamp)
        ? new Date(previousTimestamp)
        : null;

    const currentDate =
      typeof currentTimestamp === "number" &&
      Number.isFinite(currentTimestamp)
        ? new Date(currentTimestamp)
        : null;

    const changedMonth =
      !currentDate ||
      !previousDate ||
      currentDate.getUTCFullYear() !== previousDate.getUTCFullYear() ||
      currentDate.getUTCMonth() !== previousDate.getUTCMonth();

    if (
      changedMonth &&
      typeof previousTimestamp === "number" &&
      Number.isFinite(previousTimestamp)
    ) {
      chunks.push({
        start,
        end: index - 1,
        phaseIndex: getQuarterIndex(previousTimestamp),
        year: previousDate ? previousDate.getUTCFullYear() : 0,
        month: previousDate ? previousDate.getUTCMonth() : 0,
      });

      start = index;
    }
  }

  return chunks;
}

function toWindow(
  prices: number[],
  timestamps: number[],
  startIndex: number,
  endIndex: number,
  phaseIndex: 0 | 1 | 2 | 3,
  year: number,
  month: number,
): SegmentWindow | null {
  const slicePrices = prices.slice(startIndex, endIndex + 1);
  const sliceTimestamps = timestamps.slice(startIndex, endIndex + 1);

  if (slicePrices.length < MIN_SEGMENT_POINTS) {
    return null;
  }

  return {
    startIndex,
    endIndex,
    prices: slicePrices,
    timestamps: sliceTimestamps,
    phaseIndex,
    year,
    month,
  };
}

function buildMonthlyWindows(
  prices: number[],
  timestamps: number[],
): SegmentWindow[] {
  const chunks = chunkIndexesByMonth(timestamps);
  const windows: SegmentWindow[] = [];

  for (const chunk of chunks) {
    const window = toWindow(
      prices,
      timestamps,
      chunk.start,
      chunk.end,
      chunk.phaseIndex,
      chunk.year,
      chunk.month,
    );

    if (window) {
      windows.push(window);
    }
  }

  return windows;
}

function buildQuarterBundles(windows: SegmentWindow[]): QuarterBundle[] {
  const map = new Map<string, QuarterBundle>();

  for (const window of windows) {
    const key = `${window.year}-${window.phaseIndex}`;
    const existing = map.get(key);

    if (existing) {
      existing.windows.push(window);
    } else {
      map.set(key, {
        phaseIndex: window.phaseIndex,
        year: window.year,
        windows: [window],
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.phaseIndex - b.phaseIndex;
  });
}

function flattenQuarterBundle(bundle: QuarterBundle): SegmentWindow | null {
  if (!bundle.windows.length) return null;

  const prices = bundle.windows.flatMap((window) => window.prices);
  const timestamps = bundle.windows.flatMap((window) => window.timestamps);
  const first = bundle.windows[0];
  const last = bundle.windows[bundle.windows.length - 1];

  if (!first || !last) return null;

  return {
    startIndex: first.startIndex,
    endIndex: last.endIndex,
    prices,
    timestamps,
    phaseIndex: bundle.phaseIndex,
    year: bundle.year,
    month: last.month,
  };
}

/* ============================================================================
 * 8. SIGNATURE HELPERS
 * ========================================================================== */

function computeSegmentSignature(window: SegmentWindow): SegmentSignature {
  const slopePct = computePatternSlopePct(window.prices);
  const amplitudePct = computePatternAmplitudePct(window.prices);
  const instabilityScore = computePatternInstabilityScore(window.prices);
  const breakRate = computePatternBreakRate(window.prices);
  const qualityScore = computePatternQuality(window.prices);
  const kind = classifyPattern(window.prices);
  const durationScore = computeDurationScore(window.timestamps);

  return {
    kind,
    slope_pct: round2(slopePct),
    amplitude_pct: round2(amplitudePct),
    instability_score: round2(instabilityScore),
    break_rate: round2(breakRate),
    quality_score: round2(qualityScore),
    duration_score: round2(durationScore),
    size: window.prices.length,
  };
}

/* ============================================================================
 * 9. COMPARISON HELPERS
 * ========================================================================== */

function metricSimilarity(a: number, b: number, tolerance: number): number {
  const diff = Math.abs(a - b);

  return clamp(100 - safeDivide(diff, tolerance) * 100);
}

function computePatternSimilarity(
  current: SegmentSignature,
  reference: SegmentSignature,
): number {
  const kindScore = computePatternKindSimilarity(current.kind, reference.kind);

  const slopeScore = metricSimilarity(current.slope_pct, reference.slope_pct, 20);
  const amplitudeScore = metricSimilarity(
    current.amplitude_pct,
    reference.amplitude_pct,
    30,
  );
  const instabilityScore = metricSimilarity(
    current.instability_score,
    reference.instability_score,
    50,
  );
  const breakScore = metricSimilarity(current.break_rate, reference.break_rate, 0.6);
  const durationScore = metricSimilarity(
    current.duration_score,
    reference.duration_score,
    40,
  );

  return clamp(
    kindScore * 0.14 +
      slopeScore * 0.22 +
      amplitudeScore * 0.16 +
      instabilityScore * 0.22 +
      breakScore * 0.14 +
      durationScore * 0.12,
  );
}

function computeRuptureGap(
  current: SegmentSignature,
  reference: SegmentSignature,
  similarity: number,
): number {
  const currentFragility =
    current.instability_score * 0.38 +
    current.break_rate * 100 * 0.38 +
    (100 - current.duration_score) * 0.24;

  const referenceFragility =
    reference.instability_score * 0.38 +
    reference.break_rate * 100 * 0.38 +
    (100 - reference.duration_score) * 0.24;

  const fragilityGap = Math.max(0, currentFragility - referenceFragility);

  return clamp(fragilityGap * 0.62 + (100 - similarity) * 0.38);
}

function computeContinuityScore(
  current: SegmentSignature,
  reference: SegmentSignature,
  similarity: number,
): number {
  const currentDirection =
    current.slope_pct > 0 ? 1 : current.slope_pct < 0 ? -1 : 0;

  const referenceDirection =
    reference.slope_pct > 0 ? 1 : reference.slope_pct < 0 ? -1 : 0;

  const directionAligned =
    currentDirection !== 0 &&
    referenceDirection !== 0 &&
    currentDirection === referenceDirection
      ? 100
      : 35;

  const breakPenalty = Math.abs(current.break_rate - reference.break_rate) * 100;
  const durationSimilarity = metricSimilarity(
    current.duration_score,
    reference.duration_score,
    40,
  );

  return clamp(
    similarity * 0.54 +
      directionAligned * 0.2 +
      durationSimilarity * 0.16 +
      (100 - clamp(breakPenalty)) * 0.1,
  );
}

function compareCurrentToHistory(
  current: SegmentSignature,
  comparable: SegmentSignature[],
): ComparisonResult[] {
  return comparable.map((reference) => {
    const similarity = computePatternSimilarity(current, reference);
    const ruptureGap = computeRuptureGap(current, reference, similarity);
    const continuityScore = computeContinuityScore(
      current,
      reference,
      similarity,
    );
    const durationSimilarity = metricSimilarity(
      current.duration_score,
      reference.duration_score,
      40,
    );

    return {
      similarity: round2(similarity),
      rupture_gap: round2(ruptureGap),
      continuity_score: round2(continuityScore),
      duration_similarity: round2(durationSimilarity),
      reference_kind: reference.kind,
    };
  });
}

/* ============================================================================
 * 10. SCORE HELPERS
 * ========================================================================== */

function computeOccurrenceScore(comparisons: ComparisonResult[]): number {
  if (!Array.isArray(comparisons) || comparisons.length === 0) return 0;

  return normalizeScore((Math.min(comparisons.length, 24) / 24) * 100);
}

function computeFrequencyScore(comparisons: ComparisonResult[]): number {
  if (!Array.isArray(comparisons) || comparisons.length === 0) return 0;

  const strongOccurrences = comparisons.filter(
    (comparison) => comparison.similarity >= 70,
  ).length;

  return normalizeScore(safeDivide(strongOccurrences, comparisons.length) * 100);
}

function computeConvergenceScore(comparisons: ComparisonResult[]): number {
  if (!Array.isArray(comparisons) || comparisons.length === 0) return 0;

  return normalizeScore(
    mean(comparisons.map((comparison) => comparison.continuity_score)),
  );
}

function computeCorrelationScore(comparisons: ComparisonResult[]): number {
  if (!Array.isArray(comparisons) || comparisons.length < 2) return SCORE_NEUTRAL;

  const values = comparisons.map((comparison) => comparison.similarity);

  return normalizeScore(100 - clamp(stddev(values), 0, 100));
}

function computeDurationAxisScore(comparisons: ComparisonResult[]): number {
  if (!Array.isArray(comparisons) || comparisons.length === 0) return 0;

  return normalizeScore(
    mean(comparisons.map((comparison) => comparison.duration_similarity)),
  );
}

function computeRuptureAxes(
  comparisons: ComparisonResult[],
  currentSignature: SegmentSignature,
): RuptureAxisScores {
  if (!comparisons.length) {
    return {
      rupture_occurrence_score: SCORE_NEUTRAL,
      rupture_frequency_score: SCORE_NEUTRAL,
      rupture_convergence_score: SCORE_NEUTRAL,
      rupture_correlation_score: SCORE_NEUTRAL,
      rupture_duration_score: SCORE_NEUTRAL,
    };
  }

  const ruptureLike = comparisons.filter(
    (comparison) => comparison.rupture_gap >= 50,
  );

  const ruptureOccurrenceScore = normalizeScore(
    (Math.min(ruptureLike.length, 24) / 24) * 100,
  );

  const ruptureFrequencyScore = normalizeScore(
    safeDivide(ruptureLike.length, comparisons.length) * 100,
  );

  const ruptureConvergenceScore = normalizeScore(
    mean(comparisons.map((comparison) => comparison.rupture_gap)),
  );

  const ruptureCorrelationScore = normalizeScore(
    100 - clamp(stddev(comparisons.map((comparison) => comparison.rupture_gap))),
  );

  const ruptureDurationScore = normalizeScore(
    (100 - currentSignature.duration_score) * 0.55 +
      currentSignature.break_rate * 100 * 0.45,
  );

  return {
    rupture_occurrence_score: round2(ruptureOccurrenceScore),
    rupture_frequency_score: round2(ruptureFrequencyScore),
    rupture_convergence_score: round2(ruptureConvergenceScore),
    rupture_correlation_score: round2(ruptureCorrelationScore),
    rupture_duration_score: round2(ruptureDurationScore),
  };
}

function computeRuptureProbability(input: RuptureAxisScores): number {
  return normalizeScore(
    input.rupture_occurrence_score * 0.18 +
      input.rupture_frequency_score * 0.22 +
      input.rupture_convergence_score * 0.26 +
      input.rupture_correlation_score * 0.14 +
      input.rupture_duration_score * 0.2,
  );
}

function computeRuptureScore(probability: number): number {
  return normalizeScore(probability);
}

function computeRupturePenaltyScore(
  ruptureProbability: number,
  ruptureFrequencyScore: number,
): number {
  return normalizeScore(ruptureProbability * 0.7 + ruptureFrequencyScore * 0.3);
}

function computeContinuityProbability(input: {
  occurrence_score: number;
  frequency_score: number;
  convergence_score: number;
  correlation_score: number;
  duration_score: number;
  rupture_penalty_score: number;
}): number {
  return normalizeScore(
    input.occurrence_score * 0.18 +
      input.frequency_score * 0.16 +
      input.convergence_score * 0.24 +
      input.correlation_score * 0.16 +
      input.duration_score * 0.16 +
      (100 - input.rupture_penalty_score) * 0.1,
  );
}

/* ============================================================================
 * 11. TEMPORAL HELPERS
 * ========================================================================== */

function sliceInitialByDuration(
  prices: number[],
  timestamps: number[],
  durationMs: number,
): RealWindowResult {
  if (prices.length !== timestamps.length || prices.length < MIN_TEMPORAL_POINTS) {
    return { prices: [], timestamps: [], status: "unavailable" };
  }

  const start = firstNumber(timestamps);

  if (start === null) {
    return { prices: [], timestamps: [], status: "unavailable" };
  }

  const end = start + durationMs;
  const slicedPrices: number[] = [];
  const slicedTimestamps: number[] = [];

  for (let index = 0; index < prices.length; index += 1) {
    const price = prices[index];
    const timestamp = timestamps[index];

    if (
      typeof price === "number" &&
      typeof timestamp === "number" &&
      Number.isFinite(price) &&
      Number.isFinite(timestamp) &&
      timestamp >= start &&
      timestamp <= end
    ) {
      slicedPrices.push(price);
      slicedTimestamps.push(timestamp);
    }
  }

  if (slicedPrices.length < MIN_TEMPORAL_POINTS) {
    return { prices: slicedPrices, timestamps: slicedTimestamps, status: "insufficient_data" };
  }

  return {
    prices: slicedPrices,
    timestamps: slicedTimestamps,
    status: slicedPrices.length >= MIN_SEGMENT_POINTS ? "computed" : "partial",
  };
}

function sliceRollingByDuration(
  prices: number[],
  timestamps: number[],
  durationMs: number,
): RealWindowResult {
  if (prices.length !== timestamps.length || prices.length < MIN_TEMPORAL_POINTS) {
    return { prices: [], timestamps: [], status: "unavailable" };
  }

  const end = lastNumber(timestamps);

  if (end === null) {
    return { prices: [], timestamps: [], status: "unavailable" };
  }

  const start = end - durationMs;
  const slicedPrices: number[] = [];
  const slicedTimestamps: number[] = [];

  for (let index = 0; index < prices.length; index += 1) {
    const price = prices[index];
    const timestamp = timestamps[index];

    if (
      typeof price === "number" &&
      typeof timestamp === "number" &&
      Number.isFinite(price) &&
      Number.isFinite(timestamp) &&
      timestamp >= start &&
      timestamp <= end
    ) {
      slicedPrices.push(price);
      slicedTimestamps.push(timestamp);
    }
  }

  if (slicedPrices.length < MIN_TEMPORAL_POINTS) {
    return { prices: slicedPrices, timestamps: slicedTimestamps, status: "insufficient_data" };
  }

  return {
    prices: slicedPrices,
    timestamps: slicedTimestamps,
    status: slicedPrices.length >= MIN_SEGMENT_POINTS ? "computed" : "partial",
  };
}

function computeTemporalBlock(window: RealWindowResult): RfsTemporalBlock {
  if (window.status === "unavailable" || window.prices.length < MIN_TEMPORAL_POINTS) {
    return {
      price_score: SCORE_NEUTRAL,
      change_pct: 0,
      slope_pct: 0,
      stability_score: SCORE_NEUTRAL,
      rupture_score: SCORE_NEUTRAL,
      rupture_probability: SCORE_NEUTRAL,
      status: window.status,
    };
  }

  const first = firstNumber(window.prices);
  const last = lastNumber(window.prices);

  const changePct =
    first !== null && last !== null ? pctChange(first, last) : 0;

  const signatureWindow: SegmentWindow = {
    startIndex: 0,
    endIndex: Math.max(0, window.prices.length - 1),
    prices: window.prices,
    timestamps: window.timestamps,
    phaseIndex: 0,
    year: 0,
    month: 0,
  };

  const signature = computeSegmentSignature(signatureWindow);

  const priceScore = normalizeScore(50 + clamp(changePct, -50, 50));
  const stabilityScore = normalizeScore(
    signature.quality_score * 0.42 +
      signature.duration_score * 0.22 +
      (100 - signature.instability_score) * 0.2 +
      (100 - signature.break_rate * 100) * 0.16,
  );

  const ruptureProbability = normalizeScore(
    signature.instability_score * 0.36 +
      signature.break_rate * 100 * 0.36 +
      (100 - signature.duration_score) * 0.28,
  );

  return {
    price_score: round2(priceScore),
    change_pct: round2(changePct),
    slope_pct: round2(signature.slope_pct),
    stability_score: round2(stabilityScore),
    rupture_score: round2(ruptureProbability),
    rupture_probability: round2(ruptureProbability),
    status: window.status,
  };
}

/* ============================================================================
 * 12. CRASH / COHERENCE / REGIME
 * ========================================================================== */

function computeCrashScore(input: {
  rupture_score: number;
  historical_rupture_scores: number[];
}): { score: number; status: RfsCrashStatus; state: RfsCrashState } {
  if (!input.historical_rupture_scores.length) {
    return {
      score: SCORE_NEUTRAL,
      status: "baseline_missing",
      state: "NONE",
    };
  }

  const baseline = mean(input.historical_rupture_scores);
  const baselineDeviation = stddev(input.historical_rupture_scores);
  const excess = Math.max(0, input.rupture_score - baseline);
  const normalizedExcess = normalizeScore(
    safeDivide(excess, Math.max(baselineDeviation, 1)) * 20,
  );

  const state: RfsCrashState =
    normalizedExcess >= 75
      ? "CRASH"
      : normalizedExcess >= 45
        ? "RISING"
        : "NONE";

  return {
    score: round2(normalizedExcess),
    status: "computed",
    state,
  };
}

function resolveRegime(input: {
  stability: number;
  rupture_probability: number;
  crash_score: number;
  current_month_score: number;
  current_quarter_score: number;
  rolling_7d: RfsTemporalBlock;
  rolling_24h: RfsTemporalBlock;
}): RfsRegimeState {
  if (
    input.crash_score >= 75 ||
    input.rupture_probability >= 78 ||
    input.rolling_7d.rupture_probability >= 80
  ) {
    return "VOLATILE";
  }

  if (
    input.stability >= 70 &&
    input.rupture_probability <= 35 &&
    input.current_month_score >= 60 &&
    input.current_quarter_score >= 60 &&
    input.rolling_7d.stability_score >= 50
  ) {
    return "STABLE";
  }

  return "TRANSITION";
}

function resolveTimingState(input: {
  rolling_24h: RfsTemporalBlock;
  crash_state: RfsCrashState;
}): RfsTimingState {
  if (input.crash_state === "CRASH") return "BAD";

  if (
    input.rolling_24h.rupture_probability >= 70 ||
    input.rolling_24h.stability_score <= 35
  ) {
    return "BAD";
  }

  if (
    input.rolling_24h.stability_score >= 60 &&
    input.rolling_24h.rupture_probability <= 40
  ) {
    return "GOOD";
  }

  return "NEUTRAL";
}

function computeCoherenceScore(input: {
  stability: number;
  current_quarter_score: number;
  current_month_score: number;
  rolling_7d: RfsTemporalBlock;
  rolling_24h: RfsTemporalBlock;
  rupture_penalty_score: number;
}): number {
  const longMid = scoreDistance(input.stability, input.current_quarter_score);
  const midShort = scoreDistance(
    input.current_quarter_score,
    input.current_month_score,
  );
  const short7d = scoreDistance(
    input.current_month_score,
    input.rolling_7d.stability_score,
  );
  const short24h = scoreDistance(
    input.rolling_7d.stability_score,
    input.rolling_24h.stability_score,
  );

  return normalizeScore(
    longMid * 0.28 +
      midShort * 0.24 +
      short7d * 0.24 +
      short24h * 0.08 +
      (100 - input.rupture_penalty_score) * 0.16,
  );
}

/* ============================================================================
 * 13. FULL WINDOW
 * ========================================================================== */

function buildFullWindow(
  prices: number[],
  timestamps: number[],
): SegmentWindow {
  const firstTimestamp = firstNumber(timestamps) ?? FALLBACK_START_DATE;
  const firstDate = new Date(firstTimestamp);

  return {
    startIndex: 0,
    endIndex: Math.max(0, prices.length - 1),
    prices,
    timestamps,
    phaseIndex: getQuarterIndex(firstTimestamp),
    year: firstDate.getUTCFullYear(),
    month: firstDate.getUTCMonth(),
  };
}

function selectReferenceWindows(
  historicalMode: RfsHistoricalMode,
  windows: SegmentWindow[],
  currentWindow: SegmentWindow,
): SegmentWindow[] {
  if (windows.length <= 1) return [];

  if (historicalMode === "YEAR_PHASE_COMPARISON") {
    return windows.filter(
      (window) =>
        window.phaseIndex === currentWindow.phaseIndex &&
        window.year < currentWindow.year,
    );
  }

  return windows.slice(0, -1);
}

/* ============================================================================
 * 14. PUBLIC EXECUTION
 * ========================================================================== */

export function runRFSScore(input: RfsScoreInput): RfsScoreResult {
  const { prices, timestamps } = sanitizeInput(input);

  const historicalMode = getHistoricalMode(timestamps);
  const monthlyWindows = buildMonthlyWindows(prices, timestamps);
  const quarterBundles = buildQuarterBundles(monthlyWindows);

  const fullWindow = buildFullWindow(prices, timestamps);
  const currentWindow = monthlyWindows[monthlyWindows.length - 1] ?? fullWindow;
  const currentSignature = computeSegmentSignature(currentWindow);

  const currentQuarter = quarterBundles[quarterBundles.length - 1] ?? null;
  const currentQuarterWindow = currentQuarter
    ? flattenQuarterBundle(currentQuarter)
    : null;

  const currentQuarterScore = currentQuarterWindow
    ? computeSegmentSignature(currentQuarterWindow).quality_score
    : currentSignature.quality_score;

  const referenceWindows = selectReferenceWindows(
    historicalMode,
    monthlyWindows,
    currentWindow,
  );

  const referenceSignatures = referenceWindows.map((window) =>
    computeSegmentSignature(window),
  );

  const comparisons = compareCurrentToHistory(
    currentSignature,
    referenceSignatures,
  );

  const occurrenceScore = computeOccurrenceScore(comparisons);
  const frequencyScore = computeFrequencyScore(comparisons);
  const convergenceScore = computeConvergenceScore(comparisons);
  const correlationScore = computeCorrelationScore(comparisons);
  const durationScore = computeDurationAxisScore(comparisons);

  const structuralAxes: StructuralAxisScores = {
    occurrence_score: occurrenceScore,
    frequency_score: frequencyScore,
    convergence_score: convergenceScore,
    correlation_score: correlationScore,
    duration_score: durationScore,
  };

  const ruptureAxes = computeRuptureAxes(comparisons, currentSignature);
  const ruptureProbability = computeRuptureProbability(ruptureAxes);
  const ruptureScore = computeRuptureScore(ruptureProbability);
  const rupturePenaltyScore = computeRupturePenaltyScore(
    ruptureProbability,
    ruptureAxes.rupture_frequency_score,
  );

  const continuityProbability = computeContinuityProbability({
    ...structuralAxes,
    rupture_penalty_score: rupturePenaltyScore,
  });

  const yearlyBaselineScore =
    monthlyWindows.length > 1
      ? mean(
          monthlyWindows
            .slice(0, -1)
            .map((window) => computeSegmentSignature(window).quality_score),
        )
      : currentSignature.quality_score;

  const stability = normalizeScore(
    computeStructuralScore(structuralAxes) * 0.72 +
      (100 - rupturePenaltyScore) * 0.18 +
      yearlyBaselineScore * 0.1,
  );

  const midTermScore = normalizeScore(
    currentQuarterScore * 0.46 +
      convergenceScore * 0.22 +
      yearlyBaselineScore * 0.2 +
      (100 - rupturePenaltyScore) * 0.12,
  );

  const initial7d = computeTemporalBlock(
    sliceInitialByDuration(prices, timestamps, 7 * MILLIS_IN_DAY),
  );

  const rolling7d = computeTemporalBlock(
    sliceRollingByDuration(prices, timestamps, 7 * MILLIS_IN_DAY),
  );

  const initial24h = computeTemporalBlock(
    sliceInitialByDuration(prices, timestamps, 24 * MILLIS_IN_HOUR),
  );

  const rolling24h = computeTemporalBlock(
    sliceRollingByDuration(prices, timestamps, 24 * MILLIS_IN_HOUR),
  );

  const historicalRuptureScores = comparisons.map((comparison) =>
    normalizeScore(comparison.rupture_gap),
  );

  const crash = computeCrashScore({
    rupture_score: ruptureScore,
    historical_rupture_scores: historicalRuptureScores,
  });

  const coherenceScore = computeCoherenceScore({
    stability,
    current_quarter_score: currentQuarterScore,
    current_month_score: currentSignature.quality_score,
    rolling_7d: rolling7d,
    rolling_24h: rolling24h,
    rupture_penalty_score: rupturePenaltyScore,
  });

  const regime = resolveRegime({
    stability,
    rupture_probability: ruptureProbability,
    crash_score: crash.score,
    current_month_score: currentSignature.quality_score,
    current_quarter_score: currentQuarterScore,
    rolling_7d: rolling7d,
    rolling_24h: rolling24h,
  });

  const timingState = resolveTimingState({
    rolling_24h: rolling24h,
    crash_state: crash.state,
  });

  const structureScore = normalizeScore(
    currentSignature.quality_score * 0.34 +
      currentQuarterScore * 0.34 +
      yearlyBaselineScore * 0.18 +
      durationScore * 0.14,
  );

  const marketScore = normalizeScore(
    stability * 0.36 +
      midTermScore * 0.24 +
      coherenceScore * 0.16 +
      continuityProbability * 0.14 +
      (100 - rupturePenaltyScore) * 0.1,
  );

  const confidenceScore = normalizeScore(
    occurrenceScore * 0.2 +
      frequencyScore * 0.14 +
      convergenceScore * 0.22 +
      correlationScore * 0.16 +
      durationScore * 0.14 +
      Math.min(comparisons.length * 4, 100) * 0.14,
  );

  return {
    stability: round2(stability),
    mid_term_score: round2(midTermScore),
    regime,

    structure_score: round2(structureScore),
    market_score: round2(marketScore),
    confidence_score: round2(confidenceScore),
    coherence_score: round2(coherenceScore),

    occurrence_score: round2(occurrenceScore),
    frequency_score: round2(frequencyScore),
    convergence_score: round2(convergenceScore),
    correlation_score: round2(correlationScore),
    duration_score: round2(durationScore),

    pattern_score: round2(currentSignature.quality_score),
    pattern_frequency_score: round2(frequencyScore),

    rupture_occurrence_score: ruptureAxes.rupture_occurrence_score,
    rupture_frequency_score: ruptureAxes.rupture_frequency_score,
    rupture_convergence_score: ruptureAxes.rupture_convergence_score,
    rupture_correlation_score: ruptureAxes.rupture_correlation_score,
    rupture_duration_score: ruptureAxes.rupture_duration_score,

    rupture_probability: round2(ruptureProbability),
    rupture_score: round2(ruptureScore),
    rupture_penalty_score: round2(rupturePenaltyScore),

    crash_score: crash.score,
    crash_state: crash.state,
    crash_status: crash.status,

    continuity_probability: round2(continuityProbability),

    current_month_score: round2(currentSignature.quality_score),
    current_quarter_score: round2(currentQuarterScore),
    yearly_baseline_score: round2(yearlyBaselineScore),

    initial_7d: initial7d,
    rolling_7d: rolling7d,

    initial_24h: initial24h,
    rolling_24h: rolling24h,

    change_24h: rolling24h.change_pct,
    slope_7d: rolling7d.slope_pct,
    timing_state: timingState,

    historical_mode: historicalMode,
    comparison_count: comparisons.length,
  };
}

export const runRFS = runRFSScore;
