// components/market-state.tsx

import React from "react"

export type MarketRegime =
  | "STABLE"
  | "TRANSITION"
  | "VOLATILE"

export type MarketState = {
  market_regime?: string | null
  volatility_state?: string | null
  liquidity_state?: string | null
  risk_mode?: string | null
  execution_bias?: string | null
}

function normalizeRegime(value?: string | null): MarketRegime | null {

  if (!value) return null

  const v = value.toUpperCase()

  if (v === "STABLE") return "STABLE"
  if (v === "TRANSITION") return "TRANSITION"
  if (v === "VOLATILE") return "VOLATILE"

  return null
}

function getRegimeColor(regime: MarketRegime | null) {

  switch (regime) {

    case "STABLE":
      return "text-emerald-400 border-emerald-700 bg-emerald-950"

    case "VOLATILE":
      return "text-red-400 border-red-700 bg-red-950"

    case "TRANSITION":
      return "text-amber-400 border-amber-700 bg-amber-950"

    default:
      return "text-neutral-400 border-neutral-700 bg-neutral-900"
  }
}

function Pill({
  label,
  value,
  highlight
}: {
  label: string
  value?: string | null
  highlight?: boolean
}) {

  if (!value) return null

  const regime = highlight ? normalizeRegime(value) : null

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs ${
        highlight
          ? getRegimeColor(regime)
          : "border-neutral-800 bg-neutral-900 text-neutral-300"
      }`}
    >
      {label}: {value}
    </span>
  )
}

export function MarketStatePanel({
  state
}: {
  state: MarketState | null
}) {

  if (!state) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-400">
        Market context unavailable
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">

      <div className="flex flex-wrap gap-2">

        <Pill
          label="Regime"
          value={state.market_regime}
          highlight
        />

        <Pill
          label="Volatility"
          value={state.volatility_state}
        />

        <Pill
          label="Liquidity"
          value={state.liquidity_state}
        />

        <Pill
          label="Risk"
          value={state.risk_mode}
        />

        <Pill
          label="Bias"
          value={state.execution_bias}
        />

      </div>

    </div>
  )
}

export default MarketStatePanel
