import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Regime = "STABLE" | "TRANSITION" | "VOLATILE"

type ScanAsset = {
  name: string
  symbol: string
  price: number
  chg_24h_pct: number
  stability_score: number
  regime: Regime
  confidence_score: number
  binance_url: string | null
}

type ScanResponse = {
  ok: boolean
  ts: number
  data: ScanAsset[]
}

const LIMIT = 150
const CACHE_TTL = 20_000

let memory: {
  prevScores: Record<string, number>
  prevRegimes: Record<string, Regime>
  ts: number
} | null = null

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function computeStabilityScore(change24: number): number {
  const abs = Math.abs(change24)
  const score = 100 - abs * 2
  return clamp(Math.round(score), 0, 100)
}

function computeRegime(change24: number): Regime {
  const abs = Math.abs(change24)
  if (abs < 5) return "STABLE"
  if (abs < 12) return "TRANSITION"
  return "VOLATILE"
}

function computeConfidence(
  stability: number,
  regime: Regime,
  prevScore?: number,
  prevRegime?: Regime
): number {
  let score = stability

  if (regime === "TRANSITION") score -= 10
  if (regime === "VOLATILE") score -= 25

  if (prevScore !== undefined && Math.abs(stability - prevScore) >= 8) {
    score -= 5
  }

  if (prevRegime && prevRegime !== regime) {
    score -= 10
  }

  return clamp(Math.round(score), 0, 100)
}

function buildBinanceUrl(symbol: string) {
  if (!symbol.endsWith("USDT")) return null
  const base = symbol.replace("USDT", "")
  return `https://www.binance.com/en/trade/${base}_USDT?type=spot`
}

async function fetchCoinGecko() {
  const url =
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=250&page=1&sparkline=false"

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  const res = await fetch(url, {
    signal: controller.signal,
    headers: { Accept: "application/json" }
  })

  clearTimeout(timeout)

  if (!res.ok) throw new Error("CoinGecko error")

  return res.json()
}

export async function GET() {
  try {
    const now = Date.now()

    if (memory && now - memory.ts < CACHE_TTL) {
      return NextResponse.json({
        ok: true,
        ts: memory.ts,
        data: Object.values(memory.prevScores) as unknown as ScanAsset[]
      })
    }

    const raw = await fetchCoinGecko()

    const data: ScanAsset[] = raw.slice(0, LIMIT).map((coin: any) => {
      const name = String(coin.name ?? "").trim()
      const symbol = String(coin.symbol ?? "").toUpperCase() + "USDT"
      const price = Number(coin.current_price ?? 0)
      const change = Number(coin.price_change_percentage_24h ?? 0)

      const stability = computeStabilityScore(change)
      const regime = computeRegime(change)

      const prevScore = memory?.prevScores[symbol]
      const prevRegime = memory?.prevRegimes[symbol]

      const confidence = computeConfidence(
        stability,
        regime,
        prevScore,
        prevRegime
      )

      return {
        name,
        symbol,
        price,
        chg_24h_pct: change,
        stability_score: stability,
        regime,
        confidence_score: confidence,
        binance_url: buildBinanceUrl(symbol)
      }
    })

    // Update memory snapshot
    memory = {
      prevScores: Object.fromEntries(
        data.map((a) => [a.symbol, a.stability_score])
      ),
      prevRegimes: Object.fromEntries(
        data.map((a) => [a.symbol, a.regime])
      ),
      ts: now
    }

    const response: ScanResponse = {
      ok: true,
      ts: now,
      data
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        ts: Date.now(),
        data: [],
        error: "Scan failed"
      },
      { status: 500 }
    )
  }
}
