/* ============================================================================
 * FILE: lib/xyvala/governance/runtime-traceability.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala deterministic runtime traceability observer
 *
 * ROLE
 * - normalize runtime propagation observations
 * - validate observations against the canonical variable lineage registry
 * - preserve asset-level and execution-level trace references
 * - produce deterministic observed propagation views
 * - expose compatibility observations for propagation audit consumers
 * - qualify unknown, conflicting, duplicated and out-of-scope traces
 *
 * CLASSIFICATION
 * - OBSERVE
 * - deterministic governance adapter
 * - no runtime mutation
 *
 * PARENTS
 * - lib/xyvala/governance/variable-lineage-registry.ts
 * - lib/xyvala/governance/propagation-audit.ts
 * - lib/xyvala/governance/boundary-protection.ts
 *
 * INPUTS
 * - RuntimeTraceInput[]
 * - canonical variable identities
 * - runtime-observed governance layers
 * - optional asset or execution references
 *
 * OUTPUTS
 * - normalized RuntimeTraceEvent[]
 * - reference-preserving RuntimeVariableObservation[]
 * - compatibility ObservedVariablePropagation[]
 * - RuntimeTraceabilityReport
 *
 * DIRECTIVES
 * - OBSERVE only
 * - no market computation
 * - no RFS recomputation
 * - no Triple Layer recomputation
 * - no Impulse Layer recomputation
 * - no Analytical Aggregation computation
 * - no MCI recomputation
 * - no calibration computation
 * - no analytical reconstruction
 * - no snapshot mutation
 * - no persistence
 * - no event publication
 * - no API logic
 * - no UI logic
 * - no runtime governance mutation
 * - no silent variable repair
 * - no silent conflict resolution
 * - deterministic ordering only
 *
 * INVARIANTS
 * - Variable Lineage Registry is the source of governance truth
 * - traceability records observations only
 * - traceability never creates analytical truth
 * - canonical variables retain their official identity
 * - unknown variables are rejected
 * - out-of-scope variables are rejected
 * - observations outside authorised paths are rejected
 * - missing values remain explicit
 * - conflicts remain explicit
 * - duplicates remain measurable
 * - asset references are preserved
 * - compatibility aggregation never depends on input order
 * - same logical trace set produces the same normalized report
 *
 * CRITICAL DEPENDENCIES
 * - VariableLineageEntry
 * - getVariableLineageEntry
 * - ObservedVariablePropagation
 * - PropagationStatus
 *
 * SENSITIVE ZONES
 * - canonical variable identity
 * - runtime observation paths
 * - private/public boundaries
 * - conflict resolution
 * - asset-level trace isolation
 * - deterministic aggregation
 * ========================================================================== */

import type {
  ObservedVariablePropagation,
  PropagationStatus,
} from "@/lib/xyvala/governance/propagation-audit";

import {
  getVariableLineageEntry,
  type VariableLineageEntry,
  type VariableOwnerLayer,
} from "@/lib/xyvala/governance/variable-lineage-registry";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RuntimeTraceSource =
  | "engine"
  | "mapper"
  | "transformer"
  | "snapshot"
  | "api"
  | "interface"
  | "governance"
  | "unknown";

export type RuntimeTraceObservationKind =
  | "runtime_observed"
  | "governance_propagated";

export type RuntimeTraceRejectionReason =
  | "empty_variable_name"
  | "unknown_variable"
  | "inactive_variable"
  | "out_of_scope_variable"
  | "layer_not_authorised"
  | "invalid_reference"
  | "invalid_trace";

export type RuntimeTraceEvent = {
  variable_name: string;

  layer: VariableOwnerLayer;
  status: PropagationStatus;

  source: RuntimeTraceSource;
  observation_kind:
    RuntimeTraceObservationKind;

  reference: string | null;
  reason: string | null;

  ownership_layer:
    VariableOwnerLayer;

  producer_contract: string;
  runtime_contract: string;

  runtime_scope:
    Readonly<
      VariableLineageEntry
    >["runtime_scope"];

  runtime_requirement:
    Readonly<
      VariableLineageEntry
    >["runtime_requirement"];
};

