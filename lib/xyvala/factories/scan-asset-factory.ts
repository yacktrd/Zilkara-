/* ============================================================================
 * FILE: lib/xyvala/factories/scan-asset-factory.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical private scan asset factory
 *
 * ROLE
 * - validate canonical private scan asset inputs
 * - normalize contract-safe primitive representations
 * - preserve already-computed analytical truths
 * - initialize every PrivateScanAsset field
 * - construct the canonical PrivateScanAsset contract
 *
 * CLASSIFICATION
 * - PRIVATE FACTORY
 * - READ / VALIDATE / NORMALIZE / PROJECT
 * - no analytical COMPUTE
 * - no public projection
 * - no MUTATE
 *
 * UPSTREAM
 * - lib/xyvala/stores/market-traceability-adapter.ts
 * - private analytical producers
 *
 * DOWNSTREAM
 * - private traceability orchestration
 * - lib/xyvala/services/scan-transformer.ts
 *
 * DIRECTIVES
 * - private factory only
 * - no API logic
 * - no UI logic
 * - no snapshot writing
 * - no RFS recomputation
 * - no Triple Layer recomputation
 * - no Impulse Layer recomputation
 * - no MCI recomputation
 * - no calibration recomputation
 * - no public field acceptance
 * - no synthetic identity
 * - no synthetic analytical version
 * - no synthetic timestamp
 * - no synthetic provenance
 * - no score clamping
 * - no string-to-number coercion
 * - no partial array repair
 * - no analytical status inference
 * - no cross-variable fallback
 * - no silent repair
 * - deterministic normalization only
 * - EUR remains the default monetary reference
 *
 * INVARIANTS
 * - every PrivateScanAsset field is initialized
 * - null means explicitly unavailable
 * - unavailable never becomes neutral
 * - unavailable never becomes computed
 * - one input variable maps to one output variable
 * - missing canonical identity causes rejection
 * - missing analytical metadata causes rejection
 * - structural_transition is propagated as one canonical contract
 * - impulse_status is propagated, never inferred
 * - warnings are normalized, deduplicated and deterministically ordered
 * - governance describes only boundaries already crossed
 * - same valid input produces the same output
 * ========================================================================== */

import type { Quote } from "@/lib/xyvala/snapshot";

import type {
  PrivateAggregatedContext,
  PrivateCalibrationStatus,
  PrivateDecisionStatus,
  PrivateImpulseDirectionalBias,
  PrivateImpulseTransitionState,
  PrivateNeutralizationReason,
  PrivateNeutralizationSeverity,
  PrivateRuptureEvolutionState,
  PrivateScanAsset,
  PrivateScanDecision,
  PrivateScanRegime,
  PrivateScanStatus,
  PrivateTripleLayerState,
} from "@/lib/xyvala/contracts/scan-private-contract";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type PrivateStructuralTransitionContract =
  NonNullable<
    PrivateScanAsset["structural_transition"]
  >;

type PrivateGovernance =
  PrivateScanAsset["governance"];

type PrivateSource =
  PrivateGovernance["source"];

type TemporalInput = {
  price_score?: unknown;
  change_pct?: unknown;
  slope_pct?: unknown;
  stability_score?: unknown;
  rupture_score?: unknown;
  rupture_probability?: unknown;
  status?: unknown;
};

