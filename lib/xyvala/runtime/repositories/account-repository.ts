/* ============================================================================
 * FILE: lib/xyvala/runtime/repositories/account-repository.ts
 * ========================================================================== */

import type {
  AccountRecord,
  AccountSession,
} from "@/lib/xyvala/accounts/account-contract";

import {
  postgresQuery,
} from "@/lib/xyvala/runtime/postgres/postgres-adapter";

/* ============================================================================
 * 1. HELPERS
 * ========================================================================== */

function jsonArray(value: string[]): string {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

function parseWarnings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/* ============================================================================
 * 2. ACCOUNT MAPPERS
 * ========================================================================== */

function rowToAccount(row: Record<string, unknown>): AccountRecord {
  return {
    id: String(row.id),

    email: String(row.email),
    email_normalized: String(row.email_normalized),
    email_verified: row.email_verified === true,

    display_name: row.display_name ? String(row.display_name) : null,

    plan: row.plan as AccountRecord["plan"],
    status: row.status as AccountRecord["status"],
    role: row.role as AccountRecord["role"],
    source: row.source as AccountRecord["source"],

    auth_provider: row.auth_provider as AccountRecord["auth_provider"],
    password_hash: row.password_hash ? String(row.password_hash) : null,

    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    last_login_at: row.last_login_at ? String(row.last_login_at) : null,

    terms_accepted_at: String(row.terms_accepted_at),
    privacy_accepted_at: String(row.privacy_accepted_at),

    default_currency: "EUR",
    jurisdiction: "FR/EU",

    warnings: parseWarnings(row.warnings),
  };
}

function rowToSession(row: Record<string, unknown>): AccountSession {
  return {
    id: String(row.id),
    account_id: String(row.account_id),

    session_token_hash: String(row.session_token_hash),
    status: row.status as AccountSession["status"],

    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    expires_at: String(row.expires_at),
    revoked_at: row.revoked_at ? String(row.revoked_at) : null,

    user_agent: row.user_agent ? String(row.user_agent) : null,
    ip_fingerprint: row.ip_fingerprint ? String(row.ip_fingerprint) : null,

    warnings: parseWarnings(row.warnings),
  };
}

/* ============================================================================
 * 3. ACCOUNT WRITERS
 * ========================================================================== */

export async function persistAccountRecord(
  account: AccountRecord,
): Promise<AccountRecord | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    INSERT INTO xyvala_accounts (
      id,
      email,
      email_normalized,
      email_verified,
      display_name,
      plan,
      status,
      role,
      source,
      auth_provider,
      password_hash,
      created_at,
      updated_at,
      last_login_at,
      terms_accepted_at,
      privacy_accepted_at,
      default_currency,
      jurisdiction,
      warnings
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15,
      $16, $17, $18, $19::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      email_normalized = EXCLUDED.email_normalized,
      email_verified = EXCLUDED.email_verified,
      display_name = EXCLUDED.display_name,
      plan = EXCLUDED.plan,
      status = EXCLUDED.status,
      role = EXCLUDED.role,
      password_hash = EXCLUDED.password_hash,
      updated_at = EXCLUDED.updated_at,
      last_login_at = EXCLUDED.last_login_at,
      warnings = EXCLUDED.warnings
    RETURNING *;
    `,
    [
      account.id,
      account.email,
      account.email_normalized,
      account.email_verified,
      account.display_name,
      account.plan,
      account.status,
      account.role,
      account.source,
      account.auth_provider,
      account.password_hash,
      account.created_at,
      account.updated_at,
      account.last_login_at,
      account.terms_accepted_at,
      account.privacy_accepted_at,
      account.default_currency,
      account.jurisdiction,
      jsonArray(account.warnings),
    ],
  );

  return result.ok && result.rows[0] ? rowToAccount(result.rows[0]) : null;
}

/* ============================================================================
 * 4. ACCOUNT READERS
 * ========================================================================== */

export async function findAccountRecordById(
  id: string,
): Promise<AccountRecord | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_accounts
    WHERE id = $1
    LIMIT 1;
    `,
    [id],
  );

  return result.ok && result.rows[0] ? rowToAccount(result.rows[0]) : null;
}

export async function findAccountRecordByEmail(
  emailNormalized: string,
): Promise<AccountRecord | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_accounts
    WHERE email_normalized = $1
    LIMIT 1;
    `,
    [emailNormalized],
  );

  return result.ok && result.rows[0] ? rowToAccount(result.rows[0]) : null;
}

export async function listAccountRecords(): Promise<AccountRecord[]> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_accounts
    ORDER BY created_at DESC;
    `,
  );

  return result.ok ? result.rows.map(rowToAccount) : [];
}

/* ============================================================================
 * 5. SESSION WRITERS
 * ========================================================================== */

export async function persistAccountSession(
  session: AccountSession,
): Promise<AccountSession | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    INSERT INTO xyvala_account_sessions (
      id,
      account_id,
      session_token_hash,
      status,
      created_at,
      updated_at,
      expires_at,
      revoked_at,
      user_agent,
      ip_fingerprint,
      warnings
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at,
      expires_at = EXCLUDED.expires_at,
      revoked_at = EXCLUDED.revoked_at,
      user_agent = EXCLUDED.user_agent,
      ip_fingerprint = EXCLUDED.ip_fingerprint,
      warnings = EXCLUDED.warnings
    RETURNING *;
    `,
    [
      session.id,
      session.account_id,
      session.session_token_hash,
      session.status,
      session.created_at,
      session.updated_at,
      session.expires_at,
      session.revoked_at,
      session.user_agent,
      session.ip_fingerprint,
      jsonArray(session.warnings),
    ],
  );

  return result.ok && result.rows[0] ? rowToSession(result.rows[0]) : null;
}

/* ============================================================================
 * 6. SESSION READERS
 * ========================================================================== */

export async function findAccountSessionById(
  id: string,
): Promise<AccountSession | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_account_sessions
    WHERE id = $1
    LIMIT 1;
    `,
    [id],
  );

  return result.ok && result.rows[0] ? rowToSession(result.rows[0]) : null;
}

export async function findAccountSessionByTokenHash(
  sessionTokenHash: string,
): Promise<AccountSession | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_account_sessions
    WHERE session_token_hash = $1
    LIMIT 1;
    `,
    [sessionTokenHash],
  );

  return result.ok && result.rows[0] ? rowToSession(result.rows[0]) : null;
}

export async function listAccountSessionsByAccount(
  accountId: string,
): Promise<AccountSession[]> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_account_sessions
    WHERE account_id = $1
    ORDER BY created_at DESC;
    `,
    [accountId],
  );

  return result.ok ? result.rows.map(rowToSession) : [];
}

/* ============================================================================
 * 7. SESSION GOVERNANCE
 * ========================================================================== */

export async function revokeAccountSessionById(
  id: string,
): Promise<AccountSession | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    UPDATE xyvala_account_sessions
    SET
      status = 'revoked',
      revoked_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
    `,
    [id],
  );

  return result.ok && result.rows[0] ? rowToSession(result.rows[0]) : null;
}
