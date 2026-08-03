/* ============================================================================
 * FILE: lib/xyvala/governance/lineage-reconciliation.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala scoped lineage reconciliation engine
 *
 * ROLE
 * - reconcile canonical variable lineage with applicable runtime traces
 * - distinguish theoretical propagation from runtime observation scope
 * - detect missing required truths, unexpected variables and layer divergence
 * - support First Divergence Rule and Boundary Propagation Audit
 *
 * DIRECTIVES
 * - governance reconciliation only
 * - observe only
 * - no analytical reconstruction
 * - no market computation
 * - no runtime mutation
 * - no persistence
 * - deterministic output only
 *
 * INVARIANTS
 * - propagation_path describes an authorised governance path
 * - propagation_path does not require one trace per layer
 * - only applicable variables may be classified as missing
 * - non-executed layers never create false lineage failures
 * - owner observation is required only for applicable owned truths
 * ========================================================================== */

import type {
  RuntimeTraceInput,
} from "@/lib/xyvala/governance/runtime-traceability";

import {
  listVariableLineageEntries,
  type VariableLineageEntry,
  type VariableOwnerLayer,
} from "@/lib/xyvala/governance/variable-lineage-registry";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type LineageReconciliationStatus =
  | "OK"
  | "DEGRADED"
  | "BLOCKED";

export type LineageReconciliationIssueType =
  | "missing_variable"
  | "missing_owner_layer"
  | "unexpected_layer"
  | "unexpected_variable"
  | "unavailable_trace";

export type LineageReconciliationIssue = {
  type: LineageReconciliationIssueType;
  variable_name: string;
  expected_layer: VariableOwnerLayer | null;
  observed_layers: string[];
  reason: string;
};

export type LineageReconciliationItem = {
  variable_name: string;
  ownership_layer: VariableOwnerLayer;

  expected_layers: VariableOwnerLayer[];
  observed_layers: string[];

  is_applicable: boolean;
  is_observed: boolean;
  owner_layer_observed: boolean;

  unavailable_count: number;

  status: LineageReconciliationStatus;
  issues: LineageReconciliationIssue[];
};

export type LineageReconciliationResult = {
  ok: boolean;
  status: LineageReconciliationStatus;

  registry_count: number;
  applicable_count: number;
  observed_variable_count: number;
  reconciled_count: number;

  missing_count: number;
  degraded_count: number;
  blocked_count: number;
  unexpected_count: number;
  not_applicable_count: number;

  first_issue: LineageReconciliationIssue | null;

  items: LineageReconciliationItem[];
  unexpected_variables: string[];

  warnings: string[];
  error: string | null;
};

