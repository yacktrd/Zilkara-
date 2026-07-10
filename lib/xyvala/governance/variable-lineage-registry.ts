/* ============================================================================
 * FILE: lib/xyvala/governance/variable-lineage-registry.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala official variable lineage registry
 *
 * ROLE
 * - define the official governance registry for critical Xyvala variables
 * - declare ownership, lineage, exposure, criticality and propagation rules
 * - provide deterministic read-only helpers for governance validation
 * - support auditability, traceability and first-divergence diagnostics
 *
 * PARENTS
 * - PROTOCOLE XYVALA — CADRE OFFICIEL COMPLET
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - Propagation Audit Rule
 * - Boundary Protection System
 * - Contract Before Runtime Rule
 *
 * DIRECTIVES
 * - governance registry only
 * - no market computation
 * - no RFS computation
 * - no MCI computation
 * - no calibration computation
 * - no snapshot generation
 * - no API logic
 * - no UI logic
 * - no cache logic
 * - no persistence
 * - no mutation
 * - no event bus
 * - no runtime side effects
 * - deterministic read-only output only
 *
 * INPUTS
 * - variable names
 * - governance filters
 *
 * OUTPUTS
 * - VariableLineageEntry
 * - VariableLineageValidationResult
 * - read-only registry views
 *
 * INVARIANTS
 * - one variable = one official identity
 * - one truth = one official owner
 * - downstream layers must not reconstruct upstream truths
 * - private variables must never be publicly exposed
 * - every critical variable must remain traceable
 *
 * CRITICAL DEPENDENCIES
 * - none
 *
 * SENSITIVE ZONES
 * - ownership declarations
 * - public exposure flags
 * - propagation paths
 * - reconstruction permissions
 * ========================================================================== */

/* ============================================================================
 * 1. GOVERNANCE TYPES
 * ============================================================================
 *
 * GOVERNANCE PRINCIPLE
 * - one layer definition = one source of truth
 * - governance layers are owned by governance-layer-order.ts
 * - lineage registry consumes governance definitions
 * - no duplicated layer declarations
 * - contract stability first
 * ========================================================================== */

import type {
  GovernanceLayer,
} from "@/lib/xyvala/governance/governance-layer-order";

export type VariableCriticalityLevel =
  | "CORE_TRUTH"
  | "STRUCTURAL_SUPPORT"
  | "AGGREGATED_CONTEXT"
  | "PROJECTION_VARIABLE"
  | "CALIBRATION_VARIABLE";

export type VariableExposureLevel =
  | "PRIVATE"
  | "INTERNAL"
  | "PUBLIC";

export type VariableLineageStatus =
  | "ACTIVE"
  | "DEPRECATED"
  | "BLOCKED";

export type VariableOwnerLayer = GovernanceLayer;

export type VariableCategory =
  | "MARKET_INPUT"
  | "STRUCTURAL"
  | "RUPTURE"
  | "CRASH"
  | "TRIPLE_LAYER"
  | "IMPULSE"
  | "AGGREGATION"
  | "DECISION"
  | "CALIBRATION"
  | "SNAPSHOT"
  | "PUBLIC_PROJECTION"
  | "UI_PROJECTION";

export type VariableLineageEntry = {
  variable_name: string;

  ownership_layer: VariableOwnerLayer;
  source_truth: VariableOwnerLayer;

  contract_source: string;

  category: VariableCategory;

  criticality_level: VariableCriticalityLevel;
  exposure_level: VariableExposureLevel;

  propagation_path: VariableOwnerLayer[];

  upstream_dependencies: string[];
  downstream_consumers: VariableOwnerLayer[];

  reconstruction_allowed: false;
  public_exposure_allowed: boolean;
  validation_required: true;

  lineage_status: VariableLineageStatus;

  protocol_reference: string[];
};

export type VariableLineageValidationResult = {
  ok: boolean;
  checked_count: number;
  violation_count: number;
  warnings: string[];
  violations: string[];
};

/* ============================================================================
 * 2. REGISTRY HELPERS
 * ========================================================================== */

function entry(input: VariableLineageEntry): VariableLineageEntry {
  return Object.freeze({
    ...input,
    propagation_path: [...input.propagation_path],
    upstream_dependencies: [...input.upstream_dependencies],
    downstream_consumers: [...input.downstream_consumers],
    protocol_reference: [...input.protocol_reference],
  });
}

