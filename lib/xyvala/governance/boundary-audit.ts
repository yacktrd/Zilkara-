/* ============================================================================
 * FILE: lib/xyvala/governance/boundary-audit.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala boundary audit engine
 *
 * ROLE
 * - audit variable propagation across official Xyvala boundaries
 * - compare expected variables with observed runtime traces
 * - identify missing and unexpected variables by boundary
 * - support First Divergence Rule and Boundary Protection System
 *
 * PARENTS
 * - lib/xyvala/governance/runtime-traceability.ts
 * - lib/xyvala/governance/variable-lineage-registry.ts
 *
 * DIRECTIVES
 * - governance observation only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no snapshot generation
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
 * - BoundaryAuditResult
 *
 * INVARIANTS
 * - audit never creates analytical truth
 * - audit never reconstructs missing variables
 * - audit never mutates runtime state
 * - missing variables remain explicit
 * - first degraded boundary remains observable
 *
 * CRITICAL DEPENDENCIES
 * - RuntimeTraceInput
 * - VARIABLE_LINEAGE_REGISTRY
 *
 * SENSITIVE ZONES
 * - private analytical variables
 * - public/private boundary
 * - snapshot boundary
 * - API exposure boundary
 * ========================================================================== */

import type {
  RuntimeTraceInput,
} from "@/lib/xyvala/governance/runtime-traceability";

import {
  listVariableLineageEntries,
  type VariableOwnerLayer,
} from "@/lib/xyvala/governance/variable-lineage-registry";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type BoundaryAuditStatus = "OK" | "DEGRADED" | "BLOCKED";

export type BoundaryId =
  | "ACQUISITION_TO_RFS"
  | "RFS_TO_TRIPLE_LAYER"
  | "TRIPLE_LAYER_TO_IMPULSE_LAYER"
  | "IMPULSE_LAYER_TO_ANALYTICAL_AGGREGATION_SYSTEM"
  | "ANALYTICAL_AGGREGATION_SYSTEM_TO_MCI"
  | "MCI_TO_CALIBRATION"
  | "CALIBRATION_TO_SNAPSHOT"
  | "SNAPSHOT_TO_TRANSFORMER"
  | "TRANSFORMER_TO_API"
  | "API_TO_INTERFACE";

export type BoundaryDefinition = {
  id: BoundaryId;
  from: VariableOwnerLayer;
  to: VariableOwnerLayer;
};

export type BoundaryAuditItem = {
  boundary: BoundaryId;
  from: VariableOwnerLayer;
  to: VariableOwnerLayer;
  expected_variables: string[];
  observed_variables: string[];
  missing_variables: string[];
  unexpected_variables: string[];
  status: BoundaryAuditStatus;
  warnings: string[];
};

