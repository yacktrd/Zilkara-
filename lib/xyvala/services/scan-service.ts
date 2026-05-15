/* ============================================================================
 * FILE: lib/xyvala/services/scan-service.ts
 * ----------------------------------------------------------------------------
 * TITLE
 * - Xyvala public scan service
 *
 * ROLE
 * - orchestrate public scan asset loading
 * - use real observable market seeds when available
 * - preserve deterministic fallback when upstream source is unavailable
 * - expose public ScanAsset only through private-to-public transformer
 *
 * DIRECTIVES
 * - service orchestration only
 * - no UI logic
 * - no API logic
 * - no RFS recomputation here
 * - no MCI recomputation here
 * - no public/private leakage
 * - no broker / affiliate exposure
 * - EUR default quote
 * - real market source first
 * - fallback only when source is empty or invalid
 * ========================================================================== */

import type { Quote } from "@/lib/xyvala/snapshot";
import type { ScanAsset } from "@/lib/xyvala/contracts/scan-contract";

import { buildPrivateScanAsset } from "@/lib/xyvala/factories/scan-asset-factory";
import { buildScanEngineResult } from "@/lib/xyvala/scan-engine";
import { getMarketAssets } from "@/lib/xyvala/sources/market-source";
import { privateScanAssetsToPublicScanAssets } from "@/lib/xyvala/transformers/scan-private-to-public-transformer";

import {
  normalizeScanQuery,
  queryScanItems,
  type ScanSortKey,
  type ScanSortOrder,
} from "@/lib/xyvala/services/scan-query";

export type GetScanInput = {
  quote?: Quote | string | null;
  q?: string | null;
  sort?: ScanSortKey | string | null;
  order?: ScanSortOrder | string | null;
  limit?: number | string | null;
  noStore?: boolean;
};

export type ScanServiceResult = {
  ok: boolean;
  source: "scan" | "fallback";
  data: ScanAsset[];
  warnings: string[];
  error: string | null;
};

type AssetSeed = {
  id: string;
  symbol: string;
  name: string;
  rank: number | null;
  logo_url: string | null;
  price: number;
  chg_24h_pct: number;
  chg_7d_pct: number | null;
  market_cap: number | null;
  volume_24h: number | null;
  sparkline_7d: number[];
};

const DEFAULT_QUOTE: Quote = "eur";

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeQuote(value: unknown): Quote {
  const quote = safeString(value).toLowerCase();

  if (quote === "usd") return "usd";
  if (quote === "usdt") return "usdt";

  return DEFAULT_QUOTE;
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  return [
    ...new Set(
      groups
        .flatMap((group) => (Array.isArray(group) ? group : []))
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        ),
    ),
  ];
}

function getFallbackSeeds(): AssetSeed[] {
  return [
    {
      id: "btc",
      symbol: "BTC",
      name: "Bitcoin",
      rank: 1,
      logo_url: null,
      price: 64200,
      chg_24h_pct: 1.2,
      chg_7d_pct: null,
      market_cap: 1_260_000_000_000,
      volume_24h: 31_000_000_000,
      sparkline_7d: [61800, 62200, 62850, 63100, 63600, 63900, 64200],
    },
    {
      id: "eth",
      symbol: "ETH",
      name: "Ethereum",
      rank: 2,
      logo_url: null,
      price: 3180,
      chg_24h_pct: 0.7,
      chg_7d_pct: null,
      market_cap: 382_000_000_000,
      volume_24h: 14_800_000_000,
      sparkline_7d: [3050, 3070, 3095, 3110, 3140, 3165, 3180],
    },
    {
      id: "bnb",
      symbol: "BNB",
      name: "BNB",
      rank: 3,
      logo_url: null,
      price: 590,
      chg_24h_pct: 0.3,
      chg_7d_pct: null,
      market_cap: 86_000_000_000,
      volume_24h: 1_900_000_000,
      sparkline_7d: [571, 575, 578, 581, 585, 588, 590],
    },
    {
      id: "sol",
      symbol: "SOL",
      name: "Solana",
      rank: 4,
      logo_url: null,
      price: 142,
      chg_24h_pct: -0.6,
      chg_7d_pct: null,
      market_cap: 69_000_000_000,
      volume_24h: 3_200_000_000,
      sparkline_7d: [148, 147, 145, 144, 143, 142.5, 142],
    },
    {
      id: "xrp",
      symbol: "XRP",
      name: "XRP",
      rank: 5,
      logo_url: null,
      price: 0.61,
      chg_24h_pct: 0.1,
      chg_7d_pct: null,
      market_cap: 35_000_000_000,
      volume_24h: 1_600_000_000,
      sparkline_7d: [0.59, 0.595, 0.6, 0.598, 0.602, 0.607, 0.61],
    },
  ];
}

function buildPrivateAssets(input: {
  seeds: AssetSeed[];
  quote: Quote;
  source: "scan" | "fallback";
  warning: string;
}) {
  const generatedAt = new Date().toISOString();

  return input.seeds.map((seed) =>
    buildPrivateScanAsset({
      ...seed,
      quote: input.quote,
      source: input.source,
      analytical_version: "scan-service-v1",
      generated_at: generatedAt,
      warnings: [input.warning],
    }),
  );
}

async function loadRealSeeds(quote: Quote): Promise<AssetSeed[]> {
  const seeds = await getMarketAssets(quote);

  return seeds.map((seed) => ({
    id: seed.id,
    symbol: seed.symbol,
    name: seed.name,
    rank: seed.rank,
    logo_url: seed.logo_url,
    price: seed.price,
    chg_24h_pct: seed.chg_24h_pct,
    chg_7d_pct: seed.chg_7d_pct,
    market_cap: seed.market_cap,
    volume_24h: seed.volume_24h,
    sparkline_7d: seed.sparkline_7d,
  }));
}

export async function getScan(
  input: GetScanInput = {},
): Promise<ScanServiceResult> {
  const quote = normalizeQuote(input.quote);

  const query = normalizeScanQuery({
    q: input.q,
    sort: input.sort,
    order: input.order,
    limit: input.limit,
    cursor: 0,
  });

  try {
    const realSeeds = await loadRealSeeds(quote);
    const hasRealSeeds = realSeeds.length > 0;

    const seeds = hasRealSeeds ? realSeeds : getFallbackSeeds();
    const source: "scan" | "fallback" = hasRealSeeds ? "scan" : "fallback";

    const privateAssets = buildPrivateAssets({
      seeds,
      quote,
      source,
      warning: hasRealSeeds
        ? "scan_service_real_market_source"
        : "scan_service_fallback_seed",
    });

    const engine = buildScanEngineResult({
      data: privateAssets,
      key: "stability",
      order: "desc",
    });

    const publicAssets = privateScanAssetsToPublicScanAssets(engine.data);
    const queried = queryScanItems(publicAssets, query);

    return {
      ok: true,
      source,
      data: queried.data,
      warnings: uniqueWarnings(
        hasRealSeeds ? ["scan_service_real_market_dataset"] : ["scan_service_fallback_dataset"],
        engine.market_context.warnings,
      ),
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      source: "fallback",
      data: [],
      warnings: uniqueWarnings(["scan_service_failed"]),
      error:
        error instanceof Error && error.message
          ? error.message
          : "scan_service_unknown_error",
    };
  }
}

export async function getScanService(
  input: GetScanInput = {},
): Promise<ScanServiceResult> {
  return getScan(input);
}
