/* ============================================================================
 * FILE: lib/xyvala/mci/matching-core.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - evaluate whether a historical context is comparable to the current one
 * - compute deterministic similarity score for downstream MCI ranking
 * - preserve Xyvala hierarchy: structure first, then contextual refinement
 *
 * PARENTS
 * - lib/xyvala/engine/rfs-market.ts
 * - lib/xyvala/behavior/behavior-7d-core.ts
 * - lib/xyvala/mci/statistics-core.ts
 * - lib/xyvala/engine/mci-market.ts
 *
 * DIRECTIVES
 * - deterministic only
 * - no external dependency
 * - no decision logic here
 * - no provider parsing here
 * - same input => same output
 * - matching must remain auditable
 *
 * INPUTS
 * - current context
 * - candidate context
 *
 * OUTPUTS
 * - comparable flag
 * - similarity score
 * - weighted similarity
 * - explicit mismatch reasons
 *
 * INVARIANTS
 * - scores remain in [0, 100]
 * - regime remains the first structural gate
 * - behavior remains secondary to structure
 *
 * SENSITIVE ZONES
 * - regime mismatch handling
 * - stability distance weighting
 * - optional OCC / CONV / DUR / FREQ / CORR support
 * ========================================================================== */

export type MatchRegime = "STABLE" | "TRANSITION" | "VOLATILE";
export type MatchBehavior = "KANGAROO" | "PUMA" | "SERPENT";

export interface MatchContext {
  regime: MatchRegime;
  stability: number;
  behavior: MatchBehavior;

  occurrence?: number;
  convergence?: number;
  duration?: number;
  frequency?: number;
  correlation?: number;
}

export interface MatchResult {
  comparable: boolean;
  similarity_score: number;
  weighted_similarity_score: number;
  reasons: string[];
}

const MATCH_POLICY = {
  stability_gap_max: 18,
  similarity_min: 60,
  weighted_similarity_min: 58,
} as const;

/* ============================================================================
 * 1. SAFE HELPERS
 * ========================================================================== */

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

function similarityFromDistance(diff: number, multiplier: number): number {
  return clampScore(100 - diff * multiplier);
}

function safeAxisScore(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return clampScore(value);
}

/* ============================================================================
 * 2. STRUCTURAL SUB-SCORES
 * ========================================================================== */

function computeRegimeScore(
  current: MatchContext,
  candidate: MatchContext,
): number {
  if (current.regime === candidate.regime) return 100;

  if (
    (current.regime === "STABLE" && candidate.regime === "TRANSITION") ||
    (current.regime === "TRANSITION" && candidate.regime === "STABLE") ||
    (current.regime === "TRANSITION" && candidate.regime === "VOLATILE") ||
    (current.regime === "VOLATILE" && candidate.regime === "TRANSITION")
  ) {
    return 35;
  }

  return 10;
}

function computeStabilityScore(
  current: MatchContext,
  candidate: MatchContext,
): number {
  const diff = Math.abs(current.stability - candidate.stability);
  return similarityFromDistance(diff, 5);
}

function computeBehaviorScore(
  current: MatchContext,
  candidate: MatchContext,
): number {
  if (current.behavior === candidate.behavior) return 100;

  if (
    (current.behavior === "PUMA" && candidate.behavior === "KANGAROO") ||
    (current.behavior === "KANGAROO" && candidate.behavior === "PUMA") ||
    (current.behavior === "KANGAROO" && candidate.behavior === "SERPENT") ||
    (current.behavior === "SERPENT" && candidate.behavior === "KANGAROO")
  ) {
    return 50;
  }

  return 20;
}

/* ============================================================================
 * 3. OPTIONAL AXIS SCORES (OCC / CONV / DUR / FREQ / CORR)
 * ----------------------------------------------------------------------------
 * ROLE
 * - enrich matching when richer structural history is available
 * - remain neutral when optional axes are unavailable
 * ========================================================================== */

function computeOptionalAxisScore(
  left: number | undefined,
  right: number | undefined,
): number {
  const leftScore = safeAxisScore(left);
  const rightScore = safeAxisScore(right);

  if (leftScore === null || rightScore === null) {
    return 50;
  }

  return similarityFromDistance(Math.abs(leftScore - rightScore), 4);
}

function computeOptionalAxesAggregate(
  current: MatchContext,
  candidate: MatchContext,
): number {
  const occurrenceScore = computeOptionalAxisScore(
    current.occurrence,
    candidate.occurrence,
  );

  const convergenceScore = computeOptionalAxisScore(
    current.convergence,
    candidate.convergence,
  );

  const durationScore = computeOptionalAxisScore(
    current.duration,
    candidate.duration,
  );

  const frequencyScore = computeOptionalAxisScore(
    current.frequency,
    candidate.frequency,
  );

  const correlationScore = computeOptionalAxisScore(
    current.correlation,
    candidate.correlation,
  );

  return clampScore(
    occurrenceScore * 0.2 +
      convergenceScore * 0.25 +
      durationScore * 0.2 +
      frequencyScore * 0.2 +
      correlationScore * 0.15,
  );
}

/* ============================================================================
 * 4. PUBLIC API
 * ========================================================================== */

export function compareContexts(
  current: MatchContext,
  candidate: MatchContext,
): MatchResult {
  const reasons: string[] = [];

  const regimeScore = computeRegimeScore(current, candidate);
  const stabilityScore = computeStabilityScore(current, candidate);
  const behaviorScore = computeBehaviorScore(current, candidate);
  const optionalAxesScore = computeOptionalAxesAggregate(current, candidate);

  const stabilityGap = Math.abs(current.stability - candidate.stability);

  if (regimeScore < 100) {
    reasons.push("regime_mismatch");
  }

  if (stabilityGap >= MATCH_POLICY.stability_gap_max) {
    reasons.push("stability_gap_high");
  }

  if (behaviorScore < 100) {
    reasons.push("behavior_mismatch");
  }

  const similarityScore = clampScore(
    regimeScore * 0.32 +
      stabilityScore * 0.24 +
      behaviorScore * 0.14 +
      optionalAxesScore * 0.30,
  );

  const weightedSimilarityScore = clampScore(
    similarityScore * 0.7 +
      regimeScore * 0.15 +
      stabilityScore * 0.1 +
      optionalAxesScore * 0.05,
  );

  const comparable =
    regimeScore >= 35 &&
    stabilityGap < MATCH_POLICY.stability_gap_max &&
    similarityScore >= MATCH_POLICY.similarity_min &&
    weightedSimilarityScore >= MATCH_POLICY.weighted_similarity_min;

  if (!comparable) {
    reasons.push("context_not_comparable");
  }

  return {
    comparable,
    similarity_score: similarityScore,
    weighted_similarity_score: weightedSimilarityScore,
    reasons,
  };
}

/* ============================================================================
 * 5. COMPATIBILITY EXPORT
 * ----------------------------------------------------------------------------
 * ROLE
 * - preserve a boolean helper for legacy callers
 * - use scored matching as the single source of truth
 * ========================================================================== */

export function isComparable(
  current: MatchContext,
  candidate: MatchContext,
): boolean {
  return compareContexts(current, candidate).comparable;
}
