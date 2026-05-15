/* ============================================================================
 * FILE: lib/xyvala/mapping/mapping-rfs.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala provider mapping RFS layer
 *
 * PARENT FILES
 * - lib/xyvala/mapping/coingecko-mapper.ts
 * - lib/xyvala/mapping/mapping-mci.ts
 * - lib/xyvala/services/raw-assets-service.ts
 *
 * ROLE
 * - perform structural reading of provider-mapped assets before canonical propagation
 * - resolve deterministic asset identity
 * - score mapping stability, rupture, schema alignment and identity consistency
 * - degrade incomplete assets instead of deleting them
 *
 * DIRECTIVES
 * - FR / EU compatible mapping layer
 * - no public route shaping here
 * - no snapshot shaping here
 * - no MCI decision logic here
 * - no market prediction here
 * - same input => same structural output
 * - identity building is mandatory here
 * - missing market data must degrade scores, not reject assets
 * - only unusable identity may reject an asset
 *
 * INPUTS
 * - provider-mapped assets
 *
 * OUTPUTS
 * - MappingRfsResult
 *
 * INVARIANTS
 * - critical identity fields are resolved or explicitly rejected
 * - mapping identity remains deterministic
 * - score range stays in [0,100]
 * - null market fields never delete an asset
 * - no downstream mutation assumptions
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/mapping/coingecko-mapper.ts
 *
 * SENSITIVE ZONES
 * - identity resolution
 * - collision detection
 * - structural scoring
 * - non-propagation of malformed identity
 * ========================================================================== */

import type { CoinGeckoMappedAsset } from "@/lib/xyvala/mapping/coingecko-mapper";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type MappingRegime = "STABLE" | "TRANSITION" | "VOLATILE";

export type MappingIdentity = {
  provider: string;
  provider_version: string;

  provider_id: string | null;
  provider_symbol: string | null;
  provider_name: string | null;

  canonical_id: string;
  canonical_symbol: string;
  canonical_name: string;

  base_asset: string;
  quote_asset: string | null;

  identity_fingerprint: string;
  market_fingerprint: string;
};

export type MappingRfsAssetResult = {
  identity: MappingIdentity;

  mapping_stability: number;
  mapping_regime: MappingRegime;
  mapping_structure_score: number;
  mapping_rupture_score: number;

  mapping_identity_score: number;
  mapping_identity_convergence_score: number;
  mapping_identity_duration_score: number;

  mapping_field_coverage_score: number;
  mapping_schema_alignment_score: number;
  mapping_null_pressure_score: number;
  mapping_rejection_pressure_score: number;
  mapping_consistency_score: number;
  mapping_correlation_score: number;
  mapping_collision_score: number;
  mapping_critical_missing_score: number;
  mapping_identity_fragility_score: number;

  mapping_rupture_probability: number;
  mapping_continuity_probability: number;

  collision_detected: boolean;
  missing_critical_fields: boolean;
  warnings: string[];
};

export type MappingRfsResult = {
  provider: string;
  provider_version: string;

  count_in: number;
  count_valid: number;
  count_rejected: number;

  mapping_stability: number;
  mapping_regime: MappingRegime;
  mapping_structure_score: number;
  mapping_rupture_score: number;

  mapping_field_coverage_score: number;
  mapping_schema_alignment_score: number;
  mapping_null_pressure_score: number;
  mapping_rejection_pressure_score: number;
  mapping_consistency_score: number;
  mapping_correlation_score: number;
  mapping_collision_score: number;
  mapping_critical_missing_score: number;
  mapping_identity_fragility_score: number;

  mapping_identity_score: number;
  mapping_identity_convergence_score: number;
  mapping_identity_duration_score: number;

  mapping_rupture_probability: number;
  mapping_continuity_probability: number;

  assets: MappingRfsAssetResult[];
  warnings: string[];
};

type ProviderMappedAsset = CoinGeckoMappedAsset;

/* ============================================================================
 * 2. DATA PROCESSING — SAFE HELPERS
 * ========================================================================== */

function safeStr(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function normalizeId(value: unknown): string {
  return safeStr(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return clampScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function uniqueWarnings(...groups: Array<string[] | undefined | null>): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));

  return [
    ...new Set(
      merged.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      ),
    ),
  ];
}

/* ============================================================================
 * 3. DATA PROCESSING — FINGERPRINTS
 * ========================================================================== */

