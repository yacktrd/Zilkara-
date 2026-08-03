/* ============================================================================
 * FILE: lib/xyvala/stores/traceability-store-orchestrator.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical private traceability store orchestrator
 *
 * ROLE
 * - validate canonical private traceability write inputs
 * - orchestrate private traceability writes from already-computed scan assets
 * - record detection, structural analytics and transition lifecycle traces
 * - build factual runtime propagation observations from private assets
 * - report the first invalid persistence boundary without rewriting truth
 *
 * CLASSIFICATION
 * - PRIVATE
 * - MUTATE ORCHESTRATOR
 * - VALIDATE / OBSERVE / MUTATE
 * - DETERMINISTIC FOR IDENTICAL INPUTS AND STORE STATE
 * - NO ANALYTICAL COMPUTE
 * - NO PUBLIC PROJECTION
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
 * - Private Contract Adaptation
 * - Private Traceability Observation
 * - Private Traceability Persistence
 * - Private/Public Transformer
 * - Rankings
 * - API
 * - Interface
 *
 * PARENTS
 * - lib/xyvala/contracts/scan-private-contract.ts
 * - lib/xyvala/stores/detection-store.ts
 * - lib/xyvala/stores/structural-analytics-store.ts
 * - lib/xyvala/services/transition-lifecycle-service.ts
 * - lib/xyvala/governance/governance-runtime.ts
 * - lib/xyvala/governance/runtime-traceability.ts
 *
 * CONSUMERS
 * - lib/xyvala/services/raw-assets-service.ts
 * - private traceability diagnostics
 * - private governance diagnostics
 *
 * DIRECTIVES
 * - private traceability persistence only
 * - no RFS recomputation
 * - no Triple Layer recomputation
 * - no Impulse Layer recomputation
 * - no Analytical Aggregation recomputation
 * - no MCI recomputation
 * - no calibration computation
 * - no lifecycle inference outside transition-lifecycle-service
 * - no public API response construction
 * - no UI logic
 * - no public snapshot exposure
 * - no private-to-public transformation
 * - no local clock access
 * - no timestamp generation
 * - no synthetic analytical version
 * - no synthetic snapshot version
 * - no synthetic provenance
 * - no unavailable-to-zero conversion
 * - no unavailable-to-neutral conversion
 * - no private decision suppression
 * - no temporary diagnostic logging
 * - null means explicitly unavailable
 * - undefined must never be stored
 *
 * INPUTS
 * - canonical PrivateScanAsset[]
 * - canonical snapshot version
 * - optional canonical analytical version fallback
 * - optional canonical detected_at fallback
 * - optional controlled runtime traces
 *
 * OUTPUTS
 * - TraceabilityWriteResult
 *
 * OWNERSHIP
 * - detection store owns observable detection persistence
 * - structural analytics store owns private analytical persistence
 * - transition lifecycle service owns lifecycle mutation
 * - governance runtime owns propagation observation qualification
 * - this orchestrator owns execution order and persistence reporting only
 *
 * INVARIANTS
 * - every write uses upstream canonical timestamps only
 * - every write uses upstream canonical versions only
 * - already-computed private values are propagated without replacement
 * - decision_score is never discarded when available
 * - trace observations never prove an unobserved downstream boundary
 * - persistence failure never changes analytical truth
 * - warnings are deterministic, deduplicated and ordered
 * - identical valid inputs produce identical write ordering
 * - status and ok remain semantically aligned
 *
 * FIRST DIVERGENCE
 * - invalid input collection
 *   => traceability_assets_invalid
 *
 * - empty input collection
 *   => traceability_assets_empty
 *
 * - invalid snapshot version
 *   => traceability_snapshot_version_invalid
 *
 * - invalid asset identity
 *   => traceability_asset_identity_invalid
 *
 * - missing analytical version
 *   => traceability_analytical_version_invalid
 *
 * - missing canonical timestamp
 *   => traceability_detected_at_invalid
 *
 * - detection write failure
 *   => detection store result
 *
 * - structural analytics write failure
 *   => structural analytics store result
 *
 * - lifecycle write failure
 *   => transition lifecycle service result
 *
 * - governance observation failure
 *   => governance runtime result
 *
 * SENSITIVE ZONES
 * - canonical metadata
 * - private analytical fields
 * - decision propagation
 * - runtime lineage
 * - mutation ordering
 * - write-status aggregation
 * ========================================================================== */

import type {
  PrivateScanAsset,
} from "@/lib/xyvala/contracts/scan-private-contract";

