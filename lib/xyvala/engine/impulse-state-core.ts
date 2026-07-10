/* ============================================================================
 * FILE: lib/xyvala/engine/impulse-state-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala impulse state core
 *
 * ROLE
 * - compute private impulse scores from already-computed structural inputs
 * - measure compression, pressure, acceleration, instability, saturation,
 *   exhaustion and temporal alignment
 * - keep impulse scoring isolated from RFS, MCI, calibration, API and UI
 *
 * PARENTS
 * - lib/xyvala/engine/rfs-market.ts
 * - lib/xyvala/RFS-score.ts
 * - lib/xyvala/scan-engine.ts
 * - lib/xyvala/calibration/impulse-adaptive-thresholds.ts
 *
 * DIRECTIVES
 * - private analytical engine only
 * - no UI logic
 * - no API logic
 * - no cache logic
 * - no persistence
 * - no mutation
 * - no console logging
 * - no MCI decision logic
 * - no calibration building logic
 * - no public wording
 * - no investment advice
 * - no prediction
 * - no buy / sell / hold semantics
 * - real computed inputs only
 * - deterministic output only
 * - same input => same output
 *
 * INPUTS
 * - current structural signature
 * - OCC / FREQ / CONV / CORR / DUR scores
 * - rupture probability and rupture penalty
 * - stability and coherence
 * - 7D temporal block
 * - 24H temporal block
 * - optional Triple Layer context
 * - optional adaptive impulse policy
 *
 * OUTPUTS
 * - ImpulseStateResult
 *
 * INVARIANTS
 * - impulse layer does not decide market action
 * - impulse layer does not replace stability
 * - impulse layer does not replace rupture
 * - impulse layer does not replace regime
 * - impulse layer reads structural pressure only
 * - Triple Layer is contextual only
 * - adaptive policy resolves thresholds only when explicitly provided
 * - all scores are bounded from 0 to 100
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/calibration/impulse-adaptive-thresholds.ts
 *
 * SENSITIVE ZONES
 * - transition state resolution
 * - rupture pressure propagation
 * - 7D / 24H temporal interpretation
 * - adaptive policy fallback
 * ========================================================================== */

import {
  resolveImpulseStateWithAdaptivePolicy,
  type ImpulseAdaptivePolicy,
  type ImpulseAdaptiveState,
} from "@/lib/xyvala/calibration/impulse-adaptive-thresholds";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type ImpulseDirectionalBias = "UP" | "DOWN" | "MIXED" | "NEUTRAL";

export type ImpulseTransitionState =
  | "COMPRESSION"
  | "PRESSURE_BUILDING"
  | "RELEASE"
  | "EXHAUSTION"
  | "NEUTRAL";

export type ImpulseTemporalBlock = {
  change_pct: number;
  slope_pct: number;
  stability_score: number;
  rupture_score: number;
  rupture_probability: number;
};

export type ImpulseSignatureInput = {
  slope_pct: number;
  amplitude_pct: number;
  instability_score: number;
  break_rate: number;
  duration_score: number;
};

export type ImpulseTripleLayerContext = {
  growth_score: number | null;
  core_score: number | null;
  decay_score: number | null;
};

export type ImpulseStateInput = {
  current_signature: ImpulseSignatureInput;

  occurrence_score: number;
  frequency_score: number;
  convergence_score: number;
  correlation_score: number;
  duration_score: number;

  rupture_probability: number;
  rupture_penalty_score: number;

  stability: number;
  coherence_score: number;

  rolling_7d: ImpulseTemporalBlock;
  rolling_24h: ImpulseTemporalBlock;

  triple_layer?: ImpulseTripleLayerContext;
  adaptive_policy?: ImpulseAdaptivePolicy;
};

