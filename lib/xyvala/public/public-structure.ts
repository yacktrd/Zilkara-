/* ============================================================================
 * FILE: lib/xyvala/public/public-structure.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical public structure projector
 *
 * ROLE
 * - project validated public structural values without analytical reconstruction
 * - normalize canonical public labels
 * - expose public-safe transition, activity, impulse and market contexts
 * - provide deterministic descriptive counts over validated public truths
 * - keep UI components passive and deterministic
 *
 * CLASSIFICATION
 * - PUBLIC PROJECTION
 * - OBSERVE
 * - no COMPUTE of analytical truths
 * - no MUTATE
 *
 * PRODUCERS
 * - lib/xyvala/services/scan-transformer.ts
 * - validated public snapshot transformer
 * - validated public market-context transformer
 *
 * CONSUMERS
 * - lib/xyvala/services/scan-service.ts
 * - components/scan-table.tsx
 * - public rankings
 * - public market summaries
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/contracts/scan-contract.ts
 * - lib/xyvala/services/scan-transformer.ts
 *
 * INPUTS
 * - validated public activity label
 * - validated public 7D sparkline context
 * - validated public transition label
 * - validated public impulse context
 * - validated public market-context projections
 *
 * OUTPUTS
 * - canonical public activity label
 * - canonical public 7D sparkline context
 * - canonical public transition label
 * - canonical public impulse context
 * - deterministic descriptive counts
 * - validated public market summary projection
 *
 * INVARIANTS
 * - public values are projected, never analytically reconstructed
 * - public transition labels must already exist upstream
 * - public impulse context must already exist upstream
 * - public Triple Layer contexts must already exist upstream
 * - public market climate must already exist upstream
 * - 24H and 7D values never determine global structural truth
 * - sparkline values never determine global structural truth
 * - missing canonical values produce Unavailable
 * - neutral never represents unavailable
 * - no private score usage
 * - no regime exposure
 * - no decision exposure
 * - no opportunity exposure
 * - no confidence exposure
 * - no rupture probability exposure
 * - no calibration exposure
 * - no broker or affiliate exposure
 * - no RFS recomputation
 * - no Triple Layer recomputation
 * - no Impulse Layer recomputation
 * - no Analytical Aggregation recomputation
 * - no investment advice
 * - deterministic output only
 * - same validated input produces the same public output
 *
 * SENSITIVE AREAS
 * - public/private boundary
 * - transition projection
 * - impulse projection
 * - Triple Layer projection
 * - market-context projection
 * - explicit unavailable-state handling
 *
 * COMPATIBILITY
 * - legacy observable fields remain accepted by PublicStructureInput
 * - legacy observable fields are not used to create analytical truths
 * - visual sparkline helpers remain exported for non-analytical consumers
 * ========================================================================== */

/* ============================================================================
 * 1. PUBLIC CANONICAL TYPES
 * ========================================================================== */

export type PublicActivityLabel =
  | "Low"
  | "Normal"
  | "High"
  | "Unavailable";

export type PublicSparklineContext7D =
  | "Compression"
  | "Expansion"
  | "Recovery"
  | "Fragmented"
  | "Stable"
  | "Neutral"
  | "Unavailable";

export type PublicStructureTransition =
  | "Compression Phase"
  | "Expansion Phase"
  | "Recovery Structure"
  | "Fragmentation Detected"
  | "Stable Structure"
  | "Active Expansion"
  | "Neutral Structure"
  | "Unavailable";

export type PublicImpulseContext =
  | "Compression"
  | "Pressure Building"
  | "Release"
  | "Exhaustion"
  | "Neutral"
  | "Unavailable";

export type PublicMarketClimate =
  | "Calm Market"
  | "Active Market"
  | "Expansion Market"
  | "Fragmented Market"
  | "Transitioning Market"
  | "Unavailable";

export type PublicGrowthContext =
  | "Low"
  | "Moderate"
  | "Active"
  | "Unavailable";

