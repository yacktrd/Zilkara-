// lib/xyvala/server-client.ts

import "server-only";

import { headers } from "next/headers";

const DEFAULT_TIMEOUT_MS = 6000;
const MIN_TIMEOUT_MS = 1000;
const MAX_TIMEOUT_MS = 20000;

type PrimitiveQueryValue = string | number | boolean | null | undefined;
type JsonRecord = Record<string, unknown>;

export type InternalApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  warnings: string[];
};

export type InternalApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type InternalApiRequestOptions = {
  method?: InternalApiMethod;
  searchParams?: Record<string, PrimitiveQueryValue>;
  body?: unknown;
  timeoutMs?: number;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
  headers?: Record<string, string>;
};

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function lowerStr(value: unknown): string {
  return safeStr(value).toLowerCase();
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueWarnings(...groups: Array<string[] | undefined | null>): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [...new Set(merged.filter((item) => typeof item === "string" && item.trim().length > 0))];
}

function normalizeTimeoutMs(value: unknown): number {
  const fallback = DEFAULT_TIMEOUT_MS;
  const num = typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (!Number.isFinite(num)) return fallback;
  if (num < MIN_TIMEOUT_MS) return MIN_TIMEOUT_MS;
  if (num > MAX_TIMEOUT_MS) return MAX_TIMEOUT_MS;

  return Math.trunc(num);
}

function normalizePath(path: string): string {
  const value = safeStr(path);
  if (!value) return "/";
  return value.startsWith("/") ? value : `/${value}`;
}

function normalizeAbsoluteUrl(value: unknown): string | null {
  const raw = safeStr(value);
  if (!raw) return null;

  try {
    const url = new URL(raw);
    return url.origin;
  } catch {
    return null;
  }
}

function normalizeHostOrigin(host: string, proto?: string | null): string | null {
  const cleanHost = safeStr(host);
  if (!cleanHost) return null;

  const protocol =
    safeStr(proto) ||
    (cleanHost.includes("localhost") || cleanHost.startsWith("127.0.0.1") ? "http" : "https");

  try {
    return new URL(`${protocol}://${cleanHost}`).origin;
  } catch {
    return null;
  }
}

