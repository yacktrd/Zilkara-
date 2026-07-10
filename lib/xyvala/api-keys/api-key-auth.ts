/* ============================================================================
 * FILE: lib/xyvala/api-keys/api-key-auth.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala API key authentication helpers
 *
 * ROLE
 * - generate raw API keys
 * - hash API keys before persistence
 * - verify provided API keys against stored hashes
 * - expose safe public prefixes only
 *
 * PARENTS
 * - lib/xyvala/api-keys/api-key-contract.ts
 * - lib/xyvala/api-keys/api-key-store.ts
 * - lib/xyvala/auth.ts
 *
 * DIRECTIVES
 * - security helpers only
 * - no persistence
 * - no route response building
 * - no UI dependency
 * - no billing logic
 * - no usage tracking
 * - no account mutation
 * - never store raw API keys
 * - never expose key_hash publicly
 * - deterministic verification
 *
 * INVARIANTS
 * - raw key is returned only at creation time
 * - key_hash is the persistence value
 * - key_prefix is public-safe
 * - verification uses timing-safe comparison
 * ========================================================================== */

import crypto from "node:crypto";

/* ============================================================================
 * 1. CONFIG
 * ========================================================================== */

const API_KEY_PREFIX = "xv";
const API_KEY_BYTES = 32;
const API_KEY_PREFIX_VISIBLE_CHARS = 12;
const API_KEY_HASH_VERSION = "sha256_v1";

/* ============================================================================
 * 2. SAFE HELPERS
 * ========================================================================== */

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function timingSafeEqualString(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

/* ============================================================================
 * 3. API KEY GENERATION
 * ========================================================================== */

export function createRawApiKey(input?: {
  kind?: "user" | "service" | "internal" | "legacy";
}): string {
  const kind = input?.kind ?? "user";
  const token = crypto.randomBytes(API_KEY_BYTES).toString("base64url");

  return `${API_KEY_PREFIX}_${kind}_${token}`;
}

export function extractApiKeyPrefix(rawKey: string): string {
  const key = safeString(rawKey);

  if (!key) return "";

  return key.slice(0, API_KEY_PREFIX_VISIBLE_CHARS);
}

/* ============================================================================
 * 4. API KEY HASHING
 * ========================================================================== */

export function hashApiKey(rawKey: string): string {
  const key = safeString(rawKey);

  if (!key) {
    throw new Error("invalid_api_key");
  }

  const digest = crypto
    .createHash("sha256")
    .update(key)
    .digest("hex");

  return `${API_KEY_HASH_VERSION}$${digest}`;
}

export function verifyApiKey(input: {
  raw_key: string;
  key_hash: string;
}): boolean {
  const rawKey = safeString(input.raw_key);
  const storedHash = safeString(input.key_hash);

  if (!rawKey || !storedHash) return false;

  const computedHash = hashApiKey(rawKey);

  return timingSafeEqualString(computedHash, storedHash);
}

/* ============================================================================
 * 5. API KEY VALIDATION
 * ========================================================================== */

export function isLikelyXyvalaApiKey(value: unknown): value is string {
  const key = safeString(value);

  return (
    key.startsWith(`${API_KEY_PREFIX}_`) &&
    key.length >= API_KEY_PREFIX_VISIBLE_CHARS + 16
  );
}
