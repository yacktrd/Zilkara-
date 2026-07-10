"use client";

/* ============================================================================
 * FILE: app/dashboard/page.tsx
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private user dashboard
 *
 * ROLE
 * - expose the authenticated user workspace
 * - summarize account, session, plan and resolved SaaS access
 * - keep dashboard UI passive and auth-provider driven
 *
 * PARENTS
 * - components/auth/auth-provider.tsx
 * - components/dashboard/dashboard-shell.tsx
 * - components/dashboard/dashboard-header.tsx
 * - components/dashboard/dashboard-sidebar.tsx
 * - components/dashboard/account-access-panel.tsx
 * - app/dashboard/layout.tsx
 *
 * DIRECTIVES
 * - UI composition only
 * - no auth reconstruction
 * - no cookie parsing
 * - no account-store access
 * - no billing logic
 * - no API key generation
 * - no quota computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no private score leakage
 * - consume useAuth only
 * - deterministic rendering only
 *
 * INVARIANTS
 * - dashboard protection is handled by app/dashboard/layout.tsx
 * - authenticated user sees public account/session data only
 * - account access resolution is delegated to AccountAccessPanel
 * * dashboard remains SaaS-ready without exposing unfinished billing/API logic
 * ========================================================================== */

import React from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth/auth-provider";
import AccountAccessPanel from "@/components/dashboard/account-access-panel";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import DashboardShell from "@/components/dashboard/dashboard-shell";
import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";

/* ============================================================================
 * 1. HELPERS
 * ========================================================================== */

function formatDate(value: string | null | undefined): string {
  if (!value) return "Unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function planLabel(value: string | undefined): string {
  if (value === "demo") return "Demo";
  if (value === "trader") return "Trader";
  if (value === "pro") return "Pro";
  if (value === "enterprise") return "Enterprise";

  return "Unknown";
}

function planDescription(value: string | undefined): string {
  if (value === "demo") {
    return "Discovery access for validating the Xyvala private workspace.";
  }

  if (value === "trader") {
    return "Extended market structure access for active individual users.";
  }

  if (value === "pro") {
    return "Advanced access prepared for professional workflows.";
  }

  if (value === "enterprise") {
    return "Organization-ready access prepared for custom integrations.";
  }

  return "Plan information unavailable.";
}

/* ============================================================================
 * 2. PAGE
 * ========================================================================== */

export default function DashboardPage() {
  const auth = useAuth();

  const account = auth.account;
  const session = auth.session;

  return (
    <DashboardShell
      title="Dashboard"
      description="Your private Xyvala control surface for account access, plan status and upcoming SaaS capabilities."
      action={
        <Link
          href="/scan"
          className="rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-black transition hover:bg-white/90"
        >
          Open public scan
        </Link>
      }
    >
      <DashboardHeader
        title="Dashboard"
        description="Your private Xyvala control surface for account access, plan status and upcoming SaaS capabilities."
      />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <DashboardSidebar />

        <div className="space-y-6">
          <AccountAccessPanel />

          <div className="grid gap-5 md:grid-cols-3">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm text-white/35">Account</p>

              <h2 className="mt-2 truncate text-xl font-semibold">
                {account?.display_name ?? account?.email ?? "Unavailable"}
              </h2>

              <p className="mt-3 text-sm leading-6 text-white/55">
                {account?.email ?? "Unavailable"}
              </p>

              <p className="mt-5 rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">
                Status: {account?.status ?? "Unavailable"}
              </p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm text-white/35">Plan</p>

              <h2 className="mt-2 text-xl font-semibold">
                {planLabel(account?.plan)}
              </h2>

              <p className="mt-3 text-sm leading-6 text-white/55">
                {planDescription(account?.plan)}
              </p>

              <p className="mt-5 rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">
                Currency: {account?.default_currency ?? "Unavailable"}
              </p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-sm text-white/35">Session</p>

              <h2 className="mt-2 text-xl font-semibold">
                {session?.status ?? "Unavailable"}
              </h2>

              <p className="mt-3 text-sm leading-6 text-white/55">
                Expires: {formatDate(session?.expires_at)}
              </p>

              <p className="mt-5 rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">
                Last login: {formatDate(account?.last_login_at)}
              </p>
            </section>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-lg font-semibold">Workspace</h2>

              <div className="mt-5 space-y-3">
                <Link
                  href="/account"
                  className="block rounded-xl border border-white/10 px-4 py-3 text-sm text-white/75 transition hover:border-white/25 hover:text-white"
                >
                  Account settings
                </Link>

                <Link
                  href="/scan"
                  className="block rounded-xl border border-white/10 px-4 py-3 text-sm text-white/75 transition hover:border-white/25 hover:text-white"
                >
                  Market structure scan
                </Link>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-lg font-semibold">Coming next</h2>

              <div className="mt-5 space-y-3 text-sm text-white/55">
                <p>API keys will be attached to your account.</p>
                <p>Usage and quotas will be displayed from the SaaS layer.</p>
                <p>Billing will be connected after persistent storage.</p>
              </div>
            </section>
          </div>

          {auth.error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {auth.error}
            </div>
          ) : null}
        </div>
      </div>
    </DashboardShell>
  );
}
