/* ============================================================================
 * FILE: scripts/backtest-xyvala.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala deterministic private analytical backtest
 *
 * ROLE
 * - replay ordered historical observations through the canonical RFS producer
 * - execute the private MCI opportunity core without future leakage
 * - observe forward returns strictly after analytical execution
 * - aggregate deterministic backtest statistics
 * - preserve explicit unavailable analytical values
 *
 * CLASSIFICATION
 * - PRIVATE
 * - BACKTEST
 * - COMPUTE
 * - OBSERVE
 * - PURE CORE
 *
 * POSITION IN OFFICIAL CHAIN
 * - historical fixture acquisition
 * - RFS
 * - MCI
 * - backtest observation
 * - backtest aggregation
 *
 * PARENTS
 * - lib/xyvala/rfs-core.ts
 * - lib/xyvala/rfs/contracts/rfs-score-contract.ts
 * - lib/xyvala/opportunity-core.ts
 *
 * CONSUMERS
 * - private development tooling
 * - private regression tooling
 * - private calibration research
 * - analytical validation reports
 *
 * DIRECTIVES
 * - deterministic backtest only
 * - private tooling only
 * - no future leakage inside RFS inputs
 * - no future leakage inside MCI inputs
 * - future returns are observational outputs only
 * - no RFS recomputation outside runRFS
 * - no MCI recomputation outside runMCI
 * - no Triple Layer reconstruction
 * - no Impulse Layer reconstruction
 * - no Crash System reconstruction
 * - no calibration mutation
 * - no snapshot mutation
 * - no UI logic
 * - no API logic
 * - no public projection
 * - no hidden prediction
 * - no timestamp generation from the local clock
 * - no silent observation sorting
 * - no invalid observation removal after validation begins
 * - no unavailable-to-zero substitution for analytical truths
 * - local audit variables must not enter canonical analytical contracts
 * - READ -> VALIDATE -> USE
 *
 * INPUTS
 * - real or deterministic test observations
 * - strictly increasing timestamps
 * - explicit quote currency
 * - explicit source and data versions
 *
 * OUTPUTS
 * - private backtest signals
 * - private deterministic summary
 *
 * OWNERSHIP
 * - RFS owns structural truth
 * - MCI owns opportunity and private decision truth
 * - this file owns backtest-only forward-return observations
 *
 * INVARIANTS
 * - an analytical signal at index N receives observations from indexes <= N
 * - an analytical signal never receives return observations from indexes > N
 * - forward returns are calculated only after RFS and MCI execution
 * - null remains unavailable
 * - zero remains a valid computed value
 * - identical observations, versions and configuration produce identical output
 * - mock series generation uses an explicit deterministic start timestamp
 * - source observations are never reordered
 *
 * FIRST DIVERGENCE
 * - malformed or unordered source observations
 *   => backtest input boundary
 *
 * - valid canonical input rejected by RFS
 *   => RFS producer
 *
 * - valid RFS result rejected by MCI
 *   => MCI producer
 *
 * - valid analytical result incorrectly associated with future observations
 *   => backtest observation boundary
 *
 * SENSITIVE ZONES
 * - timestamp monotonicity
 * - historical-window boundaries
 * - historical pattern occurrence boundaries
 * - analytical nullability
 * - future-return isolation
 * - deterministic mock generation
 * ========================================================================== */

import {
  runRFS,
} from "@/lib/xyvala/rfs-core";

import type {
  RfsQuoteCurrency,
  RfsScoreInput,
  RfsScoreResult,
} from "@/lib/xyvala/rfs/contracts/rfs-score-contract";

import {
  runMCI,
  type MciDecision,
  type PatternKind,
  type PatternOccurrence,
} from "@/lib/xyvala/opportunity-core";

/* ============================================================================
 * 1. PUBLIC TYPES
 * ========================================================================== */

export type BacktestPoint = Readonly<{
  ts: number;
  price: number;
}>;

export type BacktestSignal = Readonly<{
  index: number;
  ts: number;
  price: number;

  rfs_status:
    RfsScoreResult["status"];

  rfs_propagation_status:
    RfsScoreResult["propagation_status"];

  regime:
    string | null;

  stability_score:
    number | null;

  opportunity_score:
    number | null;

  decision:
    MciDecision;

  correction_probability:
    number | null;

  continuation_probability:
    number | null;

  return_24h:
    number | null;

  return_48h:
    number | null;

  return_72h:
    number | null;
}>;

