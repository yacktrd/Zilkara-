/* ============================================================================
 * FILE: lib/xyvala/api-keys/usage-store.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala API key usage persistence store
 *
 * ROLE
 * - persist API key usage snapshots in a deterministic runtime store
 * - expose usage history and aggregate counters
 * - prepare future Redis/Postgres billing-grade persistence
 *
 * PARENTS
 * - lib/xyvala/api-keys/api-key-usage.ts
 * - lib/xyvala/api-keys/api-key-contract.ts
 * - lib/xyvala/api-keys/api-key-service.ts
 *
 * DIRECTIVES
 * - usage persistence only
 * - no quota decision
 * - no permission decision
 * - no API key generation
 * - no billing mutation
 * - no route response building
 * - no UI logic
 * - no account mutation
 * - no RFS recomputation
 * - no MCI recomputation
 * - deterministic storage only
 *
 * INVARIANTS
 * - usage records are append-only by default
 * - counters are non-negative
 * - raw API keys are never stored
 * - billing integration must use this layer or a future persistent adapter
 * ========================================================================== */

import type {
  ApiKeyUsageEndpoint,
  ApiKeyUsageState,
} from "@/lib/xyvala/api-keys/api-key-usage";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type UsageStoreRecord = {
  id: string;
  api_key_id: string;
  account_id: string | null;

  endpoint: ApiKeyUsageEndpoint;

  usage_count: number;
  usage_minute: number;
  usage_day: number;

  quota_minute: number;
  quota_day: number;

  remaining_minute: number;
  remaining_day: number;

  decision: ApiKeyUsageState["decision"];
  reason: string;

  recorded_at: string;
  reset_minute: number;
  reset_day: number;

  warnings: string[];
};

export type UsageAggregate = {
  api_key_id: string;
  account_id: string | null;

  total_records: number;
  total_allowed: number;
  total_blocked: number;

  latest_recorded_at: string | null;
  latest_reason: string | null;

  warnings: string[];
};

type UsageStoreState = {
  records: Map<string, UsageStoreRecord>;
  recordsByApiKey: Map<string, Set<string>>;
  recordsByAccount: Map<string, Set<string>>;
};

/* ============================================================================
 * 2. GLOBAL STORE
 * ========================================================================== */

declare global {
  // eslint-disable-next-line no-var
  var __XYVALA_USAGE_STORE__: UsageStoreState | undefined;
}

function getStore(): UsageStoreState {
  if (!globalThis.__XYVALA_USAGE_STORE__) {
    globalThis.__XYVALA_USAGE_STORE__ = {
      records: new Map(),
      recordsByApiKey: new Map(),
      recordsByAccount: new Map(),
    };
  }

  return globalThis.__XYVALA_USAGE_STORE__;
}

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
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

function buildUsageRecordId(input: {
  api_key_id: string;
  endpoint: ApiKeyUsageEndpoint;
  recorded_at: string;
  usage_count: number;
}): string {
  const base = [
    "usage",
    safeString(input.api_key_id) || "unknown",
    input.endpoint.replace(/[^a-zA-Z0-9]+/g, "-"),
    input.recorded_at.replace(/[^a-zA-Z0-9]+/g, "-"),
    String(clampNonNegative(input.usage_count)),
  ].join("_");

  return base.toLowerCase().slice(0, 180);
}

function cloneUsageRecord(record: UsageStoreRecord): UsageStoreRecord {
  return {
    ...record,
    warnings: [...record.warnings],
  };
}

function indexRecord(record: UsageStoreRecord): void {
  const store = getStore();

  const apiKeySet =
    store.recordsByApiKey.get(record.api_key_id) ?? new Set<string>();

  apiKeySet.add(record.id);
  store.recordsByApiKey.set(record.api_key_id, apiKeySet);

  if (record.account_id) {
    const accountSet =
      store.recordsByAccount.get(record.account_id) ?? new Set<string>();

    accountSet.add(record.id);
    store.recordsByAccount.set(record.account_id, accountSet);
  }
}

/* ============================================================================
 * 4. WRITERS
 * ========================================================================== */

