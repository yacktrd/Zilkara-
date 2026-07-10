/* ============================================================================
 * FILE: lib/xyvala/runtime/recovery/node-recovery-manager.ts
 * ========================================================================== */

import type {
  ClusterNode,
  ClusterState,
} from "@/lib/xyvala/runtime/cluster/cluster-orchestrator";

import {
  getClusterState,
  heartbeatClusterNode,
  registerClusterNode,
} from "@/lib/xyvala/runtime/cluster/cluster-orchestrator";

import {
  evaluateProductionRecoveryReadiness,
} from "@/lib/xyvala/runtime/failover/production-failover-manager";

import {
  evaluateDistributedWorkerBalance,
} from "@/lib/xyvala/runtime/balancer/distributed-worker-balancer";

import {
  publishRuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type NodeRecoveryDecision =
  | "RECOVER"
  | "WATCH"
  | "BLOCK"
  | "SKIP";

export type NodeRecoveryReason =
  | "node_recovery_ready"
  | "node_not_found"
  | "node_already_active"
  | "node_stale_watch_required"
  | "node_offline_cooldown_required"
  | "node_recovery_attempt_limit_reached"
  | "cluster_unavailable"
  | "runtime_not_ready"
  | "worker_balance_not_ready"
  | "node_id_invalid";

export type NodeRecoveryAction =
  | "observe"
  | "refresh_heartbeat"
  | "register_node"
  | "wait_cooldown"
  | "emit_warning"
  | "block_recovery";

export type NodeRecoveryRecord = {
  node_id: string;
  attempts: number;
  last_attempt_at: string | null;
  blocked_until: string | null;
  warnings: string[];
};

export type NodeRecoveryEvaluation = {
  ok: boolean;
  evaluated_at: string;

  node_id: string;

  decision: NodeRecoveryDecision;
  reason: NodeRecoveryReason;
  actions: NodeRecoveryAction[];

  cluster: ClusterState | null;
  node: ClusterNode | null;

  recovery_record: NodeRecoveryRecord;

  warnings: string[];
  error: string | null;
};

export type NodeRecoveryMutationResult = {
  ok: boolean;
  mutated_at: string;
  evaluation: NodeRecoveryEvaluation;
  recovery_record: NodeRecoveryRecord;
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. STORE
 * ========================================================================== */

type NodeRecoveryStore = {
  records: Map<string, NodeRecoveryRecord>;
};

declare global {
  // eslint-disable-next-line no-var
  var __XYVALA_NODE_RECOVERY_STORE__: NodeRecoveryStore | undefined;
}

function getStore(): NodeRecoveryStore {
  if (!globalThis.__XYVALA_NODE_RECOVERY_STORE__) {
    globalThis.__XYVALA_NODE_RECOVERY_STORE__ = {
      records: new Map(),
    };
  }

  return globalThis.__XYVALA_NODE_RECOVERY_STORE__;
}

/* ============================================================================
 * 3. CONFIG
 * ========================================================================== */

const MAX_RECOVERY_ATTEMPTS = 5;
const RECOVERY_COOLDOWN_MS = 5 * 60_000;
const BLOCK_DURATION_MS = 30 * 60_000;

/* ============================================================================
 * 4. HELPERS
 * ========================================================================== */

function nowMs(): number {
  return Date.now();
}

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

function cloneRecord(record: NodeRecoveryRecord): NodeRecoveryRecord {
  return {
    ...record,
    warnings: [...record.warnings],
  };
}

function buildEmptyRecoveryRecord(nodeId: string): NodeRecoveryRecord {
  return {
    node_id: nodeId,
    attempts: 0,
    last_attempt_at: null,
    blocked_until: null,
    warnings: [],
  };
}

function readRecoveryRecord(nodeId: string): NodeRecoveryRecord {
  const existing = getStore().records.get(nodeId);

  return existing ? cloneRecord(existing) : buildEmptyRecoveryRecord(nodeId);
}

function saveRecoveryRecord(record: NodeRecoveryRecord): NodeRecoveryRecord {
  getStore().records.set(record.node_id, cloneRecord(record));

  return cloneRecord(record);
}

function isBlocked(record: NodeRecoveryRecord): boolean {
  if (!record.blocked_until) return false;

  const blockedUntil = new Date(record.blocked_until).getTime();

  return Number.isFinite(blockedUntil) && blockedUntil > nowMs();
}

function isCooldownActive(record: NodeRecoveryRecord): boolean {
  if (!record.last_attempt_at) return false;

  const lastAttempt = new Date(record.last_attempt_at).getTime();

  if (!Number.isFinite(lastAttempt)) return false;

  return nowMs() - lastAttempt < RECOVERY_COOLDOWN_MS;
}

function resolveAttemptRecord(input: {
  record: NodeRecoveryRecord;
  warnings?: string[];
}): NodeRecoveryRecord {
  const attempts = input.record.attempts + 1;
  const shouldBlock = attempts >= MAX_RECOVERY_ATTEMPTS;

  return {
    ...input.record,
    attempts,
    last_attempt_at: nowIso(),
    blocked_until: shouldBlock
      ? new Date(nowMs() + BLOCK_DURATION_MS).toISOString()
      : input.record.blocked_until,
    warnings: uniqueWarnings(
      input.record.warnings,
      input.warnings,
      shouldBlock ? ["node_recovery_attempt_limit_reached"] : [],
    ),
  };
}

function resolveNode(
  cluster: ClusterState | null,
  nodeId: string,
): ClusterNode | null {
  return cluster?.nodes.find((node) => node.id === nodeId) ?? null;
}

function buildEvaluation(input: {
  node_id: string;
  decision: NodeRecoveryDecision;
  reason: NodeRecoveryReason;
  actions: NodeRecoveryAction[];
  cluster: ClusterState | null;
  node: ClusterNode | null;
  record: NodeRecoveryRecord;
  warnings?: string[];
}): NodeRecoveryEvaluation {
  return {
    ok: input.decision === "RECOVER" || input.decision === "SKIP",
    evaluated_at: nowIso(),

    node_id: input.node_id,

    decision: input.decision,
    reason: input.reason,
    actions: input.actions,

    cluster: input.cluster,
    node: input.node,

    recovery_record: cloneRecord(input.record),

    warnings: uniqueWarnings(input.warnings, input.record.warnings),
    error:
      input.decision === "BLOCK"
        ? `node_recovery_${input.reason}`
        : null,
  };
}

/* ============================================================================
 * 5. RECOVERY EVALUATION — PURE OBSERVE / COMPUTE
 * ========================================================================== */

export async function evaluateNodeRecovery(input: {
  node_id: string;
}): Promise<NodeRecoveryEvaluation> {
  const nodeId = safeString(input.node_id);

  if (!nodeId) {
    const record = buildEmptyRecoveryRecord("unknown");

    return buildEvaluation({
      node_id: "",
      decision: "BLOCK",
      reason: "node_id_invalid",
      actions: ["block_recovery"],
      cluster: null,
      node: null,
      record,
      warnings: ["node_id_invalid"],
    });
  }

  const record = readRecoveryRecord(nodeId);

  if (isBlocked(record)) {
    return buildEvaluation({
      node_id: nodeId,
      decision: "BLOCK",
      reason: "node_recovery_attempt_limit_reached",
      actions: ["block_recovery"],
      cluster: null,
      node: null,
      record,
      warnings: ["node_recovery_block_active"],
    });
  }

  const [clusterResult, recoveryReadiness, workerBalance] = await Promise.all([
    getClusterState(),
    evaluateProductionRecoveryReadiness(),
    evaluateDistributedWorkerBalance(),
  ]);

  const cluster = clusterResult.ok ? clusterResult.data : null;
  const node = resolveNode(cluster, nodeId);

  if (!cluster) {
    const projected = resolveAttemptRecord({
      record,
      warnings: ["cluster_unavailable"],
    });

    return buildEvaluation({
      node_id: nodeId,
      decision: "BLOCK",
      reason: "cluster_unavailable",
      actions: ["block_recovery"],
      cluster,
      node,
      record: projected,
      warnings: clusterResult.warnings,
    });
  }

  if (recoveryReadiness.decision === "FAILOVER") {
    const projected = resolveAttemptRecord({
      record,
      warnings: ["runtime_not_ready"],
    });

    return buildEvaluation({
      node_id: nodeId,
      decision: "WATCH",
      reason: "runtime_not_ready",
      actions: ["emit_warning", "wait_cooldown"],
      cluster,
      node,
      record: projected,
      warnings: recoveryReadiness.warnings,
    });
  }

  if (workerBalance.decision === "BLOCK") {
    const projected = resolveAttemptRecord({
      record,
      warnings: ["worker_balance_not_ready"],
    });

    return buildEvaluation({
      node_id: nodeId,
      decision: "WATCH",
      reason: "worker_balance_not_ready",
      actions: ["emit_warning", "wait_cooldown"],
      cluster,
      node,
      record: projected,
      warnings: workerBalance.warnings,
    });
  }

  if (!node) {
    if (isCooldownActive(record)) {
      return buildEvaluation({
        node_id: nodeId,
        decision: "WATCH",
        reason: "node_offline_cooldown_required",
        actions: ["wait_cooldown", "emit_warning"],
        cluster,
        node,
        record,
        warnings: ["node_recovery_cooldown_active"],
      });
    }

    return buildEvaluation({
      node_id: nodeId,
      decision: "RECOVER",
      reason: "node_recovery_ready",
      actions: ["register_node", "refresh_heartbeat"],
      cluster,
      node,
      record,
      warnings: ["node_missing_but_recoverable"],
    });
  }

  if (node.status === "active") {
    return buildEvaluation({
      node_id: nodeId,
      decision: "SKIP",
      reason: "node_already_active",
      actions: ["observe"],
      cluster,
      node,
      record,
      warnings: node.warnings,
    });
  }

  if (node.status === "stale") {
    const projected = resolveAttemptRecord({
      record,
      warnings: ["node_stale_watch_required"],
    });

    return buildEvaluation({
      node_id: nodeId,
      decision: "WATCH",
      reason: "node_stale_watch_required",
      actions: ["refresh_heartbeat", "emit_warning"],
      cluster,
      node,
      record: projected,
      warnings: node.warnings,
    });
  }

  if (node.status === "offline") {
    if (isCooldownActive(record)) {
      return buildEvaluation({
        node_id: nodeId,
        decision: "WATCH",
        reason: "node_offline_cooldown_required",
        actions: ["wait_cooldown", "emit_warning"],
        cluster,
        node,
        record,
        warnings: node.warnings,
      });
    }

    return buildEvaluation({
      node_id: nodeId,
      decision: "RECOVER",
      reason: "node_recovery_ready",
      actions: ["register_node", "refresh_heartbeat"],
      cluster,
      node,
      record,
      warnings: node.warnings,
    });
  }

  return buildEvaluation({
    node_id: nodeId,
    decision: "WATCH",
    reason: "node_stale_watch_required",
    actions: ["emit_warning"],
    cluster,
    node,
    record,
    warnings: node.warnings,
  });
}

/* ============================================================================
 * 6. EXPLICIT MUTATION — RECOVERY ATTEMPT RECORD
 * ========================================================================== */

export function recordNodeRecoveryAttempt(
  evaluation: NodeRecoveryEvaluation,
): NodeRecoveryMutationResult {
  const mutatedAt = nowIso();

  if (
    evaluation.decision !== "WATCH" &&
    evaluation.decision !== "BLOCK"
  ) {
    return {
      ok: true,
      mutated_at: mutatedAt,
      evaluation,
      recovery_record: evaluation.recovery_record,
      warnings: ["node_recovery_attempt_record_not_required"],
      error: null,
    };
  }

  const persisted = saveRecoveryRecord(evaluation.recovery_record);

  return {
    ok: true,
    mutated_at: mutatedAt,
    evaluation: {
      ...evaluation,
      recovery_record: persisted,
    },
    recovery_record: persisted,
    warnings: ["node_recovery_attempt_recorded"],
    error: null,
  };
}

/* ============================================================================
 * 7. EXPLICIT MUTATION — RECOVERY EXECUTION
 * ========================================================================== */

export async function recoverNode(input: {
  node_id: string;
  capabilities?: string[];
}): Promise<NodeRecoveryEvaluation> {
  const evaluation = await evaluateNodeRecovery({
    node_id: input.node_id,
  });

  if (evaluation.decision !== "RECOVER") {
    return evaluation;
  }

  const registered = await registerClusterNode({
    node_id: evaluation.node_id,
    capabilities: input.capabilities ?? ["worker"],
  });

  const heartbeat = await heartbeatClusterNode({
    node_id: evaluation.node_id,
  });

  const record = saveRecoveryRecord({
    ...evaluation.recovery_record,
    attempts: 0,
    last_attempt_at: nowIso(),
    blocked_until: null,
    warnings: uniqueWarnings(
      evaluation.recovery_record.warnings,
      registered.warnings,
      heartbeat.warnings,
      ["node_recovered"],
    ),
  });

  return {
    ...evaluation,
    ok: registered.ok && heartbeat.ok,
    recovery_record: record,
    warnings: uniqueWarnings(
      evaluation.warnings,
      registered.warnings,
      heartbeat.warnings,
      ["node_recovery_completed"],
    ),
    error:
      registered.ok && heartbeat.ok
        ? null
        : registered.error ?? heartbeat.error ?? "node_recovery_failed",
  };
}

/* ============================================================================
 * 8. EXPLICIT MUTATION — OPTIONAL EVENT EMISSION
 * ========================================================================== */

export async function emitNodeRecoveryEvent(
  evaluation: NodeRecoveryEvaluation,
): Promise<NodeRecoveryMutationResult> {
  const mutatedAt = nowIso();

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      evaluation.decision === "BLOCK"
        ? "critical"
        : evaluation.decision === "WATCH"
          ? "high"
          : "normal",
    payload: {
      node_id: evaluation.node_id,
      recovery_decision: evaluation.decision,
      recovery_reason: evaluation.reason,
    },
    warnings:
      evaluation.decision === "RECOVER" || evaluation.decision === "SKIP"
        ? []
        : [`node_recovery_${evaluation.reason}`],
  });

  return {
    ok: true,
    mutated_at: mutatedAt,
    evaluation,
    recovery_record: evaluation.recovery_record,
    warnings: ["node_recovery_event_emitted"],
    error: null,
  };
}

/* ============================================================================
 * 9. READERS — PURE OBSERVE
 * ========================================================================== */

export function getNodeRecoveryRecord(
  nodeId: string,
): NodeRecoveryRecord | null {
  const record = getStore().records.get(safeString(nodeId));

  return record ? cloneRecord(record) : null;
}

export function listNodeRecoveryRecords(): NodeRecoveryRecord[] {
  return [...getStore().records.values()].map(cloneRecord);
}

/* ============================================================================
 * 10. MUTATE — MAINTENANCE
 * ========================================================================== */

export function clearNodeRecoveryStore(): void {
  getStore().records.clear();
}
