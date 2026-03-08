
import "server-only";

export type Regime = "STABLE" | "TRANSITION" | "VOLATILE";
export type SortMode = "score_desc" | "score_asc" | "price_desc" | "price_asc";
export type Quote = "usd" | "eur" | "usdt";
export type Market = "crypto";

export type ScanAsset = {
  id: string;
  symbol: string;
  name: string;

  // Canonical market data
  price: number;
  h24: number; // legacy alias kept for compatibility
  chg_24h_pct: number; // canonical public alias
  market_cap?: number;
  volume_24h?: number;

  // Signals
  confidence_score: number;
  regime: Regime;

  // Links
  binance_url: string;
  affiliate_url?: string;
};

export type ScanResult = {
  ok: boolean;
  ts: string;
  source: "coingecko" | "fallback";
  market: Market;
  quote: Quote;
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
  quote?: Quote;
  market?: Market;
};

type CGItem = {
  id?: string;
  symbol?: string;
  name?: string;
  current_price?: number | null;
  price_change_percentage_24h?: number | null;
  market_cap?: number | null;
  total_volume?: number | null;
};

const DEFAULT_LIMIT = 250;
const MAX_LIMIT = 250;
const MIN_FETCH_SIZE = 80;

const DEFAULT_SORT: SortMode = "score_desc";
const DEFAULT_QUOTE: Quote = "usdt";
const DEFAULT_MARKET: Market = "crypto";

const COINGECKO_URL = "https://api.coingecko.com/api/v3/coins/markets";
const REQUEST_TIMEOUT_MS = 8_500;

const FALLBACK_ASSETS: Array<{
  id: string;
  symbol: string;
  name: string;
  price: number;
  chg24Pct: number;
  marketCap: number;
  volume24h: number;
}> = [
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    price: 95_000,
    chg24Pct: 0.2,
    marketCap: 1_800_000_000_000,
    volume24h: 30_000_000_000,
  },
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    price: 3_400,
    chg24Pct: 0.4,
    marketCap: 400_000_000_000,
    volume24h: 15_000_000_000,
  },
  {
    id: "tether",
    symbol: "USDT",
    name: "Tether",
    price: 1,
    chg24Pct: 0.01,
    marketCap: 110_000_000_000,
    volume24h: 60_000_000_000,
  },
  {
    id: "binancecoin",
    symbol: "BNB",
    name: "BNB",
    price: 620,
    chg24Pct: 1.2,
    marketCap: 90_000_000_000,
    volume24h: 2_000_000_000,
  },
  {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    price: 180,
    chg24Pct: 2.1,
    marketCap: 80_000_000_000,
    volume24h: 4_000_000_000,
  },
  {
    id: "ripple",
    symbol: "XRP",
    name: "XRP",
    price: 0.62,
    chg24Pct: 1.4,
    marketCap: 35_000_000_000,
    volume24h: 1_500_000_000,
  },
];

/* -------------------------------------------------------------------------- */
/*                                    Utils                                   */
/* -------------------------------------------------------------------------- */

