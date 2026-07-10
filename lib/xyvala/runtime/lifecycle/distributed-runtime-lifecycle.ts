/* ============================================================================
 * FILE: lib/xyvala/runtime/lifecycle/distributed-runtime-lifecycle.ts
 * ========================================================================== */

import {
  buildRuntimeStateRegistry,
  type RuntimeLifecycleState,
  type RuntimeOperationalState,
  type RuntimeStateRegistrySnapshot,
} from "@/lib/xyvala/runtime/registry/runtime-state-registry";

import {
  buildRuntimeOrchestrationCore,
  type RuntimeOrchestrationSnapshot,
} from "@/lib/xyvala/runtime/orchestration/runtime-orchestration-core";

import {
  buildOperationalRuntimeAuditCore,
  type OperationalRuntimeAuditSnapshot,
} from "@/lib/xyvala/runtime/audit/operational-runtime-audit-core";

import {
  publishRuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

import type {
  RuntimeMutationScope,
} from "@/lib/xyvala/runtime/policies/production-runtime-policy-engine";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type DistributedRuntimeLifecycleDecision =
  | "INITIALIZE"
  | "RUN"
  | "WATCH"
  | "DEGRADE"
  | "RECOVER"
  | "FAILOVER"
  | "BLOCK"
  | "SHUTDOWN";

export type DistributedRuntimeLifecycleReason =
  | "lifecycle_initializing"
  | "lifecycle_running"
  | "lifecycle_watch"
  | "lifecycle_degraded"
  | "lifecycle_recovering"
  | "lifecycle_failover"
  | "lifecycle_blocked"
  | "lifecycle_shutdown_requested"
  | "lifecycle_unknown";

export type DistributedRuntimeLifecycleAction =
  | "observe"
  | "emit_warning"
  | "start_runtime"
  | "continue_runtime"
  | "enter_degraded_mode"
  | "request_recovery"
  | "request_failover"
  | "block_runtime"
  | "shutdown_runtime";

export type DistributedRuntimeLifecycleSnapshot = {
  ok: boolean;
  generated_at: string;

  scope: RuntimeMutationScope;

  operational_state: RuntimeOperationalState;
  lifecycle_state: RuntimeLifecycleState;

  decision: DistributedRuntimeLifecycleDecision;
  reason: DistributedRuntimeLifecycleReason;
  actions: DistributedRuntimeLifecycleAction[];

  state_registry: RuntimeStateRegistrySnapshot;
  orchestration: RuntimeOrchestrationSnapshot;
  audit: OperationalRuntimeAuditSnapshot;

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

function resolveDistributedRuntimeLifecycle(input: {
  state_registry: RuntimeStateRegistrySnapshot;
  orchestration: RuntimeOrchestrationSnapshot;
  shutdown_requested?: boolean;
}): {
  decision: DistributedRuntimeLifecycleDecision;
  reason: DistributedRuntimeLifecycleReason;
  actions: DistributedRuntimeLifecycleAction[];
} {
  if (input.shutdown_requested) {
    return {
      decision: "SHUTDOWN",
      reason: "lifecycle_shutdown_requested",
      actions: ["shutdown_runtime"],
    };
  }

  if (
    input.state_registry.operational_state === "blocked" ||
    input.orchestration.decision === "BLOCK"
  ) {
    return {
      decision: "BLOCK",
      reason: "lifecycle_blocked",
      actions: ["block_runtime", "emit_warning"],
    };
  }

  if (
    input.state_registry.operational_state === "failover" ||
    input.orchestration.decision === "FAILOVER"
  ) {
    return {
      decision: "FAILOVER",
      reason: "lifecycle_failover",
      actions: ["request_failover", "block_runtime"],
    };
  }

  if (
    input.state_registry.lifecycle_state === "recovering" ||
    input.orchestration.decision === "RECOVER"
  ) {
    return {
      decision: "RECOVER",
      reason: "lifecycle_recovering",
      actions: ["request_recovery", "emit_warning"],
    };
  }

  if (
    input.state_registry.lifecycle_state === "degraded_mode" ||
    input.state_registry.operational_state === "degraded" ||
    input.state_registry.operational_state === "protected" ||
    input.orchestration.decision === "PROTECT"
  ) {
    return {
      decision: "DEGRADE",
      reason: "lifecycle_degraded",
      actions: ["enter_degraded_mode", "emit_warning"],
    };
  }

  if (
    input.state_registry.operational_state === "watch" ||
    input.orchestration.decision === "WATCH"
  ) {
    return {
      decision: "WATCH",
      reason: "lifecycle_watch",
      actions: ["observe", "emit_warning"],
    };
  }

  if (
    input.state_registry.lifecycle_state === "initializing"
  ) {
    return {
      decision: "INITIALIZE",
      reason: "lifecycle_initializing",
      actions: ["start_runtime"],
    };
  }

  if (
    input.state_registry.operational_state === "stable" &&
    input.state_registry.lifecycle_state === "running" &&
    input.orchestration.decision === "RUN"
  ) {
    return {
      decision: "RUN",
      reason: "lifecycle_running",
      actions: ["continue_runtime"],
    };
  }

  return {
    decision: "WATCH",
    reason: "lifecycle_unknown",
    actions: ["observe", "emit_warning"],
  };
}

/* ============================================================================
 * 4. LIFECYCLE COORDINATION
 * ========================================================================== */

export async function buildDistributedRuntimeLifecycle(input: {
  scope?: RuntimeMutationScope;
  shutdown_requested?: boolean;
} = {}): Promise<DistributedRuntimeLifecycleSnapshot> {
  const generatedAt = nowIso();
  const scope = input.scope ?? "read";

  const [stateRegistry, orchestration, audit] = await Promise.all([
    buildRuntimeStateRegistry({ scope }),
    buildRuntimeOrchestrationCore({ scope }),
    buildOperationalRuntimeAuditCore(),
  ]);

  const resolved = resolveDistributedRuntimeLifecycle({
    state_registry: stateRegistry,
    orchestration,
    shutdown_requested: input.shutdown_requested ?? false,
  });

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      resolved.decision === "BLOCK" ||
      resolved.decision === "FAILOVER" ||
      resolved.decision === "SHUTDOWN"
        ? "critical"
        : resolved.decision === "DEGRADE" ||
            resolved.decision === "RECOVER" ||
            resolved.decision === "WATCH"
          ? "high"
          : "normal",
    payload: {
      lifecycle_scope: scope,
      lifecycle_decision: resolved.decision,
      lifecycle_reason: resolved.reason,
      operational_state: stateRegistry.operational_state,
      lifecycle_state: stateRegistry.lifecycle_state,
      orchestration_decision: orchestration.decision,
      audit_kind: audit.kind,
    },
    warnings:
      resolved.decision === "RUN"
        ? []
        : [`distributed_runtime_lifecycle_${resolved.reason}`],
  });

  const warnings = uniqueWarnings(
    stateRegistry.warnings,
    orchestration.warnings,
    audit.warnings,
    resolved.decision !== "RUN"
      ? [`distributed_runtime_lifecycle_${resolved.reason}`]
      : [],
  );

  return {
    ok:
      resolved.decision !== "BLOCK" &&
      resolved.decision !== "FAILOVER" &&
      resolved.decision !== "SHUTDOWN",

    generated_at: generatedAt,

    scope,

    operational_state: stateRegistry.operational_state,
    lifecycle_state: stateRegistry.lifecycle_state,

    decision: resolved.decision,
    reason: resolved.reason,
    actions: resolved.actions,

    state_registry: stateRegistry,
    orchestration,
    audit,

    warnings,
    error:
      resolved.decision === "BLOCK" ||
      resolved.decision === "FAILOVER" ||
      resolved.decision === "SHUTDOWN"
        ? `distributed_runtime_lifecycle_${resolved.reason}`
        : null,
  };
}

/* ============================================================================
 * 5. READERS
 * ========================================================================== */

export async function getDistributedRuntimeLifecycleDecision(): Promise<DistributedRuntimeLifecycleDecision> {
  const snapshot = await buildDistributedRuntimeLifecycle();

  return snapshot.decision;
}

export async function isDistributedRuntimeLifecycleRunning(): Promise<boolean> {
  const snapshot = await buildDistributedRuntimeLifecycle();

  return snapshot.ok && snapshot.decision === "RUN";
}

export async function requestDistributedRuntimeShutdown(): Promise<DistributedRuntimeLifecycleSnapshot> {
  return buildDistributedRuntimeLifecycle({
    scope: "admin",
    shutdown_requested: true,
  });
}
