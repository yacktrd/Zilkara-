import { NextResponse } from 'next/server'

/* ============================= TYPES ============================= */

type Regime = 'STABLE' | 'TRANSITION' | 'VOLATILE'
type Quote = 'USD' | 'EUR' | 'USDT'
type SortKey = 'score' | 'price'
type SortDir = 'asc' | 'desc'

type ScanAsset = {
  id: string
  symbol: string
  name: string
  price: number | null
  chg_24h_pct: number | null
  confidence_score: number | null
  regime: Regime
  binance_url: string | null
  affiliate_url: string | null
  market_cap: number | null
  volume_24h: number | null
  score_delta: number | null
  score_trend: 'up' | 'down' | null
}

type ScanResponse = {
  ok: boolean
  ts: string
  source: 'provider' | 'cache' | 'fallback'
  quote: Quote
  count: number
  data: ScanAsset[]
  message: string | null
  error?: string
}

/* ============================= UTILS ============================= */

const NOW = () => new Date().toISOString()
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

const asNum = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

const asStr = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null

/* ============================= STABLECOINS EXCLUDE ============================= */

const STABLECOINS = new Set([
  'USDT','USDC','DAI','TUSD','FDUSD','USDP','BUSD','EURC','USDE'
])

const isStablecoin = (symbol: string) =>
  STABLECOINS.has(symbol.toUpperCase())

/* ============================= VOLATILITY ENGINE V2 ============================= */

function computeRegime(chg: number | null): Regime {
  if (chg === null) return 'TRANSITION'
  const a = Math.abs(chg)
  if (a < 1) return 'STABLE'
  if (a > 4) return 'VOLATILE'
  return 'TRANSITION'
}

/**
 * Volatility scoring logic (opportunity oriented)
 */
function volatilityComponent(chg: number | null): number {
  if (chg === null) return 0

  const a = Math.abs(chg)

  if (a < 0.2) return -15        // mort
  if (a < 1) return 0            // neutre
  if (a <= 3) return 20          // zone idéale
  if (a <= 6) return 5           // exploitable mais moins propre
  return -20                     // chaos
}

function computeScore(params: {
  chg: number | null
  marketCap: number | null
  volume: number | null
}): number {

  let score = 50

  // Market cap bonus (log)
  if (params.marketCap && params.marketCap > 0) {
    score += clamp(Math.log10(params.marketCap) - 6, 0, 15)
  }

  // Volume bonus (liquidité)
  if (params.volume && params.volume > 0) {
    score += clamp(Math.log10(params.volume) - 5, 0, 10)
  }

  // Volatility opportunity component
  score += volatilityComponent(params.chg)

  return clamp(Math.round(score), 0, 100)
}

/* ============================= BINANCE LINKS ============================= */

function makeBinanceUrls(symbol: string, quote: Quote) {
  const q = quote === 'EUR' ? 'EUR' : 'USDT'
  const pair = `${symbol}${q}`
  return {
    binance_url: `https://www.binance.com/en/trade/${pair}`,
    affiliate_url: `https://www.binance.com/en/trade/${pair}?ref=YOUR_REF`
  }
}

/* ============================= CACHE ============================= */

const TTL = 60_000
let CACHE: { ts: number; data: ScanAsset[] } | null = null
let SNAPSHOT: { ts: number; data: ScanAsset[] } | null = null

/* ============================= PROVIDER ============================= */

async function fetchCoinGecko(quote: Quote): Promise<ScanAsset[]> {

  const vs = quote === 'EUR' ? 'eur' : 'usd'

  const url = new URL('https://api.coingecko.com/api/v3/coins/markets')
  url.searchParams.set('vs_currency', vs)
  url.searchParams.set('order', 'market_cap_desc')
  url.searchParams.set('per_page', '50')
  url.searchParams.set('page', '1')
  url.searchParams.set('price_change_percentage', '24h')

  const res = await fetch(url.toString(), { cache: 'no-store' })

  if (!res.ok) throw new Error('CoinGecko error')

  const json = await res.json()

  return json
    .map((c: any) => {

      const symbol = asStr(c.symbol)?.toUpperCase()
      if (!symbol || isStablecoin(symbol)) return null

      const price = asNum(c.current_price)
      const chg = asNum(c.price_change_percentage_24h)
      const marketCap = asNum(c.market_cap)
      const volume = asNum(c.total_volume)

      const score = computeScore({ chg, marketCap, volume })
      const regime = computeRegime(chg)

      const { binance_url, affiliate_url } = makeBinanceUrls(symbol, quote)

      return {
        id: c.id,
        symbol,
        name: c.name,
        price,
        chg_24h_pct: chg,
        confidence_score: score,
        regime,
        binance_url,
        affiliate_url,
        market_cap: marketCap,
        volume_24h: volume,
        score_delta: null,
        score_trend: null
      } as ScanAsset

    })
    .filter(Boolean)
}

/* ============================= HANDLER ============================= */

export async function GET(req: Request) {

  const ts = NOW()

  try {

    const url = new URL(req.url)
    const quote = (url.searchParams.get('quote') || 'USD') as Quote
    const limit = clamp(Number(url.searchParams.get('limit') || 6), 1, 50)

    // CACHE HIT
    if (CACHE && Date.now() - CACHE.ts < TTL) {
      return NextResponse.json({
        ok: true,
        ts,
        source: 'cache',
        quote,
        count: CACHE.data.slice(0, limit).length,
        data: CACHE.data.slice(0, limit),
        message: null
      } satisfies ScanResponse)
    }

    // PROVIDER
    let data: ScanAsset[] = []

    try {
      data = await fetchCoinGecko(quote)
    } catch {
      data = []
    }

    let source: ScanResponse['source'] = 'provider'

    if (data.length > 0) {
      data.sort((a,b)=> (b.confidence_score ?? 0) - (a.confidence_score ?? 0))
      CACHE = { ts: Date.now(), data }
      SNAPSHOT = { ts: Date.now(), data }
    }
    else if (SNAPSHOT?.data?.length) {
      source = 'cache'
      data = SNAPSHOT.data
    }
    else {
      source = 'fallback'
      data = []
    }

    const finalData = data.slice(0, limit)

    return NextResponse.json({
      ok: true,
      ts,
      source,
      quote,
      count: finalData.length,
      data: finalData,
      message: null
    } satisfies ScanResponse)

  } catch (e:any) {

    return NextResponse.json({
      ok: false,
      ts,
      source: 'fallback',
      quote: 'USD',
      count: 0,
      data: [],
      message: 'scan_failed',
      error: e?.message ?? 'unknown'
    } satisfies ScanResponse, { status: 500 })
  }
}
