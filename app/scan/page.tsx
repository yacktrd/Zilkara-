// app/scan/page.tsx

import React from "react"
import { headers } from "next/headers"
import { getXyvalaScan, type ScanAsset } from "@/lib/xyvala/scan"
import { ScanTable } from "@/components/scan-table"
import { MarketStatePanel } from "@/components/market-state"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

const DEFAULT_QUOTE = "usd"
const DEFAULT_SORT = "score_desc"
const DEFAULT_LIMIT = 100
const MARKET_STATE_TIMEOUT_MS = 3500

type ScanTableItem = ScanAsset & {
  affiliate_url: string
}

type MarketState = {
  market_regime?: string | null
  volatility_state?: string | null
  liquidity_state?: string | null
  risk_mode?: string | null
  execution_bias?: string | null
}

type ScanPageViewModel = {
  items: ScanTableItem[]
  source: string
  quote: string
  count: number
  warnings: string[]
  error: string | null
}

type MarketStateApiResponse = {
  ok?: boolean
  state?: MarketState | null
  error?: string | null
}

type MarketStateResult = {
  state: MarketState | null
  warning: string | null
}

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback
}

function uniqueWarnings(...groups: Array<string[] | undefined | null>): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []))

  return [...new Set(merged.filter((item) => typeof item === "string" && item.trim().length > 0))]
}

function normalizeItems(items: ScanAsset[] | null | undefined): ScanTableItem[] {
  return safeArray(items).map((item) => ({
    ...item,
    affiliate_url: safeString(item.affiliate_url ?? item.binance_url, "#"),
  }))
}

function buildScanViewModel(
  result: Awaited<ReturnType<typeof getXyvalaScan>> | null | undefined
): ScanPageViewModel {
  const items = normalizeItems(result?.data)

  return {
    items,
    source: safeString(result?.source, "fallback"),
    quote: safeString(result?.quote, DEFAULT_QUOTE),
    count: items.length,
    warnings: uniqueWarnings(result?.meta?.warnings),
    error: typeof result?.error === "string" && result.error.trim().length > 0 ? result.error : null,
  }
}

async function resolveBaseUrl(): Promise<string | null> {
  try {
    const h = await headers()

    const forwardedHost = h.get("x-forwarded-host")
    const host = forwardedHost ?? h.get("host")
    const forwardedProto = h.get("x-forwarded-proto")

    if (host && host.trim().length > 0) {
      const normalizedHost = host.trim()
      const protocol =
        forwardedProto ??
        (normalizedHost.includes("localhost") || normalizedHost.startsWith("127.0.0.1")
          ? "http"
          : "https")

      return `${protocol}://${normalizedHost}`
    }

    if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
      return process.env.NEXT_PUBLIC_SITE_URL.trim()
    }

    if (process.env.VERCEL_URL?.trim()) {
      return `https://${process.env.VERCEL_URL.trim()}`
    }

    return null
  } catch {
    if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
      return process.env.NEXT_PUBLIC_SITE_URL.trim()
    }

    if (process.env.VERCEL_URL?.trim()) {
      return `https://${process.env.VERCEL_URL.trim()}`
    }

    return null
  }
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

async function getMarketState(): Promise<MarketStateResult> {
  const baseUrl = await resolveBaseUrl()

  if (!baseUrl) {
    return {
      state: null,
      warning: "market_state_base_url_unavailable",
    }
  }

  const internalKey = process.env.XYVALA_INTERNAL_KEY?.trim()

  if (!internalKey) {
    return {
      state: null,
      warning: "market_state_internal_key_missing",
    }
  }

  const result = await withTimeout<MarketStateResult>(
    async (signal) => {
      const res = await fetch(`${baseUrl}/api/state?quote=${DEFAULT_QUOTE}`, {
        method: "GET",
        headers: {
          "x-xyvala-key": internalKey,
        },
        cache: "no-store",
        signal,
      })

      if (!res.ok) {
        return {
          state: null,
          warning: `market_state_http_${res.status}`,
        }
      }

      const json = (await res.json()) as MarketStateApiResponse

      if (json?.ok !== true) {
        return {
          state: null,
          warning:
            typeof json?.error === "string" && json.error.trim().length > 0
              ? json.error
              : "market_state_unavailable",
        }
      }

      return {
        state: json?.state ?? null,
        warning: null,
      }
    },
    MARKET_STATE_TIMEOUT_MS,
    {
      state: null,
      warning: "market_state_fetch_timeout_or_failed",
    }
  )

  return result
}

function InfoPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1 text-xs text-neutral-300">
      {children}
    </span>
  )
}

function NoticeBox({
  title,
  children,
  tone = "neutral",
}: {
  title: string
  children: React.ReactNode
  tone?: "neutral" | "warning" | "error" | "info"
}) {
  const toneClasses =
    tone === "error"
      ? "border-red-500/20 bg-red-500/5 text-red-200"
      : tone === "warning"
        ? "border-amber-500/20 bg-amber-500/5 text-amber-200"
        : tone === "info"
          ? "border-blue-500/20 bg-blue-500/5 text-blue-200"
          : "border-neutral-800 bg-neutral-900/60 text-neutral-200"

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-1 text-sm opacity-90">{children}</div>
    </div>
  )
}

export default async function ScanPage() {
  let fatalError: string | null = null
  let viewModel: ScanPageViewModel = buildScanViewModel(null)
  let marketState: MarketState | null = null
  const pageWarnings: string[] = []

  const [scanResult, stateResult] = await Promise.allSettled([
    getXyvalaScan({
      quote: DEFAULT_QUOTE,
      sort: DEFAULT_SORT,
      limit: DEFAULT_LIMIT,
    }),
    getMarketState(),
  ])

  if (scanResult.status === "fulfilled") {
    viewModel = buildScanViewModel(scanResult.value)
  } else {
    fatalError =
      scanResult.reason instanceof Error && scanResult.reason.message
        ? scanResult.reason.message
        : "scan_page_failed"
  }

  if (stateResult.status === "fulfilled") {
    marketState = stateResult.value.state

    if (stateResult.value.warning) {
      pageWarnings.push(stateResult.value.warning)
    }
  } else {
    pageWarnings.push("market_state_request_failed")
  }

  const items = viewModel.items
  const allWarnings = uniqueWarnings(viewModel.warnings, pageWarnings)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Xyvala Scan</h1>

          <p className="mt-2 text-sm text-neutral-500">
            Structured crypto scan ranked by confidence score.
          </p>
        </div>

        {!fatalError && (
          <div className="flex flex-wrap gap-2">
            <InfoPill>Source: {viewModel.source}</InfoPill>
            <InfoPill>Quote: {viewModel.quote.toUpperCase()}</InfoPill>
            <InfoPill>Assets: {viewModel.count}</InfoPill>
          </div>
        )}
      </div>

      {fatalError ? (
        <div className="mb-6">
          <NoticeBox title="Erreur de chargement" tone="error">
            {fatalError}
          </NoticeBox>
        </div>
      ) : null}

      {!fatalError && viewModel.error ? (
        <div className="mb-6">
          <NoticeBox title="Source partiellement dégradée" tone="warning">
            {viewModel.error}
          </NoticeBox>
        </div>
      ) : null}

      {!fatalError && allWarnings.length > 0 ? (
        <div className="mb-6">
          <NoticeBox title="Warnings" tone="neutral">
            <ul className="space-y-1">
              {allWarnings.map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
            </ul>
          </NoticeBox>
        </div>
      ) : null}

      {!fatalError ? (
        <div className="mb-6">
          <MarketStatePanel state={marketState} />
        </div>
      ) : null}

      {!fatalError ? <ScanTable items={items} /> : null}
    </main>
  )
}
