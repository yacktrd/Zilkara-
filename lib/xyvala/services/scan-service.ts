// lib/xyvala/services/scan-service.ts


import {
  getFromCache,
  isScanSnapshot,
  scanKey,
  type Quote,
  type ScanSnapshot,
} from "@/lib/xyvala/snapshot";
import { normalizeSnapshotData as normalizeLegacySnapshotData } from "@/lib/xyvala/adapters/snapshot-adapter";
import type { ScanAsset, Regime } from "@/lib/xyvala/contracts/scan-contract";

const XYVALA_VERSION = "v1";

const DEFAULT_MARKET = "crypto";
const DEFAULT_QUOTE: Quote = "usd";
const DEFAULT_SORT = "score_desc";
const DEFAULT_LIMIT = 100;

const SNAPSHOT_TTL_MS = 45_000;
const SCAN_CACHE_TTL_MS = 15_000;
const CANONICAL_LIMIT = 250;
const MAX_LIMIT = 250;

type SortKey = "score" | "price";
type SortOrder = "asc" | "desc";

export type ScanServiceInput = {
  quote?: Quote | string | null;
  sort?: string | null;
  limit?: number | string | null;
  q?: string | null;
  noStore?: boolean;
};

export type ScanServiceItem = ScanAsset & {
  affiliate_url: string;
};

export type ScanServiceResult = {
  ok: boolean;
  ts: string;
  version: string;
  source: "scan_cache" | "scan_snapshot" | "fallback";
  market: string;
  quote: Quote;
  count: number;
  data: ScanServiceItem[];
  error: string | null;
  warnings: string[];
  meta: {
    q: string | null;
    sort: string;
    limit: number;
  };
};

type ScanCacheEntry = {
  ts: number;
  value: ScanServiceResult;
};

const mem = new Map<string, ScanCacheEntry>();

function nowIso(): string {
  return new Date().toISOString();
}

function nowMs(): number {
  return Date.now();
}

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeLower(value: unknown): string {
  return safeStr(value).toLowerCase();
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function uniqueWarnings(...groups: Array<string[] | undefined | null>): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [...new Set(merged.filter((item) => typeof item === "string" && item.trim().length > 0))];
}

function normalizeQuote(value: unknown): Quote {
  const quote = safeLower(value);

  if (quote === "eur") return "eur";
  if (quote === "usdt") return "usdt";

  return DEFAULT_QUOTE;
}

function normalizeSort(value: unknown): {
  sortKey: SortKey;
  sortLabel: string;
  order: SortOrder;
} {
  const s = safeLower(value);

  if (s === "price" || s === "price_desc") {
    return { sortKey: "price", sortLabel: "price_desc", order: "desc" };
  }

  if (s === "price_asc") {
    return { sortKey: "price", sortLabel: "price_asc", order: "asc" };
  }

  if (s === "score_asc") {
    return { sortKey: "score", sortLabel: "score_asc", order: "asc" };
  }

  return {
    sortKey: "score",
    sortLabel: DEFAULT_SORT,
    order: "desc",
  };
}

function parseLimit(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : DEFAULT_LIMIT;

  if (!Number.isFinite(n)) return DEFAULT_LIMIT;

  return clamp(Math.trunc(n), 1, MAX_LIMIT);
}

function normalizeSearch(value: unknown): string | null {
  const q = safeStr(value).toLowerCase();
  return q || null;
}

function normalizeRegime(value: unknown): Regime {
  const regime = safeStr(value).toUpperCase();

  if (regime === "STABLE") return "STABLE";
  if (regime === "TRANSITION") return "TRANSITION";
  if (regime === "VOLATILE") return "VOLATILE";

  return "TRANSITION";
}

function buildCanonicalSnapshotKey(quote: Quote): string {
  return scanKey({
    version: XYVALA_VERSION,
    market: DEFAULT_MARKET,
    quote,
    sort: "score",
    order: "desc",
    limit: CANONICAL_LIMIT,
    q: null,
  });
}

