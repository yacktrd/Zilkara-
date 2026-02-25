// app/api/scan/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * =========================
 * TYPES / CONTRAT
 * =========================
 */

type Regime = "STABLE" | "TRANSITION" | "VOLATILE";
type SortMode = "score_desc" | "score_asc" | "price_desc" | "price_asc";

type ScoreTrend = "up" | "down" | "flat";

export type ScanAsset = {
  id: string;
  symbol: string;
  name: string;

  price: number;
  chg_24h_pct: number;

  timeframe: "H24";

  confidence_score: number; // 0..100
  score_delta: number; // delta vs snapshot précédent (même cacheKey)
  score_trend: ScoreTrend; // up/down/flat (pour tes flèches)

  regime: Regime;

  // liens fournis par l’API (ne jamais reconstruire côté UI)
  binance_url: string;
  affiliate_url?: string;
};

export type ApiResponse = {
  ok: boolean;
  ts: string;
  source: "coingecko" | "fallback" | "cache";
  market: "crypto";
  quote: string;
  count: number;
  data: ScanAsset[];
  meta: {
    sorted_by: SortMode;
    limit: number;
    cache: "hit" | "miss" | "no-store";
  };
  error?: string;
};

/**
 * =========================
 * QUERY PARAMS
 * =========================
 */

const DEFAULT_LIMIT = 250;
const MAX_LIMIT = 250;
const DEFAULT_SORT: SortMode = "score_desc";

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function safeString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s.length ? s : undefined;
}

function toNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function parseSort(v: string | null): SortMode {
  const s = (v || "").trim();
  const allowed: SortMode[] = ["score_desc", "score_asc", "price_desc", "price_asc"];
  return allowed.includes(s as SortMode) ? (s as SortMode) : DEFAULT_SORT;
}

/**
 * =========================
 * COINGECKO FETCH
 * =========================
 */

type CGMarketItem = {
  id?: string;
  symbol?: string;
  name?: string;
  current_price?: number;
  price_change_percentage_24h?: number | null;
  market_cap?: number | null;
  total_volume?: number | null;
};

const COINGECKO_URL = "https://api.coingecko.com/api/v3/coins/markets";

async function fetchCoinGeckoMarkets(opts: {
  quote: string;
  limit: number;
}): Promise<CGMarketItem[]> {
  const params = new URLSearchParams({
    vs_currency: opts.quote,
    order: "market_cap_desc",
    per_page: String(opts.limit),
    page: "1",
    sparkline: "false",
    price_change_percentage: "24h",
  });

  const url = `${COINGECKO_URL}?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8500);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    const json = (await res.json()) as unknown;
    if (!Array.isArray(json)) throw new Error("CoinGecko response not array");
    return json as CGMarketItem[];
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackMarkets(): CGMarketItem[] {
  return [
    {
      id: "bitcoin",
      symbol: "btc",
      name: "Bitcoin",
      current_price: 0,
      price_change_percentage_24h: 0,
      market_cap: 0,
      total_volume: 0,
    },
    {
      id: "ethereum",
      symbol: "eth",
      name: "Ethereum",
      current_price: 0,
      price_change_percentage_24h: 0,
      market_cap: 0,
      total_volume: 0,
    },
  ];
}

/**
 * =========================
 * NORMALIZATION
 * =========================
 */

function normalizeSymbol(v: unknown): string | undefined {
  const s = safeString(v);
  if (!s) return undefined;
  return s.toUpperCase();
}

function normalizeName(opts: { name?: unknown; id?: unknown; symbol?: unknown }): string {
  const n = safeString(opts.name);
  if (n) return n;

  const id = safeString(opts.id);
  if (id) {
    return id
      .split(/[-_ ]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  return normalizeSymbol(opts.symbol) || "Unknown";
}

/**
 * =========================
 * BINANCE LINKS (FIABLES)
 * =========================
 *
 * Format recommandé (fonctionne mieux) :
 * https://www.binance.com/en/trade/BTC_USDT?type=spot
 */
function buildBinanceUrl(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  if (!s) return "https://www.binance.com/en/markets";
  return `https://www.binance.com/en/trade/${encodeURIComponent(s)}_USDT?type=spot`;
}

