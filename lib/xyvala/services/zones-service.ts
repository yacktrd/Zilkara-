/* ============================================================================
 * FILE: lib/xyvala/services/zones-service.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public zones service
 *
 * ROLE
 * - orchestrate public descriptive zones generation
 * - read canonical public scan snapshots from cache-core
 * - find public asset by symbol
 * - build descriptive zones through zones-builder.ts
 * - return a deterministic ZonesResponse for API routes
 *
 * DIRECTIVES
 * - service orchestration only
 * - public data only
 * - EUR default quote
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no decision exposure
 * - no regime exposure
 * - no opportunity exposure
 * - no stability score exposure
 * - no broker / affiliate exposure
 * - no route logic
 * - no auth logic
 * - no quota logic
 * - same input => same output shape
 * - null means explicitly unavailable
 * ========================================================================== */

import {
  getFromCache,
  scanKey,
  setToCache,
  zonesKey,
} from "@/lib/xyvala/cache/cache-core";

import {
  XYVALA_SNAPSHOT_VERSION,
  type Quote,
  type ScanSnapshot,
} from "@/lib/xyvala/snapshot";

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

import {
  buildFallbackZones,
  buildZonesFromPrice,
  buildZonesSnapshotPublic,
  computeZonesContext,
} from "@/lib/xyvala/zones/zones-builder";

import type {
  NormalizedZonesParams,
  ZonesMarket,
  ZonesResponse,
  ZonesServiceInput,
  ZonesTimeframe,
} from "@/lib/xyvala/zones/zones-contract";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const XYVALA_VERSION = XYVALA_SNAPSHOT_VERSION;

const DEFAULT_MARKET: ZonesMarket = "crypto";
const DEFAULT_QUOTE: Quote = "eur";
const DEFAULT_TF: ZonesTimeframe = "AUTO";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 12;
const CANONICAL_SCAN_LIMIT = 250;

const SNAPSHOT_CACHE_TTL_MS = 60_000;
const ZONES_CACHE_TTL_MS = 45_000;
const MAX_MEM_CACHE_ENTRIES = 150;

/* ============================================================================
 * 2. LOCAL CACHE
 * ========================================================================== */

type LocalCacheEntry = {
  ts: number;
  payload: ZonesResponse;
};

const globalForZonesCache = globalThis as unknown as {
  __XYVALA_ZONES_MEM__?: Map<string, LocalCacheEntry>;
};

const memCache =
  globalForZonesCache.__XYVALA_ZONES_MEM__ ??
  (globalForZonesCache.__XYVALA_ZONES_MEM__ = new Map<string, LocalCacheEntry>());

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function nowMs(): number {
  return Date.now();
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeLower(value: unknown): string {
  return safeString(value).toLowerCase();
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;

  return Math.max(min, Math.min(max, value));
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  return [
    ...new Set(
      groups
        .flatMap((group) => (Array.isArray(group) ? group : []))
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        ),
    ),
  ];
}

function sanitizeSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
}

/* ============================================================================
 * 4. PARAMETER NORMALIZATION
 * ========================================================================== */

function normalizeMarket(_value: unknown): ZonesMarket {
  return DEFAULT_MARKET;
}

function normalizeQuote(value: unknown): Quote {
  const quote = safeLower(value);

  if (quote === "usd") return "usd";
  if (quote === "usdt") return "usdt";

  return DEFAULT_QUOTE;
}

function normalizeTf(value: unknown): ZonesTimeframe {
  const tf = safeString(value).toUpperCase();

  if (tf === "AUTO") return "AUTO";
  if (tf === "1H") return "1H";
  if (tf === "4H") return "4H";
  if (tf === "1D") return "1D";
  if (tf === "1W") return "1W";

  return DEFAULT_TF;
}

function normalizeLimit(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }

  return clamp(Math.trunc(parsed), 1, MAX_LIMIT);
}

function normalizeNoStore(value: unknown): boolean {
  return value === true;
}

function normalizeSymbol(input: ZonesServiceInput): string {
  const rawSymbol = safeString(input.symbol) || safeString(input.q);

  return rawSymbol ? sanitizeSymbol(rawSymbol) : "";
}

function normalizeZonesParams(input: ZonesServiceInput): NormalizedZonesParams {
  return {
    symbol: normalizeSymbol(input),
    market: normalizeMarket(input.market),
    quote: normalizeQuote(input.quote),
    tf: normalizeTf(input.tf),
    limit: normalizeLimit(input.limit),
    noStore: normalizeNoStore(input.noStore),
  };
}

/* ============================================================================
 * 5. CACHE KEYS
 * ========================================================================== */

function resolveTfForZonesKey(tf: ZonesTimeframe): string {
  return tf === "AUTO" ? "1H,4H,1D" : tf;
}

function buildLocalZonesCacheKey(input: NormalizedZonesParams): string {
  return `xyvala:${XYVALA_VERSION}:zones:${input.market}:${input.quote}:${input.tf}:${input.symbol}:${input.limit}`;
}

function buildSnapshotScanCacheKey(quote: Quote): string {
  return scanKey({
    version: XYVALA_VERSION,
    market: DEFAULT_MARKET,
    quote,
    sort: "rank",
    order: "asc",
    limit: CANONICAL_SCAN_LIMIT,
    q: null,
  });
}

function buildSnapshotZonesCacheKey(input: {
  symbol: string;
  quote: Quote;
  tf: ZonesTimeframe;
}): string {
  return zonesKey({
    version: XYVALA_VERSION,
    scan_cache_key: buildSnapshotScanCacheKey(input.quote),
    symbol: input.symbol,
    tf: resolveTfForZonesKey(input.tf),
  });
}

