/* ============================================================================
 * FILE: lib/xyvala/rfs/contracts/rfs-score-contract.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical RFS structural score contract
 *
 * ROLE
 * - define the canonical input and output contracts of the RFS score engine
 * - define the official identities of RFS structural variables
 * - define explicit availability, degradation and computation states
 * - define the structural, rupture and temporal boundaries owned by RFS
 * - prevent downstream reconstruction and cross-layer ownership violations
 * - provide the contract-first foundation for the RFS modular architecture
 *
 * CLASSIFICATION
 * - CONTRACT
 * - READ-ONLY DEFINITIONS
 * - NO COMPUTE
 * - NO OBSERVE RUNTIME
 * - NO MUTATE
 *
 * POSITION IN OFFICIAL CHAIN
 * - Acquisition
 * - RFS
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
 * PARENTS
 * - lib/xyvala/rfs/rfs-types.ts
 * - lib/xyvala/governance/variable-lineage-registry.ts
 * - lib/xyvala/governance/governance-layer-order.ts
 *
 * AUTHORIZED CONSUMERS
 * - RFS input validator
 * - RFS segmentation modules
 * - RFS pattern modules
 * - RFS comparison modules
 * - RFS structural axes engine
 * - RFS rupture engine
 * - RFS rupture evolution engine
 * - RFS stability engine
 * - RFS regime resolver
 * - RFS temporal context engine
 * - RFS orchestrator
 * - Triple Layer input adapter
 * - Analytical Aggregation input adapter
 * - private snapshot projection
 * - propagation and boundary audits
 *
 * DIRECTIVES
 * - contract definitions only
 * - no analytical implementation
 * - no scoring formula
 * - no threshold policy
 * - no local clock access
 * - no timestamp generation
 * - no synthetic historical data
 * - no provider-data repair
 * - no MCI variable
 * - no calibration variable
 * - no Triple Layer variable
 * - no Impulse Layer variable
 * - no Crash System variable
 * - no public projection variable
 * - no API contract
 * - no UI contract
 * - no persistence
 * - no event publication
 * - no runtime mutation
 *
 * INPUTS
 * - real ordered price observations
 * - real ordered timestamp observations
 * - explicit input currency
 * - explicit input source identity
 * - explicit data version
 *
 * OUTPUTS
 * - canonical RFS structural result
 * - canonical structural axis readings
 * - canonical rupture readings
 * - canonical rupture evolution reading
 * - canonical global, 7D and 24H temporal contexts
 * - explicit availability and degradation metadata
 * - deterministic lineage metadata
 *
 * OWNERSHIP
 * - RFS owns structural truth
 * - RFS owns stability truth
 * - RFS owns regime truth
 * - RFS owns rupture truth
 * - RFS owns rupture evolution truth
 * - RFS owns structural temporal context
 *
 * NON-OWNERSHIP
 * - Crash System owns crash_score and crash_state
 * - Triple Layer owns growth_layer, core_pattern_layer and decay_layer
 * - Impulse Layer owns all impulse_* variables
 * - Analytical Aggregation owns aggregated contexts
 * - MCI owns opportunity, confidence and decision variables
 * - Calibration owns calibration policies and thresholds
 *
 * INVARIANTS
 * - one variable represents one canonical reality
 * - each canonical reality has one official name
 * - identical validated inputs and versions produce identical outputs
 * - missing analytical truth is represented by null
 * - null never means zero
 * - zero never means unavailable
 * - undefined is not a governed business value
 * - unavailable values are never reconstructed
 * - unavailable values are never replaced with neutral scores
 * - timestamps are never synthesized by this contract
 * - structural axes remain independent from rupture axes
 * - correlation remains a sub-measure of evolution
 * - 7D contextualizes recent structure only
 * - 24H contextualizes immediate timing only
 * - 7D and 24H never replace global structure
 * - RFS never produces a private decision
 * - RFS never exposes a public recommendation
 *
 * CONTRACT EVOLUTION
 * - versioned contract
 * - incompatible changes require an explicit migration
 * - field removal requires a deprecation period
 * - silent renaming is prohibited
 * - semantic changes require a new contract version
 *
 * SENSITIVE ZONES
 * - variable identity
 * - nullability
 * - timestamp integrity
 * - temporal horizon meaning
 * - structural and rupture ownership
 * - cross-layer boundaries
 * - contract versioning
 * ========================================================================== */

