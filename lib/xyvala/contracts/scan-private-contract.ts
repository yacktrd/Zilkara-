/* ============================================================================
 * FILE: lib/xyvala/contracts/scan-private-contract.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private scan analytical contracts
 *
 * ROLE
 * - define the canonical private analytical contracts of the scan pipeline
 * - preserve internal RFS / pattern / transition / MCI / calibration fields
 * - preserve backward compatibility with validated private scan consumers
 * - isolate private analytical data from public ScanAsset exposure
 *
 * CLASSIFICATION
 * - CONTRACT
 * - no runtime execution
 * - no COMPUTE
 * - no OBSERVE
 * - no MUTATE
 *
 * PRODUCERS
 * - lib/xyvala/rfs-core.ts
 * - lib/xyvala/opportunity-core.ts
 * - Triple Layer producers
 * - Impulse Layer producers
 * - Analytical Aggregation System
 * - MCI
 * - Calibration
 * - lib/xyvala/services/scan-service.ts
 *
 * CONSUMERS
 * - private snapshot builders
 * - private analytical stores
 * - traceability stores
 * - private transformers
 * - private rankings
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/snapshot.ts
 *
 * INPUTS
 * - validated asset identity
 * - validated market data
 * - validated private analytical values
 * - validated governance and lineage metadata
 *
 * OUTPUTS
 * - PrivateScanAsset
 * - PrivateScanSnapshot
 * - PrivateMarketContext
 * - controlled private builder input contracts
 *
 * INVARIANTS
 * - contracts only
 * - no runtime logic
 * - no API response building
 * - no UI dependency
 * - no analytical reconstruction
 * - no implicit analytical default
 * - no public exposure by default
 * - private calculates, public displays
 * - decisions remain private
 * - regime remains private
 * - opportunity remains private
 * - stability score remains private
 * - rupture / crash / confidence remain private
 * - calibration remains private
 * - neutralization remains private
 * - broker / affiliate data remains private
 * - unavailable data must not be represented as neutral data
 * - legacy contract fields remain stable until a versioned migration occurs
 * - new pattern and transition contracts remain additive during migration
 * - EUR is the default monetary reference
 *
 * SENSITIVE AREAS
 * - private decisions
 * - private regimes
 * - structural scores
 * - pattern and transition truths
 * - rupture and crash values
 * - impulse values
 * - calibration thresholds
 * - neutralization
 * - analytical lineage
 * ========================================================================== */

import type { Quote } from "@/lib/xyvala/snapshot";

import type {
  RfsScoreInput,
} from "@/lib/xyvala/rfs/contracts/rfs-score-contract";

/* ============================================================================
 * 1. SHARED PRIVATE ENUMS
 * ========================================================================== */

export type PrivateScanStatus =
  | "computed"
  | "partial"
  | "degraded"
  | "unavailable";

export type PrivateScanSource =
  | "scan"
  | "fallback"
  | "snapshot"
  | "runtime";

export type PrivateScanRegime =
  | "STABLE"
  | "TRANSITION"
  | "VOLATILE";

export type PrivateScanDecision =
  | "ALLOW"
  | "WATCH"
  | "BLOCK";

export type PrivateDecisionStatus =
  | "valid"
  | "defensive"
  | "neutralized"
  | "unavailable";

export type PrivateNeutralizationReason =
  | "none"
  | "insufficient_data"
  | "contradictory_structure"
  | "unstable_distribution"
  | "excessive_decay"
  | "excessive_rupture"
  | "invalid_temporal_alignment"
  | "low_confidence"
  | "degraded_snapshot"
  | "corrupted_distribution"
  | "invalid_pattern_transition"
  | "invalid_structural_transition"
  | "invalid_impulse_propagation";

export type PrivateNeutralizationSeverity =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type PrivateRuptureEvolutionState =
  | "improving"
  | "stable"
  | "worsening"
  | "explosive"
  | "unknown";

export type PrivateCalibrationStatus =
  | "inactive"
  | "fallback"
  | "bootstrap"
  | "calibrated"
  | "degraded";

export type PrivateTripleLayerState =
  | "growth_dominant"
  | "core_dominant"
  | "decay_dominant"
  | "mixed"
  | "unknown";

export type PrivateLineageStatus =
  | "valid"
  | "partial"
  | "invalid"
  | "unavailable";

/* ============================================================================
 * 2. PRIVATE ASSET IDENTITY AND MARKET DATA
 * ========================================================================== */

export type PrivateScanAssetIdentity = {
  id: string;
  symbol: string;
  name: string;

  rank: number | null;
  logo_url: string | null;
};

