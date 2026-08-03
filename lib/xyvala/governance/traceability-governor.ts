/* ============================================================================
 * FILE: lib/xyvala/governance/traceability-governor.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private runtime traceability governor
 *
 * ROLE
 * - read governed private variables from PrivateScanAsset
 * - convert runtime-active private variables into deterministic traces
 * - connect private analytical contracts to governance runtime
 * - expose explicit unavailable traces without analytical reconstruction
 * - execute lineage, propagation, divergence and governance diagnostics
 *
 * PARENTS
 * - lib/xyvala/contracts/scan-private-contract.ts
 * - lib/xyvala/governance/variable-lineage-registry.ts
 * - lib/xyvala/governance/governance-layer-order.ts
 * - lib/xyvala/governance/governance-runtime.ts
 * - lib/xyvala/governance/runtime-traceability.ts
 * - lib/xyvala/governance/runtime-observation-scopes.ts
 *
 * DIRECTIVES
 * - governance adapter only
 * - OBSERVE / COMPUTE boundary only
 * - no market computation
 * - no RFS recomputation
 * - no Triple Layer recomputation
 * - no Impulse Layer recomputation
 * - no Analytical Aggregation computation
 * - no MCI recomputation
 * - no calibration computation
 * - no snapshot generation
 * - no public projection
 * - no API logic
 * - no UI logic
 * - no cache mutation
 * - no persistence
 * - no event bus
 * - no runtime mutation
 * - deterministic output only
 * - use the active private runtime lineage view as source of governance truth
 *
 * INPUTS
 * - PrivateScanAsset[]
 *
 * OUTPUTS
 * - RuntimeTraceInput[]
 * - TraceabilityGovernorResult
 *
 * INVARIANTS
 * - governor never creates analytical truth
 * - governor never reconstructs unavailable variables
 * - governor never changes variable meaning
 * - governor never mutates runtime state
 * - blocked variables are excluded from active runtime governance
 * - deprecated variables are excluded from active runtime governance
 * - public projection variables are not read from PrivateScanAsset
 * - missing values produce explicit unavailable traces
 * - same assets and registry version produce the same traces
 * - first divergence remains the priority diagnostic
 *
 * CRITICAL DEPENDENCIES
 * - PrivateScanAsset
 * - VariableLineageEntry
 * - listPrivateScanRuntimeVariableLineageEntries
 * - RuntimeTraceInput
 * - buildGovernanceRuntimeState
 *
 * SENSITIVE ZONES
 * - private analytical variables
 * - variable aliases
 * - ownership-layer attribution
 * - private/public boundary
 * - propagation trace construction
 * ========================================================================== */

import type {
  PrivateScanAsset,
} from "@/lib/xyvala/contracts/scan-private-contract";

import {
  listPrivateScanRuntimeVariableLineageEntries,
  type VariableLineageEntry,
} from "@/lib/xyvala/governance/variable-lineage-registry";

import {
  buildGovernanceRuntimeState,
  type GovernanceRuntimeState,
} from "@/lib/xyvala/governance/governance-runtime";

import type {
  RuntimeTraceInput,
} from "@/lib/xyvala/governance/runtime-traceability";

import {
  CANONICAL_SCAN_REBUILD_SCOPE,
} from "@/lib/xyvala/governance/runtime-observation-scopes";

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

type VariableReadResult = {
  value: unknown;
  source_field: string | null;
};

type TraceBuildContext = {
  asset: PrivateScanAsset;
  reference: string;
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function isPresent(
  value: unknown,
): boolean {
  return (
    value !== null &&
    value !== undefined
  );
}

function safeString(
  value: unknown,
  fallback = "",
): string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  )
    ? value.trim()
    : fallback;
}

function uniqueWarnings(
  ...groups: Array<
    readonly string[] |
    undefined |
    null
  >
): string[] {
  return [
    ...new Set(
      groups
        .flatMap(
          (group) =>
            Array.isArray(group)
              ? group
              : [],
        )
        .filter(
          (item): item is string =>
            typeof item === "string" &&
            item.trim().length > 0,
        )
        .map(
          (item) =>
            item.trim(),
        ),
    ),
  ];
}

