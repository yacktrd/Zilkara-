/* ============================================================================
 * FILE: lib/xyvala/engine/impulse-state-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala impulse state core
 *
 * ROLE
 * - measure latent structural impulse pressure from already-computed RFS inputs
 * - describe compression, pressure building, release and exhaustion states
 * - keep impulse reading isolated from RFS orchestration, MCI and public UI
 *
 * DIRECTIVES
 * - private analytical engine only
 * - no UI logic
 * - no API logic
 * - no cache logic
 * - no MCI decision logic
 * - no calibration logic
 * - no public wording
 * - no investment advice
 * - no prediction
 * - no buy / sell / hold semantics
 * - real computed inputs only
 * - deterministic output only
 * - same input => same output
 *
 * INPUTS
 * - structural signature metrics
 * - structural axis scores
 * - rupture scores
 * - stability / coherence scores
 * - rolling 7D and rolling 24H temporal blocks
 *
 * OUTPUTS
 * - impulse pressure score
 * - impulse instability score
 * - impulse saturation score
 * - impulse exhaustion score
 * - impulse directional bias
 * - impulse transition state
 *
 * INVARIANTS
 * - impulse layer does not decide
 * - impulse layer does not replace stability
 * - impulse layer does not replace rupture
 * - impulse layer reads structural pressure only
 * - all scores are bounded from 0 to 100
 *
 * SENSITIVE ZONES
 * - directional wording
 * - public/private boundary
 * - false signal perception
 * - overfitting thresholds
 * ========================================================================== */

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
};

