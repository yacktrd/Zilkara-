/* ============================================================================
 * FILE: lib/xyvala/governance/traceability-governor.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala traceability governor
 *
 * ROLE
 * - convert private scan assets into deterministic runtime trace inputs
 * - connect existing private analytical variables to governance runtime
 * - execute lineage, propagation, divergence, health and governance diagnostics
 * - provide an operational traceability governance result without mutation
 *
 * PARENTS
 * - lib/xyvala/contracts/scan-private-contract.ts
 * - lib/xyvala/governance/governance-layer-order.ts
 * - lib/xyvala/governance/governance-runtime.ts
 * - lib/xyvala/governance/runtime-traceability.ts
 *
 * DIRECTIVES
 * - governance adapter only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no public projection
 * - no API logic
 * - no UI logic
 * - no cache mutation
 * - no persistence
 * - no event bus
 * - deterministic output only
 * - use GovernanceLayer as the only layer source of truth
 *
 * INPUTS
 * - PrivateScanAsset[]
 *
 * OUTPUTS
 * - TraceabilityGovernorResult
 *
 * INVARIANTS
 * - governor never creates analytical truth
 * - governor never mutates runtime state
 * - governor reads already computed private variables only
 * - missing values become explicit unavailable traces
 * - first divergence remains the priority diagnostic
 *
 * CRITICAL DEPENDENCIES
 * - PrivateScanAsset
 * - GovernanceLayer
 * - RuntimeTraceInput
 * - buildGovernanceRuntimeState
 *
 * SENSITIVE ZONES
 * - private analytical variables
 * - decision leakage
 * - public/private boundary
 * - propagation trace construction
 * ========================================================================== */

import type {
  PrivateScanAsset,
} from "@/lib/xyvala/contracts/scan-private-contract";

import {
  listVariableLineageEntries,
} from "@/lib/xyvala/governance/variable-lineage-registry";

import type {
  GovernanceLayer,
} from "@/lib/xyvala/governance/governance-layer-order";

import {
  buildGovernanceRuntimeState,
  type GovernanceRuntimeState,
} from "@/lib/xyvala/governance/governance-runtime";

import type {
  RuntimeTraceInput,
} from "@/lib/xyvala/governance/runtime-traceability";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type TraceabilityGovernorStatus =
  | "governed"
  | "degraded"
  | "blocked"
  | "empty"
  | "invalid";