function buildIdentityFingerprint(input: {
  provider: string;
  provider_id: string | null;
  canonical_id: string;
  canonical_symbol: string;
}): string {
  return [
    input.provider,
    input.provider_id ?? "",
    input.canonical_id,
    input.canonical_symbol,
  ]
    .map((item) => item.toLowerCase())
    .join("|");
}

function buildMarketFingerprint(input: {
  provider: string;
  provider_id: string | null;
  canonical_id: string;
  canonical_symbol: string;
  quote_asset: string | null;
}): string {
  return [
    input.provider,
    input.provider_id ?? "",
    input.canonical_id,
    input.canonical_symbol,
    input.quote_asset ?? "",
  ]
    .map((item) => item.toLowerCase())
    .join("|");
}

/* ============================================================================
 * 4. DATA PROCESSING — IDENTITY RESOLUTION
 * ========================================================================== */

function resolveCanonicalIdentity(
  asset: ProviderMappedAsset,
): { identity: MappingIdentity | null; warnings: string[] } {
  const warnings: string[] = [];

  const canonicalId =
    safeStr(asset.canonical_id) ||
    safeStr(asset.provider_id) ||
    normalizeId(asset.canonical_symbol) ||
    normalizeId(asset.provider_symbol) ||
    normalizeId(asset.canonical_name) ||
    normalizeId(asset.provider_name);

  const canonicalSymbol =
    safeStr(asset.canonical_symbol).toUpperCase() ||
    safeStr(asset.provider_symbol).toUpperCase() ||
    safeStr(canonicalId).toUpperCase();

  const canonicalName =
    safeStr(asset.canonical_name) ||
    safeStr(asset.provider_name) ||
    canonicalSymbol ||
    canonicalId;

  const baseAsset =
    safeStr(asset.base_asset).toUpperCase() ||
    canonicalSymbol;

  const quoteAsset =
    safeStr(asset.quote_asset).toUpperCase() ||
    null;

  if (!canonicalId || !canonicalSymbol || !canonicalName || !baseAsset) {
    return {
      identity: null,
      warnings: ["mapping_identity_unusable"],
    };
  }

  if (!safeStr(asset.canonical_symbol) && !safeStr(asset.provider_symbol)) {
    warnings.push("mapping_symbol_fallback_used");
  }

  if (!safeStr(asset.canonical_id) && !safeStr(asset.provider_id)) {
    warnings.push("mapping_id_fallback_used");
  }

  const identity = {
    provider: asset.provider,
    provider_version: asset.provider_version,

    provider_id: asset.provider_id,
    provider_symbol: asset.provider_symbol,
    provider_name: asset.provider_name,

    canonical_id: canonicalId,
    canonical_symbol: canonicalSymbol,
    canonical_name: canonicalName,

    base_asset: baseAsset,
    quote_asset: quoteAsset,

    identity_fingerprint: buildIdentityFingerprint({
      provider: asset.provider,
      provider_id: asset.provider_id,
      canonical_id: canonicalId,
      canonical_symbol: canonicalSymbol,
    }),

    market_fingerprint: buildMarketFingerprint({
      provider: asset.provider,
      provider_id: asset.provider_id,
      canonical_id: canonicalId,
      canonical_symbol: canonicalSymbol,
      quote_asset: quoteAsset,
    }),
  } as MappingIdentity;

  return { identity, warnings };
}

/* ============================================================================
 * 5. DECISION — SCORING HELPERS
 * ========================================================================== */

function scoreFieldCoverage(asset: ProviderMappedAsset): number {
  const criticalFields = [
    asset.provider_id,
    asset.canonical_id,
    asset.canonical_symbol,
    asset.canonical_name,
  ];

  const importantFields = [
    asset.price,
    asset.rank,
    asset.market_cap,
    asset.volume_24h,
    asset.chg_24h_pct,
    asset.chg_7d_pct,
    asset.sparkline_7d,
    asset.logo_url,
  ];

  const criticalPresent = criticalFields.filter(
    (value) => safeStr(value).length > 0,
  ).length;

  const importantPresent = importantFields.filter(
    (value) => value !== null && value !== undefined,
  ).length;

  return clampScore(
    (criticalPresent / criticalFields.length) * 65 +
      (importantPresent / importantFields.length) * 35,
  );
}

