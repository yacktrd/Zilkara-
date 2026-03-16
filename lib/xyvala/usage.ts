// lib/xyvala/usage.ts

import { NextResponse } from "next/server";
import type { ApiKeyType } from "@/lib/xyvala/api-keys";

export type ApiPlan =
  | "internal"
  | "demo"
  | "trader"
  | "pro"
  | "enterprise";

export type TrackUsageInput = {
  key?: string;
  apiKey?: string;
  keyType?: ApiKeyType | string;
  endpoint?: string;
  planOverride?: ApiPlan | string;
};

export type UsageSnapshot = {
  key: string;
  endpoint: string;
  plan: ApiPlan;
  keyType: string;
  usageCount: number;
  usageMinute: number;
  usageDay: number;
  quotaMinute: number;
  quotaDay: number;
  remainingMinute: number;
  remainingDay: number;
  quotaExceeded: boolean;
  resetMinute: number;
  resetDay: number;
  ts: string;
};

export type UsageState = {
  plan: ApiPlan;
  key: string;
  keyType: string;
  endpoint: string;
  usageCount: number;
  usageMinute: number;
  usageDay: number;
  quotaMinute: number;
  quotaDay: number;
  remainingMinute: number;
  remainingDay: number;
  quotaExceeded: boolean;
  resetMinute: number;
  resetDay: number;
  snapshot: UsageSnapshot;
};

type UsageBucket = {
  count: number;
  resetAt: number;
};

type UsageStoreEntry = {
  totalCount: number;
  minute: UsageBucket;
  day: UsageBucket;
  updatedAt: number;
  plan: ApiPlan;
  keyType: string;
  key: string;
  endpoint: string;
};

export type UsageViewByKey = {
  key: string;
  plan: ApiPlan;
  keyType: string;
  totalCount: number;
  minuteCount: number;
  dayCount: number;
  endpoints: number;
  updatedAt: number;
};

export type UsageViewByEndpoint = {
  endpoint: string;
  totalCount: number;
  minuteCount: number;
  dayCount: number;
  keys: number;
};

export type UsageTotals = {
  totalKeys: number;
  totalEndpoints: number;
  totalUsageCount: number;
  totalMinuteCount: number;
  totalDayCount: number;
  quotaExceededKeys: number;
};

type UsageAggregateByKey = {
  totalCount: number;
  minuteCount: number;
  dayCount: number;
  endpoints: number;
  updatedAt: number;
  plan: ApiPlan;
  keyType: string;
  resetMinute: number;
  resetDay: number;
};

const PLAN_LIMITS: Record<ApiPlan, { minute: number; day: number }> = {
  internal: { minute: 1_000_000_000, day: 1_000_000_000 },
  demo: { minute: 20, day: 100 },
  trader: { minute: 300, day: 5_000 },
  pro: { minute: 2_000, day: 50_000 },
  enterprise: { minute: 1_000_000_000, day: 1_000_000_000 },
};

const DEFAULT_ENDPOINT = "unknown";
const USAGE_STORE_KEY_SEPARATOR = "::";

/**
 * Nettoyage opportuniste mémoire.
 * Garde le store sain sans casser la simplicité du mode mémoire.
 */
const MEMORY_CLEANUP_INTERVAL_MS = 60_000;
const STALE_ENTRY_TTL_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Source principale de vérité :
 * une entrée par couple key:endpoint.
 *
 * Note :
 * ce store mémoire reste adapté au dev, preview et proto avancé.
 * Pour une prod monétisée multi-instance, la cible naturelle reste un store persistant
 * (KV / Redis / Postgres).
 */
const usageStore = new Map<string, UsageStoreEntry>();

let lastCleanupAt = 0;

function nowTs(): string {
  return new Date().toISOString();
}

function nowMs(): number {
  return Date.now();
}

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEndpoint(value: unknown): string {
  return safeStr(value) || DEFAULT_ENDPOINT;
}

function normalizeKey(input: TrackUsageInput): string {
  return safeStr(input.key) || safeStr(input.apiKey);
}

