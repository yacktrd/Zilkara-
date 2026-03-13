// app/api/zones/route.ts

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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const XYVALA_VERSION = "v1";

const DEFAULT_MARKET = "crypto";
const DEFAULT_QUOTE = "usd";
const DEFAULT_TF = "1D";
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 20;

const ZONES_CACHE_TTL_MS = 45_000;
const MAX_MEM_CACHE_ENTRIES = 300;

type Market = "crypto" | string;
type Quote = "usd" | "usdt" | "eur" | string;
type Timeframe = "1H" | "4H" | "1D" | "1W" | string;

type Regime = "TREND" | "RANGE" | "STRESS" | "CHAOS" | string;
type VolState = "NORMAL" | "HIGH" | string;
type LiqState = "NORMAL" | "LOW" | string;
type EventRisk = "NONE" | "ELEVATED" | string;

type RfsAction = "BLOCK" | "WATCH" | "ALLOW";
type ZoneSide = "BUY" | "SELL";

export type Zone = {
  id: string;
  side: ZoneSide;
  range: { low: number; high: number };
  occurrence_score: number;
  convergence_score: number;
  correlation_score: number;
  tags: string[];
};

export type ZonesContext = {
  regime: Regime;
  volatility_state: VolState;
  liquidity_state: LiqState;
  event_risk: EventRisk;
};

export type RfsDecision = {
  action: RfsAction;
  reason_codes: string[];
  execution_mode: "PROGRESSIVE_ENTRY" | "CONFIRMATION" | "REDUCED_SIZE" | "NONE";
};

export type ZonesResponse = {
  ok: boolean;
  ts: string;
  version: string;

  symbol: string;
  market: Market;
  quote: Quote;
  tf: Timeframe;

  zones: Zone[];
  best_zone: Zone | null;

  context: ZonesContext;
  rfs_decision: RfsDecision;

  plan: {
    summary: string;
    steps: string[];
  };

  meta: {
    limit: number;
    cache: "hit" | "miss" | "no-store";
    warnings: string[];
  };

  error: string | null;
};

type ZonesPayload = Omit<ZonesResponse, "ok" | "ts" | "meta" | "error">;

type CacheEntry = {
  ts: number;
  payload: ZonesPayload;
};

type AuthResult = ReturnType<typeof enforceApiPolicy>;
type AuthSuccess = Extract<AuthResult, { ok: true }>;
type UsageResult = ReturnType<typeof trackUsage> | null;

const memCache = new Map<string, CacheEntry>();

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

function uniqueWarnings(...groups: Array<string[] | undefined | null>): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [...new Set(merged.filter((item) => typeof item === "string" && item.trim().length > 0))];
}

function sanitizeSymbol(symbol: string): string {
  return safeStr(symbol).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
}

function normalizeMarket(value: string | null): Market {
  const market = safeStr(value).toLowerCase();
  return market || DEFAULT_MARKET;
}

function normalizeQuote(value: string | null): Quote {
  const quote = safeStr(value).toLowerCase();
  if (quote === "usd" || quote === "usdt" || quote === "eur") return quote;
  return DEFAULT_QUOTE;
}

function normalizeTf(value: string | null): Timeframe {
  const tf = safeStr(value).toUpperCase();
  return tf || DEFAULT_TF;
}

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return clamp(Math.trunc(parsed), 1, MAX_LIMIT);
}

