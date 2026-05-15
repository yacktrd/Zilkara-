
/* ============================================================================
 * FILE: lib/xyvala/engine/mci/mci-market-policy.ts
 * ========================================================================== */

export const POLICY_VERSION = "v9";

export const STATIC_POLICY = {
  block: {
    stability_max: 35,
    rupture_min: 78,
  },
  allow: {
    stability_min: 80,
    rupture_max: 30,
  },
};

export const WATCH_CONFIG = {
  opportunity_factor: 0.8,
};
