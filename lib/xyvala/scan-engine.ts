/* ============================================================================
 * FILE: lib/xyvala/scan-engine.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private scan enrichment engine
 *
 * ROLE
 * - enrich private scan assets with RFS structural readings
 * - enrich private scan assets with Impulse Layer readings
 * - apply adaptive impulse calibration outside the impulse core
 * - keep analytical computation private
 * - preserve deterministic scan output ordering
 *
 * PARENT FILES
 * - lib/xyvala/contracts/scan-private-contract.ts
 * - lib/xyvala/rfs-core.ts
 * - lib/xyvala/engine/impulse-state-core.ts
 * - lib/xyvala/calibration/impulse-adaptive-thresholds.ts
 * - lib/xyvala/market-context.ts
 *
 * DIRECTIVES
 * - private engine only
 * - no UI logic
 * - no API response building
 * - no public wording
 * - no MCI recomputation
 * - no investment advice
 * - no prediction
 * - no buy / sell / hold semantics
 * - real observable data only
 * - deterministic output only
 * - same input => same output
 *
 * INPUTS
 * - PrivateScanAsset[]
 *
 * OUTPUTS
 * - enriched PrivateScanAsset[]
 * - private market context
 *
 * INVARIANTS
 * - RFS remains the structural source
 * - Impulse does not decide
 * - Impulse does not replace stability
 * - Impulse does not replace rupture
 * - Impulse reads pressure only
 * - adaptive impulse calibration stays outside impulse-state-core
 * - Triple Layer is contextual for impulse calibration only
 * - public transformer decides what can be exposed
 * ========================================================================== */

import type {
  PrivateScanAsset,
  PrivateScanRegime,
  PrivateScanStatus,
} from "@/lib/xyvala/contracts/scan-private-contract";

import { runRFS } from "@/lib/xyvala/rfs-core";

import {
  computeImpulseState,
  type ImpulseSignatureInput,
  type ImpulseTemporalBlock,
} from "@/lib/xyvala/engine/impulse-state-core";

import {
  buildImpulseAdaptivePolicy,
  resolveImpulseStateWithAdaptivePolicy,
  type ImpulseAdaptiveSample,
} from "@/lib/xyvala/calibration/impulse-adaptive-thresholds";

import {
  writeImpulseDistributionSnapshot,
} from "@/lib/xyvala/calibration/impulse-distribution-store";

import {
  buildMarketContext,
  type MarketContext,
} from "@/lib/xyvala/market-context";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type ScanEngineSortKey = "stability" | "price";
export type ScanEngineSortOrder = "asc" | "desc";

export type ScanEngineResult = {
  data: PrivateScanAsset[];
  market_context: MarketContext;
};

/* ============================================================================
 * 2. CONSTANTS
 * ========================================================================== */

const MIN_RFS_PRICES = 8;

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function clampScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

function clampRate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function resolvePrices(asset: PrivateScanAsset): number[] {
  return Array.isArray(asset.sparkline_7d)
    ? asset.sparkline_7d.filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value) && value > 0,
      )
    : [];
}

function resolveStatus(score: number | null): PrivateScanStatus {
  return score === null ? "unavailable" : "computed";
}

function resolvePartialStatus(score: number | null): PrivateScanStatus {
  return score === null ? "partial" : "computed";
}

function resolveRegime(value: unknown): PrivateScanRegime {
  if (value === "STABLE") return "STABLE";
  if (value === "VOLATILE") return "VOLATILE";
  return "TRANSITION";
}

/* ============================================================================
 * 4. IMPULSE INPUT HELPERS
 * ========================================================================== */

function computePriceReturns(prices: number[]): number[] {
  const returns: number[] = [];

  for (let index = 1; index < prices.length; index += 1) {
    const previous = prices[index - 1];
    const current = prices[index];

    if (
      typeof previous === "number" &&
      typeof current === "number" &&
      Number.isFinite(previous) &&
      Number.isFinite(current) &&
      previous > 0
    ) {
      returns.push(((current - previous) / previous) * 100);
    }
  }

  return returns;
}

