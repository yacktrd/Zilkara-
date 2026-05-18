/* ============================================================================
 * FILE: lib/xyvala/engine/mci/mci-market-types.ts
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

export type MciMarketStatus =
  | "VALID"
  | "PARTIAL"
  | "DEGRADED"
  | "INVALID"
  | "UNAVAILABLE";

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
 * 3. RFS COMPATIBILITY CONTRACTS
 * ========================================================================== */

export type MciMarketRfsScores = {
  occurrence: number;
  convergence: number;
  duration: number;
  frequency: number;
  correlation: number;

  stability: number;
  rupture: number;
  opportunity: number;
  confidence: number;
};

export type MciMarketProbabilities = {
  risk_rupture_probability: number;
  decision_support_probability: number;
  recovery_probability: number;
  temporal_coherence_probability: number;
  temporal_support_probability: number;
};

export type MciMarketRfsStates = {
  regime: "STABLE" | "TRANSITION" | "VOLATILE";
  rfs_status: MciMarketStatus;
};

export type MciMarketRfsInput = {
  scores: MciMarketRfsScores;
  states: MciMarketRfsStates;
  probabilities: MciMarketProbabilities;
  warnings?: string[];
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
 * 6. IMPULSE PRIVATE EXTENSION
 * ========================================================================== */

export type MciImpulseDirectionalBias =
  | "UP"
  | "DOWN"
  | "MIXED"
  | "NEUTRAL";

export type MciImpulseTransitionState =
  | "COMPRESSION"
  | "PRESSURE_BUILDING"
  | "RELEASE"
  | "EXHAUSTION"
  | "NEUTRAL";

export type MciImpulseGovernanceState =
  | "neutral"
  | "supportive"
  | "defensive"
  | "restrictive"
  | "blocked"
  | "unavailable";

export type MciMarketImpulseLayer = {
  impulse_pressure_score: number | null;
  impulse_instability_score: number | null;
  impulse_saturation_score: number | null;
  impulse_exhaustion_score: number | null;

  impulse_directional_bias: MciImpulseDirectionalBias;
  impulse_transition_state: MciImpulseTransitionState;

  impulse_governance_state: MciImpulseGovernanceState;
  impulse_validity: ValidityState;
};

/* ============================================================================
 * 7. DIAGNOSTICS
 * ========================================================================== */

export type MciMarketDiagnostics = Record<string, number | boolean | string>;

/* ============================================================================
 * 8. MARKET RESULT
 * ========================================================================== */

export type MciMarketResult =
  MciMarketNeutralization &
  MciMarketRuptureEvolution &
  Partial<MciMarketImpulseLayer> & {
    decision: MarketDecision;

    opportunity_score: number;
    convergence_score: number;
    confidence_score: number;

    probabilities: MciMarketProbabilities;

    diagnostics: MciMarketDiagnostics;

    warnings: string[];
  };
