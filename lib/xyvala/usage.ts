// lib/xyvala/usage.ts

/**
 * XYVALA — Usage Tracking (V1 robuste)
 *
 * Objectif :
 * - mesurer l'usage par clé API
 * - mesurer l'usage par endpoint
 * - préparer quotas / facturation / analytics
 *
 * ADN :
 * - simple
 * - robuste
 * - compatible avec l'architecture actuelle
 * - prêt à migrer vers KV / DB plus tard
 */

export type UsageEndpoint =
  | "/api/scan"
  | "/api/zones"
  | "/api/decision"
  | "/api/history"
  | "/api/history/update"
  | "/api/stats"
  | "/api/assets"
  | string;

export type UsageRecord = {
  apiKey: string;
  endpoint: UsageEndpoint;

  totalCount: number;

  minuteBucket: string;
  minuteCount: number;

  dayBucket: string;
  dayCount: number;

  updatedAt: number;
};

export type UsageSnapshot = {
  apiKey: string;
  endpoint: UsageEndpoint;
  totalCount: number;
  minuteCount: number;
  dayCount: number;
  updatedAt: number;
};

const usageMap = new Map<string, UsageRecord>();
const MAX_USAGE_RECORDS = 20_000;

/* -------------------------------- Utilities ------------------------------- */

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

function makeUsageKey(apiKey: string, endpoint: UsageEndpoint) {
  return `${apiKey}::${endpoint}`;
}

function maybeGcUsage() {
  if (usageMap.size <= MAX_USAGE_RECORDS) return;

  const entries = Array.from(usageMap.entries()).sort(
    (a, b) => a[1].updatedAt - b[1].updatedAt
  );

  const toDelete = Math.max(1, usageMap.size - MAX_USAGE_RECORDS);

  for (let i = 0; i < toDelete; i++) {
    usageMap.delete(entries[i][0]);
  }
}

/* ------------------------------ Core Tracking ----------------------------- */

export async function trackUsage(input: {
  apiKey: string;
  endpoint: UsageEndpoint;
}): Promise<UsageSnapshot> {
  const { apiKey, endpoint } = input;

  const currentMinute = minuteBucketUTC();
  const currentDay = dayBucketUTC();
  const mapKey = makeUsageKey(apiKey, endpoint);

  const existing = usageMap.get(mapKey);

  let record: UsageRecord;

  if (!existing) {
    record = {
      apiKey,
      endpoint,
      totalCount: 0,
      minuteBucket: currentMinute,
      minuteCount: 0,
      dayBucket: currentDay,
      dayCount: 0,
      updatedAt: nowMs(),
    };
  } else {
    record = { ...existing };

    if (record.minuteBucket !== currentMinute) {
      record.minuteBucket = currentMinute;
      record.minuteCount = 0;
    }

    if (record.dayBucket !== currentDay) {
      record.dayBucket = currentDay;
      record.dayCount = 0;
    }
  }

  record.totalCount += 1;
  record.minuteCount += 1;
  record.dayCount += 1;
  record.updatedAt = nowMs();

  usageMap.set(mapKey, record);
  maybeGcUsage();

  return {
    apiKey: record.apiKey,
    endpoint: record.endpoint,
    totalCount: record.totalCount,
    minuteCount: record.minuteCount,
    dayCount: record.dayCount,
    updatedAt: record.updatedAt,
  };
}

/* ------------------------------ Read Helpers ------------------------------ */

export async function getUsage(input: {
  apiKey: string;
  endpoint: UsageEndpoint;
}): Promise<UsageSnapshot | null> {
  const mapKey = makeUsageKey(input.apiKey, input.endpoint);
  const record = usageMap.get(mapKey);

  if (!record) return null;

  return {
    apiKey: record.apiKey,
    endpoint: record.endpoint,
    totalCount: record.totalCount,
    minuteCount: record.minuteCount,
    dayCount: record.dayCount,
    updatedAt: record.updatedAt,
  };
}

export async function listUsageByKey(input: {
  apiKey: string;
}): Promise<UsageSnapshot[]> {
  const out: UsageSnapshot[] = [];

  for (const record of usageMap.values()) {
    if (record.apiKey !== input.apiKey) continue;

    out.push({
      apiKey: record.apiKey,
      endpoint: record.endpoint,
      totalCount: record.totalCount,
      minuteCount: record.minuteCount,
      dayCount: record.dayCount,
      updatedAt: record.updatedAt,
    });
  }

  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function listUsageByEndpoint(input: {
  endpoint: UsageEndpoint;
}): Promise<UsageSnapshot[]> {
  const out: UsageSnapshot[] = [];

  for (const record of usageMap.values()) {
    if (record.endpoint !== input.endpoint) continue;

    out.push({
      apiKey: record.apiKey,
      endpoint: record.endpoint,
      totalCount: record.totalCount,
      minuteCount: record.minuteCount,
      dayCount: record.dayCount,
      updatedAt: record.updatedAt,
    });
  }

  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getUsageTotals() {
  let records = 0;
  let totalCalls = 0;

  for (const record of usageMap.values()) {
    records += 1;
    totalCalls += record.totalCount;
  }

  return {
    records,
    totalCalls,
  };
}

export async function __usageStats() {
  const totals = await getUsageTotals();

  return {
    entries: usageMap.size,
    records: totals.records,
    totalCalls: totals.totalCalls,
  };
}
