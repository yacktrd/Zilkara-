// app/api/state/route.ts

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
  getStateService,
  type StateServiceResult,
} from "@/lib/xyvala/services/state-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const VERSION = "v1";

type Quote = "usd" | "usdt" | "eur";

type MarketRegime = "STABLE" | "TRANSITION" | "VOLATILE" | null;
type VolatilityState = "LOW" | "NORMAL" | "HIGH" | null;
type LiquidityState = "LOW" | "NORMAL" | "HIGH" | null;
type RiskMode = "LOW" | "MODERATE" | "HIGH" | null;
type ExecutionBias = "AGGRESSIVE" | "SELECTIVE" | "DEFENSIVE" | null;

type StateResponse = {
  ok: boolean;
  ts: string;
  version: string;
  state: {
    market_regime: MarketRegime;
    volatility_state: VolatilityState;
    liquidity_state: LiquidityState;
    risk_mode: RiskMode;
    execution_bias: ExecutionBias;
    stable_ratio: number | null;
    transition_ratio: number | null;
    volatile_ratio: number | null;
  };
  error: string | null;
  meta: {
    cache: "hit" | "miss" | "no-store";
    source: "state_cache" | "scan_snapshot" | "fallback";
    quote: Quote;
    warnings: string[];
  };
};

type AuthResult = ReturnType<typeof enforceApiPolicy>;
type AuthSuccess = Extract<AuthResult, { ok: true }>;
type UsageResult = ReturnType<typeof trackUsage> | null;

const nowIso = () => new Date().toISOString();

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeQuote(value: string | null): Quote {
  const s = safeStr(value).toLowerCase();
  if (s === "eur") return "eur";
  if (s === "usdt") return "usdt";
  return "usd";
}

function uniqueWarnings(...groups: Array<string[] | undefined | null>): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [...new Set(merged.filter((item) => typeof item === "string" && item.trim().length > 0))];
}

function parseNoStore(req: NextRequest): boolean {
  const value = safeStr(req.nextUrl.searchParams.get("noStore")).toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function normalizeVolatilityState(value: unknown): VolatilityState {
  const s = safeStr(value).toUpperCase();
  if (s === "LOW") return "LOW";
  if (s === "NORMAL") return "NORMAL";
  if (s === "HIGH") return "HIGH";
  return null;
}

function normalizeLiquidityState(value: unknown): LiquidityState {
  const s = safeStr(value).toUpperCase();
  if (s === "LOW") return "LOW";
  if (s === "NORMAL") return "NORMAL";
  if (s === "HIGH") return "HIGH";
  return null;
}

function normalizeRiskMode(value: unknown): RiskMode {
  const s = safeStr(value).toUpperCase();
  if (s === "LOW") return "LOW";
  if (s === "MODERATE") return "MODERATE";
  if (s === "HIGH") return "HIGH";
  return null;
}

function normalizeExecutionBias(value: unknown): ExecutionBias {
  const s = safeStr(value).toUpperCase();
  if (s === "AGGRESSIVE") return "AGGRESSIVE";
  if (s === "SELECTIVE") return "SELECTIVE";
  if (s === "DEFENSIVE") return "DEFENSIVE";
  return null;
}

function normalizeMarketRegime(value: unknown): MarketRegime {
  const s = safeStr(value).toUpperCase();
  if (s === "STABLE") return "STABLE";
  if (s === "TRANSITION") return "TRANSITION";
  if (s === "VOLATILE") return "VOLATILE";
  return null;
}

function toApiCache(value: StateServiceResult["source"], noStore: boolean): "hit" | "miss" | "no-store" {
  if (noStore) return "no-store";
  if (value === "state_cache") return "hit";
  return "miss";
}

function buildEmptyState() {
  return {
    market_regime: null as MarketRegime,
    volatility_state: null as VolatilityState,
    liquidity_state: null as LiquidityState,
    risk_mode: null as RiskMode,
    execution_bias: null as ExecutionBias,
    stable_ratio: null as number | null,
    transition_ratio: null as number | null,
    volatile_ratio: null as number | null,
  };
}

function buildStateResponse(
  input: {
    ts: string;
    quote: Quote;
    service: StateServiceResult;
    usageWarnings?: string[];
    noStore?: boolean;
  }
): StateResponse {
  const serviceState = input.service.state;

  return {
    ok: input.service.ok,
    ts: input.ts,
    version: VERSION,
    state: serviceState
      ? {
          market_regime: normalizeMarketRegime(serviceState.market_regime),
          volatility_state: normalizeVolatilityState(serviceState.volatility_state),
          liquidity_state: normalizeLiquidityState(serviceState.liquidity_state),
          risk_mode: normalizeRiskMode(serviceState.risk_mode),
          execution_bias: normalizeExecutionBias(serviceState.execution_bias),
          stable_ratio: serviceState.stable_ratio ?? null,
          transition_ratio: serviceState.transition_ratio ?? null,
          volatile_ratio: serviceState.volatile_ratio ?? null,
        }
      : buildEmptyState(),
    error: input.service.error,
    meta: {
      cache: toApiCache(input.service.source, input.noStore === true),
      source: input.service.source,
      quote: input.quote,
      warnings: uniqueWarnings(input.service.warnings, input.usageWarnings),
    },
  };
}

function respond(
  payload: StateResponse,
  status: number,
  auth: AuthSuccess,
  usage: UsageResult
): NextResponse {
  let res: NextResponse = NextResponse.json(payload, {
    status,
    headers: {
      "x-xyvala-version": VERSION,
      "cache-control": "no-store",
      "x-xyvala-cache": payload.meta.cache,
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
  const quote = normalizeQuote(req.nextUrl.searchParams.get("quote"));
  const noStore = parseNoStore(req);

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
      endpoint: "/api/state",
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
    const service = await getStateService({
      quote,
      noStore,
    });

    const payload = buildStateResponse({
      ts,
      quote,
      service,
      usageWarnings,
      noStore,
    });

    const status = payload.ok ? 200 : 503;

    return respond(payload, status, auth, usage);
  } catch (error) {
    const payload: StateResponse = {
      ok: false,
      ts,
      version: VERSION,
      state: buildEmptyState(),
      error:
        error instanceof Error && error.message
          ? error.message
          : "unknown_error",
      meta: {
        cache: noStore ? "no-store" : "miss",
        source: "fallback",
        quote,
        warnings: uniqueWarnings(
          usageWarnings,
          [
            error instanceof Error && error.message
              ? `route_exception:${error.message}`
              : "route_exception",
          ]
        ),
      },
    };

    return respond(payload, 500, auth, usage);
  }
}