export type BuildPrivateScanAssetInput = {
  /* --------------------------------------------------------------------------
   * Canonical identity
   * ----------------------------------------------------------------------- */

  id: unknown;
  symbol: unknown;
  name: unknown;

  /* --------------------------------------------------------------------------
   * Canonical observables
   * ----------------------------------------------------------------------- */

  quote?: unknown;

  price?: unknown;
  chg_24h_pct?: unknown;
  chg_7d_pct?: unknown;

  market_cap?: unknown;
  volume_24h?: unknown;

  sparkline_7d?: unknown;

  rank?: unknown;
  logo_url?: unknown;

  /* --------------------------------------------------------------------------
   * Structural transition
   * ----------------------------------------------------------------------- */

  structural_transition?: unknown;

  /* --------------------------------------------------------------------------
   * RFS structural truths
   * ----------------------------------------------------------------------- */

  stability_score?: unknown;
  stability_status?: unknown;

  structure_score?: unknown;
  market_score?: unknown;
  coherence_score?: unknown;

  occurrence_score?: unknown;
  frequency_score?: unknown;
  convergence_score?: unknown;
  duration_score?: unknown;
  evolution_score?: unknown;

  growth_score?: unknown;

  /* --------------------------------------------------------------------------
   * Rupture truths
   * ----------------------------------------------------------------------- */

  rupture_score?: unknown;
  rupture_probability?: unknown;
  rupture_penalty_score?: unknown;

  rupture_occurrence_score?: unknown;
  rupture_frequency_score?: unknown;
  rupture_convergence_score?: unknown;
  rupture_duration_score?: unknown;

  rupture_evolution_score?: unknown;
  rupture_evolution_state?: unknown;
  rupture_acceleration_score?: unknown;

  /* --------------------------------------------------------------------------
   * Crash system
   * ----------------------------------------------------------------------- */

  crash_score?: unknown;
  crash_state?: unknown;

  /* --------------------------------------------------------------------------
   * Temporal system
   * ----------------------------------------------------------------------- */

  initial_7d?: unknown;
  rolling_7d?: unknown;
  initial_24h?: unknown;
  rolling_24h?: unknown;

  timing_state?: unknown;

  /* --------------------------------------------------------------------------
   * Triple Layer
   * ----------------------------------------------------------------------- */

  triple_layer_state?: unknown;

  /*
   * Canonical PrivateScanAsset output uses growth_score.
   *
   * growth_layer_score remains accepted temporarily only because the current
   * upstream adapter still uses this field name. The factory rejects
   * conflicting simultaneous values.
   */
  growth_layer_score?: unknown;

  core_pattern_score?: unknown;
  decay_score?: unknown;

  growth_status?: unknown;
  core_status?: unknown;
  decay_status?: unknown;

  /* --------------------------------------------------------------------------
   * Impulse Layer
   * ----------------------------------------------------------------------- */

  impulse_pressure_score?: unknown;
  impulse_acceleration_score?: unknown;
  impulse_alignment_score?: unknown;
  impulse_instability_score?: unknown;
  impulse_saturation_score?: unknown;
  impulse_exhaustion_score?: unknown;

  impulse_directional_bias?: unknown;
  impulse_transition_state?: unknown;
  impulse_status?: unknown;

  /* --------------------------------------------------------------------------
   * Neutralization
   * ----------------------------------------------------------------------- */

  neutralized?: unknown;
  neutralization_reason?: unknown;
  neutralization_severity?: unknown;
  neutralization_validity?: unknown;

  /* --------------------------------------------------------------------------
   * Calibration
   * ----------------------------------------------------------------------- */

  calibration_status?: unknown;
  calibration_version?: unknown;
  calibration_source?: unknown;
  calibration_warnings?: unknown;

  calibration_allow_threshold?: unknown;
  calibration_watch_threshold?: unknown;
  calibration_block_threshold?: unknown;

  /* --------------------------------------------------------------------------
   * MCI
   * ----------------------------------------------------------------------- */

  regime?: unknown;

  decision?: unknown;
  decision_status?: unknown;
  decision_score?: unknown;

  opportunity_score?: unknown;
  opportunity_status?: unknown;

  confidence_score?: unknown;
  confidence_status?: unknown;

  continuity_probability?: unknown;

  /* --------------------------------------------------------------------------
   * Analytical aggregation
   * ----------------------------------------------------------------------- */

  structural_context?: unknown;
  transition_context?: unknown;
  risk_context?: unknown;
  temporal_context?: unknown;

  /* --------------------------------------------------------------------------
   * Canonical metadata
   * ----------------------------------------------------------------------- */

  analytical_version: unknown;
  generated_at: unknown;
  source: unknown;

  warnings?: unknown;
};

/* ============================================================================
 * 2. VERSION
 * ========================================================================== */

export const SCAN_ASSET_FACTORY_VERSION =
  "2.0.0" as const;

/* ============================================================================
 * 3. OBJECT AND STRING HELPERS
 * ========================================================================== */

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasOwn(
  source: Record<string, unknown>,
  key: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(
    source,
    key,
  );
}

function readExact(
  source: Record<string, unknown>,
  key: string,
): unknown {
  return hasOwn(source, key)
    ? source[key]
    : null;
}

function normalizeRequiredString(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value.trim();

  return normalized.length > 0
    ? normalized
    : null;
}

function requireString(
  value: unknown,
  errorCode: string,
): string {
  const normalized =
    normalizeRequiredString(value);

  if (!normalized) {
    throw new Error(errorCode);
  }

  return normalized;
}

function normalizeNullableString(
  value: unknown,
): string | null {
  return normalizeRequiredString(value);
}

