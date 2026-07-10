/* ============================================================================
 * FILE: lib/xyvala/governance/propagation-audit.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala propagation audit system
 *
 * ROLE
 * - audit critical variable propagation across official governance layers
 * - compare expected lineage paths with observed runtime traces
 * - detect the first propagation divergence
 * - identify last valid layer, first invalid layer and impacted boundary
 * - provide deterministic diagnostics for governance runtime and post-mortems
 *
 * PARENTS
 * - lib/xyvala/governance/governance-layer-order.ts
 * - lib/xyvala/governance/variable-lineage-registry.ts
 * - lib/xyvala/governance/lineage-validator.ts
 * - lib/xyvala/governance/runtime-traceability.ts
 *
 * DIRECTIVES
 * - governance audit only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no snapshot mutation
 * - no API logic
 * - no UI logic
 * - no runtime mutation
 * - no local layer-order reconstruction
 * - deterministic output only
 *
 * INPUTS
 * - variable lineage registry
 * - observed runtime propagation states
 *
 * OUTPUTS
 * - PropagationAuditResult
 * - PropagationDivergence[]
 *
 * INVARIANTS
 * - audit never mutates data
 * - audit never creates analytical truth
 * - missing variables remain explicit
 * - first divergence dominates downstream symptoms
 * - official governance layer order is the only layer-order source of truth
 *
 * CRITICAL DEPENDENCIES
 * - GovernanceLayer
 * - isGovernanceLayer
 * - validateVariableLineageRegistry
 * - VARIABLE_LINEAGE_REGISTRY
 *
 * SENSITIVE ZONES
 * - first divergence detection
 * - boundary qualification
 * - propagation loss
 * - silent data disappearance
 * ========================================================================== */

import {
  isGovernanceLayer,
} from "@/lib/xyvala/governance/governance-layer-order";

import type {
  GovernanceLayer,
} from "@/lib/xyvala/governance/governance-layer-order";

import {
  VARIABLE_LINEAGE_REGISTRY,
} from "@/lib/xyvala/governance/variable-lineage-registry";

import {
  validateVariableLineageRegistry,
} from "@/lib/xyvala/governance/lineage-validator";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type PropagationLayer = GovernanceLayer;

export type PropagationStatus =
  | "observed"
  | "valid"
  | "missing"
  | "invalid"
  | "degraded"
  | "unavailable"
  | "not_observed";

export type PropagationSeverity =
  | "critical"
  | "major"
  | "minor"
  | "none";

export type ObservedVariablePropagation = {
  variable_name: string;
  layers: Partial<Record<PropagationLayer, PropagationStatus>>;
};

export type PropagationDivergence = {
  variable_name: string;
  severity: PropagationSeverity;
  last_valid_layer: PropagationLayer | null;
  first_invalid_layer: PropagationLayer | null;
  boundary: string | null;
  status: PropagationStatus;
  reason: string;
};

export type PropagationAuditResult = {
  ok: boolean;
  checked_count: number;
  divergence_count: number;
  divergences: PropagationDivergence[];
  warnings: string[];
};

type RegistryEntry = {
  variable_name: string;
  propagation_path: PropagationLayer[];
  criticality_level: string;
  validation_required: boolean;
};

/* ============================================================================
 * 2. CONSTANTS
 * ========================================================================== */

const INVALID_STATUSES = new Set<PropagationStatus>([
  "missing",
  "invalid",
  "unavailable",
]);

