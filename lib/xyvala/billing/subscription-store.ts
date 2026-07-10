/* ============================================================================
 * FILE: lib/xyvala/billing/subscription-store.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala billing subscription persistence store
 *
 * ROLE
 * - persist billing subscriptions in a deterministic runtime store
 * - expose subscription lookup by id, account and provider subscription id
 * - prepare future Postgres/Supabase billing-grade persistence
 *
 * PARENTS
 * - lib/xyvala/billing/billing-contract.ts
 * - lib/xyvala/billing/billing-service.ts
 * - lib/xyvala/billing/stripe-service.ts
 *
 * DIRECTIVES
 * - subscription persistence only
 * - no Stripe SDK logic
 * - no billing provider mutation
 * - no route response building
 * - no UI logic
 * - no account mutation
 * - no quota mutation
 * - no API key mutation
 * - no RFS recomputation
 * - no MCI recomputation
 * - deterministic storage only
 *
 * INVARIANTS
 * - provider subscription id remains nullable
 * - one account may have multiple historical subscriptions
 * - active subscription lookup must stay explicit
 * - public projection never exposes provider price internals
 * ========================================================================== */

import {
  billingSubscriptionToPublicSubscription,
  type BillingSubscription,
  type BillingSubscriptionStatus,
  type PublicBillingSubscription,
  type UpdateBillingSubscriptionInput,
} from "@/lib/xyvala/billing/billing-contract";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type SubscriptionStoreState = {
  subscriptions: Map<string, BillingSubscription>;
  subscriptionsByAccount: Map<string, Set<string>>;
  subscriptionsByProviderId: Map<string, string>;
};

/* ============================================================================
 * 2. GLOBAL STORE
 * ========================================================================== */

declare global {
  // eslint-disable-next-line no-var
  var __XYVALA_SUBSCRIPTION_STORE__: SubscriptionStoreState | undefined;
}

