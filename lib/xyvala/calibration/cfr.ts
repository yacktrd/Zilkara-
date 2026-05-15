/* ============================================================================
 * FILE: lib/xyvala/calibration/cfr.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala Calibration Flow Regulator — V2 Pro
 *
 * PARENT FILES
 * - lib/xyvala/calibration/calibration-orchestrator.ts
 * - lib/xyvala/calibration/decision-distribution-core.ts
 *
 * ROLE
 * - regulate final calibration thresholds from observed decision flow
 * - combine distribution pressure, score proximity and structural calibration base
 * - enforce bounded minimum viable flow without overriding final decisions
 * - keep CFR independent from RFS, MCI, routes and UI
 *
 * DIRECTIVES
 * - no provider parsing here
 * - no route logic here
 * - no UI logic here
 * - no RFS recomputation here
 * - no MCI recomputation here
 * - no regime reconstruction here
 * - no final decision override here
 * - deterministic outputs only
 * - same input => same output
 * - regulate thresholds only
 * - use observed samples and calibration structure only
 *
 * INPUTS
 * - observed decision distribution samples
 * - observed decision distribution summary
 * - structural calibration base from calibration-orchestrator
 *
 * OUTPUTS
 * - calibration flow pressure
 * - calibration valve adjustments
 *
 * INVARIANTS
 * - CFR never mutates samples
 * - CFR never recalculates analytical truth
 * - CFR never forces ALLOW / WATCH / BLOCK directly
 * - adjustments remain bounded
 * - minimum viable flow remains controlled and reversible
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/calibration/decision-distribution-core.ts
 *
 * SENSITIVE ZONES
 * - minimum viable flow
 * - over-opening prevention
 * - score proximity pressure
 * - structural quality gating
 * ========================================================================== */

import type { DecisionSample } from "@/lib/xyvala/calibration/calibration-contracts";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const TARGET_ALLOW_RATIO = 0.1;
const TARGET_WATCH_RATIO = 0.7;
const TARGET_BLOCK_RATIO = 0.2;

const MIN_VIABLE_ALLOW_RATIO = 0.04;
const WATCH_LOCK_RATIO = 0.75;
const HARD_WATCH_LOCK_RATIO = 0.82;

const OVER_OPEN_ALLOW_RATIO = 0.22;
const UNDER_BLOCK_RATIO = 0.08;

const CFR_ALLOW_ADJUSTMENT_MIN = -8;
const CFR_ALLOW_ADJUSTMENT_MAX = 6;

const CFR_SUPPORT_ADJUSTMENT_MIN = -6;
const CFR_SUPPORT_ADJUSTMENT_MAX = 5;

const CFR_RISK_ADJUSTMENT_MIN = -4;
const CFR_RISK_ADJUSTMENT_MAX = 4;

const STRUCTURE_WEAK_LIMIT = 42;
const STRUCTURE_STRONG_LIMIT = 62;

const SCORE_PROXIMITY_LOW = 48;
const SCORE_PROXIMITY_HIGH = 58;

/* ============================================================================
 * 2. TYPES
 * ========================================================================== */

export type CalibrationObservedDistribution = {
  allow: number;
  watch: number;
  block: number;
};

export type CalibrationStructuralBase = {
  structural_occurrence_score?: number;
  structural_frequency_score?: number;
  structural_convergence_score?: number;
  structural_correlation_score?: number;
  structural_duration_score?: number;

  convergence?: number;
  correlation?: number;
  duration?: number;
};

export type CalibrationFlowPressureState =
  | "HARD_DEFENSIVE_LOCK"
  | "MINIMUM_FLOW_LOCK"
  | "OPENING_BIAS"
  | "BALANCED_FLOW"
  | "OVER_OPEN"
  | "RISK_UNDER_BLOCKED"
  | "STRUCTURE_TOO_WEAK";

