/* ============================================================================
 * FILE: lib/xyvala/sources/market-normalizer.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala market source normalizer
 *
 * ROLE
 * - normalize external market payloads into stable AssetSeed entries
 * - isolate provider-specific fields from market-source.ts
 * - prevent undefined propagation from external APIs
 *
 * DIRECTIVES
 * - data normalization only
 * - no fetch logic
 * - no API route logic
 * - no UI logic
 * - no cache logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - EUR compatibility is handled by market-source.ts
 * - undefined must never be exposed
 * - null means explicitly unavailable
 * - same input => same output
 * ========================================================================== */

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

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

export type CoinGeckoMarketCoin = {
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

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : fallback;
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
    (item): item is number =>
      typeof item === "number" && Number.isFinite(item),
  );
}

function normalizeRank(value: unknown): number {
  const rank = safeFiniteNumber(value, 999);

  if (!Number.isFinite(rank) || rank <= 0) {
    return 999;
  }

  return Math.trunc(rank);
}

function normalizeLogoUrl(value: unknown): string | null {
  const url = safeString(value);

  return url.length > 0 ? url : null;
}

/* ============================================================================
 * 3. PROVIDER NORMALIZATION
 * ========================================================================== */

export function normalizeCoinGeckoCoinToSeed(
  coin: CoinGeckoMarketCoin,
): AssetSeed {
  const sparkline7d = safeNumberArray(coin.sparkline_in_7d?.price);

  return {
    id: safeString(coin.id),
    symbol: safeString(coin.symbol).toUpperCase(),
    name: safeString(coin.name),

    rank: normalizeRank(coin.market_cap_rank),
    logo_url: normalizeLogoUrl(coin.image),

    price: safeFiniteNumber(coin.current_price, 0),
    chg_24h_pct: safeFiniteNumber(coin.price_change_percentage_24h, 0),
    chg_7d_pct: safeFiniteNumberOrNull(
      coin.price_change_percentage_7d_in_currency,
    ),

    market_cap: safeFiniteNumberOrNull(coin.market_cap),
    volume_24h: safeFiniteNumberOrNull(coin.total_volume),

    sparkline_7d: sparkline7d,
  };
}

export function isUsableAssetSeed(seed: AssetSeed): boolean {
  return (
    seed.id.length > 0 &&
    seed.symbol.length > 0 &&
    seed.name.length > 0
  );
}

export function normalizeMarketSeeds(rawData: unknown): AssetSeed[] {
  if (!Array.isArray(rawData)) return [];

  const seeds: AssetSeed[] = [];

  for (const item of rawData) {
    const seed = normalizeCoinGeckoCoinToSeed(item as CoinGeckoMarketCoin);

    if (isUsableAssetSeed(seed)) {
      seeds.push(seed);
    }
  }

  return seeds;
}
