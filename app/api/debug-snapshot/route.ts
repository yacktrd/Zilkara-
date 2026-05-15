/* ============================================================================
 * FILE: app/api/debug-snapshot/route.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala debug snapshot route
 *
 * ROLE
 * - validate the current public ScanSnapshot contract
 * - expose a minimal deterministic debug response
 *
 * DIRECTIVES
 * - debug endpoint only
 * - public ScanAsset contract only
 * - no private scores
 * - no regime
 * - no decision
 * - no opportunity
 * - no broker / affiliate fields
 * - no legacy context field
 * - no RFS recomputation
 * - no MCI recomputation
 * ========================================================================== */

import { NextResponse } from "next/server";

import {
  isScanSnapshot,
  type ScanSnapshot,
  XYVALA_SNAPSHOT_VERSION,
} from "@/lib/xyvala/snapshot";


import { PUBLIC_SCAN_LIMIT } from "@/lib/xyvala/contracts/scan-contract";

import { buildPublicStructure } from "@/lib/xyvala/public/public-structure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ============================================================================
 * 1. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function buildDebugAsset(input: {
  id: string;
  rank: number;
  symbol: string;
  name: string;
  price: number;
  chg_24h_pct: number;
  chg_7d_pct: number;
  market_cap: number;
  volume_24h: number;
  sparkline_7d: number[];
}) {
  const publicStructure = buildPublicStructure({
    pct_24h: input.chg_24h_pct,
    pct_7d: input.chg_7d_pct,
    volume_24h: input.volume_24h,
    market_cap: input.market_cap,
    sparkline_7d: input.sparkline_7d,
  });

  return {
    id: input.id,
    rank: input.rank,
    symbol: input.symbol,
    name: input.name,
    logo_url: null,

    price: input.price,
    chg_24h_pct: input.chg_24h_pct,
    chg_7d_pct: input.chg_7d_pct,

    market_cap: input.market_cap,
    volume_24h: input.volume_24h,
    sparkline_7d: input.sparkline_7d,

    public_activity: publicStructure.activity,
    public_sparkline_context_7d: publicStructure.sparkline_context_7d,
    public_structure_transition: publicStructure.structure_transition,
  };
}

/* ============================================================================
 * 2. ROUTE HANDLER
 * ========================================================================== */

export async function GET() {
  const sample: unknown = {
    ok: true,
    ts: nowIso(),
    version: XYVALA_SNAPSHOT_VERSION,
    source: "scan",
    market: "crypto",
    quote: "eur",
    count: 2,
    data: [
      buildDebugAsset({
        id: "btc",
        rank: 1,
        symbol: "BTC",
        name: "Bitcoin",
        price: 64000,
        chg_24h_pct: 1.2,
        chg_7d_pct: 4.8,
        market_cap: 1260000000000,
        volume_24h: 31000000000,
        sparkline_7d: [61200, 61800, 62400, 62900, 63300, 63800, 64000],
      }),
      buildDebugAsset({
        id: "eth",
        rank: 2,
        symbol: "ETH",
        name: "Ethereum",
        price: 3200,
        chg_24h_pct: 0.8,
        chg_7d_pct: 3.1,
        market_cap: 385000000000,
        volume_24h: 14500000000,
        sparkline_7d: [3050, 3080, 3110, 3135, 3160, 3180, 3200],
      }),
    ],
    meta: {
      limit: PUBLIC_SCAN_LIMIT,
      sort: "rank",
      order: "asc",
      q: null,
      warnings: [],
    },
  };

     const snapshot: ScanSnapshot | null = isScanSnapshot(sample) ? sample : null;

  return NextResponse.json(
    {
      ok: snapshot !== null,
      ts: nowIso(),
      version: XYVALA_SNAPSHOT_VERSION,
      snapshot,
      error: snapshot ? null : "snapshot_normalization_failed",
    },
    {
      status: 200,
      headers: {
        "cache-control": "no-store",
        "x-xyvala-version": XYVALA_SNAPSHOT_VERSION,
        "x-xyvala-endpoint": "/api/debug-snapshot",
      },
    },
  );
}
