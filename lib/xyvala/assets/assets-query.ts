/* ============================================================================
 * FILE: lib/xyvala/assets/assets-query.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public assets query utilities
 *
 * ROLE
 * - normalize public assets query parameters
 * - apply deterministic search, sort and pagination to public assets
 * - isolate assets query logic from routes, providers and services
 *
 * PARENTS
 * - lib/xyvala/snapshot.ts
 * - lib/xyvala/contracts/scan-contract.ts
 * - lib/xyvala/services/scan-query.ts
 * - lib/xyvala/assets/assets-contract.ts
 *
 * DIRECTIVES
 * - query layer only
 * - public descriptive assets only
 * - no route logic
 * - no cache logic
 * - no provider logic
 * - no response building
 * - no RFS recomputation
 * - no MCI recomputation
 * - no regime exposure
 * - no decision exposure
 * - no opportunity exposure
 * - no stability score exposure
 * - no broker / affiliate exposure
 * - EUR is the default quote
 * - deterministic output only
 * ========================================================================== */

import type { Quote } from "@/lib/xyvala/snapshot";

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

import {
  applyScanSearch,
  normalizeScanOrder,
  normalizeScanSearch,
  normalizeScanSort,
  paginateScanItems,
  sortScanItems,
  type ScanSortKey,
  type ScanSortOrder,
} from "@/lib/xyvala/services/scan-query";

import type {
  AssetsServiceInput,
  NormalizedAssetsParams,
} from "@/lib/xyvala/assets/assets-contract";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const DEFAULT_MARKET = "crypto" as const;
const DEFAULT_QUOTE: Quote = "eur";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeLower(value: unknown): string {
  return safeString(value).toLowerCase();
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;

  return Math.max(min, Math.min(max, value));
}

/* ============================================================================
 * 3. PARAMETER NORMALIZATION
 * ========================================================================== */

function normalizeQuote(value: unknown): Quote {
  const quote = safeLower(value);

  if (quote === "usd") return "usd";
  if (quote === "usdt") return "usdt";

  return DEFAULT_QUOTE;
}

function normalizeLimit(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }

  return clamp(Math.trunc(parsed), 1, MAX_LIMIT);
}

function normalizeCursor(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.trunc(parsed);
}

function normalizeMarket(value: unknown): {
  market: "crypto";
  unsupported_market: boolean;
} {
  const market = safeLower(value);

  return {
    market: DEFAULT_MARKET,
    unsupported_market: market.length > 0 && market !== DEFAULT_MARKET,
  };
}

/* ============================================================================
 * 4. PUBLIC PARAMS
 * ========================================================================== */

export function normalizeAssetsParams(
  input: AssetsServiceInput = {},
): NormalizedAssetsParams {
  const marketState = normalizeMarket(input.market);

  return {
    market: marketState.market,
    quote: normalizeQuote(input.quote),
    q: normalizeScanSearch(input.q),
    sort: normalizeScanSort(input.sort),
    order: normalizeScanOrder(input.order),
    limit: normalizeLimit(input.limit),
    cursor: normalizeCursor(input.cursor),
    noStore: input.noStore === true,
    unsupported_market: marketState.unsupported_market,
  };
}

/* ============================================================================
 * 5. PUBLIC QUERY PIPELINE
 * ========================================================================== */

export function queryAssets(input: {
  data: readonly ScanAsset[];
  q: string | null;
  sort: ScanSortKey;
  order: ScanSortOrder;
  cursor: number;
  limit: number;
}): {
  data: ScanAsset[];
  total: number;
  nextCursor: string | null;
} {
  const searched = applyScanSearch(input.data, input.q);
  const sorted = sortScanItems(searched, input.sort, input.order);

  return paginateScanItems(sorted, input.cursor, input.limit);
}

/* ============================================================================
 * 6. PUBLIC RE-EXPORT TYPES
 * ========================================================================== */

export type AssetsSortKey = ScanSortKey;
export type AssetsSortOrder = ScanSortOrder;
