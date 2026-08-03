/* ============================================================================
 * FILE: lib/xyvala/engine/impulse-state-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical Impulse Layer state core
 *
 * ROLE
 * - consume canonical RFS and Triple Layer truths
 * - compute canonical private Impulse Layer scores
 * - measure compression, pressure, acceleration, alignment, instability,
 *   saturation and exhaustion
 * - resolve the single canonical Impulse transition state
 * - apply an already-resolved static, bootstrap, adaptive or fallback policy
 * - expose explicit computation status, warnings and policy lineage
 *
 * CLASSIFICATION
 * - PRIVATE ANALYTICAL ENGINE
 * - IMPULSE LAYER
 * - COMPUTE
 * - PURE
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
 * - canonical RFS producer
 * - canonical Triple Layer producer
 * - resolved Impulse policy provider
 * - canonical private analytical orchestrator
 *
 * CONSUMERS
 * - Analytical Aggregation System
 * - MCI input adapter
 * - calibration sample builders
 * - calibration observability
 * - private snapshot projection
 * - private traceability adapters
 * - propagation and boundary audits
 *
 * DIRECTIVES
 * - private analytical computation only
 * - no RFS recomputation
 * - no Triple Layer recomputation
 * - no Analytical Aggregation computation
 * - no MCI computation
 * - no decision computation
 * - no calibration policy construction
 * - no policy threshold mutation
 * - no snapshot construction
 * - no transformer logic
 * - no ranking logic
 * - no API logic
 * - no UI logic
 * - no public wording
 * - no cache logic
 * - no persistence
 * - no event publication
 * - no console logging
 * - no runtime mutation
 * - no investment advice
 * - no prediction
 * - no buy / sell / hold semantics
 * - no unavailable-to-zero substitution
 * - no unavailable-to-neutral substitution
 * - no silent input clamping
 * - policy must be resolved before execution
 * - same canonical input and policy => same canonical output
 *
 * INPUTS
 * - canonical current RFS signature
 * - canonical RFS structural axes
 * - canonical RFS rupture and stability readings
 * - canonical 7D structural temporal context
 * - optional canonical 24H timing confirmation
 * - optional canonical Triple Layer contextual truth
 * - resolved canonical Impulse transition policy
 *
 * OUTPUTS
 * - ImpulseStateResult
 *
 * OWNERSHIP
 * - Impulse Layer owns:
 *   - impulse_compression_score
 *   - impulse_pressure_score
 *   - impulse_acceleration_score
 *   - impulse_alignment_score
 *   - impulse_instability_score
 *   - impulse_saturation_score
 *   - impulse_exhaustion_score
 *   - impulse_directional_bias
 *   - impulse_transition_state
 *
 * NON-OWNERSHIP
 * - RFS owns structural, stability, regime and rupture truth
 * - Triple Layer owns growth, core-pattern and decay truth
 * - Analytical Aggregation owns aggregated contexts
 * - MCI owns opportunity, confidence and decision truth
 * - Calibration owns policy construction and threshold selection
 *
 * INVARIANTS
 * - Impulse never replaces RFS structural truth
 * - Impulse never replaces stability
 * - Impulse never replaces regime
 * - Impulse never replaces rupture
 * - Triple Layer remains contextual only
 * - Triple Layer never modifies numerical Impulse score formulas
 * - 7D remains the primary temporal context
 * - 24H remains confirmation and timing only
 * - one canonical resolver produces impulse_transition_state
 * - static and adaptive execution use the same canonical resolver
 * - calibration changes thresholds only
 * - null means unavailable
 * - zero remains a valid computed value
 * - invalid required input blocks Impulse computation
 * - neutral means a computed neutral classification
 * - unavailable never becomes NEUTRAL
 * - all computed scores remain in [0, 100]
 * - all returned finite scores are rounded to two decimals
 *
 * CONTRACT COMPATIBILITY
 * - the current calibratable state contract does not yet expose UNCLASSIFIED
 * - a valid but unmatched score combination temporarily resolves to NEUTRAL
 * - this residual compatibility path is explicitly reported through a warning
 * - introducing UNCLASSIFIED requires a separate versioned migration
 *
 * BOUNDARIES
 * - RFS -> Impulse Layer
 * - Triple Layer -> Impulse Layer
 * - Calibration policy -> Impulse Layer
 * - Impulse Layer -> Analytical Aggregation System
 *
 * FIRST DIVERGENCE
 * - invalid RFS or Triple Layer input
 *   => upstream producer -> Impulse Layer
 *
 * - invalid resolved policy
 *   => Calibration -> Impulse Layer
 *
 * - valid input but invalid Impulse output
 *   => Impulse Layer producer
 *
 * - valid Impulse output altered downstream
 *   => first downstream propagation boundary
 *
 * SENSITIVE ZONES
 * - input-domain validation
 * - policy validation
 * - Triple Layer contextual validation
 * - 7D / 24H hierarchy
 * - score bounding
 * - state resolution priority
 * - residual neutral compatibility
 * - nullability
 * - policy lineage
 * ========================================================================== */

/* ============================================================================
 * 1. CANONICAL PUBLIC TYPES
 * ========================================================================== */

export type ImpulseDirectionalBias =
  | "UP"
  | "DOWN"
  | "MIXED"
  | "NEUTRAL"
  | "UNAVAILABLE";

export type ImpulseTransitionState =
  | "COMPRESSION"
  | "PRESSURE_BUILDING"
  | "RELEASE"
  | "EXHAUSTION"
  | "NEUTRAL"
  | "UNAVAILABLE";

export type CalibratableImpulseTransitionState =
  Exclude<
    ImpulseTransitionState,
    "UNAVAILABLE"
  >;

export type ImpulseStatus =
  | "computed"
  | "partial"
  | "unavailable";

export type ImpulsePolicySource =
  | "static"
  | "bootstrap"
  | "adaptive"
  | "fallback";

export type ImpulseTripleLayerStatus =
  | "computed"
  | "partial"
  | "unavailable"
  | "neutralized";

export type ImpulseWarning =
  | "impulse_invalid_policy"
  | "impulse_invalid_current_signature"
  | "impulse_invalid_structural_axes"
  | "impulse_invalid_structural_context"
  | "impulse_invalid_rolling_7d"
  | "impulse_invalid_rolling_24h"
  | "impulse_missing_triple_layer"
  | "impulse_partial_triple_layer"
  | "impulse_neutralized_triple_layer"
  | "impulse_missing_24h_confirmation"
  | "impulse_partial_input"
  | "impulse_residual_neutral_classification"
  | "impulse_unavailable";

export type ImpulseTemporalBlock =
  Readonly<{
    change_pct:
      number | null;

    slope_pct:
      number | null;

    stability_score:
      number | null;

    rupture_probability:
      number | null;
  }>;

export type ImpulseSignatureInput =
  Readonly<{
    slope_pct:
      number | null;

    amplitude_pct:
      number | null;

    instability_score:
      number | null;

    break_rate:
      number | null;
  }>;

