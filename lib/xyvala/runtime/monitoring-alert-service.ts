/* ============================================================================
 * FILE: lib/xyvala/runtime/monitoring-alert-service.ts
 * ========================================================================== */

import {
  createAuditLog,
  listAuditLogs,
  type AuditLogDomain,
  type AuditLogLevel,
  type AuditLogRecord,
} from "@/lib/xyvala/runtime/audit-log-store";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type MonitoringAlertSeverity =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type MonitoringAlertDecision =
  | "OBSERVE"
  | "WATCH"
  | "ESCALATE";

export type MonitoringAlertKind =
  | "runtime_warning_cluster"
  | "runtime_error_cluster"
  | "runtime_critical_event"
  | "security_pressure"
  | "billing_pressure"
  | "webhook_pressure"
  | "api_key_pressure"
  | "system_instability";

export type MonitoringAlert = {
  id: string;
  ts: string;

  kind: MonitoringAlertKind;
  severity: MonitoringAlertSeverity;
  decision: MonitoringAlertDecision;

  domain: AuditLogDomain | "mixed";
  window_ms: number;

  record_count: number;
  warning_count: number;
  error_count: number;
  critical_count: number;

  message: string;
  reasons: string[];

  related_record_ids: string[];

  warnings: string[];
};

export type MonitoringEvaluationInput = {
  window_ms?: number;
  domain?: AuditLogDomain | null;
  min_warning_count?: number;
  min_error_count?: number;
  min_critical_count?: number;
};

export type MonitoringEvaluationResult = {
  ok: boolean;
  evaluated_at: string;
  window_ms: number;
  domain: AuditLogDomain | "all";

  alerts: MonitoringAlert[];

  warnings: string[];
  error: string | null;
};

