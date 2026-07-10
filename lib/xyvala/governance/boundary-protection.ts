/* ============================================================================
 * FILE: lib/xyvala/governance/boundary-protection.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala boundary protection system
 *
 * ROLE
 * - protect critical propagation boundaries
 * - validate boundary transitions between official Xyvala layers
 * - prevent invalid, missing or private data from crossing boundaries
 * - qualify boundary violations without mutating runtime state
 *
 * PARENTS
 * - lib/xyvala/governance/variable-lineage-registry.ts
 * - lib/xyvala/governance/lineage-validator.ts
 * - lib/xyvala/governance/propagation-audit.ts
 *
 * DIRECTIVES
 * - governance boundary validation only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no snapshot mutation
 * - no API logic
 * - no UI logic
 * - no runtime mutation
 * - deterministic output only
 * - same input => same boundary result
 *
 * INPUTS
 * - boundary name
 * - variable names crossing the boundary
 * - variable propagation statuses
 *
 * OUTPUTS
 * - boundary protection result
 * - qualified boundary violations
 *
 * INVARIANTS
 * - boundary validation never mutates data
 * - invalid data cannot cross a critical boundary
 * - private variables cannot cross public boundaries
 * - first invalid boundary must be reported explicitly
 *
 * CRITICAL DEPENDENCIES
 * - VARIABLE_LINEAGE_REGISTRY
 * - validateVariableLineageRegistry
 * - PropagationLayer
 * - PropagationStatus
 *
 * SENSITIVE ZONES
 * - private/public boundary
 * - snapshot to transformer boundary
 * - transformer to API boundary
 * - API to interface boundary
 * ========================================================================== */

import {
  VARIABLE_LINEAGE_REGISTRY,
} from "@/lib/xyvala/governance/variable-lineage-registry";

import {
  validateVariableLineageRegistry,
} from "@/lib/xyvala/governance/lineage-validator";

import type {
  PropagationLayer,
  PropagationStatus,
} from "@/lib/xyvala/governance/propagation-audit";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type BoundarySeverity =
  | "critical"
  | "major"
  | "minor"
  | "none";

export type BoundaryDecision =
  | "ALLOW"
  | "DEGRADE"
  | "BLOCK";

export type BoundaryName =
  | "ACQUISITION -> RFS"
  | "RFS -> TRIPLE_LAYER"
  | "TRIPLE_LAYER -> IMPULSE_LAYER"
  | "IMPULSE_LAYER -> ANALYTICAL_AGGREGATION_SYSTEM"
  | "ANALYTICAL_AGGREGATION_SYSTEM -> MCI"
  | "MCI -> CALIBRATION"
  | "CALIBRATION -> SNAPSHOT"
  | "SNAPSHOT -> TRANSFORMER"
  | "TRANSFORMER -> RANKING"
  | "RANKING -> API"
  | "TRANSFORMER -> API"
  | "API -> INTERFACE";

export type BoundaryVariableState = {
  variable_name: string;
  status: PropagationStatus;
  exposure_level?: string;
  public_exposure_allowed?: boolean;
};

export type BoundaryProtectionInput = {
  boundary: BoundaryName;
  from_layer: PropagationLayer;
  to_layer: PropagationLayer;
  variables: BoundaryVariableState[];
  registry?: unknown;
};

export type BoundaryViolationCode =
  | "BOUNDARY-INVALID-REGISTRY"
  | "BOUNDARY-INVALID-LAYER-PAIR"
  | "BOUNDARY-VARIABLE-MISSING"
  | "BOUNDARY-VARIABLE-INVALID"
  | "BOUNDARY-VARIABLE-UNAVAILABLE"
  | "BOUNDARY-PRIVATE-PUBLIC-LEAK"
  | "BOUNDARY-UNKNOWN-VARIABLE"
  | "BOUNDARY-PROPAGATION-NOT-AUTHORIZED";

export type BoundaryViolation = {
  code: BoundaryViolationCode;
  severity: BoundarySeverity;
  boundary: BoundaryName;
  variable_name: string | null;
  message: string;
};

export type BoundaryProtectionResult = {
  ok: boolean;
  boundary: BoundaryName;
  decision: BoundaryDecision;
  checked_count: number;
  violation_count: number;
  violations: BoundaryViolation[];
  warnings: string[];
};

type RegistryEntry = {
  variable_name: string;
  propagation_path: string[];
  exposure_level: string;
  public_exposure_allowed: boolean;
  criticality_level: string;
};

/* ============================================================================
 * 2. CONSTANTS
 * ========================================================================== */