function parseBool(value: string | null): boolean {
  const v = safeStr(value).toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function normalizeScore(value: unknown, fallback = 0): number {
  const n = safeNum(value);
  if (n === null) return fallback;
  return clamp(n, 0, 1);
}

function normalizeZoneSide(value: unknown): ZoneSide {
  return safeStr(value).toUpperCase() === "SELL" ? "SELL" : "BUY";
}

function normalizeZone(input: {
  id: unknown;
  side: unknown;
  range: { low: unknown; high: unknown } | null | undefined;
  occurrence_score: unknown;
  convergence_score: unknown;
  correlation_score: unknown;
  tags: unknown;
}): Zone {
  const low = safeNum(input.range?.low) ?? 0;
  const high = safeNum(input.range?.high) ?? low;

  return {
    id: safeStr(input.id) || "zone",
    side: normalizeZoneSide(input.side),
    range: {
      low: Math.min(low, high),
      high: Math.max(low, high),
    },
    occurrence_score: normalizeScore(input.occurrence_score),
    convergence_score: normalizeScore(input.convergence_score),
    correlation_score: normalizeScore(input.correlation_score),
    tags: Array.isArray(input.tags)
      ? input.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
      : [],
  };
}

function buildZonesCacheKey(input: {
  symbol: string;
  market: string;
  quote: string;
  tf: string;
  limit: number;
}): string {
  return [
    "xyvala",
    XYVALA_VERSION,
    "zones",
    `market=${input.market}`,
    `quote=${input.quote}`,
    `tf=${input.tf}`,
    `symbol=${input.symbol}`,
    `limit=${input.limit}`,
  ].join(":");
}

function getCache(key: string, ttlMs: number): CacheEntry | null {
  const entry = memCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.ts > ttlMs) {
    memCache.delete(key);
    return null;
  }

  return entry;
}

function pruneCache(): void {
  if (memCache.size < MAX_MEM_CACHE_ENTRIES) return;

  const firstKey = memCache.keys().next().value;
  if (typeof firstKey === "string") {
    memCache.delete(firstKey);
  }
}

function setCache(key: string, entry: CacheEntry): void {
  pruneCache();
  memCache.set(key, entry);
}

function fallbackZones(symbol: string): Zone[] {
  const base = [
    {
      id: "z1",
      side: "BUY",
      range: { low: 0.95, high: 1.0 },
      occurrence_score: 0.72,
      convergence_score: 0.58,
      correlation_score: 0.65,
      tags: ["fallback", "support-zone"],
    },
    {
      id: "z2",
      side: "BUY",
      range: { low: 0.88, high: 0.93 },
      occurrence_score: 0.62,
      convergence_score: 0.52,
      correlation_score: 0.57,
      tags: ["fallback", "deep-zone"],
    },
    {
      id: "z3",
      side: "BUY",
      range: { low: 1.02, high: 1.06 },
      occurrence_score: 0.44,
      convergence_score: 0.41,
      correlation_score: 0.42,
      tags: ["fallback", "retest-zone"],
    },
  ] as const;

  return base.map((zone) =>
    normalizeZone({
      ...zone,
      id: `${sanitizeSymbol(symbol).toLowerCase()}_${zone.id}`,
    })
  );
}

function computeContextV1(_symbol: string, _tf: Timeframe): ZonesContext {
  return {
    regime: "RANGE",
    volatility_state: "NORMAL",
    liquidity_state: "NORMAL",
    event_risk: "NONE",
  };
}

function rfsDecideV1(best: Zone | null, context: ZonesContext): RfsDecision {
  if (!best) {
    return {
      action: "WATCH",
      reason_codes: ["no_zone"],
      execution_mode: "NONE",
    };
  }

  const score = normalizeScore(best.correlation_score);
  const regime = String(context.regime).toUpperCase();
  const volatility = String(context.volatility_state).toUpperCase();
  const liquidity = String(context.liquidity_state).toUpperCase();
  const eventRisk = String(context.event_risk).toUpperCase();

  const isStress = regime === "STRESS";
  const isChaos = regime === "CHAOS";
  const highVol = volatility === "HIGH";
  const lowLiq = liquidity === "LOW";
  const elevatedEventRisk = eventRisk === "ELEVATED";

  if (isChaos || (isStress && (highVol || lowLiq))) {
    return {
      action: "BLOCK",
      reason_codes: ["context_risk_high"],
      execution_mode: "NONE",
    };
  }

  if (elevatedEventRisk) {
    return {
      action: "WATCH",
      reason_codes: ["event_risk"],
      execution_mode: "REDUCED_SIZE",
    };
  }

  if (score >= 0.7) {
    const isTrend = regime === "TREND";

    return {
      action: "ALLOW",
      reason_codes: ["zone_strong", isTrend ? "trend_context" : "range_context"],
      execution_mode: isTrend ? "CONFIRMATION" : "PROGRESSIVE_ENTRY",
    };
  }

  if (score >= 0.55) {
    return {
      action: "WATCH",
      reason_codes: ["zone_medium"],
      execution_mode: "PROGRESSIVE_ENTRY",
    };
  }

  return {
    action: "WATCH",
    reason_codes: ["zone_weak"],
    execution_mode: "NONE",
  };
}

