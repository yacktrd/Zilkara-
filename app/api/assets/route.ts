// app/api/assets/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  enforceApiPolicy,
  applyApiAuthHeaders,
  buildApiKeyErrorResponse,
} from "@/lib/xyvala/auth";
import {
  trackUsage,
  applyQuotaHeaders,
} from "@/lib/xyvala/usage";
import {
  scanKey,
  getFromCache,
  setToCache,
  isScanSnapshot,
  type ScanSnapshot,
  type ScanAsset,
  type Quote,
} from "@/lib/xyvala/snapshot";
import { xyvalaServerFetch } from "@/lib/xyvala/server-client";
import type { JsonRecord, JsonValue } from "@/lib/xyvala/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const XYVALA_VERSION = "v1";

const SNAPSHOT_TTL_MS = 45_000;
const ASSETS_CACHE_TTL_MS = 30_000;
const SCAN_SELF_HEAL_TIMEOUT_MS = 8_000;
const MAX_MEM_CACHE_ENTRIES = 250;

const DEFAULT_MARKET = "crypto";
const DEFAULT_QUOTE: Quote = "usd";
const DEFAULT_SORT: SortKey = "score";
const DEFAULT_ORDER: SortOrder = "desc";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const CANONICAL_SCAN_LIMIT = 250;

type Market = "crypto" | string;
type SortKey = "score" | "price";
type SortOrder = "asc" | "desc";

type AuthResult = ReturnType<typeof enforceApiPolicy>;
type AuthSuccess = Extract<AuthResult, { ok: true }>;
type UsageResult = ReturnType<typeof trackUsage> | null;

export type AssetsItem = {
  id: string;
  symbol: string;
  name: string;
  price: number | null;
  chg_24h_pct: number | null;
  confidence_score: number | null;
  regime: ScanAsset["regime"] | null;
  binance_url: string;
  affiliate_url?: string;
};

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

type ScanRouteResponse = JsonRecord & {
  ok?: boolean;
  ts?: string;
  version?: string;
  source?: string;
  market?: string;
  quote?: string;
  count?: number;
  data?: JsonValue[];
  context?: ScanSnapshot["context"];
  meta?: {
    limit?: number;
    sort?: string;
    order?: string;
    q?: string | null;
    warnings?: string[];
  };
  error?: string | null;
};

type CacheEntry = {
  ts: number;
  value: AssetsResponse;
};

const mem = new Map<string, CacheEntry>();

const nowIso = (): string => new Date().toISOString();

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeLower(value: unknown): string {
  return safeStr(value).toLowerCase();
}

function safeFiniteNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function uniqueWarnings(...groups: Array<string[] | undefined | null>): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [...new Set(merged.filter((item) => typeof item === "string" && item.trim().length > 0))];
}

function normalizeMarket(value: string | null): Market {
  const market = safeLower(value);
  return market || DEFAULT_MARKET;
}

function normalizeQuote(value: string | null | undefined): Quote {
  const quote = safeLower(value);
  if (quote === "eur") return "eur";
  if (quote === "usdt") return "usdt";
  return "usd";
}

function normalizeSort(value: string | null): SortKey {
  return safeLower(value) === "price" ? "price" : "score";
}

function normalizeOrder(value: string | null): SortOrder {
  return safeLower(value) === "asc" ? "asc" : "desc";
}

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return clamp(Math.trunc(parsed), 1, MAX_LIMIT);
}

function parseCursor(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.trunc(parsed);
}

