// app/api/debug-kv/route.ts
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEBUG_KV_KEY = "xyvala:debug:kv:rfs-state-24h";

type DebugAsset = {
  symbol: string;
  name: string;
  price: number;
  chg_24h_pct: number;
  regime: "STABLE" | "TRANSITION" | "VOLATILE";
  confidence_score: number;
};

type DebugKvResponse = {
  ok: boolean;
  ts: string;
  version: string;
  key: string;
  wrote: number;
  readBack: DebugAsset[] | null;
  error: string | null;
  meta: {
    runtime: "nodejs";
    dynamic: "force-dynamic";
    kvConfigured: boolean;
    warnings: string[];
  };
};

function nowIso(): string {
  return new Date().toISOString();
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isKvConfigured(): boolean {
  return Boolean(
    safeStr(process.env.KV_REST_API_URL) &&
      safeStr(process.env.KV_REST_API_TOKEN)
  );
}

function buildTestData(): DebugAsset[] {
  return [
    {
      symbol: "BTC",
      name: "Bitcoin",
      price: 64_000,
      chg_24h_pct: 2.3,
      regime: "STABLE",
      confidence_score: 78,
    },
    {
      symbol: "ETH",
      name: "Ethereum",
      price: 3_400,
      chg_24h_pct: -1.2,
      regime: "TRANSITION",
      confidence_score: 62,
    },
  ];
}

function normalizeReadBack(value: unknown): DebugAsset[] | null {
  if (!Array.isArray(value)) return null;

  const out: DebugAsset[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const record = item as Record<string, unknown>;

    const symbol = safeStr(record.symbol);
    const name = safeStr(record.name);
    const price = typeof record.price === "number" ? record.price : Number(record.price);
    const chg_24h_pct =
      typeof record.chg_24h_pct === "number"
        ? record.chg_24h_pct
        : Number(record.chg_24h_pct);
    const confidence_score =
      typeof record.confidence_score === "number"
        ? record.confidence_score
        : Number(record.confidence_score);

    const regimeRaw = safeStr(record.regime).toUpperCase();
    const regime =
      regimeRaw === "STABLE" ||
      regimeRaw === "TRANSITION" ||
      regimeRaw === "VOLATILE"
        ? regimeRaw
        : null;

    if (
      !symbol ||
      !name ||
      !Number.isFinite(price) ||
      !Number.isFinite(chg_24h_pct) ||
      !Number.isFinite(confidence_score) ||
      !regime
    ) {
      continue;
    }

    out.push({
      symbol,
      name,
      price,
      chg_24h_pct,
      regime,
      confidence_score,
    });
  }

  return out;
}

function buildResponse(input: {
  ok: boolean;
  key: string;
  wrote: number;
  readBack: DebugAsset[] | null;
  error: string | null;
  warnings?: string[];
}): DebugKvResponse {
  return {
    ok: input.ok,
    ts: nowIso(),
    version: "v1",
    key: input.key,
    wrote: input.wrote,
    readBack: input.readBack,
    error: input.error,
    meta: {
      runtime: "nodejs",
      dynamic: "force-dynamic",
      kvConfigured: isKvConfigured(),
      warnings: input.warnings ?? [],
    },
  };
}

export async function GET() {
  const warnings: string[] = [];

  if (!isKvConfigured()) {
    return NextResponse.json(
      buildResponse({
        ok: false,
        key: DEBUG_KV_KEY,
        wrote: 0,
        readBack: null,
        error: "kv_not_configured",
        warnings: ["missing_kv_environment_variables"],
      }),
      {
        status: 500,
        headers: {
          "cache-control": "no-store",
          "x-xyvala-version": "v1",
          "x-xyvala-debug": "kv",
        },
      }
    );
  }

  try {
    const testData = buildTestData();

    await kv.set(DEBUG_KV_KEY, testData);

    const raw = await kv.get(DEBUG_KV_KEY);
    const readBack = normalizeReadBack(raw);

    if (!readBack) {
      warnings.push("readback_shape_invalid");
    }

    return NextResponse.json(
      buildResponse({
        ok: true,
        key: DEBUG_KV_KEY,
        wrote: testData.length,
        readBack,
        error: null,
        warnings,
      }),
      {
        status: 200,
        headers: {
          "cache-control": "no-store",
          "x-xyvala-version": "v1",
          "x-xyvala-debug": "kv",
        },
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "unknown_kv_error";

    return NextResponse.json(
      buildResponse({
        ok: false,
        key: DEBUG_KV_KEY,
        wrote: 0,
        readBack: null,
        error: message,
        warnings: ["route_exception"],
      }),
      {
        status: 500,
        headers: {
          "cache-control": "no-store",
          "x-xyvala-version": "v1",
          "x-xyvala-debug": "kv",
        },
      }
    );
  }
}
