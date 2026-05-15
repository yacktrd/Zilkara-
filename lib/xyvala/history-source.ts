/*
FILE: history-source.ts

PARENTS:
- lib/xyvala/market-history.ts
- lib/xyvala/services/scan-service.ts
- lib/xyvala/contracts/scan-contract.ts

SECTIONS:
1. Types
2. Safe helpers
3. Source contracts
4. CoinGecko helpers
5. Fallback source
6. Live source
7. Public source API

DIRECTIVES:
- Central historical source parent for Xyvala
- Keep source selection outside scan-service
- Preserve deterministic fallback behavior
- Prepare real market history integration without changing consumer contracts
- Keep EUR-compatible usage for European users
- No legacy fields allowed
- Keep this file focused on sourcing and normalization only
- Do not place RFS or MCI logic here
*/

import type { Quote } from "@/lib/xyvala/snapshot";

/* =========================
   1. TYPES
========================= */

export type HistorySourceAsset = {
  id: string;
  symbol: string;
  name: string;
  rank: number | null;
  logo_url: string | null;

  price: number;
  chg_24h_pct: number | null;
  chg_7d_pct: number | null;

  market_cap: number | null;
  volume_24h: number | null;

  sparkline_7d: number[];
};

export type HistorySourceInput = {
  quote: Quote;
  limit: number;
};

export type HistorySourceResult = {
  ok: boolean;
  source: "fallback" | "live";
  assets: HistorySourceAsset[];
  warnings: string[];
  error: string | null;
};

export type HistorySourceAdapter = (
  input: HistorySourceInput,
) => Promise<HistorySourceResult>;

type CoinGeckoMarketsItem = {
  id?: unknown;
  symbol?: unknown;
  name?: unknown;
  image?: unknown;
  market_cap_rank?: unknown;
  current_price?: unknown;
  price_change_percentage_24h?: unknown;
  market_cap?: unknown;
  total_volume?: unknown;
};

type CoinGeckoMarketChart = {
  prices?: unknown;
};

/* =========================
   2. SAFE HELPERS
========================= */

function safeFiniteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeFiniteNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function uniqueWarnings(
  ...groups: Array<string[] | undefined | null>
): string[] {
  const merged = groups.flatMap((group) => (Array.isArray(group) ? group : []));

  return [
    ...new Set(
      merged.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      ),
    ),
  ];
}

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/* =========================
   3. SOURCE CONTRACTS
========================= */

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 250;
const MAX_ASSETS = 5;
const HISTORY_DAYS = 365;

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

function getCoinGeckoApiKey(): string {
  return safeString(process.env.COINGECKO_API_KEY);
}

function getCoinGeckoHeaders(): HeadersInit {
  const apiKey = getCoinGeckoApiKey();

  if (!apiKey) {
    return {
      accept: "application/json",
    };
  }

  return {
    accept: "application/json",
    "x-cg-demo-api-key": apiKey,
  };
}

function quoteToVsCurrency(quote: Quote): "eur" | "usd" {
  if (quote === "usd" || quote === "usdt") {
    return "usd";
  }

  return "eur";
}

/* =========================
   4. COINGECKO HELPERS
========================= */

function normalizeSparklineFromChart(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is [number, number] => {
      return (
        Array.isArray(item) &&
        item.length >= 2 &&
        typeof item[0] === "number" &&
        Number.isFinite(item[0]) &&
        typeof item[1] === "number" &&
        Number.isFinite(item[1])
      );
    })
    .map((item) => item[1]);
}

async function fetchCoinGeckoMarketChart(
  id: string,
  quote: Quote,
): Promise<{ sparkline_7d: number[]; warning?: string }> {
  const vsCurrency = quoteToVsCurrency(quote);

  const url = new URL(
    `${COINGECKO_BASE_URL}/coins/${encodeURIComponent(id)}/market_chart`,
  );
  url.searchParams.set("vs_currency", vsCurrency);
  const HISTORY_DAYS = 365;

url.searchParams.set("days", HISTORY_DAYS.toString());

// CoinGecko optimise automatiquement l’intervalle
// daily pour 365 jours → parfait pour RFS
url.searchParams.delete("interval");
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getCoinGeckoHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        sparkline_7d: [],
        warning: `coingecko_market_chart_${response.status}_${id}`,
      };
    }

    const payload = await safeJson<CoinGeckoMarketChart>(response);

    return {
      sparkline_7d: normalizeSparklineFromChart(payload?.prices),
    };
  } catch {
    return {
      sparkline_7d: [],
      warning: `coingecko_market_chart_fetch_failed_${id}`,
    };
  }
}

/* =========================
   5. FALLBACK SOURCE
========================= */