function scoreSchemaAlignment(asset: ProviderMappedAsset): number {
  let score = 100;

  if (asset.price !== null && typeof asset.price !== "number") score -= 25;
  if (asset.chg_24h_pct !== null && typeof asset.chg_24h_pct !== "number") score -= 10;
  if (asset.chg_7d_pct !== null && typeof asset.chg_7d_pct !== "number") score -= 10;
  if (asset.market_cap !== null && typeof asset.market_cap !== "number") score -= 10;
  if (asset.volume_24h !== null && typeof asset.volume_24h !== "number") score -= 10;
  if (asset.rank !== null && typeof asset.rank !== "number") score -= 10;

  if (asset.sparkline_7d !== null && !Array.isArray(asset.sparkline_7d)) {
    score -= 15;
  }

  if (asset.logo_url !== null && typeof asset.logo_url !== "string") {
    score -= 5;
  }

  if (!safeStr(asset.binance_url)) score -= 5;
  if (!safeStr(asset.affiliate_url)) score -= 5;

  return clampScore(score);
}

function scoreNullPressure(asset: ProviderMappedAsset): number {
  const monitored = [
    asset.price,
    asset.chg_24h_pct,
    asset.chg_7d_pct,
    asset.market_cap,
    asset.volume_24h,
    asset.rank,
    asset.logo_url,
    asset.sparkline_7d,
  ];

  const nulls = monitored.filter(
    (value) => value === null || value === undefined,
  ).length;

  return clampScore((nulls / monitored.length) * 100);
}

function scoreIdentity(asset: ProviderMappedAsset): number {
  let score = 100;

  if (!safeStr(asset.canonical_id) && !safeStr(asset.provider_id)) score -= 25;
  if (!safeStr(asset.canonical_symbol) && !safeStr(asset.provider_symbol)) score -= 25;
  if (!safeStr(asset.canonical_name) && !safeStr(asset.provider_name)) score -= 20;
  if (!safeStr(asset.base_asset)) score -= 15;
  if (!safeStr(asset.quote_asset)) score -= 5;

  return clampScore(score);
}

function scoreIdentityConvergence(asset: ProviderMappedAsset): number {
  let score = 0;

  if (safeStr(asset.provider_id) && safeStr(asset.canonical_id)) score += 30;
  if (safeStr(asset.provider_symbol) && safeStr(asset.canonical_symbol)) score += 30;
  if (safeStr(asset.provider_name) && safeStr(asset.canonical_name)) score += 20;
  if (safeStr(asset.base_asset)) score += 10;
  if (safeStr(asset.quote_asset)) score += 10;

  return clampScore(score);
}

function scoreCriticalMissing(input: {
  identity: MappingIdentity;
  asset: ProviderMappedAsset;
}): number {
  let score = 0;

  if (!safeStr(input.identity.canonical_id)) score += 30;
  if (!safeStr(input.identity.canonical_symbol)) score += 30;
  if (!safeStr(input.identity.canonical_name)) score += 20;
  if (!safeStr(input.identity.base_asset)) score += 20;

  return clampScore(score);
}

function deriveMappingRegime(input: {
  mapping_stability: number;
  mapping_rupture_score: number;
}): MappingRegime {
  if (input.mapping_stability >= 75 && input.mapping_rupture_score <= 25) {
    return "STABLE";
  }

  if (input.mapping_stability < 45 || input.mapping_rupture_score >= 65) {
    return "VOLATILE";
  }

  return "TRANSITION";
}

/* ============================================================================
 * 6. DECISION — ASSET SCORING
 * ========================================================================== */

