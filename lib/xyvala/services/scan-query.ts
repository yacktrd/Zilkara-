/* ============================================================================
 * FILE: lib/xyvala/services/scan-query.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public scan query utilities
 *
 * ROLE
 * - normalize public scan query parameters
 * - apply deterministic search, sort, limit and pagination on public scan items
 * - isolate query logic from scan orchestration, routes, providers and builders
 *
 * PARENTS
 * - lib/xyvala/contracts/scan-contract.ts
 * - lib/xyvala/services/scan-service.ts
 * - lib/xyvala/assets/assets-query.ts
 *
 * DIRECTIVES
 * - public query utilities only
 * - descriptive public fields only
 * - no decision logic
 * - no regime logic
 * - no opportunity logic
 * - no stability score logic
 * - no private analytical fields
 * - no cache logic
 * - no snapshot logic
 * - no RFS recomputation
 * - no MCI recomputation
 * - deterministic output only
 * ========================================================================== */

export type ScanSortKey =
  | "rank"
  | "price"
  | "market_cap"
  | "volume_24h"
  | "change_24h"
  | "change_7d";

export type ScanSortOrder = "asc" | "desc";

export type QueryableScanItem = {
  id?: string | null;
  symbol: string;
  name?: string | null;
  rank?: number | null;
  price?: number | null;
  market_cap?: number | null;
  volume_24h?: number | null;
  chg_24h_pct?: number | null;
  chg_7d_pct?: number | null;
};

export type NormalizedScanQuery = {
  q: string | null;
  sort: ScanSortKey;
  order: ScanSortOrder;
  limit: number;
  cursor: number;
};

const DEFAULT_SORT: ScanSortKey = "rank";
const DEFAULT_ORDER: ScanSortOrder = "asc";
const MAX_LIMIT = 250;
const DEFAULT_LIMIT = MAX_LIMIT;

/* ============================================================================
 * 1. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeLower(value: unknown): string {
  return safeString(value).toLowerCase();
}

function safeNumber(value: unknown, fallback = -1): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeRank(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : Number.POSITIVE_INFINITY;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;

  return Math.max(min, Math.min(max, value));
}

/* ============================================================================
 * 2. NORMALIZATION
 * ========================================================================== */

export function normalizeScanSearch(value: unknown): string | null {
  const q = safeLower(value);
  return q.length > 0 ? q : null;
}

export function normalizeScanSort(value: unknown): ScanSortKey {
  const sort = safeLower(value);

  if (sort === "price") return "price";
  if (sort === "market_cap") return "market_cap";
  if (sort === "marketcap") return "market_cap";
  if (sort === "volume") return "volume_24h";
  if (sort === "volume_24h") return "volume_24h";
  if (sort === "chg_24h") return "change_24h";
  if (sort === "change_24h") return "change_24h";
  if (sort === "chg_7d") return "change_7d";
  if (sort === "change_7d") return "change_7d";
  if (sort === "rank") return "rank";

  return DEFAULT_SORT;
}

export function normalizeScanOrder(value: unknown): ScanSortOrder {
  const order = safeLower(value);

  if (order === "desc") return "desc";
  if (order === "asc") return "asc";

  return DEFAULT_ORDER;
}

export function normalizeScanLimit(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }

  return clamp(Math.trunc(parsed), 1, MAX_LIMIT);
}

export function normalizeScanCursor(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.trunc(parsed);
}

export function normalizeScanQuery(input: {
  q?: unknown;
  sort?: unknown;
  order?: unknown;
  limit?: unknown;
  cursor?: unknown;
}): NormalizedScanQuery {
  return {
    q: normalizeScanSearch(input.q),
    sort: normalizeScanSort(input.sort),
    order: normalizeScanOrder(input.order),
    limit: normalizeScanLimit(input.limit),
    cursor: normalizeScanCursor(input.cursor),
  };
}

/* ============================================================================
 * 3. SEARCH
 * ========================================================================== */

