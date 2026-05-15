/* ============================================================================
 * FILE: lib/xyvala/calibration/contracts/calibration-sample-contracts.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala calibration sample contracts
 *
 * ROLE
 * - define observed calibration sample contracts
 * - define RFS/MCI observation structures
 * - define calibration sample read/write contracts
 * - isolate sample contracts from runtime, policy and reports
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
 * - migration mirrors must remain explicit and temporary
 *
 * INVARIANTS
 * - DecisionSample is the canonical calibration observation object
 * - DecisionSampleInput is the partial normalizable input object
 * - samples remain immutable analytical observations
 * - governance fields remain observational only
 * - rupture / recovery / rupture evolution validity fields are explicit
 * ========================================================================== */

import type {
  CalibrationDecision,
  CalibrationRegime,
  EvaluationHorizon,
  ReliabilityLevel,
  ValidityState,
} from "./calibration-core-contracts";

import type {
  NeutralizationSignals,
  RecoverySignals,
  RuptureEvolutionSignals,
} from "./calibration-governance-contracts";

/* ============================================================================
 * 1. OBSERVED MARKET
 * ========================================================================== */

export type ObservedMarket = {
  observed_ts: number;
  observed_horizon: EvaluationHorizon;
  observed_analytical_version: string;
  observed_policy_version?: string;

  observed_price_eur?: number;
  observed_volume_24h_eur?: number;
  observed_change_24h_pct?: number;
  observed_change_7d_pct?: number;

  observed_decision: CalibrationDecision;
  observed_regime: CalibrationRegime;
  observed_reason?: string;
  observed_reliability: ReliabilityLevel;
};

/* ============================================================================
 * 2. RFS VARIABLES
 * ========================================================================== */

export type RfsVariables = {
  rfs_stability_score?: number;
  rfs_pattern_score?: number;
  rfs_similarity_score?: number;

  rfs_occurrence_score?: number;
  rfs_frequency_score?: number;
  rfs_convergence_score?: number;
  rfs_duration_score?: number;
  rfs_evolution_score?: number;
  rfs_growth_score?: number;

  rfs_rupture_score?: number;
  rfs_rupture_probability?: number;
  rfs_rupture_severity_score?: number;
  rfs_rupture_frequency_score?: number;
  rfs_rupture_duration_score?: number;
  rfs_rupture_penalty_score?: number;
  rfs_rupture_detected?: boolean | null;
  rfs_rupture_reason?: string;

  rfs_crash_score?: number;
  rfs_crash_state?: string;
  rfs_continuity_probability?: number;
};

/* ============================================================================
 * 3. MCI VARIABLES
 * ========================================================================== */

export type MciVariables = {
  mci_decision_score: number;
  mci_allow_raw_score: number;
  mci_block_raw_score: number;

  mci_decision_support_probability: number;
  mci_risk_rupture_probability: number;

  mci_final_decision: CalibrationDecision;
  mci_decision_reason?: string;

  mci_hard_block?: boolean | null;
  mci_hard_allow_candidate?: boolean | null;
};

/* ============================================================================
 * 4. DECISION SAMPLE
 * ========================================================================== */

export type DecisionSample = ObservedMarket &
  RfsVariables &
  MciVariables &
  RecoverySignals &
  NeutralizationSignals & {
    ts: number;

    final_decision: CalibrationDecision;
    regime: CalibrationRegime;
    analytical_version: string;
    policy_version?: string;
    horizon: EvaluationHorizon;

    decision_score: number;
    allow_raw_score: number;
    block_raw_score: number;
    decision_support_probability: number;
    risk_rupture_probability: number;

    stability_score?: number;
    opportunity_score?: number;
    convergence_score?: number;
    confidence_score?: number;
    similarity_score?: number;

    rupture_score?: number;
    rupture_probability?: number;
    rupture_severity_score?: number;
    rupture_frequency_score?: number;
    rupture_duration_score?: number;
    rupture_penalty_score?: number;
    rupture_detected?: boolean | null;
    rupture_reason?: string;
    rupture_validity: ValidityState;

    rupture_evolution_score: number;
    rupture_evolution_state: RuptureEvolutionSignals["rupture_evolution_state"];
    rupture_acceleration_score: number;
    rupture_evolution_validity: ValidityState;

    recovery_validity: ValidityState;

    hard_block?: boolean | null;
    hard_allow_candidate?: boolean | null;

    decision_reason?: string;
    reason?: string;

    reliability: ReliabilityLevel;

    created_at?: string;
    recorded_at?: string;

    /* ======================================================================
     * TEMPORARY MIGRATION MIRRORS
     * ==================================================================== */

    stability?: number;
    opportunity?: number;
    convergence?: number;
    confidence?: number;
    sample_reliability?: ReliabilityLevel;

    asset_id?: string;
    symbol?: string;
  };

/* ============================================================================
 * 5. SAMPLE INPUTS
 * ========================================================================== */

export type DecisionSampleInput = Partial<
  Omit<
    DecisionSample,
    | "rupture_validity"
    | "recovery_validity"
    | "rupture_evolution_score"
    | "rupture_evolution_state"
    | "rupture_acceleration_score"
    | "rupture_evolution_validity"
  >
> & {
  rupture_validity?: ValidityState;
  recovery_validity?: ValidityState;

  rupture_evolution_score?: number;
  rupture_evolution_state?: RuptureEvolutionSignals["rupture_evolution_state"];
  rupture_acceleration_score?: number;
  rupture_evolution_validity?: ValidityState;

  final_decision: CalibrationDecision;
  regime: CalibrationRegime;
  analytical_version: string;
  horizon: EvaluationHorizon;
};

/* ============================================================================
 * 6. SAMPLE READ CONTRACTS
 * ========================================================================== */

export type SampleReadInput = {
  analytical_version?: string;
  horizon?: EvaluationHorizon;
  limit?: number;
};

export type SampleReadResult = {
  samples: DecisionSample[];
  total: number;
  returned: number;
  limit: number;
};

/* ============================================================================
 * 7. SAMPLE APPEND CONTRACTS
 * ========================================================================== */

export type SampleAppendResult = {
  ok: boolean;
  sample: DecisionSample;
  warnings: string[];
};

export type SamplesAppendResult = {
  ok: boolean;
  samples: DecisionSample[];
  appended_count: number;
  warnings: string[];
};

/* ============================================================================
 * 8. STORE STATS
 * ========================================================================== */

export type StoreStats = {
  sample_count: number;
  last_sample_ts: number | null;
  decision_count: Record<CalibrationDecision, number>;
  regime_count: Record<CalibrationRegime, number>;
};
