/* ============================================================================
 * FILE: lib/xyvala/runtime/simulation/runtime-governance-simulation-core.ts
 * ========================================================================== */

import {
  buildEnterpriseRuntimeContinuityCore,
  type EnterpriseRuntimeContinuitySnapshot,
} from "@/lib/xyvala/runtime/continuity/enterprise-runtime-continuity-core";

import {
  buildRuntimeChaosValidationCore,
  type RuntimeChaosScenario,
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
  publishRuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

import type {
  RuntimeMutationScope,
} from "@/lib/xyvala/runtime/policies/production-runtime-policy-engine";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RuntimeGovernanceSimulationScenario =
  | "normal_continuity"
  | "degraded_runtime"
  | "failover_escalation"
  | "recovery_path"
  | "anomaly_propagation"
  | "resilience_pressure"
  | "continuity_interruption";

export type RuntimeGovernanceSimulationState =
  | "valid"
  | "watch"
  | "degraded"
  | "failed"
  | "unknown";

export type RuntimeGovernanceSimulationDecision =
  | "ACCEPT"
  | "WATCH"
  | "HARDEN"
  | "REJECT";

export type RuntimeGovernanceSimulationReason =
  | "runtime_simulation_valid"
  | "runtime_simulation_watch"
  | "runtime_simulation_degraded"
  | "runtime_simulation_failover_risk"
  | "runtime_simulation_continuity_interrupted"
  | "runtime_simulation_unknown";

export type RuntimeGovernanceSimulationStep = {
  order: number;
  key: string;
  state: RuntimeGovernanceSimulationState;
  message: string;
  warnings: string[];
};

export type RuntimeGovernanceSimulationSnapshot = {
  ok: boolean;
  simulated_at: string;

  scope: RuntimeMutationScope;
  scenario: RuntimeGovernanceSimulationScenario;
  chaos_scenario: RuntimeChaosScenario;

  state: RuntimeGovernanceSimulationState;
  decision: RuntimeGovernanceSimulationDecision;
  reason: RuntimeGovernanceSimulationReason;

  simulation_score: number;

  continuity: EnterpriseRuntimeContinuitySnapshot;
  chaos: RuntimeChaosValidationSnapshot;
  disaster_recovery: RuntimeDisasterRecoverySnapshot;
  resilience: EnterpriseRuntimeResilienceSnapshot;

  steps: RuntimeGovernanceSimulationStep[];

  warnings: string[];
  error: string | null;
};

export type RuntimeGovernanceSimulationMutationResult = {
  ok: boolean;
  emitted_at: string;
  snapshot: RuntimeGovernanceSimulationSnapshot;
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

function mapScenarioToChaos(
  scenario: RuntimeGovernanceSimulationScenario,
): RuntimeChaosScenario {
  if (scenario === "failover_escalation") return "failover_pressure";
  if (scenario === "recovery_path") return "recovery_pressure";
  if (scenario === "anomaly_propagation") return "governance_divergence";
  if (scenario === "resilience_pressure") return "node_degradation";
  if (scenario === "continuity_interruption") return "queue_pressure";
  if (scenario === "degraded_runtime") return "redis_unavailable";

  return "governance_divergence";
}

function step(
  input: RuntimeGovernanceSimulationStep,
): RuntimeGovernanceSimulationStep {
  return {
    order: input.order,
    key: input.key,
    state: input.state,
    message: input.message,
    warnings: uniqueWarnings(input.warnings),
  };
}

/* ============================================================================
 * 3. SIMULATION SCORING
 * ========================================================================== */

function computeSimulationScore(input: {
  continuity: EnterpriseRuntimeContinuitySnapshot;
  chaos: RuntimeChaosValidationSnapshot;
  disaster_recovery: RuntimeDisasterRecoverySnapshot;
  resilience: EnterpriseRuntimeResilienceSnapshot;
}): number {
  let score = 100;

  if (!input.continuity.ok) score -= 35;
  if (!input.chaos.ok) score -= 25;
  if (!input.disaster_recovery.ok) score -= 25;
  if (!input.resilience.ok) score -= 20;

  if (input.continuity.state === "interrupted") score -= 40;
  if (input.continuity.state === "protected") score -= 20;
  if (input.continuity.state === "degraded") score -= 15;
  if (input.continuity.state === "watch") score -= 8;

  if (input.chaos.state === "failed") score -= 30;
  if (input.chaos.state === "weak") score -= 18;
  if (input.chaos.state === "watch") score -= 8;

  if (input.disaster_recovery.state === "disaster") score -= 35;
  if (input.disaster_recovery.state === "blocked") score -= 30;
  if (input.disaster_recovery.state === "degraded_recovery") score -= 15;

  if (input.resilience.state === "critical") score -= 30;
  if (input.resilience.state === "fragile") score -= 18;
  if (input.resilience.state === "tolerant") score -= 8;

  return clampScore(score);
}

/* ============================================================================
 * 4. STEP BUILDER
 * ========================================================================== */

function buildSimulationSteps(input: {
  continuity: EnterpriseRuntimeContinuitySnapshot;
  chaos: RuntimeChaosValidationSnapshot;
  disaster_recovery: RuntimeDisasterRecoverySnapshot;
  resilience: EnterpriseRuntimeResilienceSnapshot;
}): RuntimeGovernanceSimulationStep[] {
  return [
    step({
      order: 1,
      key: "continuity",
      state: input.continuity.ok
        ? input.continuity.state === "continuous"
          ? "valid"
          : "watch"
        : "failed",
      message: `Continuity state: ${input.continuity.state}.`,
      warnings: input.continuity.warnings,
    }),
    step({
      order: 2,
      key: "chaos_validation",
      state:
        input.chaos.state === "passed"
          ? "valid"
          : input.chaos.state === "watch"
            ? "watch"
            : input.chaos.state === "weak"
              ? "degraded"
              : input.chaos.state === "failed"
                ? "failed"
                : "unknown",
      message: `Chaos validation state: ${input.chaos.state}.`,
      warnings: input.chaos.warnings,
    }),
    step({
      order: 3,
      key: "disaster_recovery",
      state: input.disaster_recovery.ok
        ? input.disaster_recovery.state === "stable"
          ? "valid"
          : "watch"
        : "failed",
      message: `Disaster recovery state: ${input.disaster_recovery.state}.`,
      warnings: input.disaster_recovery.warnings,
    }),
    step({
      order: 4,
      key: "resilience",
      state:
        input.resilience.state === "resilient"
          ? "valid"
          : input.resilience.state === "tolerant"
            ? "watch"
            : input.resilience.state === "fragile"
              ? "degraded"
              : input.resilience.state === "critical"
                ? "failed"
                : "unknown",
      message: `Resilience state: ${input.resilience.state}.`,
      warnings: input.resilience.warnings,
    }),
  ];
}

/* ============================================================================
 * 5. RESOLUTION
 * ========================================================================== */

function resolveSimulation(input: {
  score: number;
  continuity: EnterpriseRuntimeContinuitySnapshot;
  chaos: RuntimeChaosValidationSnapshot;
  disaster_recovery: RuntimeDisasterRecoverySnapshot;
  resilience: EnterpriseRuntimeResilienceSnapshot;
}): {
  state: RuntimeGovernanceSimulationState;
  decision: RuntimeGovernanceSimulationDecision;
  reason: RuntimeGovernanceSimulationReason;
} {
  if (
    input.continuity.state === "interrupted" ||
    input.continuity.decision === "INTERRUPT"
  ) {
    return {
      state: "failed",
      decision: "REJECT",
      reason: "runtime_simulation_continuity_interrupted",
    };
  }

  if (
    input.disaster_recovery.decision === "DISASTER_RECOVERY" ||
    input.disaster_recovery.decision === "BLOCK" ||
    input.chaos.decision === "FAIL"
  ) {
    return {
      state: "failed",
      decision: "REJECT",
      reason: "runtime_simulation_failover_risk",
    };
  }

  if (
    input.chaos.decision === "HARDEN" ||
    input.resilience.state === "fragile" ||
    input.score < 60
  ) {
    return {
      state: "degraded",
      decision: "HARDEN",
      reason: "runtime_simulation_degraded",
    };
  }

  if (
    input.continuity.state === "watch" ||
    input.chaos.state === "watch" ||
    input.resilience.state === "tolerant" ||
    input.score < 80
  ) {
    return {
      state: "watch",
      decision: "WATCH",
      reason: "runtime_simulation_watch",
    };
  }

  if (
    input.continuity.state === "continuous" &&
    input.chaos.state === "passed" &&
    input.disaster_recovery.state === "stable" &&
    input.resilience.state === "resilient" &&
    input.score >= 80
  ) {
    return {
      state: "valid",
      decision: "ACCEPT",
      reason: "runtime_simulation_valid",
    };
  }

  return {
    state: "unknown",
    decision: "WATCH",
    reason: "runtime_simulation_unknown",
  };
}

/* ============================================================================
 * 6. SIMULATION CORE — PURE COMPUTE/SIMULATION
 * ========================================================================== */

export async function buildRuntimeGovernanceSimulationCore(input: {
  scope?: RuntimeMutationScope;
  scenario?: RuntimeGovernanceSimulationScenario;
  limit?: number | null;
} = {}): Promise<RuntimeGovernanceSimulationSnapshot> {
  const simulatedAt = nowIso();
  const scope = input.scope ?? "read";
  const scenario = input.scenario ?? "normal_continuity";
  const chaosScenario = mapScenarioToChaos(scenario);

  const [continuity, chaos, disasterRecovery, resilience] = await Promise.all([
    buildEnterpriseRuntimeContinuityCore({
      scope,
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    }),
    buildRuntimeChaosValidationCore({
      scope,
      scenario: chaosScenario,
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    }),
    buildRuntimeDisasterRecoveryCore({
      scope,
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    }),
    buildEnterpriseRuntimeResilienceCore({ scope }),
  ]);

  const simulationScore = computeSimulationScore({
    continuity,
    chaos,
    disaster_recovery: disasterRecovery,
    resilience,
  });

  const steps = buildSimulationSteps({
    continuity,
    chaos,
    disaster_recovery: disasterRecovery,
    resilience,
  });

  const resolved = resolveSimulation({
    score: simulationScore,
    continuity,
    chaos,
    disaster_recovery: disasterRecovery,
    resilience,
  });

  const warnings = uniqueWarnings(
    continuity.warnings,
    chaos.warnings,
    disasterRecovery.warnings,
    resilience.warnings,
    steps.flatMap((item) => item.warnings),
    resolved.decision !== "ACCEPT"
      ? [`runtime_governance_simulation_${resolved.reason}`]
      : [],
  );

  return {
    ok: resolved.decision === "ACCEPT" || resolved.decision === "WATCH",

    simulated_at: simulatedAt,

    scope,
    scenario,
    chaos_scenario: chaosScenario,

    state: resolved.state,
    decision: resolved.decision,
    reason: resolved.reason,

    simulation_score: simulationScore,

    continuity,
    chaos,
    disaster_recovery: disasterRecovery,
    resilience,

    steps,

    warnings,
    error:
      resolved.decision === "REJECT" || resolved.decision === "HARDEN"
        ? `runtime_governance_simulation_${resolved.reason}`
        : null,
  };
}

/* ============================================================================
 * 7. EXPLICIT MUTATION — OPTIONAL EVENT EMISSION
 * ========================================================================== */

export async function emitRuntimeGovernanceSimulationEvent(
  snapshot: RuntimeGovernanceSimulationSnapshot,
): Promise<RuntimeGovernanceSimulationMutationResult> {
  const emittedAt = nowIso();

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      snapshot.decision === "REJECT"
        ? "critical"
        : snapshot.decision === "HARDEN"
          ? "high"
          : snapshot.decision === "WATCH"
            ? "normal"
            : "low",
    payload: {
      simulation_scope: snapshot.scope,
      simulation_scenario: snapshot.scenario,
      chaos_scenario: snapshot.chaos_scenario,
      simulation_state: snapshot.state,
      simulation_decision: snapshot.decision,
      simulation_reason: snapshot.reason,
      simulation_score: snapshot.simulation_score,
      continuity_state: snapshot.continuity.state,
      chaos_state: snapshot.chaos.state,
      disaster_recovery_state: snapshot.disaster_recovery.state,
      resilience_state: snapshot.resilience.state,
    },
    warnings:
      snapshot.decision === "ACCEPT"
        ? []
        : [`runtime_governance_simulation_${snapshot.reason}`],
  });

  return {
    ok: true,
    emitted_at: emittedAt,
    snapshot,
    warnings: ["runtime_governance_simulation_event_emitted"],
    error: null,
  };
}

/* ============================================================================
 * 8. READERS — PURE OBSERVE
 * ========================================================================== */

export async function getRuntimeGovernanceSimulationState(): Promise<RuntimeGovernanceSimulationState> {
  const snapshot = await buildRuntimeGovernanceSimulationCore();

  return snapshot.state;
}

export async function getRuntimeGovernanceSimulationScore(): Promise<number> {
  const snapshot = await buildRuntimeGovernanceSimulationCore();

  return snapshot.simulation_score;
}

export async function isRuntimeGovernanceSimulationValid(): Promise<boolean> {
  const snapshot = await buildRuntimeGovernanceSimulationCore();

  return snapshot.ok && snapshot.state === "valid";
}
