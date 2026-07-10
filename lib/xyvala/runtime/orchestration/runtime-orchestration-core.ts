/* ============================================================================
 * FILE: lib/xyvala/runtime/orchestration/runtime-orchestration-core.ts
 * ========================================================================== */

import {
  evaluateProductionRuntimePolicy,
  type RuntimePolicyEvaluation,
  type RuntimeMutationScope,
} from "@/lib/xyvala/runtime/policies/production-runtime-policy-engine";

import {
  evaluateDistributedRuntimeGovernor,
  type DistributedRuntimeGovernorSnapshot,
} from "@/lib/xyvala/runtime/governor/distributed-runtime-governor";

import {
  buildRuntimeControlPlane,
  type RuntimeControlPlaneSnapshot,
} from "@/lib/xyvala/runtime/control-plane/runtime-control-plane";

import {
  evaluateHighAvailability,
  type HighAvailabilityEvaluation,
} from "@/lib/xyvala/runtime/high-availability/high-availability-coordinator";

import { publishRuntimeEvent } from "@/lib/xyvala/runtime/events/event-bus";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RuntimeOrchestrationState =
  | "operational"
  | "watch"
  | "protected"
  | "recovering"
  | "failover"
  | "blocked"
  | "unknown";

export type RuntimeOrchestrationDecision =
  | "RUN"
  | "WATCH"
  | "PROTECT"
  | "RECOVER"
  | "FAILOVER"
  | "BLOCK";

export type RuntimeOrchestrationReason =
  | "runtime_orchestration_operational"
  | "runtime_orchestration_watch"
  | "runtime_orchestration_protected"
  | "runtime_orchestration_recovery"
  | "runtime_orchestration_failover"
  | "runtime_orchestration_blocked"
  | "runtime_orchestration_unknown";

export type RuntimeOrchestrationAction =
  | "execute_runtime"
  | "observe"
  | "emit_warning"
  | "protect_runtime"
  | "request_recovery"
  | "request_failover"
  | "block_runtime";

