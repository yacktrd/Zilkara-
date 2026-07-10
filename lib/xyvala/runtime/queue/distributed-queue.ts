/* ============================================================================
 * FILE: lib/xyvala/runtime/queue/distributed-queue.ts
 * ============================================================================
 * TITLE
 * - Xyvala distributed runtime queue
 *
 * ROLE
 * - manage deterministic distributed queue state transitions
 * - isolate runtime queue mutations from queue observations
 * - provide explicit runtime queue governance primitives
 *
 * DIRECTIVES
 * - deterministic queue transitions only
 * - explicit MUTATE functions only
 * - pure OBSERVE readers only
 * - no implicit orchestration
 * - no hidden retry governance
 * - no failover trigger
 * - no recovery trigger
 * - no event publishing
 * - no analytical recomputation
 * - Redis transport only through redis-adapter
 *
 * INVARIANTS
 * - queue state transitions are explicit
 * - reservation ownership is validated
 * - reservation expiration is deterministic
 * - dead jobs are explicit
 * - retries are contractually controlled
 * - readers never mutate
 * ========================================================================== */

import {
  redisGet,
  redisSet,
  redisDel,
} from "@/lib/xyvala/runtime/redis/redis-adapter";

import type {
  BackgroundJobKind,
} from "@/lib/xyvala/runtime/workers/background-worker";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type DistributedQueueJobStatus =
  | "queued"
  | "reserved"
  | "completed"
  | "failed"
  | "dead";

export type DistributedQueueRetryDecision =
  | "retry"
  | "dead";

export type DistributedQueueJob = {
  id: string;

  kind: BackgroundJobKind;
  queue: string;

  status: DistributedQueueJobStatus;

  created_at: string;
  updated_at: string;

  reserved_at: string | null;
  reserved_by: string | null;

  lock_expires_at: string | null;
  completed_at: string | null;

  attempts: number;
  max_attempts: number;

  payload: Record<string, string | number | boolean | null>;

  warnings: string[];
  error: string | null;
};

export type DistributedQueueResult<T> = {
  ok: boolean;
  data: T | null;
  warnings: string[];
  error: string | null;
};

export type DistributedQueueReservationPolicy = {
  lock_ttl_seconds: number;
};

export type DistributedQueueRetryPolicy = {
  max_attempts: number;
};

export type DistributedQueueQueueSnapshot = {
  queue: string;
  total_jobs: number;
  queued_jobs: number;
  reserved_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  dead_jobs: number;
};

/* ============================================================================
 * 2. CONFIG
 * ========================================================================== */

const QUEUE_KEY_PREFIX = "xyvala:queue";

const DEFAULT_QUEUE = "default";

const DEFAULT_RESERVATION_POLICY: DistributedQueueReservationPolicy = {
  lock_ttl_seconds: 300,
};

const DEFAULT_RETRY_POLICY: DistributedQueueRetryPolicy = {
  max_attempts: 3,
};

/* ============================================================================
 * 3. HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function safeQueue(value: string | null | undefined): string {
  return safeString(value) || DEFAULT_QUEUE;
}

function safeMaxAttempts(value: number | null | undefined): number {
  if (!Number.isFinite(value ?? NaN)) {
    return DEFAULT_RETRY_POLICY.max_attempts;
  }

  return Math.max(1, Math.trunc(value as number));
}

function buildJobId(kind: BackgroundJobKind): string {
  return `dq_${kind}_${Date.now().toString(36)}`;
}

function queueIndexKey(queue: string): string {
  return `${QUEUE_KEY_PREFIX}:${queue}:index`;
}

function jobKey(jobId: string): string {
  return `${QUEUE_KEY_PREFIX}:job:${jobId}`;
}

function cloneJob(job: DistributedQueueJob): DistributedQueueJob {
  return {
    ...job,
    payload: { ...job.payload },
    warnings: [...job.warnings],
  };
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  return [
    ...new Set(
      groups
        .flatMap((group) => Array.isArray(group) ? group : [])
        .filter(
          (item): item is string =>
            typeof item === "string" &&
            item.trim().length > 0,
        ),
    ),
  ];
}

function buildReservationExpirationIso(
  ttlSeconds: number,
): string {
  return new Date(
    Date.now() + ttlSeconds * 1000,
  ).toISOString();
}

function isReservationExpired(
  job: DistributedQueueJob,
): boolean {
  if (!job.lock_expires_at) {
    return true;
  }

  const expirationTs = new Date(
    job.lock_expires_at,
  ).getTime();

  return (
    !Number.isFinite(expirationTs) ||
    expirationTs <= Date.now()
  );
}

function resolveRetryDecision(
  job: DistributedQueueJob,
): DistributedQueueRetryDecision {
  return job.attempts < job.max_attempts
    ? "retry"
    : "dead";
}

function buildQueueSnapshot(
  queue: string,
  jobs: DistributedQueueJob[],
): DistributedQueueQueueSnapshot {
  return {
    queue,

    total_jobs: jobs.length,

    queued_jobs: jobs.filter(
      (job) => job.status === "queued",
    ).length,

    reserved_jobs: jobs.filter(
      (job) => job.status === "reserved",
    ).length,

    completed_jobs: jobs.filter(
      (job) => job.status === "completed",
    ).length,

    failed_jobs: jobs.filter(
      (job) => job.status === "failed",
    ).length,

    dead_jobs: jobs.filter(
      (job) => job.status === "dead",
    ).length,
  };
}

/* ============================================================================
 * 4. STORAGE — INTERNAL
 * ========================================================================== */

