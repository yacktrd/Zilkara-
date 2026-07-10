/* ============================================================================
 * FILE: lib/xyvala/engine/rfs-market.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala RFS market structural reader
 *
 * ROLE
 * - perform structural market reading for Xyvala assets
 * - transform observable market series into deterministic structural outputs
 * - score market structure through OCC / CONV / DUR / FREQ / CORR
 * - compute private impulse layer from RFS structural truth
 * - expose RFS + impulse outputs for MCI without making final product decision
 *
 * PARENTS
 * - lib/xyvala/services/raw-assets-service.ts
 * - lib/xyvala/engine/mci-market.ts
 * - lib/xyvala/engine/impulse-state-core.ts
 *
 * DIRECTIVES
 * - no UI logic
 * - no route logic
 * - no snapshot shaping
 * - no public projection
 * - no product MCI decision logic
 * - no calibration persistence
 * - deterministic outputs only
 * - same canonical input => same output
 * - 24H acts as confirmation / timing only, never as primary structure driver
 * - RFS exposes OCC / CONV / DUR / FREQ / CORR explicitly
 * - impulse is computed from RFS structural outputs only
 *
 * INPUTS
 * - price
 * - chg_24h_pct
 * - chg_7d_pct
 * - sparkline_7d
 * - market_cap
 * - volume_24h
 *
 * OUTPUTS
 * - RfsMarketResult
 *
 * INVARIANTS
 * - scores remain in [0, 100]
 * - regime remains STABLE | TRANSITION | VOLATILE
 * - impulse never decides market action
 * - impulse never replaces stability, rupture or regime
 * - technical insufficiency is not market weakness
 * - 24H cannot define structure alone
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/engine/impulse-state-core.ts
 *
 * SENSITIVE ZONES
 * - sparkline interpretation
 * - OCC / CONV / DUR / FREQ / CORR scoring
 * - rupture thresholding
 * - regime classification
 * - impulse propagation
 * ========================================================================== */

import {
  computeImpulseState,
  type ImpulseDirectionalBias,
  type ImpulseStateResult,
  type ImpulseTemporalBlock,
  type ImpulseTransitionState,
} from "@/lib/xyvala/engine/impulse-state-core";

import type { ImpulseAdaptivePolicy } from "@/lib/xyvala/calibration/impulse-adaptive-thresholds";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RfsRegime = "STABLE" | "TRANSITION" | "VOLATILE";

export type RfsStatus =
  | "VALID"
  | "WEAK_STRUCTURE"
  | "INSUFFICIENT_DATA"
  | "INVALID";

export type RfsCrashState =
  | "NONE"
  | "RISING"
  | "CRASH"
  | "UNKNOWN";

export type RfsMidTermState = "FAVORABLE" | "NEUTRAL" | "UNFAVORABLE";

export type RfsConfirmationAlignment =
  | "ALIGNED"
  | "OPPOSED"
  | "NEUTRAL"
  | "UNAVAILABLE";

export type RfsImpulseStatus = "computed" | "partial" | "unavailable";

export type RfsMarketInput = {
  price: number | null;
  chg_24h_pct: number | null;
  chg_7d_pct: number | null;
  sparkline_7d: number[] | null;
  market_cap: number | null;
  volume_24h: number | null;
  adaptive_policy?: ImpulseAdaptivePolicy;
};

export type RfsMarketImpulse = ImpulseStateResult & {
  impulse_status: RfsImpulseStatus;
  impulse_context: string;
};

export type RfsMarketResult = {
  metrics: {
    pattern_count: number;
    sample_size: number;
    direction_changes: number;
    rupture_events: number;
    stable_run_length: number;
    dominant_direction_ratio: number;
    liquidity_support: number;
    confirmation_alignment: RfsConfirmationAlignment;
  };

  axes: {
    occurrence: number;
    convergence: number;
    duration: number;
    frequency: number;
    correlation: number;
  };

  scores: {
    occurrence: number;
    convergence: number;
    duration: number;
    frequency: number;
    correlation: number;
    stability: number;
    structure: number;
    rupture: number;
    crash_score: number;
    mid_term: number;
  };

  states: {
    regime: RfsRegime;
    rfs_status: RfsStatus;
    mid_term_state: RfsMidTermState;
    crash_state: RfsCrashState;
  };

  probabilities: {
    rupture_probability: number;
    continuity_probability: number;
  };

  quality: {
    confidence: number;
  };

  impulse: RfsMarketImpulse;
  warnings: string[];
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;

  const avg = mean(values);

  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) /
    values.length;

  return Math.sqrt(variance);
}

