import { NextRequest, NextResponse } from "next/server"
import {
  validateApiKey,
  buildApiKeyErrorResponse,
  applyApiAuthHeaders
} from "@/lib/xyvala/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* -------------------------------------------------------------------------- */
/* Config                                                                      */
/* -------------------------------------------------------------------------- */

const API_VERSION = 1
const BINANCE_BASE_URL = process.env.BINANCE_BASE_URL ?? "https://api.binance.com"

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const CACHE_TTL_MS = 60_000
const FETCH_TIMEOUT_MS = 8_000
const KLINES_INTERVAL = "1d"
const KLINES_LIMIT = 31
const KLINE_CONCURRENCY = 6

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 60

const TOP_SYMBOLS_DEFAULT = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "ADAUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "TRXUSDT",
  "DOTUSDT",
  "MATICUSDT",
  "LTCUSDT",
  "BCHUSDT",
  "ATOMUSDT",
  "ETCUSDT",
  "XLMUSDT",
  "FILUSDT",
  "APTUSDT",
  "ARBUSDT",
  "NEARUSDT",
  "OPUSDT",
  "UNIUSDT",
  "ICPUSDT",
  "SUIUSDT",
  "PEPEUSDT",
  "INJUSDT",
  "FETUSDT",
  "RNDRUSDT",
  "TIAUSDT",
  "TAOUSDT",
  "SEIUSDT",
  "AAVEUSDT",
  "GRTUSDT",
  "RUNEUSDT",
  "ALGOUSDT",
  "VETUSDT",
  "HBARUSDT",
  "MKRUSDT",
  "EGLDUSDT",
  "THETAUSDT",
  "IMXUSDT",
  "JUPUSDT",
  "WIFUSDT",
  "TONUSDT",
  "BONKUSDT",
  "KASUSDT",
  "PYTHUSDT",
  "ARUSDT",
  "ENAUSDT"
] as const

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

type Regime = "STABLE" | "TRANSITION" | "VOLATILE"
type ConfidenceLabel = "HIGH" | "MEDIUM" | "LOW"
type Rating = "A" | "B" | "C" | "D"

type Binance24hTicker = {
  symbol: string
  lastPrice: string
  priceChangePercent: string
  quoteVolume: string
  volume: string
}

type KlineTuple = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string
]

type PrevState = {
  ts: string
  stability_score: number
  regime: Regime
  confidence_score: number
}

type ScanAsset = {
  symbol: string
  price: number
  chg_24h_pct: number
  chg_7d_pct: number
  chg_30d_pct: number
  volume_24h: number
  quote_volume_24h: number

  stability_score: number
  rating: Rating
  regime: Regime

  confidence_score: number
  confidence_label: ConfidenceLabel
  confidence_reason: string

  prev: PrevState | null
  delta_score: number | null
  regime_change: string | null

  rupture_rate: number
  similarity: number | null
}

type ScanMeta = {
  source: "binance"
  market: "spot"
  pairs: string
  score_timeframe: string
  inputs: string[]

  cache: boolean
  cache_layer: "memory"
  cache_ttl_sec: number
  refresh_interval_sec: number
  cache_status: "HIT" | "MISS" | "STALE"

  atomic: true
  last_refresh_ts: string
  duration_ms: number
  count: number
  limit: number
  filtered: number
  nulls: number

  api_version: number

  score_method: string
  score_range: "0-100"
  normalization_window: string
  baseline_window: string
  normalized: true

  confidence_method: string
  confidence_inputs: string[]

  fallback?: "last_good_snapshot"
  mode?: "normal" | "degraded"
}

type ScanSuccessResponse = {
  ok: true
  source: "scan"
  ts: string
  api_version: number
  meta: ScanMeta
  data: ScanAsset[]
  error: null
}

type ScanErrorResponse = {
  ok: false
  source: "scan"
  ts: string
  api_version: number
  meta: Partial<ScanMeta>
  data: []
  error: {
    code: string
    message: string
    retry_after_sec?: number
  }
}

type CacheSnapshot = {
  payload: ScanSuccessResponse
  expiresAt: number
  lastGoodPayload: ScanSuccessResponse | null
  prevBySymbol: Record<string, PrevState>
}

type RateBucket = {
  count: number
  resetAt: number
}

type GlobalStore = {
  scanCache?: CacheSnapshot
  rateBuckets?: Map<string, RateBucket>
}

/* -------------------------------------------------------------------------- */
/* Global store                                                                */
/* -------------------------------------------------------------------------- */

const globalStore = globalThis as typeof globalThis & {
  __xyvalaGlobal?: GlobalStore
}