/* ============================================================================
 * 4. NUMBER HELPERS
 * ----------------------------------------------------------------------------
 * No string-to-number conversion is permitted.
 * No clamping is permitted.
 * No truncation is permitted.
 * ========================================================================== */

function normalizeNullableNumber(
  value: unknown,
): number | null {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  )
    ? value
    : null;
}

function normalizeScore(
  value: unknown,
): number | null {
  const normalized =
    normalizeNullableNumber(value);

  if (
    normalized === null ||
    normalized < 0 ||
    normalized > 100
  ) {
    return null;
  }

  return normalized;
}

function normalizePositiveInteger(
  value: unknown,
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    return null;
  }

  return value;
}

/* ============================================================================
 * 5. ARRAY AND URL HELPERS
 * ========================================================================== */

function normalizeSparkline(
  value: unknown,
): number[] | null {
  if (
    !Array.isArray(value) ||
    value.length < 2
  ) {
    return null;
  }

  if (
    !value.every(
      (point) =>
        typeof point === "number" &&
        Number.isFinite(point),
    )
  ) {
    return null;
  }

  return [...value];
}

function normalizeLogoUrl(
  value: unknown,
): string | null {
  const normalized =
    normalizeRequiredString(value);

  if (!normalized) {
    return null;
  }

  if (
    normalized.startsWith("https://") ||
    normalized.startsWith("/")
  ) {
    return normalized;
  }

  return null;
}

/* ============================================================================
 * 6. WARNING NORMALIZATION
 * ========================================================================== */

function compareDeterministicStrings(
  left: string,
  right: string,
): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function normalizeWarnings(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const warnings =
    value
      .filter(
        (warning): warning is string =>
          typeof warning === "string",
      )
      .map((warning) =>
        warning.trim(),
      )
      .filter(
        (warning) =>
          warning.length > 0,
      );

  return [
    ...new Set(warnings),
  ].sort(compareDeterministicStrings);
}

/* ============================================================================
 * 7. CANONICAL METADATA
 * ========================================================================== */

function normalizeQuote(
  value: unknown,
): Quote {
  if (value === "usd") {
    return "usd";
  }

  if (value === "usdt") {
    return "usdt";
  }

  return "eur";
}

function normalizeIsoTimestamp(
  value: unknown,
): string | null {
  const normalized =
    normalizeRequiredString(value);

  if (!normalized) {
    return null;
  }

  const timestamp =
    Date.parse(normalized);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp)
    .toISOString();
}

function requireIsoTimestamp(
  value: unknown,
): string {
  const normalized =
    normalizeIsoTimestamp(value);

  if (!normalized) {
    throw new Error(
      "scan_asset_factory_generated_at_invalid",
    );
  }

  return normalized;
}

function normalizeSource(
  value: unknown,
): PrivateSource | null {
  switch (value) {
    case "scan":
    case "snapshot":
    case "runtime":
    case "fallback":
      return value;

    default:
      return null;
  }
}

function requireSource(
  value: unknown,
): PrivateSource {
  const normalized =
    normalizeSource(value);

  if (!normalized) {
    throw new Error(
      "scan_asset_factory_source_invalid",
    );
  }

  return normalized;
}

/* ============================================================================
 * 8. STATUS NORMALIZERS
 * ----------------------------------------------------------------------------
 * Status values are never inferred from scores.
 * ========================================================================== */

function normalizeExplicitScanStatus(
  value: unknown,
): PrivateScanStatus {
  switch (value) {
    case "computed":
    case "partial":
    case "degraded":
    case "unavailable":
      return value;

    default:
      return "unavailable";
  }
}

function normalizeDecisionStatus(
  value: unknown,
): PrivateDecisionStatus {
  switch (value) {
    case "valid":
    case "neutralized":
    case "defensive":
    case "unavailable":
      return value;

    default:
      return "unavailable";
  }
}

/* ============================================================================
 * 9. RFS AND MCI ENUM NORMALIZERS
 * ----------------------------------------------------------------------------
 * Some private contracts require initialized enum values.
 *
 * Where no UNKNOWN enum exists, a defensive placeholder is returned only
 * together with an unavailable status owned by the corresponding domain.
 * ========================================================================== */

function normalizeRegime(
  value: unknown,
): PrivateScanRegime {
  switch (value) {
    case "STABLE":
    case "TRANSITION":
    case "VOLATILE":
      return value;

    default:
      /*
       * PrivateScanRegime currently has no UNKNOWN member.
       *
       * TRANSITION is retained only as the required defensive contract
       * placeholder. The factory does not claim that it was analytically
       * computed.
       */
      return "TRANSITION";
  }
}

