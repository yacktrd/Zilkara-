/* ============================================================================
 * FILE: lib/xyvala/billing/stripe-service.ts
 * ========================================================================== */

import type {
  BillingInterval,
  BillingPlan,
} from "@/lib/xyvala/billing/billing-contract";

import {
  getBillingPlanPolicy,
  resolveBillingProviderForPlan,
} from "@/lib/xyvala/billing/billing-service";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type StripeCheckoutMode = "subscription";

export type StripeServiceResult<T> = {
  ok: boolean;
  data: T | null;
  warnings: string[];
  error: string | null;
};

export type StripeCheckoutInput = {
  account_id: string;
  email: string;
  plan: BillingPlan;
  interval: BillingInterval;

  success_url: string;
  cancel_url: string;
};

export type StripeCheckoutSession = {
  provider: "stripe";
  checkout_url: string | null;
  checkout_session_id: string | null;
  plan: BillingPlan;
  interval: BillingInterval;
};

export type StripePortalInput = {
  provider_customer_id: string;
  return_url: string;
};

export type StripePortalSession = {
  provider: "stripe";
  portal_url: string | null;
};

/* ============================================================================
 * 2. CONFIG
 * ========================================================================== */

const STRIPE_API_BASE_URL = "https://api.stripe.com/v1";

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getStripeSecretKey(): string {
  return safeString(process.env.STRIPE_SECRET_KEY);
}

function getStripePriceId(input: {
  plan: BillingPlan;
  interval: BillingInterval;
}): string {
  const key = `STRIPE_PRICE_${input.plan.toUpperCase()}_${input.interval.toUpperCase()}`;

  return safeString(process.env[key]);
}

function isStripeEnabled(): boolean {
  return getStripeSecretKey().length > 0;
}

function buildStripeHeaders(): HeadersInit {
  return {
    authorization: `Bearer ${getStripeSecretKey()}`,
    "content-type": "application/x-www-form-urlencoded",
  };
}

async function stripePost<T>(
  path: string,
  params: URLSearchParams,
): Promise<StripeServiceResult<T>> {
  if (!isStripeEnabled()) {
    return {
      ok: false,
      data: null,
      warnings: ["stripe_secret_key_missing"],
      error: "stripe_secret_key_missing",
    };
  }

  const response = await fetch(`${STRIPE_API_BASE_URL}${path}`, {
    method: "POST",
    headers: buildStripeHeaders(),
    body: params.toString(),
    cache: "no-store",
  });

  const payload = (await response.json()) as T & {
    error?: { message?: string };
  };

  if (!response.ok) {
    return {
      ok: false,
      data: null,
      warnings: ["stripe_request_failed"],
      error: payload.error?.message ?? "stripe_request_failed",
    };
  }

  return {
    ok: true,
    data: payload,
    warnings: [],
    error: null,
  };
}

/* ============================================================================
 * 4. CHECKOUT
 * ========================================================================== */

export async function createStripeCheckoutSession(
  input: StripeCheckoutInput,
): Promise<StripeServiceResult<StripeCheckoutSession>> {
  const provider = resolveBillingProviderForPlan(input.plan);

  if (provider !== "stripe") {
    return {
      ok: false,
      data: null,
      warnings: ["stripe_not_required_for_plan"],
      error: "stripe_not_required_for_plan",
    };
  }

  const policy = getBillingPlanPolicy(input.plan);
  const priceId = getStripePriceId({
    plan: input.plan,
    interval: input.interval,
  });

  if (!priceId) {
    return {
      ok: false,
      data: null,
      warnings: ["stripe_price_id_missing"],
      error: "stripe_price_id_missing",
    };
  }

  const params = new URLSearchParams();

  params.set("mode", "subscription");
  params.set("customer_email", input.email);
  params.set("success_url", input.success_url);
  params.set("cancel_url", input.cancel_url);
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("metadata[account_id]", input.account_id);
  params.set("metadata[plan]", input.plan);
  params.set("metadata[interval]", input.interval);
  params.set("metadata[jurisdiction]", "FR/EU");
  params.set("metadata[currency]", policy.currency);

  const result = await stripePost<{
    id: string;
    url: string | null;
  }>("/checkout/sessions", params);

  if (!result.ok || !result.data) {
    return {
      ok: false,
      data: null,
      warnings: result.warnings,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: {
      provider: "stripe",
      checkout_url: result.data.url,
      checkout_session_id: result.data.id,
      plan: input.plan,
      interval: input.interval,
    },
    warnings: [],
    error: null,
  };
}

/* ============================================================================
 * 5. BILLING PORTAL
 * ========================================================================== */

export async function createStripeBillingPortalSession(
  input: StripePortalInput,
): Promise<StripeServiceResult<StripePortalSession>> {
  const customerId = safeString(input.provider_customer_id);
  const returnUrl = safeString(input.return_url);

  if (!customerId || !returnUrl) {
    return {
      ok: false,
      data: null,
      warnings: ["stripe_portal_invalid_input"],
      error: "stripe_portal_invalid_input",
    };
  }

  const params = new URLSearchParams();

  params.set("customer", customerId);
  params.set("return_url", returnUrl);

  const result = await stripePost<{
    url: string | null;
  }>("/billing_portal/sessions", params);

  if (!result.ok || !result.data) {
    return {
      ok: false,
      data: null,
      warnings: result.warnings,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: {
      provider: "stripe",
      portal_url: result.data.url,
    },
    warnings: [],
    error: null,
  };
}
