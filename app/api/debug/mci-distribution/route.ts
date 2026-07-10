/* ============================================================================
 * FILE: app/api/debug/mci-distribution/route.ts
 * ========================================================================== */

import { NextResponse } from "next/server";

import {
  readDecisionDistributionSamples,
} from "@/lib/xyvala/calibration/store/decision-distribution-store";

import {
  getDecisionDistributionStoreStats,
} from "@/lib/xyvala/calibration/store/decision-distribution-store";

import {
  getCalibrationState,
} from "@/lib/xyvala/calibration/decision-calibration-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const stats = getDecisionDistributionStoreStats();
    const samplesRead = readDecisionDistributionSamples({
  analytical_version: "v8",
  horizon: "7D",
  limit: 1000,
});

console.log(
  "[DEBUG_SAMPLE]",
  samplesRead.samples.slice(0, 3),
);

console.log("[DEBUG_READ]", {
  total: samplesRead.total,
  returned: samplesRead.returned,
  samples: samplesRead.samples.length,
});

    const calibrationState = getCalibrationState();

    return NextResponse.json(
      {
        ok: true,
        ts: new Date().toISOString(),
        source: "mci_distribution_debug",
        stats,
        calibration_state: calibrationState,
        diagnostics: {
          store_sample_count: stats.sample_count,
          calibration_state_available: calibrationState !== null,
          calibration_sample_size:
            calibrationState?.state?.summary?.sample_size ?? null,
          calibration_effective_sample_size:
            calibrationState?.state?.summary?.effective_sample_size ?? null,
          calibration_source:
            calibrationState?.state?.summary?.source ?? null,
        },
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
        source: "mci_distribution_debug",
        stats: null,
        calibration_state: null,
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
