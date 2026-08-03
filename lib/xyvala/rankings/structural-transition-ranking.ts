/* ============================================================================
 * FILE: lib/xyvala/rankings/structural-transition-ranking.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public structural transition ranking
 *
 * ROLE
 * - build the official deterministic ranking of public structural transitions
 * - rank the complete validated public asset universe
 * - organize already propagated public truths without analytical recomputation
 * - provide reusable ranked outputs for services, APIs and passive interfaces
 *
 * PARENTS
 * - lib/xyvala/contracts/scan-contract.ts
 * - lib/xyvala/public/public-structure.ts
 * - lib/xyvala/rankings/ranking-core.ts
 * - lib/xyvala/services/scan-transformer.ts
 * - lib/xyvala/services/scan-service.ts
 *
 * DIRECTIVES
 * - public ranking layer only
 * - complete supplied asset universe must remain rankable
 * - no Market Structure Ranking eligibility restriction
 * - no search-based eligibility restriction
 * - no pagination-based eligibility restriction
 * - no UI-based eligibility restriction
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no decision logic
 * - no opportunity logic
 * - no confidence logic
 * - no private score usage
 * - no private probability usage
 * - no transition reconstruction
 * - no impulse reconstruction
 * - no analytical score creation
 * - no UI logic
 * - no API shaping
 * - no persistence
 * - no cache mutation
 * - no runtime mutation
 * - deterministic output only
 * - same input + same policy version => same ranking
 *
 * INPUTS
 * - validated public ScanAsset items
 * - propagated public_structure_transition
 * - propagated public_impulse_context
 * - propagated public_activity
 * - canonical public asset identity
 *
 * OUTPUTS
 * - complete ordered structural transition ranking
 * - optional limited ranking projection
 * - explicit ranking positions
 * - explicit ranking validation report
 *
 * INVARIANTS
 * - rankings organize existing public truths only
 * - rankings never create analytical truth
 * - rankings never alter source values
 * - rankings never mutate source arrays
 * - rankings never mutate source items
 * - every supplied asset remains eligible
 * - market rank never determines eligibility
 * - market capitalization never determines eligibility
 * - volume never determines eligibility
 * - missing public values remain explicitly unavailable
 * - unavailable never becomes neutral
 * - canonical identity must be present and unique
 * - ranking priorities remain ordering policy only
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/rankings/ranking-core.ts
 * - lib/xyvala/contracts/scan-contract.ts
 * - lib/xyvala/public/public-structure.ts
 *
 * SENSITIVE ZONES
 * - structural transition ordering policy
 * - impulse context tie-breaking policy
 * - activity tie-breaking policy
 * - canonical identity resolution
 * - complete-universe preservation
 * - public-only field usage
 * ========================================================================== */

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

import type {
  PublicActivityLabel,
  PublicImpulseContext,
  PublicStructureTransition,
} from "@/lib/xyvala/public/public-structure";

import {
  buildDeterministicRanking,
  compareByPriority,
  compareByString,
  composeRankingComparators,
  normalizeRankingString,
  type RankedItem,
  type RankingComparator,
  type RankingValidationReport,
} from "@/lib/xyvala/rankings/ranking-core";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type StructuralTransitionRankingPolicyVersion = "1.0.0";

export type StructuralTransitionRankableAsset = Readonly<
  Pick<
    ScanAsset,
    | "id"
    | "symbol"
    | "public_activity"
    | "public_structure_transition"
    | "public_impulse_context"
  >
>;

export type StructuralTransitionRankingEntry = RankedItem<
  StructuralTransitionRankableAsset
>;

export type StructuralTransitionRankingResult = {
  policy_version: StructuralTransitionRankingPolicyVersion;

  validation: RankingValidationReport;

  data: StructuralTransitionRankableAsset[];
  ranked: StructuralTransitionRankingEntry[];

  total: number;
  returned: number;
};

/* ============================================================================
 * 2. POLICY VERSION
 * ========================================================================== */

export const STRUCTURAL_TRANSITION_RANKING_POLICY_VERSION:
  StructuralTransitionRankingPolicyVersion = "1.0.0";

/* ============================================================================
 * 3. OFFICIAL ORDERING POLICY
 * ----------------------------------------------------------------------------
 * These values define deterministic ordering only.
 *
 * They are not:
 * - analytical scores
 * - market scores
 * - opportunity scores
 * - confidence scores
 * - decision scores
 *
 * They must never be exposed as analytical truths.
 *
 * Unavailable remains rankable to preserve the complete supplied universe,
 * but always receives the lowest structural-transition priority.
 * ========================================================================== */

const STRUCTURAL_TRANSITION_PRIORITY: Readonly<
  Record<PublicStructureTransition, number>
> = Object.freeze({
  "Fragmentation Detected": 7,
  "Compression Phase": 6,
  "Active Expansion": 5,
  "Expansion Phase": 4,
  "Recovery Structure": 3,
  "Stable Structure": 2,
  "Neutral Structure": 1,
  Unavailable: 0,
});

const IMPULSE_CONTEXT_PRIORITY: Readonly<
  Record<PublicImpulseContext, number>
> = Object.freeze({
  Exhaustion: 6,
  Release: 5,
  "Pressure Building": 4,
  Compression: 3,
  Neutral: 2,
  Unavailable: 1,
});

