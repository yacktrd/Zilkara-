/* ============================================================================
 * FILE: lib/xyvala/rfs/contracts/rfs-temporal-contract.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical RFS temporal contract
 *
 * ROLE
 * - define the canonical private contracts for RFS temporal observations
 * - distinguish global structure, recent 7D context and immediate 24H timing
 * - define explicit availability and degradation states
 * - preserve the identity and ownership of temporal variables
 * - provide deterministic contracts to RFS producers and private consumers
 *
 * CLASSIFICATION
 * - CONTRACT
 * - PRIVATE
 * - READ-ONLY DEFINITION
 * - NON-COMPUTE
 * - NON-OBSERVE
 * - NON-MUTATE
 *
 * PARENTS
 * - Xyvala official protocol
 * - Contract Before Runtime Rule
 * - Variable Governance System
 * - Variable Lineage and Traceability
 * - RFS structural truth contract
 *
 * POSITION IN OFFICIAL CHAIN
 * - Acquisition
 * - RFS
 *   - global structural reading
 *   - 7D recent context
 *   - 24H immediate timing context
 * - Triple Layer
 * - Impulse Layer
 * - Analytical Aggregation System
 * - MCI
 * - Calibration
 * - Snapshot
 * - Transformers
 * - Rankings
 * - API
 * - Interface
 *
 * INPUTS
 * - none at runtime
 * - canonical type declarations only
 *
 * OUTPUTS
 * - RfsTemporalStatus
 * - RfsTemporalHorizon
 * - RfsTemporalContextRole
 * - RfsTimingState
 * - RfsTemporalBlock
 * - RfsTemporalContext
 * - temporal contract version metadata
 *
 * DIRECTIVES
 * - contract definitions only
 * - no temporal computation
 * - no price computation
 * - no pattern computation
 * - no stability computation
 * - no regime computation
 * - no rupture computation
 * - no crash computation
 * - no Triple Layer computation
 * - no Impulse Layer computation
 * - no MCI computation
 * - no calibration computation
 * - no snapshot construction
 * - no public projection
 * - no API logic
 * - no UI logic
 * - no persistence
 * - no runtime mutation
 * - no fallback timestamp generation
 * - no silent neutral-value replacement
 * - no analytical reconstruction
 *
 * INVARIANTS
 * - global structure remains distinct from 7D and 24H temporal readings
 * - 7D contextualizes recent structural behavior only
 * - 24H contextualizes immediate timing only
 * - 7D never replaces global stability
 * - 7D never replaces global regime
 * - 7D never replaces global rupture
 * - 24H never replaces global stability
 * - 24H never replaces global regime
 * - 24H never replaces global rupture
 * - unavailable values remain explicitly unavailable
 * - null represents an explicitly unavailable analytical value
 * - undefined is not a governed business value
 * - status describes availability and never creates analytical truth
 * - timing_state remains descriptive and never becomes a decision
 * - all scores use the canonical normalized 0–100 range when available
 * - percentage values remain observable market measures and may be negative
 * - identical values and statuses preserve identical contract meaning
 *
 * VARIABLE OWNERSHIP
 * - temporal blocks are produced by RFS
 * - temporal block values remain private analytical context
 * - downstream layers may read but never reconstruct these values
 *
 * TEMPORAL GOVERNANCE
 * - GLOBAL = dominant structural horizon
 * - RECENT_7D = recent contextual horizon
 * - IMMEDIATE_24H = immediate timing horizon
 *
 * FIRST DIVERGENCE RULE
 * - missing temporal observations remain missing temporal observations
 * - insufficient observations remain insufficient observations
 * - invalid temporal observations remain invalid temporal observations
 * - downstream consumers must not replace missing values with invented scores
 *
 * SENSITIVE ZONES
 * - temporal status semantics
 * - nullability
 * - horizon identity
 * - timing-state semantics
 * - separation between global, 7D and 24H readings
 * - private analytical propagation
 * ========================================================================== */

/* ============================================================================
 * 1. CONTRACT VERSION
 * ========================================================================== */

export const RFS_TEMPORAL_CONTRACT_VERSION =
  "1.0.0" as const;

/* ============================================================================
 * 2. SCORE AND PERCENTAGE PRIMITIVES
 * ----------------------------------------------------------------------------
 * These aliases document business meaning.
 *
 * They do not perform runtime validation and do not create branded numerical
 * values. Runtime validation remains the responsibility of an authorized
 * contract validator.
 * ========================================================================== */

/**
 * Canonical normalized analytical score.
 *
 * Expected runtime range when available:
 * - minimum: 0
 * - maximum: 100
 *
 * `null` means the value was explicitly unavailable.
 */
