/* ============================================================================
 * FILE: lib/xyvala/assets/assets-contract.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public assets contracts
 *
 * ROLE
 * - define public assets service contracts
 * - centralize assets request, response, source, cache and metadata types
 * - keep public assets API descriptive and non-decisionnel
 *
 * PARENTS
 * - lib/xyvala/snapshot.ts
 * - lib/xyvala/contracts/scan-contract.ts
 * - lib/xyvala/services/scan-query.ts
 * - lib/xyvala/assets/assets-cache.ts
 *
 * DIRECTIVES
 * - contracts only
 * - no runtime logic
 * - no cache logic
 * - no provider logic
 * - no route logic
 * - no RFS dependency
 * - no MCI dependency
 * - no private decision exposure
 * - no regime exposure
 * - no opportunity exposure
 * - no stability score exposure
 * - no broker / affiliate exposure
 * - EUR is the default public currency
 * - null means explicitly unavailable
 * ========================================================================== */

import type { Quote } from "@/lib/xyvala/snapshot";
import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

import type {
  ScanSortKey,
  ScanSortOrder,
} from "@/lib/xyvala/services/scan-query";

import type { AssetsCacheState } from "@/lib/xyvala/assets/assets-cache";

/* ============================================================================
 * 1. PUBLIC ASSETS TYPES
 * ========================================================================== */

export type AssetsMarket = "crypto";

export type AssetsCurrency = "EUR" | "USD" | "USDT";

export type AssetsResponseSource = "scan" | "fallback" | "cache";

export type AssetsItem = ScanAsset;

/* ============================================================================
 * 2. SERVICE INPUT
 * ========================================================================== */

export type AssetsServiceInput = {
  market?: string | null;

  quote?: Quote | string | null;

  q?: string | null;

  sort?: ScanSortKey | string | null;

  order?: ScanSortOrder | string | null;

  limit?: number | string | null;

  cursor?: number | string | null;

  noStore?: boolean;
};

/* ============================================================================
 * 3. RESPONSE META
 * ========================================================================== */

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

/* ============================================================================
 * 4. PUBLIC RESPONSE
 * ========================================================================== */

export type AssetsResponse = {
  ok: boolean;

  ts: string;

  version: string;

  source: AssetsResponseSource;

  market: AssetsMarket;

  quote: Quote;

  count: number;

  total: number;

  data: AssetsItem[];

  meta: AssetsResponseMeta;

  error: string | null;
};

/* ============================================================================
 * 5. PROVIDER CONTRACTS
 * ========================================================================== */

export type AssetsProviderInput = {
  quote?: Quote | string | null;
};

export type AssetsProviderResult = {
  ok: boolean;

  source: Extract<AssetsResponseSource, "scan" | "fallback">;

  data: AssetsItem[];

  warnings: string[];

  error: string | null;
};

/* ============================================================================
 * 6. BUILD RESPONSE CONTRACTS
 * ========================================================================== */

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

  data: AssetsItem[];

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
 * 7. NORMALIZED PARAMS
 * ========================================================================== */

export type NormalizedAssetsParams = {
  market: AssetsMarket;

  quote: Quote;

  q: string | null;

  sort: ScanSortKey;

  order: ScanSortOrder;

  limit: number;

  cursor: number;

  noStore: boolean;

  unsupported_market: boolean;
};
