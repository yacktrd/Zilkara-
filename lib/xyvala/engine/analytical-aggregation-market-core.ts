/* ============================================================================

 * FILE: lib/xyvala/engine/analytical-aggregation-market-core.ts

 * ----------------------------------------------------------------------------

 * TITLE

 * - Xyvala canonical Market Analytical Aggregation core

 *

 * ROLE

 * - produce canonical private Analytical Aggregation contexts

 * - compose already-produced upstream analytical truths without recomputation

 * - preserve producer-qualified analytical identities

 * - preserve the complete canonical RFS Structural Transition reading

 * - preserve complete RFS Rupture Evolution evidence authorized at this layer

 * - expose deterministic structural, transition, risk and temporal contexts

 *

 * CLASSIFICATION

 * - PRIVATE

 * - COMPUTE

 * - PURE

 * - DETERMINISTIC

 * - NON-MUTATING

 * - NON-PUBLIC

 * - CANONICAL PRODUCER

 *

 * POSITION IN GOVERNED CHAIN

 * - Acquisition

 * - RFS

 * - Triple Layer

 * - Impulse Layer

 * - Neutralization System

 * - Rupture Evolution System

 * - Crash System

 * - Analytical Aggregation System          <- THIS PRODUCER

 * - MCI

 * - Calibration

 * - Snapshot

 * - Transformer

 * - Ranking

 * - API

 * - Interface

 *

 * IMPORTANT

 * - governance ordering remains owned by governance-layer-order.ts

 * - the analytical runtime does not need to execute every governance branch

 *   independently during the same runtime cycle

 * - this producer consumes only demonstrated upstream canonical truth

 * - this producer never invokes an upstream analytical producer

 *

 * PRODUCER

 * - analytical-aggregation-market-core

 *

 * CONTRACT EVOLUTION

 * - v2 removed market_score

 * - market_score had no demonstrated canonical RFS producer

 * - no existing RFS variable was aliased to replace market_score

 *

 * - v3 replaces the legacy string structural_transition transport with the

 *   canonical RfsStructuralTransitionReading produced by RFS v3

 * - v3 transports RFS rupture persistence and deceleration without downstream

 *   reconstruction

 * - v3 changes contract / transport only

 * - analytical formulas remain analytical-aggregation-market-v2

 *

 * OUTPUT TRUTHS

 * - structural_context

 * - transition_context

 * - risk_context

 * - temporal_context

 *

 * ANALYTICAL PRINCIPLE

 * - aggregation means contextual composition

 * - aggregation does NOT mean score recomputation

 * - aggregation does NOT mean probability recomputation

 * - aggregation does NOT mean transition reconstruction

 * - aggregation does NOT mean risk reconstruction

 *

 * INPUT OWNERSHIP

 * - RFS owns:

 *   - stability_score

 *   - structure_score

 *   - coherence_score

 *   - occurrence_score

 *   - frequency_score

 *   - convergence_score

 *   - duration_score

 *   - evolution_score

 *   - rfs_growth_score

 *   - regime

 *   - rupture_score

 *   - rupture_probability

 *   - rupture_penalty_score

 *   - rupture_occurrence_score

 *   - rupture_frequency_score

 *   - rupture_convergence_score

 *   - rupture_duration_score

 *   - rupture_evolution_score

 *   - rupture_evolution_state

 *   - rupture_acceleration_score

 *   - rupture_persistence_score

 *   - rupture_deceleration_score

 *   - continuity_probability

 *   - structural_transition

 *

 * - Triple Layer owns:

 *   - triple_layer_state

 *   - triple_layer_growth_score

 *   - triple_layer_core_pattern_score

 *   - triple_layer_decay_score

 *

 * - Impulse Layer owns:

 *   - impulse_compression_score

 *   - impulse_pressure_score

 *   - impulse_acceleration_score

 *   - impulse_alignment_score

 *   - impulse_instability_score

 *   - impulse_saturation_score

 *   - impulse_exhaustion_score

 *   - impulse_directional_bias

 *   - impulse_transition_state

 *   - impulse_status

 *

 * - Crash System owns:

 *   - crash_score

 *   - crash_state

 *

 * - Acquisition owns:

 *   - chg_24h_pct

 *   - chg_7d_pct

 *

 * CONTEXT OWNERSHIP

 * - Analytical Aggregation owns:

 *   - structural_context

 *   - transition_context

 *   - risk_context

 *   - temporal_context

 *

 * STRUCTURAL TRANSITION CONTRACT

 * - RFS owns the Structural Transition analytical reading

 * - Aggregation receives exactly the already-produced reading

 * - Aggregation never derives a transition kind, state, evolution or score

 * - Aggregation never maps Pattern into Structural Transition

 * - Aggregation never maps RFS growth into Structural Transition growth

 * - UNKNOWN remains an unavailable classification

 * - NONE remains a valid computed conclusion of no active transition

 * - source_anchor_timestamp remains RFS market-data time

 * - lifecycle timestamps never enter this producer

 * - canonical RFS validation semantics are consumed from

 *   rfs/validation/rfs-score-contract-validator.ts

 * - AAS never maintains a competing RFS Structural Transition validator

 *

 * STRUCTURAL CONTEXT

 * - preserves RFS structural truth

 * - preserves mandatory structural axes

 * - preserves canonical Structural Transition

 * - does not infer a new regime

 * - does not infer a new structural score

 *

 * TRANSITION CONTEXT

 * - combines already-produced:

 *   - RFS Structural Transition

 *   - Triple Layer composition

 *   - Impulse kinetics

 * - does not modify any upstream truth

 * - does not derive a replacement transition

 *

 * RISK CONTEXT

 * - combines already-produced:

 *   - RFS rupture truth

 *   - complete authorized RFS rupture evolution

 *   - Crash System truth

 *   - relevant Impulse risk evidence

 * - does NOT consume MCI-owned neutralization

 * - does NOT calculate a new risk score

 *

 * TEMPORAL CONTEXT

 * - preserves GLOBAL RFS structural state

 * - preserves 7D observable change

 * - preserves 24H observable change

 * - does not reconstruct structural truth from short horizons

 *

 * DIRECTIVES

 * - COMPUTE only

 * - no mutation

 * - no persistence

 * - no local clock access

 * - no timestamp generation

 * - no RFS recomputation

 * - no Structural Transition reconstruction

 * - no Triple Layer recomputation

 * - no Impulse recomputation

 * - no Crash recomputation

 * - no MCI computation

 * - no Neutralization computation

 * - no Calibration computation

 * - no Snapshot computation

 * - no Transformer computation

 * - no Ranking computation

 * - no API logic

 * - no UI logic

 * - no score weighting

 * - no probability weighting

 * - no threshold selection

 * - no policy selection

 * - no score clamping

 * - no numerical rounding

 * - no string-to-number coercion

 * - no unavailable-to-zero conversion

 * - no unavailable-to-neutral conversion

 * - no UNKNOWN-to-NEUTRAL conversion

 * - no canonical-to-legacy fallback

 * - no legacy-to-canonical fallback

 * - no cross-producer fallback

 * - no cross-layer analytical alias

 * - no synthetic analytical truth

 * - no public projection

 *

 * AVAILABILITY POLICY

 * - null means explicit analytical unavailability

 * - UNAVAILABLE remains UNAVAILABLE

 * - UNKNOWN remains UNKNOWN

 * - NONE remains a valid produced conclusion

 * - zero remains a valid score

 * - negative temporal change remains valid

 * - Structural Transition object existence does not imply usable transition

 * - context status describes evidence completeness only

 * - context status never changes upstream analytical meaning

 *

 * CRASH AVAILABILITY

 * - crash_state === UNKNOWN

 *   => crash_score must be null

 *

 * - crash_state === NONE | RISING | CRASH

 *   => crash_score must be a valid produced score

 *

 * - null + UNKNOWN represents unavailable Crash truth

 * - null + NONE is forbidden

 *

 * CONTEXT STATUS

 * - computed

 *   => all primary evidence required by that context is available

 *

 * - partial

 *   => legitimate evidence exists but required evidence is incomplete

 *

 * - unavailable

 *   => no legitimate evidence is available for that context

 *

 * - invalid

 *   => producer input violates the canonical contract

 *

 * IMPORTANT

 * - context status is transport / completeness metadata

 * - it is NOT market truth

 * - it is NOT a market prediction

 * - it is NOT an analytical score

 * - it never replaces an upstream producer status

 *

 * FIRST DIVERGENCE

 * - malformed aggregation input

 *   => analytical_aggregation_input_invalid

 *

 * - undefined inside canonical input

 *   => analytical_aggregation_input_undefined_forbidden

 *

 * - invalid RFS field

 *   => analytical_aggregation_rfs_input_invalid

 *

 * - malformed Structural Transition transport

 *   => analytical_aggregation_rfs_input_invalid

 *

 * - invalid Triple Layer field

 *   => analytical_aggregation_triple_layer_input_invalid

 *

 * - invalid Impulse field

 *   => analytical_aggregation_impulse_input_invalid

 *

 * - invalid Crash field

 *   => analytical_aggregation_crash_input_invalid

 *

 * - invalid temporal field

 *   => analytical_aggregation_temporal_input_invalid

 *

 * SENSITIVE ZONES

 * - producer-qualified variable identities

 * - RFS / Triple Layer Growth separation

 * - RFS Structural Transition identity

 * - Structural Transition availability semantics

 * - RFS Rupture Evolution completeness

 * - Impulse availability semantics

 * - Crash truth propagation

 * - MCI forward-dependency prevention

 * - context completeness semantics

 * ========================================================================== */

