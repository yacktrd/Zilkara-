/* ============================================================================
 * FILE: lib/xyvala/config/distribution-targets.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - target output distribution registry for Xyvala
 * - used to validate whether thresholds are too soft or too aggressive
 * ========================================================================== */

export const XYVALA_DISTRIBUTION_TARGETS = {
  stability: {
    high_pct_min: 20,
    high_pct_max: 30,
    medium_pct_min: 40,
    medium_pct_max: 50,
    low_pct_min: 20,
    low_pct_max: 30,
  },

  mid_term: {
    favorable_pct_min: 20,
    favorable_pct_max: 35,
    neutral_pct_min: 35,
    neutral_pct_max: 50,
    unfavorable_pct_min: 20,
    unfavorable_pct_max: 35,
  },

  regime: {
    stable_pct_min: 25,
    stable_pct_max: 35,
    transition_pct_min: 40,
    transition_pct_max: 50,
    volatile_pct_min: 20,
    volatile_pct_max: 30,
  },

  decision: {
    allow_pct_min: 5,
    allow_pct_max: 10,
    watch_pct_min: 30,
    watch_pct_max: 50,
    block_pct_min: 40,
    block_pct_max: 60,
  },
} as const;
