/* ============================================================================
 * FILE: lib/xyvala/runtime/audit/operational-runtime-audit-core.ts
 * ========================================================================== */

import {
  createAuditLog,
  type AuditLogRecord,
} from "@/lib/xyvala/runtime/audit-log-store";

import {
  buildRuntimeStateRegistry,
  type RuntimeStateRegistrySnapshot,
} from "@/lib/xyvala/runtime/registry/runtime-state-registry";

import {
  buildRuntimeGovernanceRegistry,
  type RuntimeGovernanceRegistrySnapshot,
} from "@/lib/xyvala/runtime/registry/runtime-governance-registry";

import { publishRuntimeEvent } from "@/lib/xyvala/runtime/events/event-bus";

export type OperationalRuntimeAuditKind =
  | "runtime_state_audit"
  | "runtime_governance_audit"
  | "runtime_transition_audit"
  | "runtime_anomaly_audit";

export type OperationalRuntimeAuditSnapshot = {
  ok: boolean;
  audited_at: string;
  kind: OperationalRuntimeAuditKind;

  state: RuntimeStateRegistrySnapshot;
  governance: RuntimeGovernanceRegistrySnapshot;

  audit_log: AuditLogRecord;

  warnings: string[];
  error: string | null;
};

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

function resolveAuditKind(input: {
  state: RuntimeStateRegistrySnapshot;
  governance: RuntimeGovernanceRegistrySnapshot;
}): OperationalRuntimeAuditKind {
  if (
    input.state.operational_state === "blocked" ||
    input.state.operational_state === "failover" ||
    input.governance.state === "blocked"
  ) {
    return "runtime_anomaly_audit";
  }

  if (
    input.state.operational_state === "protected" ||
    input.state.operational_state === "degraded" ||
    input.governance.state === "protected"
  ) {
    return "runtime_transition_audit";
  }

  if (input.governance.state !== "consistent") {
    return "runtime_governance_audit";
  }

  return "runtime_state_audit";
}

export async function buildOperationalRuntimeAuditCore(): Promise<OperationalRuntimeAuditSnapshot> {
  const auditedAt = nowIso();

  const [state, governance] = await Promise.all([
    buildRuntimeStateRegistry(),
    buildRuntimeGovernanceRegistry(),
  ]);

  const kind = resolveAuditKind({
    state,
    governance,
  });

  const warnings = uniqueWarnings(
    state.warnings,
    governance.warnings,
    kind !== "runtime_state_audit" ? [`operational_runtime_audit_${kind}`] : [],
  );

  const auditLog = createAuditLog({
    domain: "runtime",
    level:
      kind === "runtime_anomaly_audit"
        ? "error"
        : kind === "runtime_transition_audit"
          ? "warn"
          : "info",
    event: kind,
    source: "operational_runtime_audit_core",
    message: `Operational runtime audit recorded: ${kind}.`,
    metadata: {
      operational_state: state.operational_state,
      lifecycle_state: state.lifecycle_state,
      governance_state: governance.state,
      governance_reason: governance.reason,
      can_read: governance.can_read,
      can_write: governance.can_write,
      can_admin: governance.can_admin,
    },
    warnings,
  });

  await publishRuntimeEvent({
    kind: "audit_recorded",
    priority: kind === "runtime_anomaly_audit" ? "high" : "normal",
    payload: {
      audit_kind: kind,
      operational_state: state.operational_state,
      lifecycle_state: state.lifecycle_state,
      governance_state: governance.state,
    },
    warnings,
  });

  return {
    ok: kind !== "runtime_anomaly_audit",
    audited_at: auditedAt,
    kind,

    state,
    governance,

    audit_log: auditLog,

    warnings,
    error:
      kind === "runtime_anomaly_audit"
        ? "operational_runtime_audit_anomaly_detected"
        : null,
  };
}

export async function isOperationalRuntimeAuditHealthy(): Promise<boolean> {
  const audit = await buildOperationalRuntimeAuditCore();

  return audit.ok;
}
