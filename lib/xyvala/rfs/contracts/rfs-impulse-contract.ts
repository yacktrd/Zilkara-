/* ============================================================================
 * FILE: lib/xyvala/rfs/contracts/rfs-impulse-contract.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical RFS Impulse Layer contract
 *
 * ROLE
 * - define the canonical private contract of Impulse Layer outputs
 * - define the official identity of every governed impulse variable
 * - preserve nullable availability without synthetic reconstruction
 * - provide the unique transport contract between the Impulse Layer, RFS,
 *   private snapshots, adapters and authorized private consumers
 * - support Contract Before Runtime, Variable Governance, Propagation Audit
 *   and First Divergence Rule
 *
 * CLASSIFICATION
 * - CONTRACT
 * - PRIVATE ANALYTICAL CONTRACT
 * - READ-ONLY DECLARATION
 *
 * PARENTS
 * - Xyvala Impulse Layer System
 * - Xyvala Impulse Propagation System
 * - Xyvala Variable Governance System
 * - Xyvala Variable Lineage and Traceability
 * - Xyvala Boundary Protection System
 *
 * OWNERSHIP
 * - Impulse Layer is the unique producer of impulse truths
 * - RFS may transport the exact Impulse Layer contract
 * - MCI may consume or transport exact copies only
 * - adapters, snapshots and transformers never become impulse owners
 *
 * INPUTS
 * - none
 *
 * OUTPUTS
 * - canonical impulse score type
 * - canonical impulse status
 * - canonical directional bias
 * - canonical transition state
 * - canonical private Impulse Layer contract
 * - governed impulse variable names
 *
 * DIRECTIVES
 * - contract declarations only
 * - no analytical computation
 * - no score computation
 * - no score normalization
 * - no status inference
 * - no transition inference
 * - no directional bias inference
 * - no fallback reconstruction
 * - no cross-variable replacement
 * - no cross-layer replacement
 * - no calibration logic
 * - no MCI logic
 * - no snapshot construction
 * - no public projection
 * - no API logic
 * - no UI logic
 * - no persistence
 * - no runtime mutation
 *
 * INVARIANTS
 * - one impulse reality has one official variable name
 * - Impulse Layer remains the unique source of impulse truth
 * - unavailable values are represented by null
 * - undefined is not an authorized business value
 * - missing values are never replaced with neutral scores
 * - missing values are never reconstructed from adjacent impulse variables
 * - impulse_status describes availability; it never replaces a score
 * - impulse_transition_state is produced by the Impulse Layer only
 * - impulse_directional_bias is produced by the Impulse Layer only
 * - downstream layers preserve values without analytical reinterpretation
 * - private impulse scores are never directly publicly exposable
 *
 * CANONICAL PROPAGATION
 * - Impulse Layer
 * - RFS private transport
 * - Analytical Aggregation System
 * - MCI private consumption
 * - Calibration observation when explicitly authorized
 * - Private Snapshot
 * - Private-to-public transformer
 * - authorized descriptive public projection only
 *
 * PUBLIC EXPOSURE
 * - private impulse scores are forbidden
 * - private directional bias is forbidden
 * - private transition state is forbidden as a raw internal value
 * - only governed descriptive projections may become public
 *
 * FIRST DIVERGENCE
 * - invalid value at production
 *   => Impulse Layer producer
 *
 * - valid producer value missing from RFS transport
 *   => Impulse Layer -> RFS boundary
 *
 * - valid RFS value missing from private contract
 *   => RFS -> Private Snapshot boundary
 *
 * - valid private value incorrectly projected publicly
 *   => Private Snapshot -> Transformer boundary
 *
 * SENSITIVE ZONES
 * - impulse variable identity
 * - nullable availability
 * - directional bias vocabulary
 * - transition state vocabulary
 * - private/public exposure
 * - runtime propagation
 * ========================================================================== */

/* ============================================================================
 * 1. CONTRACT VERSION
 * ========================================================================== */

export const RFS_IMPULSE_CONTRACT_VERSION =
  "rfs-impulse-contract-v1" as const;

export type RfsImpulseContractVersion =
  typeof RFS_IMPULSE_CONTRACT_VERSION;