export type BacktestSummary = Readonly<{
  total_signals: number;

  allow_count: number;
  watch_count: number;
  block_count: number;

  unavailable_opportunity_count:
    number;

  avg_return_24h:
    number | null;

  avg_return_48h:
    number | null;

  avg_return_72h:
    number | null;

  allow_avg_return_24h:
    number | null;

  allow_avg_return_48h:
    number | null;

  allow_avg_return_72h:
    number | null;

  block_avg_return_24h:
    number | null;

  block_avg_return_48h:
    number | null;

  block_avg_return_72h:
    number | null;

  high_opportunity_count:
    number;

  high_opportunity_avg_return_24h:
    number | null;

  high_opportunity_avg_return_48h:
    number | null;

  high_opportunity_avg_return_72h:
    number | null;
}>;

export type BacktestConfiguration = Readonly<{
  minimum_history_count?:
    number;

  return_24h_offset?:
    number;

  return_48h_offset?:
    number;

  return_72h_offset?:
    number;

  quote_currency?:
    RfsQuoteCurrency;

  source_version?:
    string;

  data_version?:
    string;
}>;

export type BuildMockSeriesInput = Readonly<{
  length?: number;
  base_price?: number;
  volatility?: number;
  seed?: number;
  start_timestamp?: number;
  interval_ms?: number;
}>;

/* ============================================================================
 * 2. INTERNAL TYPES
 * ========================================================================== */

type ValidatedBacktestConfiguration = Readonly<{
  minimum_history_count:
    number;

  return_24h_offset:
    number;

  return_48h_offset:
    number;

  return_72h_offset:
    number;

  maximum_lookahead:
    number;

  quote_currency:
    RfsQuoteCurrency;

  source_version:
    string;

  data_version:
    string;
}>;

type InternalPatternOccurrence = Readonly<{
  start_index: number;
  size: number;

  last_price: number;
  next_price: number;
  mean_price: number;

  kind: PatternKind;

  similarity_score: number;

  led_to_correction: boolean;
  led_to_continuation: boolean;
}>;

/* ============================================================================
 * 3. GOVERNED CONSTANTS
 * ========================================================================== */

const MINIMUM_RFS_OBSERVATION_COUNT =
  8;

const DEFAULT_MINIMUM_HISTORY_COUNT =
  120;

const DEFAULT_RETURN_24H_OFFSET =
  24;

const DEFAULT_RETURN_48H_OFFSET =
  48;

const DEFAULT_RETURN_72H_OFFSET =
  72;

const HIGH_OPPORTUNITY_THRESHOLD =
  60;

const DEFAULT_QUOTE_CURRENCY:
  RfsQuoteCurrency =
  "eur";

const DEFAULT_SOURCE_VERSION =
  "xyvala-backtest-source-v2";

const DEFAULT_DATA_VERSION =
  "xyvala-backtest-data-v2";

const MOCK_SERIES_DEFAULT_LENGTH =
  400;

const MOCK_SERIES_DEFAULT_BASE_PRICE =
  100;

const MOCK_SERIES_DEFAULT_VOLATILITY =
  0.8;

const MOCK_SERIES_DEFAULT_SEED =
  1;

/*
 * Explicit fixed timestamp:
 * 2024-01-01T00:00:00.000Z
 *
 * The mock generator must not read Date.now(), because local-clock access
 * would make identical backtest configuration produce different input data.
 */
const MOCK_SERIES_DEFAULT_START_TIMESTAMP =
  1_704_067_200_000;

const MOCK_SERIES_DEFAULT_INTERVAL_MS =
  3_600_000;

/* ============================================================================
 * 4. SAFE NUMERIC HELPERS
 * ========================================================================== */

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function isPositiveFiniteNumber(
  value: unknown,
): value is number {
  return (
    isFiniteNumber(value) &&
    value > 0
  );
}

function roundToTwoDecimals(
  value: number,
): number {
  if (!isFiniteNumber(value)) {
    throw new TypeError(
      "BACKTEST_NUMBER_INVALID: expected a finite number",
    );
  }

  return (
    Math.round(value * 100) /
    100
  );
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  if (!isFiniteNumber(value)) {
    throw new TypeError(
      "BACKTEST_CLAMP_VALUE_INVALID: expected a finite number",
    );
  }

  return Math.max(
    minimum,
    Math.min(
      maximum,
      value,
    ),
  );
}

