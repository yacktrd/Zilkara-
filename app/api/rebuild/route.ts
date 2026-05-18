/* ============================================================================
 * FILE: app/api/rebuild/route.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical public scan snapshot rebuild route
 *
 * ROLE
 * - rebuild the canonical public scan snapshot
 * - validate public ScanAsset contract compatibility
 * - persist one deterministic public snapshot into cache
 *
 * PARENTS
 * - lib/xyvala/services/raw-assets-service.ts
 * - lib/xyvala/snapshot.ts
 * - lib/xyvala/cache/cache-core.ts
 * - lib/xyvala/contracts/scan-contract.ts
 *
 * DIRECTIVES
 * - route orchestration only
 * - no dependency on /api/scan
 * - no circular rebuild chain
 * - no provider parsing here
 * - no RFS recomputation
 * - no MCI recomputation
 * - no private analytical fields
 * - no regime exposure
 * - no decision exposure
 * - no opportunity exposure
 * - no stability score exposure
 * - no rupture exposure
 * - no crash exposure
 * - no confidence exposure
 * - no calibration exposure
 * - no broker / affiliate exposure
 * - raw-assets-service remains the upstream normalization source
 * - snapshot remains descriptive and public-safe
 * - deterministic output only
 * - EUR remains default quote
 * ========================================================================== */

import { NextResponse } from "next/server";

import { loadRawAssets } from "@/lib/xyvala/services/raw-assets-service";

import {
  isScanSnapshot,
  XYVALA_SNAPSHOT_VERSION,
  type Quote,
  type ScanSnapshot,
} from "@/lib/xyvala/snapshot";

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

import {
  scanKey,
  setToCache,
} from "@/lib/xyvala/cache/cache-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const DEFAULT_MARKET = "crypto" as const;
const DEFAULT_QUOTE: Quote = "eur";

const DEFAULT_LIMIT = 250;
const SNAPSHOT_TTL_MS = 60_000;
const PREVIEW_LIMIT = 5;

/* ============================================================================
 * 2. TYPES
 * ========================================================================== */

type RawAssetsResult = Awaited<ReturnType<typeof loadRawAssets>>;

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeQuote(value: unknown): Quote {
  if (value === "eur") return "eur";
  if (value === "usd") return "usd";
  if (value === "usdt") return "usdt";

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

function isFiniteNumberOrNull(value: unknown): value is number | null {
  return value === null || (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNumberArrayOrNull(value: unknown): value is number[] | null {
  return (
    value === null ||
    (
      Array.isArray(value) &&
      value.every(
        (item) =>
          typeof item === "number" &&
          Number.isFinite(item),
      )
    )
  );
}

/* ============================================================================
 * 4. PUBLIC CONTRACT VALIDATION
 * ========================================================================== */

function isPublicScanAsset(value: unknown): value is ScanAsset {
  if (!value || typeof value !== "object") {
    return false;
  }

  const asset = value as Record<string, unknown>;

  return (
    typeof asset.id === "string" &&
    asset.id.trim().length > 0 &&

    typeof asset.symbol === "string" &&
    asset.symbol.trim().length > 0 &&

    typeof asset.name === "string" &&
    asset.name.trim().length > 0 &&

    isFiniteNumberOrNull(asset.price) &&
    isFiniteNumberOrNull(asset.chg_24h_pct) &&
    isFiniteNumberOrNull(asset.chg_7d_pct) &&

    isFiniteNumberOrNull(asset.market_cap) &&
    isFiniteNumberOrNull(asset.volume_24h) &&

    isNumberArrayOrNull(asset.sparkline_7d) &&
    isFiniteNumberOrNull(asset.rank) &&
    isStringOrNull(asset.logo_url)
  );
}

function validatePublicAssets(data: unknown[]): {
  valid: ScanAsset[];
  invalid_count: number;
} {
  const valid: ScanAsset[] = [];

  let invalidCount = 0;

  for (const item of data) {
    if (isPublicScanAsset(item)) {
      valid.push(item);
    } else {
      invalidCount += 1;
    }
  }

  return {
    valid,
    invalid_count: invalidCount,
  };
}

/* ============================================================================
 * 5. SNAPSHOT HELPERS
 * ========================================================================== */

function buildCanonicalScanCacheKey(quote: Quote): string {
  return scanKey({
    version: XYVALA_SNAPSHOT_VERSION,
    market: DEFAULT_MARKET,
    quote,
    sort: "rank",
    order: "asc",
    limit: DEFAULT_LIMIT,
    q: null,
  });
}

function buildSnapshotCandidate(input: {
  quote: Quote;
  data: ScanAsset[];
  warnings: string[];
}): ScanSnapshot {
  return {
    ok: true,
    ts: nowIso(),
    version: XYVALA_SNAPSHOT_VERSION,
    source: "scan",
    market: DEFAULT_MARKET,
    quote: input.quote,
    count: input.data.length,
    data: input.data,
    meta: {
    limit: DEFAULT_LIMIT,
    sort: "rank",
    order: "asc",
    q: null,
    warnings: input.warnings,
    },
  };
}

/* ============================================================================
 * 6. RESPONSE HELPERS
 * ========================================================================== */

function json(
  payload: unknown,
  status: number,
): NextResponse {
  return NextResponse.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-xyvala-version": XYVALA_SNAPSHOT_VERSION,
      "x-xyvala-endpoint": "/api/rebuild",
    },
  });
}

