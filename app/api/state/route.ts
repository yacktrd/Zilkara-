

/*
FILE: route.ts

PARENTS:
- lib/state.ts
- lib/xyvala/contracts/scan-contract.ts
- lib/xyvala/snapshot.ts

SECTIONS:
1. Imports
2. Constants
3. Safe helpers
4. Route handler

DIRECTIVES:
- Expose simplified market state view
- No legacy fields allowed
- Aligned with current ScanAsset contract
- Keep output minimal, deterministic, and compatible with Xyvala API style
*/

import { NextResponse } from "next/server";
import { getStateData } from "@/lib/state";
import { XYVALA_SNAPSHOT_VERSION } from "@/lib/xyvala/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================
   2. CONSTANTS
========================= */

const ENDPOINT = "/api/state";

/* =========================
   3. SAFE HELPERS
========================= */

function nowIso(): string {
  return new Date().toISOString();
}

/* =========================
   4. ROUTE HANDLER
========================= */

export async function GET() {
  try {
    const data = await getStateData();

    return NextResponse.json(
      {
        ok: true,
        ts: nowIso(),
        version: XYVALA_SNAPSHOT_VERSION,
        count: data.length,
        data,
        error: null,
      },
      {
        status: 200,
        headers: {
          "cache-control": "no-store",
          "x-xyvala-version": XYVALA_SNAPSHOT_VERSION,
          "x-xyvala-endpoint": ENDPOINT,
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        ts: nowIso(),
        version: XYVALA_SNAPSHOT_VERSION,
        count: 0,
        data: [],
        error:
          error instanceof Error
            ? error.message
            : "state_route_unknown_error",
      },
      {
        status: 500,
        headers: {
          "cache-control": "no-store",
          "x-xyvala-version": XYVALA_SNAPSHOT_VERSION,
          "x-xyvala-endpoint": ENDPOINT,
        },
      },
    );
  }
}
