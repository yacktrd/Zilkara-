
// lib/xyvala/contracts/scan-contract.ts 

export type Regime =
  | "STABLE"
  | "TRANSITION"
  | "VOLATILE";

export interface ScanAsset {
  id: string;
  symbol: string;
  name: string;

  price: number;
  chg_24h_pct: number;
  confidence_score: number;

  score_delta: number | null;
  score_trend: string | null;

  regime: Regime;

  market_cap?: number;
  volume_24h?: number;

  binance_url: string;
}
