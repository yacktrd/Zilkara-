/* ============================================================================

 * FILE: lib/xyvala/factories/scan-asset-factory.ts

 * ----------------------------------------------------------------------------

 * TITLE

 * - Xyvala canonical private scan asset factory

 *

 * ROLE

 * - validate canonical private scan asset inputs

 * - normalize contract-safe primitive representations

 * - preserve already-produced analytical truths

 * - preserve producer-qualified analytical identities

 * - preserve controlled legacy compatibility during migration

 * - initialize the required PrivateScanAsset contract

 * - construct the canonical PrivateScanAsset transport

 *

 * CLASSIFICATION

 * - PRIVATE FACTORY

 * - READ / VALIDATE / NORMALIZE / PROJECT

 * - NON-COMPUTE

 * - NON-OBSERVE

 * - NON-MUTATING

 * - NON-PUBLIC

 *

 * UPSTREAM

 * - lib/xyvala/stores/market-traceability-adapter.ts

 * - authorized private analytical boundaries

 * - lib/xyvala/engine/analytical-aggregation-market-private-adapter.ts

 *

 * DOWNSTREAM

 * - private traceability orchestration

 * - private snapshot construction

 * - lib/xyvala/services/scan-transformer.ts

 *

 * PRODUCER-QUALIFIED VARIABLE POLICY

 * - RFS canonical projection uses rfs_* identities

 * - Triple Layer canonical projection uses triple_layer_* identities

 * - Impulse variables retain impulse_* identities

 * - Analytical Aggregation is transported through analytical_aggregation

 * - Aggregation-owned contexts remain nested under their producer scope

 * - no new analytical producer may write into an ambiguous legacy identity

 * - legacy compatibility and canonical transport must remain separate

 *

 * DIRECTIVES

 * - private factory only

 * - no API logic

 * - no UI logic

 * - no snapshot writing

 * - no RFS recomputation

 * - no Triple Layer recomputation

 * - no Impulse Layer recomputation

 * - no Analytical Aggregation recomputation

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

 * - no Impulse status inference from Impulse transition state

 * - no Impulse transition-state inference from Impulse scores

 * - no Aggregation context reconstruction

 * - no Aggregation context-status reconstruction

 * - no unavailable-to-neutral conversion

 * - no invalid-to-unavailable conversion

 * - no cross-variable fallback

 * - no producer-variable aliasing

 * - no RFS / Triple Layer growth merging

 * - no canonical projection reconstruction from legacy fields

 * - no legacy projection reconstruction from canonical fields

 * - no silent repair

 * - deterministic normalization only

 * - EUR remains the default monetary reference

 *

 * LEGACY POLICY

 * - root growth_score remains compatibility-only

 * - root state / core_pattern_score / decay_score remain compatibility-only

 * - root structural_context / transition_context / risk_context /

 *   temporal_context remain compatibility-only

 * - growth_layer_score is no longer an authorized analytical alias

 * - canonical Triple Layer truth must arrive through triple_layer

 * - canonical RFS structural growth must arrive through rfs_projection

 * - canonical Analytical Aggregation truth must arrive through

 *   analytical_aggregation

 *

 * IMPULSE POLICY

 * - impulse_compression_score belongs exclusively to the Impulse Layer

 * - all impulse_* scores are transported one-to-one

 * - impulse_status belongs exclusively to the Impulse Layer

 * - "degraded" is not an Impulse producer status

 * - UNAVAILABLE is an explicit analytical state

 * - UNAVAILABLE must never become NEUTRAL

 * - malformed supplied Impulse truth causes boundary rejection

 * - absent complete Impulse truth is represented by the canonical unavailable

 *   Impulse transport required by PrivateScanAsset

 *

 * ANALYTICAL AGGREGATION POLICY

 * - analytical_aggregation is an additive canonical private projection

 * - the factory never produces an Aggregation context

 * - the factory never derives canonical Aggregation from legacy root contexts

 * - the factory never derives legacy root contexts from canonical Aggregation

 * - canonical invalid remains invalid

 * - malformed supplied canonical Aggregation causes boundary rejection

 * - absent canonical Aggregation remains absent

 *

 * INVARIANTS

 * - required PrivateScanAsset fields are initialized

 * - optional migration projections remain absent when genuinely absent

 * - null means explicitly unavailable inside an existing analytical contract

 * - unavailable never becomes neutral

 * - unavailable never becomes computed

 * - invalid never becomes unavailable

 * - one input variable maps to one output variable

 * - one analytical truth keeps one canonical producer identity

 * - RFS growth and Triple Layer Growth never share a canonical field

 * - missing canonical identity causes rejection

 * - missing analytical metadata causes rejection

 * - malformed supplied canonical projection causes rejection

 * - structural_transition is propagated as one canonical contract

 * - Impulse scores are never reconstructed

 * - impulse_status is propagated, never inferred from scores or state

 * - impulse_transition_state is propagated, never inferred

 * - impulse_directional_bias is propagated, never inferred

 * - Analytical Aggregation contexts are propagated, never reconstructed

 * - canonical Analytical Aggregation never populates legacy root contexts

 * - legacy root contexts never populate canonical Analytical Aggregation

 * - warnings are normalized, deduplicated and deterministically ordered

 * - governance describes only boundaries already crossed

 * - same valid input produces the same output

 *

 * FIRST DIVERGENCE

 * - malformed producer-qualified RFS projection

 *   => RFS -> PrivateScanAsset factory boundary

 *

 * - malformed producer-qualified Triple Layer projection

 *   => Triple Layer -> PrivateScanAsset factory boundary

 *

 * - malformed canonical Impulse truth

 *   => Impulse Layer -> PrivateScanAsset factory boundary

 *

 * - malformed canonical Analytical Aggregation projection

 *   => Analytical Aggregation -> PrivateScanAsset factory boundary

 *

 * - forbidden legacy growth-layer alias

 *   => legacy analytical transport -> PrivateScanAsset factory boundary

 * ========================================================================== */

import type {

  Quote,

} from "@/lib/xyvala/snapshot";

