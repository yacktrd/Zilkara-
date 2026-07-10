/* ============================================================================
 * FILE: lib/xyvala/organizations/organization-access-service.ts
 * ========================================================================== */

import type {
  AccountRecord,
  PublicAccount,
} from "@/lib/xyvala/accounts/account-contract";

import {
  findOrganizationById,
  findOrganizationMembership,
  type OrganizationMember,
  type OrganizationRecord,
} from "@/lib/xyvala/organizations/organization-store";

import {
  getOrganizationRolePermissions,
  organizationRoleHasPermission,
  type OrganizationPermission,
  type OrganizationRole,
} from "@/lib/xyvala/organizations/rbac-contract";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type AccountLike = AccountRecord | PublicAccount | null;

export type OrganizationAccessDecision = "ALLOW" | "WATCH" | "BLOCK";

export type OrganizationAccessReason =
  | "organization_access_allowed"
  | "organization_not_found"
  | "organization_not_active"
  | "account_missing"
  | "membership_missing"
  | "membership_not_active"
  | "permission_denied"
  | "role_unknown";

export type OrganizationAccessContext = {
  organization_id: string;
  account_id: string | null;

  role: OrganizationRole | null;
  permissions: OrganizationPermission[];

  decision: OrganizationAccessDecision;
  reason: OrganizationAccessReason;

  can_read_workspace: boolean;
  can_manage_organization: boolean;
  can_manage_members: boolean;
  can_manage_billing: boolean;
  can_manage_api_keys: boolean;
  can_read_usage: boolean;
  can_read_audit: boolean;

  warnings: string[];
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

function hasPermission(
  permissions: OrganizationPermission[],
  permission: OrganizationPermission,
): boolean {
  return permissions.includes(permission);
}

function hasAnyPermission(
  permissions: OrganizationPermission[],
  requested: OrganizationPermission[],
): boolean {
  return requested.some((permission) => hasPermission(permissions, permission));
}

function buildBlockedContext(input: {
  organization_id: string;
  account_id: string | null;
  reason: OrganizationAccessReason;
  warnings?: string[];
}): OrganizationAccessContext {
  return {
    organization_id: safeString(input.organization_id),
    account_id: input.account_id,

    role: null,
    permissions: [],

    decision: "BLOCK",
    reason: input.reason,

    can_read_workspace: false,
    can_manage_organization: false,
    can_manage_members: false,
    can_manage_billing: false,
    can_manage_api_keys: false,
    can_read_usage: false,
    can_read_audit: false,

    warnings: uniqueWarnings(input.warnings, [input.reason]),
  };
}

function buildAllowedContext(input: {
  organization: OrganizationRecord;
  account: AccountRecord | PublicAccount;
  membership: OrganizationMember;
}): OrganizationAccessContext {
  const permissions = getOrganizationRolePermissions(input.membership.role);

  if (permissions.length === 0) {
    return buildBlockedContext({
      organization_id: input.organization.id,
      account_id: input.account.id,
      reason: "role_unknown",
      warnings: ["organization_role_unknown"],
    });
  }

  return {
    organization_id: input.organization.id,
    account_id: input.account.id,

    role: input.membership.role,
    permissions,

    decision: "ALLOW",
    reason: "organization_access_allowed",

    can_read_workspace: hasPermission(permissions, "organization:read"),

    can_manage_organization:
      hasPermission(permissions, "organization:update") ||
      hasPermission(permissions, "settings:manage"),

    can_manage_members:
      hasPermission(permissions, "members:invite") ||
      hasPermission(permissions, "members:update") ||
      hasPermission(permissions, "members:remove"),

    can_manage_billing: hasPermission(permissions, "billing:manage"),

    can_manage_api_keys: hasAnyPermission(permissions, [
      "api_keys:create",
      "api_keys:update",
      "api_keys:revoke",
    ]),

    can_read_usage: hasPermission(permissions, "usage:read"),
    can_read_audit: hasPermission(permissions, "audit:read"),

    warnings: uniqueWarnings(
      input.organization.warnings,
      input.membership.warnings,
    ),
  };
}

/* ============================================================================
 * 3. ACCESS RESOLUTION
 * ========================================================================== */

export function resolveOrganizationAccess(input: {
  organization_id: string;
  account: AccountLike;
}): OrganizationAccessContext {
  const organizationId = safeString(input.organization_id);
  const accountId = input.account?.id ?? null;

  if (!input.account) {
    return buildBlockedContext({
      organization_id: organizationId,
      account_id: null,
      reason: "account_missing",
    });
  }

  const organization = findOrganizationById(organizationId);

  if (!organization) {
    return buildBlockedContext({
      organization_id: organizationId,
      account_id: accountId,
      reason: "organization_not_found",
    });
  }

  if (organization.status !== "active") {
    return buildBlockedContext({
      organization_id: organization.id,
      account_id: accountId,
      reason: "organization_not_active",
      warnings: organization.warnings,
    });
  }

  const membership = findOrganizationMembership({
    organization_id: organization.id,
    account_id: input.account.id,
  });

  if (!membership) {
    return buildBlockedContext({
      organization_id: organization.id,
      account_id: accountId,
      reason: "membership_missing",
    });
  }

  if (membership.status !== "active") {
    return buildBlockedContext({
      organization_id: organization.id,
      account_id: accountId,
      reason: "membership_not_active",
      warnings: membership.warnings,
    });
  }

  return buildAllowedContext({
    organization,
    account: input.account,
    membership,
  });
}

/* ============================================================================
 * 4. PERMISSION REQUIREMENTS
 * ========================================================================== */

export function requireOrganizationPermission(input: {
  organization_id: string;
  account: AccountLike;
  permission: OrganizationPermission;
}): OrganizationAccessContext {
  const context = resolveOrganizationAccess({
    organization_id: input.organization_id,
    account: input.account,
  });

  if (context.decision !== "ALLOW") {
    return context;
  }

  if (!context.role) {
    return {
      ...context,
      decision: "BLOCK",
      reason: "role_unknown",
      warnings: uniqueWarnings(context.warnings, ["organization_role_unknown"]),
    };
  }

  const granted = organizationRoleHasPermission({
    role: context.role,
    permission: input.permission,
  });

  if (!granted) {
    return {
      ...context,
      decision: "BLOCK",
      reason: "permission_denied",
      warnings: uniqueWarnings(context.warnings, ["permission_denied"]),
    };
  }

  return context;
}

export function requireAnyOrganizationPermission(input: {
  organization_id: string;
  account: AccountLike;
  permissions: OrganizationPermission[];
}): OrganizationAccessContext {
  const context = resolveOrganizationAccess({
    organization_id: input.organization_id,
    account: input.account,
  });

  if (context.decision !== "ALLOW") {
    return context;
  }

  const granted = input.permissions.some((permission) =>
    context.permissions.includes(permission),
  );

  if (!granted) {
    return {
      ...context,
      decision: "BLOCK",
      reason: "permission_denied",
      warnings: uniqueWarnings(context.warnings, ["permission_denied"]),
    };
  }

  return context;
}

/* ============================================================================
 * 5. CONVENIENCE CHECKS
 * ========================================================================== */

export function canReadOrganizationWorkspace(input: {
  organization_id: string;
  account: AccountLike;
}): boolean {
  return requireOrganizationPermission({
    organization_id: input.organization_id,
    account: input.account,
    permission: "organization:read",
  }).decision === "ALLOW";
}

export function canManageOrganization(input: {
  organization_id: string;
  account: AccountLike;
}): boolean {
  return requireAnyOrganizationPermission({
    organization_id: input.organization_id,
    account: input.account,
    permissions: ["organization:update", "settings:manage"],
  }).decision === "ALLOW";
}

export function canDeleteOrganization(input: {
  organization_id: string;
  account: AccountLike;
}): boolean {
  return requireOrganizationPermission({
    organization_id: input.organization_id,
    account: input.account,
    permission: "organization:delete",
  }).decision === "ALLOW";
}

export function canTransferOrganizationOwnership(input: {
  organization_id: string;
  account: AccountLike;
}): boolean {
  return requireOrganizationPermission({
    organization_id: input.organization_id,
    account: input.account,
    permission: "ownership:transfer",
  }).decision === "ALLOW";
}

export function canManageOrganizationMembers(input: {
  organization_id: string;
  account: AccountLike;
}): boolean {
  return requireAnyOrganizationPermission({
    organization_id: input.organization_id,
    account: input.account,
    permissions: ["members:invite", "members:update", "members:remove"],
  }).decision === "ALLOW";
}

export function canManageOrganizationBilling(input: {
  organization_id: string;
  account: AccountLike;
}): boolean {
  return requireOrganizationPermission({
    organization_id: input.organization_id,
    account: input.account,
    permission: "billing:manage",
  }).decision === "ALLOW";
}

export function canManageOrganizationApiKeys(input: {
  organization_id: string;
  account: AccountLike;
}): boolean {
  return requireAnyOrganizationPermission({
    organization_id: input.organization_id,
    account: input.account,
    permissions: ["api_keys:create", "api_keys:update", "api_keys:revoke"],
  }).decision === "ALLOW";
}

export function canReadOrganizationUsage(input: {
  organization_id: string;
  account: AccountLike;
}): boolean {
  return requireOrganizationPermission({
    organization_id: input.organization_id,
    account: input.account,
    permission: "usage:read",
  }).decision === "ALLOW";
}

export function canReadOrganizationAudit(input: {
  organization_id: string;
  account: AccountLike;
}): boolean {
  return requireOrganizationPermission({
    organization_id: input.organization_id,
    account: input.account,
    permission: "audit:read",
  }).decision === "ALLOW";
}
