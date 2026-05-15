/* ============================================================================
 * FILE: lib/xyvala/decision-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala internal decision core
 *
 * ROLE
 * - compute global decision from engine-level assets
 * - aggregate multi-asset signals into a deterministic decision
 *
 * DIRECTIVES
 * - internal domain only
 * - strictly based on EngineAsset
 * - no ScanAsset usage
 * - no public contract leakage
 * - no UI / API logic
 * - deterministic output only
 * ========================================================================== */

import type { EngineAsset } from "@/lib/xyvala/engine/types/engine-asset";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type Decision = "ALLOW" | "WATCH" | "BLOCK";

export type DecisionSummary = {
  total_count: number;

  stable_count: number;
  transition_count: number;
  volatile_count: number;

  avg_stability_score: number;
  avg_opportunity_score: number;
  avg_confidence_score: number;
  avg_convergence_score: number;

  avg_rupture_score: number;
  avg_rupture_probability: number;
  avg_continuity_probability: number;

  decision: Decision;
};

/* ============================================================================
 * 2. HELPERS
 * ========================================================================== */

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function clamp(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;

  const sum = values.reduce((acc, v) => acc + safeNumber(v), 0);
  return clamp(sum / values.length);
}

/* ============================================================================
 * 3. CORE DECISION LOGIC
 * ========================================================================== */

export function computeDecisionFromScores(input: {
  stability: number;
  opportunity: number;
  confidence: number;
  convergence: number;
  rupture_probability: number;
  continuity_probability: number;
}): Decision {
  const stability = clamp(input.stability);
  const opportunity = clamp(input.opportunity);
  const confidence = clamp(input.confidence);
  const convergence = clamp(input.convergence);
  const rupture = clamp(input.rupture_probability);
  const continuity = clamp(input.continuity_probability);

  /**
   * 1. HARD BLOCK (dominant risk)
   */
  if (stability < 40 || rupture >= 70) {
    return "BLOCK";
  }

  /**
   * 2. ALLOW (rare, high confidence cluster)
   */
  if (
    stability >= 75 &&
    opportunity >= 70 &&
    convergence >= 65 &&
    confidence >= 60 &&
    continuity >= 60 &&
    rupture < 40
  ) {
    return "ALLOW";
  }

  /**
   * 3. DEFAULT
   */
  return "WATCH";
}

/* ============================================================================
 * 4. AGGREGATION
 * ========================================================================== */

export function summarizeDecisionAssets(
  assets: EngineAsset[],
): DecisionSummary {
  const total = assets.length;

  const stable = assets.filter(a => a.regime === "STABLE").length;
  const transition = assets.filter(a => a.regime === "TRANSITION").length;
  const volatile = assets.filter(a => a.regime === "VOLATILE").length;

  const avgStability = average(assets.map(a => a.stability_score));
  const avgOpportunity = average(assets.map(a => a.opportunity_score));
  const avgConfidence = average(assets.map(a => a.confidence_score));
  const avgConvergence = average(assets.map(a => a.convergence_score));

  const avgRuptureScore = average(assets.map(a => a.rupture_score));
  const avgRuptureProb = average(assets.map(a => a.rupture_probability));
  const avgContinuity = average(assets.map(a => a.continuity_probability));

  const decision = computeDecisionFromScores({
    stability: avgStability,
    opportunity: avgOpportunity,
    confidence: avgConfidence,
    convergence: avgConvergence,
    rupture_probability: avgRuptureProb,
    continuity_probability: avgContinuity,
  });

  return {
    total_count: total,

    stable_count: stable,
    transition_count: transition,
    volatile_count: volatile,

    avg_stability_score: avgStability,
    avg_opportunity_score: avgOpportunity,
    avg_confidence_score: avgConfidence,
    avg_convergence_score: avgConvergence,

    avg_rupture_score: avgRuptureScore,
    avg_rupture_probability: avgRuptureProb,
    avg_continuity_probability: avgContinuity,

    decision,
  };
}
