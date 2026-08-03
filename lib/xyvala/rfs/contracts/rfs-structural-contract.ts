/* ============================================================================
 * FILE: lib/xyvala/rfs/contracts/rfs-structural-contract.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical RFS structural market contract
 *
 * ROLE
 * - define the canonical private contract of RFS structural market outputs
 * - define the official identity of every governed RFS structural variable
 * - preserve the unique ownership of structural market truth
 * - provide the contractual boundary between the RFS producer and authorized
 *   downstream private consumers
 * - support Contract Before Runtime, Variable Governance, Propagation Audit,
 *   Boundary Protection and First Divergence Rule
 *
 * CLASSIFICATION
 * - CONTRACT
 * - PRIVATE ANALYTICAL CONTRACT
 * - READ-ONLY DECLARATION
 *
 * PARENTS
 * - Xyvala RFS Structural System
 * - Xyvala Variable Governance System
 * - Xyvala Variable Lineage and Traceability
 * - Xyvala Boundary Protection System
 * - Xyvala Contract Evolution System
 *
 * PRODUCER
 * - lib/xyvala/engine/rfs-market.ts
 *
 * AUTHORIZED CONSUMERS
 * - Triple Layer
 * - Impulse Layer
 * - Neutralization System
 * - Rupture Evolution System
 * - Crash System
 * - Analytical Aggregation System
 * - MCI
 * - private snapshot builders
 * - private traceability adapters
 *
 * OWNERSHIP
 * - RFS is the unique producer of structural market truth
 * - downstream layers may read or transport exact RFS values
 * - downstream layers never become owners of RFS variables
 * - downstream layers never reconstruct missing RFS variables
 *
 * INPUTS
 * - none
 *
 * OUTPUTS
 * - canonical RFS structural types
 * - canonical RFS market input contract
 * - canonical RFS structural result contract
 * - temporary migration-compatible RfsMarketResult contract
 * - governed variable identity declarations
 * - structural ownership declarations
 *
 * DIRECTIVES
 * - contract declarations only
 * - no analytical computation
 * - no score computation
 * - no score normalization
 * - no regime inference
 * - no rupture inference
 * - no crash inference
 * - no confidence inference
 * - no fallback generation
 * - no data repair
 * - no Triple Layer computation
 * - no Impulse Layer computation
 * - no MCI logic
 * - no calibration logic
 * - no snapshot construction
 * - no public projection
 * - no API logic
 * - no UI logic
 * - no persistence
 * - no runtime mutation
 *
 * INVARIANTS
 * - RFS remains the unique source of structural truth
 * - one structural reality has one official variable identity
 * - the contract never produces analytical values
 * - the contract never authorizes local reconstruction
 * - signature is mandatory in the canonical contract
 * - signature remains temporarily optional only in the migration contract
 * - 24H confirmation remains contextual and never defines global structure
 * - correlation remains present during the current compatibility phase
 * - evolution and growth migration must be explicit and versioned
 * - crash remains structurally distinct from rupture
 * - warnings describe qualified anomalies without altering analytical truth
 * - undefined is not an authorized business value
 * - no Triple Layer variable belongs to this contract
 * - no Impulse Layer variable belongs to this contract
 * - no MCI variable belongs to this contract
 * - no calibration variable belongs to this contract
 *
 * CANONICAL PROPAGATION
 * - Acquisition
 * - RFS producer
 * - RFS structural contract
 * - authorized private analytical consumers
 * - Analytical Aggregation System
 * - MCI
 * - Calibration
 * - Private Snapshot
 * - validated transformers
 *
 * MIGRATION POLICY
 * - RfsStructuralMarketResultContract is the canonical target
 * - RfsMarketResult is the temporary non-destructive compatibility contract
 * - signature optionality must not be used to justify runtime omission
 * - runRfsMarket must continue producing signature on every execution path
 * - migration completion requires historical fixtures to provide signature
 * - removal of compatibility optionality requires an explicit version change
 *
 * FIRST DIVERGENCE
 * - invalid structural value at production
 *   => RFS producer
 *
 * - valid RFS value absent from the result contract
 *   => RFS producer -> structural contract boundary
 *
 * - valid structural value altered by a consumer
 *   => structural contract -> consuming layer boundary
 *
 * - missing RFS value reconstructed downstream
 *   => violating downstream consumer
 *
 * SENSITIVE ZONES
 * - structural variable identity
 * - signature availability
 * - score and probability semantics
 * - rupture and crash separation
 * - temporary migration compatibility
 * - downstream dependency direction
 * ========================================================================== */

