/* ============================================================================
 * FILE: lib/xyvala/runtime/observability/observability-dashboard.ts
 * ============================================================================
 * TITLE
 * - Runtime observability dashboard
 *
 * ROLE
 * - aggregate runtime observability signals
 * - expose deterministic dashboard snapshots
 * - contextualize runtime health without mutation
 *
 * DIRECTIVES
 * - observe only
 * - no runtime mutation
 * - no event publishing
 * - no audit creation
 * - no background job enqueue
 * - no failover trigger
 * - no recovery trigger
 * - no queue write
 * - no cache invalidation
 * - no governance mutation
 *
 * INVARIANTS
 * - dashboard only reads and aggregates
 * - dashboard never governs runtime
 * - dashboard never mutates workers, events, schedules or audit logs
 * - dashboard never creates analytical truth
 * ========================================================================== */

import {
  collectRuntimeMetrics,
  type RuntimeHealthState,
  type RuntimeMetric,
} from "@/lib/xyvala/runtime/metrics/runtime-metrics-service";

import {
  getAuditRepositoryStats,
  listRecentCriticalAuditLogs,
} from "@/lib/xyvala/runtime/repositories/audit-repository";

import {
  listBackgroundJobs,
} from "@/lib/xyvala/runtime/workers/background-worker";

import {
  listRuntimeSchedules,
} from "@/lib/xyvala/runtime/scheduler/runtime-scheduler";

import {
  listRuntimeEvents,
} from "@/lib/xyvala/runtime/events/event-bus";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type ObservabilityStatus =
  | "healthy"
  | "degraded"
  | "critical"
  | "unknown";

export type ObservabilityPanel = {
  key: string;
  title: string;
  status: ObservabilityStatus;
  value: number;
  description: string;
  warnings: string[];
};

