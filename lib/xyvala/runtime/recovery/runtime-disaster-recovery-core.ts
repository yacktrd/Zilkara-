/* ============================================================================
 * FILE: lib/xyvala/runtime/recovery/runtime-disaster-recovery-core.ts
 * ========================================================================== */

import {
  buildRuntimeRuntimeConsistencyCore,
  type RuntimeConsistencySnapshot,
} from "@/lib/xyvala/runtime/consistency/runtime-runtime-consistency-core";

import {
  buildRuntimeGovernanceRecoveryHistory,
  type RuntimeRecoveryHistorySnapshot,
} from "@/lib/xyvala/runtime/history/runtime-governance-recovery-history";

import {
  buildRuntimeGovernanceAnomalyRegistry,
  type RuntimeGovernanceAnomalySnapshot,
} from "@/lib/xyvala/runtime/anomalies/runtime-governance-anomaly-registry";

import {
  buildEnterpriseRuntimeResilienceCore,
  type EnterpriseRuntimeResilienceSnapshot,
} from "@/lib/xyvala/runtime/resilience/enterprise-runtime-resilience-core";

import {
  evaluateProductionRecoveryReadiness,
  type FailoverEvaluation,
} from "@/lib/xyvala/runtime/failover/production-failover-manager";

import {
  publishRuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

import type {
  RuntimeMutationScope,
} from "@/lib/xyvala/runtime/policies/production-runtime-policy-engine";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RuntimeDisasterRecoveryState =
  | "stable"
  | "recoverable"
  | "degraded_recovery"
  | "disaster"
  | "blocked"
  | "unknown";

export type RuntimeDisasterRecoveryDecision =
  | "MAINTAIN"
  | "WATCH"
  | "RECOVER"
  | "DEGRADED_RECOVERY"
  | "DISASTER_RECOVERY"
  | "BLOCK";

export type RuntimeDisasterRecoveryReason =
  | "runtime_disaster_recovery_stable"
  | "runtime_disaster_recovery_watch"
  | "runtime_disaster_recovery_available"
  | "runtime_disaster_recovery_degraded"
  | "runtime_disaster_recovery_required"
  | "runtime_disaster_recovery_blocked"
  | "runtime_disaster_recovery_unknown";

export type RuntimeDisasterRecoveryAction =
  | "observe"
  | "emit_warning"
  | "request_recovery"
  | "enter_degraded_recovery"
  | "request_disaster_recovery"
  | "block_runtime"
  | "request_manual_review";

export type RuntimeDisasterRecoverySnapshot = {
  ok: boolean;
  evaluated_at: string;

  scope: RuntimeMutationScope;

  state: RuntimeDisasterRecoveryState;
  decision: RuntimeDisasterRecoveryDecision;
  reason: RuntimeDisasterRecoveryReason;
  actions: RuntimeDisasterRecoveryAction[];

  consistency: RuntimeConsistencySnapshot;
  recovery_history: RuntimeRecoveryHistorySnapshot;
  anomalies: RuntimeGovernanceAnomalySnapshot;
  resilience: EnterpriseRuntimeResilienceSnapshot;
  recovery_readiness: FailoverEvaluation;

  warnings: string[];
  error: string | null;
};

export type RuntimeDisasterRecoveryMutationResult = {
  ok: boolean;
  emitted_at: string;
  snapshot: RuntimeDisasterRecoverySnapshot;
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

function resolveDisasterRecovery(input: {
  consistency: RuntimeConsistencySnapshot;
  recovery_history: RuntimeRecoveryHistorySnapshot;
  anomalies: RuntimeGovernanceAnomalySnapshot;
  resilience: EnterpriseRuntimeResilienceSnapshot;
  recovery_readiness: FailoverEvaluation;
}): {
  state: RuntimeDisasterRecoveryState;
  decision: RuntimeDisasterRecoveryDecision;
  reason: RuntimeDisasterRecoveryReason;
  actions: RuntimeDisasterRecoveryAction[];
} {
  if (
    input.consistency.state === "broken" ||
    input.recovery_readiness.decision === "FAILOVER"
  ) {
    return {
      state: "disaster",
      decision: "DISASTER_RECOVERY",
      reason: "runtime_disaster_recovery_required",
      actions: [
        "request_disaster_recovery",
        "block_runtime",
        "request_manual_review",
      ],
    };
  }

  if (
    input.consistency.state === "divergent" ||
    input.anomalies.state === "critical" ||
    input.recovery_history.state === "critical" ||
    input.resilience.state === "critical"
  ) {
    return {
      state: "blocked",
      decision: "BLOCK",
      reason: "runtime_disaster_recovery_blocked",
      actions: ["block_runtime", "request_manual_review"],
    };
  }

  if (
    input.recovery_readiness.decision === "RECOVERY" ||
    input.resilience.decision === "RECOVER"
  ) {
    return {
      state: "recoverable",
      decision: "RECOVER",
      reason: "runtime_disaster_recovery_available",
      actions: ["request_recovery", "emit_warning"],
    };
  }

  if (
    input.consistency.state === "watch" ||
    input.anomalies.state === "anomalous" ||
    input.resilience.state === "fragile" ||
    input.recovery_history.state === "partial"
  ) {
    return {
      state: "degraded_recovery",
      decision: "DEGRADED_RECOVERY",
      reason: "runtime_disaster_recovery_degraded",
      actions: ["enter_degraded_recovery", "emit_warning"],
    };
  }

  if (
    input.consistency.state === "consistent" &&
    input.anomalies.state === "clear" &&
    input.resilience.state === "resilient"
  ) {
    return {
      state: "stable",
      decision: "MAINTAIN",
      reason: "runtime_disaster_recovery_stable",
      actions: ["observe"],
    };
  }

  return {
    state: "unknown",
    decision: "WATCH",
    reason: "runtime_disaster_recovery_unknown",
    actions: ["observe", "emit_warning"],
  };
}

/* ============================================================================
 * 4. DISASTER RECOVERY CORE — PURE COMPUTE / VALIDATION
 * ========================================================================== */

export async function buildRuntimeDisasterRecoveryCore(input: {
  scope?: RuntimeMutationScope;
  limit?: number | null;
} = {}): Promise<RuntimeDisasterRecoverySnapshot> {
  const evaluatedAt = nowIso();
  const scope = input.scope ?? "read";

  const [consistency, recoveryHistory, anomalies, resilience, recoveryReadiness] =
    await Promise.all([
      buildRuntimeRuntimeConsistencyCore({
        scope,
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      }),
      buildRuntimeGovernanceRecoveryHistory({
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      }),
      buildRuntimeGovernanceAnomalyRegistry({
        scope,
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      }),
      buildEnterpriseRuntimeResilienceCore({ scope }),
      evaluateProductionRecoveryReadiness(),
    ]);

  const resolved = resolveDisasterRecovery({
    consistency,
    recovery_history: recoveryHistory,
    anomalies,
    resilience,
    recovery_readiness: recoveryReadiness,
  });

  const warnings = uniqueWarnings(
    consistency.warnings,
    recoveryHistory.warnings,
    anomalies.warnings,
    resilience.warnings,
    recoveryReadiness.warnings,
    resolved.decision !== "MAINTAIN"
      ? [`runtime_disaster_recovery_${resolved.reason}`]
      : [],
  );

  return {
    ok:
      resolved.decision !== "DISASTER_RECOVERY" &&
      resolved.decision !== "BLOCK",

    evaluated_at: evaluatedAt,

    scope,

    state: resolved.state,
    decision: resolved.decision,
    reason: resolved.reason,
    actions: resolved.actions,

    consistency,
    recovery_history: recoveryHistory,
    anomalies,
    resilience,
    recovery_readiness: recoveryReadiness,

    warnings,
    error:
      resolved.decision === "DISASTER_RECOVERY" ||
      resolved.decision === "BLOCK"
        ? `runtime_disaster_recovery_${resolved.reason}`
        : null,
  };
}

/* ============================================================================
 * 5. EXPLICIT MUTATION — OPTIONAL EVENT EMISSION
 * ========================================================================== */

export async function emitRuntimeDisasterRecoveryEvent(
  snapshot: RuntimeDisasterRecoverySnapshot,
): Promise<RuntimeDisasterRecoveryMutationResult> {
  const emittedAt = nowIso();

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      snapshot.decision === "DISASTER_RECOVERY" ||
      snapshot.decision === "BLOCK"
        ? "critical"
        : snapshot.decision === "DEGRADED_RECOVERY" ||
            snapshot.decision === "RECOVER"
          ? "high"
          : snapshot.decision === "WATCH"
            ? "normal"
            : "low",
    payload: {
      disaster_recovery_scope: snapshot.scope,
      disaster_recovery_state: snapshot.state,
      disaster_recovery_decision: snapshot.decision,
      disaster_recovery_reason: snapshot.reason,
      consistency_state: snapshot.consistency.state,
      anomaly_state: snapshot.anomalies.state,
      resilience_state: snapshot.resilience.state,
      recovery_history_state: snapshot.recovery_history.state,
      recovery_readiness_decision: snapshot.recovery_readiness.decision,
    },
    warnings:
      snapshot.decision === "MAINTAIN"
        ? []
        : [`runtime_disaster_recovery_${snapshot.reason}`],
  });

  return {
    ok: true,
    emitted_at: emittedAt,
    snapshot,
    warnings: ["runtime_disaster_recovery_event_emitted"],
    error: null,
  };
}

/* ============================================================================
 * 6. READERS — PURE OBSERVE
 * ========================================================================== */

export async function getRuntimeDisasterRecoveryState(): Promise<RuntimeDisasterRecoveryState> {
  const snapshot = await buildRuntimeDisasterRecoveryCore();

  return snapshot.state;
}

export async function isRuntimeDisasterRecoveryStable(): Promise<boolean> {
  const snapshot = await buildRuntimeDisasterRecoveryCore();

  return snapshot.ok && snapshot.state === "stable";
}

export async function isRuntimeDisasterRecoveryRequired(): Promise<boolean> {
  const snapshot = await buildRuntimeDisasterRecoveryCore();

  return (
    snapshot.decision === "DISASTER_RECOVERY" ||
    snapshot.decision === "BLOCK"
  );
}
