// lib/xyvala/access/access-compartments.ts

import type { AccessCompartment, AccessScope } from "./access-types";

export const ACCESS_COMPARTMENTS: Record<AccessCompartment, AccessScope> = {
  public_10: {
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
  },

  demo_30: {
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
  },

  trader_60: {
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
  },

  full_100: {
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
  },
};
