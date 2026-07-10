 /* ============================================================================
 * FILE: lib/xyvala/runtime/policies/production-runtime-policy-engine.ts
 * ========================================================================== */

import {
  evaluateDistributedRuntimeGovernor,
  type DistributedRuntimeGovernorSnapshot,
} from "@/lib/xyvala/runtime/governor/distributed-runtime-governor";

import {
  evaluateHighAvailability,
  type HighAvailabilityEvaluation,
} from "@/lib/xyvala/runtime/high-availability/high-availability-coordinator";

import {
  buildRuntimeControlPlane,
  type RuntimeControlPlaneSnapshot,
} from "@/lib/xyvala/runtime/control-plane/runtime-control-plane";

import {
  publishRuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RuntimePolicyDecision =
  | "ALLOW"
  | "WATCH"
  | "PROTECT"
  | "BLOCK";

export type RuntimePolicyReason =
  | "runtime_policy_allowed"
  | "runtime_policy_watch"
  | "runtime_policy_protected_mode"
  | "runtime_policy_failover_block"
  | "runtime_policy_governor_block"
  | "runtime_policy_ha_unavailable"
  | "runtime_policy_control_plane_block";

export type RuntimeMutationScope =
  | "read"
  | "write"
  | "background_jobs"
  | "scheduler"
  | "queue"
  | "billing"
  | "api_keys"
  | "organizations"
  | "admin";

export type RuntimePolicyEvaluation = {
  ok: boolean;
  evaluated_at: string;

  scope: RuntimeMutationScope;

  decision: RuntimePolicyDecision;
  reason: RuntimePolicyReason;

  governor: DistributedRuntimeGovernorSnapshot;
  high_availability: HighAvailabilityEvaluation;
  control_plane: RuntimeControlPlaneSnapshot;

  can_read: boolean;
  can_write: boolean;
  can_run_background_jobs: boolean;
  can_run_scheduler: boolean;
  can_use_queue: boolean;
  can_mutate_billing: boolean;
  can_mutate_api_keys: boolean;
  can_mutate_organizations: boolean;
  can_use_admin_controls: boolean;

  warnings: string[];
  error: string | null;
};

export type RuntimePolicyMutationResult = {
  ok: boolean;
  emitted_at: string;
  evaluation: RuntimePolicyEvaluation;
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

function resolvePolicy(input: {
  scope: RuntimeMutationScope;
  governor: DistributedRuntimeGovernorSnapshot;
  high_availability: HighAvailabilityEvaluation;
  control_plane: RuntimeControlPlaneSnapshot;
}): {
  decision: RuntimePolicyDecision;
  reason: RuntimePolicyReason;
} {
  if (input.governor.decision === "BLOCK_RUNTIME") {
    return {
      decision: "BLOCK",
      reason: "runtime_policy_governor_block",
    };
  }

  if (input.governor.decision === "FAILOVER_RUNTIME") {
    return {
      decision: "BLOCK",
      reason: "runtime_policy_failover_block",
    };
  }

  if (input.high_availability.state === "unavailable") {
    return {
      decision: "BLOCK",
      reason: "runtime_policy_ha_unavailable",
    };
  }

  if (
    input.control_plane.decision === "BLOCK" ||
    input.control_plane.decision === "FAILOVER"
  ) {
    return {
      decision: "BLOCK",
      reason: "runtime_policy_control_plane_block",
    };
  }

  if (
    input.governor.decision === "PROTECT_RUNTIME" ||
    input.high_availability.decision === "DEGRADED_MODE" ||
    input.control_plane.decision === "RECOVER"
  ) {
    if (input.scope === "read" || input.scope === "admin") {
      return {
        decision: "WATCH",
        reason: "runtime_policy_watch",
      };
    }

    return {
      decision: "PROTECT",
      reason: "runtime_policy_protected_mode",
    };
  }

  if (
    input.governor.decision === "WATCH_RUNTIME" ||
    input.high_availability.decision === "WATCH" ||
    input.control_plane.decision === "WATCH" ||
    input.control_plane.decision === "REBALANCE"
  ) {
    return {
      decision: "WATCH",
      reason: "runtime_policy_watch",
    };
  }

  return {
    decision: "ALLOW",
    reason: "runtime_policy_allowed",
  };
}

function capabilityFlags(decision: RuntimePolicyDecision): {
  can_read: boolean;
  can_write: boolean;
  can_run_background_jobs: boolean;
  can_run_scheduler: boolean;
  can_use_queue: boolean;
  can_mutate_billing: boolean;
  can_mutate_api_keys: boolean;
  can_mutate_organizations: boolean;
  can_use_admin_controls: boolean;
} {
  if (decision === "BLOCK") {
    return {
      can_read: false,
      can_write: false,
      can_run_background_jobs: false,
      can_run_scheduler: false,
      can_use_queue: false,
      can_mutate_billing: false,
      can_mutate_api_keys: false,
      can_mutate_organizations: false,
      can_use_admin_controls: false,
    };
  }

  if (decision === "PROTECT") {
    return {
      can_read: true,
      can_write: false,
      can_run_background_jobs: true,
      can_run_scheduler: false,
      can_use_queue: true,
      can_mutate_billing: false,
      can_mutate_api_keys: false,
      can_mutate_organizations: false,
      can_use_admin_controls: true,
    };
  }

  if (decision === "WATCH") {
    return {
      can_read: true,
      can_write: true,
      can_run_background_jobs: true,
      can_run_scheduler: true,
      can_use_queue: true,
      can_mutate_billing: false,
      can_mutate_api_keys: true,
      can_mutate_organizations: true,
      can_use_admin_controls: true,
    };
  }

  return {
    can_read: true,
    can_write: true,
    can_run_background_jobs: true,
    can_run_scheduler: true,
    can_use_queue: true,
    can_mutate_billing: true,
    can_mutate_api_keys: true,
    can_mutate_organizations: true,
    can_use_admin_controls: true,
  };
}

/* ============================================================================
 * 3. POLICY ENGINE — PURE EVALUATION
 * ========================================================================== */

export async function evaluateProductionRuntimePolicy(input: {
  scope: RuntimeMutationScope;
}): Promise<RuntimePolicyEvaluation> {
  const evaluatedAt = nowIso();

  const [governor, highAvailability, controlPlane] = await Promise.all([
    evaluateDistributedRuntimeGovernor(),
    evaluateHighAvailability(),
    buildRuntimeControlPlane(),
  ]);

  const resolved = resolvePolicy({
    scope: input.scope,
    governor,
    high_availability: highAvailability,
    control_plane: controlPlane,
  });

  const flags = capabilityFlags(resolved.decision);

  const warnings = uniqueWarnings(
    governor.warnings,
    highAvailability.warnings,
    controlPlane.warnings,
    resolved.decision !== "ALLOW"
      ? [`production_runtime_policy_${resolved.reason}`]
      : [],
  );

  return {
    ok: resolved.decision !== "BLOCK",

    evaluated_at: evaluatedAt,

    scope: input.scope,

    decision: resolved.decision,
    reason: resolved.reason,

    governor,
    high_availability: highAvailability,
    control_plane: controlPlane,

    ...flags,

    warnings,
    error:
      resolved.decision === "BLOCK"
        ? `production_runtime_policy_${resolved.reason}`
        : null,
  };
}

/* ============================================================================
 * 4. EXPLICIT MUTATION — OPTIONAL EVENT EMISSION
 * ========================================================================== */

export async function emitProductionRuntimePolicyEvent(
  evaluation: RuntimePolicyEvaluation,
): Promise<RuntimePolicyMutationResult> {
  const emittedAt = nowIso();

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      evaluation.decision === "BLOCK"
        ? "critical"
        : evaluation.decision === "PROTECT"
          ? "high"
          : evaluation.decision === "WATCH"
            ? "normal"
            : "low",
    payload: {
      runtime_policy_scope: evaluation.scope,
      runtime_policy_decision: evaluation.decision,
      runtime_policy_reason: evaluation.reason,
      governor_state: evaluation.governor.state,
      high_availability_state: evaluation.high_availability.state,
      control_plane_decision: evaluation.control_plane.decision,
    },
    warnings:
      evaluation.decision === "ALLOW"
        ? []
        : [`production_runtime_policy_${evaluation.reason}`],
  });

  return {
    ok: true,
    emitted_at: emittedAt,
    evaluation,
    warnings: ["production_runtime_policy_event_emitted"],
    error: null,
  };
}

/* ============================================================================
 * 5. CONVENIENCE GUARDS — PURE OBSERVE
 * ========================================================================== */

export async function canRunRuntimeScope(
  scope: RuntimeMutationScope,
): Promise<boolean> {
  const policy = await evaluateProductionRuntimePolicy({ scope });

  if (scope === "read") return policy.can_read;
  if (scope === "write") return policy.can_write;
  if (scope === "background_jobs") return policy.can_run_background_jobs;
  if (scope === "scheduler") return policy.can_run_scheduler;
  if (scope === "queue") return policy.can_use_queue;
  if (scope === "billing") return policy.can_mutate_billing;
  if (scope === "api_keys") return policy.can_mutate_api_keys;
  if (scope === "organizations") return policy.can_mutate_organizations;
  if (scope === "admin") return policy.can_use_admin_controls;

  return false;
}

export async function isRuntimeProtected(): Promise<boolean> {
  const policy = await evaluateProductionRuntimePolicy({
    scope: "write",
  });

  return policy.decision === "PROTECT";
}
