import React from "react"

type MarketState = {
  market_regime?: string | null
  volatility_state?: string | null
  liquidity_state?: string | null
  risk_mode?: string | null
  execution_bias?: string | null
}

function Pill({
  label,
  value
}: {
  label: string
  value?: string | null
}) {
  if (!value) return null

  return (
    <span className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-300">
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
      <div className="rounded-xl border border-neutral-800 p-4 text-sm text-neutral-400">
        Market state unavailable
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-neutral-800 p-4 bg-neutral-950">
      <div className="flex flex-wrap gap-2">

        <Pill label="Regime" value={state.market_regime} />

        <Pill label="Volatility" value={state.volatility_state} />

        <Pill label="Liquidity" value={state.liquidity_state} />

        <Pill label="Risk" value={state.risk_mode} />

        <Pill label="Bias" value={state.execution_bias} />

      </div>
    </div>
  )
}
