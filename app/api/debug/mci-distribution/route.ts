/* ============================================================================
 * FILE: app/api/debug/mci-distribution/route.ts
 * ========================================================================== */

import { NextResponse } from "next/server";

import { getDecisionDistributionStoreStats } from "@/lib/xyvala/calibration/decision-distribution-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const stats = getDecisionDistributionStoreStats();

    return NextResponse.json(
      {
        ok: true,
        ts: new Date().toISOString(),
        source: "decision_distribution_store",
        stats,
        error: null,
      },
      {
        status: 200,
        headers: {
          "cache-control": "no-store",
          "x-xyvala-endpoint": "/api/debug/mci-distribution",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        ts: new Date().toISOString(),
        source: "decision_distribution_store",
        stats: null,
        error: "mci_distribution_read_failed",
      },
      {
        status: 500,
        headers: {
          "cache-control": "no-store",
          "x-xyvala-endpoint": "/api/debug/mci-distribution",
        },
      },
    );
  }
}
