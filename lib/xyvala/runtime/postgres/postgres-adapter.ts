
/* ============================================================================
 * FILE: lib/xyvala/runtime/postgres/postgres-adapter.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala PostgreSQL runtime adapter
 *
 * ROLE
 * - centralize PostgreSQL connection and query execution
 * - isolate durable database transport from stores and business services
 * - prepare future production-grade persistence for accounts, billing and audit
 *
 * PARENTS
 * - lib/xyvala/runtime/*
 * - lib/xyvala/accounts/*
 * - lib/xyvala/api-keys/*
 * - lib/xyvala/billing/*
 * - lib/xyvala/organizations/*
 *
 * DIRECTIVES
 * - database transport only
 * - no business logic
 * - no UI logic
 * - no route response building
 * - no account mutation rules
 * - no billing mutation rules
 * - no RBAC rules
 * - no quota rules
 * - no RFS recomputation
 * - no MCI recomputation
 * - deterministic query wrapping only
 *
 * INPUTS
 * - SQL text
 * - SQL parameters
 *
 * OUTPUTS
 * - PostgresQueryResult
 *
 * INVARIANTS
 * - DATABASE_URL is the source of database connectivity
 * - query parameters must remain separate from SQL text
 * - adapter never interprets business meaning
 * - adapter never exposes credentials
 * - failed queries return controlled errors
 * ========================================================================== */

import { Pool, type QueryResultRow } from "pg";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type PostgresQueryStatus =
  | "success"
  | "error"
  | "unavailable";

export type PostgresQueryResult<T extends QueryResultRow = QueryResultRow> = {
  ok: boolean;
  status: PostgresQueryStatus;

  rows: T[];
  row_count: number;

  warnings: string[];
  error: string | null;
};

export type PostgresHealthResult = {
  ok: boolean;
  status: PostgresQueryStatus;

  connected: boolean;
  database_configured: boolean;

  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. GLOBAL POOL
 * ========================================================================== */

declare global {
  // eslint-disable-next-line no-var
  var __XYVALA_POSTGRES_POOL__: Pool | undefined;
}

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getDatabaseUrl(): string {
  return safeString(process.env.DATABASE_URL);
}

function isDatabaseConfigured(): boolean {
  return getDatabaseUrl().length > 0;
}

function normalizeError(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "postgres_unknown_error";
}

/* ============================================================================
 * 4. POOL LIFECYCLE
 * ========================================================================== */

export function getPostgresPool(): Pool | null {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!globalThis.__XYVALA_POSTGRES_POOL__) {
    globalThis.__XYVALA_POSTGRES_POOL__ = new Pool({
      connectionString: getDatabaseUrl(),
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl:
        process.env.POSTGRES_SSL === "false"
          ? false
          : {
              rejectUnauthorized: false,
            },
    });
  }

  return globalThis.__XYVALA_POSTGRES_POOL__;
}

export async function closePostgresPool(): Promise<void> {
  if (!globalThis.__XYVALA_POSTGRES_POOL__) return;

  await globalThis.__XYVALA_POSTGRES_POOL__.end();
  globalThis.__XYVALA_POSTGRES_POOL__ = undefined;
}

/* ============================================================================
 * 5. QUERY EXECUTION
 * ========================================================================== */

export async function postgresQuery<
  T extends QueryResultRow = QueryResultRow,
>(
  sql: string,
  params: unknown[] = [],
): Promise<PostgresQueryResult<T>> {
  const pool = getPostgresPool();

  if (!pool) {
    return {
      ok: false,
      status: "unavailable",
      rows: [],
      row_count: 0,
      warnings: ["postgres_database_url_missing"],
      error: "postgres_database_url_missing",
    };
  }

  try {
    const result = await pool.query<T>(sql, params);

    return {
      ok: true,
      status: "success",
      rows: result.rows,
      row_count: result.rowCount ?? result.rows.length,
      warnings: [],
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      rows: [],
      row_count: 0,
      warnings: ["postgres_query_failed"],
      error: normalizeError(error),
    };
  }
}

/* ============================================================================
 * 6. HEALTH CHECK
 * ========================================================================== */

export async function checkPostgresHealth(): Promise<PostgresHealthResult> {
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      status: "unavailable",
      connected: false,
      database_configured: false,
      warnings: ["postgres_database_url_missing"],
      error: "postgres_database_url_missing",
    };
  }

  const result = await postgresQuery<{ health: number }>("SELECT 1 AS health");

  return {
    ok: result.ok,
    status: result.status,

    connected: result.ok,
    database_configured: true,

    warnings: result.warnings,
    error: result.error,
  };
}
