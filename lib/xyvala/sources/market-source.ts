/* ==========================================================================
   FILE: lib/xyvala/sources/market-source.ts
   --------------------------------------------------------------------------
   TITLE
   - Xyvala CoinGecko market source

   ROLE
   - fetch normalized market seeds from CoinGecko
   - provide stable upstream AssetSeed data for scan-service
   - keep provider acquisition isolated from scan orchestration

   DIRECTIVES
   - source layer only
   - EUR default compatible quote
   - no UI logic
   - no RFS recomputation
   - no MCI recomputation
   - no public structure interpretation
   - no cache mutation
   - fallback returns []
   - deterministic output shape
   ========================================================================== */

import type { Quote } from "@/lib/xyvala/snapshot";

/* ==========================================================================
   1. TYPES
   ========================================================================== */

export type AssetSeed = {
  id: string;
  symbol: string;
  name: string;
  rank: number;
  logo_url: string | null;

  price: number;
  chg_24h_pct: number;
  chg_7d_pct: number | null;

  market_cap: number | null;
  volume_24h: number | null;

  sparkline_7d: number[];
};

type CoinGeckoMarketCoin = {
  id?: unknown;
  symbol?: unknown;
  name?: unknown;
  market_cap_rank?: unknown;
  image?: unknown;
  current_price?: unknown;
  price_change_percentage_24h?: unknown;
  price_change_percentage_7d_in_currency?: unknown;
  market_cap?: unknown;
  total_volume?: unknown;
  sparkline_in_7d?: {
    price?: unknown;
  } | null;
};

/* ==========================================================================
   2. CONFIG
   ========================================================================== */

const DEFAULT_API_BASE_URL = "https://api.coingecko.com/api/v3";
const DEFAULT_QUOTE: Quote = "eur";
const DEFAULT_PER_PAGE = 250;
const DEFAULT_PAGE = 1;
const REQUEST_TIMEOUT_MS = 12_000;
const REVALIDATE_SECONDS = 60;

/* ==========================================================================
   3. SAFE HELPERS
   ========================================================================== */

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeUpper(value: unknown, fallback = ""): string {
  return safeString(value, fallback).toUpperCase();
}

function safeFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeFiniteNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is number => typeof item === "number" && Number.isFinite(item),
  );
}

function normalizeQuote(value: Quote | string | null | undefined): "eur" | "usd" {
  if (value === "usd") return "usd";

  /*
   * CoinGecko does not need a USDT quote here.
   * USDT public display can remain isolated later if required.
   */
  return "eur";
}

function buildAbortSignal(timeoutMs: number): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

/* ==========================================================================
   4. URL BUILDER
   ========================================================================== */

function buildCoinGeckoMarketUrl(quote: "eur" | "usd"): string {
  const baseUrl = safeString(
    process.env.COINGECKO_API_BASE_URL,
    DEFAULT_API_BASE_URL,
  );

  const normalizedBaseUrl = `${baseUrl.replace(/\/+$/, "")}/`;
  const url = new URL("coins/markets", normalizedBaseUrl);

  url.searchParams.set("vs_currency", quote);
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("per_page", String(DEFAULT_PER_PAGE));
  url.searchParams.set("page", String(DEFAULT_PAGE));
  url.searchParams.set("sparkline", "true");
  url.searchParams.set("price_change_percentage", "24h,7d");

  return url.toString();
}

function buildHeaders(): Record<string, string> {
  const apiKey = safeString(process.env.COINGECKO_API_KEY);

  const headers: Record<string, string> = {
    accept: "application/json",
  };

  if (apiKey) {
    headers["x-cg-pro-api-key"] = apiKey;
  }

  return headers;
}

/* ==========================================================================
   5. NORMALIZATION
   ========================================================================== */

function normalizeCoinToSeed(coin: CoinGeckoMarketCoin): AssetSeed | null {
  const id = safeString(coin.id).toLowerCase();
  const symbol = safeUpper(coin.symbol);
  const name = safeString(coin.name);

  if (!id || !symbol || !name) {
    return null;
  }

  return {
    id,
    symbol,
    name,

    rank: Math.max(1, Math.trunc(safeFiniteNumber(coin.market_cap_rank, 999))),
    logo_url: typeof coin.image === "string" ? coin.image : null,

    price: safeFiniteNumber(coin.current_price, 0),
    chg_24h_pct: safeFiniteNumber(coin.price_change_percentage_24h, 0),
    chg_7d_pct: safeFiniteNumberOrNull(
      coin.price_change_percentage_7d_in_currency,
    ),

    market_cap: safeFiniteNumberOrNull(coin.market_cap),
    volume_24h: safeFiniteNumberOrNull(coin.total_volume),

    sparkline_7d: safeNumberArray(coin.sparkline_in_7d?.price),
  };
}

/* ==========================================================================
   6. MARKET SOURCE API
   ========================================================================== */

export async function getMarketAssets(
  inputQuote: Quote | string | null = DEFAULT_QUOTE,
): Promise<AssetSeed[]> {
  try {
    const quote = normalizeQuote(inputQuote);
    const url = buildCoinGeckoMarketUrl(quote);

    const response = await fetch(url, {
      method: "GET",
      headers: buildHeaders(),
      next: { revalidate: REVALIDATE_SECONDS },
      signal: buildAbortSignal(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return [];
    }

    const payload: unknown = await response.json();

    if (!Array.isArray(payload)) {
      return [];
    }

    return payload
      .map((coin) => normalizeCoinToSeed(coin as CoinGeckoMarketCoin))
      .filter((seed): seed is AssetSeed => seed !== null);
  } catch {
    return [];
  }
}
