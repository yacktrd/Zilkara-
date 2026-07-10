/* ============================================================================
 * FILE: lib/xyvala/governance/traceability-coverage.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala traceability coverage system
 *
 * ROLE
 * - compare official variable lineage registry with observed runtime traces
 * - measure real traceability coverage
 * - detect missing, orphan and unobserved variables
 * - provide deterministic coverage diagnostics without mutation
 *
 * DIRECTIVES
 * - governance coverage only
 * - observe / compute layer only
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
 *
 * INPUTS
 * - RuntimeTraceInput[]
 * - optional lineage registry
 *
 * OUTPUTS
 * - TraceabilityCoverageReport
 *
 * INVARIANTS
 * - coverage never creates analytical truth
 * - coverage never mutates runtime state
 * - registry is the expected truth model
 * - runtime traces are the observed truth model
 * - missing variables must remain explicit
 *
 * CRITICAL DEPENDENCIES
 * - VARIABLE_LINEAGE_REGISTRY
 * - RuntimeTraceInput
 *
 * SENSITIVE ZONES
 * - private variable coverage
 * - public exposure coverage
 * - orphan runtime traces
 * - missing critical truths
 * ========================================================================== */

import {
  VARIABLE_LINEAGE_REGISTRY,
} from "@/lib/xyvala/governance/variable-lineage-registry";

import type {
  RuntimeTraceInput,
} from "@/lib/xyvala/governance/runtime-traceability";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type TraceabilityCoverageStatus =
  | "complete"
  | "partial"
  | "weak"
  | "empty"
  | "invalid";

export type TraceabilityCoverageSeverity =
  | "none"
  | "minor"
  | "major"
  | "critical";

export type TraceabilityCoverageRegistryEntry = {
  variable_name: string;
  criticality_level: string;
  exposure_level: string;
  public_exposure_allowed: boolean;
  validation_required: boolean;
};

