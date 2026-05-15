/* ============================================================================
 * FILE: app/api/summary/route.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public summary route
 *
 * ROLE
 * - expose a public descriptive market summary
 * - stay aligned with the public ScanAsset contract
 * - prevent private analytical, regime, decision and opportunity leakage
 *
 * DIRECTIVES
 * - public API only
 * - EUR default quote
 * - no decision exposure
 * - no regime exposure
 * - no opportunity exposure
 * - no stability score exposure
 * - no broker / affiliate exposure
 * - no RFS recomputation
 * - no MCI recomputation
 * - descriptive market data only
 * - null means explicitly unavailable
 * ========================================================================== */

import { NextRequest, NextResponse } from "next/server";

import { getScan } from "@/lib/xyvala/services/scan-service";

import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

import {
  XYVALA_SNAPSHOT_VERSION,
  type Quote,
} from "@/lib/xyvala/snapshot";

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

type SummaryTopAsset = {
  rank: number | null;
  symbol: string;
  name: string;
  price: number | null;
  chg_24h_pct: number | null;
  chg_7d_pct: number | null;
  market_cap: number | null;
  volume_24h: number | null;
};

type SummaryResponse = {
  ok: boolean;
  ts: string;
  version: string;
  market: "crypto";
  quote: Quote;
  source: "scan" | "fallback";
  count: number;
  summary: {
    avg_price: number | null;
    avg_chg_24h_pct: number | null;
    avg_chg_7d_pct: number | null;
    total_market_cap: number | null;
    total_volume_24h: number | null;
    top_ranked_assets: SummaryTopAsset[];
    top_market_cap_assets: SummaryTopAsset[];
    top_volume_assets: SummaryTopAsset[];
  };
  meta: {
    region: "EU";
    currency: "EUR" | "USD" | "USDT";
    q: string | null;
    limit: number;
    warnings: string[];
  };
  error: string | null;
};

/* ============================================================================
 * 2. CONSTANTS
 * ========================================================================== */

const DEFAULT_QUOTE: Quote = "eur";
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 250;

/* ============================================================================
 * 3. SAFE HELPERS
 * ========================================================================== */

function nowIso(): string {
  return new Date().toISOString();
}

function safeLower(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;

  return round2(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function sum(values: number[]): number | null {
  if (values.length === 0) return null;

  return round2(values.reduce((total, value) => total + value, 0));
}

function normalizeQuote(value: string | null): Quote {
  const quote = safeLower(value);

  if (quote === "usd") return "usd";
  if (quote === "usdt") return "usdt";

  return DEFAULT_QUOTE;
}

function normalizeLimit(value: string | null): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(parsed)));
}

function normalizeSearch(value: string | null): string | null {
  const q = safeLower(value);

  return q.length > 0 ? q : null;
}