/* ============================================================================
 * 2. SCORE CONTRACT
 * ----------------------------------------------------------------------------
 * Scores are bounded analytically by their producing engine.
 *
 * This contract intentionally does not clamp, normalize or repair values.
 * Runtime validation belongs to a dedicated contract validator.
 * ========================================================================== */

export type RfsImpulseScore =
  number | null;

/* ============================================================================
 * 3. AVAILABILITY STATUS
 * ----------------------------------------------------------------------------
 * The status describes whether the canonical Impulse Layer truth was produced.
 *
 * It does not authorize:
 * - score reconstruction
 * - transition reconstruction
 * - directional bias reconstruction
 * - substitution with another variable
 * ========================================================================== */

export const RFS_IMPULSE_STATUSES = [
  "computed",
  "partial",
  "insufficient_data",
  "unavailable",
] as const;

export type RfsImpulseStatus =
  (typeof RFS_IMPULSE_STATUSES)[number];

/* ============================================================================
 * 4. DIRECTIONAL BIAS
 * ----------------------------------------------------------------------------
 * This vocabulary belongs exclusively to the Impulse Layer.
 *
 * UNAVAILABLE represents the explicit absence of a valid canonical reading.
 * It must not be interpreted as NEUTRAL.
 * ========================================================================== */

export const RFS_IMPULSE_DIRECTIONAL_BIASES = [
  "POSITIVE",
  "NEGATIVE",
  "NEUTRAL",
  "MIXED",
  "UNAVAILABLE",
] as const;

export type RfsImpulseDirectionalBias =
  (typeof RFS_IMPULSE_DIRECTIONAL_BIASES)[number];

/**
 * Compatibility name for existing Impulse Layer consumers.
 *
 * New RFS contract code should prefer RfsImpulseDirectionalBias.
 */
export type ImpulseDirectionalBias =
  RfsImpulseDirectionalBias;

/* ============================================================================
 * 5. TRANSITION STATE
 * ----------------------------------------------------------------------------
 * These states describe structural impulse conditions.
 *
 * They are:
 * - descriptive
 * - non-decision-making
 * - non-predictive
 * - private until transformed through an authorized public projection
 *
 * UNAVAILABLE is distinct from NEUTRAL:
 * - NEUTRAL means a valid neutral reading
 * - UNAVAILABLE means no valid reading could be produced
 * ========================================================================== */

export const RFS_IMPULSE_TRANSITION_STATES = [
  "COMPRESSION",
  "EXPANSION",
  "RECOVERY",
  "FRAGMENTATION",
  "STABLE",
  "NEUTRAL",
  "UNAVAILABLE",
] as const;

export type RfsImpulseTransitionState =
  (typeof RFS_IMPULSE_TRANSITION_STATES)[number];

/**
 * Compatibility name for existing Impulse Layer consumers.
 *
 * New RFS contract code should prefer RfsImpulseTransitionState.
 */
export type ImpulseTransitionState =
  RfsImpulseTransitionState;

/* ============================================================================
 * 6. CANONICAL VARIABLE NAMES
 * ----------------------------------------------------------------------------
 * These names constitute the governed identity of Impulse Layer variables.
 *
 * No synonym or local alias may replace them in analytical contracts.
 * ========================================================================== */

export const RFS_IMPULSE_VARIABLE_NAMES = [
  "impulse_pressure_score",
  "impulse_acceleration_score",
  "impulse_alignment_score",
  "impulse_instability_score",
  "impulse_saturation_score",
  "impulse_exhaustion_score",
  "impulse_directional_bias",
  "impulse_transition_state",
  "impulse_status",
] as const;

export type RfsImpulseVariableName =
  (typeof RFS_IMPULSE_VARIABLE_NAMES)[number];

/* ============================================================================
 * 7. CORE GOVERNED IMPULSE VARIABLES
 * ----------------------------------------------------------------------------
 * These variables are explicitly governed as canonical Impulse Layer truths.
 * ========================================================================== */

export const RFS_CORE_IMPULSE_VARIABLE_NAMES = [
  "impulse_pressure_score",
  "impulse_instability_score",
  "impulse_saturation_score",
  "impulse_exhaustion_score",
  "impulse_directional_bias",
  "impulse_transition_state",
] as const;

export type RfsCoreImpulseVariableName =
  (typeof RFS_CORE_IMPULSE_VARIABLE_NAMES)[number];

