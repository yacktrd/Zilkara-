// app/api/summary/route.ts

import { NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import {
  validateApiKey,
  buildApiKeyErrorResponse,
  applyApiAuthHeaders
} from "@/lib/xyvala/auth"
import { trackUsage } from "@/lib/xyvala/usage"
import { getXyvalaScan } from "@/lib/xyvala/scan"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const XYVALA_VERSION = "v2"
const SUMMARY_ROUTE = "/api/summary"

const SUMMARY_CACHE_TTL_MS = 15_000
const SUMMARY_CACHE_TTL_SECONDS = Math.ceil(SUMMARY_CACHE_TTL_MS / 1000)
const SUMMARY_STALE_IF_ERROR_MS = 60_000

const SUBREQUEST_TIMEOUT_MS = 3_500

const SCAN_LIMIT = 100
const SCAN_QUOTE = "usd"
const SCAN_SORT = "score_desc"

type JsonRecord = Record<string, unknown>
type NullableRecord = JsonRecord | null
type UnknownArray = unknown[]

type SummaryWarningCode = string

type SummaryResponse = {
  ok: boolean
  ts: string
  version: string
  state: NullableRecord
  opportunities: UnknownArray
  scan_meta: {
    source?: string
    quote?: string
    assets: number
  }
  error: string | null
  degraded?: boolean
  warnings?: SummaryWarningCode[]
  cache?: {
    status: "hit" | "miss" | "stale"
    layer: "kv" | "memory" | "none"
    ttl_ms: number
  }
}

type CachedEntry<T> = {
  value: T
  expiresAt: number
  staleUntil: number
}

type MemoryCacheStore = Map<string, CachedEntry<SummaryResponse>>

type HttpJsonResult = {
  ok: boolean
  status: number | null
  json: unknown
  warning: string | null
}

type StateFetchResult = {
  state: NullableRecord
  warning: string | null
}

type OpportunitiesFetchResult = {
  opportunities: UnknownArray
  warning: string | null
}

type ScanFetchResult = {
  scan: {
    source?: string
    quote?: string
    data?: unknown[]
    error?: string | null
  } | null
  warning: string | null
}

type CacheReadResult = {
  value: SummaryResponse | null
  warning: string | null
}

declare global {
  // eslint-disable-next-line no-var
  var __xyvalaSummaryCache__: MemoryCacheStore | undefined
}

const NOW_ISO = () => new Date().toISOString()

function getMemoryCache(): MemoryCacheStore {
  if (!globalThis.__xyvalaSummaryCache__) {
    globalThis.__xyvalaSummaryCache__ = new Map<string, CachedEntry<SummaryResponse>>()
  }

  return globalThis.__xyvalaSummaryCache__
}

function setMemoryCachedSummary(key: string, value: SummaryResponse, ttlMs: number) {
  const cache = getMemoryCache()

  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
    staleUntil: Date.now() + ttlMs + SUMMARY_STALE_IF_ERROR_MS
  })
}

function getMemoryCachedSummary(
  key: string,
  options?: { allowStale?: boolean }
): SummaryResponse | null {
  const allowStale = options?.allowStale === true
  const cache = getMemoryCache()
  const hit = cache.get(key)

  if (!hit) return null

  const now = Date.now()

  if (now <= hit.expiresAt) {
    return hit.value
  }

  if (allowStale && now <= hit.staleUntil) {
    return hit.value
  }

  cache.delete(key)
  return null
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function normalizeState(value: unknown): NullableRecord {
  return isRecord(value) ? value : null
}

function normalizeOpportunities(value: unknown): UnknownArray {
  return Array.isArray(value) ? value : []
}

function normalizeWarnings(...groups: Array<Array<string | null | undefined> | null | undefined>) {
  return [...new Set(groups.flatMap((group) => (Array.isArray(group) ? group : [])).filter(isNonEmptyString))]
}

function getCacheKey() {
  return `xyvala:summary:${XYVALA_VERSION}:${SCAN_QUOTE}:${SCAN_SORT}:${SCAN_LIMIT}`
}

function getRedisClient(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim()

  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim()

  if (!url || !token) return null

  return new Redis({ url, token })
}

function resolveServiceApiKey(fallbackKey: string): string {
  return (
    process.env.XYVALA_INTERNAL_KEY?.trim() ||
    process.env.XYVALA_API_KEY?.trim() ||
    fallbackKey
  )
}

async function withTimeout<T>(
  task: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await task(controller.signal)
  } catch {
    return fallback
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchJson(
  url: string,
  apiKey: string,
  timeoutMs: number
): Promise<HttpJsonResult> {
  return withTimeout(
    async (signal) => {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "x-xyvala-key": apiKey
        },
        cache: "no-store",
        signal
      })

      let json: unknown = null

      try {
        json = await res.json()
      } catch {
        json = null
      }

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          json,
          warning: `http_${res.status}`
        }
      }

      return {
        ok: true,
        status: res.status,
        json,
        warning: null
      }
    },
    timeoutMs,
    {
      ok: false,
      status: null,
      json: null,
      warning: "timeout_or_fetch_failed"
    }
  )
}