export type RfsTemporalScore =
  number | null;

/**
 * Observable percentage-based temporal value.
 *
 * The value may legitimately be:
 * - negative
 * - zero
 * - positive
 *
 * `null` means the value was explicitly unavailable.
 */
export type RfsTemporalPercentage =
  number | null;

/* ============================================================================
 * 3. TEMPORAL STATUS
 * ----------------------------------------------------------------------------
 * Status expresses data and computation availability.
 *
 * Status never:
 * - repairs a value
 * - infers a score
 * - replaces a missing observation
 * - produces a business decision
 * ========================================================================== */

export type RfsTemporalStatus =
  | "COMPUTED"
  | "PARTIAL"
  | "INSUFFICIENT_DATA"
  | "UNAVAILABLE"
  | "INVALID";

/* ============================================================================
 * 4. TEMPORAL HORIZONS
 * ----------------------------------------------------------------------------
 * The horizons are contractually independent.
 *
 * GLOBAL
 * - dominant structural horizon
 *
 * RECENT_7D
 * - recent structural contextualization
 *
 * IMMEDIATE_24H
 * - immediate timing contextualization
 * ========================================================================== */

export type RfsTemporalHorizon =
  | "GLOBAL"
  | "RECENT_7D"
  | "IMMEDIATE_24H";

/* ============================================================================
 * 5. TEMPORAL CONTEXT ROLE
 * ----------------------------------------------------------------------------
 * The context role prevents a temporal block from being consumed outside its
 * authorized analytical responsibility.
 * ========================================================================== */

export type RfsTemporalContextRole =
  | "STRUCTURAL_REFERENCE"
  | "RECENT_CONTEXT"
  | "IMMEDIATE_TIMING";

/* ============================================================================
 * 6. TIMING STATE
 * ----------------------------------------------------------------------------
 * Timing state is descriptive private context.
 *
 * It is not:
 * - ALLOW
 * - WATCH
 * - BLOCK
 * - a recommendation
 * - a signal
 * - a prediction
 *
 * UNKNOWN must be used when the timing state cannot be demonstrated.
 * ========================================================================== */

export type RfsTimingState =
  | "FAVORABLE"
  | "NEUTRAL"
  | "UNFAVORABLE"
  | "UNKNOWN";

/* ============================================================================
 * 7. TEMPORAL BLOCK
 * ----------------------------------------------------------------------------
 * A temporal block transports values already produced by the authorized RFS
 * temporal computation boundary.
 *
 * It does not authorize downstream reconstruction.
 * ========================================================================== */

export type RfsTemporalBlock = Readonly<{
  /**
   * Official horizon represented by this block.
   */
  horizon:
    RfsTemporalHorizon;

  /**
   * Authorized contextual responsibility of this block.
   */
  context_role:
    RfsTemporalContextRole;

  /**
   * Explicit availability and computation state.
   */
  status:
    RfsTemporalStatus;

  /**
   * Number of valid observations used by the producer.
   *
   * This value supports traceability and controlled degradation.
   */
  observation_count:
    number;

  /**
   * First valid observation timestamp, expressed as an ISO-8601 UTC string.
   *
   * `null` means no valid temporal start could be demonstrated.
   */
  window_started_at:
    string | null;

  /**
   * Last valid observation timestamp, expressed as an ISO-8601 UTC string.
   *
   * `null` means no valid temporal end could be demonstrated.
   */
  window_ended_at:
    string | null;

  /**
   * Effective observed duration in milliseconds.
   *
   * It represents observed data span, not the nominal horizon duration.
   */
  observed_duration_ms:
    number | null;

  /**
   * Observed price variation across the block.
   *
   * This remains an observable temporal measure.
   */
  change_pct:
    RfsTemporalPercentage;

  /**
   * Observed slope across the block.
   *
   * This remains a contextual temporal measure and never replaces global
   * structure.
   */
  slope_pct:
    RfsTemporalPercentage;

  /**
   * Stability observed inside the temporal horizon.
   *
   * This score contextualizes the horizon only.
   * It never replaces the canonical global RFS stability score.
   */
  stability_score:
    RfsTemporalScore;

  /**
   * Rupture score observed inside the temporal horizon.
   *
   * This score contextualizes the horizon only.
   * It never replaces the canonical global RFS rupture score.
   */
  rupture_score:
    RfsTemporalScore;

  /**
   * Rupture probability observed inside the temporal horizon.
   *
   * This value remains private and must never be exposed directly by a public
   * contract.
   */
  rupture_probability:
    RfsTemporalScore;
}>;

