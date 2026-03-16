// lib/xyvala/services/market-data-service.ts

/**
 * Xyvala Market Data Service
 *
 * Responsable de récupérer les données crypto brutes
 * puis de les convertir vers le contrat ScanAsset
 * via le pont central buildScanAsset().
 */

import type { Regime, ScanAsset } from "@/lib/xyvala/contracts/scan-contract";
import { buildScanAsset } from "@/lib/xyvala/factories/scan-asset-factory";

const BINANCE_API = "https://api.binance.com/api/v3/ticker/24hr";
const MAX_ASSETS = 100;

type BinanceTicker = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
};

function safeNumberFromString(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRegimeFromChange(changePct: number): Regime {
  const abs = Math.abs(changePct);

  if (abs < 0.5) return "STABLE";
  if (abs < 2) return "TRANSITION";
  return "VOLATILE";
}

function computeConfidenceScore(changePct: number): number {
  return Math.min(100, Math.round(Math.abs(changePct) * 2));
}

function computeScoreTrend(changePct: number): string | null {
  if (changePct > 0) return "UP";
  if (changePct < 0) return "DOWN";
  return "FLAT";
}

function buildBinanceTradeUrl(symbol: string): string {
  return `https://www.binance.com/en/trade/${encodeURIComponent(symbol)}`;
}

function mapBinanceTickerToScanAsset(asset: BinanceTicker): ScanAsset {
  const price = safeNumberFromString(asset.lastPrice, 0);
  const chg_24h_pct = safeNumberFromString(asset.priceChangePercent, 0);
  const volume_24h = safeNumberFromString(asset.volume, 0);

  return buildScanAsset({
    id: asset.symbol.toLowerCase(),
    symbol: asset.symbol,
    name: asset.symbol,

    price,
    chg_24h_pct,
    confidence_score: computeConfidenceScore(chg_24h_pct),

    score_delta: null,
    score_trend: computeScoreTrend(chg_24h_pct),

    regime: normalizeRegimeFromChange(chg_24h_pct),

    market_cap: undefined,
    volume_24h,

    binance_url: buildBinanceTradeUrl(asset.symbol),
  });
}

export async function fetchMarketData(): Promise<ScanAsset[]> {
  const res = await fetch(BINANCE_API, {
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error("market_fetch_failed");
  }

  const data = (await res.json()) as BinanceTicker[];

  if (!Array.isArray(data)) {
    throw new Error("market_invalid_shape");
  }

  return data.slice(0, MAX_ASSETS).map(mapBinanceTickerToScanAsset);
}
