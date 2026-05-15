/* ============================================================================
 * FILE: lib/xyvala/engine/mci/mci-market-types.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - centralize all MCI market types
 * - enforce strict typing across tri-block architecture
 * - expose MCI market output contracts for orchestration and calibration mapping
 *
 * DIRECTIVES
 * - types only
 * - no logic here
 * - no runtime calculation
 * - no adaptive calibration dependency
 * - no UI logic
 * - no API logic
 * - reusable across all MCI modules
 * - source contracts must be explicit
 * ========================================================================== */

import type { RfsMarketResult } from "@/lib/xyvala/engine/rfs-market";
import type { BehaviorContract } from "@/lib/xyvala/contracts/behavior-contract";
import type { LiveCoreOutput } from "@/lib/xyvala/live/live-core";

import type {
  NeutralizationReason,
  NeutralizationSeverity,
  RuptureEvolutionState,
  ValidityState,
} from "@/lib/xyvala/calibration/calibration-contracts";

/* ============================================================================
 * 1. CORE TYPES
 * ========================================================================== */

export type MarketDecision = "ALLOW" | "WATCH" | "BLOCK";

export type RunMciMarketInput = {
  rfs: RfsMarketResult;
  behavior?: BehaviorContract | null;
  historicalPatterns?: unknown[];
  liveSupport?: LiveCoreOutput | null;
};

/* ============================================================================
 * 2. EXECUTION MODE
 * ========================================================================== */

export type MciExecutionMode =
  | "FULL_CONTEXT"
  | "NO_HISTORY"
  | "NO_LIVE"
  | "SNAPSHOT_ONLY";

/* ============================================================================
 * 3. PROBABILITIES
 * ========================================================================== */

export type MciMarketProbabilities = {
  risk_rupture_probability: number;
  decision_support_probability: number;
  recovery_probability: number;
  temporal_coherence_probability: number;
  temporal_support_probability: number;
};

/* ============================================================================
 * 4. NEUTRALIZATION
 * ========================================================================== */

export type MciMarketNeutralization = {
  neutralized: boolean;
  neutralization_reason: NeutralizationReason;
  neutralization_severity: NeutralizationSeverity;
  neutralization_validity: ValidityState;
};

/* ============================================================================
 * 5. RUPTURE EVOLUTION
 * ========================================================================== */

export type MciMarketRuptureEvolution = {
  rupture_evolution_score: number;
  rupture_evolution_state: RuptureEvolutionState;
  rupture_acceleration_score: number;
};

/* ============================================================================
 * 6. DIAGNOSTICS
 * ========================================================================== */

export type MciMarketDiagnostics = Record<string, number | boolean | string>;

/* ============================================================================
 * 7. MARKET RESULT
 * ========================================================================== */

export type MciMarketResult = MciMarketNeutralization &
  MciMarketRuptureEvolution & {
    decision: MarketDecision;

    opportunity_score: number;
    convergence_score: number;
    confidence_score: number;

    probabilities: MciMarketProbabilities;

    diagnostics: MciMarketDiagnostics;

    warnings: string[];
  };
