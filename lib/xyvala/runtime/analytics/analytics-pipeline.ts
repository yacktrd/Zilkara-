/* ============================================================================
 * FILE: lib/xyvala/runtime/analytics/analytics-pipeline.ts
 * ============================================================================
 * TITLE
 * - Xyvala runtime analytics pipeline
 *
 * ROLE
 * - aggregate runtime analytics snapshots
 * - normalize usage, quota, billing, security and organization metrics
 * - persist analytics snapshots through the durable analytics repository
 *
 * PARENTS
 * - lib/xyvala/runtime/repositories/analytics-repository.ts
 * - lib/xyvala/runtime/repositories/audit-repository.ts
 * - lib/xyvala/api-keys/usage-store.ts
 * - lib/xyvala/organizations/organization-quota-service.ts
 *
 * DIRECTIVES
 * - analytics aggregation only
 * - no UI logic
 * - no route response building
 * - no billing mutation
 * - no account mutation
 * - no API key mutation
 * - no organization mutation
 * - no quota decision mutation
 * - no RFS recomputation
 * - no MCI recomputation
 * - deterministic aggregation only
 *
 * INVARIANTS
 * - analytics snapshots are normalized before persistence
 * - metrics are non-negative
 * - bucket boundaries are explicit
 * - pipeline never exposes raw secrets
 * - persistence goes through analytics-repository only
 * ========================================================================== */

import {
  persistAnalyticsSnapshot,
  type AnalyticsSnapshotKind,
  type AnalyticsSnapshotRecord,
} from "@/lib/xyvala/runtime/repositories/analytics-repository";

import {
  getAuditRepositoryStats,
} from "@/lib/xyvala/runtime/repositories/audit-repository";

import {
  getApiKeyUsageSnapshot,
  type ApiKeyUsageEndpoint,
} from "@/lib/xyvala/api-keys/api-key-usage";

import type {
  ApiKeyPermission,
  PublicApiKey,
} from "@/lib/xyvala/api-keys/api-key-contract";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type AnalyticsPipelineStatus =
  | "computed"
  | "partial"
  | "failed";

export type AnalyticsPipelineMetric = {
  kind: AnalyticsSnapshotKind;

  account_id: string | null;
  organization_id: string | null;
  api_key_id: string | null;

  metric_key: string;
  metric_value: number;

  metadata: Record<string, string | number | boolean | null>;
  warnings: string[];
};

export type AnalyticsPipelineInput = {
  bucket_start?: string | null;
  bucket_end?: string | null;

  account_id?: string | null;
  organization_id?: string | null;

  metrics?: AnalyticsPipelineMetric[];
};

export type ApiKeyUsageAnalyticsInput = {
  api_key: PublicApiKey;
  endpoint: ApiKeyUsageEndpoint;
  required_permission: ApiKeyPermission;

  bucket_start?: string | null;
  bucket_end?: string | null;
};