function mean(
  values: readonly number[],
): number | null {
  if (values.length === 0) {
    return null;
  }

  const total =
    values.reduce(
      (
        accumulator,
        value,
      ) =>
        accumulator +
        value,
      0,
    );

  return (
    total /
    values.length
  );
}

function roundedMean(
  values:
    readonly number[],
): number | null {
  const result =
    mean(values);

  return result === null
    ? null
    : roundToTwoDecimals(
        result,
      );
}

function standardDeviation(
  values: readonly number[],
): number {
  if (values.length <= 1) {
    return 0;
  }

  const average =
    mean(values);

  if (average === null) {
    return 0;
  }

  const variance =
    values.reduce(
      (
        accumulator,
        value,
      ) =>
        accumulator +
        (
          value -
          average
        ) ** 2,
      0,
    ) /
    values.length;

  return Math.sqrt(
    variance,
  );
}

function computePercentageChange(
  from: number,
  to: number,
): number | null {
  if (
    !isFiniteNumber(from) ||
    !isFiniteNumber(to) ||
    from === 0
  ) {
    return null;
  }

  return (
    (
      to -
      from
    ) /
    Math.abs(from)
  ) * 100;
}

function nonNullNumbers(
  values:
    readonly (
      number |
      null
    )[],
): number[] {
  return values.filter(
    (
      value,
    ): value is number =>
      isFiniteNumber(value),
  );
}

/* ============================================================================
 * 5. CONFIGURATION VALIDATION
 * ========================================================================== */

function readPositiveInteger(
  value: unknown,
  fallback: number,
  variableName: string,
): number {
  if (
    value === undefined
  ) {
    return fallback;
  }

  if (
    !Number.isInteger(value) ||
    (
      value as number
    ) <= 0
  ) {
    throw new RangeError(
      `BACKTEST_CONFIGURATION_INVALID: ${variableName} must be a positive integer`,
    );
  }

  return value as number;
}

function readNonEmptyString(
  value: unknown,
  fallback: string,
  variableName: string,
): string {
  if (
    value === undefined
  ) {
    return fallback;
  }

  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new TypeError(
      `BACKTEST_CONFIGURATION_INVALID: ${variableName} must be a non-empty string`,
    );
  }

  return value;
}

function readQuoteCurrency(
  value: unknown,
): RfsQuoteCurrency {
  if (
    value === undefined
  ) {
    return DEFAULT_QUOTE_CURRENCY;
  }

  if (
    value === "eur" ||
    value === "usd" ||
    value === "usdt"
  ) {
    return value;
  }

  throw new TypeError(
    "BACKTEST_CONFIGURATION_INVALID: quote_currency must be eur, usd or usdt",
  );
}

function validateBacktestConfiguration(
  input:
    BacktestConfiguration,
): ValidatedBacktestConfiguration {
  const minimumHistoryCount =
    Math.max(
      MINIMUM_RFS_OBSERVATION_COUNT,
      readPositiveInteger(
        input.minimum_history_count,
        DEFAULT_MINIMUM_HISTORY_COUNT,
        "minimum_history_count",
      ),
    );

  const return24hOffset =
    readPositiveInteger(
      input.return_24h_offset,
      DEFAULT_RETURN_24H_OFFSET,
      "return_24h_offset",
    );

  const return48hOffset =
    readPositiveInteger(
      input.return_48h_offset,
      DEFAULT_RETURN_48H_OFFSET,
      "return_48h_offset",
    );

  const return72hOffset =
    readPositiveInteger(
      input.return_72h_offset,
      DEFAULT_RETURN_72H_OFFSET,
      "return_72h_offset",
    );

  return {
    minimum_history_count:
      minimumHistoryCount,

    return_24h_offset:
      return24hOffset,

    return_48h_offset:
      return48hOffset,

    return_72h_offset:
      return72hOffset,

    maximum_lookahead:
      Math.max(
        return24hOffset,
        return48hOffset,
        return72hOffset,
      ),

    quote_currency:
      readQuoteCurrency(
        input.quote_currency,
      ),

    source_version:
      readNonEmptyString(
        input.source_version,
        DEFAULT_SOURCE_VERSION,
        "source_version",
      ),

    data_version:
      readNonEmptyString(
        input.data_version,
        DEFAULT_DATA_VERSION,
        "data_version",
      ),
  };
}

/* ============================================================================
 * 6. BACKTEST POINT VALIDATION
 * ----------------------------------------------------------------------------
 * Source points are validated as a complete ordered series.
 *
 * No point is silently removed because filtering invalid points could alter
 * indexes, temporal spacing and forward-return associations.
 * ========================================================================== */

