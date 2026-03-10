// app/api/state/route.ts

import { NextRequest, NextResponse } from "next/server"
import {
  validateApiKey,
  applyApiAuthHeaders,
  buildApiKeyErrorResponse
} from "@/lib/xyvala/auth"

import {
  trackUsage,
  applyQuotaHeaders
} from "@/lib/xyvala/usage"

import {
  getFromCache,
  setToCache
} from "@/lib/xyvala/snapshot"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const VERSION = "v1"
const CACHE_TTL = 30000

type Quote = "usd" | "usdt" | "eur"

type MarketRegime = "STABLE" | "TRANSITION" | "VOLATILE" | null

type VolatilityState = "LOW" | "NORMAL" | "HIGH" | null
type LiquidityState = "LOW" | "NORMAL" | "HIGH" | null
type RiskMode = "LOW" | "MODERATE" | "HIGH" | null
type ExecutionBias = "AGGRESSIVE" | "SELECTIVE" | "DEFENSIVE" | null

type ContextResponse = {
 ok: boolean
 market_regime?: MarketRegime
 stable_ratio?: number | null
 transition_ratio?: number | null
 volatile_ratio?: number | null
 error?: string | null
 meta?: {
  warnings?: string[]
 }
}

type StateResponse = {
 ok: boolean
 ts: string
 version: string
 state: {
  market_regime: MarketRegime
  volatility_state: VolatilityState
  liquidity_state: LiquidityState
  risk_mode: RiskMode
  execution_bias: ExecutionBias
  stable_ratio: number | null
  transition_ratio: number | null
  volatile_ratio: number | null
 }
 error: string | null
 meta: {
  cache: "hit" | "miss" | "no-store"
  source: "context_fetch" | "context_cache" | "fallback"
  quote: Quote
  warnings: string[]
 }
}

const now = () => new Date().toISOString()

function safeNum(v: unknown): number | null {
 return typeof v === "number" && Number.isFinite(v) ? v : null
}

function safeStr(v: unknown): string {
 return typeof v === "string" ? v.trim() : ""
}

function normalizeQuote(v: string | null): Quote {
 const s = safeStr(v).toLowerCase()

 if (s === "eur") return "eur"
 if (s === "usdt") return "usdt"

 return "usd"
}

function normalizeRegime(v: unknown): MarketRegime {

 const s = safeStr(v).toUpperCase()

 if (s === "STABLE") return "STABLE"
 if (s === "TRANSITION") return "TRANSITION"
 if (s === "VOLATILE") return "VOLATILE"

 return null
}

function cacheKey(quote: Quote) {
 return `xyvala:state:${VERSION}:${quote}`
}

function unique(...groups: Array<string[] | undefined>) {

 const arr = groups.flatMap(g => g ?? [])

 return [...new Set(arr)]
}

function inferVolatility(input: {
 regime: MarketRegime
 volatile: number | null
 transition: number | null
}): VolatilityState {

 if (input.regime === "VOLATILE") return "HIGH"

 if (input.volatile !== null && input.volatile > 0.35) return "HIGH"

 if (input.transition !== null && input.transition > 0.45) return "NORMAL"

 if (input.regime === "STABLE") return "LOW"

 return "NORMAL"
}

function inferLiquidity(input: {
 stable: number | null
 volatile: number | null
 transition: number | null
}): LiquidityState {

 if (input.stable !== null && input.stable > 0.5) return "HIGH"

 if (input.volatile !== null && input.volatile > 0.45) return "LOW"

 if (input.transition !== null && input.transition > 0.35) return "NORMAL"

 return "NORMAL"
}

function inferRisk(input: {
 regime: MarketRegime
 volatility: VolatilityState
 liquidity: LiquidityState
}): RiskMode {

 if (input.regime === "VOLATILE") return "HIGH"

 if (input.volatility === "HIGH" && input.liquidity === "LOW") return "HIGH"

 if (input.regime === "STABLE" && input.liquidity === "HIGH") return "LOW"

 return "MODERATE"
}

function inferExecution(input: {
 regime: MarketRegime
 risk: RiskMode
 liquidity: LiquidityState
}): ExecutionBias {

 if (input.risk === "HIGH") return "DEFENSIVE"

 if (input.regime === "STABLE" && input.liquidity === "HIGH")
  return "AGGRESSIVE"

 return "SELECTIVE"
}

