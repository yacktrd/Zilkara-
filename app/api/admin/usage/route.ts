// app/api/admin/usage/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  listUsageByEndpoint,
  listUsageByKey,
  getUsageTotals,
  type UsageEndpoint,
  type UsageSnapshot,
} from "@/lib/xyvala/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XYVALA_VERSION = "v1";

/* --------------------------------- Types --------------------------------- */

type AdminUsageResponse = {
  ok: boolean;
  ts: string;
  version: string;

  mode: "global" | "apiKey" | "endpoint";
  filters: {
    apiKey: string | null;
    endpoint: string | null;
  };

  totals: {
    records: number;
    totalCalls: number;
  };

  count: number;
  data: UsageSnapshot[];

  error: string | null;

  meta: {
    warnings: string[];
  };
};

/* --------------------------------- Utils --------------------------------- */

const NOW_ISO = () => new Date().toISOString();

function safeStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function validateAdminKey(req: NextRequest) {
  const adminKey = safeStr(req.headers.get("x-xyvala-admin-key"));
  const expected = safeStr(process.env.XYVALA_ADMIN_KEY);

  if (!expected) {
    return {
      ok: false as const,
      status: 500 as const,
      error: "admin_key_not_configured" as const,
    };
  }

  if (!adminKey) {
    return {
      ok: false as const,
      status: 401 as const,
      error: "missing_admin_key" as const,
    };
  }

  if (adminKey !== expected) {
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

function buildResponse(
  input: Partial<AdminUsageResponse> & Pick<AdminUsageResponse, "ts" | "mode" | "filters">
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
    },
  };
}

function makeHeaders() {
  return {
    "cache-control": "no-store",
    "x-xyvala-version": XYVALA_VERSION,
    "x-xyvala-admin": "true",
  };
}

/* -------------------------------- Handler -------------------------------- */

export async function GET(req: NextRequest) {
  const ts = NOW_ISO();
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
    const endpoint = safeStr(sp.get("endpoint"));

    let mode: "global" | "apiKey" | "endpoint" = "global";
    let data: UsageSnapshot[] = [];

    if (apiKey) {
      mode = "apiKey";
      data = await listUsageByKey({ apiKey });
    } else if (endpoint) {
      mode = "endpoint";
      data = await listUsageByEndpoint({
        endpoint: endpoint as UsageEndpoint,
      });
    } else {
      warnings.push("global_totals_only");
    }

    const totals = await getUsageTotals();

    const res = buildResponse({
      ok: true,
      ts,
      version: XYVALA_VERSION,

      mode,
      filters: {
        apiKey,
        endpoint,
      },

      totals: {
        records: totals.records,
        totalCalls: totals.totalCalls,
      },

      count: data.length,
      data,

      error: null,

      meta: {
        warnings,
      },
    });

    return NextResponse.json(res, {
      status: 200,
      headers: makeHeaders(),
    });
  } catch (e: any) {
    const res = buildResponse({
      ok: false,
      ts,
      mode: "global",
      filters: {
        apiKey: null,
        endpoint: null,
      },
      error: e?.message ? String(e.message) : "unknown_error",
      meta: {
        warnings: ["route_exception"],
      },
    });

    return NextResponse.json(res, {
      status: 500,
      headers: makeHeaders(),
    });
  }
}
