/* ============================================================================
 * FILE: lib/xyvala/calibration/impulse-distribution-store.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical impulse distribution runtime store
 *
 * ROLE
 * - build deterministic impulse distribution snapshots from validated samples
 * - persist the latest runtime impulse distribution snapshot
 * - expose immutable distribution observability to calibration orchestrators
 * - preserve the analytical values produced by upstream authoritative layers
 * - maintain explicit runtime state without analytical reconstruction
 *
 * CLASSIFICATION
 * - PRIVATE
 * - OBSERVE
 * - MUTATE RUNTIME STORE
 * - NON-ANALYTICAL
 *
 * POSITION IN OFFICIAL CHAIN
 * - Acquisition
 * - RFS
 * - Triple Layer
 * - Impulse Layer
 * - Analytical Aggregation System
 * - MCI
 * - Calibration
 * - Snapshot
 * - Transformers
 * - Rankings
 * - API
 * - Interface
 *
 * PARENTS
 * - lib/xyvala/calibration/impulse-adaptive-thresholds.ts
 * - authoritative Impulse Layer producer
 * - authoritative Triple Layer producer
 *
 * CONSUMERS
 * - impulse calibration orchestrator
 * - internal calibration observability
 * - internal calibration seed tooling
 *
 * DIRECTIVES
 * - runtime observability only
 * - no market truth computation
 * - no Impulse Layer recomputation
 * - no Triple Layer recomputation
 * - no MCI computation
 * - no decision computation
 * - no calibration threshold computation
 * - no score clamping
 * - no score normalization
 * - no unavailable-to-zero substitution for analytical values
 * - no transition reconstruction
 * - no local clock access
 * - no timestamp generation
 * - no UI logic
 * - no public API projection
 * - no provider parsing
 * - no market prediction
 * - no investment semantics
 * - no event publication
 *
 * INPUTS
 * - validated impulse adaptive samples
 * - validated impulse adaptive policy
 * - explicit runtime timestamp
 * - explicit observability warnings
 *
 * OUTPUTS
 * - immutable impulse distribution snapshot
 * - immutable runtime store state
 * - exhaustive state occurrence distribution
 * - descriptive score distributions
 * - calibration observability ratios
 *
 * OWNERSHIP
 * - Impulse Layer owns impulse scores and transition states
 * - Triple Layer owns growth, core-pattern and decay scores
 * - Calibration owns calibration policies
 * - this store owns runtime persistence of observed distributions only
 *
 * INVARIANTS
 * - source analytical scores are never altered
 * - null remains unavailable
 * - zero remains a valid observed score or occurrence count
 * - invalid finite-domain values are rejected
 * - state distribution is exhaustive
 * - absent states produce an occurrence count of zero
 * - created_at is supplied by the caller
 * - identical samples, policy, warnings and timestamp produce identical output
 * - snapshot reads never expose mutable runtime references
 * - store writes replace the complete runtime state atomically
 *
 * BOUNDARIES
 * - Impulse / Triple Layer -> distribution observation
 * - distribution observation -> calibration orchestrator
 *
 * FIRST DIVERGENCE
 * - invalid source sample
 *   => authoritative producer -> distribution store
 *
 * - valid sample altered during aggregation
 *   => distribution snapshot builder
 *
 * - valid snapshot altered during persistence or reading
 *   => distribution runtime store
 *
 * SENSITIVE ZONES
 * - score-domain validation
 * - canonical sample field identities
 * - exhaustive state counting
 * - deterministic timestamps
 * - runtime-reference isolation
 * - global runtime persistence
 * ========================================================================== */

import type {
  ImpulseAdaptiveSample,
} from "@/lib/xyvala/calibration/impulse-adaptive-thresholds";

import type {
  CalibratableImpulseTransitionState,
  ImpulseResolvedPolicy,
} from "@/lib/xyvala/engine/impulse-state-core";

/* ============================================================================
 * 1. PUBLIC CONTRACTS
 * ========================================================================== */

export type ImpulseDistributionStats = Readonly<{
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
  p25: number | null;
  p75: number | null;

  observation_count: number;
}>;

export type ImpulseStateDistribution = Readonly<{
  COMPRESSION: number;
  PRESSURE_BUILDING: number;
  RELEASE: number;
  EXHAUSTION: number;
  NEUTRAL: number;
}>;

