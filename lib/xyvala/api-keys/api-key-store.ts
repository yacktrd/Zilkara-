/* ============================================================================
 * FILE: lib/xyvala/api-keys/api-key-store.ts
 * ========================================================================== */

import {
  apiKeyRecordToPublicApiKey,
  type ApiKeyRecord,
  type CreateApiKeyInput,
  type PublicApiKey,
  type UpdateApiKeyInput,
} from "@/lib/xyvala/api-keys/api-key-contract";

import {
  extractApiKeyPrefix,
  hashApiKey,
} from "@/lib/xyvala/api-keys/api-key-auth";

/* ============================================================================
 * 1. GLOBAL STORE
 * ========================================================================== */

type ApiKeyStoreState = {
  keys: Map<string, ApiKeyRecord>;
  keysByHash: Map<string, string>;
  keysByAccount: Map<string, Set<string>>;
};

declare global {
  // eslint-disable-next-line no-var
  var __XYVALA_API_KEY_STORE__: ApiKeyStoreState | undefined;
}

function getStore(): ApiKeyStoreState {
  if (!globalThis.__XYVALA_API_KEY_STORE__) {
    globalThis.__XYVALA_API_KEY_STORE__ = {
      keys: new Map(),
      keysByHash: new Map(),
      keysByAccount: new Map(),
    };
  }

  return globalThis.__XYVALA_API_KEY_STORE__;
}

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  return [
    ...new Set(
      groups
        .flatMap((group) => (Array.isArray(group) ? group : []))
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        ),
    ),
  ];
}

function buildId(prefix: string, seed: string): string {
  const normalized = safeString(seed)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return `${prefix}_${normalized || "record"}_${hash.toString(36)}`;
}

function cloneApiKey(record: ApiKeyRecord): ApiKeyRecord {
  return {
    ...record,
    permissions: [...record.permissions],
    warnings: [...record.warnings],
  };
}

function indexAccountKey(record: ApiKeyRecord): void {
  if (!record.account_id) return;

  const store = getStore();
  const current = store.keysByAccount.get(record.account_id) ?? new Set<string>();

  current.add(record.id);
  store.keysByAccount.set(record.account_id, current);
}

/* ============================================================================
 * 3. READERS
 * ========================================================================== */

export function findApiKeyById(id: string): ApiKeyRecord | null {
  const record = getStore().keys.get(safeString(id));

  return record ? cloneApiKey(record) : null;
}

export function findApiKeyByHash(keyHash: string): ApiKeyRecord | null {
  const id = getStore().keysByHash.get(safeString(keyHash));

  if (!id) return null;

  return findApiKeyById(id);
}

export function findApiKeyByRawKey(rawKey: string): ApiKeyRecord | null {
  const key = safeString(rawKey);

  if (!key) return null;

  return findApiKeyByHash(hashApiKey(key));
}

export function listApiKeys(): ApiKeyRecord[] {
  return [...getStore().keys.values()].map(cloneApiKey);
}

export function listPublicApiKeys(): PublicApiKey[] {
  return listApiKeys().map(apiKeyRecordToPublicApiKey);
}

export function listApiKeysByAccount(accountId: string): ApiKeyRecord[] {
  const normalizedAccountId = safeString(accountId);
  const ids = getStore().keysByAccount.get(normalizedAccountId);

  if (!ids) return [];

  return [...ids]
    .map((id) => findApiKeyById(id))
    .filter((record): record is ApiKeyRecord => record !== null);
}

export function listPublicApiKeysByAccount(accountId: string): PublicApiKey[] {
  return listApiKeysByAccount(accountId).map(apiKeyRecordToPublicApiKey);
}

/* ============================================================================
 * 4. WRITERS
 * ========================================================================== */