function sortZones(zones: Zone[]): void {
  zones.sort((a, b) => {
    if (a.correlation_score !== b.correlation_score) {
      return b.correlation_score - a.correlation_score;
    }

    if (a.convergence_score !== b.convergence_score) {
      return b.convergence_score - a.convergence_score;
    }

    if (a.occurrence_score !== b.occurrence_score) {
      return b.occurrence_score - a.occurrence_score;
    }

    return a.id.localeCompare(b.id);
  });
}

function buildPlan(decision: RfsDecision): ZonesResponse["plan"] {
  if (decision.action === "BLOCK") {
    return {
      summary: "Action bloquée par le régulateur RFS.",
      steps: [
        "Ne pas entrer maintenant",
        "Attendre un contexte plus stable",
        "Revalider la zone",
      ],
    };
  }

  if (decision.action === "WATCH") {
    if (decision.execution_mode === "REDUCED_SIZE") {
      return {
        summary: "Observation prudente avec exposition réduite.",
        steps: [
          "Réduire l'exposition",
          "Surveiller la fenêtre de risque",
          "Revalider après dissipation du risque",
        ],
      };
    }

    if (decision.execution_mode === "PROGRESSIVE_ENTRY") {
      return {
        summary: "Zone intéressante, attente active avant autorisation complète.",
        steps: [
          "Surveiller la réaction de prix",
          "Chercher une meilleure confirmation",
          "Réévaluer le contexte avant exécution",
        ],
      };
    }

    return {
      summary: "Observer la zone avant toute action.",
      steps: [
        "Surveiller la zone",
        "Attendre un signal plus propre",
        "Revalider le contexte",
      ],
    };
  }

  if (decision.execution_mode === "CONFIRMATION") {
    return {
      summary: "Autorisé avec confirmation préalable.",
      steps: [
        "Attendre reprise ou retest",
        "Entrer après confirmation",
        "Rester discipliné sur l'exécution",
      ],
    };
  }

  if (decision.execution_mode === "PROGRESSIVE_ENTRY") {
    return {
      summary: "Autorisé avec entrée progressive.",
      steps: [
        "Entrer par étapes",
        "Observer la réaction dans la zone",
        "Stopper si le contexte se dégrade",
      ],
    };
  }

  if (decision.execution_mode === "REDUCED_SIZE") {
    return {
      summary: "Autorisé avec exposition réduite.",
      steps: [
        "Réduire l'exposition",
        "Surveiller volatilité et événements",
        "Revalider après la fenêtre de risque",
      ],
    };
  }

  return {
    summary: "Autorisé.",
    steps: ["Appliquer le plan d'exécution"],
  };
}

function buildResponse(
  input: Partial<ZonesResponse> & Pick<ZonesResponse, "ts" | "symbol" | "market" | "quote" | "tf">
): ZonesResponse {
  return {
    ok: Boolean(input.ok),
    ts: input.ts,
    version: input.version ?? XYVALA_VERSION,

    symbol: input.symbol,
    market: input.market,
    quote: input.quote,
    tf: input.tf,

    zones: input.zones ?? [],
    best_zone: input.best_zone ?? null,

    context: input.context ?? {
      regime: "RANGE",
      volatility_state: "NORMAL",
      liquidity_state: "NORMAL",
      event_risk: "NONE",
    },

    rfs_decision: input.rfs_decision ?? {
      action: "WATCH",
      reason_codes: ["no_decision"],
      execution_mode: "NONE",
    },

    plan: input.plan ?? {
      summary: "Aucun plan disponible.",
      steps: [],
    },

    meta: {
      limit: input.meta?.limit ?? 0,
      cache: input.meta?.cache ?? "miss",
      warnings: input.meta?.warnings ?? [],
    },

    error: input.error ?? null,
  };
}

