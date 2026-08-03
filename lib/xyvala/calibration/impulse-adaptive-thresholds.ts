/* ============================================================================
 * FILE: lib/xyvala/calibration/impulse-adaptive-thresholds.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical Impulse Layer adaptive threshold calibration
 *
 * ROLE
 * - consume real previously computed Impulse Layer samples
 * - validate and normalize calibration samples without repairing them
 * - classify unlabeled bootstrap samples through the canonical Impulse resolver
 * - derive bounded adaptive transition thresholds from observed distributions
 * - preserve pressure as the primary Impulse transition axis
 * - use Triple Layer readings as contextual calibration evidence only
 * - produce an immutable policy consumed by the canonical Impulse resolver
 *
 * CLASSIFICATION
 * - PRIVATE CALIBRATION ENGINE
 * - COMPUTE
 * - PURE
 * - DETERMINISTIC
 * - NON-MUTATING
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
 * - governed Impulse calibration orchestrator
 * - governed calibration sample store
 * - canonical Impulse Layer resolver contract
 *
 * CONSUMERS
 * - private calibration orchestrator
 * - Impulse Layer policy injection adapter
 * - private calibration observability
 * - calibration distribution store
 *
 * DIRECTIVES
 * - calibration logic only
 * - no RFS recomputation
 * - no Triple Layer recomputation
 * - no Impulse score recomputation
 * - no final Impulse state propagation
 * - no MCI recomputation
 * - no decision computation
 * - no snapshot construction
 * - no transformer logic
 * - no ranking logic
 * - no API logic
 * - no UI logic
 * - no public projection
 * - no persistence
 * - no runtime mutation
 * - no local clock access
 * - no generated timestamp
 * - no sample repair
 * - no missing-value neutralization
 * - no invalid-value clamping into validity
 * - no synthetic sample generation
 * - no buy / sell / hold semantics
 * - same canonical samples and resolver version => same policy
 *
 * INPUTS
 * - real computed Impulse score samples
 * - optional canonical Triple Layer context readings
 * - optional previously resolved Impulse transition labels
 *
 * OUTPUTS
 * - canonical ImpulseResolvedPolicy
 *
 * OWNERSHIP
 * - Calibration owns threshold policy
 * - Impulse Layer owns Impulse scores
 * - Impulse Layer owns the final propagated transition state
 * - Triple Layer owns growth, core pattern and decay truths
 *
 * INVARIANTS
 * - calibration modifies thresholds only
 * - calibration never modifies source samples
 * - calibration never changes Impulse score formulas
 * - calibration never becomes an alternative Impulse resolver
 * - the canonical resolver remains impulse-state-core.ts
 * - provided transition labels are never reconstructed
 * - absent transition labels may be classified for bootstrap calibration only
 * - inferred bootstrap labels are explicitly reported
 * - invalid required score samples are rejected
 * - optional Triple Layer values remain null when unavailable
 * - pressure remains the primary transition axis
 * - acceleration validates transition dynamics
 * - alignment validates coherent pressure
 * - instability contextualizes release and exhaustion
 * - saturation contextualizes pressure building and exhaustion
 * - Triple Layer remains contextual and never modifies Impulse scores
 * - thresholds remain finite and inside their governed bounds
 * - insufficient samples fall back to canonical static thresholds
 * - bootstrap and adaptive policies remain explicitly distinguishable
 * - state distribution dominance produces an explicit warning
 *
 * FIRST DIVERGENCE
 * - invalid source sample
 *   => calibration sample boundary
 *
 * - valid samples but invalid threshold policy
 *   => adaptive threshold producer
 *
 * - valid policy altered by the Impulse resolver
 *   => Calibration -> Impulse Layer policy boundary
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/engine/impulse-state-core.ts
 *
 * SENSITIVE ZONES
 * - required score validation
 * - optional Triple Layer nullability
 * - bootstrap state classification
 * - state sample distribution
 * - percentile selection
 * - threshold bounding
 * - fallback selection
 * - deterministic warning ordering
 * ========================================================================== */