export type ImpulseDistributionSnapshot = Readonly<{
  created_at: number;

  sample_size: number;

  state_distribution:
    ImpulseStateDistribution;

  pressure_distribution:
    ImpulseDistributionStats;

  instability_distribution:
    ImpulseDistributionStats;

  saturation_distribution:
    ImpulseDistributionStats;

  exhaustion_distribution:
    ImpulseDistributionStats;

  growth_distribution:
    ImpulseDistributionStats;

  core_distribution:
    ImpulseDistributionStats;

  decay_distribution:
    ImpulseDistributionStats;

  dominant_state:
    CalibratableImpulseTransitionState | null;

  release_ratio:
    number | null;

  exhaustion_ratio:
    number | null;

  compression_ratio:
    number | null;

  policy_source:
    ImpulseResolvedPolicy["source"];

  warnings:
    readonly string[];
}>;

export type ImpulseDistributionStoreState = Readonly<{
  snapshot:
    ImpulseDistributionSnapshot | null;

  updated_at:
    number | null;

  warnings:
    readonly string[];
}>;

export type BuildImpulseDistributionSnapshotInput = Readonly<{
  samples:
    readonly ImpulseAdaptiveSample[];

  policy:
    ImpulseResolvedPolicy;

  timestamp:
    number;

  warnings?:
    readonly string[];
}>;

/* ============================================================================
 * 2. GOVERNED CONSTANTS
 * ========================================================================== */

const SCORE_MINIMUM = 0;
const SCORE_MAXIMUM = 100;

const EMPTY_STATE_DISTRIBUTION:
  ImpulseStateDistribution =
  Object.freeze({
    COMPRESSION: 0,
    PRESSURE_BUILDING: 0,
    RELEASE: 0,
    EXHAUSTION: 0,
    NEUTRAL: 0,
  });

const EMPTY_DISTRIBUTION_STATS:
  ImpulseDistributionStats =
  Object.freeze({
    min: null,
    max: null,
    mean: null,
    median: null,
    p25: null,
    p75: null,

    observation_count: 0,
  });

const INITIAL_STATE:
  ImpulseDistributionStoreState =
  Object.freeze({
    snapshot: null,
    updated_at: null,
    warnings:
      Object.freeze([]),
  });

/* ============================================================================
 * 3. GLOBAL RUNTIME STORE
 * ----------------------------------------------------------------------------
 * The global object carries the single runtime state reference.
 *
 * No secondary local state reference is retained because replacing the global
 * state must immediately affect every subsequent reader.
 * ========================================================================== */

type ImpulseDistributionGlobalStore =
  typeof globalThis & {
    __XYVALA_IMPULSE_DISTRIBUTION_STORE__?:
      ImpulseDistributionStoreState;
  };

const globalImpulseStore =
  globalThis as
    ImpulseDistributionGlobalStore;

if (
  globalImpulseStore
    .__XYVALA_IMPULSE_DISTRIBUTION_STORE__ ===
  undefined
) {
  globalImpulseStore
    .__XYVALA_IMPULSE_DISTRIBUTION_STORE__ =
    INITIAL_STATE;
}

/* ============================================================================
 * 4. PURE VALIDATION HELPERS
 * ========================================================================== */

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function assertTimestamp(
  value: unknown,
): number {
  if (
    !isFiniteNumber(value) ||
    value < 0
  ) {
    throw new RangeError(
      "IMPULSE_DISTRIBUTION_TIMESTAMP_INVALID: timestamp must be a finite non-negative number",
    );
  }

  return value;
}

function assertScore(
  value: unknown,
  variableName: string,
): number {
  if (
    !isFiniteNumber(value) ||
    value < SCORE_MINIMUM ||
    value > SCORE_MAXIMUM
  ) {
    throw new RangeError(
      `IMPULSE_DISTRIBUTION_SCORE_INVALID: ${variableName} must be a finite score between ${SCORE_MINIMUM} and ${SCORE_MAXIMUM}`,
    );
  }

  return value;
}

function roundToTwoDecimals(
  value: number,
): number {
  if (!isFiniteNumber(value)) {
    throw new TypeError(
      "IMPULSE_DISTRIBUTION_NUMBER_INVALID: expected a finite number",
    );
  }

  return (
    Math.round(value * 100) /
    100
  );
}

