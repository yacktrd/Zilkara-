/* ============================================================================
 * FILE: lib/xyvala/assets/assets-provider.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public assets provider
 *
 * ROLE
 * - load canonical public scan assets from /api/scan
 * - normalize incoming scan-like payloads into public ScanAsset objects
 * - provide deterministic public fallback assets
 * - isolate public asset acquisition from orchestration
 *
 * DIRECTIVES
 * - provider layer only
 * - public descriptive assets only
 * - EUR is the default quote
 * - no cache logic
 * - no pagination logic
 * - no sorting logic
 * - no query logic
 * - no UI logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no regime exposure
 * - no decision exposure
 * - no opportunity exposure
 * - no stability score exposure
 * - no broker / affiliate exposure
 * - deterministic output only
 * - null means explicitly unavailable
 * ========================================================================== */

import type { Quote, ScanSnapshot } from "@/lib/xyvala/snapshot";

import {
  isScanSnapshot,
  XYVALA_SNAPSHOT_VERSION,
} from "@/lib/xyvala/snapshot";

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";
import { PUBLIC_SCAN_LIMIT } from "@/lib/xyvala/contracts/scan-contract";

import type {
  AssetsProviderInput,
  AssetsProviderResult,
} from "@/lib/xyvala/assets/assets-contract";

import { normalizeAssets } from "@/lib/xyvala/assets/assets-normalizer";
import { xyvalaServerFetch } from "@/lib/xyvala/server-client";

import { buildPublicStructure } from "@/lib/xyvala/public/public-structure";

import type { JsonRecord, JsonValue } from "@/lib/xyvala/json";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const DEFAULT_MARKET = "crypto" as const;
const DEFAULT_QUOTE: Quote = "eur";

const CANONICAL_SCAN_LIMIT = PUBLIC_SCAN_LIMIT;
const SCAN_FETCH_TIMEOUT_MS = 8_000;

/* ============================================================================
 * 2. TYPES
 * ========================================================================== */

type SnapshotSortKey =
  | "rank"
  | "price"
  | "market_cap"
  | "volume_24h"
  | "change_24h"
  | "change_7d";

type SnapshotSortOrder = "asc" | "desc";

type ScanRouteResponse = JsonRecord & {
  ok?: boolean;
  source?: string;
  market?: string;
  quote?: string;
  count?: number;
  data?: JsonValue[];
  meta?: {
    limit?: number;
    sort?: SnapshotSortKey | string;
    order?: SnapshotSortOrder | string;
    q?: string | null;
    warnings?: string[];
  };
  error?: string | null;
};

type FallbackSeed = {
  id: string;
  symbol: string;
  name: string;
  price: number | null;
  chg_24h_pct: number | null;
  chg_7d_pct: number | null;
  market_cap: number | null;
  volume_24h: number | null;
  sparkline_7d: number[] | null;
  rank: number | null;
  logo_url: string | null;
};

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

function normalizeQuote(value: unknown): Quote {
  const quote = safeString(value).toLowerCase();

  if (quote === "usd") return "usd";
  if (quote === "usdt") return "usdt";

  return DEFAULT_QUOTE;
}

function normalizeSnapshotSort(value: unknown): SnapshotSortKey {
  if (value === "price") return "price";
  if (value === "market_cap") return "market_cap";
  if (value === "volume_24h") return "volume_24h";
  if (value === "change_24h") return "change_24h";
  if (value === "change_7d") return "change_7d";

  return "rank";
}

function normalizeSnapshotOrder(value: unknown): SnapshotSortOrder {
  return value === "desc" ? "desc" : "asc";
}

function normalizeLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return CANONICAL_SCAN_LIMIT;
  }

  return Math.max(1, Math.min(CANONICAL_SCAN_LIMIT, Math.trunc(value)));
}

function normalizeWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
}

/* ============================================================================
 * 4. FALLBACK ASSETS
 * ========================================================================== */

function fallbackSeedToScanAsset(seed: FallbackSeed): ScanAsset {
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
    public_impulse_context: "Unavailable",

    rank: seed.rank,
    logo_url: seed.logo_url,
  };
}