function isValidBacktestPoint(
  point: unknown,
): point is BacktestPoint {
  if (
    point === null ||
    typeof point !== "object"
  ) {
    return false;
  }

  const candidate =
    point as
      Partial<BacktestPoint>;

  return (
    isFiniteNumber(
      candidate.ts,
    ) &&
    candidate.ts >= 0 &&
    isPositiveFiniteNumber(
      candidate.price,
    )
  );
}

function validateBacktestPoints(
  points:
    readonly BacktestPoint[],
): readonly BacktestPoint[] {
  if (!Array.isArray(points)) {
    throw new TypeError(
      "BACKTEST_POINTS_INVALID: points must be an array",
    );
  }

  for (
    let index = 0;
    index < points.length;
    index += 1
  ) {
    const point =
      points[index];

    if (
      !isValidBacktestPoint(
        point,
      )
    ) {
      throw new TypeError(
        `BACKTEST_POINT_INVALID: points[${index}] must contain a positive price and a finite non-negative timestamp`,
      );
    }

    if (index === 0) {
      continue;
    }

    const previousPoint =
      points[index - 1];

    if (
      previousPoint === undefined ||
      point.ts <=
        previousPoint.ts
    ) {
      throw new RangeError(
        `BACKTEST_TIMESTAMP_ORDER_INVALID: timestamps must be strictly increasing at index ${index}`,
      );
    }
  }

  return points;
}

/* ============================================================================
 * 7. CANONICAL RFS INPUT CONSTRUCTION
 * ----------------------------------------------------------------------------
 * The backtest script builds transport only.
 *
 * It does not:
 * - repair observations
 * - generate timestamps
 * - infer currency
 * - calculate RFS truth
 * ========================================================================== */

function buildRfsInput(
  history:
    readonly BacktestPoint[],
  configuration:
    ValidatedBacktestConfiguration,
): RfsScoreInput {
  return {
    observations:
      history.map(
        (point) => ({
          price:
            point.price,

          timestamp:
            point.ts,
        }),
      ),

    metadata: {
      quote_currency:
        configuration
          .quote_currency,

      source:
        "test_fixture",

      source_version:
        configuration
          .source_version,

      data_version:
        configuration
          .data_version,
    },
  };
}

/* ============================================================================
 * 8. PATTERN HELPERS
 * ----------------------------------------------------------------------------
 * These helpers build only the legacy historical-pattern transport consumed by
 * the current MCI contract.
 *
 * They do not create RFS pattern truth and do not modify the RFS result.
 * ========================================================================== */

function countDirectionalStats(
  prices:
    readonly number[],
): Readonly<{
  up_moves: number;
  down_moves: number;
  up_streak_max: number;
  down_streak_max: number;
}> {
  let upMoves = 0;
  let downMoves = 0;

  let currentUpStreak = 0;
  let currentDownStreak = 0;

  let maximumUpStreak = 0;
  let maximumDownStreak = 0;

  for (
    let index = 1;
    index < prices.length;
    index += 1
  ) {
    const previous =
      prices[index - 1];

    const current =
      prices[index];

    if (
      previous === undefined ||
      current === undefined
    ) {
      throw new Error(
        `BACKTEST_PATTERN_SERIES_INVALID: unavailable price at index ${index}`,
      );
    }

    if (current > previous) {
      upMoves += 1;
      currentUpStreak += 1;
      currentDownStreak = 0;
    } else if (
      current <
      previous
    ) {
      downMoves += 1;
      currentDownStreak += 1;
      currentUpStreak = 0;
    } else {
      currentUpStreak = 0;
      currentDownStreak = 0;
    }

    maximumUpStreak =
      Math.max(
        maximumUpStreak,
        currentUpStreak,
      );

    maximumDownStreak =
      Math.max(
        maximumDownStreak,
        currentDownStreak,
      );
  }

  return {
    up_moves:
      upMoves,

    down_moves:
      downMoves,

    up_streak_max:
      maximumUpStreak,

    down_streak_max:
      maximumDownStreak,
  };
}

