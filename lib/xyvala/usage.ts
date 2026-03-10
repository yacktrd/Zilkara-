// lib/xyvala/usage.ts

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { ApiKeyType } from "@/lib/xyvala/auth";

export type ApiPlan =
  | "internal"
  | "demo"
  | "trader"
  | "pro"
  | "enterprise";

export type UsageEndpoint = string;

export type TrackUsageInput = {
  key?: string;
  apiKey?: string;
  keyType?: ApiKeyType | string;
  endpoint?: string;
  planOverride?: ApiPlan;
};

export type UsageState = {
  plan: ApiPlan;
  quotaLimit: number;
  quotaRemaining: number;
  quotaReset: number;
  usageCount: number;
  endpoint: string | null;
  quotaExceeded: boolean;
};

export type UsageSnapshot = {
  bucket: string;
  apiKey: string;
  apiKeyMasked: string;
  apiKeyHash: string;
  endpoint: string | null;
  keyType: string | null;
  plan: ApiPlan;
  count: number;
  resetAt: number;
  lastSeenAt: number;
};

type DailyQuotaRecord = {
  count: number;
  bucket: string;
  resetAt: number;
  lastSeenAt: number;
  key: string;
  keyType: string | null;
  plan: ApiPlan;
};

type UsageMatrixRecord = {
  bucket: string;
  key: string;
  endpoint: string | null;
  keyType: string | null;
  plan: ApiPlan;
  count: number;
  resetAt: number;
  lastSeenAt: number;
};

type UsageTotals = {
  records: number;
  totalCalls: number;
};

const PLAN_LIMITS: Readonly<Record<ApiPlan, number>> = Object.freeze({
  internal: 1_000_000_000,
  demo: 100,
  trader: 5_000,
  pro: 50_000,
  enterprise: 1_000_000_000,
});

const DEFAULT_PLAN: ApiPlan = "trader";
const CLEANUP_THRESHOLD = 2_000;

const quotaStore = new Map<string, DailyQuotaRecord>();
const usageMatrixStore = new Map<string, UsageMatrixRecord>();

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nowMs(): number {
  return Date.now();
}

function getResolvedKey(input: TrackUsageInput): string {
  return safeStr(input.key) || safeStr(input.apiKey);
}

function normalizeEndpoint(value: unknown): string | null {
  const raw = safeStr(value);
  if (!raw) return null;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function getTodayBucketUtc(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getNextUtcMidnightTimestamp(date = new Date()): number {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1,
    0,
    0,
    0,
    0
  );
}

function inferKeyTypeFromEnv(key: string): ApiKeyType | null {
  if (!key) return null;

  const internal = safeStr(process.env.XYVALA_INTERNAL_KEY);
  if (internal && key === internal) return "internal";

  const demo = safeStr(process.env.XYVALA_PUBLIC_DEMO_KEY);
  if (demo && key === demo) return "public_demo";

  const legacy = safeStr(process.env.XYVALA_API_KEY);
  if (legacy && key === legacy) return "legacy";

  return null;
}

function resolvePlanFromKeyType(keyType: string | null): ApiPlan {
  if (keyType === "internal") return "internal";
  if (keyType === "public_demo") return "demo";
  if (keyType === "legacy") return "trader";

  return DEFAULT_PLAN;
}

function resolvePlan(input: TrackUsageInput, resolvedKey: string): ApiPlan {
  if (input.planOverride && PLAN_LIMITS[input.planOverride]) {
    return input.planOverride;
  }

  const explicitKeyType = safeStr(input.keyType);
  if (explicitKeyType) {
    return resolvePlanFromKeyType(explicitKeyType);
  }

  const inferred = inferKeyTypeFromEnv(resolvedKey);
  return resolvePlanFromKeyType(inferred);
}

function resolveKeyType(input: TrackUsageInput, resolvedKey: string): string | null {
  const explicitKeyType = safeStr(input.keyType);
  if (explicitKeyType) return explicitKeyType;

  return inferKeyTypeFromEnv(resolvedKey);
}

function buildQuotaStoreKey(key: string, bucket: string): string {
  return `${bucket}:${key}`;
}

function buildMatrixStoreKey(
  key: string,
  endpoint: string | null,
  bucket: string
): string {
  return `${bucket}:${key}:${endpoint ?? "*"}`;
}

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "****";

  const start = key.slice(0, 4);
  const end = key.slice(-4);
  return `${start}****${end}`;
}

function cleanupStoreBucket<T extends { bucket: string }>(
  store: Map<string, T>,
  currentBucket: string
) {
  if (store.size < CLEANUP_THRESHOLD) return;

  for (const [storeKey, record] of store.entries()) {
    if (record.bucket !== currentBucket) {
      store.delete(storeKey);
    }
  }
}

function cleanupStores(currentBucket: string) {
  cleanupStoreBucket(quotaStore, currentBucket);
  cleanupStoreBucket(usageMatrixStore, currentBucket);
}

function toSnapshot(record: UsageMatrixRecord): UsageSnapshot {
  return {
    bucket: record.bucket,
    apiKey: record.key,
    apiKeyMasked: maskKey(record.key),
    apiKeyHash: hashKey(record.key),
    endpoint: record.endpoint,
    keyType: record.keyType,
    plan: record.plan,
    count: record.count,
    resetAt: record.resetAt,
    lastSeenAt: record.lastSeenAt,
  };
}

function sortSnapshotsDesc(a: UsageSnapshot, b: UsageSnapshot): number {
  if (b.count !== a.count) return b.count - a.count;
  return b.lastSeenAt - a.lastSeenAt;
}

