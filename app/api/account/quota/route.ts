// app/api/account/quota/route.ts
import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/xyvala/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XYVALA_VERSION = "v1";

/* --------------------------------- Types --------------------------------- */

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

/* --------------------------------- Utils --------------------------------- */

const NOW_ISO = () => new Date().toISOString();

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

function makeHeaders(auth?: {
  plan: string;
  remainingMinute: number;
  remainingDay: number;
  usage: { minute: number; day: number };
}) {
  const headers: Record<string, string> = {
    "cache-control": "no-store",
    "x-xyvala-version": XYVALA_VERSION,
  };

  if (auth) {
    headers["x-xyvala-auth"] = "ok";
    headers["x-xyvala-plan"] = String(auth.plan);
    headers["x-xyvala-remaining-minute"] = String(auth.remainingMinute);
    headers["x-xyvala-remaining-day"] = String(auth.remainingDay);
    headers["x-xyvala-usage-minute"] = String(auth.usage.minute);
    headers["x-xyvala-usage-day"] = String(auth.usage.day);
  } else {
    headers["x-xyvala-auth"] = "failed";
  }

  return headers;
}

/* -------------------------------- Handler -------------------------------- */

export async function GET(req: NextRequest) {
  const ts = NOW_ISO();

  const auth = validateApiKey(req);

  if (!auth.ok) {
    const res = buildResponse({
      ok: false,
      ts,
      error: auth.error,
      meta: {
        warnings: [],
      },
    });

    return NextResponse.json(res, {
      status: auth.status,
      headers: makeHeaders(),
    });
  }

  try {
    const res = buildResponse({
      ok: true,
      ts,
      plan: auth.plan,

      usage: {
        minute: auth.usage.minute,
        day: auth.usage.day,
      },

      remaining: {
        minute: auth.remainingMinute,
        day: auth.remainingDay,
      },

      quota: {
        minute: auth.usage.minute + auth.remainingMinute,
        day: auth.usage.day + auth.remainingDay,
      },

      error: null,

      meta: {
        warnings: [],
      },
    });

    return NextResponse.json(res, {
      status: 200,
      headers: makeHeaders(auth),
    });
  } catch (e: any) {
    const res = buildResponse({
      ok: false,
      ts,
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