function buildAffiliateUrl(binanceUrl: string): string | undefined {
  const ref = process.env.BINANCE_AFFILIATE_REF;
  if (!ref) return undefined;

  try {
    const u = new URL(binanceUrl);
    // ne remplace pas si déjà présent
    if (!u.searchParams.get("ref")) u.searchParams.set("ref", ref);
    return u.toString();
  } catch {
    return undefined;
  }
}

/**
 * =========================
 * REGIME (lisible, testable)
 * =========================
 */

const REGIME_THRESHOLDS = {
  stable_abs_pct: 3,
  transition_abs_pct: 8,
};

function normalizeRegime(chg24Pct: number): Regime {
  const a = Math.abs(chg24Pct);
  if (a <= REGIME_THRESHOLDS.stable_abs_pct) return "STABLE";
  if (a <= REGIME_THRESHOLDS.transition_abs_pct) return "TRANSITION";
  return "VOLATILE";
}

/**
 * =========================
 * CONFIDENCE SCORE (0..100)
 * =========================
 * Simple, stable, explicable.
 * (CoinGecko ne fournit pas ce score → on le calcule)
 */

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
function clampScore(v: number) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function computeConfidenceScore(input: {
  chg24: number;
  volume24h?: number;
  marketCap?: number;
  regime: Regime;
}): number {
  const { chg24, volume24h, marketCap, regime } = input;

  // 1) Volatility factor (0..1) : 0% -> 1.0 / 10%+ -> 0.0
  const volFactor = 1 - clamp01(Math.abs(chg24) / 10);

  // 2) Liquidity factors (log scale), neutral if missing
  const mc = typeof marketCap === "number" && marketCap > 0 ? marketCap : undefined;
  const vol = typeof volume24h === "number" && volume24h > 0 ? volume24h : undefined;

  const mcLog = mc ? Math.log10(mc) : 10; // ~neutral
  const volLog = vol ? Math.log10(vol) : 9; // ~neutral

  const liqFactor = clamp01((mcLog - 8) / 4); // 1e8..1e12
  const volFactor2 = clamp01((volLog - 7) / 4); // 1e7..1e11

  // 3) Regime modifier
  const regimeMod = regime === "STABLE" ? 1.0 : regime === "TRANSITION" ? 0.85 : 0.65;

  const raw = 100 * (0.55 * volFactor + 0.25 * liqFactor + 0.20 * volFactor2) * regimeMod;
  return clampScore(raw);
}

/**
 * =========================
 * SORTING
 * =========================
 */

function sortAssets(list: ScanAsset[], sort: SortMode): ScanAsset[] {
  const arr = [...list];

  // tie-breakers stables
  const tieBreak = (a: ScanAsset, b: ScanAsset) => a.symbol.localeCompare(b.symbol);

  arr.sort((a, b) => {
    switch (sort) {
      case "score_desc": {
        const d = b.confidence_score - a.confidence_score;
        return d !== 0 ? d : tieBreak(a, b);
      }
      case "score_asc": {
        const d = a.confidence_score - b.confidence_score;
        return d !== 0 ? d : tieBreak(a, b);
      }
      case "price_desc": {
        const d = b.price - a.price;
        return d !== 0 ? d : tieBreak(a, b);
      }
      case "price_asc": {
        const d = a.price - b.price;
        return d !== 0 ? d : tieBreak(a, b);
      }
      default:
        return tieBreak(a, b);
    }
  });

  return arr;
}

/**
 * =========================
 * CACHE (in-memory) + SCORE DELTA SNAPSHOT
 * =========================
 *
 * - TTL = 75s (performance stable)
 * - Le delta de score est calculé vs dernier snapshot pour le même cacheKey
 */

type CacheEntry = {
  ts: number;
  data: ScanAsset[];
  source: "cache" | "coingecko" | "fallback";
};

const memCache = new Map<string, CacheEntry>();

const TTL_MS = 75 * 1000;

function cacheKey(opts: { quote: string; limit: number; sort: SortMode }) {
  return `scan:v2:${opts.quote}:${opts.limit}:${opts.sort}`;
}

function getCache(key: string): CacheEntry | undefined {
  const e = memCache.get(key);
  if (!e) return undefined;
  if (Date.now() - e.ts > TTL_MS) {
    memCache.delete(key);
    return undefined;
  }
  return e;
}

