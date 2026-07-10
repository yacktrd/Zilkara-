/* ============================================================================
 * FILE: app/api/debug/traceability-runtime/route.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private traceability runtime debug route
 *
 * ROLE
 * - execute a local-only traceability runtime validation
 * - verify PrivateScanAsset propagation through traceability governance
 * - expose a minimal private diagnostic payload for development validation
 *
 * DIRECTIVES
 * - debug route only
 * - local development only
 * - no public exposure
 * - no investment advice
 * - no decision exposure
 * - no ALLOW / WATCH / BLOCK exposure
 * - no private score exposure
 * - no calibration exposure
 * - no threshold exposure
 * - no broker / affiliate exposure
 * - no UI logic
 * - no RFS recomputation inside this route
 * - no MCI recomputation inside this route
 * - no cache write
 * - no event bus
 * - no runtime mutation
 * - no-store response
 *
 * INPUTS
 * - optional quote search parameter
 *
 * OUTPUTS
 * - private debug traceability runtime summary
 *
 * INVARIANTS
 * - route must remain unavailable in production
 * - route returns summaries only
 * - private analytical payloads remain hidden
 * - traceability runtime test is used only for validation
 * ========================================================================== */

import { NextResponse } from "next/server";

import type { Quote } from "@/lib/xyvala/snapshot";

import {
  runTraceabilityDebugValidation,
} from "@/lib/xyvala/services/traceability-debug-service";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_QUOTE: Quote = "eur";

/* ============================================================================
 * 2. HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeQuote(value: string | null): Quote {
  if (value === "usd") return "usd";
  if (value === "usdt") return "usdt";

  return DEFAULT_QUOTE;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function responseHeaders() {
  return {
    "cache-control": "no-store",
    "x-xyvala-endpoint": "/api/debug/traceability-runtime",
    "x-xyvala-debug": "1",
  };
}

function json(payload: unknown, status: number): NextResponse {
  return NextResponse.json(payload, {
    status,
    headers: responseHeaders(),
  });
}

/* ============================================================================
 * 3. ROUTE HANDLER
 * ========================================================================== */

export async function GET(req: Request) {
  if (isProduction()) {
    return json(
      {
        ok: false,
        ts: nowIso(),
        error: "debug_route_disabled_in_production",
      },
      404,
    );
  }

  try {
    const url = new URL(req.url);
    const quote = normalizeQuote(url.searchParams.get("quote"));

    const result = await runTraceabilityDebugValidation({
      quote,
    });

    return json(
  {
    ts: nowIso(),
    ...result,
  },
  200,
);
  } catch (error) {
    return json(
      {
        ok: false,
        ts: nowIso(),
        error:
          error instanceof Error && error.message
            ? error.message
            : "traceability_runtime_debug_unknown_error",
      },
      500,
    );
  }
}