function isCalibratableImpulseTransitionState(
  value: unknown,
): value is CalibratableImpulseTransitionState {
  return (
    value === "COMPRESSION" ||
    value === "PRESSURE_BUILDING" ||
    value === "RELEASE" ||
    value === "EXHAUSTION" ||
    value === "NEUTRAL"
  );
}

function uniqueWarnings(
  values: readonly string[],
): string[] {
  const normalized =
    values
      .filter(
        (
          value,
        ): value is string =>
          typeof value === "string",
      )
      .map(
        (value) =>
          value.trim(),
      )
      .filter(
        (value) =>
          value.length > 0,
      );

  return [
    ...new Set(normalized),
  ];
}

/* ============================================================================
 * 5. IMMUTABLE COPY HELPERS
 * ----------------------------------------------------------------------------
 * Runtime readers must never receive references that can mutate stored state.
 * ========================================================================== */

function copyDistributionStats(
  stats: ImpulseDistributionStats,
): ImpulseDistributionStats {
  return Object.freeze({
    min:
      stats.min,

    max:
      stats.max,

    mean:
      stats.mean,

    median:
      stats.median,

    p25:
      stats.p25,

    p75:
      stats.p75,

    observation_count:
      stats.observation_count,
  });
}

function copyStateDistribution(
  distribution:
    ImpulseStateDistribution,
): ImpulseStateDistribution {
  return Object.freeze({
    COMPRESSION:
      distribution.COMPRESSION,

    PRESSURE_BUILDING:
      distribution
        .PRESSURE_BUILDING,

    RELEASE:
      distribution.RELEASE,

    EXHAUSTION:
      distribution.EXHAUSTION,

    NEUTRAL:
      distribution.NEUTRAL,
  });
}

function copySnapshot(
  snapshot:
    ImpulseDistributionSnapshot,
): ImpulseDistributionSnapshot {
  return Object.freeze({
    created_at:
      snapshot.created_at,

    sample_size:
      snapshot.sample_size,

    state_distribution:
      copyStateDistribution(
        snapshot
          .state_distribution,
      ),

    pressure_distribution:
      copyDistributionStats(
        snapshot
          .pressure_distribution,
      ),

    instability_distribution:
      copyDistributionStats(
        snapshot
          .instability_distribution,
      ),

    saturation_distribution:
      copyDistributionStats(
        snapshot
          .saturation_distribution,
      ),

    exhaustion_distribution:
      copyDistributionStats(
        snapshot
          .exhaustion_distribution,
      ),

    growth_distribution:
      copyDistributionStats(
        snapshot
          .growth_distribution,
      ),

    core_distribution:
      copyDistributionStats(
        snapshot
          .core_distribution,
      ),

    decay_distribution:
      copyDistributionStats(
        snapshot
          .decay_distribution,
      ),

    dominant_state:
      snapshot.dominant_state,

    release_ratio:
      snapshot.release_ratio,

    exhaustion_ratio:
      snapshot.exhaustion_ratio,

    compression_ratio:
      snapshot.compression_ratio,

    policy_source:
      snapshot.policy_source,

    warnings:
      Object.freeze([
        ...snapshot.warnings,
      ]),
  });
}

function copyStoreState(
  state:
    ImpulseDistributionStoreState,
): ImpulseDistributionStoreState {
  return Object.freeze({
    snapshot:
      state.snapshot === null
        ? null
        : copySnapshot(
            state.snapshot,
          ),

    updated_at:
      state.updated_at,

    warnings:
      Object.freeze([
        ...state.warnings,
      ]),
  });
}

/* ============================================================================
 * 6. RUNTIME STATE ACCESS
 * ========================================================================== */

function getRuntimeState():
  ImpulseDistributionStoreState {
  return (
    globalImpulseStore
      .__XYVALA_IMPULSE_DISTRIBUTION_STORE__ ??
    INITIAL_STATE
  );
}

function setRuntimeState(
  nextState:
    ImpulseDistributionStoreState,
): void {
  globalImpulseStore
    .__XYVALA_IMPULSE_DISTRIBUTION_STORE__ =
    copyStoreState(
      nextState,
    );
}

/* ============================================================================
 * 7. DISTRIBUTION PRIMITIVES
 * ========================================================================== */