/* ============================================================================
 * 1. CONTRACT VERSION
 * ========================================================================== */

export const RFS_STRUCTURAL_CONTRACT_VERSION =
  "rfs-structural-contract-v1" as const;

export type RfsStructuralContractVersion =
  typeof RFS_STRUCTURAL_CONTRACT_VERSION;

/* ============================================================================
 * 2. CANONICAL SCORE AND PROBABILITY TYPES
 * ----------------------------------------------------------------------------
 * These aliases express semantic families only.
 *
 * They do not:
 * - clamp values
 * - validate values
 * - repair values
 * - generate neutral values
 *
 * Runtime validation belongs to a dedicated validator.
 * ========================================================================== */

export type RfsStructuralScore =
  number;

export type RfsStructuralProbability =
  number;

export type RfsStructuralRatio =
  number;

export type RfsStructuralPercentage =
  number;

export type RfsStructuralCount =
  number;

/* ============================================================================
 * 3. STRUCTURAL REGIME
 * ----------------------------------------------------------------------------
 * Regime is produced exclusively by RFS.
 *
 * It is:
 * - structural
 * - descriptive
 * - private analytical truth
 *
 * It is not:
 * - an investment decision
 * - a public recommendation
 * - an Impulse transition state
 * ========================================================================== */

export const RFS_REGIMES = [
  "STABLE",
  "TRANSITION",
  "VOLATILE",
] as const;

export type RfsRegime =
  (typeof RFS_REGIMES)[number];

/* ============================================================================
 * 4. RFS EXECUTION STATUS
 * ----------------------------------------------------------------------------
 * Status qualifies the technical and structural validity of the RFS reading.
 *
 * It must not be used as a replacement for missing analytical variables.
 * ========================================================================== */

export const RFS_STATUSES = [
  "VALID",
  "WEAK_STRUCTURE",
  "INSUFFICIENT_DATA",
  "INVALID",
] as const;

export type RfsStatus =
  (typeof RFS_STATUSES)[number];

/* ============================================================================
 * 5. CRASH STATE
 * ----------------------------------------------------------------------------
 * Crash state remains a distinct structural qualification.
 *
 * The contract does not authorize:
 * - copying rupture into crash
 * - deriving crash in downstream consumers
 * - reconstructing crash from regime
 * ========================================================================== */

export const RFS_CRASH_STATES = [
  "NONE",
  "RISING",
  "CRASH",
  "UNKNOWN",
] as const;

export type RfsCrashState =
  (typeof RFS_CRASH_STATES)[number];

/* ============================================================================
 * 6. MID-TERM STATE
 * ----------------------------------------------------------------------------
 * Mid-term state qualifies the current intermediate structural context.
 *
 * It remains descriptive and non-decision-making.
 * ========================================================================== */

export const RFS_MID_TERM_STATES = [
  "FAVORABLE",
  "NEUTRAL",
  "UNFAVORABLE",
] as const;

export type RfsMidTermState =
  (typeof RFS_MID_TERM_STATES)[number];

/* ============================================================================
 * 7. 24H CONFIRMATION ALIGNMENT
 * ----------------------------------------------------------------------------
 * 24H confirmation qualifies immediate alignment only.
 *
 * It never becomes:
 * - global structure
 * - stability
 * - regime
 * - rupture truth
 * ========================================================================== */

export const RFS_CONFIRMATION_ALIGNMENTS = [
  "ALIGNED",
  "OPPOSED",
  "NEUTRAL",
  "UNAVAILABLE",
] as const;

export type RfsConfirmationAlignment =
  (typeof RFS_CONFIRMATION_ALIGNMENTS)[number];

/* ============================================================================
 * 8. GOVERNED WARNING IDENTITIES
 * ----------------------------------------------------------------------------
 * Warnings qualify observed degradation or unavailable inputs.
 *
 * Warnings:
 * - never replace analytical values
 * - never create analytical truth
 * - never authorize silent reconstruction
 * ========================================================================== */

