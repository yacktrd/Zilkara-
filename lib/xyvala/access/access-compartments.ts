/* ============================================================================
 * FILE: lib/xyvala/access/access-compartments.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical access compartments
 *
 * ROLE
 * - define static product access compartments
 * - separate public, client, premium and internal admin exposure
 * - keep access tiers deterministic, auditable and non-dynamic
 *
 * DIRECTIVES
 * - declarative mapping only
 * - no auth logic
 * - no billing logic
 * - no route logic
 * - no runtime inference
 * - no mutation
 * - client premium access must never imply admin access
 *
 * INVARIANTS
 * - public_10 < demo_30 < trader_60 < full_100 < admin_100
 * - full_100 is client-facing premium access
 * - admin_100 is internal-only system access
 * - showAdmin is true only for admin_100
 * ========================================================================== */

import type { AccessCompartment, AccessScope } from "./access-types";

export const ACCESS_COMPARTMENTS: Record<AccessCompartment, AccessScope> =
  Object.freeze({
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
      showAdmin: false,
    }),

    admin_100: Object.freeze({
      compartment: "admin_100",
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
