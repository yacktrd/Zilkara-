/* ============================================================================
 * FILE: lib/xyvala/calibration/impulse-calibration-orchestrator.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical impulse calibration orchestrator
 *
 * ROLE
 * - orchestrate deterministic Impulse Layer threshold calibration
 * - build the canonical resolved impulse policy from validated samples
 * - build or persist the corresponding impulse distribution snapshot
 * - qualify distribution balance and calibration runtime validity
 * - expose explicit calibration governance and observability metadata
 *
 * CLASSIFICATION
 * - PRIVATE
 * - CALIBRATION ORCHESTRATION
 * - COMPUTE / OBSERVE
 * - OPTIONAL MUTATE THROUGH GOVERNED STORE
 * - NON-ANALYTICAL
 *
 * POSITION IN OFFICIAL CHAIN
 * - Acquisition
 * - RFS
 * - Triple Layer
 * - Impulse Layer
 * - Analytical Aggregation System
 * - MCI
 * - Calibration
 * - Snapshot
 * - Transformers
 * - Rankings
 * - API
 * - Interface
 *
 * PARENTS
 * - lib/xyvala/calibration/impulse-adaptive-thresholds.ts
 * - lib/xyvala/calibration/impulse-distribution-store.ts
 * - lib/xyvala/engine/impulse-state-core.ts
 *
 * CONSUMERS
 * - canonical private analytical orchestrator
 * - internal calibration seed tooling
 * - internal calibration observability
 * - private calibration snapshot projection
 *
 * DIRECTIVES
 * - calibration orchestration only
 * - deterministic only
 * - explicit timestamp required
 * - no local clock access
 * - no timestamp generation
 * - no source-sample mutation
 * - no RFS recomputation
 * - no Triple Layer recomputation
 * - no Impulse score recomputation
 * - no Impulse transition-state recomputation
 * - no MCI computation
 * - no decision computation
 * - no public projection
 * - no API response construction
 * - no UI logic
 * - no provider parsing
 * - no console logging
 * - no score clamping
 * - no unavailable-to-zero substitution
 * - no unavailable-to-neutral substitution
 * - no market prediction
 * - no investment semantics
 *
 * INPUTS
 * - canonical Impulse adaptive samples
 * - explicit runtime timestamp
 * - explicit runtime-store mutation authorization
 * - optional upstream governance warnings
 *
 * OUTPUTS
 * - canonical ImpulseResolvedPolicy
 * - immutable impulse distribution snapshot
 * - calibration validity state
 * - distribution dominance qualification
 * - explicit observability ratios
 * - calibration warnings
 *
 * OWNERSHIP
 * - Impulse Layer owns impulse scores and transition states
 * - Triple Layer owns growth, core-pattern and decay scores
 * - adaptive threshold producer owns calibration policy computation
 * - distribution store owns runtime distribution persistence
 * - this orchestrator owns calibration execution ordering and qualification only
 *
 * INVARIANTS
 * - the orchestrator never calculates an Impulse score
 * - the orchestrator never resolves an Impulse transition state
 * - the orchestrator never mutates source samples
 * - the same samples and timestamp produce the same result
 * - fallback remains an explicit valid defensive calibration state
 * - bootstrap remains distinct from fully adaptive calibration
 * - unavailable distribution ratios remain null
 * - null never means zero
 * - zero remains a valid observed ratio or occurrence count
 * - state dominance is calculated from observed state labels only
 * - unlabeled samples never become NEUTRAL
 * - runtime persistence is executed at most once
 *
 * BOUNDARIES
 * - Impulse / Triple Layer samples -> Calibration
 * - Calibration policy -> Distribution observation
 * - Distribution observation -> Optional runtime store
 *
 * FIRST DIVERGENCE
 * - invalid calibration samples
 *   => upstream sample producer -> calibration policy producer
 *
 * - valid policy but invalid distribution input
 *   => calibration policy -> distribution observation
 *
 * - valid snapshot altered during persistence
 *   => distribution observation -> runtime store
 *
 * SENSITIVE ZONES
 * - policy type identity
 * - explicit timestamp propagation
 * - nullable distribution ratios
 * - observed-state denominator
 * - dominance thresholds
 * - fallback and bootstrap qualification
 * - optional runtime mutation
 * ========================================================================== */