import type {

  PrivateAggregatedContext,

  PrivateCalibrationStatus,

  PrivateCanonicalAnalyticalAggregation,

  PrivateCanonicalRfsProjection,

  PrivateCanonicalTripleLayer,

  PrivateDecisionStatus,

  PrivateImpulseDirectionalBias,

  PrivateImpulseStatus,

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

import {
  isNullableRfsRuptureEvolutionState,
  isNullableRfsStructuralTransitionReading,
} from "@/lib/xyvala/rfs/validation/rfs-score-contract-validator";

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

   * LEGACY RFS structural truths

   *

   * These root fields remain compatibility transport only.

   * New RFS producer-qualified identities belong in rfs_projection.

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

   * Canonical producer-qualified RFS projection

   * ----------------------------------------------------------------------- */

  rfs_projection?: unknown;

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

   * LEGACY Triple Layer transport

   *

   * Preserved only until validated consumers migrate.

   *

   * growth_layer_score is retained in the input type solely so an old caller

   * cannot silently bypass validation. A non-null analytical value is rejected.

   * ----------------------------------------------------------------------- */

  triple_layer_state?: unknown;

  growth_layer_score?: unknown;

  core_pattern_score?: unknown;

  decay_score?: unknown;

  growth_status?: unknown;

  core_status?: unknown;

  decay_status?: unknown;

  /* --------------------------------------------------------------------------

   * Canonical producer-qualified Triple Layer projection

   * ----------------------------------------------------------------------- */

  triple_layer?: unknown;

  /* --------------------------------------------------------------------------

   * Canonical Impulse Layer transport

   * ----------------------------------------------------------------------- */

  impulse_compression_score?: unknown;

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

   * Canonical Analytical Aggregation transport

   *

   * Source:

   * analytical-aggregation-market-private-adapter.ts

   *

   * Absence never authorizes reconstruction from legacy root contexts.

   * ----------------------------------------------------------------------- */

  analytical_aggregation?: unknown;

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

   * MCI / legacy decision transport

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

   * LEGACY Analytical Aggregation transport

   *

   * Compatibility only.

   *

   * These fields must never reconstruct analytical_aggregation.

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

 * ----------------------------------------------------------------------------

 * 4.0.0

 * - migrates canonical Analytical Aggregation transport to producer v3

 * - preserves v2 removal of market_score from canonical Aggregation structural_context

 * - validates canonical RFS Structural Transition through the shared RFS validator

 * - preserves rupture persistence / deceleration in canonical risk_context

 * - preserves legacy compatibility fields unchanged

 * - enforces canonical Crash availability semantics at the transport boundary

 * ========================================================================== */

export const SCAN_ASSET_FACTORY_VERSION =

  "4.0.0" as const;

/* ============================================================================

 * 3. OBJECT AND STRING HELPERS

 * ========================================================================== */

function isPlainObject(

  value: unknown,

): value is Record<string, unknown> {

  return (

    typeof value === "object" &&

    value !== null &&

    !Array.isArray(

      value,

    )

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

  return hasOwn(

    source,

    key,

  )

    ? source[key]

    : null;

}

function hasExactKeys(

  source: Record<string, unknown>,

  expectedKeys: readonly string[],

): boolean {

  const actualKeys =

    Object.keys(

      source,

    ).sort();

  const expected =

    [

      ...expectedKeys,

    ].sort();

  if (

    actualKeys.length !==

      expected.length

  ) {

    return false;

  }

  for (

    let index = 0;

    index <

      expected.length;

    index += 1

  ) {

    if (

      actualKeys[index] !==

      expected[index]

    ) {

      return false;

    }

  }

  return true;

}

function containsUndefinedDeep(

  value: unknown,

): boolean {

  if (

    value === undefined

  ) {

    return true;

  }

  if (

    Array.isArray(

      value,

    )

  ) {

    return value.some(

      containsUndefinedDeep,

    );

  }

  if (

    !isPlainObject(

      value,

    )

  ) {

    return false;

  }

  return Object

    .values(

      value,

    )

    .some(

      containsUndefinedDeep,

    );

}

function normalizeRequiredString(

  value: unknown,

): string | null {

  if (

    typeof value !== "string"

  ) {

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

    normalizeRequiredString(

      value,

    );

  if (

    normalized === null

  ) {

    throw new Error(

      errorCode,

    );

  }

  return normalized;

}

function normalizeNullableString(

  value: unknown,

): string | null {

  return normalizeRequiredString(

    value,

  );

}

/* ============================================================================

 * 4. NUMBER HELPERS

 * ========================================================================== */

function normalizeNullableNumber(

  value: unknown,

): number | null {

  return (

    typeof value === "number" &&

    Number.isFinite(

      value,

    )

  )

    ? value

    : null;

}

function normalizeScore(

  value: unknown,

): number | null {

  const normalized =

    normalizeNullableNumber(

      value,

    );

  if (

    normalized === null ||

    normalized < 0 ||

    normalized > 100

  ) {

    return null;

  }

  return normalized;

}

function isValidNullableScore(

  value: unknown,

): value is number | null {

  return (

    value === null ||

    (

      typeof value === "number" &&

      Number.isFinite(

        value,

      ) &&

      value >= 0 &&

      value <= 100

    )

  );

}

function isValidNullableFiniteNumber(

  value: unknown,

): value is number | null {

  return (

    value === null ||

    (

      typeof value === "number" &&

      Number.isFinite(

        value,

      )

    )

  );

}

function normalizeCanonicalAnalyticalScore(

  value: unknown,

  variableName: string,

): number | null {

  if (

    value === undefined ||

    value === null

  ) {

    return null;

  }

  if (

    typeof value !== "number" ||

    !Number.isFinite(

      value,

    ) ||

    value < 0 ||

    value > 100

  ) {

    throw new Error(

      `scan_asset_factory_${variableName}_invalid`,

    );

  }

  return value;

}

function normalizePositiveInteger(

  value: unknown,

): number | null {

  if (

    typeof value !== "number" ||

    !Number.isFinite(

      value,

    ) ||

    !Number.isInteger(

      value,

    ) ||

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

    !Array.isArray(

      value,

    ) ||

    value.length < 2

  ) {

    return null;

  }

  if (

    !value.every(

      (point) =>

        typeof point === "number" &&

        Number.isFinite(

          point,

        ),

    )

  ) {

    return null;

  }

  return [

    ...value,

  ];

}

function normalizeLogoUrl(

  value: unknown,

): string | null {

  const normalized =

    normalizeRequiredString(

      value,

    );

  if (

    normalized === null

  ) {

    return null;

  }

  if (

    normalized.startsWith(

      "https://",

    ) ||

    normalized.startsWith(

      "/",

    )

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

  if (

    left < right

  ) {

    return -1;

  }

  if (

    left > right

  ) {

    return 1;

  }

  return 0;

}

function normalizeWarnings(

  value: unknown,

): string[] {

  if (

    !Array.isArray(

      value,

    )

  ) {

    return [];

  }

  const warnings =

    value

      .filter(

        (

          warning,

        ): warning is string =>

          typeof warning ===

            "string",

      )

      .map(

        (warning) =>

          warning.trim(),

      )

      .filter(

        (warning) =>

          warning.length > 0,

      );

  return [

    ...new Set(

      warnings,

    ),

  ].sort(

    compareDeterministicStrings,

  );

}

/* ============================================================================

 * 7. CANONICAL METADATA

 * ========================================================================== */

function normalizeQuote(

  value: unknown,

): Quote {

  if (

    value === "usd"

  ) {

    return "usd";

  }

  if (

    value === "usdt"

  ) {

    return "usdt";

  }

  return "eur";

}

function normalizeIsoTimestamp(

  value: unknown,

): string | null {

  const normalized =

    normalizeRequiredString(

      value,

    );

  if (

    normalized === null

  ) {

    return null;

  }

  const timestamp =

    Date.parse(

      normalized,

    );

  if (

    !Number.isFinite(

      timestamp,

    )

  ) {

    return null;

  }

  return new Date(

    timestamp,

  ).toISOString();

}

function requireIsoTimestamp(

  value: unknown,

): string {

  const normalized =

    normalizeIsoTimestamp(

      value,

    );

  if (

    normalized === null

  ) {

    throw new Error(

      "scan_asset_factory_generated_at_invalid",

    );

  }

  return normalized;

}

function normalizeSource(

  value: unknown,

): PrivateSource | null {

  switch (

    value

  ) {

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

    normalizeSource(

      value,

    );

  if (

    normalized === null

  ) {

    throw new Error(

      "scan_asset_factory_source_invalid",

    );

  }

  return normalized;

}

/* ============================================================================

 * 8. STATUS NORMALIZERS

 * ========================================================================== */

function normalizeExplicitScanStatus(

  value: unknown,

): PrivateScanStatus {

  switch (

    value

  ) {

    case "computed":

    case "partial":

    case "degraded":

    case "unavailable":

      return value;

    default:

      return "unavailable";

  }

}

function isExplicitScanStatus(

  value: unknown,

): value is PrivateScanStatus {

  return (

    value === "computed" ||

    value === "partial" ||

    value === "degraded" ||

    value === "unavailable"

  );

}

function normalizeDecisionStatus(

  value: unknown,

): PrivateDecisionStatus {

  switch (

    value

  ) {

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

 * 9. RFS, TRIPLE LAYER, IMPULSE AND MCI ENUM NORMALIZERS

 * ========================================================================== */

function normalizeRegime(

  value: unknown,

): PrivateScanRegime {

  switch (

    value

  ) {

    case "STABLE":

    case "TRANSITION":

    case "VOLATILE":

      return value;

    default:

      return "TRANSITION";

  }

}

function normalizeDecision(

  value: unknown,

): PrivateScanDecision {

  switch (

    value

  ) {

    case "ALLOW":

    case "WATCH":

    case "BLOCK":

      return value;

    default:

      return "WATCH";

  }

}

function normalizeRuptureEvolutionState(

  value: unknown,

): PrivateRuptureEvolutionState {

  switch (

    value

  ) {

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

  switch (

    value

  ) {

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

function isExplicitPrivateTripleLayerState(

  value: unknown,

): value is PrivateTripleLayerState {

  return (

    value === "growth_dominant" ||

    value === "core_dominant" ||

    value === "decay_dominant" ||

    value === "mixed" ||

    value === "unknown"

  );

}

/* ============================================================================

 * 9-A. CANONICAL IMPULSE ENUM VALIDATION

 * ----------------------------------------------------------------------------

 * ROLE

 * - validate canonical Impulse categorical truth at the PrivateScanAsset

 *   factory boundary

 * - preserve exact producer semantics

 * - preserve explicit analytical unavailability

 *

 * SOURCE OF TRUTH

 * - canonical Impulse producer

 * - canonical Impulse private transport

 *

 * IMPORTANT

 * - NEUTRAL is computed analytical truth

 * - UNAVAILABLE is explicit absence of analytical truth

 * - these meanings must never be conflated

 *

 * DIRECTIVES

 * - validation / transport only

 * - no analytical inference

 * - no state reconstruction

 * - no status reconstruction

 * - no score-derived state

 * - no unavailable-to-neutral conversion

 * - no fallback

 * - no coercion

 *

 * AVAILABILITY

 * - undefined / null categorical transport means explicit UNAVAILABLE only

 *   where the canonical PrivateScanAsset contract requires a categorical value

 * - malformed supplied categorical truth causes boundary rejection

 *

 * TYPESCRIPT POLICY

 * - return explicit canonical literals

 * - do not rely on narrowing `unknown` through a generic `return value`

 * - this avoids weakening producer-qualified enum guarantees

 * ========================================================================== */

function normalizeImpulseDirectionalBias(

  value: unknown,

): PrivateImpulseDirectionalBias {

  if (

    value === undefined ||

    value === null

  ) {

    return "UNAVAILABLE";

  }

  switch (

    value

  ) {

    case "UP":

      return "UP";

    case "DOWN":

      return "DOWN";

    case "MIXED":

      return "MIXED";

    case "NEUTRAL":

      return "NEUTRAL";

    case "UNAVAILABLE":

      return "UNAVAILABLE";

    default:

      throw new Error(

        "scan_asset_factory_impulse_directional_bias_invalid",

      );

  }

}

function normalizeImpulseTransitionState(

  value: unknown,

): PrivateImpulseTransitionState {

  if (

    value === undefined ||

    value === null

  ) {

    return "UNAVAILABLE";

  }

  switch (

    value

  ) {

    case "COMPRESSION":

      return "COMPRESSION";

    case "PRESSURE_BUILDING":

      return "PRESSURE_BUILDING";

    case "RELEASE":

      return "RELEASE";

    case "EXHAUSTION":

      return "EXHAUSTION";

    case "NEUTRAL":

      return "NEUTRAL";

    case "UNAVAILABLE":

      return "UNAVAILABLE";

    default:

      throw new Error(

        "scan_asset_factory_impulse_transition_state_invalid",

      );

  }

}

function normalizePrivateImpulseStatus(

  value: unknown,

): PrivateImpulseStatus {

  if (

    value === undefined ||

    value === null

  ) {

    return "unavailable";

  }

  switch (

    value

  ) {

    case "computed":

      return "computed";

    case "partial":

      return "partial";

    case "unavailable":

      return "unavailable";

    default:

      throw new Error(

        "scan_asset_factory_impulse_status_invalid",

      );

  }

}

/* ============================================================================

 * 9-B. OTHER PRIVATE ENUM NORMALIZERS

 * ========================================================================== */

function normalizeNeutralizationReason(

  value: unknown,

): PrivateNeutralizationReason {

  switch (

    value

  ) {

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

    case "invalid_pattern_transition":

    case "invalid_structural_transition":

    case "invalid_impulse_propagation":

      return value;

    default:

      return "none";

  }

}

function normalizeNeutralizationSeverity(

  value: unknown,

): PrivateNeutralizationSeverity {

  switch (

    value

  ) {

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

  switch (

    value

  ) {

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

  switch (

    value

  ) {

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

  switch (

    value

  ) {

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

  switch (

    value

  ) {

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

  switch (

    value

  ) {

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

  switch (

    value

  ) {

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

  switch (

    value

  ) {

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

    !Number.isFinite(

      value,

    ) ||

    !Number.isInteger(

      value,

    ) ||

    value < 0

  ) {

    return null;

  }

  return value;

}

function normalizeStructuralTransition(

  value: unknown,

): PrivateStructuralTransitionContract {

  if (

    !isPlainObject(

      value,

    )

  ) {

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

  if (

    !isPlainObject(

      value,

    )

  ) {

    return {

      price_score:

        null,

      change_pct:

        null,

      slope_pct:

        null,

      stability_score:

        null,

      rupture_score:

        null,

      rupture_probability:

        null,

      status:

        "unavailable" as const,

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

 * 12. LEGACY AGGREGATED CONTEXT

 * ----------------------------------------------------------------------------

 * Compatibility only.

 *

 * Canonical Analytical Aggregation must never be reconstructed from this

 * representation.

 * ========================================================================== */

function normalizeAggregatedContext(

  value: unknown,

): PrivateAggregatedContext | null {

  if (

    !isPlainObject(

      value,

    )

  ) {

    return null;

  }

  const state =

    normalizeRequiredString(

      readExact(

        value,

        "state",

      ),

    );

  if (

    state === null

  ) {

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

 * 13. CANONICAL ANALYTICAL AGGREGATION TRANSPORT

 * ----------------------------------------------------------------------------

 * ROLE

 * - validate already-adapted private Analytical Aggregation truth

 * - preserve the exact canonical nested projection

 * - preserve producer and analytical identities

 * - reject malformed supplied canonical transport

 * - allow PrivateScanAsset to transport canonical Aggregation truth without

 *   becoming a second Analytical Aggregation producer

 *

 * SOURCE

 * - lib/xyvala/engine/analytical-aggregation-market-private-adapter.ts

 *

 * SOURCE PRODUCER

 * - lib/xyvala/engine/analytical-aggregation-market-core.ts

 *

 * TARGET

 * - PrivateScanAsset.analytical_aggregation

 *

 * CANONICAL CONTRACT

 * - producer:

 *   analytical-aggregation-market-core

 *

 * - producer version:

 *   3.0.0

 *

 * - analytical version:

 *   analytical-aggregation-market-v2

 *

 * CONTRACT EVOLUTION

  * - v2 removed market_score from canonical structural_context

 * - no existing RFS variable is aliased or renamed to replace market_score

 * - legacy root market_score remains compatibility-only and independent

 * - v3 transports the complete canonical RfsStructuralTransitionReading

 * - v3 preserves rupture_persistence_score and rupture_deceleration_score

 * - v3 changes producer/private transport only

 * - analytical model remains analytical-aggregation-market-v2

 * ANALYTICAL OWNERSHIP

 * - Analytical Aggregation owns:

 *   - structural_context

 *   - transition_context

 *   - risk_context

 *   - temporal_context

 *   - aggregation status

 *

 * FACTORY OWNERSHIP

 * - transport integrity validation only

 *

 * NON-OWNERSHIP

 * - context production

 * - context completeness computation

 * - aggregation status computation

 * - RFS truth

 * - Triple Layer truth

 * - Impulse truth

 * - Crash truth

 * - MCI truth

 *

 * IMPORTANT

 * - the canonical producer already computes context completeness

 * - the producer result validator already validates analytical completeness

 * - the private adapter already validates the canonical producer result

 * - this factory therefore must not become a second Aggregation engine

 *

 * DIRECTIVES

 * - validation only

 * - no context reconstruction

 * - no context-status reconstruction from analytical values

 * - no aggregation-status reconstruction from analytical values

 * - no RFS recomputation

 * - no Triple Layer recomputation

 * - no Impulse recomputation

 * - no Crash recomputation

 * - no MCI computation

 * - no legacy fallback

 * - no legacy projection write

 * - no score repair

 * - no score clamp

 * - no numerical coercion

 * - no unavailable-to-neutral conversion

 * - no unavailable-to-zero conversion

 * - no invalid-to-unavailable conversion

 * - no canonical-to-legacy conversion

 * - no legacy-to-canonical conversion

 * - no cross-producer analytical alias

 *

 * MIGRATION

 * - canonical truth arrives exclusively through analytical_aggregation

 * - legacy root structural_context / transition_context / risk_context /

 *   temporal_context remain independent compatibility transport

 * - legacy root market_score remains independent compatibility transport

 * - absence of analytical_aggregation never authorizes reconstruction

 *

 * CRASH AVAILABILITY

 * - crash_state === UNKNOWN

 *   => crash_score must be null

 *

 * - crash_state === NONE | RISING | CRASH

 *   => crash_score must be a valid canonical score

 *

 * - null + UNKNOWN means explicit Crash truth unavailability

 * - null + NONE is forbidden

 * - RFS rupture truth never substitutes Crash truth

 *

 * INVALID SEMANTICS

 *

 * malformed canonical projection

 *   => boundary rejection

 *

 * valid canonical projection carrying:

 * analytical_aggregation_status === "invalid"

 *   => preserve and transport "invalid"

 *

 * TYPESCRIPT POLICY

 * - context validators are true type predicates

 * - validated context references are captured locally

 * - no `as PrivateCanonicalAnalyticalAggregation` assertion bypasses validation

 *

 * INVARIANTS

 * - exact producer identity is preserved

 * - exact producer version is preserved

 * - exact analytical version is preserved

 * - exact context vocabulary is preserved

 * - no extra field is accepted

 * - no undefined value is accepted inside canonical transport

 * - zero remains valid

 * - null remains explicit analytical unavailability

 * - negative temporal change remains valid

 * - UNKNOWN remains UNKNOWN

 * - UNAVAILABLE remains UNAVAILABLE

 * - invalid remains invalid

 * ========================================================================== */

/* --------------------------------------------------------------------------

 * 13.1 PRIVATE CONTEXT TYPE ALIASES

 * ----------------------------------------------------------------------------

 * These aliases reference the authoritative private contract.

 *

 * They do not introduce a second analytical contract.

 * -------------------------------------------------------------------------- */

type CanonicalAggregationStructuralContext =

  PrivateCanonicalAnalyticalAggregation[

    "structural_context"

  ];

type CanonicalAggregationTransitionContext =

  PrivateCanonicalAnalyticalAggregation[

    "transition_context"

  ];

type CanonicalAggregationRiskContext =

  PrivateCanonicalAnalyticalAggregation[

    "risk_context"

  ];

type CanonicalAggregationTemporalContext =

  PrivateCanonicalAnalyticalAggregation[

    "temporal_context"

  ];

/* --------------------------------------------------------------------------

 * 13.2 EXACT CANONICAL KEY SETS

 * ----------------------------------------------------------------------------

 * Strict vocabulary mirrors Analytical Aggregation v3 transport.

 *

 * IMPORTANT

 * - analytical model remains analytical-aggregation-market-v2\n* - market_score is intentionally absent from canonical structural_context

 * - legacy root market_score is outside this projection

 * -------------------------------------------------------------------------- */

const CANONICAL_AGGREGATION_KEYS =

  Object.freeze([

    "analytical_aggregation_producer",

    "analytical_aggregation_producer_version",

    "analytical_aggregation_analytical_version",

    "analytical_aggregation_status",

    "structural_context",

    "transition_context",

    "risk_context",

    "temporal_context",

    "analytical_aggregation_warnings",

  ] as const);

const CANONICAL_AGGREGATION_STRUCTURAL_KEYS =

  Object.freeze([

    "status",

    "stability_score",

    "structure_score",

    "coherence_score",

    "occurrence_score",

    "frequency_score",

    "convergence_score",

    "duration_score",

    "evolution_score",

    "rfs_growth_score",

    "regime",

    "rupture_score",

    "rupture_probability",

    "continuity_probability",

    "structural_transition",

  ] as const);

const CANONICAL_AGGREGATION_TRANSITION_KEYS =

  Object.freeze([

    "status",

    "structural_transition",

    "triple_layer_state",

    "triple_layer_growth_score",

    "triple_layer_core_pattern_score",

    "triple_layer_decay_score",

    "impulse_compression_score",

    "impulse_pressure_score",

    "impulse_acceleration_score",

    "impulse_alignment_score",

    "impulse_instability_score",

    "impulse_saturation_score",

    "impulse_exhaustion_score",

    "impulse_directional_bias",

    "impulse_transition_state",

    "impulse_status",

  ] as const);

const CANONICAL_AGGREGATION_RISK_KEYS =

  Object.freeze([

    "status",

    "rupture_score",

    "rupture_probability",

    "rupture_penalty_score",

    "rupture_occurrence_score",

    "rupture_frequency_score",

    "rupture_convergence_score",

    "rupture_duration_score",

    "rupture_evolution_score",

    "rupture_evolution_state",

    "rupture_acceleration_score",

    "rupture_persistence_score",

    "rupture_deceleration_score",

    "continuity_probability",

    "crash_score",

    "crash_state",

    "impulse_instability_score",

    "impulse_saturation_score",

    "impulse_exhaustion_score",

  ] as const);

const CANONICAL_AGGREGATION_TEMPORAL_KEYS =

  Object.freeze([

    "status",

    "global",

    "horizon_7d",

    "horizon_24h",

  ] as const);

const CANONICAL_AGGREGATION_TEMPORAL_GLOBAL_KEYS =

  Object.freeze([

    "regime",

    "structural_transition",

    "continuity_probability",

  ] as const);

const CANONICAL_AGGREGATION_TEMPORAL_7D_KEYS =

  Object.freeze([

    "chg_7d_pct",

  ] as const);

const CANONICAL_AGGREGATION_TEMPORAL_24H_KEYS =

  Object.freeze([

    "chg_24h_pct",

  ] as const);

/* --------------------------------------------------------------------------

 * 13.3 CANONICAL VOCABULARY VALIDATORS

 * -------------------------------------------------------------------------- */

function isCanonicalAggregationContextStatus(

  value: unknown,

): boolean {

  return (

    value === "computed" ||

    value === "partial" ||

    value === "unavailable" ||

    value === "invalid"

  );

}

function isCanonicalAggregationStatus(

  value: unknown,

): boolean {

  return (

    value === "computed" ||

    value === "partial" ||

    value === "unavailable" ||

    value === "invalid"

  );

}

function isCanonicalAggregationRegime(

  value: unknown,

): boolean {

  return (

    value === null ||

    value === "STABLE" ||

    value === "TRANSITION" ||

    value === "VOLATILE"

  );

}

function isCanonicalAggregationTripleLayerState(

  value: unknown,

): boolean {

  return (

    value === "GROWTH_DOMINANT" ||

    value === "CORE_DOMINANT" ||

    value === "DECAY_DOMINANT" ||

    value === "MIXED" ||

    value === "UNKNOWN"

  );

}

function isCanonicalAggregationImpulseDirectionalBias(

  value: unknown,

): boolean {

  return (

    value === "UP" ||

    value === "DOWN" ||

    value === "MIXED" ||

    value === "NEUTRAL" ||

    value === "UNAVAILABLE"

  );

}

function isCanonicalAggregationImpulseTransitionState(

  value: unknown,

): boolean {

  return (

    value === "COMPRESSION" ||

    value === "PRESSURE_BUILDING" ||

    value === "RELEASE" ||

    value === "EXHAUSTION" ||

    value === "NEUTRAL" ||

    value === "UNAVAILABLE"

  );

}

function isCanonicalAggregationImpulseStatus(

  value: unknown,

): boolean {

  return (

    value === "computed" ||

    value === "partial" ||

    value === "unavailable"

  );

}

function isCanonicalAggregationCrashState(

  value: unknown,

): boolean {

  return (

    value === "NONE" ||

    value === "RISING" ||

    value === "CRASH" ||

    value === "UNKNOWN"

  );

}

/* --------------------------------------------------------------------------

 * 13.4 STRUCTURAL CONTEXT VALIDATOR

 * ----------------------------------------------------------------------------

 * Transport integrity only.

 *

 * No context completeness status is recomputed here.

 * -------------------------------------------------------------------------- */

function isCanonicalAggregationStructuralContext(

  value: unknown,

): value is CanonicalAggregationStructuralContext {

  if (

    !isPlainObject(

      value,

    ) ||

    !hasExactKeys(

      value,

      CANONICAL_AGGREGATION_STRUCTURAL_KEYS,

    ) ||

    !isCanonicalAggregationContextStatus(

      value.status,

    ) ||

    !isCanonicalAggregationRegime(

      value.regime,

    ) ||

    !isNullableRfsStructuralTransitionReading(

      value.structural_transition,

    )

  ) {

    return false;

  }

  const scores = [

    value.stability_score,

    value.structure_score,

    value.coherence_score,

    value.occurrence_score,

    value.frequency_score,

    value.convergence_score,

    value.duration_score,

    value.evolution_score,

    value.rfs_growth_score,

    value.rupture_score,

    value.rupture_probability,

    value.continuity_probability,

  ];

  if (

    !scores.every(

      isValidNullableScore,

    )

  ) {

    return false;

  }

  /*

   * Deterministic invalid sentinel.

   *

   * This validates the canonical producer representation.

   * It does not infer a non-invalid status.

   */

  if (

    value.status === "invalid"

  ) {

    return (

      scores.every(

        (score) =>

          score === null,

      ) &&

      value.regime === null &&

      value.structural_transition === null

    );

  }

  return true;

}

/* --------------------------------------------------------------------------

 * 13.5 TRANSITION CONTEXT VALIDATOR

 * -------------------------------------------------------------------------- */

function isCanonicalAggregationTransitionContext(

  value: unknown,

): value is CanonicalAggregationTransitionContext {

  if (

    !isPlainObject(

      value,

    ) ||

    !hasExactKeys(

      value,

      CANONICAL_AGGREGATION_TRANSITION_KEYS,

    ) ||

    !isCanonicalAggregationContextStatus(

      value.status,

    ) ||

    !isNullableRfsStructuralTransitionReading(

      value.structural_transition,

    ) ||

    !isCanonicalAggregationTripleLayerState(

      value.triple_layer_state,

    ) ||

    !isCanonicalAggregationImpulseDirectionalBias(

      value.impulse_directional_bias,

    ) ||

    !isCanonicalAggregationImpulseTransitionState(

      value.impulse_transition_state,

    ) ||

    !isCanonicalAggregationImpulseStatus(

      value.impulse_status,

    )

  ) {

    return false;

  }

  const tripleLayerScores = [

    value.triple_layer_growth_score,

    value.triple_layer_core_pattern_score,

    value.triple_layer_decay_score,

  ];

  const impulseScores = [

    value.impulse_compression_score,

    value.impulse_pressure_score,

    value.impulse_acceleration_score,

    value.impulse_alignment_score,

    value.impulse_instability_score,

    value.impulse_saturation_score,

    value.impulse_exhaustion_score,

  ];

  if (

    !tripleLayerScores.every(

      isValidNullableScore,

    ) ||

    !impulseScores.every(

      isValidNullableScore,

    )

  ) {

    return false;

  }

  /*

   * Deterministic invalid sentinel.

   */

  if (

    value.status === "invalid"

  ) {

    return (

      value.structural_transition === null &&

      value.triple_layer_state === "UNKNOWN" &&

      tripleLayerScores.every(

        (score) =>

          score === null,

      ) &&

      impulseScores.every(

        (score) =>

          score === null,

      ) &&

      value.impulse_directional_bias ===

        "UNAVAILABLE" &&

      value.impulse_transition_state ===

        "UNAVAILABLE" &&

      value.impulse_status ===

        "unavailable"

    );

  }

  /*

   * Canonical Impulse availability transport semantics.

   *

   * This does not infer transition_context.status.

   */

  if (

    value.impulse_status ===

      "unavailable"

  ) {

    return (

      impulseScores.every(

        (score) =>

          score === null,

      ) &&

      value.impulse_directional_bias ===

        "UNAVAILABLE" &&

      value.impulse_transition_state ===

        "UNAVAILABLE"

    );

  }

  return (

    impulseScores.every(

      (score) =>

        score !== null,

    ) &&

    value.impulse_directional_bias !==

      "UNAVAILABLE" &&

    value.impulse_transition_state !==

      "UNAVAILABLE"

  );

}

/* --------------------------------------------------------------------------

 * 13.6 RISK CONTEXT VALIDATOR

 * ----------------------------------------------------------------------------

 * Transport integrity only.

 *

 * Crash availability semantics mirror canonical Aggregation v3 transport:

 *

 * UNKNOWN

 * -> crash_score === null

 *

 * NONE / RISING / CRASH

 * -> crash_score is present

 *

 * No Crash state or score is derived here.

 * -------------------------------------------------------------------------- */

function isCanonicalAggregationRiskContext(

  value: unknown,

): value is CanonicalAggregationRiskContext {

  if (

    !isPlainObject(

      value,

    ) ||

    !hasExactKeys(

      value,

      CANONICAL_AGGREGATION_RISK_KEYS,

    ) ||

    !isCanonicalAggregationContextStatus(

      value.status,

    ) ||

    !isNullableRfsRuptureEvolutionState(

      value.rupture_evolution_state,

    ) ||

    !isCanonicalAggregationCrashState(

      value.crash_state,

    )

  ) {

    return false;

  }

  const scores = [

    value.rupture_score,

    value.rupture_probability,

    value.rupture_penalty_score,

    value.rupture_occurrence_score,

    value.rupture_frequency_score,

    value.rupture_convergence_score,

    value.rupture_duration_score,

    value.rupture_evolution_score,

    value.rupture_acceleration_score,

    value.rupture_persistence_score,

    value.rupture_deceleration_score,

    value.continuity_probability,

    value.crash_score,

    value.impulse_instability_score,

    value.impulse_saturation_score,

    value.impulse_exhaustion_score,

  ];

  if (

    !scores.every(

      isValidNullableScore,

    )

  ) {

    return false;

  }

  /*

   * Deterministic invalid sentinel.

   */

  if (

    value.status === "invalid"

  ) {

    return (

      scores.every(

        (score) =>

          score === null,

      ) &&

      value.rupture_evolution_state ===

        null &&

      value.crash_state ===

        "UNKNOWN"

    );

  }

  /*

   * Canonical Crash availability consistency.

   *

   * UNKNOWN means unavailable producer truth.

   */

  if (

    value.crash_state ===

      "UNKNOWN"

  ) {

    return (

      value.crash_score ===

        null

    );

  }

  /*

   * NONE / RISING / CRASH are actual producer conclusions.

   *

   * A score must therefore exist.

   */

  return (

    value.crash_score !==

      null

  );

}

/* --------------------------------------------------------------------------

 * 13.7 TEMPORAL CONTEXT VALIDATOR

 * -------------------------------------------------------------------------- */

function isCanonicalAggregationTemporalContext(

  value: unknown,

): value is CanonicalAggregationTemporalContext {

  if (

    !isPlainObject(

      value,

    ) ||

    !hasExactKeys(

      value,

      CANONICAL_AGGREGATION_TEMPORAL_KEYS,

    ) ||

    !isCanonicalAggregationContextStatus(

      value.status,

    )

  ) {

    return false;

  }

  const globalContext =

    value.global;

  const horizon7d =

    value.horizon_7d;

  const horizon24h =

    value.horizon_24h;

  if (

    !isPlainObject(

      globalContext,

    ) ||

    !isPlainObject(

      horizon7d,

    ) ||

    !isPlainObject(

      horizon24h,

    )

  ) {

    return false;

  }

  if (

    !hasExactKeys(

      globalContext,

      CANONICAL_AGGREGATION_TEMPORAL_GLOBAL_KEYS,

    ) ||

    !hasExactKeys(

      horizon7d,

      CANONICAL_AGGREGATION_TEMPORAL_7D_KEYS,

    ) ||

    !hasExactKeys(

      horizon24h,

      CANONICAL_AGGREGATION_TEMPORAL_24H_KEYS,

    )

  ) {

    return false;

  }

  if (

    !isCanonicalAggregationRegime(

      globalContext.regime,

    ) ||

    !isNullableRfsStructuralTransitionReading(

      globalContext.structural_transition,

    ) ||

    !isValidNullableScore(

      globalContext.continuity_probability,

    ) ||

    !isValidNullableFiniteNumber(

      horizon7d.chg_7d_pct,

    ) ||

    !isValidNullableFiniteNumber(

      horizon24h.chg_24h_pct,

    )

  ) {

    return false;

  }

  /*

   * Deterministic invalid sentinel.

   */

  if (

    value.status === "invalid"

  ) {

    return (

      globalContext.regime === null &&

      globalContext.structural_transition ===

        null &&

      globalContext.continuity_probability ===

        null &&

      horizon7d.chg_7d_pct === null &&

      horizon24h.chg_24h_pct === null

    );

  }

  return true;

}

/* --------------------------------------------------------------------------

 * 13.8 WARNING TRANSPORT VALIDATOR

 * ----------------------------------------------------------------------------

 * The private adapter preserves canonical producer warnings unchanged.

 *

 * Canonical warnings are:

 * - non-empty

 * - trimmed

 * - unique

 * - deterministically ordered

 * -------------------------------------------------------------------------- */

function isCanonicalAggregationWarnings(

  value: unknown,

): boolean {

  if (

    !Array.isArray(

      value,

    )

  ) {

    return false;

  }

  const warnings:

    string[] =

      [];

  for (

    const warning

    of value

  ) {

    if (

      typeof warning !==

        "string" ||

      warning.length ===

        0 ||

      warning.trim() !==

        warning

    ) {

      return false;

    }

    warnings.push(

      warning,

    );

  }

  if (

    new Set(

      warnings,

    ).size !==

      warnings.length

  ) {

    return false;

  }

  const sorted =

    [

      ...warnings,

    ].sort(

      compareDeterministicStrings,

    );

  return warnings.every(

    (

      warning,

      index,

    ) =>

      warning ===

        sorted[index],

  );

}

/* --------------------------------------------------------------------------

 * 13.9 CANONICAL PRIVATE AGGREGATION VALIDATOR

 * ----------------------------------------------------------------------------

 * IMPORTANT

 *

 * Context validators are applied to captured local references.

 *

 * TypeScript therefore preserves the validated canonical context identities

 * without:

 * - casts

 * - assertions

 * - any

 * - bypassing the trust boundary

 *

 * GLOBAL STATUS

 * - relationship between already-produced context statuses is validated

 * - individual context statuses are never derived from analytical values here

 * -------------------------------------------------------------------------- */

function isCanonicalAnalyticalAggregation(

  value: unknown,

): value is PrivateCanonicalAnalyticalAggregation {

  if (

    !isPlainObject(

      value,

    )

  ) {

    return false;

  }

  if (

    !hasExactKeys(

      value,

      CANONICAL_AGGREGATION_KEYS,

    )

  ) {

    return false;

  }

  if (

    containsUndefinedDeep(

      value,

    )

  ) {

    return false;

  }

  if (

    value.analytical_aggregation_producer !==

      "analytical-aggregation-market-core" ||

    value.analytical_aggregation_producer_version !==

      "3.0.0" ||

    value.analytical_aggregation_analytical_version !==

      "analytical-aggregation-market-v2" ||

    !isCanonicalAggregationStatus(

      value.analytical_aggregation_status,

    ) ||

    !isCanonicalAggregationWarnings(

      value.analytical_aggregation_warnings,

    )

  ) {

    return false;

  }

  /*

   * Capture unknown properties before type-predicate validation.

   */

  const structuralContext =

    value.structural_context;

  const transitionContext =

    value.transition_context;

  const riskContext =

    value.risk_context;

  const temporalContext =

    value.temporal_context;

  if (

    !isCanonicalAggregationStructuralContext(

      structuralContext,

    )

  ) {

    return false;

  }

  if (

    !isCanonicalAggregationTransitionContext(

      transitionContext,

    )

  ) {

    return false;

  }

  if (

    !isCanonicalAggregationRiskContext(

      riskContext,

    )

  ) {

    return false;

  }

  if (

    !isCanonicalAggregationTemporalContext(

      temporalContext,

    )

  ) {

    return false;

  }

  const contextStatuses = [

    structuralContext.status,

    transitionContext.status,

    riskContext.status,

    temporalContext.status,

  ] as const;

  /*

   * Canonical invalid producer result.

   *

   * invalid is preserved and never degraded into unavailable.

   */

  if (

    value.analytical_aggregation_status ===

      "invalid"

  ) {

    return contextStatuses.every(

      (status) =>

        status ===

          "invalid",

    );

  }

  /*

   * Canonical producer does not emit mixed invalid/non-invalid results.

   */

  if (

    contextStatuses.some(

      (status) =>

        status ===

          "invalid",

    )

  ) {

    return false;

  }

  /*

   * Validate global completeness metadata only.

   *

   * No analytical context truth is recomputed.

   */

  if (

    contextStatuses.every(

      (status) =>

        status ===

          "computed",

    )

  ) {

    return (

      value.analytical_aggregation_status ===

        "computed"

    );

  }

  if (

    contextStatuses.every(

      (status) =>

        status ===

          "unavailable",

    )

  ) {

    return (

      value.analytical_aggregation_status ===

        "unavailable"

    );

  }

  return (

    value.analytical_aggregation_status ===

      "partial"

  );

}

/* --------------------------------------------------------------------------

 * 13.10 CANONICAL TRANSPORT NORMALIZER

 * ----------------------------------------------------------------------------

 * "Normalizer" means trust-boundary validation only.

 *

 * The already-produced canonical projection is returned unchanged.

 * -------------------------------------------------------------------------- */

function normalizeCanonicalAnalyticalAggregation(

  value: unknown,

): PrivateCanonicalAnalyticalAggregation | undefined {

  if (

    value === undefined ||

    value === null

  ) {

    return undefined;

  }

  if (

    !isCanonicalAnalyticalAggregation(

      value,

    )

  ) {

    throw new Error(

      "scan_asset_factory_analytical_aggregation_invalid",

    );

  }

  /*

   * Preserve exactly the canonical private producer projection.

   *

   * No clone.

   * No rebuilding.

   * No normalization of analytical truth.

   * No status inference.

   * No legacy projection.

   */

  return value;

}

/* ============================================================================

 * 14. CANONICAL RFS PROJECTION

 * ========================================================================== */

function normalizeCanonicalRfsProjection(

  value: unknown,

): PrivateCanonicalRfsProjection | undefined {

  if (

    value === undefined ||

    value === null

  ) {

    return undefined;

  }

  if (

    !isPlainObject(

      value,

    )

  ) {

    throw new Error(

      "scan_asset_factory_rfs_projection_invalid",

    );

  }

  const rfsGrowthScore =

    readExact(

      value,

      "rfs_growth_score",

    );

  if (

    !isValidNullableScore(

      rfsGrowthScore,

    )

  ) {

    throw new Error(

      "scan_asset_factory_rfs_projection_growth_score_invalid",

    );

  }

  return Object.freeze({

    rfs_growth_score:

      rfsGrowthScore,

  });

}

/* ============================================================================

 * 15. CANONICAL TRIPLE LAYER PROJECTION

 * ========================================================================== */

function normalizeCanonicalTripleLayer(

  value: unknown,

): PrivateCanonicalTripleLayer | undefined {

  if (

    value === undefined ||

    value === null

  ) {

    return undefined;

  }

  if (

    !isPlainObject(

      value,

    )

  ) {

    throw new Error(

      "scan_asset_factory_triple_layer_invalid",

    );

  }

  const tripleLayerState =

    readExact(

      value,

      "triple_layer_state",

    );

  const tripleLayerGrowthScore =

    readExact(

      value,

      "triple_layer_growth_score",

    );

  const tripleLayerCorePatternScore =

    readExact(

      value,

      "triple_layer_core_pattern_score",

    );

  const tripleLayerDecayScore =

    readExact(

      value,

      "triple_layer_decay_score",

    );

  const tripleLayerGrowthStatus =

    readExact(

      value,

      "triple_layer_growth_status",

    );

  const tripleLayerCoreStatus =

    readExact(

      value,

      "triple_layer_core_status",

    );

  const tripleLayerDecayStatus =

    readExact(

      value,

      "triple_layer_decay_status",

    );

  if (

    !isExplicitPrivateTripleLayerState(

      tripleLayerState,

    )

  ) {

    throw new Error(

      "scan_asset_factory_triple_layer_state_invalid",

    );

  }

  if (

    !isValidNullableScore(

      tripleLayerGrowthScore,

    )

  ) {

    throw new Error(

      "scan_asset_factory_triple_layer_growth_score_invalid",

    );

  }

  if (

    !isValidNullableScore(

      tripleLayerCorePatternScore,

    )

  ) {

    throw new Error(

      "scan_asset_factory_triple_layer_core_pattern_score_invalid",

    );

  }

  if (

    !isValidNullableScore(

      tripleLayerDecayScore,

    )

  ) {

    throw new Error(

      "scan_asset_factory_triple_layer_decay_score_invalid",

    );

  }

  if (

    !isExplicitScanStatus(

      tripleLayerGrowthStatus,

    )

  ) {

    throw new Error(

      "scan_asset_factory_triple_layer_growth_status_invalid",

    );

  }

  if (

    !isExplicitScanStatus(

      tripleLayerCoreStatus,

    )

  ) {

    throw new Error(

      "scan_asset_factory_triple_layer_core_status_invalid",

    );

  }

  if (

    !isExplicitScanStatus(

      tripleLayerDecayStatus,

    )

  ) {

    throw new Error(

      "scan_asset_factory_triple_layer_decay_status_invalid",

    );

  }

  return Object.freeze({

    triple_layer_state:

      tripleLayerState,

    triple_layer_growth_score:

      tripleLayerGrowthScore,

    triple_layer_core_pattern_score:

      tripleLayerCorePatternScore,

    triple_layer_decay_score:

      tripleLayerDecayScore,

    triple_layer_growth_status:

      tripleLayerGrowthStatus,

    triple_layer_core_status:

      tripleLayerCoreStatus,

    triple_layer_decay_status:

      tripleLayerDecayStatus,

  });

}

/* ============================================================================

 * 16. CANONICAL IMPULSE TRANSPORT

 * ========================================================================== */

type CanonicalImpulseTransport =

  Readonly<{

    impulse_compression_score:

      number | null;

    impulse_pressure_score:

      number | null;

    impulse_acceleration_score:

      number | null;

    impulse_alignment_score:

      number | null;

    impulse_instability_score:

      number | null;

    impulse_saturation_score:

      number | null;

    impulse_exhaustion_score:

      number | null;

    impulse_directional_bias:

      PrivateImpulseDirectionalBias;

    impulse_transition_state:

      PrivateImpulseTransitionState;

    impulse_status:

      PrivateImpulseStatus;

  }>;

function hasAnySuppliedImpulseTruth(

  input: BuildPrivateScanAssetInput,

): boolean {

  return (

    input.impulse_compression_score !== undefined ||

    input.impulse_pressure_score !== undefined ||

    input.impulse_acceleration_score !== undefined ||

    input.impulse_alignment_score !== undefined ||

    input.impulse_instability_score !== undefined ||

    input.impulse_saturation_score !== undefined ||

    input.impulse_exhaustion_score !== undefined ||

    input.impulse_directional_bias !== undefined ||

    input.impulse_transition_state !== undefined ||

    input.impulse_status !== undefined

  );

}

function hasAnyAvailableImpulseScore(

  impulse: CanonicalImpulseTransport,

): boolean {

  return (

    impulse.impulse_compression_score !== null ||

    impulse.impulse_pressure_score !== null ||

    impulse.impulse_acceleration_score !== null ||

    impulse.impulse_alignment_score !== null ||

    impulse.impulse_instability_score !== null ||

    impulse.impulse_saturation_score !== null ||

    impulse.impulse_exhaustion_score !== null

  );

}

function hasAllAvailableImpulseScores(

  impulse: CanonicalImpulseTransport,

): boolean {

  return (

    impulse.impulse_compression_score !== null &&

    impulse.impulse_pressure_score !== null &&

    impulse.impulse_acceleration_score !== null &&

    impulse.impulse_alignment_score !== null &&

    impulse.impulse_instability_score !== null &&

    impulse.impulse_saturation_score !== null &&

    impulse.impulse_exhaustion_score !== null

  );

}

function validateCanonicalImpulseConsistency(

  impulse: CanonicalImpulseTransport,

): void {

  const hasAnyScore =

    hasAnyAvailableImpulseScore(

      impulse,

    );

  const hasAllScores =

    hasAllAvailableImpulseScores(

      impulse,

    );

  const stateUnavailable =

    impulse.impulse_transition_state ===

    "UNAVAILABLE";

  const biasUnavailable =

    impulse.impulse_directional_bias ===

    "UNAVAILABLE";

  if (

    impulse.impulse_status ===

    "unavailable"

  ) {

    if (

      hasAnyScore ||

      !stateUnavailable ||

      !biasUnavailable

    ) {

      throw new Error(

        "scan_asset_factory_impulse_unavailable_payload_inconsistent",

      );

    }

    return;

  }

  if (

    !hasAllScores

  ) {

    throw new Error(

      "scan_asset_factory_impulse_available_payload_scores_incomplete",

    );

  }

  if (

    stateUnavailable

  ) {

    throw new Error(

      "scan_asset_factory_impulse_available_payload_transition_state_unavailable",

    );

  }

  if (

    biasUnavailable

  ) {

    throw new Error(

      "scan_asset_factory_impulse_available_payload_directional_bias_unavailable",

    );

  }

}

function normalizeCanonicalImpulseTransport(

  input: BuildPrivateScanAssetInput,

): CanonicalImpulseTransport {

  const anyImpulseTruthSupplied =

    hasAnySuppliedImpulseTruth(

      input,

    );

  if (

    !anyImpulseTruthSupplied

  ) {

    return Object.freeze({

      impulse_compression_score:

        null,

      impulse_pressure_score:

        null,

      impulse_acceleration_score:

        null,

      impulse_alignment_score:

        null,

      impulse_instability_score:

        null,

      impulse_saturation_score:

        null,

      impulse_exhaustion_score:

        null,

      impulse_directional_bias:

        "UNAVAILABLE",

      impulse_transition_state:

        "UNAVAILABLE",

      impulse_status:

        "unavailable",

    });

  }

  const impulse =

    Object.freeze({

      impulse_compression_score:

        normalizeCanonicalAnalyticalScore(

          input.impulse_compression_score,

          "impulse_compression_score",

        ),

      impulse_pressure_score:

        normalizeCanonicalAnalyticalScore(

          input.impulse_pressure_score,

          "impulse_pressure_score",

        ),

      impulse_acceleration_score:

        normalizeCanonicalAnalyticalScore(

          input.impulse_acceleration_score,

          "impulse_acceleration_score",

        ),

      impulse_alignment_score:

        normalizeCanonicalAnalyticalScore(

          input.impulse_alignment_score,

          "impulse_alignment_score",

        ),

      impulse_instability_score:

        normalizeCanonicalAnalyticalScore(

          input.impulse_instability_score,

          "impulse_instability_score",

        ),

      impulse_saturation_score:

        normalizeCanonicalAnalyticalScore(

          input.impulse_saturation_score,

          "impulse_saturation_score",

        ),

      impulse_exhaustion_score:

        normalizeCanonicalAnalyticalScore(

          input.impulse_exhaustion_score,

          "impulse_exhaustion_score",

        ),

      impulse_directional_bias:

        normalizeImpulseDirectionalBias(

          input.impulse_directional_bias,

        ),

      impulse_transition_state:

        normalizeImpulseTransitionState(

          input.impulse_transition_state,

        ),

      impulse_status:

        normalizePrivateImpulseStatus(

          input.impulse_status,

        ),

    } satisfies CanonicalImpulseTransport);

  validateCanonicalImpulseConsistency(

    impulse,

  );

  return impulse;

}

/* ============================================================================

 * 17. LEGACY GROWTH-LAYER GUARD

 * ========================================================================== */

function assertNoLegacyGrowthLayerTruth(

  value: unknown,

): void {

  if (

    value === undefined ||

    value === null

  ) {

    return;

  }

  throw new Error(

    "scan_asset_factory_growth_layer_score_legacy_alias_forbidden",

  );

}

/* ============================================================================

 * 18. FACTORY

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

   * Canonical producer-qualified projections

   * ----------------------------------------------------------------------- */

  const rfsProjection =

    normalizeCanonicalRfsProjection(

      input.rfs_projection,

    );

  const tripleLayer =

    normalizeCanonicalTripleLayer(

      input.triple_layer,

    );

  const impulse =

    normalizeCanonicalImpulseTransport(

      input,

    );

  const analyticalAggregation =

    normalizeCanonicalAnalyticalAggregation(

      input.analytical_aggregation,

    );

  /* --------------------------------------------------------------------------

   * Legacy analytical alias protection

   * ----------------------------------------------------------------------- */

  assertNoLegacyGrowthLayerTruth(

    input.growth_layer_score,

  );

  /* --------------------------------------------------------------------------

   * Legacy root scores

   * ----------------------------------------------------------------------- */

  const stabilityScore =

    normalizeScore(

      input.stability_score,

    );

  const legacyGrowthScore =

    normalizeScore(

      input.growth_score,

    );

  const legacyCorePatternScore =

    normalizeScore(

      input.core_pattern_score,

    );

  const legacyDecayScore =

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

  /* --------------------------------------------------------------------------

   * Decision

   * ----------------------------------------------------------------------- */

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

     * LEGACY RFS structural transport

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

     * LEGACY Triple Layer flat transport

     *

     * No canonical projection is copied here.

     * --------------------------------------------------------------------- */

    state:

      normalizeTripleLayerState(

        input.triple_layer_state,

      ),

    growth_score:

      legacyGrowthScore,

    core_pattern_score:

      legacyCorePatternScore,

    decay_score:

      legacyDecayScore,

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

     * CANONICAL producer-qualified RFS projection

     * --------------------------------------------------------------------- */

    ...(

      rfsProjection

        ? {

            rfs_projection:

              rfsProjection,

          }

        : {}

    ),

    /* ------------------------------------------------------------------------

     * CANONICAL producer-qualified Triple Layer projection

     * --------------------------------------------------------------------- */

    ...(

      tripleLayer

        ? {

            triple_layer:

              tripleLayer,

          }

        : {}

    ),

    /* ------------------------------------------------------------------------

     * CANONICAL Impulse Layer

     * --------------------------------------------------------------------- */

    impulse_compression_score:

      impulse.impulse_compression_score,

    impulse_pressure_score:

      impulse.impulse_pressure_score,

    impulse_acceleration_score:

      impulse.impulse_acceleration_score,

    impulse_alignment_score:

      impulse.impulse_alignment_score,

    impulse_instability_score:

      impulse.impulse_instability_score,

    impulse_saturation_score:

      impulse.impulse_saturation_score,

    impulse_exhaustion_score:

      impulse.impulse_exhaustion_score,

    impulse_directional_bias:

      impulse.impulse_directional_bias,

    impulse_transition_state:

      impulse.impulse_transition_state,

    impulse_status:

      impulse.impulse_status,

    /* ------------------------------------------------------------------------

     * CANONICAL Analytical Aggregation

     *

     * No context is rebuilt here.

     * No legacy root context is populated from this projection.

     * --------------------------------------------------------------------- */

    ...(

      analyticalAggregation

        ? {

            analytical_aggregation:

              analyticalAggregation,

          }

        : {}

    ),

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

     * RFS regime and MCI decision legacy transport

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

     * LEGACY Analytical Aggregation

     *

     * Compatibility only.

     *

     * IMPORTANT:

     * - canonical analytical_aggregation does not feed these fields

     * - these fields do not feed canonical analytical_aggregation

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
