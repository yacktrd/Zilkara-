/* ============================================================================
 * FILE: lib/xyvala/accounts/account-auth.ts
 * ========================================================================== */

import crypto from "node:crypto";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const PASSWORD_HASH_VERSION = "pbkdf2_sha256_v1";
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_BYTES = 32;
const PASSWORD_ITERATIONS = 210_000;

const SESSION_TOKEN_BYTES = 32;
const SESSION_DAYS = 30;

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function timingSafeEqualString(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

/* ============================================================================
 * 3. PASSWORD POLICY
 * ========================================================================== */

export function isValidAccountPassword(password: unknown): boolean {
  const value = typeof password === "string" ? password : "";

  return value.length >= 10 && value.length <= 256;
}

/* ============================================================================
 * 4. PASSWORD HASHING
 * ========================================================================== */

export function hashAccountPassword(password: string): string {
  if (!isValidAccountPassword(password)) {
    throw new Error("invalid_account_password");
  }

  const salt = crypto.randomBytes(PASSWORD_SALT_BYTES).toString("hex");

  const hash = crypto
    .pbkdf2Sync(
      password,
      salt,
      PASSWORD_ITERATIONS,
      PASSWORD_KEY_BYTES,
      "sha256",
    )
    .toString("hex");

  return [
    PASSWORD_HASH_VERSION,
    PASSWORD_ITERATIONS,
    salt,
    hash,
  ].join("$");
}

export function verifyAccountPassword(input: {
  password: string;
  password_hash: string | null;
}): boolean {
  const password = typeof input.password === "string" ? input.password : "";
  const passwordHash = safeString(input.password_hash);

  if (!isValidAccountPassword(password) || !passwordHash) {
    return false;
  }

  const parts = passwordHash.split("$");

if (parts.length !== 4) {
  return false;
}

const [version, iterationsRaw, salt, expectedHash] = parts;

if (!version || !iterationsRaw || !salt || !expectedHash) {
  return false;
}

if (version !== PASSWORD_HASH_VERSION) {
  return false;
}

  const iterations = Number(iterationsRaw);

  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false;
  }

  const computedHash = crypto
    .pbkdf2Sync(
      password,
      salt,
      iterations,
      PASSWORD_KEY_BYTES,
      "sha256",
    )
    .toString("hex");

  return timingSafeEqualString(computedHash, expectedHash);
}

/* ============================================================================
 * 5. SESSION TOKENS
 * ========================================================================== */

export function createAccountSessionToken(): string {
  return crypto.randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

export function hashAccountSessionToken(sessionToken: string): string {
  const token = safeString(sessionToken);

  if (!token) {
    throw new Error("invalid_account_session_token");
  }

  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export function buildAccountSessionExpiry(): string {
  const expiresAt = new Date();

  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  return expiresAt.toISOString();
}

/* ============================================================================
 * 6. SESSION EXTRACTION
 * ========================================================================== */

export function extractSessionTokenFromCookieHeader(
  cookieHeader: string | null,
): string | null {
  const raw = safeString(cookieHeader);

  if (!raw) return null;

  const parts = raw.split(";").map((item) => item.trim());

  for (const part of parts) {
    if (!part.startsWith("xyvala_session=")) continue;

    const token = part.slice("xyvala_session=".length).trim();

    return token || null;
  }

  return null;
}

export function buildSessionCookieHeader(sessionToken: string): string {
  const token = safeString(sessionToken);

  if (!token) {
    throw new Error("invalid_account_session_token");
  }

  return [
    `xyvala_session=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
  ].join("; ");
}

export function buildExpiredSessionCookieHeader(): string {
  return [
    "xyvala_session=",
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
  ].join("; ");
}

/* ============================================================================
 * 7. REQUEST FINGERPRINT HELPERS
 * ========================================================================== */

export function hashIpFingerprint(value: string | null): string | null {
  const source = safeString(value);

  if (!source) return null;

  return crypto
    .createHash("sha256")
    .update(source)
    .digest("hex");
}
