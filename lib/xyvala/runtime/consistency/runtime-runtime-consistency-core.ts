/* ============================================================================
 * FILE: lib/xyvala/runtime/consistency/runtime-runtime-consistency-core.ts
 * ========================================================================== */

import {
  buildRuntimeContractIntegrityCore,
  type RuntimeContractIntegritySnapshot,
} from "@/lib/xyvala/runtime/integrity/runtime-contract-integrity-core";

import {
  buildRuntimeGovernanceReplayCore,
  type RuntimeReplaySnapshot,
} from "@/lib/xyvala/runtime/replay/runtime-governance-replay-core";

import {
  buildRuntimeGovernanceAnomalyRegistry,
  type RuntimeGovernanceAnomalySnapshot,
} from "@/lib/xyvala/runtime/anomalies/runtime-governance-anomaly-registry";

import {
  buildEnterpriseRuntimeResilienceCore,
  type EnterpriseRuntimeResilienceSnapshot,
} from "@/lib/xyvala/runtime/resilience/enterprise-runtime-resilience-core";

import {
  buildRuntimeComplianceCore,
  type RuntimeComplianceSnapshot,
} from "@/lib/xyvala/runtime/compliance/runtime-compliance-core";

import {
  publishRuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

import type {
  RuntimeMutationScope,
} from "@/lib/xyvala/runtime/policies/production-runtime-policy-engine";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RuntimeConsistencyState =
  | "consistent"
  | "watch"
  | "divergent"
  | "broken"
  | "unknown";

export type RuntimeConsistencyReason =
  | "runtime_consistency_valid"
  | "runtime_consistency_watch"
  | "runtime_consistency_replay_divergence"
  | "runtime_consistency_integrity_failure"
  | "runtime_consistency_anomaly_failure"
  | "runtime_consistency_resilience_failure"
  | "runtime_consistency_compliance_failure"
  | "runtime_consistency_unknown";

export type RuntimeConsistencyViolation = {
  key: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
};

export type RuntimeConsistencySnapshot = {
  ok: boolean;
  checked_at: string;

  scope: RuntimeMutationScope;

  state: RuntimeConsistencyState;
  reason: RuntimeConsistencyReason;

  integrity: RuntimeContractIntegritySnapshot;
  replay: RuntimeReplaySnapshot;
  anomalies: RuntimeGovernanceAnomalySnapshot;
  resilience: EnterpriseRuntimeResilienceSnapshot;
  compliance: RuntimeComplianceSnapshot;

  violations: RuntimeConsistencyViolation[];

  warnings: string[];
  error: string | null;
};

export type RuntimeConsistencyMutationResult = {
  ok: boolean;
  emitted_at: string;
  snapshot: RuntimeConsistencySnapshot;
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
  input: RuntimeConsistencyViolation,
): RuntimeConsistencyViolation {
  return {
    key: input.key,
    severity: input.severity,
    message: input.message,
  };
}

function hasCriticalViolation(
  violations: RuntimeConsistencyViolation[],
): boolean {
  return violations.some((item) => item.severity === "critical");
}

function hasHighViolation(violations: RuntimeConsistencyViolation[]): boolean {
  return violations.some((item) => item.severity === "high");
}

/* ============================================================================
 * 3. VALIDATION
 * ========================================================================== */

function validateRuntimeConsistency(input: {
  integrity: RuntimeContractIntegritySnapshot;
  replay: RuntimeReplaySnapshot;
  anomalies: RuntimeGovernanceAnomalySnapshot;
  resilience: EnterpriseRuntimeResilienceSnapshot;
  compliance: RuntimeComplianceSnapshot;
}): RuntimeConsistencyViolation[] {
  const violations: RuntimeConsistencyViolation[] = [];

  if (!input.integrity.ok) {
    violations.push(
      violation({
        key: "integrity_core_not_ok",
        severity: input.integrity.state === "broken" ? "critical" : "high",
        message: `Runtime integrity is not valid: ${input.integrity.reason}.`,
      }),
    );
  }

  if (input.replay.state === "divergent") {
    violations.push(
      violation({
        key: "replay_divergent",
        severity: "critical",
        message: "Runtime replay is divergent.",
      }),
    );
  }

  if (input.anomalies.state === "critical") {
    violations.push(
      violation({
        key: "critical_anomalies_detected",
        severity: "critical",
        message: "Critical runtime governance anomalies were detected.",
      }),
    );
  }

  if (input.anomalies.state === "anomalous") {
    violations.push(
      violation({
        key: "high_anomalies_detected",
        severity: "high",
        message: "High runtime governance anomalies were detected.",
      }),
    );
  }

  if (!input.resilience.ok) {
    violations.push(
      violation({
        key: "resilience_not_ok",
        severity: input.resilience.state === "critical" ? "critical" : "high",
        message: `Runtime resilience is degraded: ${input.resilience.reason}.`,
      }),
    );
  }

  if (!input.compliance.ok) {
    violations.push(
      violation({
        key: "compliance_not_ok",
        severity:
          input.compliance.state === "blocked" ||
          input.compliance.state === "non_compliant"
            ? "critical"
            : "high",
        message: `Runtime compliance is not valid: ${input.compliance.reason}.`,
      }),
    );
  }

  if (
    input.integrity.state === "valid" &&
    input.compliance.state !== "compliant"
  ) {
    violations.push(
      violation({
        key: "valid_integrity_without_compliance",
        severity: "high",
        message:
          "Runtime integrity is valid while compliance is not compliant.",
      }),
    );
  }

  if (
    input.resilience.state === "resilient" &&
    input.anomalies.state !== "clear"
  ) {
    violations.push(
      violation({
        key: "resilient_runtime_with_anomalies",
        severity: "medium",
        message:
          "Runtime resilience is marked resilient while anomalies are present.",
      }),
    );
  }

  if (
    input.replay.state === "consistent" &&
    input.integrity.state !== "valid"
  ) {
    violations.push(
      violation({
        key: "consistent_replay_without_valid_integrity",
        severity: "medium",
        message:
          "Runtime replay is consistent while contract integrity is not valid.",
      }),
    );
  }

  return violations;
}

function resolveRuntimeConsistency(input: {
  violations: RuntimeConsistencyViolation[];
  integrity: RuntimeContractIntegritySnapshot;
  replay: RuntimeReplaySnapshot;
  anomalies: RuntimeGovernanceAnomalySnapshot;
  resilience: EnterpriseRuntimeResilienceSnapshot;
  compliance: RuntimeComplianceSnapshot;
}): {
  state: RuntimeConsistencyState;
  reason: RuntimeConsistencyReason;
} {
  if (hasCriticalViolation(input.violations)) {
    return {
      state: "broken",
      reason: "runtime_consistency_integrity_failure",
    };
  }

  if (input.replay.state === "divergent") {
    return {
      state: "divergent",
      reason: "runtime_consistency_replay_divergence",
    };
  }

  if (!input.integrity.ok) {
    return {
      state: "divergent",
      reason: "runtime_consistency_integrity_failure",
    };
  }

  if (!input.compliance.ok) {
    return {
      state: "divergent",
      reason: "runtime_consistency_compliance_failure",
    };
  }

  if (!input.resilience.ok) {
    return {
      state: "divergent",
      reason: "runtime_consistency_resilience_failure",
    };
  }

  if (!input.anomalies.ok) {
    return {
      state: "divergent",
      reason: "runtime_consistency_anomaly_failure",
    };
  }

  if (hasHighViolation(input.violations) || input.violations.length > 0) {
    return {
      state: "watch",
      reason: "runtime_consistency_watch",
    };
  }

  if (
    input.integrity.state === "valid" &&
    input.replay.state === "consistent" &&
    input.anomalies.state === "clear" &&
    input.resilience.state === "resilient" &&
    input.compliance.state === "compliant"
  ) {
    return {
      state: "consistent",
      reason: "runtime_consistency_valid",
    };
  }

  return {
    state: "unknown",
    reason: "runtime_consistency_unknown",
  };
}

/* ============================================================================
 * 4. CONSISTENCY CORE — PURE COMPUTE / VALIDATION
 * ========================================================================== */

export async function buildRuntimeRuntimeConsistencyCore(input: {
  scope?: RuntimeMutationScope;
  limit?: number | null;
} = {}): Promise<RuntimeConsistencySnapshot> {
  const checkedAt = nowIso();
  const scope = input.scope ?? "read";

  const [integrity, replay, anomalies, resilience, compliance] =
    await Promise.all([
      buildRuntimeContractIntegrityCore({ scope }),
      buildRuntimeGovernanceReplayCore({
        scope,
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      }),
      buildRuntimeGovernanceAnomalyRegistry({
        scope,
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      }),
      buildEnterpriseRuntimeResilienceCore({ scope }),
      buildRuntimeComplianceCore({ scope }),
    ]);

  const violations = validateRuntimeConsistency({
    integrity,
    replay,
    anomalies,
    resilience,
    compliance,
  });

  const resolved = resolveRuntimeConsistency({
    violations,
    integrity,
    replay,
    anomalies,
    resilience,
    compliance,
  });

  const warnings = uniqueWarnings(
    integrity.warnings,
    replay.warnings,
    anomalies.warnings,
    resilience.warnings,
    compliance.warnings,
    violations.map((item) => item.key),
    resolved.state !== "consistent"
      ? [`runtime_runtime_consistency_${resolved.reason}`]
      : [],
  );

  return {
    ok: resolved.state === "consistent" || resolved.state === "watch",

    checked_at: checkedAt,

    scope,

    state: resolved.state,
    reason: resolved.reason,

    integrity,
    replay,
    anomalies,
    resilience,
    compliance,

    violations,

    warnings,
    error:
      resolved.state === "broken" || resolved.state === "divergent"
        ? `runtime_runtime_consistency_${resolved.reason}`
        : null,
  };
}

/* ============================================================================
 * 5. EXPLICIT MUTATION — OPTIONAL EVENT EMISSION
 * ========================================================================== */

export async function emitRuntimeConsistencyEvent(
  snapshot: RuntimeConsistencySnapshot,
): Promise<RuntimeConsistencyMutationResult> {
  const emittedAt = nowIso();

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      snapshot.state === "broken" || snapshot.state === "divergent"
        ? "critical"
        : snapshot.state === "watch" || snapshot.state === "unknown"
          ? "high"
          : "normal",
    payload: {
      consistency_scope: snapshot.scope,
      consistency_state: snapshot.state,
      consistency_reason: snapshot.reason,
      violations: snapshot.violations.length,
      integrity_state: snapshot.integrity.state,
      replay_state: snapshot.replay.state,
      anomaly_state: snapshot.anomalies.state,
      resilience_state: snapshot.resilience.state,
      compliance_state: snapshot.compliance.state,
    },
    warnings:
      snapshot.state === "consistent"
        ? []
        : [`runtime_runtime_consistency_${snapshot.reason}`],
  });

  return {
    ok: true,
    emitted_at: emittedAt,
    snapshot,
    warnings: ["runtime_consistency_event_emitted"],
    error: null,
  };
}

/* ============================================================================
 * 6. READERS — PURE OBSERVE
 * ========================================================================== */

export async function getRuntimeConsistencyState(): Promise<RuntimeConsistencyState> {
  const snapshot = await buildRuntimeRuntimeConsistencyCore();

  return snapshot.state;
}

export async function isRuntimeConsistent(): Promise<boolean> {
  const snapshot = await buildRuntimeRuntimeConsistencyCore();

  return snapshot.ok && snapshot.state === "consistent";
}
