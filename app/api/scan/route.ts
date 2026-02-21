// app/api/scan/route.ts
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Zilkara /api/scan — stable contract, robust mapping, non-proprietary scoring.
 * Source: CoinGecko (Binance API blocked in your context).
 *
 * Goals:
 * - Always return a clean snapshot (24h reference)
 * - Avoid build-time mistakes seen previously (undefined vars/functions, controller order, etc.)
 * - Solid mapping + safe fallbacks
 * - Short cache + previous-map memory (confidence v1.1)
 */

type Regime = "STABLE" | "TRANSITION" | "VOLATILE";
type ApiError = { code: string; message: string };

type ScanAsset = {
  symbol: string;
  price: number;
  chg_24h_pct: number;

  stability_score: number;
  regime: Regime;

  binance_url: string | null;

  confidence_score: number;
  confidence_label: "GOOD" | "MID" | "BAD";
  confidence_reason: string;

  delta_score?: number;
  regime_change?: boolean;
};

type ScanResponse = {
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

/** ---------- Config ---------- */
const DEFAULT_LIMIT = 250;

// CoinGecko uses vs_currency like "usd". We keep QUOTE for UI consistency.
const VS_CURRENCY = "usd";
const QUOTE = "USD";

// Trade URL affiliate (optional). Link only; API calls to Binance are not used.
const BINANCE_REF =
  process.env.BINANCE_REF ||
  process.env.NEXT_PUBLIC_BINANCE_REF ||
  process.env.BINANCE_AFFILIATE_CODE ||
  "";

// Short cache to avoid hammering CoinGecko (and for stability)
const SNAPSHOT_CACHE_TTL_S = 20;

// Timeouts (server-side)
const FETCH_TIMEOUT_MS = 8000;

// KV keys
const KV_KEY_LATEST = "zilkara:scan:latest";
const KV_KEY_PREV_MAP = "zilkara:scan:prev_map";

/** ---------- Helpers ---------- */
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

function makeBinanceUrlFromBaseSymbol(base: string): string | null {
  const s = normalizeSymbol(base);
  if (!s) return null;

  // Binance web pair format: BASE_USDT
  const pair = `${s}_USDT`;
  const url = new URL(`https://www.binance.com/en/trade/${pair}`);
  url.searchParams.set("type", "spot");
  if (BINANCE_REF) url.searchParams.set("ref", BINANCE_REF);
  return url.toString();
}

/**
 * Minimal scoring (non-proprietary):
 * - stability_score: inverse of abs(24h%)
 * - regime: STABLE/TRANSITION/VOLATILE based on abs(24h%)
 */
function computeStabilityScore(chg24: number): number {
  const abs = Math.abs(chg24);
  // 0% => 100 ; 50% => 0 (clamped)
  const score = 100 - abs * 2;
  return clamp(Math.round(score), 0, 100);
}

function computeRegime(chg24: number): Regime {
  const abs = Math.abs(chg24);
  if (abs < 5) return "STABLE";
  if (abs < 12) return "TRANSITION";
  return "VOLATILE";
}

/**
 * Confidence V1.1 (simple + explainable):
 * - base = stability_score
 * - penalty by regime
 * - memory penalty: regime changed (-10)
 * - memory penalty: stability delta >= 8 (-5)
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

  // Regime penalties
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
  if (typeof delta_score === "number" && Math.abs(delta_score) >= 8)
    parts.push("Variation brusque récente.");

  const confidence_reason = parts.join(" ").trim() || "Contexte évalué.";

  return {
    confidence_score: score,
    confidence_label,
    confidence_reason,
    delta_score,
    regime_change,
  };
}

/** ---------- CoinGecko fetch + mapping ---------- */
type CoinGeckoMarket = {
  id?: string;
  symbol?: string;
  name?: string;
  current_price?: number;
  price_change_percentage_24h?: number;
};

// Optional key (CoinGecko has multiple auth modes depending on plan; we keep it harmless)
const COINGECKO_API_KEY =
  process.env.COINGECKO_API_KEY ||
  process.env.NEXT_PUBLIC_COINGECKO_API_KEY ||
  "";

async function fetchCoinGecko24h(signal: AbortSignal): Promise<CoinGeckoMarket[]> {
  const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
  url.searchParams.set("vs_currency", VS_CURRENCY);
  url.searchParams.set("order", "volume_desc");
  url.searchParams.set("per_page", String(DEFAULT_LIMIT));
  url.searchParams.set("page", "1");
  url.searchParams.set("sparkline", "false");
  // ensure 24h field is present
  url.searchParams.set("price_change_percentage", "24h");

  const headers: Record<string, string> = {
    accept: "application/json",
  };

  // Add key if you have one (won't break if empty)
  if (COINGECKO_API_KEY) {
    // Many setups accept either of these; keeping both is safe but redundant.
    headers["x-cg-pro-api-key"] = COINGECKO_API_KEY;
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers,
    signal,
    // next: { revalidate: 0 } // not needed in route handlers
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`COINGECKO_HTTP_${res.status}: ${text || res.statusText}`);
  }

  const json = (await res.json()) as unknown;
  if (!Array.isArray(json)) throw new Error("COINGECKO_BAD_PAYLOAD");
  return json as CoinGeckoMarket[];
}

/** ---------- KV safe wrappers ---------- */
async function kvGetJson<T>(key: string): Promise<T | null> {
  try {
    const v = (await kv.get(key)) as unknown;
    if (v == null) return null;
    return v as T;
  } catch {
    return null;
  }
}

async function kvSetJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  try {
    if (ttlSeconds && ttlSeconds > 0) {
      await kv.set(key, value, { ex: ttlSeconds });
    } else {
      await kv.set(key, value);
    }
  } catch {
    // ignore if KV not configured; endpoint must still work
  }
}

/** ---------- Route ---------- */
export async function GET(): Promise<NextResponse> {
  const ts = Date.now();

  // 1) Try cache first (fast + stable)
  const cached = await kvGetJson<ScanResponse>(KV_KEY_LATEST);
  if (cached && cached.ok && typeof cached.ts === "number") {
    // Keep cache very short; still return it if present.
    return NextResponse.json(cached);
  }

  // 2) Build controller BEFORE using it (fix previous error)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // 3) Fetch raw markets
    const raw = await fetchCoinGecko24h(controller.signal);

    // 4) Load prev map for confidence memory
    const prevMap =
      (await kvGetJson<Record<string, { stability_score: number; regime: Regime }>>(KV_KEY_PREV_MAP)) || {};

    // 5) Clean mapping
    const data: ScanAsset[] = raw
      .map((m): ScanAsset | null => {
        const symbol = normalizeSymbol(m.symbol);
        if (!symbol) return null;

        const price = toNumber(m.current_price, 0);
        const chg = toNumber(m.price_change_percentage_24h, 0);

        // Drop obvious junk rows
        if (!Number.isFinite(price) || price <= 0) return null;

        const stability_score = computeStabilityScore(chg);
        const regime = computeRegime(chg);

        const prev = prevMap[symbol];
        const conf = computeConfidenceV11({
          stability_score,
          regime,
          prev_score: prev?.stability_score,
          prev_regime: prev?.regime,
        });

        return {
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
      })
      .filter
