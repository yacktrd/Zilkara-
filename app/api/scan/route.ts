/* ============================================================================
 * FILE: app/api/scan/route.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public canonical scan endpoint
 *
 * ROLE
 * - expose public ScanAsset payloads only
 * - read canonical scan snapshot from cache-core
 * - preserve deterministic filtering and public sorting
 *
 * DIRECTIVES
 * - FR / EU compatible public output
 * - EUR is the default quote
 * - no RFS recomputation
 * - no MCI recomputation
 * - no regime exposure
 * - no decision exposure
 * - no opportunity exposure
 * - no stability score exposure
 * - no broker / affiliate exposure
 * - snapshot remains the source of truth
 * ========================================================================== */

import { NextRequest, NextResponse } from "next/server";

import { getFromCache, scanKey } from "@/lib/xyvala/cache/cache-core";

import {
  isScanSnapshot,
  XYVALA_SNAPSHOT_VERSION,
  type Market,
  type Quote,
  type ScanSnapshot,
} from "@/lib/xyvala/snapshot";

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type SortKey =
  | "rank"
  | "price"
  | "market_cap"
  | "volume_24h"
  | "change_24h"
  | "change_7d";

type SortOrder = "asc" | "desc";

type Currency = "EUR" | "USD" | "USDT";

type ScanRouteContext = {
  asset_count: number;
  priced_asset_count: number;
  market_cap_available_count: number;
  volume_available_count: number;
};

type ScanRouteResponse = {
  ok: boolean;
  ts: string;
  version: string;
  source: "scan" | "fallback";
  market: Market;
  quote: Quote;
  count: number;
  total: number;
  data: ScanAsset[];
  context: ScanRouteContext;
  warnings: string[];
  meta: {
    q: string | null;
    sort: SortKey;
    order: SortOrder;
    limit: number | null;
    region: "EU";
    currency: Currency;
  };
  error: string | null;
};

/* ============================================================================
 * 2. CONSTANTS
 * ========================================================================== */

const DEFAULT_MARKET: Market = "crypto";
const DEFAULT_QUOTE: Quote = "eur";
const DEFAULT_SORT: SortKey = "rank";
const DEFAULT_ORDER: SortOrder = "asc";
const MAX_LIMIT = 250;
const DEFAULT_LIMIT = MAX_LIMIT;

const SNAPSHOT_TTL_MS = 60_000;

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeLower(value: unknown): string {
  return safeString(value).toLowerCase();
}