export const RFS_WARNING_CODES = [
  "rfs_invalid_price",
  "rfs_insufficient_sparkline_data",
  "rfs_insufficient_return_data",
  "rfs_weak_structure",
  "rfs_24h_confirmation_opposed",
  "rfs_24h_confirmation_unavailable",
  "rfs_market_cap_unavailable",
  "rfs_volume_24h_unavailable",
  "rfs_liquidity_support_fallback",
] as const;

export type RfsWarning =
  (typeof RFS_WARNING_CODES)[number];

/* ============================================================================
 * 9. CANONICAL MARKET INPUT CONTRACT
 * ----------------------------------------------------------------------------
 * This contract describes observable market inputs received by the RFS market
 * reader.
 *
 * NULLABILITY
 * - null means explicitly unavailable
 * - undefined is not part of the canonical runtime contract
 *
 * DIRECTIVES
 * - the contract does not repair provider values
 * - the contract does not create synthetic history
 * - the contract does not convert currencies
 * ========================================================================== */

export type RfsMarketInput = {
  price:
    number | null;

  chg_24h_pct:
    number | null;

  chg_7d_pct:
    number | null;

  sparkline_7d:
    number[] | null;

  market_cap:
    number | null;

  volume_24h:
    number | null;
};

/* ============================================================================
 * 10. CANONICAL STRUCTURAL SIGNATURE
 * ----------------------------------------------------------------------------
 * The signature transports the observable structural characteristics produced
 * by RFS.
 *
 * It is the authorized input foundation for downstream analytical layers.
 *
 * The signature:
 * - belongs to RFS
 * - is always produced by runRfsMarket
 * - must not be reconstructed downstream
 * - must not be confused with an Impulse signature
 * ========================================================================== */

export type RfsStructuralSignature = {
  net_move_pct_7d:
    RfsStructuralPercentage;

  amplitude_pct_7d:
    RfsStructuralPercentage;

  average_absolute_return_pct:
    RfsStructuralPercentage;

  volatility_pct:
    RfsStructuralPercentage;

  direction_changes_ratio:
    RfsStructuralRatio;

  rupture_ratio:
    RfsStructuralRatio;

  positive_return_count:
    RfsStructuralCount;

  negative_return_count:
    RfsStructuralCount;

  dominant_direction_ratio:
    RfsStructuralRatio;
};

/* ============================================================================
 * 11. STRUCTURAL METRICS
 * ----------------------------------------------------------------------------
 * Metrics describe observed counts and contextual support.
 *
 * They are not final scores and must not be substituted for scores.
 * ========================================================================== */

export type RfsMarketMetrics = {
  pattern_count:
    RfsStructuralCount;

  sample_size:
    RfsStructuralCount;

  direction_changes:
    RfsStructuralCount;

  rupture_events:
    RfsStructuralCount;

  stable_run_length:
    RfsStructuralCount;

  dominant_direction_ratio:
    RfsStructuralScore;

  liquidity_support:
    RfsStructuralScore;

  confirmation_alignment:
    RfsConfirmationAlignment;
};

/* ============================================================================
 * 12. STRUCTURAL AXES
 * ----------------------------------------------------------------------------
 * Current migration-compatible axes.
 *
 * OFFICIAL GOVERNANCE
 * - occurrence is an official structural axis
 * - convergence is an official structural axis
 * - duration is an official structural axis
 * - frequency is an official structural axis
 * - correlation remains temporarily represented during migration
 *
 * FUTURE GOVERNED MIGRATION
 * - evolution must become an explicit official axis
 * - growth must become an explicit official axis
 * - correlation must become a governed sub-measure of evolution
 *
 * No silent migration is authorized.
 * ========================================================================== */

export type RfsMarketAxes = {
  occurrence:
    RfsStructuralScore;

  convergence:
    RfsStructuralScore;

  duration:
    RfsStructuralScore;

  frequency:
    RfsStructuralScore;

  /**
   * Compatibility field.
   *
   * Correlation remains represented as an independent field until the
   * explicit migration toward the official evolution axis is completed.
   */
  correlation:
    RfsStructuralScore;
};

/* ============================================================================
 * 13. STRUCTURAL SCORES
 * ----------------------------------------------------------------------------
 * Every score preserves its distinct analytical responsibility.
 *
 * PROHIBITIONS
 * - stability must not replace structure
 * - structure must not replace stability
 * - rupture must not replace crash
 * - crash must not replace rupture
 * - mid_term must not replace global structure
 * ========================================================================== */

