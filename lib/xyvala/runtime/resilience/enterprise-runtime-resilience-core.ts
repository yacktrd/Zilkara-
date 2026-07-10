/* ============================================================================
 * FILE: lib/xyvala/runtime/resilience/enterprise-runtime-resilience-core.ts
 * ============================================================================
 * TITLE
 * - Enterprise runtime resilience core
 *
 * ROLE
 * - evaluate deterministic runtime resilience posture
 * - aggregate resilience signals from validated runtime snapshots
 * - expose resilience scoring without runtime mutation
 *
 * DIRECTIVES
 * - compute only
 * - no runtime mutation
 * - no event publishing
 * - no failover triggering
 * - no recovery triggering
 * - no queue writes
 * - no persistence writes
 * - no runtime orchestration
 * - no analytical reconstruction
 * - snapshot driven only
 *
 * INVARIANTS
 * - resilience is descriptive only
 * - resilience never governs runtime directly
 * - resilience never mutates upstream layers
 * - resilience uses validated snapshots exclusively
 * ========================================================================== */

import {
  buildRuntimeEventHistoryRegistry,
  type RuntimeEventHistorySnapshot,
} from "@/lib/xyvala/runtime/history/runtime-event-history-registry";

import {
  buildRuntimeGovernanceHistory,
  type RuntimeGovernanceHistorySnapshot,
} from "@/lib/xyvala/runtime/history/runtime-governance-history";

import {
  buildRuntimeComplianceCore,
  type RuntimeComplianceSnapshot,
} from "@/lib/xyvala/runtime/compliance/runtime-compliance-core";

import {
  evaluateHighAvailability,
  type HighAvailabilityEvaluation,
} from "@/lib/xyvala/runtime/high-availability/high-availability-coordinator";

import {
  buildRuntimeStateRegistry,
  type RuntimeStateRegistrySnapshot,
} from "@/lib/xyvala/runtime/registry/runtime-state-registry";

