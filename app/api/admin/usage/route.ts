// app/api/admin/usage/route.ts

import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import * as usageModule from "@/lib/xyvala/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XYVALA_VERSION = "v2";
const CACHE_CONTROL = "no-store, no-cache, max-age=0, must-revalidate";
const ADMIN_HEADER_NAME = "x-xyvala-admin-key";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

type RouteMode = "global" | "apiKey" | "endpoint";

type UsageSnapshot = {
  [key: string]: unknown;
};

type UsageTotals = {
  records: number;
  totalCalls: number;
};

type AdminUsageResponse = {
  ok: boolean;
  ts: string;
  version: string;

  mode: RouteMode;
  filters: {
    apiKey: string | null;
    endpoint: string | null;
  };

  totals: UsageTotals;

  count: number;
  data: UsageSnapshot[];

  error: string | null;

  meta: {
    warnings: string[];
    source: {
      listUsageByKey: boolean;
      listUsageByEndpoint: boolean;
      getUsageTotals: boolean;
    };
  };
};

type UsageListByKeyFn = (input: { apiKey: string }) => Promise<unknown>;
type UsageListByEndpointFn = (input: { endpoint: string }) => Promise<unknown>;
type UsageTotalsFn = () => Promise<unknown>;

/* -------------------------------------------------------------------------- */
/*                                   Config                                   */
/* -------------------------------------------------------------------------- */

const ALLOWED_ENDPOINTS = new Set([
  "/api/scan",
  "/api/context",
  "/api/state",
  "/api/zones",
  "/api/assets",
  "/api/stats",
  "/api/health",
  "/api/rebuild",
  "/api/debug-kv",
  "/api/admin/create-key",
  "/api/admin/list-keys",
  "/api/admin/enable-key",
  "/api/admin/disable-key",
  "/api/admin/usage",
]);

/* -------------------------------------------------------------------------- */
/*                                    Utils                                   */
/* -------------------------------------------------------------------------- */

const nowIso = () => new Date().toISOString();

function safeStr(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s.length > 0 ? s : null;
}

function safeInt(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) {
      return Math.max(0, Math.trunc(n));
    }
  }

  return fallback;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asArrayOfObjects(value: unknown): UsageSnapshot[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    if (isObject(item)) return item;
    return { value: item };
  });
}

function normalizeTotals(value: unknown): UsageTotals {
  if (!isObject(value)) {
    return { records: 0, totalCalls: 0 };
  }

  return {
    records: safeInt(value.records, 0),
    totalCalls: safeInt(value.totalCalls, 0),
  };
}

function makeHeaders() {
  return {
    "cache-control": CACHE_CONTROL,
    pragma: "no-cache",
    expires: "0",
    "x-xyvala-version": XYVALA_VERSION,
    "x-xyvala-admin": "true",
    "content-type": "application/json; charset=utf-8",
  };
}

function buildResponse(
  input: Partial<AdminUsageResponse> &
    Pick<AdminUsageResponse, "ts" | "mode" | "filters">
): AdminUsageResponse {
  return {
    ok: Boolean(input.ok),
    ts: input.ts,
    version: input.version ?? XYVALA_VERSION,

    mode: input.mode,
    filters: {
      apiKey: input.filters.apiKey ?? null,
      endpoint: input.filters.endpoint ?? null,
    },

    totals: {
      records: input.totals?.records ?? 0,
      totalCalls: input.totals?.totalCalls ?? 0,
    },

    count: input.count ?? 0,
    data: input.data ?? [],

    error: input.error ?? null,

    meta: {
      warnings: input.meta?.warnings ?? [],
      source: {
        listUsageByKey: input.meta?.source?.listUsageByKey ?? false,
        listUsageByEndpoint: input.meta?.source?.listUsageByEndpoint ?? false,
        getUsageTotals: input.meta?.source?.getUsageTotals ?? false,
      },
    },
  };
}

function secureEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);

  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function validateAdminKey(req: NextRequest) {
  const received = safeStr(req.headers.get(ADMIN_HEADER_NAME));
  const expected = safeStr(process.env.XYVALA_ADMIN_KEY);

  if (!expected) {
    return {
      ok: false as const,
      status: 500 as const,
      error: "admin_key_not_configured" as const,
    };
  }

  if (!received) {
    return {
      ok: false as const,
      status: 401 as const,
      error: "missing_admin_key" as const,
    };
  }

  if (!secureEqual(received, expected)) {
    return {
      ok: false as const,
      status: 401 as const,
      error: "invalid_admin_key" as const,
    };
  }

  return {
    ok: true as const,
  };
}

function normalizeEndpoint(value: string | null, warnings: string[]): string | null {
  const endpoint = safeStr(value);
  if (!endpoint) return null;

  if (!endpoint.startsWith("/")) {
    warnings.push("endpoint_normalized_missing_leading_slash");
    return `/${endpoint}`;
  }

  return endpoint;
}

