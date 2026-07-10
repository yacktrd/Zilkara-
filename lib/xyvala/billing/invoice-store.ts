/* ============================================================================
 * FILE: lib/xyvala/billing/invoice-store.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala billing invoice persistence store
 *
 * ROLE
 * - persist billing invoices in a deterministic runtime store
 * - expose invoice lookup by id, account, subscription and provider invoice id
 * - prepare future Postgres/Supabase accounting-grade persistence
 *
 * PARENTS
 * - lib/xyvala/billing/billing-contract.ts
 * - lib/xyvala/billing/billing-service.ts
 * - lib/xyvala/billing/stripe-service.ts
 * - lib/xyvala/billing/subscription-store.ts
 *
 * DIRECTIVES
 * - invoice persistence only
 * - no Stripe SDK logic
 * - no billing provider mutation
 * - no route response building
 * - no UI logic
 * - no account mutation
 * - no subscription mutation
 * - no quota mutation
 * - no API key mutation
 * - no RFS recomputation
 * - no MCI recomputation
 * - deterministic storage only
 * - EUR remains default financial reference
 * - FR / EU compatible billing governance
 *
 * INVARIANTS
 * - provider invoice id remains nullable
 * - one account may have multiple historical invoices
 * - one subscription may have multiple historical invoices
 * - public projection never exposes provider internals beyond public URLs
 * - invoice amounts are clamped to non-negative EUR cents
 * ========================================================================== */

import {
  billingInvoiceToPublicInvoice,
  type BillingInvoice,
  type BillingInvoiceStatus,
  type CreateBillingInvoiceInput,
  type PublicBillingInvoice,
} from "@/lib/xyvala/billing/billing-contract";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type InvoiceStoreState = {
  invoices: Map<string, BillingInvoice>;
  invoicesByAccount: Map<string, Set<string>>;
  invoicesBySubscription: Map<string, Set<string>>;
  invoicesByProviderId: Map<string, string>;
};

export type UpdateBillingInvoiceInput = {
  id: string;

  provider_invoice_id?: string | null;
  status?: BillingInvoiceStatus;

  amount_due_cents_eur?: number;
  amount_paid_cents_eur?: number;

  hosted_invoice_url?: string | null;
  invoice_pdf_url?: string | null;

  due_at?: string | null;
  paid_at?: string | null;

  warnings?: string[];
};

/* ============================================================================
 * 2. GLOBAL STORE
 * ========================================================================== */

declare global {
  // eslint-disable-next-line no-var
  var __XYVALA_INVOICE_STORE__: InvoiceStoreState | undefined;
}

function getStore(): InvoiceStoreState {
  if (!globalThis.__XYVALA_INVOICE_STORE__) {
    globalThis.__XYVALA_INVOICE_STORE__ = {
      invoices: new Map(),
      invoicesByAccount: new Map(),
      invoicesBySubscription: new Map(),
      invoicesByProviderId: new Map(),
    };
  }

  return globalThis.__XYVALA_INVOICE_STORE__;
}

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clampCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
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

function buildId(prefix: string, seed: string): string {
  const source = safeString(seed) || "record";

  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  return `${prefix}_${hash.toString(36)}`;
}

function cloneInvoice(invoice: BillingInvoice): BillingInvoice {
  return {
    ...invoice,
    warnings: [...invoice.warnings],
  };
}

function indexInvoice(invoice: BillingInvoice): void {
  const store = getStore();

  const accountSet =
    store.invoicesByAccount.get(invoice.account_id) ?? new Set<string>();

  accountSet.add(invoice.id);
  store.invoicesByAccount.set(invoice.account_id, accountSet);

  if (invoice.subscription_id) {
    const subscriptionSet =
      store.invoicesBySubscription.get(invoice.subscription_id) ??
      new Set<string>();

    subscriptionSet.add(invoice.id);
    store.invoicesBySubscription.set(invoice.subscription_id, subscriptionSet);
  }

  if (invoice.provider_invoice_id) {
    store.invoicesByProviderId.set(invoice.provider_invoice_id, invoice.id);
  }
}

/* ============================================================================
 * 4. WRITERS
 * ========================================================================== */

export function createBillingInvoice(
  input: CreateBillingInvoiceInput,
): BillingInvoice | null {
  const accountId = safeString(input.account_id);
  const customerId = safeString(input.customer_id);

  if (!accountId || !customerId) return null;

  const timestamp = nowIso();
  const providerInvoiceId = input.provider_invoice_id ?? null;

  const invoice: BillingInvoice = {
    id: buildId(
      "bi",
      [
        accountId,
        customerId,
        input.subscription_id ?? "no-subscription",
        providerInvoiceId ?? timestamp,
      ].join(":"),
    ),

    account_id: accountId,
    customer_id: customerId,
    subscription_id: input.subscription_id,

    provider: input.provider,
    provider_invoice_id: providerInvoiceId,

    status: input.status,

    currency: "EUR",
    amount_due_cents_eur: clampCents(input.amount_due_cents_eur),
    amount_paid_cents_eur: clampCents(input.amount_paid_cents_eur),

    hosted_invoice_url: input.hosted_invoice_url ?? null,
    invoice_pdf_url: input.invoice_pdf_url ?? null,

    created_at: timestamp,
    updated_at: timestamp,
    due_at: input.due_at ?? null,
    paid_at: input.paid_at ?? null,

    warnings: uniqueWarnings(input.warnings),
  };

  const store = getStore();

  store.invoices.set(invoice.id, invoice);
  indexInvoice(invoice);

  return cloneInvoice(invoice);
}

