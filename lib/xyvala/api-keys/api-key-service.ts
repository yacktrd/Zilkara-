/* ============================================================================
 * FILE: lib/xyvala/api-keys/api-key-service.ts
 * ========================================================================== */

import type {
  AccountRecord,
  PublicAccount,
} from "@/lib/xyvala/accounts/account-contract";

import {
  resolveAccountAccess,
  type AccountAccessContext,
} from "@/lib/xyvala/accounts/account-access";

import {
  apiKeyRecordToPublicApiKey,
  type ApiKeyPermission,
  type PublicApiKey,
} from "@/lib/xyvala/api-keys/api-key-contract";

import {
  createRawApiKey,
} from "@/lib/xyvala/api-keys/api-key-auth";

import {
  createApiKeyRecord,
  expireApiKeyIfNeeded,
  findApiKeyByRawKey,
  listPublicApiKeysByAccount,
  markApiKeyUsed,
} from "@/lib/xyvala/api-keys/api-key-store";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type CreateAccountApiKeyInput = {
  account: AccountRecord | PublicAccount;
  label?: string | null;
  expires_at?: string | null;
};

export type CreateAccountApiKeyResult = {
  ok: boolean;
  raw_key: string | null;
  api_key: PublicApiKey | null;
  access: AccountAccessContext | null;
  warnings: string[];
  error: string | null;
};

export type ResolveApiKeyResult = {
  ok: boolean;
  api_key: PublicApiKey | null;
  permissions: ApiKeyPermission[];
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 2. PERMISSIONS
 * ========================================================================== */

function resolvePermissions(
  access: AccountAccessContext,
): ApiKeyPermission[] {
  if (!access.can_access_api) {
    return ["scan:read"];
  }

  if (access.plan === "trader") {
    return ["scan:read", "assets:read", "usage:read"];
  }

  if (access.plan === "pro" || access.plan === "enterprise") {
    return ["scan:read", "assets:read", "account:read", "usage:read"];
  }

  return ["scan:read"];
}

/* ============================================================================
 * 3. SERVICE
 * ========================================================================== */

export function createAccountApiKey(
  input: CreateAccountApiKeyInput,
): CreateAccountApiKeyResult {
  const access = resolveAccountAccess(input.account);

  if (!access.can_manage_api_keys) {
    return {
      ok: false,
      raw_key: null,
      api_key: null,
      access,
      warnings: ["api_key_creation_not_allowed_for_plan"],
      error: "api_key_creation_not_allowed_for_plan",
    };
  }

  const rawKey = createRawApiKey({
    kind: "user",
  });

  const record = createApiKeyRecord({
    account_id: input.account.id,
    label: input.label?.trim() || "Xyvala API Key",
    raw_key: rawKey,
    kind: "user",
    plan: access.plan,
    compartment: access.compartment,
    permissions: resolvePermissions(access),
    expires_at: input.expires_at ?? null,
    warnings: ["api_key_created_from_account"],
  });

  if (!record) {
    return {
      ok: false,
      raw_key: null,
      api_key: null,
      access,
      warnings: ["api_key_create_failed"],
      error: "api_key_create_failed",
    };
  }

  return {
    ok: true,
    raw_key: rawKey,
    api_key: apiKeyRecordToPublicApiKey(record),
    access,
    warnings: [],
    error: null,
  };
}

export function resolveApiKey(rawKey: string): ResolveApiKeyResult {
  const record = expireApiKeyIfNeeded(findApiKeyByRawKey(rawKey));

  if (!record || record.status !== "active") {
    return {
      ok: false,
      api_key: null,
      permissions: [],
      warnings: ["api_key_invalid_or_inactive"],
      error: "api_key_invalid_or_inactive",
    };
  }

  const used = markApiKeyUsed(record.id) ?? record;

  return {
    ok: true,
    api_key: apiKeyRecordToPublicApiKey(used),
    permissions: used.permissions,
    warnings: [],
    error: null,
  };
}

export function listAccountApiKeys(accountId: string): PublicApiKey[] {
  return listPublicApiKeysByAccount(accountId);
}
