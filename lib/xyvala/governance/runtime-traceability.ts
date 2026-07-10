/* ============================================================================
 * FILE: lib/xyvala/governance/runtime-traceability.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala runtime traceability system
 *
 * ROLE
 * - record deterministic runtime propagation traces
 * - track critical variable movement across official Xyvala layers
 * - prepare observed propagation states for propagation audit
 * - support first divergence diagnostics without mutating analytical truth
 *
 * PARENTS
 * - lib/xyvala/governance/variable-lineage-registry.ts
 * - lib/xyvala/governance/propagation-audit.ts
 * - lib/xyvala/governance/boundary-protection.ts
 *
 * DIRECTIVES
 * - runtime trace construction only
 * - observe only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no snapshot mutation
 * - no API logic
 * - no UI logic
 * - no runtime governance mutation
 * - deterministic trace normalization only
 *
 * INPUTS
 * - variable name
 * - official owner layer
 * - propagation status
 * - optional source reference
 *
 * OUTPUTS
 * - runtime trace event
 * - observed variable propagation
 * - traceability report
 *
 * INVARIANTS
 * - VariableOwnerLayer is the single layer source of truth
 * - traceability records observations only
 * - traceability never creates analytical truth
 * - missing values must remain explicit
 * - same trace input => same normalized trace output
 * ========================================================================== */

import type {
  ObservedVariablePropagation,
  PropagationStatus,
} from "@/lib/xyvala/governance/propagation-audit";

import type {
  VariableOwnerLayer,
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

export type RuntimeTraceEvent = {
  variable_name: string;
  layer: VariableOwnerLayer;
  status: PropagationStatus;
  source: RuntimeTraceSource;
  reference: string | null;
  reason: string | null;
};

export type RuntimeTraceInput = {
  variable_name: string;
  layer: VariableOwnerLayer;
  status: PropagationStatus;
  source: RuntimeTraceSource;
  reference?: string | null;
  reason?: string | null;
};

export type RuntimeTraceabilityReport = {
  ok: boolean;
  trace_count: number;
  variable_count: number;
  observed: ObservedVariablePropagation[];
  warnings: string[];
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableString(value: unknown): string | null {
  const normalized = safeString(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeSource(value: unknown): RuntimeTraceSource {
  if (value === "engine") return "engine";
  if (value === "mapper") return "mapper";
  if (value === "transformer") return "transformer";
  if (value === "snapshot") return "snapshot";
  if (value === "api") return "api";
  if (value === "interface") return "interface";
  if (value === "governance") return "governance";

  return "unknown";
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  return [
    ...new Set(
      groups
        .flatMap((group) => (Array.isArray(group) ? group : []))
        .filter((item): item is string => safeString(item).length > 0),
    ),
  ];
}

/* ============================================================================
 * 3. TRACE NORMALIZATION
 * ========================================================================== */

export function buildRuntimeTraceEvent(
  input: RuntimeTraceInput,
): RuntimeTraceEvent {
  return {
    variable_name: safeString(input.variable_name),
    layer: input.layer,
    status: input.status,
    source: normalizeSource(input.source),
    reference: nullableString(input.reference),
    reason: nullableString(input.reason),
  };
}

export function buildRuntimeTraceEvents(
  inputs: readonly RuntimeTraceInput[],
): RuntimeTraceEvent[] {
  return inputs
    .map(buildRuntimeTraceEvent)
    .filter((event) => event.variable_name.length > 0);
}

/* ============================================================================
 * 4. OBSERVED PROPAGATION BUILDER
 * ========================================================================== */

export function buildObservedPropagation(
  traces: readonly RuntimeTraceEvent[],
): ObservedVariablePropagation[] {
  const observedByVariable =
    new Map<string, ObservedVariablePropagation>();

  for (const trace of traces) {
    const current =
      observedByVariable.get(trace.variable_name) ?? {
        variable_name: trace.variable_name,
        layers: {},
      };

    current.layers[trace.layer] = trace.status;
    observedByVariable.set(trace.variable_name, current);
  }

  return [...observedByVariable.values()];
}

/* ============================================================================
 * 5. TRACEABILITY REPORT
 * ========================================================================== */

export function buildRuntimeTraceabilityReport(
  inputs: readonly RuntimeTraceInput[],
): RuntimeTraceabilityReport {
  const traces = buildRuntimeTraceEvents(inputs);
  const observed = buildObservedPropagation(traces);

  const warnings = uniqueWarnings(
    inputs.length !== traces.length
      ? ["runtime_traceability_rejected_empty_variable"]
      : [],
  );

  return {
    ok: warnings.length === 0,
    trace_count: traces.length,
    variable_count: observed.length,
    observed,
    warnings,
  };
}

export function assertRuntimeTraceabilityValid(
  inputs: readonly RuntimeTraceInput[],
): void {
  const result = buildRuntimeTraceabilityReport(inputs);

  if (!result.ok) {
    throw new Error(
      `runtime_traceability_invalid:${result.warnings.join(",")}`,
    );
  }
}
