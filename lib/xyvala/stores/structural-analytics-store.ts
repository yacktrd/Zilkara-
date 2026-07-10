/* ============================================================================
 * FILE: lib/xyvala/stores/structural-analytics-store.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala structural analytics traceability store
 *
 * ROLE
 * - store private structural analytics linked to detection records
 * - preserve RFS / MCI / Triple Layer / Impulse / Neutralization outputs
 * - provide deterministic read helpers for audit, lifecycle and calibration
 * - keep analytical values traceable without recomputation
 *
 * PARENT FILES
 * - lib/xyvala/stores/detection-store.ts
 * - lib/xyvala/contracts/scan-private-contract.ts
 *
 * DIRECTIVES
 * - MUTATE layer only
 * - private traceability only
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no public API response building
 * - no UI logic
 * - no financial advice
 * - no prediction
 * - append-only by default
 * - deterministic record identity
 * - private fields must never be exposed publicly from this store
 *
 * INPUTS
 * - StructuralAnalyticsRecordInput
 *
 * OUTPUTS
 * - StructuralAnalyticsRecord
 * - StructuralAnalyticsStoreSnapshot
 *
 * INVARIANTS
 * - one structural record per detection_id
 * - records are immutable after insertion
 * - store does not create analytical truth
 * - store only records already produced values
 * - null means explicitly unavailable
 * - undefined must never be stored
 *
 * CRITICAL DEPENDENCIES
 * - detection_id
 * - analytical_version
 * - snapshot_version
 * - RFS / MCI / Impulse / Neutralization outputs
 *
 * SENSITIVE ZONES
 * - private analytical fields
 * - decision leakage
 * - public/private boundary
 * - future persistence migration
 * ========================================================================== */

import type {
  PrivateImpulseDirectionalBias,
  PrivateImpulseTransitionState,
  PrivateNeutralizationReason,
  PrivateNeutralizationSeverity,
  PrivateRuptureEvolutionState,
  PrivateScanDecision,
  PrivateScanRegime,
  PrivateScanStatus,
  PrivateTripleLayerState,
} from "@/lib/xyvala/contracts/scan-private-contract";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type StructuralAnalyticsStoreStatus =
  | "recorded"
  | "duplicate"
  | "invalid"
  | "unavailable";

export type StructuralAnalyticsRecord = {
  structural_analytics_id: string;

  detection_id: string;
  asset_id: string;
  symbol: string;

  snapshot_version: string;
  analytical_version: string;
  recorded_at: string;

  stability_score: number | null;
  stability_status: PrivateScanStatus;

  structure_score: number | null;
  market_score: number | null;
  coherence_score: number | null;

  occurrence_score: number | null;
  frequency_score: number | null;
  convergence_score: number | null;
  duration_score: number | null;
  evolution_score: number | null;

  regime: PrivateScanRegime;

  rupture_score: number | null;
  rupture_probability: number | null;
  rupture_penalty_score: number | null;

  rupture_occurrence_score: number | null;
  rupture_frequency_score: number | null;
  rupture_convergence_score: number | null;
  rupture_duration_score: number | null;

  rupture_evolution_score: number | null;
  rupture_evolution_state: PrivateRuptureEvolutionState;
  rupture_acceleration_score: number | null;

  crash_score: number | null;
  crash_state: "NONE" | "RISING" | "CRASH" | "UNKNOWN";

  continuity_probability: number | null;

  triple_layer_state: PrivateTripleLayerState;
  growth_score: number | null;
  core_pattern_score: number | null;
  decay_score: number | null;
  growth_status: PrivateScanStatus;
  core_status: PrivateScanStatus;
  decay_status: PrivateScanStatus;

  impulse_pressure_score: number | null;
  impulse_instability_score: number | null;
  impulse_saturation_score: number | null;
  impulse_exhaustion_score: number | null;
  impulse_directional_bias: PrivateImpulseDirectionalBias;
  impulse_transition_state: PrivateImpulseTransitionState;
  impulse_status: PrivateScanStatus;

  neutralized: boolean;
  neutralization_reason: PrivateNeutralizationReason;
  neutralization_severity: PrivateNeutralizationSeverity;
  neutralization_validity: PrivateScanStatus;

  decision: PrivateScanDecision;
  decision_score: number | null;
  opportunity_score: number | null;
  confidence_score: number | null;

  decision_status: string | null;
  opportunity_status: PrivateScanStatus | null;
  confidence_status: PrivateScanStatus | null;
};

