// lib/xyvala/usage.ts

import { NextResponse } from "next/server";
import type { ApiKeyType } from "@/lib/xyvala/auth";

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
};

type UsageViewByKey = {
  key: string;
  plan: ApiPlan;
  keyType: string;
  totalCount: number;
  minuteCount: number;
  dayCount: number;
  updatedAt: number;
};

type UsageViewByEndpoint = {
  endpoint: string;
  totalCount: number;
  minuteCount: number;
  dayCount: number;
  keys: number;
};

type UsageTotals = {
  totalKeys: number;
  totalEndpoints: number;
  totalUsageCount: number;
  totalMinuteCount: number;
  totalDayCount: number;
  quotaExceededKeys: number;
};

const PLAN_LIMITS: Record<ApiPlan, { minute: number; day: number }> = {
  internal: { minute: 1_000_000_000, day: 1_000_000_000 },
  demo: { minute: 20, day: 100 },
  trader: { minute: 300, day: 5_000 },
  pro: { minute: 2_000, day: 50_000 },
  enterprise: { minute: 1_000_000_000, day: 1_000_000_000 },
};

const DEFAULT_ENDPOINT = "unknown";

const keyStore = new Map<string, UsageStoreEntry>();
const endpointStore = new Map<string, UsageStoreEntry>();

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

function resolvePlanFromKeyType(keyType: string): ApiPlan {
  if (keyType === "internal") return "internal";
  if (keyType === "public_demo") return "demo";
  return "trader";
}

function normalizePlan(
  planOverride: unknown,
  keyType: string
): ApiPlan {
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

function ensureBucket(bucket: UsageBucket, kind: "minute" | "day", currentMs: number): UsageBucket {
  const targetReset = kind === "minute" ? getMinuteReset(currentMs) : getDayReset(currentMs);

  if (currentMs >= bucket.resetAt) {
    return {
      count: 0,
      resetAt: targetReset,
    };
  }

  return bucket;
}

function createStoreEntry(plan: ApiPlan, keyType: string, currentMs: number): UsageStoreEntry {
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
  };
}

function trackStoreEntry(
  store: Map<string, UsageStoreEntry>,
  storeKey: string,
  plan: ApiPlan,
  keyType: string,
  currentMs: number
): UsageStoreEntry {
  const existing = store.get(storeKey) ?? createStoreEntry(plan, keyType, currentMs);

  const minute = ensureBucket(existing.minute, "minute", currentMs);
  const day = ensureBucket(existing.day, "day", currentMs);

  const updated: UsageStoreEntry = {
    totalCount: existing.totalCount + 1,
    minute: {
      count: minute.count + 1,
      resetAt: minute.resetAt,
    },
    day: {
      count: day.count + 1,
      resetAt: day.resetAt,
    },
    updatedAt: currentMs,
    plan,
    keyType,
  };

  store.set(storeKey, updated);
  return updated;
}

function buildSnapshot(input: {
  key: string;
  endpoint: string;
  plan: ApiPlan;
  keyType: string;
  entry: UsageStoreEntry;
}): UsageSnapshot {
  const limits = PLAN_LIMITS[input.plan];

  const usageMinute = input.entry.minute.count;
  const usageDay = input.entry.day.count;

  const remainingMinute = Math.max(limits.minute - usageMinute, 0);
  const remainingDay = Math.max(limits.day - usageDay, 0);

  const quotaExceeded = usageMinute > limits.minute || usageDay > limits.day;

  return {
    key: input.key,
    endpoint: input.endpoint,
    plan: input.plan,
    keyType: input.keyType,
    usageCount: input.entry.totalCount,
    usageMinute,
    usageDay,
    quotaMinute: limits.minute,
    quotaDay: limits.day,
    remainingMinute,
    remainingDay,
    quotaExceeded,
    resetMinute: input.entry.minute.resetAt,
    resetDay: input.entry.day.resetAt,
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

  const keyEntry = trackStoreEntry(
    keyStore,
    key,
    plan,
    keyType,
    currentMs
  );

  trackStoreEntry(
    endpointStore,
    endpoint,
    plan,
    keyType,
    currentMs
  );

  const snapshot = buildSnapshot({
    key,
    endpoint,
    plan,
    keyType,
    entry: keyEntry,
  });

  return {
    plan,
    key,
    keyType,
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
  return Array.from(keyStore.entries())
    .map(([key, entry]) => ({
      key,
      plan: entry.plan,
      keyType: entry.keyType,
      totalCount: entry.totalCount,
      minuteCount: entry.minute.count,
      dayCount: entry.day.count,
      updatedAt: entry.updatedAt,
    }))
    .sort((a, b) => b.totalCount - a.totalCount || b.updatedAt - a.updatedAt);
}

export function listUsageByEndpoint(): UsageViewByEndpoint[] {
  const rows = Array.from(endpointStore.entries()).map(([endpoint, entry]) => ({
    endpoint,
    totalCount: entry.totalCount,
    minuteCount: entry.minute.count,
    dayCount: entry.day.count,
    keys: 0,
  }));

  const keysByEndpoint = new Map<string, Set<string>>();

  for (const [key] of keyStore.entries()) {
    void key;
  }

  return rows
    .map((row) => ({
      ...row,
      keys: keysByEndpoint.get(row.endpoint)?.size ?? 0,
    }))
    .sort((a, b) => b.totalCount - a.totalCount || a.endpoint.localeCompare(b.endpoint));
}

export function getUsageTotals(): UsageTotals {
  let totalUsageCount = 0;
  let totalMinuteCount = 0;
  let totalDayCount = 0;
  let quotaExceededKeys = 0;

  for (const [, entry] of keyStore.entries()) {
    totalUsageCount += entry.totalCount;
    totalMinuteCount += entry.minute.count;
    totalDayCount += entry.day.count;

    const limits = PLAN_LIMITS[entry.plan];
    if (entry.minute.count > limits.minute || entry.day.count > limits.day) {
      quotaExceededKeys += 1;
    }
  }

  return {
    totalKeys: keyStore.size,
    totalEndpoints: endpointStore.size,
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

  res.headers.set("x-xyvala-quota-exceeded", usage.quotaExceeded ? "true" : "false");
  res.headers.set("x-xyvala-reset-minute", String(usage.resetMinute));
  res.headers.set("x-xyvala-reset-day", String(usage.resetDay));

  return res;
}
