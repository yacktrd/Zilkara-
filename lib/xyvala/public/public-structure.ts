/* ============================================================================
 * FILE: lib/xyvala/public/public-structure.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public structure reader
 *
 * ROLE
 * - derive public descriptive market structure labels from observable data only
 * - centralize public transition, activity, market climate and Triple Layer context
 * - keep UI components passive and deterministic
 *
 * PARENTS
 * - lib/xyvala/contracts/scan-contract.ts
 * - lib/xyvala/services/scan-service.ts
 * - components/scan-table.tsx
 *
 * DIRECTIVES
 * - public descriptive layer only
 * - no private score usage
 * - no regime exposure
 * - no decision exposure
 * - no opportunity exposure
 * - no confidence exposure
 * - no rupture probability exposure
 * - no calibration exposure
 * - no broker / affiliate exposure
 * - no RFS recomputation
 * - no MCI recomputation
 * - no investment advice
 * - deterministic output only
 * - same input => same public structure output
 *
 * INPUTS
 * - observable public asset fields
 *
 * OUTPUTS
 * - activity label
 * - 7D sparkline context
 * - structure transition label
 * - market climate summary
 * - public Triple Layer context
 *
 * INVARIANTS
 * - null means explicitly unavailable
 * - labels remain descriptive, never prescriptive
 * - no buy / sell / hold semantics
 * - no predictive wording
 * - no numerical private scoring
 * - UI must display these values, not rebuild them
 *
 * SENSITIVE ZONES
 * - public/private boundary
 * - legal wording
 * - transition labels must remain non-advisory
 * - Triple Layer context must remain descriptive and public-safe
 * ========================================================================== */

/* ============================================================================
 * 1. PUBLIC TYPES
 * ========================================================================== */

export type PublicActivityLabel = "Low" | "Normal" | "High" | "Unavailable";

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
  | "Neutral Structure";

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

export type PublicImpulseContext =
  | "Compression"
  | "Pressure Building"
  | "Release"
  | "Exhaustion"
  | "Neutral"
  | "Unavailable";

export type PublicStructureInput = {
  pct_24h: number | null;
  pct_7d: number | null;
  volume_24h: number | null;
  market_cap: number | null;
  sparkline_7d: number[] | null;
};

export type PublicStructureResult = {
  activity: PublicActivityLabel;
  sparkline_context_7d: PublicSparklineContext7D;
  structure_transition: PublicStructureTransition;
  impulse_context: PublicImpulseContext;
};

export type PublicMarketStructureAsset = {
  activity: PublicActivityLabel;
  sparkline_context_7d: PublicSparklineContext7D;
  structure_transition: PublicStructureTransition;
  impulse_context: PublicImpulseContext;
};

export type PublicMarketStructureSummary = {
  market_climate: PublicMarketClimate;
  dominant_transition: PublicStructureTransition | "Unavailable";
  activity_context: PublicActivityLabel;

  growth_context: PublicGrowthContext;
  core_structure: PublicCoreStructure;
  decay_context: PublicDecayContext;
  impulse_context: PublicImpulseContext;

  assets_count: number;
  expansion_count: number;
  fragmentation_count: number;
  compression_count: number;
};

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeNullableNumber(value: unknown): number | null {
  return isFiniteNumber(value) ? value : null;
}

function normalizeSparkline(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;

  const points = value.filter(isFiniteNumber);

  return points.length >= 2 ? points : null;
}

function abs(value: number | null): number {
  return Math.abs(value ?? 0);
}

