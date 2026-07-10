/* ============================================================================
 * FILE: lib/xyvala/runtime/balancer/distributed-worker-balancer.ts
 * ========================================================================== */

import type {
  ClusterNode,
  ClusterState,
} from "@/lib/xyvala/runtime/cluster/cluster-orchestrator";

import {
  getClusterState,
} from "@/lib/xyvala/runtime/cluster/cluster-orchestrator";

import {
  listDistributedJobs,
  type DistributedQueueJob,
} from "@/lib/xyvala/runtime/queue/distributed-queue";

import {
  publishRuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type WorkerBalanceDecision =
  | "BALANCED"
  | "WATCH"
  | "REBALANCE"
  | "BLOCK";

export type WorkerBalanceReason =
  | "workers_balanced"
  | "cluster_unavailable"
  | "no_active_workers"
  | "queue_pressure_detected"
  | "dead_jobs_detected"
  | "reserved_jobs_overloaded"
  | "stale_nodes_detected"
  | "offline_nodes_detected";

export type WorkerBalanceAction =
  | "observe"
  | "emit_warning"
  | "request_more_workers"
  | "rebalance_reserved_jobs"
  | "pause_unhealthy_nodes"
  | "request_queue_recovery";

export type WorkerLoadSnapshot = {
  node_id: string;
  status: ClusterNode["status"];
  role: ClusterNode["role"];

  reserved_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  dead_jobs: number;

  load_score: number;

  warnings: string[];
};

export type WorkerBalanceEvaluation = {
  ok: boolean;
  evaluated_at: string;

  decision: WorkerBalanceDecision;
  reason: WorkerBalanceReason;

  cluster: ClusterState | null;

  active_workers: number;
  queued_jobs: number;
  reserved_jobs: number;
  dead_jobs: number;

  worker_loads: WorkerLoadSnapshot[];

  actions: WorkerBalanceAction[];

  warnings: string[];
  error: string | null;
};

export type WorkerBalanceMutationResult = {
  ok: boolean;
  emitted_at: string;
  evaluation: WorkerBalanceEvaluation;
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
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

function jobsReservedByWorker(
  jobs: DistributedQueueJob[],
  workerId: string,
): DistributedQueueJob[] {
  return jobs.filter((job) => job.reserved_by === workerId);
}

function buildWorkerLoad(input: {
  node: ClusterNode;
  jobs: DistributedQueueJob[];
}): WorkerLoadSnapshot {
  const workerJobs = jobsReservedByWorker(input.jobs, input.node.id);

  const reservedJobs = workerJobs.filter(
    (job) => job.status === "reserved",
  ).length;

  const completedJobs = workerJobs.filter(
    (job) => job.status === "completed",
  ).length;

  const failedJobs = workerJobs.filter(
    (job) => job.status === "failed",
  ).length;

  const deadJobs = workerJobs.filter((job) => job.status === "dead").length;

  const loadScore = clampNonNegative(
    reservedJobs * 3 + failedJobs * 5 + deadJobs * 10,
  );

  return {
    node_id: input.node.id,
    status: input.node.status,
    role: input.node.role,

    reserved_jobs: reservedJobs,
    completed_jobs: completedJobs,
    failed_jobs: failedJobs,
    dead_jobs: deadJobs,

    load_score: loadScore,

    warnings: uniqueWarnings(
      input.node.warnings,
      input.node.status !== "active"
        ? [`worker_node_${input.node.status}`]
        : [],
      deadJobs > 0 ? ["worker_dead_jobs_detected"] : [],
      failedJobs > 0 ? ["worker_failed_jobs_detected"] : [],
    ),
  };
}

function resolveDecision(input: {
  cluster: ClusterState | null;
  activeWorkers: number;
  queuedJobs: number;
  reservedJobs: number;
  deadJobs: number;
  workerLoads: WorkerLoadSnapshot[];
}): {
  decision: WorkerBalanceDecision;
  reason: WorkerBalanceReason;
  actions: WorkerBalanceAction[];
} {
  if (!input.cluster) {
    return {
      decision: "BLOCK",
      reason: "cluster_unavailable",
      actions: ["request_queue_recovery"],
    };
  }

  if (input.activeWorkers === 0) {
    return {
      decision: "BLOCK",
      reason: "no_active_workers",
      actions: ["request_more_workers", "request_queue_recovery"],
    };
  }

  if (input.deadJobs > 0) {
    return {
      decision: "REBALANCE",
      reason: "dead_jobs_detected",
      actions: ["request_queue_recovery", "emit_warning"],
    };
  }

  if (input.cluster.offline_nodes > 0) {
    return {
      decision: "REBALANCE",
      reason: "offline_nodes_detected",
      actions: ["pause_unhealthy_nodes", "rebalance_reserved_jobs"],
    };
  }

  if (input.cluster.stale_nodes > 0) {
    return {
      decision: "WATCH",
      reason: "stale_nodes_detected",
      actions: ["emit_warning"],
    };
  }

  const overloaded = input.workerLoads.some(
    (worker) => worker.load_score >= 25,
  );

  if (overloaded) {
    return {
      decision: "REBALANCE",
      reason: "reserved_jobs_overloaded",
      actions: ["rebalance_reserved_jobs", "emit_warning"],
    };
  }

  if (input.queuedJobs > input.activeWorkers * 50) {
    return {
      decision: "WATCH",
      reason: "queue_pressure_detected",
      actions: ["request_more_workers", "emit_warning"],
    };
  }

  return {
    decision: "BALANCED",
    reason: "workers_balanced",
    actions: ["observe"],
  };
}

/* ============================================================================
 * 3. BALANCER — PURE EVALUATION
 * ========================================================================== */

export async function evaluateDistributedWorkerBalance(): Promise<WorkerBalanceEvaluation> {
  const evaluatedAt = nowIso();

  const [clusterResult, queueResult] = await Promise.all([
    getClusterState(),
    listDistributedJobs(),
  ]);

  const cluster = clusterResult.ok ? clusterResult.data : null;
  const jobs = queueResult.ok && queueResult.data ? queueResult.data : [];

  const activeNodes =
    cluster?.nodes.filter((node) => node.status === "active") ?? [];

  const queuedJobs = jobs.filter((job) => job.status === "queued").length;
  const reservedJobs = jobs.filter((job) => job.status === "reserved").length;
  const deadJobs = jobs.filter((job) => job.status === "dead").length;

  const workerLoads = activeNodes.map((node) =>
    buildWorkerLoad({
      node,
      jobs,
    }),
  );

  const resolved = resolveDecision({
    cluster,
    activeWorkers: activeNodes.length,
    queuedJobs,
    reservedJobs,
    deadJobs,
    workerLoads,
  });

  return {
    ok: resolved.decision !== "BLOCK",
    evaluated_at: evaluatedAt,

    decision: resolved.decision,
    reason: resolved.reason,

    cluster,

    active_workers: activeNodes.length,
    queued_jobs: queuedJobs,
    reserved_jobs: reservedJobs,
    dead_jobs: deadJobs,

    worker_loads: workerLoads,

    actions: resolved.actions,

    warnings: uniqueWarnings(
      clusterResult.warnings,
      queueResult.warnings,
      workerLoads.flatMap((worker) => worker.warnings),
      resolved.decision !== "BALANCED"
        ? [`distributed_worker_balance_${resolved.reason}`]
        : [],
    ),

    error:
      resolved.decision === "BLOCK"
        ? `distributed_worker_balance_${resolved.reason}`
        : null,
  };
}

/* ============================================================================
 * 4. EXPLICIT MUTATION — OPTIONAL EVENT EMISSION
 * ========================================================================== */

export async function emitDistributedWorkerBalanceEvent(
  evaluation: WorkerBalanceEvaluation,
): Promise<WorkerBalanceMutationResult> {
  const emittedAt = nowIso();

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      evaluation.decision === "BLOCK"
        ? "critical"
        : evaluation.decision === "REBALANCE"
          ? "high"
          : evaluation.decision === "WATCH"
            ? "normal"
            : "low",
    payload: {
      balance_decision: evaluation.decision,
      balance_reason: evaluation.reason,
      active_workers: evaluation.active_workers,
      queued_jobs: evaluation.queued_jobs,
      reserved_jobs: evaluation.reserved_jobs,
      dead_jobs: evaluation.dead_jobs,
    },
    warnings:
      evaluation.decision === "BALANCED"
        ? []
        : [`distributed_worker_balance_${evaluation.reason}`],
  });

  return {
    ok: true,
    emitted_at: emittedAt,
    evaluation,
    warnings: ["distributed_worker_balance_event_emitted"],
    error: null,
  };
}

/* ============================================================================
 * 5. CONVENIENCE READERS — PURE OBSERVE
 * ========================================================================== */

export async function isDistributedWorkerRuntimeBalanced(): Promise<boolean> {
  const evaluation = await evaluateDistributedWorkerBalance();

  return evaluation.decision === "BALANCED";
}

export async function getDistributedWorkerLoadSnapshots(): Promise<
  WorkerLoadSnapshot[]
> {
  const evaluation = await evaluateDistributedWorkerBalance();

  return evaluation.worker_loads;
}
