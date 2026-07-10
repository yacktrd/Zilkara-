/* ============================================================================
 * FILE: lib/xyvala/stores/transition-lifecycle-store.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala transition lifecycle traceability store
 *
 * ROLE
 * - store transition lifecycle records independently from detection records
 * - track transition entry, persistence, re-entry and exit information
 * - preserve transition history for audit, performance and calibration
 * - provide deterministic read helpers without recalculating analytical truth
 *
 * PARENT FILES
 * - lib/xyvala/stores/detection-store.ts
 * - lib/xyvala/stores/structural-analytics-store.ts
 * - lib/xyvala/contracts/scan-private-contract.ts
 *
 * DIRECTIVES
 * - MUTATE layer only
 * - private traceability only
 * - no RFS recomputation
 * - no MCI recomputation
 * - no calibration logic
 * - no snapshot shaping
 * - no API response building
 * - no UI logic
 * - no financial advice
 * - no prediction
 * - append-only by default
 * - lifecycle updates must be explicit
 * - deterministic transition identity
 *
 * INPUTS
 * - TransitionLifecycleRecordInput
 *
 * OUTPUTS
 * - TransitionLifecycleRecord
 * - TransitionLifecycleStoreSnapshot
 *
 * INVARIANTS
 * - one transition_id represents one transition cycle
 * - transition lifecycle does not create analytical truth
 * - lifecycle values must come from observed detections
 * - null means explicitly unavailable
 * - undefined must never be stored
 * - updates are controlled and explicit
 *
 * CRITICAL DEPENDENCIES
 * - transition_id
 * - asset_id
 * - first_detection_id
 * - last_detection_id
 * - transition_state
 *
 * SENSITIVE ZONES
 * - transition re-entry counting
 * - transition exit detection
 * - lifecycle mutation
 * - future persistence migration
 * ========================================================================== */

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type TransitionLifecycleStoreStatus =
  | "recorded"
  | "updated"
  | "duplicate"
  | "invalid"
  | "unavailable";

export type TransitionLifecycleState =
  | "COMPRESSION"
  | "PRESSURE_BUILDING"
  | "RELEASE"
  | "EXHAUSTION"
  | "NEUTRAL"
  | "UNKNOWN";

export type TransitionLifecycleOutcome =
  | "active"
  | "completed"
  | "abandoned"
  | "unknown";

export type TransitionLifecycleRecord = {
  transition_id: string;

  asset_id: string;
  symbol: string;
  name: string;

  transition_state: TransitionLifecycleState;
  outcome_state: TransitionLifecycleOutcome;

  first_detection_id: string;
  last_detection_id: string | null;

  first_seen: string;
  last_seen: string | null;

  entry_rank: number | null;
  exit_rank: number | null;
  best_rank: number | null;
  worst_rank: number | null;
  average_rank: number | null;

  entry_price: number | null;
  exit_price: number | null;

  appearance_count: number;
  reentry_count: number;

  duration_days: number | null;
  time_since_first_seen_days: number | null;
  time_since_last_seen_days: number | null;

  snapshot_version: string;
  analytical_version: string;

  created_at: string;
  updated_at: string;
};

export type TransitionLifecycleRecordInput =
  Partial<TransitionLifecycleRecord> & {
    transition_id?: unknown;
    asset_id?: unknown;
    symbol?: unknown;
    name?: unknown;
    transition_state?: unknown;
    outcome_state?: unknown;
    first_detection_id?: unknown;
    last_detection_id?: unknown;
    first_seen?: unknown;
    last_seen?: unknown;
    snapshot_version?: unknown;
    analytical_version?: unknown;
  };

export type TransitionLifecycleUpdateInput = {
  transition_id: unknown;

  last_detection_id?: unknown;
  last_seen?: unknown;

  rank?: unknown;
  price?: unknown;

  appearance_increment?: unknown;
  reentry_increment?: unknown;

  outcome_state?: unknown;
  snapshot_version?: unknown;
  analytical_version?: unknown;
};

