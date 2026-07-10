/* ============================================================================
 * FILE: lib/xyvala/governance/governance-registry.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala governance registry
 *
 * ROLE
 * - define the official registry of Xyvala governance components
 * - centralize governance component identity, responsibility, layer and status
 * - provide a deterministic read-only governance registry snapshot
 * - preserve governance discoverability without runtime mutation
 *
 * DIRECTIVES
 * - governance registry only
 * - observe layer only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no snapshot mutation
 * - no cache mutation
 * - no persistence
 * - no event bus
 * - no runtime mutation
 * - no API response building
 * - no UI logic
 * - deterministic output only
 *
 * INVARIANTS
 * - registry never creates analytical truth
 * - registry never mutates runtime state
 * - registry only declares governance components
 * - every governance component must have one responsibility
 * - governance components must remain traceable and auditable
 *
 * CRITICAL DEPENDENCIES
 * - none
 *
 * SENSITIVE ZONES
 * - governance component identity
 * - runtime/observe/mutate separation
 * - registry completeness
 * ========================================================================== */

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export const XYVALA_GOVERNANCE_REGISTRY_VERSION = "governance-registry-v1" as const;

export type GovernanceComponentLayer =
  | "GOVERNANCE_REGISTRY"
  | "VARIABLE_LINEAGE"
  | "LINEAGE_VALIDATION"
  | "PROPAGATION_AUDIT"
  | "BOUNDARY_PROTECTION"
  | "BOUNDARY_REGISTRY"
  | "RUNTIME_TRACEABILITY"
  | "FIRST_DIVERGENCE"
  | "GOVERNANCE_REPORT"
  | "GOVERNANCE_ORCHESTRATION"
  | "LINEAGE_OBSERVABILITY"
  | "GOVERNANCE_SNAPSHOT"
  | "GOVERNANCE_HEALTH"
  | "GOVERNANCE_RUNTIME"
  | "RUNTIME_GOVERNANCE_REGISTRY";

export type GovernanceComponentExecutionLayer =
  | "OBSERVE"
  | "COMPUTE"
  | "MUTATE";

export type GovernanceComponentStatus =
  | "ACTIVE"
  | "DEPRECATED"
  | "BLOCKED";

export type GovernanceComponentRiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type GovernanceComponentRegistryEntry = {
  component_key: string;
  file_path: string;
  layer: GovernanceComponentLayer;
  execution_layer: GovernanceComponentExecutionLayer;
  status: GovernanceComponentStatus;
  risk_level: GovernanceComponentRiskLevel;
  responsibility: string;
  parents: string[];
  public_exposure_allowed: false;
  mutation_allowed: false;
  event_bus_allowed: false;
  persistence_allowed: false;
  analytical_recalculation_allowed: false;
  protocol_reference: string[];
};

export type GovernanceRegistrySnapshot = {
  ok: boolean;
  version: typeof XYVALA_GOVERNANCE_REGISTRY_VERSION;
  component_count: number;
  active_count: number;
  deprecated_count: number;
  blocked_count: number;
  observe_count: number;
  compute_count: number;
  mutate_count: number;
  critical_risk_count: number;
  components: readonly GovernanceComponentRegistryEntry[];
  warnings: string[];
  error: string | null;
};

export type GovernanceRegistryValidationResult = {
  ok: boolean;
  checked_count: number;
  violation_count: number;
  warnings: string[];
  violations: string[];
};

/* ============================================================================
 * 2. REGISTRY HELPER
 * ========================================================================== */

function component(
  input: GovernanceComponentRegistryEntry,
): GovernanceComponentRegistryEntry {
  return Object.freeze({
    ...input,
    parents: [...input.parents],
    protocol_reference: [...input.protocol_reference],
  });
}

/* ============================================================================
 * 3. OFFICIAL GOVERNANCE COMPONENT REGISTRY
 * ========================================================================== */