function buildAssetResult(input: {
  asset: ProviderMappedAsset;
  identity: MappingIdentity;
  identityWarnings: string[];
  collisionDetected: boolean;
}): MappingRfsAssetResult {
  const mappingFieldCoverageScore = scoreFieldCoverage(input.asset);
  const mappingSchemaAlignmentScore = scoreSchemaAlignment(input.asset);
  const mappingNullPressureScore = scoreNullPressure(input.asset);
  const mappingIdentityScore = scoreIdentity(input.asset);
  const mappingIdentityConvergenceScore = scoreIdentityConvergence(input.asset);
  const mappingIdentityDurationScore = 100;

  const mappingCollisionScore = input.collisionDetected ? 100 : 0;
  const mappingCriticalMissingScore = scoreCriticalMissing({
    identity: input.identity,
    asset: input.asset,
  });

  const mappingIdentityFragilityScore = clampScore(
    (100 - mappingIdentityScore) * 0.5 +
      mappingCriticalMissingScore * 0.3 +
      mappingCollisionScore * 0.2,
  );

  const mappingRejectionPressureScore = 0;

  const mappingConsistencyScore = clampScore(
    mappingFieldCoverageScore * 0.35 +
      mappingSchemaAlignmentScore * 0.35 +
      (100 - mappingNullPressureScore) * 0.3,
  );

  const mappingCorrelationScore = clampScore(
    mappingIdentityScore * 0.5 +
      mappingIdentityConvergenceScore * 0.5,
  );

  const mappingStructureScore = clampScore(
    mappingFieldCoverageScore * 0.25 +
      mappingSchemaAlignmentScore * 0.25 +
      mappingConsistencyScore * 0.2 +
      mappingCorrelationScore * 0.15 +
      (100 - mappingNullPressureScore) * 0.15,
  );

  const mappingRuptureScore = clampScore(
    (100 - mappingStructureScore) * 0.55 +
      mappingCollisionScore * 0.25 +
      mappingIdentityFragilityScore * 0.2,
  );

  const mappingStability = clampScore(
    mappingStructureScore * 0.4 +
      mappingIdentityScore * 0.2 +
      mappingIdentityConvergenceScore * 0.15 +
      mappingIdentityDurationScore * 0.1 +
      mappingConsistencyScore * 0.15,
  );

  const mappingRuptureProbability = clampScore(mappingRuptureScore);
  const mappingContinuityProbability = clampScore(100 - mappingRuptureScore);

  const mappingRegime = deriveMappingRegime({
    mapping_stability: mappingStability,
    mapping_rupture_score: mappingRuptureScore,
  });

  const missingCriticalFields = mappingCriticalMissingScore > 0;

  return {
    identity: input.identity,

    mapping_stability: mappingStability,
    mapping_regime: mappingRegime,
    mapping_structure_score: mappingStructureScore,
    mapping_rupture_score: mappingRuptureScore,

    mapping_identity_score: mappingIdentityScore,
    mapping_identity_convergence_score: mappingIdentityConvergenceScore,
    mapping_identity_duration_score: mappingIdentityDurationScore,

    mapping_field_coverage_score: mappingFieldCoverageScore,
    mapping_schema_alignment_score: mappingSchemaAlignmentScore,
    mapping_null_pressure_score: mappingNullPressureScore,
    mapping_rejection_pressure_score: mappingRejectionPressureScore,
    mapping_consistency_score: mappingConsistencyScore,
    mapping_correlation_score: mappingCorrelationScore,
    mapping_collision_score: mappingCollisionScore,
    mapping_critical_missing_score: mappingCriticalMissingScore,
    mapping_identity_fragility_score: mappingIdentityFragilityScore,

    mapping_rupture_probability: mappingRuptureProbability,
    mapping_continuity_probability: mappingContinuityProbability,

    collision_detected: input.collisionDetected,
    missing_critical_fields: missingCriticalFields,

    warnings: uniqueWarnings(
      input.identityWarnings,
      input.collisionDetected ? ["mapping_identity_collision"] : [],
      missingCriticalFields ? ["mapping_critical_fields_degraded"] : [],
    ),
  };
}

/* ============================================================================
 * 7. EXECUTION — PUBLIC RFS MAPPING
 * ========================================================================== */

