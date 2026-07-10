/* ============================================================================
 * FILE: lib/xyvala/api-keys/quota-engine.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala API quota governance engine
 *
 * ROLE
 * - derive deterministic SaaS quota states from API key usage aggregates
 * - evaluate quota pressure, overage risk and upgrade pressure
 * - keep commercial quota governance separate from usage persistence
 *
 * PARENTS
 * - lib/xyvala/api-keys/api-key-contract.ts
 * - lib/xyvala/api-keys/api-key-usage.ts
 * - lib/xyvala/api-keys/usage-store.ts
 * - lib/xyvala/accounts/account-access.ts
 *
 * DIRECTIVES
 * - quota governance only
 * - no persistence
 * - no API key generation
 * - no usage mutation
 * - no billing mutation
 * - no route response building
 * - no UI logic
 * - no account mutation
 * - no RFS recomputation
 * - no MCI recomputation
 * - deterministic evaluation only
 *
 * INVARIANTS
 * - quota percentages are bounded [0,100]
 * - quota state is explicit
 * - BLOCK is reserved for exceeded limits
 * - WATCH is used for elevated quota pressure
 * - ALLOW is used for healthy quota state
 * ========================================================================== */

import type { AccessCompartment } from "@/lib/xyvala/access/access-types";
import type { AccountPlan } from "@/lib/xyvala/accounts/account-contract";
import type { PublicApiKey } from "@/lib/xyvala/api-keys/api-key-contract";
import type { UsageAggregate } from "@/lib/xyvala/api-keys/usage-store";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type QuotaDecision = "ALLOW" | "WATCH" | "BLOCK";

export type QuotaPressureState =
  | "healthy"
  | "elevated"
  | "high"
  | "exceeded"
  | "unknown";

export type QuotaLimitPolicy = {
  plan: AccountPlan;
  compartment: AccessCompartment;

  daily_request_limit: number;
  monthly_request_limit: number;

  warning_threshold_pct: number;
  high_threshold_pct: number;
  block_threshold_pct: number;
};

export type QuotaEvaluationInput = {
  api_key: PublicApiKey;
  usage: UsageAggregate;

  daily_used?: number;
  monthly_used?: number;
};

export type QuotaEvaluation = {
  api_key_id: string;
  account_id: string | null;

  plan: AccountPlan;
  compartment: AccessCompartment;

  daily_used: number;
  monthly_used: number;

  daily_limit: number;
  monthly_limit: number;

  daily_usage_pct: number;
  monthly_usage_pct: number;
  dominant_usage_pct: number;

  pressure_state: QuotaPressureState;
  decision: QuotaDecision;
  reason: string;

  upgrade_pressure: boolean;
  billing_relevant: boolean;

  warnings: string[];
};

/* ============================================================================
 * 2. POLICIES
 * ========================================================================== */

const QUOTA_POLICIES: Record<AccessCompartment, QuotaLimitPolicy> = {
  public_10: {
    plan: "demo",
    compartment: "public_10",
    daily_request_limit: 100,
    monthly_request_limit: 1_000,
    warning_threshold_pct: 70,
    high_threshold_pct: 90,
    block_threshold_pct: 100,
  },
  demo_30: {
    plan: "demo",
    compartment: "demo_30",
    daily_request_limit: 500,
    monthly_request_limit: 5_000,
    warning_threshold_pct: 70,
    high_threshold_pct: 90,
    block_threshold_pct: 100,
  },
  trader_60: {
    plan: "trader",
    compartment: "trader_60",
    daily_request_limit: 5_000,
    monthly_request_limit: 100_000,
    warning_threshold_pct: 75,
    high_threshold_pct: 92,
    block_threshold_pct: 100,
  },
  full_100: {
    plan: "pro",
    compartment: "full_100",
    daily_request_limit: 50_000,
    monthly_request_limit: 1_000_000,
    warning_threshold_pct: 80,
    high_threshold_pct: 95,
    block_threshold_pct: 100,
  },
  admin_100: {
    plan: "enterprise",
    compartment: "admin_100",
    daily_request_limit: 250_000,
    monthly_request_limit: 5_000_000,
    warning_threshold_pct: 85,
    high_threshold_pct: 97,
    block_threshold_pct: 100,
  },
};

/* ============================================================================
 * 3. HELPERS
 * ========================================================================== */

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.min(100, value));
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.max(0, value);
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

function resolvePolicy(compartment: AccessCompartment): QuotaLimitPolicy {
  return QUOTA_POLICIES[compartment];
}

function resolvePressureState(input: {
  dominantPct: number;
  policy: QuotaLimitPolicy;
}): QuotaPressureState {
  if (input.dominantPct >= input.policy.block_threshold_pct) {
    return "exceeded";
  }

  if (input.dominantPct >= input.policy.high_threshold_pct) {
    return "high";
  }

  if (input.dominantPct >= input.policy.warning_threshold_pct) {
    return "elevated";
  }

  return "healthy";
}

function resolveDecision(state: QuotaPressureState): QuotaDecision {
  if (state === "exceeded") return "BLOCK";
  if (state === "high" || state === "elevated") return "WATCH";

  return "ALLOW";
}

function resolveReason(state: QuotaPressureState): string {
  if (state === "exceeded") return "quota_limit_exceeded";
  if (state === "high") return "quota_pressure_high";
  if (state === "elevated") return "quota_pressure_elevated";
  if (state === "healthy") return "quota_healthy";

  return "quota_unknown";
}

/* ============================================================================
 * 4. ENGINE
 * ========================================================================== */

export function getQuotaPolicy(
  compartment: AccessCompartment,
): QuotaLimitPolicy {
  return resolvePolicy(compartment);
}

export function evaluateApiKeyQuota(
  input: QuotaEvaluationInput,
): QuotaEvaluation {
  const policy = resolvePolicy(input.api_key.compartment);

  const dailyUsed = clampNonNegative(
    input.daily_used ?? input.usage.total_records,
  );

  const monthlyUsed = clampNonNegative(
    input.monthly_used ?? input.usage.total_records,
  );

  const dailyUsagePct = pct(dailyUsed, policy.daily_request_limit);
  const monthlyUsagePct = pct(monthlyUsed, policy.monthly_request_limit);

  const dominantUsagePct = Math.max(dailyUsagePct, monthlyUsagePct);

  const pressureState = resolvePressureState({
    dominantPct: dominantUsagePct,
    policy,
  });

  const decision = resolveDecision(pressureState);
  const reason = resolveReason(pressureState);

  return {
    api_key_id: input.api_key.id,
    account_id: input.api_key.account_id,

    plan: input.api_key.plan,
    compartment: input.api_key.compartment,

    daily_used: dailyUsed,
    monthly_used: monthlyUsed,

    daily_limit: policy.daily_request_limit,
    monthly_limit: policy.monthly_request_limit,

    daily_usage_pct: dailyUsagePct,
    monthly_usage_pct: monthlyUsagePct,
    dominant_usage_pct: dominantUsagePct,

    pressure_state: pressureState,
    decision,
    reason,

    upgrade_pressure:
      decision === "WATCH" &&
      input.api_key.plan !== "enterprise" &&
      input.api_key.compartment !== "admin_100",

    billing_relevant: pressureState !== "healthy",

    warnings: uniqueWarnings(
      input.usage.warnings,
      decision !== "ALLOW" ? [reason] : [],
    ),
  };
}