export type BoundaryAuditResult = {
  ok: boolean;
  status: BoundaryAuditStatus;
  boundary_count: number;
  degraded_count: number;
  blocked_count: number;
  first_degraded_boundary: BoundaryAuditItem | null;
  boundaries: BoundaryAuditItem[];
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. OFFICIAL BOUNDARIES
 * ========================================================================== */

const OFFICIAL_BOUNDARIES: readonly BoundaryDefinition[] = Object.freeze([
  {
    id: "ACQUISITION_TO_RFS",
    from: "ACQUISITION",
    to: "RFS",
  },
  {
    id: "RFS_TO_TRIPLE_LAYER",
    from: "RFS",
    to: "TRIPLE_LAYER",
  },
  {
    id: "TRIPLE_LAYER_TO_IMPULSE_LAYER",
    from: "TRIPLE_LAYER",
    to: "IMPULSE_LAYER",
  },
  {
    id: "IMPULSE_LAYER_TO_ANALYTICAL_AGGREGATION_SYSTEM",
    from: "IMPULSE_LAYER",
    to: "ANALYTICAL_AGGREGATION_SYSTEM",
  },
  {
    id: "ANALYTICAL_AGGREGATION_SYSTEM_TO_MCI",
    from: "ANALYTICAL_AGGREGATION_SYSTEM",
    to: "MCI",
  },
  {
    id: "MCI_TO_CALIBRATION",
    from: "MCI",
    to: "CALIBRATION",
  },
  {
    id: "CALIBRATION_TO_SNAPSHOT",
    from: "CALIBRATION",
    to: "SNAPSHOT",
  },
  {
    id: "SNAPSHOT_TO_TRANSFORMER",
    from: "SNAPSHOT",
    to: "TRANSFORMER",
  },
  {
    id: "TRANSFORMER_TO_API",
    from: "TRANSFORMER",
    to: "API",
  },
  {
    id: "API_TO_INTERFACE",
    from: "API",
    to: "INTERFACE",
  },
]);

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function sortStrings(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function toTraceLayer(value: VariableOwnerLayer): RuntimeTraceInput["layer"] {
  return value as RuntimeTraceInput["layer"];
}

function hasValidTraceStatus(trace: RuntimeTraceInput): boolean {
  return trace.status === "valid" || trace.status === "observed";
}

function boundaryStatus(input: {
  expected: readonly string[];
  missing: readonly string[];
}): BoundaryAuditStatus {
  if (input.expected.length === 0) return "OK";
  if (input.missing.length === 0) return "OK";
  if (input.missing.length === input.expected.length) return "BLOCKED";

  return "DEGRADED";
}

function aggregateStatus(items: readonly BoundaryAuditItem[]): BoundaryAuditStatus {
  if (items.some((item) => item.status === "BLOCKED")) return "BLOCKED";
  if (items.some((item) => item.status === "DEGRADED")) return "DEGRADED";

  return "OK";
}

/* ============================================================================
 * 4. EXPECTED / OBSERVED RESOLUTION
 * ========================================================================== */

function expectedVariablesForBoundary(
  boundary: BoundaryDefinition,
): string[] {
  const variables = listVariableLineageEntries()
    .filter((entry) => {
      const fromIndex = entry.propagation_path.indexOf(boundary.from);
      const toIndex = entry.propagation_path.indexOf(boundary.to);

      return fromIndex >= 0 &&
  toIndex >= 0 &&
  toIndex === fromIndex + 1;
    })
    .map((entry) => entry.variable_name);

  return sortStrings(uniqueStrings(variables));
}

function observedVariablesForLayer(input: {
  traces: readonly RuntimeTraceInput[];
  layer: VariableOwnerLayer;
}): string[] {
  const layer = toTraceLayer(input.layer);

  const variables = input.traces
    .filter((trace) => trace.layer === layer)
    .filter(hasValidTraceStatus)
    .map((trace) => trace.variable_name);

  return sortStrings(uniqueStrings(variables));
}

function resolvePropagatedExpectedVariables(input: {
  theoretical_expected: readonly string[];
  source_observed: readonly string[];
}): string[] {
  const theoretical = new Set(input.theoretical_expected);

  return sortStrings(
    uniqueStrings(
      input.source_observed.filter((variable) => theoretical.has(variable)),
    ),
  );
}

function resolveMissingVariables(input: {
  expected: readonly string[];
  observed: readonly string[];
}): string[] {
  const observed = new Set(input.observed);

  return input.expected.filter((variable) => !observed.has(variable));
}

function resolveUnexpectedVariables(input: {
  theoretical_expected: readonly string[];
  source_observed: readonly string[];
  observed: readonly string[];
}): string[] {
  const expected = new Set(input.theoretical_expected);
  const sourceObserved = new Set(input.source_observed);

  return input.observed.filter(
    (variable) =>
      sourceObserved.has(variable) &&
      !expected.has(variable),
  );
}

/* ============================================================================
 * 5. BOUNDARY AUDIT
 * ========================================================================== */

function auditBoundary(input: {
  boundary: BoundaryDefinition;
  traces: readonly RuntimeTraceInput[];
}): BoundaryAuditItem {
  const theoreticalExpected = expectedVariablesForBoundary(input.boundary);

  const sourceObserved = observedVariablesForLayer({
    traces: input.traces,
    layer: input.boundary.from,
  });

  const targetObserved = observedVariablesForLayer({
    traces: input.traces,
    layer: input.boundary.to,
  });

  const expected = resolvePropagatedExpectedVariables({
    theoretical_expected: theoreticalExpected,
    source_observed: sourceObserved,
  });

  const observed = sortStrings(
    uniqueStrings(
      targetObserved.filter((variable) =>
        theoreticalExpected.includes(variable),
      ),
    ),
  );

  const missing = resolveMissingVariables({
    expected,
    observed,
  });

  const unexpected = resolveUnexpectedVariables({
  theoretical_expected: theoreticalExpected,
  source_observed: sourceObserved,
  observed: targetObserved,
});

  const status = boundaryStatus({
    expected,
    missing,
  });

  const warnings = [
    ...(missing.length > 0
      ? [`boundary_missing_variables:${input.boundary.id}:${missing.length}`]
      : []),
    ...(unexpected.length > 0
      ? [`boundary_unexpected_variables:${input.boundary.id}:${unexpected.length}`]
      : []),
  ];

  return {
    boundary: input.boundary.id,
    from: input.boundary.from,
    to: input.boundary.to,
    expected_variables: expected,
    observed_variables: observed,
    missing_variables: missing,
    unexpected_variables: unexpected,
    status,
    warnings,
  };
}

/* ============================================================================
 * 6. PUBLIC API
 * ========================================================================== */

export function auditRuntimeBoundaries(input: {
  traces?: readonly RuntimeTraceInput[];
}): BoundaryAuditResult {
  const traces = Array.isArray(input.traces) ? input.traces : [];

  const boundaries = OFFICIAL_BOUNDARIES.map((boundary) =>
    auditBoundary({
      boundary,
      traces,
    }),
  );

  const degradedCount = boundaries.filter(
    (boundary) => boundary.status === "DEGRADED",
  ).length;

  const blockedCount = boundaries.filter(
    (boundary) => boundary.status === "BLOCKED",
  ).length;

  const status = aggregateStatus(boundaries);

  const firstDegradedBoundary =
    boundaries.find((boundary) => boundary.status !== "OK") ?? null;

  return {
    ok: status === "OK",
    status,
    boundary_count: boundaries.length,
    degraded_count: degradedCount,
    blocked_count: blockedCount,
    first_degraded_boundary: firstDegradedBoundary,
    boundaries,
    warnings: uniqueStrings(boundaries.flatMap((boundary) => boundary.warnings)),
    error: status === "OK" ? null : "boundary_audit_not_fully_compliant",
  };
}