const VALID_STATUSES = new Set<PropagationStatus>([
  "observed",
  "valid",
  "degraded",
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

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isPropagationLayer(value: unknown): value is PropagationLayer {
  return isGovernanceLayer(value);
}

function isPropagationPath(value: unknown): value is PropagationLayer[] {
  return Array.isArray(value) && value.every(isPropagationLayer);
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
    isPropagationPath(value.propagation_path) &&
    isNonEmptyString(value.criticality_level) &&
    isBoolean(value.validation_required)
  );
}

function severityFromCriticality(value: string): PropagationSeverity {
  if (value === "CORE_TRUTH") return "critical";
  if (value === "STRUCTURAL_SUPPORT") return "major";
  if (value === "AGGREGATED_CONTEXT") return "major";
  if (value === "CALIBRATION_VARIABLE") return "major";
  if (value === "PROJECTION_VARIABLE") return "minor";

  return "major";
}

function buildBoundary(
  left: PropagationLayer | null,
  right: PropagationLayer | null,
): string | null {
  if (!left || !right) return null;

  return `${left} -> ${right}`;
}

function findObservedStatus(
  observed: ObservedVariablePropagation | undefined,
  layer: PropagationLayer,
): PropagationStatus {
  return observed?.layers[layer] ?? "not_observed";
}

function buildRegistryWarnings(
  validation: ReturnType<typeof validateVariableLineageRegistry>,
): string[] {
  if (validation.ok) return [];

  return [
    "variable_lineage_registry_invalid",
    ...validation.violations.map(
      (violation) => `${violation.code}:${violation.variable_name}`,
    ),
  ];
}

/* ============================================================================
 * 4. FIRST DIVERGENCE DETECTION
 * ========================================================================== */

function detectFirstDivergence(input: {
  entry: RegistryEntry;
  observed?: ObservedVariablePropagation;
}): PropagationDivergence | null {
  const expectedPath = input.entry.propagation_path;

  if (expectedPath.length === 0) {
    return {
      variable_name: input.entry.variable_name,
      severity: severityFromCriticality(input.entry.criticality_level),
      last_valid_layer: null,
      first_invalid_layer: null,
      boundary: null,
      status: "invalid",
      reason: "propagation_path_invalid_or_empty",
    };
  }

  let lastValidLayer: PropagationLayer | null = null;

  for (const layer of expectedPath) {
    const status = findObservedStatus(input.observed, layer);

    if (VALID_STATUSES.has(status)) {
      lastValidLayer = layer;
      continue;
    }

    if (INVALID_STATUSES.has(status)) {
      return {
        variable_name: input.entry.variable_name,
        severity: severityFromCriticality(input.entry.criticality_level),
        last_valid_layer: lastValidLayer,
        first_invalid_layer: layer,
        boundary: buildBoundary(lastValidLayer, layer),
        status,
        reason: "first_divergence_detected",
      };
    }

    if (status === "not_observed" && input.entry.validation_required) {
      return {
        variable_name: input.entry.variable_name,
        severity: severityFromCriticality(input.entry.criticality_level),
        last_valid_layer: lastValidLayer,
        first_invalid_layer: layer,
        boundary: buildBoundary(lastValidLayer, layer),
        status,
        reason: "required_layer_not_observed",
      };
    }
  }

  return null;
}

/* ============================================================================
 * 5. OBSERVED INDEX
 * ========================================================================== */

function buildObservedIndex(
  observed: readonly ObservedVariablePropagation[],
): Map<string, ObservedVariablePropagation> {
  const observedByVariable = new Map<string, ObservedVariablePropagation>();

  for (const item of observed) {
    if (isNonEmptyString(item.variable_name)) {
      observedByVariable.set(item.variable_name, item);
    }
  }

  return observedByVariable;
}

/* ============================================================================
 * 6. PUBLIC AUDIT API
 * ========================================================================== */

export function auditVariablePropagation(input: {
  observed: ObservedVariablePropagation[];
  registry?: unknown;
}): PropagationAuditResult {
  const registry = input.registry ?? VARIABLE_LINEAGE_REGISTRY;
  const registryValidation = validateVariableLineageRegistry(registry);

  const warnings = buildRegistryWarnings(registryValidation);
  const entries = normalizeRegistry(registry);
  const observedByVariable = buildObservedIndex(input.observed);

  const divergences: PropagationDivergence[] = [];

  for (const entry of entries) {
    const observed = observedByVariable.get(entry.variable_name);

    if (!observed) {
      divergences.push({
        variable_name: entry.variable_name,
        severity: severityFromCriticality(entry.criticality_level),
        last_valid_layer: null,
        first_invalid_layer: null,
        boundary: null,
        status: "not_observed",
        reason: "variable_not_observed",
      });

      continue;
    }

    const divergence = detectFirstDivergence({
      entry,
      observed,
    });

    if (divergence) {
      divergences.push(divergence);
    }
  }

  return {
    ok: warnings.length === 0 && divergences.length === 0,
    checked_count: entries.length,
    divergence_count: divergences.length,
    divergences,
    warnings,
  };
}

export function assertVariablePropagationValid(input: {
  observed: ObservedVariablePropagation[];
  registry?: unknown;
}): void {
  const result = auditVariablePropagation(input);

  if (!result.ok) {
    throw new Error(
      `variable_propagation_audit_failed:${[
        ...result.warnings,
        ...result.divergences.map(
          (item) =>
            `${item.variable_name}:${item.reason}:${
              item.boundary ?? "unknown_boundary"
            }`,
        ),
      ].join(",")}`,
    );
  }
}