export type TraceabilityCoverageReport = {
  ok: boolean;
  status: TraceabilityCoverageStatus;
  severity: TraceabilityCoverageSeverity;

  expected_variables_count: number;
  observed_variables_count: number;
  traced_variables_count: number;

  missing_variables_count: number;
  orphan_variables_count: number;
  unavailable_variables_count: number;

  coverage_pct: number;

  missing_variables: string[];
  orphan_variables: string[];
  unavailable_variables: string[];

  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function normalizeRegistry(input: unknown): TraceabilityCoverageRegistryEntry[] {
  const values = Array.isArray(input)
    ? input
    : isPlainObject(input)
      ? Object.values(input)
      : [];

  return values.filter(isRegistryEntry);
}

function isRegistryEntry(
  value: unknown,
): value is TraceabilityCoverageRegistryEntry {
  if (!isPlainObject(value)) return false;

  return (
    isNonEmptyString(value.variable_name) &&
    isNonEmptyString(value.criticality_level) &&
    isNonEmptyString(value.exposure_level) &&
    isBoolean(value.public_exposure_allowed) &&
    isBoolean(value.validation_required)
  );
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set([...values].filter(isNonEmptyString))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function roundPct(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.round(value * 100) / 100;
}

function severityFromMissingCritical(
  missing: readonly TraceabilityCoverageRegistryEntry[],
): TraceabilityCoverageSeverity {
  if (
    missing.some(
      (entry) =>
        entry.criticality_level === "Core Truth" ||
        entry.criticality_level === "CORE_TRUTH",
    )
  ) {
    return "critical";
  }

  if (
    missing.some(
      (entry) =>
        entry.criticality_level === "Structural Support" ||
        entry.criticality_level === "STRUCTURAL_SUPPORT" ||
        entry.criticality_level === "Aggregated Context" ||
        entry.criticality_level === "AGGREGATED_CONTEXT",
    )
  ) {
    return "major";
  }

  return missing.length > 0 ? "minor" : "none";
}

function resolveStatus(input: {
  expectedCount: number;
  coveragePct: number;
  missingCount: number;
  orphanCount: number;
  unavailableCount: number;
}): TraceabilityCoverageStatus {
  if (input.expectedCount === 0) return "invalid";

  if (
    input.coveragePct === 100 &&
    input.missingCount === 0 &&
    input.orphanCount === 0 &&
    input.unavailableCount === 0
  ) {
    return "complete";
  }

  if (input.coveragePct >= 80) return "partial";
  if (input.coveragePct > 0) return "weak";

  return "empty";
}

function severityFromStatus(
  status: TraceabilityCoverageStatus,
  missingSeverity: TraceabilityCoverageSeverity,
): TraceabilityCoverageSeverity {
  if (status === "invalid") return "critical";
  if (missingSeverity === "critical") return "critical";
  if (missingSeverity === "major") return "major";
  if (status === "empty") return "critical";
  if (status === "weak") return "major";
  if (status === "partial") return "minor";

  return "none";
}

/* ============================================================================
 * 3. COVERAGE BUILDER
 * ========================================================================== */

export function buildTraceabilityCoverageReport(input: {
  traces: readonly RuntimeTraceInput[];
  registry?: unknown;
}): TraceabilityCoverageReport {
  const registryEntries = normalizeRegistry(
    input.registry ?? VARIABLE_LINEAGE_REGISTRY,
  );

  if (registryEntries.length === 0) {
    return {
      ok: false,
      status: "invalid",
      severity: "critical",

      expected_variables_count: 0,
      observed_variables_count: 0,
      traced_variables_count: 0,

      missing_variables_count: 0,
      orphan_variables_count: 0,
      unavailable_variables_count: 0,

      coverage_pct: 0,

      missing_variables: [],
      orphan_variables: [],
      unavailable_variables: [],

      warnings: ["traceability_coverage_registry_empty_or_invalid"],
      error: "traceability_coverage_invalid_registry",
    };
  }

  const expectedNames = new Set(
    registryEntries.map((entry) => entry.variable_name),
  );

  const observedNames = new Set(
    input.traces
      .map((trace) => trace.variable_name)
      .filter(isNonEmptyString),
  );

  const tracedNames = new Set(
    input.traces
      .filter((trace) => trace.status === "valid" || trace.status === "degraded")
      .map((trace) => trace.variable_name)
      .filter(isNonEmptyString),
  );

  const unavailableNames = uniqueSorted(
    input.traces
      .filter(
        (trace) =>
          trace.status === "missing" ||
          trace.status === "invalid" ||
          trace.status === "unavailable" ||
          trace.status === "not_observed",
      )
      .map((trace) => trace.variable_name),
  );

  const missingEntries = registryEntries.filter(
    (entry) => !tracedNames.has(entry.variable_name),
  );

  const missingVariables = uniqueSorted(
    missingEntries.map((entry) => entry.variable_name),
  );

  const orphanVariables = uniqueSorted(
    [...observedNames].filter((name) => !expectedNames.has(name)),
  );

  const coveragePct =
    registryEntries.length > 0
      ? roundPct((tracedNames.size / registryEntries.length) * 100)
      : 0;

  const status = resolveStatus({
    expectedCount: registryEntries.length,
    coveragePct,
    missingCount: missingVariables.length,
    orphanCount: orphanVariables.length,
    unavailableCount: unavailableNames.length,
  });

  const missingSeverity = severityFromMissingCritical(missingEntries);
  const severity = severityFromStatus(status, missingSeverity);

  const warnings = uniqueSorted([
    ...(missingVariables.length > 0
      ? [`traceability_missing_variables:${missingVariables.length}`]
      : []),
    ...(orphanVariables.length > 0
      ? [`traceability_orphan_variables:${orphanVariables.length}`]
      : []),
    ...(unavailableNames.length > 0
      ? [`traceability_unavailable_variables:${unavailableNames.length}`]
      : []),
  ]);

  return {
    ok: status === "complete",
    status,
    severity,

    expected_variables_count: registryEntries.length,
    observed_variables_count: observedNames.size,
    traced_variables_count: tracedNames.size,

    missing_variables_count: missingVariables.length,
    orphan_variables_count: orphanVariables.length,
    unavailable_variables_count: unavailableNames.length,

    coverage_pct: coveragePct,

    missing_variables: missingVariables,
    orphan_variables: orphanVariables,
    unavailable_variables: unavailableNames,

    warnings,
    error: status === "complete" ? null : `traceability_coverage_${status}`,
  };
}

export function assertTraceabilityCoverageComplete(input: {
  traces: readonly RuntimeTraceInput[];
  registry?: unknown;
}): void {
  const report = buildTraceabilityCoverageReport(input);

  if (!report.ok) {
    throw new Error(
      `traceability_coverage_incomplete:${[
        report.status,
        report.severity,
        report.coverage_pct,
      ].join(":")}`,
    );
  }
}
