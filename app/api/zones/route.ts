// app/api/zones/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  enforceApiPolicy,
  applyApiAuthHeaders,
  buildApiKeyErrorResponse,
} from "@/lib/xyvala/auth";
import { trackUsage } from "@/lib/xyvala/usage";
import {
  scanKey,
  getFromCache,
  setToCache,
  type ScanSnapshot,
  type ScanAsset,
  type Quote,
} from "@/lib/xyvala/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XYVALA_VERSION = "v1";
const TTL_MS = 45_000;

type ZoneId = "ACCUMULATION" | "SETUP" | "RISK";
type Regime = "STABLE" | "TRANSITION" | "VOLATILE" | null;

type ZoneSummary = {
  id: ZoneId;
  label: string;
  score: number;
  count: number;
  share: number;
  reason_codes: string[];
};

type BestZone = {
  id: ZoneId;
  label: string;
  score: number;
  count: number;
  share: number;
  reason_codes: string[];
} | null;

type ZonesResponse = {
  ok: boolean;
  ts: string;
  version: string;

  market: "crypto";
  quote: Quote;
  tf: string;

  count: number;
  zones: ZoneSummary[];
  best_zone: BestZone;

  source: "scan_cache" | "zones_cache" | "scan_self_heal" | "scan_recomputed";
  error: string | null;

  meta: {
    scan_cache_key: string;
    zones_cache_key: string;
    cache: "hit" | "miss" | "no-store";
    warnings: string[];
  };
};

/* --------------------------------- Utils --------------------------------- */

const NOW_ISO = () => new Date().toISOString();

function safeNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function safeStr(v: unknown): string | null {
  return typeof v === "string" && v.trim().length ? v.trim() : null;
}

function normalizeQuote(v: string | null): Quote {
  const s = (v ?? "").trim().toLowerCase();
  if (s === "usdt" || s === "eur") return s;
  return "usd";
}

function normalizeTf(v: string | null): string {
  const s = safeStr(v)?.toUpperCase();
  return s ?? "AUTO";
}

function normalizeRegime(v: unknown): Regime {
  const s = typeof v === "string" ? v.trim().toUpperCase() : "";
  if (s === "STABLE" || s === "TRANSITION" || s === "VOLATILE") return s;
  return null;
}

function buildZonesResponse(
  input: Partial<ZonesResponse> & Pick<ZonesResponse, "ts">
): ZonesResponse {
  return {
    ok: Boolean(input.ok),
    ts: input.ts,
    version: input.version ?? XYVALA_VERSION,

    market: "crypto",
    quote: input.quote ?? "usd",
    tf: input.tf ?? "AUTO",

    count: input.count ?? 0,
    zones: input.zones ?? [],
    best_zone: input.best_zone ?? null,

    source: input.source ?? "scan_cache",
    error: input.error ?? null,

    meta: {
      scan_cache_key: input.meta?.scan_cache_key ?? "",
      zones_cache_key: input.meta?.zones_cache_key ?? "",
      cache: input.meta?.cache ?? "miss",
      warnings: input.meta?.warnings ?? [],
    },
  };
}

function hasUsableZonesResponse(res: ZonesResponse | null | undefined): boolean {
  if (!res) return false;
  if (res.ok !== true) return false;
  return Array.isArray(res.zones) && res.zones.length > 0;
}

function extractAssetsFromScanJson(scanJson: any): ScanAsset[] {
  if (Array.isArray(scanJson?.data)) return scanJson.data as ScanAsset[];
  if (Array.isArray(scanJson?.assets)) return scanJson.assets as ScanAsset[];
  return [];
}

function zoneLabel(id: ZoneId): string {
  if (id === "ACCUMULATION") return "Accumulation";
  if (id === "SETUP") return "Setup";
  return "Risk";
}

