/* ============================================================================
 * FILE: lib/xyvala/calibration/contracts/calibration-distribution-contracts.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala calibration distribution contracts
 *
 * ROLE
 * - define calibration distribution contracts
 * - centralize statistical distribution structures
 * - define target distributions and regime distributions
 * - isolate distribution contracts from runtime, policy and reports
 *
 * DIRECTIVES
 * - contracts only
 * - no runtime logic
 * - no persistence logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no UI logic
 * - no API logic
 * - no statistical calculation logic here
 * - one concept = one canonical name
 * - one name = one concept
 *
 * INPUTS
 * - observed calibration distributions
 * - regime-level distributions
 * - target calibration distributions
 *
 * OUTPUTS
 * - distribution contracts
 * - regime distribution contracts
 * - statistical distribution contracts
 * - target distribution contracts
 *
 * INVARIANTS
 * - distributions represent observed proportions only
 * - target distributions remain independent from runtime state
 * - regime distributions remain deterministic structures
 * - no policy thresholds inside distribution contracts
 *
 * CRITICAL DEPENDENCIES
 * - calibration-core-contracts.ts
 *
 * SENSITIVE ZONES
 * - allow/watch/block distributions
 * - regime distribution propagation
 * - statistical distribution interpretation
 * ========================================================================== */

import type { CalibrationRegime } from "./calibration-core-contracts";

/* ============================================================================
 * 1. BASE DECISION DISTRIBUTION
 * ========================================================================== */

export type DecisionDistribution = {
  allow: number;
  watch: number;
  block: number;
};

/* ============================================================================
 * 2. REGIME DISTRIBUTIONS
 * ========================================================================== */

export type RegimeDistribution = Record<
  CalibrationRegime,
  DecisionDistribution
>;

/* ============================================================================
 * 3. REASON DISTRIBUTIONS
 * ========================================================================== */

export type ReasonDistribution = Record<string, number>;

/* ============================================================================
 * 4. STATISTICAL DISTRIBUTIONS
 * ========================================================================== */

export type DistributionStats = {
  allow_pct: number;
  watch_pct: number;
  block_pct: number;

  sample_size: number;
};

export type RegimeStats = Record<
  CalibrationRegime,
  DistributionStats
>;

/* ============================================================================
 * 5. TARGET DISTRIBUTIONS
 * ========================================================================== */

export type TargetDistribution = {
  allow_pct: number;
  watch_pct: number;
  block_pct: number;

  tolerance_pct: number;
};

export type RegimeTarget = Record<
  CalibrationRegime,
  TargetDistribution
>;
