/* ============================================================================
 * FILE: lib/xyvala/governance/traceability-runtime-test.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala traceability runtime test
 *
 * ROLE
 * - execute an end-to-end traceability test from PrivateScanAsset[]
 * - validate traceability governor, coverage, registry audit and governance runtime
 * - record computed governance artifacts into the private governance store
 * - prove runtime traceability without recalculating analytical truth
 *
 * DIRECTIVES
 * - governance runtime test only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no public projection
 * - no API logic
 * - no UI logic
 * - no event bus
 * - no analytical mutation
 * - deterministic orchestration only
 *
 * INPUTS
 * - PrivateScanAsset[]
 *
 * OUTPUTS
 * - TraceabilityRuntimeTestResult
 *
 * INVARIANTS
 * - test never creates analytical truth
 * - test never mutates analytical engines
 * - test records only already computed governance artifacts
 * - missing variables remain explicit
 * - first divergence remains visible
 *
 * CRITICAL DEPENDENCIES
 * - traceability-governor
 * - traceability-coverage
 * - variable-registry-audit
 * - governance-store
 *
 * SENSITIVE ZONES
 * - private analytical variables
 * - governance artifact storage
 * - traceability proof status
 * ========================================================================== */

import type { PrivateScanAsset } from "@/lib/xyvala/contracts/scan-private-contract";

import {
  buildTraceabilityGovernorResult,
} from "@/lib/xyvala/governance/traceability-governor";

import {
  buildTraceabilityCoverageReport,
  type TraceabilityCoverageReport,
} from "@/lib/xyvala/governance/traceability-coverage";

import {
  buildVariableRegistryAuditReport,
  type VariableRegistryAuditReport,
} from "@/lib/xyvala/governance/variable-registry-audit";

import {
  buildPrivateAssetTraces,
} from "@/lib/xyvala/governance/traceability-governor";

import {
  recordGovernanceHealth,
  recordGovernanceSnapshot,
  recordTraceabilityCoverage,
  recordVariableRegistryAudit,
  type GovernanceStoreWriteResult,
} from "@/lib/xyvala/governance/governance-store";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type TraceabilityRuntimeTestStatus =
  | "passed"
  | "degraded"
  | "failed"
  | "empty";

export type TraceabilityRuntimeTestResult = {
  ok: boolean;
  status: TraceabilityRuntimeTestStatus;

  asset_count: number;
  trace_count: number;

  governor_ok: boolean;
  coverage_ok: boolean;
  registry_audit_ok: boolean;
  governance_runtime_ok: boolean;

  coverage: TraceabilityCoverageReport;
  registry_audit: VariableRegistryAuditReport;

  stored: {
    snapshot: GovernanceStoreWriteResult | null;
    health: GovernanceStoreWriteResult | null;
    coverage: GovernanceStoreWriteResult | null;
    registry_audit: GovernanceStoreWriteResult | null;
  };

  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

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

function resolveStatus(input: {
  assetCount: number;
  governorOk: boolean;
  coverageOk: boolean;
  registryAuditOk: boolean;
  governanceRuntimeOk: boolean;
}): TraceabilityRuntimeTestStatus {
  if (input.assetCount === 0) return "empty";

  if (
    input.governorOk &&
    input.coverageOk &&
    input.registryAuditOk &&
    input.governanceRuntimeOk
  ) {
    return "passed";
  }

  if (input.governorOk || input.coverageOk || input.registryAuditOk) {
    return "degraded";
  }

  return "failed";
}

/* ============================================================================
 * 3. TRACE EXTRACTION
 * ========================================================================== */

import type {
  RuntimeTraceInput,
} from "@/lib/xyvala/governance/runtime-traceability";

function buildRuntimeTestTraces(
  assets: readonly PrivateScanAsset[],
): RuntimeTraceInput[] {
  return assets.flatMap((asset) =>
    buildPrivateAssetTraces(asset),
  );
}

/* ============================================================================
 * 4. PUBLIC RUNTIME TEST API
 * ========================================================================== */

export function runTraceabilityRuntimeTest(input: {
  assets: readonly PrivateScanAsset[];
}): TraceabilityRuntimeTestResult {
  const assets = Array.isArray(input.assets) ? input.assets : [];

  const traces = buildRuntimeTestTraces(assets);

  const governor = buildTraceabilityGovernorResult({
    assets,
  });

  const coverage = buildTraceabilityCoverageReport({
    traces,
  });

  const registryAudit = buildVariableRegistryAuditReport({
    assets,
  });

  const governanceRuntime = governor.governance;

  const storedSnapshot =
    governanceRuntime.snapshot !== null
      ? recordGovernanceSnapshot(governanceRuntime.snapshot)
      : null;

  const storedHealth = recordGovernanceHealth(governanceRuntime.health);

  const storedCoverage = recordTraceabilityCoverage(coverage);

  const storedRegistryAudit = recordVariableRegistryAudit(registryAudit);

  const status = resolveStatus({
    assetCount: assets.length,
    governorOk: governor.ok,
    coverageOk: coverage.ok,
    registryAuditOk: registryAudit.ok,
    governanceRuntimeOk: governanceRuntime.ok,
  });

  const warnings = uniqueWarnings(
    governor.warnings,
    coverage.warnings,
    registryAudit.warnings,
    governanceRuntime.warnings,
    storedSnapshot?.warnings,
    storedHealth.warnings,
    storedCoverage.warnings,
    storedRegistryAudit.warnings,
  );

  return {
    ok: status === "passed",
    status,

    asset_count: assets.length,
    trace_count: traces.length,

    governor_ok: governor.ok,
    coverage_ok: coverage.ok,
    registry_audit_ok: registryAudit.ok,
    governance_runtime_ok: governanceRuntime.ok,

    coverage,
    registry_audit: registryAudit,

    stored: {
      snapshot: storedSnapshot,
      health: storedHealth,
      coverage: storedCoverage,
      registry_audit: storedRegistryAudit,
    },

    warnings,
    error:
      status === "passed"
        ? null
        : `traceability_runtime_test_${status}`,
  };
}

export function assertTraceabilityRuntimeTestPassed(input: {
  assets: readonly PrivateScanAsset[];
}): void {
  const result = runTraceabilityRuntimeTest(input);

  if (!result.ok) {
    throw new Error(
      `traceability_runtime_test_failed:${[
        result.status,
        result.coverage.coverage_pct,
        result.registry_audit.status,
      ].join(":")}`,
    );
  }
}
