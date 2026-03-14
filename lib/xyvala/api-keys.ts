// lib/xyvala/api-keys.ts

import type { ApiPlan } from "@/lib/xyvala/usage";

export type ApiKeyRecordType =
  | "internal"
  | "public_demo"
  | "client"
  | "legacy";

export type ApiKeyType =
  | "internal"
  | "public_demo"
  | "legacy";

export type ApiKeySource = "env" | "registry";

export type ApiKeyRecord = {
  id: string;
  key: string;
  label: string;
  plan: ApiPlan;
  type: ApiKeyRecordType;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  keySource: ApiKeySource;
};

type BuildApiKeyRecordInput = {
  key: string;
  label: string;
  plan: ApiPlan;
  type: ApiKeyRecordType;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  keySource?: ApiKeySource;
};

let cachedRecords: ApiKeyRecord[] | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

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

function normalizeIsoDate(value: unknown, fallback: string): string {
  const raw = safeStr(value);
  if (!raw) return fallback;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function buildRecordId(input: {
  type: ApiKeyRecordType;
  plan: ApiPlan;
  label: string;
}): string {
  const normalizedLabel = normalizeLabel(input.label, input.type)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `${input.type}:${input.plan}:${normalizedLabel || "key"}`;
}

function cloneRecord(record: ApiKeyRecord): ApiKeyRecord {
  return { ...record };
}

function normalizePlanForType(type: ApiKeyRecordType, plan: ApiPlan): ApiPlan {
  if (type === "internal") return "internal";
  if (type === "public_demo") return "demo";
  if (type === "legacy" && plan === "internal") return "trader";
  return plan;
}

function buildApiKeyRecord(input: BuildApiKeyRecordInput): ApiKeyRecord | null {
  const normalizedKey = normalizeKey(input.key);
  if (!normalizedKey) return null;

  const createdAtFallback = new Date(0).toISOString();
  const updatedAtFallback = nowIso();

  const label = normalizeLabel(input.label, input.type);
  const normalizedPlan = normalizePlanForType(input.type, input.plan);

  return {
    id: buildRecordId({
      type: input.type,
      plan: normalizedPlan,
      label,
    }),
    key: normalizedKey,
    label,
    plan: normalizedPlan,
    type: input.type,
    enabled: input.enabled ?? true,
    createdAt: normalizeIsoDate(input.createdAt, createdAtFallback),
    updatedAt: normalizeIsoDate(input.updatedAt, updatedAtFallback),
    keySource: input.keySource ?? "env",
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

function sortRecords(records: ApiKeyRecord[]): ApiKeyRecord[] {
  return [...records].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.plan !== b.plan) return a.plan.localeCompare(b.plan);
    return a.label.localeCompare(b.label);
  });
}

function loadEnvApiKeyRecords(): ApiKeyRecord[] {
  const records: Array<ApiKeyRecord | null> = [
    buildApiKeyRecord({
      key: process.env.XYVALA_INTERNAL_KEY ?? "",
      label: process.env.XYVALA_INTERNAL_LABEL ?? "Internal",
      plan: "internal",
      type: "internal",
      keySource: "env",
      createdAt: new Date(0).toISOString(),
    }),

    buildApiKeyRecord({
      key: process.env.XYVALA_PUBLIC_DEMO_KEY ?? "",
      label: process.env.XYVALA_PUBLIC_DEMO_LABEL ?? "Public Demo",
      plan: "demo",
      type: "public_demo",
      keySource: "env",
      createdAt: new Date(0).toISOString(),
    }),

    buildApiKeyRecord({
      key: process.env.XYVALA_API_KEY ?? "",
      label: process.env.XYVALA_LEGACY_LABEL ?? "Legacy",
      plan: "trader",
      type: "legacy",
      keySource: "env",
      createdAt: new Date(0).toISOString(),
    }),
  ];

  return sortRecords(
    dedupeRecords(records.filter((record): record is ApiKeyRecord => Boolean(record)))
  );
}

function loadRegistryRecords(): ApiKeyRecord[] {
  return [];
}

function loadApiKeyRegistry(): ApiKeyRecord[] {
  const envRecords = loadEnvApiKeyRecords();
  const registryRecords = loadRegistryRecords();

  return sortRecords(dedupeRecords([...registryRecords, ...envRecords]));
}

export function getApiKeyRegistry(): ApiKeyRecord[] {
  if (!cachedRecords) {
    cachedRecords = loadApiKeyRegistry();
  }

  return cachedRecords.map(cloneRecord);
}

export function clearApiKeyRegistryCache(): void {
  cachedRecords = null;
}

export function listApiKeyRecords(): ApiKeyRecord[] {
  return getApiKeyRegistry();
}

export function findApiKeyRecord(providedKey: string): ApiKeyRecord | null {
  const normalizedKey = normalizeKey(providedKey);
  if (!normalizedKey) return null;

  const records = getApiKeyRegistry();

  for (const record of records) {
    if (!record.enabled) continue;
    if (record.key === normalizedKey) {
      return cloneRecord(record);
    }
  }

  return null;
}

export function mapRecordTypeToAuthType(type: ApiKeyRecordType): ApiKeyType {
  if (type === "internal") return "internal";
  if (type === "public_demo") return "public_demo";
  return "legacy";
}
