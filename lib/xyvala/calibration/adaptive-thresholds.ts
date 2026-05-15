/* ============================================================================
 * FILE: lib/xyvala/calibration/adaptive-thresholds.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - derive adaptive market decision thresholds from real live score distributions
 * - preserve Xyvala hierarchy: stability > regime > opportunity > confidence
 * - compute regime-specific thresholds using bounded percentile logic
 * - avoid static threshold drift by applying floor / ceiling guards
 *
 * PARENTS
 * - lib/xyvala/engine/mci-market.ts
 * - lib/xyvala/engine/rfs-market.ts
 *
 * DIRECTIVES
 * - deterministic only
 * - no provider parsing here
 * - no UI logic here
 * - no snapshot mutation here
 * - no automatic persistence here
 * - adaptive thresholds must remain bounded
 * - insufficient samples must fallback to static defaults
 *
 * INPUTS
 * - market score samples
 *
 * OUTPUTS
 * - adaptive policy thresholds
 *
 * INVARIANTS
 * - same input => same output
 * - thresholds remain bounded
 * - regime-specific calibration remains explicit
 * ========================================================================== */

export type AdaptiveRegime = "STABLE" | "TRANSITION" | "VOLATILE";

export type AdaptiveSample = {
  regime: AdaptiveRegime;
  stability_score: number;
  opportunity_score: number;
  convergence_score: number;
  confidence_score: number;
  decision_support_probability: number;
  rupture_score: number;
};