export const GOVERNANCE_COMPONENT_REGISTRY = Object.freeze([
  component({
    component_key: "variable_lineage_registry",
    file_path: "lib/xyvala/governance/variable-lineage-registry.ts",
    layer: "VARIABLE_LINEAGE",
    execution_layer: "OBSERVE",
    status: "ACTIVE",
    risk_level: "CRITICAL",
    responsibility:
      "Declare official critical variable ownership, lineage, exposure and propagation rules.",
    parents: [],
    public_exposure_allowed: false,
    mutation_allowed: false,
    event_bus_allowed: false,
    persistence_allowed: false,
    analytical_recalculation_allowed: false,
    protocol_reference: [
      "Variable Governance System",
      "Variable Lineage and Traceability",
    ],
  }),

  component({
    component_key: "lineage_validator",
    file_path: "lib/xyvala/governance/lineage-validator.ts",
    layer: "LINEAGE_VALIDATION",
    execution_layer: "COMPUTE",
    status: "ACTIVE",
    risk_level: "HIGH",
    responsibility:
      "Validate registry integrity and detect ownership, exposure and lineage violations.",
    parents: ["variable_lineage_registry"],
    public_exposure_allowed: false,
    mutation_allowed: false,
    event_bus_allowed: false,
    persistence_allowed: false,
    analytical_recalculation_allowed: false,
    protocol_reference: [
      "Contract Before Runtime Rule",
      "Variable Lineage Registry",
    ],
  }),

  component({
    component_key: "propagation_audit",
    file_path: "lib/xyvala/governance/propagation-audit.ts",
    layer: "PROPAGATION_AUDIT",
    execution_layer: "COMPUTE",
    status: "ACTIVE",
    risk_level: "CRITICAL",
    responsibility:
      "Audit variable propagation and identify last valid layer, first invalid layer and boundary divergence.",
    parents: ["variable_lineage_registry", "lineage_validator"],
    public_exposure_allowed: false,
    mutation_allowed: false,
    event_bus_allowed: false,
    persistence_allowed: false,
    analytical_recalculation_allowed: false,
    protocol_reference: [
      "Propagation Audit Rule",
      "First Divergence Rule",
    ],
  }),

  component({
    component_key: "boundary_protection",
    file_path: "lib/xyvala/governance/boundary-protection.ts",
    layer: "BOUNDARY_PROTECTION",
    execution_layer: "COMPUTE",
    status: "ACTIVE",
    risk_level: "CRITICAL",
    responsibility:
      "Validate official boundary crossings and prevent unauthorized private/public propagation.",
    parents: ["variable_lineage_registry", "lineage_validator"],
    public_exposure_allowed: false,
    mutation_allowed: false,
    event_bus_allowed: false,
    persistence_allowed: false,
    analytical_recalculation_allowed: false,
    protocol_reference: [
      "Boundary Protection System",
      "Public Exposure Governance System",
    ],
  }),

  component({
    component_key: "runtime_traceability",
    file_path: "lib/xyvala/governance/runtime-traceability.ts",
    layer: "RUNTIME_TRACEABILITY",
    execution_layer: "COMPUTE",
    status: "ACTIVE",
    risk_level: "HIGH",
    responsibility:
      "Normalize runtime trace observations into propagation audit inputs without creating analytical truth.",
    parents: ["propagation_audit"],
    public_exposure_allowed: false,
    mutation_allowed: false,
    event_bus_allowed: false,
    persistence_allowed: false,
    analytical_recalculation_allowed: false,
    protocol_reference: [
      "Runtime Traceability",
      "Observability by Layer",
    ],
  }),

  component({
    component_key: "first_divergence_detector",
    file_path: "lib/xyvala/governance/first-divergence-detector.ts",
    layer: "FIRST_DIVERGENCE",
    execution_layer: "COMPUTE",
    status: "ACTIVE",
    risk_level: "CRITICAL",
    responsibility:
      "Select and expose the first validated divergence before downstream symptoms.",
    parents: ["propagation_audit", "runtime_traceability"],
    public_exposure_allowed: false,
    mutation_allowed: false,
    event_bus_allowed: false,
    persistence_allowed: false,
    analytical_recalculation_allowed: false,
    protocol_reference: ["First Divergence Rule"],
  }),

  component({
    component_key: "governance_report",
    file_path: "lib/xyvala/governance/governance-report.ts",
    layer: "GOVERNANCE_REPORT",
    execution_layer: "COMPUTE",
    status: "ACTIVE",
    risk_level: "HIGH",
    responsibility:
      "Consolidate lineage, traceability, propagation and first divergence diagnostics into one report.",
    parents: [
      "lineage_validator",
      "propagation_audit",
      "runtime_traceability",
      "first_divergence_detector",
    ],
    public_exposure_allowed: false,
    mutation_allowed: false,
    event_bus_allowed: false,
    persistence_allowed: false,
    analytical_recalculation_allowed: false,
    protocol_reference: [
      "Observability by Layer",
      "Propagation Audit Rule",
    ],
  }),

  component({
    component_key: "governance_orchestrator",
    file_path: "lib/xyvala/governance/governance-orchestrator.ts",
    layer: "GOVERNANCE_ORCHESTRATION",
    execution_layer: "COMPUTE",
    status: "ACTIVE",
    risk_level: "HIGH",
    responsibility:
      "Provide a single deterministic governance diagnostic entry point.",
    parents: ["governance_report", "boundary_protection"],
    public_exposure_allowed: false,
    mutation_allowed: false,
    event_bus_allowed: false,
    persistence_allowed: false,
    analytical_recalculation_allowed: false,
    protocol_reference: ["Governance Runtime", "Boundary Protection System"],
  }),

  component({
    component_key: "boundary_registry",
    file_path: "lib/xyvala/governance/boundary-registry.ts",
    layer: "BOUNDARY_REGISTRY",
    execution_layer: "OBSERVE",
    status: "ACTIVE",
    risk_level: "CRITICAL",
    responsibility:
      "Declare official Xyvala propagation boundaries, controls and protected private variables.",
    parents: [],
    public_exposure_allowed: false,
    mutation_allowed: false,
    event_bus_allowed: false,
    persistence_allowed: false,
    analytical_recalculation_allowed: false,
    protocol_reference: [
      "Boundary Protection System",
      "Public Exposure Governance System",
    ],
  }),

  component({
    component_key: "lineage_observability",
    file_path: "lib/xyvala/governance/lineage-observability.ts",
    layer: "LINEAGE_OBSERVABILITY",
    execution_layer: "OBSERVE",
    status: "ACTIVE",
    risk_level: "HIGH",
    responsibility:
      "Expose read-only observability summaries for lineage, boundary and divergence governance.",
    parents: [
      "variable_lineage_registry",
      "boundary_registry",
      "governance_orchestrator",
    ],
    public_exposure_allowed: false,
    mutation_allowed: false,
    event_bus_allowed: false,
    persistence_allowed: false,
    analytical_recalculation_allowed: false,
    protocol_reference: [
      "Observability by Layer",
      "Variable Lineage and Traceability",
    ],
  }),

  component({
    component_key: "governance_snapshot",
    file_path: "lib/xyvala/governance/governance-snapshot.ts",
    layer: "GOVERNANCE_SNAPSHOT",
    execution_layer: "COMPUTE",
    status: "ACTIVE",
    risk_level: "HIGH",
    responsibility:
      "Build immutable governance snapshots from already produced governance observability reports.",
    parents: ["lineage_observability"],
    public_exposure_allowed: false,
    mutation_allowed: false,
    event_bus_allowed: false,
    persistence_allowed: false,
    analytical_recalculation_allowed: false,
    protocol_reference: [
      "Snapshot — Frontière sacrée",
      "Knowledge Preservation System",
    ],
  }),

  component({
    component_key: "governance_health",
    file_path: "lib/xyvala/governance/governance-health.ts",
    layer: "GOVERNANCE_HEALTH",
    execution_layer: "COMPUTE",
    status: "ACTIVE",
    risk_level: "HIGH",
    responsibility:
      "Derive deterministic governance health from governance snapshots without mutation.",
    parents: ["governance_snapshot"],
    public_exposure_allowed: false,
    mutation_allowed: false,
    event_bus_allowed: false,
    persistence_allowed: false,
    analytical_recalculation_allowed: false,
    protocol_reference: [
      "Operational Resilience System",
      "Observability by Layer",
    ],
  }),

  component({
    component_key: "governance_runtime",
    file_path: "lib/xyvala/governance/governance-runtime.ts",
    layer: "GOVERNANCE_RUNTIME",
    execution_layer: "COMPUTE",
    status: "ACTIVE",
    risk_level: "HIGH",
    responsibility:
      "Compose governance snapshot and health report into one deterministic runtime governance state.",
    parents: ["governance_snapshot", "governance_health"],
    public_exposure_allowed: false,
    mutation_allowed: false,
    event_bus_allowed: false,
    persistence_allowed: false,
    analytical_recalculation_allowed: false,
    protocol_reference: [
      "Runtime Governance",
      "Operational Resilience System",
    ],
  }),

  component({
    component_key: "runtime_governance_registry",
    file_path: "lib/xyvala/runtime/registry/runtime-governance-registry.ts",
    layer: "RUNTIME_GOVERNANCE_REGISTRY",
    execution_layer: "OBSERVE",
    status: "ACTIVE",
    risk_level: "CRITICAL",
    responsibility:
      "Aggregate runtime governance read models without publishing events or mutating runtime state.",
    parents: [],
    public_exposure_allowed: false,
    mutation_allowed: false,
    event_bus_allowed: false,
    persistence_allowed: false,
    analytical_recalculation_allowed: false,
    protocol_reference: [
      "Frontières d’exécution officielles",
      "Pureté des readers",
      "Runtime Governance",
    ],
  }),
] satisfies readonly GovernanceComponentRegistryEntry[]);