import {
  buildGovernanceRuntimeState,
} from "@/lib/xyvala/governance/governance-runtime";

import type {
  RuntimeTraceInput,
} from "@/lib/xyvala/governance/runtime-traceability";

import {
  CANONICAL_SCAN_REBUILD_SCOPE,
} from "@/lib/xyvala/governance/runtime-observation-scopes";

import {
  getDetectionStoreSnapshot,
  recordDetection,
  type DetectionStoreWriteResult,
} from "@/lib/xyvala/stores/detection-store";

import {
  getStructuralAnalyticsStoreSnapshot,
  recordStructuralAnalytics,
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
 * 1. VERSION
 * ========================================================================== */

export const TRACEABILITY_STORE_ORCHESTRATOR_VERSION =
  "2.0.0" as const;

/* ============================================================================
 * 2. PUBLIC TYPES
 * ========================================================================== */

export type TraceabilityWriteStatus =
  | "recorded"
  | "partial"
  | "invalid"
  | "empty";

export type TraceabilityWriteItem = {
  asset_id: string;
  symbol: string;

  detection:
    DetectionStoreWriteResult;

  structural_analytics:
    StructuralAnalyticsWriteResult;

  transition_lifecycle:
    TransitionLifecycleServiceResult;
};

export type TraceabilityWriteResult = {
  ok: boolean;

  status:
    TraceabilityWriteStatus;

  count: number;
  recorded_count: number;
  partial_count: number;
  invalid_count: number;

  items:
    TraceabilityWriteItem[];

  warnings:
    string[];
};

export type TraceabilityRecordScanInput = {
  assets:
    readonly PrivateScanAsset[];

  snapshot_version:
    string;

  /**
   * Controlled fallback only.
   *
   * The asset governance analytical version remains the preferred source.
   * No synthetic version is generated when both are unavailable.
   */
  analytical_version?:
    string;

  /**
   * Controlled fallback only.
   *
   * The asset governance generated_at remains the preferred source.
   * No local timestamp is generated when both are unavailable.
   */
  detected_at?:
    string;

  /**
   * Optional controlled observations emitted by actual upstream or downstream
   * boundaries.
   *
   * The orchestrator does not invent API, interface, snapshot or calibration
   * propagation observations.
   */
  runtime_traces?:
    readonly RuntimeTraceInput[];
};

/* ============================================================================
 * 3. INTERNAL TYPES
 * ========================================================================== */

type PreparedTraceabilityAsset = {
  asset:
    PrivateScanAsset;

  analytical_version:
    string;

  detected_at:
    string;
};

type PreparationFailureReason =
  | "asset_identity_invalid"
  | "analytical_version_invalid"
  | "detected_at_invalid";

type PreparationFailure = {
  index: number;
  asset_id: string | null;
  symbol: string | null;
  reason: PreparationFailureReason;
};

type PreparationResult = {
  prepared:
    PreparedTraceabilityAsset[];

  failures:
    PreparationFailure[];
};

/* ============================================================================
 * 4. SNAPSHOT READ API
 * ----------------------------------------------------------------------------
 * This function reads existing private store state.
 *
 * It does not:
 * - compute analytics
 * - mutate stores
 * - project publicly
 * ========================================================================== */

export function getTraceabilityStoreSnapshot() {
  return {
    detection_store:
      getDetectionStoreSnapshot(),

    structural_analytics_store:
      getStructuralAnalyticsStoreSnapshot(),

    transition_lifecycle_store:
      getTransitionLifecycleStoreSnapshot(),

    performance_store:
      getPerformanceStoreSnapshot(),

    calibration_store:
      getCalibrationStoreSnapshot(),
  };
}

/* ============================================================================
 * 5. SAFE PRIMITIVE HELPERS
 * ========================================================================== */

function normalizeRequiredString(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value.trim();

  return normalized.length > 0
    ? normalized
    : null;
}

function normalizeIsoDate(
  value: unknown,
): string | null {
  const normalized =
    normalizeRequiredString(
      value,
    );

  if (normalized === null) {
    return null;
  }

  const timestamp =
    Date.parse(normalized);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp)
    .toISOString();
}

function compareDeterministicStrings(
  left: string,
  right: string,
): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function uniqueWarnings(
  ...groups: Array<
    readonly string[] |
    undefined |
    null
  >
): string[] {
  const normalized =
    groups
      .flatMap((group) =>
        Array.isArray(group)
          ? group
          : [],
      )
      .filter(
        (warning): warning is string =>
          typeof warning === "string",
      )
      .map((warning) =>
        warning.trim(),
      )
      .filter(
        (warning) =>
          warning.length > 0,
      );

  return [
    ...new Set(normalized),
  ].sort(
    compareDeterministicStrings,
  );
}

