/* ============================================================================
 * FILE: lib/xyvala/governance/boundary-registry.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala official boundary registry
 *
 * ROLE
 * - define the official propagation boundaries of Xyvala
 * - centralize boundary ownership, direction, public exposure and validation rules
 * - support Boundary Protection System, First Divergence Rule and Propagation Audit Rule
 * - provide deterministic read-only boundary governance helpers
 *
 * PARENTS
 * - PROTOCOLE XYVALA — CADRE OFFICIEL COMPLET
 * - Boundary Protection System
 * - Propagation Audit Rule
 * - First Divergence Rule
 * - Public Exposure Governance System
 *
 * DIRECTIVES
 * - governance registry only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no snapshot mutation
 * - no API logic
 * - no UI logic
 * - no cache logic
 * - no persistence
 * - no runtime mutation
 * - deterministic read-only output only
 *
 * INPUTS
 * - boundary names
 * - layer names
 *
 * OUTPUTS
 * - BoundaryRegistryEntry
 * - boundary registry views
 * - boundary validation result
 *
 * INVARIANTS
 * - each boundary has one official source layer
 * - each boundary has one official target layer
 * - public boundaries must protect private analytical truths
 * - downstream layers must not reconstruct upstream truths
 *
 * CRITICAL DEPENDENCIES
 * - none
 *
 * SENSITIVE ZONES
 * - private/public boundary
 * - snapshot to transformer boundary
 * - transformer to API boundary
 * - API to interface boundary
 * ========================================================================== */

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type BoundaryLayer =
  | "ACQUISITION"
  | "RFS"
  | "TRIPLE_LAYER"
  | "IMPULSE_LAYER"
  | "ANALYTICAL_AGGREGATION_SYSTEM"
  | "MCI"
  | "CALIBRATION"
  | "SNAPSHOT"
  | "TRANSFORMER"
  | "RANKING"
  | "API"
  | "INTERFACE";

export type BoundaryName =
  | "ACQUISITION_TO_RFS"
  | "RFS_TO_TRIPLE_LAYER"
  | "TRIPLE_LAYER_TO_IMPULSE_LAYER"
  | "IMPULSE_LAYER_TO_ANALYTICAL_AGGREGATION_SYSTEM"
  | "ANALYTICAL_AGGREGATION_SYSTEM_TO_MCI"
  | "MCI_TO_CALIBRATION"
  | "CALIBRATION_TO_SNAPSHOT"
  | "SNAPSHOT_TO_TRANSFORMER"
  | "TRANSFORMER_TO_RANKING"
  | "RANKING_TO_API"
  | "TRANSFORMER_TO_API"
  | "API_TO_INTERFACE";

export type BoundaryCategory =
  | "PRIVATE_COMPUTE"
  | "PRIVATE_ORCHESTRATION"
  | "PRIVATE_TO_CONTRACT"
  | "PRIVATE_TO_PUBLIC"
  | "PUBLIC_PROJECTION"
  | "PUBLIC_EXPOSURE"
  | "DISPLAY";

export type BoundaryRiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type BoundaryStatus =
  | "ACTIVE"
  | "DEPRECATED"
  | "BLOCKED";

export type BoundaryRegistryEntry = {
  boundary_name: BoundaryName;
  from_layer: BoundaryLayer;
  to_layer: BoundaryLayer;
  category: BoundaryCategory;
  owner_layer: BoundaryLayer;
  public_boundary: boolean;
  risk_level: BoundaryRiskLevel;
  required_controls: string[];
  forbidden_actions: string[];
  expected_variables: string[];
  protected_private_variables: string[];
  validation_required: true;
  mutation_allowed: false;
  reconstruction_allowed: false;
  boundary_status: BoundaryStatus;
  protocol_reference: string[];
};

export type BoundaryRegistryValidationResult = {
  ok: boolean;
  checked_count: number;
  violation_count: number;
  warnings: string[];
  violations: string[];
};

/* ============================================================================
 * 2. REGISTRY HELPER
 * ========================================================================== */

function boundary(input: BoundaryRegistryEntry): BoundaryRegistryEntry {
  return Object.freeze({
    ...input,
    required_controls: [...input.required_controls],
    forbidden_actions: [...input.forbidden_actions],
    expected_variables: [...input.expected_variables],
    protected_private_variables: [...input.protected_private_variables],
    protocol_reference: [...input.protocol_reference],
  });
}

/* ============================================================================
 * 3. OFFICIAL BOUNDARY REGISTRY
 * ========================================================================== */