export type MonitoringAlertAuditMutationResult = {
  ok: boolean;
  audited_at: string;
  created: number;
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. CONFIG
 * ========================================================================== */

const DEFAULT_WINDOW_MS = 15 * 60_000;
const DEFAULT_MIN_WARNING_COUNT = 10;
const DEFAULT_MIN_ERROR_COUNT = 3;
const DEFAULT_MIN_CRITICAL_COUNT = 1;

/* ============================================================================
 * 3. HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
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

function buildAlertId(input: {
  kind: MonitoringAlertKind;
  ts: string;
  domain: AuditLogDomain | "mixed";
}): string {
  const seed = `${input.kind}:${input.domain}:${input.ts}`;

  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return `alert_${hash.toString(36)}`;
}

function isWithinWindow(record: AuditLogRecord, since: number): boolean {
  const ts = new Date(record.ts).getTime();

  return Number.isFinite(ts) && ts >= since;
}

function levelWeight(level: AuditLogLevel): number {
  if (level === "critical") return 4;
  if (level === "error") return 3;
  if (level === "warn") return 2;
  if (level === "info") return 1;

  return 0;
}

function resolveSeverity(input: {
  warningCount: number;
  errorCount: number;
  criticalCount: number;
  minErrorCount: number;
  minWarningCount: number;
}): MonitoringAlertSeverity {
  if (input.criticalCount > 0) return "critical";
  if (input.errorCount >= input.minErrorCount) return "high";
  if (input.warningCount >= input.minWarningCount) return "medium";

  return "low";
}

function resolveDecision(
  severity: MonitoringAlertSeverity,
): MonitoringAlertDecision {
  if (severity === "critical" || severity === "high") return "ESCALATE";
  if (severity === "medium") return "WATCH";

  return "OBSERVE";
}

function inferKind(input: {
  domain: AuditLogDomain | "mixed";
  errorCount: number;
  criticalCount: number;
  minErrorCount: number;
}): MonitoringAlertKind {
  if (input.criticalCount > 0) return "runtime_critical_event";
  if (input.domain === "security") return "security_pressure";
  if (input.domain === "billing") return "billing_pressure";
  if (input.domain === "webhook" || input.domain === "stripe") {
    return "webhook_pressure";
  }
  if (input.domain === "api_key") return "api_key_pressure";
  if (input.errorCount >= input.minErrorCount) {
    return "runtime_error_cluster";
  }

  return "runtime_warning_cluster";
}

function buildAlert(input: {
  records: AuditLogRecord[];
  domain: AuditLogDomain | "mixed";
  windowMs: number;
  warningCount: number;
  errorCount: number;
  criticalCount: number;
  minWarningCount: number;
  minErrorCount: number;
  reasons: string[];
}): MonitoringAlert {
  const ts = nowIso();

  const severity = resolveSeverity({
    warningCount: input.warningCount,
    errorCount: input.errorCount,
    criticalCount: input.criticalCount,
    minWarningCount: input.minWarningCount,
    minErrorCount: input.minErrorCount,
  });

  const kind = inferKind({
    domain: input.domain,
    errorCount: input.errorCount,
    criticalCount: input.criticalCount,
    minErrorCount: input.minErrorCount,
  });

  return {
    id: buildAlertId({
      kind,
      ts,
      domain: input.domain,
    }),

    ts,

    kind,
    severity,
    decision: resolveDecision(severity),

    domain: input.domain,
    window_ms: input.windowMs,

    record_count: input.records.length,
    warning_count: input.warningCount,
    error_count: input.errorCount,
    critical_count: input.criticalCount,

    message: `Monitoring alert: ${kind}.`,
    reasons: input.reasons,

    related_record_ids: input.records.map((record) => record.id),

    warnings: uniqueWarnings(
      input.records.flatMap((record) => record.warnings),
      input.reasons,
    ),
  };
}

/* ============================================================================
 * 4. EVALUATION — PURE OBSERVE / COMPUTE
 * ========================================================================== */

export function evaluateMonitoringAlerts(
  input: MonitoringEvaluationInput = {},
): MonitoringEvaluationResult {
  const windowMs = safeNumber(input.window_ms, DEFAULT_WINDOW_MS);
  const evaluatedAt = nowIso();
  const since = Date.now() - windowMs;

  const minWarningCount = safeNumber(
    input.min_warning_count,
    DEFAULT_MIN_WARNING_COUNT,
  );

  const minErrorCount = safeNumber(
    input.min_error_count,
    DEFAULT_MIN_ERROR_COUNT,
  );

  const minCriticalCount = safeNumber(
    input.min_critical_count,
    DEFAULT_MIN_CRITICAL_COUNT,
  );

  const records = listAuditLogs()
    .filter((record) => isWithinWindow(record, since))
    .filter((record) => (input.domain ? record.domain === input.domain : true))
    .sort(
      (left, right) =>
        levelWeight(right.level) - levelWeight(left.level) ||
        new Date(right.ts).getTime() - new Date(left.ts).getTime(),
    );

  const warningRecords = records.filter((record) => record.level === "warn");
  const errorRecords = records.filter((record) => record.level === "error");
  const criticalRecords = records.filter(
    (record) => record.level === "critical",
  );

  const reasons: string[] = [];

  if (warningRecords.length >= minWarningCount) {
    reasons.push("monitoring_warning_threshold_reached");
  }

  if (errorRecords.length >= minErrorCount) {
    reasons.push("monitoring_error_threshold_reached");
  }

  if (criticalRecords.length >= minCriticalCount) {
    reasons.push("monitoring_critical_threshold_reached");
  }

  const alerts =
    reasons.length > 0
      ? [
          buildAlert({
            records,
            domain: input.domain ?? "mixed",
            windowMs,
            warningCount: warningRecords.length,
            errorCount: errorRecords.length,
            criticalCount: criticalRecords.length,
            minWarningCount,
            minErrorCount,
            reasons,
          }),
        ]
      : [];

  return {
    ok: true,
    evaluated_at: evaluatedAt,
    window_ms: windowMs,
    domain: input.domain ?? "all",

    alerts,

    warnings: alerts.length > 0 ? ["monitoring_alerts_generated"] : [],
    error: null,
  };
}

/* ============================================================================
 * 5. EXPLICIT MUTATION — AUDIT CREATION
 * ========================================================================== */

export function createMonitoringAlertAuditRecords(
  result: MonitoringEvaluationResult,
): MonitoringAlertAuditMutationResult {
  const auditedAt = nowIso();
  let created = 0;

  for (const alert of result.alerts) {
    createAuditLog({
      domain: "system",
      level:
        alert.severity === "critical"
          ? "critical"
          : alert.severity === "high"
            ? "error"
            : alert.severity === "medium"
              ? "warn"
              : "info",
      event: alert.kind,
      source: "monitoring_alert_service",
      message: alert.message,
      metadata: {
        alert_id: alert.id,
        severity: alert.severity,
        decision: alert.decision,
        record_count: alert.record_count,
        warning_count: alert.warning_count,
        error_count: alert.error_count,
        critical_count: alert.critical_count,
      },
      warnings: alert.warnings,
    });

    created += 1;
  }

  return {
    ok: true,
    audited_at: auditedAt,
    created,
    warnings:
      created > 0
        ? ["monitoring_alert_audit_records_created"]
        : ["monitoring_alert_audit_not_required"],
    error: null,
  };
}

/* ============================================================================
 * 6. READERS — PURE EVALUATION HELPERS
 * ========================================================================== */

export function evaluateSecurityMonitoringAlerts(): MonitoringEvaluationResult {
  return evaluateMonitoringAlerts({
    domain: "security",
  });
}

export function evaluateBillingMonitoringAlerts(): MonitoringEvaluationResult {
  return evaluateMonitoringAlerts({
    domain: "billing",
  });
}

export function evaluateRuntimeMonitoringAlerts(): MonitoringEvaluationResult {
  return evaluateMonitoringAlerts({
    domain: "runtime",
  });
}