import type {

  RfsRuptureEvolutionState,

  RfsStructuralTransitionReading,

} from "@/lib/xyvala/rfs/contracts/rfs-score-contract";

import {

  isNullableRfsStructuralTransitionReading,

  isRfsRuptureEvolutionState,

  isRfsStructuralTransitionReading as isRfsStructuralTransitionReadingTransport,

} from "@/lib/xyvala/rfs/validation/rfs-score-contract-validator";

/* ============================================================================

 * 1. PRODUCER IDENTITY

 * ========================================================================== */

export const ANALYTICAL_AGGREGATION_MARKET_CORE_NAME =

  "analytical-aggregation-market-core" as const;

export const ANALYTICAL_AGGREGATION_MARKET_CORE_VERSION =

  "3.0.0" as const;

export const ANALYTICAL_AGGREGATION_MARKET_ANALYTICAL_VERSION =

  "analytical-aggregation-market-v2" as const;

/* ============================================================================

 * 2. COMMON TYPES

 * ========================================================================== */

export type AnalyticalAggregationContextStatus =

  | "computed"

  | "partial"

  | "unavailable"

  | "invalid";

export type AnalyticalAggregationStatus =

  | "computed"

  | "partial"

  | "unavailable"

  | "invalid";

export type AnalyticalAggregationRfsRegime =

  | "STABLE"

  | "TRANSITION"

  | "VOLATILE";

export type AnalyticalAggregationTripleLayerState =

  | "GROWTH_DOMINANT"

  | "CORE_DOMINANT"

  | "DECAY_DOMINANT"

  | "MIXED"

  | "UNKNOWN";

export type AnalyticalAggregationImpulseDirectionalBias =

  | "UP"

  | "DOWN"

  | "MIXED"

  | "NEUTRAL"

  | "UNAVAILABLE";

export type AnalyticalAggregationImpulseTransitionState =

  | "COMPRESSION"

  | "PRESSURE_BUILDING"

  | "RELEASE"

  | "EXHAUSTION"

  | "NEUTRAL"

  | "UNAVAILABLE";

export type AnalyticalAggregationImpulseStatus =

  | "computed"

  | "partial"

  | "unavailable";

export type AnalyticalAggregationCrashState =

  | "NONE"

  | "RISING"

  | "CRASH"

  | "UNKNOWN";

/* ============================================================================

 * 3. CANONICAL INPUT CONTRACTS

 * ----------------------------------------------------------------------------

 * These are aggregation-boundary inputs.

 *

 * Every value must have already been produced by its canonical upstream layer.

 * This core never derives one input field from another.

 * ========================================================================== */

export type AnalyticalAggregationRfsInput =

  Readonly<{

    stability_score:

      number | null;

    structure_score:

      number | null;

    coherence_score:

      number | null;

    occurrence_score:

      number | null;

    frequency_score:

      number | null;

    convergence_score:

      number | null;

    duration_score:

      number | null;

    evolution_score:

      number | null;

    rfs_growth_score:

      number | null;

    regime:

      AnalyticalAggregationRfsRegime | null;

    rupture_score:

      number | null;

    rupture_probability:

      number | null;

    rupture_penalty_score:

      number | null;

    rupture_occurrence_score:

      number | null;

    rupture_frequency_score:

      number | null;

    rupture_convergence_score:

      number | null;

    rupture_duration_score:

      number | null;

    rupture_evolution_score:

      number | null;

    structural_transition:

      RfsStructuralTransitionReading;

    rupture_evolution_state:

      RfsRuptureEvolutionState;

    rupture_acceleration_score:

      number | null;

    rupture_persistence_score:

      number | null;

    rupture_deceleration_score:

      number | null;

    continuity_probability:

      number | null;

  }>;

export type AnalyticalAggregationTripleLayerInput =

  Readonly<{

    triple_layer_state:

      AnalyticalAggregationTripleLayerState;

    triple_layer_growth_score:

      number | null;

    triple_layer_core_pattern_score:

      number | null;

    triple_layer_decay_score:

      number | null;

  }>;

export type AnalyticalAggregationImpulseInput =

  Readonly<{

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

      AnalyticalAggregationImpulseDirectionalBias;

    impulse_transition_state:

      AnalyticalAggregationImpulseTransitionState;

    impulse_status:

      AnalyticalAggregationImpulseStatus;

  }>;

export type AnalyticalAggregationCrashInput =

  Readonly<{

    crash_score:

      number | null;

    crash_state:

      AnalyticalAggregationCrashState;

  }>;

export type AnalyticalAggregationTemporalInput =

  Readonly<{

    chg_24h_pct:

      number | null;

    chg_7d_pct:

      number | null;

  }>;

export type AnalyticalAggregationMarketInput =

  Readonly<{

    rfs:

      AnalyticalAggregationRfsInput;

    triple_layer:

      AnalyticalAggregationTripleLayerInput;

    impulse:

      AnalyticalAggregationImpulseInput;

    crash:

      AnalyticalAggregationCrashInput;

    temporal:

      AnalyticalAggregationTemporalInput;

  }>;

/* ============================================================================

 * 4. CANONICAL OUTPUT CONTEXTS

 * ----------------------------------------------------------------------------

 * structural_transition is nullable in output contexts only because the

 * deterministic whole-producer invalid sentinel must not fabricate RFS truth.

 *

 * Every valid producer result preserves the canonical RFS reading.

 * ========================================================================== */

export type AnalyticalAggregationStructuralContext =

  Readonly<{

    status:

      AnalyticalAggregationContextStatus;

    stability_score:

      number | null;

    structure_score:

      number | null;

    coherence_score:

      number | null;

    occurrence_score:

      number | null;

    frequency_score:

      number | null;

    convergence_score:

      number | null;

    duration_score:

      number | null;

    evolution_score:

      number | null;

    rfs_growth_score:

      number | null;

    regime:

      AnalyticalAggregationRfsRegime | null;

    rupture_score:

      number | null;

    rupture_probability:

      number | null;

    continuity_probability:

      number | null;

    structural_transition:

      RfsStructuralTransitionReading | null;

  }>;

export type AnalyticalAggregationTransitionContext =

  Readonly<{

    status:

      AnalyticalAggregationContextStatus;

    structural_transition:

      RfsStructuralTransitionReading | null;

    triple_layer_state:

      AnalyticalAggregationTripleLayerState;

    triple_layer_growth_score:

      number | null;

    triple_layer_core_pattern_score:

      number | null;

    triple_layer_decay_score:

      number | null;

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

      AnalyticalAggregationImpulseDirectionalBias;

    impulse_transition_state:

      AnalyticalAggregationImpulseTransitionState;

    impulse_status:

      AnalyticalAggregationImpulseStatus;

  }>;

