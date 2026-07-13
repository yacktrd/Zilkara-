/* ============================================================================
 * FILE: lib/xyvala/cache/cache-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala shared cache core
 *
 * ROLE
 * - provide stable shared cache key builders
 * - expose minimal get / set / delete / clear helpers
 * - use Redis / Upstash as shared cache when configured
 * - keep memory cache as development fallback only
 *
 * DIRECTIVES
 * - FR / EU compatible architecture
 * - deterministic keys only
 * - same input => same key
 * - no business logic here
 * - no RFS logic here
 * - no MCI logic here
 * - no route shaping here
 * - no payload mutation
 * - no silent key divergence
 * - expired entries are treated as unavailable
 * - cache remains generic and reusable
 * - Redis is preferred for SaaS / multi-route runtime
 * - memory fallback is local development only
 *
 * INVARIANTS
 * - cache keys are pure string outputs
 * - undefined is never stored
 * - cache API remains generic and reusable
 * - production must not silently fall back to memory cache
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

type CacheStoreShape = {
  __XYVALA_CACHE_MEM__?: Map<string, CacheEntry>;
};

type RedisResponse<T> = {
  result?: T;
  error?: string;
};

type CacheBackend = "redis" | "memory" | "unavailable";

/* ============================================================================
 * 2. MEMORY STORE
 * ========================================================================== */

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
  return safeUpper(value).replace(/[^A-Z0-9_.-]/g, "").slice(0, 32);
}

function normalizeTtlMs(ttlMs: number): number {
  const normalized = safeFiniteInteger(ttlMs, 0);
  return normalized > 0 ? normalized : 0;
}

function isExpired(entry: CacheEntry): boolean {
  return entry.expiresAt <= nowMs();
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function redisUrl(): string {
  return safeStr(
    process.env.UPSTASH_REDIS_REST_URL ??
      process.env.KV_REST_API_URL,
  );
}

function redisToken(): string {
  return safeStr(
    process.env.UPSTASH_REDIS_REST_TOKEN ??
      process.env.KV_REST_API_TOKEN,
  );
}

function hasRedisConfig(): boolean {
  return redisUrl().length > 0 && redisToken().length > 0;
}

function resolveBackend(): CacheBackend {
  if (hasRedisConfig()) return "redis";
  if (!isProduction()) return "memory";

  return "unavailable";
}

function ensureCacheAvailable(): void {
  if (resolveBackend() === "unavailable") {
    throw new Error("xyvala_cache_unavailable_redis_required_in_production");
  }
}

function encodeRedisArg(value: string): string {
  return encodeURIComponent(value);
}

function serializeCacheValue(value: unknown): string {
  return JSON.stringify(value);
}

function deserializeCacheValue<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;

  if (typeof value !== "string") {
    return value as T;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/* ============================================================================
 * 4. KEY BUILDERS
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
 * 5. REDIS HELPERS
 * ========================================================================== */

async function redisCommand<T>(
  command: readonly string[],
): Promise<T | null> {
  const baseUrl = redisUrl().replace(/\/+$/, "");
  const token = redisToken();

  if (!baseUrl || !token) {
    return null;
  }

  const url = `${baseUrl}/${command.map(encodeRedisArg).join("/")}`;

console.log("KV URL =", !!process.env.KV_REST_API_URL);
console.log("KV TOKEN =", !!process.env.KV_REST_API_TOKEN);
console.log("NODE_ENV =", process.env.NODE_ENV);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`xyvala_redis_http_${response.status}`);
  }

  const payload = (await response.json()) as RedisResponse<T>;

  if (typeof payload.error === "string" && payload.error.length > 0) {
    throw new Error(`xyvala_redis_error:${payload.error}`);
  }

  return payload.result ?? null;
}

async function redisGet<T>(key: string): Promise<T | null> {
  const value = await redisCommand<unknown>(["GET", key]);

  return deserializeCacheValue<T>(value);
}

async function redisSet<T>(
  key: string,
  value: T,
  ttlMs: number,
): Promise<T> {
  const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));

  await redisCommand<"OK">([
    "SET",
    key,
    serializeCacheValue(value),
    "EX",
    String(ttlSeconds),
  ]);

  return value;
}