import {
  DEFAULT_IMPULSE_POLICY,
  resolveImpulseTransitionState,
  type CalibratableImpulseTransitionState,
  type ImpulseResolvedPolicy,
  type ImpulseResolvedThresholds,
  type ImpulseScoreSet,
  type ImpulseStateSampleSize,
  type NormalizedImpulseTripleLayerContext,
} from "@/lib/xyvala/engine/impulse-state-core";

/* ============================================================================
 * 1. PUBLIC INPUT CONTRACT
 * ----------------------------------------------------------------------------
 * This module owns only the calibration sample transport.
 *
 * It does not own:
 * - ImpulseResolvedPolicy
 * - ImpulseResolvedThresholds
 * - CalibratableImpulseTransitionState
 * - ImpulseScoreSet
 *
 * Those identities remain owned by impulse-state-core.ts.
 * ========================================================================== */

export type ImpulseAdaptiveSample = Readonly<{
  compression_score: number;
  pressure_score: number;
  acceleration_score: number;
  alignment_score: number;
  instability_score: number;
  saturation_score: number;
  exhaustion_score: number;

  growth_score: number | null;
  core_pattern_score: number | null;
  decay_score: number | null;

  transition_state?:
    CalibratableImpulseTransitionState;
}>;

/* ============================================================================
 * 2. INTERNAL CONTRACTS
 * ========================================================================== */

type SanitizedImpulseAdaptiveSample = Readonly<{
  scores:
    Readonly<ImpulseScoreSet>;

  triple_layer:
    Readonly<NormalizedImpulseTripleLayerContext>;

  transition_state:
    CalibratableImpulseTransitionState | null;
}>;

type ClassifiedImpulseAdaptiveSample = Readonly<{
  sample:
    SanitizedImpulseAdaptiveSample;

  state:
    CalibratableImpulseTransitionState;

  state_source:
    "provided" | "inferred";
}>;

type CalibrationSource =
  | "adaptive"
  | "bootstrap"
  | "fallback";

type SampleSanitationResult = Readonly<{
  samples:
    readonly SanitizedImpulseAdaptiveSample[];

  rejected_sample_count:
    number;
}>;

type ThresholdBound = Readonly<{
  fallback: number;
  percentile: number;
  minimum: number;
  maximum: number;
}>;

/* ============================================================================
 * 3. GOVERNED CONSTANTS
 * ========================================================================== */

const IMPULSE_ADAPTIVE_POLICY_VERSION =
  "impulse-adaptive-v2" as const;

const MINIMUM_BOOTSTRAP_SAMPLE_COUNT =
  30;

const MINIMUM_GLOBAL_SAMPLE_COUNT =
  80;

const MINIMUM_STATE_SAMPLE_COUNT =
  8;

const STATE_DOMINANCE_WARNING_RATIO =
  0.7;

const SCORE_MINIMUM =
  0;

const SCORE_MAXIMUM =
  100;

const CALIBRATABLE_IMPULSE_STATES:
  readonly CalibratableImpulseTransitionState[] =
  Object.freeze([
    "COMPRESSION",
    "PRESSURE_BUILDING",
    "RELEASE",
    "EXHAUSTION",
    "NEUTRAL",
  ]);

/* ============================================================================
 * 4. PURE NUMERIC HELPERS
 * ----------------------------------------------------------------------------
 * These helpers do not convert invalid values into valid observations.
 *
 * Required invalid scores cause sample rejection.
 * Optional invalid contextual values remain unavailable.
 * ========================================================================== */

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function isScoreValue(
  value: unknown,
): value is number {
  return (
    isFiniteNumber(value) &&
    value >= SCORE_MINIMUM &&
    value <= SCORE_MAXIMUM
  );
}

function roundToTwoDecimals(
  value: number,
): number {
  return (
    Math.round(value * 100) /
    100
  );
}

function clampThreshold(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.max(
    minimum,
    Math.min(
      maximum,
      value,
    ),
  );
}

function readRequiredScore(
  value: unknown,
): number | null {
  if (!isScoreValue(value)) {
    return null;
  }

  return roundToTwoDecimals(
    value,
  );
}

function readOptionalScore(
  value: unknown,
): number | null {
  if (value === null) {
    return null;
  }

  return readRequiredScore(
    value,
  );
}