export type ObservabilityDashboardSnapshot = {
  ok: boolean;
  generated_at: string;

  status: ObservabilityStatus;
  health_state: RuntimeHealthState;

  panels: ObservabilityPanel[];
  metrics: RuntimeMetric[];

  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. HELPERS — PURE
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeStatus(value: RuntimeHealthState): ObservabilityStatus {
  if (value === "healthy") return "healthy";
  if (value === "degraded") return "degraded";
  if (value === "critical") return "critical";

  return "unknown";
}

function normalizeNumber(value: number): number {
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

function panel(input: ObservabilityPanel): ObservabilityPanel {
  return {
    key: input.key,
    title: input.title,
    status: input.status,
    value: normalizeNumber(input.value),
    description: input.description,
    warnings: uniqueWarnings(input.warnings),
  };
}

function resolveDashboardStatus(input: {
  runtime_status: ObservabilityStatus;
  panels: ObservabilityPanel[];
}): ObservabilityStatus {
  if (
    input.runtime_status === "critical" ||
    input.panels.some((item) => item.status === "critical")
  ) {
    return "critical";
  }

  if (
    input.runtime_status === "degraded" ||
    input.panels.some((item) => item.status === "degraded")
  ) {
    return "degraded";
  }

  if (
    input.runtime_status === "healthy" &&
    input.panels.every((item) => item.status === "healthy")
  ) {
    return "healthy";
  }

  return "unknown";
}

/* ============================================================================
 * 3. DASHBOARD BUILDER — PURE OBSERVE
 * ========================================================================== */

export async function buildObservabilityDashboard(): Promise<ObservabilityDashboardSnapshot> {
  const generatedAt = nowIso();

  const runtime = await collectRuntimeMetrics();
  const auditStats = await getAuditRepositoryStats();
  const criticalLogs = await listRecentCriticalAuditLogs(20);

  const jobs = listBackgroundJobs();
  const schedules = listRuntimeSchedules();
  const events = listRuntimeEvents();

  const failedJobs = jobs.filter((job) => job.status === "failed").length;
  const queuedJobs = jobs.filter((job) => job.status === "queued").length;

  const activeSchedules = schedules.filter(
    (schedule) => schedule.status === "active",
  ).length;

  const runtimeStatus = normalizeStatus(runtime.health_state);

  const panels: ObservabilityPanel[] = [
    panel({
      key: "runtime_health",
      title: "Runtime health",
      status: runtimeStatus,
      value: runtime.ok ? 1 : 0,
      description: "Global runtime health state.",
      warnings: runtime.warnings,
    }),

    panel({
      key: "postgres",
      title: "Postgres",
      status: runtime.postgres_connected ? "healthy" : "degraded",
      value: runtime.postgres_connected ? 1 : 0,
      description: "Durable database connectivity.",
      warnings: runtime.postgres_connected ? [] : ["postgres_not_connected"],
    }),

    panel({
      key: "redis",
      title: "Redis",
      status: runtime.redis_connected ? "healthy" : "degraded",
      value: runtime.redis_connected ? 1 : 0,
      description: "Distributed runtime connectivity.",
      warnings: runtime.redis_connected ? [] : ["redis_not_connected"],
    }),

    panel({
      key: "workers",
      title: "Workers",
      status: failedJobs > 0 ? "degraded" : "healthy",
      value: jobs.length,
      description: "Background job runtime state.",
      warnings: failedJobs > 0 ? ["background_jobs_failed"] : [],
    }),

    panel({
      key: "scheduler",
      title: "Scheduler",
      status: activeSchedules > 0 ? "healthy" : "degraded",
      value: activeSchedules,
      description: "Active runtime schedules.",
      warnings: activeSchedules > 0 ? [] : ["no_active_runtime_schedules"],
    }),

    panel({
      key: "events",
      title: "Events",
      status: "healthy",
      value: events.length,
      description: "Runtime events stored in local event bus.",
      warnings: [],
    }),

    panel({
      key: "audit",
      title: "Audit",
      status:
        auditStats.critical > 0
          ? "critical"
          : auditStats.error > 0
            ? "degraded"
            : "healthy",
      value: auditStats.total,
      description: "Durable audit log volume and severity.",
      warnings: uniqueWarnings(
        auditStats.critical > 0 ? ["critical_audit_logs_detected"] : [],
        auditStats.error > 0 ? ["error_audit_logs_detected"] : [],
      ),
    }),

    panel({
      key: "critical_timeline",
      title: "Critical timeline",
      status: criticalLogs.length > 0 ? "critical" : "healthy",
      value: criticalLogs.length,
      description: "Recent critical/error audit timeline.",
      warnings:
        criticalLogs.length > 0 ? ["recent_critical_audit_logs_detected"] : [],
    }),

    panel({
      key: "queued_jobs",
      title: "Queued jobs",
      status: queuedJobs > 50 ? "degraded" : "healthy",
      value: queuedJobs,
      description: "Queued background jobs waiting for execution.",
      warnings: queuedJobs > 50 ? ["background_queue_pressure"] : [],
    }),
  ];

  const status = resolveDashboardStatus({
    runtime_status: runtimeStatus,
    panels,
  });

  const warnings = uniqueWarnings(
    runtime.warnings,
    panels.flatMap((item) => item.warnings),
  );

  return {
    ok: status !== "critical",
    generated_at: generatedAt,

    status,
    health_state: runtime.health_state,

    panels,
    metrics: runtime.metrics,

    warnings,
    error: status === "critical" ? "observability_dashboard_critical" : null,
  };
}

/* ============================================================================
 * 4. CONVENIENCE READERS — PURE OBSERVE
 * ========================================================================== */

export async function getObservabilityStatus(): Promise<ObservabilityStatus> {
  const snapshot = await buildObservabilityDashboard();

  return snapshot.status;
}

export async function getObservabilityPanels(): Promise<ObservabilityPanel[]> {
  const snapshot = await buildObservabilityDashboard();

  return snapshot.panels;
}