export type ImpulseStateResult = {
  impulse_compression_score: number;
  impulse_pressure_score: number;
  impulse_acceleration_score: number;
  impulse_alignment_score: number;
  impulse_instability_score: number;
  impulse_saturation_score: number;
  impulse_exhaustion_score: number;
  impulse_directional_bias: ImpulseDirectionalBias;
  impulse_transition_state: ImpulseTransitionState;
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, min = 0, max = 100): number {
  if (!isFiniteNumber(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  if (!isFiniteNumber(value)) return 0;
  return Math.round(value * 100) / 100;
}

function normalizeScore(value: number): number {
  return round2(clamp(value));
}

function normalizeRate(value: number): number {
  if (!isFiniteNumber(value)) return 0;
  return clamp(value, 0, 1);
}

function normalizePctAbs(value: number, multiplier: number): number {
  if (!isFiniteNumber(value)) return 0;
  return clamp(Math.abs(value) * multiplier);
}

function normalizeNullableScore(value: unknown): number | null {
  if (!isFiniteNumber(value)) return null;
  return round2(clamp(value));
}

function sign(value: number): 1 | -1 | 0 {
  if (value > 1) return 1;
  if (value < -1) return -1;
  return 0;
}

function normalizeSignature(
  signature: ImpulseSignatureInput,
): ImpulseSignatureInput {
  return {
    slope_pct: isFiniteNumber(signature.slope_pct) ? signature.slope_pct : 0,
    amplitude_pct: clamp(signature.amplitude_pct),
    instability_score: clamp(signature.instability_score),
    break_rate: normalizeRate(signature.break_rate),
    duration_score: clamp(signature.duration_score),
  };
}

function normalizeTemporalBlock(
  block: ImpulseTemporalBlock,
): ImpulseTemporalBlock {
  return {
    change_pct: isFiniteNumber(block.change_pct) ? block.change_pct : 0,
    slope_pct: isFiniteNumber(block.slope_pct) ? block.slope_pct : 0,
    stability_score: clamp(block.stability_score),
    rupture_score: clamp(block.rupture_score),
    rupture_probability: clamp(block.rupture_probability),
  };
}

function normalizeTripleLayerContext(
  context?: ImpulseTripleLayerContext,
): ImpulseTripleLayerContext {
  return {
    growth_score: normalizeNullableScore(context?.growth_score),
    core_score: normalizeNullableScore(context?.core_score),
    decay_score: normalizeNullableScore(context?.decay_score),
  };
}

function toImpulseTransitionState(
  state: ImpulseAdaptiveState,
): ImpulseTransitionState {
  if (state === "COMPRESSION") return "COMPRESSION";
  if (state === "PRESSURE_BUILDING") return "PRESSURE_BUILDING";
  if (state === "RELEASE") return "RELEASE";
  if (state === "EXHAUSTION") return "EXHAUSTION";

  return "NEUTRAL";
}

/* ============================================================================
 * 3. DIRECTIONAL BIAS
 * ========================================================================== */

export function resolveImpulseDirectionalBias(input: {
  current_signature: ImpulseSignatureInput;
  rolling_7d: ImpulseTemporalBlock;
  rolling_24h: ImpulseTemporalBlock;
}): ImpulseDirectionalBias {
  const signature = normalizeSignature(input.current_signature);
  const rolling7d = normalizeTemporalBlock(input.rolling_7d);
  const rolling24h = normalizeTemporalBlock(input.rolling_24h);

  const slopes = [
    signature.slope_pct,
    rolling7d.slope_pct,
    rolling24h.slope_pct,
  ];

  const upSignals = slopes.filter((value) => value > 1).length;
  const downSignals = slopes.filter((value) => value < -1).length;

  if (upSignals >= 2 && downSignals === 0) return "UP";
  if (downSignals >= 2 && upSignals === 0) return "DOWN";
  if (upSignals > 0 && downSignals > 0) return "MIXED";

  return "NEUTRAL";
}

/* ============================================================================
 * 4. IMPULSE SCORES
 * ========================================================================== */

export function computeImpulseCompressionScore(input: {
  current_signature: ImpulseSignatureInput;
  convergence_score: number;
  correlation_score: number;
  duration_score: number;
}): number {
  const signature = normalizeSignature(input.current_signature);

  const flatnessScore = 100 - Math.min(Math.abs(signature.slope_pct), 100);
  const amplitudeContainmentScore = 100 - signature.amplitude_pct;

  return normalizeScore(
    flatnessScore * 0.26 +
      amplitudeContainmentScore * 0.22 +
      clamp(input.duration_score) * 0.2 +
      clamp(input.convergence_score) * 0.18 +
      clamp(input.correlation_score) * 0.14,
  );
}

export function computeImpulsePressureScore(input: {
  compression_score: number;
  frequency_score: number;
  convergence_score: number;
  duration_score: number;
  rupture_probability: number;
  coherence_score: number;
}): number {
  const structuralCompression = clamp(input.compression_score);
  const structuralFrequency = clamp(input.frequency_score);
  const structuralConvergence = clamp(input.convergence_score);
  const structuralDuration = clamp(input.duration_score);
  const rupturePressure = clamp(input.rupture_probability);
  const incoherencePressure = 100 - clamp(input.coherence_score);

  const structuralActivity = Math.max(
    structuralFrequency,
    structuralConvergence,
    structuralDuration,
  );

  return normalizeScore(
    structuralCompression * 0.24 +
      structuralActivity * 0.22 +
      structuralConvergence * 0.16 +
      structuralFrequency * 0.14 +
      rupturePressure * 0.14 +
      incoherencePressure * 0.1,
  );
}

export function computeImpulseAccelerationScore(input: {
  current_signature: ImpulseSignatureInput;
  rolling_7d: ImpulseTemporalBlock;
  rolling_24h: ImpulseTemporalBlock;
}): number {
  const signature = normalizeSignature(input.current_signature);
  const rolling7d = normalizeTemporalBlock(input.rolling_7d);
  const rolling24h = normalizeTemporalBlock(input.rolling_24h);

  const shortTermSpread = Math.abs(
    rolling24h.change_pct - rolling7d.change_pct,
  );

  const slopeSpread = Math.abs(
    rolling24h.slope_pct - rolling7d.slope_pct,
  );

  const signatureSpread = Math.abs(
    rolling24h.slope_pct - signature.slope_pct,
  );

  const shortTermMove = Math.abs(rolling24h.change_pct);
  const sevenDayMove = Math.abs(rolling7d.change_pct);

  return normalizeScore(
    normalizePctAbs(shortTermSpread, 14) * 0.28 +
      normalizePctAbs(slopeSpread, 12) * 0.22 +
      normalizePctAbs(signatureSpread, 8) * 0.18 +
      normalizePctAbs(shortTermMove, 10) * 0.18 +
      normalizePctAbs(sevenDayMove, 5) * 0.14,
  );
}

export function computeImpulseAlignmentScore(input: {
  current_signature: ImpulseSignatureInput;
  rolling_7d: ImpulseTemporalBlock;
  rolling_24h: ImpulseTemporalBlock;
  convergence_score: number;
  correlation_score: number;
}): number {
  const signature = normalizeSignature(input.current_signature);
  const rolling7d = normalizeTemporalBlock(input.rolling_7d);
  const rolling24h = normalizeTemporalBlock(input.rolling_24h);

  const signatureSign = sign(signature.slope_pct);
  const sevenDaySign = sign(rolling7d.slope_pct);
  const twentyFourHourSign = sign(rolling24h.slope_pct);

  const directionalAgreement =
    signatureSign !== 0 &&
    signatureSign === sevenDaySign &&
    sevenDaySign === twentyFourHourSign
      ? 100
      : sevenDaySign !== 0 && sevenDaySign === twentyFourHourSign
        ? 72
        : signatureSign !== 0 &&
            (signatureSign === sevenDaySign ||
              signatureSign === twentyFourHourSign)
          ? 58
          : signatureSign === 0 &&
              sevenDaySign === 0 &&
              twentyFourHourSign === 0
            ? 50
            : 32;

  return normalizeScore(
    directionalAgreement * 0.34 +
      clamp(input.convergence_score) * 0.26 +
      clamp(input.correlation_score) * 0.2 +
      rolling7d.stability_score * 0.1 +
      rolling24h.stability_score * 0.1,
  );
}

export function computeImpulseInstabilityScore(input: {
  current_signature: ImpulseSignatureInput;
  rupture_probability: number;
  rolling_7d: ImpulseTemporalBlock;
  rolling_24h: ImpulseTemporalBlock;
}): number {
  const signature = normalizeSignature(input.current_signature);
  const rolling7d = normalizeTemporalBlock(input.rolling_7d);
  const rolling24h = normalizeTemporalBlock(input.rolling_24h);

  const rupturePressure = Math.max(
    clamp(input.rupture_probability),
    rolling7d.rupture_probability,
    rolling24h.rupture_probability,
  );

  const temporalStress = Math.max(
    Math.abs(rolling7d.change_pct),
    Math.abs(rolling24h.change_pct),
  );

  const ruptureShift = Math.abs(
    rolling24h.rupture_probability - rolling7d.rupture_probability,
  );

  return normalizeScore(
    signature.instability_score * 0.24 +
      signature.break_rate * 100 * 0.22 +
      rupturePressure * 0.28 +
      normalizePctAbs(temporalStress, 6) * 0.16 +
      ruptureShift * 0.1,
  );
}

export function computeImpulseSaturationScore(input: {
  impulse_pressure_score: number;
  impulse_acceleration_score: number;
  rupture_penalty_score: number;
  stability: number;
  coherence_score: number;
  current_signature: ImpulseSignatureInput;
}): number {
  const signature = normalizeSignature(input.current_signature);

  const pressureLoad = clamp(input.impulse_pressure_score);
  const accelerationLoad = clamp(input.impulse_acceleration_score);
  const rupturePenalty = clamp(input.rupture_penalty_score);
  const stabilityDeficit = 100 - clamp(input.stability);
  const coherenceDeficit = 100 - clamp(input.coherence_score);
  const structuralStress = Math.max(stabilityDeficit, coherenceDeficit);

  return normalizeScore(
    pressureLoad * 0.34 +
      accelerationLoad * 0.2 +
      rupturePenalty * 0.18 +
      structuralStress * 0.14 +
      coherenceDeficit * 0.08 +
      signature.instability_score * 0.06,
  );
}

export function computeImpulseExhaustionScore(input: {
  rolling_7d: ImpulseTemporalBlock;
  rolling_24h: ImpulseTemporalBlock;
  impulse_acceleration_score: number;
  impulse_saturation_score: number;
}): number {
  const rolling7d = normalizeTemporalBlock(input.rolling_7d);
  const rolling24h = normalizeTemporalBlock(input.rolling_24h);

  const sevenDayMove = normalizePctAbs(rolling7d.change_pct, 4);
  const twentyFourHourMove = normalizePctAbs(rolling24h.change_pct, 8);
  const sevenDayFragility = 100 - rolling7d.stability_score;
  const twentyFourHourFragility = 100 - rolling24h.stability_score;

  return normalizeScore(
    sevenDayMove * 0.18 +
      twentyFourHourMove * 0.16 +
      rolling7d.rupture_probability * 0.18 +
      rolling24h.rupture_probability * 0.14 +
      sevenDayFragility * 0.12 +
      twentyFourHourFragility * 0.1 +
      clamp(input.impulse_acceleration_score) * 0.06 +
      clamp(input.impulse_saturation_score) * 0.06,
  );
}

/* ============================================================================
 * 5. STATIC TRANSITION RESOLUTION
 * ========================================================================== */

export function resolveImpulseTransitionState(input: {
  pressure_score: number;
  acceleration_score: number;
  alignment_score: number;
  instability_score: number;
  saturation_score: number;
  exhaustion_score: number;
  rolling_7d: ImpulseTemporalBlock;
  rolling_24h: ImpulseTemporalBlock;
}): ImpulseTransitionState {
  const pressureScore = clamp(input.pressure_score);
  const accelerationScore = clamp(input.acceleration_score);
  const alignmentScore = clamp(input.alignment_score);
  const instabilityScore = clamp(input.instability_score);
  const saturationScore = clamp(input.saturation_score);
  const exhaustionScore = clamp(input.exhaustion_score);

  const rolling7d = normalizeTemporalBlock(input.rolling_7d);
  const rolling24h = normalizeTemporalBlock(input.rolling_24h);

  if (exhaustionScore >= 70 && saturationScore >= 55) {
    return "EXHAUSTION";
  }

  if (
    pressureScore >= 66 &&
    accelerationScore >= 58 &&
    instabilityScore >= 58 &&
    Math.abs(rolling24h.change_pct) >= 3
  ) {
    return "RELEASE";
  }

  if (
    pressureScore >= 58 &&
    saturationScore >= 52 &&
    alignmentScore >= 45
  ) {
    return "PRESSURE_BUILDING";
  }

  if (
    pressureScore >= 42 &&
    instabilityScore <= 58 &&
    accelerationScore <= 48 &&
    Math.abs(rolling7d.change_pct) <= 4
  ) {
    return "COMPRESSION";
  }

  return "NEUTRAL";
}

/* ============================================================================
 * 6. ADAPTIVE TRANSITION RESOLUTION
 * ========================================================================== */

function resolveCalibratedImpulseTransitionState(input: {
  pressure_score: number;
  acceleration_score: number;
  alignment_score: number;
  instability_score: number;
  saturation_score: number;
  exhaustion_score: number;
  triple_layer: ImpulseTripleLayerContext;
  adaptive_policy?: ImpulseAdaptivePolicy;
  rolling_7d: ImpulseTemporalBlock;
  rolling_24h: ImpulseTemporalBlock;
}): ImpulseTransitionState {
  console.log("XYVALA_ADAPTIVE_POLICY_CHECK", {
    adaptivePolicyPresent: input.adaptive_policy !== undefined,
  });

  if (input.adaptive_policy === undefined) {
    return resolveImpulseTransitionState({
      pressure_score: input.pressure_score,
      acceleration_score: input.acceleration_score,
      alignment_score: input.alignment_score,
      instability_score: input.instability_score,
      saturation_score: input.saturation_score,
      exhaustion_score: input.exhaustion_score,
      rolling_7d: input.rolling_7d,
      rolling_24h: input.rolling_24h,
    });
  }

  console.log("XYVALA_IMPULSE_POLICY", {
  adaptivePolicyPresent: true,
  source: input.adaptive_policy.source,
  sampleSize: input.adaptive_policy.sample_size,
});

console.log("XYVALA_IMPULSE_POLICY_COUNTS", {
  stateSampleSize: input.adaptive_policy.state_sample_size,
});

console.log("XYVALA_IMPULSE_ADAPTIVE_THRESHOLDS", {
  compression: input.adaptive_policy.thresholds.compression,
  pressure_building: input.adaptive_policy.thresholds.pressure_building,
  release: input.adaptive_policy.thresholds.release,
  exhaustion: input.adaptive_policy.thresholds.exhaustion,
});

  const adaptiveState = resolveImpulseStateWithAdaptivePolicy({
    pressure_score: input.pressure_score,
    acceleration_score: input.acceleration_score,
    alignment_score: input.alignment_score,
    instability_score: input.instability_score,
    saturation_score: input.saturation_score,
    exhaustion_score: input.exhaustion_score,
    growth_score: input.triple_layer.growth_score,
    core_score: input.triple_layer.core_score,
    decay_score: input.triple_layer.decay_score,
    policy: input.adaptive_policy,
  });

  console.log("XYVALA_IMPULSE_ADAPTIVE_RESULT", {
    pressure: input.pressure_score,
    acceleration: input.acceleration_score,
    alignment: input.alignment_score,
    instability: input.instability_score,
    saturation: input.saturation_score,
    exhaustion: input.exhaustion_score,
    state: adaptiveState,
  });

  return toImpulseTransitionState(adaptiveState);
}

/* ============================================================================
 * 7. PURE EXECUTION
 * ========================================================================== */

export function computeImpulseState(input: ImpulseStateInput): ImpulseStateResult {
  const currentSignature = normalizeSignature(input.current_signature);
  const rolling7d = normalizeTemporalBlock(input.rolling_7d);
  const rolling24h = normalizeTemporalBlock(input.rolling_24h);
  const tripleLayer = normalizeTripleLayerContext(input.triple_layer);

   console.log("XYVALA_IMPULSE_SOURCE_COMPONENTS", {
  ruptureProbability: input.rupture_probability,
  rupturePenalty: input.rupture_penalty_score,

  stability: input.stability,
  coherence: input.coherence_score,

  occurrence: input.occurrence_score,
  frequency: input.frequency_score,
  convergence: input.convergence_score,
  correlation: input.correlation_score,
  duration: input.duration_score,

  breakRate: currentSignature.break_rate,
  signatureInstability: currentSignature.instability_score,

  rolling7dRupture: rolling7d.rupture_probability,
  rolling24hRupture: rolling24h.rupture_probability,
});
 
  const impulseCompressionScore = computeImpulseCompressionScore({
    current_signature: currentSignature,
    convergence_score: input.convergence_score,
    correlation_score: input.correlation_score,
    duration_score: input.duration_score,
  });

  const impulsePressureScore = computeImpulsePressureScore({
    compression_score: impulseCompressionScore,
    frequency_score: input.frequency_score,
    convergence_score: input.convergence_score,
    duration_score: input.duration_score,
    rupture_probability: input.rupture_probability,
    coherence_score: input.coherence_score,
  });

  const impulseAccelerationScore = computeImpulseAccelerationScore({
    current_signature: currentSignature,
    rolling_7d: rolling7d,
    rolling_24h: rolling24h,
  });

  const impulseAlignmentScore = computeImpulseAlignmentScore({
    current_signature: currentSignature,
    rolling_7d: rolling7d,
    rolling_24h: rolling24h,
    convergence_score: input.convergence_score,
    correlation_score: input.correlation_score,
  });

  const impulseInstabilityScore = computeImpulseInstabilityScore({
    current_signature: currentSignature,
    rupture_probability: input.rupture_probability,
    rolling_7d: rolling7d,
    rolling_24h: rolling24h,
  });

  const impulseSaturationScore = computeImpulseSaturationScore({
    impulse_pressure_score: impulsePressureScore,
    impulse_acceleration_score: impulseAccelerationScore,
    rupture_penalty_score: input.rupture_penalty_score,
    stability: input.stability,
    coherence_score: input.coherence_score,
    current_signature: currentSignature,
  });

  const impulseExhaustionScore = computeImpulseExhaustionScore({
  rolling_7d: rolling7d,
  rolling_24h: rolling24h,
  impulse_acceleration_score: impulseAccelerationScore,
  impulse_saturation_score: impulseSaturationScore,
});

console.log("XYVALA_IMPULSE_SCORE_DISTRIBUTION", {
  pressure: impulsePressureScore,
  acceleration: impulseAccelerationScore,
  alignment: impulseAlignmentScore,
  instability: impulseInstabilityScore,
  saturation: impulseSaturationScore,
  exhaustion: impulseExhaustionScore,
});

const impulseDirectionalBias = resolveImpulseDirectionalBias({
  current_signature: currentSignature,
  rolling_7d: rolling7d,
  rolling_24h: rolling24h,
});
  const impulseTransitionState = resolveCalibratedImpulseTransitionState({
    pressure_score: impulsePressureScore,
    acceleration_score: impulseAccelerationScore,
    alignment_score: impulseAlignmentScore,
    instability_score: impulseInstabilityScore,
    saturation_score: impulseSaturationScore,
    exhaustion_score: impulseExhaustionScore,
    triple_layer: tripleLayer,
    ...(input.adaptive_policy !== undefined
      ? { adaptive_policy: input.adaptive_policy }
      : {}),
    rolling_7d: rolling7d,
    rolling_24h: rolling24h,
  });

  return {
    impulse_compression_score: round2(impulseCompressionScore),
    impulse_pressure_score: round2(impulsePressureScore),
    impulse_acceleration_score: round2(impulseAccelerationScore),
    impulse_alignment_score: round2(impulseAlignmentScore),
    impulse_instability_score: round2(impulseInstabilityScore),
    impulse_saturation_score: round2(impulseSaturationScore),
    impulse_exhaustion_score: round2(impulseExhaustionScore),
    impulse_directional_bias: impulseDirectionalBias,
    impulse_transition_state: impulseTransitionState,
  };
}