export type PublicCoreStructure =
  | "Weak"
  | "Mixed"
  | "Stable"
  | "Unavailable";

export type PublicDecayContext =
  | "Limited"
  | "Rising"
  | "Elevated"
  | "Unavailable";

/* ============================================================================
 * 2. PUBLIC INPUT CONTRACTS
 * ----------------------------------------------------------------------------
 * Canonical fields are the only fields authorized to produce public
 * analytical labels.
 *
 * Legacy observable fields remain available for compatibility and purely
 * visual usage. They must never be used to reconstruct structural truth.
 * ========================================================================== */

export type PublicStructureInput = {
  /**
   * Canonical public projections.
   */
  public_activity_label?: unknown;
  public_sparkline_context_7d?: unknown;
  public_transition_label?: unknown;
  public_impulse_context?: unknown;

  /**
   * Legacy observable fields.
   *
   * These values must not be used to derive global structural labels.
   */
  pct_24h?: number | null;
  pct_7d?: number | null;
  volume_24h?: number | null;
  market_cap?: number | null;
  sparkline_7d?: number[] | null;

  /**
   * Legacy impulse propagation fields.
   *
   * They remain accepted only to avoid immediate consumer breakage.
   * They are intentionally ignored by the canonical projector.
   */
  impulse_transition_state?: unknown;
  impulse_context?: unknown;
};

export type PublicStructureResult = {
  activity: PublicActivityLabel;
  sparkline_context_7d: PublicSparklineContext7D;
  structure_transition: PublicStructureTransition;
  impulse_context: PublicImpulseContext;
};

/**
 * Canonical alias.
 *
 * A public market-structure asset and a projected public structure result
 * represent the same contract.
 */
export type PublicMarketStructureAsset = PublicStructureResult;

export type PublicMarketSummaryProjection = {
  public_market_climate?: unknown;
  public_growth_context?: unknown;
  public_core_structure?: unknown;
  public_decay_context?: unknown;
};

export type PublicMarketStructureSummary = {
  market_climate: PublicMarketClimate;
  dominant_transition: PublicStructureTransition;
  activity_context: PublicActivityLabel;
  impulse_context: PublicImpulseContext;

  growth_context: PublicGrowthContext;
  core_structure: PublicCoreStructure;
  decay_context: PublicDecayContext;

  assets_count: number;
  available_assets_count: number;
  unavailable_assets_count: number;

  expansion_count: number;
  fragmentation_count: number;
  compression_count: number;
};

/* ============================================================================
 * 3. SAFE PRIMITIVE HELPERS
 * ========================================================================== */

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeSparkline(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }

  if (!value.every(isFiniteNumber)) {
    return null;
  }

  return [...value];
}

/* ============================================================================
 * 4. STRICT CANONICAL LABEL PROJECTORS
 * ----------------------------------------------------------------------------
 * These functions accept only official public values.
 *
 * Synonyms, casing variants and private values are rejected as unavailable.
 * This behavior exposes propagation failures instead of masking them.
 * ========================================================================== */

export function toPublicActivityLabel(
  value: unknown,
): PublicActivityLabel {
  switch (value) {
    case "Low":
    case "Normal":
    case "High":
    case "Unavailable":
      return value;

    default:
      return "Unavailable";
  }
}

export function toPublicSparklineContext7D(
  value: unknown,
): PublicSparklineContext7D {
  switch (value) {
    case "Compression":
    case "Expansion":
    case "Recovery":
    case "Fragmented":
    case "Stable":
    case "Neutral":
    case "Unavailable":
      return value;

    default:
      return "Unavailable";
  }
}

export function toPublicStructureTransition(
  value: unknown,
): PublicStructureTransition {
  switch (value) {
    case "Compression Phase":
    case "Expansion Phase":
    case "Recovery Structure":
    case "Fragmentation Detected":
    case "Stable Structure":
    case "Active Expansion":
    case "Neutral Structure":
    case "Unavailable":
      return value;

    default:
      return "Unavailable";
  }
}

