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
import {
  resolveAccessScope,
  buildAccessMeta,
} from "@/lib/xyvala/access";
import type { AccessMeta, AccessScope } from "@/lib/xyvala/access";
import type { Quote } from "@/lib/xyvala/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const VERSION = "v1";

type MarketRegime = "STABLE" | "TRANSITION" | "VOLATILE" | null;
type VolatilityState = "LOW" | "NORMAL" | "HIGH" | null;
type LiquidityState = "LOW" | "NORMAL" | "HIGH" | null;
type RiskMode = "LOW" | "MODERATE" | "HIGH" | null;
type ExecutionBias = "AGGRESSIVE" | "SELECTIVE" | "DEFENSIVE" | null;

type StatePayload = {
  market_regime: MarketRegime;
  volatility_state: VolatilityState;
  liquidity_state: LiquidityState;
  risk_mode: RiskMode;
  execution_bias: ExecutionBias;
  stable_ratio: number | null;
  transition_ratio: number | null;
  volatile_ratio: number | null;
};

type StateResponse = {
  ok: boolean;
  ts: string;
  version: string;
  state: StatePayload;
  message: string | null;
  error: string | null;
  meta: {
    cache: "hit" | "miss" | "no-store";
    source: "state_cache" | "scan_snapshot" | "fallback";
    quote: Quote;
    warnings: string[];
    access: AccessMeta;
  };
};

type AuthResult = ReturnType<typeof enforceApiPolicy>;
type AuthSuccess = Extract<AuthResult, { ok: true }>;
type UsageResult = ReturnType<typeof trackUsage> | null;

function nowIso(): string {
  return new Date().toISOString();
}

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeNum(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function uniqueWarnings(...groups: Array<string[] | undefined | null>): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [
    ...new Set(
      merged.filter((item) => typeof item === "string" && item.trim().length > 0)
    ),
  ];
}

function parseNoStore(req: NextRequest): boolean {
  const value = safeStr(req.nextUrl.searchParams.get("noStore")).toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function normalizeQuote(value: string | null): Quote {
  const s = safeStr(value).toLowerCase();
  if (s === "eur") return "eur";
  if (s === "usdt") return "usdt";
  return "usd";
}

function normalizeMarketRegime(value: unknown): MarketRegime {
  const s = safeStr(value).toUpperCase();
  if (s === "STABLE") return "STABLE";
  if (s === "TRANSITION") return "TRANSITION";
  if (s === "VOLATILE") return "VOLATILE";
  return null;
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

function buildEmptyState(): StatePayload {
  return {
    market_regime: null,
    volatility_state: null,
    liquidity_state: null,
    risk_mode: null,
    execution_bias: null,
    stable_ratio: null,
    transition_ratio: null,
    volatile_ratio: null,
  };
}

function toStatePayload(service: StateServiceResult | null | undefined): StatePayload {
  return {
    market_regime: normalizeMarketRegime(service?.state?.market_regime),
    volatility_state: normalizeVolatilityState(service?.state?.volatility_state),
    liquidity_state: normalizeLiquidityState(service?.state?.liquidity_state),
    risk_mode: normalizeRiskMode(service?.state?.risk_mode),
    execution_bias: normalizeExecutionBias(service?.state?.execution_bias),
    stable_ratio: safeNum(service?.state?.stable_ratio),
    transition_ratio: safeNum(service?.state?.transition_ratio),
    volatile_ratio: safeNum(service?.state?.volatile_ratio),
  };
}

function normalizeSource(
  value: StateServiceResult["source"] | string | undefined
): "state_cache" | "scan_snapshot" | "fallback" {
  if (value === "state_cache") return "state_cache";
  if (value === "scan_snapshot") return "scan_snapshot";
  return "fallback";
}

function buildHiddenStateResponse(input: {
  ts: string;
  quote: Quote;
  noStore: boolean;
  access: AccessMeta;
  usageWarnings?: string[];
}): StateResponse {
  return {
    ok: true,
    ts: input.ts,
    version: VERSION,
    state: buildEmptyState(),
    message: "state_hidden_by_access_compartment",
    error: null,
    meta: {
      cache: input.noStore ? "no-store" : "miss",
      source: "fallback",
      quote: input.quote,
      warnings: uniqueWarnings(input.usageWarnings, [
        "state_hidden_by_access_compartment",
      ]),
      access: input.access,
    },
  };
}

function buildErrorStateResponse(input: {
  ts: string;
  quote: Quote;
  noStore: boolean;
  access: AccessMeta;
  error: string | null;
  usageWarnings?: string[];
}): StateResponse {
  return {
    ok: false,
    ts: input.ts,
    version: VERSION,
    state: buildEmptyState(),
    message: null,
    error: input.error,
    meta: {
      cache: input.noStore ? "no-store" : "miss",
      source: "fallback",
      quote: input.quote,
      warnings: uniqueWarnings(input.usageWarnings),
      access: input.access,
    },
  };
}

function buildStateResponse(input: {
  ts: string;
  quote: Quote;
  service: StateServiceResult;
  noStore: boolean;
  access: AccessMeta;
  usageWarnings?: string[];
}): StateResponse {
  const source = normalizeSource(input.service.source);

  return {
    ok: Boolean(input.service.ok),
    ts: input.ts,
    version: VERSION,
    state: toStatePayload(input.service),
    message: null,
    error: input.service.error ?? null,
    meta: {
      cache: input.noStore ? "no-store" : source === "state_cache" ? "hit" : "miss",
      source,
      quote: input.quote,
      warnings: uniqueWarnings(input.service.warnings, input.usageWarnings),
      access: input.access,
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
      "cache-control": "no-store",
      "x-xyvala-version": VERSION,
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

function canExposeState(accessScope: AccessScope): boolean {
  return accessScope.showMarketContext;
}

export async function GET(req: NextRequest) {
  const ts = nowIso();
  const quote = normalizeQuote(req.nextUrl.searchParams.get("quote"));
  const noStore = parseNoStore(req);

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
    if (!canExposeState(accessScope)) {
      const payload = buildHiddenStateResponse({
        ts,
        quote,
        noStore,
        access: accessMeta,
        usageWarnings,
      });

      return respond(payload, 200, auth, usage);
    }

    const service = await getStateService({
      quote,
      noStore,
    });

    const payload = buildStateResponse({
      ts,
      quote,
      service,
      noStore,
      access: accessMeta,
      usageWarnings,
    });

    return respond(payload, payload.ok ? 200 : 503, auth, usage);
  } catch (error) {
    const payload = buildErrorStateResponse({
      ts,
      quote,
      noStore,
      access: accessMeta,
      error:
        error instanceof Error && error.message
          ? error.message
          : "unknown_error",
      usageWarnings: uniqueWarnings(usageWarnings, [
        error instanceof Error && error.message
          ? `route_exception:${error.message}`
          : "route_exception",
      ]),
    });

    return respond(payload, 500, auth, usage);
  }
}