function buildAssetReference(
  asset: PrivateScanAsset,
): string {
  const symbol =
    safeString(
      asset.symbol,
      "UNKNOWN",
    );

  const id =
    safeString(
      asset.id,
      "unknown",
    );

  return `${symbol}:${id}`;
}

function readRecordField(
  source: unknown,
  field: string,
): unknown {
  if (
    typeof source !== "object" ||
    source === null
  ) {
    return null;
  }

  return (
    source as Record<string, unknown>
  )[field] ?? null;
}

function readNestedRecordField(
  source: unknown,
  path: readonly string[],
): unknown {
  let current: unknown =
    source;

  for (
    const field of path
  ) {
    if (
      typeof current !== "object" ||
      current === null
    ) {
      return null;
    }

    current = (
      current as Record<
        string,
        unknown
      >
    )[field];
  }

  return current ?? null;
}

function readFirstAvailableValue(
  candidates: readonly {
    field: string;
    value: unknown;
  }[],
): VariableReadResult {
  const availableCandidate =
    candidates.find(
      (candidate) =>
        isPresent(
          candidate.value,
        ),
    );

  if (!availableCandidate) {
    return {
      value: null,
      source_field: null,
    };
  }

  return {
    value:
      availableCandidate.value,

    source_field:
      availableCandidate.field,
  };
}

function statusFromValue(
  value: unknown,
): RuntimeTraceInput["status"] {
  return isPresent(value)
    ? "valid"
    : "unavailable";
}

/* ============================================================================
 * 3. TRACE FACTORY
 * ========================================================================== */

function buildTrace(input: {
  variable_name: string;
  layer: RuntimeTraceInput["layer"];
  value: unknown;

  source:
    RuntimeTraceInput["source"];

  reference: string;

  reason?: string | null;
}): RuntimeTraceInput {
  const valuePresent =
    isPresent(input.value);

  return {
    variable_name:
      input.variable_name,

    layer:
      input.layer,

    status:
      statusFromValue(
        input.value,
      ),

    source:
      input.source,

    reference:
      input.reference,

    reason:
      input.reason ??
      (
        valuePresent
          ? null
          : "variable_unavailable"
      ),
  };
}

/* ============================================================================
 * 4. PRIVATE CONTRACT VARIABLE READER
 * ==========================================================================
 *
 * ROLE
 * - read an already-produced value from PrivateScanAsset
 * - resolve explicit contract aliases
 * - preserve the canonical variable identity
 *
 * DIRECTIVES
 * - no computation
 * - no normalization of analytical meaning
 * - no default analytical value
 * - no reconstruction
 * - null means unavailable
 * ========================================================================== */

