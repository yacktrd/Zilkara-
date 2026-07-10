/* ============================================================================
 * FILE: lib/xyvala/runtime/migrations/schema-definitions.ts
 * ========================================================================== */

import type {
  MigrationDefinition,
} from "@/lib/xyvala/runtime/migrations/migration-engine";

/* ============================================================================
 * 1. INITIAL SCHEMA
 * ========================================================================== */

export const XYVALA_INITIAL_SCHEMA_MIGRATION: MigrationDefinition = {
  id: "001_initial_xyvala_schema",
  name: "Initial Xyvala durable schema",
  sql: `
CREATE TABLE IF NOT EXISTS xyvala_accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  email_normalized TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  display_name TEXT,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  role TEXT NOT NULL,
  source TEXT NOT NULL,
  auth_provider TEXT NOT NULL,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  last_login_at TIMESTAMPTZ,
  terms_accepted_at TIMESTAMPTZ,
  privacy_accepted_at TIMESTAMPTZ,
  default_currency TEXT NOT NULL DEFAULT 'EUR',
  jurisdiction TEXT NOT NULL DEFAULT 'FR/EU',
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS xyvala_account_sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES xyvala_accounts(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  user_agent TEXT,
  ip_fingerprint TEXT,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS xyvala_organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_account_id TEXT NOT NULL REFERENCES xyvala_accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  default_currency TEXT NOT NULL DEFAULT 'EUR',
  jurisdiction TEXT NOT NULL DEFAULT 'FR/EU',
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS xyvala_organization_members (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES xyvala_organizations(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES xyvala_accounts(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (organization_id, account_id)
);

CREATE TABLE IF NOT EXISTS xyvala_api_keys (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES xyvala_accounts(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  plan TEXT NOT NULL,
  compartment TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS xyvala_billing_customers (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES xyvala_accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_customer_id TEXT,
  email TEXT NOT NULL,
  name TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  jurisdiction TEXT NOT NULL DEFAULT 'FR/EU',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS xyvala_billing_subscriptions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES xyvala_accounts(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES xyvala_billing_customers(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_subscription_id TEXT,
  provider_price_id TEXT,
  plan TEXT NOT NULL,
  account_plan TEXT NOT NULL,
  access_compartment TEXT NOT NULL,
  status TEXT NOT NULL,
  interval TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS xyvala_billing_invoices (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES xyvala_accounts(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES xyvala_billing_customers(id) ON DELETE CASCADE,
  subscription_id TEXT REFERENCES xyvala_billing_subscriptions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_invoice_id TEXT,
  status TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  amount_due_cents_eur INTEGER NOT NULL DEFAULT 0,
  amount_paid_cents_eur INTEGER NOT NULL DEFAULT 0,
  hosted_invoice_url TEXT,
  invoice_pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS xyvala_audit_logs (
  id TEXT PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL,
  domain TEXT NOT NULL,
  level TEXT NOT NULL,
  event TEXT NOT NULL,
  actor_id TEXT,
  account_id TEXT,
  request_id TEXT,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb
);
`,
};

/* ============================================================================
 * 2. INDEXES
 * ========================================================================== */

export const XYVALA_INDEX_SCHEMA_MIGRATION: MigrationDefinition = {
  id: "002_xyvala_schema_indexes",
  name: "Initial Xyvala durable schema indexes",
  sql: `
CREATE INDEX IF NOT EXISTS idx_xyvala_accounts_email_normalized
  ON xyvala_accounts(email_normalized);

CREATE INDEX IF NOT EXISTS idx_xyvala_sessions_account_id
  ON xyvala_account_sessions(account_id);

CREATE INDEX IF NOT EXISTS idx_xyvala_sessions_token_hash
  ON xyvala_account_sessions(session_token_hash);

CREATE INDEX IF NOT EXISTS idx_xyvala_organizations_owner
  ON xyvala_organizations(owner_account_id);

CREATE INDEX IF NOT EXISTS idx_xyvala_organization_members_org
  ON xyvala_organization_members(organization_id);

CREATE INDEX IF NOT EXISTS idx_xyvala_organization_members_account
  ON xyvala_organization_members(account_id);

CREATE INDEX IF NOT EXISTS idx_xyvala_api_keys_account
  ON xyvala_api_keys(account_id);

CREATE INDEX IF NOT EXISTS idx_xyvala_api_keys_hash
  ON xyvala_api_keys(key_hash);

CREATE INDEX IF NOT EXISTS idx_xyvala_billing_customers_account
  ON xyvala_billing_customers(account_id);

CREATE INDEX IF NOT EXISTS idx_xyvala_billing_subscriptions_account
  ON xyvala_billing_subscriptions(account_id);

CREATE INDEX IF NOT EXISTS idx_xyvala_billing_subscriptions_provider
  ON xyvala_billing_subscriptions(provider_subscription_id);

CREATE INDEX IF NOT EXISTS idx_xyvala_billing_invoices_account
  ON xyvala_billing_invoices(account_id);

CREATE INDEX IF NOT EXISTS idx_xyvala_billing_invoices_subscription
  ON xyvala_billing_invoices(subscription_id);

CREATE INDEX IF NOT EXISTS idx_xyvala_billing_invoices_provider
  ON xyvala_billing_invoices(provider_invoice_id);

CREATE INDEX IF NOT EXISTS idx_xyvala_audit_logs_ts
  ON xyvala_audit_logs(ts DESC);

CREATE INDEX IF NOT EXISTS idx_xyvala_audit_logs_domain
  ON xyvala_audit_logs(domain);

CREATE INDEX IF NOT EXISTS idx_xyvala_audit_logs_account
  ON xyvala_audit_logs(account_id);
`,
};

/* ============================================================================
 * 3. EXPORT
 * ========================================================================== */

export const XYVALA_SCHEMA_MIGRATIONS: MigrationDefinition[] = [
  XYVALA_INITIAL_SCHEMA_MIGRATION,
  XYVALA_INDEX_SCHEMA_MIGRATION,
];
