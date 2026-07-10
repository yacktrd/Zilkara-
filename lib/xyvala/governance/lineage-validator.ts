/* ============================================================================
 * FILE: lib/xyvala/governance/lineage-validator.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala variable lineage validator
 *
 * ROLE
 * - validate the Variable Lineage Registry
 * - detect ownership, propagation, exposure and reconstruction violations
 * - enforce VLR-001 to VLR-007
 * - support First Divergence Rule and Propagation Audit Rule
 *
 * PARENTS
 * - lib/xyvala/governance/variable-lineage-registry.ts
 *
 * DIRECTIVES
 * - governance validation only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no snapshot mutation
 * - no API logic
 * - no UI logic
 * - no runtime mutation
 * - deterministic output only
 * - same registry input => same validation output
 *
 * INPUTS
 * - Variable Lineage Registry entries
 *
 * OUTPUTS
 * - lineage validation result
 * - deterministic governance violations
 *
 * INVARIANTS
 * - registry validation never mutates source data
 * - critical variables must have one owner
 * - downstream layers cannot reconstruct upstream truths
 * - private variables cannot be publicly exposed
 * - every critical variable must keep full lineage
 *
 * CRITICAL DEPENDENCIES
 * - VARIABLE_LINEAGE_REGISTRY
 *
 * SENSITIVE ZONES
 * - variable ownership
 * - private/public exposure
 * - propagation path
 * - reconstruction permissions
 * ========================================================================== */

import {
  VARIABLE_LINEAGE_REGISTRY,
} from "@/lib/xyvala/governance/variable-lineage-registry";

import {
  getGovernanceLayerIndex,
} from "@/lib/xyvala/governance/governance-layer-order";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type LineageViolationCode =
  | "VLR-001"
  | "VLR-002"
  | "VLR-003"
  | "VLR-004"
  | "VLR-005"
  | "VLR-006"
  | "VLR-007"
  | "VLR-INVALID-SHAPE"
  | "VLR-MISSING-FIELD"
  | "VLR-INVALID-PROPAGATION"
  | "VLR-INVALID-EXPOSURE";

export type LineageSeverity =
  | "critical"
  | "major"
  | "minor";

export type LineageValidationViolation = {
  code: LineageViolationCode;
  severity: LineageSeverity;
  variable_name: string;
  message: string;
};

export type LineageValidationResult = {
  ok: boolean;
  checked_count: number;
  violation_count: number;
  violations: LineageValidationViolation[];
};

type RegistryEntry = {
  variable_name: string;
  ownership_layer: string;
  source_truth: string;
  contract_source: string;
  category: string;
  criticality_level: string;
  exposure_level: string;
  propagation_path: string[];
  upstream_dependencies: string[];
  downstream_consumers: string[];
  reconstruction_allowed: boolean;
  public_exposure_allowed: boolean;
  validation_required: boolean;
  lineage_status: string;
  protocol_reference: string[];
};

/* ============================================================================
 * 2. CONSTANTS
 * ========================================================================== */

const PRIVATE_EXPOSURE_LEVELS = new Set([
  "PRIVATE",
  "INTERNAL",
]);

const PUBLIC_EXPOSURE_LEVELS = new Set([
  "PUBLIC",
]);

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function normalizeRegistry(input: unknown): RegistryEntry[] {
  if (Array.isArray(input)) {
    return input.filter(isRegistryEntry);
  }

  if (isPlainObject(input)) {
    return Object.values(input).filter(isRegistryEntry);
  }

  return [];
}

function isRegistryEntry(value: unknown): value is RegistryEntry {
  if (!isPlainObject(value)) return false;

  return (
    isNonEmptyString(value.variable_name) &&
    isNonEmptyString(value.ownership_layer) &&
    isNonEmptyString(value.source_truth) &&
    isNonEmptyString(value.contract_source) &&
    isNonEmptyString(value.category) &&
    isNonEmptyString(value.criticality_level) &&
    isNonEmptyString(value.exposure_level) &&
    isStringArray(value.propagation_path) &&
    isStringArray(value.upstream_dependencies) &&
    isStringArray(value.downstream_consumers) &&
    isBoolean(value.reconstruction_allowed) &&
    isBoolean(value.public_exposure_allowed) &&
    isBoolean(value.validation_required) &&
    isNonEmptyString(value.lineage_status) &&
    isStringArray(value.protocol_reference)
  );
}

function violation(input: {
  code: LineageViolationCode;
  severity: LineageSeverity;
  variable_name: string;
  message: string;
}): LineageValidationViolation {
  return input;
}

/* ============================================================================
 * 4. VALIDATION HELPERS
 * ========================================================================== */

function validateUniqueOwnership(entries: RegistryEntry[]): LineageValidationViolation[] {
  const violations: LineageValidationViolation[] = [];
  const ownersByVariable = new Map<string, Set<string>>();

  for (const entry of entries) {
    const owners = ownersByVariable.get(entry.variable_name) ?? new Set<string>();
    owners.add(entry.ownership_layer);
    ownersByVariable.set(entry.variable_name, owners);
  }

  for (const [variableName, owners] of ownersByVariable.entries()) {
    if (owners.size > 1) {
      violations.push(
        violation({
          code: "VLR-001",
          severity: "critical",
          variable_name: variableName,
          message: "Multiple ownership layers produce the same variable truth.",
        }),
      );
    }
  }

  return violations;
}

