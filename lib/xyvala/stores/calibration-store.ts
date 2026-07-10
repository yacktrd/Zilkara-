/* ============================================================================
 * FILE: lib/xyvala/stores/calibration-store.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala calibration traceability store
 *
 * ROLE
 * - store calibration states and statistical distributions
 * - preserve Calibration V4 outputs without recalculating market truth
 * - provide deterministic read helpers for audit and governance
 *
 * DIRECTIVES
 * - MUTATE layer only
 * - no RFS recomputation
 * - no MCI recomputation
 * - no market reconstruction
 * - no prediction
 * - no financial advice
 * - append-only by default
 * - deterministic calibration identity
 * - thresholds are private governance data
 *
 * INPUTS
 * - CalibrationRecordInput
 *
 * OUTPUTS
 * - CalibrationRecord
 * - CalibrationStoreSnapshot
 *
 * INVARIANTS
 * - calibration records are immutable after insertion
 * - one calibration_id represents one calibration state
 * - null means explicitly unavailable
 * - undefined must never be stored
 * - store records calibration truth, it does not create it
 * ========================================================================== */

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type CalibrationStoreStatus =
  | "recorded"
  | "duplicate"
  | "invalid"
  | "unavailable";

export type CalibrationHorizon =
  | "24H"
  | "7D"
  | "30D"
  | "90D"
  | "GLOBAL"
  | "CUSTOM";

export type CalibrationPolicyState =
  | "inactive"
  | "fallback"
  | "bootstrap"
  | "calibrated"
  | "degraded";

export type CalibrationMaturity =
  | "INSUFFICIENT_SAMPLES"
  | "BOOTSTRAP_ACTIVE"
  | "CALIBRATED_ACTIVE"
  | "DEGRADED"
  | "UNKNOWN";

export type CalibrationRecord = {
  calibration_id: string;

  analytical_version: string;
  calibration_version: string;
  snapshot_version: string;

  horizon: CalibrationHorizon;

  sample_count: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;

  positive_rate: number | null;
  neutral_rate: number | null;
  negative_rate: number | null;

  transition_success_rate: number | null;
  transition_failure_rate: number | null;

  activity_success_rate: number | null;
  climate_success_rate: number | null;
  stability_success_rate: number | null;
  regime_success_rate: number | null;
  impulse_success_rate: number | null;
  neutralization_accuracy_rate: number | null;

  structural_occurrence_score: number | null;
  structural_frequency_score: number | null;
  structural_convergence_score: number | null;
  structural_duration_score: number | null;
  structural_evolution_score: number | null;

  calibration_allow_threshold: number | null;
  calibration_watch_threshold: number | null;
  calibration_block_threshold: number | null;

  calibration_policy_state: CalibrationPolicyState;
  calibration_maturity: CalibrationMaturity;

  sufficient_samples: boolean;
  min_sample_size: number;

  warnings: string[];

  created_at: string;
};

export type CalibrationRecordInput =
  Partial<CalibrationRecord> & {
    calibration_id?: unknown;
    analytical_version?: unknown;
    calibration_version?: unknown;
    snapshot_version?: unknown;
    horizon?: unknown;
    warnings?: unknown;
  };

export type CalibrationWriteResult = {
  ok: boolean;
  status: CalibrationStoreStatus;
  record: CalibrationRecord | null;
  error: string | null;
};

export type CalibrationStoreSnapshot = {
  ok: boolean;
  count: number;
  records: CalibrationRecord[];
  warnings: string[];
};

/* ============================================================================
 * 2. IN-MEMORY STORE
 * ========================================================================== */

const calibrationStore = new Map<string, CalibrationRecord>();

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function safeNonNegativeInteger(value: unknown, fallback = 0): number {
  const parsed = safeNullableNumber(value);

  if (parsed === null || parsed < 0) return fallback;

  return Math.trunc(parsed);
}

function clampScore(value: unknown): number | null {
  const parsed = safeNullableNumber(value);
  if (parsed === null) return null;

  return Math.max(0, Math.min(100, Math.round(parsed * 100) / 100));
}

