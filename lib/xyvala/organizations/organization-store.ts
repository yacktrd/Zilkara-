/* ============================================================================
 * FILE: lib/xyvala/organizations/organization-store.ts
 * ========================================================================== */

export type OrganizationStatus = "active" | "disabled" | "deleted";
export type OrganizationRole = "owner" | "admin" | "member" | "viewer";

export type OrganizationRecord = {
  id: string;
  name: string;
  slug: string;

  owner_account_id: string;
  status: OrganizationStatus;

  created_at: string;
  updated_at: string;

  default_currency: "EUR";
  jurisdiction: "FR/EU";

  warnings: string[];
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  account_id: string;

  role: OrganizationRole;
  status: OrganizationStatus;

  created_at: string;
  updated_at: string;

  warnings: string[];
};

type OrganizationStoreState = {
  organizations: Map<string, OrganizationRecord>;
  organizationsBySlug: Map<string, string>;
  organizationsByOwner: Map<string, Set<string>>;

  members: Map<string, OrganizationMember>;
  membersByOrganization: Map<string, Set<string>>;
  membersByAccount: Map<string, Set<string>>;
};

declare global {
  // eslint-disable-next-line no-var
  var __XYVALA_ORGANIZATION_STORE__: OrganizationStoreState | undefined;
}

