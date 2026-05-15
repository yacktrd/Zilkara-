/*
FILE: lib/xyvala/scan.ts

ROLE:
- Market data source (CoinGecko)
- Normalization only

NO:
- No RFS
- No MCI
- No decision
*/

const COINGECKO_URL = "https://api.coingecko.com/api/v3/coins/markets";

export type SupportedQuote = "eur" | "usd" | "usdt";

export type MarketSourceAsset = {
  id: string;
  symbol: string;
  name: string;

  price: number;
  chg_24h_pct: number;

  market_cap: number | null;
  volume_24h: number | null;

  sparkline_7d: number[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeSparkline(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "number");
}

function buildUrl(limit: number, currency: SupportedQuote) {
  const params = new URLSearchParams({
    vs_currency: currency,
    order: "market_cap_desc",
    per_page: String(limit),
    page: "1",
    sparkline: "true",
    price_change_percentage: "24h",
  });

  return `${COINGECKO_URL}?${params.toString()}`;
}

export async function fetchMarketData(
  limit: number,
  currency: SupportedQuote = "eur"
): Promise<any[]> {
  const safeLimit = clamp(limit, 1, 250);
  const url = buildUrl(safeLimit, currency);

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error("coingecko_error");
  }

  const data = await res.json();

  if (!Array.isArray(data)) {
    throw new Error("invalid_format");
  }

  return data;
}

export function toMarketSourceAsset(asset: any): MarketSourceAsset {
  return {
    id: asset.id,
    symbol: asset.symbol?.toUpperCase(),
    name: asset.name,

    price: safeNumber(asset.current_price),
    chg_24h_pct: safeNumber(asset.price_change_percentage_24h),

    market_cap: safeNumber(asset.market_cap),
    volume_24h: safeNumber(asset.total_volume),

    sparkline_7d: normalizeSparkline(asset.sparkline_in_7d?.price),
  };
}