function computeAmplitudePct(prices: number[]): number {
  if (prices.length < 2) return 0;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const last = prices[prices.length - 1];

  if (typeof last !== "number" || !Number.isFinite(last) || last <= 0) {
    return 0;
  }

  return ((max - min) / last) * 100;
}

function computeSlopePct(prices: number[]): number {
  if (prices.length < 2) return 0;

  const first = prices[0];
  const last = prices[prices.length - 1];

  if (
    typeof first !== "number" ||
    typeof last !== "number" ||
    !Number.isFinite(first) ||
    !Number.isFinite(last) ||
    first <= 0
  ) {
    return 0;
  }

  return ((last - first) / first) * 100;
}

function computeInstabilityScore(prices: number[]): number {
  const returns = computePriceReturns(prices);

  if (returns.length === 0) return 0;

  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;

  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    returns.length;

  return Math.max(0, Math.min(100, Math.sqrt(variance) * 12));
}

function computeBreakRate(prices: number[]): number {
  const returns = computePriceReturns(prices);

  if (returns.length < 2) return 0;

  let breaks = 0;

  for (let index = 1; index < returns.length; index += 1) {
    const previous = returns[index - 1];
    const current = returns[index];

    if (
      typeof previous === "number" &&
      typeof current === "number" &&
      Number.isFinite(previous) &&
      Number.isFinite(current) &&
      ((previous > 0 && current < 0) ||
        (previous < 0 && current > 0) ||
        Math.abs(current) >= 7)
    ) {
      breaks += 1;
    }
  }

  return clampRate(breaks / (returns.length - 1));
}

function buildImpulseSignatureFromPrices(
  prices: number[],
): ImpulseSignatureInput {
  return {
    slope_pct: computeSlopePct(prices),
    amplitude_pct: computeAmplitudePct(prices),
    instability_score: computeInstabilityScore(prices),
    break_rate: computeBreakRate(prices),
    duration_score: Math.max(0, Math.min(100, prices.length * 10)),
  };
}

function buildImpulseTemporalBlock(input: {
  change_pct: number | null;
  slope_pct: number | null;
  stability_score: number | null;
  rupture_score: number | null;
  rupture_probability: number | null;
}): ImpulseTemporalBlock {
  return {
    change_pct: safeNumber(input.change_pct),
    slope_pct: safeNumber(input.slope_pct ?? input.change_pct),
    stability_score: safeNumber(input.stability_score, 50),
    rupture_score: safeNumber(input.rupture_score, 50),
    rupture_probability: safeNumber(input.rupture_probability, 50),
  };
}

function buildNeutralImpulse(
  status: PrivateScanStatus,
): Pick<
  PrivateScanAsset,
  | "impulse_pressure_score"
  | "impulse_instability_score"
  | "impulse_saturation_score"
  | "impulse_exhaustion_score"
  | "impulse_directional_bias"
  | "impulse_transition_state"
  | "impulse_status"
> {
  return {
    impulse_pressure_score: null,
    impulse_instability_score: null,
    impulse_saturation_score: null,
    impulse_exhaustion_score: null,
    impulse_directional_bias: "NEUTRAL",
    impulse_transition_state: "NEUTRAL",
    impulse_status: status,
  };
}

/* ============================================================================
 * 5. RFS + RAW IMPULSE ENRICHMENT
 * ========================================================================== */

