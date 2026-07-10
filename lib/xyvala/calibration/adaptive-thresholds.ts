/* ============================================================================
 * FILE: lib/xyvala/calibration/adaptive-thresholds.ts
 * ============================================================================
 * TITLE
 * - Xyvala adaptive thresholds
 *
 * ROLE
 * - derive bounded private calibration thresholds from real score samples
 * - preserve analytical hierarchy and defensive governance
 * - provide deterministic fallback policy when samples are insufficient
 *
 * DIRECTIVES
 * - calibration layer only
 * - deterministic only
 * - no mutation
 * - no persistence
 * - no UI logic
 * - no API logic
 * - no snapshot mutation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no public projection
 * - no investment advice
 *
 * INVARIANTS
 * - stability dominates opportunity
 * - rupture and crash constrain transitions
 * - impulse is contextual, never dominant over stability / rupture
 * - neutralization blocks aggressive transition
 * - thresholds remain bounded
 * - insufficient samples fallback to static defaults
 * ========================================================================== */

export type AdaptiveRegime = "STABLE" | "TRANSITION" | "VOLATILE";

export type AdaptivePolicySource = "adaptive" | "fallback";

export type AdaptiveSample = {
  regime: AdaptiveRegime;

  stability_score: number;
  opportunity_score: number;
  convergence_score: number;
  confidence_score: number;
  decision_support_probability: number;

  rupture_score: number;
  rupture_probability?: number;
  rupture_evolution_score?: number;

  crash_score?: number;

  impulse_pressure_score?: number;
  impulse_instability_score?: number;
  impulse_saturation_score?: number;
  impulse_exhaustion_score?: number;

  neutralized?: boolean;
};

export type AdaptivePolicy = {
  source: AdaptivePolicySource;
  sample_size: number;
  per_regime_sample_size: Record<AdaptiveRegime, number>;
  thresholds: {
    block: {
      stability_max: number;
      rupture_min: number;
      rupture_probability_min: number;
      rupture_evolution_min: number;
      crash_min: number;
      confidence_max: number;
      decision_support_max: number;
    };

    allow_stable: {
      stability_min: number;
      opportunity_min: number;
      convergence_min: number;
      rupture_max: number;
      rupture_probability_max: number;
      crash_max: number;
      confidence_min: number;
      decision_support_min: number;
    };

    allow_transition: {
      stability_min: number;
      opportunity_min: number;
      convergence_min: number;
      rupture_max: number;
      rupture_probability_max: number;
      impulse_pressure_min: number;
      impulse_instability_max: number;
      confidence_min: number;
      decision_support_min: number;
    };

    soft_transition: {
      stability_min: number;
      opportunity_min: number;
      convergence_min: number;
      rupture_max: number;
      rupture_probability_max: number;
      impulse_pressure_min: number;
      decision_support_min: number;
    };

    neutralized_transition: {
      stability_min: number;
      rupture_max: number;
      crash_max: number;
      confidence_min: number;
    };
  };
  warnings: string[];
};

const MIN_GLOBAL_SAMPLE = 40;
const MIN_REGIME_SAMPLE = 12;

const FALLBACK_POLICY: AdaptivePolicy["thresholds"] = {
  block: {
    stability_max: 35,
    rupture_min: 78,
    rupture_probability_min: 72,
    rupture_evolution_min: 68,
    crash_min: 65,
    confidence_max: 25,
    decision_support_max: 22,
  },

  allow_stable: {
    stability_min: 72,
    opportunity_min: 62,
    convergence_min: 60,
    rupture_max: 42,
    rupture_probability_max: 44,
    crash_max: 35,
    confidence_min: 55,
    decision_support_min: 66,
  },

  allow_transition: {
    stability_min: 74,
    opportunity_min: 68,
    convergence_min: 65,
    rupture_max: 40,
    rupture_probability_max: 42,
    impulse_pressure_min: 50,
    impulse_instability_max: 62,
    confidence_min: 55,
    decision_support_min: 72,
  },

  soft_transition: {
    stability_min: 70,
    opportunity_min: 65,
    convergence_min: 62,
    rupture_max: 48,
    rupture_probability_max: 50,
    impulse_pressure_min: 42,
    decision_support_min: 65,
  },

  neutralized_transition: {
    stability_min: 78,
    rupture_max: 35,
    crash_max: 28,
    confidence_min: 65,
  },
};

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

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sorted[lower] ?? 0;

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
  const source = input.values.length > 0 ? input.values : input.fallback;

  return round2(
    clamp(percentile(source, input.percentile), input.min, input.max),
  );
}

