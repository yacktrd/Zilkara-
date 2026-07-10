/* ============================================================================
 * FILE: lib/xyvala/stores/market-traceability-adapter.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private market traceability adapter
 *
 * ROLE
 * - adapt private market evaluations into PrivateScanAsset[]
 * - preserve private RFS / MCI analytical values before public projection
 * - feed private traceability orchestration without exposing stores publicly
 *
 * PARENT FILES
 * - lib/xyvala/services/raw-assets-service.ts
 * - lib/xyvala/engine/rfs-market.ts
 * - lib/xyvala/engine/mci-market.ts
 * - lib/xyvala/factories/scan-asset-factory.ts
 * - lib/xyvala/stores/traceability-store-orchestrator.ts
 *
 * DIRECTIVES
 * - private adapter only
 * - no API logic
 * - no UI logic
 * - no snapshot writing
 * - no public exposure
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration computation
 * - no prediction
 * - no investment semantics
 * - record already computed private values only
 * - read nested RFS contract outputs without reconstructing them
 * - null means unavailable
 * - undefined must never be propagated
 *
 * INPUTS
 * - MarketEvaluation-like objects
 *
 * OUTPUTS
 * - PrivateScanAsset[]
 *
 * INVARIANTS
 * - private traceability happens before public projection
 * - adapter does not create analytical truth
 * - adapter only normalizes and bridges existing private outputs
 * - RFS nested outputs remain the source of structural truth
 * - MCI outputs remain the source of decision / opportunity / confidence truth
 * - traceability stores remain strictly private
 *
 * SENSITIVE ZONES
 * - private analytical fields
 * - RFS nested contract mapping
 * - MCI decision leakage
 * - public/private boundary
 * ========================================================================== */

import { buildPrivateScanAsset } from "@/lib/xyvala/factories/scan-asset-factory";

import type { Quote } from "@/lib/xyvala/snapshot";
import type { PrivateScanAsset } from "@/lib/xyvala/contracts/scan-private-contract";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type MarketTraceabilityEvaluation = {
  mapped: Record<string, unknown>;
  marketRfs?: unknown;
  marketMci?: unknown;
};