function aggregateTotalsFromMatrix(records: Iterable<UsageMatrixRecord>): UsageTotals {
  let totalCalls = 0;
  let recordsCount = 0;

  for (const record of records) {
    recordsCount += 1;
    totalCalls += record.count;
  }

  return {
    records: recordsCount,
    totalCalls,
  };
}

function getCurrentBucket(): string {
  return getTodayBucketUtc(new Date());
}

function getCurrentResetAt(): number {
  return getNextUtcMidnightTimestamp(new Date());
}

/* -------------------------------------------------------------------------- */
/*                               Public Tracking                              */
/* -------------------------------------------------------------------------- */

export function trackUsage(input: TrackUsageInput): UsageState {
  const date = new Date();
  const bucket = getTodayBucketUtc(date);
  const quotaReset = getNextUtcMidnightTimestamp(date);
  const lastSeenAt = nowMs();

  cleanupStores(bucket);

  const resolvedKey = getResolvedKey(input);
  const endpoint = normalizeEndpoint(input.endpoint);
  const keyType = resolveKeyType(input, resolvedKey);
  const plan = resolvePlan(input, resolvedKey);
  const quotaLimit = PLAN_LIMITS[plan];

  if (!resolvedKey) {
    return {
      plan,
      quotaLimit,
      quotaRemaining: quotaLimit,
      quotaReset,
      usageCount: 0,
      endpoint,
      quotaExceeded: false,
    };
  }

  const quotaKey = buildQuotaStoreKey(resolvedKey, bucket);
  const currentQuota = quotaStore.get(quotaKey);
  const nextQuotaCount = (currentQuota?.count ?? 0) + 1;

  quotaStore.set(quotaKey, {
    count: nextQuotaCount,
    bucket,
    resetAt: quotaReset,
    lastSeenAt,
    key: resolvedKey,
    keyType,
    plan,
  });

  const matrixKey = buildMatrixStoreKey(resolvedKey, endpoint, bucket);
  const currentMatrix = usageMatrixStore.get(matrixKey);
  const nextMatrixCount = (currentMatrix?.count ?? 0) + 1;

  usageMatrixStore.set(matrixKey, {
    bucket,
    key: resolvedKey,
    endpoint,
    keyType,
    plan,
    count: nextMatrixCount,
    resetAt: quotaReset,
    lastSeenAt,
  });

  const quotaRemaining = Math.max(quotaLimit - nextQuotaCount, 0);
  const quotaExceeded = nextQuotaCount > quotaLimit;

  return {
    plan,
    quotaLimit,
    quotaRemaining,
    quotaReset,
    usageCount: nextQuotaCount,
    endpoint,
    quotaExceeded,
  };
}

export function applyQuotaHeaders(response: NextResponse, usage: UsageState) {
  response.headers.set("x-xyvala-plan", usage.plan);
  response.headers.set("x-xyvala-quota-limit", String(usage.quotaLimit));
  response.headers.set("x-xyvala-quota-remaining", String(usage.quotaRemaining));
  response.headers.set("x-xyvala-quota-reset", String(usage.quotaReset));
  response.headers.set("x-xyvala-usage-count", String(usage.usageCount));
  response.headers.set(
    "x-xyvala-quota-exceeded",
    usage.quotaExceeded ? "true" : "false"
  );

  if (usage.endpoint) {
    response.headers.set("x-xyvala-endpoint", usage.endpoint);
  }

  return response;
}

/* -------------------------------------------------------------------------- */
/*                              Admin / Analytics                             */
/* -------------------------------------------------------------------------- */

export async function listUsageByKey(input: {
  apiKey: string;
}): Promise<UsageSnapshot[]> {
  const apiKey = safeStr(input.apiKey);
  if (!apiKey) return [];

  const bucket = getCurrentBucket();
  const rows: UsageSnapshot[] = [];

  for (const record of usageMatrixStore.values()) {
    if (record.bucket !== bucket) continue;
    if (record.key !== apiKey) continue;
    rows.push(toSnapshot(record));
  }

  rows.sort(sortSnapshotsDesc);
  return rows;
}

export async function listUsageByEndpoint(input: {
  endpoint: UsageEndpoint;
}): Promise<UsageSnapshot[]> {
  const endpoint = normalizeEndpoint(input.endpoint);
  if (!endpoint) return [];

  const bucket = getCurrentBucket();
  const rows: UsageSnapshot[] = [];

  for (const record of usageMatrixStore.values()) {
    if (record.bucket !== bucket) continue;
    if (record.endpoint !== endpoint) continue;
    rows.push(toSnapshot(record));
  }

  rows.sort(sortSnapshotsDesc);
  return rows;
}

export async function getUsageTotals(): Promise<UsageTotals> {
  const bucket = getCurrentBucket();

  const currentBucketRecords: UsageMatrixRecord[] = [];
  for (const record of usageMatrixStore.values()) {
    if (record.bucket === bucket) {
      currentBucketRecords.push(record);
    }
  }

  return aggregateTotalsFromMatrix(currentBucketRecords);
}

/* -------------------------------------------------------------------------- */
/*                           Optional Internal Helpers                        */
/* -------------------------------------------------------------------------- */

export function getPlanQuotaLimit(plan: ApiPlan): number {
  return PLAN_LIMITS[plan];
}

export function getSupportedPlans(): ApiPlan[] {
  return Object.keys(PLAN_LIMITS) as ApiPlan[];
}

export function getUsageDebugState() {
  const bucket = getCurrentBucket();
  const totals = aggregateTotalsFromMatrix(
    Array.from(usageMatrixStore.values()).filter((row) => row.bucket === bucket)
  );

  return {
    bucket,
    resetAt: getCurrentResetAt(),
    quotaStoreSize: quotaStore.size,
    usageMatrixStoreSize: usageMatrixStore.size,
    totals,
  };
}
