/* ============================================================================
 * FILE: lib/xyvala/snapshot.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala passive scan snapshot contract
 *
 * ROLE
 * - expose snapshot contract types
 * - expose runtime constants used by scan services and API routes
 * - validate passive scan snapshots without transforming market data
 *
 * DIRECTIVES
 * - contract and guard layer only
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no API logic
 * - no UI logic
 * - no deep asset normalization
 * - no market reconstruction
 * - snapshot is passive contract truth
 * - scan-transformer.ts / upstream services own data normalization
 * - undefined must never be exposed
 * - null is accepted only when the ScanAsset contract allows it
 * ========================================================================== */

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

/* ============================================================================
 * 1. RUNTIME CONSTANTS
 * ========================================================================== */

export const XYVALA_SNAPSHOT_VERSION = "v1" as const;

export const XYVALA_MARKETS = ["crypto"] as const;
export const XYVALA_QUOTES = ["eur", "usd", "usdt"] as const;
export const XYVALA_SNAPSHOT_SOURCES = ["scan", "fallback", "cache"] as const;

export const XYVALA_SORT_KEYS = [
  "rank",
  "price",
  "market_cap",
  "volume_24h",
  "change_24h",
  "change_7d",
] as const;

export const XYVALA_SORT_ORDERS = ["asc", "desc"] as const;

/* ============================================================================
 * 2. CONTRACT TYPES
 * ========================================================================== */

export type SnapshotVersion = typeof XYVALA_SNAPSHOT_VERSION;
export type Market = (typeof XYVALA_MARKETS)[number];
export type Quote = (typeof XYVALA_QUOTES)[number];
export type SnapshotSource = (typeof XYVALA_SNAPSHOT_SOURCES)[number];
export type SnapshotSortKey = (typeof XYVALA_SORT_KEYS)[number];
export type SnapshotSortOrder = (typeof XYVALA_SORT_ORDERS)[number];

export type ScanSnapshotMeta = {
  limit: number;
  sort: SnapshotSortKey;
  order: SnapshotSortOrder;
  q: string | null;
  warnings: string[];
};

export type ScanSnapshot = {
  ok: boolean;
  ts: string;
  version: SnapshotVersion;
  source: SnapshotSource;
  market: Market;
  quote: Quote;
  count: number;
  data: ScanAsset[];
  meta: ScanSnapshotMeta;
  error?: string | null;
};

/* ============================================================================
 * 3. SAFE GUARD HELPERS
 * ========================================================================== */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNullableNumberArray(value: unknown): value is number[] | null {
  return (
    value === null ||
    (Array.isArray(value) &&
      value.every((item) => typeof item === "number" && Number.isFinite(item)))
  );
}

function isMarket(value: unknown): value is Market {
  return XYVALA_MARKETS.includes(value as Market);
}

function isQuote(value: unknown): value is Quote {
  return XYVALA_QUOTES.includes(value as Quote);
}

function isSnapshotSource(value: unknown): value is SnapshotSource {
  return XYVALA_SNAPSHOT_SOURCES.includes(value as SnapshotSource);
}

function isSnapshotSortKey(value: unknown): value is SnapshotSortKey {
  return XYVALA_SORT_KEYS.includes(value as SnapshotSortKey);
}

function isSnapshotSortOrder(value: unknown): value is SnapshotSortOrder {
  return XYVALA_SORT_ORDERS.includes(value as SnapshotSortOrder);
}

/* ============================================================================
 * 4. ASSET GUARD
 * ========================================================================== */

function isScoreStatus(value: unknown): value is "computed" {
  return value === "computed";
}

export function isScanAsset(value: unknown): value is ScanAsset {
  if (!isPlainObject(value)) return false;

  /* --------------------------------------------------------------------------
   * Identity
   * ------------------------------------------------------------------------ */

  if (!isNonEmptyString(value.id)) return false;
  if (!isNonEmptyString(value.symbol)) return false;
  if (!isNonEmptyString(value.name)) return false;

  /* --------------------------------------------------------------------------
   * Market data
   * ------------------------------------------------------------------------ */

  if (!isNullableFiniteNumber(value.price)) return false;
  if (!isNullableFiniteNumber(value.chg_24h_pct)) return false;
  if (!isNullableFiniteNumber(value.chg_7d_pct)) return false;

  if (!isNullableFiniteNumber(value.market_cap)) return false;
  if (!isNullableFiniteNumber(value.volume_24h)) return false;

  /* --------------------------------------------------------------------------
   * Public structural reading
   * ------------------------------------------------------------------------ */

  if (!isNullableFiniteNumber(value.stability_score)) return false;
  if (!isScoreStatus(value.stability_status)) return false;

  /* --------------------------------------------------------------------------
   * Visual support
   * ------------------------------------------------------------------------ */

  if (!isNullableNumberArray(value.sparkline_7d)) return false;

  /* --------------------------------------------------------------------------
   * Metadata
   * ------------------------------------------------------------------------ */

  if (!isNullableFiniteNumber(value.rank)) return false;
  if (!isNullableString(value.logo_url)) return false;

  return true;
}

/* ============================================================================
 * 5. SNAPSHOT GUARD
 * ========================================================================== */

export function isScanSnapshot(value: unknown): value is ScanSnapshot {
  if (!isPlainObject(value)) return false;

  if (typeof value.ok !== "boolean") return false;
  if (!isNonEmptyString(value.ts)) return false;
  if (value.version !== XYVALA_SNAPSHOT_VERSION) return false;

  if (!isSnapshotSource(value.source)) return false;
  if (!isMarket(value.market)) return false;
  if (!isQuote(value.quote)) return false;

  if (!isFiniteNumber(value.count)) return false;
  if (!Array.isArray(value.data)) return false;
  if (!value.data.every(isScanAsset)) return false;

  if (value.count !== value.data.length) return false;

  if (value.error !== undefined && value.error !== null && typeof value.error !== "string") {
    return false;
  }

  if (!isPlainObject(value.meta)) return false;

  const meta = value.meta;

  if (!isFiniteNumber(meta.limit)) return false;
  if (!isSnapshotSortKey(meta.sort)) return false;
  if (!isSnapshotSortOrder(meta.order)) return false;
  if (meta.q !== null && typeof meta.q !== "string") return false;
  if (!isStringArray(meta.warnings)) return false;

  return true;
}
