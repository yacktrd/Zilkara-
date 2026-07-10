/* ============================================================================
 * FILE: lib/xyvala/runtime/scheduler/runtime-scheduler.ts
 * ========================================================================== */

import {
  enqueueBackgroundJob,
  type BackgroundJob,
  type BackgroundJobKind,
} from "@/lib/xyvala/runtime/workers/background-worker";

import {
  publishRuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type RuntimeScheduleStatus = "active" | "disabled";

export type RuntimeScheduleCadence =
  | "minute"
  | "five_minutes"
  | "fifteen_minutes"
  | "hour"
  | "day";

export type RuntimeSchedule = {
  id: string;
  job_kind: BackgroundJobKind;
  cadence: RuntimeScheduleCadence;
  status: RuntimeScheduleStatus;

  last_run_at: string | null;
  next_run_at: string;

  payload: Record<string, string | number | boolean | null>;

  warnings: string[];
};

export type RuntimeSchedulerTickResult = {
  ok: boolean;
  evaluated_at: string;
  due_count: number;
  enqueued_jobs: BackgroundJob[];
  warnings: string[];
  error: string | null;
};

export type RuntimeSchedulerEventMutationResult = {
  ok: boolean;
  emitted_at: string;
  emitted: number;
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. STORE
 * ========================================================================== */

type RuntimeSchedulerStore = {
  schedules: Map<string, RuntimeSchedule>;
};

declare global {
  // eslint-disable-next-line no-var
  var __XYVALA_RUNTIME_SCHEDULER_STORE__: RuntimeSchedulerStore | undefined;
}

function getStore(): RuntimeSchedulerStore {
  if (!globalThis.__XYVALA_RUNTIME_SCHEDULER_STORE__) {
    globalThis.__XYVALA_RUNTIME_SCHEDULER_STORE__ = {
      schedules: new Map(),
    };
  }

  return globalThis.__XYVALA_RUNTIME_SCHEDULER_STORE__;
}

/* ============================================================================
 * 3. HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

function cadenceMs(cadence: RuntimeScheduleCadence): number {
  if (cadence === "day") return 24 * 60 * 60_000;
  if (cadence === "hour") return 60 * 60_000;
  if (cadence === "fifteen_minutes") return 15 * 60_000;
  if (cadence === "five_minutes") return 5 * 60_000;

  return 60_000;
}

function nextRunIso(input: {
  cadence: RuntimeScheduleCadence;
  from?: string | null;
}): string {
  const base = input.from ? new Date(input.from).getTime() : Date.now();
  const safeBase = Number.isFinite(base) ? base : Date.now();

  return new Date(safeBase + cadenceMs(input.cadence)).toISOString();
}

function isDue(schedule: RuntimeSchedule, ts: number): boolean {
  if (schedule.status !== "active") return false;

  const next = new Date(schedule.next_run_at).getTime();

  return Number.isFinite(next) && next <= ts;
}

function cloneSchedule(schedule: RuntimeSchedule): RuntimeSchedule {
  return {
    ...schedule,
    payload: { ...schedule.payload },
    warnings: [...schedule.warnings],
  };
}

function buildScheduleId(input: {
  job_kind: BackgroundJobKind;
  cadence: RuntimeScheduleCadence;
}): string {
  return `schedule_${input.job_kind}_${input.cadence}`;
}

/* ============================================================================
 * 4. DEFAULT SCHEDULES
 * ========================================================================== */

const DEFAULT_RUNTIME_SCHEDULES: Array<{
  job_kind: BackgroundJobKind;
  cadence: RuntimeScheduleCadence;
  payload?: Record<string, string | number | boolean | null>;
}> = [
  { job_kind: "monitoring_evaluation", cadence: "five_minutes" },
  { job_kind: "quota_snapshot", cadence: "fifteen_minutes" },
  { job_kind: "analytics_snapshot", cadence: "hour" },
  { job_kind: "audit_flush", cadence: "hour" },
  { job_kind: "session_cleanup", cadence: "day" },
  { job_kind: "runtime_cleanup", cadence: "day" },
];

/* ============================================================================
 * 5. MUTATE — SCHEDULE REGISTRATION
 * ========================================================================== */

export function registerRuntimeSchedule(input: {
  job_kind: BackgroundJobKind;
  cadence: RuntimeScheduleCadence;
  status?: RuntimeScheduleStatus;
  payload?: Record<string, string | number | boolean | null>;
  warnings?: string[];
}): RuntimeSchedule {
  const schedule: RuntimeSchedule = {
    id: buildScheduleId({
      job_kind: input.job_kind,
      cadence: input.cadence,
    }),

    job_kind: input.job_kind,
    cadence: input.cadence,
    status: input.status ?? "active",

    last_run_at: null,
    next_run_at: nextRunIso({
      cadence: input.cadence,
    }),

    payload: sanitizePayload(input.payload),

    warnings: uniqueWarnings(input.warnings),
  };

  getStore().schedules.set(schedule.id, schedule);

  return cloneSchedule(schedule);
}

export function registerDefaultRuntimeSchedules(): RuntimeSchedule[] {
  return DEFAULT_RUNTIME_SCHEDULES.map((schedule) =>
    registerRuntimeSchedule({
      job_kind: schedule.job_kind,
      cadence: schedule.cadence,
      ...(schedule.payload !== undefined ? { payload: schedule.payload } : {}),
      warnings: ["default_runtime_schedule_registered"],
    }),
  );
}

/* ============================================================================
 * 6. OBSERVE — READERS
 * ========================================================================== */

export function findRuntimeScheduleById(id: string): RuntimeSchedule | null {
  const schedule = getStore().schedules.get(safeString(id));

  return schedule ? cloneSchedule(schedule) : null;
}

export function listRuntimeSchedules(): RuntimeSchedule[] {
  return [...getStore().schedules.values()].map(cloneSchedule);
}

export function listDueRuntimeSchedules(ts = Date.now()): RuntimeSchedule[] {
  return listRuntimeSchedules().filter((schedule) => isDue(schedule, ts));
}

/* ============================================================================
 * 7. MUTATE — SCHEDULE STATUS
 * ========================================================================== */

export function setRuntimeScheduleStatus(input: {
  id: string;
  status: RuntimeScheduleStatus;
}): RuntimeSchedule | null {
  const store = getStore();
  const existing = store.schedules.get(safeString(input.id));

  if (!existing) return null;

  const updated: RuntimeSchedule = {
    ...existing,
    status: input.status,
    warnings: uniqueWarnings(
      existing.warnings,
      [`runtime_schedule_${input.status}`],
    ),
  };

  store.schedules.set(updated.id, updated);

  return cloneSchedule(updated);
}

/* ============================================================================
 * 8. MUTATE — TICK / ENQUEUE ONLY
 * ========================================================================== */

export async function tickRuntimeScheduler(): Promise<RuntimeSchedulerTickResult> {
  const ts = Date.now();
  const evaluatedAt = nowIso();
  const store = getStore();

  const due = [...store.schedules.values()].filter((schedule) =>
    isDue(schedule, ts),
  );

  const enqueuedJobs: BackgroundJob[] = [];

  for (const schedule of due) {
    const job = enqueueBackgroundJob({
      kind: schedule.job_kind,
      payload: {
        schedule_id: schedule.id,
        cadence: schedule.cadence,
        ...schedule.payload,
      },
    });

    enqueuedJobs.push(job);

    const updated: RuntimeSchedule = {
      ...schedule,
      last_run_at: evaluatedAt,
      next_run_at: nextRunIso({
        cadence: schedule.cadence,
        from: evaluatedAt,
      }),
      warnings: uniqueWarnings(schedule.warnings, [
        "runtime_schedule_tick_enqueued",
      ]),
    };

    store.schedules.set(updated.id, updated);
  }

  return {
    ok: true,
    evaluated_at: evaluatedAt,
    due_count: due.length,
    enqueued_jobs: enqueuedJobs,
    warnings: due.length > 0 ? ["runtime_scheduler_tick_completed"] : [],
    error: null,
  };
}

/* ============================================================================
 * 9. EXPLICIT MUTATION — OPTIONAL EVENT EMISSION
 * ========================================================================== */

export async function emitRuntimeSchedulerTickEvents(
  result: RuntimeSchedulerTickResult,
): Promise<RuntimeSchedulerEventMutationResult> {
  const emittedAt = nowIso();
  let emitted = 0;

  for (const job of result.enqueued_jobs) {
    await publishRuntimeEvent({
      kind: "runtime_job_requested",
      priority: "normal",
      payload: {
        job_id: job.id,
        job_kind: job.kind,
      },
      warnings: ["runtime_scheduler_job_requested"],
    });

    emitted += 1;
  }

  return {
    ok: true,
    emitted_at: emittedAt,
    emitted,
    warnings:
      emitted > 0
        ? ["runtime_scheduler_tick_events_emitted"]
        : ["runtime_scheduler_tick_events_not_required"],
    error: null,
  };
}

/* ============================================================================
 * 10. MUTATE — MAINTENANCE
 * ========================================================================== */

export function clearRuntimeSchedulerStore(): void {
  getStore().schedules.clear();
}
