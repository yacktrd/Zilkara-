/* ============================================================================
 * FILE: lib/xyvala/billing/billing-contract.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala billing contracts
 *
 * ROLE
 * - define canonical billing, subscription and invoice contracts
 * - preserve deterministic SaaS monetization typing
 * - separate billing truth from provider adapters, UI and persistence
 *
 * PARENTS
 * - lib/xyvala/accounts/account-contract.ts
 * - lib/xyvala/api-keys/quota-engine.ts
 * - lib/xyvala/accounts/account-access.ts
 * - lib/xyvala/billing/billing-service.ts
 * - lib/xyvala/billing/stripe-service.ts
 *
 * DIRECTIVES
 * - contract definitions only
 * - no Stripe runtime logic
 * - no persistence
 * - no route response building
 * - no UI dependency
 * - no account mutation
 * - no quota mutation
 * - no API key mutation
 * - no RFS recomputation
 * - no MCI recomputation
 * - EUR remains default billing currency
 * - FR / EU compatible billing governance
 *
 * INVARIANTS
 * - billing plan is explicit
 * - subscription status is explicit
 * - currency is explicit
 * - provider ids remain nullable
 * - public billing output never exposes sensitive provider internals
 * ========================================================================== */

import type {
  AccountPlan,
} from "@/lib/xyvala/accounts/account-contract";

import type {
  AccessCompartment,
} from "@/lib/xyvala/access/access-types";

/* ============================================================================
 * 1. BILLING ENUMS
 * ========================================================================== */

export type BillingCurrency = "EUR";

export type BillingInterval =
  | "monthly"
  | "yearly";

export type BillingProvider =
  | "stripe"
  | "manual"
  | "internal";

export type BillingPlan =
  | "demo"
  | "trader"
  | "pro"
  | "enterprise";

export type BillingSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "canceling"
  | "canceled"
  | "incomplete"
  | "unpaid";

export type BillingInvoiceStatus =
  | "draft"
  | "open"
  | "paid"
  | "void"
  | "uncollectible";

export type BillingLifecycleEvent =
  | "subscription_created"
  | "subscription_updated"
  | "subscription_canceled"
  | "invoice_created"
  | "invoice_paid"
  | "invoice_failed"
  | "trial_started"
  | "trial_ended"
  | "plan_changed"
  | "billing_manual_override";

/* ============================================================================
 * 2. PLAN POLICY
 * ========================================================================== */

export type BillingPlanPolicy = {
  plan: BillingPlan;
  account_plan: AccountPlan;
  access_compartment: AccessCompartment;

  currency: BillingCurrency;
  interval: BillingInterval;

  monthly_price_cents_eur: number;
  yearly_price_cents_eur: number | null;

  api_enabled: boolean;
  billing_enabled: boolean;
  api_keys_enabled: boolean;

  trial_days: number;
};

export type BillingPlanCatalog = Record<BillingPlan, BillingPlanPolicy>;

/* ============================================================================
 * 3. BILLING CUSTOMER
 * ========================================================================== */

export type BillingCustomer = {
  id: string;
  account_id: string;

  provider: BillingProvider;
  provider_customer_id: string | null;

  email: string;
  name: string | null;

  currency: BillingCurrency;
  jurisdiction: "FR/EU";

  created_at: string;
  updated_at: string;

  warnings: string[];
};

export type PublicBillingCustomer = {
  id: string;
  account_id: string;

  provider: BillingProvider;

  email: string;
  name: string | null;

  currency: BillingCurrency;
  jurisdiction: "FR/EU";

  created_at: string;
  updated_at: string;
};

/* ============================================================================
 * 4. SUBSCRIPTION
 * ========================================================================== */

export type BillingSubscription = {
  id: string;
  account_id: string;
  customer_id: string;

  provider: BillingProvider;
  provider_subscription_id: string | null;
  provider_price_id: string | null;

  plan: BillingPlan;
  account_plan: AccountPlan;
  access_compartment: AccessCompartment;

  status: BillingSubscriptionStatus;
  interval: BillingInterval;
  currency: BillingCurrency;

  current_period_start: string | null;
  current_period_end: string | null;

  trial_start: string | null;
  trial_end: string | null;

  cancel_at_period_end: boolean;
  canceled_at: string | null;

  created_at: string;
  updated_at: string;

  warnings: string[];
};

export type PublicBillingSubscription = {
  id: string;
  account_id: string;
  customer_id: string;

  provider: BillingProvider;

  plan: BillingPlan;
  account_plan: AccountPlan;
  access_compartment: AccessCompartment;

  status: BillingSubscriptionStatus;
  interval: BillingInterval;
  currency: BillingCurrency;

  current_period_start: string | null;
  current_period_end: string | null;

  trial_end: string | null;

  cancel_at_period_end: boolean;
  canceled_at: string | null;

  created_at: string;
  updated_at: string;
};

/* ============================================================================
 * 5. INVOICE
 * ========================================================================== */

