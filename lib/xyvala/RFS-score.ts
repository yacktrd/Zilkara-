/* ============================================================================
 * FILE: lib/xyvala/RFS-score.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala deterministic RFS structural score engine
 *
 * ROLE
 * - validate the Acquisition -> RFS boundary
 * - compute the canonical deterministic RFS structural truth
 * - segment real observations into monthly and quarterly windows
 * - compare current and historical structural signatures
 * - compute structural axes, pattern, stability, regime and rupture readings
 * - compute structural rupture evolution owned by RFS
 * - contextualize global, 7D and 24H structural horizons
 * - return the canonical versioned RFS score contract
 *
 * CLASSIFICATION
 * - PRIVATE ANALYTICAL ENGINE
 * - COMPUTE
 * - PURE
 * - NON-MUTATING
 *
 * PARENTS
 * - Acquisition Layer
 * - Pattern Layer
 * - RFS score contract
 *
 * CONSUMERS
 * - Triple Layer input adapter
 * - Impulse Layer input adapter
 * - Crash System input adapter
 * - Neutralization System input adapter
 * - Analytical Aggregation System input adapter
 * - private snapshot projection
 *
 * DIRECTIVES
 * - RFS truth only
 * - no Triple Layer computation
 * - no Impulse Layer computation
 * - no Crash System computation
 * - no MCI computation
 * - no calibration
 * - no snapshot shaping
 * - no transformer logic
 * - no ranking logic
 * - no API logic
 * - no UI logic
 * - no persistence
 * - no event publication
 * - no runtime mutation
 * - no timestamp generation
 * - no silent sorting
 * - no observation repair
 * - no unavailable-to-neutral substitution
 * - no synthetic analytical truth
 * - same validated input and versions => same output
 *
 * INPUTS
 * - real ordered price observations
 * - real strictly increasing timestamps
 * - explicit quote currency
 * - explicit source and data versions
 *
 * OUTPUTS
 * - RfsScoreResult
 *
 * INVARIANTS
 * - RFS owns structural truth
 * - RFS owns stability truth
 * - RFS owns regime truth
 * - RFS owns rupture truth
 * - RFS owns structural rupture evolution truth
 * - RFS does not own crash truth
 * - RFS does not own impulse truth
 * - RFS does not own decision confidence
 * - null means unavailable
 * - zero remains a valid computed value
 * - 7D contextualizes recent structure only
 * - 24H contextualizes immediate timing only
 * - temporal contexts never replace global structure
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/rfs/contracts/rfs-score-contract.ts
 * - lib/xyvala/rfs/rfs-types.ts
 * - lib/xyvala/pattern-core.ts
 *
 * BOUNDARIES
 * - Acquisition -> RFS
 * - RFS -> downstream private analytical layers
 *
 * FIRST DIVERGENCE
 * - invalid observations or metadata
 *   => Acquisition -> RFS boundary
 *
 * - valid input but invalid RFS output
 *   => RFS producer
 *
 * - valid RFS output altered or reconstructed
 *   => first downstream propagation boundary
 *
 * SENSITIVE ZONES
 * - observation validation
 * - timestamp monotonicity
 * - pattern-state mapping
 * - monthly segmentation
 * - historical reference selection
 * - structural-axis availability
 * - rupture evolution qualification
 * - temporal horizon availability
 * - output contract construction
 * ========================================================================== */

import type {
  RfsRegimeState,
} from "@/lib/xyvala/rfs/rfs-types";

import {
  RFS_SCORE_ANALYTICAL_VERSION,
  RFS_SCORE_CONTRACT_NAME,
  RFS_SCORE_CONTRACT_VERSION,
  type RfsAvailabilityReason,
  type RfsComputationStatus,
  type RfsHistoricalMode,
  type RfsPatternState,
  type RfsPriceObservation,
  type RfsPropagationStatus,
  type RfsQuoteCurrency,
  type RfsRuptureEvolutionState,
  type RfsScoreInput,
  type RfsScoreResult,
  type RfsStabilityState,
  type RfsTemporalReading,
  type RfsTimingState,
  type RfsValidationIssue,
} from "@/lib/xyvala/rfs/contracts/rfs-score-contract";

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

export type {
  RfsScoreInput,
  RfsScoreResult,
} from "@/lib/xyvala/rfs/contracts/rfs-score-contract";

/* ============================================================================
 * 1. INTERNAL TYPES
 * ========================================================================== */

type ValidatedRfsInput = Readonly<{
  prices: readonly number[];
  timestamps: readonly number[];

  observation_count: number;
  first_timestamp: number;
  last_timestamp: number;

  quote_currency: RfsQuoteCurrency;
  source: RfsScoreInput["metadata"]["source"];
  source_version: string;
  data_version: string;
}>;

type SegmentWindow = Readonly<{
  start_index: number;
  end_index: number;

  prices: readonly number[];
  timestamps: readonly number[];

  quarter_index: 0 | 1 | 2 | 3;
  year: number;
  month: number;
}>;

type QuarterBundle = Readonly<{
  quarter_index: 0 | 1 | 2 | 3;
  year: number;
  windows: readonly SegmentWindow[];
}>;

type SegmentSignature = Readonly<{
  pattern_kind: PatternKind;
  pattern_state: RfsPatternState;

  slope_pct: number;
  amplitude_pct: number;
  instability_score: number;
  break_rate: number;
  quality_score: number;
  duration_score: number;

  sample_size: number;
}>;

type StructuralComparison = Readonly<{
  similarity_score: number;
  rupture_gap_score: number;
  continuity_score: number;
  duration_similarity_score: number;

  direction_consistency_score: number;
  change_consistency_score: number;

  reference_pattern_kind: PatternKind;
}>;

type StructuralAxesResult = Readonly<{
  occurrence_score: number | null;
  frequency_score: number | null;
  convergence_score: number | null;
  duration_score: number | null;
  evolution_score: number | null;
  growth_score: number | null;

  correlation_score: number | null;
  direction_consistency_score: number | null;
  change_consistency_score: number | null;

  status: RfsComputationStatus;
  availability_reason: RfsAvailabilityReason;
}>;

type RuptureAxesResult = Readonly<{
  rupture_occurrence_score: number | null;
  rupture_frequency_score: number | null;
  rupture_convergence_score: number | null;
  rupture_duration_score: number | null;
  rupture_evolution_score: number | null;

  rupture_correlation_score: number | null;

  status: RfsComputationStatus;
  availability_reason: RfsAvailabilityReason;
}>;

type RuptureEvolutionResult = Readonly<{
  rupture_evolution_state: RfsRuptureEvolutionState;

  rupture_acceleration_score: number | null;
  rupture_persistence_score: number | null;
  rupture_deceleration_score: number | null;

  status: RfsComputationStatus;
  availability_reason: RfsAvailabilityReason;
}>;

type TemporalWindow = Readonly<{
  horizon: "GLOBAL" | "7D" | "24H";

  prices: readonly number[];
  timestamps: readonly number[];

  status: RfsComputationStatus;
  availability_reason: RfsAvailabilityReason;
}>;

/* ============================================================================
 * 2. GOVERNED CONSTANTS
 * ========================================================================== */

const MINIMUM_PRICE_COUNT = 8;
const MINIMUM_SEGMENT_POINT_COUNT = 4;
const MINIMUM_TEMPORAL_POINT_COUNT = 2;

const MILLISECONDS_PER_HOUR = 3_600_000;
const MILLISECONDS_PER_DAY = 86_400_000;

const APPROXIMATE_DAYS_PER_MONTH = 30;
const MONTHS_REQUIRED_FOR_YEAR_PHASE_COMPARISON = 12;

const MAXIMUM_OCCURRENCE_REFERENCE_COUNT = 24;
const MAXIMUM_DURATION_NORMALIZATION_DAYS = 120;

const STRONG_SIMILARITY_THRESHOLD = 70;
const RUPTURE_COMPARISON_THRESHOLD = 50;

const STABILITY_HIGH_THRESHOLD = 70;
const STABILITY_MODERATE_THRESHOLD = 45;

const RUPTURE_EXPLOSIVE_THRESHOLD = 75;
const RUPTURE_INCREASING_THRESHOLD = 60;
const RUPTURE_PERSISTENT_THRESHOLD = 55;
const RUPTURE_DECREASING_THRESHOLD = 45;