/* ============================================================================
 * 2.1 MARKET INPUT VARIABLES
 * ========================================================================== */

const MARKET_INPUT_VARIABLES = [
  "id",
  "symbol",
  "name",
  "price_eur",
  "chg_24h_pct",
  "chg_7d_pct",
  "sparkline_7d",
  "market_cap_eur",
  "volume_24h_eur",
  "rank",
  "logo_url",
].map((variableName) =>

  entry({
    variable_name: variableName,
    ownership_layer: "ACQUISITION",
    source_truth: "ACQUISITION",
    contract_source: "raw-assets-service",
    category: "MARKET_INPUT",
    criticality_level: "STRUCTURAL_SUPPORT",
    exposure_level: "INTERNAL",
    propagation_path: [
      "ACQUISITION",
      "RFS",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "SNAPSHOT",
      "TRANSFORMER",
      "API",
      "INTERFACE",
    ],
    upstream_dependencies: [],
    downstream_consumers: [
      "RFS",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "SNAPSHOT",
      "TRANSFORMER",
      "API",
      "INTERFACE",
    ],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: [
      "Data Acquisition",
      "Variable Governance System",
      "Contract Before Runtime Rule",
    ],
  }),
) satisfies VariableLineageEntry[];

/* ============================================================================
 * 3. CORE TRUTH VARIABLES
 * ========================================================================== */

