/* ============================================================================
 * FILE: lib/xyvala/calibration/decision-calibration-state.ts
 * ========================================================================== */

import type {
  ActiveState,
  AggregatedScore,
  CalibrationPolicy,
  CalibrationPolicySource,
  DecisionDistribution,
  NeutralizationSignals,
  ReadableState,
  ReadableThresholds,
  ReasonDistribution,
  RecoveryPressure,
  RegimeDistribution,
  RuptureComparator,
  RupturePressure,
} from "@/lib/xyvala/calibration/calibration-contracts";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const TARGET_DISTRIBUTION: DecisionDistribution = {
  allow: 15,
  watch: 70,
  block: 15,
};

const EMPTY_DISTRIBUTION: DecisionDistribution = {
  allow: 0,
  watch: 0,
  block: 0,
};

const EMPTY_REGIME_DISTRIBUTION: RegimeDistribution = {
  STABLE: { ...EMPTY_DISTRIBUTION },
  TRANSITION: { ...EMPTY_DISTRIBUTION },
  VOLATILE: { ...EMPTY_DISTRIBUTION },
};

const EMPTY_REASON_DISTRIBUTION: ReasonDistribution = {};

const FALLBACK_AGGREGATED_SCORE: AggregatedScore = {
  aggregated_score: 0,
  validity: "insufficient_data",
};

const FALLBACK_RUPTURE_PRESSURE: RupturePressure = {
  rupture_pressure_score: 0,
  rupture_pressure_state: "LOW",
  rupture_detected_count: 0,
  rupture_sample_ratio: 0,
};

const FALLBACK_RECOVERY_PRESSURE: RecoveryPressure = {
  recovery_pressure_score: 0,
  recovery_pressure_state: "LOW",
  recovery_dominant_count: 0,
  recovery_sample_ratio: 0,
};

const FALLBACK_RUPTURE_COMPARATOR: RuptureComparator = {
  rupture_pressure: FALLBACK_RUPTURE_PRESSURE,
  recovery_pressure: FALLBACK_RECOVERY_PRESSURE,
  dominant_side: "balanced",
  comparator_validity: "computed",
};