function normalizeSparkline(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;

  const points = value.filter(
    (item): item is number =>
      typeof item === "number" && Number.isFinite(item) && item > 0,
  );

  return points.length >= 5 ? points : null;
}

/* ============================================================================
 * 3. SERIES HELPERS
 * ========================================================================== */

function buildReturns(series: number[]): number[] {
  const returns: number[] = [];

  for (let index = 1; index < series.length; index += 1) {
    const prev = series[index - 1];
    const next = series[index];

    if (
      typeof prev !== "number" ||
      typeof next !== "number" ||
      !Number.isFinite(prev) ||
      !Number.isFinite(next) ||
      prev <= 0
    ) {
      continue;
    }

    returns.push(((next - prev) / prev) * 100);
  }

  return returns;
}

function computeNetMovePct(series: number[]): number {
  if (series.length < 2) return 0;

  const first = series[0];
  const last = series[series.length - 1];

  if (
    typeof first !== "number" ||
    typeof last !== "number" ||
    !Number.isFinite(first) ||
    !Number.isFinite(last) ||
    first <= 0
  ) {
    return 0;
  }

  return ((last - first) / first) * 100;
}

function computeAmplitudePct(series: number[]): number {
  if (series.length < 2) return 0;

  const min = Math.min(...series);
  const max = Math.max(...series);
  const last = series.at(-1);

  if (typeof last !== "number" || !Number.isFinite(last) || last <= 0) {
    return 0;
  }

  return ((max - min) / last) * 100;
}

function countDirectionChanges(returns: number[]): number {
  let changes = 0;

  for (let index = 1; index < returns.length; index += 1) {
    const prev = returns[index - 1];
    const next = returns[index];

    if (
      typeof prev !== "number" ||
      typeof next !== "number" ||
      !Number.isFinite(prev) ||
      !Number.isFinite(next) ||
      prev === 0 ||
      next === 0
    ) {
      continue;
    }

    if ((prev > 0 && next < 0) || (prev < 0 && next > 0)) {
      changes += 1;
    }
  }

  return changes;
}

function countRuptures(returns: number[], thresholdPct: number): number {
  return returns.filter((value) => Math.abs(value) >= thresholdPct).length;
}