function classifyBacktestPattern(
  prices:
    readonly number[],
): PatternKind {
  if (prices.length < 3) {
    return "MIXED";
  }

  const start =
    prices[0];

  const end =
    prices.at(-1);

  if (
    start === undefined ||
    end === undefined
  ) {
    return "MIXED";
  }

  const statistics =
    countDirectionalStats(
      prices,
    );

  const average =
    mean(prices);

  if (
    average === null ||
    average <= 0
  ) {
    return "MIXED";
  }

  const volatility =
    standardDeviation(
      prices,
    );

  const changePct =
    computePercentageChange(
      start,
      end,
    ) ?? 0;

  const distanceFromMean =
    Math.abs(
      computePercentageChange(
        average,
        end,
      ) ?? 0,
    );

  if (
    statistics.up_streak_max >=
      3 &&
    changePct > 0
  ) {
    return "UP_STREAK";
  }

  if (
    statistics.down_streak_max >=
      3 &&
    changePct < 0
  ) {
    return "DOWN_STREAK";
  }

  if (
    volatility <
    average * 0.01
  ) {
    return "COMPRESSION";
  }

  if (
    changePct > 4 &&
    statistics.up_moves >
      statistics.down_moves *
        1.5
  ) {
    return "BREAKOUT";
  }

  if (
    changePct < -4 &&
    statistics.down_moves >
      statistics.up_moves *
        1.5
  ) {
    return "BREAKDOWN";
  }

  if (
    distanceFromMean < 1.5
  ) {
    return "MEAN_REVERTING";
  }

  if (
    volatility >
    average * 0.04
  ) {
    return "CHAOTIC";
  }

  return "MIXED";
}

/* ============================================================================
 * 9. HISTORICAL PATTERN OBSERVATION
 * ----------------------------------------------------------------------------
 * Every occurrence is fully contained inside the current historical universe.
 *
 * The "next" observation used to qualify an occurrence is also inside the
 * historical universe available at the signal timestamp.
 *
 * No observation after the signal timestamp is used.
 * ========================================================================== */

function buildInternalPatternOccurrences(
  prices:
    readonly number[],
): InternalPatternOccurrence[] {
  if (prices.length < 5) {
    return [];
  }

  const occurrences:
    InternalPatternOccurrence[] =
    [];

  const maximumWindowSize =
    Math.min(
      prices.length - 1,
      6,
    );

  for (
    let size = 3;
    size <= maximumWindowSize;
    size += 1
  ) {
    for (
      let startIndex = 0;
      startIndex + size <
        prices.length;
      startIndex += 1
    ) {
      const window =
        prices.slice(
          startIndex,
          startIndex + size,
        );

      const nextPrice =
        prices[
          startIndex +
          size
        ];

      const lastPrice =
        window.at(-1);

      if (
        nextPrice === undefined ||
        lastPrice === undefined
      ) {
        continue;
      }

      const meanPrice =
        mean(window);

      if (
        meanPrice === null ||
        meanPrice <= 0
      ) {
        continue;
      }

      const deviationPct =
        Math.abs(
          (
            (
              lastPrice -
              meanPrice
            ) /
            meanPrice
          ) * 100,
        );

      const similarityScore =
        roundToTwoDecimals(
          clamp(
            100 -
              deviationPct *
                8,
            0,
            100,
          ),
        );

      const ledToContinuation =
        nextPrice >=
        lastPrice;

      occurrences.push({
        start_index:
          startIndex,

        size,

        last_price:
          lastPrice,

        next_price:
          nextPrice,

        mean_price:
          meanPrice,

        kind:
          classifyBacktestPattern(
            window,
          ),

        similarity_score:
          similarityScore,

        led_to_correction:
          !ledToContinuation,

        led_to_continuation:
          ledToContinuation,
      });
    }
  }

  return occurrences;
}

function buildHistoricalPatternOccurrences(
  prices:
    readonly number[],
): PatternOccurrence[] {
  return buildInternalPatternOccurrences(
    prices,
  ).map(
    (occurrence) => ({
      kind:
        occurrence.kind,

      similarity_score:
        occurrence
          .similarity_score,

      led_to_correction:
        occurrence
          .led_to_correction,

      led_to_continuation:
        occurrence
          .led_to_continuation,
    }),
  );
}

/* ============================================================================
 * 10. FORWARD-RETURN OBSERVATION
 * ----------------------------------------------------------------------------
 * Forward returns are intentionally computed outside RFS and MCI input
 * construction.
 *
 * They are labels used to evaluate prior analytical output. They are never
 * passed back into an analytical producer.
 * ========================================================================== */