export type RuntimeOrchestrationSnapshot = {
  ok: boolean;
  generated_at: string;

  scope: RuntimeMutationScope;

  state: RuntimeOrchestrationState;
  decision: RuntimeOrchestrationDecision;
  reason: RuntimeOrchestrationReason;
  actions: RuntimeOrchestrationAction[];

  policy: RuntimePolicyEvaluation;
  governor: DistributedRuntimeGovernorSnapshot;
  control_plane: RuntimeControlPlaneSnapshot;
  high_availability: HighAvailabilityEvaluation;

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

/* ============================================================================
 * 3. RESOLUTION
 * ========================================================================== */

function resolveRuntimeOrchestration(input: {
  policy: RuntimePolicyEvaluation;
  governor: DistributedRuntimeGovernorSnapshot;
  control_plane: RuntimeControlPlaneSnapshot;
  high_availability: HighAvailabilityEvaluation;
}): {
  state: RuntimeOrchestrationState;
  decision: RuntimeOrchestrationDecision;
  reason: RuntimeOrchestrationReason;
  actions: RuntimeOrchestrationAction[];
} {
  if (
    input.policy.decision === "BLOCK" ||
    input.governor.decision === "BLOCK_RUNTIME" ||
    input.control_plane.decision === "BLOCK"
  ) {
    return {
      state: "blocked",
      decision: "BLOCK",
      reason: "runtime_orchestration_blocked",
      actions: ["block_runtime"],
    };
  }

  if (
    input.governor.decision === "FAILOVER_RUNTIME" ||
    input.control_plane.decision === "FAILOVER" ||
    input.high_availability.decision === "FAILOVER"
  ) {
    return {
      state: "failover",
      decision: "FAILOVER",
      reason: "runtime_orchestration_failover",
      actions: ["request_failover", "block_runtime"],
    };
  }

  if (
    input.control_plane.decision === "RECOVER" ||
    input.high_availability.decision === "RECOVERY"
  ) {
    return {
      state: "recovering",
      decision: "RECOVER",
      reason: "runtime_orchestration_recovery",
      actions: ["request_recovery", "emit_warning"],
    };
  }

  if (
    input.policy.decision === "PROTECT" ||
    input.governor.decision === "PROTECT_RUNTIME" ||
    input.high_availability.decision === "DEGRADED_MODE"
  ) {
    return {
      state: "protected",
      decision: "PROTECT",
      reason: "runtime_orchestration_protected",
      actions: ["protect_runtime", "emit_warning"],
    };
  }

  if (
    input.policy.decision === "WATCH" ||
    input.governor.decision === "WATCH_RUNTIME" ||
    input.control_plane.decision === "WATCH" ||
    input.control_plane.decision === "REBALANCE" ||
    input.high_availability.decision === "WATCH"
  ) {
    return {
      state: "watch",
      decision: "WATCH",
      reason: "runtime_orchestration_watch",
      actions: ["observe", "emit_warning"],
    };
  }

  if (
    input.policy.decision === "ALLOW" &&
    input.governor.decision === "ALLOW_RUNTIME" &&
    input.control_plane.decision === "STABLE" &&
    input.high_availability.decision === "MAINTAIN"
  ) {
    return {
      state: "operational",
      decision: "RUN",
      reason: "runtime_orchestration_operational",
      actions: ["execute_runtime"],
    };
  }

  return {
    state: "unknown",
    decision: "WATCH",
    reason: "runtime_orchestration_unknown",
    actions: ["observe", "emit_warning"],
  };
}

/* ============================================================================
 * 4. CORE
 * ========================================================================== */

export async function buildRuntimeOrchestrationCore(input: {
  scope: RuntimeMutationScope;
}): Promise<RuntimeOrchestrationSnapshot> {
  const generatedAt = nowIso();

  const [policy, governor, controlPlane, highAvailability] = await Promise.all([
    evaluateProductionRuntimePolicy({ scope: input.scope }),
    evaluateDistributedRuntimeGovernor(),
    buildRuntimeControlPlane(),
    evaluateHighAvailability(),
  ]);

  const resolved = resolveRuntimeOrchestration({
    policy,
    governor,
    control_plane: controlPlane,
    high_availability: highAvailability,
  });

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      resolved.decision === "BLOCK" || resolved.decision === "FAILOVER"
        ? "critical"
        : resolved.decision === "PROTECT" ||
            resolved.decision === "RECOVER" ||
            resolved.decision === "WATCH"
          ? "high"
          : "normal",
    payload: {
      orchestration_scope: input.scope,
      orchestration_state: resolved.state,
      orchestration_decision: resolved.decision,
      orchestration_reason: resolved.reason,
      policy_decision: policy.decision,
      governor_decision: governor.decision,
      control_plane_decision: controlPlane.decision,
      high_availability_decision: highAvailability.decision,
    },
    warnings:
      resolved.decision === "RUN"
        ? []
        : [`runtime_orchestration_${resolved.reason}`],
  });

  const warnings = uniqueWarnings(
    policy.warnings,
    governor.warnings,
    controlPlane.warnings,
    highAvailability.warnings,
    resolved.decision !== "RUN"
      ? [`runtime_orchestration_${resolved.reason}`]
      : [],
  );

  return {
    ok:
      resolved.decision !== "BLOCK" &&
      resolved.decision !== "FAILOVER",

    generated_at: generatedAt,

    scope: input.scope,

    state: resolved.state,
    decision: resolved.decision,
    reason: resolved.reason,
    actions: resolved.actions,

    policy,
    governor,
    control_plane: controlPlane,
    high_availability: highAvailability,

    warnings,
    error:
      resolved.decision === "BLOCK" || resolved.decision === "FAILOVER"
        ? `runtime_orchestration_${resolved.reason}`
        : null,
  };
}

/* ============================================================================
 * 5. READERS
 * ========================================================================== */

export async function getRuntimeOrchestrationState(
  scope: RuntimeMutationScope,
): Promise<RuntimeOrchestrationState> {
  const snapshot = await buildRuntimeOrchestrationCore({ scope });

  return snapshot.state;
}

export async function canOrchestrateRuntimeScope(
  scope: RuntimeMutationScope,
): Promise<boolean> {
  const snapshot = await buildRuntimeOrchestrationCore({ scope });

  return snapshot.ok && snapshot.decision === "RUN";
}
