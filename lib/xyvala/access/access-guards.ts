/*
FILE: access-guards.ts

PARENTS:
- lib/xyvala/contracts/scan-private-contract.ts

SECTIONS:
1. Types
2. Mappers
3. Guards

DIRECTIVES:
- Strict alignment with current PrivateScanAsset contract
- No public exposure logic here
- Stability remains the primary structural filter
- Decision, regime and opportunity remain private
*/

import type { PrivateScanAsset } from "@/lib/xyvala/contracts/scan-private-contract";

/* =========================
   1. TYPES
========================= */

export type AssetAccessView = {
  symbol: string;
  stability_score: number | null;
  opportunity_score: number | null;
  regime: PrivateScanAsset["regime"];
  decision: PrivateScanAsset["decision"];
};

/* =========================
   2. MAPPERS
========================= */

export function toAssetAccessView(asset: PrivateScanAsset): AssetAccessView {
  return {
    symbol: asset.symbol,
    stability_score: asset.stability_score,
    opportunity_score: asset.opportunity_score,
    regime: asset.regime,
    decision: asset.decision,
  };
}

/* =========================
   3. GUARDS
========================= */

export function isAssetTradable(asset: PrivateScanAsset): boolean {
  if (asset.decision === "ALLOW") {
    return true;
  }

  if (
    asset.regime !== "VOLATILE" &&
    (asset.stability_score ?? 0) >= 60 &&
    (asset.opportunity_score ?? 0) >= 50
  ) {
    return true;
  }

  return false;
}
