/* ============================================================================
 * FILE: lib/xyvala/contracts/scan-contract.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public scan contract
 *
 * ROLE
 * - expose the stable public market-display contract
 * - define public scan request / response types
 * - prevent public leakage of private analytical, scoring, decision or broker data
 *
 * DIRECTIVES
 * - public ScanAsset is descriptive only
 * - no decision
 * - no regime
 * - no opportunity score
 * - no confidence score
 * - no stability score
 * - no rupture / crash / probability fields
 * - no internal ranking score
 * - no broker / affiliate fields
 * - undefined is forbidden
 * - null means explicitly unavailable
 * - number means confirmed observable value
 * - EUR remains the default public quote upstream
 *
 * INPUTS
 * - normalized public scan data
 * - public structure labels produced by the public structure layer
 *
 * OUTPUTS
 * - ScanAsset
 * - ScanResponse
 * - ScanRequestQuery
 *
 * INVARIANTS
 * - public contract remains minimal, descriptive and non-decisionnel
 * - public labels must remain descriptive market-structure labels
 * - public contract must not expose private RFS / MCI / calibration internals
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/public/public-structure.ts
 *
 * SENSITIVE ZONES
 * - public descriptive labels
 * - public scan limit
 * - private/public boundary
 * ========================================================================== */

import type {
  PublicActivityLabel,
  PublicSparklineContext7D,
  PublicStructureTransition,
} from "@/lib/xyvala/public/public-structure";

/* ============================================================================
 * 1. PUBLIC LIMITS
 * ========================================================================== */

export const PUBLIC_SCAN_LIMIT = 250;

/* ============================================================================
 * 2. PUBLIC ASSET CONTRACT
 * ========================================================================== */

export type ScanAsset = {
  id: string;
  symbol: string;
  name: string;

  price: number | null;
  chg_24h_pct: number | null;
  chg_7d_pct: number | null;

  market_cap: number | null;
  volume_24h: number | null;

  sparkline_7d: number[] | null;

  public_activity: PublicActivityLabel;
  public_sparkline_context_7d: PublicSparklineContext7D;
  public_structure_transition: PublicStructureTransition;

  rank: number | null;
  logo_url: string | null;
};

/* ============================================================================
 * 3. PUBLIC RESPONSE CONTRACT
 * ========================================================================== */

export type ScanResponseSource = "scan" | "fallback" | "cache";

export type ScanResponse = {
  ok: boolean;
  source: ScanResponseSource;
  data: ScanAsset[];
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 4. PUBLIC QUERY CONTRACT
 * ========================================================================== */

export type ScanSortKey =
  | "rank"
  | "price"
  | "market_cap"
  | "volume_24h"
  | "change_24h"
  | "change_7d";

export type ScanSortOrder = "asc" | "desc";

export type ScanRequestQuery = {
  q?: string | null;
  limit?: number | null;
  quote?: string | null;
  sort?: ScanSortKey | null;
  order?: ScanSortOrder | null;
};
