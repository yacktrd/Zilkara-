/* ============================================================================
 * FILE: app/api/debug/governance-health/route.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala governance health debug endpoint
 *
 * ROLE
 * - expose governance health diagnostics
 * - aggregate governance health, registry and store status
 * - provide local observability for governance validation
 *
 * DIRECTIVES
 * - debug route only
 * - observe layer only
 * - no mutation
 * - no persistence
 * - no event publication
 * - no cache write
 * - no RFS computation
 * - no MCI computation
 * - no calibration computation
 * - no private analytical exposure
 * - local development only
 *
 * INVARIANTS
 * - governance remains read only
 * - health report remains source of truth
 * - registry remains observable
 * - store remains observable
 * ========================================================================== */

import { NextResponse } from "next/server";

import {
  buildGovernanceHealthReport,
} from "@/lib/xyvala/governance/governance-health-report";

import {
  buildGovernanceRegistrySnapshot,
} from "@/lib/xyvala/governance/governance-registry";

import {
  getGovernanceStoreSnapshot,
} from "@/lib/xyvala/governance/governance-store";

/* ============================================================================
 * CONFIG
 * ========================================================================== */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ============================================================================
 * HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function responseHeaders(): HeadersInit {
  return {
    "cache-control": "no-store",
    "x-xyvala-debug": "governance-health",
  };
}

/* ============================================================================
 * ROUTE
 * ========================================================================== */

export async function GET() {
  if (isProduction()) {
    return NextResponse.json(
      {
        ok: false,
        ts: nowIso(),
        error: "debug_route_disabled_in_production",
      },
      {
        status: 404,
        headers: responseHeaders(),
      },
    );
  }

  try {
    const health = buildGovernanceHealthReport();
    const registry = buildGovernanceRegistrySnapshot();
    const store = getGovernanceStoreSnapshot();

    return NextResponse.json(
      {
        ok:
          health.ok &&
          registry.ok &&
          store.ok,

        ts: nowIso(),

        governance_health: {
          ok: health.ok,
          status: health.status,
          severity: health.severity,
          warnings: health.warnings,
          error: health.error,
        },

        registry: {
          ok: registry.ok,
          version: registry.version,
          component_count: registry.component_count,
          active_count: registry.active_count,
          warnings: registry.warnings,
          error: registry.error,
        },

        store: {
          ok: store.ok,
          count: store.count,
          warnings: store.warnings,
        },

        summary: {
          compliance_status:
            health.ok &&
            registry.ok &&
            store.ok
              ? "HEALTHY"
              : "DEGRADED",
        },
      },
      {
        status: 200,
        headers: responseHeaders(),
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        ts: nowIso(),
        error:
          error instanceof Error
            ? error.message
            : "governance_health_route_unknown_error",
      },
      {
        status: 500,
        headers: responseHeaders(),
      },
    );
  }
}
