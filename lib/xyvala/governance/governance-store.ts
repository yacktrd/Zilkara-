/* ============================================================================
 * FILE: lib/xyvala/governance/governance-store.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala governance store
 *
 * ROLE
 * - store governance snapshots, health reports, coverage reports and audit reports
 * - preserve governance memory for audit, post-mortem and diagnostics
 * - provide deterministic in-memory governance history views
 * - keep governance persistence isolated from analytical engines
 *
 * DIRECTIVES
 * - governance storage only
 * - private audit memory only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no public projection
 * - no API logic
 * - no UI logic
 * - no event bus
 * - no runtime trigger
 * - no analytical mutation
 * - deterministic storage behavior only
 *
 * INPUTS
 * - governance snapshots
 * - governance health reports
 * - traceability coverage reports
 * - variable registry audit reports
 *
 * OUTPUTS
 * - GovernanceStoreWriteResult
 * - GovernanceStoreSnapshot
 *
 * INVARIANTS
 * - store never creates analytical truth
 * - store never recalculates governance truth
 * - store records already computed governance artifacts only
 * - store remains private and auditable
 * - undefined must never be stored
 *
 * CRITICAL DEPENDENCIES
 * - GovernanceSnapshot
 * - GovernanceHealthReport
 * - TraceabilityCoverageReport
 * - VariableRegistryAuditReport
 *
 * SENSITIVE ZONES
 * - governance violations
 * - first divergence history
 * - private audit memory
 * ========================================================================== */

import type {
  GovernanceHealthReport,
} from "@/lib/xyvala/governance/governance-health";

import type {
  GovernanceSnapshot,
} from "@/lib/xyvala/governance/governance-snapshot";

import type {
  TraceabilityCoverageReport,
} from "@/lib/xyvala/governance/traceability-coverage";

import type {
  VariableRegistryAuditReport,
} from "@/lib/xyvala/governance/variable-registry-audit";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type GovernanceStoreRecordKind =
  | "governance_snapshot"
  | "governance_health"
  | "traceability_coverage"
  | "variable_registry_audit";

export type GovernanceStoreWriteStatus =
  | "recorded"
  | "invalid";

export type GovernanceStoreRecord = {
  record_id: string;
  recorded_at: string;
  kind: GovernanceStoreRecordKind;
  status: string;
  ok: boolean;
  payload:
    | GovernanceSnapshot
    | GovernanceHealthReport
    | TraceabilityCoverageReport
    | VariableRegistryAuditReport;
  warnings: string[];
};

export type GovernanceStoreWriteResult = {
  ok: boolean;
  status: GovernanceStoreWriteStatus;
  record: GovernanceStoreRecord | null;
  warnings: string[];
  error: string | null;
};

export type GovernanceStoreSnapshot = {
  ok: boolean;
  count: number;
  records: readonly GovernanceStoreRecord[];
  latest: GovernanceStoreRecord | null;
  warnings: string[];
};

/* ============================================================================
 * 2. PRIVATE MEMORY STORE
 * ========================================================================== */

const GOVERNANCE_STORE: GovernanceStoreRecord[] = [];

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function normalizeWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      ),
    ),
  ];
}

function buildRecordId(kind: GovernanceStoreRecordKind): string {
  return `${kind}:${Date.now()}:${GOVERNANCE_STORE.length + 1}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractPayloadStatus(payload: unknown): string {
  if (!isPlainObject(payload)) {
    return "invalid";
  }

  if (typeof payload.status === "string") {
    return payload.status;
  }

  const summary = isPlainObject(payload.summary)
    ? payload.summary
    : null;

  if (summary && typeof summary.compliance_status === "string") {
    return summary.compliance_status;
  }

  return "unknown";
}

function extractPayloadOk(payload: unknown): boolean {
  return isPlainObject(payload) && payload.ok === true;
}

function extractPayloadWarnings(payload: unknown): string[] {
  if (!isPlainObject(payload)) return [];

  return normalizeWarnings(payload.warnings);
}

/* ============================================================================
 * 4. WRITE HELPERS
 * ========================================================================== */

function recordGovernanceArtifact(input: {
  kind: GovernanceStoreRecordKind;
  payload:
    | GovernanceSnapshot
    | GovernanceHealthReport
    | TraceabilityCoverageReport
    | VariableRegistryAuditReport;
}): GovernanceStoreWriteResult {
  if (!isPlainObject(input.payload)) {
    return {
      ok: false,
      status: "invalid",
      record: null,
      warnings: ["governance_store_invalid_payload"],
      error: "governance_store_invalid_payload",
    };
  }

  const record: GovernanceStoreRecord = {
    record_id: buildRecordId(input.kind),
    recorded_at: nowIso(),
    kind: input.kind,
    status: extractPayloadStatus(input.payload),
    ok: extractPayloadOk(input.payload),
    payload: input.payload,
    warnings: extractPayloadWarnings(input.payload),
  };

  GOVERNANCE_STORE.push(record);

  return {
    ok: true,
    status: "recorded",
    record,
    warnings: record.warnings,
    error: null,
  };
}

/* ============================================================================
 * 5. PUBLIC WRITE API
 * ========================================================================== */

export function recordGovernanceSnapshot(
  snapshot: GovernanceSnapshot,
): GovernanceStoreWriteResult {
  return recordGovernanceArtifact({
    kind: "governance_snapshot",
    payload: snapshot,
  });
}

export function recordGovernanceHealth(
  health: GovernanceHealthReport,
): GovernanceStoreWriteResult {
  return recordGovernanceArtifact({
    kind: "governance_health",
    payload: health,
  });
}

export function recordTraceabilityCoverage(
  coverage: TraceabilityCoverageReport,
): GovernanceStoreWriteResult {
  return recordGovernanceArtifact({
    kind: "traceability_coverage",
    payload: coverage,
  });
}

export function recordVariableRegistryAudit(
  audit: VariableRegistryAuditReport,
): GovernanceStoreWriteResult {
  return recordGovernanceArtifact({
    kind: "variable_registry_audit",
    payload: audit,
  });
}

/* ============================================================================
 * 6. READ API
 * ========================================================================== */

export function getGovernanceStoreSnapshot(): GovernanceStoreSnapshot {
  const records = [...GOVERNANCE_STORE];

  return {
    ok: true,
    count: records.length,
    records,
    latest: records.at(-1) ?? null,
    warnings: [],
  };
}

export function listGovernanceStoreRecordsByKind(
  kind: GovernanceStoreRecordKind,
): readonly GovernanceStoreRecord[] {
  return GOVERNANCE_STORE.filter((record) => record.kind === kind);
}

export function clearGovernanceStoreForTests(): void {
  GOVERNANCE_STORE.length = 0;
}
