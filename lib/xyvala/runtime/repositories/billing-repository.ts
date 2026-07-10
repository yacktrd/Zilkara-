/* ============================================================================
 * FILE: lib/xyvala/runtime/repositories/billing-repository.ts
 * ========================================================================== */

import type {
  BillingCustomer,
  BillingInvoice,
  BillingSubscription,
} from "@/lib/xyvala/billing/billing-contract";

import { postgresQuery } from "@/lib/xyvala/runtime/postgres/postgres-adapter";

/* ============================================================================
 * 1. HELPERS
 * ========================================================================== */

function jsonArray(value: string[]): string {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

function parseWarnings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function rowToCustomer(row: Record<string, unknown>): BillingCustomer {
  return {
    id: String(row.id),
    account_id: String(row.account_id),

    provider: row.provider as BillingCustomer["provider"],
    provider_customer_id: row.provider_customer_id
      ? String(row.provider_customer_id)
      : null,

    email: String(row.email),
    name: row.name ? String(row.name) : null,

    currency: "EUR",
    jurisdiction: "FR/EU",

    created_at: String(row.created_at),
    updated_at: String(row.updated_at),

    warnings: parseWarnings(row.warnings),
  };
}

function rowToSubscription(row: Record<string, unknown>): BillingSubscription {
  return {
    id: String(row.id),
    account_id: String(row.account_id),
    customer_id: String(row.customer_id),

    provider: row.provider as BillingSubscription["provider"],
    provider_subscription_id: row.provider_subscription_id
      ? String(row.provider_subscription_id)
      : null,
    provider_price_id: row.provider_price_id
      ? String(row.provider_price_id)
      : null,

    plan: row.plan as BillingSubscription["plan"],
    account_plan: row.account_plan as BillingSubscription["account_plan"],
    access_compartment:
      row.access_compartment as BillingSubscription["access_compartment"],

    status: row.status as BillingSubscription["status"],
    interval: row.interval as BillingSubscription["interval"],
    currency: "EUR",

    current_period_start: row.current_period_start
      ? String(row.current_period_start)
      : null,
    current_period_end: row.current_period_end
      ? String(row.current_period_end)
      : null,

    trial_start: row.trial_start ? String(row.trial_start) : null,
    trial_end: row.trial_end ? String(row.trial_end) : null,

    cancel_at_period_end: row.cancel_at_period_end === true,
    canceled_at: row.canceled_at ? String(row.canceled_at) : null,

    created_at: String(row.created_at),
    updated_at: String(row.updated_at),

    warnings: parseWarnings(row.warnings),
  };
}

function rowToInvoice(row: Record<string, unknown>): BillingInvoice {
  return {
    id: String(row.id),
    account_id: String(row.account_id),
    customer_id: String(row.customer_id),
    subscription_id: row.subscription_id ? String(row.subscription_id) : null,

    provider: row.provider as BillingInvoice["provider"],
    provider_invoice_id: row.provider_invoice_id
      ? String(row.provider_invoice_id)
      : null,

    status: row.status as BillingInvoice["status"],

    currency: "EUR",
    amount_due_cents_eur: Number(row.amount_due_cents_eur ?? 0),
    amount_paid_cents_eur: Number(row.amount_paid_cents_eur ?? 0),

    hosted_invoice_url: row.hosted_invoice_url
      ? String(row.hosted_invoice_url)
      : null,
    invoice_pdf_url: row.invoice_pdf_url ? String(row.invoice_pdf_url) : null,

    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    due_at: row.due_at ? String(row.due_at) : null,
    paid_at: row.paid_at ? String(row.paid_at) : null,

    warnings: parseWarnings(row.warnings),
  };
}

/* ============================================================================
 * 2. CUSTOMER PERSISTENCE
 * ========================================================================== */

export async function persistBillingCustomer(
  customer: BillingCustomer,
): Promise<BillingCustomer | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    INSERT INTO xyvala_billing_customers (
      id,
      account_id,
      provider,
      provider_customer_id,
      email,
      name,
      currency,
      jurisdiction,
      created_at,
      updated_at,
      warnings
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      provider_customer_id = EXCLUDED.provider_customer_id,
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      currency = EXCLUDED.currency,
      jurisdiction = EXCLUDED.jurisdiction,
      updated_at = EXCLUDED.updated_at,
      warnings = EXCLUDED.warnings
    RETURNING *;
    `,
    [
      customer.id,
      customer.account_id,
      customer.provider,
      customer.provider_customer_id,
      customer.email,
      customer.name,
      customer.currency,
      customer.jurisdiction,
      customer.created_at,
      customer.updated_at,
      jsonArray(customer.warnings),
    ],
  );

  return result.ok && result.rows[0] ? rowToCustomer(result.rows[0]) : null;
}

export async function findBillingCustomerById(
  id: string,
): Promise<BillingCustomer | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_billing_customers
    WHERE id = $1
    LIMIT 1;
    `,
    [id],
  );

  return result.ok && result.rows[0] ? rowToCustomer(result.rows[0]) : null;
}

