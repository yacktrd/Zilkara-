/* ============================================================================
 * FILE: lib/xyvala/governance/variable-registry-audit.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala variable registry audit
 *
 * ROLE
 * - compare Variable Lineage Registry with produced private asset variables
 * - detect registered variables never produced
 * - detect produced variables absent from registry
 * - detect orphan variables and naming governance violations
 * - provide deterministic registry / contract alignment diagnostics
 *
 * DIRECTIVES
 * - governance audit only
 * - observe / compute layer only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no public projection
 * - no API logic
 * - no UI logic
 * - no cache mutation
 * - no persistence
 * - no event bus
 * - deterministic output only
 *
 * INPUTS
 * - PrivateScanAsset[]
 * - optional variable lineage registry
 *
 * OUTPUTS
 * - VariableRegistryAuditReport
 *
 * INVARIANTS
 * - audit never creates analytical truth
 * - audit never mutates runtime state
 * - registry remains expected truth model
 * - private assets remain observed truth model
 * - orphan variables must remain explicit
 *
 * CRITICAL DEPENDENCIES
 * - PrivateScanAsset
 * - VARIABLE_LINEAGE_REGISTRY
 *
 * SENSITIVE ZONES
 * - private analytical variables
 * - registry / contract divergence
 * - naming governance
 * - orphan variables
 * ========================================================================== */

import type { PrivateScanAsset } from "@/lib/xyvala/contracts/scan-private-contract";

import {
  VARIABLE_LINEAGE_REGISTRY,
} from "@/lib/xyvala/governance/variable-lineage-registry";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type VariableRegistryAuditStatus =
  | "aligned"
  | "partial"
  | "divergent"
  | "empty"
  | "invalid";

export type VariableRegistryAuditSeverity =
  | "none"
  | "minor"
  | "major"
  | "critical";

export type VariableRegistryAuditEntry = {
  variable_name: string;
  criticality_level: string;
  exposure_level: string;
  validation_required: boolean;
};