export function runMappingRfs(
  mappedAssets: ProviderMappedAsset[],
): MappingRfsResult {
  const warnings: string[] = [];
  const resolved: Array<{
    asset: ProviderMappedAsset;
    identity: MappingIdentity;
    identityWarnings: string[];
  }> = [];

  const fingerprintCounts = new Map<string, number>();

  for (const asset of mappedAssets) {
    const { identity, warnings: identityWarnings } = resolveCanonicalIdentity(asset);

    if (!identity) {
      warnings.push(...identityWarnings);
      continue;
    }

    fingerprintCounts.set(
      identity.identity_fingerprint,
      (fingerprintCounts.get(identity.identity_fingerprint) ?? 0) + 1,
    );

    resolved.push({
      asset,
      identity,
      identityWarnings,
    });
  }

  const assets = resolved.map((item) =>
    buildAssetResult({
      asset: item.asset,
      identity: item.identity,
      identityWarnings: item.identityWarnings,
      collisionDetected:
        (fingerprintCounts.get(item.identity.identity_fingerprint) ?? 0) > 1,
    }),
  );

  const countIn = mappedAssets.length;
  const countValid = assets.length;
  const countRejected = Math.max(0, countIn - countValid);

  const mappingFieldCoverageScore = mean(
    assets.map((item) => item.mapping_field_coverage_score),
  );
  const mappingSchemaAlignmentScore = mean(
    assets.map((item) => item.mapping_schema_alignment_score),
  );
  const mappingNullPressureScore = mean(
    assets.map((item) => item.mapping_null_pressure_score),
  );
  const mappingConsistencyScore = mean(
    assets.map((item) => item.mapping_consistency_score),
  );
  const mappingCorrelationScore = mean(
    assets.map((item) => item.mapping_correlation_score),
  );
  const mappingIdentityScore = mean(
    assets.map((item) => item.mapping_identity_score),
  );
  const mappingIdentityConvergenceScore = mean(
    assets.map((item) => item.mapping_identity_convergence_score),
  );
  const mappingIdentityDurationScore = mean(
    assets.map((item) => item.mapping_identity_duration_score),
  );
  const mappingCollisionScore = mean(
    assets.map((item) => item.mapping_collision_score),
  );
  const mappingCriticalMissingScore = mean(
    assets.map((item) => item.mapping_critical_missing_score),
  );
  const mappingIdentityFragilityScore = mean(
    assets.map((item) => item.mapping_identity_fragility_score),
  );

  const mappingRejectionPressureScore =
    countIn > 0 ? clampScore((countRejected / countIn) * 100) : 100;

  const mappingStructureScore = clampScore(
    mappingFieldCoverageScore * 0.25 +
      mappingSchemaAlignmentScore * 0.25 +
      mappingConsistencyScore * 0.2 +
      mappingCorrelationScore * 0.1 +
      (100 - mappingNullPressureScore) * 0.1 +
      (100 - mappingRejectionPressureScore) * 0.1,
  );

  const mappingRuptureScore = clampScore(
    (100 - mappingStructureScore) * 0.5 +
      mappingCollisionScore * 0.2 +
      mappingCriticalMissingScore * 0.15 +
      mappingIdentityFragilityScore * 0.15,
  );

  const mappingStability = clampScore(
    mappingStructureScore * 0.4 +
      mappingIdentityScore * 0.2 +
      mappingIdentityConvergenceScore * 0.15 +
      mappingIdentityDurationScore * 0.1 +
      mappingConsistencyScore * 0.15,
  );

  const mappingRuptureProbability = clampScore(mappingRuptureScore);
  const mappingContinuityProbability = clampScore(100 - mappingRuptureScore);

  const mappingRegime = deriveMappingRegime({
    mapping_stability: mappingStability,
    mapping_rupture_score: mappingRuptureScore,
  });

  return {
    provider: assets[0]?.identity.provider ?? "unknown",
    provider_version: assets[0]?.identity.provider_version ?? "unknown",

    count_in: countIn,
    count_valid: assets.length,
    count_rejected: countRejected,

    mapping_stability: mappingStability,
    mapping_regime: mappingRegime,
    mapping_structure_score: mappingStructureScore,
    mapping_rupture_score: mappingRuptureScore,

    mapping_field_coverage_score: mappingFieldCoverageScore,
    mapping_schema_alignment_score: mappingSchemaAlignmentScore,
    mapping_null_pressure_score: mappingNullPressureScore,
    mapping_rejection_pressure_score: mappingRejectionPressureScore,
    mapping_consistency_score: mappingConsistencyScore,
    mapping_correlation_score: mappingCorrelationScore,
    mapping_collision_score: mappingCollisionScore,
    mapping_critical_missing_score: mappingCriticalMissingScore,
    mapping_identity_fragility_score: mappingIdentityFragilityScore,

    mapping_identity_score: mappingIdentityScore,
    mapping_identity_convergence_score: mappingIdentityConvergenceScore,
    mapping_identity_duration_score: mappingIdentityDurationScore,

    mapping_rupture_probability: mappingRuptureProbability,
    mapping_continuity_probability: mappingContinuityProbability,

    assets,

    warnings: uniqueWarnings(
      warnings,
      countRejected > 0 ? [`mapping_assets_rejected:${countRejected}`] : [],
      mappingCollisionScore > 0 ? ["mapping_collisions_detected"] : [],
      mappingRejectionPressureScore > 0
        ? ["mapping_rejection_pressure_detected"]
        : [],
    ),
  };
}
