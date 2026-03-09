// app/api/state/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  enforceApiPolicy,
  applyApiAuthHeaders,
  buildApiKeyErrorResponse,
} from "@/lib/xyvala/auth";
import { trackUsage } from "@/lib/xyvala/usage";
import { getFromCache, setToCache } from "@/lib/xyvala/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XYVALA_VERSION = "v1";
const STATE_TTL_MS = 30_000;

type MarketRegime = "STABLE" | "TRANSITION" | "VOLATILE" | null;
type VolatilityState = "LOW" | "NORMAL" | "HIGH" | null;
type LiquidityState = "LOW" | "NORMAL" | "HIGH" | null;
type RiskMode = "LOW" | "MODERATE" | "HIGH" | null;
type ExecutionBias = "AGGRESSIVE" | "SELECTIVE" | "DEFENSIVE" | null;
type Quote = "usd" | "usdt" | "eur";

type ContextLikeResponse = {
  ok: boolean;
  ts?: string;
  version?: string;
  market_regime?: MarketRegime;
  stable_ratio?: number | null;
  transition_ratio?: number | null;
  volatile_ratio?: number | null;
  message?: string | null;
  error?: string | null;
  meta?: {
    cache?: "hit" | "miss" | "no-store";
    warnings?: string[];
  };
};

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
    source: "context_cache" | "context_fetch" | "fallback";
    quote: Quote;
    warnings: string[];
  };
};

/* -------------------------------------------------------------------------- */
/*                                    Utils                                   */
/* -------------------------------------------------------------------------- */

const NOW_ISO = () => new Date().toISOString();

function safeNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeRegime(v: unknown): MarketRegime {
  const s = safeStr(v).toUpperCase();
  if (s === "STABLE" || s === "TRANSITION" || s === "VOLATILE") return s;
  return null;
}

function normalizeQuote(v: string | null): Quote {
  const s = (v ?? "").trim().toLowerCase();
  if (s === "usdt" || s === "eur") return s;
  return "usd";
}

function parseNoStore(req: NextRequest): boolean {
  const value = req.nextUrl.searchParams.get("noStore");
  return value === "1" || value === "true";
}

function uniqueWarnings(...groups: Array<string[] | undefined | null>): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [...new Set(merged.filter((item) => typeof item === "string" && item.trim().length > 0))];
}

function hasUsableContext(ctx: ContextLikeResponse | null | undefined): boolean {
  if (!ctx || ctx.ok !== true) return false;

  return (
    normalizeRegime(ctx.market_regime) !== null ||
    safeNum(ctx.stable_ratio) !== null ||
    safeNum(ctx.transition_ratio) !== null ||
    safeNum(ctx.volatile_ratio) !== null
  );
}

function inferVolatilityState(input: {
  market_regime: MarketRegime;
  volatile_ratio: number | null;
  transition_ratio: number | null;
}): VolatilityState {
  if (input.market_regime === "VOLATILE") return "HIGH";
  if (input.volatile_ratio !== null && input.volatile_ratio >= 0.35) return "HIGH";
  if (input.transition_ratio !== null && input.transition_ratio >= 0.45) return "NORMAL";
  if (input.market_regime === "STABLE") return "LOW";
  return "NORMAL";
}

function inferLiquidityState(input: {
  stable_ratio: number | null;
  transition_ratio: number | null;
  volatile_ratio: number | null;
}): LiquidityState {
  if (input.stable_ratio !== null && input.stable_ratio >= 0.5) return "HIGH";
  if (input.volatile_ratio !== null && input.volatile_ratio >= 0.45) return "LOW";
  if (input.transition_ratio !== null && input.transition_ratio >= 0.35) return "NORMAL";
  return "NORMAL";
}

function inferRiskMode(input: {
  market_regime: MarketRegime;
  volatility_state: VolatilityState;
  liquidity_state: LiquidityState;
}): RiskMode {
  if (input.market_regime === "VOLATILE") return "HIGH";
  if (input.volatility_state === "HIGH" && input.liquidity_state === "LOW") return "HIGH";
  if (input.market_regime === "STABLE" && input.liquidity_state === "HIGH") return "LOW";
  return "MODERATE";
}

function inferExecutionBias(input: {
  market_regime: MarketRegime;
  risk_mode: RiskMode;
  liquidity_state: LiquidityState;
}): ExecutionBias {
  if (input.risk_mode === "HIGH") return "DEFENSIVE";
  if (input.market_regime === "STABLE" && input.liquidity_state === "HIGH") return "AGGRESSIVE";
  return "SELECTIVE";
}

function buildStateResponse(
  input: Partial<StateResponse> &
    Pick<StateResponse, "ts"> & {
      quote?: Quote;
    }
): StateResponse {
  return {
    ok: Boolean(input.ok),
    ts: input.ts,
    version: input.version ?? XYVALA_VERSION,

    state: {
      market_regime: input.state?.market_regime ?? null,
      volatility_state: input.state?.volatility_state ?? null,
      liquidity_state: input.state?.liquidity_state ?? null,
      risk_mode: input.state?.risk_mode ?? null,
      execution_bias: input.state?.execution_bias ?? null,
      stable_ratio: input.state?.stable_ratio ?? null,
      transition_ratio: input.state?.transition_ratio ?? null,
      volatile_ratio: input.state?.volatile_ratio ?? null,
    },

    error: input.error ?? null,

    meta: {
      cache: input.meta?.cache ?? "miss",
      source: input.meta?.source ?? "fallback",
      quote: input.meta?.quote ?? input.quote ?? "usd",
      warnings: input.meta?.warnings ?? [],
    },
  };
}

function stateCacheKey(quote: Quote) {
  return `xyvala:state:${XYVALA_VERSION}:quote=${quote}`;
}

