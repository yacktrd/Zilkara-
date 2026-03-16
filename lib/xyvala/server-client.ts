// lib/xyvala/server-client.ts

import { headers } from "next/headers";
import type { JsonRecord, JsonValue } from "@/lib/xyvala/json";

const DEFAULT_TIMEOUT_MS = 6000;
const MIN_TIMEOUT_MS = 1000;
const MAX_TIMEOUT_MS = 15000;
const INTERNAL_KEY_HEADER = "x-xyvala-key";
const INTERNAL_REQUEST_HEADER = "x-xyvala-internal";

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type BaseUrlSource =
  | "headers"
  | "next_public_base_url"
  | "site_url"
  | "next_public_site_url"
  | "vercel_url"
  | "unavailable";

export type InternalApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  warnings: string[];
  meta: {
    url: string | null;
    method: RequestMethod;
    timeoutMs: number;
    durationMs: number;
    baseUrlSource: BaseUrlSource;
    contentType: string | null;
  };
};

export type XyvalaServerFetchInput = {
  method?: RequestMethod;
  searchParams?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  body?: JsonValue | null;
  timeoutMs?: number;
  cache?: RequestCache;
};

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueWarnings(...groups: Array<string[] | undefined | null>): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [...new Set(merged.filter((item) => typeof item === "string" && item.trim().length > 0))];
}

function clampTimeoutMs(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.trunc(value)));
}

function isSafeInternalPath(value: string): boolean {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.includes("://")) return false;
  if (value.includes("\n") || value.includes("\r")) return false;
  return true;
}

function normalizePath(value: string): string | null {
  const normalized = safeStr(value);
  return isSafeInternalPath(normalized) ? normalized : null;
}

