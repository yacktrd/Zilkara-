/* ============================================================================
 * FILE: lib/xyvala/runtime/history/runtime-governance-recovery-history.ts
 * ========================================================================== */

import {
  buildRuntimeGovernanceReplayCore,
  type RuntimeReplayEvent,
  type RuntimeReplaySnapshot,
} from "@/lib/xyvala/runtime/replay/runtime-governance-replay-core";

import {
  publishRuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

export type RuntimeRecoveryHistoryKind =
  | "recovery"
  | "failover"
  | "degradation"
  | "protected_mode"
  | "blocked"
  | "unknown";

export type RuntimeRecoveryHistoryState =
  | "available"
  | "partial"
  | "empty"
  | "critical";

export type RuntimeRecoveryHistoryRecord = {
  id: string;
  ts: string;
  kind: RuntimeRecoveryHistoryKind;
  key: string;
  metadata: Record<string, string | number | boolean | null>;
  warnings: string[];
};

export type RuntimeRecoveryHistorySnapshot = {
  ok: boolean;
  generated_at: string;

  state: RuntimeRecoveryHistoryState;

  records: RuntimeRecoveryHistoryRecord[];

  total_records: number;
  recovery_records: number;
  failover_records: number;
  degradation_records: number;
  protected_records: number;
  blocked_records: number;

  replay: RuntimeReplaySnapshot;

  warnings: string[];
  error: string | null;
};

export type RuntimeRecoveryHistoryMutationResult = {
  ok: boolean;
  emitted_at: string;
  snapshot: RuntimeRecoveryHistorySnapshot;
  warnings: string[];
  error: string | null;
};

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

function classifyRecoveryKind(
  event: RuntimeReplayEvent,
): RuntimeRecoveryHistoryKind {
  const source = `${event.key} ${Object.values(event.metadata).join(" ")}`.toLowerCase();

  if (source.includes("failover")) return "failover";
  if (source.includes("recover")) return "recovery";
  if (source.includes("degraded") || source.includes("degrade")) {
    return "degradation";
  }
  if (source.includes("protected") || source.includes("protect")) {
    return "protected_mode";
  }
  if (source.includes("blocked") || source.includes("block")) {
    return "blocked";
  }

  return "unknown";
}

function isRecoveryRelevant(kind: RuntimeRecoveryHistoryKind): boolean {
  return kind !== "unknown";
}

function mapReplayEvent(event: RuntimeReplayEvent): RuntimeRecoveryHistoryRecord {
  return {
    id: event.id,
    ts: event.ts,
    kind: classifyRecoveryKind(event),
    key: event.key,
    metadata: normalizeMetadata(event.metadata),
    warnings: [...event.warnings],
  };
}

function resolveRecoveryHistoryState(
  records: RuntimeRecoveryHistoryRecord[],
  replay: RuntimeReplaySnapshot,
): RuntimeRecoveryHistoryState {
  if (
    records.some(
      (record) => record.kind === "failover" || record.kind === "blocked",
    )
  ) {
    return "critical";
  }

  if (records.length === 0) return "empty";

  if (!replay.ok) return "partial";

  return "available";
}

/* ============================================================================
 * HISTORY BUILDER — PURE OBSERVE / RECONSTRUCTION
 * ========================================================================== */

export async function buildRuntimeGovernanceRecoveryHistory(input: {
  limit?: number | null;
} = {}): Promise<RuntimeRecoveryHistorySnapshot> {
  const generatedAt = nowIso();

  const replay = await buildRuntimeGovernanceReplayCore({
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
  });

  const records = replay.events
    .map(mapReplayEvent)
    .filter((record) => isRecoveryRelevant(record.kind))
    .sort(
      (left, right) =>
        new Date(right.ts).getTime() - new Date(left.ts).getTime(),
    );

  const state = resolveRecoveryHistoryState(records, replay);

  const warnings = uniqueWarnings(
    replay.warnings,
    records.flatMap((record) => record.warnings),
    state !== "available"
      ? [`runtime_governance_recovery_history_${state}`]
      : [],
  );

  return {
    ok: state === "available" || state === "partial",
    generated_at: generatedAt,

    state,

    records,

    total_records: records.length,
    recovery_records: records.filter((record) => record.kind === "recovery")
      .length,
    failover_records: records.filter((record) => record.kind === "failover")
      .length,
    degradation_records: records.filter(
      (record) => record.kind === "degradation",
    ).length,
    protected_records: records.filter(
      (record) => record.kind === "protected_mode",
    ).length,
    blocked_records: records.filter((record) => record.kind === "blocked")
      .length,

    replay,

    warnings,
    error:
      state === "critical"
        ? "runtime_governance_recovery_history_critical"
        : state === "empty"
          ? "runtime_governance_recovery_history_empty"
          : null,
  };
}

/* ============================================================================
 * EXPLICIT MUTATION — OPTIONAL EVENT EMISSION
 * ========================================================================== */

export async function emitRuntimeGovernanceRecoveryHistoryEvent(
  snapshot: RuntimeRecoveryHistorySnapshot,
): Promise<RuntimeRecoveryHistoryMutationResult> {
  const emittedAt = nowIso();

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      snapshot.state === "critical"
        ? "critical"
        : snapshot.state === "partial"
          ? "high"
          : "normal",
    payload: {
      recovery_history_state: snapshot.state,
      recovery_history_records: snapshot.total_records,
      recovery_records: snapshot.recovery_records,
      failover_records: snapshot.failover_records,
      degradation_records: snapshot.degradation_records,
      protected_records: snapshot.protected_records,
      blocked_records: snapshot.blocked_records,
    },
    warnings:
      snapshot.state === "available"
        ? []
        : [`runtime_governance_recovery_history_${snapshot.state}`],
  });

  return {
    ok: true,
    emitted_at: emittedAt,
    snapshot,
    warnings: ["runtime_governance_recovery_history_event_emitted"],
    error: null,
  };
}

/* ============================================================================
 * READERS — PURE OBSERVE
 * ========================================================================== */

export async function listRuntimeRecoveryHistoryRecords(input: {
  limit?: number | null;
} = {}): Promise<RuntimeRecoveryHistoryRecord[]> {
  const snapshot = await buildRuntimeGovernanceRecoveryHistory({
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
  });

  return snapshot.records;
}

export async function getRuntimeRecoveryHistoryState(): Promise<RuntimeRecoveryHistoryState> {
  const snapshot = await buildRuntimeGovernanceRecoveryHistory();

  return snapshot.state;
}
