"use client";

/* ============================================================================
 * FILE: components/dashboard/dashboard-header.tsx
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private dashboard header
 *
 * ROLE
 * - render the canonical private dashboard header
 * - expose account identity and plan context from public auth state
 * - provide a stable action area for dashboard CTAs
 *
 * PARENTS
 * - components/dashboard/dashboard-shell.tsx
 * - app/dashboard/page.tsx
 * - components/auth/auth-provider.tsx
 *
 * DIRECTIVES
 * - UI composition only
 * - no auth reconstruction
 * - no cookie parsing
 * - no API calls
 * - no account-store access
 * - no billing logic
 * - no API key generation
 * - no quota computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no private score exposure
 * - consume public auth state only
 * - deterministic rendering only
 *
 * INPUTS
 * - title
 * - description
 * - eyebrow
 * - action
 *
 * OUTPUTS
 * - private dashboard header
 *
 * INVARIANTS
 * - header never mutates auth state
 * - header never validates sessions
 * - header never infers access scope
 * - account data displayed is public account data only
 * ========================================================================== */

import React, { type ReactNode } from "react";

import { useAuth } from "@/components/auth/auth-provider";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type DashboardHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
};

/* ============================================================================
 * 2. HELPERS
 * ========================================================================== */

function planLabel(value: string | undefined): string {
  if (value === "demo") return "Demo";
  if (value === "trader") return "Trader";
  if (value === "pro") return "Pro";
  if (value === "enterprise") return "Enterprise";

  return "Unknown";
}

function displayIdentity(input: {
  displayName: string | null | undefined;
  email: string | undefined;
}): string {
  if (input.displayName && input.displayName.trim().length > 0) {
    return input.displayName;
  }

  return input.email ?? "Account";
}

/* ============================================================================
 * 3. HEADER
 * ========================================================================== */

export default function DashboardHeader({
  title,
  description,
  eyebrow = "Xyvala Private Workspace",
  action,
}: DashboardHeaderProps) {
  const auth = useAuth();

  const account = auth.account;

  return (
    <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div>
        <p className="mb-2 text-sm uppercase tracking-[0.3em] text-white/40">
          {eyebrow}
        </p>

        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>

        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
            {description}
          </p>
        ) : null}

        {account ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded-full border border-white/10 px-3 py-1 text-white/55">
              {displayIdentity({
                displayName: account.display_name,
                email: account.email,
              })}
            </span>

            <span className="rounded-full border border-white/10 px-3 py-1 text-white/55">
              Plan: {planLabel(account.plan)}
            </span>

            <span className="rounded-full border border-white/10 px-3 py-1 text-white/55">
              Status: {account.status}
            </span>
          </div>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
