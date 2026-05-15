/* ============================================================================
 * FILE: lib/xyvala/calibration/decision-calibration-state.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala active decision calibration state
 *
 * ROLE
 * - build readable runtime calibration state
 * - hold one active calibration state in memory
 * - expose deterministic get / set / clear accessors
 * - preserve runtime immutability
 *
 * DIRECTIVES
 * - runtime state only
 * - no analytical recomputation
 * - no threshold derivation
 * - no distribution calculation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no UI logic
 * - no API logic
 * - deterministic state only
 * - exactOptionalPropertyTypes compatible
 * ========================================================================== */

import type {
  ActiveDecisionCalibrationState,
  CalibrationPolicySource,
  CalibrationReadableThresholds,
  DecisionCalibrationReadableState,
  DecisionDistribution,
  DecisionDistributionByReason,
  DecisionDistributionByRegime,
  DecisionDistributionPolicy,
} from "@/lib/xyvala/calibration/calibration-contracts";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const TARGET_DISTRIBUTION: DecisionDistribution = {
  allow: 15,
  watch: 70,
  block: 15,
};

const DISTRIBUTION_TOLERANCE = 20;

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function uniqueWarnings(warnings: string[] = []): string[] {
  return [
    ...new Set(
      warnings.filter(
        (warning): warning is string =>
          typeof warning === "string" && warning.trim().length > 0,
      ),
    ),
  ];
}

/* ============================================================================
 * 3. CLONERS
 * ========================================================================== */

function clonePolicy(
  policy: DecisionDistributionPolicy,
): DecisionDistributionPolicy {
  return {
    allow: safeNumber(policy.allow),
    block: safeNumber(policy.block),
    risk: safeNumber(policy.risk),
    support: safeNumber(policy.support),
  };
}

function buildReadableThresholds(
  policy: DecisionDistributionPolicy,
): CalibrationReadableThresholds {
  const clonedPolicy = clonePolicy(policy);

  return {
    allow: clonedPolicy.allow,
    block: clonedPolicy.block,
    risk: clonedPolicy.risk,
    support: clonedPolicy.support,

    allow_raw_score: clonedPolicy.allow,
    block_raw_score: clonedPolicy.block,
    risk_rupture_probability: clonedPolicy.risk,
    decision_support_probability: clonedPolicy.support,
  };
}

function cloneReadableThresholds(
  thresholds: CalibrationReadableThresholds,
): CalibrationReadableThresholds {
  return {
    allow: safeNumber(thresholds.allow),
    block: safeNumber(thresholds.block),
    risk: safeNumber(thresholds.risk),
    support: safeNumber(thresholds.support),

    allow_raw_score: safeNumber(thresholds.allow_raw_score),
    block_raw_score: safeNumber(thresholds.block_raw_score),
    risk_rupture_probability: safeNumber(
      thresholds.risk_rupture_probability,
    ),
    decision_support_probability: safeNumber(
      thresholds.decision_support_probability,
    ),
  };
}

function cloneDistribution(
  distribution?: DecisionDistribution,
): DecisionDistribution {
  return {
    allow: safeNumber(distribution?.allow, TARGET_DISTRIBUTION.allow),
    watch: safeNumber(distribution?.watch, TARGET_DISTRIBUTION.watch),
    block: safeNumber(distribution?.block, TARGET_DISTRIBUTION.block),
  };
}

function cloneRegimeDistribution(
  distribution: DecisionDistributionByRegime,
): DecisionDistributionByRegime {
  return {
    STABLE: cloneDistribution(distribution.STABLE),
    TRANSITION: cloneDistribution(distribution.TRANSITION),
    VOLATILE: cloneDistribution(distribution.VOLATILE),
  };
}

function cloneReasonDistribution(
  distribution: DecisionDistributionByReason,
): DecisionDistributionByReason {
  return { ...distribution };
}

function isDistributionOutsideTolerance(
  distribution?: DecisionDistribution,
): boolean {
  const safeDistribution = cloneDistribution(distribution);

  return (
    Math.abs(safeDistribution.allow - TARGET_DISTRIBUTION.allow) >
      DISTRIBUTION_TOLERANCE ||
    Math.abs(safeDistribution.watch - TARGET_DISTRIBUTION.watch) >
      DISTRIBUTION_TOLERANCE ||
    Math.abs(safeDistribution.block - TARGET_DISTRIBUTION.block) >
      DISTRIBUTION_TOLERANCE
  );
}