function respond(
  payload: ZonesResponse,
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
      endpoint: "/api/zones",
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

    const requestedMarket = normalizeMarket(sp.get("market"));
    const market = requestedMarket || DEFAULT_MARKET;
    const quote = normalizeQuote(sp.get("quote"));
    const tf = normalizeTf(sp.get("tf"));
    const limit = parseLimit(sp.get("limit"));
    const noStore = parseBool(sp.get("noStore"));

    const symbolRaw = safeStr(sp.get("symbol")) || safeStr(sp.get("s"));
    const symbol = symbolRaw ? sanitizeSymbol(symbolRaw) : "";

    if (!symbol) {
      const payload = buildResponse({
        ok: false,
        ts,
        symbol: "",
        market,
        quote,
        tf,
        zones: [],
        best_zone: null,
        context: computeContextV1("", tf),
        rfs_decision: {
          action: "WATCH",
          reason_codes: ["missing_symbol"],
          execution_mode: "NONE",
        },
        plan: {
          summary: "Fournis un symbole valide.",
          steps: ["Ajouter ?symbol=BTC", "Recharger la route"],
        },
        meta: {
          limit,
          cache: "no-store",
          warnings: uniqueWarnings(usageWarnings, ["missing_symbol"]),
        },
        error: "missing_symbol",
      });

      return respond(payload, 400, auth, usage);
    }

    const cacheKey = buildZonesCacheKey({
      symbol,
      market,
      quote,
      tf,
      limit,
    });

    if (!noStore) {
      const hit = getCache(cacheKey, ZONES_CACHE_TTL_MS);

      if (hit) {
        const payload = buildResponse({
          ok: true,
          ts,
          ...hit.payload,
          meta: {
            limit,
            cache: "hit",
            warnings: uniqueWarnings(hit.payload ? usageWarnings : usageWarnings),
          },
          error: null,
        });

        return respond(payload, 200, auth, usage);
      }
    }

    const warnings = uniqueWarnings(usageWarnings, ["fallback_detector_v1"]);

    let zones = fallbackZones(symbol);
    sortZones(zones);
    zones = zones.slice(0, limit);

    const bestZone = zones.length > 0 ? zones[0] : null;
    const context = computeContextV1(symbol, tf);
    const rfsDecision = rfsDecideV1(bestZone, context);
    const plan = buildPlan(rfsDecision);

    const payload: ZonesPayload = {
      version: XYVALA_VERSION,
      symbol,
      market,
      quote,
      tf,
      zones,
      best_zone: bestZone,
      context,
      rfs_decision: rfsDecision,
      plan,
    };

    if (!noStore) {
      setCache(cacheKey, {
        ts: Date.now(),
        payload,
      });
    }

    const response = buildResponse({
      ok: true,
      ts,
      ...payload,
      meta: {
        limit,
        cache: noStore ? "no-store" : "miss",
        warnings,
      },
      error: null,
    });

    return respond(response, 200, auth, usage);
  } catch (error) {
    const payload = buildResponse({
      ok: false,
      ts,
      symbol: "",
      market: DEFAULT_MARKET,
      quote: DEFAULT_QUOTE,
      tf: DEFAULT_TF,
      zones: [],
      best_zone: null,
      context: {
        regime: "RANGE",
        volatility_state: "NORMAL",
        liquidity_state: "NORMAL",
        event_risk: "NONE",
      },
      rfs_decision: {
        action: "WATCH",
        reason_codes: ["route_exception"],
        execution_mode: "NONE",
      },
      plan: {
        summary: "Erreur de route.",
        steps: ["Consulter les logs", "Corriger puis relancer"],
      },
      meta: {
        limit: 0,
        cache: "no-store",
        warnings: uniqueWarnings(
          usageWarnings,
          [
            error instanceof Error && error.message
              ? `route_exception:${error.message}`
              : "route_exception",
          ]
        ),
      },
      error:
        error instanceof Error && error.message
          ? error.message
          : "unknown_error",
    });

    return respond(payload, 500, auth, usage);
  }
}
