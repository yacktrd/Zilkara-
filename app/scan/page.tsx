/* ============================================================================
 * FILE: app/scan/page.tsx
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical public scan page
 *
 * ROLE
 * - read the canonical public scan service result
 * - pass validated public ScanAsset data to the scan interface
 * - keep route-level orchestration passive and minimal
 *
 * PARENTS
 * - lib/xyvala/services/scan-service.ts
 * - components/scan-table.tsx
 *
 * DIRECTIVES
 * - React Server Component only
 * - OBSERVE boundary only
 * - canonical scan service is the sole data source
 * - no provider acquisition
 * - no direct API call
 * - no direct cache access
 * - no snapshot reconstruction
 * - no fallback reconstruction
 * - no ScanAsset construction
 * - no public label reconstruction
 * - no local filtering
 * - no local sorting
 * - no local ranking
 * - no RFS recomputation
 * - no Triple Layer recomputation
 * - no Impulse Layer recomputation
 * - no Analytical Aggregation recomputation
 * - no MCI recomputation
 * - no calibration recomputation
 * - no private analytical exposure
 * - no mutation
 * - EUR remains the default quote
 * - deterministic output only
 *
 * INPUTS
 * - canonical page defaults:
 *   - quote
 *   - scan universe limit
 *
 * OUTPUTS
 * - server-rendered public scan page
 * - immutable public ScanAsset collection passed to ScanTable
 *
 * INVARIANTS
 * - ScanTable always receives an array
 * - the page never creates analytical truth
 * - the page never alters public ScanAsset values
 * - an unavailable snapshot produces an explicit empty interface state
 * - service warnings and errors are not silently reinterpreted
 * - same service result => same rendered component props
 *
 * CRITICAL DEPENDENCIES
 * - getScan()
 * - ScanTable
 *
 * SENSITIVE ZONES
 * - service-to-page contract boundary
 * - empty-state propagation
 * - public/private isolation
 * ========================================================================== */

import ScanTable from "@/components/scan-table";

import {
  getScan,
  type ScanServiceResult,
} from "@/lib/xyvala/services/scan-service";

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

/* ============================================================================
 * 1. RUNTIME CONFIG
 * ========================================================================== */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ============================================================================
 * 2. PAGE CONFIG
 * ========================================================================== */

const DEFAULT_QUOTE = "eur" as const;
const CANONICAL_SCAN_LIMIT = 250;

/* ============================================================================
 * 3. CONTRACT HELPERS
 * ========================================================================== */

function resolvePublicAssets(
  result: ScanServiceResult,
): readonly ScanAsset[] {
  if (!result.ok) {
    return [];
  }

  return Array.isArray(result.data)
    ? result.data
    : [];
}

/* ============================================================================
 * 4. PAGE
 * ========================================================================== */

export default async function ScanPage() {
  const result = await getScan({
    quote: DEFAULT_QUOTE,
    limit: CANONICAL_SCAN_LIMIT,
  });

if (process.env.NODE_ENV !== "production") {
  console.log("XYVALA_SCAN_PAGE_RESULT", {
    ok: result.ok,
    source: result.source,
    quote: result.quote,
    count: result.count,
    total: result.total,
    warnings: result.warnings,
    error: result.error,
    data_is_array: Array.isArray(result.data),
    data_length: Array.isArray(result.data)
      ? result.data.length
      : null,
  });
}

  const assets = resolvePublicAssets(result);

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6 sm:py-8">
      <ScanTable
        assets={assets}
        quote={DEFAULT_QUOTE}
        limit={CANONICAL_SCAN_LIMIT}
      />
    </main>
  );
}
