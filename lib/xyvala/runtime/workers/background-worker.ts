/* ============================================================================
 * FILE: lib/xyvala/runtime/workers/background-worker.ts
 * ========================================================================== */

import { createAuditLog } from "@/lib/xyvala/runtime/audit-log-store";
import { evaluateMonitoringAlerts } from "@/lib/xyvala/runtime/monitoring-alert-service";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type BackgroundJobKind =
  | "audit_flush"
  | "analytics_snapshot"
  | "quota_snapshot"
  | "session_cleanup"
  | "monitoring_evaluation"
  | "runtime_cleanup";

export type BackgroundJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export type BackgroundJob = {
  id: string;
  kind: BackgroundJobKind;
  status: BackgroundJobStatus;

  created_at: string;
  started_at: string | null;
  completed_at: string | null;

  attempts: number;
  max_attempts: number;

  payload: Record<string, string | number | boolean | null>;
  warnings: string[];
  error: string | null;
};

export type BackgroundWorkerResult = {
  ok: boolean;
  job: BackgroundJob;
  warnings: string[];
  error: string | null;
};

export type BackgroundWorkerAuditResult = {
  ok: boolean;
  audited_at: string;
  job: BackgroundJob;
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. STORE
 * ========================================================================== */

type BackgroundWorkerStore = {
  jobs: Map<string, BackgroundJob>;
};

declare global {
  // eslint-disable-next-line no-var
  var __XYVALA_BACKGROUND_WORKER_STORE__: BackgroundWorkerStore | undefined;
}

function getStore(): BackgroundWorkerStore {
  if (!globalThis.__XYVALA_BACKGROUND_WORKER_STORE__) {
    globalThis.__XYVALA_BACKGROUND_WORKER_STORE__ = {
      jobs: new Map(),
    };
  }

  return globalThis.__XYVALA_BACKGROUND_WORKER_STORE__;
}

/* ============================================================================
 * 3. HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function buildJobId(kind: BackgroundJobKind): string {
  return `job_${kind}_${Date.now().toString(36)}`;
}

function cloneJob(job: BackgroundJob): BackgroundJob {
  return {
    ...job,
    payload: { ...job.payload },
    warnings: [...job.warnings],
  };
}

function sanitizePayload(
  payload: Record<string, string | number | boolean | null> | undefined,
): Record<string, string | number | boolean | null> {
  const output: Record<string, string | number | boolean | null> = {};

  if (!payload) return output;

  for (const [key, value] of Object.entries(payload)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      output[key] = value;
    }
  }

  return output;
}

function safeMaxAttempts(value: number | undefined): number {
  if (!Number.isFinite(value ?? NaN)) return 3;

  return Math.max(1, Math.trunc(value as number));
}

/* ============================================================================
 * 4. MUTATE — JOB CREATION
 * ========================================================================== */

export function enqueueBackgroundJob(input: {
  kind: BackgroundJobKind;
  payload?: Record<string, string | number | boolean | null>;
  max_attempts?: number;
}): BackgroundJob {
  const job: BackgroundJob = {
    id: buildJobId(input.kind),
    kind: input.kind,
    status: "queued",

    created_at: nowIso(),
    started_at: null,
    completed_at: null,

    attempts: 0,
    max_attempts: safeMaxAttempts(input.max_attempts),

    payload: sanitizePayload(input.payload),
    warnings: [],
    error: null,
  };

  getStore().jobs.set(job.id, job);

  return cloneJob(job);
}

/* ============================================================================
 * 5. OBSERVE — READERS
 * ========================================================================== */

export function listBackgroundJobs(): BackgroundJob[] {
  return [...getStore().jobs.values()].map(cloneJob);
}

export function findBackgroundJobById(id: string): BackgroundJob | null {
  const job = getStore().jobs.get(id);

  return job ? cloneJob(job) : null;
}

/* ============================================================================
 * 6. COMPUTE / EXECUTION HANDLER
 * ========================================================================== */

async function executeJob(job: BackgroundJob): Promise<BackgroundWorkerResult> {
  if (job.kind === "monitoring_evaluation") {
    const result = evaluateMonitoringAlerts();

    return {
      ok: result.ok,
      job,
      warnings: result.warnings,
      error: result.error,
    };
  }

  if (
    job.kind === "audit_flush" ||
    job.kind === "analytics_snapshot" ||
    job.kind === "quota_snapshot" ||
    job.kind === "session_cleanup" ||
    job.kind === "runtime_cleanup"
  ) {
    return {
      ok: true,
      job,
      warnings: [`${job.kind}_prepared_not_persisted`],
      error: null,
    };
  }

  return {
    ok: false,
    job,
    warnings: ["background_job_unknown"],
    error: "background_job_unknown",
  };
}

/* ============================================================================
 * 7. MUTATE — JOB EXECUTION STATE
 * ========================================================================== */

export async function runBackgroundJob(
  id: string,
): Promise<BackgroundWorkerResult | null> {
  const store = getStore();
  const existing = store.jobs.get(id);

  if (!existing) return null;

  const running: BackgroundJob = {
    ...existing,
    status: "running",
    started_at: nowIso(),
    attempts: existing.attempts + 1,
  };

  store.jobs.set(running.id, running);

  try {
    const result = await executeJob(running);

    const completed: BackgroundJob = {
      ...running,
      status: result.ok ? "completed" : "failed",
      completed_at: nowIso(),
      warnings: result.warnings,
      error: result.error,
    };

    store.jobs.set(completed.id, completed);

    return {
      ok: result.ok,
      job: cloneJob(completed),
      warnings: result.warnings,
      error: result.error,
    };
  } catch (error) {
    const failed: BackgroundJob = {
      ...running,
      status: "failed",
      completed_at: nowIso(),
      warnings: ["background_job_failed"],
      error:
        error instanceof Error && error.message
          ? error.message
          : "background_job_failed",
    };

    store.jobs.set(failed.id, failed);

    return {
      ok: false,
      job: cloneJob(failed),
      warnings: failed.warnings,
      error: failed.error,
    };
  }
}

export async function runQueuedBackgroundJobs(): Promise<
  BackgroundWorkerResult[]
> {
  const queued = listBackgroundJobs().filter((job) => job.status === "queued");
  const results: BackgroundWorkerResult[] = [];

  for (const job of queued) {
    const result = await runBackgroundJob(job.id);

    if (result) {
      results.push(result);
    }
  }

  return results;
}

/* ============================================================================
 * 8. EXPLICIT MUTATION — OPTIONAL AUDIT
 * ========================================================================== */

export function auditBackgroundJobResult(
  result: BackgroundWorkerResult,
): BackgroundWorkerAuditResult {
  const auditedAt = nowIso();

  createAuditLog({
    domain: "runtime",
    level: result.ok ? "info" : "error",
    event: `background_job_${result.job.status}`,
    source: "background_worker",
    message: `Background job ${result.job.kind} ${result.job.status}.`,
    metadata: {
      job_id: result.job.id,
      kind: result.job.kind,
      attempts: result.job.attempts,
    },
    warnings: result.warnings,
  });

  return {
    ok: true,
    audited_at: auditedAt,
    job: cloneJob(result.job),
    warnings: ["background_job_result_audited"],
    error: null,
  };
}

/* ============================================================================
 * 9. MUTATE — MAINTENANCE
 * ========================================================================== */

export function clearBackgroundWorkerStore(): void {
  getStore().jobs.clear();
}
