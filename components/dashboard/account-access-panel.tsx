"use client";

/* ============================================================================
 * FILE: components/dashboard/account-access-panel.tsx
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala account access panel
 *
 * ROLE
 * - display the resolved account access context
 * - expose plan, compartment and feature availability in the private dashboard
 * - keep SaaS entitlement display separate from billing and API key logic
 *
 * PARENTS
 * - lib/xyvala/accounts/account-access.ts
 * - components/auth/auth-provider.tsx
 * - app/dashboard/page.tsx
 * - app/account/page.tsx
 *
 * DIRECTIVES
 * - UI display only
 * - no access reconstruction outside account-access resolver
 * - no billing mutation
 * - no API key generation
 * - no quota computation
 * - no session validation
 * - no account-store access
 * - no RFS recomputation
 * - no MCI recomputation
 * - consume public auth state only
 * - deterministic rendering only
 *
 * INVARIANTS
 * - missing account renders unavailable state
 * - account-access.ts remains the source of entitlement resolution
 * - panel never mutates auth or billing state
 * ========================================================================== */

import React, { useMemo } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { resolvePublicAccountAccess } from "@/lib/xyvala/accounts/account-access";

/* ============================================================================
 * 1. HELPERS
 * ========================================================================== */

function yesNo(value: boolean): string {
  return value ? "Enabled" : "Disabled";
}

function formatCompartment(value: string): string {
  if (value === "public_10") return "Public 10";
  if (value === "demo_30") return "Demo 30";
  if (value === "trader_60") return "Trader 60";
  if (value === "full_100") return "Full 100";

  return value;
}

/* ============================================================================
 * 2. COMPONENT
 * ========================================================================== */

export default function AccountAccessPanel() {
  const auth = useAuth();

  const access = useMemo(
    () => resolvePublicAccountAccess(auth.account),
    [auth.account],
  );

  if (!access) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold">Access</h2>

        <p className="mt-4 text-sm leading-6 text-white/55">
          Account access is unavailable until a valid session is loaded.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <p className="text-sm text-white/35">Access compartment</p>

          <h2 className="mt-2 text-xl font-semibold">
            {formatCompartment(access.compartment)}
          </h2>

          <p className="mt-3 text-sm leading-6 text-white/55">
            This access context is derived from your account plan and controls
            future dashboard, API and billing capabilities.
          </p>
        </div>

        <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/45">
          {access.access_state}
        </span>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 px-4 py-3">
          <p className="text-xs text-white/35">Visible universe</p>
          <p className="mt-1 text-sm text-white">
            {access.scope.visiblePercent}% / {access.scope.maxAssets} assets
          </p>
        </div>

        <div className="rounded-xl border border-white/10 px-4 py-3">
          <p className="text-xs text-white/35">Dashboard</p>
          <p className="mt-1 text-sm text-white">
            {yesNo(access.can_access_dashboard)}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 px-4 py-3">
          <p className="text-xs text-white/35">API access</p>
          <p className="mt-1 text-sm text-white">
            {yesNo(access.can_access_api)}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 px-4 py-3">
          <p className="text-xs text-white/35">API keys</p>
          <p className="mt-1 text-sm text-white">
            {yesNo(access.can_manage_api_keys)}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 px-4 py-3">
          <p className="text-xs text-white/35">Billing</p>
          <p className="mt-1 text-sm text-white">
            {yesNo(access.can_manage_billing)}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 px-4 py-3">
          <p className="text-xs text-white/35">Reason</p>
          <p className="mt-1 text-sm text-white">{access.access_reason}</p>
        </div>
      </div>

      {access.warnings.length > 0 ? (
        <div className="mt-5 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
          {access.warnings.join(", ")}
        </div>
      ) : null}
    </section>
  );
}