/* ============================================================================
 * 4. READABLE STATE BUILDER
 * ========================================================================== */

export function buildDecisionCalibrationState(input: {
  policy: DecisionDistributionPolicy;
  policy_source: CalibrationPolicySource;

  sample_size: number;
  effective_sample_size: number;

  observed_distribution: DecisionDistribution;
  regime_distribution?: DecisionDistributionByRegime;
  reason_distribution?: DecisionDistributionByReason;

  aggregated_score?: DecisionCalibrationReadableState["aggregated_score"];
  rupture_signals?: DecisionCalibrationReadableState["rupture_signals"];
  recovery_signals?: DecisionCalibrationReadableState["recovery_signals"];
  neutralization_signals?: DecisionCalibrationReadableState["neutralization_signals"];
  rupture_comparator?: DecisionCalibrationReadableState["rupture_comparator"];

  flags?: Partial<DecisionCalibrationReadableState["flags"]>;

  warnings?: string[];
}): DecisionCalibrationReadableState {
  const regimeDistribution = input.regime_distribution;

  return {
    thresholds: buildReadableThresholds(input.policy),

    summary: {
      source: input.policy_source,
      sample_size: safeNumber(input.sample_size),
      effective_sample_size: safeNumber(input.effective_sample_size),
    },

    targets: {
      distribution: cloneDistribution(TARGET_DISTRIBUTION),
    },

    observed_distribution: cloneDistribution(input.observed_distribution),

    ...(regimeDistribution
      ? {
          regime_distribution: cloneRegimeDistribution(regimeDistribution),
        }
      : {}),

    ...(input.reason_distribution
      ? {
          reason_distribution: cloneReasonDistribution(
            input.reason_distribution,
          ),
        }
      : {}),

    ...(input.aggregated_score
      ? {
          aggregated_score: { ...input.aggregated_score },
        }
      : {}),

    ...(input.rupture_signals
      ? {
          rupture_signals: { ...input.rupture_signals },
        }
      : {}),

    ...(input.recovery_signals
      ? {
          recovery_signals: { ...input.recovery_signals },
        }
      : {}),

    ...(input.neutralization_signals
      ? {
          neutralization_signals: { ...input.neutralization_signals },
        }
      : {}),

    ...(input.rupture_comparator
      ? {
          rupture_comparator: {
            ...input.rupture_comparator,
            rupture_pressure: {
              ...input.rupture_comparator.rupture_pressure,
            },
            recovery_pressure: {
              ...input.rupture_comparator.recovery_pressure,
            },
          },
        }
      : {}),

    flags: {
      fallback_active: input.policy_source === "fallback",

      global_outside_tolerance: isDistributionOutsideTolerance(
        input.observed_distribution,
      ),

      stable_outside_tolerance: isDistributionOutsideTolerance(
        regimeDistribution?.STABLE,
      ),

      transition_outside_tolerance: isDistributionOutsideTolerance(
        regimeDistribution?.TRANSITION,
      ),

      volatile_outside_tolerance: isDistributionOutsideTolerance(
        regimeDistribution?.VOLATILE,
      ),

      rupture_pressure_elevated: Boolean(
        input.flags?.rupture_pressure_elevated,
      ),

      rupture_pressure_excessive: Boolean(
        input.flags?.rupture_pressure_excessive,
      ),

      recovery_pressure_elevated: Boolean(
        input.flags?.recovery_pressure_elevated,
      ),

      neutralization_active: Boolean(input.flags?.neutralization_active),

      explosive_rupture_detected: Boolean(
        input.flags?.explosive_rupture_detected,
      ),

      defensive_mode_active: Boolean(input.flags?.defensive_mode_active),
    },

    warnings: uniqueWarnings(input.warnings),
  };
}

/* ============================================================================
 * 5. READABLE STATE CLONER
 * ========================================================================== */

