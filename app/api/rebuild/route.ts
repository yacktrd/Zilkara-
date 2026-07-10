/* ============================================================================
 * FILE: app/api/rebuild/route.ts
 * ========================================================================== */

import { NextResponse } from "next/server";

import { privateScanAssetsToPublicScanAssets } from "@/lib/xyvala/services/scan-transformer";

import { adaptMarketEvaluationsToPrivateScanAssets } from "@/lib/xyvala/stores/market-traceability-adapter";

import { buildScanEngineResult } from "@/lib/xyvala/scan-engine";
import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";
import { loadRawAssets } from "@/lib/xyvala/services/raw-assets-service";
import { writeScanSnapshot } from "@/lib/xyvala/services/scan-snapshot-service";

import {
  isScanSnapshot,
  XYVALA_SNAPSHOT_VERSION,
  type Quote,
  type ScanSnapshot,
} from "@/lib/xyvala/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_MARKET = "crypto" as const;
const DEFAULT_QUOTE: Quote = "eur";
const DEFAULT_SORT = "rank" as const;
const DEFAULT_ORDER = "asc" as const;

const CANONICAL_SCAN_SNAPSHOT_LIMIT = 250;
const SNAPSHOT_TTL_MS = 15 * 60_000;
const PREVIEW_LIMIT = 5;

type RawAssetsResult = Awaited<ReturnType<typeof loadRawAssets>>;

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
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNumberArrayOrNull(value: unknown): value is number[] | null {
  return (
    value === null ||
    (Array.isArray(value) &&
      value.every((item) => typeof item === "number" && Number.isFinite(item)))
  );
}

function isPublicLabel(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPublicScanAsset(value: unknown): value is ScanAsset {
  if (!value || typeof value !== "object") return false;

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
    isPublicLabel(asset.public_activity) &&
    isPublicLabel(asset.public_sparkline_context_7d) &&
    isPublicLabel(asset.public_structure_transition) &&
    isPublicLabel(asset.public_impulse_context) &&
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

function buildSnapshotWarnings(input: {
  raw_warnings?: string[];
  engine_warnings?: string[];
  invalid_count: number;
}): string[] {
  return uniqueWarnings(
    input.raw_warnings,
    input.engine_warnings,
    input.invalid_count > 0
      ? [`invalid_public_assets:${input.invalid_count}`]
      : [],
  );
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
      limit: CANONICAL_SCAN_SNAPSHOT_LIMIT,
      sort: DEFAULT_SORT,
      order: DEFAULT_ORDER,
      q: null,
      warnings: input.warnings,
    },
  };
}

function json(payload: unknown, status: number): NextResponse {
  return NextResponse.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-xyvala-version": XYVALA_SNAPSHOT_VERSION,
      "x-xyvala-endpoint": "/api/rebuild",
    },
  });
}

function buildFailurePayload(input: {
  quote?: Quote;
  error: string;
  warnings?: string[];
  count?: number;
}) {
  return {
    ok: false,
    ts: nowIso(),
    quote: input.quote ?? DEFAULT_QUOTE,
    error: input.error,
    warnings: input.warnings ?? [],
    count: input.count ?? 0,
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const quote = normalizeQuote(url.searchParams.get("quote"));

    const raw: RawAssetsResult = await loadRawAssets(quote);

    if (!raw.ok) {
      return json(
        buildFailurePayload({
          quote,
          error: raw.error ?? "raw_assets_not_ok",
          warnings: raw.warnings,
        }),
        502,
      );
    }

    if (!Array.isArray(raw.data) || raw.data.length === 0) {
      return json(
        buildFailurePayload({
          quote,
          error: "raw_assets_empty",
          warnings: raw.warnings,
        }),
        502,
      );
    }

    const marketEvaluations = raw.data.map((asset) => ({
  mapped: {
    ...(asset as Record<string, unknown>),
    quote_asset: quote,
  },
}));

const privateAdapter =
  adaptMarketEvaluationsToPrivateScanAssets(marketEvaluations);

if (!privateAdapter.ok || privateAdapter.assets.length === 0) {
  return json(
    buildFailurePayload({
      quote,
      error: "private_asset_adapter_failed",
      warnings: uniqueWarnings(raw.warnings, privateAdapter.warnings),
      count: privateAdapter.count,
    }),
    500,
  );
}

const engine = buildScanEngineResult({
  data: privateAdapter.assets,
});

    if (!Array.isArray(engine.data) || engine.data.length === 0) {
  return json(
    buildFailurePayload({
      quote,
      error: "scan_engine_empty",
      warnings: raw.warnings,
    }),
    500,
  );
}

    const publicAssets = privateScanAssetsToPublicScanAssets(engine.data);

const validated = validatePublicAssets(publicAssets);

    if (validated.valid.length === 0) {
  return json(
    buildFailurePayload({
      quote,
      error: "public_scan_assets_invalid",
      warnings: buildSnapshotWarnings({
        raw_warnings: raw.warnings,
        engine_warnings: [],
        invalid_count: validated.invalid_count,
      }),
    }),
    500,
  );
}

    const snapshotWarnings = buildSnapshotWarnings({
  raw_warnings: raw.warnings,
  engine_warnings: [],
  invalid_count: validated.invalid_count,
});

    const snapshot = buildSnapshotCandidate({
      quote,
      data: validated.valid.slice(0, CANONICAL_SCAN_SNAPSHOT_LIMIT),
      warnings: snapshotWarnings,
    });

    if (!isScanSnapshot(snapshot)) {
      return json(
        buildFailurePayload({
          quote,
          error: "snapshot_contract_invalid",
          warnings: snapshotWarnings,
          count: validated.valid.length,
        }),
        500,
      );
    }

    const writeResult = await writeScanSnapshot({
      quote,
      snapshot,
      ttl_ms: SNAPSHOT_TTL_MS,
    });

    if (!writeResult.ok) {
      return json(
        buildFailurePayload({
          quote,
          error: writeResult.error ?? "scan_snapshot_write_failed",
          warnings: writeResult.warnings,
          count: snapshot.data.length,
        }),
        500,
      );
    }

    return json(
      {
        ok: true,
        ts: nowIso(),
        version: XYVALA_SNAPSHOT_VERSION,
        source: snapshot.source,
        market: snapshot.market,
        quote: snapshot.quote,
        key: writeResult.key,
        canonical: {
          sort: DEFAULT_SORT,
          order: DEFAULT_ORDER,
          limit: CANONICAL_SCAN_SNAPSHOT_LIMIT,
          q: null,
        },
        snapshot_saved: writeResult.snapshot_saved,
        count: snapshot.data.length,
        invalid_count: validated.invalid_count,
        warnings: uniqueWarnings(snapshot.meta.warnings, writeResult.warnings),
        preview: snapshot.data.slice(0, PREVIEW_LIMIT),
      },
      200,
    );
  } catch (error) {
    return json(
      buildFailurePayload({
        error:
          error instanceof Error && error.message
            ? error.message
            : "rebuild_unknown_error",
      }),
      500,
    );
  }
}
