/* ============================================================================
 * FILE: app/api/account/login/route.ts
 * ========================================================================== */

import { NextRequest, NextResponse } from "next/server";

import {
  accountRecordToPublicAccount,
  accountSessionToPublicSession,
  type AccountLoginInput,
  type AccountLoginResult,
} from "@/lib/xyvala/accounts/account-contract";

import {
  buildAccountSessionExpiry,
  buildSessionCookieHeader,
  createAccountSessionToken,
  hashAccountSessionToken,
  verifyAccountPassword,
} from "@/lib/xyvala/accounts/account-auth";

import {
  createAccountSession,
  findAccountByEmail,
  updateAccountRecord,
} from "@/lib/xyvala/accounts/account-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ============================================================================
 * 1. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown): string {
  return safeString(value).toLowerCase();
}

function getClientIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

function parseLoginPayload(value: unknown): AccountLoginInput | null {
  if (!value || typeof value !== "object") return null;

  const input = value as Partial<AccountLoginInput>;

  return {
    email: normalizeEmail(input.email),
    password: typeof input.password === "string" ? input.password : "",
  };
}

function json(
  payload: AccountLoginResult,
  status: number,
  sessionToken?: string,
): NextResponse {
  const headers: Record<string, string> = {
    "cache-control": "no-store",
    "x-xyvala-endpoint": "/api/account/login",
  };

  if (sessionToken) {
    headers["set-cookie"] = buildSessionCookieHeader(sessionToken);
  }

  return NextResponse.json(payload, {
    status,
    headers,
  });
}

/* ============================================================================
 * 2. ROUTE HANDLER
 * ========================================================================== */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const input = parseLoginPayload(await req.json());

    if (!input || !input.email || !input.password) {
      return json(
        {
          ok: false,
          account: null,
          session: null,
          session_token: null,
          warnings: ["invalid_login_payload"],
          error: "invalid_login_payload",
        },
        400,
      );
    }

    const account = findAccountByEmail(input.email);

    if (!account || account.status !== "active") {
      return json(
        {
          ok: false,
          account: null,
          session: null,
          session_token: null,
          warnings: ["invalid_credentials"],
          error: "invalid_credentials",
        },
        401,
      );
    }

    const passwordOk = verifyAccountPassword({
      password: input.password,
      password_hash: account.password_hash,
    });

    if (!passwordOk) {
      return json(
        {
          ok: false,
          account: null,
          session: null,
          session_token: null,
          warnings: ["invalid_credentials"],
          error: "invalid_credentials",
        },
        401,
      );
    }

    const updatedAccount =
      updateAccountRecord({
        id: account.id,
        last_login_at: nowIso(),
        warnings: ["account_login_success"],
      }) ?? account;

    const sessionToken = createAccountSessionToken();
    const sessionTokenHash = hashAccountSessionToken(sessionToken);

    const session = createAccountSession({
      account_id: updatedAccount.id,
      session_token_hash: sessionTokenHash,
      expires_at: buildAccountSessionExpiry(),
      user_agent: req.headers.get("user-agent"),
      ip_fingerprint: getClientIp(req),
      warnings: ["account_session_created_from_login"],
    });

    if (!session) {
      return json(
        {
          ok: false,
          account: accountRecordToPublicAccount(updatedAccount),
          session: null,
          session_token: null,
          warnings: ["account_session_create_failed"],
          error: "account_session_create_failed",
        },
        500,
      );
    }

    return json(
      {
        ok: true,
        account: accountRecordToPublicAccount(updatedAccount),
        session: accountSessionToPublicSession(session),
        session_token: sessionToken,
        warnings: [],
        error: null,
      },
      200,
      sessionToken,
    );
  } catch {
    return json(
      {
        ok: false,
        account: null,
        session: null,
        session_token: null,
        warnings: ["login_route_failed"],
        error: "login_route_failed",
      },
      500,
    );
  }
}
