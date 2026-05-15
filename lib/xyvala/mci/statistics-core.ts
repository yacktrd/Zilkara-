/* ============================================================================
 * FILE: lib/xyvala/mci/statistics-core.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - compute weighted statistical probabilities from historical matches
 * - integrate similarity-aware historical evidence into market MCI
 * - preserve deterministic and auditable probability outputs
 *
 * PARENTS
 * - lib/xyvala/mci/matching-core.ts
 * - lib/xyvala/engine/mci-market.ts
 *
 * DIRECTIVES
 * - deterministic only
 * - no external dependency
 * - no provider parsing
 * - no decision logic here
 * - same input => same output
 *
 * INPUTS
 * - weighted historical match set
 *
 * OUTPUTS
 * - continuation / correction probabilities
 * - confidence score
 * - weighted totals
 *
 * INVARIANTS
 * - probabilities remain in [0, 100]
 * - confidence remains in [0, 100]
 * - output remains stable for identical input
 *
 * SENSITIVE ZONES
 * - similarity weighting
 * - optional structural weighting
 * - recency decay
 * ========================================================================== */

import type { MatchResult } from "@/lib/xyvala/mci/matching-core";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type PatternOutcome = "CONTINUATION" | "CORRECTION";

export interface HistoricalPattern {
  outcome: PatternOutcome;

  match: MatchResult;

  occurrence?: number;
  convergence?: number;
  duration?: number;
  frequency?: number;
  correlation?: number;

  recency?: number; // 0 = most recent, higher = older
}

export interface StatsOutput {
  continuation_probability: number;
  correction_probability: number;
  confidence: number;

  weighted_total: number;
  continuation_weight: number;
  correction_weight: number;

  sample_size: number;
  valid_matches: number;

  warnings: string[];
}

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

function safeAxisScore(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return clampScore(value);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [
    ...new Set(
      merged.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      ),
    ),
  ];
}

/* ============================================================================
 * 3. WEIGHT BUILDERS
 * ----------------------------------------------------------------------------
 * ROLE
 * - transform a historical pattern into a weighted statistical contribution
 * - preserve OCC / CONV / DUR / FREQ / CORR as weighting enrichments
 * ========================================================================== */

function computeAxesWeight(pattern: HistoricalPattern): number {
  const occurrence = safeAxisScore(pattern.occurrence);
  const convergence = safeAxisScore(pattern.convergence);
  const duration = safeAxisScore(pattern.duration);
  const frequency = safeAxisScore(pattern.frequency);
  const correlation = safeAxisScore(pattern.correlation);

  const available = [
    occurrence,
    convergence,
    duration,
    frequency,
    correlation,
  ].filter((value): value is number => value !== null);

  if (available.length === 0) {
    return 50;
  }

  return clampScore(
    (occurrence ?? 50) * 0.2 +
      (convergence ?? 50) * 0.25 +
      (duration ?? 50) * 0.2 +
      (frequency ?? 50) * 0.2 +
      (correlation ?? 50) * 0.15,
  );
}

function computeRecencyFactor(recency: number | undefined): number {
  if (typeof recency !== "number" || !Number.isFinite(recency) || recency < 0) {
    return 1;
  }

  // Soft exponential decay.
  return Math.exp(-0.1 * recency);
}

function computePatternWeight(pattern: HistoricalPattern): number {
  const similarity = clampScore(pattern.match.weighted_similarity_score);
  const axesWeight = computeAxesWeight(pattern);
  const recencyFactor = computeRecencyFactor(pattern.recency);

  const baseWeight = clampScore(
    similarity * 0.65 +
      axesWeight * 0.35,
  );

  return clampScore(baseWeight * recencyFactor);
}

/* ============================================================================
 * 4. PUBLIC API
 * ========================================================================== */

export function computeProbabilities(
  patterns: HistoricalPattern[],
): StatsOutput {
  const warnings: string[] = [];
  const sampleSize = patterns.length;

  if (sampleSize === 0) {
    return {
      continuation_probability: 0,
      correction_probability: 0,
      confidence: 0,

      weighted_total: 0,
      continuation_weight: 0,
      correction_weight: 0,

      sample_size: 0,
      valid_matches: 0,

      warnings: ["statistics_no_patterns"],
    };
  }

  const validPatterns = patterns.filter((pattern) => pattern.match.comparable);
  const validMatches = validPatterns.length;

  if (validMatches === 0) {
    return {
      continuation_probability: 0,
      correction_probability: 0,
      confidence: 0,

      weighted_total: 0,
      continuation_weight: 0,
      correction_weight: 0,

      sample_size: sampleSize,
      valid_matches: 0,

      warnings: ["statistics_no_valid_matches"],
    };
  }

  let continuationWeight = 0;
  let correctionWeight = 0;

  const similarityScores: number[] = [];
  const computedWeights: number[] = [];

  for (const pattern of validPatterns) {
    const weight = computePatternWeight(pattern);

    similarityScores.push(pattern.match.weighted_similarity_score);
    computedWeights.push(weight);

    if (pattern.outcome === "CONTINUATION") {
      continuationWeight += weight;
    } else {
      correctionWeight += weight;
    }
  }

  const weightedTotal = continuationWeight + correctionWeight;

  if (weightedTotal <= 0) {
    return {
      continuation_probability: 0,
      correction_probability: 0,
      confidence: 0,

      weighted_total: 0,
      continuation_weight: 0,
      correction_weight: 0,

      sample_size: sampleSize,
      valid_matches: validMatches,

      warnings: ["statistics_weighted_total_zero"],
    };
  }

  const continuationProbability = clampScore(
    (continuationWeight / weightedTotal) * 100,
  );

  const correctionProbability = clampScore(
    (correctionWeight / weightedTotal) * 100,
  );

  const averageSimilarity = average(similarityScores);
  const averageWeight = average(computedWeights);
  const coverageScore = clampScore((validMatches / sampleSize) * 100);
  const evidenceDepthScore = clampScore(Math.min(100, validMatches * 12));

  const confidence = clampScore(
    averageSimilarity * 0.35 +
      averageWeight * 0.25 +
      coverageScore * 0.15 +
      evidenceDepthScore * 0.25,
  );

  if (validMatches < 3) {
    warnings.push("statistics_low_match_count");
  }

  if (continuationProbability < 55 && correctionProbability < 55) {
    warnings.push("statistics_probabilities_not_decisive");
  }

  return {
    continuation_probability: continuationProbability,
    correction_probability: correctionProbability,
    confidence,

    weighted_total: clampScore(weightedTotal),
    continuation_weight: clampScore(continuationWeight),
    correction_weight: clampScore(correctionWeight),

    sample_size: sampleSize,
    valid_matches: validMatches,

    warnings: uniqueWarnings(warnings),
  };
}
