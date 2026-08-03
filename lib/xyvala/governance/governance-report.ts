/* ============================================================================
 * FILE: lib/xyvala/governance/governance-report.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala scoped governance report system
 *
 * ROLE
 * - consolidate unified governance diagnostics into a deterministic report
 * - propagate the explicit runtime observation scope
 * - expose compliance summary for runtime, audit and observability layers
 * - preserve First Divergence Rule as the dominant diagnostic signal
 *
 * PARENTS
 * - lib/xyvala/governance/governance-diagnostic.ts
 * - lib/xyvala/governance/lineage-reconciliation.ts
 * - lib/xyvala/governance/runtime-traceability.ts
 * - lib/xyvala/governance/variable-lineage-registry.ts
 *
 * DIRECTIVES
 * - governance reporting only
 * - OBSERVE only
 * - explicit scope propagation
 * - no market computation
 * - no RFS recomputation
 * - no Triple Layer recomputation
 * - no Impulse Layer recomputation
 * - no Analytical Aggregation recomputation
 * - no MCI recomputation
 * - no calibration computation
 * - no snapshot mutation
 * - no API logic
 * - no UI logic
 * - no cache logic
 * - no runtime mutation
 * - no persistence
 * - no missing-variable reconstruction
 * - deterministic output only
 *
 * INPUTS
 * - optional runtime trace inputs
 * - optional variable lineage registry
 * - optional explicit lineage governance scope
 *
 * OUTPUTS
 * - GovernanceReport
 *
 * INVARIANTS
 * - report never creates analytical truth
 * - report never reconstructs missing variables
 * - diagnostic remains the source of governance interpretation
 * - lineage reconciliation remains the source of registry/runtime comparison
 * - scope is propagated without local reinterpretation
 * - first divergence has priority over downstream symptoms
 * - same traces + registry + scope => same report shape
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
  LineageGovernanceScope,
} from "@/lib/xyvala/governance/lineage-reconciliation/lineage-types";

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
  scope?: LineageGovernanceScope;
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

function safeString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function uniqueWarnings(
  ...groups: Array<
    readonly string[] | undefined | null
  >
): string[] {
  return [
    ...new Set(
      groups
        .flatMap((group) =>
          Array.isArray(group)
            ? group
            : [],
        )
        .map((warning) =>
          safeString(warning),
        )
        .filter(
          (warning) =>
            warning.length > 0,
        ),
    ),
  ];
}

function normalizeTraces(
  traces:
    | readonly RuntimeTraceInput[]
    | undefined,
): readonly RuntimeTraceInput[] {
  return Array.isArray(traces)
    ? traces
    : [];
}

/* ============================================================================
 * 3. COMPLIANCE RESOLUTION
 * ========================================================================== */

function resolveReportSeverity(
  diagnostic: GovernanceDiagnosticResult,
): GovernanceReportSeverity {
  return diagnostic.summary.severity;
}

function resolveComplianceStatus(
  input: {
    lineage: LineageReconciliationResult;
    diagnostic: GovernanceDiagnosticResult;
  },
): GovernanceComplianceStatus {
  if (
    !input.lineage.ok ||
    input.diagnostic.status === "BROKEN"
  ) {
    return "NON_COMPLIANT";
  }

  if (
    input.lineage.status === "DEGRADED" ||
    input.diagnostic.status === "DEGRADED"
  ) {
    return "DEGRADED";
  }

  return "COMPLIANT";
}

/* ============================================================================
 * 4. SUMMARY BUILDER
 * ========================================================================== */

function buildGovernanceSummary(
  input: {
    lineage: LineageReconciliationResult;
    diagnostic: GovernanceDiagnosticResult;
  },
): GovernanceReportSummary {
  return {
    compliance_status:
      resolveComplianceStatus(input),

    severity:
      resolveReportSeverity(
        input.diagnostic,
      ),

    registry_valid:
      input.lineage.ok,

    diagnostic_valid:
      input.diagnostic.ok,

    first_divergence_detected:
      input.diagnostic
        .first_divergence
        .diagnostic
        .status === "detected",

    lineage_violation_count:
  input.lineage.blocked_count +
  input.lineage.degraded_count +
  input.lineage.unexpected_count,

    trace_count:
      input.diagnostic.trace_count,

    missing_variable_count:
      input.lineage.missing_count,

    unexpected_variable_count:
      input.lineage.unexpected_count,

    degraded_boundary_count:
      input.diagnostic
        .summary
        .degraded_boundaries
        .length,

    blocked_boundary_count:
      input.diagnostic
        .summary
        .blocked_boundaries
        .length,
  };
}

/* ============================================================================
 * 5. PUBLIC REPORT API
 * ========================================================================== */

export function buildGovernanceReport(
  input: GovernanceReportInput = {},
): GovernanceReport {
  const traces =
    normalizeTraces(
      input.traces,
    );

  /*
   * Registry/runtime reconciliation.
   *
   * Scope is forwarded unchanged.
   * This layer does not infer required variables,
   * executed layers or applicability.
   */
  const lineage =
    reconcileLineage({
      traces,

      ...(input.registry !== undefined
        ? {
            registry:
              input.registry,
          }
        : {}),

      ...(input.scope !== undefined
        ? {
            scope:
              input.scope,
          }
        : {}),
    });

  /*
   * Unified diagnostic.
   *
   * The same traces, registry and scope must feed both
   * reconciliation and diagnostic interpretation.
   */
  const diagnostic =
    buildGovernanceDiagnostic({
      traces,

      ...(input.registry !== undefined
        ? {
            registry:
              input.registry,
          }
        : {}),

      ...(input.scope !== undefined
        ? {
            scope:
              input.scope,
          }
        : {}),
    });

  const summary =
    buildGovernanceSummary({
      lineage,
      diagnostic,
    });

  const warnings =
    uniqueWarnings(
      lineage.warnings,
      diagnostic.warnings,

      !lineage.ok
        ? [
            "lineage_reconciliation_not_fully_compliant",
          ]
        : [],

      !diagnostic.ok
        ? [
            "governance_diagnostic_not_fully_compliant",
          ]
        : [],
    );

  return {
    ok:
      summary.compliance_status ===
      "COMPLIANT",

    summary,

    lineage,
    diagnostic,

    warnings,
  };
}

/* ============================================================================
 * 6. ASSERTION API
 * ========================================================================== */

export function assertGovernanceReportCompliant(
  input: GovernanceReportInput = {},
): void {
  const report =
    buildGovernanceReport(input);

  if (report.ok) {
    return;
  }

  throw new Error(
    `governance_report_non_compliant:${[
      report.summary
        .compliance_status,

      report.summary
        .severity,

      input.scope?.scope_name ?? "runtime_trace_scope",
      report.diagnostic
        .summary
        .first_divergence_variable ??
        "no_variable",

      report.diagnostic
        .summary
        .first_divergence_boundary ??
        "no_boundary",
    ].join(":")}`,
  );
}