import {
  buildImpulseAdaptivePolicy,
  type ImpulseAdaptiveSample,
} from "@/lib/xyvala/calibration/impulse-adaptive-thresholds";

import {
  buildImpulseDistributionSnapshot,
  writeImpulseDistributionSnapshot,
  type BuildImpulseDistributionSnapshotInput,
  type ImpulseDistributionSnapshot,
  type ImpulseStateDistribution,
} from "@/lib/xyvala/calibration/impulse-distribution-store";

import type {
  CalibratableImpulseTransitionState,
  ImpulseResolvedPolicy,
} from "@/lib/xyvala/engine/impulse-state-core";

/* ============================================================================
 * 1. PUBLIC CONTRACTS
 * ========================================================================== */

export type ImpulseCalibrationValidity =
  | "computed"
  | "bootstrap"
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

export type ImpulseCalibrationOrchestratorInput =
  Readonly<{
    samples:
      readonly ImpulseAdaptiveSample[];

    timestamp:
      number;

    write_store?:
      boolean;

    warnings?:
      readonly string[];
  }>;

export type ImpulseCalibrationOrchestratorResult =
  Readonly<{
    ok:
      boolean;

    validity:
      ImpulseCalibrationValidity;

    dominance_state:
      ImpulseCalibrationDominanceState;

    sample_size:
      number;

    observed_state_count:
      number;

    policy:
      ImpulseResolvedPolicy;

    distribution_snapshot:
      ImpulseDistributionSnapshot;

    dominant_state:
      CalibratableImpulseTransitionState | null;

    release_ratio:
      number | null;

    exhaustion_ratio:
      number | null;

    compression_ratio:
      number | null;

    warnings:
      readonly string[];
  }>;

/* ============================================================================
 * 2. GOVERNED CONSTANTS
 * ----------------------------------------------------------------------------
 * Adaptive-policy sample boundaries are defined by the canonical adaptive
 * threshold producer:
 *
 * - fallback: insufficient bootstrap population
 * - bootstrap: sufficient exploratory population but below adaptive population
 * - adaptive: canonical fully calibrated population
 *
 * This orchestrator does not redefine those analytical thresholds.
 * It only governs distribution-health qualification.
 * ========================================================================== */

const NEUTRAL_DOMINANCE_RATIO =
  0.85;

const RELEASE_OVERACTIVE_RATIO =
  0.35;

const EXHAUSTION_OVERACTIVE_RATIO =
  0.35;

const FRAGMENTED_DOMINANT_MAX_RATIO =
  0.32;

/* ============================================================================
 * 3. PURE VALIDATION HELPERS
 * ========================================================================== */

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function assertTimestamp(
  value: unknown,
): number {
  if (
    !isFiniteNumber(value) ||
    value < 0
  ) {
    throw new RangeError(
      "IMPULSE_CALIBRATION_TIMESTAMP_INVALID: timestamp must be a finite non-negative number",
    );
  }

  return value;
}

function uniqueWarnings(
  values: readonly string[],
): string[] {
  const normalized =
    values
      .filter(
        (
          value,
        ): value is string =>
          typeof value === "string",
      )
      .map(
        (value) =>
          value.trim(),
      )
      .filter(
        (value) =>
          value.length > 0,
      );

  return [
    ...new Set(
      normalized,
    ),
  ];
}