export type ImpulseStateResult = {
  impulse_pressure_score: number;
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
  return Math.min(max, Math.max(min, value));
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

function normalizeSignedPctAbs(value: number, multiplier: number): number {
  if (!isFiniteNumber(value)) return 0;
  return clamp(Math.abs(value) * multiplier);
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
 * 4. TRANSITION STATE
 * ========================================================================== */

export function resolveImpulseTransitionState(input: {
  pressure_score: number;
  instability_score: number;
  saturation_score: number;
  exhaustion_score: number;
  rolling_7d: ImpulseTemporalBlock;
  rolling_24h: ImpulseTemporalBlock;
}): ImpulseTransitionState {
  const pressureScore = clamp(input.pressure_score);
  const instabilityScore = clamp(input.instability_score);
  const saturationScore = clamp(input.saturation_score);
  const exhaustionScore = clamp(input.exhaustion_score);
  const rolling7d = normalizeTemporalBlock(input.rolling_7d);
  const rolling24h = normalizeTemporalBlock(input.rolling_24h);

  if (exhaustionScore >= 70) {
    return "EXHAUSTION";
  }

  if (
    pressureScore >= 68 &&
    instabilityScore >= 62 &&
    Math.abs(rolling24h.change_pct) >= 3
  ) {
    return "RELEASE";
  }

  if (pressureScore >= 60 && saturationScore >= 55) {
    return "PRESSURE_BUILDING";
  }

  if (
    pressureScore >= 45 &&
    instabilityScore <= 55 &&
    Math.abs(rolling7d.change_pct) <= 4
  ) {
    return "COMPRESSION";
  }

  return "NEUTRAL";
}

/* ============================================================================
 * 5. IMPULSE SCORES
 * ========================================================================== */

export function computeImpulseCompressionScore(input: {
  current_signature: ImpulseSignatureInput;
  convergence_score: number;
  correlation_score: number;
  duration_score: number;
}): number {
  const signature = normalizeSignature(input.current_signature);

  return normalizeScore(
    (100 - Math.min(Math.abs(signature.slope_pct), 100)) * 0.28 +
      (100 - signature.amplitude_pct) * 0.22 +
      clamp(input.duration_score) * 0.2 +
      clamp(input.convergence_score) * 0.18 +
      clamp(input.correlation_score) * 0.12,
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
  return normalizeScore(
    clamp(input.compression_score) * 0.34 +
      clamp(input.convergence_score) * 0.18 +
      clamp(input.frequency_score) * 0.14 +
      clamp(input.duration_score) * 0.14 +
      clamp(input.rupture_probability) * 0.12 +
      (100 - clamp(input.coherence_score)) * 0.08,
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

  return normalizeScore(
    signature.instability_score * 0.28 +
      signature.break_rate * 100 * 0.22 +
      clamp(input.rupture_probability) * 0.22 +
      rolling7d.rupture_probability * 0.16 +
      rolling24h.rupture_probability * 0.12,
  );
}

export function computeImpulseSaturationScore(input: {
  impulse_pressure_score: number;
  rupture_penalty_score: number;
  stability: number;
  coherence_score: number;
  current_signature: ImpulseSignatureInput;
}): number {
  const signature = normalizeSignature(input.current_signature);

  return normalizeScore(
    clamp(input.impulse_pressure_score) * 0.34 +
      clamp(input.rupture_penalty_score) * 0.22 +
      (100 - clamp(input.stability)) * 0.18 +
      (100 - clamp(input.coherence_score)) * 0.16 +
      signature.instability_score * 0.1,
  );
}

export function computeImpulseExhaustionScore(input: {
  rolling_7d: ImpulseTemporalBlock;
  rolling_24h: ImpulseTemporalBlock;
}): number {
  const rolling7d = normalizeTemporalBlock(input.rolling_7d);
  const rolling24h = normalizeTemporalBlock(input.rolling_24h);

  return normalizeScore(
    normalizeSignedPctAbs(rolling7d.change_pct, 4) * 0.22 +
      normalizeSignedPctAbs(rolling24h.change_pct, 8) * 0.18 +
      rolling7d.rupture_probability * 0.2 +
      rolling24h.rupture_probability * 0.16 +
      (100 - rolling7d.stability_score) * 0.14 +
      (100 - rolling24h.stability_score) * 0.1,
  );
}

/* ============================================================================
 * 6. PUBLIC EXECUTION
 * ========================================================================== */

export function computeImpulseState(input: ImpulseStateInput): ImpulseStateResult {
  const currentSignature = normalizeSignature(input.current_signature);
  const rolling7d = normalizeTemporalBlock(input.rolling_7d);
  const rolling24h = normalizeTemporalBlock(input.rolling_24h);

  const compressionScore = computeImpulseCompressionScore({
    current_signature: currentSignature,
    convergence_score: input.convergence_score,
    correlation_score: input.correlation_score,
    duration_score: input.duration_score,
  });

  const impulsePressureScore = computeImpulsePressureScore({
    compression_score: compressionScore,
    frequency_score: input.frequency_score,
    convergence_score: input.convergence_score,
    duration_score: input.duration_score,
    rupture_probability: input.rupture_probability,
    coherence_score: input.coherence_score,
  });

  const impulseInstabilityScore = computeImpulseInstabilityScore({
    current_signature: currentSignature,
    rupture_probability: input.rupture_probability,
    rolling_7d: rolling7d,
    rolling_24h: rolling24h,
  });

  const impulseSaturationScore = computeImpulseSaturationScore({
    impulse_pressure_score: impulsePressureScore,
    rupture_penalty_score: input.rupture_penalty_score,
    stability: input.stability,
    coherence_score: input.coherence_score,
    current_signature: currentSignature,
  });

  const impulseExhaustionScore = computeImpulseExhaustionScore({
    rolling_7d: rolling7d,
    rolling_24h: rolling24h,
  });

  const impulseDirectionalBias = resolveImpulseDirectionalBias({
    current_signature: currentSignature,
    rolling_7d: rolling7d,
    rolling_24h: rolling24h,
  });

  const impulseTransitionState = resolveImpulseTransitionState({
    pressure_score: impulsePressureScore,
    instability_score: impulseInstabilityScore,
    saturation_score: impulseSaturationScore,
    exhaustion_score: impulseExhaustionScore,
    rolling_7d: rolling7d,
    rolling_24h: rolling24h,
  });

  return {
    impulse_pressure_score: round2(impulsePressureScore),
    impulse_instability_score: round2(impulseInstabilityScore),
    impulse_saturation_score: round2(impulseSaturationScore),
    impulse_exhaustion_score: round2(impulseExhaustionScore),
    impulse_directional_bias: impulseDirectionalBias,
    impulse_transition_state: impulseTransitionState,
  };
}
