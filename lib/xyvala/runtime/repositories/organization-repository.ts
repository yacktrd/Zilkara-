/* ============================================================================
 * FILE: lib/xyvala/runtime/repositories/organization-repository.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala organization repository
 *
 * ROLE
 * - persist organizations and memberships in PostgreSQL
 * - isolate organization SQL access from governance and RBAC services
 * - prepare durable enterprise workspace persistence
 *
 * PARENTS
 * - lib/xyvala/runtime/postgres/postgres-adapter.ts
 * - lib/xyvala/runtime/migrations/schema-definitions.ts
 * - lib/xyvala/organizations/organization-store.ts
 *
 * DIRECTIVES
 * - durable persistence only
 * - no RBAC decisions
 * - no organization governance decisions
 * - no billing logic
 * - no API key logic
 * - no UI logic
 * - no route response building
 * - no account mutation rules
 * - no RFS recomputation
 * - no MCI recomputation
 * - deterministic SQL access only
 *
 * INVARIANTS
 * - organization-store remains runtime compatible
 * - repository never interprets business permissions
 * - SQL parameters remain separated from SQL text
 * - warnings remain JSONB serialized
 * - EUR and FR/EU remain default durable organization references
 * ========================================================================== */

import type {
  OrganizationMember,
  OrganizationRecord,
} from "@/lib/xyvala/organizations/organization-store";

import {
  postgresQuery,
} from "@/lib/xyvala/runtime/postgres/postgres-adapter";

/* ============================================================================
 * 1. HELPERS
 * ========================================================================== */

function jsonArray(value: string[]): string {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

function parseWarnings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/* ============================================================================
 * 2. MAPPERS
 * ========================================================================== */

function rowToOrganization(row: Record<string, unknown>): OrganizationRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),

    owner_account_id: String(row.owner_account_id),
    status: row.status as OrganizationRecord["status"],

    created_at: String(row.created_at),
    updated_at: String(row.updated_at),

    default_currency: "EUR",
    jurisdiction: "FR/EU",

    warnings: parseWarnings(row.warnings),
  };
}

function rowToOrganizationMember(
  row: Record<string, unknown>,
): OrganizationMember {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    account_id: String(row.account_id),

    role: row.role as OrganizationMember["role"],
    status: row.status as OrganizationMember["status"],

    created_at: String(row.created_at),
    updated_at: String(row.updated_at),

    warnings: parseWarnings(row.warnings),
  };
}

/* ============================================================================
 * 3. ORGANIZATION WRITERS
 * ========================================================================== */

export async function persistOrganizationRecord(
  organization: OrganizationRecord,
): Promise<OrganizationRecord | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    INSERT INTO xyvala_organizations (
      id,
      name,
      slug,
      owner_account_id,
      status,
      created_at,
      updated_at,
      default_currency,
      jurisdiction,
      warnings
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      slug = EXCLUDED.slug,
      owner_account_id = EXCLUDED.owner_account_id,
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at,
      default_currency = EXCLUDED.default_currency,
      jurisdiction = EXCLUDED.jurisdiction,
      warnings = EXCLUDED.warnings
    RETURNING *;
    `,
    [
      organization.id,
      organization.name,
      organization.slug,
      organization.owner_account_id,
      organization.status,
      organization.created_at,
      organization.updated_at,
      organization.default_currency,
      organization.jurisdiction,
      jsonArray(organization.warnings),
    ],
  );

  return result.ok && result.rows[0]
    ? rowToOrganization(result.rows[0])
    : null;
}

/* ============================================================================
 * 4. ORGANIZATION READERS
 * ========================================================================== */

export async function findOrganizationRecordById(
  id: string,
): Promise<OrganizationRecord | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_organizations
    WHERE id = $1
    LIMIT 1;
    `,
    [id],
  );

  return result.ok && result.rows[0]
    ? rowToOrganization(result.rows[0])
    : null;
}

