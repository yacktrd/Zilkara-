/* ============================================================================
 * FILE: lib/xyvala/stores/traceability-store-orchestrator.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private traceability store orchestrator
 *
 * ROLE
 * - orchestrate private traceability writes from already computed scan assets
 * - record detection, structural analytics and lifecycle traces
 * - build runtime propagation observations from existing private assets
 * - keep traceability stores private, auditable and isolated from public layers
 *
 * PARENT FILES
 * - lib/xyvala/contracts/scan-private-contract.ts
 * - lib/xyvala/stores/detection-store.ts
 * - lib/xyvala/stores/structural-analytics-store.ts
 * - lib/xyvala/services/transition-lifecycle-service.ts
 * - lib/xyvala/governance/governance-runtime.ts
 * - lib/xyvala/governance/runtime-traceability.ts
 *
 * DIRECTIVES
 * - private MUTATE orchestration only
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration computation
 * - no lifecycle inference outside transition-lifecycle-service
 * - no performance computation
 * - no public API response building
 * - no UI logic
 * - no public snapshot exposure
 * - traceability stores remain strictly private
 * - record only already produced values
 * - runtime traces observe existing propagated values only
 * - null means explicitly unavailable
 * - undefined must never be stored
 *
 * INPUTS
 * - PrivateScanAsset[]
 * - optional runtime traces from upstream/downstream controlled boundaries
 *
 * OUTPUTS
 * - TraceabilityWriteResult
 *
 * INVARIANTS
 * - detection store receives observable detection data
 * - structural analytics store receives private analytical data
 * - lifecycle store receives transition lifecycle data
 * - governance runtime receives non-empty trace observations when assets exist
 * - orchestrator does not create analytical truth
 * - failed writes are reported, not hidden
 *
 * CRITICAL DEPENDENCIES
 * - PrivateScanAsset
 * - detection-store.ts
 * - structural-analytics-store.ts
 * - transition-lifecycle-service.ts
 * - governance-runtime.ts
 * - runtime-traceability.ts
 *
 * SENSITIVE ZONES
 * - private analytical fields
 * - decision leakage
 * - public/private boundary
 * - runtime governance diagnostics
 * - future persistence migration
 * ========================================================================== */

import type { PrivateScanAsset } from "@/lib/xyvala/contracts/scan-private-contract";

import {
  buildGovernanceRuntimeState,
} from "@/lib/xyvala/governance/governance-runtime";

import type {
  RuntimeTraceInput,
} from "@/lib/xyvala/governance/runtime-traceability";

import {
  recordDetection,
  getDetectionStoreSnapshot,
  type DetectionStoreWriteResult,
} from "@/lib/xyvala/stores/detection-store";

import {
  recordStructuralAnalytics,
  getStructuralAnalyticsStoreSnapshot,
  type StructuralAnalyticsWriteResult,
} from "@/lib/xyvala/stores/structural-analytics-store";

import {
  getTransitionLifecycleStoreSnapshot,
} from "@/lib/xyvala/stores/transition-lifecycle-store";

import {
  recordOrUpdateTransitionLifecycle,
  type TransitionLifecycleServiceResult,
} from "@/lib/xyvala/services/transition-lifecycle-service";

import {
  getPerformanceStoreSnapshot,
} from "@/lib/xyvala/stores/performance-store";

import {
  getCalibrationStoreSnapshot,
} from "@/lib/xyvala/stores/calibration-store";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type TraceabilityWriteStatus =
  | "recorded"
  | "partial"
  | "invalid"
  | "empty";

export type TraceabilityWriteItem = {
  asset_id: string;
  symbol: string;

  detection: DetectionStoreWriteResult;
  structural_analytics: StructuralAnalyticsWriteResult;
  transition_lifecycle: TransitionLifecycleServiceResult;
};

export type TraceabilityWriteResult = {
  ok: boolean;
  status: TraceabilityWriteStatus;
  count: number;
  recorded_count: number;
  partial_count: number;
  invalid_count: number;
  items: TraceabilityWriteItem[];
  warnings: string[];
};

