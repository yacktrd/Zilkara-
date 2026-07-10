/* ============================================================================
 * FILE: lib/xyvala/engine/mci/mci-market-types.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private MCI market type contracts
 *
 * ROLE
 * - define private MCI market input and output contracts
 * - preserve RFS structural truth compatibility
 * - expose private MCI decision, neutralization, rupture evolution, impulse and triple layer fields
 * - keep analytical outputs private and traceability-ready
 *
 * PARENT FILES
 * - lib/xyvala/engine/mci-market.ts
 * - lib/xyvala/engine/rfs-market.ts
 * - lib/xyvala/stores/market-traceability-adapter.ts
 *
 * DIRECTIVES
 * - private contract only
 * - no UI logic
 * - no API logic
 * - no snapshot shaping
 * - no public exposure
 * - no score computation
 * - no decision computation
 * - no calibration computation
 * - no prediction
 * - no investment semantics
 * - RFS remains the structural source of truth
 * - MCI remains the private orchestration layer
 * - Triple Layer remains contextual and subordinate to RFS / rupture / stability
 * - Impulse Layer remains contextual and subordinate to RFS / rupture / stability
 * - null means explicitly unavailable
 * - undefined must never be used as analytical absence
 *
 * INVARIANTS
 * - stability > regime > rupture > rupture evolution > neutralization > triple layer > impulse > opportunity > confidence > decision
 * - RFS structural truth must not be recomputed here
 * - MCI result can contain private fields but must never be exposed publicly without a public-safe transformer
 * - traceability stores may consume this contract privately
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
 * 7. TRIPLE LAYER PRIVATE EXTENSION
 * ========================================================================== */

export type MciTripleLayerState =
  | "growth_dominant"
  | "core_dominant"
  | "decay_dominant"
  | "mixed"
  | "unknown";

export type MciTripleLayerStatus =
  | "computed"
  | "partial"
  | "unavailable";

export type MciMarketTripleLayer = {
  triple_layer_state: MciTripleLayerState;

  growth_score: number | null;
  core_pattern_score: number | null;
  decay_score: number | null;

  growth_status: MciTripleLayerStatus;
  core_status: MciTripleLayerStatus;
  decay_status: MciTripleLayerStatus;
};

/* ============================================================================
 * 8. DIAGNOSTICS
 * ========================================================================== */

export type MciMarketDiagnostics = Record<string, number | boolean | string>;

/* ============================================================================
 * 9. MARKET RESULT
 * ========================================================================== */

export type MciMarketResult =
  MciMarketNeutralization &
  MciMarketRuptureEvolution &
  Partial<MciMarketImpulseLayer> &
  Partial<MciMarketTripleLayer> & {
    decision: MarketDecision;

    opportunity_score: number;
    convergence_score: number;
    confidence_score: number;

    probabilities: MciMarketProbabilities;

    diagnostics: MciMarketDiagnostics;

    warnings: string[];
  };