export function persistUsageState(
  state: ApiKeyUsageState,
): UsageStoreRecord {
  const recordedAt = nowIso();

  const record: UsageStoreRecord = {
    id: buildUsageRecordId({
      api_key_id: state.api_key_id,
      endpoint: state.endpoint,
      recorded_at: recordedAt,
      usage_count: state.usage_count,
    }),

    api_key_id: state.api_key_id,
    account_id: state.account_id,

    endpoint: state.endpoint,

    usage_count: clampNonNegative(state.usage_count),
    usage_minute: clampNonNegative(state.usage_minute),
    usage_day: clampNonNegative(state.usage_day),

    quota_minute: clampNonNegative(state.quota_minute),
    quota_day: clampNonNegative(state.quota_day),

    remaining_minute: clampNonNegative(state.remaining_minute),
    remaining_day: clampNonNegative(state.remaining_day),

    decision: state.decision,
    reason: safeString(state.reason) || "usage_recorded",

    recorded_at: recordedAt,
    reset_minute: clampNonNegative(state.reset_minute),
    reset_day: clampNonNegative(state.reset_day),

    warnings: uniqueWarnings(state.warnings),
  };

  const store = getStore();

  store.records.set(record.id, record);
  indexRecord(record);

  return cloneUsageRecord(record);
}

/* ============================================================================
 * 5. READERS
 * ========================================================================== */

export function findUsageRecordById(id: string): UsageStoreRecord | null {
  const record = getStore().records.get(safeString(id));

  return record ? cloneUsageRecord(record) : null;
}

export function listUsageRecords(): UsageStoreRecord[] {
  return [...getStore().records.values()].map(cloneUsageRecord);
}

export function listUsageRecordsByApiKey(
  apiKeyId: string,
): UsageStoreRecord[] {
  const ids = getStore().recordsByApiKey.get(safeString(apiKeyId));

  if (!ids) return [];

  return [...ids]
    .map((id) => findUsageRecordById(id))
    .filter((record): record is UsageStoreRecord => record !== null);
}

export function listUsageRecordsByAccount(
  accountId: string,
): UsageStoreRecord[] {
  const ids = getStore().recordsByAccount.get(safeString(accountId));

  if (!ids) return [];

  return [...ids]
    .map((id) => findUsageRecordById(id))
    .filter((record): record is UsageStoreRecord => record !== null);
}

/* ============================================================================
 * 6. AGGREGATION
 * ========================================================================== */

export function aggregateUsageRecords(
  records: UsageStoreRecord[],
): UsageAggregate {
  const latest = records
    .slice()
    .sort(
      (left, right) =>
        new Date(right.recorded_at).getTime() -
        new Date(left.recorded_at).getTime(),
    )[0];

  return {
    api_key_id: latest?.api_key_id ?? "unknown",
    account_id: latest?.account_id ?? null,

    total_records: records.length,
    total_allowed: records.filter((record) => record.decision === "ALLOW")
      .length,
    total_blocked: records.filter((record) => record.decision === "BLOCK")
      .length,

    latest_recorded_at: latest?.recorded_at ?? null,
    latest_reason: latest?.reason ?? null,

    warnings: uniqueWarnings(...records.map((record) => record.warnings)),
  };
}

export function aggregateUsageByApiKey(apiKeyId: string): UsageAggregate {
  return aggregateUsageRecords(listUsageRecordsByApiKey(apiKeyId));
}

export function aggregateUsageByAccount(accountId: string): UsageAggregate {
  return aggregateUsageRecords(listUsageRecordsByAccount(accountId));
}

/* ============================================================================
 * 7. MAINTENANCE
 * ========================================================================== */

export function getUsageStoreStats(): {
  total_records: number;
  tracked_api_keys: number;
  tracked_accounts: number;
} {
  const store = getStore();

  return {
    total_records: store.records.size,
    tracked_api_keys: store.recordsByApiKey.size,
    tracked_accounts: store.recordsByAccount.size,
  };
}

export function clearUsageStore(): void {
  const store = getStore();

  store.records.clear();
  store.recordsByApiKey.clear();
  store.recordsByAccount.clear();
}