function resolveImpulseContext(
  assets: readonly PublicMarketStructureAsset[],
): PublicImpulseContext {
  if (assets.length === 0) return "Unavailable";

  const counts: Record<PublicImpulseContext, number> = {
    Compression: 0,
    "Pressure Building": 0,
    Release: 0,
    Exhaustion: 0,
    Neutral: 0,
    Unavailable: 0,
  };

  for (const asset of assets) {
    counts[asset.impulse_context] += 1;
  }

  const availableTotal =
    counts.Compression +
    counts["Pressure Building"] +
    counts.Release +
    counts.Exhaustion +
    counts.Neutral;

  if (availableTotal === 0) return "Unavailable";

  if (counts.Exhaustion / availableTotal >= 0.3) return "Exhaustion";
  if (counts.Release / availableTotal >= 0.3) return "Release";
  if (counts["Pressure Building"] / availableTotal >= 0.3) {
    return "Pressure Building";
  }
  if (counts.Compression / availableTotal >= 0.3) return "Compression";

  return "Neutral";
}

/* ============================================================================
 * 3. OBSERVABLE SHAPE READERS
 * ========================================================================== */

export function computePublicAmplitude7D(points: number[] | null): number {
  const clean = normalizeSparkline(points);

  if (!clean) return 0;

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

  if (!clean) return "flat";

  const first = clean[0];
  const last = clean.at(-1);

  if (!isFiniteNumber(first) || !isFiniteNumber(last) || first <= 0) {
    return "flat";
  }

  const changePct = ((last - first) / first) * 100;

  if (changePct > 1) return "up";
  if (changePct < -1) return "down";

  return "flat";
}

export function computePublicSparklineChange7D(
  points: number[] | null,
): number | null {
  const clean = normalizeSparkline(points);

  if (!clean) return null;

  const first = clean[0];
  const last = clean.at(-1);

  if (!isFiniteNumber(first) || !isFiniteNumber(last) || first <= 0) {
    return null;
  }

  return ((last - first) / first) * 100;
}

/* ============================================================================
 * 4. PUBLIC ACTIVITY
 * ========================================================================== */

export function resolvePublicActivity(input: {
  volume_24h: unknown;
  market_cap: unknown;
}): PublicActivityLabel {
  const volume24h = normalizeNullableNumber(input.volume_24h);
  const marketCap = normalizeNullableNumber(input.market_cap);

  if (volume24h === null || marketCap === null || marketCap <= 0) {
    return "Unavailable";
  }

  const activityRatio = volume24h / marketCap;

  if (activityRatio >= 0.08) return "High";
  if (activityRatio >= 0.025) return "Normal";

  return "Low";
}

/* ============================================================================
 * 5. PUBLIC 7D SPARKLINE CONTEXT
 * ========================================================================== */

export function resolvePublicSparklineContext7D(input: {
  pct_24h: unknown;
  pct_7d: unknown;
  sparkline_7d: unknown;
}): PublicSparklineContext7D {
  const pct24h = normalizeNullableNumber(input.pct_24h) ?? 0;
  const pct7d = normalizeNullableNumber(input.pct_7d) ?? 0;
  const sparkline = normalizeSparkline(input.sparkline_7d);

  if (!sparkline) {
    return "Unavailable";
  }

  const abs24h = Math.abs(pct24h);
  const abs7d = Math.abs(pct7d);
  const amplitude = computePublicAmplitude7D(sparkline);
  const direction = computePublicSparklineDirection7D(sparkline);

  if (abs24h >= 7 || abs7d >= 18 || amplitude >= 18) {
    return "Fragmented";
  }

  if (pct24h > 0.2 && pct7d > 1 && direction === "up") {
    return "Expansion";
  }

  if (pct24h > 0.2 && pct7d < -1 && direction !== "down") {
    return "Recovery";
  }

  if (abs24h <= 0.2 && abs7d <= 0.8 && amplitude <= 1.5) {
    return "Compression";
  }

  if (abs24h <= 1.5 && abs7d <= 5 && amplitude <= 8) {
    return "Stable";
  }

  return "Neutral";
}

/* ============================================================================
 * 6. PUBLIC STRUCTURE TRANSITION
 * ========================================================================== */

