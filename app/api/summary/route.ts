// app/api/summary/route.ts

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import {
  validateApiKey,
  buildApiKeyErrorResponse,
  applyApiAuthHeaders,
} from "@/lib/xyvala/auth";
import { trackUsage, applyQuotaHeaders } from "@/lib/xyvala/usage";
import { getXyvalaScan } from "@/lib/xyvala/scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const XYVALA_VERSION = "v1";
const SUMMARY_ROUTE = "/api/summary";

const SUMMARY_CACHE_TTL_MS = 15_000;
const SUMMARY_CACHE_TTL_SECONDS = Math.ceil(SUMMARY_CACHE_TTL_MS / 1000);

const SUBREQUEST_TIMEOUT_MS = 3_500;

const SCAN_LIMIT = 100;
const SCAN_QUOTE = "usd";
const SCAN_SORT = "score_desc";

type JsonRecord = Record<string, unknown>;
type NullableRecord = JsonRecord | null;
type UnknownArray = unknown[];

type SummaryWarningCode =
  | "scan_failed"
  | "state_failed"
  | "opportunities_failed"
  | "kv_read_failed"
  | "kv_write_failed"
  | "summary_failed";

type SummaryResponse = {
  ok: boolean;
  ts: string;
  version: string;
  state: NullableRecord;
  opportunities: UnknownArray;
  scan_meta: {
    source?: string;
    quote?: string;
    assets: number;
  };
  error: string | null;
  degraded?: boolean;
  warnings?: SummaryWarningCode[];
  cache?: {
    status: "hit" | "miss";
    layer: "kv" | "memory" | "none";
    ttl_ms: number;
  };
};

type ScanResultLike = {
  source?: string;
  quote?: string;
  data?: unknown[];
} | null;

type CachedEntry<T> = {
  value: T;
  expiresAt: number;
};

type MemoryCacheStore = Map<string, CachedEntry<SummaryResponse>>;

type AuthResult = ReturnType<typeof validateApiKey>;
type AuthSuccess = Extract<AuthResult, { ok: true }>;
type UsageResult = ReturnType<typeof trackUsage> | null;

type FetchJsonResult = {
  ok: boolean;
  status: number;
  json: unknown;
  warning?: SummaryWarningCode;
};

declare global {
  // eslint-disable-next-line no-var
  var __xyvalaSummaryCache__: MemoryCacheStore | undefined;
}

const nowIso = () => new Date().toISOString();

function getMemoryCache(): MemoryCacheStore {
  if (!globalThis.__xyvalaSummaryCache__) {
    globalThis.__xyvalaSummaryCache__ = new Map<string, CachedEntry<SummaryResponse>>();
  }

  return globalThis.__xyvalaSummaryCache__;
}

function pruneMemoryCacheIfNeeded(): void {
  const cache = getMemoryCache();

  if (cache.size < 100) return;

  const firstKey = cache.keys().next().value;
  if (typeof firstKey === "string") {
    cache.delete(firstKey);
  }
}

function getMemoryCachedSummary(key: string): SummaryResponse | null {
  const cache = getMemoryCache();
  const hit = cache.get(key);

  if (!hit) return null;

  if (Date.now() >= hit.expiresAt) {
    cache.delete(key);
    return null;
  }

  return hit.value;
}

function setMemoryCachedSummary(key: string, value: SummaryResponse, ttlMs: number): void {
  const cache = getMemoryCache();
  pruneMemoryCacheIfNeeded();
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeState(value: unknown): NullableRecord {
  return isRecord(value) ? value : null;
}

function normalizeOpportunities(value: unknown): UnknownArray {
  return Array.isArray(value) ? value : [];
}

function getCacheKey(): string {
  return `xyvala:summary:${XYVALA_VERSION}:${SCAN_QUOTE}:${SCAN_SORT}:${SCAN_LIMIT}`;
}

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) return null;

  return new Redis({ url, token });
}

async function withTimeout<T>(
  task: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await task(controller.signal);
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(
  url: string,
  apiKey: string,
  timeoutMs: number
): Promise<FetchJsonResult> {
  return withTimeout(
    async (signal) => {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "x-xyvala-key": apiKey,
        },
        cache: "no-store",
        signal,
      });

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          json: null,
        };
      }

      let json: unknown = null;

      try {
        json = await res.json();
      } catch {
        json = null;
      }

      return {
        ok: true,
        status: res.status,
        json,
      };
    },
    timeoutMs,
    {
      ok: false,
      status: 504,
      json: null,
    }
  );
}

