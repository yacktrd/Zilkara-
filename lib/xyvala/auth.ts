// lib/xyvala/auth.ts

import { NextRequest, NextResponse } from "next/server";
import {
  findApiKeyRecord,
  mapRecordTypeToAuthType,
  type ApiKeyRecord,
} from "@/lib/xyvala/api-keys";
import type { ApiPlan } from "@/lib/xyvala/usage";

export type ApiKeyType = "internal" | "public_demo" | "legacy";

export type ApiKeyAuthSuccess = {
  ok: true;
  key: string;
  keyType: ApiKeyType;
  plan: ApiPlan;
  label: string;
  keySource: "header" | "query";
  record: ApiKeyRecord;
};

export type ApiKeyAuthFailure = {
  ok: false;
  key: null;
  keyType: null;
  plan: null;
  label: null;
  keySource: null;
  record: null;
  error: "missing_api_key" | "invalid_api_key";
  status: 401;
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

export function validateApiKey(req: NextRequest): ApiKeyAuthResult {
  const provided = getProvidedKey(req);

  if (!provided.key || !provided.source) {
    return {
      ok: false,
      key: null,
      keyType: null,
      plan: null,
      label: null,
      keySource: null,
      record: null,
      error: "missing_api_key",
      status: 401,
    };
  }

  const record = findApiKeyRecord(provided.key);

  if (!record || !record.enabled) {
    return {
      ok: false,
      key: null,
      keyType: null,
      plan: null,
      label: null,
      keySource: null,
      record: null,
      error: "invalid_api_key",
      status: 401,
    };
  }

  return {
    ok: true,
    key: record.key,
    keyType: mapRecordTypeToAuthType(record.type),
    plan: record.plan,
    label: record.label,
    keySource: provided.source,
    record,
  };
}

/**
 * Alias officiel possible pour garder la compatibilité
 * avec les routes déjà migrées sur enforceApiPolicy().
 */
export function enforceApiPolicy(req: NextRequest): ApiKeyAuthResult {
  return validateApiKey(req);
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
  response.headers.set("x-xyvala-key-present", "true");
  response.headers.set("x-xyvala-key-type", auth.keyType);
  response.headers.set("x-xyvala-plan", auth.plan);
  response.headers.set("x-xyvala-key-source", auth.keySource);

  return response;
}
