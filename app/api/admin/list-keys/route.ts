// app/api/admin/list-keys/route.ts
import { NextRequest, NextResponse } from "next/server";
import { listRegistryKeys } from "@/lib/xyvala/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XYVALA_VERSION = "v1";

type ListKeysResponse = {
  ok: boolean;
  ts: string;
  version: string;

  count: number;
  keys: Array<{
    key: string;
    config: {
      plan: string;
      enabled: boolean;
      label: string | null;
      createdAt: string | null;
    };
  }>;

  error: string | null;

  meta: {
    warnings: string[];
  };
};

const NOW_ISO = () => new Date().toISOString();

function buildResponse(
  input: Partial<ListKeysResponse> & Pick<ListKeysResponse, "ts">
): ListKeysResponse {
  return {
    ok: Boolean(input.ok),
    ts: input.ts,
    version: input.version ?? XYVALA_VERSION,

    count: input.count ?? 0,
    keys: input.keys ?? [],

    error: input.error ?? null,

    meta: {
      warnings: input.meta?.warnings ?? [],
    },
  };
}

export async function GET(_req: NextRequest) {
  const ts = NOW_ISO();

  try {
    const registry = listRegistryKeys();

    const keys = registry.map((entry) => ({
      key: entry.key,
      config: {
        plan: entry.config.plan,
        enabled: entry.config.enabled !== false,
        label: entry.config.label ?? null,
        createdAt: entry.config.createdAt ?? null,
      },
    }));

    const res = buildResponse({
      ok: true,
      ts,
      count: keys.length,
      keys,
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
