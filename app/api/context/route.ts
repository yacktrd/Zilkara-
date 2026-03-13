// app/api/context/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  enforceApiPolicy,
  buildApiKeyErrorResponse,
  applyApiAuthHeaders,
} from "@/lib/xyvala/auth";
import {
  trackUsage,
  applyQuotaHeaders,
} from "@/lib/xyvala/usage";
import { xyvalaServerFetch } from "@/lib/xyvala/server-client";
import {
  scanKey,
  getFromCache,
  setToCache,
  type ScanSnapshot,
} from "@/lib/xyvala/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const XYVALA_VERSION = "v1";
const TTL_MS = 45_000;
const CANONICAL_LIMIT = 250;

type Regime = "STABLE" | "TRANSITION" | "VOLATILE" | null;

type ContextResponse = {
  ok: boolean;
  ts: string;
  version: string;

  market_regime: Regime;
  stable_ratio: number | null;
  transition_ratio: number | null;
  volatile_ratio: number | null;

  message: string | null;
  error: string | null;

  source: "scan_cache" | "context_cache" | "scan_self_heal";
  meta: {
    scan_cache_key: string;
    context_cache_key: string;
    cache: "hit" | "miss" | "no-store";
    warnings: string[];
  };
};

type ScanRouteResponse = {
  ok?: boolean;
  ts?: string;
  version?: string;
  source?: string;
  market?: string;
  quote?: string;
  count?: number;
  data?: unknown[];
  context?: {
    market_regime?: unknown;
    stable_ratio?: unknown;
    transition_ratio?: unknown;
    volatile_ratio?: unknown;
  };
  meta?: {
    limit?: unknown;
    sort?: unknown;
    order?: unknown;
    q?: unknown;
    warnings?: unknown;
  };
  error?: string | null;
};

type AuthResult = ReturnType<typeof enforceApiPolicy>;
type AuthSuccess = Extract<AuthResult, { ok: true }>;
type UsageResult = ReturnType<typeof trackUsage> | null;

const nowIso = () => new Date().toISOString();

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeNum(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function uniqueWarnings(...groups: Array<string[] | undefined | null>): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [...new Set(merged.filter((item) => typeof item === "string" && item.trim().length > 0))];
}

function normalizeRegime(value: unknown): Regime {
  const s = safeStr(value).toUpperCase();
  if (s === "STABLE") return "STABLE";
  if (s === "TRANSITION") return "TRANSITION";
  if (s === "VOLATILE") return "VOLATILE";
  return null;
}

function buildContextResponse(
  input: Partial<ContextResponse> & Pick<ContextResponse, "ts">
): ContextResponse {
  return {
    ok: Boolean(input.ok),
    ts: input.ts,
    version: input.version ?? XYVALA_VERSION,

    market_regime: input.market_regime ?? null,
    stable_ratio: input.stable_ratio ?? null,
    transition_ratio: input.transition_ratio ?? null,
    volatile_ratio: input.volatile_ratio ?? null,

    message: input.message ?? null,
    error: input.error ?? null,

    source: input.source ?? "scan_cache",
    meta: {
      scan_cache_key: input.meta?.scan_cache_key ?? "",
      context_cache_key: input.meta?.context_cache_key ?? "",
      cache: input.meta?.cache ?? "miss",
      warnings: input.meta?.warnings ?? [],
    },
  };
}

function extractContextFromSnapshot(snapshot: ScanSnapshot) {
  return {
    market_regime: normalizeRegime(snapshot.context?.market_regime),
    stable_ratio: safeNum(snapshot.context?.stable_ratio),
    transition_ratio: safeNum(snapshot.context?.transition_ratio),
    volatile_ratio: safeNum(snapshot.context?.volatile_ratio),
  };
}

function normalizeScanSnapshot(input: ScanRouteResponse): ScanSnapshot | null {
  if (!input?.ok) return null;
  if (!Array.isArray(input.data)) return null;
  if (!input.context || typeof input.context !== "object") return null;

  return {
    ok: true,
    ts: safeStr(input.ts) || nowIso(),
    version: safeStr(input.version) || XYVALA_VERSION,
    source:
      input.source === "cache" || input.source === "fallback"
        ? input.source
        : "scan",
    market: safeStr(input.market) || "crypto",
    quote: safeStr(input.quote) || "usd",
    count:
      typeof input.count === "number" && Number.isFinite(input.count)
        ? Math.max(0, Math.trunc(input.count))
        : input.data.length,
    data: input.data as ScanSnapshot["data"],
    context: {
      market_regime: normalizeRegime(input.context.market_regime),
      stable_ratio: safeNum(input.context.stable_ratio),
      transition_ratio: safeNum(input.context.transition_ratio),
      volatile_ratio: safeNum(input.context.volatile_ratio),
    },
    meta: {
      limit:
        typeof input.meta?.limit === "number" && Number.isFinite(input.meta.limit)
          ? Math.max(1, Math.trunc(input.meta.limit))
          : CANONICAL_LIMIT,
      sort: safeStr(input.meta?.sort) === "price" ? "price" : "score",
      order: safeStr(input.meta?.order) === "asc" ? "asc" : "desc",
      q: typeof input.meta?.q === "string" ? input.meta.q : null,
      warnings: Array.isArray(input.meta?.warnings)
        ? input.meta.warnings.filter((item): item is string => typeof item === "string")
        : [],
    },
  };
}