import type {
  RfsRegimeState,
} from "@/lib/xyvala/rfs/rfs-types";

/* ============================================================================
 * 1. CONTRACT IDENTITY
 * ========================================================================== */

export const RFS_SCORE_CONTRACT_NAME =
  "xyvala-rfs-score-contract" as const;

export const RFS_SCORE_CONTRACT_VERSION =
  "2.0.0" as const;

export const RFS_SCORE_ANALYTICAL_VERSION =
  "rfs-structural-v2" as const;

export type RfsScoreContractName =
  typeof RFS_SCORE_CONTRACT_NAME;

export type RfsScoreContractVersion =
  typeof RFS_SCORE_CONTRACT_VERSION;

export type RfsScoreAnalyticalVersion =
  typeof RFS_SCORE_ANALYTICAL_VERSION;

/* ============================================================================
 * 2. EXECUTION AND AVAILABILITY STATES
 * ========================================================================== */

export type RfsComputationStatus =
  | "computed"
  | "partial"
  | "insufficient_data"
  | "unavailable"
  | "invalid";

export type RfsPropagationStatus =
  | "full"
  | "degraded"
  | "blocked";

export type RfsAvailabilityReason =
  | "available"
  | "input_missing"
  | "input_invalid"
  | "prices_insufficient"
  | "timestamps_missing"
  | "timestamps_invalid"
  | "timestamps_unordered"
  | "series_length_mismatch"
  | "historical_baseline_missing"
  | "historical_comparison_insufficient"
  | "temporal_window_insufficient"
  | "producer_failure"
  | "contract_violation";

export type RfsValidationSeverity =
  | "information"
  | "warning"
  | "blocking";

export type RfsValidationIssue = {
  code: string;
  variable_name: string | null;
  severity: RfsValidationSeverity;
  reason: RfsAvailabilityReason;
};

/* ============================================================================
 * 3. CURRENCY AND SOURCE CONTRACTS
 * ----------------------------------------------------------------------------
 * EUR is the official default.
 *
 * Any alternative quote must remain explicit and must never be inferred.
 * ========================================================================== */

export type RfsQuoteCurrency =
  | "eur"
  | "usd"
  | "usdt";

export type RfsInputSource =
  | "coingecko"
  | "snapshot"
  | "runtime"
  | "test_fixture";

export type RfsInputMetadata = {
  quote_currency: RfsQuoteCurrency;

  source:
    RfsInputSource;

  source_version:
    string;

  data_version:
    string;
};

/* ============================================================================
 * 4. RAW INPUT CONTRACT
 * ----------------------------------------------------------------------------
 * The RFS contract accepts real observations only.
 *
 * Timestamps are mandatory because temporal segmentation and horizon analysis
 * must be based on observed time, not on synthetic reconstruction.
 * ========================================================================== */

export type RfsPriceObservation = {
  price: number;
  timestamp: number;
};

export type RfsScoreInput = {
  observations:
    readonly RfsPriceObservation[];

  metadata:
    Readonly<RfsInputMetadata>;
};

/* ============================================================================
 * 5. VALIDATED INPUT CONTRACT
 * ----------------------------------------------------------------------------
 * This contract represents data after validation.
 *
 * Validation may reject observations, but must never:
 * - generate timestamps
 * - generate prices
 * - reorder observations silently
 * - interpolate missing values
 * - replace invalid values with neutral values
 * ========================================================================== */

export type RfsValidatedInput = {
  prices:
    readonly number[];

  timestamps:
    readonly number[];

  observation_count:
    number;

  first_timestamp:
    number;

  last_timestamp:
    number;

  quote_currency:
    RfsQuoteCurrency;

  source:
    RfsInputSource;

  source_version:
    string;

  data_version:
    string;
};

/* ============================================================================
 * 6. HISTORICAL MODES
 * ========================================================================== */

export type RfsHistoricalMode =
  | "INSUFFICIENT_HISTORY"
  | "MONTH_TO_MONTH"
  | "YEAR_PHASE_COMPARISON";

