// app/api/account/quota/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  enforceApiPolicy,
  applyApiAuthHeaders,
} from "@/lib/xyvala/auth";
import {
  trackUsage,
  applyQuotaHeaders,
} from "@/lib/xyvala/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const XYVALA_VERSION = "v1";

type AccountQuotaResponse = {
  ok: boolean;
  ts: string;
  version: string;

  plan: string | null;

  usage: {
    minute: number;
    day: number;
  };

  remaining: {
    minute: number;
    day: number;
  };

  quota: {
    minute: number | null;
    day: number | null;
  };

  error: string | null;

  meta: {
    warnings: string[];
  };
};

type AuthResult = ReturnType<typeof enforceApiPolicy>;
type UsageResult = Awaited<ReturnType<typeof trackUsage>> | null;

type QuotaSnapshot = {
  usageMinute: number;
  usageDay: number;
  remainingMinute: number;
  remainingDay: number;
  quotaMinute: number | null;
  quotaDay: number | null;
};

const nowIso = () => new Date().toISOString();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function uniqueWarnings(...groups: Array<string[] | undefined | null>): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [...new Set(merged.filter((item) => typeof item === "string" && item.trim().length > 0))];
}

function readNumberFromKeys(
  source: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = safeFiniteNumber(source[key]);
    if (value !== null) return value;
  }

  return null;
}

function readNestedNumber(
  source: Record<string, unknown>,
  parentKey: string,
  childKey: string
): number | null {
  const parent = source[parentKey];
  if (!isRecord(parent)) return null;
  return safeFiniteNumber(parent[childKey]);
}

function extractQuotaSnapshot(usage: UsageResult): QuotaSnapshot {
  const raw = isRecord(usage) ? usage : {};

  const usageMinute =
    readNumberFromKeys(raw, ["usageMinute", "minuteUsage"]) ??
    readNestedNumber(raw, "usage", "minute") ??
    0;

  const usageDay =
    readNumberFromKeys(raw, ["usageDay", "dayUsage"]) ??
    readNestedNumber(raw, "usage", "day") ??
    0;

  const remainingMinute =
    readNumberFromKeys(raw, ["remainingMinute", "minuteRemaining"]) ??
    readNestedNumber(raw, "remaining", "minute") ??
    0;

  const remainingDay =
    readNumberFromKeys(raw, ["remainingDay", "dayRemaining"]) ??
    readNestedNumber(raw, "remaining", "day") ??
    0;

  const quotaMinute =
    readNumberFromKeys(raw, ["quotaMinute", "minuteQuota"]) ??
    readNestedNumber(raw, "quota", "minute") ??
    usageMinute + remainingMinute;

  const quotaDay =
    readNumberFromKeys(raw, ["quotaDay", "dayQuota"]) ??
    readNestedNumber(raw, "quota", "day") ??
    usageDay + remainingDay;

  return {
    usageMinute,
    usageDay,
    remainingMinute,
    remainingDay,
    quotaMinute,
    quotaDay,
  };
}

function buildResponse(
  input: Partial<AccountQuotaResponse> & Pick<AccountQuotaResponse, "ts">
): AccountQuotaResponse {
  return {
    ok: Boolean(input.ok),
    ts: input.ts,
    version: input.version ?? XYVALA_VERSION,

    plan: input.plan ?? null,

    usage: {
      minute: input.usage?.minute ?? 0,
      day: input.usage?.day ?? 0,
    },

    remaining: {
      minute: input.remaining?.minute ?? 0,
      day: input.remaining?.day ?? 0,
    },

    quota: {
      minute: input.quota?.minute ?? null,
      day: input.quota?.day ?? null,
    },

    error: input.error ?? null,

    meta: {
      warnings: input.meta?.warnings ?? [],
    },
  };
}

function respond(
  payload: AccountQuotaResponse,
  status: number,
  auth?: AuthResult,
  usage?: UsageResult
) {
  let res: NextResponse = NextResponse.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-xyvala-version": XYVALA_VERSION,
      "x-xyvala-auth": auth && auth.ok ? "ok" : "failed",
    },
  });

  if (auth && auth.ok) {
    res = applyApiAuthHeaders(res, auth);
  }

  if (usage) {
    res = applyQuotaHeaders(res, usage);
  }

  return res;
}

export async function GET(req: NextRequest) {
  const ts = nowIso();

  const auth = enforceApiPolicy(req);

  if (!auth.ok) {
    const res = buildResponse({
      ok: false,
      ts,
      plan: null,
      error: auth.error,
      meta: {
        warnings: [],
      },
    });

    return respond(res, auth.status);
  }

  let usage: UsageResult = null;
  let warnings: string[] = [];

  try {
    usage = await trackUsage({
      key: auth.key,
      keyType: auth.keyType,
      endpoint: "/api/account/quota",
      planOverride: auth.plan,
    });
  } catch (error) {
    warnings = uniqueWarnings([
      error instanceof Error && error.message
        ? `usage_track_failed:${error.message}`
        : "usage_track_failed",
    ]);
  }

  try {
    const quotaState = extractQuotaSnapshot(usage);

    const res = buildResponse({
      ok: true,
      ts,
      plan: auth.plan,

      usage: {
        minute: quotaState.usageMinute,
        day: quotaState.usageDay,
      },

      remaining: {
        minute: quotaState.remainingMinute,
        day: quotaState.remainingDay,
      },

      quota: {
        minute: quotaState.quotaMinute,
        day: quotaState.quotaDay,
      },

      error: null,

      meta: {
        warnings,
      },
    });

    return respond(res, 200, auth, usage);
  } catch (error) {
    const res = buildResponse({
      ok: false,
      ts,
      plan: auth.plan,
      error:
        error instanceof Error && error.message
          ? error.message
          : "unknown_error",
      meta: {
        warnings: uniqueWarnings(
          warnings,
          [
            error instanceof Error && error.message
              ? `route_exception:${error.message}`
              : "route_exception",
          ]
        ),
      },
    });

    return respond(res, 500, auth, usage);
  }
}