function normalizeDecision(
  value: unknown,
): PrivateScanDecision {
  switch (value) {
    case "ALLOW":
    case "WATCH":
    case "BLOCK":
      return value;

    default:
      /*
       * WATCH is the required defensive private placeholder.
       * decision_status remains unavailable when no explicit decision exists.
       */
      return "WATCH";
  }
}

function normalizeRuptureEvolutionState(
  value: unknown,
): PrivateRuptureEvolutionState {
  switch (value) {
    case "improving":
    case "stable":
    case "worsening":
    case "explosive":
    case "unknown":
      return value;

    default:
      return "unknown";
  }
}

function normalizeTripleLayerState(
  value: unknown,
): PrivateTripleLayerState {
  switch (value) {
    case "growth_dominant":
    case "core_dominant":
    case "decay_dominant":
    case "mixed":
    case "unknown":
      return value;

    default:
      return "unknown";
  }
}

function normalizeImpulseDirectionalBias(
  value: unknown,
): PrivateImpulseDirectionalBias {
  switch (value) {
    case "UP":
    case "DOWN":
    case "MIXED":
    case "NEUTRAL":
      return value;

    default:
      return "NEUTRAL";
  }
}

function normalizeImpulseTransitionState(
  value: unknown,
): PrivateImpulseTransitionState {
  switch (value) {
    case "COMPRESSION":
    case "PRESSURE_BUILDING":
    case "RELEASE":
    case "EXHAUSTION":
    case "NEUTRAL":
      return value;

    default:
      /*
       * The enum currently has no UNKNOWN state.
       *
       * NEUTRAL is only a structural placeholder. Availability is controlled
       * exclusively by impulse_status, which becomes unavailable when the
       * input state is invalid.
       */
      return "NEUTRAL";
  }
}

function isExplicitImpulseTransitionState(
  value: unknown,
): boolean {
  return (
    value === "COMPRESSION" ||
    value === "PRESSURE_BUILDING" ||
    value === "RELEASE" ||
    value === "EXHAUSTION" ||
    value === "NEUTRAL"
  );
}

function normalizeNeutralizationReason(
  value: unknown,
): PrivateNeutralizationReason {
  switch (value) {
    case "none":
    case "insufficient_data":
    case "contradictory_structure":
    case "unstable_distribution":
    case "excessive_decay":
    case "excessive_rupture":
    case "invalid_temporal_alignment":
    case "low_confidence":
    case "degraded_snapshot":
    case "corrupted_distribution":
      return value;

    default:
      return "none";
  }
}

function normalizeNeutralizationSeverity(
  value: unknown,
): PrivateNeutralizationSeverity {
  switch (value) {
    case "none":
    case "low":
    case "medium":
    case "high":
    case "critical":
      return value;

    default:
      return "none";
  }
}

function normalizeCalibrationStatus(
  value: unknown,
): PrivateCalibrationStatus {
  switch (value) {
    case "inactive":
    case "fallback":
    case "bootstrap":
    case "calibrated":
    case "degraded":
      return value;

    default:
      return "inactive";
  }
}

function normalizeCalibrationSource(
  value: unknown,
):
  | "fallback"
  | "bootstrap"
  | "calibrated"
  | "degraded" {
  switch (value) {
    case "fallback":
    case "bootstrap":
    case "calibrated":
    case "degraded":
      return value;

    default:
      return "fallback";
  }
}

function normalizeCrashState(
  value: unknown,
):
  | "NONE"
  | "RISING"
  | "CRASH"
  | "UNKNOWN" {
  switch (value) {
    case "NONE":
    case "RISING":
    case "CRASH":
    case "UNKNOWN":
      return value;

    default:
      return "UNKNOWN";
  }
}

function normalizeTimingState(
  value: unknown,
):
  | "GOOD"
  | "NEUTRAL"
  | "BAD"
  | "UNKNOWN" {
  switch (value) {
    case "GOOD":
    case "NEUTRAL":
    case "BAD":
    case "UNKNOWN":
      return value;

    default:
      return "UNKNOWN";
  }
}

/* ============================================================================
 * 10. STRUCTURAL TRANSITION
 * ========================================================================== */

function normalizeStructuralTransitionStatus(
  value: unknown,
): PrivateScanStatus {
  return normalizeExplicitScanStatus(
    value,
  );
}

