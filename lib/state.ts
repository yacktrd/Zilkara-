/* ============================================================================
 * FILE: lib/state.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public state dataset
 *
 * ROLE
 * - expose a minimal deterministic public state dataset
 * - stay aligned with the public ScanAsset contract
 * - prevent private analytical or decision fields from leaking into public state
 *
 * DIRECTIVES
 * - public state only
 * - no private decision exposure
 * - no regime exposure
 * - no opportunity exposure
 * - no stability score exposure
 * - no broker / affiliate exposure
 * - no business logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - EUR-compatible public surface
 * - null means explicitly unavailable
 * ========================================================================== */

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";
import { buildPublicStructure } from "@/lib/xyvala/public/public-structure";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type StateAsset = Pick<
  ScanAsset,
  | "rank"
  | "symbol"
  | "name"
  | "logo_url"
  | "price"
  | "chg_24h_pct"
  | "chg_7d_pct"
  | "market_cap"
  | "volume_24h"
  | "sparkline_7d"
  | "public_activity"
  | "public_sparkline_context_7d"
  | "public_structure_transition"
>;

/* ============================================================================
 * 2. STATE BUILDERS
 * ========================================================================== */

function buildStateAsset(input: {
  id: string;
  rank: number | null;
  symbol: string;
  name: string;
  logo_url: string | null;
  price: number | null;
  chg_24h_pct: number | null;
  chg_7d_pct: number | null;
  market_cap: number | null;
  volume_24h: number | null;
  sparkline_7d: number[] | null;
}): ScanAsset {
  const publicStructure = buildPublicStructure({
    pct_24h: input.chg_24h_pct,
    pct_7d: input.chg_7d_pct,
    volume_24h: input.volume_24h,
    market_cap: input.market_cap,
    sparkline_7d: input.sparkline_7d,
  });

  return {
    ...input,
    public_activity: publicStructure.activity,
    public_sparkline_context_7d: publicStructure.sparkline_context_7d,
    public_structure_transition: publicStructure.structure_transition,
  };
}

/* ============================================================================
 * 3. STATE DATASET
 * ========================================================================== */

const STATE_DATA: ReadonlyArray<ScanAsset> = [
  buildStateAsset({
    id: "btc",
    rank: 1,
    symbol: "BTC",
    name: "Bitcoin",
    logo_url: null,

    price: 64000,
    chg_24h_pct: 2.1,
    chg_7d_pct: 4.6,

    market_cap: null,
    volume_24h: null,
    sparkline_7d: null,
  }),
];

/* ============================================================================
 * 4. PUBLIC STATE API
 * ========================================================================== */

export async function getStateData(): Promise<StateAsset[]> {
  return STATE_DATA.map((asset) => ({
    rank: asset.rank,
    symbol: asset.symbol,
    name: asset.name,
    logo_url: asset.logo_url,
    price: asset.price,
    chg_24h_pct: asset.chg_24h_pct,
    chg_7d_pct: asset.chg_7d_pct,
    market_cap: asset.market_cap,
    volume_24h: asset.volume_24h,
    sparkline_7d: asset.sparkline_7d,
    public_activity: asset.public_activity,
    public_sparkline_context_7d: asset.public_sparkline_context_7d,
    public_structure_transition: asset.public_structure_transition,
  }));
}
