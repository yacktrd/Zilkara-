/* ============================================================================
 * FILE: lib/xyvala/governance/governance-health.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala governance health system
 *
 * ROLE
 * - derive a deterministic health view from governance snapshots
 * - qualify governance compliance, lineage, boundary, propagation and divergence health
 * - provide a compact health status for audit and operational resilience
 * - preserve read-only governance evaluation without mutating runtime state
 *
 * PARENTS
 * - lib/xyvala/governance/governance-snapshot.ts
 * - lib/xyvala/governance/lineage-observability.ts
 *
 * DIRECTIVES
 * - governance health only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no analytical scoring
 * - no snapshot mutation
 * - no API logic
 * - no UI logic
 * - no cache logic
 * - no persistence
 * - no runtime mutation
 * - deterministic output only
 *
 * INPUTS
 * - GovernanceSnapshot
 *
 * OUTPUTS
 * - GovernanceHealthReport
 *
 * INVARIANTS
 * - health never creates analytical truth
 * - health never mutates runtime state
 * - health reads governance diagnostics only
 * - first divergence dominates health degradation
 *
 * CRITICAL DEPENDENCIES
 * - GovernanceSnapshot
 * - isGovernanceSnapshot
 *
 * SENSITIVE ZONES
 * - health status
 * - severity resolution
 * - divergence dominance
 * ========================================================================== */

import {
  isGovernanceSnapshot,
  type GovernanceSnapshot,
} from "@/lib/xyvala/governance/governance-snapshot";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type GovernanceHealthStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "BROKEN"
  | "INVALID";

export type GovernanceHealthSeverity =
  | "none"
  | "minor"
  | "major"
  | "critical";

export type GovernanceHealthAxis = {
  ok: boolean;
  status: GovernanceHealthStatus;
  severity: GovernanceHealthSeverity;
  reason: string | null;
};

export type GovernanceHealthReport = {
  ok: boolean;
  status: GovernanceHealthStatus;
  severity: GovernanceHealthSeverity;
  score: number;
  compliance: GovernanceHealthAxis;
  lineage: GovernanceHealthAxis;
  boundary: GovernanceHealthAxis;
  propagation: GovernanceHealthAxis;
  divergence: GovernanceHealthAxis;
  traceability: GovernanceHealthAxis;
  reason: string | null;
  warnings: string[];
};

