/* ============================================================================
 * FILE: lib/xyvala/contracts/scan-ui-contract.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala UI scan contract
 *
 * ROLE
 * - define stable UI-facing scan asset fields
 * - isolate React components from backend/public contract changes
 * - keep UI rendering deterministic and minimal
 *
 * DIRECTIVES
 * - UI contract only
 * - no engine fields
 * - no decision fields
 * - no regime fields
 * - no opportunity / behavior fields for now
 * - no broker / affiliation fields
 * - no recomputation
 * - null means explicitly unavailable
 * - UI displays only already-prepared values
 * ========================================================================== */

export type UiQuote = "EUR" | "USD" | "USDT";

export type UiStabilityStatus =
  | "computed"
  | "insufficient_data"
  | "unavailable";

export type UiScanAsset = {
  key: string;
  id: string;

  symbol: string;
  name: string;

  price: number | null;
  pct24h: number | null;
  pct7d: number | null;

  stability_score: number | null;
  stability_status: UiStabilityStatus;

  stability_label: string;

  sparkline_7d: number[] | null;

  rank: number | null;
  logo_url: string | null;
};

export type UiScanTableProps = {
  assets: UiScanAsset[];
  quote: UiQuote;
  limit: number;
};
