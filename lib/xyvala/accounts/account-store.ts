/* ============================================================================
 * FILE: lib/xyvala/accounts/account-store.ts
 * ========================================================================== */

import {
  accountRecordToPublicAccount,
  accountSessionToPublicSession,
  type AccountRecord,
  type AccountSession,
  type CreateAccountRecordInput,
  type CreateAccountSessionInput,
  type PublicAccount,
  type PublicAccountSession,
  type UpdateAccountRecordInput,
  type UpdateAccountSessionInput,
} from "@/lib/xyvala/accounts/account-contract";

/* ============================================================================
 * 1. GLOBAL STORE
 * ========================================================================== */

type AccountStoreState = {
  accounts: Map<string, AccountRecord>;
  accountsByEmail: Map<string, string>;
  sessions: Map<string, AccountSession>;
  sessionsByTokenHash: Map<string, string>;
};

declare global {
  // eslint-disable-next-line no-var
  var __XYVALA_ACCOUNT_STORE__: AccountStoreState | undefined;
}

function getStore(): AccountStoreState {
  if (!globalThis.__XYVALA_ACCOUNT_STORE__) {
    globalThis.__XYVALA_ACCOUNT_STORE__ = {
      accounts: new Map(),
      accountsByEmail: new Map(),
      sessions: new Map(),
      sessionsByTokenHash: new Map(),
    };
  }

  return globalThis.__XYVALA_ACCOUNT_STORE__;
}

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown): string {
  return safeString(value).toLowerCase();
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
  const normalized = safeString(seed)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return `${prefix}_${normalized || "record"}_${hash.toString(36)}`;
}

function cloneAccount(account: AccountRecord): AccountRecord {
  return {
    ...account,
    warnings: [...account.warnings],
  };
}

function cloneSession(session: AccountSession): AccountSession {
  return {
    ...session,
    warnings: [...session.warnings],
  };
}

/* ============================================================================
 * 3. ACCOUNT READERS
 * ========================================================================== */

export function findAccountById(id: string): AccountRecord | null {
  const account = getStore().accounts.get(safeString(id));
  return account ? cloneAccount(account) : null;
}

export function findAccountByEmail(email: string): AccountRecord | null {
  const normalizedEmail = normalizeEmail(email);
  const id = getStore().accountsByEmail.get(normalizedEmail);

  if (!id) return null;

  return findAccountById(id);
}

export function listAccounts(): AccountRecord[] {
  return [...getStore().accounts.values()].map(cloneAccount);
}

export function listPublicAccounts(): PublicAccount[] {
  return listAccounts().map(accountRecordToPublicAccount);
}

/* ============================================================================
 * 4. ACCOUNT WRITERS
 * ========================================================================== */

export function createAccountRecord(
  input: CreateAccountRecordInput,
): AccountRecord | null {
  const store = getStore();

  const email = safeString(input.email);
  const emailNormalized = normalizeEmail(email);

  if (!email || !emailNormalized || store.accountsByEmail.has(emailNormalized)) {
    return null;
  }

  const timestamp = nowIso();

  const account: AccountRecord = {
    id: buildId("acct", emailNormalized),

    email,
    email_normalized: emailNormalized,
    email_verified: false,

    display_name: safeString(input.display_name) || null,

    plan: input.plan,
    status: "active",
    role: input.role,
    source: input.source,

    auth_provider: input.auth_provider,
    password_hash: input.password_hash,

    created_at: timestamp,
    updated_at: timestamp,
    last_login_at: null,

    terms_accepted_at: input.terms_accepted_at,
    privacy_accepted_at: input.privacy_accepted_at,

    default_currency: "EUR",
    jurisdiction: "FR/EU",

    warnings: uniqueWarnings(input.warnings),
  };

  store.accounts.set(account.id, account);
  store.accountsByEmail.set(account.email_normalized, account.id);

  return cloneAccount(account);
}

export function updateAccountRecord(
  input: UpdateAccountRecordInput,
): AccountRecord | null {
  const store = getStore();
  const existing = store.accounts.get(safeString(input.id));

  if (!existing) return null;

  const updated: AccountRecord = {
    ...existing,

    email_verified: input.email_verified ?? existing.email_verified,
    display_name:
      input.display_name === undefined
        ? existing.display_name
        : input.display_name,

    plan: input.plan ?? existing.plan,
    status: input.status ?? existing.status,
    role: input.role ?? existing.role,

    password_hash:
      input.password_hash === undefined
        ? existing.password_hash
        : input.password_hash,

    last_login_at:
      input.last_login_at === undefined
        ? existing.last_login_at
        : input.last_login_at,

    updated_at: nowIso(),

    warnings: uniqueWarnings(existing.warnings, input.warnings),
  };

  store.accounts.set(updated.id, updated);

  return cloneAccount(updated);
}