const OFFICIAL_BOUNDARIES: Record<BoundaryName, {
  from_layer: PropagationLayer;
  to_layer: PropagationLayer;
  public_boundary: boolean;
}> = {
  "ACQUISITION -> RFS": {
    from_layer: "ACQUISITION",
    to_layer: "RFS",
    public_boundary: false,
  },
  "RFS -> TRIPLE_LAYER": {
    from_layer: "RFS",
    to_layer: "TRIPLE_LAYER",
    public_boundary: false,
  },
  "TRIPLE_LAYER -> IMPULSE_LAYER": {
    from_layer: "TRIPLE_LAYER",
    to_layer: "IMPULSE_LAYER",
    public_boundary: false,
  },
  "IMPULSE_LAYER -> ANALYTICAL_AGGREGATION_SYSTEM": {
    from_layer: "IMPULSE_LAYER",
    to_layer: "ANALYTICAL_AGGREGATION_SYSTEM",
    public_boundary: false,
  },
  "ANALYTICAL_AGGREGATION_SYSTEM -> MCI": {
    from_layer: "ANALYTICAL_AGGREGATION_SYSTEM",
    to_layer: "MCI",
    public_boundary: false,
  },
  "MCI -> CALIBRATION": {
    from_layer: "MCI",
    to_layer: "CALIBRATION",
    public_boundary: false,
  },
  "CALIBRATION -> SNAPSHOT": {
    from_layer: "CALIBRATION",
    to_layer: "SNAPSHOT",
    public_boundary: false,
  },
  "SNAPSHOT -> TRANSFORMER": {
    from_layer: "SNAPSHOT",
    to_layer: "TRANSFORMER",
    public_boundary: true,
  },
  "TRANSFORMER -> RANKING": {
    from_layer: "TRANSFORMER",
    to_layer: "RANKING",
    public_boundary: true,
  },
  "RANKING -> API": {
    from_layer: "RANKING",
    to_layer: "API",
    public_boundary: true,
  },
  "TRANSFORMER -> API": {
    from_layer: "TRANSFORMER",
    to_layer: "API",
    public_boundary: true,
  },
  "API -> INTERFACE": {
    from_layer: "API",
    to_layer: "INTERFACE",
    public_boundary: true,
  },
};