export function createApiKeyRecord(input: CreateApiKeyInput): ApiKeyRecord | null {
  const store = getStore();

  const rawKey = safeString(input.raw_key);
  const label = safeString(input.label) || "API Key";

  if (!rawKey) return null;

  const keyHash = hashApiKey(rawKey);

  if (store.keysByHash.has(keyHash)) {
    return null;
  }

  const timestamp = nowIso();

  const record: ApiKeyRecord = {
    id: buildId(
      "ak",
      `${input.account_id ?? "system"}:${label}:${extractApiKeyPrefix(rawKey)}`,
    ),

    account_id: input.account_id,

    label,
    key_hash: keyHash,
    key_prefix: extractApiKeyPrefix(rawKey),

    kind: input.kind,
    status: "active",

    plan: input.plan,
    compartment: input.compartment,
    permissions: [...input.permissions],

    created_at: timestamp,
    updated_at: timestamp,
    expires_at: input.expires_at ?? null,
    last_used_at: null,
    revoked_at: null,

    warnings: uniqueWarnings(input.warnings),
  };

  store.keys.set(record.id, record);
  store.keysByHash.set(record.key_hash, record.id);
  indexAccountKey(record);

  return cloneApiKey(record);
}

export function updateApiKeyRecord(input: UpdateApiKeyInput): ApiKeyRecord | null {
  const store = getStore();
  const existing = store.keys.get(safeString(input.id));

  if (!existing) return null;

  const updated: ApiKeyRecord = {
    ...existing,

    label:
      input.label === undefined
        ? existing.label
        : safeString(input.label) || existing.label,

    status: input.status ?? existing.status,

    last_used_at:
      input.last_used_at === undefined
        ? existing.last_used_at
        : input.last_used_at,

    revoked_at:
      input.revoked_at === undefined
        ? existing.revoked_at
        : input.revoked_at,

    updated_at: nowIso(),

    warnings: uniqueWarnings(existing.warnings, input.warnings),
  };

  store.keys.set(updated.id, updated);
  store.keysByHash.set(updated.key_hash, updated.id);
  indexAccountKey(updated);

  return cloneApiKey(updated);
}

/* ============================================================================
 * 5. GOVERNANCE
 * ========================================================================== */

export function markApiKeyUsed(id: string): ApiKeyRecord | null {
  return updateApiKeyRecord({
    id,
    last_used_at: nowIso(),
    warnings: ["api_key_used"],
  });
}

export function revokeApiKey(id: string): ApiKeyRecord | null {
  return updateApiKeyRecord({
    id,
    status: "revoked",
    revoked_at: nowIso(),
    warnings: ["api_key_revoked"],
  });
}

export function disableApiKey(id: string): ApiKeyRecord | null {
  return updateApiKeyRecord({
    id,
    status: "disabled",
    warnings: ["api_key_disabled"],
  });
}

export function expireApiKeyIfNeeded(record: ApiKeyRecord | null): ApiKeyRecord | null {
  if (!record) return null;

  if (!record.expires_at || record.status !== "active") {
    return record;
  }

  const expiresAt = new Date(record.expires_at).getTime();

  if (!Number.isFinite(expiresAt) || expiresAt > Date.now()) {
    return record;
  }

  return updateApiKeyRecord({
    id: record.id,
    status: "expired",
    warnings: ["api_key_expired"],
  });
}

export function isApiKeyUsable(record: ApiKeyRecord | null): boolean {
  const current = expireApiKeyIfNeeded(record);

  return current?.status === "active";
}

/* ============================================================================
 * 6. STORE STATS
 * ========================================================================== */

export function getApiKeyStoreStats(): {
  total: number;
  active: number;
  revoked: number;
  disabled: number;
  expired: number;
} {
  const records = listApiKeys();

  return {
    total: records.length,
    active: records.filter((record) => record.status === "active").length,
    revoked: records.filter((record) => record.status === "revoked").length,
    disabled: records.filter((record) => record.status === "disabled").length,
    expired: records.filter((record) => record.status === "expired").length,
  };
}

export function clearApiKeyStore(): void {
  const store = getStore();

  store.keys.clear();
  store.keysByHash.clear();
  store.keysByAccount.clear();
}
