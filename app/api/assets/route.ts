/* ============================================================================
 * FILE: app/api/assets/route.ts
 * ========================================================================= */

import { NextRequest, NextResponse } from "next/server";

import {
  applyApiAuthHeaders,
  buildApiKeyErrorResponse,
  enforceApiPolicy,
} from "@/lib/xyvala/auth";

import { applyQuotaHeaders, trackUsage } from "@/lib/xyvala/usage";

import { getAssetsService } from "@/lib/xyvala/services/assets-service";

import { resolveAccessScope } from "@/lib/xyvala/access/access-resolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ENDPOINT = "/api/assets";

type AuthResult = ReturnType<typeof enforceApiPolicy>;
type AuthSuccess = Extract<AuthResult, { ok: true }>;
type UsageResult = Awaited<ReturnType<typeof trackUsage>> | null;

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

function parseBool(value: string | null): boolean {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

function buildAssetsServiceInput(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  return {
    market: sp.get("market"),
    quote: sp.get("quote"),
    q: sp.get("q"),
    sort: sp.get("sort"),
    order: sp.get("order"),
    limit: sp.get("limit"),
    cursor: sp.get("cursor"),
    noStore: parseBool(sp.get("noStore")),
  };
}

function respond(
  payload: Awaited<ReturnType<typeof getAssetsService>>,
  status: number,
  auth: AuthSuccess,
  usage: UsageResult,
): NextResponse {
  let response = NextResponse.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-xyvala-version": payload.version,
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
      plan: auth.plan,
      endpoint: ENDPOINT,
    });
  } catch (error) {
    usageWarnings = uniqueWarnings([
      error instanceof Error && error.message
        ? `usage_track_failed:${error.message}`
        : "usage_track_failed",
    ]);
  }

   const access = resolveAccessScope(auth);

const payload = await getAssetsService({
  ...buildAssetsServiceInput(req),
  access,
});

  const responsePayload = {
    ...payload,
    meta: {
      ...payload.meta,
      warnings: uniqueWarnings(usageWarnings, payload.meta.warnings),
    },
  };

  return respond(responsePayload, responsePayload.ok ? 200 : 503, auth, usage);
}
