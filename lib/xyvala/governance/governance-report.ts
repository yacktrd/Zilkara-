/* ============================================================================
 * FILE: lib/xyvala/governance/governance-report.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala governance report system
 *
 * ROLE
 * - consolidate unified governance diagnostics into a deterministic report
 * - expose compliance summary for runtime, audit and observability layers
 * - preserve First Divergence Rule as the dominant diagnostic signal
 *
 * PARENTS
 * - lib/xyvala/governance/governance-diagnostic.ts
 * - lib/xyvala/governance/lineage-reconciliation.ts
 * - lib/xyvala/governance/runtime-traceability.ts
 *
 * DIRECTIVES
 * - governance reporting only
 * - observe only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no snapshot mutation
 * - no API logic
 * - no UI logic
 * - no runtime mutation
 * - no persistence
 * - deterministic output only
 *
 * INPUTS
 * - runtime trace inputs
 * - optional variable lineage registry
 *
 * OUTPUTS
 * - GovernanceReport
 *
 * INVARIANTS
 * - report never creates analytical truth
 * - report never reconstructs missing variables
 * - diagnostic remains the source of governance interpretation
 * - lineage reconciliation remains the source of registry/runtime comparison
 * - first divergence has priority over downstream symptoms
 * ========================================================================== */

import {
  buildGovernanceDiagnostic,
  type GovernanceDiagnosticResult,
} from "@/lib/xyvala/governance/governance-diagnostic";

import {
  reconcileLineage,
  type LineageReconciliationResult,
} from "@/lib/xyvala/governance/lineage-reconciliation";

import type {
  RuntimeTraceInput,
} from "@/lib/xyvala/governance/runtime-traceability";

import type {
  VariableLineageEntry,
} from "@/lib/xyvala/governance/variable-lineage-registry";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type GovernanceComplianceStatus =
  | "COMPLIANT"
  | "DEGRADED"
  | "NON_COMPLIANT";

export type GovernanceReportSeverity =
  | "critical"
  | "major"
  | "minor"
  | "none";

export type GovernanceReportInput = {
  traces?: readonly RuntimeTraceInput[];
  registry?: readonly VariableLineageEntry[];
};

export type GovernanceReportSummary = {
  compliance_status: GovernanceComplianceStatus;
  severity: GovernanceReportSeverity;
  registry_valid: boolean;
  diagnostic_valid: boolean;
  first_divergence_detected: boolean;
  lineage_violation_count: number;
  trace_count: number;
  missing_variable_count: number;
  unexpected_variable_count: number;
  degraded_boundary_count: number;
  blocked_boundary_count: number;
};

export type GovernanceReport = {
  ok: boolean;
  summary: GovernanceReportSummary;
  lineage: LineageReconciliationResult;
  diagnostic: GovernanceDiagnosticResult;
  warnings: string[];
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

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

function normalizeTraces(
  traces: readonly RuntimeTraceInput[] | undefined,
): readonly RuntimeTraceInput[] {
  return Array.isArray(traces) ? traces : [];
}

function severityFromDiagnostic(
  diagnostic: GovernanceDiagnosticResult,
): GovernanceReportSeverity {
  return diagnostic.summary.severity;
}

function resolveComplianceStatus(input: {
  lineage: LineageReconciliationResult;
  diagnostic: GovernanceDiagnosticResult;
}): GovernanceComplianceStatus {
  if (!input.lineage.ok || input.diagnostic.status === "BROKEN") {
    return "NON_COMPLIANT";
  }

  if (input.diagnostic.status === "DEGRADED") {
    return "DEGRADED";
  }

  return "COMPLIANT";
}

/* ============================================================================
 * 3. SUMMARY BUILDER
 * ========================================================================== */

function buildGovernanceSummary(input: {
  lineage: LineageReconciliationResult;
  diagnostic: GovernanceDiagnosticResult;
}): GovernanceReportSummary {
  return {
    compliance_status: resolveComplianceStatus(input),
    severity: severityFromDiagnostic(input.diagnostic),
    registry_valid: input.lineage.ok,
    diagnostic_valid: input.diagnostic.ok,
    first_divergence_detected:
      input.diagnostic.first_divergence.diagnostic.status === "detected",
    lineage_violation_count:
      input.lineage.blocked_count + input.lineage.unexpected_count,
    trace_count: input.diagnostic.trace_count,
    missing_variable_count:
      input.diagnostic.summary.missing_variables.length,
    unexpected_variable_count:
      input.diagnostic.summary.unexpected_variables.length,
    degraded_boundary_count:
      input.diagnostic.summary.degraded_boundaries.length,
    blocked_boundary_count:
      input.diagnostic.summary.blocked_boundaries.length,
  };
}

/* ============================================================================
 * 4. PUBLIC REPORT API
 * ========================================================================== */

export function buildGovernanceReport(
  input: GovernanceReportInput = {},
): GovernanceReport {
  const traces = normalizeTraces(input.traces);

  const lineage = reconcileLineage({
    traces,
    ...(input.registry !== undefined
      ? { registry: input.registry }
      : {}),
  });

  const diagnostic = buildGovernanceDiagnostic({
    traces,
    ...(input.registry !== undefined
      ? { registry: input.registry }
      : {}),
  });

  const summary = buildGovernanceSummary({
    lineage,
    diagnostic,
  });

  const warnings = uniqueWarnings(
    lineage.warnings,
    diagnostic.warnings,
    !lineage.ok ? ["lineage_reconciliation_not_fully_compliant"] : [],
  );

  return {
    ok: summary.compliance_status === "COMPLIANT",
    summary,
    lineage,
    diagnostic,
    warnings,
  };
}

export function assertGovernanceReportCompliant(
  input: GovernanceReportInput = {},
): void {
  const report = buildGovernanceReport(input);

  if (!report.ok) {
    throw new Error(
      `governance_report_non_compliant:${[
        report.summary.compliance_status,
        report.summary.severity,
        report.diagnostic.summary.first_divergence_variable ?? "no_variable",
        report.diagnostic.summary.first_divergence_boundary ?? "no_boundary",
      ].join(":")}`,
    );
  }
}