export type ReconcileLineageInput = {
  traces?: readonly RuntimeTraceInput[];
  registry?: readonly VariableLineageEntry[];

  /*
   * Explicit execution scope.
   *
   * Recommended for production governance:
   * the caller declares which layers were actually executed.
   *
   * When omitted, the engine derives the scope from runtime traces.
   */
  executed_layers?: readonly VariableOwnerLayer[];

  /*
   * Optional strict variable scope.
   *
   * When supplied, only these variables are mandatory for the run.
   * Other registry entries remain visible but non-applicable.
   */
  required_variables?: readonly string[];
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function uniqueStrings(
  values: readonly string[],
): string[] {
  return [
    ...new Set(
      values
        .map(safeString)
        .filter((value) => value.length > 0),
    ),
  ];
}

function sortStrings(
  values: readonly string[],
): string[] {
  return [...values].sort((left, right) =>
    left.localeCompare(right),
  );
}

function normalizeTraces(
  value: readonly RuntimeTraceInput[] | undefined,
): readonly RuntimeTraceInput[] {
  return Array.isArray(value) ? value : [];
}

function normalizeLayer(
  value: unknown,
): string | null {
  const layer = safeString(value);

  return layer.length > 0
    ? layer
    : null;
}

function isValidTrace(
  trace: RuntimeTraceInput,
): boolean {
  return (
    trace.status === "valid" ||
    trace.status === "observed"
  );
}

function isUnavailableTrace(
  trace: RuntimeTraceInput,
): boolean {
  return trace.status === "unavailable";
}

function aggregateStatus(
  items: readonly LineageReconciliationItem[],
  unexpectedCount: number,
): LineageReconciliationStatus {
  if (
    items.some(
      (item) =>
        item.is_applicable &&
        item.status === "BLOCKED",
    ) ||
    unexpectedCount > 0
  ) {
    return "BLOCKED";
  }

  if (
    items.some(
      (item) =>
        item.is_applicable &&
        item.status === "DEGRADED",
    )
  ) {
    return "DEGRADED";
  }

  return "OK";
}

/* ============================================================================
 * 3. TRACE INDEX
 * ========================================================================== */

type TraceIndex = {
  byVariable: Map<string, RuntimeTraceInput[]>;
  observedVariables: string[];
  observedLayers: string[];
};

function buildTraceIndex(
  traces: readonly RuntimeTraceInput[],
): TraceIndex {
  const byVariable =
    new Map<string, RuntimeTraceInput[]>();

  const observedLayers = new Set<string>();

  for (const trace of traces) {
    const variableName =
      safeString(trace.variable_name);

    if (!variableName) {
      continue;
    }

    const current =
      byVariable.get(variableName) ?? [];

    current.push(trace);

    byVariable.set(
      variableName,
      current,
    );

    const layer =
      normalizeLayer(trace.layer);

    if (layer) {
      observedLayers.add(layer);
    }
  }

  return {
    byVariable,

    observedVariables: sortStrings(
      [...byVariable.keys()],
    ),

    observedLayers: sortStrings(
      [...observedLayers],
    ),
  };
}

/* ============================================================================
 * 4. EXECUTION SCOPE
 * ========================================================================== */

function resolveExecutedLayers(input: {
  explicitLayers: readonly VariableOwnerLayer[] | undefined;
  traceIndex: TraceIndex;
}): Set<string> {

  if (
    Array.isArray(input.explicitLayers) &&
    input.explicitLayers.length > 0
  ) {
    return new Set(
      input.explicitLayers,
    );
  }

  return new Set(
    input.traceIndex.observedLayers,
  );
}

function isEntryApplicable(input: {
  entry: VariableLineageEntry;
  executedLayers: ReadonlySet<string>;
  requiredVariables: ReadonlySet<string> | null;
}): boolean {
  if (
    input.entry.lineage_status !== "ACTIVE"
  ) {
    return false;
  }

  /*
   * A strict variable scope takes priority.
   */
  if (input.requiredVariables) {
    return input.requiredVariables.has(
      input.entry.variable_name,
    );
  }

  /*
   * Default runtime rule:
   * the owner must have participated in the run.
   *
   * A downstream layer merely appearing in the propagation path
   * does not make the variable mandatory.
   */
  return input.executedLayers.has(
    input.entry.ownership_layer,
  );
}

/* ============================================================================
 * 5. RECONCILIATION ITEM
 * ========================================================================== */

function reconcileEntry(input: {
  entry: VariableLineageEntry;
  traces: readonly RuntimeTraceInput[];
  applicable: boolean;
}): LineageReconciliationItem {
  const validTraces =
    input.traces.filter(isValidTrace);

  const unavailableTraces =
    input.traces.filter(isUnavailableTrace);

  const observedLayers = sortStrings(
    uniqueStrings(
      validTraces
        .map((trace) =>
          normalizeLayer(trace.layer),
        )
        .filter(
          (layer): layer is string =>
            layer !== null,
        ),
    ),
  );

  const expectedLayers = [
    ...input.entry.propagation_path,
  ];

  const ownershipLayer =
    input.entry.ownership_layer;

  const isObserved =
    observedLayers.length > 0;

  const ownerLayerObserved =
    observedLayers.includes(
      ownershipLayer,
    );

  const expectedLayerSet =
    new Set<string>(expectedLayers);

  /*
   * This is the only layer-level propagation violation:
   * the variable appeared outside its governed path.
   *
   * Missing intermediate layers are not automatically failures.
   */
  const unexpectedLayers =
    observedLayers.filter(
      (layer) =>
        !expectedLayerSet.has(layer),
    );

  const issues:
    LineageReconciliationIssue[] = [];

  if (
    input.applicable &&
    !isObserved
  ) {
    issues.push({
      type: "missing_variable",
      variable_name:
        input.entry.variable_name,
      expected_layer:
        ownershipLayer,
      observed_layers:
        observedLayers,
      reason:
        "required_variable_not_observed_in_runtime_traces",
    });
  }

  if (
    input.applicable &&
    isObserved &&
    !ownerLayerObserved
  ) {
    issues.push({
      type: "missing_owner_layer",
      variable_name:
        input.entry.variable_name,
      expected_layer:
        ownershipLayer,
      observed_layers:
        observedLayers,
      reason:
        "owner_layer_not_observed_for_applicable_variable",
    });
  }

  if (
    unexpectedLayers.length > 0
  ) {
    issues.push({
      type: "unexpected_layer",
      variable_name:
        input.entry.variable_name,
      expected_layer:
        ownershipLayer,
      observed_layers:
        observedLayers,
      reason:
        `variable_observed_outside_governed_path:${unexpectedLayers.join(",")}`,
    });
  }

  if (
    input.applicable &&
    unavailableTraces.length > 0
  ) {
    issues.push({
      type: "unavailable_trace",
      variable_name:
        input.entry.variable_name,
      expected_layer:
        ownershipLayer,
      observed_layers:
        observedLayers,
      reason:
        `unavailable_trace_count:${unavailableTraces.length}`,
    });
  }

  let status:
    LineageReconciliationStatus = "OK";

  if (
    input.applicable &&
    (
      !isObserved ||
      !ownerLayerObserved
    )
  ) {
    status = "BLOCKED";
  } else if (
    unexpectedLayers.length > 0 ||
    (
      input.applicable &&
      unavailableTraces.length > 0
    )
  ) {
    status = "DEGRADED";
  }

  return {
    variable_name:
      input.entry.variable_name,

    ownership_layer:
      ownershipLayer,

    expected_layers:
      expectedLayers,

    observed_layers:
      observedLayers,

    is_applicable:
      input.applicable,

    is_observed:
      isObserved,

    owner_layer_observed:
      ownerLayerObserved,

    unavailable_count:
      unavailableTraces.length,

    status,
    issues,
  };
}

/* ============================================================================
 * 6. PUBLIC API
 * ========================================================================== */

export function reconcileLineage(
  input: ReconcileLineageInput,
): LineageReconciliationResult {
  const traces =
    normalizeTraces(input.traces);

  const registry =
    input.registry ??
    listVariableLineageEntries();

  const traceIndex =
    buildTraceIndex(traces);

  const executedLayers =
    resolveExecutedLayers({
      explicitLayers:
        input.executed_layers,
      traceIndex,
    });

  const requiredVariables =
    Array.isArray(input.required_variables)
      ? new Set(
          uniqueStrings(
            input.required_variables,
          ),
        )
      : null;

  const registryNames = new Set(
    registry.map(
      (entry) =>
        entry.variable_name,
    ),
  );

  const items = registry.map(
    (entry) => {
      const applicable =
        isEntryApplicable({
          entry,
          executedLayers,
          requiredVariables,
        });

      return reconcileEntry({
        entry,

        traces:
          traceIndex.byVariable.get(
            entry.variable_name,
          ) ?? [],

        applicable,
      });
    },
  );

  const unexpectedVariables =
    traceIndex.observedVariables.filter(
      (variableName) =>
        !registryNames.has(variableName),
    );

  const applicableItems =
    items.filter(
      (item) =>
        item.is_applicable,
    );

  const missingCount =
    applicableItems.filter(
      (item) =>
        item.issues.some(
          (issue) =>
            issue.type ===
            "missing_variable",
        ),
    ).length;

  const degradedCount =
    applicableItems.filter(
      (item) =>
        item.status === "DEGRADED",
    ).length;

  const blockedCount =
    applicableItems.filter(
      (item) =>
        item.status === "BLOCKED",
    ).length;

  const notApplicableCount =
    items.length -
    applicableItems.length;

  const status =
    aggregateStatus(
      applicableItems,
      unexpectedVariables.length,
    );

  const issues =
    applicableItems.flatMap(
      (item) =>
        item.issues,
    );

  const firstIssue =
    issues[0] ??
    (
      unexpectedVariables[0]
        ? {
            type:
              "unexpected_variable" as const,

            variable_name:
              unexpectedVariables[0],

            expected_layer:
              null,

            observed_layers:
              traceIndex.byVariable
                .get(
                  unexpectedVariables[0],
                )
                ?.map(
                  (trace) =>
                    String(trace.layer),
                ) ?? [],

            reason:
              "runtime_variable_not_declared_in_registry",
          }
        : null
    );

  const warnings =
    uniqueStrings([
      ...(missingCount > 0
        ? [
            `lineage_reconciliation_missing:${missingCount}`,
          ]
        : []),

      ...(degradedCount > 0
        ? [
            `lineage_reconciliation_degraded:${degradedCount}`,
          ]
        : []),

      ...(blockedCount > 0
        ? [
            `lineage_reconciliation_blocked:${blockedCount}`,
          ]
        : []),

      ...(unexpectedVariables.length > 0
        ? [
            `lineage_reconciliation_unexpected:${unexpectedVariables.length}`,
          ]
        : []),
    ]);

  if (
    process.env.NODE_ENV !==
      "production" &&
    status !== "OK"
  ) {
    console.log(
      "XYVALA_LINEAGE_RECONCILIATION_AUDIT",
      {
        status,

        registry_count:
          registry.length,

        applicable_count:
          applicableItems.length,

        not_applicable_count:
          notApplicableCount,

        executed_layers:
          sortStrings(
            [...executedLayers],
          ),

        observed_variable_count:
          traceIndex
            .observedVariables
            .length,

        missing_count:
          missingCount,

        degraded_count:
          degradedCount,

        blocked_count:
          blockedCount,

        unexpected_count:
          unexpectedVariables.length,

        missing_variables:
          applicableItems
            .filter(
              (item) =>
                !item.is_observed,
            )
            .map(
              (item) => ({
                variable_name:
                  item.variable_name,

                ownership_layer:
                  item.ownership_layer,

                expected_layers:
                  item.expected_layers,

                observed_layers:
                  item.observed_layers,

                reason:
                  item.issues[0]
                    ?.reason ??
                  "missing_reason",
              }),
            ),

        blocked_variables:
          applicableItems
            .filter(
              (item) =>
                item.status ===
                "BLOCKED",
            )
            .map(
              (item) => ({
                variable_name:
                  item.variable_name,

                ownership_layer:
                  item.ownership_layer,

                expected_layers:
                  item.expected_layers,

                observed_layers:
                  item.observed_layers,

                issues:
                  item.issues,
              }),
            ),

        unexpected_variables:
          unexpectedVariables,

        first_issue:
          firstIssue,
      },
    );
  }

  return {
    ok: status === "OK",
    status,

    registry_count:
      registry.length,

    applicable_count:
      applicableItems.length,

    observed_variable_count:
      traceIndex
        .observedVariables
        .length,

    reconciled_count:
      applicableItems.length,

    missing_count:
      missingCount,

    degraded_count:
      degradedCount,

    blocked_count:
      blockedCount,

    unexpected_count:
      unexpectedVariables.length,

    not_applicable_count:
      notApplicableCount,

    first_issue:
      firstIssue,

    items,

    unexpected_variables:
      unexpectedVariables,

    warnings,

    error:
      status === "OK"
        ? null
        : "lineage_reconciliation_not_fully_compliant",
  };
}