function nowIso(): string {
  return new Date().toISOString();
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function safeNum(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clampInt(v: unknown, min: number, max: number, fallback = min): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function normalizeMarket(v: unknown): Market {
  const s = safeStr(v).toLowerCase();
  return s === "crypto" ? "crypto" : DEFAULT_MARKET;
}

function normalizeQuote(v: unknown): Quote {
  const s = safeStr(v).toLowerCase();
  if (s === "eur" || s === "usdt" || s === "usd") return s;
  return "usd";
}

function normalizeSortMode(v: unknown): SortMode {
  const s = safeStr(v).toLowerCase();
  if (
    s === "score_desc" ||
    s === "score_asc" ||
    s === "price_desc" ||
    s === "price_asc"
  ) {
    return s;
  }
  return DEFAULT_SORT;
}

function normalizeSymbol(v: unknown): string {
  const s = safeStr(v);
  return s ? s.toUpperCase() : "";
}

function titleizeId(id: string): string {
  return id
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeName(name: unknown, id: unknown, symbol: unknown): string {
  const n = safeStr(name);
  if (n) return n;

  const i = safeStr(id);
  if (i) return titleizeId(i);

  const s = normalizeSymbol(symbol);
  return s || "Unknown";
}

function normalizeRegime(chg24Pct: number): Regime {
  const abs = Math.abs(chg24Pct);

  if (abs <= 3) return "STABLE";
  if (abs <= 8) return "TRANSITION";
  return "VOLATILE";
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Score simple, stable et explicable.
 * Il ne promet pas d'alpha.
 * Il sert à hiérarchiser proprement un univers d'actifs.
 */
function computeScore(input: {
  chg24Pct: number;
  marketCap?: number;
  volume24h?: number;
  regime: Regime;
}): number {
  const { chg24Pct, marketCap, volume24h, regime } = input;

  const volatilityFactor = 1 - Math.min(1, Math.abs(chg24Pct) / 10);

  const mc = marketCap && marketCap > 0 ? Math.log10(marketCap) : 10;
  const marketCapFactor = Math.min(1, Math.max(0, (mc - 8) / 4)); // 8..12

  const vol = volume24h && volume24h > 0 ? Math.log10(volume24h) : 9;
  const volumeFactor = Math.min(1, Math.max(0, (vol - 7) / 4)); // 7..11

  const regimeModifier =
    regime === "STABLE" ? 1 :
    regime === "TRANSITION" ? 0.85 :
    0.65;

  const raw =
    100 *
    (0.60 * volatilityFactor +
      0.25 * marketCapFactor +
      0.15 * volumeFactor) *
    regimeModifier;

  return clampScore(raw);
}

function buildBinanceUrl(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  if (!s) return "https://www.binance.com/en/markets";
  return `https://www.binance.com/en/trade/${encodeURIComponent(s)}USDT?_from=markets`;
}

function buildAffiliateUrl(binanceUrl: string): string | undefined {
  const ref =
    safeStr(process.env.BINANCE_AFFILIATE_REF) ||
    safeStr(process.env.BINANCE_REF);

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

function dedupeAssets(list: ScanAsset[]): ScanAsset[] {
  const out: ScanAsset[] = [];
  const seen = new Set<string>();

  for (const asset of list) {
    const key = `${asset.id}::${asset.symbol}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(asset);
  }

  return out;
}

function compareAssets(a: ScanAsset, b: ScanAsset, sort: SortMode): number {
  const scoreA = safeNum(a.confidence_score, -1);
  const scoreB = safeNum(b.confidence_score, -1);
  const priceA = safeNum(a.price, -1);
  const priceB = safeNum(b.price, -1);

  switch (sort) {
    case "score_asc":
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.symbol.localeCompare(b.symbol);

    case "score_desc":
      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.symbol.localeCompare(b.symbol);

    case "price_asc":
      if (priceA !== priceB) return priceA - priceB;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.symbol.localeCompare(b.symbol);

    case "price_desc":
      if (priceA !== priceB) return priceB - priceA;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.symbol.localeCompare(b.symbol);

    default:
      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.symbol.localeCompare(b.symbol);
  }
}

function sortAssets(list: ScanAsset[], sort: SortMode): ScanAsset[] {
  return [...list].sort((a, b) => compareAssets(a, b, sort));
}

function toScanAsset(x: CGItem): ScanAsset | null {
  const id = safeStr(x.id);
  const symbol = normalizeSymbol(x.symbol);

  if (!id || !symbol) return null;

  const name = normalizeName(x.name, x.id, x.symbol);
  const price = safeNum(x.current_price, 0);
  const chg24Pct = safeNum(x.price_change_percentage_24h, 0);

  const marketCap =
    x.market_cap != null ? safeNum(x.market_cap, 0) : undefined;

  const volume24h =
    x.total_volume != null ? safeNum(x.total_volume, 0) : undefined;

  const regime = normalizeRegime(chg24Pct);
  const confidence_score = computeScore({
    chg24Pct,
    marketCap,
    volume24h,
    regime,
  });

  const binance_url = buildBinanceUrl(symbol);
  const affiliate_url = buildAffiliateUrl(binance_url);

  return {
    id,
    symbol,
    name,

    price,
    h24: chg24Pct,
    chg_24h_pct: chg24Pct,
    market_cap: marketCap,
    volume_24h: volume24h,

    confidence_score,
    regime,

    binance_url,
    affiliate_url,
  };
}

function buildFallbackAsset(input: {
  id: string;
  symbol: string;
  name: string;
  price: number;
  chg24Pct: number;
  marketCap: number;
  volume24h: number;
}): ScanAsset {
  const regime = normalizeRegime(input.chg24Pct);
  const confidence_score = computeScore({
    chg24Pct: input.chg24Pct,
    marketCap: input.marketCap,
    volume24h: input.volume24h,
    regime,
  });

  const binance_url = buildBinanceUrl(input.symbol);
  const affiliate_url = buildAffiliateUrl(binance_url);

  return {
    id: input.id,
    symbol: input.symbol,
    name: input.name,

    price: input.price,
    h24: input.chg24Pct,
    chg_24h_pct: input.chg24Pct,
    market_cap: input.marketCap,
    volume_24h: input.volume24h,

    confidence_score,
    regime,

    binance_url,
    affiliate_url,
  };
}

/* -------------------------------------------------------------------------- */
/*                                Data source                                 */
/* -------------------------------------------------------------------------- */

async function fetchCoinGecko(quote: Quote, perPage: number): Promise<CGItem[]> {
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
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`CoinGecko HTTP ${res.status}`);
    }

    const json = (await res.json()) as unknown;

    if (!Array.isArray(json)) {
      throw new Error("CoinGecko response not array");
    }

    return json as CGItem[];
  } finally {
    clearTimeout(timeout);
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Fallback                                  */
/* -------------------------------------------------------------------------- */

function fallbackUniverse(): ScanAsset[] {
  return FALLBACK_ASSETS.map(buildFallbackAsset);
}

/* -------------------------------------------------------------------------- */
/*                                  Public API                                */
/* -------------------------------------------------------------------------- */

export async function getXyvalaScan(params: ScanParams = {}): Promise<ScanResult> {
  const ts = nowIso();
  const warnings: string[] = [];

  const market = normalizeMarket(params.market ?? DEFAULT_MARKET);
  const quote = normalizeQuote(params.quote ?? DEFAULT_QUOTE);
  const sort = normalizeSortMode(params.sort ?? DEFAULT_SORT);
  const limit = clampInt(params.limit ?? DEFAULT_LIMIT, 1, MAX_LIMIT, DEFAULT_LIMIT);

  // On fetch un univers un peu plus large que le rendu final
  // pour garder un tri cohérent même sur petites limites.
  const fetchSize = Math.max(MIN_FETCH_SIZE, Math.min(MAX_LIMIT, limit));

  if (quote === "usdt") {
    warnings.push("quote_usdt_mapped_to_usd_for_coingecko");
  }

  try {
    const raw = await fetchCoinGecko(quote, fetchSize);

    const normalized = dedupeAssets(
      raw
        .map(toScanAsset)
        .filter((asset): asset is ScanAsset => Boolean(asset))
    );

    if (!normalized.length) {
      warnings.push("empty_normalized_universe_from_coingecko");

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
        warnings: warnings.length ? warnings : undefined,
      },
    };
  } catch (e: unknown) {
    const message =
      e instanceof Error && e.message ? e.message : "unknown_error";

    warnings.push(`coingecko_down:${message}`);

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
