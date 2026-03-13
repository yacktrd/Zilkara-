// lib/xyvala/scan.ts

import "server-only";

export type Regime = "STABLE" | "TRANSITION" | "VOLATILE";

export type SortMode =
  | "score_desc"
  | "score_asc"
  | "price_desc"
  | "price_asc"
  | "chg_24h_desc"
  | "chg_24h_asc"
  | "market_cap_desc"
  | "market_cap_asc"
  | "volume_desc"
  | "volume_asc"
  | "symbol_asc"
  | "symbol_desc";

export type ScanQuote = "usd" | "eur" | "usdt";

export type ScanAsset = {
  id: string;
  symbol: string;
  name: string;

  // Public stable fields
  price: number;
  chg_24h_pct: number;
  market_cap?: number;
  volume_24h?: number;

  // Backward-compatibility alias
  h24?: number;

  confidence_score: number;
  regime: Regime;

  binance_url: string;
  affiliate_url?: string;
};

export type ScanResult = {
  ok: boolean;
  ts: string;
  source: "coingecko" | "fallback";
  market: "crypto";
  quote: ScanQuote;
  count: number;
  data: ScanAsset[];
  meta: {
    limit: number;
    sort: SortMode;
    warnings?: string[];
  };
  error?: string;
};

export type ScanParams = {
  limit?: number;
  sort?: SortMode;
  quote?: ScanQuote;
  market?: "crypto";
};

type CGItem = {
  id?: string;
  symbol?: string;
  name?: string;
  current_price?: number;
  price_change_percentage_24h?: number | null;
  market_cap?: number | null;
  total_volume?: number | null;
};

const DEFAULT_LIMIT = 250;
const MAX_LIMIT = 250;
const DEFAULT_SORT: SortMode = "score_desc";
const DEFAULT_QUOTE: ScanQuote = "usd";
const DEFAULT_MARKET: "crypto" = "crypto";

const FETCH_TIMEOUT_MS = 8_500;
const MIN_FETCH_SIZE = 80;
const MAX_FETCH_SIZE = 250;

const COINGECKO_URL = "https://api.coingecko.com/api/v3/coins/markets";
const FALLBACK_BINANCE_URL = "https://www.binance.com/en/markets";

