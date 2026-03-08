// app/api/history/update/route.ts

import { NextRequest, NextResponse } from "next/server";
import { enforceApiPolicy } from "@/lib/xyvala/auth";
import {
  updateMemoryObservation,
  getMemoryRecord,
  type MemoryStatus,
} from "@/lib/xyvala/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XYVALA_VERSION = "v1";

/* ---------------- Types ---------------- */

type UpdateRequest = {
  record_id: string;
  observed_price_later: number | null;
  observed_result_pct?: number | null;
  status?: MemoryStatus;
};

type UpdateResponse = {
  ok: boolean;
  ts: string;
  version: string;

  record_id: string | null;
  status: MemoryStatus | null;

  updated: boolean;

  error: string | null;

  meta: {
    warnings: string[];
  };
};

/* ---------------- Utils ---------------- */

const NOW_ISO = () => new Date().toISOString();

function safeNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function safeStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

/* ---------------- Handler ---------------- */

export async function POST(req: NextRequest) {
  const ts = NOW_ISO();
  const warnings: string[] = [];

  const auth = enforceApiPolicy(req);

  if (!auth.ok) {
    const res: UpdateResponse = {
      ok: false,
      ts,
      version: XYVALA_VERSION,
      record_id: null,
      status: null,
      updated: false,
      error: auth.error,
      meta: { warnings },
    };

    return NextResponse.json(res, {
      status: auth.status,
      headers: {
        "cache-control": "no-store",
        "x-xyvala-version": XYVALA_VERSION,
      },
    });
  }

  try {
    const body: UpdateRequest = await req.json();

    const record_id = safeStr(body.record_id);

    if (!record_id) {
      const res: UpdateResponse = {
        ok: false,
        ts,
        version: XYVALA_VERSION,
        record_id: null,
        status: null,
        updated: false,
        error: "missing_record_id",
        meta: { warnings },
      };

      return NextResponse.json(res, { status: 400 });
    }

    const existing = await getMemoryRecord(record_id);

    if (!existing) {
      const res: UpdateResponse = {
        ok: false,
        ts,
        version: XYVALA_VERSION,
        record_id,
        status: null,
        updated: false,
        error: "record_not_found",
        meta: { warnings },
      };

      return NextResponse.json(res, { status: 404 });
    }

    const observed_price_later = safeNum(body.observed_price_later);

    const observed_result_pct =
      body.observed_result_pct !== undefined
        ? safeNum(body.observed_result_pct)
        : null;

    const status: MemoryStatus = body.status ?? "resolved";

    const updatedRecord = await updateMemoryObservation({
      id: record_id,
      observed_price_later,
      observed_result_pct,
      status,
    });

    const res: UpdateResponse = {
      ok: true,
      ts,
      version: XYVALA_VERSION,

      record_id: updatedRecord?.id ?? record_id,
      status: updatedRecord?.status ?? null,

      updated: true,

      error: null,

      meta: { warnings },
    };

    return NextResponse.json(res, {
      status: 200,
      headers: {
        "cache-control": "no-store",
        "x-xyvala-version": XYVALA_VERSION,
      },
    });
  } catch (e: any) {
    const res: UpdateResponse = {
      ok: false,
      ts,
      version: XYVALA_VERSION,
      record_id: null,
      status: null,
      updated: false,
      error: e?.message ?? "unknown_error",
      meta: { warnings: ["route_exception"] },
    };

    return NextResponse.json(res, { status: 500 });
  }
}