function longestStableRun(returns: number[], thresholdPct: number): number {
  let best = 0;
  let current = 0;

  for (const value of returns) {
    if (Math.abs(value) < thresholdPct) {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }

  return best;
}

/* ============================================================================
 * 4. STATE HELPERS
 * ========================================================================== */

function deriveMidTermState(chg7d: number | null): RfsMidTermState {
  if (chg7d === null) return "NEUTRAL";
  if (chg7d >= 4) return "FAVORABLE";
  if (chg7d <= -4) return "UNFAVORABLE";

  return "NEUTRAL";
}

function deriveCrashState(crashScore: number): RfsCrashState {
  if (!Number.isFinite(crashScore)) return "UNKNOWN";
  if (crashScore >= 75) return "CRASH";
  if (crashScore >= 45) return "RISING";

  return "NONE";
}

function deriveStatus(input: {
  sampleSize: number;
  stability: number;
  structure: number;
}): RfsStatus {
  if (input.sampleSize < 5) {
    return "INSUFFICIENT_DATA";
  }

  if (input.structure < 40 || input.stability < 40) {
    return "WEAK_STRUCTURE";
  }

  return "VALID";
}

function deriveRegime(input: {
  stability: number;
  rupture: number;
  frequencyScore: number;
  convergenceScore: number;
}): RfsRegime {
  if (
    input.stability >= 70 &&
    input.rupture <= 30 &&
    input.frequencyScore >= 60 &&
    input.convergenceScore >= 60
  ) {
    return "STABLE";
  }

  if (
    input.stability < 40 ||
    input.rupture >= 65 ||
    input.frequencyScore < 35
  ) {
    return "VOLATILE";
  }

  return "TRANSITION";
}

/* ============================================================================
 * 5. CONTEXT HELPERS
 * ========================================================================== */

function computeConfirmationEffect(input: {
  chg24h: number | null;
  netMovePct7d: number;
}): {
  continuityBonus: number;
  rupturePenalty: number;
  alignment: RfsConfirmationAlignment;
} {
  if (input.chg24h === null) {
    return {
      continuityBonus: 0,
      rupturePenalty: 0,
      alignment: "UNAVAILABLE",
    };
  }

  const move24h = input.chg24h;
  const move7d = input.netMovePct7d;

  if (move24h === 0 || move7d === 0) {
    return {
      continuityBonus: 0,
      rupturePenalty: 0,
      alignment: "NEUTRAL",
    };
  }

  const sameDirection =
    (move7d > 0 && move24h > 0) || (move7d < 0 && move24h < 0);

  if (sameDirection) {
    return {
      continuityBonus: clampScore(Math.min(12, Math.abs(move24h) * 1.5)),
      rupturePenalty: 0,
      alignment: "ALIGNED",
    };
  }

  return {
    continuityBonus: 0,
    rupturePenalty: clampScore(Math.min(18, Math.abs(move24h) * 2)),
    alignment: "OPPOSED",
  };
}

function computeLiquiditySupport(input: {
  marketCap: number | null;
  volume24h: number | null;
}): number {
  if (
    input.marketCap === null ||
    input.volume24h === null ||
    input.marketCap <= 0
  ) {
    return 20;
  }

  return clampScore(Math.min(100, (input.volume24h / input.marketCap) * 1000));
}

/* ============================================================================
 * 6. STRUCTURAL AXES
 * ========================================================================== */

function computeOccurrenceScore(input: {
  ruptureEvents: number;
  returnsLength: number;
  stableRunLength: number;
}): number {
  if (input.returnsLength <= 0) return 0;

  const patternPresence =
    input.ruptureEvents > 0
      ? Math.min(100, (input.ruptureEvents + 1) * 12)
      : 35;

  const stablePresence = clampScore(
    (input.stableRunLength / input.returnsLength) * 100,
  );

  return clampScore(patternPresence * 0.45 + stablePresence * 0.55);
}

function computeFrequencyScore(input: {
  ruptureRatio: number;
  directionChangesRatio: number;
  avgAbsReturn: number;
}): number {
  return clampScore(
    100 -
      input.ruptureRatio * 55 -
      input.directionChangesRatio * 35 -
      input.avgAbsReturn * 6,
  );
}

function computeDurationScore(input: {
  stableRunLength: number;
  returnsLength: number;
}): number {
  if (input.returnsLength <= 0) return 0;

  return clampScore((input.stableRunLength / input.returnsLength) * 100);
}

function computeConvergenceScore(input: {
  dominantDirectionRatio: number;
  directionChangesRatio: number;
  netMovePct: number;
  confirmationAlignment: RfsConfirmationAlignment;
}): number {
  const confirmationSupport =
    input.confirmationAlignment === "ALIGNED"
      ? 100
      : input.confirmationAlignment === "NEUTRAL"
        ? 55
        : input.confirmationAlignment === "UNAVAILABLE"
          ? 40
          : 15;

  const directionSupport = clampScore(input.dominantDirectionRatio * 100);
  const contradictionPenalty = clampScore(input.directionChangesRatio * 100);
  const trendPresence = clampScore(Math.min(100, Math.abs(input.netMovePct) * 8));

  return clampScore(
    directionSupport * 0.4 +
      confirmationSupport * 0.25 +
      trendPresence * 0.2 +
      (100 - contradictionPenalty) * 0.15,
  );
}

function computeCorrelationScore(input: {
  chg24h: number | null;
  chg7d: number | null;
  netMovePct: number;
  liquiditySupport: number;
  confirmationAlignment: RfsConfirmationAlignment;
}): number {
  const confirmationSupport =
    input.confirmationAlignment === "ALIGNED"
      ? 100
      : input.confirmationAlignment === "NEUTRAL"
        ? 55
        : input.confirmationAlignment === "UNAVAILABLE"
          ? 35
          : 10;

  const has7d = input.chg7d !== null;
  const has24h = input.chg24h !== null;

  const sevenDayVsNetSupport =
    has7d && input.chg7d !== null
      ? clampScore(
          100 - Math.min(100, Math.abs(input.chg7d - input.netMovePct) * 8),
        )
      : 35;

  const twentyFourHourVs7dSupport =
    has7d && has24h && input.chg7d !== null && input.chg24h !== null
      ? (() => {
          if (input.chg7d === 0 || input.chg24h === 0) return 55;

          const sameDirection =
            (input.chg7d > 0 && input.chg24h > 0) ||
            (input.chg7d < 0 && input.chg24h < 0);

          return sameDirection ? 85 : 20;
        })()
      : 35;

  return clampScore(
    confirmationSupport * 0.3 +
      sevenDayVsNetSupport * 0.3 +
      twentyFourHourVs7dSupport * 0.2 +
      input.liquiditySupport * 0.2,
  );
}

/* ============================================================================
 * 7. IMPULSE LAYER
 * ========================================================================== */

function buildNeutralImpulse(
  status: RfsImpulseStatus,
): RfsMarketImpulse {
  return {
    impulse_compression_score: 0,
    impulse_pressure_score: 0,
    impulse_acceleration_score: 0,
    impulse_alignment_score: 0,
    impulse_instability_score: 0,
    impulse_saturation_score: 0,
    impulse_exhaustion_score: 0,

    impulse_directional_bias: "NEUTRAL",
    impulse_transition_state: "NEUTRAL",
    impulse_context: "NEUTRAL",

    impulse_status: status,
  };
}

function buildTemporalBlock(input: {
  changePct: number | null;
  slopePct: number | null;
  stabilityScore: number;
  ruptureScore: number;
  ruptureProbability: number;
}): ImpulseTemporalBlock {
  return {
    change_pct: input.changePct ?? 0,
    slope_pct: input.slopePct ?? input.changePct ?? 0,
    stability_score: input.stabilityScore,
    rupture_score: input.ruptureScore,
    rupture_probability: input.ruptureProbability,
  };
}

function deriveImpulseContext(input: {
  transitionState: ImpulseTransitionState;
  directionalBias: ImpulseDirectionalBias;
  pressureScore: number;
  instabilityScore: number;
  exhaustionScore: number;
}): string {
  if (input.transitionState === "EXHAUSTION") {
    return "EXHAUSTION";
  }

  if (input.transitionState === "PRESSURE_BUILDING") {
    return "PRESSURE_BUILDING";
  }

  if (input.transitionState === "RELEASE") {
    return "RELEASE";
  }

  if (input.instabilityScore >= 70) {
    return "UNSTABLE_IMPULSE";
  }

  if (input.pressureScore >= 65 && input.directionalBias !== "NEUTRAL") {
    return "DIRECTIONAL_PRESSURE";
  }

  if (input.exhaustionScore >= 65) {
    return "EXHAUSTION_RISK";
  }

  return "NEUTRAL";
}

function buildImpulse(input: {
  sparkline: number[];
  chg24h: number | null;
  chg7d: number | null;
  netMovePct: number;
  amplitudePct: number;
  avgAbsReturn: number;
  ruptureRatio: number;
  occurrenceScore: number;
  frequencyScore: number;
  convergenceScore: number;
  correlationScore: number;
  durationScore: number;
  stabilityScore: number;
  ruptureScore: number;
  rupturePenaltyScore: number;
  adaptivePolicy?: ImpulseAdaptivePolicy;
}): RfsMarketImpulse {
  console.log("XYVALA_POLICY_PROPAGATION", {
    adaptivePolicyPresent: input.adaptivePolicy !== undefined,
    adaptivePolicySource: input.adaptivePolicy?.source ?? null,
    adaptivePolicySampleSize: input.adaptivePolicy?.sample_size ?? null,
  });

  const impulse = computeImpulseState({
    current_signature: {
      slope_pct: input.netMovePct,
      amplitude_pct: input.amplitudePct,
      instability_score: clampScore(input.avgAbsReturn * 12),
      break_rate: Math.max(0, Math.min(1, input.ruptureRatio)),
      duration_score: input.durationScore,
    },

    occurrence_score: input.occurrenceScore,
    frequency_score: input.frequencyScore,
    convergence_score: input.convergenceScore,
    correlation_score: input.correlationScore,
    duration_score: input.durationScore,

    rupture_probability: input.ruptureScore,
    rupture_penalty_score: input.rupturePenaltyScore,

    stability: input.stabilityScore,
    coherence_score: input.convergenceScore,

    rolling_7d: buildTemporalBlock({
      changePct: input.chg7d ?? input.netMovePct,
      slopePct: input.netMovePct,
      stabilityScore: input.stabilityScore,
      ruptureScore: input.ruptureScore,
      ruptureProbability: input.ruptureScore,
    }),

    rolling_24h: buildTemporalBlock({
      changePct: input.chg24h,
      slopePct: input.chg24h,
      stabilityScore: input.stabilityScore,
      ruptureScore: input.ruptureScore,
      ruptureProbability: input.ruptureScore,
    }),

    ...(input.adaptivePolicy !== undefined
      ? {
          adaptive_policy: input.adaptivePolicy,
        }
      : {}),
  });

  console.log("[XYVALA_IMPULSE_RESULT]", {
    symbol: "UNKNOWN",
    pressure: impulse.impulse_pressure_score,
    acceleration: impulse.impulse_acceleration_score,
    alignment: impulse.impulse_alignment_score,
    instability: impulse.impulse_instability_score,
    saturation: impulse.impulse_saturation_score,
    exhaustion: impulse.impulse_exhaustion_score,
    transition: impulse.impulse_transition_state,
  });

  return {
    ...impulse,
    impulse_status: "computed",
    impulse_context: deriveImpulseContext({
      transitionState: impulse.impulse_transition_state,
      directionalBias: impulse.impulse_directional_bias,
      pressureScore: impulse.impulse_pressure_score,
      instabilityScore: impulse.impulse_instability_score,
      exhaustionScore: impulse.impulse_exhaustion_score,
    }),
  };
}

/* ============================================================================
 * 8. RESULT FACTORIES
 * ========================================================================== */

function buildInvalidResult(input: {
  chg24h: number | null;
  chg7d: number | null;
  marketCap: number | null;
  volume24h: number | null;
  reason: "rfs_invalid_price" | "rfs_insufficient_sparkline_data";
}): RfsMarketResult {
  const isInvalidPrice = input.reason === "rfs_invalid_price";

  const liquiditySupport = computeLiquiditySupport({
    marketCap: input.marketCap,
    volume24h: input.volume24h,
  });

  const status: RfsStatus = isInvalidPrice
    ? "INVALID"
    : "INSUFFICIENT_DATA";

  const fallbackMidTerm =
    input.chg7d !== null ? clampScore(50 + input.chg7d * 4) : 50;

  const fallbackStability = isInvalidPrice ? 0 : 35;
  const fallbackStructure = isInvalidPrice ? 0 : 35;
  const fallbackRupture = isInvalidPrice ? 100 : 50;
  const fallbackCrashScore = fallbackRupture;
  const fallbackCrashState = deriveCrashState(fallbackCrashScore);
  const fallbackContinuity = isInvalidPrice ? 0 : 50;
  const fallbackConfidence = isInvalidPrice ? 0 : 15;

  return {
    metrics: {
      pattern_count: 0,
      sample_size: 0,
      direction_changes: 0,
      rupture_events: 0,
      stable_run_length: 0,
      dominant_direction_ratio: 0,
      liquidity_support: isInvalidPrice ? 0 : liquiditySupport,
      confirmation_alignment:
        input.chg24h === null ? "UNAVAILABLE" : "NEUTRAL",
    },
    axes: {
      occurrence: 0,
      convergence: 0,
      duration: 0,
      frequency: 0,
      correlation: 0,
    },
    scores: {
      occurrence: 0,
      convergence: 0,
      duration: 0,
      frequency: 0,
      correlation: 0,
      stability: fallbackStability,
      structure: fallbackStructure,
      rupture: fallbackRupture,
      crash_score: fallbackCrashScore,
      mid_term: fallbackMidTerm,
    },
          states: {
      regime: "TRANSITION",
      rfs_status: status,
      mid_term_state: deriveMidTermState(input.chg7d),
      crash_state: fallbackCrashState,
    },
    probabilities: {
      rupture_probability: fallbackRupture,
      continuity_probability: fallbackContinuity,
    },
    quality: {
      confidence: fallbackConfidence,
    },
    impulse: buildNeutralImpulse(
      isInvalidPrice ? "unavailable" : "partial",
    ),
    warnings: [input.reason],
  };
}

/* ============================================================================
 * 9. PUBLIC EXECUTION
 * ========================================================================== */

export function runRfsMarket(input: RfsMarketInput): RfsMarketResult {
  const price = safeNumber(input.price);
  const chg24h = safeNumber(input.chg_24h_pct);
  const chg7d = safeNumber(input.chg_7d_pct);
  const marketCap = safeNumber(input.market_cap);
  const volume24h = safeNumber(input.volume_24h);
  const sparkline = normalizeSparkline(input.sparkline_7d);

  console.log("XYVALA_RFS_SPARKLINE_AUDIT", {
    price,
    chg24h,
    chg7d,
    raw_sparkline_type: Array.isArray(input.sparkline_7d),
    raw_sparkline_length: Array.isArray(input.sparkline_7d)
      ? input.sparkline_7d.length
      : null,
    normalized_sparkline_length: sparkline?.length ?? 0,
  });

  if (price === null) {
    return buildInvalidResult({
      chg24h,
      chg7d,
      marketCap,
      volume24h,
      reason: "rfs_invalid_price",
    });
  }

  if (!sparkline) {
    return buildInvalidResult({
      chg24h,
      chg7d,
      marketCap,
      volume24h,
      reason: "rfs_insufficient_sparkline_data",
    });
  }

  const returns = buildReturns(sparkline);
  const sampleSize = sparkline.length;
  const returnsLength = returns.length;

  const directionChanges = countDirectionChanges(returns);
  const ruptureEvents = countRuptures(returns, 2.5);
  const stableRunLength = longestStableRun(returns, 1.4);

  const avgAbsReturn = mean(returns.map((value) => Math.abs(value)));
  const volatility = stdDev(returns);

  console.log("XYVALA_RFS_SERIES_AUDIT", {
    sampleSize,
    returnsLength,
    directionChanges,
    ruptureEvents,
    stableRunLength,
    avgAbsReturn,
    volatility,
  });

  const positiveCount = returns.filter((value) => value > 0).length;
  const negativeCount = returns.filter((value) => value < 0).length;

  const dominantDirectionRatio =
    returnsLength > 0
      ? Math.max(positiveCount, negativeCount) / returnsLength
      : 0;

  const netMovePct = computeNetMovePct(sparkline);
  const amplitudePct = computeAmplitudePct(sparkline);

  const directionChangesRatio =
    returnsLength > 0 ? directionChanges / returnsLength : 1;

  const ruptureRatio =
    returnsLength > 0 ? ruptureEvents / returnsLength : 1;

  const confirmation = computeConfirmationEffect({
    chg24h,
    netMovePct7d: netMovePct,
  });

  const liquiditySupport = computeLiquiditySupport({
    marketCap,
    volume24h,
  });

  const occurrenceScore = computeOccurrenceScore({
    ruptureEvents,
    returnsLength,
    stableRunLength,
  });

  const convergenceScore = computeConvergenceScore({
    dominantDirectionRatio,
    directionChangesRatio,
    netMovePct,
    confirmationAlignment: confirmation.alignment,
  });

  const durationScore = computeDurationScore({
    stableRunLength,
    returnsLength,
  });

  const frequencyScore = computeFrequencyScore({
    ruptureRatio,
    directionChangesRatio,
    avgAbsReturn,
  });

  const correlationScore = computeCorrelationScore({
    chg24h,
    chg7d,
    netMovePct,
    liquiditySupport,
    confirmationAlignment: confirmation.alignment,
  });

  const structureScore = clampScore(
    occurrenceScore * 0.18 +
      convergenceScore * 0.24 +
      durationScore * 0.2 +
      frequencyScore * 0.22 +
      correlationScore * 0.16,
  );

  const ruptureScore = clampScore(
    ruptureRatio * 55 +
      directionChangesRatio * 20 +
      avgAbsReturn * 6 +
      volatility * 8 +
      confirmation.rupturePenalty,
  );

  const crashScore = clampScore(ruptureScore);
  const crashState = deriveCrashState(crashScore);

  const stabilityScore = clampScore(
    occurrenceScore * 0.18 +
      convergenceScore * 0.24 +
      durationScore * 0.22 +
      frequencyScore * 0.2 +
      correlationScore * 0.16 +
      confirmation.continuityBonus,
  );

  const midTermScore = clampScore(50 + netMovePct * 4);

  const confidenceScore = clampScore(
    stabilityScore * 0.25 +
      structureScore * 0.2 +
      correlationScore * 0.15 +
      durationScore * 0.15 +
      liquiditySupport * 0.1 +
      (100 - ruptureScore) * 0.15,
  );

  const regime = deriveRegime({
    stability: stabilityScore,
    rupture: ruptureScore,
    frequencyScore,
    convergenceScore,
  });

  const status = deriveStatus({
    sampleSize,
    stability: stabilityScore,
    structure: structureScore,
  });

  const impulse = buildImpulse({
    sparkline,
    chg24h,
    chg7d,
    netMovePct,
    amplitudePct,
    avgAbsReturn,
    ruptureRatio,
    occurrenceScore,
    frequencyScore,
    convergenceScore,
    correlationScore,
    durationScore,
    stabilityScore,
    ruptureScore,
    rupturePenaltyScore: confirmation.rupturePenalty,

    ...(input.adaptive_policy !== undefined
      ? {
          adaptivePolicy: input.adaptive_policy,
        }
      : {}),
  });

  const warnings: string[] = [];

  if (status === "WEAK_STRUCTURE") {
    warnings.push("rfs_weak_structure");
  }

  if (confirmation.alignment === "OPPOSED") {
    warnings.push("rfs_24h_confirmation_opposed");
  }

  return {
    metrics: {
      pattern_count: Math.max(1, ruptureEvents > 0 ? ruptureEvents + 1 : 1),
      sample_size: sampleSize,
      direction_changes: directionChanges,
      rupture_events: ruptureEvents,
      stable_run_length: stableRunLength,
      dominant_direction_ratio: clampScore(dominantDirectionRatio * 100),
      liquidity_support: liquiditySupport,
      confirmation_alignment: confirmation.alignment,
    },
    axes: {
      occurrence: occurrenceScore,
      convergence: convergenceScore,
      duration: durationScore,
      frequency: frequencyScore,
      correlation: correlationScore,
    },
    scores: {
      occurrence: occurrenceScore,
      convergence: convergenceScore,
      duration: durationScore,
      frequency: frequencyScore,
      correlation: correlationScore,
      stability: stabilityScore,
      structure: structureScore,
      rupture: ruptureScore,
      crash_score: crashScore,
      mid_term: midTermScore,
    },
    states: {
      regime,
      rfs_status: status,
      mid_term_state: deriveMidTermState(chg7d),
      crash_state: crashState,
    },
    probabilities: {
      rupture_probability: ruptureScore,
      continuity_probability: clampScore(
        100 - ruptureScore + confirmation.continuityBonus,
      ),
    },
    quality: {
      confidence: confidenceScore,
    },
    impulse,
    warnings,
  };
}