export type ImpulseTripleLayerContext =
  Readonly<{
    triple_layer_state:
      string | null;

    growth_score:
      number | null;

    core_pattern_score:
      number | null;

    decay_score:
      number | null;

    growth_status:
      ImpulseTripleLayerStatus;

    core_status:
      ImpulseTripleLayerStatus;

    decay_status:
      ImpulseTripleLayerStatus;
  }>;

export type ImpulseScoreSet =
  Readonly<{
    compression_score:
      number;

    pressure_score:
      number;

    acceleration_score:
      number;

    alignment_score:
      number;

    instability_score:
      number;

    saturation_score:
      number;

    exhaustion_score:
      number;
  }>;

export type ImpulseResolvedThresholds =
  Readonly<{
    compression:
      Readonly<{
        pressure_min:
          number;

        instability_max:
          number;

        exhaustion_max:
          number;

        alignment_min:
          number;

        core_pattern_min:
          number;
      }>;

    pressure_building:
      Readonly<{
        pressure_min:
          number;

        saturation_min:
          number;

        instability_min:
          number;

        acceleration_min:
          number;

        alignment_min:
          number;

        growth_min:
          number;
      }>;

    release:
      Readonly<{
        pressure_min:
          number;

        instability_min:
          number;

        saturation_min:
          number;

        acceleration_min:
          number;

        alignment_min:
          number;

        growth_min:
          number;

        decay_max:
          number;
      }>;

    exhaustion:
      Readonly<{
        exhaustion_min:
          number;

        instability_min:
          number;

        saturation_min:
          number;

        acceleration_min:
          number;

        decay_min:
          number;
      }>;

    neutral:
      Readonly<{
        pressure_max:
          number;

        instability_max:
          number;

        saturation_max:
          number;

        exhaustion_max:
          number;
      }>;
  }>;

export type ImpulseStateSampleSize =
  Readonly<
    Record<
      CalibratableImpulseTransitionState,
      number
    >
  >;

export type ImpulseResolvedPolicy =
  Readonly<{
    policy_id:
      string;

    policy_version:
      string;

    source:
      ImpulsePolicySource;

    sample_size:
      number | null;

    state_sample_size:
      ImpulseStateSampleSize | null;

    thresholds:
      ImpulseResolvedThresholds;

    warnings:
      readonly string[];
  }>;

export type ImpulseStateInput =
  Readonly<{
    current_signature:
      ImpulseSignatureInput;

    occurrence_score:
      number | null;

    frequency_score:
      number | null;

    convergence_score:
      number | null;

    correlation_score:
      number | null;

    duration_score:
      number | null;

    rupture_probability:
      number | null;

    rupture_penalty_score:
      number | null;

    stability_score:
      number | null;

    coherence_score:
      number | null;

    rolling_7d:
      ImpulseTemporalBlock;

    rolling_24h:
      ImpulseTemporalBlock | null;

    triple_layer:
      ImpulseTripleLayerContext | null;

    policy:
      ImpulseResolvedPolicy;
  }>;

export type ImpulseStateResult =
  Readonly<{
    impulse_status:
      ImpulseStatus;

    impulse_compression_score:
      number | null;

    impulse_pressure_score:
      number | null;

    impulse_acceleration_score:
      number | null;

    impulse_alignment_score:
      number | null;

    impulse_instability_score:
      number | null;

    impulse_saturation_score:
      number | null;

    impulse_exhaustion_score:
      number | null;

    impulse_directional_bias:
      ImpulseDirectionalBias;

    impulse_transition_state:
      ImpulseTransitionState;

    impulse_policy_id:
      string | null;

    impulse_policy_version:
      string | null;

    impulse_policy_source:
      ImpulsePolicySource | null;

    impulse_policy_sample_size:
      number | null;

    policy_warnings:
      readonly string[];

    warnings:
      readonly ImpulseWarning[];
  }>;

/* ============================================================================
 * 2. CANONICAL STATIC POLICY
 * ========================================================================== */

export const IMPULSE_ENGINE_VERSION =
  "impulse-core-v2" as const;

const SCORE_MINIMUM =
  0;

const SCORE_MAXIMUM =
  100;

const RATE_MINIMUM =
  0;

const RATE_MAXIMUM =
  1;

const DIRECTIONAL_POSITIVE_SLOPE_MIN_PCT =
  1;

const DIRECTIONAL_NEGATIVE_SLOPE_MAX_PCT =
  -1;

const SEVEN_DAY_PRIMARY_WEIGHT =
  0.75;

const TWENTY_FOUR_HOUR_CONFIRMATION_WEIGHT =
  0.25;

export const DEFAULT_IMPULSE_THRESHOLDS:
  ImpulseResolvedThresholds =
  Object.freeze({
    compression:
      Object.freeze({
        pressure_min:
          35,

        instability_max:
          58,

        exhaustion_max:
          55,

        alignment_min:
          40,

        core_pattern_min:
          45,
      }),

    pressure_building:
      Object.freeze({
        pressure_min:
          45,

        saturation_min:
          38,

        instability_min:
          28,

        acceleration_min:
          30,

        alignment_min:
          40,

        growth_min:
          38,
      }),

    release:
      Object.freeze({
        pressure_min:
          52,

        instability_min:
          42,

        saturation_min:
          42,

        acceleration_min:
          45,

        alignment_min:
          42,

        growth_min:
          42,

        decay_max:
          72,
      }),

    exhaustion:
      Object.freeze({
        exhaustion_min:
          62,

        instability_min:
          45,

        saturation_min:
          48,

        acceleration_min:
          35,

        decay_min:
          45,
      }),

    neutral:
      Object.freeze({
        pressure_max:
          34,

        instability_max:
          34,

        saturation_max:
          34,

        exhaustion_max:
          34,
      }),
  });

export const DEFAULT_IMPULSE_POLICY:
  ImpulseResolvedPolicy =
  Object.freeze({
    policy_id:
      "xyvala-impulse-static",

    policy_version:
      IMPULSE_ENGINE_VERSION,

    source:
      "static",

    sample_size:
      null,

    state_sample_size:
      null,

    thresholds:
      DEFAULT_IMPULSE_THRESHOLDS,

    warnings:
      Object.freeze([]),
  });

/* ============================================================================
 * 3. INTERNAL NORMALIZED TYPES
 * ========================================================================== */

type NormalizedImpulseTemporalBlock =
  Readonly<{
    change_pct:
      number;

    slope_pct:
      number;

    stability_score:
      number;

    rupture_probability:
      number;
  }>;

type NormalizedImpulseSignature =
  Readonly<{
    slope_pct:
      number;

    amplitude_pct:
      number;

    instability_score:
      number;

    break_rate:
      number;
  }>;

export type NormalizedImpulseTripleLayerContext =
  Readonly<{
    available:
      boolean;

    partial:
      boolean;

    neutralized:
      boolean;

    triple_layer_state:
      string | null;

    growth_score:
      number | null;

    core_pattern_score:
      number | null;

    decay_score:
      number | null;
  }>;