export type BillingInvoice = {
  id: string;
  account_id: string;
  customer_id: string;
  subscription_id: string | null;

  provider: BillingProvider;
  provider_invoice_id: string | null;

  status: BillingInvoiceStatus;

  currency: BillingCurrency;
  amount_due_cents_eur: number;
  amount_paid_cents_eur: number;

  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;

  created_at: string;
  updated_at: string;
  due_at: string | null;
  paid_at: string | null;

  warnings: string[];
};

export type PublicBillingInvoice = {
  id: string;
  account_id: string;
  customer_id: string;
  subscription_id: string | null;

  provider: BillingProvider;
  status: BillingInvoiceStatus;

  currency: BillingCurrency;
  amount_due_cents_eur: number;
  amount_paid_cents_eur: number;

  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;

  created_at: string;
  due_at: string | null;
  paid_at: string | null;
};

/* ============================================================================
 * 6. BILLING CONTEXT
 * ========================================================================== */

export type BillingContext = {
  account_id: string;

  customer: PublicBillingCustomer | null;
  subscription: PublicBillingSubscription | null;

  plan: BillingPlan;
  account_plan: AccountPlan;
  access_compartment: AccessCompartment;

  status: BillingSubscriptionStatus | "none";

  billing_active: boolean;
  trial_active: boolean;
  payment_required: boolean;
  can_upgrade: boolean;
  can_cancel: boolean;

  currency: BillingCurrency;
  warnings: string[];
};

/* ============================================================================
 * 7. INPUT CONTRACTS
 * ========================================================================== */

export type CreateBillingCustomerInput = {
  account_id: string;
  email: string;
  name: string | null;

  provider: BillingProvider;
  provider_customer_id?: string | null;

  warnings?: string[];
};

export type CreateBillingSubscriptionInput = {
  account_id: string;
  customer_id: string;

  provider: BillingProvider;
  provider_subscription_id?: string | null;
  provider_price_id?: string | null;

  plan: BillingPlan;
  interval: BillingInterval;
  status: BillingSubscriptionStatus;

  current_period_start?: string | null;
  current_period_end?: string | null;

  trial_start?: string | null;
  trial_end?: string | null;

  cancel_at_period_end?: boolean;
  canceled_at?: string | null;

  warnings?: string[];
};

export type UpdateBillingSubscriptionInput = {
  id: string;

  provider_subscription_id?: string | null;
  provider_price_id?: string | null;

  plan?: BillingPlan;
  interval?: BillingInterval;
  status?: BillingSubscriptionStatus;

  current_period_start?: string | null;
  current_period_end?: string | null;

  trial_start?: string | null;
  trial_end?: string | null;

  cancel_at_period_end?: boolean;
  canceled_at?: string | null;

  warnings?: string[];
};

export type CreateBillingInvoiceInput = {
  account_id: string;
  customer_id: string;
  subscription_id: string | null;

  provider: BillingProvider;
  provider_invoice_id?: string | null;

  status: BillingInvoiceStatus;

  amount_due_cents_eur: number;
  amount_paid_cents_eur: number;

  hosted_invoice_url?: string | null;
  invoice_pdf_url?: string | null;

  due_at?: string | null;
  paid_at?: string | null;

  warnings?: string[];
};

/* ============================================================================
 * 8. PUBLIC PROJECTION
 * ========================================================================== */

export function billingCustomerToPublicCustomer(
  customer: BillingCustomer,
): PublicBillingCustomer {
  return {
    id: customer.id,
    account_id: customer.account_id,

    provider: customer.provider,

    email: customer.email,
    name: customer.name,

    currency: customer.currency,
    jurisdiction: customer.jurisdiction,

    created_at: customer.created_at,
    updated_at: customer.updated_at,
  };
}

export function billingSubscriptionToPublicSubscription(
  subscription: BillingSubscription,
): PublicBillingSubscription {
  return {
    id: subscription.id,
    account_id: subscription.account_id,
    customer_id: subscription.customer_id,

    provider: subscription.provider,

    plan: subscription.plan,
    account_plan: subscription.account_plan,
    access_compartment: subscription.access_compartment,

    status: subscription.status,
    interval: subscription.interval,
    currency: subscription.currency,

    current_period_start: subscription.current_period_start,
    current_period_end: subscription.current_period_end,

    trial_end: subscription.trial_end,

    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at,

    created_at: subscription.created_at,
    updated_at: subscription.updated_at,
  };
}

export function billingInvoiceToPublicInvoice(
  invoice: BillingInvoice,
): PublicBillingInvoice {
  return {
    id: invoice.id,
    account_id: invoice.account_id,
    customer_id: invoice.customer_id,
    subscription_id: invoice.subscription_id,

    provider: invoice.provider,
    status: invoice.status,

    currency: invoice.currency,
    amount_due_cents_eur: invoice.amount_due_cents_eur,
    amount_paid_cents_eur: invoice.amount_paid_cents_eur,

    hosted_invoice_url: invoice.hosted_invoice_url,
    invoice_pdf_url: invoice.invoice_pdf_url,

    created_at: invoice.created_at,
    due_at: invoice.due_at,
    paid_at: invoice.paid_at,
  };
}
