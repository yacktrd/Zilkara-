// app/api/scan/route.ts
import { NextResponse } from "next/server";

/**
 * /api/scan
 * ADN:
 * - Scanner simple: liste d'actifs triés par confidence_score (desc)
 * - Ajout du nom complet (name) robuste
 * - Source serveur: CoinGecko (Binance best-effort = lien uniquement)
 * - Pas de filtre visuel imposé ici: l'API renvoie déjà trié
 *
 * Query params (optionnels):
 * - limit=1..250 (défaut 250)
 * - minScore=0..100 (défaut 0)  // utile si tu veux filtrer côté UI plus tard
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ----------------------------- Types ----------------------------- */

type Regime = "STABLE" | "TRANSITION" | "VOLATILE";
type ConfidenceLabel = "GOOD" | "MID" | "BAD";

type ApiError = { code: string; message: string };

export type ScanAsset = {
  id: string; // CoinGecko id (toujours présent ici)
  symbol: string; // BTC
  name: string; // Bitcoin
  price: number; // spot (USD)
  chg_24h_pct: number; // % 24h
  stability_score: number; // 0..100
  regime: Regime;

  confidence_score: number; // 0..100
  confidence_label: ConfidenceLabel;
  confidence_reason: string;

  binance_url: string | null; // best-effort (lien uniquement)
};

export type ScanResponse = {
  ok: boolean;
  ts: number;
  source: "coingecko";
  market: "spot";
  quote: string;
  count: number;
  data: ScanAsset[];
  meta?: Record<string, unknown>;
  error?: ApiError;
};

/* ----------------------------- Config ---------------------------- */

const DEFAULT_LIMIT = 250;
const QUOTE = "usd";
const SNAPSHOT_CACHE_TTL_S = 20;

// Régimes lisibles
const REGIME_STABLE_MAX_ABS = 5; // <=5%
const REGIME_TRANSITION_MAX_ABS = 12; // <=12%, sinon VOLATILE

/* ----------------------------- Cache ----------------------------- */

declare global {
  // eslint-disable-next-line no-var
  var __ZILKARA_MEM_CACHE__:
    | { key: string; ts: number; payload: ScanResponse }
    | undefined;
}

async function kvGet<T>(key: string): Promise<T | null> {
  try {
    const mod = await import("@vercel/kv");
    const kv = mod.kv;
    if (!kv) return null;
    return (await kv.get<T>(key)) ?? null;
  } catch {
    return null;
  }
}

async function kvSet<T>(key: string, value: T, ttlSeconds: number) {
  try {
    const mod = await import("@vercel/kv");
    const kv = mod.kv;
    if (!kv) return;
    await kv.set(key, value, { ex: ttlSeconds });
  } catch {
    // noop
  }
}

/* ----------------------------- Helpers --------------------------- */

function clamp(n: number, a: number, b: number) {
  if (!Number.isFinite(n)) return a;
  return Math.max(a, Math.min(b, n));
}

function safeNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v.trim();
  if (v == null) return fallback;
  return String(v).trim();
}

function regimeFromAbsMove(absPct: number): Regime {
  if (absPct <= REGIME_STABLE_MAX_ABS) return "STABLE";
  if (absPct <= REGIME_TRANSITION_MAX_ABS) return "TRANSITION";
  return "VOLATILE";
}

function computeStabilityScore(chg24: number): number {
  const abs = Math.abs(chg24);
  // 0% => 100 ; 20% => ~0
  return clamp(100 - abs * 5, 0, 100);
}

function computeConfidenceScore(args: {
  chg24: number;
  volume24h: number;
  marketCap: number;
}): { score: number; reason: string } {
  const abs = Math.abs(args.chg24);
  const stability = computeStabilityScore(args.chg24);

  // bonus liquidité (log scale, robuste)
  const vol = Math.max(0, args.volume24h);
  const mcap = Math.max(0, args.marketCap);
  const liqRaw = Math.log10(1 + vol) + 0.5 * Math.log10(1 + mcap);
  const liqBonus = clamp((liqRaw - 6) * 4, 0, 20); // 0..20

  // pénalité choc
  const shockPenalty = clamp((abs - 10) * 2, 0, 25); // 0..25

  const score = clamp(stability + liqBonus - shockPenalty, 0, 100);

  let reason = "Stabilité 24h + liquidité.";
  if (abs > 20) reason = "Move 24h extrême: confiance réduite.";
  else if (abs > 12) reason = "Volatilité élevée: prudence.";
  else if (abs > 5) reason = "Transition: filtrer selon objectif.";
  else reason = "Contexte stable: sélection plus propre.";

  return { score, reason };
}

function labelFromScore(score: number): ConfidenceLabel {
  if (score >= 75) return "GOOD";
  if (score >= 55) return "MID";
  return "BAD";
}

// Binance côté serveur: on ne fetch pas, on fournit juste un lien best-effort
function buildBinanceUrl(symbol: string, quote = "USDT"): string | null {
  const s = symbol.trim().toUpperCase();
  if (!s) return null;
  const q = quote.trim().toUpperCase();
  // ⚠️ certains symboles ne sont pas listés sur Binance => lien peut mener à rien: OK.
  return `https://www.binance.com/en/trade/${s}${q}`;
}