export function toPublicImpulseContext(
  value: unknown,
): PublicImpulseContext {
  switch (value) {
    case "Compression":
    case "Pressure Building":
    case "Release":
    case "Exhaustion":
    case "Neutral":
    case "Unavailable":
      return value;

    default:
      return "Unavailable";
  }
}

export function toPublicMarketClimate(
  value: unknown,
): PublicMarketClimate {
  switch (value) {
    case "Calm Market":
    case "Active Market":
    case "Expansion Market":
    case "Fragmented Market":
    case "Transitioning Market":
    case "Unavailable":
      return value;

    default:
      return "Unavailable";
  }
}

export function toPublicGrowthContext(
  value: unknown,
): PublicGrowthContext {
  switch (value) {
    case "Low":
    case "Moderate":
    case "Active":
    case "Unavailable":
      return value;

    default:
      return "Unavailable";
  }
}

export function toPublicCoreStructure(
  value: unknown,
): PublicCoreStructure {
  switch (value) {
    case "Weak":
    case "Mixed":
    case "Stable":
    case "Unavailable":
      return value;

    default:
      return "Unavailable";
  }
}

export function toPublicDecayContext(
  value: unknown,
): PublicDecayContext {
  switch (value) {
    case "Limited":
    case "Rising":
    case "Elevated":
    case "Unavailable":
      return value;

    default:
      return "Unavailable";
  }
}

/* ============================================================================
 * 5. CANONICAL PUBLIC STRUCTURE PROJECTOR
 * ----------------------------------------------------------------------------
 * No observable market field is used to produce analytical labels.
 * ========================================================================== */

export function buildPublicStructure(
  input: PublicStructureInput,
): PublicStructureResult {
  return {
    activity: toPublicActivityLabel(
      input.public_activity_label,
    ),

    sparkline_context_7d: toPublicSparklineContext7D(
      input.public_sparkline_context_7d,
    ),

    structure_transition: toPublicStructureTransition(
      input.public_transition_label,
    ),

    impulse_context: toPublicImpulseContext(
      input.public_impulse_context,
    ),
  };
}

/* ============================================================================
 * 6. LEGACY VISUAL SPARKLINE HELPERS
 * ----------------------------------------------------------------------------
 * These helpers are retained for compatibility with visual consumers only.
 *
 * They must never be used to:
 * - produce a structural transition
 * - produce a regime
 * - produce a Triple Layer context
 * - produce an Impulse Layer state
 * - produce a market climate
 * - produce a decision or ranking score
 *
 * Invalid or incomplete data returns an explicit non-computable result where
 * the existing return contract permits it.
 * ========================================================================== */

export function computePublicAmplitude7D(
  points: number[] | null,
): number {
  const clean = normalizeSparkline(points);

  if (!clean) {
    return 0;
  }

  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const last = clean.at(-1);

  if (!isFiniteNumber(last) || last <= 0) {
    return 0;
  }

  return ((max - min) / last) * 100;
}

export function computePublicSparklineDirection7D(
  points: number[] | null,
): "up" | "down" | "flat" {
  const clean = normalizeSparkline(points);

  if (!clean) {
    return "flat";
  }

  const first = clean[0];
  const last = clean.at(-1);

  if (
    !isFiniteNumber(first) ||
    !isFiniteNumber(last) ||
    first <= 0
  ) {
    return "flat";
  }

  const changePct =
    ((last - first) / first) * 100;

  if (changePct > 1) {
    return "up";
  }

  if (changePct < -1) {
    return "down";
  }

  return "flat";
}

export function computePublicSparklineChange7D(
  points: number[] | null,
): number | null {
  const clean = normalizeSparkline(points);

  if (!clean) {
    return null;
  }

  const first = clean[0];
  const last = clean.at(-1);

  if (
    !isFiniteNumber(first) ||
    !isFiniteNumber(last) ||
    first <= 0
  ) {
    return null;
  }

  return ((last - first) / first) * 100;
}

