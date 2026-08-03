/* ============================================================================
 * FILE: lib/xyvala/engine/rfs-market.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical RFS market structural reader
 *
 * ROLE
 * - perform deterministic structural market reading for Xyvala assets
 * - transform observable market series into canonical RFS structural outputs
 * - score market structure through OCC / CONV / DUR / FREQ / CORR
 * - expose the canonical structural signature required by downstream engines
 * - remain the unique source of RFS market truth
 *
 * PARENTS
 * - lib/xyvala/services/raw-assets-service.ts
 * - canonical private analytical orchestrator
 *
 * CONSUMERS
 * - Triple Layer
 * - Impulse Layer
 * - Analytical Aggregation System
 * - MCI
 * - private snapshot builders
 * - private traceability adapters
 *
 * DIRECTIVES
 * - private analytical engine only
 * - COMPUTE only
 * - no UI logic
 * - no route logic
 * - no API logic
 * - no snapshot shaping
 * - no public projection
 * - no Triple Layer computation
 * - no Impulse Layer computation
 * - no MCI decision logic
 * - no calibration logic
 * - no calibration persistence
 * - no cache logic
 * - no persistence
 * - no mutation
 * - no console logging
 * - no public wording
 * - no prediction
 * - no investment advice
 * - no buy / sell / hold semantics
 * - deterministic outputs only
 * - same canonical input => same canonical output
 * - 24H acts as confirmation / timing only
 * - 24H never becomes the primary structure driver
 * - RFS exposes OCC / CONV / DUR / FREQ / CORR explicitly
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
 * - finite scores are rounded to two decimals
 * - regime remains STABLE | TRANSITION | VOLATILE
 * - RFS never decides market action
 * - RFS never computes Triple Layer truth
 * - RFS never computes Impulse truth
 * - RFS never computes MCI truth
 * - technical insufficiency is explicitly qualified by rfs_status
 * - 24H cannot define structure alone
 *
 * CRITICAL DEPENDENCIES
 * - none
 *
 * SENSITIVE ZONES
 * - sparkline sanitation
 * - structural signature construction
 * - OCC / CONV / DUR / FREQ / CORR scoring
 * - rupture thresholding
 * - regime classification
 * - insufficient and invalid result factories
 * ========================================================================== */

/* ============================================================================
 * 1. CANONICAL TYPES
 * ========================================================================== */

export type RfsRegime =
  | "STABLE"
  | "TRANSITION"
  | "VOLATILE";

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

export type RfsMidTermState =
  | "FAVORABLE"
  | "NEUTRAL"
  | "UNFAVORABLE";

export type RfsConfirmationAlignment =
  | "ALIGNED"
  | "OPPOSED"
  | "NEUTRAL"
  | "UNAVAILABLE";

export type RfsWarning =
  | "rfs_invalid_price"
  | "rfs_insufficient_sparkline_data"
  | "rfs_insufficient_return_data"
  | "rfs_weak_structure"
  | "rfs_24h_confirmation_opposed"
  | "rfs_24h_confirmation_unavailable"
  | "rfs_market_cap_unavailable"
  | "rfs_volume_24h_unavailable"
  | "rfs_liquidity_support_fallback";

export type RfsMarketInput = {
  price: number | null;
  chg_24h_pct: number | null;
  chg_7d_pct: number | null;
  sparkline_7d: number[] | null;
  market_cap: number | null;
  volume_24h: number | null;
};

/**
 * Canonical downstream structural signature.
 *
 * The property remains optional at contract level during migration so that
 * historical mocks and fixtures do not become invalid immediately.
 *
 * runRfsMarket() always returns it.
 */
export type RfsStructuralSignature = {
  net_move_pct_7d: number;
  amplitude_pct_7d: number;
  average_absolute_return_pct: number;
  volatility_pct: number;

  direction_changes_ratio: number;
  rupture_ratio: number;

  positive_return_count: number;
  negative_return_count: number;

  dominant_direction_ratio: number;
};

