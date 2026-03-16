// lib/state.ts

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract"

export type StateAsset = Pick<
  ScanAsset,
  "symbol" | "name" | "price" | "chg_24h_pct" | "confidence_score" | "regime"
>

export async function getStateData(): Promise<StateAsset[]> {

  // Exemple placeholder
  // à remplacer par ta logique métier réelle

  const data: ScanAsset[] = [
    {
      id: "btcusdt",
      symbol: "BTCUSDT",
      name: "Bitcoin",
      price: 64000,
      chg_24h_pct: 2.1,
      confidence_score: 87,
      score_delta: null,
      score_trend: null,
      regime: "STABLE",
      market_cap: undefined,
      volume_24h: undefined,
      binance_url: "https://www.binance.com/en/trade/BTCUSDT"
    }
  ]

  return data.map(asset => ({
    symbol: asset.symbol,
    name: asset.name,
    price: asset.price,
    chg_24h_pct: asset.chg_24h_pct,
    confidence_score: asset.confidence_score,
    regime: asset.regime
  }))
}
