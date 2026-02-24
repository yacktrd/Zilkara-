// app/api/scan/route.ts
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

/**
 * Zilkara — /api/scan
 * Objectif:
 * - Retourner la liste des actifs triés par confidence_score DESC
 * - Format stable, robuste, compatible anciennes sources
 * - "name" (nom complet) TOUJOURS présent (fallback intelligent)
 *
 * Source de données:
 * - KV (Upstash/Vercel KV) : clé "rfs:scan" en priorité
 * - Fallback possible : "rfs:state:24h" (ou autres clés)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Regime = "STABLE" | "TRANSITION" | "VOLATILE" | "UNKNOWN";

type ScanAsset = {
  symbol: string;
  name: string; // ✅ obligatoire
  price?: number;
  chg_24h_pct?: number;
  confidence_score?: number;
  regime: Regime;
  binance_url?: string;
  affiliate_url?: string;
};

type ScanResponse = {
  ok: boolean;
  count: number;
  items: ScanAsset[];
  meta: {
    sorted_by: "confidence_score_desc";
    generated_at: string;
    source_key: string;
    cache: "no-store";
  };
  error?: { code: string; message: string };
};

/** ---------------------------
 * Utils
 * -------------------------- */

function nowIso(): string {
  return new Date().toISOString();
}

function cleanStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function toNum(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function normalizeSymbolFromAny(x: any): string {
  const raw =
    cleanStr(x?.symbol) ??
    cleanStr(x?.asset) ??
    cleanStr(x?.ticker) ??
    cleanStr(x?.pair) ??
    "";
  // ex: BTCUSDT -> BTCUSDT ; btc -> BTC ; " BTC " -> BTC
  return raw.toUpperCase();
}

function baseSymbol(symbol: string): string {
  // BTCUSDT -> BTC ; ETHUSD -> ETH ; BTC -> BTC
  return symbol.replace(/(USDT|USD|USDC|BUSD)$/i, "").toUpperCase();
}

function buildBinanceUrl(symbol: string): string {
  // Binance spot pair usually ends with USDT for crypto
  const pair = symbol.toUpperCase().includes("USDT")
    ? symbol.toUpperCase()
    : `${baseSymbol(symbol)}USDT`;
  return `https://www.binance.com/en/trade/${pair}?_from=markets`;
}

function normalizeRegime(v: unknown): Regime {
  const s = (cleanStr(v) ?? "UNKNOWN").toUpperCase();
  if (s === "STABLE") return "STABLE";
  if (s === "TRANSITION") return "TRANSITION";
  if (s === "VOLATILE") return "VOLATILE";
  return "UNKNOWN";
}

/**
 * Dictionnaire minimal (tu peux l’étendre au fil du temps).
 * But: fournir un nom complet quand la source ne le donne pas.
 */
function prettyNameFromSymbol(symbol: string): string {
  const map: Record<string, string> = {
    BTC: "Bitcoin",
    ETH: "Ethereum",
    SOL: "Solana",
    BNB: "BNB",
    XRP: "XRP",
    ADA: "Cardano",
    DOGE: "Dogecoin",
    DOT: "Polkadot",
    AVAX: "Avalanche",
    LINK: "Chainlink",
    MATIC: "Polygon",
    TON: "Toncoin",
    LTC: "Litecoin",
    BCH: "Bitcoin Cash",
    UNI: "Uniswap",
    ATOM: "Cosmos",
    APT: "Aptos",
    NEAR: "NEAR Protocol",
    ARB: "Arbitrum",
    OP: "Optimism",
  };

  const b = baseSymbol(symbol);
  return map[b] ?? b; // fallback lisible > vide
}

/**
 * Normalisation robuste:
 * - supporte plusieurs structures de payload
 * - force name
 * - force regime
 */
function normalizeItem(x: any): ScanAsset | null {
  const symbol = normalizeSymbolFromAny(x);
  if (!symbol) return null;

  const rawName =
    cleanStr(x?.name) ??
    cleanStr(x?.asset_name) ??
    cleanStr(x?.full_name) ??
    cleanStr(x?.display_name);

  const name = rawName ?? prettyNameFromSymbol(symbol);

  const price =
    toNum(x?.price) ??
    toNum(x?.last_price) ??
    toNum(x?.last) ??
    toNum(x?.mark_price) ??
    toNum(x?.markPrice);

  const chg_24h_pct =
    toNum(x?.chg_24h_pct) ??
    toNum(x?.change_24h) ??
    toNum(x?.change24h) ??
    toNum(x?.priceChangePercent) ??
    toNum(x?.price_change_percent_24h);

  const confidence_score =
    toNum(x?.confidence_score) ??
    toNum(x?.confidence) ??
    toNum(x?.score) ??
    toNum(x?.confidenceScore);

  const regime = normalizeRegime(x?.regime ?? x?.market_regime ?? x?.context_regime);

  const binance_url = cleanStr(x?.binance_url) ?? buildBinanceUrl(symbol);
  const affiliate_url = cleanStr(x?.affiliate_url);

  return {
    symbol,
    name,
    price,
    chg_24h_pct,
    confidence_score,
    regime,
    binance_url,
    affiliate_url,
  };
}

function asArray(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.items)) return raw.items;
  if (raw && Array.isArray(raw.data)) return raw.data;
  if (raw && Array.isArray(raw.assets)) return raw.assets;
  return [];
}

