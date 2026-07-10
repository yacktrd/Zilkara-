/* ============================================================================
 * FILE: lib/xyvala/calibration/impulse-adaptive-thresholds.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala impulse adaptive thresholds
 *
 * ROLE
 * - derive bounded adaptive impulse transition thresholds from real samples
 * - preserve impulse pressure as the primary impulse axis
 * - keep acceleration and alignment as contextual validation axes
 * - use Triple Layer scores as calibration context only
 *
 * DIRECTIVES
 * - deterministic only
 * - calibration layer only
 * - no mutation
 * - no persistence
 * - no RFS recomputation
 * - no MCI recomputation
 * - no public projection
 * - no UI logic
 * - no API logic
 * - no snapshot mutation
 * - no buy / sell / hold semantics
 * - insufficient samples fallback to static defaults
 * - neutral remains fallback, not calibration target dominance
 *
 * INPUTS
 * - impulse score samples
 * - optional Triple Layer context scores
 *
 * OUTPUTS
 * - ImpulseAdaptivePolicy
 *
 * INVARIANTS
 * - pressure remains primary
 * - acceleration validates release dynamics
 * - alignment validates coherent pressure building
 * - instability supports release / exhaustion detection
 * - saturation supports pressure building / exhaustion detection
 * - Triple Layer remains contextual only
 * - thresholds remain bounded
 * ========================================================================== */

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type ImpulseAdaptiveState =
  | "COMPRESSION"
  | "PRESSURE_BUILDING"
  | "RELEASE"
  | "EXHAUSTION"
  | "NEUTRAL";

export type ImpulseAdaptiveSource = "adaptive" | "fallback";

export type ImpulseAdaptiveSample = {
  pressure_score: number;
  acceleration_score?: number;
  alignment_score?: number;
  instability_score: number;
  saturation_score: number;
  exhaustion_score: number;

  growth_score: number | null;
  core_score: number | null;
  decay_score: number | null;

  transition_state?: ImpulseAdaptiveState;
};

export type ImpulseAdaptiveThresholds = {
  compression: {
    pressure_min: number;
    instability_max: number;
    exhaustion_max: number;
    alignment_min: number;
    core_min: number;
  };

  pressure_building: {
    pressure_min: number;
    saturation_min: number;
    instability_min: number;
    acceleration_min: number;
    alignment_min: number;
    growth_min: number;
  };

  release: {
    pressure_min: number;
    instability_min: number;
    saturation_min: number;
    acceleration_min: number;
    alignment_min: number;
    growth_min: number;
    decay_max: number;
  };

  exhaustion: {
    exhaustion_min: number;
    instability_min: number;
    saturation_min: number;
    acceleration_min: number;
    decay_min: number;
  };

  neutral: {
    pressure_max: number;
    instability_max: number;
    saturation_max: number;
    exhaustion_max: number;
  };
};

export type ImpulseAdaptivePolicy = {
  source: ImpulseAdaptiveSource;
  sample_size: number;
  state_sample_size: Record<ImpulseAdaptiveState, number>;
  thresholds: ImpulseAdaptiveThresholds;
  warnings: string[];
};

/* ============================================================================
 * 2. CONSTANTS
 * ========================================================================== */

const MIN_GLOBAL_SAMPLE = 40;
const MIN_STATE_SAMPLE = 8;