function readPrivateAssetVariable(input: {
  asset: PrivateScanAsset;
  variableName: string;
}): VariableReadResult {
  const asset =
    input.asset;

  switch (
    input.variableName
  ) {
    /* ------------------------------------------------------------------------
     * Acquisition
     * ---------------------------------------------------------------------- */

    case "id":
      return {
        value:
          readRecordField(
            asset,
            "id",
          ),

        source_field:
          "id",
      };

    case "symbol":
      return {
        value:
          readRecordField(
            asset,
            "symbol",
          ),

        source_field:
          "symbol",
      };

    case "name":
      return {
        value:
          readRecordField(
            asset,
            "name",
          ),

        source_field:
          "name",
      };

    case "price_eur":
      return readFirstAvailableValue([
        {
          field:
            "price_eur",

          value:
            readRecordField(
              asset,
              "price_eur",
            ),
        },
        {
          field:
            "price",

          value:
            readRecordField(
              asset,
              "price",
            ),
        },
        {
          field:
            "market.price_eur",

          value:
            readNestedRecordField(
              asset,
              [
                "market",
                "price_eur",
              ],
            ),
        },
      ]);

    case "chg_24h_pct":
      return {
        value:
          readRecordField(
            asset,
            "chg_24h_pct",
          ),

        source_field:
          "chg_24h_pct",
      };

    case "chg_7d_pct":
      return {
        value:
          readRecordField(
            asset,
            "chg_7d_pct",
          ),

        source_field:
          "chg_7d_pct",
      };

    case "sparkline_7d":
      return {
        value:
          readRecordField(
            asset,
            "sparkline_7d",
          ),

        source_field:
          "sparkline_7d",
      };

    case "market_cap_eur":
      return readFirstAvailableValue([
        {
          field:
            "market_cap_eur",

          value:
            readRecordField(
              asset,
              "market_cap_eur",
            ),
        },
        {
          field:
            "market_cap",

          value:
            readRecordField(
              asset,
              "market_cap",
            ),
        },
      ]);

    case "volume_24h_eur":
      return readFirstAvailableValue([
        {
          field:
            "volume_24h_eur",

          value:
            readRecordField(
              asset,
              "volume_24h_eur",
            ),
        },
        {
          field:
            "volume_24h",

          value:
            readRecordField(
              asset,
              "volume_24h",
            ),
        },
      ]);

    case "rank":
      return {
        value:
          readRecordField(
            asset,
            "rank",
          ),

        source_field:
          "rank",
      };

    case "logo_url":
      return readFirstAvailableValue([
        {
          field:
            "logo_url",

          value:
            readRecordField(
              asset,
              "logo_url",
            ),
        },
        {
          field:
            "logo",

          value:
            readRecordField(
              asset,
              "logo",
            ),
        },
      ]);

    /* ------------------------------------------------------------------------
     * RFS core and support truths
     * ---------------------------------------------------------------------- */

    case "stability_score":
    case "stability_status":
    case "regime":
    case "structure_score":
    case "market_score":
    case "coherence_score":
    case "occurrence_score":
    case "frequency_score":
    case "convergence_score":
    case "duration_score":
    case "evolution_score":
    case "growth_score":
    case "rupture_score":
    case "rupture_probability":
    case "rupture_penalty_score":
    case "rupture_occurrence_score":
    case "rupture_frequency_score":
    case "rupture_convergence_score":
    case "rupture_duration_score":
    case "rupture_evolution_score":
    case "rupture_evolution_state":
    case "rupture_acceleration_score":
    case "continuity_probability":
      return {
        value:
          readRecordField(
            asset,
            input.variableName,
          ),

        source_field:
          input.variableName,
      };

    /* ------------------------------------------------------------------------
     * Crash System
     * ---------------------------------------------------------------------- */

    case "crash_score":
    case "crash_state":
      return {
        value:
          readRecordField(
            asset,
            input.variableName,
          ),

        source_field:
          input.variableName,
      };

    /* ------------------------------------------------------------------------
     * Triple Layer
     * ---------------------------------------------------------------------- */

    case "growth_layer":
      return readFirstAvailableValue([
        {
          field:
            "growth_layer",

          value:
            readRecordField(
              asset,
              "growth_layer",
            ),
        },
        {
          field:
            "growth_layer_score",

          value:
            readRecordField(
              asset,
              "growth_layer_score",
            ),
        },
        {
          field:
            "growth_score",

          value:
            readRecordField(
              asset,
              "growth_score",
            ),
        },
      ]);

    case "core_pattern_layer":
      return readFirstAvailableValue([
        {
          field:
            "core_pattern_layer",

          value:
            readRecordField(
              asset,
              "core_pattern_layer",
            ),
        },
        {
          field:
            "core_pattern_score",

          value:
            readRecordField(
              asset,
              "core_pattern_score",
            ),
        },
      ]);

    case "decay_layer":
      return readFirstAvailableValue([
        {
          field:
            "decay_layer",

          value:
            readRecordField(
              asset,
              "decay_layer",
            ),
        },
        {
          field:
            "decay_score",

          value:
            readRecordField(
              asset,
              "decay_score",
            ),
        },
      ]);

    case "triple_layer_state":
      return readFirstAvailableValue([
        {
          field:
            "triple_layer_state",

          value:
            readRecordField(
              asset,
              "triple_layer_state",
            ),
        },
        {
          field:
            "state",

          value:
            readRecordField(
              asset,
              "state",
            ),
        },
        {
          field:
            "triple_layer.state",

          value:
            readNestedRecordField(
              asset,
              [
                "triple_layer",
                "state",
              ],
            ),
        },
      ]);

    case "core_pattern_score":
    case "decay_score":
      return {
        value:
          readRecordField(
            asset,
            input.variableName,
          ),

        source_field:
          input.variableName,
      };

    /* ------------------------------------------------------------------------
     * Impulse Layer
     * ---------------------------------------------------------------------- */

    case "impulse_pressure_score":
    case "impulse_acceleration_score":
    case "impulse_alignment_score":
    case "impulse_instability_score":
    case "impulse_saturation_score":
    case "impulse_exhaustion_score":
    case "impulse_directional_bias":
    case "impulse_transition_state":
    case "impulse_status":
      return readFirstAvailableValue([
        {
          field:
            input.variableName,

          value:
            readRecordField(
              asset,
              input.variableName,
            ),
        },
        {
          field:
            `impulse.${input.variableName}`,

          value:
            readNestedRecordField(
              asset,
              [
                "impulse",
                input.variableName,
              ],
            ),
        },
      ]);

    /* ------------------------------------------------------------------------
     * MCI runtime variables
     * ---------------------------------------------------------------------- */

    case "decision":
    case "decision_status":
    case "opportunity_score":
    case "opportunity_status":
    case "confidence_score":
    case "confidence_status":
    case "neutralized":
    case "neutralization_reason":
    case "neutralization_severity":
    case "neutralization_validity":
      return readFirstAvailableValue([
        {
          field:
            input.variableName,

          value:
            readRecordField(
              asset,
              input.variableName,
            ),
        },
        {
          field:
            `mci.${input.variableName}`,

          value:
            readNestedRecordField(
              asset,
              [
                "mci",
                input.variableName,
              ],
            ),
        },
        {
          field:
            `decision_layer.${input.variableName}`,

          value:
            readNestedRecordField(
              asset,
              [
                "decision_layer",
                input.variableName,
              ],
            ),
        },
      ]);

    /* ------------------------------------------------------------------------
     * Defensive fallback
     * ---------------------------------------------------------------------- */

    default:
      return {
        value:
          readRecordField(
            asset,
            input.variableName,
          ),

        source_field:
          input.variableName,
      };
  }
}

