/* ============================================================================
 * FILE: lib/xyvala/rfs-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical RFS compatibility entry point
 *
 * ROLE
 * - expose the canonical RFS score execution entry point
 * - expose canonical RFS input and result contracts
 * - preserve a controlled compatibility boundary during migration
 *
 * CLASSIFICATION
 * - PRIVATE ADAPTER
 * - COMPUTE DELEGATION
 * - PURE
 * - NON-MUTATING
 *
 * PARENTS
 * - lib/xyvala/RFS-score.ts
 * - lib/xyvala/rfs/contracts/rfs-score-contract.ts
 *
 * CONSUMERS
 * - private analytical orchestrators
 * - governed migration consumers
 *
 * DIRECTIVES
 * - no analytical computation
 * - no local score reconstruction
 * - no legacy output shaping
 * - no Crash System ownership
 * - no Impulse Layer ownership
 * - no MCI ownership
 * - no timestamp generation
 * - no mutation
 *
 * INPUTS
 * - RfsScoreInput
 *
 * OUTPUTS
 * - RfsScoreResult
 *
 * INVARIANTS
 * - RFS-score.ts remains the unique RFS engine producer
 * - rfs-core.ts delegates without altering input or output
 * - cross-layer variables are never reintroduced
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/RFS-score.ts
 * - lib/xyvala/rfs/contracts/rfs-score-contract.ts
 *
 * SENSITIVE ZONES
 * - compatibility exports
 * - legacy consumer migration
 * ========================================================================== */

import {
  runRFSScore,
} from "@/lib/xyvala/RFS-score";

import type {
  RfsHistoricalMode,
  RfsScoreInput,
  RfsScoreResult,
  RfsTimingState,
} from "@/lib/xyvala/rfs/contracts/rfs-score-contract";

export type RfsInput =
  RfsScoreInput;

export type RfsResult =
  RfsScoreResult;

export type {
  RfsHistoricalMode,
  RfsTimingState,
};

export function computeRfs(
  input: RfsInput,
): RfsResult {
  return runRFSScore(input);
}

export const runRFS =
  computeRfs;

export {
  runRFSScore,
};
