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

type DailyUsageRecord = {
  count: number;
  bucket: string;
  resetAt: number;
};

const PLAN_LIMITS: Readonly<Record<ApiPlan, number>> = Object.freeze({
  internal: 1_000_000_000,
  demo: 100,
  trader: 5_000,
  pro: 50_000,
  enterprise: 1_000_000_000,
});

const usageStore = new Map<string, DailyUsageRecord>();

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getResolvedKey(input: TrackUsageInput): string {
  return safeStr(input.key) || safeStr(input.apiKey);
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

  return "trader";
}

function resolvePlan(input: TrackUsageInput, resolvedKey: string): ApiPlan {
  if (input.planOverride) {
    return input.planOverride;
  }

  const explicitKeyType = safeStr(input.keyType);
  if (explicitKeyType) {
    return resolvePlanFromKeyType(explicitKeyType);
  }

  const inferred = inferKeyTypeFromEnv(resolvedKey);
  return resolvePlanFromKeyType(inferred);
}

function buildUsageStoreKey(key: string, bucket: string): string {
  return `${bucket}:${key}`;
}

function cleanupUsageStore(currentBucket: string) {
  if (usageStore.size < 500) return;

  for (const [storeKey, record] of usageStore.entries()) {
    if (record.bucket !== currentBucket) {
      usageStore.delete(storeKey);
    }
  }
}

export function trackUsage(input: TrackUsageInput): UsageState {
  const now = new Date();
  const bucket = getTodayBucketUtc(now);
  const quotaReset = getNextUtcMidnightTimestamp(now);

  cleanupUsageStore(bucket);

  const resolvedKey = getResolvedKey(input);
  const endpoint = safeStr(input.endpoint) || null;
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

  const usageKey = buildUsageStoreKey(resolvedKey, bucket);
  const current = usageStore.get(usageKey);

  const nextCount = (current?.count ?? 0) + 1;

  usageStore.set(usageKey, {
    count: nextCount,
    bucket,
    resetAt: quotaReset,
  });

  const quotaRemaining = Math.max(quotaLimit - nextCount, 0);
  const quotaExceeded = nextCount > quotaLimit;

  return {
    plan,
    quotaLimit,
    quotaRemaining,
    quotaReset,
    usageCount: nextCount,
    endpoint,
    quotaExceeded,
  };
}

export function applyQuotaHeaders(
  response: NextResponse,
  usage: UsageState
) {
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