function normalizeStructuralTransitionKind(
  value: unknown,
): PrivateStructuralTransitionContract[
  "structural_transition_kind"
] {
  switch (value) {
    case "NONE":
    case "FRAGMENTATION":
    case "COMPRESSION":
    case "EXPANSION":
    case "RECOVERY":
    case "REVERSAL":
    case "RECONFIGURATION":
    case "UNKNOWN":
      return value;

    default:
      return "UNKNOWN";
  }
}

function normalizeStructuralTransitionState(
  value: unknown,
): PrivateStructuralTransitionContract[
  "structural_transition_state"
] {
  switch (value) {
    case "NONE":
    case "EMERGING":
    case "CONFIRMED":
    case "PERSISTENT":
    case "WEAKENING":
    case "RESOLVED":
    case "CONFLICTED":
    case "UNKNOWN":
      return value;

    default:
      return "UNKNOWN";
  }
}

function normalizeStructuralTransitionEvolution(
  value: unknown,
): PrivateStructuralTransitionContract[
  "structural_transition_evolution"
] {
  switch (value) {
    case "ACCELERATING":
    case "GROWING":
    case "STABLE":
    case "SLOWING":
    case "DECLINING":
    case "RESOLVED":
    case "UNKNOWN":
      return value;

    default:
      return "UNKNOWN";
  }
}

function normalizeNonNegativeInteger(
  value: unknown,
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    return null;
  }

  return value;
}

function normalizeStructuralTransition(
  value: unknown,
): PrivateStructuralTransitionContract {
  if (!isPlainObject(value)) {
    return {
      structural_transition_status:
        "unavailable",

      structural_transition_kind:
        "UNKNOWN",

      structural_transition_state:
        "UNKNOWN",

      structural_transition_evolution:
        "UNKNOWN",

      structural_transition_occurrence_score:
        null,

      structural_transition_frequency_score:
        null,

      structural_transition_convergence_score:
        null,

      structural_transition_growth_score:
        null,

      structural_transition_duration_score:
        null,

      structural_transition_duration_count:
        null,
    };
  }

  const status =
    normalizeStructuralTransitionStatus(
      readExact(
        value,
        "structural_transition_status",
      ),
    );

  const kind =
    normalizeStructuralTransitionKind(
      readExact(
        value,
        "structural_transition_kind",
      ),
    );

  const state =
    normalizeStructuralTransitionState(
      readExact(
        value,
        "structural_transition_state",
      ),
    );

  const evolution =
    normalizeStructuralTransitionEvolution(
      readExact(
        value,
        "structural_transition_evolution",
      ),
    );

  const occurrenceScore =
    normalizeScore(
      readExact(
        value,
        "structural_transition_occurrence_score",
      ),
    );

  const frequencyScore =
    normalizeScore(
      readExact(
        value,
        "structural_transition_frequency_score",
      ),
    );

  const convergenceScore =
    normalizeScore(
      readExact(
        value,
        "structural_transition_convergence_score",
      ),
    );

  const growthScore =
    normalizeScore(
      readExact(
        value,
        "structural_transition_growth_score",
      ),
    );

  const durationScore =
    normalizeScore(
      readExact(
        value,
        "structural_transition_duration_score",
      ),
    );

  const durationCount =
    normalizeNonNegativeInteger(
      readExact(
        value,
        "structural_transition_duration_count",
      ),
    );

  const hasUnknownComponent =
    kind === "UNKNOWN" ||
    state === "UNKNOWN" ||
    evolution === "UNKNOWN";

  return {
    structural_transition_status:
      hasUnknownComponent
        ? "unavailable"
        : status,

    structural_transition_kind:
      kind,

    structural_transition_state:
      state,

    structural_transition_evolution:
      evolution,

    structural_transition_occurrence_score:
      occurrenceScore,

    structural_transition_frequency_score:
      frequencyScore,

    structural_transition_convergence_score:
      convergenceScore,

    structural_transition_growth_score:
      growthScore,

    structural_transition_duration_score:
      durationScore,

    structural_transition_duration_count:
      durationCount,
  };
}

/* ============================================================================
 * 11. TEMPORAL BLOCKS
 * ========================================================================== */

