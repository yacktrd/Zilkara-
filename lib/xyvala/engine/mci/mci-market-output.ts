/* ============================================================================
 * FILE: lib/xyvala/engine/mci/mci-market-output.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - build final MCI market output contract
 * - materialize required governance fields with neutral defaults
 * - NO recalculation
 * - strict propagation only
 * ========================================================================== */

import type {
  MarketDecision,
  MciMarketProbabilities,
  MciMarketResult,
} from "./mci-market-types";

/* ============================================================================
 * 1. HELPERS
 * ========================================================================== */

function safeNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampScore(value: unknown): number {
  const numeric = safeNumber(value, 0);

  if (numeric < 0) return 0;
  if (numeric > 100) return 100;

  return Math.round(numeric * 100) / 100;
}

function normalizeWarnings(warnings?: string[]): string[] {
  return Array.isArray(warnings)
    ? warnings.filter(
        (warning): warning is string =>
          typeof warning === "string" && warning.trim().length > 0,
      )
    : [];
}

function normalizeProbabilities(
  probabilities: MciMarketProbabilities,
): MciMarketProbabilities {
  return {
    risk_rupture_probability: clampScore(
      probabilities.risk_rupture_probability,
    ),

    decision_support_probability: clampScore(
      probabilities.decision_support_probability,
    ),

    recovery_probability: clampScore(probabilities.recovery_probability),

    temporal_coherence_probability: clampScore(
      probabilities.temporal_coherence_probability,
    ),

    temporal_support_probability: clampScore(
      probabilities.temporal_support_probability,
    ),
  };
}

/* ============================================================================
 * 2. MAIN OUTPUT BUILDER
 * ========================================================================== */

export function buildOutput(input: {
  decision: MarketDecision;

  opportunity: number;

  convergence: number;

  confidence: number;

  probabilities: MciMarketProbabilities;

  warnings?: string[];
}): MciMarketResult {
  return {
    decision: input.decision,

    opportunity_score: clampScore(input.opportunity),

    convergence_score: clampScore(input.convergence),

    confidence_score: clampScore(input.confidence),

    probabilities: normalizeProbabilities(input.probabilities),

    diagnostics: {},

    warnings: normalizeWarnings(input.warnings),

    neutralized: false,

    neutralization_reason: "none",

    neutralization_severity: "none",

    neutralization_validity: "computed",

    rupture_evolution_score: 0,

    rupture_evolution_state: "unknown",

    rupture_acceleration_score: 0,
  };
}