/* ============================================================================
 * 6. LOCAL CACHE HELPERS
 * ========================================================================== */

function getLocalCache(key: string, ttlMs: number): LocalCacheEntry | null {
  const entry = memCache.get(key);

  if (!entry) {
    return null;
  }

  if (nowMs() - entry.ts > ttlMs) {
    memCache.delete(key);
    return null;
  }

  return entry;
}

function setLocalCache(key: string, entry: LocalCacheEntry): void {
  if (memCache.size >= MAX_MEM_CACHE_ENTRIES) {
    const first = memCache.keys().next().value;

    if (typeof first === "string") {
      memCache.delete(first);
    }
  }

  memCache.set(key, entry);
}

/* ============================================================================
 * 7. SNAPSHOT HELPERS
 * ========================================================================== */

function isScanAssetLike(value: unknown): value is ScanAsset {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const asset = value as Partial<ScanAsset>;

  return (
    typeof asset.id === "string" &&
    typeof asset.symbol === "string" &&
    typeof asset.name === "string"
  );
}

function findScanAsset(
  snapshot: ScanSnapshot | null,
  symbol: string,
): ScanAsset | null {
  if (!snapshot || !Array.isArray(snapshot.data)) {
    return null;
  }

  const match = snapshot.data.find((asset) => {
    if (!isScanAssetLike(asset)) {
      return false;
    }

    return safeString(asset.symbol).toUpperCase() === symbol;
  });

  return isScanAssetLike(match) ? match : null;
}

/* ============================================================================
 * 8. RESPONSE BUILDER
 * ========================================================================== */

function buildZonesResponse(
  input: Partial<ZonesResponse> &
    Pick<ZonesResponse, "ts" | "symbol" | "market" | "quote" | "tf">,
): ZonesResponse {
  return {
    ok: input.ok === true,
    ts: input.ts,
    version: input.version ?? XYVALA_VERSION,
    symbol: input.symbol,
    market: input.market,
    quote: input.quote,
    tf: input.tf,
    reference_price: input.reference_price ?? null,
    zones: input.zones ?? [],
    context:
      input.context ??
      computeZonesContext(null),
    meta: {
      limit: input.meta?.limit ?? 0,
      cache: input.meta?.cache ?? "miss",
      warnings: Array.isArray(input.meta?.warnings)
        ? input.meta.warnings
        : [],
    },
    error: input.error ?? null,
  };
}

function buildMissingSymbolResponse(params: NormalizedZonesParams): ZonesResponse {
  return buildZonesResponse({
    ok: false,
    ts: nowIso(),
    symbol: "",
    market: params.market,
    quote: params.quote,
    tf: params.tf,
    reference_price: null,
    zones: [],
    context: computeZonesContext(null),
    meta: {
      limit: params.limit,
      cache: params.noStore ? "no-store" : "miss",
      warnings: ["missing_symbol"],
    },
    error: "missing_symbol",
  });
}

/* ============================================================================
 * 9. PUBLIC SERVICE
 * ========================================================================== */

export async function getZonesService(
  input: ZonesServiceInput = {},
): Promise<ZonesResponse> {
  const params = normalizeZonesParams(input);

  if (!params.symbol) {
    return buildMissingSymbolResponse(params);
  }

  const localCacheKey = buildLocalZonesCacheKey(params);

  if (!params.noStore) {
    const cached = getLocalCache(localCacheKey, ZONES_CACHE_TTL_MS);

    if (cached) {
      return buildZonesResponse({
        ...cached.payload,
        ts: nowIso(),
        meta: {
          ...cached.payload.meta,
          limit: cached.payload.meta.limit ?? params.limit,
          cache: "hit",
          warnings: cached.payload.meta.warnings,
        },
        error: null,
      });
    }
  }

  const snapshotKey = buildSnapshotScanCacheKey(params.quote);

  const scanSnapshot = await getFromCache<ScanSnapshot>(
    snapshotKey,
    SNAPSHOT_CACHE_TTL_MS,
  );

  const asset = findScanAsset(scanSnapshot, params.symbol);
  const referencePrice = safeNumber(asset?.price);

  const context = computeZonesContext(asset);

  const zones =
    referencePrice !== null
      ? buildZonesFromPrice({
          symbol: params.symbol,
          price: referencePrice,
        }).slice(0, params.limit)
      : buildFallbackZones(params.symbol).slice(0, params.limit);

  const warnings = uniqueWarnings(
    asset ? ["scan_snapshot_asset_found"] : ["scan_snapshot_asset_missing"],
    referencePrice === null ? ["reference_price_unavailable"] : [],
  );

  const payload = buildZonesResponse({
    ok: true,
    ts: nowIso(),
    symbol: params.symbol,
    market: params.market,
    quote: params.quote,
    tf: params.tf,
    reference_price: referencePrice,
    zones,
    context,
    meta: {
      limit: params.limit,
      cache: params.noStore ? "no-store" : "miss",
      warnings,
    },
    error: null,
  });

  if (!params.noStore) {
    setLocalCache(localCacheKey, {
      ts: nowMs(),
      payload,
    });
  }

  const snapshotZonesKey = buildSnapshotZonesCacheKey({
    symbol: params.symbol,
    quote: params.quote,
    tf: params.tf,
  });

  await setToCache(
    snapshotZonesKey,
    buildZonesSnapshotPublic({
      symbol: params.symbol,
      referencePrice,
      zones,
      context,
    }),
    ZONES_CACHE_TTL_MS,
  );

  return payload;
}