function buildScanServiceCacheKey(input: {
  quote: Quote;
  sort: string;
  limit: number;
  q: string | null;
}): string {
  return [
    "xyvala:scan-service",
    XYVALA_VERSION,
    `quote=${input.quote}`,
    `sort=${input.sort}`,
    `limit=${input.limit}`,
    `q=${input.q ?? ""}`,
  ].join(":");
}

function getScanMemCache(key: string, ttlMs: number): ScanServiceResult | null {
  const entry = mem.get(key);

  if (!entry) return null;

  if (nowMs() - entry.ts > ttlMs) {
    mem.delete(key);
    return null;
  }

  return entry.value;
}

function setScanMemCache(key: string, value: ScanServiceResult): void {
  mem.set(key, {
    ts: nowMs(),
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

function toScanServiceItem(asset: ScanAsset, quote: Quote): ScanServiceItem {
  const symbol = safeStr(asset.symbol) || "UNKNOWN";
  const binanceUrl = safeStr(asset.binance_url) || buildBinanceUrl(symbol, quote);

  return {
    ...asset,
    id: safeStr(asset.id) || symbol.toLowerCase(),
    symbol,
    name: safeStr(asset.name) || symbol,
    price: safeNumber(asset.price, 0),
    chg_24h_pct: safeNumber(asset.chg_24h_pct, 0),
    confidence_score: safeNumber(asset.confidence_score, 0),
    regime: normalizeRegime(asset.regime),
    market_cap: safeOptionalNumber(asset.market_cap),
    volume_24h: safeOptionalNumber(asset.volume_24h),
    binance_url: binanceUrl,
    affiliate_url: buildAffiliateUrl(binanceUrl),
  };
}

function normalizeSnapshotItems(snapshot: ScanSnapshot, quote: Quote): ScanServiceItem[] {
  if (!Array.isArray(snapshot.data) || snapshot.data.length === 0) {
    return [];
  }

  const normalizedAssets = normalizeLegacySnapshotData(snapshot.data);
  return normalizedAssets.map((asset) => toScanServiceItem(asset, quote));
}

function applySearch(list: ScanServiceItem[], q: string | null): ScanServiceItem[] {
  if (!q) return list;

  return list.filter((asset) => {
    const symbol = safeLower(asset.symbol);
    const name = safeLower(asset.name);
    const id = safeLower(asset.id);

    return symbol.includes(q) || name.includes(q) || id.includes(q);
  });
}

function getSortValue(asset: ScanServiceItem, sortKey: SortKey): number {
  if (sortKey === "price") {
    return safeNumber(asset.price, 0);
  }

  return safeNumber(asset.confidence_score, 0);
}

function sortItems(items: ScanServiceItem[], sortKey: SortKey, order: SortOrder): void {
  const direction = order === "asc" ? 1 : -1;

  items.sort((a, b) => {
    const aValue = getSortValue(a, sortKey);
    const bValue = getSortValue(b, sortKey);

    if (aValue !== bValue) {
      return (aValue - bValue) * direction;
    }

    const aScore = safeNumber(a.confidence_score, 0);
    const bScore = safeNumber(b.confidence_score, 0);

    if (aScore !== bScore) {
      return bScore - aScore;
    }

    return a.symbol.localeCompare(b.symbol);
  });
}

function buildFallbackAsset(input: {
  id: string;
  symbol: string;
  name: string;
  price: number;
  chg_24h_pct: number;
  confidence_score: number;
  regime: Regime;
}): ScanAsset {
  return {
    id: input.id,
    symbol: input.symbol,
    name: input.name,
    price: input.price,
    chg_24h_pct: input.chg_24h_pct,
    confidence_score: input.confidence_score,
    score_delta: null,
    score_trend: null,
    regime: input.regime,
    market_cap: undefined,
    volume_24h: undefined,
    binance_url: "",
  };
}

function fallbackAssets(quote: Quote): ScanServiceItem[] {
  const base: ScanAsset[] = [
    buildFallbackAsset({
      id: "btc",
      symbol: "BTC",
      name: "Bitcoin",
      price: 64000,
      chg_24h_pct: 0.3,
      confidence_score: 98,
      regime: "TRANSITION",
    }),
    buildFallbackAsset({
      id: "usdt",
      symbol: "USDT",
      name: "Tether",
      price: 1,
      chg_24h_pct: 0.01,
      confidence_score: 95,
      regime: "STABLE",
    }),
    buildFallbackAsset({
      id: "eth",
      symbol: "ETH",
      name: "Ethereum",
      price: 3200,
      chg_24h_pct: 0.7,
      confidence_score: 91,
      regime: "TRANSITION",
    }),
    buildFallbackAsset({
      id: "sol",
      symbol: "SOL",
      name: "Solana",
      price: 145,
      chg_24h_pct: 1.1,
      confidence_score: 84,
      regime: "VOLATILE",
    }),
  ];

  return base.map((asset) => toScanServiceItem(asset, quote));
}

function buildResult(
  input: Partial<ScanServiceResult> & Pick<ScanServiceResult, "ts" | "quote">
): ScanServiceResult {
  return {
    ok: Boolean(input.ok),
    ts: input.ts,
    version: input.version ?? XYVALA_VERSION,
    source: input.source ?? "fallback",
    market: input.market ?? DEFAULT_MARKET,
    quote: input.quote,
    count: input.count ?? 0,
    data: input.data ?? [],
    error: input.error ?? null,
    warnings: uniqueWarnings(input.warnings),
    meta: {
      q: input.meta?.q ?? null,
      sort: input.meta?.sort ?? DEFAULT_SORT,
      limit: input.meta?.limit ?? DEFAULT_LIMIT,
    },
  };
}

export async function getScanService(
  input: ScanServiceInput = {}
): Promise<ScanServiceResult> {
  const ts = nowIso();
  const quote = normalizeQuote(input.quote);
  const { sortKey, sortLabel, order } = normalizeSort(input.sort);
  const limit = parseLimit(input.limit);
  const q = normalizeSearch(input.q);
  const noStore = input.noStore === true;

  const canonicalSnapshotKey = buildCanonicalSnapshotKey(quote);

  const cacheKey = buildScanServiceCacheKey({
    quote,
    sort: sortLabel,
    limit,
    q,
  });

  if (!noStore) {
    const cached = getScanMemCache(cacheKey, SCAN_CACHE_TTL_MS);

    if (cached) {
      return buildResult({
        ...cached,
        ts,
        source: "scan_cache",
        quote,
      });
    }
  }

  let source: ScanServiceResult["source"] = "scan_snapshot";
  let items: ScanServiceItem[] = [];
  const warnings: string[] = [];

  try {
    const cachedSnapshot = getFromCache<ScanSnapshot>(
      canonicalSnapshotKey,
      SNAPSHOT_TTL_MS
    );

    if (cachedSnapshot && isScanSnapshot(cachedSnapshot)) {
      items = normalizeSnapshotItems(cachedSnapshot, quote);

      if (items.length === 0) {
        source = "fallback";
        warnings.push("scan_snapshot_empty", "scan_fallback_used");
        items = fallbackAssets(quote);
      }
    } else if (cachedSnapshot) {
      source = "fallback";
      warnings.push("scan_snapshot_invalid", "scan_fallback_used");
      items = fallbackAssets(quote);
    } else {
      source = "fallback";
      warnings.push("scan_snapshot_missing", "scan_fallback_used");
      items = fallbackAssets(quote);
    }
  } catch (error) {
    source = "fallback";
    warnings.push(
      error instanceof Error && error.message
        ? `scan_snapshot_read_failed:${error.message}`
        : "scan_snapshot_read_failed",
      "scan_fallback_used"
    );
    items = fallbackAssets(quote);
  }

  const searched = applySearch(items, q);
  sortItems(searched, sortKey, order);

  const sliced = searched.slice(0, limit);

  const result = buildResult({
    ok: true,
    ts,
    source,
    market: DEFAULT_MARKET,
    quote,
    count: searched.length,
    data: sliced,
    error: null,
    warnings,
    meta: {
      q,
      sort: sortLabel,
      limit,
    },
  });

  if (!noStore) {
    setScanMemCache(cacheKey, result);
  }

  return result;
}
