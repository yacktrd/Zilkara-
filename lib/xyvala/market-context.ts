/* ============================================================================
 * FILE: lib/xyvala/market-context.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private market context aggregator
 *
 * ROLE
 * - aggregate private asset-level structural outputs
 * - aggregate private impulse transition context
 * - derive internal market context from PrivateScanAsset only
 * - preserve regime, stability, risk and impulse context inside private layers
 *
 * DIRECTIVES
 * - private context layer only
 * - no public API exposure by default
 * - no UI logic
 * - no decision recomputation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - aggregate already-produced private outputs only
 * - no score reconstruction
 * - null means explicitly unavailable
 * - same input => same output shape
 * ========================================================================== */

import type {
  PrivateImpulseTransitionState,
  PrivateScanAsset,
  PrivateScanRegime,
} from "@/lib/xyvala/contracts/scan-private-contract";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type MarketContextRegime = PrivateScanRegime;
export type MarketContextImpulse = PrivateImpulseTransitionState;

export type MarketContext = {
  assets_count: number;

  regime_global: MarketContextRegime;
  impulse_global: MarketContextImpulse;

  stability_global: number | null;
  risk_level: number | null;

  stable_ratio: number;
  transition_ratio: number;
  volatile_ratio: number;

  compression_ratio: number;
  pressure_building_ratio: number;
  release_ratio: number;
  exhaustion_ratio: number;
  neutral_impulse_ratio: number;

  avg_stability: number | null;
  median_stability: number | null;

  dominant_regime_share: number;
  dominant_impulse_share: number;

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

function percentage(part: number, total: number): number {
  if (total <= 0) return 0;
  return round2((part / total) * 100);
}

/* ============================================================================
 * 3. VALUE EXTRACTION
 * ========================================================================== */

function safeComputedStability(asset: PrivateScanAsset): number | null {
  if (asset.stability_status !== "computed") return null;
  if (!isFiniteNumber(asset.stability_score)) return null;

  return clamp(asset.stability_score, 0, 100);
}

function extractComputedStabilityValues(data: PrivateScanAsset[]): number[] {
  return data
    .map(safeComputedStability)
    .filter((value): value is number => value !== null);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    const left = sorted[mid - 1];
    const right = sorted[mid];

    if (!isFiniteNumber(left) || !isFiniteNumber(right)) return null;

    return (left + right) / 2;
  }

  return sorted[mid] ?? null;
}

/* ============================================================================
 * 4. COUNT HELPERS
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

function countByImpulse(
  data: PrivateScanAsset[],
): Record<MarketContextImpulse, number> {
  return data.reduce<Record<MarketContextImpulse, number>>(
    (acc, asset) => {
      acc[asset.impulse_transition_state] += 1;
      return acc;
    },
    {
      COMPRESSION: 0,
      PRESSURE_BUILDING: 0,
      RELEASE: 0,
      EXHAUSTION: 0,
      NEUTRAL: 0,
    },
  );
}

/* ============================================================================
 * 5. REGIME HELPERS
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

/* ============================================================================
 * 6. IMPULSE HELPERS
 * ========================================================================== */

function deriveDominantImpulse(
  counts: Record<MarketContextImpulse, number>,
): MarketContextImpulse {
  const ordered: MarketContextImpulse[] = [
    "EXHAUSTION",
    "RELEASE",
    "PRESSURE_BUILDING",
    "COMPRESSION",
    "NEUTRAL",
  ];

  return ordered.reduce<MarketContextImpulse>((dominant, current) => {
    return counts[current] > counts[dominant] ? current : dominant;
  }, "NEUTRAL");
}

function deriveDominantImpulseShare(
  counts: Record<MarketContextImpulse, number>,
  total: number,
): number {
  const maxCount = Math.max(
    counts.COMPRESSION,
    counts.PRESSURE_BUILDING,
    counts.RELEASE,
    counts.EXHAUSTION,
    counts.NEUTRAL,
  );

  return percentage(maxCount, total);
}

/* ============================================================================
 * 7. RISK + CONFIDENCE HELPERS
 * ========================================================================== */