export type PrivateScanMarketData = {
  quote: Quote;

  price: number | null;
  chg_24h_pct: number | null;
  chg_7d_pct: number | null;

  market_cap: number | null;
  volume_24h: number | null;

  sparkline_7d: number[] | null;
};

/* ============================================================================
 * 2-BIS. PRIVATE RFS ACQUISITION INPUT
 * ----------------------------------------------------------------------------
 * TITLE
 * - Canonical Acquisition -> RFS private transport
 *
 * ROLE
 * - transport the exact canonical RFS input required by the RFS producer
 * - preserve real price and timestamp observations
 * - preserve explicit currency, source and data-version metadata
 * - prevent scan-engine from reconstructing RFS input from sparkline values
 *
 * CLASSIFICATION
 * - PRIVATE CONTRACT PROJECTION
 * - READ-ONLY
 * - NO COMPUTE
 * - NO OBSERVE RUNTIME
 * - NO MUTATE
 *
 * SOURCE OF TRUTH
 * - lib/xyvala/rfs/contracts/rfs-score-contract.ts
 *
 * DIRECTIVES
 * - do not duplicate RfsPriceObservation
 * - do not duplicate RfsInputMetadata
 * - do not generate timestamps
 * - do not infer timestamps from sparkline indexes
 * - do not infer source versions
 * - do not infer data versions
 * - do not replace unavailable input with synthetic observations
 * - do not rebuild this contract inside scan-engine
 *
 * MIGRATION POLICY
 * - rfs_input is additive during the controlled migration
 * - rfs_input remains optional until all acquisition producers are migrated
 * - absence must produce explicit degraded RFS propagation
 * - once every producer is migrated, optionality may be removed only through
 *   a versioned incompatible contract migration
 *
 * INVARIANTS
 * - the embedded contract retains the exact identity of RfsScoreInput
 * - identical embedded input and analytical version produce identical RFS truth
 * - sparkline_7d is display-oriented market data and is not canonical RFS input
 * - no downstream layer may reconstruct missing RFS observations
 * ========================================================================== */

export type PrivateRfsInput =
  Readonly<RfsScoreInput>;


/* ============================================================================
 * 3. PRIVATE STRUCTURAL SCORES
 * ----------------------------------------------------------------------------
 * RFS remains the source of truth for structural scores.
 *
 * COMPATIBILITY
 * - legacy field names are intentionally preserved
 * - no silent migration is performed in this contract revision
 *
 * SENSITIVE AREA
 * - growth_score currently shares its flattened asset identity with the
 *   Triple Layer growth_score.
 * - this existing collision must be resolved through a dedicated, versioned
 *   migration after producer and consumer lineage has been established.
 * ========================================================================== */

export type PrivateStructuralScores = {
  stability_score: number | null;
  stability_status: PrivateScanStatus;

  structure_score: number | null;
  market_score: number | null;
  coherence_score: number | null;

  occurrence_score: number | null;
  frequency_score: number | null;
  convergence_score: number | null;
  duration_score: number | null;
  evolution_score: number | null;
  growth_score: number | null;
};

/* ============================================================================
 * 4. PRIVATE PATTERN CONTRACTS
 * ----------------------------------------------------------------------------
 * RFS remains the legitimate source of pattern identity and pattern-break
 * truth.
 *
 * MIGRATION POLICY
 * - pattern_context is additive
 * - it remains optional until its producer and propagation are validated
 * - no consumer may reconstruct it when absent
 * ========================================================================== */

export type PrivatePatternKind =
  | "UPTREND"
  | "DOWNTREND"
  | "RANGE"
  | "COMPRESSION"
  | "REVERSAL"
  | "UNKNOWN";

export type PrivatePatternBreakState =
  | "NONE"
  | "EMERGING"
  | "CONFIRMED"
  | "PERSISTENT"
  | "WEAKENING"
  | "RESOLVED"
  | "UNKNOWN";

export type PrivatePatternEvolutionState =
  | "STRENGTHENING"
  | "STABLE"
  | "ERODING"
  | "BREAKING"
  | "RECOVERING"
  | "UNKNOWN";

export type PrivatePatternContext = {
  pattern_kind: PrivatePatternKind;
  previous_pattern_kind: PrivatePatternKind;

  pattern_similarity_score: number | null;
  pattern_quality_score: number | null;
  pattern_duration_score: number | null;

  pattern_break_score: number | null;
  pattern_break_state: PrivatePatternBreakState;
  pattern_evolution_state: PrivatePatternEvolutionState;

  pattern_status: PrivateScanStatus;
};

