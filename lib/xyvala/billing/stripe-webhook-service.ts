/* ============================================================================
 * FILE: lib/xyvala/billing/stripe-webhook-service.ts
 * ========================================================================== */

import crypto from "node:crypto";

import type {
  BillingInvoiceStatus,
  BillingSubscriptionStatus,
} from "@/lib/xyvala/billing/billing-contract";

import {
  findBillingSubscriptionByProviderId,
  updateBillingSubscription,
} from "@/lib/xyvala/billing/subscription-store";

import {
  createBillingInvoice,
  findBillingInvoiceByProviderId,
  updateBillingInvoice,
} from "@/lib/xyvala/billing/invoice-store";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type StripeWebhookResult = {
  ok: boolean;
  event_type: string | null;
  processed: boolean;
  warnings: string[];
  error: string | null;
};

type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

/* ============================================================================
 * 2. CONFIG
 * ========================================================================== */

const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function safeBool(value: unknown): boolean {
  return value === true;
}

function unixToIso(value: unknown): string | null {
  const ts = safeNumber(value);
  if (ts <= 0) return null;

  return new Date(ts * 1000).toISOString();
}

function mapSubscriptionStatus(value: unknown): BillingSubscriptionStatus {
  const status = safeString(value);

  if (status === "trialing") return "trialing";
  if (status === "active") return "active";
  if (status === "past_due") return "past_due";
  if (status === "paused") return "paused";
  if (status === "canceled") return "canceled";
  if (status === "incomplete") return "incomplete";
  if (status === "unpaid") return "unpaid";

  return "incomplete";
}

function mapInvoiceStatus(value: unknown): BillingInvoiceStatus {
  const status = safeString(value);

  if (status === "draft") return "draft";
  if (status === "open") return "open";
  if (status === "paid") return "paid";
  if (status === "void") return "void";
  if (status === "uncollectible") return "uncollectible";

  return "open";
}

/* ============================================================================
 * 4. SIGNATURE VERIFICATION
 * ========================================================================== */

function getWebhookSecret(): string {
  return safeString(process.env.STRIPE_WEBHOOK_SECRET);
}

function parseStripeSignatureHeader(header: string): {
  timestamp: string | null;
  signatures: string[];
} {
  const parts = header.split(",").map((item) => item.trim());

  let timestamp: string | null = null;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=");

    if (key === "t") timestamp = value ?? null;
    if (key === "v1" && value) signatures.push(value);
  }

  return { timestamp, signatures };
}

export function verifyStripeWebhookSignature(input: {
  raw_body: string;
  signature_header: string | null;
}): boolean {
  const secret = getWebhookSecret();

  if (!secret) return false;

  const signatureHeader = safeString(input.signature_header);
  if (!signatureHeader) return false;

  const parsed = parseStripeSignatureHeader(signatureHeader);
  if (!parsed.timestamp || parsed.signatures.length === 0) return false;

  const timestamp = Number(parsed.timestamp);
  if (!Number.isFinite(timestamp)) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);

  if (
    Math.abs(nowSeconds - timestamp) >
    STRIPE_SIGNATURE_TOLERANCE_SECONDS
  ) {
    return false;
  }

  const signedPayload = `${parsed.timestamp}.${input.raw_body}`;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return parsed.signatures.some((signature) => {
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);

    return left.length === right.length && crypto.timingSafeEqual(left, right);
  });
}

/* ============================================================================
 * 5. EVENT PARSING
 * ========================================================================== */

