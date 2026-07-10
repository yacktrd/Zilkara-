/* ============================================================================
 * FILE: lib/xyvala/runtime/registry/runtime-state-registry.ts
 * ============================================================================
 * TITLE
 * - Xyvala runtime state registry
 *
 * ROLE
 * - centralize operational runtime state snapshots
 * - normalize lifecycle, governance, supervision and continuity states
 * - prepare enterprise runtime state persistence and history
 *
 * PARENTS
 * - lib/xyvala/runtime/registry/runtime-governance-registry.ts
 * - lib/xyvala/runtime/supervision/runtime-supervision-core.ts
 * - lib/xyvala/runtime/orchestration/runtime-orchestration-core.ts
 * - lib/xyvala/runtime/high-availability/high-availability-coordinator.ts
 *
 * DIRECTIVES
 * - runtime state registry only
 * - no UI logic
 * - no route response building
 * - no business mutation
 * - no billing mutation
 * - no account mutation
 * - no API key mutation
 * - no quota decision mutation
 * - no RFS recomputation
 * - no MCI recomputation
 * - deterministic state normalization only
 *
 * INVARIANTS
 * - runtime state is explicit
 * - lifecycle state is explicit
 * - blocked state dominates protected/watch/stable states
 * - failover dominates normal operation
 * - registry does not execute runtime actions
 * ========================================================================== */

import {
  buildRuntimeGovernanceRegistry,
  type RuntimeGovernanceRegistrySnapshot,
} from "@/lib/xyvala/runtime/registry/runtime-governance-registry";

import {
  buildRuntimeSupervisionCore,
  type RuntimeSupervisionSnapshot,
} from "@/lib/xyvala/runtime/supervision/runtime-supervision-core";

import {
  buildRuntimeOrchestrationCore,
  type RuntimeOrchestrationSnapshot,
} from "@/lib/xyvala/runtime/orchestration/runtime-orchestration-core";

import {
  evaluateHighAvailability,
  type HighAvailabilityEvaluation,
} from "@/lib/xyvala/runtime/high-availability/high-availability-coordinator";

import {
  type RuntimeMutationScope,
} from "@/lib/xyvala/runtime/policies/production-runtime-policy-engine";

import { publishRuntimeEvent } from "@/lib/xyvala/runtime/events/event-bus";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RuntimeOperationalState =
  | "stable"
  | "watch"
  | "protected"
  | "degraded"
  | "failover"
  | "blocked"
  | "unknown";

export type RuntimeLifecycleState =
  | "initializing"
  | "running"
  | "recovering"
  | "degraded_mode"
  | "failover_mode"
  | "blocked_mode"
  | "unknown";

export type RuntimeStateRegistryReason =
  | "runtime_state_stable"
  | "runtime_state_watch"
  | "runtime_state_protected"
  | "runtime_state_degraded"
  | "runtime_state_failover"
  | "runtime_state_blocked"
  | "runtime_state_unknown";

