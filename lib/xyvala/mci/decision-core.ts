/* ============================================================================
 * FILE: lib/xyvala/mci/decision-core.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - map opportunity + probabilities to internal decision
 * ========================================================================== */

export type EngineDecision = "ALLOW" | "WATCH" | "BLOCK";

export type DecisionInput = {
  stability: number;
  opportunity: number;
  continuity_probability: number;

  /**
   * Legacy migration field.
   */
  continuation_probability?: number;
};

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function resolveContinuityProbability(input: DecisionInput): number {
  return safeNumber(
    input.continuity_probability ?? input.continuation_probability,
    0,
  );
}

export function computeDecision(input: DecisionInput): EngineDecision {
  const stability = safeNumber(input.stability, 0);
  const opportunity = safeNumber(input.opportunity, 0);
  const continuityProbability = resolveContinuityProbability(input);

  if (stability < 40) return "BLOCK";

  if (
    stability > 70 &&
    opportunity > 65 &&
    continuityProbability > 0.6
  ) {
    return "ALLOW";
  }

  return "WATCH";
}
