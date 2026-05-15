/* ============================================================================
 * FILE: lib/sort.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public scan sorting helpers
 *
 * ROLE
 * - sort public ScanAsset lists deterministically
 * - stay aligned with the public ScanAsset contract
 *
 * DIRECTIVES
 * - public sorting only
 * - no private decision field
 * - no private regime field
 * - no private opportunity field
 * - no private stability score field
 * - no RFS recomputation
 * - no MCI recomputation
 * - no UI mutation
 * - deterministic output only
 * ========================================================================== */

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type SortMode =
  | "rank_desc"
  | "rank_asc"
  | "price_desc"
  | "price_asc"
  | "market_cap_desc"
  | "market_cap_asc"
  | "volume_desc"
  | "volume_asc"
  | "change_24h_desc"
  | "change_24h_asc"
  | "change_7d_desc"
  | "change_7d_asc";

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function safeNumber(value: number | null | undefined, fallback = -1): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeRank(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : Number.POSITIVE_INFINITY;
}

/* ============================================================================
 * 3. TIE BREAKER
 * ========================================================================== */

function tieBreak(a: ScanAsset, b: ScanAsset): number {
  const rankDelta = safeRank(a.rank) - safeRank(b.rank);

  if (rankDelta !== 0) {
    return rankDelta;
  }

  const marketCapDelta = safeNumber(b.market_cap) - safeNumber(a.market_cap);

  if (marketCapDelta !== 0) {
    return marketCapDelta;
  }

  const volumeDelta = safeNumber(b.volume_24h) - safeNumber(a.volume_24h);

  if (volumeDelta !== 0) {
    return volumeDelta;
  }

  return a.symbol.localeCompare(b.symbol);
}

/* ============================================================================
 * 4. PUBLIC SORT
 * ========================================================================== */

export function sortAssets(
  list: readonly ScanAsset[],
  sort: SortMode = "rank_asc",
): ScanAsset[] {
  const assets = [...list];

  assets.sort((a, b) => {
    switch (sort) {
      case "rank_desc": {
        const delta = safeRank(b.rank) - safeRank(a.rank);
        return delta !== 0 ? delta : tieBreak(a, b);
      }

      case "rank_asc": {
        const delta = safeRank(a.rank) - safeRank(b.rank);
        return delta !== 0 ? delta : tieBreak(a, b);
      }

      case "price_desc": {
        const delta = safeNumber(b.price) - safeNumber(a.price);
        return delta !== 0 ? delta : tieBreak(a, b);
      }

      case "price_asc": {
        const delta = safeNumber(a.price) - safeNumber(b.price);
        return delta !== 0 ? delta : tieBreak(a, b);
      }

      case "market_cap_desc": {
        const delta = safeNumber(b.market_cap) - safeNumber(a.market_cap);
        return delta !== 0 ? delta : tieBreak(a, b);
      }

      case "market_cap_asc": {
        const delta = safeNumber(a.market_cap) - safeNumber(b.market_cap);
        return delta !== 0 ? delta : tieBreak(a, b);
      }

      case "volume_desc": {
        const delta = safeNumber(b.volume_24h) - safeNumber(a.volume_24h);
        return delta !== 0 ? delta : tieBreak(a, b);
      }

      case "volume_asc": {
        const delta = safeNumber(a.volume_24h) - safeNumber(b.volume_24h);
        return delta !== 0 ? delta : tieBreak(a, b);
      }

      case "change_24h_desc": {
        const delta = safeNumber(b.chg_24h_pct) - safeNumber(a.chg_24h_pct);
        return delta !== 0 ? delta : tieBreak(a, b);
      }

      case "change_24h_asc": {
        const delta = safeNumber(a.chg_24h_pct) - safeNumber(b.chg_24h_pct);
        return delta !== 0 ? delta : tieBreak(a, b);
      }

      case "change_7d_desc": {
        const delta = safeNumber(b.chg_7d_pct) - safeNumber(a.chg_7d_pct);
        return delta !== 0 ? delta : tieBreak(a, b);
      }

      case "change_7d_asc": {
        const delta = safeNumber(a.chg_7d_pct) - safeNumber(b.chg_7d_pct);
        return delta !== 0 ? delta : tieBreak(a, b);
      }

      default:
        return tieBreak(a, b);
    }
  });

  return assets;
}