function sortAscending(
  values: readonly number[],
): number[] {
  return [...values].sort(
    (left, right) =>
      left - right,
  );
}

function percentile(
  values: readonly number[],
  percentileValue: number,
): number | null {
  if (values.length === 0) {
    return null;
  }

  if (
    !isFiniteNumber(
      percentileValue,
    ) ||
    percentileValue < 0 ||
    percentileValue > 100
  ) {
    throw new RangeError(
      "IMPULSE_DISTRIBUTION_PERCENTILE_INVALID: percentile must be between 0 and 100",
    );
  }

  const sorted =
    sortAscending(values);

  const index =
    (
      percentileValue /
      100
    ) *
    (
      sorted.length -
      1
    );

  const lowerIndex =
    Math.floor(index);

  const upperIndex =
    Math.ceil(index);

  const lowerValue =
    sorted[lowerIndex];

  const upperValue =
    sorted[upperIndex];

  if (
    lowerValue === undefined ||
    upperValue === undefined
  ) {
    throw new Error(
      "IMPULSE_DISTRIBUTION_PERCENTILE_FAILURE: percentile indexes are unavailable",
    );
  }

  if (
    lowerIndex === upperIndex
  ) {
    return roundToTwoDecimals(
      lowerValue,
    );
  }

  const interpolationWeight =
    index -
    lowerIndex;

  return roundToTwoDecimals(
    lowerValue +
      (
        upperValue -
        lowerValue
      ) *
        interpolationWeight,
  );
}

function computeDistributionStats(
  values: readonly number[],
): ImpulseDistributionStats {
  if (values.length === 0) {
    return EMPTY_DISTRIBUTION_STATS;
  }

  const sorted =
    sortAscending(values);

  const minimum =
    sorted[0];

  const maximum =
    sorted.at(-1);

  if (
    minimum === undefined ||
    maximum === undefined
  ) {
    throw new Error(
      "IMPULSE_DISTRIBUTION_STATS_FAILURE: sorted values are unavailable",
    );
  }

  const sum =
    sorted.reduce(
      (
        accumulator,
        value,
      ) =>
        accumulator +
        value,
      0,
    );

  return Object.freeze({
    min:
      roundToTwoDecimals(
        minimum,
      ),

    max:
      roundToTwoDecimals(
        maximum,
      ),

    mean:
      roundToTwoDecimals(
        sum /
        sorted.length,
      ),

    median:
      percentile(
        sorted,
        50,
      ),

    p25:
      percentile(
        sorted,
        25,
      ),

    p75:
      percentile(
        sorted,
        75,
      ),

    observation_count:
      sorted.length,
  });
}

function extractScores(
  samples:
    readonly ImpulseAdaptiveSample[],

  selector:
    (
      sample:
        ImpulseAdaptiveSample,
    ) =>
      number |
      null |
      undefined,

  variableName:
    string,
): number[] {
  const values: number[] = [];

  for (
    let index = 0;
    index < samples.length;
    index += 1
  ) {
    const sample =
      samples[index];

    if (sample === undefined) {
      throw new Error(
        `IMPULSE_DISTRIBUTION_SAMPLE_UNAVAILABLE: samples[${index}] is unavailable`,
      );
    }

    const value =
      selector(sample);

    if (
      value === null ||
      value === undefined
    ) {
      continue;
    }

    values.push(
      assertScore(
        value,
        `${variableName}[${index}]`,
      ),
    );
  }

  return values;
}

/* ============================================================================
 * 8. EXHAUSTIVE STATE DISTRIBUTION
 * ----------------------------------------------------------------------------
 * Zero represents a real occurrence count of zero inside an explicitly built
 * distribution. It does not represent unavailable analytical truth.
 * ========================================================================== */