const FALLBACK_THRESHOLDS: ImpulseAdaptiveThresholds = {
  compression: {
    pressure_min: 35,
    instability_max: 58,
    exhaustion_max: 55,
    alignment_min: 40,
    core_min: 45,
  },

  pressure_building: {
    pressure_min: 45,
    saturation_min: 38,
    instability_min: 28,
    acceleration_min: 30,
    alignment_min: 40,
    growth_min: 38,
  },

  release: {
    pressure_min: 52,
    instability_min: 42,
    saturation_min: 42,
    acceleration_min: 45,
    alignment_min: 42,
    growth_min: 42,
    decay_max: 72,
  },

  exhaustion: {
    exhaustion_min: 62,
    instability_min: 45,
    saturation_min: 48,
    acceleration_min: 35,
    decay_min: 45,
  },

  neutral: {
    pressure_max: 34,
    instability_max: 34,
    saturation_max: 34,
    exhaustion_max: 34,
  },
};

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function normalizeScore(value: unknown): number | null {
  if (!isFiniteNumber(value)) return null;
  return round2(clamp(value, 0, 100));
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
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

function boundedPercentile(input: {
  values: number[];
  fallback: number[];
  percentile: number;
  min: number;
  max: number;
}): number {
  return round2(
    clamp(
      percentile(
        input.values.length > 0 ? input.values : input.fallback,
        input.percentile,
      ),
      input.min,
      input.max,
    ),
  );
}

function getValues(
  samples: ImpulseAdaptiveSample[],
  selector: (sample: ImpulseAdaptiveSample) => number | null | undefined,
): number[] {
  return samples
    .map(selector)
    .filter((value): value is number => isFiniteNumber(value))
    .map(round2);
}

function inferAdaptiveState(
  sample: ImpulseAdaptiveSample,
): ImpulseAdaptiveState {
  const pressure = normalizeScore(sample.pressure_score) ?? 0;
  const acceleration = normalizeScore(sample.acceleration_score) ?? 50;
  const alignment = normalizeScore(sample.alignment_score) ?? 50;
  const instability = normalizeScore(sample.instability_score) ?? 0;
  const saturation = normalizeScore(sample.saturation_score) ?? 0;
  const exhaustion = normalizeScore(sample.exhaustion_score) ?? 0;

  const growth = normalizeScore(sample.growth_score) ?? 50;
  const core = normalizeScore(sample.core_score) ?? 50;
  const decay = normalizeScore(sample.decay_score) ?? 50;

  const structuralPressure =
    pressure >= 56 &&
    alignment >= 55 &&
    saturation >= 31 &&
    exhaustion <= 45;

  const earlyPressureBuilding =
    pressure >= 54 &&
    alignment >= 60 &&
    saturation >= 30 &&
    acceleration >= 8 &&
    exhaustion <= 42;

  if (structuralPressure || earlyPressureBuilding) {
    return "PRESSURE_BUILDING";
  }

  if (
    pressure >= 58 &&
    acceleration >= 36 &&
    saturation >= 36 &&
    alignment >= 48 &&
    instability >= 18 &&
    exhaustion <= 58
  ) {
    return "RELEASE";
  }

  if (
    exhaustion >= 52 &&
    saturation >= 40 &&
    instability >= 28 &&
    decay >= 45
  ) {
    return "EXHAUSTION";
  }

  if (
    pressure >= 34 &&
    instability <= 42 &&
    exhaustion <= 42 &&
    saturation <= 34 &&
    core >= 45
  ) {
    return "COMPRESSION";
  }

  if (
    pressure <= 36 &&
    instability <= 34 &&
    saturation <= 34 &&
    exhaustion <= 34
  ) {
    return "NEUTRAL";
  }

  return "NEUTRAL";
}

function resolveSampleState(
  sample: ImpulseAdaptiveSample,
): ImpulseAdaptiveState {
  const inferred = inferAdaptiveState(sample);

  console.log("XYVALA_IMPULSE_CALIBRATION_CLASSIFIER", {
    pressure: sample.pressure_score,
    acceleration: sample.acceleration_score,
    alignment: sample.alignment_score,
    instability: sample.instability_score,
    saturation: sample.saturation_score,
    exhaustion: sample.exhaustion_score,
    growth: sample.growth_score,
    core: sample.core_score,
    decay: sample.decay_score,
    stored_state: sample.transition_state ?? null,
    inferred_state: inferred,
  });

  return inferred;
}

function getStateSamples(
  samples: ImpulseAdaptiveSample[],
  state: ImpulseAdaptiveState,
): ImpulseAdaptiveSample[] {
  return samples.filter((sample) => resolveSampleState(sample) === state);
}

function countStateSamples(
  samples: ImpulseAdaptiveSample[],
): Record<ImpulseAdaptiveState, number> {
  return {
    COMPRESSION: getStateSamples(samples, "COMPRESSION").length,
    PRESSURE_BUILDING: getStateSamples(samples, "PRESSURE_BUILDING").length,
    RELEASE: getStateSamples(samples, "RELEASE").length,
    EXHAUSTION: getStateSamples(samples, "EXHAUSTION").length,
    NEUTRAL: getStateSamples(samples, "NEUTRAL").length,
  };
}

/* ============================================================================
 * 4. SANITIZATION
 * ========================================================================== */

function sanitizeSample(
  sample: ImpulseAdaptiveSample,
): ImpulseAdaptiveSample | null {
  const pressure = normalizeScore(sample.pressure_score);
  const instability = normalizeScore(sample.instability_score);
  const saturation = normalizeScore(sample.saturation_score);
  const exhaustion = normalizeScore(sample.exhaustion_score);

  if (
    pressure === null ||
    instability === null ||
    saturation === null ||
    exhaustion === null
  ) {
    return null;
  }

  const acceleration = normalizeScore(sample.acceleration_score);
  const alignment = normalizeScore(sample.alignment_score);

  return {
    pressure_score: pressure,

    ...(acceleration !== null ? { acceleration_score: acceleration } : {}),
    ...(alignment !== null ? { alignment_score: alignment } : {}),

    instability_score: instability,
    saturation_score: saturation,
    exhaustion_score: exhaustion,

    growth_score: normalizeScore(sample.growth_score),
    core_score: normalizeScore(sample.core_score),
    decay_score: normalizeScore(sample.decay_score),

    ...(sample.transition_state !== undefined
      ? { transition_state: sample.transition_state }
      : {}),
  };
}

function sanitizeSamples(
  samples: readonly ImpulseAdaptiveSample[],
): ImpulseAdaptiveSample[] {
  return samples
    .map(sanitizeSample)
    .filter((sample): sample is ImpulseAdaptiveSample => sample !== null);
}

/* ============================================================================
 * 5. FALLBACK POLICY
 * ========================================================================== */

function buildFallbackPolicy(
  samples: ImpulseAdaptiveSample[],
  warnings: string[],
): ImpulseAdaptivePolicy {
  return {
    source: "fallback",
    sample_size: samples.length,
    state_sample_size: countStateSamples(samples),
    thresholds: FALLBACK_THRESHOLDS,
    warnings,
  };
}

/* ============================================================================
 * 6. ADAPTIVE THRESHOLD BUILDER
 * ========================================================================== */

export function buildImpulseAdaptivePolicy(
  inputSamples: readonly ImpulseAdaptiveSample[],
): ImpulseAdaptivePolicy {
  const samples = sanitizeSamples(inputSamples);
  const warnings: string[] = [];

  console.log("XYVALA_BUILD_POLICY_ENTRY", {
  inputSamples: inputSamples.length,
  samples: samples.length,
});

  if (samples.length < MIN_GLOBAL_SAMPLE) {
    warnings.push("impulse_adaptive_thresholds_insufficient_global_sample");
    return buildFallbackPolicy(samples, warnings);
  }

  const compressionSamples = getStateSamples(samples, "COMPRESSION");
  const pressureSamples = getStateSamples(samples, "PRESSURE_BUILDING");
  const releaseSamples = getStateSamples(samples, "RELEASE");
  const exhaustionSamples = getStateSamples(samples, "EXHAUSTION");
  const neutralSamples = getStateSamples(samples, "NEUTRAL");

  const stateCounts = countStateSamples(samples);

  const useCompressionCalibration =
    stateCounts.COMPRESSION >= MIN_STATE_SAMPLE;

  const usePressureCalibration =
    stateCounts.PRESSURE_BUILDING >= MIN_STATE_SAMPLE;

  const useReleaseCalibration =
    stateCounts.RELEASE >= MIN_STATE_SAMPLE;

  const useExhaustionCalibration =
    stateCounts.EXHAUSTION >= MIN_STATE_SAMPLE;

  const useNeutralCalibration =
    stateCounts.NEUTRAL >= MIN_STATE_SAMPLE;

  const compressionRatio = compressionSamples.length / samples.length;
  const pressureRatio = pressureSamples.length / samples.length;
  const releaseRatio = releaseSamples.length / samples.length;
  const exhaustionRatio = exhaustionSamples.length / samples.length;
  const neutralRatio = neutralSamples.length / samples.length;

  if (!useCompressionCalibration) {
    warnings.push("impulse_adaptive_thresholds_insufficient_compression_sample");
  }

  if (!usePressureCalibration) {
    warnings.push(
      "impulse_adaptive_thresholds_insufficient_pressure_building_sample",
    );
  }

  if (!useReleaseCalibration) {
    warnings.push("impulse_adaptive_thresholds_insufficient_release_sample");
  }

  if (!useExhaustionCalibration) {
    warnings.push("impulse_adaptive_thresholds_insufficient_exhaustion_sample");
  }

  if (!useNeutralCalibration) {
    warnings.push("impulse_adaptive_thresholds_insufficient_neutral_sample");
  }

  if (compressionRatio > 0.7) {
    warnings.push("impulse_adaptive_thresholds_compression_dominance");
  }

  if (pressureRatio > 0.7) {
    warnings.push("impulse_adaptive_thresholds_pressure_building_dominance");
  }

  if (releaseRatio > 0.7) {
    warnings.push("impulse_adaptive_thresholds_release_dominance");
  }

  if (exhaustionRatio > 0.7) {
    warnings.push("impulse_adaptive_thresholds_exhaustion_dominance");
  }

  if (neutralRatio > 0.7) {
    warnings.push("impulse_adaptive_thresholds_neutral_dominance");
  }

  const globalPressure = getValues(samples, (sample) => sample.pressure_score);
  const globalAcceleration = getValues(
    samples,
    (sample) => sample.acceleration_score,
  );
  const globalAlignment = getValues(samples, (sample) => sample.alignment_score);
  const globalInstability = getValues(
    samples,
    (sample) => sample.instability_score,
  );
  const globalSaturation = getValues(
    samples,
    (sample) => sample.saturation_score,
  );
  const globalExhaustion = getValues(
    samples,
    (sample) => sample.exhaustion_score,
  );
  const globalGrowth = getValues(samples, (sample) => sample.growth_score);
  const globalCore = getValues(samples, (sample) => sample.core_score);
  const globalDecay = getValues(samples, (sample) => sample.decay_score);

  function distributionAudit(values: number[]) {
  return {
    count: values.length,
    p10: boundedPercentile({ values, fallback: [0], percentile: 10, min: 0, max: 100 }),
    p25: boundedPercentile({ values, fallback: [0], percentile: 25, min: 0, max: 100 }),
    p50: boundedPercentile({ values, fallback: [0], percentile: 50, min: 0, max: 100 }),
    p75: boundedPercentile({ values, fallback: [0], percentile: 75, min: 0, max: 100 }),
    p90: boundedPercentile({ values, fallback: [0], percentile: 90, min: 0, max: 100 }),
  };
}

console.log("XYVALA_IMPULSE_DISTRIBUTION_AUDIT", {
  pressure: distributionAudit(globalPressure),
  acceleration: distributionAudit(globalAcceleration),
  alignment: distributionAudit(globalAlignment),
  instability: distributionAudit(globalInstability),
  saturation: distributionAudit(globalSaturation),
  exhaustion: distributionAudit(globalExhaustion),
  growth: distributionAudit(globalGrowth),
  core: distributionAudit(globalCore),
  decay: distributionAudit(globalDecay),
});


  const pressureFallback =
    globalPressure.length > 0
      ? globalPressure
      : [FALLBACK_THRESHOLDS.pressure_building.pressure_min];

  const accelerationFallback =
    globalAcceleration.length > 0
      ? globalAcceleration
      : [FALLBACK_THRESHOLDS.pressure_building.acceleration_min];

  const alignmentFallback =
    globalAlignment.length > 0
      ? globalAlignment
      : [FALLBACK_THRESHOLDS.pressure_building.alignment_min];

  const instabilityFallback =
    globalInstability.length > 0
      ? globalInstability
      : [FALLBACK_THRESHOLDS.pressure_building.instability_min];

  const saturationFallback =
    globalSaturation.length > 0
      ? globalSaturation
      : [FALLBACK_THRESHOLDS.pressure_building.saturation_min];

  const exhaustionFallback =
    globalExhaustion.length > 0
      ? globalExhaustion
      : [FALLBACK_THRESHOLDS.exhaustion.exhaustion_min];

  const growthFallback =
    globalGrowth.length > 0
      ? globalGrowth
      : [FALLBACK_THRESHOLDS.pressure_building.growth_min];

  const coreFallback =
    globalCore.length > 0
      ? globalCore
      : [FALLBACK_THRESHOLDS.compression.core_min];

  const decayFallback =
    globalDecay.length > 0
      ? globalDecay
      : [FALLBACK_THRESHOLDS.exhaustion.decay_min];

  const thresholds: ImpulseAdaptiveThresholds = {
    compression: {
  pressure_min: boundedPercentile({
    values: useCompressionCalibration
      ? getValues(compressionSamples, (sample) => sample.pressure_score)
      : [],
    fallback: [FALLBACK_THRESHOLDS.compression.pressure_min],
    percentile: 45,
    min: 30,
    max: 58,
  }),
  instability_max: boundedPercentile({
    values: useCompressionCalibration
      ? getValues(compressionSamples, (sample) => sample.instability_score)
      : [],
    fallback: [FALLBACK_THRESHOLDS.compression.instability_max],
    percentile: 62,
    min: 42,
    max: 68,
  }),
  exhaustion_max: boundedPercentile({
    values: useCompressionCalibration
      ? getValues(compressionSamples, (sample) => sample.exhaustion_score)
      : [],
    fallback: [FALLBACK_THRESHOLDS.compression.exhaustion_max],
    percentile: 62,
    min: 38,
    max: 66,
  }),
  alignment_min: boundedPercentile({
    values: useCompressionCalibration
      ? getValues(compressionSamples, (sample) => sample.alignment_score)
      : [],
    fallback: [FALLBACK_THRESHOLDS.compression.alignment_min],
    percentile: 42,
    min: 30,
    max: 62,
  }),
  core_min: boundedPercentile({
    values: useCompressionCalibration
      ? getValues(compressionSamples, (sample) => sample.core_score)
      : [],
    fallback: [FALLBACK_THRESHOLDS.compression.core_min],
    percentile: 45,
    min: 35,
    max: 55,
  }),
},

    pressure_building: {
      pressure_min: boundedPercentile({
        values: usePressureCalibration
          ? getValues(pressureSamples, (sample) => sample.pressure_score)
          : [],
        fallback: pressureFallback,
        percentile: 55,
        min: 38,
        max: 68,
      }),
      saturation_min: boundedPercentile({
        values: usePressureCalibration
          ? getValues(pressureSamples, (sample) => sample.saturation_score)
          : [],
        fallback: saturationFallback,
        percentile: 45,
        min: 32,
        max: 65,
      }),
      instability_min: boundedPercentile({
        values: usePressureCalibration
          ? getValues(pressureSamples, (sample) => sample.instability_score)
          : [],
        fallback: instabilityFallback,
        percentile: 38,
        min: 24,
        max: 62,
      }),
      acceleration_min: boundedPercentile({
        values: usePressureCalibration
          ? getValues(pressureSamples, (sample) => sample.acceleration_score)
          : [],
        fallback: accelerationFallback,
        percentile: 42,
        min: 28,
        max: 66,
      }),
      alignment_min: boundedPercentile({
        values: usePressureCalibration
          ? getValues(pressureSamples, (sample) => sample.alignment_score)
          : [],
        fallback: alignmentFallback,
        percentile: 45,
        min: 30,
        max: 66,
      }),
      growth_min: boundedPercentile({
        values: usePressureCalibration
          ? getValues(pressureSamples, (sample) => sample.growth_score)
          : [],
        fallback: growthFallback,
        percentile: 42,
        min: 30,
        max: 62,
      }),
    },

    release: {
      pressure_min: boundedPercentile({
        values: useReleaseCalibration
          ? getValues(releaseSamples, (sample) => sample.pressure_score)
          : [],
        fallback: [FALLBACK_THRESHOLDS.release.pressure_min],
        percentile: 58,
        min: 42,
        max: 72,
      }),
      instability_min: boundedPercentile({
        values: useReleaseCalibration
          ? getValues(releaseSamples, (sample) => sample.instability_score)
          : [],
        fallback: [FALLBACK_THRESHOLDS.release.instability_min],
        percentile: 50,
        min: 34,
        max: 70,
      }),
      saturation_min: boundedPercentile({
        values: useReleaseCalibration
          ? getValues(releaseSamples, (sample) => sample.saturation_score)
          : [],
        fallback: [FALLBACK_THRESHOLDS.release.saturation_min],
        percentile: 48,
        min: 34,
        max: 68,
      }),
      acceleration_min: boundedPercentile({
        values: useReleaseCalibration
          ? getValues(releaseSamples, (sample) => sample.acceleration_score)
          : [],
        fallback: [FALLBACK_THRESHOLDS.release.acceleration_min],
        percentile: 55,
        min: 36,
        max: 72,
      }),
      alignment_min: boundedPercentile({
        values: useReleaseCalibration
          ? getValues(releaseSamples, (sample) => sample.alignment_score)
          : [],
        fallback: [FALLBACK_THRESHOLDS.release.alignment_min],
        percentile: 48,
        min: 32,
        max: 70,
      }),
      growth_min: boundedPercentile({
        values: useReleaseCalibration
          ? getValues(releaseSamples, (sample) => sample.growth_score)
          : [],
        fallback: [FALLBACK_THRESHOLDS.release.growth_min],
        percentile: 48,
        min: 34,
        max: 66,
      }),
      decay_max: boundedPercentile({
        values: useReleaseCalibration
          ? getValues(releaseSamples, (sample) => sample.decay_score)
          : [],
        fallback: [FALLBACK_THRESHOLDS.release.decay_max],
        percentile: 70,
        min: 52,
        max: 82,
      }),
    },

    exhaustion: {
      exhaustion_min: boundedPercentile({
        values: useExhaustionCalibration
          ? getValues(exhaustionSamples, (sample) => sample.exhaustion_score)
          : [],
        fallback: [FALLBACK_THRESHOLDS.exhaustion.exhaustion_min],
        percentile: 58,
        min: 48,
        max: 78,
      }),
      instability_min: boundedPercentile({
        values: useExhaustionCalibration
          ? getValues(exhaustionSamples, (sample) => sample.instability_score)
          : [],
        fallback: [FALLBACK_THRESHOLDS.exhaustion.instability_min],
        percentile: 52,
        min: 35,
        max: 72,
      }),
      saturation_min: boundedPercentile({
        values: useExhaustionCalibration
          ? getValues(exhaustionSamples, (sample) => sample.saturation_score)
          : [],
        fallback: [FALLBACK_THRESHOLDS.exhaustion.saturation_min],
        percentile: 52,
        min: 36,
        max: 72,
      }),
      acceleration_min: boundedPercentile({
        values: useExhaustionCalibration
          ? getValues(exhaustionSamples, (sample) => sample.acceleration_score)
          : [],
        fallback: [FALLBACK_THRESHOLDS.exhaustion.acceleration_min],
        percentile: 50,
        min: 32,
        max: 70,
      }),
      decay_min: boundedPercentile({
        values: useExhaustionCalibration
          ? getValues(exhaustionSamples, (sample) => sample.decay_score)
          : [],
        fallback: [FALLBACK_THRESHOLDS.exhaustion.decay_min],
        percentile: 50,
        min: 35,
        max: 72,
      }),
    },

    neutral: {
      pressure_max: boundedPercentile({
        values: useNeutralCalibration
          ? getValues(neutralSamples, (sample) => sample.pressure_score)
          : [],
        fallback: [FALLBACK_THRESHOLDS.neutral.pressure_max],
        percentile: 65,
        min: 25,
        max: 52,
      }),
      instability_max: boundedPercentile({
        values: useNeutralCalibration
          ? getValues(neutralSamples, (sample) => sample.instability_score)
          : [],
        fallback: [FALLBACK_THRESHOLDS.neutral.instability_max],
        percentile: 65,
        min: 25,
        max: 56,
      }),
      saturation_max: boundedPercentile({
        values: useNeutralCalibration
          ? getValues(neutralSamples, (sample) => sample.saturation_score)
          : [],
        fallback: [FALLBACK_THRESHOLDS.neutral.saturation_max],
        percentile: 65,
        min: 25,
        max: 56,
      }),
      exhaustion_max: boundedPercentile({
        values: useNeutralCalibration
          ? getValues(neutralSamples, (sample) => sample.exhaustion_score)
          : [],
        fallback: [FALLBACK_THRESHOLDS.neutral.exhaustion_max],
        percentile: 65,
        min: 25,
        max: 56,
      }),
    },
  };


  console.log("XYVALA_IMPULSE_DISTRIBUTION_AUDIT_REACHED", {
  samples: samples.length,
  pressureCount: globalPressure.length,
  accelerationCount: globalAcceleration.length,
  alignmentCount: globalAlignment.length,
  instabilityCount: globalInstability.length,
  saturationCount: globalSaturation.length,
  exhaustionCount: globalExhaustion.length,
});

console.log("XYVALA_IMPULSE_DISTRIBUTION_AUDIT", {
  pressure: distributionAudit(globalPressure),
  acceleration: distributionAudit(globalAcceleration),
  alignment: distributionAudit(globalAlignment),
  instability: distributionAudit(globalInstability),
  saturation: distributionAudit(globalSaturation),
  exhaustion: distributionAudit(globalExhaustion),
  growth: distributionAudit(globalGrowth),
  core: distributionAudit(globalCore),
  decay: distributionAudit(globalDecay),
});

  return {
    source: "adaptive",
    sample_size: samples.length,
    state_sample_size: stateCounts,
    thresholds,
    warnings,
  };
}

/* ============================================================================
 * 7. POLICY APPLICATION HELPER
 * ========================================================================== */

export function resolveImpulseStateWithAdaptivePolicy(input: {
  pressure_score: number;
  acceleration_score?: number;
  alignment_score?: number;
  instability_score: number;
  saturation_score: number;
  exhaustion_score: number;

  growth_score: number | null;
  core_score: number | null;
  decay_score: number | null;

  policy: ImpulseAdaptivePolicy;
}): ImpulseAdaptiveState {
  const pressure = normalizeScore(input.pressure_score) ?? 0;
  const acceleration = normalizeScore(input.acceleration_score) ?? 50;
  const alignment = normalizeScore(input.alignment_score) ?? 50;
  const instability = normalizeScore(input.instability_score) ?? 0;
  const saturation = normalizeScore(input.saturation_score) ?? 0;
  const exhaustion = normalizeScore(input.exhaustion_score) ?? 0;

  const growth = normalizeScore(input.growth_score) ?? 50;
  const core = normalizeScore(input.core_score) ?? 50;
  const decay = normalizeScore(input.decay_score) ?? 50;

  const thresholds = input.policy.thresholds;

  const exhaustionMatch =
    exhaustion >= thresholds.exhaustion.exhaustion_min &&
    instability >= thresholds.exhaustion.instability_min &&
    saturation >= thresholds.exhaustion.saturation_min &&
    acceleration >= thresholds.exhaustion.acceleration_min &&
    decay >= thresholds.exhaustion.decay_min;

  const releaseMatch =
    pressure >= thresholds.release.pressure_min &&
    saturation >= thresholds.release.saturation_min &&
    acceleration >= thresholds.release.acceleration_min &&
    alignment >= thresholds.release.alignment_min &&
    instability >= thresholds.release.instability_min &&
    growth >= thresholds.release.growth_min &&
    decay <= thresholds.release.decay_max;

  const pressureBuildingCore =
    pressure >= thresholds.pressure_building.pressure_min &&
    saturation >= thresholds.pressure_building.saturation_min &&
    alignment >= thresholds.pressure_building.alignment_min;

  const pressureBuildingContext =
    acceleration >= thresholds.pressure_building.acceleration_min ||
    pressure >= thresholds.pressure_building.pressure_min + 2 ||
    growth >= thresholds.pressure_building.growth_min;

  const pressureBuildingMatch =
    pressureBuildingCore && pressureBuildingContext;

  const compressionMatch =
    pressure >= thresholds.compression.pressure_min &&
    instability <= thresholds.compression.instability_max &&
    exhaustion <= thresholds.compression.exhaustion_max &&
    saturation <= thresholds.pressure_building.saturation_min &&
    core >= thresholds.compression.core_min;

  const neutralMatch =
    pressure <= thresholds.neutral.pressure_max &&
    instability <= thresholds.neutral.instability_max &&
    saturation <= thresholds.neutral.saturation_max &&
    exhaustion <= thresholds.neutral.exhaustion_max;

  console.log("XYVALA_IMPULSE_POLICY_EVALUATION", {
    pressure,
    acceleration,
    alignment,
    instability,
    saturation,
    exhaustion,
    growth,
    core,
    decay,

    exhaustionMatch,
    releaseMatch,
    pressureBuildingCore,
    pressureBuildingContext,
    pressureBuildingMatch,
    compressionMatch,
    neutralMatch,
  });

  if (exhaustionMatch) {
    return "EXHAUSTION";
  }

  if (releaseMatch) {
    return "RELEASE";
  }

  if (pressureBuildingMatch) {
    return "PRESSURE_BUILDING";
  }

  if (compressionMatch) {
    return "COMPRESSION";
  }

  if (neutralMatch) {
    return "NEUTRAL";
  }

  return "NEUTRAL";
}
