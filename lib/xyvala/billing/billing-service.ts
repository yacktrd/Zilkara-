/* ============================================================================
 * FILE: lib/xyvala/billing/billing-service.ts
 * ========================================================================== */

import type {
  AccountPlan,
  PublicAccount,
} from "@/lib/xyvala/accounts/account-contract";

import {
  billingCustomerToPublicCustomer,
  billingSubscriptionToPublicSubscription,
  type BillingContext,
  type BillingCustomer,
  type BillingInterval,
  type BillingPlan,
  type BillingPlanCatalog,
  type BillingPlanPolicy,
  type BillingProvider,
  type BillingSubscription,
  type BillingSubscriptionStatus,
  type CreateBillingCustomerInput,
  type CreateBillingSubscriptionInput,
} from "@/lib/xyvala/billing/billing-contract";

/* ============================================================================
 * 1. PLAN CATALOG
 * ========================================================================== */

export const BILLING_PLAN_CATALOG: BillingPlanCatalog = {
  demo: {
    plan: "demo",
    account_plan: "demo",
    access_compartment: "demo_30",
    currency: "EUR",
    interval: "monthly",
    monthly_price_cents_eur: 0,
    yearly_price_cents_eur: null,
    api_enabled: false,
    billing_enabled: false,
    api_keys_enabled: false,
    trial_days: 0,
  },

  trader: {
    plan: "trader",
    account_plan: "trader",
    access_compartment: "trader_60",
    currency: "EUR",
    interval: "monthly",
    monthly_price_cents_eur: 1900,
    yearly_price_cents_eur: 19000,
    api_enabled: true,
    billing_enabled: true,
    api_keys_enabled: true,
    trial_days: 7,
  },

  pro: {
    plan: "pro",
    account_plan: "pro",
    access_compartment: "full_100",
    currency: "EUR",
    interval: "monthly",
    monthly_price_cents_eur: 4900,
    yearly_price_cents_eur: 49000,
    api_enabled: true,
    billing_enabled: true,
    api_keys_enabled: true,
    trial_days: 7,
  },

  enterprise: {
    plan: "enterprise",
    account_plan: "enterprise",
    access_compartment: "admin_100",
    currency: "EUR",
    interval: "monthly",
    monthly_price_cents_eur: 0,
    yearly_price_cents_eur: null,
    api_enabled: true,
    billing_enabled: true,
    api_keys_enabled: true,
    trial_days: 0,
  },
};

/* ============================================================================
 * 2. TYPES
 * ========================================================================== */

export type CreateBillingCustomerResult = {
  ok: boolean;
  customer: BillingCustomer | null;
  warnings: string[];
  error: string | null;
};

export type CreateBillingSubscriptionResult = {
  ok: boolean;
  subscription: BillingSubscription | null;
  policy: BillingPlanPolicy | null;
  warnings: string[];
  error: string | null;
};

/* ============================================================================
 * 3. HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildId(prefix: string, seed: string): string {
  const source = safeString(seed) || "record";

  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
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

function resolveBillingPlanFromAccountPlan(plan: AccountPlan): BillingPlan {
  if (plan === "trader") return "trader";
  if (plan === "pro") return "pro";
  if (plan === "enterprise") return "enterprise";

  return "demo";
}

function isBillingActive(status: BillingSubscriptionStatus | "none"): boolean {
  return status === "active" || status === "trialing";
}

function isTrialActive(subscription: BillingSubscription | null): boolean {
  if (!subscription || subscription.status !== "trialing") return false;
  if (!subscription.trial_end) return false;

  const trialEnd = new Date(subscription.trial_end).getTime();

  return Number.isFinite(trialEnd) && trialEnd > Date.now();
}

/* ============================================================================
 * 4. PLAN RESOLUTION
 * ========================================================================== */

export function getBillingPlanPolicy(
  plan: BillingPlan,
): BillingPlanPolicy {
  return BILLING_PLAN_CATALOG[plan];
}

export function getBillingPlanPolicyFromAccountPlan(
  plan: AccountPlan,
): BillingPlanPolicy {
  return getBillingPlanPolicy(resolveBillingPlanFromAccountPlan(plan));
}

/* ============================================================================
 * 5. BILLING CUSTOMER ORCHESTRATION
 * ========================================================================== */

