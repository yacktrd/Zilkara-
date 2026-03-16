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
  | "client"
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

type RegistryLoadResult = {
  records: ApiKeyRecord[];
};

let cachedRegistry: RegistryLoadResult | null = null;

const EPOCH_ISO = new Date(0).toISOString();

function nowIso(): string {
  return new Date().toISOString();
}

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeKey(value: unknown): string {
  const normalized = safeStr(value);

  if (!normalized) return "";
  if (normalized.includes(" ")) return "";
  if (normalized.length < 8) return "";

  return normalized;
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

function normalizePlanForType(type: ApiKeyRecordType, plan: ApiPlan): ApiPlan {
  if (type === "internal") return "internal";
  if (type === "public_demo") return "demo";
  if (type === "legacy" && plan === "internal") return "trader";
  return plan;
}

function buildKeyFingerprint(key: string): string {
  const source = normalizeKey(key);
  if (!source) return "invalid";

  let hash = 0;

  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }

  return hash.toString(36).padStart(7, "0");
}

function buildRecordId(input: {
  key: string;
  type: ApiKeyRecordType;
  plan: ApiPlan;
  label: string;
}): string {
  const normalizedLabel = normalizeLabel(input.label, input.type)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  const fingerprint = buildKeyFingerprint(input.key);

  return `${input.type}:${input.plan}:${normalizedLabel || "key"}:${fingerprint}`;
}

function cloneRecord(record: ApiKeyRecord): ApiKeyRecord {
  return { ...record };
}

function buildApiKeyRecord(input: BuildApiKeyRecordInput): ApiKeyRecord | null {
  const normalizedKey = normalizeKey(input.key);
  if (!normalizedKey) return null;

  const label = normalizeLabel(input.label, input.type);
  const normalizedPlan = normalizePlanForType(input.type, input.plan);

  return {
    id: buildRecordId({
      key: normalizedKey,
      type: input.type,
      plan: normalizedPlan,
      label,
    }),
    key: normalizedKey,
    label,
    plan: normalizedPlan,
    type: input.type,
    enabled: input.enabled ?? true,
    createdAt: normalizeIsoDate(input.createdAt, EPOCH_ISO),
    updatedAt: normalizeIsoDate(input.updatedAt, nowIso()),
    keySource: input.keySource ?? "env",
  };
}

function getTypeRank(type: ApiKeyRecordType): number {
  if (type === "internal") return 0;
  if (type === "client") return 1;
  if (type === "legacy") return 2;
  return 3;
}

function getSourceRank(source: ApiKeySource): number {
  if (source === "registry") return 0;
  return 1;
}

function compareRecords(a: ApiKeyRecord, b: ApiKeyRecord): number {
  const typeRankDiff = getTypeRank(a.type) - getTypeRank(b.type);
  if (typeRankDiff !== 0) return typeRankDiff;

  const sourceRankDiff = getSourceRank(a.keySource) - getSourceRank(b.keySource);
  if (sourceRankDiff !== 0) return sourceRankDiff;

  if (a.plan !== b.plan) return a.plan.localeCompare(b.plan);
  if (a.label !== b.label) return a.label.localeCompare(b.label);
  return a.id.localeCompare(b.id);
}

function sortRecords(records: ApiKeyRecord[]): ApiKeyRecord[] {
  return [...records].sort(compareRecords);
}

function choosePreferredRecord(current: ApiKeyRecord, incoming: ApiKeyRecord): ApiKeyRecord {
  if (getSourceRank(incoming.keySource) < getSourceRank(current.keySource)) {
    return incoming;
  }

  if (getSourceRank(incoming.keySource) > getSourceRank(current.keySource)) {
    return current;
  }

  if (incoming.enabled && !current.enabled) {
    return incoming;
  }

  if (!incoming.enabled && current.enabled) {
    return current;
  }

  if (getTypeRank(incoming.type) < getTypeRank(current.type)) {
    return incoming;
  }

  if (getTypeRank(incoming.type) > getTypeRank(current.type)) {
    return current;
  }

  if (incoming.updatedAt > current.updatedAt) {
    return incoming;
  }

  return current;
}

function dedupeRecords(records: ApiKeyRecord[]): ApiKeyRecord[] {
  const byKey = new Map<string, ApiKeyRecord>();

  for (const record of records) {
    if (!record.key) continue;

    const existing = byKey.get(record.key);

    if (!existing) {
      byKey.set(record.key, record);
      continue;
    }

    byKey.set(record.key, choosePreferredRecord(existing, record));
  }

  return sortRecords([...byKey.values()]);
}

function loadEnvApiKeyRecords(): ApiKeyRecord[] {
  const records: Array<ApiKeyRecord | null> = [
    buildApiKeyRecord({
      key: process.env.XYVALA_INTERNAL_KEY ?? "",
      label: process.env.XYVALA_INTERNAL_LABEL ?? "Internal",
      plan: "internal",
      type: "internal",
      keySource: "env",
      createdAt: EPOCH_ISO,
      updatedAt: nowIso(),
    }),

    buildApiKeyRecord({
      key: process.env.XYVALA_PUBLIC_DEMO_KEY ?? "",
      label: process.env.XYVALA_PUBLIC_DEMO_LABEL ?? "Public Demo",
      plan: "demo",
      type: "public_demo",
      keySource: "env",
      createdAt: EPOCH_ISO,
      updatedAt: nowIso(),
    }),

    buildApiKeyRecord({
      key: process.env.XYVALA_API_KEY ?? "",
      label: process.env.XYVALA_LEGACY_LABEL ?? "Legacy",
      plan: "trader",
      type: "legacy",
      keySource: "env",
      createdAt: EPOCH_ISO,
      updatedAt: nowIso(),
    }),
  ];

  return dedupeRecords(
    records.filter((record): record is ApiKeyRecord => Boolean(record))
  );
}

function loadRegistryRecords(): ApiKeyRecord[] {
  return [];
}

function loadApiKeyRegistry(): RegistryLoadResult {
  const registryRecords = loadRegistryRecords();
  const envRecords = loadEnvApiKeyRecords();

  const records = dedupeRecords([...registryRecords, ...envRecords]);

  return {
    records,
  };
}

export function getApiKeyRegistry(): ApiKeyRecord[] {
  if (!cachedRegistry) {
    cachedRegistry = loadApiKeyRegistry();
  }

  return cachedRegistry.records.map(cloneRecord);
}

export function clearApiKeyRegistryCache(): void {
  cachedRegistry = null;
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
    if (record.key !== normalizedKey) continue;
    return cloneRecord(record);
  }

  return null;
}

export function mapRecordTypeToAuthType(type: ApiKeyRecordType): ApiKeyType {
  if (type === "internal") return "internal";
  if (type === "public_demo") return "public_demo";
  if (type === "client") return "client";
  return "legacy";
}