function validateEndpoint(endpoint: string | null, warnings: string[]) {
  if (!endpoint) {
    return {
      ok: true as const,
      endpoint: null,
    };
  }

  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    warnings.push("endpoint_not_in_known_catalog");
  }

  return {
    ok: true as const,
    endpoint,
  };
}

function resolveUsageFunctions() {
  const mod = usageModule as Record<string, unknown>;

  const listUsageByKey =
    typeof mod.listUsageByKey === "function"
      ? (mod.listUsageByKey as UsageListByKeyFn)
      : null;

  const listUsageByEndpoint =
    typeof mod.listUsageByEndpoint === "function"
      ? (mod.listUsageByEndpoint as UsageListByEndpointFn)
      : null;

  const getUsageTotals =
    typeof mod.getUsageTotals === "function"
      ? (mod.getUsageTotals as UsageTotalsFn)
      : null;

  return {
    listUsageByKey,
    listUsageByEndpoint,
    getUsageTotals,
  };
}

async function safeGetTotals(
  fn: UsageTotalsFn | null,
  warnings: string[]
): Promise<UsageTotals> {
  if (!fn) {
    warnings.push("get_usage_totals_unavailable");
    return { records: 0, totalCalls: 0 };
  }

  try {
    const result = await fn();
    return normalizeTotals(result);
  } catch {
    warnings.push("get_usage_totals_failed");
    return { records: 0, totalCalls: 0 };
  }
}

async function safeListByKey(
  fn: UsageListByKeyFn | null,
  apiKey: string,
  warnings: string[]
): Promise<UsageSnapshot[]> {
  if (!fn) {
    warnings.push("list_usage_by_key_unavailable");
    return [];
  }

  try {
    const result = await fn({ apiKey });
    return asArrayOfObjects(result);
  } catch {
    warnings.push("list_usage_by_key_failed");
    return [];
  }
}

async function safeListByEndpoint(
  fn: UsageListByEndpointFn | null,
  endpoint: string,
  warnings: string[]
): Promise<UsageSnapshot[]> {
  if (!fn) {
    warnings.push("list_usage_by_endpoint_unavailable");
    return [];
  }

  try {
    const result = await fn({ endpoint });
    return asArrayOfObjects(result);
  } catch {
    warnings.push("list_usage_by_endpoint_failed");
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Handler                                  */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest) {
  const ts = nowIso();
  const warnings: string[] = [];

  const admin = validateAdminKey(req);

  if (!admin.ok) {
    const res = buildResponse({
      ok: false,
      ts,
      mode: "global",
      filters: {
        apiKey: null,
        endpoint: null,
      },
      error: admin.error,
      meta: {
        warnings,
        source: {
          listUsageByKey: false,
          listUsageByEndpoint: false,
          getUsageTotals: false,
        },
      },
    });

    return NextResponse.json(res, {
      status: admin.status,
      headers: makeHeaders(),
    });
  }

  try {
    const sp = req.nextUrl.searchParams;

    const apiKey = safeStr(sp.get("apiKey"));
    const endpointInput = normalizeEndpoint(sp.get("endpoint"), warnings);
    const endpointCheck = validateEndpoint(endpointInput, warnings);
    const endpoint = endpointCheck.endpoint;

    const fns = resolveUsageFunctions();

    let mode: RouteMode = "global";
    let data: UsageSnapshot[] = [];

    if (apiKey) {
      mode = "apiKey";
      data = await safeListByKey(fns.listUsageByKey, apiKey, warnings);
    } else if (endpoint) {
      mode = "endpoint";
      data = await safeListByEndpoint(fns.listUsageByEndpoint, endpoint, warnings);
    } else {
      warnings.push("global_totals_only");
    }

    const totals = await safeGetTotals(fns.getUsageTotals, warnings);

    const res = buildResponse({
      ok: true,
      ts,
      version: XYVALA_VERSION,

      mode,
      filters: {
        apiKey,
        endpoint,
      },

      totals,
      count: data.length,
      data,
      error: null,

      meta: {
        warnings,
        source: {
          listUsageByKey: Boolean(fns.listUsageByKey),
          listUsageByEndpoint: Boolean(fns.listUsageByEndpoint),
          getUsageTotals: Boolean(fns.getUsageTotals),
        },
      },
    });

    return NextResponse.json(res, {
      status: 200,
      headers: makeHeaders(),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error && safeStr(error.message)
        ? error.message
        : "unknown_error";

    const res = buildResponse({
      ok: false,
      ts,
      mode: "global",
      filters: {
        apiKey: null,
        endpoint: null,
      },
      error: message,
      meta: {
        warnings: [...warnings, "route_exception"],
        source: {
          listUsageByKey: false,
          listUsageByEndpoint: false,
          getUsageTotals: false,
        },
      },
    });

    return NextResponse.json(res, {
      status: 500,
      headers: makeHeaders(),
    });
  }
}
