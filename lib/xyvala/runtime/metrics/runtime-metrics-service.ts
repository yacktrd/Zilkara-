/* ============================================================================
 * FILE: lib/xyvala/runtime/metrics/runtime-metrics-service.ts
 * ============================================================================
 * TITLE
 * - Runtime metrics service
 *
 * ROLE
 * - collect deterministic runtime observability metrics
 * - normalize worker, scheduler, Redis, Postgres, audit and distributed health
 * - expose dashboard-ready runtime metrics without mutation
 *
 * PARENTS
 * - lib/xyvala/runtime/workers/background-worker.ts
 * - lib/xyvala/runtime/scheduler/runtime-scheduler.ts
 * - lib/xyvala/runtime/events/event-bus.ts
 * - lib/xyvala/runtime/redis/redis-adapter.ts
 * - lib/xyvala/runtime/postgres/postgres-adapter.ts
 * - lib/xyvala/runtime/distributed/distributed-quota-sync.ts
 * - lib/xyvala/runtime/audit-log-store.ts
 *
 * DIRECTIVES
 * - observe only
 * - no runtime mutation
 * - no event publishing
 * - no audit creation
 * - no queue write
 * - no failover trigger
 * - no recovery trigger
 * - no scheduler mutation
 * - no business mutation
 * - no billing mutation
 * - no account mutation
 * - no API key mutation
 * - no quota decision mutation
 * - no RFS recomputation
 * - no MCI recomputation
 *
 * INPUTS
 * - background worker store
 * - scheduler store
 * - runtime event store
 * - audit log store
 * - Redis health
 * - Postgres health
 * - distributed quota sync health
 *
 * OUTPUTS
 * - RuntimeMetricsSnapshot
 * - RuntimeMetric[]
 * - RuntimeHealthState
 *
 * INVARIANTS
 * - metrics are non-negative
 * - health state is explicit
 * - degraded dependencies must not crash metrics collection
 * - metrics never expose secrets
 * - output remains dashboard-ready but UI-independent
 *
 * CRITICAL DEPENDENCIES
 * - checkRedisHealth
 * - checkPostgresHealth
 * - getDistributedQuotaSyncHealth
 *
 * SENSITIVE ZONES
 * - runtime health classification
 * - dependency health aggregation
 * - audit severity propagation
 * ========================================================================== */

import {
  listBackgroundJobs,
} from "@/lib/xyvala/runtime/workers/background-worker";

import {
  listRuntimeSchedules,
} from "@/lib/xyvala/runtime/scheduler/runtime-scheduler";

import {
  listRuntimeEvents,
} from "@/lib/xyvala/runtime/events/event-bus";

import {
  checkRedisHealth,
} from "@/lib/xyvala/runtime/redis/redis-adapter";

import {
  checkPostgresHealth,
} from "@/lib/xyvala/runtime/postgres/postgres-adapter";

import {
  getDistributedQuotaSyncHealth,
} from "@/lib/xyvala/runtime/distributed/distributed-quota-sync";

import {
  getAuditLogStoreStats,
} from "@/lib/xyvala/runtime/audit-log-store";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RuntimeHealthState =
  | "healthy"
  | "degraded"
  | "critical"
  | "unknown";

export type RuntimeMetricUnit =
  | "count"
  | "percent"
  | "ms"
  | "state";

export type RuntimeMetric = {
  key: string;
  value: number;
  unit: RuntimeMetricUnit;
  warnings: string[];
};