export type RfsMarketScores = {
  occurrence:
    RfsStructuralScore;

  convergence:
    RfsStructuralScore;

  duration:
    RfsStructuralScore;

  frequency:
    RfsStructuralScore;

  correlation:
    RfsStructuralScore;

  stability:
    RfsStructuralScore;

  structure:
    RfsStructuralScore;

  rupture:
    RfsStructuralScore;

  crash_score:
    RfsStructuralScore;

  mid_term:
    RfsStructuralScore;
};

/* ============================================================================
 * 14. STRUCTURAL STATES
 * ========================================================================== */

export type RfsMarketStates = {
  regime:
    RfsRegime;

  rfs_status:
    RfsStatus;

  mid_term_state:
    RfsMidTermState;

  crash_state:
    RfsCrashState;
};

/* ============================================================================
 * 15. STRUCTURAL PROBABILITIES
 * ----------------------------------------------------------------------------
 * Probabilities remain private analytical values.
 *
 * They must not be exposed publicly without an explicitly authorized
 * descriptive transformation.
 * ========================================================================== */

export type RfsMarketProbabilities = {
  rupture_probability:
    RfsStructuralProbability;

  continuity_probability:
    RfsStructuralProbability;
};

/* ============================================================================
 * 16. STRUCTURAL QUALITY
 * ----------------------------------------------------------------------------
 * Confidence remains private.
 *
 * It does not constitute:
 * - public confidence wording
 * - investment confidence
 * - a decision
 * ========================================================================== */

export type RfsMarketQuality = {
  confidence:
    RfsStructuralScore;
};

/* ============================================================================
 * 17. COMMON STRUCTURAL RESULT BODY
 * ----------------------------------------------------------------------------
 * Shared result fields used by both the canonical contract and the temporary
 * migration-compatible contract.
 * ========================================================================== */

type RfsStructuralResultBody = {
  metrics:
    RfsMarketMetrics;

  axes:
    RfsMarketAxes;

  scores:
    RfsMarketScores;

  states:
    RfsMarketStates;

  probabilities:
    RfsMarketProbabilities;

  quality:
    RfsMarketQuality;
};

/* ============================================================================
 * 18. CANONICAL RFS STRUCTURAL RESULT CONTRACT
 * ----------------------------------------------------------------------------
 * This is the target contract.
 *
 * CANONICAL REQUIREMENTS
 * - signature is mandatory
 * - all structural groups are mandatory
 * - warnings use governed warning identities
 * - no downstream analytical layer is embedded
 * ========================================================================== */

export type RfsStructuralMarketResultContract =
  RfsStructuralResultBody & {
    signature:
      RfsStructuralSignature;

    warnings:
      RfsWarning[];
  };

/* ============================================================================
 * 19. TEMPORARY MIGRATION-COMPATIBLE RESULT
 * ----------------------------------------------------------------------------
 * This compatibility type preserves the current RfsMarketResult identity while
 * historical fixtures and consumers migrate to the canonical contract.
 *
 * IMPORTANT
 * - runtime production must still include signature
 * - optionality exists only for non-destructive migration
 * - optionality must never justify omission in runRfsMarket
 * - warnings remain string[] temporarily for legacy consumers
 *
 * This type must be removed or narrowed through an explicit contract evolution.
 * ========================================================================== */

export type RfsMarketResult =
  RfsStructuralResultBody & {
    /**
     * Temporary migration compatibility.
     *
     * runRfsMarket must always provide this field.
     */
    signature?:
      RfsStructuralSignature;

    /**
     * Temporary compatibility with historical producers and fixtures.
     *
     * New warnings must use governed RfsWarning identities.
     */
    warnings:
      string[];
  };

/* ============================================================================
 * 20. CANONICAL RESULT NARROWING
 * ----------------------------------------------------------------------------
 * This type represents a migration-compatible result after signature presence
 * has been validated.
 *
 * It performs no runtime validation by itself.
 * ========================================================================== */

export type ValidatedRfsStructuralMarketResult =
  Omit<
    RfsMarketResult,
    "signature" | "warnings"
  > & {
    signature:
      RfsStructuralSignature;

    warnings:
      RfsWarning[];
  };

