/* ============================================================================
 * FILE: lib/xyvala/rfs-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala RFS public bridge
 *
 * ROLE
 * - expose the canonical RFS structural engine
 * - preserve stable imports for scan-service, MCI and API consumers
 *
 * DIRECTIVES
 * - bridge only
 * - no scoring logic
 * - no pattern logic
 * - no timestamp logic
 * - no local recomputation
 * - no mutation
 * - no API logic
 * - no UI logic
 * - RFS-score.ts remains the single RFS engine source
 * ========================================================================== */

import { runRFSScore } from "@/lib/xyvala/RFS-score";

import type {
  RfsScoreInput,
  RfsScoreResult,
  RfsHistoricalMode,
  RfsTimingState,
  RfsCrashState,
} from "@/lib/xyvala/RFS-score";

export type RfsInput = RfsScoreInput;
export type RfsResult = RfsScoreResult;

export type {
  RfsHistoricalMode,
  RfsTimingState,
  RfsCrashState,
};

export function computeRfs(input: RfsInput): RfsResult {
  return runRFSScore(input);
}

export const runRFS = computeRfs;

export { runRFSScore };