function classifyAssetZone(asset: Partial<ScanAsset>): {
  zone: ZoneId;
  score: number;
  reason_codes: string[];
} {
  const confidence = safeNum(asset.confidence_score) ?? 0;
  const regime = normalizeRegime(asset.regime);
  const chg24 = safeNum(asset.chg_24h_pct);

  const reasons: string[] = [];

  if (regime === "VOLATILE") {
    reasons.push("volatile_regime");
    if (confidence < 60) reasons.push("low_confidence");
    return {
      zone: "RISK",
      score: Math.max(0, Math.min(100, 100 - confidence * 0.35)),
      reason_codes: reasons,
    };
  }

  if (confidence >= 80 && (regime === "STABLE" || regime === "TRANSITION")) {
    reasons.push("high_confidence");
    reasons.push(regime === "STABLE" ? "stable_regime" : "transition_regime");
    if (chg24 !== null && chg24 < 0) reasons.push("pullback_24h");
    return {
      zone: "ACCUMULATION",
      score: Math.max(0, Math.min(100, confidence)),
      reason_codes: reasons,
    };
  }

  if (confidence >= 65) {
    reasons.push("medium_high_confidence");
    if (regime === "TRANSITION") reasons.push("transition_regime");
    if (chg24 !== null && chg24 > 0) reasons.push("momentum_24h");
    return {
      zone: "SETUP",
      score: Math.max(0, Math.min(100, confidence)),
      reason_codes: reasons,
    };
  }

  reasons.push("insufficient_confidence");
  if (regime === "STABLE") reasons.push("stable_but_low_score");
  return {
    zone: "RISK",
    score: Math.max(0, Math.min(100, 100 - confidence * 0.4)),
    reason_codes: reasons,
  };
}

function computeZonesFromAssets(assets: ScanAsset[]): {
  zones: ZoneSummary[];
  best_zone: BestZone;
  count: number;
} {
  const buckets: Record<
    ZoneId,
    { scoreSum: number; count: number; reasonCodes: Set<string> }
  > = {
    ACCUMULATION: { scoreSum: 0, count: 0, reasonCodes: new Set<string>() },
    SETUP: { scoreSum: 0, count: 0, reasonCodes: new Set<string>() },
    RISK: { scoreSum: 0, count: 0, reasonCodes: new Set<string>() },
  };

  for (const asset of assets) {
    const classified = classifyAssetZone(asset);
    const bucket = buckets[classified.zone];

    bucket.scoreSum += classified.score;
    bucket.count += 1;

    for (const code of classified.reason_codes) {
      bucket.reasonCodes.add(code);
    }
  }

  const total = assets.length;

  const zones: ZoneSummary[] = (Object.keys(buckets) as ZoneId[])
    .map((id) => {
      const bucket = buckets[id];
      const score =
        bucket.count > 0 ? Number((bucket.scoreSum / bucket.count).toFixed(2)) : 0;

      return {
        id,
        label: zoneLabel(id),
        score,
        count: bucket.count,
        share: total > 0 ? Number((bucket.count / total).toFixed(4)) : 0,
        reason_codes: Array.from(bucket.reasonCodes).sort(),
      };
    })
    .filter((z) => z.count > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.count !== a.count) return b.count - a.count;
      return a.id.localeCompare(b.id);
    });

  const best_zone: BestZone = zones.length > 0 ? zones[0] : null;

  return {
    zones,
    best_zone,
    count: total,
  };
}

async function getOrRebuildScanSnapshot(
  req: NextRequest,
  authKey: string,
  quote: Quote,
  warnings: string[]
): Promise<{
  scan_cache_key: string;
  snapshot: ScanSnapshot | null;
  source: "scan_cache" | "scan_self_heal";
}> {
  const scan_cache_key = scanKey({
    version: XYVALA_VERSION,
    market: "crypto",
    quote,
    sort: "score",
    order: "desc",
    limit: 250,
    q: null,
  });

  const cached = await getFromCache<ScanSnapshot>(scan_cache_key, TTL_MS);

  if (cached) {
    return {
      scan_cache_key,
      snapshot: cached,
      source: "scan_cache",
    };
  }

  try {
    const origin = new URL(req.url).origin;
    const url = new URL("/api/scan", origin);
    url.searchParams.set("quote", quote);
    url.searchParams.set("sort", "score");
    url.searchParams.set("order", "desc");
    url.searchParams.set("limit", "250");
    url.searchParams.set("noStore", "1");

    const scanRes = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-xyvala-key": authKey,
      },
      cache: "no-store",
    });

    if (!scanRes.ok) {
      warnings.push(`scan_self_heal_http_${scanRes.status}`);
      return {
        scan_cache_key,
        snapshot: null,
        source: "scan_self_heal",
      };
    }

    const scanJson = await scanRes.json();
    const assets = extractAssetsFromScanJson(scanJson);

    if (!scanJson?.ok || assets.length === 0) {
      warnings.push("scan_self_heal_invalid_shape");
      return {
        scan_cache_key,
        snapshot: null,
        source: "scan_self_heal",
      };
    }

    const snapshot: ScanSnapshot = {
      ok: true,
      ts: String(scanJson.ts ?? NOW_ISO()),
      version: String(scanJson.version ?? XYVALA_VERSION),
      source:
        scanJson.source === "cache" ||
        scanJson.source === "fallback" ||
        scanJson.source === "scan"
          ? scanJson.source
          : "scan",
      market: String(scanJson.market ?? "crypto"),
      quote: String(scanJson.quote ?? quote),
      count: Number.isFinite(scanJson.count)
        ? Number(scanJson.count)
        : assets.length,
      data: assets,
      context:
        scanJson?.context && typeof scanJson.context === "object"
          ? scanJson.context
          : null,
      meta: scanJson.meta ?? {
        limit: 250,
        sort: "score",
        order: "desc",
        q: null,
        warnings: [],
      },
    };

    await setToCache(scan_cache_key, snapshot);
    warnings.push("scan_self_heal_ok");

    return {
      scan_cache_key,
      snapshot,
      source: "scan_self_heal",
    };
  } catch {
    warnings.push("scan_self_heal_failed");
    return {
      scan_cache_key,
      snapshot: null,
      source: "scan_self_heal",
    };
  }
}

