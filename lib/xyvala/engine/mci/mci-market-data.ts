/* ============================================================================
 * FILE: lib/xyvala/engine/mci/mci-market-data.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala MCI market data block
 *
 * ROLE
 * - DATA BLOCK ONLY
 * - normalize all inputs
 * - determine execution context
 *
 * DIRECTIVES
 * - no scoring logic here
 * - no gate logic here
 * - no output shaping here
 * - no calibration logic here
 * - no store logic here
 * - deterministic normalization only
 * ========================================================================== */

import type {
  MciExecutionMode,
  RunMciMarketInput,
} from "./mci-market-types";

export type NormalizedMciMarketData = {
  rfs: RunMciMarketInput["rfs"];
  behavior: NonNullable<RunMciMarketInput["behavior"]> | null;
  hasHistory: boolean;
  hasLive: boolean;
};

export function resolveExecutionMode(input: RunMciMarketInput): MciExecutionMode {
  const hasHistory = Boolean(input.historicalPatterns?.length);
  const hasLive = Boolean(input.liveSupport);

  if (!hasHistory && !hasLive) {
    return "SNAPSHOT_ONLY";
  }

  if (!hasHistory) {
    return "NO_HISTORY";
  }

  if (!hasLive) {
    return "NO_LIVE";
  }

  return "FULL_CONTEXT";
}

export function normalizeData(
  input: RunMciMarketInput,
): NormalizedMciMarketData {
  return {
    rfs: input.rfs,
    behavior: input.behavior ?? null,
    hasHistory: Boolean(input.historicalPatterns?.length),
    hasLive: Boolean(input.liveSupport),
  };
}
