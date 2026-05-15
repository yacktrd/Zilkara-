/* ============================================================================
 * FILE: lib/xyvala/calibration/decision-distribution-store.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala decision distribution store compatibility entrypoint
 *
 * ROLE
 * - preserve legacy import path
 * - re-export the segmented decision distribution store API
 *
 * DIRECTIVES
 * - compatibility only
 * - no runtime logic
 * - no normalization logic
 * - no validation logic
 * - no persistence duplication
 * ========================================================================== */

export {
  appendDecisionDistributionSample,
  appendDecisionDistributionSamples,
  readDecisionDistributionSamples,
  clearDecisionDistributionStore,
  getDecisionDistributionStoreStats,
} from "@/lib/xyvala/calibration/store/decision-distribution-store";

export type {
  DecisionSample,
  DecisionSampleInput,
  SampleAppendResult,
  SamplesAppendResult,
  SampleReadInput,
  SampleReadResult,
  StoreStats,
} from "@/lib/xyvala/calibration/calibration-contracts";
