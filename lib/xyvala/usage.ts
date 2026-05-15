/* ============================================================================
 * FILE: lib/xyvala/usage.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - central usage and quota tracking layer for Xyvala API routes
 * - deterministic in-memory quota engine for endpoint-level governance
 * - preserve stable quota headers and auditable usage state
 *
 * PARENTS
 * - lib/xyvala/auth.ts
 * - lib/xyvala/api-keys.ts
 * - app/api/assets/route.ts
 * - app/api/decision/route.ts
 * - app/api/scan/route.ts
 *
 * DIRECTIVES
 * - keep logic deterministic
 * - require explicit plan propagation from auth layer
 * - require endpoint traceability
 * - keep governance simple, stable and auditable
 * - no randomness
 * - no silent fallback plan inference
 *
 * INPUTS
 * - TrackUsageInput:
 *   - key
 *   - keyType
 *   - endpoint
 *   - plan
 *
 * OUTPUTS
 * - UsageState
 * - quota headers applied on NextResponse
 *
 * INVARIANTS
 * - same input state + same time bucket => same output
 * - plan is mandatory
 * - endpoint is mandatory
 * - quota values are always non-negative
 * - remaining values are always clamped to >= 0
 * - reset timestamps are always numeric
 *
 * CRITICAL DEPENDENCIES
 * - next/server
 * - @/lib/xyvala/api-keys
 *
 * SENSITIVE ZONES
 * - auth -> usage contract propagation
 * - quota thresholds
 * - reset window logic
 * - header contract stability
 * ========================================================================== */

import { NextResponse } from "next/server";
import type { ApiKeyType } from "@/lib/xyvala/api-keys";

/* ============================================================================
 * 1. PUBLIC TYPES
 * ========================================================================== */

export type ApiPlan =
  | "internal"
  | "demo"
  | "trader"
  | "pro"
  | "enterprise";

export type TrackUsageInput = {
  key: string;
  keyType: ApiKeyType | string;
  endpoint: string;
  plan: ApiPlan;
};

export type UsageState = {
  key: string;
  plan: ApiPlan;
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
};

export type UsageSnapshot = {
  key: string;
  plan: ApiPlan;
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
};

export type UsageTotals = {
  keys: number;
  totalRequests: number;
  totalMinuteUsage: number;
  totalDayUsage: number;
};

/* ============================================================================
 * 2. INTERNAL TYPES
 * ========================================================================== */

type Bucket = {
  count: number;
  resetAt: number;
};

type Entry = {
  total: number;
  minute: Bucket;
  day: Bucket;
  plan: ApiPlan;
  keyType: string;
  lastEndpoint: string;
};

/* ============================================================================
 * 3. CONSTANTS
 * ========================================================================== */

const store = new Map<string, Entry>();

const PLAN_LIMITS: Record<ApiPlan, { minute: number; day: number }> = {
  internal: { minute: 1_000_000_000, day: 1_000_000_000 },
  demo: { minute: 20, day: 100 },
  trader: { minute: 300, day: 5_000 },
  pro: { minute: 2_000, day: 50_000 },
  enterprise: { minute: 1_000_000_000, day: 1_000_000_000 },
};

/* ============================================================================
 * 4. LOW-LEVEL HELPERS
 * ========================================================================== */

