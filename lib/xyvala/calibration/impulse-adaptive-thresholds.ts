/* ============================================================================
 * FILE: lib/xyvala/calibration/impulse-adaptive-thresholds.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala impulse adaptive thresholds
 *
 * ROLE
 * - derive adaptive impulse transition thresholds from real impulse samples
 * - preserve Xyvala analytical hierarchy
 * - use Triple Layer scores as calibration context only
 * - prevent static impulse threshold drift by bounded percentile logic
 *
 * PARENT FILES
 * - lib/xyvala/engine/impulse-state-core.ts
 * - lib/xyvala/calibration/adaptive-thresholds.ts
 * - lib/xyvala/contracts/scan-private-contract.ts
 * - lib/xyvala/calibration/contracts/calibration-scoring-contracts.ts
 *
 * DIRECTIVES
 * - deterministic only
 * - calibration layer only
 * - no RFS recomputation
 * - no MCI recomputation
 * - no public projection
 * - no UI logic
 * - no API logic
 * - no snapshot mutation
 * - no automatic persistence
 * - no buy / sell / hold semantics
 * - no investment advice
 * - Triple Layer is contextual, never decisional
 * - thresholds must remain bounded
 * - insufficient samples must fallback to static defaults
 * - same input => same output
 *
 * INPUTS
 * - impulse score samples
 * - optional Triple Layer context scores
 *
 * OUTPUTS
 * - bounded adaptive impulse thresholds
 * - sample metadata
 * - calibration warnings
 *
 * INVARIANTS
 * - impulse pressure remains the primary impulse axis
 * - instability supports release / exhaustion detection
 * - saturation supports pressure building / exhaustion detection
 * - exhaustion remains independently bounded
 * - growth/core/decay only adjust calibration context
 * - neutral remains fallback, not a target decision
 *
 * CRITICAL DEPENDENCIES
 * - impulse-state-core transition states
 * - existing adaptive-thresholds percentile pattern
 *
 * SENSITIVE ZONES
 * - over-calibration
 * - false transition activation
 * - public/private leakage
 * - Triple Layer over-dominance
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
    core_min: number;
  };

  pressure_building: {
    pressure_min: number;
    saturation_min: number;
    instability_min: number;
    growth_min: number;
  };

  release: {
    pressure_min: number;
    instability_min: number;
    saturation_min: number;
    growth_min: number;
    decay_max: number;
  };

  exhaustion: {
    exhaustion_min: number;
    instability_min: number;
    saturation_min: number;
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
    core_min: 45,
  },

  pressure_building: {
    pressure_min: 45,
    saturation_min: 42,
    instability_min: 35,
    growth_min: 38,
  },

  release: {
    pressure_min: 52,
    instability_min: 48,
    saturation_min: 45,
    growth_min: 42,
    decay_max: 72,
  },

  exhaustion: {
    exhaustion_min: 62,
    instability_min: 45,
    saturation_min: 48,
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

function getValues(
  samples: ImpulseAdaptiveSample[],
  selector: (sample: ImpulseAdaptiveSample) => number | null,
): number[] {
  return samples
    .map(selector)
    .filter((value): value is number => isFiniteNumber(value))
    .map(round2);
}

function getStateSamples(
  samples: ImpulseAdaptiveSample[],
  state: ImpulseAdaptiveState,
): ImpulseAdaptiveSample[] {
  return samples.filter((sample) => sample.transition_state === state);
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

function sanitizeSample(sample: ImpulseAdaptiveSample): ImpulseAdaptiveSample | null {
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


  const sanitized: ImpulseAdaptiveSample = {
  pressure_score: pressure,
  instability_score: instability,
  saturation_score: saturation,
  exhaustion_score: exhaustion,

  growth_score: normalizeScore(sample.growth_score),
  core_score: normalizeScore(sample.core_score),
  decay_score: normalizeScore(sample.decay_score),
};

if (sample.transition_state !== undefined) {
  sanitized.transition_state = sample.transition_state;
}

return sanitized;

}

function sanitizeSamples(
  samples: readonly ImpulseAdaptiveSample[],
): ImpulseAdaptiveSample[] {
  return samples
    .map(sanitizeSample)
    .filter((sample): sample is ImpulseAdaptiveSample => sample !== null);
}

/* ============================================================================
 * 4. FALLBACK POLICY
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
 * 5. ADAPTIVE THRESHOLD BUILDER
 * ========================================================================== */

