/* ============================================================================
 * FILE: app/api/debug/governance/route.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala private governance debug endpoint
 *
 * ROLE
 * - expose local-only governance diagnostics
 * - read governance registry, store and health summaries
 * - validate governance observability without exposing private analytical values
 *
 * DIRECTIVES
 * - debug route only
 * - local development only
 * - no production exposure
 * - no public analytical scores
 * - no decision exposure
 * - no calibration exposure
 * - no threshold exposure
 * - no private payload exposure
 * - no RFS recomputation
 * - no MCI recomputation
 * - no mutation
 * - no event bus
 * - no cache write
 * - no UI logic
 * - no-store response
 * ========================================================================== */

import { NextResponse } from "next/server";

import {
  buildGovernanceRegistrySnapshot,
} from "@/lib/xyvala/governance/governance-registry";

import {
  getGovernanceStoreSnapshot,
} from "@/lib/xyvala/governance/governance-store";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ============================================================================
 * 2. HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function responseHeaders() {
  return {
    "cache-control": "no-store",
    "x-xyvala-endpoint": "/api/debug/governance",
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

export async function GET() {
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
    const registry = buildGovernanceRegistrySnapshot();
    const store = getGovernanceStoreSnapshot();

    const latest = store.latest;

    return json(
      {
        ok: registry.ok && store.ok,
        ts: nowIso(),

        registry: {
          ok: registry.ok,
          version: registry.version,
          component_count: registry.component_count,
          active_count: registry.active_count,
          observe_count: registry.observe_count,
          compute_count: registry.compute_count,
          mutate_count: registry.mutate_count,
          critical_risk_count: registry.critical_risk_count,
          warnings: registry.warnings,
          error: registry.error,
        },

        store: {
          ok: store.ok,
          count: store.count,
          latest: latest
            ? {
                record_id: latest.record_id,
                recorded_at: latest.recorded_at,
                kind: latest.kind,
                status: latest.status,
                ok: latest.ok,
                warnings: latest.warnings,
              }
            : null,
          warnings: store.warnings,
        },

        governance_state:
          latest?.ok === true && registry.ok
            ? "observable"
            : store.count > 0
              ? "degraded"
              : "empty",

        warnings: [
          ...registry.warnings,
          ...store.warnings,
          ...(store.count === 0 ? ["governance_store_empty"] : []),
        ],

        error:
          registry.ok && store.ok
            ? null
            : "governance_debug_unhealthy",
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
            : "governance_debug_unknown_error",
      },
      500,
    );
  }
}