function sanitizeSample(sample: AdaptiveSample): AdaptiveSample | null {
  const stability = normalizeScore(sample.stability_score);
  const opportunity = normalizeScore(sample.opportunity_score);
  const convergence = normalizeScore(sample.convergence_score);
  const confidence = normalizeScore(sample.confidence_score);
  const support = normalizeScore(sample.decision_support_probability);
  const rupture = normalizeScore(sample.rupture_score);

  if (
    stability === null ||
    opportunity === null ||
    convergence === null ||
    confidence === null ||
    support === null ||
    rupture === null
  ) {
    return null;
  }

  const ruptureProbability = normalizeScore(sample.rupture_probability);
  const ruptureEvolution = normalizeScore(sample.rupture_evolution_score);
  const crash = normalizeScore(sample.crash_score);
  const impulsePressure = normalizeScore(sample.impulse_pressure_score);
  const impulseInstability = normalizeScore(sample.impulse_instability_score);
  const impulseSaturation = normalizeScore(sample.impulse_saturation_score);
  const impulseExhaustion = normalizeScore(sample.impulse_exhaustion_score);

  return {
    regime: sample.regime,

    stability_score: stability,
    opportunity_score: opportunity,
    convergence_score: convergence,
    confidence_score: confidence,
    decision_support_probability: support,

    rupture_score: rupture,

    ...(ruptureProbability !== null
      ? { rupture_probability: ruptureProbability }
      : {}),
    ...(ruptureEvolution !== null
      ? { rupture_evolution_score: ruptureEvolution }
      : {}),
    ...(crash !== null ? { crash_score: crash } : {}),

    ...(impulsePressure !== null
      ? { impulse_pressure_score: impulsePressure }
      : {}),
    ...(impulseInstability !== null
      ? { impulse_instability_score: impulseInstability }
      : {}),
    ...(impulseSaturation !== null
      ? { impulse_saturation_score: impulseSaturation }
      : {}),
    ...(impulseExhaustion !== null
      ? { impulse_exhaustion_score: impulseExhaustion }
      : {}),

    neutralized: normalizeBoolean(sample.neutralized),
  };
}

function sanitizeSamples(samples: readonly AdaptiveSample[]): AdaptiveSample[] {
  return samples
    .map(sanitizeSample)
    .filter((sample): sample is AdaptiveSample => sample !== null);
}

function getValues(
  samples: AdaptiveSample[],
  selector: (sample: AdaptiveSample) => number | null | undefined,
): number[] {
  return samples
    .map(selector)
    .filter((value): value is number => isFiniteNumber(value))
    .map(round2);
}

function getRegimeSamples(
  samples: AdaptiveSample[],
  regime: AdaptiveRegime,
): AdaptiveSample[] {
  return samples.filter((sample) => sample.regime === regime);
}

function countRegimeSamples(
  samples: AdaptiveSample[],
): Record<AdaptiveRegime, number> {
  return {
    STABLE: getRegimeSamples(samples, "STABLE").length,
    TRANSITION: getRegimeSamples(samples, "TRANSITION").length,
    VOLATILE: getRegimeSamples(samples, "VOLATILE").length,
  };
}

function buildFallbackPolicy(
  samples: AdaptiveSample[],
  warnings: string[],
): AdaptivePolicy {
  return {
    source: "fallback",
    sample_size: samples.length,
    per_regime_sample_size: countRegimeSamples(samples),
    thresholds: FALLBACK_POLICY,
    warnings,
  };
}