/* ============================================================================
 * 21. CANONICAL STRUCTURAL VARIABLE NAMES
 * ----------------------------------------------------------------------------
 * These names constitute the governed identity of RFS structural variables.
 *
 * No downstream synonym may replace them.
 * ========================================================================== */

export const RFS_STRUCTURAL_VARIABLE_NAMES = [
  "signature",

  "net_move_pct_7d",
  "amplitude_pct_7d",
  "average_absolute_return_pct",
  "volatility_pct",
  "direction_changes_ratio",
  "rupture_ratio",
  "positive_return_count",
  "negative_return_count",
  "dominant_direction_ratio",

  "pattern_count",
  "sample_size",
  "direction_changes",
  "rupture_events",
  "stable_run_length",
  "liquidity_support",
  "confirmation_alignment",

  "occurrence",
  "convergence",
  "duration",
  "frequency",
  "correlation",

  "stability",
  "structure",
  "rupture",
  "crash_score",
  "mid_term",

  "regime",
  "rfs_status",
  "mid_term_state",
  "crash_state",

  "rupture_probability",
  "continuity_probability",

  "confidence",
  "warnings",
] as const;

export type RfsStructuralVariableName =
  (typeof RFS_STRUCTURAL_VARIABLE_NAMES)[number];

/* ============================================================================
 * 22. STRUCTURAL OWNERSHIP MAP
 * ----------------------------------------------------------------------------
 * This map describes variable ownership.
 *
 * It does not:
 * - prove runtime availability
 * - validate values
 * - validate propagation
 * - calculate analytical truth
 * ========================================================================== */

export const RFS_STRUCTURAL_FIELD_OWNERSHIP =
  Object.freeze({
    signature:
      "RFS",

    net_move_pct_7d:
      "RFS",

    amplitude_pct_7d:
      "RFS",

    average_absolute_return_pct:
      "RFS",

    volatility_pct:
      "RFS",

    direction_changes_ratio:
      "RFS",

    rupture_ratio:
      "RFS",

    positive_return_count:
      "RFS",

    negative_return_count:
      "RFS",

    dominant_direction_ratio:
      "RFS",

    pattern_count:
      "RFS",

    sample_size:
      "RFS",

    direction_changes:
      "RFS",

    rupture_events:
      "RFS",

    stable_run_length:
      "RFS",

    liquidity_support:
      "RFS",

    confirmation_alignment:
      "RFS",

    occurrence:
      "RFS",

    convergence:
      "RFS",

    duration:
      "RFS",

    frequency:
      "RFS",

    correlation:
      "RFS",

    stability:
      "RFS",

    structure:
      "RFS",

    rupture:
      "RFS",

    crash_score:
      "RFS",

    mid_term:
      "RFS",

    regime:
      "RFS",

    rfs_status:
      "RFS",

    mid_term_state:
      "RFS",

    crash_state:
      "RFS",

    rupture_probability:
      "RFS",

    continuity_probability:
      "RFS",

    confidence:
      "RFS",

    warnings:
      "RFS",
  } as const satisfies Record<
    RfsStructuralVariableName,
    "RFS"
  >);

/* ============================================================================
 * 23. FORBIDDEN CROSS-LAYER FIELDS
 * ----------------------------------------------------------------------------
 * These fields must never be introduced into RfsMarketResult or the canonical
 * RFS structural result contract.
 *
 * Their source belongs to another analytical layer.
 * ========================================================================== */

export const RFS_STRUCTURAL_FORBIDDEN_CROSS_LAYER_FIELDS = [
  "triple_layer",
  "growth_layer_score",
  "core_pattern_score",
  "decay_score",

  "impulse",
  "impulse_pressure_score",
  "impulse_acceleration_score",
  "impulse_alignment_score",
  "impulse_instability_score",
  "impulse_saturation_score",
  "impulse_exhaustion_score",
  "impulse_directional_bias",
  "impulse_transition_state",
  "impulse_status",

  "structural_context",
  "transition_context",
  "risk_context",
  "temporal_context",

  "neutralized",
  "neutralization_reason",
  "neutralization_severity",
  "neutralization_validity",

  "opportunity_score",
  "decision",
  "allow",
  "watch",
  "block",

  "calibration",
  "calibration_policy",
  "calibration_thresholds",
] as const;

