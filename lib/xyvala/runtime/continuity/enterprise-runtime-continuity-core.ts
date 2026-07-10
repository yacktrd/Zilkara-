/* ============================================================================
 * FILE: lib/xyvala/runtime/continuity/enterprise-runtime-continuity-core.ts
 * ========================================================================== */

import {
  buildRuntimeChaosValidationCore,
  type RuntimeChaosValidationSnapshot,
} from "@/lib/xyvala/runtime/chaos/runtime-chaos-validation-core";

import {
  buildRuntimeDisasterRecoveryCore,
  type RuntimeDisasterRecoverySnapshot,
} from "@/lib/xyvala/runtime/recovery/runtime-disaster-recovery-core";

import {
  buildEnterpriseRuntimeResilienceCore,
  type EnterpriseRuntimeResilienceSnapshot,
} from "@/lib/xyvala/runtime/resilience/enterprise-runtime-resilience-core";

import {
  buildRuntimeRuntimeConsistencyCore,
  type RuntimeConsistencySnapshot,
} from "@/lib/xyvala/runtime/consistency/runtime-runtime-consistency-core";

import {
  publishRuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

import type {
  RuntimeMutationScope,
} from "@/lib/xyvala/runtime/policies/production-runtime-policy-engine";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type EnterpriseRuntimeContinuityState =
  | "continuous"
  | "watch"
  | "degraded"
  | "protected"
  | "interrupted"
  | "unknown";

export type EnterpriseRuntimeContinuityDecision =
  | "MAINTAIN"
  | "WATCH"
  | "DEGRADE"
  | "PROTECT"
  | "RECOVER"
  | "INTERRUPT";

export type EnterpriseRuntimeContinuityReason =
  | "runtime_continuity_valid"
  | "runtime_continuity_watch"
  | "runtime_continuity_degraded"
  | "runtime_continuity_protected"
  | "runtime_continuity_recovery_required"
  | "runtime_continuity_interrupted"
  | "runtime_continuity_unknown";

export type EnterpriseRuntimeContinuityAction =
  | "observe"
  | "emit_warning"
  | "enter_degraded_continuity"
  | "protect_runtime"
  | "request_recovery"
  | "interrupt_non_critical_runtime";

export type EnterpriseRuntimeContinuitySnapshot = {
  ok: boolean;
  evaluated_at: string;

  scope: RuntimeMutationScope;

  state: EnterpriseRuntimeContinuityState;
  decision: EnterpriseRuntimeContinuityDecision;
  reason: EnterpriseRuntimeContinuityReason;
  actions: EnterpriseRuntimeContinuityAction[];

  continuity_score: number;

  chaos: RuntimeChaosValidationSnapshot;
  disaster_recovery: RuntimeDisasterRecoverySnapshot;
  resilience: EnterpriseRuntimeResilienceSnapshot;
  consistency: RuntimeConsistencySnapshot;

  warnings: string[];
  error: string | null;
};

export type EnterpriseRuntimeContinuityMutationResult = {
  ok: boolean;
  emitted_at: string;
  snapshot: EnterpriseRuntimeContinuitySnapshot;
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
 * 3. CONTINUITY SCORING
 * ========================================================================== */

function computeContinuityScore(input: {
  chaos: RuntimeChaosValidationSnapshot;
  disaster_recovery: RuntimeDisasterRecoverySnapshot;
  resilience: EnterpriseRuntimeResilienceSnapshot;
  consistency: RuntimeConsistencySnapshot;
}): number {
  let score = 100;

  if (!input.chaos.ok) score -= 20;
  if (!input.disaster_recovery.ok) score -= 30;
  if (!input.resilience.ok) score -= 25;
  if (!input.consistency.ok) score -= 25;

  if (input.chaos.state === "failed") score -= 30;
  if (input.chaos.state === "weak") score -= 20;
  if (input.chaos.state === "watch") score -= 10;

  if (input.disaster_recovery.state === "disaster") score -= 40;
  if (input.disaster_recovery.state === "blocked") score -= 35;
  if (input.disaster_recovery.state === "degraded_recovery") score -= 20;
  if (input.disaster_recovery.state === "recoverable") score -= 10;

  if (input.resilience.state === "critical") score -= 35;
  if (input.resilience.state === "fragile") score -= 20;
  if (input.resilience.state === "tolerant") score -= 8;

  if (input.consistency.state === "broken") score -= 40;
  if (input.consistency.state === "divergent") score -= 30;
  if (input.consistency.state === "watch") score -= 10;

  return clampScore(score);
}

/* ============================================================================
 * 4. RESOLUTION
 * ========================================================================== */

function resolveContinuity(input: {
  score: number;
  chaos: RuntimeChaosValidationSnapshot;
  disaster_recovery: RuntimeDisasterRecoverySnapshot;
  resilience: EnterpriseRuntimeResilienceSnapshot;
  consistency: RuntimeConsistencySnapshot;
}): {
  state: EnterpriseRuntimeContinuityState;
  decision: EnterpriseRuntimeContinuityDecision;
  reason: EnterpriseRuntimeContinuityReason;
  actions: EnterpriseRuntimeContinuityAction[];
} {
  if (
    input.disaster_recovery.decision === "DISASTER_RECOVERY" ||
    input.disaster_recovery.decision === "BLOCK" ||
    input.consistency.state === "broken" ||
    input.chaos.decision === "FAIL"
  ) {
    return {
      state: "interrupted",
      decision: "INTERRUPT",
      reason: "runtime_continuity_interrupted",
      actions: ["interrupt_non_critical_runtime", "emit_warning"],
    };
  }

  if (
    input.disaster_recovery.decision === "RECOVER" ||
    input.resilience.decision === "RECOVER"
  ) {
    return {
      state: "protected",
      decision: "RECOVER",
      reason: "runtime_continuity_recovery_required",
      actions: ["request_recovery", "protect_runtime", "emit_warning"],
    };
  }

  if (
    input.chaos.decision === "HARDEN" ||
    input.resilience.decision === "PROTECT" ||
    input.consistency.state === "divergent"
  ) {
    return {
      state: "protected",
      decision: "PROTECT",
      reason: "runtime_continuity_protected",
      actions: ["protect_runtime", "emit_warning"],
    };
  }

  if (
    input.disaster_recovery.decision === "DEGRADED_RECOVERY" ||
    input.resilience.state === "fragile" ||
    input.consistency.state === "watch" ||
    input.score < 60
  ) {
    return {
      state: "degraded",
      decision: "DEGRADE",
      reason: "runtime_continuity_degraded",
      actions: ["enter_degraded_continuity", "emit_warning"],
    };
  }

  if (
    input.chaos.decision === "WATCH" ||
    input.resilience.state === "tolerant" ||
    input.score < 80
  ) {
    return {
      state: "watch",
      decision: "WATCH",
      reason: "runtime_continuity_watch",
      actions: ["observe", "emit_warning"],
    };
  }

  if (
    input.chaos.decision === "ACCEPT" &&
    input.disaster_recovery.decision === "MAINTAIN" &&
    input.resilience.decision === "MAINTAIN" &&
    input.consistency.state === "consistent" &&
    input.score >= 80
  ) {
    return {
      state: "continuous",
      decision: "MAINTAIN",
      reason: "runtime_continuity_valid",
      actions: ["observe"],
    };
  }

  return {
    state: "unknown",
    decision: "WATCH",
    reason: "runtime_continuity_unknown",
    actions: ["observe", "emit_warning"],
  };
}

/* ============================================================================
 * 5. CONTINUITY CORE — PURE COMPUTE / VALIDATION
 * ========================================================================== */

export async function buildEnterpriseRuntimeContinuityCore(input: {
  scope?: RuntimeMutationScope;
  limit?: number | null;
} = {}): Promise<EnterpriseRuntimeContinuitySnapshot> {
  const evaluatedAt = nowIso();
  const scope = input.scope ?? "read";

  const [chaos, disasterRecovery, resilience, consistency] = await Promise.all([
    buildRuntimeChaosValidationCore({
      scope,
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    }),
    buildRuntimeDisasterRecoveryCore({
      scope,
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    }),
    buildEnterpriseRuntimeResilienceCore({ scope }),
    buildRuntimeRuntimeConsistencyCore({
      scope,
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    }),
  ]);

  const continuityScore = computeContinuityScore({
    chaos,
    disaster_recovery: disasterRecovery,
    resilience,
    consistency,
  });

  const resolved = resolveContinuity({
    score: continuityScore,
    chaos,
    disaster_recovery: disasterRecovery,
    resilience,
    consistency,
  });

  const warnings = uniqueWarnings(
    chaos.warnings,
    disasterRecovery.warnings,
    resilience.warnings,
    consistency.warnings,
    resolved.decision !== "MAINTAIN"
      ? [`enterprise_runtime_continuity_${resolved.reason}`]
      : [],
  );

  return {
    ok:
      resolved.decision !== "INTERRUPT" &&
      resolved.state !== "interrupted",

    evaluated_at: evaluatedAt,

    scope,

    state: resolved.state,
    decision: resolved.decision,
    reason: resolved.reason,
    actions: resolved.actions,

    continuity_score: continuityScore,

    chaos,
    disaster_recovery: disasterRecovery,
    resilience,
    consistency,

    warnings,
    error:
      resolved.decision === "INTERRUPT" ||
      resolved.state === "interrupted"
        ? `enterprise_runtime_continuity_${resolved.reason}`
        : null,
  };
}

/* ============================================================================
 * 6. EXPLICIT MUTATION — OPTIONAL EVENT EMISSION
 * ========================================================================== */

export async function emitEnterpriseRuntimeContinuityEvent(
  snapshot: EnterpriseRuntimeContinuitySnapshot,
): Promise<EnterpriseRuntimeContinuityMutationResult> {
  const emittedAt = nowIso();

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      snapshot.decision === "INTERRUPT"
        ? "critical"
        : snapshot.decision === "PROTECT" ||
            snapshot.decision === "RECOVER" ||
            snapshot.decision === "DEGRADE"
          ? "high"
          : snapshot.decision === "WATCH"
            ? "normal"
            : "low",
    payload: {
      continuity_scope: snapshot.scope,
      continuity_state: snapshot.state,
      continuity_decision: snapshot.decision,
      continuity_reason: snapshot.reason,
      continuity_score: snapshot.continuity_score,
      chaos_state: snapshot.chaos.state,
      disaster_recovery_state: snapshot.disaster_recovery.state,
      resilience_state: snapshot.resilience.state,
      consistency_state: snapshot.consistency.state,
    },
    warnings:
      snapshot.decision === "MAINTAIN"
        ? []
        : [`enterprise_runtime_continuity_${snapshot.reason}`],
  });

  return {
    ok: true,
    emitted_at: emittedAt,
    snapshot,
    warnings: ["enterprise_runtime_continuity_event_emitted"],
    error: null,
  };
}

/* ============================================================================
 * 7. READERS — PURE OBSERVE
 * ========================================================================== */

export async function getEnterpriseRuntimeContinuityState(): Promise<EnterpriseRuntimeContinuityState> {
  const snapshot = await buildEnterpriseRuntimeContinuityCore();

  return snapshot.state;
}

export async function getEnterpriseRuntimeContinuityScore(): Promise<number> {
  const snapshot = await buildEnterpriseRuntimeContinuityCore();

  return snapshot.continuity_score;
}

export async function isEnterpriseRuntimeContinuityValid(): Promise<boolean> {
  const snapshot = await buildEnterpriseRuntimeContinuityCore();

  return snapshot.ok && snapshot.state === "continuous";
}