export function parseStripeWebhookEvent(
  rawBody: string,
): StripeWebhookEvent | null {
  try {
    const parsed = JSON.parse(rawBody) as StripeWebhookEvent;

    if (!parsed || typeof parsed !== "object") return null;
    if (!safeString(parsed.id)) return null;
    if (!safeString(parsed.type)) return null;
    if (!parsed.data || typeof parsed.data !== "object") return null;
    if (!parsed.data.object || typeof parsed.data.object !== "object") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/* ============================================================================
 * 6. SUBSCRIPTION SYNC
 * ========================================================================== */

function syncStripeSubscription(
  object: Record<string, unknown>,
): StripeWebhookResult {
  const providerSubscriptionId = safeString(object.id);

  if (!providerSubscriptionId) {
    return {
      ok: false,
      event_type: "subscription",
      processed: false,
      warnings: ["stripe_subscription_missing_id"],
      error: "stripe_subscription_missing_id",
    };
  }

  const existing = findBillingSubscriptionByProviderId(providerSubscriptionId);

  if (!existing) {
    return {
      ok: true,
      event_type: "subscription",
      processed: false,
      warnings: ["stripe_subscription_not_found_locally"],
      error: null,
    };
  }

  const updated = updateBillingSubscription({
    id: existing.id,
    provider_subscription_id: providerSubscriptionId,
    status: mapSubscriptionStatus(object.status),
    current_period_start: unixToIso(object.current_period_start),
    current_period_end: unixToIso(object.current_period_end),
    trial_start: unixToIso(object.trial_start),
    trial_end: unixToIso(object.trial_end),
    cancel_at_period_end: safeBool(object.cancel_at_period_end),
    canceled_at: unixToIso(object.canceled_at),
    warnings: ["stripe_subscription_synced"],
  });

  return {
    ok: Boolean(updated),
    event_type: "subscription",
    processed: Boolean(updated),
    warnings: updated ? ["stripe_subscription_synced"] : ["stripe_subscription_sync_failed"],
    error: updated ? null : "stripe_subscription_sync_failed",
  };
}

/* ============================================================================
 * 7. INVOICE SYNC
 * ========================================================================== */

function syncStripeInvoice(
  object: Record<string, unknown>,
): StripeWebhookResult {
  const providerInvoiceId = safeString(object.id);
  const providerSubscriptionId = safeString(object.subscription);
  const customerId = safeString(object.customer);

  if (!providerInvoiceId || !customerId) {
    return {
      ok: false,
      event_type: "invoice",
      processed: false,
      warnings: ["stripe_invoice_invalid_payload"],
      error: "stripe_invoice_invalid_payload",
    };
  }

  const existing = findBillingInvoiceByProviderId(providerInvoiceId);

  if (existing) {
    const updated = updateBillingInvoice({
      id: existing.id,
      provider_invoice_id: providerInvoiceId,
      status: mapInvoiceStatus(object.status),
      amount_due_cents_eur: safeNumber(object.amount_due),
      amount_paid_cents_eur: safeNumber(object.amount_paid),
      hosted_invoice_url: safeString(object.hosted_invoice_url) || null,
      invoice_pdf_url: safeString(object.invoice_pdf) || null,
      due_at: unixToIso(object.due_date),
      paid_at: unixToIso(object.status_transitions_paid_at),
      warnings: ["stripe_invoice_synced"],
    });

    return {
      ok: Boolean(updated),
      event_type: "invoice",
      processed: Boolean(updated),
      warnings: updated ? ["stripe_invoice_synced"] : ["stripe_invoice_sync_failed"],
      error: updated ? null : "stripe_invoice_sync_failed",
    };
  }

  const subscription = providerSubscriptionId
    ? findBillingSubscriptionByProviderId(providerSubscriptionId)
    : null;

  if (!subscription) {
    return {
      ok: true,
      event_type: "invoice",
      processed: false,
      warnings: ["stripe_invoice_subscription_not_found_locally"],
      error: null,
    };
  }

  const created = createBillingInvoice({
    account_id: subscription.account_id,
    customer_id: subscription.customer_id,
    subscription_id: subscription.id,

    provider: "stripe",
    provider_invoice_id: providerInvoiceId,

    status: mapInvoiceStatus(object.status),

    amount_due_cents_eur: safeNumber(object.amount_due),
    amount_paid_cents_eur: safeNumber(object.amount_paid),

    hosted_invoice_url: safeString(object.hosted_invoice_url) || null,
    invoice_pdf_url: safeString(object.invoice_pdf) || null,

    due_at: unixToIso(object.due_date),
    paid_at: unixToIso(object.status_transitions_paid_at),

    warnings: ["stripe_invoice_created_from_webhook"],
  });

  return {
    ok: Boolean(created),
    event_type: "invoice",
    processed: Boolean(created),
    warnings: created ? ["stripe_invoice_created_from_webhook"] : ["stripe_invoice_create_failed"],
    error: created ? null : "stripe_invoice_create_failed",
  };
}

/* ============================================================================
 * 8. EVENT DISPATCH
 * ========================================================================== */

export function processStripeWebhookEvent(
  event: StripeWebhookEvent,
): StripeWebhookResult {
  const object = event.data.object;

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    return syncStripeSubscription(object);
  }

  if (
    event.type === "invoice.created" ||
    event.type === "invoice.updated" ||
    event.type === "invoice.paid" ||
    event.type === "invoice.payment_failed" ||
    event.type === "invoice.voided"
  ) {
    return syncStripeInvoice(object);
  }

  return {
    ok: true,
    event_type: event.type,
    processed: false,
    warnings: ["stripe_event_ignored"],
    error: null,
  };
}

export function handleStripeWebhook(input: {
  raw_body: string;
  signature_header: string | null;
}): StripeWebhookResult {
  const verified = verifyStripeWebhookSignature(input);

  if (!verified) {
    return {
      ok: false,
      event_type: null,
      processed: false,
      warnings: ["stripe_webhook_signature_invalid"],
      error: "stripe_webhook_signature_invalid",
    };
  }

  const event = parseStripeWebhookEvent(input.raw_body);

  if (!event) {
    return {
      ok: false,
      event_type: null,
      processed: false,
      warnings: ["stripe_webhook_event_invalid"],
      error: "stripe_webhook_event_invalid",
    };
  }

  return processStripeWebhookEvent(event);
}