function enrichAssetWithRFSAndRawImpulse(asset: PrivateScanAsset): PrivateScanAsset {
  const prices = resolvePrices(asset);

  if (prices.length < MIN_RFS_PRICES) {
    return {
      ...asset,

      stability_score: null,
      stability_status: "partial",

      regime: "TRANSITION",

      structure_score: null,
      market_score: null,
      coherence_score: null,

      rupture_score: null,
      rupture_probability: null,
      rupture_penalty_score: null,

      continuity_probability: null,

      confidence_score: null,
      confidence_status: "partial",

      ...buildNeutralImpulse("partial"),

      governance: {
        ...asset.governance,
        warnings: [
          ...asset.governance.warnings,
          "scan_engine_insufficient_rfs_prices",
        ],
      },
    };
  }

  try {
    const rfs = runRFS({ prices });

    const stability = clampScore(rfs.stability);
    const structure = clampScore(rfs.structure_score);
    const market = clampScore(rfs.market_score);
    const coherence = clampScore(rfs.coherence_score);

    const rupture = clampScore(rfs.rupture_score);
    const ruptureProbability = clampScore(rfs.rupture_probability);
    const rupturePenalty = clampScore(rfs.rupture_penalty_score);

    const continuity = clampScore(rfs.continuity_probability);
    const confidence = clampScore(rfs.confidence_score);

    const impulse = computeImpulseState({
      current_signature: buildImpulseSignatureFromPrices(prices),

      occurrence_score: safeNumber(clampScore(rfs.occurrence_score)),
      frequency_score: safeNumber(clampScore(rfs.frequency_score)),
      convergence_score: safeNumber(clampScore(rfs.convergence_score)),
      correlation_score: safeNumber(clampScore(rfs.correlation_score)),
      duration_score: safeNumber(clampScore(rfs.duration_score)),

      rupture_probability: safeNumber(ruptureProbability),
      rupture_penalty_score: safeNumber(rupturePenalty),

      stability: safeNumber(stability),
      coherence_score: safeNumber(coherence),

      rolling_7d: buildImpulseTemporalBlock({
        change_pct: asset.chg_7d_pct,
        slope_pct: asset.chg_7d_pct,
        stability_score: stability,
        rupture_score: rupture,
        rupture_probability: ruptureProbability,
      }),

      rolling_24h: buildImpulseTemporalBlock({
        change_pct: asset.chg_24h_pct,
        slope_pct: asset.chg_24h_pct,
        stability_score: stability,
        rupture_score: rupture,
        rupture_probability: ruptureProbability,
      }),
    });

    return {
      ...asset,

      stability_score: stability,
      stability_status: resolveStatus(stability),

      structure_score: structure,
      market_score: market,
      coherence_score: coherence,

      occurrence_score: clampScore(rfs.occurrence_score),
      frequency_score: clampScore(rfs.frequency_score),
      convergence_score: clampScore(rfs.convergence_score),
      duration_score: clampScore(rfs.duration_score),

      rupture_score: rupture,
      rupture_probability: ruptureProbability,
      rupture_penalty_score: rupturePenalty,

      rupture_occurrence_score: clampScore(rfs.rupture_occurrence_score),
      rupture_frequency_score: clampScore(rfs.rupture_frequency_score),
      rupture_convergence_score: clampScore(rfs.rupture_convergence_score),
      rupture_duration_score: clampScore(rfs.rupture_duration_score),

      crash_score: clampScore(rfs.crash_score),
      crash_state:
        rfs.crash_state === "NONE" ||
        rfs.crash_state === "RISING" ||
        rfs.crash_state === "CRASH"
          ? rfs.crash_state
          : "UNKNOWN",

      impulse_pressure_score: impulse.impulse_pressure_score,
      impulse_instability_score: impulse.impulse_instability_score,
      impulse_saturation_score: impulse.impulse_saturation_score,
      impulse_exhaustion_score: impulse.impulse_exhaustion_score,
      impulse_directional_bias: impulse.impulse_directional_bias,
      impulse_transition_state: impulse.impulse_transition_state,
      impulse_status: "computed",

      continuity_probability: continuity,

      confidence_score: confidence,
      confidence_status: resolvePartialStatus(confidence),

      regime: resolveRegime(rfs.regime),

      governance: {
        ...asset.governance,
        warnings: asset.governance.warnings,
      },
    };
  } catch {
    return {
      ...asset,

      stability_score: null,
      stability_status: "degraded",

      regime: "TRANSITION",

      structure_score: null,
      market_score: null,
      coherence_score: null,

      rupture_score: null,
      rupture_probability: null,
      rupture_penalty_score: null,

      continuity_probability: null,

      confidence_score: null,
      confidence_status: "degraded",

      ...buildNeutralImpulse("degraded"),

      governance: {
        ...asset.governance,
        warnings: [...asset.governance.warnings, "scan_engine_rfs_failed"],
      },
    };
  }
}

/* ============================================================================
 * 6. IMPULSE ADAPTIVE CALIBRATION
 * ========================================================================== */

