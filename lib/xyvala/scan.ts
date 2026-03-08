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
  price: number;              // quote currency
  h24: number;                // legacy internal alias
  chg_24h_pct: number;        // canonical public/UI alias
  market_cap?: number;
  volume_24h?: number;

  // Signals
  confidence_score: number;   // 0..100
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
const DEFAULT_SORT: SortMode = "score_desc";
const DEFAULT_QUOTE: Quote = "usdt";
const DEFAULT_MARKET: Market = "crypto";

const COINGECKO_URL = "https://api.coingecko.com/api/v3/coins/markets";
const REQUEST_TIMEOUT_MS = 8_500;

/* --------------------------------- Utils --------------------------------- */

function nowIso(): string {
  return new Date().toISOString();
}

function clampInt(n: unknown, min: number, max: number): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.trunc(v)));
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function safeNum(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeQuote(v: unknown): Quote {
  const s = safeStr(v).toLowerCase();
  if (s === "eur" || s === "usdt") return s;
  return "usd";
}

function normalizeSymbol(v: unknown): string {
  const s = safeStr(v);
  return s ? s.toUpperCase() : "";
}

function titleizeId(id: string): string {
  return id
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
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
 * Il ne promet pas d'alpha : il structure un univers d'actifs.
 *
 * Pondération :
 * - volatilité 24h
 * - market cap
 * - volume 24h
 * - modulateur de régime
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

  const regimeMod =
    regime === "STABLE" ? 1.0 :
    regime === "TRANSITION" ? 0.85 :
    0.65;

  const raw =
    100 *
    (0.60 * volatilityFactor + 0.25 * marketCapFactor + 0.15 * volumeFactor) *
    regimeMod;

  return clampScore(raw);
}

function buildBinanceUrl(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  if (!s) return "https://www.binance.com/en/markets";
  return `https://www.binance.com/en/trade/${encodeURIComponent(s)}USDT?_from=markets`;
}

function buildAffiliateUrl(binanceUrl: string): string | undefined {
  const ref = safeStr(process.env.BINANCE_AFFILIATE_REF);
  if (!ref) return undefined;

  try {
    const u = new URL(binanceUrl);
    if (!u.searchParams.get("ref")) {
      u.searchParams.set("ref", ref);
    }
    return u.toString();
  } catch {
    return undefined;
  }
}

function sortAssets(list: ScanAsset[], sort: SortMode): ScanAsset[] {
  const arr = [...list];

  arr.sort((a, b) => {
    const as = safeNum(a.confidence_score, -1);
    const bs = safeNum(b.confidence_score, -1);
    const ap = safeNum(a.price, -1);
    const bp = safeNum(b.price, -1);

    switch (sort) {
      case "score_asc":
        if (as !== bs) return as - bs;
        return a.symbol.localeCompare(b.symbol);

      case "score_desc":
        if (as !== bs) return bs - as;
        return a.symbol.localeCompare(b.symbol);

      case "price_asc":
        if (ap !== bp) return ap - bp;
        return b.confidence_score - a.confidence_score;

      case "price_desc":
        if (ap !== bp) return bp - ap;
        return b.confidence_score - a.confidence_score;

      default:
        if (as !== bs) return bs - as;
        return a.symbol.localeCompare(b.symbol);
    }
  });

  return arr;
}

function dedupeAssets(list: ScanAsset[]): ScanAsset[] {
  const seen = new Set<string>();
  const out: ScanAsset[] = [];

  for (const asset of list) {
    const key = `${asset.id}::${asset.symbol}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(asset);
  }

  return out;
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

/* ------------------------------- Data source ------------------------------ */

async function fetchCoinGecko(quote: Quote, perPage: number): Promise<CGItem[]> {
  // CoinGecko ne gère pas usdt ici ; on map sur usd.
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

/* -------------------------------- Fallback -------------------------------- */

function fallbackUniverse(): ScanAsset[] {
  const base = [
    { id: "bitcoin", symbol: "BTC", name: "Bitcoin", price: 95_000, chg24Pct: 0.2, marketCap: 1_800_000_000_000, volume24h: 30_000_000_000 },
    { id: "ethereum", symbol: "ETH", name: "Ethereum", price: 3_400, chg24Pct: 0.4, marketCap: 400_000_000_000, volume24h: 15_000_000_000 },
    { id: "tether", symbol: "USDT", name: "Tether", price: 1, chg24Pct: 0.01, marketCap: 110_000_000_000, volume24h: 60_000_000_000 },
    { id: "binancecoin", symbol: "BNB", name: "BNB", price: 620, chg24Pct: 1.2, marketCap: 90_000_000_000, volume24h: 2_000_000_000 },
    { id: "solana", symbol: "SOL", name: "Solana", price: 180, chg24Pct: 2.1, marketCap: 80_000_000_000, volume24h: 4_000_000_000 },
    { id: "ripple", symbol: "XRP", name: "XRP", price: 0.62, chg24Pct: 1.4, marketCap: 35_000_000_000, volume24h: 1_500_000_000 },
  ];

  return base.map((x) => {
    const regime = normalizeRegime(x.chg24Pct);
    const confidence_score = computeScore({
      chg24Pct: x.chg24Pct,
      marketCap: x.marketCap,
      volume24h: x.volume24h,
      regime,
    });

    const binance_url = buildBinanceUrl(x.symbol);
    const affiliate_url = buildAffiliateUrl(binance_url);

    return {
      id: x.id,
      symbol: x.symbol,
      name: x.name,
      price: x.price,
      h24: x.chg24Pct,
      chg_24h_pct: x.chg24Pct,
      market_cap: x.marketCap,
      volume_24h: x.volume24h,
      confidence_score,
      regime,
      binance_url,
      affiliate_url,
    };
  });
}

/* --------------------------------- Public API ----------------------------- */

export async function getXyvalaScan(params: ScanParams = {}): Promise<ScanResult> {
  const ts = nowIso();
  const warnings: string[] = [];

  const market: Market = DEFAULT_MARKET;
  const quote = normalizeQuote(params.quote ?? DEFAULT_QUOTE);
  const sort = (params.sort ?? DEFAULT_SORT) as SortMode;
  const limit = clampInt(params.limit ?? DEFAULT_LIMIT, 1, MAX_LIMIT);

  // On fetch plus large que le rendu final pour garder un tri utile.
  const fetchSize = Math.max(80, Math.min(250, limit));

  if (quote === "usdt") {
    warnings.push("quote_usdt_mapped_to_usd_for_coingecko");
  }

  try {
    const raw = await fetchCoinGecko(quote, fetchSize);

    const normalized = dedupeAssets(
      raw
        .map(toScanAsset)
        .filter((x): x is ScanAsset => Boolean(x))
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
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    };
  } catch (e: any) {
    warnings.push(`coingecko_down:${e?.message ? String(e.message) : "unknown_error"}`);

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
      error: e?.message ? String(e.message) : undefined,
    };
  }
}
