/* ============================================================================
 * FILE: lib/xyvala/calibration/calibration-orchestrator.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala calibration orchestrator
 *
 * ROLE
 * - orchestrate calibration workflow only
 * - consume normalized calibration samples
 * - consume calibration policy results
 * - assemble runtime calibration outputs
 * - persist readable calibration state
 *
 * DIRECTIVES
 * - orchestration only
 * - no heavy analytical reconstruction
 * - no sample normalization
 * - no validation logic
 * - no UI logic
 * - no API logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - same input => same output
 *
 * INVARIANTS
 * - WATCH remains defensive default
 * - runtime state is deterministic
 * - orchestration never mutates samples
 * - orchestration only propagates governance
 * ========================================================================== */

import { buildDecisionDistributionPolicy } from "@/lib/xyvala/calibration/decision-distribution-core";

import { setCalibrationState } from "@/lib/xyvala/calibration/decision-calibration-state";

import { readDecisionDistributionSamples } from "@/lib/xyvala/calibration/store/decision-distribution-store";

import type {
  AggregatedScore,
  CalibrationMeta,
  CalibrationMaturity,
  CalibrationPolicy,
  CalibrationPolicySource,
  DecisionDistribution,
  DecisionPressure,
  DecisionSample,
  EvaluationHorizon,
  NeutralizationSignals,
  OrchestratorInput,
  OrchestratorResult,
  PressureState,
  ReadableState,
  ReadableThresholds,
  RecoveryPressure,
  RuptureComparator,
  RupturePressure,
  RuntimeState,
  StructuralScores,
  ValidityState,
} from "@/lib/xyvala/calibration/calibration-contracts";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const DEFAULT_ANALYTICAL_VERSION = "unknown";

const DEFAULT_HORIZON: EvaluationHorizon = "default";

const DEFAULT_MIN_SAMPLE_SIZE = 80;

const BOOTSTRAP_MIN_SAMPLE_SIZE = 30;

const MIN_CONFIDENCE_SCORE = 40;

const TARGET_DISTRIBUTION: DecisionDistribution = {
  allow: 15,
  watch: 70,
  block: 15,
};

