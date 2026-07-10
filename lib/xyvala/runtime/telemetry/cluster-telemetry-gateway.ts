/* ============================================================================
 * FILE: lib/xyvala/runtime/telemetry/cluster-telemetry-gateway.ts
 * ============================================================================
 * TITLE
 * - Cluster telemetry gateway
 *
 * ROLE
 * - read and aggregate cluster telemetry
 * - expose deterministic telemetry snapshots
 * - qualify runtime health without mutation
 *
 * DIRECTIVES
 * - observe only
 * - no runtime mutation
 * - no event publishing
 * - no failover trigger
 * - no recovery trigger
 * - no queue writes
 * - no persistence writes
 * - no cache invalidation
 * - no governance mutation
 *
 * INVARIANTS
 * - telemetry observes only
 * - telemetry never governs runtime
 * - telemetry never mutates cluster state
 * - telemetry never creates analytical truth
 * ========================================================================== */

import {
  getClusterState,
  type ClusterState,
} from "@/lib/xyvala/runtime/cluster/cluster-orchestrator";

import {
  evaluateDistributedWorkerBalance,
  type WorkerBalanceEvaluation,
} from "@/lib/xyvala/runtime/balancer/distributed-worker-balancer";

import {
  evaluateProductionFailover,
  type FailoverEvaluation,
} from "@/lib/xyvala/runtime/failover/production-failover-manager";

import {
  buildRuntimeHealthGateway,
  type RuntimeHealthGatewaySnapshot,
} from "@/lib/xyvala/runtime/gateway/runtime-health-gateway";

import {
  listNodeRecoveryRecords,
  type NodeRecoveryRecord,
} from "@/lib/xyvala/runtime/recovery/node-recovery-manager";

export type ClusterTelemetryState =
  | "healthy"
  | "degraded"
  | "critical"
  | "unknown";

export type ClusterTelemetrySignal = {
  key: string;
  value: number;
  state: ClusterTelemetryState;
  warnings: string[];
};

export type ClusterTelemetrySnapshot = {
  ok: boolean;
  generated_at: string;

  state: ClusterTelemetryState;

  cluster: ClusterState | null;
  health: RuntimeHealthGatewaySnapshot;
  failover: FailoverEvaluation;
  balance: WorkerBalanceEvaluation;
  recovery_records: NodeRecoveryRecord[];

  signals: ClusterTelemetrySignal[];

  warnings: string[];
  error: string | null;
};