export const BOUNDARY_REGISTRY = Object.freeze([
  boundary({
    boundary_name: "ACQUISITION_TO_RFS",
    from_layer: "ACQUISITION",
    to_layer: "RFS",
    category: "PRIVATE_COMPUTE",
    owner_layer: "RFS",
    public_boundary: false,
    risk_level: "HIGH",
    required_controls: [
      "provider_payload_validation",
      "price_validation",
      "sparkline_validation",
      "quote_validation",
    ],
    forbidden_actions: [
      "market_prediction",
      "public_projection",
      "decision_generation",
      "silent_fallback_truth_creation",
    ],
    expected_variables: [
      "price_eur",
      "chg_24h_pct",
      "chg_7d_pct",
      "sparkline_7d",
      "market_cap_eur",
      "volume_24h_eur",
    ],
    protected_private_variables: [],
    validation_required: true,
    mutation_allowed: false,
    reconstruction_allowed: false,
    boundary_status: "ACTIVE",
    protocol_reference: [
      "Source de vérité unique",
      "RFS — Vérité structurelle",
      "Contract Before Runtime Rule",
    ],
  }),

  boundary({
    boundary_name: "RFS_TO_TRIPLE_LAYER",
    from_layer: "RFS",
    to_layer: "TRIPLE_LAYER",
    category: "PRIVATE_COMPUTE",
    owner_layer: "TRIPLE_LAYER",
    public_boundary: false,
    risk_level: "HIGH",
    required_controls: [
      "rfs_contract_validation",
      "stability_validation",
      "regime_validation",
      "rupture_validation",
    ],
    forbidden_actions: [
      "rfs_recalculation",
      "mci_decision_generation",
      "public_projection",
      "local_truth_reconstruction",
    ],
    expected_variables: [
      "stability_score",
      "regime",
      "rupture_score",
      "rupture_probability",
      "continuity_probability",
    ],
    protected_private_variables: [
      "regime",
      "rupture_score",
      "rupture_probability",
      "continuity_probability",
    ],
    validation_required: true,
    mutation_allowed: false,
    reconstruction_allowed: false,
    boundary_status: "ACTIVE",
    protocol_reference: [
      "RFS — Vérité structurelle",
      "Triple Layer System",
      "Boundary Protection System",
    ],
  }),

  boundary({
    boundary_name: "TRIPLE_LAYER_TO_IMPULSE_LAYER",
    from_layer: "TRIPLE_LAYER",
    to_layer: "IMPULSE_LAYER",
    category: "PRIVATE_COMPUTE",
    owner_layer: "IMPULSE_LAYER",
    public_boundary: false,
    risk_level: "HIGH",
    required_controls: [
      "triple_layer_contract_validation",
      "growth_context_validation",
      "core_pattern_context_validation",
      "decay_context_validation",
    ],
    forbidden_actions: [
      "triple_layer_recalculation",
      "transition_state_generation_outside_impulse",
      "directional_bias_generation_outside_impulse",
      "public_projection",
    ],
    expected_variables: [
      "growth_layer",
      "core_pattern_layer",
      "decay_layer",
    ],
    protected_private_variables: [
      "growth_layer",
      "core_pattern_layer",
      "decay_layer",
    ],
    validation_required: true,
    mutation_allowed: false,
    reconstruction_allowed: false,
    boundary_status: "ACTIVE",
    protocol_reference: [
      "Triple Layer System",
      "XII-bis",
      "Impulse Layer System",
    ],
  }),

  boundary({
    boundary_name: "IMPULSE_LAYER_TO_ANALYTICAL_AGGREGATION_SYSTEM",
    from_layer: "IMPULSE_LAYER",
    to_layer: "ANALYTICAL_AGGREGATION_SYSTEM",
    category: "PRIVATE_COMPUTE",
    owner_layer: "ANALYTICAL_AGGREGATION_SYSTEM",
    public_boundary: false,
    risk_level: "CRITICAL",
    required_controls: [
      "impulse_contract_validation",
      "impulse_status_validation",
      "impulse_transition_validation",
      "impulse_private_exposure_validation",
    ],
    forbidden_actions: [
      "impulse_recalculation",
      "transition_state_reconstruction",
      "directional_bias_reconstruction",
      "public_private_leak",
    ],
    expected_variables: [
      "impulse_pressure_score",
      "impulse_instability_score",
      "impulse_saturation_score",
      "impulse_exhaustion_score",
      "impulse_directional_bias",
      "impulse_transition_state",
    ],
    protected_private_variables: [
      "impulse_pressure_score",
      "impulse_instability_score",
      "impulse_saturation_score",
      "impulse_exhaustion_score",
      "impulse_directional_bias",
    ],
    validation_required: true,
    mutation_allowed: false,
    reconstruction_allowed: false,
    boundary_status: "ACTIVE",
    protocol_reference: [
      "Impulse Propagation System",
      "Governance of Impulse Variables",
      "Analytical Aggregation System",
    ],
  }),

  boundary({
    boundary_name: "ANALYTICAL_AGGREGATION_SYSTEM_TO_MCI",
    from_layer: "ANALYTICAL_AGGREGATION_SYSTEM",
    to_layer: "MCI",
    category: "PRIVATE_ORCHESTRATION",
    owner_layer: "MCI",
    public_boundary: false,
    risk_level: "CRITICAL",
    required_controls: [
      "aggregation_context_validation",
      "context_hierarchy_validation",
      "mci_input_contract_validation",
    ],
    forbidden_actions: [
      "aggregation_recalculation",
      "upstream_truth_modification",
      "public_projection",
      "decision_exposure",
    ],
    expected_variables: [
      "structural_context",
      "transition_context",
      "risk_context",
      "temporal_context",
    ],
    protected_private_variables: [
      "structural_context",
      "transition_context",
      "risk_context",
      "temporal_context",
    ],
    validation_required: true,
    mutation_allowed: false,
    reconstruction_allowed: false,
    boundary_status: "ACTIVE",
    protocol_reference: [
      "Analytical Aggregation System",
      "MCI — Orchestration décisionnelle privée",
      "Governance of Aggregated Contexts",
    ],
  }),

  boundary({
    boundary_name: "MCI_TO_CALIBRATION",
    from_layer: "MCI",
    to_layer: "CALIBRATION",
    category: "PRIVATE_ORCHESTRATION",
    owner_layer: "CALIBRATION",
    public_boundary: false,
    risk_level: "CRITICAL",
    required_controls: [
      "decision_private_validation",
      "calibration_input_validation",
      "neutralization_validation",
    ],
    forbidden_actions: [
      "rfs_recalculation",
      "mci_recalculation",
      "decision_public_exposure",
      "threshold_public_exposure",
    ],
    expected_variables: [
      "decision",
      "decision_score",
      "allow_raw_score",
      "block_raw_score",
      "decision_reason",
    ],
    protected_private_variables: [
      "decision",
      "decision_score",
      "allow_raw_score",
      "block_raw_score",
      "decision_reason",
    ],
    validation_required: true,
    mutation_allowed: false,
    reconstruction_allowed: false,
    boundary_status: "ACTIVE",
    protocol_reference: [
      "MCI — Orchestration décisionnelle privée",
      "Calibration",
      "Interdiction des expositions publiques sensibles",
    ],
  }),

  boundary({
    boundary_name: "CALIBRATION_TO_SNAPSHOT",
    from_layer: "CALIBRATION",
    to_layer: "SNAPSHOT",
    category: "PRIVATE_TO_CONTRACT",
    owner_layer: "SNAPSHOT",
    public_boundary: false,
    risk_level: "CRITICAL",
    required_controls: [
      "snapshot_contract_validation",
      "public_safe_projection_validation",
      "private_field_filtering",
      "calibration_privacy_validation",
    ],
    forbidden_actions: [
      "snapshot_recalculation",
      "private_score_public_exposure",
      "threshold_public_exposure",
      "decision_public_exposure",
    ],
    expected_variables: [
      "calibration_allow_threshold",
      "calibration_watch_threshold",
      "calibration_block_threshold",
      "calibration_policy_state",
    ],
    protected_private_variables: [
      "calibration_allow_threshold",
      "calibration_watch_threshold",
      "calibration_block_threshold",
      "calibration_policy_state",
      "decision",
      "decision_score",
      "allow_raw_score",
      "block_raw_score",
    ],
    validation_required: true,
    mutation_allowed: false,
    reconstruction_allowed: false,
    boundary_status: "ACTIVE",
    protocol_reference: [
      "Snapshot — Frontière sacrée",
      "Public Exposure Governance System",
      "Calibration",
    ],
  }),

  boundary({
    boundary_name: "SNAPSHOT_TO_TRANSFORMER",
    from_layer: "SNAPSHOT",
    to_layer: "TRANSFORMER",
    category: "PRIVATE_TO_PUBLIC",
    owner_layer: "TRANSFORMER",
    public_boundary: true,
    risk_level: "CRITICAL",
    required_controls: [
      "snapshot_contract_validation",
      "public_safe_field_validation",
      "private_field_absence_validation",
      "undefined_leak_validation",
    ],
    forbidden_actions: [
      "rfs_recalculation",
      "mci_recalculation",
      "calibration_recalculation",
      "private_field_exposure",
      "local_truth_reconstruction",
    ],
    expected_variables: [
      "price_eur",
      "chg_24h_pct",
      "chg_7d_pct",
      "sparkline_7d",
      "public_activity",
      "public_structure_transition",
      "public_impulse_context",
    ],
    protected_private_variables: [
      "decision",
      "decision_score",
      "opportunity_score",
      "confidence_score",
      "rupture_probability",
      "crash_score",
      "calibration_allow_threshold",
      "calibration_watch_threshold",
      "calibration_block_threshold",
    ],
    validation_required: true,
    mutation_allowed: false,
    reconstruction_allowed: false,
    boundary_status: "ACTIVE",
    protocol_reference: [
      "Snapshot — Frontière sacrée",
      "Transformeurs et Mappers",
      "Public Exposure Governance System",
    ],
  }),

  boundary({
    boundary_name: "TRANSFORMER_TO_RANKING",
    from_layer: "TRANSFORMER",
    to_layer: "RANKING",
    category: "PUBLIC_PROJECTION",
    owner_layer: "RANKING",
    public_boundary: true,
    risk_level: "HIGH",
    required_controls: [
      "ranking_input_validation",
      "public_projection_validation",
      "private_signal_absence_validation",
    ],
    forbidden_actions: [
      "decision_generation",
      "private_score_sorting",
      "threshold_usage",
      "analytical_reconstruction",
    ],
    expected_variables: [
      "public_activity",
      "public_structure_transition",
      "public_impulse_context",
      "rank",
      "market_cap_eur",
      "volume_24h_eur",
    ],
    protected_private_variables: [
      "decision",
      "opportunity_score",
      "confidence_score",
      "allow_raw_score",
      "block_raw_score",
    ],
    validation_required: true,
    mutation_allowed: false,
    reconstruction_allowed: false,
    boundary_status: "ACTIVE",
    protocol_reference: [
      "Ranking Governance System",
      "Public Projection Validation",
    ],
  }),

  boundary({
    boundary_name: "RANKING_TO_API",
    from_layer: "RANKING",
    to_layer: "API",
    category: "PUBLIC_EXPOSURE",
    owner_layer: "API",
    public_boundary: true,
    risk_level: "HIGH",
    required_controls: [
      "api_contract_validation",
      "public_ranking_validation",
      "private_field_absence_validation",
    ],
    forbidden_actions: [
      "private_decision_exposure",
      "private_score_exposure",
      "calibration_exposure",
      "runtime_governance_exposure",
    ],
    expected_variables: [
      "id",
      "symbol",
      "name",
      "price_eur",
      "chg_24h_pct",
      "chg_7d_pct",
      "public_activity",
      "public_structure_transition",
      "public_impulse_context",
      "rank",
      "logo_url",
    ],
    protected_private_variables: [
      "decision",
      "decision_score",
      "opportunity_score",
      "confidence_score",
      "rupture_score",
      "rupture_probability",
      "crash_score",
      "calibration_policy_state",
    ],
    validation_required: true,
    mutation_allowed: false,
    reconstruction_allowed: false,
    boundary_status: "ACTIVE",
    protocol_reference: [
      "Exposition API",
      "Public Exposure Governance System",
      "Ranking Governance System",
    ],
  }),

  boundary({
    boundary_name: "TRANSFORMER_TO_API",
    from_layer: "TRANSFORMER",
    to_layer: "API",
    category: "PUBLIC_EXPOSURE",
    owner_layer: "API",
    public_boundary: true,
    risk_level: "HIGH",
    required_controls: [
      "api_contract_validation",
      "public_projection_validation",
      "private_field_absence_validation",
    ],
    forbidden_actions: [
      "private_decision_exposure",
      "private_score_exposure",
      "calibration_exposure",
      "runtime_governance_exposure",
    ],
    expected_variables: [
      "id",
      "symbol",
      "name",
      "price_eur",
      "chg_24h_pct",
      "chg_7d_pct",
      "public_activity",
      "public_structure_transition",
      "public_impulse_context",
      "rank",
      "logo_url",
    ],
    protected_private_variables: [
      "decision",
      "decision_score",
      "opportunity_score",
      "confidence_score",
      "rupture_score",
      "rupture_probability",
      "crash_score",
      "calibration_policy_state",
    ],
    validation_required: true,
    mutation_allowed: false,
    reconstruction_allowed: false,
    boundary_status: "ACTIVE",
    protocol_reference: [
      "Exposition API",
      "Public Exposure Governance System",
      "Public Projection Validation",
    ],
  }),

  boundary({
    boundary_name: "API_TO_INTERFACE",
    from_layer: "API",
    to_layer: "INTERFACE",
    category: "DISPLAY",
    owner_layer: "INTERFACE",
    public_boundary: true,
    risk_level: "MEDIUM",
    required_controls: [
      "ui_contract_validation",
      "display_only_validation",
      "no_frontend_recalculation_validation",
    ],
    forbidden_actions: [
      "rfs_recalculation",
      "mci_recalculation",
      "impulse_recalculation",
      "decision_generation",
      "private_signal_reconstruction",
    ],
    expected_variables: [
      "id",
      "symbol",
      "name",
      "price_eur",
      "chg_24h_pct",
      "chg_7d_pct",
      "public_activity",
      "public_structure_transition",
      "public_impulse_context",
      "logo_url",
    ],
    protected_private_variables: [
      "decision",
      "opportunity_score",
      "confidence_score",
      "rupture_probability",
      "calibration_policy_state",
    ],
    validation_required: true,
    mutation_allowed: false,
    reconstruction_allowed: false,
    boundary_status: "ACTIVE",
    protocol_reference: [
      "Interface utilisateur",
      "Public Exposure Governance System",
    ],
  }),
] satisfies readonly BoundaryRegistryEntry[]);

