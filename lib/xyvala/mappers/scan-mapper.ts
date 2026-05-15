/* ============================================================================
 * FILE: lib/xyvala/mappers/scan-mapper.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public scan mapper
 *
 * ROLE
 * - map scan-like public items into the public ScanAsset contract
 * - produce public descriptive structure labels from observable fields only
 * - prevent private analytical fields from leaking into public output
 *
 * DIRECTIVES
 * - public mapper only
 * - no regime
 * - no decision
 * - no opportunity_score
 * - no stability_score
 * - no stability_label
 * - no consistency_score
 * - no broker / affiliate URLs
 * - no RFS recomputation
 * - no MCI recomputation
 * - null means explicitly unavailable
 * ========================================================================== */

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";
import { buildPublicStructure } from "@/lib/xyvala/public/public-structure";

type PublicScanLike = Partial<ScanAsset> & {
  key?: unknown;
  logo?: unknown;
  logoUrl?: unknown;
  image?: unknown;
  pct24h?: unknown;
  sparkline?: unknown;
};

/* ============================================================================
 * 1. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeNullableString(value: unknown): string | null {
  const valueString = safeString(value);
  return valueString.length > 0 ? valueString : null;
}

function safeNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeRank(value: unknown): number | null {
  const valueNumber = safeNullableNumber(value);

  if (valueNumber === null || valueNumber <= 0) {
    return null;
  }

  return Math.trunc(valueNumber);
}

function normalizeSparkline(value: unknown): number[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const points = value.filter(
    (item): item is number =>
      typeof item === "number" && Number.isFinite(item),
  );

  return points.length > 1 ? points : null;
}

function readLogo(item: PublicScanLike): string | null {
  return (
    safeNullableString(item.logo_url) ??
    safeNullableString(item.logo) ??
    safeNullableString(item.logoUrl) ??
    safeNullableString(item.image)
  );
}

/* ============================================================================
 * 2. PUBLIC MAPPER
 * ========================================================================== */

export function mapScanItemToAsset(item: PublicScanLike): ScanAsset {
  const symbol = safeString(item.symbol).toUpperCase() || "UNKNOWN";
  const fallbackId = symbol.toLowerCase();

  const chg24h =
    safeNullableNumber(item.chg_24h_pct) ?? safeNullableNumber(item.pct24h);
  const chg7d = safeNullableNumber(item.chg_7d_pct);
  const marketCap = safeNullableNumber(item.market_cap);
  const volume24h = safeNullableNumber(item.volume_24h);
  const sparkline7d =
    normalizeSparkline(item.sparkline_7d) ??
    normalizeSparkline(item.sparkline);

  const publicStructure = buildPublicStructure({
    pct_24h: chg24h,
    pct_7d: chg7d,
    volume_24h: volume24h,
    market_cap: marketCap,
    sparkline_7d: sparkline7d,
  });

  return {
    id: safeString(item.id) || safeString(item.key) || fallbackId,
    symbol,
    name: safeString(item.name) || symbol,

    price: safeNullableNumber(item.price),
    chg_24h_pct: chg24h,
    chg_7d_pct: chg7d,

    market_cap: marketCap,
    volume_24h: volume24h,

    sparkline_7d: sparkline7d,

    public_activity: publicStructure.activity,
    public_sparkline_context_7d: publicStructure.sparkline_context_7d,
    public_structure_transition: publicStructure.structure_transition,

    rank: safeRank(item.rank),
    logo_url: readLogo(item),
  };
}

export function mapScanItemsToAssets(items: PublicScanLike[]): ScanAsset[] {
  return items.map(mapScanItemToAsset);
}
