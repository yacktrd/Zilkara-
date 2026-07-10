"use client";

/* ============================================================================
 * FILE: components/auth/protected-route.tsx
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala protected client route guard
 *
 * ROLE
 * - protect private React surfaces after hydration
 * - bridge middleware protection and auth-provider runtime state
 * - render deterministic loading, denied and authenticated states
 *
 * PARENTS
 * - components/auth/auth-provider.tsx
 * - middleware.ts
 * - app/account/page.tsx
 * - app/dashboard/page.tsx
 *
 * DIRECTIVES
 * - client guard only
 * - no cookie parsing
 * - no account-store access
 * - no session validation logic
 * - no password logic
 * - no API key logic
 * - no billing logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no private score exposure
 * - consume useAuth only
 * - deterministic rendering only
 *
 * INPUTS
 * - children
 * - optional fallback path
 *
 * OUTPUTS
 * - protected UI content
 *
 * INVARIANTS
 * - loading state blocks private render
 * - unauthenticated state redirects to login
 * - authenticated state renders children unchanged
 * ========================================================================== */

import React, { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type ProtectedRouteProps = {
  children: ReactNode;
  loginPath?: string;
};

/* ============================================================================
 * 2. HELPERS
 * ========================================================================== */

function buildLoginTarget(input: {
  loginPath: string;
  pathname: string;
}): string {
  const params = new URLSearchParams();

  if (input.pathname && input.pathname !== input.loginPath) {
    params.set("redirect", input.pathname);
  }

  const query = params.toString();

  return query ? `${input.loginPath}?${query}` : input.loginPath;
}

/* ============================================================================
 * 3. COMPONENT
 * ========================================================================== */

export default function ProtectedRoute({
  children,
  loginPath = "/login",
}: ProtectedRouteProps) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const loginTarget = buildLoginTarget({
    loginPath,
    pathname: pathname ?? "/",
  });

  useEffect(() => {
    if (!auth.loading && !auth.authenticated) {
      router.replace(loginTarget);
    }
  }, [auth.loading, auth.authenticated, router, loginTarget]);

  if (auth.loading) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center px-6">
        <p className="text-sm text-white/50">Loading secure workspace...</p>
      </section>
    );
  }

  if (!auth.authenticated) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-6">
        <p className="mb-2 text-sm uppercase tracking-[0.3em] text-white/40">
          Xyvala Access
        </p>

        <h1 className="text-3xl font-semibold tracking-tight">
          Private access required
        </h1>

        <p className="mt-3 text-sm leading-6 text-white/55">
          Sign in to access this private Xyvala workspace.
        </p>

        <Link
          href={loginTarget}
          className="mt-8 rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-black transition hover:bg-white/90"
        >
          Sign in
        </Link>
      </section>
    );
  }

  return <>{children}</>;
}
