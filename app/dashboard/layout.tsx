/* ============================================================================
 * FILE: app/dashboard/layout.tsx
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private dashboard layout
 *
 * ROLE
 * - protect every /dashboard route
 * - centralize dashboard private runtime boundary
 * - keep dashboard pages passive and auth-provider driven
 *
 * PARENTS
 * - app/layout.tsx
 * - components/auth/protected-route.tsx
 * - components/auth/auth-provider.tsx
 * - middleware.ts
 *
 * DIRECTIVES
 * - layout orchestration only
 * - no auth reconstruction
 * - no cookie parsing
 * - no account-store access
 * - no API calls
 * - no billing logic
 * - no API key logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no private score exposure
 * - deterministic rendering only
 *
 * INPUTS
 * - children
 *
 * OUTPUTS
 * - protected dashboard subtree
 *
 * INVARIANTS
 * - all dashboard pages require authenticated client state
 * - middleware handles first entry protection
 * - ProtectedRoute handles hydration/runtime protection
 * - dashboard pages remain UI-only
 * ========================================================================== */

import React, { type ReactNode } from "react";

import ProtectedRoute from "@/components/auth/protected-route";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type DashboardLayoutProps = {
  children: ReactNode;
};

/* ============================================================================
 * 2. LAYOUT
 * ========================================================================== */

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