export type VariableRegistryAuditReport = {
  ok: boolean;
  status: VariableRegistryAuditStatus;
  severity: VariableRegistryAuditSeverity;

  registry_variable_count: number;
  produced_variable_count: number;
  matched_variable_count: number;

  registered_missing_count: number;
  produced_orphan_count: number;

  registered_missing_variables: string[];
  produced_orphan_variables: string[];

  naming_violations_count: number;
  naming_violations: string[];

  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function normalizeRegistry(input: unknown): VariableRegistryAuditEntry[] {
  const values = Array.isArray(input)
    ? input
    : isPlainObject(input)
      ? Object.values(input)
      : [];

  return values.filter(isRegistryEntry);
}

function isRegistryEntry(value: unknown): value is VariableRegistryAuditEntry {
  if (!isPlainObject(value)) return false;

  return (
    isNonEmptyString(value.variable_name) &&
    isNonEmptyString(value.criticality_level) &&
    isNonEmptyString(value.exposure_level) &&
    isBoolean(value.validation_required)
  );
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set([...values].filter(isNonEmptyString))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function isProducedValue(value: unknown): boolean {
  return value !== undefined;
}

function isAuditablePrimitive(value: unknown): boolean {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/* ============================================================================
 * 3. NAMING GOVERNANCE
 * ========================================================================== */

function isSnakeCase(value: string): boolean {
  return /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(value);
}

function detectNamingViolations(names: readonly string[]): string[] {
  return uniqueSorted(
    names
      .filter((name) => !isSnakeCase(name))
      .map((name) => `invalid_variable_name:${name}`),
  );
}

/* ============================================================================
 * 4. PRODUCED VARIABLE EXTRACTION
 * ========================================================================== */

const PRODUCED_VARIABLE_ALIASES: Record<string, string> = {
  price: "price_eur",
  market_cap: "market_cap_eur",
};

function normalizeProducedVariableName(name: string): string {
  return PRODUCED_VARIABLE_ALIASES[name] ?? name;
}

function extractProducedVariableNamesFromAsset(
  asset: PrivateScanAsset,
): string[] {
  const source = asset as unknown as Record<string, unknown>;
  const registryNames = new Set(
    VARIABLE_LINEAGE_REGISTRY.map((entry) => entry.variable_name),
  );

  return Object.entries(source)
    .filter(([key, value]) => {
      if (key === "governance") return false;
      if (key === "sparkline_7d" && Array.isArray(value)) return true;
      if (!isAuditablePrimitive(value)) return false;

      return isProducedValue(value);
    })
    .map(([key]) => normalizeProducedVariableName(key))
    .filter((name) => registryNames.has(name));
}

function extractProducedVariableNames(
  assets: readonly PrivateScanAsset[],
): string[] {
  return uniqueSorted(
    assets.flatMap(extractProducedVariableNamesFromAsset),
  );
}

/* ============================================================================
 * 5. SEVERITY / STATUS RESOLUTION
 * ========================================================================== */

function hasCriticalMissing(
  missingVariables: readonly string[],
  registryEntries: readonly VariableRegistryAuditEntry[],
): boolean {
  const criticalNames = new Set(
    registryEntries
      .filter(
        (entry) =>
          entry.criticality_level === "Core Truth" ||
          entry.criticality_level === "CORE_TRUTH",
      )
      .map((entry) => entry.variable_name),
  );

  return missingVariables.some((name) => criticalNames.has(name));
}

function resolveStatus(input: {
  registryCount: number;
  producedCount: number;
  missingCount: number;
  orphanCount: number;
  namingViolationCount: number;
}): VariableRegistryAuditStatus {
  if (input.registryCount === 0) return "invalid";
  if (input.producedCount === 0) return "empty";

  if (
    input.missingCount === 0 &&
    input.orphanCount === 0 &&
    input.namingViolationCount === 0
  ) {
    return "aligned";
  }

  if (input.missingCount > 0 || input.orphanCount > 0) {
    return "divergent";
  }

  return "partial";
}

function resolveSeverity(input: {
  status: VariableRegistryAuditStatus;
  hasCriticalMissing: boolean;
  missingCount: number;
  orphanCount: number;
  namingViolationCount: number;
}): VariableRegistryAuditSeverity {
  if (input.status === "invalid") return "critical";
  if (input.status === "empty") return "critical";
  if (input.hasCriticalMissing) return "critical";
  if (input.missingCount > 0) return "major";
  if (input.orphanCount > 0) return "major";
  if (input.namingViolationCount > 0) return "minor";

  return "none";
}

/* ============================================================================
 * 6. PUBLIC AUDIT API
 * ========================================================================== */

export function buildVariableRegistryAuditReport(input: {
  assets: readonly PrivateScanAsset[];
  registry?: unknown;
}): VariableRegistryAuditReport {
  const registryEntries = normalizeRegistry(
  input.registry ?? VARIABLE_LINEAGE_REGISTRY,
).filter((entry) => {
  const name = entry.variable_name;

  if (name.startsWith("public_")) return false;
  if (name.startsWith("ui_")) return false;

 

  return true;
});
  if (registryEntries.length === 0) {
    return {
      ok: false,
      status: "invalid",
      severity: "critical",

      registry_variable_count: 0,
      produced_variable_count: 0,
      matched_variable_count: 0,

      registered_missing_count: 0,
      produced_orphan_count: 0,

      registered_missing_variables: [],
      produced_orphan_variables: [],

      naming_violations_count: 0,
      naming_violations: [],

      warnings: ["variable_registry_audit_registry_empty_or_invalid"],
      error: "variable_registry_audit_invalid_registry",
    };
  }

  const registryNames = new Set(
    registryEntries.map((entry) => entry.variable_name),
  );

  const producedNames = new Set(
  extractProducedVariableNames(input.assets)
    .filter((name) => registryNames.has(name)),
);
  const registeredMissingVariables = uniqueSorted(
    [...registryNames].filter((name) => !producedNames.has(name)),
  );

  const producedOrphanVariables = uniqueSorted(
    [...producedNames].filter((name) => !registryNames.has(name)),
  );

  const matchedVariables = uniqueSorted(
    [...registryNames].filter((name) => producedNames.has(name)),
  );

  const namingViolations = detectNamingViolations([
    ...registryNames,
    ...producedNames,
  ]);

  const status = resolveStatus({
    registryCount: registryNames.size,
    producedCount: producedNames.size,
    missingCount: registeredMissingVariables.length,
    orphanCount: producedOrphanVariables.length,
    namingViolationCount: namingViolations.length,
  });

  const severity = resolveSeverity({
    status,
    hasCriticalMissing: hasCriticalMissing(
      registeredMissingVariables,
      registryEntries,
    ),
    missingCount: registeredMissingVariables.length,
    orphanCount: producedOrphanVariables.length,
    namingViolationCount: namingViolations.length,
  });

  const warnings = uniqueSorted([
    ...(registeredMissingVariables.length > 0
      ? [`registry_missing_variables:${registeredMissingVariables.length}`]
      : []),
    ...(producedOrphanVariables.length > 0
      ? [`registry_orphan_variables:${producedOrphanVariables.length}`]
      : []),
    ...(namingViolations.length > 0
      ? [`registry_naming_violations:${namingViolations.length}`]
      : []),
  ]);

  return {
    ok: status === "aligned",
    status,
    severity,

    registry_variable_count: registryNames.size,
    produced_variable_count: producedNames.size,
    matched_variable_count: matchedVariables.length,

    registered_missing_count: registeredMissingVariables.length,
    produced_orphan_count: producedOrphanVariables.length,

    registered_missing_variables: registeredMissingVariables,
    produced_orphan_variables: producedOrphanVariables,

    naming_violations_count: namingViolations.length,
    naming_violations: namingViolations,

    warnings,
    error: status === "aligned" ? null : `variable_registry_audit_${status}`,
  };
}

export function assertVariableRegistryAligned(input: {
  assets: readonly PrivateScanAsset[];
  registry?: unknown;
}): void {
  const report = buildVariableRegistryAuditReport(input);

  if (!report.ok) {
    throw new Error(
      `variable_registry_audit_failed:${[
        report.status,
        report.severity,
        report.registered_missing_count,
        report.produced_orphan_count,
      ].join(":")}`,
    );
  }
}
