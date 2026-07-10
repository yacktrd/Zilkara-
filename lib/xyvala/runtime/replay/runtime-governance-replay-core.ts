/* ============================================================================
 * FILE: lib/xyvala/runtime/replay/runtime-governance-replay-core.ts
 * ========================================================================== */

import {
  buildRuntimeGovernanceHistory,
  type RuntimeGovernanceHistoryEvent,
  type RuntimeGovernanceHistorySnapshot,
} from "@/lib/xyvala/runtime/history/runtime-governance-history";

import {
  buildRuntimeEventHistoryRegistry,
  type RuntimeEventHistoryRecord,
  type RuntimeEventHistorySnapshot,
} from "@/lib/xyvala/runtime/history/runtime-event-history-registry";

import {
  buildRuntimeContractIntegrityCore,
  type RuntimeContractIntegritySnapshot,
} from "@/lib/xyvala/runtime/integrity/runtime-contract-integrity-core";

import {
  publishRuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

import type {
  RuntimeMutationScope,
} from "@/lib/xyvala/runtime/policies/production-runtime-policy-engine";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RuntimeReplayState =
  | "consistent"
  | "partial"
  | "divergent"
  | "empty"
  | "unknown";

export type RuntimeReplayReason =
  | "runtime_replay_consistent"
  | "runtime_replay_partial"
  | "runtime_replay_divergent"
  | "runtime_replay_empty"
  | "runtime_replay_unknown";

export type RuntimeReplayEventKind =
  | "governance"
  | "runtime_event"
  | "audit";

export type RuntimeReplayEvent = {
  id: string;
  kind: RuntimeReplayEventKind;
  ts: string;

  key: string;
  value: number | null;

  metadata: Record<string, string | number | boolean | null>;
  warnings: string[];
};

export type RuntimeReplaySnapshot = {
  ok: boolean;
  replayed_at: string;

  scope: RuntimeMutationScope;

  state: RuntimeReplayState;
  reason: RuntimeReplayReason;

  events: RuntimeReplayEvent[];

  total_events: number;
  governance_events: number;
  runtime_events: number;
  audit_events: number;

  history: RuntimeGovernanceHistorySnapshot;
  event_history: RuntimeEventHistorySnapshot;
  integrity: RuntimeContractIntegritySnapshot;

  warnings: string[];
  error: string | null;
};

export type RuntimeReplayMutationResult = {
  ok: boolean;
  emitted_at: string;
  snapshot: RuntimeReplaySnapshot;
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

function mapGovernanceEvent(
  event: RuntimeGovernanceHistoryEvent,
): RuntimeReplayEvent {
  return {
    id: event.id,
    kind: "governance",
    ts: event.ts,

    key: event.key,
    value: event.value,

    metadata: normalizeMetadata(event.metadata),
    warnings: [...event.warnings],
  };
}

function mapRuntimeEvent(
  event: RuntimeEventHistoryRecord,
): RuntimeReplayEvent {
  return {
    id: event.id,
    kind: event.kind === "audit_event" ? "audit" : "runtime_event",
    ts: event.ts,

    key: event.event_key,
    value: null,

    metadata: normalizeMetadata(event.payload),
    warnings: [...event.warnings],
  };
}

function resolveReplay(input: {
  events: RuntimeReplayEvent[];
  history: RuntimeGovernanceHistorySnapshot;
  event_history: RuntimeEventHistorySnapshot;
  integrity: RuntimeContractIntegritySnapshot;
}): {
  state: RuntimeReplayState;
  reason: RuntimeReplayReason;
} {
  if (input.events.length === 0) {
    return {
      state: "empty",
      reason: "runtime_replay_empty",
    };
  }

  if (!input.integrity.ok) {
    return {
      state: "divergent",
      reason: "runtime_replay_divergent",
    };
  }

  if (!input.history.ok || !input.event_history.ok) {
    return {
      state: "partial",
      reason: "runtime_replay_partial",
    };
  }

  if (
    input.history.ok &&
    input.event_history.ok &&
    input.integrity.ok
  ) {
    return {
      state: "consistent",
      reason: "runtime_replay_consistent",
    };
  }

  return {
    state: "unknown",
    reason: "runtime_replay_unknown",
  };
}

/* ============================================================================
 * 3. REPLAY CORE — PURE RECONSTRUCTION
 * ========================================================================== */

export async function buildRuntimeGovernanceReplayCore(input: {
  scope?: RuntimeMutationScope;
  limit?: number | null;
} = {}): Promise<RuntimeReplaySnapshot> {
  const replayedAt = nowIso();
  const scope = input.scope ?? "read";

  const [history, eventHistory, integrity] = await Promise.all([
    buildRuntimeGovernanceHistory({
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    }),
    buildRuntimeEventHistoryRegistry({
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    }),
    buildRuntimeContractIntegrityCore({ scope }),
  ]);

  const events = [
    ...history.events.map(mapGovernanceEvent),
    ...eventHistory.records.map(mapRuntimeEvent),
  ].sort(
    (left, right) =>
      new Date(left.ts).getTime() - new Date(right.ts).getTime(),
  );

  const resolved = resolveReplay({
    events,
    history,
    event_history: eventHistory,
    integrity,
  });

  const warnings = uniqueWarnings(
    history.warnings,
    eventHistory.warnings,
    integrity.warnings,
    events.flatMap((event) => event.warnings),
    resolved.state !== "consistent"
      ? [`runtime_governance_replay_${resolved.reason}`]
      : [],
  );

  return {
    ok: resolved.state === "consistent" || resolved.state === "partial",

    replayed_at: replayedAt,

    scope,

    state: resolved.state,
    reason: resolved.reason,

    events,

    total_events: events.length,
    governance_events: events.filter((event) => event.kind === "governance")
      .length,
    runtime_events: events.filter((event) => event.kind === "runtime_event")
      .length,
    audit_events: events.filter((event) => event.kind === "audit").length,

    history,
    event_history: eventHistory,
    integrity,

    warnings,
    error:
      resolved.state === "divergent" || resolved.state === "empty"
        ? `runtime_governance_replay_${resolved.reason}`
        : null,
  };
}

/* ============================================================================
 * 4. EXPLICIT MUTATION — OPTIONAL EVENT EMISSION
 * ========================================================================== */

export async function emitRuntimeGovernanceReplayEvent(
  snapshot: RuntimeReplaySnapshot,
): Promise<RuntimeReplayMutationResult> {
  const emittedAt = nowIso();

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      snapshot.state === "divergent"
        ? "critical"
        : snapshot.state === "partial" || snapshot.state === "unknown"
          ? "high"
          : "normal",
    payload: {
      replay_scope: snapshot.scope,
      replay_state: snapshot.state,
      replay_reason: snapshot.reason,
      replay_events: snapshot.total_events,
      governance_events: snapshot.governance_events,
      runtime_events: snapshot.runtime_events,
      audit_events: snapshot.audit_events,
      integrity_state: snapshot.integrity.state,
    },
    warnings:
      snapshot.state === "consistent"
        ? []
        : [`runtime_governance_replay_${snapshot.reason}`],
  });

  return {
    ok: true,
    emitted_at: emittedAt,
    snapshot,
    warnings: ["runtime_governance_replay_event_emitted"],
    error: null,
  };
}

/* ============================================================================
 * 5. READERS — PURE OBSERVE
 * ========================================================================== */

export async function getRuntimeReplayState(): Promise<RuntimeReplayState> {
  const snapshot = await buildRuntimeGovernanceReplayCore();

  return snapshot.state;
}

export async function listRuntimeReplayEvents(input: {
  limit?: number | null;
} = {}): Promise<RuntimeReplayEvent[]> {
  const snapshot = await buildRuntimeGovernanceReplayCore({
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
  });

  return snapshot.events;
}

export async function isRuntimeReplayConsistent(): Promise<boolean> {
  const snapshot = await buildRuntimeGovernanceReplayCore();

  return snapshot.ok && snapshot.state === "consistent";
}
