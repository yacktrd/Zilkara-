/* ============================================================================
 * FILE: lib/xyvala/cache/snapshot-key.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical scan snapshot cache key
 *
 * ROLE
 * - provide the single deterministic cache key used by scan snapshot persistence
 * - prevent key divergence between rebuild, scan, summary and state services
 *
 * PARENT FILES
 * - lib/xyvala/cache/cache-core.ts
 * - lib/xyvala/snapshot.ts
 * - lib/xyvala/services/scan-snapshot-service.ts
 *
 * DIRECTIVES
 * - cache key factory only
 * - no route logic
 * - no scan sorting logic
 * - no pagination logic
 * - no search query logic
 * - no snapshot building
 * - no cache read/write
 * - no UI logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - deterministic output only
 * - same quote => same key
 *
 * INPUTS
 * - Quote
 *
 * OUTPUTS
 * - canonical scan snapshot cache key
 *
 * INVARIANTS
 * - rebuild, scan, summary and state must use the same key for the same quote
 * - snapshot identity must not depend on sort, order, limit or q
 * - quote is the only variable part besides the snapshot version
 * - EUR compatibility is preserved through Quote
 *
 * CRITICAL DEPENDENCIES
 * - XYVALA_SNAPSHOT_VERSION
 * - Quote
 *
 * SENSITIVE ZONES
 * - snapshot version
 * - quote normalization upstream
 * - cache key immutability
 * ========================================================================== */

import {
  XYVALA_SNAPSHOT_VERSION,
  type Quote,
} from "@/lib/xyvala/snapshot";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const CANONICAL_MARKET = "crypto" as const;
const CACHE_NAMESPACE = "xyvala:scan" as const;

/* ============================================================================
 * 2. CANONICAL KEY BUILDER
 * ========================================================================== */

export function buildCanonicalSnapshotKey(quote: Quote): string {
  return [
    CACHE_NAMESPACE,
    `v=${XYVALA_SNAPSHOT_VERSION}`,
    `market=${CANONICAL_MARKET}`,
    `quote=${quote}`,
  ].join(":");
}
