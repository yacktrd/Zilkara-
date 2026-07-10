/* ============================================================================
 * FILE: lib/xyvala/runtime/anomalies/runtime-governance-anomaly-registry.ts
 * ========================================================================== */

import {
  buildRuntimeContractIntegrityCore,
  type RuntimeContractIntegritySnapshot,
  type RuntimeContractIntegrityViolation,
} from "@/lib/xyvala/runtime/integrity/runtime-contract-integrity-core";

import {
  buildRuntimeGovernanceReplayCore,
  type RuntimeReplaySnapshot,
} from "@/lib/xyvala/runtime/replay/runtime-governance-replay-core";

import {
  buildRuntimeGovernanceRecoveryHistory,
  type RuntimeRecoveryHistorySnapshot,
} from "@/lib/xyvala/runtime/history/runtime-governance-recovery-history";

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

export type RuntimeGovernanceAnomalySeverity =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type RuntimeGovernanceAnomalyState =
  | "clear"
  | "watch"
  | "anomalous"
  | "critical"
  | "unknown";

export type RuntimeGovernanceAnomalyKind =
  | "contract_integrity"
  | "compliance"
  | "replay_divergence"
  | "recovery_failure"
  | "failover_detected"
  | "blocked_runtime"
  | "unknown";

export type RuntimeGovernanceAnomalyRecord = {
  id: string;
  kind: RuntimeGovernanceAnomalyKind;
  severity: RuntimeGovernanceAnomalySeverity;

  source: string;
  message: string;

  metadata: Record<string, string | number | boolean | null>;
  warnings: string[];
};

export type RuntimeGovernanceAnomalySnapshot = {
  ok: boolean;
  generated_at: string;

  scope: RuntimeMutationScope;

  state: RuntimeGovernanceAnomalyState;

  anomalies: RuntimeGovernanceAnomalyRecord[];

  total_anomalies: number;
  low_anomalies: number;
  medium_anomalies: number;
  high_anomalies: number;
  critical_anomalies: number;

  integrity: RuntimeContractIntegritySnapshot;
  compliance: RuntimeComplianceSnapshot;
  replay: RuntimeReplaySnapshot;
  recovery_history: RuntimeRecoveryHistorySnapshot;

  warnings: string[];
  error: string | null;
};