function uniqueWarnings(
  warnings: readonly string[],
): string[] {
  const seen =
    new Set<string>();

  const result:
    string[] = [];

  for (const warning of warnings) {
    if (
      typeof warning !== "string"
    ) {
      continue;
    }

    const normalized =
      warning.trim();

    if (
      normalized.length === 0 ||
      seen.has(normalized)
    ) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function percentile(
  values: readonly number[],
  percentileValue: number,
): number | null {
  if (
    values.length === 0 ||
    !isFiniteNumber(
      percentileValue,
    )
  ) {
    return null;
  }

  const sorted =
    [...values].sort(
      (left, right) =>
        left - right,
    );

  const boundedPercentile =
    clampThreshold(
      percentileValue,
      0,
      100,
    );

  const index =
    (
      boundedPercentile /
      100
    ) *
    (
      sorted.length - 1
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
    return null;
  }

  if (
    lowerIndex ===
    upperIndex
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

function resolveBoundedPercentile(
  values: readonly number[],
  bound: ThresholdBound,
): number {
  const observedValue =
    percentile(
      values,
      bound.percentile,
    );

  return roundToTwoDecimals(
    clampThreshold(
      observedValue ??
        bound.fallback,
      bound.minimum,
      bound.maximum,
    ),
  );
}

/* ============================================================================
 * 5. SAMPLE SANITATION
 * ----------------------------------------------------------------------------
 * Required Impulse scores:
 * - must all be finite
 * - must already belong to [0, 100]
 * - are never clamped into validity
 *
 * Optional Triple Layer scores:
 * - remain null when unavailable or invalid
 * - never cause source Impulse scores to be changed
 * ========================================================================== */

function sanitizeSample(
  sample: ImpulseAdaptiveSample,
): SanitizedImpulseAdaptiveSample | null {
  if (
    sample === null ||
    typeof sample !== "object"
  ) {
    return null;
  }

  const compressionScore =
    readRequiredScore(
      sample.compression_score,
    );

  const pressureScore =
    readRequiredScore(
      sample.pressure_score,
    );

  const accelerationScore =
    readRequiredScore(
      sample.acceleration_score,
    );

  const alignmentScore =
    readRequiredScore(
      sample.alignment_score,
    );

  const instabilityScore =
    readRequiredScore(
      sample.instability_score,
    );

  const saturationScore =
    readRequiredScore(
      sample.saturation_score,
    );

  const exhaustionScore =
    readRequiredScore(
      sample.exhaustion_score,
    );

  if (
    compressionScore === null ||
    pressureScore === null ||
    accelerationScore === null ||
    alignmentScore === null ||
    instabilityScore === null ||
    saturationScore === null ||
    exhaustionScore === null
  ) {
    return null;
  }

  const growthScore =
    readOptionalScore(
      sample.growth_score,
    );

  const corePatternScore =
    readOptionalScore(
      sample.core_pattern_score,
    );

  const decayScore =
    readOptionalScore(
      sample.decay_score,
    );

  const availableTripleLayerScoreCount =
    [
      growthScore,
      corePatternScore,
      decayScore,
    ].filter(
      (
        value,
      ): value is number =>
        value !== null,
    ).length;

  const tripleLayerAvailable =
    availableTripleLayerScoreCount ===
    3;

  const tripleLayerPartial =
    availableTripleLayerScoreCount > 0 &&
    availableTripleLayerScoreCount < 3;

  return {
    scores: {
      compression_score:
        compressionScore,

      pressure_score:
        pressureScore,

      acceleration_score:
        accelerationScore,

      alignment_score:
        alignmentScore,

      instability_score:
        instabilityScore,

      saturation_score:
        saturationScore,

      exhaustion_score:
        exhaustionScore,
    },

    triple_layer: {
      available:
        tripleLayerAvailable ||
        tripleLayerPartial,

      partial:
        tripleLayerPartial,

      neutralized:
        false,

      triple_layer_state:
        null,

      growth_score:
        growthScore,

      core_pattern_score:
        corePatternScore,

      decay_score:
        decayScore,
    },

    transition_state:
      sample.transition_state ??
      null,
  };
}

function sanitizeSamples(
  samples:
    readonly ImpulseAdaptiveSample[],
): SampleSanitationResult {
  const sanitizedSamples:
    SanitizedImpulseAdaptiveSample[] =
    [];

  let rejectedSampleCount =
    0;

  for (const sample of samples) {
    const sanitizedSample =
      sanitizeSample(
        sample,
      );

    if (
      sanitizedSample === null
    ) {
      rejectedSampleCount += 1;
      continue;
    }

    sanitizedSamples.push(
      sanitizedSample,
    );
  }

  return {
    samples:
      sanitizedSamples,

    rejected_sample_count:
      rejectedSampleCount,
  };
}

/* ============================================================================
 * 6. CANONICAL BOOTSTRAP CLASSIFICATION
 * ----------------------------------------------------------------------------
 * A provided transition state remains authoritative for the calibration sample.
 *
 * When absent, the canonical resolver may classify the sample only to build
 * calibration distributions. This inferred state is not propagated as new
 * market truth.
 * ========================================================================== */

function classifySample(
  sample:
    SanitizedImpulseAdaptiveSample,
): ClassifiedImpulseAdaptiveSample {
  if (
    sample.transition_state !==
    null
  ) {
    return {
      sample,

      state:
        sample.transition_state,

      state_source:
        "provided",
    };
  }

  const inferredState =
    resolveImpulseTransitionState({
      scores:
        sample.scores,

      triple_layer:
        sample.triple_layer,

      policy:
        DEFAULT_IMPULSE_POLICY,
    });

  return {
    sample,

    state:
      inferredState,

    state_source:
      "inferred",
  };
}

function classifySamples(
  samples:
    readonly SanitizedImpulseAdaptiveSample[],
): ClassifiedImpulseAdaptiveSample[] {
  return samples.map(
    classifySample,
  );
}

/* ============================================================================
 * 7. DISTRIBUTION READERS
 * ========================================================================== */

function getStateSamples(
  samples:
    readonly ClassifiedImpulseAdaptiveSample[],
  state:
    CalibratableImpulseTransitionState,
): ClassifiedImpulseAdaptiveSample[] {
  return samples.filter(
    (sample) =>
      sample.state === state,
  );
}

function getSampleValues(
  samples:
    readonly ClassifiedImpulseAdaptiveSample[],
  selector: (
    sample:
      SanitizedImpulseAdaptiveSample,
  ) => number | null,
): number[] {
  const values:
    number[] = [];

  for (const classifiedSample of samples) {
    const value =
      selector(
        classifiedSample.sample,
      );

    if (
      value === null ||
      !isScoreValue(value)
    ) {
      continue;
    }

    values.push(
      roundToTwoDecimals(
        value,
      ),
    );
  }

  return values;
}

function countStateSamples(
  samples:
    readonly ClassifiedImpulseAdaptiveSample[],
): ImpulseStateSampleSize {
  return {
    COMPRESSION:
      getStateSamples(
        samples,
        "COMPRESSION",
      ).length,

    PRESSURE_BUILDING:
      getStateSamples(
        samples,
        "PRESSURE_BUILDING",
      ).length,

    RELEASE:
      getStateSamples(
        samples,
        "RELEASE",
      ).length,

    EXHAUSTION:
      getStateSamples(
        samples,
        "EXHAUSTION",
      ).length,

    NEUTRAL:
      getStateSamples(
        samples,
        "NEUTRAL",
      ).length,
  };
}

function hasEnoughStateSamples(
  samples:
    readonly ClassifiedImpulseAdaptiveSample[],
): boolean {
  return (
    samples.length >=
    MINIMUM_STATE_SAMPLE_COUNT
  );
}

/* ============================================================================
 * 8. WARNING GOVERNANCE
 * ========================================================================== */

function appendStateSampleWarnings(
  stateSampleSize:
    ImpulseStateSampleSize,
  warnings:
    string[],
): void {
  for (
    const state of
      CALIBRATABLE_IMPULSE_STATES
  ) {
    const count =
      stateSampleSize[state];

    if (
      count <
      MINIMUM_STATE_SAMPLE_COUNT
    ) {
      warnings.push(
        `impulse_adaptive_thresholds_insufficient_${state.toLowerCase()}_sample`,
      );
    }
  }
}

function appendDominanceWarnings(
  stateSampleSize:
    ImpulseStateSampleSize,
  totalSampleSize:
    number,
  warnings:
    string[],
): void {
  if (
    totalSampleSize <= 0
  ) {
    return;
  }

  for (
    const state of
      CALIBRATABLE_IMPULSE_STATES
  ) {
    const ratio =
      stateSampleSize[state] /
      totalSampleSize;

    if (
      ratio >
      STATE_DOMINANCE_WARNING_RATIO
    ) {
      warnings.push(
        `impulse_adaptive_thresholds_${state.toLowerCase()}_dominance`,
      );
    }
  }
}

/* ============================================================================
 * 9. POLICY FACTORIES
 * ----------------------------------------------------------------------------
 * Policies are immutable calibration outputs.
 *
 * They do not contain:
 * - final propagated Impulse truth
 * - decisions
 * - public labels
 * - runtime timestamps
 * ========================================================================== */

function buildPolicy(
  input: Readonly<{
    source:
      CalibrationSource;

    sample_size:
      number;

    state_sample_size:
      ImpulseStateSampleSize;

    thresholds:
      ImpulseResolvedThresholds;

    warnings:
      readonly string[];
  }>,
): ImpulseResolvedPolicy {
  return {
    policy_id:
      `xyvala-impulse-${input.source}`,

    policy_version:
      IMPULSE_ADAPTIVE_POLICY_VERSION,

    source:
      input.source,

    sample_size:
      input.sample_size,

    state_sample_size:
      {
        ...input.state_sample_size,
      },

    thresholds:
      input.thresholds,

    warnings:
      uniqueWarnings(
        input.warnings,
      ),
  };
}

function buildFallbackPolicy(
  input: Readonly<{
    sample_size:
      number;

    state_sample_size:
      ImpulseStateSampleSize;

    warnings:
      readonly string[];
  }>,
): ImpulseResolvedPolicy {
  return buildPolicy({
    source:
      "fallback",

    sample_size:
      input.sample_size,

    state_sample_size:
      input.state_sample_size,

    thresholds:
      DEFAULT_IMPULSE_POLICY
        .thresholds,

    warnings:
      input.warnings,
  });
}

/* ============================================================================
 * 10. ADAPTIVE THRESHOLD CONSTRUCTION
 * ----------------------------------------------------------------------------
 * Thresholds are derived from state-specific observed distributions.
 *
 * When a state does not have enough samples, the corresponding canonical
 * static threshold remains in force.
 *
 * This is a threshold fallback, not an analytical-value fallback.
 * ========================================================================== */

function buildAdaptiveThresholds(
  samples:
    readonly ClassifiedImpulseAdaptiveSample[],
): ImpulseResolvedThresholds {
  const fallback =
    DEFAULT_IMPULSE_POLICY
      .thresholds;

  const compressionSamples =
    getStateSamples(
      samples,
      "COMPRESSION",
    );

  const pressureBuildingSamples =
    getStateSamples(
      samples,
      "PRESSURE_BUILDING",
    );

  const releaseSamples =
    getStateSamples(
      samples,
      "RELEASE",
    );

  const exhaustionSamples =
    getStateSamples(
      samples,
      "EXHAUSTION",
    );

  const neutralSamples =
    getStateSamples(
      samples,
      "NEUTRAL",
    );

  const useCompression =
    hasEnoughStateSamples(
      compressionSamples,
    );

  const usePressureBuilding =
    hasEnoughStateSamples(
      pressureBuildingSamples,
    );

  const useRelease =
    hasEnoughStateSamples(
      releaseSamples,
    );

  const useExhaustion =
    hasEnoughStateSamples(
      exhaustionSamples,
    );

  const useNeutral =
    hasEnoughStateSamples(
      neutralSamples,
    );

  return {
    compression: {
      pressure_min:
        resolveBoundedPercentile(
          useCompression
            ? getSampleValues(
                compressionSamples,
                (sample) =>
                  sample.scores
                    .pressure_score,
              )
            : [],
          {
            fallback:
              fallback.compression
                .pressure_min,

            percentile:
              45,

            minimum:
              30,

            maximum:
              58,
          },
        ),

      instability_max:
        resolveBoundedPercentile(
          useCompression
            ? getSampleValues(
                compressionSamples,
                (sample) =>
                  sample.scores
                    .instability_score,
              )
            : [],
          {
            fallback:
              fallback.compression
                .instability_max,

            percentile:
              62,

            minimum:
              42,

            maximum:
              68,
          },
        ),

      exhaustion_max:
        resolveBoundedPercentile(
          useCompression
            ? getSampleValues(
                compressionSamples,
                (sample) =>
                  sample.scores
                    .exhaustion_score,
              )
            : [],
          {
            fallback:
              fallback.compression
                .exhaustion_max,

            percentile:
              62,

            minimum:
              38,

            maximum:
              66,
          },
        ),

      alignment_min:
        resolveBoundedPercentile(
          useCompression
            ? getSampleValues(
                compressionSamples,
                (sample) =>
                  sample.scores
                    .alignment_score,
              )
            : [],
          {
            fallback:
              fallback.compression
                .alignment_min,

            percentile:
              42,

            minimum:
              30,

            maximum:
              62,
          },
        ),

      core_pattern_min:
        resolveBoundedPercentile(
          useCompression
            ? getSampleValues(
                compressionSamples,
                (sample) =>
                  sample.triple_layer
                    .core_pattern_score,
              )
            : [],
          {
            fallback:
              fallback.compression
                .core_pattern_min,

            percentile:
              45,

            minimum:
              35,

            maximum:
              60,
          },
        ),
    },

    pressure_building: {
      pressure_min:
        resolveBoundedPercentile(
          usePressureBuilding
            ? getSampleValues(
                pressureBuildingSamples,
                (sample) =>
                  sample.scores
                    .pressure_score,
              )
            : [],
          {
            fallback:
              fallback.pressure_building
                .pressure_min,

            percentile:
              55,

            minimum:
              38,

            maximum:
              68,
          },
        ),

      saturation_min:
        resolveBoundedPercentile(
          usePressureBuilding
            ? getSampleValues(
                pressureBuildingSamples,
                (sample) =>
                  sample.scores
                    .saturation_score,
              )
            : [],
          {
            fallback:
              fallback.pressure_building
                .saturation_min,

            percentile:
              45,

            minimum:
              32,

            maximum:
              65,
          },
        ),

      instability_min:
        resolveBoundedPercentile(
          usePressureBuilding
            ? getSampleValues(
                pressureBuildingSamples,
                (sample) =>
                  sample.scores
                    .instability_score,
              )
            : [],
          {
            fallback:
              fallback.pressure_building
                .instability_min,

            percentile:
              38,

            minimum:
              24,

            maximum:
              62,
          },
        ),

      acceleration_min:
        resolveBoundedPercentile(
          usePressureBuilding
            ? getSampleValues(
                pressureBuildingSamples,
                (sample) =>
                  sample.scores
                    .acceleration_score,
              )
            : [],
          {
            fallback:
              fallback.pressure_building
                .acceleration_min,

            percentile:
              42,

            minimum:
              28,

            maximum:
              66,
          },
        ),

      alignment_min:
        resolveBoundedPercentile(
          usePressureBuilding
            ? getSampleValues(
                pressureBuildingSamples,
                (sample) =>
                  sample.scores
                    .alignment_score,
              )
            : [],
          {
            fallback:
              fallback.pressure_building
                .alignment_min,

            percentile:
              45,

            minimum:
              30,

            maximum:
              66,
          },
        ),

      growth_min:
        resolveBoundedPercentile(
          usePressureBuilding
            ? getSampleValues(
                pressureBuildingSamples,
                (sample) =>
                  sample.triple_layer
                    .growth_score,
              )
            : [],
          {
            fallback:
              fallback.pressure_building
                .growth_min,

            percentile:
              42,

            minimum:
              30,

            maximum:
              62,
          },
        ),
    },

    release: {
      pressure_min:
        resolveBoundedPercentile(
          useRelease
            ? getSampleValues(
                releaseSamples,
                (sample) =>
                  sample.scores
                    .pressure_score,
              )
            : [],
          {
            fallback:
              fallback.release
                .pressure_min,

            percentile:
              58,

            minimum:
              42,

            maximum:
              72,
          },
        ),

      instability_min:
        resolveBoundedPercentile(
          useRelease
            ? getSampleValues(
                releaseSamples,
                (sample) =>
                  sample.scores
                    .instability_score,
              )
            : [],
          {
            fallback:
              fallback.release
                .instability_min,

            percentile:
              50,

            minimum:
              34,

            maximum:
              70,
          },
        ),

      saturation_min:
        resolveBoundedPercentile(
          useRelease
            ? getSampleValues(
                releaseSamples,
                (sample) =>
                  sample.scores
                    .saturation_score,
              )
            : [],
          {
            fallback:
              fallback.release
                .saturation_min,

            percentile:
              48,

            minimum:
              34,

            maximum:
              68,
          },
        ),

      acceleration_min:
        resolveBoundedPercentile(
          useRelease
            ? getSampleValues(
                releaseSamples,
                (sample) =>
                  sample.scores
                    .acceleration_score,
              )
            : [],
          {
            fallback:
              fallback.release
                .acceleration_min,

            percentile:
              55,

            minimum:
              36,

            maximum:
              72,
          },
        ),

      alignment_min:
        resolveBoundedPercentile(
          useRelease
            ? getSampleValues(
                releaseSamples,
                (sample) =>
                  sample.scores
                    .alignment_score,
              )
            : [],
          {
            fallback:
              fallback.release
                .alignment_min,

            percentile:
              48,

            minimum:
              32,

            maximum:
              70,
          },
        ),

      growth_min:
        resolveBoundedPercentile(
          useRelease
            ? getSampleValues(
                releaseSamples,
                (sample) =>
                  sample.triple_layer
                    .growth_score,
              )
            : [],
          {
            fallback:
              fallback.release
                .growth_min,

            percentile:
              48,

            minimum:
              34,

            maximum:
              66,
          },
        ),

      decay_max:
        resolveBoundedPercentile(
          useRelease
            ? getSampleValues(
                releaseSamples,
                (sample) =>
                  sample.triple_layer
                    .decay_score,
              )
            : [],
          {
            fallback:
              fallback.release
                .decay_max,

            percentile:
              70,

            minimum:
              52,

            maximum:
              82,
          },
        ),
    },

    exhaustion: {
      exhaustion_min:
        resolveBoundedPercentile(
          useExhaustion
            ? getSampleValues(
                exhaustionSamples,
                (sample) =>
                  sample.scores
                    .exhaustion_score,
              )
            : [],
          {
            fallback:
              fallback.exhaustion
                .exhaustion_min,

            percentile:
              58,

            minimum:
              48,

            maximum:
              78,
          },
        ),

      instability_min:
        resolveBoundedPercentile(
          useExhaustion
            ? getSampleValues(
                exhaustionSamples,
                (sample) =>
                  sample.scores
                    .instability_score,
              )
            : [],
          {
            fallback:
              fallback.exhaustion
                .instability_min,

            percentile:
              52,

            minimum:
              35,

            maximum:
              72,
          },
        ),

      saturation_min:
        resolveBoundedPercentile(
          useExhaustion
            ? getSampleValues(
                exhaustionSamples,
                (sample) =>
                  sample.scores
                    .saturation_score,
              )
            : [],
          {
            fallback:
              fallback.exhaustion
                .saturation_min,

            percentile:
              52,

            minimum:
              36,

            maximum:
              72,
          },
        ),

      acceleration_min:
        resolveBoundedPercentile(
          useExhaustion
            ? getSampleValues(
                exhaustionSamples,
                (sample) =>
                  sample.scores
                    .acceleration_score,
              )
            : [],
          {
            fallback:
              fallback.exhaustion
                .acceleration_min,

            percentile:
              50,

            minimum:
              32,

            maximum:
              70,
          },
        ),

      decay_min:
        resolveBoundedPercentile(
          useExhaustion
            ? getSampleValues(
                exhaustionSamples,
                (sample) =>
                  sample.triple_layer
                    .decay_score,
              )
            : [],
          {
            fallback:
              fallback.exhaustion
                .decay_min,

            percentile:
              50,

            minimum:
              35,

            maximum:
              72,
          },
        ),
    },

    neutral: {
      pressure_max:
        resolveBoundedPercentile(
          useNeutral
            ? getSampleValues(
                neutralSamples,
                (sample) =>
                  sample.scores
                    .pressure_score,
              )
            : [],
          {
            fallback:
              fallback.neutral
                .pressure_max,

            percentile:
              65,

            minimum:
              25,

            maximum:
              44,
          },
        ),

      instability_max:
        resolveBoundedPercentile(
          useNeutral
            ? getSampleValues(
                neutralSamples,
                (sample) =>
                  sample.scores
                    .instability_score,
              )
            : [],
          {
            fallback:
              fallback.neutral
                .instability_max,

            percentile:
              65,

            minimum:
              25,

            maximum:
              56,
          },
        ),

      saturation_max:
        resolveBoundedPercentile(
          useNeutral
            ? getSampleValues(
                neutralSamples,
                (sample) =>
                  sample.scores
                    .saturation_score,
              )
            : [],
          {
            fallback:
              fallback.neutral
                .saturation_max,

            percentile:
              65,

            minimum:
              25,

            maximum:
              56,
          },
        ),

      exhaustion_max:
        resolveBoundedPercentile(
          useNeutral
            ? getSampleValues(
                neutralSamples,
                (sample) =>
                  sample.scores
                    .exhaustion_score,
              )
            : [],
          {
            fallback:
              fallback.neutral
                .exhaustion_max,

            percentile:
              65,

            minimum:
              25,

            maximum:
              56,
          },
        ),
    },
  };
}

/* ============================================================================
 * 11. PUBLIC CALIBRATION EXECUTION
 * ----------------------------------------------------------------------------
 * PROCESS
 * 1. validate required source scores
 * 2. preserve optional Triple Layer nullability
 * 3. classify unlabeled bootstrap samples through the canonical resolver
 * 4. measure state sample distribution
 * 5. select fallback, bootstrap or adaptive policy
 * 6. return one deterministic immutable policy
 * ========================================================================== */

export function buildImpulseAdaptivePolicy(
  inputSamples:
    readonly ImpulseAdaptiveSample[],
): ImpulseResolvedPolicy {
  const sanitation =
    sanitizeSamples(
      inputSamples,
    );

  const warnings:
    string[] = [];

  if (
    sanitation
      .rejected_sample_count > 0
  ) {
    warnings.push(
      "impulse_adaptive_thresholds_rejected_invalid_samples",
    );
  }

  const classifiedSamples =
    classifySamples(
      sanitation.samples,
    );

  const stateSampleSize =
    countStateSamples(
      classifiedSamples,
    );

  const inferredSampleCount =
    classifiedSamples.filter(
      (sample) =>
        sample.state_source ===
        "inferred",
    ).length;

  if (
    inferredSampleCount > 0
  ) {
    warnings.push(
      "impulse_adaptive_thresholds_inferred_bootstrap_labels",
    );
  }

  if (
    classifiedSamples.length <
    MINIMUM_BOOTSTRAP_SAMPLE_COUNT
  ) {
    warnings.push(
      "impulse_adaptive_thresholds_insufficient_bootstrap_sample",
    );

    return buildFallbackPolicy({
      sample_size:
        classifiedSamples.length,

      state_sample_size:
        stateSampleSize,

      warnings,
    });
  }

  appendStateSampleWarnings(
    stateSampleSize,
    warnings,
  );

  appendDominanceWarnings(
    stateSampleSize,
    classifiedSamples.length,
    warnings,
  );

  const thresholds =
    buildAdaptiveThresholds(
      classifiedSamples,
    );

  if (
    classifiedSamples.length <
    MINIMUM_GLOBAL_SAMPLE_COUNT
  ) {
    warnings.push(
      "impulse_adaptive_thresholds_bootstrap_sample_only",
    );

    return buildPolicy({
      source:
        "bootstrap",

      sample_size:
        classifiedSamples.length,

      state_sample_size:
        stateSampleSize,

      thresholds,

      warnings,
    });
  }

  return buildPolicy({
    source:
      "adaptive",

    sample_size:
      classifiedSamples.length,

    state_sample_size:
      stateSampleSize,

    thresholds,

    warnings,
  });
}
