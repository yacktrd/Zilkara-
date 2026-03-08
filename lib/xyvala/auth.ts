// lib/xyvala/auth.ts
import { NextRequest, NextResponse } from "next/server";
import { getRegistryKey, listRegistryKeys } from "@/lib/xyvala/registry";

/* XYVALA — API Key Auth (V3 robuste)
   Objectif :
   - Authentifier les requêtes API
   - Standardiser les erreurs d'accès
   - Ajouter les headers utiles à la monétisation
   - Appliquer des quotas simples par plan
   - Respecter l’état enabled / disabled des clés
   - Permettre l’invalidation immédiate après disable-key / enable-key
   - Rester compatible avec l’architecture existante
*/

export type XyvalaPlan = "open" | "free" | "trader" | "pro" | "enterprise";

export type ApiKeyAuthSuccess = {
  ok: true;
  key: string;
  plan: XyvalaPlan;
  remainingMinute: number;
  remainingDay: number;
  usage: {
    minute: number;
    day: number;
  };
};

export type ApiKeyAuthFailure = {
  ok: false;
  key: null;
  error:
    | "missing_api_key"
    | "invalid_api_key"
    | "rate_limited"
    | "quota_exceeded";
  status: 401 | 429;
};

export type ApiKeyAuthResult = ApiKeyAuthSuccess | ApiKeyAuthFailure;

type UsageState = {
  minuteBucket: string;
  minuteCount: number;
  dayBucket: string;
  dayCount: number;
  updatedAt: number;
};

export type QuotaPolicy = {
  plan: XyvalaPlan;
  quotaPerMinute: number;
  quotaPerDay: number;
};

const HEADER_NAME = "x-xyvala-key";
const DEFAULT_PLAN: XyvalaPlan = "trader";
const MAX_KEYS_IN_MEMORY = 10_000;

export const POLICIES: Record<XyvalaPlan, QuotaPolicy> = {
  open: { plan: "open", quotaPerMinute: 20, quotaPerDay: 200 },
  free: { plan: "free", quotaPerMinute: 30, quotaPerDay: 100 },
  trader: { plan: "trader", quotaPerMinute: 120, quotaPerDay: 2_000 },
  pro: { plan: "pro", quotaPerMinute: 600, quotaPerDay: 10_000 },
  enterprise: { plan: "enterprise", quotaPerMinute: 5_000, quotaPerDay: 500_000 },
};

const usageMap = new Map<string, UsageState>();

/* --------------------------------- Utils --------------------------------- */

function safeStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function nowMs() {
  return Date.now();
}