function clampRate(value: unknown): number | null {
  const parsed = safeNullableNumber(value);
  if (parsed === null) return null;

  return Math.max(0, Math.min(100, Math.round(parsed * 100) / 100));
}

function normalizeIsoDate(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toISOString();
}

function normalizeWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      ),
    ),
  ];
}

function normalizeHorizon(value: unknown): CalibrationHorizon {
  if (value === "24H") return "24H";
  if (value === "7D") return "7D";
  if (value === "30D") return "30D";
  if (value === "90D") return "90D";
  if (value === "GLOBAL") return "GLOBAL";
  if (value === "CUSTOM") return "CUSTOM";

  return "GLOBAL";
}

function normalizePolicyState(value: unknown): CalibrationPolicyState {
  if (value === "fallback") return "fallback";
  if (value === "bootstrap") return "bootstrap";
  if (value === "calibrated") return "calibrated";
  if (value === "degraded") return "degraded";

  return "inactive";
}

function normalizeMaturity(value: unknown): CalibrationMaturity {
  if (value === "INSUFFICIENT_SAMPLES") return "INSUFFICIENT_SAMPLES";
  if (value === "BOOTSTRAP_ACTIVE") return "BOOTSTRAP_ACTIVE";
  if (value === "CALIBRATED_ACTIVE") return "CALIBRATED_ACTIVE";
  if (value === "DEGRADED") return "DEGRADED";

  return "UNKNOWN";
}

function computeRate(part: number, total: number): number | null {
  if (total <= 0) return null;

  return Math.round((part / total) * 10_000) / 100;
}

function buildCalibrationId(input: {
  analytical_version: string;
  calibration_version: string;
  snapshot_version: string;
  horizon: CalibrationHorizon;
  created_at: string;
}): string {
  return [
    "calibration",
    input.analytical_version,
    input.calibration_version,
    input.snapshot_version,
    input.horizon,
    input.created_at,
  ]
    .join("|")
    .replace(/\s+/g, "");
}

function validateRecord(record: CalibrationRecord): string | null {
  if (!record.calibration_id) return "calibration_id_missing";
  if (!record.analytical_version) return "analytical_version_missing";
  if (!record.calibration_version) return "calibration_version_missing";
  if (!record.snapshot_version) return "snapshot_version_missing";
  if (!record.horizon) return "horizon_missing";

  return null;
}

/* ============================================================================
 * 4. RECORD BUILDER
 * ========================================================================== */