function parseBool(value: string | null): boolean {
  const s = safeLower(value);
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function buildAssetsCacheKey(input: {
  version: string;
  market: string;
  quote: string;
  q: string | null;
  sort: SortKey;
  order: SortOrder;
  limit: number;
  cursor: number;
}): string {
  return [
    "xyvala:assets",
    input.version,
    `market=${input.market}`,
    `quote=${input.quote}`,
    `q=${input.q ?? ""}`,
    `sort=${input.sort}`,
    `order=${input.order}`,
    `limit=${input.limit}`,
    `cursor=${input.cursor}`,
  ].join(":");
}

function buildCanonicalScanKey(quote: Quote): string {
  return scanKey({
    version: XYVALA_VERSION,
    market: DEFAULT_MARKET,
    quote,
    sort: "score",
    order: "desc",
    limit: CANONICAL_SCAN_LIMIT,
    q: null,
  });
}

function getAssetsCache(key: string, ttlMs: number): AssetsResponse | null {
  const entry = mem.get(key);
  if (!entry) return null;

  if (Date.now() - entry.ts > ttlMs) {
    mem.delete(key);
    return null;
  }

  return entry.value;
}

function pruneAssetsCache(): void {
  if (mem.size < MAX_MEM_CACHE_ENTRIES) return;

  const firstKey = mem.keys().next().value;
  if (typeof firstKey === "string") {
    mem.delete(firstKey);
  }
}

function setAssetsCache(key: string, value: AssetsResponse): void {
  pruneAssetsCache();
  mem.set(key, {
    ts: Date.now(),
    value,
  });
}

function buildBinanceUrl(symbol: string, quote: Quote): string {
  const normalizedQuote = quote === "usd" ? "usdt" : quote;
  const pair = `${symbol.toUpperCase()}${normalizedQuote.toUpperCase()}`;
  return `https://www.binance.com/en/trade/${encodeURIComponent(pair)}`;
}

function buildAffiliateUrl(binanceUrl: string): string {
  const ref = safeStr(process.env.BINANCE_REF);
  if (!ref) return binanceUrl;
  return `${binanceUrl}?ref=${encodeURIComponent(ref)}`;
}

function fallbackAssets(quote: Quote): AssetsItem[] {
  const base = [
    {
      id: "usdt",
      symbol: "USDT",
      name: "Tether",
      price: 1.0,
      chg_24h_pct: 0.02,
      confidence_score: 95,
      regime: "STABLE" as const,
    },
    {
      id: "usdc",
      symbol: "USDC",
      name: "USDC",
      price: 1.0,
      chg_24h_pct: 0.01,
      confidence_score: 89,
      regime: "STABLE" as const,
    },
    {
      id: "dai",
      symbol: "DAI",
      name: "Dai",
      price: 1.0,
      chg_24h_pct: -0.01,
      confidence_score: 74,
      regime: "STABLE" as const,
    },
    {
      id: "xaut",
      symbol: "XAUT",
      name: "Tether Gold",
      price: 5000,
      chg_24h_pct: 0.08,
      confidence_score: 75,
      regime: "STABLE" as const,
    },
    {
      id: "paxg",
      symbol: "PAXG",
      name: "PAX Gold",
      price: 5100,
      chg_24h_pct: 0.1,
      confidence_score: 75,
      regime: "STABLE" as const,
    },
    {
      id: "btc",
      symbol: "BTC",
      name: "Bitcoin",
      price: 64000,
      chg_24h_pct: 0.3,
      confidence_score: 98,
      regime: "TRANSITION" as const,
    },
  ] as const;

  return base.map((asset) => {
    const binanceUrl = buildBinanceUrl(asset.symbol, quote);

    return {
      ...asset,
      binance_url: binanceUrl,
      affiliate_url: buildAffiliateUrl(binanceUrl),
    };
  });
}

function toAssetsItem(asset: ScanAsset, quote: Quote): AssetsItem {
  const symbol = safeStr(asset.symbol) || "UNKNOWN";
  const fallbackBinanceUrl = buildBinanceUrl(symbol, quote);

  const binanceUrl = safeStr(asset.binance_url) || fallbackBinanceUrl;
  const affiliateUrl = safeStr(asset.affiliate_url) || buildAffiliateUrl(binanceUrl);

  return {
    id: safeStr(asset.id) || symbol.toLowerCase(),
    symbol,
    name: safeStr(asset.name) || symbol,
    price: safeFiniteNumberOrNull(asset.price),
    chg_24h_pct: safeFiniteNumberOrNull(asset.chg_24h_pct),
    confidence_score: safeFiniteNumberOrNull(asset.confidence_score),
    regime: asset.regime ?? null,
    binance_url: binanceUrl,
    affiliate_url: affiliateUrl,
  };
}

function applySearch(list: AssetsItem[], q: string | null): AssetsItem[] {
  if (!q) return list;

  const needle = q.toLowerCase();

  return list.filter((asset) => {
    return (
      asset.symbol.toLowerCase().includes(needle) ||
      asset.name.toLowerCase().includes(needle) ||
      asset.id.toLowerCase().includes(needle)
    );
  });
}

function sortAssets(list: AssetsItem[], sort: SortKey, order: SortOrder): void {
  const direction = order === "asc" ? 1 : -1;

  const getSortValue = (asset: AssetsItem): number | null => {
    const value = sort === "price" ? asset.price : asset.confidence_score;
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  };

  const tieBreak = (a: AssetsItem, b: AssetsItem): number => {
    const aScore =
      typeof a.confidence_score === "number" && Number.isFinite(a.confidence_score)
        ? a.confidence_score
        : -Infinity;

    const bScore =
      typeof b.confidence_score === "number" && Number.isFinite(b.confidence_score)
        ? b.confidence_score
        : -Infinity;

    if (aScore !== bScore) {
      return bScore - aScore;
    }

    return a.symbol.localeCompare(b.symbol);
  };

  list.sort((a, b) => {
    const aValue = getSortValue(a);
    const bValue = getSortValue(b);

    const aHas = aValue !== null;
    const bHas = bValue !== null;

    if (aHas !== bHas) return aHas ? -1 : 1;
    if (!aHas && !bHas) return tieBreak(a, b);

    if (aHas && bHas && aValue !== bValue) {
      return (aValue - bValue) * direction;
    }

    return tieBreak(a, b);
  });
}

function paginate(list: AssetsItem[], cursor: number, limit: number): {
  data: AssetsItem[];
  total: number;
  nextCursor: string | null;
} {
  const start = Math.max(0, cursor);
  const end = Math.min(list.length, start + limit);

  return {
    data: list.slice(start, end),
    total: list.length,
    nextCursor: end < list.length ? String(end) : null,
  };
}

function isScanAssetArray(value: JsonValue[] | undefined): value is ScanAsset[] {
  return Array.isArray(value);
}

function normalizeScanSnapshot(input: ScanRouteResponse): ScanSnapshot | null {
  if (!input?.ok) return null;
  if (!Array.isArray(input.data)) return null;
  if (!input.context) return null;
  if (!isScanAssetArray(input.data)) return null;

  const candidate: ScanSnapshot = {
    ok: true,
    ts: safeStr(input.ts) || nowIso(),
    version: safeStr(input.version) || XYVALA_VERSION,
    source:
      input.source === "cache" || input.source === "fallback"
        ? input.source
        : "scan",
    market: safeStr(input.market) || DEFAULT_MARKET,
    quote: normalizeQuote(input.quote),
    count:
      typeof input.count === "number" && Number.isFinite(input.count)
        ? Math.max(0, Math.trunc(input.count))
        : input.data.length,
    data: input.data,
    context: input.context,
    meta: {
      limit:
        typeof input.meta?.limit === "number" && Number.isFinite(input.meta.limit)
          ? Math.max(1, Math.trunc(input.meta.limit))
          : CANONICAL_SCAN_LIMIT,
      sort: normalizeSort(typeof input.meta?.sort === "string" ? input.meta.sort : null),
      order: normalizeOrder(typeof input.meta?.order === "string" ? input.meta.order : null),
      q: typeof input.meta?.q === "string" ? input.meta.q : null,
      warnings: Array.isArray(input.meta?.warnings) ? input.meta.warnings : [],
    },
  };

  return isScanSnapshot(candidate) ? candidate : null;
}

async function loadCanonicalSnapshot(input: {
  quote: Quote;
}): Promise<{
  snapshot: ScanSnapshot | null;
  source: "scan" | "fallback";
  warnings: string[];
}> {
  const warnings: string[] = [];
  const key = buildCanonicalScanKey(input.quote);

  try {
    const cached = getFromCache<ScanSnapshot>(key, SNAPSHOT_TTL_MS);

    if (cached && isScanSnapshot(cached) && cached.data.length > 0) {
      return {
        snapshot: cached,
        source: "scan",
        warnings,
      };
    }

    if (cached && isScanSnapshot(cached) && cached.data.length === 0) {
      warnings.push("scan_snapshot_empty");
    } else {
      warnings.push("scan_snapshot_missing");
    }
  } catch (error) {
    warnings.push(
      error instanceof Error && error.message
        ? `scan_snapshot_read_failed:${error.message}`
        : "scan_snapshot_read_failed"
    );
  }

  const rebuilt = await xyvalaServerFetch<ScanRouteResponse>("/api/scan", {
    searchParams: {
      quote: input.quote,
      sort: "score",
      order: "desc",
      limit: CANONICAL_SCAN_LIMIT,
      noStore: 1,
    },
    timeoutMs: SCAN_SELF_HEAL_TIMEOUT_MS,
  });

  if (!rebuilt.ok || !rebuilt.data) {
    return {
      snapshot: null,
      source: "fallback",
      warnings: uniqueWarnings(
        warnings,
        rebuilt.warnings,
        [
          rebuilt.error
            ? `scan_self_heal_failed:${rebuilt.error}`
            : "scan_self_heal_failed",
        ]
      ),
    };
  }

  const snapshot = normalizeScanSnapshot(rebuilt.data);

  if (!snapshot) {
    return {
      snapshot: null,
      source: "fallback",
      warnings: uniqueWarnings(
        warnings,
        rebuilt.warnings,
        ["scan_self_heal_invalid_shape"]
      ),
    };
  }

  try {
    setToCache(key, snapshot);
  } catch (error) {
    warnings.push(
      error instanceof Error && error.message
        ? `scan_snapshot_write_failed:${error.message}`
        : "scan_snapshot_write_failed"
    );
  }

  return {
    snapshot,
    source: "scan",
    warnings: uniqueWarnings(warnings, rebuilt.warnings, ["scan_self_heal_ok"]),
  };
}

function buildResponse(
  input: Partial<AssetsResponse> & Pick<AssetsResponse, "ts">
): AssetsResponse {
  return {
    ok: Boolean(input.ok),
    ts: input.ts,
    version: input.version ?? XYVALA_VERSION,
    source: input.source ?? "fallback",
    market: input.market ?? DEFAULT_MARKET,
    quote: input.quote ?? DEFAULT_QUOTE,
    count: input.count ?? 0,
    total: input.total ?? 0,
    data: input.data ?? [],
    meta: {
      q: input.meta?.q ?? null,
      sort: input.meta?.sort ?? DEFAULT_SORT,
      order: input.meta?.order ?? DEFAULT_ORDER,
      limit: input.meta?.limit ?? 0,
      cursor: input.meta?.cursor ?? null,
      next_cursor: input.meta?.next_cursor ?? null,
      cache: input.meta?.cache ?? "no-store",
      warnings: input.meta?.warnings ?? [],
    },
    error: input.error ?? null,
  };
}

function respond(
  payload: AssetsResponse,
  status: number,
  auth: AuthSuccess,
  usage: UsageResult
): NextResponse {
  let res: NextResponse = NextResponse.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-xyvala-version": XYVALA_VERSION,
      "x-xyvala-cache": payload.meta.cache,
    },
  });

  res = applyApiAuthHeaders(res, auth);

  if (usage) {
    res = applyQuotaHeaders(res, usage);
  }

  return res;
}