export function buildImpulseAdaptivePolicy(
  inputSamples: readonly ImpulseAdaptiveSample[],
): ImpulseAdaptivePolicy {
  const samples = sanitizeSamples(inputSamples);
  const warnings: string[] = [];

  if (samples.length < MIN_GLOBAL_SAMPLE) {
    warnings.push("impulse_adaptive_thresholds_insufficient_global_sample");
    return buildFallbackPolicy(samples, warnings);
  }

  const compressionSamples = getStateSamples(samples, "COMPRESSION");
  const pressureSamples = getStateSamples(samples, "PRESSURE_BUILDING");
  const releaseSamples = getStateSamples(samples, "RELEASE");
  const exhaustionSamples = getStateSamples(samples, "EXHAUSTION");
  const neutralSamples = getStateSamples(samples, "NEUTRAL");

  if (compressionSamples.length < MIN_STATE_SAMPLE) {
    warnings.push("impulse_adaptive_thresholds_insufficient_compression_sample");
  }

  if (pressureSamples.length < MIN_STATE_SAMPLE) {
    warnings.push("impulse_adaptive_thresholds_insufficient_pressure_building_sample");
  }

  if (releaseSamples.length < MIN_STATE_SAMPLE) {
    warnings.push("impulse_adaptive_thresholds_insufficient_release_sample");
  }

  if (exhaustionSamples.length < MIN_STATE_SAMPLE) {
    warnings.push("impulse_adaptive_thresholds_insufficient_exhaustion_sample");
  }

  const globalPressure = getValues(samples, (s) => s.pressure_score);
  const globalInstability = getValues(samples, (s) => s.instability_score);
  const globalSaturation = getValues(samples, (s) => s.saturation_score);
  const globalExhaustion = getValues(samples, (s) => s.exhaustion_score);

  const compressionPressure = getValues(compressionSamples, (s) => s.pressure_score);
  const compressionInstability = getValues(compressionSamples, (s) => s.instability_score);
  const compressionExhaustion = getValues(compressionSamples, (s) => s.exhaustion_score);
  const compressionCore = getValues(compressionSamples, (s) => s.core_score);

  const pressurePressure = getValues(pressureSamples, (s) => s.pressure_score);
  const pressureSaturation = getValues(pressureSamples, (s) => s.saturation_score);
  const pressureInstability = getValues(pressureSamples, (s) => s.instability_score);
  const pressureGrowth = getValues(pressureSamples, (s) => s.growth_score);

  const releasePressure = getValues(releaseSamples, (s) => s.pressure_score);
  const releaseInstability = getValues(releaseSamples, (s) => s.instability_score);
  const releaseSaturation = getValues(releaseSamples, (s) => s.saturation_score);
  const releaseGrowth = getValues(releaseSamples, (s) => s.growth_score);
  const releaseDecay = getValues(releaseSamples, (s) => s.decay_score);

  const exhaustionExhaustion = getValues(exhaustionSamples, (s) => s.exhaustion_score);
  const exhaustionInstability = getValues(exhaustionSamples, (s) => s.instability_score);
  const exhaustionSaturation = getValues(exhaustionSamples, (s) => s.saturation_score);
  const exhaustionDecay = getValues(exhaustionSamples, (s) => s.decay_score);

  const neutralPressure = getValues(neutralSamples, (s) => s.pressure_score);
  const neutralInstability = getValues(neutralSamples, (s) => s.instability_score);
  const neutralSaturation = getValues(neutralSamples, (s) => s.saturation_score);
  const neutralExhaustion = getValues(neutralSamples, (s) => s.exhaustion_score);

  const thresholds: ImpulseAdaptiveThresholds = {
    compression: {
      pressure_min: round2(
        clamp(
          percentile(
            compressionPressure.length > 0 ? compressionPressure : globalPressure,
            45,
          ),
          30,
          58,
        ),
      ),
      instability_max: round2(
        clamp(
          percentile(
            compressionInstability.length > 0
              ? compressionInstability
              : globalInstability,
            62,
          ),
          42,
          68,
        ),
      ),
      exhaustion_max: round2(
        clamp(
          percentile(
            compressionExhaustion.length > 0
              ? compressionExhaustion
              : globalExhaustion,
            62,
          ),
          38,
          66,
        ),
      ),
      core_min: round2(
        clamp(
          percentile(
            compressionCore.length > 0 ? compressionCore : globalPressure,
            45,
          ),
          35,
          62,
        ),
      ),
    },

    pressure_building: {
      pressure_min: round2(
        clamp(
          percentile(
            pressurePressure.length > 0 ? pressurePressure : globalPressure,
            55,
          ),
          38,
          68,
        ),
      ),
      saturation_min: round2(
        clamp(
          percentile(
            pressureSaturation.length > 0 ? pressureSaturation : globalSaturation,
            52,
          ),
          35,
          65,
        ),
      ),
      instability_min: round2(
        clamp(
          percentile(
            pressureInstability.length > 0
              ? pressureInstability
              : globalInstability,
            42,
          ),
          28,
          62,
        ),
      ),
      growth_min: round2(
        clamp(
          percentile(
            pressureGrowth.length > 0 ? pressureGrowth : globalPressure,
            42,
          ),
          30,
          62,
        ),
      ),
    },

    release: {
      pressure_min: round2(
        clamp(
          percentile(
            releasePressure.length > 0 ? releasePressure : globalPressure,
            58,
          ),
          42,
          72,
        ),
      ),
      instability_min: round2(
        clamp(
          percentile(
            releaseInstability.length > 0 ? releaseInstability : globalInstability,
            55,
          ),
          38,
          70,
        ),
      ),
      saturation_min: round2(
        clamp(
          percentile(
            releaseSaturation.length > 0 ? releaseSaturation : globalSaturation,
            52,
          ),
          36,
          68,
        ),
      ),
      growth_min: round2(
        clamp(
          percentile(
            releaseGrowth.length > 0 ? releaseGrowth : globalPressure,
            48,
          ),
          34,
          66,
        ),
      ),
      decay_max: round2(
        clamp(
          percentile(
            releaseDecay.length > 0 ? releaseDecay : globalExhaustion,
            70,
          ),
          52,
          82,
        ),
      ),
    },

    exhaustion: {
      exhaustion_min: round2(
        clamp(
          percentile(
            exhaustionExhaustion.length > 0
              ? exhaustionExhaustion
              : globalExhaustion,
            58,
          ),
          48,
          78,
        ),
      ),
      instability_min: round2(
        clamp(
          percentile(
            exhaustionInstability.length > 0
              ? exhaustionInstability
              : globalInstability,
            52,
          ),
          35,
          72,
        ),
      ),
      saturation_min: round2(
        clamp(
          percentile(
            exhaustionSaturation.length > 0
              ? exhaustionSaturation
              : globalSaturation,
            52,
          ),
          36,
          72,
        ),
      ),
      decay_min: round2(
        clamp(
          percentile(
            exhaustionDecay.length > 0 ? exhaustionDecay : globalExhaustion,
            50,
          ),
          35,
          72,
        ),
      ),
    },

    neutral: {
      pressure_max: round2(
        clamp(
          percentile(neutralPressure.length > 0 ? neutralPressure : globalPressure, 65),
          25,
          52,
        ),
      ),
      instability_max: round2(
        clamp(
          percentile(
            neutralInstability.length > 0 ? neutralInstability : globalInstability,
            65,
          ),
          25,
          56,
        ),
      ),
      saturation_max: round2(
        clamp(
          percentile(
            neutralSaturation.length > 0 ? neutralSaturation : globalSaturation,
            65,
          ),
          25,
          56,
        ),
      ),
      exhaustion_max: round2(
        clamp(
          percentile(
            neutralExhaustion.length > 0 ? neutralExhaustion : globalExhaustion,
            65,
          ),
          25,
          56,
        ),
      ),
    },
  };

  return {
    source: "adaptive",
    sample_size: samples.length,
    state_sample_size: countStateSamples(samples),
    thresholds,
    warnings,
  };
}

