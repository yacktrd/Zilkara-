/* ============================================================================
 * FILE: lib/xyvala/runtime/repositories/analytics-repository.ts
 * ========================================================================== */

import { postgresQuery } from "@/lib/xyvala/runtime/postgres/postgres-adapter";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type AnalyticsSnapshotKind =
  | "usage"
  | "quota"
  | "runtime"
  | "billing"
  | "security"
  | "organization";

export type AnalyticsSnapshotRecord = {
  id: string;
  kind: AnalyticsSnapshotKind;

  account_id: string | null;
  organization_id: string | null;
  api_key_id: string | null;

  metric_key: string;
  metric_value: number;

  bucket_start: string;
  bucket_end: string;

  metadata: Record<string, string | number | boolean | null>;
  warnings: string[];

  created_at: string;
};

export type CreateAnalyticsSnapshotInput = Omit<
  AnalyticsSnapshotRecord,
  "id" | "created_at"
>;

/* ============================================================================
 * 2. HELPERS
 * ========================================================================== */

function jsonObject(value: Record<string, string | number | boolean | null>) {
  return JSON.stringify(value && typeof value === "object" ? value : {});
}

function jsonArray(value: string[]): string {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

function parseWarnings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function parseMetadata(
  value: unknown,
): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const output: Record<string, string | number | boolean | null> = {};

  for (const [key, item] of Object.entries(value)) {
    if (
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean" ||
      item === null
    ) {
      output[key] = item;
    }
  }

  return output;
}

function buildAnalyticsId(input: CreateAnalyticsSnapshotInput): string {
  const seed = [
    input.kind,
    input.account_id ?? "no-account",
    input.organization_id ?? "no-org",
    input.api_key_id ?? "no-key",
    input.metric_key,
    input.bucket_start,
    input.bucket_end,
  ].join(":");

  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return `analytics_${hash.toString(36)}`;
}

/* ============================================================================
 * 3. MAPPER
 * ========================================================================== */

function rowToAnalyticsSnapshot(
  row: Record<string, unknown>,
): AnalyticsSnapshotRecord {
  return {
    id: String(row.id),
    kind: row.kind as AnalyticsSnapshotKind,

    account_id: row.account_id ? String(row.account_id) : null,
    organization_id: row.organization_id ? String(row.organization_id) : null,
    api_key_id: row.api_key_id ? String(row.api_key_id) : null,

    metric_key: String(row.metric_key),
    metric_value: Number(row.metric_value ?? 0),

    bucket_start: String(row.bucket_start),
    bucket_end: String(row.bucket_end),

    metadata: parseMetadata(row.metadata),
    warnings: parseWarnings(row.warnings),

    created_at: String(row.created_at),
  };
}

/* ============================================================================
 * 4. WRITERS
 * ========================================================================== */

export async function persistAnalyticsSnapshot(
  input: CreateAnalyticsSnapshotInput,
): Promise<AnalyticsSnapshotRecord | null> {
  const id = buildAnalyticsId(input);

  const result = await postgresQuery<Record<string, unknown>>(
    `
    INSERT INTO xyvala_analytics_snapshots (
      id,
      kind,
      account_id,
      organization_id,
      api_key_id,
      metric_key,
      metric_value,
      bucket_start,
      bucket_end,
      metadata,
      warnings,
      created_at
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10::jsonb, $11::jsonb, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      metric_value = EXCLUDED.metric_value,
      metadata = EXCLUDED.metadata,
      warnings = EXCLUDED.warnings
    RETURNING *;
    `,
    [
      id,
      input.kind,
      input.account_id,
      input.organization_id,
      input.api_key_id,
      input.metric_key,
      input.metric_value,
      input.bucket_start,
      input.bucket_end,
      jsonObject(input.metadata),
      jsonArray(input.warnings),
    ],
  );

  return result.ok && result.rows[0]
    ? rowToAnalyticsSnapshot(result.rows[0])
    : null;
}

/* ============================================================================
 * 5. READERS
 * ========================================================================== */

export async function findAnalyticsSnapshotById(
  id: string,
): Promise<AnalyticsSnapshotRecord | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_analytics_snapshots
    WHERE id = $1
    LIMIT 1;
    `,
    [id],
  );

  return result.ok && result.rows[0]
    ? rowToAnalyticsSnapshot(result.rows[0])
    : null;
}

export async function listAnalyticsSnapshots(input: {
  kind?: AnalyticsSnapshotKind | null;
  account_id?: string | null;
  organization_id?: string | null;
  api_key_id?: string | null;
  metric_key?: string | null;
  limit?: number | null;
} = {}): Promise<AnalyticsSnapshotRecord[]> {
  const limit =
    typeof input.limit === "number" && Number.isFinite(input.limit)
      ? Math.max(1, Math.min(1_000, Math.trunc(input.limit)))
      : 100;

  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_analytics_snapshots
    WHERE ($1::TEXT IS NULL OR kind = $1)
      AND ($2::TEXT IS NULL OR account_id = $2)
      AND ($3::TEXT IS NULL OR organization_id = $3)
      AND ($4::TEXT IS NULL OR api_key_id = $4)
      AND ($5::TEXT IS NULL OR metric_key = $5)
    ORDER BY bucket_start DESC
    LIMIT $6;
    `,
    [
      input.kind ?? null,
      input.account_id ?? null,
      input.organization_id ?? null,
      input.api_key_id ?? null,
      input.metric_key ?? null,
      limit,
    ],
  );

  return result.ok ? result.rows.map(rowToAnalyticsSnapshot) : [];
}

/* ============================================================================
 * 6. AGGREGATES
 * ========================================================================== */

export async function sumAnalyticsMetric(input: {
  kind: AnalyticsSnapshotKind;
  metric_key: string;
  account_id?: string | null;
  organization_id?: string | null;
}): Promise<number> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT COALESCE(SUM(metric_value), 0)::FLOAT AS total
    FROM xyvala_analytics_snapshots
    WHERE kind = $1
      AND metric_key = $2
      AND ($3::TEXT IS NULL OR account_id = $3)
      AND ($4::TEXT IS NULL OR organization_id = $4);
    `,
    [
      input.kind,
      input.metric_key,
      input.account_id ?? null,
      input.organization_id ?? null,
    ],
  );

  return result.ok && result.rows[0] ? Number(result.rows[0].total ?? 0) : 0;
}