export function buildAdaptivePolicy(
  inputSamples: readonly AdaptiveSample[],
): AdaptivePolicy {
  const samples = sanitizeSamples(inputSamples);
  const warnings: string[] = [];

  if (samples.length < MIN_GLOBAL_SAMPLE) {
    warnings.push("adaptive_thresholds_insufficient_global_sample");
    return buildFallbackPolicy(samples, warnings);
  }

  const stableSamples = getRegimeSamples(samples, "STABLE");
  const transitionSamples = getRegimeSamples(samples, "TRANSITION");
  const volatileSamples = getRegimeSamples(samples, "VOLATILE");
  const neutralizedSamples = samples.filter((sample) => sample.neutralized);

  if (stableSamples.length < MIN_REGIME_SAMPLE) {
    warnings.push("adaptive_thresholds_insufficient_stable_sample");
  }

  if (transitionSamples.length < MIN_REGIME_SAMPLE) {
    warnings.push("adaptive_thresholds_insufficient_transition_sample");
  }

  if (volatileSamples.length < MIN_REGIME_SAMPLE) {
    warnings.push("adaptive_thresholds_insufficient_volatile_sample");
  }

  const globalStability = getValues(samples, (s) => s.stability_score);
  const globalRupture = getValues(samples, (s) => s.rupture_score);
  const globalRuptureProbability = getValues(
    samples,
    (s) => s.rupture_probability ?? s.rupture_score,
  );
  const globalRuptureEvolution = getValues(
    samples,
    (s) => s.rupture_evolution_score ?? s.rupture_score,
  );
  const globalCrash = getValues(samples, (s) => s.crash_score ?? s.rupture_score);
  const globalConfidence = getValues(samples, (s) => s.confidence_score);
  const globalSupport = getValues(
    samples,
    (s) => s.decision_support_probability,
  );
  const globalImpulsePressure = getValues(
    samples,
    (s) => s.impulse_pressure_score ?? s.opportunity_score,
  );
  const globalImpulseInstability = getValues(
    samples,
    (s) => s.impulse_instability_score ?? s.rupture_score,
  );

  const thresholds: AdaptivePolicy["thresholds"] = {
    block: {
      stability_max: boundedPercentile({
        values: globalStability,
        fallback: globalStability,
        percentile: 12,
        min: 25,
        max: 42,
      }),
      rupture_min: boundedPercentile({
        values: globalRupture,
        fallback: globalRupture,
        percentile: 88,
        min: 65,
        max: 90,
      }),
      rupture_probability_min: boundedPercentile({
        values: globalRuptureProbability,
        fallback: globalRupture,
        percentile: 86,
        min: 62,
        max: 88,
      }),
      rupture_evolution_min: boundedPercentile({
        values: globalRuptureEvolution,
        fallback: globalRupture,
        percentile: 84,
        min: 58,
        max: 86,
      }),
      crash_min: boundedPercentile({
        values: globalCrash,
        fallback: globalRupture,
        percentile: 84,
        min: 55,
        max: 84,
      }),
      confidence_max: boundedPercentile({
        values: globalConfidence,
        fallback: globalConfidence,
        percentile: 10,
        min: 15,
        max: 35,
      }),
      decision_support_max: boundedPercentile({
        values: globalSupport,
        fallback: globalSupport,
        percentile: 12,
        min: 15,
        max: 35,
      }),
    },

    allow_stable: {
      stability_min: boundedPercentile({
        values: getValues(stableSamples, (s) => s.stability_score),
        fallback: globalStability,
        percentile: 72,
        min: 68,
        max: 86,
      }),
      opportunity_min: boundedPercentile({
        values: getValues(stableSamples, (s) => s.opportunity_score),
        fallback: getValues(samples, (s) => s.opportunity_score),
        percentile: 72,
        min: 58,
        max: 82,
      }),
      convergence_min: boundedPercentile({
        values: getValues(stableSamples, (s) => s.convergence_score),
        fallback: getValues(samples, (s) => s.convergence_score),
        percentile: 68,
        min: 55,
        max: 80,
      }),
      rupture_max: boundedPercentile({
        values: getValues(stableSamples, (s) => s.rupture_score),
        fallback: globalRupture,
        percentile: 35,
        min: 18,
        max: 50,
      }),
      rupture_probability_max: boundedPercentile({
        values: getValues(
          stableSamples,
          (s) => s.rupture_probability ?? s.rupture_score,
        ),
        fallback: globalRuptureProbability,
        percentile: 38,
        min: 20,
        max: 52,
      }),
      crash_max: boundedPercentile({
        values: getValues(stableSamples, (s) => s.crash_score ?? s.rupture_score),
        fallback: globalCrash,
        percentile: 35,
        min: 15,
        max: 48,
      }),
      confidence_min: boundedPercentile({
        values: getValues(stableSamples, (s) => s.confidence_score),
        fallback: globalConfidence,
        percentile: 62,
        min: 42,
        max: 76,
      }),
      decision_support_min: boundedPercentile({
        values: getValues(
          stableSamples,
          (s) => s.decision_support_probability,
        ),
        fallback: globalSupport,
        percentile: 72,
        min: 60,
        max: 82,
      }),
    },

    allow_transition: {
      stability_min: boundedPercentile({
        values: getValues(transitionSamples, (s) => s.stability_score),
        fallback: globalStability,
        percentile: 82,
        min: 68,
        max: 84,
      }),
      opportunity_min: boundedPercentile({
        values: getValues(transitionSamples, (s) => s.opportunity_score),
        fallback: getValues(samples, (s) => s.opportunity_score),
        percentile: 84,
        min: 60,
        max: 85,
      }),
      convergence_min: boundedPercentile({
        values: getValues(transitionSamples, (s) => s.convergence_score),
        fallback: getValues(samples, (s) => s.convergence_score),
        percentile: 80,
        min: 58,
        max: 82,
      }),
      rupture_max: boundedPercentile({
        values: getValues(transitionSamples, (s) => s.rupture_score),
        fallback: globalRupture,
        percentile: 28,
        min: 20,
        max: 48,
      }),
      rupture_probability_max: boundedPercentile({
        values: getValues(
          transitionSamples,
          (s) => s.rupture_probability ?? s.rupture_score,
        ),
        fallback: globalRuptureProbability,
        percentile: 32,
        min: 22,
        max: 52,
      }),
      impulse_pressure_min: boundedPercentile({
        values: getValues(
          transitionSamples,
          (s) => s.impulse_pressure_score ?? s.opportunity_score,
        ),
        fallback: globalImpulsePressure,
        percentile: 58,
        min: 42,
        max: 72,
      }),
      impulse_instability_max: boundedPercentile({
        values: getValues(
          transitionSamples,
          (s) => s.impulse_instability_score ?? s.rupture_score,
        ),
        fallback: globalImpulseInstability,
        percentile: 62,
        min: 42,
        max: 72,
      }),
      confidence_min: boundedPercentile({
        values: getValues(transitionSamples, (s) => s.confidence_score),
        fallback: globalConfidence,
        percentile: 70,
        min: 42,
        max: 75,
      }),
      decision_support_min: boundedPercentile({
        values: getValues(
          transitionSamples,
          (s) => s.decision_support_probability,
        ),
        fallback: globalSupport,
        percentile: 84,
        min: 62,
        max: 86,
      }),
    },

    soft_transition: {
      stability_min: boundedPercentile({
        values: getValues(transitionSamples, (s) => s.stability_score),
        fallback: globalStability,
        percentile: 68,
        min: 62,
        max: 78,
      }),
      opportunity_min: boundedPercentile({
        values: getValues(transitionSamples, (s) => s.opportunity_score),
        fallback: getValues(samples, (s) => s.opportunity_score),
        percentile: 70,
        min: 55,
        max: 76,
      }),
      convergence_min: boundedPercentile({
        values: getValues(transitionSamples, (s) => s.convergence_score),
        fallback: getValues(samples, (s) => s.convergence_score),
        percentile: 66,
        min: 54,
        max: 76,
      }),
      rupture_max: boundedPercentile({
        values: getValues(transitionSamples, (s) => s.rupture_score),
        fallback: globalRupture,
        percentile: 45,
        min: 24,
        max: 58,
      }),
      rupture_probability_max: boundedPercentile({
        values: getValues(
          transitionSamples,
          (s) => s.rupture_probability ?? s.rupture_score,
        ),
        fallback: globalRuptureProbability,
        percentile: 48,
        min: 26,
        max: 60,
      }),
      impulse_pressure_min: boundedPercentile({
        values: getValues(
          transitionSamples,
          (s) => s.impulse_pressure_score ?? s.opportunity_score,
        ),
        fallback: globalImpulsePressure,
        percentile: 45,
        min: 35,
        max: 66,
      }),
      decision_support_min: boundedPercentile({
        values: getValues(
          transitionSamples,
          (s) => s.decision_support_probability,
        ),
        fallback: globalSupport,
        percentile: 70,
        min: 58,
        max: 78,
      }),
    },

    neutralized_transition: {
      stability_min: boundedPercentile({
        values: getValues(neutralizedSamples, (s) => s.stability_score),
        fallback: globalStability,
        percentile: 86,
        min: 72,
        max: 90,
      }),
      rupture_max: boundedPercentile({
        values: getValues(neutralizedSamples, (s) => s.rupture_score),
        fallback: globalRupture,
        percentile: 24,
        min: 15,
        max: 42,
      }),
      crash_max: boundedPercentile({
        values: getValues(neutralizedSamples, (s) => s.crash_score ?? s.rupture_score),
        fallback: globalCrash,
        percentile: 24,
        min: 10,
        max: 38,
      }),
      confidence_min: boundedPercentile({
        values: getValues(neutralizedSamples, (s) => s.confidence_score),
        fallback: globalConfidence,
        percentile: 78,
        min: 58,
        max: 82,
      }),
    },
  };

  return {
    source: "adaptive",
    sample_size: samples.length,
    per_regime_sample_size: countRegimeSamples(samples),
    thresholds,
    warnings,
  };
}