/* ============================================================================
 * 8. SUPPORT IMPULSE VARIABLES
 * ----------------------------------------------------------------------------
 * Acceleration, alignment and status remain legitimate Impulse Layer outputs.
 *
 * Their presence does not authorize another layer to use them as replacements
 * for missing core impulse variables.
 * ========================================================================== */

export const RFS_SUPPORT_IMPULSE_VARIABLE_NAMES = [
  "impulse_acceleration_score",
  "impulse_alignment_score",
  "impulse_status",
] as const;

export type RfsSupportImpulseVariableName =
  (typeof RFS_SUPPORT_IMPULSE_VARIABLE_NAMES)[number];

/* ============================================================================
 * 9. CANONICAL PRIVATE IMPULSE CONTRACT
 * ----------------------------------------------------------------------------
 * This is the complete private transport shape of the Impulse Layer.
 *
 * NULLABILITY
 * - null means explicitly unavailable
 * - null is preserved through private transport
 * - null never authorizes reconstruction
 *
 * STATUS COHERENCE
 * - computed normally requires complete canonical values
 * - partial may contain a subset of valid values
 * - insufficient_data and unavailable may contain null values
 *
 * Enforcement belongs to a dedicated validator, not to this declaration file.
 * ========================================================================== */

export type RfsImpulseContract = {
  impulse_pressure_score:
    RfsImpulseScore;

  impulse_acceleration_score:
    RfsImpulseScore;

  impulse_alignment_score:
    RfsImpulseScore;

  impulse_instability_score:
    RfsImpulseScore;

  impulse_saturation_score:
    RfsImpulseScore;

  impulse_exhaustion_score:
    RfsImpulseScore;

  impulse_directional_bias:
    RfsImpulseDirectionalBias;

  impulse_transition_state:
    RfsImpulseTransitionState;

  impulse_status:
    RfsImpulseStatus;
};

/* ============================================================================
 * 10. COMPUTED IMPULSE CONTRACT
 * ----------------------------------------------------------------------------
 * This narrowed contract describes a fully computed Impulse Layer result.
 *
 * It does not create the computed state. It only expresses its contract.
 * ========================================================================== */

export type ComputedRfsImpulseContract = {
  impulse_pressure_score:
    number;

  impulse_acceleration_score:
    number;

  impulse_alignment_score:
    number;

  impulse_instability_score:
    number;

  impulse_saturation_score:
    number;

  impulse_exhaustion_score:
    number;

  impulse_directional_bias:
    Exclude<
      RfsImpulseDirectionalBias,
      "UNAVAILABLE"
    >;

  impulse_transition_state:
    Exclude<
      RfsImpulseTransitionState,
      "UNAVAILABLE"
    >;

  impulse_status:
    "computed";
};

/* ============================================================================
 * 11. DEGRADED IMPULSE CONTRACT
 * ----------------------------------------------------------------------------
 * A degraded contract preserves explicit unavailable values.
 *
 * It never inserts:
 * - zero
 * - fifty
 * - NEUTRAL
 * - STABLE
 *
 * unless such a value was genuinely produced by the Impulse Layer.
 * ========================================================================== */

export type DegradedRfsImpulseContract = {
  impulse_pressure_score:
    RfsImpulseScore;

  impulse_acceleration_score:
    RfsImpulseScore;

  impulse_alignment_score:
    RfsImpulseScore;

  impulse_instability_score:
    RfsImpulseScore;

  impulse_saturation_score:
    RfsImpulseScore;

  impulse_exhaustion_score:
    RfsImpulseScore;

  impulse_directional_bias:
    RfsImpulseDirectionalBias;

  impulse_transition_state:
    RfsImpulseTransitionState;

  impulse_status:
    Exclude<
      RfsImpulseStatus,
      "computed"
    >;
};

/* ============================================================================
 * 12. IMPULSE CONTRACT RESULT
 * ----------------------------------------------------------------------------
 * Union used by producers and exact transport layers.
 *
 * Consumers must still inspect impulse_status before assuming completeness.
 * ========================================================================== */

export type RfsImpulseContractResult =
  | ComputedRfsImpulseContract
  | DegradedRfsImpulseContract;