const PRIVATE_EXPOSURE_LEVELS = new Set([
  "PRIVATE",
  "INTERNAL",
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
  const values = Array.isArray(input)
    ? input
    : isPlainObject(input)
      ? Object.values(input)
      : [];

  return values.filter(isRegistryEntry);
}

function isRegistryEntry(value: unknown): value is RegistryEntry {
  if (!isPlainObject(value)) return false;

  return (
    isNonEmptyString(value.variable_name) &&
    isStringArray(value.propagation_path) &&
    isNonEmptyString(value.exposure_level) &&
    isBoolean(value.public_exposure_allowed) &&
    isNonEmptyString(value.criticality_level)
  );
}

function severityFromCriticality(value: string): BoundarySeverity {
  if (value === "Core Truth") return "critical";
  if (value === "Structural Support") return "major";
  if (value === "Aggregated Context") return "major";
  if (value === "Projection Variables") return "minor";

  return "major";
}

function makeViolation(input: {
  code: BoundaryViolationCode;
  severity: BoundarySeverity;
  boundary: BoundaryName;
  variable_name: string | null;
  message: string;
}): BoundaryViolation {
  return input;
}

/* ============================================================================
 * 4. BOUNDARY HELPERS
 * ========================================================================== */

function validateBoundaryPair(input: BoundaryProtectionInput): BoundaryViolation[] {
  const expected = OFFICIAL_BOUNDARIES[input.boundary];

  if (
    expected.from_layer !== input.from_layer ||
    expected.to_layer !== input.to_layer
  ) {
    return [
      makeViolation({
        code: "BOUNDARY-INVALID-LAYER-PAIR",
        severity: "critical",
        boundary: input.boundary,
        variable_name: null,
        message: "Boundary layer pair does not match official Xyvala boundary.",
      }),
    ];
  }

  return [];
}

function isVariableAllowedThroughBoundary(
  entry: RegistryEntry,
  fromLayer: PropagationLayer,
  toLayer: PropagationLayer,
): boolean {
  const fromIndex = entry.propagation_path.indexOf(fromLayer);
  const toIndex = entry.propagation_path.indexOf(toLayer);

  return fromIndex >= 0 && toIndex >= 0 && fromIndex <= toIndex;
}

function validateVariableState(input: {
  boundary: BoundaryName;
  public_boundary: boolean;
  variable: BoundaryVariableState;
  entry: RegistryEntry | undefined;
  from_layer: PropagationLayer;
  to_layer: PropagationLayer;
}): BoundaryViolation[] {
  const violations: BoundaryViolation[] = [];

  if (!input.entry) {
    violations.push(
      makeViolation({
        code: "BOUNDARY-UNKNOWN-VARIABLE",
        severity: "major",
        boundary: input.boundary,
        variable_name: input.variable.variable_name,
        message: "Variable is not registered in the Variable Lineage Registry.",
      }),
    );

    return violations;
  }

  if (
    !isVariableAllowedThroughBoundary(
      input.entry,
      input.from_layer,
      input.to_layer,
    )
  ) {
    violations.push(
      makeViolation({
        code: "BOUNDARY-PROPAGATION-NOT-AUTHORIZED",
        severity: severityFromCriticality(input.entry.criticality_level),
        boundary: input.boundary,
        variable_name: input.variable.variable_name,
        message: "Variable propagation is not authorized through this boundary.",
      }),
    );
  }

  if (input.variable.status === "missing") {
    violations.push(
      makeViolation({
        code: "BOUNDARY-VARIABLE-MISSING",
        severity: severityFromCriticality(input.entry.criticality_level),
        boundary: input.boundary,
        variable_name: input.variable.variable_name,
        message: "Variable is missing at boundary crossing.",
      }),
    );
  }

  if (input.variable.status === "invalid") {
    violations.push(
      makeViolation({
        code: "BOUNDARY-VARIABLE-INVALID",
        severity: severityFromCriticality(input.entry.criticality_level),
        boundary: input.boundary,
        variable_name: input.variable.variable_name,
        message: "Variable is invalid at boundary crossing.",
      }),
    );
  }

  if (input.variable.status === "unavailable") {
    violations.push(
      makeViolation({
        code: "BOUNDARY-VARIABLE-UNAVAILABLE",
        severity: severityFromCriticality(input.entry.criticality_level),
        boundary: input.boundary,
        variable_name: input.variable.variable_name,
        message: "Variable is unavailable at boundary crossing.",
      }),
    );
  }

  const exposureLevel =
    input.variable.exposure_level ?? input.entry.exposure_level;

  const publicAllowed =
    input.variable.public_exposure_allowed ??
    input.entry.public_exposure_allowed;

  if (
    input.public_boundary &&
    PRIVATE_EXPOSURE_LEVELS.has(exposureLevel) &&
    publicAllowed
  ) {
    violations.push(
      makeViolation({
        code: "BOUNDARY-PRIVATE-PUBLIC-LEAK",
        severity: "critical",
        boundary: input.boundary,
        variable_name: input.variable.variable_name,
        message: "Private or internal variable is allowed to cross a public boundary.",
      }),
    );
  }

  return violations;
}

function resolveDecision(violations: BoundaryViolation[]): BoundaryDecision {
  if (violations.some((item) => item.severity === "critical")) {
    return "BLOCK";
  }

  if (violations.some((item) => item.severity === "major")) {
    return "DEGRADE";
  }

  if (violations.length > 0) {
    return "DEGRADE";
  }

  return "ALLOW";
}

/* ============================================================================
 * 5. PUBLIC BOUNDARY API
 * ========================================================================== */

export function validateBoundaryProtection(
  input: BoundaryProtectionInput,
): BoundaryProtectionResult {
  const registry = input.registry ?? VARIABLE_LINEAGE_REGISTRY;
  const registryValidation = validateVariableLineageRegistry(registry);

  const warnings = registryValidation.ok
    ? []
    : [
        "variable_lineage_registry_invalid",
        ...registryValidation.violations.map(
          (item) => `${item.code}:${item.variable_name}`,
        ),
      ];

  const entries = normalizeRegistry(registry);
  const entryByVariable = new Map<string, RegistryEntry>();

  for (const entry of entries) {
    entryByVariable.set(entry.variable_name, entry);
  }

  const boundaryConfig = OFFICIAL_BOUNDARIES[input.boundary];
  const violations: BoundaryViolation[] = [];

  violations.push(...validateBoundaryPair(input));

  for (const variable of input.variables) {
    violations.push(
      ...validateVariableState({
        boundary: input.boundary,
        public_boundary: boundaryConfig.public_boundary,
        variable,
        entry: entryByVariable.get(variable.variable_name),
        from_layer: input.from_layer,
        to_layer: input.to_layer,
      }),
    );
  }

  const decision = resolveDecision(violations);

  return {
    ok: warnings.length === 0 && decision === "ALLOW",
    boundary: input.boundary,
    decision,
    checked_count: input.variables.length,
    violation_count: violations.length,
    violations,
    warnings,
  };
}

export function assertBoundaryProtected(
  input: BoundaryProtectionInput,
): void {
  const result = validateBoundaryProtection(input);

  if (!result.ok) {
    throw new Error(
      `boundary_protection_failed:${[
        ...result.warnings,
        ...result.violations.map(
          (item) =>
            `${item.code}:${item.variable_name ?? "boundary"}:${item.boundary}`,
        ),
      ].join(",")}`,
    );
  }
}
