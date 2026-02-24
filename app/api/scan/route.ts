// app/api/scan/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * =========================
 * 1) Contrat de sortie clair
 * =========================
 */

type Regime = "STABLE" | "TRANSITION" | "VOLATILE";
type SortMode =
  | "confidence_score_desc"
  | "confidence_score_asc"
  | "market_cap_desc"
  | "volume_desc"
  | "chg_24h_abs_asc"
  | "chg_24h_abs_desc";

type ConfidenceLabel = "GOOD" | "OK" | "RISK";

export type ScanAsset = {
  id: string; // coingecko id (stable)
  symbol: string; // ex: BTC
  name: string; // ex: Bitcoin (full name)
  price: number; // last price
  chg_24h_pct: number; // % change 24h
  market_cap?: number;
  volume_24h?: number;

  regime: Regime;

  confidence_score: number; // 0..100
  confidence_label?: ConfidenceLabel;
  confidence_reason?: string;

  binance_url: string; // never broken (fallback to markets page)
  affiliate_url?: string; // clean undefined if not configured
};

export type ApiResponse = {
  ok: boolean;
  ts: string; // ISO timestamp
  source: "coingecko" | "fallback" | "cache";
  market: string; // ex: "crypto"
  quote: string; // ex: "usd"
  count: number;
  data: ScanAsset[];
  meta: {
    sorted_by: SortMode;
    limit: number;
    discipline: boolean;
    cache: "hit" | "miss" | "no-store";
    generated_at: string;
    warnings?: string[];
  };
};

/**
 * ==================================
 * 2) Paramètres d’entrée (query)
 * ==================================
 */

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 250;
const DEFAULT_SORT: SortMode = "confidence_score_desc";

function clampInt(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function parseBool(v: string | null): boolean {
  if (!v) return false;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

function parseSort(v: string | null): SortMode {
  const s = (v || "").trim();
  const allowed: SortMode[] = [
    "confidence_score_desc",
    "confidence_score_asc",
    "market_cap_desc",
    "volume_desc",
    "chg_24h_abs_asc",
    "chg_24h_abs_desc",
  ];
  return (allowed.includes(s as SortMode) ? (s as SortMode) : DEFAULT_SORT);
}

/**
 * ==================================
 * 3) Récupération des données “brutes”
 * ==================================
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

function withTimeout<T>(ms: number, promise: Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  // We cannot inject the signal into an already-created promise.
  // So we provide a wrapper for fetch below that uses AbortController.
  // This helper is kept for non-fetch promises if needed.
  return promise.finally(() => clearTimeout(timeout));
}

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
      // Next.js runtime dynamic, but still ok:
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`CoinGecko error: HTTP ${res.status}`);
    }

    const json = (await res.json()) as unknown;
    if (!Array.isArray(json)) {
      throw new Error("CoinGecko error: response is not an array");
    }
    return json as CGMarketItem[];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fallback minimal (si API down)
 * => garantit une réponse stable sans casser l’UI
 */
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
 * ==================================
 * 4) Normalisation / sanitation
 * ==================================
 */

function safeString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s.length ? s : undefined;
}

function cleanStr(v: unknown): string | undefined {
  // alias explicite (lecture plus claire)
  return safeString(v);
}

function toNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function normalizeSymbol(v: unknown): string | undefined {
  const s = safeString(v);
  if (!s) return undefined;
  return s.toUpperCase();
}