function nowIso(): string {
  return new Date().toISOString();
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function uniqueWarnings(...groups: Array<string[] | undefined | null>): string[] {
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

function signal(input: ClusterTelemetrySignal): ClusterTelemetrySignal {
  return {
    key: input.key,
    value: clampNonNegative(input.value),
    state: input.state,
    warnings: uniqueWarnings(input.warnings),
  };
}

function hasBlockedRecovery(records: NodeRecoveryRecord[]): boolean {
  return records.some((record) => record.blocked_until !== null);
}

function resolveState(input: {
  health: RuntimeHealthGatewaySnapshot;
  failover: FailoverEvaluation;
  balance: WorkerBalanceEvaluation;
  recovery_records: NodeRecoveryRecord[];
}): ClusterTelemetryState {
  if (
    input.health.status === "critical" ||
    input.failover.decision === "FAILOVER" ||
    input.balance.decision === "BLOCK"
  ) {
    return "critical";
  }

  if (
    input.health.status === "degraded" ||
    input.failover.decision === "WATCH" ||
    input.failover.decision === "RECOVERY" ||
    input.balance.decision === "WATCH" ||
    input.balance.decision === "REBALANCE" ||
    hasBlockedRecovery(input.recovery_records)
  ) {
    return "degraded";
  }

  if (
    input.health.status === "healthy" &&
    input.failover.decision === "STABLE" &&
    input.balance.decision === "BALANCED"
  ) {
    return "healthy";
  }

  return "unknown";
}

function buildTelemetrySignals(input: {
  cluster: ClusterState | null;
  health: RuntimeHealthGatewaySnapshot;
  balance: WorkerBalanceEvaluation;
  recovery_records: NodeRecoveryRecord[];
}): ClusterTelemetrySignal[] {
  const blockedRecoveryRecords = input.recovery_records.filter(
    (record) => record.blocked_until !== null,
  ).length;

  return [
    signal({
      key: "cluster_active_nodes",
      value: input.cluster?.active_nodes ?? 0,
      state:
        input.cluster && input.cluster.active_nodes > 0
          ? "healthy"
          : "critical",
      warnings:
        input.cluster && input.cluster.active_nodes > 0
          ? []
          : ["cluster_no_active_nodes"],
    }),

    signal({
      key: "cluster_stale_nodes",
      value: input.cluster?.stale_nodes ?? 0,
      state:
        input.cluster && input.cluster.stale_nodes > 0
          ? "degraded"
          : "healthy",
      warnings:
        input.cluster && input.cluster.stale_nodes > 0
          ? ["cluster_stale_nodes_detected"]
          : [],
    }),

    signal({
      key: "cluster_offline_nodes",
      value: input.cluster?.offline_nodes ?? 0,
      state:
        input.cluster && input.cluster.offline_nodes > 0
          ? "degraded"
          : "healthy",
      warnings:
        input.cluster && input.cluster.offline_nodes > 0
          ? ["cluster_offline_nodes_detected"]
          : [],
    }),

    signal({
      key: "queue_dead_jobs",
      value: input.health.queue.dead,
      state: input.health.queue.dead > 0 ? "critical" : "healthy",
      warnings:
        input.health.queue.dead > 0 ? ["queue_dead_jobs_detected"] : [],
    }),

    signal({
      key: "queue_failed_jobs",
      value: input.health.queue.failed,
      state: input.health.queue.failed > 0 ? "degraded" : "healthy",
      warnings:
        input.health.queue.failed > 0 ? ["queue_failed_jobs_detected"] : [],
    }),

    signal({
      key: "worker_active_count",
      value: input.balance.active_workers,
      state: input.balance.active_workers > 0 ? "healthy" : "critical",
      warnings:
        input.balance.active_workers > 0 ? [] : ["worker_active_count_zero"],
    }),

    signal({
      key: "recovery_records_total",
      value: input.recovery_records.length,
      state: "healthy",
      warnings: [],
    }),

    signal({
      key: "recovery_blocked_records",
      value: blockedRecoveryRecords,
      state: blockedRecoveryRecords > 0 ? "degraded" : "healthy",
      warnings:
        blockedRecoveryRecords > 0
          ? ["node_recovery_blocked_records_detected"]
          : [],
    }),
  ];
}

/* ============================================================================
 * TELEMETRY GATEWAY — PURE OBSERVE / SNAPSHOT
 * ========================================================================== */

export async function buildClusterTelemetryGateway(): Promise<ClusterTelemetrySnapshot> {
  const generatedAt = nowIso();

  const [clusterResult, health, failover, balance] = await Promise.all([
    getClusterState(),
    buildRuntimeHealthGateway(),
    evaluateProductionFailover(),
    evaluateDistributedWorkerBalance(),
  ]);

  const cluster = clusterResult.ok ? clusterResult.data : null;
  const recoveryRecords = listNodeRecoveryRecords();

  const state = resolveState({
    health,
    failover,
    balance,
    recovery_records: recoveryRecords,
  });

  const signals = buildTelemetrySignals({
    cluster,
    health,
    balance,
    recovery_records: recoveryRecords,
  });

  const warnings = uniqueWarnings(
    clusterResult.warnings,
    health.warnings,
    failover.warnings,
    balance.warnings,
    recoveryRecords.flatMap((record) => record.warnings),
    signals.flatMap((item) => item.warnings),
  );

  return {
    ok: state !== "critical",
    generated_at: generatedAt,

    state,

    cluster,
    health,
    failover,
    balance,
    recovery_records: recoveryRecords,

    signals,

    warnings,
    error: state === "critical" ? "cluster_telemetry_critical" : null,
  };
}

/* ============================================================================
 * READERS — PURE OBSERVE
 * ========================================================================== */

export async function getClusterTelemetryState(): Promise<ClusterTelemetryState> {
  const snapshot = await buildClusterTelemetryGateway();

  return snapshot.state;
}

export async function getClusterTelemetrySignals(): Promise<
  ClusterTelemetrySignal[]
> {
  const snapshot = await buildClusterTelemetryGateway();

  return snapshot.signals;
}