/* ============================================================================
 * 6. CANONICAL METADATA RESOLUTION
 * ----------------------------------------------------------------------------
 * Preferred ownership:
 *
 * - analytical_version
 *   <- asset.governance.analytical_version
 *
 * - detected_at
 *   <- asset.governance.generated_at
 *
 * Controlled input fallbacks are accepted only when the canonical asset
 * governance value is unavailable.
 *
 * No local or synthetic replacement is authorised.
 * ========================================================================== */

function resolveAnalyticalVersion(input: {
  asset:
    PrivateScanAsset;

  fallback:
    string | undefined;
}): string | null {
  return (
    normalizeRequiredString(
      input.asset
        .governance
        .analytical_version,
    ) ??
    normalizeRequiredString(
      input.fallback,
    )
  );
}

function resolveDetectedAt(input: {
  asset:
    PrivateScanAsset;

  fallback:
    string | undefined;
}): string | null {
  return (
    normalizeIsoDate(
      input.asset
        .governance
        .generated_at,
    ) ??
    normalizeIsoDate(
      input.fallback,
    )
  );
}

function resolveAssetReference(
  asset:
    PrivateScanAsset,
): string | null {
  return (
    normalizeRequiredString(
      asset.id,
    ) ??
    normalizeRequiredString(
      asset.symbol,
    )
  );
}

/* ============================================================================
 * 7. INPUT PREPARATION
 * ----------------------------------------------------------------------------
 * Preparation validates persistence metadata only.
 *
 * It does not:
 * - repair analytical values
 * - repair identity
 * - rewrite metadata
 * - mutate stores
 * ========================================================================== */

function prepareTraceabilityAssets(input: {
  assets:
    readonly PrivateScanAsset[];

  analytical_version:
    string | undefined;

  detected_at:
    string | undefined;
}): PreparationResult {
  const prepared:
    PreparedTraceabilityAsset[] = [];

  const failures:
    PreparationFailure[] = [];

  for (
    let index = 0;
    index < input.assets.length;
    index += 1
  ) {
    const asset =
      input.assets[index];

    if (!asset) {
      failures.push({
        index,
        asset_id:
          null,

        symbol:
          null,

        reason:
          "asset_identity_invalid",
      });

      continue;
    }

    const assetId =
      normalizeRequiredString(
        asset.id,
      );

    const symbol =
      normalizeRequiredString(
        asset.symbol,
      );

    if (
      assetId === null ||
      symbol === null
    ) {
      failures.push({
        index,
        asset_id:
          assetId,

        symbol,

        reason:
          "asset_identity_invalid",
      });

      continue;
    }

    const analyticalVersion =
      resolveAnalyticalVersion({
        asset,
        fallback:
          input.analytical_version,
      });

    if (analyticalVersion === null) {
      failures.push({
        index,
        asset_id:
          assetId,

        symbol,

        reason:
          "analytical_version_invalid",
      });

      continue;
    }

    const detectedAt =
      resolveDetectedAt({
        asset,
        fallback:
          input.detected_at,
      });

    if (detectedAt === null) {
      failures.push({
        index,
        asset_id:
          assetId,

        symbol,

        reason:
          "detected_at_invalid",
      });

      continue;
    }

    prepared.push({
      asset,

      analytical_version:
        analyticalVersion,

      detected_at:
        detectedAt,
    });
  }

  return {
    prepared,
    failures,
  };
}

function buildPreparationWarnings(
  failures:
    readonly PreparationFailure[],
): string[] {
  if (failures.length === 0) {
    return [];
  }

  const counts =
    new Map<
      PreparationFailureReason,
      number
    >();

  for (const failure of failures) {
    counts.set(
      failure.reason,
      (
        counts.get(
          failure.reason,
        ) ??
        0
      ) + 1,
    );
  }

  const warnings: string[] = [
    `traceability_preparation_invalid_count:${failures.length}`,
  ];

  const sortedCounts =
    [
      ...counts.entries(),
    ].sort(
      (
        [left],
        [right],
      ) =>
        compareDeterministicStrings(
          left,
          right,
        ),
    );

  for (
    const [
      reason,
      count,
    ] of sortedCounts
  ) {
    warnings.push(
      `traceability_preparation_failure:${reason}:${count}`,
    );
  }

  const firstFailure =
    failures[0];

  if (firstFailure) {
    warnings.push(
      `traceability_first_invalid_index:${firstFailure.index}`,
    );

    if (firstFailure.asset_id) {
      warnings.push(
        `traceability_first_invalid_asset:${firstFailure.asset_id}`,
      );
    }
  }

  return warnings;
}