export function applyScanSearch<T extends QueryableScanItem>(
  items: readonly T[],
  q: string | null,
): T[] {
  const needle = normalizeScanSearch(q);

  if (!needle) {
    return [...items];
  }

  return items.filter((item) => {
    const id = safeLower(item.id);
    const symbol = safeLower(item.symbol);
    const name = safeLower(item.name);

    return (
      id.includes(needle) ||
      symbol.includes(needle) ||
      name.includes(needle)
    );
  });
}

/* ============================================================================
 * 4. SORT
 * ========================================================================== */

function getSortValue(item: QueryableScanItem, sort: ScanSortKey): number {
  if (sort === "price") return safeNumber(item.price);
  if (sort === "market_cap") return safeNumber(item.market_cap);
  if (sort === "volume_24h") return safeNumber(item.volume_24h);
  if (sort === "change_24h") return safeNumber(item.chg_24h_pct);
  if (sort === "change_7d") return safeNumber(item.chg_7d_pct);

  return safeRank(item.rank);
}

function tieBreak<T extends QueryableScanItem>(left: T, right: T): number {
  const rankDelta = safeRank(left.rank) - safeRank(right.rank);

  if (rankDelta !== 0) {
    return rankDelta;
  }

  const marketCapDelta =
    safeNumber(right.market_cap) - safeNumber(left.market_cap);

  if (marketCapDelta !== 0) {
    return marketCapDelta;
  }

  const volumeDelta =
    safeNumber(right.volume_24h) - safeNumber(left.volume_24h);

  if (volumeDelta !== 0) {
    return volumeDelta;
  }

  return safeString(left.symbol).localeCompare(safeString(right.symbol));
}

export function sortScanItems<T extends QueryableScanItem>(
  items: readonly T[],
  sort: ScanSortKey,
  order: ScanSortOrder,
): T[] {
  const normalizedSort = normalizeScanSort(sort);
  const normalizedOrder = normalizeScanOrder(order);

  return [...items].sort((left, right) => {
    const leftValue = getSortValue(left, normalizedSort);
    const rightValue = getSortValue(right, normalizedSort);

    if (leftValue !== rightValue) {
      return normalizedOrder === "asc"
        ? leftValue - rightValue
        : rightValue - leftValue;
    }

    return tieBreak(left, right);
  });
}

/* ============================================================================
 * 5. LIMIT / PAGINATION
 * ========================================================================== */

export function limitScanItems<T>(items: readonly T[], limit: number): T[] {
  const safeLimit =
    typeof limit === "number" && Number.isFinite(limit)
      ? Math.max(0, Math.trunc(limit))
      : 0;

  return [...items].slice(0, safeLimit);
}

export function paginateScanItems<T>(
  items: readonly T[],
  cursor: number,
  limit: number,
): {
  data: T[];
  total: number;
  nextCursor: string | null;
} {
  const safeCursor = normalizeScanCursor(cursor);

  const safeLimit =
    typeof limit === "number" && Number.isFinite(limit) && limit > 0
      ? Math.trunc(limit)
      : items.length;

  const end = Math.min(items.length, safeCursor + safeLimit);

  return {
    data: [...items].slice(safeCursor, end),
    total: items.length,
    nextCursor: end < items.length ? String(end) : null,
  };
}

/* ============================================================================
 * 6. PIPELINE
 * ========================================================================== */

export function queryScanItems<T extends QueryableScanItem>(
  items: readonly T[],
  query: NormalizedScanQuery,
): {
  data: T[];
  total: number;
  nextCursor: string | null;
} {
  const searched = applyScanSearch(items, query.q);
  const sorted = sortScanItems(searched, query.sort, query.order);

  return paginateScanItems(sorted, query.cursor, query.limit);
}

/* ============================================================================
 * 7. LABEL
 * ========================================================================== */

export function buildSortLabel(
  sort: ScanSortKey,
  order: ScanSortOrder,
): string {
  return `${normalizeScanSort(sort)}:${normalizeScanOrder(order)}`;
}
