/* ============================================================================
 * FILE: lib/xyvala/accounts/account-contract.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala account contracts
 *
 * ROLE
 * - define canonical account and session contracts
 * - separate private account records from public account exposure
 * - preserve deterministic account, plan and status typing
 *
 * PARENTS
 * - app/api/account/signup/route.ts
 * - app/api/account/login/route.ts
 * - app/api/account/me/route.ts
 * - lib/xyvala/accounts/account-store.ts
 * - lib/xyvala/auth.ts
 * - lib/xyvala/usage.ts
 *
 * DIRECTIVES
 * - contract definitions only
 * - no runtime persistence
 * - no password verification logic
 * - no billing logic
 * - no UI dependency
 * - no route response building
 * - no optional critical fields
 * - password hashes remain private
 * - public account output must never expose password_hash
 * - EUR remains default monetary reference
 * - FR / EU compatible account governance
 *
 * INPUTS
 * - signup request payloads
 * - login request payloads
 * - account store records
 *
 * OUTPUTS
 * - AccountPlan
 * - AccountStatus
 * - AccountRecord
 * - PublicAccount
 * - AccountSession
 * - account API input/output contracts
 *
 * INVARIANTS
 * - account id is always deterministic string identity
 * - email is the primary account identifier
 * - password_hash is private only
 * - public account never exposes secrets
 * - plan is explicit
 * - status is explicit
 * - timestamps are ISO strings
 *
 * CRITICAL DEPENDENCIES
 * - lib/xyvala/usage.ts
 *
 * SENSITIVE ZONES
 * - password_hash
 * - session_token_hash
 * - account status
 * - plan entitlement
 * - public/private account boundary
 * ========================================================================== */

import type { ApiPlan } from "@/lib/xyvala/usage";

/* ============================================================================
 * 1. ACCOUNT ENUMS
 * ========================================================================== */

export type AccountPlan = Extract<
  ApiPlan,
  "demo" | "trader" | "pro" | "enterprise"
>;

export type AccountStatus =
  | "active"
  | "disabled"
  | "pending"
  | "deleted";

export type AccountRole =
  | "user"
  | "admin"
  | "owner";

export type AccountSource =
  | "signup"
  | "admin"
  | "migration"
  | "internal";

export type AccountAuthProvider =
  | "password"
  | "magic_link"
  | "oauth"
  | "internal";

export type AccountSessionStatus =
  | "active"
  | "expired"
  | "revoked";

/* ============================================================================
 * 2. PRIVATE ACCOUNT RECORD
 * ========================================================================== */

export type AccountRecord = {
  id: string;

  email: string;
  email_normalized: string;
  email_verified: boolean;

  display_name: string | null;

  plan: AccountPlan;
  status: AccountStatus;
  role: AccountRole;
  source: AccountSource;

  auth_provider: AccountAuthProvider;
  password_hash: string | null;

  created_at: string;
  updated_at: string;
  last_login_at: string | null;

  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;

  default_currency: "EUR";
  jurisdiction: "FR/EU";

  warnings: string[];
};

/* ============================================================================
 * 3. PUBLIC ACCOUNT
 * ========================================================================== */

export type PublicAccount = {
  id: string;

  email: string;
  email_verified: boolean;

  display_name: string | null;

  plan: AccountPlan;
  status: AccountStatus;
  role: AccountRole;

  created_at: string;
  updated_at: string;
  last_login_at: string | null;

  default_currency: "EUR";
  jurisdiction: "FR/EU";
};

/* ============================================================================
 * 4. SESSION CONTRACTS
 * ========================================================================== */

export type AccountSession = {
  id: string;
  account_id: string;

  session_token_hash: string;

  status: AccountSessionStatus;

  created_at: string;
  updated_at: string;
  expires_at: string;
  revoked_at: string | null;

  user_agent: string | null;
  ip_fingerprint: string | null;

  warnings: string[];
};

export type PublicAccountSession = {
  id: string;
  account_id: string;

  status: AccountSessionStatus;

  created_at: string;
  updated_at: string;
  expires_at: string;
};

/* ============================================================================
 * 5. API INPUT CONTRACTS
 * ========================================================================== */

export type AccountSignupInput = {
  email: string;
  password: string;
  display_name?: string | null;

  terms_accepted: boolean;
  privacy_accepted: boolean;
};

export type AccountLoginInput = {
  email: string;
  password: string;
};

export type AccountLogoutInput = {
  session_token: string;
};

export type AccountMeInput = {
  session_token: string;
};

/* ============================================================================
 * 6. API RESULT CONTRACTS
 * ========================================================================== */

export type AccountSignupResult = {
  ok: boolean;
  account: PublicAccount | null;
  session: PublicAccountSession | null;
  session_token: string | null;
  warnings: string[];
  error: string | null;
};

export type AccountLoginResult = {
  ok: boolean;
  account: PublicAccount | null;
  session: PublicAccountSession | null;
  session_token: string | null;
  warnings: string[];
  error: string | null;
};

export type AccountLogoutResult = {
  ok: boolean;
  warnings: string[];
  error: string | null;
};

export type AccountMeResult = {
  ok: boolean;
  account: PublicAccount | null;
  session: PublicAccountSession | null;
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 7. STORE INPUT CONTRACTS
 * ========================================================================== */

export type CreateAccountRecordInput = {
  email: string;
  display_name: string | null;
  password_hash: string | null;

  plan: AccountPlan;
  role: AccountRole;
  source: AccountSource;
  auth_provider: AccountAuthProvider;

  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;

  warnings?: string[];
};

export type UpdateAccountRecordInput = {
  id: string;

  email_verified?: boolean;
  display_name?: string | null;

  plan?: AccountPlan;
  status?: AccountStatus;
  role?: AccountRole;

  password_hash?: string | null;
  last_login_at?: string | null;

  warnings?: string[];
};

export type CreateAccountSessionInput = {
  account_id: string;
  session_token_hash: string;
  expires_at: string;

  user_agent: string | null;
  ip_fingerprint: string | null;

  warnings?: string[];
};

export type UpdateAccountSessionInput = {
  id: string;

  status?: AccountSessionStatus;
  revoked_at?: string | null;

  warnings?: string[];
};

/* ============================================================================
 * 8. PUBLIC PROJECTION
 * ========================================================================== */

export function accountRecordToPublicAccount(
  account: AccountRecord,
): PublicAccount {
  return {
    id: account.id,

    email: account.email,
    email_verified: account.email_verified,

    display_name: account.display_name,

    plan: account.plan,
    status: account.status,
    role: account.role,

    created_at: account.created_at,
    updated_at: account.updated_at,
    last_login_at: account.last_login_at,

    default_currency: account.default_currency,
    jurisdiction: account.jurisdiction,
  };
}

export function accountSessionToPublicSession(
  session: AccountSession,
): PublicAccountSession {
  return {
    id: session.id,
    account_id: session.account_id,

    status: session.status,

    created_at: session.created_at,
    updated_at: session.updated_at,
    expires_at: session.expires_at,
  };
}
