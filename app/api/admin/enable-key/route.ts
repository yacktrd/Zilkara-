// app/api/admin/enable-key/route.ts
import { NextRequest, NextResponse } from "next/server";
import { enableRegistryKey } from "@/lib/xyvala/registry";
import { invalidateAuthKey } from "@/lib/xyvala/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XYVALA_VERSION = "v1";

type EnableKeyResponse = {
  ok: boolean;
  ts: string;
  version: string;

  key: string | null;
  updated: boolean;

  error: string | null;

  meta: {
    warnings: string[];
  };
};

const NOW_ISO = () => new Date().toISOString();

function safeStr(v: unknown): string | null {
  return typeof v === "string" && v.trim().length ? v.trim() : null;
}

function buildResponse(
  input: Partial<EnableKeyResponse> & Pick<EnableKeyResponse, "ts">
): EnableKeyResponse {
  return {
    ok: Boolean(input.ok),
    ts: input.ts,
    version: input.version ?? XYVALA_VERSION,

    key: input.key ?? null,
    updated: input.updated ?? false,

    error: input.error ?? null,

    meta: {
      warnings: input.meta?.warnings ?? [],
    },
  };
}

export async function POST(req: NextRequest) {
  const ts = NOW_ISO();

  try {
    const body = await req.json();
    const key = safeStr(body?.key);

    if (!key) {
      const res = buildResponse({
        ok: false,
        ts,
        key: null,
        updated: false,
        error: "missing_key",
      });

      return NextResponse.json(res, {
        status: 400,
        headers: {
          "cache-control": "no-store",
          "x-xyvala-version": XYVALA_VERSION,
        },
      });
    }

    const result = enableRegistryKey(key);

    if (!result.ok) {
      const res = buildResponse({
        ok: false,
        ts,
        key,
        updated: false,
        error: "key_not_found",
      });

      return NextResponse.json(res, {
        status: 404,
        headers: {
          "cache-control": "no-store",
          "x-xyvala-version": XYVALA_VERSION,
        },
      });
    }

    invalidateAuthKey(key);

    const res = buildResponse({
      ok: true,
      ts,
      key,
      updated: result.updated,
      error: null,
      meta: {
        warnings: [],
      },
    });

    return NextResponse.json(res, {
      status: 200,
      headers: {
        "cache-control": "no-store",
        "x-xyvala-version": XYVALA_VERSION,
      },
    });
  } catch (e: any) {
    const res = buildResponse({
      ok: false,
      ts,
      key: null,
      updated: false,
      error: e?.message ? String(e.message) : "unknown_error",
      meta: {
        warnings: ["route_exception"],
      },
    });

    return NextResponse.json(res, {
      status: 500,
      headers: {
        "cache-control": "no-store",
        "x-xyvala-version": XYVALA_VERSION,
      },
    });
  }
}
