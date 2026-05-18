/* ============================================================================
 * FILE: lib/xyvala/engine/mci-market.ts
 * ========================================================================== */

import type {
  MciImpulseDirectionalBias,
  MciImpulseGovernanceState,
  MciImpulseTransitionState,
  MciMarketImpulseLayer,
  MciMarketResult,
  RunMciMarketInput,
} from "./mci/mci-market-types";

import { normalizeData, resolveExecutionMode } from "./mci/mci-market-data";
import { computeCoreScores } from "./mci/mci-market-scoring";
import { resolveDecision } from "./mci/mci-market-gates";
import { buildOutput } from "./mci/mci-market-output";
import { recordMciDecisionSample } from "./mci/mci-market-logger";

/* ============================================================================
 * 1. LOCAL TYPES
 * ========================================================================== */

type MciMarketData = ReturnType<typeof normalizeData>;
type MciMarketScores = ReturnType<typeof computeCoreScores>;
type MciExecutionMode = ReturnType<typeof resolveExecutionMode>;

type OptionalImpulseInput = {
  impulse_pressure_score?: number | null;
  impulse_instability_score?: number | null;
  impulse_saturation_score?: number | null;
  impulse_exhaustion_score?: number | null;
  impulse_directional_bias?: MciImpulseDirectionalBias;
  impulse_transition_state?: MciImpulseTransitionState;
  impulse_status?: string;
};

type ExtendedRunMciMarketInput = RunMciMarketInput & {
  impulse?: OptionalImpulseInput | null;
};

type SafeRecordInput = {
  data: MciMarketData;
  scores: MciMarketScores;
  result: MciMarketResult;
  execution_mode: MciExecutionMode;
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function clampScore(value: unknown): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.round(Math.max(0, Math.min(100, numeric)) * 100) / 100;
}

function nullableScore(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? clampScore(value)
    : null;
}

function resolveRuptureEvolutionState(
  score: number,
): MciMarketResult["rupture_evolution_state"] {
  if (score >= 85) return "explosive";
  if (score >= 65) return "worsening";
  if (score <= 25) return "improving";
  return "stable";
}

/* ============================================================================
 * 3. IMPULSE GOVERNANCE
 * ========================================================================== */

function resolveImpulseGovernanceState(input: {
  impulse_transition_state: MciImpulseTransitionState;
  impulse_pressure_score: number | null;
  impulse_instability_score: number | null;
  impulse_saturation_score: number | null;
  impulse_exhaustion_score: number | null;
  stability: number;
  rupture: number;
}): MciImpulseGovernanceState {
  if (input.impulse_transition_state === "EXHAUSTION") return "defensive";

  if (
    input.impulse_transition_state === "RELEASE" &&
    (input.rupture >= 65 || (input.impulse_instability_score ?? 0) >= 65)
  ) {
    return "restrictive";
  }

  if (
    input.impulse_transition_state === "PRESSURE_BUILDING" &&
    (input.impulse_saturation_score ?? 0) >= 70
  ) {
    return "defensive";
  }

  if (
    input.impulse_transition_state === "COMPRESSION" &&
    input.stability >= 65 &&
    input.rupture <= 45
  ) {
    return "supportive";
  }

  return "neutral";
}

function buildImpulseGovernance(
  input: ExtendedRunMciMarketInput,
  scores: MciMarketScores,
): Partial<MciMarketImpulseLayer> {
  const impulse = input.impulse;

  if (!impulse) {
    return {
      impulse_governance_state: "unavailable",
      impulse_validity: "unavailable",
    };
  }

  const pressure = nullableScore(impulse.impulse_pressure_score);
  const instability = nullableScore(impulse.impulse_instability_score);
  const saturation = nullableScore(impulse.impulse_saturation_score);
  const exhaustion = nullableScore(impulse.impulse_exhaustion_score);

  const transitionState = impulse.impulse_transition_state ?? "NEUTRAL";
  const directionalBias = impulse.impulse_directional_bias ?? "NEUTRAL";

  const governanceState = resolveImpulseGovernanceState({
    impulse_transition_state: transitionState,
    impulse_pressure_score: pressure,
    impulse_instability_score: instability,
    impulse_saturation_score: saturation,
    impulse_exhaustion_score: exhaustion,
    stability: clampScore(scores.stability),
    rupture: clampScore(scores.rupture),
  });

  return {
    impulse_pressure_score: pressure,
    impulse_instability_score: instability,
    impulse_saturation_score: saturation,
    impulse_exhaustion_score: exhaustion,
    impulse_directional_bias: directionalBias,
    impulse_transition_state: transitionState,
    impulse_governance_state: governanceState,
    impulse_validity: pressure === null ? "degraded" : "computed",
  };
}

/* ============================================================================
 * 4. GOVERNANCE PROPAGATION
 * ========================================================================== */