function minuteBucketUTC(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${y}${m}${day}${h}${min}`;
}

function dayBucketUTC(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function normalizePlan(v: unknown): XyvalaPlan {
  const s = safeStr(v)?.toLowerCase();

  if (
    s === "open" ||
    s === "free" ||
    s === "trader" ||
    s === "pro" ||
    s === "enterprise"
  ) {
    return s;
  }

  // compat historique
  if (s === "starter") return "trader";

  return DEFAULT_PLAN;
}

function maybeGcUsageMap() {
  if (usageMap.size <= MAX_KEYS_IN_MEMORY) return;

  const entries = Array.from(usageMap.entries()).sort(
    (a, b) => a[1].updatedAt - b[1].updatedAt
  );

  const toDelete = Math.max(1, usageMap.size - MAX_KEYS_IN_MEMORY);

  for (let i = 0; i < toDelete; i++) {
    usageMap.delete(entries[i][0]);
  }
}

function readUsageState(key: string): UsageState {
  const currentMinute = minuteBucketUTC();
  const currentDay = dayBucketUTC();

  const prev = usageMap.get(key);

  if (!prev) {
    return {
      minuteBucket: currentMinute,
      minuteCount: 0,
      dayBucket: currentDay,
      dayCount: 0,
      updatedAt: nowMs(),
    };
  }

  const next: UsageState = { ...prev };

  if (next.minuteBucket !== currentMinute) {
    next.minuteBucket = currentMinute;
    next.minuteCount = 0;
  }

  if (next.dayBucket !== currentDay) {
    next.dayBucket = currentDay;
    next.dayCount = 0;
  }

  next.updatedAt = nowMs();
  return next;
}

function writeUsageState(key: string, state: UsageState) {
  usageMap.set(key, state);
  maybeGcUsageMap();
}

function hasRegistryKeys(): boolean {
  try {
    return listRegistryKeys().length > 0;
  } catch {
    return false;
  }
}

function getFallbackEnvSingleKey(): string | null {
  return safeStr(process.env.XYVALA_API_KEY);
}

function getFallbackEnvMultiKeys(): string[] {
  const raw = safeStr(process.env.XYVALA_API_KEYS);
  if (!raw) return [];

  return raw
    .split(",")
    .map((part) => safeStr(part))
    .filter((v): v is string => Boolean(v));
}

function hasFallbackEnvKey(key: string): boolean {
  const single = getFallbackEnvSingleKey();
  if (single && key === single) return true;

  const multi = getFallbackEnvMultiKeys();
  return multi.includes(key);
}

function getFallbackEnvPlan(): XyvalaPlan {
  return normalizePlan(process.env.XYVALA_PLAN);
}

/* ----------------------------- Key resolution ----------------------------- */

function resolveKeyConfig(key: string): {
  exists: boolean;
  enabled: boolean;
  plan: XyvalaPlan;
  source: "registry" | "env" | "open";
} {
  const registryEntry = getRegistryKey(key);

  if (registryEntry) {
    return {
      exists: true,
      enabled: registryEntry.enabled !== false,
      plan: normalizePlan(registryEntry.plan),
      source: "registry",
    };
  }

  if (hasFallbackEnvKey(key)) {
    return {
      exists: true,
      enabled: true,
      plan: getFallbackEnvPlan(),
      source: "env",
    };
  }

  const hasAnyEnvKey =
    Boolean(getFallbackEnvSingleKey()) || getFallbackEnvMultiKeys().length > 0;

  if (!hasRegistryKeys() && !hasAnyEnvKey) {
    return {
      exists: true,
      enabled: true,
      plan: "open",
      source: "open",
    };
  }

  return {
    exists: false,
    enabled: false,
    plan: DEFAULT_PLAN,
    source: "registry",
  };
}

/* ------------------------------ Public helpers ---------------------------- */

export function getPlanForKey(key: string): XyvalaPlan | null {
  const conf = resolveKeyConfig(key);
  if (!conf.exists || !conf.enabled) return null;
  return conf.plan;
}

export function getPolicyForPlan(plan: XyvalaPlan): QuotaPolicy {
  return POLICIES[plan];
}

export function getPolicyForKey(key: string): QuotaPolicy | null {
  const plan = getPlanForKey(key);
  if (!plan) return null;
  return getPolicyForPlan(plan);
}

export function invalidateAuthKey(key: string) {
  usageMap.delete(key);
}

export function resetAuthUsage(key: string) {
  usageMap.delete(key);
}

export function peekAuthUsage(key: string) {
  const state = usageMap.get(key);
  if (!state) {
    return {
      minute: 0,
      day: 0,
    };
  }

  const fresh = readUsageState(key);

  return {
    minute: fresh.minuteCount,
    day: fresh.dayCount,
  };
}

/* ------------------------------ Public API ------------------------------- */

export function validateApiKey(req: NextRequest): ApiKeyAuthResult {
  const key = req.headers.get(HEADER_NAME)?.trim() ?? "";

  if (!key) {
    return {
      ok: false,
      key: null,
      error: "missing_api_key",
      status: 401,
    };
  }

  const resolved = resolveKeyConfig(key);

  if (!resolved.exists || !resolved.enabled) {
    invalidateAuthKey(key);

    return {
      ok: false,
      key: null,
      error: "invalid_api_key",
      status: 401,
    };
  }

  const policy = POLICIES[resolved.plan];
  const usage = readUsageState(key);

  usage.minuteCount += 1;
  usage.dayCount += 1;

  if (usage.minuteCount > policy.quotaPerMinute) {
    writeUsageState(key, usage);

    return {
      ok: false,
      key: null,
      error: "rate_limited",
      status: 429,
    };
  }

  if (usage.dayCount > policy.quotaPerDay) {
    writeUsageState(key, usage);

    return {
      ok: false,
      key: null,
      error: "quota_exceeded",
      status: 429,
    };
  }

  writeUsageState(key, usage);

  return {
    ok: true,
    key,
    plan: policy.plan,
    remainingMinute: Math.max(0, policy.quotaPerMinute - usage.minuteCount),
    remainingDay: Math.max(0, policy.quotaPerDay - usage.dayCount),
    usage: {
      minute: usage.minuteCount,
      day: usage.dayCount,
    },
  };
}

export const enforceApiPolicy = validateApiKey;

/* --------------------------- Error / response API ------------------------- */

export function buildApiKeyErrorResponse(
  error: ApiKeyAuthFailure["error"],
  status: ApiKeyAuthFailure["status"]
) {
  return NextResponse.json(
    {
      ok: false,
      error,
    },
    {
      status,
      headers: {
        "cache-control": "no-store",
        "x-xyvala-auth": "failed",
      },
    }
  );
}

export function applyApiAuthHeaders(
  response: NextResponse,
  auth: ApiKeyAuthSuccess
) {
  response.headers.set("cache-control", "no-store");
  response.headers.set("x-xyvala-auth", "ok");
  response.headers.set("x-xyvala-key-present", auth.key ? "true" : "false");
  response.headers.set("x-xyvala-plan", auth.plan);
  response.headers.set("x-xyvala-remaining-minute", String(auth.remainingMinute));
  response.headers.set("x-xyvala-remaining-day", String(auth.remainingDay));
  response.headers.set("x-xyvala-usage-minute", String(auth.usage.minute));
  response.headers.set("x-xyvala-usage-day", String(auth.usage.day));

  return response;
}

/* ------------------------------- Debug helper ----------------------------- */

export function __authStats() {
  const envSingle = getFallbackEnvSingleKey();
  const envMulti = getFallbackEnvMultiKeys();

  return {
    fallbackEnvKeyConfigured: Boolean(envSingle),
    fallbackEnvKeysConfigured: envMulti.length,
    registryKeysConfigured: hasRegistryKeys(),
    trackedKeys: usageMap.size,
  };
}
