/* ============================================================================
 * FILE: lib/xyvala/engine/mci/mci-market-scoring.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala MCI market scoring
 *
 * ROLE
 * - compute MCI market scores
 * - compute MCI market probabilities
 * - compute confidence_score as analytical reliability
 * - no decision here
 *
 * DIRECTIVES
 * - scoring only
 * - no gate logic
 * - no calibration logic
 * - no store logic
 * - no UI/API logic
 * - no decision output here
 * - confidence measures analysis reliability, not market attractiveness
 * - probabilities are analytical context, not recommendations
 * - same input => same output
 * ========================================================================== */

import type { RfsMarketResult } from "@/lib/xyvala/engine/rfs-market";

import type { MciMarketProbabilities } from "./mci-market-types";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type MciCoreScores = {
  stability: number;
  rupture: number;
  convergence: number;
  opportunity: number;
  confidence: number;
  probabilities: MciMarketProbabilities;
};

/* ============================================================================
 * 2. HELPERS
 * ========================================================================== */

function clampScore(value: unknown): number {
  const parsed = typeof value === "number" && Number.isFinite(value) ? value : 0;

  if (parsed < 0) return 0;
  if (parsed > 100) return 100;

  return Math.round(parsed * 100) / 100;
}

function average(values: number[]): number {
  const clean = values.filter((value) => Number.isFinite(value));

  if (clean.length === 0) return 0;

  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

/* ============================================================================
 * 3. CONFIDENCE SCORE
 * ========================================================================== */

function computeConfidenceScore(input: {
  stability: number;
  rupture: number;
  convergence: number;
  opportunity: number;
  frequency: number;
  duration: number;
  correlation: number;
}): number {
  const stability = clampScore(input.stability);
  const rupture = clampScore(input.rupture);
  const convergence = clampScore(input.convergence);
  const opportunity = clampScore(input.opportunity);
  const frequency = clampScore(input.frequency);
  const duration = clampScore(input.duration);
  const correlation = clampScore(input.correlation);

  const internalConsistency = clampScore(
    100 -
      Math.abs(stability - convergence) * 0.35 -
      Math.abs(convergence - opportunity) * 0.25 -
      Math.abs(stability - opportunity) * 0.2,
  );

  const structureReliability = clampScore(
    stability * 0.28 +
      convergence * 0.24 +
      frequency * 0.16 +
      duration * 0.14 +
      correlation * 0.12 +
      internalConsistency * 0.06,
  );

  const rupturePenalty = clampScore(rupture * 0.38);

  return clampScore(structureReliability - rupturePenalty);
}

/* ============================================================================
 * 4. PROBABILITY CONTEXT
 * ========================================================================== */

function computeProbabilities(input: {
  stability: number;
  rupture: number;
  convergence: number;
  opportunity: number;
  confidence: number;
  correlation: number;
  duration: number;
}): MciMarketProbabilities {
  const riskRuptureProbability = clampScore(input.rupture);

  const decisionSupportProbability = clampScore(
    input.stability * 0.28 +
      input.convergence * 0.28 +
      input.opportunity * 0.22 +
      input.confidence * 0.12 +
      (100 - input.rupture) * 0.1,
  );

  const recoveryProbability = clampScore(
    (100 - input.rupture) * 0.35 +
      input.stability * 0.25 +
      input.convergence * 0.2 +
      input.duration * 0.1 +
      input.correlation * 0.1,
  );

  const temporalCoherenceProbability = clampScore(
    input.confidence * 0.4 +
      input.convergence * 0.3 +
      input.duration * 0.2 +
      input.correlation * 0.1,
  );

  const temporalSupportProbability = clampScore(
    input.opportunity * 0.35 +
      input.convergence * 0.25 +
      input.stability * 0.2 +
      input.confidence * 0.2,
  );

  return {
    risk_rupture_probability: riskRuptureProbability,
    decision_support_probability: decisionSupportProbability,
    recovery_probability: recoveryProbability,
    temporal_coherence_probability: temporalCoherenceProbability,
    temporal_support_probability: temporalSupportProbability,
  };
}

/* ============================================================================
 * 5. PUBLIC SCORING
 * ========================================================================== */

export function computeCoreScores(rfs: RfsMarketResult): MciCoreScores {
  const stability = clampScore(rfs.scores.stability);
  const rupture = clampScore(rfs.scores.rupture);

  const rawCorrelation = clampScore(rfs.scores.correlation);
  const rawConvergence = clampScore(rfs.scores.convergence);

  const frequency = clampScore(
    rfs.scores.frequency ?? rawConvergence,
  );

  const duration = clampScore(
    rfs.scores.duration ?? stability,
  );

  const convergence = clampScore(
    rawConvergence * 0.5 + rawCorrelation * 0.5,
  );

  const opportunity = clampScore(
    stability * 0.5 + convergence * 0.3 + (100 - rupture) * 0.2,
  );

  const confidence = computeConfidenceScore({
    stability,
    rupture,
    convergence,
    opportunity,
    frequency,
    duration,
    correlation: rawCorrelation,
  });

  const probabilities = computeProbabilities({
    stability,
    rupture,
    convergence,
    opportunity,
    confidence,
    correlation: rawCorrelation,
    duration,
  });

  return {
    stability,
    rupture,
    convergence,
    opportunity,
    confidence,
    probabilities,
  };
}