/* ============================================================================
 * 5. LINEAGE TRACE CONSTRUCTION
 * ==========================================================================
 *
 * ROLE
 * - select variables legitimately observable from PrivateScanAsset
 * - create traces from the runtime observation path only
 * - use the registry as the only variable-list source of truth
 *
 * TRACE POLICY
 * - REQUIRED variables are always traced
 * - OPTIONAL variables are traced only when their value exists
 * - OUT_OF_SCOPE variables are never traced
 * - BLOCKED and DEPRECATED variables are never traced
 * - ownership-layer traces use source "engine"
 * - downstream observation traces use source "governance"
 * - unavailable required values remain explicit
 * - no value is reconstructed for a downstream layer
 * ========================================================================== */

function shouldTraceRegistryEntry(input: {
  asset: PrivateScanAsset;
  entry: Readonly<VariableLineageEntry>;
}): boolean {
  const {
    asset,
    entry,
  } = input;

  /*
   * Only active entries can participate in runtime observation.
   */
  if (
    entry.lineage_status !==
    "ACTIVE"
  ) {
    return false;
  }

  /*
   * This governor is exclusively attached to the PrivateScanAsset boundary.
   */
  if (
    entry.runtime_scope !==
    "PRIVATE_SCAN"
  ) {
    return false;
  }

  /*
   * A variable without an observation path cannot produce runtime traces.
   */
  if (
    entry.runtime_observation_path.length ===
    0
  ) {
    return false;
  }

  /*
   * Canonical-only or explicitly excluded variables never enter runtime.
   */
  if (
    entry.runtime_requirement ===
    "OUT_OF_SCOPE"
  ) {
    return false;
  }

  /*
   * Required variables must remain observable even when unavailable.
   *
   * Their absence is a legitimate runtime divergence.
   */
  if (
    entry.runtime_requirement ===
    "REQUIRED"
  ) {
    return true;
  }

  /*
   * Optional variables enter traceability only when their source value exists.
   */
  const readResult =
    readPrivateAssetVariable({
      asset,

      variableName:
        entry.variable_name,
    });

  return isPresent(
    readResult.value,
  );
}