export type TransitionLifecycleWriteResult = {
  ok: boolean;
  status: TransitionLifecycleStoreStatus;
  record: TransitionLifecycleRecord | null;
  error: string | null;
};

export type TransitionLifecycleStoreSnapshot = {
  ok: boolean;
  count: number;
  records: TransitionLifecycleRecord[];
  warnings: string[];
};

/* ============================================================================
 * 2. IN-MEMORY STORE
 * ========================================================================== */

const transitionLifecycleStore =
  new Map<string, TransitionLifecycleRecord>();

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function safeNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function safeNonNegativeInteger(value: unknown, fallback = 0): number {
  const parsed = safeNullableNumber(value);

  if (parsed === null || parsed < 0) {
    return fallback;
  }

  return Math.trunc(parsed);
}

function safeNullableRank(value: unknown): number | null {
  const parsed = safeNullableNumber(value);

  if (parsed === null || parsed <= 0) {
    return null;
  }

  return Math.trunc(parsed);
}

function normalizeIsoDate(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toISOString();
}

function normalizeNullableIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function diffDays(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (
    Number.isNaN(fromDate.getTime()) ||
    Number.isNaN(toDate.getTime())
  ) {
    return null;
  }

  const diffMs = toDate.getTime() - fromDate.getTime();

  if (diffMs < 0) return null;

  return Math.round((diffMs / 86_400_000) * 100) / 100;
}

function normalizeTransitionState(value: unknown): TransitionLifecycleState {
  if (value === "COMPRESSION") return "COMPRESSION";
  if (value === "PRESSURE_BUILDING") return "PRESSURE_BUILDING";
  if (value === "RELEASE") return "RELEASE";
  if (value === "EXHAUSTION") return "EXHAUSTION";
  if (value === "NEUTRAL") return "NEUTRAL";

  return "UNKNOWN";
}

function normalizeOutcomeState(value: unknown): TransitionLifecycleOutcome {
  if (value === "completed") return "completed";
  if (value === "abandoned") return "abandoned";
  if (value === "unknown") return "unknown";

  return "active";
}

function computeAverageRank(input: {
  previous_average_rank: number | null;
  previous_count: number;
  next_rank: number | null;
}): number | null {
  if (input.next_rank === null) {
    return input.previous_average_rank;
  }

  if (
    input.previous_average_rank === null ||
    input.previous_count <= 0
  ) {
    return input.next_rank;
  }

  const total =
    input.previous_average_rank * input.previous_count + input.next_rank;

  return Math.round((total / (input.previous_count + 1)) * 100) / 100;
}

function resolveBestRank(
  current: number | null,
  next: number | null,
): number | null {
  if (next === null) return current;
  if (current === null) return next;

  return Math.min(current, next);
}

function resolveWorstRank(
  current: number | null,
  next: number | null,
): number | null {
  if (next === null) return current;
  if (current === null) return next;

  return Math.max(current, next);
}

function buildTransitionId(input: {
  asset_id: string;
  transition_state: TransitionLifecycleState;
  first_seen: string;
  analytical_version: string;
}): string {
  return [
    "transition",
    input.asset_id.toLowerCase(),
    input.transition_state,
    input.first_seen,
    input.analytical_version,
  ]
    .join("|")
    .replace(/\s+/g, "");
}

function validateRecord(record: TransitionLifecycleRecord): string | null {
  if (!record.transition_id) return "transition_id_missing";
  if (!record.asset_id) return "asset_id_missing";
  if (!record.symbol) return "symbol_missing";
  if (!record.name) return "name_missing";
  if (!record.first_detection_id) return "first_detection_id_missing";
  if (!record.first_seen) return "first_seen_missing";
  if (!record.snapshot_version) return "snapshot_version_missing";
  if (!record.analytical_version) return "analytical_version_missing";

  return null;
}

/* ============================================================================
 * 4. RECORD BUILDER
 * ========================================================================== */