export type RfsHistoricalContext = {
  historical_mode:
    RfsHistoricalMode;

  comparison_count:
    number;

  baseline_observation_count:
    number;

  baseline_status:
    RfsComputationStatus;

  baseline_availability_reason:
    RfsAvailabilityReason;
};

/* ============================================================================
 * 7. STRUCTURAL AXES
 * ----------------------------------------------------------------------------
 * Official primary axes:
 * - occurrence
 * - frequency
 * - convergence
 * - duration
 * - evolution
 * - growth
 *
 * Correlation is a sub-measure of evolution and is not a seventh primary axis.
 * ========================================================================== */

export type RfsStructuralAxes = {
  occurrence_score:
    number | null;

  frequency_score:
    number | null;

  convergence_score:
    number | null;

  duration_score:
    number | null;

  evolution_score:
    number | null;

  growth_score:
    number | null;

  status:
    RfsComputationStatus;

  availability_reason:
    RfsAvailabilityReason;
};

export type RfsEvolutionDetail = {
  correlation_score:
    number | null;

  direction_consistency_score:
    number | null;

  change_consistency_score:
    number | null;

  status:
    RfsComputationStatus;

  availability_reason:
    RfsAvailabilityReason;
};

/* ============================================================================
 * 8. PATTERN CONTRACT
 * ----------------------------------------------------------------------------
 * Pattern readings are structural evidence used by RFS.
 *
 * Pattern classification remains descriptive and never constitutes:
 * - a regime
 * - a rupture
 * - a transition
 * - an impulse
 * - a decision
 * ========================================================================== */

export type RfsPatternState =
  | "ASCENDING"
  | "DESCENDING"
  | "RANGE"
  | "EXPANDING"
  | "COMPRESSING"
  | "FRAGMENTED"
  | "IRREGULAR"
  | "UNAVAILABLE";

export type RfsPatternReading = {
  pattern_state:
    RfsPatternState;

  pattern_score:
    number | null;

  pattern_frequency_score:
    number | null;

  slope_pct:
    number | null;

  amplitude_pct:
    number | null;

  instability_score:
    number | null;

  break_rate:
    number | null;

  quality_score:
    number | null;

  duration_score:
    number | null;

  status:
    RfsComputationStatus;

  availability_reason:
    RfsAvailabilityReason;
};

/* ============================================================================
 * 9. RUPTURE AXES
 * ----------------------------------------------------------------------------
 * Rupture axes remain independent from structural continuity axes.
 *
 * Rupture probability and rupture score are separate governed variables even
 * when an initial implementation uses related evidence.
 * ========================================================================== */

export type RfsRuptureAxes = {
  rupture_occurrence_score:
    number | null;

  rupture_frequency_score:
    number | null;

  rupture_convergence_score:
    number | null;

  rupture_duration_score:
    number | null;

  rupture_evolution_score:
    number | null;

  status:
    RfsComputationStatus;

  availability_reason:
    RfsAvailabilityReason;
};

export type RfsRuptureEvolutionState =
  | "EXPLOSIVE"
  | "PERSISTENT"
  | "INCREASING"
  | "DECREASING"
  | "STABLE"
  | "INSUFFICIENT_DATA"
  | "UNAVAILABLE";

export type RfsRuptureEvolutionReading = {
  rupture_evolution_state:
    RfsRuptureEvolutionState;

  rupture_acceleration_score:
    number | null;

  rupture_persistence_score:
    number | null;

  rupture_deceleration_score:
    number | null;

  status:
    RfsComputationStatus;

  availability_reason:
    RfsAvailabilityReason;
};

export type RfsRuptureReading = {
  rupture_score:
    number | null;

  rupture_probability:
    number | null;

  rupture_penalty_score:
    number | null;

  continuity_probability:
    number | null;

  axes:
    Readonly<RfsRuptureAxes>;

  evolution:
    Readonly<RfsRuptureEvolutionReading>;

  status:
    RfsComputationStatus;

  availability_reason:
    RfsAvailabilityReason;
};

/* ============================================================================
 * 10. STABILITY CONTRACT
 * ========================================================================== */

export type RfsStabilityState =
  | "HIGH"
  | "MODERATE"
  | "LOW"
  | "INSUFFICIENT_DATA"
  | "UNAVAILABLE";

