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
  scanKey,
  getFromCache,
  setToCache,
  type ScanAsset,
  type ScanSnapshot,
  type Quote,
  type Regime,
} from "@/lib/xyvala/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const XYVALA_VERSION = "v1";
const TTL_MS = 45_000;

const DEFAULT_MARKET = "crypto";
const DEFAULT_QUOTE: Quote = "usd";
const DEFAULT_SORT: SortKey = "score";
const DEFAULT_ORDER: SortOrder = "desc";
const DEFAULT_LIMIT = 250;
const MAX_LIMIT = 500;
const FETCH_TIMEOUT_MS = 7_500;

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
    sort: SortKey;
    order: SortOrder;
    q: string | null;
    cache: "hit" | "miss" | "no-store";
    warnings: string[];
  };
  error: string | null;
};

type CGMarketItem = {
  id?: string;
  symbol?: string;
  name?: string;
  current_price?: number;
  price_change_percentage_24h?: number | null;
  market_cap?: number | null;
  total_volume?: number | null;
};

const COINGECKO_URL = "https://api.coingecko.com/api/v3/coins/markets";

const nowIso = () => new Date().toISOString();

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function safeNum(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueWarnings(...groups: Array<string[] | undefined | null>): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));
  return [...new Set(merged.filter((item) => typeof item === "string" && item.trim().length > 0))];
}

function sanitizeSymbol(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
}

function normalizeQuote(value: string | null): Quote {
  const q = safeStr(value).toLowerCase();
  if (q === "eur") return "eur";
  if (q === "usdt") return "usdt";
  return DEFAULT_QUOTE;
}

function normalizeSort(value: string | null): SortKey {
  return safeStr(value).toLowerCase() === "price" ? "price" : DEFAULT_SORT;
}

function normalizeOrder(value: string | null): SortOrder {
  return safeStr(value).toLowerCase() === "asc" ? "asc" : DEFAULT_ORDER;
}

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return clamp(Math.trunc(parsed), 1, MAX_LIMIT);
}

