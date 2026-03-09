// app/api/summary/route.ts

import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, buildApiKeyErrorResponse, applyApiAuthHeaders } from "@/lib/xyvala/auth"
import { trackUsage } from "@/lib/xyvala/usage"
import { getXyvalaScan } from "@/lib/xyvala/scan"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const XYVALA_VERSION = "v1"

type SummaryResponse = {
  ok: boolean
  ts: string
  version: string
  state: any | null
  opportunities: any[]
  scan_meta: {
    source?: string
    quote?: string
    assets: number
  }
  error: string | null
}

const NOW_ISO = () => new Date().toISOString()

async function fetchState(origin: string, apiKey: string) {

  try {

    const res = await fetch(`${origin}/api/state`, {
      headers: {
        "x-xyvala-key": apiKey
      },
      cache: "no-store"
    })

    if (!res.ok) return null

    const json = await res.json()

    return json?.state ?? null

  } catch {

    return null

  }

}

async function fetchOpportunities(origin: string, apiKey: string) {

  try {

    const res = await fetch(`${origin}/api/opportunities`, {
      headers: {
        "x-xyvala-key": apiKey
      },
      cache: "no-store"
    })

    if (!res.ok) return []

    const json = await res.json()

    return Array.isArray(json?.data) ? json.data : []

  } catch {

    return []

  }

}

export async function GET(req: NextRequest) {

  const ts = NOW_ISO()

  const auth = validateApiKey(req)

  if (!auth.ok) {
    return buildApiKeyErrorResponse(auth.error, auth.status)
  }

  try {

    await trackUsage({
      apiKey: auth.key,
      endpoint: "/api/summary"
    })

  } catch {
    // non bloquant
  }

  try {

    const origin = new URL(req.url).origin

    const [scan, state, opportunities] = await Promise.all([

      getXyvalaScan({
        quote: "usd",
        sort: "score_desc",
        limit: 100
      }),

      fetchState(origin, auth.key),

      fetchOpportunities(origin, auth.key)

    ])

    const response: SummaryResponse = {
      ok: true,
      ts,
      version: XYVALA_VERSION,
      state,
      opportunities,
      scan_meta: {
        source: scan?.source,
        quote: scan?.quote,
        assets: Array.isArray(scan?.data) ? scan.data.length : 0
      },
      error: null
    }

    return applyApiAuthHeaders(

      NextResponse.json(response, {
        status: 200,
        headers: {
          "cache-control": "no-store",
          "x-xyvala-version": XYVALA_VERSION
        }
      }),

      auth

    )

  } catch (e: any) {

    const response: SummaryResponse = {
      ok: false,
      ts,
      version: XYVALA_VERSION,
      state: null,
      opportunities: [],
      scan_meta: {
        assets: 0
      },
      error: e?.message ? String(e.message) : "summary_failed"
    }

    return applyApiAuthHeaders(

      NextResponse.json(response, {
        status: 500,
        headers: {
          "cache-control": "no-store",
          "x-xyvala-version": XYVALA_VERSION
        }
      }),

      auth

    )

  }

}
