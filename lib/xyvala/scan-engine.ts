// lib/xyvala/scan-engine.ts

/**
 * XYVALA Scan Engine
 * coeur du moteur de scan
 */

export type Regime = "STABLE" | "TRANSITION" | "VOLATILE"

export type ScanAsset = {
  id: string
  symbol: string
  name: string

  price: number | null
  chg_24h_pct: number | null

  confidence_score: number | null
  regime: Regime | null

  market_cap: number | null
  volume_24h: number | null
}

export type ScanContext = {
  market_regime: Regime
  stable_ratio: number
  transition_ratio: number
  volatile_ratio: number
}

/* ----------------------------- utils ----------------------------- */

function safeNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

function safeStr(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null
}

function sanitizeSymbol(symbol: string) {
  return symbol
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 20)
}

/* ----------------------------- normalize ----------------------------- */

export function normalizeAsset(raw: any): ScanAsset | null {

  const sym0 = safeStr(raw?.symbol) ?? safeStr(raw?.id)

  if (!sym0) return null

  const symbol = sanitizeSymbol(sym0)

  const name = safeStr(raw?.name) ?? symbol

  return {

    id: safeStr(raw?.id) ?? symbol,
    symbol,
    name,

    price: safeNum(raw?.price),
    chg_24h_pct: safeNum(raw?.chg_24h_pct),

    confidence_score: safeNum(raw?.confidence_score),

    regime: safeStr(raw?.regime) as Regime ?? null,

    market_cap: safeNum(raw?.market_cap),
    volume_24h: safeNum(raw?.volume_24h)

  }

}

/* ----------------------------- context ----------------------------- */

export function computeContext(data: ScanAsset[]): ScanContext {

  let stable = 0
  let transition = 0
  let volatile = 0

  for (const a of data) {

    const r = (a.regime ?? "").toUpperCase()

    if (r === "STABLE") stable++
    else if (r === "TRANSITION") transition++
    else if (r === "VOLATILE") volatile++

  }

  const total = data.length || 1

  const stable_ratio = stable / total
  const transition_ratio = transition / total
  const volatile_ratio = volatile / total

  let market_regime: Regime = "TRANSITION"

  const max = Math.max(
    stable_ratio,
    transition_ratio,
    volatile_ratio
  )

  if (max === stable_ratio) market_regime = "STABLE"
  else if (max === volatile_ratio) market_regime = "VOLATILE"

  return {
    market_regime,
    stable_ratio,
    transition_ratio,
    volatile_ratio
  }

}

/* ----------------------------- sort ----------------------------- */

export function sortAssets(
  data: ScanAsset[],
  key: "score" | "price",
  order: "asc" | "desc"
) {

  const dir = order === "asc" ? 1 : -1

  data.sort((a, b) => {

    const av =
      key === "price"
        ? a.price
        : a.confidence_score

    const bv =
      key === "price"
        ? b.price
        : b.confidence_score

    const aValid = typeof av === "number"
    const bValid = typeof bv === "number"

    if (aValid !== bValid)
      return aValid ? -1 : 1

    if (!aValid && !bValid)
      return a.symbol.localeCompare(b.symbol)

    const ax = av as number
    const bx = bv as number

    if (ax !== bx)
      return (ax - bx) * dir

    return a.symbol.localeCompare(b.symbol)

  })

}