export async function findBillingCustomerByAccount(
  accountId: string,
): Promise<BillingCustomer | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_billing_customers
    WHERE account_id = $1
    ORDER BY updated_at DESC
    LIMIT 1;
    `,
    [accountId],
  );

  return result.ok && result.rows[0] ? rowToCustomer(result.rows[0]) : null;
}

export async function findBillingCustomerByProviderId(
  providerCustomerId: string,
): Promise<BillingCustomer | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_billing_customers
    WHERE provider_customer_id = $1
    LIMIT 1;
    `,
    [providerCustomerId],
  );

  return result.ok && result.rows[0] ? rowToCustomer(result.rows[0]) : null;
}

/* ============================================================================
 * 3. SUBSCRIPTION PERSISTENCE
 * ========================================================================== */

export async function persistBillingSubscriptionRecord(
  subscription: BillingSubscription,
): Promise<BillingSubscription | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    INSERT INTO xyvala_billing_subscriptions (
      id,
      account_id,
      customer_id,
      provider,
      provider_subscription_id,
      provider_price_id,
      plan,
      account_plan,
      access_compartment,
      status,
      interval,
      currency,
      current_period_start,
      current_period_end,
      trial_start,
      trial_end,
      cancel_at_period_end,
      canceled_at,
      created_at,
      updated_at,
      warnings
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15,
      $16, $17, $18, $19, $20,
      $21::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      provider_subscription_id = EXCLUDED.provider_subscription_id,
      provider_price_id = EXCLUDED.provider_price_id,
      plan = EXCLUDED.plan,
      account_plan = EXCLUDED.account_plan,
      access_compartment = EXCLUDED.access_compartment,
      status = EXCLUDED.status,
      interval = EXCLUDED.interval,
      currency = EXCLUDED.currency,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      trial_start = EXCLUDED.trial_start,
      trial_end = EXCLUDED.trial_end,
      cancel_at_period_end = EXCLUDED.cancel_at_period_end,
      canceled_at = EXCLUDED.canceled_at,
      updated_at = EXCLUDED.updated_at,
      warnings = EXCLUDED.warnings
    RETURNING *;
    `,
    [
      subscription.id,
      subscription.account_id,
      subscription.customer_id,
      subscription.provider,
      subscription.provider_subscription_id,
      subscription.provider_price_id,
      subscription.plan,
      subscription.account_plan,
      subscription.access_compartment,
      subscription.status,
      subscription.interval,
      subscription.currency,
      subscription.current_period_start,
      subscription.current_period_end,
      subscription.trial_start,
      subscription.trial_end,
      subscription.cancel_at_period_end,
      subscription.canceled_at,
      subscription.created_at,
      subscription.updated_at,
      jsonArray(subscription.warnings),
    ],
  );

  return result.ok && result.rows[0]
    ? rowToSubscription(result.rows[0])
    : null;
}

export async function findBillingSubscriptionRecordById(
  id: string,
): Promise<BillingSubscription | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_billing_subscriptions
    WHERE id = $1
    LIMIT 1;
    `,
    [id],
  );

  return result.ok && result.rows[0] ? rowToSubscription(result.rows[0]) : null;
}

