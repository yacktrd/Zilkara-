/* ============================================================================
 * FILE: lib/xyvala/services/scan-service.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical public scan reader service
 *
 * ROLE
 * - read the validated canonical public scan snapshot
 * - normalize deterministic public scan queries
 * - apply public filtering, sorting and limiting
 * - expose existing public ScanAsset truths without reconstruction
 * - keep public pages and API consumers aligned on one snapshot source
 *
 * PARENTS
 * - lib/xyvala/contracts/scan-contract.ts
 * - lib/xyvala/snapshot.ts
 * - lib/xyvala/services/scan-query.ts
 * - lib/xyvala/services/scan-snapshot-service.ts
 *
 * DIRECTIVES
 * - OBSERVE service only
 * - canonical public snapshot is the sole data source
 * - no provider acquisition
 * - no direct cache access
 * - no local cache-key construction
 * - no local TTL validation
 * - no fallback seed reconstruction
 * - no ScanAsset construction
 * - no public label reconstruction
 * - no RFS recomputation
 * - no Triple Layer recomputation
 * - no Impulse Layer recomputation
 * - no Analytical Aggregation recomputation
 * - no MCI recomputation
 * - no calibration recomputation
 * - no snapshot writing
 * - no runtime mutation
 * - no private analytical exposure
 * - no regime exposure
 * - no decision exposure
 * - no opportunity exposure
 * - no confidence exposure
 * - no stability score exposure
 * - no broker / affiliate exposure
 * - EUR remains the default quote
 * - deterministic output only
 *
 * INPUTS
 * - optional public quote
 * - optional public search query
 * - optional public sort key
 * - optional public sort order
 * - optional public result limit
 *
 * OUTPUTS
 * - queried public ScanAsset collection
 * - explicit snapshot availability state
 * - public-safe warnings
 * - explicit service error
 *
 * INVARIANTS
 * - the service reads only through scan-snapshot-service
 * - the service never reconstructs a canonical cache key
 * - the service never creates or enriches ScanAsset values
 * - snapshot data remains immutable
 * - query operations return new arrays
 * - missing snapshot means unavailable, never synthetic fallback
 * - null means explicitly unavailable
 * - undefined never leaks through the service result
 * - same snapshot + same query => same ordered output
 *
 * CRITICAL DEPENDENCIES
 * - readScanSnapshot()
 * - normalizeScanQuery()
 * - queryScanItems()
 *
 * SENSITIVE ZONES
 * - canonical snapshot boundary
 * - public query normalization
 * - deterministic ordering
 * - snapshot warning propagation
 * - explicit unavailable-state handling
 * ========================================================================== */

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

import type { Quote } from "@/lib/xyvala/snapshot";

import {
  normalizeScanQuery,
  queryScanItems,
  type ScanSortKey,
  type ScanSortOrder,
} from "@/lib/xyvala/services/scan-query";

import {
  readScanSnapshot,
} from "@/lib/xyvala/services/scan-snapshot-service";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type ScanServiceSource =
  | "scan"
  | "unavailable";

export type GetScanInput = {
  quote?: Quote | string | null;
  q?: string | null;
  sort?: ScanSortKey | string | null;
  order?: ScanSortOrder | string | null;
  limit?: number | string | null;
};

export type ScanServiceResult = {
  ok: boolean;
  source: ScanServiceSource;
  quote: Quote;
  data: ScanAsset[];
  total: number;
  count: number;
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. CONFIG
 * ========================================================================== */

const DEFAULT_QUOTE: Quote = "eur";

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeQuote(value: unknown): Quote {
  const normalizedValue =
    safeString(value).toLowerCase();

  if (normalizedValue === "usd") {
    return "usd";
  }

  if (normalizedValue === "usdt") {
    return "usdt";
  }

  return DEFAULT_QUOTE;
}

function uniqueWarnings(
  ...groups: Array<
    readonly string[] | undefined | null
  >
): string[] {
  return [
    ...new Set(
      groups
        .flatMap((group) =>
          Array.isArray(group)
            ? group
            : [],
        )
        .map((warning) =>
          safeString(warning),
        )
        .filter(
          (warning) =>
            warning.length > 0,
        ),
    ),
  ];
}

function resolveErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof Error &&
    error.message.trim().length > 0
    ? error.message.trim()
    : fallback;
}

/* ============================================================================
 * 4. RESULT BUILDERS
 * ========================================================================== */

function buildUnavailableResult(input: {
  quote: Quote;
  warnings?: readonly string[];
  error: string;
}): ScanServiceResult {
  return {
    ok: false,
    source: "unavailable",
    quote: input.quote,
    data: [],
    total: 0,
    count: 0,
    warnings: uniqueWarnings(
      input.warnings,
      ["scan_service_snapshot_unavailable"],
    ),
    error: input.error,
  };
}

function buildSuccessResult(input: {
  quote: Quote;
  data: ScanAsset[];
  total: number;
  warnings?: readonly string[];
}): ScanServiceResult {
  return {
    ok: true,
    source: "scan",
    quote: input.quote,
    data: input.data,
    total: Math.max(
      0,
      Math.trunc(input.total),
    ),
    count: input.data.length,
    warnings: uniqueWarnings(
      input.warnings,
      ["scan_service_snapshot_source"],
    ),
    error: null,
  };
}

/* ============================================================================
 * 5. CANONICAL PUBLIC SCAN READER
 * ========================================================================== */

export async function getScan(
  input: GetScanInput = {},
): Promise<ScanServiceResult> {
  const quote = normalizeQuote(
    input.quote,
  );

  const query = normalizeScanQuery({
    q: input.q,
    sort: input.sort,
    order: input.order,
    limit: input.limit,
    cursor: 0,
  });

  try {
    const snapshotRead =
      await readScanSnapshot({
        quote,
      });

    const snapshot =
      snapshotRead.ok
        ? snapshotRead.snapshot
        : null;

    if (!snapshot) {
      return buildUnavailableResult({
        quote,
        warnings:
          snapshotRead.warnings,
        error:
          snapshotRead.error ??
          "scan_snapshot_unavailable",
      });
    }

    const queryResult =
      queryScanItems(
        snapshot.data,
        query,
      );

    return buildSuccessResult({
      quote,
      data: queryResult.data,
      total: queryResult.total,
      warnings: uniqueWarnings(
        snapshot.meta?.warnings,
        snapshotRead.warnings,
      ),
    });
  } catch (error) {
    return buildUnavailableResult({
      quote,
      warnings: [
        "scan_service_read_failed",
      ],
      error: resolveErrorMessage(
        error,
        "scan_service_unknown_error",
      ),
    });
  }
}

/* ============================================================================
 * 6. COMPATIBILITY ALIAS
 * ========================================================================== */

export async function getScanService(
  input: GetScanInput = {},
): Promise<ScanServiceResult> {
  return getScan(input);
}