/* ============================================================================
 * 3. SAFE NUMERIC PRIMITIVES
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
  minimum = 0,
  maximum = 100,
): number {
  if (!isFiniteNumber(value)) {
    return minimum;
  }

  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

function roundToTwoDecimals(
  value: number,
): number {
  if (!isFiniteNumber(value)) {
    return 0;
  }

  return (
    Math.round(value * 100) /
    100
  );
}

function normalizeScore(
  value: number,
): number {
  return roundToTwoDecimals(
    clamp(value),
  );
}

function mean(
  values: readonly number[],
): number {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce(
      (total, value) =>
        total + value,
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

  const average =
    mean(values);

  const variance =
    mean(
      values.map(
        (value) =>
          (value - average) ** 2,
      ),
    );

  return Math.sqrt(variance);
}

function safeDivide(
  numerator: number,
  denominator: number,
): number {
  if (
    !isFiniteNumber(numerator) ||
    !isFiniteNumber(denominator) ||
    denominator === 0
  ) {
    return 0;
  }

  return numerator / denominator;
}

function firstNumber(
  values: readonly number[],
): number | null {
  const value =
    values[0];

  return isFiniteNumber(value)
    ? value
    : null;
}

function lastNumber(
  values: readonly number[],
): number | null {
  const value =
    values.at(-1);

  return isFiniteNumber(value)
    ? value
    : null;
}

function computePercentageChange(
  initialValue: number,
  finalValue: number,
): number {
  if (
    !isFiniteNumber(initialValue) ||
    !isFiniteNumber(finalValue) ||
    initialValue === 0
  ) {
    return 0;
  }

  return roundToTwoDecimals(
    (
      (finalValue - initialValue) /
      Math.abs(initialValue)
    ) * 100,
  );
}

function computeMetricSimilarity(
  currentValue: number,
  referenceValue: number,
  tolerance: number,
): number {
  if (tolerance <= 0) {
    return 0;
  }

  return normalizeScore(
    100 -
      safeDivide(
        Math.abs(
          currentValue -
            referenceValue,
        ),
        tolerance,
      ) *
        100,
  );
}

/* ============================================================================
 * 4. ACQUISITION -> RFS BOUNDARY VALIDATION
 * ========================================================================== */

function validateObservation(
  observation: RfsPriceObservation,
  index: number,
): void {
  if (
    observation === null ||
    typeof observation !== "object"
  ) {
    throw new TypeError(
      `RFS_OBSERVATION_INVALID: observations[${index}] must be an object`,
    );
  }

  if (
    !isFiniteNumber(
      observation.price,
    ) ||
    observation.price <= 0
  ) {
    throw new RangeError(
      `RFS_PRICE_INVALID: observations[${index}].price must be a finite positive number`,
    );
  }

  if (
    !isFiniteNumber(
      observation.timestamp,
    ) ||
    observation.timestamp < 0
  ) {
    throw new RangeError(
      `RFS_TIMESTAMP_INVALID: observations[${index}].timestamp must be a finite non-negative number`,
    );
  }
}

function validateNonEmptyVersion(
  value: unknown,
  variableName: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new TypeError(
      `RFS_METADATA_INVALID: ${variableName} must be a non-empty string`,
    );
  }

  return value;
}

function validateRfsInput(
  input: RfsScoreInput,
): ValidatedRfsInput {
  if (
    input === null ||
    typeof input !== "object"
  ) {
    throw new TypeError(
      "RFS_INPUT_INVALID: input must be an object",
    );
  }

  if (
    !Array.isArray(
      input.observations,
    )
  ) {
    throw new TypeError(
      "RFS_OBSERVATIONS_INVALID: observations must be an array",
    );
  }

  if (
    input.observations.length <
    MINIMUM_PRICE_COUNT
  ) {
    throw new RangeError(
      `RFS_PRICES_INSUFFICIENT: at least ${MINIMUM_PRICE_COUNT} observations are required`,
    );
  }

  if (
    input.metadata === null ||
    typeof input.metadata !==
      "object"
  ) {
    throw new TypeError(
      "RFS_METADATA_INVALID: metadata must be an object",
    );
  }

  const prices: number[] = [];
  const timestamps: number[] = [];

  input.observations.forEach(
    (observation, index) => {
      validateObservation(
        observation,
        index,
      );

      prices.push(
        observation.price,
      );

      timestamps.push(
        observation.timestamp,
      );
    },
  );

  for (
    let index = 1;
    index < timestamps.length;
    index += 1
  ) {
    const previousTimestamp =
      timestamps[index - 1];

    const currentTimestamp =
      timestamps[index];

    if (
      previousTimestamp ===
        undefined ||
      currentTimestamp ===
        undefined ||
      currentTimestamp <=
        previousTimestamp
    ) {
      throw new RangeError(
        `RFS_TIMESTAMP_ORDER_INVALID: timestamps must be strictly increasing at observation ${index}`,
      );
    }
  }

  const firstTimestamp =
    timestamps[0];

  const lastTimestamp =
    timestamps.at(-1);

  if (
    firstTimestamp === undefined ||
    lastTimestamp === undefined
  ) {
    throw new Error(
      "RFS_VALIDATED_SERIES_INVALID: validated timestamps are unavailable",
    );
  }

  return {
    prices,
    timestamps,

    observation_count:
      prices.length,

    first_timestamp:
      firstTimestamp,

    last_timestamp:
      lastTimestamp,

    quote_currency:
      input.metadata
        .quote_currency,

    source:
      input.metadata.source,

    source_version:
      validateNonEmptyVersion(
        input.metadata
          .source_version,
        "source_version",
      ),

    data_version:
      validateNonEmptyVersion(
        input.metadata
          .data_version,
        "data_version",
      ),
  };
}

/* ============================================================================
 * 5. TIME HELPERS
 * ========================================================================== */

function computeTimestampSpanDays(
  timestamps: readonly number[],
): number {
  const firstTimestamp =
    firstNumber(timestamps);

  const lastTimestamp =
    lastNumber(timestamps);

  if (
    firstTimestamp === null ||
    lastTimestamp === null
  ) {
    return 0;
  }

  return Math.max(
    0,
    (
      lastTimestamp -
      firstTimestamp
    ) /
      MILLISECONDS_PER_DAY,
  );
}

function computeTimestampSpanMonths(
  timestamps: readonly number[],
): number {
  return (
    computeTimestampSpanDays(
      timestamps,
    ) /
    APPROXIMATE_DAYS_PER_MONTH
  );
}

function resolveHistoricalMode(
  timestamps: readonly number[],
): RfsHistoricalMode {
  const monthSpan =
    computeTimestampSpanMonths(
      timestamps,
    );

  if (monthSpan < 2) {
    return "INSUFFICIENT_HISTORY";
  }

  if (
    monthSpan <
    MONTHS_REQUIRED_FOR_YEAR_PHASE_COMPARISON
  ) {
    return "MONTH_TO_MONTH";
  }

  return "YEAR_PHASE_COMPARISON";
}

function resolveQuarterIndex(
  timestamp: number,
): 0 | 1 | 2 | 3 {
  const quarter =
    Math.floor(
      new Date(timestamp)
        .getUTCMonth() / 3,
    );

  if (quarter === 1) {
    return 1;
  }

  if (quarter === 2) {
    return 2;
  }

  if (quarter === 3) {
    return 3;
  }

  return 0;
}

function computeDurationScore(
  timestamps: readonly number[],
): number {
  const spanDays =
    computeTimestampSpanDays(
      timestamps,
    );

  if (spanDays <= 0) {
    return 0;
  }

  return normalizeScore(
    (
      Math.min(
        spanDays,
        MAXIMUM_DURATION_NORMALIZATION_DAYS,
      ) /
      MAXIMUM_DURATION_NORMALIZATION_DAYS
    ) * 100,
  );
}

/* ============================================================================
 * 6. SEGMENTATION
 * ========================================================================== */

function buildMonthlyWindows(
  prices: readonly number[],
  timestamps: readonly number[],
): SegmentWindow[] {
  const windows: SegmentWindow[] =
    [];

  let startIndex = 0;

  for (
    let index = 1;
    index <= timestamps.length;
    index += 1
  ) {
    const previousTimestamp =
      timestamps[index - 1];

    if (
      previousTimestamp ===
      undefined
    ) {
      continue;
    }

    const previousDate =
      new Date(
        previousTimestamp,
      );

    const currentTimestamp =
      index < timestamps.length
        ? timestamps[index]
        : null;

    const currentDate =
      currentTimestamp === null ||
      currentTimestamp === undefined
        ? null
        : new Date(
            currentTimestamp,
          );

    const monthChanged =
      currentDate === null ||
      currentDate
        .getUTCFullYear() !==
        previousDate
          .getUTCFullYear() ||
      currentDate.getUTCMonth() !==
        previousDate.getUTCMonth();

    if (!monthChanged) {
      continue;
    }

    const endIndex =
      index - 1;

    const windowPrices =
      prices.slice(
        startIndex,
        endIndex + 1,
      );

    const windowTimestamps =
      timestamps.slice(
        startIndex,
        endIndex + 1,
      );

    if (
      windowPrices.length >=
      MINIMUM_SEGMENT_POINT_COUNT
    ) {
      windows.push({
        start_index:
          startIndex,

        end_index:
          endIndex,

        prices:
          windowPrices,

        timestamps:
          windowTimestamps,

        quarter_index:
          resolveQuarterIndex(
            previousTimestamp,
          ),

        year:
          previousDate
            .getUTCFullYear(),

        month:
          previousDate
            .getUTCMonth(),
      });
    }

    startIndex =
      index;
  }

  return windows;
}

