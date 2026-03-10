// lib/xyvala/server-client.ts

import { headers } from "next/headers";

const DEFAULT_TIMEOUT_MS = 6000;
const MIN_TIMEOUT_MS = 1000;

type JsonRecord = Record<string, unknown>;

export type InternalApiResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  warnings: string[];
  meta: {
    url: string | null;
    usedInternalKey: boolean;
    keySource: "env" | "override" | "missing";
  };
};

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueWarnings(...groups: Array<string[] | undefined | null>): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [...new Set(merged.filter((item) => typeof item === "string" && item.trim().length > 0))];
}

function normalizePath(path: string): string | null {
  const normalized = safeStr(path);

  if (!normalized) return null;
  if (!normalized.startsWith("/")) return null;

  return normalized;
}

function resolveBaseUrl(): string | null {
  const h = headers();

  const forwardedHost = safeStr(h.get("x-forwarded-host"));
  const host = forwardedHost || safeStr(h.get("host"));
  const forwardedProto = safeStr(h.get("x-forwarded-proto"));

  if (host) {
    const protocol =
      forwardedProto ||
      (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

    return `${protocol}://${host}`;
  }

  const siteUrl = safeStr(process.env.SITE_URL);
  if (siteUrl) return siteUrl;

  const vercelUrl = safeStr(process.env.VERCEL_URL);
  if (vercelUrl) return `https://${vercelUrl}`;

  const nextPublicSiteUrl = safeStr(process.env.NEXT_PUBLIC_SITE_URL);
  if (nextPublicSiteUrl) return nextPublicSiteUrl;

  return null;
}

function getInternalKey(override?: string): {
  key: string | null;
  source: "env" | "override" | "missing";
} {
  const overrideKey = safeStr(override);
  if (overrideKey) {
    return {
      key: overrideKey,
      source: "override",
    };
  }

  const envKey = safeStr(process.env.XYVALA_INTERNAL_KEY);
  if (envKey) {
    return {
      key: envKey,
      source: "env",
    };
  }

  return {
    key: null,
    source: "missing",
  };
}

function normalizeTimeout(timeoutMs?: number): number {
  if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs)) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.max(MIN_TIMEOUT_MS, Math.trunc(timeoutMs));
}

function extractApiError(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;

  const record = json as JsonRecord;
  const error = safeStr(record.error);

  return error || null;
}

export async function xyvalaServerFetch<T extends JsonRecord = JsonRecord>(
  path: string,
  input?: {
    searchParams?: Record<string, string | number | boolean | null | undefined>;
    timeoutMs?: number;
    internalKeyOverride?: string;
  }
): Promise<InternalApiResult<T>> {
  const warnings: string[] = [];

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
        usedInternalKey: false,
        keySource: "missing",
      },
    };
  }

  const baseUrl = resolveBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: "internal_base_url_unavailable",
      warnings: ["internal_base_url_unavailable"],
      meta: {
        url: null,
        usedInternalKey: false,
        keySource: "missing",
      },
    };
  }

  const internalKeyInfo = getInternalKey(input?.internalKeyOverride);
  if (!internalKeyInfo.key) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: "internal_key_missing",
      warnings: ["internal_key_missing"],
      meta: {
        url: null,
        usedInternalKey: false,
        keySource: "missing",
      },
    };
  }

  const timeoutMs = normalizeTimeout(input?.timeoutMs);
  const url = new URL(normalizedPath, baseUrl);

  for (const [key, value] of Object.entries(input?.searchParams ?? {})) {
    if (value === null || value === undefined) continue;
    url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-xyvala-key": internalKeyInfo.key,
        "x-xyvala-internal": "true",
      },
      cache: "no-store",
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
        error: extractApiError(json) ?? `http_${res.status}`,
        warnings: uniqueWarnings(warnings, [`http_${res.status}`]),
        meta: {
          url: url.toString(),
          usedInternalKey: true,
          keySource: internalKeyInfo.source,
        },
      };
    }

    return {
      ok: true,
      status: res.status,
      data: json,
      error: null,
      warnings,
      meta: {
        url: url.toString(),
        usedInternalKey: true,
        keySource: internalKeyInfo.source,
      },
    };
  } catch (error) {
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
        [
          error instanceof Error && error.name === "AbortError"
            ? "request_timeout"
            : "request_failed",
        ]
      ),
      meta: {
        url: url.toString(),
        usedInternalKey: true,
        keySource: internalKeyInfo.source,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}