async function fetchState(origin: string, apiKey: string): Promise<StateFetchResult> {
  const result = await fetchJson(
    `${origin}/api/state?quote=${SCAN_QUOTE}`,
    apiKey,
    SUBREQUEST_TIMEOUT_MS
  )

  if (!result.ok) {
    return {
      state: null,
      warning: `state_${result.warning ?? "failed"}`
    }
  }

  if (!isRecord(result.json)) {
    return {
      state: null,
      warning: "state_invalid_payload"
    }
  }

  if (result.json.ok !== true) {
    return {
      state: null,
      warning: isNonEmptyString(result.json.error)
        ? `state_${result.json.error}`
        : "state_unavailable"
    }
  }

  return {
    state: normalizeState(result.json.state),
    warning: null
  }
}

async function fetchOpportunities(origin: string, apiKey: string): Promise<OpportunitiesFetchResult> {
  const result = await fetchJson(
    `${origin}/api/opportunities?quote=${SCAN_QUOTE}`,
    apiKey,
    SUBREQUEST_TIMEOUT_MS
  )

  if (!result.ok) {
    return {
      opportunities: [],
      warning: `opportunities_${result.warning ?? "failed"}`
    }
  }

  if (!isRecord(result.json)) {
    return {
      opportunities: [],
      warning: "opportunities_invalid_payload"
    }
  }

  if (result.json.ok === false) {
    return {
      opportunities: [],
      warning: isNonEmptyString(result.json.error)
        ? `opportunities_${result.json.error}`
        : "opportunities_unavailable"
    }
  }

  return {
    opportunities: normalizeOpportunities(result.json.data),
    warning: null
  }
}

async function fetchScan(): Promise<ScanFetchResult> {
  return withTimeout(
    async () => {
      const scan = await getXyvalaScan({
        quote: SCAN_QUOTE,
        sort: SCAN_SORT,
        limit: SCAN_LIMIT
      })

      const warning =
        isNonEmptyString(scan?.error) ? `scan_${scan.error}` : null

      return {
        scan: scan ?? null,
        warning
      }
    },
    SUBREQUEST_TIMEOUT_MS,
    {
      scan: null,
      warning: "scan_timeout_or_failed"
    }
  )
}

async function readKvCache(key: string): Promise<CacheReadResult> {
  const redis = getRedisClient()

  if (!redis) {
    return {
      value: null,
      warning: null
    }
  }

  try {
    const cached = await redis.get<SummaryResponse>(key)

    if (!cached || !isRecord(cached)) {
      return {
        value: null,
        warning: null
      }
    }

    return {
      value: cached as SummaryResponse,
      warning: null
    }
  } catch {
    return {
      value: null,
      warning: "kv_read_failed"
    }
  }
}

async function writeKvCache(key: string, value: SummaryResponse): Promise<boolean> {
  const redis = getRedisClient()

  if (!redis) return false

  try {
    await redis.set(key, value, { ex: SUMMARY_CACHE_TTL_SECONDS })
    return true
  } catch {
    return false
  }
}

function buildResponseHeaders(params: {
  cacheStatus: "hit" | "miss" | "stale"
  cacheLayer: "kv" | "memory" | "none"
}) {
  return {
    "cache-control": "private, no-store, max-age=0, must-revalidate",
    "x-xyvala-version": XYVALA_VERSION,
    "x-xyvala-cache": params.cacheStatus,
    "x-xyvala-cache-layer": params.cacheLayer
  }
}

function buildSummaryFromParts(params: {
  ts: string
  scan: ScanFetchResult["scan"]
  state: NullableRecord
  opportunities: UnknownArray
  warnings: SummaryWarningCode[]
  cacheStatus: "hit" | "miss" | "stale"
  cacheLayer: "kv" | "memory" | "none"
  error?: string | null
}): SummaryResponse {
  const assets = Array.isArray(params.scan?.data) ? params.scan.data.length : 0
  const warnings = normalizeWarnings(params.warnings)
  const hasAnyData = assets > 0 || params.state !== null || params.opportunities.length > 0

  return {
    ok: hasAnyData,
    ts: params.ts,
    version: XYVALA_VERSION,
    state: params.state,
    opportunities: params.opportunities,
    scan_meta: {
      source: params.scan?.source,
      quote: params.scan?.quote,
      assets
    },
    error: params.error ?? (hasAnyData ? null : "summary_failed"),
    degraded: warnings.length > 0 && hasAnyData ? true : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    cache: {
      status: params.cacheStatus,
      layer: params.cacheLayer,
      ttl_ms: SUMMARY_CACHE_TTL_MS
    }
  }
}

function withCacheMetadata(
  response: SummaryResponse,
  cache: SummaryResponse["cache"]
): SummaryResponse {
  return {
    ...response,
    cache
  }
}

