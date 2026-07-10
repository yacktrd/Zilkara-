/* ============================================================================
 * FILE: app/api/account/signup/route.ts
 * ========================================================================== */

import { NextRequest, NextResponse } from "next/server";

import {
  accountRecordToPublicAccount,
  accountSessionToPublicSession,
  type AccountSignupInput,
  type AccountSignupResult,
} from "@/lib/xyvala/accounts/account-contract";

import {
  buildAccountSessionExpiry,
  buildSessionCookieHeader,
  createAccountSessionToken,
  hashAccountPassword,
  hashAccountSessionToken,
  isValidAccountPassword,
} from "@/lib/xyvala/accounts/account-auth";

import {
  createAccountRecord,
  createAccountSession,
  findAccountByEmail,
} from "@/lib/xyvala/accounts/account-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ============================================================================
 * 1. HELPERS
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

function isValidEmail(value: unknown): value is string {
  const email = normalizeEmail(value);

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getClientIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

function json(
  payload: AccountSignupResult,
  status: number,
  sessionToken?: string,
): NextResponse {
  const headers: Record<string, string> = {
    "cache-control": "no-store",
    "x-xyvala-endpoint": "/api/account/signup",
  };

  if (sessionToken) {
    headers["set-cookie"] = buildSessionCookieHeader(sessionToken);
  }

  return NextResponse.json(payload, {
    status,
    headers,
  });
}

function parseSignupPayload(value: unknown): AccountSignupInput | null {
  if (!value || typeof value !== "object") return null;

  const input = value as Partial<AccountSignupInput>;

  return {
    email: safeString(input.email),
    password: typeof input.password === "string" ? input.password : "",
    display_name: safeString(input.display_name) || null,
    terms_accepted: input.terms_accepted === true,
    privacy_accepted: input.privacy_accepted === true,
  };
}

/* ============================================================================
 * 2. ROUTE HANDLER
 * ========================================================================== */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const input = parseSignupPayload(await req.json());

    if (!input) {
      return json(
        {
          ok: false,
          account: null,
          session: null,
          session_token: null,
          warnings: ["invalid_signup_payload"],
          error: "invalid_signup_payload",
        },
        400,
      );
    }

    const email = normalizeEmail(input.email);

    if (!isValidEmail(email)) {
      return json(
        {
          ok: false,
          account: null,
          session: null,
          session_token: null,
          warnings: ["invalid_email"],
          error: "invalid_email",
        },
        400,
      );
    }

    if (!isValidAccountPassword(input.password)) {
      return json(
        {
          ok: false,
          account: null,
          session: null,
          session_token: null,
          warnings: ["invalid_password_policy"],
          error: "invalid_password_policy",
        },
        400,
      );
    }

    if (!input.terms_accepted || !input.privacy_accepted) {
      return json(
        {
          ok: false,
          account: null,
          session: null,
          session_token: null,
          warnings: ["legal_acceptance_required"],
          error: "legal_acceptance_required",
        },
        400,
      );
    }

    if (findAccountByEmail(email)) {
      return json(
        {
          ok: false,
          account: null,
          session: null,
          session_token: null,
          warnings: ["account_email_already_exists"],
          error: "account_email_already_exists",
        },
        409,
      );
    }

    const timestamp = nowIso();
    const passwordHash = hashAccountPassword(input.password);

    const account = createAccountRecord({
      email,
      display_name: input.display_name ?? null,
      password_hash: passwordHash,
      plan: "demo",
      role: "user",
      source: "signup",
      auth_provider: "password",
      terms_accepted_at: timestamp,
      privacy_accepted_at: timestamp,
      warnings: ["account_created_from_signup"],
    });

    if (!account) {
      return json(
        {
          ok: false,
          account: null,
          session: null,
          session_token: null,
          warnings: ["account_create_failed"],
          error: "account_create_failed",
        },
        500,
      );
    }

    const sessionToken = createAccountSessionToken();
    const sessionTokenHash = hashAccountSessionToken(sessionToken);

    const session = createAccountSession({
      account_id: account.id,
      session_token_hash: sessionTokenHash,
      expires_at: buildAccountSessionExpiry(),
      user_agent: req.headers.get("user-agent"),
      ip_fingerprint: getClientIp(req),
      warnings: ["account_session_created_from_signup"],
    });

    if (!session) {
      return json(
        {
          ok: false,
          account: accountRecordToPublicAccount(account),
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
        account: accountRecordToPublicAccount(account),
        session: accountSessionToPublicSession(session),
        session_token: sessionToken,
        warnings: [],
        error: null,
      },
      201,
      sessionToken,
    );
  } catch {
    return json(
      {
        ok: false,
        account: null,
        session: null,
        session_token: null,
        warnings: ["signup_route_failed"],
        error: "signup_route_failed",
      },
      500,
    );
  }
}