export type RfsMarketMetrics = {
  pattern_count: number;
  sample_size: number;
  direction_changes: number;
  rupture_events: number;
  stable_run_length: number;
  dominant_direction_ratio: number;
  liquidity_support: number;
  confirmation_alignment: RfsConfirmationAlignment;
};

export type RfsMarketAxes = {
  occurrence: number;
  convergence: number;
  duration: number;
  frequency: number;
  correlation: number;
};

export type RfsMarketScores = {
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

export type RfsMarketStates = {
  regime: RfsRegime;
  rfs_status: RfsStatus;
  mid_term_state: RfsMidTermState;
  crash_state: RfsCrashState;
};

export type RfsMarketProbabilities = {
  rupture_probability: number;
  continuity_probability: number;
};

export type RfsMarketQuality = {
  confidence: number;
};

export type RfsMarketResult = {
  /**
   * Non-destructive migration field.
   *
   * Runtime output always contains the signature. The optional contract avoids
   * breaking historical fixtures before their governed migration.
   */
  signature?: RfsStructuralSignature;

  metrics: RfsMarketMetrics;
  axes: RfsMarketAxes;
  scores: RfsMarketScores;
  states: RfsMarketStates;
  probabilities: RfsMarketProbabilities;
  quality: RfsMarketQuality;

  warnings: string[];
};

/* ============================================================================
 * 2. GOVERNED CONSTANTS
 * ========================================================================== */

const MIN_SPARKLINE_POINTS = 5;
const MIN_RETURN_POINTS = 4;

const RUPTURE_EVENT_THRESHOLD_PCT = 2.5;
const STABLE_RETURN_THRESHOLD_PCT = 1.4;

const STABLE_REGIME_STABILITY_MIN = 70;
const STABLE_REGIME_RUPTURE_MAX = 30;
const STABLE_REGIME_FREQUENCY_MIN = 60;
const STABLE_REGIME_CONVERGENCE_MIN = 60;

const VOLATILE_REGIME_STABILITY_MAX = 40;
const VOLATILE_REGIME_RUPTURE_MIN = 65;
const VOLATILE_REGIME_FREQUENCY_MAX = 35;

const WEAK_STRUCTURE_SCORE_MAX = 40;
const WEAK_STABILITY_SCORE_MAX = 40;

const CRASH_STATE_RISING_MIN = 45;
const CRASH_STATE_CRASH_MIN = 75;

const MID_TERM_FAVORABLE_CHANGE_MIN = 4;
const MID_TERM_UNFAVORABLE_CHANGE_MAX = -4;

const FALLBACK_LIQUIDITY_SUPPORT = 20;

const FALLBACK_INSUFFICIENT_STABILITY = 35;
const FALLBACK_INSUFFICIENT_STRUCTURE = 35;
const FALLBACK_INSUFFICIENT_RUPTURE = 50;
const FALLBACK_INSUFFICIENT_CONTINUITY = 50;
const FALLBACK_INSUFFICIENT_CONFIDENCE = 15;
const FALLBACK_MID_TERM_SCORE = 50;

/* ============================================================================
 * 3. SAFE PRIMITIVES
 * ========================================================================== */

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function clamp(
  value: number,
  min = 0,
  max = 100,
): number {
  return Math.max(
    min,
    Math.min(max, value),
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clampScore(value: number): number {
  if (!isFiniteNumber(value)) {
    return 0;
  }

  return round2(
    clamp(value, 0, 100),
  );
}

function safeNumber(
  value: unknown,
): number | null {
  return isFiniteNumber(value)
    ? value
    : null;
}

function uniqueWarnings(
  warnings: readonly string[],
): string[] {
  return [...new Set(warnings)];
}

function mean(
  values: readonly number[],
): number {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0,
    ) / values.length
  );
}

function standardDeviation(
  values: readonly number[],
): number {
  if (values.length < 2) {
    return 0;
  }

  const average = mean(values);

  const variance =
    values.reduce(
      (sum, value) =>
        sum +
        (value - average) ** 2,
      0,
    ) / values.length;

  return Math.sqrt(variance);
}

/* ============================================================================
 * 4. INPUT SANITATION
 * ========================================================================== */

function normalizeSparkline(
  value: unknown,
): number[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  if (value.length < MIN_SPARKLINE_POINTS) {
    return null;
  }

  const normalized: number[] = [];

  for (const item of value) {
    if (
      !isFiniteNumber(item) ||
      item <= 0
    ) {
      return null;
    }

    normalized.push(item);
  }

  return normalized;
}

/* ============================================================================
 * 5. SERIES HELPERS
 * ========================================================================== */

function buildReturns(
  series: readonly number[],
): number[] | null {
  if (series.length < 2) {
    return null;
  }

  const returns: number[] = [];

  for (
    let index = 1;
    index < series.length;
    index += 1
  ) {
    const previous =
      series[index - 1];

    const current =
      series[index];

    if (
      previous === undefined ||
      current === undefined ||
      !isFiniteNumber(previous) ||
      !isFiniteNumber(current) ||
      previous <= 0
    ) {
      return null;
    }

    returns.push(
      ((current - previous) /
        previous) *
        100,
    );
  }

  return returns.length >= MIN_RETURN_POINTS
    ? returns
    : null;
}

function computeNetMovePct(
  series: readonly number[],
): number {
  if (series.length < 2) {
    return 0;
  }

  const first =
    series[0];

  const last =
    series.at(-1);

  if (
    first === undefined ||
    last === undefined ||
    first <= 0
  ) {
    return 0;
  }

  return round2(
    ((last - first) /
      first) *
      100,
  );
}

function computeAmplitudePct(
  series: readonly number[],
): number {
  if (series.length < 2) {
    return 0;
  }

  const minimum =
    Math.min(...series);

  const maximum =
    Math.max(...series);

  const last =
    series.at(-1);

  if (
    last === undefined ||
    last <= 0
  ) {
    return 0;
  }

  return round2(
    ((maximum - minimum) /
      last) *
      100,
  );
}

function countDirectionChanges(
  returns: readonly number[],
): number {
  let changes = 0;

  for (
    let index = 1;
    index < returns.length;
    index += 1
  ) {
    const previous =
      returns[index - 1];

    const current =
      returns[index];

    if (
      previous === undefined ||
      current === undefined ||
      previous === 0 ||
      current === 0
    ) {
      continue;
    }

    const changed =
      (
        previous > 0 &&
        current < 0
      ) ||
      (
        previous < 0 &&
        current > 0
      );

    if (changed) {
      changes += 1;
    }
  }

  return changes;
}

function countRuptureEvents(
  returns: readonly number[],
): number {
  return returns.filter(
    (value) =>
      Math.abs(value) >=
      RUPTURE_EVENT_THRESHOLD_PCT,
  ).length;
}

function computeLongestStableRun(
  returns: readonly number[],
): number {
  let longestRun = 0;
  let currentRun = 0;

  for (const value of returns) {
    if (
      Math.abs(value) <
      STABLE_RETURN_THRESHOLD_PCT
    ) {
      currentRun += 1;
      longestRun =
        Math.max(
          longestRun,
          currentRun,
        );
    } else {
      currentRun = 0;
    }
  }

  return longestRun;
}

/* ============================================================================
 * 6. STATE HELPERS
 * ========================================================================== */

function deriveMidTermState(
  change7d: number | null,
): RfsMidTermState {
  if (change7d === null) {
    return "NEUTRAL";
  }

  if (
    change7d >=
    MID_TERM_FAVORABLE_CHANGE_MIN
  ) {
    return "FAVORABLE";
  }

  if (
    change7d <=
    MID_TERM_UNFAVORABLE_CHANGE_MAX
  ) {
    return "UNFAVORABLE";
  }

  return "NEUTRAL";
}

function deriveCrashState(
  crashScore: number,
): RfsCrashState {
  if (!isFiniteNumber(crashScore)) {
    return "UNKNOWN";
  }

  if (
    crashScore >=
    CRASH_STATE_CRASH_MIN
  ) {
    return "CRASH";
  }

  if (
    crashScore >=
    CRASH_STATE_RISING_MIN
  ) {
    return "RISING";
  }

  return "NONE";
}

function deriveStatus(input: {
  sample_size: number;
  stability_score: number;
  structure_score: number;
}): RfsStatus {
  if (
    input.sample_size <
    MIN_SPARKLINE_POINTS
  ) {
    return "INSUFFICIENT_DATA";
  }

  if (
    input.structure_score <
      WEAK_STRUCTURE_SCORE_MAX ||
    input.stability_score <
      WEAK_STABILITY_SCORE_MAX
  ) {
    return "WEAK_STRUCTURE";
  }

  return "VALID";
}

function deriveRegime(input: {
  stability_score: number;
  rupture_score: number;
  frequency_score: number;
  convergence_score: number;
}): RfsRegime {
  const stableMatch =
    input.stability_score >=
      STABLE_REGIME_STABILITY_MIN &&
    input.rupture_score <=
      STABLE_REGIME_RUPTURE_MAX &&
    input.frequency_score >=
      STABLE_REGIME_FREQUENCY_MIN &&
    input.convergence_score >=
      STABLE_REGIME_CONVERGENCE_MIN;

  if (stableMatch) {
    return "STABLE";
  }

  const volatileMatch =
    input.stability_score <
      VOLATILE_REGIME_STABILITY_MAX ||
    input.rupture_score >=
      VOLATILE_REGIME_RUPTURE_MIN ||
    input.frequency_score <
      VOLATILE_REGIME_FREQUENCY_MAX;

  if (volatileMatch) {
    return "VOLATILE";
  }

  return "TRANSITION";
}

/* ============================================================================
 * 7. CONTEXT HELPERS
 * ========================================================================== */

function computeConfirmationEffect(input: {
  change_24h_pct: number | null;
  net_move_pct_7d: number;
}): {
  continuity_bonus: number;
  rupture_penalty: number;
  alignment: RfsConfirmationAlignment;
} {
  if (
    input.change_24h_pct === null
  ) {
    return {
      continuity_bonus: 0,
      rupture_penalty: 0,
      alignment: "UNAVAILABLE",
    };
  }

  const move24h =
    input.change_24h_pct;

  const move7d =
    input.net_move_pct_7d;

  if (
    move24h === 0 ||
    move7d === 0
  ) {
    return {
      continuity_bonus: 0,
      rupture_penalty: 0,
      alignment: "NEUTRAL",
    };
  }

  const sameDirection =
    (
      move7d > 0 &&
      move24h > 0
    ) ||
    (
      move7d < 0 &&
      move24h < 0
    );

  if (sameDirection) {
    return {
      continuity_bonus:
        clampScore(
          Math.min(
            12,
            Math.abs(move24h) *
              1.5,
          ),
        ),

      rupture_penalty: 0,
      alignment: "ALIGNED",
    };
  }

  return {
    continuity_bonus: 0,

    rupture_penalty:
      clampScore(
        Math.min(
          18,
          Math.abs(move24h) *
            2,
        ),
      ),

    alignment: "OPPOSED",
  };
}

function computeLiquiditySupport(input: {
  market_cap: number | null;
  volume_24h: number | null;
}): {
  score: number;
  fallback_used: boolean;
} {
  if (
    input.market_cap === null ||
    input.volume_24h === null ||
    input.market_cap <= 0 ||
    input.volume_24h < 0
  ) {
    return {
      score:
        FALLBACK_LIQUIDITY_SUPPORT,

      fallback_used: true,
    };
  }

  return {
    score:
      clampScore(
        (
          input.volume_24h /
          input.market_cap
        ) *
          1000,
      ),

    fallback_used: false,
  };
}

/* ============================================================================
 * 8. STRUCTURAL AXES
 * ========================================================================== */

function computeOccurrenceScore(input: {
  rupture_events: number;
  returns_sample_size: number;
  stable_run_length: number;
}): number {
  if (
    input.returns_sample_size <= 0
  ) {
    return 0;
  }

  const patternPresence =
    input.rupture_events > 0
      ? Math.min(
          100,
          (
            input.rupture_events +
            1
          ) *
            12,
        )
      : 35;

  const stablePresence =
    clampScore(
      (
        input.stable_run_length /
        input.returns_sample_size
      ) *
        100,
    );

  return clampScore(
    patternPresence * 0.45 +
      stablePresence * 0.55,
  );
}

function computeFrequencyScore(input: {
  rupture_ratio: number;
  direction_changes_ratio: number;
  average_absolute_return_pct: number;
}): number {
  return clampScore(
    100 -
      input.rupture_ratio * 55 -
      input.direction_changes_ratio *
        35 -
      input.average_absolute_return_pct *
        6,
  );
}

function computeDurationScore(input: {
  stable_run_length: number;
  returns_sample_size: number;
}): number {
  if (
    input.returns_sample_size <= 0
  ) {
    return 0;
  }

  return clampScore(
    (
      input.stable_run_length /
      input.returns_sample_size
    ) *
      100,
  );
}

function computeConvergenceScore(input: {
  dominant_direction_ratio: number;
  direction_changes_ratio: number;
  net_move_pct_7d: number;
  confirmation_alignment:
    RfsConfirmationAlignment;
}): number {
  const confirmationSupport =
    input.confirmation_alignment ===
    "ALIGNED"
      ? 100
      : input.confirmation_alignment ===
          "NEUTRAL"
        ? 55
        : input.confirmation_alignment ===
            "UNAVAILABLE"
          ? 40
          : 15;

  const directionSupport =
    clampScore(
      input.dominant_direction_ratio *
        100,
    );

  const contradictionPenalty =
    clampScore(
      input.direction_changes_ratio *
        100,
    );

  const trendPresence =
    clampScore(
      Math.abs(
        input.net_move_pct_7d,
      ) * 8,
    );

  return clampScore(
    directionSupport * 0.4 +
      confirmationSupport * 0.25 +
      trendPresence * 0.2 +
      (
        100 -
        contradictionPenalty
      ) *
        0.15,
  );
}

function computeCorrelationScore(input: {
  change_24h_pct: number | null;
  change_7d_pct: number | null;
  net_move_pct_7d: number;
  liquidity_support: number;
  confirmation_alignment:
    RfsConfirmationAlignment;
}): number {
  const confirmationSupport =
    input.confirmation_alignment ===
    "ALIGNED"
      ? 100
      : input.confirmation_alignment ===
          "NEUTRAL"
        ? 55
        : input.confirmation_alignment ===
            "UNAVAILABLE"
          ? 35
          : 10;

  const sevenDayVsNetSupport =
    input.change_7d_pct === null
      ? 35
      : clampScore(
          100 -
            Math.abs(
              input.change_7d_pct -
                input.net_move_pct_7d,
            ) *
              8,
        );

  const twentyFourHourVsSevenDaySupport =
    input.change_7d_pct === null ||
    input.change_24h_pct === null
      ? 35
      : input.change_7d_pct === 0 ||
          input.change_24h_pct === 0
        ? 55
        : (
              input.change_7d_pct > 0 &&
              input.change_24h_pct > 0
            ) ||
            (
              input.change_7d_pct < 0 &&
              input.change_24h_pct < 0
            )
          ? 85
          : 20;

  return clampScore(
    confirmationSupport * 0.3 +
      sevenDayVsNetSupport * 0.3 +
      twentyFourHourVsSevenDaySupport *
        0.2 +
      input.liquidity_support *
        0.2,
  );
}

/* ============================================================================
 * 9. RESULT FACTORIES
 * ========================================================================== */

function buildFallbackSignature(): RfsStructuralSignature {
  return {
    net_move_pct_7d: 0,
    amplitude_pct_7d: 0,
    average_absolute_return_pct: 0,
    volatility_pct: 0,

    direction_changes_ratio: 0,
    rupture_ratio: 0,

    positive_return_count: 0,
    negative_return_count: 0,

    dominant_direction_ratio: 0,
  };
}

function buildInvalidResult(input: {
  change_24h_pct: number | null;
  change_7d_pct: number | null;
  liquidity_support: number;

  reason:
    | "rfs_invalid_price"
    | "rfs_insufficient_sparkline_data"
    | "rfs_insufficient_return_data";

  additional_warnings:
    readonly string[];
}): RfsMarketResult {
  const invalidPrice =
    input.reason ===
    "rfs_invalid_price";

  const status: RfsStatus =
    invalidPrice
      ? "INVALID"
      : "INSUFFICIENT_DATA";

  const fallbackStability =
    invalidPrice
      ? 0
      : FALLBACK_INSUFFICIENT_STABILITY;

  const fallbackStructure =
    invalidPrice
      ? 0
      : FALLBACK_INSUFFICIENT_STRUCTURE;

  const fallbackRupture =
    invalidPrice
      ? 100
      : FALLBACK_INSUFFICIENT_RUPTURE;

  const fallbackContinuity =
    invalidPrice
      ? 0
      : FALLBACK_INSUFFICIENT_CONTINUITY;

  const fallbackConfidence =
    invalidPrice
      ? 0
      : FALLBACK_INSUFFICIENT_CONFIDENCE;

  const fallbackMidTerm =
    input.change_7d_pct === null
      ? FALLBACK_MID_TERM_SCORE
      : clampScore(
          50 +
            input.change_7d_pct *
              4,
        );

  return {
    signature:
      buildFallbackSignature(),

    metrics: {
      pattern_count: 0,
      sample_size: 0,
      direction_changes: 0,
      rupture_events: 0,
      stable_run_length: 0,
      dominant_direction_ratio: 0,

      liquidity_support:
        invalidPrice
          ? 0
          : input.liquidity_support,

      confirmation_alignment:
        input.change_24h_pct === null
          ? "UNAVAILABLE"
          : "NEUTRAL",
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

      stability:
        fallbackStability,

      structure:
        fallbackStructure,

      rupture:
        fallbackRupture,

      crash_score:
        fallbackRupture,

      mid_term:
        fallbackMidTerm,
    },

    states: {
      regime: "TRANSITION",

      rfs_status:
        status,

      mid_term_state:
        deriveMidTermState(
          input.change_7d_pct,
        ),

      crash_state:
        deriveCrashState(
          fallbackRupture,
        ),
    },

    probabilities: {
      rupture_probability:
        fallbackRupture,

      continuity_probability:
        fallbackContinuity,
    },

    quality: {
      confidence:
        fallbackConfidence,
    },

    warnings:
      uniqueWarnings([
        input.reason,
        ...input.additional_warnings,
      ]),
  };
}

/* ============================================================================
 * 10. PUBLIC EXECUTION
 * ========================================================================== */

export function runRfsMarket(
  input: RfsMarketInput,
): RfsMarketResult {
  const price =
    safeNumber(input.price);

  const change24hPct =
    safeNumber(
      input.chg_24h_pct,
    );

  const change7dPct =
    safeNumber(
      input.chg_7d_pct,
    );

  const marketCap =
    safeNumber(
      input.market_cap,
    );

  const volume24h =
    safeNumber(
      input.volume_24h,
    );

  const sparkline =
    normalizeSparkline(
      input.sparkline_7d,
    );

  const liquidity =
    computeLiquiditySupport({
      market_cap:
        marketCap,

      volume_24h:
        volume24h,
    });

  const availabilityWarnings:
    string[] = [];

  if (change24hPct === null) {
    availabilityWarnings.push(
      "rfs_24h_confirmation_unavailable",
    );
  }

  if (marketCap === null) {
    availabilityWarnings.push(
      "rfs_market_cap_unavailable",
    );
  }

  if (volume24h === null) {
    availabilityWarnings.push(
      "rfs_volume_24h_unavailable",
    );
  }

  if (liquidity.fallback_used) {
    availabilityWarnings.push(
      "rfs_liquidity_support_fallback",
    );
  }

  if (
    price === null ||
    price <= 0
  ) {
    return buildInvalidResult({
      change_24h_pct:
        change24hPct,

      change_7d_pct:
        change7dPct,

      liquidity_support:
        liquidity.score,

      reason:
        "rfs_invalid_price",

      additional_warnings:
        availabilityWarnings,
    });
  }

  if (sparkline === null) {
    return buildInvalidResult({
      change_24h_pct:
        change24hPct,

      change_7d_pct:
        change7dPct,

      liquidity_support:
        liquidity.score,

      reason:
        "rfs_insufficient_sparkline_data",

      additional_warnings:
        availabilityWarnings,
    });
  }

  const returns =
    buildReturns(sparkline);

  if (returns === null) {
    return buildInvalidResult({
      change_24h_pct:
        change24hPct,

      change_7d_pct:
        change7dPct,

      liquidity_support:
        liquidity.score,

      reason:
        "rfs_insufficient_return_data",

      additional_warnings:
        availabilityWarnings,
    });
  }

  const sampleSize =
    sparkline.length;

  const returnsSampleSize =
    returns.length;

  const netMovePct7d =
    computeNetMovePct(
      sparkline,
    );

  const amplitudePct7d =
    computeAmplitudePct(
      sparkline,
    );

  const averageAbsoluteReturnPct =
    mean(
      returns.map(
        (value) =>
          Math.abs(value),
      ),
    );

  const volatilityPct =
    standardDeviation(
      returns,
    );

  const directionChanges =
    countDirectionChanges(
      returns,
    );

  const ruptureEvents =
    countRuptureEvents(
      returns,
    );

  const stableRunLength =
    computeLongestStableRun(
      returns,
    );

  const positiveReturnCount =
    returns.filter(
      (value) =>
        value > 0,
    ).length;

  const negativeReturnCount =
    returns.filter(
      (value) =>
        value < 0,
    ).length;

  const dominantDirectionRatio =
    returnsSampleSize > 0
      ? Math.max(
          positiveReturnCount,
          negativeReturnCount,
        ) /
        returnsSampleSize
      : 0;

  const directionChangesRatio =
    returnsSampleSize > 0
      ? directionChanges /
        returnsSampleSize
      : 0;

  const ruptureRatio =
    returnsSampleSize > 0
      ? ruptureEvents /
        returnsSampleSize
      : 0;

  const confirmation =
    computeConfirmationEffect({
      change_24h_pct:
        change24hPct,

      net_move_pct_7d:
        netMovePct7d,
    });

  const occurrenceScore =
    computeOccurrenceScore({
      rupture_events:
        ruptureEvents,

      returns_sample_size:
        returnsSampleSize,

      stable_run_length:
        stableRunLength,
    });

  const convergenceScore =
    computeConvergenceScore({
      dominant_direction_ratio:
        dominantDirectionRatio,

      direction_changes_ratio:
        directionChangesRatio,

      net_move_pct_7d:
        netMovePct7d,

      confirmation_alignment:
        confirmation.alignment,
    });

  const durationScore =
    computeDurationScore({
      stable_run_length:
        stableRunLength,

      returns_sample_size:
        returnsSampleSize,
    });

  const frequencyScore =
    computeFrequencyScore({
      rupture_ratio:
        ruptureRatio,

      direction_changes_ratio:
        directionChangesRatio,

      average_absolute_return_pct:
        averageAbsoluteReturnPct,
    });

  const correlationScore =
    computeCorrelationScore({
      change_24h_pct:
        change24hPct,

      change_7d_pct:
        change7dPct,

      net_move_pct_7d:
        netMovePct7d,

      liquidity_support:
        liquidity.score,

      confirmation_alignment:
        confirmation.alignment,
    });

  const structureScore =
    clampScore(
      occurrenceScore * 0.18 +
        convergenceScore * 0.24 +
        durationScore * 0.2 +
        frequencyScore * 0.22 +
        correlationScore * 0.16,
    );

  const ruptureScore =
    clampScore(
      ruptureRatio * 55 +
        directionChangesRatio * 20 +
        averageAbsoluteReturnPct *
          6 +
        volatilityPct * 8 +
        confirmation
          .rupture_penalty,
    );

  const crashScore =
    ruptureScore;

  const stabilityScore =
    clampScore(
      occurrenceScore * 0.18 +
        convergenceScore * 0.24 +
        durationScore * 0.22 +
        frequencyScore * 0.2 +
        correlationScore * 0.16 +
        confirmation
          .continuity_bonus,
    );

  const midTermScore =
    clampScore(
      50 +
        netMovePct7d *
          4,
    );

  const confidenceScore =
    clampScore(
      stabilityScore * 0.25 +
        structureScore * 0.2 +
        correlationScore * 0.15 +
        durationScore * 0.15 +
        liquidity.score * 0.1 +
        (
          100 -
          ruptureScore
        ) *
          0.15,
    );

  const regime =
    deriveRegime({
      stability_score:
        stabilityScore,

      rupture_score:
        ruptureScore,

      frequency_score:
        frequencyScore,

      convergence_score:
        convergenceScore,
    });

  const status =
    deriveStatus({
      sample_size:
        sampleSize,

      stability_score:
        stabilityScore,

      structure_score:
        structureScore,
    });

  const warnings:
    string[] = [
      ...availabilityWarnings,
    ];

  if (
    status ===
    "WEAK_STRUCTURE"
  ) {
    warnings.push(
      "rfs_weak_structure",
    );
  }

  if (
    confirmation.alignment ===
    "OPPOSED"
  ) {
    warnings.push(
      "rfs_24h_confirmation_opposed",
    );
  }

  const continuityProbability =
    clampScore(
      100 -
        ruptureScore +
        confirmation
          .continuity_bonus,
    );

  return {
    signature: {
      net_move_pct_7d:
        round2(
          netMovePct7d,
        ),

      amplitude_pct_7d:
        round2(
          amplitudePct7d,
        ),

      average_absolute_return_pct:
        round2(
          averageAbsoluteReturnPct,
        ),

      volatility_pct:
        round2(
          volatilityPct,
        ),

      direction_changes_ratio:
        round2(
          directionChangesRatio,
        ),

      rupture_ratio:
        round2(
          ruptureRatio,
        ),

      positive_return_count:
        positiveReturnCount,

      negative_return_count:
        negativeReturnCount,

      dominant_direction_ratio:
        round2(
          dominantDirectionRatio,
        ),
    },

    metrics: {
      pattern_count:
        Math.max(
          1,
          ruptureEvents > 0
            ? ruptureEvents + 1
            : 1,
        ),

      sample_size:
        sampleSize,

      direction_changes:
        directionChanges,

      rupture_events:
        ruptureEvents,

      stable_run_length:
        stableRunLength,

      dominant_direction_ratio:
        clampScore(
          dominantDirectionRatio *
            100,
        ),

      liquidity_support:
        liquidity.score,

      confirmation_alignment:
        confirmation.alignment,
    },

    axes: {
      occurrence:
        occurrenceScore,

      convergence:
        convergenceScore,

      duration:
        durationScore,

      frequency:
        frequencyScore,

      correlation:
        correlationScore,
    },

    scores: {
      occurrence:
        occurrenceScore,

      convergence:
        convergenceScore,

      duration:
        durationScore,

      frequency:
        frequencyScore,

      correlation:
        correlationScore,

      stability:
        stabilityScore,

      structure:
        structureScore,

      rupture:
        ruptureScore,

      crash_score:
        crashScore,

      mid_term:
        midTermScore,
    },

    states: {
      regime,

      rfs_status:
        status,

      mid_term_state:
        deriveMidTermState(
          change7dPct ??
            netMovePct7d,
        ),

      crash_state:
        deriveCrashState(
          crashScore,
        ),
    },

    probabilities: {
      rupture_probability:
        ruptureScore,

      continuity_probability:
        continuityProbability,
    },

    quality: {
      confidence:
        confidenceScore,
    },

    warnings:
      uniqueWarnings(
        warnings,
      ),
  };
}
