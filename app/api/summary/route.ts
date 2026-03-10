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

const XYVALA_VERSION = "v1"
const SUMMARY_ROUTE = "/api/summary"

const SUMMARY_CACHE_TTL_MS = 15_000
const SUMMARY_CACHE_TTL_SECONDS = Math.ceil(SUMMARY_CACHE_TTL_MS / 1000)

const SUBREQUEST_TIMEOUT_MS = 3_500

const SCAN_LIMIT = 100
const SCAN_QUOTE = "usd"
const SCAN_SORT = "score_desc"

type JsonRecord = Record<string, unknown>
type NullableRecord = JsonRecord | null
type UnknownArray = unknown[]

type ScanResultLike = {
  source?: string
  quote?: string
  data?: unknown[]
} | null

type SummaryWarningCode =
  | "scan_failed"
  | "state_failed"
  | "opportunities_failed"
  | "kv_read_failed"
  | "kv_write_failed"
  | "summary_failed"

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
    status: "hit" | "miss"
    layer: "kv" | "memory" | "none"
    ttl_ms: number
  }
}

type CachedEntry<T> = {
  value: T
  expiresAt: number
}

type MemoryCacheStore = Map<string, CachedEntry<SummaryResponse>>

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

function getMemoryCachedSummary(key: string): SummaryResponse | null {
  const cache = getMemoryCache()
  const hit = cache.get(key)

  if (!hit) return null

  if (Date.now() >= hit.expiresAt) {
    cache.delete(key)
    return null
  }

  return hit.value
}

function setMemoryCachedSummary(key: string, value: SummaryResponse, ttlMs: number) {
  const cache = getMemoryCache()
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  })
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeState(value: unknown): NullableRecord {
  return isRecord(value) ? value : null
}

function normalizeOpportunities(value: unknown): UnknownArray {
  return Array.isArray(value) ? value : []
}

function getCacheKey() {
  return `xyvala:summary:${XYVALA_VERSION}:${SCAN_QUOTE}:${SCAN_SORT}:${SCAN_LIMIT}`
}

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null

  return new Redis({ url, token })
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
): Promise<unknown> {
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

      if (!res.ok) return null
      return res.json()
    },
    timeoutMs,
    null
  )
}

async function fetchState(origin: string, apiKey: string): Promise<NullableRecord> {
  const json = await fetchJson(`${origin}/api/state`, apiKey, SUBREQUEST_TIMEOUT_MS)
  if (!isRecord(json)) return null
  return normalizeState(json.state)
}

async function fetchOpportunities(origin: string, apiKey: string): Promise<UnknownArray> {
  const json = await fetchJson(`${origin}/api/opportunities`, apiKey, SUBREQUEST_TIMEOUT_MS)
  if (!isRecord(json)) return []
  return normalizeOpportunities(json.data)
}

async function fetchScan(): Promise<ScanResultLike> {
  return withTimeout(
    async () => {
      const scan = await getXyvalaScan({
        quote: SCAN_QUOTE,
        sort: SCAN_SORT,
        limit: SCAN_LIMIT
      })

      return scan ?? null
    },
    SUBREQUEST_TIMEOUT_MS,
    null
  )
}

async function readKvCache(key: string): Promise<SummaryResponse | null> {
  const redis = getRedisClient()
  if (!redis) return null

  try {
    const cached = await redis.get<SummaryResponse>(key)
    return cached ?? null
  } catch {
    return null
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
  cacheStatus: "hit" | "miss"
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
  scan: ScanResultLike
  state: NullableRecord
  opportunities: UnknownArray
  warnings: SummaryWarningCode[]
  cacheStatus: "hit" | "miss"
  cacheLayer: "kv" | "memory" | "none"
}): SummaryResponse {
  const { ts, scan, state, opportunities, warnings, cacheStatus, cacheLayer } = params

  const assets = Array.isArray(scan?.data) ? scan.data.length : 0
  const allFailed = assets === 0 && state === null && opportunities.length === 0
  const degraded = warnings.length > 0 && !allFailed

  return {
    ok: !allFailed,
    ts,
    version: XYVALA_VERSION,
    state,
    opportunities,
    scan_meta: {
      source: scan?.source,
      quote: scan?.quote,
      assets
    },
    error: allFailed ? "summary_failed" : null,
    degraded: degraded || undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    cache: {
      status: cacheStatus,
      layer: cacheLayer,
      ttl_ms: SUMMARY_CACHE_TTL_MS
    }
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

  const kvCached = await readKvCache(cacheKey)
  if (kvCached) {
    return applyApiAuthHeaders(
      NextResponse.json(
        {
          ...kvCached,
          cache: {
            status: "hit",
            layer: "kv",
            ttl_ms: SUMMARY_CACHE_TTL_MS
          }
        },
        {
          status: kvCached.ok ? 200 : 503,
          headers: buildResponseHeaders({
            cacheStatus: "hit",
            cacheLayer: "kv"
          })
        }
      ),
      auth
    )
  }

  const memoryCached = getMemoryCachedSummary(cacheKey)
  if (memoryCached) {
    return applyApiAuthHeaders(
      NextResponse.json(
        {
          ...memoryCached,
          cache: {
            status: "hit",
            layer: "memory",
            ttl_ms: SUMMARY_CACHE_TTL_MS
          }
        },
        {
          status: memoryCached.ok ? 200 : 503,
          headers: buildResponseHeaders({
            cacheStatus: "hit",
            cacheLayer: "memory"
          })
        }
      ),
      auth
    )
  }

  const ts = NOW_ISO()

  try {
    const origin = new URL(req.url).origin

    const [scanResult, stateResult, opportunitiesResult] = await Promise.allSettled([
      fetchScan(),
      fetchState(origin, auth.key),
      fetchOpportunities(origin, auth.key)
    ])

    const warnings: SummaryWarningCode[] = []

    const scan =
      scanResult.status === "fulfilled" ? scanResult.value : null
    if (scanResult.status !== "fulfilled" || !scan) {
      warnings.push("scan_failed")
    }

    const state =
      stateResult.status === "fulfilled" ? stateResult.value : null
    if (stateResult.status !== "fulfilled") {
      warnings.push("state_failed")
    }

    const opportunities =
      opportunitiesResult.status === "fulfilled" ? opportunitiesResult.value : []
    if (opportunitiesResult.status !== "fulfilled") {
      warnings.push("opportunities_failed")
    }

    let response = buildSummaryFromParts({
      ts,
      scan,
      state,
      opportunities,
      warnings,
      cacheStatus: "miss",
      cacheLayer: "none"
    })

    const kvWriteOk = await writeKvCache(cacheKey, response)
    if (kvWriteOk) {
      response = {
        ...response,
        cache: {
          status: "miss",
          layer: "kv",
          ttl_ms: SUMMARY_CACHE_TTL_MS
        }
      }
    } else {
      setMemoryCachedSummary(cacheKey, response, SUMMARY_CACHE_TTL_MS)

      response = {
        ...response,
        warnings: [...(response.warnings ?? []), "kv_write_failed"],
        cache: {
          status: "miss",
          layer: "memory",
          ttl_ms: SUMMARY_CACHE_TTL_MS
        }
      }
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
