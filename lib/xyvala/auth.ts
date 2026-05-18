/* ============================================================================
 * FILE: lib/xyvala/auth.ts
 * ========================================================================== */

import { NextRequest, NextResponse } from "next/server";

import {
  findApiKeyRecord,
  mapRecordTypeToAuthType,
  type ApiKeyType,
} from "@/lib/xyvala/api-keys";

import type { ApiPlan } from "@/lib/xyvala/usage";

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

const API_KEY_HEADER_NAMES = ["x-api-key", "authorization"] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeString(value: unknown): string {
  return isNonEmptyString(value) ? value.trim() : "";
}

function isValidApiKeyType(value: unknown): value is ApiKeyType {
  return (
    value === "internal" ||
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

      if (!normalized.toLowerCase().startsWith("bearer ")) {
        continue;
      }

      const token = normalized.slice(7).trim();
      return token.length > 0 ? token : null;
    }

    const value = raw.trim();
    if (value.length > 0) return value;
  }

  return null;
}

function isLikelyValidApiKey(key: string): boolean {
  return key.length >= 8 && !key.includes(" ");
}

function assertResolvedContract(input: {
  key: string;
  keyType: ApiKeyType;
  plan: ApiPlan;
}): ApiAuthResult {
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

  const record = findApiKeyRecord(key);

  if (!record) {
    return {
      ok: false,
      status: 401,
      error: "unknown_api_key",
    };
  }

  return assertResolvedContract({
    key: record.key,
    keyType: mapRecordTypeToAuthType(record.type),
    plan: record.plan,
  });
}

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

export const __authInternals = {
  extractRawApiKey,
  isLikelyValidApiKey,
};
