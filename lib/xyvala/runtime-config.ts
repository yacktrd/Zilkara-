// lib/xyvala/runtime-config.ts

import "server-only";
import { headers } from "next/headers";

export type XyvalaAppEnv = "development" | "preview" | "production";

export type XyvalaRuntimeConfig = {
  appEnv: XyvalaAppEnv;
  nodeEnv: string;
  isDev: boolean;
  isPreview: boolean;
  isProd: boolean;

  siteUrl: string | null;
  apiBaseUrl: string | null;

  defaultQuote: string;
  defaultSort: string;
  defaultLimit: number;
  requestTimeoutMs: number;

  hasRequiredApiKeys: boolean;
  warnings: string[];
};

type RuntimeConfigOptions = {
  requestHeaders?: Headers | null;
};

const DEFAULT_QUOTE = "usd";
const DEFAULT_SORT = "score_desc";
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 250;
const DEFAULT_TIMEOUT_MS = 6000;
const MAX_TIMEOUT_MS = 20000;

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function lower(value: unknown): string {
  return safeString(value).toLowerCase();
}

function normalizePositiveInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  const raw = safeString(value);
  const parsed = Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return min;
  if (parsed > max) return max;

  return parsed;
}

function normalizeUrl(value: unknown): string | null {
  const raw = safeString(value);
  if (!raw) return null;

  try {
    const url = new URL(raw);
    return url.origin;
  } catch {
    return null;
  }
}

function normalizeHostLikeOrigin(
  host: string,
  proto?: string | null
): string | null {
  const cleanHost = safeString(host);
  if (!cleanHost) return null;

  const protocol =
    safeString(proto) ||
    (cleanHost.includes("localhost") || cleanHost.startsWith("127.0.0.1")
      ? "http"
      : "https");

  try {
    return new URL(`${protocol}://${cleanHost}`).origin;
  } catch {
    return null;
  }
}

function detectAppEnv(): XyvalaAppEnv {
  const vercelEnv = lower(process.env.VERCEL_ENV);
  const nodeEnv = lower(process.env.NODE_ENV);

  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "preview";
  if (nodeEnv === "production") return "production";

  return "development";
}

function resolveExplicitSiteUrl(): string | null {
  return (
    normalizeUrl(process.env.XYVALA_SITE_URL) ??
    normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeUrl(process.env.APP_URL) ??
    normalizeUrl(process.env.SITE_URL)
  );
}

function resolveExplicitApiBaseUrl(): string | null {
  return (
    normalizeUrl(process.env.XYVALA_API_BASE_URL) ??
    normalizeUrl(process.env.NEXT_PUBLIC_API_BASE_URL) ??
    normalizeUrl(process.env.API_BASE_URL)
  );
}

function resolveFromVercel(): string | null {
  const url =
    safeString(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    safeString(process.env.VERCEL_URL);

  if (!url) return null;

  const host = url.replace(/^https?:\/\//i, "");
  return normalizeHostLikeOrigin(host, "https");
}

function buildWarnings(input: {
  siteUrl: string | null;
  apiBaseUrl: string | null;
  hasRequiredApiKeys: boolean;
}): string[] {
  const warnings: string[] = [];

  if (!input.siteUrl) {
    warnings.push("runtime_site_url_unresolved");
  }

  if (!input.apiBaseUrl) {
    warnings.push("runtime_api_base_url_unresolved");
  }

  if (!input.hasRequiredApiKeys) {
    warnings.push("runtime_missing_required_api_keys");
  }

  return warnings;
}

/**
 * Version pure :
 * - ne lit pas headers()
 * - utile dans les routes où tu as déjà les headers
 */
export function buildRuntimeConfig(
  options: RuntimeConfigOptions = {}
): XyvalaRuntimeConfig {
  const appEnv = detectAppEnv();
  const nodeEnv = safeString(process.env.NODE_ENV) || "development";
  const isDev = appEnv === "development";
  const isPreview = appEnv === "preview";
  const isProd = appEnv === "production";

  const explicitSiteUrl = resolveExplicitSiteUrl();
  const explicitApiBaseUrl = resolveExplicitApiBaseUrl();
  const vercelOrigin = resolveFromVercel();

  const requestHeaders = options.requestHeaders ?? null;

  const forwardedHost = requestHeaders?.get("x-forwarded-host") ?? "";
  const host = forwardedHost || requestHeaders?.get("host") || "";
  const forwardedProto = requestHeaders?.get("x-forwarded-proto") ?? "";

  const requestOrigin = normalizeHostLikeOrigin(host, forwardedProto);

  const siteUrl = explicitSiteUrl ?? vercelOrigin ?? requestOrigin;
  const apiBaseUrl = explicitApiBaseUrl ?? siteUrl;

  const defaultQuote = lower(process.env.XYVALA_DEFAULT_QUOTE) || DEFAULT_QUOTE;
  const defaultSort = safeString(process.env.XYVALA_DEFAULT_SORT) || DEFAULT_SORT;

  const defaultLimit = normalizePositiveInt(
    process.env.XYVALA_DEFAULT_LIMIT,
    DEFAULT_LIMIT,
    1,
    MAX_LIMIT
  );

  const requestTimeoutMs = normalizePositiveInt(
    process.env.XYVALA_REQUEST_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS,
    1000,
    MAX_TIMEOUT_MS
  );

  const hasRequiredApiKeys = Boolean(
    safeString(process.env.COINGECKO_API_KEY) ||
      safeString(process.env.XYVALA_API_KEY) ||
      safeString(process.env.NEXT_PUBLIC_XYVALA_API_KEY)
  );

  const warnings = buildWarnings({
    siteUrl,
    apiBaseUrl,
    hasRequiredApiKeys,
  });

  return {
    appEnv,
    nodeEnv,
    isDev,
    isPreview,
    isProd,
    siteUrl,
    apiBaseUrl,
    defaultQuote,
    defaultSort,
    defaultLimit,
    requestTimeoutMs,
    hasRequiredApiKeys,
    warnings,
  };
}

/**
 * Version App Router :
 * - lit headers() proprement
 * - à utiliser dans page.tsx / layout.tsx / server helpers
 */
export async function getRuntimeConfig(): Promise<XyvalaRuntimeConfig> {
  const requestHeaders = await headers();
  return buildRuntimeConfig({ requestHeaders });
}
