/* ============================================================================
 * FILE: lib/xyvala/runtime/chaos/runtime-chaos-validation-core.ts
 * ========================================================================== */

import {
  buildRuntimeDisasterRecoveryCore,
  type RuntimeDisasterRecoverySnapshot,
} from "@/lib/xyvala/runtime/recovery/runtime-disaster-recovery-core";

import {
  buildRuntimeRuntimeConsistencyCore,
  type RuntimeConsistencySnapshot,
} from "@/lib/xyvala/runtime/consistency/runtime-runtime-consistency-core";

import {
  buildEnterpriseRuntimeResilienceCore,
  type EnterpriseRuntimeResilienceSnapshot,
} from "@/lib/xyvala/runtime/resilience/enterprise-runtime-resilience-core";

import {
  buildRuntimeGovernanceAnomalyRegistry,
  type RuntimeGovernanceAnomalySnapshot,
} from "@/lib/xyvala/runtime/anomalies/runtime-governance-anomaly-registry";

import {
  publishRuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

import type {
  RuntimeMutationScope,
} from "@/lib/xyvala/runtime/policies/production-runtime-policy-engine";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RuntimeChaosScenario =
  | "node_degradation"
  | "queue_pressure"
  | "redis_unavailable"
  | "postgres_unavailable"
  | "failover_pressure"
  | "recovery_pressure"
  | "governance_divergence";

export type RuntimeChaosValidationState =
  | "passed"
  | "watch"
  | "weak"
  | "failed"
  | "unknown";

export type RuntimeChaosValidationDecision =
  | "ACCEPT"
  | "WATCH"
  | "HARDEN"
  | "FAIL";

export type RuntimeChaosValidationReason =
  | "runtime_chaos_validation_passed"
  | "runtime_chaos_validation_watch"
  | "runtime_chaos_validation_weak_resilience"
  | "runtime_chaos_validation_consistency_failure"
  | "runtime_chaos_validation_disaster_required"
  | "runtime_chaos_validation_unknown";

export type RuntimeChaosValidationFinding = {
  key: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
};

export type RuntimeChaosValidationSnapshot = {
  ok: boolean;
  validated_at: string;

  scope: RuntimeMutationScope;
  scenario: RuntimeChaosScenario;

  state: RuntimeChaosValidationState;
  decision: RuntimeChaosValidationDecision;
  reason: RuntimeChaosValidationReason;

  robustness_score: number;

  disaster_recovery: RuntimeDisasterRecoverySnapshot;
  consistency: RuntimeConsistencySnapshot;
  resilience: EnterpriseRuntimeResilienceSnapshot;
  anomalies: RuntimeGovernanceAnomalySnapshot;

  findings: RuntimeChaosValidationFinding[];

  warnings: string[];
  error: string | null;
};

export type RuntimeChaosValidationMutationResult = {
  ok: boolean;
  emitted_at: string;
  snapshot: RuntimeChaosValidationSnapshot;
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
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

function finding(
  input: RuntimeChaosValidationFinding,
): RuntimeChaosValidationFinding {
  return {
    key: input.key,
    severity: input.severity,
    message: input.message,
  };
}

function hasCriticalFinding(
  findings: RuntimeChaosValidationFinding[],
): boolean {
  return findings.some((item) => item.severity === "critical");
}

function hasHighFinding(findings: RuntimeChaosValidationFinding[]): boolean {
  return findings.some((item) => item.severity === "high");
}

/* ============================================================================
 * 3. VALIDATION
 * ========================================================================== */

function detectChaosFindings(input: {
  scenario: RuntimeChaosScenario;
  disaster_recovery: RuntimeDisasterRecoverySnapshot;
  consistency: RuntimeConsistencySnapshot;
  resilience: EnterpriseRuntimeResilienceSnapshot;
  anomalies: RuntimeGovernanceAnomalySnapshot;
}): RuntimeChaosValidationFinding[] {
  const findings: RuntimeChaosValidationFinding[] = [];

  if (
    input.disaster_recovery.decision === "DISASTER_RECOVERY" ||
    input.disaster_recovery.decision === "BLOCK"
  ) {
    findings.push(
      finding({
        key: "disaster_recovery_required",
        severity: "critical",
        message:
          "Runtime disaster recovery is already required before chaos validation.",
      }),
    );
  }

  if (
    input.consistency.state === "broken" ||
    input.consistency.state === "divergent"
  ) {
    findings.push(
      finding({
        key: "runtime_consistency_unstable",
        severity: "critical",
        message:
          "Runtime consistency is broken or divergent under validation context.",
      }),
    );
  }

  if (
    input.resilience.state === "critical" ||
    input.resilience.state === "fragile"
  ) {
    findings.push(
      finding({
        key: "runtime_resilience_fragile",
        severity: input.resilience.state === "critical" ? "critical" : "high",
        message: `Runtime resilience is ${input.resilience.state}.`,
      }),
    );
  }

  if (
    input.anomalies.state === "critical" ||
    input.anomalies.state === "anomalous"
  ) {
    findings.push(
      finding({
        key: "runtime_anomalies_present",
        severity: input.anomalies.state === "critical" ? "critical" : "high",
        message: `Runtime anomaly registry is ${input.anomalies.state}.`,
      }),
    );
  }

  if (
    input.scenario === "failover_pressure" &&
    input.disaster_recovery.state !== "stable" &&
    input.disaster_recovery.state !== "recoverable"
  ) {
    findings.push(
      finding({
        key: "failover_pressure_not_absorbed",
        severity: "high",
        message:
          "Failover pressure scenario is not absorbed by the current recovery posture.",
      }),
    );
  }

  if (
    input.scenario === "recovery_pressure" &&
    input.disaster_recovery.state === "unknown"
  ) {
    findings.push(
      finding({
        key: "recovery_pressure_unknown",
        severity: "medium",
        message:
          "Recovery pressure scenario produced an unknown disaster recovery state.",
      }),
    );
  }

  if (
    input.scenario === "governance_divergence" &&
    input.consistency.state !== "consistent" &&
    input.consistency.state !== "watch"
  ) {
    findings.push(
      finding({
        key: "governance_divergence_not_contained",
        severity: "high",
        message:
          "Governance divergence scenario is not contained by consistency validation.",
      }),
    );
  }

  return findings;
}

function computeRobustnessScore(input: {
  disaster_recovery: RuntimeDisasterRecoverySnapshot;
  consistency: RuntimeConsistencySnapshot;
  resilience: EnterpriseRuntimeResilienceSnapshot;
  anomalies: RuntimeGovernanceAnomalySnapshot;
  findings: RuntimeChaosValidationFinding[];
}): number {
  let score = 100;

  if (!input.disaster_recovery.ok) score -= 35;
  if (!input.consistency.ok) score -= 30;
  if (!input.resilience.ok) score -= 25;
  if (!input.anomalies.ok) score -= 20;

  for (const item of input.findings) {
    if (item.severity === "critical") score -= 25;
    if (item.severity === "high") score -= 15;
    if (item.severity === "medium") score -= 8;
    if (item.severity === "low") score -= 3;
  }

  return clampScore(score);
}

function resolveChaosValidation(input: {
  score: number;
  findings: RuntimeChaosValidationFinding[];
  disaster_recovery: RuntimeDisasterRecoverySnapshot;
  consistency: RuntimeConsistencySnapshot;
}): {
  state: RuntimeChaosValidationState;
  decision: RuntimeChaosValidationDecision;
  reason: RuntimeChaosValidationReason;
} {
  if (
    input.disaster_recovery.decision === "DISASTER_RECOVERY" ||
    input.disaster_recovery.decision === "BLOCK"
  ) {
    return {
      state: "failed",
      decision: "FAIL",
      reason: "runtime_chaos_validation_disaster_required",
    };
  }

  if (
    hasCriticalFinding(input.findings) ||
    input.consistency.state === "broken" ||
    input.consistency.state === "divergent"
  ) {
    return {
      state: "failed",
      decision: "FAIL",
      reason: "runtime_chaos_validation_consistency_failure",
    };
  }

  if (hasHighFinding(input.findings) || input.score < 50) {
    return {
      state: "weak",
      decision: "HARDEN",
      reason: "runtime_chaos_validation_weak_resilience",
    };
  }

  if (input.findings.length > 0 || input.score < 75) {
    return {
      state: "watch",
      decision: "WATCH",
      reason: "runtime_chaos_validation_watch",
    };
  }

  if (input.score >= 75) {
    return {
      state: "passed",
      decision: "ACCEPT",
      reason: "runtime_chaos_validation_passed",
    };
  }

  return {
    state: "unknown",
    decision: "WATCH",
    reason: "runtime_chaos_validation_unknown",
  };
}

/* ============================================================================
 * 4. CHAOS VALIDATION CORE — PURE COMPUTE / SIMULATION
 * ========================================================================== */

export async function buildRuntimeChaosValidationCore(input: {
  scope?: RuntimeMutationScope;
  scenario?: RuntimeChaosScenario;
  limit?: number | null;
} = {}): Promise<RuntimeChaosValidationSnapshot> {
  const validatedAt = nowIso();
  const scope = input.scope ?? "read";
  const scenario = input.scenario ?? "governance_divergence";

  const [disasterRecovery, consistency, resilience, anomalies] =
    await Promise.all([
      buildRuntimeDisasterRecoveryCore({
        scope,
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      }),
      buildRuntimeRuntimeConsistencyCore({
        scope,
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      }),
      buildEnterpriseRuntimeResilienceCore({ scope }),
      buildRuntimeGovernanceAnomalyRegistry({
        scope,
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      }),
    ]);

  const findings = detectChaosFindings({
    scenario,
    disaster_recovery: disasterRecovery,
    consistency,
    resilience,
    anomalies,
  });

  const robustnessScore = computeRobustnessScore({
    disaster_recovery: disasterRecovery,
    consistency,
    resilience,
    anomalies,
    findings,
  });

  const resolved = resolveChaosValidation({
    score: robustnessScore,
    findings,
    disaster_recovery: disasterRecovery,
    consistency,
  });

  const warnings = uniqueWarnings(
    disasterRecovery.warnings,
    consistency.warnings,
    resilience.warnings,
    anomalies.warnings,
    findings.map((item) => item.key),
    resolved.decision !== "ACCEPT"
      ? [`runtime_chaos_validation_${resolved.reason}`]
      : [],
  );

  return {
    ok: resolved.decision === "ACCEPT" || resolved.decision === "WATCH",

    validated_at: validatedAt,

    scope,
    scenario,

    state: resolved.state,
    decision: resolved.decision,
    reason: resolved.reason,

    robustness_score: robustnessScore,

    disaster_recovery: disasterRecovery,
    consistency,
    resilience,
    anomalies,

    findings,

    warnings,
    error:
      resolved.decision === "FAIL" || resolved.decision === "HARDEN"
        ? `runtime_chaos_validation_${resolved.reason}`
        : null,
  };
}

/* ============================================================================
 * 5. EXPLICIT MUTATION — OPTIONAL EVENT EMISSION
 * ========================================================================== */

export async function emitRuntimeChaosValidationEvent(
  snapshot: RuntimeChaosValidationSnapshot,
): Promise<RuntimeChaosValidationMutationResult> {
  const emittedAt = nowIso();

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      snapshot.decision === "FAIL"
        ? "critical"
        : snapshot.decision === "HARDEN"
          ? "high"
          : snapshot.decision === "WATCH"
            ? "normal"
            : "low",
    payload: {
      chaos_scope: snapshot.scope,
      chaos_scenario: snapshot.scenario,
      chaos_state: snapshot.state,
      chaos_decision: snapshot.decision,
      chaos_reason: snapshot.reason,
      robustness_score: snapshot.robustness_score,
      findings: snapshot.findings.length,
      disaster_recovery_state: snapshot.disaster_recovery.state,
      consistency_state: snapshot.consistency.state,
      resilience_state: snapshot.resilience.state,
      anomaly_state: snapshot.anomalies.state,
    },
    warnings:
      snapshot.decision === "ACCEPT"
        ? []
        : [`runtime_chaos_validation_${snapshot.reason}`],
  });

  return {
    ok: true,
    emitted_at: emittedAt,
    snapshot,
    warnings: ["runtime_chaos_validation_event_emitted"],
    error: null,
  };
}

/* ============================================================================
 * 6. READERS — PURE OBSERVE
 * ========================================================================== */

export async function getRuntimeChaosValidationState(): Promise<RuntimeChaosValidationState> {
  const snapshot = await buildRuntimeChaosValidationCore();

  return snapshot.state;
}

export async function getRuntimeChaosRobustnessScore(): Promise<number> {
  const snapshot = await buildRuntimeChaosValidationCore();

  return snapshot.robustness_score;
}

export async function isRuntimeChaosValidationPassed(): Promise<boolean> {
  const snapshot = await buildRuntimeChaosValidationCore();

  return snapshot.ok && snapshot.state === "passed";
}