function buildImpulseSample(asset: PrivateScanAsset): ImpulseAdaptiveSample | null {
  if (
    asset.impulse_status !== "computed" ||
    asset.impulse_pressure_score === null ||
    asset.impulse_instability_score === null ||
    asset.impulse_saturation_score === null ||
    asset.impulse_exhaustion_score === null
  ) {
    return null;
  }

  return {
    pressure_score: asset.impulse_pressure_score,
    instability_score: asset.impulse_instability_score,
    saturation_score: asset.impulse_saturation_score,
    exhaustion_score: asset.impulse_exhaustion_score,

    growth_score: asset.growth_score,
    core_score: asset.core_pattern_score,
    decay_score: asset.decay_score,

    transition_state: asset.impulse_transition_state,
  };
}

function buildImpulseSamples(data: PrivateScanAsset[]): ImpulseAdaptiveSample[] {
  return data
    .map(buildImpulseSample)
    .filter((sample): sample is ImpulseAdaptiveSample => sample !== null);
}

function applyImpulseAdaptiveCalibration(
  data: PrivateScanAsset[],
): PrivateScanAsset[] {
  const samples = buildImpulseSamples(data);
  const policy = buildImpulseAdaptivePolicy(samples);

writeImpulseDistributionSnapshot({
  samples,
  policy,
  timestamp: 0,
});

  return data.map((asset) => {
    if (
      asset.impulse_status !== "computed" ||
      asset.impulse_pressure_score === null ||
      asset.impulse_instability_score === null ||
      asset.impulse_saturation_score === null ||
      asset.impulse_exhaustion_score === null
    ) {
      return asset;
    }

    const calibratedState = resolveImpulseStateWithAdaptivePolicy({
      pressure_score: asset.impulse_pressure_score,
      instability_score: asset.impulse_instability_score,
      saturation_score: asset.impulse_saturation_score,
      exhaustion_score: asset.impulse_exhaustion_score,

      growth_score: asset.growth_score,
      core_score: asset.core_pattern_score,
      decay_score: asset.decay_score,

      policy,
    });

    return {
      ...asset,
      impulse_transition_state: calibratedState,
      governance: {
        ...asset.governance,
        warnings:
          policy.warnings.length > 0
            ? [...asset.governance.warnings, ...policy.warnings]
            : asset.governance.warnings,
      },
    };
  });
}

/* ============================================================================
 * 7. PUBLIC ENGINE API
 * ========================================================================== */

export function applyRFS(data: PrivateScanAsset[]): PrivateScanAsset[] {
  const rawEnriched = data.map(enrichAssetWithRFSAndRawImpulse);
  return applyImpulseAdaptiveCalibration(rawEnriched);
}

/* ============================================================================
 * 8. SORTING
 * ========================================================================== */

export function sortAssets(
  data: PrivateScanAsset[],
  key: ScanEngineSortKey,
  order: ScanEngineSortOrder,
): PrivateScanAsset[] {
  const direction = order === "asc" ? 1 : -1;

  return [...data].sort((a, b) => {
    const left = key === "price" ? a.price : a.stability_score;
    const right = key === "price" ? b.price : b.stability_score;

    const leftValid = typeof left === "number" && Number.isFinite(left);
    const rightValid = typeof right === "number" && Number.isFinite(right);

    if (leftValid !== rightValid) return leftValid ? -1 : 1;
    if (!leftValid && !rightValid) return a.symbol.localeCompare(b.symbol);

    if (left !== right) {
      return ((left as number) - (right as number)) * direction;
    }

    return a.symbol.localeCompare(b.symbol);
  });
}

/* ============================================================================
 * 9. EXECUTION
 * ========================================================================== */

export function buildScanEngineResult(input: {
  data: PrivateScanAsset[];
  key?: ScanEngineSortKey;
  order?: ScanEngineSortOrder;
}): ScanEngineResult {
  const enriched = applyRFS(input.data);

  const sorted = sortAssets(
    enriched,
    input.key ?? "stability",
    input.order ?? "desc",
  );

  return {
    data: sorted,
    market_context: buildMarketContext(sorted),
  };
}
