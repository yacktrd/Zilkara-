/* ============================================================================
 * FILE: lib/xyvala/calibration/contracts/calibration-governance-contracts.ts
 * ============================================================================
 * TITLE
 * - Xyvala calibration governance contracts
 *
 * ROLE
 * - define calibration governance pressure contracts
 * - define rupture / recovery / neutralization signal contracts
 * - define comparator contracts used by runtime calibration state
 *
 * DIRECTIVES
 * - contracts only
 * - no runtime logic
 * - no persistence logic
 * - no validation logic
 * - no normalization logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no UI logic
 * - no API logic
 * - one concept = one canonical name
 * - no duplicated local aliases
 *
 * INVARIANTS
 * - PressureState and DominanceState remain owned by core contracts
 * - governance contracts describe state only
 * - governance contracts never imply trading execution
 * - neutralization remains defensive and explicit
 * - rupture / recovery comparison remains descriptive only
 * ========================================================================== */

import type {
  DominanceState,
  PressureState,
  ValidityState,
} from "./calibration-core-contracts";

/* ============================================================================
 * 1. GOVERNANCE ENUMS
 * ========================================================================== */

export type NeutralizationReason =
  | "none"
  | "insufficient_data"
  | "contradictory_structure"
  | "unstable_distribution"
  | "excessive_decay"
  | "excessive_rupture"
  | "invalid_temporal_alignment"
  | "low_confidence"
  | "degraded_snapshot"
  | "corrupted_distribution";

export type NeutralizationSeverity =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type RuptureEvolutionState =
  | "improving"
  | "stable"
  | "worsening"
  | "explosive"
  | "unknown";

/* ============================================================================
 * 2. PRESSURE CONTRACTS
 * ========================================================================== */

export type DecisionPressure = {
  allow_pressure_score: number;
  watch_pressure_score: number;
  block_pressure_score: number;

  allow_pressure_state: PressureState;
  watch_pressure_state: PressureState;
  block_pressure_state: PressureState;
};

export type RupturePressure = {
  rupture_pressure_score: number;
  rupture_pressure_state: PressureState;

  rupture_detected_count: number;
  rupture_sample_ratio: number;
};

export type RecoveryPressure = {
  recovery_pressure_score: number;
  recovery_pressure_state: PressureState;

  recovery_dominant_count: number;
  recovery_sample_ratio: number;
};

/* ============================================================================
 * 3. GOVERNANCE SIGNAL CONTRACTS
 * ========================================================================== */

export type NeutralizationSignals = {
  neutralized: boolean;

  neutralization_reason: NeutralizationReason;
  neutralization_severity: NeutralizationSeverity;
  neutralization_validity: ValidityState;
};

export type RuptureSignals = {
  rupture_score: number;
  rupture_probability: number;

  rupture_detected: boolean;
  rupture_reason: string;

  rupture_validity: ValidityState;
};

export type RuptureEvolutionSignals = {
  rupture_evolution_score: number;
  rupture_evolution_state: RuptureEvolutionState;
  rupture_acceleration_score: number;

  rupture_evolution_validity: ValidityState;
};

export type RecoverySignals = {
  recovery_probability: number;
  recovery_rupture_dominance: number;

  dominance_state: DominanceState;
  recovery_validity: ValidityState;
};

/* ============================================================================
 * 4. COMPARATOR CONTRACTS
 * ========================================================================== */

export type RuptureComparator = {
  rupture_pressure: RupturePressure;
  recovery_pressure: RecoveryPressure;

  dominant_side: DominanceState;

  comparator_validity: ValidityState;
};

/* ============================================================================
 * 5. GOVERNANCE SUMMARY CONTRACT
 * ========================================================================== */

export type CalibrationGovernanceSignals = {
  decision_pressure?: DecisionPressure;

  rupture_pressure?: RupturePressure;
  recovery_pressure?: RecoveryPressure;
  rupture_comparator?: RuptureComparator;

  rupture_signals?: RuptureSignals;
  rupture_evolution_signals?: RuptureEvolutionSignals;
  recovery_signals?: RecoverySignals;
  neutralization_signals?: NeutralizationSignals;
};
