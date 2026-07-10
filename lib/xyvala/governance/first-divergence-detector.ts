/* ============================================================================
 * FILE: lib/xyvala/governance/first-divergence-detector.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala first divergence detector
 *
 * ROLE
 * - apply the official First Divergence Rule
 * - identify the first validated propagation rupture
 * - locate the last valid layer and the first invalid layer
 * - qualify the impacted boundary, variable and severity
 *
 * PARENTS
 * - lib/xyvala/governance/variable-lineage-registry.ts
 * - lib/xyvala/governance/propagation-audit.ts
 * - lib/xyvala/governance/boundary-protection.ts
 * - lib/xyvala/governance/runtime-traceability.ts
 *
 * DIRECTIVES
 * - governance diagnostic only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no snapshot mutation
 * - no API logic
 * - no UI logic
 * - no runtime mutation
 * - deterministic output only
 * - same input => same divergence result
 *
 * INPUTS
 * - runtime trace inputs
 * - optional registry
 *
 * OUTPUTS
 * - first divergence diagnostic
 * - deterministic divergence report
 *
 * INVARIANTS
 * - first divergence has priority over downstream symptoms
 * - diagnostics never mutate runtime state
 * - missing data must be qualified explicitly
 * - boundary violations must remain traceable
 *
 * CRITICAL DEPENDENCIES
 * - auditVariablePropagation
 * - buildRuntimeTraceabilityReport
 *
 * SENSITIVE ZONES
 * - first divergence selection
 * - severity ordering
 * - boundary attribution
 * ========================================================================== */

import {
  auditVariablePropagation,
  type PropagationAuditResult,
  type PropagationDivergence,
} from "@/lib/xyvala/governance/propagation-audit";

import {
  buildRuntimeTraceabilityReport,
  type RuntimeTraceInput,
  type RuntimeTraceabilityReport,
} from "@/lib/xyvala/governance/runtime-traceability";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type FirstDivergenceSeverity =
  | "critical"
  | "major"
  | "minor"
  | "none";

export type FirstDivergenceStatus =
  | "detected"
  | "none"
  | "audit_unavailable";

export type FirstDivergenceDiagnostic = {
  status: FirstDivergenceStatus;
  variable_name: string | null;
  severity: FirstDivergenceSeverity;
  last_valid_layer: string | null;
  first_invalid_layer: string | null;
  boundary: string | null;
  reason: string | null;
};

export type FirstDivergenceReport = {
  ok: boolean;
  diagnostic: FirstDivergenceDiagnostic;
  traceability: RuntimeTraceabilityReport;
  audit: PropagationAuditResult;
  warnings: string[];
};

/* ============================================================================
 * 2. CONSTANTS
 * ========================================================================== */

const SEVERITY_RANK: Record<FirstDivergenceSeverity, number> = {
  critical: 3,
  major: 2,
  minor: 1,
  none: 0,
};

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function normalizeSeverity(value: unknown): FirstDivergenceSeverity {
  if (value === "critical") return "critical";
  if (value === "major") return "major";
  if (value === "minor") return "minor";

  return "none";
}

function safeStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
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

/* ============================================================================
 * 4. DIVERGENCE SELECTION
 * ========================================================================== */

function compareDivergence(
  left: PropagationDivergence,
  right: PropagationDivergence,
): number {
  const leftSeverity = normalizeSeverity(left.severity);
  const rightSeverity = normalizeSeverity(right.severity);

  const severityDelta =
    SEVERITY_RANK[rightSeverity] - SEVERITY_RANK[leftSeverity];

  if (severityDelta !== 0) {
    return severityDelta;
  }

  const leftBoundary = safeStringOrNull(left.boundary) ?? "";
  const rightBoundary = safeStringOrNull(right.boundary) ?? "";

  return leftBoundary.localeCompare(rightBoundary);
}

function selectFirstDivergence(
  divergences: readonly PropagationDivergence[],
): PropagationDivergence | null {
  if (divergences.length === 0) {
    return null;
  }

  return [...divergences].sort(compareDivergence)[0] ?? null;
}

function buildEmptyDiagnostic(): FirstDivergenceDiagnostic {
  return {
    status: "none",
    variable_name: null,
    severity: "none",
    last_valid_layer: null,
    first_invalid_layer: null,
    boundary: null,
    reason: null,
  };
}

function buildDiagnosticFromDivergence(
  divergence: PropagationDivergence,
): FirstDivergenceDiagnostic {
  return {
    status: "detected",
    variable_name: divergence.variable_name,
    severity: normalizeSeverity(divergence.severity),
    last_valid_layer: safeStringOrNull(divergence.last_valid_layer),
    first_invalid_layer: safeStringOrNull(divergence.first_invalid_layer),
    boundary: safeStringOrNull(divergence.boundary),
    reason: safeStringOrNull(divergence.reason),
  };
}

/* ============================================================================
 * 5. PUBLIC DETECTOR API
 * ========================================================================== */

export function detectFirstDivergence(input: {
  traces: readonly RuntimeTraceInput[];
  registry?: unknown;
}): FirstDivergenceReport {
  const traceability = buildRuntimeTraceabilityReport(input.traces);

  const audit = auditVariablePropagation({
    observed: traceability.observed,
    ...(input.registry !== undefined
      ? {
          registry: input.registry,
        }
      : {}),
  });

  const warnings = uniqueWarnings(traceability.warnings, audit.warnings);

  if (audit.divergences.length === 0) {
    return {
      ok: warnings.length === 0,
      diagnostic: buildEmptyDiagnostic(),
      traceability,
      audit,
      warnings,
    };
  }

  const firstDivergence = selectFirstDivergence(audit.divergences);

  if (!firstDivergence) {
    return {
      ok: false,
      diagnostic: {
        status: "audit_unavailable",
        variable_name: null,
        severity: "none",
        last_valid_layer: null,
        first_invalid_layer: null,
        boundary: null,
        reason: "first_divergence_selection_failed",
      },
      traceability,
      audit,
      warnings: uniqueWarnings(warnings, [
        "first_divergence_selection_failed",
      ]),
    };
  }

  return {
    ok: false,
    diagnostic: buildDiagnosticFromDivergence(firstDivergence),
    traceability,
    audit,
    warnings,
  };
}

export function assertNoFirstDivergence(input: {
  traces: readonly RuntimeTraceInput[];
  registry?: unknown;
}): void {
  const report = detectFirstDivergence(input);

  if (!report.ok) {
    throw new Error(
      `first_divergence_detected:${[
        report.diagnostic.variable_name ?? "unknown_variable",
        report.diagnostic.boundary ?? "unknown_boundary",
        report.diagnostic.reason ?? "unknown_reason",
      ].join(":")}`,
    );
  }
}
