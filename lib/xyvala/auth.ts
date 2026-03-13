// lib/xyvala/auth.ts

import { NextRequest, NextResponse } from "next/server";

export type ApiKeyType = "internal" | "public_demo" | "legacy";
export type ApiPlan = "internal" | "demo" | "trader" | "pro" | "enterprise";

export type ApiKeyAuthSuccess = {
  ok: true;
  key: string;
  keyType: ApiKeyType;
  plan: ApiPlan;
  isInternal: boolean;
};

export type ApiKeyAuthFailure = {
  ok: false;
  key: null;
  keyType: null;
  plan: null;
  isInternal: false;
  error: "missing_api_key" | "invalid_api_key";
  status: 401;
};

export type ApiKeyAuthResult = ApiKeyAuthSuccess | ApiKeyAuthFailure;

const HEADER_NAME = "x-xyvala-key";

type KeyDescriptor = {
  value: string;
  type: ApiKeyType;
  plan: ApiPlan;
};

function normalizeKey(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function getProvidedKey(req: NextRequest): string {
  return normalizeKey(req.headers.get(HEADER_NAME));
}

function dedupeKeys(candidates: Array<KeyDescriptor | null>): KeyDescriptor[] {
  const seen = new Set<string>();
  const normalized: KeyDescriptor[] = [];

  for (const item of candidates) {
    if (!item) continue;
    if (!item.value) continue;
    if (seen.has(item.value)) continue;

    seen.add(item.value);
    normalized.push(item);
  }

  return normalized;
}

function getConfiguredKeys(): KeyDescriptor[] {
  return dedupeKeys([
    process.env.XYVALA_INTERNAL_KEY?.trim()
      ? {
          value: process.env.XYVALA_INTERNAL_KEY.trim(),
          type: "internal",
          plan: "internal",
        }
      : null,

    process.env.XYVALA_PUBLIC_DEMO_KEY?.trim()
      ? {
          value: process.env.XYVALA_PUBLIC_DEMO_KEY.trim(),
          type: "public_demo",
          plan: "demo",
        }
      : null,

    process.env.XYVALA_API_KEY?.trim()
      ? {
          value: process.env.XYVALA_API_KEY.trim(),
          type: "legacy",
          plan: "trader",
        }
      : null,
  ]);
}

export function validateApiKey(req: NextRequest): ApiKeyAuthResult {
  const providedKey = getProvidedKey(req);

  if (!providedKey) {
    return {
      ok: false,
      key: null,
      keyType: null,
      plan: null,
      isInternal: false,
      error: "missing_api_key",
      status: 401,
    };
  }

  const configuredKeys = getConfiguredKeys();

  if (configuredKeys.length === 0) {
    return {
      ok: false,
      key: null,
      keyType: null,
      plan: null,
      isInternal: false,
      error: "invalid_api_key",
      status: 401,
    };
  }

  const matched = configuredKeys.find((entry) => entry.value === providedKey);

  if (!matched) {
    return {
      ok: false,
      key: null,
      keyType: null,
      plan: null,
      isInternal: false,
      error: "invalid_api_key",
      status: 401,
    };
  }

  return {
    ok: true,
    key: providedKey,
    keyType: matched.type,
    plan: matched.plan,
    isInternal: matched.type === "internal",
  };
}

/**
 * Couche de compatibilité + point d’entrée standard pour les routes API.
 * Aujourd’hui : s’appuie sur validateApiKey().
 * Demain : peut intégrer policy, plans, restrictions endpoint, allowlists, etc.
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
) {
  response.headers.set("cache-control", "no-store");
  response.headers.set("x-xyvala-auth", "ok");
  response.headers.set("x-xyvala-key-present", auth.key ? "true" : "false");
  response.headers.set("x-xyvala-key-type", auth.keyType);
  response.headers.set("x-xyvala-plan", auth.plan);
  response.headers.set("x-xyvala-internal", auth.isInternal ? "true" : "false");

  return response;
}
