// app/api/stats/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  enforceApiPolicy,
  applyApiAuthHeaders,
  buildApiKeyErrorResponse,
} from "@/lib/xyvala/auth";
import {
  trackUsage,
  applyQuotaHeaders,
} from "@/lib/xyvala/usage";
import {
  listMemoryBySymbol,
  listRecentMemory,
  type SignalMemoryRecord,
} from "@/lib/xyvala/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const XYVALA_VERSION = "v1";
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 5_000;

type Action = "ALLOW" | "WATCH" | "BLOCK";

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
      action: Action;
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

type AuthResult = ReturnType<typeof enforceApiPolicy>;
type AuthSuccess = Extract<AuthResult, { ok: true }>;
type UsageResult = ReturnType<typeof trackUsage> | null;

type NormalizedRecord = {
  action: Action | null;
  market_regime: string;
  status: "open" | "resolved" | "unknown";
  observed_result_pct: number | null;
};

const nowIso = () => new Date().toISOString();

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeNum(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function round2(value: number | null): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

function uniqueWarnings(...groups: Array<string[] | undefined | null>): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [...new Set(merged.filter((item) => typeof item === "string" && item.trim().length > 0))];
}

function sanitizeSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
}

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return clamp(Math.trunc(parsed), 1, MAX_LIMIT);
}

function normalizeAction(value: unknown): Action | null {
  const action = safeStr(value).toUpperCase();

  if (action === "ALLOW") return "ALLOW";
  if (action === "WATCH") return "WATCH";
  if (action === "BLOCK") return "BLOCK";

  return null;
}

function normalizeRegime(value: unknown): string {
  const regime = safeStr(value).toUpperCase();
  return regime || "UNKNOWN";
}

function normalizeStatus(value: unknown): "open" | "resolved" | "unknown" {
  const status = safeStr(value).toLowerCase();

  if (status === "open") return "open";
  if (status === "resolved") return "resolved";

  return "unknown";
}

function normalizeRecord(record: SignalMemoryRecord): NormalizedRecord {
  return {
    action: normalizeAction(record.action),
    market_regime: normalizeRegime(record.market_regime),
    status: normalizeStatus(record.status),
    observed_result_pct: safeNum(record.observed_result_pct),
  };
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

function computeBaseStats(records: NormalizedRecord[]) {
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

  for (const record of records) {
    if (record.status === "open") {
      open_records += 1;
    }

    if (record.status === "resolved") {
      resolved_records += 1;
    }

    const observedResult = record.observed_result_pct;

    if (observedResult !== null) {
      resultSum += observedResult;
      resultCount += 1;

      if (observedResult > 0) {
        positive += 1;
        positiveSum += observedResult;
        positiveCount += 1;
      } else if (observedResult < 0) {
        negative += 1;
        negativeSum += observedResult;
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

function groupByAction(records: NormalizedRecord[]) {
  const actions: Action[] = ["ALLOW", "WATCH", "BLOCK"];

  return actions.map((action) => {
    const subset = records.filter((record) => record.action === action);
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

function groupByRegime(records: NormalizedRecord[]) {
  const buckets = new Map<string, NormalizedRecord[]>();

  for (const record of records) {
    const current = buckets.get(record.market_regime) ?? [];
    current.push(record);
    buckets.set(record.market_regime, current);
  }

  return Array.from(buckets.entries())
    .map(([market_regime, subset]) => {
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
    })
    .sort((a, b) => b.total - a.total || a.market_regime.localeCompare(b.market_regime));
}

function respond(
  payload: StatsResponse,
  status: number,
  auth: AuthSuccess,
  usage: UsageResult
) {
  let res: NextResponse = NextResponse.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-xyvala-version": XYVALA_VERSION,
    },
  });

  res = applyApiAuthHeaders(res, auth);

  if (usage) {
    res = applyQuotaHeaders(res, usage);
  }

  return res;
}

/* ---------------- Handler ---------------- */

export async function GET(req: NextRequest) {
  const ts = nowIso();

  const auth = enforceApiPolicy(req);
  if (!auth.ok) {
    return buildApiKeyErrorResponse(auth.error, auth.status);
  }

  let usage: UsageResult = null;
  let usageWarnings: string[] = [];

  try {
    usage = trackUsage({
      key: auth.key,
      keyType: auth.keyType,
      endpoint: "/api/stats",
      planOverride: auth.plan,
    });
  } catch (error) {
    usageWarnings = uniqueWarnings([
      error instanceof Error && error.message
        ? `usage_track_failed:${error.message}`
        : "usage_track_failed",
    ]);
  }

  try {
    const sp = req.nextUrl.searchParams;

    const symbolRaw = safeStr(sp.get("symbol"));
    const symbol = symbolRaw ? sanitizeSymbol(symbolRaw) : null;
    const limit = parseLimit(sp.get("limit"));

    let rawRecords: SignalMemoryRecord[] = [];
    let routeWarnings: string[] = [...usageWarnings];

    if (symbol) {
      rawRecords = await listMemoryBySymbol({
        symbol,
        limit,
        status: "all",
      });
    } else {
      rawRecords = await listRecentMemory({
        limit,
        status: "all",
      });

      routeWarnings = uniqueWarnings(routeWarnings, ["global_stats_mode"]);
    }

    const records = rawRecords.map(normalizeRecord);
    const base = computeBaseStats(records);

    const payload = buildResponse({
      ok: true,
      ts,
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
        warnings: routeWarnings,
      },
    });

    return respond(payload, 200, auth, usage);
  } catch (error) {
    const payload = buildResponse({
      ok: false,
      ts,
      symbol: null,
      limit: 0,
      error:
        error instanceof Error && error.message
          ? error.message
          : "unknown_error",
      meta: {
        warnings: uniqueWarnings(
          usageWarnings,
          [
            error instanceof Error && error.message
              ? `route_exception:${error.message}`
              : "route_exception",
          ]
        ),
      },
    });

    return respond(payload, 500, auth, usage);
  }
}