/* ============================================================================
 * 8. RUNTIME TRACE HELPERS
 * ----------------------------------------------------------------------------
 * Runtime traces observe values already present in PrivateScanAsset.
 *
 * They do not:
 * - recompute values
 * - infer analytical truth
 * - fabricate downstream propagation
 * - fabricate public exposure
 * ========================================================================== */

function hasTraceableValue(
  value: unknown,
): boolean {
  return (
    value !== null &&
    value !== undefined
  );
}

function buildRuntimeTraceKey(
  trace:
    RuntimeTraceInput,
): string {
  return [
    trace.variable_name,
    trace.layer,
    trace.source,
    trace.reference,
    trace.status,
    trace.reason ?? "",
  ].join("|");
}

function compareRuntimeTraces(
  left:
    RuntimeTraceInput,

  right:
    RuntimeTraceInput,
): number {
  return compareDeterministicStrings(
    buildRuntimeTraceKey(left),
    buildRuntimeTraceKey(right),
  );
}

function uniqueRuntimeTraces(
  traces:
    readonly RuntimeTraceInput[],
): RuntimeTraceInput[] {
  const traceByKey =
    new Map<
      string,
      RuntimeTraceInput
    >();

  for (const trace of traces) {
    const key =
      buildRuntimeTraceKey(
        trace,
      );

    if (!traceByKey.has(key)) {
      traceByKey.set(
        key,
        trace,
      );
    }
  }

  return [
    ...traceByKey.values(),
  ].sort(
    compareRuntimeTraces,
  );
}

function appendRuntimeTraceIfPresent(
  traces:
    RuntimeTraceInput[],

  input: {
    value:
      unknown;

    variableName:
      string;

    layer:
      RuntimeTraceInput["layer"];

    source:
      RuntimeTraceInput["source"];

    reference:
      string;
  },
): void {
  if (
    !hasTraceableValue(
      input.value,
    )
  ) {
    return;
  }

  traces.push({
    variable_name:
      input.variableName,

    layer:
      input.layer,

    status:
      "observed",

    source:
      input.source,

    reference:
      input.reference,

    reason:
      null,
  });
}

/* ============================================================================
 * 9. RFS TRACE OBSERVATION
 * ========================================================================== */

function appendRfsRuntimeTraces(
  traces:
    RuntimeTraceInput[],

  asset:
    PrivateScanAsset,

  reference:
    string,
): void {
  const layer:
    RuntimeTraceInput["layer"] =
      "RFS";

  const source:
    RuntimeTraceInput["source"] =
      "engine";

  const values:
    ReadonlyArray<
      readonly [
        string,
        unknown,
      ]
    > = [
      [
        "stability_score",
        asset.stability_score,
      ],
      [
        "stability_status",
        asset.stability_status,
      ],
      [
        "structure_score",
        asset.structure_score,
      ],
      [
        "market_score",
        asset.market_score,
      ],
      [
        "coherence_score",
        asset.coherence_score,
      ],
      [
        "occurrence_score",
        asset.occurrence_score,
      ],
      [
        "frequency_score",
        asset.frequency_score,
      ],
      [
        "convergence_score",
        asset.convergence_score,
      ],
      [
        "duration_score",
        asset.duration_score,
      ],
      [
        "evolution_score",
        asset.evolution_score,
      ],
      [
        "regime",
        asset.regime,
      ],
      [
        "rupture_score",
        asset.rupture_score,
      ],
      [
        "rupture_probability",
        asset.rupture_probability,
      ],
      [
        "rupture_penalty_score",
        asset.rupture_penalty_score,
      ],
      [
        "rupture_occurrence_score",
        asset.rupture_occurrence_score,
      ],
      [
        "rupture_frequency_score",
        asset.rupture_frequency_score,
      ],
      [
        "rupture_convergence_score",
        asset.rupture_convergence_score,
      ],
      [
        "rupture_duration_score",
        asset.rupture_duration_score,
      ],
      [
        "rupture_evolution_score",
        asset.rupture_evolution_score,
      ],
      [
        "rupture_evolution_state",
        asset.rupture_evolution_state,
      ],
      [
        "rupture_acceleration_score",
        asset.rupture_acceleration_score,
      ],
      [
        "continuity_probability",
        asset.continuity_probability,
      ],
    ];

  for (
    const [
      variableName,
      value,
    ] of values
  ) {
    appendRuntimeTraceIfPresent(
      traces,
      {
        value,
        variableName,
        layer,
        source,
        reference,
      },
    );
  }
}