export type RfsStabilityReading = {
  stability_score:
    number | null;

  stability_state:
    RfsStabilityState;

  structure_score:
    number | null;

  coherence_score:
    number | null;

  status:
    RfsComputationStatus;

  availability_reason:
    RfsAvailabilityReason;
};

/* ============================================================================
 * 11. REGIME CONTRACT
 * ----------------------------------------------------------------------------
 * Regime remains an RFS structural state.
 *
 * It must be resolved only from validated upstream RFS truths and must never
 * be reconstructed by an adapter, snapshot, transformer, API or interface.
 * ========================================================================== */

export type RfsRegimeReading = {
  regime:
    RfsRegimeState | null;

  status:
    RfsComputationStatus;

  availability_reason:
    RfsAvailabilityReason;
};

/* ============================================================================
 * 12. TEMPORAL CONTRACTS
 * ----------------------------------------------------------------------------
 * GLOBAL
 * - authoritative structural horizon
 *
 * 7D
 * - recent structural context
 *
 * 24H
 * - immediate timing context
 *
 * Neither 7D nor 24H may replace or recalculate the global structural truth.
 * ========================================================================== */

export type RfsTemporalHorizon =
  | "GLOBAL"
  | "7D"
  | "24H";

export type RfsTimingState =
  | "FAVORABLE"
  | "NEUTRAL"
  | "UNFAVORABLE"
  | "INSUFFICIENT_DATA"
  | "UNAVAILABLE";

export type RfsTemporalReading = {
  horizon:
    RfsTemporalHorizon;

  observation_count:
    number;

  start_timestamp:
    number | null;

  end_timestamp:
    number | null;

  change_pct:
    number | null;

  slope_pct:
    number | null;

  stability_context_score:
    number | null;

  rupture_context_score:
    number | null;

  rupture_context_probability:
    number | null;

  timing_state:
    RfsTimingState | null;

  status:
    RfsComputationStatus;

  availability_reason:
    RfsAvailabilityReason;
};

export type RfsTemporalContext = {
  global:
    Readonly<RfsTemporalReading>;

  recent_7d:
    Readonly<RfsTemporalReading>;

  timing_24h:
    Readonly<RfsTemporalReading>;
};

/* ============================================================================
 * 13. STRUCTURAL PERIOD READINGS
 * ----------------------------------------------------------------------------
 * Period readings support structural comparison.
 *
 * They are not independent sources of stability, regime or rupture truth.
 * ========================================================================== */

export type RfsPeriodReading = {
  current_month_score:
    number | null;

  current_quarter_score:
    number | null;

  historical_baseline_score:
    number | null;

  status:
    RfsComputationStatus;

  availability_reason:
    RfsAvailabilityReason;
};

/* ============================================================================
 * 14. RFS SCORE RESULT
 * ----------------------------------------------------------------------------
 * This is the canonical output of the RFS structural score engine.
 *
 * It contains only truths owned by RFS.
 *
 * Explicitly excluded:
 * - crash_score
 * - crash_state
 * - growth_layer
 * - core_pattern_layer
 * - decay_layer
 * - impulse_pressure_score
 * - impulse_instability_score
 * - impulse_saturation_score
 * - impulse_exhaustion_score
 * - impulse_directional_bias
 * - impulse_transition_state
 * - opportunity_score
 * - confidence_score
 * - decision
 * - neutralization
 * - calibration
 * - public labels
 * ========================================================================== */

export type RfsScoreResult = {
  contract_name:
    RfsScoreContractName;

  contract_version:
    RfsScoreContractVersion;

  analytical_version:
    RfsScoreAnalyticalVersion;

  status:
    RfsComputationStatus;

  propagation_status:
    RfsPropagationStatus;

  availability_reason:
    RfsAvailabilityReason;

  quote_currency:
    RfsQuoteCurrency;

  source:
    RfsInputSource;

  source_version:
    string;

  data_version:
    string;

  observation_count:
    number;

  structural_axes:
    Readonly<RfsStructuralAxes>;

  evolution_detail:
    Readonly<RfsEvolutionDetail>;

  pattern:
    Readonly<RfsPatternReading>;

  stability:
    Readonly<RfsStabilityReading>;

  regime:
    Readonly<RfsRegimeReading>;

  rupture:
    Readonly<RfsRuptureReading>;

  temporal_context:
    Readonly<RfsTemporalContext>;

  period_context:
    Readonly<RfsPeriodReading>;

  historical_context:
    Readonly<RfsHistoricalContext>;

  validation_issues:
    readonly Readonly<RfsValidationIssue>[];
};

