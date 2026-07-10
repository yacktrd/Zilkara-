/* ============================================================================
 * FILE: lib/xyvala/accounts/account-access.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala account access resolver
 *
 * ROLE
 * - bridge account plans with canonical Xyvala access scopes
 * - derive deterministic account access context from public/private account data
 * - keep SaaS entitlement resolution outside UI, routes and dashboard pages
 *
 * PARENTS
 * - lib/xyvala/accounts/account-contract.ts
 * - lib/xyvala/access/access-compartments.ts
 * - lib/xyvala/access/access-types.ts
 * - app/account/page.tsx
 * - app/dashboard/page.tsx
 *
 * DIRECTIVES
 * - account access resolution only
 * - no billing mutation
 * - no API key generation
 * - no usage tracking
 * - no route response building
 * - no UI rendering
 * - no auth reconstruction
 * - no session validation
 * - no RFS recomputation
 * - no MCI recomputation
 * - deterministic mapping only
 * - same account plan => same access scope
 *
 * INPUTS
 * - PublicAccount
 * - AccountRecord
 *
 * OUTPUTS
 * - AccountAccessContext
 *
 * INVARIANTS
 * - inactive accounts resolve to locked access
 * - demo accounts resolve to demo_30
 * - trader accounts resolve to trader_60
 * - pro / enterprise accounts resolve to full_100
 * - access scope is always explicit
 * - account plan remains the source of entitlement truth
 * ========================================================================== */

import type {
  AccountPlan,
  AccountRecord,
  AccountStatus,
  PublicAccount,
} from "@/lib/xyvala/accounts/account-contract";

import { ACCESS_COMPARTMENTS } from "@/lib/xyvala/access/access-compartments";
import type {
  AccessCompartment,
  AccessScope,
} from "@/lib/xyvala/access/access-types";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type AccountAccessState =
  | "active"
  | "locked"
  | "pending"
  | "disabled";

export type AccountAccessReason =
  | "account_active"
  | "account_pending"
  | "account_disabled"
  | "account_deleted"
  | "account_status_unknown";

export type AccountAccessContext = {
  account_id: string;
  plan: AccountPlan;
  status: AccountStatus;

  access_state: AccountAccessState;
  access_reason: AccountAccessReason;

  compartment: AccessCompartment;
  scope: AccessScope;

  can_access_dashboard: boolean;
  can_access_api: boolean;
  can_manage_billing: boolean;
  can_manage_api_keys: boolean;

  warnings: string[];
};

type AccountLike = PublicAccount | AccountRecord;

/* ============================================================================
 * 2. HELPERS
 * ========================================================================== */

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

function resolveCompartmentFromPlan(plan: AccountPlan): AccessCompartment {
  if (plan === "demo") return "demo_30";
  if (plan === "trader") return "trader_60";

  return "full_100";
}

function resolveAccessState(status: AccountStatus): {
  access_state: AccountAccessState;
  access_reason: AccountAccessReason;
} {
  if (status === "active") {
    return {
      access_state: "active",
      access_reason: "account_active",
    };
  }

  if (status === "pending") {
    return {
      access_state: "pending",
      access_reason: "account_pending",
    };
  }

  if (status === "disabled") {
    return {
      access_state: "disabled",
      access_reason: "account_disabled",
    };
  }

  if (status === "deleted") {
    return {
      access_state: "locked",
      access_reason: "account_deleted",
    };
  }

  return {
    access_state: "locked",
    access_reason: "account_status_unknown",
  };
}

/* ============================================================================
 * 3. ACCESS RESOLUTION
 * ========================================================================== */

export function resolveAccountAccess(
  account: AccountLike,
): AccountAccessContext {
  const state = resolveAccessState(account.status);
  const active = state.access_state === "active";

  const compartment = active
    ? resolveCompartmentFromPlan(account.plan)
    : "public_10";

  const scope = ACCESS_COMPARTMENTS[compartment];

  return {
    account_id: account.id,
    plan: account.plan,
    status: account.status,

    access_state: state.access_state,
    access_reason: state.access_reason,

    compartment,
    scope,

    can_access_dashboard: active,
    can_access_api: active && account.plan !== "demo",
    can_manage_billing: active,
    can_manage_api_keys: active && account.plan !== "demo",

    warnings: uniqueWarnings(
      state.access_state !== "active"
        ? [`account_access_${state.access_reason}`]
        : [],
    ),
  };
}

export function resolvePublicAccountAccess(
  account: PublicAccount | null,
): AccountAccessContext | null {
  if (!account) return null;

  return resolveAccountAccess(account);
}
