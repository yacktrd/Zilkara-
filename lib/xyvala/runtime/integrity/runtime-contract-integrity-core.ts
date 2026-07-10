/* ============================================================================
 * FILE: lib/xyvala/runtime/integrity/runtime-contract-integrity-core.ts
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
  buildRuntimeComplianceCore,
  type RuntimeComplianceSnapshot,
} from "@/lib/xyvala/runtime/compliance/runtime-compliance-core";

import {
  buildDistributedRuntimeLifecycle,
  type DistributedRuntimeLifecycleSnapshot,
} from "@/lib/xyvala/runtime/lifecycle/distributed-runtime-lifecycle";

import {
  buildEnterpriseRuntimeResilienceCore,
  type EnterpriseRuntimeResilienceSnapshot,
} from "@/lib/xyvala/runtime/resilience/enterprise-runtime-resilience-core";

import { publishRuntimeEvent } from "@/lib/xyvala/runtime/events/event-bus";

import type {
  RuntimeMutationScope,
} from "@/lib/xyvala/runtime/policies/production-runtime-policy-engine";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RuntimeContractIntegrityState =
  | "valid"
  | "watch"
  | "inconsistent"
  | "broken"
  | "unknown";

export type RuntimeContractIntegrityReason =
  | "runtime_contract_integrity_valid"
  | "runtime_contract_integrity_watch"
  | "runtime_contract_integrity_state_governance_mismatch"
  | "runtime_contract_integrity_lifecycle_mismatch"
  | "runtime_contract_integrity_compliance_failed"
  | "runtime_contract_integrity_resilience_failed"
  | "runtime_contract_integrity_broken"
  | "runtime_contract_integrity_unknown";

export type RuntimeContractIntegritySeverity =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type RuntimeContractIntegrityViolation = {
  key: string;
  severity: RuntimeContractIntegritySeverity;
  message: string;
};

export type RuntimeContractIntegritySnapshot = {
  ok: boolean;
  validated_at: string;

  scope: RuntimeMutationScope;

  state: RuntimeContractIntegrityState;
  reason: RuntimeContractIntegrityReason;

  state_registry: RuntimeStateRegistrySnapshot;
  governance: RuntimeGovernanceRegistrySnapshot;
  compliance: RuntimeComplianceSnapshot;
  lifecycle: DistributedRuntimeLifecycleSnapshot;
  resilience: EnterpriseRuntimeResilienceSnapshot;

  violations: RuntimeContractIntegrityViolation[];

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

function violation(
  input: RuntimeContractIntegrityViolation,
): RuntimeContractIntegrityViolation {
  return {
    key: input.key,
    severity: input.severity,
    message: input.message,
  };
}

function hasCriticalViolation(
  violations: RuntimeContractIntegrityViolation[],
): boolean {
  return violations.some((item) => item.severity === "critical");
}

function hasHighViolation(
  violations: RuntimeContractIntegrityViolation[],
): boolean {
  return violations.some((item) => item.severity === "high");
}

/* ============================================================================
 * 3. CONTRACT VALIDATION
 * ========================================================================== */

function validateRuntimeContractIntegrity(input: {
  state_registry: RuntimeStateRegistrySnapshot;
  governance: RuntimeGovernanceRegistrySnapshot;
  compliance: RuntimeComplianceSnapshot;
  lifecycle: DistributedRuntimeLifecycleSnapshot;
  resilience: EnterpriseRuntimeResilienceSnapshot;
}): RuntimeContractIntegrityViolation[] {
  const violations: RuntimeContractIntegrityViolation[] = [];

  if (
    input.state_registry.operational_state === "blocked" &&
    input.governance.state !== "blocked"
  ) {
    violations.push(
      violation({
        key: "blocked_state_without_blocked_governance",
        severity: "critical",
        message:
          "Runtime operational state is blocked while governance registry is not blocked.",
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
        severity: "high",
        message:
          "Runtime governance is consistent while operational state is not stable.",
      }),
    );
  }

  if (
    input.lifecycle.decision === "RUN" &&
    input.state_registry.lifecycle_state !== "running"
  ) {
    violations.push(
      violation({
        key: "run_lifecycle_without_running_state",
        severity: "high",
        message:
          "Distributed lifecycle is RUN while lifecycle state is not running.",
      }),
    );
  }

  if (
    input.lifecycle.decision === "FAILOVER" &&
    input.state_registry.operational_state !== "failover"
  ) {
    violations.push(
      violation({
        key: "failover_lifecycle_without_failover_state",
        severity: "critical",
        message:
          "Distributed lifecycle is FAILOVER while operational state is not failover.",
      }),
    );
  }

  if (
    input.compliance.state === "compliant" &&
    input.compliance.violations.length > 0
  ) {
    violations.push(
      violation({
        key: "compliant_state_with_violations",
        severity: "critical",
        message:
          "Runtime compliance is marked compliant while violations are present.",
      }),
    );
  }

  if (
    input.compliance.state === "non_compliant" &&
    input.state_registry.operational_state === "stable"
  ) {
    violations.push(
      violation({
        key: "non_compliant_runtime_marked_stable",
        severity: "high",
        message:
          "Runtime compliance is non-compliant while operational state remains stable.",
      }),
    );
  }

  if (
    input.resilience.state === "critical" &&
    input.state_registry.operational_state !== "blocked" &&
    input.state_registry.operational_state !== "failover"
  ) {
    violations.push(
      violation({
        key: "critical_resilience_without_protective_state",
        severity: "high",
        message:
          "Runtime resilience is critical without blocked or failover operational state.",
      }),
    );
  }

  if (
    input.governance.can_write &&
    (
      input.state_registry.operational_state === "blocked" ||
      input.state_registry.operational_state === "failover"
    )
  ) {
    violations.push(
      violation({
        key: "write_enabled_during_blocked_or_failover",
        severity: "critical",
        message:
          "Runtime write capability is enabled during blocked or failover state.",
      }),
    );
  }

  if (
    input.lifecycle.decision === "SHUTDOWN" &&
    input.governance.can_write
  ) {
    violations.push(
      violation({
        key: "write_enabled_during_shutdown",
        severity: "critical",
        message:
          "Runtime write capability is enabled while lifecycle requests shutdown.",
      }),
    );
  }

  return violations;
}