export function computePublicDirectionChanges7D(
  points: number[] | null,
): number {
  const clean = normalizeSparkline(points);

  if (!clean || clean.length < 3) {
    return 0;
  }

  let changes = 0;
  let previousDirection:
    | "up"
    | "down"
    | "flat" = "flat";

  for (
    let index = 1;
    index < clean.length;
    index += 1
  ) {
    const previous = clean[index - 1];
    const current = clean[index];

    if (
      !isFiniteNumber(previous) ||
      !isFiniteNumber(current) ||
      previous <= 0
    ) {
      continue;
    }

    const deltaPct =
      ((current - previous) / previous) * 100;

    const direction =
      deltaPct > 0.15
        ? "up"
        : deltaPct < -0.15
          ? "down"
          : "flat";

    if (
      previousDirection !== "flat" &&
      direction !== "flat" &&
      direction !== previousDirection
    ) {
      changes += 1;
    }

    if (direction !== "flat") {
      previousDirection = direction;
    }
  }

  return changes;
}

/* ============================================================================
 * 7. LEGACY RESOLVER COMPATIBILITY
 * ----------------------------------------------------------------------------
 * These exports remain available to prevent immediate import failures.
 *
 * They no longer derive analytical truth from observable data.
 * Without an explicit canonical public label, they return Unavailable.
 * ========================================================================== */

export function resolvePublicActivity(input: {
  public_activity_label?: unknown;
  volume_24h?: unknown;
  market_cap?: unknown;
}): PublicActivityLabel {
  return toPublicActivityLabel(
    input.public_activity_label,
  );
}

export function resolvePublicSparklineContext7D(input: {
  public_sparkline_context_7d?: unknown;
  pct_24h?: unknown;
  pct_7d?: unknown;
  sparkline_7d?: unknown;
}): PublicSparklineContext7D {
  return toPublicSparklineContext7D(
    input.public_sparkline_context_7d,
  );
}

export function resolvePublicStructureTransition(input: {
  public_transition_label?: unknown;
  pct_24h?: unknown;
  pct_7d?: unknown;
  volume_24h?: unknown;
  market_cap?: unknown;
  sparkline_7d?: unknown;
}): PublicStructureTransition {
  return toPublicStructureTransition(
    input.public_transition_label,
  );
}

/* ============================================================================
 * 8. DESCRIPTIVE PUBLIC COUNTS
 * ----------------------------------------------------------------------------
 * Counting and ordering validated public labels does not create a new
 * analytical truth.
 *
 * These functions:
 * - do not generate scores
 * - do not infer private states
 * - do not change labels
 * - do not use price or sparkline data
 * ========================================================================== */

function isAvailableStructureAsset(
  asset: PublicMarketStructureAsset,
): boolean {
  return (
    asset.activity !== "Unavailable" ||
    asset.sparkline_context_7d !== "Unavailable" ||
    asset.structure_transition !== "Unavailable" ||
    asset.impulse_context !== "Unavailable"
  );
}

function countByTransition(
  assets: readonly PublicMarketStructureAsset[],
  predicate: (
    transition: PublicStructureTransition,
  ) => boolean,
): number {
  return assets.reduce(
    (count, asset) =>
      predicate(asset.structure_transition)
        ? count + 1
        : count,
    0,
  );
}

