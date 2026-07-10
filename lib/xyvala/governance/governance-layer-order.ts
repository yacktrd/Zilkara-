/* ============================================================================
 * FILE: lib/xyvala/governance/governance-layer-order.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala governance layer order registry
 *
 * ROLE
 * - define the single official ordered list of Xyvala governance layers
 * - provide the canonical layer type used by lineage registry and validators
 * - prevent divergence between owner declarations and propagation validation
 *
 * DIRECTIVES
 * - governance contract only
 * - no market computation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no runtime mutation
 * - no API logic
 * - no UI logic
 * - deterministic read-only output only
 *
 * INVARIANTS
 * - one layer order = one source of truth
 * - validators must consume this order
 * - registries must consume this type
 * ========================================================================== */

export const GOVERNANCE_LAYER_ORDER = [
  "ACQUISITION",
  "RFS",
  "TRIPLE_LAYER",
  "IMPULSE_LAYER",
  "NEUTRALIZATION_SYSTEM",
  "RUPTURE_EVOLUTION_SYSTEM",
  "CRASH_SYSTEM",
  "ANALYTICAL_AGGREGATION_SYSTEM",
  "MCI",
  "CALIBRATION",
  "SNAPSHOT",
  "TRANSFORMER",
  "RANKING",
  "API",
  "INTERFACE",
] as const;

export type GovernanceLayer =
  (typeof GOVERNANCE_LAYER_ORDER)[number];

export function getGovernanceLayerIndex(
  layer: string,
): number {
  return GOVERNANCE_LAYER_ORDER.indexOf(
    layer as GovernanceLayer,
  );
}

export function isGovernanceLayer(
  value: unknown,
): value is GovernanceLayer {
  return (
    typeof value === "string" &&
    GOVERNANCE_LAYER_ORDER.includes(value as GovernanceLayer)
  );
}
