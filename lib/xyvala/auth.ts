/* ============================================================================
 * FILE: lib/xyvala/auth.ts
 * ----------------------------------------------------------------------------
 * ROLE
 * - central authentication and API policy enforcement for Xyvala routes
 * - resolve canonical auth contract used by usage / quotas / routes
 * - guarantee that successful auth always returns key, keyType and plan
 *
 * PARENTS
 * - lib/xyvala/api-keys.ts
 * - lib/xyvala/usage.ts
 * - app/api/assets/route.ts
 * - app/api/decision/route.ts
 * - app/api/scan/route.ts
 *
 * DIRECTIVES
 * - keep auth deterministic
 * - no partial success contract
 * - success output must always include: key, keyType, plan
 * - no hidden fallback in routes
 * - plan propagation is mandatory
 * - keep EU / FR compatible governance behavior
 *
 * INPUTS
 * - NextRequest
 *
 * OUTPUTS
 * - ApiAuthResult
 * - auth headers application helpers
 * - auth error response builder
 *
 * INVARIANTS
 * - ok=true => key, keyType, plan always present
 * - ok=false => status and error always present
 * - no route should infer plan outside auth.ts
 *
 * CRITICAL DEPENDENCIES
 * - next/server
 * - @/lib/xyvala/api-keys
 * - @/lib/xyvala/usage
 *
 * SENSITIVE ZONES
 * - api key parsing
 * - keyType / plan resolution
 * - route-wide contract stability
 * ========================================================================== */

import { NextRequest, NextResponse } from "next/server";
import type { ApiPlan } from "@/lib/xyvala/usage";
import type { ApiKeyType } from "@/lib/xyvala/api-keys";

/* ============================================================================
 * 1. PUBLIC TYPES
 * ========================================================================== */

export type ApiAuthSuccess = {
  ok: true;
  key: string;
  keyType: ApiKeyType;
  plan: ApiPlan;
};

export type ApiAuthFailure = {
  ok: false;
  status: number;
  error: string;
};

export type ApiAuthResult = ApiAuthSuccess | ApiAuthFailure;

/* ============================================================================
 * 2. INTERNAL CONSTANTS
 * ========================================================================== */

const API_KEY_HEADER_NAMES = [
  "x-api-key",
  "authorization",
] as const;

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeString(value: unknown, fallback = ""): string {
  return isNonEmptyString(value) ? value.trim() : fallback;
}

function isValidApiKeyType(value: unknown): value is ApiKeyType {
  return (
    value === "public_demo" ||
    value === "client" ||
    value === "legacy"
  );
}

function isValidApiPlan(value: unknown): value is ApiPlan {
  return (
    value === "internal" ||
    value === "demo" ||
    value === "trader" ||
    value === "pro" ||
    value === "enterprise"
  );
}

function extractRawApiKey(req: NextRequest): string | null {
  for (const headerName of API_KEY_HEADER_NAMES) {
    const raw = req.headers.get(headerName);

    if (!raw) continue;

    if (headerName === "authorization") {
      const normalized = raw.trim();

      if (normalized.toLowerCase().startsWith("bearer ")) {
        const token = normalized.slice(7).trim();
        if (token.length > 0) return token;
      }

      continue;
    }

    const value = raw.trim();
    if (value.length > 0) return value;
  }

  return null;
}

function isLikelyValidApiKey(key: string): boolean {
  return key.length >= 8;
}

/* ============================================================================
 * 4. KEY TYPE / PLAN RESOLUTION
 * ----------------------------------------------------------------------------
 * IMPORTANT
 * - keyType = nature of the key
 * - plan = access level
 * - they must NEVER be mixed
 * ========================================================================== */

function resolveKeyType(key: string): ApiKeyType {
  const normalized = key.toLowerCase();

  if (normalized.startsWith("pub_")) return "public_demo";
  if (normalized.startsWith("cli_")) return "client";
  return "legacy";
}

function resolvePlanFromKey(key: string): ApiPlan {
  const normalized = key.toLowerCase();

  if (normalized.startsWith("xv_int_")) return "internal";
  if (normalized.startsWith("xv_demo_")) return "demo";
  if (normalized.startsWith("xv_trader_")) return "trader";
  if (normalized.startsWith("xv_pro_")) return "pro";
  if (normalized.startsWith("xv_ent_")) return "enterprise";

  return "demo";
}

function assertResolvedContract(input: {
  key: string;
  keyType: ApiKeyType;
  plan: ApiPlan;
}): ApiAuthSuccess | ApiAuthFailure {
  if (!isNonEmptyString(input.key)) {
    return {
      ok: false,
      status: 401,
      error: "invalid_api_key",
    };
  }

  if (!isValidApiKeyType(input.keyType)) {
    return {
      ok: false,
      status: 500,
      error: "invalid_key_type_resolution",
    };
  }

  if (!isValidApiPlan(input.plan)) {
    return {
      ok: false,
      status: 500,
      error: "invalid_plan_resolution",
    };
  }

  return {
    ok: true,
    key: input.key,
    keyType: input.keyType,
    plan: input.plan,
  };
}

/* ============================================================================
 * 5. MAIN POLICY ENFORCEMENT
 * ========================================================================== */

export function enforceApiPolicy(req: NextRequest): ApiAuthResult {
  const rawKey = extractRawApiKey(req);

  if (!rawKey) {
    return {
      ok: false,
      status: 401,
      error: "missing_api_key",
    };
  }

  const key = normalizeString(rawKey);

  if (!isLikelyValidApiKey(key)) {
    return {
      ok: false,
      status: 401,
      error: "invalid_api_key",
    };
  }

  const keyType = resolveKeyType(key);
  const plan = resolvePlanFromKey(key);

  return assertResolvedContract({
    key,
    keyType,
    plan,
  });
}

/* ============================================================================
 * 6. RESPONSE HELPERS
 * ========================================================================== */

export function applyApiAuthHeaders<T>(
  res: NextResponse<T>,
  auth: ApiAuthSuccess,
): NextResponse<T> {
  res.headers.set("x-xyvala-key-type", auth.keyType);
  res.headers.set("x-xyvala-plan", auth.plan);
  return res;
}

export function buildApiKeyErrorResponse(
  error: string,
  status: number,
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error,
    },
    {
      status,
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

/* ============================================================================
 * 7. OPTIONAL INTERNAL EXPORTS
 * ========================================================================== */

export const __authInternals = {
  extractRawApiKey,
  resolveKeyType,
  resolvePlanFromKey,
  isLikelyValidApiKey,
};