function normalizeName(opts: { name?: unknown; id?: unknown; symbol?: unknown }): string {
  const name = safeString(opts.name);
  if (name) return name;

  // fallback intelligent: id -> Title Case, sinon symbol
  const id = safeString(opts.id);
  if (id) {
    // "render-token" -> "Render Token"
    return id
      .split(/[-_ ]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  const sym = normalizeSymbol(opts.symbol);
  return sym || "Unknown";
}

/**
 * ==================================
 * 5) Construction des liens
 * ==================================
 */

function buildBinanceUrl(symbol: string): string {
  // Binance spot pairs are usually SYMBOLUSDT. If it’s not listed, this may 404.
  // We still guarantee a non-empty URL (never broken/empty).
  const s = symbol.toUpperCase().trim();
  if (!s) return "https://www.binance.com/en/markets";
  return `https://www.binance.com/en/trade/${encodeURIComponent(s)}USDT?_from=markets`;
}

function buildAffiliateUrl(binanceUrl: string): string | undefined {
  // If you have an affiliate format, plug it here.
  // Example: append ?ref=XXXX or use env.
  const ref = process.env.BINANCE_AFFILIATE_REF; // optional env
  if (!ref) return undefined;

  try {
    const u = new URL(binanceUrl);
    // do not overwrite existing params, just add ref
    if (!u.searchParams.get("ref")) u.searchParams.set("ref", ref);
    return u.toString();
  } catch {
    return undefined;
  }
}

/**
 * ==================================
 * 6) Calcul du régime
 * ==================================
 */

const REGIME_THRESHOLDS = {
  stable_abs_pct: 3, // <= 3% => STABLE
  transition_abs_pct: 8, // <= 8% => TRANSITION, > 8% => VOLATILE
};

function normalizeRegime(chg24Pct: number): Regime {
  const a = Math.abs(chg24Pct);
  if (a <= REGIME_THRESHOLDS.stable_abs_pct) return "STABLE";
  if (a <= REGIME_THRESHOLDS.transition_abs_pct) return "TRANSITION";
  return "VOLATILE";
}

/**
 * ==================================
 * 7) Calcul du score de confiance
 * ==================================
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
  discipline: boolean;
}): {
  score: number;
  label: ConfidenceLabel;
  reason: string;
} {
  const { chg24, volume24h, marketCap, regime, discipline } = input;

  // Volatility penalty: lower abs change => better
  // 0% => 1.0, 10% => 0.0 (cap)
  const volFactor = 1 - clamp01(Math.abs(chg24) / 10);

  // Liquidity bonus based on market cap (log scale)
  // If missing, neutral factor
  const mc = typeof marketCap === "number" && marketCap > 0 ? marketCap : undefined;
  const liqBase = mc ? Math.log10(mc) : 10; // ~10 as neutral-ish (1e10)
  // Normalize: 8 -> low, 12 -> high
  const liqFactor = clamp01((liqBase - 8) / 4);

  // Volume confirmation (optional)
  const vol = typeof volume24h === "number" && volume24h > 0 ? volume24h : undefined;
  const volLog = vol ? Math.log10(vol) : 9; // neutral-ish (1e9)
  // Normalize: 7 -> low, 11 -> high
  const volFactor2 = clamp01((volLog - 7) / 4);

  // Regime modifier
  const regimeMod =
    regime === "STABLE" ? 1.0 : regime === "TRANSITION" ? 0.85 : 0.65;

  // Discipline mode: stricter penalty on volatility & volatile regime
  const disciplinePenalty = discipline
    ? regime === "VOLATILE"
      ? 0.75
      : 0.9
    : 1.0;

  // Weighted score
  const raw =
    100 *
    (0.55 * volFactor + 0.25 * liqFactor + 0.20 * volFactor2) *
    regimeMod *
    disciplinePenalty;

  const score = clampScore(raw);

  let label: ConfidenceLabel = "OK";
  if (score >= 75) label = "GOOD";
  else if (score < 50) label = "RISK";

  // Short reason (1 phrase)
  const reason =
    label === "GOOD"
      ? "Variation maîtrisée et liquidité solide."
      : label === "OK"
      ? "Contexte exploitable, mais stabilité moyenne."
      : "Risque élevé : volatilité ou liquidité défavorable.";

  return { score, label, reason };
}

/**
 * ==================================
 * 8) Tri + pagination logique
 * ==================================
 */

function abs(n: number) {
  return Math.abs(n);
}

function sortAssets(list: ScanAsset[], sort: SortMode): ScanAsset[] {
  const arr = [...list];

  const tieBreak = (a: ScanAsset, b: ScanAsset) => {
    const amc = a.market_cap ?? -1;
    const bmc = b.market_cap ?? -1;
    if (bmc !== amc) return bmc - amc;

    const av = a.volume_24h ?? -1;
    const bv = b.volume_24h ?? -1;
    if (bv !== av) return bv - av;

    return a.symbol.localeCompare(b.symbol);
  };

  arr.sort((a, b) => {
    switch (sort) {
      case "confidence_score_desc": {
        const d = b.confidence_score - a.confidence_score;
        return d !== 0 ? d : tieBreak(a, b);
      }
      case "confidence_score_asc": {
        const d = a.confidence_score - b.confidence_score;
        return d !== 0 ? d : tieBreak(a, b);
      }
      case "market_cap_desc": {
        const d = (b.market_cap ?? -1) - (a.market_cap ?? -1);
        return d !== 0 ? d : tieBreak(a, b);
      }
      case "volume_desc": {
        const d = (b.volume_24h ?? -1) - (a.volume_24h ?? -1);
        return d !== 0 ? d : tieBreak(a, b);
      }
      case "chg_24h_abs_asc": {
        const d = abs(a.chg_24h_pct) - abs(b.chg_24h_pct);
        return d !== 0 ? d : tieBreak(a, b);
      }
      case "chg_24h_abs_desc": {
        const d = abs(b.chg_24h_pct) - abs(a.chg_24h_pct);
        return d !== 0 ? d : tieBreak(a, b);
      }
      default:
        return tieBreak(a, b);
    }
  });

  return arr;
}

/**
 * ==================================
 * 9) Cache (optionnel)
 * ==================================
 *
 * Sans ajouter de dépendances, on fait un cache in-memory (best-effort).
 * Vercel serverless peut cold-start => cache non garanti, mais utile.
 */

type CacheEntry = { ts: number; data: ScanAsset[]; source: "cache" | "coingecko" | "fallback" };
const memCache = new Map<string, CacheEntry>();

function cacheKey(opts: { limit: number; sort: SortMode; discipline: boolean; quote: string }) {
  return `scan:v1:${opts.quote}:${opts.limit}:${opts.sort}:${opts.discipline ? "D1" : "D0"}`;
}

function getCache(key: string, ttlMs: number): CacheEntry | undefined {
  const e = memCache.get(key);
  if (!e) return undefined;
  if (Date.now() - e.ts > ttlMs) {
    memCache.delete(key);
    return undefined;
  }
  return e;
}

function setCache(key: string, entry: CacheEntry) {
  memCache.set(key, entry);
}

/**
 * =========================
 * MAIN /api/scan
 * =========================
 */

export async function GET(req: Request) {
  const ts = new Date().toISOString();
  const warnings: string[] = [];

  const { searchParams } = new URL(req.url);

  const quote = (safeString(searchParams.get("quote")) || "usd").toLowerCase();
  const market = (safeString(searchParams.get("market")) || "crypto").toLowerCase();

  const sort = parseSort(searchParams.get("sort"));
  const discipline = parseBool(searchParams.get("discipline"));

  const limitRaw = toNum(searchParams.get("limit")) ?? DEFAULT_LIMIT;
  const limit = clampInt(Math.floor(limitRaw), 1, MAX_LIMIT);

  // Cache controls: default on, but user can force no-store
  const noStore = parseBool(searchParams.get("noStore"));
  const ttlMs = 45 * 1000; // 45s TTL (safe for rate limit / UX)
  const key = cacheKey({ limit, sort, discipline, quote });

  if (!noStore) {
    const hit = getCache(key, ttlMs);
    if (hit) {
      const response: ApiResponse = {
        ok: true,
        ts,
        source: "cache",
        market,
        quote,
        count: hit.data.length,
        data: hit.data,
        meta: {
          sorted_by: sort,
          limit,
          discipline,
          cache: "hit",
          generated_at: ts,
          warnings: warnings.length ? warnings : undefined,
        },
      };
      return NextResponse.json(response, {
        status: 200,
        headers: { "cache-control": "no-store" },
      });
    }
  }

  let raw: CGMarketItem[] = [];
  let source: ApiResponse["source"] = "coingecko";

  try {
    // Fetch more than needed so the scoring + sorting is meaningful
    // (we apply limit after tri)
    const fetchSize = clampInt(Math.max(limit * 2, 80), 50, 250);
    raw = await fetchCoinGeckoMarkets({ quote, limit: fetchSize });
    if (!raw.length) {
      warnings.push("CoinGecko a renvoyé une liste vide.");
    }
  } catch (err: any) {
    source = "fallback";
    warnings.push(`Source principale indisponible: ${err?.message || "unknown"}`);
    raw = fallbackMarkets();
  }

  /**
   * V1 rule: never return holes (missing score/name/link)
   * => we filter only items that can be normalized to a stable contract
   */

  const normalized: ScanAsset[] = raw
    .map((x) => {
      const id = cleanStr(x?.id) || "";
      const symbol = normalizeSymbol(x?.symbol) || "";
      const name = normalizeName({ name: x?.name, id: x?.id, symbol: x?.symbol });

      const price = toNum(x?.current_price) ?? 0;
      const chg24 = toNum(x?.price_change_percentage_24h) ?? 0;

      const marketCap = toNum(x?.market_cap ?? undefined);
      const volume24 = toNum(x?.total_volume ?? undefined);

      if (!id || !symbol) return null; // cannot build stable links without symbol/id

      const regime = normalizeRegime(chg24);

      const { score, label, reason } = computeConfidenceScore({
        chg24,
        volume24h: volume24,
        marketCap,
        regime,
        discipline,
      });

      const binance_url = buildBinanceUrl(symbol);
      const affiliate_url = buildAffiliateUrl(binance_url) ?? undefined;

      const asset: ScanAsset = {
        id,
        symbol,
        name,
        price,
        chg_24h_pct: chg24,
        market_cap: marketCap,
        volume_24h: volume24,

        regime,

        confidence_score: score,
        confidence_label: label,
        confidence_reason: reason,

        binance_url,
        affiliate_url,
      };

      return asset;
    })
    .filter((x): x is ScanAsset => Boolean(x));

  if (!normalized.length) {
    // Hard failure: return proper error
    const response: ApiResponse = {
      ok: false,
      ts,
      source,
      market,
      quote,
      count: 0,
      data: [],
      meta: {
        sorted_by: sort,
        limit,
        discipline,
        cache: noStore ? "no-store" : "miss",
        generated_at: ts,
        warnings: ["Aucun actif n’a pu être normalisé. Vérifie la source et le mapping."],
      },
    };
    return NextResponse.json(response, {
      status: 200,
      headers: { "cache-control": "no-store" },
    });
  }

  const sorted = sortAssets(normalized, sort);
  const paged = sorted.slice(0, limit);

  if (!noStore) {
    setCache(key, { ts: Date.now(), data: paged, source });
  }

  const response: ApiResponse = {
    ok: true,
    ts,
    source: noStore ? source : source, // kept explicit
    market,
    quote,
    count: paged.length,
    data: paged,
    meta: {
      sorted_by: sort,
      limit,
      discipline,
      cache: noStore ? "no-store" : "miss",
      generated_at: ts,
      warnings: warnings.length ? warnings : undefined,
    },
  };

  return NextResponse.json(response, {
    status: 200,
    headers: { "cache-control": "no-store" },
  });
}