/* ============================================================================
 * 5. PRIVATE STRUCTURAL TRANSITION CONTRACTS
 * ----------------------------------------------------------------------------
 * The structural transition producer remains the source of truth.
 *
 * Triple Layer, Impulse Layer and Analytical Aggregation may contextualize
 * these values but must never reconstruct or replace them.
 *
 * MIGRATION POLICY
 * - structural_transition is additive
 * - it remains optional until source production is validated
 * - absence must remain explicit
 * - rankings must not fabricate this contract from existing scores
 * ========================================================================== */

export type PrivateStructuralTransitionKind =
  | "NONE"
  | "FRAGMENTATION"
  | "COMPRESSION"
  | "EXPANSION"
  | "RECOVERY"
  | "REVERSAL"
  | "RECONFIGURATION"
  | "UNKNOWN";

export type PrivateStructuralTransitionState =
  | "NONE"
  | "EMERGING"
  | "CONFIRMED"
  | "PERSISTENT"
  | "WEAKENING"
  | "RESOLVED"
  | "CONFLICTED"
  | "UNKNOWN";

export type PrivateStructuralTransitionEvolution =
  | "ACCELERATING"
  | "GROWING"
  | "STABLE"
  | "SLOWING"
  | "DECLINING"
  | "RESOLVED"
  | "UNKNOWN";

export type PrivateStructuralTransition = {
  structural_transition_kind: PrivateStructuralTransitionKind;
  structural_transition_state: PrivateStructuralTransitionState;
  structural_transition_evolution: PrivateStructuralTransitionEvolution;

  structural_transition_occurrence_score: number | null;
  structural_transition_frequency_score: number | null;
  structural_transition_convergence_score: number | null;
  structural_transition_duration_score: number | null;
  structural_transition_growth_score: number | null;

  structural_transition_duration_count: number | null;

  structural_transition_status: PrivateScanStatus;
};

/* ============================================================================
 * 6. PRIVATE RUPTURE SCORES
 * ========================================================================== */

export type PrivateRuptureScores = {
  rupture_score: number | null;
  rupture_probability: number | null;
  rupture_penalty_score: number | null;

  rupture_occurrence_score: number | null;
  rupture_frequency_score: number | null;
  rupture_convergence_score: number | null;
  rupture_duration_score: number | null;

  rupture_evolution_score: number | null;
  rupture_evolution_state: PrivateRuptureEvolutionState;
  rupture_acceleration_score: number | null;
};

/* ============================================================================
 * 7. PRIVATE CRASH SCORES
 * ----------------------------------------------------------------------------
 * COMPATIBILITY
 * - crash_state intentionally preserves the currently propagated enum
 * - unavailable data must be handled by its producer or surrounding status
 * - UNAVAILABLE is not introduced into crash_state in this revision
 * ========================================================================== */

export type PrivateCrashState =
  | "NONE"
  | "RISING"
  | "CRASH"
  | "UNKNOWN";

export type PrivateCrashScores = {
  crash_score: number | null;
  crash_state: PrivateCrashState;
};

/* ============================================================================
 * 8. PRIVATE TEMPORAL SCORES
 * ----------------------------------------------------------------------------
 * Temporal blocks contextualize the 7D and 24H horizons.
 * They never replace or recalculate the global structural truth.
 *
 * COMPATIBILITY
 * - initial_7d / rolling_7d are preserved
 * - initial_24h / rolling_24h are preserved
 * - their semantic migration must occur separately if required
 * ========================================================================== */

export type PrivateTemporalBlock = {
  price_score: number | null;
  change_pct: number | null;
  slope_pct: number | null;

  stability_score: number | null;
  rupture_score: number | null;
  rupture_probability: number | null;

  status: PrivateScanStatus;
};

export type PrivateTemporalScores = {
  initial_7d: PrivateTemporalBlock | null;
  rolling_7d: PrivateTemporalBlock | null;

  initial_24h: PrivateTemporalBlock | null;
  rolling_24h: PrivateTemporalBlock | null;

  timing_state: "GOOD" | "NEUTRAL" | "BAD" | "UNKNOWN";
};

/* ============================================================================
 * 9. PRIVATE TRIPLE LAYER
 * ----------------------------------------------------------------------------
 * Triple Layer remains the source of Growth, Core Pattern and Decay context.
 *
 * COMPATIBILITY
 * - validated propagated field names are preserved
 * - no consumer migration is required by this revision
 * ========================================================================== */

