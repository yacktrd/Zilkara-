// lib/xyvala/factories/scan-asset-factory.ts

import type { Regime, ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

export type BuildScanAssetInput = {
  id?: unknown;
  symbol?: unknown;
  name?: unknown;

  price?: unknown;
  chg_24h_pct?: unknown;
  confidence_score?: unknown;

  score_delta?: unknown;
  score_trend?: unknown;

  regime?: unknown;

  market_cap?: unknown;
  volume_24h?: unknown;

  binance_url?: unknown;
};

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function safeNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeRegime(value: unknown): Regime {
  const regime = safeStr(value).toUpperCase();

  if (regime === "STABLE") return "STABLE";
  if (regime === "VOLATILE") return "VOLATILE";
  return "TRANSITION";
}

export function buildScanAsset(input: BuildScanAssetInput): ScanAsset {
  const symbol = safeStr(input.symbol) || "UNKNOWN";

  return {
    id: safeStr(input.id) || symbol.toLowerCase(),
    symbol,
    name: safeStr(input.name) || symbol,

    price: safeNumber(input.price, 0),
    chg_24h_pct: safeNumber(input.chg_24h_pct, 0),
    confidence_score: safeNumber(input.confidence_score, 0),

    score_delta: safeNullableNumber(input.score_delta),
    score_trend: safeNullableString(input.score_trend),

    regime: normalizeRegime(input.regime),

    market_cap: safeOptionalNumber(input.market_cap),
    volume_24h: safeOptionalNumber(input.volume_24h),

    binance_url: safeStr(input.binance_url),
  };
}

export function buildScanAssets(inputs: BuildScanAssetInput[]): ScanAsset[] {
  if (!Array.isArray(inputs)) return [];
  return inputs.map(buildScanAsset);
}