export async function findOrganizationRecordBySlug(
  slug: string,
): Promise<OrganizationRecord | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_organizations
    WHERE slug = $1
    LIMIT 1;
    `,
    [slug],
  );

  return result.ok && result.rows[0]
    ? rowToOrganization(result.rows[0])
    : null;
}

export async function listOrganizationRecords(): Promise<OrganizationRecord[]> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_organizations
    ORDER BY created_at DESC;
    `,
  );

  return result.ok ? result.rows.map(rowToOrganization) : [];
}

export async function listOrganizationRecordsByOwner(
  ownerAccountId: string,
): Promise<OrganizationRecord[]> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_organizations
    WHERE owner_account_id = $1
    ORDER BY created_at DESC;
    `,
    [ownerAccountId],
  );

  return result.ok ? result.rows.map(rowToOrganization) : [];
}

/* ============================================================================
 * 5. MEMBERSHIP WRITERS
 * ========================================================================== */

export async function persistOrganizationMember(
  member: OrganizationMember,
): Promise<OrganizationMember | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    INSERT INTO xyvala_organization_members (
      id,
      organization_id,
      account_id,
      role,
      status,
      created_at,
      updated_at,
      warnings
    )
    VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8::jsonb
    )
    ON CONFLICT (organization_id, account_id) DO UPDATE SET
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at,
      warnings = EXCLUDED.warnings
    RETURNING *;
    `,
    [
      member.id,
      member.organization_id,
      member.account_id,
      member.role,
      member.status,
      member.created_at,
      member.updated_at,
      jsonArray(member.warnings),
    ],
  );

  return result.ok && result.rows[0]
    ? rowToOrganizationMember(result.rows[0])
    : null;
}

/* ============================================================================
 * 6. MEMBERSHIP READERS
 * ========================================================================== */

export async function findOrganizationMemberRecordById(
  id: string,
): Promise<OrganizationMember | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_organization_members
    WHERE id = $1
    LIMIT 1;
    `,
    [id],
  );

  return result.ok && result.rows[0]
    ? rowToOrganizationMember(result.rows[0])
    : null;
}

export async function findOrganizationMembershipRecord(input: {
  organization_id: string;
  account_id: string;
}): Promise<OrganizationMember | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_organization_members
    WHERE organization_id = $1
      AND account_id = $2
    LIMIT 1;
    `,
    [input.organization_id, input.account_id],
  );

  return result.ok && result.rows[0]
    ? rowToOrganizationMember(result.rows[0])
    : null;
}

export async function listOrganizationMemberRecords(
  organizationId: string,
): Promise<OrganizationMember[]> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_organization_members
    WHERE organization_id = $1
    ORDER BY created_at ASC;
    `,
    [organizationId],
  );

  return result.ok ? result.rows.map(rowToOrganizationMember) : [];
}

export async function listAccountOrganizationMembershipRecords(
  accountId: string,
): Promise<OrganizationMember[]> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_organization_members
    WHERE account_id = $1
    ORDER BY created_at DESC;
    `,
    [accountId],
  );

  return result.ok ? result.rows.map(rowToOrganizationMember) : [];
}

/* ============================================================================
 * 7. MEMBERSHIP GOVERNANCE PERSISTENCE
 * ========================================================================== */

export async function disableOrganizationMemberRecord(
  id: string,
): Promise<OrganizationMember | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    UPDATE xyvala_organization_members
    SET
      status = 'disabled',
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
    `,
    [id],
  );

  return result.ok && result.rows[0]
    ? rowToOrganizationMember(result.rows[0])
    : null;
}

export async function updateOrganizationMemberRoleRecord(input: {
  id: string;
  role: OrganizationMember["role"];
}): Promise<OrganizationMember | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    UPDATE xyvala_organization_members
    SET
      role = $2,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
    `,
    [input.id, input.role],
  );

  return result.ok && result.rows[0]
    ? rowToOrganizationMember(result.rows[0])
    : null;
}