export type PrivateTripleLayer = {
  state: PrivateTripleLayerState;

  growth_score: number | null;
  core_pattern_score: number | null;
  decay_score: number | null;

  growth_status: PrivateScanStatus;
  core_status: PrivateScanStatus;
  decay_status: PrivateScanStatus;
};

/* ============================================================================
 * 10. PRIVATE IMPULSE LAYER
 * ----------------------------------------------------------------------------
 * Impulse Layer remains the unique source of impulse variables.
 *
 * A NEUTRAL state must describe a validated neutral observation.
 * An unavailable impulse must be represented by impulse_status.
 * ========================================================================== */

export type PrivateImpulseDirectionalBias =
  | "UP"
  | "DOWN"
  | "MIXED"
  | "NEUTRAL";

export type PrivateImpulseTransitionState =
  | "COMPRESSION"
  | "PRESSURE_BUILDING"
  | "RELEASE"
  | "EXHAUSTION"
  | "NEUTRAL";

export type PrivateImpulseLayer = {
  impulse_pressure_score: number | null;
  impulse_acceleration_score: number | null;
  impulse_alignment_score: number | null;
  impulse_instability_score: number | null;
  impulse_saturation_score: number | null;
  impulse_exhaustion_score: number | null;

  impulse_directional_bias: PrivateImpulseDirectionalBias;
  impulse_transition_state: PrivateImpulseTransitionState;
  impulse_status: PrivateScanStatus;
};

/* ============================================================================
 * 11. PRIVATE NEUTRALIZATION
 * ----------------------------------------------------------------------------
 * COMPATIBILITY
 * - neutralization_validity is preserved
 * - a future rename requires a versioned coexistence period
 * ========================================================================== */

export type PrivateNeutralization = {
  neutralized: boolean;
  neutralization_reason: PrivateNeutralizationReason;
  neutralization_severity: PrivateNeutralizationSeverity;
  neutralization_validity: PrivateScanStatus;
};

/* ============================================================================
 * 12. PRIVATE ANALYTICAL AGGREGATION CONTEXTS
 * ----------------------------------------------------------------------------
 * Aggregated contexts only contextualize upstream truths.
 * They never become alternative analytical sources.
 *
 * COMPATIBILITY
 * - generic state strings are temporarily preserved
 * - context specialization requires a dedicated contract migration
 * - the duplicated context status union is replaced by an alias
 * ========================================================================== */

export type PrivateAggregatedContextStatus = PrivateScanStatus;

export type PrivateAggregatedContext = {
  state: string | null;
  status: PrivateAggregatedContextStatus;
  reason: string | null;
};

export type PrivateAnalyticalAggregationContexts = {
  structural_context: PrivateAggregatedContext | null;
  transition_context: PrivateAggregatedContext | null;
  risk_context: PrivateAggregatedContext | null;
  temporal_context: PrivateAggregatedContext | null;
};

/* ============================================================================
 * 13. PRIVATE CALIBRATION
 * ----------------------------------------------------------------------------
 * Calibration adjusts decision policies only.
 * It never recalculates analytical market truths.
 *
 * COMPATIBILITY
 * - existing calibration status and source values are preserved
 * - status/source separation requires a dedicated migration
 * ========================================================================== */

export type PrivateCalibrationSource =
  | "fallback"
  | "bootstrap"
  | "calibrated"
  | "degraded";

export type PrivateCalibration = {
  calibration_status: PrivateCalibrationStatus;
  calibration_version: string | null;
  calibration_source: PrivateCalibrationSource;
  calibration_warnings: string[];

  calibration_allow_threshold: number | null;
  calibration_watch_threshold: number | null;
  calibration_block_threshold: number | null;
};

/* ============================================================================
 * 14. PRIVATE DECISION
 * ----------------------------------------------------------------------------
 * INVARIANT
 * - WATCH remains the defensive private default
 * - unavailable, defensive or neutralized decision states must not silently
 *   result in an effective ALLOW
 * ========================================================================== */

export type PrivateDecisionLayer = {
  regime: PrivateScanRegime;
  decision: PrivateScanDecision;
  decision_status: PrivateDecisionStatus;

  decision_score: number | null;

  opportunity_score: number | null;
  opportunity_status: PrivateScanStatus;

  confidence_score: number | null;
  confidence_status: PrivateScanStatus;

  continuity_probability: number | null;
};

/* ============================================================================
 * 15. PRIVATE GOVERNANCE AND LINEAGE
 * ----------------------------------------------------------------------------
 * Governance describes source, propagation and boundary integrity.
 * It must never reconstruct an analytical value.
 * ========================================================================== */

