/* ============================================================================
 * FILE: app/api/scan/route.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical public scan endpoint
 *
 * ROLE
 * - expose validated public ScanAsset payloads
 * - delegate canonical snapshot reading and public querying to scan-service
 * - translate the service result into a stable HTTP response contract
 *
 * PARENTS
 * - lib/xyvala/services/scan-service.ts
 * - lib/xyvala/contracts/scan-contract.ts
 * - lib/xyvala/snapshot.ts
 *
 * DIRECTIVES
 * - public HTTP exposure only
 * - FR / EU compatible output
 * - EUR remains the default quote
 * - canonical snapshot remains the sole data source
 * - no direct cache access
 * - no provider acquisition
 * - no fallback reconstruction
 * - no local ScanAsset sorting
 * - no local ScanAsset filtering
 * - no snapshot reconstruction
 * - no RFS recomputation
 * - no Triple Layer recomputation
 * - no Impulse Layer recomputation
 * - no MCI recomputation
 * - no calibration recomputation
 * - no private analytical exposure
 * - no regime exposure
 * - no decision exposure
 * - no opportunity exposure
 * - no confidence exposure
 * - no stability score exposure
 * - no broker / affiliate exposure
 * - deterministic response shape
 *
 * INPUTS
 * - public HTTP query parameters
 *
 * OUTPUTS
 * - canonical public scan HTTP response
 *
 * INVARIANTS
 * - route never creates or modifies ScanAsset truth
 * - route never reads cache directly
 * - route never bypasses scan-service
 * - unavailable snapshot remains explicitly unavailable
 * - service total is preserved
 * - undefined never leaks
 *
 * CRITICAL DEPENDENCIES
 * - getScanService()
 * - ScanServiceSource
 * - ScanAsset
 *
 * SENSITIVE ZONES
 * - service-to-HTTP contract boundary
 * - public error status
 * - source-state propagation
 * - total and count semantics
 * ========================================================================== */

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getScanService,
  type ScanServiceSource,
} from "@/lib/xyvala/services/scan-service";

import type {
  ScanAsset,
} from "@/lib/xyvala/contracts/scan-contract";

import {
  XYVALA_SNAPSHOT_VERSION,
  type Market,
  type Quote,
} from "@/lib/xyvala/snapshot";

import type {
  ScanSortKey,
  ScanSortOrder,
} from "@/lib/xyvala/services/scan-query";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type Currency =
  | "EUR"
  | "USD"
  | "USDT";

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
  source: ScanServiceSource;
  market: Market;
  quote: Quote;
  count: number;
  total: number;
  data: ScanAsset[];
  context: ScanRouteContext;
  warnings: string[];
  meta: {
    q: string | null;
    sort: ScanSortKey;
    order: ScanSortOrder;
    limit: number;
    region: "EU";
    currency: Currency;
  };
  error: string | null;
};

/* ============================================================================
 * 2. CONFIG
 * ========================================================================== */

const DEFAULT_MARKET: Market = "crypto";
const DEFAULT_QUOTE: Quote = "eur";

const DEFAULT_SORT: ScanSortKey = "rank";
const DEFAULT_ORDER: ScanSortOrder = "asc";

const DEFAULT_PUBLIC_SCAN_LIMIT = 10;
const MAX_PUBLIC_SCAN_LIMIT = 250;

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function safeLower(
  value: unknown,
): string {
  return safeString(value).toLowerCase();
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

function clampInteger(
  value: number,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  return Math.max(
    minimum,
    Math.min(
      maximum,
      Math.trunc(value),
    ),
  );
}

/* ============================================================================
 * 4. INPUT NORMALIZATION
 * ========================================================================== */

function normalizeQuote(
  value: string | null,
): Quote {
  const normalizedValue =
    safeLower(value);

  if (normalizedValue === "usd") {
    return "usd";
  }

  if (normalizedValue === "usdt") {
    return "usdt";
  }

  return DEFAULT_QUOTE;
}

function normalizeSearch(
  value: string | null,
): string | null {
  const normalizedValue =
    safeLower(value);

  return normalizedValue.length > 0
    ? normalizedValue
    : null;
}

function normalizeSort(
  value: string | null,
): ScanSortKey {
  const normalizedValue =
    safeLower(value);

  if (normalizedValue === "price") {
    return "price";
  }

  if (normalizedValue === "market_cap") {
    return "market_cap";
  }

  if (
    normalizedValue === "volume" ||
    normalizedValue === "volume_24h"
  ) {
    return "volume_24h";
  }

  if (
    normalizedValue === "change_24h" ||
    normalizedValue === "chg_24h"
  ) {
    return "change_24h";
  }

  if (
    normalizedValue === "change_7d" ||
    normalizedValue === "chg_7d"
  ) {
    return "change_7d";
  }

  return DEFAULT_SORT;
}

function normalizeOrder(
  value: string | null,
): ScanSortOrder {
  return safeLower(value) === "desc"
    ? "desc"
    : DEFAULT_ORDER;
}

function normalizeLimit(
  value: string | null,
): number {
  if (
    value === null ||
    value.trim().length === 0
  ) {
    return DEFAULT_PUBLIC_SCAN_LIMIT;
  }

  const parsedValue = Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue <= 0
  ) {
    return DEFAULT_PUBLIC_SCAN_LIMIT;
  }

  return clampInteger(
    parsedValue,
    1,
    MAX_PUBLIC_SCAN_LIMIT,
  );
}