export type GovernanceHealthValidationResult = {
  ok: boolean;
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. CONSTANTS
 * ========================================================================== */

const SCORE_HEALTHY = 100;
const SCORE_DEGRADED = 60;
const SCORE_BROKEN = 20;
const SCORE_INVALID = 0;

/* ============================================================================
 * 3. SAFE HELPERS
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

function severityRank(value: GovernanceHealthSeverity): number {
  if (value === "critical") return 4;
  if (value === "major") return 3;
  if (value === "minor") return 2;
  return 1;
}

function maxSeverity(
  ...items: GovernanceHealthSeverity[]
): GovernanceHealthSeverity {
  return items.reduce<GovernanceHealthSeverity>(
    (current, next) =>
      severityRank(next) > severityRank(current) ? next : current,
    "none",
  );
}

function statusFromSeverity(
  severity: GovernanceHealthSeverity,
): GovernanceHealthStatus {
  if (severity === "critical") return "BROKEN";
  if (severity === "major") return "DEGRADED";
  if (severity === "minor") return "DEGRADED";
  return "HEALTHY";
}

function scoreFromStatus(status: GovernanceHealthStatus): number {
  if (status === "HEALTHY") return SCORE_HEALTHY;
  if (status === "DEGRADED") return SCORE_DEGRADED;
  if (status === "BROKEN") return SCORE_BROKEN;
  return SCORE_INVALID;
}

function buildAxis(input: {
  ok: boolean;
  severity: GovernanceHealthSeverity;
  reason: string | null;
}): GovernanceHealthAxis {
  return {
    ok: input.ok,
    status: input.ok ? "HEALTHY" : statusFromSeverity(input.severity),
    severity: input.severity,
    reason: input.reason,
  };
}

/* ============================================================================
 * 4. AXIS BUILDERS
 * ========================================================================== */

function buildComplianceAxis(snapshot: GovernanceSnapshot): GovernanceHealthAxis {
  const status = snapshot.observability.governance.status;

  if (status === "COMPLIANT") {
    return buildAxis({
      ok: true,
      severity: "none",
      reason: null,
    });
  }

  return buildAxis({
    ok: false,
    severity: status === "NON_COMPLIANT" ? "critical" : "major",
    reason: `governance_${status.toLowerCase()}`,
  });
}

function buildLineageAxis(snapshot: GovernanceSnapshot): GovernanceHealthAxis {
  const lineage = snapshot.observability.governance.report.lineage;

  if (lineage.ok) {
    return buildAxis({
      ok: true,
      severity: "none",
      reason: null,
    });
  }

  return buildAxis({
    ok: false,
    severity: "critical",
    reason: "lineage_registry_invalid",
  });
}

function buildBoundaryAxis(snapshot: GovernanceSnapshot): GovernanceHealthAxis {
  const boundaries = snapshot.observability.governance.boundaries;

  if (boundaries.blocked_count > 0) {
    return buildAxis({
      ok: false,
      severity: "critical",
      reason: "boundary_blocked",
    });
  }

  if (boundaries.degraded_count > 0) {
    return buildAxis({
      ok: false,
      severity: "major",
      reason: "boundary_degraded",
    });
  }

  return buildAxis({
    ok: true,
    severity: "none",
    reason: null,
  });
}

function buildPropagationAxis(snapshot: GovernanceSnapshot): GovernanceHealthAxis {
  const boundaryAudit =
    snapshot.observability.governance.report.diagnostic.boundary_audit;

  if (boundaryAudit.ok) {
    return buildAxis({
      ok: true,
      severity: "none",
      reason: null,
    });
  }

  const hasBlocked = boundaryAudit.boundaries.some(
    (item: { status: string }) => item.status === "BLOCKED",
  );

  const hasDegraded = boundaryAudit.boundaries.some(
    (item: { status: string }) => item.status === "DEGRADED",
  );

  return buildAxis({
    ok: false,
    severity: hasBlocked ? "critical" : hasDegraded ? "major" : "minor",
    reason: "boundary_propagation_degraded",
  });
}

function buildTraceabilityAxis(snapshot: GovernanceSnapshot): GovernanceHealthAxis {
  const lineage =
    snapshot.observability.governance.report.diagnostic.lineage;

  if (lineage.ok) {
    return buildAxis({
      ok: true,
      severity: "none",
      reason: null,
    });
  }

  return buildAxis({
    ok: false,
    severity: lineage.status === "BLOCKED" ? "critical" : "minor",
    reason: "lineage_traceability_degraded",
  });
}

function buildDivergenceAxis(snapshot: GovernanceSnapshot): GovernanceHealthAxis {
  const divergence = snapshot.observability.divergence;

  if (!divergence.first_divergence_detected) {
    return buildAxis({
      ok: true,
      severity: "none",
      reason: null,
    });
  }

  return buildAxis({
    ok: false,
    severity:
      divergence.severity === "critical"
        ? "critical"
        : divergence.severity === "major"
          ? "major"
          : "minor",
    reason: divergence.reason ?? "first_divergence_detected",
  });
}

/* ============================================================================
 * 5. HEALTH REPORT
 * ========================================================================== */

export function buildGovernanceHealthReport(
  snapshot: unknown,
): GovernanceHealthReport {
  if (!isGovernanceSnapshot(snapshot)) {
    return {
      ok: false,
      status: "INVALID",
      severity: "critical",
      score: SCORE_INVALID,
      compliance: buildAxis({
        ok: false,
        severity: "critical",
        reason: "invalid_governance_snapshot",
      }),
      lineage: buildAxis({
        ok: false,
        severity: "critical",
        reason: "invalid_governance_snapshot",
      }),
      boundary: buildAxis({
        ok: false,
        severity: "critical",
        reason: "invalid_governance_snapshot",
      }),
      propagation: buildAxis({
        ok: false,
        severity: "critical",
        reason: "invalid_governance_snapshot",
      }),
      divergence: buildAxis({
        ok: false,
        severity: "critical",
        reason: "invalid_governance_snapshot",
      }),
      traceability: buildAxis({
        ok: false,
        severity: "critical",
        reason: "invalid_governance_snapshot",
      }),
      reason: "invalid_governance_snapshot",
      warnings: ["governance_health_invalid_snapshot"],
    };
  }

  const compliance = buildComplianceAxis(snapshot);
  const lineage = buildLineageAxis(snapshot);
  const boundary = buildBoundaryAxis(snapshot);
  const propagation = buildPropagationAxis(snapshot);
  const divergence = buildDivergenceAxis(snapshot);
  const traceability = buildTraceabilityAxis(snapshot);

  const severity = maxSeverity(
    compliance.severity,
    lineage.severity,
    boundary.severity,
    propagation.severity,
    divergence.severity,
    traceability.severity,
  );

  const status = statusFromSeverity(severity);

  const reasons = [
    compliance.reason,
    lineage.reason,
    boundary.reason,
    propagation.reason,
    divergence.reason,
    traceability.reason,
  ].filter((item): item is string => typeof item === "string");

  const warnings = uniqueWarnings(
    snapshot.observability.warnings,
    snapshot.observability.governance.warnings,
  );

  return {
    ok: status === "HEALTHY",
    status,
    severity,
    score: scoreFromStatus(status),
    compliance,
    lineage,
    boundary,
    propagation,
    divergence,
    traceability,
    reason: reasons[0] ?? null,
    warnings,
  };
}

/* ============================================================================
 * 6. VALIDATION
 * ========================================================================== */

export function validateGovernanceHealth(
  snapshot: unknown,
): GovernanceHealthValidationResult {
  const report = buildGovernanceHealthReport(snapshot);

  if (!report.ok) {
    return {
      ok: false,
      warnings: report.warnings,
      error: report.reason ?? "governance_health_unhealthy",
    };
  }

  return {
    ok: true,
    warnings: report.warnings,
    error: null,
  };
}

export function assertGovernanceHealthy(snapshot: unknown): void {
  const result = validateGovernanceHealth(snapshot);

  if (!result.ok) {
    throw new Error(result.error ?? "governance_health_unhealthy");
  }
}
