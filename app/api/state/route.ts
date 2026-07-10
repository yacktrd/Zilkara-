/* ============================================================================
 * FILE: app/api/state/route.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public market state route
 *
 * ROLE
 * - expose public aggregated market state from canonical scan snapshot
 * - keep route passive and aligned with state-service
 *
 * DIRECTIVES
 * - route orchestration only
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no private analytical exposure
 * - no legacy state source
 * - no UI logic
 * ========================================================================== */

import { NextResponse } from "next/server";

import {
  getStateService,
} from "@/lib/xyvala/services/state-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function responseHeaders() {
  return {
    "cache-control": "no-store",
    "x-xyvala-endpoint": "/api/state",
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const quote = url.searchParams.get("quote");
    const noStore = url.searchParams.get("no_store") === "1";

    const result = await getStateService({
      quote,
      noStore,
    });

    return NextResponse.json(result, {
      status: result.ok ? 200 : 503,
      headers: responseHeaders(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        ts: new Date().toISOString(),
        version: "v1",
        source: "fallback",
        quote: "eur",
        state: null,
        warnings: ["state_route_failed"],
        error:
          error instanceof Error && error.message
            ? error.message
            : "state_route_unknown_error",
      },
      {
        status: 500,
        headers: responseHeaders(),
      },
    );
  }
}
