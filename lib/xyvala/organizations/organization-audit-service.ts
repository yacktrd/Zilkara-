/* ============================================================================
 * FILE: lib/xyvala/organizations/organization-audit-service.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala organization audit service
 *
 * ROLE
 * - trace organization-scoped governance events
 * - normalize membership, RBAC, quota and sensitive workspace operations
 * - persist enterprise audit events through the canonical audit log store
 *
 * PARENTS
 * - lib/xyvala/runtime/audit-log-store.ts
 * - lib/xyvala/organizations/organization-store.ts
 * - lib/xyvala/organizations/organization-access-service.ts
 * - lib/xyvala/organizations/organization-quota-service.ts
 *
 * DIRECTIVES
 * - organization audit only
 * - no UI logic
 * - no route response building
 * - no billing mutation
 * - no account mutation
 * - no organization mutation
 * - no membership mutation
 * - no quota mutation
 * - no persistence outside audit-log-store
 * - no RFS recomputation
 * - no MCI recomputation
 * - deterministic audit classification only
 *
 * INVARIANTS
 * - every organization audit event is scoped to an organization
 * - every organization audit event is persisted in audit-log-store
 * - sensitive events are explicitly classified
 * - metadata never stores raw secrets
 * - organization audit does not mutate governance state
 * ========================================================================== */

import {
  createAuditLog,
  type AuditLogLevel,
  type AuditLogRecord,
} from "@/lib/xyvala/runtime/audit-log-store";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type OrganizationAuditEventKind =
  | "organization_created"
  | "organization_updated"
  | "organization_disabled"
  | "organization_deleted"
  | "ownership_transfer_requested"
  | "ownership_transferred"
  | "member_invited"
  | "member_role_updated"
  | "member_removed"
  | "member_access_denied"
  | "rbac_permission_denied"
  | "quota_pressure_detected"
  | "quota_exceeded"
  | "billing_accessed"
  | "billing_updated"
  | "api_key_created"
  | "api_key_revoked"
  | "settings_updated"
  | "audit_accessed"
  | "organization_security_warning";

export type OrganizationAuditSensitivity =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type OrganizationAuditInput = {
  organization_id: string;

  kind: OrganizationAuditEventKind;

  actor_account_id?: string | null;
  target_account_id?: string | null;
  request_id?: string | null;

  source?: string;
  message?: string;

  metadata?: Record<string, string | number | boolean | null>;
  warnings?: string[];
};