function resolveDominantTransition(
  assets: readonly PublicMarketStructureAsset[],
): PublicStructureTransition {
  const availableTransitions = assets
    .map((asset) =>
      toPublicStructureTransition(
        asset.structure_transition,
      ),
    )
    .filter(
      (
        transition,
      ): transition is Exclude<
        PublicStructureTransition,
        "Unavailable"
      > => transition !== "Unavailable",
    );

  if (availableTransitions.length === 0) {
    return "Unavailable";
  }

  const priority: readonly Exclude<
    PublicStructureTransition,
    "Unavailable"
  >[] = [
    "Fragmentation Detected",
    "Active Expansion",
    "Expansion Phase",
    "Recovery Structure",
    "Compression Phase",
    "Stable Structure",
    "Neutral Structure",
  ];

  const counts: Record<
    Exclude<
      PublicStructureTransition,
      "Unavailable"
    >,
    number
  > = {
    "Fragmentation Detected": 0,
    "Active Expansion": 0,
    "Expansion Phase": 0,
    "Recovery Structure": 0,
    "Compression Phase": 0,
    "Stable Structure": 0,
    "Neutral Structure": 0,
  };

  for (const transition of availableTransitions) {
    counts[transition] += 1;
  }

  let dominant: Exclude<
    PublicStructureTransition,
    "Unavailable"
  > = "Neutral Structure";

  let dominantCount = -1;

  for (const transition of priority) {
    const count = counts[transition];

    if (count > dominantCount) {
      dominant = transition;
      dominantCount = count;
    }
  }

  return dominant;
}

function resolveActivityContext(
  assets: readonly PublicMarketStructureAsset[],
): PublicActivityLabel {
  const availableActivities = assets
    .map((asset) =>
      toPublicActivityLabel(
        asset.activity,
      ),
    )
    .filter(
      (
        activity,
      ): activity is Exclude<
        PublicActivityLabel,
        "Unavailable"
      > => activity !== "Unavailable",
    );

  if (availableActivities.length === 0) {
    return "Unavailable";
  }

  const counts: Record<
    Exclude<
      PublicActivityLabel,
      "Unavailable"
    >,
    number
  > = {
    Low: 0,
    Normal: 0,
    High: 0,
  };

  for (const activity of availableActivities) {
    counts[activity] += 1;
  }

  const priority: readonly Exclude<
    PublicActivityLabel,
    "Unavailable"
  >[] = [
    "High",
    "Normal",
    "Low",
  ];

  let dominant: Exclude<
    PublicActivityLabel,
    "Unavailable"
  > = "Low";

  let dominantCount = -1;

  for (const activity of priority) {
    const count = counts[activity];

    if (count > dominantCount) {
      dominant = activity;
      dominantCount = count;
    }
  }

  return dominant;
}

function resolveDominantImpulseContext(
  assets: readonly PublicMarketStructureAsset[],
): PublicImpulseContext {
  const availableContexts = assets
    .map((asset) =>
      toPublicImpulseContext(
        asset.impulse_context,
      ),
    )
    .filter(
      (
        context,
      ): context is Exclude<
        PublicImpulseContext,
        "Unavailable"
      > => context !== "Unavailable",
    );

  if (availableContexts.length === 0) {
    return "Unavailable";
  }

  const counts: Record<
    Exclude<
      PublicImpulseContext,
      "Unavailable"
    >,
    number
  > = {
    Compression: 0,
    "Pressure Building": 0,
    Release: 0,
    Exhaustion: 0,
    Neutral: 0,
  };

  for (const context of availableContexts) {
    counts[context] += 1;
  }

  const priority: readonly Exclude<
    PublicImpulseContext,
    "Unavailable"
  >[] = [
    "Exhaustion",
    "Release",
    "Pressure Building",
    "Compression",
    "Neutral",
  ];

  let dominant: Exclude<
    PublicImpulseContext,
    "Unavailable"
  > = "Neutral";

  let dominantCount = -1;

  for (const context of priority) {
    const count = counts[context];

    if (count > dominantCount) {
      dominant = context;
      dominantCount = count;
    }
  }

  return dominant;
}

/* ============================================================================
 * 9. PUBLIC TRIPLE LAYER PROJECTION
 * ----------------------------------------------------------------------------
 * Triple Layer public contexts must already be produced by a validated
 * upstream transformer.
 *
 * Asset transition counts are not authorized to recreate Growth, Core or
 * Decay contexts.
 * ========================================================================== */

