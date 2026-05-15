/* ============================================================================
 * FILE: lib/xyvala/assets/assets-builder.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public assets response builder
 *
 * ROLE
 * - build deterministic public assets responses
 * - centralize assets response shaping
 * - isolate response construction from route and service orchestration
 *
 * PARENTS
 * - lib/xyvala/snapshot.ts
 * - lib/xyvala/contracts/scan-contract.ts
 * - lib/xyvala/services/scan-query.ts
 * - lib/xyvala/assets/assets-cache.ts
 *
 * DIRECTIVES
 * - builder layer only
 * - public descriptive output only
 * - no route logic
 * - no cache access
 * - no provider logic
 * - no query logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no regime exposure
 * - no decision exposure
 * - no opportunity exposure
 * - no stability score exposure
 * - no broker / affiliate exposure
 * - EUR is the default public currency
 * - same input => same output shape
 * ========================================================================== */

import type { Quote } from "@/lib/xyvala/snapshot";
import { XYVALA_SNAPSHOT_VERSION } from "@/lib/xyvala/snapshot";

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

import type {
  ScanSortKey,
  ScanSortOrder,
} from "@/lib/xyvala/services/scan-query";

import type { AssetsCacheState } from "@/lib/xyvala/assets/assets-cache";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const DEFAULT_MARKET = "crypto" as const;
const DEFAULT_QUOTE: Quote = "eur";
const DEFAULT_SORT: ScanSortKey = "rank";
const DEFAULT_ORDER: ScanSortOrder = "asc";

/* ============================================================================
 * 2. TYPES
 * ========================================================================== */

export type AssetsCurrency = "EUR" | "USD" | "USDT";

export type AssetsResponseSource = "scan" | "fallback" | "cache";

export type AssetsResponseMeta = {
  q: string | null;
  sort: ScanSortKey;
  order: ScanSortOrder;
  limit: number;
  cursor: string | null;
  next_cursor: string | null;
  cache: AssetsCacheState;
  region: "EU";
  currency: AssetsCurrency;
  warnings: string[];
};

export type AssetsResponse = {
  ok: boolean;
  ts: string;
  version: string;
  source: AssetsResponseSource;
  market: "crypto";
  quote: Quote;
  count: number;
  total: number;
  data: ScanAsset[];
  meta: AssetsResponseMeta;
  error: string | null;
};

export type BuildAssetsResponseInput = {
  ok: boolean;
  source: AssetsResponseSource;
  quote: Quote;
  q: string | null;
  sort: ScanSortKey;
  order: ScanSortOrder;
  limit: number;
  cursor: number;
  nextCursor: string | null;
  cache: AssetsCacheState;
  data: ScanAsset[];
  total: number;
  warnings: string[];
  error: string | null;
};

export type BuildAssetsErrorResponseInput = {
  quote?: Quote;
  q?: string | null;
  sort?: ScanSortKey;
  order?: ScanSortOrder;
  limit?: number;
  cursor?: number;
  warnings?: string[];
  error: string;
};

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function quoteToCurrency(quote: Quote): AssetsCurrency {
  if (quote === "usd") return "USD";
  if (quote === "usdt") return "USDT";

  return "EUR";
}

function safeLimit(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

function safeCursor(value: number): string {
  return Number.isFinite(value) && value >= 0 ? String(Math.trunc(value)) : "0";
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  return [
    ...new Set(
      groups
        .flatMap((group) => (Array.isArray(group) ? group : []))
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        ),
    ),
  ];
}

/* ============================================================================
 * 4. RESPONSE BUILDERS
 * ========================================================================== */

export function buildAssetsResponse(
  input: BuildAssetsResponseInput,
): AssetsResponse {
  return {
    ok: input.ok,
    ts: nowIso(),
    version: XYVALA_SNAPSHOT_VERSION,
    source: input.source,
    market: DEFAULT_MARKET,
    quote: input.quote,
    count: input.data.length,
    total: input.total,
    data: input.data,
    meta: {
      q: input.q,
      sort: input.sort,
      order: input.order,
      limit: safeLimit(input.limit),
      cursor: safeCursor(input.cursor),
      next_cursor: input.nextCursor,
      cache: input.cache,
      region: "EU",
      currency: quoteToCurrency(input.quote),
      warnings: uniqueWarnings(input.warnings),
    },
    error: input.error,
  };
}

export function buildAssetsErrorResponse(
  input: BuildAssetsErrorResponseInput,
): AssetsResponse {
  const quote = input.quote ?? DEFAULT_QUOTE;
  const sort = input.sort ?? DEFAULT_SORT;
  const order = input.order ?? DEFAULT_ORDER;
  const limit = input.limit ?? 0;
  const cursor = input.cursor ?? 0;

  return buildAssetsResponse({
    ok: false,
    source: "fallback",
    quote,
    q: input.q ?? null,
    sort,
    order,
    limit,
    cursor,
    nextCursor: null,
    cache: "no-store",
    data: [],
    total: 0,
    warnings: uniqueWarnings(input.warnings, ["assets_response_error"]),
    error: input.error,
  });
}
