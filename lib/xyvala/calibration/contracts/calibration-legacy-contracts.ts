/* ============================================================================
 * FILE: lib/xyvala/calibration/contracts/calibration-legacy-contracts.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala calibration legacy compatibility contracts
 *
 * ROLE
 * - centralize temporary legacy aliases
 * - preserve compatibility during progressive migration
 * - isolate deprecated names from canonical calibration contracts
 *
 * DIRECTIVES
 * - contracts only
 * - no runtime logic
 * - no persistence logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no UI logic
 * - no API logic
 * - legacy aliases only
 * - no new canonical concept in this file
 *
 * INVARIANTS
 * - canonical contracts remain in their domain files
 * - aliases are temporary migration helpers
 * - remove aliases only after all imports have migrated
 * - no canonical contract must be redefined here
 * ========================================================================== */

import type {
  CalibrationDecision,
  CalibrationMaturity,
  CalibrationPolicySource,
  CalibrationRegime,
  DominanceState,
  PressureState,
  ReliabilityLevel,
  ValidityState,
} from "./calibration-core-contracts";

import type {
  DecisionDistribution,
  DistributionStats,
  ReasonDistribution,
  RegimeDistribution,
  RegimeStats,
  RegimeTarget,
  TargetDistribution,
} from "./calibration-distribution-contracts";

import type {
  CalibrationPolicy,
  PolicyBuildInput,
  PolicyResult,
  ReadableThresholds,
} from "./calibration-policy-contracts";

import type {
  DecisionSample,
  DecisionSampleInput,
  SampleAppendResult,
  SampleReadInput,
  SampleReadResult,
  SamplesAppendResult,
  StoreStats,
} from "./calibration-sample-contracts";

import type {
  ActiveState,
  OrchestratorInput,
  OrchestratorResult,
  ReadableState,
  ReadableStateInput,
  RuntimeState,
} from "./calibration-runtime-contracts";

import type {
  CalibrationReport,
  OpportunityReport,
  ReportSummary,
} from "./calibration-report-contracts";

import type {
  RuptureComparator,
} from "./calibration-governance-contracts";

/* ============================================================================
 * 1. CORE LEGACY ALIASES
 * ========================================================================== */

export type CalibrationMaturityState = CalibrationMaturity;

export type CalibrationValidityState = ValidityState;

export type CalibrationReliabilityLevel = ReliabilityLevel;

export type DecisionPressureState = PressureState;

export type RecoveryRuptureDominanceState = DominanceState;

export type StoredMarketDecision = CalibrationDecision;

export type MarketDecision = CalibrationDecision;

export type StoredRegime = CalibrationRegime;

export type MarketRegime = CalibrationRegime;

export type StoredDominanceState = DominanceState;

export type StoredDecisionReason = string;

export type DecisionReason = string;

/* ============================================================================
 * 2. SAMPLE LEGACY ALIASES
 * ========================================================================== */

export type DecisionDistributionSample = DecisionSample;

export type DecisionDistributionSampleInput = DecisionSampleInput;

export type ReadDecisionDistributionSamplesInput = SampleReadInput;

export type ReadDecisionDistributionSamplesResult = SampleReadResult;

export type AppendDecisionDistributionSampleResult = SampleAppendResult;

export type AppendDecisionDistributionSamplesResult =
  SamplesAppendResult;

export type DecisionDistributionStoreStats = StoreStats;

export type StoredDecisionDistributionSample = DecisionSample;

/* ============================================================================
 * 3. DISTRIBUTION LEGACY ALIASES
 * ========================================================================== */

export type SimpleDecisionDistribution = DecisionDistribution;

export type SimpleDecisionDistributionByRegime = RegimeDistribution;

export type SimpleDecisionDistributionByReason = ReasonDistribution;

export type StatisticalDecisionDistribution = DistributionStats;

export type StatisticalDecisionDistributionByRegime = RegimeStats;

export type TargetDecisionDistribution = TargetDistribution;

export type TargetDecisionDistributionByRegime = RegimeTarget;

export type DecisionDistributionByRegime = RegimeDistribution;

export type DecisionDistributionByReason = ReasonDistribution;

export type DecisionDistributionTarget = TargetDistribution;

export type RegimeDistributionTarget = RegimeTarget;

export type DecisionDistributionStats = DistributionStats;

export type RegimeDistributionStats = RegimeStats;

export type CalibrationDecisionDistribution = DecisionDistribution;

export type CalibrationDecisionDistributionByRegime =
  RegimeDistribution;

/* ============================================================================
 * 4. POLICY / THRESHOLD LEGACY ALIASES
 * ========================================================================== */

export type CalibrationThresholdPolicy = CalibrationPolicy;

export type DecisionDistributionPolicy = CalibrationPolicy;

export type MciThresholdPolicy = CalibrationPolicy;

export type CalibrationReadableThresholds = ReadableThresholds;

export type MciReadableThresholds = ReadableThresholds;

export type DecisionDistributionPolicyBuildInput = PolicyBuildInput;

export type BuildDecisionDistributionPolicyInput =
  PolicyBuildInput;

export type DecisionDistributionPolicyBuildResult = PolicyResult;

export type BuildDecisionDistributionPolicyResult =
  PolicyResult;

export type AdaptiveDecisionDistributionPolicy = PolicyResult;

/* ============================================================================
 * 5. RUNTIME LEGACY ALIASES
 * ========================================================================== */

export type ReadableCalibrationStateInput =
  ReadableStateInput;

export type ReadableCalibrationState = ReadableState;

export type DecisionCalibrationReadableState = ReadableState;

export type ActiveCalibrationState = ActiveState;

export type ActiveDecisionCalibrationState = ActiveState;

export type RuntimeCalibrationState = RuntimeState;

export type CalibrationRuntimeState = RuntimeState;

export type CalibrationOrchestratorInput =
  OrchestratorInput;

export type CalibrationOrchestratorResult =
  OrchestratorResult;

/* ============================================================================
 * 6. REPORT LEGACY ALIASES
 * ========================================================================== */

export type DecisionCalibrationReport = CalibrationReport;

export type CalibrationReportSummary = ReportSummary;

export type OpportunityCalibrationReport = OpportunityReport;

/* ============================================================================
 * 7. GOVERNANCE LEGACY ALIASES
 * ========================================================================== */

export type RuptureRecoveryComparator = RuptureComparator;

/* ============================================================================
 * 8. POLICY SOURCE LEGACY ALIASES
 * ========================================================================== */

export type CalibrationSource = CalibrationPolicySource;
