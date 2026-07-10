/* ============================================================================
 * FILE: lib/xyvala/organizations/rbac-contract.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala organization RBAC contracts
 *
 * ROLE
 * - define canonical organization roles and permissions
 * - preserve deterministic enterprise access governance
 * - keep RBAC truth separate from persistence, UI and runtime services
 *
 * PARENTS
 * - lib/xyvala/organizations/organization-store.ts
 * - lib/xyvala/organizations/organization-access-service.ts
 *
 * DIRECTIVES
 * - contract definitions only
 * - no persistence
 * - no route response building
 * - no UI dependency
 * - no billing mutation
 * - no account mutation
 * - no organization mutation
 * - no API key mutation
 * - no RFS recomputation
 * - no MCI recomputation
 * - deterministic permission contracts only
 *
 * INVARIANTS
 * - owner has all organization permissions
 * - admin can manage workspace and members but not ownership
 * - member can use workspace but cannot manage governance
 * - viewer is read-only
 * - permission groups remain explicit
 * - custom roles must be introduced through versioned contracts
 * ========================================================================== */

/* ============================================================================
 * 1. ROLE CONTRACTS
 * ========================================================================== */

export type OrganizationRole =
  | "owner"
  | "admin"
  | "member"
  | "viewer";

export type OrganizationRoleRank = 100 | 80 | 50 | 20;

export type OrganizationRoleContract = {
  role: OrganizationRole;
  rank: OrganizationRoleRank;
  label: string;
  description: string;
  system_role: boolean;
};

/* ============================================================================
 * 2. PERMISSION CONTRACTS
 * ========================================================================== */

export type OrganizationPermission =
  | "organization:read"
  | "organization:update"
  | "organization:delete"
  | "ownership:transfer"
  | "members:read"
  | "members:invite"
  | "members:update"
  | "members:remove"
  | "billing:read"
  | "billing:manage"
  | "api_keys:read"
  | "api_keys:create"
  | "api_keys:update"
  | "api_keys:revoke"
  | "usage:read"
  | "settings:read"
  | "settings:manage"
  | "audit:read";

export type OrganizationPermissionGroup =
  | "organization"
  | "ownership"
  | "members"
  | "billing"
  | "api_keys"
  | "usage"
  | "settings"
  | "audit";

export type OrganizationPermissionContract = {
  permission: OrganizationPermission;
  group: OrganizationPermissionGroup;
  label: string;
  description: string;
  sensitive: boolean;
};

/* ============================================================================
 * 3. ROLE DEFINITIONS
 * ========================================================================== */

export const ORGANIZATION_ROLE_CONTRACTS: Record<
  OrganizationRole,
  OrganizationRoleContract
> = {
  owner: {
    role: "owner",
    rank: 100,
    label: "Owner",
    description: "Full organization governance and ownership authority.",
    system_role: true,
  },

  admin: {
    role: "admin",
    rank: 80,
    label: "Admin",
    description: "Operational organization administration without ownership transfer.",
    system_role: true,
  },

  member: {
    role: "member",
    rank: 50,
    label: "Member",
    description: "Standard workspace access with limited governance authority.",
    system_role: true,
  },

  viewer: {
    role: "viewer",
    rank: 20,
    label: "Viewer",
    description: "Read-only organization workspace access.",
    system_role: true,
  },
};

/* ============================================================================
 * 4. PERMISSION DEFINITIONS
 * ========================================================================== */

export const ORGANIZATION_PERMISSION_CONTRACTS: Record<
  OrganizationPermission,
  OrganizationPermissionContract