const FALLBACK_NEUTRALIZATION_SIGNALS: NeutralizationSignals = {
  neutralized: false,
  neutralization_reason: "none",
  neutralization_severity: "none",
  neutralization_validity: "computed",
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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

function clonePolicy(policy: CalibrationPolicy): CalibrationPolicy {
  return {
    allow: safeNumber(policy.allow),
    block: safeNumber(policy.block),
    risk: safeNumber(policy.risk),
    support: safeNumber(policy.support),
  };
}

function cloneThresholds(thresholds: ReadableThresholds): ReadableThresholds {
  return {
    allow: safeNumber(thresholds.allow),
    block: safeNumber(thresholds.block),
    risk: safeNumber(thresholds.risk),
    support: safeNumber(thresholds.support),
    allow_raw_score: safeNumber(thresholds.allow_raw_score),
    block_raw_score: safeNumber(thresholds.block_raw_score),
    risk_rupture_probability: safeNumber(thresholds.risk_rupture_probability),
    decision_support_probability: safeNumber(
      thresholds.decision_support_probability,
    ),
  };
}

function buildThresholds(policy: CalibrationPolicy): ReadableThresholds {
  const cloned = clonePolicy(policy);

  return {
    allow: cloned.allow,
    block: cloned.block,
    risk: cloned.risk,
    support: cloned.support,
    allow_raw_score: cloned.allow,
    block_raw_score: cloned.block,
    risk_rupture_probability: cloned.risk,
    decision_support_probability: cloned.support,
  };
}

function cloneDistribution(
  distribution: DecisionDistribution = EMPTY_DISTRIBUTION,
): DecisionDistribution {
  return {
    allow: safeNumber(distribution.allow),
    watch: safeNumber(distribution.watch),
    block: safeNumber(distribution.block),
  };
}

function cloneRegimeDistribution(
  distribution: RegimeDistribution = EMPTY_REGIME_DISTRIBUTION,
): RegimeDistribution {
  return {
    STABLE: cloneDistribution(distribution.STABLE),
    TRANSITION: cloneDistribution(distribution.TRANSITION),
    VOLATILE: cloneDistribution(distribution.VOLATILE),
  };
}

function cloneReasonDistribution(
  distribution: ReasonDistribution = EMPTY_REASON_DISTRIBUTION,
): ReasonDistribution {
  return { ...distribution };
}

function cloneAggregatedScore(
  score: AggregatedScore = FALLBACK_AGGREGATED_SCORE,
): AggregatedScore {
  return { ...score };
}

function cloneRupturePressure(
  pressure: RupturePressure = FALLBACK_RUPTURE_PRESSURE,
): RupturePressure {
  return { ...pressure };
}

function cloneRecoveryPressure(
  pressure: RecoveryPressure = FALLBACK_RECOVERY_PRESSURE,
): RecoveryPressure {
  return { ...pressure };
}

function cloneRuptureComparator(
  comparator: RuptureComparator = FALLBACK_RUPTURE_COMPARATOR,
): RuptureComparator {
  return {
    ...comparator,
    rupture_pressure: cloneRupturePressure(comparator.rupture_pressure),
    recovery_pressure: cloneRecoveryPressure(comparator.recovery_pressure),
  };
}

function cloneNeutralizationSignals(
  signals: NeutralizationSignals = FALLBACK_NEUTRALIZATION_SIGNALS,
): NeutralizationSignals {
  return { ...signals };
}

/* ============================================================================
 * 4. READABLE STATE BUILDER
 * ========================================================================== */

export function buildDecisionCalibrationState(input: {
  policy: CalibrationPolicy;
  policy_source: CalibrationPolicySource;

  sample_size: number;
  effective_sample_size: number;

  observed_distribution: DecisionDistribution;
  regime_distribution: RegimeDistribution;
  reason_distribution: ReasonDistribution;

  aggregated_score: AggregatedScore;

  rupture_pressure: RupturePressure;
  recovery_pressure: RecoveryPressure;
  rupture_comparator: RuptureComparator;
  neutralization_signals: NeutralizationSignals;

  flags?: Partial<ReadableState["flags"]>;

  warnings?: string[];
}): ReadableState {
  return {
    thresholds: buildThresholds(input.policy),

    summary: {
      source: input.policy_source,
      sample_size: safeNumber(input.sample_size),
      effective_sample_size: safeNumber(input.effective_sample_size),
    },

    targets: {
      distribution: cloneDistribution(TARGET_DISTRIBUTION),
    },

    observed_distribution: cloneDistribution(input.observed_distribution),
    regime_distribution: cloneRegimeDistribution(input.regime_distribution),
    reason_distribution: cloneReasonDistribution(input.reason_distribution),

    aggregated_score: cloneAggregatedScore(input.aggregated_score),

    rupture_pressure: cloneRupturePressure(input.rupture_pressure),
    recovery_pressure: cloneRecoveryPressure(input.recovery_pressure),
    rupture_comparator: cloneRuptureComparator(input.rupture_comparator),
    neutralization_signals: cloneNeutralizationSignals(
      input.neutralization_signals,
    ),

    flags: {
      fallback_active: Boolean(input.flags?.fallback_active),
      global_outside_tolerance: Boolean(input.flags?.global_outside_tolerance),
      stable_outside_tolerance: Boolean(input.flags?.stable_outside_tolerance),
      transition_outside_tolerance: Boolean(
        input.flags?.transition_outside_tolerance,
      ),
      volatile_outside_tolerance: Boolean(
        input.flags?.volatile_outside_tolerance,
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

function cloneReadableState(state: ReadableState): ReadableState {
  return {
    thresholds: cloneThresholds(state.thresholds),

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

    observed_distribution: cloneDistribution(state.observed_distribution),
    regime_distribution: cloneRegimeDistribution(state.regime_distribution),
    reason_distribution: cloneReasonDistribution(state.reason_distribution),

    aggregated_score: cloneAggregatedScore(state.aggregated_score),

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

    rupture_pressure: cloneRupturePressure(state.rupture_pressure),
    recovery_pressure: cloneRecoveryPressure(state.recovery_pressure),
    rupture_comparator: cloneRuptureComparator(state.rupture_comparator),
    neutralization_signals: cloneNeutralizationSignals(
      state.neutralization_signals,
    ),

    flags: {
      fallback_active: Boolean(state.flags.fallback_active),
      global_outside_tolerance: Boolean(state.flags.global_outside_tolerance),
      stable_outside_tolerance: Boolean(state.flags.stable_outside_tolerance),
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

type CalibrationRuntimeState = {
  active_state: ActiveState | null;
};

const CALIBRATION_STATE_KEY =
  "__xyvala_decision_calibration_state__";

type XyvalaGlobal = typeof globalThis & {
  [CALIBRATION_STATE_KEY]?: CalibrationRuntimeState;
};

function getRuntimeState(): CalibrationRuntimeState {
  const runtime = globalThis as XyvalaGlobal;

  if (!runtime[CALIBRATION_STATE_KEY]) {
    runtime[CALIBRATION_STATE_KEY] = {
      active_state: null,
    };
  }

  return runtime[CALIBRATION_STATE_KEY];
}

export function getCalibrationState(): ActiveState | null {
  const runtime = getRuntimeState();
  const activeState = runtime.active_state;

  if (!activeState) return null;

  return {
    policy: clonePolicy(activeState.policy),
    state: cloneReadableState(activeState.state),
    last_updated_ts: safeNumber(
      activeState.last_updated_ts,
      Date.now(),
    ),
  };
}

export function setCalibrationState(next: ActiveState): ActiveState {
  const runtime = getRuntimeState();

  runtime.active_state = {
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
  const runtime = getRuntimeState();
  runtime.active_state = null;
}

/* ============================================================================
 * 7. TYPE RE-EXPORTS
 * ========================================================================== */

export type {
  ActiveState,
  ReadableState,
  CalibrationPolicy,
};
