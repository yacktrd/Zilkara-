/* ============================================================================
 * FILE: lib/xyvala/organizations/team-member-service.ts
 * ========================================================================== */

import {
  canOrganizationRoleManageRole,
  getOrganizationRolePermissions,
  type OrganizationPermission,
  type OrganizationRole,
} from "@/lib/xyvala/organizations/rbac-contract";

import {
  createOrganizationMember,
  findOrganizationById,
  findOrganizationMembership,
  updateOrganizationMember,
  type OrganizationMember,
} from "@/lib/xyvala/organizations/organization-store";

import {
  requireOrganizationPermission,
  type OrganizationAccessContext,
} from "@/lib/xyvala/organizations/organization-access-service";

import type {
  AccountRecord,
  PublicAccount,
} from "@/lib/xyvala/accounts/account-contract";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type AccountLike = AccountRecord | PublicAccount | null;

export type TeamMemberServiceResult = {
  ok: boolean;
  member: OrganizationMember | null;
  access: OrganizationAccessContext | null;
  warnings: string[];
  error: string | null;
};

export type InviteTeamMemberInput = {
  organization_id: string;
  actor: AccountLike;
  target_account_id: string;
  role: OrganizationRole;
};

export type UpdateTeamMemberRoleInput = {
  organization_id: string;
  actor: AccountLike;
  target_account_id: string;
  role: OrganizationRole;
};

