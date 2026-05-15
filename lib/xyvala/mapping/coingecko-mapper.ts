/* ============================================================================
 * FILE: lib/xyvala/mapping/coingecko-mapper.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala CoinGecko provider mapper
 *
 * PARENT FILES
 * - lib/xyvala/services/raw-assets-service.ts
 * - lib/xyvala/mapping/mapping-rfs.ts
 *
 * ROLE
 * - map CoinGecko raw market payload into a deterministic provider-normalized shape
 * - isolate provider-specific schema away from Xyvala canonical contracts
 * - preserve nullable market fields without leaking provider internals downstream
 * - reject only assets with no usable identity at all
 *
 * DIRECTIVES
 * - FR / EU compatible provider layer
 * - no dependency on snapshot.ts
 * - no dependency on routes
 * - no RFS logic here
 * - no MCI logic here
 * - no public contract shaping here
 * - deterministic mapping only
 * - same provider input => same normalized provider output
 * - provider_id remains the preferred identity anchor
 * - missing market data must not reject an asset
 *
 * INPUTS
 * - unknown CoinGecko market payload item
 * - quote
 *
 * OUTPUTS
 * - CoinGeckoMappedAsset | null
 *
 * INVARIANTS
 * - provider mapping never mutates the input payload
 * - provider-specific fields remain namespaced here
 * - critical identity fields are normalized before downstream scoring
 * - null means unavailable
 * - undefined must never be exposed
 *
 * CRITICAL DEPENDENCIES
 * - CoinGecko market payload shape
 *
 * SENSITIVE ZONES
 * - provider field paths
 * - identity normalization
 * - fallback identity construction
 * - sparkline extraction
 * - asset rejection
 * ========================================================================== */

import type { Quote } from "@/lib/xyvala/snapshot";

/* ============================================================================
 * 1. CONSTANTS
 * ========================================================================== */

export const COINGECKO_MAPPER_VERSION = "v2" as const;
export const COINGECKO_PROVIDER = "coingecko" as const;

/* ============================================================================
 * 2. TYPES
 * ========================================================================== */

export type CoinGeckoIdentitySource =
  | "provider_id"
  | "symbol_fallback"
  | "name_fallback";

export type CoinGeckoMappedAsset = {
  provider: typeof COINGECKO_PROVIDER;
  provider_version: typeof COINGECKO_MAPPER_VERSION;

  provider_id: string | null;
  provider_symbol: string | null;
  provider_name: string | null;

  canonical_id: string | null;
  canonical_symbol: string | null;
  canonical_name: string | null;

  identity_source: CoinGeckoIdentitySource | null;

  base_asset: string | null;
  quote_asset: string | null;

  price: number | null;
  chg_24h_pct: number | null;
  chg_7d_pct: number | null;

  market_cap: number | null;
  volume_24h: number | null;
  sparkline_7d: number[] | null;

  rank: number | null;
  logo_url: string | null;

  binance_url: string;
  affiliate_url: string;

  raw_identity_fingerprint: string | null;
  raw_market_fingerprint: string | null;
};

/* ============================================================================
 * 3. DATA PROCESSING — SAFE HELPERS
 * ========================================================================== */