function cloneReadableState(
  state: DecisionCalibrationReadableState,
): DecisionCalibrationReadableState {
  return {
    thresholds: cloneReadableThresholds(state.thresholds),

    summary: {
      source: state.summary.source,
      sample_size: safeNumber(state.summary.sample_size),
      effective_sample_size: safeNumber(state.summary.effective_sample_size),
    },

    targets: {
      distribution: cloneDistribution(state.targets.distribution),

      ...(state.targets.global
        ? {
            global: { ...state.targets.global },
          }
        : {}),

      ...(state.targets.regime_targets
        ? {
            regime_targets: { ...state.targets.regime_targets },
          }
        : {}),
    },

    ...(state.observed_distribution
      ? {
          observed_distribution: cloneDistribution(
            state.observed_distribution,
          ),
        }
      : {}),

    ...(state.regime_distribution
      ? {
          regime_distribution: cloneRegimeDistribution(
            state.regime_distribution,
          ),
        }
      : {}),

    ...(state.reason_distribution
      ? {
          reason_distribution: cloneReasonDistribution(
            state.reason_distribution,
          ),
        }
      : {}),

    ...(state.aggregated_score
      ? {
          aggregated_score: { ...state.aggregated_score },
        }
      : {}),

    ...(state.rupture_signals
      ? {
          rupture_signals: { ...state.rupture_signals },
        }
      : {}),

    ...(state.recovery_signals
      ? {
          recovery_signals: { ...state.recovery_signals },
        }
      : {}),

    ...(state.neutralization_signals
      ? {
          neutralization_signals: { ...state.neutralization_signals },
        }
      : {}),

    ...(state.rupture_comparator
      ? {
          rupture_comparator: {
            ...state.rupture_comparator,
            rupture_pressure: {
              ...state.rupture_comparator.rupture_pressure,
            },
            recovery_pressure: {
              ...state.rupture_comparator.recovery_pressure,
            },
          },
        }
      : {}),

    flags: {
      fallback_active: Boolean(state.flags.fallback_active),
      global_outside_tolerance: Boolean(
        state.flags.global_outside_tolerance,
      ),
      stable_outside_tolerance: Boolean(
        state.flags.stable_outside_tolerance,
      ),
      transition_outside_tolerance: Boolean(
        state.flags.transition_outside_tolerance,
      ),
      volatile_outside_tolerance: Boolean(
        state.flags.volatile_outside_tolerance,
      ),
      rupture_pressure_elevated: Boolean(
        state.flags.rupture_pressure_elevated,
      ),
      rupture_pressure_excessive: Boolean(
        state.flags.rupture_pressure_excessive,
      ),
      recovery_pressure_elevated: Boolean(
        state.flags.recovery_pressure_elevated,
      ),
      neutralization_active: Boolean(state.flags.neutralization_active),
      explosive_rupture_detected: Boolean(
        state.flags.explosive_rupture_detected,
      ),
      defensive_mode_active: Boolean(state.flags.defensive_mode_active),
    },

    warnings: uniqueWarnings(state.warnings),
  };
}

/* ============================================================================
 * 6. ACTIVE STATE HOLDER
 * ========================================================================== */

let activeDecisionCalibrationState: ActiveDecisionCalibrationState | null = null;

export function getCalibrationState(): ActiveDecisionCalibrationState | null {
  if (!activeDecisionCalibrationState) {
    return null;
  }

  return {
    policy: clonePolicy(activeDecisionCalibrationState.policy),
    state: cloneReadableState(activeDecisionCalibrationState.state),
    last_updated_ts: safeNumber(
      activeDecisionCalibrationState.last_updated_ts,
      Date.now(),
    ),
  };
}

export function setCalibrationState(
  next: ActiveDecisionCalibrationState,
): ActiveDecisionCalibrationState {
  activeDecisionCalibrationState = {
    policy: clonePolicy(next.policy),
    state: cloneReadableState(next.state),
    last_updated_ts: safeNumber(next.last_updated_ts, Date.now()),
  };

  const stored = getCalibrationState();

  if (!stored) {
    throw new Error("CALIBRATION_STATE_WRITE_FAILED");
  }

  return stored;
}

export function clearCalibrationState(): void {
  activeDecisionCalibrationState = null;
}

/* ============================================================================
 * 7. TYPE RE-EXPORTS
 * ========================================================================== */

export type {
  ActiveDecisionCalibrationState,
  DecisionCalibrationReadableState,
  DecisionDistributionPolicy,
};