export type AnalyticalAggregationRiskContext =

  Readonly<{

    status:

      AnalyticalAggregationContextStatus;

    rupture_score:

      number | null;

    rupture_probability:

      number | null;

    rupture_penalty_score:

      number | null;

    rupture_occurrence_score:

      number | null;

    rupture_frequency_score:

      number | null;

    rupture_convergence_score:

      number | null;

    rupture_duration_score:

      number | null;

    rupture_evolution_score:

      number | null;

    rupture_evolution_state:

      RfsRuptureEvolutionState | null;

    rupture_acceleration_score:

      number | null;

    rupture_persistence_score:

      number | null;

    rupture_deceleration_score:

      number | null;

    continuity_probability:

      number | null;

    crash_score:

      number | null;

    crash_state:

      AnalyticalAggregationCrashState;

    impulse_instability_score:

      number | null;

    impulse_saturation_score:

      number | null;

    impulse_exhaustion_score:

      number | null;

  }>;

export type AnalyticalAggregationTemporalGlobalContext =

  Readonly<{

    regime:

      AnalyticalAggregationRfsRegime | null;

    structural_transition:

      RfsStructuralTransitionReading | null;

    continuity_probability:

      number | null;

  }>;

export type AnalyticalAggregationTemporal7dContext =

  Readonly<{

    chg_7d_pct:

      number | null;

  }>;

export type AnalyticalAggregationTemporal24hContext =

  Readonly<{

    chg_24h_pct:

      number | null;

  }>;

export type AnalyticalAggregationTemporalContext =

  Readonly<{

    status:

      AnalyticalAggregationContextStatus;

    global:

      AnalyticalAggregationTemporalGlobalContext;

    horizon_7d:

      AnalyticalAggregationTemporal7dContext;

    horizon_24h:

      AnalyticalAggregationTemporal24hContext;

  }>;

/* ============================================================================

 * 5. CANONICAL RESULT

 * ========================================================================== */

export type AnalyticalAggregationMarketResult =

  Readonly<{

    producer:

      typeof ANALYTICAL_AGGREGATION_MARKET_CORE_NAME;

    producer_version:

      typeof ANALYTICAL_AGGREGATION_MARKET_CORE_VERSION;

    analytical_version:

      typeof ANALYTICAL_AGGREGATION_MARKET_ANALYTICAL_VERSION;

    aggregation_status:

      AnalyticalAggregationStatus;

    structural_context:

      AnalyticalAggregationStructuralContext;

    transition_context:

      AnalyticalAggregationTransitionContext;

    risk_context:

      AnalyticalAggregationRiskContext;

    temporal_context:

      AnalyticalAggregationTemporalContext;

    warnings:

      readonly string[];

  }>;

/* ============================================================================

 * 6. CONTRACT KEY SETS

 * ========================================================================== */

const ROOT_KEYS =

  Object.freeze([

    "rfs",

    "triple_layer",

    "impulse",

    "crash",

    "temporal",

  ] as const);

const RFS_KEYS =

  Object.freeze([

    "stability_score",

    "structure_score",

    "coherence_score",

    "occurrence_score",

    "frequency_score",

    "convergence_score",

    "duration_score",

    "evolution_score",

    "rfs_growth_score",

    "regime",

    "rupture_score",

    "rupture_probability",

    "rupture_penalty_score",

    "rupture_occurrence_score",

    "rupture_frequency_score",

    "rupture_convergence_score",

    "rupture_duration_score",

    "rupture_evolution_score",

    "structural_transition",

    "rupture_evolution_state",

    "rupture_acceleration_score",

    "rupture_persistence_score",

    "rupture_deceleration_score",

    "continuity_probability",

  ] as const);

const TRIPLE_LAYER_KEYS =

  Object.freeze([

    "triple_layer_state",

    "triple_layer_growth_score",

    "triple_layer_core_pattern_score",

    "triple_layer_decay_score",

  ] as const);

const IMPULSE_KEYS =

  Object.freeze([

    "impulse_compression_score",

    "impulse_pressure_score",

    "impulse_acceleration_score",

    "impulse_alignment_score",

    "impulse_instability_score",

    "impulse_saturation_score",

    "impulse_exhaustion_score",

    "impulse_directional_bias",

    "impulse_transition_state",

    "impulse_status",

  ] as const);

const CRASH_KEYS =

  Object.freeze([

    "crash_score",

    "crash_state",

  ] as const);

const TEMPORAL_KEYS =

  Object.freeze([

    "chg_24h_pct",

    "chg_7d_pct",

  ] as const);

/* ============================================================================

 * 6-BIS. CANONICAL OUTPUT KEY SETS

 * ========================================================================== */

const RESULT_KEYS =

  Object.freeze([

    "producer",

    "producer_version",

    "analytical_version",

    "aggregation_status",

    "structural_context",

    "transition_context",

    "risk_context",

    "temporal_context",

    "warnings",

  ] as const);

const STRUCTURAL_CONTEXT_KEYS =

  Object.freeze([

    "status",

    "stability_score",

    "structure_score",

    "coherence_score",

    "occurrence_score",

    "frequency_score",

    "convergence_score",

    "duration_score",

    "evolution_score",

    "rfs_growth_score",

    "regime",

    "rupture_score",

    "rupture_probability",

    "continuity_probability",

    "structural_transition",

  ] as const);

const TRANSITION_CONTEXT_KEYS =

  Object.freeze([

    "status",

    "structural_transition",

    "triple_layer_state",

    "triple_layer_growth_score",

    "triple_layer_core_pattern_score",

    "triple_layer_decay_score",

    "impulse_compression_score",

    "impulse_pressure_score",

    "impulse_acceleration_score",

    "impulse_alignment_score",

    "impulse_instability_score",

    "impulse_saturation_score",

    "impulse_exhaustion_score",

    "impulse_directional_bias",

    "impulse_transition_state",

    "impulse_status",

  ] as const);

const RISK_CONTEXT_KEYS =

  Object.freeze([

    "status",

    "rupture_score",

    "rupture_probability",

    "rupture_penalty_score",

    "rupture_occurrence_score",

    "rupture_frequency_score",

    "rupture_convergence_score",

    "rupture_duration_score",

    "rupture_evolution_score",

    "rupture_evolution_state",

    "rupture_acceleration_score",

    "rupture_persistence_score",

    "rupture_deceleration_score",

    "continuity_probability",

    "crash_score",

    "crash_state",

    "impulse_instability_score",

    "impulse_saturation_score",

    "impulse_exhaustion_score",

  ] as const);

const TEMPORAL_CONTEXT_KEYS =

  Object.freeze([

    "status",

    "global",

    "horizon_7d",

    "horizon_24h",

  ] as const);

const TEMPORAL_GLOBAL_CONTEXT_KEYS =

  Object.freeze([

    "regime",

    "structural_transition",

    "continuity_probability",

  ] as const);

const TEMPORAL_7D_CONTEXT_KEYS =

  Object.freeze([

    "chg_7d_pct",

  ] as const);

const TEMPORAL_24H_CONTEXT_KEYS =

  Object.freeze([

    "chg_24h_pct",

  ] as const);

/* ============================================================================

 * 7. SAFE PRIMITIVE HELPERS

 * ========================================================================== */

function isPlainObject(

  value:

    unknown,

): value is Record<string, unknown> {

  return (

    typeof value ===

      "object" &&

    value !==

      null &&

    !Array.isArray(

      value,

    )

  );

}

function hasExactKeys(

  value:

    Record<string, unknown>,

  expectedKeys:

    readonly string[],

): boolean {

  const actualKeys =

    Object.keys(

      value,

    ).sort();

  const expected =

    [

      ...expectedKeys,

    ].sort();

  if (

    actualKeys.length !==

      expected.length

  ) {

    return false;

  }

  for (

    let index = 0;

    index <

      expected.length;

    index += 1

  ) {

    if (

      actualKeys[index] !==

      expected[index]

    ) {

      return false;

    }

  }

  return true;

}

function containsUndefinedDeep(

  value:

    unknown,

): boolean {

  if (

    value ===

      undefined

  ) {

    return true;

  }

  if (

    Array.isArray(

      value,

    )

  ) {

    return value.some(

      containsUndefinedDeep,

    );

  }

  if (

    !isPlainObject(

      value,

    )

  ) {

    return false;

  }

  return Object

    .values(

      value,

    )

    .some(

      containsUndefinedDeep,

    );

}

function isScore(

  value:

    unknown,

): value is number {

  return (

    typeof value ===

      "number" &&

    Number.isFinite(

      value,

    ) &&

    value >=

      0 &&

    value <=

      100

  );

}

