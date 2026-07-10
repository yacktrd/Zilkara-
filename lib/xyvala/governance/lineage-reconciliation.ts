/* ============================================================================
 * FILE: lib/xyvala/governance/lineage-reconciliation.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala lineage reconciliation engine
 *
 * ROLE
 * - reconcile official variable lineage registry with observed runtime traces
 * - compare theoretical governance contracts with real trace propagation
 * - identify missing variables, unexpected variables and layer mismatches
 * - support First Divergence Rule, Boundary Audit and post-mortem diagnostics
 *
 * PARENTS
 * - lib/xyvala/governance/variable-lineage-registry.ts
 * - lib/xyvala/governance/runtime-traceability.ts
 *
 * DIRECTIVES
 * - governance reconciliation only
 * - observe only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no snapshot mutation
 * - no API logic
 * - no UI logic
 * - no cache logic
 * - no persistence
 * - no mutation
 * - deterministic output only
 *
 * INPUTS
 * - RuntimeTraceInput[]
 *
 * OUTPUTS
 * - LineageReconciliationResult
 *
 * INVARIANTS
 * - reconciliation never creates analytical truth
 * - reconciliation never reconstructs missing variables
 * - registry remains theoretical contract
 * - traces remain observed runtime truth
 * - missing propagation is explicit
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
  observed_variable_count: number;
  reconciled_count: number;
  missing_count: number;
  degraded_count: number;
  blocked_count: number;
  unexpected_count: number;
  first_issue: LineageReconciliationIssue | null;
  items: LineageReconciliationItem[];
  unexpected_variables: string[];
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function sortStrings(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function normalizeTraces(
  value: readonly RuntimeTraceInput[] | undefined,
): readonly RuntimeTraceInput[] {
  return Array.isArray(value) ? value : [];
}

function normalizeLayer(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function isValidTrace(trace: RuntimeTraceInput): boolean {
  return trace.status === "valid" || trace.status === "observed";
}

function isUnavailableTrace(trace: RuntimeTraceInput): boolean {
  return trace.status === "unavailable";
}

function aggregateStatus(
  items: readonly LineageReconciliationItem[],
  unexpectedCount: number,
): LineageReconciliationStatus {
  if (
    items.some((item) => item.status === "BLOCKED") ||
    unexpectedCount > 0
  ) {
    return "BLOCKED";
  }

  if (items.some((item) => item.status === "DEGRADED")) {
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
};

function buildTraceIndex(
  traces: readonly RuntimeTraceInput[],
): TraceIndex {
  const byVariable = new Map<string, RuntimeTraceInput[]>();

  for (const trace of traces) {
    const variableName = trace.variable_name;

    if (!variableName) {
      continue;
    }

    const current = byVariable.get(variableName) ?? [];
    current.push(trace);
    byVariable.set(variableName, current);
  }

  return {
    byVariable,
    observedVariables: sortStrings([...byVariable.keys()]),
  };
}

/* ============================================================================
 * 4. RECONCILIATION ITEM
 * ========================================================================== */

function reconcileEntry(input: {
  entry: VariableLineageEntry;
  traces: readonly RuntimeTraceInput[];
}): LineageReconciliationItem {
  const validTraces = input.traces.filter(isValidTrace);
  const unavailableTraces = input.traces.filter(isUnavailableTrace);

  const observedLayers = sortStrings(
    uniqueStrings(
      validTraces
        .map((trace) => normalizeLayer(trace.layer))
        .filter((layer): layer is string => layer !== null),
    ),
  );

  const expectedLayers = input.entry.propagation_path;
  const ownershipLayer = input.entry.ownership_layer;

  const isObserved = observedLayers.length > 0;
  const ownerLayerObserved = observedLayers.includes(ownershipLayer);

const missingLayers = expectedLayers.filter(
  (layer) => !observedLayers.includes(layer),
);

const expectedLayerSet = new Set<string>(expectedLayers);

const unexpectedLayers = observedLayers.filter(
  (layer) => !expectedLayerSet.has(layer),
);

  const issues: LineageReconciliationIssue[] = [];

    if (missingLayers.length > 0) {
    issues.push({
      type: "missing_variable",
      variable_name: input.entry.variable_name,
      expected_layer: missingLayers[0] ?? ownershipLayer,
      observed_layers: observedLayers,
      reason: `missing_expected_layers:${missingLayers.join(",")}`,
    });
  }

  if (!isObserved) {
    issues.push({
      type: "missing_variable",
      variable_name: input.entry.variable_name,
      expected_layer: ownershipLayer,
      observed_layers: observedLayers,
      reason: "variable_not_observed_in_runtime_traces",
    });
  }

  if (isObserved && !ownerLayerObserved) {
    issues.push({
      type: "missing_owner_layer",
      variable_name: input.entry.variable_name,
      expected_layer: ownershipLayer,
      observed_layers: observedLayers,
      reason: "owner_layer_not_observed_for_variable",
    });
  }

  if (unavailableTraces.length > 0) {
  issues.push({
    type: "unavailable_trace",
    variable_name: input.entry.variable_name,
    expected_layer: ownershipLayer,
    observed_layers: observedLayers,
    reason: `unavailable_trace_count:${unavailableTraces.length}`,
  });
}

  const status: LineageReconciliationStatus =
  !isObserved || !ownerLayerObserved || missingLayers.length > 0
    ? "BLOCKED"
    : unexpectedLayers.length > 0
      ? "DEGRADED"
      : "OK";
  return {
    variable_name: input.entry.variable_name,
    ownership_layer: ownershipLayer,
    expected_layers: [...expectedLayers],
    observed_layers: observedLayers,
    is_observed: isObserved,
    owner_layer_observed: ownerLayerObserved,
    unavailable_count: unavailableTraces.length,
    status,
    issues,
  };
}

