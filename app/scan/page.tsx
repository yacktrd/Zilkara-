// app/scan/page.tsx

import { getXyvalaScan, type ScanAsset } from "@/lib/xyvala/scan"
import { ScanTable } from "@/components/scan-table"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

type ScanTableItem = ScanAsset & {
  affiliate_url: string
}

type MarketState = {
  market_regime?: string
  volatility_state?: string
  liquidity_state?: string
  risk_mode?: string
  execution_bias?: string
}

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function normalizeItems(items: ScanAsset[]): ScanTableItem[] {
  return safeArray(items).map((item) => ({
    ...item,
    affiliate_url: item.affiliate_url ?? item.binance_url
  }))
}

async function getMarketState(): Promise<MarketState | null> {

  try {

    const res = await fetch("/api/state", {
      cache: "no-store"
    })

    if (!res.ok) return null

    const json = await res.json()

    return json?.state ?? null

  } catch {

    return null

  }

}

function Pill({ children }: { children: React.ReactNode }) {

  return (
    <span className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1 text-xs text-neutral-300">
      {children}
    </span>
  )

}

function StatePill({
  label,
  value
}: {
  label: string
  value?: string
}) {

  if (!value) return null

  return (
    <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs text-neutral-200">
      {label}: {value}
    </span>
  )

}

export default async function ScanPage() {

  let scanResult: Awaited<ReturnType<typeof getXyvalaScan>> | null = null
  let marketState: MarketState | null = null
  let fatalError: string | null = null

  try {

    const [scan, state] = await Promise.all([

      getXyvalaScan({
        quote: "usd",
        sort: "score_desc",
        limit: 100
      }),

      getMarketState()

    ])

    scanResult = scan
    marketState = state

  } catch (err) {

    fatalError =
      err instanceof Error
        ? err.message
        : "scan_page_failed"

  }

  const items = normalizeItems(scanResult?.data)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">

      <div className="mb-6 flex flex-col gap-4">

        <div>

          <h1 className="text-2xl font-semibold tracking-tight">
            Xyvala Scan
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            Structured crypto scan ranked by confidence score
          </p>

        </div>

        {scanResult && (

          <div className="flex flex-wrap gap-2">

            <Pill>Source: {scanResult.source}</Pill>

            <Pill>
              Quote: {scanResult.quote?.toUpperCase()}
            </Pill>

            <Pill>
              Assets: {items.length}
            </Pill>

          </div>

        )}

        {marketState && (

          <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-800">

            <StatePill
              label="Regime"
              value={marketState.market_regime}
            />

            <StatePill
              label="Volatility"
              value={marketState.volatility_state}
            />

            <StatePill
              label="Liquidity"
              value={marketState.liquidity_state}
            />

            <StatePill
              label="Risk"
              value={marketState.risk_mode}
            />

            <StatePill
              label="Bias"
              value={marketState.execution_bias}
            />

          </div>

        )}

      </div>

      {fatalError && (

        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm">
          {fatalError}
        </div>

      )}

      {!fatalError && (
        <ScanTable items={items} />
      )}

    </main>
  )
}
