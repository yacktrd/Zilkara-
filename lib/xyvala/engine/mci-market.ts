/* ============================================================================
 * FILE: lib/xyvala/engine/mci-market.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala MCI market orchestrator
 *
 * ROLE
 * - orchestrate the MCI market decision flow
 * - preserve strict tri-block architecture
 * - execute DATA -> SCORING -> DECISION -> OUTPUT -> OBSERVABILITY
 * - propagate governance signals without recalculating RFS or MCI
 *
 * DIRECTIVES
 * - orchestrator only
 * - no scoring logic
 * - no probability reconstruction
 * - no confidence recomputation
 * - no gate logic
 * - no UI logic
 * - no API logic
 * - deterministic decision flow
 * - observability failure must never break output
 * ========================================================================== */

import type {
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

function resolveRuptureEvolutionState(
  score: number,
): MciMarketResult["rupture_evolution_state"] {
  if (score >= 85) return "explosive";
  if (score >= 65) return "worsening";
  if (score <= 25) return "improving";
  return "stable";
}

/* ============================================================================
 * 3. GOVERNANCE PROPAGATION
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
 * 4. OBSERVABILITY — SIDE EFFECT ISOLATION
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
 * 5. EXECUTION — PUBLIC ORCHESTRATOR
 * ========================================================================== */

export function runMciMarket(input: RunMciMarketInput): MciMarketResult {
  const data = normalizeData(input);
  const executionMode = resolveExecutionMode(input);

  const scores = computeCoreScores(data.rfs);

  const decision = resolveDecision({
    stability: scores.stability,
    rupture: scores.rupture,
    opportunity: scores.opportunity,
  });

  const ruptureEvolution = buildRuptureEvolution(scores);
  const neutralization = buildNeutralization(scores);

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
        ...(neutralization.neutralized
          ? [`mci_market_neutralized:${neutralization.neutralization_reason}`]
          : []),
        `mci_market_rupture_evolution:${ruptureEvolution.rupture_evolution_state}`,
      ],
    }),

    ...neutralization,
    ...ruptureEvolution,
  };

  safeRecordMciDecisionSample({
    data,
    scores,
    result,
    execution_mode: executionMode,
  });

  return result;
}
