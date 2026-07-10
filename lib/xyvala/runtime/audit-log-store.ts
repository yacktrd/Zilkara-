/* ============================================================================
 * FILE: lib/xyvala/runtime/audit-log-store.ts
 * ============================================================================
 * TITLE
 * - Runtime audit log store
 *
 * ROLE
 * - create explicit audit records
 * - store runtime audit records in controlled memory
 * - expose pure audit readers and store statistics
 *
 * DIRECTIVES
 * - MUTATE layer only for create / clear
 * - OBSERVE layer only for readers
 * - no event publishing
 * - no background job enqueue
 * - no failover trigger
 * - no recovery trigger
 * - no queue write
 * - no business mutation
 * - no billing mutation
 * - no account mutation
 * - no API key mutation
 * - deterministic id generation without Math.random
 *
 * INVARIANTS
 * - audit creation is explicit mutation
 * - audit readers never mutate
 * - audit records are cloned before exposure
 * - audit metadata is sanitized
 * ========================================================================== */

export type AuditLogLevel = "debug" | "info" | "warn" | "error" | "critical";

export type AuditLogDomain =
  | "runtime"
  | "auth"
  | "account"
  | "api_key"
  | "usage"
  | "quota"
  | "billing"
  | "stripe"
  | "webhook"
  | "security"
  | "system";

export type AuditLogRecord = {
  id: string;
  ts: string;

  domain: AuditLogDomain;
  level: AuditLogLevel;
  event: string;

  actor_id: string | null;
  account_id: string | null;
  request_id: string | null;

  source: string;
  message: string;

  metadata: Record<string, string | number | boolean | null>;
  warnings: string[];
};

export type CreateAuditLogInput = {
  domain: AuditLogDomain;
  level?: AuditLogLevel;
  event: string;

  actor_id?: string | null;
  account_id?: string | null;
  request_id?: string | null;

  source?: string;
  message?: string;

  metadata?: Record<string, string | number | boolean | null>;
  warnings?: string[];
};

export type AuditLogStoreStats = {
  total: number;
  runtime: number;
  auth: number;
  api_key: number;
  billing: number;
  security: number;
  error: number;
  critical: number;
};

type AuditLogStoreState = {
  records: Map<string, AuditLogRecord>;
  recordsByDomain: Map<AuditLogDomain, Set<string>>;
  recordsByAccount: Map<string, Set<string>>;
  sequence: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __XYVALA_AUDIT_LOG_STORE__: AuditLogStoreState | undefined;
}

function getStore(): AuditLogStoreState {
  if (!globalThis.__XYVALA_AUDIT_LOG_STORE__) {
    globalThis.__XYVALA_AUDIT_LOG_STORE__ = {
      records: new Map(),
      recordsByDomain: new Map(),
      recordsByAccount: new Map(),
      sequence: 0,
    };
  }

  return globalThis.__XYVALA_AUDIT_LOG_STORE__;
}

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

function sanitizeMetadata(
  metadata: Record<string, string | number | boolean | null> | undefined,
): Record<string, string | number | boolean | null> {
  const output: Record<string, string | number | boolean | null> = {};

  if (!metadata) return output;

  for (const [key, value] of Object.entries(metadata)) {
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

function nextAuditSequence(): number {
  const store = getStore();

  store.sequence += 1;

  return store.sequence;
}

function buildAuditLogId(input: {
  domain: AuditLogDomain;
  event: string;
  ts: string;
}): string {
  const sequence = nextAuditSequence();
  const normalizedEvent = input.event.replace(/[^a-zA-Z0-9_-]/g, "_");

  return `audit_${input.domain}_${normalizedEvent}_${Date.parse(input.ts)}_${sequence}`;
}

function cloneAuditLog(record: AuditLogRecord): AuditLogRecord {
  return {
    ...record,
    metadata: { ...record.metadata },
    warnings: [...record.warnings],
  };
}

function indexAuditLog(record: AuditLogRecord): void {
  const store = getStore();

  const domainSet =
    store.recordsByDomain.get(record.domain) ?? new Set<string>();

  domainSet.add(record.id);
  store.recordsByDomain.set(record.domain, domainSet);

  if (record.account_id) {
    const accountSet =
      store.recordsByAccount.get(record.account_id) ?? new Set<string>();

    accountSet.add(record.id);
    store.recordsByAccount.set(record.account_id, accountSet);
  }
}

/* ============================================================================
 * MUTATE — AUDIT CREATION
 * ========================================================================== */

export function createAuditLog(input: CreateAuditLogInput): AuditLogRecord {
  const ts = nowIso();

  const event = safeString(input.event) || "runtime_event";
  const source = safeString(input.source) || "xyvala_runtime";

  const record: AuditLogRecord = {
    id: buildAuditLogId({
      domain: input.domain,
      event,
      ts,
    }),

    ts,

    domain: input.domain,
    level: input.level ?? "info",
    event,

    actor_id: safeString(input.actor_id) || null,
    account_id: safeString(input.account_id) || null,
    request_id: safeString(input.request_id) || null,

    source,
    message: safeString(input.message) || event,

    metadata: sanitizeMetadata(input.metadata),
    warnings: uniqueWarnings(input.warnings),
  };

  const store = getStore();

  store.records.set(record.id, record);
  indexAuditLog(record);

  return cloneAuditLog(record);
}

/* ============================================================================
 * OBSERVE — READERS
 * ========================================================================== */

export function findAuditLogById(id: string): AuditLogRecord | null {
  const record = getStore().records.get(safeString(id));

  return record ? cloneAuditLog(record) : null;
}

export function listAuditLogs(): AuditLogRecord[] {
  return [...getStore().records.values()].map(cloneAuditLog);
}

export function listAuditLogsByDomain(
  domain: AuditLogDomain,
): AuditLogRecord[] {
  const ids = getStore().recordsByDomain.get(domain);

  if (!ids) return [];

  return [...ids]
    .map((id) => findAuditLogById(id))
    .filter((record): record is AuditLogRecord => record !== null);
}

export function listAuditLogsByAccount(accountId: string): AuditLogRecord[] {
  const ids = getStore().recordsByAccount.get(safeString(accountId));

  if (!ids) return [];

  return [...ids]
    .map((id) => findAuditLogById(id))
    .filter((record): record is AuditLogRecord => record !== null);
}

export function getAuditLogStoreStats(): AuditLogStoreStats {
  const records = listAuditLogs();

  return {
    total: records.length,
    runtime: records.filter((record) => record.domain === "runtime").length,
    auth: records.filter((record) => record.domain === "auth").length,
    api_key: records.filter((record) => record.domain === "api_key").length,
    billing: records.filter((record) => record.domain === "billing").length,
    security: records.filter((record) => record.domain === "security").length,
    error: records.filter((record) => record.level === "error").length,
    critical: records.filter((record) => record.level === "critical").length,
  };
}

/* ============================================================================
 * MUTATE — MAINTENANCE
 * ========================================================================== */

export function clearAuditLogStore(): void {
  const store = getStore();

  store.records.clear();
  store.recordsByDomain.clear();
  store.recordsByAccount.clear();
  store.sequence = 0;
}