/* ============================================================================
 * 5. PUBLIC API
 * ========================================================================== */

export function reconcileLineage(input: {
  traces?: readonly RuntimeTraceInput[];
  registry?: readonly VariableLineageEntry[];
}): LineageReconciliationResult {
  const traces = normalizeTraces(input.traces);
  const registry = input.registry ?? listVariableLineageEntries();



  const traceIndex = buildTraceIndex(traces);

  const registryNames = new Set(
    registry.map((entry) => entry.variable_name),
  );

  const items = registry.map((entry) =>
    reconcileEntry({
      entry,
      traces: traceIndex.byVariable.get(entry.variable_name) ?? [],
    }),
  );

  const unexpectedVariables = traceIndex.observedVariables.filter(
    (variableName) => !registryNames.has(variableName),
  );

if (process.env.NODE_ENV !== "production") {
  console.log("XYVALA_UNEXPECTED_VARIABLES", unexpectedVariables);
}

    const missingCount = items.filter((item) =>
    item.issues.some((issue) => issue.type === "missing_variable"),
  ).length;

  const degradedCount = items.filter(
    (item) => item.status === "DEGRADED",
  ).length;

  const blockedCount = items.filter(
    (item) => item.status === "BLOCKED",
  ).length;

  const status = aggregateStatus(items, unexpectedVariables.length);

  const issues = items.flatMap((item) => item.issues);

  const firstIssue =
    issues[0] ??
    (unexpectedVariables[0]
      ? {
          type: "unexpected_variable" as const,
          variable_name: unexpectedVariables[0],
          expected_layer: null,
          observed_layers:
            traceIndex.byVariable
              .get(unexpectedVariables[0])
              ?.map((trace) => String(trace.layer)) ?? [],
          reason: "runtime_variable_not_declared_in_registry",
        }
      : null);

  const warnings = uniqueStrings([
    ...(missingCount > 0
      ? [`lineage_reconciliation_missing:${missingCount}`]
      : []),
    ...(degradedCount > 0
      ? [`lineage_reconciliation_degraded:${degradedCount}`]
      : []),
    ...(blockedCount > 0
      ? [`lineage_reconciliation_blocked:${blockedCount}`]
      : []),
    ...(unexpectedVariables.length > 0
      ? [`lineage_reconciliation_unexpected:${unexpectedVariables.length}`]
      : []),
  ]);

  if (process.env.NODE_ENV !== "production" && status !== "OK") {
    console.log("XYVALA_LINEAGE_RECONCILIATION_AUDIT", {
      status,
      registry_count: registry.length,
      observed_variable_count: traceIndex.observedVariables.length,
      missing_count: missingCount,
      degraded_count: degradedCount,
      blocked_count: blockedCount,
      unexpected_count: unexpectedVariables.length,
      missing_variables: items
        .filter((item) => !item.is_observed)
        .map((item) => ({
          variable_name: item.variable_name,
          ownership_layer: item.ownership_layer,
          expected_layers: item.expected_layers,
          observed_layers: item.observed_layers,
          reason: item.issues[0]?.reason ?? "missing_reason",
        })),
      blocked_variables: items
        .filter((item) => item.status === "BLOCKED")
        .map((item) => ({
          variable_name: item.variable_name,
          ownership_layer: item.ownership_layer,
          expected_layers: item.expected_layers,
          observed_layers: item.observed_layers,
          issues: item.issues,
        })),
      unexpected_variables: unexpectedVariables,
      first_issue: firstIssue,
    });
  }


  return {
    ok: status === "OK",
    status,
    registry_count: registry.length,
    observed_variable_count: traceIndex.observedVariables.length,
    reconciled_count: items.length,
    missing_count: missingCount,
    degraded_count: degradedCount,
    blocked_count: blockedCount,
    unexpected_count: unexpectedVariables.length,
    first_issue: firstIssue,
    items,
    unexpected_variables: unexpectedVariables,
    warnings,
    error: status === "OK" ? null : "lineage_reconciliation_not_fully_compliant",
  };
}
