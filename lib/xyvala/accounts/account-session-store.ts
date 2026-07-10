/* ============================================================================
 * FILE: lib/xyvala/accounts/account-session-store.ts
 * ========================================================================== */

import {
  accountSessionToPublicSession,
  type AccountSession,
  type CreateAccountSessionInput,
  type PublicAccountSession,
  type UpdateAccountSessionInput,
} from "@/lib/xyvala/accounts/account-contract";

import {
  createAccountSession,
  findSessionById,
  findSessionByTokenHash,
  listSessions,
  revokeAccountSession,
  updateAccountSession,
} from "@/lib/xyvala/accounts/account-store";

/* ============================================================================
 * 1. SESSION READERS
 * ========================================================================== */

export function getAccountSessionById(id: string): AccountSession | null {
  return findSessionById(id);
}

export function getAccountSessionByTokenHash(
  sessionTokenHash: string,
): AccountSession | null {
  return findSessionByTokenHash(sessionTokenHash);
}

export function listAccountSessions(): AccountSession[] {
  return listSessions();
}

export function listPublicAccountSessions(): PublicAccountSession[] {
  return listSessions().map(accountSessionToPublicSession);
}

/* ============================================================================
 * 2. SESSION WRITERS
 * ========================================================================== */

export function createManagedAccountSession(
  input: CreateAccountSessionInput,
): AccountSession | null {
  return createAccountSession(input);
}

export function updateManagedAccountSession(
  input: UpdateAccountSessionInput,
): AccountSession | null {
  return updateAccountSession(input);
}

export function revokeManagedAccountSession(id: string): AccountSession | null {
  return revokeAccountSession(id);
}

/* ============================================================================
 * 3. SESSION VALIDATION
 * ========================================================================== */

export function isAccountSessionActive(session: AccountSession | null): boolean {
  if (!session || session.status !== "active") return false;

  const expiresAt = new Date(session.expires_at).getTime();

  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export function expireAccountSessionIfNeeded(
  session: AccountSession | null,
): AccountSession | null {
  if (!session) return null;

  if (isAccountSessionActive(session)) {
    return session;
  }

  if (session.status !== "active") {
    return session;
  }

  return updateAccountSession({
    id: session.id,
    status: "expired",
    warnings: ["account_session_expired"],
  });
}

/* ============================================================================
 * 4. SESSION GOVERNANCE
 * ========================================================================== */

export function revokeAllAccountSessions(accountId: string): AccountSession[] {
  const sessions = listSessions().filter(
    (session) => session.account_id === accountId && session.status === "active",
  );

  return sessions
    .map((session) => revokeAccountSession(session.id))
    .filter((session): session is AccountSession => session !== null);
}
