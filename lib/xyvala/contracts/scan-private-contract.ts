/* ============================================================================
 * FILE: lib/xyvala/contracts/scan-private-contract.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private scan contracts
 *
 * ROLE
 * - define private scan analytical contracts
 * - preserve internal RFS / MCI / calibration / decision fields
 * - isolate private analytical data from public ScanAsset exposure
 *
 * PARENTS
 * - lib/xyvala/contracts/scan-contract.ts
 * - lib/xyvala/rfs-core.ts
 * - lib/xyvala/opportunity-core.ts
 * - lib/xyvala/services/scan-service.ts
 *
 * DIRECTIVES
 * - private contracts only
 * - no runtime logic
 * - no API response building
 * - no UI dependency
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
 * - EUR is the default monetary reference
 * ========================================================================== */

import type { Quote } from "@/lib/xyvala/snapshot";

/* ============================================================================
 * 1. PRIVATE ENUMS
 * ========================================================================== */

export type PrivateScanRegime = "STABLE" | "TRANSITION" | "VOLATILE";

export type PrivateScanDecision = "ALLOW" | "WATCH" | "BLOCK";

export type PrivateScanStatus =
  | "computed"
  | "partial"
  | "degraded"
  | "unavailable";

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
  | "corrupted_distribution";

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

/* ============================================================================
 * 2. PRIVATE BASE ASSET
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
 * 3. PRIVATE STRUCTURAL SCORES
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

export type PrivateCrashScores = {
  crash_score: number | null;
  crash_state: "NONE" | "RISING" | "CRASH" | "UNKNOWN";
};

/* ============================================================================
 * 4. PRIVATE TEMPORAL SCORES
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
 * 5. PRIVATE TRIPLE LAYER
 * ========================================================================== */

export type PrivateTripleLayer = {
  state: PrivateTripleLayerState;

  growth_layer_score: number | null;
  core_pattern_score: number | null;
  decay_score: number | null;

  growth_status: PrivateScanStatus;
  core_status: PrivateScanStatus;
  decay_status: PrivateScanStatus;
};

/* ============================================================================
 * 6. PRIVATE NEUTRALIZATION
 * ========================================================================== */

export type PrivateNeutralization = {
  neutralized: boolean;
  neutralization_reason: PrivateNeutralizationReason;
  neutralization_severity: PrivateNeutralizationSeverity;
  neutralization_validity: PrivateScanStatus;
};

/* ============================================================================
 * 7. PRIVATE CALIBRATION
 * ========================================================================== */

export type PrivateCalibration = {
  calibration_status: PrivateCalibrationStatus;
  calibration_version: string | null;
  calibration_source: "fallback" | "bootstrap" | "calibrated" | "degraded";
  calibration_warnings: string[];
};

/* ============================================================================
 * 8. PRIVATE DECISION
 * ========================================================================== */

export type PrivateDecisionLayer = {
  regime: PrivateScanRegime;
  decision: PrivateScanDecision;
  decision_status: PrivateDecisionStatus;

  opportunity_score: number | null;
  opportunity_status: PrivateScanStatus;

  confidence_score: number | null;
  confidence_status: PrivateScanStatus;

  continuity_probability: number | null;
};

/* ============================================================================
 * 9. PRIVATE GOVERNANCE
 * ========================================================================== */

export type PrivateScanGovernance = {
  analytical_version: string;
  generated_at: string;

  source: "scan" | "fallback" | "snapshot" | "runtime";
  warnings: string[];

  deterministic: true;
  jurisdiction: "FR/EU";
  default_currency: "EUR";
};

/* ============================================================================
 * 10. PRIVATE SCAN ASSET
 * ========================================================================== */

export type PrivateScanAsset =
  PrivateScanAssetIdentity &
    PrivateScanMarketData &
    PrivateStructuralScores &
    PrivateRuptureScores &
    PrivateCrashScores &
    PrivateTemporalScores &
    PrivateTripleLayer &
    PrivateNeutralization &
    PrivateCalibration &
    PrivateDecisionLayer & {
      governance: PrivateScanGovernance;
    };

/* ============================================================================
 * 11. PRIVATE SNAPSHOT
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
  source: "scan" | "fallback" | "snapshot" | "runtime";
  market: "crypto";
  quote: Quote;
  count: number;
  data: PrivateScanAsset[];
  meta: PrivateScanSnapshotMeta;
  error: string | null;
};

/* ============================================================================
 * 12. PRIVATE CONTEXT
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
 * 13. PRIVATE HELPERS CONTRACTS
 * ========================================================================== */

export type PrivateScanAssetInput = Partial<PrivateScanAsset>;

export type PrivateScanSnapshotInput = {
  quote: Quote;
  assets: PrivateScanAsset[];
  warnings?: string[];
  error?: string | null;
};