function resolveIntegrity(input: {
  violations: RuntimeContractIntegrityViolation[];
  compliance: RuntimeComplianceSnapshot;
  resilience: EnterpriseRuntimeResilienceSnapshot;
}): {
  state: RuntimeContractIntegrityState;
  reason: RuntimeContractIntegrityReason;
} {
  if (hasCriticalViolation(input.violations)) {
    return {
      state: "broken",
      reason: "runtime_contract_integrity_broken",
    };
  }

  if (!input.compliance.ok) {
    return {
      state: "inconsistent",
      reason: "runtime_contract_integrity_compliance_failed",
    };
  }

  if (!input.resilience.ok) {
    return {
      state: "inconsistent",
      reason: "runtime_contract_integrity_resilience_failed",
    };
  }

  if (hasHighViolation(input.violations)) {
    return {
      state: "inconsistent",
      reason: "runtime_contract_integrity_state_governance_mismatch",
    };
  }

  if (input.violations.length > 0) {
    return {
      state: "watch",
      reason: "runtime_contract_integrity_watch",
    };
  }

  if (
    input.compliance.state === "compliant" &&
    input.resilience.state === "resilient"
  ) {
    return {
      state: "valid",
      reason: "runtime_contract_integrity_valid",
    };
  }

  return {
    state: "watch",
    reason: "runtime_contract_integrity_unknown",
  };
}

/* ============================================================================
 * 4. INTEGRITY CORE
 * ========================================================================== */

export async function buildRuntimeContractIntegrityCore(input: {
  scope?: RuntimeMutationScope;
} = {}): Promise<RuntimeContractIntegritySnapshot> {
  const validatedAt = nowIso();
  const scope = input.scope ?? "read";

  const [stateRegistry, governance, compliance, lifecycle, resilience] =
    await Promise.all([
      buildRuntimeStateRegistry({ scope }),
      buildRuntimeGovernanceRegistry({ scope }),
      buildRuntimeComplianceCore({ scope }),
      buildDistributedRuntimeLifecycle({ scope }),
      buildEnterpriseRuntimeResilienceCore({ scope }),
    ]);

  const violations = validateRuntimeContractIntegrity({
    state_registry: stateRegistry,
    governance,
    compliance,
    lifecycle,
    resilience,
  });

  const resolved = resolveIntegrity({
    violations,
    compliance,
    resilience,
  });

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      resolved.state === "broken"
        ? "critical"
        : resolved.state === "inconsistent"
          ? "high"
          : resolved.state === "watch"
            ? "normal"
            : "low",
    payload: {
      integrity_scope: scope,
      integrity_state: resolved.state,
      integrity_reason: resolved.reason,
      violations: violations.length,
      operational_state: stateRegistry.operational_state,
      governance_state: governance.state,
      compliance_state: compliance.state,
      lifecycle_decision: lifecycle.decision,
      resilience_state: resilience.state,
    },
    warnings:
      resolved.state === "valid"
        ? []
        : [`runtime_contract_integrity_${resolved.reason}`],
  });

  const warnings = uniqueWarnings(
    stateRegistry.warnings,
    governance.warnings,
    compliance.warnings,
    lifecycle.warnings,
    resilience.warnings,
    violations.map((item) => item.key),
    resolved.state !== "valid"
      ? [`runtime_contract_integrity_${resolved.reason}`]
      : [],
  );

  return {
    ok:
      resolved.state !== "broken" &&
      resolved.state !== "inconsistent",

    validated_at: validatedAt,

    scope,

    state: resolved.state,
    reason: resolved.reason,

    state_registry: stateRegistry,
    governance,
    compliance,
    lifecycle,
    resilience,

    violations,

    warnings,
    error:
      resolved.state === "broken" || resolved.state === "inconsistent"
        ? `runtime_contract_integrity_${resolved.reason}`
        : null,
  };
}

/* ============================================================================
 * 5. READERS
 * ========================================================================== */

export async function getRuntimeContractIntegrityState(): Promise<RuntimeContractIntegrityState> {
  const snapshot = await buildRuntimeContractIntegrityCore();

  return snapshot.state;
}

export async function isRuntimeContractIntegrityValid(): Promise<boolean> {
  const snapshot = await buildRuntimeContractIntegrityCore();

  return snapshot.ok && snapshot.state === "valid";
}