const ACTIVITY_PRIORITY: Readonly<
  Record<PublicActivityLabel, number>
> = Object.freeze({
  High: 4,
  Normal: 3,
  Low: 2,
  Unavailable: 1,
});

/* ============================================================================
 * 4. SAFE NORMALIZERS
 * ----------------------------------------------------------------------------
 * Normalizers accept canonical public values only.
 *
 * Missing, invalid or non-canonical values remain explicitly unavailable.
 * They must never be converted into neutral analytical states.
 * ========================================================================== */

function normalizePublicStructureTransition(
  value: unknown,
): PublicStructureTransition {
  switch (value) {
    case "Fragmentation Detected":
    case "Compression Phase":
    case "Active Expansion":
    case "Expansion Phase":
    case "Recovery Structure":
    case "Stable Structure":
    case "Neutral Structure":
    case "Unavailable":
      return value;

    default:
      return "Unavailable";
  }
}

function normalizePublicImpulseContext(
  value: unknown,
): PublicImpulseContext {
  switch (value) {
    case "Exhaustion":
    case "Release":
    case "Pressure Building":
    case "Compression":
    case "Neutral":
    case "Unavailable":
      return value;

    default:
      return "Unavailable";
  }
}

function normalizePublicActivity(
  value: unknown,
): PublicActivityLabel {
  switch (value) {
    case "High":
    case "Normal":
    case "Low":
    case "Unavailable":
      return value;

    default:
      return "Unavailable";
  }
}

/* ============================================================================
 * 5. CANONICAL IDENTITY
 * ========================================================================== */

function resolveCanonicalAssetIdentity(
  asset: StructuralTransitionRankableAsset,
): string {
  const id = normalizeRankingString(asset.id);

  if (id.length > 0) {
    return id;
  }

  return normalizeRankingString(
    asset.symbol,
  ).toUpperCase();
}

/* ============================================================================
 * 6. OFFICIAL COMPARATOR
 * ----------------------------------------------------------------------------
 * Ordering hierarchy:
 *
 * 1. propagated public structural transition
 * 2. propagated public impulse context
 * 3. propagated public activity
 * 4. canonical public symbol
 * 5. canonical asset identity from ranking-core
 *
 * Market rank, market capitalization and volume are deliberately excluded.
 *
 * The Structural Transition Ranking therefore remains independent from:
 *
 * - Market Structure Ranking
 * - Activity Ranking
 * - Liquidity Ranking
 * - user-selected table sorting
 * - interface search
 * - interface pagination
 * ========================================================================== */

export const compareStructuralTransitionAssets: RankingComparator<
  StructuralTransitionRankableAsset
> = composeRankingComparators(
  compareByPriority(
    (asset) =>
      normalizePublicStructureTransition(
        asset.public_structure_transition,
      ),
    STRUCTURAL_TRANSITION_PRIORITY,
    "desc",
  ),

  compareByPriority(
    (asset) =>
      normalizePublicImpulseContext(
        asset.public_impulse_context,
      ),
    IMPULSE_CONTEXT_PRIORITY,
    "desc",
  ),

  compareByPriority(
    (asset) =>
      normalizePublicActivity(
        asset.public_activity,
      ),
    ACTIVITY_PRIORITY,
    "desc",
  ),

  compareByString(
    (asset) =>
      normalizeRankingString(
        asset.symbol,
      ).toUpperCase(),
    "asc",
  ),
);

/* ============================================================================
 * 7. COMPLETE STRUCTURAL TRANSITION RANKING
 * ========================================================================== */

export function rankStructuralTransitions(
  assets: readonly StructuralTransitionRankableAsset[],
  options: {
    limit?: number;
    startAt?: number;
  } = {},
): StructuralTransitionRankingResult {
  const rankingInput = {
    items: assets,
    comparator: compareStructuralTransitionAssets,
    canonicalKey: resolveCanonicalAssetIdentity,

    ...(typeof options.limit === "number"
      ? { limit: options.limit }
      : {}),

    ...(typeof options.startAt === "number"
      ? { startAt: options.startAt }
      : {}),
  };

  const ranking =
    buildDeterministicRanking(
      rankingInput,
    );

  return {
    policy_version:
      STRUCTURAL_TRANSITION_RANKING_POLICY_VERSION,

    validation: ranking.validation,

    data: ranking.ordered,
    ranked: ranking.ranked,

    total: assets.length,
    returned: ranking.ordered.length,
  };
}

/* ============================================================================
 * 8. HIGHLIGHT PROJECTION
 * ----------------------------------------------------------------------------
 * This helper limits the governed ranking result.
 *
 * It does not:
 * - define ranking priorities
 * - alter ranking order
 * - filter by market rank
 * - filter by market capitalization
 * - filter by volume
 * - reconstruct transitions
 * ========================================================================== */

export function getStructuralTransitionHighlights(
  assets: readonly StructuralTransitionRankableAsset[],
  limit = 3,
): StructuralTransitionRankingResult {
  return rankStructuralTransitions(
    assets,
    {
      limit,
      startAt: 1,
    },
  );
}

/* ============================================================================
 * 9. VALIDATION READER
 * ========================================================================== */

export function isStructuralTransitionRankingValid(
  result: StructuralTransitionRankingResult,
): boolean {
  return result.validation.valid;
}
