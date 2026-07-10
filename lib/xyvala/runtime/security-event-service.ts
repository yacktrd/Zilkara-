/* ============================================================================
 * FILE: lib/xyvala/runtime/security-event-service.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala runtime security event service
 *
 * ROLE
 * - classify runtime security events
 * - normalize auth, API key, quota, billing and webhook anomalies
 * - persist security events through the canonical audit log store
 *
 * PARENTS
 * - lib/xyvala/runtime/audit-log-store.ts
 * - lib/xyvala/accounts/account-auth.ts
 * - lib/xyvala/api-keys/api-key-usage.ts
 * - lib/xyvala/billing/stripe-webhook-service.ts
 *
 * DIRECTIVES
 * - security governance only
 * - no UI logic
 * - no route response building
 * - no billing mutation
 * - no API key mutation
 * - no account mutation
 * - no quota mutation
 * - no persistence outside audit-log-store
 * - no RFS recomputation
 * - no MCI recomputation
 * - deterministic classification only
 *
 * INVARIANTS
 * - every security event is classified
 * - every security event is audit logged
 * - severity is explicit
 * - domain is always security
 * - metadata never stores raw secrets
 * ========================================================================== */

import {
  createAuditLog,
  type AuditLogRecord,
} from "@/lib/xyvala/runtime/audit-log-store";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type SecurityEventKind =
  | "auth_failed"
  | "session_invalid"
  | "session_expired"
  | "api_key_invalid"
  | "api_key_revoked"
  | "api_key_permission_denied"
  | "quota_exceeded"
  | "webhook_signature_invalid"
  | "billing_webhook_failed"
  | "rate_limit_suspected"
  | "forbidden_access"
  | "runtime_security_warning";

export type SecuritySeverity =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type SecurityDecision =
  | "OBSERVE"
  | "WARN"
  | "BLOCK"
  | "ESCALATE";

export type SecurityEventInput = {
  kind: SecurityEventKind;

  account_id?: string | null;
  actor_id?: string | null;
  request_id?: string | null;

  source?: string;
  message?: string;

  ip_hash?: string | null;
  user_agent_hash?: string | null;

  metadata?: Record<string, string | number | boolean | null>;
  warnings?: string[];
};

export type SecurityEventResult = {
  ok: boolean;

  kind: SecurityEventKind;
  severity: SecuritySeverity;
  decision: SecurityDecision;

  audit_log: AuditLogRecord;

  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. HELPERS
 * ========================================================================== */

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

function resolveSeverity(kind: SecurityEventKind): SecuritySeverity {
  if (
    kind === "webhook_signature_invalid" ||
    kind === "billing_webhook_failed" ||
    kind === "rate_limit_suspected"
  ) {
    return "high";
  }

  if (
    kind === "api_key_invalid" ||
    kind === "api_key_revoked" ||
    kind === "api_key_permission_denied" ||
    kind === "quota_exceeded" ||
    kind === "forbidden_access"
  ) {
    return "medium";
  }

  if (
    kind === "auth_failed" ||
    kind === "session_invalid" ||
    kind === "session_expired"
  ) {
    return "low";
  }

  return "medium";
}

function resolveDecision(severity: SecuritySeverity): SecurityDecision {
  if (severity === "critical") return "ESCALATE";
  if (severity === "high") return "BLOCK";
  if (severity === "medium") return "WARN";

  return "OBSERVE";
}

function resolveAuditLevel(
  severity: SecuritySeverity,
): "info" | "warn" | "error" | "critical" {
  if (severity === "critical") return "critical";
  if (severity === "high") return "error";
  if (severity === "medium") return "warn";

  return "info";
}

/* ============================================================================
 * 3. SECURITY EVENT SERVICE
 * ========================================================================== */

export function recordSecurityEvent(
  input: SecurityEventInput,
): SecurityEventResult {
  const severity = resolveSeverity(input.kind);
  const decision = resolveDecision(severity);

  const warnings = uniqueWarnings(
    input.warnings,
    [`security_event_${input.kind}`],
    [`security_decision_${decision.toLowerCase()}`],
  );

  const auditLog = createAuditLog({
    domain: "security",
    level: resolveAuditLevel(severity),
    event: input.kind,

    actor_id: input.actor_id ?? null,
    account_id: input.account_id ?? null,
    request_id: input.request_id ?? null,

    source: safeString(input.source) || "security_event_service",
    message:
      safeString(input.message) ||
      `Security event recorded: ${input.kind}`,

    metadata: {
      kind: input.kind,
      severity,
      decision,
      ip_hash: input.ip_hash ?? null,
      user_agent_hash: input.user_agent_hash ?? null,
      ...(input.metadata ?? {}),
    },

    warnings,
  });

  return {
    ok: true,

    kind: input.kind,
    severity,
    decision,

    audit_log: auditLog,

    warnings,
    error: null,
  };
}

/* ============================================================================
 * 4. CONVENIENCE HELPERS
 * ========================================================================== */

export function recordAuthFailure(input: {
  account_id?: string | null;
  actor_id?: string | null;
  request_id?: string | null;
  source?: string;
  message?: string;
}): SecurityEventResult {
  return recordSecurityEvent({
    kind: "auth_failed",
    account_id: input.account_id ?? null,
    actor_id: input.actor_id ?? null,
    request_id: input.request_id ?? null,
    source: input.source ?? "auth",
    message: input.message ?? "Authentication failed.",
  });
}

export function recordApiKeyFailure(input: {
  account_id?: string | null;
  actor_id?: string | null;
  request_id?: string | null;
  reason?: "invalid" | "revoked" | "permission_denied";
  source?: string;
}): SecurityEventResult {
  const kind =
    input.reason === "revoked"
      ? "api_key_revoked"
      : input.reason === "permission_denied"
        ? "api_key_permission_denied"
        : "api_key_invalid";

  return recordSecurityEvent({
    kind,
    account_id: input.account_id ?? null,
    actor_id: input.actor_id ?? null,
    request_id: input.request_id ?? null,
    source: input.source ?? "api_key",
    message: `API key security event: ${kind}.`,
  });
}

export function recordWebhookSecurityFailure(input: {
  request_id?: string | null;
  source?: string;
  message?: string;
}): SecurityEventResult {
  return recordSecurityEvent({
    kind: "webhook_signature_invalid",
    request_id: input.request_id ?? null,
    source: input.source ?? "stripe_webhook",
    message: input.message ?? "Webhook signature validation failed.",
  });
}

export function recordQuotaSecurityEvent(input: {
  account_id?: string | null;
  actor_id?: string | null;
  request_id?: string | null;
  source?: string;
}): SecurityEventResult {
  return recordSecurityEvent({
    kind: "quota_exceeded",
    account_id: input.account_id ?? null,
    actor_id: input.actor_id ?? null,
    request_id: input.request_id ?? null,
    source: input.source ?? "quota_engine",
    message: "Quota limit exceeded.",
  });
}
