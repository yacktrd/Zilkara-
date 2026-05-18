/* ============================================================================
 * FILE: lib/xyvala/calibration/impulse-distribution-store.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala impulse distribution runtime store
 *
 * ROLE
 * - persist deterministic runtime impulse distribution snapshots
 * - centralize adaptive impulse distribution observability
 * - provide stable impulse calibration runtime state
 * - expose immutable distribution statistics for orchestrators
 *
 * PARENT FILES
 * - lib/xyvala/calibration/impulse-adaptive-thresholds.ts
 * - lib/xyvala/engine/impulse-state-core.ts
 * - lib/xyvala/scan-engine.ts
 *
 * DIRECTIVES
 * - deterministic only
 * - no UI logic
 * - no API logic
 * - no provider parsing
 * - no market prediction
 * - no investment semantics
 * - no score recomputation
 * - runtime storage only
 * - immutable snapshot reads
 * - same input => same output
 *
 * INPUTS
 * - impulse adaptive samples
 * - impulse adaptive policy
 * - runtime timestamps
 *
 * OUTPUTS
 * - runtime impulse distribution snapshot
 * - state distributions
 * - score distributions
 * - transition distributions
 * - calibration observability metrics
 *
 * INVARIANTS
 * - distribution store does not compute market decisions
 * - distribution store does not mutate source scores
 * - distribution store does not rebuild impulse logic
 * - distribution store stores observable runtime distributions only
 * - snapshot reads remain immutable
 *
 * SENSITIVE ZONES
 * - runtime persistence consistency
 * - distribution drift
 * - transition explosion
 * - release saturation
 * - excessive exhaustion propagation
 * ========================================================================== */

import type {
  ImpulseAdaptivePolicy,
  ImpulseAdaptiveSample,
  ImpulseAdaptiveState,
} from "@/lib/xyvala/calibration/impulse-adaptive-thresholds";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type ImpulseDistributionSnapshot = {
  created_at: number;

  sample_size: number;

  state_distribution: Record<ImpulseAdaptiveState, number>;

  pressure_distribution: ImpulseDistributionStats;
  instability_distribution: ImpulseDistributionStats;
  saturation_distribution: ImpulseDistributionStats;
  exhaustion_distribution: ImpulseDistributionStats;

  growth_distribution: ImpulseDistributionStats;
  core_distribution: ImpulseDistributionStats;
  decay_distribution: ImpulseDistributionStats;

  dominant_state: ImpulseAdaptiveState;

  release_ratio: number;
  exhaustion_ratio: number;
  compression_ratio: number;

  policy_source: ImpulseAdaptivePolicy["source"];

  warnings: string[];
};

export type ImpulseDistributionStats = {
  min: number;
  max: number;
  mean: number;
  median: number;
  p25: number;
  p75: number;
};

export type ImpulseDistributionStoreState = {
  snapshot: ImpulseDistributionSnapshot | null;
  updated_at: number | null;
  warnings: string[];
};

/* ============================================================================
 * 2. CONSTANTS
 * ========================================================================== */

const EMPTY_STATS: ImpulseDistributionStats = {
  min: 0,
  max: 0,
  mean: 0,
  median: 0,
  p25: 0,
  p75: 0,
};

const INITIAL_STATE: ImpulseDistributionStoreState = {
  snapshot: null,
  updated_at: null,
  warnings: [],
};

/* ============================================================================
 * 3. RUNTIME STATE
 * ========================================================================== */

let runtimeState: ImpulseDistributionStoreState = INITIAL_STATE;

