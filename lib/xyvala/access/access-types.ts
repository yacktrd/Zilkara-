/* ============================================================================
 * FILE: lib/xyvala/access/access-types.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - define the canonical type system for access governance in Xyvala
 * - ensure strict typing consistency across auth, usage, access and UI layers
 * - prevent any contract drift or implicit interpretation
 *
 * PARENTS
 * - lib/xyvala/access/access-compartments.ts
 * - lib/xyvala/access/access-resolver.ts
 * - lib/xyvala/auth.ts
 *
 * DIRECTIVES
 * - no dynamic typing
 * - no loose unions
 * - no optional structural fields
 * - full determinism
 *
 * INPUTS
 * - none (type system only)
 *
 * OUTPUTS
 * - AccessCompartment
 * - AccessVisiblePercent
 * - AccessScope
 * - AccessMeta
 *
 * INVARIANTS
 * - each AccessCompartment must map to one AccessScope
 * - visiblePercent must match its compartment
 * - no partial AccessScope allowed
 * - same contract must be used across all layers
 *
 * CRITICAL DEPENDENCIES
 * - must remain aligned with access-compartments.ts
 *
 * SENSITIVE ZONES
 * - visiblePercent (product perception)
 * - maxAssets (performance + monetization)
 * - feature flags (UI/API exposure)
 * ========================================================================== */

/* ============================================================================
 * 1. ACCESS COMPARTMENTS (CLOSED SET)
 * ----------------------------------------------------------------------------
 * RULES
 * - strict union
 * - no extension without versioning
 * ========================================================================== */

export type AccessCompartment =
  | "public_10"
  | "demo_30"
  | "trader_60"
  | "full_100";

/* ============================================================================
 * 2. VISIBLE PERCENT (LOCKED VALUES)
 * ----------------------------------------------------------------------------
 * RULES
 * - must match compartments
 * - prevents arbitrary percentages
 * ========================================================================== */

export type AccessVisiblePercent = 10 | 30 | 60 | 100;

/* ============================================================================
 * 3. ACCESS SCOPE (FULL CONTRACT)
 * ----------------------------------------------------------------------------
 * RULES
 * - fully explicit
 * - no optional fields
 * - no runtime inference allowed
 * ========================================================================== */

export type AccessScope = {
  /* identity */
  compartment: AccessCompartment;
  visiblePercent: AccessVisiblePercent;

  /* quantitative limits */
  maxAssets: number;

  /* feature flags */
  showScoreDelta: boolean;
  showScoreTrend: boolean;
  showMarketContext: boolean;
  showAdvancedStats: boolean;
  showHistory: boolean;
  showDecision: boolean;
  showAdmin: boolean;
};

/* ============================================================================
 * 4. ACCESS META (SAFE EXPOSURE LAYER)
 * ----------------------------------------------------------------------------
 * ROLE
 * - minimal exposure version for public/UI usage
 * - avoids leaking internal feature flags
 *
 * RULES
 * - must stay subset of AccessScope
 * - no hidden inference
 * ========================================================================== */

export type AccessMeta = {
  compartment: AccessCompartment;
  visiblePercent: AccessVisiblePercent;
  maxAssets: number;
};

/* ============================================================================
 * 5. CONTRACT GUARD (OPTIONAL ENTERPRISE SAFETY)
 * ----------------------------------------------------------------------------
 * ROLE
 * - validate runtime integrity when needed
 * - used in tests or debug layers
 * ========================================================================== */

export function isAccessScope(value: unknown): value is AccessScope {
  if (!value || typeof value !== "object") return false;

  const v = value as AccessScope;

  return (
    typeof v.compartment === "string" &&
    (v.visiblePercent === 10 ||
      v.visiblePercent === 30 ||
      v.visiblePercent === 60 ||
      v.visiblePercent === 100) &&
    typeof v.maxAssets === "number" &&
    typeof v.showScoreDelta === "boolean" &&
    typeof v.showScoreTrend === "boolean" &&
    typeof v.showMarketContext === "boolean" &&
    typeof v.showAdvancedStats === "boolean" &&
    typeof v.showHistory === "boolean" &&
    typeof v.showDecision === "boolean" &&
    typeof v.showAdmin === "boolean"
  );
}
