
/* ============================================================================
 * FILE: lib/xyvala/services/scan-result-builder.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala scan result builder
 *
 * ROLE
 * - build contract-safe scan service results
 * - isolate result shaping from scan orchestration
 *
 * DIRECTIVES
 * - no decision logic
 * - no snapshot reading
 * - no cache logic
 * - deterministic output only
 * ========================================================================== */

export type ScanResultBuilderInput<T> = {
  ok: boolean;
  ts: string;
  version: string;
  source: string;
  market: string;
  quote: string;
  count: number;
  total: number;
  data: T[];
  warnings: string[];
  error: string | null;
  meta: {
    q: string | null;
    sort: string;
    order: string;
    limit: number;
  };
};

export function buildScanResult<T>(
  input: ScanResultBuilderInput<T>,
): ScanResultBuilderInput<T> {
  return {
    ok: input.ok,
    ts: input.ts,
    version: input.version,
    source: input.source,
    market: input.market,
    quote: input.quote,
    count: input.count,
    total: input.total,
    data: input.data,
    warnings: input.warnings,
    error: input.error,
    meta: input.meta,
  };
}

export function buildUnavailableScanResult<T>(input: {
  ts: string;
  version: string;
  source: string;
  market: string;
  quote: string;
  q: string | null;
  sort: string;
  order: string;
  limit: number;
  warnings: string[];
}): ScanResultBuilderInput<T> {
  return buildScanResult<T>({
    ok: false,
    ts: input.ts,
    version: input.version,
    source: input.source,
    market: input.market,
    quote: input.quote,
    count: 0,
    total: 0,
    data: [],
    warnings: input.warnings,
    error: "scan_snapshot_unavailable",
    meta: {
      q: input.q,
      sort: input.sort,
      order: input.order,
      limit: input.limit,
    },
  });
}

export function buildEmptyScanResult<T>(input: {
  ts: string;
  version: string;
  source: string;
  market: string;
  quote: string;
  q: string | null;
  sort: string;
  order: string;
  limit: number;
  warnings: string[];
}): ScanResultBuilderInput<T> {
  return buildScanResult<T>({
    ok: true,
    ts: input.ts,
    version: input.version,
    source: input.source,
    market: input.market,
    quote: input.quote,
    count: 0,
    total: 0,
    data: [],
    warnings: input.warnings,
    error: null,
    meta: {
      q: input.q,
      sort: input.sort,
      order: input.order,
      limit: input.limit,
    },
  });
}
