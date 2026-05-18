/* ============================================================================
 * FILE: lib/xyvala/calibration/impulse-calibration-orchestrator.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala impulse calibration orchestrator
 *
 * ROLE
 * - orchestrate adaptive impulse calibration from runtime samples
 * - build adaptive impulse policy
 * - write impulse distribution snapshot
 * - validate impulse distribution health
 * - expose deterministic calibration runtime result
 *
 * PARENT FILES
 * - lib/xyvala/calibration/impulse-adaptive-thresholds.ts
 * - lib/xyvala/calibration/impulse-distribution-store.ts
 * - lib/xyvala/engine/impulse-state-core.ts
 * - lib/xyvala/scan-engine.ts
 *
 * DIRECTIVES
 * - calibration orchestration only
 * - no UI logic
 * - no API logic
 * - no provider parsing
 * - no RFS recomputation
 * - no MCI recomputation
 * - no public projection
 * - no market decision
 * - no investment advice
 * - no prediction
 * - deterministic only
 * - same input => same output
 *
 * INPUTS
 * - impulse adaptive samples
 *
 * OUTPUTS
 * - adaptive impulse policy
 * - impulse distribution snapshot
 * - calibration validity state
 * - calibration warnings
 *
 * INVARIANTS
 * - orchestrator does not compute impulse scores
 * - orchestrator does not mutate source samples
 * - orchestrator does not expose private decisions publicly
 * - distribution dominance must be detected
 * - excessive RELEASE / EXHAUSTION activation must be controlled
 * - fallback policy remains valid under insufficient samples
 * ========================================================================== */

import {
  buildImpulseAdaptivePolicy,
  type ImpulseAdaptivePolicy,
  type ImpulseAdaptiveSample,
  type ImpulseAdaptiveState,
} from "@/lib/xyvala/calibration/impulse-adaptive-thresholds";

import {
  buildImpulseDistributionSnapshot,
  writeImpulseDistributionSnapshot,
  type ImpulseDistributionSnapshot,
} from "@/lib/xyvala/calibration/impulse-distribution-store";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type ImpulseCalibrationValidity =
  | "computed"
  | "fallback"
  | "degraded"
  | "invalid";

export type ImpulseCalibrationDominanceState =
  | "balanced"
  | "neutral_dominant"
  | "release_overactive"
  | "exhaustion_overactive"
  | "fragmented"
  | "unknown";

export type ImpulseCalibrationOrchestratorResult = {
  ok: boolean;
  validity: ImpulseCalibrationValidity;
  dominance_state: ImpulseCalibrationDominanceState;

  sample_size: number;

  policy: ImpulseAdaptivePolicy;
  distribution_snapshot: ImpulseDistributionSnapshot;

  dominant_state: ImpulseAdaptiveState;

  release_ratio: number;
  exhaustion_ratio: number;
  compression_ratio: number;

  warnings: string[];
};

/* ============================================================================
 * 2. CONSTANTS
 * ========================================================================== */

const MIN_VALID_SAMPLE_SIZE = 40;