async function getFallbackHistorySource(
  input: HistorySourceInput,
): Promise<HistorySourceResult> {
  const limit = clamp(
    safeFiniteNumber(input.limit, DEFAULT_LIMIT),
    1,
    MAX_LIMIT,
  );

  const assets: HistorySourceAsset[] = [
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

  return {
    ok: true,
    source: "fallback",
    assets: assets.slice(0, limit),
    warnings: ["history_source_fallback_dataset"],
    error: null,
  };
}



/* =========================
   6. LIVE SOURCE
========================= */

async function getLiveHistorySource(
  input: HistorySourceInput,
): Promise<HistorySourceResult> {
  const limit = clamp(
    safeFiniteNumber(input.limit, DEFAULT_LIMIT),
    1,
    Math.min(MAX_LIMIT, MAX_ASSETS),
  );

  const url = new URL(`${COINGECKO_BASE_URL}/coins/markets`);
  url.searchParams.set("vs_currency", quoteToVsCurrency(input.quote));
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("per_page", String(limit));
  url.searchParams.set("page", "1");
  url.searchParams.set("sparkline", "false");
  url.searchParams.set("price_change_percentage", "24h");

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getCoinGeckoHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        source: "live",
        assets: [],
        warnings: [`coingecko_markets_${response.status}`],
        error: `coingecko_markets_${response.status}`,
      };
    }

    const payload = await safeJson<CoinGeckoMarketsItem[]>(response);

    if (!Array.isArray(payload) || payload.length === 0) {
      return {
        ok: false,
        source: "live",
        assets: [],
        warnings: ["coingecko_markets_empty"],
        error: "coingecko_markets_empty",
      };
    }

    const warnings: string[] = [];
    const assets: HistorySourceAsset[] = [];

    // Xyvala note:
    // - Controlled parallelism reduces latency without widening the scope too much.
    // - Keep the asset count low while CoinGecko market_chart is fetched per asset.
    const CHUNK_SIZE = 3;

    for (let start = 0; start < payload.length; start += CHUNK_SIZE) {
      const chunk = payload.slice(start, start + CHUNK_SIZE);

      const charts = await Promise.all(
        chunk.map((item) => {
          const id = safeString(item.id);

          if (!id) {
            return Promise.resolve({
              sparkline_7d: [] as number[],
              warning: "coingecko_market_chart_invalid_id",
            });
          }

          return fetchCoinGeckoMarketChart(id, input.quote);
        }),
      );

      chunk.forEach((item, index) => {
        const id = safeString(item.id);
        const symbol = safeString(item.symbol).toUpperCase();
        const name = safeString(item.name, symbol);

        if (!id || !symbol || !name) {
          warnings.push("coingecko_markets_invalid_item");
          return;
        }

        const chart = charts[index];

        if (chart?.warning) {
          warnings.push(chart.warning);
        }

        assets.push({
          id,
          symbol,
          name,
          rank: safeFiniteNumberOrNull(item.market_cap_rank),
          logo_url: safeString(item.image) || null,

          price: safeFiniteNumber(item.current_price, 0),
          chg_24h_pct: safeFiniteNumberOrNull(
            item.price_change_percentage_24h,
          ),
          chg_7d_pct: null,

          market_cap: safeFiniteNumberOrNull(item.market_cap),
          volume_24h: safeFiniteNumberOrNull(item.total_volume),

          // Historical RFS input.
          // The field name is preserved for compatibility even if the series
          // is no longer limited to 7 literal days in future evolutions.
          sparkline_7d: Array.isArray(chart?.sparkline_7d)
            ? chart.sparkline_7d
            : [],
        });
      });
    }

    if (assets.length === 0) {
      return {
        ok: false,
        source: "live",
        assets: [],
        warnings: uniqueWarnings(warnings, [
          "coingecko_live_assets_empty",
        ]),
        error: "coingecko_live_assets_empty",
      };
    }

    return {
      ok: true,
      source: "live",
      assets,
      warnings: uniqueWarnings(warnings),
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      source: "live",
      assets: [],
      warnings: ["coingecko_live_fetch_failed"],
      error:
        error instanceof Error && error.message
          ? error.message
          : "coingecko_live_fetch_failed",
    };
  }
}

/* =========================
   7. PUBLIC SOURCE API
========================= */

export async function getHistorySource(
  input: HistorySourceInput,
): Promise<HistorySourceResult> {
  return getLiveHistorySource(input);
}

export async function getPreferredHistorySource(
  input: HistorySourceInput,
): Promise<HistorySourceResult> {
  const live = await getLiveHistorySource(input);

  if (live.ok) {
    return {
      ...live,
      warnings: uniqueWarnings(live.warnings),
    };
  }

  const fallback = await getFallbackHistorySource(input);

  return {
    ...fallback,
    warnings: uniqueWarnings(live.warnings, fallback.warnings),
  };
}
