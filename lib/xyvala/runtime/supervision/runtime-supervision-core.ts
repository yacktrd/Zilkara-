/* ============================================================================
 * FILE: lib/xyvala/runtime/supervision/runtime-supervision-core.ts
 * ========================================================================== */

import {
  buildRuntimeOrchestrationCore,
  type RuntimeOrchestrationSnapshot,
} from "@/lib/xyvala/runtime/orchestration/runtime-orchestration-core";

import {
  buildRuntimeHealthGateway,
  type RuntimeHealthGatewaySnapshot,
} from "@/lib/xyvala/runtime/gateway/runtime-health-gateway";

import {
  buildClusterTelemetryGateway,
  type ClusterTelemetrySnapshot,
} from "@/lib/xyvala/runtime/telemetry/cluster-telemetry-gateway";

import {
  evaluateProductionRuntimePolicy,
  type RuntimePolicyEvaluation,
  type RuntimeMutationScope,
} from "@/lib/xyvala/runtime/policies/production-runtime-policy-engine";

import { publishRuntimeEvent } from "@/lib/xyvala/runtime/events/event-bus";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RuntimeSupervisionState =
  | "stable"
  | "watch"
  | "degraded"
  | "protected"
  | "critical"
  | "unknown";

export type RuntimeSupervisionDecision =
  | "CONTINUE"
  | "WATCH"
  | "DEGRADE"
  | "PROTECT"
  | "ESCALATE"
  | "BLOCK";

export type RuntimeSupervisionReason =
  | "runtime_supervision_stable"
  | "runtime_supervision_watch"
  | "runtime_supervision_degraded"
  | "runtime_supervision_protected"
  | "runtime_supervision_critical"
  | "runtime_supervision_policy_blocked"
  | "runtime_supervision_unknown";

export type RuntimeSupervisionAction =
  | "observe"
  | "emit_warning"
  | "enter_degraded_supervision"
  | "protect_runtime"
  | "escalate_runtime"
  | "block_runtime";

export type RuntimeSupervisionSnapshot = {
  ok: boolean;
  generated_at: string;

  scope: RuntimeMutationScope;

  state: RuntimeSupervisionState;
  decision: RuntimeSupervisionDecision;
  reason: RuntimeSupervisionReason;
  actions: RuntimeSupervisionAction[];

  orchestration: RuntimeOrchestrationSnapshot;
  health: RuntimeHealthGatewaySnapshot;
  telemetry: ClusterTelemetrySnapshot;
  policy: RuntimePolicyEvaluation;

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

function resolveRuntimeSupervision(input: {
  orchestration: RuntimeOrchestrationSnapshot;
  health: RuntimeHealthGatewaySnapshot;
  telemetry: ClusterTelemetrySnapshot;
  policy: RuntimePolicyEvaluation;
}): {
  state: RuntimeSupervisionState;
  decision: RuntimeSupervisionDecision;
  reason: RuntimeSupervisionReason;
  actions: RuntimeSupervisionAction[];
} {
  if (
    input.policy.decision === "BLOCK" ||
    input.orchestration.decision === "BLOCK"
  ) {
    return {
      state: "critical",
      decision: "BLOCK",
      reason: "runtime_supervision_policy_blocked",
      actions: ["block_runtime", "escalate_runtime"],
    };
  }

  if (
    input.health.status === "critical" ||
    input.telemetry.state === "critical" ||
    input.orchestration.decision === "FAILOVER"
  ) {
    return {
      state: "critical",
      decision: "ESCALATE",
      reason: "runtime_supervision_critical",
      actions: ["escalate_runtime", "emit_warning"],
    };
  }

  if (
    input.policy.decision === "PROTECT" ||
    input.orchestration.decision === "PROTECT"
  ) {
    return {
      state: "protected",
      decision: "PROTECT",
      reason: "runtime_supervision_protected",
      actions: ["protect_runtime", "emit_warning"],
    };
  }

  if (
    input.health.status === "degraded" ||
    input.telemetry.state === "degraded" ||
    input.orchestration.state === "recovering"
  ) {
    return {
      state: "degraded",
      decision: "DEGRADE",
      reason: "runtime_supervision_degraded",
      actions: ["enter_degraded_supervision", "emit_warning"],
    };
  }

  if (
    input.policy.decision === "WATCH" ||
    input.orchestration.decision === "WATCH"
  ) {
    return {
      state: "watch",
      decision: "WATCH",
      reason: "runtime_supervision_watch",
      actions: ["observe", "emit_warning"],
    };
  }

  if (
    input.policy.decision === "ALLOW" &&
    input.orchestration.decision === "RUN" &&
    input.health.status === "healthy" &&
    input.telemetry.state === "healthy"
  ) {
    return {
      state: "stable",
      decision: "CONTINUE",
      reason: "runtime_supervision_stable",
      actions: ["observe"],
    };
  }

  return {
    state: "unknown",
    decision: "WATCH",
    reason: "runtime_supervision_unknown",
    actions: ["observe", "emit_warning"],
  };
}

/* ============================================================================
 * 4. SUPERVISION
 * ========================================================================== */

export async function buildRuntimeSupervisionCore(input: {
  scope?: RuntimeMutationScope;
} = {}): Promise<RuntimeSupervisionSnapshot> {
  const generatedAt = nowIso();
  const scope = input.scope ?? "read";

  const [orchestration, health, telemetry, policy] = await Promise.all([
    buildRuntimeOrchestrationCore({ scope }),
    buildRuntimeHealthGateway(),
    buildClusterTelemetryGateway(),
    evaluateProductionRuntimePolicy({ scope }),
  ]);

  const resolved = resolveRuntimeSupervision({
    orchestration,
    health,
    telemetry,
    policy,
  });

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      resolved.decision === "BLOCK" || resolved.decision === "ESCALATE"
        ? "critical"
        : resolved.decision === "PROTECT" ||
            resolved.decision === "DEGRADE" ||
            resolved.decision === "WATCH"
          ? "high"
          : "normal",
    payload: {
      supervision_scope: scope,
      supervision_state: resolved.state,
      supervision_decision: resolved.decision,
      supervision_reason: resolved.reason,
      orchestration_decision: orchestration.decision,
      health_status: health.status,
      telemetry_state: telemetry.state,
      policy_decision: policy.decision,
    },
    warnings:
      resolved.decision === "CONTINUE"
        ? []
        : [`runtime_supervision_${resolved.reason}`],
  });

  const warnings = uniqueWarnings(
    orchestration.warnings,
    health.warnings,
    telemetry.warnings,
    policy.warnings,
    resolved.decision !== "CONTINUE"
      ? [`runtime_supervision_${resolved.reason}`]
      : [],
  );

  return {
    ok:
      resolved.decision !== "BLOCK" &&
      resolved.decision !== "ESCALATE",

    generated_at: generatedAt,

    scope,

    state: resolved.state,
    decision: resolved.decision,
    reason: resolved.reason,
    actions: resolved.actions,

    orchestration,
    health,
    telemetry,
    policy,

    warnings,
    error:
      resolved.decision === "BLOCK" || resolved.decision === "ESCALATE"
        ? `runtime_supervision_${resolved.reason}`
        : null,
  };
}

/* ============================================================================
 * 5. READERS
 * ========================================================================== */

export async function getRuntimeSupervisionState(): Promise<RuntimeSupervisionState> {
  const snapshot = await buildRuntimeSupervisionCore();

  return snapshot.state;
}

export async function isRuntimeSupervisionStable(): Promise<boolean> {
  const snapshot = await buildRuntimeSupervisionCore();

  return snapshot.ok && snapshot.state === "stable";
}