/* ============================================================================
 * 8. COMPLETE RFS TEMPORAL CONTEXT
 * ----------------------------------------------------------------------------
 * This contract groups the authorized temporal readings without merging their
 * responsibilities.
 *
 * It preserves:
 * - one global reference
 * - one recent 7D context
 * - one immediate 24H timing context
 *
 * The grouping itself does not aggregate or calculate.
 * ========================================================================== */

export type RfsTemporalContext = Readonly<{
  /**
   * Global structural temporal reference.
   *
   * The global block remains the dominant temporal reading.
   */
  global:
    RfsTemporalBlock;

  /**
   * Recent seven-day context.
   *
   * This block contextualizes recent evolution and does not become a global
   * structural source of truth.
   */
  recent_7d:
    RfsTemporalBlock;

  /**
   * Immediate twenty-four-hour context.
   *
   * This block contextualizes timing only.
   */
  immediate_24h:
    RfsTemporalBlock;

  /**
   * Descriptive immediate timing qualification.
   *
   * It must be produced by the authorized RFS temporal producer from the
   * validated temporal context and propagated without reconstruction.
   */
  timing_state:
    RfsTimingState;

  /**
   * Temporal contract version attached by the authorized producer.
   */
  temporal_contract_version:
    typeof RFS_TEMPORAL_CONTRACT_VERSION;
}>;

/* ============================================================================
 * 9. TEMPORAL BLOCK SPECIALIZATIONS
 * ----------------------------------------------------------------------------
 * These aliases preserve explicit horizon identity for producer and consumer
 * contracts.
 *
 * They do not create alternative temporal truths.
 * ========================================================================== */

export type RfsGlobalTemporalBlock =
  RfsTemporalBlock & Readonly<{
    horizon: "GLOBAL";
    context_role:
      "STRUCTURAL_REFERENCE";
  }>;

export type RfsRecent7dTemporalBlock =
  RfsTemporalBlock & Readonly<{
    horizon: "RECENT_7D";
    context_role:
      "RECENT_CONTEXT";
  }>;

export type RfsImmediate24hTemporalBlock =
  RfsTemporalBlock & Readonly<{
    horizon: "IMMEDIATE_24H";
    context_role:
      "IMMEDIATE_TIMING";
  }>;

/* ============================================================================
 * 10. STRICT COMPLETE TEMPORAL CONTEXT
 * ----------------------------------------------------------------------------
 * This specialization ensures that each property carries the correct horizon
 * and contextual role.
 * ========================================================================== */

export type RfsCanonicalTemporalContext =
  Readonly<{
    global:
      RfsGlobalTemporalBlock;

    recent_7d:
      RfsRecent7dTemporalBlock;

    immediate_24h:
      RfsImmediate24hTemporalBlock;

    timing_state:
      RfsTimingState;

    temporal_contract_version:
      typeof RFS_TEMPORAL_CONTRACT_VERSION;
  }>;

/* ============================================================================
 * 11. TEMPORAL CONTRACT METADATA
 * ----------------------------------------------------------------------------
 * Static documentation metadata only.
 *
 * This object:
 * - does not inspect runtime values
 * - does not validate runtime values
 * - does not mutate runtime state
 * - does not persist
 * ========================================================================== */

export const RFS_TEMPORAL_CONTRACT_METADATA =
  Object.freeze({
    contract_name:
      "rfs-temporal-contract",

    contract_version:
      RFS_TEMPORAL_CONTRACT_VERSION,

    ownership_layer:
      "RFS",

    exposure_level:
      "PRIVATE",

    default_status_when_unavailable:
      "UNAVAILABLE" as const,

    canonical_horizons:
      Object.freeze([
        "GLOBAL",
        "RECENT_7D",
        "IMMEDIATE_24H",
      ] as const),

    canonical_context_roles:
      Object.freeze([
        "STRUCTURAL_REFERENCE",
        "RECENT_CONTEXT",
        "IMMEDIATE_TIMING",
      ] as const),

    canonical_timing_states:
      Object.freeze([
        "FAVORABLE",
        "NEUTRAL",
        "UNFAVORABLE",
        "UNKNOWN",
      ] as const),

    canonical_statuses:
      Object.freeze([
        "COMPUTED",
        "PARTIAL",
        "INSUFFICIENT_DATA",
        "UNAVAILABLE",
        "INVALID",
      ] as const),

    invariants:
      Object.freeze([
        "global_structure_remains_dominant",
        "recent_7d_context_does_not_replace_global_structure",
        "immediate_24h_context_is_timing_only",
        "null_means_explicitly_unavailable",
        "undefined_is_not_a_governed_business_value",
        "temporal_status_does_not_create_analytical_truth",
        "downstream_reconstruction_is_forbidden",
        "private_temporal_probabilities_are_not_publicly_exposable",
      ] as const),
  } as const);
