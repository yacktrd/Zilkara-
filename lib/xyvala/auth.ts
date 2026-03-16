// lib/xyvala/auth.ts

import { NextRequest, NextResponse } from "next/server";
import {
  findApiKeyRecord,
  mapRecordTypeToAuthType,
  type ApiKeyRecord,
  type ApiKeyType,
} from "@/lib/xyvala/api-keys";
import type { ApiPlan } from "@/lib/xyvala/usage";

export type ApiAccessPolicy = "public_or_key" | "key_required" | "internal_only";

export type ApiKeySource = "header" | "query" | "public";

export type ApiKeyAuthSuccess = {
  ok: true;
  key: string;
  keyType: ApiKeyType;
  plan: ApiPlan;
  label: string;
  keySource: ApiKeySource;
  record: ApiKeyRecord | null;
  policy: ApiAccessPolicy;
};

export type ApiKeyAuthFailure = {
  ok: false;
  key: null;
  keyType: null;
  plan: null;
  label: null;
  keySource: null;
  record: null;
  policy: ApiAccessPolicy;
  error: "missing_api_key" | "invalid_api_key" | "forbidden_api_key_type";
  status: 401 | 403;
};

export type ApiKeyAuthResult = ApiKeyAuthSuccess | ApiKeyAuthFailure;

const HEADER_NAME = "x-xyvala-key";
const QUERY_NAMES = ["api_key", "key", "x_key"] as const;

function normalizeKey(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function getHeaderKey(req: NextRequest): string {
  return normalizeKey(req.headers.get(HEADER_NAME));
}

function getQueryKey(req: NextRequest): string {
  for (const name of QUERY_NAMES) {
    const value = normalizeKey(req.nextUrl.searchParams.get(name));
    if (value) return value;
  }

  return "";
}

function getProvidedKey(req: NextRequest): {
  key: string;
  source: "header" | "query" | null;
} {
  const headerKey = getHeaderKey(req);
  if (headerKey) {
    return { key: headerKey, source: "header" };
  }

  const queryKey = getQueryKey(req);
  if (queryKey) {
    return { key: queryKey, source: "query" };
  }

  return { key: "", source: null };
}

function buildPublicDemoAuth(policy: ApiAccessPolicy): ApiKeyAuthSuccess {
  return {
    ok: true,
    key: "public_demo",
    keyType: "public_demo",
    plan: "demo",
    label: "Public Demo",
    keySource: "public",
    record: null,
    policy,
  };
}

function buildAuthFailure(
  policy: ApiAccessPolicy,
  error: ApiKeyAuthFailure["error"],
  status: ApiKeyAuthFailure["status"]
): ApiKeyAuthFailure {
  return {
    ok: false,
    key: null,
    keyType: null,
    plan: null,
    label: null,
    keySource: null,
    record: null,
    policy,
    error,
    status,
  };
}

function isAllowedKeyType(
  keyType: ApiKeyType,
  policy: ApiAccessPolicy
): boolean {
  if (policy === "public_or_key") {
    return keyType === "internal" || keyType === "client" || keyType === "legacy";
  }

  if (policy === "key_required") {
    return keyType === "internal" || keyType === "client" || keyType === "legacy";
  }

  if (policy === "internal_only") {
    return keyType === "internal";
  }

  return false;
}

export function validateApiKey(req: NextRequest): ApiKeyAuthResult {
  return validateApiKeyWithPolicy(req, "public_or_key");
}

export function validateApiKeyWithPolicy(
  req: NextRequest,
  policy: ApiAccessPolicy = "public_or_key"
): ApiKeyAuthResult {
  const provided = getProvidedKey(req);

  if (!provided.key || !provided.source) {
    if (policy === "public_or_key") {
      return buildPublicDemoAuth(policy);
    }

    return buildAuthFailure(policy, "missing_api_key", 401);
  }

  const record = findApiKeyRecord(provided.key);

  if (!record || !record.enabled) {
    return buildAuthFailure(policy, "invalid_api_key", 401);
  }

  const keyType = mapRecordTypeToAuthType(record.type);

  if (!isAllowedKeyType(keyType, policy)) {
    return buildAuthFailure(policy, "forbidden_api_key_type", 403);
  }

  return {
    ok: true,
    key: record.key,
    keyType,
    plan: record.plan,
    label: record.label,
    keySource: provided.source,
    record,
    policy,
  };
}

export function enforceApiPolicy(
  req: NextRequest,
  policy: ApiAccessPolicy = "public_or_key"
): ApiKeyAuthResult {
  return validateApiKeyWithPolicy(req, policy);
}

export function buildApiKeyErrorResponse(
  error: ApiKeyAuthFailure["error"],
  status: ApiKeyAuthFailure["status"]
) {
  return NextResponse.json(
    {
      ok: false,
      error,
    },
    {
      status,
      headers: {
        "cache-control": "no-store",
        "x-xyvala-auth": "failed",
      },
    }
  );
}

export function applyApiAuthHeaders(
  response: NextResponse,
  auth: ApiKeyAuthSuccess
): NextResponse {
  response.headers.set("cache-control", "no-store");
  response.headers.set("x-xyvala-auth", "ok");
  response.headers.set(
    "x-xyvala-key-present",
    auth.keyType === "public_demo" ? "false" : "true"
  );
  response.headers.set("x-xyvala-key-type", auth.keyType);
  response.headers.set("x-xyvala-plan", auth.plan);
  response.headers.set("x-xyvala-key-source", auth.keySource);
  response.headers.set("x-xyvala-auth-policy", auth.policy);

  return response;
}
