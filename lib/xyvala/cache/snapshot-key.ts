/* ============================================================================
 * FILE: lib/xyvala/cache/snapshot-key.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical snapshot cache key
 *
 * PARENT FILES
 * - lib/xyvala/cache/cache-core.ts
 * - lib/xyvala/snapshot.ts
 *
 * ROLE
 * - provide one deterministic canonical cache key for scan snapshots
 * - prevent rebuild / scan / state key divergence
 *
 * DIRECTIVES
 * - one source of truth
 * - no route logic
 * - no snapshot building
 * - no UI logic
 * - deterministic output only
 * - same quote => same canonical snapshot key
 *
 * INPUTS
 * - Quote
 *
 * OUTPUTS
 * - canonical snapshot cache key string
 *
 * INVARIANTS
 * - snapshot key must be shared by rebuild and scan-service
 * - no local reconstruction of snapshot key elsewhere
 * - EUR-compatible quote handling preserved
 *
 * CRITICAL DEPENDENCIES
 * - scanKey
 * - XYVALA_SNAPSHOT_VERSION
 *
 * SENSITIVE ZONES
 * - canonical limit
 * - quote consistency
 * - snapshot version consistency
 * ========================================================================== */

import { scanKey } from "@/lib/xyvala/cache/cache-core";
import {
  XYVALA_SNAPSHOT_VERSION,
  type Quote,
} from "@/lib/xyvala/snapshot";

const CANONICAL_MARKET = "crypto" as const;
const CANONICAL_SORT = "stability" as const;
const CANONICAL_ORDER = "desc" as const;
const CANONICAL_LIMIT = 250;
const CANONICAL_Q = null;

export function buildCanonicalSnapshotKey(quote: Quote): string {
  return scanKey({
    version: XYVALA_SNAPSHOT_VERSION,
    market: CANONICAL_MARKET,
    quote,
    sort: CANONICAL_SORT,
    order: CANONICAL_ORDER,
    limit: CANONICAL_LIMIT,
    q: CANONICAL_Q,
  });
}