/* -------------------------------------------------------------------------- */
/*                                  Handler                                   */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest) {
  const ts = NOW_ISO();
  const routeWarnings: string[] = [];

  const auth = enforceApiPolicy(req);

  if (!auth.ok) {
    return buildApiKeyErrorResponse(auth.error, auth.status);
  }

  try {
    await trackUsage({
      apiKey: auth.key,
      endpoint: "/api/state",
    });
  } catch {
    routeWarnings.push("usage_tracking_failed");
  }

  try {
    const noStore = parseNoStore(req);
    const quote = normalizeQuote(req.nextUrl.searchParams.get("quote"));
    const cacheKey = stateCacheKey(quote);

    if (!noStore) {
      const hit = await getFromCache<StateResponse>(cacheKey, STATE_TTL_MS);

      if (hit && hit.ok === true) {
        const res = buildStateResponse({
          ...hit,
          ts,
          quote,
          meta: {
            ...hit.meta,
            cache: "hit",
            source: "context_cache",
            quote,
            warnings: uniqueWarnings(hit.meta?.warnings, routeWarnings),
          },
        });

        return applyApiAuthHeaders(
          NextResponse.json(res, {
            status: 200,
            headers: {
              "cache-control": "no-store",
              "x-xyvala-version": XYVALA_VERSION,
              "x-xyvala-cache": "hit",
            },
          }),
          auth
        );
      }

      if (hit && hit.ok !== true) {
        routeWarnings.push("stale_state_cache_ignored");
      }
    }

    const origin = new URL(req.url).origin;
    const contextUrl = new URL("/api/context", origin);
    contextUrl.searchParams.set("quote", quote);

    if (noStore) {
      contextUrl.searchParams.set("noStore", "1");
    }

    const contextRes = await fetch(contextUrl.toString(), {
      method: "GET",
      headers: {
        "x-xyvala-key": auth.key,
      },
      cache: "no-store",
    });

    if (!contextRes.ok) {
      const res = buildStateResponse({
        ok: false,
        ts,
        quote,
        error: `context_http_${contextRes.status}`,
        meta: {
          cache: noStore ? "no-store" : "miss",
          source: "fallback",
          quote,
          warnings: uniqueWarnings(routeWarnings, ["context_request_failed"]),
        },
      });

      return applyApiAuthHeaders(
        NextResponse.json(res, {
          status: 503,
          headers: {
            "cache-control": "no-store",
            "x-xyvala-version": XYVALA_VERSION,
            "x-xyvala-cache": noStore ? "no-store" : "miss",
          },
        }),
        auth
      );
    }

    const contextJson = (await contextRes.json()) as ContextLikeResponse;

    if (!hasUsableContext(contextJson)) {
      const res = buildStateResponse({
        ok: false,
        ts,
        quote,
        error: contextJson.error ?? "context_unavailable",
        meta: {
          cache: noStore ? "no-store" : "miss",
          source: "fallback",
          quote,
          warnings: uniqueWarnings(
            routeWarnings,
            contextJson.meta?.warnings,
            ["context_empty_or_invalid"]
          ),
        },
      });

      return applyApiAuthHeaders(
        NextResponse.json(res, {
          status: 503,
          headers: {
            "cache-control": "no-store",
            "x-xyvala-version": XYVALA_VERSION,
            "x-xyvala-cache": noStore ? "no-store" : "miss",
          },
        }),
        auth
      );
    }

    const market_regime = normalizeRegime(contextJson.market_regime);
    const stable_ratio = safeNum(contextJson.stable_ratio);
    const transition_ratio = safeNum(contextJson.transition_ratio);
    const volatile_ratio = safeNum(contextJson.volatile_ratio);

    const volatility_state = inferVolatilityState({
      market_regime,
      volatile_ratio,
      transition_ratio,
    });

    const liquidity_state = inferLiquidityState({
      stable_ratio,
      transition_ratio,
      volatile_ratio,
    });

    const risk_mode = inferRiskMode({
      market_regime,
      volatility_state,
      liquidity_state,
    });

    const execution_bias = inferExecutionBias({
      market_regime,
      risk_mode,
      liquidity_state,
    });

    const res = buildStateResponse({
      ok: true,
      ts,
      quote,
      state: {
        market_regime,
        volatility_state,
        liquidity_state,
        risk_mode,
        execution_bias,
        stable_ratio,
        transition_ratio,
        volatile_ratio,
      },
      error: null,
      meta: {
        cache: noStore ? "no-store" : "miss",
        source: "context_fetch",
        quote,
        warnings: uniqueWarnings(routeWarnings, contextJson.meta?.warnings),
      },
    });

    if (!noStore) {
      await setToCache(cacheKey, res);
    }

    return applyApiAuthHeaders(
      NextResponse.json(res, {
        status: 200,
        headers: {
          "cache-control": "no-store",
          "x-xyvala-version": XYVALA_VERSION,
          "x-xyvala-cache": noStore ? "no-store" : "miss",
        },
      }),
      auth
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "unknown_error";

    const quote = normalizeQuote(req.nextUrl.searchParams.get("quote"));

    const res = buildStateResponse({
      ok: false,
      ts,
      quote,
      error: message,
      meta: {
        cache: "no-store",
        source: "fallback",
        quote,
        warnings: uniqueWarnings(routeWarnings, ["route_exception"]),
      },
    });

    return applyApiAuthHeaders(
      NextResponse.json(res, {
        status: 500,
        headers: {
          "cache-control": "no-store",
          "x-xyvala-version": XYVALA_VERSION,
          "x-xyvala-cache": "no-store",
        },
      }),
      auth
    );
  }
}