export type TraceabilityGovernorResult = {
  ok: boolean;
  status: TraceabilityGovernorStatus;
  asset_count: number;
  trace_count: number;
  governance: GovernanceRuntimeState;
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. CONSTANTS
 * ========================================================================== */

const LAYERS = {
  RFS: "RFS",
  TRIPLE_LAYER: "TRIPLE_LAYER",
  IMPULSE_LAYER: "IMPULSE_LAYER",
  CRASH_SYSTEM: "CRASH_SYSTEM",
  MCI: "MCI",
  CALIBRATION: "CALIBRATION",
} as const satisfies Record<string, GovernanceLayer>;

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function isPresent(value: unknown): boolean {
  return value !== null && value !== undefined;
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
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

function statusFromValue(value: unknown): RuntimeTraceInput["status"] {
  return isPresent(value) ? "valid" : "unavailable";
}

function buildAssetReference(asset: PrivateScanAsset): string {
  return `${safeString(asset.symbol, "UNKNOWN")}:${safeString(asset.id, "unknown")}`;
}

function trace(input: {
  variable_name: string;
  layer: RuntimeTraceInput["layer"];
  value: unknown;
  source?: RuntimeTraceInput["source"];
  reference?: string | null;
  reason?: string | null;
}): RuntimeTraceInput {
  const valuePresent = isPresent(input.value);

  return {
    variable_name: input.variable_name,
    layer: input.layer,
    status: statusFromValue(input.value),
    source: input.source ?? "governance",
    reference: input.reference ?? null,
    reason:
      input.reason ??
      (valuePresent ? null : "variable_unavailable"),
  };
}

/* ============================================================================
 * 4. TRACE BUILDERS — SOURCE LAYERS
 * ========================================================================== */

function buildRfsTraces(asset: PrivateScanAsset): RuntimeTraceInput[] {
  const reference = buildAssetReference(asset);

  return [
    trace({
      variable_name: "stability_score",
      layer: LAYERS.RFS,
      value: asset.stability_score,
      source: "engine",
      reference,
    }),
    trace({
      variable_name: "regime",
      layer: LAYERS.RFS,
      value: asset.regime,
      source: "engine",
      reference,
    }),
    trace({
      variable_name: "rupture_score",
      layer: LAYERS.RFS,
      value: asset.rupture_score,
      source: "engine",
      reference,
    }),
    trace({
      variable_name: "rupture_probability",
      layer: LAYERS.RFS,
      value: asset.rupture_probability,
      source: "engine",
      reference,
    }),
    trace({
      variable_name: "continuity_probability",
      layer: LAYERS.RFS,
      value: asset.continuity_probability,
      source: "engine",
      reference,
    }),
  ];
}

function buildTripleLayerTraces(
  asset: PrivateScanAsset,
): RuntimeTraceInput[] {
  const reference = buildAssetReference(asset);

  return [
    trace({
      variable_name: "growth_layer",
      layer: LAYERS.TRIPLE_LAYER,
      value: asset.growth_score,
      source: "engine",
      reference,
    }),
    trace({
      variable_name: "core_pattern_layer",
      layer: LAYERS.TRIPLE_LAYER,
      value: asset.core_pattern_score,
      source: "engine",
      reference,
    }),
    trace({
      variable_name: "decay_layer",
      layer: LAYERS.TRIPLE_LAYER,
      value: asset.decay_score,
      source: "engine",
      reference,
    }),
  ];
}

function buildImpulseLayerTraces(
  asset: PrivateScanAsset,
): RuntimeTraceInput[] {
  const reference = buildAssetReference(asset);

  return [
    trace({
      variable_name: "impulse_pressure_score",
      layer: LAYERS.IMPULSE_LAYER,
      value: asset.impulse_pressure_score,
      source: "engine",
      reference,
    }),
    trace({
      variable_name: "impulse_instability_score",
      layer: LAYERS.IMPULSE_LAYER,
      value: asset.impulse_instability_score,
      source: "engine",
      reference,
    }),
    trace({
      variable_name: "impulse_saturation_score",
      layer: LAYERS.IMPULSE_LAYER,
      value: asset.impulse_saturation_score,
      source: "engine",
      reference,
    }),
    trace({
      variable_name: "impulse_exhaustion_score",
      layer: LAYERS.IMPULSE_LAYER,
      value: asset.impulse_exhaustion_score,
      source: "engine",
      reference,
    }),
    trace({
      variable_name: "impulse_directional_bias",
      layer: LAYERS.IMPULSE_LAYER,
      value: asset.impulse_directional_bias,
      source: "engine",
      reference,
    }),
    trace({
      variable_name: "impulse_transition_state",
      layer: LAYERS.IMPULSE_LAYER,
      value: asset.impulse_transition_state,
      source: "engine",
      reference,
    }),
  ];
}

function buildCrashSystemTraces(
  asset: PrivateScanAsset,
): RuntimeTraceInput[] {
  const reference = buildAssetReference(asset);

  return [
    trace({
      variable_name: "crash_score",
      layer: LAYERS.CRASH_SYSTEM,
      value: asset.crash_score,
      source: "engine",
      reference,
    }),
    trace({
      variable_name: "crash_state",
      layer: LAYERS.CRASH_SYSTEM,
      value: asset.crash_state,
      source: "engine",
      reference,
    }),
  ];
}

function buildMciTraces(asset: PrivateScanAsset): RuntimeTraceInput[] {
  const reference = buildAssetReference(asset);

  return [
    trace({
      variable_name: "decision",
      layer: LAYERS.MCI,
      value: asset.decision,
      source: "engine",
      reference,
    }),
  ];
}

function buildCalibrationTraces(
  asset: PrivateScanAsset,
): RuntimeTraceInput[] {
  return [];
}

 

/* ============================================================================
 * 5. TRACE BUILDERS — LINEAGE PROPAGATION
 * ==========================================================================
 *
 * ROLE
 * - generate propagation traces from the official variable lineage registry
 * - read only values already present on PrivateScanAsset
 * - expose unavailable variables explicitly without reconstruction
 *
 * DIRECTIVES
 * - trace propagation only
 * - no analytical computation
 * - no reconstruction of missing values
 * - no mutation
 * - deterministic output only
 * ========================================================================== */

function readRecordField(source: unknown, field: string): unknown {
  if (typeof source !== "object" || source === null) return null;

  return (source as Record<string, unknown>)[field] ?? null;
}

function readNestedRecordField(
  source: unknown,
  path: readonly string[],
): unknown {
  let current: unknown = source;

  for (const key of path) {
    if (typeof current !== "object" || current === null) return null;

    current = (current as Record<string, unknown>)[key];
  }

  return current ?? null;
}

function readFirstAvailableValue(values: readonly unknown[]): unknown {
  return values.find(isPresent) ?? null;
}

function readAssetVariableValue(input: {
  asset: PrivateScanAsset;
  variableName: string;
}): unknown {
  const asset = input.asset;

    switch (input.variableName) {
    /* ------------------------------------------------------------------------
     * Acquisition / market inputs
     * ---------------------------------------------------------------------- */

    case "id":
      return readRecordField(asset, "id");

    case "symbol":
      return asset.symbol;

    case "name":
      return asset.name;

    case "price_eur":
      return readFirstAvailableValue([
        readRecordField(asset, "price_eur"),
        readRecordField(asset, "price"),
        readNestedRecordField(asset, ["market", "price_eur"]),
      ]);

    case "chg_24h_pct":
      return asset.chg_24h_pct;

    case "chg_7d_pct":
      return asset.chg_7d_pct;

    case "sparkline_7d":
      return asset.sparkline_7d;

    case "market_cap_eur":
      return readFirstAvailableValue([
        readRecordField(asset, "market_cap_eur"),
        readRecordField(asset, "market_cap"),
      ]);

    case "volume_24h_eur":
      return readFirstAvailableValue([
        readRecordField(asset, "volume_24h_eur"),
        readRecordField(asset, "volume_24h"),
      ]);

    case "rank":
      return asset.rank;

    case "logo_url":
      return readFirstAvailableValue([
        readRecordField(asset, "logo_url"),
        readRecordField(asset, "logo"),
      ]);

    /* ------------------------------------------------------------------------
     * RFS core truth
     * ---------------------------------------------------------------------- */

    case "stability_score":
      return asset.stability_score;

    case "regime":
      return asset.regime;

    case "rupture_score":
      return asset.rupture_score;

    case "rupture_probability":
      return asset.rupture_probability;

    case "continuity_probability":
      return asset.continuity_probability;

    case "crash_score":
      return asset.crash_score;

    case "crash_state":
      return asset.crash_state;

    /* ------------------------------------------------------------------------
     * RFS support variables
     * ---------------------------------------------------------------------- */

    case "structure_score":
      return readRecordField(asset, "structure_score");

    case "market_score":
      return readRecordField(asset, "market_score");

    case "coherence_score":
      return readRecordField(asset, "coherence_score");

    case "occurrence_score":
      return readRecordField(asset, "occurrence_score");

    case "frequency_score":
      return readRecordField(asset, "frequency_score");

    case "convergence_score":
      return readRecordField(asset, "convergence_score");

    case "duration_score":
      return readRecordField(asset, "duration_score");

    case "evolution_score":
      return readRecordField(asset, "evolution_score");

    case "growth_score":
      return readRecordField(asset, "growth_score");

    /* ------------------------------------------------------------------------
     * Triple Layer
     * ---------------------------------------------------------------------- */

    case "growth_layer":
      return readFirstAvailableValue([
        readRecordField(asset, "growth_layer"),
        readRecordField(asset, "growth_layer_score"),
        readRecordField(asset, "growth_score"),
      ]);

    case "core_pattern_layer":
      return readFirstAvailableValue([
        readRecordField(asset, "core_pattern_layer"),
        readRecordField(asset, "core_pattern_score"),
      ]);

    case "decay_layer":
      return readFirstAvailableValue([
        readRecordField(asset, "decay_layer"),
        readRecordField(asset, "decay_score"),
      ]);

    /* ------------------------------------------------------------------------
     * Impulse Layer
     * ---------------------------------------------------------------------- */

    case "impulse_pressure_score":
      return asset.impulse_pressure_score;

    case "impulse_instability_score":
      return asset.impulse_instability_score;

    case "impulse_saturation_score":
      return asset.impulse_saturation_score;

    case "impulse_exhaustion_score":
      return asset.impulse_exhaustion_score;

    case "impulse_directional_bias":
      return asset.impulse_directional_bias;

    case "impulse_transition_state":
      return asset.impulse_transition_state;

    /* ------------------------------------------------------------------------
     * Analytical aggregation
     * ---------------------------------------------------------------------- */

    case "structural_context":
      return readRecordField(asset, "structural_context");

    case "transition_context":
      return readRecordField(asset, "transition_context");

    case "risk_context":
      return readRecordField(asset, "risk_context");

    case "temporal_context":
      return readRecordField(asset, "temporal_context");

    /* ------------------------------------------------------------------------
     * MCI private decision layer
     * ---------------------------------------------------------------------- */

    case "decision":
      return asset.decision;

    case "decision_score":
      return readFirstAvailableValue([
        readRecordField(asset, "decision_score"),
        readNestedRecordField(asset, ["decision_layer", "decision_score"]),
        readNestedRecordField(asset, ["mci", "decision_score"]),
      ]);

    case "confidence_score":
      return readRecordField(asset, "confidence_score");

    case "confidence_status":
      return readRecordField(asset, "confidence_status");

    case "opportunity_score":
      return readRecordField(asset, "opportunity_score");

    case "opportunity_status":
      return readRecordField(asset, "opportunity_status");

    case "decision_status":
      return readRecordField(asset, "decision_status");

    /* ------------------------------------------------------------------------
     * Calibration
     * ---------------------------------------------------------------------- */

    case "calibration_allow_threshold":
      return readFirstAvailableValue([
        readRecordField(asset, "calibration_allow_threshold"),
        readNestedRecordField(asset, ["calibration", "calibration_allow_threshold"]),
      ]);

    case "calibration_watch_threshold":
      return readFirstAvailableValue([
        readRecordField(asset, "calibration_watch_threshold"),
        readNestedRecordField(asset, ["calibration", "calibration_watch_threshold"]),
      ]);

    case "calibration_block_threshold":
      return readFirstAvailableValue([
        readRecordField(asset, "calibration_block_threshold"),
        readNestedRecordField(asset, ["calibration", "calibration_block_threshold"]),
      ]);

    /* ------------------------------------------------------------------------
     * Public projection / UI
     * ---------------------------------------------------------------------- */

    case "public_impulse_context":
      return readRecordField(asset, "public_impulse_context");

    case "public_structure_transition":
      return readRecordField(asset, "public_structure_transition");

    case "ui_stability_label":
      return readRecordField(asset, "ui_stability_label");

        default:
      return readRecordField(asset, input.variableName);
  }
}

function buildLineagePropagationTraces(
  asset: PrivateScanAsset,
): RuntimeTraceInput[] {
  const reference = buildAssetReference(asset);

  return listVariableLineageEntries().flatMap((entry) => {
    const value = readAssetVariableValue({
      asset,
      variableName: entry.variable_name,
    });

    return entry.propagation_path.map((layer) =>
      trace({
        variable_name: entry.variable_name,
        layer,
        value,
        source: "governance",
        reference,
        reason: isPresent(value)
          ? "lineage_propagation_observed"
          : "lineage_value_unavailable",
      }),
    );
  });
}

/* ============================================================================
 * 6. TRACE BUILDERS — PUBLIC ENTRY
 * ========================================================================== */

export function buildPrivateAssetTraces(
  asset: PrivateScanAsset,
): RuntimeTraceInput[] {
  return [
    ...buildRfsTraces(asset),
    ...buildTripleLayerTraces(asset),
    ...buildImpulseLayerTraces(asset),
    ...buildCrashSystemTraces(asset),
    ...buildMciTraces(asset),
    ...buildCalibrationTraces(asset),
    ...buildLineagePropagationTraces(asset),
  ];
}

function buildPrivateAssetsTraces(
  assets: readonly PrivateScanAsset[],
): RuntimeTraceInput[] {
  return assets.flatMap(buildPrivateAssetTraces);
}

/* ============================================================================
 * 7. STATUS RESOLUTION
 * ========================================================================== */

function resolveGovernorStatus(
  governance: GovernanceRuntimeState,
): TraceabilityGovernorStatus {
  if (governance.status === "READY") return "governed";
  if (governance.status === "DEGRADED") return "degraded";
  if (governance.status === "BLOCKED") return "blocked";

  return "invalid";
}

/* ============================================================================
 * 8. PUBLIC GOVERNOR API
 * ========================================================================== */

export function buildTraceabilityGovernorResult(input: {
  assets: readonly PrivateScanAsset[];
}): TraceabilityGovernorResult {
  if (!Array.isArray(input.assets) || input.assets.length === 0) {
    const governance = buildGovernanceRuntimeState({
      traces: [],
    });

    return {
      ok: true,
      status: "empty",
      asset_count: 0,
      trace_count: 0,
      governance,
      warnings: ["traceability_governor_assets_empty"],
      error: null,
    };
  }

  const traces = buildPrivateAssetsTraces(input.assets);

  const governance = buildGovernanceRuntimeState({
    traces,
  });

  const warnings = uniqueWarnings(
    !governance.ok
      ? [`traceability_governor_${governance.status.toLowerCase()}`]
      : [],
    governance.warnings,
  );

  return {
    ok: governance.ok,
    status: resolveGovernorStatus(governance),
    asset_count: input.assets.length,
    trace_count: traces.length,
    governance,
    warnings,
    error: governance.error,
  };
}

export function assertTraceabilityGoverned(input: {
  assets: readonly PrivateScanAsset[];
}): void {
  const result = buildTraceabilityGovernorResult(input);

  if (!result.ok) {
    throw new Error(
      `traceability_governor_failed:${[
        result.status,
        result.error ?? "unknown_error",
      ].join(":")}`,
    );
  }
}
