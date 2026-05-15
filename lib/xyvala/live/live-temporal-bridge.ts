/* ============================================================================
 * FILE: lib/xyvala/live/live-temporal-bridge.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - convert live-core output into temporal-compatible structural hints
 * - keep live data filtered before any temporal / structural downstream usage
 * - expose deterministic live-derived support values
 *
 * PARENTS
 * - lib/xyvala/live/live-core.ts
 * - lib/xyvala/engine/temporal-analysis-core.ts
 * - lib/xyvala/engine/rfs-market.ts
 *
 * DIRECTIVES
 * - no decision logic here
 * - no direct regime assignment here
 * - no direct stability override here
 * - live hints enrich structure, they never replace it
 * - deterministic outputs only
 * ========================================================================== */

import type { LiveCoreOutput } from "@/lib/xyvala/live/live-core";

export type LiveTemporalBridgeOutput = {
  filtered_price: number | null;
  live_support: {
    quality_score: number;
    noise_score: number;
    micro_volatility: number;
    price_velocity: number;
    temporal_growth_hint: number;
    temporal_convergence_hint: number;
    temporal_evolution_hint: number;
    micro_rupture_pressure: number;
  };
  warnings: string[];
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [...new Set(merged.filter((item): item is string => Boolean(item?.trim())))];
}

function computeGrowthHint(input: {
  velocity: number;
  quality: number;
  noise: number;
}): number {
  const velocitySupport = clampScore(Math.min(100, Math.abs(input.velocity) * 18));
  return clampScore(
    velocitySupport * 0.45 +
      input.quality * 0.35 +
      (100 - input.noise) * 0.2,
  );
}

function computeConvergenceHint(input: {
  trendAlignment: "UP" | "DOWN" | "FLAT";
  quality: number;
  noise: number;
  velocity: number;
}): number {
  const directionSupport =
    input.trendAlignment === "FLAT"
      ? 35
      : Math.abs(input.velocity) >= 0.2
        ? 80
        : 55;

  return clampScore(
    directionSupport * 0.45 +
      input.quality * 0.35 +
      (100 - input.noise) * 0.2,
  );
}

function computeEvolutionHint(input: {
  quality: number;
  volatility: number;
  noise: number;
  rupture: boolean;
}): number {
  const rupturePenalty = input.rupture ? 25 : 0;

  return clampScore(
    input.quality * 0.4 +
      (100 - input.volatility) * 0.25 +
      (100 - input.noise) * 0.25 +
      (100 - rupturePenalty) * 0.1,
  );
}

function computeMicroRupturePressure(input: {
  rupture: boolean;
  volatility: number;
  noise: number;
  velocity: number;
}): number {
  const ruptureSupport = input.rupture ? 85 : 25;
  const velocitySupport = clampScore(Math.min(100, Math.abs(input.velocity) * 20));

  return clampScore(
    ruptureSupport * 0.4 +
      input.volatility * 0.25 +
      input.noise * 0.2 +
      velocitySupport * 0.15,
  );
}

export function buildLiveTemporalBridge(
  live: LiveCoreOutput,
): LiveTemporalBridgeOutput {
  const quality = clampScore(live.metrics.quality_score);
  const noise = clampScore(live.metrics.noise_score);
  const volatility = clampScore(live.metrics.micro_volatility);
  const velocity = live.metrics.price_velocity;
  const rupture = live.metrics.micro_rupture_flag;
  const trendAlignment = live.metrics.trend_alignment;

  const warnings: string[] = [];

  if (noise >= 70) {
    warnings.push("live_bridge_high_noise");
  }

  if (quality < 35) {
    warnings.push("live_bridge_low_quality");
  }

  if (rupture) {
    warnings.push("live_bridge_micro_rupture_detected");
  }

  return {
    filtered_price: live.filtered_price,
    live_support: {
      quality_score: quality,
      noise_score: noise,
      micro_volatility: volatility,
      price_velocity: velocity,
      temporal_growth_hint: computeGrowthHint({
        velocity,
        quality,
        noise,
      }),
      temporal_convergence_hint: computeConvergenceHint({
        trendAlignment,
        quality,
        noise,
        velocity,
      }),
      temporal_evolution_hint: computeEvolutionHint({
        quality,
        volatility,
        noise,
        rupture,
      }),
      micro_rupture_pressure: computeMicroRupturePressure({
        rupture,
        volatility,
        noise,
        velocity,
      }),
    },
    warnings: uniqueWarnings(live.warnings, warnings),
  };
}
