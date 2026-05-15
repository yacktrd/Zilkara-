/* ============================================================================
 * FILE: lib/xyvala/calibration/contracts/calibration-runtime-contracts.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala calibration runtime contracts
 *
 * ROLE
 * - define readable calibration runtime state contracts
 * - define active calibration state contracts
 * - define orchestration runtime contracts
 * - isolate runtime state contracts from reports and persistence
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
 * - runtime contracts only
 *
 * INPUTS
 * - resolved calibration policy
 * - observed distributions
 * - governance signals
 * - orchestration metadata
 *
 * OUTPUTS
 * - readable runtime state contracts
 * - active runtime state contracts
 * - orchestration runtime contracts
 *
 * INVARIANTS
 * - runtime state never recalculates analytical truth
 * - runtime state remains deterministic
 * - runtime state is audit-oriented
 * - readable thresholds are always materialized
 * - targets.distribution is always materialized
 *
 * CRITICAL DEPENDENCIES
 * - calibration-core-contracts.ts
 * - calibration-distribution-contracts.ts
 * - calibration-governance-contracts.ts
 * - calibration-policy-contracts.ts
 * - calibration-sample-contracts.ts
 *
 * SENSITIVE ZONES
 * - readable thresholds
 * - governance propagation
 * - runtime validity
 * - orchestration metadata
 * ========================================================================== */

import type {
  CalibrationMaturity,
  CalibrationPolicySource,
  EvaluationHorizon,
  ValidityState,
} from "./calibration-core-contracts";

import type {
  DecisionDistribution,
  RegimeDistribution,
  ReasonDistribution,
  TargetDistribution,
  RegimeTarget,
} from "./calibration-distribution-contracts";

import type {
  AggregatedScore,
  StructuralScores,
} from "./calibration-scoring-contracts";

import type {
  DecisionPressure,
  NeutralizationSignals,
  RecoveryPressure,
  RecoverySignals,
  RuptureComparator,
  RupturePressure,
  RuptureSignals,
} from "./calibration-governance-contracts";

import type {
  CalibrationPolicy,
  ReadableThresholds,
} from "./calibration-policy-contracts";

import type { DecisionSample } from "./calibration-sample-contracts";

/* ============================================================================
 * 1. READABLE STATE INPUT
 * ========================================================================== */

export type ReadableStateInput = {
  policy: CalibrationPolicy;

  policy_source: CalibrationPolicySource;

  sample_size: number;

  effective_sample_size: number;

  observed_distribution: DecisionDistribution;

  regime_distribution?: RegimeDistribution;

  reason_distribution?: ReasonDistribution;

  aggregated_score?: AggregatedScore;

  rupture_signals?: RuptureSignals;

  recovery_signals?: RecoverySignals;

  neutralization_signals?: NeutralizationSignals;

  rupture_comparator?: RuptureComparator;

  warnings?: string[];
};

/* ============================================================================
 * 2. READABLE STATE
 * ========================================================================== */

export type ReadableState = {
  thresholds: ReadableThresholds;

  summary: {
    source: CalibrationPolicySource | string;

    sample_size: number;

    effective_sample_size: number;
  };

  targets: {
    distribution: DecisionDistribution;

    global?: TargetDistribution;

    regime_targets?: RegimeTarget;
  };

  observed_distribution?: DecisionDistribution;

  regime_distribution?: RegimeDistribution;

  reason_distribution?: ReasonDistribution;

  aggregated_score?: AggregatedScore;

  rupture_signals?: RuptureSignals;

  recovery_signals?: RecoverySignals;

  neutralization_signals?: NeutralizationSignals;

  rupture_comparator?: RuptureComparator;

  flags: {
    fallback_active: boolean;

    global_outside_tolerance: boolean;

    stable_outside_tolerance: boolean;

    transition_outside_tolerance: boolean;

    volatile_outside_tolerance: boolean;

    rupture_pressure_elevated?: boolean;

    rupture_pressure_excessive?: boolean;

    recovery_pressure_elevated?: boolean;

    neutralization_active?: boolean;

    explosive_rupture_detected?: boolean;

    defensive_mode_active?: boolean;
  };

  warnings: string[];
};

/* ============================================================================
 * 3. ACTIVE STATE
 * ========================================================================== */

export type ActiveState = {
  policy: CalibrationPolicy;

  state: ReadableState;

  last_updated_ts: number;
};

/* ============================================================================
 * 4. RUNTIME STATE
 * ========================================================================== */

export type RuntimeState = {
  thresholds: CalibrationPolicy;

  status: CalibrationMaturity;

  validity: ValidityState;

  warnings: string[];
};

/* ============================================================================
 * 5. CALIBRATION META
 * ========================================================================== */

export type CalibrationMeta = {
  analytical_version: string;

  horizon: EvaluationHorizon;

  policy_source: CalibrationPolicySource;

  sufficient_samples: boolean;

  fallback_active: boolean;

  state_persisted: boolean;

  aggregated_score: AggregatedScore;

  derived_thresholds: ReadableThresholds;

  resolved_thresholds: ReadableThresholds;

  rupture_pressure?: RupturePressure;

  recovery_pressure?: RecoveryPressure;

  rupture_comparator?: RuptureComparator;

  neutralization_signals?: NeutralizationSignals;
};

/* ============================================================================
 * 6. ORCHESTRATOR INPUT
 * ========================================================================== */

export type OrchestratorInput = {
  samples?: DecisionSample[];

  analytical_version?: string;

  horizon?: EvaluationHorizon;

  min_sample_size?: number;

  persist_state?: boolean;
};

/* ============================================================================
 * 7. ORCHESTRATOR RESULT
 * ========================================================================== */

export type OrchestratorResult = {
  ok: boolean;

  status: CalibrationMaturity;

  aggregated_score: AggregatedScore;

  sample_count: number;

  effective_sample_size: number;

  min_sample_size: number;

  observed_distribution: DecisionDistribution;

  regime_distribution: RegimeDistribution;

  reason_distribution: ReasonDistribution;

  structural_occurrence_score: number;

  structural_frequency_score: number;

  structural_convergence_score: number;

  structural_correlation_score: number;

  structural_duration_score: number;

  decision_pressure: DecisionPressure;

  rupture_pressure?: RupturePressure;

  recovery_pressure?: RecoveryPressure;

  rupture_comparator?: RuptureComparator;

  neutralization_signals?: NeutralizationSignals;

  derived_thresholds: ReadableThresholds;

  resolved_thresholds: ReadableThresholds;

  policy: CalibrationPolicy;

  state: RuntimeState;

  meta: CalibrationMeta;

  warnings: string[];
};
