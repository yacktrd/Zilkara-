/* ============================================================================
 * FILE: lib/xyvala/zones/zones-contract.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public zones contracts
 *
 * ROLE
 * - define public descriptive zone contracts
 * - isolate zones API contracts from route, cache, RFS, MCI and calibration
 * - prevent private analytical, regime, decision and opportunity leakage
 *
 * DIRECTIVES
 * - contracts only
 * - no runtime logic
 * - no RFS dependency
 * - no MCI dependency
 * - no calibration dependency
 * - no private decision exposure
 * - no regime exposure
 * - no opportunity exposure
 * - no stability score exposure
 * - no broker / affiliate exposure
 * - EUR-compatible public surface
 * - null means explicitly unavailable
 * ========================================================================== */

import type { Quote } from "@/lib/xyvala/snapshot";

/* ============================================================================
 * 1. CORE PUBLIC TYPES
 * ========================================================================== */

export type ZonesMarket = "crypto";

export type ZonesTimeframe = "AUTO" | "1H" | "4H" | "1D" | "1W";

export type ZonePosition =
  | "LOWER_BAND"
  | "CURRENT_AREA"
  | "UPPER_BAND";

/* ============================================================================
 * 2. PUBLIC ZONE
 * ========================================================================== */

export type Zone = {
  id: string;

  position: ZonePosition;

  range: {
    low: number;
    high: number;
  };

  distance_from_price_pct: number;

  width_pct: number;

  tags: string[];
};

/* ============================================================================
 * 3. PUBLIC CONTEXT
 * ========================================================================== */

export type ZonesContext = {
  volatility_state: "NORMAL" | "ELEVATED" | "EXTREME";

  liquidity_state: "NORMAL" | "THIN";

  movement_state: "NEGATIVE" | "NEUTRAL" | "POSITIVE";
};

/* ============================================================================
 * 4. SERVICE INPUT / META
 * ========================================================================== */

export type ZonesServiceInput = {
  symbol?: string | null;

  q?: string | null;

  market?: ZonesMarket | string | null;

  quote?: Quote | string | null;

  tf?: ZonesTimeframe | string | null;

  limit?: number | string | null;

  noStore?: boolean;
};

export type ZonesResponseMeta = {
  limit: number;

  cache: "hit" | "miss" | "no-store";

  warnings: string[];
};

/* ============================================================================
 * 5. PUBLIC RESPONSE
 * ========================================================================== */

export type ZonesResponse = {
  ok: boolean;

  ts: string;

  version: string;

  symbol: string;

  market: ZonesMarket;

  quote: Quote;

  tf: ZonesTimeframe;

  reference_price: number | null;

  zones: Zone[];

  context: ZonesContext;

  meta: ZonesResponseMeta;

  error: string | null;
};

/* ============================================================================
 * 6. PUBLIC SNAPSHOT
 * ========================================================================== */

export type ZonesSnapshotPublic = {
  ok: true;

  symbol: string;

  reference_price: number | null;

  zones: Zone[];

  context: ZonesContext;
};

/* ============================================================================
 * 7. NORMALIZED SERVICE PARAMETERS
 * ========================================================================== */

export type NormalizedZonesParams = {
  symbol: string;

  market: ZonesMarket;

  quote: Quote;

  tf: ZonesTimeframe;

  limit: number;

  noStore: boolean;
};