function buildQuarterBundles(
  windows: readonly SegmentWindow[],
): QuarterBundle[] {
  const mutableBundles =
    new Map<
      string,
      {
        quarter_index:
          0 | 1 | 2 | 3;
        year: number;
        windows: SegmentWindow[];
      }
    >();

  for (const window of windows) {
    const key =
      `${window.year}:${window.quarter_index}`;

    const existing =
      mutableBundles.get(key);

    if (existing) {
      existing.windows.push(
        window,
      );

      continue;
    }

    mutableBundles.set(key, {
      quarter_index:
        window.quarter_index,

      year:
        window.year,

      windows:
        [window],
    });
  }

  return Array.from(
    mutableBundles.values(),
  ).sort(
    (left, right) =>
      left.year === right.year
        ? left.quarter_index -
          right.quarter_index
        : left.year -
          right.year,
  );
}

function flattenQuarterBundle(
  bundle: QuarterBundle,
): SegmentWindow | null {
  const firstWindow =
    bundle.windows[0];

  const lastWindow =
    bundle.windows.at(-1);

  if (
    firstWindow === undefined ||
    lastWindow === undefined
  ) {
    return null;
  }

  return {
    start_index:
      firstWindow.start_index,

    end_index:
      lastWindow.end_index,

    prices:
      bundle.windows.flatMap(
        (window) =>
          window.prices,
      ),

    timestamps:
      bundle.windows.flatMap(
        (window) =>
          window.timestamps,
      ),

    quarter_index:
      bundle.quarter_index,

    year:
      bundle.year,

    month:
      lastWindow.month,
  };
}

function buildFullWindow(
  input: ValidatedRfsInput,
): SegmentWindow {
  const firstDate =
    new Date(
      input.first_timestamp,
    );

  return {
    start_index: 0,

    end_index:
      input.observation_count - 1,

    prices:
      input.prices,

    timestamps:
      input.timestamps,

    quarter_index:
      resolveQuarterIndex(
        input.first_timestamp,
      ),

    year:
      firstDate
        .getUTCFullYear(),

    month:
      firstDate
        .getUTCMonth(),
  };
}

/* ============================================================================
 * 7. PATTERN MAPPING AND SIGNATURE
 * ========================================================================== */

function mapPatternKindToRfsState(
  patternKind: PatternKind,
): RfsPatternState {
  const normalizedKind =
    String(patternKind)
      .trim()
      .toUpperCase();

  switch (normalizedKind) {
    case "ASCENDING":
    case "UP":
    case "UPTREND":
    case "BULLISH":
      return "ASCENDING";

    case "DESCENDING":
    case "DOWN":
    case "DOWNTREND":
    case "BEARISH":
      return "DESCENDING";

    case "RANGE":
    case "RANGING":
    case "SIDEWAYS":
    case "STABLE":
    case "FLAT":
      return "RANGE";

    case "EXPANDING":
    case "EXPANSION":
      return "EXPANDING";

    case "COMPRESSING":
    case "COMPRESSION":
      return "COMPRESSING";

    case "FRAGMENTED":
    case "FRAGMENTATION":
      return "FRAGMENTED";

    case "IRREGULAR":
    case "VOLATILE":
    case "NOISY":
    case "MIXED":
      return "IRREGULAR";

    default:
      return "UNAVAILABLE";
  }
}

function computeSegmentSignature(
  window: SegmentWindow,
): SegmentSignature {
  const patternKind =
    classifyPattern(
      [...window.prices],
    );

  return {
    pattern_kind:
      patternKind,

    pattern_state:
      mapPatternKindToRfsState(
        patternKind,
      ),

    slope_pct:
      roundToTwoDecimals(
        computePatternSlopePct(
          [...window.prices],
        ),
      ),

    amplitude_pct:
      roundToTwoDecimals(
        computePatternAmplitudePct(
          [...window.prices],
        ),
      ),

    instability_score:
      normalizeScore(
        computePatternInstabilityScore(
          [...window.prices],
        ),
      ),

    break_rate:
      roundToTwoDecimals(
        computePatternBreakRate(
          [...window.prices],
        ),
      ),

    quality_score:
      normalizeScore(
        computePatternQuality(
          [...window.prices],
        ),
      ),

    duration_score:
      computeDurationScore(
        window.timestamps,
      ),

    sample_size:
      window.prices.length,
  };
}

/* ============================================================================
 * 8. STRUCTURAL COMPARISONS
 * ========================================================================== */

function computePatternSimilarity(
  current: SegmentSignature,
  reference: SegmentSignature,
): number {
  const kindSimilarity =
    computePatternKindSimilarity(
      current.pattern_kind,
      reference.pattern_kind,
    );

  return normalizeScore(
    kindSimilarity * 0.14 +
      computeMetricSimilarity(
        current.slope_pct,
        reference.slope_pct,
        20,
      ) *
        0.22 +
      computeMetricSimilarity(
        current.amplitude_pct,
        reference.amplitude_pct,
        30,
      ) *
        0.16 +
      computeMetricSimilarity(
        current.instability_score,
        reference.instability_score,
        50,
      ) *
        0.22 +
      computeMetricSimilarity(
        current.break_rate,
        reference.break_rate,
        0.6,
      ) *
        0.14 +
      computeMetricSimilarity(
        current.duration_score,
        reference.duration_score,
        40,
      ) *
        0.12,
  );
}

function computeRuptureGap(
  current: SegmentSignature,
  reference: SegmentSignature,
  similarityScore: number,
): number {
  const currentFragility =
    current.instability_score *
      0.38 +
    current.break_rate *
      100 *
      0.38 +
    (
      100 -
      current.duration_score
    ) *
      0.24;

  const referenceFragility =
    reference.instability_score *
      0.38 +
    reference.break_rate *
      100 *
      0.38 +
    (
      100 -
      reference.duration_score
    ) *
      0.24;

  return normalizeScore(
    Math.max(
      0,
      currentFragility -
        referenceFragility,
    ) *
      0.62 +
      (
        100 -
        similarityScore
      ) *
        0.38,
  );
}

function computeDirectionConsistency(
  current: SegmentSignature,
  reference: SegmentSignature,
): number {
  const currentDirection =
    Math.sign(
      current.slope_pct,
    );

  const referenceDirection =
    Math.sign(
      reference.slope_pct,
    );

  if (
    currentDirection === 0 &&
    referenceDirection === 0
  ) {
    return 100;
  }

  if (
    currentDirection === 0 ||
    referenceDirection === 0
  ) {
    return 50;
  }

  return currentDirection ===
    referenceDirection
    ? 100
    : 0;
}

function computeChangeConsistency(
  current: SegmentSignature,
  reference: SegmentSignature,
): number {
  return normalizeScore(
    computeMetricSimilarity(
      current.slope_pct,
      reference.slope_pct,
      20,
    ) *
      0.6 +
      computeMetricSimilarity(
        current.amplitude_pct,
        reference.amplitude_pct,
        30,
      ) *
        0.4,
  );
}

function computeContinuityScore(
  input: {
    similarity_score: number;
    direction_consistency_score: number;
    duration_similarity_score: number;
    current_break_rate: number;
    reference_break_rate: number;
  },
): number {
  const breakRateSimilarity =
    normalizeScore(
      100 -
        clamp(
          Math.abs(
            input.current_break_rate -
              input.reference_break_rate,
          ) * 100,
        ),
    );

  return normalizeScore(
    input.similarity_score *
      0.54 +
      input.direction_consistency_score *
        0.2 +
      input.duration_similarity_score *
        0.16 +
      breakRateSimilarity *
        0.1,
  );
}

function compareCurrentToHistory(
  current: SegmentSignature,
  references:
    readonly SegmentSignature[],
): StructuralComparison[] {
  return references.map(
    (reference) => {
      const similarityScore =
        computePatternSimilarity(
          current,
          reference,
        );

      const durationSimilarityScore =
        computeMetricSimilarity(
          current.duration_score,
          reference.duration_score,
          40,
        );

      const directionConsistencyScore =
        computeDirectionConsistency(
          current,
          reference,
        );

      const changeConsistencyScore =
        computeChangeConsistency(
          current,
          reference,
        );

      return {
        similarity_score:
          similarityScore,

        rupture_gap_score:
          computeRuptureGap(
            current,
            reference,
            similarityScore,
          ),

        continuity_score:
          computeContinuityScore({
            similarity_score:
              similarityScore,

            direction_consistency_score:
              directionConsistencyScore,

            duration_similarity_score:
              durationSimilarityScore,

            current_break_rate:
              current.break_rate,

            reference_break_rate:
              reference.break_rate,
          }),

        duration_similarity_score:
          durationSimilarityScore,

        direction_consistency_score:
          directionConsistencyScore,

        change_consistency_score:
          changeConsistencyScore,

        reference_pattern_kind:
          reference.pattern_kind,
      };
    },
  );
}

/* ============================================================================
 * 9. HISTORICAL REFERENCE SELECTION
 * ========================================================================== */