function getStore(): OrganizationStoreState {
  if (!globalThis.__XYVALA_ORGANIZATION_STORE__) {
    globalThis.__XYVALA_ORGANIZATION_STORE__ = {
      organizations: new Map(),
      organizationsBySlug: new Map(),
      organizationsByOwner: new Map(),

      members: new Map(),
      membersByOrganization: new Map(),
      membersByAccount: new Map(),
    };
  }

  return globalThis.__XYVALA_ORGANIZATION_STORE__;
}

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSlug(value: string): string {
  return safeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function buildId(prefix: string, seed: string): string {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return `${prefix}_${hash.toString(36)}`;
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

function cloneOrganization(
  organization: OrganizationRecord,
): OrganizationRecord {
  return {
    ...organization,
    warnings: [...organization.warnings],
  };
}

function cloneMember(member: OrganizationMember): OrganizationMember {
  return {
    ...member,
    warnings: [...member.warnings],
  };
}

function indexOrganization(organization: OrganizationRecord): void {
  const store = getStore();

  store.organizationsBySlug.set(organization.slug, organization.id);

  const ownerSet =
    store.organizationsByOwner.get(organization.owner_account_id) ??
    new Set<string>();

  ownerSet.add(organization.id);
  store.organizationsByOwner.set(organization.owner_account_id, ownerSet);
}

function indexMember(member: OrganizationMember): void {
  const store = getStore();

  const organizationSet =
    store.membersByOrganization.get(member.organization_id) ??
    new Set<string>();

  organizationSet.add(member.id);
  store.membersByOrganization.set(member.organization_id, organizationSet);

  const accountSet =
    store.membersByAccount.get(member.account_id) ?? new Set<string>();

  accountSet.add(member.id);
  store.membersByAccount.set(member.account_id, accountSet);
}

export function createOrganization(input: {
  name: string;
  owner_account_id: string;
  slug?: string | null;
  warnings?: string[];
}): OrganizationRecord | null {
  const name = safeString(input.name);
  const ownerAccountId = safeString(input.owner_account_id);
  const slug = normalizeSlug(input.slug ?? name);

  if (!name || !ownerAccountId || !slug) return null;

  const store = getStore();

  if (store.organizationsBySlug.has(slug)) return null;

  const timestamp = nowIso();

  const organization: OrganizationRecord = {
    id: buildId("org", `${ownerAccountId}:${slug}`),
    name,
    slug,

    owner_account_id: ownerAccountId,
    status: "active",

    created_at: timestamp,
    updated_at: timestamp,

    default_currency: "EUR",
    jurisdiction: "FR/EU",

    warnings: uniqueWarnings(input.warnings),
  };

  store.organizations.set(organization.id, organization);
  indexOrganization(organization);

  createOrganizationMember({
    organization_id: organization.id,
    account_id: ownerAccountId,
    role: "owner",
    warnings: ["organization_owner_membership_created"],
  });

  return cloneOrganization(organization);
}

export function updateOrganization(input: {
  id: string;
  name?: string;
  status?: OrganizationStatus;
  warnings?: string[];
}): OrganizationRecord | null {
  const store = getStore();
  const existing = store.organizations.get(safeString(input.id));

  if (!existing) return null;

  const updated: OrganizationRecord = {
    ...existing,
    name: input.name === undefined ? existing.name : safeString(input.name),
    status: input.status ?? existing.status,
    updated_at: nowIso(),
    warnings: uniqueWarnings(existing.warnings, input.warnings),
  };

  store.organizations.set(updated.id, updated);
  indexOrganization(updated);

  return cloneOrganization(updated);
}

export function findOrganizationById(
  id: string,
): OrganizationRecord | null {
  const organization = getStore().organizations.get(safeString(id));

  return organization ? cloneOrganization(organization) : null;
}

export function findOrganizationBySlug(
  slug: string,
): OrganizationRecord | null {
  const id = getStore().organizationsBySlug.get(normalizeSlug(slug));

  if (!id) return null;

  return findOrganizationById(id);
}

export function listOrganizations(): OrganizationRecord[] {
  return [...getStore().organizations.values()].map(cloneOrganization);
}

export function listOrganizationsByOwner(
  ownerAccountId: string,
): OrganizationRecord[] {
  const ids = getStore().organizationsByOwner.get(safeString(ownerAccountId));

  if (!ids) return [];

  return [...ids]
    .map((id) => findOrganizationById(id))
    .filter(
      (organization): organization is OrganizationRecord =>
        organization !== null,
    );
}

export function createOrganizationMember(input: {
  organization_id: string;
  account_id: string;
  role: OrganizationRole;
  warnings?: string[];
}): OrganizationMember | null {
  const organizationId = safeString(input.organization_id);
  const accountId = safeString(input.account_id);

  if (!organizationId || !accountId) return null;
  if (!getStore().organizations.has(organizationId)) return null;

  const timestamp = nowIso();

  const member: OrganizationMember = {
    id: buildId("org_member", `${organizationId}:${accountId}`),
    organization_id: organizationId,
    account_id: accountId,

    role: input.role,
    status: "active",

    created_at: timestamp,
    updated_at: timestamp,

    warnings: uniqueWarnings(input.warnings),
  };

  const store = getStore();

  store.members.set(member.id, member);
  indexMember(member);

  return cloneMember(member);
}

export function updateOrganizationMember(input: {
  id: string;
  role?: OrganizationRole;
  status?: OrganizationStatus;
  warnings?: string[];
}): OrganizationMember | null {
  const store = getStore();
  const existing = store.members.get(safeString(input.id));

  if (!existing) return null;

  const updated: OrganizationMember = {
    ...existing,
    role: input.role ?? existing.role,
    status: input.status ?? existing.status,
    updated_at: nowIso(),
    warnings: uniqueWarnings(existing.warnings, input.warnings),
  };

  store.members.set(updated.id, updated);
  indexMember(updated);

  return cloneMember(updated);
}

export function findOrganizationMemberById(
  id: string,
): OrganizationMember | null {
  const member = getStore().members.get(safeString(id));

  return member ? cloneMember(member) : null;
}

export function listOrganizationMembers(
  organizationId: string,
): OrganizationMember[] {
  const ids = getStore().membersByOrganization.get(safeString(organizationId));

  if (!ids) return [];

  return [...ids]
    .map((id) => findOrganizationMemberById(id))
    .filter((member): member is OrganizationMember => member !== null);
}

export function listAccountOrganizationMemberships(
  accountId: string,
): OrganizationMember[] {
  const ids = getStore().membersByAccount.get(safeString(accountId));

  if (!ids) return [];

  return [...ids]
    .map((id) => findOrganizationMemberById(id))
    .filter((member): member is OrganizationMember => member !== null);
}

export function findOrganizationMembership(input: {
  organization_id: string;
  account_id: string;
}): OrganizationMember | null {
  return (
    listOrganizationMembers(input.organization_id).find(
      (member) =>
        member.account_id === input.account_id &&
        member.status === "active",
    ) ?? null
  );
}

export function getOrganizationStoreStats(): {
  organizations: number;
  members: number;
  active_organizations: number;
  active_members: number;
} {
  const organizations = listOrganizations();
  const members = [...getStore().members.values()];

  return {
    organizations: organizations.length,
    members: members.length,
    active_organizations: organizations.filter(
      (organization) => organization.status === "active",
    ).length,
    active_members: members.filter((member) => member.status === "active")
      .length,
  };
}

export function clearOrganizationStore(): void {
  const store = getStore();

  store.organizations.clear();
  store.organizationsBySlug.clear();
  store.organizationsByOwner.clear();

  store.members.clear();
  store.membersByOrganization.clear();
  store.membersByAccount.clear();
}
