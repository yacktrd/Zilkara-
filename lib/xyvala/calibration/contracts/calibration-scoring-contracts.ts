/* ============================================================================
 * FILE: lib/xyvala/calibration/contracts/calibration-scoring-contracts.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala calibration scoring contracts
 *
 * ROLE
 * - define calibration scoring contracts
 * - centralize structural and aggregated scoring contracts
 * - define scoring interpretation structures
 * - isolate scoring contracts from runtime, reports and persistence
 *
 * DIRECTIVES
 * - contracts only
 * - no runtime logic
 * - no persistence logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no UI logic
 * - no API logic
 * - no score calculation logic here
 * - one concept = one canonical name
 * - one name = one concept
 *
 * INPUTS
 * - structural scoring observations
 * - rupture scoring observations
 * - governance scoring observations
 * - temporal scoring observations
 *
 * OUTPUTS
 * - scoring contracts
 * - aggregated scoring contracts
 * - scoring interpretation contracts
 *
 * INVARIANTS
 * - scoring contracts remain deterministic
 * - aggregated_score is a synthesis, not a duplicate
 * - scoring contracts never mutate source structures
 * - categories remain explicit and closed
 *
 * CRITICAL DEPENDENCIES
 * - calibration-core-contracts.ts
 *
 * SENSITIVE ZONES
 * - aggregated score propagation
 * - scoring interpretation
 * - structural weighting
 * - scoring validity
 * ========================================================================== */

import type { ValidityState } from "./calibration-core-contracts";

/* ============================================================================
 * 1. STRUCTURAL SCORES
 * ========================================================================== */

export type StructuralScores = {
  occurrence: number;

  frequency: number;

  convergence: number;

  correlation: number;

  duration: number;
};

/* ============================================================================
 * 2. AGGREGATED SCORE
 * ========================================================================== */

export type AggregatedScore = {
  aggregated_score: number;

  validity: ValidityState;
};

/* ============================================================================
 * 3. SCORING CATEGORIES
 * ========================================================================== */

export type ScoringCategory =
  | "distribution"
  | "threshold"
  | "pressure"
  | "rupture"
  | "rupture_evolution"
  | "recovery"
  | "neutralization"
  | "quality"
  | "duration"
  | "frequency"
  | "convergence"
  | "occurrence"
  | "correlation"
  | "evolution"
  | "growth"
  | "decay"
  | "triple_layer"
  | "temporal"
  | "confidence";

/* ============================================================================
 * 4. SCORED VARIABLE
 * ========================================================================== */

export type ScoredVariable = {
  variable: string;

  category: ScoringCategory;

  markers: string[];

  indicators: string[];

  weighting: number;

  thresholds: Record<string, number>;

  score: number;

  interpretation: string;

  validity: ValidityState;
};

/* ============================================================================
 * 5. TRIPLE LAYER SCORES
 * ========================================================================== */

export type TripleLayerScores = {
  growth_score: number;

  core_pattern_score: number;

  decay_score: number;

  triple_layer_alignment_score: number;

  triple_layer_conflict_score: number;
};

/* ============================================================================
 * 6. TEMPORAL SCORES
 * ========================================================================== */

export type TemporalScores = {
  temporal_alignment_score: number;

  temporal_consistency_score: number;

  temporal_stability_score: number;

  temporal_degradation_score: number;
};

/* ============================================================================
 * 7. RUPTURE EVOLUTION SCORES
 * ========================================================================== */

export type RuptureEvolutionScores = {
  rupture_evolution_score: number;

  rupture_acceleration_score: number;

  rupture_persistence_score: number;

  rupture_temporal_pressure_score: number;
};

/* ============================================================================
 * 8. NEUTRALIZATION SCORES
 * ========================================================================== */

export type NeutralizationScores = {
  neutralization_pressure_score: number;

  defensive_bias_score: number;

  analytical_conflict_score: number;

  degradation_severity_score: number;
};

/* ============================================================================
 * 9. CONFIDENCE SCORES
 * ========================================================================== */

export type ConfidenceScores = {
  confidence_data_score: number;

  confidence_temporal_score: number;

  confidence_distribution_score: number;

  confidence_structure_score: number;

  confidence_decision_score: number;

  global_confidence_score: number;
};