function getFutureReturn(
  points:
    readonly BacktestPoint[],
  currentIndex:
    number,
  forwardOffset:
    number,
): number | null {
  const current =
    points[currentIndex];

  const future =
    points[
      currentIndex +
      forwardOffset
    ];

  if (
    current === undefined ||
    future === undefined
  ) {
    return null;
  }

  const result =
    computePercentageChange(
      current.price,
      future.price,
    );

  return result === null
    ? null
    : roundToTwoDecimals(
        result,
      );
}

/* ============================================================================
 * 11. SIGNAL EVALUATION
 * ----------------------------------------------------------------------------
 * EXECUTION ORDER
 * - construct historical universe through the current point
 * - run canonical RFS
 * - run canonical MCI
 * - observe future returns
 *
 * Future returns are unavailable to both analytical calls.
 * ========================================================================== */

function buildSignal(
  points:
    readonly BacktestPoint[],
  currentIndex:
    number,
  configuration:
    ValidatedBacktestConfiguration,
): BacktestSignal | null {
  const currentPoint =
    points[currentIndex];

  if (
    currentPoint === undefined
  ) {
    return null;
  }

  const historicalUniverse =
    points.slice(
      0,
      currentIndex + 1,
    );

  if (
    historicalUniverse.length <
    configuration
      .minimum_history_count
  ) {
    return null;
  }

  const rfsInput =
    buildRfsInput(
      historicalUniverse,
      configuration,
    );

  const rfs =
    runRFS(
      rfsInput,
    );

  const prices =
    historicalUniverse.map(
      (point) =>
        point.price,
    );

  const timestamps =
    historicalUniverse.map(
      (point) =>
        point.ts,
    );

  const historicalPatterns =
    buildHistoricalPatternOccurrences(
      prices,
    );

  const mci =
    runMCI({
      rfs,

      prices:
        [...prices],

      timestamps:
        [...timestamps],

      historical_patterns:
        historicalPatterns,
    });

  /*
   * This section is intentionally after both analytical executions.
   *
   * The future labels cannot influence RFS or MCI because neither value existed
   * when their inputs were constructed and executed.
   */
  const return24h =
    getFutureReturn(
      points,
      currentIndex,
      configuration
        .return_24h_offset,
    );

  const return48h =
    getFutureReturn(
      points,
      currentIndex,
      configuration
        .return_48h_offset,
    );

  const return72h =
    getFutureReturn(
      points,
      currentIndex,
      configuration
        .return_72h_offset,
    );

  return {
    index:
      currentIndex,

    ts:
      currentPoint.ts,

    price:
      currentPoint.price,

    rfs_status:
      rfs.status,

    rfs_propagation_status:
      rfs.propagation_status,

    regime:
      rfs.regime.regime,

    stability_score:
      rfs.stability
        .stability_score,

    opportunity_score:
      mci.opportunity_score,

    decision:
      mci.decision,

    correction_probability:
      mci.correction_probability,

    continuation_probability:
      mci.continuation_probability,

    return_24h:
      return24h,

    return_48h:
      return48h,

    return_72h:
      return72h,
  };
}

/* ============================================================================
 * 12. BACKTEST CORE
 * ========================================================================== */

export function backtestXyvala(
  points:
    readonly BacktestPoint[],
  configuration:
    BacktestConfiguration = {},
): BacktestSignal[] {
  const validatedPoints =
    validateBacktestPoints(
      points,
    );

  const validatedConfiguration =
    validateBacktestConfiguration(
      configuration,
    );

  const requiredPointCount =
    validatedConfiguration
      .minimum_history_count +
    validatedConfiguration
      .maximum_lookahead;

  if (
    validatedPoints.length <
    requiredPointCount
  ) {
    return [];
  }

  const signals:
    BacktestSignal[] =
    [];

  const finalSignalIndexExclusive =
    validatedPoints.length -
    validatedConfiguration
      .maximum_lookahead;

  for (
    let index =
      validatedConfiguration
        .minimum_history_count -
      1;

    index <
    finalSignalIndexExclusive;

    index += 1
  ) {
    const signal =
      buildSignal(
        validatedPoints,
        index,
        validatedConfiguration,
      );

    if (signal !== null) {
      signals.push(
        signal,
      );
    }
  }

  return signals;
}

/* ============================================================================
 * 13. SUMMARY HELPERS
 * ----------------------------------------------------------------------------
 * Empty observed return sets produce null.
 *
 * They never produce zero because zero would falsely describe a computed flat
 * average rather than unavailable observation data.
 * ========================================================================== */

function extractReturns(
  signals:
    readonly BacktestSignal[],
  selector:
    (
      signal:
        BacktestSignal,
    ) =>
      number |
      null,
): number[] {
  return nonNullNumbers(
    signals.map(
      selector,
    ),
  );
}

