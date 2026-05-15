/* ============================================================================
 * FILE: lib/xyvala/rfs/rfs-types.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala RFS contractual types
 *
 * ROLE
 * - define the canonical private RFS type system
 * - centralize structural, rupture, temporal, quality and audit contracts
 * - prevent dependencies on public scan contracts
 *
 * DIRECTIVES
 * - types only
 * - no runtime logic
 * - no scoring logic
 * - no API logic
 * - no UI logic
 * - no MCI logic
 * - no public scan dependency
 * - RFS remains the private structural source of truth
 * ========================================================================== */

import type { PatternKind } from "@/lib/xyvala/pattern-core";

/* ============================================================================
 * 1. INPUT CONTRACTS
 * ========================================================================== */

export type RfsScoreInput = {
  prices: number[];
  timestamps?: number[];
};

/* ============================================================================
 * 2. SYSTEM STATES
 * ========================================================================== */

export type RfsRegimeState = "STABLE" | "TRANSITION" | "VOLATILE";

export type RfsHistoricalMode =
  | "INSUFFICIENT_HISTORY"
  | "MONTH_TO_MONTH"
  | "YEAR_PHASE_COMPARISON";

export type RfsStatus =
  | "computed"
  | "partial"
  | "insufficient_data"
  | "unavailable";

export type RfsTimingState = "GOOD" | "NEUTRAL" | "BAD";

export type RfsCrashState = "NONE" | "RISING" | "CRASH";

export type RfsCrashStatus =
  | "computed"
  | "baseline_missing"
  | "insufficient_data"
  | "unavailable";

export type RfsDecisionState = "ALLOW" | "WATCH" | "BLOCK";

export type RfsMidTermState = "FAVORABLE" | "NEUTRAL" | "UNFAVORABLE";

/* ============================================================================
 * 3. STRUCTURAL AXES
 * ========================================================================== */

export type RfsStructuralAxisScores = {
  occurrence_score: number;
  frequency_score: number;
  convergence_score: number;
  correlation_score: number;
  duration_score: number;
};

export type RfsPatternAxisScores = {
  pattern_occurrence_score: number;
  pattern_frequency_score: number;
  pattern_convergence_score: number;
  pattern_correlation_score: number;
  pattern_duration_score: number;
};

export type RfsRuptureAxisScores = {
  rupture_occurrence_score: number;
  rupture_frequency_score: number;
  rupture_convergence_score: number;
  rupture_correlation_score: number;
  rupture_duration_score: number;
};

/* ============================================================================
 * 4. TEMPORAL BLOCKS
 * ========================================================================== */

export type Rfs7dBlock = {
  movement_score: number;
  change_pct: number;
  slope_pct: number;
  stability_score: number;
  rupture_score: number;
  rupture_probability: number;
  status: RfsStatus;
};

export type Rfs24hBlock = {
  timing_score: number;
  change_pct: number;
  impulse_score: number;
  stability_score: number;
  rupture_score: number;
  rupture_probability: number;
  status: RfsStatus;
};

/* ============================================================================
 * 5. INTERNAL WINDOWS AND SIGNATURES
 * ========================================================================== */

export type RfsSegmentWindow = {
  startIndex: number;
  endIndex: number;
  prices: number[];
  timestamps: number[];
  phaseIndex: 0 | 1 | 2 | 3;
  year: number;
  month: number;
};

export type RfsSegmentSignature = {
  pattern_type: PatternKind;
  slope_pct: number;
  amplitude_pct: number;
  instability_score: number;
  break_rate: number;
  pattern_quality_score: number;
  duration_score: number;
  size: number;
};