export function buildTransitionLifecycleRecord(
  input: TransitionLifecycleRecordInput,
): TransitionLifecycleRecord {
  const createdAt = nowIso();

  const assetId = safeString(
    input.asset_id,
    safeString(input.symbol, "unknown").toLowerCase(),
  );

  const symbol = safeString(input.symbol, "UNKNOWN").toUpperCase();
  const name = safeString(input.name, symbol);

  const transitionState = normalizeTransitionState(input.transition_state);
  const outcomeState = normalizeOutcomeState(input.outcome_state);

  const firstSeen = normalizeIsoDate(input.first_seen, createdAt);
  const lastSeen = normalizeNullableIsoDate(input.last_seen);

  const snapshotVersion = safeString(input.snapshot_version, "unknown");
  const analyticalVersion = safeString(input.analytical_version, "unknown");

  const firstDetectionId = safeString(input.first_detection_id);
  const lastDetectionId = safeString(input.last_detection_id) || null;

  const entryRank = safeNullableRank(input.entry_rank);
  const exitRank = safeNullableRank(input.exit_rank);

  const bestRank =
    safeNullableRank(input.best_rank) ??
    resolveBestRank(entryRank, exitRank);

  const worstRank =
    safeNullableRank(input.worst_rank) ??
    resolveWorstRank(entryRank, exitRank);

  const appearanceCount = Math.max(
    1,
    safeNonNegativeInteger(input.appearance_count, 1),
  );

  const reentryCount = safeNonNegativeInteger(input.reentry_count, 0);

  const durationDays =
    safeNullableNumber(input.duration_days) ??
    diffDays(firstSeen, lastSeen);

  const transitionId =
    safeString(input.transition_id) ||
    buildTransitionId({
      asset_id: assetId,
      transition_state: transitionState,
      first_seen: firstSeen,
      analytical_version: analyticalVersion,
    });

  return {
    transition_id: transitionId,

    asset_id: assetId,
    symbol,
    name,

    transition_state: transitionState,
    outcome_state: outcomeState,

    first_detection_id: firstDetectionId,
    last_detection_id: lastDetectionId,

    first_seen: firstSeen,
    last_seen: lastSeen,

    entry_rank: entryRank,
    exit_rank: exitRank,
    best_rank: bestRank,
    worst_rank: worstRank,
    average_rank: safeNullableNumber(input.average_rank) ?? entryRank,

    entry_price: safeNullableNumber(input.entry_price),
    exit_price: safeNullableNumber(input.exit_price),

    appearance_count: appearanceCount,
    reentry_count: reentryCount,

    duration_days: durationDays,
    time_since_first_seen_days: diffDays(firstSeen, createdAt),
    time_since_last_seen_days: diffDays(lastSeen, createdAt),

    snapshot_version: snapshotVersion,
    analytical_version: analyticalVersion,

    created_at: normalizeIsoDate(input.created_at, createdAt),
    updated_at: normalizeIsoDate(input.updated_at, createdAt),
  };
}

/* ============================================================================
 * 5. MUTATION API
 * ========================================================================== */

export function recordTransitionLifecycle(
  input: TransitionLifecycleRecordInput,
): TransitionLifecycleWriteResult {
  const record = buildTransitionLifecycleRecord(input);
  const validationError = validateRecord(record);

  if (validationError) {
    return {
      ok: false,
      status: "invalid",
      record: null,
      error: validationError,
    };
  }

  if (transitionLifecycleStore.has(record.transition_id)) {
    return {
      ok: true,
      status: "duplicate",
      record: transitionLifecycleStore.get(record.transition_id) ?? null,
      error: null,
    };
  }

  transitionLifecycleStore.set(
    record.transition_id,
    Object.freeze({ ...record }),
  );

  return {
    ok: true,
    status: "recorded",
    record,
    error: null,
  };
}