function averageReturn(
  signals:
    readonly BacktestSignal[],
  selector:
    (
      signal:
        BacktestSignal,
    ) =>
      number |
      null,
): number | null {
  return roundedMean(
    extractReturns(
      signals,
      selector,
    ),
  );
}

export function summarizeBacktest(
  signals:
    readonly BacktestSignal[],
): BacktestSummary {
  const allowSignals =
    signals.filter(
      (signal) =>
        signal.decision ===
        "ALLOW",
    );

  const watchSignals =
    signals.filter(
      (signal) =>
        signal.decision ===
        "WATCH",
    );

  const blockSignals =
    signals.filter(
      (signal) =>
        signal.decision ===
        "BLOCK",
    );

  const unavailableOpportunityCount =
    signals.filter(
      (signal) =>
        signal
          .opportunity_score ===
        null,
    ).length;

  const highOpportunitySignals =
    signals.filter(
      (signal) =>
        signal
          .opportunity_score !==
          null &&
        signal
          .opportunity_score >=
          HIGH_OPPORTUNITY_THRESHOLD,
    );

  return {
    total_signals:
      signals.length,

    allow_count:
      allowSignals.length,

    watch_count:
      watchSignals.length,

    block_count:
      blockSignals.length,

    unavailable_opportunity_count:
      unavailableOpportunityCount,

    avg_return_24h:
      averageReturn(
        signals,
        (signal) =>
          signal.return_24h,
      ),

    avg_return_48h:
      averageReturn(
        signals,
        (signal) =>
          signal.return_48h,
      ),

    avg_return_72h:
      averageReturn(
        signals,
        (signal) =>
          signal.return_72h,
      ),

    allow_avg_return_24h:
      averageReturn(
        allowSignals,
        (signal) =>
          signal.return_24h,
      ),

    allow_avg_return_48h:
      averageReturn(
        allowSignals,
        (signal) =>
          signal.return_48h,
      ),

    allow_avg_return_72h:
      averageReturn(
        allowSignals,
        (signal) =>
          signal.return_72h,
      ),

    block_avg_return_24h:
      averageReturn(
        blockSignals,
        (signal) =>
          signal.return_24h,
      ),

    block_avg_return_48h:
      averageReturn(
        blockSignals,
        (signal) =>
          signal.return_48h,
      ),

    block_avg_return_72h:
      averageReturn(
        blockSignals,
        (signal) =>
          signal.return_72h,
      ),

    high_opportunity_count:
      highOpportunitySignals
        .length,

    high_opportunity_avg_return_24h:
      averageReturn(
        highOpportunitySignals,
        (signal) =>
          signal.return_24h,
      ),

    high_opportunity_avg_return_48h:
      averageReturn(
        highOpportunitySignals,
        (signal) =>
          signal.return_48h,
      ),

    high_opportunity_avg_return_72h:
      averageReturn(
        highOpportunitySignals,
        (signal) =>
          signal.return_72h,
      ),
  };
}

/* ============================================================================
 * 14. DETERMINISTIC MOCK SERIES
 * ----------------------------------------------------------------------------
 * This generator is test-fixture tooling only.
 *
 * It uses:
 * - an explicit seed
 * - an explicit initial timestamp
 * - an explicit interval
 *
 * It never reads the local clock.
 * ========================================================================== */

