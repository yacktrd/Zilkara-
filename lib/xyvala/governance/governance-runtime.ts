/* ============================================================================
 * FILE: lib/xyvala/governance/governance-runtime.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala governance runtime
 *
 * ROLE
 * - execute the complete governance diagnostic chain
 * - build governance snapshot and health report from runtime traces
 * - audit official runtime boundaries from observed traces
 * - provide one deterministic governance runtime state
 * - support audits, post-mortems, diagnostics and future admin health checks
 *
 * PARENTS
 * - lib/xyvala/governance/governance-orchestrator.ts
 * - lib/xyvala/governance/governance-snapshot.ts
 * - lib/xyvala/governance/governance-health.ts
 * - lib/xyvala/governance/boundary-audit.ts
 *
 * DIRECTIVES
 * - governance runtime only
 * - observe only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no analytical scoring
 * - no snapshot mutation
 * - no cache logic
 * - no persistence
 * - no API response building
 * - no UI logic
 * - no event bus
 * - deterministic output only
 * - same input => same runtime output
 *
 * INPUTS
 * - governance orchestration input
 *
 * OUTPUTS
 * - GovernanceRuntimeState
 *
 * INVARIANTS
 * - runtime does not mutate operational state
 * - runtime does not create analytical truth
 * - runtime only composes already validated governance diagnostics
 * - boundary audit is observational and never reconstructs missing variables
 * - unhealthy governance remains explicit
 *
 * CRITICAL DEPENDENCIES
 * - buildGovernanceSnapshot
 * - buildGovernanceHealthReport
 * - auditRuntimeBoundaries
 *
 * SENSITIVE ZONES
 * - governance runtime status
 * - health report propagation
 * - boundary audit propagation
 * - snapshot validation
 * ========================================================================== */

import {
  auditRuntimeBoundaries,
  type BoundaryAuditResult,
  type BoundaryAuditStatus,
} from "@/lib/xyvala/governance/boundary-audit";

import {
  buildGovernanceHealthReport,
  type GovernanceHealthReport,
  type GovernanceHealthStatus,
} from "@/lib/xyvala/governance/governance-health";

import {
  buildGovernanceSnapshot,
  isGovernanceSnapshot,
  type GovernanceSnapshot,
} from "@/lib/xyvala/governance/governance-snapshot";

import type {
  GovernanceOrchestrationInput,
} from "@/lib/xyvala/governance/governance-orchestrator";

import type {
  RuntimeTraceInput,
} from "@/lib/xyvala/governance/runtime-traceability";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type GovernanceRuntimeStatus =
  | "READY"
  | "DEGRADED"
  | "BLOCKED"
  | "INVALID";

export type GovernanceRuntimeState = {
  ok: boolean;
  status: GovernanceRuntimeStatus;
  snapshot: GovernanceSnapshot | null;
  health: GovernanceHealthReport;
  boundary_audit: BoundaryAuditResult;
  warnings: string[];
  error: string | null;
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

function normalizeRuntimeTraces(
  value: GovernanceOrchestrationInput["traces"],
): readonly RuntimeTraceInput[] {
  return Array.isArray(value) ? value : [];
}

function resolveGovernanceRuntimeStatus(input: {
  healthStatus: GovernanceHealthStatus;
  boundaryStatus: BoundaryAuditStatus;
}): GovernanceRuntimeStatus {
  if (
    input.healthStatus === "BROKEN" ||
    input.boundaryStatus === "BLOCKED"
  ) {
    return "BLOCKED";
  }

  if (
    input.healthStatus === "DEGRADED" ||
    input.boundaryStatus === "DEGRADED"
  ) {
    return "DEGRADED";
  }

  if (
    input.healthStatus === "HEALTHY" &&
    input.boundaryStatus === "OK"
  ) {
    return "READY";
  }

  return "INVALID";
}

function resolveRuntimeError(input: {
  status: GovernanceRuntimeStatus;
  health: GovernanceHealthReport;
  boundaryAudit: BoundaryAuditResult;
}): string | null {
  if (input.status === "READY") {
    return null;
  }

  if (input.boundaryAudit.error) {
    return input.boundaryAudit.error;
  }

  return input.health.reason ?? "governance_unhealthy";
}

/* ============================================================================
 * 3. RUNTIME BUILDER
 * ========================================================================== */

export function buildGovernanceRuntimeState(
  input: GovernanceOrchestrationInput = {},
): GovernanceRuntimeState {
  const traces = normalizeRuntimeTraces(input.traces);

  const boundaryAudit = auditRuntimeBoundaries({
    traces,
  });

  const snapshot = buildGovernanceSnapshot(input);

  if (!isGovernanceSnapshot(snapshot)) {
    const health = buildGovernanceHealthReport(snapshot);

    return {
      ok: false,
      status: "INVALID",
      snapshot: null,
      health,
      boundary_audit: boundaryAudit,
      warnings: uniqueWarnings(
        health.warnings,
        boundaryAudit.warnings,
        ["governance_runtime_invalid_snapshot"],
      ),
      error: "governance_snapshot_invalid",
    };
  }

  const health = buildGovernanceHealthReport(snapshot);

  const status = resolveGovernanceRuntimeStatus({
    healthStatus: health.status,
    boundaryStatus: boundaryAudit.status,
  });

  return {
    ok: status === "READY",
    status,
    snapshot,
    health,
    boundary_audit: boundaryAudit,
    warnings: uniqueWarnings(
      snapshot.observability.warnings,
      health.warnings,
      boundaryAudit.warnings,
    ),
    error: resolveRuntimeError({
      status,
      health,
      boundaryAudit,
    }),
  };
}

/* ============================================================================
 * 4. ASSERTION
 * ========================================================================== */

export function assertGovernanceRuntimeReady(
  input: GovernanceOrchestrationInput = {},
): void {
  const state = buildGovernanceRuntimeState(input);

  if (!state.ok) {
    throw new Error(
      `governance_runtime_not_ready:${[
        state.status,
        state.error ?? "unknown_error",
      ].join(":")}`,
    );
  }
}
