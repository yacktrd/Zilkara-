/* ============================================================================
 * FILE: lib/xyvala/cache/cache-core.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - central deterministic cache layer for Xyvala
 * - provide stable key builders for canonical shared cache entries
 * - expose minimal get / set / delete / clear helpers
 *
 * PARENTS
 * - lib/xyvala/snapshot.ts
 * - lib/xyvala/services/scan-service.ts
 * - lib/xyvala/services/state-service.ts
 * - app/api/scan/route.ts
 * - app/api/zones/route.ts
 * - app/api/rebuild/route.ts
 * - app/api/decision/route.ts
 *
 * DIRECTIVES
 * - FR / EU compatible architecture
 * - deterministic keys only
 * - same input => same key
 * - no business logic here
 * - no RFS logic here
 * - no MCI logic here
 * - no route shaping here
 * - keep cache-core minimal, auditable and reusable
 *
 * INPUTS
 * - typed cache key builder payloads
 * - raw cache values for read / write helpers
 *
 * OUTPUTS
 * - stable cache keys
 * - cached values or null
 *
 * INVARIANTS
 * - cache keys are pure string outputs
 * - cache-core never mutates business payloads
 * - expired entries are treated as missing
 * - cache API remains generic and reusable
 *
 * CRITICAL DEPENDENCIES
 * - globalThis memory store only
 *
 * SENSITIVE ZONES
 * - key stability across modules
 * - TTL enforcement
 * - deterministic normalization of key fragments
 * ========================================================================== */

import type {
  Market,
  Quote,
  SnapshotSortKey,
  SnapshotSortOrder,
} from "@/lib/xyvala/snapshot";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

export type ScanKeyInput = {
  version: string;
  market: Market | string;
  quote: Quote | string;
  sort: SnapshotSortKey | string;
  order: SnapshotSortOrder | string;
  limit: number;
  q: string | null;
};

export type ZonesKeyInput = {
  version: string;
  scan_cache_key: string;
  symbol: string;
  tf: string;
};

export type StateKeyInput = {
  version: string;
  market: Market | string;
  quote: Quote | string;
};

export type DecisionKeyInput = {
  version: string;
  scan_cache_key?: string | null;
  zones_cache_key?: string | null;
  symbol: string;
};

/* ============================================================================
 * 2. MEMORY STORE
 * ----------------------------------------------------------------------------
 * ROLE
 * - single in-process memory store
 * - explicit and deterministic shared container
 * ========================================================================== */

type CacheStoreShape = {
  __XYVALA_CACHE_MEM__?: Map<string, CacheEntry>;
};

const globalCacheStore = globalThis as typeof globalThis & CacheStoreShape;

const mem =
  globalCacheStore.__XYVALA_CACHE_MEM__ ??
  (globalCacheStore.__XYVALA_CACHE_MEM__ = new Map<string, CacheEntry>());

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function nowMs(): number {
  return Date.now();
}

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeLower(value: unknown): string {
  return safeStr(value).toLowerCase();
}

function safeUpper(value: unknown): string {
  return safeStr(value).toUpperCase();
}

function safeFiniteInteger(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : fallback;
}

function normalizeNullableSearch(value: string | null): string {
  const normalized = safeLower(value);
  return normalized.length > 0 ? normalized : "";
}

function sanitizeSymbol(value: string): string {
  return safeUpper(value).replace(/[^A-Z0-9]/g, "").slice(0, 32);
}

function sanitizeTf(value: string): string {
  return safeUpper(value).replace(/[^A-Z0-9,._-]/g, "").slice(0, 32);
}

function normalizeTtlMs(ttlMs: number): number {
  const normalized = safeFiniteInteger(ttlMs, 0);
  return normalized > 0 ? normalized : 0;
}

function isExpired(entry: CacheEntry): boolean {
  return entry.expiresAt <= nowMs();
}

/* ============================================================================
 * 4. KEY BUILDERS
 * ----------------------------------------------------------------------------
 * ROLE
 * - provide deterministic shared cache keys
 * - keep key format stable across modules
 * ========================================================================== */