const FALLBACK_POLICY: CalibrationPolicy = {
  allow: 76,
  block: 72,
  risk: 68,
  support: 64,
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function clamp(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;

  return Math.max(min, Math.min(max, value));
}

function clampScore(value: number): number {
  return Math.round(clamp(value) * 100) / 100;
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;

  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  return [
    ...new Set(
      groups
        .flatMap((group) =>
          Array.isArray(group) ? group : [],
        )
        .filter(
          (warning): warning is string =>
            typeof warning === "string" &&
            warning.trim().length > 0,
        ),
    ),
  ];
}

/* ============================================================================
 * 3. SAMPLE FILTERING
 * ========================================================================== */

function readSamples(
  input: OrchestratorInput,
  analyticalVersion: string,
  horizon: EvaluationHorizon,
): DecisionSample[] {
  if (Array.isArray(input.samples)) {
    return input.samples;
  }

  const result = readDecisionDistributionSamples({
    analytical_version: analyticalVersion,
    horizon,
    limit: 1000,
  });

  return result.samples;
}

function sanitizeSamples(
  samples: DecisionSample[],
  analyticalVersion: string,
  horizon: EvaluationHorizon,
): {
  samples: DecisionSample[];
  warnings: string[];
} {
  let rejected = 0;
  let confidenceRejected = 0;

  const valid = samples.filter((sample) => {
    const validSample =
      sample.observed_analytical_version === analyticalVersion &&
      sample.observed_horizon === horizon &&
      Number.isFinite(sample.mci_decision_score) &&
      Number.isFinite(sample.mci_allow_raw_score) &&
      Number.isFinite(sample.mci_block_raw_score) &&
      Number.isFinite(sample.mci_decision_support_probability) &&
      Number.isFinite(sample.mci_risk_rupture_probability);

    if (!validSample) {
      rejected += 1;
      return false;
    }

    if (
      !Number.isFinite(sample.confidence_score) ||
      (sample.confidence_score ?? 0) <
        MIN_CONFIDENCE_SCORE
    ) {
      confidenceRejected += 1;
      return false;
    }

    return true;
  });

  const warnings: string[] = [];

  if (rejected > 0) {
    warnings.push(
      `calibration_samples_rejected:${rejected}`,
    );
  }

  if (confidenceRejected > 0) {
    warnings.push(
      `calibration_confidence_rejected:${confidenceRejected}`,
    );
  }

  return {
    samples: valid,
    warnings,
  };
}

/* ============================================================================
 * 4. STRUCTURAL SCORING
 * ========================================================================== */

function computeStructuralScores(
  samples: DecisionSample[],
  distribution: DecisionDistribution,
): StructuralScores {
  const occurrence = clampScore(
    (samples.length / DEFAULT_MIN_SAMPLE_SIZE) * 100,
  );

  const frequency = clampScore(
    100 -
      (Math.abs(
        distribution.allow -
          TARGET_DISTRIBUTION.allow,
      ) *
        0.35 +
        Math.abs(
          distribution.watch -
            TARGET_DISTRIBUTION.watch,
        ) *
          0.4 +
        Math.abs(
          distribution.block -
            TARGET_DISTRIBUTION.block,
        ) *
          0.25),
  );

  const convergence = clampScore(
    average(
      samples.map((sample) =>
        safeNumber(sample.convergence_score, 50),
      ),
    ),
  );

  const correlation = clampScore(
    average(
      samples.map((sample) => {
        const support =
          sample.mci_decision_support_probability;

        const risk =
          sample.mci_risk_rupture_probability;

        if (
          sample.mci_final_decision === "ALLOW" &&
          support >= 60 &&
          risk < 55
        ) {
          return 100;
        }

        if (
          sample.mci_final_decision === "BLOCK" &&
          risk >= 60
        ) {
          return 100;
        }

        return 50;
      }),
    ),
  );

  const duration = clampScore(
    Math.min(samples.length, 30) * 3.33,
  );

  return {
    occurrence,
    frequency,
    convergence,
    correlation,
    duration,
  };
}

function computeAggregatedScore(
  structural: StructuralScores,
  rupturePressure: RupturePressure,
  validity: ValidityState,
): AggregatedScore {
  const base =
    structural.occurrence * 0.2 +
    structural.frequency * 0.2 +
    structural.convergence * 0.25 +
    structural.correlation * 0.2 +
    structural.duration * 0.15;

  const rupturePenalty =
    rupturePressure.rupture_pressure_score * 0.25;

  return {
    aggregated_score: clampScore(
      base - rupturePenalty,
    ),
    validity,
  };
}

/* ============================================================================
 * 5. PRESSURE SYSTEMS
 * ========================================================================== */

function pressureState(
  score: number,
): PressureState {
  if (score < 20) return "LOW";
  if (score < 45) return "NORMAL";
  if (score < 70) return "ELEVATED";

  return "EXCESSIVE";
}

function computeDecisionPressure(
  distribution: DecisionDistribution,
): DecisionPressure {
  const allowPressure = clampScore(
    Math.max(
      0,
      distribution.allow -
        TARGET_DISTRIBUTION.allow,
    ) * 4,
  );

  const watchPressure = clampScore(
    Math.max(
      0,
      distribution.watch -
        TARGET_DISTRIBUTION.watch,
    ) * 3,
  );

  const blockPressure = clampScore(
    Math.max(
      0,
      distribution.block -
        TARGET_DISTRIBUTION.block,
    ) * 4,
  );

  return {
    allow_pressure_score: allowPressure,
    watch_pressure_score: watchPressure,
    block_pressure_score: blockPressure,

    allow_pressure_state:
      pressureState(allowPressure),

    watch_pressure_state:
      pressureState(watchPressure),

    block_pressure_state:
      pressureState(blockPressure),
  };
}

function computeRupturePressure(
  samples: DecisionSample[],
): RupturePressure {
  if (samples.length === 0) {
    return {
      rupture_pressure_score: 0,
      rupture_pressure_state: "LOW",
      rupture_detected_count: 0,
      rupture_sample_ratio: 0,
    };
  }

  const ruptureScores = samples.map((sample) =>
    clampScore(
      safeNumber(
        sample.rupture_score ??
          sample.rfs_rupture_score ??
          sample.mci_risk_rupture_probability,
      ),
    ),
  );

  const ruptureDetected = samples.filter(
    (sample) =>
      sample.rupture_detected === true ||
      sample.rfs_rupture_detected === true,
  ).length;

  const pressure = clampScore(
    average(ruptureScores),
  );

  return {
    rupture_pressure_score: pressure,

    rupture_pressure_state:
      pressureState(pressure),

    rupture_detected_count: ruptureDetected,

    rupture_sample_ratio: clampScore(
      (ruptureDetected / samples.length) * 100,
    ),
  };
}

function computeRecoveryPressure(
  samples: DecisionSample[],
): RecoveryPressure {
  if (samples.length === 0) {
    return {
      recovery_pressure_score: 0,
      recovery_pressure_state: "LOW",
      recovery_dominant_count: 0,
      recovery_sample_ratio: 0,
    };
  }

  const recoveryScores = samples.map((sample) =>
    clampScore(
      average([
        safeNumber(sample.recovery_probability),
        safeNumber(
          sample.recovery_rupture_dominance,
        ),
      ]),
    ),
  );

  const dominant = samples.filter(
    (sample) =>
      sample.dominance_state ===
      "recovery_dominant",
  ).length;

  const pressure = clampScore(
    average(recoveryScores),
  );

  return {
    recovery_pressure_score: pressure,

    recovery_pressure_state:
      pressureState(pressure),

    recovery_dominant_count: dominant,

    recovery_sample_ratio: clampScore(
      (dominant / samples.length) * 100,
    ),
  };
}

function computeRuptureComparator(
  rupture: RupturePressure,
  recovery: RecoveryPressure,
): RuptureComparator {
  const gap =
    recovery.recovery_pressure_score -
    rupture.rupture_pressure_score;

  return {
    rupture_pressure: rupture,
    recovery_pressure: recovery,

    dominant_side:
      gap > 10
        ? "recovery_dominant"
        : gap < -10
          ? "rupture_dominant"
          : "balanced",

    comparator_validity: "computed",
  };
}

/* ============================================================================
 * 6. GOVERNANCE
 * ========================================================================== */

function resolveMaturity(
  effectiveSampleSize: number,
  minSampleSize: number,
): CalibrationMaturity {
  if (
    effectiveSampleSize <
    BOOTSTRAP_MIN_SAMPLE_SIZE
  ) {
    return "INSUFFICIENT_SAMPLES";
  }

  if (effectiveSampleSize < minSampleSize) {
    return "BOOTSTRAP_ACTIVE";
  }

  return "CALIBRATED_ACTIVE";
}

function computeValidity(
  status: CalibrationMaturity,
): ValidityState {
  if (status === "INSUFFICIENT_SAMPLES") {
    return "insufficient_data";
  }

  if (status === "BOOTSTRAP_ACTIVE") {
    return "degraded";
  }

  return "computed";
}

function makeReadableThresholds(
  policy: CalibrationPolicy,
): ReadableThresholds {
  return {
    allow: clampScore(policy.allow),
    block: clampScore(policy.block),
    risk: clampScore(policy.risk),
    support: clampScore(policy.support),

    allow_raw_score: clampScore(policy.allow),

    block_raw_score: clampScore(policy.block),

    risk_rupture_probability:
      clampScore(policy.risk),

    decision_support_probability:
      clampScore(policy.support),
  };
}

function buildNeutralizationSignals(
  samples: DecisionSample[],
): NeutralizationSignals {
  const neutralized = samples.some(
    (sample) => sample.neutralized === true,
  );

  return {
    neutralized,

    neutralization_reason: neutralized
      ? "low_confidence"
      : "none",

    neutralization_severity: neutralized
      ? "medium"
      : "none",

    neutralization_validity: "computed",
  };
}

/* ============================================================================
 * 7. PUBLIC ORCHESTRATOR
 * ========================================================================== */

export function runCalibrationOrchestrator(
  input: OrchestratorInput = {},
): OrchestratorResult {
  const analyticalVersion = safeString(
    input.analytical_version,
    DEFAULT_ANALYTICAL_VERSION,
  );

  const horizon =
    input.horizon ?? DEFAULT_HORIZON;

  const minSampleSize = Math.max(
    1,
    Math.trunc(
      safeNumber(
        input.min_sample_size,
        DEFAULT_MIN_SAMPLE_SIZE,
      ),
    ),
  );

  const rawSamples = readSamples(
    input,
    analyticalVersion,
    horizon,
  );

  const sanitized = sanitizeSamples(
    rawSamples,
    analyticalVersion,
    horizon,
  );

  const samples = sanitized.samples;

  const sampleCount = rawSamples.length;

  const effectiveSampleSize = samples.length;

  const policyResult =
    buildDecisionDistributionPolicy({
      samples,
      analytical_version: analyticalVersion,
      horizon,
    });

  const status = resolveMaturity(
    effectiveSampleSize,
    minSampleSize,
  );

  const validity = computeValidity(status);

  const structuralScores =
    computeStructuralScores(
      samples,
      policyResult.observed_distribution,
    );

  const decisionPressure =
    computeDecisionPressure(
      policyResult.observed_distribution,
    );

  const rupturePressure =
    computeRupturePressure(samples);

  const recoveryPressure =
    computeRecoveryPressure(samples);

  const ruptureComparator =
    computeRuptureComparator(
      rupturePressure,
      recoveryPressure,
    );

  const aggregatedScore =
    computeAggregatedScore(
      structuralScores,
      rupturePressure,
      validity,
    );

  const derivedThresholds =
    makeReadableThresholds(
      status === "INSUFFICIENT_SAMPLES"
        ? FALLBACK_POLICY
        : policyResult.policy,
    );

  const policy: CalibrationPolicy = {
    allow: derivedThresholds.allow,
    block: derivedThresholds.block,
    risk: derivedThresholds.risk,
    support: derivedThresholds.support,
  };

  const neutralizationSignals =
    buildNeutralizationSignals(samples);

  const policySource: CalibrationPolicySource =
    status === "INSUFFICIENT_SAMPLES"
      ? "fallback"
      : status === "BOOTSTRAP_ACTIVE"
        ? "bootstrap"
        : policyResult.policy_source;

  const warnings = uniqueWarnings(
    sanitized.warnings,
    policyResult.warnings,
  );

  const readableState: ReadableState = {
    thresholds: derivedThresholds,

    summary: {
      source: policySource,
      sample_size: sampleCount,
      effective_sample_size:
        effectiveSampleSize,
    },

    targets: {
      distribution: {
        ...TARGET_DISTRIBUTION,
      },
    },

    observed_distribution:
      policyResult.observed_distribution,

    regime_distribution:
      policyResult.regime_distribution,

    reason_distribution:
      policyResult.reason_distribution,

    aggregated_score: aggregatedScore,

    rupture_comparator:
      ruptureComparator,

    neutralization_signals:
      neutralizationSignals,

    flags: {
      fallback_active:
        status === "INSUFFICIENT_SAMPLES",

      global_outside_tolerance:
        structuralScores.frequency < 45,

      stable_outside_tolerance: false,

      transition_outside_tolerance:
        false,

      volatile_outside_tolerance:
        false,

      rupture_pressure_elevated:
        rupturePressure.rupture_pressure_state ===
        "ELEVATED",

      rupture_pressure_excessive:
        rupturePressure.rupture_pressure_state ===
        "EXCESSIVE",

      recovery_pressure_elevated:
        recoveryPressure.recovery_pressure_state ===
        "ELEVATED",

      neutralization_active:
        neutralizationSignals.neutralized,

      explosive_rupture_detected:
        samples.some(
          (sample) =>
            sample.rupture_evolution_state ===
            "explosive",
        ),

      defensive_mode_active:
        neutralizationSignals.neutralized ||
        rupturePressure.rupture_pressure_state ===
          "EXCESSIVE",
    },

    warnings,
  };

  let statePersisted = false;

  if (input.persist_state !== false) {
    try {
      setCalibrationState({
        policy,
        state: readableState,
        last_updated_ts: Date.now(),
      });

      statePersisted = true;
    } catch {
      warnings.push(
        "calibration_state_persist_failed",
      );
    }
  }

  const runtimeState: RuntimeState = {
    thresholds: policy,
    status,
    validity,
    warnings,
  };

  const meta: CalibrationMeta = {
    analytical_version: analyticalVersion,

    horizon,

    policy_source: policySource,

    sufficient_samples:
      effectiveSampleSize >= minSampleSize,

    fallback_active:
      status === "INSUFFICIENT_SAMPLES",

    state_persisted: statePersisted,

    aggregated_score: aggregatedScore,

    derived_thresholds:
      derivedThresholds,

    resolved_thresholds:
      derivedThresholds,

    rupture_pressure: rupturePressure,

    recovery_pressure:
      recoveryPressure,

    rupture_comparator:
      ruptureComparator,

    neutralization_signals:
      neutralizationSignals,
  };

  return {
    ok: true,

    status,

    aggregated_score: aggregatedScore,

    sample_count: sampleCount,

    effective_sample_size:
      effectiveSampleSize,

    min_sample_size: minSampleSize,

    observed_distribution:
      policyResult.observed_distribution,

    regime_distribution:
      policyResult.regime_distribution,

    reason_distribution:
      policyResult.reason_distribution,

    structural_occurrence_score:
      structuralScores.occurrence,

    structural_frequency_score:
      structuralScores.frequency,

    structural_convergence_score:
      structuralScores.convergence,

    structural_correlation_score:
      structuralScores.correlation,

    structural_duration_score:
      structuralScores.duration,

    decision_pressure:
      decisionPressure,

    rupture_pressure: rupturePressure,

    recovery_pressure:
      recoveryPressure,

    rupture_comparator:
      ruptureComparator,

    derived_thresholds:
      derivedThresholds,

    resolved_thresholds:
      derivedThresholds,

    policy,

    state: runtimeState,

    meta,

    warnings,
  };
}