export type RuntimeMetricsSnapshot = {
  ok: boolean;
  collected_at: string;

  health_state: RuntimeHealthState;

  metrics: RuntimeMetric[];

  postgres_connected: boolean;
  redis_connected: boolean;
  distributed_quota_sync_ok: boolean;

  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. HELPERS — PURE
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
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

function metric(
  key: string,
  value: number,
  unit: RuntimeMetricUnit = "count",
  warnings: string[] = [],
): RuntimeMetric {
  return {
    key,
    value: clampNonNegative(value),
    unit,
    warnings: uniqueWarnings(warnings),
  };
}

function resolveHealthState(input: {
  postgres_connected: boolean;
  redis_connected: boolean;
  distributed_quota_sync_ok: boolean;
  critical_errors: number;
  failed_jobs: number;
}): RuntimeHealthState {
  if (input.critical_errors > 0) {
    return "critical";
  }

  if (
    !input.postgres_connected ||
    !input.redis_connected ||
    !input.distributed_quota_sync_ok ||
    input.failed_jobs > 0
  ) {
    return "degraded";
  }

  return "healthy";
}

/* ============================================================================
 * 3. METRICS COLLECTION — PURE OBSERVE
 * ========================================================================== */

export async function collectRuntimeMetrics(): Promise<RuntimeMetricsSnapshot> {
  const collectedAt = nowIso();

  const jobs = listBackgroundJobs();
  const schedules = listRuntimeSchedules();
  const events = listRuntimeEvents();
  const auditStats = getAuditLogStoreStats();

  const postgres = await checkPostgresHealth();
  const redis = await checkRedisHealth();
  const distributedQuota = await getDistributedQuotaSyncHealth();

  const completedJobs = jobs.filter((job) => job.status === "completed").length;
  const failedJobs = jobs.filter((job) => job.status === "failed").length;
  const queuedJobs = jobs.filter((job) => job.status === "queued").length;
  const runningJobs = jobs.filter((job) => job.status === "running").length;

  const activeSchedules = schedules.filter(
    (schedule) => schedule.status === "active",
  ).length;

  const disabledSchedules = schedules.filter(
    (schedule) => schedule.status === "disabled",
  ).length;

  const healthState = resolveHealthState({
    postgres_connected: postgres.connected,
    redis_connected: redis.connected,
    distributed_quota_sync_ok: distributedQuota.ok,
    critical_errors: auditStats.critical,
    failed_jobs: failedJobs,
  });

  const metrics: RuntimeMetric[] = [
    metric("background_jobs_total", jobs.length),
    metric("background_jobs_completed", completedJobs),
    metric("background_jobs_failed", failedJobs),
    metric("background_jobs_queued", queuedJobs),
    metric("background_jobs_running", runningJobs),

    metric("runtime_schedules_total", schedules.length),
    metric("runtime_schedules_active", activeSchedules),
    metric("runtime_schedules_disabled", disabledSchedules),

    metric("runtime_events_total", events.length),

    metric("audit_logs_total", auditStats.total),
    metric("audit_logs_error", auditStats.error),
    metric("audit_logs_critical", auditStats.critical),

    metric("postgres_connected", postgres.connected ? 1 : 0, "state"),
    metric("redis_connected", redis.connected ? 1 : 0, "state"),
    metric(
      "distributed_quota_sync_ok",
      distributedQuota.ok ? 1 : 0,
      "state",
    ),
  ];

  const warnings = uniqueWarnings(
    postgres.warnings,
    redis.warnings,
    distributedQuota.warnings,
    failedJobs > 0 ? ["runtime_failed_jobs_detected"] : [],
    auditStats.critical > 0 ? ["runtime_critical_audit_logs_detected"] : [],
    healthState !== "healthy" ? [`runtime_metrics_${healthState}`] : [],
  );

  return {
    ok: healthState !== "critical",
    collected_at: collectedAt,

    health_state: healthState,

    metrics,

    postgres_connected: postgres.connected,
    redis_connected: redis.connected,
    distributed_quota_sync_ok: distributedQuota.ok,

    warnings,
    error: healthState === "critical" ? "runtime_metrics_critical" : null,
  };
}

/* ============================================================================
 * 4. CONVENIENCE READERS — PURE OBSERVE
 * ========================================================================== */

export async function getRuntimeHealthState(): Promise<RuntimeHealthState> {
  const snapshot = await collectRuntimeMetrics();

  return snapshot.health_state;
}

export async function getRuntimeMetricValue(key: string): Promise<number> {
  const snapshot = await collectRuntimeMetrics();
  const found = snapshot.metrics.find((item) => item.key === key);

  return found?.value ?? 0;
}
