/* ============================================================================
 * FILE: lib/xyvala/services/scan-snapshot-service.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala canonical scan snapshot persistence service
 *
 * ROLE
 * - centralize canonical public scan snapshot read / write operations
 * - persist validated passive ScanSnapshot payloads into cache
 * - prevent cache key divergence between rebuild, scan, summary and state services
 *
 * PARENTS
 * - lib/xyvala/cache/cache-core.ts
 * - lib/xyvala/cache/snapshot-key.ts
 * - lib/xyvala/snapshot.ts
 *
 * DIRECTIVES
 * - snapshot persistence service only
 * - no API response building
 * - no UI logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no provider parsing
 * - no market data transformation
 * - write only validated ScanSnapshot contracts
 * - read only validated ScanSnapshot contracts
 * - canonical key must come from buildCanonicalSnapshotKey
 * - deterministic output only
 *
 * INPUTS
 * - Quote
 * - ScanSnapshot
 * - optional write TTL
 *
 * OUTPUTS
 * - ScanSnapshotReadResult
 * - ScanSnapshotWriteResult
 * - ScanSnapshotClearResult
 *
 * INVARIANTS
 * - buildCanonicalSnapshotKey is the single source of truth
 * - invalid snapshots are never persisted
 * - invalid cached payloads are treated as unavailable
 * - read does not apply local TTL logic
 * - undefined never leaks
 * - null means explicitly unavailable
 * ========================================================================== */

import {
  deleteFromCache,
  getFromCache,
  setToCache,
} from "@/lib/xyvala/cache/cache-core";

import { buildCanonicalSnapshotKey } from "@/lib/xyvala/cache/snapshot-key";

import {
  isScanSnapshot,
  type Quote,
  type ScanSnapshot,
} from "@/lib/xyvala/snapshot";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const DEFAULT_SNAPSHOT_RETENTION_MS = 604_800_000;
const DEFAULT_SNAPSHOT_FRESHNESS_MS = 300_000;

/* ============================================================================
 * 2. TYPES
 * ========================================================================== */

export type ScanSnapshotReadResult = {
  ok: boolean;
  key: string;
  snapshot: ScanSnapshot | null;
  warnings: string[];
  error: string | null;
};

export type ScanSnapshotWriteResult = {
  ok: boolean;
  key: string;
  snapshot_saved: boolean;
  count: number;
  warnings: string[];
  error: string | null;
};

export type ScanSnapshotClearResult = {
  ok: boolean;
  key: string;
  deleted: boolean;
  warnings: string[];
  error: string | null;
};

export type WriteScanSnapshotInput = {
  quote: Quote;
  snapshot: ScanSnapshot;
  ttl_ms?: number;
};

export type ReadScanSnapshotInput = {
  quote: Quote;
};

export type ClearScanSnapshotInput = {
  quote: Quote;
};

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function normalizeTtlMs(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : DEFAULT_SNAPSHOT_RETENTION_MS;
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  return [
    ...new Set(
      groups
        .flatMap((group) => (Array.isArray(group) ? group : []))
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        ),
    ),
  ];
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/* ============================================================================
 * 4. KEY RESOLUTION
 * ========================================================================== */

export function getCanonicalScanSnapshotKey(quote: Quote): string {
  return buildCanonicalSnapshotKey(quote);
}

/* ============================================================================
 * 5. SNAPSHOT WRITE
 * ========================================================================== */

export async function writeScanSnapshot(
  input: WriteScanSnapshotInput,
): Promise<ScanSnapshotWriteResult> {
  const key = getCanonicalScanSnapshotKey(input.quote);

  const ttlMs = normalizeTtlMs(
    input.ttl_ms ?? DEFAULT_SNAPSHOT_RETENTION_MS,
  );

  if (!isScanSnapshot(input.snapshot)) {
    return {
      ok: false,
      key,
      snapshot_saved: false,
      count: 0,
      warnings: ["scan_snapshot_write_invalid_contract"],
      error: "scan_snapshot_invalid",
    };
  }

  if (input.snapshot.quote !== input.quote) {
    return {
      ok: false,
      key,
      snapshot_saved: false,
      count: input.snapshot.count,
      warnings: ["scan_snapshot_write_quote_mismatch"],
      error: "scan_snapshot_quote_mismatch",
    };
  }

  try {
    await setToCache(
      key,
      input.snapshot,
      ttlMs,
    );

    return {
      ok: true,
      key,
      snapshot_saved: true,
      count: input.snapshot.count,
      warnings: uniqueWarnings(
        input.snapshot.meta?.warnings,
      ),
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      key,
      snapshot_saved: false,
      count: input.snapshot.count,
      warnings: ["scan_snapshot_write_failed"],
      error: errorMessage(
        error,
        "scan_snapshot_write_failed",
      ),
    };
  }
}

/* ============================================================================
 * 6. SNAPSHOT READ
 * ========================================================================== */

export async function readScanSnapshot(
  input: ReadScanSnapshotInput,
): Promise<ScanSnapshotReadResult> {
  const key = getCanonicalScanSnapshotKey(input.quote);

  try {
    const raw = await getFromCache<unknown>(key);

    if (!isScanSnapshot(raw)) {
      return {
        ok: false,
        key,
        snapshot: null,
        warnings: ["scan_snapshot_cache_miss_or_invalid"],
        error: "scan_snapshot_unavailable",
      };
    }

    return {
      ok: true,
      key,
      snapshot: raw,
      warnings: uniqueWarnings(raw.meta?.warnings),
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      key,
      snapshot: null,
      warnings: ["scan_snapshot_read_failed"],
      error: errorMessage(error, "scan_snapshot_read_failed"),
    };
  }
}

/* ============================================================================
 * 7. SNAPSHOT CLEAR
 * ========================================================================== */

export async function clearScanSnapshot(
  input: ClearScanSnapshotInput,
): Promise<ScanSnapshotClearResult> {
  const key = getCanonicalScanSnapshotKey(input.quote);

  try {
    const deleted = await deleteFromCache(key);

    return {
      ok: true,
      key,
      deleted,
      warnings: [],
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      key,
      deleted: false,
      warnings: ["scan_snapshot_clear_failed"],
      error: errorMessage(error, "scan_snapshot_clear_failed"),
    };
  }
}
