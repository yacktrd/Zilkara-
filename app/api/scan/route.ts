// app/api/scan/route.ts

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
  getScanService,
  type ScanServiceResult,
  type ScanServiceItem,
} from "@/lib/xyvala/services/scan-service";
import {
  resolveAccessScope,
  applyScanCompartment,
  buildAccessMeta,
} from "@/lib/xyvala/access";
import type { AccessMeta } from "@/lib/xyvala/access";
import type { Quote } from "@/lib/xyvala/snapshot";
import type { Regime, ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const XYVALA_VERSION = "v1";
const DEFAULT_QUOTE: Quote = "usd";

type SortKey = "score" | "price";
type SortOrder = "asc" | "desc";

type AuthResult = ReturnType<typeof enforceApiPolicy>;
type AuthSuccess = Extract<AuthResult, { ok: true }>;
type UsageResult = ReturnType<typeof trackUsage> | null;

type ScanResponse = {
  ok: boolean;
  ts: string;
  version: string;
  source: "scan" | "fallback" | "cache";
  market: "crypto";
  quote: Quote;
  count: number;
  data: ScanAsset[];
  context: {
    market_regime: Regime;
    stable_ratio: number;
    transition_ratio: number;
    volatile_ratio: number;
  };
  meta: {
    limit: number;
    applied_limit: number;
    sort: SortKey;
    order: SortOrder;
    q: string | null;
    cache: "hit" | "miss" | "no-store";
    warnings: string[];
    access: AccessMeta;
  };
  error: string | null;
};

const nowIso = () => new Date().toISOString();

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeQuote(value: string | null): Quote {
  const q = safeStr(value).toLowerCase();
  if (q === "eur") return "eur";
  if (q === "usdt") return "usdt";
  return DEFAULT_QUOTE;
}

function normalizeSort(value: string | null): {
  sort: SortKey;
  order: SortOrder;
  sortLabel: string;
} {
  const s = safeStr(value).toLowerCase();

  if (s === "price") {
    return { sort: "price", order: "desc", sortLabel: "price_desc" };
  }

  if (s === "price_desc") {
    return { sort: "price", order: "desc", sortLabel: "price_desc" };
  }

  if (s === "price_asc") {
    return { sort: "price", order: "asc", sortLabel: "price_asc" };
  }

  if (s === "score_asc") {
    return { sort: "score", order: "asc", sortLabel: "score_asc" };
  }

  return { sort: "score", order: "desc", sortLabel: "score_desc" };
}

function parseLimit(value: string | null): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return 100;

  return Math.max(1, Math.min(250, Math.trunc(parsed)));
}

function parseBool(value: string | null): boolean {
  const s = safeStr(value).toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function uniqueWarnings(...groups: Array<string[] | undefined | null>): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [
    ...new Set(
      merged.filter((item) => typeof item === "string" && item.trim().length > 0)
    ),
  ];
}

function toApiAsset(item: ScanServiceItem): ScanAsset {
  return {
    id: item.id,
    symbol: item.symbol,
    name: item.name,
    price: item.price,
    chg_24h_pct: item.chg_24h_pct,
    confidence_score: item.confidence_score,
    score_delta: safeNullableNumber(item.score_delta),
    score_trend: safeNullableString(item.score_trend),
    regime: item.regime,
    market_cap: item.market_cap,
    volume_24h: item.volume_24h,
    binance_url: item.binance_url,
  };
}

function computeContext(data: ScanAsset[]) {
  const total = data.length || 1;

  let stable = 0;
  let transition = 0;
  let volatile = 0;

  for (const asset of data) {
    const regime = safeStr(asset.regime).toUpperCase();

    if (regime === "STABLE") stable += 1;
    else if (regime === "TRANSITION") transition += 1;
    else if (regime === "VOLATILE") volatile += 1;
  }

  const stable_ratio = stable / total;
  const transition_ratio = transition / total;
  const volatile_ratio = volatile / total;

  let market_regime: Regime = "TRANSITION";
  const max = Math.max(stable_ratio, transition_ratio, volatile_ratio);

  if (max === stable_ratio) {
    market_regime = "STABLE";
  } else if (max === volatile_ratio) {
    market_regime = "VOLATILE";
  }

  return {
    market_regime,
    stable_ratio,
    transition_ratio,
    volatile_ratio,
  };
}

function toApiSource(source: ScanServiceResult["source"]): "scan" | "fallback" | "cache" {
  if (source === "scan_cache") return "cache";
  if (source === "fallback") return "fallback";
  return "scan";
}

function toApiCache(
  source: ScanServiceResult["source"],
  noStore: boolean
): "hit" | "miss" | "no-store" {
  if (noStore) return "no-store";
  return source === "scan_cache" ? "hit" : "miss";
}

