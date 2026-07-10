/* ============================================================================
 * FILE: lib/xyvala/rankings/ranking-core.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala deterministic ranking core
 *
 * ROLE
 * - provide shared deterministic ranking primitives
 * - centralize stable comparison and tie-breaking rules
 * - validate canonical identities before ranking
 * - preserve already validated analytical truths without recomputation
 *
 * PARENTS
 * - lib/xyvala/contracts/scan-contract.ts
 * - lib/xyvala/snapshot.ts
 * - lib/xyvala/transformers/
 *
 * DIRECTIVES
 * - ranking infrastructure only
 * - no analytical truth creation
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no decision logic
 * - no private score exposure
 * - no UI logic
 * - no API logic
 * - no persistence
 * - no cache mutation
 * - no runtime mutation
 * - deterministic output only
 * - same input + same comparator => same output
 * - source arrays and source items remain unchanged
 *
 * INPUTS
 * - already validated and transformed public items
 * - explicit ranking comparators
 * - explicit canonical identity selectors
 *
 * OUTPUTS
 * - deterministically ordered item copies
 * - optional ranking positions
 * - input validation reports
 *
 * INVARIANTS
 * - rankings organize existing truths only
 * - rankings never create or modify analytical truth
 * - rankings never mutate their inputs
 * - missing values are handled explicitly
 * - every ranking ends with a canonical identity tie-breaker
 * - duplicate canonical identities are non-compliant
 *
 * CRITICAL DEPENDENCIES
 * - none
 *
 * SENSITIVE ZONES
 * - comparator composition
 * - missing-value ordering
 * - canonical identity validation
 * - deterministic final tie-breaking
 * ========================================================================== */

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RankingDirection = "asc" | "desc";

export type RankingNullPlacement = "first" | "last";

export type RankingComparator<T> = (left: T, right: T) => number;

export type RankingKeySelector<T> = (item: T) => string;

export type RankingValidationIssueCode =
  | "EMPTY_CANONICAL_KEY"
  | "DUPLICATE_CANONICAL_KEY";

export type RankingValidationIssue = {
  code: RankingValidationIssueCode;
  key: string;
  indexes: number[];
};

export type RankingValidationReport = {
  valid: boolean;
  item_count: number;
  unique_key_count: number;
  issues: RankingValidationIssue[];
};

export type RankedItem<T> = {
  ranking_position: number;
  item: T;
};

/* ============================================================================
 * 2. SAFE NORMALIZATION
 * ========================================================================== */

export function normalizeRankingString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeRankingNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function normalizeComparatorResult(value: number): number {
  if (!Number.isFinite(value) || value === 0) return 0;

  return value < 0 ? -1 : 1;
}

/* ============================================================================
 * 3. PRIMITIVE COMPARATORS
 * ========================================================================== */

export function compareRankingStrings(
  left: unknown,
  right: unknown,
  direction: RankingDirection = "asc",
): number {
  const leftValue = normalizeRankingString(left);
  const rightValue = normalizeRankingString(right);

  const result = leftValue.localeCompare(rightValue, "en", {
    sensitivity: "base",
    numeric: true,
  });

  return direction === "asc" ? result : -result;
}

export function compareRankingNumbers(
  left: unknown,
  right: unknown,
  options: {
    direction?: RankingDirection;
    nulls?: RankingNullPlacement;
  } = {},
): number {
  const direction = options.direction ?? "asc";
  const nulls = options.nulls ?? "last";

  const leftValue = normalizeRankingNumber(left);
  const rightValue = normalizeRankingNumber(right);

  if (leftValue === null && rightValue === null) return 0;

  if (leftValue === null) {
    return nulls === "first" ? -1 : 1;
  }

  if (rightValue === null) {
    return nulls === "first" ? 1 : -1;
  }

  if (leftValue === rightValue) return 0;

  const result = leftValue < rightValue ? -1 : 1;

  return direction === "asc" ? result : -result;
}

/* ============================================================================
 * 4. COMPARATOR BUILDERS
 * ========================================================================== */

export function compareByString<T>(
  selector: (item: T) => unknown,
  direction: RankingDirection = "asc",
): RankingComparator<T> {
  return (left, right) =>
    compareRankingStrings(selector(left), selector(right), direction);
}

export function compareByNumber<T>(
  selector: (item: T) => unknown,
  options: {
    direction?: RankingDirection;
    nulls?: RankingNullPlacement;
  } = {},
): RankingComparator<T> {
  return (left, right) =>
    compareRankingNumbers(selector(left), selector(right), options);
}