function sortByConfidenceDesc(a: ScanAsset, b: ScanAsset): number {
  const aa = a.confidence_score ?? -1;
  const bb = b.confidence_score ?? -1;
  return bb - aa;
}

/** ---------------------------
 * KV read
 * -------------------------- */

async function kvGetAny(keys: string[]): Promise<{ key: string; value: any } | null> {
  for (const key of keys) {
    const value = await kv.get(key);
    if (value != null) return { key, value };
  }
  return null;
}

/** ---------------------------
 * Handler
 * -------------------------- */

export async function GET() {
  const generated_at = nowIso();

  // Ordre de priorité: scan final > state 24h > legacy keys
  const candidates = ["rfs:scan", "rfs:state:24h", "scan", "state:24h", "market:scan"];

  try {
    const found = await kvGetAny(candidates);

    if (!found) {
      const resp: ScanResponse = {
        ok: true,
        count: 0,
        items: [],
        meta: {
          sorted_by: "confidence_score_desc",
          generated_at,
          source_key: "none",
          cache: "no-store",
        },
        error: {
          code: "NO_DATA",
          message: "Aucune donnée trouvée dans KV (rfs:scan / rfs:state:24h).",
        },
      };
      return NextResponse.json(resp, {
        status: 200,
        headers: { "cache-control": "no-store" },
      });
    }

    const raw = found.value;
    const arr = asArray(raw);

    const items = arr
      .map(normalizeItem)
      .filter((x): x is ScanAsset => Boolean(x))
      .sort(sortByConfidenceDesc);

    // ✅ impose name non vide même après normalisation (par sécurité)
    const hardened = items.map((it) => ({
      ...it,
      name: cleanStr(it.name) ?? prettyNameFromSymbol(it.symbol),
      regime: normalizeRegime(it.regime),
    }));

    const resp: ScanResponse = {
      ok: true,
      count: hardened.length,
      items: hardened,
      meta: {
        sorted_by: "confidence_score_desc",
        generated_at,
        source_key: found.key,
        cache: "no-store",
      },
    };

    return NextResponse.json(resp, {
      status: 200,
      headers: { "cache-control": "no-store" },
    });
  } catch (err: any) {
    const resp: ScanResponse = {
      ok: false,
      count: 0,
      items: [],
      meta: {
        sorted_by: "confidence_score_desc",
        generated_at,
        source_key: "error",
        cache: "no-store",
      },
      error: {
        code: "SCAN_FAILED",
        message: err?.message ? String(err.message) : "Erreur inconnue",
      },
    };

    return NextResponse.json(resp, {
      status: 500,
      headers: { "cache-control": "no-store" },
    });
  }
}
