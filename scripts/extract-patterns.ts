/* ============================================================================
 * FILE: scripts/extract-patterns.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala deterministic pattern extraction script
 *
 * PARENT FILES
 * - lib/xyvala/pattern-core.ts
 *
 * ROLE
 * - extract structural patterns from price history
 * - classify each price series with pattern-core only
 * - optionally compare each extracted pattern to a reference pattern
 * - expose clean deterministic outputs for scripts, backtests and audits
 *
 * DIRECTIVES
 * - no RFS recomputation here
 * - no MCI recomputation here
 * - no calibration logic here
 * - no UI logic here
 * - no market reconstruction here
 * - no hidden decision here
 * - pattern extraction only
 * - same input => same output
 * - all similarity scores must be finite numbers
 * - never emit undefined for a required score
 *
 * INPUTS
 * - price series: number[][]
 * - optional reference price series: number[]
 *
 * OUTPUTS
 * - ExtractedPattern[]
 *
 * INVARIANTS
 * - invalid price series are skipped
 * - extracted prices are copied, not mutated
 * - similarity_score is always a finite number
 * - similarity_score = 0 when no valid reference exists
 * - this script never changes decision, regime, stability or calibration state
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/pattern-core.ts
 *
 * SENSITIVE ZONES
 * - similarity_score is an observed structural extraction value
 * - do not transform similarity_score into prediction
 * - do not mix pattern extraction with MCI or calibration
 * - keep output compatible with strict TypeScript mode
 * ========================================================================== */

import {
  classifyPattern,
  computePatternKindSimilarity,
  type PatternKind,
} from "@/lib/xyvala/pattern-core";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type ExtractedPattern = {
  kind: PatternKind;
  prices: number[];
  similarity_score: number;
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizePriceSeries(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;

  const prices = value.filter(isFiniteNumber);

  if (prices.length < 3) return null;

  return [...prices];
}

function resolveSimilarityScore(input: {
  kind: PatternKind;
  reference?: number[] | undefined;
}): number {
  const reference = sanitizePriceSeries(input.reference);

  if (!reference) return 0;

  const referenceKind = classifyPattern(reference);
  const score = computePatternKindSimilarity(input.kind, referenceKind);

  return isFiniteNumber(score) ? score : 0;
}

/* ============================================================================
 * 3. PATTERN EXTRACTION
 * ========================================================================== */

export function extractPatterns(
  series: number[][],
  reference?: number[] | undefined,
): ExtractedPattern[] {
  const results: ExtractedPattern[] = [];

  for (const rawPrices of series) {
    const prices = sanitizePriceSeries(rawPrices);

    if (!prices) continue;

    const kind = classifyPattern(prices);

    const similarity_score = resolveSimilarityScore(
      reference
        ? {
            kind,
            reference,
          }
        : {
            kind,
          },
    );

    results.push({
      kind,
      prices,
      similarity_score,
    });
  }

  return results;
}

/* ============================================================================
 * 4. CLI RUNNER
 * ========================================================================== */

if (require.main === module) {
  const mockSeries: number[][] = [
    [1, 2, 3, 4, 5],
    [5, 4, 3, 2, 1],
    [1, 1.01, 1.02, 1.01, 1.02],
  ];

  const reference: number[] = [1, 2, 3, 4, 5];

  const patterns = extractPatterns(mockSeries, reference);

  console.log(JSON.stringify(patterns, null, 2));
}
