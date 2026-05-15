/* ============================================================================
 * FILE: components/market-state.tsx
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala market state panel
 *
 * ROLE
 * - render passive market state labels from already-normalized public data
 * - preserve null-safe UI behavior when state values are unavailable
 *
 * DIRECTIVES
 * - UI rendering only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no data reconstruction
 * - no fake fallback values
 * - deterministic rendering only
 * - undefined values must be normalized to null before display
 * ========================================================================== */

import React from "react";

type MarketState = {
  market_regime?: string | null;
  volatility_state?: string | null;
  liquidity_state?: string | null;
  risk_mode?: string | null;
  execution_bias?: string | null;
};

type PillProps = {
  label: string;
  value: string | null;
};

function normalizeDisplayValue(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function Pill({ label, value }: PillProps) {
  if (!value) return null;

  return (
    <span className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-300">
      {label}: {value}
    </span>
  );
}

export function MarketStatePanel({ state }: { state: MarketState | null }) {
  if (!state) {
    return (
      <div className="rounded-xl border border-neutral-800 p-4 text-sm text-neutral-400">
        Market state unavailable
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex flex-wrap gap-2">
        <Pill label="Regime" value={normalizeDisplayValue(state.market_regime)} />
        <Pill
          label="Volatility"
          value={normalizeDisplayValue(state.volatility_state)}
        />
        <Pill
          label="Liquidity"
          value={normalizeDisplayValue(state.liquidity_state)}
        />
        <Pill label="Risk" value={normalizeDisplayValue(state.risk_mode)} />
        <Pill label="Bias" value={normalizeDisplayValue(state.execution_bias)} />
      </div>
    </div>
  );
}
