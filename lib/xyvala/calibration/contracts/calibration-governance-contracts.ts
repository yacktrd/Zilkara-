/* ============================================================================
 * FILE: lib/xyvala/calibration/contracts/calibration-governance-contracts.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala calibration governance contracts
 *
 * ROLE
 * - define governance-level calibration contracts
 * - centralize rupture, recovery, neutralization and pressure systems
 * - provide deterministic governance states shared across calibration layers
 * - isolate governance contracts from samples, runtime and reports
 *
 * DIRECTIVES
 * - contracts only
 * - no runtime logic
 * - no persistence logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no UI logic
 * - no API logic
 * - one concept = one canonical name
 * - one name = one concept
 * - governance contracts only
 *
 * INPUTS
 * - rupture observations
 * - recovery observations
 * - neutralization observations
 * - pressure measurements
 *
 * OUTPUTS
 * - governance contracts
 * - rupture governance contracts
 * - recovery governance contracts
 * - neutralization governance contracts
 * - comparator governance contracts
 *
 * INVARIANTS
 * - governance layers never recalculate source scores
 * - governance layers never mutate analytical truth
 * - governance layers only qualify defensive behavior
 * - rupture evolution never replaces rupture score
 * - neutralization never replaces decisions
 * - validity fields remain scoped and explicit
 *
 * CRITICAL DEPENDENCIES
 * - calibration-core-contracts.ts
 *
 * SENSITIVE ZONES
 * - rupture evolution
 * - neutralization propagation
 * - defensive governance
 * - pressure escalation
 * - exactOptionalPropertyTypes compatibility
 * ========================================================================== */

import type {
  DominanceState,
  PressureState,
  ValidityState,
} from "./calibration-core-contracts";

/* ============================================================================
 * 1. NEUTRALIZATION
 * ========================================================================== */

export type NeutralizationReason =
  | "insufficient_data"
  | "contradictory_structure"
  | "unstable_distribution"
  | "excessive_decay"
  | "excessive_rupture"
  | "invalid_temporal_alignment"
  | "low_confidence"
  | "degraded_snapshot"
  | "corrupted_distribution"
  | "none";

export type NeutralizationSeverity =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type NeutralizationSignals = {
  neutralized: boolean;

  neutralization_reason: NeutralizationReason;

  neutralization_severity: NeutralizationSeverity;

  neutralization_validity: ValidityState;
};

/* ============================================================================
 * 2. RUPTURE EVOLUTION
 * ========================================================================== */

export type RuptureEvolutionState =
  | "improving"
  | "stable"
  | "worsening"
  | "explosive"
  | "unknown";

export type RuptureEvolutionSignals = {
  rupture_evolution_score: number;

  rupture_evolution_state: RuptureEvolutionState;

  rupture_acceleration_score: number;

  rupture_evolution_validity: ValidityState;
};

/* ============================================================================
 * 3. RUPTURE SIGNALS
 * ========================================================================== */

export type RuptureSignals = {
  rupture_score: number;

  rupture_probability: number;

  rupture_severity_score: number;

  rupture_detected: boolean;

  rupture_reason?: string;

  rupture_validity: ValidityState;
};

/* ============================================================================
 * 4. RECOVERY SIGNALS
 * ========================================================================== */

export type RecoverySignals = {
  recovery_probability: number;

  recovery_rupture_dominance: number;

  dominance_state: DominanceState;

  recovery_validity: ValidityState;
};

/* ============================================================================
 * 5. PRESSURE SYSTEMS
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

  dominant_rupture_reason?: string;
};

export type RecoveryPressure = {
  recovery_pressure_score: number;

  recovery_pressure_state: PressureState;

  recovery_dominant_count: number;

  recovery_sample_ratio: number;
};

/* ============================================================================
 * 6. COMPARATOR SYSTEMS
 * ========================================================================== */

export type RuptureComparator = {
  rupture_pressure: RupturePressure;

  recovery_pressure: RecoveryPressure;

  dominant_side: DominanceState;

  comparator_validity: ValidityState;
};

/* ============================================================================
 * 7. GOVERNANCE FLAGS
 * ========================================================================== */

export type GovernanceFlags = {
  fallback_active: boolean;

  rupture_pressure_elevated: boolean;

  rupture_pressure_excessive: boolean;

  recovery_pressure_elevated: boolean;

  neutralization_active: boolean;

  explosive_rupture_detected: boolean;

  defensive_mode_active: boolean;
};