async function fetchState(origin: string, apiKey: string): Promise<{
  state: NullableRecord;
  warning?: SummaryWarningCode;
}> {
  const result = await fetchJson(`${origin}/api/state`, apiKey, SUBREQUEST_TIMEOUT_MS);

  if (!result.ok || !isRecord(result.json)) {
    return {
      state: null,
      warning: "state_failed",
    };
  }

  return {
    state: normalizeState(result.json.state),
  };
}

async function fetchOpportunities(origin: string, apiKey: string): Promise<{
  opportunities: UnknownArray;
  warning?: SummaryWarningCode;
}> {
  const result = await fetchJson(
    `${origin}/api/opportunities`,
    apiKey,
    SUBREQUEST_TIMEOUT_MS
  );

  if (!result.ok || !isRecord(result.json)) {
    return {
      opportunities: [],
      warning: "opportunities_failed",
    };
  }

  return {
    opportunities: normalizeOpportunities(result.json.data),
  };
}

async function fetchScan(): Promise<{
  scan: ScanResultLike;
  warning?: SummaryWarningCode;
}> {
  const result = await withTimeout(
    async () => {
      const scan = await getXyvalaScan({
        quote: SCAN_QUOTE,
        sort: SCAN_SORT,
        limit: SCAN_LIMIT,
      });

      return scan ?? null;
    },
    SUBREQUEST_TIMEOUT_MS,
    null as ScanResultLike
  );

  if (!result) {
    return {
      scan: null,
      warning: "scan_failed",
    };
  }

  return {
    scan: result,
  };
}

async function readKvCache(key: string): Promise<{
  value: SummaryResponse | null;
  warning?: SummaryWarningCode;
}> {
  const redis = getRedisClient();
  if (!redis) {
    return { value: null };
  }

  try {
    const cached = await redis.get<SummaryResponse>(key);
    return {
      value: cached ?? null,
    };
  } catch {
    return {
      value: null,
      warning: "kv_read_failed",
    };
  }
}

async function writeKvCache(key: string, value: SummaryResponse): Promise<{
  ok: boolean;
  warning?: SummaryWarningCode;
}> {
  const redis = getRedisClient();
  if (!redis) {
    return { ok: false, warning: "kv_write_failed" };
  }

  try {
    await redis.set(key, value, { ex: SUMMARY_CACHE_TTL_SECONDS });
    return { ok: true };
  } catch {
    return { ok: false, warning: "kv_write_failed" };
  }
}

function uniqueWarnings(...groups: Array<SummaryWarningCode[] | undefined>): SummaryWarningCode[] {
  const merged = groups.flatMap((group) => group ?? []);
  return [...new Set(merged)];
}

function buildResponseHeaders(params: {
  cacheStatus: "hit" | "miss";
  cacheLayer: "kv" | "memory" | "none";
}) {
  return {
    "cache-control": "private, no-store, max-age=0, must-revalidate",
    "x-xyvala-version": XYVALA_VERSION,
    "x-xyvala-cache": params.cacheStatus,
    "x-xyvala-cache-layer": params.cacheLayer,
  };
}

function buildSummaryFromParts(params: {
  ts: string;
  scan: ScanResultLike;
  state: NullableRecord;
  opportunities: UnknownArray;
  warnings: SummaryWarningCode[];
  cacheStatus: "hit" | "miss";
  cacheLayer: "kv" | "memory" | "none";
}): SummaryResponse {
  const { ts, scan, state, opportunities, warnings, cacheStatus, cacheLayer } = params;

  const assets = Array.isArray(scan?.data) ? scan.data.length : 0;
  const allFailed = assets === 0 && state === null && opportunities.length === 0;
  const degraded = warnings.length > 0 && !allFailed;

  return {
    ok: !allFailed,
    ts,
    version: XYVALA_VERSION,
    state,
    opportunities,
    scan_meta: {
      source: scan?.source,
      quote: scan?.quote,
      assets,
    },
    error: allFailed ? "summary_failed" : null,
    degraded: degraded || undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    cache: {
      status: cacheStatus,
      layer: cacheLayer,
      ttl_ms: SUMMARY_CACHE_TTL_MS,
    },
  };
}