export type OrganizationAuditResult = {
  ok: boolean;

  organization_id: string;
  kind: OrganizationAuditEventKind;
  sensitivity: OrganizationAuditSensitivity;

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

function resolveSensitivity(
  kind: OrganizationAuditEventKind,
): OrganizationAuditSensitivity {
  if (
    kind === "organization_deleted" ||
    kind === "ownership_transferred" ||
    kind === "quota_exceeded" ||
    kind === "api_key_revoked"
  ) {
    return "critical";
  }

  if (
    kind === "ownership_transfer_requested" ||
    kind === "member_removed" ||
    kind === "rbac_permission_denied" ||
    kind === "billing_updated" ||
    kind === "api_key_created" ||
    kind === "settings_updated" ||
    kind === "organization_security_warning"
  ) {
    return "high";
  }

  if (
    kind === "organization_updated" ||
    kind === "organization_disabled" ||
    kind === "member_invited" ||
    kind === "member_role_updated" ||
    kind === "member_access_denied" ||
    kind === "quota_pressure_detected" ||
    kind === "billing_accessed" ||
    kind === "audit_accessed"
  ) {
    return "medium";
  }

  return "low";
}

function resolveAuditLevel(
  sensitivity: OrganizationAuditSensitivity,
): AuditLogLevel {
  if (sensitivity === "critical") return "critical";
  if (sensitivity === "high") return "error";
  if (sensitivity === "medium") return "warn";

  return "info";
}

/* ============================================================================
 * 3. ORGANIZATION AUDIT SERVICE
 * ========================================================================== */

export function recordOrganizationAuditEvent(
  input: OrganizationAuditInput,
): OrganizationAuditResult {
  const organizationId = safeString(input.organization_id);

  const sensitivity = resolveSensitivity(input.kind);

  const warnings = uniqueWarnings(
    input.warnings,
    [`organization_audit_${input.kind}`],
    [`organization_audit_sensitivity_${sensitivity}`],
  );

  const auditLog = createAuditLog({
    domain: "system",
    level: resolveAuditLevel(sensitivity),
    event: input.kind,

    actor_id: input.actor_account_id ?? null,
    account_id: input.target_account_id ?? input.actor_account_id ?? null,
    request_id: input.request_id ?? null,

    source: safeString(input.source) || "organization_audit_service",
    message:
      safeString(input.message) ||
      `Organization audit event recorded: ${input.kind}`,

    metadata: {
      organization_id: organizationId,
      kind: input.kind,
      sensitivity,
      actor_account_id: input.actor_account_id ?? null,
      target_account_id: input.target_account_id ?? null,
      ...(input.metadata ?? {}),
    },

    warnings,
  });

  return {
    ok: true,

    organization_id: organizationId,
    kind: input.kind,
    sensitivity,

    audit_log: auditLog,

    warnings,
    error: null,
  };
}

/* ============================================================================
 * 4. CONVENIENCE HELPERS
 * ========================================================================== */

export function recordOrganizationMembershipAudit(input: {
  organization_id: string;
  kind: "member_invited" | "member_role_updated" | "member_removed";
  actor_account_id?: string | null;
  target_account_id?: string | null;
  request_id?: string | null;
  role?: string | null;
}): OrganizationAuditResult {
  return recordOrganizationAuditEvent({
    organization_id: input.organization_id,
    kind: input.kind,
    actor_account_id: input.actor_account_id ?? null,
    target_account_id: input.target_account_id ?? null,
    request_id: input.request_id ?? null,
    source: "organization_membership",
    message: `Organization membership event: ${input.kind}.`,
    metadata: {
      role: input.role ?? null,
    },
  });
}

export function recordOrganizationAccessDenied(input: {
  organization_id: string;
  actor_account_id?: string | null;
  request_id?: string | null;
  reason: string;
  permission?: string | null;
}): OrganizationAuditResult {
  return recordOrganizationAuditEvent({
    organization_id: input.organization_id,
    kind: "rbac_permission_denied",
    actor_account_id: input.actor_account_id ?? null,
    request_id: input.request_id ?? null,
    source: "organization_access",
    message: `Organization access denied: ${input.reason}.`,
    metadata: {
      reason: input.reason,
      permission: input.permission ?? null,
    },
    warnings: ["organization_access_denied"],
  });
}

export function recordOrganizationQuotaAudit(input: {
  organization_id: string;
  actor_account_id?: string | null;
  request_id?: string | null;
  exceeded: boolean;
  usage_pct?: number | null;
  reason?: string | null;
}): OrganizationAuditResult {
  return recordOrganizationAuditEvent({
    organization_id: input.organization_id,
    kind: input.exceeded ? "quota_exceeded" : "quota_pressure_detected",
    actor_account_id: input.actor_account_id ?? null,
    request_id: input.request_id ?? null,
    source: "organization_quota",
    message: input.exceeded
      ? "Organization quota exceeded."
      : "Organization quota pressure detected.",
    metadata: {
      exceeded: input.exceeded,
      usage_pct: input.usage_pct ?? null,
      reason: input.reason ?? null,
    },
    warnings: [
      input.exceeded
        ? "organization_quota_exceeded"
        : "organization_quota_pressure_detected",
    ],
  });
}

export function recordOrganizationApiKeyAudit(input: {
  organization_id: string;
  kind: "api_key_created" | "api_key_revoked";
  actor_account_id?: string | null;
  request_id?: string | null;
  api_key_id?: string | null;
}): OrganizationAuditResult {
  return recordOrganizationAuditEvent({
    organization_id: input.organization_id,
    kind: input.kind,
    actor_account_id: input.actor_account_id ?? null,
    request_id: input.request_id ?? null,
    source: "organization_api_key",
    message: `Organization API key event: ${input.kind}.`,
    metadata: {
      api_key_id: input.api_key_id ?? null,
    },
  });
}