type ValidatedImpulseInput =
  Readonly<{
    current_signature:
      NormalizedImpulseSignature;

    occurrence_score:
      number;

    frequency_score:
      number;

    convergence_score:
      number;

    correlation_score:
      number;

    duration_score:
      number;

    rupture_probability:
      number;

    rupture_penalty_score:
      number;

    stability_score:
      number;

    coherence_score:
      number;

    rolling_7d:
      NormalizedImpulseTemporalBlock;

    rolling_24h:
      NormalizedImpulseTemporalBlock | null;

    triple_layer:
      NormalizedImpulseTripleLayerContext;

    policy:
      ImpulseResolvedPolicy;

    status:
      Exclude<
        ImpulseStatus,
        "unavailable"
      >;

    warnings:
      readonly ImpulseWarning[];
  }>;

type ImpulseInputValidationResult =
  | Readonly<{
      valid:
        true;

      value:
        ValidatedImpulseInput;
    }>
  | Readonly<{
      valid:
        false;

      warnings:
        readonly ImpulseWarning[];
    }>;

type ImpulseTransitionResolution =
  Readonly<{
    state:
      CalibratableImpulseTransitionState;

    matched_explicit_rule:
      boolean;
  }>;

/* ============================================================================
 * 4. SAFE PRIMITIVES
 * ----------------------------------------------------------------------------
 * Input readers reject invalid values.
 *
 * Only values created by this analytical engine may be bounded through
 * normalizeComputedScore.
 * ========================================================================== */

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function isNonEmptyString(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function roundToTwoDecimals(
  value: number,
): number {
  if (!isFiniteNumber(value)) {
    throw new TypeError(
      "IMPULSE_NUMBER_INVALID: expected a finite number",
    );
  }

  return (
    Math.round(value * 100) /
    100
  );
}

function clampComputedValue(
  value: number,
  minimum: number,
  maximum: number,
): number {
  if (!isFiniteNumber(value)) {
    throw new TypeError(
      "IMPULSE_COMPUTED_VALUE_INVALID: expected a finite computed value",
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

function normalizeComputedScore(
  value: number,
): number {
  return roundToTwoDecimals(
    clampComputedValue(
      value,
      SCORE_MINIMUM,
      SCORE_MAXIMUM,
    ),
  );
}

function uniqueWarnings(
  warnings:
    readonly ImpulseWarning[],
): ImpulseWarning[] {
  return [
    ...new Set(warnings),
  ];
}

function copyPolicyWarnings(
  warnings:
    readonly string[],
): string[] {
  return [
    ...new Set(
      warnings
        .filter(
          (
            warning,
          ): warning is string =>
            typeof warning ===
              "string",
        )
        .map(
          (warning) =>
            warning.trim(),
        )
        .filter(
          (warning) =>
            warning.length > 0,
        ),
    ),
  ];
}

/* ============================================================================
 * 5. POLICY VALIDATION
 * ========================================================================== */

function isScoreDomainValue(
  value: unknown,
): value is number {
  return (
    isFiniteNumber(value) &&
    value >= SCORE_MINIMUM &&
    value <= SCORE_MAXIMUM
  );
}

function isValidPolicySource(
  value: unknown,
): value is ImpulsePolicySource {
  return (
    value === "static" ||
    value === "bootstrap" ||
    value === "adaptive" ||
    value === "fallback"
  );
}

function isValidStateSampleSize(
  value: unknown,
): value is ImpulseStateSampleSize {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const candidate =
    value as Partial<
      Record<
        CalibratableImpulseTransitionState,
        unknown
      >
    >;

  const counts = [
    candidate.COMPRESSION,
    candidate.PRESSURE_BUILDING,
    candidate.RELEASE,
    candidate.EXHAUSTION,
    candidate.NEUTRAL,
  ];

  return counts.every(
    (count) =>
      typeof count === "number" &&
      Number.isInteger(count) &&
      count >= 0,
  );
}

function isValidPolicySampleSize(
  value: unknown,
): value is number | null {
  return (
    value === null ||
    (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0
    )
  );
}

function isValidImpulseThresholds(
  thresholds:
    ImpulseResolvedThresholds,
): boolean {
  const values = [
    thresholds
      .compression
      .pressure_min,

    thresholds
      .compression
      .instability_max,

    thresholds
      .compression
      .exhaustion_max,

    thresholds
      .compression
      .alignment_min,

    thresholds
      .compression
      .core_pattern_min,

    thresholds
      .pressure_building
      .pressure_min,

    thresholds
      .pressure_building
      .saturation_min,

    thresholds
      .pressure_building
      .instability_min,

    thresholds
      .pressure_building
      .acceleration_min,

    thresholds
      .pressure_building
      .alignment_min,

    thresholds
      .pressure_building
      .growth_min,

    thresholds
      .release
      .pressure_min,

    thresholds
      .release
      .instability_min,

    thresholds
      .release
      .saturation_min,

    thresholds
      .release
      .acceleration_min,

    thresholds
      .release
      .alignment_min,

    thresholds
      .release
      .growth_min,

    thresholds
      .release
      .decay_max,

    thresholds
      .exhaustion
      .exhaustion_min,

    thresholds
      .exhaustion
      .instability_min,

    thresholds
      .exhaustion
      .saturation_min,

    thresholds
      .exhaustion
      .acceleration_min,

    thresholds
      .exhaustion
      .decay_min,

    thresholds
      .neutral
      .pressure_max,

    thresholds
      .neutral
      .instability_max,

    thresholds
      .neutral
      .saturation_max,

    thresholds
      .neutral
      .exhaustion_max,
  ];

  if (
    !values.every(
      isScoreDomainValue,
    )
  ) {
    return false;
  }

  if (
    thresholds
      .release
      .pressure_min <
    thresholds
      .pressure_building
      .pressure_min
  ) {
    return false;
  }

  if (
    thresholds
      .neutral
      .pressure_max >
    thresholds
      .pressure_building
      .pressure_min
  ) {
    return false;
  }

  return true;
}

export function isValidImpulsePolicy(
  policy:
    ImpulseResolvedPolicy,
): boolean {
  if (
    policy === null ||
    typeof policy !== "object"
  ) {
    return false;
  }

  if (
    !isNonEmptyString(
      policy.policy_id,
    ) ||
    !isNonEmptyString(
      policy.policy_version,
    ) ||
    !isValidPolicySource(
      policy.source,
    )
  ) {
    return false;
  }

  if (
    !isValidPolicySampleSize(
      policy.sample_size,
    )
  ) {
    return false;
  }

  if (
    policy.state_sample_size !==
      null &&
    !isValidStateSampleSize(
      policy.state_sample_size,
    )
  ) {
    return false;
  }

  if (
    !Array.isArray(
      policy.warnings,
    )
  ) {
    return false;
  }

  return isValidImpulseThresholds(
    policy.thresholds,
  );
}

/* ============================================================================
 * 6. CANONICAL INPUT READERS
 * ----------------------------------------------------------------------------
 * These functions validate domains without clamping or reconstructing values.
 * ========================================================================== */

function readScore(
  value: number | null,
): number | null {
  if (
    !isScoreDomainValue(value)
  ) {
    return null;
  }

  return roundToTwoDecimals(
    value,
  );
}

function readRate(
  value: number | null,
): number | null {
  if (
    !isFiniteNumber(value) ||
    value < RATE_MINIMUM ||
    value > RATE_MAXIMUM
  ) {
    return null;
  }

  return roundToTwoDecimals(
    value,
  );
}

function readObservable(
  value: number | null,
): number | null {
  if (!isFiniteNumber(value)) {
    return null;
  }

  return roundToTwoDecimals(
    value,
  );
}

function readNonNegativeObservable(
  value: number | null,
): number | null {
  if (
    !isFiniteNumber(value) ||
    value < 0
  ) {
    return null;
  }

  return roundToTwoDecimals(
    value,
  );
}

function normalizeTemporalBlock(
  block:
    ImpulseTemporalBlock,
): NormalizedImpulseTemporalBlock | null {
  const changePct =
    readObservable(
      block.change_pct,
    );

  const slopePct =
    readObservable(
      block.slope_pct,
    );

  const stabilityScore =
    readScore(
      block.stability_score,
    );

  const ruptureProbability =
    readScore(
      block.rupture_probability,
    );

  if (
    changePct === null ||
    slopePct === null ||
    stabilityScore === null ||
    ruptureProbability === null
  ) {
    return null;
  }

  return {
    change_pct:
      changePct,

    slope_pct:
      slopePct,

    stability_score:
      stabilityScore,

    rupture_probability:
      ruptureProbability,
  };
}

function normalizeCurrentSignature(
  signature:
    ImpulseSignatureInput,
): NormalizedImpulseSignature | null {
  const slopePct =
    readObservable(
      signature.slope_pct,
    );

  const amplitudePct =
    readNonNegativeObservable(
      signature.amplitude_pct,
    );

  const instabilityScore =
    readScore(
      signature.instability_score,
    );

  const breakRate =
    readRate(
      signature.break_rate,
    );

  if (
    slopePct === null ||
    amplitudePct === null ||
    instabilityScore === null ||
    breakRate === null
  ) {
    return null;
  }

  return {
    slope_pct:
      slopePct,

    amplitude_pct:
      amplitudePct,

    instability_score:
      instabilityScore,

    break_rate:
      breakRate,
  };
}

/* ============================================================================
 * 7. TRIPLE LAYER CONTEXT NORMALIZATION
 * ----------------------------------------------------------------------------
 * Triple Layer data remains contextual.
 *
 * Missing or neutralized Triple Layer data does not block Impulse numerical
 * score computation, but it degrades contextual validation.
 * ========================================================================== */

export function normalizeImpulseTripleLayerContext(
  context:
    ImpulseTripleLayerContext | null,
): Readonly<{
  context:
    NormalizedImpulseTripleLayerContext;

  warnings:
    readonly ImpulseWarning[];
}> {
  if (context === null) {
    return {
      context: {
        available:
          false,

        partial:
          false,

        neutralized:
          false,

        triple_layer_state:
          null,

        growth_score:
          null,

        core_pattern_score:
          null,

        decay_score:
          null,
      },

      warnings: [
        "impulse_missing_triple_layer",
      ],
    };
  }

  const growthScore =
    readScore(
      context.growth_score,
    );

  const corePatternScore =
    readScore(
      context.core_pattern_score,
    );

  const decayScore =
    readScore(
      context.decay_score,
    );

  const neutralized =
    context.growth_status ===
      "neutralized" ||
    context.core_status ===
      "neutralized" ||
    context.decay_status ===
      "neutralized";

  if (neutralized) {
    return {
      context: {
        available:
          false,

        partial:
          false,

        neutralized:
          true,

        triple_layer_state:
          context
            .triple_layer_state,

        growth_score:
          null,

        core_pattern_score:
          null,

        decay_score:
          null,
      },

      warnings: [
        "impulse_neutralized_triple_layer",
      ],
    };
  }

  const completeScores =
    growthScore !== null &&
    corePatternScore !== null &&
    decayScore !== null;

  const completeStatuses =
    context.growth_status ===
      "computed" &&
    context.core_status ===
      "computed" &&
    context.decay_status ===
      "computed";

  if (
    completeScores &&
    completeStatuses
  ) {
    return {
      context: {
        available:
          true,

        partial:
          false,

        neutralized:
          false,

        triple_layer_state:
          context
            .triple_layer_state,

        growth_score:
          growthScore,

        core_pattern_score:
          corePatternScore,

        decay_score:
          decayScore,
      },

      warnings: [],
    };
  }

  const atLeastOneScoreAvailable =
    growthScore !== null ||
    corePatternScore !== null ||
    decayScore !== null;

  return {
    context: {
      available:
        atLeastOneScoreAvailable,

      partial:
        true,

      neutralized:
        false,

      triple_layer_state:
        context
          .triple_layer_state,

      growth_score:
        growthScore,

      core_pattern_score:
        corePatternScore,

      decay_score:
        decayScore,
    },

    warnings: [
      "impulse_partial_triple_layer",
    ],
  };
}

/* ============================================================================
 * 8. INPUT VALIDATION
 * ========================================================================== */

function validateImpulseInput(
  input:
    ImpulseStateInput,
): ImpulseInputValidationResult {
  if (
    !isValidImpulsePolicy(
      input.policy,
    )
  ) {
    return {
      valid:
        false,

      warnings: [
        "impulse_invalid_policy",
        "impulse_unavailable",
      ],
    };
  }

  const warnings:
    ImpulseWarning[] = [];

  const currentSignature =
    normalizeCurrentSignature(
      input.current_signature,
    );

  if (
    currentSignature === null
  ) {
    warnings.push(
      "impulse_invalid_current_signature",
    );
  }

  const occurrenceScore =
    readScore(
      input.occurrence_score,
    );

  const frequencyScore =
    readScore(
      input.frequency_score,
    );

  const convergenceScore =
    readScore(
      input.convergence_score,
    );

  const correlationScore =
    readScore(
      input.correlation_score,
    );

  const durationScore =
    readScore(
      input.duration_score,
    );

  if (
    occurrenceScore === null ||
    frequencyScore === null ||
    convergenceScore === null ||
    correlationScore === null ||
    durationScore === null
  ) {
    warnings.push(
      "impulse_invalid_structural_axes",
    );
  }

  const ruptureProbability =
    readScore(
      input.rupture_probability,
    );

  const rupturePenaltyScore =
    readScore(
      input.rupture_penalty_score,
    );

  const stabilityScore =
    readScore(
      input.stability_score,
    );

  const coherenceScore =
    readScore(
      input.coherence_score,
    );

  if (
    ruptureProbability === null ||
    rupturePenaltyScore === null ||
    stabilityScore === null ||
    coherenceScore === null
  ) {
    warnings.push(
      "impulse_invalid_structural_context",
    );
  }

  const rolling7d =
    normalizeTemporalBlock(
      input.rolling_7d,
    );

  if (rolling7d === null) {
    warnings.push(
      "impulse_invalid_rolling_7d",
    );
  }

  const rolling24h =
    input.rolling_24h ===
      null
      ? null
      : normalizeTemporalBlock(
          input.rolling_24h,
        );

  if (
    input.rolling_24h !== null &&
    rolling24h === null
  ) {
    warnings.push(
      "impulse_invalid_rolling_24h",
    );
  }

  if (
    input.rolling_24h === null
  ) {
    warnings.push(
      "impulse_missing_24h_confirmation",
    );
  }

  const tripleLayer =
    normalizeImpulseTripleLayerContext(
      input.triple_layer,
    );

  warnings.push(
    ...tripleLayer.warnings,
  );

  const requiredInputsValid =
    currentSignature !== null &&
    occurrenceScore !== null &&
    frequencyScore !== null &&
    convergenceScore !== null &&
    correlationScore !== null &&
    durationScore !== null &&
    ruptureProbability !== null &&
    rupturePenaltyScore !== null &&
    stabilityScore !== null &&
    coherenceScore !== null &&
    rolling7d !== null;

  if (!requiredInputsValid) {
    return {
      valid:
        false,

      warnings:
        uniqueWarnings([
          ...warnings,
          "impulse_unavailable",
        ]),
    };
  }

  const partial =
    rolling24h === null ||
    !tripleLayer
      .context
      .available ||
    tripleLayer
      .context
      .partial ||
    tripleLayer
      .context
      .neutralized;

  if (partial) {
    warnings.push(
      "impulse_partial_input",
    );
  }

  return {
    valid:
      true,

    value: {
      current_signature:
        currentSignature,

      occurrence_score:
        occurrenceScore,

      frequency_score:
        frequencyScore,

      convergence_score:
        convergenceScore,

      correlation_score:
        correlationScore,

      duration_score:
        durationScore,

      rupture_probability:
        ruptureProbability,

      rupture_penalty_score:
        rupturePenaltyScore,

      stability_score:
        stabilityScore,

      coherence_score:
        coherenceScore,

      rolling_7d:
        rolling7d,

      rolling_24h:
        rolling24h,

      triple_layer:
        tripleLayer.context,

      policy:
        input.policy,

      status:
        partial
          ? "partial"
          : "computed",

      warnings:
        uniqueWarnings(
          warnings,
        ),
    },
  };
}

/* ============================================================================
 * 9. OBSERVABLE TRANSFORMATIONS
 * ========================================================================== */

function normalizeAbsolutePercentage(
  value: number,
  scale: number,
): number {
  return normalizeComputedScore(
    Math.abs(value) *
      scale,
  );
}

function computeSlopeFlatnessScore(
  slopePct: number,
): number {
  return normalizeComputedScore(
    SCORE_MAXIMUM -
      normalizeAbsolutePercentage(
        slopePct,
        8,
      ),
  );
}

function computeAmplitudeContainmentScore(
  amplitudePct: number,
): number {
  return normalizeComputedScore(
    SCORE_MAXIMUM -
      normalizeAbsolutePercentage(
        amplitudePct,
        4,
      ),
  );
}

function computeTemporalBlend(
  input:
    Readonly<{
      seven_day_value:
        number;

      twenty_four_hour_value:
        number | null;
    }>,
): number {
  if (
    input
      .twenty_four_hour_value ===
    null
  ) {
    return normalizeComputedScore(
      input.seven_day_value,
    );
  }

  return normalizeComputedScore(
    input.seven_day_value *
      SEVEN_DAY_PRIMARY_WEIGHT +
      input.twenty_four_hour_value *
        TWENTY_FOUR_HOUR_CONFIRMATION_WEIGHT,
  );
}

/* ============================================================================
 * 10. DIRECTIONAL BIAS
 * ========================================================================== */

function classifySlopeDirection(
  slopePct: number,
): 1 | -1 | 0 {
  if (
    slopePct >=
    DIRECTIONAL_POSITIVE_SLOPE_MIN_PCT
  ) {
    return 1;
  }

  if (
    slopePct <=
    DIRECTIONAL_NEGATIVE_SLOPE_MAX_PCT
  ) {
    return -1;
  }

  return 0;
}

function resolveDirectionalBias(
  input:
    Readonly<{
      current_signature:
        NormalizedImpulseSignature;

      rolling_7d:
        NormalizedImpulseTemporalBlock;

      rolling_24h:
        NormalizedImpulseTemporalBlock | null;
    }>,
): Exclude<
  ImpulseDirectionalBias,
  "UNAVAILABLE"
> {
  const structuralDirection =
    classifySlopeDirection(
      input
        .current_signature
        .slope_pct,
    );

  const sevenDayDirection =
    classifySlopeDirection(
      input
        .rolling_7d
        .slope_pct,
    );

  const twentyFourHourDirection =
    input.rolling_24h ===
      null
      ? 0
      : classifySlopeDirection(
          input
            .rolling_24h
            .slope_pct,
        );

  if (
    structuralDirection === 1 &&
    sevenDayDirection === 1
  ) {
    return twentyFourHourDirection ===
      -1
      ? "MIXED"
      : "UP";
  }

  if (
    structuralDirection === -1 &&
    sevenDayDirection === -1
  ) {
    return twentyFourHourDirection ===
      1
      ? "MIXED"
      : "DOWN";
  }

  if (
    structuralDirection !== 0 &&
    sevenDayDirection !== 0 &&
    structuralDirection !==
      sevenDayDirection
  ) {
    return "MIXED";
  }

  if (
    twentyFourHourDirection !== 0 &&
    (
      (
        structuralDirection !== 0 &&
        twentyFourHourDirection !==
          structuralDirection
      ) ||
      (
        sevenDayDirection !== 0 &&
        twentyFourHourDirection !==
          sevenDayDirection
      )
    )
  ) {
    return "MIXED";
  }

  return "NEUTRAL";
}

/* ============================================================================
 * 11. IMPULSE SCORE COMPUTATION
 * ----------------------------------------------------------------------------
 * These functions create Impulse-owned analytical truth.
 *
 * Computed values are bounded because the analytical output contract is
 * explicitly [0, 100]. Source values were already validated upstream.
 * ========================================================================== */

export function computeImpulseCompressionScore(
  input:
    Readonly<{
      current_signature:
        NormalizedImpulseSignature;

      occurrence_score:
        number;

      convergence_score:
        number;

      correlation_score:
        number;

      duration_score:
        number;
    }>,
): number {
  const flatnessScore =
    computeSlopeFlatnessScore(
      input
        .current_signature
        .slope_pct,
    );

  const amplitudeContainmentScore =
    computeAmplitudeContainmentScore(
      input
        .current_signature
        .amplitude_pct,
    );

  return normalizeComputedScore(
    flatnessScore * 0.24 +
      amplitudeContainmentScore *
        0.2 +
      input.duration_score *
        0.18 +
      input.convergence_score *
        0.16 +
      input.correlation_score *
        0.12 +
      input.occurrence_score *
        0.1,
  );
}

export function computeImpulsePressureScore(
  input:
    Readonly<{
      compression_score:
        number;

      occurrence_score:
        number;

      frequency_score:
        number;

      convergence_score:
        number;

      duration_score:
        number;

      rupture_probability:
        number;

      coherence_score:
        number;
    }>,
): number {
  const incoherencePressure =
    SCORE_MAXIMUM -
    input.coherence_score;

  return normalizeComputedScore(
    input.compression_score *
      0.22 +
      input.occurrence_score *
        0.12 +
      input.frequency_score *
        0.16 +
      input.convergence_score *
        0.16 +
      input.duration_score *
        0.12 +
      input.rupture_probability *
        0.14 +
      incoherencePressure *
        0.08,
  );
}

export function computeImpulseAccelerationScore(
  input:
    Readonly<{
      current_signature:
        NormalizedImpulseSignature;

      rolling_7d:
        NormalizedImpulseTemporalBlock;

      rolling_24h:
        NormalizedImpulseTemporalBlock | null;
    }>,
): number {
  const sevenDayMoveScore =
    normalizeAbsolutePercentage(
      input
        .rolling_7d
        .change_pct,
      5,
    );

  const sevenDaySlopeDivergence =
    normalizeAbsolutePercentage(
      input
        .rolling_7d
        .slope_pct -
        input
          .current_signature
          .slope_pct,
      8,
    );

  const sevenDayAcceleration =
    normalizeComputedScore(
      sevenDayMoveScore *
        0.55 +
        sevenDaySlopeDivergence *
          0.45,
    );

  if (
    input.rolling_24h === null
  ) {
    return sevenDayAcceleration;
  }

  const shortTermMoveScore =
    normalizeAbsolutePercentage(
      input
        .rolling_24h
        .change_pct,
      10,
    );

  const temporalChangeSpread =
    normalizeAbsolutePercentage(
      input
        .rolling_24h
        .change_pct -
        input
          .rolling_7d
          .change_pct,
      12,
    );

  const temporalSlopeSpread =
    normalizeAbsolutePercentage(
      input
        .rolling_24h
        .slope_pct -
        input
          .rolling_7d
          .slope_pct,
      10,
    );

  const twentyFourHourConfirmation =
    normalizeComputedScore(
      shortTermMoveScore *
        0.4 +
        temporalChangeSpread *
          0.32 +
        temporalSlopeSpread *
          0.28,
    );

  return computeTemporalBlend({
    seven_day_value:
      sevenDayAcceleration,

    twenty_four_hour_value:
      twentyFourHourConfirmation,
  });
}

export function computeImpulseAlignmentScore(
  input:
    Readonly<{
      current_signature:
        NormalizedImpulseSignature;

      rolling_7d:
        NormalizedImpulseTemporalBlock;

      rolling_24h:
        NormalizedImpulseTemporalBlock | null;

      convergence_score:
        number;

      correlation_score:
        number;
    }>,
): number {
  const structuralDirection =
    classifySlopeDirection(
      input
        .current_signature
        .slope_pct,
    );

  const sevenDayDirection =
    classifySlopeDirection(
      input
        .rolling_7d
        .slope_pct,
    );

  const primaryDirectionalAgreement =
    structuralDirection !== 0 &&
    structuralDirection ===
      sevenDayDirection
      ? 100
      : structuralDirection === 0 &&
          sevenDayDirection === 0
        ? 50
        : structuralDirection === 0 ||
            sevenDayDirection === 0
          ? 58
          : 25;

  const primaryAlignment =
    normalizeComputedScore(
      primaryDirectionalAgreement *
        0.42 +
        input.convergence_score *
          0.32 +
        input.correlation_score *
          0.26,
    );

  if (
    input.rolling_24h === null
  ) {
    return primaryAlignment;
  }

  const twentyFourHourDirection =
    classifySlopeDirection(
      input
        .rolling_24h
        .slope_pct,
    );

  const confirmationAgreement =
    twentyFourHourDirection === 0
      ? 50
      : (
          twentyFourHourDirection ===
            sevenDayDirection ||
          twentyFourHourDirection ===
            structuralDirection
        )
        ? 85
        : 20;

  return computeTemporalBlend({
    seven_day_value:
      primaryAlignment,

    twenty_four_hour_value:
      confirmationAgreement,
  });
}

export function computeImpulseInstabilityScore(
  input:
    Readonly<{
      current_signature:
        NormalizedImpulseSignature;

      rupture_probability:
        number;

      rolling_7d:
        NormalizedImpulseTemporalBlock;

      rolling_24h:
        NormalizedImpulseTemporalBlock | null;
    }>,
): number {
  const sevenDayTemporalStress =
    normalizeAbsolutePercentage(
      input
        .rolling_7d
        .change_pct,
      6,
    );

  const sevenDayInstability =
    normalizeComputedScore(
      input
        .current_signature
        .instability_score *
        0.28 +
        input
          .current_signature
          .break_rate *
          100 *
          0.22 +
        Math.max(
          input.rupture_probability,
          input
            .rolling_7d
            .rupture_probability,
        ) *
          0.34 +
        sevenDayTemporalStress *
          0.16,
    );

  if (
    input.rolling_24h === null
  ) {
    return sevenDayInstability;
  }

  const shortTermStress =
    normalizeAbsolutePercentage(
      input
        .rolling_24h
        .change_pct,
      8,
    );

  const ruptureProbabilityShift =
    normalizeComputedScore(
      Math.abs(
        input
          .rolling_24h
          .rupture_probability -
          input
            .rolling_7d
            .rupture_probability,
      ),
    );

  const confirmationInstability =
    normalizeComputedScore(
      input
        .rolling_24h
        .rupture_probability *
        0.46 +
        shortTermStress *
          0.34 +
        ruptureProbabilityShift *
          0.2,
    );

  return computeTemporalBlend({
    seven_day_value:
      sevenDayInstability,

    twenty_four_hour_value:
      confirmationInstability,
  });
}

export function computeImpulseSaturationScore(
  input:
    Readonly<{
      impulse_pressure_score:
        number;

      impulse_acceleration_score:
        number;

      rupture_penalty_score:
        number;

      stability_score:
        number;

      coherence_score:
        number;

      current_signature:
        NormalizedImpulseSignature;
    }>,
): number {
  const stabilityDeficit =
    SCORE_MAXIMUM -
    input.stability_score;

  const coherenceDeficit =
    SCORE_MAXIMUM -
    input.coherence_score;

  return normalizeComputedScore(
    input.impulse_pressure_score *
      0.32 +
      input.impulse_acceleration_score *
        0.2 +
      input.rupture_penalty_score *
        0.18 +
      stabilityDeficit *
        0.12 +
      coherenceDeficit *
        0.1 +
      input
        .current_signature
        .instability_score *
        0.08,
  );
}

export function computeImpulseExhaustionScore(
  input:
    Readonly<{
      rolling_7d:
        NormalizedImpulseTemporalBlock;

      rolling_24h:
        NormalizedImpulseTemporalBlock | null;

      impulse_acceleration_score:
        number;

      impulse_saturation_score:
        number;
    }>,
): number {
  const sevenDayMove =
    normalizeAbsolutePercentage(
      input
        .rolling_7d
        .change_pct,
      4,
    );

  const sevenDayFragility =
    SCORE_MAXIMUM -
    input
      .rolling_7d
      .stability_score;

  const sevenDayExhaustion =
    normalizeComputedScore(
      sevenDayMove *
        0.28 +
        input
          .rolling_7d
          .rupture_probability *
          0.28 +
        sevenDayFragility *
          0.2 +
        input.impulse_acceleration_score *
          0.1 +
        input.impulse_saturation_score *
          0.14,
    );

  if (
    input.rolling_24h === null
  ) {
    return sevenDayExhaustion;
  }

  const shortTermMove =
    normalizeAbsolutePercentage(
      input
        .rolling_24h
        .change_pct,
      8,
    );

  const shortTermFragility =
    SCORE_MAXIMUM -
    input
      .rolling_24h
      .stability_score;

  const twentyFourHourConfirmation =
    normalizeComputedScore(
      shortTermMove *
        0.32 +
        input
          .rolling_24h
          .rupture_probability *
          0.3 +
        shortTermFragility *
          0.22 +
        input.impulse_saturation_score *
          0.16,
    );

  return computeTemporalBlend({
    seven_day_value:
      sevenDayExhaustion,

    twenty_four_hour_value:
      twentyFourHourConfirmation,
  });
}

/* ============================================================================
 * 12. CANONICAL TRANSITION RESOLUTION
 * ----------------------------------------------------------------------------
 * Resolution priority:
 * 1. EXHAUSTION
 * 2. RELEASE
 * 3. PRESSURE_BUILDING
 * 4. COMPRESSION
 * 5. explicit NEUTRAL
 * 6. compatibility residual NEUTRAL
 *
 * The final residual branch preserves the current v2 state contract.
 * It must not be interpreted as unavailable because unavailable inputs never
 * reach this resolver.
 *
 * A future UNCLASSIFIED state requires a separate versioned migration.
 * ========================================================================== */

function resolveImpulseTransitionStateDetailed(
  input:
    Readonly<{
      scores:
        ImpulseScoreSet;

      triple_layer:
        NormalizedImpulseTripleLayerContext;

      policy:
        ImpulseResolvedPolicy;
    }>,
): ImpulseTransitionResolution {
  const thresholds =
    input.policy.thresholds;

  const tripleLayerCanValidate =
    input
      .triple_layer
      .available &&
    !input
      .triple_layer
      .neutralized;

  const growthScore =
    tripleLayerCanValidate
      ? input
          .triple_layer
          .growth_score
      : null;

  const corePatternScore =
    tripleLayerCanValidate
      ? input
          .triple_layer
          .core_pattern_score
      : null;

  const decayScore =
    tripleLayerCanValidate
      ? input
          .triple_layer
          .decay_score
      : null;

  const exhaustionMatch =
    input.scores
      .exhaustion_score >=
      thresholds
        .exhaustion
        .exhaustion_min &&
    input.scores
      .instability_score >=
      thresholds
        .exhaustion
        .instability_min &&
    input.scores
      .saturation_score >=
      thresholds
        .exhaustion
        .saturation_min &&
    input.scores
      .acceleration_score >=
      thresholds
        .exhaustion
        .acceleration_min &&
    (
      decayScore === null ||
      decayScore >=
        thresholds
          .exhaustion
          .decay_min
    );

  if (exhaustionMatch) {
    return {
      state:
        "EXHAUSTION",

      matched_explicit_rule:
        true,
    };
  }

  const releaseMatch =
    input.scores
      .pressure_score >=
      thresholds
        .release
        .pressure_min &&
    input.scores
      .instability_score >=
      thresholds
        .release
        .instability_min &&
    input.scores
      .saturation_score >=
      thresholds
        .release
        .saturation_min &&
    input.scores
      .acceleration_score >=
      thresholds
        .release
        .acceleration_min &&
    input.scores
      .alignment_score >=
      thresholds
        .release
        .alignment_min &&
    (
      growthScore === null ||
      growthScore >=
        thresholds
          .release
          .growth_min
    ) &&
    (
      decayScore === null ||
      decayScore <=
        thresholds
          .release
          .decay_max
    );

  if (releaseMatch) {
    return {
      state:
        "RELEASE",

      matched_explicit_rule:
        true,
    };
  }

  const pressureBuildingCore =
    input.scores
      .pressure_score >=
      thresholds
        .pressure_building
        .pressure_min &&
    input.scores
      .saturation_score >=
      thresholds
        .pressure_building
        .saturation_min &&
    input.scores
      .alignment_score >=
      thresholds
        .pressure_building
        .alignment_min;

  const pressureBuildingDynamics =
    input.scores
      .instability_score >=
      thresholds
        .pressure_building
        .instability_min &&
    input.scores
      .acceleration_score >=
      thresholds
        .pressure_building
        .acceleration_min;

  const pressureBuildingTripleLayer =
    growthScore === null ||
    growthScore >=
      thresholds
        .pressure_building
        .growth_min;

  if (
    pressureBuildingCore &&
    pressureBuildingDynamics &&
    pressureBuildingTripleLayer
  ) {
    return {
      state:
        "PRESSURE_BUILDING",

      matched_explicit_rule:
        true,
    };
  }

  const compressionMatch =
    input.scores
      .pressure_score >=
      thresholds
        .compression
        .pressure_min &&
    input.scores
      .instability_score <=
      thresholds
        .compression
        .instability_max &&
    input.scores
      .exhaustion_score <=
      thresholds
        .compression
        .exhaustion_max &&
    input.scores
      .alignment_score >=
      thresholds
        .compression
        .alignment_min &&
    (
      corePatternScore === null ||
      corePatternScore >=
        thresholds
          .compression
          .core_pattern_min
    );

  if (compressionMatch) {
    return {
      state:
        "COMPRESSION",

      matched_explicit_rule:
        true,
    };
  }

  const neutralMatch =
    input.scores
      .pressure_score <=
      thresholds
        .neutral
        .pressure_max &&
    input.scores
      .instability_score <=
      thresholds
        .neutral
        .instability_max &&
    input.scores
      .saturation_score <=
      thresholds
        .neutral
        .saturation_max &&
    input.scores
      .exhaustion_score <=
      thresholds
        .neutral
        .exhaustion_max;

  if (neutralMatch) {
    return {
      state:
        "NEUTRAL",

      matched_explicit_rule:
        true,
    };
  }

  return {
    state:
      "NEUTRAL",

    matched_explicit_rule:
      false,
  };
}

export function resolveImpulseTransitionState(
  input:
    Readonly<{
      scores:
        ImpulseScoreSet;

      triple_layer:
        NormalizedImpulseTripleLayerContext;

      policy:
        ImpulseResolvedPolicy;
    }>,
): CalibratableImpulseTransitionState {
  return resolveImpulseTransitionStateDetailed(
    input,
  ).state;
}

/* ============================================================================
 * 13. RESULT FACTORIES
 * ========================================================================== */

function buildUnavailableResult(
  input:
    Readonly<{
      policy:
        ImpulseResolvedPolicy | null;

      warnings:
        readonly ImpulseWarning[];
    }>,
): ImpulseStateResult {
  return Object.freeze({
    impulse_status:
      "unavailable",

    impulse_compression_score:
      null,

    impulse_pressure_score:
      null,

    impulse_acceleration_score:
      null,

    impulse_alignment_score:
      null,

    impulse_instability_score:
      null,

    impulse_saturation_score:
      null,

    impulse_exhaustion_score:
      null,

    impulse_directional_bias:
      "UNAVAILABLE",

    impulse_transition_state:
      "UNAVAILABLE",

    impulse_policy_id:
      input.policy
        ?.policy_id ??
      null,

    impulse_policy_version:
      input.policy
        ?.policy_version ??
      null,

    impulse_policy_source:
      input.policy
        ?.source ??
      null,

    impulse_policy_sample_size:
      input.policy
        ?.sample_size ??
      null,

    policy_warnings:
      Object.freeze(
        input.policy === null
          ? []
          : copyPolicyWarnings(
              input
                .policy
                .warnings,
            ),
      ),

    warnings:
      Object.freeze(
        uniqueWarnings([
          ...input.warnings,
          "impulse_unavailable",
        ]),
      ),
  });
}

function buildComputedResult(
  input:
    Readonly<{
      validated_input:
        ValidatedImpulseInput;

      scores:
        ImpulseScoreSet;

      directional_bias:
        Exclude<
          ImpulseDirectionalBias,
          "UNAVAILABLE"
        >;

      transition_resolution:
        ImpulseTransitionResolution;
    }>,
): ImpulseStateResult {
  const warnings =
    input
      .transition_resolution
      .matched_explicit_rule
      ? [
          ...input
            .validated_input
            .warnings,
        ]
      : uniqueWarnings([
          ...input
            .validated_input
            .warnings,

          "impulse_residual_neutral_classification",
        ]);

  return Object.freeze({
    impulse_status:
      input
        .validated_input
        .status,

    impulse_compression_score:
      roundToTwoDecimals(
        input
          .scores
          .compression_score,
      ),

    impulse_pressure_score:
      roundToTwoDecimals(
        input
          .scores
          .pressure_score,
      ),

    impulse_acceleration_score:
      roundToTwoDecimals(
        input
          .scores
          .acceleration_score,
      ),

    impulse_alignment_score:
      roundToTwoDecimals(
        input
          .scores
          .alignment_score,
      ),

    impulse_instability_score:
      roundToTwoDecimals(
        input
          .scores
          .instability_score,
      ),

    impulse_saturation_score:
      roundToTwoDecimals(
        input
          .scores
          .saturation_score,
      ),

    impulse_exhaustion_score:
      roundToTwoDecimals(
        input
          .scores
          .exhaustion_score,
      ),

    impulse_directional_bias:
      input.directional_bias,

    impulse_transition_state:
      input
        .transition_resolution
        .state,

    impulse_policy_id:
      input
        .validated_input
        .policy
        .policy_id,

    impulse_policy_version:
      input
        .validated_input
        .policy
        .policy_version,

    impulse_policy_source:
      input
        .validated_input
        .policy
        .source,

    impulse_policy_sample_size:
      input
        .validated_input
        .policy
        .sample_size,

    policy_warnings:
      Object.freeze(
        copyPolicyWarnings(
          input
            .validated_input
            .policy
            .warnings,
        ),
      ),

    warnings:
      Object.freeze(
        uniqueWarnings(
          warnings,
        ),
      ),
  });
}

/* ============================================================================
 * 14. PURE CANONICAL EXECUTION
 * ========================================================================== */

export function computeImpulseState(
  input:
    ImpulseStateInput,
): ImpulseStateResult {
  const validation =
    validateImpulseInput(
      input,
    );

  if (!validation.valid) {
    return buildUnavailableResult({
      policy:
        isValidImpulsePolicy(
          input.policy,
        )
          ? input.policy
          : null,

      warnings:
        validation.warnings,
    });
  }

  const validated =
    validation.value;

  const compressionScore =
    computeImpulseCompressionScore({
      current_signature:
        validated
          .current_signature,

      occurrence_score:
        validated
          .occurrence_score,

      convergence_score:
        validated
          .convergence_score,

      correlation_score:
        validated
          .correlation_score,

      duration_score:
        validated
          .duration_score,
    });

  const pressureScore =
    computeImpulsePressureScore({
      compression_score:
        compressionScore,

      occurrence_score:
        validated
          .occurrence_score,

      frequency_score:
        validated
          .frequency_score,

      convergence_score:
        validated
          .convergence_score,

      duration_score:
        validated
          .duration_score,

      rupture_probability:
        validated
          .rupture_probability,

      coherence_score:
        validated
          .coherence_score,
    });

  const accelerationScore =
    computeImpulseAccelerationScore({
      current_signature:
        validated
          .current_signature,

      rolling_7d:
        validated
          .rolling_7d,

      rolling_24h:
        validated
          .rolling_24h,
    });

  const alignmentScore =
    computeImpulseAlignmentScore({
      current_signature:
        validated
          .current_signature,

      rolling_7d:
        validated
          .rolling_7d,

      rolling_24h:
        validated
          .rolling_24h,

      convergence_score:
        validated
          .convergence_score,

      correlation_score:
        validated
          .correlation_score,
    });

  const instabilityScore =
    computeImpulseInstabilityScore({
      current_signature:
        validated
          .current_signature,

      rupture_probability:
        validated
          .rupture_probability,

      rolling_7d:
        validated
          .rolling_7d,

      rolling_24h:
        validated
          .rolling_24h,
    });

  const saturationScore =
    computeImpulseSaturationScore({
      impulse_pressure_score:
        pressureScore,

      impulse_acceleration_score:
        accelerationScore,

      rupture_penalty_score:
        validated
          .rupture_penalty_score,

      stability_score:
        validated
          .stability_score,

      coherence_score:
        validated
          .coherence_score,

      current_signature:
        validated
          .current_signature,
    });

  const exhaustionScore =
    computeImpulseExhaustionScore({
      rolling_7d:
        validated
          .rolling_7d,

      rolling_24h:
        validated
          .rolling_24h,

      impulse_acceleration_score:
        accelerationScore,

      impulse_saturation_score:
        saturationScore,
    });

  const scores:
    ImpulseScoreSet = {
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
  };

  const directionalBias =
    resolveDirectionalBias({
      current_signature:
        validated
          .current_signature,

      rolling_7d:
        validated
          .rolling_7d,

      rolling_24h:
        validated
          .rolling_24h,
    });

  const transitionResolution =
    resolveImpulseTransitionStateDetailed({
      scores,

      triple_layer:
        validated
          .triple_layer,

      policy:
        validated
          .policy,
    });

  return buildComputedResult({
    validated_input:
      validated,

    scores,

    directional_bias:
      directionalBias,

    transition_resolution:
      transitionResolution,
  });
}
