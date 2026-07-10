/* ============================================================================
 * FILE: lib/xyvala/runtime/repositories/audit-repository.ts
 * ============================================================================
 * TITLE
 * - Xyvala audit repository
 *
 * ROLE
 * - persist audit logs in PostgreSQL
 * - isolate durable audit SQL access from runtime audit services
 * - prepare forensic timelines, compliance history and enterprise observability
 *
 * PARENTS
 * - lib/xyvala/runtime/postgres/postgres-adapter.ts
 * - lib/xyvala/runtime/migrations/schema-definitions.ts
 * - lib/xyvala/runtime/audit-log-store.ts
 *
 * DIRECTIVES
 * - durable audit persistence only
 * - no monitoring decision
 * - no security classification
 * - no organization governance
 * - no billing mutation
 * - no API key mutation
 * - no account mutation
 * - no UI logic
 * - no route response building
 * - no RFS recomputation
 * - no MCI recomputation
 * - deterministic SQL access only
 *
 * INVARIANTS
 * - audit logs are append-only by default
 * - metadata remains JSONB
 * - warnings remain JSONB
 * - repository never stores raw secrets
 * - repository never interprets business meaning
 * ========================================================================== */

import type {
  AuditLogDomain,
  AuditLogLevel,
  AuditLogRecord,
} from "@/lib/xyvala/runtime/audit-log-store";

import { postgresQuery } from "@/lib/xyvala/runtime/postgres/postgres-adapter";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type AuditRepositoryFilter = {
  domain?: AuditLogDomain | null;
  level?: AuditLogLevel | null;
  account_id?: string | null;
  actor_id?: string | null;
  request_id?: string | null;
  limit?: number | null;
};

export type AuditRepositoryStats = {
  total: number;
  debug: number;
  info: number;
  warn: number;
  error: number;
  critical: number;
};

/* ============================================================================
 * 2. HELPERS
 * ========================================================================== */

function jsonObject(value: Record<string, string | number | boolean | null>): string {
  return JSON.stringify(value && typeof value === "object" ? value : {});
}

function jsonArray(value: string[]): string {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

function parseMetadata(
  value: unknown,
): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;
  const metadata: Record<string, string | number | boolean | null> = {};

  for (const [key, item] of Object.entries(source)) {
    if (
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean" ||
      item === null
    ) {
      metadata[key] = item;
    }
  }

  return metadata;
}

function parseWarnings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeLimit(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 100;
  }

  return Math.max(1, Math.min(1_000, Math.trunc(value)));
}

/* ============================================================================
 * 3. MAPPER
 * ========================================================================== */

function rowToAuditLog(row: Record<string, unknown>): AuditLogRecord {
  return {
    id: String(row.id),
    ts: String(row.ts),

    domain: row.domain as AuditLogDomain,
    level: row.level as AuditLogLevel,
    event: String(row.event),

    actor_id: row.actor_id ? String(row.actor_id) : null,
    account_id: row.account_id ? String(row.account_id) : null,
    request_id: row.request_id ? String(row.request_id) : null,

    source: String(row.source),
    message: String(row.message),

    metadata: parseMetadata(row.metadata),
    warnings: parseWarnings(row.warnings),
  };
}

/* ============================================================================
 * 4. WRITERS
 * ========================================================================== */

export async function persistAuditLogRecord(
  record: AuditLogRecord,
): Promise<AuditLogRecord | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    INSERT INTO xyvala_audit_logs (
      id,
      ts,
      domain,
      level,
      event,
      actor_id,
      account_id,
      request_id,
      source,
      message,
      metadata,
      warnings
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11::jsonb, $12::jsonb
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING *;
    `,
    [
      record.id,
      record.ts,
      record.domain,
      record.level,
      record.event,
      record.actor_id,
      record.account_id,
      record.request_id,
      record.source,
      record.message,
      jsonObject(record.metadata),
      jsonArray(record.warnings),
    ],
  );

  return result.ok && result.rows[0] ? rowToAuditLog(result.rows[0]) : null;
}

/* ============================================================================
 * 5. READERS
 * ========================================================================== */

export async function findAuditLogRecordById(
  id: string,
): Promise<AuditLogRecord | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_audit_logs
    WHERE id = $1
    LIMIT 1;
    `,
    [id],
  );

  return result.ok && result.rows[0] ? rowToAuditLog(result.rows[0]) : null;
}

