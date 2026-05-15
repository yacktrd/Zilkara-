/* ============================================================================
 * FILE: app/api/context/route.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public context API route
 *
 * ROLE
 * - authenticate request
 * - track API usage
 * - expose restricted public context availability
 * - prevent private market context leakage
 *
 * PARENTS
 * - lib/xyvala/auth.ts
 * - lib/xyvala/usage.ts
 * - lib/xyvala/snapshot.ts
 *
 * DIRECTIVES
 * - route handler only
 * - public descriptive boundary only
 * - French / European compatibility first
 * - EUR is the default quote
 * - no private market context computation here
 * - no public ScanAsset to PrivateScanAsset conversion
 * - no RFS recomputation
 * - no MCI recomputation
 * - no regime exposure
 * - no decision exposure
 * - no opportunity exposure
 * - no stability score exposure
 * - no rupture exposure
 * - no crash exposure
 * - no calibration exposure
 * - no broker / affiliate exposure
 * ========================================================================== */

import { NextRequest, NextResponse } from "next/server";

import {
  applyApiAuthHeaders,
  buildApiKeyErrorResponse,
  enforceApiPolicy,
} from "@/lib/xyvala/auth";

import { applyQuotaHeaders, trackUsage } from "@/lib/xyvala/usage";

import {
  XYVALA_SNAPSHOT_VERSION,
  type Quote,
} from "@/lib/xyvala/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ENDPOINT = "/api/context";
const DEFAULT_QUOTE: Quote = "eur";

type AuthResult = ReturnType<typeof enforceApiPolicy>;
type AuthSuccess = Extract<AuthResult, { ok: true }>;
type UsageResult = Awaited<ReturnType<typeof trackUsage>> | null;

type PublicContextResponse = {
  ok: boolean;
  ts: string;
  version: string;
  market: "crypto";
  quote: Quote;
  status: "restricted";
  context: null;
  meta: {
    access_scope: "private_context_not_public";
    region: "EU";
    warnings: string[];
  };
  error: string | null;
};

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeQuote(value: string | null): Quote {
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

function buildResponse(input: {
  quote: Quote;
  warnings: string[];
  error: string | null;
}): PublicContextResponse {
  return {
    ok: true,
    ts: nowIso(),
    version: XYVALA_SNAPSHOT_VERSION,
    market: "crypto",
    quote: input.quote,
    status: "restricted",
    context: null,
    meta: {
      access_scope: "private_context_not_public",
      region: "EU",
      warnings: uniqueWarnings(input.warnings, [
        "context_endpoint_public_output_restricted",
      ]),
    },
    error: input.error,
  };
}

function respond(
  payload: PublicContextResponse,
  status: number,
  auth: AuthSuccess,
  usage: UsageResult,
): NextResponse {
  let response = NextResponse.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-xyvala-version": XYVALA_SNAPSHOT_VERSION,
      "x-xyvala-endpoint": ENDPOINT,
    },
  });

  response = applyApiAuthHeaders(response, auth);

  if (usage) {
    response = applyQuotaHeaders(response, usage);
  }

  return response;
}

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

  const quote = normalizeQuote(req.nextUrl.searchParams.get("quote"));

  const payload = buildResponse({
    quote,
    warnings: usageWarnings,
    error: null,
  });

  return respond(payload, 200, auth, usage);
}