export type RfsStructuralForbiddenCrossLayerField =
  (typeof RFS_STRUCTURAL_FORBIDDEN_CROSS_LAYER_FIELDS)[number];

/* ============================================================================
 * 24. TRANSPORT METADATA
 * ----------------------------------------------------------------------------
 * Metadata describes contract ownership and propagation constraints.
 *
 * It never modifies analytical values.
 * ========================================================================== */

export type RfsStructuralTransportMetadata = {
  contract_version:
    RfsStructuralContractVersion;

  source_layer:
    "RFS";

  source_contract:
    "rfs-structural-contract";

  producer:
    "rfs-market";

  reconstruction_allowed:
    false;

  downstream_modification_allowed:
    false;

  direct_public_exposure_allowed:
    false;

  migration_compatibility_active:
    true;
};

/* ============================================================================
 * 25. CANONICAL TRANSPORT METADATA
 * ========================================================================== */

export const RFS_STRUCTURAL_TRANSPORT_METADATA:
  Readonly<RfsStructuralTransportMetadata> =
    Object.freeze({
      contract_version:
        RFS_STRUCTURAL_CONTRACT_VERSION,

      source_layer:
        "RFS",

      source_contract:
        "rfs-structural-contract",

      producer:
        "rfs-market",

      reconstruction_allowed:
        false,

      downstream_modification_allowed:
        false,

      direct_public_exposure_allowed:
        false,

      migration_compatibility_active:
        true,
    });

/* ============================================================================
 * 26. CONTRACT EVOLUTION METADATA
 * ----------------------------------------------------------------------------
 * This metadata documents known migration obligations.
 *
 * It does not perform migration.
 * ========================================================================== */

export const RFS_STRUCTURAL_CONTRACT_MIGRATION =
  Object.freeze({
    migration_required:
      true,

    current_contract:
      RFS_STRUCTURAL_CONTRACT_VERSION,

    canonical_target:
      "RfsStructuralMarketResultContract",

    compatibility_contract:
      "RfsMarketResult",

    required_changes:
      Object.freeze([
        "make_signature_mandatory_after_fixture_migration",
        "restrict_warnings_to_governed_warning_codes",
        "introduce_evolution_axis_through_versioned_migration",
        "introduce_growth_axis_through_versioned_migration",
        "move_correlation_under_evolution_through_versioned_migration",
        "preserve_crash_and_rupture_independence",
        "replace_synthetic_fallback_truths_with_explicit_availability_contracts",
      ] as const),

    prohibited_shortcuts:
      Object.freeze([
        "silent_contract_change",
        "downstream_signature_reconstruction",
        "cross_layer_field_injection",
        "silent_axis_renaming",
        "rupture_to_crash_aliasing",
        "interface_created_structural_truth",
      ] as const),
  });

/* ============================================================================
 * 27. TYPE-LEVEL OWNERSHIP ASSERTIONS
 * ----------------------------------------------------------------------------
 * Compile-time protection against ownership registry drift.
 *
 * These assertions produce no runtime behavior.
 * ========================================================================== */

type MissingStructuralOwnershipVariables =
  Exclude<
    RfsStructuralVariableName,
    keyof typeof RFS_STRUCTURAL_FIELD_OWNERSHIP
  >;

type UnknownStructuralOwnershipVariables =
  Exclude<
    keyof typeof RFS_STRUCTURAL_FIELD_OWNERSHIP,
    RfsStructuralVariableName
  >;

export type RfsStructuralOwnershipContractIsComplete =
  MissingStructuralOwnershipVariables extends never
    ? true
    : false;

export type RfsStructuralOwnershipContractHasNoUnknownVariable =
  UnknownStructuralOwnershipVariables extends never
    ? true
    : false;

/* ============================================================================
 * 28. TYPE-LEVEL CROSS-LAYER PROTECTION
 * ----------------------------------------------------------------------------
 * These assertions document that forbidden cross-layer fields do not belong to
 * the canonical structural result contract.
 * ========================================================================== */

type CanonicalStructuralResultKeys =
  keyof RfsStructuralMarketResultContract;

type DirectForbiddenStructuralResultKeys =
  Extract<
    CanonicalStructuralResultKeys,
    RfsStructuralForbiddenCrossLayerField
  >;

export type RfsStructuralContractHasNoDirectCrossLayerField =
  DirectForbiddenStructuralResultKeys extends never
    ? true
    : false;