export function resolvePublicStructureTransition(input: {
  pct_24h: unknown;
  pct_7d: unknown;
  volume_24h: unknown;
  market_cap: unknown;
  sparkline_7d: unknown;
}): PublicStructureTransition {
  const pct24h = normalizeNullableNumber(input.pct_24h) ?? 0;
  const pct7d = normalizeNullableNumber(input.pct_7d) ?? 0;
  const sparkline = normalizeSparkline(input.sparkline_7d);

  const activity = resolvePublicActivity({
    volume_24h: input.volume_24h,
    market_cap: input.market_cap,
  });

  const abs24h = abs(pct24h);
  const abs7d = abs(pct7d);
  const amplitude = computePublicAmplitude7D(sparkline);
  const direction = computePublicSparklineDirection7D(sparkline);

  if (abs24h >= 7 || abs7d >= 18 || amplitude >= 18) {
    return "Fragmentation Detected";
  }

  if (
    pct24h > 0.4 &&
    pct7d > 1.5 &&
    direction === "up" &&
    activity === "High"
  ) {
    return "Active Expansion";
  }

  if (pct24h > 0.2 && pct7d > 1 && direction === "up") {
    return "Expansion Phase";
  }

  if (pct24h > 0.2 && pct7d < -1 && direction !== "down") {
    return "Recovery Structure";
  }

  if (
    abs24h <= 0.2 &&
    abs7d <= 0.8 &&
    amplitude <= 1.5 &&
    direction === "flat"
  ) {
    return "Compression Phase";
  }

  if (abs24h <= 1.5 && abs7d <= 5 && amplitude <= 8) {
    return "Stable Structure";
  }

  return "Neutral Structure";
}

export function buildPublicStructure(
  input: PublicStructureInput,
): PublicStructureResult {
  const normalizedInput = {
    pct_24h: normalizeNullableNumber(input.pct_24h),
    pct_7d: normalizeNullableNumber(input.pct_7d),
    volume_24h: normalizeNullableNumber(input.volume_24h),
    market_cap: normalizeNullableNumber(input.market_cap),
    sparkline_7d: normalizeSparkline(input.sparkline_7d),
 };

  return {
    activity: resolvePublicActivity({
      volume_24h: normalizedInput.volume_24h,
      market_cap: normalizedInput.market_cap,
    }),

    sparkline_context_7d: resolvePublicSparklineContext7D({
      pct_24h: normalizedInput.pct_24h,
      pct_7d: normalizedInput.pct_7d,
      sparkline_7d: normalizedInput.sparkline_7d,
    }),

    structure_transition: resolvePublicStructureTransition({
      pct_24h: normalizedInput.pct_24h,
      pct_7d: normalizedInput.pct_7d,
      volume_24h: normalizedInput.volume_24h,
      market_cap: normalizedInput.market_cap,
      sparkline_7d: normalizedInput.sparkline_7d,
    }),
      impulse_context: "Unavailable",
  };
}

/* ============================================================================
 * 7. PUBLIC TRIPLE LAYER CONTEXT
 * ----------------------------------------------------------------------------
 * ROLE
 * - expose descriptive market context only
 * - no scoring
 * - no prediction
 * - no investment recommendation
 * ========================================================================== */

export function resolveGrowthContext(
  assets: readonly PublicMarketStructureAsset[],
): PublicGrowthContext {
  if (assets.length === 0) return "Unavailable";

  const expanding = assets.filter(
    (asset) =>
      asset.structure_transition === "Expansion Phase" ||
      asset.structure_transition === "Active Expansion",
  ).length;

  const ratio = expanding / assets.length;

  if (ratio >= 0.4) return "Active";
  if (ratio >= 0.18) return "Moderate";

  return "Low";
}

export function resolveCoreStructure(
  assets: readonly PublicMarketStructureAsset[],
): PublicCoreStructure {
  if (assets.length === 0) return "Unavailable";

  const stable = assets.filter(
    (asset) =>
      asset.structure_transition === "Stable Structure" ||
      asset.structure_transition === "Compression Phase",
  ).length;

  const neutral = assets.filter(
    (asset) => asset.structure_transition === "Neutral Structure",
  ).length;

  const coreRatio = (stable + neutral * 0.5) / assets.length;

  if (coreRatio >= 0.45) return "Stable";
  if (coreRatio >= 0.2) return "Mixed";

  return "Weak";
}

