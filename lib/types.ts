// lib/types.ts
export type Regime = "STABLE" | "TRANSITION" | "VOLATILE";

export type Timeframe = "24H" | "7D" | "30D";

export type SortMode =
  | "rank_desc"
  | "rank_asc"
  | "price_desc"
  | "price_asc";

export type ScanAsset = {
  id: string;
  symbol: string; // BTC
  name: string;   // Bitcoin (full name)

  price_eur: number;        // always EUR in V1
  chg_24h_pct: number;      // real 24h % from source
  timeframe: Timeframe;     // requested TF, V1 uses 24H real

  // Internal decision metrics (NOT displayed in UI)
  stability_index: number;  // 0..100 (internal)
  rank_score: number;       // 0..100 (internal) => used to sort

  // Links
  binance_url: string;      // non-empty
  affiliate_url?: string;   // optional

  // Optional analytics (may be missing)
  market_cap?: number;
  volume_24h?: number;

  // Optional trend helper (internal, can be used later)
  rank_delta?: number | null;
  rank_trend?: "up" | "down" | null;
};

export type ScanResponse = {
  ok: boolean;
  ts: string;
  source: "coingecko" | "fallback" | "cache";
  market: "crypto";
  quote: "eur";
  timeframe: Timeframe;
  sort: SortMode;
  count: number;
  data: ScanAsset[];
  meta?: {
    warnings?: string[];
    cache?: "hit" | "miss" | "no-store";
  };
  error?: string;
};
