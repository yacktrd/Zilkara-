/* ============================================================================
 * FILE: lib/xyvala/engine/mci/mci-market-logger.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala MCI market decision logger
 *
 * PARENT FILES
 * - lib/xyvala/engine/mci-market.ts
 *
 * ROLE
 * - store MCI decision samples for observability
 * - keep decision logging isolated from MCI logic
 * - expose read-only samples for distribution analysis
 *
 * DIRECTIVES
 * - FR/EU compliance by default
 * - EUR monetary reference by default
 * - no personalized financial advice
 * - no public exploitable trading decision
 * - no decision logic here
 * - no score recomputation here
 * - no API logic here
 * - deterministic storage behavior
 * - logging failure must never affect MCI output
 *
 * INPUTS
 * - MCI decision sample
 *
 * OUTPUTS
 * - bounded in-memory samples
 *
 * INVARIANTS
 * - max buffer size is bounded
 * - newest samples are preserved
 * - samples are copied on read
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/engine/mci/mci-market-types.ts
 *
 * SENSITIVE ZONES
 * - memory growth
 * - mutation from external consumers
 * ========================================================================== */

import type {
  MarketDecision,
  MciExecutionMode,
} from "./mci-market-types";

export type MciLoggedRegime = "STABLE" | "TRANSITION" | "VOLATILE" | string;
export type MciLoggedRfsStatus = "computed" | "degraded" | "invalid" | string;

export type MciDecisionSample = {
  decision: MarketDecision;
  execution_mode: MciExecutionMode;

  regime: MciLoggedRegime;
  rfs_status: MciLoggedRfsStatus;

  stability: number;
  rupture: number;
  opportunity: number;
  convergence: number;
  confidence: number;

  warnings: string[];

  recorded_at: string;
};

const MAX_BUFFER_SIZE = 1_000;

const BUFFER: MciDecisionSample[] = [];

function normalizeWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
}

function normalizeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeDecision(value: unknown): MarketDecision {
  if (value === "ALLOW") return "ALLOW";
  if (value === "BLOCK") return "BLOCK";
  return "WATCH";
}

function normalizeExecutionMode(value: unknown): MciExecutionMode {
  if (value === "FULL_CONTEXT") return "FULL_CONTEXT";
  if (value === "NO_HISTORY") return "NO_HISTORY";
  if (value === "NO_LIVE") return "NO_LIVE";
  return "SNAPSHOT_ONLY";
}

export function recordMciDecisionSample(
  sample: Omit<MciDecisionSample, "recorded_at">,
): void {
  BUFFER.push({
    decision: normalizeDecision(sample.decision),
    execution_mode: normalizeExecutionMode(sample.execution_mode),

    regime: String(sample.regime),
    rfs_status: String(sample.rfs_status),

    stability: normalizeNumber(sample.stability),
    rupture: normalizeNumber(sample.rupture),
    opportunity: normalizeNumber(sample.opportunity),
    convergence: normalizeNumber(sample.convergence),
    confidence: normalizeNumber(sample.confidence),

    warnings: normalizeWarnings(sample.warnings),

    recorded_at: new Date().toISOString(),
  });

  while (BUFFER.length > MAX_BUFFER_SIZE) {
    BUFFER.shift();
  }
}

export function readMciDecisionSamples(): MciDecisionSample[] {
  return BUFFER.map((sample) => ({
    ...sample,
    warnings: [...sample.warnings],
  }));
}

export function clearMciDecisionSamples(): void {
  BUFFER.length = 0;
}