function selectReferenceWindows(
  input: {
    historical_mode:
      RfsHistoricalMode;

    monthly_windows:
      readonly SegmentWindow[];

    current_window:
      SegmentWindow;
  },
): SegmentWindow[] {
  if (
    input.monthly_windows.length <=
    1
  ) {
    return [];
  }

  if (
    input.historical_mode ===
    "YEAR_PHASE_COMPARISON"
  ) {
    return input.monthly_windows.filter(
      (window) =>
        window.quarter_index ===
          input.current_window
            .quarter_index &&
        window.year <
          input.current_window.year,
    );
  }

  if (
    input.historical_mode ===
    "MONTH_TO_MONTH"
  ) {
    return input.monthly_windows.slice(
      0,
      -1,
    );
  }

  return [];
}

/* ============================================================================
 * 10. STRUCTURAL AXES
 * ========================================================================== */

function computeGrowthScore(
  input: {
    current_score: number;
    current_quarter_score: number;
    historical_baseline_score:
      number | null;
  },
): number | null {
  if (
    input.historical_baseline_score ===
    null
  ) {
    return null;
  }

  const monthGrowth =
    clamp(
      50 +
        (
          input.current_score -
          input
            .historical_baseline_score
        ),
    );

  const quarterGrowth =
    clamp(
      50 +
        (
          input.current_quarter_score -
          input
            .historical_baseline_score
        ),
    );

  return normalizeScore(
    monthGrowth * 0.55 +
      quarterGrowth * 0.45,
  );
}

function computeStructuralAxes(
  input: {
    comparisons:
      readonly StructuralComparison[];

    current_score: number;

    current_quarter_score: number;

    historical_baseline_score:
      number | null;
  },
): StructuralAxesResult {
  if (
    input.comparisons.length === 0
  ) {
    return {
      occurrence_score: null,
      frequency_score: null,
      convergence_score: null,
      duration_score: null,
      evolution_score: null,

      growth_score:
        computeGrowthScore({
          current_score:
            input.current_score,

          current_quarter_score:
            input.current_quarter_score,

          historical_baseline_score:
            input
              .historical_baseline_score,
        }),

      correlation_score: null,
      direction_consistency_score:
        null,
      change_consistency_score:
        null,

      status:
        "insufficient_data",

      availability_reason:
        "historical_comparison_insufficient",
    };
  }

  const strongOccurrenceCount =
    input.comparisons.filter(
      (comparison) =>
        comparison.similarity_score >=
        STRONG_SIMILARITY_THRESHOLD,
    ).length;

  const correlationScore =
    input.comparisons.length < 2
      ? null
      : normalizeScore(
          100 -
            clamp(
              standardDeviation(
                input.comparisons.map(
                  (comparison) =>
                    comparison
                      .similarity_score,
                ),
              ),
            ),
        );

  const directionConsistencyScore =
    normalizeScore(
      mean(
        input.comparisons.map(
          (comparison) =>
            comparison
              .direction_consistency_score,
        ),
      ),
    );

  const changeConsistencyScore =
    normalizeScore(
      mean(
        input.comparisons.map(
          (comparison) =>
            comparison
              .change_consistency_score,
        ),
      ),
    );

  const evolutionScore =
    correlationScore === null
      ? normalizeScore(
          directionConsistencyScore *
            0.55 +
            changeConsistencyScore *
              0.45,
        )
      : normalizeScore(
          correlationScore * 0.4 +
            directionConsistencyScore *
              0.32 +
            changeConsistencyScore *
              0.28,
        );

  return {
    occurrence_score:
      normalizeScore(
        (
          Math.min(
            input.comparisons.length,
            MAXIMUM_OCCURRENCE_REFERENCE_COUNT,
          ) /
          MAXIMUM_OCCURRENCE_REFERENCE_COUNT
        ) * 100,
      ),

    frequency_score:
      normalizeScore(
        safeDivide(
          strongOccurrenceCount,
          input.comparisons.length,
        ) * 100,
      ),

    convergence_score:
      normalizeScore(
        mean(
          input.comparisons.map(
            (comparison) =>
              comparison
                .continuity_score,
          ),
        ),
      ),

    duration_score:
      normalizeScore(
        mean(
          input.comparisons.map(
            (comparison) =>
              comparison
                .duration_similarity_score,
          ),
        ),
      ),

    evolution_score:
      evolutionScore,

    growth_score:
      computeGrowthScore({
        current_score:
          input.current_score,

        current_quarter_score:
          input.current_quarter_score,

        historical_baseline_score:
          input
            .historical_baseline_score,
      }),

    correlation_score:
      correlationScore,

    direction_consistency_score:
      directionConsistencyScore,

    change_consistency_score:
      changeConsistencyScore,

    status:
      correlationScore === null
        ? "partial"
        : "computed",

    availability_reason:
      "available",
  };
}

function computeStructuralScore(
  axes: StructuralAxesResult,
): number | null {
  const values = [
    axes.occurrence_score,
    axes.frequency_score,
    axes.convergence_score,
    axes.duration_score,
    axes.evolution_score,
    axes.growth_score,
  ];

  if (
    values.some(
      (value) =>
        value === null,
    )
  ) {
    return null;
  }

  const [
    occurrence,
    frequency,
    convergence,
    duration,
    evolution,
    growth,
  ] = values as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];

  return normalizeScore(
    occurrence * 0.18 +
      frequency * 0.14 +
      convergence * 0.22 +
      duration * 0.16 +
      evolution * 0.18 +
      growth * 0.12,
  );
}

/* ============================================================================
 * 11. RUPTURE AND RUPTURE EVOLUTION
 * ----------------------------------------------------------------------------
 * ROLE
 * - compute the canonical RFS rupture axes from validated structural comparisons
 * - compute rupture probability from independent governed rupture axes
 * - qualify structural rupture evolution from an ordered historical series
 *
 * CLASSIFICATION
 * - COMPUTE
 * - PURE
 * - DETERMINISTIC
 * - NON-MUTATING
 *
 * OWNERSHIP
 * - RFS owns rupture_score
 * - RFS owns rupture_probability
 * - RFS owns rupture_penalty_score
 * - RFS owns continuity_probability
 * - RFS owns structural rupture evolution
 *
 * NON-OWNERSHIP
 * - this section does not compute crash_score
 * - this section does not compute crash_state
 * - this section does not compute neutralization
 * - this section does not compute Triple Layer truth
 * - this section does not compute Impulse Layer truth
 *
 * INVARIANTS
 * - missing historical evidence remains null
 * - zero remains a valid computed value
 * - unavailable evidence is never replaced with a neutral score
 * - rupture axes remain independent from structural continuity axes
 * - rupture probability and rupture score retain distinct identities
 * - rupture evolution requires an ordered and sufficiently populated series
 * - rupture evolution is never inferred from a single observation
 * - no downstream layer may reconstruct these variables
 *
 * ORDERING CONTRACT
 * - comparisons must preserve the chronological order of reference windows
 * - buildMonthlyWindows() produces chronological windows
 * - selectReferenceWindows() must preserve that order
 * - compareCurrentToHistory() must preserve input order
 *
 * FIRST DIVERGENCE
 * - missing comparisons
 *   => historical comparison boundary
 *
 * - unordered comparisons
 *   => reference selection or comparison boundary
 *
 * - valid comparisons but invalid rupture result
 *   => RFS rupture producer
 * ========================================================================== */

const MINIMUM_RUPTURE_EVOLUTION_OBSERVATION_COUNT =
  3;

const RUPTURE_PERSISTENCE_EVENT_THRESHOLD =
  RUPTURE_COMPARISON_THRESHOLD;

const RUPTURE_EVOLUTION_DELTA_TOLERANCE =
  5;

const RUPTURE_ACCELERATION_STATE_THRESHOLD =
  60;

const RUPTURE_DECELERATION_STATE_THRESHOLD =
  60;

const RUPTURE_EXPLOSIVE_ACCELERATION_THRESHOLD =
  65;

/**
 * Computes the occurrence axis from the absolute number of rupture-like
 * historical comparisons.
 *
 * This axis measures observed presence, not frequency.
 */
function computeRuptureOccurrenceScore(
  ruptureLikeCount: number,
): number {
  return normalizeScore(
    (
      Math.min(
        ruptureLikeCount,
        MAXIMUM_OCCURRENCE_REFERENCE_COUNT,
      ) /
      MAXIMUM_OCCURRENCE_REFERENCE_COUNT
    ) * 100,
  );
}

/**
 * Computes the frequency axis from the proportion of rupture-like comparisons.
 *
 * This remains independent from occurrence:
 * - occurrence measures observed count
 * - frequency measures relative recurrence
 */
function computeRuptureFrequencyScore(
  ruptureLikeCount: number,
  comparisonCount: number,
): number {
  return normalizeScore(
    safeDivide(
      ruptureLikeCount,
      comparisonCount,
    ) * 100,
  );
}

/**
 * Computes convergence from the mean rupture gap observed across comparable
 * historical structures.
 *
 * A high value means that independent comparisons converge toward a material
 * structural rupture reading.
 */
function computeRuptureConvergenceScore(
  comparisons:
    readonly StructuralComparison[],
): number {
  return normalizeScore(
    mean(
      comparisons.map(
        (comparison) =>
          comparison
            .rupture_gap_score,
      ),
    ),
  );
}

/**
 * Computes rupture duration pressure from current structural persistence.
 *
 * This does not measure chronological rupture evolution.
 * It measures whether the current structure combines:
 * - weak temporal persistence
 * - elevated break concentration
 */