async function getOrRebuildScanSnapshot(
  auth: AuthSuccess,
  warnings: string[]
): Promise<{
  scan_cache_key: string;
  snapshot: ScanSnapshot | null;
  source: "scan_cache" | "scan_self_heal";
}> {
  const scan_cache_key = scanKey({
    version: XYVALA_VERSION,
    market: "crypto",
    quote: "usd",
    sort: "score",
    order: "desc",
    limit: CANONICAL_LIMIT,
    q: null,
  });

  const cached = getFromCache<ScanSnapshot>(scan_cache_key, TTL_MS);
  if (cached) {
    return {
      scan_cache_key,
      snapshot: cached,
      source: "scan_cache",
    };
  }

  const rebuilt = await xyvalaServerFetch<ScanRouteResponse>("/api/scan", {
    searchParams: {
      quote: "usd",
      sort: "score",
      order: "desc",
      limit: CANONICAL_LIMIT,
      noStore: 1,
    },
    timeoutMs: 8_000,
  });

  if (!rebuilt.ok || !rebuilt.data) {
    warnings.push(
      rebuilt.error
        ? `scan_self_heal_failed:${rebuilt.error}`
        : "scan_self_heal_failed"
    );

    return {
      scan_cache_key,
      snapshot: null,
      source: "scan_self_heal",
    };
  }

  const snapshot = normalizeScanSnapshot(rebuilt.data);

  if (!snapshot) {
    warnings.push("scan_self_heal_invalid_shape");

    return {
      scan_cache_key,
      snapshot: null,
      source: "scan_self_heal",
    };
  }

  setToCache(scan_cache_key, snapshot);
  warnings.push("scan_self_heal_ok");

  return {
    scan_cache_key,
    snapshot,
    source: "scan_self_heal",
  };
}

function respond(
  payload: ContextResponse,
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
    },
  });

  res = applyApiAuthHeaders(res, auth);

  if (usage) {
    res = applyQuotaHeaders(res, usage);
  }

  return res;
}

/* -------------------------------- Handler -------------------------------- */

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
      endpoint: "/api/context",
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
    const warnings: string[] = [...usageWarnings];

    const { scan_cache_key, snapshot, source } = await getOrRebuildScanSnapshot(
      auth,
      warnings
    );

    const context_cache_key = `xyvala:context:${XYVALA_VERSION}:scan=${scan_cache_key}`;
    const noStore = req.nextUrl.searchParams.get("noStore") === "1";

    if (!noStore) {
      const cachedContext = getFromCache<ContextResponse>(context_cache_key, TTL_MS);

      if (cachedContext) {
        const res = buildContextResponse({
          ...cachedContext,
          ts,
          source: "context_cache",
          meta: {
            ...cachedContext.meta,
            cache: "hit",
            warnings: uniqueWarnings(cachedContext.meta.warnings, warnings),
          },
        });

        return respond(res, 200, auth, usage);
      }
    }

    if (!snapshot) {
      const res = buildContextResponse({
        ok: false,
        ts,
        market_regime: null,
        stable_ratio: null,
        transition_ratio: null,
        volatile_ratio: null,
        message: null,
        error: "scan_snapshot_missing",
        source,
        meta: {
          scan_cache_key,
          context_cache_key,
          cache: noStore ? "no-store" : "miss",
          warnings,
        },
      });

      return respond(res, 503, auth, usage);
    }

    const extracted = extractContextFromSnapshot(snapshot);

    const res = buildContextResponse({
      ok: true,
      ts,
      market_regime: extracted.market_regime,
      stable_ratio: extracted.stable_ratio,
      transition_ratio: extracted.transition_ratio,
      volatile_ratio: extracted.volatile_ratio,
      message: null,
      error: null,
      source,
      meta: {
        scan_cache_key,
        context_cache_key,
        cache: noStore ? "no-store" : "miss",
        warnings,
      },
    });

    if (!noStore) {
      setToCache(context_cache_key, res);
    }

    return respond(res, 200, auth, usage);
  } catch (error) {
    const res = buildContextResponse({
      ok: false,
      ts,
      market_regime: null,
      stable_ratio: null,
      transition_ratio: null,
      volatile_ratio: null,
      message: null,
      error:
        error instanceof Error && error.message
          ? String(error.message)
          : "unknown_error",
      source: "scan_self_heal",
      meta: {
        scan_cache_key: "",
        context_cache_key: "",
        cache: "miss",
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

    return respond(res, 500, auth, usage);
  }
}
