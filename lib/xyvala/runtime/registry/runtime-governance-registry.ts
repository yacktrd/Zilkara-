/* ============================================================================
 * FILE: lib/xyvala/runtime/registry/runtime-governance-registry.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala runtime governance registry
 *
 * ROLE
 * - aggregate runtime governance read models
 * - expose a deterministic runtime governance snapshot
 * - centralize policy, governor, high availability, supervision and orchestration states
 * - preserve strict OBSERVE / READ behavior without runtime mutation
 *
 * DIRECTIVES
 * - runtime registry only
 * - observe layer only
 * - no event publishing
 * - no queue write
 * - no persistence
 * - no cache mutation
 * - no failover trigger
 * - no recovery trigger
 * - no scheduler trigger
 * - no runtime mutation
 * - no analytical recomputation
 * - no API response building
 * - deterministic aggregation only
 *
 * INVARIANTS
 * - registry reads governance components
 * - registry never mutates runtime state
 * - registry never publishes runtime events
 * - registry never starts jobs
 * - registry never corrects downstream state
 * - blocked state must remain explicit
 * ========================================================================== */

import {
  buildRuntimeSupervisionCore,
  type RuntimeSupervisionSnapshot,
} from "@/lib/xyvala/runtime/supervision/runtime-supervision-core";

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
  evaluateDistributedRuntimeGovernor,
  type DistributedRuntimeGovernorSnapshot,
} from "@/lib/xyvala/runtime/governor/distributed-runtime-governor";

import {
  evaluateHighAvailability,
  type HighAvailabilityEvaluation,
} from "@/lib/xyvala/runtime/high-availability/high-availability-coordinator";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RuntimeGovernanceRegistryState =
  | "consistent"
  | "watch"
  | "protected"
  | "blocked"
  | "unknown";

export type RuntimeGovernanceRegistryReason =
  | "runtime_governance_consistent"
  | "runtime_governance_watch"
  | "runtime_governance_protected"
  | "runtime_governance_blocked"
  | "runtime_governance_unknown";

export type RuntimeGovernanceRegistrySnapshot = {
  ok: boolean;
  generated_at: string;

  scope: RuntimeMutationScope;

  state: RuntimeGovernanceRegistryState;
  reason: RuntimeGovernanceRegistryReason;

  policy: RuntimePolicyEvaluation;
  governor: DistributedRuntimeGovernorSnapshot;
  high_availability: HighAvailabilityEvaluation;
  supervision: RuntimeSupervisionSnapshot;
  orchestration: RuntimeOrchestrationSnapshot;

  can_read: boolean;
  can_write: boolean;
  can_admin: boolean;
  can_queue: boolean;
  can_scheduler: boolean;
  can_background_jobs: boolean;

  mutation_performed: false;
  event_published: false;

  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. SAFE HELPERS
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

function resolveRegistryState(input: {
  policy: RuntimePolicyEvaluation;
  governor: DistributedRuntimeGovernorSnapshot;
  high_availability: HighAvailabilityEvaluation;
  supervision: RuntimeSupervisionSnapshot;
  orchestration: RuntimeOrchestrationSnapshot;
}): {
  state: RuntimeGovernanceRegistryState;
  reason: RuntimeGovernanceRegistryReason;
} {
  if (
    input.policy.decision === "BLOCK" ||
    input.governor.decision === "BLOCK_RUNTIME" ||
    input.supervision.decision === "BLOCK" ||
    input.orchestration.decision === "BLOCK"
  ) {
    return {
      state: "blocked",
      reason: "runtime_governance_blocked",
    };
  }

  if (
    input.policy.decision === "PROTECT" ||
    input.governor.decision === "PROTECT_RUNTIME" ||
    input.high_availability.decision === "DEGRADED_MODE" ||
    input.supervision.decision === "PROTECT" ||
    input.orchestration.decision === "PROTECT"
  ) {
    return {
      state: "protected",
      reason: "runtime_governance_protected",
    };
  }

  if (
    input.policy.decision === "WATCH" ||
    input.governor.decision === "WATCH_RUNTIME" ||
    input.high_availability.decision === "WATCH" ||
    input.supervision.decision === "WATCH" ||
    input.orchestration.decision === "WATCH"
  ) {
    return {
      state: "watch",
      reason: "runtime_governance_watch",
    };
  }

  if (
    input.policy.decision === "ALLOW" &&
    input.governor.decision === "ALLOW_RUNTIME" &&
    input.high_availability.decision === "MAINTAIN" &&
    input.supervision.decision === "CONTINUE" &&
    input.orchestration.decision === "RUN"
  ) {
    return {
      state: "consistent",
      reason: "runtime_governance_consistent",
    };
  }

  return {
    state: "unknown",
    reason: "runtime_governance_unknown",
  };
}

/* ============================================================================
 * 4. REGISTRY BUILDER
 * ========================================================================== */

export async function buildRuntimeGovernanceRegistry(
  input: {
    scope?: RuntimeMutationScope;
  } = {},
): Promise<RuntimeGovernanceRegistrySnapshot> {
  const generatedAt = nowIso();
  const scope = input.scope ?? "read";

  const [policy, governor, highAvailability, supervision, orchestration] =
    await Promise.all([
      evaluateProductionRuntimePolicy({ scope }),
      evaluateDistributedRuntimeGovernor(),
      evaluateHighAvailability(),
      buildRuntimeSupervisionCore({ scope }),
      buildRuntimeOrchestrationCore({ scope }),
    ]);

  const resolved = resolveRegistryState({
    policy,
    governor,
    high_availability: highAvailability,
    supervision,
    orchestration,
  });

  const warnings = uniqueWarnings(
    policy.warnings,
    governor.warnings,
    highAvailability.warnings,
    supervision.warnings,
    orchestration.warnings,
    resolved.state !== "consistent"
      ? [`runtime_governance_registry_${resolved.reason}`]
      : [],
  );

  return {
    ok: resolved.state !== "blocked",

    generated_at: generatedAt,

    scope,

    state: resolved.state,
    reason: resolved.reason,

    policy,
    governor,
    high_availability: highAvailability,
    supervision,
    orchestration,

    can_read: policy.can_read,
    can_write: policy.can_write,
    can_admin: policy.can_use_admin_controls,
    can_queue: policy.can_use_queue,
    can_scheduler: policy.can_run_scheduler,
    can_background_jobs: policy.can_run_background_jobs,

    mutation_performed: false,
    event_published: false,

    warnings,
    error:
      resolved.state === "blocked"
        ? `runtime_governance_registry_${resolved.reason}`
        : null,
  };
}

/* ============================================================================
 * 5. READERS
 * ========================================================================== */

export async function getRuntimeGovernanceRegistryState(): Promise<RuntimeGovernanceRegistryState> {
  const snapshot = await buildRuntimeGovernanceRegistry();

  return snapshot.state;
}

export async function isRuntimeGovernanceConsistent(): Promise<boolean> {
  const snapshot = await buildRuntimeGovernanceRegistry();

  return snapshot.ok && snapshot.state === "consistent";
}