export type PrivateScanGovernance = {
  analytical_version: string;
  generated_at: string;

  source: PrivateScanSource;
  warnings: string[];

  deterministic: true;
  jurisdiction: "FR/EU";
  default_currency: "EUR";

  lineage_status: PrivateLineageStatus;
  source_layer: string;
  source_contract: string;
  propagation_path: string[];

  last_valid_boundary: string | null;
  first_invalid_boundary: string | null;
};

/* ============================================================================
 * 16. PRIVATE SCAN ASSET
 * ----------------------------------------------------------------------------
 * The private asset remains flat for backward compatibility.
 *
 * CANONICAL RFS INPUT
 * - rfs_input transports the validated Acquisition -> RFS input contract
 * - rfs_input is not an RFS output
 * - rfs_input is not analytical truth
 * - rfs_input must be populated by an authorized acquisition producer
 * - scan-engine may consume it but must never reconstruct it
 *
 * MIGRATION POLICY
 * - rfs_input remains optional during the controlled migration
 * - missing rfs_input must produce degraded or unavailable RFS propagation
 * - sparkline_7d must never be silently promoted into canonical RFS input
 * - rfs_input can become mandatory only after all producers have been migrated
 *   and an explicit contract-version migration has been completed
 *
 * New pattern and structural-transition contracts are nested and optional
 * during their controlled migration. This prevents:
 * - flat field collisions
 * - forced runtime defaults
 * - silent reconstruction
 * - immediate breakage of existing producers
 *
 * INVARIANTS
 * - no duplicated RFS input metadata exists at the asset root
 * - no duplicated observation contract exists in this file
 * - RFS input identity remains governed by the RFS score contract
 * - absent upstream truth remains absent
 * - no consumer may infer timestamps, versions or source identities
 * ========================================================================== */

export type PrivateScanAsset =
  PrivateScanAssetIdentity &
    PrivateScanMarketData &
    PrivateStructuralScores &
    PrivateRuptureScores &
    PrivateCrashScores &
    PrivateTemporalScores &
    PrivateTripleLayer &
    PrivateImpulseLayer &
    PrivateNeutralization &
    PrivateAnalyticalAggregationContexts &
    PrivateCalibration &
    PrivateDecisionLayer & {
      /**
       * Canonical Acquisition -> RFS transport.
       *
       * Optional only during the controlled contract migration.
       * Its absence must never trigger local reconstruction.
       */
      rfs_input?: PrivateRfsInput;

      pattern_context?:
        PrivatePatternContext;

      structural_transition?:
        PrivateStructuralTransition;

      governance:
        PrivateScanGovernance;
    };

/* ============================================================================
 * 17. PRIVATE SNAPSHOT
 * ========================================================================== */

export type PrivateScanSnapshotMeta = {
  quote: Quote;
  count: number;
  warnings: string[];
};

export type PrivateScanSnapshot = {
  ok: boolean;
  ts: string;
  version: string;

  source: PrivateScanSource;

  market: "crypto";
  quote: Quote;

  count: number;
  data: PrivateScanAsset[];

  meta: PrivateScanSnapshotMeta;

  error: string | null;
};

/* ============================================================================
 * 18. PRIVATE MARKET CONTEXT
 * ========================================================================== */

export type PrivateMarketContext = {
  dominant_regime: PrivateScanRegime;
  dominant_decision: PrivateScanDecision;

  average_stability_score: number | null;
  average_opportunity_score: number | null;
  average_confidence_score: number | null;
  average_rupture_score: number | null;

  neutralized_count: number;
  degraded_count: number;

  market_bias: "DEFENSIVE" | "NEUTRAL" | "OFFENSIVE";

  warnings: string[];
};

/* ============================================================================
 * 19. PRIVATE CONTROLLED INPUT CONTRACTS
 * ----------------------------------------------------------------------------
 * COMPATIBILITY
 * - the legacy Partial input remains available because current builders may
 *   depend on it
 * - it is explicitly marked as a migration-sensitive helper
 * - builders must not use missing fields as permission to reconstruct values
 * ========================================================================== */

/**
 * Legacy private asset builder input.
 *
 * This helper remains intentionally backward compatible.
 * Missing analytical fields must remain missing until produced by their
 * legitimate source layer.
 */
export type PrivateScanAssetInput = Partial<PrivateScanAsset>;

export type PrivateScanSnapshotInput = {
  quote: Quote;
  assets: PrivateScanAsset[];
  warnings?: string[];
  error?: string | null;
};