export function compareByPriority<T, TValue extends string>(
  selector: (item: T) => TValue,
  priorities: Readonly<Record<TValue, number>>,
  direction: RankingDirection = "desc",
): RankingComparator<T> {
  return (left, right) =>
    compareRankingNumbers(
      priorities[selector(left)],
      priorities[selector(right)],
      {
        direction,
        nulls: "last",
      },
    );
}

export function composeRankingComparators<T>(
  ...comparators: readonly RankingComparator<T>[]
): RankingComparator<T> {
  return (left, right) => {
    for (const comparator of comparators) {
      const result = normalizeComparatorResult(
        comparator(left, right),
      );

      if (result !== 0) {
        return result;
      }
    }

    return 0;
  };
}

export function withCanonicalTieBreaker<T>(
  comparator: RankingComparator<T>,
  canonicalKey: RankingKeySelector<T>,
): RankingComparator<T> {
  return composeRankingComparators(
    comparator,
    compareByString(canonicalKey, "asc"),
  );
}

/* ============================================================================
 * 5. DETERMINISTIC SORTING
 * ========================================================================== */

export function sortRankingItems<T>(
  items: readonly T[],
  comparator: RankingComparator<T>,
  canonicalKey: RankingKeySelector<T>,
): T[] {
  const completeComparator = withCanonicalTieBreaker(
    comparator,
    canonicalKey,
  );

  return items
    .map((item, sourceIndex) => ({
      item,
      sourceIndex,
    }))
    .sort((left, right) => {
      const result = completeComparator(left.item, right.item);

      if (result !== 0) return result;

      /*
       * Defensive fallback only.
       * A valid ranking should already be resolved by canonical identity.
       */
      return left.sourceIndex - right.sourceIndex;
    })
    .map(({ item }) => item);
}

export function takeRankingItems<T>(
  items: readonly T[],
  limit: number,
): T[] {
  const safeLimit =
    typeof limit === "number" && Number.isFinite(limit)
      ? Math.max(0, Math.trunc(limit))
      : 0;

  return items.slice(0, safeLimit);
}

export function assignRankingPositions<T>(
  items: readonly T[],
  startAt = 1,
): RankedItem<T>[] {
  const normalizedStart =
    typeof startAt === "number" && Number.isFinite(startAt)
      ? Math.max(1, Math.trunc(startAt))
      : 1;

  return items.map((item, index) => ({
    ranking_position: normalizedStart + index,
    item,
  }));
}

/* ============================================================================
 * 6. INPUT VALIDATION
 * ========================================================================== */

export function validateRankingItems<T>(
  items: readonly T[],
  canonicalKey: RankingKeySelector<T>,
): RankingValidationReport {
  const indexesByKey = new Map<string, number[]>();

  items.forEach((item, index) => {
    const key = normalizeRankingString(canonicalKey(item));
    const indexes = indexesByKey.get(key) ?? [];

    indexes.push(index);
    indexesByKey.set(key, indexes);
  });

  const issues: RankingValidationIssue[] = [];

  const emptyIndexes = indexesByKey.get("") ?? [];

  if (emptyIndexes.length > 0) {
    issues.push({
      code: "EMPTY_CANONICAL_KEY",
      key: "",
      indexes: emptyIndexes,
    });
  }

  for (const [key, indexes] of indexesByKey.entries()) {
    if (key.length === 0 || indexes.length < 2) continue;

    issues.push({
      code: "DUPLICATE_CANONICAL_KEY",
      key,
      indexes,
    });
  }

  return {
    valid: issues.length === 0,
    item_count: items.length,
    unique_key_count: [...indexesByKey.keys()].filter(
      (key) => key.length > 0,
    ).length,
    issues,
  };
}

/* ============================================================================
 * 7. CONSOLIDATED RANKING PIPELINE
 * ========================================================================== */

export function buildDeterministicRanking<T>(input: {
  items: readonly T[];
  comparator: RankingComparator<T>;
  canonicalKey: RankingKeySelector<T>;
  limit?: number;
  startAt?: number;
}): {
  validation: RankingValidationReport;
  ordered: T[];
  ranked: RankedItem<T>[];
} {
  const validation = validateRankingItems(
    input.items,
    input.canonicalKey,
  );

  if (!validation.valid) {
    return {
      validation,
      ordered: [],
      ranked: [],
    };
  }

  const ordered = sortRankingItems(
    input.items,
    input.comparator,
    input.canonicalKey,
  );

  const limited =
    typeof input.limit === "number"
      ? takeRankingItems(ordered, input.limit)
      : ordered;

  return {
    validation,
    ordered: limited,
    ranked: assignRankingPositions(limited, input.startAt),
  };
}