function computeRuptureDurationScore(
  currentSignature:
    SegmentSignature,
): number {
  const durationFragilityScore =
    normalizeScore(
      100 -
        currentSignature
          .duration_score,
    );

  const breakConcentrationScore =
    normalizeScore(
      currentSignature
        .break_rate *
        100,
    );

  return normalizeScore(
    durationFragilityScore *
      0.55 +
      breakConcentrationScore *
        0.45,
  );
}

/**
 * Correlation remains a sub-measure of evolution.
 *
 * Here it describes consistency of rupture-gap observations.
 * It is not exposed as an independent primary rupture axis.
 */
function computeRuptureCorrelationScore(
  comparisons:
    readonly StructuralComparison[],
): number | null {
  if (
    comparisons.length <
    2
  ) {
    return null;
  }

  return normalizeScore(
    100 -
      clamp(
        standardDeviation(
          comparisons.map(
            (comparison) =>
              comparison
                .rupture_gap_score,
          ),
        ),
      ),
  );
}

/**
 * Computes the primary rupture evolution axis.
 *
 * The score combines:
 * - rupture convergence
 * - rupture dispersion through correlation detail
 * - current rupture duration pressure
 *
 * This score describes the strength of evolving rupture evidence.
 * It does not by itself assign a temporal evolution state.
 */
function computeRuptureEvolutionAxisScore(
  input: {
    rupture_convergence_score:
      number;

    rupture_duration_score:
      number;

    rupture_correlation_score:
      number | null;
  },
): number {
  if (
    input
      .rupture_correlation_score ===
    null
  ) {
    return normalizeScore(
      input
        .rupture_convergence_score *
        0.65 +
      input
        .rupture_duration_score *
        0.35,
    );
  }

  const ruptureDispersionScore =
    normalizeScore(
      100 -
        input
          .rupture_correlation_score,
    );

  return normalizeScore(
    input
      .rupture_convergence_score *
      0.45 +
    ruptureDispersionScore *
      0.3 +
    input
      .rupture_duration_score *
      0.25,
  );
}

/**
 * Computes all canonical rupture axes.
 *
 * No historical comparison means no rupture-axis truth.
 * The function returns null values rather than synthetic neutral values.
 */
function computeRuptureAxes(
  comparisons:
    readonly StructuralComparison[],
  currentSignature:
    SegmentSignature,
): RuptureAxesResult {
  if (
    comparisons.length ===
    0
  ) {
    return {
      rupture_occurrence_score:
        null,

      rupture_frequency_score:
        null,

      rupture_convergence_score:
        null,

      rupture_duration_score:
        null,

      rupture_evolution_score:
        null,

      rupture_correlation_score:
        null,

      status:
        "insufficient_data",

      availability_reason:
        "historical_comparison_insufficient",
    };
  }

  const ruptureLikeComparisons =
    comparisons.filter(
      (comparison) =>
        comparison
          .rupture_gap_score >=
        RUPTURE_COMPARISON_THRESHOLD,
    );

  const ruptureOccurrenceScore =
    computeRuptureOccurrenceScore(
      ruptureLikeComparisons.length,
    );

  const ruptureFrequencyScore =
    computeRuptureFrequencyScore(
      ruptureLikeComparisons.length,
      comparisons.length,
    );

  const ruptureConvergenceScore =
    computeRuptureConvergenceScore(
      comparisons,
    );

  const ruptureDurationScore =
    computeRuptureDurationScore(
      currentSignature,
    );

  const ruptureCorrelationScore =
    computeRuptureCorrelationScore(
      comparisons,
    );

  const ruptureEvolutionScore =
    computeRuptureEvolutionAxisScore({
      rupture_convergence_score:
        ruptureConvergenceScore,

      rupture_duration_score:
        ruptureDurationScore,

      rupture_correlation_score:
        ruptureCorrelationScore,
    });

  return {
    rupture_occurrence_score:
      ruptureOccurrenceScore,

    rupture_frequency_score:
      ruptureFrequencyScore,

    rupture_convergence_score:
      ruptureConvergenceScore,

    rupture_duration_score:
      ruptureDurationScore,

    rupture_evolution_score:
      ruptureEvolutionScore,

    rupture_correlation_score:
      ruptureCorrelationScore,

    status:
      ruptureCorrelationScore ===
      null
        ? "partial"
        : "computed",

    availability_reason:
      "available",
  };
}

/**
 * Computes canonical rupture probability from the five official rupture axes.
 *
 * Correlation is not included as a sixth axis because it remains a sub-measure
 * of evolution.
 */
function computeRuptureProbability(
  axes:
    RuptureAxesResult,
): number | null {
  if (
    axes
      .rupture_occurrence_score ===
      null ||
    axes
      .rupture_frequency_score ===
      null ||
    axes
      .rupture_convergence_score ===
      null ||
    axes
      .rupture_duration_score ===
      null ||
    axes
      .rupture_evolution_score ===
      null
  ) {
    return null;
  }

  return normalizeScore(
    axes
      .rupture_occurrence_score *
      0.16 +
    axes
      .rupture_frequency_score *
      0.2 +
    axes
      .rupture_convergence_score *
      0.25 +
    axes
      .rupture_duration_score *
      0.18 +
    axes
      .rupture_evolution_score *
      0.21,
  );
}

/**
 * Builds an explicitly unavailable rupture-evolution result.
 *
 * The state and status remain distinct:
 * - INSUFFICIENT_DATA means valid but insufficient chronological evidence
 * - UNAVAILABLE must be reserved for producer or boundary unavailability
 */
function buildInsufficientRuptureEvolutionResult():
  RuptureEvolutionResult {
  return {
    rupture_evolution_state:
      "INSUFFICIENT_DATA",

    rupture_acceleration_score:
      null,

    rupture_persistence_score:
      null,

    rupture_deceleration_score:
      null,

    status:
      "insufficient_data",

    availability_reason:
      "historical_comparison_insufficient",
  };
}

/**
 * Splits an ordered rupture series into prior and recent chronological phases.
 *
 * At least three observations are required:
 * - one or more observations in the prior phase
 * - two or more observations available across the full ordered series
 *
 * The original order is preserved. No sorting or timestamp reconstruction is
 * performed here.
 */
function splitOrderedRuptureSeries(
  ruptureValues:
    readonly number[],
): {
  prior_values:
    readonly number[];

  recent_values:
    readonly number[];
} | null {
  if (
    ruptureValues.length <
    MINIMUM_RUPTURE_EVOLUTION_OBSERVATION_COUNT
  ) {
    return null;
  }

  const splitIndex =
    Math.max(
      1,
      Math.floor(
        ruptureValues.length /
        2,
      ),
    );

  const priorValues =
    ruptureValues.slice(
      0,
      splitIndex,
    );

  const recentValues =
    ruptureValues.slice(
      splitIndex,
    );

  if (
    priorValues.length === 0 ||
    recentValues.length === 0
  ) {
    return null;
  }

  return {
    prior_values:
      priorValues,

    recent_values:
      recentValues,
  };
}

/**
 * Measures rupture acceleration from the difference between recent and prior
 * ordered rupture evidence.
 *
 * Score interpretation:
 * - 50: no observed acceleration
 * - above 50: increasing rupture pressure
 * - below 50: decreasing rupture pressure
 */
function computeRuptureAccelerationScore(
  priorMean: number,
  recentMean: number,
): number {
  return normalizeScore(
    50 +
      (
        recentMean -
        priorMean
      ) *
        2,
  );
}

/**
 * Measures rupture deceleration independently from acceleration.
 *
 * It is not reconstructed downstream as 100 - acceleration, even though the
 * initial formula is symmetrical. Both variables retain separate governed
 * identities and may evolve independently in a future contract version.
 */
function computeRuptureDecelerationScore(
  priorMean: number,
  recentMean: number,
): number {
  return normalizeScore(
    50 +
      (
        priorMean -
        recentMean
      ) *
        2,
  );
}

/**
 * Measures persistence as the relative presence and intensity of rupture-like
 * evidence throughout the ordered comparison series.
 */
function computeRupturePersistenceScore(
  ruptureValues:
    readonly number[],
): number {
  if (
    ruptureValues.length ===
    0
  ) {
    return 0;
  }

  const persistentEventCount =
    ruptureValues.filter(
      (value) =>
        value >=
        RUPTURE_PERSISTENCE_EVENT_THRESHOLD,
    ).length;

  const persistentFrequencyScore =
    normalizeScore(
      safeDivide(
        persistentEventCount,
        ruptureValues.length,
      ) * 100,
    );

  const meanIntensityScore =
    normalizeScore(
      mean(
        ruptureValues,
      ),
    );

  return normalizeScore(
    persistentFrequencyScore *
      0.6 +
    meanIntensityScore *
      0.4,
  );
}

/**
 * Resolves the canonical rupture evolution state.
 *
 * Resolution hierarchy:
 * 1. EXPLOSIVE
 * 2. INCREASING
 * 3. PERSISTENT
 * 4. DECREASING
 * 5. STABLE
 *
 * The hierarchy prevents a persistent but sharply accelerating rupture from
 * being incorrectly reduced to PERSISTENT.
 */
