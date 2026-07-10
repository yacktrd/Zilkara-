/* ============================================================================
 * FILE: lib/xyvala/governance/lineage-observability.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala lineage observability system
 *
 * ROLE
 * - expose deterministic observability views for variable lineage governance
 * - summarize registry, boundary, propagation and divergence states
 * - support audit, debugging, post-mortem and first-divergence diagnostics
 * - provide read-only observability without mutating runtime state
 *
 * PARENTS
 * - lib/xyvala/governance/variable-lineage-registry.ts
 * - lib/xyvala/governance/boundary-registry.ts
 * - lib/xyvala/governance/governance-orchestrator.ts
 * - lib/xyvala/governance/governance-report.ts
 *
 * DIRECTIVES
 * - observability only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no snapshot mutation
 * - no API logic
 * - no UI logic
 * - no cache logic
 * - no persistence
 * - no runtime mutation
 * - deterministic read-only output only
 *
 * INPUTS
 * - governance orchestration input
 *
 * OUTPUTS
 * - LineageObservabilityReport
 *
 * INVARIANTS
 * - observability never creates analytical truth
 * - observability never mutates runtime state
 * - observability only summarizes already produced governance diagnostics
 * - first divergence remains the primary diagnostic
 *
 * CRITICAL DEPENDENCIES
 * - orchestrateGovernance
 * - listVariableLineageEntries
 * - listBoundaryRegistryEntries
 *
 * SENSITIVE ZONES
 * - public/private exposure summary
 * - first divergence summary
 * - governance compliance status
 * ========================================================================== */

import {
  listVariableLineageEntries,
} from "@/lib/xyvala/governance/variable-lineage-registry";

import {
  listBoundaryRegistryEntries,
} from "@/lib/xyvala/governance/boundary-registry";

import {
  orchestrateGovernance,
  type GovernanceOrchestrationInput,
  type GovernanceOrchestrationResult,
} from "@/lib/xyvala/governance/governance-orchestrator";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type LineageObservabilityStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "BROKEN";

export type LineageRegistryObservability = {
  variable_count: number;
  private_count: number;
  internal_count: number;
  public_count: number;
  core_truth_count: number;
  structural_support_count: number;
  aggregated_context_count: number;
  projection_variable_count: number;
  calibration_variable_count: number;
};

export type BoundaryRegistryObservability = {
  boundary_count: number;
  public_boundary_count: number;
  private_boundary_count: number;
  critical_risk_count: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
};

export type DivergenceObservability = {
  first_divergence_detected: boolean;
  variable_name: string | null;
  severity: string;
  boundary: string | null;
  reason: string | null;
};

export type LineageObservabilityReport = {
  ok: boolean;
  status: LineageObservabilityStatus;
  registry: LineageRegistryObservability;
  boundaries: BoundaryRegistryObservability;
  divergence: DivergenceObservability;
  governance: GovernanceOrchestrationResult;
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

function countBy<T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
): number {
  return items.filter(predicate).length;
}

/* ============================================================================
 * 3. REGISTRY OBSERVABILITY
 * ========================================================================== */

function buildRegistryObservability(): LineageRegistryObservability {
  const entries = listVariableLineageEntries();

  return {
    variable_count: entries.length,
    private_count: countBy(
      entries,
      (entry) => entry.exposure_level === "PRIVATE",
    ),
    internal_count: countBy(
      entries,
      (entry) => entry.exposure_level === "INTERNAL",
    ),
    public_count: countBy(
      entries,
      (entry) => entry.exposure_level === "PUBLIC",
    ),
    core_truth_count: countBy(
      entries,
      (entry) => entry.criticality_level === "CORE_TRUTH",
    ),
    structural_support_count: countBy(
      entries,
      (entry) => entry.criticality_level === "STRUCTURAL_SUPPORT",
    ),
    aggregated_context_count: countBy(
      entries,
      (entry) => entry.criticality_level === "AGGREGATED_CONTEXT",
    ),
    projection_variable_count: countBy(
      entries,
      (entry) => entry.criticality_level === "PROJECTION_VARIABLE",
    ),
    calibration_variable_count: countBy(
      entries,
      (entry) => entry.criticality_level === "CALIBRATION_VARIABLE",
    ),
  };
}