if (!globalStore.__xyvalaGlobal) {
  globalStore.__xyvalaGlobal = {
    rateBuckets: new Map<string, RateBucket>()
  }
}

function getCache(): CacheSnapshot | undefined {
  return globalStore.__xyvalaGlobal?.scanCache
}

function setCache(snapshot: CacheSnapshot) {
  if (!globalStore.__xyvalaGlobal) {
    globalStore.__xyvalaGlobal = { rateBuckets: new Map<string, RateBucket>() }
  }
  globalStore.__xyvalaGlobal.scanCache = snapshot
}

function getRateBuckets(): Map<string, RateBucket> {
  if (!globalStore.__xyvalaGlobal) {
    globalStore.__xyvalaGlobal = { rateBuckets: new Map<string, RateBucket>() }
  }
  if (!globalStore.__xyvalaGlobal.rateBuckets) {
    globalStore.__xyvalaGlobal.rateBuckets = new Map<string, RateBucket>()
  }
  return globalStore.__xyvalaGlobal.rateBuckets
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function toNumber(value: string | number | null | undefined, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function normalizeSymbol(input: string): string | null {
  const raw = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (!raw) return null
  if (!/^[A-Z0-9]+$/.test(raw)) return null
  if (raw.endsWith("USDT")) return raw
  return `${raw}USDT`
}

function parseSymbolsParam(req: NextRequest): string[] {
  const raw = req.nextUrl.searchParams.get("symbols")
  const limitParam = toNumber(req.nextUrl.searchParams.get("limit"), DEFAULT_LIMIT)
  const limit = clamp(Math.floor(limitParam), 1, MAX_LIMIT)

  if (!raw) {
    return [...TOP_SYMBOLS_DEFAULT.slice(0, limit)]
  }

  const normalized = raw
    .split(",")
    .map((s) => normalizeSymbol(s))
    .filter((s): s is string => Boolean(s))

  const unique = [...new Set(normalized)]
  return unique.slice(0, limit)
}

function getClientIp(req: NextRequest): string {
  const xfwd = req.headers.get("x-forwarded-for")
  if (xfwd) return xfwd.split(",")[0]?.trim() || "unknown"
  return req.headers.get("x-real-ip") || "unknown"
}

function applyRateLimit(req: NextRequest): { ok: true } | { ok: false; retryAfterSec: number } {
  const ip = getClientIp(req)
  const buckets = getRateBuckets()
  const now = Date.now()

  const current = buckets.get(ip)
  if (!current || current.resetAt <= now) {
    buckets.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    })
    return { ok: true }
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    }
  }

  current.count += 1
  buckets.set(ip, current)
  return { ok: true }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(init?.headers ?? {})
      },
      cache: "no-store"
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`Upstream ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 180)}` : ""}`)
    }

    return (await res.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0

  async function worker() {
    while (true) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await mapper(items[index], index)
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

function getRegime(stabilityScore: number): Regime {
  if (stabilityScore >= 80) return "STABLE"
  if (stabilityScore >= 60) return "TRANSITION"
  return "VOLATILE"
}

function getRating(stabilityScore: number): Rating {
  if (stabilityScore >= 85) return "A"
  if (stabilityScore >= 70) return "B"
  if (stabilityScore >= 55) return "C"
  return "D"
}

function getConfidenceLabel(confidenceScore: number): ConfidenceLabel {
  if (confidenceScore >= 80) return "HIGH"
  if (confidenceScore >= 60) return "MEDIUM"
  return "LOW"
}

function getConfidenceReason(params: {
  regime: Regime
  shockPenalty: number
  transitionPenalty: number
  ruptureRate: number
  chg24: number
  chg7: number
}): string {
  const { regime, shockPenalty, transitionPenalty, ruptureRate, chg24, chg7 } = params

  if (regime === "VOLATILE") {
    if (shockPenalty > 0) return "Contexte instable : variation brutale récente."
    return "Contexte instable : structure bruitée."
  }

  if (regime === "TRANSITION") {
    if (transitionPenalty > 0) return "Transition détectée : prudence."
    return "Contexte intermédiaire : qualité moyenne."
  }

  if (ruptureRate <= 20 && Math.abs(chg24) <= 4 && Math.abs(chg7) <= 10) {
    return "Contexte stable."
  }

  return "Contexte propre mais à surveiller."
}

function computeStabilityScore(params: {
  chg24: number
  chg7: number
  chg30: number
  signMismatchCount: number
  ruptureRate: number
}): number {
  const { chg24, chg7, chg30, signMismatchCount, ruptureRate } = params

  const norm24 = clamp(Math.abs(chg24) / 10, 0, 1)
  const norm7 = clamp(Math.abs(chg7) / 20, 0, 1)
  const norm30 = clamp(Math.abs(chg30) / 40, 0, 1)

  const mismatchPenalty = signMismatchCount * 7.5
  const rupturePenalty = Math.min(ruptureRate * 0.8, 24)

  const raw =
    100 -
    norm24 * 18 -
    norm7 * 22 -
    norm30 * 18 -
    mismatchPenalty -
    rupturePenalty

  return round2(clamp(raw, 0, 100))
}

function computeRuptureRate(params: {
  chg24: number
  chg7: number
  chg30: number
  signMismatchCount: number
}): number {
  const { chg24, chg7, chg30, signMismatchCount } = params

  const base =
    clamp(Math.abs(chg24) / 8, 0, 1) * 18 +
    clamp(Math.abs(chg7) / 20, 0, 1) * 22 +
    clamp(Math.abs(chg30) / 40, 0, 1) * 12 +
    signMismatchCount * 8

  return round2(clamp(base, 0, 100))
}

function computeShockPenalty(chg24: number, chg7: number): number {
  if (Math.abs(chg24) >= 8 || Math.abs(chg7) >= 18) return 12
  if (Math.abs(chg24) >= 5 || Math.abs(chg7) >= 12) return 6
  return 0
}

function computeTransitionPenalty(regime: Regime): number {
  if (regime === "TRANSITION") return 10
  if (regime === "VOLATILE") return 25
  return 0
}

function signOf(value: number): number {
  if (value > 0) return 1
  if (value < 0) return -1
  return 0
}

function countSignMismatches(values: number[]): number {
  const signs = values.map(signOf)
  let mismatches = 0
  for (let i = 1; i < signs.length; i += 1) {
    if (signs[i] !== 0 && signs[i - 1] !== 0 && signs[i] !== signs[i - 1]) {
      mismatches += 1
    }
  }
  return mismatches
}

function computeLiquidityBonus(quoteVolume24h: number, maxQuoteVolume24h: number): number {
  if (!Number.isFinite(quoteVolume24h) || quoteVolume24h <= 0 || maxQuoteVolume24h <= 0) {
    return 0
  }

  const ratio = clamp(quoteVolume24h / maxQuoteVolume24h, 0, 1)
  return round2(clamp(Math.sqrt(ratio) * 5, 0, 5))
}

function computePercentChange(current: number, past: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(past) || past === 0) return 0
  return round2(((current - past) / past) * 100)
}

function makeResponse(
  auth: ReturnType<typeof validateApiKey>,
  payload: ScanSuccessResponse | ScanErrorResponse,
  status: number,
  extraHeaders?: Record<string, string>
) {
  const response = NextResponse.json(payload, { status })

  if (extraHeaders) {
    Object.entries(extraHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
  }

  return applyApiAuthHeaders(response, auth as never)
}

function getPrevBySymbolFromCache(): Record<string, PrevState> {
  return getCache()?.prevBySymbol ?? {}
}

function buildMeta(params: {
  count: number
  limit: number
  durationMs: number
  cacheStatus: "HIT" | "MISS" | "STALE"
  lastRefreshTs: string
  filtered: number
  nulls: number
  mode?: "normal" | "degraded"
  fallback?: "last_good_snapshot"
}): ScanMeta {
  return {
    source: "binance",
    market: "spot",
    pairs: "*_USDT",
    score_timeframe: KLINES_INTERVAL,
    inputs: ["price", "chg_24h_pct", "chg_7d_pct", "chg_30d_pct", "quote_volume_24h"],

    cache: true,
    cache_layer: "memory",
    cache_ttl_sec: Math.floor(CACHE_TTL_MS / 1000),
    refresh_interval_sec: Math.floor(CACHE_TTL_MS / 1000),
    cache_status: params.cacheStatus,

    atomic: true,
    last_refresh_ts: params.lastRefreshTs,
    duration_ms: params.durationMs,
    count: params.count,
    limit: params.limit,
    filtered: params.filtered,
    nulls: params.nulls,

    api_version: API_VERSION,

    score_method: "stability (volatility+dispersion+liquidity; normalized)",
    score_range: "0-100",
    normalization_window: "30d rolling",
    baseline_window: "365d",
    normalized: true,

    confidence_method: "v1",
    confidence_inputs: [
      "stability_score",
      "liquidity_bonus",
      "shock_penalty",
      "transition_penalty"
    ],

    ...(params.fallback ? { fallback: params.fallback } : {}),
    mode: params.mode ?? "normal"
  }
}

/* -------------------------------------------------------------------------- */
/* Binance access                                                              */
/* -------------------------------------------------------------------------- */

async function fetch24hTickers(symbols: string[]): Promise<Binance24hTicker[]> {
  const symbolsJson = JSON.stringify(symbols)
  const url = `${BINANCE_BASE_URL}/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsJson)}`
  return fetchJson<Binance24hTicker[]>(url)
}

async function fetchKlines(symbol: string): Promise<KlineTuple[]> {
  const url = `${BINANCE_BASE_URL}/api/v3/klines?symbol=${symbol}&interval=${KLINES_INTERVAL}&limit=${KLINES_LIMIT}`
  return fetchJson<KlineTuple[]>(url)
}

/* -------------------------------------------------------------------------- */
/* Builder                                                                     */
/* -------------------------------------------------------------------------- */

async function buildScanPayload(symbols: string[]): Promise<ScanSuccessResponse> {
  const startedAt = Date.now()

  const tickers = await fetch24hTickers(symbols)
  const tickerMap = new Map(tickers.map((t) => [t.symbol, t]))

  const rawKlines = await mapLimit(symbols, KLINE_CONCURRENCY, async (symbol) => {
    const klines = await fetchKlines(symbol)
    return { symbol, klines }
  })

  const klineMap = new Map(rawKlines.map((item) => [item.symbol, item.klines]))

  const maxQuoteVolume24h = Math.max(
    0,
    ...tickers.map((t) => toNumber(t.quoteVolume, 0))
  )

  const prevBySymbol = getPrevBySymbolFromCache()

  let filtered = 0
  let nulls = 0

  const assets: ScanAsset[] = []

  for (const symbol of symbols) {
    const ticker = tickerMap.get(symbol)
    const klines = klineMap.get(symbol)

    if (!ticker || !klines || klines.length < 8) {
      filtered += 1
      continue
    }

    const currentPrice = toNumber(ticker.lastPrice, NaN)
    const chg24 = round2(toNumber(ticker.priceChangePercent, 0))
    const quoteVolume24h = toNumber(ticker.quoteVolume, 0)
    const volume24h = toNumber(ticker.volume, 0)

    const closes = klines.map((k) => toNumber(k[4], NaN)).filter(Number.isFinite)
    if (closes.length < 8 || !Number.isFinite(currentPrice)) {
      filtered += 1
      nulls += 1
      continue
    }

    const idx7 = Math.max(0, closes.length - 8)
    const idx30 = Math.max(0, closes.length - 31)

    const chg7 = computePercentChange(closes[closes.length - 1], closes[idx7])
    const chg30 = computePercentChange(closes[closes.length - 1], closes[idx30])

    const signMismatchCount = countSignMismatches([chg24, chg7, chg30])
    const ruptureRate = computeRuptureRate({
      chg24,
      chg7,
      chg30,
      signMismatchCount
    })

    const stabilityScore = computeStabilityScore({
      chg24,
      chg7,
      chg30,
      signMismatchCount,
      ruptureRate
    })

    const regime = getRegime(stabilityScore)
    const rating = getRating(stabilityScore)

    const liquidityBonus = computeLiquidityBonus(quoteVolume24h, maxQuoteVolume24h)
    const shockPenalty = computeShockPenalty(chg24, chg7)
    const transitionPenalty = computeTransitionPenalty(regime)

    const confidenceScore = round2(
      clamp(
        stabilityScore +
          liquidityBonus -
          shockPenalty -
          transitionPenalty,
        0,
        100
      )
    )

    const confidenceLabel = getConfidenceLabel(confidenceScore)
    const confidenceReason = getConfidenceReason({
      regime,
      shockPenalty,
      transitionPenalty,
      ruptureRate,
      chg24,
      chg7
    })

    const prev = prevBySymbol[symbol] ?? null
    const deltaScore = prev ? round2(confidenceScore - prev.confidence_score) : null
    const regimeChange = prev && prev.regime !== regime ? `${prev.regime}->${regime}` : null

    assets.push({
      symbol,
      price: round2(currentPrice),
      chg_24h_pct: chg24,
      chg_7d_pct: chg7,
      chg_30d_pct: chg30,
      volume_24h: round2(volume24h),
      quote_volume_24h: round2(quoteVolume24h),

      stability_score: stabilityScore,
      rating,
      regime,

      confidence_score: confidenceScore,
      confidence_label: confidenceLabel,
      confidence_reason: confidenceReason,

      prev,
      delta_score: deltaScore,
      regime_change: regimeChange,

      rupture_rate: ruptureRate,
      similarity: null
    })
  }

  assets.sort((a, b) => {
    if (b.confidence_score !== a.confidence_score) {
      return b.confidence_score - a.confidence_score
    }
    if (b.stability_score !== a.stability_score) {
      return b.stability_score - a.stability_score
    }
    return a.symbol.localeCompare(b.symbol)
  })

  const finishedAt = Date.now()
  const ts = new Date().toISOString()

  return {
    ok: true,
    source: "scan",
    ts,
    api_version: API_VERSION,
    meta: buildMeta({
      count: assets.length,
      limit: symbols.length,
      durationMs: finishedAt - startedAt,
      cacheStatus: "MISS",
      lastRefreshTs: ts,
      filtered,
      nulls,
      mode: "normal"
    }),
    data: assets,
    error: null
  }
}

/* -------------------------------------------------------------------------- */
/* Route                                                                       */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest) {
  /* ---------------- API AUTH ---------------- */

  const auth = validateApiKey(req)

  if (!auth.ok) {
    return buildApiKeyErrorResponse(auth.error, auth.status)
  }

  /* ---------------- RATE LIMIT ---------------- */

  const rate = applyRateLimit(req)
  if (!rate.ok) {
    const payload: ScanErrorResponse = {
      ok: false,
      source: "scan",
      ts: new Date().toISOString(),
      api_version: API_VERSION,
      meta: {
        source: "binance",
        cache: true,
        cache_layer: "memory",
        cache_ttl_sec: Math.floor(CACHE_TTL_MS / 1000),
        api_version: API_VERSION,
        mode: "degraded"
      },
      data: [],
      error: {
        code: "RATE_LIMIT",
        message: "Too many requests",
        retry_after_sec: rate.retryAfterSec
      }
    }

    return makeResponse(auth, payload, 429, {
      "retry-after": String(rate.retryAfterSec)
    })
  }

  /* ---------------- CACHE HIT ---------------- */

  const symbols = parseSymbolsParam(req)
  const now = Date.now()
  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1"

  const cache = getCache()
  if (!forceRefresh && cache && cache.expiresAt > now) {
    const cachedPayload: ScanSuccessResponse = {
      ...cache.payload,
      meta: {
        ...cache.payload.meta,
        cache_status: "HIT",
        duration_ms: 0
      }
    }

    return makeResponse(auth, cachedPayload, 200, {
      "x-cache": "HIT",
      "x-api-version": String(API_VERSION)
    })
  }

  /* ---------------- BUILD SNAPSHOT ---------------- */

  try {
    const payload = await buildScanPayload(symbols)

    const nextPrevBySymbol: Record<string, PrevState> = {}
    for (const item of payload.data) {
      nextPrevBySymbol[item.symbol] = {
        ts: payload.ts,
        stability_score: item.stability_score,
        regime: item.regime,
        confidence_score: item.confidence_score
      }
    }

    const toCache: CacheSnapshot = {
      payload,
      expiresAt: Date.now() + CACHE_TTL_MS,
      lastGoodPayload: payload,
      prevBySymbol: nextPrevBySymbol
    }

    setCache(toCache)

    return makeResponse(auth, payload, 200, {
      "x-cache": "MISS",
      "x-api-version": String(API_VERSION)
    })
  } catch (error) {
    const fallback = getCache()?.lastGoodPayload

    if (fallback) {
      const degradedPayload: ScanSuccessResponse = {
        ...fallback,
        ts: new Date().toISOString(),
        meta: {
          ...fallback.meta,
          cache_status: "STALE",
          fallback: "last_good_snapshot",
          mode: "degraded"
        }
      }

      return makeResponse(auth, degradedPayload, 200, {
        "x-cache": "STALE",
        "x-fallback": "last_good_snapshot",
        "x-api-version": String(API_VERSION)
      })
    }

    const message =
      error instanceof Error ? error.message : "Unexpected scan error"

    const payload: ScanErrorResponse = {
      ok: false,
      source: "scan",
      ts: new Date().toISOString(),
      api_version: API_VERSION,
      meta: {
        source: "binance",
        cache: true,
        cache_layer: "memory",
        cache_ttl_sec: Math.floor(CACHE_TTL_MS / 1000),
        api_version: API_VERSION,
        mode: "degraded"
      },
      data: [],
      error: {
        code: "UPSTREAM_ERROR",
        message
      }
    }

    return makeResponse(auth, payload, 502, {
      "x-cache": "MISS",
      "x-api-version": String(API_VERSION)
    })
  }
}