export type RuntimeGovernanceAnomalyMutationResult = {
  ok: boolean;
  emitted_at: string;
  snapshot: RuntimeGovernanceAnomalySnapshot;
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

function buildAnomalyId(input: {
  kind: RuntimeGovernanceAnomalyKind;
  source: string;
  message: string;
}): string {
  const seed = `${input.kind}:${input.source}:${input.message}`;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return `runtime_anomaly_${hash.toString(36)}`;
}

function anomaly(
  input: Omit<RuntimeGovernanceAnomalyRecord, "id">,
): RuntimeGovernanceAnomalyRecord {
  return {
    id: buildAnomalyId({
      kind: input.kind,
      source: input.source,
      message: input.message,
    }),
    kind: input.kind,
    severity: input.severity,
    source: input.source,
    message: input.message,
    metadata: input.metadata,
    warnings: uniqueWarnings(input.warnings),
  };
}

function mapIntegrityViolation(
  item: RuntimeContractIntegrityViolation,
): RuntimeGovernanceAnomalyRecord {
  return anomaly({
    kind: "contract_integrity",
    severity: item.severity,
    source: "runtime_contract_integrity_core",
    message: item.message,
    metadata: {
      violation_key: item.key,
    },
    warnings: [item.key],
  });
}

function resolveAnomalyState(
  anomalies: RuntimeGovernanceAnomalyRecord[],
): RuntimeGovernanceAnomalyState {
  if (anomalies.some((item) => item.severity === "critical")) {
    return "critical";
  }

  if (anomalies.some((item) => item.severity === "high")) {
    return "anomalous";
  }

  if (anomalies.length > 0) {
    return "watch";
  }

  return "clear";
}

/* ============================================================================
 * 3. ANOMALY DETECTION — PURE COMPUTE
 * ========================================================================== */

function detectRuntimeAnomalies(input: {
  integrity: RuntimeContractIntegritySnapshot;
  compliance: RuntimeComplianceSnapshot;
  replay: RuntimeReplaySnapshot;
  recovery_history: RuntimeRecoveryHistorySnapshot;
}): RuntimeGovernanceAnomalyRecord[] {
  const anomalies: RuntimeGovernanceAnomalyRecord[] = [];

  anomalies.push(...input.integrity.violations.map(mapIntegrityViolation));

  if (!input.compliance.ok) {
    anomalies.push(
      anomaly({
        kind: "compliance",
        severity:
          input.compliance.state === "blocked" ||
          input.compliance.state === "non_compliant"
            ? "critical"
            : "high",
        source: "runtime_compliance_core",
        message: `Runtime compliance anomaly detected: ${input.compliance.reason}.`,
        metadata: {
          compliance_state: input.compliance.state,
          compliance_reason: input.compliance.reason,
          violations: input.compliance.violations.length,
        },
        warnings: input.compliance.warnings,
      }),
    );
  }

  if (input.replay.state === "divergent") {
    anomalies.push(
      anomaly({
        kind: "replay_divergence",
        severity: "critical",
        source: "runtime_governance_replay_core",
        message: "Runtime replay divergence detected.",
        metadata: {
          replay_state: input.replay.state,
          replay_reason: input.replay.reason,
          replay_events: input.replay.total_events,
        },
        warnings: input.replay.warnings,
      }),
    );
  }

  if (input.replay.state === "partial" || input.replay.state === "unknown") {
    anomalies.push(
      anomaly({
        kind: "replay_divergence",
        severity: "medium",
        source: "runtime_governance_replay_core",
        message: `Runtime replay incomplete or uncertain: ${input.replay.reason}.`,
        metadata: {
          replay_state: input.replay.state,
          replay_reason: input.replay.reason,
          replay_events: input.replay.total_events,
        },
        warnings: input.replay.warnings,
      }),
    );
  }

  if (input.recovery_history.failover_records > 0) {
    anomalies.push(
      anomaly({
        kind: "failover_detected",
        severity: "critical",
        source: "runtime_governance_recovery_history",
        message: "Runtime failover sequence detected in recovery history.",
        metadata: {
          failover_records: input.recovery_history.failover_records,
          blocked_records: input.recovery_history.blocked_records,
        },
        warnings: input.recovery_history.warnings,
      }),
    );
  }

  if (input.recovery_history.blocked_records > 0) {
    anomalies.push(
      anomaly({
        kind: "blocked_runtime",
        severity: "critical",
        source: "runtime_governance_recovery_history",
        message: "Blocked runtime sequence detected in recovery history.",
        metadata: {
          blocked_records: input.recovery_history.blocked_records,
        },
        warnings: input.recovery_history.warnings,
      }),
    );
  }

  if (input.recovery_history.state === "partial") {
    anomalies.push(
      anomaly({
        kind: "recovery_failure",
        severity: "medium",
        source: "runtime_governance_recovery_history",
        message: "Runtime recovery history is partial.",
        metadata: {
          recovery_history_state: input.recovery_history.state,
          total_records: input.recovery_history.total_records,
        },
        warnings: input.recovery_history.warnings,
      }),
    );
  }

  return anomalies;
}

/* ============================================================================
 * 4. REGISTRY — PURE COMPUTE / SNAPSHOT
 * ========================================================================== */

export async function buildRuntimeGovernanceAnomalyRegistry(input: {
  scope?: RuntimeMutationScope;
  limit?: number | null;
} = {}): Promise<RuntimeGovernanceAnomalySnapshot> {
  const generatedAt = nowIso();
  const scope = input.scope ?? "read";

  const [integrity, compliance, replay, recoveryHistory] = await Promise.all([
    buildRuntimeContractIntegrityCore({ scope }),
    buildRuntimeComplianceCore({ scope }),
    buildRuntimeGovernanceReplayCore({
      scope,
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    }),
    buildRuntimeGovernanceRecoveryHistory({
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    }),
  ]);

  const anomalies = detectRuntimeAnomalies({
    integrity,
    compliance,
    replay,
    recovery_history: recoveryHistory,
  });

  const state = resolveAnomalyState(anomalies);

  const warnings = uniqueWarnings(
    integrity.warnings,
    compliance.warnings,
    replay.warnings,
    recoveryHistory.warnings,
    anomalies.flatMap((item) => item.warnings),
    state !== "clear" ? [`runtime_governance_anomaly_registry_${state}`] : [],
  );

  return {
    ok: state !== "critical" && state !== "anomalous",
    generated_at: generatedAt,

    scope,

    state,

    anomalies,

    total_anomalies: anomalies.length,
    low_anomalies: anomalies.filter((item) => item.severity === "low").length,
    medium_anomalies: anomalies.filter((item) => item.severity === "medium")
      .length,
    high_anomalies: anomalies.filter((item) => item.severity === "high")
      .length,
    critical_anomalies: anomalies.filter(
      (item) => item.severity === "critical",
    ).length,

    integrity,
    compliance,
    replay,
    recovery_history: recoveryHistory,

    warnings,
    error:
      state === "critical" || state === "anomalous"
        ? `runtime_governance_anomaly_registry_${state}`
        : null,
  };
}

/* ============================================================================
 * 5. EXPLICIT MUTATION — OPTIONAL EVENT EMISSION
 * ========================================================================== */

export async function emitRuntimeGovernanceAnomalyEvent(
  snapshot: RuntimeGovernanceAnomalySnapshot,
): Promise<RuntimeGovernanceAnomalyMutationResult> {
  const emittedAt = nowIso();

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority:
      snapshot.state === "critical"
        ? "critical"
        : snapshot.state === "anomalous"
          ? "high"
          : snapshot.state === "watch"
            ? "normal"
            : "low",
    payload: {
      anomaly_scope: snapshot.scope,
      anomaly_state: snapshot.state,
      total_anomalies: snapshot.total_anomalies,
      critical_anomalies: snapshot.critical_anomalies,
      high_anomalies: snapshot.high_anomalies,
      medium_anomalies: snapshot.medium_anomalies,
      low_anomalies: snapshot.low_anomalies,
    },
    warnings:
      snapshot.state === "clear"
        ? []
        : [`runtime_governance_anomaly_registry_${snapshot.state}`],
  });

  return {
    ok: true,
    emitted_at: emittedAt,
    snapshot,
    warnings: ["runtime_governance_anomaly_event_emitted"],
    error: null,
  };
}

/* ============================================================================
 * 6. READERS — PURE OBSERVE
 * ========================================================================== */

export async function getRuntimeGovernanceAnomalyState(): Promise<RuntimeGovernanceAnomalyState> {
  const snapshot = await buildRuntimeGovernanceAnomalyRegistry();

  return snapshot.state;
}

export async function listRuntimeGovernanceAnomalies(): Promise<
  RuntimeGovernanceAnomalyRecord[]
> {
  const snapshot = await buildRuntimeGovernanceAnomalyRegistry();

  return snapshot.anomalies;
}

export async function isRuntimeGovernanceAnomalyClear(): Promise<boolean> {
  const snapshot = await buildRuntimeGovernanceAnomalyRegistry();

  return snapshot.ok && snapshot.state === "clear";
}
