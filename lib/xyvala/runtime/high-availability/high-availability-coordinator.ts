/* ============================================================================
 * FILE: lib/xyvala/runtime/high-availability/high-availability-coordinator.ts
 * ========================================================================== */

import {
  buildRuntimeControlPlane,
  type RuntimeControlPlaneSnapshot,
} from "@/lib/xyvala/runtime/control-plane/runtime-control-plane";

import {
  buildClusterTelemetryGateway,
  type ClusterTelemetrySnapshot,
} from "@/lib/xyvala/runtime/telemetry/cluster-telemetry-gateway";

import {
  evaluateProductionRecoveryReadiness,
  type FailoverEvaluation,
} from "@/lib/xyvala/runtime/failover/production-failover-manager";

import {
  publishRuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type HighAvailabilityState =
  | "available"
  | "degraded"
  | "at_risk"
  | "unavailable"
  | "unknown";

export type HighAvailabilityDecision =
  | "MAINTAIN"
  | "WATCH"
  | "DEGRADED_MODE"
  | "RECOVERY"
  | "FAILOVER";

export type HighAvailabilityReason =
  | "ha_available"
  | "ha_degraded"
  | "ha_minimum_nodes_missing"
  | "ha_leader_missing"
  | "ha_runtime_critical"
  | "ha_recovery_available"
  | "ha_unavailable"
  | "ha_unknown";

export type HighAvailabilityAction =
  | "observe"
  | "emit_warning"
  | "enter_degraded_mode"
  | "request_recovery"
  | "request_failover"
  | "block_non_critical_runtime";

export type HighAvailabilityPolicy = {
  minimum_active_nodes: number;
  require_leader: boolean;
  allow_degraded_mode: boolean;
};

export type HighAvailabilityEvaluation = {
  ok: boolean;
  evaluated_at: string;

  state: HighAvailabilityState;
  decision: HighAvailabilityDecision;
  reason: HighAvailabilityReason;
  actions: HighAvailabilityAction[];

  policy: HighAvailabilityPolicy;

  active_nodes: number;
  stale_nodes: number;
  offline_nodes: number;
  leader_id: string | null;

  control_plane: RuntimeControlPlaneSnapshot;
  telemetry: ClusterTelemetrySnapshot;
  recovery: FailoverEvaluation;

  warnings: string[];
  error: string | null;
};

export type HighAvailabilityMutationResult = {
  ok: boolean;
  emitted_at: string;
  evaluation: HighAvailabilityEvaluation;
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. POLICY
 * ========================================================================== */

const DEFAULT_HA_POLICY: HighAvailabilityPolicy = {
  minimum_active_nodes: 1,
  require_leader: true,
  allow_degraded_mode: true,
};

/* ============================================================================
 * 3. HELPERS
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

function resolveHighAvailability(input: {
  policy: HighAvailabilityPolicy;
  control_plane: RuntimeControlPlaneSnapshot;
  telemetry: ClusterTelemetrySnapshot;
  recovery: FailoverEvaluation;
}): {
  state: HighAvailabilityState;
  decision: HighAvailabilityDecision;
  reason: HighAvailabilityReason;
  actions: HighAvailabilityAction[];
} {
  const cluster = input.telemetry.cluster;

  if (!cluster) {
    return {
      state: "unavailable",
      decision: "FAILOVER",
      reason: "ha_unavailable",
      actions: ["request_failover", "block_non_critical_runtime"],
    };
  }

  if (
    input.control_plane.decision === "FAILOVER" ||
    input.telemetry.state === "critical"
  ) {
    return {
      state: "unavailable",
      decision: "FAILOVER",
      reason: "ha_runtime_critical",
      actions: ["request_failover", "block_non_critical_runtime"],
    };
  }

  if (input.policy.require_leader && !cluster.leader_id) {
    return {
      state: "at_risk",
      decision: "DEGRADED_MODE",
      reason: "ha_leader_missing",
      actions: ["enter_degraded_mode", "emit_warning"],
    };
  }

  if (cluster.active_nodes < input.policy.minimum_active_nodes) {
    return {
      state: "at_risk",
      decision: input.policy.allow_degraded_mode ? "DEGRADED_MODE" : "FAILOVER",
      reason: "ha_minimum_nodes_missing",
      actions: input.policy.allow_degraded_mode
        ? ["enter_degraded_mode", "emit_warning"]
        : ["request_failover", "block_non_critical_runtime"],
    };
  }

  if (input.recovery.decision === "RECOVERY") {
    return {
      state: "degraded",
      decision: "RECOVERY",
      reason: "ha_recovery_available",
      actions: ["request_recovery", "emit_warning"],
    };
  }

  if (
    input.control_plane.decision === "WATCH" ||
    input.control_plane.decision === "REBALANCE" ||
    input.control_plane.decision === "RECOVER" ||
    input.telemetry.state === "degraded" ||
    cluster.stale_nodes > 0 ||
    cluster.offline_nodes > 0
  ) {
    return {
      state: "degraded",
      decision: "WATCH",
      reason: "ha_degraded",
      actions: ["emit_warning"],
    };
  }

  if (
    input.control_plane.decision === "STABLE" &&
    input.telemetry.state === "healthy"
  ) {
    return {
      state: "available",
      decision: "MAINTAIN",
      reason: "ha_available",
      actions: ["observe"],
    };
  }

  return {
    state: "unknown",
    decision: "WATCH",
    reason: "ha_unknown",
    actions: ["emit_warning"],
  };
}

/* ============================================================================
 * 4. COORDINATOR — PURE EVALUATION
 * ========================================================================== */

export async function evaluateHighAvailability(input: {
  policy?: Partial<HighAvailabilityPolicy>;
} = {}): Promise<HighAvailabilityEvaluation> {
  const evaluatedAt = nowIso();

  const policy: HighAvailabilityPolicy = {
    ...DEFAULT_HA_POLICY,
    ...input.policy,
  };

  const [controlPlane, telemetry, recovery] = await Promise.all([
    buildRuntimeControlPlane(),
    buildClusterTelemetryGateway(),
    evaluateProductionRecoveryReadiness(),
  ]);

  const cluster = telemetry.cluster;

  const resolved = resolveHighAvailability({
    policy,
    control_plane: controlPlane,
    telemetry,
    recovery,
  });

  const warnings = uniqueWarnings(
    controlPlane.warnings,
    telemetry.warnings,
    recovery.warnings,
    resolved.decision !== "MAINTAIN"
      ? [`high_availability_${resolved.reason}`]
      : [],
  );

  return {
    ok:
      resolved.decision !== "FAILOVER" &&
      resolved.state !== "unavailable",

    evaluated_at: evaluatedAt,

    state: resolved.state,
    decision: resolved.decision,
    reason: resolved.reason,
    actions: resolved.actions,

    policy,

    active_nodes: cluster?.active_nodes ?? 0,
    stale_nodes: cluster?.stale_nodes ?? 0,
    offline_nodes: cluster?.offline_nodes ?? 0,
    leader_id: cluster?.leader_id ?? null,

    control_plane: controlPlane,
    telemetry,
    recovery,

    warnings,
    error:
      resolved.decision === "FAILOVER" ||
      resolved.state === "unavailable"
        ? `high_availability_${resolved.reason}`
        : null,
  };
}

/* ============================================================================
 * 5. EXPLICIT MUTATION — OPTIONAL EVENT EMISSION
 * ========================================================================== */

export async function emitHighAvailabilityEvent(
  evaluation: HighAvailabilityEvaluation,
): Promise<HighAvailabilityMutationResult> {
  const emittedAt = nowIso();

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      evaluation.decision === "FAILOVER"
        ? "critical"
        : evaluation.decision === "DEGRADED_MODE" ||
            evaluation.decision === "RECOVERY" ||
            evaluation.decision === "WATCH"
          ? "high"
          : "normal",
    payload: {
      ha_state: evaluation.state,
      ha_decision: evaluation.decision,
      ha_reason: evaluation.reason,
      active_nodes: evaluation.active_nodes,
      stale_nodes: evaluation.stale_nodes,
      offline_nodes: evaluation.offline_nodes,
      leader_present: Boolean(evaluation.leader_id),
    },
    warnings:
      evaluation.decision === "MAINTAIN"
        ? []
        : [`high_availability_${evaluation.reason}`],
  });

  return {
    ok: true,
    emitted_at: emittedAt,
    evaluation,
    warnings: ["high_availability_event_emitted"],
    error: null,
  };
}

/* ============================================================================
 * 6. READERS — PURE OBSERVE
 * ========================================================================== */

export async function getHighAvailabilityState(): Promise<HighAvailabilityState> {
  const evaluation = await evaluateHighAvailability();

  return evaluation.state;
}

export async function isHighAvailabilityReady(): Promise<boolean> {
  const evaluation = await evaluateHighAvailability();

  return evaluation.ok && evaluation.state === "available";
}
