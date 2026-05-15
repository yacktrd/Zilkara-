/* ============================================================================
 * FILE: lib/xyvala/access/access-compartments.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - define canonical access compartments used across the Xyvala system
 * - map each compartment to a deterministic and auditable access scope
 * - serve as the single source of truth for UI/API feature exposure levels
 *
 * PARENTS
 * - lib/xyvala/access/access-types.ts
 * - lib/xyvala/access/access-resolver.ts
 *
 * DIRECTIVES
 * - no dynamic logic
 * - no mutation
 * - no runtime inference
 * - pure declarative mapping
 *
 * INPUTS
 * - none (static definition)
 *
 * OUTPUTS
 * - ACCESS_COMPARTMENTS: Record<AccessCompartment, AccessScope>
 *
 * INVARIANTS
 * - each compartment must map to exactly one AccessScope
 * - no missing fields in AccessScope
 * - values must remain stable across versions unless explicitly versioned
 * - same input => same output (absolute determinism)
 *
 * CRITICAL DEPENDENCIES
 * - AccessCompartment
 * - AccessScope
 *
 * SENSITIVE ZONES
 * - feature exposure flags (UI / API)
 * - maxAssets (impacts performance and monetization)
 * - visiblePercent (impacts product perception)
 * ========================================================================== */

import type { AccessCompartment, AccessScope } from "./access-types";

/* ============================================================================
 * ACCESS COMPARTMENTS — CANONICAL MAPPING
 * ----------------------------------------------------------------------------
 * RULES
 * - strictly static
 * - must not be computed at runtime
 * - must remain aligned with monetization tiers
 * - must remain consistent with access-resolver.ts
 *
 * HIERARCHY
 * public_10 < demo_30 < trader_60 < full_100
 * ========================================================================== */

export const ACCESS_COMPARTMENTS: Record<AccessCompartment, AccessScope> = Object.freeze({
  public_10: Object.freeze({
    compartment: "public_10",
    visiblePercent: 10,
    maxAssets: 10,

    showScoreDelta: false,
    showScoreTrend: false,
    showMarketContext: false,
    showAdvancedStats: false,
    showHistory: false,
    showDecision: false,
    showAdmin: false,
  }),

  demo_30: Object.freeze({
    compartment: "demo_30",
    visiblePercent: 30,
    maxAssets: 25,

    showScoreDelta: false,
    showScoreTrend: true,
    showMarketContext: true,
    showAdvancedStats: false,
    showHistory: false,
    showDecision: false,
    showAdmin: false,
  }),

  trader_60: Object.freeze({
    compartment: "trader_60",
    visiblePercent: 60,
    maxAssets: 100,

    showScoreDelta: true,
    showScoreTrend: true,
    showMarketContext: true,
    showAdvancedStats: true,
    showHistory: true,
    showDecision: false,
    showAdmin: false,
  }),

  full_100: Object.freeze({
    compartment: "full_100",
    visiblePercent: 100,
    maxAssets: 250,

    showScoreDelta: true,
    showScoreTrend: true,
    showMarketContext: true,
    showAdvancedStats: true,
    showHistory: true,
    showDecision: true,
    showAdmin: true,
  }),
});
