// lib/xyvala/access/access-types.ts

export type AccessCompartment =
  | "public_10"
  | "demo_30"
  | "trader_60"
  | "full_100";

export type AccessVisiblePercent = 10 | 30 | 60 | 100;

export type AccessScope = {
  compartment: AccessCompartment;
  visiblePercent: AccessVisiblePercent;

  maxAssets: number;

  showScoreDelta: boolean;
  showScoreTrend: boolean;
  showMarketContext: boolean;
  showAdvancedStats: boolean;
  showHistory: boolean;
  showDecision: boolean;
  showAdmin: boolean;
};

export type AccessMeta = {
  compartment: AccessCompartment;
  visiblePercent: AccessVisiblePercent;
  maxAssets: number;
};
