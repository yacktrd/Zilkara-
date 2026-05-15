/* ============================================================================
 * FILE: lib/xyvala/factories/scan-asset-factory.ts
 * ========================================================================== */

import type { Quote } from "@/lib/xyvala/snapshot";

import type {
  PrivateCalibrationStatus,
  PrivateDecisionStatus,
  PrivateNeutralizationReason,
  PrivateNeutralizationSeverity,
  PrivateRuptureEvolutionState,
  PrivateScanAsset,
  PrivateScanDecision,
  PrivateScanRegime,
  PrivateScanStatus,
  PrivateTripleLayerState,
} from "@/lib/xyvala/contracts/scan-private-contract";

export type BuildPrivateScanAssetInput = {
  id?: unknown;
  symbol?: unknown;
  name?: unknown;
  quote?: unknown;

  price?: unknown;
  chg_24h_pct?: unknown;
  chg_7d_pct?: unknown;
  market_cap?: unknown;
  volume_24h?: unknown;
  sparkline_7d?: unknown;
  rank?: unknown;
  logo_url?: unknown;

  stability_score?: unknown;
  stability_status?: unknown;
  structure_score?: unknown;
  market_score?: unknown;
  coherence_score?: unknown;

  occurrence_score?: unknown;
  frequency_score?: unknown;
  convergence_score?: unknown;
  duration_score?: unknown;
  evolution_score?: unknown;
  growth_score?: unknown;

  rupture_score?: unknown;
  rupture_probability?: unknown;
  rupture_penalty_score?: unknown;
  rupture_occurrence_score?: unknown;
  rupture_frequency_score?: unknown;
  rupture_convergence_score?: unknown;
  rupture_duration_score?: unknown;
  rupture_evolution_score?: unknown;
  rupture_evolution_state?: unknown;
  rupture_acceleration_score?: unknown;

  crash_score?: unknown;
  crash_state?: unknown;

  initial_7d?: unknown;
  rolling_7d?: unknown;
  initial_24h?: unknown;
  rolling_24h?: unknown;
  timing_state?: unknown;

  triple_layer_state?: unknown;
  growth_layer_score?: unknown;
  core_pattern_score?: unknown;
  decay_score?: unknown;

  neutralized?: unknown;
  neutralization_reason?: unknown;
  neutralization_severity?: unknown;
  neutralization_validity?: unknown;

  calibration_status?: unknown;
  calibration_version?: unknown;
  calibration_source?: unknown;
  calibration_warnings?: unknown;

  regime?: unknown;
  decision?: unknown;
  decision_status?: unknown;
  opportunity_score?: unknown;
  opportunity_status?: unknown;
  confidence_score?: unknown;
  confidence_status?: unknown;
  continuity_probability?: unknown;

  analytical_version?: unknown;
  generated_at?: unknown;
  source?: unknown;
  warnings?: unknown;
};

type TemporalInput = {
  price_score?: unknown;
  change_pct?: unknown;
  slope_pct?: unknown;
  stability_score?: unknown;
  rupture_score?: unknown;
  rupture_probability?: unknown;
  status?: unknown;
};

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeNullableString(value: unknown): string | null {
  const valueString = safeString(value);
  return valueString.length > 0 ? valueString : null;
}

function safeNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function safeNullableInteger(value: unknown): number | null {
  const parsed = safeNullableNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function normalizeScore(value: unknown): number | null {
  const parsed = safeNullableNumber(value);
  return parsed === null ? null : Math.round(clamp(parsed, 0, 100) * 100) / 100;
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

function normalizeQuote(value: unknown): Quote {
  const quote = safeString(value).toLowerCase();

  if (quote === "usd") return "usd";
  if (quote === "usdt") return "usdt";

  return "eur";
}

function normalizeScanStatus(value: unknown, score?: number | null): PrivateScanStatus {
  if (value === "computed") return "computed";
  if (value === "partial") return "partial";
  if (value === "degraded") return "degraded";
  if (value === "unavailable") return "unavailable";

  return score === null ? "unavailable" : "computed";
}

function normalizeDecisionStatus(value: unknown): PrivateDecisionStatus {
  if (value === "valid") return "valid";
  if (value === "neutralized") return "neutralized";
  if (value === "unavailable") return "unavailable";

  return "defensive";
}

function normalizeRegime(value: unknown): PrivateScanRegime {
  const normalized = safeString(value).toUpperCase();

  if (normalized === "STABLE") return "STABLE";
  if (normalized === "VOLATILE") return "VOLATILE";

  return "TRANSITION";
}

function normalizeDecision(value: unknown): PrivateScanDecision {
  const normalized = safeString(value).toUpperCase();

  if (normalized === "ALLOW") return "ALLOW";
  if (normalized === "BLOCK") return "BLOCK";

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

function normalizeTripleLayerState(value: unknown): PrivateTripleLayerState {
  if (value === "growth_dominant") return "growth_dominant";
  if (value === "core_dominant") return "core_dominant";
  if (value === "decay_dominant") return "decay_dominant";
  if (value === "mixed") return "mixed";

  return "unknown";
}

function normalizeNeutralizationReason(
  value: unknown,
): PrivateNeutralizationReason {
  if (value === "insufficient_data") return "insufficient_data";
  if (value === "contradictory_structure") return "contradictory_structure";
  if (value === "unstable_distribution") return "unstable_distribution";
  if (value === "excessive_decay") return "excessive_decay";
  if (value === "excessive_rupture") return "excessive_rupture";
  if (value === "invalid_temporal_alignment") return "invalid_temporal_alignment";
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

function normalizeCalibrationStatus(value: unknown): PrivateCalibrationStatus {
  if (value === "fallback") return "fallback";
  if (value === "bootstrap") return "bootstrap";
  if (value === "calibrated") return "calibrated";
  if (value === "degraded") return "degraded";

  return "inactive";
}

function normalizeCalibrationSource(
  value: unknown,
): "fallback" | "bootstrap" | "calibrated" | "degraded" {
  if (value === "bootstrap") return "bootstrap";
  if (value === "calibrated") return "calibrated";
  if (value === "degraded") return "degraded";

  return "fallback";
}

function normalizeCrashState(value: unknown): "NONE" | "RISING" | "CRASH" | "UNKNOWN" {
  if (value === "NONE") return "NONE";
  if (value === "RISING") return "RISING";
  if (value === "CRASH") return "CRASH";

  return "UNKNOWN";
}

function normalizeTimingState(value: unknown): "GOOD" | "NEUTRAL" | "BAD" | "UNKNOWN" {
  if (value === "GOOD") return "GOOD";
  if (value === "BAD") return "BAD";
  if (value === "NEUTRAL") return "NEUTRAL";

  return "UNKNOWN";
}

function normalizeSparkline(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;

  const points = value.filter(
    (item): item is number =>
      typeof item === "number" && Number.isFinite(item),
  );

  return points.length >= 2 ? points : null;
}

function normalizeTemporalBlock(value: unknown) {
  const input =
    typeof value === "object" && value !== null
      ? (value as TemporalInput)
      : {};

  return {
    price_score: normalizeScore(input.price_score),
    change_pct: safeNullableNumber(input.change_pct),
    slope_pct: safeNullableNumber(input.slope_pct),
    stability_score: normalizeScore(input.stability_score),
    rupture_score: normalizeScore(input.rupture_score),
    rupture_probability: normalizeScore(input.rupture_probability),
    status: normalizeScanStatus(input.status),
  };
}

export function buildPrivateScanAsset(
  input: BuildPrivateScanAssetInput,
): PrivateScanAsset {
  const symbol = safeString(input.symbol, "UNKNOWN").toUpperCase();
  const name = safeString(input.name, symbol);

  const stabilityScore = normalizeScore(input.stability_score);
  const opportunityScore = normalizeScore(input.opportunity_score);
  const confidenceScore = normalizeScore(input.confidence_score);

  return {
    id: safeString(input.id, symbol.toLowerCase()),
    symbol,
    name,
    rank: safeNullableInteger(input.rank),
    logo_url: safeNullableString(input.logo_url),

    quote: normalizeQuote(input.quote),
    price: safeNullableNumber(input.price),
    chg_24h_pct: safeNullableNumber(input.chg_24h_pct),
    chg_7d_pct: safeNullableNumber(input.chg_7d_pct),
    market_cap: safeNullableNumber(input.market_cap),
    volume_24h: safeNullableNumber(input.volume_24h),
    sparkline_7d: normalizeSparkline(input.sparkline_7d),

    stability_score: stabilityScore,
    stability_status: normalizeScanStatus(input.stability_status, stabilityScore),
    structure_score: normalizeScore(input.structure_score),
    market_score: normalizeScore(input.market_score),
    coherence_score: normalizeScore(input.coherence_score),

    occurrence_score: normalizeScore(input.occurrence_score),
    frequency_score: normalizeScore(input.frequency_score),
    convergence_score: normalizeScore(input.convergence_score),
    duration_score: normalizeScore(input.duration_score),
    evolution_score: normalizeScore(input.evolution_score),
    growth_layer_score: normalizeScore(input.growth_layer_score),

    rupture_score: normalizeScore(input.rupture_score),
    rupture_probability: normalizeScore(input.rupture_probability),
    rupture_penalty_score: normalizeScore(input.rupture_penalty_score),
    rupture_occurrence_score: normalizeScore(input.rupture_occurrence_score),
    rupture_frequency_score: normalizeScore(input.rupture_frequency_score),
    rupture_convergence_score: normalizeScore(input.rupture_convergence_score),
    rupture_duration_score: normalizeScore(input.rupture_duration_score),
    rupture_evolution_score: normalizeScore(input.rupture_evolution_score),
    rupture_evolution_state: normalizeRuptureEvolutionState(
      input.rupture_evolution_state,
    ),
    rupture_acceleration_score: normalizeScore(input.rupture_acceleration_score),

    crash_score: normalizeScore(input.crash_score),
    crash_state: normalizeCrashState(input.crash_state),

    initial_7d: normalizeTemporalBlock(input.initial_7d),
    rolling_7d: normalizeTemporalBlock(input.rolling_7d),
    initial_24h: normalizeTemporalBlock(input.initial_24h),
    rolling_24h: normalizeTemporalBlock(input.rolling_24h),
    timing_state: normalizeTimingState(input.timing_state),

    state: normalizeTripleLayerState(input.triple_layer_state),
    growth_score: normalizeScore(input.growth_layer_score),
    core_pattern_score: normalizeScore(input.core_pattern_score),
    decay_score: normalizeScore(input.decay_score),
    growth_status: normalizeScanStatus(input.growth_layer_score),
    core_status: normalizeScanStatus(input.core_pattern_score),
    decay_status: normalizeScanStatus(input.decay_score),

    neutralized: input.neutralized === true,
    neutralization_reason: normalizeNeutralizationReason(
      input.neutralization_reason,
    ),
    neutralization_severity: normalizeNeutralizationSeverity(
      input.neutralization_severity,
    ),
    neutralization_validity: normalizeScanStatus(input.neutralization_validity),

    calibration_status: normalizeCalibrationStatus(input.calibration_status),
    calibration_version: safeNullableString(input.calibration_version),
    calibration_source: normalizeCalibrationSource(input.calibration_source),
    calibration_warnings: normalizeWarnings(input.calibration_warnings),

    regime: normalizeRegime(input.regime),
    decision: normalizeDecision(input.decision),
    decision_status: normalizeDecisionStatus(input.decision_status),

    opportunity_score: opportunityScore,
    opportunity_status: normalizeScanStatus(
      input.opportunity_status,
      opportunityScore,
    ),

    confidence_score: confidenceScore,
    confidence_status: normalizeScanStatus(input.confidence_status, confidenceScore),

    continuity_probability: normalizeScore(input.continuity_probability),

    governance: {
      analytical_version: safeString(input.analytical_version, "v1"),
      generated_at: safeString(input.generated_at, new Date().toISOString()),
      source:
        input.source === "snapshot" ||
        input.source === "runtime" ||
        input.source === "fallback"
          ? input.source
          : "scan",
      warnings: normalizeWarnings(input.warnings),
      deterministic: true,
      jurisdiction: "FR/EU",
      default_currency: "EUR",
    },
  };
}
