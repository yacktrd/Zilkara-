/* ============================================================================
 * FILE: lib/xyvala/calibration/contracts/calibration-core-contracts.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala calibration core contracts
 *
 * ROLE
 * - define stable calibration primitive enums and shared core states
 * - provide canonical values used by samples, policy, governance and runtime
 * - prevent free-form critical values across calibration modules
 *
 * DIRECTIVES
 * - contracts only
 * - no runtime logic
 * - no persistence logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no UI/API logic
 * - one concept = one canonical name
 * - one name = one concept
 * - no legacy aliases in this file
 *
 * INPUTS
 * - none
 *
 * OUTPUTS
 * - shared primitive calibration contracts
 *
 * INVARIANTS
 * - all exported unions are closed sets
 * - no string-free critical states
 * - no decision, regime, horizon, validity or reliability duplication
 *
 * CRITICAL DEPENDENCIES
 * - none
 *
 * SENSITIVE ZONES
 * - decision values
 * - regime values
 * - horizon values
 * - validity states
 * - dominance states
 * ========================================================================== */

/* ============================================================================
 * 1. DECISION / REGIME / HORIZON
 * ========================================================================== */

export type CalibrationDecision = "ALLOW" | "WATCH" | "BLOCK";

export type CalibrationRegime = "STABLE" | "TRANSITION" | "VOLATILE";

export type EvaluationHorizon = "24H" | "7D" | "14D" | "30D" | "default";

export type CalibrationVersion = "v8" | string;

/* ============================================================================
 * 2. CALIBRATION MATURITY / POLICY SOURCE
 * ========================================================================== */

export type CalibrationMaturity =
  | "INSUFFICIENT_SAMPLES"
  | "BOOTSTRAP_ACTIVE"
  | "CALIBRATED_ACTIVE";

export type CalibrationPolicySource =
  | "fallback"
  | "bootstrap"
  | "calibrated";

/* ============================================================================
 * 3. VALIDITY / RELIABILITY / PRESSURE
 * ========================================================================== */

export type ValidityState =
  | "computed"
  | "invalid"
  | "insufficient_data"
  | "unavailable"
  | "degraded";

export type ReliabilityLevel = "high" | "medium" | "low" | "none";

export type PressureState =
  | "LOW"
  | "NORMAL"
  | "ELEVATED"
  | "EXCESSIVE";

/* ============================================================================
 * 4. DOMINANCE
 * ========================================================================== */

export type DominanceState =
  | "recovery_dominant"
  | "rupture_dominant"
  | "balanced"
  | "unknown";
