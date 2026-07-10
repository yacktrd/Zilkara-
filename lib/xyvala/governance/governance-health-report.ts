/* ============================================================================
 * FILE: lib/xyvala/governance/governance-health-report.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala governance health report
 *
 * ROLE
 * - aggregate governance registry, governance store and latest governance artifacts
 * - expose one deterministic governance health report
 * - provide a central health read model for debug and supervision routes
 * - preserve strict observe / compute behavior without mutation
 *
 * DIRECTIVES
 * - governance health report only
 * - observe / compute layer only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration computation
 * - no public projection
 * - no API response building
 * - no UI logic
 * - no cache mutation
 * - no persistence
 * - no event bus
 * - no runtime mutation
 * - deterministic aggregation only
 *
 * INPUTS
 * - Governance registry snapshot
 * - Governance store snapshot
 * - Latest governance store records
 *
 * OUTPUTS
 * - GovernanceHealthReport
 *
 * INVARIANTS
 * - report never creates analytical truth
 * - report never mutates runtime state
 * - report reads already computed governance artifacts only
 * - empty store is degraded, not invalid
 * - registry invalidity blocks health
 *
 * CRITICAL DEPENDENCIES
 * - governance-registry
 * - governance-store
 *
 * SENSITIVE ZONES
 * - governance health status
 * - compliance summary
 * - private governance artifact summaries
 * ========================================================================== */

import {
  buildGovernanceRegistrySnapshot,
} from "@/lib/xyvala/governance/governance-registry";

import {
  getGovernanceStoreSnapshot,
  type GovernanceStoreRecord,
  type GovernanceStoreRecordKind,
} from "@/lib/xyvala/governance/governance-store";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type GovernanceHealthReportStatus =
  | "healthy"
  | "degraded"
  | "blocked"
  | "empty"
  | "invalid";

export type GovernanceHealthReportSeverity =
  | "none"
  | "minor"
  | "major"
  | "critical";

export type GovernanceHealthComplianceStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "BLOCKED"
  | "EMPTY"
  | "INVALID";

export type GovernanceHealthArtifactSummary = {
  kind: GovernanceStoreRecordKind;
  status: string;
  ok: boolean;
  recorded_at: string;
  warnings_count: number;
};

export type GovernanceHealthReport = {
  ok: boolean;
  status: GovernanceHealthReportStatus;
  severity: GovernanceHealthReportSeverity;

  generated_at: string;

  registry_ok: boolean;
  store_ok: boolean;
  store_count: number;

  latest_artifact: GovernanceHealthArtifactSummary | null;
  artifact_counts: Record<GovernanceStoreRecordKind, number>;

  summary: {
    compliance_status: GovernanceHealthComplianceStatus;
    registry_component_count: number;
    active_component_count: number;
    critical_risk_count: number;
    governance_store_empty: boolean;
    latest_artifact_ok: boolean | null;
  };

  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function uniqueWarnings(
  ...groups: Array<readonly string[] | undefined | null>
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

function emptyArtifactCounts(): Record<GovernanceStoreRecordKind, number> {
  return {
    governance_snapshot: 0,
    governance_health: 0,
    traceability_coverage: 0,
    variable_registry_audit: 0,
  };
}

function buildArtifactCounts(
  records: readonly GovernanceStoreRecord[],
): Record<GovernanceStoreRecordKind, number> {
  const counts = emptyArtifactCounts();

  for (const record of records) {
    counts[record.kind] += 1;
  }

  return counts;
}

function summarizeArtifact(
  record: GovernanceStoreRecord | null,
): GovernanceHealthArtifactSummary | null {
  if (record === null) return null;

  return {
    kind: record.kind,
    status: record.status,
    ok: record.ok,
    recorded_at: record.recorded_at,
    warnings_count: record.warnings.length,
  };
}

function resolveStatus(input: {
  registryOk: boolean;
  storeOk: boolean;
  storeCount: number;
  latestOk: boolean | null;
}): GovernanceHealthReportStatus {
  if (!input.registryOk) return "blocked";
  if (!input.storeOk) return "invalid";
  if (input.storeCount === 0) return "empty";
  if (input.latestOk === false) return "degraded";

  return "healthy";
}

function resolveSeverity(
  status: GovernanceHealthReportStatus,
): GovernanceHealthReportSeverity {
  if (status === "blocked" || status === "invalid") return "critical";
  if (status === "empty") return "major";
  if (status === "degraded") return "major";

  return "none";
}

function resolveComplianceStatus(
  status: GovernanceHealthReportStatus,
): GovernanceHealthComplianceStatus {
  if (status === "healthy") return "HEALTHY";
  if (status === "degraded") return "DEGRADED";
  if (status === "blocked") return "BLOCKED";
  if (status === "empty") return "EMPTY";

  return "INVALID";
}

/* ============================================================================
 * 3. REPORT BUILDER
 * ========================================================================== */

export function buildGovernanceHealthReport(): GovernanceHealthReport {
  const registry = buildGovernanceRegistrySnapshot();
  const store = getGovernanceStoreSnapshot();

  const latest = store.latest;
  const status = resolveStatus({
    registryOk: registry.ok,
    storeOk: store.ok,
    storeCount: store.count,
    latestOk: latest?.ok ?? null,
  });

  const severity = resolveSeverity(status);
  const complianceStatus = resolveComplianceStatus(status);

  const warnings = uniqueWarnings(
    registry.warnings,
    store.warnings,
    store.count === 0 ? ["governance_health_store_empty"] : [],
    latest && !latest.ok ? ["governance_health_latest_artifact_not_ok"] : [],
  );

  return {
    ok: status === "healthy",
    status,
    severity,

    generated_at: nowIso(),

    registry_ok: registry.ok,
    store_ok: store.ok,
    store_count: store.count,

    latest_artifact: summarizeArtifact(latest),
    artifact_counts: buildArtifactCounts(store.records),

    summary: {
      compliance_status: complianceStatus,
      registry_component_count: registry.component_count,
      active_component_count: registry.active_count,
      critical_risk_count: registry.critical_risk_count,
      governance_store_empty: store.count === 0,
      latest_artifact_ok: latest?.ok ?? null,
    },

    warnings,
    error: status === "healthy" ? null : `governance_health_${status}`,
  };
}

export function isGovernanceHealthy(): boolean {
  return buildGovernanceHealthReport().ok;
}

export function assertGovernanceHealthy(): void {
  const report = buildGovernanceHealthReport();

  if (!report.ok) {
    throw new Error(
      `governance_health_failed:${[
        report.status,
        report.severity,
        report.store_count,
      ].join(":")}`,
    );
  }
}