export function persistBillingInvoice(invoice: BillingInvoice): BillingInvoice {
  const normalized: BillingInvoice = {
    ...invoice,
    amount_due_cents_eur: clampCents(invoice.amount_due_cents_eur),
    amount_paid_cents_eur: clampCents(invoice.amount_paid_cents_eur),
    warnings: uniqueWarnings(invoice.warnings),
  };

  const store = getStore();

  store.invoices.set(normalized.id, normalized);
  indexInvoice(normalized);

  return cloneInvoice(normalized);
}

export function updateBillingInvoice(
  input: UpdateBillingInvoiceInput,
): BillingInvoice | null {
  const store = getStore();
  const existing = store.invoices.get(safeString(input.id));

  if (!existing) return null;

  const updated: BillingInvoice = {
    ...existing,

    provider_invoice_id:
      input.provider_invoice_id === undefined
        ? existing.provider_invoice_id
        : input.provider_invoice_id,

    status: input.status ?? existing.status,

    amount_due_cents_eur:
      input.amount_due_cents_eur === undefined
        ? existing.amount_due_cents_eur
        : clampCents(input.amount_due_cents_eur),

    amount_paid_cents_eur:
      input.amount_paid_cents_eur === undefined
        ? existing.amount_paid_cents_eur
        : clampCents(input.amount_paid_cents_eur),

    hosted_invoice_url:
      input.hosted_invoice_url === undefined
        ? existing.hosted_invoice_url
        : input.hosted_invoice_url,

    invoice_pdf_url:
      input.invoice_pdf_url === undefined
        ? existing.invoice_pdf_url
        : input.invoice_pdf_url,

    due_at: input.due_at === undefined ? existing.due_at : input.due_at,
    paid_at: input.paid_at === undefined ? existing.paid_at : input.paid_at,

    updated_at: nowIso(),

    warnings: uniqueWarnings(existing.warnings, input.warnings),
  };

  store.invoices.set(updated.id, updated);
  indexInvoice(updated);

  return cloneInvoice(updated);
}

/* ============================================================================
 * 5. READERS
 * ========================================================================== */

export function findBillingInvoiceById(id: string): BillingInvoice | null {
  const invoice = getStore().invoices.get(safeString(id));

  return invoice ? cloneInvoice(invoice) : null;
}

export function findBillingInvoiceByProviderId(
  providerInvoiceId: string,
): BillingInvoice | null {
  const id = getStore().invoicesByProviderId.get(safeString(providerInvoiceId));

  if (!id) return null;

  return findBillingInvoiceById(id);
}

export function listBillingInvoices(): BillingInvoice[] {
  return [...getStore().invoices.values()].map(cloneInvoice);
}

export function listBillingInvoicesByAccount(
  accountId: string,
): BillingInvoice[] {
  const ids = getStore().invoicesByAccount.get(safeString(accountId));

  if (!ids) return [];

  return [...ids]
    .map((id) => findBillingInvoiceById(id))
    .filter((invoice): invoice is BillingInvoice => invoice !== null);
}

export function listBillingInvoicesBySubscription(
  subscriptionId: string,
): BillingInvoice[] {
  const ids = getStore().invoicesBySubscription.get(safeString(subscriptionId));

  if (!ids) return [];

  return [...ids]
    .map((id) => findBillingInvoiceById(id))
    .filter((invoice): invoice is BillingInvoice => invoice !== null);
}

export function listPublicBillingInvoicesByAccount(
  accountId: string,
): PublicBillingInvoice[] {
  return listBillingInvoicesByAccount(accountId).map(
    billingInvoiceToPublicInvoice,
  );
}

export function listPublicBillingInvoicesBySubscription(
  subscriptionId: string,
): PublicBillingInvoice[] {
  return listBillingInvoicesBySubscription(subscriptionId).map(
    billingInvoiceToPublicInvoice,
  );
}

/* ============================================================================
 * 6. GOVERNANCE
 * ========================================================================== */

export function markBillingInvoicePaid(
  id: string,
): BillingInvoice | null {
  const existing = findBillingInvoiceById(id);

  if (!existing) return null;

  return updateBillingInvoice({
    id,
    status: "paid",
    amount_paid_cents_eur: existing.amount_due_cents_eur,
    paid_at: nowIso(),
    warnings: ["billing_invoice_paid"],
  });
}

export function markBillingInvoiceOpen(
  id: string,
): BillingInvoice | null {
  return updateBillingInvoice({
    id,
    status: "open",
    warnings: ["billing_invoice_open"],
  });
}

export function markBillingInvoiceVoid(
  id: string,
): BillingInvoice | null {
  return updateBillingInvoice({
    id,
    status: "void",
    warnings: ["billing_invoice_void"],
  });
}

export function getInvoiceStoreStats(): {
  total: number;
  open: number;
  paid: number;
  void: number;
  uncollectible: number;
} {
  const invoices = listBillingInvoices();

  return {
    total: invoices.length,
    open: invoices.filter((item) => item.status === "open").length,
    paid: invoices.filter((item) => item.status === "paid").length,
    void: invoices.filter((item) => item.status === "void").length,
    uncollectible: invoices.filter((item) => item.status === "uncollectible")
      .length,
  };
}

export function clearInvoiceStore(): void {
  const store = getStore();

  store.invoices.clear();
  store.invoicesByAccount.clear();
  store.invoicesBySubscription.clear();
  store.invoicesByProviderId.clear();
}
