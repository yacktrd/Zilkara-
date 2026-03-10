// lib/xyvala/auth.ts

import { NextRequest, NextResponse } from "next/server";
import {
  findApiKeyRecord,
  mapRecordTypeToAuthType,
} from "@/lib/xyvala/api-keys";
import type { ApiPlan } from "@/lib/xyvala/usage";

export type ApiKeyType = "internal" | "public_demo" | "legacy";

export type ApiKeyAuthSuccess = {
  ok: true;
  key: string;
  keyType: ApiKeyType;
  keySource: "header" | "query";
  plan: ApiPlan;
  label: string;
};

export type ApiKeyAuthFailure = {
  ok: false;
  key: null;
  keyType: null;
  keySource: null;
  plan: null;
  label: null;
  error: "missing_api_key" | "invalid_api_key";
  status: 401;
};

export type ApiKeyAuthResult = ApiKeyAuthSuccess | ApiKeyAuthFailure;

const HEADER_NAME = "x-xyvala-key";
const ALT_HEADER_NAME = "x-api-key";

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function extractHeaderKey(req: NextRequest): string {
  return (
    safeStr(req.headers.get(HEADER_NAME)) ||
    safeStr(req.headers.get(ALT_HEADER_NAME))
  );
}

function extractQueryKey(req: NextRequest): string {
  return (
    safeStr(req.nextUrl.searchParams.get("api_key")) ||
    safeStr(req.nextUrl.searchParams.get("key"))
  );
}

function getProvidedKey(req: NextRequest): {
  key: string;
  source: "header" | "query" | null;
} {
  const headerKey = extractHeaderKey(req);

  if (headerKey) {
    return {
      key: headerKey,
      source: "header",
    };
  }

  const queryKey = extractQueryKey(req);

  if (queryKey) {
    return {
      key: queryKey,
      source: "query",
    };
  }

  return {
    key: "",
    source: null,
  };
}

export function validateApiKey(req: NextRequest): ApiKeyAuthResult {
  const provided = getProvidedKey(req);

  if (!provided.key || !provided.source) {
    return {
      ok: false,
      key: null,
      keyType: null,
      keySource: null,
      plan: null,
      label: null,
      error: "missing_api_key",
      status: 401,
    };
  }

  const record = findApiKeyRecord(provided.key);

  if (!record) {
    return {
      ok: false,
      key: null,
      keyType: null,
      keySource: null,
      plan: null,
      label: null,
      error: "invalid_api_key",
      status: 401,
    };
  }

  return {
    ok: true,
    key: provided.key,
    keyType: mapRecordTypeToAuthType(record.type),
    keySource: provided.source,
    plan: record.plan,
    label: record.label,
  };
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
        "x-xyvala-auth-error": error,
      },
    }
  );
}

export function applyApiAuthHeaders(
  response: NextResponse,
  auth: ApiKeyAuthSuccess
) {
  response.headers.set("cache-control", "no-store");
  response.headers.set("x-xyvala-auth", "ok");
  response.headers.set("x-xyvala-key-present", "true");
  response.headers.set("x-xyvala-key-type", auth.keyType);
  response.headers.set("x-xyvala-key-source", auth.keySource);
  response.headers.set("x-xyvala-plan", auth.plan);
  response.headers.set("x-xyvala-key-label", auth.label);

  return response;
}