export type AdaptivePolicy = {
  source: "adaptive" | "fallback";
  sample_size: number;
  per_regime_sample_size: Record<AdaptiveRegime, number>;
  thresholds: {
    block: {
      stability_max: number;
      rupture_min: number;
      confidence_max: number;
      decision_support_max: number;
    };
    allow_stable: {
      stability_min: number;
      opportunity_min: number;
      convergence_min: number;
      rupture_max: number;
      decision_support_min: number;
    };
    allow_transition: {
      stability_min: number;
      opportunity_min: number;
      convergence_min: number;
      rupture_max: number;
      confidence_min: number;
      decision_support_min: number;
    };
    soft_transition: {
      stability_min: number;
      opportunity_min: number;
      convergence_min: number;
      rupture_max: number;
      decision_support_min: number;
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
    confidence_max: 25,
    decision_support_max: 22,
  },
  allow_stable: {
    stability_min: 72,
    opportunity_min: 62,
    convergence_min: 60,
    rupture_max: 42,
    decision_support_min: 66,
  },
  allow_transition: {
    stability_min: 74,
    opportunity_min: 68,
    convergence_min: 65,
    rupture_max: 40,
    confidence_min: 55,
    decision_support_min: 72,
  },
  soft_transition: {
    stability_min: 70,
    opportunity_min: 65,
    convergence_min: 62,
    rupture_max: 48,
    decision_support_min: 65,
  },
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
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
  samples: AdaptiveSample[],
  selector: (sample: AdaptiveSample) => number,
): number[] {
  return samples
    .map(selector)
    .filter((value) => Number.isFinite(value))
    .map((value) => round2(value));
}

function getRegimeSamples(
  samples: AdaptiveSample[],
  regime: AdaptiveRegime,
): AdaptiveSample[] {
  return samples.filter((sample) => sample.regime === regime);
}

function buildFallbackPolicy(
  samples: AdaptiveSample[],
  warnings: string[],
): AdaptivePolicy {
  return {
    source: "fallback",
    sample_size: samples.length,
    per_regime_sample_size: {
      STABLE: getRegimeSamples(samples, "STABLE").length,
      TRANSITION: getRegimeSamples(samples, "TRANSITION").length,
      VOLATILE: getRegimeSamples(samples, "VOLATILE").length,
    },
    thresholds: FALLBACK_POLICY,
    warnings,
  };
}

export function buildAdaptivePolicy(
  samples: AdaptiveSample[],
): AdaptivePolicy {
  const warnings: string[] = [];

  if (samples.length < MIN_GLOBAL_SAMPLE) {
    warnings.push("adaptive_thresholds_insufficient_global_sample");
    return buildFallbackPolicy(samples, warnings);
  }

  const stableSamples = getRegimeSamples(samples, "STABLE");
  const transitionSamples = getRegimeSamples(samples, "TRANSITION");
  const volatileSamples = getRegimeSamples(samples, "VOLATILE");

  if (stableSamples.length < MIN_REGIME_SAMPLE) {
    warnings.push("adaptive_thresholds_insufficient_stable_sample");
  }

  if (transitionSamples.length < MIN_REGIME_SAMPLE) {
    warnings.push("adaptive_thresholds_insufficient_transition_sample");
  }

  if (volatileSamples.length < MIN_REGIME_SAMPLE) {
    warnings.push("adaptive_thresholds_insufficient_volatile_sample");
  }

  const stableStability = getValues(stableSamples, (s) => s.stability_score);
  const stableOpportunity = getValues(stableSamples, (s) => s.opportunity_score);
  const stableConvergence = getValues(stableSamples, (s) => s.convergence_score);
  const stableDecisionSupport = getValues(
    stableSamples,
    (s) => s.decision_support_probability,
  );
  const stableRupture = getValues(stableSamples, (s) => s.rupture_score);

  const transitionStability = getValues(
    transitionSamples,
    (s) => s.stability_score,
  );
  const transitionOpportunity = getValues(
    transitionSamples,
    (s) => s.opportunity_score,
  );
  const transitionConvergence = getValues(
    transitionSamples,
    (s) => s.convergence_score,
  );
  const transitionConfidence = getValues(
    transitionSamples,
    (s) => s.confidence_score,
  );
  const transitionDecisionSupport = getValues(
    transitionSamples,
    (s) => s.decision_support_probability,
  );
  const transitionRupture = getValues(transitionSamples, (s) => s.rupture_score);

  const globalStability = getValues(samples, (s) => s.stability_score);
  const globalRupture = getValues(samples, (s) => s.rupture_score);
  const globalConfidence = getValues(samples, (s) => s.confidence_score);
  const globalDecisionSupport = getValues(
    samples,
    (s) => s.decision_support_probability,
  );

  const thresholds: AdaptivePolicy["thresholds"] = {
    block: {
      stability_max: round2(
        clamp(percentile(globalStability, 12), 25, 42),
      ),
      rupture_min: round2(
        clamp(percentile(globalRupture, 88), 65, 90),
      ),
      confidence_max: round2(
        clamp(percentile(globalConfidence, 10), 15, 35),
      ),
      decision_support_max: round2(
        clamp(percentile(globalDecisionSupport, 12), 15, 35),
      ),
    },

    allow_stable: {
      stability_min: round2(
        clamp(percentile(stableStability, 72), 68, 86),
      ),
      opportunity_min: round2(
        clamp(percentile(stableOpportunity, 72), 58, 82),
      ),
      convergence_min: round2(
        clamp(percentile(stableConvergence, 68), 55, 80),
      ),
      rupture_max: round2(
        clamp(percentile(stableRupture, 35), 18, 50),
      ),
      decision_support_min: round2(
        clamp(percentile(stableDecisionSupport, 72), 60, 82),
      ),
    },

    allow_transition: {
      stability_min: round2(
        clamp(percentile(transitionStability, 82), 68, 84),
      ),
      opportunity_min: round2(
        clamp(percentile(transitionOpportunity, 84), 60, 85),
      ),
      convergence_min: round2(
        clamp(percentile(transitionConvergence, 80), 58, 82),
      ),
      rupture_max: round2(
        clamp(percentile(transitionRupture, 28), 20, 48),
      ),
      confidence_min: round2(
        clamp(percentile(transitionConfidence, 70), 42, 75),
      ),
      decision_support_min: round2(
        clamp(percentile(transitionDecisionSupport, 84), 62, 86),
      ),
    },

    soft_transition: {
      stability_min: round2(
        clamp(percentile(transitionStability, 68), 62, 78),
      ),
      opportunity_min: round2(
        clamp(percentile(transitionOpportunity, 70), 55, 76),
      ),
      convergence_min: round2(
        clamp(percentile(transitionConvergence, 66), 54, 76),
      ),
      rupture_max: round2(
        clamp(percentile(transitionRupture, 45), 24, 58),
      ),
      decision_support_min: round2(
        clamp(percentile(transitionDecisionSupport, 70), 58, 78),
      ),
    },
  };

  return {
    source: "adaptive",
    sample_size: samples.length,
    per_regime_sample_size: {
      STABLE: stableSamples.length,
      TRANSITION: transitionSamples.length,
      VOLATILE: volatileSamples.length,
    },
    thresholds,
    warnings,
  };
}
