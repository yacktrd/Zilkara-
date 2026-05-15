/* ============================================================================
 * FILE: lib/xyvala/zones/zones-builder.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public zones builder
 *
 * ROLE
 * - build deterministic descriptive price zones
 * - derive public context from observable public market fields only
 * - create public zones snapshots for cache reuse
 *
 * DIRECTIVES
 * - builder only
 * - no route logic
 * - no auth logic
 * - no quota logic
 * - no cache logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no decision exposure
 * - no regime exposure
 * - no opportunity exposure
 * - no stability score exposure
 * - no broker / affiliate exposure
 * - observable public market data only
 * - EUR-compatible public surface
 * ========================================================================== */

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

import type {
  Zone,
  ZonePosition,
  ZonesContext,
  ZonesSnapshotPublic,
} from "@/lib/xyvala/zones/zones-contract";

/* ============================================================================
 * 1. SAFE HELPERS
 * ========================================================================== */

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;

  return Math.max(min, Math.min(max, value));
}

/* ============================================================================
 * 2. PUBLIC CONTEXT
 * ========================================================================== */

export function computeZonesContext(asset?: ScanAsset | null): ZonesContext {
  const change24h = safeNumber(asset?.chg_24h_pct);
  const volume24h = safeNumber(asset?.volume_24h);
  const absoluteChange24h = Math.abs(change24h ?? 0);

  const volatilityState: ZonesContext["volatility_state"] =
    absoluteChange24h >= 12
      ? "EXTREME"
      : absoluteChange24h >= 5
        ? "ELEVATED"
        : "NORMAL";

  const liquidityState: ZonesContext["liquidity_state"] =
    volume24h !== null && volume24h > 0 ? "NORMAL" : "THIN";

  const movementState: ZonesContext["movement_state"] =
    change24h === null || Math.abs(change24h) < 0.25
      ? "NEUTRAL"
      : change24h > 0
        ? "POSITIVE"
        : "NEGATIVE";

  return {
    volatility_state: volatilityState,
    liquidity_state: liquidityState,
    movement_state: movementState,
  };
}

/* ============================================================================
 * 3. ZONE BUILDERS
 * ========================================================================== */

export function buildNeutralZone(input: {
  id: string;
  position: ZonePosition;
  referencePrice: number;
  lowMultiplier: number;
  highMultiplier: number;
  tags: string[];
}): Zone {
  const referencePrice = input.referencePrice > 0 ? input.referencePrice : 1;

  const rawLow = referencePrice * input.lowMultiplier;
  const rawHigh = referencePrice * input.highMultiplier;

  const low = round2(Math.min(rawLow, rawHigh));
  const high = round2(Math.max(rawLow, rawHigh));
  const midpoint = (low + high) / 2;

  const distanceFromPricePct = round2(
    ((midpoint - referencePrice) / referencePrice) * 100,
  );

  const widthPct = round2(((high - low) / referencePrice) * 100);

  return {
    id: input.id,
    position: input.position,
    range: {
      low,
      high,
    },
    distance_from_price_pct: distanceFromPricePct,
    width_pct: clamp(widthPct, 0, 100),
    tags: [...new Set(input.tags.filter((tag) => tag.trim().length > 0))],
  };
}

export function buildZonesFromPrice(input: {
  symbol: string;
  price: number;
}): Zone[] {
  const referencePrice = input.price > 0 ? input.price : 1;

  return [
    buildNeutralZone({
      id: `${input.symbol}_lower_band_1`,
      position: "LOWER_BAND",
      referencePrice,
      lowMultiplier: 0.965,
      highMultiplier: 0.98,
      tags: ["lower_band"],
    }),
    buildNeutralZone({
      id: `${input.symbol}_current_area`,
      position: "CURRENT_AREA",
      referencePrice,
      lowMultiplier: 0.99,
      highMultiplier: 1.01,
      tags: ["current_area"],
    }),
    buildNeutralZone({
      id: `${input.symbol}_upper_band_1`,
      position: "UPPER_BAND",
      referencePrice,
      lowMultiplier: 1.02,
      highMultiplier: 1.04,
      tags: ["upper_band"],
    }),
  ];
}

export function buildFallbackZones(symbol: string): Zone[] {
  return [
    {
      id: `${symbol}_fallback_current_area`,
      position: "CURRENT_AREA",
      range: {
        low: 0,
        high: 0,
      },
      distance_from_price_pct: 0,
      width_pct: 0,
      tags: ["fallback", "price_unavailable"],
    },
  ];
}

/* ============================================================================
 * 4. SNAPSHOT BUILDER
 * ========================================================================== */

export function buildZonesSnapshotPublic(input: {
  symbol: string;
  referencePrice: number | null;
  zones: Zone[];
  context: ZonesContext;
}): ZonesSnapshotPublic {
  return {
    ok: true,
    symbol: input.symbol,
    reference_price: safeNumber(input.referencePrice),
    zones: input.zones,
    context: input.context,
  };
}