/* ============================================================================
 * 7. ROUTE HANDLER
 * ========================================================================== */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const quote = normalizeQuote(
      url.searchParams.get("quote"),
    );

    const raw: RawAssetsResult =
      await loadRawAssets(quote);

    if (!raw.ok) {
      return json(
        {
          ok: false,
          ts: nowIso(),
          quote,
          error: raw.error ?? "raw_assets_not_ok",
          warnings: raw.warnings,
          count: 0,
        },
        502,
      );
    }

    if (
      !Array.isArray(raw.data) ||
      raw.data.length === 0
    ) {
      return json(
        {
          ok: false,
          ts: nowIso(),
          quote,
          error: "raw_assets_empty",
          warnings: raw.warnings,
          count: 0,
        },
        502,
      );
    }

    const validated = validatePublicAssets(
      raw.data,
    );

    if (validated.valid.length === 0) {
      return json(
        {
          ok: false,
          ts: nowIso(),
          quote,
          error: "raw_assets_invalid_shape",
          warnings: uniqueWarnings(
            raw.warnings,
            [
              `invalid_raw_assets:${validated.invalid_count}`,
            ],
          ),
          count: 0,
        },
        500,
      );
    }

    const snapshot = buildSnapshotCandidate({
      quote,
      data: validated.valid,
      warnings:
        validated.invalid_count > 0
          ? uniqueWarnings(
              raw.warnings,
              [
                `invalid_raw_assets:${validated.invalid_count}`,
              ],
            )
          : raw.warnings,
    });

    const key =
      buildCanonicalScanCacheKey(quote);

    console.log("[REBUILD] writing snapshot", {
  key,
  count: snapshot.data.length,
});

    await setToCache(
      key,
      snapshot,
      SNAPSHOT_TTL_MS,
    );

    return json(
      {
        ok: true,
        ts: nowIso(),
        source: snapshot.source,
        quote: snapshot.quote,
        key,
        count: snapshot.data.length,
        warnings: snapshot.meta.warnings,
        preview: snapshot.data.slice(
          0,
          PREVIEW_LIMIT,
        ),
      },
      200,
    );
  } catch (error) {
    return json(
      {
        ok: false,
        ts: nowIso(),
        error:
          error instanceof Error
            ? error.message
            : "rebuild_unknown_error",
      },
      500,
    );
  }
}
