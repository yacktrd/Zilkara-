// app/api/assets/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  enforceApiPolicy,
  applyApiAuthHeaders,
  buildApiKeyErrorResponse,
} from "@/lib/xyvala/auth";
import { trackUsage } from "@/lib/xyvala/usage";
import {
  scanKey,
  getFromCache,
  type ScanSnapshot,
  type ScanAsset,
  type Quote,
} from "@/lib/xyvala/snapshot";

/**
 * XYVALA — /api/assets (V2 robuste)
 *
 * But :
 * - Endpoint d’adoption : liste, recherche, tri, pagination
 * - Compatible avec l’architecture SaaS actuelle
 * - S’appuie sur le snapshot canonique de /api/scan
 * - Shape stable, simple, monétisable
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XYVALA_VERSION = "v1";
const SNAPSHOT_TTL_MS = 45_000;
const ASSETS_TTL_MS = 30_000;

/* ----------------------------- Types (contrat) ---------------------------- */

type Market = "crypto" | string;
type SortKey = "score" | "price";
type SortOrder = "asc" | "desc";

export type AssetsItem = Pick<
  ScanAsset,
  | "id"
  | "symbol"
  | "name"
  | "price"
  | "chg_24h_pct"
  | "confidence_score"
  | "regime"
  | "binance_url"
  | "affiliate_url"
>;

export type AssetsResponse = {
  ok: boolean;
  ts: string;
  version: string;

  source: "scan" | "fallback" | "cache";
  market: Market;
  quote: Quote;

  count: number;
  total: number;
  data: AssetsItem[];

  meta: {
    q: string | null;
    sort: SortKey;
    order: SortOrder;
    limit: number;
    cursor: string | null;
    next_cursor: string | null;
    cache: "hit" | "miss" | "no-store";
    warnings: string[];
  };

  error: string | null;
};

/* -------------------------------- Utilities ------------------------------ */

const NOW_ISO = () => new Date().toISOString();

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeStr(v: unknown): string | null {
  return typeof v === "string" && v.trim().length ? v.trim() : null;
}

function normalizeMarket(m: string | null): Market {
  return m && m.trim() ? m.trim().toLowerCase() : "crypto";
}

function normalizeQuote(q: string | null): Quote {
  const v = (q && q.trim() ? q.trim() : "usd").toLowerCase();
  if (v === "usd" || v === "usdt" || v === "eur") return v;
  return "usd";
}

function normalizeSort(s: string | null): SortKey {
  const v = (s && s.trim() ? s.trim() : "score").toLowerCase();
  return v === "price" ? "price" : "score";
}

function normalizeOrder(o: string | null): SortOrder {
  const v = (o && o.trim() ? o.trim() : "desc").toLowerCase();
  return v === "asc" ? "asc" : "desc";
}

function parseLimit(v: string | null): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 50;
  return clamp(Math.trunc(n), 1, 200);
}

function parseCursor(v: string | null): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.trunc(n);
}