function resolveRuptureEvolutionState(
  input: {
    rupture_evolution_score:
      number;

    rupture_acceleration_score:
      number;

    rupture_persistence_score:
      number;

    rupture_deceleration_score:
      number;

    evolution_delta:
      number;
  },
): RfsRuptureEvolutionState {
  if (
    input
      .rupture_evolution_score >=
      RUPTURE_EXPLOSIVE_THRESHOLD &&
    input
      .rupture_acceleration_score >=
      RUPTURE_EXPLOSIVE_ACCELERATION_THRESHOLD
  ) {
    return "EXPLOSIVE";
  }

  if (
    input
      .rupture_acceleration_score >=
      RUPTURE_ACCELERATION_STATE_THRESHOLD &&
    input.evolution_delta >
      RUPTURE_EVOLUTION_DELTA_TOLERANCE
  ) {
    return "INCREASING";
  }

  if (
    input
      .rupture_persistence_score >=
      RUPTURE_PERSISTENT_THRESHOLD &&
    Math.abs(
      input.evolution_delta,
    ) <=
      RUPTURE_EVOLUTION_DELTA_TOLERANCE
  ) {
    return "PERSISTENT";
  }

  if (
    input
      .rupture_deceleration_score >=
      RUPTURE_DECELERATION_STATE_THRESHOLD &&
    input.evolution_delta <
      -RUPTURE_EVOLUTION_DELTA_TOLERANCE
  ) {
    return "DECREASING";
  }

  return "STABLE";
}

/**
 * Computes the canonical structural rupture evolution reading.
 *
 * This function requires:
 * - valid rupture axes
 * - an ordered rupture comparison series
 * - at least three observations
 *
 * It does not create an evolution state when chronological evidence is
 * insufficient.
 */
function computeRuptureEvolution(
  input: {
    comparisons:
      readonly StructuralComparison[];

    rupture_axes:
      RuptureAxesResult;
  },
): RuptureEvolutionResult {
  if (
    input.rupture_axes
      .rupture_evolution_score ===
      null ||
    input.comparisons.length <
      MINIMUM_RUPTURE_EVOLUTION_OBSERVATION_COUNT
  ) {
    return buildInsufficientRuptureEvolutionResult();
  }

  const orderedRuptureValues =
    input.comparisons.map(
      (comparison) =>
        comparison
          .rupture_gap_score,
    );

  const phases =
    splitOrderedRuptureSeries(
      orderedRuptureValues,
    );

  if (phases === null) {
    return buildInsufficientRuptureEvolutionResult();
  }

  const priorMean =
    mean(
      phases.prior_values,
    );

  const recentMean =
    mean(
      phases.recent_values,
    );

  const evolutionDelta =
    roundToTwoDecimals(
      recentMean -
        priorMean,
    );

  const ruptureAccelerationScore =
    computeRuptureAccelerationScore(
      priorMean,
      recentMean,
    );

  const ruptureDecelerationScore =
    computeRuptureDecelerationScore(
      priorMean,
      recentMean,
    );

  const rupturePersistenceScore =
    computeRupturePersistenceScore(
      orderedRuptureValues,
    );

  const ruptureEvolutionState =
    resolveRuptureEvolutionState({
      rupture_evolution_score:
        input.rupture_axes
          .rupture_evolution_score,

      rupture_acceleration_score:
        ruptureAccelerationScore,

      rupture_persistence_score:
        rupturePersistenceScore,

      rupture_deceleration_score:
        ruptureDecelerationScore,

      evolution_delta:
        evolutionDelta,
    });

  return {
    rupture_evolution_state:
      ruptureEvolutionState,

    rupture_acceleration_score:
      ruptureAccelerationScore,

    rupture_persistence_score:
      rupturePersistenceScore,

    rupture_deceleration_score:
      ruptureDecelerationScore,

    status:
      "computed",

    availability_reason:
      "available",
  };
}

/* ============================================================================
 * 12. TEMPORAL CONTEXT
 * ========================================================================== */

function sliceTemporalWindow(
  input: {
    horizon:
      "GLOBAL" | "7D" | "24H";

    prices:
      readonly number[];

    timestamps:
      readonly number[];

    duration_ms:
      number | null;
  },
): TemporalWindow {
  if (
    input.prices.length !==
      input.timestamps.length ||
    input.prices.length <
      MINIMUM_TEMPORAL_POINT_COUNT
  ) {
    return {
      horizon:
        input.horizon,

      prices: [],
      timestamps: [],

      status:
        "unavailable",

      availability_reason:
        "temporal_window_insufficient",
    };
  }

  if (
    input.horizon ===
      "GLOBAL" ||
    input.duration_ms === null
  ) {
    return {
      horizon:
        input.horizon,

      prices:
        input.prices,

      timestamps:
        input.timestamps,

      status:
        "computed",

      availability_reason:
        "available",
    };
  }

  const finalTimestamp =
    lastNumber(
      input.timestamps,
    );

  if (
    finalTimestamp === null
  ) {
    return {
      horizon:
        input.horizon,

      prices: [],
      timestamps: [],

      status:
        "unavailable",

      availability_reason:
        "timestamps_invalid",
    };
  }

  const minimumTimestamp =
    finalTimestamp -
    input.duration_ms;

  const prices: number[] = [];
  const timestamps: number[] = [];

  for (
    let index = 0;
    index < input.prices.length;
    index += 1
  ) {
    const price =
      input.prices[index];

    const timestamp =
      input.timestamps[index];

    if (
      price === undefined ||
      timestamp === undefined
    ) {
      continue;
    }

    if (
      timestamp >=
      minimumTimestamp &&
      timestamp <=
      finalTimestamp
    ) {
      prices.push(price);
      timestamps.push(timestamp);
    }
  }

  if (
    prices.length <
    MINIMUM_TEMPORAL_POINT_COUNT
  ) {
    return {
      horizon:
        input.horizon,

      prices,
      timestamps,

      status:
        "insufficient_data",

      availability_reason:
        "temporal_window_insufficient",
    };
  }

  return {
    horizon:
      input.horizon,

    prices,
    timestamps,

    status:
      prices.length >=
      MINIMUM_SEGMENT_POINT_COUNT
        ? "computed"
        : "partial",

    availability_reason:
      "available",
  };
}

function resolveTimingState(
  input: {
    horizon:
      "GLOBAL" | "7D" | "24H";

    change_pct:
      number;

    stability_score:
      number;

    rupture_probability:
      number;
  },
): RfsTimingState | null {
  if (
    input.horizon !== "24H"
  ) {
    return null;
  }

  if (
    input.rupture_probability >=
      70 ||
    input.stability_score <= 35
  ) {
    return "UNFAVORABLE";
  }

  if (
    input.stability_score >= 60 &&
    input.rupture_probability <=
      40 &&
    input.change_pct >= 0
  ) {
    return "FAVORABLE";
  }

  return "NEUTRAL";
}

function buildTemporalReading(
  window: TemporalWindow,
): RfsTemporalReading {
  const startTimestamp =
    firstNumber(
      window.timestamps,
    );

  const endTimestamp =
    lastNumber(
      window.timestamps,
    );

  if (
    window.status ===
      "unavailable" ||
    window.status ===
      "insufficient_data" ||
    window.prices.length <
      MINIMUM_TEMPORAL_POINT_COUNT ||
    startTimestamp === null ||
    endTimestamp === null
  ) {
    return {
      horizon:
        window.horizon,

      observation_count:
        window.prices.length,

      start_timestamp:
        startTimestamp,

      end_timestamp:
        endTimestamp,

      change_pct:
        null,

      slope_pct:
        null,

      stability_context_score:
        null,

      rupture_context_score:
        null,

      rupture_context_probability:
        null,

      timing_state:
        window.horizon === "24H"
          ? window.status ===
              "insufficient_data"
            ? "INSUFFICIENT_DATA"
            : "UNAVAILABLE"
          : null,

      status:
        window.status,

      availability_reason:
        window
          .availability_reason,
    };
  }

  const firstPrice =
    firstNumber(
      window.prices,
    );

  const lastPrice =
    lastNumber(
      window.prices,
    );

  if (
    firstPrice === null ||
    lastPrice === null
  ) {
    return {
      horizon:
        window.horizon,

      observation_count:
        window.prices.length,

      start_timestamp:
        startTimestamp,

      end_timestamp:
        endTimestamp,

      change_pct:
        null,

      slope_pct:
        null,

      stability_context_score:
        null,

      rupture_context_score:
        null,

      rupture_context_probability:
        null,

      timing_state:
        window.horizon === "24H"
          ? "UNAVAILABLE"
          : null,

      status:
        "unavailable",

      availability_reason:
        "producer_failure",
    };
  }

  const date =
    new Date(startTimestamp);

  const signature =
    computeSegmentSignature({
      start_index: 0,

      end_index:
        window.prices.length - 1,

      prices:
        window.prices,

      timestamps:
        window.timestamps,

      quarter_index:
        resolveQuarterIndex(
          startTimestamp,
        ),

      year:
        date.getUTCFullYear(),

      month:
        date.getUTCMonth(),
    });

  const changePct =
    computePercentageChange(
      firstPrice,
      lastPrice,
    );

  const stabilityContextScore =
    normalizeScore(
      signature.quality_score *
        0.42 +
        signature.duration_score *
          0.22 +
        (
          100 -
          signature.instability_score
        ) *
          0.2 +
        (
          100 -
          signature.break_rate *
            100
        ) *
          0.16,
    );

  const ruptureContextProbability =
    normalizeScore(
      signature.instability_score *
        0.36 +
        signature.break_rate *
          100 *
          0.36 +
        (
          100 -
          signature.duration_score
        ) *
          0.28,
    );

  return {
    horizon:
      window.horizon,

    observation_count:
      window.prices.length,

    start_timestamp:
      startTimestamp,

    end_timestamp:
      endTimestamp,

    change_pct:
      changePct,

    slope_pct:
      signature.slope_pct,

    stability_context_score:
      stabilityContextScore,

    rupture_context_score:
      ruptureContextProbability,

    rupture_context_probability:
      ruptureContextProbability,

    timing_state:
      resolveTimingState({
        horizon:
          window.horizon,

        change_pct:
          changePct,

        stability_score:
          stabilityContextScore,

        rupture_probability:
          ruptureContextProbability,
      }),

    status:
      window.status,

    availability_reason:
      window
        .availability_reason,
  };
}

