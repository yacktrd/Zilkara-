/* ============================================================================
 * FILE: test-orchestrator.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - execute a deterministic local test for Xyvala MCI orchestration
 * - validate that the orchestrator can resolve a final decision from a
 *   contract-compliant RFS input
 * - validate that decision samples are appended into the calibration store
 * - provide a minimal but structurally valid local harness for debugging
 *
 * PARENTS
 * - lib/xyvala/engine/mci-orchestrator.ts
 * - lib/xyvala/engine/rfs-market.ts
 * - lib/xyvala/calibration/decision-distribution-store.ts
 *
 * DIRECTIVES
 * - local test only
 * - no provider parsing here
 * - no route logic here
 * - no UI logic here
 * - no snapshot shaping here
 * - deterministic inputs only
 * - same input => same output
 * - use a contract-compliant RFS mock
 * - preserve Xyvala hierarchy and strict typing
 *
 * INPUTS
 * - none from runtime user input
 * - static local RFS mock
 *
 * OUTPUTS
 * - orchestrator result printed to stdout
 *
 * INVARIANTS
 * - RFS mock must respect the real engine contract
 * - output must remain reproducible
 * - test must not mutate product contract truth
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/engine/mci-orchestrator.ts
 * - lib/xyvala/engine/rfs-market.ts
 *
 * SENSITIVE ZONES
 * - RFS mock contract alignment
 * - strict enum compatibility
 * - local calibration side effects
 * ========================================================================== */

import { runMciOrchestrator } from "./lib/xyvala/engine/mci-orchestrator";

const result = runMciOrchestrator({
  asset_id: "test-btc",
  symbol: "BTC",
  analytical_version: "v8",
  horizon: "7D",
  refresh_calibration: true,

  rfs: {
    metrics: {
      pattern_count: 12,
      sample_size: 120,
      direction_changes: 3,
      rupture_events: 1,
      stable_run_length: 8,
      dominant_direction_ratio: 72,
      liquidity_support: 64,
      confirmation_alignment: "ALIGNED",
    },
    axes: {
      occurrence: 62,
      convergence: 58,
      duration: 61,
      frequency: 57,
      correlation: 52,
    },
    scores: {
      occurrence: 62,
      convergence: 58,
      duration: 61,
      frequency: 57,
      correlation: 52,
      stability: 80,
      structure: 76,
      rupture: 24,
      mid_term: 63,
    },
    states: {
      regime: "STABLE",
      mid_term_state: "FAVORABLE",
      rfs_status: "VALID",
    },
    probabilities: {
      rupture_probability: 24,
      continuity_probability: 73,
    },
    quality: {
      confidence: 69,
    },
    warnings: [],
  },
});

console.log("RESULT =", JSON.stringify(result, null, 2));
