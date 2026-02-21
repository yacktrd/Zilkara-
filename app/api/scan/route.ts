
// app/api/scan/route.ts
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "fra1";

type Regime = "STABLE" | "TRANSITION" | "VOLATILE";

type ApiError = { code: string; message: string };

type ScanAsset = {
  symbol: string; // BASE (ex: "CREAM")
  price: number;
  chg_24h_pct: number;

  // base fields (contract stable)
  stability_score: number; // keep as-is for compatibility
  regime: Regime;

  // affiliate
  binance_url: string | null;

  // V1.1 (computed server-side)
  confidence_score: number;
  confidence_label: "GOOD" | "MID" | "BAD";
  confidence_reason: string;

  // optional debug
  delta_score?: number;
  regime_change?: boolean;
};

type ScanResponse = {
  ok: boolean;
  ts: number;
  source: "binance";
  market: "spot";
  quote: string;
  count: number;
  data: ScanAsset[];
  meta?: Record<string, unknown>;
  error?: ApiError;
};

/**
 * ---- Config (minimal + robust) ----
 * Reference obligatoire: 24h.
 */
const DEFAULT_LIMIT = 250;
const QUOTE = "USDT";

// Short cache to avoid hammering Binance
const SNAPSHOT_CACHE_TTL_S = 20;

// KV keys
const KV_KEY_LATEST = "zilkara:scan:latest";
const KV_KEY_PREV_MAP = "zilkara:scan:prev_map";

// Optional affiliate code
const BINANCE_REF =
  process.env.BINANCE_REF ||
  process.env.NEXT_PUBLIC_BINANCE_REF ||
  process.env.BINANCE_AFFILIATE_CODE ||
  "";

/** Helpers */
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

function baseFromFullSymbol(full: string): string {
  if (!full) return "";
  if (full.endsWith(QUOTE)) return full.slice(0, -QUOTE.length);
  return full;
}

function fullFromBaseSymbol(base: string): string {
  const b = normalizeSymbol(base);
  if (!b) return "";
  return b.endsWith(QUOTE) ? b : `${b}${QUOTE}`;
}

/**
 * Build a Binance trade URL (spot) with optional referral.
 */
function makeBinanceUrlFromFullSymbol(fullSymbol: string): string | null {
  const s = normalizeSymbol(fullSymbol);
  if (!s || !s.endsWith(QUOTE)) return null;

  const base = s.slice(0, -QUOTE.length);
  const pair = `${base}_${QUOTE}`; // Binance web uses BASE_QUOTE
  const url = new URL(`https://www.binance.com/en/trade/${pair}`);
  url.searchParams.set("type", "spot");

  if (BINANCE_REF) {
    // "ref" is a common, harmless key
    url.searchParams.set("ref", BINANCE_REF);
  }
  return url.toString();
}

/**
 * Minimal scoring (non-proprietary):
 * (Tu peux changer plus tard sans casser le contrat.)
 */
