/* ============================================================================
 * FILE: lib/xyvala/organizations/organization-quota-service.ts
 * ========================================================================== */

import type { AccountPlan } from "@/lib/xyvala/accounts/account-contract";
import type { AccessCompartment } from "@/lib/xyvala/access/access-types";

import {
  aggregateUsageByAccount,
  listUsageRecordsByAccount,
  type UsageAggregate,
  type UsageStoreRecord,
} from "@/lib/xyvala/api-keys/usage-store";

import {
  evaluateApiKeyQuota,
  getQuotaPolicy,
  type QuotaDecision,
  type QuotaPressureState,
} from "@/lib/xyvala/api-keys/quota-engine";

import {
  findOrganizationById,
  listOrganizationMembers,
  type OrganizationRecord,
} from "@/lib/xyvala/organizations/organization-store";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type OrganizationQuotaDecision = QuotaDecision;

export type OrganizationQuotaReason =
  | "organization_quota_healthy"
  | "organization_quota_pressure_elevated"
  | "organization_quota_pressure_high"
  | "organization_quota_exceeded"
  | "organization_not_found"
  | "organization_not_active"
  | "organization_has_no_members";

export type OrganizationQuotaEvaluation = {
  organization_id: string;

  plan: AccountPlan;
  compartment: AccessCompartment;

  member_count: number;
  tracked_accounts: number;

  total_usage_records: number;
  total_allowed: number;
  total_blocked: number;

  daily_limit: number;
  monthly_limit: number;

  daily_used: number;
  monthly_used: number;

  daily_usage_pct: number;
  monthly_usage_pct: number;
  dominant_usage_pct: number;

  pressure_state: QuotaPressureState;
  decision: OrganizationQuotaDecision;
  reason: OrganizationQuotaReason;

  upgrade_pressure: boolean;
  billing_relevant: boolean;

  warnings: string[];
};

/* ============================================================================
 * 2. POLICIES
 * ========================================================================== */

const ORGANIZATION_PLAN_COMPARTMENT: Record<AccountPlan, AccessCompartment> = {
  demo: "demo_30",
  trader: "trader_60",
  pro: "full_100",
  enterprise: "admin_100",
};