/* ============================================================================
 * 13. STABILITY, COHERENCE AND REGIME
 * ========================================================================== */

function computeCoherenceScore(
  input: {
    stability_score: number;
    current_month_score: number;
    current_quarter_score: number;

    recent_7d:
      RfsTemporalReading;

    timing_24h:
      RfsTemporalReading;

    rupture_penalty_score:
      number;
  },
): number {
  const longToQuarter =
    normalizeScore(
      100 -
        Math.abs(
          input.stability_score -
            input
              .current_quarter_score,
        ),
    );

  const quarterToMonth =
    normalizeScore(
      100 -
        Math.abs(
          input
            .current_quarter_score -
            input
              .current_month_score,
        ),
    );

  const monthToSevenDay =
    input.recent_7d
      .stability_context_score ===
    null
      ? null
      : normalizeScore(
          100 -
            Math.abs(
              input
                .current_month_score -
                input.recent_7d
                  .stability_context_score,
            ),
        );

  const sevenDayToTwentyFourHour =
    input.recent_7d
      .stability_context_score ===
      null ||
    input.timing_24h
      .stability_context_score ===
      null
      ? null
      : normalizeScore(
          100 -
            Math.abs(
              input.recent_7d
                .stability_context_score -
                input.timing_24h
                  .stability_context_score,
            ),
        );

  const weightedValues: Array<{
    score: number;
    weight: number;
  }> = [
    {
      score:
        longToQuarter,
      weight: 0.32,
    },
    {
      score:
        quarterToMonth,
      weight: 0.28,
    },
    {
      score:
        100 -
        input
          .rupture_penalty_score,
      weight: 0.2,
    },
  ];

  if (
    monthToSevenDay !== null
  ) {
    weightedValues.push({
      score:
        monthToSevenDay,
      weight: 0.14,
    });
  }

  if (
    sevenDayToTwentyFourHour !==
    null
  ) {
    weightedValues.push({
      score:
        sevenDayToTwentyFourHour,
      weight: 0.06,
    });
  }

  const totalWeight =
    weightedValues.reduce(
      (total, item) =>
        total + item.weight,
      0,
    );

  return normalizeScore(
    safeDivide(
      weightedValues.reduce(
        (total, item) =>
          total +
          item.score *
            item.weight,
        0,
      ),
      totalWeight,
    ),
  );
}

function resolveStabilityState(
  stabilityScore:
    number | null,
): RfsStabilityState {
  if (
    stabilityScore === null
  ) {
    return "UNAVAILABLE";
  }

  if (
    stabilityScore >=
    STABILITY_HIGH_THRESHOLD
  ) {
    return "HIGH";
  }

  if (
    stabilityScore >=
    STABILITY_MODERATE_THRESHOLD
  ) {
    return "MODERATE";
  }

  return "LOW";
}

function resolveRegime(
  input: {
    stability_score:
      number | null;

    rupture_probability:
      number | null;

    current_month_score:
      number;

    current_quarter_score:
      number;

    recent_7d:
      RfsTemporalReading;
  },
): RfsRegimeState | null {
  if (
    input.stability_score ===
      null ||
    input.rupture_probability ===
      null
  ) {
    return null;
  }

  if (
    input.rupture_probability >=
      78 ||
    (
      input.recent_7d
        .rupture_context_probability !==
        null &&
      input.recent_7d
        .rupture_context_probability >=
        80
    )
  ) {
    return "VOLATILE";
  }

  if (
    input.stability_score >= 70 &&
    input.rupture_probability <=
      35 &&
    input.current_month_score >=
      60 &&
    input.current_quarter_score >=
      60 &&
    (
      input.recent_7d
        .stability_context_score ===
        null ||
      input.recent_7d
        .stability_context_score >=
        50
    )
  ) {
    return "STABLE";
  }

  return "TRANSITION";
}

/* ============================================================================
 * 14. RESULT STATUS
 * ========================================================================== */

function resolveResultStatus(
  input: {
    historical_mode:
      RfsHistoricalMode;

    structural_axes:
      StructuralAxesResult;

    rupture_axes:
      RuptureAxesResult;

    recent_7d:
      RfsTemporalReading;

    timing_24h:
      RfsTemporalReading;
  },
): {
  status:
    RfsComputationStatus;

  propagation_status:
    RfsPropagationStatus;

  availability_reason:
    RfsAvailabilityReason;

  validation_issues:
    readonly RfsValidationIssue[];
} {
  const issues:
    RfsValidationIssue[] = [];

  if (
    input.historical_mode ===
    "INSUFFICIENT_HISTORY"
  ) {
    issues.push({
      code:
        "RFS_HISTORICAL_COMPARISON_INSUFFICIENT",

      variable_name:
        "historical_context",

      severity:
        "warning",

      reason:
        "historical_comparison_insufficient",
    });
  }

  if (
    input.recent_7d.status !==
    "computed"
  ) {
    issues.push({
      code:
        "RFS_RECENT_7D_DEGRADED",

      variable_name:
        "temporal_context.recent_7d",

      severity:
        "warning",

      reason:
        input.recent_7d
          .availability_reason,
    });
  }

  if (
    input.timing_24h.status !==
    "computed"
  ) {
    issues.push({
      code:
        "RFS_TIMING_24H_DEGRADED",

      variable_name:
        "temporal_context.timing_24h",

      severity:
        "information",

      reason:
        input.timing_24h
          .availability_reason,
    });
  }

  const historicalUnavailable =
    input.structural_axes.status ===
      "insufficient_data" ||
    input.rupture_axes.status ===
      "insufficient_data";

  if (historicalUnavailable) {
    return {
      status:
        "partial",

      propagation_status:
        "degraded",

      availability_reason:
        "historical_comparison_insufficient",

      validation_issues:
        issues,
    };
  }

  if (issues.length > 0) {
    return {
      status:
        "partial",

      propagation_status:
        "degraded",

      availability_reason:
        "temporal_window_insufficient",

      validation_issues:
        issues,
    };
  }

  return {
    status:
      "computed",

    propagation_status:
      "full",

    availability_reason:
      "available",

    validation_issues:
      issues,
  };
}

/* ============================================================================
 * 15. PUBLIC EXECUTION
 * ========================================================================== */