export function buildMockSeries(
  input:
    BuildMockSeriesInput = {},
): BacktestPoint[] {
  const length =
    input.length ??
    MOCK_SERIES_DEFAULT_LENGTH;

  const basePrice =
    input.base_price ??
    MOCK_SERIES_DEFAULT_BASE_PRICE;

  const volatility =
    input.volatility ??
    MOCK_SERIES_DEFAULT_VOLATILITY;

  const seed =
    input.seed ??
    MOCK_SERIES_DEFAULT_SEED;

  const startTimestamp =
    input.start_timestamp ??
    MOCK_SERIES_DEFAULT_START_TIMESTAMP;

  const intervalMs =
    input.interval_ms ??
    MOCK_SERIES_DEFAULT_INTERVAL_MS;

  if (
    !Number.isInteger(length) ||
    length <= 0
  ) {
    throw new RangeError(
      "BACKTEST_MOCK_LENGTH_INVALID: length must be a positive integer",
    );
  }

  if (
    !isPositiveFiniteNumber(
      basePrice,
    )
  ) {
    throw new RangeError(
      "BACKTEST_MOCK_BASE_PRICE_INVALID: base_price must be a finite positive number",
    );
  }

  if (
    !isFiniteNumber(
      volatility,
    ) ||
    volatility < 0
  ) {
    throw new RangeError(
      "BACKTEST_MOCK_VOLATILITY_INVALID: volatility must be a finite non-negative number",
    );
  }

  if (
    !Number.isInteger(seed) ||
    seed <= 0
  ) {
    throw new RangeError(
      "BACKTEST_MOCK_SEED_INVALID: seed must be a positive integer",
    );
  }

  if (
    !isFiniteNumber(
      startTimestamp,
    ) ||
    startTimestamp < 0
  ) {
    throw new RangeError(
      "BACKTEST_MOCK_START_TIMESTAMP_INVALID: start_timestamp must be a finite non-negative number",
    );
  }

  if (
    !isPositiveFiniteNumber(
      intervalMs,
    )
  ) {
    throw new RangeError(
      "BACKTEST_MOCK_INTERVAL_INVALID: interval_ms must be a finite positive number",
    );
  }

  const points:
    BacktestPoint[] =
    [];

  let currentPrice =
    basePrice;

  let randomState =
    seed %
    2_147_483_647;

  if (randomState === 0) {
    randomState = 1;
  }

  function nextRandom():
    number {
    randomState =
      (
        randomState *
        16_807
      ) %
      2_147_483_647;

    return (
      randomState /
      2_147_483_647
    );
  }

  for (
    let index = 0;
    index < length;
    index += 1
  ) {
    const drift =
      Math.sin(
        index / 20,
      ) *
      volatility;

    const noise =
      (
        nextRandom() -
        0.5
      ) *
      0.3;

    const candidatePrice =
      currentPrice +
      drift +
      noise;

    if (
      !isFiniteNumber(
        candidatePrice,
      )
    ) {
      throw new Error(
        `BACKTEST_MOCK_PRICE_FAILURE: generated price is invalid at index ${index}`,
      );
    }

    currentPrice =
      Math.max(
        1,
        candidatePrice,
      );

    const timestamp =
      startTimestamp +
      index *
        intervalMs;

    if (
      !isFiniteNumber(
        timestamp,
      )
    ) {
      throw new Error(
        `BACKTEST_MOCK_TIMESTAMP_FAILURE: generated timestamp is invalid at index ${index}`,
      );
    }

    points.push({
      ts:
        timestamp,

      price:
        roundToTwoDecimals(
          currentPrice,
        ),
    });
  }

  return points;
}

/* ============================================================================
 * 15. PRIVATE COMMAND-LINE RUNNER
 * ----------------------------------------------------------------------------
 * Console output is isolated to the executable tooling boundary.
 *
 * Analytical functions above remain free of logging and process mutation.
 * ========================================================================== */

function isDirectExecution():
  boolean {
  const scriptPath =
    process.argv[1];

  return (
    typeof scriptPath ===
      "string" &&
    import.meta.url ===
      `file://${scriptPath}`
  );
}

if (isDirectExecution()) {
  try {
    const series =
      buildMockSeries({
        length:
          500,

        seed:
          42,

        start_timestamp:
          MOCK_SERIES_DEFAULT_START_TIMESTAMP,

        interval_ms:
          MOCK_SERIES_DEFAULT_INTERVAL_MS,
      });

    const signals =
      backtestXyvala(
        series,
        {
          minimum_history_count:
            DEFAULT_MINIMUM_HISTORY_COUNT,

          return_24h_offset:
            DEFAULT_RETURN_24H_OFFSET,

          return_48h_offset:
            DEFAULT_RETURN_48H_OFFSET,

          return_72h_offset:
            DEFAULT_RETURN_72H_OFFSET,

          quote_currency:
            DEFAULT_QUOTE_CURRENCY,

          source_version:
            DEFAULT_SOURCE_VERSION,

          data_version:
            DEFAULT_DATA_VERSION,
        },
      );

    const summary =
      summarizeBacktest(
        signals,
      );

    console.log(
      JSON.stringify(
        {
          ok:
            true,

          signal_count:
            signals.length,

          summary,

          sample_signals:
            signals.slice(
              -5,
            ),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "BACKTEST_EXECUTION_FAILED";

    console.error(
      JSON.stringify(
        {
          ok:
            false,

          error:
            message,
        },
        null,
        2,
      ),
    );

    process.exitCode =
      1;
  }
}