function buildUsageStoreKey(key: string, endpoint: string): string {
  return `${key}${USAGE_STORE_KEY_SEPARATOR}${endpoint}`;
}

function resolvePlanFromKeyType(keyType: string): ApiPlan {
  if (keyType === "internal") return "internal";
  if (keyType === "public_demo") return "demo";
  return "trader";
}

function normalizePlan(planOverride: unknown, keyType: string): ApiPlan {
  const override = safeStr(planOverride).toLowerCase();

  if (
    override === "internal" ||
    override === "demo" ||
    override === "trader" ||
    override === "pro" ||
    override === "enterprise"
  ) {
    return override;
  }

  return resolvePlanFromKeyType(keyType);
}

function getMinuteReset(fromMs = nowMs()): number {
  const d = new Date(fromMs);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  return d.getTime();
}

function getDayReset(fromMs = nowMs()): number {
  const d = new Date(fromMs);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

function ensureBucket(
  bucket: UsageBucket,
  kind: "minute" | "day",
  currentMs: number
): UsageBucket {
  const targetReset =
    kind === "minute" ? getMinuteReset(currentMs) : getDayReset(currentMs);

  if (currentMs >= bucket.resetAt) {
    return {
      count: 0,
      resetAt: targetReset,
    };
  }

  return bucket;
}

function createStoreEntry(
  key: string,
  endpoint: string,
  plan: ApiPlan,
  keyType: string,
  currentMs: number
): UsageStoreEntry {
  return {
    totalCount: 0,
    minute: {
      count: 0,
      resetAt: getMinuteReset(currentMs),
    },
    day: {
      count: 0,
      resetAt: getDayReset(currentMs),
    },
    updatedAt: currentMs,
    plan,
    keyType,
    key,
    endpoint,
  };
}

function normalizeEntryForTime(
  entry: UsageStoreEntry,
  currentMs: number
): UsageStoreEntry {
  const minute = ensureBucket(entry.minute, "minute", currentMs);
  const day = ensureBucket(entry.day, "day", currentMs);

  if (
    minute.count === entry.minute.count &&
    minute.resetAt === entry.minute.resetAt &&
    day.count === entry.day.count &&
    day.resetAt === entry.day.resetAt
  ) {
    return entry;
  }

  const normalized: UsageStoreEntry = {
    ...entry,
    minute,
    day,
  };

  usageStore.set(buildUsageStoreKey(entry.key, entry.endpoint), normalized);
  return normalized;
}

function maybeCleanupUsageStore(currentMs: number): void {
  if (currentMs - lastCleanupAt < MEMORY_CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanupAt = currentMs;

  for (const [storeKey, rawEntry] of usageStore.entries()) {
    const entry = normalizeEntryForTime(rawEntry, currentMs);

    if (currentMs - entry.updatedAt > STALE_ENTRY_TTL_MS) {
      usageStore.delete(storeKey);
    }
  }
}

function trackStoreEntry(
  key: string,
  endpoint: string,
  plan: ApiPlan,
  keyType: string,
  currentMs: number
): UsageStoreEntry {
  maybeCleanupUsageStore(currentMs);

  const storeKey = buildUsageStoreKey(key, endpoint);

  const existing =
    usageStore.get(storeKey) ??
    createStoreEntry(key, endpoint, plan, keyType, currentMs);

  const normalizedExisting = normalizeEntryForTime(existing, currentMs);

  const updated: UsageStoreEntry = {
    totalCount: normalizedExisting.totalCount + 1,
    minute: {
      count: normalizedExisting.minute.count + 1,
      resetAt: normalizedExisting.minute.resetAt,
    },
    day: {
      count: normalizedExisting.day.count + 1,
      resetAt: normalizedExisting.day.resetAt,
    },
    updatedAt: currentMs,
    plan,
    keyType,
    key,
    endpoint,
  };

  usageStore.set(storeKey, updated);
  return updated;
}

function aggregateByKey(key: string, currentMs = nowMs()): UsageAggregateByKey {
  let totalCount = 0;
  let minuteCount = 0;
  let dayCount = 0;
  let endpoints = 0;
  let updatedAt = 0;
  let plan: ApiPlan = "trader";
  let keyType = "legacy";
  let resetMinute = 0;
  let resetDay = 0;

  for (const rawEntry of usageStore.values()) {
    if (rawEntry.key !== key) continue;

    const entry = normalizeEntryForTime(rawEntry, currentMs);

    totalCount += entry.totalCount;
    minuteCount += entry.minute.count;
    dayCount += entry.day.count;
    endpoints += 1;

    if (entry.updatedAt >= updatedAt) {
      updatedAt = entry.updatedAt;
      plan = entry.plan;
      keyType = entry.keyType;
    }

    if (resetMinute === 0) {
      resetMinute = entry.minute.resetAt;
    } else {
      resetMinute = Math.min(resetMinute, entry.minute.resetAt);
    }

    if (resetDay === 0) {
      resetDay = entry.day.resetAt;
    } else {
      resetDay = Math.min(resetDay, entry.day.resetAt);
    }
  }

  if (resetMinute === 0) {
    resetMinute = getMinuteReset(currentMs);
  }

  if (resetDay === 0) {
    resetDay = getDayReset(currentMs);
  }

  return {
    totalCount,
    minuteCount,
    dayCount,
    endpoints,
    updatedAt,
    plan,
    keyType,
    resetMinute,
    resetDay,
  };
}

function aggregateByEndpoint(
  endpoint: string,
  currentMs = nowMs()
): {
  totalCount: number;
  minuteCount: number;
  dayCount: number;
  keys: number;
} {
  let totalCount = 0;
  let minuteCount = 0;
  let dayCount = 0;
  const keys = new Set<string>();

  for (const rawEntry of usageStore.values()) {
    if (rawEntry.endpoint !== endpoint) continue;

    const entry = normalizeEntryForTime(rawEntry, currentMs);

    totalCount += entry.totalCount;
    minuteCount += entry.minute.count;
    dayCount += entry.day.count;
    keys.add(entry.key);
  }

  return {
    totalCount,
    minuteCount,
    dayCount,
    keys: keys.size,
  };
}

function buildSnapshot(input: {
  key: string;
  endpoint: string;
  plan: ApiPlan;
  keyType: string;
  totalCount: number;
  minuteCount: number;
  dayCount: number;
  resetMinute: number;
  resetDay: number;
}): UsageSnapshot {
  const limits = PLAN_LIMITS[input.plan];

  const remainingMinute = Math.max(limits.minute - input.minuteCount, 0);
  const remainingDay = Math.max(limits.day - input.dayCount, 0);

  const quotaExceeded =
    input.minuteCount > limits.minute || input.dayCount > limits.day;

  return {
    key: input.key,
    endpoint: input.endpoint,
    plan: input.plan,
    keyType: input.keyType,
    usageCount: input.totalCount,
    usageMinute: input.minuteCount,
    usageDay: input.dayCount,
    quotaMinute: limits.minute,
    quotaDay: limits.day,
    remainingMinute,
    remainingDay,
    quotaExceeded,
    resetMinute: input.resetMinute,
    resetDay: input.resetDay,
    ts: nowTs(),
  };
}

export function trackUsage(input: TrackUsageInput): UsageState {
  const key = normalizeKey(input);
  const keyType = safeStr(input.keyType) || "legacy";
  const endpoint = normalizeEndpoint(input.endpoint);
  const plan = normalizePlan(input.planOverride, keyType);

  if (!key) {
    throw new Error("usage_key_missing");
  }

  const currentMs = nowMs();

  trackStoreEntry(key, endpoint, plan, keyType, currentMs);

  const byKey = aggregateByKey(key, currentMs);

  const snapshot = buildSnapshot({
    key,
    endpoint,
    plan: byKey.plan,
    keyType: byKey.keyType,
    totalCount: byKey.totalCount,
    minuteCount: byKey.minuteCount,
    dayCount: byKey.dayCount,
    resetMinute: byKey.resetMinute,
    resetDay: byKey.resetDay,
  });

  return {
    plan: snapshot.plan,
    key,
    keyType: snapshot.keyType,
    endpoint,
    usageCount: snapshot.usageCount,
    usageMinute: snapshot.usageMinute,
    usageDay: snapshot.usageDay,
    quotaMinute: snapshot.quotaMinute,
    quotaDay: snapshot.quotaDay,
    remainingMinute: snapshot.remainingMinute,
    remainingDay: snapshot.remainingDay,
    quotaExceeded: snapshot.quotaExceeded,
    resetMinute: snapshot.resetMinute,
    resetDay: snapshot.resetDay,
    snapshot,
  };
}

export function listUsageByKey(): UsageViewByKey[] {
  const currentMs = nowMs();
  maybeCleanupUsageStore(currentMs);

  const keys = new Set<string>();

  for (const entry of usageStore.values()) {
    keys.add(entry.key);
  }

  return Array.from(keys)
    .map((key) => {
      const agg = aggregateByKey(key, currentMs);

      return {
        key,
        plan: agg.plan,
        keyType: agg.keyType,
        totalCount: agg.totalCount,
        minuteCount: agg.minuteCount,
        dayCount: agg.dayCount,
        endpoints: agg.endpoints,
        updatedAt: agg.updatedAt,
      };
    })
    .sort((a, b) => b.totalCount - a.totalCount || b.updatedAt - a.updatedAt);
}

export function listUsageByEndpoint(): UsageViewByEndpoint[] {
  const currentMs = nowMs();
  maybeCleanupUsageStore(currentMs);

  const endpoints = new Set<string>();

  for (const entry of usageStore.values()) {
    endpoints.add(entry.endpoint);
  }

  return Array.from(endpoints)
    .map((endpoint) => {
      const agg = aggregateByEndpoint(endpoint, currentMs);

      return {
        endpoint,
        totalCount: agg.totalCount,
        minuteCount: agg.minuteCount,
        dayCount: agg.dayCount,
        keys: agg.keys,
      };
    })
    .sort(
      (a, b) => b.totalCount - a.totalCount || a.endpoint.localeCompare(b.endpoint)
    );
}

export function getUsageTotals(): UsageTotals {
  const byKey = listUsageByKey();
  const byEndpoint = listUsageByEndpoint();

  let totalUsageCount = 0;
  let totalMinuteCount = 0;
  let totalDayCount = 0;
  let quotaExceededKeys = 0;

  for (const row of byKey) {
    totalUsageCount += row.totalCount;
    totalMinuteCount += row.minuteCount;
    totalDayCount += row.dayCount;

    const limits = PLAN_LIMITS[row.plan];
    if (row.minuteCount > limits.minute || row.dayCount > limits.day) {
      quotaExceededKeys += 1;
    }
  }

  return {
    totalKeys: byKey.length,
    totalEndpoints: byEndpoint.length,
    totalUsageCount,
    totalMinuteCount,
    totalDayCount,
    quotaExceededKeys,
  };
}

export function applyQuotaHeaders(
  res: NextResponse,
  usage: UsageState
): NextResponse {
  res.headers.set("x-xyvala-plan", usage.plan);
  res.headers.set("x-xyvala-endpoint", usage.endpoint);
  res.headers.set("x-xyvala-usage-count", String(usage.usageCount));
  res.headers.set("x-xyvala-usage-minute", String(usage.usageMinute));
  res.headers.set("x-xyvala-usage-day", String(usage.usageDay));
  res.headers.set("x-xyvala-quota-minute", String(usage.quotaMinute));
  res.headers.set("x-xyvala-quota-day", String(usage.quotaDay));
  res.headers.set("x-xyvala-remaining-minute", String(usage.remainingMinute));
  res.headers.set("x-xyvala-remaining-day", String(usage.remainingDay));
  res.headers.set(
    "x-xyvala-quota-exceeded",
    usage.quotaExceeded ? "true" : "false"
  );
  res.headers.set("x-xyvala-reset-minute", String(usage.resetMinute));
  res.headers.set("x-xyvala-reset-day", String(usage.resetDay));

  return res;
}