/* ============================================================================
 * 3. HELPERS
 * ========================================================================== */

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function pct(used: number, limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 100;
  return clampPct((clampNonNegative(used) / limit) * 100);
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

function inferOrganizationPlan(
  organization: OrganizationRecord,
): AccountPlan {
  if (organization.warnings.includes("organization_enterprise")) {
    return "enterprise";
  }

  if (organization.warnings.includes("organization_pro")) {
    return "pro";
  }

  if (organization.warnings.includes("organization_trader")) {
    return "trader";
  }

  return "demo";
}

function resolvePressureState(input: {
  dominant_usage_pct: number;
}): QuotaPressureState {
  if (input.dominant_usage_pct >= 100) return "exceeded";
  if (input.dominant_usage_pct >= 92) return "high";
  if (input.dominant_usage_pct >= 75) return "elevated";

  return "healthy";
}

function resolveDecision(state: QuotaPressureState): OrganizationQuotaDecision {
  if (state === "exceeded") return "BLOCK";
  if (state === "high" || state === "elevated") return "WATCH";

  return "ALLOW";
}

function resolveReason(
  state: QuotaPressureState,
): OrganizationQuotaReason {
  if (state === "exceeded") return "organization_quota_exceeded";
  if (state === "high") return "organization_quota_pressure_high";
  if (state === "elevated") {
    return "organization_quota_pressure_elevated";
  }

  return "organization_quota_healthy";
}

function aggregateMemberUsage(accountIds: string[]): {
  records: UsageStoreRecord[];
  aggregates: UsageAggregate[];
} {
  const records = accountIds.flatMap((accountId) =>
    listUsageRecordsByAccount(accountId),
  );

  const aggregates = accountIds.map((accountId) =>
    aggregateUsageByAccount(accountId),
  );

  return {
    records,
    aggregates,
  };
}

/* ============================================================================
 * 4. SERVICE
 * ========================================================================== */

export function evaluateOrganizationQuota(input: {
  organization_id: string;
  plan?: AccountPlan;
}): OrganizationQuotaEvaluation {
  const organization = findOrganizationById(input.organization_id);

  if (!organization) {
    return {
      organization_id: input.organization_id,

      plan: "demo",
      compartment: "demo_30",

      member_count: 0,
      tracked_accounts: 0,

      total_usage_records: 0,
      total_allowed: 0,
      total_blocked: 0,

      daily_limit: 0,
      monthly_limit: 0,

      daily_used: 0,
      monthly_used: 0,

      daily_usage_pct: 0,
      monthly_usage_pct: 0,
      dominant_usage_pct: 0,

      pressure_state: "unknown",
      decision: "BLOCK",
      reason: "organization_not_found",

      upgrade_pressure: false,
      billing_relevant: false,

      warnings: ["organization_not_found"],
    };
  }

  if (organization.status !== "active") {
    return {
      organization_id: organization.id,

      plan: "demo",
      compartment: "demo_30",

      member_count: 0,
      tracked_accounts: 0,

      total_usage_records: 0,
      total_allowed: 0,
      total_blocked: 0,

      daily_limit: 0,
      monthly_limit: 0,

      daily_used: 0,
      monthly_used: 0,

      daily_usage_pct: 0,
      monthly_usage_pct: 0,
      dominant_usage_pct: 0,

      pressure_state: "unknown",
      decision: "BLOCK",
      reason: "organization_not_active",

      upgrade_pressure: false,
      billing_relevant: false,

      warnings: uniqueWarnings(organization.warnings, [
        "organization_not_active",
      ]),
    };
  }

  const members = listOrganizationMembers(organization.id).filter(
    (member) => member.status === "active",
  );

  if (members.length === 0) {
    return {
      organization_id: organization.id,

      plan: "demo",
      compartment: "demo_30",

      member_count: 0,
      tracked_accounts: 0,

      total_usage_records: 0,
      total_allowed: 0,
      total_blocked: 0,

      daily_limit: 0,
      monthly_limit: 0,

      daily_used: 0,
      monthly_used: 0,

      daily_usage_pct: 0,
      monthly_usage_pct: 0,
      dominant_usage_pct: 0,

      pressure_state: "unknown",
      decision: "WATCH",
      reason: "organization_has_no_members",

      upgrade_pressure: false,
      billing_relevant: false,

      warnings: uniqueWarnings(organization.warnings, [
        "organization_has_no_members",
      ]),
    };
  }

  const plan = input.plan ?? inferOrganizationPlan(organization);
  const compartment = ORGANIZATION_PLAN_COMPARTMENT[plan];
  const policy = getQuotaPolicy(compartment);

  const accountIds = [...new Set(members.map((member) => member.account_id))];

  const usage = aggregateMemberUsage(accountIds);

  const totalUsageRecords = usage.aggregates.reduce(
    (sum, aggregate) => sum + aggregate.total_records,
    0,
  );

  const totalAllowed = usage.aggregates.reduce(
    (sum, aggregate) => sum + aggregate.total_allowed,
    0,
  );

  const totalBlocked = usage.aggregates.reduce(
    (sum, aggregate) => sum + aggregate.total_blocked,
    0,
  );

  const dailyLimit = policy.daily_request_limit * Math.max(1, members.length);
  const monthlyLimit =
    policy.monthly_request_limit * Math.max(1, members.length);

  const dailyUsed = totalUsageRecords;
  const monthlyUsed = totalUsageRecords;

  const dailyUsagePct = pct(dailyUsed, dailyLimit);
  const monthlyUsagePct = pct(monthlyUsed, monthlyLimit);
  const dominantUsagePct = Math.max(dailyUsagePct, monthlyUsagePct);

  const pressureState = resolvePressureState({
    dominant_usage_pct: dominantUsagePct,
  });

  const decision = resolveDecision(pressureState);
  const reason = resolveReason(pressureState);

  return {
    organization_id: organization.id,

    plan,
    compartment,

    member_count: members.length,
    tracked_accounts: accountIds.length,

    total_usage_records: totalUsageRecords,
    total_allowed: totalAllowed,
    total_blocked: totalBlocked,

    daily_limit: dailyLimit,
    monthly_limit: monthlyLimit,

    daily_used: dailyUsed,
    monthly_used: monthlyUsed,

    daily_usage_pct: dailyUsagePct,
    monthly_usage_pct: monthlyUsagePct,
    dominant_usage_pct: dominantUsagePct,

    pressure_state: pressureState,
    decision,
    reason,

    upgrade_pressure:
      decision === "WATCH" &&
      plan !== "enterprise" &&
      compartment !== "admin_100",

    billing_relevant: decision !== "ALLOW",

    warnings: uniqueWarnings(
      organization.warnings,
      ...members.map((member) => member.warnings),
      ...usage.aggregates.map((aggregate) => aggregate.warnings),
      decision !== "ALLOW" ? [reason] : [],
    ),
  };
}

/* ============================================================================
 * 5. COMPATIBILITY HELPERS
 * ========================================================================== */

export function evaluateOrganizationQuotaFromUsage(input: {
  organization_id: string;
  plan?: AccountPlan;
}): OrganizationQuotaEvaluation {
  return evaluateOrganizationQuota(input);
}
