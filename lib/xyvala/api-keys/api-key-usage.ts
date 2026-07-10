/* ============================================================================
 * FILE: lib/xyvala/api-keys/api-key-usage.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala API key usage governance
 *
 * ROLE
 * - track API key usage in deterministic runtime buckets
 * - enforce basic quota limits from API key plan and compartment
 * - prepare future persistent usage, billing and rate-limit layers
 *
 * PARENTS
 * - lib/xyvala/api-keys/api-key-contract.ts
 * - lib/xyvala/access/access-compartments.ts
 * - lib/xyvala/access/access-types.ts
 * - lib/xyvala/usage.ts
 *
 * DIRECTIVES
 * - runtime usage governance only
 * - no UI logic
 * - no route response building
 * - no billing mutation
 * - no API key generation
 * - no account mutation
 * - no RFS recomputation
 * - no MCI recomputation
 * - deterministic bucket logic only
 * - persistence must be introduced through a dedicated future store
 *
 * INVARIANTS
 * - usage counters are non-negative
 * - remaining quotas are clamped to >= 0
 * - quota state is explicit
 * - same key + endpoint + time bucket => same usage scope
 * ========================================================================== */

import type {
  ApiKeyPermission,
  PublicApiKey,
} from "@/lib/xyvala/api-keys/api-key-contract";

import { ACCESS_COMPARTMENTS } from "@/lib/xyvala/access/access-compartments";

import type { AccessCompartment } from "@/lib/xyvala/access/access-types";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type ApiKeyUsageEndpoint =
  | "/api/scan"
  | "/api/assets"
  | "/api/account/me"
  | "/api/usage";

export type ApiKeyUsageDecision =
  | "ALLOW"
  | "BLOCK";

export type ApiKeyUsageState = {
  api_key_id: string;
  account_id: string | null;

  endpoint: ApiKeyUsageEndpoint;
  required_permission: ApiKeyPermission;

  usage_count: number;
  usage_minute: number;
  usage_day: number;

  quota_minute: number;
  quota_day: number;

  remaining_minute: number;
  remaining_day: number;

  quota_exceeded: boolean;
  permission_granted: boolean;

  decision: ApiKeyUsageDecision;
  reason: string;

  reset_minute: number;
  reset_day: number;

  warnings: string[];
};

type UsageBucket = {
  count: number;
  reset_at: number;
};

type UsageEntry = {
  total: number;
  minute: UsageBucket;
  day: UsageBucket;
};

type ApiKeyUsageStoreState = {
  entries: Map<string, UsageEntry>;
};

type ApiKeyQuota = {
  minute: number;
  day: number;
};

/* ============================================================================
 * 2. GLOBAL STORE
 * ========================================================================== */

declare global {
  // eslint-disable-next-line no-var
  var __XYVALA_API_KEY_USAGE_STORE__: ApiKeyUsageStoreState | undefined;
}

function getStore(): ApiKeyUsageStoreState {
  if (!globalThis.__XYVALA_API_KEY_USAGE_STORE__) {
    globalThis.__XYVALA_API_KEY_USAGE_STORE__ = {
      entries: new Map(),
    };
  }

  return globalThis.__XYVALA_API_KEY_USAGE_STORE__;
}

/* ============================================================================
 * 3. CONFIG
 * ========================================================================== */

const QUOTAS: Record<AccessCompartment, ApiKeyQuota> = {
  public_10: {
    minute: 10,
    day: 100,
  },
  demo_30: {
    minute: 30,
    day: 500,
  },
  trader_60: {
    minute: 300,
    day: 5_000,
  },
  full_100: {
    minute: 2_000,
    day: 50_000,
  },
  admin_100: {
    minute: 5_000,
    day: 100_000,
  },
};

/* ============================================================================
 * 4. TIME HELPERS
 * ========================================================================== */

function now(): number {
  return Date.now();
}

function minuteReset(ts: number): number {
  const date = new Date(ts);
  date.setSeconds(0, 0);
  date.setMinutes(date.getMinutes() + 1);
  return date.getTime();
}

function dayReset(ts: number): number {
  const date = new Date(ts);
  date.setHours(24, 0, 0, 0);
  return date.getTime();
}

/* ============================================================================
 * 5. SAFE HELPERS
 * ========================================================================== */

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

function buildUsageKey(input: {
  api_key_id: string;
  endpoint: ApiKeyUsageEndpoint;
}): string {
  return `${input.api_key_id}:${input.endpoint}`;
}

function resolveQuota(apiKey: PublicApiKey): ApiKeyQuota {
  return QUOTAS[apiKey.compartment]
}

function createEntry(ts: number): UsageEntry {
  return {
    total: 0,
    minute: {
      count: 0,
      reset_at: minuteReset(ts),
    },
    day: {
      count: 0,
      reset_at: dayReset(ts),
    },
  };
}