function validateNoDownstreamReconstruction(entry: RegistryEntry): LineageValidationViolation[] {
  if (!entry.reconstruction_allowed) {
    return [];
  }

  return [
    violation({
      code: "VLR-002",
      severity: "critical",
      variable_name: entry.variable_name,
      message: "Critical variable allows reconstruction despite source-truth governance.",
    }),
  ];
}

function validateLineageCompleteness(entry: RegistryEntry): LineageValidationViolation[] {
  const violations: LineageValidationViolation[] = [];

  if (entry.propagation_path.length === 0) {
    violations.push(
      violation({
        code: "VLR-003",
        severity: "critical",
        variable_name: entry.variable_name,
        message: "Critical variable has no propagation path.",
      }),
    );
  }

  if (!entry.source_truth || !entry.contract_source || !entry.ownership_layer) {
    violations.push(
      violation({
        code: "VLR-004",
        severity: "critical",
        variable_name: entry.variable_name,
        message: "Critical variable cannot be fully linked to source, owner and contract.",
      }),
    );
  }

  return violations;
}

function validatePublicExposure(entry: RegistryEntry): LineageValidationViolation[] {
  const isPrivate =
    PRIVATE_EXPOSURE_LEVELS.has(entry.exposure_level);

  const isPublic =
    PUBLIC_EXPOSURE_LEVELS.has(entry.exposure_level);

  if (isPrivate && entry.public_exposure_allowed) {
    return [
      violation({
        code: "VLR-005",
        severity: "critical",
        variable_name: entry.variable_name,
        message: "Private or internal variable is marked as publicly exposable.",
      }),
    ];
  }

  if (isPublic && !entry.public_exposure_allowed) {
    return [
      violation({
        code: "VLR-INVALID-EXPOSURE",
        severity: "major",
        variable_name: entry.variable_name,
        message: "Public variable exposure level conflicts with public exposure flag.",
      }),
    ];
  }

  return [];
}

function validatePropagationOrder(
  entry: RegistryEntry,
): LineageValidationViolation[] {
  const indexes = entry.propagation_path.map((layer) =>
    getGovernanceLayerIndex(layer),
  );

  if (indexes.some((index) => index === -1)) {
    return [
      violation({
        code: "VLR-INVALID-PROPAGATION",
        severity: "major",
        variable_name: entry.variable_name,
        message: "Propagation path contains an unknown governance layer.",
      }),
    ];
  }

  for (let index = 1; index < indexes.length; index += 1) {
    const currentIndex = indexes[index];
    const previousIndex = indexes[index - 1];

    if (
      currentIndex === undefined ||
      previousIndex === undefined
    ) {
      continue;
    }

    if (currentIndex < previousIndex) {
      return [
        violation({
          code: "VLR-006",
          severity: "critical",
          variable_name: entry.variable_name,
          message:
            "Variable propagation changes direction or breaks official layer order.",
        }),
      ];
    }
  }

  return [];
}

function validateSilentLossRisk(entry: RegistryEntry): LineageValidationViolation[] {
  if (!entry.validation_required) {
    return [
      violation({
        code: "VLR-007",
        severity: "major",
        variable_name: entry.variable_name,
        message: "Critical variable does not require validation and may disappear silently.",
      }),
    ];
  }

  if (entry.lineage_status !== "ACTIVE") {
    return [
      violation({
        code: "VLR-007",
        severity: "major",
        variable_name: entry.variable_name,
        message: "Critical variable lineage is not active.",
      }),
    ];
  }

  return [];
}

/* ============================================================================
 * 5. PUBLIC VALIDATOR API
 * ========================================================================== */

export function validateVariableLineageRegistry(
  registry: unknown = VARIABLE_LINEAGE_REGISTRY,
): LineageValidationResult {
  const entries = normalizeRegistry(registry);
  const violations: LineageValidationViolation[] = [];

  if (entries.length === 0) {
    violations.push(
      violation({
        code: "VLR-INVALID-SHAPE",
        severity: "critical",
        variable_name: "VARIABLE_LINEAGE_REGISTRY",
        message: "Variable Lineage Registry is empty or has invalid shape.",
      }),
    );

    return {
      ok: false,
      checked_count: 0,
      violation_count: violations.length,
      violations,
    };
  }

  violations.push(...validateUniqueOwnership(entries));

  for (const entry of entries) {
    violations.push(...validateNoDownstreamReconstruction(entry));
    violations.push(...validateLineageCompleteness(entry));
    violations.push(...validatePublicExposure(entry));
    violations.push(...validatePropagationOrder(entry));
    violations.push(...validateSilentLossRisk(entry));
  }

  return {
    ok: violations.length === 0,
    checked_count: entries.length,
    violation_count: violations.length,
    violations,
  };
}

export function assertVariableLineageRegistryValid(
  registry: unknown = VARIABLE_LINEAGE_REGISTRY,
): void {
  const result = validateVariableLineageRegistry(registry);

  if (!result.ok) {
    console.error(
      "XYVALA_LINEAGE_VALIDATION_VIOLATIONS",
      JSON.stringify(result.violations, null, 2),
    );

    throw new Error(
      `variable_lineage_registry_invalid:${result.violations
        .map((item) => `${item.code}:${item.variable_name}`)
        .join(",")}`,
    );
  }
}
