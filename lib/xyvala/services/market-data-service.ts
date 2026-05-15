/*
FILE: lib/xyvala/services/market-data-service.ts

PARENTS:
- lib/xyvala/contracts/scan-contract.ts
- lib/xyvala/factories/scan-asset-factory.ts

ROLE:
- retrieve raw Binance market data
- convert it into the public ScanAsset contract
- preserve public/private separation

DIRECTIVES:
- public ScanAsset only
- no regime
- no decision
- no opportunity_score
- no broker / affiliation field
- no UI logic
- no engine logic
- deterministic raw market adaptation only
*/

import type { PrivateScanAsset } from "@/lib/xyvala/contracts/scan-private-contract";
import { buildPrivateScanAsset } from "@/lib/xyvala/factories/scan-asset-factory";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const BINANCE_API = "https://api.binance.com/api/v3/ticker/24hr";
const MAX_ASSETS = 100;

/* ============================================================================
 * 2. RAW MARKET TYPES
 * ========================================================================== */

type BinanceTicker = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
};

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeSymbol(value: unknown): string {
  return safeString(value).toUpperCase();
}

function safeNumberFromString(value: unknown, fallback = 0): number {
  if (typeof value !== "string") return fallback;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

/* ============================================================================
 * 4. PUBLIC SCORE NORMALIZERS
 * ========================================================================== */

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function computePublicStabilityScore(changePct: number): number {
  const abs = Math.abs(changePct);

  if (abs < 0.5) return 90;
  if (abs < 1) return 75;
  if (abs < 2) return 60;
  if (abs < 4) return 40;

  return 20;
}

/* ============================================================================
 * 5. RAW TICKER MAPPER
 * ========================================================================== */

function mapBinanceTickerToScanAsset(asset: BinanceTicker): PrivateScanAsset {
  const symbol = safeSymbol(asset.symbol);
  const price = safeNumberFromString(asset.lastPrice, 0);
  const chg24hPct = safeNumberFromString(asset.priceChangePercent, 0);
  const volume24h = safeNumberFromString(asset.volume, 0);

  const stabilityScore = clampScore(
    computePublicStabilityScore(chg24hPct),
  );

  return buildPrivateScanAsset({
    id: symbol.toLowerCase(),
    symbol,
    name: symbol,

    price,
    chg_24h_pct: chg24hPct,
    chg_7d_pct: null,

    market_cap: null,
    volume_24h: volume24h,

    stability_score: stabilityScore,
    stability_status: "computed",

    sparkline_7d: null,

    rank: null,
    logo_url: null,
  });
}

/* ============================================================================
 * 6. PUBLIC MARKET FETCHER
 * ========================================================================== */

export async function fetchMarketData(): Promise<PrivateScanAsset[]> {
  const response = await fetch(BINANCE_API, {
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    throw new Error("market_fetch_failed");
  }

  const data = (await response.json()) as unknown;

  if (!Array.isArray(data)) {
    throw new Error("market_invalid_shape");
  }

  return data
    .slice(0, MAX_ASSETS)
    .map((item) => mapBinanceTickerToScanAsset(item as BinanceTicker));
}