/* ============================================================================
 * 4. OBSERVE HELPERS
 * ========================================================================== */

export function listGovernanceRegistryComponents(): readonly GovernanceComponentRegistryEntry[] {
  return GOVERNANCE_COMPONENT_REGISTRY;
}

export function getGovernanceRegistryComponent(
  componentKey: string,
): GovernanceComponentRegistryEntry | null {
  return (
    GOVERNANCE_COMPONENT_REGISTRY.find(
      (entry) => entry.component_key === componentKey,
    ) ?? null
  );
}

export function listGovernanceComponentsByLayer(
  layer: GovernanceComponentLayer,
): readonly GovernanceComponentRegistryEntry[] {
  return GOVERNANCE_COMPONENT_REGISTRY.filter((entry) => entry.layer === layer);
}

export function listGovernanceComponentsByExecutionLayer(
  executionLayer: GovernanceComponentExecutionLayer,
): readonly GovernanceComponentRegistryEntry[] {
  return GOVERNANCE_COMPONENT_REGISTRY.filter(
    (entry) => entry.execution_layer === executionLayer,
  );
}

/* ============================================================================
 * 5. VALIDATION
 * ========================================================================== */

export function validateGovernanceRegistry(): GovernanceRegistryValidationResult {
  const warnings: string[] = [];
  const violations: string[] = [];
  const keys = new Set<string>();

  for (const entry of GOVERNANCE_COMPONENT_REGISTRY) {
    if (keys.has(entry.component_key)) {
      violations.push(`GOVERNANCE_COMPONENT_DUPLICATE:${entry.component_key}`);
    }

    keys.add(entry.component_key);

    if (entry.mutation_allowed !== false) {
      violations.push(`GOVERNANCE_COMPONENT_MUTATION_ALLOWED:${entry.component_key}`);
    }

    if (entry.event_bus_allowed !== false) {
      violations.push(`GOVERNANCE_COMPONENT_EVENT_BUS_ALLOWED:${entry.component_key}`);
    }

    if (entry.persistence_allowed !== false) {
      violations.push(`GOVERNANCE_COMPONENT_PERSISTENCE_ALLOWED:${entry.component_key}`);
    }

    if (entry.public_exposure_allowed !== false) {
      violations.push(`GOVERNANCE_COMPONENT_PUBLIC_EXPOSURE_ALLOWED:${entry.component_key}`);
    }

    if (entry.analytical_recalculation_allowed !== false) {
      violations.push(`GOVERNANCE_COMPONENT_RECALCULATION_ALLOWED:${entry.component_key}`);
    }

    if (entry.parents.some((parent) => !keys.has(parent))) {
      warnings.push(`GOVERNANCE_COMPONENT_PARENT_DECLARED_LATER:${entry.component_key}`);
    }
  }

  return {
    ok: violations.length === 0,
    checked_count: GOVERNANCE_COMPONENT_REGISTRY.length,
    violation_count: violations.length,
    warnings,
    violations,
  };
}