export type StructuralAnalyticsRecordInput =
  Partial<StructuralAnalyticsRecord> & {
    detection_id?: unknown;
    asset_id?: unknown;
    symbol?: unknown;
    snapshot_version?: unknown;
    analytical_version?: unknown;
    recorded_at?: unknown;
  };

export type StructuralAnalyticsWriteResult = {
  ok: boolean;
  status: StructuralAnalyticsStoreStatus;
  record: StructuralAnalyticsRecord | null;
  error: string | null;
};

export type StructuralAnalyticsStoreSnapshot = {
  ok: boolean;
  count: number;
  records: StructuralAnalyticsRecord[];
  warnings: string[];
};

/* ============================================================================
 * 2. IN-MEMORY STORE
 * ========================================================================== */

const structuralAnalyticsStore = new Map<string, StructuralAnalyticsRecord>();

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

function safeNullableString(value: unknown): string | null {
  const normalized = safeString(value);
  return normalized.length > 0 ? normalized : null;
}

function safeNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function clampScore(value: unknown): number | null {
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

function normalizeScanStatus(
  value: unknown,
  score?: number | null,
): PrivateScanStatus {
  if (value === "computed") return "computed";
  if (value === "partial") return "partial";
  if (value === "degraded") return "degraded";
  if (value === "unavailable") return "unavailable";

  return score === null ? "unavailable" : "computed";
}

function normalizeRegime(value: unknown): PrivateScanRegime {
  if (value === "STABLE") return "STABLE";
  if (value === "VOLATILE") return "VOLATILE";

  return "TRANSITION";
}

function normalizeDecision(value: unknown): PrivateScanDecision {
  if (value === "ALLOW") return "ALLOW";
  if (value === "BLOCK") return "BLOCK";

  return "WATCH";
}

function normalizeRuptureEvolutionState(
  value: unknown,
): PrivateRuptureEvolutionState {
  if (value === "improving") return "improving";
  if (value === "stable") return "stable";
  if (value === "worsening") return "worsening";
  if (value === "explosive") return "explosive";

  return "unknown";
}

function normalizeCrashState(
  value: unknown,
): "NONE" | "RISING" | "CRASH" | "UNKNOWN" {
  if (value === "NONE") return "NONE";
  if (value === "RISING") return "RISING";
  if (value === "CRASH") return "CRASH";

  return "UNKNOWN";
}

function normalizeTripleLayerState(value: unknown): PrivateTripleLayerState {
  if (value === "growth_dominant") return "growth_dominant";
  if (value === "core_dominant") return "core_dominant";
  if (value === "decay_dominant") return "decay_dominant";
  if (value === "mixed") return "mixed";

  return "unknown";
}

function normalizeImpulseDirectionalBias(
  value: unknown,
): PrivateImpulseDirectionalBias {
  if (value === "UP") return "UP";
  if (value === "DOWN") return "DOWN";
  if (value === "MIXED") return "MIXED";

  return "NEUTRAL";
}

function normalizeImpulseTransitionState(
  value: unknown,
): PrivateImpulseTransitionState {
  if (value === "COMPRESSION") return "COMPRESSION";
  if (value === "PRESSURE_BUILDING") return "PRESSURE_BUILDING";
  if (value === "RELEASE") return "RELEASE";
  if (value === "EXHAUSTION") return "EXHAUSTION";

  return "NEUTRAL";
}

function normalizeNeutralizationReason(
  value: unknown,
): PrivateNeutralizationReason {
  if (value === "insufficient_data") return "insufficient_data";
  if (value === "contradictory_structure") return "contradictory_structure";
  if (value === "unstable_distribution") return "unstable_distribution";
  if (value === "excessive_decay") return "excessive_decay";
  if (value === "excessive_rupture") return "excessive_rupture";
  if (value === "invalid_temporal_alignment") {
    return "invalid_temporal_alignment";
  }
  if (value === "low_confidence") return "low_confidence";
  if (value === "degraded_snapshot") return "degraded_snapshot";
  if (value === "corrupted_distribution") return "corrupted_distribution";

  return "none";
}

function normalizeNeutralizationSeverity(
  value: unknown,
): PrivateNeutralizationSeverity {
  if (value === "low") return "low";
  if (value === "medium") return "medium";
  if (value === "high") return "high";
  if (value === "critical") return "critical";

  return "none";
}

function buildStructuralAnalyticsId(input: {
  detection_id: string;
  snapshot_version: string;
  analytical_version: string;
}): string {
  return [
    "struct",
    input.detection_id,
    input.snapshot_version,
    input.analytical_version,
  ]
    .join("|")
    .replace(/\s+/g, "");
}

function validateRecord(record: StructuralAnalyticsRecord): string | null {
  if (!record.structural_analytics_id) {
    return "structural_analytics_id_missing";
  }

  if (!record.detection_id) return "detection_id_missing";
  if (!record.asset_id) return "asset_id_missing";
  if (!record.symbol) return "symbol_missing";
  if (!record.snapshot_version) return "snapshot_version_missing";
  if (!record.analytical_version) return "analytical_version_missing";

  return null;
}

/* ============================================================================
 * 4. RECORD BUILDER
 * ========================================================================== */

export function buildStructuralAnalyticsRecord(
  input: StructuralAnalyticsRecordInput,
): StructuralAnalyticsRecord {
  const recordedAt = normalizeIsoDate(input.recorded_at, nowIso());

  const detectionId = safeString(input.detection_id);
  const snapshotVersion = safeString(input.snapshot_version, "unknown");
  const analyticalVersion = safeString(input.analytical_version, "unknown");

  const stabilityScore = clampScore(input.stability_score);
  const growthScore = clampScore(input.growth_score);
  const corePatternScore = clampScore(input.core_pattern_score);
  const decayScore = clampScore(input.decay_score);

  const impulsePressureScore = clampScore(input.impulse_pressure_score);
  const impulseInstabilityScore = clampScore(input.impulse_instability_score);
  const impulseSaturationScore = clampScore(input.impulse_saturation_score);
  const impulseExhaustionScore = clampScore(input.impulse_exhaustion_score);

  const opportunityScore = clampScore(input.opportunity_score);
  const confidenceScore = clampScore(input.confidence_score);

  const structuralAnalyticsId =
    safeString(input.structural_analytics_id) ||
    buildStructuralAnalyticsId({
      detection_id: detectionId,
      snapshot_version: snapshotVersion,
      analytical_version: analyticalVersion,
    });

  return {
    structural_analytics_id: structuralAnalyticsId,

    detection_id: detectionId,
    asset_id: safeString(input.asset_id, "unknown"),
    symbol: safeString(input.symbol, "UNKNOWN").toUpperCase(),

    snapshot_version: snapshotVersion,
    analytical_version: analyticalVersion,
    recorded_at: recordedAt,

    stability_score: stabilityScore,
    stability_status: normalizeScanStatus(input.stability_status, stabilityScore),

    structure_score: clampScore(input.structure_score),
    market_score: clampScore(input.market_score),
    coherence_score: clampScore(input.coherence_score),

    occurrence_score: clampScore(input.occurrence_score),
    frequency_score: clampScore(input.frequency_score),
    convergence_score: clampScore(input.convergence_score),
    duration_score: clampScore(input.duration_score),
    evolution_score: clampScore(input.evolution_score),

    regime: normalizeRegime(input.regime),

    rupture_score: clampScore(input.rupture_score),
    rupture_probability: clampScore(input.rupture_probability),
    rupture_penalty_score: clampScore(input.rupture_penalty_score),

    rupture_occurrence_score: clampScore(input.rupture_occurrence_score),
    rupture_frequency_score: clampScore(input.rupture_frequency_score),
    rupture_convergence_score: clampScore(input.rupture_convergence_score),
    rupture_duration_score: clampScore(input.rupture_duration_score),

    rupture_evolution_score: clampScore(input.rupture_evolution_score),
    rupture_evolution_state: normalizeRuptureEvolutionState(
      input.rupture_evolution_state,
    ),
    rupture_acceleration_score: clampScore(input.rupture_acceleration_score),

    crash_score: clampScore(input.crash_score),
    crash_state: normalizeCrashState(input.crash_state),

    continuity_probability: clampScore(input.continuity_probability),

    triple_layer_state: normalizeTripleLayerState(input.triple_layer_state),
    growth_score: growthScore,
    core_pattern_score: corePatternScore,
    decay_score: decayScore,
    growth_status: normalizeScanStatus(input.growth_status, growthScore),
    core_status: normalizeScanStatus(input.core_status, corePatternScore),
    decay_status: normalizeScanStatus(input.decay_status, decayScore),

    impulse_pressure_score: impulsePressureScore,
    impulse_instability_score: impulseInstabilityScore,
    impulse_saturation_score: impulseSaturationScore,
    impulse_exhaustion_score: impulseExhaustionScore,
    impulse_directional_bias: normalizeImpulseDirectionalBias(
      input.impulse_directional_bias,
    ),
    impulse_transition_state: normalizeImpulseTransitionState(
      input.impulse_transition_state,
    ),
    impulse_status: normalizeScanStatus(
      input.impulse_status,
      impulsePressureScore,
    ),

    neutralized: input.neutralized === true,
    neutralization_reason: normalizeNeutralizationReason(
      input.neutralization_reason,
    ),
    neutralization_severity: normalizeNeutralizationSeverity(
      input.neutralization_severity,
    ),
    neutralization_validity: normalizeScanStatus(
      input.neutralization_validity,
    ),

    decision: normalizeDecision(input.decision),
    decision_score: clampScore(input.decision_score),
    opportunity_score: opportunityScore,
    confidence_score: confidenceScore,

    decision_status: safeNullableString(input.decision_status),
    opportunity_status: input.opportunity_status
      ? normalizeScanStatus(input.opportunity_status, opportunityScore)
      : null,
    confidence_status: input.confidence_status
      ? normalizeScanStatus(input.confidence_status, confidenceScore)
      : null,
  };
}

/* ============================================================================
 * 5. MUTATION API
 * ========================================================================== */

export function recordStructuralAnalytics(
  input: StructuralAnalyticsRecordInput,
): StructuralAnalyticsWriteResult {
  const record = buildStructuralAnalyticsRecord(input);
  const validationError = validateRecord(record);

  if (validationError) {
    return {
      ok: false,
      status: "invalid",
      record: null,
      error: validationError,
    };
  }

  if (structuralAnalyticsStore.has(record.structural_analytics_id)) {
    return {
      ok: true,
      status: "duplicate",
      record:
        structuralAnalyticsStore.get(record.structural_analytics_id) ?? null,
      error: null,
    };
  }

  structuralAnalyticsStore.set(
    record.structural_analytics_id,
    Object.freeze({ ...record }),
  );

  return {
    ok: true,
    status: "recorded",
    record,
    error: null,
  };
}

export function recordStructuralAnalyticsBatch(
  inputs: readonly StructuralAnalyticsRecordInput[],
): StructuralAnalyticsWriteResult[] {
  return inputs.map(recordStructuralAnalytics);
}

export function clearStructuralAnalyticsStore(): void {
  structuralAnalyticsStore.clear();
}

/* ============================================================================
 * 6. READ API
 * ========================================================================== */

export function listStructuralAnalyticsRecords(): StructuralAnalyticsRecord[] {
  return [...structuralAnalyticsStore.values()];
}

export function getStructuralAnalyticsRecord(
  structuralAnalyticsId: string,
): StructuralAnalyticsRecord | null {
  return structuralAnalyticsStore.get(structuralAnalyticsId) ?? null;
}

export function getStructuralAnalyticsRecordByDetectionId(
  detectionId: string,
): StructuralAnalyticsRecord | null {
  return (
    listStructuralAnalyticsRecords().find(
      (record) => record.detection_id === detectionId,
    ) ?? null
  );
}

export function listStructuralAnalyticsRecordsByAsset(
  assetId: string,
): StructuralAnalyticsRecord[] {
  const normalizedAssetId = safeString(assetId).toLowerCase();

  return listStructuralAnalyticsRecords().filter(
    (record) => record.asset_id.toLowerCase() === normalizedAssetId,
  );
}

export function listStructuralAnalyticsRecordsBySymbol(
  symbol: string,
): StructuralAnalyticsRecord[] {
  const normalizedSymbol = safeString(symbol).toUpperCase();

  return listStructuralAnalyticsRecords().filter(
    (record) => record.symbol === normalizedSymbol,
  );
}

export function getStructuralAnalyticsStoreSnapshot():
  StructuralAnalyticsStoreSnapshot {
  return {
    ok: true,
    count: structuralAnalyticsStore.size,
    records: listStructuralAnalyticsRecords(),
    warnings: [],
  };
}