function getStore(): SubscriptionStoreState {
  if (!globalThis.__XYVALA_SUBSCRIPTION_STORE__) {
    globalThis.__XYVALA_SUBSCRIPTION_STORE__ = {
      subscriptions: new Map(),
      subscriptionsByAccount: new Map(),
      subscriptionsByProviderId: new Map(),
    };
  }

  return globalThis.__XYVALA_SUBSCRIPTION_STORE__;
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

function cloneSubscription(
  subscription: BillingSubscription,
): BillingSubscription {
  return {
    ...subscription,
    warnings: [...subscription.warnings],
  };
}

function indexSubscription(subscription: BillingSubscription): void {
  const store = getStore();

  const accountSet =
    store.subscriptionsByAccount.get(subscription.account_id) ??
    new Set<string>();

  accountSet.add(subscription.id);
  store.subscriptionsByAccount.set(subscription.account_id, accountSet);

  if (subscription.provider_subscription_id) {
    store.subscriptionsByProviderId.set(
      subscription.provider_subscription_id,
      subscription.id,
    );
  }
}

function isActiveSubscriptionStatus(
  status: BillingSubscriptionStatus,
): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

/* ============================================================================
 * 4. WRITERS
 * ========================================================================== */

export function persistBillingSubscription(
  subscription: BillingSubscription,
): BillingSubscription {
  const store = getStore();

  const normalized: BillingSubscription = {
    ...subscription,
    warnings: uniqueWarnings(subscription.warnings),
  };

  store.subscriptions.set(normalized.id, normalized);
  indexSubscription(normalized);

  return cloneSubscription(normalized);
}

export function updateBillingSubscription(
  input: UpdateBillingSubscriptionInput,
): BillingSubscription | null {
  const store = getStore();
  const existing = store.subscriptions.get(safeString(input.id));

  if (!existing) return null;

  const updated: BillingSubscription = {
    ...existing,

    provider_subscription_id:
      input.provider_subscription_id === undefined
        ? existing.provider_subscription_id
        : input.provider_subscription_id,

    provider_price_id:
      input.provider_price_id === undefined
        ? existing.provider_price_id
        : input.provider_price_id,

    plan: input.plan ?? existing.plan,
    interval: input.interval ?? existing.interval,
    status: input.status ?? existing.status,

    current_period_start:
      input.current_period_start === undefined
        ? existing.current_period_start
        : input.current_period_start,

    current_period_end:
      input.current_period_end === undefined
        ? existing.current_period_end
        : input.current_period_end,

    trial_start:
      input.trial_start === undefined ? existing.trial_start : input.trial_start,

    trial_end:
      input.trial_end === undefined ? existing.trial_end : input.trial_end,

    cancel_at_period_end:
      input.cancel_at_period_end === undefined
        ? existing.cancel_at_period_end
        : input.cancel_at_period_end,

    canceled_at:
      input.canceled_at === undefined ? existing.canceled_at : input.canceled_at,

    updated_at: nowIso(),

    warnings: uniqueWarnings(existing.warnings, input.warnings),
  };

  store.subscriptions.set(updated.id, updated);
  indexSubscription(updated);

  return cloneSubscription(updated);
}

/* ============================================================================
 * 5. READERS
 * ========================================================================== */

export function findBillingSubscriptionById(
  id: string,
): BillingSubscription | null {
  const subscription = getStore().subscriptions.get(safeString(id));

  return subscription ? cloneSubscription(subscription) : null;
}

export function findBillingSubscriptionByProviderId(
  providerSubscriptionId: string,
): BillingSubscription | null {
  const id = getStore().subscriptionsByProviderId.get(
    safeString(providerSubscriptionId),
  );

  if (!id) return null;

  return findBillingSubscriptionById(id);
}

export function listBillingSubscriptions(): BillingSubscription[] {
  return [...getStore().subscriptions.values()].map(cloneSubscription);
}

export function listBillingSubscriptionsByAccount(
  accountId: string,
): BillingSubscription[] {
  const ids = getStore().subscriptionsByAccount.get(safeString(accountId));

  if (!ids) return [];

  return [...ids]
    .map((id) => findBillingSubscriptionById(id))
    .filter(
      (subscription): subscription is BillingSubscription =>
        subscription !== null,
    );
}

export function listPublicBillingSubscriptionsByAccount(
  accountId: string,
): PublicBillingSubscription[] {
  return listBillingSubscriptionsByAccount(accountId).map(
    billingSubscriptionToPublicSubscription,
  );
}

export function findActiveBillingSubscriptionByAccount(
  accountId: string,
): BillingSubscription | null {
  const subscriptions = listBillingSubscriptionsByAccount(accountId)
    .filter((subscription) =>
      isActiveSubscriptionStatus(subscription.status),
    )
    .sort(
      (left, right) =>
        new Date(right.updated_at).getTime() -
        new Date(left.updated_at).getTime(),
    );

  return subscriptions[0] ?? null;
}

/* ============================================================================
 * 6. GOVERNANCE
 * ========================================================================== */

export function cancelBillingSubscription(
  id: string,
): BillingSubscription | null {
  return updateBillingSubscription({
    id,
    status: "canceling",
    cancel_at_period_end: true,
    warnings: ["billing_subscription_cancel_requested"],
  });
}

export function markBillingSubscriptionCanceled(
  id: string,
): BillingSubscription | null {
  return updateBillingSubscription({
    id,
    status: "canceled",
    canceled_at: nowIso(),
    warnings: ["billing_subscription_canceled"],
  });
}

export function getSubscriptionStoreStats(): {
  total: number;
  active: number;
  trialing: number;
  past_due: number;
  canceled: number;
} {
  const subscriptions = listBillingSubscriptions();

  return {
    total: subscriptions.length,
    active: subscriptions.filter((item) => item.status === "active").length,
    trialing: subscriptions.filter((item) => item.status === "trialing").length,
    past_due: subscriptions.filter((item) => item.status === "past_due").length,
    canceled: subscriptions.filter((item) => item.status === "canceled").length,
  };
}

export function clearSubscriptionStore(): void {
  const store = getStore();

  store.subscriptions.clear();
  store.subscriptionsByAccount.clear();
  store.subscriptionsByProviderId.clear();
}