function respond(
  payload: SummaryResponse,
  status: number,
  auth: AuthSuccess,
  usage: UsageResult
) {
  let res: NextResponse = NextResponse.json(payload, {
    status,
    headers: buildResponseHeaders({
      cacheStatus: payload.cache?.status ?? "miss",
      cacheLayer: payload.cache?.layer ?? "none",
    }),
  });

  res = applyApiAuthHeaders(res, auth);

  if (usage) {
    res = applyQuotaHeaders(res, usage);
  }

  return res;
}

export async function GET(req: NextRequest) {
  const auth = validateApiKey(req);

  if (!auth.ok) {
    return buildApiKeyErrorResponse(auth.error, auth.status);
  }

  let usage: UsageResult = null;

  try {
    usage = trackUsage({
      key: auth.key,
      keyType: auth.keyType,
      endpoint: SUMMARY_ROUTE,
      planOverride: "plan" in auth ? auth.plan : undefined,
    });
  } catch {
    // non bloquant
  }

  const cacheKey = getCacheKey();

  const kvCachedResult = await readKvCache(cacheKey);
  if (kvCachedResult.value) {
    const payload: SummaryResponse = {
      ...kvCachedResult.value,
      cache: {
        status: "hit",
        layer: "kv",
        ttl_ms: SUMMARY_CACHE_TTL_MS,
      },
      warnings: uniqueWarnings(
        kvCachedResult.value.warnings,
        kvCachedResult.warning ? [kvCachedResult.warning] : undefined
      ),
    };

    return respond(payload, payload.ok ? 200 : 503, auth, usage);
  }

  const memoryCached = getMemoryCachedSummary(cacheKey);
  if (memoryCached) {
    const payload: SummaryResponse = {
      ...memoryCached,
      cache: {
        status: "hit",
        layer: "memory",
        ttl_ms: SUMMARY_CACHE_TTL_MS,
      },
      warnings: uniqueWarnings(
        memoryCached.warnings,
        kvCachedResult.warning ? [kvCachedResult.warning] : undefined
      ),
    };

    return respond(payload, payload.ok ? 200 : 503, auth, usage);
  }

  const ts = nowIso();

  try {
    const origin = new URL(req.url).origin;

    const [scanPart, statePart, opportunitiesPart] = await Promise.all([
      fetchScan(),
      fetchState(origin, auth.key),
      fetchOpportunities(origin, auth.key),
    ]);

    const warnings = uniqueWarnings(
      scanPart.warning ? [scanPart.warning] : undefined,
      statePart.warning ? [statePart.warning] : undefined,
      opportunitiesPart.warning ? [opportunitiesPart.warning] : undefined,
      kvCachedResult.warning ? [kvCachedResult.warning] : undefined
    );

    let payload = buildSummaryFromParts({
      ts,
      scan: scanPart.scan,
      state: statePart.state,
      opportunities: opportunitiesPart.opportunities,
      warnings,
      cacheStatus: "miss",
      cacheLayer: "none",
    });

    const kvWriteResult = await writeKvCache(cacheKey, payload);

    if (kvWriteResult.ok) {
      payload = {
        ...payload,
        cache: {
          status: "miss",
          layer: "kv",
          ttl_ms: SUMMARY_CACHE_TTL_MS,
        },
      };
    } else {
      setMemoryCachedSummary(cacheKey, payload, SUMMARY_CACHE_TTL_MS);

      payload = {
        ...payload,
        warnings: uniqueWarnings(
          payload.warnings,
          kvWriteResult.warning ? [kvWriteResult.warning] : undefined
        ),
        cache: {
          status: "miss",
          layer: "memory",
          ttl_ms: SUMMARY_CACHE_TTL_MS,
        },
      };
    }

    return respond(payload, payload.ok ? 200 : 503, auth, usage);
  } catch (error: unknown) {
    const payload: SummaryResponse = {
      ok: false,
      ts,
      version: XYVALA_VERSION,
      state: null,
      opportunities: [],
      scan_meta: {
        assets: 0,
      },
      error: error instanceof Error ? error.message : "summary_failed",
      warnings: ["summary_failed"],
      cache: {
        status: "miss",
        layer: "none",
        ttl_ms: SUMMARY_CACHE_TTL_MS,
      },
    };

    return respond(payload, 500, auth, usage);
  }
}
