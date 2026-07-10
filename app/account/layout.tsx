/* ============================================================================
 * FILE: app/account/layout.tsx
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private account layout
 *
 * ROLE
 * - protect every /account route
 * - centralize account private runtime boundary
 * - keep account pages passive and auth-provider driven
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
 * - protected account subtree
 *
 * INVARIANTS
 * - all account pages require authenticated client state
 * - middleware handles first entry protection
 * - ProtectedRoute handles hydration/runtime protection
 * - account pages remain UI-only
 * ========================================================================== */

import React, { type ReactNode } from "react";

import ProtectedRoute from "@/components/auth/protected-route";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type AccountLayoutProps = {
  children: ReactNode;
};

/* ============================================================================
 * 2. LAYOUT
 * ========================================================================== */

export default function AccountLayout({ children }: AccountLayoutProps) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