/* -------------------------------- Handler -------------------------------- */

export async function GET(req: NextRequest) {
  const ts = NOW_ISO();
  const warnings: string[] = [];

  const auth = enforceApiPolicy(req);

  if (!auth.ok) {
    return buildApiKeyErrorResponse(auth.error, auth.status);
  }

  await trackUsage({
    apiKey: auth.key,
    endpoint: "/api/zones",
  });

  try {
    const noStore =
      req.nextUrl.searchParams.get("noStore") === "1" ||
      req.nextUrl.searchParams.get("noStore") === "true";

    const quote = normalizeQuote(req.nextUrl.searchParams.get("quote"));
    const tf = normalizeTf(req.nextUrl.searchParams.get("tf"));

    const { scan_cache_key, snapshot, source } = await getOrRebuildScanSnapshot(
      req,
      auth.key,
      quote,
      warnings
    );

    const zones_cache_key = `xyvala:zones:${XYVALA_VERSION}:quote=${quote}:tf=${tf}:scan=${scan_cache_key}`;

    if (!noStore) {
      const hit = await getFromCache<ZonesResponse>(zones_cache_key, TTL_MS);

      if (hasUsableZonesResponse(hit)) {
        const res = buildZonesResponse({
          ...hit,
          ts,
          source: "zones_cache",
          meta: {
            ...hit!.meta,
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

      if (hit && !hasUsableZonesResponse(hit)) {
        warnings.push("stale_empty_zones_cache_ignored");
      }
    }

    if (!snapshot || !Array.isArray(snapshot.data) || snapshot.data.length === 0) {
      const res = buildZonesResponse({
        ok: false,
        ts,
        quote,
        tf,
        count: 0,
        zones: [],
        best_zone: null,
        source,
        error: "scan_snapshot_missing",
        meta: {
          scan_cache_key,
          zones_cache_key,
          cache: noStore ? "no-store" : "miss",
          warnings,
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

    const computed = computeZonesFromAssets(snapshot.data as ScanAsset[]);

    const ok = computed.zones.length > 0 && computed.best_zone !== null;

    const res = buildZonesResponse({
      ok,
      ts,
      quote,
      tf,
      count: computed.count,
      zones: computed.zones,
      best_zone: computed.best_zone,
      source: source === "scan_self_heal" ? "scan_recomputed" : source,
      error: ok ? null : "zones_unavailable",
      meta: {
        scan_cache_key,
        zones_cache_key,
        cache: noStore ? "no-store" : "miss",
        warnings,
      },
    });

    if (!noStore && res.ok) {
      await setToCache(zones_cache_key, res);
    }

    return applyApiAuthHeaders(
      NextResponse.json(res, {
        status: res.ok ? 200 : 503,
        headers: {
          "cache-control": "no-store",
          "x-xyvala-version": XYVALA_VERSION,
          "x-xyvala-cache": noStore ? "no-store" : "miss",
        },
      }),
      auth
    );
  } catch (e: any) {
    const res = buildZonesResponse({
      ok: false,
      ts,
      quote: "usd",
      tf: "AUTO",
      count: 0,
      zones: [],
      best_zone: null,
      source: "scan_self_heal",
      error: e?.message ? String(e.message) : "unknown_error",
      meta: {
        scan_cache_key: "",
        zones_cache_key: "",
        cache: "no-store",
        warnings: ["route_exception"],
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