function buildRuptureEvolution(
  scores: MciMarketScores,
): Pick<
  MciMarketResult,
  | "rupture_evolution_score"
  | "rupture_evolution_state"
  | "rupture_acceleration_score"
> {
  const ruptureScore = clampScore(scores.rupture);
  const accelerationScore = clampScore(
    scores.probabilities.risk_rupture_probability,
  );

  const ruptureEvolutionScore = clampScore(
    ruptureScore * 0.6 + accelerationScore * 0.4,
  );

  return {
    rupture_evolution_score: ruptureEvolutionScore,
    rupture_evolution_state: resolveRuptureEvolutionState(
      ruptureEvolutionScore,
    ),
    rupture_acceleration_score: accelerationScore,
  };
}

function buildNeutralization(
  scores: MciMarketScores,
  impulse: Partial<MciMarketImpulseLayer>,
): Pick<
  MciMarketResult,
  | "neutralized"
  | "neutralization_reason"
  | "neutralization_severity"
  | "neutralization_validity"
> {
  const rupture = clampScore(scores.rupture);
  const confidence = clampScore(scores.confidence);
  const convergence = clampScore(scores.convergence);

  if (
    impulse.impulse_governance_state === "restrictive" &&
    rupture >= 65
  ) {
    return {
      neutralized: true,
      neutralization_reason: "excessive_rupture",
      neutralization_severity: rupture >= 80 ? "high" : "medium",
      neutralization_validity: "computed",
    };
  }

  if (
    impulse.impulse_governance_state === "defensive" &&
    confidence < 50
  ) {
    return {
      neutralized: true,
      neutralization_reason: "low_confidence",
      neutralization_severity: confidence < 30 ? "high" : "medium",
      neutralization_validity: "computed",
    };
  }

  if (confidence < 40) {
    return {
      neutralized: true,
      neutralization_reason: "low_confidence",
      neutralization_severity: confidence < 25 ? "high" : "medium",
      neutralization_validity: "computed",
    };
  }

  if (rupture >= 80) {
    return {
      neutralized: true,
      neutralization_reason: "excessive_rupture",
      neutralization_severity: rupture >= 90 ? "critical" : "high",
      neutralization_validity: "computed",
    };
  }

  if (convergence < 35) {
    return {
      neutralized: true,
      neutralization_reason: "contradictory_structure",
      neutralization_severity: "medium",
      neutralization_validity: "computed",
    };
  }

  return {
    neutralized: false,
    neutralization_reason: "none",
    neutralization_severity: "none",
    neutralization_validity: "computed",
  };
}

/* ============================================================================
 * 5. OBSERVABILITY
 * ========================================================================== */

function safeRecordMciDecisionSample(input: SafeRecordInput): void {
  try {
    recordMciDecisionSample({
      decision: input.result.decision,
      execution_mode: input.execution_mode,

      regime: input.data.rfs.states.regime,
      rfs_status: input.data.rfs.states.rfs_status,

      stability: input.scores.stability,
      rupture: input.scores.rupture,
      opportunity: input.result.opportunity_score,
      convergence: input.result.convergence_score,
      confidence: input.result.confidence_score,

      warnings: [...input.result.warnings],
    });
  } catch {
    /**
     * Observability must never break decision output.
     */
  }
}

/* ============================================================================
 * 6. EXECUTION
 * ========================================================================== */

export function runMciMarket(input: RunMciMarketInput): MciMarketResult {
  const extendedInput = input as ExtendedRunMciMarketInput;

  const data = normalizeData(input);
  const executionMode = resolveExecutionMode(input);

  const scores = computeCoreScores(data.rfs);

  const impulseGovernance = buildImpulseGovernance(extendedInput, scores);

  const decision = resolveDecision({
    stability: scores.stability,
    rupture: scores.rupture,
    opportunity: scores.opportunity,
  });

  const ruptureEvolution = buildRuptureEvolution(scores);
  const neutralization = buildNeutralization(scores, impulseGovernance);

  const result: MciMarketResult = {
    ...buildOutput({
      decision,
      opportunity: scores.opportunity,
      convergence: scores.convergence,
      confidence: scores.confidence,
      probabilities: scores.probabilities,
      warnings: [
        `mci_market_execution_mode:${executionMode}`,
        `mci_market_decision:${decision}`,
        `mci_market_confidence:${scores.confidence}`,
        `mci_market_impulse_governance:${
          impulseGovernance.impulse_governance_state ?? "unavailable"
        }`,
        ...(neutralization.neutralized
          ? [`mci_market_neutralized:${neutralization.neutralization_reason}`]
          : []),
        `mci_market_rupture_evolution:${ruptureEvolution.rupture_evolution_state}`,
      ],
    }),

    ...neutralization,
    ...ruptureEvolution,
    ...impulseGovernance,
  };

  safeRecordMciDecisionSample({
    data,
    scores,
    result,
    execution_mode: executionMode,
  });

  return result;
}
