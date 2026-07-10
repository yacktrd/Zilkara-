/* ============================================================================
 * FILE: lib/xyvala/runtime/redis/redis-adapter.ts
 * ========================================================================== */

import { Redis } from "@upstash/redis";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RedisOperationStatus = "success" | "error" | "unavailable";

export type RedisOperationResult<T = unknown> = {
  ok: boolean;
  status: RedisOperationStatus;
  data: T | null;
  warnings: string[];
  error: string | null;
};

export type RedisHealthResult = {
  ok: boolean;
  status: RedisOperationStatus;
  connected: boolean;
  redis_configured: boolean;
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. GLOBAL CLIENT
 * ========================================================================== */

declare global {
  // eslint-disable-next-line no-var
  var __XYVALA_REDIS_CLIENT__: Redis | undefined;
}

/* ============================================================================
 * 3. CONFIG
 * ========================================================================== */

const REDIS_TIMEOUT_MS = 4_000;
const REDIS_MAX_KEY_LENGTH = 256;

/* ============================================================================
 * 4. HELPERS
 * ========================================================================== */

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getRedisUrl(): string {
  return safeString(process.env.UPSTASH_REDIS_REST_URL ?? process.env.REDIS_URL);
}

function getRedisToken(): string {
  return safeString(process.env.UPSTASH_REDIS_REST_TOKEN);
}

function isRedisConfigured(): boolean {
  return getRedisUrl().length > 0 && getRedisToken().length > 0;
}

function normalizeError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function safeKey(key: string): string {
  return safeString(key).slice(0, REDIS_MAX_KEY_LENGTH);
}

function safeTtlSeconds(ttlSeconds: number | null | undefined): number | null {
  if (ttlSeconds === null || ttlSeconds === undefined) return null;
  if (!Number.isFinite(ttlSeconds)) return null;

  return Math.max(1, Math.trunc(ttlSeconds));
}

function unavailableResult<T>(warning: string): RedisOperationResult<T> {
  return {
    ok: false,
    status: "unavailable",
    data: null,
    warnings: [warning],
    error: warning,
  };
}

function invalidKeyResult<T>(): RedisOperationResult<T> {
  return {
    ok: false,
    status: "error",
    data: null,
    warnings: ["redis_key_invalid"],
    error: "redis_key_invalid",
  };
}

function successResult<T>(data: T): RedisOperationResult<T> {
  return {
    ok: true,
    status: "success",
    data,
    warnings: [],
    error: null,
  };
}

function errorResult<T>(warning: string, error: unknown): RedisOperationResult<T> {
  return {
    ok: false,
    status: "error",
    data: null,
    warnings: [warning],
    error: normalizeError(error, warning),
  };
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs = REDIS_TIMEOUT_MS,
): Promise<T> {
  return Promise.race([
    operation,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("redis_operation_timeout")), timeoutMs);
    }),
  ]);
}

/* ============================================================================
 * 5. CLIENT LIFECYCLE
 * ========================================================================== */

export function getRedisClient(): Redis | null {
  if (!isRedisConfigured()) return null;

  if (!globalThis.__XYVALA_REDIS_CLIENT__) {
    globalThis.__XYVALA_REDIS_CLIENT__ = new Redis({
      url: getRedisUrl(),
      token: getRedisToken(),
    });
  }

  return globalThis.__XYVALA_REDIS_CLIENT__;
}

export function clearRedisClient(): void {
  globalThis.__XYVALA_REDIS_CLIENT__ = undefined;
}

/* ============================================================================
 * 6. OBSERVE — READ
 * ========================================================================== */

export async function redisGet<T = unknown>(
  key: string,
): Promise<RedisOperationResult<T>> {
  const client = getRedisClient();
  const normalizedKey = safeKey(key);

  if (!client) return unavailableResult<T>("redis_not_configured");
  if (!normalizedKey) return invalidKeyResult<T>();

  try {
    const data = await withTimeout(client.get<T>(normalizedKey));

    return successResult<T | null>(data) as RedisOperationResult<T>;
  } catch (error) {
    return errorResult<T>("redis_get_failed", error);
  }
}

/* ============================================================================
 * 7. MUTATE — WRITE
 * ========================================================================== */

export async function redisSet<T = unknown>(
  key: string,
  value: T,
  ttlSeconds?: number | null,
): Promise<RedisOperationResult<true>> {
  const client = getRedisClient();
  const normalizedKey = safeKey(key);

  if (!client) return unavailableResult<true>("redis_not_configured");
  if (!normalizedKey) return invalidKeyResult<true>();

  try {
    const ttl = safeTtlSeconds(ttlSeconds);

    if (ttl !== null) {
      await withTimeout(
        client.set(normalizedKey, value, {
          ex: ttl,
        }),
      );
    } else {
      await withTimeout(client.set(normalizedKey, value));
    }

    return successResult(true);
  } catch (error) {
    return errorResult<true>("redis_set_failed", error);
  }
}

export async function redisDel(
  key: string,
): Promise<RedisOperationResult<number>> {
  const client = getRedisClient();
  const normalizedKey = safeKey(key);

  if (!client) return unavailableResult<number>("redis_not_configured");
  if (!normalizedKey) return invalidKeyResult<number>();

  try {
    const deleted = await withTimeout(client.del(normalizedKey));

    return successResult(deleted);
  } catch (error) {
    return errorResult<number>("redis_delete_failed", error);
  }
}

export async function redisIncrement(
  key: string,
  ttlSeconds?: number | null,
): Promise<RedisOperationResult<number>> {
  const client = getRedisClient();
  const normalizedKey = safeKey(key);

  if (!client) return unavailableResult<number>("redis_not_configured");
  if (!normalizedKey) return invalidKeyResult<number>();

  try {
    const value = await withTimeout(client.incr(normalizedKey));
    const ttl = safeTtlSeconds(ttlSeconds);

    if (ttl !== null && value === 1) {
      await withTimeout(client.expire(normalizedKey, ttl));
    }

    return successResult(value);
  } catch (error) {
    return errorResult<number>("redis_increment_failed", error);
  }
}

/* ============================================================================
 * 8. OBSERVE — HEALTH
 * ========================================================================== */

export async function checkRedisHealth(): Promise<RedisHealthResult> {
  const client = getRedisClient();

  if (!client) {
    return {
      ok: false,
      status: "unavailable",
      connected: false,
      redis_configured: false,
      warnings: ["redis_not_configured"],
      error: "redis_not_configured",
    };
  }

  try {
    await withTimeout(client.ping());

    return {
      ok: true,
      status: "success",
      connected: true,
      redis_configured: true,
      warnings: [],
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      connected: false,
      redis_configured: true,
      warnings: ["redis_health_check_failed"],
      error: normalizeError(error, "redis_health_check_failed"),
    };
  }
}