const NEUTRAL_DOMINANCE_RATIO = 0.85;
const RELEASE_OVERACTIVE_RATIO = 0.35;
const EXHAUSTION_OVERACTIVE_RATIO = 0.35;
const FRAGMENTED_DOMINANT_MAX_RATIO = 0.32;

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function uniqueWarnings(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function safeRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/* ============================================================================
 * 4. DISTRIBUTION GOVERNANCE
 * ========================================================================== */

function resolveDominanceState(
  snapshot: ImpulseDistributionSnapshot,
): ImpulseCalibrationDominanceState {
  const sampleSize = snapshot.sample_size;

  if (sampleSize <= 0) {
    return "unknown";
  }

  const neutralCount = snapshot.state_distribution.NEUTRAL;
  const releaseRatio = safeRatio(snapshot.release_ratio);
  const exhaustionRatio = safeRatio(snapshot.exhaustion_ratio);

  const neutralRatio = neutralCount / sampleSize;

  const dominantCount = snapshot.state_distribution[snapshot.dominant_state];
  const dominantRatio = dominantCount / sampleSize;

  if (neutralRatio >= NEUTRAL_DOMINANCE_RATIO) {
    return "neutral_dominant";
  }

  if (releaseRatio >= RELEASE_OVERACTIVE_RATIO) {
    return "release_overactive";
  }

  if (exhaustionRatio >= EXHAUSTION_OVERACTIVE_RATIO) {
    return "exhaustion_overactive";
  }

  if (dominantRatio <= FRAGMENTED_DOMINANT_MAX_RATIO) {
    return "fragmented";
  }

  return "balanced";
}

function resolveValidity(input: {
  policy: ImpulseAdaptivePolicy;
  snapshot: ImpulseDistributionSnapshot;
  dominance_state: ImpulseCalibrationDominanceState;
}): ImpulseCalibrationValidity {
  if (input.snapshot.sample_size <= 0) {
    return "invalid";
  }

  if (input.policy.source === "fallback") {
    return "fallback";
  }

  if (
    input.snapshot.sample_size < MIN_VALID_SAMPLE_SIZE ||
    input.dominance_state === "neutral_dominant" ||
    input.dominance_state === "release_overactive" ||
    input.dominance_state === "exhaustion_overactive"
  ) {
    return "degraded";
  }

  return "computed";
}

function buildGovernanceWarnings(input: {
  policy: ImpulseAdaptivePolicy;
  snapshot: ImpulseDistributionSnapshot;
  dominance_state: ImpulseCalibrationDominanceState;
  validity: ImpulseCalibrationValidity;
}): string[] {
  const warnings: string[] = [
    ...input.policy.warnings,
    ...input.snapshot.warnings,
  ];

  if (input.snapshot.sample_size <= 0) {
    warnings.push("impulse_calibration_no_samples");
  }

  if (input.snapshot.sample_size < MIN_VALID_SAMPLE_SIZE) {
    warnings.push("impulse_calibration_insufficient_valid_sample_size");
  }

  if (input.policy.source === "fallback") {
    warnings.push("impulse_calibration_policy_fallback");
  }

  if (input.dominance_state === "neutral_dominant") {
    warnings.push("impulse_calibration_neutral_dominance");
  }

  if (input.dominance_state === "release_overactive") {
    warnings.push("impulse_calibration_release_overactivation");
  }

  if (input.dominance_state === "exhaustion_overactive") {
    warnings.push("impulse_calibration_exhaustion_overactivation");
  }

  if (input.dominance_state === "fragmented") {
    warnings.push("impulse_calibration_fragmented_distribution");
  }

  if (input.validity === "invalid") {
    warnings.push("impulse_calibration_invalid");
  }

  if (input.validity === "degraded") {
    warnings.push("impulse_calibration_degraded");
  }

  return uniqueWarnings(warnings);
}

/* ============================================================================
 * 5. ORCHESTRATION
 * ========================================================================== */

export function orchestrateImpulseCalibration(input: {
  samples: readonly ImpulseAdaptiveSample[];
  timestamp?: number;
  write_store?: boolean;
}): ImpulseCalibrationOrchestratorResult {
  const policy = buildImpulseAdaptivePolicy(input.samples);

  const snapshotInput: {
    samples: readonly ImpulseAdaptiveSample[];
    policy: ImpulseAdaptivePolicy;
    timestamp?: number;
  } = {
    samples: input.samples,
    policy,
  };

  if (input.timestamp !== undefined) {
    snapshotInput.timestamp = input.timestamp;
  }

  const distributionSnapshot =
    input.write_store === false
      ? buildImpulseDistributionSnapshot(snapshotInput)
      : writeImpulseDistributionSnapshot(snapshotInput);

  const dominanceState = resolveDominanceState(distributionSnapshot);

  const validity = resolveValidity({
    policy,
    snapshot: distributionSnapshot,
    dominance_state: dominanceState,
  });

  const warnings = buildGovernanceWarnings({
    policy,
    snapshot: distributionSnapshot,
    dominance_state: dominanceState,
    validity,
  });

  return {
    ok: validity === "computed" || validity === "fallback",
    validity,
    dominance_state: dominanceState,

    sample_size: distributionSnapshot.sample_size,

    policy,
    distribution_snapshot: distributionSnapshot,

    dominant_state: distributionSnapshot.dominant_state,

    release_ratio: distributionSnapshot.release_ratio,
    exhaustion_ratio: distributionSnapshot.exhaustion_ratio,
    compression_ratio: distributionSnapshot.compression_ratio,

    warnings,
  };
}

/* ============================================================================
 * 6. READ-ONLY HELPERS
 * ========================================================================== */

export function isImpulseCalibrationUsable(
  result: ImpulseCalibrationOrchestratorResult,
): boolean {
  return result.validity === "computed" || result.validity === "fallback";
}

export function isImpulseCalibrationDegraded(
  result: ImpulseCalibrationOrchestratorResult,
): boolean {
  return result.validity === "degraded" || result.validity === "invalid";
}

export function shouldBlockImpulseAggression(
  result: ImpulseCalibrationOrchestratorResult,
): boolean {
  return (
    result.dominance_state === "release_overactive" ||
    result.dominance_state === "exhaustion_overactive" ||
    result.validity === "invalid"
  );
}