function buildResponse(input: {
  ts: string;
  quote: Quote;
  sort: SortKey;
  order: SortOrder;
  requestedLimit: number;
  appliedLimit: number;
  q: string | null;
  noStore: boolean;
  service: ScanServiceResult;
  access: AccessMeta;
  usageWarnings?: string[];
}): ScanResponse {
  const compartmentedData = applyScanCompartment(
    input.service.data.map(toApiAsset),
    {
      compartment: input.access.compartment,
      visiblePercent: input.access.visiblePercent,
      maxAssets: input.access.maxAssets,
      showScoreDelta:
        input.access.compartment === "trader_60" ||
        input.access.compartment === "full_100",
      showScoreTrend:
        input.access.compartment !== "public_10",
      showMarketContext:
        input.access.compartment !== "public_10",
      showAdvancedStats:
        input.access.compartment === "trader_60" ||
        input.access.compartment === "full_100",
      showHistory:
        input.access.compartment === "trader_60" ||
        input.access.compartment === "full_100",
      showDecision: input.access.compartment === "full_100",
      showAdmin: input.access.compartment === "full_100",
    }
  );

  const context = computeContext(compartmentedData);

  return {
    ok: input.service.ok,
    ts: input.ts,
    version: XYVALA_VERSION,
    source: toApiSource(input.service.source),
    market: "crypto",
    quote: input.quote,
    count: compartmentedData.length,
    data: compartmentedData,
    context,
    meta: {
      limit: input.requestedLimit,
      applied_limit: input.appliedLimit,
      sort: input.sort,
      order: input.order,
      q: input.q,
      cache: toApiCache(input.service.source, input.noStore),
      warnings: uniqueWarnings(input.service.warnings, input.usageWarnings),
      access: input.access,
    },
    error: input.service.error,
  };
}

function respond(
  payload: ScanResponse,
  status: number,
  auth: AuthSuccess,
  usage: UsageResult
) {
  let res: NextResponse = NextResponse.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-xyvala-version": XYVALA_VERSION,
      "x-xyvala-cache": payload.meta.cache,
      "x-xyvala-access-compartment": payload.meta.access.compartment,
      "x-xyvala-visible-percent": String(payload.meta.access.visiblePercent),
    },
  });

  res = applyApiAuthHeaders(res, auth);

  if (usage) {
    res = applyQuotaHeaders(res, usage);
  }

  return res;
}

export async function GET(req: NextRequest) {
  const ts = nowIso();
  const auth = enforceApiPolicy(req);

  if (!auth.ok) {
    return buildApiKeyErrorResponse(auth.error, auth.status);
  }

  const accessScope = resolveAccessScope(auth);
  const accessMeta = buildAccessMeta(accessScope);

  let usage: UsageResult = null;
  let usageWarnings: string[] = [];

  try {
    usage = trackUsage({
      key: auth.key,
      keyType: auth.keyType,
      endpoint: "/api/scan",
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

    const quote = normalizeQuote(sp.get("quote"));
    const { sort, order, sortLabel } = normalizeSort(sp.get("sort"));
    const requestedLimit = parseLimit(sp.get("limit"));
    const q = safeStr(sp.get("q")).toLowerCase() || null;
    const noStore = parseBool(sp.get("noStore"));

    const appliedLimit = Math.min(requestedLimit, accessScope.maxAssets);

    const service = await getScanService({
      quote,
      sort: sortLabel,
      limit: appliedLimit,
      q,
      noStore,
    });

    const payload = buildResponse({
      ts,
      quote,
      sort,
      order,
      requestedLimit,
      appliedLimit,
      q,
      noStore,
      service,
      access: accessMeta,
      usageWarnings,
    });

    const status = payload.ok ? 200 : 503;

    return respond(payload, status, auth, usage);
  } catch (error) {
    const payload: ScanResponse = {
      ok: false,
      ts,
      version: XYVALA_VERSION,
      source: "fallback",
      market: "crypto",
      quote: DEFAULT_QUOTE,
      count: 0,
      data: [],
      context: {
        market_regime: "TRANSITION",
        stable_ratio: 0,
        transition_ratio: 0,
        volatile_ratio: 0,
      },
      meta: {
        limit: 0,
        applied_limit: 0,
        sort: "score",
        order: "desc",
        q: null,
        cache: "no-store",
        warnings: uniqueWarnings(
          usageWarnings,
          [
            error instanceof Error && error.message
              ? `route_exception:${error.message}`
              : "route_exception",
          ]
        ),
        access: accessMeta,
      },
      error:
        error instanceof Error && error.message
          ? error.message
          : "unknown_error",
    };

    return respond(payload, 500, auth, usage);
  }
}
