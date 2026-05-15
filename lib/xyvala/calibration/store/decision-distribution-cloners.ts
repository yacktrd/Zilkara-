/* ============================================================================
 * FILE: lib/xyvala/calibration/store/decision-distribution-cloners.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala decision distribution cloners
 *
 * ROLE
 * - centralize immutable cloning helpers for calibration store structures
 * - prevent accidental mutation of internal calibration state
 * - isolate cloning logic from normalization, validation and persistence
 *
 * DIRECTIVES
 * - cloning only
 * - no runtime logic
 * - no persistence logic
 * - no normalization logic
 * - no validation logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no UI logic
 * - no API logic
 * - immutable outputs only
 *
 * INPUTS
 * - DecisionSample
 * - DecisionSample[]
 * - StoreStats
 *
 * OUTPUTS
 * - immutable cloned structures
 *
 * INVARIANTS
 * - cloning never mutates source objects
 * - cloning preserves deterministic structure
 * - getters must never expose mutable internal references
 * - same input => same cloned structure
 *
 * CRITICAL DEPENDENCIES
 * - calibration-contracts.ts
 *
 * SENSITIVE ZONES
 * - sample arrays
 * - store stats propagation
 * - nested object immutability
 * ========================================================================== */

import type {
  CalibrationDecision,
  CalibrationRegime,
  DecisionDistributionStoreStats,
  DecisionSample,
} from "@/lib/xyvala/calibration/calibration-contracts";

/* ============================================================================
 * 1. SAMPLE CLONERS
 * ========================================================================== */

export function cloneSample(
  sample: DecisionSample,
): DecisionSample {
  return {
    ...sample,
  };
}

export function cloneSamples(
  samples: DecisionSample[],
): DecisionSample[] {
  return samples.map(cloneSample);
}

/* ============================================================================
 * 2. STORE STATS CLONERS
 * ========================================================================== */

function cloneDecisionCount(
  input: Record<CalibrationDecision, number>,
): Record<CalibrationDecision, number> {
  return {
    ALLOW: input.ALLOW ?? 0,
    WATCH: input.WATCH ?? 0,
    BLOCK: input.BLOCK ?? 0,
  };
}

function cloneRegimeCount(
  input: Record<CalibrationRegime, number>,
): Record<CalibrationRegime, number> {
  return {
    STABLE: input.STABLE ?? 0,
    TRANSITION: input.TRANSITION ?? 0,
    VOLATILE: input.VOLATILE ?? 0,
  };
}

export function cloneStoreStats(
  stats: DecisionDistributionStoreStats,
): DecisionDistributionStoreStats {
  return {
    sample_count: stats.sample_count ?? 0,

    last_sample_ts: stats.last_sample_ts ?? null,

    decision_count: cloneDecisionCount(
      stats.decision_count,
    ),

    regime_count: cloneRegimeCount(
      stats.regime_count,
    ),
  };
}