async function redisDelete(key: string): Promise<boolean> {
  const result = await redisCommand<number>(["DEL", key]);

  return typeof result === "number" && result > 0;
}

async function redisClear(): Promise<void> {
  const keys = await redisCommand<string[]>(["KEYS", "xyvala:*"]);

  if (!Array.isArray(keys) || keys.length === 0) return;

  await redisCommand<number>(["DEL", ...keys]);
}

async function redisHas(key: string): Promise<boolean> {
  const result = await redisCommand<number>(["EXISTS", key]);

  return result === 1;
}

async function redisKeys(): Promise<string[]> {
  const keys = await redisCommand<string[]>(["KEYS", "xyvala:*"]);

  return Array.isArray(keys) ? keys.sort((a, b) => a.localeCompare(b)) : [];
}

/* ============================================================================
 * 6. MEMORY HELPERS
 * ========================================================================== */

function memoryGet<T>(key: string): T | null {
  const entry = mem.get(key);

  if (!entry) return null;

  if (isExpired(entry)) {
    mem.delete(key);
    return null;
  }

  return entry.value as T;
}

function memorySet<T>(key: string, value: T, ttlMs: number): T {
  mem.set(key, {
    value,
    expiresAt: nowMs() + ttlMs,
  });

  return value;
}

function memoryDelete(key: string): boolean {
  return mem.delete(key);
}

function memoryClear(): void {
  mem.clear();
}

function memoryHas(key: string): boolean {
  const entry = mem.get(key);

  if (!entry) return false;

  if (isExpired(entry)) {
    mem.delete(key);
    return false;
  }

  return true;
}

function memoryKeys(): string[] {
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

/* ============================================================================
 * 7. CACHE READ / WRITE
 * ========================================================================== */

export async function getFromCache<T>(
  key: string,
  _ttlMs?: number,
): Promise<T | null> {
  const normalizedKey = safeStr(key);

  if (!normalizedKey) return null;

  ensureCacheAvailable();

  if (resolveBackend() === "redis") {
    return redisGet<T>(normalizedKey);
  }

  return memoryGet<T>(normalizedKey);
}

export async function setToCache<T>(
  key: string,
  value: T,
  ttlMs: number,
): Promise<T> {
  const normalizedKey = safeStr(key);
  const normalizedTtl = normalizeTtlMs(ttlMs);

  if (!normalizedKey || normalizedTtl <= 0 || value === undefined) {
    return value;
  }

  ensureCacheAvailable();

  if (resolveBackend() === "redis") {
    return redisSet(normalizedKey, value, normalizedTtl);
  }

  return memorySet(normalizedKey, value, normalizedTtl);
}

export async function deleteFromCache(key: string): Promise<boolean> {
  const normalizedKey = safeStr(key);

  if (!normalizedKey) return false;

  ensureCacheAvailable();

  if (resolveBackend() === "redis") {
    return redisDelete(normalizedKey);
  }

  return memoryDelete(normalizedKey);
}

export async function clearCache(): Promise<void> {
  ensureCacheAvailable();

  if (resolveBackend() === "redis") {
    await redisClear();
    return;
  }

  memoryClear();
}

/* ============================================================================
 * 8. DEBUG / MAINTENANCE
 * ========================================================================== */

export async function getCacheSize(): Promise<number> {
  ensureCacheAvailable();

  if (resolveBackend() === "redis") {
    return (await redisKeys()).length;
  }

  return memoryKeys().length;
}

export async function hasCacheKey(key: string): Promise<boolean> {
  const normalizedKey = safeStr(key);

  if (!normalizedKey) return false;

  ensureCacheAvailable();

  if (resolveBackend() === "redis") {
    return redisHas(normalizedKey);
  }

  return memoryHas(normalizedKey);
}

export async function listCacheKeys(): Promise<string[]> {
  ensureCacheAvailable();

  if (resolveBackend() === "redis") {
    return redisKeys();
  }

  return memoryKeys();
}

export function getCacheBackend(): CacheBackend {
  return resolveBackend();
}