function setCache(key: string, entry: CacheEntry) {
  memCache.set(key, entry);
}

  if (prev) {
    prev.forEach((a) => {
      if (typeof a.confidence_score === "number") {
        prevMap.set(a.id, a.confidence_score);
      }
    });
  }

  return curr.map((a) => {
    const previousScore = prevMap.get(a.id);

    // Si pas d'historique → delta = 0 (jamais null)
    const delta =
      typeof previousScore === "number"
        ? a.confidence_score - previousScore
        : 0;

    let trend: "up" | "down" | "flat" = "flat";

    if (delta > 0) trend = "up";
    else if (delta < 0) trend = "down";

    return {
      ...a,
      score_delta: delta,
      score_trend: trend,
    };
  });
}
/**
 * =========================
 * MAIN
 * =========================
 */

export async function GET(req: Request) {
  const ts = new Date().toISOString();
  const { searchParams } = new URL(req.url);

  const quote = (safeString(searchParams.get("quote")) || "usd").toLowerCase();
  const sort = parseSort(searchParams.get("sort"));
  const limitRaw = toNum(searchParams.get("limit")) ?? DEFAULT_LIMIT;
  const limit = clampInt(Math.floor(limitRaw), 1, MAX_LIMIT);

  const noStore = (safeString(searchParams.get("noStore")) || "") === "1";

  const key = cacheKey({ quote, limit, sort });

  // CACHE HIT
  if (!noStore) {
    const hit = getCache(key);
    if (hit) {
      const response: ApiResponse = {
        ok: true,
        ts,
        source: "cache",
        market: "crypto",
        quote,
        count: hit.data.length,
        data: hit.data,
        meta: { sorted_by: sort, limit, cache: "hit" },
      };
      return NextResponse.json(response, { status: 200, headers: { "cache-control": "no-store" } });
    }
  }

  // FETCH RAW
  let raw: CGMarketItem[] = [];
  let source: ApiResponse["source"] = "coingecko";

  try {
    // fetch bigger for better sorting stability
    const fetchSize = clampInt(Math.max(limit * 2, 80), 50, 250);
    raw = await fetchCoinGeckoMarkets({ quote, limit: fetchSize });
    if (!raw.length) throw new Error("CoinGecko empty list");
  } catch {
    source = "fallback";
    raw = fallbackMarkets();
  }

  // PREVIOUS snapshot for score delta
  const prev = !noStore ? memCache.get(key)?.data : undefined;

  // NORMALIZE -> compute
  const computedBase: Omit<ScanAsset, "score_delta" | "score_trend">[] = raw
    .map((x) => {
      const id = safeString(x?.id) || "";
      const symbol = normalizeSymbol(x?.symbol) || "";
      if (!id || !symbol) return null;

      const name = normalizeName({ name: x?.name, id: x?.id, symbol: x?.symbol });

      const price = toNum(x?.current_price) ?? 0;
      const chg24 = toNum(x?.price_change_percentage_24h) ?? 0;

      const marketCap = toNum(x?.market_cap ?? undefined);
      const volume24 = toNum(x?.total_volume ?? undefined);

      const regime = normalizeRegime(chg24);
      const confidence_score = computeConfidenceScore({ chg24, volume24h: volume24, marketCap, regime });

      const binance_url = buildBinanceUrl(symbol);
      const affiliate_url = buildAffiliateUrl(binance_url);

      return {
        id,
        symbol,
        name,
        price,
        chg_24h_pct: chg24,
        timeframe: "H24" as const,
        confidence_score,
        regime,
        binance_url,
        affiliate_url,
      };
    })
    .filter((x): x is Omit<ScanAsset, "score_delta" | "score_trend"> => Boolean(x));

  // APPLY sort + limit
  // First add delta/trend based on previous snapshot (same key)
  const withDelta = makeDelta(prev, computedBase);
  const sorted = sortAssets(withDelta, sort);
  const paged = sorted.slice(0, limit);

  // SAVE cache
  if (!noStore) {
    setCache(key, { ts: Date.now(), data: paged, source });
  }

  const response: ApiResponse = {
    ok: true,
    ts,
    source: noStore ? source : source,
    market: "crypto",
    quote,
    count: paged.length,
    data: paged,
    meta: { sorted_by: sort, limit, cache: noStore ? "no-store" : "miss" },
  };

  return NextResponse.json(response, { status: 200, headers: { "cache-control": "no-store" } });
}