export function buildGovernanceRegistrySnapshot(): GovernanceRegistrySnapshot {
  const validation = validateGovernanceRegistry();

  return {
    ok: validation.ok,
    version: XYVALA_GOVERNANCE_REGISTRY_VERSION,
    component_count: GOVERNANCE_COMPONENT_REGISTRY.length,
    active_count: GOVERNANCE_COMPONENT_REGISTRY.filter(
      (entry) => entry.status === "ACTIVE",
    ).length,
    deprecated_count: GOVERNANCE_COMPONENT_REGISTRY.filter(
      (entry) => entry.status === "DEPRECATED",
    ).length,
    blocked_count: GOVERNANCE_COMPONENT_REGISTRY.filter(
      (entry) => entry.status === "BLOCKED",
    ).length,
    observe_count: GOVERNANCE_COMPONENT_REGISTRY.filter(
      (entry) => entry.execution_layer === "OBSERVE",
    ).length,
    compute_count: GOVERNANCE_COMPONENT_REGISTRY.filter(
      (entry) => entry.execution_layer === "COMPUTE",
    ).length,
    mutate_count: GOVERNANCE_COMPONENT_REGISTRY.filter(
      (entry) => entry.execution_layer === "MUTATE",
    ).length,
    critical_risk_count: GOVERNANCE_COMPONENT_REGISTRY.filter(
      (entry) => entry.risk_level === "CRITICAL",
    ).length,
    components: GOVERNANCE_COMPONENT_REGISTRY,
    warnings: validation.warnings,
    error: validation.ok ? null : "governance_registry_invalid",
  };
}

export function assertGovernanceRegistryValid(): void {
  const result = validateGovernanceRegistry();

  if (!result.ok) {
    throw new Error(
      `governance_registry_invalid:${result.violations.join(",")}`,
    );
  }
}
