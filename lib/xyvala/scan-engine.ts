/* ============================================================================
 * FILE: lib/xyvala/scan-engine.ts
 * ========================================================================== */

import type {
  PrivateScanAsset,
  PrivateScanRegime,
  PrivateScanStatus,
} from "@/lib/xyvala/contracts/scan-private-contract";

import { runRFS } from "@/lib/xyvala/rfs-core";

import {
  buildMarketContext,
  type MarketContext,
} from "@/lib/xyvala/market-context";

export type ScanEngineSortKey = "stability" | "price";
export type ScanEngineSortOrder = "asc" | "desc";

export type ScanEngineResult = {
  data: PrivateScanAsset[];
  market_context: MarketContext;
};

const MIN_RFS_PRICES = 8;

function clampScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
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

export function applyRFS(data: PrivateScanAsset[]): PrivateScanAsset[] {
  return data.map((asset) => {
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
        governance: {
          ...asset.governance,
          warnings: [...asset.governance.warnings, "scan_engine_rfs_failed"],
        },
      };
    }
  });
}

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
