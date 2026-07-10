/* ============================================================================
 * FILE: lib/xyvala/runtime/commands/cluster-command-gateway.ts
 * ========================================================================== */

import {
  buildRuntimeOrchestrationCore,
  type RuntimeOrchestrationSnapshot,
} from "@/lib/xyvala/runtime/orchestration/runtime-orchestration-core";

import {
  evaluateProductionRuntimePolicy,
  type RuntimeMutationScope,
  type RuntimePolicyEvaluation,
} from "@/lib/xyvala/runtime/policies/production-runtime-policy-engine";

import {
  heartbeatClusterNode,
  registerClusterNode,
  unregisterClusterNode,
  type ClusterState,
} from "@/lib/xyvala/runtime/cluster/cluster-orchestrator";

import {
  recoverNode,
  type NodeRecoveryEvaluation,
} from "@/lib/xyvala/runtime/recovery/node-recovery-manager";

import {
  evaluateProductionFailover,
  type FailoverEvaluation,
} from "@/lib/xyvala/runtime/failover/production-failover-manager";

import {
  evaluateDistributedWorkerBalance,
  type WorkerBalanceEvaluation,
} from "@/lib/xyvala/runtime/balancer/distributed-worker-balancer";

import { publishRuntimeEvent } from "@/lib/xyvala/runtime/events/event-bus";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type ClusterCommandKind =
  | "register_node"
  | "heartbeat_node"
  | "unregister_node"
  | "recover_node"
  | "evaluate_failover"
  | "evaluate_worker_balance";

export type ClusterCommandStatus =
  | "accepted"
  | "blocked"
  | "failed";

export type ClusterCommandInput = {
  command: ClusterCommandKind;

  node_id?: string | null;
  capabilities?: string[];

  scope?: RuntimeMutationScope;
  request_id?: string | null;

  payload?: Record<string, string | number | boolean | null>;
};

