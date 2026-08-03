/* ============================================================================
 * FILE: lib/xyvala/governance/governance-orchestrator.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala governance orchestrator
 *
 * ROLE
 * - provide a single deterministic entry point for governance diagnostics
 * - orchestrate lineage validation, runtime traceability, propagation audit,
 *   first divergence detection and governance reporting
 * - prevent service layers from importing multiple governance modules directly
 * - preserve governance as an observe / compute layer without runtime mutation
 *
 * PARENTS
 * - lib/xyvala/governance/variable-lineage-registry.ts
 * - lib/xyvala/governance/lineage-validator.ts
 * - lib/xyvala/governance/runtime-traceability.ts
 * - lib/xyvala/governance/propagation-audit.ts
 * - lib/xyvala/governance/first-divergence-detector.ts
 * - lib/xyvala/governance/boundary-protection.ts
 * - lib/xyvala/governance/governance-report.ts
 *
 * DIRECTIVES
 * - governance orchestration only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no snapshot mutation
 * - no cache mutation
 * - no API response building
 * - no UI logic
 * - no persistence
 * - no event bus
 * - deterministic output only
 * - same input => same governance output
 *
 * INPUTS
 * - runtime trace inputs
 * - optional boundary protection inputs
 * - optional registry override for tests
 *
 * OUTPUTS
 * - GovernanceOrchestrationResult
 *
 * INVARIANTS
 * - orchestrator never mutates runtime state
 * - orchestrator never creates analytical truth
 * - first divergence remains the priority diagnostic
 * - invalid governance must be explicit
 *
 * CRITICAL DEPENDENCIES
 * - buildGovernanceReport
 * - validateBoundaryProtection
 *
 * SENSITIVE ZONES
 * - governance report aggregation
 * - boundary validation aggregation
 * - first divergence summary
 * ========================================================================== */

import {
  validateBoundaryProtection,
  type BoundaryProtectionInput,
  type BoundaryProtectionResult,
} from "@/lib/xyvala/governance/boundary-protection";

import type {
  RuntimeTraceInput,
} from "@/lib/xyvala/governance/runtime-traceability";

import {
  buildGovernanceReport,
  type GovernanceReport,
} from "@/lib/xyvala/governance/governance-report";

import type {
  VariableLineageEntry,
} from "@/lib/xyvala/governance/variable-lineage-registry";

import type {
  LineageGovernanceScope,
} from "@/lib/xyvala/governance/lineage-reconciliation/lineage-types";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type GovernanceOrchestrationStatus =
  | "COMPLIANT"
  | "DEGRADED"
  | "NON_COMPLIANT";

export type GovernanceOrchestrationInput = {
  traces?: readonly RuntimeTraceInput[];
  boundaries?: readonly BoundaryProtectionInput[];
  registry?: readonly VariableLineageEntry[];
  scope?: LineageGovernanceScope;
};

export type GovernanceBoundarySummary = {
  checked_count: number;
  blocked_count: number;
  degraded_count: number;
  allowed_count: number;
  results: BoundaryProtectionResult[];
};

export type GovernanceOrchestrationResult = {
  ok: boolean;
  status: GovernanceOrchestrationStatus;
  report: GovernanceReport;
  boundaries: GovernanceBoundarySummary;
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
  value: readonly RuntimeTraceInput[] | undefined,
): readonly RuntimeTraceInput[] {
  return Array.isArray(value) ? value : [];
}

function normalizeBoundaries(
  value: readonly BoundaryProtectionInput[] | undefined,
): readonly BoundaryProtectionInput[] {
  return Array.isArray(value) ? value : [];
}

/* ============================================================================
 * 3. BOUNDARY ORCHESTRATION
 * ========================================================================== */

function buildBoundarySummary(
  inputs: readonly BoundaryProtectionInput[],
): GovernanceBoundarySummary {
  const results = inputs.map((boundary) =>
    validateBoundaryProtection(boundary),
  );

  return {
    checked_count: results.length,
    blocked_count: results.filter((item) => item.decision === "BLOCK").length,
    degraded_count: results.filter((item) => item.decision === "DEGRADE").length,
    allowed_count: results.filter((item) => item.decision === "ALLOW").length,
    results,
  };
}

/* ============================================================================
 * 4. STATUS RESOLUTION
 * ========================================================================== */

function resolveStatus(input: {
  report: GovernanceReport;
  boundaries: GovernanceBoundarySummary;
}): GovernanceOrchestrationStatus {
  if (
    !input.report.ok ||
    input.boundaries.blocked_count > 0
  ) {
    return "NON_COMPLIANT";
  }

  if (
    input.boundaries.degraded_count > 0 ||
    input.report.summary.compliance_status === "DEGRADED"
  ) {
    return "DEGRADED";
  }

  return "COMPLIANT";
}

/* ============================================================================
 * 5. PUBLIC ORCHESTRATOR API
 * ========================================================================== */

export function orchestrateGovernance(
  input: GovernanceOrchestrationInput = {},
): GovernanceOrchestrationResult {
  const traces =
    normalizeTraces(input.traces);

  const boundaries =
    normalizeBoundaries(
      input.boundaries,
    );

  const report =
    buildGovernanceReport({
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

  const boundarySummary =
    buildBoundarySummary(
      boundaries,
    );

  const status =
    resolveStatus({
      report,
      boundaries:
        boundarySummary,
    });

  const warnings =
    uniqueWarnings(
      report.warnings,

      ...boundarySummary.results.map(
        (item) =>
          item.warnings,
      ),
    );

  return {
    ok:
      status === "COMPLIANT",

    status,
    report,

    boundaries:
      boundarySummary,

    warnings,
  };
}

export function assertGovernanceCompliant(
  input: GovernanceOrchestrationInput = {},
): void {
  const result = orchestrateGovernance(input);

  if (!result.ok) {
    throw new Error(
      `governance_orchestration_non_compliant:${[
        result.status,
        result.report.summary.severity,
        result.report.diagnostic.summary.first_divergence_variable ??
          "no_variable",
        result.report.diagnostic.summary.first_divergence_boundary ??
          "no_boundary",
      ].join(":")}`,
    );
  }
}
