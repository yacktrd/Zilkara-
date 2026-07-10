/* ============================================================================
 * FILE: middleware.ts
 * ========================================================================== */

import { NextRequest, NextResponse } from "next/server";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const SESSION_COOKIE_NAME = "xyvala_session";

const PROTECTED_PREFIXES = [
  "/account",
] as const;

const PUBLIC_PREFIXES = [
  "/",
  "/scan",
  "/login",
  "/register",
  "/api/account/login",
  "/api/account/signup",
  "/api/account/logout",
  "/api/account/me",
  "/api/scan",
] as const;

/* ============================================================================
 * 2. HELPERS
 * ========================================================================== */

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function hasSessionCookie(req: NextRequest): boolean {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return typeof token === "string" && token.trim().length > 0;
}

function buildLoginRedirect(req: NextRequest): NextResponse {
  const url = req.nextUrl.clone();

  url.pathname = "/login";
  url.searchParams.set("redirect", req.nextUrl.pathname);

  return NextResponse.redirect(url);
}

/* ============================================================================
 * 3. MIDDLEWARE
 * ========================================================================== */

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (!hasSessionCookie(req)) {
    return buildLoginRedirect(req);
  }

  return NextResponse.next();
}

/* ============================================================================
 * 4. MATCHER
 * ========================================================================== */

export const config = {
  matcher: [
    "/account/:path*",
  ],
};
