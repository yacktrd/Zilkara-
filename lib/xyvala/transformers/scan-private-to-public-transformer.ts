/* ============================================================================
 * FILE: lib/xyvala/transformers/scan-private-to-public-transformer.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private-to-public scan transformer
 *
 * ROLE
 * - project PrivateScanAsset into the public ScanAsset contract
 * - expose descriptive market-display fields only
 * - add public structure labels from observable public fields
 * - prevent analytical, decision, scoring and broker leakage
 *
 * DIRECTIVES
 * - transformer boundary only
 * - private input accepted
 * - public output only
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no UI logic
 * - no API logic
 * - no broker / affiliation exposure
 * - no fallback guessing
 * - undefined must never be exposed
 * - null means explicitly unavailable
 * - number means confirmed observable value
 * - same input => same public output shape
 * ========================================================================== */

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";
import type { PrivateScanAsset } from "@/lib/xyvala/contracts/scan-private-contract";

import { buildPublicStructure } from "@/lib/xyvala/public/public-structure";

/* ============================================================================
 * 1. SAFE HELPERS
 * ========================================================================== */

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeNullableString(value: unknown): string | null {
  const normalized = safeString(value);
  return normalized.length > 0 ? normalized : null;
}

function safeNullableNumber(value: unknown): number | null {
  return isFiniteNumber(value) ? value : null;
}

function safeNullableNumberArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;

  const numbers = value.filter(isFiniteNumber);

  return numbers.length >= 2 ? numbers : null;
}

/* ============================================================================
 * 2. PUBLIC PROJECTION
 * ========================================================================== */

export function privateScanAssetToPublicScanAsset(
  asset: PrivateScanAsset,
): ScanAsset {
  const symbol = safeString(asset.symbol, "UNKNOWN").toUpperCase();
  const name = safeString(asset.name, symbol);

  const price = safeNullableNumber(asset.price);
  const chg24h = safeNullableNumber(asset.chg_24h_pct);
  const chg7d = safeNullableNumber(asset.chg_7d_pct);
  const marketCap = safeNullableNumber(asset.market_cap);
  const volume24h = safeNullableNumber(asset.volume_24h);
  const sparkline7d = safeNullableNumberArray(asset.sparkline_7d);

  const publicStructure = buildPublicStructure({
    pct_24h: chg24h,
    pct_7d: chg7d,
    volume_24h: volume24h,
    market_cap: marketCap,
    sparkline_7d: sparkline7d,
  });

  return {
    id: safeString(asset.id, symbol.toLowerCase()),
    symbol,
    name,

    price,
    chg_24h_pct: chg24h,
    chg_7d_pct: chg7d,

    market_cap: marketCap,
    volume_24h: volume24h,

    sparkline_7d: sparkline7d,

    public_activity: publicStructure.activity,
    public_sparkline_context_7d: publicStructure.sparkline_context_7d,
    public_structure_transition: publicStructure.structure_transition,

    rank: safeNullableNumber(asset.rank),
    logo_url: safeNullableString(asset.logo_url),
  };
}

export function privateScanAssetsToPublicScanAssets(
  assets: readonly PrivateScanAsset[],
): ScanAsset[] {
  return assets.map(privateScanAssetToPublicScanAsset);
}