export function updateTransitionLifecycle(
  input: TransitionLifecycleUpdateInput,
): TransitionLifecycleWriteResult {
  const transitionId = safeString(input.transition_id);
  const existing = transitionLifecycleStore.get(transitionId);

  if (!existing) {
    return {
      ok: false,
      status: "unavailable",
      record: null,
      error: "transition_lifecycle_not_found",
    };
  }

  const now = nowIso();

  const nextRank = safeNullableRank(input.rank);
  const nextPrice = safeNullableNumber(input.price);
  const nextLastSeen = normalizeIsoDate(input.last_seen, now);

  const appearanceIncrement = safeNonNegativeInteger(
    input.appearance_increment,
    1,
  );

  const reentryIncrement = safeNonNegativeInteger(
    input.reentry_increment,
    0,
  );

  const nextAppearanceCount =
    existing.appearance_count + appearanceIncrement;

  const updated: TransitionLifecycleRecord = {
    ...existing,

    last_detection_id:
      safeString(input.last_detection_id) || existing.last_detection_id,

    last_seen: nextLastSeen,

    exit_rank: nextRank ?? existing.exit_rank,
    exit_price: nextPrice ?? existing.exit_price,

    best_rank: resolveBestRank(existing.best_rank, nextRank),
    worst_rank: resolveWorstRank(existing.worst_rank, nextRank),
    average_rank: computeAverageRank({
      previous_average_rank: existing.average_rank,
      previous_count: existing.appearance_count,
      next_rank: nextRank,
    }),

    appearance_count: nextAppearanceCount,
    reentry_count: existing.reentry_count + reentryIncrement,

    duration_days: diffDays(existing.first_seen, nextLastSeen),
    time_since_first_seen_days: diffDays(existing.first_seen, now),
    time_since_last_seen_days: diffDays(nextLastSeen, now),

    outcome_state: normalizeOutcomeState(
      input.outcome_state ?? existing.outcome_state,
    ),

    snapshot_version: safeString(
      input.snapshot_version,
      existing.snapshot_version,
    ),

    analytical_version: safeString(
      input.analytical_version,
      existing.analytical_version,
    ),

    updated_at: now,
  };

  const validationError = validateRecord(updated);

  if (validationError) {
    return {
      ok: false,
      status: "invalid",
      record: null,
      error: validationError,
    };
  }

  transitionLifecycleStore.set(
    transitionId,
    Object.freeze({ ...updated }),
  );

  return {
    ok: true,
    status: "updated",
    record: updated,
    error: null,
  };
}

export function recordTransitionLifecycles(
  inputs: readonly TransitionLifecycleRecordInput[],
): TransitionLifecycleWriteResult[] {
  return inputs.map(recordTransitionLifecycle);
}

export function clearTransitionLifecycleStore(): void {
  transitionLifecycleStore.clear();
}

/* ============================================================================
 * 6. READ API
 * ========================================================================== */

export function listTransitionLifecycleRecords():
  TransitionLifecycleRecord[] {
  return [...transitionLifecycleStore.values()];
}

export function getTransitionLifecycleRecord(
  transitionId: string,
): TransitionLifecycleRecord | null {
  return transitionLifecycleStore.get(transitionId) ?? null;
}

export function listTransitionLifecycleRecordsByAsset(
  assetId: string,
): TransitionLifecycleRecord[] {
  const normalizedAssetId = safeString(assetId).toLowerCase();

  return listTransitionLifecycleRecords().filter(
    (record) => record.asset_id.toLowerCase() === normalizedAssetId,
  );
}

export function listTransitionLifecycleRecordsBySymbol(
  symbol: string,
): TransitionLifecycleRecord[] {
  const normalizedSymbol = safeString(symbol).toUpperCase();

  return listTransitionLifecycleRecords().filter(
    (record) => record.symbol === normalizedSymbol,
  );
}

export function listActiveTransitionLifecycleRecords():
  TransitionLifecycleRecord[] {
  return listTransitionLifecycleRecords().filter(
    (record) => record.outcome_state === "active",
  );
}

export function getTransitionLifecycleStoreSnapshot():
  TransitionLifecycleStoreSnapshot {
  return {
    ok: true,
    count: transitionLifecycleStore.size,
    records: listTransitionLifecycleRecords(),
    warnings: [],
  };
}
