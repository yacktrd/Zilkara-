/* ============================================================================
 * FILE: lib/xyvala/config/thresholds.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - central threshold registry for Xyvala
 * - single source of truth for scoring, states, validation and timing
 * - all future calibrations must start here
 * ========================================================================== */

export const XYVALA_THRESHOLDS = {
  stability: {
    high_min: 68,
    medium_min: 52,
  },

  mid_term: {
    favorable_min: 64,
    neutral_min: 46,
  },

  regime: {
    favorable: {
      stable_max_deviation: 7,
      stable_max_instability: 52,
      stable_max_break_rate_pct: 38,
      volatile_min_deviation: 16,
      volatile_min_instability: 67,
      volatile_min_break_rate_pct: 51,
    },

    neutral: {
      stable_max_deviation: 5,
      stable_max_instability: 48,
      stable_max_break_rate_pct: 34,
      volatile_min_deviation: 14,
      volatile_min_instability: 63,
      volatile_min_break_rate_pct: 47,
    },

    unfavorable: {
      transition_max_deviation: 5,
      transition_max_instability: 44,
      transition_max_break_rate_pct: 28,
    },
  },

  validation_7d: {
    strong_positive_min: 4.5,
    positive_min: 2.0,
    moderate_negative_max: -3.0,
    strong_negative_max: -6.5,
  },

  timing_24h: {
    good_min: 1.0,
    bad_max: -1.5,
  },

  rupture: {
    low_max: 35.99,
    moderate_max: 59.99,
    high_min: 60,
    critical_min: 78,
  },

  decision: {
    allow: {
      stability_min: 68,
      mid_term_min: 64,
      rupture_max: 34,
    },
    watch: {
      stability_min: 56,
      mid_term_min: 50,
      rupture_max: 55,
    },
  },
} as const;