/* ============================================================================
 * 4. BOUNDARY OBSERVABILITY
 * ========================================================================== */

function buildBoundaryObservability(): BoundaryRegistryObservability {
  const boundaries = listBoundaryRegistryEntries();

  return {
    boundary_count: boundaries.length,
    public_boundary_count: countBy(
      boundaries,
      (entry) => entry.public_boundary,
    ),
    private_boundary_count: countBy(
      boundaries,
      (entry) => !entry.public_boundary,
    ),
    critical_risk_count: countBy(
      boundaries,
      (entry) => entry.risk_level === "CRITICAL",
    ),
    high_risk_count: countBy(
      boundaries,
      (entry) => entry.risk_level === "HIGH",
    ),
    medium_risk_count: countBy(
      boundaries,
      (entry) => entry.risk_level === "MEDIUM",
    ),
    low_risk_count: countBy(
      boundaries,
      (entry) => entry.risk_level === "LOW",
    ),
  };
}

/* ============================================================================
 * 5. DIVERGENCE OBSERVABILITY
 * ==========================================================================
 *
 * ROLE
 * - expose a read-only first-divergence observability summary
 * - consume governance diagnostic output without recalculating divergence
 * - preserve first divergence as the dominant governance signal
 *
 * DIRECTIVES
 * - observability only
 * - no divergence recomputation
 * - no propagation audit recomputation
 * - no lineage reconciliation
 * - no mutation
 * - deterministic projection only
 *
 * INVARIANTS
 * - governance.report.diagnostic is the source of truth
 * - severity comes from diagnostic.summary.severity
 * - detection status comes from diagnostic.first_divergence.diagnostic.status
 * ========================================================================== */

function buildDivergenceObservability(
  governance: GovernanceOrchestrationResult,
): DivergenceObservability {
  const diagnostic = governance.report.diagnostic;
  const summary = diagnostic.summary;
  const firstDivergence = diagnostic.first_divergence.diagnostic;

  return {
    first_divergence_detected:
      firstDivergence.status === "detected",
    variable_name:
      summary.first_divergence_variable ?? null,
    severity:
      summary.severity,
    boundary:
      summary.first_divergence_boundary ?? null,
    reason:
      summary.first_divergence_reason ?? null,
  };
}

/* ============================================================================
 * 6. STATUS RESOLUTION
 * ========================================================================== */

function resolveStatus(
  governance: GovernanceOrchestrationResult,
): LineageObservabilityStatus {
  if (governance.status === "NON_COMPLIANT") {
    return "BROKEN";
  }

  if (governance.status === "DEGRADED") {
    return "DEGRADED";
  }

  return "HEALTHY";
}

/* ============================================================================
 * 7. PUBLIC OBSERVABILITY API
 * ========================================================================== */

export function buildLineageObservabilityReport(
  input: GovernanceOrchestrationInput = {},
): LineageObservabilityReport {
  const governance = orchestrateGovernance(input);

  const registry = buildRegistryObservability();
  const boundaries = buildBoundaryObservability();
  const divergence = buildDivergenceObservability(governance);
  const status = resolveStatus(governance);

  const warnings = uniqueWarnings(governance.warnings);

  return {
    ok: status === "HEALTHY",
    status,
    registry,
    boundaries,
    divergence,
    governance,
    warnings,
  };
}

export function assertLineageObservabilityHealthy(
  input: GovernanceOrchestrationInput = {},
): void {
  const report = buildLineageObservabilityReport(input);

  if (!report.ok) {
    throw new Error(
      `lineage_observability_not_healthy:${[
        report.status,
        report.divergence.variable_name ?? "no_variable",
        report.divergence.boundary ?? "no_boundary",
        report.divergence.reason ?? "no_reason",
      ].join(":")}`,
    );
  }
}
