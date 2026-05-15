/* ============================================================================
 * FILE: lib/xyvala/calibration/contracts/calibration-policy-contracts.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala calibration policy contracts
 *
 * ROLE
 * - define calibration threshold policy contracts
 * - define readable threshold contracts
 * - define policy build and policy resolution contracts
 * - isolate policy contracts from samples, runtime, reports and stores
 *
 * DIRECTIVES
 * - contracts only
 * - no runtime logic
 * - no persistence logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no UI logic
 * - no API logic
 * - no threshold derivation here
 * - no distribution calculation here
 * - one concept = one canonical name
 * - one name = one concept
 *
 * INPUTS
 * - calibration decision samples
 * - observed distributions
 * - resolved threshold policy
 *
 * OUTPUTS
 * - policy contracts
 * - readable threshold contracts
 * - policy build contracts
 * - policy resolution contracts
 *
 * INVARIANTS
 * - CalibrationPolicy remains the compact internal threshold policy
 * - ReadableThresholds remains the expanded auditable threshold view
 * - thresholds are gates, not scores
 * - probabilities are conditional observations, not raw scores
 * - policy contracts do not depend on runtime state
 * - policy contracts do not depend on reports
 *
 * CRITICAL DEPENDENCIES
 * - calibration-core-contracts.ts
 * - calibration-distribution-contracts.ts
 * - calibration-sample-contracts.ts
 *
 * SENSITIVE ZONES
 * - allow threshold
 * - block threshold
 * - rupture risk threshold
 * - decision support threshold
 * - readable threshold expansion
 * ========================================================================== */

import type {
  CalibrationPolicySource,
  CalibrationRegime,
  EvaluationHorizon,
} from "./calibration-core-contracts";

import type {
  DecisionDistribution,
  ReasonDistribution,
  RegimeDistribution,
} from "./calibration-distribution-contracts";

import type { DecisionSample } from "./calibration-sample-contracts";

/* ============================================================================
 * 1. THRESHOLD POLICY
 * ========================================================================== */

export type CalibrationPolicy = {
  allow: number;
  block: number;
  risk: number;
  support: number;
};

/* ============================================================================
 * 2. READABLE THRESHOLDS
 * ========================================================================== */

export type ReadableThresholds = {
  allow: number;
  block: number;
  risk: number;
  support: number;

  allow_raw_score: number;
  block_raw_score: number;
  risk_rupture_probability: number;
  decision_support_probability: number;
};

/* ============================================================================
 * 3. POLICY BUILD INPUT
 * ========================================================================== */

export type PolicyBuildInput = {
  samples: DecisionSample[];
  analytical_version: string;
  horizon: EvaluationHorizon;
};

/* ============================================================================
 * 4. POLICY BUILD RESULT
 * ========================================================================== */

export type PolicyResult = {
  policy: CalibrationPolicy;
  policy_source: CalibrationPolicySource;

  sample_size: number;
  effective_sample_size: number;

  observed_distribution: DecisionDistribution;
  regime_distribution: RegimeDistribution;
  reason_distribution: ReasonDistribution;

  warnings: string[];
};

/* ============================================================================
 * 5. POLICY RESOLUTION
 * ========================================================================== */

export type PolicyResolveInput = {
  regime: CalibrationRegime;

  allow_raw_score: number;
  block_raw_score: number;

  policy: CalibrationPolicy;

  hard_block?: boolean | null;
  hard_allow_candidate?: boolean | null;
};

/* ============================================================================
 * 6. POLICY GOVERNANCE OUTPUT
 * ========================================================================== */

export type ResolvedPolicyResult = {
  policy: CalibrationPolicy;
  readable_thresholds: ReadableThresholds;
  policy_source: CalibrationPolicySource;
  warnings: string[];
};