function isNullableScore(

  value:

    unknown,

): value is number | null {

  return (

    value ===

      null ||

    isScore(

      value,

    )

  );

}

function isNullableFiniteNumber(

  value:

    unknown,

): value is number | null {

  return (

    value ===

      null ||

    (

      typeof value ===

        "number" &&

      Number.isFinite(

        value,

      )

    )

  );

}

function compareDeterministicStrings(

  left:

    string,

  right:

    string,

): number {

  if (

    left <

      right

  ) {

    return -1;

  }

  if (

    left >

      right

  ) {

    return 1;

  }

  return 0;

}

function uniqueWarnings(

  values:

    readonly string[],

): readonly string[] {

  return Object.freeze(

    [

      ...new Set(

        values

          .map(

            (value) =>

              value.trim(),

          )

          .filter(

            (value) =>

              value.length >

              0,

          ),

      ),

    ].sort(

      compareDeterministicStrings,

    ),

  );

}

/* ============================================================================

 * 8. ENUM / UPSTREAM CONTRACT VALIDATORS

 * ========================================================================== */

function isRfsRegime(

  value:

    unknown,

): value is AnalyticalAggregationRfsRegime | null {

  return (

    value ===

      null ||

    value ===

      "STABLE" ||

    value ===

      "TRANSITION" ||

    value ===

      "VOLATILE"

  );

}

function isTripleLayerState(

  value:

    unknown,

): value is AnalyticalAggregationTripleLayerState {

  return (

    value ===

      "GROWTH_DOMINANT" ||

    value ===

      "CORE_DOMINANT" ||

    value ===

      "DECAY_DOMINANT" ||

    value ===

      "MIXED" ||

    value ===

      "UNKNOWN"

  );

}

function isImpulseDirectionalBias(

  value:

    unknown,

): value is AnalyticalAggregationImpulseDirectionalBias {

  return (

    value ===

      "UP" ||

    value ===

      "DOWN" ||

    value ===

      "MIXED" ||

    value ===

      "NEUTRAL" ||

    value ===

      "UNAVAILABLE"

  );

}

function isImpulseTransitionState(

  value:

    unknown,

): value is AnalyticalAggregationImpulseTransitionState {

  return (

    value ===

      "COMPRESSION" ||

    value ===

      "PRESSURE_BUILDING" ||

    value ===

      "RELEASE" ||

    value ===

      "EXHAUSTION" ||

    value ===

      "NEUTRAL" ||

    value ===

      "UNAVAILABLE"

  );

}

function isImpulseStatus(

  value:

    unknown,

): value is AnalyticalAggregationImpulseStatus {

  return (

    value ===

      "computed" ||

    value ===

      "partial" ||

    value ===

      "unavailable"

  );

}

function isCrashState(

  value:

    unknown,

): value is AnalyticalAggregationCrashState {

  return (

    value ===

      "NONE" ||

    value ===

      "RISING" ||

    value ===

      "CRASH" ||

    value ===

      "UNKNOWN"

  );

}

/* ============================================================================

 * 8-BIS. CANONICAL RFS VALIDATION AUTHORITY

 * ----------------------------------------------------------------------------

 * Structural Transition and Rupture Evolution validation are imported from:

 * - lib/xyvala/rfs/validation/rfs-score-contract-validator.ts

 *

 * AAS consumes those RFS-owned validation semantics.

 * It does not maintain a parallel Structural Transition or Rupture Evolution

 * validator and does not become an RFS validation authority.

 * ========================================================================== */

/* ============================================================================

 * 9. INPUT SECTION VALIDATORS

 * ========================================================================== */

function isRfsInput(

  value:

    unknown,

): value is AnalyticalAggregationRfsInput {

  if (

    !isPlainObject(

      value,

    ) ||

    !hasExactKeys(

      value,

      RFS_KEYS,

    )

  ) {

    return false;

  }

  const scores = [

    value.stability_score,

    value.structure_score,

    value.coherence_score,

    value.occurrence_score,

    value.frequency_score,

    value.convergence_score,

    value.duration_score,

    value.evolution_score,

    value.rfs_growth_score,

    value.rupture_score,

    value.rupture_probability,

    value.rupture_penalty_score,

    value.rupture_occurrence_score,

    value.rupture_frequency_score,

    value.rupture_convergence_score,

    value.rupture_duration_score,

    value.rupture_evolution_score,

    value.rupture_acceleration_score,

    value.rupture_persistence_score,

    value.rupture_deceleration_score,

    value.continuity_probability,

  ];

  return (

    scores.every(

      isNullableScore,

    ) &&

    isRfsRegime(

      value.regime,

    ) &&

    isRfsStructuralTransitionReadingTransport(

      value.structural_transition,

    ) &&

    isRfsRuptureEvolutionState(

      value.rupture_evolution_state,

    )

  );

}

function isTripleLayerInput(

  value:

    unknown,

): value is AnalyticalAggregationTripleLayerInput {

  if (

    !isPlainObject(

      value,

    ) ||

    !hasExactKeys(

      value,

      TRIPLE_LAYER_KEYS,

    )

  ) {

    return false;

  }

  return (

    isTripleLayerState(

      value.triple_layer_state,

    ) &&

    isNullableScore(

      value.triple_layer_growth_score,

    ) &&

    isNullableScore(

      value.triple_layer_core_pattern_score,

    ) &&

    isNullableScore(

      value.triple_layer_decay_score,

    )

  );

}

function isImpulseInput(

  value:

    unknown,

): value is AnalyticalAggregationImpulseInput {

  if (

    !isPlainObject(

      value,

    ) ||

    !hasExactKeys(

      value,

      IMPULSE_KEYS,

    )

  ) {

    return false;

  }

  const scores = [

    value.impulse_compression_score,

    value.impulse_pressure_score,

    value.impulse_acceleration_score,

    value.impulse_alignment_score,

    value.impulse_instability_score,

    value.impulse_saturation_score,

    value.impulse_exhaustion_score,

  ];

  if (

    !scores.every(

      isNullableScore,

    )

  ) {

    return false;

  }

  if (

    !isImpulseDirectionalBias(

      value.impulse_directional_bias,

    ) ||

    !isImpulseTransitionState(

      value.impulse_transition_state,

    ) ||

    !isImpulseStatus(

      value.impulse_status,

    )

  ) {

    return false;

  }

  if (

    value.impulse_status ===

      "unavailable"

  ) {

    return (

      scores.every(

        (score) =>

          score ===

            null,

      ) &&

      value.impulse_directional_bias ===

        "UNAVAILABLE" &&

      value.impulse_transition_state ===

        "UNAVAILABLE"

    );

  }

  return (

    scores.every(

      isScore,

    ) &&

    value.impulse_directional_bias !==

      "UNAVAILABLE" &&

    value.impulse_transition_state !==

      "UNAVAILABLE"

  );

}

function isCrashInput(

  value:

    unknown,

): value is AnalyticalAggregationCrashInput {

  if (

    !isPlainObject(

      value,

    ) ||

    !hasExactKeys(

      value,

      CRASH_KEYS,

    )

  ) {

    return false;

  }

  const crashScore =

    value.crash_score;

  const crashState =

    value.crash_state;

  if (

    !isNullableScore(

      crashScore,

    ) ||

    !isCrashState(

      crashState,

    )

  ) {

    return false;

  }

  if (

    crashState ===

      "UNKNOWN"

  ) {

    return (

      crashScore ===

        null

    );

  }

  return isScore(

    crashScore,

  );

}

function isTemporalInput(

  value:

    unknown,

): value is AnalyticalAggregationTemporalInput {

  if (

    !isPlainObject(

      value,

    ) ||

    !hasExactKeys(

      value,

      TEMPORAL_KEYS,

    )

  ) {

    return false;

  }

  return (

    isNullableFiniteNumber(

      value.chg_24h_pct,

    ) &&

    isNullableFiniteNumber(

      value.chg_7d_pct,

    )

  );

}

/* ============================================================================

 * 10. CANONICAL INPUT VALIDATOR

 * ========================================================================== */

