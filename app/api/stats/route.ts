// app/api/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { enforceApiPolicy } from "@/lib/xyvala/auth";
import {
  listMemoryBySymbol,
  listRecentMemory,
  type SignalMemoryRecord,
} from "@/lib/xyvala/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XYVALA_VERSION = "v1";

/* ---------------- Types ---------------- */

type StatsResponse = {
  ok: boolean;
  ts: string;
  version: string;

  symbol: string | null;
  limit: number;

  totals: {
    total_records: number;
    open_records: number;
    resolved_records: number;
    positive: number;
    negative: number;
    neutral: number;
  };

  metrics: {
    winrate: number | null;
    avg_result_pct: number | null;
    avg_positive_pct: number | null;
    avg_negative_pct: number | null;
  };

  breakdown: {
    by_action: Array<{
      action: "ALLOW" | "WATCH" | "BLOCK";
      total: number;
      resolved: number;
      positive: number;
      negative: number;
      neutral: number;
      winrate: number | null;
      avg_result_pct: number | null;
    }>;
    by_regime: Array<{
      market_regime: string;
      total: number;
      resolved: number;
      positive: number;
      negative: number;
      neutral: number;
      winrate: number | null;
      avg_result_pct: number | null;
    }>;
  };

  error: string | null;

  meta: {
    warnings: string[];
  };
};

/* ---------------- Utils ---------------- */

const NOW_ISO = () => new Date().toISOString();

function safeStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function sanitizeSymbol(symbol: string) {
  return symbol.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parseLimit(v: string | null): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 200;
  return clamp(Math.trunc(n), 1, 5000);
}

function round2(n: number | null): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function computeBaseStats(records: SignalMemoryRecord[]) {
  let total_records = records.length;
  let open_records = 0;
  let resolved_records = 0;
  let positive = 0;
  let negative = 0;
  let neutral = 0;

  let resultSum = 0;
  let resultCount = 0;

  let positiveSum = 0;
  let positiveCount = 0;

  let negativeSum = 0;
  let negativeCount = 0;

  for (const r of records) {
    if (r.status === "open") open_records += 1;
    if (r.status === "resolved") resolved_records += 1;

    if (typeof r.observed_result_pct === "number") {
      resultSum += r.observed_result_pct;
      resultCount += 1;

      if (r.observed_result_pct > 0) {
        positive += 1;
        positiveSum += r.observed_result_pct;
        positiveCount += 1;
      } else if (r.observed_result_pct < 0) {
        negative += 1;
        negativeSum += r.observed_result_pct;
        negativeCount += 1;
      } else {
        neutral += 1;
      }
    }
  }

  const winrate =
    resolved_records > 0 ? round2((positive / resolved_records) * 100) : null;

  const avg_result_pct =
    resultCount > 0 ? round2(resultSum / resultCount) : null;

  const avg_positive_pct =
    positiveCount > 0 ? round2(positiveSum / positiveCount) : null;

  const avg_negative_pct =
    negativeCount > 0 ? round2(negativeSum / negativeCount) : null;

  return {
    totals: {
      total_records,
      open_records,
      resolved_records,
      positive,
      negative,
      neutral,
    },
    metrics: {
      winrate,
      avg_result_pct,
      avg_positive_pct,
      avg_negative_pct,
    },
  };
}

function groupByAction(records: SignalMemoryRecord[]) {
  const actions: Array<"ALLOW" | "WATCH" | "BLOCK"> = ["ALLOW", "WATCH", "BLOCK"];

  return actions.map((action) => {
    const subset = records.filter((r) => r.action === action);
    const base = computeBaseStats(subset);

    return {
      action,
      total: base.totals.total_records,
      resolved: base.totals.resolved_records,
      positive: base.totals.positive,
      negative: base.totals.negative,
      neutral: base.totals.neutral,
      winrate: base.metrics.winrate,
      avg_result_pct: base.metrics.avg_result_pct,
    };
  });
}

function groupByRegime(records: SignalMemoryRecord[]) {
  const map = new Map<string, SignalMemoryRecord[]>();

  for (const r of records) {
    const regime = safeStr(r.market_regime) ?? "UNKNOWN";
    const arr = map.get(regime) ?? [];
    arr.push(r);
    map.set(regime, arr);
  }

  return Array.from(map.entries()).map(([market_regime, subset]) => {
    const base = computeBaseStats(subset);

    return {
      market_regime,
      total: base.totals.total_records,
      resolved: base.totals.resolved_records,
      positive: base.totals.positive,
      negative: base.totals.negative,
      neutral: base.totals.neutral,
      winrate: base.metrics.winrate,
      avg_result_pct: base.metrics.avg_result_pct,
    };
  });
}

function buildResponse(
  input: Partial<StatsResponse> & Pick<StatsResponse, "ts" | "symbol" | "limit">
): StatsResponse {
  return {
    ok: Boolean(input.ok),
    ts: input.ts,
    version: input.version ?? XYVALA_VERSION,

    symbol: input.symbol ?? null,
    limit: input.limit,

    totals: {
      total_records: input.totals?.total_records ?? 0,
      open_records: input.totals?.open_records ?? 0,
      resolved_records: input.totals?.resolved_records ?? 0,
      positive: input.totals?.positive ?? 0,
      negative: input.totals?.negative ?? 0,
      neutral: input.totals?.neutral ?? 0,
    },

    metrics: {
      winrate: input.metrics?.winrate ?? null,
      avg_result_pct: input.metrics?.avg_result_pct ?? null,
      avg_positive_pct: input.metrics?.avg_positive_pct ?? null,
      avg_negative_pct: input.metrics?.avg_negative_pct ?? null,
    },

    breakdown: {
      by_action: input.breakdown?.by_action ?? [],
      by_regime: input.breakdown?.by_regime ?? [],
    },

    error: input.error ?? null,

    meta: {
      warnings: input.meta?.warnings ?? [],
    },
  };
}

/* ---------------- Handler ---------------- */

export async function GET(req: NextRequest) {
  const ts = NOW_ISO();
  const warnings: string[] = [];

  const auth = enforceApiPolicy(req);
  if (!auth.ok) {
    const res = buildResponse({
      ok: false,
      ts,
      symbol: null,
      limit: 0,
      error: auth.error,
      meta: { warnings: [] },
    });

    return NextResponse.json(res, {
      status: auth.status,
      headers: {
        "cache-control": "no-store",
        "x-xyvala-version": XYVALA_VERSION,
      },
    });
  }

  try {
    const sp = req.nextUrl.searchParams;

    const symbolRaw = safeStr(sp.get("symbol"));
    const symbol = symbolRaw ? sanitizeSymbol(symbolRaw) : null;
    const limit = parseLimit(sp.get("limit"));

    let records: SignalMemoryRecord[] = [];

    if (symbol) {
      records = await listMemoryBySymbol({
        symbol,
        limit,
        status: "all",
      });
    } else {
      records = await listRecentMemory({
        limit,
        status: "all",
      });
      warnings.push("global_stats_mode");
    }

    const base = computeBaseStats(records);

    const res = buildResponse({
      ok: true,
      ts,
      version: XYVALA_VERSION,

      symbol,
      limit,

      totals: base.totals,
      metrics: base.metrics,

      breakdown: {
        by_action: groupByAction(records),
        by_regime: groupByRegime(records),
      },

      error: null,

      meta: {
        warnings,
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
      symbol: null,
      limit: 0,
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
