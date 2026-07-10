/* ============================================================================
 * FILE: app/api/debug/impulse-distribution/route.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private impulse distribution debug endpoint
 *
 * ROLE
 * - expose impulse calibration distribution diagnostics
 * - read impulse distribution runtime store
 * - support local technical validation of adaptive impulse calibration
 *
 * DIRECTIVES
 * - debug endpoint only
 * - read-only route
 * - no mutation
 * - no persistence
 * - no recalculation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration rebuild
 * - no public product dependency
 * - no investment advice
 * - no broker exposure
 * - no affiliate exposure
 * - deterministic response only
 *
 * INPUTS
 * - impulse distribution in-memory store
 *
 * OUTPUTS
 * - impulse distribution diagnostics
 * - adaptive policy metadata
 * - sample size
 * - warnings
 *
 * INVARIANTS
 * - route reads only
 * - route never computes market structure
 * - route never modifies runtime state
 * - unavailable data is explicit
 * ========================================================================== */

import { NextResponse } from "next/server";

import {
  getImpulseDistributionSampleSize,
  getImpulseDistributionWarnings,
  readImpulseDistributionSnapshot,
} from "@/lib/xyvala/calibration/impulse-distribution-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ============================================================================
 * 1. RESPONSE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function headers(): Record<string, string> {
  return {
    "cache-control": "no-store",
    "x-xyvala-endpoint": "/api/debug/impulse-distribution",
    "x-xyvala-debug": "1",
  };
}

function json(payload: unknown, status = 200): NextResponse {
  return NextResponse.json(payload, {
    status,
    headers: headers(),
  });
}

/* ============================================================================
 * 2. ROUTE HANDLER
 * ========================================================================== */

export async function GET() {
  try {
    const snapshot = readImpulseDistributionSnapshot();
    const state = null;
    const warnings = getImpulseDistributionWarnings();
    const sampleSize = getImpulseDistributionSampleSize();

    return json({
      ok: true,
      ts: nowIso(),
      source: "impulse-distribution-store",
      sample_size: sampleSize,
      state,
      snapshot,
      warnings,
      error: null,
    });
  } catch (error) {
    return json(
      {
        ok: false,
        ts: nowIso(),
        source: "impulse-distribution-store",
        sample_size: 0,
        state: null,
        snapshot: null,
        warnings: ["impulse_distribution_debug_route_failed"],
        error:
          error instanceof Error && error.message
            ? error.message
            : "impulse_distribution_debug_unknown_error",
      },
      500,
    );
  }
}
