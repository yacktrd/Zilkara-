/* ============================================================================
 * FILE: lib/xyvala/runtime/export/warehouse-export.ts
 * ========================================================================== */

import {
  listAnalyticsSnapshots,
  type AnalyticsSnapshotRecord,
} from "@/lib/xyvala/runtime/repositories/analytics-repository";

import {
  buildObservabilityDashboard,
  type ObservabilityDashboardSnapshot,
} from "@/lib/xyvala/runtime/observability/observability-dashboard";

import {
  getAuditRepositoryStats,
  type AuditRepositoryStats,
} from "@/lib/xyvala/runtime/repositories/audit-repository";

export type WarehouseExportKind = "analytics" | "observability" | "audit";

export type WarehouseExportPayload = {
  id: string;
  kind: WarehouseExportKind;
  exported_at: string;
  record_count: number;
  data: unknown;
  warnings: string[];
};

function nowIso(): string {
  return new Date().toISOString();
}

function buildExportId(kind: WarehouseExportKind): string {
  return `warehouse_${kind}_${Date.now().toString(36)}`;
}

export async function exportAnalyticsWarehousePayload(): Promise<WarehouseExportPayload> {
  const snapshots: AnalyticsSnapshotRecord[] = await listAnalyticsSnapshots({
    limit: 1_000,
  });

  return {
    id: buildExportId("analytics"),
    kind: "analytics",
    exported_at: nowIso(),
    record_count: snapshots.length,
    data: snapshots,
    warnings: [],
  };
}

export async function exportObservabilityWarehousePayload(): Promise<WarehouseExportPayload> {
  const dashboard: ObservabilityDashboardSnapshot =
    await buildObservabilityDashboard();

  return {
    id: buildExportId("observability"),
    kind: "observability",
    exported_at: nowIso(),
    record_count: dashboard.panels.length,
    data: dashboard,
    warnings: dashboard.warnings,
  };
}

export async function exportAuditWarehousePayload(): Promise<WarehouseExportPayload> {
  const stats: AuditRepositoryStats = await getAuditRepositoryStats();

  return {
    id: buildExportId("audit"),
    kind: "audit",
    exported_at: nowIso(),
    record_count: stats.total,
    data: stats,
    warnings: [],
  };
}

export async function exportFullWarehousePayload(): Promise<{
  exported_at: string;
  analytics: WarehouseExportPayload;
  observability: WarehouseExportPayload;
  audit: WarehouseExportPayload;
}> {
  const [analytics, observability, audit] = await Promise.all([
    exportAnalyticsWarehousePayload(),
    exportObservabilityWarehousePayload(),
    exportAuditWarehousePayload(),
  ]);

  return {
    exported_at: nowIso(),
    analytics,
    observability,
    audit,
  };
}
