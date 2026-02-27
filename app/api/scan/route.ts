// app/api/scan/route.ts
import { NextResponse } from "next/server";
import type { ScanAsset, ScanResponse, SortMode, Timeframe } from "@/lib/types";
import { isoNow, safeStr, toNum, clamp, titleFromId, upperSymbol } from "@/lib/utils";
import { buildAffiliateUrl, buildBinanceUrl } from "@/lib/binance";
import { computeRankScore, computeStabilityIndex, regimeFromChg24 } from "@/lib/stability";
import { sortAssets } from "@/lib/sort";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 250;
const DEFAULT_SORT: SortMode = "rank_desc";
const DEFAULT_TF: Timeframe = "24H";

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

// Simple in-memory cache (best-effort)
type CacheEntry = { ts: number; payload: ScanResponse };
const mem = new Map<string, CacheEntry>();

function cacheKey(opts: { limit: number; sort: SortMode; tf: Timeframe }) {
  return `scan:v1:eur:${opts.tf}:${opts.limit}:${opts.sort}`;
}
function getCache(key: string, ttlMs: number) {
  const e = mem.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > ttlMs) {
    mem.delete(key);
    return null;
  }
  return e.payload;
}
function setCache(key: string, payload: ScanResponse) {
  mem.set(key, { ts: Date.now(), payload });
}

function parseSort(v: string | null): SortMode {
  const s = (v || "").trim();
  const allowed: SortMode[] = ["rank_desc", "rank_asc", "price_desc", "price_asc"];
  return (allowed.includes(s as SortMode) ? (s as SortMode) : DEFAULT_SORT);
}

function parseTf(v: string | null): Timeframe {
  const s = (v || "").trim().toUpperCase();
  const allowed: Timeframe[] = ["24H", "7D", "30D"];
  return (allowed.includes(s as Timeframe) ? (s as Timeframe) : DEFAULT_TF);
}