function buildEntryTraces(input: {
  context: TraceBuildContext;
  entry: Readonly<VariableLineageEntry>;
}): RuntimeTraceInput[] {
  const {
    context,
    entry,
  } = input;

  const readResult =
    readPrivateAssetVariable({
      asset:
        context.asset,

      variableName:
        entry.variable_name,
    });

  const valueAvailable =
    isPresent(
      readResult.value,
    );

  return entry
    .runtime_observation_path
    .map(
      (
        layer,
      ): RuntimeTraceInput => {
        const ownershipTrace =
          layer ===
          entry.ownership_layer;

        const reason =
          valueAvailable
            ? ownershipTrace
              ? (
                  readResult.source_field
                    ? `source_value_observed:${readResult.source_field}`
                    : "source_value_observed"
                )
              : "runtime_propagation_observed"
            : ownershipTrace
              ? "required_source_value_unavailable"
              : "required_runtime_value_unavailable";

        return buildTrace({
          variable_name:
            entry.variable_name,

          layer,

          value:
            readResult.value,

          source:
            ownershipTrace
              ? "engine"
              : "governance",

          reference:
            context.reference,

          reason,
        });
      },
    );
}

export function buildPrivateAssetTraces(
  asset: PrivateScanAsset,
): RuntimeTraceInput[] {
  const context:
    TraceBuildContext = {
      asset,

      reference:
        buildAssetReference(
          asset,
        ),
    };

  const runtimeEntries =
    listPrivateScanRuntimeVariableLineageEntries({
      include_optional:
        true,
    });

  return runtimeEntries
    .filter(
      (
        registryEntry:
          Readonly<VariableLineageEntry>,
      ) =>
        shouldTraceRegistryEntry({
          asset,

          entry:
            registryEntry,
        }),
    )
    .flatMap(
      (
        registryEntry:
          Readonly<VariableLineageEntry>,
      ) =>
        buildEntryTraces({
          context,

          entry:
            registryEntry,
        }),
    );
}

function buildPrivateAssetsTraces(
  assets:
    readonly PrivateScanAsset[],
): RuntimeTraceInput[] {
  return assets.flatMap(
    (
      asset,
    ) =>
      buildPrivateAssetTraces(
        asset,
      ),
  );
}

/* ============================================================================
 * 6. STATUS RESOLUTION
 * ========================================================================== */

function resolveGovernorStatus(
  governance:
    GovernanceRuntimeState,
): TraceabilityGovernorStatus {
  switch (
    governance.status
  ) {
    case "READY":
      return "governed";

    case "DEGRADED":
      return "degraded";

    case "BLOCKED":
      return "blocked";

    default:
      return "invalid";
  }
}

/* ============================================================================
 * 7. GOVERNOR RESULT
 * ========================================================================== */

export function buildTraceabilityGovernorResult(input: {
  assets:
    readonly PrivateScanAsset[];
}): TraceabilityGovernorResult {
  if (
    !Array.isArray(
      input.assets,
    ) ||
    input.assets.length === 0
  ) {
    const governance =
      buildGovernanceRuntimeState({
        traces: [],
        scope:
          CANONICAL_SCAN_REBUILD_SCOPE,
      });

    return {
      ok: true,
      status: "empty",

      asset_count: 0,
      trace_count: 0,

      governance,

      warnings: [
        "traceability_governor_assets_empty",
      ],

      error: null,
    };
  }

  const traces =
    buildPrivateAssetsTraces(
      input.assets,
    );

  const governance =
    buildGovernanceRuntimeState({
      traces,

      scope:
        CANONICAL_SCAN_REBUILD_SCOPE,
    });

  const warnings =
    uniqueWarnings(
      !governance.ok
        ? [
            `traceability_governor_${governance.status.toLowerCase()}`,
          ]
        : [],

      governance.warnings,
    );

  return {
    ok:
      governance.ok,

    status:
      resolveGovernorStatus(
        governance,
      ),

    asset_count:
      input.assets.length,

    trace_count:
      traces.length,

    governance,

    warnings,

    error:
      governance.error,
  };
}

/* ============================================================================
 * 8. ASSERTION API
 * ========================================================================== */

export function assertTraceabilityGoverned(input: {
  assets:
    readonly PrivateScanAsset[];
}): void {
  const result =
    buildTraceabilityGovernorResult(
      input,
    );

  if (result.ok) {
    return;
  }

  throw new Error(
    [
      "traceability_governor_failed",
      result.status,
      result.error ??
        "unknown_error",
    ].join(":"),
  );
}