export async function findBillingSubscriptionRecordByProviderId(
  providerSubscriptionId: string,
): Promise<BillingSubscription | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_billing_subscriptions
    WHERE provider_subscription_id = $1
    LIMIT 1;
    `,
    [providerSubscriptionId],
  );

  return result.ok && result.rows[0] ? rowToSubscription(result.rows[0]) : null;
}

export async function listBillingSubscriptionRecordsByAccount(
  accountId: string,
): Promise<BillingSubscription[]> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_billing_subscriptions
    WHERE account_id = $1
    ORDER BY updated_at DESC;
    `,
    [accountId],
  );

  return result.ok ? result.rows.map(rowToSubscription) : [];
}

/* ============================================================================
 * 4. INVOICE PERSISTENCE
 * ========================================================================== */

export async function persistBillingInvoiceRecord(
  invoice: BillingInvoice,
): Promise<BillingInvoice | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    INSERT INTO xyvala_billing_invoices (
      id,
      account_id,
      customer_id,
      subscription_id,
      provider,
      provider_invoice_id,
      status,
      currency,
      amount_due_cents_eur,
      amount_paid_cents_eur,
      hosted_invoice_url,
      invoice_pdf_url,
      created_at,
      updated_at,
      due_at,
      paid_at,
      warnings
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15,
      $16, $17::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      provider_invoice_id = EXCLUDED.provider_invoice_id,
      status = EXCLUDED.status,
      currency = EXCLUDED.currency,
      amount_due_cents_eur = EXCLUDED.amount_due_cents_eur,
      amount_paid_cents_eur = EXCLUDED.amount_paid_cents_eur,
      hosted_invoice_url = EXCLUDED.hosted_invoice_url,
      invoice_pdf_url = EXCLUDED.invoice_pdf_url,
      updated_at = EXCLUDED.updated_at,
      due_at = EXCLUDED.due_at,
      paid_at = EXCLUDED.paid_at,
      warnings = EXCLUDED.warnings
    RETURNING *;
    `,
    [
      invoice.id,
      invoice.account_id,
      invoice.customer_id,
      invoice.subscription_id,
      invoice.provider,
      invoice.provider_invoice_id,
      invoice.status,
      invoice.currency,
      invoice.amount_due_cents_eur,
      invoice.amount_paid_cents_eur,
      invoice.hosted_invoice_url,
      invoice.invoice_pdf_url,
      invoice.created_at,
      invoice.updated_at,
      invoice.due_at,
      invoice.paid_at,
      jsonArray(invoice.warnings),
    ],
  );

  return result.ok && result.rows[0] ? rowToInvoice(result.rows[0]) : null;
}

export async function findBillingInvoiceRecordById(
  id: string,
): Promise<BillingInvoice | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_billing_invoices
    WHERE id = $1
    LIMIT 1;
    `,
    [id],
  );

  return result.ok && result.rows[0] ? rowToInvoice(result.rows[0]) : null;
}

export async function findBillingInvoiceRecordByProviderId(
  providerInvoiceId: string,
): Promise<BillingInvoice | null> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_billing_invoices
    WHERE provider_invoice_id = $1
    LIMIT 1;
    `,
    [providerInvoiceId],
  );

  return result.ok && result.rows[0] ? rowToInvoice(result.rows[0]) : null;
}

export async function listBillingInvoiceRecordsByAccount(
  accountId: string,
): Promise<BillingInvoice[]> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_billing_invoices
    WHERE account_id = $1
    ORDER BY created_at DESC;
    `,
    [accountId],
  );

  return result.ok ? result.rows.map(rowToInvoice) : [];
}

export async function listBillingInvoiceRecordsBySubscription(
  subscriptionId: string,
): Promise<BillingInvoice[]> {
  const result = await postgresQuery<Record<string, unknown>>(
    `
    SELECT *
    FROM xyvala_billing_invoices
    WHERE subscription_id = $1
    ORDER BY created_at DESC;
    `,
    [subscriptionId],
  );

  return result.ok ? result.rows.map(rowToInvoice) : [];
}
