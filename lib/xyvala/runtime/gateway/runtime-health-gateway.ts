/* ============================================================================
 * FILE: lib/xyvala/runtime/gateway/runtime-health-gateway.ts
 * ========================================================================== */

import {
  getClusterState,
  type ClusterState,
} from "@/lib/xyvala/runtime/cluster/cluster-orchestrator";

import {
  listDistributedJobs,
  type DistributedQueueJob,
} from "@/lib/xyvala/runtime/queue/distributed-queue";

import {
  buildObservabilityDashboard,
  type ObservabilityDashboardSnapshot,
  type ObservabilityStatus,
} from "@/lib/xyvala/runtime/observability/observability-dashboard";

import {
  collectRuntimeMetrics,
  type RuntimeHealthState,
} from "@/lib/xyvala/runtime/metrics/runtime-metrics-service";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RuntimeGatewayStatus =
  | "healthy"
  | "degraded"
  | "critical"
  | "unknown";

export type RuntimeHealthGatewaySnapshot = {
  ok: boolean;
  generated_at: string;

  status: RuntimeGatewayStatus;
  runtime_health_state: RuntimeHealthState;
  observability_status: ObservabilityStatus;

  cluster: ClusterState | null;

  queue: {
    total: number;
    queued: number;
    reserved: number;
    completed: number;
    failed: number;
    dead: number;
  };

  postgres_connected: boolean;
  redis_connected: boolean;
  distributed_quota_sync_ok: boolean;

  observability: ObservabilityDashboardSnapshot;

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

function resolveGatewayStatus(input: {
  runtime: RuntimeHealthState;
  observability: ObservabilityStatus;
  cluster: ClusterState | null;
  queue_dead: number;
}): RuntimeGatewayStatus {
  if (
    input.runtime === "critical" ||
    input.observability === "critical" ||
    input.queue_dead > 0
  ) {
    return "critical";
  }

  if (
    input.runtime === "degraded" ||
    input.observability === "degraded" ||
    !input.cluster ||
    input.cluster.active_nodes === 0 ||
    input.cluster.stale_nodes > 0 ||
    input.cluster.offline_nodes > 0
  ) {
    return "degraded";
  }

  if (input.runtime === "healthy" && input.observability === "healthy") {
    return "healthy";
  }

  return "unknown";
}

function summarizeQueue(jobs: DistributedQueueJob[]): RuntimeHealthGatewaySnapshot["queue"] {
  return {
    total: jobs.length,
    queued: jobs.filter((job) => job.status === "queued").length,
    reserved: jobs.filter((job) => job.status === "reserved").length,
    completed: jobs.filter((job) => job.status === "completed").length,
    failed: jobs.filter((job) => job.status === "failed").length,
    dead: jobs.filter((job) => job.status === "dead").length,
  };
}

/* ============================================================================
 * 3. GATEWAY
 * ========================================================================== */

export async function buildRuntimeHealthGateway(): Promise<RuntimeHealthGatewaySnapshot> {
  const generatedAt = nowIso();

  const [metrics, observability, clusterResult, queueResult] =
    await Promise.all([
      collectRuntimeMetrics(),
      buildObservabilityDashboard(),
      getClusterState(),
      listDistributedJobs(),
    ]);

  const cluster = clusterResult.ok ? clusterResult.data : null;
  const queueJobs = queueResult.ok && queueResult.data ? queueResult.data : [];
  const queue = summarizeQueue(queueJobs);

  const status = resolveGatewayStatus({
    runtime: metrics.health_state,
    observability: observability.status,
    cluster,
    queue_dead: queue.dead,
  });

  const warnings = uniqueWarnings(
    metrics.warnings,
    observability.warnings,
    clusterResult.warnings,
    queueResult.warnings,
    queue.dead > 0 ? ["distributed_queue_dead_jobs_detected"] : [],
    queue.failed > 0 ? ["distributed_queue_failed_jobs_detected"] : [],
    !cluster ? ["cluster_state_unavailable"] : [],
  );

  return {
    ok: status !== "critical",
    generated_at: generatedAt,

    status,
    runtime_health_state: metrics.health_state,
    observability_status: observability.status,

    cluster,

    queue,

    postgres_connected: metrics.postgres_connected,
    redis_connected: metrics.redis_connected,
    distributed_quota_sync_ok: metrics.distributed_quota_sync_ok,

    observability,

    warnings,
    error: status === "critical" ? "runtime_health_gateway_critical" : null,
  };
}

/* ============================================================================
 * 4. CONVENIENCE READERS
 * ========================================================================== */

export async function getRuntimeGatewayStatus(): Promise<RuntimeGatewayStatus> {
  const snapshot = await buildRuntimeHealthGateway();

  return snapshot.status;
}

export async function isRuntimeGatewayHealthy(): Promise<boolean> {
  const snapshot = await buildRuntimeHealthGateway();

  return snapshot.status === "healthy";
}