function parseBool(v: string | null): boolean {
  const s = (v || "").toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

/* --------------------------- Cache best-effort ---------------------------- */

type CacheEntry = {
  ts: number;
  value: AssetsResponse;
};

const mem = new Map<string, CacheEntry>();

function assetsKey(opts: {
  version: string;
  market: string;
  quote: string;
  q: string | null;
  sort: SortKey;
  order: SortOrder;
  limit: number;
  cursor: number;
}) {
  return `xyvala:assets:${opts.version}:market=${opts.market}:quote=${opts.quote}:q=${opts.q ?? ""}:sort=${opts.sort}:order=${opts.order}:limit=${opts.limit}:cursor=${opts.cursor}`;
}

function getAssetsCache(k: string, ttlMs: number): AssetsResponse | null {
  const e = mem.get(k);
  if (!e) return null;

  if (Date.now() - e.ts > ttlMs) {
    mem.delete(k);
    return null;
  }

  return e.value;
}

function setAssetsCache(k: string, v: AssetsResponse) {
  mem.set(k, { ts: Date.now(), value: v });
}

/* ----------------------------- Fallback stable ---------------------------- */

function buildBinanceUrl(symbol: string, quote: Quote) {
  const q = quote === "usd" ? "usdt" : quote;
  const pair = `${symbol.toUpperCase()}${String(q).toUpperCase()}`;
  return `https://www.binance.com/en/trade/${encodeURIComponent(pair)}`;
}

function buildAffiliateUrl(binanceUrl: string) {
  const ref = process.env.BINANCE_REF?.trim();
  if (!ref) return binanceUrl;
  return `${binanceUrl}?ref=${encodeURIComponent(ref)}`;
}

function fallbackAssets(quote: Quote): AssetsItem[] {
  const base = [
    { id: "usdt", symbol: "USDT", name: "Tether", price: 1.0, chg_24h_pct: 0.02, confidence_score: 95, regime: "STABLE" },
    { id: "usdc", symbol: "USDC", name: "USDC", price: 1.0, chg_24h_pct: 0.01, confidence_score: 89, regime: "STABLE" },
    { id: "dai", symbol: "DAI", name: "Dai", price: 1.0, chg_24h_pct: -0.01, confidence_score: 74, regime: "STABLE" },
    { id: "xaut", symbol: "XAUT", name: "Tether Gold", price: 5000, chg_24h_pct: 0.08, confidence_score: 75, regime: "STABLE" },
    { id: "paxg", symbol: "PAXG", name: "PAX Gold", price: 5100, chg_24h_pct: 0.1, confidence_score: 75, regime: "STABLE" },
    { id: "btc", symbol: "BTC", name: "Bitcoin", price: 64000, chg_24h_pct: 0.3, confidence_score: 98, regime: "TRANSITION" },
  ];

  return base.map((a) => {
    const binance_url = buildBinanceUrl(a.symbol, quote);
    return {
      ...a,
      binance_url,
      affiliate_url: buildAffiliateUrl(binance_url),
    } as AssetsItem;
  });
}

/* ------------------------------ Core logic -------------------------------- */

function toAssetsItem(a: ScanAsset): AssetsItem {
  const binance_url =
    a.binance_url && a.binance_url.trim().length
      ? a.binance_url
      : "https://www.binance.com/en/markets";

  const affiliate_url =
    a.affiliate_url && a.affiliate_url.trim().length
      ? a.affiliate_url
      : binance_url;

  return {
    id: a.id,
    symbol: a.symbol,
    name: a.name,
    price: a.price,
    chg_24h_pct: a.chg_24h_pct,
    confidence_score: a.confidence_score,
    regime: a.regime,
    binance_url,
    affiliate_url,
  };
}

function applySearch(list: AssetsItem[], q: string | null) {
  if (!q) return list;
  const s = q.toLowerCase();
  return list.filter(
    (a) =>
      a.symbol.toLowerCase().includes(s) ||
      a.name.toLowerCase().includes(s)
  );
}

function sortAssets(list: AssetsItem[], sort: SortKey, order: SortOrder) {
  const dir = order === "asc" ? 1 : -1;

  const getVal = (a: AssetsItem) => {
    const v = sort === "price" ? a.price : a.confidence_score;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };

  const tie = (a: AssetsItem, b: AssetsItem) => {
    const as = typeof a.confidence_score === "number" ? a.confidence_score : -Infinity;
    const bs = typeof b.confidence_score === "number" ? b.confidence_score : -Infinity;
    if (as !== bs) return bs - as;
    return a.symbol.localeCompare(b.symbol);
  };

  list.sort((a, b) => {
    const av = getVal(a);
    const bv = getVal(b);

    const aHas = av !== null;
    const bHas = bv !== null;

    if (aHas !== bHas) return aHas ? -1 : 1;
    if (!aHas && !bHas) return tie(a, b);

    if (av !== bv) return ((av as number) - (bv as number)) * dir;
    return tie(a, b);
  });
}

function paginate(list: AssetsItem[], cursor: number, limit: number) {
  const start = Math.max(0, cursor);
  const end = Math.min(list.length, start + limit);
  const data = list.slice(start, end);
  const next_cursor = end < list.length ? String(end) : null;

  return {
    data,
    total: list.length,
    next_cursor,
  };
}

/* --------------------------------- Handler -------------------------------- */

export async function GET(req: NextRequest) {
  const ts = NOW_ISO();
  const warnings: string[] = [];

  const auth = enforceApiPolicy(req);

  if (!auth.ok) {
    return buildApiKeyErrorResponse(auth.error, auth.status);
  }

  await trackUsage({
    apiKey: auth.key,
    endpoint: "/api/assets",
  });

  try {
    const sp = req.nextUrl.searchParams;

    const market = normalizeMarket(sp.get("market"));
    const quote = normalizeQuote(sp.get("quote"));
    const q = safeStr(sp.get("q"))?.toLowerCase() ?? null;

    const sort = normalizeSort(sp.get("sort"));
    const order = normalizeOrder(sp.get("order"));
    const limit = parseLimit(sp.get("limit"));
    const cursor = parseCursor(sp.get("cursor"));
    const noStore = parseBool(sp.get("noStore"));

    const k = assetsKey({
      version: XYVALA_VERSION,
      market,
      quote,
      q,
      sort,
      order,
      limit,
      cursor,
    });

    if (!noStore) {
      const hit = getAssetsCache(k, ASSETS_TTL_MS);
      if (hit) {
        const res: AssetsResponse = {
          ...hit,
          ts,
          source: "cache",
          meta: {
            ...hit.meta,
            cache: "hit",
          },
        };

        return applyApiAuthHeaders(
          NextResponse.json(res, {
            status: 200,
            headers: {
              "cache-control": "no-store",
              "x-xyvala-version": XYVALA_VERSION,
              "x-xyvala-cache": "hit",
            },
          }),
          auth
        );
      }
    }

    const scan_cache_key = scanKey({
      version: XYVALA_VERSION,
      market: "crypto",
      quote,
      sort: "score",
      order: "desc",
      limit: 250,
      q: null,
    });

    const snapshot = await getFromCache<ScanSnapshot>(scan_cache_key, SNAPSHOT_TTL_MS);
    let source: AssetsResponse["source"] = "scan";
    let items: AssetsItem[] = [];

    if (!snapshot || !Array.isArray(snapshot.data) || snapshot.data.length === 0) {
      source = "fallback";
      warnings.push("scan_snapshot_missing_fallback_assets");
      items = fallbackAssets(quote);
    } else {
      items = snapshot.data.map(toAssetsItem);
    }

    const searched = applySearch(items, q);
    sortAssets(searched, sort, order);
    const page = paginate(searched, cursor, limit);

    const res: AssetsResponse = {
      ok: true,
      ts,
      version: XYVALA_VERSION,

      source,
      market,
      quote,

      count: page.data.length,
      total: page.total,
      data: page.data,

      meta: {
        q,
        sort,
        order,
        limit,
        cursor: String(cursor),
        next_cursor: page.next_cursor,
        cache: noStore ? "no-store" : "miss",
        warnings,
      },

      error: null,
    };

    if (!noStore) {
      setAssetsCache(k, res);
    }

    return applyApiAuthHeaders(
      NextResponse.json(res, {
        status: 200,
        headers: {
          "cache-control": "no-store",
          "x-xyvala-version": XYVALA_VERSION,
          "x-xyvala-cache": noStore ? "no-store" : "miss",
        },
      }),
      auth
    );
  } catch (e: any) {
    const res: AssetsResponse = {
      ok: false,
      ts,
      version: XYVALA_VERSION,
      source: "fallback",
      market: "crypto",
      quote: "usd",
      count: 0,
      total: 0,
      data: [],
      meta: {
        q: null,
        sort: "score",
        order: "desc",
        limit: 0,
        cursor: null,
        next_cursor: null,
        cache: "no-store",
        warnings: ["route_exception"],
      },
      error: e?.message ? String(e.message) : "unknown_error",
    };

    return applyApiAuthHeaders(
      NextResponse.json(res, {
        status: 500,
        headers: {
          "cache-control": "no-store",
          "x-xyvala-version": XYVALA_VERSION,
        },
      }),
      auth
    );
  }
}
