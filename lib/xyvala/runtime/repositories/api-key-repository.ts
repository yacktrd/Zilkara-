/* ============================================================================
 * FILE: lib/xyvala/runtime/repositories/api-key-repository.ts
 * ============================================================================
 * TITLE
 * - Xyvala API key repository
 *
 * ROLE
 * - persist API keys in PostgreSQL
 * - isolate durable API key SQL access from runtime stores and services
 * - prepare distributed API governance, quota analytics and enterprise access
 *
 * PARENTS
 * - lib/xyvala/runtime/postgres/postgres-adapter.ts
 * - lib/xyvala/runtime/migrations/schema-definitions.ts
 * - lib/xyvala/api-keys/api-key-contract.ts
 *
 * DIRECTIVES
 * - durable API key persistence only
 * - no API key generation
 * - no API key hashing
 * - no quota decision
 * - no usage decision
 * - no RBAC decision
 * - no billing logic
 * - no UI logic
 * - no route response building
 * - no RFS recomputation
 * - no MCI recomputation
 * - deterministic SQL access only
 *
 * INVARIANTS
 * - raw API keys are never persisted
 * - key_hash is never exposed publicly
 * - permissions remain JSONB
 * - warnings remain JSONB
 * - repository never interprets business meaning
 * ========================================================================== */

import type {
  ApiKeyPermission,
  ApiKeyRecord,
} from "@/lib/xyvala/api-keys/api-key-contract";

import { postgresQuery } from "@/lib/xyvala/runtime/postgres/postgres-adapter";

/* ============================================================================
 * 1. HELPERS
 * ========================================================================== */

function jsonArray(value: string[]): string {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function parsePermissions(value: unknown): ApiKeyPermission[] {
  return parseStringArray(value) as ApiKeyPermission[];
}

/* ============================================================================
 * 2. MAPPER
 * ========================================================================== */

function rowToApiKey(row: Record<string, unknown>): ApiKeyRecord {
  return {
    id: String(row.id),
    account_id: row.account_id ? String(row.account_id) : null,

    label: String(row.label),
    key_hash: String(row.key_hash),
    key_prefix: String(row.key_prefix),

    kind: row.kind as ApiKeyRecord["kind"],
    status: row.status as ApiKeyRecord["status"],

    plan: row.plan as ApiKeyRecord["plan"],
    compartment: row.compartment as ApiKeyRecord["compartment"],
    permissions: parsePermissions(row.permissions),

    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    expires_at: row.expires_at ? String(row.expires_at) : null,
    last_used_at: row.last_used_at ? String(row.last_used_at) : null,
    revoked_at: row.revoked_at ? String(row.revoked_at) : null,

    warnings: parseStringArray(row.warnings),
  };
}

/* ============================================================================
 * 3. WRITERS
 * ========================================================================== */

export async function persistApiKeyRecord(
  apiKey: ApiKeyRecord,
): Promise<ApiKeyRecord | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    INSERT INTO xyvala_api_keys (
      id,
      account_id,
      label,
      key_hash,
      key_prefix,
      kind,
      status,
      plan,
      compartment,
      permissions,
      created_at,
      updated_at,
      expires_at,
      last_used_at,
      revoked_at,
      warnings
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10::jsonb,
      $11, $12, $13, $14, $15,
      $16::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      account_id = EXCLUDED.account_id,
      label = EXCLUDED.label,
      key_hash = EXCLUDED.key_hash,
      key_prefix = EXCLUDED.key_prefix,
      kind = EXCLUDED.kind,
      status = EXCLUDED.status,
      plan = EXCLUDED.plan,
      compartment = EXCLUDED.compartment,
      permissions = EXCLUDED.permissions,
      updated_at = EXCLUDED.updated_at,
      expires_at = EXCLUDED.expires_at,
      last_used_at = EXCLUDED.last_used_at,
      revoked_at = EXCLUDED.revoked_at,
      warnings = EXCLUDED.warnings
    RETURNING *;
    `,
    [
      apiKey.id,
      apiKey.account_id,
      apiKey.label,
      apiKey.key_hash,
      apiKey.key_prefix,
      apiKey.kind,
      apiKey.status,
      apiKey.plan,
      apiKey.compartment,
      jsonArray(apiKey.permissions),
      apiKey.created_at,
      apiKey.updated_at,
      apiKey.expires_at,
      apiKey.last_used_at,
      apiKey.revoked_at,
      jsonArray(apiKey.warnings),
    ],
  );

  return result.ok && result.rows[0] ? rowToApiKey(result.rows[0]) : null;
}

/* ============================================================================
 * 4. READERS
 * ========================================================================== */

export async function findApiKeyRecordById(
  id: string,
): Promise<ApiKeyRecord | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_api_keys
    WHERE id = $1
    LIMIT 1;
    `,
    [id],
  );

  return result.ok && result.rows[0] ? rowToApiKey(result.rows[0]) : null;
}

export async function findApiKeyRecordByHash(
  keyHash: string,
): Promise<ApiKeyRecord | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_api_keys
    WHERE key_hash = $1
    LIMIT 1;
    `,
    [keyHash],
  );

  return result.ok && result.rows[0] ? rowToApiKey(result.rows[0]) : null;
}

export async function listApiKeyRecordsByAccount(
  accountId: string,
): Promise<ApiKeyRecord[]> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_api_keys
    WHERE account_id = $1
    ORDER BY created_at DESC;
    `,
    [accountId],
  );

  return result.ok ? result.rows.map(rowToApiKey) : [];
}

export async function listApiKeyRecords(): Promise<ApiKeyRecord[]> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_api_keys
    ORDER BY created_at DESC;
    `,
  );

  return result.ok ? result.rows.map(rowToApiKey) : [];
}

/* ============================================================================
 * 5. GOVERNANCE PERSISTENCE
 * ========================================================================== */

export async function markApiKeyRecordUsed(
  id: string,
): Promise<ApiKeyRecord | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    UPDATE xyvala_api_keys
    SET
      last_used_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
    `,
    [id],
  );

  return result.ok && result.rows[0] ? rowToApiKey(result.rows[0]) : null;
}

export async function revokeApiKeyRecord(
  id: string,
): Promise<ApiKeyRecord | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    UPDATE xyvala_api_keys
    SET
      status = 'revoked',
      revoked_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
    `,
    [id],
  );

  return result.ok && result.rows[0] ? rowToApiKey(result.rows[0]) : null;
}

export async function disableApiKeyRecord(
  id: string,
): Promise<ApiKeyRecord | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    UPDATE xyvala_api_keys
    SET
      status = 'disabled',
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
    `,
    [id],
  );

  return result.ok && result.rows[0] ? rowToApiKey(result.rows[0]) : null;
}