import {
  publishRuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

import type {
  RuntimeMutationScope,
} from "@/lib/xyvala/runtime/policies/production-runtime-policy-engine";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type EnterpriseRuntimeResilienceState =
  | "resilient"
  | "tolerant"
  | "fragile"
  | "critical"
  | "unknown";

export type EnterpriseRuntimeResilienceDecision =
  | "MAINTAIN"
  | "WATCH"
  | "PROTECT"
  | "RECOVER"
  | "FAILOVER";

export type EnterpriseRuntimeResilienceReason =
  | "runtime_resilience_valid"
  | "runtime_resilience_watch"
  | "runtime_resilience_degraded_history"
  | "runtime_resilience_compliance_risk"
  | "runtime_resilience_ha_degraded"
  | "runtime_resilience_critical"
  | "runtime_resilience_unknown";

export type EnterpriseRuntimeResilienceAction =
  | "observe"
  | "emit_warning"
  | "protect_runtime"
  | "request_recovery"
  | "request_failover";

export type EnterpriseRuntimeResilienceSnapshot = {
  ok: boolean;
  evaluated_at: string;

  scope: RuntimeMutationScope;

  state: EnterpriseRuntimeResilienceState;
  decision: EnterpriseRuntimeResilienceDecision;
  reason: EnterpriseRuntimeResilienceReason;
  actions: EnterpriseRuntimeResilienceAction[];

  resilience_score: number;

  state_registry: RuntimeStateRegistrySnapshot;
  compliance: RuntimeComplianceSnapshot;
  high_availability: HighAvailabilityEvaluation;
  event_history: RuntimeEventHistorySnapshot;
  governance_history: RuntimeGovernanceHistorySnapshot;

  warnings: string[];
  error: string | null;
};

export type EnterpriseRuntimeResilienceMutationResult = {
  ok: boolean;
  emitted_at: string;
  snapshot: EnterpriseRuntimeResilienceSnapshot;
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

/* ============================================================================
 * 3. RESILIENCE SCORING — PURE COMPUTE
 * ========================================================================== */

function computeResilienceScore(input: {
  state_registry: RuntimeStateRegistrySnapshot;
  compliance: RuntimeComplianceSnapshot;
  high_availability: HighAvailabilityEvaluation;
  event_history: RuntimeEventHistorySnapshot;
  governance_history: RuntimeGovernanceHistorySnapshot;
}): number {
  let score = 100;

  if (!input.state_registry.ok) score -= 25;
  if (!input.compliance.ok) score -= 30;
  if (!input.high_availability.ok) score -= 25;
  if (!input.event_history.ok) score -= 10;
  if (!input.governance_history.ok) score -= 10;

  if (input.state_registry.operational_state === "blocked") score -= 40;
  if (input.state_registry.operational_state === "failover") score -= 35;
  if (input.state_registry.operational_state === "protected") score -= 20;
  if (input.state_registry.operational_state === "degraded") score -= 15;
  if (input.state_registry.operational_state === "watch") score -= 8;

  if (input.compliance.violations.length > 0) {
    score -= Math.min(25, input.compliance.violations.length * 5);
  }

  if (input.high_availability.state === "unavailable") score -= 40;
  if (input.high_availability.state === "at_risk") score -= 25;
  if (input.high_availability.state === "degraded") score -= 15;

  return clampScore(score);
}

function resolveResilience(input: {
  score: number;
  state_registry: RuntimeStateRegistrySnapshot;
  compliance: RuntimeComplianceSnapshot;
  high_availability: HighAvailabilityEvaluation;
}): {
  state: EnterpriseRuntimeResilienceState;
  decision: EnterpriseRuntimeResilienceDecision;
  reason: EnterpriseRuntimeResilienceReason;
  actions: EnterpriseRuntimeResilienceAction[];
} {
  if (
    input.state_registry.operational_state === "blocked" ||
    input.state_registry.operational_state === "failover" ||
    input.high_availability.state === "unavailable"
  ) {
    return {
      state: "critical",
      decision: "FAILOVER",
      reason: "runtime_resilience_critical",
      actions: ["request_failover", "emit_warning"],
    };
  }

  if (!input.compliance.ok) {
    return {
      state: "fragile",
      decision: "PROTECT",
      reason: "runtime_resilience_compliance_risk",
      actions: ["protect_runtime", "emit_warning"],
    };
  }

  if (
    input.high_availability.state === "degraded" ||
    input.high_availability.state === "at_risk"
  ) {
    return {
      state: "fragile",
      decision: "RECOVER",
      reason: "runtime_resilience_ha_degraded",
      actions: ["request_recovery", "emit_warning"],
    };
  }

  if (input.score < 50) {
    return {
      state: "fragile",
      decision: "PROTECT",
      reason: "runtime_resilience_degraded_history",
      actions: ["protect_runtime", "emit_warning"],
    };
  }

  if (input.score < 75) {
    return {
      state: "tolerant",
      decision: "WATCH",
      reason: "runtime_resilience_watch",
      actions: ["observe", "emit_warning"],
    };
  }

  if (input.score >= 75) {
    return {
      state: "resilient",
      decision: "MAINTAIN",
      reason: "runtime_resilience_valid",
      actions: ["observe"],
    };
  }

  return {
    state: "unknown",
    decision: "WATCH",
    reason: "runtime_resilience_unknown",
    actions: ["observe", "emit_warning"],
  };
}

/* ============================================================================
 * 4. RESILIENCE CORE — PURE COMPUTE
 * ========================================================================== */

export async function buildEnterpriseRuntimeResilienceCore(input: {
  scope?: RuntimeMutationScope;
} = {}): Promise<EnterpriseRuntimeResilienceSnapshot> {
  const evaluatedAt = nowIso();
  const scope = input.scope ?? "read";

  const [
    stateRegistry,
    compliance,
    highAvailability,
    eventHistory,
    governanceHistory,
  ] = await Promise.all([
    buildRuntimeStateRegistry({ scope }),
    buildRuntimeComplianceCore({ scope }),
    evaluateHighAvailability(),
    buildRuntimeEventHistoryRegistry(),
    buildRuntimeGovernanceHistory(),
  ]);

  const resilienceScore = computeResilienceScore({
    state_registry: stateRegistry,
    compliance,
    high_availability: highAvailability,
    event_history: eventHistory,
    governance_history: governanceHistory,
  });

  const resolved = resolveResilience({
    score: resilienceScore,
    state_registry: stateRegistry,
    compliance,
    high_availability: highAvailability,
  });

  const warnings = uniqueWarnings(
    stateRegistry.warnings,
    compliance.warnings,
    highAvailability.warnings,
    eventHistory.warnings,
    governanceHistory.warnings,
    resolved.decision !== "MAINTAIN"
      ? [`enterprise_runtime_resilience_${resolved.reason}`]
      : [],
  );

  return {
    ok:
      resolved.decision !== "FAILOVER" &&
      resolved.state !== "critical",

    evaluated_at: evaluatedAt,

    scope,

    state: resolved.state,
    decision: resolved.decision,
    reason: resolved.reason,
    actions: resolved.actions,

    resilience_score: resilienceScore,

    state_registry: stateRegistry,
    compliance,
    high_availability: highAvailability,
    event_history: eventHistory,
    governance_history: governanceHistory,

    warnings,
    error:
      resolved.decision === "FAILOVER" || resolved.state === "critical"
        ? `enterprise_runtime_resilience_${resolved.reason}`
        : null,
  };
}

/* ============================================================================
 * 5. EXPLICIT MUTATION — OPTIONAL EVENT EMISSION
 * ========================================================================== */

export async function emitEnterpriseRuntimeResilienceEvent(
  snapshot: EnterpriseRuntimeResilienceSnapshot,
): Promise<EnterpriseRuntimeResilienceMutationResult> {
  const emittedAt = nowIso();

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      snapshot.decision === "FAILOVER"
        ? "critical"
        : snapshot.decision === "PROTECT" ||
            snapshot.decision === "RECOVER"
          ? "high"
          : snapshot.decision === "WATCH"
            ? "normal"
            : "low",
    payload: {
      resilience_scope: snapshot.scope,
      resilience_state: snapshot.state,
      resilience_decision: snapshot.decision,
      resilience_reason: snapshot.reason,
      resilience_score: snapshot.resilience_score,
      operational_state: snapshot.state_registry.operational_state,
      compliance_state: snapshot.compliance.state,
      high_availability_state: snapshot.high_availability.state,
    },
    warnings:
      snapshot.decision === "MAINTAIN"
        ? []
        : [`enterprise_runtime_resilience_${snapshot.reason}`],
  });

  return {
    ok: true,
    emitted_at: emittedAt,
    snapshot,
    warnings: ["enterprise_runtime_resilience_event_emitted"],
    error: null,
  };
}

/* ============================================================================
 * 6. READERS — PURE OBSERVE
 * ========================================================================== */

export async function getEnterpriseRuntimeResilienceState(): Promise<EnterpriseRuntimeResilienceState> {
  const snapshot = await buildEnterpriseRuntimeResilienceCore();

  return snapshot.state;
}

export async function getEnterpriseRuntimeResilienceScore(): Promise<number> {
  const snapshot = await buildEnterpriseRuntimeResilienceCore();

  return snapshot.resilience_score;
}

export async function isEnterpriseRuntimeResilient(): Promise<boolean> {
  const snapshot = await buildEnterpriseRuntimeResilienceCore();

  return snapshot.ok && snapshot.state === "resilient";
}