export function buildBillingCustomer(
  input: CreateBillingCustomerInput,
): CreateBillingCustomerResult {
  const accountId = safeString(input.account_id);
  const email = safeString(input.email);

  if (!accountId || !email) {
    return {
      ok: false,
      customer: null,
      warnings: ["billing_customer_invalid_input"],
      error: "billing_customer_invalid_input",
    };
  }

  const timestamp = nowIso();

  const customer: BillingCustomer = {
    id: buildId("bc", `${accountId}:${email}`),
    account_id: accountId,

    provider: input.provider,
    provider_customer_id: input.provider_customer_id ?? null,

    email,
    name: safeString(input.name) || null,

    currency: "EUR",
    jurisdiction: "FR/EU",

    created_at: timestamp,
    updated_at: timestamp,

    warnings: uniqueWarnings(input.warnings),
  };

  return {
    ok: true,
    customer,
    warnings: [],
    error: null,
  };
}

/* ============================================================================
 * 6. SUBSCRIPTION ORCHESTRATION
 * ========================================================================== */

export function buildBillingSubscription(
  input: CreateBillingSubscriptionInput,
): CreateBillingSubscriptionResult {
  const accountId = safeString(input.account_id);
  const customerId = safeString(input.customer_id);

  if (!accountId || !customerId) {
    return {
      ok: false,
      subscription: null,
      policy: null,
      warnings: ["billing_subscription_invalid_input"],
      error: "billing_subscription_invalid_input",
    };
  }

  const policy = getBillingPlanPolicy(input.plan);
  const timestamp = nowIso();

  const subscription: BillingSubscription = {
    id: buildId("bs", `${accountId}:${customerId}:${input.plan}`),

    account_id: accountId,
    customer_id: customerId,

    provider: input.provider,
    provider_subscription_id: input.provider_subscription_id ?? null,
    provider_price_id: input.provider_price_id ?? null,

    plan: input.plan,
    account_plan: policy.account_plan,
    access_compartment: policy.access_compartment,

    status: input.status,
    interval: input.interval,
    currency: "EUR",

    current_period_start: input.current_period_start ?? null,
    current_period_end: input.current_period_end ?? null,

    trial_start: input.trial_start ?? null,
    trial_end: input.trial_end ?? null,

    cancel_at_period_end: input.cancel_at_period_end ?? false,
    canceled_at: input.canceled_at ?? null,

    created_at: timestamp,
    updated_at: timestamp,

    warnings: uniqueWarnings(input.warnings),
  };

  return {
    ok: true,
    subscription,
    policy,
    warnings: [],
    error: null,
  };
}

/* ============================================================================
 * 7. BILLING CONTEXT
 * ========================================================================== */

export function resolveBillingContext(input: {
  account: PublicAccount;
  customer: BillingCustomer | null;
  subscription: BillingSubscription | null;
}): BillingContext {
  const plan = input.subscription?.plan
    ?? resolveBillingPlanFromAccountPlan(input.account.plan);

  const policy = getBillingPlanPolicy(plan);

  const status = input.subscription?.status ?? "none";
  const billingActive = isBillingActive(status);
  const trialActive = isTrialActive(input.subscription);

  return {
    account_id: input.account.id,

    customer: input.customer
      ? billingCustomerToPublicCustomer(input.customer)
      : null,

    subscription: input.subscription
      ? billingSubscriptionToPublicSubscription(input.subscription)
      : null,

    plan,
    account_plan: policy.account_plan,
    access_compartment: policy.access_compartment,

    status,

    billing_active: billingActive,
    trial_active: trialActive,
    payment_required:
      status === "past_due" ||
      status === "unpaid" ||
      status === "incomplete",

    can_upgrade:
      input.account.plan === "demo" ||
      input.account.plan === "trader",

    can_cancel:
      Boolean(input.subscription) &&
      status !== "canceled" &&
      status !== "none",

    currency: "EUR",

    warnings: uniqueWarnings(
      input.customer?.warnings,
      input.subscription?.warnings,
      !input.customer ? ["billing_customer_missing"] : [],
      !input.subscription ? ["billing_subscription_missing"] : [],
    ),
  };
}

/* ============================================================================
 * 8. PROVIDER PREPARATION
 * ========================================================================== */

export function resolveBillingProviderForPlan(
  plan: BillingPlan,
): BillingProvider {
  if (plan === "demo") return "internal";
  if (plan === "enterprise") return "manual";

  return "stripe";
}

export function resolveBillingInterval(
  value: BillingInterval | null | undefined,
): BillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}