async function getQueueIndex(
  queue: string,
): Promise<string[]> {
  const result = await redisGet<string[]>(
    queueIndexKey(queue),
  );

  return (
    result.ok &&
    Array.isArray(result.data)
  )
    ? result.data
    : [];
}

async function setQueueIndex(
  queue: string,
  ids: string[],
): Promise<void> {
  await redisSet(
    queueIndexKey(queue),
    [...new Set(ids)],
  );
}

async function persistJob(
  job: DistributedQueueJob,
): Promise<DistributedQueueResult<DistributedQueueJob>> {
  const stored = await redisSet(
    jobKey(job.id),
    job,
  );

  if (!stored.ok) {
    return {
      ok: false,
      data: null,
      warnings: stored.warnings,
      error: stored.error,
    };
  }

  return {
    ok: true,
    data: cloneJob(job),
    warnings: [],
    error: null,
  };
}

/* ============================================================================
 * 5. OBSERVE — READERS ONLY
 * ========================================================================== */

export async function findDistributedJobById(
  id: string,
): Promise<
  DistributedQueueResult<DistributedQueueJob>
> {
  const result = await redisGet<DistributedQueueJob>(
    jobKey(id),
  );

  if (!result.ok || !result.data) {
    return {
      ok: false,
      data: null,
      warnings: result.warnings,
      error:
        result.error ??
        "distributed_job_not_found",
    };
  }

  return {
    ok: true,
    data: cloneJob(result.data),
    warnings: [],
    error: null,
  };
}

export async function listDistributedJobs(
  queue = DEFAULT_QUEUE,
): Promise<
  DistributedQueueResult<DistributedQueueJob[]>
> {
  const ids = await getQueueIndex(
    safeQueue(queue),
  );

  const jobs: DistributedQueueJob[] = [];

  for (const id of ids) {
    const result =
      await findDistributedJobById(id);

    if (result.ok && result.data) {
      jobs.push(result.data);
    }
  }

  return {
    ok: true,
    data: jobs,
    warnings: [],
    error: null,
  };
}

export async function buildDistributedQueueSnapshot(
  queue = DEFAULT_QUEUE,
): Promise<
  DistributedQueueResult<DistributedQueueQueueSnapshot>
> {
  const jobsResult =
    await listDistributedJobs(queue);

  const jobs =
    jobsResult.ok && jobsResult.data
      ? jobsResult.data
      : [];

  return {
    ok: jobsResult.ok,
    data: buildQueueSnapshot(
      safeQueue(queue),
      jobs,
    ),
    warnings: jobsResult.warnings,
    error: jobsResult.error,
  };
}

/* ============================================================================
 * 6. MUTATE — ENQUEUE
 * ========================================================================== */

export async function enqueueDistributedJob(
  input: {
    kind: BackgroundJobKind;
    queue?: string | null;
    payload?: Record<
      string,
      string | number | boolean | null
    >;
    max_attempts?: number | null;
  },
): Promise<
  DistributedQueueResult<DistributedQueueJob>
> {
  const queue = safeQueue(input.queue);

  const timestamp = nowIso();

  const job: DistributedQueueJob = {
    id: buildJobId(input.kind),

    kind: input.kind,
    queue,

    status: "queued",

    created_at: timestamp,
    updated_at: timestamp,

    reserved_at: null,
    reserved_by: null,

    lock_expires_at: null,
    completed_at: null,

    attempts: 0,

    max_attempts: safeMaxAttempts(
      input.max_attempts,
    ),

    payload: input.payload ?? {},

    warnings: [],
    error: null,
  };

  const persisted = await persistJob(job);

  if (!persisted.ok) {
    return persisted;
  }

  const index = await getQueueIndex(queue);

  await setQueueIndex(queue, [
    ...index,
    job.id,
  ]);

  return persisted;
}

