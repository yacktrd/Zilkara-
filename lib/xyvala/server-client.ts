// lib/xyvala/server-client.ts

import { headers } from "next/headers";
import type { JsonRecord, JsonValue } from "@/lib/xyvala/json";

const DEFAULT_TIMEOUT_MS = 6000;
const INTERNAL_KEY_HEADER = "x-xyvala-key";

export type InternalApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  warnings: string[];
};

export type XyvalaServerFetchInput = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
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

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

async function resolveBaseUrl(): Promise<string | null> {
  try {
    const h = await headers();

    const forwardedHost = safeStr(h.get("x-forwarded-host"));
    const host = forwardedHost || safeStr(h.get("host"));
    const forwardedProto = safeStr(h.get("x-forwarded-proto"));

    if (host) {
      const protocol =
        forwardedProto ||
        (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

      return normalizeBaseUrl(`${protocol}://${host}`);
    }
  } catch {
    // fallback env only
  }

  const nextPublicBaseUrl = safeStr(process.env.NEXT_PUBLIC_BASE_URL);
  if (nextPublicBaseUrl) return normalizeBaseUrl(nextPublicBaseUrl);

  const siteUrl = safeStr(process.env.SITE_URL);
  if (siteUrl) return normalizeBaseUrl(siteUrl);

  const nextPublicSiteUrl = safeStr(process.env.NEXT_PUBLIC_SITE_URL);
  if (nextPublicSiteUrl) return normalizeBaseUrl(nextPublicSiteUrl);

  const vercelUrl = safeStr(process.env.VERCEL_URL);
  if (vercelUrl) return normalizeBaseUrl(`https://${vercelUrl}`);

  return null;
}

function getInternalKey(): string | null {
  const key = safeStr(process.env.XYVALA_INTERNAL_KEY);
  return key || null;
}

function extractJsonError(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const maybeError = (value as Record<string, unknown>).error;
  const normalized = safeStr(maybeError);

  return normalized || null;
}

function buildRequestHeaders(
  internalKey: string,
  inputHeaders?: Record<string, string>
): Record<string, string> {
  const headersOut: Record<string, string> = {};

  for (const [key, value] of Object.entries(inputHeaders ?? {})) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey === INTERNAL_KEY_HEADER) continue;
    if (!safeStr(value)) continue;
    headersOut[key] = value;
  }

  headersOut[INTERNAL_KEY_HEADER] = internalKey;

  return headersOut;
}

export async function xyvalaServerFetch<T extends JsonRecord = JsonRecord>(
  path: string,
  input: XyvalaServerFetchInput = {}
): Promise<InternalApiResult<T>> {
  const warnings: string[] = [];

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

  const method = input.method ?? "GET";
  const timeoutMs =
    typeof input.timeoutMs === "number" && Number.isFinite(input.timeoutMs)
      ? Math.max(1000, Math.trunc(input.timeoutMs))
      : DEFAULT_TIMEOUT_MS;

  const cacheMode = input.cache ?? "no-store";

  const url = new URL(path, `${baseUrl}/`);

  for (const [key, value] of Object.entries(input.searchParams ?? {})) {
    if (value === null || value === undefined) continue;
    url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const requestHeaders = buildRequestHeaders(internalKey, input.headers);

    let body: string | undefined;

    if (input.body !== undefined && input.body !== null) {
      body = JSON.stringify(input.body);

      if (!requestHeaders["content-type"]) {
        requestHeaders["content-type"] = "application/json";
      }
    }

    const res = await fetch(url.toString(), {
      method,
      headers: requestHeaders,
      body,
      cache: cacheMode,
      signal: controller.signal,
    });

    let json: T | null = null;

    try {
      json = (await res.json()) as T;
    } catch {
      warnings.push("json_parse_failed");
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: json,
        error: extractJsonError(json) ?? `http_${res.status}`,
        warnings: uniqueWarnings(warnings, [`http_${res.status}`]),
      };
    }

    if (!json) {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: "empty_json_response",
        warnings: uniqueWarnings(warnings, ["empty_json_response"]),
      };
    }

    return {
      ok: true,
      status: res.status,
      data: json,
      error: null,
      warnings,
    };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";

    return {
      ok: false,
      status: 0,
      data: null,
      error:
        error instanceof Error && error.message
          ? `fetch_failed:${error.message}`
          : "fetch_failed",
      warnings: uniqueWarnings(
        warnings,
        [isAbort ? "request_timeout" : "request_failed"]
      ),
    };
  } finally {
    clearTimeout(timeout);
  }
}