/* ============================================================================
 * 10. TRIPLE LAYER TRACE OBSERVATION
 * ========================================================================== */

function appendTripleLayerRuntimeTraces(
  traces:
    RuntimeTraceInput[],

  asset:
    PrivateScanAsset,

  reference:
    string,
): void {
  const layer:
    RuntimeTraceInput["layer"] =
      "TRIPLE_LAYER";

  const source:
    RuntimeTraceInput["source"] =
      "engine";

  const values:
    ReadonlyArray<
      readonly [
        string,
        unknown,
      ]
    > = [
      [
        "triple_layer_state",
        asset.state,
      ],
      [
        "growth_score",
        asset.growth_score,
      ],
      [
        "core_pattern_score",
        asset.core_pattern_score,
      ],
      [
        "decay_score",
        asset.decay_score,
      ],
      [
        "growth_status",
        asset.growth_status,
      ],
      [
        "core_status",
        asset.core_status,
      ],
      [
        "decay_status",
        asset.decay_status,
      ],
    ];

  for (
    const [
      variableName,
      value,
    ] of values
  ) {
    appendRuntimeTraceIfPresent(
      traces,
      {
        value,
        variableName,
        layer,
        source,
        reference,
      },
    );
  }
}

/* ============================================================================
 * 11. IMPULSE TRACE OBSERVATION
 * ========================================================================== */

function appendImpulseRuntimeTraces(
  traces:
    RuntimeTraceInput[],

  asset:
    PrivateScanAsset,

  reference:
    string,
): void {
  const layer:
    RuntimeTraceInput["layer"] =
      "IMPULSE_LAYER";

  const source:
    RuntimeTraceInput["source"] =
      "engine";

  const values:
    ReadonlyArray<
      readonly [
        string,
        unknown,
      ]
    > = [
      [
        "impulse_pressure_score",
        asset.impulse_pressure_score,
      ],
      [
        "impulse_acceleration_score",
        asset.impulse_acceleration_score,
      ],
      [
        "impulse_alignment_score",
        asset.impulse_alignment_score,
      ],
      [
        "impulse_instability_score",
        asset.impulse_instability_score,
      ],
      [
        "impulse_saturation_score",
        asset.impulse_saturation_score,
      ],
      [
        "impulse_exhaustion_score",
        asset.impulse_exhaustion_score,
      ],
      [
        "impulse_directional_bias",
        asset.impulse_directional_bias,
      ],
      [
        "impulse_transition_state",
        asset.impulse_transition_state,
      ],
      [
        "impulse_status",
        asset.impulse_status,
      ],
    ];

  for (
    const [
      variableName,
      value,
    ] of values
  ) {
    appendRuntimeTraceIfPresent(
      traces,
      {
        value,
        variableName,
        layer,
        source,
        reference,
      },
    );
  }
}

/* ============================================================================
 * 12. CRASH TRACE OBSERVATION
 * ========================================================================== */

function appendCrashRuntimeTraces(
  traces:
    RuntimeTraceInput[],

  asset:
    PrivateScanAsset,

  reference:
    string,
): void {
  const layer:
    RuntimeTraceInput["layer"] =
      "CRASH_SYSTEM";

  const source:
    RuntimeTraceInput["source"] =
      "engine";

  appendRuntimeTraceIfPresent(
    traces,
    {
      value:
        asset.crash_score,

      variableName:
        "crash_score",

      layer,
      source,
      reference,
    },
  );

  appendRuntimeTraceIfPresent(
    traces,
    {
      value:
        asset.crash_state,

      variableName:
        "crash_state",

      layer,
      source,
      reference,
    },
  );
}

/* ============================================================================
 * 13. MCI TRACE OBSERVATION
 * ========================================================================== */

