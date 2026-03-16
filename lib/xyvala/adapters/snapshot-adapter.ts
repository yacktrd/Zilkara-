// lib/xyvala/adapters/snapshot-adapter.ts

import { buildScanAsset } from "@/lib/xyvala/factories/scan-asset-factory";
import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

type LegacySnapshotAsset = {
  id?: string | null;
  symbol?: string | null;
  name?: string | null;
  price?: number | null;
  chg_24h_pct?: number | null;
  confidence_score?: number | null;
  regime?: string | null;
  market_cap?: number | null;
  volume_24h?: number | null;
  binance_url?: string | null;
  score_delta?: number | null;
  score_trend?: string | null;
};

export function normalizeSnapshotAsset(asset: LegacySnapshotAsset): ScanAsset {
  return buildScanAsset({
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    price: asset.price,
    chg_24h_pct: asset.chg_24h_pct,
    confidence_score: asset.confidence_score,
    regime: asset.regime,
    market_cap: asset.market_cap ?? undefined,
    volume_24h: asset.volume_24h ?? undefined,
    binance_url: asset.binance_url,
    score_delta: asset.score_delta ?? null,
    score_trend: asset.score_trend ?? null,
  });
}

export function normalizeSnapshotData(data: unknown): ScanAsset[] {
  if (!Array.isArray(data)) return [];
  return data.map((item) => normalizeSnapshotAsset(item as LegacySnapshotAsset));
}
