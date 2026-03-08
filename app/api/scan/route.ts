
import { NextRequest, NextResponse } from "next/server";
import {
  validateApiKey,
  buildApiKeyErrorResponse,
  applyApiAuthHeaders,
} from "@/lib/xyvala/auth";
import { trackUsage } from "@/lib/xyvala/usage";
import {
  getXyvalaScan,
  type Regime,
  type SortMode,
  type ScanAsset as EngineScanAsset,
} from "@/lib/xyvala/scan";
import { scanKey, getFromCache, setToCache } from "@/lib/xyvala/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XYVALA_VERSION = "v1";
const SCAN_TTL_MS = 45_000;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 250;

type Quote = "usd" | "eur" | "usdt";
type SortOrder = "asc" | "desc";
type CacheState = "hit" | "miss" | "no-store";
type ScanSource = "scan" | "cache" | "fallback";

type NormalizedScanAsset = {
  id: string;
  symbol: string;
  name: string;

  price: number;
  h24: number;
  chg_24h_pct: number;

  market_cap?: number;
  volume_24h?: number;

  confidence_score: number;
  regime: Regime;

  binance_url: string;
  affiliate_url: string;
};

type ScanResponse = {
  ok: boolean;
  ts: string;
  version: string;

  source: ScanSource;
  market: "crypto";
  quote: Quote;

  count: number;
  data: NormalizedScanAsset[];

  context: {
    market_regime: Regime | null;
    stable_ratio: number | null;
    transition_ratio: number | null;
    volatile_ratio: number | null;
  };

  meta: {
    limit: number;
    sort: "score" | "price";
    order: SortOrder;
    q: string | null;
    cache: CacheState;
    warnings: string[];
  };

  error: string | null;
};

/* -------------------------------------------------------------------------- */
/*                                   Utils                                    */
/* -------------------------------------------------------------------------- */

function nowIso() {
  return new Date().toISOString();
}

function safeStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function parseBool(v: string | null): boolean {
  const s = (v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function normalizeQuote(v: string | null): Quote {
  const s = (v ?? "").trim().toLowerCase();
  if (s === "usd" || s === "eur" || s === "usdt") return s;
  return "usd";
}

function normalizeSortMode(sort: string | null, order: string | null): {
  sortMode: SortMode;
  sort: "score" | "price";
  order: SortOrder;
} {
  const rawSort = (sort ?? "").trim().toLowerCase();
  const rawOrder = (order ?? "").trim().toLowerCase();

  if (
    rawSort === "score_desc" ||
    rawSort === "score_asc" ||
    rawSort === "price_desc" ||
    rawSort === "price_asc"
  ) {
    return {
      sortMode: rawSort,
      sort: rawSort.startsWith("price") ? "price" : "score",
      order: rawSort.endsWith("_asc") ? "asc" : "desc",
    };
  }

  const normalizedSort: "score" | "price" =
    rawSort === "price" ? "price" : "score";
  const normalizedOrder: SortOrder = rawOrder === "asc" ? "asc" : "desc";

  const sortMode =
    normalizedSort === "price"
      ? normalizedOrder === "asc"
        ? "price_asc"
        : "price_desc"
      : normalizedOrder === "asc"
        ? "score_asc"
        : "score_desc";

  return {
    sortMode,
    sort: normalizedSort,
    order: normalizedOrder,
  };
}

function extractApiKeyCandidate(req: NextRequest): string | null {
  const fromQuery =
    req.nextUrl.searchParams.get("api_key") ||
    req.nextUrl.searchParams.get("key") ||
    req.nextUrl.searchParams.get("apikey") ||
    req.nextUrl.searchParams.get("apiKey");

  if (safeStr(fromQuery)) return safeStr(fromQuery);

  const fromXyvala = req.headers.get("x-xyvala-key");
  if (safeStr(fromXyvala)) return safeStr(fromXyvala);

  const fromXApiKey = req.headers.get("x-api-key");
  if (safeStr(fromXApiKey)) return safeStr(fromXApiKey);

  const auth = safeStr(req.headers.get("authorization"));
  if (!auth) return null;

  if (auth.toLowerCase().startsWith("bearer ")) {
    return safeStr(auth.slice(7));
  }

  return auth;
}

function buildAuthReadyRequest(req: NextRequest): NextRequest {
  const candidate = extractApiKeyCandidate(req);
  if (!candidate) return req;

  const headers = new Headers(req.headers);
  headers.set("x-xyvala-key", candidate);

  return new NextRequest(req.url, {
    method: req.method,
    headers,
  });
}

function normalizeAsset(asset: EngineScanAsset): NormalizedScanAsset {
  const affiliate_url = asset.affiliate_url ?? asset.binance_url;

  return {
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,

    price: asset.price,
    h24: asset.h24,
    chg_24h_pct: asset.h24,

    market_cap: asset.market_cap,
    volume_24h: asset.volume_24h,

    confidence_score: asset.confidence_score,
    regime: asset.regime,

    binance_url: asset.binance_url,
    affiliate_url,
  };
}

function applySearch(items: NormalizedScanAsset[], q: string | null) {
  if (!q) return items;

  const needle = q.toLowerCase();

  return items.filter((item) => {
    return (
      item.symbol.toLowerCase().includes(needle) ||
      item.name.toLowerCase().includes(needle) ||
      item.id.toLowerCase().includes(needle)
    );
  });
}

function buildContext(items: NormalizedScanAsset[]) {
  if (!items.length) {
    return {
      market_regime: null,
      stable_ratio: null,
      transition_ratio: null,
      volatile_ratio: null,
    };
  }

  let stable = 0;
  let transition = 0;
  let volatile = 0;

  for (const item of items) {
    if (item.regime === "STABLE") stable += 1;
    else if (item.regime === "TRANSITION") transition += 1;
    else if (item.regime === "VOLATILE") volatile += 1;
  }

  const total = stable + transition + volatile;

  const stable_ratio = total ? stable / total : null;
  const transition_ratio = total ? transition / total : null;
  const volatile_ratio = total ? volatile / total : null;

  let market_regime: Regime | null = null;

  if (volatile_ratio !== null && volatile_ratio >= 0.45) {
    market_regime = "VOLATILE";
  } else if (stable_ratio !== null && stable_ratio >= 0.55) {
    market_regime = "STABLE";
  } else if (transition_ratio !== null) {
    market_regime = "TRANSITION";
  }

  return {
    market_regime,
    stable_ratio,
    transition_ratio,
    volatile_ratio,
  };
}

function buildResponse(input: {
  ts?: string;
  source: ScanSource;
  quote: Quote;
  limit: number;
  sort: "score" | "price";
  order: SortOrder;
  q: string | null;
  cache: CacheState;
  warnings: string[];
  data: NormalizedScanAsset[];
  error: string | null;
}): ScanResponse {
  return {
    ok: input.error === null,
    ts: input.ts ?? nowIso(),
    version: XYVALA_VERSION,

    source: input.source,
    market: "crypto",
    quote: input.quote,

    count: input.data.length,
    data: input.data,

    context: buildContext(input.data),

    meta: {
      limit: input.limit,
      sort: input.sort,
      order: input.order,
      q: input.q,
      cache: input.cache,
      warnings: input.warnings,
    },

    error: input.error,
  };
}

/* -------------------------------------------------------------------------- */
/*                                  Handler                                   */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest) {
  const ts = nowIso();
  const warnings: string[] = [];

  const authReq = buildAuthReadyRequest(req);
  const auth = validateApiKey(authReq);

  if (!auth.ok) {
    return buildApiKeyErrorResponse(auth.error, auth.status);
  }

  try {
    await trackUsage({
      apiKey: auth.key,
      endpoint: "/api/scan",
    });
  } catch {
    warnings.push("usage_tracking_failed");
  }

  try {
    const sp = req.nextUrl.searchParams;

    const quote = normalizeQuote(sp.get("quote"));
    const q = safeStr(sp.get("q"));
    const limit = clampInt(sp.get("limit"), 1, MAX_LIMIT, DEFAULT_LIMIT);
    const noStore = parseBool(sp.get("noStore"));

    const { sortMode, sort, order } = normalizeSortMode(
      sp.get("sort"),
      sp.get("order")
    );

    const cacheKey = scanKey({
      version: XYVALA_VERSION,
      market: "crypto",
      quote,
      sort,
      order,
      limit,
      q,
    });

    if (!noStore) {
      const cached = getFromCache<ScanResponse>(cacheKey, SCAN_TTL_MS);

      if (cached) {
        const hitResponse: ScanResponse = {
          ...cached,
          ts,
          source: "cache",
          meta: {
            ...cached.meta,
            cache: "hit",
            warnings: [...new Set([...(cached.meta.warnings ?? []), ...warnings])],
          },
        };

        return applyApiAuthHeaders(
          NextResponse.json(hitResponse, {
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
    }

    const engineResult = await getXyvalaScan({
      market: "crypto",
      quote,
      limit,
      sort: sortMode,
    });

    const normalized = engineResult.data.map(normalizeAsset);
    const filtered = applySearch(normalized, q);

    const response = buildResponse({
      ts,
      source: engineResult.source === "fallback" ? "fallback" : "scan",
      quote,
      limit,
      sort,
      order,
      q,
      cache: noStore ? "no-store" : "miss",
      warnings: [
        ...warnings,
        ...((engineResult.meta.warnings ?? []).filter(Boolean) as string[]),
      ],
      data: filtered,
      error: engineResult.error ?? null,
    });

    if (!noStore) {
      setToCache(cacheKey, response);
    }

    return applyApiAuthHeaders(
      NextResponse.json(response, {
        status: 200,
        headers: {
          "cache-control": "no-store",
          "x-xyvala-version": XYVALA_VERSION,
          "x-xyvala-cache": noStore ? "no-store" : "miss",
        },
      }),
      auth
    );
  } catch (e: unknown) {
    const error =
      e instanceof Error && e.message ? e.message : "unknown_error";

    const response = buildResponse({
      ts,
      source: "fallback",
      quote: "usd",
      limit: DEFAULT_LIMIT,
      sort: "score",
      order: "desc",
      q: null,
      cache: "no-store",
      warnings: ["route_exception"],
      data: [],
      error,
    });

    return applyApiAuthHeaders(
      NextResponse.json(response, {
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
