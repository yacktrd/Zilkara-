// app/api/scan/route.ts
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Regime = "STABLE" | "TRANSITION" | "VOLATILE";

type ApiError = { code: string; message: string };

type ScanAsset = {
  symbol: string;          // ex: BTC
  price: number;           // USD
  chg_24h_pct: number;     // % 24h

  stability_score: number; // 0..100
  regime: Regime;

  // Link only (NO Binance API)
  binance_url: string | null;

  confidence_score: number; // 0..100
  confidence_label: "GOOD" | "MID" | "BAD";
  confidence_reason: string;

  delta_score?: number;
  regime_change?: boolean;
};

type PrevState = { stability_score: number; regime: Regime };

type ScanResponse = {
  ok: boolean;
  ts: number;
  source: "coingecko";
  market: "spot";
  quote: "USD";
  count: number;
  data: ScanAsset[];
  meta?: Record<string, unknown>;
  error?: ApiError;
};

/**
 * Config
 */
const DEFAULT_LIMIT = 250;
const SNAPSHOT_CACHE_TTL_S = 20;

const KV_KEY_LATEST = "zilkara:scan:latest";
const KV_KEY_PREV_MAP = "zilkara:scan:prev_map";

const BINANCE_REF =
  process.env.BINANCE_REF ||
  process.env.NEXT_PUBLIC_BINANCE_REF ||
  process.env.BINANCE_AFFILIATE_CODE ||
  "";

/**
 * Helpers
 */
function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