async function resolveBaseUrl(): Promise<string | null> {
  const h = await headers();

  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost ?? h.get("host");
  const forwardedProto = h.get("x-forwarded-proto");

  const requestOrigin = normalizeHostOrigin(host ?? "", forwardedProto);
  if (requestOrigin) return requestOrigin;

  const siteUrl =
    normalizeAbsoluteUrl(process.env.XYVALA_SITE_URL) ??
    normalizeAbsoluteUrl(process.env.SITE_URL) ??
    normalizeAbsoluteUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeAbsoluteUrl(process.env.NEXT_PUBLIC_APP_URL);

  if (siteUrl) return siteUrl;

  const apiBaseUrl =
    normalizeAbsoluteUrl(process.env.XYVALA_API_BASE_URL) ??
    normalizeAbsoluteUrl(process.env.API_BASE_URL) ??
    normalizeAbsoluteUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

  if (apiBaseUrl) return apiBaseUrl;

  const vercelProductionUrl = safeStr(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercelProductionUrl) {
    return normalizeHostOrigin(vercelProductionUrl.replace(/^https?:\/\//i, ""), "https");
  }

  const vercelUrl = safeStr(process.env.VERCEL_URL);
  if (vercelUrl) {
    return normalizeHostOrigin(vercelUrl.replace(/^https?:\/\//i, ""), "https");
  }

  return null;
}

function getInternalKey(): string | null {
  const key =
    safeStr(process.env.XYVALA_INTERNAL_KEY) ||
    safeStr(process.env.INTERNAL_API_KEY) ||
    safeStr(process.env.XYVALA_API_INTERNAL_KEY);

  return key || null;
}

function buildUrl(
  baseUrl: string,
  path: string,
  searchParams?: Record<string, PrimitiveQueryValue>
): string {
  const url = new URL(normalizePath(path), baseUrl);

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === null || typeof value === "undefined") continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

function parseErrorFromPayload(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;

  const directError = safeStr(payload.error);
  if (directError) return directError;

  const directMessage = safeStr(payload.message);
  if (directMessage) return directMessage;

  const directCode = safeStr(payload.code);
  if (directCode) return directCode;

  return fallback;
}

async function readResponsePayload(res: Response): Promise<{
  data: unknown;
  warnings: string[];
}> {
  const warnings: string[] = [];
  const contentType = lowerStr(res.headers.get("content-type"));

  let text = "";
  try {
    text = await res.text();
  } catch {
    return {
      data: null,
      warnings: ["response_read_failed"],
    };
  }

  if (!text) {
    return {
      data: null,
      warnings,
    };
  }

  try {
    return {
      data: JSON.parse(text),
      warnings,
    };
  } catch {
    if (contentType.includes("application/json")) {
      warnings.push("json_parse_failed");
    } else {
      warnings.push("non_json_response");
    }

    return {
      data: { raw: text },
      warnings,
    };
  }
}

function buildRequestHeaders(
  internalKey: string,
  method: InternalApiMethod,
  customHeaders?: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {
    "x-xyvala-key": internalKey,
    "x-xyvala-request": "server-internal",
    ...customHeaders,
  };

  const upperMethod = method.toUpperCase() as InternalApiMethod;

  if (upperMethod !== "GET" && !result["content-type"]) {
    result["content-type"] = "application/json";
  }

  return result;
}

export async function xyvalaServerFetch<T extends JsonRecord = JsonRecord>(
  path: string,
  input?: InternalApiRequestOptions
): Promise<InternalApiResult<T>> {
  const warnings: string[] = [];
  const method = (input?.method ?? "GET").toUpperCase() as InternalApiMethod;

  const baseUrl = await resolveBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: "internal_base_url_unavailable",
      warnings: ["internal_base_url_unavailable"],
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
    };
  }

  const timeoutMs = normalizeTimeoutMs(input?.timeoutMs);
  const url = buildUrl(baseUrl, path, input?.searchParams);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: buildRequestHeaders(internalKey, method, input?.headers),
      body:
        typeof input?.body === "undefined" || method === "GET"
          ? undefined
          : JSON.stringify(input.body),
      cache: input?.cache ?? "no-store",
      next: input?.next,
      signal: controller.signal,
    });

    const payload = await readResponsePayload(res);

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: (payload.data as T) ?? null,
        error: parseErrorFromPayload(payload.data, `http_${res.status}`),
        warnings: uniqueWarnings(warnings, payload.warnings, [`http_${res.status}`]),
      };
    }

    return {
      ok: true,
      status: res.status,
      data: (payload.data as T) ?? null,
      error: null,
      warnings: uniqueWarnings(warnings, payload.warnings),
    };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";

    return {
      ok: false,
      status: isAbort ? 504 : 0,
      data: null,
      error:
        isAbort
          ? "request_timeout"
          : error instanceof Error && error.message
            ? `fetch_failed:${error.message}`
            : "fetch_failed",
      warnings: uniqueWarnings(warnings, [
        isAbort ? "request_timeout" : "request_failed",
      ]),
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Alias rétrocompatible :
 * garde la compatibilité avec les fichiers déjà migrés vers getInternalJson()
 * sans casser les anciens appels xyvalaServerFetch().
 */
export async function getInternalJson<T extends JsonRecord = JsonRecord>(
  path: string,
  searchParams?: Record<string, PrimitiveQueryValue>,
  options?: Omit<InternalApiRequestOptions, "method" | "searchParams" | "body">
): Promise<InternalApiResult<T>> {
  return xyvalaServerFetch<T>(path, {
    method: "GET",
    searchParams,
    timeoutMs: options?.timeoutMs,
    cache: options?.cache,
    next: options?.next,
    headers: options?.headers,
  });
}

export async function postInternalJson<T extends JsonRecord = JsonRecord>(
  path: string,
  body?: unknown,
  options?: Omit<InternalApiRequestOptions, "method" | "body">
): Promise<InternalApiResult<T>> {
  return xyvalaServerFetch<T>(path, {
    method: "POST",
    body,
    searchParams: options?.searchParams,
    timeoutMs: options?.timeoutMs,
    cache: options?.cache ?? "no-store",
    next: options?.next,
    headers: options?.headers,
  });
}
