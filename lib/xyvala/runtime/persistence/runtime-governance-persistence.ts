/* ============================================================================
 * FILE: lib/xyvala/runtime/persistence/runtime-governance-persistence.ts
 * ========================================================================== */

import {
  persistAnalyticsSnapshot,
} from "@/lib/xyvala/runtime/repositories/analytics-repository";

import {
  buildRuntimeStateRegistry,
} from "@/lib/xyvala/runtime/registry/runtime-state-registry";

import {
  buildRuntimeGovernanceRegistry,
} from "@/lib/xyvala/runtime/registry/runtime-governance-registry";

import {
  buildRuntimeComplianceCore,
} from "@/lib/xyvala/runtime/compliance/runtime-compliance-core";

import {
  buildDistributedRuntimeLifecycle,
} from "@/lib/xyvala/runtime/lifecycle/distributed-runtime-lifecycle";

import { publishRuntimeEvent } from "@/lib/xyvala/runtime/events/event-bus";

export type RuntimeGovernancePersistenceStatus =
  | "persisted"
  | "partial"
  | "failed";

export type RuntimeGovernancePersistenceResult = {
  ok: boolean;
  persisted_at: string;
  status: RuntimeGovernancePersistenceStatus;
  persisted_count: number;
  failed_count: number;
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

export async function persistRuntimeGovernanceSnapshot(): Promise<RuntimeGovernancePersistenceResult> {
  const persistedAt = nowIso();

  const [state, governance, compliance, lifecycle] = await Promise.all([
    buildRuntimeStateRegistry(),
    buildRuntimeGovernanceRegistry(),
    buildRuntimeComplianceCore(),
    buildDistributedRuntimeLifecycle(),
  ]);

  const snapshots = [
    {
      metric_key: "runtime_operational_state",
      metric_value: state.ok ? 1 : 0,
      metadata: {
        operational_state: state.operational_state,
        lifecycle_state: state.lifecycle_state,
        reason: state.reason,
      },
      warnings: state.warnings,
    },
    {
      metric_key: "runtime_governance_state",
      metric_value: governance.ok ? 1 : 0,
      metadata: {
        governance_state: governance.state,
        governance_reason: governance.reason,
      },
      warnings: governance.warnings,
    },
    {
      metric_key: "runtime_compliance_state",
      metric_value: compliance.ok ? 1 : 0,
      metadata: {
        compliance_state: compliance.state,
        compliance_reason: compliance.reason,
        violations: compliance.violations.length,
      },
      warnings: compliance.warnings,
    },
    {
      metric_key: "runtime_lifecycle_state",
      metric_value: lifecycle.ok ? 1 : 0,
      metadata: {
        lifecycle_decision: lifecycle.decision,
        lifecycle_reason: lifecycle.reason,
        operational_state: lifecycle.operational_state,
        lifecycle_state: lifecycle.lifecycle_state,
      },
      warnings: lifecycle.warnings,
    },
  ];

  let persistedCount = 0;
  let failedCount = 0;

  for (const snapshot of snapshots) {
    const record = await persistAnalyticsSnapshot({
      kind: "runtime",
      account_id: null,
      organization_id: null,
      api_key_id: null,
      metric_key: snapshot.metric_key,
      metric_value: snapshot.metric_value,
      bucket_start: persistedAt,
      bucket_end: persistedAt,
      metadata: snapshot.metadata,
      warnings: snapshot.warnings,
    });

    if (record) {
      persistedCount += 1;
    } else {
      failedCount += 1;
    }
  }

  const status: RuntimeGovernancePersistenceStatus =
    failedCount === 0 ? "persisted" : persistedCount > 0 ? "partial" : "failed";

  await publishRuntimeEvent({
    kind: "runtime_job_requested",
    priority: status === "failed" ? "critical" : status === "partial" ? "high" : "normal",
    payload: {
      runtime_governance_persistence_status: status,
      persisted_count: persistedCount,
      failed_count: failedCount,
    },
    warnings:
      status === "persisted"
        ? ["runtime_governance_snapshot_persisted"]
        : ["runtime_governance_snapshot_persistence_degraded"],
  });

  return {
    ok: status !== "failed",
    persisted_at: persistedAt,
    status,
    persisted_count: persistedCount,
    failed_count: failedCount,
    warnings: uniqueWarnings(
      state.warnings,
      governance.warnings,
      compliance.warnings,
      lifecycle.warnings,
      status !== "persisted"
        ? ["runtime_governance_persistence_incomplete"]
        : [],
    ),
    error:
      status === "failed"
        ? "runtime_governance_persistence_failed"
        : null,
  };
}