function parseBool(value: string | null): boolean {
  const normalized = safeLower(value);

  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

function quoteToCurrency(quote: Quote): "EUR" | "USD" | "USDT" {
  if (quote === "usd") return "USD";
  if (quote === "usdt") return "USDT";

  return "EUR";
}

/* ============================================================================
 * 4. SUMMARY HELPERS
 * ========================================================================== */

function mapTopAsset(asset: ScanAsset): SummaryTopAsset {
  return {
    rank: asset.rank ?? null,
    symbol: asset.symbol,
    name: asset.name,
    price: asset.price ?? null,
    chg_24h_pct: asset.chg_24h_pct ?? null,
    chg_7d_pct: asset.chg_7d_pct ?? null,
    market_cap: asset.market_cap ?? null,
    volume_24h: asset.volume_24h ?? null,
  };
}

function sortByRank(data: ScanAsset[]): ScanAsset[] {
  return [...data].sort((a, b) => {
    const aRank = a.rank ?? Number.POSITIVE_INFINITY;
    const bRank = b.rank ?? Number.POSITIVE_INFINITY;

    if (aRank !== bRank) {
      return aRank - bRank;
    }

    return a.symbol.localeCompare(b.symbol);
  });
}

function sortByMarketCap(data: ScanAsset[]): ScanAsset[] {
  return [...data].sort((a, b) => {
    const aMarketCap = a.market_cap ?? -1;
    const bMarketCap = b.market_cap ?? -1;

    if (aMarketCap !== bMarketCap) {
      return bMarketCap - aMarketCap;
    }

    return a.symbol.localeCompare(b.symbol);
  });
}

function sortByVolume(data: ScanAsset[]): ScanAsset[] {
  return [...data].sort((a, b) => {
    const aVolume = a.volume_24h ?? -1;
    const bVolume = b.volume_24h ?? -1;

    if (aVolume !== bVolume) {
      return bVolume - aVolume;
    }

    return a.symbol.localeCompare(b.symbol);
  });
}

function buildSummary(data: ScanAsset[]): SummaryResponse["summary"] {
  const priceValues: number[] = [];
  const change24hValues: number[] = [];
  const change7dValues: number[] = [];
  const marketCapValues: number[] = [];
  const volume24hValues: number[] = [];

  for (const asset of data) {
    const price = safeNumber(asset.price);
    const change24h = safeNumber(asset.chg_24h_pct);
    const change7d = safeNumber(asset.chg_7d_pct);
    const marketCap = safeNumber(asset.market_cap);
    const volume24h = safeNumber(asset.volume_24h);

    if (price !== null) priceValues.push(price);
    if (change24h !== null) change24hValues.push(change24h);
    if (change7d !== null) change7dValues.push(change7d);
    if (marketCap !== null) marketCapValues.push(marketCap);
    if (volume24h !== null) volume24hValues.push(volume24h);
  }

  return {
    avg_price: mean(priceValues),
    avg_chg_24h_pct: mean(change24hValues),
    avg_chg_7d_pct: mean(change7dValues),
    total_market_cap: sum(marketCapValues),
    total_volume_24h: sum(volume24hValues),
    top_ranked_assets: sortByRank(data).slice(0, 5).map(mapTopAsset),
    top_market_cap_assets: sortByMarketCap(data).slice(0, 5).map(mapTopAsset),
    top_volume_assets: sortByVolume(data).slice(0, 5).map(mapTopAsset),
  };
}

/* ============================================================================
 * 5. ROUTE HANDLER
 * ========================================================================== */

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const quote = normalizeQuote(searchParams.get("quote"));
  const q = normalizeSearch(searchParams.get("q"));
  const limit = normalizeLimit(searchParams.get("limit"));
  const noStore = parseBool(searchParams.get("noStore"));

  try {
    const service = await getScan({
      quote,
      q,
      sort: "rank",
      order: "asc",
      limit,
      noStore,
    });

    const payload: SummaryResponse = {
      ok: service.ok,
      ts: nowIso(),
      version: XYVALA_SNAPSHOT_VERSION,
      market: "crypto",
      quote,
      source: service.source,
      count: service.data.length,
      summary: buildSummary(service.data),
      meta: {
        region: "EU",
        currency: quoteToCurrency(quote),
        q,
        limit,
        warnings: service.warnings,
      },
      error: service.error,
    };

    return NextResponse.json(payload, {
      status: service.ok ? 200 : 503,
      headers: {
        "cache-control": "no-store",
        "x-xyvala-version": XYVALA_SNAPSHOT_VERSION,
        "x-xyvala-endpoint": "/api/summary",
      },
    });
  } catch (error) {
    const payload: SummaryResponse = {
      ok: false,
      ts: nowIso(),
      version: XYVALA_SNAPSHOT_VERSION,
      market: "crypto",
      quote: DEFAULT_QUOTE,
      source: "fallback",
      count: 0,
      summary: {
        avg_price: null,
        avg_chg_24h_pct: null,
        avg_chg_7d_pct: null,
        total_market_cap: null,
        total_volume_24h: null,
        top_ranked_assets: [],
        top_market_cap_assets: [],
        top_volume_assets: [],
      },
      meta: {
        region: "EU",
        currency: "EUR",
        q: null,
        limit: DEFAULT_LIMIT,
        warnings: [],
      },
      error:
        error instanceof Error && error.message
          ? error.message
          : "summary_route_unknown_error",
    };

    return NextResponse.json(payload, {
      status: 500,
      headers: {
        "cache-control": "no-store",
        "x-xyvala-version": XYVALA_SNAPSHOT_VERSION,
        "x-xyvala-endpoint": "/api/summary",
      },
    });
  }
}
