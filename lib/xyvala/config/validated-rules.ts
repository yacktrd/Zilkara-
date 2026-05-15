/* ============================================================================
 * FILE: lib/xyvala/config/validated-rules.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - stores validated Xyvala logic that must be preserved over time
 * - locked rules cannot be changed without explicit structural justification
 * ========================================================================== */

export const XYVALA_VALIDATED_RULES = {
  stability_v1: {
    is_locked: false,
    validated_sample_size: 0,
    note: "Long-term stability rule not locked yet",
  },

  mid_term_v1: {
    is_locked: false,
    validated_sample_size: 0,
    note: "Quarter positioning rule not locked yet",
  },

  regime_v1: {
    is_locked: false,
    validated_sample_size: 0,
    note: "Month-in-quarter regime rule not locked yet",
  },

  validation_7d_v1: {
    is_locked: false,
    validated_sample_size: 0,
    note: "7D confirmation rule not locked yet",
  },

  timing_24h_v1: {
    is_locked: false,
    validated_sample_size: 0,
    note: "24H execution timing rule not locked yet",
  },
} as const;
