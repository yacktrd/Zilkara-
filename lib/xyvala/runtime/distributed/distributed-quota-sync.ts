/* ============================================================================
 * FILE: lib/xyvala/runtime/distributed/distributed-quota-sync.ts
 * ========================================================================== */

import type {
  QuotaDecision,
  QuotaPressureState,
} from "@/lib/xyvala/api-keys/quota-engine";

import {
  redisGet,
  redisSet,
  redisIncrement,
} from "@/lib/xyvala/runtime/redis/redis-adapter";

import {
  publishRuntimeEvent,
} from "@/lib/xyvala/runtime/events/event-bus";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type DistributedQuotaSyncStatus =
  | "synced"
  | "stale"
  | "unavailable"
  | "invalid";

export type DistributedQuotaScope = "api_key" | "account" | "organization";

export type DistributedQuotaSnapshot = {
  id: string;

  api_key_id: string | null;
  account_id: string | null;
  organization_id: string | null;

  scope: DistributedQuotaScope;

  decision: QuotaDecision;
  pressure_state: QuotaPressureState;

  usage_pct: number;
  daily_used: number;
  daily_limit: number;
  monthly_used: number;
  monthly_limit: number;

  synced_at: string;
  expires_at: string;

  warnings: string[];
};

export type DistributedQuotaSyncInput = Omit<
  DistributedQuotaSnapshot,
  "id" | "synced_at" | "expires_at"
> & {
  ttl_seconds?: number | null;
};

export type DistributedQuotaSyncResult = {
  ok: boolean;
  status: DistributedQuotaSyncStatus;
  snapshot: DistributedQuotaSnapshot | null;
  warnings: string[];
  error: string | null;
};

export type DistributedQuotaHealthResult = {
  ok: boolean;
  checked_at: string;
  warnings: string[];
  error: string | null;
};

