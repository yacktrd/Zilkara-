/* ============================================================================
 * FILE: lib/xyvala/assets/assets-cache.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public assets memory cache
 *
 * ROLE
 * - build deterministic assets cache keys
 * - store and retrieve public assets responses in process memory
 * - isolate cache mechanics from assets service orchestration
 *
 * PARENTS
 * - lib/xyvala/snapshot.ts
 * - lib/xyvala/services/scan-query.ts
 *
 * DIRECTIVES
 * - cache layer only
 * - no route logic
 * - no provider logic
 * - no query logic
 * - no mapping logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no private analytical fields
 * - deterministic cache keys only
 * - same input => same cache key
 * ========================================================================== */

import type { Quote } from "@/lib/xyvala/snapshot";
import { XYVALA_SNAPSHOT_VERSION } from "@/lib/xyvala/snapshot";

import type {
  ScanSortKey,
  ScanSortOrder,
} from "@/lib/xyvala/services/scan-query";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const DEFAULT_MARKET = "crypto" as const;
const DEFAULT_TTL_MS = 30_000;
const MAX_CACHE_ENTRIES = 250;

/* ============================================================================
 * 2. TYPES
 * ========================================================================== */

export type AssetsCacheState = "hit" | "miss" | "no-store";

export type AssetsCacheKeyInput = {
  quote: Quote;
  q: string | null;
  sort: ScanSortKey;
  order: ScanSortOrder;
  limit: number;
  cursor: number;
};

type CacheEntry<T> = {
  ts: number;
  value: T;
};

const globalForAssetsCache = globalThis as unknown as {
  __XYVALA_ASSETS_MEM__?: Map<string, CacheEntry<unknown>>;
};

const memoryCache =
  globalForAssetsCache.__XYVALA_ASSETS_MEM__ ??
  (globalForAssetsCache.__XYVALA_ASSETS_MEM__ = new Map<
    string,
    CacheEntry<unknown>
  >());

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function nowMs(): number {
  return Date.now();
}

function normalizeNullableText(value: string | null): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizePositiveInteger(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;

  return Math.trunc(value);
}

/* ============================================================================
 * 4. CACHE KEY
 * ========================================================================== */

export function buildAssetsCacheKey(input: AssetsCacheKeyInput): string {
  return [
    "xyvala:assets",
    XYVALA_SNAPSHOT_VERSION,
    `market=${DEFAULT_MARKET}`,
    `quote=${input.quote}`,
    `q=${normalizeNullableText(input.q)}`,
    `sort=${input.sort}`,
    `order=${input.order}`,
    `limit=${normalizePositiveInteger(input.limit)}`,
    `cursor=${normalizePositiveInteger(input.cursor)}`,
  ].join(":");
}

/* ============================================================================
 * 5. CACHE ACCESS
 * ========================================================================== */

export function getAssetsCache<T>(
  key: string,
  ttlMs: number = DEFAULT_TTL_MS,
): T | null {
  const entry = memoryCache.get(key);

  if (!entry) return null;

  if (nowMs() - entry.ts > ttlMs) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value as T;
}

export function setAssetsCache<T>(key: string, value: T): void {
  if (memoryCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = memoryCache.keys().next().value;

    if (typeof firstKey === "string") {
      memoryCache.delete(firstKey);
    }
  }

  memoryCache.set(key, {
    ts: nowMs(),
    value,
  });
}

export function clearAssetsCache(): void {
  memoryCache.clear();
}
