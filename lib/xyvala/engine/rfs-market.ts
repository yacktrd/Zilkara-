/* ============================================================================
 * FILE: lib/xyvala/engine/rfs-market.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - perform structural market reading for Xyvala assets
 * - transform raw market series into deterministic structural outputs
 * - score market structure explicitly through OCC / CONV / DUR / FREQ / CORR
 * - classify regime, stability and rupture without making final product decision
 *
 * PARENTS
 * - lib/xyvala/services/raw-assets-service.ts
 * - lib/xyvala/engine/mci-market.ts
 *
 * DIRECTIVES
 * - no UI logic here
 * - no route logic here
 * - no snapshot shaping here
 * - no product MCI decision logic here
 * - deterministic outputs only
 * - same canonical input => same output
 * - 24H acts as confirmation only, never as primary structure driver
 * - RFS must expose OCC / CONV / DUR / FREQ / CORR explicitly
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
 * - technical insufficiency must not be confused with market weakness
 * - 24H cannot define structure alone
 *
 * CRITICAL DEPENDENCIES
 * - none
 *
 * SENSITIVE ZONES
 * - sparkline interpretation
 * - OCC / CONV / DUR / FREQ / CORR scoring
 * - rupture thresholding
 * - regime classification
 * - 24H confirmation effect
 * ========================================================================== */

export type RfsRegime = "STABLE" | "TRANSITION" | "VOLATILE";

export type RfsStatus =
  | "VALID"
  | "WEAK_STRUCTURE"
  | "INSUFFICIENT_DATA"
  | "INVALID";

export type RfsMidTermState = "FAVORABLE" | "NEUTRAL" | "UNFAVORABLE";

export type RfsConfirmationAlignment =
  | "ALIGNED"
  | "OPPOSED"
  | "NEUTRAL"
  | "UNAVAILABLE";

export type RfsMarketInput = {
  price: number | null;
  chg_24h_pct: number | null;
  chg_7d_pct: number | null;
  sparkline_7d: number[] | null;
  market_cap: number | null;
  volume_24h: number | null;
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
    mid_term: number;
  };
  states: {
    regime: RfsRegime;
    rfs_status: RfsStatus;
    mid_term_state: RfsMidTermState;
  };
  probabilities: {
    rupture_probability: number;
    continuity_probability: number;
  };
  quality: {
    confidence: number;
  };
  warnings: string[];
};

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
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function normalizeSparkline(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;

  const points = value.filter(
    (item): item is number =>
      typeof item === "number" && Number.isFinite(item),
  );

  return points.length >= 5 ? points : null;
}

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
      prev === 0
    ) {
      continue;
    }

    returns.push(((next - prev) / Math.abs(prev)) * 100);
  }

  return returns;
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

function deriveMidTermState(chg7d: number | null): RfsMidTermState {
  if (chg7d === null) return "NEUTRAL";
  if (chg7d >= 4) return "FAVORABLE";
  if (chg7d <= -4) return "UNFAVORABLE";
  return "NEUTRAL";
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

  const support7dVsNet =
    has7d && input.chg7d !== null
      ? clampScore(100 - Math.min(100, Math.abs(input.chg7d - input.netMovePct) * 8))
      : 35;

  const support24hVs7d =
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
      support7dVsNet * 0.3 +
      support24hVs7d * 0.2 +
      input.liquiditySupport * 0.2,
  );
}

export function runRfsMarket(input: RfsMarketInput): RfsMarketResult {
  const price = safeNumber(input.price);
  const chg24h = safeNumber(input.chg_24h_pct);
  const chg7d = safeNumber(input.chg_7d_pct);
  const sparkline = normalizeSparkline(input.sparkline_7d);

  if (price === null) {
    return {
      metrics: {
        pattern_count: 0,
        sample_size: 0,
        direction_changes: 0,
        rupture_events: 0,
        stable_run_length: 0,
        dominant_direction_ratio: 0,
        liquidity_support: 0,
        confirmation_alignment: "UNAVAILABLE",
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
        stability: 0,
        structure: 0,
        rupture: 100,
        mid_term: 0,
      },
      states: {
        regime: "TRANSITION",
        rfs_status: "INVALID",
        mid_term_state: "NEUTRAL",
      },
      probabilities: {
        rupture_probability: 100,
        continuity_probability: 0,
      },
      quality: {
        confidence: 0,
      },
      warnings: ["rfs_invalid_price"],
    };
  }

  if (!sparkline) {
    return {
      metrics: {
        pattern_count: 0,
        sample_size: 0,
        direction_changes: 0,
        rupture_events: 0,
        stable_run_length: 0,
        dominant_direction_ratio: 0,
        liquidity_support: computeLiquiditySupport({
          marketCap: safeNumber(input.market_cap),
          volume24h: safeNumber(input.volume_24h),
        }),
        confirmation_alignment: chg24h === null ? "UNAVAILABLE" : "NEUTRAL",
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
        stability: 0,
        structure: 0,
        rupture: 100,
        mid_term: chg7d !== null ? clampScore(50 + chg7d * 4) : 0,
      },
      states: {
        regime: "TRANSITION",
        rfs_status: "INSUFFICIENT_DATA",
        mid_term_state: deriveMidTermState(chg7d),
      },
      probabilities: {
        rupture_probability: 100,
        continuity_probability: 0,
      },
      quality: {
        confidence: 15,
      },
      warnings: ["rfs_insufficient_sparkline_data"],
    };
  }

  const returns = buildReturns(sparkline);
  const sampleSize = sparkline.length;
  const returnsLength = returns.length;

  const directionChanges = countDirectionChanges(returns);
  const ruptureEvents = countRuptures(returns, 2.5);
  const stableRunLength = longestStableRun(returns, 1.4);

  const avgAbsReturn = mean(returns.map((value) => Math.abs(value)));
  const volatility = stdDev(returns);

  const positiveCount = returns.filter((value) => value > 0).length;
  const negativeCount = returns.filter((value) => value < 0).length;
  const dominantDirectionRatio =
    returnsLength > 0
      ? Math.max(positiveCount, negativeCount) / returnsLength
      : 0;

  const firstSparklinePoint = sparkline[0];
const lastSparklinePoint = sparkline[sparkline.length - 1];

const netMovePct =
  typeof firstSparklinePoint === "number" &&
  typeof lastSparklinePoint === "number" &&
  Number.isFinite(firstSparklinePoint) &&
  Number.isFinite(lastSparklinePoint) &&
  firstSparklinePoint !== 0
    ? ((lastSparklinePoint - firstSparklinePoint) /
        Math.abs(firstSparklinePoint)) *
      100
    : 0;

  const directionChangesRatio =
    returnsLength > 0 ? directionChanges / returnsLength : 1;

  const ruptureRatio = returnsLength > 0 ? ruptureEvents / returnsLength : 1;

  const confirmation = computeConfirmationEffect({
    chg24h,
    netMovePct7d: netMovePct,
  });

  const liquiditySupport = computeLiquiditySupport({
    marketCap: safeNumber(input.market_cap),
    volume24h: safeNumber(input.volume_24h),
  });

  // OCC / CONV / DUR / FREQ / CORR
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
      mid_term: midTermScore,
    },
    states: {
      regime,
      rfs_status: status,
      mid_term_state: deriveMidTermState(chg7d),
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
    warnings,
  };
}
