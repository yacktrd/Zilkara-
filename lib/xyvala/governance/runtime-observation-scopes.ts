/* ============================================================================
 * FILE: lib/xyvala/governance/runtime-observation-scopes.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical runtime observation scopes
 *
 * ROLE
 * - define explicit governance expectations for canonical executions
 * - prevent execution scope from being reconstructed locally
 *
 * DIRECTIVES
 * - governance contracts only
 * - no runtime computation
 * - no trace generation
 * - no mutation
 * ========================================================================== */

import type {
  VariableOwnerLayer,
} from "@/lib/xyvala/governance/variable-lineage-registry";

import type {
  LineageGovernanceScope,
} from "@/lib/xyvala/governance/lineage-reconciliation/lineage-types";

/* ============================================================================
 * 1. CANONICAL SCAN REBUILD
 * ========================================================================== */

export const CANONICAL_SCAN_REBUILD_SCOPE =
  Object.freeze({
    scope_name:
      "canonical_scan_rebuild",

    executed_layers: [
      "ACQUISITION",
      "RFS",
      "TRIPLE_LAYER",
      "IMPULSE_LAYER",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
      "CALIBRATION",
      "SNAPSHOT",
      "TRANSFORMER",
    ],

    /*
     * Start with variables that are genuinely emitted by the current runtime.
     * Extend this contract only when instrumentation is present.
     */
    required_variables: [
      "id",
      "symbol",
      "name",
      "price_eur",
      "chg_24h_pct",
      "chg_7d_pct",
      "sparkline_7d",

      "stability_score",
      "regime",
      "rupture_score",
      "rupture_probability",
      "continuity_probability",

      "growth_layer",
      "core_pattern_layer",
      "decay_layer",

      "impulse_pressure_score",
      "impulse_instability_score",
      "impulse_saturation_score",
      "impulse_exhaustion_score",
      "impulse_directional_bias",
      "impulse_transition_state",

      "decision",
    ],

    optional_variables: [
      "decision_score",
      "opportunity_score",
      "confidence_score",

      "structural_context",
      "transition_context",
      "risk_context",
      "temporal_context",

      "public_structure_transition",
      "public_impulse_context",
    ],

    strict_required_variables:
      true,
  } satisfies LineageGovernanceScope);