export type RuntimeTraceInput = {
  variable_name: string;

  layer: VariableOwnerLayer;
  status: PropagationStatus;

  source: RuntimeTraceSource;

  reference?: string | null;
  reason?: string | null;

  /**
   * Runtime observation is the default.
   *
   * governance_propagated must only be used when governance records an
   * explicitly declared downstream propagation state rather than a direct
   * runtime observation.
   */
  observation_kind?:
    RuntimeTraceObservationKind;
};

export type RuntimeRejectedTrace = {
  input_index: number;

  variable_name: string;
  layer: VariableOwnerLayer;

  reference: string | null;

  rejection_reason:
    RuntimeTraceRejectionReason;

  diagnostic: string;
};

export type RuntimeTraceConflict = {
  variable_name: string;
  layer: VariableOwnerLayer;
  reference: string | null;

  statuses:
    PropagationStatus[];

  selected_status:
    PropagationStatus;

  reason:
    "contradictory_runtime_observations";
};

export type RuntimeVariableObservation = {
  variable_name: string;
  reference: string | null;

  ownership_layer:
    VariableOwnerLayer;

  layers:
    Partial<
      Record<
        VariableOwnerLayer,
        PropagationStatus
      >
    >;

  sources:
    RuntimeTraceSource[];

  observation_kinds:
    RuntimeTraceObservationKind[];

  reasons: string[];

  trace_count: number;
  duplicate_count: number;
  conflict_count: number;
};

export type RuntimeTraceabilityReport = {
  ok: boolean;

  input_count: number;
  accepted_count: number;
  rejected_count: number;

  trace_count: number;
  variable_count: number;
  reference_count: number;

  duplicate_count: number;
  conflict_count: number;
  unknown_variable_count: number;
  out_of_scope_count: number;
  unauthorised_layer_count: number;

  /**
   * Complete normalized accepted traces.
   *
   * This is the authoritative traceability output of this file.
   */
  traces: RuntimeTraceEvent[];

  /**
   * Reference-preserving observations.
   *
   * Different assets or executions are never silently merged here.
   */
  observations:
    RuntimeVariableObservation[];

  /**
   * Compatibility view consumed by the current propagation audit.
   *
   * This view aggregates references deterministically and must not be used
   * as a replacement for the complete observations field.
   */
  observed:
    ObservedVariablePropagation[];

  rejected_traces:
    RuntimeRejectedTrace[];

  conflicts:
    RuntimeTraceConflict[];

  violations: string[];
  warnings: string[];
  information: string[];
};

type RuntimeTraceNormalizationSuccess = {
  ok: true;
  event: RuntimeTraceEvent;
};

type RuntimeTraceNormalizationFailure = {
  ok: false;
  rejection: RuntimeRejectedTrace;
};

type RuntimeTraceNormalizationResult =
  | RuntimeTraceNormalizationSuccess
  | RuntimeTraceNormalizationFailure;

type StatusResolution = {
  status: PropagationStatus;
  conflict: boolean;
  statuses: PropagationStatus[];
};

/* ============================================================================
 * 2. SAFE PRIMITIVE HELPERS
 * ========================================================================== */

function safeString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function nullableString(
  value: unknown,
): string | null {
  const normalized =
    safeString(value);

  return normalized.length > 0
    ? normalized
    : null;
}