function safeStr(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeLower(value: unknown, fallback = ""): string {
  return safeStr(value, fallback).toLowerCase();
}

function safeUpper(value: unknown, fallback = ""): string {
  return safeStr(value, fallback).toUpperCase();
}

function safeNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeNullableString(value: unknown): string | null {
  const normalized = safeStr(value);
  return normalized.length > 0 ? normalized : null;
}

function safeSparkline(value: unknown): number[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const points = value.filter(
    (item): item is number =>
      typeof item === "number" && Number.isFinite(item),
  );

  return points.length >= 2 ? points : null;
}

function normalizeQuote(value: Quote | string | null | undefined): Quote {
  if (value === "usd") return "usd";
  if (value === "usdt") return "usdt";
  return "eur";
}

function slugifyIdentity(value: string): string | null {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length > 0 ? slug : null;
}

/* ============================================================================
 * 4. DATA PROCESSING — URL HELPERS
 * ========================================================================== */

function buildBinanceUrl(symbol: string | null, quote: Quote): string {
  if (!symbol) return "#";

  const normalizedQuote = quote === "usd" ? "usdt" : quote;

  return `https://www.binance.com/en/trade/${encodeURIComponent(
    `${symbol.toUpperCase()}_${normalizedQuote.toUpperCase()}`,
  )}`;
}

function buildAffiliateUrl(binanceUrl: string): string {
  const ref = safeStr(process.env.BINANCE_REF);

  if (!ref || binanceUrl === "#") {
    return binanceUrl;
  }

  return `${binanceUrl}?ref=${encodeURIComponent(ref)}`;
}

/* ============================================================================
 * 5. DATA PROCESSING — FINGERPRINTS
 * ========================================================================== */

function buildIdentityFingerprint(input: {
  provider_id: string | null;
  symbol: string | null;
  name: string | null;
}): string | null {
  const providerId = input.provider_id ?? "";
  const symbol = input.symbol ?? "";
  const name = input.name ?? "";

  if (!providerId && !symbol && !name) {
    return null;
  }

  return [
    COINGECKO_PROVIDER,
    providerId.toLowerCase(),
    symbol.toUpperCase(),
    name.toLowerCase(),
  ].join("|");
}

function buildMarketFingerprint(input: {
  provider_id: string | null;
  symbol: string | null;
  quote: Quote;
}): string | null {
  const providerId = input.provider_id ?? "";
  const symbol = input.symbol ?? "";

  if (!providerId && !symbol) {
    return null;
  }

  return [
    COINGECKO_PROVIDER,
    providerId.toLowerCase(),
    symbol.toUpperCase(),
    input.quote,
  ].join("|");
}

/* ============================================================================
 * 6. DATA PROCESSING — IDENTITY RESOLUTION
 * ========================================================================== */

function resolveCanonicalIdentity(input: {
  provider_id: string | null;
  provider_symbol: string | null;
  provider_name: string | null;
}): {
  canonical_id: string | null;
  canonical_symbol: string | null;
  canonical_name: string | null;
  identity_source: CoinGeckoIdentitySource | null;
} {
  const canonicalSymbol = input.provider_symbol
    ? input.provider_symbol.toUpperCase()
    : null;

  const canonicalName = input.provider_name ?? canonicalSymbol ?? null;

  if (input.provider_id) {
    return {
      canonical_id: input.provider_id,
      canonical_symbol: canonicalSymbol,
      canonical_name: canonicalName,
      identity_source: "provider_id",
    };
  }

  if (canonicalSymbol) {
    return {
      canonical_id: canonicalSymbol.toLowerCase(),
      canonical_symbol: canonicalSymbol,
      canonical_name: canonicalName,
      identity_source: "symbol_fallback",
    };
  }

  if (input.provider_name) {
    return {
      canonical_id: slugifyIdentity(input.provider_name),
      canonical_symbol: null,
      canonical_name: input.provider_name,
      identity_source: "name_fallback",
    };
  }

  return {
    canonical_id: null,
    canonical_symbol: null,
    canonical_name: null,
    identity_source: null,
  };
}

/* ============================================================================
 * 7. EXECUTION — PUBLIC MAPPER
 * ========================================================================== */

export function mapCoinGeckoAsset(
  value: unknown,
  quoteInput?: Quote | string | null,
): CoinGeckoMappedAsset | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const item = value as Record<string, unknown>;
  const quote = normalizeQuote(quoteInput);

  const providerId = safeLower(item.id) || null;
  const providerSymbol = safeLower(item.symbol) || null;
  const providerName = safeStr(item.name) || null;

  const hasIdentity =
    providerId !== null ||
    providerSymbol !== null ||
    providerName !== null;

  if (!hasIdentity) {
    return null;
  }

  const identity = resolveCanonicalIdentity({
    provider_id: providerId,
    provider_symbol: providerSymbol,
    provider_name: providerName,
  });

  if (!identity.canonical_id && !identity.canonical_symbol && !identity.canonical_name) {
    return null;
  }

  const baseAsset = identity.canonical_symbol;
  const quoteAsset = safeUpper(quote);

  const binanceUrl = buildBinanceUrl(identity.canonical_symbol, quote);

  return {
    provider: COINGECKO_PROVIDER,
    provider_version: COINGECKO_MAPPER_VERSION,

    provider_id: providerId,
    provider_symbol: providerSymbol,
    provider_name: providerName,

    canonical_id: identity.canonical_id,
    canonical_symbol: identity.canonical_symbol,
    canonical_name: identity.canonical_name,
    identity_source: identity.identity_source,

    base_asset: baseAsset,
    quote_asset: quoteAsset,

    price: safeNumberOrNull(item.current_price),
    chg_24h_pct: safeNumberOrNull(item.price_change_percentage_24h),
    chg_7d_pct: safeNumberOrNull(item.price_change_percentage_7d_in_currency),

    market_cap: safeNumberOrNull(item.market_cap),
    volume_24h: safeNumberOrNull(item.total_volume),
    sparkline_7d: safeSparkline(
      (item.sparkline_in_7d as { price?: unknown } | undefined)?.price,
    ),

    rank: safeNumberOrNull(item.market_cap_rank),
    logo_url: safeNullableString(item.image),

    binance_url: binanceUrl,
    affiliate_url: buildAffiliateUrl(binanceUrl),

    raw_identity_fingerprint: buildIdentityFingerprint({
      provider_id: providerId,
      symbol: identity.canonical_symbol,
      name: identity.canonical_name,
    }),

    raw_market_fingerprint: buildMarketFingerprint({
      provider_id: providerId,
      symbol: identity.canonical_symbol,
      quote,
    }),
  };
}
