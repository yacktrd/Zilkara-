// lib/xyvala/api-keys.ts

import type { ApiPlan } from "@/lib/xyvala/usage";

export type ApiKeyType = "internal" | "public_demo" | "legacy";

export type ApiKeyRecordType =
  | "internal"
  | "public_demo"
  | "client"
  | "legacy";

export type ApiKeyRecord = {
  key: string;
  label: string;
  plan: ApiPlan;
  type: ApiKeyRecordType;
  enabled: boolean;
  createdAt: string;
};

type RawRegistryRecord = Partial<ApiKeyRecord> & {
  key?: unknown;
  label?: unknown;
  plan?: unknown;
  type?: unknown;
  enabled?: unknown;
  createdAt?: unknown;
};

const DEFAULT_CREATED_AT = new Date(0).toISOString();

let cachedRecords: ApiKeyRecord[] | null = null;

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeKey(value: unknown): string {
  return safeStr(value);
}

function normalizeLabel(value: unknown, fallback: string): string {
  const label = safeStr(value);
  return label || fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

function isApiPlan(value: unknown): value is ApiPlan {
  return (
    value === "internal" ||
    value === "demo" ||
    value === "trader" ||
    value === "pro" ||
    value === "enterprise"
  );
}

function normalizePlan(value: unknown, fallback: ApiPlan): ApiPlan {
  return isApiPlan(value) ? value : fallback;
}

function isApiKeyRecordType(value: unknown): value is ApiKeyRecordType {
  return (
    value === "internal" ||
    value === "public_demo" ||
    value === "client" ||
    value === "legacy"
  );
}

function normalizeType(
  value: unknown,
  fallback: ApiKeyRecordType
): ApiKeyRecordType {
  return isApiKeyRecordType(value) ? value : fallback;
}

function normalizeCreatedAt(value: unknown): string {
  const raw = safeStr(value);
  return raw || DEFAULT_CREATED_AT;
}

function buildKeyRecord(input: {
  key: unknown;
  label: unknown;
  plan: unknown;
  type: unknown;
  enabled?: unknown;
  createdAt?: unknown;
  fallbackLabel: string;
  fallbackPlan: ApiPlan;
  fallbackType: ApiKeyRecordType;
}): ApiKeyRecord | null {
  const key = normalizeKey(input.key);

  if (!key) {
    return null;
  }

  const type = normalizeType(input.type, input.fallbackType);
  const plan = normalizePlan(input.plan, input.fallbackPlan);

  return {
    key,
    label: normalizeLabel(input.label, input.fallbackLabel),
    plan,
    type,
    enabled: normalizeBoolean(input.enabled, true),
    createdAt: normalizeCreatedAt(input.createdAt),
  };
}

function dedupeRecords(records: ApiKeyRecord[]): ApiKeyRecord[] {
  const seen = new Set<string>();
  const result: ApiKeyRecord[] = [];

  for (const record of records) {
    if (!record.key) continue;
    if (seen.has(record.key)) continue;

    seen.add(record.key);
    result.push(record);
  }

  return result;
}

function parseJsonRegistry(): ApiKeyRecord[] {
  const raw = safeStr(process.env.XYVALA_API_KEYS_JSON);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => {
        const item = entry as RawRegistryRecord;

        return buildKeyRecord({
          key: item.key,
          label: item.label,
          plan: item.plan,
          type: item.type,
          enabled: item.enabled,
          createdAt: item.createdAt,
          fallbackLabel: "Client",
          fallbackPlan: "trader",
          fallbackType: "client",
        });
      })
      .filter((record): record is ApiKeyRecord => Boolean(record));
  } catch {
    return [];
  }
}

function loadEnvApiKeyRecords(): ApiKeyRecord[] {
  const records: Array<ApiKeyRecord | null> = [
    buildKeyRecord({
      key: process.env.XYVALA_INTERNAL_KEY,
      label: process.env.XYVALA_INTERNAL_LABEL,
      plan: "internal",
      type: "internal",
      fallbackLabel: "Internal",
      fallbackPlan: "internal",
      fallbackType: "internal",
    }),

    buildKeyRecord({
      key: process.env.XYVALA_PUBLIC_DEMO_KEY,
      label: process.env.XYVALA_PUBLIC_DEMO_LABEL,
      plan: "demo",
      type: "public_demo",
      fallbackLabel: "Public Demo",
      fallbackPlan: "demo",
      fallbackType: "public_demo",
    }),

    buildKeyRecord({
      key: process.env.XYVALA_API_KEY,
      label: process.env.XYVALA_LEGACY_LABEL,
      plan: "trader",
      type: "legacy",
      fallbackLabel: "Legacy",
      fallbackPlan: "trader",
      fallbackType: "legacy",
    }),
  ];

  return records.filter((record): record is ApiKeyRecord => Boolean(record));
}

function loadAllApiKeyRecords(): ApiKeyRecord[] {
  const envRecords = loadEnvApiKeyRecords();
  const jsonRecords = parseJsonRegistry();

  return dedupeRecords([...envRecords, ...jsonRecords]);
}

export function getApiKeyRegistry(): ApiKeyRecord[] {
  if (cachedRecords) {
    return cachedRecords;
  }

  cachedRecords = loadAllApiKeyRecords();
  return cachedRecords;
}

export function clearApiKeyRegistryCache(): void {
  cachedRecords = null;
}

export function listApiKeyRecords(): ApiKeyRecord[] {
  return getApiKeyRegistry();
}

export function findApiKeyRecord(providedKey: string): ApiKeyRecord | null {
  const normalizedKey = normalizeKey(providedKey);

  if (!normalizedKey) {
    return null;
  }

  const records = getApiKeyRegistry();

  for (const record of records) {
    if (!record.enabled) continue;
    if (record.key === normalizedKey) {
      return record;
    }
  }

  return null;
}

export function mapRecordTypeToAuthType(type: ApiKeyRecordType): ApiKeyType {
  if (type === "internal") return "internal";
  if (type === "public_demo") return "public_demo";
  return "legacy";
}