function build(payload: Partial<StateResponse> & { ts: string }): StateResponse {

 return {

  ok: Boolean(payload.ok),

  ts: payload.ts,

  version: payload.version ?? VERSION,

  state: {
   market_regime: payload.state?.market_regime ?? null,
   volatility_state: payload.state?.volatility_state ?? null,
   liquidity_state: payload.state?.liquidity_state ?? null,
   risk_mode: payload.state?.risk_mode ?? null,
   execution_bias: payload.state?.execution_bias ?? null,
   stable_ratio: payload.state?.stable_ratio ?? null,
   transition_ratio: payload.state?.transition_ratio ?? null,
   volatile_ratio: payload.state?.volatile_ratio ?? null
  },

  error: payload.error ?? null,

  meta: {
   cache: payload.meta?.cache ?? "miss",
   source: payload.meta?.source ?? "fallback",
   quote: payload.meta?.quote ?? "usd",
   warnings: payload.meta?.warnings ?? []
  }
 }
}

async function respond(
 payload: StateResponse,
 status: number,
 auth: any,
 usage: any
) {

 let res = NextResponse.json(payload, {
  status,
  headers: {
   "x-xyvala-version": VERSION,
   "cache-control": "no-store"
  }
 })

 res = applyApiAuthHeaders(res, auth)

 if (usage) res = applyQuotaHeaders(res, usage)

 return res
}

export async function GET(req: NextRequest) {

 const ts = now()

 const quote = normalizeQuote(req.nextUrl.searchParams.get("quote"))

 const auth = validateApiKey(req)

 if (!auth.ok) {
  return buildApiKeyErrorResponse(auth.error, auth.status)
 }

 let usage = null

 try {

  usage = trackUsage({
   key: auth.key,
   keyType: auth.keyType,
   endpoint: "/api/state",
   planOverride: auth.plan
  })

 } catch {}

 const noStore = req.nextUrl.searchParams.get("noStore") === "1"

 const key = cacheKey(quote)

 if (!noStore) {

  try {

   const cached = await getFromCache<StateResponse>(key, CACHE_TTL)

   if (cached?.ok) {

    return respond(
     build({
      ...cached,
      ts,
      meta: {
       ...cached.meta,
       cache: "hit",
       source: "context_cache"
      }
     }),
     200,
     auth,
     usage
    )
   }

  } catch {}
 }

 let context: ContextResponse | null = null

 try {

  const origin = new URL(req.url).origin

  const url = new URL("/api/context", origin)

  url.searchParams.set("quote", quote)

  const res = await fetch(url.toString(), {
   headers: { "x-xyvala-key": auth.key },
   cache: "no-store"
  })

  if (res.ok) context = await res.json()

 } catch {}

 if (!context || !context.ok) {

  return respond(
   build({
    ok: false,
    ts,
    error: context?.error ?? "context_unavailable",
    meta: {
     quote,
     cache: noStore ? "no-store" : "miss",
     source: "fallback"
    }
   }),
   503,
   auth,
   usage
  )
 }

 const regime = normalizeRegime(context.market_regime)

 const stable = safeNum(context.stable_ratio)

 const transition = safeNum(context.transition_ratio)

 const volatile = safeNum(context.volatile_ratio)

 const volatility = inferVolatility({
  regime,
  volatile,
  transition
 })

 const liquidity = inferLiquidity({
  stable,
  volatile,
  transition
 })

 const risk = inferRisk({
  regime,
  volatility,
  liquidity
 })

 const execution = inferExecution({
  regime,
  risk,
  liquidity
 })

 const payload = build({
  ok: true,
  ts,
  state: {
   market_regime: regime,
   volatility_state: volatility,
   liquidity_state: liquidity,
   risk_mode: risk,
   execution_bias: execution,
   stable_ratio: stable,
   transition_ratio: transition,
   volatile_ratio: volatile
  },
  meta: {
   quote,
   cache: noStore ? "no-store" : "miss",
   source: "context_fetch",
   warnings: unique(context.meta?.warnings)
  }
 })

 if (!noStore) {

  try {

   await setToCache(key, payload)

  } catch {}
 }

 return respond(payload, 200, auth, usage)
}
