/* ============================================================================
 * FILE: lib/xyvala/engine/mci-orchestrator.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala final decision orchestrator V3
 *
 * ROLE
 * - orchestrate final Xyvala decision through a strict deterministic funnel
 * - consume calibration resolved thresholds
 * - propagate MCI market governance signals
 * - append contract-complete DecisionSampleInput entries through mapper boundary
 *
 * DIRECTIVES
 * - FR/EU compliance by default
 * - EUR monetary reference by default
 * - no personalized financial advice
 * - no public exploitable trading decision
 * - orchestration only
 * - no sample mapping here
 * - no UI logic here
 * - no API logic here
 * - no mutation of analytical core
 * - no scoring recomputation
 * - no calibration mutation
 * - deterministic outputs only
 * - same input => same output shape
 *
 * INVARIANTS
 * - MCI market core is executed before decision funnel
 * - calibration only resolves thresholds
 * - governance signals are read from core, never from funnel
 * - sample construction is delegated to mci-sample-mapper.ts
 * - store append is isolated from decision construction
 * ========================================================================== */

import { runMciMarket } from "@/lib/xyvala/engine/mci-market";

import type {
  RunMciMarketInput,
} from "@/lib/xyvala/engine/mci/mci-market-types";

import {
  runMciDecisionFunnel,
  type MciFunnelDecision,
  type MciFunnelDecisionReason,
  type MciFunnelDominanceState,
  type MciFunnelRegime,
  type MciFunnelThresholds,
} from "@/lib/xyvala/engine/mci-decision-funnel";

import { runCalibrationOrchestrator } from "@/lib/xyvala/calibration/calibration-orchestrator";
import { appendDecisionDistributionSample } from "@/lib/xyvala/calibration/decision-distribution-store";

import type {
  CalibrationPolicySource,
  EvaluationHorizon,
  NeutralizationReason,
  NeutralizationSeverity,
  RuptureEvolutionState,
  ValidityState,
} from "@/lib/xyvala/calibration/calibration-contracts";

import {
  buildMciDecisionSample,
  resolveCoreDecision,
  resolveMciDominanceState,
} from "@/lib/xyvala/engine/mci/mci-sample-mapper";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type OrchestratedDecision = MciFunnelDecision;
export type OrchestratedRegime = MciFunnelRegime;
export type OrchestratedDominanceState = MciFunnelDominanceState;
export type OrchestratedDecisionReason = MciFunnelDecisionReason;

export type RunMciOrchestratorInput = RunMciMarketInput & {
  asset_id?: string | null;
  symbol?: string | null;
  analytical_version?: string | null;
  horizon?: EvaluationHorizon | string | null;
  min_calibration_sample_size?: number | null;

  /**
   * Deprecated transition field.
   * Reintroduce only through calibration policy governance if needed.
   */
  refresh_calibration?: boolean;
};

export type MciOrchestratorThresholds = MciFunnelThresholds;

export type RunMciOrchestratorResult = {
  decision: OrchestratedDecision;
  regime: OrchestratedRegime;
  core_decision: string;

  decision_reason: OrchestratedDecisionReason;
  calibration_source: CalibrationPolicySource;
  analytical_version: string;
  horizon: EvaluationHorizon;

  stability: number;
  opportunity: number;
  convergence: number;
  confidence: number;

  decision_score: number;
  allow_raw_score: number;
  block_raw_score: number;

  risk_rupture_probability: number;
  decision_support_probability: number;
  recovery_probability: number;
  recovery_rupture_dominance: number;

  neutralized: boolean;
  neutralization_reason: NeutralizationReason;
  neutralization_severity: NeutralizationSeverity;
  neutralization_validity: ValidityState;

  rupture_evolution_score: number;
  rupture_evolution_state: RuptureEvolutionState;
  rupture_acceleration_score: number;

  dominance_state: OrchestratedDominanceState;

  hard_block: boolean;
  hard_allow_candidate: boolean;

  stability_status: "computed";
  opportunity_status: "computed";
  convergence_status: "computed";
  confidence_status: "computed";
  decision_score_status: "computed";
  risk_rupture_probability_status: "computed";
  decision_support_probability_status: "computed";
  recovery_probability_status: "computed";
  recovery_rupture_dominance_status: "computed";
  neutralization_status: "computed";
  rupture_evolution_status: "computed";

  sample_reliability: "high";

  meta: {
    analytical_version: string;
    horizon: EvaluationHorizon;
    calibration_source: CalibrationPolicySource;
    decision_reason: OrchestratedDecisionReason;
    thresholds: MciOrchestratorThresholds;
    sample_stored: boolean;
  };
};