function deriveRiskLevel(input: {
  transition_ratio: number;
  volatile_ratio: number;
  exhaustion_ratio: number;
  release_ratio: number;
  stability_global: number | null;
}): number | null {
  if (input.stability_global === null) return null;

  const risk =
    input.volatile_ratio * 0.42 +
    input.transition_ratio * 0.2 +
    input.exhaustion_ratio * 0.18 +
    input.release_ratio * 0.1 +
    (100 - input.stability_global) * 0.1;

  return round2(clamp(risk, 0, 100));
}

function deriveContextConfidence(input: {
  dominant_regime_share: number;
  dominant_impulse_share: number;
  stability_global: number | null;
  assets_count: number;
}): number {
  let confidence = 0;

  if (input.assets_count >= 20) {
    confidence += 22;
  } else if (input.assets_count >= 10) {
    confidence += 16;
  } else if (input.assets_count >= 5) {
    confidence += 9;
  }

  confidence += clamp(input.dominant_regime_share * 0.34, 0, 34);
  confidence += clamp(input.dominant_impulse_share * 0.16, 0, 16);

  if (input.stability_global !== null) {
    confidence += clamp(input.stability_global * 0.28, 0, 28);
  }

  return round2(clamp(confidence, 0, 100));
}

/* ============================================================================
 * 8. EMPTY CONTEXT
 * ========================================================================== */

function buildEmptyMarketContext(): MarketContext {
  return {
    assets_count: 0,

    regime_global: "TRANSITION",
    impulse_global: "NEUTRAL",

    stability_global: null,
    risk_level: null,

    stable_ratio: 0,
    transition_ratio: 0,
    volatile_ratio: 0,

    compression_ratio: 0,
    pressure_building_ratio: 0,
    release_ratio: 0,
    exhaustion_ratio: 0,
    neutral_impulse_ratio: 0,

    avg_stability: null,
    median_stability: null,

    dominant_regime_share: 0,
    dominant_impulse_share: 0,

    context_confidence: 0,

    warnings: ["market_context_empty_input"],
  };
}

/* ============================================================================
 * 9. PRIVATE MARKET CONTEXT API
 * ========================================================================== */

export function buildMarketContext(data: PrivateScanAsset[]): MarketContext {
  const assets_count = data.length;

  if (assets_count === 0) {
    return buildEmptyMarketContext();
  }

  const regimeCounts = countByRegime(data);
  const impulseCounts = countByImpulse(data);
  const stabilityValues = extractComputedStabilityValues(data);

  const stable_ratio = percentage(regimeCounts.STABLE, assets_count);
  const transition_ratio = percentage(regimeCounts.TRANSITION, assets_count);
  const volatile_ratio = percentage(regimeCounts.VOLATILE, assets_count);

  const compression_ratio = percentage(impulseCounts.COMPRESSION, assets_count);
  const pressure_building_ratio = percentage(
    impulseCounts.PRESSURE_BUILDING,
    assets_count,
  );
  const release_ratio = percentage(impulseCounts.RELEASE, assets_count);
  const exhaustion_ratio = percentage(impulseCounts.EXHAUSTION, assets_count);
  const neutral_impulse_ratio = percentage(impulseCounts.NEUTRAL, assets_count);

  const avgRaw = average(stabilityValues);
  const medianRaw = median(stabilityValues);

  const avg_stability = avgRaw === null ? null : round2(avgRaw);
  const median_stability = medianRaw === null ? null : round2(medianRaw);

  const stability_global =
    avg_stability === null || median_stability === null
      ? null
      : round2(avg_stability * 0.6 + median_stability * 0.4);

  const dominant_regime_share = deriveDominantRegimeShare(
    regimeCounts,
    assets_count,
  );

  const impulse_global = deriveDominantImpulse(impulseCounts);

  const dominant_impulse_share = deriveDominantImpulseShare(
    impulseCounts,
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
    exhaustion_ratio,
    release_ratio,
    stability_global,
  });

  const context_confidence = deriveContextConfidence({
    dominant_regime_share,
    dominant_impulse_share,
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
    impulse_global,

    stability_global,
    risk_level,

    stable_ratio,
    transition_ratio,
    volatile_ratio,

    compression_ratio,
    pressure_building_ratio,
    release_ratio,
    exhaustion_ratio,
    neutral_impulse_ratio,

    avg_stability,
    median_stability,

    dominant_regime_share,
    dominant_impulse_share,

    context_confidence,

    warnings,
  };
}