function computeStabilityScore(chg24: number): number {
  const abs = Math.abs(chg24);
  const score = 100 - abs * 2; // 0%=>100 ; 50%=>0
  return clamp(Math.round(score), 0, 100);
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
 * - Regime penalties (V1)
 * - Memory penalties (V1.1):
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

  // Regime penalties (V1)
  if (regime === "TRANSITION") score -= 10;
  if (regime === "VOLATILE") score -= 25;

  // Memory penalties (V1.1)
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

/**

async function fetchCoinGecko24h(signal: AbortSignal): Promise<any[]> {
  const url =
    "https://api.coingecko.com/api/v3/coins/markets" +
    "?vs_currency=usd" +
    "&order=volume_desc" +
    "&per_page=250" +
    "&page=1" +
    "&sparkline=false" +
    "&price_change_percentage=24h";

  const res = await fetch(url, {
    signal,
    cache: "no-store",
    headers: {
      "User-Agent": "Zilkara/1.1",
    },
  });

  if (!res.ok) {
    throw new Error(`COINGECKO_HTTP_${res.status}`);
  }

  return res.json();
}
  const json = await res.json();
  if (!Array.isArray(json)) {
    throw new Error("BINANCE_BAD_PAYLOAD");
  }
  return json;
}

/** Filter: USDT spot tickers only + remove obvious leveraged tokens */
function isEligibleFullSymbol(full: string): boolean {
  const s = normalizeSymbol(full);
  if (!s.endsWith(QUOTE)) return false;

  // avoid common leveraged tokens patterns
  const bad = ["UPUSDT", "DOWNUSDT", "BULLUSDT", "BEARUSDT"];
  if (bad.some((x) => s.endsWith(x))) return false;

  // avoid fiat-pegged pairs noise if you want (optional)
  // if (["BUSDUSDT", "USDCUSDT", "TUSDUSDT", "FDUSDUSDT"].includes(s)) return false;

  return true;
}

/** KV safe wrappers (si KV pas configuré, on continue sans casser) */
async function kvGet<T>(key: string): Promise<T | null> {
  try {
    const v = await kv.get<T>(key);
    return (v ?? null) as T | null;
  } catch {
    return null;
  }
}

async function kvSet<T>(key: string, value: T, exSeconds?: number): Promise<void> {
  try {
    if (typeof exSeconds === "number") {
      await kv.set(key, value as any, { ex: exSeconds });
    } else {
      await kv.set(key, value as any);
    }
  } catch {
    // ignore: KV not configured or transient failure
  }
}

type PrevMap = Record<
  string,
  { stability_score: number; regime: Regime; ts: number }
>;

export async function GET(req: Request) {
  const ts = Date.now();

  // Query params
  const { searchParams } = new URL(req.url);
  const limit = clamp(toNumber(searchParams.get("limit"), DEFAULT_LIMIT), 10, 500);

  // 1) const raw = await fetchCoinGecko24h(controller.signal);

const filtered = raw
  .filter((coin: any) => coin.symbol && coin.price_change_percentage_24h !== null)
  .slice(0, DEFAULT_LIMIT)
  .map((coin: any) => {
    const symbol = coin.symbol.toUpperCase();
    const price = Number(coin.current_price);
    const chg24 = Number(coin.price_change_percentage_24h);

    const stability_score = computeStabilityScore(chg24);
    const regime = computeRegime(chg24);

    const confidence = computeConfidenceV11({
      stability_score,
      regime,
    });

    return {
      symbol,
      price,
      chg_24h_pct: chg24,
      stability_score,
      regime,
      binance_url: makeBinanceUrl(symbol + QUOTE),
      ...confidence,
    };
  });


  // 2) Load prev_map for V1.1 memory
  const prevMap = (await kvGet<PrevMap>(KV_KEY_PREV_MAP)) || {};

  // 3) Fetch Binance with hard timeout
  const controller = new AbortController();
  const timeoutMs = 7000;
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const tickers = await fetchBinance24hTickers(controller.signal);

    // Filter + map
    const filtered = tickers
      .filter((x) => isEligibleFullSymbol(x?.symbol))
      .map((x) => {
        const fullSymbol = normalizeSymbol(x.symbol); // e.g. CREAMUSDT
        const baseSymbol = baseFromFullSymbol(fullSymbol); // e.g. CREAM

        const price = toNumber(x.lastPrice, 0);
        const chg24 = toNumber(x.priceChangePercent, 0);

        const stability_score = computeStabilityScore(chg24);
        const regime = computeRegime(chg24);

        const prev = prevMap[baseSymbol];
        const confidence = computeConfidenceV11({
          stability_score,
          regime,
          prev_score: prev?.stability_score,
          prev_regime: prev?.regime,
        });

        const asset: ScanAsset = {
          symbol: baseSymbol,
          price,
          chg_24h_pct: chg24,
          stability_score,
          regime,
          binance_url: makeBinanceUrlFromFullSymbol(fullSymbol),
          confidence_score: confidence.confidence_score,
          confidence_label: confidence.confidence_label,
          confidence_reason: confidence.confidence_reason,
          delta_score: confidence.delta_score,
          regime_change: confidence.regime_change,
        };

        return asset;
      })
      .slice(0, limit);

    // 4) Store new prev_map (only keep needed fields)
    const nextPrevMap: PrevMap = {};
    for (const a of filtered) {
      nextPrevMap[a.symbol] = {
        stability_score: a.stability_score,
        regime: a.regime,
        ts,
      };
    }
    await kvSet(KV_KEY_PREV_MAP, nextPrevMap);

    const out: ScanResponse = {
      ok: true,
      ts,
      source: "binance",
      market: "spot",
      quote: QUOTE,
      count: filtered.length,
      data: filtered,
      meta: {
        confidence_method: "v1.1",
        cache_ttl_s: SNAPSHOT_CACHE_TTL_S,
        limit,
      },
    };

    // 5) Cache snapshot
    await kvSet(KV_KEY_LATEST, out, SNAPSHOT_CACHE_TTL_S);

    return NextResponse.json(out, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "UNKNOWN_ERROR";
    const out: ScanResponse = {
      ok: false,
      ts,
      source: "binance",
      market: "spot",
      quote: QUOTE,
      count: 0,
      data: [],
      error: { code: "SCAN_FAILED", message: msg },
    };
    return NextResponse.json(out, {
      status: 200, // keep UI stable
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } finally {
    clearTimeout(t);
  }
}
