/* ============================================================================
 * FILE: lib/xyvala/adapters/snapshot-adapter.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private snapshot adapter
 *
 * ROLE
 * - adapt legacy snapshot payloads into PrivateScanAsset contracts
 * - preserve compatibility with historical snapshot entries
 * - isolate transport migration from scan service and public contracts
 * - preserve canonical snapshot governance metadata
 *
 * CLASSIFICATION
 * - PRIVATE ADAPTER
 * - OBSERVE
 * - no COMPUTE
 * - no MUTATE
 *
 * DIRECTIVES
 * - adapter only
 * - no RFS logic
 * - no MCI logic
 * - no scoring recomputation
 * - no public API exposure
 * - no UI logic
 * - no business interpretation
 * - no broker / affiliation exposure
 * - no legacy fields in output
 * - no local timestamp generation
 * - no implicit analytical version
 * - no implicit source reconstruction
 * - null means explicitly unavailable
 * - same input => same output shape
 *
 * INVARIANTS
 * - output is PrivateScanAsset[]
 * - public ScanAsset is not built here
 * - private/public projection must happen in a dedicated transformer
 * - undefined is never intentionally propagated
 * - snapshot version comes from the snapshot boundary
 * - snapshot timestamp comes from the snapshot boundary
 * - snapshot source is explicitly identified as snapshot
 * - same snapshot batch uses the same governance context
 * ========================================================================== */

import {
  buildPrivateScanAsset,
} from "@/lib/xyvala/factories/scan-asset-factory";

import type {
  PrivateScanAsset,
} from "@/lib/xyvala/contracts/scan-private-contract";

/* ============================================================================
 * 1. LEGACY SNAPSHOT INPUT CONTRACT
 * ========================================================================== */

type LegacySnapshotAsset = {
  id?: string | null;
  symbol?: string | null;
  name?: string | null;

  price?: number | null;
  chg_24h_pct?: number | null;
  chg_7d_pct?: number | null;

  market_cap?: number | null;
  volume_24h?: number | null;

  stability_score?: number | null;
  opportunity_score?: number | null;
  confidence_score?: number | null;

  score_delta?: number | null;
  score_trend?: string | null;

  stability_label?: "Low" | "Medium" | "High" | null;
  consistency_score?: number | null;

  regime?: string | null;
  decision?: string | null;

  sparkline_7d?: number[] | null;

  rank?: number | null;
  logo_url?: string | null;

  warnings?: string[] | null;

  binance_url?: string | null;
  affiliate_url?: string | null;
};

/* ============================================================================
 * 2. SNAPSHOT GOVERNANCE CONTRACT
 * ----------------------------------------------------------------------------
 * Governance metadata is supplied by the snapshot boundary.
 *
 * The adapter must not:
 * - generate generated_at
 * - invent analytical_version
 * - infer another source
 * ========================================================================== */

export type SnapshotAdapterGovernanceContext = {
  analytical_version: string;
  generated_at: string;
  source: "snapshot";
};

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function safeNumber(
  value: unknown,
): number | null {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  )
    ? value
    : null;
}

function clampScore(
  value: number,
): number {
  return (
    Math.round(
      Math.max(
        0,
        Math.min(
          100,
          value,
        ),
      ) * 100,
    ) / 100
  );
}

function normalizeSparkline(
  value: unknown,
): number[] | null {
  if (
    !Array.isArray(value)
  ) {
    return null;
  }

  const points =
    value.filter(
      (item): item is number =>
        typeof item === "number" &&
        Number.isFinite(item),
    );

  return points.length >= 2
    ? points
    : null;
}

function normalizeWarnings(
  value: unknown,
): string[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return [
    ...new Set(
      value
        .filter(
          (item): item is string =>
            typeof item === "string" &&
            item.trim().length > 0,
        )
        .map(
          (item) =>
            item.trim(),
        ),
    ),
  ];
}

/* ============================================================================
 * 4. MIGRATION FALLBACKS
 * ========================================================================== */