function appendMciRuntimeTraces(
  traces:
    RuntimeTraceInput[],

  asset:
    PrivateScanAsset,

  reference:
    string,
): void {
  const layer:
    RuntimeTraceInput["layer"] =
      "MCI";

  const source:
    RuntimeTraceInput["source"] =
      "engine";

  const values:
    ReadonlyArray<
      readonly [
        string,
        unknown,
      ]
    > = [
      [
        "decision",
        asset.decision,
      ],
      [
        "decision_status",
        asset.decision_status,
      ],
      [
        "decision_score",
        asset.decision_score,
      ],
      [
        "opportunity_score",
        asset.opportunity_score,
      ],
      [
        "opportunity_status",
        asset.opportunity_status,
      ],
      [
        "confidence_score",
        asset.confidence_score,
      ],
      [
        "confidence_status",
        asset.confidence_status,
      ],
      [
        "neutralized",
        asset.neutralized,
      ],
      [
        "neutralization_reason",
        asset.neutralization_reason,
      ],
      [
        "neutralization_severity",
        asset.neutralization_severity,
      ],
      [
        "neutralization_validity",
        asset.neutralization_validity,
      ],
    ];

  for (
    const [
      variableName,
      value,
    ] of values
  ) {
    appendRuntimeTraceIfPresent(
      traces,
      {
        value,
        variableName,
        layer,
        source,
        reference,
      },
    );
  }
}

/* ============================================================================
 * 14. CANONICAL RUNTIME TRACE BUILD
 * ========================================================================== */

function buildRuntimeTracesFromAssets(
  assets:
    readonly PrivateScanAsset[],
): RuntimeTraceInput[] {
  const traces:
    RuntimeTraceInput[] = [];

  for (const asset of assets) {
    const reference =
      resolveAssetReference(
        asset,
      );

    if (reference === null) {
      continue;
    }

    appendRfsRuntimeTraces(
      traces,
      asset,
      reference,
    );

    appendTripleLayerRuntimeTraces(
      traces,
      asset,
      reference,
    );

    appendImpulseRuntimeTraces(
      traces,
      asset,
      reference,
    );

    appendCrashRuntimeTraces(
      traces,
      asset,
      reference,
    );

    appendMciRuntimeTraces(
      traces,
      asset,
      reference,
    );
  }

  return uniqueRuntimeTraces(
    traces,
  );
}

/* ============================================================================
 * 15. STORE WRITE ORCHESTRATION
 * ----------------------------------------------------------------------------
 * Store contracts remain authoritative.
 *
 * This function propagates only fields already accepted by the current store
 * contracts. Additional Impulse fields must be added atomically with the
 * structural analytics store contract.
 * ========================================================================== */

function recordTraceabilityItem(
  input:
    PreparedTraceabilityAsset & {
      snapshot_version:
        string;
    },
): TraceabilityWriteItem {
  const asset =
    input.asset;

  const detection =
    recordDetection({
      asset_id:
        asset.id,

      symbol:
        asset.symbol,

      name:
        asset.name,

      detected_at:
        input.detected_at,

      quote:
        asset.quote,

      snapshot_version:
        input.snapshot_version,

      analytical_version:
        input.analytical_version,

      source:
        asset.governance.source,

      rank:
        asset.rank,

      price:
        asset.price,

      market_cap:
        asset.market_cap,

      volume_24h:
        asset.volume_24h,

      chg_24h_pct:
        asset.chg_24h_pct,

      chg_7d_pct:
        asset.chg_7d_pct,

      /*
       * Public projections are not owned by this private persistence boundary.
       */
      public_activity:
        null,

      public_structure_transition:
        null,

      public_impulse_context:
        null,
    });

  const structuralAnalytics =
    recordStructuralAnalytics({
      detection_id:
        detection.record
          ?.detection_id ??
        "",

      asset_id:
        asset.id,

      symbol:
        asset.symbol,

      snapshot_version:
        input.snapshot_version,

      analytical_version:
        input.analytical_version,

      recorded_at:
        input.detected_at,

      stability_score:
        asset.stability_score,

      stability_status:
        asset.stability_status,

      structure_score:
        asset.structure_score,

      market_score:
        asset.market_score,

      coherence_score:
        asset.coherence_score,

      occurrence_score:
        asset.occurrence_score,

      frequency_score:
        asset.frequency_score,

      convergence_score:
        asset.convergence_score,

      duration_score:
        asset.duration_score,

      evolution_score:
        asset.evolution_score,

      regime:
        asset.regime,

      rupture_score:
        asset.rupture_score,

      rupture_probability:
        asset.rupture_probability,

      rupture_penalty_score:
        asset.rupture_penalty_score,

      rupture_occurrence_score:
        asset.rupture_occurrence_score,

      rupture_frequency_score:
        asset.rupture_frequency_score,

      rupture_convergence_score:
        asset.rupture_convergence_score,

      rupture_duration_score:
        asset.rupture_duration_score,

      rupture_evolution_score:
        asset.rupture_evolution_score,

      rupture_evolution_state:
        asset.rupture_evolution_state,

      rupture_acceleration_score:
        asset.rupture_acceleration_score,

      crash_score:
        asset.crash_score,

      crash_state:
        asset.crash_state,

      continuity_probability:
        asset.continuity_probability,

      triple_layer_state:
        asset.state,

      growth_score:
        asset.growth_score,

      core_pattern_score:
        asset.core_pattern_score,

      decay_score:
        asset.decay_score,

      growth_status:
        asset.growth_status,

      core_status:
        asset.core_status,

      decay_status:
        asset.decay_status,

      impulse_pressure_score:
        asset.impulse_pressure_score,

      impulse_instability_score:
        asset.impulse_instability_score,

      impulse_saturation_score:
        asset.impulse_saturation_score,

      impulse_exhaustion_score:
        asset.impulse_exhaustion_score,

      impulse_directional_bias:
        asset.impulse_directional_bias,

      impulse_transition_state:
        asset.impulse_transition_state,

      impulse_status:
        asset.impulse_status,

      neutralized:
        asset.neutralized,

      neutralization_reason:
        asset.neutralization_reason,

      neutralization_severity:
        asset.neutralization_severity,

      neutralization_validity:
        asset.neutralization_validity,

      decision:
        asset.decision,

      /*
       * The previous implementation replaced an available canonical value
       * with null. The persistence boundary must propagate the real value.
       */
      decision_score:
        asset.decision_score,

      opportunity_score:
        asset.opportunity_score,

      opportunity_status:
        asset.opportunity_status,

      confidence_score:
        asset.confidence_score,

      confidence_status:
        asset.confidence_status,

      decision_status:
        asset.decision_status,
    });

  const transitionLifecycle =
    recordOrUpdateTransitionLifecycle({
      asset,

      detection_id:
        detection.record
          ?.detection_id ??
        "",

      detected_at:
        input.detected_at,

      snapshot_version:
        input.snapshot_version,

      analytical_version:
        input.analytical_version,
    });

  return {
    asset_id:
      asset.id,

    symbol:
      asset.symbol,

    detection,

    structural_analytics:
      structuralAnalytics,

    transition_lifecycle:
      transitionLifecycle,
  };
}