function buildStateDistribution(
  samples:
    readonly ImpulseAdaptiveSample[],
): ImpulseStateDistribution {
  let compressionCount = 0;
  let pressureBuildingCount = 0;
  let releaseCount = 0;
  let exhaustionCount = 0;
  let neutralCount = 0;

  for (
    let index = 0;
    index < samples.length;
    index += 1
  ) {
    const sample =
      samples[index];

    if (sample === undefined) {
      throw new Error(
        `IMPULSE_DISTRIBUTION_SAMPLE_UNAVAILABLE: samples[${index}] is unavailable`,
      );
    }

    const state =
      sample.transition_state;

    if (
      state === null ||
      state === undefined
    ) {
      continue;
    }

    if (
      !isCalibratableImpulseTransitionState(
        state,
      )
    ) {
      throw new TypeError(
        `IMPULSE_DISTRIBUTION_STATE_INVALID: samples[${index}].transition_state is invalid`,
      );
    }

    switch (state) {
      case "COMPRESSION":
        compressionCount += 1;
        break;

      case "PRESSURE_BUILDING":
        pressureBuildingCount += 1;
        break;

      case "RELEASE":
        releaseCount += 1;
        break;

      case "EXHAUSTION":
        exhaustionCount += 1;
        break;

      case "NEUTRAL":
        neutralCount += 1;
        break;
    }
  }

  return Object.freeze({
    COMPRESSION:
      compressionCount,

    PRESSURE_BUILDING:
      pressureBuildingCount,

    RELEASE:
      releaseCount,

    EXHAUSTION:
      exhaustionCount,

    NEUTRAL:
      neutralCount,
  });
}

function resolveDominantState(
  distribution:
    ImpulseStateDistribution,

  observedStateCount:
    number,
): CalibratableImpulseTransitionState | null {
  if (
    observedStateCount <= 0
  ) {
    return null;
  }

  const candidates:
    readonly Readonly<{
      state: CalibratableImpulseTransitionState;
      count: number;
    }>[] = [
      {
        state: "COMPRESSION",
        count:
          distribution.COMPRESSION,
      },
      {
        state: "PRESSURE_BUILDING",
        count:
          distribution
            .PRESSURE_BUILDING,
      },
      {
        state: "RELEASE",
        count:
          distribution.RELEASE,
      },
      {
        state: "EXHAUSTION",
        count:
          distribution.EXHAUSTION,
      },
      {
        state: "NEUTRAL",
        count:
          distribution.NEUTRAL,
      },
    ];

  let dominantState:
    CalibratableImpulseTransitionState | null =
    null;

  let dominantCount = -1;

  for (const candidate of candidates) {
    if (
      candidate.count >
      dominantCount
    ) {
      dominantState =
        candidate.state;

      dominantCount =
        candidate.count;
    }
  }

  return dominantState;
}

function computeObservedStateCount(
  distribution:
    ImpulseStateDistribution,
): number {
  return (
    distribution.COMPRESSION +
    distribution
      .PRESSURE_BUILDING +
    distribution.RELEASE +
    distribution.EXHAUSTION +
    distribution.NEUTRAL
  );
}

function computeStateRatio(
  occurrenceCount: number,
  observedStateCount: number,
): number | null {
  if (
    observedStateCount <= 0
  ) {
    return null;
  }

  return roundToTwoDecimals(
    occurrenceCount /
    observedStateCount,
  );
}

/* ============================================================================
 * 9. CANONICAL SNAPSHOT CONSTRUCTION
 * ========================================================================== */