export function isAnalyticalAggregationMarketInput(

  value:

    unknown,

): value is AnalyticalAggregationMarketInput {

  if (

    !isPlainObject(

      value,

    )

  ) {

    return false;

  }

  if (

    !hasExactKeys(

      value,

      ROOT_KEYS,

    )

  ) {

    return false;

  }

  if (

    containsUndefinedDeep(

      value,

    )

  ) {

    return false;

  }

  return (

    isRfsInput(

      value.rfs,

    ) &&

    isTripleLayerInput(

      value.triple_layer,

    ) &&

    isImpulseInput(

      value.impulse,

    ) &&

    isCrashInput(

      value.crash,

    ) &&

    isTemporalInput(

      value.temporal,

    )

  );

}

/* ============================================================================

 * 11. CONTEXT AVAILABILITY HELPERS

 * ----------------------------------------------------------------------------

 * Completeness only.

 *

 * Structural Transition requires semantic availability validation because

 * object existence alone does not mean that RFS produced a usable transition.

 * ========================================================================== */

function isUnavailableMarker(

  value:

    unknown,

): boolean {

  return (

    value ===

      "UNAVAILABLE" ||

    value ===

      "UNKNOWN" ||

    value ===

      "unavailable" ||

    value ===

      "unknown" ||

    value ===

      "INSUFFICIENT_DATA"

  );

}

function hasUsableStructuralTransition(

  value:

    RfsStructuralTransitionReading,

): boolean {

  if (

    value.structural_transition_status !==

      "computed" &&

    value.structural_transition_status !==

      "partial"

  ) {

    return false;

  }

  return (

    value.structural_transition_kind !==

      "UNKNOWN" &&

    value.structural_transition_state !==

      "UNKNOWN" &&

    value.structural_transition_evolution !==

      "UNKNOWN"

  );

}

function hasUsableContextValue(

  value:

    unknown,

): boolean {

  if (

    value ===

      null ||

    value ===

      undefined

  ) {

    return false;

  }

  if (

    isRfsStructuralTransitionReadingTransport(

      value,

    )

  ) {

    return hasUsableStructuralTransition(

      value,

    );

  }

  if (

    isUnavailableMarker(

      value,

    )

  ) {

    return false;

  }

  if (

    typeof value ===

      "string"

  ) {

    return value.trim().length >

      0;

  }

  return true;

}

function resolveContextStatus(input: {

  required:

    readonly unknown[];

  supporting?:

    readonly unknown[];

}): AnalyticalAggregationContextStatus {

  const supporting =

    input.supporting ??

    [];

  const allEvidence = [

    ...input.required,

    ...supporting,

  ];

  const availableCount =

    allEvidence.filter(

      hasUsableContextValue,

    ).length;

  if (

    availableCount ===

      0

  ) {

    return "unavailable";

  }

  const allRequiredAvailable =

    input.required.every(

      hasUsableContextValue,

    );

  return allRequiredAvailable

    ? "computed"

    : "partial";

}

/* ============================================================================

 * 12. STRUCTURAL CONTEXT

 * ========================================================================== */

function buildStructuralContext(

  input:

    AnalyticalAggregationMarketInput,

): AnalyticalAggregationStructuralContext {

  const rfs =

    input.rfs;

  const status =

    resolveContextStatus({

      required: [

        rfs.stability_score,

        rfs.regime,

        rfs.rupture_score,

        rfs.rupture_probability,

        rfs.continuity_probability,

        rfs.structural_transition,

      ],

      supporting: [

        rfs.structure_score,

        rfs.coherence_score,

        rfs.occurrence_score,

        rfs.frequency_score,

        rfs.convergence_score,

        rfs.duration_score,

        rfs.evolution_score,

        rfs.rfs_growth_score,

      ],

    });

  return Object.freeze({

    status,

    stability_score:

      rfs.stability_score,

    structure_score:

      rfs.structure_score,

    coherence_score:

      rfs.coherence_score,

    occurrence_score:

      rfs.occurrence_score,

    frequency_score:

      rfs.frequency_score,

    convergence_score:

      rfs.convergence_score,

    duration_score:

      rfs.duration_score,

    evolution_score:

      rfs.evolution_score,

    rfs_growth_score:

      rfs.rfs_growth_score,

    regime:

      rfs.regime,

    rupture_score:

      rfs.rupture_score,

    rupture_probability:

      rfs.rupture_probability,

    continuity_probability:

      rfs.continuity_probability,

    structural_transition:

      rfs.structural_transition,

  });

}

/* ============================================================================

 * 13. TRANSITION CONTEXT

 * ========================================================================== */

function buildTransitionContext(

  input:

    AnalyticalAggregationMarketInput,

): AnalyticalAggregationTransitionContext {

  const rfs =

    input.rfs;

  const tripleLayer =

    input.triple_layer;

  const impulse =

    input.impulse;

  const status =

    resolveContextStatus({

      required: [

        rfs.structural_transition,

        tripleLayer

          .triple_layer_state,

        tripleLayer

          .triple_layer_growth_score,

        tripleLayer

          .triple_layer_core_pattern_score,

        tripleLayer

          .triple_layer_decay_score,

        impulse

          .impulse_transition_state,

        impulse

          .impulse_directional_bias,

        impulse

          .impulse_status,

      ],

      supporting: [

        impulse

          .impulse_compression_score,

        impulse

          .impulse_pressure_score,

        impulse

          .impulse_acceleration_score,

        impulse

          .impulse_alignment_score,

        impulse

          .impulse_instability_score,

        impulse

          .impulse_saturation_score,

        impulse

          .impulse_exhaustion_score,

      ],

    });

  return Object.freeze({

    status,

    structural_transition:

      rfs.structural_transition,

    triple_layer_state:

      tripleLayer

        .triple_layer_state,

    triple_layer_growth_score:

      tripleLayer

        .triple_layer_growth_score,

    triple_layer_core_pattern_score:

      tripleLayer

        .triple_layer_core_pattern_score,

    triple_layer_decay_score:

      tripleLayer

        .triple_layer_decay_score,

    impulse_compression_score:

      impulse

        .impulse_compression_score,

    impulse_pressure_score:

      impulse

        .impulse_pressure_score,

    impulse_acceleration_score:

      impulse

        .impulse_acceleration_score,

    impulse_alignment_score:

      impulse

        .impulse_alignment_score,

    impulse_instability_score:

      impulse

        .impulse_instability_score,

    impulse_saturation_score:

      impulse

        .impulse_saturation_score,

    impulse_exhaustion_score:

      impulse

        .impulse_exhaustion_score,

    impulse_directional_bias:

      impulse

        .impulse_directional_bias,

    impulse_transition_state:

      impulse

        .impulse_transition_state,

    impulse_status:

      impulse

        .impulse_status,

  });

}

/* ============================================================================

 * 14. RISK CONTEXT

 * ----------------------------------------------------------------------------

 * Neutralization remains deliberately absent because its current governed

 * ownership lies downstream under MCI.

 * ========================================================================== */

function buildRiskContext(

  input:

    AnalyticalAggregationMarketInput,

): AnalyticalAggregationRiskContext {

  const rfs =

    input.rfs;

  const crash =

    input.crash;

  const impulse =

    input.impulse;

  const status =

    resolveContextStatus({

      required: [

        rfs.rupture_score,

        rfs.rupture_probability,

        rfs.rupture_evolution_state,

        crash.crash_score,

        crash.crash_state,

      ],

      supporting: [

        rfs.rupture_penalty_score,

        rfs.rupture_occurrence_score,

        rfs.rupture_frequency_score,

        rfs.rupture_convergence_score,

        rfs.rupture_duration_score,

        rfs.rupture_evolution_score,

        rfs.rupture_acceleration_score,

        rfs.rupture_persistence_score,

        rfs.rupture_deceleration_score,

        rfs.continuity_probability,

        impulse

          .impulse_instability_score,

        impulse

          .impulse_saturation_score,

        impulse

          .impulse_exhaustion_score,

      ],

    });

  return Object.freeze({

    status,

    rupture_score:

      rfs.rupture_score,

    rupture_probability:

      rfs.rupture_probability,

    rupture_penalty_score:

      rfs.rupture_penalty_score,

    rupture_occurrence_score:

      rfs.rupture_occurrence_score,

    rupture_frequency_score:

      rfs.rupture_frequency_score,

    rupture_convergence_score:

      rfs.rupture_convergence_score,

    rupture_duration_score:

      rfs.rupture_duration_score,

    rupture_evolution_score:

      rfs.rupture_evolution_score,

    rupture_evolution_state:

      rfs.rupture_evolution_state,

    rupture_acceleration_score:

      rfs.rupture_acceleration_score,

    rupture_persistence_score:

      rfs.rupture_persistence_score,

    rupture_deceleration_score:

      rfs.rupture_deceleration_score,

    continuity_probability:

      rfs.continuity_probability,

    crash_score:

      crash.crash_score,

    crash_state:

      crash.crash_state,

    impulse_instability_score:

      impulse

        .impulse_instability_score,

    impulse_saturation_score:

      impulse

        .impulse_saturation_score,

    impulse_exhaustion_score:

      impulse

        .impulse_exhaustion_score,

  });

}