function readRatio(
  value: number | null,
  variableName: string,
): number | null {
  if (value === null) {
    return null;
  }

  if (
    !isFiniteNumber(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new RangeError(
      `IMPULSE_CALIBRATION_RATIO_INVALID: ${variableName} must be null or a finite ratio between 0 and 1`,
    );
  }

  return value;
}

/* ============================================================================
 * 4. STATE DISTRIBUTION READERS
 * ----------------------------------------------------------------------------
 * Distribution counters are observable values.
 *
 * Zero is therefore a valid explicit occurrence count.
 * ========================================================================== */

function computeObservedStateCount(
  distribution:
    ImpulseStateDistribution,
): number {
  return (
    distribution.COMPRESSION +
    distribution
      .PRESSURE_BUILDING +
    distribution.RELEASE +
    distribution.EXHAUSTION +
    distribution.NEUTRAL
  );
}

function readStateCount(
  distribution:
    ImpulseStateDistribution,

  state:
    CalibratableImpulseTransitionState,
): number {
  switch (state) {
    case "COMPRESSION":
      return distribution
        .COMPRESSION;

    case "PRESSURE_BUILDING":
      return distribution
        .PRESSURE_BUILDING;

    case "RELEASE":
      return distribution
        .RELEASE;

    case "EXHAUSTION":
      return distribution
        .EXHAUSTION;

    case "NEUTRAL":
      return distribution
        .NEUTRAL;
  }
}

/* ============================================================================
 * 5. DISTRIBUTION GOVERNANCE
 * ----------------------------------------------------------------------------
 * Dominance is measured only over samples carrying an observed transition
 * state.
 *
 * Samples without transition_state:
 * - remain part of total sample_size
 * - do not become NEUTRAL
 * - do not distort the state-distribution denominator
 * ========================================================================== */

function resolveDominanceState(
  snapshot:
    ImpulseDistributionSnapshot,
): ImpulseCalibrationDominanceState {
  const observedStateCount =
    computeObservedStateCount(
      snapshot
        .state_distribution,
    );

  if (
    observedStateCount <= 0 ||
    snapshot.dominant_state ===
      null
  ) {
    return "unknown";
  }

  const releaseRatio =
    readRatio(
      snapshot.release_ratio,
      "release_ratio",
    );

  const exhaustionRatio =
    readRatio(
      snapshot.exhaustion_ratio,
      "exhaustion_ratio",
    );

  const neutralRatio =
    snapshot
      .state_distribution
      .NEUTRAL /
    observedStateCount;

  const dominantCount =
    readStateCount(
      snapshot
        .state_distribution,

      snapshot
        .dominant_state,
    );

  const dominantRatio =
    dominantCount /
    observedStateCount;

  if (
    neutralRatio >=
    NEUTRAL_DOMINANCE_RATIO
  ) {
    return "neutral_dominant";
  }

  if (
    releaseRatio !== null &&
    releaseRatio >=
      RELEASE_OVERACTIVE_RATIO
  ) {
    return "release_overactive";
  }

  if (
    exhaustionRatio !== null &&
    exhaustionRatio >=
      EXHAUSTION_OVERACTIVE_RATIO
  ) {
    return "exhaustion_overactive";
  }

  if (
    dominantRatio <=
    FRAGMENTED_DOMINANT_MAX_RATIO
  ) {
    return "fragmented";
  }

  return "balanced";
}

/* ============================================================================
 * 6. CALIBRATION VALIDITY
 * ----------------------------------------------------------------------------
 * Policy source remains authoritative for calibration maturity.
 *
 * Distribution health may degrade an adaptive or bootstrap policy but never
 * promotes a policy to a higher maturity state.
 * ========================================================================== */

function hasCriticalDominance(
  dominanceState:
    ImpulseCalibrationDominanceState,
): boolean {
  return (
    dominanceState ===
      "neutral_dominant" ||
    dominanceState ===
      "release_overactive" ||
    dominanceState ===
      "exhaustion_overactive"
  );
}

function resolveValidity(
  input: Readonly<{
    policy:
      ImpulseResolvedPolicy;

    snapshot:
      ImpulseDistributionSnapshot;

    dominance_state:
      ImpulseCalibrationDominanceState;
  }>,
): ImpulseCalibrationValidity {
  if (
    input.snapshot.sample_size <=
    0
  ) {
    return "invalid";
  }

  if (
    input.policy.source ===
    "fallback"
  ) {
    return "fallback";
  }

  if (
    hasCriticalDominance(
      input.dominance_state,
    )
  ) {
    return "degraded";
  }

  if (
    input.policy.source ===
    "bootstrap"
  ) {
    return input.dominance_state ===
      "unknown"
      ? "degraded"
      : "bootstrap";
  }

  if (
    input.policy.source ===
      "adaptive" &&
    input.dominance_state !==
      "unknown"
  ) {
    return "computed";
  }

  /*
   * A static policy is valid for canonical Impulse execution but does not
   * constitute a runtime adaptive-calibration result.
   */
  if (
    input.policy.source ===
    "static"
  ) {
    return "fallback";
  }

  return "degraded";
}

/* ============================================================================
 * 7. GOVERNANCE WARNINGS
 * ========================================================================== */

function buildGovernanceWarnings(
  input: Readonly<{
    policy:
      ImpulseResolvedPolicy;

    snapshot:
      ImpulseDistributionSnapshot;

    dominance_state:
      ImpulseCalibrationDominanceState;

    validity:
      ImpulseCalibrationValidity;

    upstream_warnings:
      readonly string[];
  }>,
): string[] {
  const warnings: string[] = [
    ...input
      .upstream_warnings,

    ...input
      .policy
      .warnings,

    ...input
      .snapshot
      .warnings,
  ];

  const observedStateCount =
    computeObservedStateCount(
      input.snapshot
        .state_distribution,
    );

  if (
    input.snapshot.sample_size <=
    0
  ) {
    warnings.push(
      "impulse_calibration_no_samples",
    );
  }

  if (
    observedStateCount <= 0
  ) {
    warnings.push(
      "impulse_calibration_no_observed_transition_states",
    );
  }

  if (
    observedStateCount <
    input.snapshot.sample_size
  ) {
    warnings.push(
      "impulse_calibration_partial_transition_state_observation",
    );
  }

  if (
    input.policy.source ===
    "fallback"
  ) {
    warnings.push(
      "impulse_calibration_policy_fallback",
    );
  }

  if (
    input.policy.source ===
    "bootstrap"
  ) {
    warnings.push(
      "impulse_calibration_policy_bootstrap",
    );
  }

  if (
    input.dominance_state ===
    "neutral_dominant"
  ) {
    warnings.push(
      "impulse_calibration_neutral_dominance",
    );
  }

  if (
    input.dominance_state ===
    "release_overactive"
  ) {
    warnings.push(
      "impulse_calibration_release_overactivation",
    );
  }

  if (
    input.dominance_state ===
    "exhaustion_overactive"
  ) {
    warnings.push(
      "impulse_calibration_exhaustion_overactivation",
    );
  }

  if (
    input.dominance_state ===
    "fragmented"
  ) {
    warnings.push(
      "impulse_calibration_fragmented_distribution",
    );
  }

  if (
    input.dominance_state ===
    "unknown"
  ) {
    warnings.push(
      "impulse_calibration_distribution_unknown",
    );
  }

  if (
    input.validity ===
    "invalid"
  ) {
    warnings.push(
      "impulse_calibration_invalid",
    );
  }

  if (
    input.validity ===
    "degraded"
  ) {
    warnings.push(
      "impulse_calibration_degraded",
    );
  }

  return uniqueWarnings(
    warnings,
  );
}

/* ============================================================================
 * 8. SNAPSHOT EXECUTION
 * ----------------------------------------------------------------------------
 * Pure snapshot construction and runtime mutation remain explicitly separated.
 * ========================================================================== */

function buildSnapshotInput(
  input:
    ImpulseCalibrationOrchestratorInput,

  policy:
    ImpulseResolvedPolicy,

  timestamp:
    number,
): BuildImpulseDistributionSnapshotInput {
  return {
    samples:
      input.samples,

    policy,

    timestamp,

    ...(
      input.warnings ===
      undefined
        ? {}
        : {
            warnings:
              input.warnings,
          }
    ),
  };
}

function executeDistributionSnapshot(
  input: Readonly<{
    snapshot_input:
      BuildImpulseDistributionSnapshotInput;

    write_store:
      boolean;
  }>,
): ImpulseDistributionSnapshot {
  return input.write_store
    ? writeImpulseDistributionSnapshot(
        input.snapshot_input,
      )
    : buildImpulseDistributionSnapshot(
        input.snapshot_input,
      );
}

/* ============================================================================
 * 9. CANONICAL ORCHESTRATION
 * ========================================================================== */

export function orchestrateImpulseCalibration(
  input:
    ImpulseCalibrationOrchestratorInput,
): ImpulseCalibrationOrchestratorResult {
  const timestamp =
    assertTimestamp(
      input.timestamp,
    );

  const policy =
    buildImpulseAdaptivePolicy(
      input.samples,
    );

  const snapshotInput =
    buildSnapshotInput(
      input,
      policy,
      timestamp,
    );

  const distributionSnapshot =
    executeDistributionSnapshot({
      snapshot_input:
        snapshotInput,

      write_store:
        input.write_store ??
        true,
    });

  const dominanceState =
    resolveDominanceState(
      distributionSnapshot,
    );

  const validity =
    resolveValidity({
      policy,

      snapshot:
        distributionSnapshot,

      dominance_state:
        dominanceState,
    });

  const warnings =
    buildGovernanceWarnings({
      policy,

      snapshot:
        distributionSnapshot,

      dominance_state:
        dominanceState,

      validity,

      upstream_warnings:
        input.warnings ??
        [],
    });

  const observedStateCount =
    computeObservedStateCount(
      distributionSnapshot
        .state_distribution,
    );

  return Object.freeze({
    ok:
      validity ===
        "computed" ||
      validity ===
        "bootstrap" ||
      validity ===
        "fallback",

    validity,

    dominance_state:
      dominanceState,

    sample_size:
      distributionSnapshot
        .sample_size,

    observed_state_count:
      observedStateCount,

    policy,

    distribution_snapshot:
      distributionSnapshot,

    dominant_state:
      distributionSnapshot
        .dominant_state,

    release_ratio:
      readRatio(
        distributionSnapshot
          .release_ratio,
        "release_ratio",
      ),

    exhaustion_ratio:
      readRatio(
        distributionSnapshot
          .exhaustion_ratio,
        "exhaustion_ratio",
      ),

    compression_ratio:
      readRatio(
        distributionSnapshot
          .compression_ratio,
        "compression_ratio",
      ),

    warnings:
      Object.freeze(
        warnings,
      ),
  });
}

/* ============================================================================
 * 10. READ-ONLY GOVERNANCE HELPERS
 * ========================================================================== */

export function isImpulseCalibrationUsable(
  result:
    ImpulseCalibrationOrchestratorResult,
): boolean {
  return (
    result.validity ===
      "computed" ||
    result.validity ===
      "bootstrap" ||
    result.validity ===
      "fallback"
  );
}

export function isImpulseCalibrationFullyAdaptive(
  result:
    ImpulseCalibrationOrchestratorResult,
): boolean {
  return (
    result.validity ===
    "computed"
  );
}

export function isImpulseCalibrationDegraded(
  result:
    ImpulseCalibrationOrchestratorResult,
): boolean {
  return (
    result.validity ===
      "degraded" ||
    result.validity ===
      "invalid"
  );
}

export function shouldBlockImpulseAggression(
  result:
    ImpulseCalibrationOrchestratorResult,
): boolean {
  return (
    result.dominance_state ===
      "release_overactive" ||
    result.dominance_state ===
      "exhaustion_overactive" ||
    result.validity ===
      "degraded" ||
    result.validity ===
      "invalid"
  );
}
