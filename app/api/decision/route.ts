// app/api/decision/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  validateApiKey,
  buildApiKeyErrorResponse,
  applyApiAuthHeaders,
} from "@/lib/xyvala/auth";
import { trackUsage } from "@/lib/xyvala/usage";
import {
  scanKey,
  zonesKey,
  decisionKey,
  getFromCache,
  setToCache,
  type ScanSnapshot,
  type Regime,
} from "@/lib/xyvala/snapshot";
import { createMemoryRecord } from "@/lib/xyvala/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XYVALA_VERSION = "v1";
const TTL_MS = 45_000;

type RfsAction = "ALLOW" | "WATCH" | "BLOCK";
type ExecutionMode = "none" | "progressive" | "confirmation" | "reduced";

type BestZone = {
  price: number;
  occurrence_score: number;
  convergence_score: number;
  correlation_score: number;
} | null;

type DecisionResponse = {
  ok: boolean;
  ts: string;
  version: string;
  symbol: string;
  tf: string;
  best_zone: BestZone;
  context: {
    market_regime: Regime;
  };
  rfs_decision: {
    action: RfsAction;
    reason_codes: string[];
    execution_mode: ExecutionMode;
  };
  memory: {
    record_id: string | null;
    status: "created" | "skipped";
  };
  source: "compute" | "cache";
  error: string | null;
  meta: {
    scan_cache_key: string;
    zones_cache_key: string;
    decision_cache_key: string;
    cache: "hit" | "miss";
    warnings: string[];
  };
};

const NOW_ISO = () => new Date().toISOString();

function safeStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function sanitizeSymbol(s: string) {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
}

function normalizeTf(tf: string | null) {
  const v = (tf ?? "AUTO").trim().toUpperCase();
  if (v === "1H" || v === "4H" || v === "1D" || v === "1W" || v === "AUTO") {
    return v;
  }
  return "AUTO";
}

function buildResponse(
  input: Partial<DecisionResponse> & Pick<DecisionResponse, "ts" | "symbol" | "tf">
): DecisionResponse {
  return {
    ok: Boolean(input.ok),
    ts: input.ts,
    version: input.version ?? XYVALA_VERSION,
    symbol: input.symbol,
    tf: input.tf,
    best_zone: input.best_zone ?? null,
    context: {
      market_regime: input.context?.market_regime ?? "TRANSITION",
    },
    rfs_decision: {
      action: input.rfs_decision?.action ?? "WATCH",
      reason_codes: input.rfs_decision?.reason_codes ?? [],
      execution_mode: input.rfs_decision?.execution_mode ?? "none",
    },
    memory: {
      record_id: input.memory?.record_id ?? null,
      status: input.memory?.status ?? "skipped",
    },
    source: input.source ?? "compute",
    error: input.error ?? null,
    meta: {
      scan_cache_key: input.meta?.scan_cache_key ?? "",
      zones_cache_key: input.meta?.zones_cache_key ?? "",
      decision_cache_key: input.meta?.decision_cache_key ?? "",
      cache: input.meta?.cache ?? "miss",
      warnings: input.meta?.warnings ?? [],
    },
  };
}

function rfsDecide(input: {
  market_regime: Regime;
  best_zone: BestZone;
}): {
  action: RfsAction;
  reason_codes: string[];
  execution_mode: ExecutionMode;
} {
  const { market_regime, best_zone } = input;

  if (!best_zone) {
    return {
      action: "WATCH",
      reason_codes: ["NO_ZONE"],
      execution_mode: "none",
    };
  }

  const score = best_zone.correlation_score;

  if (market_regime === "VOLATILE") {
    if (score >= 80) {
      return {
        action: "WATCH",
        reason_codes: ["REGIME_VOLATILE", "ZONE_HIGH"],
        execution_mode: "reduced",
      };
    }

    return {
      action: "BLOCK",
      reason_codes: ["REGIME_VOLATILE", "ZONE_NOT_STRONG"],
      execution_mode: "none",
    };
  }

  if (market_regime === "STABLE") {
    if (score >= 80) {
      return {
        action: "ALLOW",
        reason_codes: ["REGIME_STABLE", "ZONE_HIGH"],
        execution_mode: "progressive",
      };
    }

    if (score >= 60) {
      return {
        action: "WATCH",
        reason_codes: ["REGIME_STABLE", "ZONE_MID"],
        execution_mode: "confirmation",
      };
    }

    return {
      action: "WATCH",
      reason_codes: ["REGIME_STABLE", "ZONE_LOW"],
      execution_mode: "none",
    };
  }

  if (score >= 80) {
    return {
      action: "ALLOW",
      reason_codes: ["REGIME_TRANSITION", "ZONE_HIGH"],
      execution_mode: "confirmation",
    };
  }

  if (score >= 60) {
    return {
      action: "WATCH",
      reason_codes: ["REGIME_TRANSITION", "ZONE_MID"],
      execution_mode: "confirmation",
    };
  }

  return {
    action: "WATCH",
    reason_codes: ["REGIME_TRANSITION", "ZONE_LOW"],
    execution_mode: "reduced",
  };
}