export type DistributedQuotaEventMutationResult = {
  ok: boolean;
  emitted_at: string;
  snapshot: DistributedQuotaSnapshot | null;
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. CONFIG
 * ========================================================================== */

const DEFAULT_QUOTA_SYNC_TTL_SECONDS = 15 * 60;
const QUOTA_SYNC_COUNTER_TTL_SECONDS = 60;
const QUOTA_SYNC_KEY_PREFIX = "xyvala:quota";

/* ============================================================================
 * 3. HELPERS
 * ========================================================================== */

function nowMs(): number {
  return Date.now();
}

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function safeTtl(value: number | null | undefined): number {
  if (!Number.isFinite(value ?? NaN)) return DEFAULT_QUOTA_SYNC_TTL_SECONDS;
  return Math.max(60, Math.trunc(value as number));
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

function buildSnapshotId(input: {
  scope: DistributedQuotaScope;
  api_key_id?: string | null;
  account_id?: string | null;
  organization_id?: string | null;
}): string {
  return [
    input.scope,
    input.organization_id ?? "no-org",
    input.account_id ?? "no-account",
    input.api_key_id ?? "no-key",
  ].join(":");
}

function buildQuotaKey(id: string): string {
  return `${QUOTA_SYNC_KEY_PREFIX}:snapshot:${safeString(id)}`;
}

function buildQuotaCounterKey(input: {
  scope: DistributedQuotaScope;
  id: string;
}): string {
  return `${QUOTA_SYNC_KEY_PREFIX}:counter:${input.scope}:${safeString(input.id)}`;
}

function isExpired(snapshot: DistributedQuotaSnapshot): boolean {
  const expiresAt = new Date(snapshot.expires_at).getTime();

  return !Number.isFinite(expiresAt) || expiresAt <= nowMs();
}

function buildSnapshot(input: DistributedQuotaSyncInput): DistributedQuotaSnapshot {
  const ttl = safeTtl(input.ttl_seconds);
  const syncedAtMs = nowMs();

  return {
    id: buildSnapshotId(input),

    api_key_id: input.api_key_id ?? null,
    account_id: input.account_id ?? null,
    organization_id: input.organization_id ?? null,

    scope: input.scope,

    decision: input.decision,
    pressure_state: input.pressure_state,

    usage_pct: clampPct(input.usage_pct),
    daily_used: clampNonNegative(input.daily_used),
    daily_limit: clampNonNegative(input.daily_limit),
    monthly_used: clampNonNegative(input.monthly_used),
    monthly_limit: clampNonNegative(input.monthly_limit),

    synced_at: new Date(syncedAtMs).toISOString(),
    expires_at: new Date(syncedAtMs + ttl * 1000).toISOString(),

    warnings: uniqueWarnings(input.warnings),
  };
}

function isValidSnapshot(
  snapshot: DistributedQuotaSnapshot | null,
): snapshot is DistributedQuotaSnapshot {
  if (!snapshot) return false;
  if (!safeString(snapshot.id)) return false;

  return ["api_key", "account", "organization"].includes(snapshot.scope);
}

/* ============================================================================
 * 4. MUTATE — SYNC WRITERS
 * ========================================================================== */

export async function syncDistributedQuotaSnapshot(
  input: DistributedQuotaSyncInput,
): Promise<DistributedQuotaSyncResult> {
  const snapshot = buildSnapshot(input);
  const key = buildQuotaKey(snapshot.id);
  const ttl = safeTtl(input.ttl_seconds);

  const stored = await redisSet(key, snapshot, ttl);

  if (!stored.ok) {
    return {
      ok: false,
      status: "unavailable",
      snapshot,
      warnings: uniqueWarnings(stored.warnings, [
        "distributed_quota_sync_unavailable",
      ]),
      error: stored.error ?? "distributed_quota_sync_unavailable",
    };
  }

  const counter = await redisIncrement(
    buildQuotaCounterKey({
      scope: snapshot.scope,
      id: snapshot.id,
    }),
    QUOTA_SYNC_COUNTER_TTL_SECONDS,
  );

  return {
    ok: true,
    status: "synced",
    snapshot,
    warnings: uniqueWarnings(
      snapshot.warnings,
      counter.warnings,
      ["distributed_quota_snapshot_synced"],
    ),
    error: null,
  };
}

/* ============================================================================
 * 5. OBSERVE — SYNC READERS
 * ========================================================================== */

export async function getDistributedQuotaSnapshot(input: {
  scope: DistributedQuotaScope;
  api_key_id?: string | null;
  account_id?: string | null;
  organization_id?: string | null;
}): Promise<DistributedQuotaSyncResult> {
  const id = buildSnapshotId(input);
  const result = await redisGet<DistributedQuotaSnapshot>(buildQuotaKey(id));

  if (!result.ok) {
    return {
      ok: false,
      status: "unavailable",
      snapshot: null,
      warnings: uniqueWarnings(result.warnings, [
        "distributed_quota_snapshot_unavailable",
      ]),
      error: result.error ?? "distributed_quota_snapshot_unavailable",
    };
  }

  const snapshot = result.data;

  if (!isValidSnapshot(snapshot)) {
    return {
      ok: false,
      status: "invalid",
      snapshot: null,
      warnings: ["distributed_quota_snapshot_invalid"],
      error: "distributed_quota_snapshot_invalid",
    };
  }

  if (isExpired(snapshot)) {
    return {
      ok: false,
      status: "stale",
      snapshot,
      warnings: ["distributed_quota_snapshot_stale"],
      error: "distributed_quota_snapshot_stale",
    };
  }

  return {
    ok: true,
    status: "synced",
    snapshot,
    warnings: [],
    error: null,
  };
}

/* ============================================================================
 * 6. EXPLICIT MUTATION — OPTIONAL EVENT EMISSION
 * ========================================================================== */

export async function emitDistributedQuotaSyncEvent(
  result: DistributedQuotaSyncResult,
): Promise<DistributedQuotaEventMutationResult> {
  const emittedAt = nowIso();

  if (!result.snapshot) {
    return {
      ok: false,
      emitted_at: emittedAt,
      snapshot: null,
      warnings: ["distributed_quota_sync_event_snapshot_missing"],
      error: "distributed_quota_sync_event_snapshot_missing",
    };
  }

  await publishRuntimeEvent({
    kind: "quota_evaluated",
    priority: result.snapshot.decision === "BLOCK" ? "high" : "normal",
    account_id: result.snapshot.account_id,
    organization_id: result.snapshot.organization_id,
    payload: {
      snapshot_id: result.snapshot.id,
      scope: result.snapshot.scope,
      decision: result.snapshot.decision,
      pressure_state: result.snapshot.pressure_state,
      usage_pct: result.snapshot.usage_pct,
    },
    warnings: ["distributed_quota_snapshot_synced"],
  });

  return {
    ok: true,
    emitted_at: emittedAt,
    snapshot: result.snapshot,
    warnings: ["distributed_quota_sync_event_emitted"],
    error: null,
  };
}

/* ============================================================================
 * 7. CONVENIENCE WRITERS
 * ========================================================================== */

export async function syncApiKeyQuotaSnapshot(
  input: Omit<DistributedQuotaSyncInput, "scope">,
): Promise<DistributedQuotaSyncResult> {
  return syncDistributedQuotaSnapshot({
    ...input,
    scope: "api_key",
  });
}

export async function syncAccountQuotaSnapshot(
  input: Omit<DistributedQuotaSyncInput, "scope">,
): Promise<DistributedQuotaSyncResult> {
  return syncDistributedQuotaSnapshot({
    ...input,
    scope: "account",
  });
}

export async function syncOrganizationQuotaSnapshot(
  input: Omit<DistributedQuotaSyncInput, "scope">,
): Promise<DistributedQuotaSyncResult> {
  return syncDistributedQuotaSnapshot({
    ...input,
    scope: "organization",
  });
}

/* ============================================================================
 * 8. MUTATE — EXPLICIT HEALTH PROBE
 * ========================================================================== */

export async function probeDistributedQuotaSyncHealth(): Promise<DistributedQuotaHealthResult> {
  const checkedAt = nowIso();

  const probe = await redisSet(
    `${QUOTA_SYNC_KEY_PREFIX}:health`,
    { checked_at: checkedAt },
    60,
  );

  return {
    ok: probe.ok,
    checked_at: checkedAt,
    warnings: probe.ok ? [] : probe.warnings,
    error: probe.error,
  };
}

/* ============================================================================
 * 9. BACKWARD-COMPATIBLE HEALTH ALIAS
 * ========================================================================== */

export async function getDistributedQuotaSyncHealth(): Promise<DistributedQuotaHealthResult> {
  return probeDistributedQuotaSyncHealth();
}