export function buildCalibrationRecord(
  input: CalibrationRecordInput,
): CalibrationRecord {
  const createdAt = normalizeIsoDate(input.created_at, nowIso());

  const analyticalVersion = safeString(input.analytical_version, "unknown");
  const calibrationVersion = safeString(input.calibration_version, "unknown");
  const snapshotVersion = safeString(input.snapshot_version, "unknown");
  const horizon = normalizeHorizon(input.horizon);

  const sampleCount = safeNonNegativeInteger(input.sample_count, 0);
  const positiveCount = safeNonNegativeInteger(input.positive_count, 0);
  const neutralCount = safeNonNegativeInteger(input.neutral_count, 0);
  const negativeCount = safeNonNegativeInteger(input.negative_count, 0);

  const minSampleSize = safeNonNegativeInteger(input.min_sample_size, 80);

  const calibrationId =
    safeString(input.calibration_id) ||
    buildCalibrationId({
      analytical_version: analyticalVersion,
      calibration_version: calibrationVersion,
      snapshot_version: snapshotVersion,
      horizon,
      created_at: createdAt,
    });

  return {
    calibration_id: calibrationId,

    analytical_version: analyticalVersion,
    calibration_version: calibrationVersion,
    snapshot_version: snapshotVersion,

    horizon,

    sample_count: sampleCount,
    positive_count: positiveCount,
    neutral_count: neutralCount,
    negative_count: negativeCount,

    positive_rate:
      clampRate(input.positive_rate) ?? computeRate(positiveCount, sampleCount),
    neutral_rate:
      clampRate(input.neutral_rate) ?? computeRate(neutralCount, sampleCount),
    negative_rate:
      clampRate(input.negative_rate) ?? computeRate(negativeCount, sampleCount),

    transition_success_rate: clampRate(input.transition_success_rate),
    transition_failure_rate: clampRate(input.transition_failure_rate),

    activity_success_rate: clampRate(input.activity_success_rate),
    climate_success_rate: clampRate(input.climate_success_rate),
    stability_success_rate: clampRate(input.stability_success_rate),
    regime_success_rate: clampRate(input.regime_success_rate),
    impulse_success_rate: clampRate(input.impulse_success_rate),
    neutralization_accuracy_rate: clampRate(
      input.neutralization_accuracy_rate,
    ),

    structural_occurrence_score: clampScore(
      input.structural_occurrence_score,
    ),
    structural_frequency_score: clampScore(
      input.structural_frequency_score,
    ),
    structural_convergence_score: clampScore(
      input.structural_convergence_score,
    ),
    structural_duration_score: clampScore(input.structural_duration_score),
    structural_evolution_score: clampScore(input.structural_evolution_score),

    calibration_allow_threshold: clampScore(
      input.calibration_allow_threshold,
    ),
    calibration_watch_threshold: clampScore(
      input.calibration_watch_threshold,
    ),
    calibration_block_threshold: clampScore(
      input.calibration_block_threshold,
    ),

    calibration_policy_state: normalizePolicyState(
      input.calibration_policy_state,
    ),
    calibration_maturity: normalizeMaturity(input.calibration_maturity),

    sufficient_samples:
      typeof input.sufficient_samples === "boolean"
        ? input.sufficient_samples
        : sampleCount >= minSampleSize,

    min_sample_size: minSampleSize,

    warnings: normalizeWarnings(input.warnings),

    created_at: createdAt,
  };
}

/* ============================================================================
 * 5. MUTATION API
 * ========================================================================== */

export function recordCalibration(
  input: CalibrationRecordInput,
): CalibrationWriteResult {
  const record = buildCalibrationRecord(input);
  const validationError = validateRecord(record);

  if (validationError) {
    return {
      ok: false,
      status: "invalid",
      record: null,
      error: validationError,
    };
  }

  if (calibrationStore.has(record.calibration_id)) {
    return {
      ok: true,
      status: "duplicate",
      record: calibrationStore.get(record.calibration_id) ?? null,
      error: null,
    };
  }

  calibrationStore.set(record.calibration_id, Object.freeze({ ...record }));

  return {
    ok: true,
    status: "recorded",
    record,
    error: null,
  };
}

export function recordCalibrations(
  inputs: readonly CalibrationRecordInput[],
): CalibrationWriteResult[] {
  return inputs.map(recordCalibration);
}

export function clearCalibrationStore(): void {
  calibrationStore.clear();
}

/* ============================================================================
 * 6. READ API
 * ========================================================================== */

export function listCalibrationRecords(): CalibrationRecord[] {
  return [...calibrationStore.values()];
}

export function getCalibrationRecord(
  calibrationId: string,
): CalibrationRecord | null {
  return calibrationStore.get(calibrationId) ?? null;
}

export function listCalibrationRecordsByVersion(
  analyticalVersion: string,
): CalibrationRecord[] {
  const normalizedVersion = safeString(analyticalVersion);

  return listCalibrationRecords().filter(
    (record) => record.analytical_version === normalizedVersion,
  );
}

export function listCalibrationRecordsByHorizon(
  horizon: CalibrationHorizon,
): CalibrationRecord[] {
  return listCalibrationRecords().filter(
    (record) => record.horizon === horizon,
  );
}

export function listActiveCalibrationRecords(): CalibrationRecord[] {
  return listCalibrationRecords().filter(
    (record) =>
      record.calibration_policy_state === "bootstrap" ||
      record.calibration_policy_state === "calibrated",
  );
}

export function getCalibrationStoreSnapshot(): CalibrationStoreSnapshot {
  return {
    ok: true,
    count: calibrationStore.size,
    records: listCalibrationRecords(),
    warnings: [],
  };
}
