/* ============================================================================
 * FILE: app/api/account/me/route.ts
 * ============================================================================
 *
 * TITLE
 * - Xyvala authenticated account identity route
 *
 * ROLE
 * - expose authenticated public account state
 * - validate active account session
 * - preserve strict public/private separation
 *
 * PARENTS
 * - lib/xyvala/accounts/account-contract.ts
 * - lib/xyvala/accounts/account-auth.ts
 * - lib/xyvala/accounts/account-store.ts
 *
 * DIRECTIVES
 * - route orchestration only
 * - no password exposure
 * - no private analytical exposure
 * - no billing exposure
 * - no raw session token exposure
 * - no session mutation here
 * - no UI logic
 * - no RFS logic
 * - no MCI logic
 * - deterministic public response only
 * - FR / EU compatible account governance
 *
 * INPUTS
 * - xyvala_session cookie
 *
 * OUTPUTS
 * - authenticated public account
 * - authenticated public session
 *
 * INVARIANTS
 * - invalid session returns unauthorized
 * - inactive account returns unauthorized
 * - expired session returns unauthorized
 * - public account never exposes secrets
 * ========================================================================== */

import { NextRequest, NextResponse } from "next/server";

import {
  accountRecordToPublicAccount,
  accountSessionToPublicSession,
  type AccountMeResult,
} from "@/lib/xyvala/accounts/account-contract";

import {
  extractSessionTokenFromCookieHeader,
  hashAccountSessionToken,
} from "@/lib/xyvala/accounts/account-auth";

import {
  findAccountFromSessionTokenHash,
} from "@/lib/xyvala/accounts/account-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ============================================================================
 * 1. RESPONSE HELPERS
 * ========================================================================== */

function json(
  payload: AccountMeResult,
  status: number,
): NextResponse {
  return NextResponse.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-xyvala-endpoint": "/api/account/me",
    },
  });
}

/* ============================================================================
 * 2. ROUTE HANDLER
 * ========================================================================== */

export async function GET(
  req: NextRequest,
): Promise<NextResponse> {
  try {
    const cookieHeader =
      req.headers.get("cookie");

    const sessionToken =
      extractSessionTokenFromCookieHeader(
        cookieHeader,
      );

    if (!sessionToken) {
      return json(
        {
          ok: false,
          account: null,
          session: null,
          warnings: [
            "missing_account_session",
          ],
          error:
            "missing_account_session",
        },
        401,
      );
    }

    const sessionTokenHash =
      hashAccountSessionToken(
        sessionToken,
      );

    const authenticated =
      findAccountFromSessionTokenHash({
        session_token_hash:
          sessionTokenHash,
      });

    if (!authenticated) {
      return json(
        {
          ok: false,
          account: null,
          session: null,
          warnings: [
            "invalid_account_session",
          ],
          error:
            "invalid_account_session",
        },
        401,
      );
    }

    return json(
      {
        ok: true,
        account:
          accountRecordToPublicAccount(
            authenticated.account,
          ),
        session:
          accountSessionToPublicSession(
            authenticated.session,
          ),
        warnings: [],
        error: null,
      },
      200,
    );
  } catch {
    return json(
      {
        ok: false,
        account: null,
        session: null,
        warnings: [
          "account_me_route_failed",
        ],
        error:
          "account_me_route_failed",
      },
      500,
    );
  }
}