/* ============================================================================
 * 16. WRITE CLASSIFICATION
 * ========================================================================== */

function isLifecycleUsable(
  lifecycle:
    TransitionLifecycleServiceResult,
): boolean {
  return (
    lifecycle.ok ||
    lifecycle.status === "skipped"
  );
}

function isItemInvalid(
  item:
    TraceabilityWriteItem,
): boolean {
  return (
    !item.detection.ok ||
    !item.structural_analytics.ok ||
    !isLifecycleUsable(
      item.transition_lifecycle,
    )
  );
}

function isItemPartial(
  item:
    TraceabilityWriteItem,
): boolean {
  const states = [
    item.detection.ok,
    item.structural_analytics.ok,
    isLifecycleUsable(
      item.transition_lifecycle,
    ),
  ];

  return (
    states.some(Boolean) &&
    !states.every(Boolean)
  );
}

function isItemRecorded(
  item:
    TraceabilityWriteItem,
): boolean {
  return (
    item.detection.ok &&
    item.structural_analytics.ok &&
    isLifecycleUsable(
      item.transition_lifecycle,
    ) &&
    item.detection.status ===
      "recorded" &&
    item.structural_analytics.status ===
      "recorded" &&
    (
      item.transition_lifecycle.status ===
        "recorded" ||
      item.transition_lifecycle.status ===
        "updated" ||
      item.transition_lifecycle.status ===
        "skipped"
    )
  );
}

function countInvalidItems(
  items:
    readonly TraceabilityWriteItem[],
): number {
  return items.filter(
    isItemInvalid,
  ).length;
}

function countPartialItems(
  items:
    readonly TraceabilityWriteItem[],
): number {
  return items.filter(
    isItemPartial,
  ).length;
}

function countRecordedItems(
  items:
    readonly TraceabilityWriteItem[],
): number {
  return items.filter(
    isItemRecorded,
  ).length;
}

function resolveWriteStatus(input: {
  input_count:
    number;

  recorded_count:
    number;

  partial_count:
    number;

  invalid_count:
    number;

  governance_runtime_ok:
    boolean;
}): TraceabilityWriteStatus {
  if (input.input_count === 0) {
    return "empty";
  }

  if (input.invalid_count > 0) {
    return "invalid";
  }

  if (
    input.partial_count > 0 ||
    !input.governance_runtime_ok ||
    input.recorded_count !==
      input.input_count
  ) {
    return "partial";
  }

  return "recorded";
}

