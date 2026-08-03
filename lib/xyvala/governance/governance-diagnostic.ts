/* ============================================================================
 * FILE: lib/xyvala/governance/governance-diagnostic.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala unified governance diagnostic engine
 *
 * ROLE
 * - consolidate lineage reconciliation, boundary audit and first divergence
 * - provide one deterministic governance diagnostic view
 * - identify missing variables, unexpected variables and degraded boundaries
 * - support admin diagnostics, post-mortems and observability by layer
 *
 * PARENTS
 * - lib/xyvala/governance/runtime-traceability.ts
 * - lib/xyvala/governance/lineage-reconciliation.ts
 * - lib/xyvala/governance/boundary-audit.ts
 * - lib/xyvala/governance/first-divergence-detector.ts
 *
 * DIRECTIVES
 * - governance diagnostic only
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
 * - optional registry override for tests
 *
 * OUTPUTS
 * - GovernanceDiagnosticResult
 *
 * INVARIANTS
 * - diagnostic never creates analytical truth
 * - diagnostic never reconstructs missing variables
 * - diagnostic consolidates observed governance state only
 * - first divergence remains the priority signal
 * - public exposure remains outside this layer
 * ========================================================================== */

import {
  auditRuntimeBoundaries,
  type BoundaryAuditResult,
  type BoundaryAuditStatus,
} from "@/lib/xyvala/governance/boundary-audit";

import {
  detectFirstDivergence,
  type FirstDivergenceReport,
  type FirstDivergenceSeverity,
} from "@/lib/xyvala/governance/first-divergence-detector";

import {
  reconcileLineage,
  type LineageReconciliationResult,
  type LineageReconciliationStatus,
} from "@/lib/xyvala/governance/lineage-reconciliation";

import type {
  RuntimeTraceInput,
} from "@/lib/xyvala/governance/runtime-traceability";

import type {
  VariableLineageEntry,
} from "@/lib/xyvala/governance/variable-lineage-registry";

import type {
  LineageGovernanceScope,
} from "@/lib/xyvala/governance/lineage-reconciliation/lineage-types";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type GovernanceDiagnosticStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "BROKEN";

export type GovernanceDiagnosticState =
  | "READY"
  | "WATCH"
  | "BLOCK";

export type GovernanceDiagnosticResult = {
  ok: boolean;
  status: GovernanceDiagnosticStatus;
  state: GovernanceDiagnosticState;

  trace_count: number;

  lineage: LineageReconciliationResult;
  boundary_audit: BoundaryAuditResult;
  first_divergence: FirstDivergenceReport;

  summary: {
    missing_variables: string[];
    unexpected_variables: string[];
    degraded_boundaries: string[];
    blocked_boundaries: string[];
    first_divergence_variable: string | null;
    first_divergence_boundary: string | null;
    first_divergence_reason: string | null;
    severity: FirstDivergenceSeverity;
  };

  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function normalizeTraces(
  value: readonly RuntimeTraceInput[] | undefined,
): readonly RuntimeTraceInput[] {
  return Array.isArray(value) ? value : [];
}

function resolveDiagnosticStatus(input: {
  lineageStatus: LineageReconciliationStatus;
  boundaryStatus: BoundaryAuditStatus;
  firstDivergenceOk: boolean;
}): GovernanceDiagnosticStatus {
  if (
    input.lineageStatus === "BLOCKED" ||
    input.boundaryStatus === "BLOCKED" ||
    !input.firstDivergenceOk
  ) {
    return "BROKEN";
  }

  if (
    input.lineageStatus === "DEGRADED" ||
    input.boundaryStatus === "DEGRADED"
  ) {
    return "DEGRADED";
  }

  return "HEALTHY";
}

function resolveDiagnosticState(
  status: GovernanceDiagnosticStatus,
): GovernanceDiagnosticState {
  if (status === "HEALTHY") return "READY";
  if (status === "DEGRADED") return "WATCH";

  return "BLOCK";
}

/* ============================================================================
 * 3. SUMMARY BUILDERS
 * ========================================================================== */

function extractMissingVariables(
  lineage: LineageReconciliationResult,
): string[] {
  return lineage.items
    .filter((item) => !item.is_observed)
    .map((item) => item.variable_name);
}

function extractDegradedBoundaries(
  boundaryAudit: BoundaryAuditResult,
): string[] {
  return boundaryAudit.boundaries
    .filter((boundary) => boundary.status === "DEGRADED")
    .map((boundary) => boundary.boundary);
}

function extractBlockedBoundaries(
  boundaryAudit: BoundaryAuditResult,
): string[] {
  return boundaryAudit.boundaries
    .filter((boundary) => boundary.status === "BLOCKED")
    .map((boundary) => boundary.boundary);
}

/* ============================================================================
 * 4. PUBLIC DIAGNOSTIC API
 * ========================================================================== */

export function buildGovernanceDiagnostic(input: {
  traces?: readonly RuntimeTraceInput[];
  registry?: readonly VariableLineageEntry[];
  scope?: LineageGovernanceScope;
}): GovernanceDiagnosticResult {

  const traces = normalizeTraces(input.traces);

  const lineage = reconcileLineage({
  traces,

  ...(input.registry !== undefined
    ? {
        registry: input.registry,
      }
    : {}),

  ...(input.scope !== undefined
    ? {
        scope: input.scope,
      }
    : {}),
});

  const boundaryAudit = auditRuntimeBoundaries({
    traces,
  });

  const firstDivergence = detectFirstDivergence({
    traces,
    ...(input.registry !== undefined ? { registry: input.registry } : {}),
  });

  const status = resolveDiagnosticStatus({
    lineageStatus: lineage.status,
    boundaryStatus: boundaryAudit.status,
    firstDivergenceOk: firstDivergence.ok,
  });

  const state = resolveDiagnosticState(status);

  const missingVariables = extractMissingVariables(lineage);
  const degradedBoundaries = extractDegradedBoundaries(boundaryAudit);
  const blockedBoundaries = extractBlockedBoundaries(boundaryAudit);

  const warnings = uniqueStrings([
    ...lineage.warnings,
    ...boundaryAudit.warnings,
    ...firstDivergence.warnings,
  ]);

  return {
    ok: status === "HEALTHY",
    status,
    state,

    trace_count: traces.length,

    lineage,
    boundary_audit: boundaryAudit,
    first_divergence: firstDivergence,

    summary: {
      missing_variables: missingVariables,
      unexpected_variables: lineage.unexpected_variables,
      degraded_boundaries: degradedBoundaries,
      blocked_boundaries: blockedBoundaries,
      first_divergence_variable:
        firstDivergence.diagnostic.variable_name,
      first_divergence_boundary:
        firstDivergence.diagnostic.boundary,
      first_divergence_reason:
        firstDivergence.diagnostic.reason,
      severity: firstDivergence.diagnostic.severity,
    },

    warnings,
    error:
      status === "HEALTHY"
        ? null
        : "governance_diagnostic_not_fully_compliant",
  };
}
