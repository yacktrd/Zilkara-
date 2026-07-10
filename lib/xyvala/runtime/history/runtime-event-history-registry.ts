/* ============================================================================
 * FILE: lib/xyvala/runtime/history/runtime-event-history-registry.ts
 * ========================================================================== */

import {
  listRuntimeEvents,
  type RuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

import {
  listAuditLogRecordsByDomain,
} from "@/lib/xyvala/runtime/repositories/audit-repository";

import type {
  AuditLogRecord,
} from "@/lib/xyvala/runtime/audit-log-store";

export type RuntimeEventHistoryKind =
  | "runtime_event"
  | "audit_event";

export type RuntimeEventHistoryRecord = {
  id: string;
  kind: RuntimeEventHistoryKind;
  ts: string;
  event_key: string;
  priority: string | null;
  account_id: string | null;
  organization_id: string | null;
  request_id: string | null;
  payload: Record<string, string | number | boolean | null>;
  warnings: string[];
};

export type RuntimeEventHistorySnapshot = {
  ok: boolean;
  generated_at: string;
  records: RuntimeEventHistoryRecord[];
  total_records: number;
  runtime_events: number;
  audit_events: number;
  warnings: string[];
  error: string | null;
};

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeLimit(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 200;
  return Math.max(1, Math.min(1_000, Math.trunc(value)));
}

function normalizePayload(
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

function mapRuntimeEvent(event: RuntimeEvent): RuntimeEventHistoryRecord {
  return {
    id: event.id,
    kind: "runtime_event",
    ts: event.created_at,
    event_key: event.kind,
    priority: event.priority,
    account_id: event.account_id,
    organization_id: event.organization_id,
    request_id: event.request_id,
    payload: normalizePayload(event.payload),
    warnings: [...event.warnings],
  };
}

function mapAuditEvent(record: AuditLogRecord): RuntimeEventHistoryRecord {
  return {
    id: record.id,
    kind: "audit_event",
    ts: record.ts,
    event_key: record.event,
    priority: record.level,
    account_id: record.account_id,
    organization_id: null,
    request_id: record.request_id,
    payload: normalizePayload(record.metadata),
    warnings: [...record.warnings],
  };
}

export async function buildRuntimeEventHistoryRegistry(input: {
  limit?: number | null;
  include_audit?: boolean;
} = {}): Promise<RuntimeEventHistorySnapshot> {
  const generatedAt = nowIso();
  const limit = normalizeLimit(input.limit);

  const runtimeEvents = listRuntimeEvents().map(mapRuntimeEvent);

  const auditEvents =
    input.include_audit === false
      ? []
      : (await listAuditLogRecordsByDomain("runtime", limit)).map(mapAuditEvent);

  const records = [...runtimeEvents, ...auditEvents]
    .sort(
      (left, right) =>
        new Date(right.ts).getTime() - new Date(left.ts).getTime(),
    )
    .slice(0, limit);

  const warnings = uniqueWarnings(
    records.flatMap((record) => record.warnings),
    records.length === 0 ? ["runtime_event_history_empty"] : [],
  );

  return {
    ok: records.length > 0,
    generated_at: generatedAt,
    records,
    total_records: records.length,
    runtime_events: records.filter((record) => record.kind === "runtime_event")
      .length,
    audit_events: records.filter((record) => record.kind === "audit_event")
      .length,
    warnings,
    error: records.length === 0 ? "runtime_event_history_empty" : null,
  };
}

export async function listRuntimeEventHistoryRecords(input: {
  limit?: number | null;
} = {}): Promise<RuntimeEventHistoryRecord[]> {
  const history = await buildRuntimeEventHistoryRegistry({
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
  });

  return history.records;
}

export async function getRuntimeEventHistoryCount(): Promise<number> {
  const history = await buildRuntimeEventHistoryRegistry();

  return history.total_records;
}