function normalizeTemporalBlock(
  value: unknown,
) {
  if (!isPlainObject(value)) {
    return {
      price_score: null,
      change_pct: null,
      slope_pct: null,
      stability_score: null,
      rupture_score: null,
      rupture_probability: null,
      status: "unavailable" as const,
    };
  }

  const input =
    value as TemporalInput;

  return {
    price_score:
      normalizeScore(
        input.price_score,
      ),

    change_pct:
      normalizeNullableNumber(
        input.change_pct,
      ),

    slope_pct:
      normalizeNullableNumber(
        input.slope_pct,
      ),

    stability_score:
      normalizeScore(
        input.stability_score,
      ),

    rupture_score:
      normalizeScore(
        input.rupture_score,
      ),

    rupture_probability:
      normalizeScore(
        input.rupture_probability,
      ),

    status:
      normalizeExplicitScanStatus(
        input.status,
      ),
  };
}

/* ============================================================================
 * 12. AGGREGATED CONTEXT
 * ========================================================================== */

function normalizeAggregatedContext(
  value: unknown,
): PrivateAggregatedContext | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const state =
    normalizeRequiredString(
      readExact(
        value,
        "state",
      ),
    );

  if (!state) {
    return null;
  }

  return {
    state,

    status:
      normalizeExplicitScanStatus(
        readExact(
          value,
          "status",
        ),
      ),

    reason:
      normalizeNullableString(
        readExact(
          value,
          "reason",
        ),
      ),
  };
}

/* ============================================================================
 * 13. TRIPLE LAYER GROWTH RESOLUTION
 * ----------------------------------------------------------------------------
 * Temporary migration bridge.
 *
 * No silent conflict is accepted.
 * ========================================================================== */

function resolveGrowthScore(
  input: BuildPrivateScanAssetInput,
): number | null {
  const canonical =
    normalizeScore(
      input.growth_score,
    );

  const legacyLayerValue =
    normalizeScore(
      input.growth_layer_score,
    );

  if (
    canonical !== null &&
    legacyLayerValue !== null &&
    canonical !== legacyLayerValue
  ) {
    throw new Error(
      "scan_asset_factory_growth_score_conflict",
    );
  }

  return canonical ??
    legacyLayerValue;
}

/* ============================================================================
 * 14. FACTORY
 * ========================================================================== */