export async function GET(req: NextRequest) {
  const ts = NOW_ISO();
  const warnings: string[] = [];

  const auth = validateApiKey(req);

  if (!auth.ok) {
    return buildApiKeyErrorResponse(auth.error, auth.status);
  }

  await trackUsage({
    apiKey: auth.key,
    endpoint: "/api/decision",
  });

  try {
    const sp = req.nextUrl.searchParams;

    const symbol = sanitizeSymbol(safeStr(sp.get("symbol")) ?? "");
    const tf = normalizeTf(sp.get("tf"));

    if (!symbol) {
      const res = buildResponse({
        ok: false,
        ts,
        symbol: "",
        tf,
        error: "missing_symbol",
        rfs_decision: {
          action: "BLOCK",
          reason_codes: ["MISSING_SYMBOL"],
          execution_mode: "none",
        },
      });

      return applyApiAuthHeaders(
        NextResponse.json(res, {
          status: 400,
          headers: {
            "cache-control": "no-store",
            "x-xyvala-version": XYVALA_VERSION,
          },
        }),
        auth
      );
    }

    const scan_cache_key = scanKey({
      version: XYVALA_VERSION,
      market: "crypto",
      quote: "usd",
      sort: "score",
      order: "desc",
      limit: 250,
      q: null,
    });

    const snapshot = await getFromCache<ScanSnapshot>(scan_cache_key, TTL_MS);

    if (!snapshot) {
      const res = buildResponse({
        ok: false,
        ts,
        symbol,
        tf,
        error: "scan_snapshot_missing",
        rfs_decision: {
          action: "WATCH",
          reason_codes: ["SCAN_SNAPSHOT_MISSING"],
          execution_mode: "none",
        },
        meta: {
          scan_cache_key,
          zones_cache_key: "",
          decision_cache_key: "",
          cache: "miss",
          warnings: ["scan_snapshot_missing"],
        },
      });

      return applyApiAuthHeaders(
        NextResponse.json(res, {
          status: 500,
          headers: {
            "cache-control": "no-store",
            "x-xyvala-version": XYVALA_VERSION,
          },
        }),
        auth
      );
    }

    const tfForZones = tf === "AUTO" ? "1H,4H,1D" : tf;

    const zones_cache_key = zonesKey({
      version: XYVALA_VERSION,
      scan_cache_key,
      symbol,
      tf: tfForZones,
    });

    const decision_cache_key = decisionKey({
      version: XYVALA_VERSION,
      zones_cache_key,
      symbol,
      tf,
    });

    const cached = await getFromCache<DecisionResponse>(decision_cache_key, TTL_MS);

    if (cached) {
      const res = buildResponse({
        ...cached,
        ts,
        source: "cache",
        meta: {
          ...cached.meta,
          cache: "hit",
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

    const zonesResp = await getFromCache<any>(zones_cache_key, TTL_MS);

    if (!zonesResp || zonesResp.ok !== true) {
      const res = buildResponse({
        ok: false,
        ts,
        symbol,
        tf,
        error: "zones_snapshot_missing",
        rfs_decision: {
          action: "WATCH",
          reason_codes: ["ZONES_SNAPSHOT_MISSING"],
          execution_mode: "none",
        },
        meta: {
          scan_cache_key,
          zones_cache_key,
          decision_cache_key,
          cache: "miss",
          warnings: ["zones_snapshot_missing"],
        },
      });

      return applyApiAuthHeaders(
        NextResponse.json(res, {
          status: 500,
          headers: {
            "cache-control": "no-store",
            "x-xyvala-version": XYVALA_VERSION,
          },
        }),
        auth
      );
    }

    const best_zone: BestZone = zonesResp.best_zone ?? null;
    const market_regime: Regime =
      zonesResp.context?.market_regime ??
      snapshot.context.market_regime ??
      "TRANSITION";

    const rfs_decision = rfsDecide({
      market_regime,
      best_zone,
    });

    let memoryRecordId: string | null = null;
    let memoryStatus: "created" | "skipped" = "skipped";

    try {
      const record = await createMemoryRecord({
        ts,
        symbol,
        tf,
        snapshot_hash: null,
        market_regime,
        best_zone_price: best_zone?.price ?? null,
        zone_score: best_zone?.correlation_score ?? null,
        action: rfs_decision.action,
        execution_mode: rfs_decision.execution_mode,
      });

      memoryRecordId = record.id;
      memoryStatus = "created";
    } catch {
      warnings.push("memory_write_failed");
    }

    const response = buildResponse({
      ok: true,
      ts,
      version: XYVALA_VERSION,
      symbol,
      tf,
      best_zone,
      context: {
        market_regime,
      },
      rfs_decision,
      memory: {
        record_id: memoryRecordId,
        status: memoryStatus,
      },
      source: "compute",
      error: null,
      meta: {
        scan_cache_key,
        zones_cache_key,
        decision_cache_key,
        cache: "miss",
        warnings,
      },
    });

    await setToCache(decision_cache_key, response, TTL_MS);

    return applyApiAuthHeaders(
      NextResponse.json(response, {
        status: 200,
        headers: {
          "cache-control": "no-store",
          "x-xyvala-version": XYVALA_VERSION,
          "x-xyvala-cache": "miss",
        },
      }),
      auth
    );
  } catch (e: any) {
    const res = buildResponse({
      ok: false,
      ts,
      symbol: "",
      tf: "AUTO",
      error: e?.message ? String(e.message) : "unknown_error",
      rfs_decision: {
        action: "BLOCK",
        reason_codes: ["ROUTE_EXCEPTION"],
        execution_mode: "none",
      },
      meta: {
        scan_cache_key: "",
        zones_cache_key: "",
        decision_cache_key: "",
        cache: "miss",
        warnings: ["route_exception"],
      },
    });

    return applyApiAuthHeaders(
      NextResponse.json(res, {
        status: 500,
        headers: {
          "cache-control": "no-store",
          "x-xyvala-version": XYVALA_VERSION,
        },
      }),
      auth
    );
  }
}