/* ============================================================================

 * 15. TEMPORAL CONTEXT

 * ========================================================================== */

function buildTemporalContext(

  input:

    AnalyticalAggregationMarketInput,

): AnalyticalAggregationTemporalContext {

  const rfs =

    input.rfs;

  const temporal =

    input.temporal;

  const status =

    resolveContextStatus({

      required: [

        rfs.regime,

        rfs.structural_transition,

        temporal.chg_7d_pct,

        temporal.chg_24h_pct,

      ],

      supporting: [

        rfs.continuity_probability,

      ],

    });

  const global:

    AnalyticalAggregationTemporalGlobalContext =

      Object.freeze({

        regime:

          rfs.regime,

        structural_transition:

          rfs.structural_transition,

        continuity_probability:

          rfs.continuity_probability,

      });

  const horizon7d:

    AnalyticalAggregationTemporal7dContext =

      Object.freeze({

        chg_7d_pct:

          temporal.chg_7d_pct,

      });

  const horizon24h:

    AnalyticalAggregationTemporal24hContext =

      Object.freeze({

        chg_24h_pct:

          temporal.chg_24h_pct,

      });

  return Object.freeze({

    status,

    global,

    horizon_7d:

      horizon7d,

    horizon_24h:

      horizon24h,

  });

}

/* ============================================================================

 * 16. AGGREGATION STATUS

 * ========================================================================== */

function resolveAggregationStatus(

  statuses:

    readonly AnalyticalAggregationContextStatus[],

): AnalyticalAggregationStatus {

  if (

    statuses.some(

      (status) =>

        status ===

          "invalid",

    )

  ) {

    return "invalid";

  }

  if (

    statuses.every(

      (status) =>

        status ===

          "unavailable",

    )

  ) {

    return "unavailable";

  }

  if (

    statuses.every(

      (status) =>

        status ===

          "computed",

    )

  ) {

    return "computed";

  }

  return "partial";

}

/* ============================================================================

 * 17. WARNING BUILD

 * ========================================================================== */

function buildContextWarnings(input: {

  structural:

    AnalyticalAggregationStructuralContext;

  transition:

    AnalyticalAggregationTransitionContext;

  risk:

    AnalyticalAggregationRiskContext;

  temporal:

    AnalyticalAggregationTemporalContext;

  impulse:

    AnalyticalAggregationImpulseInput;

}): readonly string[] {

  const warnings:

    string[] = [];

  const contexts = [

    [

      "structural_context",

      input.structural.status,

    ],

    [

      "transition_context",

      input.transition.status,

    ],

    [

      "risk_context",

      input.risk.status,

    ],

    [

      "temporal_context",

      input.temporal.status,

    ],

  ] as const;

  for (

    const [

      contextName,

      status,

    ] of contexts

  ) {

    if (

      status ===

        "partial"

    ) {

      warnings.push(

        `analytical_aggregation_${contextName}_partial`,

      );

    }

    if (

      status ===

        "unavailable"

    ) {

      warnings.push(

        `analytical_aggregation_${contextName}_unavailable`,

      );

    }

  }

  if (

    input.impulse

      .impulse_status ===

      "unavailable"

  ) {

    warnings.push(

      "analytical_aggregation_impulse_source_unavailable",

    );

  }

  if (

    input.impulse

      .impulse_status ===

      "partial"

  ) {

    warnings.push(

      "analytical_aggregation_impulse_source_partial",

    );

  }

  return uniqueWarnings(

    warnings,

  );

}

/* ============================================================================

 * 18. INVALID RESULT BUILDERS

 * ----------------------------------------------------------------------------

 * Invalid sentinels never fabricate upstream analytical truth.

 * ========================================================================== */

function buildInvalidStructuralContext():

  AnalyticalAggregationStructuralContext {

  return Object.freeze({

    status:

      "invalid",

    stability_score:

      null,

    structure_score:

      null,

    coherence_score:

      null,

    occurrence_score:

      null,

    frequency_score:

      null,

    convergence_score:

      null,

    duration_score:

      null,

    evolution_score:

      null,

    rfs_growth_score:

      null,

    regime:

      null,

    rupture_score:

      null,

    rupture_probability:

      null,

    continuity_probability:

      null,

    structural_transition:

      null,

  });

}

function buildInvalidTransitionContext():

  AnalyticalAggregationTransitionContext {

  return Object.freeze({

    status:

      "invalid",

    structural_transition:

      null,

    triple_layer_state:

      "UNKNOWN",

    triple_layer_growth_score:

      null,

    triple_layer_core_pattern_score:

      null,

    triple_layer_decay_score:

      null,

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

    impulse_status:

      "unavailable",

  });

}

function buildInvalidRiskContext():

  AnalyticalAggregationRiskContext {

  return Object.freeze({

    status:

      "invalid",

    rupture_score:

      null,

    rupture_probability:

      null,

    rupture_penalty_score:

      null,

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

    rupture_evolution_state:

      null,

    rupture_acceleration_score:

      null,

    rupture_persistence_score:

      null,

    rupture_deceleration_score:

      null,

    continuity_probability:

      null,

    crash_score:

      null,

    crash_state:

      "UNKNOWN",

    impulse_instability_score:

      null,

    impulse_saturation_score:

      null,

    impulse_exhaustion_score:

      null,

  });

}

function buildInvalidTemporalContext():

  AnalyticalAggregationTemporalContext {

  return Object.freeze({

    status:

      "invalid",

    global:

      Object.freeze({

        regime:

          null,

        structural_transition:

          null,

        continuity_probability:

          null,

      }),

    horizon_7d:

      Object.freeze({

        chg_7d_pct:

          null,

      }),

    horizon_24h:

      Object.freeze({

        chg_24h_pct:

          null,

      }),

  });

}

function buildInvalidResult(

  warning:

    string,

): AnalyticalAggregationMarketResult {

  return Object.freeze({

    producer:

      ANALYTICAL_AGGREGATION_MARKET_CORE_NAME,

    producer_version:

      ANALYTICAL_AGGREGATION_MARKET_CORE_VERSION,

    analytical_version:

      ANALYTICAL_AGGREGATION_MARKET_ANALYTICAL_VERSION,

    aggregation_status:

      "invalid",

    structural_context:

      buildInvalidStructuralContext(),

    transition_context:

      buildInvalidTransitionContext(),

    risk_context:

      buildInvalidRiskContext(),

    temporal_context:

      buildInvalidTemporalContext(),

    warnings:

      uniqueWarnings([

        warning,

      ]),

  });

}

/* ============================================================================

 * 19. FIRST-DIVERGENCE INPUT DIAGNOSTIC

 * ========================================================================== */

function resolveInvalidInputWarning(

  input:

    unknown,

): string {

  if (

    !isPlainObject(

      input,

    )

  ) {

    return "analytical_aggregation_input_invalid";

  }

  if (

    containsUndefinedDeep(

      input,

    )

  ) {

    return "analytical_aggregation_input_undefined_forbidden";

  }

  if (

    !hasExactKeys(

      input,

      ROOT_KEYS,

    )

  ) {

    return "analytical_aggregation_input_invalid";

  }

  if (

    !isRfsInput(

      input.rfs,

    )

  ) {

    return "analytical_aggregation_rfs_input_invalid";

  }

  if (

    !isTripleLayerInput(

      input.triple_layer,

    )

  ) {

    return "analytical_aggregation_triple_layer_input_invalid";

  }

  if (

    !isImpulseInput(

      input.impulse,

    )

  ) {

    return "analytical_aggregation_impulse_input_invalid";

  }

  if (

    !isCrashInput(

      input.crash,

    )

  ) {

    return "analytical_aggregation_crash_input_invalid";

  }

  if (

    !isTemporalInput(

      input.temporal,

    )

  ) {

    return "analytical_aggregation_temporal_input_invalid";

  }

  return "analytical_aggregation_input_invalid";

}