function toNumber(x: unknown, fallback = 0): number {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSymbol(raw: unknown): string {
  return String(raw ?? "").trim().toUpperCase();
}

/**
 * Minimal scoring (non-proprietary).
 */
function computeStabilityScore(chg24: number): number {
  const abs = Math.abs(chg24);
  // 0% => 100 ; 50% => 0 (clamp)
  return clamp(Math.round(100 - abs * 2), 0, 100);
}

function computeRegime(chg24: number): Regime {
  const abs = Math.abs(chg24);
  if (abs < 5) return "STABLE";
  if (abs < 12) return "TRANSITION";
  return "VOLATILE";
}

/**
 * Confidence V1.1:
 * - Base = stability_score
 * - Regime penalties
 * - Memory penalties:
 *   - regime change => -10
 *   - abrupt delta (>=8) => -5
 */
function computeConfidenceV11(args: {
  stability_score: number;
  regime: Regime;
  prev_score?: number;
  prev_regime?: Regime;
}): {
  confidence_score: number;
  confidence_label: "GOOD" | "MID" | "BAD";
  confidence_reason: string;
  delta_score?: number;
  regime_change?: boolean;
} {
  const { stability_score, regime, prev_score, prev_regime } = args;

  let score = toNumber(stability_score, 0);

  if (regime === "TRANSITION") score -= 10;
  if (regime === "VOLATILE") score -= 25;

  let delta_score: number | undefined;
  let regime_change: boolean | undefined;

  if (typeof prev_score === "number") {
    delta_score = stability_score - prev_score;
    if (Math.abs(delta_score) >= 8) score -= 5;
  }

  if (prev_regime) {
    regime_change = prev_regime !== regime;
    if (regime_change) score -= 10;
  }

  score = clamp(Math.round(score), 0, 100);

  const confidence_label: "GOOD" | "MID" | "BAD" =
    score >= 80 ? "GOOD" : score >= 60 ? "MID" : "BAD";

  const parts: string[] = [];
  if (regime === "STABLE") parts.push("Contexte stable.");
  if (regime === "TRANSITION") parts.push("Transition détectée.");
  if (regime === "VOLATILE") parts.push("Contexte instable.");
  if (regime_change) parts.push("Changement de régime récent.");
  if (typeof delta_score === "number" && Math.abs(delta_score) >= 8) {
    parts.push("Variation brusque récente.");
  }

  return {
    confidence_score: score,
    confidence_label,
    confidence_reason: parts.join(" ").trim() || "Contexte évalué.",
    delta_score,
    regime_change,
  };
}

/**
 * Binance URL builder (link only).
 * Base symbol (BTC) -> BTC_USDT
 */
function makeBinanceUrlFromBaseSymbol(baseSymbol: string): string | null {
  const base = normalizeSymbol(baseSymbol);
  if (!base) return null;

  const pair = `${base}_USDT`;
  const url = new URL(`https://www.binance.com/en/trade/${pair}`);
  url.searchParams.set("type", "spot");
  if (BINANCE_REF) url.searchParams.set("ref", BINANCE_REF);

  return url.toString();
}

/**
 * CoinGecko markets: USD + 24h change
 */
async function fetchCoinGecko24h(signal: AbortSignal): Promise<any[]> {
  const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("per_page", String(DEFAULT_LIMIT));
  url.searchParams.set("page", "1");
  url.searchParams.set("sparkline", "false");
  url.searchParams.set("price_change_percentage", "24h");

  const res = await fetch(url.toString(), {
    method: "GET",
    signal,
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`COINGECKO_HTTP_${res.status}: ${body || res.statusText}`);
  }

  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

/**
 * KV safe wrappers (so build won't explode if KV is misconfigured)
 */
async function kvGetSafe<T>(key: string): Promise<T | null> {
  try {
    return (await kv.get<T>(key)) ?? null;
  } catch {
    return null;
  }
}

async function kvSetSafe<T>(key: string, value: T): Promise<void> {
  try {
    await kv.set(key, value as any);
  } catch {
    // ignore
  }
}

export async function GET() {
  const ts = Date.now();

  try {
    // 1) Serve short snapshot cache if fresh
    const cached = await kvGetSafe<ScanResponse>(KV_KEY_LATEST);
    if (cached?.ok && typeof cached.ts === "number") {
      const age = ts - cached.ts;
      if (age >= 0 && age <= SNAPSHOT_CACHE_TTL_S * 1000) {
        return NextResponse.json(cached, { status: 200 });
      }
    }

    // 2) Load prev map (confidence memory)
    const prevMap =
      (await kvGetSafe<Record<string, PrevState>>(KV_KEY_PREV_MAP)) ?? {};

    // 3) Fetch upstream with timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    let markets: any[] = [];
    try {
      markets = await fetchCoinGecko24h(controller.signal);
    } finally {
      clearTimeout(timer);
    }

    // 4) Map robustly
    const data: ScanAsset[] = [];
    const nextPrevMap: Record<string, PrevState> = {};

    for (const m of markets) {
      const symbol = normalizeSymbol(m?.symbol);
      if (!symbol) continue;

      const price = toNumber(m?.current_price, 0);
      const chg = toNumber(m?.price_change_percentage_24h, NaN);

      if (!Number.isFinite(price) || price <= 0) continue;
      if (!Number.isFinite(chg)) continue;

      const stability_score = computeStabilityScore(chg);
      const regime = computeRegime(chg);

      const prev = prevMap[symbol];
      const conf = computeConfidenceV11({
        stability_score,
        regime,
        prev_score: prev?.stability_score,
        prev_regime: prev?.regime,
      });

      const asset: ScanAsset = {
        symbol,
        price,
        chg_24h_pct: chg,

        stability_score,
        regime,

        binance_url: makeBinanceUrlFromBaseSymbol(symbol),

        confidence_score: conf.confidence_score,
        confidence_label: conf.confidence_label,
        confidence_reason: conf.confidence_reason,

        delta_score: conf.delta_score,
        regime_change: conf.regime_change,
      };

      data.push(asset);
      nextPrevMap[symbol] = { stability_score, regime };

      if (data.length >= DEFAULT_LIMIT) break;
    }

    // 5) Persist memory + snapshot cache
    await kvSetSafe(KV_KEY_PREV_MAP, nextPrevMap);

    const payload: ScanResponse = {
      ok: true,
      ts,
      source: "coingecko",
      market: "spot",
      quote: "USD",
      count: data.length,
      data,
      meta: {
        reference: "24h",
        cache_ttl_s: SNAPSHOT_CACHE_TTL_S,
        limit: DEFAULT_LIMIT,
      },
    };

    await kvSetSafe(KV_KEY_LATEST, payload);

    return NextResponse.json(payload, { status: 200 });
  } catch (err: any) {
    const message = String(err?.message || err);

    const payload: ScanResponse = {
      ok: false,
      ts,
      source: "coingecko",
      market: "spot",
      quote: "USD",
      count: 0,
      data: [],
      error: { code: "SCAN_FAILED", message },
    };

    return NextResponse.json(payload, { status: 500 });
  }
}