/* ============================================================================
 * 5. SESSION READERS
 * ========================================================================== */

export function findSessionById(id: string): AccountSession | null {
  const session = getStore().sessions.get(safeString(id));
  return session ? cloneSession(session) : null;
}

export function findSessionByTokenHash(
  sessionTokenHash: string,
): AccountSession | null {
  const tokenHash = safeString(sessionTokenHash);
  const sessionId = getStore().sessionsByTokenHash.get(tokenHash);

  if (!sessionId) return null;

  return findSessionById(sessionId);
}

export function listSessions(): AccountSession[] {
  return [...getStore().sessions.values()].map(cloneSession);
}

export function listPublicSessions(): PublicAccountSession[] {
  return listSessions().map(accountSessionToPublicSession);
}

/* ============================================================================
 * 6. SESSION WRITERS
 * ========================================================================== */

export function createAccountSession(
  input: CreateAccountSessionInput,
): AccountSession | null {
  const store = getStore();

  const accountId = safeString(input.account_id);
  const sessionTokenHash = safeString(input.session_token_hash);

  if (!accountId || !sessionTokenHash || !store.accounts.has(accountId)) {
    return null;
  }

  const timestamp = nowIso();

  const session: AccountSession = {
    id: buildId("sess", `${accountId}:${sessionTokenHash}`),
    account_id: accountId,

    session_token_hash: sessionTokenHash,
    status: "active",

    created_at: timestamp,
    updated_at: timestamp,
    expires_at: input.expires_at,
    revoked_at: null,

    user_agent: safeString(input.user_agent) || null,
    ip_fingerprint: safeString(input.ip_fingerprint) || null,

    warnings: uniqueWarnings(input.warnings),
  };

  store.sessions.set(session.id, session);
  store.sessionsByTokenHash.set(session.session_token_hash, session.id);

  return cloneSession(session);
}

export function updateAccountSession(
  input: UpdateAccountSessionInput,
): AccountSession | null {
  const store = getStore();
  const existing = store.sessions.get(safeString(input.id));

  if (!existing) return null;

  const updated: AccountSession = {
    ...existing,
    status: input.status ?? existing.status,
    revoked_at:
      input.revoked_at === undefined ? existing.revoked_at : input.revoked_at,
    updated_at: nowIso(),
    warnings: uniqueWarnings(existing.warnings, input.warnings),
  };

  store.sessions.set(updated.id, updated);
  store.sessionsByTokenHash.set(updated.session_token_hash, updated.id);

  return cloneSession(updated);
}

export function revokeAccountSession(id: string): AccountSession | null {
  return updateAccountSession({
    id,
    status: "revoked",
    revoked_at: nowIso(),
    warnings: ["account_session_revoked"],
  });
}

/* ============================================================================
 * 7. PUBLIC HELPERS
 * ========================================================================== */

export function findPublicAccountById(id: string): PublicAccount | null {
  const account = findAccountById(id);
  return account ? accountRecordToPublicAccount(account) : null;
}

export function findPublicSessionById(id: string): PublicAccountSession | null {
  const session = findSessionById(id);
  return session ? accountSessionToPublicSession(session) : null;
}

export function findAccountFromSessionTokenHash(input: {
  session_token_hash: string;
}): {
  account: AccountRecord;
  session: AccountSession;
} | null {
  const session = findSessionByTokenHash(input.session_token_hash);

  if (!session || session.status !== "active") {
    return null;
  }

  const expiresAt = new Date(session.expires_at).getTime();

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    updateAccountSession({
      id: session.id,
      status: "expired",
      warnings: ["account_session_expired"],
    });

    return null;
  }

  const account = findAccountById(session.account_id);

  if (!account || account.status !== "active") {
    return null;
  }

  return {
    account,
    session,
  };
}

/* ============================================================================
 * 8. STORE GOVERNANCE
 * ========================================================================== */

export function getAccountStoreStats(): {
  accounts: number;
  sessions: number;
  active_sessions: number;
} {
  const sessions = listSessions();

  return {
    accounts: getStore().accounts.size,
    sessions: sessions.length,
    active_sessions: sessions.filter((session) => session.status === "active")
      .length,
  };
}

export function clearAccountStore(): void {
  const store = getStore();

  store.accounts.clear();
  store.accountsByEmail.clear();
  store.sessions.clear();
  store.sessionsByTokenHash.clear();
}