/* -------------------------- CoinGecko ---------------------------- */

type CoinGeckoMarket = {
  id: string;
  symbol: string;
  name: string;
  current_price: number | null;
  price_change_percentage_24h: number | null;
  total_volume: number | null;
  market_cap: number | null;
};

async function fetchCoinGecko24h(signal: AbortSignal, limit: number): Promise<CoinGeckoMarket[]> {
  const perPage = clamp(limit, 1, 250);
  const url =
    `https://api.coingecko.com/api/v3/coins/markets` +
    `?vs_currency=${encodeURIComponent(QUOTE)}` +
    `&order=volume_desc` +
    `&per_page=${perPage}` +
    `&page=1` +
    `&sparkline=false` +
    `&price_change_percentage=24h`;

  const res = await fetch(url, {
    method: "GET",
    signal,
    headers: {
      accept: "application/json",
      ...(process.env.COINGECKO_API_KEY
        ? { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY }
        : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`COINGECKO_HTTP_${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as CoinGeckoMarket[]) : [];
}

/* ----------------------------- Route ----------------------------- */

export async function GET(req: Request) {
  const ts = Date.now();
  const { searchParams } = new URL(req.url);

  const limit = clamp(safeNumber(searchParams.get("limit"), DEFAULT_LIMIT), 1, 250);
  const minScore = clamp(safeNumber(searchParams.get("minScore"), 0), 0, 100);

  const cacheKey = `scan:v2:${limit}:${minScore}`;

  // KV cache
  const kvCached = await kvGet<ScanResponse>(cacheKey);
  if (kvCached?.ok && Array.isArray(kvCached.data)) {
    return NextResponse.json(kvCached, { status: 200 });
  }

  // Memory cache
  const mem = globalThis.__ZILKARA_MEM_CACHE__;
  if (mem && mem.key === cacheKey && ts - mem.ts < SNAPSHOT_CACHE_TTL_S * 1000 && mem.payload.ok) {
    return NextResponse.json(mem.payload, { status: 200 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let raw: CoinGeckoMarket[];
    try {
      raw = await fetchCoinGecko24h(controller.signal, limit);
    } finally {
      clearTimeout(timeout);
    }

    // IMPORTANT: éviter le bug "null is not assignable to ScanAsset"
    // => on map en (ScanAsset | null) puis on filtre avec un type guard.
    const mapped = raw
      .map((coin): ScanAsset | null => {
        const id = safeString(coin.id);
        const symbol = safeString(coin.symbol).toUpperCase();
        const name = safeString(coin.name);

        const price = safeNumber(coin.current_price, 0);
        const chg24 = safeNumber(coin.price_change_percentage_24h, 0);

        // garde-fous stricts (évite objets invalides + NaN)
        if (!id || !symbol || !name) return null;
        if (!Number.isFinite(price) || price <= 0) return null;

        const abs = Math.abs(chg24);
        const regime = regimeFromAbsMove(abs);
        const stability_score = Math.round(computeStabilityScore(chg24));

        const volume24h = safeNumber(coin.total_volume, 0);
        const marketCap = safeNumber(coin.market_cap, 0);

        const conf = computeConfidenceScore({ chg24, volume24h, marketCap });
        const confidence_score = Math.round(conf.score);
        const confidence_label = labelFromScore(confidence_score);

        return {
          id,
          symbol,
          name,
          price,
          chg_24h_pct: Math.round(chg24 * 100) / 100,
          stability_score,
          regime,
          confidence_score,
          confidence_label,
          confidence_reason: conf.reason,
          binance_url: buildBinanceUrl(symbol, "USDT"),
        };
      })
      .filter((x): x is ScanAsset => x !== null);

    // Filtre optionnel (pas de filtre visuel, juste data)
    const filtered = minScore > 0 ? mapped.filter((a) => a.confidence_score >= minScore) : mapped;

    // TRI ADN: confidence desc, puis stabilité desc, puis abs(chg) asc
    filtered.sort((a, b) => {
      if (b.confidence_score !== a.confidence_score) return b.confidence_score - a.confidence_score;
      if (b.stability_score !== a.stability_score) return b.stability_score - a.stability_score;
      return Math.abs(a.chg_24h_pct) - Math.abs(b.chg_24h_pct);
    });

    const payload: ScanResponse = {
      ok: true,
      ts,
      source: "coingecko",
      market: "spot",
      quote: QUOTE.toUpperCase(),
      count: filtered.length,
      data: filtered.slice(0, limit),
      meta: {
        sort: "confidence_score_desc",
        limit,
        minScore,
      },
    };

    await kvSet(cacheKey, payload, SNAPSHOT_CACHE_TTL_S);
    globalThis.__ZILKARA_MEM_CACHE__ = { key: cacheKey, ts, payload };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const payload: ScanResponse = {
      ok: false,
      ts,
      source: "coingecko",
      market: "spot",
      quote: QUOTE.toUpperCase(),
      count: 0,
      data: [],
      error: { code: "SCAN_FAILED", message },
    };
    return NextResponse.json(payload, { status: 500 });
  }
}