export async function GET(req: NextRequest) {
  const auth = validateApiKey(req)

  if (!auth.ok) {
    return buildApiKeyErrorResponse(auth.error, auth.status)
  }

  try {
    await trackUsage({
      apiKey: auth.key,
      endpoint: SUMMARY_ROUTE
    })
  } catch {
    // non bloquant
  }

  const cacheKey = getCacheKey()

  const kvCache = await readKvCache(cacheKey)
  if (kvCache.value) {
    return applyApiAuthHeaders(
      NextResponse.json(
        withCacheMetadata(kvCache.value, {
          status: "hit",
          layer: "kv",
          ttl_ms: SUMMARY_CACHE_TTL_MS
        }),
        {
          status: kvCache.value.ok ? 200 : 503,
          headers: buildResponseHeaders({
            cacheStatus: "hit",
            cacheLayer: "kv"
          })
        }
      ),
      auth
    )
  }

  const memoryFresh = getMemoryCachedSummary(cacheKey)
  if (memoryFresh) {
    const memoryResponse = withCacheMetadata(memoryFresh, {
      status: "hit",
      layer: "memory",
      ttl_ms: SUMMARY_CACHE_TTL_MS
    })

    if (kvCache.warning) {
      memoryResponse.warnings = normalizeWarnings(memoryResponse.warnings, [kvCache.warning])
      memoryResponse.degraded = true
    }

    return applyApiAuthHeaders(
      NextResponse.json(memoryResponse, {
        status: memoryResponse.ok ? 200 : 503,
        headers: buildResponseHeaders({
          cacheStatus: "hit",
          cacheLayer: "memory"
        })
      }),
      auth
    )
  }

  const ts = NOW_ISO()
  const serviceKey = resolveServiceApiKey(auth.key)

  try {
    const origin = new URL(req.url).origin

    const [scanResult, stateResult, opportunitiesResult] = await Promise.all([
      fetchScan(),
      fetchState(origin, serviceKey),
      fetchOpportunities(origin, serviceKey)
    ])

    const warnings = normalizeWarnings(
      [kvCache.warning],
      [scanResult.warning],
      [stateResult.warning],
      [opportunitiesResult.warning]
    )

    let response = buildSummaryFromParts({
      ts,
      scan: scanResult.scan,
      state: stateResult.state,
      opportunities: opportunitiesResult.opportunities,
      warnings,
      cacheStatus: "miss",
      cacheLayer: "none"
    })

    if (!response.ok) {
      const staleMemory = getMemoryCachedSummary(cacheKey, { allowStale: true })

      if (staleMemory) {
        const staleResponse = withCacheMetadata(staleMemory, {
          status: "stale",
          layer: "memory",
          ttl_ms: SUMMARY_CACHE_TTL_MS
        })

        staleResponse.warnings = normalizeWarnings(
          staleResponse.warnings,
          response.warnings,
          ["served_stale_summary"]
        )
        staleResponse.degraded = true

        return applyApiAuthHeaders(
          NextResponse.json(staleResponse, {
            status: 200,
            headers: buildResponseHeaders({
              cacheStatus: "stale",
              cacheLayer: "memory"
            })
          }),
          auth
        )
      }
    }

    const kvWriteOk = await writeKvCache(cacheKey, response)

    setMemoryCachedSummary(cacheKey, response, SUMMARY_CACHE_TTL_MS)

    response = withCacheMetadata(response, {
      status: "miss",
      layer: kvWriteOk ? "kv" : "memory",
      ttl_ms: SUMMARY_CACHE_TTL_MS
    })

    if (!kvWriteOk) {
      response.warnings = normalizeWarnings(response.warnings, ["kv_write_failed"])
      response.degraded = true
    }

    return applyApiAuthHeaders(
      NextResponse.json(response, {
        status: response.ok ? 200 : 503,
        headers: buildResponseHeaders({
          cacheStatus: "miss",
          cacheLayer: response.cache?.layer ?? "none"
        })
      }),
      auth
    )
  } catch (error: unknown) {
    const staleMemory = getMemoryCachedSummary(cacheKey, { allowStale: true })

    if (staleMemory) {
      const staleResponse = withCacheMetadata(staleMemory, {
        status: "stale",
        layer: "memory",
        ttl_ms: SUMMARY_CACHE_TTL_MS
      })

      staleResponse.warnings = normalizeWarnings(
        staleResponse.warnings,
        ["summary_failed", "served_stale_summary"]
      )
      staleResponse.degraded = true

      return applyApiAuthHeaders(
        NextResponse.json(staleResponse, {
          status: 200,
          headers: buildResponseHeaders({
            cacheStatus: "stale",
            cacheLayer: "memory"
          })
        }),
        auth
      )
    }

    const response: SummaryResponse = {
      ok: false,
      ts,
      version: XYVALA_VERSION,
      state: null,
      opportunities: [],
      scan_meta: {
        assets: 0
      },
      error: error instanceof Error ? error.message : "summary_failed",
      warnings: ["summary_failed"],
      cache: {
        status: "miss",
        layer: "none",
        ttl_ms: SUMMARY_CACHE_TTL_MS
      }
    }

    return applyApiAuthHeaders(
      NextResponse.json(response, {
        status: 500,
        headers: buildResponseHeaders({
          cacheStatus: "miss",
          cacheLayer: "none"
        })
      }),
      auth
    )
  }
}