export type AnalyticsPipelineResult = {
  ok: boolean;
  status: AnalyticsPipelineStatus;

  bucket_start: string;
  bucket_end: string;

  persisted: AnalyticsSnapshotRecord[];
  failed_count: number;

  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function defaultBucketStart(): string {
  return new Date(Date.now() - 60 * 60_000).toISOString();
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
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

function normalizeMetric(
  metric: AnalyticsPipelineMetric,
): AnalyticsPipelineMetric {
  return {
    kind: metric.kind,

    account_id: metric.account_id ?? null,
    organization_id: metric.organization_id ?? null,
    api_key_id: metric.api_key_id ?? null,

    metric_key: safeString(metric.metric_key) || "unknown_metric",
    metric_value: clampNonNegative(metric.metric_value),

    metadata: metric.metadata ?? {},
    warnings: uniqueWarnings(metric.warnings),
  };
}

/* ============================================================================
 * 3. PIPELINE CORE
 * ========================================================================== */

export async function runAnalyticsPipeline(
  input: AnalyticsPipelineInput = {},
): Promise<AnalyticsPipelineResult> {
  const bucketStart = input.bucket_start ?? defaultBucketStart();
  const bucketEnd = input.bucket_end ?? nowIso();

  const metrics = (input.metrics ?? []).map(normalizeMetric);

  const persisted: AnalyticsSnapshotRecord[] = [];
  let failedCount = 0;

  for (const metric of metrics) {
    const record = await persistAnalyticsSnapshot({
      kind: metric.kind,

      account_id: metric.account_id,
      organization_id: metric.organization_id,
      api_key_id: metric.api_key_id,

      metric_key: metric.metric_key,
      metric_value: metric.metric_value,

      bucket_start: bucketStart,
      bucket_end: bucketEnd,

      metadata: metric.metadata,
      warnings: metric.warnings,
    });

    if (record) {
      persisted.push(record);
    } else {
      failedCount += 1;
    }
  }

  const status: AnalyticsPipelineStatus =
    failedCount === 0
      ? "computed"
      : persisted.length > 0
        ? "partial"
        : "failed";

  return {
    ok: status !== "failed",
    status,

    bucket_start: bucketStart,
    bucket_end: bucketEnd,

    persisted,
    failed_count: failedCount,

    warnings: uniqueWarnings(
      failedCount > 0 ? ["analytics_pipeline_partial_failure"] : [],
      metrics.flatMap((metric) => metric.warnings),
    ),
    error: status === "failed" ? "analytics_pipeline_failed" : null,
  };
}

/* ============================================================================
 * 4. USAGE ANALYTICS
 * ========================================================================== */

export async function runApiKeyUsageAnalytics(
  input: ApiKeyUsageAnalyticsInput,
): Promise<AnalyticsPipelineResult> {
  const usage = getApiKeyUsageSnapshot({
    api_key: input.api_key,
    endpoint: input.endpoint,
    required_permission: input.required_permission,
  });

  return runAnalyticsPipeline({
    bucket_start: input.bucket_start ?? null,
    bucket_end: input.bucket_end ?? null,

    account_id: input.api_key.account_id,
    metrics: [
      {
        kind: "usage",
        account_id: input.api_key.account_id,
        organization_id: null,
        api_key_id: input.api_key.id,
        metric_key: "usage_count",
        metric_value: usage.usage_count,
        metadata: {
          endpoint: input.endpoint,
          required_permission: input.required_permission,
        },
        warnings: usage.warnings,
      },
      {
        kind: "quota",
        account_id: input.api_key.account_id,
        organization_id: null,
        api_key_id: input.api_key.id,
        metric_key: "remaining_day",
        metric_value: usage.remaining_day,
        metadata: {
          decision: usage.decision,
          reason: usage.reason,
        },
        warnings: usage.warnings,
      },
      {
        kind: "quota",
        account_id: input.api_key.account_id,
        organization_id: null,
        api_key_id: input.api_key.id,
        metric_key: "quota_exceeded",
        metric_value: usage.quota_exceeded ? 1 : 0,
        metadata: {
          decision: usage.decision,
          reason: usage.reason,
        },
        warnings: usage.warnings,
      },
    ],
  });
}

/* ============================================================================
 * 5. AUDIT ANALYTICS
 * ========================================================================== */

export async function runAuditAnalytics(input: {
  bucket_start?: string | null;
  bucket_end?: string | null;
} = {}): Promise<AnalyticsPipelineResult> {
  const stats = await getAuditRepositoryStats();

  return runAnalyticsPipeline({
    bucket_start: input.bucket_start ?? null,
    bucket_end: input.bucket_end ?? null,

    metrics: [
      {
        kind: "runtime",
        account_id: null,
        organization_id: null,
        api_key_id: null,
        metric_key: "audit_total",
        metric_value: stats.total,
        metadata: {},
        warnings: [],
      },
      {
        kind: "runtime",
        account_id: null,
        organization_id: null,
        api_key_id: null,
        metric_key: "audit_errors",
        metric_value: stats.error,
        metadata: {},
        warnings: [],
      },
      {
        kind: "runtime",
        account_id: null,
        organization_id: null,
        api_key_id: null,
        metric_key: "audit_critical",
        metric_value: stats.critical,
        metadata: {},
        warnings: [],
      },
    ],
  });
}

/* ============================================================================
 * 6. COMPOSITE PIPELINE
 * ========================================================================== */

export async function runRuntimeAnalyticsPipeline(): Promise<AnalyticsPipelineResult> {
  return runAuditAnalytics();
}