export async function GET(req: NextRequest) {
  const ts = nowIso();
  const auth = enforceApiPolicy(req);

  if (!auth.ok) {
    return buildApiKeyErrorResponse(auth.error, auth.status);
  }

  let usage: UsageResult = null;
  let usageWarnings: string[] = [];

  try {
    usage = trackUsage({
      key: auth.key,
      keyType: auth.keyType,
      endpoint: "/api/assets",
      planOverride: auth.plan,
    });
  } catch (error) {
    usageWarnings = uniqueWarnings([
      error instanceof Error && error.message
        ? `usage_track_failed:${error.message}`
        : "usage_track_failed",
    ]);
  }

  try {
    const sp = req.nextUrl.searchParams;

    const requestedMarket = normalizeMarket(sp.get("market"));
    const market = DEFAULT_MARKET;
    const quote = normalizeQuote(sp.get("quote"));
    const q = safeStr(sp.get("q")) || null;
    const sort = normalizeSort(sp.get("sort"));
    const order = normalizeOrder(sp.get("order"));
    const limit = parseLimit(sp.get("limit"));
    const cursor = parseCursor(sp.get("cursor"));
    const noStore = parseBool(sp.get("noStore"));

    let requestWarnings = uniqueWarnings(
      usageWarnings,
      requestedMarket !== DEFAULT_MARKET ? ["unsupported_market_forced_crypto"] : []
    );

    const cacheKey = buildAssetsCacheKey({
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
      const cached = getAssetsCache(cacheKey, ASSETS_CACHE_TTL_MS);

      if (cached) {
        const payload = buildResponse({
          ...cached,
          ts,
          source: "cache",
          meta: {
            ...cached.meta,
            cache: "hit",
            warnings: uniqueWarnings(cached.meta.warnings, requestWarnings),
          },
        });

        return respond(payload, 200, auth, usage);
      }
    }

    const snapshotResult = await loadCanonicalSnapshot({ quote });
    requestWarnings = uniqueWarnings(requestWarnings, snapshotResult.warnings);

    let source: AssetsResponse["source"] = "scan";
    let items: AssetsItem[] = [];

    if (
      !snapshotResult.snapshot ||
      !Array.isArray(snapshotResult.snapshot.data) ||
      snapshotResult.snapshot.data.length === 0
    ) {
      source = "fallback";
      requestWarnings = uniqueWarnings(requestWarnings, ["assets_fallback_used"]);
      items = fallbackAssets(quote);
    } else {
      source = "scan";
      items = snapshotResult.snapshot.data.map((asset) => toAssetsItem(asset, quote));
    }

    const searched = applySearch(items, q);
    sortAssets(searched, sort, order);
    const page = paginate(searched, cursor, limit);

    const payload = buildResponse({
      ok: true,
      ts,
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
        next_cursor: page.nextCursor,
        cache: noStore ? "no-store" : "miss",
        warnings: requestWarnings,
      },
      error: null,
    });

    if (!noStore) {
      setAssetsCache(cacheKey, payload);
    }

    return respond(payload, 200, auth, usage);
  } catch (error) {
    const payload = buildResponse({
      ok: false,
      ts,
      source: "fallback",
      market: DEFAULT_MARKET,
      quote: DEFAULT_QUOTE,
      count: 0,
      total: 0,
      data: [],
      meta: {
        q: null,
        sort: DEFAULT_SORT,
        order: DEFAULT_ORDER,
        limit: 0,
        cursor: null,
        next_cursor: null,
        cache: "no-store",
        warnings: uniqueWarnings(
          usageWarnings,
          [
            error instanceof Error && error.message
              ? `route_exception:${error.message}`
              : "route_exception",
          ]
        ),
      },
      error:
        error instanceof Error && error.message
          ? error.message
          : "unknown_error",
    });

    return respond(payload, 500, auth, usage);
  }
}