/* ============================================================================
 * 7. MUTATE — RESERVATION
 * ========================================================================== */

export async function reserveDistributedJob(
  input: {
    queue?: string | null;
    worker_id: string;
    lock_ttl_seconds?: number | null;
  },
): Promise<
  DistributedQueueResult<DistributedQueueJob>
> {
  const queue = safeQueue(input.queue);

  const workerId = safeString(
    input.worker_id,
  );

  if (!workerId) {
    return {
      ok: false,
      data: null,
      warnings: [
        "distributed_queue_worker_id_missing",
      ],
      error:
        "distributed_queue_worker_id_missing",
    };
  }

  const ids = await getQueueIndex(queue);

  const lockTtlSeconds =
    input.lock_ttl_seconds ??
    DEFAULT_RESERVATION_POLICY.lock_ttl_seconds;

  for (const id of ids) {
    const result =
      await findDistributedJobById(id);

    if (!result.ok || !result.data) {
      continue;
    }

    const job = result.data;

    const reservable =
      job.status === "queued" ||
      (
        job.status === "reserved" &&
        isReservationExpired(job)
      );

    if (!reservable) {
      continue;
    }

    const timestamp = nowIso();

    const reserved: DistributedQueueJob = {
      ...job,

      status: "reserved",

      updated_at: timestamp,

      reserved_at: timestamp,
      reserved_by: workerId,

      lock_expires_at:
        buildReservationExpirationIso(
          lockTtlSeconds,
        ),

      attempts: job.attempts + 1,

      warnings: uniqueWarnings(
        job.warnings,
        ["distributed_job_reserved"],
      ),
    };

    return persistJob(reserved);
  }

  return {
    ok: false,
    data: null,
    warnings: [
      "distributed_queue_empty",
    ],
    error: "distributed_queue_empty",
  };
}

/* ============================================================================
 * 8. MUTATE — ACKNOWLEDGEMENT
 * ========================================================================== */

export async function acknowledgeDistributedJob(
  input: {
    id: string;
    worker_id: string;
  },
): Promise<
  DistributedQueueResult<DistributedQueueJob>
> {
  const result =
    await findDistributedJobById(
      input.id,
    );

  if (!result.ok || !result.data) {
    return result;
  }

  const job = result.data;

  if (
    job.reserved_by !== input.worker_id
  ) {
    return {
      ok: false,
      data: null,
      warnings: [
        "distributed_job_worker_mismatch",
      ],
      error:
        "distributed_job_worker_mismatch",
    };
  }

  const timestamp = nowIso();

  const completed: DistributedQueueJob = {
    ...job,

    status: "completed",

    updated_at: timestamp,
    completed_at: timestamp,

    warnings: uniqueWarnings(
      job.warnings,
      ["distributed_job_completed"],
    ),
  };

  return persistJob(completed);
}

/* ============================================================================
 * 9. MUTATE — FAILURE / RETRY
 * ========================================================================== */

export async function failDistributedJob(
  input: {
    id: string;
    worker_id: string;
    error: string;
  },
): Promise<
  DistributedQueueResult<DistributedQueueJob>
> {
  const result =
    await findDistributedJobById(
      input.id,
    );

  if (!result.ok || !result.data) {
    return result;
  }

  const job = result.data;

  if (
    job.reserved_by !== input.worker_id
  ) {
    return {
      ok: false,
      data: null,
      warnings: [
        "distributed_job_worker_mismatch",
      ],
      error:
        "distributed_job_worker_mismatch",
    };
  }

  const retryDecision =
    resolveRetryDecision(job);

  const timestamp = nowIso();

  const failed: DistributedQueueJob = {
    ...job,

    status:
      retryDecision === "retry"
        ? "queued"
        : "dead",

    updated_at: timestamp,

    reserved_at: null,
    reserved_by: null,

    lock_expires_at: null,

    error: input.error,

    warnings: uniqueWarnings(
      job.warnings,
      [
        retryDecision === "retry"
          ? "distributed_job_retry_queued"
          : "distributed_job_dead",
      ],
    ),
  };

  return persistJob(failed);
}

/* ============================================================================
 * 10. MUTATE — DELETE
 * ========================================================================== */

export async function deleteDistributedJob(
  id: string,
): Promise<
  DistributedQueueResult<boolean>
> {
  const existing =
    await findDistributedJobById(id);

  if (!existing.ok || !existing.data) {
    return {
      ok: false,
      data: false,
      warnings: existing.warnings,
      error: existing.error,
    };
  }

  const deleted = await redisDel(
    jobKey(id),
  );

  return {
    ok: deleted.ok,
    data: deleted.ok,
    warnings: deleted.warnings,
    error: deleted.error,
  };
}