function deriveStabilityScore(
  asset: LegacySnapshotAsset,
): number | null {
  const direct =
    safeNumber(
      asset.stability_score,
    );

  if (
    direct !== null
  ) {
    return clampScore(
      direct,
    );
  }

  const legacyConfidence =
    safeNumber(
      asset.confidence_score,
    );

  if (
    legacyConfidence !== null
  ) {
    return clampScore(
      legacyConfidence,
    );
  }

  return null;
}

function deriveOpportunityScore(
  asset: LegacySnapshotAsset,
): number | null {
  const direct =
    safeNumber(
      asset.opportunity_score,
    );

  if (
    direct !== null
  ) {
    return clampScore(
      direct,
    );
  }

  const legacyDelta =
    safeNumber(
      asset.score_delta,
    );

  if (
    legacyDelta !== null
  ) {
    return clampScore(
      legacyDelta,
    );
  }

  return null;
}

/* ============================================================================
 * 5. SNAPSHOT ASSET NORMALIZATION
 * ========================================================================== */

export function normalizeSnapshotAsset(
  asset: LegacySnapshotAsset,
  governance: SnapshotAdapterGovernanceContext,
): PrivateScanAsset {
  return buildPrivateScanAsset({
    id:
      asset.id,

    symbol:
      asset.symbol,

    name:
      asset.name,

    price:
      asset.price,

    chg_24h_pct:
      asset.chg_24h_pct,

    chg_7d_pct:
      asset.chg_7d_pct,

    market_cap:
      asset.market_cap,

    volume_24h:
      asset.volume_24h,

    stability_score:
      deriveStabilityScore(
        asset,
      ),

    regime:
      asset.regime,

    rupture_score:
      null,

    rupture_probability:
      null,

    continuity_probability:
      null,

    crash_score:
      null,

    opportunity_score:
      deriveOpportunityScore(
        asset,
      ),

    confidence_score:
      asset.confidence_score,

    decision:
      asset.decision,

    sparkline_7d:
      normalizeSparkline(
        asset.sparkline_7d,
      ),

    rank:
      asset.rank,

    logo_url:
      asset.logo_url,

    analytical_version:
      governance.analytical_version,

    generated_at:
      governance.generated_at,

    source:
      governance.source,

    warnings:
      normalizeWarnings(
        asset.warnings,
      ),
  });
}

/* ============================================================================
 * 6. SNAPSHOT BATCH NORMALIZATION
 * ----------------------------------------------------------------------------
 * ROLE
 * - extract legacy asset arrays from supported snapshot transports
 * - preserve adapter-only responsibility
 * - propagate one governance context to the complete batch
 * - never reconstruct analytical truth
 * ========================================================================== */

function extractSnapshotAssets(
  data: unknown,
): unknown[] {
  if (
    Array.isArray(data)
  ) {
    return data;
  }

  if (
    typeof data !== "object" ||
    data === null
  ) {
    return [];
  }

  const record =
    data as {
      data?: unknown;
      assets?: unknown;
      snapshot?: unknown;
    };

  if (
    Array.isArray(
      record.data,
    )
  ) {
    return record.data;
  }

  if (
    Array.isArray(
      record.assets,
    )
  ) {
    return record.assets;
  }

  if (
    typeof record.snapshot === "object" &&
    record.snapshot !== null
  ) {
    const snapshot =
      record.snapshot as {
        data?: unknown;
        assets?: unknown;
      };

    if (
      Array.isArray(
        snapshot.data,
      )
    ) {
      return snapshot.data;
    }

    if (
      Array.isArray(
        snapshot.assets,
      )
    ) {
      return snapshot.assets;
    }
  }

  return [];
}

export function normalizeSnapshotData(
  data: unknown,
  governance: SnapshotAdapterGovernanceContext,
): PrivateScanAsset[] {
  const assets =
    extractSnapshotAssets(
      data,
    );

  return assets.map(
    (item) =>
      normalizeSnapshotAsset(
        item as LegacySnapshotAsset,
        governance,
      ),
  );
}
