/* ============================================================================
 * FILE: components/dashboard/dashboard-shell.tsx
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private dashboard shell
 *
 * ROLE
 * - provide the canonical dashboard UI container
 * - structure private dashboard pages consistently
 * - prepare future dashboard sections for quotas, API keys, billing and usage
 *
 * PARENTS
 * - app/dashboard/layout.tsx
 * - app/dashboard/page.tsx
 * - components/auth/protected-route.tsx
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
 * - deterministic rendering only
 *
 * INPUTS
 * - title
 * - description
 * - children
 *
 * OUTPUTS
 * - stable private dashboard layout
 *
 * INVARIANTS
 * - children remain untouched
 * - shell does not mutate auth state
 * - shell does not infer access scope
 * - shell remains compatible with future sidebar/header extraction
 * ========================================================================== */

import React, { type ReactNode } from "react";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type DashboardShellProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
};

/* ============================================================================
 * 2. SHELL
 * ========================================================================== */

export default function DashboardShell({
  title,
  description,
  eyebrow = "Xyvala Private Workspace",
  action,
  children,
}: DashboardShellProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16">
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
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {children}
    </section>
  );
}
