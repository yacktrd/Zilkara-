/* ============================================================================
 * FILE: lib/xyvala/api-keys/api-key-contract.ts
 * ========================================================================== */

import type { AccountPlan } from "@/lib/xyvala/accounts/account-contract";
import type { AccessCompartment } from "@/lib/xyvala/access/access-types";

export type ApiKeyStatus = "active" | "disabled" | "revoked" | "expired";

export type ApiKeyKind = "user" | "service" | "internal" | "legacy";

export type ApiKeyPermission =
  | "scan:read"
  | "assets:read"
  | "account:read"
  | "usage:read"
  | "admin:read";

export type ApiKeyRecord = {
  id: string;
  account_id: string | null;

  label: string;
  key_hash: string;
  key_prefix: string;

  kind: ApiKeyKind;
  status: ApiKeyStatus;

  plan: AccountPlan;
  compartment: AccessCompartment;
  permissions: ApiKeyPermission[];

  created_at: string;
  updated_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;

  warnings: string[];
};

export type PublicApiKey = {
  id: string;
  account_id: string | null;

  label: string;
  key_prefix: string;

  kind: ApiKeyKind;
  status: ApiKeyStatus;

  plan: AccountPlan;
  compartment: AccessCompartment;
  permissions: ApiKeyPermission[];

  created_at: string;
  updated_at: string;
  expires_at: string | null;
  last_used_at: string | null;
};

export type CreateApiKeyInput = {
  account_id: string | null;
  label: string;
  raw_key: string;

  kind: ApiKeyKind;
  plan: AccountPlan;
  compartment: AccessCompartment;
  permissions: ApiKeyPermission[];

  expires_at?: string | null;
  warnings?: string[];
};

export type UpdateApiKeyInput = {
  id: string;

  label?: string;
  status?: ApiKeyStatus;
  last_used_at?: string | null;
  revoked_at?: string | null;
  warnings?: string[];
};

export function apiKeyRecordToPublicApiKey(
  record: ApiKeyRecord,
): PublicApiKey {
  return {
    id: record.id,
    account_id: record.account_id,

    label: record.label,
    key_prefix: record.key_prefix,

    kind: record.kind,
    status: record.status,

    plan: record.plan,
    compartment: record.compartment,
    permissions: record.permissions,

    created_at: record.created_at,
    updated_at: record.updated_at,
    expires_at: record.expires_at,
    last_used_at: record.last_used_at,
  };
}
