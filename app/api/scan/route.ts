// app/api/scan/route.ts
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Regime = "STABLE" | "TRANSITION" | "VOLATILE";

type ApiError = { code: string; message: string };

type ScanAsset = {
  symbol: string;
  price: number;
  chg_24h_pct: number;

  // base (already in your standard)
  stability_score: number;
  regime: Regime;

  // affiliate
  binance_url: string | null;

  // V1.1 (computed server-side)
  confidence_score: number;
  confidence_label: "GOOD" | "MID" | "BAD";
  confidence_reason: string;

  // optional debug (kept but harmless for UI)
  delta_score?: number;
  regime_change?: boolean;
};

type ScanResponse = {
  ok: boolean;
  ts: number;
  data: ScanAsset[];
  meta?: Record<string, unknown>;
  error?: ApiError;
};

/**
 * ---- Config (minimal + robust) ----
 * Reference obligatoire: 24h.
 * Auto-refresh UI is handled client-side; here we just produce a clean snapshot.
 */
const DEFAULT_LIMIT = 250;
const QUOTE = "USDT";

// Cache to avoid hammering Binance. Keep it short (trading-grade stability > brute speed).
const SNAPSHOT_CACHE_TTL_S = 20;

// KV keys (unique + simple)
const KV_KEY_LATEST = "zilkara:scan:latest";
const KV_KEY_PREV_MAP = "zilkara:scan:prev_map";

// Optional: your Binance affiliation code (keep it sober, non-intrusive)
const BINANCE_REF =
  process.env.BINANCE_REF ||
  process.env.NEXT_PUBLIC_BINANCE_REF ||
  process.env.BINANCE_AFFILIATE_CODE ||
  "";

/**
 * Build a Binance trade URL (spot) with optional referral.
 * Keeps it simple and stable. No UI coupling.
 */
function makeBinanceUrl(symbol: string): string | null {
  if (!symbol || !symbol.endsWith(QUOTE)) return null;
  const base = symbol.slice(0, -QUOTE.length);
  const pair = `${base}_${QUOTE}`; // Binance web uses BASE_QUOTE
  const url = new URL(`https://www.binance.com/en/trade/${pair}`);
  url.searchParams.set("type", "spot");

  // If you have an affiliate/ref code, we add it quietly.
  if (BINANCE_REF) {
    // Binance referral parameter varies by program; "ref" is a common, harmless key.
    url.searchParams.set("ref", BINANCE_REF);
  }
  return url.toString();
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

function toNumber(x: unknown, fallback = 0): number {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSymbol(raw: unknown): string {
  const s = String(raw ?? "").trim().toUpperCase();
  return s;
}

/**
 * Minimal scoring (non-proprietary):
 * - We keep a simple stability_score for compatibility.
 * - We do NOT expose any proprietary RFS internals.
 *
 * You can swap these heuristics later without breaking the API contract.
 */
function computeStabilityScore(chg24: number): number {
  // lower abs change => higher stability
  const abs = Math.abs(chg24);
  // simple curve: 0% => 100 ; 50%+ => near 0
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

  // Short reason (1 sentence, low noise)
  const parts: string[] = [];
  if (regime === "STABLE") parts.push("Contexte stable.");
  if (regime === "TRANSITION") parts.push("Transition détectée.");
  if (regime === "VOLATILE") parts.push("Contexte instable.");

  if (regime_change) parts.push("Changement de régime récent.");
  if (typeof delta_score === "number" && Math.abs(delta_score) >= 8)
    parts.push("Variation brusque récente.");

  const confidence_reason = parts.join(" ").trim() || "Contexte évalué.";

  return { confidence_score: score, confidence_label, confidence_reason, delta_score, regime_change };
}

/**
 * Fetch Binance 24h tickers
 * Endpoint: /api/v3/ticker/24hr (big payload)
 * We keep it robust with timeout + filtering.
 */
async function fetchBinance24hTickers(signal: AbortSignal): Promise<any[]> {
  const url =