/* ============================================================================
 * 13. IMPULSE CALIBRATION PROJECTION CONTRACT
 * ----------------------------------------------------------------------------
 * This shape transports already-computed values into the authorized
 * calibration boundary.
 *
 * It is not an Impulse Layer output contract.
 * It is not a new source of impulse truth.
 * It must never be reinjected into the Impulse Layer as analytical reality.
 * ========================================================================== */

export type RfsImpulseCalibrationProjection = {
  pressure_score:
    number;

  acceleration_score:
    number;

  alignment_score:
    number;

  instability_score:
    number;

  saturation_score:
    number;

  exhaustion_score:
    number;

  transition_state:
    Exclude<
      RfsImpulseTransitionState,
      "UNAVAILABLE"
    >;
};

/* ============================================================================
 * 14. IMPULSE TRANSPORT METADATA
 * ----------------------------------------------------------------------------
 * Metadata describes propagation. It does not alter analytical values.
 * ========================================================================== */

export type RfsImpulseTransportMetadata = {
  contract_version:
    RfsImpulseContractVersion;

  source_layer:
    "IMPULSE_LAYER";

  source_contract:
    "impulse-state-core";

  reconstruction_allowed:
    false;

  public_exposure_allowed:
    false;
};

/* ============================================================================
 * 15. CANONICAL TRANSPORT ENVELOPE
 * ----------------------------------------------------------------------------
 * This envelope may be used by governed private boundaries that need explicit
 * lineage metadata alongside the exact Impulse Layer contract.
 *
 * It must not be used as a public API contract.
 * ========================================================================== */

export type RfsImpulseTransportEnvelope = {
  impulse:
    RfsImpulseContractResult;

  metadata:
    RfsImpulseTransportMetadata;
};

/* ============================================================================
 * 16. CANONICAL METADATA CONSTANT
 * ----------------------------------------------------------------------------
 * Immutable declaration only.
 *
 * No runtime state is read or modified.
 * ========================================================================== */

export const RFS_IMPULSE_TRANSPORT_METADATA:
  Readonly<RfsImpulseTransportMetadata> =
    Object.freeze({
      contract_version:
        RFS_IMPULSE_CONTRACT_VERSION,

      source_layer:
        "IMPULSE_LAYER",

      source_contract:
        "impulse-state-core",

      reconstruction_allowed:
        false,

      public_exposure_allowed:
        false,
    });

/* ============================================================================
 * 17. CONTRACT FIELD MAP
 * ----------------------------------------------------------------------------
 * This map supports deterministic contract and propagation audits.
 *
 * It describes ownership only. It does not prove runtime availability.
 * ========================================================================== */

export const RFS_IMPULSE_FIELD_OWNERSHIP =
  Object.freeze({
    impulse_pressure_score:
      "IMPULSE_LAYER",

    impulse_acceleration_score:
      "IMPULSE_LAYER",

    impulse_alignment_score:
      "IMPULSE_LAYER",

    impulse_instability_score:
      "IMPULSE_LAYER",

    impulse_saturation_score:
      "IMPULSE_LAYER",

    impulse_exhaustion_score:
      "IMPULSE_LAYER",

    impulse_directional_bias:
      "IMPULSE_LAYER",

    impulse_transition_state:
      "IMPULSE_LAYER",

    impulse_status:
      "IMPULSE_LAYER",
  } as const satisfies Record<
    RfsImpulseVariableName,
    "IMPULSE_LAYER"
  >);

/* ============================================================================
 * 18. TYPE-LEVEL CONTRACT ASSERTIONS
 * ----------------------------------------------------------------------------
 * These assertions provide compile-time protection against variable registry
 * drift inside this contract.
 *
 * They produce no runtime behavior.
 * ========================================================================== */

type MissingImpulseOwnershipVariables =
  Exclude<
    RfsImpulseVariableName,
    keyof typeof RFS_IMPULSE_FIELD_OWNERSHIP
  >;

type UnknownImpulseOwnershipVariables =
  Exclude<
    keyof typeof RFS_IMPULSE_FIELD_OWNERSHIP,
    RfsImpulseVariableName
  >;

export type RfsImpulseOwnershipContractIsComplete =
  MissingImpulseOwnershipVariables extends never
    ? true
    : false;

export type RfsImpulseOwnershipContractHasNoUnknownVariable =
  UnknownImpulseOwnershipVariables extends never
    ? true
    : false;
