/* ============================================================================
 * FILE: lib/xyvala/services/scan-service.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public scan service
 *
 * ROLE
 * - read canonical public scan snapshot when available
 * - fallback to observable market source when snapshot is unavailable
 * - apply deterministic public query filtering and sorting
 * - expose public ScanAsset data only
 *
 * PARENTS
 * - lib/xyvala/cache/cache-core.ts
 * - lib/xyvala/snapshot.ts
 * - lib/xyvala/contracts/scan-contract.ts
 * - lib/xyvala/services/scan-query.ts
 * - lib/xyvala/sources/market-source.ts
 * - lib/xyvala/public/public-structure.ts
 *
 * DIRECTIVES
 * - service orchestration only
 * - public descriptive scan data only
 * - snapshot remains preferred source of truth
 * - market fallback is observable-data only
 * - no fake fallback data
 * - no RFS recomputation
 * - no MCI recomputation
 * - no private analytical exposure
 * - no regime exposure
 * - no decision exposure
 * - no opportunity exposure
 * - no stability score exposure
 * - no broker / affiliate exposure
 * - EUR is the default quote
 * - deterministic output only
 * ========================================================================== */

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

import {
  getFromCache,
  scanKey,
} from "@/lib/xyvala/cache/cache-core";

import {
  isScanSnapshot,
  XYVALA_SNAPSHOT_VERSION,
  type Market,
  type Quote,
  type ScanSnapshot,
} from "@/lib/xyvala/snapshot";

import { buildPublicStructure } from "@/lib/xyvala/public/public-structure";
import { getMarketAssets } from "@/lib/xyvala/sources/market-source";

import {
  normalizeScanQuery,
  queryScanItems,
  type ScanSortKey,
  type ScanSortOrder,
} from "@/lib/xyvala/services/scan-query";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type GetScanInput = {
  quote?: Quote | string | null;
  q?: string | null;
  sort?: ScanSortKey | string | null;
  order?: ScanSortOrder | string | null;
  limit?: number | string | null;
  noStore?: boolean;
};

export type ScanServiceResult = {
  ok: boolean;
  source: "scan" | "fallback";
  data: ScanAsset[];
  warnings: string[];
  error: string | null;
};

type MarketSeed = Awaited<ReturnType<typeof getMarketAssets>>[number];

/* ============================================================================
 * 2. CONFIG
 * ========================================================================== */

const DEFAULT_MARKET: Market = "crypto";
const DEFAULT_QUOTE: Quote = "eur";

const DEFAULT_SORT: ScanSortKey = "rank";
const DEFAULT_ORDER: ScanSortOrder = "asc";
const DEFAULT_LIMIT = 250;

const SNAPSHOT_TTL_MS = 300_000;

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeQuote(value: unknown): Quote {
  const quote = safeString(value).toLowerCase();

  if (quote === "usd") return "usd";
  if (quote === "usdt") return "usdt";

  return DEFAULT_QUOTE;
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
 * 4. SNAPSHOT HELPERS
 * ========================================================================== */

function buildCanonicalScanCacheKey(quote: Quote): string {
  return scanKey({
    version: XYVALA_SNAPSHOT_VERSION,
    market: DEFAULT_MARKET,
    quote,
    sort: DEFAULT_SORT,
    order: DEFAULT_ORDER,
    limit: DEFAULT_LIMIT,
    q: null,
  });
}

async function readCanonicalSnapshot(
  quote: Quote,
): Promise<ScanSnapshot | null> {
  const snapshot = await getFromCache<ScanSnapshot>(
    buildCanonicalScanCacheKey(quote),
    SNAPSHOT_TTL_MS,
  );

  return isScanSnapshot(snapshot) ? snapshot : null;
}

/* ============================================================================
 * 5. MARKET FALLBACK PROJECTION
 * ========================================================================== */

function marketSeedToScanAsset(seed: MarketSeed): ScanAsset {
  const publicStructure = buildPublicStructure({
    pct_24h: seed.chg_24h_pct,
    pct_7d: seed.chg_7d_pct,
    volume_24h: seed.volume_24h,
    market_cap: seed.market_cap,
    sparkline_7d: seed.sparkline_7d,
  });

  return {
    id: seed.id,
    symbol: seed.symbol,
    name: seed.name,

    price: seed.price,
    chg_24h_pct: seed.chg_24h_pct,
    chg_7d_pct: seed.chg_7d_pct,

    market_cap: seed.market_cap,
    volume_24h: seed.volume_24h,

    sparkline_7d: seed.sparkline_7d,

    public_activity: publicStructure.activity,
    public_sparkline_context_7d: publicStructure.sparkline_context_7d,
    public_structure_transition: publicStructure.structure_transition,
    public_impulse_context: publicStructure.impulse_context,

    rank: seed.rank,
    logo_url: seed.logo_url,
  };
}

async function loadMarketFallbackAssets(): Promise<ScanAsset[]> {
  const seeds = await getMarketAssets(DEFAULT_QUOTE);

  return seeds.map(marketSeedToScanAsset);
}

/* ============================================================================
 * 6. PUBLIC SERVICE
 * ========================================================================== */

export async function getScan(
  input: GetScanInput = {},
): Promise<ScanServiceResult> {
  const quote = normalizeQuote(input.quote);

  const query = normalizeScanQuery({
    q: input.q,
    sort: input.sort,
    order: input.order,
    limit: input.limit,
    cursor: 0,
  });

  try {
    const snapshot = input.noStore === true
      ? null
      : await readCanonicalSnapshot(quote);

    if (snapshot) {
      const queried = queryScanItems(snapshot.data, query);

      return {
        ok: true,
        source: "scan",
        data: queried.data,
        warnings: uniqueWarnings(
          snapshot.meta?.warnings,
          ["scan_service_snapshot_source"],
        ),
        error: null,
      };
    }

    const fallbackAssets = await loadMarketFallbackAssets();

    if (fallbackAssets.length > 0) {
      const queried = queryScanItems(fallbackAssets, query);

      return {
        ok: true,
        source: "fallback",
        data: queried.data,
        warnings: uniqueWarnings([
          "scan_service_snapshot_unavailable",
          "scan_service_market_source_fallback",
        ]),
        error: null,
      };
    }

    return {
      ok: false,
      source: "fallback",
      data: [],
      warnings: ["scan_service_snapshot_and_market_source_unavailable"],
      error: "scan_snapshot_unavailable",
    };
  } catch (error) {
    return {
      ok: false,
      source: "fallback",
      data: [],
      warnings: ["scan_service_failed"],
      error:
        error instanceof Error && error.message
          ? error.message
          : "scan_service_unknown_error",
    };
  }
}

export async function getScanService(
  input: GetScanInput = {},
): Promise<ScanServiceResult> {
  return getScan(input);
}
