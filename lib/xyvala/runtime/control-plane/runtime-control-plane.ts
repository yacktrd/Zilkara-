/* ============================================================================
 * FILE: lib/xyvala/runtime/control-plane/runtime-control-plane.ts
 * ========================================================================== */

import {
  buildClusterTelemetryGateway,
  type ClusterTelemetrySnapshot,
  type ClusterTelemetryState,
} from "@/lib/xyvala/runtime/telemetry/cluster-telemetry-gateway";

import {
  evaluateProductionFailover,
  evaluateProductionRecoveryReadiness,
  type FailoverEvaluation,
} from "@/lib/xyvala/runtime/failover/production-failover-manager";

import {
  evaluateDistributedWorkerBalance,
  type WorkerBalanceEvaluation,
} from "@/lib/xyvala/runtime/balancer/distributed-worker-balancer";

import {
  listNodeRecoveryRecords,
  type NodeRecoveryRecord,
} from "@/lib/xyvala/runtime/recovery/node-recovery-manager";

import {
  publishRuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RuntimeControlPlaneDecision =
  | "STABLE"
  | "WATCH"
  | "REBALANCE"
  | "RECOVER"
  | "FAILOVER"
  | "BLOCK";

export type RuntimeControlPlaneReason =
  | "runtime_stable"
  | "telemetry_degraded"
  | "telemetry_critical"
  | "failover_required"
  | "recovery_available"
  | "worker_rebalance_required"
  | "worker_balance_blocked"
  | "recovery_blocked"
  | "runtime_unknown";

export type RuntimeControlPlaneAction =
  | "observe"
  | "emit_warning"
  | "rebalance_workers"
  | "recover_nodes"
  | "trigger_failover"
  | "block_runtime_mutations"
  | "request_manual_review";

export type RuntimeControlPlaneSnapshot = {
  ok: boolean;
  generated_at: string;

  decision: RuntimeControlPlaneDecision;
  reason: RuntimeControlPlaneReason;
  actions: RuntimeControlPlaneAction[];

  telemetry_state: ClusterTelemetryState;

  telemetry: ClusterTelemetrySnapshot;
  failover: FailoverEvaluation;
  recovery: FailoverEvaluation;
  balance: WorkerBalanceEvaluation;
  recovery_records: NodeRecoveryRecord[];

  warnings: string[];
  error: string | null;
};

export type RuntimeControlPlaneMutationResult = {
  ok: boolean;
  emitted_at: string;
  snapshot: RuntimeControlPlaneSnapshot;
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

function hasBlockedRecovery(records: NodeRecoveryRecord[]): boolean {
  return records.some((record) => record.blocked_until !== null);
}

function resolveControlPlane(input: {
  telemetry: ClusterTelemetrySnapshot;
  failover: FailoverEvaluation;
  recovery: FailoverEvaluation;
  balance: WorkerBalanceEvaluation;
  recovery_records: NodeRecoveryRecord[];
}): {
  decision: RuntimeControlPlaneDecision;
  reason: RuntimeControlPlaneReason;
  actions: RuntimeControlPlaneAction[];
} {
  if (
    input.telemetry.state === "critical" ||
    input.failover.decision === "FAILOVER"
  ) {
    return {
      decision: "FAILOVER",
      reason: "failover_required",
      actions: [
        "trigger_failover",
        "block_runtime_mutations",
        "request_manual_review",
      ],
    };
  }

  if (input.balance.decision === "BLOCK") {
    return {
      decision: "BLOCK",
      reason: "worker_balance_blocked",
      actions: ["block_runtime_mutations", "request_manual_review"],
    };
  }

  if (hasBlockedRecovery(input.recovery_records)) {
    return {
      decision: "BLOCK",
      reason: "recovery_blocked",
      actions: ["block_runtime_mutations", "request_manual_review"],
    };
  }

  if (input.recovery.decision === "RECOVERY") {
    return {
      decision: "RECOVER",
      reason: "recovery_available",
      actions: ["recover_nodes", "emit_warning"],
    };
  }

  if (
    input.balance.decision === "REBALANCE" ||
    input.balance.decision === "WATCH"
  ) {
    return {
      decision: "REBALANCE",
      reason: "worker_rebalance_required",
      actions: ["rebalance_workers", "emit_warning"],
    };
  }

  if (input.telemetry.state === "degraded") {
    return {
      decision: "WATCH",
      reason: "telemetry_degraded",
      actions: ["emit_warning"],
    };
  }

  if (
    input.telemetry.state === "healthy" &&
    input.failover.decision === "STABLE" &&
    input.balance.decision === "BALANCED"
  ) {
    return {
      decision: "STABLE",
      reason: "runtime_stable",
      actions: ["observe"],
    };
  }

  return {
    decision: "WATCH",
    reason: "runtime_unknown",
    actions: ["emit_warning", "request_manual_review"],
  };
}

/* ============================================================================
 * 3. CONTROL PLANE — PURE OBSERVE / COMPUTE
 * ========================================================================== */

export async function buildRuntimeControlPlane(): Promise<RuntimeControlPlaneSnapshot> {
  const generatedAt = nowIso();

  const [telemetry, failover, recovery, balance] = await Promise.all([
    buildClusterTelemetryGateway(),
    evaluateProductionFailover(),
    evaluateProductionRecoveryReadiness(),
    evaluateDistributedWorkerBalance(),
  ]);

  const recoveryRecords = listNodeRecoveryRecords();

  const resolved = resolveControlPlane({
    telemetry,
    failover,
    recovery,
    balance,
    recovery_records: recoveryRecords,
  });

  const warnings = uniqueWarnings(
    telemetry.warnings,
    failover.warnings,
    recovery.warnings,
    balance.warnings,
    recoveryRecords.flatMap((record) => record.warnings),
    resolved.decision !== "STABLE"
      ? [`runtime_control_plane_${resolved.reason}`]
      : [],
  );

  return {
    ok:
      resolved.decision !== "FAILOVER" &&
      resolved.decision !== "BLOCK",

    generated_at: generatedAt,

    decision: resolved.decision,
    reason: resolved.reason,
    actions: resolved.actions,

    telemetry_state: telemetry.state,

    telemetry,
    failover,
    recovery,
    balance,
    recovery_records: recoveryRecords,

    warnings,
    error:
      resolved.decision === "FAILOVER" || resolved.decision === "BLOCK"
        ? `runtime_control_plane_${resolved.reason}`
        : null,
  };
}

/* ============================================================================
 * 4. EXPLICIT MUTATION — OPTIONAL EVENT EMISSION
 * ========================================================================== */

export async function emitRuntimeControlPlaneEvent(
  snapshot: RuntimeControlPlaneSnapshot,
): Promise<RuntimeControlPlaneMutationResult> {
  const emittedAt = nowIso();

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      snapshot.decision === "FAILOVER" || snapshot.decision === "BLOCK"
        ? "critical"
        : snapshot.decision === "REBALANCE" ||
            snapshot.decision === "RECOVER" ||
            snapshot.decision === "WATCH"
          ? "high"
          : "normal",
    payload: {
      control_plane_decision: snapshot.decision,
      control_plane_reason: snapshot.reason,
      telemetry_state: snapshot.telemetry.state,
      failover_decision: snapshot.failover.decision,
      recovery_decision: snapshot.recovery.decision,
      balance_decision: snapshot.balance.decision,
      recovery_records: snapshot.recovery_records.length,
    },
    warnings:
      snapshot.decision === "STABLE"
        ? []
        : [`runtime_control_plane_${snapshot.reason}`],
  });

  return {
    ok: true,
    emitted_at: emittedAt,
    snapshot,
    warnings: ["runtime_control_plane_event_emitted"],
    error: null,
  };
}

/* ============================================================================
 * 5. CONVENIENCE READERS — PURE OBSERVE
 * ========================================================================== */

export async function getRuntimeControlPlaneDecision(): Promise<RuntimeControlPlaneDecision> {
  const snapshot = await buildRuntimeControlPlane();

  return snapshot.decision;
}

export async function isRuntimeControlPlaneOperational(): Promise<boolean> {
  const snapshot = await buildRuntimeControlPlane();

  return snapshot.ok;
}