export function buildImpulseDistributionSnapshot(
  input:
    BuildImpulseDistributionSnapshotInput,
): ImpulseDistributionSnapshot {
  const timestamp =
    assertTimestamp(
      input.timestamp,
    );

  const samples =
    [...input.samples];

  const stateDistribution =
    buildStateDistribution(
      samples,
    );

  const observedStateCount =
    computeObservedStateCount(
      stateDistribution,
    );

  const pressureValues =
    extractScores(
      samples,
      (sample) =>
        sample.pressure_score,
      "pressure_score",
    );

  const instabilityValues =
    extractScores(
      samples,
      (sample) =>
        sample.instability_score,
      "instability_score",
    );

  const saturationValues =
    extractScores(
      samples,
      (sample) =>
        sample.saturation_score,
      "saturation_score",
    );

  const exhaustionValues =
    extractScores(
      samples,
      (sample) =>
        sample.exhaustion_score,
      "exhaustion_score",
    );

  const growthValues =
    extractScores(
      samples,
      (sample) =>
        sample.growth_score,
      "growth_score",
    );

  const coreValues =
    extractScores(
      samples,
      (sample) =>
        sample
          .core_pattern_score,
      "core_pattern_score",
    );

  const decayValues =
    extractScores(
      samples,
      (sample) =>
        sample.decay_score,
      "decay_score",
    );

  const warnings =
    uniqueWarnings([
      ...(
        input.policy
          .warnings ??
        []
      ),

      ...(
        input.warnings ??
        []
      ),
    ]);

  return Object.freeze({
    created_at:
      timestamp,

    sample_size:
      samples.length,

    state_distribution:
      stateDistribution,

    pressure_distribution:
      computeDistributionStats(
        pressureValues,
      ),

    instability_distribution:
      computeDistributionStats(
        instabilityValues,
      ),

    saturation_distribution:
      computeDistributionStats(
        saturationValues,
      ),

    exhaustion_distribution:
      computeDistributionStats(
        exhaustionValues,
      ),

    growth_distribution:
      computeDistributionStats(
        growthValues,
      ),

    core_distribution:
      computeDistributionStats(
        coreValues,
      ),

    decay_distribution:
      computeDistributionStats(
        decayValues,
      ),

    dominant_state:
      resolveDominantState(
        stateDistribution,
        observedStateCount,
      ),

    release_ratio:
      computeStateRatio(
        stateDistribution.RELEASE,
        observedStateCount,
      ),

    exhaustion_ratio:
      computeStateRatio(
        stateDistribution
          .EXHAUSTION,
        observedStateCount,
      ),

    compression_ratio:
      computeStateRatio(
        stateDistribution
          .COMPRESSION,
        observedStateCount,
      ),

    policy_source:
      input.policy.source,

    warnings:
      Object.freeze(warnings),
  });
}

/* ============================================================================
 * 10. STORE MUTATION API
 * ----------------------------------------------------------------------------
 * MUTATE is isolated in this section.
 *
 * Snapshot construction remains pure.
 * ========================================================================== */

export function writeImpulseDistributionSnapshot(
  input:
    BuildImpulseDistributionSnapshotInput,
): ImpulseDistributionSnapshot {
  const snapshot =
    buildImpulseDistributionSnapshot(
      input,
    );

  setRuntimeState({
    snapshot,

    updated_at:
      snapshot.created_at,

    warnings:
      snapshot.warnings,
  });

  return copySnapshot(
    snapshot,
  );
}

export function clearImpulseDistributionStore():
  void {
  setRuntimeState(
    INITIAL_STATE,
  );
}

/* ============================================================================
 * 11. IMMUTABLE STORE READ API
 * ========================================================================== */

export function readImpulseDistributionSnapshot():
  ImpulseDistributionSnapshot | null {
  const snapshot =
    getRuntimeState()
      .snapshot;

  return snapshot === null
    ? null
    : copySnapshot(
        snapshot,
      );
}

export function readImpulseDistributionStoreState():
  ImpulseDistributionStoreState {
  return copyStoreState(
    getRuntimeState(),
  );
}

/* ============================================================================
 * 12. OBSERVABILITY READERS
 * ----------------------------------------------------------------------------
 * These readers report stored runtime state only.
 *
 * They do not provide synthetic analytical defaults.
 * ========================================================================== */

export function hasImpulseDistributionSnapshot():
  boolean {
  return (
    getRuntimeState()
      .snapshot !== null
  );
}

export function getImpulseDistributionSampleSize():
  number | null {
  const snapshot =
    getRuntimeState()
      .snapshot;

  return snapshot === null
    ? null
    : snapshot.sample_size;
}

export function getImpulseDominantState():
  CalibratableImpulseTransitionState | null {
  return (
    getRuntimeState()
      .snapshot
      ?.dominant_state ??
    null
  );
}

export function getImpulseDistributionWarnings():
  string[] {
  return [
    ...getRuntimeState()
      .warnings,
  ];
}

/* ============================================================================
 * 13. EMPTY CONTRACT READERS
 * ----------------------------------------------------------------------------
 * Exported only when a consumer needs an explicit empty occurrence structure.
 *
 * This is not an analytical fallback:
 * - state counts are observable counters
 * - distribution statistics remain unavailable through null fields
 * ========================================================================== */

export function readEmptyImpulseStateDistribution():
  ImpulseStateDistribution {
  return copyStateDistribution(
    EMPTY_STATE_DISTRIBUTION,
  );
}

export function readEmptyImpulseDistributionStats():
  ImpulseDistributionStats {
  return copyDistributionStats(
    EMPTY_DISTRIBUTION_STATS,
  );
}
