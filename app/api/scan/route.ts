// app/api/scan/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RawItem = Record<string, any>;

export type ScanAsset = {
  symbol: string;
  name: string;
  price: number;
  chg_24h_pct: number;
  confidence_score: number; // 0..100
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

function getBaseUrl(req: Request): string {
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}

function buildBinanceUrl(symbol: string): string {
  return `https://www.binance.com/en/trade/${encodeURIComponent(symbol)}?_from=markets`;
}

function buildAffiliateUrl(binanceUrl: string, symbol: string): string {
  // Option A: lien affiliate complet
  const base = process.env.BINANCE_AFFILIATE_BASE?.trim();
  if (base) {
    const u = new URL(base);
    u.searchParams.set("utm_source", "zilkara");
    u.searchParams.set("utm_medium", "app");
    u.searchParams.set("utm_campaign", "scan");
    u.searchParams.set("symbol", symbol);
    return u.toString();
  }

  // Option B: ref code
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

function pickFirstDefined<T>(...vals: T[]): T | undefined {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== ("" as any)) return v;
  }
  return undefined;
}

function normalize(item: RawItem): ScanAsset | null {
  // ✅ tolère des clés alternatives venant du backend
  const symbol = toStr(
    pickFirstDefined(item.symbol, item.ticker, item.pair)
  ).trim().toUpperCase();

  if (!symbol) return null;

  const name = toStr(
    pickFirstDefined(item.name, item.asset_name, item.base_name, item.fullname)
  ).trim() || symbol;

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

  const regime = toStr(
    pickFirstDefined(item.regime, item.market_regime, item.context_regime)
  ).trim() || "UNKNOWN";

  const binance_url =
    toStr(pickFirstDefined(item.binance_url, item.url, item.trade_url)).trim() ||
    buildBinanceUrl(symbol);

  // ✅ supporte aussi binance_affiliate_url si tu l’utilises ailleurs
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

async function fetchState(req: Request): Promise<RawItem[]> {
  // Source officielle interne (stable)
  const statePath = process.env.SCAN_STATE_PATH?.trim() || "/api/state";
  const baseUrl = getBaseUrl(req);

  const url = `${baseUrl}${statePath.startsWith("/") ? "" : "/"}${statePath}`;

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`STATE_FETCH_FAILED ${res.status} ${t.slice(0, 200)}`);
  }

  const data = await res.json().catch(() => null);

  if (Array.isArray(data)) return data as RawItem[];
  if (Array.isArray((data as any)?.items)) return (data as any).items as RawItem[];
  if (Array.isArray((data as any)?.assets)) return (data as any).assets as RawItem[];
  return [];
}

export async function GET(req: Request) {
  try {
    const raw = await fetchState(req);

    const mapped = raw.map(normalize).filter(Boolean) as ScanAsset[];

    // ✅ tri verrouillé côté API
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
    return NextResponse.json(
      {
        ok: false,
        error: "SCAN_FAILED",
        detail: toStr(err?.message || "SCAN_FAILED"),
      },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}
