/* ============================================================================
 * FILE: lib/xyvala/runtime/failover/production-failover-manager.ts
 * ========================================================================== */

import type {
  ClusterNode,
  ClusterState,
} from "@/lib/xyvala/runtime/cluster/cluster-orchestrator";

import {
  getClusterState,
  unregisterClusterNode,
} from "@/lib/xyvala/runtime/cluster/cluster-orchestrator";

import {
  buildRuntimeHealthGateway,
  type RuntimeGatewayStatus,
} from "@/lib/xyvala/runtime/gateway/runtime-health-gateway";

import {
  publishRuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type FailoverDecision =
  | "STABLE"
  | "WATCH"
  | "FAILOVER"
  | "RECOVERY";

export type FailoverReason =
  | "runtime_stable"
  | "runtime_degraded"
  | "runtime_critical"
  | "leader_missing"
  | "active_nodes_missing"
  | "stale_nodes_detected"
  | "offline_nodes_detected"
  | "dead_queue_jobs_detected"
  | "recovery_possible"
  | "cluster_unavailable";

export type FailoverAction =
  | "observe"
  | "emit_warning"
  | "isolate_offline_nodes"
  | "request_leader_recovery"
  | "request_queue_recovery"
  | "request_runtime_recovery";

export type FailoverEvaluation = {
  ok: boolean;
  evaluated_at: string;

  decision: FailoverDecision;
  reason: FailoverReason;

  runtime_status: RuntimeGatewayStatus;
  cluster: ClusterState | null;

  actions: FailoverAction[];

  isolatable_nodes: string[];
  isolated_nodes: string[];

  warnings: string[];
  error: string | null;
};

export type FailoverMutationResult = {
  ok: boolean;
  mutated_at: string;
  evaluation: FailoverEvaluation;
  isolated_nodes: string[];
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

function inactiveNodes(cluster: ClusterState | null): ClusterNode[] {
  if (!cluster) return [];

  return cluster.nodes.filter(
    (node) => node.status === "offline" || node.status === "stale",
  );
}

function resolveFailover(input: {
  runtime_status: RuntimeGatewayStatus;
  cluster: ClusterState | null;
  dead_queue_jobs: number;
}): {
  decision: FailoverDecision;
  reason: FailoverReason;
  actions: FailoverAction[];
} {
  if (!input.cluster) {
    return {
      decision: "FAILOVER",
      reason: "cluster_unavailable",
      actions: ["request_runtime_recovery"],
    };
  }

  if (input.runtime_status === "critical") {
    return {
      decision: "FAILOVER",
      reason: "runtime_critical",
      actions: ["request_runtime_recovery"],
    };
  }

  if (!input.cluster.leader_id) {
    return {
      decision: "FAILOVER",
      reason: "leader_missing",
      actions: ["request_leader_recovery"],
    };
  }

  if (input.cluster.active_nodes === 0) {
    return {
      decision: "FAILOVER",
      reason: "active_nodes_missing",
      actions: ["request_runtime_recovery"],
    };
  }

  if (input.dead_queue_jobs > 0) {
    return {
      decision: "FAILOVER",
      reason: "dead_queue_jobs_detected",
      actions: ["request_queue_recovery"],
    };
  }

  if (input.cluster.offline_nodes > 0) {
    return {
      decision: "WATCH",
      reason: "offline_nodes_detected",
      actions: ["isolate_offline_nodes", "emit_warning"],
    };
  }

  if (input.cluster.stale_nodes > 0) {
    return {
      decision: "WATCH",
      reason: "stale_nodes_detected",
      actions: ["emit_warning"],
    };
  }

  if (input.runtime_status === "degraded") {
    return {
      decision: "WATCH",
      reason: "runtime_degraded",
      actions: ["emit_warning"],
    };
  }

  return {
    decision: "STABLE",
    reason: "runtime_stable",
    actions: ["observe"],
  };
}

/* ============================================================================
 * 3. FAILOVER EVALUATION — PURE OBSERVE / COMPUTE
 * ========================================================================== */

export async function evaluateProductionFailover(): Promise<FailoverEvaluation> {
  const evaluatedAt = nowIso();

  const [gateway, clusterResult] = await Promise.all([
    buildRuntimeHealthGateway(),
    getClusterState(),
  ]);

  const cluster = clusterResult.ok ? clusterResult.data : null;
  const deadQueueJobs = gateway.queue.dead;

  const resolved = resolveFailover({
    runtime_status: gateway.status,
    cluster,
    dead_queue_jobs: deadQueueJobs,
  });

  const isolatableNodes = resolved.actions.includes("isolate_offline_nodes")
    ? inactiveNodes(cluster)
        .filter((node) => node.status === "offline")
        .map((node) => node.id)
    : [];

  return {
    ok: resolved.decision !== "FAILOVER",
    evaluated_at: evaluatedAt,

    decision: resolved.decision,
    reason: resolved.reason,

    runtime_status: gateway.status,
    cluster,

    actions: resolved.actions,

    isolatable_nodes: isolatableNodes,
    isolated_nodes: [],

    warnings: uniqueWarnings(
      gateway.warnings,
      clusterResult.warnings,
      resolved.decision !== "STABLE"
        ? [`production_failover_${resolved.reason}`]
        : [],
    ),
    error:
      resolved.decision === "FAILOVER"
        ? `production_failover_${resolved.reason}`
        : null,
  };
}

/* ============================================================================
 * 4. RECOVERY READINESS — PURE OBSERVE / COMPUTE
 * ========================================================================== */

export async function evaluateProductionRecoveryReadiness(): Promise<FailoverEvaluation> {
  const evaluation = await evaluateProductionFailover();

  if (evaluation.decision === "STABLE") {
    return evaluation;
  }

  const recoveryPossible =
    evaluation.cluster !== null &&
    evaluation.cluster.active_nodes > 0 &&
    evaluation.runtime_status !== "critical";

  if (!recoveryPossible) {
    return evaluation;
  }

  return {
    ...evaluation,
    ok: true,
    decision: "RECOVERY",
    reason: "recovery_possible",
    actions: ["request_runtime_recovery"],
    warnings: uniqueWarnings(evaluation.warnings, ["production_recovery_possible"]),
    error: null,
  };
}

/* ============================================================================
 * 5. EXPLICIT MUTATION — NODE ISOLATION
 * ========================================================================== */

export async function isolateProductionFailoverNodes(
  evaluation: FailoverEvaluation,
): Promise<FailoverMutationResult> {
  const mutatedAt = nowIso();
  const isolatedNodes: string[] = [];

  if (!evaluation.actions.includes("isolate_offline_nodes")) {
    return {
      ok: true,
      mutated_at: mutatedAt,
      evaluation,
      isolated_nodes: [],
      warnings: ["production_failover_isolation_not_required"],
      error: null,
    };
  }

  for (const nodeId of evaluation.isolatable_nodes) {
    const result = await unregisterClusterNode({
      node_id: nodeId,
    });

    if (result.ok) {
      isolatedNodes.push(nodeId);
    }
  }

  return {
    ok: isolatedNodes.length === evaluation.isolatable_nodes.length,
    mutated_at: mutatedAt,
    evaluation: {
      ...evaluation,
      isolated_nodes: isolatedNodes,
    },
    isolated_nodes: isolatedNodes,
    warnings: uniqueWarnings(
      evaluation.warnings,
      isolatedNodes.length > 0 ? ["production_failover_nodes_isolated"] : [],
      isolatedNodes.length !== evaluation.isolatable_nodes.length
        ? ["production_failover_node_isolation_partial"]
        : [],
    ),
    error:
      isolatedNodes.length === evaluation.isolatable_nodes.length
        ? null
        : "production_failover_node_isolation_partial",
  };
}

/* ============================================================================
 * 6. EXPLICIT MUTATION — EVENT EMISSION
 * ========================================================================== */

export async function emitProductionFailoverEvent(
  evaluation: FailoverEvaluation,
): Promise<FailoverMutationResult> {
  const mutatedAt = nowIso();

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      evaluation.decision === "FAILOVER"
        ? "critical"
        : evaluation.decision === "WATCH" ||
            evaluation.decision === "RECOVERY"
          ? "high"
          : "normal",
    payload: {
      failover_decision: evaluation.decision,
      failover_reason: evaluation.reason,
      runtime_status: evaluation.runtime_status,
      isolatable_nodes: evaluation.isolatable_nodes.length,
      isolated_nodes: evaluation.isolated_nodes.length,
    },
    warnings:
      evaluation.decision === "STABLE"
        ? []
        : [`production_failover_${evaluation.reason}`],
  });

  return {
    ok: true,
    mutated_at: mutatedAt,
    evaluation,
    isolated_nodes: evaluation.isolated_nodes,
    warnings: ["production_failover_event_emitted"],
    error: null,
  };
}