/* ============================================================================
 * 17. PRIVATE ORCHESTRATION API
 * ========================================================================== */

export function recordScanTraceability(
  input:
    TraceabilityRecordScanInput,
): TraceabilityWriteResult {
  if (!Array.isArray(input.assets)) {
    return {
      ok:
        false,

      status:
        "invalid",

      count:
        0,

      recorded_count:
        0,

      partial_count:
        0,

      invalid_count:
        1,

      items:
        [],

      warnings: [
        "traceability_assets_invalid",
      ],
    };
  }

  if (input.assets.length === 0) {
    return {
      ok:
        true,

      status:
        "empty",

      count:
        0,

      recorded_count:
        0,

      partial_count:
        0,

      invalid_count:
        0,

      items:
        [],

      warnings: [
        "traceability_assets_empty",
      ],
    };
  }

  const snapshotVersion =
    normalizeRequiredString(
      input.snapshot_version,
    );

  if (snapshotVersion === null) {
    return {
      ok:
        false,

      status:
        "invalid",

      count:
        input.assets.length,

      recorded_count:
        0,

      partial_count:
        0,

      invalid_count:
        input.assets.length,

      items:
        [],

      warnings: [
        "traceability_snapshot_version_invalid",
      ],
    };
  }

  /* --------------------------------------------------------------------------
   * STAGE 1
   * Canonical metadata preparation
   * ----------------------------------------------------------------------- */

  const preparation =
    prepareTraceabilityAssets({
      assets:
        input.assets,

      analytical_version:
        input.analytical_version,

      detected_at:
        input.detected_at,
    });

  /* --------------------------------------------------------------------------
   * STAGE 2
   * Private store mutation
   * ----------------------------------------------------------------------- */

  const items =
    preparation.prepared.map(
      (preparedAsset) =>
        recordTraceabilityItem({
          ...preparedAsset,

          snapshot_version:
            snapshotVersion,
        }),
    );

  const storeInvalidCount =
    countInvalidItems(
      items,
    );

  const partialCount =
    countPartialItems(
      items,
    );

  const recordedCount =
    countRecordedItems(
      items,
    );

  const preparationInvalidCount =
    preparation.failures.length;

  const invalidCount =
    preparationInvalidCount +
    storeInvalidCount;

  /* --------------------------------------------------------------------------
   * STAGE 3
   * Runtime trace observation
   *
   * Only assets that crossed metadata validation are observed here.
   * ----------------------------------------------------------------------- */

  const internalRuntimeTraces =
    buildRuntimeTracesFromAssets(
      preparation.prepared.map(
        (preparedAsset) =>
          preparedAsset.asset,
      ),
    );

  const suppliedRuntimeTraces =
    Array.isArray(
      input.runtime_traces,
    )
      ? input.runtime_traces
      : [];

  const runtimeTraces =
    uniqueRuntimeTraces([
      ...internalRuntimeTraces,
      ...suppliedRuntimeTraces,
    ]);

  const governanceRuntime =
    buildGovernanceRuntimeState({
      traces:
        runtimeTraces,

      scope:
        CANONICAL_SCAN_REBUILD_SCOPE,
    });

  /* --------------------------------------------------------------------------
   * STAGE 4
   * Final classification
   * ----------------------------------------------------------------------- */

  const status =
    resolveWriteStatus({
      input_count:
        input.assets.length,

      recorded_count:
        recordedCount,

      partial_count:
        partialCount,

      invalid_count:
        invalidCount,

      governance_runtime_ok:
        governanceRuntime.ok,
    });

  const warnings =
    uniqueWarnings(
      buildPreparationWarnings(
        preparation.failures,
      ),

      storeInvalidCount > 0
        ? [
            `traceability_store_invalid_count:${storeInvalidCount}`,
          ]
        : [],

      partialCount > 0
        ? [
            `traceability_partial_count:${partialCount}`,
          ]
        : [],

      recordedCount !==
        input.assets.length
        ? [
            `traceability_unrecorded_count:${
              input.assets.length -
              recordedCount
            }`,
          ]
        : [],

      !governanceRuntime.ok
        ? [
            `governance_runtime_${governanceRuntime.status.toLowerCase()}`,
          ]
        : [],

      governanceRuntime.warnings,
    );

  return {
    ok:
      status === "recorded",

    status,

    count:
      input.assets.length,

    recorded_count:
      recordedCount,

    partial_count:
      partialCount,

    invalid_count:
      invalidCount,

    items,

    warnings,
  };
}