async function fetchCoinGecko(limit: number): Promise<CGMarketItem[]> {
  const params = new URLSearchParams({
    vs_currency: "eur",
    order: "market_cap_desc",
    per_page: String(limit),
    page: "1",
    sparkline: "false",
    price_change_percentage: "24h",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8500);

  try {
    const res = await fetch(`${COINGECKO_URL}?${params.toString()}`, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    const json = (await res.json()) as unknown;
    if (!Array.isArray(json)) throw new Error("CoinGecko: response not array");
    return json as CGMarketItem[];
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackUniverse(tf: Timeframe): ScanAsset[] {
  // Minimal stable fallback (keeps UI alive)
  const base = [
    { id: "bitcoin", symbol: "BTC", name: "Bitcoin", price: 60000, chg24: 0.1, mc: 0, vol: 0 },
    { id: "ethereum", symbol: "ETH", name: "Ethereum", price: 2000, chg24: 0.2, mc: 0, vol: 0 },
    { id: "tether", symbol: "USDT", name: "Tether", price: 1, chg24: 0.01, mc: 0, vol: 0 },
    { id: "solana", symbol: "SOL", name: "Solana", price: 150, chg24: 3.2, mc: 0, vol: 0 },
    { id: "ripple", symbol: "XRP", name: "XRP", price: 0.6, chg24: -0.4, mc: 0, vol: 0 },
    { id: "binancecoin", symbol: "BNB", name: "BNB", price: 500, chg24: 0.3, mc: 0, vol: 0 },
  ];

  return base.map((x) => {
    const regime = regimeFromChg24(x.chg24);
    const stability = computeStabilityIndex({ timeframe: tf, chg24Pct: x.chg24, marketCap: x.mc, volume24h: x.vol });
    const rank = computeRankScore({ stabilityIndex: stability, regime, timeframe: tf });

    const binance_url = buildBinanceUrl(x.symbol);
    const affiliate_url = buildAffiliateUrl(binance_url);

    return {
      id: x.id,
      symbol: x.symbol,
      name: x.name,
      price_eur: x.price,
      chg_24h_pct: x.chg24,
      timeframe: tf,
      stability_index: stability,
      rank_score: rank,
      binance_url,
      affiliate_url,
      market_cap: x.mc,
      volume_24h: x.vol,
      rank_delta: null,
      rank_trend: null,
    };
  });
}

function normalizeItem(x: CGMarketItem, tf: Timeframe): ScanAsset | null {
  const id = safeStr(x.id) ?? null;
  const symbolRaw = safeStr(x.symbol) ?? null;
  if (!id || !symbolRaw) return null;

  const symbol = upperSymbol(symbolRaw);
  const name = safeStr(x.name) ?? titleFromId(id);

  const price = toNum(x.current_price) ?? 0;
  const chg24 = toNum(x.price_change_percentage_24h) ?? 0;

  const mc = toNum(x.market_cap ?? undefined) ?? undefined;
  const vol = toNum(x.total_volume ?? undefined) ?? undefined;

  const regime = regimeFromChg24(chg24);
  const stability = computeStabilityIndex({
    timeframe: tf,
    chg24Pct: chg24,
    marketCap: mc,
    volume24h: vol,
  });
  const rank = computeRankScore({ stabilityIndex: stability, regime, timeframe: tf });

  const binance_url = buildBinanceUrl(symbol);
  const affiliate_url = buildAffiliateUrl(binance_url);

  return {
    id,
    symbol,
    name,
    price_eur: price,
    chg_24h_pct: chg24,
    timeframe: tf,
    stability_index: stability,
    rank_score: rank,
    binance_url,
    affiliate_url,
    market_cap: mc,
    volume_24h: vol,
    rank_delta: null,
    rank_trend: null,
  };
}

export async function GET(req: Request) {
  const ts = isoNow();
  const warnings: string[] = [];

  try {
    const { searchParams } = new URL(req.url);

    const limitReq = toNum(searchParams.get("limit")) ?? DEFAULT_LIMIT;
    const limit = clamp(Math.floor(limitReq), 1, MAX_LIMIT);

    const sort = parseSort(searchParams.get("sort"));
    const tf = parseTf(searchParams.get("tf"));

    // V1 note: CoinGecko markets endpoint only provides 24h change.
    // We accept 7D/30D for UI continuity but warn that it’s “compat” weights.
    if (tf !== "24H") {
      warnings.push("TF=7D/30D est en mode compat V1 (source 24h). Candles multi-TF à implémenter ensuite.");
    }

    const noStore = (safeStr(searchParams.get("noStore")) ?? "").toLowerCase() === "1";
    const ttlMs = 45_000;
    const key = cacheKey({ limit, sort, tf });

    if (!noStore) {
      const hit = getCache(key, ttlMs);
      if (hit) {
        return NextResponse.json(
          { ...hit, ts, source: "cache", meta: { ...(hit.meta ?? {}), cache: "hit" } } satisfies ScanResponse,
          { status: 200, headers: { "cache-control": "no-store" } }
        );
      }
    }

    // Fetch size > limit to make sorting meaningful
    const fetchSize = clamp(Math.max(limit * 2, 80), 50, 250);

    let raw: CGMarketItem[] = [];
    let source: ScanResponse["source"] = "coingecko";

    try {
      raw = await fetchCoinGecko(fetchSize);
    } catch (e: any) {
      source = "fallback";
      warnings.push(`CoinGecko indisponible: ${e?.message ?? "unknown"}`);
      const data = sortAssets(fallbackUniverse(tf), sort).slice(0, limit);

      const payload: ScanResponse = {
        ok: true,
        ts,
        source,
        market: "crypto",
        quote: "eur",
        timeframe: tf,
        sort,
        count: data.length,
        data,
        meta: { warnings, cache: noStore ? "no-store" : "miss" },
      };

      if (!noStore) setCache(key, payload);
      return NextResponse.json(payload, { status: 200, headers: { "cache-control": "no-store" } });
    }

    const normalized = raw
      .map((x) => normalizeItem(x, tf))
      .filter((x): x is ScanAsset => Boolean(x));

    if (!normalized.length) {
      const data = sortAssets(fallbackUniverse(tf), sort).slice(0, limit);
      warnings.push("Aucun actif normalisé depuis la source, fallback utilisé.");

      const payload: ScanResponse = {
        ok: true,
        ts,
        source: "fallback",
        market: "crypto",
        quote: "eur",
        timeframe: tf,
        sort,
        count: data.length,
        data,
        meta: { warnings, cache: noStore ? "no-store" : "miss" },
      };

      if (!noStore) setCache(key, payload);
      return NextResponse.json(payload, { status: 200, headers: { "cache-control": "no-store" } });
    }

    const sorted = sortAssets(normalized, sort).slice(0, limit);

    const payload: ScanResponse = {
      ok: true,
      ts,
      source,
      market: "crypto",
      quote: "eur",
      timeframe: tf,
      sort,
      count: sorted.length,
      data: sorted,
      meta: { warnings: warnings.length ? warnings : undefined, cache: noStore ? "no-store" : "miss" },
    };

    if (!noStore) setCache(key, payload);

    return NextResponse.json(payload, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (e: any) {
    const payload: ScanResponse = {
      ok: false,
      ts,
      source: "fallback",
      market: "crypto",
      quote: "eur",
      timeframe: "24H",
      sort: "rank_desc",
      count: 0,
      data: [],
      error: e?.message ?? "unknown_error",
      meta: { warnings: ["scan_failed"] },
    };
    return NextResponse.json(payload, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