export function buildFallbackAssets(): ScanAsset[] {
  const seeds: FallbackSeed[] = [
    {
      id: "usdt",
      symbol: "USDT",
      name: "Tether",
      price: 1,
      chg_24h_pct: 0.02,
      chg_7d_pct: 0.01,
      market_cap: null,
      volume_24h: null,
      sparkline_7d: null,
      rank: 1,
      logo_url: null,
    },
    {
      id: "usdc",
      symbol: "USDC",
      name: "USDC",
      price: 1,
      chg_24h_pct: 0.01,
      chg_7d_pct: 0.01,
      market_cap: null,
      volume_24h: null,
      sparkline_7d: null,
      rank: 2,
      logo_url: null,
    },
    {
      id: "btc",
      symbol: "BTC",
      name: "Bitcoin",
      price: 64000,
      chg_24h_pct: 0.3,
      chg_7d_pct: 2.2,
      market_cap: null,
      volume_24h: null,
      sparkline_7d: null,
      rank: 3,
      logo_url: null,
    },
  ];

  return seeds.map(fallbackSeedToScanAsset);
}

/* ============================================================================
 * 5. SNAPSHOT NORMALIZATION
 * ========================================================================== */

function normalizeIncomingSnapshot(
  input: ScanRouteResponse,
): ScanSnapshot | null {
  if (input.ok !== true || !Array.isArray(input.data)) {
    return null;
  }

  const data = normalizeAssets(input.data);

  const snapshot: ScanSnapshot = {
    ok: true,
    ts: new Date().toISOString(),
    version: XYVALA_SNAPSHOT_VERSION,
    source: input.source === "fallback" ? "fallback" : "scan",
    market: DEFAULT_MARKET,
    quote: normalizeQuote(input.quote),
    count: data.length,
    data,
    meta: {
      limit: normalizeLimit(input.meta?.limit),
      sort: normalizeSnapshotSort(input.meta?.sort),
      order: normalizeSnapshotOrder(input.meta?.order),
      q: typeof input.meta?.q === "string" ? input.meta.q : null,
      warnings: normalizeWarnings(input.meta?.warnings),
    },
  };

  return isScanSnapshot(snapshot) ? snapshot : null;
}

/* ============================================================================
 * 6. PUBLIC PROVIDER
 * ========================================================================== */

export async function loadAssetsProvider(
  input: AssetsProviderInput = {},
): Promise<AssetsProviderResult> {
  const quote = normalizeQuote(input.quote);

  try {
    const response = await xyvalaServerFetch<ScanRouteResponse>("/api/scan", {
      searchParams: {
        quote,
        sort: "rank",
        order: "asc",
        limit: CANONICAL_SCAN_LIMIT,
        noStore: 1,
      },
      timeoutMs: SCAN_FETCH_TIMEOUT_MS,
    });

    if (!response.ok || !response.data) {
      return {
        ok: false,
        source: "fallback",
        data: buildFallbackAssets(),
        warnings: uniqueWarnings(response.warnings, [
          response.error
            ? `scan_fetch_failed:${response.error}`
            : "scan_fetch_failed",
          "assets_fallback_used",
        ]),
        error: response.error ?? "scan_fetch_failed",
      };
    }

    const snapshot = normalizeIncomingSnapshot(response.data);

    if (!snapshot || snapshot.data.length === 0) {
      return {
        ok: false,
        source: "fallback",
        data: buildFallbackAssets(),
        warnings: uniqueWarnings(response.warnings, [
          "scan_snapshot_invalid_or_empty",
          "assets_fallback_used",
        ]),
        error: "scan_snapshot_invalid_or_empty",
      };
    }

    return {
      ok: true,
      source: snapshot.source === "fallback" ? "fallback" : "scan",
      data: snapshot.data,
      warnings: uniqueWarnings(snapshot.meta?.warnings),
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      source: "fallback",
      data: buildFallbackAssets(),
      warnings: uniqueWarnings([
        error instanceof Error && error.message
          ? `assets_provider_exception:${error.message}`
          : "assets_provider_exception",
        "assets_fallback_used",
      ]),
      error:
        error instanceof Error && error.message
          ? error.message
          : "assets_provider_unknown_error",
    };
  }
}