export type CalibrationFlowPressure = {
  allow_gap: number;
  watch_gap: number;
  block_gap: number;

  flow_imbalance_score: number;
  minimum_viable_flow_gap: number;

  structural_quality_score: number;
  score_proximity_score: number;

  opening_pressure_score: number;
  closing_pressure_score: number;
  net_pressure_score: number;

  opening_level: 0 | 1 | 2 | 3 | 4;
  pressure_state: CalibrationFlowPressureState;
};

export type CalibrationValveAdjustments = {
  allow_valve_adjustment: number;
  support_valve_adjustment: number;
  risk_valve_adjustment: number;
};

export type RunCalibrationFlowRegulatorInput = {
  samples: DecisionSample[];
  observed_distribution: CalibrationObservedDistribution;
  structural_calibration_base?: CalibrationStructuralBase;
};

export type RunCalibrationFlowRegulatorResult = {
  calibration_flow_pressure: CalibrationFlowPressure;
  calibration_valve_adjustments: CalibrationValveAdjustments;
};

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function clampRatio(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;

  return Math.round(parsed * 10000) / 10000;
}

function clampScore(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 100) return 100;

  return Math.round(parsed * 100) / 100;
}

function clampAdjustment(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function roundRatio(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;

  const total = values.reduce((sum, value) => sum + value, 0);
  return clampScore(total / values.length);
}

function normalizeObservedDistribution(
  observed_distribution: CalibrationObservedDistribution,
): CalibrationObservedDistribution {
  return {
    allow: clampRatio(observed_distribution.allow),
    watch: clampRatio(observed_distribution.watch),
    block: clampRatio(observed_distribution.block),
  };
}

/* ============================================================================
 * 4. SAMPLE SCORE EXTRACTION
 * ========================================================================== */

function extractSampleScoreVectors(samples: DecisionSample[]) {
  const allow_raw_scores: number[] = [];
  const support_scores: number[] = [];
  const risk_scores: number[] = [];
  const recovery_scores: number[] = [];
  const stability_scores: number[] = [];
  const convergence_scores: number[] = [];
  const confidence_scores: number[] = [];

  for (const sample of samples) {
    allow_raw_scores.push(
      clampScore((sample as { allow_raw_score?: unknown }).allow_raw_score),
    );

    support_scores.push(
      clampScore(
        (sample as { decision_support_probability?: unknown })
          .decision_support_probability,
      ),
    );

    risk_scores.push(
      clampScore(
        (sample as { risk_rupture_probability?: unknown })
          .risk_rupture_probability,
      ),
    );

    recovery_scores.push(
      clampScore(
        (sample as { recovery_probability?: unknown }).recovery_probability,
      ),
    );

    stability_scores.push(
      clampScore((sample as { stability?: unknown }).stability),
    );

    convergence_scores.push(
      clampScore((sample as { convergence?: unknown }).convergence),
    );

    confidence_scores.push(
      clampScore((sample as { confidence?: unknown }).confidence),
    );
  }

  return {
    allow_raw_scores,
    support_scores,
    risk_scores,
    recovery_scores,
    stability_scores,
    convergence_scores,
    confidence_scores,
  };
}

/* ============================================================================
 * 5. STRUCTURAL QUALITY
 * ========================================================================== */

function resolveStructuralQualityScore(
  structural_base?: CalibrationStructuralBase,
): number {
  if (!structural_base) return 0;

  const occurrence = clampScore(
    structural_base.structural_occurrence_score ?? 0,
  );
  const frequency = clampScore(
    structural_base.structural_frequency_score ?? 0,
  );
  const convergence = clampScore(
    structural_base.structural_convergence_score ??
      structural_base.convergence ??
      0,
  );
  const correlation = clampScore(
    structural_base.structural_correlation_score ??
      structural_base.correlation ??
      0,
  );
  const duration = clampScore(
    structural_base.structural_duration_score ??
      structural_base.duration ??
      0,
  );

  return clampScore(
    occurrence * 0.2 +
      frequency * 0.18 +
      convergence * 0.24 +
      correlation * 0.2 +
      duration * 0.18,
  );
}

/* ============================================================================
 * 6. SCORE PROXIMITY
 * ----------------------------------------------------------------------------
 * ROLE
 * - measure whether WATCH-heavy samples are close enough to becoming valid
 * - avoids opening blindly on distribution alone
 * ========================================================================== */

function buildScoreProximityScore(samples: DecisionSample[]): number {
  const vectors = extractSampleScoreVectors(samples);

  const avgAllow = average(vectors.allow_raw_scores);
  const avgSupport = average(vectors.support_scores);
  const avgRecovery = average(vectors.recovery_scores);
  const avgStability = average(vectors.stability_scores);
  const avgConvergence = average(vectors.convergence_scores);
  const avgConfidence = average(vectors.confidence_scores);
  const avgRisk = average(vectors.risk_scores);

  const constructivePressure = clampScore(
    avgAllow * 0.25 +
      avgSupport * 0.2 +
      avgRecovery * 0.15 +
      avgStability * 0.15 +
      avgConvergence * 0.15 +
      avgConfidence * 0.1,
  );

  const riskPenalty = clampScore(avgRisk * 0.25);

  return clampScore(constructivePressure - riskPenalty);
}

/* ============================================================================
 * 7. FLOW PRESSURE
 * ========================================================================== */

export function buildCalibrationFlowPressure(
  input: RunCalibrationFlowRegulatorInput,
): CalibrationFlowPressure {
  const observed = normalizeObservedDistribution(input.observed_distribution);

  const allow_gap = roundRatio(observed.allow - TARGET_ALLOW_RATIO);
  const watch_gap = roundRatio(observed.watch - TARGET_WATCH_RATIO);
  const block_gap = roundRatio(observed.block - TARGET_BLOCK_RATIO);

  const minimum_viable_flow_gap = roundRatio(
    observed.allow - MIN_VIABLE_ALLOW_RATIO,
  );

  const flow_imbalance_score = clampScore(
    (Math.abs(allow_gap) + Math.abs(watch_gap) + Math.abs(block_gap)) * 100,
  );

  const structural_quality_score = resolveStructuralQualityScore(
    input.structural_calibration_base,
  );

  const score_proximity_score = buildScoreProximityScore(input.samples);

  const opening_pressure_score = clampScore(
    Math.max(0, -allow_gap) * 100 * 0.35 +
      Math.max(0, watch_gap) * 100 * 0.25 +
      structural_quality_score * 0.25 +
      score_proximity_score * 0.15,
  );

  const closing_pressure_score = clampScore(
    Math.max(0, allow_gap) * 100 * 0.35 +
      Math.max(0, -block_gap) * 100 * 0.25 +
      (100 - structural_quality_score) * 0.2 +
      Math.max(0, SCORE_PROXIMITY_LOW - score_proximity_score) * 0.2,
  );

  const net_pressure_score = clampScore(
    50 + opening_pressure_score - closing_pressure_score,
  );

  let pressure_state: CalibrationFlowPressureState = "BALANCED_FLOW";
  let opening_level: 0 | 1 | 2 | 3 | 4 = 0;

  if (structural_quality_score < STRUCTURE_WEAK_LIMIT) {
    pressure_state = "STRUCTURE_TOO_WEAK";
    opening_level = 0;
  } else if (observed.allow >= OVER_OPEN_ALLOW_RATIO) {
    pressure_state = "OVER_OPEN";
    opening_level = 0;
  } else if (
    observed.block <= UNDER_BLOCK_RATIO &&
    observed.allow >= TARGET_ALLOW_RATIO
  ) {
    pressure_state = "RISK_UNDER_BLOCKED";
    opening_level = 0;
  } else if (
    observed.allow <= 0.01 &&
    observed.watch >= HARD_WATCH_LOCK_RATIO &&
    structural_quality_score >= STRUCTURE_STRONG_LIMIT &&
    score_proximity_score >= SCORE_PROXIMITY_HIGH
  ) {
    pressure_state = "HARD_DEFENSIVE_LOCK";
    opening_level = 4;
  } else if (
    observed.allow < MIN_VIABLE_ALLOW_RATIO &&
    observed.watch >= WATCH_LOCK_RATIO &&
    score_proximity_score >= SCORE_PROXIMITY_LOW
  ) {
    pressure_state = "MINIMUM_FLOW_LOCK";
    opening_level = 3;
  } else if (
    observed.allow <= 0.06 &&
    observed.watch >= 0.72 &&
    score_proximity_score >= SCORE_PROXIMITY_LOW
  ) {
    pressure_state = "OPENING_BIAS";
    opening_level = 2;
  } else if (
    observed.allow < TARGET_ALLOW_RATIO &&
    observed.watch >= 0.65 &&
    score_proximity_score >= SCORE_PROXIMITY_LOW
  ) {
    pressure_state = "OPENING_BIAS";
    opening_level = 1;
  }

  return {
    allow_gap,
    watch_gap,
    block_gap,
    flow_imbalance_score,
    minimum_viable_flow_gap,
    structural_quality_score,
    score_proximity_score,
    opening_pressure_score,
    closing_pressure_score,
    net_pressure_score,
    opening_level,
    pressure_state,
  };
}

/* ============================================================================
 * 8. VALVE ADJUSTMENTS
 * ========================================================================== */

export function deriveCalibrationValveAdjustments(
  calibration_flow_pressure: CalibrationFlowPressure,
): CalibrationValveAdjustments {
  let allow_valve_adjustment = 0;
  let support_valve_adjustment = 0;
  let risk_valve_adjustment = 0;

  if (calibration_flow_pressure.pressure_state === "STRUCTURE_TOO_WEAK") {
    allow_valve_adjustment = 2;
    support_valve_adjustment = 1;
    risk_valve_adjustment = 0;
  }

  if (calibration_flow_pressure.pressure_state === "HARD_DEFENSIVE_LOCK") {
    allow_valve_adjustment = -8;
    support_valve_adjustment = -5;
    risk_valve_adjustment = -1;
  }

  if (calibration_flow_pressure.pressure_state === "MINIMUM_FLOW_LOCK") {
    allow_valve_adjustment = -6;
    support_valve_adjustment = -3;
    risk_valve_adjustment = -1;
  }

  if (calibration_flow_pressure.pressure_state === "OPENING_BIAS") {
    if (calibration_flow_pressure.opening_level === 2) {
      allow_valve_adjustment = -4;
      support_valve_adjustment = -2;
    }

    if (calibration_flow_pressure.opening_level === 1) {
      allow_valve_adjustment = -2;
      support_valve_adjustment = -1;
    }
  }

  if (calibration_flow_pressure.pressure_state === "OVER_OPEN") {
    allow_valve_adjustment = 4;
    support_valve_adjustment = 2;
    risk_valve_adjustment = 1;
  }

  if (calibration_flow_pressure.pressure_state === "RISK_UNDER_BLOCKED") {
    allow_valve_adjustment = 1;
    support_valve_adjustment = 1;
    risk_valve_adjustment = -3;
  }

  return {
    allow_valve_adjustment: clampAdjustment(
      allow_valve_adjustment,
      CFR_ALLOW_ADJUSTMENT_MIN,
      CFR_ALLOW_ADJUSTMENT_MAX,
    ),
    support_valve_adjustment: clampAdjustment(
      support_valve_adjustment,
      CFR_SUPPORT_ADJUSTMENT_MIN,
      CFR_SUPPORT_ADJUSTMENT_MAX,
    ),
    risk_valve_adjustment: clampAdjustment(
      risk_valve_adjustment,
      CFR_RISK_ADJUSTMENT_MIN,
      CFR_RISK_ADJUSTMENT_MAX,
    ),
  };
}

/* ============================================================================
 * 9. PUBLIC API
 * ========================================================================== */

export function runCalibrationFlowRegulator(
  input: RunCalibrationFlowRegulatorInput,
): RunCalibrationFlowRegulatorResult {
  const calibration_flow_pressure = buildCalibrationFlowPressure(input);

  const calibration_valve_adjustments =
    deriveCalibrationValveAdjustments(calibration_flow_pressure);

  return {
    calibration_flow_pressure,
    calibration_valve_adjustments,
  };
}