/* ============================================================================
 * 15. CANONICAL VARIABLE IDENTITIES
 * ----------------------------------------------------------------------------
 * These constants prevent local aliases and spelling drift.
 *
 * They are identity declarations only.
 * They do not prove runtime availability.
 * ========================================================================== */

export const RFS_SCORE_VARIABLE_NAMES =
  Object.freeze({
    OCCURRENCE_SCORE:
      "occurrence_score",

    FREQUENCY_SCORE:
      "frequency_score",

    CONVERGENCE_SCORE:
      "convergence_score",

    DURATION_SCORE:
      "duration_score",

    EVOLUTION_SCORE:
      "evolution_score",

    GROWTH_SCORE:
      "growth_score",

    CORRELATION_SCORE:
      "correlation_score",

    PATTERN_STATE:
      "pattern_state",

    PATTERN_SCORE:
      "pattern_score",

    PATTERN_FREQUENCY_SCORE:
      "pattern_frequency_score",

    STABILITY_SCORE:
      "stability_score",

    STABILITY_STATE:
      "stability_state",

    STRUCTURE_SCORE:
      "structure_score",

    COHERENCE_SCORE:
      "coherence_score",

    REGIME:
      "regime",

    RUPTURE_SCORE:
      "rupture_score",

    RUPTURE_PROBABILITY:
      "rupture_probability",

    RUPTURE_PENALTY_SCORE:
      "rupture_penalty_score",

    CONTINUITY_PROBABILITY:
      "continuity_probability",

    RUPTURE_OCCURRENCE_SCORE:
      "rupture_occurrence_score",

    RUPTURE_FREQUENCY_SCORE:
      "rupture_frequency_score",

    RUPTURE_CONVERGENCE_SCORE:
      "rupture_convergence_score",

    RUPTURE_DURATION_SCORE:
      "rupture_duration_score",

    RUPTURE_EVOLUTION_SCORE:
      "rupture_evolution_score",

    RUPTURE_EVOLUTION_STATE:
      "rupture_evolution_state",

    RUPTURE_ACCELERATION_SCORE:
      "rupture_acceleration_score",

    RUPTURE_PERSISTENCE_SCORE:
      "rupture_persistence_score",

    RUPTURE_DECELERATION_SCORE:
      "rupture_deceleration_score",

    CURRENT_MONTH_SCORE:
      "current_month_score",

    CURRENT_QUARTER_SCORE:
      "current_quarter_score",

    HISTORICAL_BASELINE_SCORE:
      "historical_baseline_score",
  } as const);

export type RfsScoreVariableName =
  (
    typeof RFS_SCORE_VARIABLE_NAMES
  )[keyof typeof RFS_SCORE_VARIABLE_NAMES];

/* ============================================================================
 * 16. EXCLUDED CROSS-LAYER VARIABLES
 * ----------------------------------------------------------------------------
 * Documentation-level protection against ownership drift.
 *
 * These names must never become fields of RfsScoreResult.
 * ========================================================================== */

export const RFS_SCORE_FORBIDDEN_VARIABLE_NAMES =
  Object.freeze([
    "crash_score",
    "crash_state",
    "crash_status",

    "growth_layer",
    "core_pattern_layer",
    "decay_layer",
    "triple_layer_state",

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

    "opportunity_score",
    "opportunity_status",
    "confidence_score",
    "confidence_status",
    "decision",
    "decision_status",

    "neutralized",
    "neutralization_reason",
    "neutralization_severity",
    "neutralization_validity",

    "calibration_allow_threshold",
    "calibration_watch_threshold",
    "calibration_block_threshold",
    "calibration_status",

    "public_impulse_context",
    "public_transition_label",
    "public_structure_transition",
  ] as const);

export type RfsScoreForbiddenVariableName =
  (
    typeof RFS_SCORE_FORBIDDEN_VARIABLE_NAMES
  )[number];

/* ============================================================================
 * 17. SCORE DOMAIN CONTRACT
 * ----------------------------------------------------------------------------
 * Runtime validators must enforce these boundaries.
 *
 * This file declares the contract but does not silently clamp values.
 * A producer returning an out-of-range value violates the contract.
 * ========================================================================== */