> = {
  "organization:read": {
    permission: "organization:read",
    group: "organization",
    label: "Read organization",
    description: "Read organization profile and workspace metadata.",
    sensitive: false,
  },

  "organization:update": {
    permission: "organization:update",
    group: "organization",
    label: "Update organization",
    description: "Update organization profile and workspace metadata.",
    sensitive: true,
  },

  "organization:delete": {
    permission: "organization:delete",
    group: "organization",
    label: "Delete organization",
    description: "Disable or delete the organization workspace.",
    sensitive: true,
  },

  "ownership:transfer": {
    permission: "ownership:transfer",
    group: "ownership",
    label: "Transfer ownership",
    description: "Transfer ownership authority to another account.",
    sensitive: true,
  },

  "members:read": {
    permission: "members:read",
    group: "members",
    label: "Read members",
    description: "Read organization membership list.",
    sensitive: false,
  },

  "members:invite": {
    permission: "members:invite",
    group: "members",
    label: "Invite members",
    description: "Invite new members to the organization.",
    sensitive: true,
  },

  "members:update": {
    permission: "members:update",
    group: "members",
    label: "Update members",
    description: "Update organization member roles and states.",
    sensitive: true,
  },

  "members:remove": {
    permission: "members:remove",
    group: "members",
    label: "Remove members",
    description: "Remove members from the organization.",
    sensitive: true,
  },

  "billing:read": {
    permission: "billing:read",
    group: "billing",
    label: "Read billing",
    description: "Read organization billing state and subscription metadata.",
    sensitive: false,
  },

  "billing:manage": {
    permission: "billing:manage",
    group: "billing",
    label: "Manage billing",
    description: "Manage subscription, billing portal and payment settings.",
    sensitive: true,
  },

  "api_keys:read": {
    permission: "api_keys:read",
    group: "api_keys",
    label: "Read API keys",
    description: "Read public API key metadata.",
    sensitive: false,
  },

  "api_keys:create": {
    permission: "api_keys:create",
    group: "api_keys",
    label: "Create API keys",
    description: "Create new organization-scoped API keys.",
    sensitive: true,
  },

  "api_keys:update": {
    permission: "api_keys:update",
    group: "api_keys",
    label: "Update API keys",
    description: "Update API key labels and metadata.",
    sensitive: true,
  },

  "api_keys:revoke": {
    permission: "api_keys:revoke",
    group: "api_keys",
    label: "Revoke API keys",
    description: "Revoke existing API keys.",
    sensitive: true,
  },

  "usage:read": {
    permission: "usage:read",
    group: "usage",
    label: "Read usage",
    description: "Read usage and quota telemetry.",
    sensitive: false,
  },

  "settings:read": {
    permission: "settings:read",
    group: "settings",
    label: "Read settings",
    description: "Read organization settings.",
    sensitive: false,
  },

  "settings:manage": {
    permission: "settings:manage",
    group: "settings",
    label: "Manage settings",
    description: "Manage organization configuration.",
    sensitive: true,
  },

  "audit:read": {
    permission: "audit:read",
    group: "audit",
    label: "Read audit logs",
    description: "Read organization audit and runtime governance logs.",
    sensitive: true,
  },
};

/* ============================================================================
 * 5. ROLE PERMISSION MATRIX
 * ========================================================================== */

export const ORGANIZATION_ROLE_PERMISSIONS: Record<
  OrganizationRole,
  OrganizationPermission[]
> = {
  owner: [
    "organization:read",
    "organization:update",
    "organization:delete",
    "ownership:transfer",
    "members:read",
    "members:invite",
    "members:update",
    "members:remove",
    "billing:read",
    "billing:manage",
    "api_keys:read",
    "api_keys:create",
    "api_keys:update",
    "api_keys:revoke",
    "usage:read",
    "settings:read",
    "settings:manage",
    "audit:read",
  ],

  admin: [
    "organization:read",
    "organization:update",
    "members:read",
    "members:invite",
    "members:update",
    "members:remove",
    "billing:read",
    "api_keys:read",
    "api_keys:create",
    "api_keys:update",
    "api_keys:revoke",
    "usage:read",
    "settings:read",
    "settings:manage",
    "audit:read",
  ],

  member: [
    "organization:read",
    "members:read",
    "billing:read",
    "api_keys:read",
    "usage:read",
    "settings:read",
  ],

  viewer: [
    "organization:read",
    "members:read",
    "usage:read",
    "settings:read",
  ],
};

/* ============================================================================
 * 6. HELPERS
 * ========================================================================== */

export function getOrganizationRoleContract(
  role: OrganizationRole,
): OrganizationRoleContract {
  return ORGANIZATION_ROLE_CONTRACTS[role];
}

export function getOrganizationPermissionContract(
  permission: OrganizationPermission,
): OrganizationPermissionContract {
  return ORGANIZATION_PERMISSION_CONTRACTS[permission];
}

export function getOrganizationRolePermissions(
  role: OrganizationRole,
): OrganizationPermission[] {
  return [...ORGANIZATION_ROLE_PERMISSIONS[role]];
}

export function organizationRoleHasPermission(input: {
  role: OrganizationRole;
  permission: OrganizationPermission;
}): boolean {
  return ORGANIZATION_ROLE_PERMISSIONS[input.role].includes(input.permission);
}

export function compareOrganizationRoleRank(input: {
  left: OrganizationRole;
  right: OrganizationRole;
}): number {
  return (
    ORGANIZATION_ROLE_CONTRACTS[input.left].rank -
    ORGANIZATION_ROLE_CONTRACTS[input.right].rank
  );
}

export function canOrganizationRoleManageRole(input: {
  actor_role: OrganizationRole;
  target_role: OrganizationRole;
}): boolean {
  const actorRank = ORGANIZATION_ROLE_CONTRACTS[input.actor_role].rank;
  const targetRank = ORGANIZATION_ROLE_CONTRACTS[input.target_role].rank;

  return actorRank > targetRank;
}