/* ============================================================================
 * 4. SAFE HELPERS
 * ========================================================================== */

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function round2(value: number): number {
  if (!isFiniteNumber(value)) return 0;
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min = 0, max = 100): number {
  if (!isFiniteNumber(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function normalizeNullableScore(value: unknown): number | null {
  if (!isFiniteNumber(value)) return null;
  return round2(clamp(value));
}

function uniqueWarnings(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

/* ============================================================================
 * 5. DISTRIBUTION HELPERS
 * ========================================================================== */

function sortAscending(values: readonly number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;

  const sorted = sortAscending(values);

  const index = (p / 100) * (sorted.length - 1);

  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower] ?? 0;
  }

  const weight = index - lower;

  const lowerValue = sorted[lower] ?? 0;
  const upperValue = sorted[upper] ?? lowerValue;

  return lowerValue + (upperValue - lowerValue) * weight;
}

function computeDistributionStats(
  values: readonly number[],
): ImpulseDistributionStats {
  if (values.length === 0) {
    return EMPTY_STATS;
  }

  const sorted = sortAscending(values);

  const sum = sorted.reduce((accumulator, value) => accumulator + value, 0);

  return {
    min: round2(sorted[0] ?? 0),

    max: round2(sorted[sorted.length - 1] ?? 0),

    mean: round2(sum / sorted.length),

    median: round2(percentile(sorted, 50)),

    p25: round2(percentile(sorted, 25)),

    p75: round2(percentile(sorted, 75)),
  };
}

function extractScores(
  samples: readonly ImpulseAdaptiveSample[],
  selector: (sample: ImpulseAdaptiveSample) => number | null | undefined,
): number[] {
  return samples
    .map(selector)
    .filter(isFiniteNumber)
    .map((value) => round2(clamp(value)));
}

/* ============================================================================
 * 6. STATE DISTRIBUTIONS
 * ========================================================================== */

function buildStateDistribution(
  samples: readonly ImpulseAdaptiveSample[],
): Record<ImpulseAdaptiveState, number> {
  const distribution: Record<ImpulseAdaptiveState, number> = {
    COMPRESSION: 0,
    PRESSURE_BUILDING: 0,
    RELEASE: 0,
    EXHAUSTION: 0,
    NEUTRAL: 0,
  };

  for (const sample of samples) {
    const state = sample.transition_state;

    if (state) {
      distribution[state] += 1;
    }
  }

  return distribution;
}

function resolveDominantState(
  distribution: Record<ImpulseAdaptiveState, number>,
): ImpulseAdaptiveState {
  let dominant: ImpulseAdaptiveState = "NEUTRAL";
  let highest = -1;

  for (const state of Object.keys(distribution) as ImpulseAdaptiveState[]) {
    const value = distribution[state];

    if (value > highest) {
      highest = value;
      dominant = state;
    }
  }

  return dominant;
}

function safeRatio(value: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return round2(value / total);
}

/* ============================================================================
 * 7. SNAPSHOT BUILDING
 * ========================================================================== */

export function buildImpulseDistributionSnapshot(input: {
  samples: readonly ImpulseAdaptiveSample[];
  policy: ImpulseAdaptivePolicy;
  warnings?: readonly string[];
  timestamp?: number;
}): ImpulseDistributionSnapshot {
  const samples = [...input.samples];

  const stateDistribution = buildStateDistribution(samples);

  const dominantState = resolveDominantState(stateDistribution);

  const sampleSize = samples.length;

  const pressureValues = extractScores(
    samples,
    (sample) => sample.pressure_score,
  );

  const instabilityValues = extractScores(
    samples,
    (sample) => sample.instability_score,
  );

  const saturationValues = extractScores(
    samples,
    (sample) => sample.saturation_score,
  );

  const exhaustionValues = extractScores(
    samples,
    (sample) => sample.exhaustion_score,
  );

  const growthValues = extractScores(
    samples,
    (sample) => sample.growth_score,
  );

  const coreValues = extractScores(
    samples,
    (sample) => sample.core_score,
  );

  const decayValues = extractScores(
    samples,
    (sample) => sample.decay_score,
  );

  return {
    created_at: input.timestamp ?? Date.now(),

    sample_size: sampleSize,

    state_distribution: stateDistribution,

    pressure_distribution: computeDistributionStats(pressureValues),

    instability_distribution: computeDistributionStats(instabilityValues),

    saturation_distribution: computeDistributionStats(saturationValues),

    exhaustion_distribution: computeDistributionStats(exhaustionValues),

    growth_distribution: computeDistributionStats(growthValues),

    core_distribution: computeDistributionStats(coreValues),

    decay_distribution: computeDistributionStats(decayValues),

    dominant_state: dominantState,

    release_ratio: safeRatio(
      stateDistribution.RELEASE,
      sampleSize,
    ),

    exhaustion_ratio: safeRatio(
      stateDistribution.EXHAUSTION,
      sampleSize,
    ),

    compression_ratio: safeRatio(
      stateDistribution.COMPRESSION,
      sampleSize,
    ),

    policy_source: input.policy.source,

    warnings: uniqueWarnings([
      ...(input.policy.warnings ?? []),
      ...(input.warnings ?? []),
    ]),
  };
}

/* ============================================================================
 * 8. STORE API
 * ========================================================================== */

export function writeImpulseDistributionSnapshot(input: {
  samples: readonly ImpulseAdaptiveSample[];
  policy: ImpulseAdaptivePolicy;
  warnings?: readonly string[];
  timestamp?: number;
}): ImpulseDistributionSnapshot {
  const snapshotInput: {
  samples: readonly ImpulseAdaptiveSample[];
  policy: ImpulseAdaptivePolicy;
  warnings?: readonly string[];
  timestamp?: number;
} = {
  samples: input.samples,
  policy: input.policy,
};

if (input.warnings !== undefined) {
  snapshotInput.warnings = input.warnings;
}

if (input.timestamp !== undefined) {
  snapshotInput.timestamp = input.timestamp;
}

const snapshot =
  buildImpulseDistributionSnapshot(snapshotInput);

  runtimeState = {
    snapshot,
    updated_at: snapshot.created_at,
    warnings: snapshot.warnings,
  };

  return snapshot;
}

export function readImpulseDistributionSnapshot():
  | ImpulseDistributionSnapshot
  | null {
  return runtimeState.snapshot;
}

export function readImpulseDistributionStoreState():
  Readonly<ImpulseDistributionStoreState> {
  return {
    snapshot: runtimeState.snapshot,
    updated_at: runtimeState.updated_at,
    warnings: [...runtimeState.warnings],
  };
}

export function clearImpulseDistributionStore(): void {
  runtimeState = INITIAL_STATE;
}

/* ============================================================================
 * 9. OBSERVABILITY HELPERS
 * ========================================================================== */

export function hasImpulseDistributionSnapshot(): boolean {
  return runtimeState.snapshot !== null;
}

export function getImpulseDistributionSampleSize(): number {
  return runtimeState.snapshot?.sample_size ?? 0;
}

export function getImpulseDominantState(): ImpulseAdaptiveState {
  return runtimeState.snapshot?.dominant_state ?? "NEUTRAL";
}

export function getImpulseDistributionWarnings(): string[] {
  return [...runtimeState.warnings];
}