export type TraceabilityRecordScanInput = {
  assets: readonly PrivateScanAsset[];
  snapshot_version: string;
  analytical_version?: string;
  detected_at?: string;

  /**
   * Optional controlled traces from upstream/downstream boundaries.
   *
   * This field allows services/routes to provide additional propagation
   * observations without forcing this private MUTATE orchestrator to invent
   * public API or interface traces.
   */
  runtime_traces?: readonly RuntimeTraceInput[];
};

/* ============================================================================
 * 2. SNAPSHOT API
 * ========================================================================== */

export function getTraceabilityStoreSnapshot() {
  return {
    detection_store: getDetectionStoreSnapshot(),
    structural_analytics_store: getStructuralAnalyticsStoreSnapshot(),
    transition_lifecycle_store: getTransitionLifecycleStoreSnapshot(),
    performance_store: getPerformanceStoreSnapshot(),
    calibration_store: getCalibrationStoreSnapshot(),
  };
}

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function isDevelopment(): boolean {
  return process.env.NODE_ENV !== "production";
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function normalizeIsoDate(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? fallback
    : parsed.toISOString();
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

function resolveAnalyticalVersion(input: {
  asset: PrivateScanAsset;
  fallback: string | undefined;
}): string {
  return safeString(
    input.asset.governance?.analytical_version,
    safeString(input.fallback, "unknown"),
  );
}

function resolveDetectedAt(input: {
  asset: PrivateScanAsset;
  fallback: string;
}): string {
  return normalizeIsoDate(
    input.asset.governance?.generated_at,
    input.fallback,
  );
}

/* ============================================================================
 * 4. RUNTIME TRACE HELPERS
 * ==========================================================================
 *
 * ROLE
 * - build runtime propagation observations from already computed private assets
 * - observe existing private analytical values only
 * - provide governance runtime with factual trace inputs
 *
 * DIRECTIVES
 * - observe only
 * - no analytical computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no analytical aggregation computation
 * - no calibration computation
 * - no public API trace fabrication
 * - no interface trace fabrication
 * - no reconstruction of missing values
 * - null means explicitly unavailable
 * - undefined must never be traced
 *
 * INVARIANTS
 * - traces prove observed values at their real producer layer
 * - traces never create analytical truth
 * - downstream propagation must be provided by the real downstream layer
 * - aggregated contexts must be produced by the Analytical Aggregation System
 *   before they can be traced here
 * ========================================================================== */

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined;
}

function trace(input: {
  variable_name: string;
  layer: RuntimeTraceInput["layer"];
  source: RuntimeTraceInput["source"];
  reference: string;
  reason?: string | null;
}): RuntimeTraceInput {
  return {
    variable_name: input.variable_name,
    layer: input.layer,
    status: "observed",
    source: input.source,
    reference: input.reference,
    reason: input.reason ?? null,
  };
}

function appendTraceIfValue(
  traces: RuntimeTraceInput[],
  input: {
    value: unknown;
    variable_name: string;
    layer: RuntimeTraceInput["layer"];
    source: RuntimeTraceInput["source"];
    reference: string;
  },
): void {
  if (!hasValue(input.value)) return;

  traces.push(
    trace({
      variable_name: input.variable_name,
      layer: input.layer,
      source: input.source,
      reference: input.reference,
    }),
  );
}

function buildRuntimeTracesFromAssets(
  assets: readonly PrivateScanAsset[],
): RuntimeTraceInput[] {
  const traces: RuntimeTraceInput[] = [];

  for (const asset of assets) {
    const reference = safeString(asset.id, asset.symbol);

    appendTraceIfValue(traces, {
      value: asset.stability_score,
      variable_name: "stability_score",
      layer: "RFS",
      source: "engine",
      reference,
    });

    appendTraceIfValue(traces, {
      value: asset.regime,
      variable_name: "regime",
      layer: "RFS",
      source: "engine",
      reference,
    });

    appendTraceIfValue(traces, {
      value: asset.rupture_score,
      variable_name: "rupture_score",
      layer: "RFS",
      source: "engine",
      reference,
    });

    appendTraceIfValue(traces, {
      value: asset.rupture_probability,
      variable_name: "rupture_probability",
      layer: "RFS",
      source: "engine",
      reference,
    });

    appendTraceIfValue(traces, {
      value: asset.continuity_probability,
      variable_name: "continuity_probability",
      layer: "RFS",
      source: "engine",
      reference,
    });

    appendTraceIfValue(traces, {
      value: asset.growth_score,
      variable_name: "growth_layer",
      layer: "TRIPLE_LAYER",
      source: "engine",
      reference,
    });

    appendTraceIfValue(traces, {
      value: asset.core_pattern_score,
      variable_name: "core_pattern_layer",
      layer: "TRIPLE_LAYER",
      source: "engine",
      reference,
    });

    appendTraceIfValue(traces, {
      value: asset.decay_score,
      variable_name: "decay_layer",
      layer: "TRIPLE_LAYER",
      source: "engine",
      reference,
    });

    appendTraceIfValue(traces, {
      value: asset.impulse_pressure_score,
      variable_name: "impulse_pressure_score",
      layer: "IMPULSE_LAYER",
      source: "engine",
      reference,
    });

    appendTraceIfValue(traces, {
      value: asset.impulse_instability_score,
      variable_name: "impulse_instability_score",
      layer: "IMPULSE_LAYER",
      source: "engine",
      reference,
    });

    appendTraceIfValue(traces, {
      value: asset.impulse_saturation_score,
      variable_name: "impulse_saturation_score",
      layer: "IMPULSE_LAYER",
      source: "engine",
      reference,
    });

    appendTraceIfValue(traces, {
      value: asset.impulse_exhaustion_score,
      variable_name: "impulse_exhaustion_score",
      layer: "IMPULSE_LAYER",
      source: "engine",
      reference,
    });

    appendTraceIfValue(traces, {
      value: asset.impulse_directional_bias,
      variable_name: "impulse_directional_bias",
      layer: "IMPULSE_LAYER",
      source: "engine",
      reference,
    });

    appendTraceIfValue(traces, {
      value: asset.impulse_transition_state,
      variable_name: "impulse_transition_state",
      layer: "IMPULSE_LAYER",
      source: "engine",
      reference,
    });

    appendTraceIfValue(traces, {
      value: asset.crash_score,
      variable_name: "crash_score",
      layer: "CRASH_SYSTEM",
      source: "engine",
      reference,
    });

    appendTraceIfValue(traces, {
      value: asset.crash_state,
      variable_name: "crash_state",
      layer: "CRASH_SYSTEM",
      source: "engine",
      reference,
    });

    appendTraceIfValue(traces, {
      value: asset.decision,
      variable_name: "decision",
      layer: "MCI",
      source: "engine",
      reference,
    });
  }

  return traces;
}

/* ============================================================================
 * 5. RECORD HELPERS
 * ========================================================================== */

function recordTraceabilityItem(input: {
  asset: PrivateScanAsset;
  snapshot_version: string;
  analytical_version: string;
  detected_at: string;
}): TraceabilityWriteItem {
  const asset = input.asset;

  const detection = recordDetection({
    asset_id: asset.id,
    symbol: asset.symbol,
    name: asset.name,

    detected_at: input.detected_at,
    quote: asset.quote,

    snapshot_version: input.snapshot_version,
    analytical_version: input.analytical_version,

    source: asset.governance?.source ?? "scan",

    rank: asset.rank,

    price: asset.price,
    market_cap: asset.market_cap,
    volume_24h: asset.volume_24h,

    chg_24h_pct: asset.chg_24h_pct,
    chg_7d_pct: asset.chg_7d_pct,

    public_activity: null,
    public_structure_transition: null,
    public_impulse_context: null,
  });

  const structuralAnalytics = recordStructuralAnalytics({
    detection_id: detection.record?.detection_id ?? "",

    asset_id: asset.id,
    symbol: asset.symbol,

    snapshot_version: input.snapshot_version,
    analytical_version: input.analytical_version,
    recorded_at: input.detected_at,

    stability_score: asset.stability_score,
    stability_status: asset.stability_status,

    structure_score: asset.structure_score,
    market_score: asset.market_score,
    coherence_score: asset.coherence_score,

    occurrence_score: asset.occurrence_score,
    frequency_score: asset.frequency_score,
    convergence_score: asset.convergence_score,
    duration_score: asset.duration_score,
    evolution_score: asset.evolution_score,

    regime: asset.regime,

    rupture_score: asset.rupture_score,
    rupture_probability: asset.rupture_probability,
    rupture_penalty_score: asset.rupture_penalty_score,

    rupture_occurrence_score: asset.rupture_occurrence_score,
    rupture_frequency_score: asset.rupture_frequency_score,
    rupture_convergence_score: asset.rupture_convergence_score,
    rupture_duration_score: asset.rupture_duration_score,

    rupture_evolution_score: asset.rupture_evolution_score,
    rupture_evolution_state: asset.rupture_evolution_state,
    rupture_acceleration_score: asset.rupture_acceleration_score,

    crash_score: asset.crash_score,
    crash_state: asset.crash_state,

    continuity_probability: asset.continuity_probability,

    triple_layer_state: asset.state,
    growth_score: asset.growth_score,
    core_pattern_score: asset.core_pattern_score,
    decay_score: asset.decay_score,
    growth_status: asset.growth_status,
    core_status: asset.core_status,
    decay_status: asset.decay_status,

    impulse_pressure_score: asset.impulse_pressure_score,
    impulse_instability_score: asset.impulse_instability_score,
    impulse_saturation_score: asset.impulse_saturation_score,
    impulse_exhaustion_score: asset.impulse_exhaustion_score,
    impulse_directional_bias: asset.impulse_directional_bias,
    impulse_transition_state: asset.impulse_transition_state,
    impulse_status: asset.impulse_status,

    neutralized: asset.neutralized,
    neutralization_reason: asset.neutralization_reason,
    neutralization_severity: asset.neutralization_severity,
    neutralization_validity: asset.neutralization_validity,

    decision: asset.decision,
    decision_score: null,

    opportunity_score: asset.opportunity_score,
    opportunity_status: asset.opportunity_status,

    confidence_score: asset.confidence_score,
    confidence_status: asset.confidence_status,

    decision_status: asset.decision_status,
  });

  const lifecycle = recordOrUpdateTransitionLifecycle({
    asset,
    detection_id: detection.record?.detection_id ?? "",
    detected_at: input.detected_at,
    snapshot_version: input.snapshot_version,
    analytical_version: input.analytical_version,
  });

  if (isDevelopment()) {
    console.log("XYVALA_TRACEABILITY_ITEM_AUDIT", {
      symbol: asset.symbol,
      asset_stability: asset.stability_score,
      stored_stability: structuralAnalytics.record?.stability_score,
      asset_structure: asset.structure_score,
      stored_structure: structuralAnalytics.record?.structure_score,
      lifecycle_status: lifecycle.status,
      lifecycle_transition_id: lifecycle.transition_id,
    });
  }

  return {
    asset_id: asset.id,
    symbol: asset.symbol,
    detection,
    structural_analytics: structuralAnalytics,
    transition_lifecycle: lifecycle,
  };
}

/* ============================================================================
 * 6. WRITE COUNT HELPERS
 * ========================================================================== */

function isLifecycleOk(
  lifecycle: TransitionLifecycleServiceResult,
): boolean {
  return lifecycle.ok || lifecycle.status === "skipped";
}

function countInvalidItems(items: readonly TraceabilityWriteItem[]): number {
  return items.filter(
    (item) =>
      !item.detection.ok ||
      !item.structural_analytics.ok ||
      !isLifecycleOk(item.transition_lifecycle),
  ).length;
}

function countPartialItems(items: readonly TraceabilityWriteItem[]): number {
  return items.filter((item) => {
    const states = [
      item.detection.ok,
      item.structural_analytics.ok,
      isLifecycleOk(item.transition_lifecycle),
    ];

    return states.some(Boolean) && !states.every(Boolean);
  }).length;
}

function countRecordedItems(items: readonly TraceabilityWriteItem[]): number {
  return items.filter(
    (item) =>
      item.detection.ok &&
      item.structural_analytics.ok &&
      isLifecycleOk(item.transition_lifecycle) &&
      item.detection.status === "recorded" &&
      item.structural_analytics.status === "recorded" &&
      ["recorded", "updated", "skipped"].includes(
        item.transition_lifecycle.status,
      ),
  ).length;
}

function resolveWriteStatus(input: {
  invalid_count: number;
  partial_count: number;
  governance_runtime_ok: boolean;
}): TraceabilityWriteStatus {
  if (input.invalid_count > 0) return "invalid";

  if (
    input.partial_count > 0 ||
    !input.governance_runtime_ok
  ) {
    return "partial";
  }

  return "recorded";
}

/* ============================================================================
 * 7. PRIVATE ORCHESTRATION API
 * ========================================================================== */

export function recordScanTraceability(
  input: TraceabilityRecordScanInput,
): TraceabilityWriteResult {
  if (!Array.isArray(input.assets) || input.assets.length === 0) {
    return {
      ok: true,
      status: "empty",
      count: 0,
      recorded_count: 0,
      partial_count: 0,
      invalid_count: 0,
      items: [],
      warnings: ["traceability_assets_empty"],
    };
  }

  const fallbackDetectedAt = normalizeIsoDate(
    input.detected_at,
    nowIso(),
  );

  const snapshotVersion = safeString(
    input.snapshot_version,
    "unknown",
  );

  const items = input.assets.map((asset) =>
    recordTraceabilityItem({
      asset,
      snapshot_version: snapshotVersion,
      analytical_version: resolveAnalyticalVersion({
        asset,
        fallback: input.analytical_version,
      }),
      detected_at: resolveDetectedAt({
        asset,
        fallback: fallbackDetectedAt,
      }),
    }),
  );

  const invalidCount = countInvalidItems(items);
  const partialCount = countPartialItems(items);
  const recordedCount = countRecordedItems(items);

  const runtimeTraces = [
    ...buildRuntimeTracesFromAssets(input.assets),
    ...(Array.isArray(input.runtime_traces)
      ? input.runtime_traces
      : []),
  ];

    console.log("XYVALA_RUNTIME_TRACES", {
  count: runtimeTraces.length,
  sample: runtimeTraces.slice(0, 10),
});

  const governanceRuntime = buildGovernanceRuntimeState({
    traces: runtimeTraces,
  });

  if (isDevelopment()) {
    console.log("XYVALA_GOVERNANCE_RUNTIME_AUDIT", {
      ok: governanceRuntime.ok,
      status: governanceRuntime.status,
      error: governanceRuntime.error,
      warnings: governanceRuntime.warnings,
      trace_count: governanceRuntime.health.traceability.reason,
      health_status: governanceRuntime.health.status,
      health_severity: governanceRuntime.health.severity,
      health_reason: governanceRuntime.health.reason,
      compliance: governanceRuntime.health.compliance,
      lineage: governanceRuntime.health.lineage,
      boundary: governanceRuntime.health.boundary,
      propagation: governanceRuntime.health.propagation,
      divergence: governanceRuntime.health.divergence,
      traceability: governanceRuntime.health.traceability,
    });
  }

  const warnings = uniqueWarnings(
    invalidCount > 0
      ? [`traceability_invalid_count:${invalidCount}`]
      : [],
    partialCount > 0
      ? [`traceability_partial_count:${partialCount}`]
      : [],
    !governanceRuntime.ok
      ? [`governance_runtime_${governanceRuntime.status.toLowerCase()}`]
      : [],
    governanceRuntime.warnings,
  );

  return {
    ok: invalidCount === 0,
    status: resolveWriteStatus({
      invalid_count: invalidCount,
      partial_count: partialCount,
      governance_runtime_ok: governanceRuntime.ok,
    }),
    count: items.length,
    recorded_count: recordedCount,
    partial_count: partialCount,
    invalid_count: invalidCount,
    items,
    warnings,
  };
}

