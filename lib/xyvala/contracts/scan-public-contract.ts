/* ============================================================================
 * FILE: lib/xyvala/contracts/scan-public-contract.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public scan contract
 *
 * ROLE
 * - define public scan asset fields exposed to routes and public product views
 * - expose only market-reading data
 * - prevent decision, regime, behavior and broker leakage
 *
 * DIRECTIVES
 * - public contract only
 * - no decision fields
 * - no regime fields
 * - no opportunity / behavior fields for now
 * - no broker / affiliation fields
 * - no hidden logic
 * - no personalized financial advice
 * - undefined is forbidden
 * - null means explicitly unavailable
 * - number means confirmed observable value
 * ========================================================================== */

export type PublicScoreStatus =
  | "computed"
  | "insufficient_data"
  | "unavailable";

export type PublicScanAsset = {
  id: string;
  symbol: string;
  name: string;

  price: number | null;
  chg_24h_pct: number | null;
  chg_7d_pct: number | null;

  market_cap: number | null;
  volume_24h: number | null;

  stability_score: number | null;
  stability_status: PublicScoreStatus;

  sparkline_7d: number[] | null;

  rank: number | null;
  logo_url: string | null;
};

export type PublicScanResponseSource = "scan" | "fallback" | "cache";

export type PublicScanResponse = {
  ok: boolean;
  source: PublicScanResponseSource;
  data: PublicScanAsset[];
  warnings: string[];
  error: string | null;
};

export type PublicScanSortKey = "price";

export type PublicScanSortOrder = "desc";

export type PublicScanRequestQuery = {
  q?: string | null;
  limit?: number | null;
  quote?: string | null;
};