export type RemoveTeamMemberInput = {
  organization_id: string;
  actor: AccountLike;
  target_account_id: string;
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

function denied(input: {
  access: OrganizationAccessContext | null;
  warnings: string[];
  error: string;
}): TeamMemberServiceResult {
  return {
    ok: false,
    member: null,
    access: input.access,
    warnings: input.warnings,
    error: input.error,
  };
}

function requirePermission(input: {
  organization_id: string;
  actor: AccountLike;
  permission: OrganizationPermission;
}): OrganizationAccessContext {
  return requireOrganizationPermission({
    organization_id: input.organization_id,
    account: input.actor,
    permission: input.permission,
  });
}

function actorCanManageTargetRole(input: {
  actor_role: OrganizationRole | null;
  target_role: OrganizationRole;
}): boolean {
  if (!input.actor_role) return false;

  return canOrganizationRoleManageRole({
    actor_role: input.actor_role,
    target_role: input.target_role,
  });
}

/* ============================================================================
 * 3. TEAM MEMBER ORCHESTRATION
 * ========================================================================== */

export function inviteTeamMember(
  input: InviteTeamMemberInput,
): TeamMemberServiceResult {
  const organizationId = safeString(input.organization_id);
  const targetAccountId = safeString(input.target_account_id);

  if (!organizationId || !targetAccountId) {
    return denied({
      access: null,
      warnings: ["team_member_invalid_input"],
      error: "team_member_invalid_input",
    });
  }

  const organization = findOrganizationById(organizationId);

  if (!organization || organization.status !== "active") {
    return denied({
      access: null,
      warnings: ["organization_not_available"],
      error: "organization_not_available",
    });
  }

  const access = requirePermission({
    organization_id: organizationId,
    actor: input.actor,
    permission: "members:invite",
  });

  if (access.decision !== "ALLOW") {
    return denied({
      access,
      warnings: uniqueWarnings(access.warnings, ["members_invite_denied"]),
      error: "members_invite_denied",
    });
  }

  if (
    !actorCanManageTargetRole({
      actor_role: access.role,
      target_role: input.role,
    })
  ) {
    return denied({
      access,
      warnings: ["role_hierarchy_denied"],
      error: "role_hierarchy_denied",
    });
  }

  const existing = findOrganizationMembership({
    organization_id: organizationId,
    account_id: targetAccountId,
  });

  if (existing) {
    return {
      ok: true,
      member: existing,
      access,
      warnings: uniqueWarnings([
        "organization_member_already_exists",
      ]),
      error: null,
    };
  }

  const member = createOrganizationMember({
    organization_id: organizationId,
    account_id: targetAccountId,
    role: input.role,
    warnings: [
      "organization_member_invited",
      `permissions:${getOrganizationRolePermissions(input.role).join(",")}`,
    ],
  });

  if (!member) {
    return denied({
      access,
      warnings: ["organization_member_create_failed"],
      error: "organization_member_create_failed",
    });
  }

  return {
    ok: true,
    member,
    access,
    warnings: ["organization_member_invited"],
    error: null,
  };
}

export function updateTeamMemberRole(
  input: UpdateTeamMemberRoleInput,
): TeamMemberServiceResult {
  const organizationId = safeString(input.organization_id);
  const targetAccountId = safeString(input.target_account_id);

  if (!organizationId || !targetAccountId) {
    return denied({
      access: null,
      warnings: ["team_member_invalid_input"],
      error: "team_member_invalid_input",
    });
  }

  const access = requirePermission({
    organization_id: organizationId,
    actor: input.actor,
    permission: "members:update",
  });

  if (access.decision !== "ALLOW") {
    return denied({
      access,
      warnings: uniqueWarnings(access.warnings, ["members_update_denied"]),
      error: "members_update_denied",
    });
  }

  const existing = findOrganizationMembership({
    organization_id: organizationId,
    account_id: targetAccountId,
  });

  if (!existing) {
    return denied({
      access,
      warnings: ["organization_member_not_found"],
      error: "organization_member_not_found",
    });
  }

  if (
    !actorCanManageTargetRole({
      actor_role: access.role,
      target_role: existing.role,
    }) ||
    !actorCanManageTargetRole({
      actor_role: access.role,
      target_role: input.role,
    })
  ) {
    return denied({
      access,
      warnings: ["role_hierarchy_denied"],
      error: "role_hierarchy_denied",
    });
  }

  const updated = updateOrganizationMember({
    id: existing.id,
    role: input.role,
    warnings: ["organization_member_role_updated"],
  });

  if (!updated) {
    return denied({
      access,
      warnings: ["organization_member_update_failed"],
      error: "organization_member_update_failed",
    });
  }

  return {
    ok: true,
    member: updated,
    access,
    warnings: ["organization_member_role_updated"],
    error: null,
  };
}

export function removeTeamMember(
  input: RemoveTeamMemberInput,
): TeamMemberServiceResult {
  const organizationId = safeString(input.organization_id);
  const targetAccountId = safeString(input.target_account_id);

  if (!organizationId || !targetAccountId) {
    return denied({
      access: null,
      warnings: ["team_member_invalid_input"],
      error: "team_member_invalid_input",
    });
  }

  const access = requirePermission({
    organization_id: organizationId,
    actor: input.actor,
    permission: "members:remove",
  });

  if (access.decision !== "ALLOW") {
    return denied({
      access,
      warnings: uniqueWarnings(access.warnings, ["members_remove_denied"]),
      error: "members_remove_denied",
    });
  }

  const existing = findOrganizationMembership({
    organization_id: organizationId,
    account_id: targetAccountId,
  });

  if (!existing) {
    return denied({
      access,
      warnings: ["organization_member_not_found"],
      error: "organization_member_not_found",
    });
  }

  if (
    !actorCanManageTargetRole({
      actor_role: access.role,
      target_role: existing.role,
    })
  ) {
    return denied({
      access,
      warnings: ["role_hierarchy_denied"],
      error: "role_hierarchy_denied",
    });
  }

  const removed = updateOrganizationMember({
    id: existing.id,
    status: "disabled",
    warnings: ["organization_member_removed"],
  });

  if (!removed) {
    return denied({
      access,
      warnings: ["organization_member_remove_failed"],
      error: "organization_member_remove_failed",
    });
  }

  return {
    ok: true,
    member: removed,
    access,
    warnings: ["organization_member_removed"],
    error: null,
  };
}
