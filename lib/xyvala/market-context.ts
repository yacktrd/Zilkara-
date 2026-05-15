/* ============================================================================
 * FILE: lib/xyvala/market-context.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private market context aggregator
 *
 * ROLE
 * - aggregate private asset-level structural outputs
 * - derive internal market context from PrivateScanAsset only
 * - preserve regime, stability and risk context inside private layers
 *
 * PARENT FILES
 * - lib/xyvala/contracts/scan-private-contract.ts
 * - lib/xyvala/rfs-core.ts
 * - lib/xyvala/scan-engine.ts
 *
 * DIRECTIVES
 * - private context layer only
 * - no public API exposure by default
 * - no UI logic
 * - no decision recomputation
 * - no RFS recomputation
 * - no MCI recomputation
 * - aggregate already-produced private structural outputs only
 * - null means explicitly unavailable
 * - number means confirmed observable value
 * - same input => same output shape
 *
 * INPUTS
 * - PrivateScanAsset[]
 *
 * OUTPUTS
 * - MarketContext
 *
 * INVARIANTS
 * - regime comes from PrivateScanAsset only
 * - stability_score is used only when stability_status is computed
 * - empty input returns a degraded internal context
 * - public projection must happen elsewhere
 *
 * CRITICAL DEPENDENCIES
 * - PrivateScanAsset contract
 *
 * SENSITIVE ZONES
 * - private/public leakage
 * - regime aggregation
 * - null versus zero semantics
 * ========================================================================== */

import type {
  PrivateScanAsset,
  PrivateScanRegime,
} from "@/lib/xyvala/contracts/scan-private-contract";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type MarketContextRegime = PrivateScanRegime;

export type MarketContext = {
  assets_count: number;

  regime_global: MarketContextRegime;
  stability_global: number | null;
  risk_level: number | null;

  stable_ratio: number;
  transition_ratio: number;
  volatile_ratio: number;

  avg_stability: number | null;
  median_stability: number | null;

  dominant_regime_share: number;
  context_confidence: number;

  warnings: string[];
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function safeComputedStability(asset: PrivateScanAsset): number | null {
  if (asset.stability_status !== "computed") return null;
  if (!isFiniteNumber(asset.stability_score)) return null;

  return clamp(asset.stability_score, 0, 100);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  const len = values.length;

  if (len === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(len / 2);

  if (len % 2 === 0) {
    const left = sorted[mid - 1];
    const right = sorted[mid];

    if (left === undefined || right === undefined) {
      return 0;
    }

    return (left + right) / 2;
  }

  const value = sorted[mid];
  return value === undefined ? 0 : value;
}

function percentage(part: number, total: number): number {
  if (total <= 0) return 0;
  return round2((part / total) * 100);
}

/* ============================================================================
 * 3. AGGREGATE HELPERS
 * ========================================================================== */

function countByRegime(
  data: PrivateScanAsset[],
): Record<MarketContextRegime, number> {
  return data.reduce<Record<MarketContextRegime, number>>(
    (acc, asset) => {
      acc[asset.regime] += 1;
      return acc;
    },
    {
      STABLE: 0,
      TRANSITION: 0,
      VOLATILE: 0,
    },
  );
}

function extractComputedStabilityValues(data: PrivateScanAsset[]): number[] {
  return data
    .map(safeComputedStability)
    .filter((value): value is number => value !== null);
}

function deriveRiskLevel(input: {
  transition_ratio: number;
  volatile_ratio: number;
  stability_global: number | null;
}): number | null {
  if (input.stability_global === null) return null;

  const risk =
    input.volatile_ratio * 0.55 +
    input.transition_ratio * 0.25 +
    (100 - input.stability_global) * 0.2;

  return round2(clamp(risk, 0, 100));
}

/* ============================================================================
 * 4. REGIME HELPERS
 * ========================================================================== */

function deriveGlobalRegime(input: {
  stable_ratio: number;
  volatile_ratio: number;
  stability_global: number | null;
}): MarketContextRegime {
  if (input.stability_global === null) return "TRANSITION";

  if (input.volatile_ratio >= 45 || input.stability_global < 35) {
    return "VOLATILE";
  }

  if (input.stable_ratio >= 55 && input.stability_global >= 60) {
    return "STABLE";
  }

  return "TRANSITION";
}

function deriveDominantRegimeShare(
  counts: Record<MarketContextRegime, number>,
  total: number,
): number {
  const maxCount = Math.max(counts.STABLE, counts.TRANSITION, counts.VOLATILE);
  return percentage(maxCount, total);
}

function deriveContextConfidence(input: {
  dominant_regime_share: number;
  stability_global: number | null;
  assets_count: number;
}): number {
  let confidence = 0;

  if (input.assets_count >= 20) {
    confidence += 25;
  } else if (input.assets_count >= 10) {
    confidence += 18;
  } else if (input.assets_count >= 5) {
    confidence += 10;
  }

  confidence += clamp(input.dominant_regime_share * 0.45, 0, 45);

  if (input.stability_global !== null) {
    confidence += clamp(input.stability_global * 0.3, 0, 30);
  }

  return round2(clamp(confidence, 0, 100));
}

/* ============================================================================
 * 5. PRIVATE MARKET CONTEXT API
 * ========================================================================== */

export function buildMarketContext(data: PrivateScanAsset[]): MarketContext {
  const assets_count = data.length;

  if (assets_count === 0) {
    return {
      assets_count: 0,

      regime_global: "TRANSITION",
      stability_global: null,
      risk_level: null,

      stable_ratio: 0,
      transition_ratio: 0,
      volatile_ratio: 0,

      avg_stability: null,
      median_stability: null,

      dominant_regime_share: 0,
      context_confidence: 0,

      warnings: ["market_context_empty_input"],
    };
  }

  const counts = countByRegime(data);
  const stabilityValues = extractComputedStabilityValues(data);

  const stable_ratio = percentage(counts.STABLE, assets_count);
  const transition_ratio = percentage(counts.TRANSITION, assets_count);
  const volatile_ratio = percentage(counts.VOLATILE, assets_count);

  const avgRaw = average(stabilityValues);
  const medianRaw = median(stabilityValues);

  const avg_stability = avgRaw === null ? null : round2(avgRaw);
  const median_stability = medianRaw === null ? null : round2(medianRaw);

  const stability_global =
    avg_stability === null || median_stability === null
      ? null
      : round2(avg_stability * 0.6 + median_stability * 0.4);

  const dominant_regime_share = deriveDominantRegimeShare(
    counts,
    assets_count,
  );

  const regime_global = deriveGlobalRegime({
    stable_ratio,
    volatile_ratio,
    stability_global,
  });

  const risk_level = deriveRiskLevel({
    transition_ratio,
    volatile_ratio,
    stability_global,
  });

  const context_confidence = deriveContextConfidence({
    dominant_regime_share,
    stability_global,
    assets_count,
  });

  const warnings: string[] = [];

  if (stabilityValues.length !== assets_count) {
    warnings.push("market_context_partial_stability_data");
  }

  if (stabilityValues.length === 0) {
    warnings.push("market_context_stability_unavailable");
  }

  if (assets_count < 5) {
    warnings.push("market_context_low_asset_count");
  }

  return {
    assets_count,

    regime_global,
    stability_global,
    risk_level,

    stable_ratio,
    transition_ratio,
    volatile_ratio,

    avg_stability,
    median_stability,

    dominant_regime_share,
    context_confidence,

    warnings,
  };
}