function compareStrings(
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

function uniqueSortedStrings(
  values:
    readonly string[],
): string[] {
  return [
    ...new Set(
      values
        .map(safeString)
        .filter(
          (value) =>
            value.length > 0,
        ),
    ),
  ].sort(compareStrings);
}

function normalizeSource(
  value: unknown,
): RuntimeTraceSource {
  switch (value) {
    case "engine":
    case "mapper":
    case "transformer":
    case "snapshot":
    case "api":
    case "interface":
    case "governance":
      return value;

    default:
      return "unknown";
  }
}

function normalizeObservationKind(
  value: unknown,
): RuntimeTraceObservationKind {
  return value ===
    "governance_propagated"
    ? "governance_propagated"
    : "runtime_observed";
}

function buildReferenceKey(
  reference: string | null,
): string {
  return reference ??
    "__NO_REFERENCE__";
}

function buildObservationKey(input: {
  variableName: string;
  reference: string | null;
}): string {
  return [
    buildReferenceKey(
      input.reference,
    ),
    input.variableName,
  ].join("::");
}

function buildTraceIdentity(
  trace: RuntimeTraceEvent,
): string {
  return [
    buildReferenceKey(
      trace.reference,
    ),
    trace.variable_name,
    trace.layer,
    String(trace.status),
    trace.source,
    trace.observation_kind,
    trace.reason ?? "",
  ].join("::");
}

function freezeArray<T>(
  values: readonly T[],
): T[] {
  return Object.freeze(
    [
      ...values,
    ],
  ) as unknown as T[];
}

/* ============================================================================
 * 3. STATUS GOVERNANCE
 * ----------------------------------------------------------------------------
 * PropagationStatus is owned by propagation-audit.ts.
 *
 * This file does not redefine that contract.
 *
 * It only provides a deterministic precedence for contradictory observations.
 * The most defensive observed state takes precedence.
 * ========================================================================== */

function propagationStatusPriority(
  status: PropagationStatus,
): number {
  switch (
    String(status)
  ) {
    case "invalid":
      return 700;

    case "conflicted":
      return 650;

    case "blocked":
      return 600;

    case "unavailable":
      return 500;

    case "not_observed":
      return 450;

    case "partial":
      return 400;

    case "degraded":
      return 350;

    case "propagated":
      return 200;

    case "valid":
      return 100;

    default:
      /*
       * Unknown contract values remain defensive.
       *
       * They are never allowed to dominate an explicitly invalid or
       * unavailable observation, but they also never become silently valid.
       */
      return 550;
  }
}

function comparePropagationStatuses(
  left: PropagationStatus,
  right: PropagationStatus,
): number {
  const priorityDelta =
    propagationStatusPriority(
      right,
    ) -
    propagationStatusPriority(
      left,
    );

  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return compareStrings(
    String(left),
    String(right),
  );
}

function resolveStatuses(
  statuses:
    readonly PropagationStatus[],
): StatusResolution {
  const uniqueStatuses =
    [
      ...new Set(
        statuses,
      ),
    ].sort(
      comparePropagationStatuses,
    );

  const selectedStatus =
    uniqueStatuses[0];

  if (
    selectedStatus ===
    undefined
  ) {
    throw new Error(
      "runtime_traceability_status_resolution_empty",
    );
  }

  return {
    status:
      selectedStatus,

    conflict:
      uniqueStatuses.length > 1,

    statuses:
      uniqueStatuses,
  };
}

/* ============================================================================
 * 4. REGISTRY AND PATH VALIDATION
 * ========================================================================== */

function isRuntimeObservableEntry(
  entry:
    Readonly<VariableLineageEntry>,
): boolean {
  return (
    entry.lineage_status ===
      "ACTIVE" &&
    entry.runtime_requirement !==
      "OUT_OF_SCOPE" &&
    entry.runtime_observation_path
      .length > 0
  );
}

function isLayerAuthorisedForEntry(input: {
  entry:
    Readonly<VariableLineageEntry>;

  layer:
    VariableOwnerLayer;

  observationKind:
    RuntimeTraceObservationKind;
}): boolean {
  if (
    input.observationKind ===
      "runtime_observed"
  ) {
    return input.entry
      .runtime_observation_path
      .includes(
        input.layer,
      );
  }

  /*
   * Governance-propagated traces may describe a declared canonical layer,
   * but they remain explicitly distinguished from direct runtime
   * observations.
   */
  return input.entry
    .canonical_propagation_path
    .includes(
      input.layer,
    );
}

/* ============================================================================
 * 5. TRACE NORMALIZATION
 * ----------------------------------------------------------------------------
 * Contract Before Runtime Rule:
 * - resolve canonical registry entry first
 * - validate activity and scope
 * - validate authorised layer
 * - only then produce a normalized trace
 * ========================================================================== */

function normalizeRuntimeTraceInput(input: {
  trace:
    RuntimeTraceInput;

  inputIndex:
    number;
}): RuntimeTraceNormalizationResult {
  const variableName =
    safeString(
      input.trace.variable_name,
    );

  const reference =
    nullableString(
      input.trace.reference,
    );

  if (!variableName) {
    return {
      ok: false,

      rejection: {
        input_index:
          input.inputIndex,

        variable_name: "",

        layer:
          input.trace.layer,

        reference,

        rejection_reason:
          "empty_variable_name",

        diagnostic:
          "runtime_traceability_empty_variable_name",
      },
    };
  }

  const registryEntry =
    getVariableLineageEntry(
      variableName,
    );

  if (!registryEntry) {
    return {
      ok: false,

      rejection: {
        input_index:
          input.inputIndex,

        variable_name:
          variableName,

        layer:
          input.trace.layer,

        reference,

        rejection_reason:
          "unknown_variable",

        diagnostic:
          `runtime_traceability_unknown_variable:${variableName}`,
      },
    };
  }

  if (
    registryEntry.lineage_status !==
      "ACTIVE"
  ) {
    return {
      ok: false,

      rejection: {
        input_index:
          input.inputIndex,

        variable_name:
          variableName,

        layer:
          input.trace.layer,

        reference,

        rejection_reason:
          "inactive_variable",

        diagnostic:
          [
            "runtime_traceability_inactive_variable",
            variableName,
            registryEntry.lineage_status,
          ].join(":"),
      },
    };
  }

  if (
    registryEntry
      .runtime_requirement ===
        "OUT_OF_SCOPE" ||
    registryEntry
      .runtime_observation_path
      .length ===
        0
  ) {
    return {
      ok: false,

      rejection: {
        input_index:
          input.inputIndex,

        variable_name:
          variableName,

        layer:
          input.trace.layer,

        reference,

        rejection_reason:
          "out_of_scope_variable",

        diagnostic:
          `runtime_traceability_out_of_scope_variable:${variableName}`,
      },
    };
  }

  const observationKind =
    normalizeObservationKind(
      input.trace
        .observation_kind,
    );

  if (
    !isLayerAuthorisedForEntry({
      entry:
        registryEntry,

      layer:
        input.trace.layer,

      observationKind,
    })
  ) {
    return {
      ok: false,

      rejection: {
        input_index:
          input.inputIndex,

        variable_name:
          variableName,

        layer:
          input.trace.layer,

        reference,

        rejection_reason:
          "layer_not_authorised",

        diagnostic:
          [
            "runtime_traceability_layer_not_authorised",
            variableName,
            input.trace.layer,
            observationKind,
          ].join(":"),
      },
    };
  }

  const normalizedSource =
    normalizeSource(
      input.trace.source,
    );

  const normalizedReason =
    nullableString(
      input.trace.reason,
    );

  return {
    ok: true,

    event: Object.freeze({
      variable_name:
        variableName,

      layer:
        input.trace.layer,

      status:
        input.trace.status,

      source:
        normalizedSource,

      observation_kind:
        observationKind,

      reference,

      reason:
        normalizedReason,

      ownership_layer:
        registryEntry
          .ownership_layer,

      producer_contract:
        registryEntry
          .producer_contract,

      runtime_contract:
        registryEntry
          .runtime_contract,

      runtime_scope:
        registryEntry
          .runtime_scope,

      runtime_requirement:
        registryEntry
          .runtime_requirement,
    }),
  };
}

/* ============================================================================
 * 6. TRACE NORMALIZATION API
 * ========================================================================== */

export function buildRuntimeTraceEvent(
  input:
    RuntimeTraceInput,
): RuntimeTraceEvent {
  const result =
    normalizeRuntimeTraceInput({
      trace:
        input,

      inputIndex:
        0,
    });

  if (!result.ok) {
    throw new Error(
      result.rejection
        .diagnostic,
    );
  }

  return result.event;
}

export function buildRuntimeTraceEvents(
  inputs:
    readonly RuntimeTraceInput[],
): RuntimeTraceEvent[] {
  const events:
    RuntimeTraceEvent[] = [];

  for (
    let index = 0;
    index < inputs.length;
    index += 1
  ) {
    const trace =
      inputs[index];

    if (!trace) {
      continue;
    }

    const result =
      normalizeRuntimeTraceInput({
        trace,
        inputIndex:
          index,
      });

    if (result.ok) {
      events.push(
        result.event,
      );
    }
  }

  return freezeArray(
    sortRuntimeTraceEvents(
      events,
    ),
  );
}

/* ============================================================================
 * 7. DETERMINISTIC TRACE ORDER
 * ========================================================================== */

function sortRuntimeTraceEvents(
  traces:
    readonly RuntimeTraceEvent[],
): RuntimeTraceEvent[] {
  return [
    ...traces,
  ].sort(
    (
      left,
      right,
    ) => {
      const referenceDelta =
        compareStrings(
          buildReferenceKey(
            left.reference,
          ),

          buildReferenceKey(
            right.reference,
          ),
        );

      if (referenceDelta !== 0) {
        return referenceDelta;
      }

      const variableDelta =
        compareStrings(
          left.variable_name,
          right.variable_name,
        );

      if (variableDelta !== 0) {
        return variableDelta;
      }

      const layerDelta =
        compareStrings(
          left.layer,
          right.layer,
        );

      if (layerDelta !== 0) {
        return layerDelta;
      }

      const statusDelta =
        comparePropagationStatuses(
          left.status,
          right.status,
        );

      if (statusDelta !== 0) {
        return statusDelta;
      }

      const sourceDelta =
        compareStrings(
          left.source,
          right.source,
        );

      if (sourceDelta !== 0) {
        return sourceDelta;
      }

      const kindDelta =
        compareStrings(
          left.observation_kind,
          right.observation_kind,
        );

      if (kindDelta !== 0) {
        return kindDelta;
      }

      return compareStrings(
        left.reason ?? "",
        right.reason ?? "",
      );
    },
  );
}

/* ============================================================================
 * 8. REFERENCE-PRESERVING OBSERVATION BUILDER
 * ----------------------------------------------------------------------------
 * Different assets and executions remain isolated.
 *
 * A trace for BTC must never overwrite or neutralize a trace for ETH.
 * ========================================================================== */

function buildRuntimeVariableObservations(
  traces:
    readonly RuntimeTraceEvent[],
): {
  observations:
    RuntimeVariableObservation[];

  conflicts:
    RuntimeTraceConflict[];

  duplicateCount:
    number;
} {
  const tracesByObservation =
    new Map<
      string,
      RuntimeTraceEvent[]
    >();

  for (
    const trace of
    traces
  ) {
    const key =
      buildObservationKey({
        variableName:
          trace.variable_name,

        reference:
          trace.reference,
      });

    const current =
      tracesByObservation.get(
        key,
      ) ?? [];

    current.push(
      trace,
    );

    tracesByObservation.set(
      key,
      current,
    );
  }

  const observations:
    RuntimeVariableObservation[] = [];

  const conflicts:
    RuntimeTraceConflict[] = [];

  let duplicateCount = 0;

  for (
    const groupedTraces of
    tracesByObservation.values()
  ) {
    const firstTrace =
      groupedTraces[0];

    if (!firstTrace) {
      continue;
    }

    const tracesByLayer =
      new Map<
        VariableOwnerLayer,
        RuntimeTraceEvent[]
      >();

    for (
      const trace of
      groupedTraces
    ) {
      const layerTraces =
        tracesByLayer.get(
          trace.layer,
        ) ?? [];

      layerTraces.push(
        trace,
      );

      tracesByLayer.set(
        trace.layer,
        layerTraces,
      );
    }

    const layers:
      Partial<
        Record<
          VariableOwnerLayer,
          PropagationStatus
        >
      > = {};

    let observationConflictCount =
      0;

    const traceIdentities =
      groupedTraces.map(
        buildTraceIdentity,
      );

    const observationDuplicateCount =
      traceIdentities.length -
      new Set(
        traceIdentities,
      ).size;

    duplicateCount +=
      observationDuplicateCount;

    for (
      const [
        layer,
        layerTraces,
      ] of tracesByLayer.entries()
    ) {
      const resolution =
        resolveStatuses(
          layerTraces.map(
            (trace) =>
              trace.status,
          ),
        );

      layers[layer] =
        resolution.status;

      if (resolution.conflict) {
        observationConflictCount +=
          1;

        conflicts.push(
          Object.freeze({
            variable_name:
              firstTrace
                .variable_name,

            layer,

            reference:
              firstTrace
                .reference,

            statuses:
              freezeArray(
                resolution
                  .statuses,
              ),

            selected_status:
              resolution
                .status,

            reason:
              "contradictory_runtime_observations",
          }),
        );
      }
    }

    observations.push(
      Object.freeze({
        variable_name:
          firstTrace
            .variable_name,

        reference:
          firstTrace
            .reference,

        ownership_layer:
          firstTrace
            .ownership_layer,

        layers:
          Object.freeze({
            ...layers,
          }),

        sources:
          freezeArray(
            uniqueSortedStrings(
              groupedTraces.map(
                (trace) =>
                  trace.source,
              ),
            ) as RuntimeTraceSource[],
          ),

        observation_kinds:
          freezeArray(
            uniqueSortedStrings(
              groupedTraces.map(
                (trace) =>
                  trace
                    .observation_kind,
              ),
            ) as RuntimeTraceObservationKind[],
          ),

        reasons:
          freezeArray(
            uniqueSortedStrings(
              groupedTraces
                .map(
                  (trace) =>
                    trace.reason ??
                    "",
                ),
            ),
          ),

        trace_count:
          groupedTraces.length,

        duplicate_count:
          observationDuplicateCount,

        conflict_count:
          observationConflictCount,
      }),
    );
  }

  observations.sort(
    (
      left,
      right,
    ) => {
      const referenceDelta =
        compareStrings(
          buildReferenceKey(
            left.reference,
          ),

          buildReferenceKey(
            right.reference,
          ),
        );

      if (referenceDelta !== 0) {
        return referenceDelta;
      }

      return compareStrings(
        left.variable_name,
        right.variable_name,
      );
    },
  );

  conflicts.sort(
    (
      left,
      right,
    ) => {
      const referenceDelta =
        compareStrings(
          buildReferenceKey(
            left.reference,
          ),

          buildReferenceKey(
            right.reference,
          ),
        );

      if (referenceDelta !== 0) {
        return referenceDelta;
      }

      const variableDelta =
        compareStrings(
          left.variable_name,
          right.variable_name,
        );

      if (variableDelta !== 0) {
        return variableDelta;
      }

      return compareStrings(
        left.layer,
        right.layer,
      );
    },
  );

  return {
    observations:
      freezeArray(
        observations,
      ),

    conflicts:
      freezeArray(
        conflicts,
      ),

    duplicateCount,
  };
}

/* ============================================================================
 * 9. COMPATIBILITY OBSERVED PROPAGATION BUILDER
 * ----------------------------------------------------------------------------
 * The existing propagation audit consumes one observation per variable.
 *
 * Multiple references are aggregated deterministically using the most
 * defensive observed status for each layer.
 *
 * This compatibility view must never replace the reference-preserving
 * observations field in RuntimeTraceabilityReport.
 * ========================================================================== */

export function buildObservedPropagation(
  traces:
    readonly RuntimeTraceEvent[],
): ObservedVariablePropagation[] {
  const statusesByVariable =
    new Map<
      string,
      Map<
        VariableOwnerLayer,
        PropagationStatus[]
      >
    >();

  for (
    const trace of
    traces
  ) {
    const variableLayers =
      statusesByVariable.get(
        trace.variable_name,
      ) ??
      new Map<
        VariableOwnerLayer,
        PropagationStatus[]
      >();

    const layerStatuses =
      variableLayers.get(
        trace.layer,
      ) ?? [];

    layerStatuses.push(
      trace.status,
    );

    variableLayers.set(
      trace.layer,
      layerStatuses,
    );

    statusesByVariable.set(
      trace.variable_name,
      variableLayers,
    );
  }

  const observed:
    ObservedVariablePropagation[] = [];

  const sortedVariableNames =
    [
      ...statusesByVariable.keys(),
    ].sort(
      compareStrings,
    );

  for (
    const variableName of
    sortedVariableNames
  ) {
    const variableLayers =
      statusesByVariable.get(
        variableName,
      );

    if (!variableLayers) {
      continue;
    }

    const layers:
      Partial<
        Record<
          VariableOwnerLayer,
          PropagationStatus
        >
      > = {};

    const sortedLayers =
      [
        ...variableLayers.keys(),
      ].sort(
        compareStrings,
      );

    for (
      const layer of
      sortedLayers
    ) {
      const statuses =
        variableLayers.get(
          layer,
        );

      if (
        !statuses ||
        statuses.length === 0
      ) {
        continue;
      }

      layers[layer] =
        resolveStatuses(
          statuses,
        ).status;
    }

    observed.push({
      variable_name:
        variableName,

      layers,
    });
  }

  return freezeArray(
    observed,
  );
}

/* ============================================================================
 * 10. REJECTION AND DIAGNOSTIC HELPERS
 * ========================================================================== */

function normalizeAllRuntimeTraces(
  inputs:
    readonly RuntimeTraceInput[],
): {
  accepted:
    RuntimeTraceEvent[];

  rejected:
    RuntimeRejectedTrace[];
} {
  const accepted:
    RuntimeTraceEvent[] = [];

  const rejected:
    RuntimeRejectedTrace[] = [];

  for (
    let index = 0;
    index < inputs.length;
    index += 1
  ) {
    const trace =
      inputs[index];

    if (!trace) {
      rejected.push({
        input_index:
          index,

        variable_name: "",

        layer:
          "ACQUISITION",

        reference: null,

        rejection_reason:
          "invalid_trace",

        diagnostic:
          "runtime_traceability_invalid_trace",
      });

      continue;
    }

    const result =
      normalizeRuntimeTraceInput({
        trace,

        inputIndex:
          index,
      });

    if (result.ok) {
      accepted.push(
        result.event,
      );

      continue;
    }

    rejected.push(
      result.rejection,
    );
  }

  rejected.sort(
    (
      left,
      right,
    ) =>
      left.input_index -
      right.input_index,
  );

  return {
    accepted:
      freezeArray(
        sortRuntimeTraceEvents(
          accepted,
        ),
      ),

    rejected:
      freezeArray(
        rejected,
      ),
  };
}

function countRejections(
  rejected:
    readonly RuntimeRejectedTrace[],
  reason:
    RuntimeTraceRejectionReason,
): number {
  return rejected.filter(
    (entry) =>
      entry.rejection_reason ===
      reason,
  ).length;
}

/* ============================================================================
 * 11. TRACEABILITY REPORT
 * ========================================================================== */

export function buildRuntimeTraceabilityReport(
  inputs:
    readonly RuntimeTraceInput[],
): RuntimeTraceabilityReport {
  const normalization =
    normalizeAllRuntimeTraces(
      inputs,
    );

  const observationResult =
    buildRuntimeVariableObservations(
      normalization.accepted,
    );

  const observed =
    buildObservedPropagation(
      normalization.accepted,
    );

  const unknownVariableCount =
    countRejections(
      normalization.rejected,
      "unknown_variable",
    );

  const outOfScopeCount =
    countRejections(
      normalization.rejected,
      "out_of_scope_variable",
    );

  const unauthorisedLayerCount =
    countRejections(
      normalization.rejected,
      "layer_not_authorised",
    );

  const violations =
    uniqueSortedStrings([
      ...normalization.rejected.map(
        (entry) =>
          entry.diagnostic,
      ),

      ...observationResult.conflicts.map(
        (conflict) =>
          [
            "runtime_traceability_conflict",
            conflict.variable_name,
            conflict.layer,
            buildReferenceKey(
              conflict.reference,
            ),
          ].join(":"),
      ),
    ]);

  const warnings =
    uniqueSortedStrings([
      ...normalization.accepted
        .filter(
          (trace) =>
            trace.source ===
            "unknown",
        )
        .map(
          (trace) =>
            [
              "runtime_traceability_unknown_source",
              trace.variable_name,
              trace.layer,
              buildReferenceKey(
                trace.reference,
              ),
            ].join(":"),
        ),

      ...normalization.accepted
        .filter(
          (trace) =>
            trace.reference ===
            null,
        )
        .map(
          (trace) =>
            [
              "runtime_traceability_missing_reference",
              trace.variable_name,
              trace.layer,
            ].join(":"),
        ),

      ...(
        observationResult
          .duplicateCount > 0
          ? [
              `runtime_traceability_duplicate_traces:${observationResult.duplicateCount}`,
            ]
          : []
      ),
    ]);

  const information =
    uniqueSortedStrings([
      ...normalization.accepted
        .filter(
          (trace) =>
            trace
              .runtime_requirement ===
            "OPTIONAL",
        )
        .map(
          (trace) =>
            `runtime_traceability_optional_variable:${trace.variable_name}`,
        ),

      ...normalization.accepted
        .filter(
          (trace) =>
            trace.observation_kind ===
            "governance_propagated",
        )
        .map(
          (trace) =>
            [
              "runtime_traceability_governance_propagated",
              trace.variable_name,
              trace.layer,
              buildReferenceKey(
                trace.reference,
              ),
            ].join(":"),
        ),
    ]);

  const referenceCount =
    new Set(
      normalization.accepted
        .map(
          (trace) =>
            trace.reference,
        )
        .filter(
          (
            reference,
          ): reference is string =>
            reference !== null,
        ),
    ).size;

  return Object.freeze({
    ok:
      violations.length === 0,

    input_count:
      inputs.length,

    accepted_count:
      normalization
        .accepted
        .length,

    rejected_count:
      normalization
        .rejected
        .length,

    trace_count:
      normalization
        .accepted
        .length,

    variable_count:
      observed.length,

    reference_count:
      referenceCount,

    duplicate_count:
      observationResult
        .duplicateCount,

    conflict_count:
      observationResult
        .conflicts
        .length,

    unknown_variable_count:
      unknownVariableCount,

    out_of_scope_count:
      outOfScopeCount,

    unauthorised_layer_count:
      unauthorisedLayerCount,

    traces:
      normalization
        .accepted,

    observations:
      observationResult
        .observations,

    observed,

    rejected_traces:
      normalization
        .rejected,

    conflicts:
      observationResult
        .conflicts,

    violations:
      freezeArray(
        violations,
      ),

    warnings:
      freezeArray(
        warnings,
      ),

    information:
      freezeArray(
        information,
      ),
  });
}

/* ============================================================================
 * 12. ASSERTION API
 * ========================================================================== */

export function assertRuntimeTraceabilityValid(
  inputs:
    readonly RuntimeTraceInput[],
): void {
  const result =
    buildRuntimeTraceabilityReport(
      inputs,
    );

  if (result.ok) {
    return;
  }

  throw new Error(
    [
      "runtime_traceability_invalid",
      ...result.violations,
    ].join(":"),
  );
}