/* ============================================================================

 * 20. CANONICAL PRODUCER

 * ----------------------------------------------------------------------------

 * READ

 * -> VALIDATE

 * -> CONTEXTUAL COMPOSITION

 * -> RETURN

 *

 * No upstream producer is invoked.

 * No upstream analytical truth is recalculated.

 * ========================================================================== */

export function computeAnalyticalAggregationMarketCore(

  input:

    AnalyticalAggregationMarketInput,

): AnalyticalAggregationMarketResult {

  if (

    !isAnalyticalAggregationMarketInput(

      input,

    )

  ) {

    return buildInvalidResult(

      resolveInvalidInputWarning(

        input,

      ),

    );

  }

  const structuralContext =

    buildStructuralContext(

      input,

    );

  const transitionContext =

    buildTransitionContext(

      input,

    );

  const riskContext =

    buildRiskContext(

      input,

    );

  const temporalContext =

    buildTemporalContext(

      input,

    );

  const aggregationStatus =

    resolveAggregationStatus([

      structuralContext.status,

      transitionContext.status,

      riskContext.status,

      temporalContext.status,

    ]);

  const warnings =

    buildContextWarnings({

      structural:

        structuralContext,

      transition:

        transitionContext,

      risk:

        riskContext,

      temporal:

        temporalContext,

      impulse:

        input.impulse,

    });

  return Object.freeze({

    producer:

      ANALYTICAL_AGGREGATION_MARKET_CORE_NAME,

    producer_version:

      ANALYTICAL_AGGREGATION_MARKET_CORE_VERSION,

    analytical_version:

      ANALYTICAL_AGGREGATION_MARKET_ANALYTICAL_VERSION,

    aggregation_status:

      aggregationStatus,

    structural_context:

      structuralContext,

    transition_context:

      transitionContext,

    risk_context:

      riskContext,

    temporal_context:

      temporalContext,

    warnings,

  });

}

/* ============================================================================

 * 21. CANONICAL RESULT VALIDATION

 * ========================================================================== */

function isAnalyticalAggregationContextStatus(

  value:

    unknown,

): value is AnalyticalAggregationContextStatus {

  return (

    value ===

      "computed" ||

    value ===

      "partial" ||

    value ===

      "unavailable" ||

    value ===

      "invalid"

  );

}

function isAnalyticalAggregationStatus(

  value:

    unknown,

): value is AnalyticalAggregationStatus {

  return (

    value ===

      "computed" ||

    value ===

      "partial" ||

    value ===

      "unavailable" ||

    value ===

      "invalid"

  );

}

/* --------------------------------------------------------------------------

 * 21.1 STRUCTURAL CONTEXT VALIDATOR

 * -------------------------------------------------------------------------- */

function isAnalyticalAggregationStructuralContext(

  value:

    unknown,

): value is AnalyticalAggregationStructuralContext {

  if (

    !isPlainObject(

      value,

    ) ||

    !hasExactKeys(

      value,

      STRUCTURAL_CONTEXT_KEYS,

    ) ||

    !isAnalyticalAggregationContextStatus(

      value.status,

    ) ||

    !isNullableRfsStructuralTransitionReading(

      value.structural_transition,

    )

  ) {

    return false;

  }

  const scores = [

    value.stability_score,

    value.structure_score,

    value.coherence_score,

    value.occurrence_score,

    value.frequency_score,

    value.convergence_score,

    value.duration_score,

    value.evolution_score,

    value.rfs_growth_score,

    value.rupture_score,

    value.rupture_probability,

    value.continuity_probability,

  ];

  if (

    !scores.every(

      isNullableScore,

    ) ||

    !isRfsRegime(

      value.regime,

    )

  ) {

    return false;

  }

  if (

    value.status ===

      "invalid"

  ) {

    return (

      scores.every(

        (score) =>

          score ===

            null,

      ) &&

      value.regime ===

        null &&

      value.structural_transition ===

        null

    );

  }

  if (

    !isRfsStructuralTransitionReadingTransport(

      value.structural_transition,

    )

  ) {

    return false;

  }

  const expectedStatus =

    resolveContextStatus({

      required: [

        value.stability_score,

        value.regime,

        value.rupture_score,

        value.rupture_probability,

        value.continuity_probability,

        value.structural_transition,

      ],

      supporting: [

        value.structure_score,

        value.coherence_score,

        value.occurrence_score,

        value.frequency_score,

        value.convergence_score,

        value.duration_score,

        value.evolution_score,

        value.rfs_growth_score,

      ],

    });

  return (

    value.status ===

      expectedStatus

  );

}

/* --------------------------------------------------------------------------

 * 21.2 TRANSITION CONTEXT VALIDATOR

 * -------------------------------------------------------------------------- */

function isAnalyticalAggregationTransitionContext(

  value:

    unknown,

): value is AnalyticalAggregationTransitionContext {

  if (

    !isPlainObject(

      value,

    ) ||

    !hasExactKeys(

      value,

      TRANSITION_CONTEXT_KEYS,

    ) ||

    !isAnalyticalAggregationContextStatus(

      value.status,

    ) ||

    !isNullableRfsStructuralTransitionReading(

      value.structural_transition,

    ) ||

    !isTripleLayerState(

      value.triple_layer_state,

    ) ||

    !isImpulseDirectionalBias(

      value.impulse_directional_bias,

    ) ||

    !isImpulseTransitionState(

      value.impulse_transition_state,

    ) ||

    !isImpulseStatus(

      value.impulse_status,

    )

  ) {

    return false;

  }

  const tripleLayerScores = [

    value.triple_layer_growth_score,

    value.triple_layer_core_pattern_score,

    value.triple_layer_decay_score,

  ];

  const impulseScores = [

    value.impulse_compression_score,

    value.impulse_pressure_score,

    value.impulse_acceleration_score,

    value.impulse_alignment_score,

    value.impulse_instability_score,

    value.impulse_saturation_score,

    value.impulse_exhaustion_score,

  ];

  if (

    !tripleLayerScores.every(

      isNullableScore,

    ) ||

    !impulseScores.every(

      isNullableScore,

    )

  ) {

    return false;

  }

  if (

    value.status ===

      "invalid"

  ) {

    return (

      value.structural_transition ===

        null &&

      value.triple_layer_state ===

        "UNKNOWN" &&

      tripleLayerScores.every(

        (score) =>

          score ===

            null,

      ) &&

      impulseScores.every(

        (score) =>

          score ===

            null,

      ) &&

      value.impulse_directional_bias ===

        "UNAVAILABLE" &&

      value.impulse_transition_state ===

        "UNAVAILABLE" &&

      value.impulse_status ===

        "unavailable"

    );

  }

  if (

    !isRfsStructuralTransitionReadingTransport(

      value.structural_transition,

    )

  ) {

    return false;

  }

  if (

    value.impulse_status ===

      "unavailable"

  ) {

    if (

      !impulseScores.every(

        (score) =>

          score ===

            null,

      ) ||

      value.impulse_directional_bias !==

        "UNAVAILABLE" ||

      value.impulse_transition_state !==

        "UNAVAILABLE"

    ) {

      return false;

    }

  } else if (

    !impulseScores.every(

      isScore,

    ) ||

    value.impulse_directional_bias ===

      "UNAVAILABLE" ||

    value.impulse_transition_state ===

      "UNAVAILABLE"

  ) {

    return false;

  }

  const expectedStatus =

    resolveContextStatus({

      required: [

        value.structural_transition,

        value.triple_layer_state,

        value.triple_layer_growth_score,

        value.triple_layer_core_pattern_score,

        value.triple_layer_decay_score,

        value.impulse_transition_state,

        value.impulse_directional_bias,

        value.impulse_status,

      ],

      supporting: [

        value.impulse_compression_score,

        value.impulse_pressure_score,

        value.impulse_acceleration_score,

        value.impulse_alignment_score,

        value.impulse_instability_score,

        value.impulse_saturation_score,

        value.impulse_exhaustion_score,

      ],

    });

  return (

    value.status ===

      expectedStatus

  );

}

