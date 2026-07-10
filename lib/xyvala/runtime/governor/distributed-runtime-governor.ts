/* ============================================================================
 * FILE: lib/xyvala/runtime/governor/distributed-runtime-governor.ts
 * ========================================================================== */

import {
  buildRuntimeControlPlane,
  type RuntimeControlPlaneSnapshot,
} from "@/lib/xyvala/runtime/control-plane/runtime-control-plane";

import {
  evaluateHighAvailability,
  type HighAvailabilityEvaluation,
} from "@/lib/xyvala/runtime/high-availability/high-availability-coordinator";

import {
  buildClusterTelemetryGateway,
  type ClusterTelemetrySnapshot,
} from "@/lib/xyvala/runtime/telemetry/cluster-telemetry-gateway";

import {
  publishRuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type DistributedRuntimeGovernanceState =
  | "operational"
  | "degraded"
  | "protected"
  | "failover"
  | "blocked"
  | "unknown";

export type DistributedRuntimeGovernanceDecision =
  | "ALLOW_RUNTIME"
  | "WATCH_RUNTIME"
  | "PROTECT_RUNTIME"
  | "FAILOVER_RUNTIME"
  | "BLOCK_RUNTIME";

export type DistributedRuntimeGovernanceReason =
  | "runtime_operational"
  | "runtime_degraded"
  | "runtime_protection_required"
  | "runtime_failover_required"
  | "runtime_blocked"
  | "runtime_governance_unknown";

export type DistributedRuntimeGovernanceAction =
  | "observe"
  | "emit_warning"
  | "protect_non_critical_runtime"
  | "request_recovery"
  | "request_failover"
  | "block_runtime_mutations"
  | "request_manual_review";

export type DistributedRuntimeGovernorSnapshot = {
  ok: boolean;
  generated_at: string;

  state: DistributedRuntimeGovernanceState;
  decision: DistributedRuntimeGovernanceDecision;
  reason: DistributedRuntimeGovernanceReason;
  actions: DistributedRuntimeGovernanceAction[];

  control_plane: RuntimeControlPlaneSnapshot;
  high_availability: HighAvailabilityEvaluation;
  telemetry: ClusterTelemetrySnapshot;

  warnings: string[];
  error: string | null;
};

export type DistributedRuntimeGovernorMutationResult = {
  ok: boolean;
  emitted_at: string;
  snapshot: DistributedRuntimeGovernorSnapshot;
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

function resolveDistributedRuntimeGovernance(input: {
  control_plane: RuntimeControlPlaneSnapshot;
  high_availability: HighAvailabilityEvaluation;
  telemetry: ClusterTelemetrySnapshot;
}): {
  state: DistributedRuntimeGovernanceState;
  decision: DistributedRuntimeGovernanceDecision;
  reason: DistributedRuntimeGovernanceReason;
  actions: DistributedRuntimeGovernanceAction[];
} {
  if (
    input.control_plane.decision === "BLOCK" ||
    input.high_availability.state === "unavailable"
  ) {
    return {
      state: "blocked",
      decision: "BLOCK_RUNTIME",
      reason: "runtime_blocked",
      actions: ["block_runtime_mutations", "request_manual_review"],
    };
  }

  if (
    input.control_plane.decision === "FAILOVER" ||
    input.high_availability.decision === "FAILOVER" ||
    input.telemetry.state === "critical"
  ) {
    return {
      state: "failover",
      decision: "FAILOVER_RUNTIME",
      reason: "runtime_failover_required",
      actions: [
        "request_failover",
        "block_runtime_mutations",
        "request_manual_review",
      ],
    };
  }

  if (
    input.high_availability.decision === "DEGRADED_MODE" ||
    input.control_plane.decision === "RECOVER" ||
    input.high_availability.decision === "RECOVERY"
  ) {
    return {
      state: "protected",
      decision: "PROTECT_RUNTIME",
      reason: "runtime_protection_required",
      actions: [
        "protect_non_critical_runtime",
        "request_recovery",
        "emit_warning",
      ],
    };
  }

  if (
    input.control_plane.decision === "WATCH" ||
    input.control_plane.decision === "REBALANCE" ||
    input.high_availability.state === "degraded" ||
    input.telemetry.state === "degraded"
  ) {
    return {
      state: "degraded",
      decision: "WATCH_RUNTIME",
      reason: "runtime_degraded",
      actions: ["emit_warning"],
    };
  }

  if (
    input.control_plane.decision === "STABLE" &&
    input.high_availability.state === "available" &&
    input.telemetry.state === "healthy"
  ) {
    return {
      state: "operational",
      decision: "ALLOW_RUNTIME",
      reason: "runtime_operational",
      actions: ["observe"],
    };
  }

  return {
    state: "unknown",
    decision: "WATCH_RUNTIME",
    reason: "runtime_governance_unknown",
    actions: ["emit_warning", "request_manual_review"],
  };
}

/* ============================================================================
 * 3. GOVERNOR — PURE EVALUATION
 * ========================================================================== */

export async function evaluateDistributedRuntimeGovernor(): Promise<DistributedRuntimeGovernorSnapshot> {
  const generatedAt = nowIso();

  const [controlPlane, highAvailability, telemetry] = await Promise.all([
    buildRuntimeControlPlane(),
    evaluateHighAvailability(),
    buildClusterTelemetryGateway(),
  ]);

  const resolved = resolveDistributedRuntimeGovernance({
    control_plane: controlPlane,
    high_availability: highAvailability,
    telemetry,
  });

  const warnings = uniqueWarnings(
    controlPlane.warnings,
    highAvailability.warnings,
    telemetry.warnings,
    resolved.decision !== "ALLOW_RUNTIME"
      ? [`distributed_runtime_governor_${resolved.reason}`]
      : [],
  );

  return {
    ok:
      resolved.decision !== "BLOCK_RUNTIME" &&
      resolved.decision !== "FAILOVER_RUNTIME",

    generated_at: generatedAt,

    state: resolved.state,
    decision: resolved.decision,
    reason: resolved.reason,
    actions: resolved.actions,

    control_plane: controlPlane,
    high_availability: highAvailability,
    telemetry,

    warnings,
    error:
      resolved.decision === "BLOCK_RUNTIME" ||
      resolved.decision === "FAILOVER_RUNTIME"
        ? `distributed_runtime_governor_${resolved.reason}`
        : null,
  };
}

/* ============================================================================
 * 4. EXPLICIT MUTATION — OPTIONAL EVENT EMISSION
 * ========================================================================== */

export async function emitDistributedRuntimeGovernorEvent(
  snapshot: DistributedRuntimeGovernorSnapshot,
): Promise<DistributedRuntimeGovernorMutationResult> {
  const emittedAt = nowIso();

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      snapshot.decision === "BLOCK_RUNTIME" ||
      snapshot.decision === "FAILOVER_RUNTIME"
        ? "critical"
        : snapshot.decision === "PROTECT_RUNTIME" ||
            snapshot.decision === "WATCH_RUNTIME"
          ? "high"
          : "normal",
    payload: {
      governor_state: snapshot.state,
      governor_decision: snapshot.decision,
      governor_reason: snapshot.reason,
      control_plane_decision: snapshot.control_plane.decision,
      high_availability_state: snapshot.high_availability.state,
      telemetry_state: snapshot.telemetry.state,
    },
    warnings:
      snapshot.decision === "ALLOW_RUNTIME"
        ? []
        : [`distributed_runtime_governor_${snapshot.reason}`],
  });

  return {
    ok: true,
    emitted_at: emittedAt,
    snapshot,
    warnings: ["distributed_runtime_governor_event_emitted"],
    error: null,
  };
}

/* ============================================================================
 * 5. READERS — PURE OBSERVE
 * ========================================================================== */

export async function getDistributedRuntimeGovernanceState(): Promise<DistributedRuntimeGovernanceState> {
  const snapshot = await evaluateDistributedRuntimeGovernor();

  return snapshot.state;
}

export async function isDistributedRuntimeOperational(): Promise<boolean> {
  const snapshot = await evaluateDistributedRuntimeGovernor();

  return snapshot.ok && snapshot.state === "operational";
}