/* ============================================================================
 * 2. CONFIG
 * ========================================================================== */

const DEFAULT_ANALYTICAL_VERSION = "v8";
const DEFAULT_HORIZON: EvaluationHorizon = "7D";

const STATIC_DEFAULT_THRESHOLDS: MciOrchestratorThresholds = {
  allow_raw_score: 60,
  block_raw_score: 62,
  risk_rupture_probability: 72,
  decision_support_probability: 62,
};

/* ============================================================================
 * 3. HELPERS
 * ========================================================================== */

function safeNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeString(value: unknown, fallback = "unknown"): string {
  if (typeof value !== "string") return fallback;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function clampScore(value: unknown): number {
  const parsed = safeNumber(value, 0);
  return Math.round(Math.max(0, Math.min(100, parsed)) * 100) / 100;
}

function isEvaluationHorizon(value: unknown): value is EvaluationHorizon {
  return (
    value === "24H" ||
    value === "7D" ||
    value === "14D" ||
    value === "30D" ||
    value === "default"
  );
}

function resolveHorizon(value: unknown): EvaluationHorizon {
  return isEvaluationHorizon(value) ? value : DEFAULT_HORIZON;
}

function resolveRegime(value: unknown): OrchestratedRegime {
  if (value === "STABLE") return "STABLE";
  if (value === "VOLATILE") return "VOLATILE";
  return "TRANSITION";
}

function resolveMinSampleSize(value: unknown): number | undefined {
  const parsed = Math.trunc(safeNumber(value, 0));
  return parsed > 0 ? parsed : undefined;
}

function resolveCalibration(input: {
  analytical_version: string;
  horizon: EvaluationHorizon;
  min_sample_size?: number;
}): {
  thresholds: MciOrchestratorThresholds;
  source: CalibrationPolicySource;
} {
  try {
    const calibrationResult = runCalibrationOrchestrator({
      analytical_version: input.analytical_version,
      horizon: input.horizon,
      ...(input.min_sample_size !== undefined && {
        min_sample_size: input.min_sample_size,
      }),
      persist_state: true,
    });

    const resolved = calibrationResult.meta.resolved_thresholds;

    return {
      thresholds: {
        allow_raw_score: clampScore(resolved.allow),
        block_raw_score: clampScore(resolved.block),
        risk_rupture_probability: clampScore(resolved.risk),
        decision_support_probability: clampScore(resolved.support),
      },
      source: calibrationResult.meta.policy_source,
    };
  } catch {
    return {
      thresholds: STATIC_DEFAULT_THRESHOLDS,
      source: "fallback",
    };
  }
}

/* ============================================================================
 * 4. MAIN
 * ========================================================================== */

export function runMciOrchestrator(
  input: RunMciOrchestratorInput,
): RunMciOrchestratorResult {
  const analyticalVersion = safeString(
    input.analytical_version,
    DEFAULT_ANALYTICAL_VERSION,
  );

  const horizon = resolveHorizon(input.horizon);

  const minSampleSize = resolveMinSampleSize(
    input.min_calibration_sample_size,
  );

  const calibration = resolveCalibration({
    analytical_version: analyticalVersion,
    horizon,
    ...(minSampleSize !== undefined && {
      min_sample_size: minSampleSize,
    }),
  });

  const core = runMciMarket(input);
  const probabilities = core.probabilities;

  const rfsScores = input.rfs?.scores;
  const rfsStates = input.rfs?.states;
  const rfsProbabilities = input.rfs?.probabilities;

  const regime = resolveRegime(rfsStates?.regime);

  const stability = clampScore(rfsScores?.stability);
  const opportunity = clampScore(core.opportunity_score);
  const convergence = clampScore(core.convergence_score);
  const confidence = clampScore(core.confidence_score);

  const risk = clampScore(
    probabilities.risk_rupture_probability ??
      rfsProbabilities?.rupture_probability,
  );

  const support = clampScore(probabilities.decision_support_probability);
  const recovery = clampScore(probabilities.recovery_probability);

  const temporalCoherence = clampScore(
    probabilities.temporal_coherence_probability,
  );

  const temporalSupport = clampScore(
    probabilities.temporal_support_probability,
  );

  const dominance = resolveMciDominanceState(core);

  const funnel = runMciDecisionFunnel({
    regime,

    stability,
    opportunity,
    convergence,
    confidence,

    risk_rupture_probability: risk,
    decision_support_probability: support,
    recovery_probability: recovery,

    temporal_coherence_probability: temporalCoherence,
    temporal_support_probability: temporalSupport,

    dominance_state: dominance,

    thresholds: calibration.thresholds,
  });

  const now = Date.now();

  const decisionScore = clampScore(funnel.decision_score);
  const allowRawScore = clampScore(funnel.allow_raw_score);
  const blockRawScore = clampScore(funnel.block_raw_score);

  const recoveryRuptureDominance = clampScore(
    funnel.recovery_rupture_dominance,
  );

  const sample = buildMciDecisionSample({
    now,

    analytical_version: analyticalVersion,
    horizon,
    calibration_source: calibration.source,

    regime,
    core,

    funnel: {
      decision: funnel.decision,
      decision_reason: funnel.decision_reason,

      decision_score: decisionScore,
      allow_raw_score: allowRawScore,
      block_raw_score: blockRawScore,

      recovery_rupture_dominance: recoveryRuptureDominance,

      hard_block: funnel.hard_block,
      hard_allow_candidate: funnel.hard_allow_candidate,
    },

    stability,
    opportunity,
    convergence,
    confidence,

    risk_rupture_probability: risk,
    decision_support_probability: support,
    recovery_probability: recovery,

    dominance,
    sample_reliability: "high",
  });

  const appendResult = appendDecisionDistributionSample(sample);

  return {
    decision: funnel.decision,
    regime,
    core_decision: resolveCoreDecision(core),

    decision_reason: funnel.decision_reason,
    calibration_source: calibration.source,
    analytical_version: analyticalVersion,
    horizon,

    stability,
    opportunity,
    convergence,
    confidence,

    decision_score: decisionScore,
    allow_raw_score: allowRawScore,
    block_raw_score: blockRawScore,

    risk_rupture_probability: risk,
    decision_support_probability: support,
    recovery_probability: recovery,
    recovery_rupture_dominance: recoveryRuptureDominance,

    neutralized: core.neutralized,
    neutralization_reason: core.neutralization_reason,
    neutralization_severity: core.neutralization_severity,
    neutralization_validity: core.neutralization_validity,

    rupture_evolution_score: core.rupture_evolution_score,
    rupture_evolution_state: core.rupture_evolution_state,
    rupture_acceleration_score: core.rupture_acceleration_score,

    dominance_state: dominance,

    hard_block: funnel.hard_block,
    hard_allow_candidate: funnel.hard_allow_candidate,

    stability_status: "computed",
    opportunity_status: "computed",
    convergence_status: "computed",
    confidence_status: "computed",
    decision_score_status: "computed",
    risk_rupture_probability_status: "computed",
    decision_support_probability_status: "computed",
    recovery_probability_status: "computed",
    recovery_rupture_dominance_status: "computed",
    neutralization_status: "computed",
    rupture_evolution_status: "computed",

    sample_reliability: "high",

    meta: {
      analytical_version: analyticalVersion,
      horizon,
      calibration_source: calibration.source,
      decision_reason: funnel.decision_reason,
      thresholds: calibration.thresholds,
      sample_stored: appendResult.ok,
    },
  };
}