function parseBool(value: string | null): boolean {
  const s = safeStr(value).toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("fetch_timeout");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function quoteToCoinGeckoVsCurrency(quote: Quote): "usd" | "eur" {
  return quote === "eur" ? "eur" : "usd";
}

function toBinancePair(base: string, quote: Quote): string {
  const normalizedQuote = quote === "usd" ? "usdt" : quote;
  return `${sanitizeSymbol(base)}${String(normalizedQuote).toUpperCase()}`;
}

function buildBinanceUrl(pairOrFallback: string): string {
  const pair = safeStr(pairOrFallback);
  if (!pair) return "https://www.binance.com/en/markets";
  return `https://www.binance.com/en/trade/${encodeURIComponent(pair)}`;
}

function makeBinanceUrls(symbol: string, quote: Quote) {
  const pair = toBinancePair(symbol, quote);
  const binance_url = buildBinanceUrl(pair);

  const ref = safeStr(process.env.BINANCE_REF);
  const affiliate_url = ref
    ? `${binance_url}?ref=${encodeURIComponent(ref)}`
    : binance_url;

  return { binance_url, affiliate_url };
}

function computeRegimeFromChg(chg24: number | null): Regime | null {
  if (typeof chg24 !== "number" || !Number.isFinite(chg24)) return null;

  const abs = Math.abs(chg24);
  if (abs <= 3) return "STABLE";
  if (abs <= 8) return "TRANSITION";
  return "VOLATILE";
}

function clampScore(value: number): number {
  return clamp(Math.round(value), 0, 100);
}

function computeConfidenceScore(input: {
  chg24: number | null;
  marketCap: number | null;
  volume24h: number | null;
  regime: Regime | null;
}): number | null {
  const { chg24, marketCap, volume24h, regime } = input;

  if (typeof chg24 !== "number" || !Number.isFinite(chg24)) {
    return null;
  }

  const volatilityFactor = 1 - clamp(Math.abs(chg24) / 10, 0, 1);

  const marketCapLog =
    typeof marketCap === "number" && marketCap > 0
      ? Math.log10(marketCap)
      : 10;

  const marketCapFactor = clamp((marketCapLog - 8) / 4, 0, 1);

  const volumeLog =
    typeof volume24h === "number" && volume24h > 0
      ? Math.log10(volume24h)
      : 9;

  const volumeFactor = clamp((volumeLog - 7) / 4, 0, 1);

  const regimeModifier =
    regime === "STABLE"
      ? 1
      : regime === "TRANSITION"
        ? 0.86
        : regime === "VOLATILE"
          ? 0.7
          : 0.85;

  const raw =
    100 *
    (0.55 * volatilityFactor + 0.25 * marketCapFactor + 0.2 * volumeFactor) *
    regimeModifier;

  return clampScore(raw);
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

function sortData(data: ScanAsset[], sort: SortKey, order: SortOrder): void {
  const direction = order === "asc" ? 1 : -1;

  data.sort((a, b) => {
    const aValue = sort === "price" ? a.price : a.confidence_score;
    const bValue = sort === "price" ? b.price : b.confidence_score;

    const aHas = typeof aValue === "number" && Number.isFinite(aValue);
    const bHas = typeof bValue === "number" && Number.isFinite(bValue);

    if (aHas !== bHas) return aHas ? -1 : 1;
    if (!aHas && !bHas) return a.symbol.localeCompare(b.symbol);

    const ax = aValue as number;
    const bx = bValue as number;

    if (ax !== bx) {
      return (ax - bx) * direction;
    }

    const aScore =
      typeof a.confidence_score === "number" && Number.isFinite(a.confidence_score)
        ? a.confidence_score
        : -Infinity;

    const bScore =
      typeof b.confidence_score === "number" && Number.isFinite(b.confidence_score)
        ? b.confidence_score
        : -Infinity;

    if (aScore !== bScore) {
      return bScore - aScore;
    }

    return a.symbol.localeCompare(b.symbol);
  });
}

function fallbackUniverse(quote: Quote): ScanAsset[] {
  const base = [
    { symbol: "USDT", name: "Tether", price: 1.0, chg: 0.02, score: 95, regime: "STABLE" as Regime },
    { symbol: "USDC", name: "USDC", price: 1.0, chg: 0.01, score: 89, regime: "STABLE" as Regime },
    { symbol: "DAI", name: "Dai", price: 1.0, chg: -0.01, score: 74, regime: "STABLE" as Regime },
    { symbol: "XAUT", name: "Tether Gold", price: 5000, chg: 0.08, score: 75, regime: "STABLE" as Regime },
    { symbol: "PAXG", name: "PAX Gold", price: 5100, chg: 0.1, score: 75, regime: "STABLE" as Regime },
    { symbol: "BTC", name: "Bitcoin", price: 64000, chg: 0.3, score: 98, regime: "TRANSITION" as Regime },
  ] as const;

  return base.map((asset) => {
    const urls = makeBinanceUrls(asset.symbol, quote);

    return {
      id: asset.symbol.toLowerCase(),
      symbol: asset.symbol,
      name: asset.name,
      price: asset.price,
      chg_24h_pct: asset.chg,
      confidence_score: asset.score,
      regime: asset.regime,
      binance_url: urls.binance_url,
      affiliate_url: urls.affiliate_url,
      market_cap: null,
      volume_24h: null,
      score_delta: null,
      score_trend: null,
    };
  });
}

async function fetchCoinGeckoMarkets(input: {
  quote: Quote;
  limit: number;
}): Promise<CGMarketItem[]> {
  const vs_currency = quoteToCoinGeckoVsCurrency(input.quote);

  const params = new URLSearchParams({
    vs_currency,
    order: "market_cap_desc",
    per_page: String(clamp(input.limit, 50, 250)),
    page: "1",
    sparkline: "false",
    price_change_percentage: "24h",
  });

  const url = `${COINGECKO_URL}?${params.toString()}`;

  const headers: Record<string, string> = {
    accept: "application/json",
  };

  const cgKey = safeStr(process.env.COINGECKO_API_KEY);
  if (cgKey) {
    headers["x-cg-pro-api-key"] = cgKey;
  }

  const res = await fetchWithTimeout(
    url,
    {
      method: "GET",
      headers,
      cache: "no-store",
    },
    FETCH_TIMEOUT_MS
  );

  if (!res.ok) {
    throw new Error(`coingecko_http_${res.status}`);
  }

  const json = (await res.json()) as unknown;

  if (!Array.isArray(json)) {
    throw new Error("coingecko_invalid_shape");
  }

  return json as CGMarketItem[];
}

function normalizeAssetFromCoinGecko(
  item: CGMarketItem,
  quote: Quote
): ScanAsset | null {
  const id = safeStr(item.id);
  const symbolRaw = safeStr(item.symbol);

  if (!id || !symbolRaw) return null;

  const symbol = sanitizeSymbol(symbolRaw);
  if (!symbol) return null;

  const name = safeStr(item.name) || symbol;
  const price = safeNum(item.current_price);
  const chg_24h_pct = safeNum(item.price_change_percentage_24h);
  const market_cap = safeNum(item.market_cap);
  const volume_24h = safeNum(item.total_volume);

  const regime = computeRegimeFromChg(chg_24h_pct);
  const confidence_score = computeConfidenceScore({
    chg24: chg_24h_pct,
    marketCap: market_cap,
    volume24h: volume_24h,
    regime,
  });

  const urls = makeBinanceUrls(symbol, quote);

  return {
    id,
    symbol,
    name,
    price,
    chg_24h_pct,
    confidence_score,
    regime,
    binance_url: urls.binance_url,
    affiliate_url: urls.affiliate_url,
    market_cap,
    volume_24h,
    score_delta: null,
    score_trend: null,
  };
}

function buildResponse(
  input: Partial<ScanResponse> & Pick<ScanResponse, "ts">
): ScanResponse {
  return {
    ok: Boolean(input.ok),
    ts: input.ts,
    version: input.version ?? XYVALA_VERSION,
    source: input.source ?? "fallback",
    market: DEFAULT_MARKET,
    quote: input.quote ?? DEFAULT_QUOTE,
    count: input.count ?? 0,
    data: input.data ?? [],
    context: input.context ?? {
      market_regime: "TRANSITION",
      stable_ratio: 0,
      transition_ratio: 0,
      volatile_ratio: 0,
    },
    meta: {
      limit: input.meta?.limit ?? 0,
      sort: input.meta?.sort ?? DEFAULT_SORT,
      order: input.meta?.order ?? DEFAULT_ORDER,
      q: input.meta?.q ?? null,
      cache: input.meta?.cache ?? "no-store",
      warnings: input.meta?.warnings ?? [],
    },
    error: input.error ?? null,
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
    const sort = normalizeSort(sp.get("sort"));
    const order = normalizeOrder(sp.get("order"));
    const limit = parseLimit(sp.get("limit"));
    const q = safeStr(sp.get("q"))?.toLowerCase() ?? null;
    const noStore = parseBool(sp.get("noStore"));

    const cacheKey = scanKey({
      version: XYVALA_VERSION,
      market: DEFAULT_MARKET,
      quote,
      sort,
      order,
      limit,
      q,
    });

    if (!noStore) {
      const hit = getFromCache<ScanSnapshot>(cacheKey, TTL_MS);

      if (hit) {
        const res = buildResponse({
          ok: true,
          ts,
          version: hit.version,
          source: "cache",
          quote: hit.quote,
          count: hit.count,
          data: hit.data,
          context: {
            market_regime: hit.context.market_regime ?? "TRANSITION",
            stable_ratio: hit.context.stable_ratio ?? 0,
            transition_ratio: hit.context.transition_ratio ?? 0,
            volatile_ratio: hit.context.volatile_ratio ?? 0,
          },
          meta: {
            limit: hit.meta.limit,
            sort: hit.meta.sort,
            order: hit.meta.order,
            q: hit.meta.q,
            cache: "hit",
            warnings: uniqueWarnings(hit.meta.warnings, usageWarnings),
          },
          error: null,
        });

        return respond(res, 200, auth, usage);
      }
    }

    let source: "scan" | "fallback" = "scan";
    let data: ScanAsset[] = [];
    let requestWarnings = usageWarnings;

    if (process.env.SCAN_FALLBACK_ONLY === "1") {
      source = "fallback";
      data = fallbackUniverse(quote);
      requestWarnings = uniqueWarnings(requestWarnings, ["fallback_only"]);
    } else {
      try {
        const fetchSize = clamp(Math.max(limit * 2, 80), 50, 250);

        const raw = await fetchCoinGeckoMarkets({
          quote,
          limit: fetchSize,
        });

        data = raw
          .map((item) => normalizeAssetFromCoinGecko(item, quote))
          .filter((item): item is ScanAsset => item !== null);

        if (q) {
          data = data.filter(
            (asset) =>
              asset.symbol.toLowerCase().includes(q) ||
              asset.name.toLowerCase().includes(q)
          );
        }

        if (data.length === 0) {
          source = "fallback";
          data = fallbackUniverse(quote);
          requestWarnings = uniqueWarnings(requestWarnings, ["empty_universe_fallback"]);
        }
      } catch (error) {
        source = "fallback";
        data = fallbackUniverse(quote);
        requestWarnings = uniqueWarnings(
          requestWarnings,
          [
            error instanceof Error && error.message
              ? `coingecko_fail:${error.message}`
              : "coingecko_fail",
          ]
        );
      }
    }

    if (q && source === "fallback") {
      data = data.filter(
        (asset) =>
          asset.symbol.toLowerCase().includes(q) ||
          asset.name.toLowerCase().includes(q)
      );
    }

    sortData(data, sort, order);
    data = data.slice(0, limit);

    const context = computeContext(data);

    const snapshot: ScanSnapshot = {
      ok: true,
      ts,
      version: XYVALA_VERSION,
      source,
      market: DEFAULT_MARKET,
      quote,
      count: data.length,
      data,
      context,
      meta: {
        limit,
        sort,
        order,
        q,
        warnings: requestWarnings,
      },
    };

    if (!noStore) {
      setToCache(cacheKey, snapshot);
    }

    const res = buildResponse({
      ok: true,
      ts,
      version: XYVALA_VERSION,
      source,
      quote,
      count: data.length,
      data,
      context,
      meta: {
        limit,
        sort,
        order,
        q,
        cache: noStore ? "no-store" : "miss",
        warnings: requestWarnings,
      },
      error: null,
    });

    return respond(res, 200, auth, usage);
  } catch (error) {
    const res = buildResponse({
      ok: false,
      ts,
      source: "fallback",
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
        sort: DEFAULT_SORT,
        order: DEFAULT_ORDER,
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
      },
      error:
        error instanceof Error && error.message
          ? error.message
          : "unknown_error",
    });

    return respond(res, 500, auth, usage);
  }
}
