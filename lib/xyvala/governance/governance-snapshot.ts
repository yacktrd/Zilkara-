/* ============================================================================
 * FILE: lib/xyvala/governance/governance-snapshot.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala governance snapshot contract
 *
 * ROLE
 * - build immutable governance snapshots from governance observability reports
 * - capture governance state for audit, post-mortem and version comparison
 * - transport governance diagnostics without recalculating analytical truth
 * - preserve deterministic governance state boundaries
 *
 * PARENTS
 * - lib/xyvala/governance/lineage-observability.ts
 * - lib/xyvala/governance/governance-orchestrator.ts
 *
 * DIRECTIVES
 * - governance snapshot only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no analytical scoring
 * - no API logic
 * - no UI logic
 * - no cache logic
 * - no persistence
 * - no runtime mutation
 * - deterministic output only
 *
 * INPUTS
 * - governance observability input
 *
 * OUTPUTS
 * - GovernanceSnapshot
 *
 * INVARIANTS
 * - snapshot never creates analytical truth
 * - snapshot never mutates runtime state
 * - snapshot transports already computed governance diagnostics
 * - invalid governance must remain explicit
 *
 * CRITICAL DEPENDENCIES
 * - buildLineageObservabilityReport
 *
 * SENSITIVE ZONES
 * - governance status
 * - first divergence state
 * - lineage and boundary summaries
 * ========================================================================== */

import {
  buildLineageObservabilityReport,
  type LineageObservabilityReport,
} from "@/lib/xyvala/governance/lineage-observability";

import type {
  GovernanceOrchestrationInput,
} from "@/lib/xyvala/governance/governance-orchestrator";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export const XYVALA_GOVERNANCE_SNAPSHOT_VERSION = "governance-v1" as const;

export type GovernanceSnapshotStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "BROKEN";

export type GovernanceSnapshot = {
  ok: boolean;
  ts: string;
  version: typeof XYVALA_GOVERNANCE_SNAPSHOT_VERSION;
  status: GovernanceSnapshotStatus;
  observability: LineageObservabilityReport;
  meta: {
    source: "governance";
    deterministic: true;
    mutation_allowed: false;
    recalculation_allowed: false;
  };
};

export type GovernanceSnapshotValidationResult = {
  ok: boolean;
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/* ============================================================================
 * 3. SNAPSHOT BUILDER
 * ========================================================================== */

export function buildGovernanceSnapshot(
  input: GovernanceOrchestrationInput = {},
): GovernanceSnapshot {
  const observability = buildLineageObservabilityReport(input);

  return {
    ok: observability.ok,
    ts: nowIso(),
    version: XYVALA_GOVERNANCE_SNAPSHOT_VERSION,
    status: observability.status,
    observability,
    meta: {
      source: "governance",
      deterministic: true,
      mutation_allowed: false,
      recalculation_allowed: false,
    },
  };
}

/* ============================================================================
 * 4. SNAPSHOT VALIDATION
 * ========================================================================== */

export function isGovernanceSnapshot(
  value: unknown,
): value is GovernanceSnapshot {
  if (!isPlainObject(value)) return false;

  const meta = value.meta;

  return (
    isBoolean(value.ok) &&
    isString(value.ts) &&
    value.version === XYVALA_GOVERNANCE_SNAPSHOT_VERSION &&
    (
      value.status === "HEALTHY" ||
      value.status === "DEGRADED" ||
      value.status === "BROKEN"
    ) &&
    isPlainObject(value.observability) &&
    isPlainObject(meta) &&
    meta.source === "governance" &&
    meta.deterministic === true &&
    meta.mutation_allowed === false &&
    meta.recalculation_allowed === false
  );
}

export function validateGovernanceSnapshot(
  snapshot: unknown,
): GovernanceSnapshotValidationResult {
  if (!isGovernanceSnapshot(snapshot)) {
    return {
      ok: false,
      warnings: ["governance_snapshot_invalid_contract"],
      error: "governance_snapshot_invalid",
    };
  }

  return {
    ok: true,
    warnings: [],
    error: null,
  };
}

export function assertGovernanceSnapshotValid(
  snapshot: unknown,
): void {
  const result = validateGovernanceSnapshot(snapshot);

  if (!result.ok) {
    throw new Error(result.error ?? "governance_snapshot_invalid");
  }
}