export const RFS_SCORE_MIN =
  0 as const;

export const RFS_SCORE_MAX =
  100 as const;

export const RFS_PROBABILITY_MIN =
  0 as const;

export const RFS_PROBABILITY_MAX =
  100 as const;

/* ============================================================================
 * 18. PURE CONTRACT HELPERS
 * ----------------------------------------------------------------------------
 * These functions are deterministic contract readers.
 *
 * They:
 * - do not repair
 * - do not normalize
 * - do not clamp
 * - do not mutate
 * - do not persist
 * - do not publish
 * ========================================================================== */

export function isRfsScoreValue(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= RFS_SCORE_MIN &&
    value <= RFS_SCORE_MAX
  );
}

export function isRfsNullableScoreValue(
  value: unknown,
): value is number | null {
  return (
    value === null ||
    isRfsScoreValue(value)
  );
}

export function isRfsTimestamp(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  );
}

export function isRfsPrice(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  );
}

export function isRfsComputationStatus(
  value: unknown,
): value is RfsComputationStatus {
  return (
    value === "computed" ||
    value === "partial" ||
    value === "insufficient_data" ||
    value === "unavailable" ||
    value === "invalid"
  );
}

export function isRfsPropagationStatus(
  value: unknown,
): value is RfsPropagationStatus {
  return (
    value === "full" ||
    value === "degraded" ||
    value === "blocked"
  );
}

export function isRfsHistoricalMode(
  value: unknown,
): value is RfsHistoricalMode {
  return (
    value === "INSUFFICIENT_HISTORY" ||
    value === "MONTH_TO_MONTH" ||
    value === "YEAR_PHASE_COMPARISON"
  );
}

export function isRfsTimingState(
  value: unknown,
): value is RfsTimingState {
  return (
    value === "FAVORABLE" ||
    value === "NEUTRAL" ||
    value === "UNFAVORABLE" ||
    value === "INSUFFICIENT_DATA" ||
    value === "UNAVAILABLE"
  );
}

/* ============================================================================
 * 19. CONTRACT ASSERTION RESULT
 * ----------------------------------------------------------------------------
 * Validation remains non-mutating.
 *
 * Detailed validation implementation should live in:
 * - lib/xyvala/rfs/validation/rfs-score-contract-validator.ts
 * ========================================================================== */

export type RfsScoreContractValidationResult = {
  ok:
    boolean;

  status:
    RfsComputationStatus;

  violation_count:
    number;

  warning_count:
    number;

  violations:
    readonly string[];

  warnings:
    readonly string[];
};

/* ============================================================================
 * 20. MIGRATION DECLARATION
 * ----------------------------------------------------------------------------
 * Version 2 intentionally separates responsibilities previously mixed inside
 * the legacy RFS-score implementation.
 *
 * INCOMPATIBLE OWNERSHIP CORRECTIONS
 * - crash variables leave the RFS score contract
 * - Triple Layer variables leave the RFS score contract
 * - Impulse Layer variables leave the RFS score contract
 * - confidence leaves the RFS score contract
 *
 * INCOMPATIBLE DATA-QUALITY CORRECTIONS
 * - timestamps become mandatory real observations
 * - unavailable values become null
 * - neutral values no longer represent missing data
 *
 * REQUIRED FOLLOW-UP
 * - add contract validator
 * - split RFS computation modules
 * - migrate RFS orchestrator
 * - migrate rfs-market.ts
 * - migrate private scan adapter
 * - update variable lineage registry
 * - add contract, propagation, boundary and regression tests
 * ========================================================================== */

export const RFS_SCORE_CONTRACT_MIGRATION =
  Object.freeze({
    from_version:
      "legacy-unversioned",

    to_version:
      RFS_SCORE_CONTRACT_VERSION,

    compatibility:
      "INCOMPATIBLE",

    migration_required:
      true,

    reasons: Object.freeze([
      "cross_layer_ownership_separation",
      "explicit_nullability",
      "real_timestamp_requirement",
      "official_structural_axes_alignment",
      "rupture_evolution_contract_introduction",
      "temporal_horizon_separation",
      "canonical_variable_identity_enforcement",
    ] as const),
  } as const);