function safeNumber(value: unknown, fallback = -1): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeRank(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : Number.POSITIVE_INFINITY;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
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
 * 4. INPUT NORMALIZATION
 * ========================================================================== */

function normalizeQuote(value: string | null): Quote {
  const quote = safeLower(value);

  if (quote === "usd") return "usd";
  if (quote === "usdt") return "usdt";

  return DEFAULT_QUOTE;
}

function normalizeSearch(value: string | null): string | null {
  const q = safeLower(value);
  return q.length > 0 ? q : null;
}

function normalizeSort(value: string | null): SortKey {
  const sort = safeLower(value);

  if (sort === "price") return "price";
  if (sort === "market_cap") return "market_cap";
  if (sort === "volume_24h") return "volume_24h";
  if (sort === "volume") return "volume_24h";
  if (sort === "change_24h") return "change_24h";
  if (sort === "chg_24h") return "change_24h";
  if (sort === "change_7d") return "change_7d";
  if (sort === "chg_7d") return "change_7d";

  return DEFAULT_SORT;
}

function normalizeOrder(value: string | null): SortOrder {
  return safeLower(value) === "desc" ? "desc" : DEFAULT_ORDER;
}

function normalizeLimit(value: string | null): number | null {
  if (value === null || value.trim() === "") return DEFAULT_LIMIT;

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return clamp(Math.trunc(parsed), 1, MAX_LIMIT);
}

function parseBool(value: string | null): boolean {
  const normalized = safeLower(value);

  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

function quoteToCurrency(quote: Quote): Currency {
  if (quote === "usd") return "USD";
  if (quote === "usdt") return "USDT";

  return "EUR";
}

/* ============================================================================
 * 5. CONTEXT HELPERS
 * ========================================================================== */

function computeContext(data: ScanAsset[]): ScanRouteContext {
  let pricedAssetCount = 0;
  let marketCapAvailableCount = 0;
  let volumeAvailableCount = 0;

  for (const asset of data) {
    if (typeof asset.price === "number" && Number.isFinite(asset.price)) {
      pricedAssetCount += 1;
    }

    if (
      typeof asset.market_cap === "number" &&
      Number.isFinite(asset.market_cap)
    ) {
      marketCapAvailableCount += 1;
    }

    if (
      typeof asset.volume_24h === "number" &&
      Number.isFinite(asset.volume_24h)
    ) {
      volumeAvailableCount += 1;
    }
  }

  return {
    asset_count: data.length,
    priced_asset_count: pricedAssetCount,
    market_cap_available_count: marketCapAvailableCount,
    volume_available_count: volumeAvailableCount,
  };
}

/* ============================================================================
 * 6. SORT HELPERS
 * ========================================================================== */

function sortValue(asset: ScanAsset, sort: SortKey): number {
  if (sort === "price") return safeNumber(asset.price);
  if (sort === "market_cap") return safeNumber(asset.market_cap);
  if (sort === "volume_24h") return safeNumber(asset.volume_24h);
  if (sort === "change_24h") return safeNumber(asset.chg_24h_pct);
  if (sort === "change_7d") return safeNumber(asset.chg_7d_pct);

  return safeRank(asset.rank);
}

function tieBreak(left: ScanAsset, right: ScanAsset): number {
  const rankDelta = safeRank(left.rank) - safeRank(right.rank);

  if (rankDelta !== 0) {
    return rankDelta;
  }

  const marketCapDelta =
    safeNumber(right.market_cap) - safeNumber(left.market_cap);

  if (marketCapDelta !== 0) {
    return marketCapDelta;
  }

  const volumeDelta =
    safeNumber(right.volume_24h) - safeNumber(left.volume_24h);

  if (volumeDelta !== 0) {
    return volumeDelta;
  }

  return left.symbol.localeCompare(right.symbol);
}

function sortAssets(
  data: ScanAsset[],
  sort: SortKey,
  order: SortOrder,
): ScanAsset[] {
  return [...data].sort((left, right) => {
    const leftValue = sortValue(left, sort);
    const rightValue = sortValue(right, sort);

    if (leftValue !== rightValue) {
      return order === "asc"
        ? leftValue - rightValue
        : rightValue - leftValue;
    }

    return tieBreak(left, right);
  });
}

/* ============================================================================
 * 7. RESPONSE HELPERS
 * ========================================================================== */

function buildResponse(input: {
  ok: boolean;
  source: "scan" | "fallback";
  quote: Quote;
  q: string | null;
  sort: SortKey;
  order: SortOrder;
  limit: number | null;
  data: ScanAsset[];
  warnings: string[];
  error: string | null;
}): ScanRouteResponse {
  const count = input.data.length;

  return {
    ok: input.ok,
    ts: nowIso(),
    version: XYVALA_SNAPSHOT_VERSION,
    source: input.source,
    market: DEFAULT_MARKET,
    quote: input.quote,
    count,
    total: count,
    data: input.data,
    context: computeContext(input.data),
    warnings: input.warnings,
    meta: {
      q: input.q,
      sort: input.sort,
      order: input.order,
      limit: input.limit,
      region: "EU",
      currency: quoteToCurrency(input.quote),
    },
    error: input.error,
  };
}

/* ============================================================================
 * 8. ROUTE HANDLER
 * ========================================================================== */

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const quote = normalizeQuote(searchParams.get("quote"));
  const q = normalizeSearch(searchParams.get("q"));
  const sort = normalizeSort(searchParams.get("sort"));
  const order = normalizeOrder(searchParams.get("order"));
  const limit = normalizeLimit(searchParams.get("limit"));
  const noStore = parseBool(searchParams.get("noStore"));

  try {
    const snapshotKey = scanKey({
      version: XYVALA_SNAPSHOT_VERSION,
      market: DEFAULT_MARKET,
      quote,
      sort: DEFAULT_SORT,
      order: DEFAULT_ORDER,
      limit: MAX_LIMIT,
      q: null,
    });

    const snapshot = noStore
      ? null
      : await getFromCache<ScanSnapshot>(snapshotKey, SNAPSHOT_TTL_MS);

    if (!snapshot || !isScanSnapshot(snapshot)) {
      const payload = buildResponse({
        ok: false,
        source: "fallback",
        quote,
        q,
        sort,
        order,
        limit,
        data: [],
        warnings: uniqueWarnings(["scan_snapshot_unavailable"]),
        error: "scan_snapshot_unavailable",
      });

      return NextResponse.json(payload, {
        status: 503,
        headers: {
          "cache-control": "no-store",
          "x-xyvala-version": XYVALA_SNAPSHOT_VERSION,
          "x-xyvala-endpoint": "/api/scan",
          "x-xyvala-nostore": noStore ? "1" : "0",
        },
      });
    }

    let data = [...snapshot.data];
    const warnings = uniqueWarnings(snapshot.meta?.warnings);

    if (q) {
      data = data.filter((asset) => {
        const symbol = safeLower(asset.symbol);
        const name = safeLower(asset.name);
        const id = safeLower(asset.id);

        return symbol.includes(q) || name.includes(q) || id.includes(q);
      });
    }

    data = sortAssets(data, sort, order);

    if (limit !== null) {
      data = data.slice(0, limit);
    }

    const payload = buildResponse({
      ok: true,
      source: "scan",
      quote,
      q,
      sort,
      order,
      limit,
      data,
      warnings,
      error: null,
    });

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "cache-control": "no-store",
        "x-xyvala-version": XYVALA_SNAPSHOT_VERSION,
        "x-xyvala-endpoint": "/api/scan",
        "x-xyvala-nostore": noStore ? "1" : "0",
      },
    });
  } catch (error) {
    const payload = buildResponse({
      ok: false,
      source: "fallback",
      quote,
      q,
      sort,
      order,
      limit,
      data: [],
      warnings: uniqueWarnings(["scan_route_error"]),
      error:
        error instanceof Error && error.message
          ? error.message
          : "scan_route_unknown_error",
    });

    return NextResponse.json(payload, {
      status: 500,
      headers: {
        "cache-control": "no-store",
        "x-xyvala-version": XYVALA_SNAPSHOT_VERSION,
        "x-xyvala-endpoint": "/api/scan",
        "x-xyvala-nostore": noStore ? "1" : "0",
      },
    });
  }
}
