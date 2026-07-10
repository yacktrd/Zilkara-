"use client";

/* ============================================================================
 * FILE: app/account/page.tsx
 * ========================================================================== */

import React from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth/auth-provider";

/* ============================================================================
 * 1. HELPERS
 * ========================================================================== */

function formatDate(value: string | null): string {
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

function planLabel(value: string): string {
  if (value === "demo") return "Demo";
  if (value === "trader") return "Trader";
  if (value === "pro") return "Pro";
  if (value === "enterprise") return "Enterprise";

  return "Unknown";
}

/* ============================================================================
 * 2. PAGE
 * ========================================================================== */

export default function AccountPage() {
  const auth = useAuth();

  if (auth.loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6">
          <p className="text-sm text-white/50">Loading account...</p>
        </section>
      </main>
    );
  }

  if (!auth.authenticated || !auth.account) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
          <p className="mb-2 text-sm uppercase tracking-[0.3em] text-white/40">
            Xyvala Account
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Sign in required
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/55">
            You need an active Xyvala account to access this private workspace.
          </p>

          <Link
            href="/login"
            className="mt-8 rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-black transition hover:bg-white/90"
          >
            Sign in
          </Link>

          <Link
            href="/register"
            className="mt-3 rounded-xl border border-white/10 px-4 py-3 text-center text-sm text-white/70 transition hover:border-white/25"
          >
            Create account
          </Link>
        </section>
      </main>
    );
  }

  const account = auth.account;
  const session = auth.session;

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <div className="mb-10">
          <p className="mb-2 text-sm uppercase tracking-[0.3em] text-white/40">
            Xyvala Private Workspace
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Account
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
            Manage your account identity, plan and private Xyvala access.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">Profile</h2>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-white/35">Email</p>
                <p className="mt-1 text-white">{account.email}</p>
              </div>

              <div>
                <p className="text-white/35">Display name</p>
                <p className="mt-1 text-white">
                  {account.display_name ?? "Unavailable"}
                </p>
              </div>

              <div>
                <p className="text-white/35">Status</p>
                <p className="mt-1 text-white">{account.status}</p>
              </div>

              <div>
                <p className="text-white/35">Role</p>
                <p className="mt-1 text-white">{account.role}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">Plan</h2>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-white/35">Current plan</p>
                <p className="mt-1 text-white">{planLabel(account.plan)}</p>
              </div>

              <div>
                <p className="text-white/35">Default currency</p>
                <p className="mt-1 text-white">{account.default_currency}</p>
              </div>

              <div>
                <p className="text-white/35">Jurisdiction</p>
                <p className="mt-1 text-white">{account.jurisdiction}</p>
              </div>

              <div>
                <p className="text-white/35">Created</p>
                <p className="mt-1 text-white">
                  {formatDate(account.created_at)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">Session</h2>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-white/35">Session status</p>
                <p className="mt-1 text-white">
                  {session?.status ?? "Unavailable"}
                </p>
              </div>

              <div>
                <p className="text-white/35">Expires</p>
                <p className="mt-1 text-white">
                  {formatDate(session?.expires_at ?? null)}
                </p>
              </div>

              <div>
                <p className="text-white/35">Last login</p>
                <p className="mt-1 text-white">
                  {formatDate(account.last_login_at)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">Access</h2>

            <div className="mt-5 space-y-4 text-sm">
              <p className="leading-6 text-white/55">
                Your account is connected to the Xyvala private access layer.
                API keys, billing and advanced plan controls will be attached
                here next.
              </p>

              <Link
                href="/scan"
                className="inline-flex rounded-xl border border-white/10 px-4 py-3 text-sm text-white/80 transition hover:border-white/25"
              >
                Open scan
              </Link>
            </div>
          </section>
        </div>

        {auth.error ? (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {auth.error}
          </div>
        ) : null}
      </section>
    </main>
  );
}