export function resolveDecayContext(
  assets: readonly PublicMarketStructureAsset[],
): PublicDecayContext {
  if (assets.length === 0) return "Unavailable";

  const fragmented = assets.filter(
    (asset) => asset.structure_transition === "Fragmentation Detected",
  ).length;

  const recovery = assets.filter(
    (asset) => asset.structure_transition === "Recovery Structure",
  ).length;

  const decayRatio = (fragmented + recovery * 0.35) / assets.length;

  if (decayRatio >= 0.3) return "Elevated";
  if (decayRatio >= 0.12) return "Rising";

  return "Limited";
}

/* ============================================================================
 * 8. PUBLIC MARKET SUMMARY
 * ========================================================================== */

function countByTransition(
  assets: readonly PublicMarketStructureAsset[],
  predicate: (transition: PublicStructureTransition) => boolean,
): number {
  return assets.filter((asset) => predicate(asset.structure_transition)).length;
}

function resolveDominantTransition(
  assets: readonly PublicMarketStructureAsset[],
): PublicStructureTransition | "Unavailable" {
  if (assets.length === 0) return "Unavailable";

  const counts = new Map<PublicStructureTransition, number>();

  for (const asset of assets) {
    counts.set(
      asset.structure_transition,
      (counts.get(asset.structure_transition) ?? 0) + 1,
    );
  }

  return [...counts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1];
    return left[0].localeCompare(right[0]);
  })[0]?.[0] ?? "Unavailable";
}

function resolveActivityContext(
  assets: readonly PublicMarketStructureAsset[],
): PublicActivityLabel {
  if (assets.length === 0) return "Unavailable";

  const high = assets.filter((asset) => asset.activity === "High").length;
  const normal = assets.filter((asset) => asset.activity === "Normal").length;

  if (high / assets.length >= 0.3) return "High";
  if ((high + normal) / assets.length >= 0.5) return "Normal";

  return "Low";
}

export function resolvePublicMarketClimate(
  assets: readonly PublicMarketStructureAsset[],
): PublicMarketClimate {
  if (assets.length === 0) return "Unavailable";

  const total = assets.length;

  const fragmented = countByTransition(
    assets,
    (transition) => transition === "Fragmentation Detected",
  );

  const expanding = countByTransition(
    assets,
    (transition) =>
      transition === "Expansion Phase" || transition === "Active Expansion",
  );

  const compressed = countByTransition(
    assets,
    (transition) =>
      transition === "Compression Phase" || transition === "Stable Structure",
  );

  const active = assets.filter((asset) => asset.activity === "High").length;

  if (fragmented / total >= 0.3) return "Fragmented Market";
  if (expanding / total >= 0.35) return "Expansion Market";
  if (active / total >= 0.35) return "Active Market";
  if (compressed / total >= 0.45) return "Calm Market";

  return "Transitioning Market";
}

export function buildPublicMarketStructureSummary(
  assets: readonly PublicMarketStructureAsset[],
): PublicMarketStructureSummary {
  const expansionCount = countByTransition(
    assets,
    (transition) =>
      transition === "Expansion Phase" || transition === "Active Expansion",
  );

  const fragmentationCount = countByTransition(
    assets,
    (transition) => transition === "Fragmentation Detected",
  );

  const compressionCount = countByTransition(
    assets,
    (transition) =>
      transition === "Compression Phase" || transition === "Stable Structure",
  );

  return {
    market_climate: resolvePublicMarketClimate(assets),
    dominant_transition: resolveDominantTransition(assets),
    activity_context: resolveActivityContext(assets),

    growth_context: resolveGrowthContext(assets),
    core_structure: resolveCoreStructure(assets),
    decay_context: resolveDecayContext(assets),
    impulse_context: resolveImpulseContext(assets),

    assets_count: assets.length,
    expansion_count: expansionCount,
    fragmentation_count: fragmentationCount,
    compression_count: compressionCount,
  };
}