export type ClusterCommandResult = {
  ok: boolean;
  status: ClusterCommandStatus;

  command: ClusterCommandKind;
  executed_at: string;

  orchestration: RuntimeOrchestrationSnapshot;
  policy: RuntimePolicyEvaluation;

  cluster_state: ClusterState | null;
  recovery: NodeRecoveryEvaluation | null;
  failover: FailoverEvaluation | null;
  balance: WorkerBalanceEvaluation | null;

  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. HELPERS
 * ========================================================================== */

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

function resolveScope(command: ClusterCommandKind): RuntimeMutationScope {
  if (
    command === "register_node" ||
    command === "heartbeat_node" ||
    command === "unregister_node" ||
    command === "recover_node"
  ) {
    return "admin";
  }

  return "read";
}

function blockedResult(input: {
  command: ClusterCommandKind;
  orchestration: RuntimeOrchestrationSnapshot;
  policy: RuntimePolicyEvaluation;
  warnings: string[];
  error: string;
}): ClusterCommandResult {
  return {
    ok: false,
    status: "blocked",

    command: input.command,
    executed_at: nowIso(),

    orchestration: input.orchestration,
    policy: input.policy,

    cluster_state: null,
    recovery: null,
    failover: null,
    balance: null,

    warnings: input.warnings,
    error: input.error,
  };
}

/* ============================================================================
 * 3. COMMAND EXECUTION
 * ========================================================================== */

export async function executeClusterCommand(
  input: ClusterCommandInput,
): Promise<ClusterCommandResult> {
  const executedAt = nowIso();
  const scope = input.scope ?? resolveScope(input.command);

  const [orchestration, policy] = await Promise.all([
    buildRuntimeOrchestrationCore({ scope }),
    evaluateProductionRuntimePolicy({ scope }),
  ]);

  if (!orchestration.ok || policy.decision === "BLOCK") {
    return blockedResult({
      command: input.command,
      orchestration,
      policy,
      warnings: uniqueWarnings(
        orchestration.warnings,
        policy.warnings,
        ["cluster_command_blocked_by_runtime_policy"],
      ),
      error: "cluster_command_blocked_by_runtime_policy",
    });
  }

  let clusterState: ClusterState | null = null;
  let recovery: NodeRecoveryEvaluation | null = null;
  let failover: FailoverEvaluation | null = null;
  let balance: WorkerBalanceEvaluation | null = null;

  try {
    if (input.command === "register_node") {
      const nodeId = safeString(input.node_id);

      if (!nodeId) {
        throw new Error("cluster_command_node_id_missing");
      }

      const result = await registerClusterNode({
        node_id: nodeId,
        capabilities: input.capabilities ?? ["worker"],
      });

      clusterState = result.data;
    }

    if (input.command === "heartbeat_node") {
      const nodeId = safeString(input.node_id);

      if (!nodeId) {
        throw new Error("cluster_command_node_id_missing");
      }

      const result = await heartbeatClusterNode({
        node_id: nodeId,
      });

      clusterState = result.data;
    }

    if (input.command === "unregister_node") {
      const nodeId = safeString(input.node_id);

      if (!nodeId) {
        throw new Error("cluster_command_node_id_missing");
      }

      const result = await unregisterClusterNode({
        node_id: nodeId,
      });

      clusterState = result.data;
    }

    if (input.command === "recover_node") {
      const nodeId = safeString(input.node_id);

      if (!nodeId) {
        throw new Error("cluster_command_node_id_missing");
      }

      recovery = await recoverNode({
        node_id: nodeId,
        capabilities: input.capabilities ?? ["worker"],
      });
    }

    if (input.command === "evaluate_failover") {
      failover = await evaluateProductionFailover();
    }

    if (input.command === "evaluate_worker_balance") {
      balance = await evaluateDistributedWorkerBalance();
    }

    await publishRuntimeEvent({
      kind: "runtime_job_requested",
      priority: "normal",
      request_id: input.request_id ?? null,
      payload: {
        cluster_command: input.command,
        scope,
        node_id: input.node_id ?? null,
        ...(input.payload ?? {}),
      },
      warnings: ["cluster_command_executed"],
    });

    return {
      ok: true,
      status: "accepted",

      command: input.command,
      executed_at: executedAt,

      orchestration,
      policy,

      cluster_state: clusterState,
      recovery,
      failover,
      balance,

      warnings: uniqueWarnings(
        orchestration.warnings,
        policy.warnings,
        recovery?.warnings,
        failover?.warnings,
        balance?.warnings,
      ),
      error: null,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "cluster_command_failed";

    return {
      ok: false,
      status: "failed",

      command: input.command,
      executed_at: executedAt,

      orchestration,
      policy,

      cluster_state: clusterState,
      recovery,
      failover,
      balance,

      warnings: uniqueWarnings(
        orchestration.warnings,
        policy.warnings,
        ["cluster_command_failed"],
      ),
      error: message,
    };
  }
}

/* ============================================================================
 * 4. CONVENIENCE COMMANDS
 * ========================================================================== */

export async function registerRuntimeNode(input: {
  node_id: string;
  capabilities?: string[];
}): Promise<ClusterCommandResult> {

return executeClusterCommand({
  command: "register_node",
  node_id: input.node_id,
  ...(input.capabilities ? { capabilities: input.capabilities } : {}),
});
}

export async function heartbeatRuntimeNode(input: {
  node_id: string;
}): Promise<ClusterCommandResult> {
  return executeClusterCommand({
    command: "heartbeat_node",
    node_id: input.node_id,
  });
}

export async function recoverRuntimeNode(input: {
  node_id: string;
  capabilities?: string[];
}): Promise<ClusterCommandResult> {
  return executeClusterCommand({
  command: "recover_node",
  node_id: input.node_id,
  ...(input.capabilities ? { capabilities: input.capabilities } : {}),
});
}
