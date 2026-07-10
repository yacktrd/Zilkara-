"use client";

/* ============================================================================
 * FILE: components/navigation/navigation-shell.tsx
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala application navigation shell
 *
 * ROLE
 * - provide the canonical UI shell for public and authenticated pages
 * - mount global navigation around page content
 * - preserve layout consistency across scan, account and dashboard surfaces
 *
 * PARENTS
 * - app/layout.tsx
 * - components/navigation/navbar.tsx
 * - components/navigation/account-menu.tsx
 * - components/auth/auth-provider.tsx
 *
 * DIRECTIVES
 * - UI composition only
 * - no auth reconstruction
 * - no cookie parsing
 * - no API calls
 * - no account-store access
 * - no billing logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no private score exposure
 * - consume child components only
 * - deterministic rendering only
 *
 * INPUTS
 * - children
 *
 * OUTPUTS
 * - global application shell
 *
 * INVARIANTS
 * - navigation remains global
 * - children remain untouched
 * - shell does not mutate auth state
 * - shell does not infer access scope
 * ========================================================================== */

import React, { type ReactNode } from "react";

import Navbar from "@/components/navigation/navbar";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type NavigationShellProps = {
  children: ReactNode;
};

/* ============================================================================
 * 2. SHELL
 * ========================================================================== */

export default function NavigationShell({ children }: NavigationShellProps) {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <main className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
}