export function scanKey(input: ScanKeyInput): string {
  return [
    "xyvala",
    "scan",
    `v=${safeStr(input.version)}`,
    `market=${safeLower(input.market)}`,
    `quote=${safeLower(input.quote)}`,
    `sort=${safeLower(input.sort)}`,
    `order=${safeLower(input.order)}`,
    `limit=${Math.max(0, safeFiniteInteger(input.limit, 0))}`,
    `q=${normalizeNullableSearch(input.q)}`,
  ].join(":");
}

export function zonesKey(input: ZonesKeyInput): string {
  return [
    "xyvala",
    "zones",
    `v=${safeStr(input.version)}`,
    `scan=${safeStr(input.scan_cache_key)}`,
    `symbol=${sanitizeSymbol(input.symbol)}`,
    `tf=${sanitizeTf(input.tf)}`,
  ].join(":");
}

export function stateKey(input: StateKeyInput): string {
  return [
    "xyvala",
    "state",
    `v=${safeStr(input.version)}`,
    `market=${safeLower(input.market)}`,
    `quote=${safeLower(input.quote)}`,
  ].join(":");
}

export function decisionKey(input: DecisionKeyInput): string {
  return [
    "xyvala",
    "decision",
    `v=${safeStr(input.version)}`,
    `scan=${safeStr(input.scan_cache_key ?? "")}`,
    `zones=${safeStr(input.zones_cache_key ?? "")}`,
    `symbol=${sanitizeSymbol(input.symbol)}`,
  ].join(":");
}

/* ============================================================================
 * 5. CACHE READ / WRITE
 * ----------------------------------------------------------------------------
 * ROLE
 * - generic in-memory cache helpers
 * - expired entries are evicted on read
 * ========================================================================== */

export async function getFromCache<T>(
  key: string,
  ttlMs?: number,
): Promise<T | null> {
  const normalizedKey = safeStr(key);

  if (!normalizedKey) {
    return null;
  }

  const entry = mem.get(normalizedKey);

  if (!entry) {
    return null;
  }

  if (isExpired(entry)) {
    mem.delete(normalizedKey);
    return null;
  }

  if (typeof ttlMs === "number" && ttlMs > 0) {
    const maxAgeCutoff = nowMs() - normalizeTtlMs(ttlMs);
    const createdAtEstimate = entry.expiresAt - normalizeTtlMs(ttlMs);

    if (createdAtEstimate < maxAgeCutoff) {
      mem.delete(normalizedKey);
      return null;
    }
  }

  return entry.value as T;
}

export async function setToCache<T>(
  key: string,
  value: T,
  ttlMs: number,
): Promise<T> {
  const normalizedKey = safeStr(key);
  const normalizedTtl = normalizeTtlMs(ttlMs);

  if (!normalizedKey || normalizedTtl <= 0) {
    return value;
  }

  mem.set(normalizedKey, {
    value,
    expiresAt: nowMs() + normalizedTtl,
  });

  return value;
}

export async function deleteFromCache(key: string): Promise<boolean> {
  const normalizedKey = safeStr(key);

  if (!normalizedKey) {
    return false;
  }

  return mem.delete(normalizedKey);
}

export async function clearCache(): Promise<void> {
  mem.clear();
}

/* ============================================================================
 * 6. DEBUG / MAINTENANCE
 * ----------------------------------------------------------------------------
 * ROLE
 * - minimal observability helpers for local diagnosis
 * - no business semantics, no payload transformation
 * ========================================================================== */

export function getCacheSize(): number {
  return mem.size;
}

export function hasCacheKey(key: string): boolean {
  const normalizedKey = safeStr(key);

  if (!normalizedKey) {
    return false;
  }

  const entry = mem.get(normalizedKey);

  if (!entry) {
    return false;
  }

  if (isExpired(entry)) {
    mem.delete(normalizedKey);
    return false;
  }

  return true;
}

export function listCacheKeys(): string[] {
  const keys: string[] = [];

  for (const [key, entry] of mem.entries()) {
    if (isExpired(entry)) {
      mem.delete(key);
      continue;
    }

    keys.push(key);
  }

  return keys.sort((a, b) => a.localeCompare(b));
}