/* --------------------------------------------------------------------------

 * 21.3 RISK CONTEXT VALIDATOR

 * -------------------------------------------------------------------------- */

function isAnalyticalAggregationRiskContext(

  value:

    unknown,

): value is AnalyticalAggregationRiskContext {

  if (

    !isPlainObject(

      value,

    ) ||

    !hasExactKeys(

      value,

      RISK_CONTEXT_KEYS,

    ) ||

    !isAnalyticalAggregationContextStatus(

      value.status,

    ) ||

    !isCrashState(

      value.crash_state,

    )

  ) {

    return false;

  }

  const scores = [

    value.rupture_score,

    value.rupture_probability,

    value.rupture_penalty_score,

    value.rupture_occurrence_score,

    value.rupture_frequency_score,

    value.rupture_convergence_score,

    value.rupture_duration_score,

    value.rupture_evolution_score,

    value.rupture_acceleration_score,

    value.rupture_persistence_score,

    value.rupture_deceleration_score,

    value.continuity_probability,

    value.crash_score,

    value.impulse_instability_score,

    value.impulse_saturation_score,

    value.impulse_exhaustion_score,

  ];

  if (

    !scores.every(

      isNullableScore,

    )

  ) {

    return false;

  }

  if (

    value.status ===

      "invalid"

  ) {

    return (

      scores.every(

        (score) =>

          score ===

            null,

      ) &&

      value.rupture_evolution_state ===

        null &&

      value.crash_state ===

        "UNKNOWN"

    );

  }

  if (

    !isRfsRuptureEvolutionState(

      value.rupture_evolution_state,

    )

  ) {

    return false;

  }

  if (

    value.crash_state ===

      "UNKNOWN"

  ) {

    if (

      value.crash_score !==

        null

    ) {

      return false;

    }

  } else if (

    !isScore(

      value.crash_score,

    )

  ) {

    return false;

  }

  const expectedStatus =

    resolveContextStatus({

      required: [

        value.rupture_score,

        value.rupture_probability,

        value.rupture_evolution_state,

        value.crash_score,

        value.crash_state,

      ],

      supporting: [

        value.rupture_penalty_score,

        value.rupture_occurrence_score,

        value.rupture_frequency_score,

        value.rupture_convergence_score,

        value.rupture_duration_score,

        value.rupture_evolution_score,

        value.rupture_acceleration_score,

        value.rupture_persistence_score,

        value.rupture_deceleration_score,

        value.continuity_probability,

        value.impulse_instability_score,

        value.impulse_saturation_score,

        value.impulse_exhaustion_score,

      ],

    });

  return (

    value.status ===

      expectedStatus

  );

}

/* --------------------------------------------------------------------------

 * 21.4 TEMPORAL CONTEXT VALIDATOR

 * -------------------------------------------------------------------------- */

function isAnalyticalAggregationTemporalContext(

  value:

    unknown,

): value is AnalyticalAggregationTemporalContext {

  if (

    !isPlainObject(

      value,

    ) ||

    !hasExactKeys(

      value,

      TEMPORAL_CONTEXT_KEYS,

    ) ||

    !isAnalyticalAggregationContextStatus(

      value.status,

    ) ||

    !isPlainObject(

      value.global,

    ) ||

    !isPlainObject(

      value.horizon_7d,

    ) ||

    !isPlainObject(

      value.horizon_24h,

    ) ||

    !hasExactKeys(

      value.global,

      TEMPORAL_GLOBAL_CONTEXT_KEYS,

    ) ||

    !hasExactKeys(

      value.horizon_7d,

      TEMPORAL_7D_CONTEXT_KEYS,

    ) ||

    !hasExactKeys(

      value.horizon_24h,

      TEMPORAL_24H_CONTEXT_KEYS,

    ) ||

    !isNullableRfsStructuralTransitionReading(

      value.global.structural_transition,

    )

  ) {

    return false;

  }

  if (

    !isRfsRegime(

      value.global.regime,

    ) ||

    !isNullableScore(

      value.global.continuity_probability,

    ) ||

    !isNullableFiniteNumber(

      value.horizon_7d.chg_7d_pct,

    ) ||

    !isNullableFiniteNumber(

      value.horizon_24h.chg_24h_pct,

    )

  ) {

    return false;

  }

  if (

    value.status ===

      "invalid"

  ) {

    return (

      value.global.regime ===

        null &&

      value.global.structural_transition ===

        null &&

      value.global.continuity_probability ===

        null &&

      value.horizon_7d.chg_7d_pct ===

        null &&

      value.horizon_24h.chg_24h_pct ===

        null

    );

  }

  if (

    !isRfsStructuralTransitionReadingTransport(

      value.global.structural_transition,

    )

  ) {

    return false;

  }

  const expectedStatus =

    resolveContextStatus({

      required: [

        value.global.regime,

        value.global.structural_transition,

        value.horizon_7d.chg_7d_pct,

        value.horizon_24h.chg_24h_pct,

      ],

      supporting: [

        value.global.continuity_probability,

      ],

    });

  return (

    value.status ===

      expectedStatus

  );

}

/* --------------------------------------------------------------------------

 * 21.5 WARNING LIST VALIDATOR

 * -------------------------------------------------------------------------- */

function isCanonicalAnalyticalAggregationWarnings(

  value:

    unknown,

): value is readonly string[] {

  if (

    !Array.isArray(

      value,

    )

  ) {

    return false;

  }

  const warnings:

    string[] = [];

  for (

    const warning of value

  ) {

    if (

      typeof warning !==

        "string" ||

      warning.length ===

        0 ||

      warning.trim() !==

        warning

    ) {

      return false;

    }

    warnings.push(

      warning,

    );

  }

  if (

    new Set(

      warnings,

    ).size !==

      warnings.length

  ) {

    return false;

  }

  const sorted =

    [

      ...warnings,

    ].sort(

      compareDeterministicStrings,

    );

  for (

    let index = 0;

    index <

      warnings.length;

    index += 1

  ) {

    if (

      warnings[index] !==

      sorted[index]

    ) {

      return false;

    }

  }

  return true;

}

/* --------------------------------------------------------------------------

 * 21.6 CANONICAL RESULT VALIDATOR

 * -------------------------------------------------------------------------- */

export function isAnalyticalAggregationMarketResult(

  value:

    unknown,

): value is AnalyticalAggregationMarketResult {

  if (

    !isPlainObject(

      value,

    ) ||

    !hasExactKeys(

      value,

      RESULT_KEYS,

    )

  ) {

    return false;

  }

  if (

    containsUndefinedDeep(

      value,

    )

  ) {

    return false;

  }

  if (

    value.producer !==

      ANALYTICAL_AGGREGATION_MARKET_CORE_NAME ||

    value.producer_version !==

      ANALYTICAL_AGGREGATION_MARKET_CORE_VERSION ||

    value.analytical_version !==

      ANALYTICAL_AGGREGATION_MARKET_ANALYTICAL_VERSION

  ) {

    return false;

  }

  if (

    !isAnalyticalAggregationStatus(

      value.aggregation_status,

    ) ||

    !isAnalyticalAggregationStructuralContext(

      value.structural_context,

    ) ||

    !isAnalyticalAggregationTransitionContext(

      value.transition_context,

    ) ||

    !isAnalyticalAggregationRiskContext(

      value.risk_context,

    ) ||

    !isAnalyticalAggregationTemporalContext(

      value.temporal_context,

    ) ||

    !isCanonicalAnalyticalAggregationWarnings(

      value.warnings,

    )

  ) {

    return false;

  }

  const contextStatuses = [

    value.structural_context.status,

    value.transition_context.status,

    value.risk_context.status,

    value.temporal_context.status,

  ] as const;

  if (

    value.aggregation_status ===

      "invalid"

  ) {

    return contextStatuses.every(

      (status) =>

        status ===

          "invalid",

    );

  }

  if (

    contextStatuses.some(

      (status) =>

        status ===

          "invalid",

    )

  ) {

    return false;

  }

  const expectedAggregationStatus =

    resolveAggregationStatus(

      contextStatuses,

    );

  return (

    value.aggregation_status ===

      expectedAggregationStatus

  );

}