function now(): number {
  return Date.now();
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeString(value: unknown, fallback = ""): string {
  return isNonEmptyString(value) ? value.trim() : fallback;
}

function clampToNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function minuteReset(ts: number): number {
  const d = new Date(ts);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  return d.getTime();
}

function dayReset(ts: number): number {
  const d = new Date(ts);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

function isValidPlan(value: unknown): value is ApiPlan {
  return (
    value === "internal" ||
    value === "demo" ||
    value === "trader" ||
    value === "pro" ||
    value === "enterprise"
  );
}

function assertValidTrackUsageInput(input: TrackUsageInput): void {
  if (!isNonEmptyString(input.key)) {
    throw new Error("trackUsage requires a non-empty key");
  }

  if (!isNonEmptyString(input.keyType)) {
    throw new Error("trackUsage requires a non-empty keyType");
  }

  if (!isNonEmptyString(input.endpoint)) {
    throw new Error("trackUsage requires a non-empty endpoint");
  }

  if (!isValidPlan(input.plan)) {
    throw new Error("trackUsage requires a valid plan");
  }
}

function createEmptyEntry(input: TrackUsageInput, ts: number): Entry {
  return {
    total: 0,
    minute: {
      count: 0,
      resetAt: minuteReset(ts),
    },
    day: {
      count: 0,
      resetAt: dayReset(ts),
    },
    plan: input.plan,
    keyType: normalizeString(input.keyType),
    lastEndpoint: input.endpoint,
  };
}

function ensure(entry: Entry, ts: number): Entry {
  if (ts >= entry.minute.resetAt) {
    entry.minute = {
      count: 0,
      resetAt: minuteReset(ts),
    };
  }

  if (ts >= entry.day.resetAt) {
    entry.day = {
      count: 0,
      resetAt: dayReset(ts),
    };
  }

  return entry;
}

function buildUsageState(
  input: TrackUsageInput,
  entry: Entry,
): UsageState {
  const limits = PLAN_LIMITS[input.plan];

  const remainingMinute = clampToNonNegative(limits.minute - entry.minute.count);
  const remainingDay = clampToNonNegative(limits.day - entry.day.count);

  const quotaExceeded =
    entry.minute.count > limits.minute ||
    entry.day.count > limits.day;

  return {
    key: input.key,
    plan: input.plan,
    keyType: normalizeString(input.keyType),
    endpoint: input.endpoint,
    usageCount: entry.total,
    usageMinute: entry.minute.count,
    usageDay: entry.day.count,
    quotaMinute: limits.minute,
    quotaDay: limits.day,
    remainingMinute,
    remainingDay,
    quotaExceeded,
    resetMinute: entry.minute.resetAt,
    resetDay: entry.day.resetAt,
  };
}

/* ============================================================================
 * 5. CORE ENGINE
 * ========================================================================== */

export function trackUsage(input: TrackUsageInput): UsageState {
  assertValidTrackUsageInput(input);

  const ts = now();
  const existing = store.get(input.key) ?? createEmptyEntry(input, ts);
  const entry = ensure(existing, ts);

  entry.total += 1;
  entry.minute.count += 1;
  entry.day.count += 1;

  entry.plan = input.plan;
  entry.keyType = normalizeString(input.keyType);
  entry.lastEndpoint = input.endpoint;

  store.set(input.key, entry);

  return buildUsageState(input, entry);
}

/* ============================================================================
 * 6. READ HELPERS
 * ========================================================================== */

export function getUsageSnapshot(input: {
  key: string;
  keyType: ApiKeyType | string;
  endpoint: string;
  plan: ApiPlan;
}): UsageSnapshot {
  assertValidTrackUsageInput(input);

  const ts = now();
  const existing = store.get(input.key) ?? createEmptyEntry(input, ts);
  const entry = ensure(existing, ts);

  return buildUsageState(input, entry);
}

export function listUsageByKey(): UsageSnapshot[] {
  return Array.from(store.entries()).map(([key, entry]) => {
    const limits = PLAN_LIMITS[entry.plan];
    const remainingMinute = clampToNonNegative(limits.minute - entry.minute.count);
    const remainingDay = clampToNonNegative(limits.day - entry.day.count);

    return {
      key,
      plan: entry.plan,
      keyType: entry.keyType,
      endpoint: entry.lastEndpoint,
      usageCount: entry.total,
      usageMinute: entry.minute.count,
      usageDay: entry.day.count,
      quotaMinute: limits.minute,
      quotaDay: limits.day,
      remainingMinute,
      remainingDay,
      quotaExceeded:
        entry.minute.count > limits.minute ||
        entry.day.count > limits.day,
      resetMinute: entry.minute.resetAt,
      resetDay: entry.day.resetAt,
    };
  });
}

export function listUsageByEndpoint(): Array<{
  endpoint: string;
  requests: number;
}> {
  const totals = new Map<string, number>();

  for (const entry of store.values()) {
    const current = totals.get(entry.lastEndpoint) ?? 0;
    totals.set(entry.lastEndpoint, current + entry.total);
  }

  return Array.from(totals.entries()).map(([endpoint, requests]) => ({
    endpoint,
    requests,
  }));
}

export function getUsageTotals(): UsageTotals {
  let totalRequests = 0;
  let totalMinuteUsage = 0;
  let totalDayUsage = 0;

  for (const entry of store.values()) {
    totalRequests += entry.total;
    totalMinuteUsage += entry.minute.count;
    totalDayUsage += entry.day.count;
  }

  return {
    keys: store.size,
    totalRequests,
    totalMinuteUsage,
    totalDayUsage,
  };
}

/* ============================================================================
 * 7. RESPONSE HEADERS
 * ========================================================================== */

export function applyQuotaHeaders<T>(
  res: NextResponse<T>,
  usage: UsageState,
): NextResponse<T> {
  res.headers.set("x-xyvala-plan", usage.plan);
  res.headers.set("x-xyvala-endpoint", usage.endpoint);
  res.headers.set("x-xyvala-usage-minute", String(usage.usageMinute));
  res.headers.set("x-xyvala-usage-day", String(usage.usageDay));
  res.headers.set("x-xyvala-remaining-minute", String(usage.remainingMinute));
  res.headers.set("x-xyvala-remaining-day", String(usage.remainingDay));
  res.headers.set(
    "x-xyvala-quota-exceeded",
    usage.quotaExceeded ? "true" : "false",
  );

  return res;
}