/* ============================================================================
 * 4. OBSERVE HELPERS
 * ========================================================================== */

export function listBoundaryRegistryEntries(): readonly BoundaryRegistryEntry[] {
  return BOUNDARY_REGISTRY;
}

export function getBoundaryRegistryEntry(
  boundaryName: BoundaryName,
): BoundaryRegistryEntry | null {
  return (
    BOUNDARY_REGISTRY.find(
      (entry) => entry.boundary_name === boundaryName,
    ) ?? null
  );
}

export function listBoundariesByLayer(
  layer: BoundaryLayer,
): readonly BoundaryRegistryEntry[] {
  return BOUNDARY_REGISTRY.filter(
    (entry) => entry.from_layer === layer || entry.to_layer === layer,
  );
}

export function listPublicBoundaries(): readonly BoundaryRegistryEntry[] {
  return BOUNDARY_REGISTRY.filter((entry) => entry.public_boundary);
}

export function listBoundariesByRisk(
  riskLevel: BoundaryRiskLevel,
): readonly BoundaryRegistryEntry[] {
  return BOUNDARY_REGISTRY.filter((entry) => entry.risk_level === riskLevel);
}

/* ============================================================================
 * 5. VALIDATION
 * ========================================================================== */

export function validateBoundaryRegistry(): BoundaryRegistryValidationResult {
  const warnings: string[] = [];
  const violations: string[] = [];
  const names = new Set<string>();

  for (const entry of BOUNDARY_REGISTRY) {
    if (names.has(entry.boundary_name)) {
      violations.push(`BOUNDARY-DUPLICATE:${entry.boundary_name}`);
    }

    names.add(entry.boundary_name);

    if (entry.from_layer === entry.to_layer) {
      violations.push(`BOUNDARY-SELF_REFERENCE:${entry.boundary_name}`);
    }

    if (entry.mutation_allowed !== false) {
      violations.push(`BOUNDARY-MUTATION_ALLOWED:${entry.boundary_name}`);
    }

    if (entry.reconstruction_allowed !== false) {
      violations.push(`BOUNDARY-RECONSTRUCTION_ALLOWED:${entry.boundary_name}`);
    }

    if (entry.validation_required !== true) {
      violations.push(`BOUNDARY-VALIDATION_NOT_REQUIRED:${entry.boundary_name}`);
    }

    if (entry.public_boundary && entry.protected_private_variables.length === 0) {
      warnings.push(`BOUNDARY-WARN:NO_PRIVATE_PROTECTION:${entry.boundary_name}`);
    }

    if (entry.required_controls.length === 0) {
      warnings.push(`BOUNDARY-WARN:NO_REQUIRED_CONTROLS:${entry.boundary_name}`);
    }
  }

  return {
    ok: violations.length === 0,
    checked_count: BOUNDARY_REGISTRY.length,
    violation_count: violations.length,
    warnings,
    violations,
  };
}

export function assertBoundaryRegistryValid(): void {
  const result = validateBoundaryRegistry();

  if (!result.ok) {
    throw new Error(
      `boundary_registry_invalid:${result.violations.join(",")}`,
    );
  }
}
