/* ============================================================================
 * FILE: lib/xyvala/runtime/history/runtime-governance-history.ts
 * ========================================================================== */

import {
  listAnalyticsSnapshots,
  type AnalyticsSnapshotRecord,
} from "@/lib/xyvala/runtime/repositories/analytics-repository";

import {
  listAuditLogRecordsByDomain,
  type AuditRepositoryFilter,
} from "@/lib/xyvala/runtime/repositories/audit-repository";

import type {
  AuditLogRecord,
} from "@/lib/xyvala/runtime/audit-log-store";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RuntimeGovernanceHistoryStatus =
  | "available"
  | "partial"
  | "empty"
  | "unavailable";

export type RuntimeGovernanceHistoryEventKind =
  | "governance_snapshot"
  | "state_snapshot"
  | "compliance_snapshot"
  | "lifecycle_snapshot"
  | "audit_event";

export type RuntimeGovernanceHistoryEvent = {
  id: string;
  kind: RuntimeGovernanceHistoryEventKind;
  ts: string;

  key: string;
  value: number | null;

  metadata: Record<string, string | number | boolean | null>;
  warnings: string[];
};

export type RuntimeGovernanceHistorySnapshot = {
  ok: boolean;
  generated_at: string;

  status: RuntimeGovernanceHistoryStatus;

  events: RuntimeGovernanceHistoryEvent[];

  total_events: number;
  governance_events: number;
  state_events: number;
  compliance_events: number;
  lifecycle_events: number;
  audit_events: number;

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

function normalizeLimit(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 200;

  return Math.max(1, Math.min(1_000, Math.trunc(value)));
}

function normalizeMetadata(
  value: Record<string, string | number | boolean | null>,
): Record<string, string | number | boolean | null> {
  const output: Record<string, string | number | boolean | null> = {};

  for (const [key, item] of Object.entries(value)) {
    if (
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean" ||
      item === null
    ) {
      output[key] = item;
    }
  }

  return output;
}

function resolveSnapshotKind(
  snapshot: AnalyticsSnapshotRecord,
): RuntimeGovernanceHistoryEventKind {
  if (snapshot.metric_key.includes("compliance")) {
    return "compliance_snapshot";
  }

  if (snapshot.metric_key.includes("lifecycle")) {
    return "lifecycle_snapshot";
  }

  if (snapshot.metric_key.includes("operational_state")) {
    return "state_snapshot";
  }

  return "governance_snapshot";
}

function mapAnalyticsSnapshot(
  snapshot: AnalyticsSnapshotRecord,
): RuntimeGovernanceHistoryEvent {
  return {
    id: snapshot.id,
    kind: resolveSnapshotKind(snapshot),
    ts: snapshot.created_at,

    key: snapshot.metric_key,
    value: snapshot.metric_value,

    metadata: normalizeMetadata(snapshot.metadata),
    warnings: [...snapshot.warnings],
  };
}

function mapAuditLog(record: AuditLogRecord): RuntimeGovernanceHistoryEvent {
  return {
    id: record.id,
    kind: "audit_event",
    ts: record.ts,

    key: record.event,
    value: null,

    metadata: normalizeMetadata(record.metadata),
    warnings: [...record.warnings],
  };
}

function resolveStatus(
  events: RuntimeGovernanceHistoryEvent[],
  warnings: string[],
): RuntimeGovernanceHistoryStatus {
  if (events.length === 0 && warnings.length > 0) return "unavailable";
  if (events.length === 0) return "empty";
  if (warnings.length > 0) return "partial";

  return "available";
}

/* ============================================================================
 * 3. HISTORY BUILDER
 * ========================================================================== */

export async function buildRuntimeGovernanceHistory(input: {
  limit?: number | null;
  include_audit?: boolean;
} = {}): Promise<RuntimeGovernanceHistorySnapshot> {
  const generatedAt = nowIso();
  const limit = normalizeLimit(input.limit);

  const analytics = await listAnalyticsSnapshots({
    kind: "runtime",
    limit,
  });

  const auditLogs =
  input.include_audit === false
    ? []
    : await listAuditLogRecordsByDomain("runtime", limit);

  const events = [
    ...analytics.map(mapAnalyticsSnapshot),
    ...auditLogs.map(mapAuditLog),
  ].sort(
    (left, right) =>
      new Date(right.ts).getTime() - new Date(left.ts).getTime(),
  );

  const warnings = uniqueWarnings(
    analytics.flatMap((item) => item.warnings),
    auditLogs.flatMap((item) => item.warnings),
  );

  const status = resolveStatus(events, warnings);

  return {
    ok: status === "available" || status === "partial",
    generated_at: generatedAt,

    status,

    events,

    total_events: events.length,
    governance_events: events.filter(
      (event) => event.kind === "governance_snapshot",
    ).length,
    state_events: events.filter((event) => event.kind === "state_snapshot")
      .length,
    compliance_events: events.filter(
      (event) => event.kind === "compliance_snapshot",
    ).length,
    lifecycle_events: events.filter(
      (event) => event.kind === "lifecycle_snapshot",
    ).length,
    audit_events: events.filter((event) => event.kind === "audit_event").length,

    warnings,
    error:
      status === "unavailable"
        ? "runtime_governance_history_unavailable"
        : null,
  };
}

/* ============================================================================
 * 4. READERS
 * ========================================================================== */

export async function listRuntimeGovernanceHistoryEvents(input: {
  limit?: number | null;
} = {}): Promise<RuntimeGovernanceHistoryEvent[]> {
  const history = await buildRuntimeGovernanceHistory({
  ...(input.limit !== undefined ? { limit: input.limit } : {}),
});
  return history.events;
}

export async function getRuntimeGovernanceHistoryStatus(): Promise<RuntimeGovernanceHistoryStatus> {
  const history = await buildRuntimeGovernanceHistory();

  return history.status;
}