function quoteToCurrency(
  quote: Quote,
): Currency {
  if (quote === "usd") {
    return "USD";
  }

  if (quote === "usdt") {
    return "USDT";
  }

  return "EUR";
}

/* ============================================================================
 * 5. PUBLIC CONTEXT
 * ========================================================================== */

function computeContext(
  data: readonly ScanAsset[],
): ScanRouteContext {
  let pricedAssetCount = 0;
  let marketCapAvailableCount = 0;
  let volumeAvailableCount = 0;

  for (const asset of data) {
    if (
      typeof asset.price === "number" &&
      Number.isFinite(asset.price)
    ) {
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
    priced_asset_count:
      pricedAssetCount,
    market_cap_available_count:
      marketCapAvailableCount,
    volume_available_count:
      volumeAvailableCount,
  };
}

/* ============================================================================
 * 6. RESPONSE BUILDER
 * ========================================================================== */

function buildResponse(input: {
  ok: boolean;
  source: ScanServiceSource;
  quote: Quote;
  q: string | null;
  sort: ScanSortKey;
  order: ScanSortOrder;
  limit: number;
  data: ScanAsset[];
  total: number;
  warnings: readonly string[];
  error: string | null;
}): ScanRouteResponse {
  return {
    ok: input.ok,
    ts: nowIso(),
    version: XYVALA_SNAPSHOT_VERSION,
    source: input.source,
    market: DEFAULT_MARKET,
    quote: input.quote,
    count: input.data.length,
    total: Math.max(
      0,
      Math.trunc(input.total),
    ),
    data: input.data,
    context: computeContext(
      input.data,
    ),
    warnings: uniqueWarnings(
      input.warnings,
    ),
    meta: {
      q: input.q,
      sort: input.sort,
      order: input.order,
      limit: input.limit,
      region: "EU",
      currency: quoteToCurrency(
        input.quote,
      ),
    },
    error: input.error,
  };
}

/* ============================================================================
 * 7. HTTP RESPONSE
 * ========================================================================== */

function jsonResponse(
  payload: ScanRouteResponse,
  status: number,
): NextResponse {
  return NextResponse.json(
    payload,
    {
      status,
      headers: {
        "cache-control": "no-store",
        "x-xyvala-version":
          XYVALA_SNAPSHOT_VERSION,
        "x-xyvala-endpoint":
          "/api/scan",
        "x-xyvala-source":
          payload.source,
      },
    },
  );
}

/* ============================================================================
 * 8. ROUTE HANDLER
 * ========================================================================== */

export async function GET(
  request: NextRequest,
): Promise<NextResponse> {
  const searchParams =
    request.nextUrl.searchParams;

  const quote = normalizeQuote(
    searchParams.get("quote"),
  );

  const q = normalizeSearch(
    searchParams.get("q"),
  );

  const sort = normalizeSort(
    searchParams.get("sort"),
  );

  const order = normalizeOrder(
    searchParams.get("order"),
  );

  const limit = normalizeLimit(
    searchParams.get("limit"),
  );

  try {
    const result =
      await getScanService({
        quote,
        q,
        sort,
        order,
        limit,
      });

    const payload = buildResponse({
      ok: result.ok,
      source: result.source,
      quote: result.quote,
      q,
      sort,
      order,
      limit,
      data: result.data,
      total: result.total,
      warnings: result.warnings,
      error: result.error,
    });

    return jsonResponse(
      payload,
      result.ok ? 200 : 503,
    );
  } catch (error) {
    const payload = buildResponse({
      ok: false,
      source: "unavailable",
      quote,
      q,
      sort,
      order,
      limit,
      data: [],
      total: 0,
      warnings: [
        "scan_route_failed",
      ],
      error:
        error instanceof Error &&
        error.message.trim().length > 0
          ? error.message.trim()
          : "scan_route_unknown_error",
    });

    return jsonResponse(
      payload,
      500,
    );
  }
}
