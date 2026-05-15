/* ============================================================================
 * FILE: scan-contract.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public scan contract
 *
 * ROLE
 * - define immutable public API contract for scan assets
 * - enforce deterministic, typed and audit-ready market outputs
 * - prevent any reconstruction of decision or scores in UI / API layers
 *
 * PARENT FILES
 * - lib/xyvala/services/scan-service.ts
 * - app/api/scan/route.ts
 * - app/api/summary/route.ts
 *
 * DIRECTIVES
 * - contract only (no logic)
 * - FR / EU compliant output
 * - EUR remains default outside this file
 * - no RFS / MCI recomputation here
 * - no calibration logic
 * - no UI logic
 * - undefined is forbidden
 * - nullable values must use null explicitly
 * - scores must follow *_score naming
 * - each critical field must expose a status
 * - deterministic structure required (same input => same output shape)
 *
 * INVARIANTS
 * - stability > regime > opportunity priority
 * - decision is always present (never null)
 * - sparkline must be non-empty
 * - all scores are clamped [0,100]
 * - no legacy fields allowed
 * ========================================================================== */

/* ============================================================================
 * 1. CORE ENUMS
 * ========================================================================== */

export type Decision = "ALLOW" | "WATCH" | "BLOCK";

export type Regime = "STABLE" | "TRANSITION" | "VOLATILE";

export type ScoreStatus =
  | "computed"
  | "degraded"
  | "insufficient_data"
  | "unavailable";

/* ============================================================================
 * 2. CORE STRUCTURES
 * ========================================================================== */

export type Sparkline = number[]; // must be non-empty

/* ============================================================================
 * 3. MAIN ASSET CONTRACT
 * ========================================================================== */

export type ScanAsset = {
  /* --------------------------------------------------------------------------
   * IDENTITY
   * -------------------------------------------------------------------------- */
  id: string;
  symbol: string;
  name: string;

  /* --------------------------------------------------------------------------
   * PRICE DATA
   * -------------------------------------------------------------------------- */
  price: number;
  chg_24h_pct: number;
  chg_7d_pct: number | null;

  /* --------------------------------------------------------------------------
   * STRUCTURE (RFS — PRIMARY)
   * -------------------------------------------------------------------------- */
  stability_score: number;
  stability_status: ScoreStatus;

  regime: Regime;

  /* --------------------------------------------------------------------------
   * DECISION LAYER (MCI)
   * -------------------------------------------------------------------------- */
  opportunity_score: number;
  opportunity_status: ScoreStatus;

  decision: Decision;

  /* --------------------------------------------------------------------------
   * MARKET DATA
   * -------------------------------------------------------------------------- */
  market_cap: number | null;
  volume_24h: number | null;

  sparkline_7d: Sparkline;

  /* --------------------------------------------------------------------------
   * META
   * -------------------------------------------------------------------------- */
  rank: number | null;
  logo_url: string | null;

  binance_url: string;
  affiliate_url: string;
};

/* ============================================================================
 * 4. RESPONSE CONTRACT
 * ========================================================================== */

export type ScanResponseSource = "scan" | "fallback";

export type ScanResponse = {
  ok: boolean;
  source: ScanResponseSource;
  data: ScanAsset[];
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 5. QUERY CONTRACT
 * ========================================================================== */

export type ScanSortKey = "stability" | "opportunity" | "price";
export type ScanSortOrder = "asc" | "desc";

export type ScanRequestQuery = {
  q?: string | null;
  sort?: ScanSortKey | string | null;
  order?: ScanSortOrder | string | null;
  limit?: number | null;
  quote?: string | null;
};
