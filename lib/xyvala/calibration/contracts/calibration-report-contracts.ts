/* ============================================================================
 * FILE: lib/xyvala/calibration/contracts/calibration-report-contracts.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala calibration report contracts
 *
 * ROLE
 * - define calibration reporting contracts
 * - centralize audit and reporting structures
 * - define readable analytical reporting outputs
 * - isolate report contracts from runtime, storage and persistence
 *
 * DIRECTIVES
 * - contracts only
 * - no runtime logic
 * - no persistence logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no UI logic
 * - no API logic
 * - no reporting calculation logic here
 * - one concept = one canonical name
 * - one name = one concept
 *
 * INPUTS
 * - runtime calibration outputs
 * - scoring outputs
 * - governance outputs
 * - distribution outputs
 *
 * OUTPUTS
 * - report contracts
 * - audit contracts
 * - readable analytical summaries
 *
 * INVARIANTS
 * - reports remain deterministic
 * - reports never mutate runtime state
 * - reports remain audit-oriented
 * - reports only expose already computed structures
 *
 * CRITICAL DEPENDENCIES
 * - calibration-core-contracts.ts
 * - calibration-distribution-contracts.ts
 * - calibration-governance-contracts.ts
 * - calibration-policy-contracts.ts
 * - calibration-scoring-contracts.ts
 *
 * SENSITIVE ZONES
 * - governance exposure
 * - neutralization reporting
 * - rupture reporting
 * - scoring synthesis
 * ========================================================================== */

import type {
  CalibrationMaturity,
  CalibrationPolicySource,
} from "./calibration-core-contracts";

import type {
  DecisionDistribution,
  ReasonDistribution,
  RegimeDistribution,
} from "./calibration-distribution-contracts";

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
  ReadableThresholds,
} from "./calibration-policy-contracts";

import type {
  AggregatedScore,
  ConfidenceScores,
  NeutralizationScores,
  RuptureEvolutionScores,
  StructuralScores,
  TemporalScores,
  TripleLayerScores,
} from "./calibration-scoring-contracts";

/* ============================================================================
 * 1. REPORT SUMMARY
 * ========================================================================== */

export type ReportSummary = {
  status: CalibrationMaturity;

  policy_source: CalibrationPolicySource;

  sample_count: number;

  effective_sample_size: number;

  sufficient_samples: boolean;

  fallback_active: boolean;

  warnings: string[];
};

/* ============================================================================
 * 2. CALIBRATION REPORT
 * ========================================================================== */

export type CalibrationReport = {
  summary: ReportSummary;

  distribution: {
    observed_distribution: DecisionDistribution;

    regime_distribution: RegimeDistribution;

    reason_distribution: ReasonDistribution;

    target_distribution: DecisionDistribution;
  };

  thresholds: {
    derived: ReadableThresholds;

    resolved: ReadableThresholds;
  };

  pressure: DecisionPressure;

  aggregated_score: AggregatedScore;

  rupture?: {
    signals?: RuptureSignals;

    pressure?: RupturePressure;

    recovery?: RecoveryPressure;

    comparator?: RuptureComparator;
  };

  neutralization?: {
    signals?: NeutralizationSignals;

    scores?: NeutralizationScores;
  };

  structural_scores: StructuralScores;

  temporal_scores?: TemporalScores;

  rupture_evolution_scores?: RuptureEvolutionScores;

  confidence_scores?: ConfidenceScores;

  triple_layer_scores?: TripleLayerScores;
};

/* ============================================================================
 * 3. OPPORTUNITY REPORT
 * ========================================================================== */

export type OpportunityReport = {
  summary: ReportSummary;

  opportunity_score_average: number;

  opportunity_score_median: number;

  warnings: string[];
};

/* ============================================================================
 * 4. NEUTRALIZATION REPORT
 * ========================================================================== */

export type NeutralizationReport = {
  summary: ReportSummary;

  neutralized_sample_count: number;

  neutralized_sample_ratio: number;

  dominant_neutralization_reason?: string;

  neutralization_signals?: NeutralizationSignals;

  neutralization_scores?: NeutralizationScores;

  warnings: string[];
};

/* ============================================================================
 * 5. RUPTURE EVOLUTION REPORT
 * ========================================================================== */

export type RuptureEvolutionReport = {
  summary: ReportSummary;

  worsening_ratio: number;

  explosive_ratio: number;

  improving_ratio: number;

  rupture_evolution_scores?: RuptureEvolutionScores;

  warnings: string[];
};

/* ============================================================================
 * 6. TEMPORAL REPORT
 * ========================================================================== */

export type TemporalReport = {
  summary: ReportSummary;

  temporal_scores?: TemporalScores;

  temporal_instability_ratio: number;

  invalid_temporal_alignment_ratio: number;

  warnings: string[];
};

/* ============================================================================
 * 7. TRIPLE LAYER REPORT
 * ========================================================================== */

export type TripleLayerReport = {
  summary: ReportSummary;

  triple_layer_scores?: TripleLayerScores;

  growth_dominance_ratio: number;

  decay_dominance_ratio: number;

  conflict_ratio: number;

  warnings: string[];
};

/* ============================================================================
 * 8. GOVERNANCE REPORT
 * ========================================================================== */

export type GovernanceReport = {
  summary: ReportSummary;

  rupture_signals?: RuptureSignals;

  recovery_signals?: RecoverySignals;

  neutralization_signals?: NeutralizationSignals;

  rupture_comparator?: RuptureComparator;

  decision_pressure?: DecisionPressure;

  warnings: string[];
};