function ensureEntry(entry: UsageEntry, ts: number): UsageEntry {
  if (ts >= entry.minute.reset_at) {
    entry.minute = {
      count: 0,
      reset_at: minuteReset(ts),
    };
  }

  if (ts >= entry.day.reset_at) {
    entry.day = {
      count: 0,
      reset_at: dayReset(ts),
    };
  }

  return entry;
}

function hasPermission(input: {
  apiKey: PublicApiKey;
  requiredPermission: ApiKeyPermission;
}): boolean {
  return input.apiKey.permissions.includes(input.requiredPermission);
}

/* ============================================================================
 * 6. USAGE GOVERNANCE
 * ========================================================================== */

export function trackApiKeyUsage(input: {
  api_key: PublicApiKey;
  endpoint: ApiKeyUsageEndpoint;
  required_permission: ApiKeyPermission;
}): ApiKeyUsageState {
  const ts = now();
  const store = getStore();

  const usageKey = buildUsageKey({
    api_key_id: input.api_key.id,
    endpoint: input.endpoint,
  });

  const entry = ensureEntry(
    store.entries.get(usageKey) ?? createEntry(ts),
    ts,
  );

  entry.total += 1;
  entry.minute.count += 1;
  entry.day.count += 1;

  store.entries.set(usageKey, entry);

  const quota = resolveQuota(input.api_key);

  const remainingMinute = clampNonNegative(
    quota.minute - entry.minute.count,
  );

  const remainingDay = clampNonNegative(
    quota.day - entry.day.count,
  );

  const permissionGranted = hasPermission({
    apiKey: input.api_key,
    requiredPermission: input.required_permission,
  });

  const quotaExceeded =
    entry.minute.count > quota.minute ||
    entry.day.count > quota.day;

  const decision: ApiKeyUsageDecision =
    permissionGranted && !quotaExceeded ? "ALLOW" : "BLOCK";

  const reason = !permissionGranted
    ? "api_key_permission_denied"
    : quotaExceeded
      ? "api_key_quota_exceeded"
      : "api_key_usage_allowed";

  return {
    api_key_id: input.api_key.id,
    account_id: input.api_key.account_id,

    endpoint: input.endpoint,
    required_permission: input.required_permission,

    usage_count: entry.total,
    usage_minute: entry.minute.count,
    usage_day: entry.day.count,

    quota_minute: quota.minute,
    quota_day: quota.day,

    remaining_minute: remainingMinute,
    remaining_day: remainingDay,

    quota_exceeded: quotaExceeded,
    permission_granted: permissionGranted,

    decision,
    reason,

    reset_minute: entry.minute.reset_at,
    reset_day: entry.day.reset_at,

    warnings: uniqueWarnings(
      decision === "BLOCK" ? [reason] : [],
      input.api_key.status !== "active" ? ["api_key_not_active"] : [],
    ),
  };
}

export function getApiKeyUsageSnapshot(input: {
  api_key: PublicApiKey;
  endpoint: ApiKeyUsageEndpoint;
  required_permission: ApiKeyPermission;
}): ApiKeyUsageState {
  const ts = now();
  const store = getStore();

  const usageKey = buildUsageKey({
    api_key_id: input.api_key.id,
    endpoint: input.endpoint,
  });

  const entry = ensureEntry(
    store.entries.get(usageKey) ?? createEntry(ts),
    ts,
  );

  const quota = resolveQuota(input.api_key);

  const permissionGranted = hasPermission({
    apiKey: input.api_key,
    requiredPermission: input.required_permission,
  });

  const quotaExceeded =
    entry.minute.count > quota.minute ||
    entry.day.count > quota.day;

  return {
    api_key_id: input.api_key.id,
    account_id: input.api_key.account_id,

    endpoint: input.endpoint,
    required_permission: input.required_permission,

    usage_count: entry.total,
    usage_minute: entry.minute.count,
    usage_day: entry.day.count,

    quota_minute: quota.minute,
    quota_day: quota.day,

    remaining_minute: clampNonNegative(quota.minute - entry.minute.count),
    remaining_day: clampNonNegative(quota.day - entry.day.count),

    quota_exceeded: quotaExceeded,
    permission_granted: permissionGranted,

    decision: permissionGranted && !quotaExceeded ? "ALLOW" : "BLOCK",
    reason: !permissionGranted
      ? "api_key_permission_denied"
      : quotaExceeded
        ? "api_key_quota_exceeded"
        : "api_key_usage_allowed",

    reset_minute: entry.minute.reset_at,
    reset_day: entry.day.reset_at,

    warnings: uniqueWarnings(
      quotaExceeded ? ["api_key_quota_exceeded"] : [],
      !permissionGranted ? ["api_key_permission_denied"] : [],
    ),
  };
}

export function clearApiKeyUsageStore(): void {
  getStore().entries.clear();
}