export async function listAuditLogRecords(
  filter: AuditRepositoryFilter = {},
): Promise<AuditLogRecord[]> {
  const limit = normalizeLimit(filter.limit);

  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_audit_logs
    WHERE ($1::TEXT IS NULL OR domain = $1)
      AND ($2::TEXT IS NULL OR level = $2)
      AND ($3::TEXT IS NULL OR account_id = $3)
      AND ($4::TEXT IS NULL OR actor_id = $4)
      AND ($5::TEXT IS NULL OR request_id = $5)
    ORDER BY ts DESC
    LIMIT $6;
    `,
    [
      filter.domain ?? null,
      filter.level ?? null,
      filter.account_id ?? null,
      filter.actor_id ?? null,
      filter.request_id ?? null,
      limit,
    ],
  );

  return result.ok ? result.rows.map(rowToAuditLog) : [];
}

export async function listAuditLogRecordsByAccount(
  accountId: string,
  limit = 100,
): Promise<AuditLogRecord[]> {
  return listAuditLogRecords({
    account_id: accountId,
    limit,
  });
}

export async function listAuditLogRecordsByDomain(
  domain: AuditLogDomain,
  limit = 100,
): Promise<AuditLogRecord[]> {
  return listAuditLogRecords({
    domain,
    limit,
  });
}

export async function listAuditLogRecordsByRequest(
  requestId: string,
  limit = 100,
): Promise<AuditLogRecord[]> {
  return listAuditLogRecords({
    request_id: requestId,
    limit,
  });
}

/* ============================================================================
 * 6. FORENSIC QUERIES
 * ========================================================================== */

export async function listRecentCriticalAuditLogs(
  limit = 100,
): Promise<AuditLogRecord[]> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_audit_logs
    WHERE level IN ('error', 'critical')
    ORDER BY ts DESC
    LIMIT $1;
    `,
    [normalizeLimit(limit)],
  );

  return result.ok ? result.rows.map(rowToAuditLog) : [];
}

export async function listAuditTimelineForAccount(input: {
  account_id: string;
  limit?: number | null;
}): Promise<AuditLogRecord[]> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_audit_logs
    WHERE account_id = $1 OR actor_id = $1
    ORDER BY ts DESC
    LIMIT $2;
    `,
    [input.account_id, normalizeLimit(input.limit)],
  );

  return result.ok ? result.rows.map(rowToAuditLog) : [];
}

/* ============================================================================
 * 7. STATS
 * ========================================================================== */

export async function getAuditRepositoryStats(): Promise<AuditRepositoryStats> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT
      COUNT(*)::INT AS total,
      COUNT(*) FILTER (WHERE level = 'debug')::INT AS debug,
      COUNT(*) FILTER (WHERE level = 'info')::INT AS info,
      COUNT(*) FILTER (WHERE level = 'warn')::INT AS warn,
      COUNT(*) FILTER (WHERE level = 'error')::INT AS error,
      COUNT(*) FILTER (WHERE level = 'critical')::INT AS critical
    FROM xyvala_audit_logs;
    `,
  );

  const row = result.rows[0];

  if (!result.ok || !row) {
    return {
      total: 0,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      critical: 0,
    };
  }

  return {
    total: Number(row.total ?? 0),
    debug: Number(row.debug ?? 0),
    info: Number(row.info ?? 0),
    warn: Number(row.warn ?? 0),
    error: Number(row.error ?? 0),
    critical: Number(row.critical ?? 0),
  };
}
