/* ============================================================================
 * FILE: lib/xyvala/runtime/compliance/runtime-compliance-core.ts
 * ========================================================================== */

import {
  buildRuntimeStateRegistry,
  type RuntimeStateRegistrySnapshot,
} from "@/lib/xyvala/runtime/registry/runtime-state-registry";

import {
  buildRuntimeGovernanceRegistry,
  type RuntimeGovernanceRegistrySnapshot,
} from "@/lib/xyvala/runtime/registry/runtime-governance-registry";

import {
  buildDistributedRuntimeLifecycle,
  type DistributedRuntimeLifecycleSnapshot,
} from "@/lib/xyvala/runtime/lifecycle/distributed-runtime-lifecycle";

import {
  evaluateProductionRuntimePolicy,
  type RuntimeMutationScope,
  type RuntimePolicyEvaluation,
} from "@/lib/xyvala/runtime/policies/production-runtime-policy-engine";

import {
  publishRuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RuntimeComplianceState =
  | "compliant"
  | "watch"
  | "non_compliant"
  | "blocked"
  | "unknown";

export type RuntimeComplianceReason =
  | "runtime_compliance_valid"
  | "runtime_compliance_watch"
  | "runtime_compliance_lifecycle_mismatch"
  | "runtime_compliance_governance_mismatch"
  | "runtime_compliance_policy_blocked"
  | "runtime_compliance_state_blocked"
  | "runtime_compliance_unknown";

export type RuntimeComplianceViolation = {
  key: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
};

export type RuntimeComplianceSnapshot = {
  ok: boolean;
  validated_at: string;

  scope: RuntimeMutationScope;

  state: RuntimeComplianceState;
  reason: RuntimeComplianceReason;

  state_registry: RuntimeStateRegistrySnapshot;
  governance: RuntimeGovernanceRegistrySnapshot;
  lifecycle: DistributedRuntimeLifecycleSnapshot;
  policy: RuntimePolicyEvaluation;

  violations: RuntimeComplianceViolation[];

  warnings: string[];
  error: string | null;
};

export type RuntimeComplianceMutationResult = {
  ok: boolean;
  emitted_at: string;
  snapshot: RuntimeComplianceSnapshot;
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

function violation(input: RuntimeComplianceViolation): RuntimeComplianceViolation {
  return {
    key: input.key,
    severity: input.severity,
    message: input.message,
  };
}

function hasCriticalViolation(violations: RuntimeComplianceViolation[]): boolean {
  return violations.some((item) => item.severity === "critical");
}

function hasHighViolation(violations: RuntimeComplianceViolation[]): boolean {
  return violations.some((item) => item.severity === "high");
}

/* ============================================================================
 * 3. VALIDATION — PURE COMPUTE
 * ========================================================================== */

function validateRuntimeCompliance(input: {
  state_registry: RuntimeStateRegistrySnapshot;
  governance: RuntimeGovernanceRegistrySnapshot;
  lifecycle: DistributedRuntimeLifecycleSnapshot;
  policy: RuntimePolicyEvaluation;
}): RuntimeComplianceViolation[] {
  const violations: RuntimeComplianceViolation[] = [];

  if (
    input.policy.decision === "BLOCK" &&
    input.state_registry.operational_state !== "blocked"
  ) {
    violations.push(
      violation({
        key: "policy_block_without_blocked_state",
        severity: "critical",
        message:
          "Runtime policy is blocked but runtime state registry is not blocked.",
      }),
    );
  }

  if (
    input.state_registry.operational_state === "blocked" &&
    input.governance.state !== "blocked"
  ) {
    violations.push(
      violation({
        key: "blocked_state_without_blocked_governance",
        severity: "high",
        message:
          "Runtime state is blocked while governance registry is not blocked.",
      }),
    );
  }

  if (
    input.lifecycle.decision === "RUN" &&
    input.state_registry.lifecycle_state !== "running"
  ) {
    violations.push(
      violation({
        key: "lifecycle_run_mismatch",
        severity: "medium",
        message:
          "Distributed lifecycle is RUN while state registry lifecycle is not running.",
      }),
    );
  }

  if (
    input.lifecycle.decision === "FAILOVER" &&
    input.state_registry.operational_state !== "failover"
  ) {
    violations.push(
      violation({
        key: "failover_lifecycle_mismatch",
        severity: "critical",
        message:
          "Distributed lifecycle is FAILOVER while operational state is not failover.",
      }),
    );
  }

  if (
    input.governance.state === "consistent" &&
    input.state_registry.operational_state !== "stable"
  ) {
    violations.push(
      violation({
        key: "consistent_governance_without_stable_state",
        severity: "medium",
        message:
          "Governance is consistent while operational state is not stable.",
      }),
    );
  }

  if (
    input.policy.can_write &&
    (
      input.state_registry.operational_state === "blocked" ||
      input.state_registry.operational_state === "failover"
    )
  ) {
    violations.push(
      violation({
        key: "write_allowed_during_blocked_or_failover",
        severity: "critical",
        message:
          "Runtime write capability is enabled during blocked or failover state.",
      }),
    );
  }

  return violations;
}

function resolveCompliance(input: {
  violations: RuntimeComplianceViolation[];
  state_registry: RuntimeStateRegistrySnapshot;
  governance: RuntimeGovernanceRegistrySnapshot;
  policy: RuntimePolicyEvaluation;
}): {
  state: RuntimeComplianceState;
  reason: RuntimeComplianceReason;
} {
  if (
    input.policy.decision === "BLOCK" ||
    input.state_registry.operational_state === "blocked"
  ) {
    return {
      state: "blocked",
      reason: "runtime_compliance_state_blocked",
    };
  }

  if (hasCriticalViolation(input.violations)) {
    return {
      state: "non_compliant",
      reason: "runtime_compliance_policy_blocked",
    };
  }

  if (hasHighViolation(input.violations)) {
    return {
      state: "non_compliant",
      reason: "runtime_compliance_governance_mismatch",
    };
  }

  if (input.violations.length > 0) {
    return {
      state: "watch",
      reason: "runtime_compliance_watch",
    };
  }

  if (
    input.governance.state === "consistent" &&
    input.state_registry.operational_state === "stable" &&
    input.policy.decision === "ALLOW"
  ) {
    return {
      state: "compliant",
      reason: "runtime_compliance_valid",
    };
  }

  return {
    state: "watch",
    reason: "runtime_compliance_unknown",
  };
}

/* ============================================================================
 * 4. COMPLIANCE CORE — PURE VALIDATION
 * ========================================================================== */

export async function buildRuntimeComplianceCore(input: {
  scope?: RuntimeMutationScope;
} = {}): Promise<RuntimeComplianceSnapshot> {
  const validatedAt = nowIso();
  const scope = input.scope ?? "read";

  const [stateRegistry, governance, lifecycle, policy] = await Promise.all([
    buildRuntimeStateRegistry({ scope }),
    buildRuntimeGovernanceRegistry({ scope }),
    buildDistributedRuntimeLifecycle({ scope }),
    evaluateProductionRuntimePolicy({ scope }),
  ]);

  const violations = validateRuntimeCompliance({
    state_registry: stateRegistry,
    governance,
    lifecycle,
    policy,
  });

  const resolved = resolveCompliance({
    violations,
    state_registry: stateRegistry,
    governance,
    policy,
  });

  const warnings = uniqueWarnings(
    stateRegistry.warnings,
    governance.warnings,
    lifecycle.warnings,
    policy.warnings,
    violations.map((item) => item.key),
    resolved.state !== "compliant"
      ? [`runtime_compliance_${resolved.reason}`]
      : [],
  );

  return {
    ok:
      resolved.state !== "blocked" &&
      resolved.state !== "non_compliant",

    validated_at: validatedAt,

    scope,

    state: resolved.state,
    reason: resolved.reason,

    state_registry: stateRegistry,
    governance,
    lifecycle,
    policy,

    violations,

    warnings,
    error:
      resolved.state === "blocked" || resolved.state === "non_compliant"
        ? `runtime_compliance_${resolved.reason}`
        : null,
  };
}

/* ============================================================================
 * 5. EXPLICIT MUTATION — OPTIONAL EVENT EMISSION
 * ========================================================================== */

export async function emitRuntimeComplianceEvent(
  snapshot: RuntimeComplianceSnapshot,
): Promise<RuntimeComplianceMutationResult> {
  const emittedAt = nowIso();

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      snapshot.state === "blocked" || snapshot.state === "non_compliant"
        ? "critical"
        : snapshot.state === "watch"
          ? "high"
          : "normal",
    payload: {
      compliance_scope: snapshot.scope,
      compliance_state: snapshot.state,
      compliance_reason: snapshot.reason,
      violations: snapshot.violations.length,
      operational_state: snapshot.state_registry.operational_state,
      governance_state: snapshot.governance.state,
      lifecycle_decision: snapshot.lifecycle.decision,
      policy_decision: snapshot.policy.decision,
    },
    warnings:
      snapshot.state === "compliant"
        ? []
        : [`runtime_compliance_${snapshot.reason}`],
  });

  return {
    ok: true,
    emitted_at: emittedAt,
    snapshot,
    warnings: ["runtime_compliance_event_emitted"],
    error: null,
  };
}

/* ============================================================================
 * 6. READERS — PURE OBSERVE
 * ========================================================================== */

export async function getRuntimeComplianceState(): Promise<RuntimeComplianceState> {
  const snapshot = await buildRuntimeComplianceCore();

  return snapshot.state;
}

export async function isRuntimeCompliant(): Promise<boolean> {
  const snapshot = await buildRuntimeComplianceCore();

  return snapshot.ok && snapshot.state === "compliant";
}