export function runRFSScore(
  input: RfsScoreInput,
): RfsScoreResult {
  const validatedInput =
    validateRfsInput(input);

  const historicalMode =
    resolveHistoricalMode(
      validatedInput.timestamps,
    );

  const monthlyWindows =
    buildMonthlyWindows(
      validatedInput.prices,
      validatedInput.timestamps,
    );

  const quarterBundles =
    buildQuarterBundles(
      monthlyWindows,
    );

  const fullWindow =
    buildFullWindow(
      validatedInput,
    );

  const currentWindow =
    monthlyWindows.at(-1) ??
    fullWindow;

  const currentSignature =
    computeSegmentSignature(
      currentWindow,
    );

  const currentQuarterWindow =
    quarterBundles.length === 0
      ? null
      : flattenQuarterBundle(
          quarterBundles.at(-1) as QuarterBundle,
        );

  const currentQuarterSignature =
    currentQuarterWindow === null
      ? currentSignature
      : computeSegmentSignature(
          currentQuarterWindow,
        );

  const referenceWindows =
    selectReferenceWindows({
      historical_mode:
        historicalMode,

      monthly_windows:
        monthlyWindows,

      current_window:
        currentWindow,
    });

  const referenceSignatures =
    referenceWindows.map(
      computeSegmentSignature,
    );

  const comparisons =
    compareCurrentToHistory(
      currentSignature,
      referenceSignatures,
    );

  const historicalQualityScores =
    monthlyWindows
      .slice(0, -1)
      .map(
        (window) =>
          computeSegmentSignature(
            window,
          ).quality_score,
      );

  const historicalBaselineScore =
    historicalQualityScores.length ===
    0
      ? null
      : normalizeScore(
          mean(
            historicalQualityScores,
          ),
        );

  const structuralAxes =
    computeStructuralAxes({
      comparisons,

      current_score:
        currentSignature
          .quality_score,

      current_quarter_score:
        currentQuarterSignature
          .quality_score,

      historical_baseline_score:
        historicalBaselineScore,
    });

  const structuralScore =
    computeStructuralScore(
      structuralAxes,
    );

  const ruptureAxes =
    computeRuptureAxes(
      comparisons,
      currentSignature,
    );

  const ruptureProbability =
    computeRuptureProbability(
      ruptureAxes,
    );

  const ruptureScore =
    ruptureProbability;

  const rupturePenaltyScore =
    ruptureProbability === null ||
    ruptureAxes
      .rupture_frequency_score ===
      null
      ? null
      : normalizeScore(
          ruptureProbability *
            0.7 +
            ruptureAxes
              .rupture_frequency_score *
              0.3,
        );

  const continuityProbability =
    structuralScore === null ||
    rupturePenaltyScore === null
      ? null
      : normalizeScore(
          structuralScore * 0.78 +
            (
              100 -
              rupturePenaltyScore
            ) *
              0.22,
        );

  const ruptureEvolution =
    computeRuptureEvolution({
      comparisons,
      rupture_axes:
        ruptureAxes,
    });

  const globalTemporalReading =
    buildTemporalReading(
      sliceTemporalWindow({
        horizon:
          "GLOBAL",

        prices:
          validatedInput.prices,

        timestamps:
          validatedInput.timestamps,

        duration_ms:
          null,
      }),
    );

  const recent7dReading =
    buildTemporalReading(
      sliceTemporalWindow({
        horizon:
          "7D",

        prices:
          validatedInput.prices,

        timestamps:
          validatedInput.timestamps,

        duration_ms:
          7 *
          MILLISECONDS_PER_DAY,
      }),
    );

  const timing24hReading =
    buildTemporalReading(
      sliceTemporalWindow({
        horizon:
          "24H",

        prices:
          validatedInput.prices,

        timestamps:
          validatedInput.timestamps,

        duration_ms:
          24 *
          MILLISECONDS_PER_HOUR,
      }),
    );

  const stabilityScore =
    structuralScore === null ||
    rupturePenaltyScore === null
      ? null
      : normalizeScore(
          structuralScore * 0.72 +
            (
              100 -
              rupturePenaltyScore
            ) *
              0.18 +
            (
              historicalBaselineScore ??
              currentSignature
                .quality_score
            ) *
              0.1,
        );

  const coherenceScore =
    stabilityScore === null ||
    rupturePenaltyScore === null
      ? null
      : computeCoherenceScore({
          stability_score:
            stabilityScore,

          current_month_score:
            currentSignature
              .quality_score,

          current_quarter_score:
            currentQuarterSignature
              .quality_score,

          recent_7d:
            recent7dReading,

          timing_24h:
            timing24hReading,

          rupture_penalty_score:
            rupturePenaltyScore,
        });

  const regime =
    resolveRegime({
      stability_score:
        stabilityScore,

      rupture_probability:
        ruptureProbability,

      current_month_score:
        currentSignature
          .quality_score,

      current_quarter_score:
        currentQuarterSignature
          .quality_score,

      recent_7d:
        recent7dReading,
    });

  const resultStatus =
    resolveResultStatus({
      historical_mode:
        historicalMode,

      structural_axes:
        structuralAxes,

      rupture_axes:
        ruptureAxes,

      recent_7d:
        recent7dReading,

      timing_24h:
        timing24hReading,
    });

  const baselineObservationCount =
    referenceWindows.reduce(
      (total, window) =>
        total +
        window.prices.length,
      0,
    );

  return {
    contract_name:
      RFS_SCORE_CONTRACT_NAME,

    contract_version:
      RFS_SCORE_CONTRACT_VERSION,

    analytical_version:
      RFS_SCORE_ANALYTICAL_VERSION,

    status:
      resultStatus.status,

    propagation_status:
      resultStatus
        .propagation_status,

    availability_reason:
      resultStatus
        .availability_reason,

    quote_currency:
      validatedInput
        .quote_currency,

    source:
      validatedInput.source,

    source_version:
      validatedInput
        .source_version,

    data_version:
      validatedInput
        .data_version,

    observation_count:
      validatedInput
        .observation_count,

    structural_axes: {
      occurrence_score:
        structuralAxes
          .occurrence_score,

      frequency_score:
        structuralAxes
          .frequency_score,

      convergence_score:
        structuralAxes
          .convergence_score,

      duration_score:
        structuralAxes
          .duration_score,

      evolution_score:
        structuralAxes
          .evolution_score,

      growth_score:
        structuralAxes
          .growth_score,

      status:
        structuralAxes.status,

      availability_reason:
        structuralAxes
          .availability_reason,
    },

    evolution_detail: {
      correlation_score:
        structuralAxes
          .correlation_score,

      direction_consistency_score:
        structuralAxes
          .direction_consistency_score,

      change_consistency_score:
        structuralAxes
          .change_consistency_score,

      status:
        structuralAxes.status,

      availability_reason:
        structuralAxes
          .availability_reason,
    },

    pattern: {
      pattern_state:
        currentSignature
          .pattern_state,

      pattern_score:
        currentSignature
          .quality_score,

      pattern_frequency_score:
        structuralAxes
          .frequency_score,

      slope_pct:
        currentSignature
          .slope_pct,

      amplitude_pct:
        currentSignature
          .amplitude_pct,

      instability_score:
        currentSignature
          .instability_score,

      break_rate:
        currentSignature
          .break_rate,

      quality_score:
        currentSignature
          .quality_score,

      duration_score:
        currentSignature
          .duration_score,

      status:
        "computed",

      availability_reason:
        "available",
    },

    stability: {
      stability_score:
        stabilityScore,

      stability_state:
        resolveStabilityState(
          stabilityScore,
        ),

      structure_score:
        structuralScore,

      coherence_score:
        coherenceScore,

      status:
        stabilityScore === null
          ? "insufficient_data"
          : "computed",

      availability_reason:
        stabilityScore === null
          ? "historical_comparison_insufficient"
          : "available",
    },

    regime: {
      regime,

      status:
        regime === null
          ? "insufficient_data"
          : "computed",

      availability_reason:
        regime === null
          ? "historical_comparison_insufficient"
          : "available",
    },

    rupture: {
      rupture_score:
        ruptureScore,

      rupture_probability:
        ruptureProbability,

      rupture_penalty_score:
        rupturePenaltyScore,

      continuity_probability:
        continuityProbability,

      axes: {
        rupture_occurrence_score:
          ruptureAxes
            .rupture_occurrence_score,

        rupture_frequency_score:
          ruptureAxes
            .rupture_frequency_score,

        rupture_convergence_score:
          ruptureAxes
            .rupture_convergence_score,

        rupture_duration_score:
          ruptureAxes
            .rupture_duration_score,

        rupture_evolution_score:
          ruptureAxes
            .rupture_evolution_score,

        status:
          ruptureAxes.status,

        availability_reason:
          ruptureAxes
            .availability_reason,
      },

      evolution: {
        rupture_evolution_state:
          ruptureEvolution
            .rupture_evolution_state,

        rupture_acceleration_score:
          ruptureEvolution
            .rupture_acceleration_score,

        rupture_persistence_score:
          ruptureEvolution
            .rupture_persistence_score,

        rupture_deceleration_score:
          ruptureEvolution
            .rupture_deceleration_score,

        status:
          ruptureEvolution.status,

        availability_reason:
          ruptureEvolution
            .availability_reason,
      },

      status:
        ruptureProbability === null
          ? "insufficient_data"
          : ruptureAxes.status,

      availability_reason:
        ruptureProbability === null
          ? "historical_comparison_insufficient"
          : ruptureAxes
              .availability_reason,
    },

    temporal_context: {
      global:
        globalTemporalReading,

      recent_7d:
        recent7dReading,

      timing_24h:
        timing24hReading,
    },

    period_context: {
      current_month_score:
        currentSignature
          .quality_score,

      current_quarter_score:
        currentQuarterSignature
          .quality_score,

      historical_baseline_score:
        historicalBaselineScore,

      status:
        historicalBaselineScore ===
        null
          ? "partial"
          : "computed",

      availability_reason:
        historicalBaselineScore ===
        null
          ? "historical_baseline_missing"
          : "available",
    },

    historical_context: {
      historical_mode:
        historicalMode,

      comparison_count:
        comparisons.length,

      baseline_observation_count:
        baselineObservationCount,

      baseline_status:
        comparisons.length === 0
          ? "insufficient_data"
          : "computed",

      baseline_availability_reason:
        comparisons.length === 0
          ? "historical_comparison_insufficient"
          : "available",
    },

    validation_issues:
      resultStatus
        .validation_issues,
  };
}

export const runRFS =
  runRFSScore;