function normalizeBaseUrl(value: string): string | null {
  const normalized = safeStr(value);
  if (!normalized) return null;

  try {
    const url = new URL(
      normalized.startsWith("http://") || normalized.startsWith("https://")
        ? normalized
        : `https://${normalized}`
    );

    return url.origin.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

async function resolveBaseUrl(): Promise<{
  baseUrl: string | null;
  source: BaseUrlSource;
}> {
  try {
    const h = await headers();

    const forwardedHost = safeStr(h.get("x-forwarded-host"));
    const host = forwardedHost || safeStr(h.get("host"));
    const forwardedProto = safeStr(h.get("x-forwarded-proto"));

    if (host) {
      const protocol =
        forwardedProto ||
        (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

      const resolved = normalizeBaseUrl(`${protocol}://${host}`);

      if (resolved) {
        return {
          baseUrl: resolved,
          source: "headers",
        };
      }
    }
  } catch {
    // fallback env only
  }

  const nextPublicBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL ?? "");
  if (nextPublicBaseUrl) {
    return {
      baseUrl: nextPublicBaseUrl,
      source: "next_public_base_url",
    };
  }

  const siteUrl = normalizeBaseUrl(process.env.SITE_URL ?? "");
  if (siteUrl) {
    return {
      baseUrl: siteUrl,
      source: "site_url",
    };
  }

  const nextPublicSiteUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL ?? "");
  if (nextPublicSiteUrl) {
    return {
      baseUrl: nextPublicSiteUrl,
      source: "next_public_site_url",
    };
  }

  const vercelUrl = normalizeBaseUrl(process.env.VERCEL_URL ?? "");
  if (vercelUrl) {
    return {
      baseUrl: vercelUrl,
      source: "vercel_url",
    };
  }

  return {
    baseUrl: null,
    source: "unavailable",
  };
}

function getInternalKey(): string | null {
  const key = safeStr(process.env.XYVALA_INTERNAL_KEY);

  if (!key) return null;
  if (key.length < 8) return null;

  return key;
}

function extractJsonError(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;

  const errorValue = safeStr(record.error);
  if (errorValue) return errorValue;

  const messageValue = safeStr(record.message);
  if (messageValue) return messageValue;

  return null;
}

function normalizeHeaderKeyMap(
  inputHeaders?: Record<string, string>
): Map<string, { key: string; value: string }> {
  const map = new Map<string, { key: string; value: string }>();

  for (const [rawKey, rawValue] of Object.entries(inputHeaders ?? {})) {
    const normalizedKey = safeStr(rawKey).toLowerCase();
    const normalizedValue = safeStr(rawValue);

    if (!normalizedKey || !normalizedValue) continue;
    if (normalizedKey === INTERNAL_KEY_HEADER) continue;

    map.set(normalizedKey, {
      key: rawKey,
      value: normalizedValue,
    });
  }

  return map;
}

function buildRequestHeaders(
  internalKey: string,
  inputHeaders?: Record<string, string>,
  hasJsonBody?: boolean
): Record<string, string> {
  const map = normalizeHeaderKeyMap(inputHeaders);

  map.set(INTERNAL_KEY_HEADER, {
    key: INTERNAL_KEY_HEADER,
    value: internalKey,
  });

  map.set(INTERNAL_REQUEST_HEADER, {
    key: INTERNAL_REQUEST_HEADER,
    value: "1",
  });

  if (hasJsonBody && !map.has("content-type")) {
    map.set("content-type", {
      key: "content-type",
      value: "application/json",
    });
  }

  const output: Record<string, string> = {};

  for (const { key, value } of map.values()) {
    output[key] = value;
  }

  return output;
}

async function parseJsonSafely<T extends JsonRecord>(
  response: Response
): Promise<{
  data: T | null;
  warnings: string[];
}> {
  const warnings: string[] = [];
  const contentType = safeStr(response.headers.get("content-type")).toLowerCase();

  if (!contentType.includes("application/json")) {
    return {
      data: null,
      warnings: ["unexpected_content_type"],
    };
  }

  try {
    const json = (await response.json()) as T;
    return {
      data: json,
      warnings,
    };
  } catch {
    return {
      data: null,
      warnings: ["json_parse_failed"],
    };
  }
}

export async function xyvalaServerFetch<T extends JsonRecord = JsonRecord>(
  path: string,
  input: XyvalaServerFetchInput = {}
): Promise<InternalApiResult<T>> {
  const startedAt = Date.now();
  const warnings: string[] = [];

  const method: RequestMethod = input.method ?? "GET";
  const timeoutMs = clampTimeoutMs(input.timeoutMs);
  const cacheMode = input.cache ?? "no-store";
  const normalizedPath = normalizePath(path);

  if (!normalizedPath) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: "invalid_internal_path",
      warnings: ["invalid_internal_path"],
      meta: {
        url: null,
        method,
        timeoutMs,
        durationMs: Date.now() - startedAt,
        baseUrlSource: "unavailable",
        contentType: null,
      },
    };
  }

  const { baseUrl, source } = await resolveBaseUrl();

  if (!baseUrl) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: "internal_base_url_unavailable",
      warnings: ["internal_base_url_unavailable"],
      meta: {
        url: null,
        method,
        timeoutMs,
        durationMs: Date.now() - startedAt,
        baseUrlSource: source,
        contentType: null,
      },
    };
  }

  const internalKey = getInternalKey();

  if (!internalKey) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: "internal_key_missing",
      warnings: ["internal_key_missing"],
      meta: {
        url: null,
        method,
        timeoutMs,
        durationMs: Date.now() - startedAt,
        baseUrlSource: source,
        contentType: null,
      },
    };
  }

  const url = new URL(normalizedPath, `${baseUrl}/`);

  for (const [key, value] of Object.entries(input.searchParams ?? {})) {
    if (value === null || value === undefined) continue;
    url.searchParams.set(key, String(value));
  }

  const finalUrl = url.toString();

  const hasBody = input.body !== undefined && input.body !== null;
  const bodyAllowed = method !== "GET" && method !== "DELETE";

  if (hasBody && !bodyAllowed) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: "body_not_allowed_for_method",
      warnings: ["body_not_allowed_for_method"],
      meta: {
        url: finalUrl,
        method,
        timeoutMs,
        durationMs: Date.now() - startedAt,
        baseUrlSource: source,
        contentType: null,
      },
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const requestHeaders = buildRequestHeaders(internalKey, input.headers, hasBody);

    const body = hasBody ? JSON.stringify(input.body) : undefined;

    const response = await fetch(finalUrl, {
      method,
      headers: requestHeaders,
      body,
      cache: cacheMode,
      signal: controller.signal,
    });

    const contentType = safeStr(response.headers.get("content-type")) || null;
    const parsed = await parseJsonSafely<T>(response);

    if (parsed.warnings.length > 0) {
      warnings.push(...parsed.warnings);
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: parsed.data,
        error: extractJsonError(parsed.data) ?? `http_${response.status}`,
        warnings: uniqueWarnings(warnings, [`http_${response.status}`]),
        meta: {
          url: finalUrl,
          method,
          timeoutMs,
          durationMs: Date.now() - startedAt,
          baseUrlSource: source,
          contentType,
        },
      };
    }

    if (!parsed.data) {
      return {
        ok: false,
        status: response.status,
        data: null,
        error: "empty_json_response",
        warnings: uniqueWarnings(warnings, ["empty_json_response"]),
        meta: {
          url: finalUrl,
          method,
          timeoutMs,
          durationMs: Date.now() - startedAt,
          baseUrlSource: source,
          contentType,
        },
      };
    }

    return {
      ok: true,
      status: response.status,
      data: parsed.data,
      error: null,
      warnings,
      meta: {
        url: finalUrl,
        method,
        timeoutMs,
        durationMs: Date.now() - startedAt,
        baseUrlSource: source,
        contentType,
      },
    };
  } catch (error) {
    const isAbortError = error instanceof Error && error.name === "AbortError";

    return {
      ok: false,
      status: 0,
      data: null,
      error: isAbortError
        ? "request_timeout"
        : error instanceof Error && safeStr(error.message)
          ? `fetch_failed:${safeStr(error.message)}`
          : "fetch_failed",
      warnings: uniqueWarnings(
        warnings,
        [isAbortError ? "request_timeout" : "request_failed"]
      ),
      meta: {
        url: finalUrl,
        method,
        timeoutMs,
        durationMs: Date.now() - startedAt,
        baseUrlSource: source,
        contentType: null,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}