export type MarketTraceabilityAdapterResult = {
  ok: boolean;
  assets: PrivateScanAsset[];
  count: number;
  rejected_count: number;
  warnings: string[];
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeQuote(value: unknown): Quote {
  if (value === "usd") return "usd";
  if (value === "usdt") return "usdt";
  return "eur";
}

function read(
  source: Record<string, unknown>,
  key: string,
  fallback?: string,
): unknown {
  if (Object.prototype.hasOwnProperty.call(source, key)) {
    return source[key];
  }

  if (fallback && Object.prototype.hasOwnProperty.call(source, fallback)) {
    return source[fallback];
  }

  return null;
}

function readRecord(
  source: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  return asRecord(read(source, key));
}

function readNestedRecordField(
  source: Record<string, unknown>,
  path: readonly string[],
): unknown {
  let current: unknown = source;

  for (const key of path) {
    if (typeof current !== "object" || current === null) {
      return null;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return current ?? null;
}

function firstAvailable(...values: unknown[]): unknown {
  for (const value of values) {
    if (value !== null && value !== undefined) {
      return value;
    }
  }

  return null;
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  return [
    ...new Set(
      groups
        .flatMap((group) => (Array.isArray(group) ? group : []))
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        ),
    ),
  ];
}

/* ============================================================================
 * 3. MARKET EVALUATION NORMALIZATION
 * ========================================================================== */

function isMarketTraceabilityEvaluation(
  value: unknown,
): value is MarketTraceabilityEvaluation {
  return isPlainObject(value) && isPlainObject(value.mapped);
}

function marketEvaluationToPrivateScanAsset(
  evaluation: MarketTraceabilityEvaluation,
): PrivateScanAsset {
  const mapped = evaluation.mapped;
  const marketRfs = asRecord(evaluation.marketRfs);
  const marketMci = asRecord(evaluation.marketMci);

  const rfsMetrics = readRecord(marketRfs, "metrics");
  const rfsAxes = readRecord(marketRfs, "axes");
  const rfsScores = readRecord(marketRfs, "scores");
  const rfsStates = readRecord(marketRfs, "states");
  const rfsProbabilities = readRecord(marketRfs, "probabilities");
  const rfsQuality = readRecord(marketRfs, "quality");
  const rfsImpulse = readRecord(marketRfs, "impulse");

  const symbol = safeString(
    read(mapped, "canonical_symbol", "symbol"),
    "UNKNOWN",
  ).toUpperCase();

  const id = safeString(
    read(mapped, "canonical_id", "id"),
    symbol.toLowerCase(),
  );

  const name = safeString(
    read(mapped, "canonical_name", "name"),
    symbol,
  );

  const analyticalVersion = safeString(
    firstAvailable(
      read(marketMci, "analytical_version"),
      read(marketRfs, "analytical_version"),
    ),
    "market-traceability-v1",
  );

  const generatedAt = nowIso();

  const warnings = uniqueWarnings(
    read(marketRfs, "warnings") as string[] | undefined,
    read(marketMci, "warnings") as string[] | undefined,
    read(rfsMetrics, "sample_size") === 0
      ? ["rfs_sample_size_zero"]
      : [],
  );

  return buildPrivateScanAsset({
    id,
    symbol,
    name,

        quote: safeQuote(read(mapped, "quote_asset")),

    price: firstAvailable(
      read(mapped, "price"),
      read(mapped, "price_eur"),
      read(mapped, "current_price"),
    ),

    chg_24h_pct: firstAvailable(
      read(mapped, "chg_24h_pct"),
      read(mapped, "price_change_percentage_24h"),
    ),

    chg_7d_pct: firstAvailable(
      read(mapped, "chg_7d_pct"),
      read(mapped, "price_change_percentage_7d"),
      read(mapped, "price_change_percentage_7d_in_currency"),
    ),

    market_cap: firstAvailable(
      read(mapped, "market_cap"),
      read(mapped, "market_cap_eur"),
    ),

    volume_24h: firstAvailable(
      read(mapped, "volume_24h"),
      read(mapped, "volume_24h_eur"),
      read(mapped, "total_volume"),
    ),

    sparkline_7d: firstAvailable(
      read(mapped, "sparkline_7d"),
      readNestedRecordField(mapped, ["sparkline_in_7d", "price"]),
    ),

    rank: read(mapped, "rank"),
    logo_url: read(mapped, "logo_url"),
    stability_score: read(rfsScores, "stability"),
    stability_status: read(rfsStates, "rfs_status"),

    structure_score: read(rfsScores, "structure"),
    market_score: read(rfsScores, "mid_term"),
    coherence_score: read(rfsScores, "convergence"),

    occurrence_score: firstAvailable(
      read(rfsScores, "occurrence"),
      read(rfsAxes, "occurrence"),
    ),
    frequency_score: firstAvailable(
      read(rfsScores, "frequency"),
      read(rfsAxes, "frequency"),
    ),
    convergence_score: firstAvailable(
      read(rfsScores, "convergence"),
      read(rfsAxes, "convergence"),
    ),
    duration_score: firstAvailable(
      read(rfsScores, "duration"),
      read(rfsAxes, "duration"),
    ),
    evolution_score: firstAvailable(
      read(rfsScores, "correlation"),
      read(rfsAxes, "correlation"),
    ),

    growth_score: read(rfsScores, "mid_term"),

    rupture_score: read(rfsScores, "rupture"),
    rupture_probability: read(rfsProbabilities, "rupture_probability"),
    rupture_penalty_score: null,

    rupture_occurrence_score: firstAvailable(
      read(rfsScores, "occurrence"),
      read(rfsAxes, "occurrence"),
    ),
    rupture_frequency_score: firstAvailable(
      read(rfsScores, "frequency"),
      read(rfsAxes, "frequency"),
    ),
    rupture_convergence_score: firstAvailable(
      read(rfsScores, "convergence"),
      read(rfsAxes, "convergence"),
    ),
    rupture_duration_score: firstAvailable(
      read(rfsScores, "duration"),
      read(rfsAxes, "duration"),
    ),

        rupture_evolution_score: read(marketMci, "rupture_evolution_score"),
    rupture_evolution_state: read(marketMci, "rupture_evolution_state"),
    rupture_acceleration_score: read(marketMci, "rupture_acceleration_score"),

    crash_score: firstAvailable(
      read(marketMci, "crash_score"),
      read(marketRfs, "crash_score"),
      read(rfsScores, "crash_score"),
      read(rfsScores, "crash"),
    ),
    crash_state: firstAvailable(
      read(marketMci, "crash_state"),
      read(marketRfs, "crash_state"),
      read(rfsStates, "crash_state"),
      "UNKNOWN",
    ),

    triple_layer_state: firstAvailable(
      read(marketMci, "triple_layer_state"),
      read(marketRfs, "triple_layer_state"),
      "UNKNOWN",
    ),
    growth_layer_score: firstAvailable(
      read(marketMci, "growth_layer_score"),
      read(marketMci, "growth_score"),
      read(marketRfs, "growth_layer_score"),
      read(rfsScores, "growth_layer_score"),
      read(rfsScores, "growth"),
      read(rfsScores, "mid_term"),
    ),
    core_pattern_score: firstAvailable(
      read(marketMci, "core_pattern_score"),
      read(marketMci, "core_score"),
      read(marketRfs, "core_pattern_score"),
      read(rfsScores, "core_pattern_score"),
      read(rfsScores, "core_pattern"),
      read(rfsScores, "structure"),
    ),
    decay_score: firstAvailable(
      read(marketMci, "decay_score"),
      read(marketMci, "decay_layer_score"),
      read(marketRfs, "decay_score"),
      read(rfsScores, "decay_score"),
      read(rfsScores, "decay"),
      read(rfsScores, "rupture"),
    ),
    impulse_pressure_score: firstAvailable(
      read(marketMci, "impulse_pressure_score"),
      read(rfsImpulse, "impulse_pressure_score"),
    ),
    impulse_instability_score: firstAvailable(
      read(marketMci, "impulse_instability_score"),
      read(rfsImpulse, "impulse_instability_score"),
    ),
    impulse_saturation_score: firstAvailable(
      read(marketMci, "impulse_saturation_score"),
      read(rfsImpulse, "impulse_saturation_score"),
    ),
    impulse_exhaustion_score: firstAvailable(
      read(marketMci, "impulse_exhaustion_score"),
      read(rfsImpulse, "impulse_exhaustion_score"),
    ),
    impulse_directional_bias: firstAvailable(
      read(marketMci, "impulse_directional_bias"),
      read(rfsImpulse, "impulse_directional_bias"),
    ),
    impulse_transition_state: firstAvailable(
      read(marketMci, "impulse_transition_state"),
      read(rfsImpulse, "impulse_transition_state"),
    ),
    impulse_status: firstAvailable(
      read(marketMci, "impulse_status"),
      read(rfsImpulse, "impulse_status"),
    ),

    neutralized: read(marketMci, "neutralized"),
    neutralization_reason: read(marketMci, "neutralization_reason"),
    neutralization_severity: read(marketMci, "neutralization_severity"),
    neutralization_validity: read(marketMci, "neutralization_validity"),

    regime: read(rfsStates, "regime"),

    decision: read(marketMci, "decision"),
    decision_status: read(marketMci, "decision_status"),

    opportunity_score: read(marketMci, "opportunity_score"),
    opportunity_status: read(marketMci, "opportunity_status"),

    confidence_score: firstAvailable(
      read(marketMci, "confidence_score"),
      read(rfsQuality, "confidence"),
    ),
    confidence_status: read(marketMci, "confidence_status"),

    continuity_probability: read(rfsProbabilities, "continuity_probability"),

    analytical_version: analyticalVersion,
    generated_at: generatedAt,
    source: "scan",

    warnings,
  });
}

/* ============================================================================
 * 4. PRIVATE ADAPTER API
 * ========================================================================== */

export function adaptMarketEvaluationsToPrivateScanAssets(
  evaluations: readonly unknown[],
): MarketTraceabilityAdapterResult {
  const assets: PrivateScanAsset[] = [];
  let rejectedCount = 0;

  for (const evaluation of evaluations) {
    if (!isMarketTraceabilityEvaluation(evaluation)) {
      rejectedCount += 1;
      continue;
    }

    assets.push(marketEvaluationToPrivateScanAsset(evaluation));
  }

  return {
    ok: rejectedCount === 0,
    assets,
    count: assets.length,
    rejected_count: rejectedCount,
    warnings:
      rejectedCount > 0
        ? [`market_traceability_rejected:${rejectedCount}`]
        : [],
  };
}