export function buildPrivateScanAsset(
  input: BuildPrivateScanAssetInput,
): PrivateScanAsset {
  /* --------------------------------------------------------------------------
   * Mandatory identity
   * ----------------------------------------------------------------------- */

  const id =
    requireString(
      input.id,
      "scan_asset_factory_id_missing",
    ).toLowerCase();

  const symbol =
    requireString(
      input.symbol,
      "scan_asset_factory_symbol_missing",
    ).toUpperCase();

  const name =
    requireString(
      input.name,
      "scan_asset_factory_name_missing",
    );

  /* --------------------------------------------------------------------------
   * Mandatory metadata
   * ----------------------------------------------------------------------- */

  const analyticalVersion =
    requireString(
      input.analytical_version,
      "scan_asset_factory_analytical_version_missing",
    );

  const generatedAt =
    requireIsoTimestamp(
      input.generated_at,
    );

  const source =
    requireSource(
      input.source,
    );

  /* --------------------------------------------------------------------------
   * Scores and statuses
   * ----------------------------------------------------------------------- */

  const stabilityScore =
    normalizeScore(
      input.stability_score,
    );

  const growthScore =
    resolveGrowthScore(input);

  const corePatternScore =
    normalizeScore(
      input.core_pattern_score,
    );

  const decayScore =
    normalizeScore(
      input.decay_score,
    );

  const opportunityScore =
    normalizeScore(
      input.opportunity_score,
    );

  const confidenceScore =
    normalizeScore(
      input.confidence_score,
    );

  const impulsePressureScore =
    normalizeScore(
      input.impulse_pressure_score,
    );

  const impulseAccelerationScore =
    normalizeScore(
      input.impulse_acceleration_score,
    );

  const impulseAlignmentScore =
    normalizeScore(
      input.impulse_alignment_score,
    );

  const impulseInstabilityScore =
    normalizeScore(
      input.impulse_instability_score,
    );

  const impulseSaturationScore =
    normalizeScore(
      input.impulse_saturation_score,
    );

  const impulseExhaustionScore =
    normalizeScore(
      input.impulse_exhaustion_score,
    );

  const impulseStateIsExplicit =
    isExplicitImpulseTransitionState(
      input.impulse_transition_state,
    );

  const explicitImpulseStatus =
    normalizeExplicitScanStatus(
      input.impulse_status,
    );

  const impulseStatus:
    PrivateScanStatus =
      impulseStateIsExplicit
        ? explicitImpulseStatus
        : "unavailable";

  const decisionIsExplicit =
    input.decision === "ALLOW" ||
    input.decision === "WATCH" ||
    input.decision === "BLOCK";

  const decisionStatus:
    PrivateDecisionStatus =
      decisionIsExplicit
        ? normalizeDecisionStatus(
            input.decision_status,
          )
        : "unavailable";

  /* --------------------------------------------------------------------------
   * Canonical output
   * ----------------------------------------------------------------------- */

  return {
    id,
    symbol,
    name,

    rank:
      normalizePositiveInteger(
        input.rank,
      ),

    logo_url:
      normalizeLogoUrl(
        input.logo_url,
      ),

    quote:
      normalizeQuote(
        input.quote,
      ),

    price:
      normalizeNullableNumber(
        input.price,
      ),

    chg_24h_pct:
      normalizeNullableNumber(
        input.chg_24h_pct,
      ),

    chg_7d_pct:
      normalizeNullableNumber(
        input.chg_7d_pct,
      ),

    market_cap:
      normalizeNullableNumber(
        input.market_cap,
      ),

    volume_24h:
      normalizeNullableNumber(
        input.volume_24h,
      ),

    sparkline_7d:
      normalizeSparkline(
        input.sparkline_7d,
      ),

    /* ------------------------------------------------------------------------
     * Structural transition
     * --------------------------------------------------------------------- */

    structural_transition:
      normalizeStructuralTransition(
        input.structural_transition,
      ),

    /* ------------------------------------------------------------------------
     * RFS structural truths
     * --------------------------------------------------------------------- */

    stability_score:
      stabilityScore,

    stability_status:
      normalizeExplicitScanStatus(
        input.stability_status,
      ),

    structure_score:
      normalizeScore(
        input.structure_score,
      ),

    market_score:
      normalizeScore(
        input.market_score,
      ),

    coherence_score:
      normalizeScore(
        input.coherence_score,
      ),

    occurrence_score:
      normalizeScore(
        input.occurrence_score,
      ),

    frequency_score:
      normalizeScore(
        input.frequency_score,
      ),

    convergence_score:
      normalizeScore(
        input.convergence_score,
      ),

    duration_score:
      normalizeScore(
        input.duration_score,
      ),

    evolution_score:
      normalizeScore(
        input.evolution_score,
      ),

    /* ------------------------------------------------------------------------
     * Rupture truths
     * --------------------------------------------------------------------- */

    rupture_score:
      normalizeScore(
        input.rupture_score,
      ),

    rupture_probability:
      normalizeScore(
        input.rupture_probability,
      ),

    rupture_penalty_score:
      normalizeScore(
        input.rupture_penalty_score,
      ),

    rupture_occurrence_score:
      normalizeScore(
        input.rupture_occurrence_score,
      ),

    rupture_frequency_score:
      normalizeScore(
        input.rupture_frequency_score,
      ),

    rupture_convergence_score:
      normalizeScore(
        input.rupture_convergence_score,
      ),

    rupture_duration_score:
      normalizeScore(
        input.rupture_duration_score,
      ),

    rupture_evolution_score:
      normalizeScore(
        input.rupture_evolution_score,
      ),

    rupture_evolution_state:
      normalizeRuptureEvolutionState(
        input.rupture_evolution_state,
      ),

    rupture_acceleration_score:
      normalizeScore(
        input.rupture_acceleration_score,
      ),

    /* ------------------------------------------------------------------------
     * Crash system
     * --------------------------------------------------------------------- */

    crash_score:
      normalizeScore(
        input.crash_score,
      ),

    crash_state:
      normalizeCrashState(
        input.crash_state,
      ),

    /* ------------------------------------------------------------------------
     * Temporal system
     * --------------------------------------------------------------------- */

    initial_7d:
      normalizeTemporalBlock(
        input.initial_7d,
      ),

    rolling_7d:
      normalizeTemporalBlock(
        input.rolling_7d,
      ),

    initial_24h:
      normalizeTemporalBlock(
        input.initial_24h,
      ),

    rolling_24h:
      normalizeTemporalBlock(
        input.rolling_24h,
      ),

    timing_state:
      normalizeTimingState(
        input.timing_state,
      ),

    /* ------------------------------------------------------------------------
     * Triple Layer
     * --------------------------------------------------------------------- */

    state:
      normalizeTripleLayerState(
        input.triple_layer_state,
      ),

    growth_score:
      growthScore,

    core_pattern_score:
      corePatternScore,

    decay_score:
      decayScore,

    growth_status:
      normalizeExplicitScanStatus(
        input.growth_status,
      ),

    core_status:
      normalizeExplicitScanStatus(
        input.core_status,
      ),

    decay_status:
      normalizeExplicitScanStatus(
        input.decay_status,
      ),

    /* ------------------------------------------------------------------------
     * Impulse Layer
     * --------------------------------------------------------------------- */

    impulse_pressure_score:
      impulsePressureScore,

    impulse_acceleration_score:
      impulseAccelerationScore,

    impulse_alignment_score:
      impulseAlignmentScore,

    impulse_instability_score:
      impulseInstabilityScore,

    impulse_saturation_score:
      impulseSaturationScore,

    impulse_exhaustion_score:
      impulseExhaustionScore,

    impulse_directional_bias:
      normalizeImpulseDirectionalBias(
        input.impulse_directional_bias,
      ),

    impulse_transition_state:
      normalizeImpulseTransitionState(
        input.impulse_transition_state,
      ),

    impulse_status:
      impulseStatus,

    /* ------------------------------------------------------------------------
     * Neutralization
     * --------------------------------------------------------------------- */

    neutralized:
      input.neutralized === true,

    neutralization_reason:
      normalizeNeutralizationReason(
        input.neutralization_reason,
      ),

    neutralization_severity:
      normalizeNeutralizationSeverity(
        input.neutralization_severity,
      ),

    neutralization_validity:
      normalizeExplicitScanStatus(
        input.neutralization_validity,
      ),

    /* ------------------------------------------------------------------------
     * Calibration
     * --------------------------------------------------------------------- */

    calibration_status:
      normalizeCalibrationStatus(
        input.calibration_status,
      ),

    calibration_version:
      normalizeNullableString(
        input.calibration_version,
      ),

    calibration_source:
      normalizeCalibrationSource(
        input.calibration_source,
      ),

    calibration_warnings:
      normalizeWarnings(
        input.calibration_warnings,
      ),

    calibration_allow_threshold:
      normalizeScore(
        input.calibration_allow_threshold,
      ),

    calibration_watch_threshold:
      normalizeScore(
        input.calibration_watch_threshold,
      ),

    calibration_block_threshold:
      normalizeScore(
        input.calibration_block_threshold,
      ),

    /* ------------------------------------------------------------------------
     * RFS regime and MCI decision
     * --------------------------------------------------------------------- */

    regime:
      normalizeRegime(
        input.regime,
      ),

    decision:
      normalizeDecision(
        input.decision,
      ),

    decision_status:
      decisionStatus,

    decision_score:
      normalizeScore(
        input.decision_score,
      ),

    opportunity_score:
      opportunityScore,

    opportunity_status:
      normalizeExplicitScanStatus(
        input.opportunity_status,
      ),

    confidence_score:
      confidenceScore,

    confidence_status:
      normalizeExplicitScanStatus(
        input.confidence_status,
      ),

    continuity_probability:
      normalizeScore(
        input.continuity_probability,
      ),

    /* ------------------------------------------------------------------------
     * Analytical aggregation
     * --------------------------------------------------------------------- */

    structural_context:
      normalizeAggregatedContext(
        input.structural_context,
      ),

    transition_context:
      normalizeAggregatedContext(
        input.transition_context,
      ),

    risk_context:
      normalizeAggregatedContext(
        input.risk_context,
      ),

    temporal_context:
      normalizeAggregatedContext(
        input.temporal_context,
      ),

    /* ------------------------------------------------------------------------
     * Governance
     *
     * This factory describes only boundaries already crossed.
     * --------------------------------------------------------------------- */

    governance: {
      analytical_version:
        analyticalVersion,

      generated_at:
        generatedAt,

      source,

      warnings:
        normalizeWarnings(
          input.warnings,
        ),

      deterministic:
        true,

      jurisdiction:
        "FR/EU",

      default_currency:
        "EUR",

      /*
       * Successfully constructing this contract means the adapter-to-factory
       * boundary was valid. Analytical unavailability remains represented by
       * statuses and nulls and does not by itself invalidate lineage.
       */
      lineage_status:
        "valid",

      source_layer:
        "MARKET_TRACEABILITY_ADAPTER",

      source_contract:
        "PrivateScanAsset",

      propagation_path: [
        "MARKET_EVALUATION",
        "MARKET_TRACEABILITY_ADAPTER",
        "PRIVATE_SCAN_ASSET",
      ],

      last_valid_boundary:
        "MARKET_TRACEABILITY_ADAPTER_TO_PRIVATE_SCAN_ASSET",

      first_invalid_boundary:
        null,
    },
  };
}