export function resolveGrowthContext(
  _assets: readonly PublicMarketStructureAsset[],
  publicGrowthContext?: unknown,
): PublicGrowthContext {
  return toPublicGrowthContext(
    publicGrowthContext,
  );
}

export function resolveCoreStructure(
  _assets: readonly PublicMarketStructureAsset[],
  publicCoreStructure?: unknown,
): PublicCoreStructure {
  return toPublicCoreStructure(
    publicCoreStructure,
  );
}

export function resolveDecayContext(
  _assets: readonly PublicMarketStructureAsset[],
  publicDecayContext?: unknown,
): PublicDecayContext {
  return toPublicDecayContext(
    publicDecayContext,
  );
}

/* ============================================================================
 * 10. PUBLIC MARKET CLIMATE PROJECTION
 * ----------------------------------------------------------------------------
 * Market climate is an upstream aggregated public projection.
 *
 * It must never be recreated locally from transition or activity ratios.
 * ========================================================================== */

export function resolvePublicMarketClimate(
  _assets: readonly PublicMarketStructureAsset[],
  publicMarketClimate?: unknown,
): PublicMarketClimate {
  return toPublicMarketClimate(
    publicMarketClimate,
  );
}

/* ============================================================================
 * 11. PUBLIC MARKET SUMMARY
 * ----------------------------------------------------------------------------
 * The function:
 * - projects validated market and Triple Layer contexts
 * - counts existing validated public labels
 * - identifies dominant existing public labels deterministically
 *
 * It never derives a new structural, impulsional or Triple Layer truth.
 * ========================================================================== */

export function buildPublicMarketStructureSummary(
  assets: readonly PublicMarketStructureAsset[],
  projection: PublicMarketSummaryProjection = {},
): PublicMarketStructureSummary {
  const normalizedAssets =
    assets.map(
      (
        asset,
      ): PublicMarketStructureAsset => ({
        activity: toPublicActivityLabel(
          asset.activity,
        ),

        sparkline_context_7d:
          toPublicSparklineContext7D(
            asset.sparkline_context_7d,
          ),

        structure_transition:
          toPublicStructureTransition(
            asset.structure_transition,
          ),

        impulse_context:
          toPublicImpulseContext(
            asset.impulse_context,
          ),
      }),
    );

  const availableAssets =
    normalizedAssets.filter(
      isAvailableStructureAsset,
    );

  const expansionCount =
    countByTransition(
      normalizedAssets,
      (transition) =>
        transition === "Expansion Phase" ||
        transition === "Active Expansion",
    );

  const fragmentationCount =
    countByTransition(
      normalizedAssets,
      (transition) =>
        transition ===
        "Fragmentation Detected",
    );

  const compressionCount =
    countByTransition(
      normalizedAssets,
      (transition) =>
        transition ===
          "Compression Phase" ||
        transition ===
          "Stable Structure",
    );

  return {
    market_climate:
      toPublicMarketClimate(
        projection.public_market_climate,
      ),

    dominant_transition:
      resolveDominantTransition(
        normalizedAssets,
      ),

    activity_context:
      resolveActivityContext(
        normalizedAssets,
      ),

    impulse_context:
      resolveDominantImpulseContext(
        normalizedAssets,
      ),

    growth_context:
      toPublicGrowthContext(
        projection.public_growth_context,
      ),

    core_structure:
      toPublicCoreStructure(
        projection.public_core_structure,
      ),

    decay_context:
      toPublicDecayContext(
        projection.public_decay_context,
      ),

    assets_count:
      normalizedAssets.length,

    available_assets_count:
      availableAssets.length,

    unavailable_assets_count:
      Math.max(
        0,
        normalizedAssets.length -
          availableAssets.length,
      ),

    expansion_count:
      expansionCount,

    fragmentation_count:
      fragmentationCount,

    compression_count:
      compressionCount,
  };
}
