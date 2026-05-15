/* ============================================================================
 * FILE: app/api/zones/route.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public zones API route
 *
 * ROLE
 * - authenticate request
 * - track API usage
 * - delegate public zones generation to zones-service.ts
 * - return deterministic public ZonesResponse
 *
 * PARENTS
 * - lib/xyvala/auth.ts
 * - lib/xyvala/usage.ts
 * - lib/xyvala/services/zones-service.ts
 * - lib/xyvala/zones/zones-contract.ts
 *
 * DIRECTIVES
 * - route handler only
 * - French / European architecture compatibility first
 * - EUR is the default monetary reference in zones-service
 * - no zones calculation here
 * - no snapshot reading here
 * - no cache logic here
 * - no RFS recomputation
 * - no MCI recomputation
 * - no decision exposure
 * - no regime exposure
 * - no opportunity exposure
 * - no stability score exposure
 * - no broker / affiliate exposure
 * - all warnings must be explicit and auditable
 * ========================================================================== */

import { NextRequest, NextResponse } from "next/server";

import {
  applyApiAuthHeaders,
  buildApiKeyErrorResponse,
  enforceApiPolicy,
} from "@/lib/xyvala/auth";

import { applyQuotaHeaders, trackUsage } from "@/lib/xyvala/usage";

import { getZonesService } from "@/lib/xyvala/services/zones-service";

import {
  XYVALA_SNAPSHOT_VERSION,
  type Quote,
} from "@/lib/xyvala/snapshot";

import type {
  ZonesResponse,
  ZonesServiceInput,
  ZonesTimeframe,
} from "@/lib/xyvala/zones/zones-contract";

/* ============================================================================
 * 1. RUNTIME
 * ========================================================================== */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ============================================================================
 * 2. CONFIG
 * ========================================================================== */

const ENDPOINT = "/api/zones";
const DEFAULT_QUOTE: Quote = "eur";
const DEFAULT_TF: ZonesTimeframe = "AUTO";

/* ============================================================================
 * 3. TYPES
 * ========================================================================== */

type AuthResult = ReturnType<typeof enforceApiPolicy>;
type AuthSuccess = Extract<AuthResult, { ok: true }>;
type UsageResult = Awaited<ReturnType<typeof trackUsage>> | null;

/* ============================================================================
 * 4. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeBool(value: string | null): boolean {
  const normalized = safeString(value).toLowerCase();

  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
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
 * 5. REQUEST ADAPTER
 * ========================================================================== */

function buildZonesServiceInput(req: NextRequest): ZonesServiceInput {
  const searchParams = req.nextUrl.searchParams;

  return {
    symbol: searchParams.get("symbol"),
    q: searchParams.get("q"),
    market: searchParams.get("market"),
    quote: searchParams.get("quote"),
    tf: searchParams.get("tf"),
    limit: searchParams.get("limit"),
    noStore: safeBool(searchParams.get("noStore")),
  };
}

/* ============================================================================
 * 6. RESPONSE HELPERS
 * ========================================================================== */

function buildFallbackResponse(input: {
  warnings: string[];
  error: string;
}): ZonesResponse {
  return {
    ok: false,
    ts: nowIso(),
    version: XYVALA_SNAPSHOT_VERSION,
    symbol: "",
    market: "crypto",
    quote: DEFAULT_QUOTE,
    tf: DEFAULT_TF,
    reference_price: null,
    zones: [],
    context: {
      volatility_state: "NORMAL",
      liquidity_state: "NORMAL",
      movement_state: "NEUTRAL",
    },
    meta: {
      limit: 0,
      cache: "no-store",
      warnings: input.warnings,
    },
    error: input.error,
  };
}

function respond(
  payload: ZonesResponse,
  status: number,
  auth: AuthSuccess,
  usage: UsageResult,
): NextResponse {
  let response = NextResponse.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-xyvala-version": XYVALA_SNAPSHOT_VERSION,
      "x-xyvala-cache": payload.meta.cache,
      "x-xyvala-endpoint": ENDPOINT,
    },
  });

  response = applyApiAuthHeaders(response, auth);

  if (usage) {
    response = applyQuotaHeaders(response, usage);
  }

  return response;
}

/* ============================================================================
 * 7. ROUTE HANDLER
 * ========================================================================== */

export async function GET(req: NextRequest) {
  const auth: AuthResult = enforceApiPolicy(req);

  if (!auth.ok) {
    return buildApiKeyErrorResponse(auth.error, auth.status);
  }

  let usage: UsageResult = null;
  let usageWarnings: string[] = [];

  try {
    usage = await trackUsage({
      key: auth.key,
      keyType: auth.keyType,
      endpoint: ENDPOINT,
      plan: auth.plan,
    });
  } catch (error) {
    usageWarnings = uniqueWarnings([
      error instanceof Error && error.message
        ? `usage_track_failed:${error.message}`
        : "usage_track_failed",
    ]);
  }

  try {
    const serviceInput = buildZonesServiceInput(req);
    const payload = await getZonesService(serviceInput);

    const responsePayload: ZonesResponse = {
      ...payload,
      meta: {
        ...payload.meta,
        warnings: uniqueWarnings(usageWarnings, payload.meta.warnings),
      },
    };

    return respond(responsePayload, responsePayload.ok ? 200 : 400, auth, usage);
  } catch (error) {
    const payload = buildFallbackResponse({
      warnings: uniqueWarnings(
        usageWarnings,
        [
          error instanceof Error && error.message
            ? `route_exception:${error.message}`
            : "route_exception",
        ],
      ),
      error:
        error instanceof Error && error.message
          ? error.message
          : "zones_route_unknown_error",
    });

    return respond(payload, 500, auth, usage);
  }
}