function nowIso(): string {
  return new Date().toISOString();
}

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeNum(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeOptionalNum(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function clampInt(value: unknown, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeQuote(value: unknown): ScanQuote {
  const quote = safeStr(value).toLowerCase();
  if (quote === "eur") return "eur";
  if (quote === "usdt") return "usdt";
  return "usd";
}

function normalizeSort(value: unknown): SortMode {
  const sort = safeStr(value).toLowerCase();

  switch (sort) {
    case "score_asc":
    case "score_desc":
    case "price_asc":
    case "price_desc":
    case "chg_24h_asc":
    case "chg_24h_desc":
    case "market_cap_asc":
    case "market_cap_desc":
    case "volume_asc":
    case "volume_desc":
    case "symbol_asc":
    case "symbol_desc":
      return sort;
    default:
      return DEFAULT_SORT;
  }
}

function normalizeSymbol(value: unknown): string {
  const symbol = safeStr(value).toUpperCase();
  return symbol.replace(/[^A-Z0-9]/g, "").slice(0, 20);
}

function titleizeId(id: string): string {
  return id
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function normalizeName(name: unknown, id: unknown, symbol: unknown): string {
  const normalizedName = safeStr(name);
  if (normalizedName) return normalizedName;

  const normalizedId = safeStr(id);
  if (normalizedId) return titleizeId(normalizedId);

  const normalizedSymbol = normalizeSymbol(symbol);
  return normalizedSymbol || "Unknown";
}

function normalizeRegime(chg24hPct: number): Regime {
  const abs = Math.abs(chg24hPct);

  if (abs <= 3) return "STABLE";
  if (abs <= 8) return "TRANSITION";
  return "VOLATILE";
}

/**
 * Score volontairement simple, stable et explicable :
 * - favorise faible volatilité 24h
 * - ajoute un bonus de profondeur (market cap)
 * - ajoute un bonus de liquidité (volume)
 * - réduit le score si régime plus instable
 */
function computeScore(input: {
  chg24hPct: number;
  marketCap?: number;
  volume24h?: number;
  regime: Regime;
}): number {
  const { chg24hPct, marketCap, volume24h, regime } = input;

  const volatilityFactor = 1 - Math.min(1, Math.abs(chg24hPct) / 10);

  const mcLog = marketCap && marketCap > 0 ? Math.log10(marketCap) : 10;
  const marketCapFactor = Math.min(1, Math.max(0, (mcLog - 8) / 4));

  const volLog = volume24h && volume24h > 0 ? Math.log10(volume24h) : 9;
  const volumeFactor = Math.min(1, Math.max(0, (volLog - 7) / 4));

  const regimeModifier =
    regime === "STABLE" ? 1.0 : regime === "TRANSITION" ? 0.85 : 0.65;

  const raw =
    100 *
    (0.6 * volatilityFactor + 0.25 * marketCapFactor + 0.15 * volumeFactor) *
    regimeModifier;

  return clampScore(raw);
}

function buildBinanceUrl(symbol: string): string {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) return FALLBACK_BINANCE_URL;

  return `https://www.binance.com/en/trade/${encodeURIComponent(
    normalized
  )}USDT?_from=markets`;
}

function buildAffiliateUrl(binanceUrl: string): string | undefined {
  const ref = safeStr(process.env.BINANCE_AFFILIATE_REF);
  if (!ref) return undefined;

  try {
    const url = new URL(binanceUrl);
    if (!url.searchParams.get("ref")) {
      url.searchParams.set("ref", ref);
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

async function fetchCoinGecko(
  quote: ScanQuote,
  perPage: number
): Promise<CGItem[]> {
  const vsCurrency = quote === "usdt" ? "usd" : quote;

  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    order: "market_cap_desc",
    per_page: String(perPage),
    page: "1",
    sparkline: "false",
    price_change_percentage: "24h",
  });

  const url = `${COINGECKO_URL}?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`coingecko_http_${response.status}`);
    }

    const json = (await response.json()) as unknown;

    if (!Array.isArray(json)) {
      throw new Error("coingecko_response_not_array");
    }

    return json as CGItem[];
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackUniverse(): ScanAsset[] {
  const base = [
    { id: "bitcoin", symbol: "BTC", name: "Bitcoin", price: 0, chg_24h_pct: 0 },
    { id: "ethereum", symbol: "ETH", name: "Ethereum", price: 0, chg_24h_pct: 0 },
    { id: "tether", symbol: "USDT", name: "Tether", price: 1, chg_24h_pct: 0 },
    { id: "binancecoin", symbol: "BNB", name: "BNB", price: 0, chg_24h_pct: 0 },
    { id: "solana", symbol: "SOL", name: "Solana", price: 0, chg_24h_pct: 0 },
    { id: "ripple", symbol: "XRP", name: "XRP", price: 0, chg_24h_pct: 0 },
  ] as const;

  return base.map((asset) => {
    const regime = normalizeRegime(asset.chg_24h_pct);
    const confidenceScore = computeScore({
      chg24hPct: asset.chg_24h_pct,
      regime,
    });

    const binanceUrl = buildBinanceUrl(asset.symbol);
    const affiliateUrl = buildAffiliateUrl(binanceUrl);

    return {
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      price: asset.price,
      chg_24h_pct: asset.chg_24h_pct,
      h24: asset.chg_24h_pct,
      confidence_score: confidenceScore,
      regime,
      binance_url: binanceUrl,
      affiliate_url: affiliateUrl,
    };
  });
}

function normalizeAsset(input: CGItem): ScanAsset | null {
  const id = safeStr(input.id);
  const symbol = normalizeSymbol(input.symbol);

  if (!id || !symbol) return null;

  const name = normalizeName(input.name, input.id, input.symbol);
  const price = safeNum(input.current_price, 0);
  const chg24hPct = safeNum(input.price_change_percentage_24h, 0);
  const marketCap = safeOptionalNum(input.market_cap);
  const volume24h = safeOptionalNum(input.total_volume);

  const regime = normalizeRegime(chg24hPct);
  const confidenceScore = computeScore({
    chg24hPct,
    marketCap,
    volume24h,
    regime,
  });

  const binanceUrl = buildBinanceUrl(symbol);
  const affiliateUrl = buildAffiliateUrl(binanceUrl);

  return {
    id,
    symbol,
    name,
    price,
    chg_24h_pct: chg24hPct,
    h24: chg24hPct,
    market_cap: marketCap,
    volume_24h: volume24h,
    confidence_score: confidenceScore,
    regime,
    binance_url: binanceUrl,
    affiliate_url: affiliateUrl,
  };
}

function compareNullableNumbers(
  a: number | undefined,
  b: number | undefined,
  direction: 1 | -1
): number {
  const aHas = typeof a === "number" && Number.isFinite(a);
  const bHas = typeof b === "number" && Number.isFinite(b);

  if (aHas !== bHas) return aHas ? -1 : 1;
  if (!aHas && !bHas) return 0;
  if (a === b) return 0;

  return ((a as number) - (b as number)) * direction;
}

function sortAssets(list: ScanAsset[], sort: SortMode): ScanAsset[] {
  const copy = [...list];

  copy.sort((a, b) => {
    switch (sort) {
      case "score_asc":
        if (a.confidence_score !== b.confidence_score) {
          return a.confidence_score - b.confidence_score;
        }
        break;

      case "score_desc":
        if (a.confidence_score !== b.confidence_score) {
          return b.confidence_score - a.confidence_score;
        }
        break;

      case "price_asc":
        if (a.price !== b.price) return a.price - b.price;
        break;

      case "price_desc":
        if (a.price !== b.price) return b.price - a.price;
        break;

      case "chg_24h_asc":
        if (a.chg_24h_pct !== b.chg_24h_pct) {
          return a.chg_24h_pct - b.chg_24h_pct;
        }
        break;

      case "chg_24h_desc":
        if (a.chg_24h_pct !== b.chg_24h_pct) {
          return b.chg_24h_pct - a.chg_24h_pct;
        }
        break;

      case "market_cap_asc": {
        const cmp = compareNullableNumbers(a.market_cap, b.market_cap, 1);
        if (cmp !== 0) return cmp;
        break;
      }

      case "market_cap_desc": {
        const cmp = compareNullableNumbers(a.market_cap, b.market_cap, -1);
        if (cmp !== 0) return cmp;
        break;
      }

      case "volume_asc": {
        const cmp = compareNullableNumbers(a.volume_24h, b.volume_24h, 1);
        if (cmp !== 0) return cmp;
        break;
      }

      case "volume_desc": {
        const cmp = compareNullableNumbers(a.volume_24h, b.volume_24h, -1);
        if (cmp !== 0) return cmp;
        break;
      }

      case "symbol_asc":
        if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
        break;

      case "symbol_desc":
        if (a.symbol !== b.symbol) return b.symbol.localeCompare(a.symbol);
        break;
    }

    if (a.confidence_score !== b.confidence_score) {
      return b.confidence_score - a.confidence_score;
    }

    return a.symbol.localeCompare(b.symbol);
  });

  return copy;
}

export async function getXyvalaScan(
  params: ScanParams = {}
): Promise<ScanResult> {
  const ts = nowIso();
  const warnings: string[] = [];

  const market = DEFAULT_MARKET;
  const quote = normalizeQuote(params.quote);
  const sort = normalizeSort(params.sort);
  const limit = clampInt(params.limit ?? DEFAULT_LIMIT, 1, MAX_LIMIT);

  const fetchSize = Math.max(MIN_FETCH_SIZE, Math.min(MAX_FETCH_SIZE, limit));

  try {
    const raw = await fetchCoinGecko(quote, fetchSize);

    const normalized = raw
      .map(normalizeAsset)
      .filter((asset): asset is ScanAsset => Boolean(asset));

    if (!normalized.length) {
      warnings.push("scan_normalization_empty");

      const fallbackData = sortAssets(fallbackUniverse(), sort).slice(0, limit);

      return {
        ok: true,
        ts,
        source: "fallback",
        market,
        quote,
        count: fallbackData.length,
        data: fallbackData,
        meta: {
          limit,
          sort,
          warnings,
        },
      };
    }

    const sorted = sortAssets(normalized, sort).slice(0, limit);

    return {
      ok: true,
      ts,
      source: "coingecko",
      market,
      quote,
      count: sorted.length,
      data: sorted,
      meta: {
        limit,
        sort,
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "unknown_error";

    warnings.push(`scan_fetch_failed:${message}`);

    const fallbackData = sortAssets(fallbackUniverse(), sort).slice(0, limit);

    return {
      ok: true,
      ts,
      source: "fallback",
      market,
      quote,
      count: fallbackData.length,
      data: fallbackData,
      meta: {
        limit,
        sort,
        warnings,
      },
      error: message,
    };
  }
}