export type RuntimeStateRegistrySnapshot = {
  ok: boolean;
  generated_at: string;

  scope: RuntimeMutationScope;

  operational_state: RuntimeOperationalState;
  lifecycle_state: RuntimeLifecycleState;
  reason: RuntimeStateRegistryReason;

  governance: RuntimeGovernanceRegistrySnapshot;
  supervision: RuntimeSupervisionSnapshot;
  orchestration: RuntimeOrchestrationSnapshot;
  high_availability: HighAvailabilityEvaluation;

  can_read: boolean;
  can_write: boolean;
  can_admin: boolean;
  can_queue: boolean;
  can_scheduler: boolean;
  can_background_jobs: boolean;

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
 * 3. STATE RESOLUTION
 * ========================================================================== */

function resolveRuntimeState(input: {
  governance: RuntimeGovernanceRegistrySnapshot;
  supervision: RuntimeSupervisionSnapshot;
  orchestration: RuntimeOrchestrationSnapshot;
  high_availability: HighAvailabilityEvaluation;
}): {
  operational_state: RuntimeOperationalState;
  lifecycle_state: RuntimeLifecycleState;
  reason: RuntimeStateRegistryReason;
} {
  if (
    input.governance.state === "blocked" ||
    input.supervision.decision === "BLOCK" ||
    input.orchestration.decision === "BLOCK"
  ) {
    return {
      operational_state: "blocked",
      lifecycle_state: "blocked_mode",
      reason: "runtime_state_blocked",
    };
  }

  if (
    input.orchestration.decision === "FAILOVER" ||
    input.high_availability.decision === "FAILOVER"
  ) {
    return {
      operational_state: "failover",
      lifecycle_state: "failover_mode",
      reason: "runtime_state_failover",
    };
  }

  if (
    input.governance.state === "protected" ||
    input.supervision.decision === "PROTECT" ||
    input.orchestration.decision === "PROTECT"
  ) {
    return {
      operational_state: "protected",
      lifecycle_state: "degraded_mode",
      reason: "runtime_state_protected",
    };
  }

  if (
    input.supervision.state === "degraded" ||
    input.high_availability.state === "degraded" ||
    input.orchestration.state === "recovering"
  ) {
    return {
      operational_state: "degraded",
      lifecycle_state:
        input.orchestration.state === "recovering"
          ? "recovering"
          : "degraded_mode",
      reason: "runtime_state_degraded",
    };
  }

  if (
    input.governance.state === "watch" ||
    input.supervision.decision === "WATCH" ||
    input.orchestration.decision === "WATCH"
  ) {
    return {
      operational_state: "watch",
      lifecycle_state: "running",
      reason: "runtime_state_watch",
    };
  }

  if (
    input.governance.state === "consistent" &&
    input.supervision.state === "stable" &&
    input.orchestration.state === "operational" &&
    input.high_availability.state === "available"
  ) {
    return {
      operational_state: "stable",
      lifecycle_state: "running",
      reason: "runtime_state_stable",
    };
  }

  return {
    operational_state: "unknown",
    lifecycle_state: "unknown",
    reason: "runtime_state_unknown",
  };
}

/* ============================================================================
 * 4. REGISTRY
 * ========================================================================== */

export async function buildRuntimeStateRegistry(input: {
  scope?: RuntimeMutationScope;
} = {}): Promise<RuntimeStateRegistrySnapshot> {
  const generatedAt = nowIso();
  const scope = input.scope ?? "read";

  const [governance, supervision, orchestration, highAvailability] =
    await Promise.all([
      buildRuntimeGovernanceRegistry({ scope }),
      buildRuntimeSupervisionCore({ scope }),
      buildRuntimeOrchestrationCore({ scope }),
      evaluateHighAvailability(),
    ]);

  const resolved = resolveRuntimeState({
    governance,
    supervision,
    orchestration,
    high_availability: highAvailability,
  });

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      resolved.operational_state === "blocked" ||
      resolved.operational_state === "failover"
        ? "critical"
        : resolved.operational_state === "protected" ||
            resolved.operational_state === "degraded" ||
            resolved.operational_state === "watch"
          ? "high"
          : "normal",
    payload: {
      state_registry_scope: scope,
      operational_state: resolved.operational_state,
      lifecycle_state: resolved.lifecycle_state,
      state_reason: resolved.reason,
      governance_state: governance.state,
      supervision_state: supervision.state,
      orchestration_state: orchestration.state,
      high_availability_state: highAvailability.state,
    },
    warnings:
      resolved.operational_state === "stable"
        ? []
        : [`runtime_state_registry_${resolved.reason}`],
  });

  const warnings = uniqueWarnings(
    governance.warnings,
    supervision.warnings,
    orchestration.warnings,
    highAvailability.warnings,
    resolved.operational_state !== "stable"
      ? [`runtime_state_registry_${resolved.reason}`]
      : [],
  );

  return {
    ok:
      resolved.operational_state !== "blocked" &&
      resolved.operational_state !== "failover",

    generated_at: generatedAt,

    scope,

    operational_state: resolved.operational_state,
    lifecycle_state: resolved.lifecycle_state,
    reason: resolved.reason,

    governance,
    supervision,
    orchestration,
    high_availability: highAvailability,

    can_read: governance.can_read,
    can_write: governance.can_write,
    can_admin: governance.can_admin,
    can_queue: governance.can_queue,
    can_scheduler: governance.can_scheduler,
    can_background_jobs: governance.can_background_jobs,

    warnings,
    error:
      resolved.operational_state === "blocked" ||
      resolved.operational_state === "failover"
        ? `runtime_state_registry_${resolved.reason}`
        : null,
  };
}

/* ============================================================================
 * 5. READERS
 * ========================================================================== */

export async function getRuntimeOperationalState(): Promise<RuntimeOperationalState> {
  const snapshot = await buildRuntimeStateRegistry();

  return snapshot.operational_state;
}

export async function getRuntimeLifecycleState(): Promise<RuntimeLifecycleState> {
  const snapshot = await buildRuntimeStateRegistry();

  return snapshot.lifecycle_state;
}

export async function isRuntimeStateStable(): Promise<boolean> {
  const snapshot = await buildRuntimeStateRegistry();

  return snapshot.ok && snapshot.operational_state === "stable";
}