const CORE_TRUTH_VARIABLES = [
  entry({
    variable_name: "stability_score",
    ownership_layer: "RFS",
    source_truth: "RFS",
    contract_source: "rfs-market",
    category: "STRUCTURAL",
    criticality_level: "CORE_TRUTH",
    exposure_level: "PUBLIC",
    propagation_path: [
      "RFS",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
      "SNAPSHOT",
      "TRANSFORMER",
      "API",
      "INTERFACE",
    ],
    upstream_dependencies: ["price_eur", "sparkline_7d"],
    downstream_consumers: [
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
      "SNAPSHOT",
      "API",
      "INTERFACE",
    ],
    reconstruction_allowed: false,
    public_exposure_allowed: true,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: [
      "RFS — Vérité structurelle",
      "Variable Governance System",
      "Public Exposure Governance System",
    ],
  }),

  entry({
    variable_name: "regime",
    ownership_layer: "RFS",
    source_truth: "RFS",
    contract_source: "rfs-market",
    category: "STRUCTURAL",
    criticality_level: "CORE_TRUTH",
    exposure_level: "PRIVATE",
    propagation_path: ["RFS", "ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    upstream_dependencies: ["stability_score", "rupture_score"],
    downstream_consumers: ["ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: [
      "RFS — Vérité structurelle",
      "Interdiction des expositions publiques sensibles",
    ],
  }),

  entry({
    variable_name: "rupture_score",
    ownership_layer: "RFS",
    source_truth: "RFS",
    contract_source: "rfs-market",
    category: "RUPTURE",
    criticality_level: "CORE_TRUTH",
    exposure_level: "PRIVATE",
    propagation_path: ["RFS", "ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    upstream_dependencies: ["sparkline_7d", "chg_24h_pct", "chg_7d_pct"],
    downstream_consumers: ["ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: [
      "RFS — Vérité structurelle",
      "Rupture Evolution System",
      "Public Exposure Governance System",
    ],
  }),

  entry({
    variable_name: "rupture_probability",
    ownership_layer: "RFS",
    source_truth: "RFS",
    contract_source: "rfs-market",
    category: "RUPTURE",
    criticality_level: "CORE_TRUTH",
    exposure_level: "PRIVATE",
    propagation_path: ["RFS", "ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    upstream_dependencies: ["rupture_score"],
    downstream_consumers: ["ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: [
      "RFS — Vérité structurelle",
      "Interdiction des expositions publiques sensibles",
    ],
  }),

  entry({
    variable_name: "continuity_probability",
    ownership_layer: "RFS",
    source_truth: "RFS",
    contract_source: "rfs-market",
    category: "STRUCTURAL",
    criticality_level: "CORE_TRUTH",
    exposure_level: "PRIVATE",
    propagation_path: ["RFS", "ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    upstream_dependencies: ["rupture_score", "stability_score"],
    downstream_consumers: ["ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["RFS — Vérité structurelle"],
  }),

  entry({
    variable_name: "crash_score",
    ownership_layer: "CRASH_SYSTEM",
    source_truth: "CRASH_SYSTEM",
    contract_source: "crash-system",
    category: "CRASH",
    criticality_level: "CORE_TRUTH",
    exposure_level: "PRIVATE",
    propagation_path: ["CRASH_SYSTEM", "ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    upstream_dependencies: ["rupture_score", "rupture_probability"],
    downstream_consumers: ["ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Crash System", "Public Exposure Governance System"],
  }),

  entry({
    variable_name: "crash_state",
    ownership_layer: "CRASH_SYSTEM",
    source_truth: "CRASH_SYSTEM",
    contract_source: "crash-system",
    category: "CRASH",
    criticality_level: "CORE_TRUTH",
    exposure_level: "PRIVATE",
    propagation_path: ["CRASH_SYSTEM", "ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    upstream_dependencies: ["crash_score"],
    downstream_consumers: ["ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Crash System"],
  }),
] as const;

/* ============================================================================
 * 4. STRUCTURAL SUPPORT VARIABLES
 * ========================================================================== */

const STRUCTURAL_SUPPORT_VARIABLES = [
  entry({
    variable_name: "growth_layer",
    ownership_layer: "TRIPLE_LAYER",
    source_truth: "TRIPLE_LAYER",
    contract_source: "triple-layer",
    category: "TRIPLE_LAYER",
    criticality_level: "STRUCTURAL_SUPPORT",
    exposure_level: "INTERNAL",
    propagation_path: [
      "TRIPLE_LAYER",
      "IMPULSE_LAYER",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
    ],
    upstream_dependencies: ["stability_score", "regime"],
    downstream_consumers: [
      "IMPULSE_LAYER",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
    ],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Triple Layer System", "XII-bis"],
  }),

  entry({
    variable_name: "core_pattern_layer",
    ownership_layer: "TRIPLE_LAYER",
    source_truth: "TRIPLE_LAYER",
    contract_source: "triple-layer",
    category: "TRIPLE_LAYER",
    criticality_level: "STRUCTURAL_SUPPORT",
    exposure_level: "INTERNAL",
    propagation_path: [
      "TRIPLE_LAYER",
      "IMPULSE_LAYER",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
    ],
    upstream_dependencies: ["stability_score", "regime"],
    downstream_consumers: [
      "IMPULSE_LAYER",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
    ],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Triple Layer System", "XII-bis"],
  }),

  entry({
    variable_name: "decay_layer",
    ownership_layer: "TRIPLE_LAYER",
    source_truth: "TRIPLE_LAYER",
    contract_source: "triple-layer",
    category: "TRIPLE_LAYER",
    criticality_level: "STRUCTURAL_SUPPORT",
    exposure_level: "INTERNAL",
    propagation_path: [
      "TRIPLE_LAYER",
      "IMPULSE_LAYER",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
    ],
    upstream_dependencies: ["rupture_score", "stability_score"],
    downstream_consumers: [
      "IMPULSE_LAYER",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
    ],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Triple Layer System", "XII-bis"],
  }),

  entry({
    variable_name: "impulse_pressure_score",
    ownership_layer: "IMPULSE_LAYER",
    source_truth: "IMPULSE_LAYER",
    contract_source: "impulse-state-core",
    category: "IMPULSE",
    criticality_level: "STRUCTURAL_SUPPORT",
    exposure_level: "PRIVATE",
    propagation_path: ["IMPULSE_LAYER", "ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    upstream_dependencies: [
      "stability_score",
      "rupture_score",
      "growth_layer",
      "core_pattern_layer",
      "decay_layer",
    ],
    downstream_consumers: ["ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: [
      "Impulse Layer System",
      "Impulse Propagation System",
      "Governance of Impulse Variables",
    ],
  }),

  entry({
    variable_name: "impulse_instability_score",
    ownership_layer: "IMPULSE_LAYER",
    source_truth: "IMPULSE_LAYER",
    contract_source: "impulse-state-core",
    category: "IMPULSE",
    criticality_level: "STRUCTURAL_SUPPORT",
    exposure_level: "PRIVATE",
    propagation_path: ["IMPULSE_LAYER", "ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    upstream_dependencies: ["rupture_score", "rupture_probability"],
    downstream_consumers: ["ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Impulse Propagation System"],
  }),

  entry({
    variable_name: "impulse_saturation_score",
    ownership_layer: "IMPULSE_LAYER",
    source_truth: "IMPULSE_LAYER",
    contract_source: "impulse-state-core",
    category: "IMPULSE",
    criticality_level: "STRUCTURAL_SUPPORT",
    exposure_level: "PRIVATE",
    propagation_path: ["IMPULSE_LAYER", "ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    upstream_dependencies: ["impulse_pressure_score", "rupture_score"],
    downstream_consumers: ["ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Impulse Propagation System"],
  }),

  entry({
    variable_name: "impulse_exhaustion_score",
    ownership_layer: "IMPULSE_LAYER",
    source_truth: "IMPULSE_LAYER",
    contract_source: "impulse-state-core",
    category: "IMPULSE",
    criticality_level: "STRUCTURAL_SUPPORT",
    exposure_level: "PRIVATE",
    propagation_path: ["IMPULSE_LAYER", "ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    upstream_dependencies: ["impulse_saturation_score", "decay_layer"],
    downstream_consumers: ["ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Impulse Propagation System"],
  }),

  entry({
    variable_name: "impulse_directional_bias",
    ownership_layer: "IMPULSE_LAYER",
    source_truth: "IMPULSE_LAYER",
    contract_source: "impulse-state-core",
    category: "IMPULSE",
    criticality_level: "STRUCTURAL_SUPPORT",
    exposure_level: "PRIVATE",
    propagation_path: ["IMPULSE_LAYER", "ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    upstream_dependencies: ["impulse_pressure_score"],
    downstream_consumers: ["ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Impulse Propagation System"],
  }),

  entry({
    variable_name: "impulse_transition_state",
    ownership_layer: "IMPULSE_LAYER",
    source_truth: "IMPULSE_LAYER",
    contract_source: "impulse-state-core",
    category: "IMPULSE",
    criticality_level: "STRUCTURAL_SUPPORT",
    exposure_level: "INTERNAL",
    propagation_path: [
      "IMPULSE_LAYER",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
      "SNAPSHOT",
      "TRANSFORMER",
      "API",
    ],
    upstream_dependencies: [
      "impulse_pressure_score",
      "impulse_instability_score",
      "impulse_saturation_score",
      "impulse_exhaustion_score",
    ],
    downstream_consumers: [
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
      "SNAPSHOT",
      "TRANSFORMER",
      "API",
    ],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Impulse Propagation System"],
  }),
] as const;

/* ============================================================================
 * 4.1 RFS SUPPORT VARIABLES
 * ============================================================================
 *
 * GOVERNANCE ROLE
 * - trace RFS structural support scores present in the private scan contract
 * - keep structural support variables separated from core truths
 * - prevent downstream reconstruction of RFS-derived support measurements
 *
 * PROTOCOL ALIGNMENT
 * - RFS remains the only owner of structural support scores
 * - these variables support stability and structure reading
 * - they do not replace stability_score
 * - they are not public decision signals
 * ========================================================================== */

const RFS_SUPPORT_VARIABLES = [
  "structure_score",
  "market_score",
  "coherence_score",
  "occurrence_score",
  "frequency_score",
  "convergence_score",
  "duration_score",
  "evolution_score",
  "growth_score",
].map((variableName) =>
  entry({
    variable_name: variableName,
    ownership_layer: "RFS",
    source_truth: "RFS",
    contract_source: "scan-private-contract",
    category: "STRUCTURAL",
    criticality_level: "STRUCTURAL_SUPPORT",
    exposure_level: "PRIVATE",
    propagation_path: ["RFS", "ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    upstream_dependencies: ["price_eur", "sparkline_7d"],
    downstream_consumers: ["ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: [
      "RFS — Vérité structurelle",
      "Variable Governance System",
      "Variable Lineage and Traceability",
      "Propagation Audit Rule",
    ],
  }),
) satisfies VariableLineageEntry[];

/* ============================================================================
 * 4.2 PRIVATE EXTENDED TRACE VARIABLES
 * ============================================================================
 *
 * GOVERNANCE ROLE
 * - register private analytical fields produced by PrivateScanAsset
 * - prevent valid private fields from being treated as registry orphans
 * - keep all sensitive decision, rupture, calibration and neutralization values private
 *
 * PROTOCOL ALIGNMENT
 * - private variables remain internal
 * - no public exposure
 * - no reconstruction
 * - runtime traceability observes existing fields only
 * ========================================================================== */

const PRIVATE_RUPTURE_SUPPORT_VARIABLES = [
  "rupture_penalty_score",
  "rupture_occurrence_score",
  "rupture_frequency_score",
  "rupture_convergence_score",
  "rupture_duration_score",
  "rupture_evolution_score",
  "rupture_evolution_state",
  "rupture_acceleration_score",
].map((variableName) =>
  entry({
    variable_name: variableName,
    ownership_layer: "RFS",
    source_truth: "RFS",
    contract_source: "scan-private-contract",
    category: "RUPTURE",
    criticality_level: "STRUCTURAL_SUPPORT",
    exposure_level: "PRIVATE",
    propagation_path: ["RFS", "ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    upstream_dependencies: ["rupture_score", "rupture_probability"],
    downstream_consumers: ["ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: [
      "Rupture Evolution System",
      "Variable Lineage and Traceability",
    ],
  }),
) satisfies VariableLineageEntry[];

const PRIVATE_STATUS_VARIABLES = [
  "stability_status",
  "growth_status",
  "core_status",
  "decay_status",
  "impulse_status",
].map((variableName) =>
  entry({
    variable_name: variableName,
    ownership_layer: "ANALYTICAL_AGGREGATION_SYSTEM",
    source_truth: "ANALYTICAL_AGGREGATION_SYSTEM",
    contract_source: "scan-private-contract",
    category: "AGGREGATION",
    criticality_level: "STRUCTURAL_SUPPORT",
    exposure_level: "PRIVATE",
    propagation_path: ["ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    upstream_dependencies: [],
    downstream_consumers: ["MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: [
      "Variable Governance System",
      "Controlled Degradation",
    ],
  }),
) satisfies VariableLineageEntry[];

const PRIVATE_TRIPLE_LAYER_SUPPORT_VARIABLES = [
  "state",
  "core_pattern_score",
  "decay_score",
].map((variableName) =>
  entry({
    variable_name: variableName,
    ownership_layer: "TRIPLE_LAYER",
    source_truth: "TRIPLE_LAYER",
    contract_source: "scan-private-contract",
    category: "TRIPLE_LAYER",
    criticality_level: "STRUCTURAL_SUPPORT",
    exposure_level: "PRIVATE",
    propagation_path: [
      "TRIPLE_LAYER",
      "IMPULSE_LAYER",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
    ],
    upstream_dependencies: ["stability_score", "regime", "rupture_score"],
    downstream_consumers: [
      "IMPULSE_LAYER",
      "ANALYTICAL_AGGREGATION_SYSTEM",
      "MCI",
    ],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Triple Layer System", "Variable Governance System"],
  }),
) satisfies VariableLineageEntry[];

const PRIVATE_IMPULSE_SUPPORT_VARIABLES = [
  "impulse_acceleration_score",
  "impulse_alignment_score",
].map((variableName) =>
  entry({
    variable_name: variableName,
    ownership_layer: "IMPULSE_LAYER",
    source_truth: "IMPULSE_LAYER",
    contract_source: "scan-private-contract",
    category: "IMPULSE",
    criticality_level: "STRUCTURAL_SUPPORT",
    exposure_level: "PRIVATE",
    propagation_path: ["IMPULSE_LAYER", "ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    upstream_dependencies: ["impulse_pressure_score"],
    downstream_consumers: ["ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Impulse Layer System", "Impulse Propagation System"],
  }),
) satisfies VariableLineageEntry[];

const PRIVATE_MCI_SUPPORT_VARIABLES = [
  "decision_status",
  "opportunity_score",
  "opportunity_status",
  "confidence_score",
  "confidence_status",
].map((variableName) =>
  entry({
    variable_name: variableName,
    ownership_layer: "MCI",
    source_truth: "MCI",
    contract_source: "scan-private-contract",
    category: "DECISION",
    criticality_level: "STRUCTURAL_SUPPORT",
    exposure_level: "PRIVATE",
    propagation_path: ["MCI", "CALIBRATION"],
    upstream_dependencies: ["decision"],
    downstream_consumers: ["CALIBRATION"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: [
      "MCI — Orchestration décisionnelle privée",
      "Public Exposure Governance System",
    ],
  }),
) satisfies VariableLineageEntry[];

const PRIVATE_NEUTRALIZATION_VARIABLES = [
  "neutralized",
  "neutralization_reason",
  "neutralization_severity",
  "neutralization_validity",
].map((variableName) =>
  entry({
    variable_name: variableName,
    ownership_layer: "MCI",
    source_truth: "MCI",
    contract_source: "scan-private-contract",
    category: "DECISION",
    criticality_level: "STRUCTURAL_SUPPORT",
    exposure_level: "PRIVATE",
    propagation_path: ["MCI", "CALIBRATION"],
    upstream_dependencies: ["decision", "confidence_score", "rupture_score"],
    downstream_consumers: ["CALIBRATION"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: [
      "Neutralization System",
      "Controlled Degradation",
      "Public Exposure Governance System",
    ],
  }),
) satisfies VariableLineageEntry[];

const PRIVATE_CALIBRATION_STATUS_VARIABLES = [
  "calibration_status",
  "calibration_source",
  "calibration_version",
].map((variableName) =>
  entry({
    variable_name: variableName,
    ownership_layer: "CALIBRATION",
    source_truth: "CALIBRATION",
    contract_source: "scan-private-contract",
    category: "CALIBRATION",
    criticality_level: "CALIBRATION_VARIABLE",
    exposure_level: "PRIVATE",
    propagation_path: ["CALIBRATION"],
    upstream_dependencies: ["decision", "decision_status"],
    downstream_consumers: ["MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: [
      "Calibration",
      "Variable Governance System",
      "Public Exposure Governance System",
    ],
  }),
) satisfies VariableLineageEntry[];

/* ============================================================================
 * 5. AGGREGATED CONTEXT VARIABLES
 * ========================================================================== */

const AGGREGATED_CONTEXT_VARIABLES = [
  entry({
    variable_name: "structural_context",
    ownership_layer: "ANALYTICAL_AGGREGATION_SYSTEM",
    source_truth: "ANALYTICAL_AGGREGATION_SYSTEM",
    contract_source: "analytical-aggregation",
    category: "AGGREGATION",
    criticality_level: "AGGREGATED_CONTEXT",
    exposure_level: "INTERNAL",
    propagation_path: ["ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    upstream_dependencies: [
      "stability_score",
      "regime",
      "rupture_score",
      "rupture_probability",
    ],
    downstream_consumers: ["MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Analytical Aggregation System"],
  }),

  entry({
    variable_name: "transition_context",
    ownership_layer: "ANALYTICAL_AGGREGATION_SYSTEM",
    source_truth: "ANALYTICAL_AGGREGATION_SYSTEM",
    contract_source: "analytical-aggregation",
    category: "AGGREGATION",
    criticality_level: "AGGREGATED_CONTEXT",
    exposure_level: "INTERNAL",
    propagation_path: ["ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    upstream_dependencies: [
      "growth_layer",
      "core_pattern_layer",
      "decay_layer",
      "impulse_transition_state",
      "impulse_directional_bias",
    ],
    downstream_consumers: ["MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Analytical Aggregation System"],
  }),

  entry({
    variable_name: "risk_context",
    ownership_layer: "ANALYTICAL_AGGREGATION_SYSTEM",
    source_truth: "ANALYTICAL_AGGREGATION_SYSTEM",
    contract_source: "analytical-aggregation",
    category: "AGGREGATION",
    criticality_level: "AGGREGATED_CONTEXT",
    exposure_level: "INTERNAL",
    propagation_path: ["ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    upstream_dependencies: [
      "crash_score",
      "crash_state",
      "rupture_score",
      "rupture_probability",
    ],
    downstream_consumers: ["MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Analytical Aggregation System", "Crash System"],
  }),

  entry({
    variable_name: "temporal_context",
    ownership_layer: "ANALYTICAL_AGGREGATION_SYSTEM",
    source_truth: "ANALYTICAL_AGGREGATION_SYSTEM",
    contract_source: "analytical-aggregation",
    category: "AGGREGATION",
    criticality_level: "AGGREGATED_CONTEXT",
    exposure_level: "INTERNAL",
    propagation_path: ["ANALYTICAL_AGGREGATION_SYSTEM", "MCI"],
    upstream_dependencies: ["chg_24h_pct", "chg_7d_pct", "sparkline_7d"],
    downstream_consumers: ["MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Horizons temporels obligatoires"],
  }),
] as const;

/* ============================================================================
 * 6. DECISION AND CALIBRATION VARIABLES
 * ========================================================================== */

const DECISION_VARIABLES = [
  entry({
    variable_name: "decision",
    ownership_layer: "MCI",
    source_truth: "MCI",
    contract_source: "mci-market",
    category: "DECISION",
    criticality_level: "CORE_TRUTH",
    exposure_level: "PRIVATE",
    propagation_path: ["MCI", "CALIBRATION"],
    upstream_dependencies: [
      "structural_context",
      "transition_context",
      "risk_context",
      "temporal_context",
    ],
    downstream_consumers: ["CALIBRATION"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: [
      "MCI — Orchestration décisionnelle privée",
      "Interdiction des expositions publiques sensibles",
    ],
  }),

  entry({
    variable_name: "decision_score",
    ownership_layer: "MCI",
    source_truth: "MCI",
    contract_source: "mci-market",
    category: "DECISION",
    criticality_level: "CORE_TRUTH",
    exposure_level: "PRIVATE",
    propagation_path: ["MCI", "CALIBRATION"],
    upstream_dependencies: ["decision"],
    downstream_consumers: ["CALIBRATION"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["MCI — Orchestration décisionnelle privée"],
  }),

  entry({
    variable_name: "calibration_allow_threshold",
    ownership_layer: "CALIBRATION",
    source_truth: "CALIBRATION",
    contract_source: "calibration",
    category: "CALIBRATION",
    criticality_level: "CALIBRATION_VARIABLE",
    exposure_level: "PRIVATE",
    propagation_path: ["CALIBRATION"],
    upstream_dependencies: ["decision", "decision_score"],
    downstream_consumers: ["MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Calibration", "Public Exposure Governance System"],
  }),

  entry({
    variable_name: "calibration_watch_threshold",
    ownership_layer: "CALIBRATION",
    source_truth: "CALIBRATION",
    contract_source: "calibration",
    category: "CALIBRATION",
    criticality_level: "CALIBRATION_VARIABLE",
    exposure_level: "PRIVATE",
    propagation_path: ["CALIBRATION"],
    upstream_dependencies: ["decision", "decision_score"],
    downstream_consumers: ["MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Calibration"],
  }),

  entry({
    variable_name: "calibration_block_threshold",
    ownership_layer: "CALIBRATION",
    source_truth: "CALIBRATION",
    contract_source: "calibration",
    category: "CALIBRATION",
    criticality_level: "CALIBRATION_VARIABLE",
    exposure_level: "PRIVATE",
    propagation_path: ["CALIBRATION"],
    upstream_dependencies: ["decision", "decision_score"],
    downstream_consumers: ["MCI"],
    reconstruction_allowed: false,
    public_exposure_allowed: false,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Calibration"],
  }),
] as const;

/* ============================================================================
 * 7. PUBLIC PROJECTION VARIABLES
 * ========================================================================== */

const PROJECTION_VARIABLES = [
  entry({
    variable_name: "public_impulse_context",
    ownership_layer: "TRANSFORMER",
    source_truth: "TRANSFORMER",
    contract_source: "scan-contract",
    category: "PUBLIC_PROJECTION",
    criticality_level: "PROJECTION_VARIABLE",
    exposure_level: "PUBLIC",
    propagation_path: ["TRANSFORMER", "API", "INTERFACE"],
    upstream_dependencies: ["impulse_transition_state"],
    downstream_consumers: ["API", "INTERFACE"],
    reconstruction_allowed: false,
    public_exposure_allowed: true,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: [
      "Public Projection Validation",
      "Impulse Propagation System",
    ],
  }),

  entry({
    variable_name: "public_structure_transition",
    ownership_layer: "TRANSFORMER",
    source_truth: "TRANSFORMER",
    contract_source: "scan-contract",
    category: "PUBLIC_PROJECTION",
    criticality_level: "PROJECTION_VARIABLE",
    exposure_level: "PUBLIC",
    propagation_path: ["TRANSFORMER", "API", "INTERFACE"],
    upstream_dependencies: ["chg_24h_pct", "chg_7d_pct", "sparkline_7d"],
    downstream_consumers: ["API", "INTERFACE"],
    reconstruction_allowed: false,
    public_exposure_allowed: true,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Public Projection Validation"],
  }),

  entry({
    variable_name: "ui_stability_label",
    ownership_layer: "INTERFACE",
    source_truth: "INTERFACE",
    contract_source: "ui",
    category: "UI_PROJECTION",
    criticality_level: "PROJECTION_VARIABLE",
    exposure_level: "PUBLIC",
    propagation_path: ["INTERFACE"],
    upstream_dependencies: ["stability_score"],
    downstream_consumers: ["INTERFACE"],
    reconstruction_allowed: false,
    public_exposure_allowed: true,
    validation_required: true,
    lineage_status: "ACTIVE",
    protocol_reference: ["Interface utilisateur"],
  }),
] as const;

/* ============================================================================
 * 8. MVP REGISTRY FILTER
 * ========================================================================== */

const MVP_DEFERRED_VARIABLES = new Set<string>([
  "volume_24h_eur",
  "calibration_allow_threshold",
  "calibration_watch_threshold",
  "calibration_block_threshold",
  "calibration_version",
  "decision_score",
  "rupture_penalty_score",
  "structural_context",
  "transition_context",
  "public_impulse_context",
  "public_structure_transition",
  "ui_stability_label",
  "risk_context",
  "temporal_context",
  "impulse_acceleration_score",
  "impulse_alignment_score",
]);

/* ============================================================================
 * 9. UNIFIED REGISTRY
 * ========================================================================== */

export const VARIABLE_LINEAGE_REGISTRY = Object.freeze(
  [ 
    
    ...MARKET_INPUT_VARIABLES,

    ...CORE_TRUTH_VARIABLES,
    ...RFS_SUPPORT_VARIABLES,

    ...PRIVATE_RUPTURE_SUPPORT_VARIABLES,

    ...PRIVATE_TRIPLE_LAYER_SUPPORT_VARIABLES,
    ...STRUCTURAL_SUPPORT_VARIABLES,

    ...PRIVATE_IMPULSE_SUPPORT_VARIABLES,

    ...AGGREGATED_CONTEXT_VARIABLES,

    ...DECISION_VARIABLES,
    ...PRIVATE_MCI_SUPPORT_VARIABLES,

    ...PRIVATE_NEUTRALIZATION_VARIABLES,

    ...PRIVATE_CALIBRATION_STATUS_VARIABLES,

    ...PROJECTION_VARIABLES,
  ].filter((entry) => !MVP_DEFERRED_VARIABLES.has(entry.variable_name)),
) satisfies readonly VariableLineageEntry[];

export function listVariableLineageEntries(): readonly VariableLineageEntry[] {
  return VARIABLE_LINEAGE_REGISTRY;
}

export type VariableName =
  (typeof VARIABLE_LINEAGE_REGISTRY)[number]["variable_name"];


/* ============================================================================
 * 10. VALIDATION HELPERS
 * ========================================================================== */

export function validateVariableLineageRegistry(): VariableLineageValidationResult {
  const warnings: string[] = [];
  const violations: string[] = [];

  const names = new Set<string>();

  for (const entryItem of VARIABLE_LINEAGE_REGISTRY) {
    if (names.has(entryItem.variable_name)) {
      violations.push(`VLR-001:duplicate_variable:${entryItem.variable_name}`);
    }

    names.add(entryItem.variable_name);

    if (entryItem.reconstruction_allowed !== false) {
      violations.push(`VLR-002:reconstruction_allowed:${entryItem.variable_name}`);
    }

    if (entryItem.public_exposure_allowed && entryItem.exposure_level === "PRIVATE") {
      violations.push(`VLR-005:private_variable_public:${entryItem.variable_name}`);
    }

    if (entryItem.propagation_path.length === 0) {
      violations.push(`VLR-003:empty_propagation:${entryItem.variable_name}`);
    }

    if (!entryItem.propagation_path.includes(entryItem.ownership_layer)) {
      warnings.push(`VLR-WARN:owner_not_in_path:${entryItem.variable_name}`);
    }

    for (const dependency of entryItem.upstream_dependencies) {
      const dependencyKnown = VARIABLE_LINEAGE_REGISTRY.some(
        (candidate) => candidate.variable_name === dependency,
      );

      if (!dependencyKnown) {
        warnings.push(
          `VLR-WARN:unknown_dependency:${entryItem.variable_name}:${dependency}`,
        );
      }
    }
  }

  return {
    ok: violations.length === 0,
    checked_count: VARIABLE_LINEAGE_REGISTRY.length,
    violation_count: violations.length,
    warnings,
    violations,
  };
}

export function assertVariableLineageRegistryValid(): void {
  const result = validateVariableLineageRegistry();

  if (!result.ok) {
    throw new Error(
      `variable_lineage_registry_invalid:${result.violations.join(",")}`,
    );
  }
}