/* ============================================================================
 * 6. POLICY APPLICATION HELPER
 * ========================================================================== */

export function resolveImpulseStateWithAdaptivePolicy(input: {
  pressure_score: number;
  instability_score: number;
  saturation_score: number;
  exhaustion_score: number;

  growth_score: number | null;
  core_score: number | null;
  decay_score: number | null;

  policy: ImpulseAdaptivePolicy;
}): ImpulseAdaptiveState {
  const pressure = normalizeScore(input.pressure_score) ?? 0;
  const instability = normalizeScore(input.instability_score) ?? 0;
  const saturation = normalizeScore(input.saturation_score) ?? 0;
  const exhaustion = normalizeScore(input.exhaustion_score) ?? 0;

  const growth = normalizeScore(input.growth_score) ?? 50;
  const core = normalizeScore(input.core_score) ?? 50;
  const decay = normalizeScore(input.decay_score) ?? 50;

  const thresholds = input.policy.thresholds;

  if (
    exhaustion >= thresholds.exhaustion.exhaustion_min &&
    instability >= thresholds.exhaustion.instability_min &&
    saturation >= thresholds.exhaustion.saturation_min &&
    decay >= thresholds.exhaustion.decay_min
  ) {
    return "EXHAUSTION";
  }

  if (
    pressure >= thresholds.release.pressure_min &&
    instability >= thresholds.release.instability_min &&
    saturation >= thresholds.release.saturation_min &&
    growth >= thresholds.release.growth_min &&
    decay <= thresholds.release.decay_max
  ) {
    return "RELEASE";
  }

  if (
    pressure >= thresholds.pressure_building.pressure_min &&
    saturation >= thresholds.pressure_building.saturation_min &&
    instability >= thresholds.pressure_building.instability_min &&
    growth >= thresholds.pressure_building.growth_min
  ) {
    return "PRESSURE_BUILDING";
  }

  if (
    pressure >= thresholds.compression.pressure_min &&
    instability <= thresholds.compression.instability_max &&
    exhaustion <= thresholds.compression.exhaustion_max &&
    core >= thresholds.compression.core_min
  ) {
    return "COMPRESSION";
  }

  if (
    pressure <= thresholds.neutral.pressure_max &&
    instability <= thresholds.neutral.instability_max &&
    saturation <= thresholds.neutral.saturation_max &&
    exhaustion <= thresholds.neutral.exhaustion_max
  ) {
    return "NEUTRAL";
  }

  return "NEUTRAL";
}
