/* ============================================================================
 * FILE: lib/xyvala/engine/mci/mci-market-gates.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala MCI market gates
 *
 * ROLE
 * - pure decision gate layer
 * - preserve WATCH as default
 * - keep rupture protection before opportunity
 *
 * DIRECTIVES
 * - no scoring here
 * - no calibration here
 * - no UI/API logic here
 * - deterministic output only
 * ========================================================================== */

import type { MarketDecision } from "./mci-market-types";

export function resolveDecision(input: {
  stability: number;
  rupture: number;
  opportunity: number;
}): MarketDecision {
  if (input.stability < 40 || input.rupture > 70) {
    return "BLOCK";
  }

  if (
    input.stability > 80 &&
    input.rupture < 30 &&
    input.opportunity > 75
  ) {
    return "ALLOW";
  }

  return "WATCH";
}
