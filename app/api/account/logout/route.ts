/* ============================================================================
 * FILE: app/api/account/logout/route.ts
 * ========================================================================== */

import { NextRequest, NextResponse } from "next/server";

import type { AccountLogoutResult } from "@/lib/xyvala/accounts/account-contract";

import {
  buildExpiredSessionCookieHeader,
  extractSessionTokenFromCookieHeader,
  hashAccountSessionToken,
} from "@/lib/xyvala/accounts/account-auth";

import {
  findSessionByTokenHash,
  revokeAccountSession,
} from "@/lib/xyvala/accounts/account-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ============================================================================
 * 1. RESPONSE HELPERS
 * ========================================================================== */

function json(payload: AccountLogoutResult, status: number): NextResponse {
  return NextResponse.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-xyvala-endpoint": "/api/account/logout",
      "set-cookie": buildExpiredSessionCookieHeader(),
    },
  });
}

/* ============================================================================
 * 2. ROUTE HANDLER
 * ========================================================================== */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const sessionToken = extractSessionTokenFromCookieHeader(
      req.headers.get("cookie"),
    );

    if (!sessionToken) {
      return json(
        {
          ok: true,
          warnings: ["account_logout_no_active_cookie"],
          error: null,
        },
        200,
      );
    }

    const sessionTokenHash = hashAccountSessionToken(sessionToken);
    const session = findSessionByTokenHash(sessionTokenHash);

    if (!session) {
      return json(
        {
          ok: true,
          warnings: ["account_logout_session_not_found"],
          error: null,
        },
        200,
      );
    }

    const revoked = revokeAccountSession(session.id);

    if (!revoked) {
      return json(
        {
          ok: false,
          warnings: ["account_logout_revoke_failed"],
          error: "account_logout_revoke_failed",
        },
        500,
      );
    }

    return json(
      {
        ok: true,
        warnings: ["account_logout_success"],
        error: null,
      },
      200,
    );
  } catch {
    return json(
      {
        ok: false,
        warnings: ["account_logout_route_failed"],
        error: "account_logout_route_failed",
      },
      500,
    );
  }
}
