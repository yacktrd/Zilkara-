// app/api/scan/route.ts
import { NextResponse } from "next/server";
import { getStateData } from "@/lib/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RawItem = Record<string, any>;

type ScanAsset = {
  symbol: string;
  name: string;
  price: number;
  chg_24h_pct: number;
  confidence_score: number;
  regime: string;
  binance_url: string;
  affiliate_url: string;
};

function toStr(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function toNum(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function pickFirstDefined<T>(...vals: T[]): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null && v !== ("" as any)) return v;
  return undefined;
}

function buildBinanceUrl(symbol: string): string {
  return `https://www.binance.com/en/trade/${encodeURIComponent(symbol)}?_from=markets`;
}

function buildAffiliateUrl(binanceUrl: string, symbol: string): string {
  const base = process.env.BINANCE_AFFILIATE_BASE?.trim();
  if (base) {
    const u = new URL(base);
    u.searchParams.set("utm_source", "zilkara");
    u.searchParams.set("utm_medium", "app");
    u.searchParams.set("utm_campaign", "scan");
    u.searchParams.set("symbol", symbol);
    return u.toString();
  }

  const ref = process.env.BINANCE_REF_CODE?.trim();
  if (ref) {
    const u = new URL(binanceUrl);
    u.searchParams.set("ref", ref);
    u.searchParams.set("utm_source", "zilkara");
    u.searchParams.set("utm_medium", "app");
    u.searchParams.set("utm_campaign", "scan");
    return u.toString();
  }

  return binanceUrl;
}

function normalize(item: RawItem): ScanAsset | null {
  const symbol = toStr(pickFirstDefined(item.symbol, item.ticker, item.pair)).trim().toUpperCase();
  if (!symbol) return null;

  const name =
    toStr(pickFirstDefined(item.name, item.asset_name, item.base_name, item.fullname)).trim() || symbol;

  const price = toNum(pickFirstDefined(item.price, item.last, item.last_price), 0);

  const chg_24h_pct = toNum(
    pickFirstDefined(item.chg_24h_pct, item.change_24h_pct, item.pct_24h, item.priceChangePercent),
    0
  );

  const confidence_score = clamp(
    toNum(pickFirstDefined(item.confidence_score, item.confidence, item.score_confidence, item.score), 0),
    0,
    100
  );

  const regime = toStr(pickFirstDefined(item.regime, item.market_regime, item.context_regime)).trim() || "UNKNOWN";

  const binance_url =
    toStr(pickFirstDefined(item.binance_url, item.url, item.trade_url)).trim() || buildBinanceUrl(symbol);

  const affiliate_url =
    toStr(pickFirstDefined(item.affiliate_url, item.binance_affiliate_url)).trim() ||
    buildAffiliateUrl(binance_url, symbol);

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

export async function GET() {
  try {
    // ✅ Plus aucun fetch HTTP vers /api/state → fini les 401 "Authentication Required"
    const raw: any = await getStateData();

    const arr: RawItem[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw?.assets)
      ? raw.assets
      : [];

    const mapped = arr.map(normalize).filter(Boolean) as ScanAsset[];

    mapped.sort((a, b) => {
      const d = (b.confidence_score || 0) - (a.confidence_score || 0);
      if (d !== 0) return d;
      return a.symbol.localeCompare(b.symbol);
    });

    return NextResponse.json(
      {
        ok: true,
        count: mapped.length,
        items: mapped,
        meta: {
          sorted_by: "confidence_score_desc",
          generated_at: new Date().toISOString(),
        },
      },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  } catch (err: any) {
    // ✅ Message différent pour confirmer qu’on n’est plus sur l’ancienne version
    return NextResponse.json(
      { ok: false, error: "SCAN_FAILED", detail: `STATE_LIB_FAILED: ${err?.message ?? "unknown"}` },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}
