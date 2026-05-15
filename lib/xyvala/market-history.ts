

/*
FILE: market-history.ts

PARENTS:
- lib/xyvala/contracts/scan-contract.ts
- lib/xyvala/services/scan-service.ts
- lib/xyvala/rfs-core.ts
- lib/xyvala/opportunity-core.ts

SECTIONS:
1. Types
2. Constants
3. Safe helpers
4. Time helpers
5. Price helpers
6. History builders
7. Public API

DIRECTIVES:
- Central history parent for Xyvala
- Provide deterministic historical series for RFS and MCI
- Keep current implementation compatible with fallback datasets
- Prepare long-history integration without changing consumer contracts
- Preserve EUR-compatible usage for European users
- No legacy fields allowed
*/

import type { Quote } from "@/lib/xyvala/snapshot";

/* =========================
   1. TYPES
========================= */

export type MarketHistoryInput = {
  id: string;
  symbol: string;
  quote: Quote;
  price: number;
  sparkline_7d: number[];
};

export type MarketHistoryPoint = {
  ts: number;
  price: number;
};

export type MarketHistorySeries = {
  quote: Quote;

  price_now: number;
  chg_24h_pct: number | null;
  chg_7d_pct: number | null;

  points_7d: MarketHistoryPoint[];
  prices_7d: number[];
  timestamps_7d: number[];

  history_days: number;
  history_months_estimate: number;

  history_mode: "SHORT" | "LONG_READY";
};

/* =========================
   2. CONSTANTS
========================= */

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_DAYS = 7;
const APPROX_DAYS_PER_MONTH = 30;

/* =========================
   3. SAFE HELPERS
========================= */

function safeFiniteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/* =========================
   4. TIME HELPERS
========================= */

function buildSyntheticTimestamps(length: number): number[] {
  const now = Date.now();

    if (length <= 0) {
    return [];
  }

  const stepMs = Math.floor(
    ((WEEK_DAYS - 1) * DAY_MS) / Math.max(length - 1, 1),
  );

  return Array.from({ length }, (_, index) => {
    return now - (length - 1 - index) * stepMs;
  });
}

/* =========================
   5. PRICE HELPERS
========================= */
function computePctChange(from: number, to: number): number {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) {
    return 0;
  }

  return ((to - from) / Math.abs(from)) * 100;
}


function compute24hChangeFrom7d(prices: number[]): number | null {
    if (prices.length < 2) {
    return null;
  }

  const last = prices[prices.length - 1];
  const prev = prices[prices.length - 2];

  if (
  typeof prev !== "number" ||
  typeof last !== "number" ||
  !Number.isFinite(prev) ||
  !Number.isFinite(last)
) {
  return null;
}

return computePctChange(prev, last);
}

function compute7dChange(prices: number[]): number | null {
  if (prices.length < 2) {
    return null;
  }

  const first = prices[0];
  const last = prices[prices.length - 1];

  if (
  typeof first !== "number" ||
  typeof last !== "number" ||
  !Number.isFinite(first) ||
  !Number.isFinite(last)
) {
  return null;
}

return computePctChange(first, last);

}

/* =========================
   6. HISTORY BUILDERS
========================= */

function normalizeSparkline(
  price: number,
  sparkline_7d: number[],
): number[] {
  const filtered = sparkline_7d.filter(
    (value) => typeof value === "number" && Number.isFinite(value),
  );

  if (filtered.length >= 2) {
    return filtered;
  }

  const fallbackPrice = safeFiniteNumber(price, 0);

  return [fallbackPrice, fallbackPrice];
}

function buildPoints(
  prices: number[],
  timestamps: number[],
): MarketHistoryPoint[] {
  return prices
    .map((price, index) => {
      const ts = timestamps[index];

      if (
        typeof price !== "number" ||
        typeof ts !== "number" ||
        !Number.isFinite(price) ||
        !Number.isFinite(ts)
      ) {
        return null;
      }

      return {
        ts,
        price,
      };
    })
    .filter((point): point is MarketHistoryPoint => point !== null);
}

/* =========================
   7. PUBLIC API
========================= */

export function buildMarketHistory(
  input: MarketHistoryInput,
): MarketHistorySeries {
  const price_now = safeFiniteNumber(input.price, 0);
  const prices_7d = normalizeSparkline(price_now, input.sparkline_7d);
  const timestamps_7d = buildSyntheticTimestamps(prices_7d.length);
  const points_7d = buildPoints(prices_7d, timestamps_7d);

  const history_days = prices_7d.length;
  const history_months_estimate = Math.max(
    0,
    Math.floor(history_days / APPROX_DAYS_PER_MONTH),
  );

  return {
    quote: input.quote,

    price_now,
    chg_24h_pct: compute24hChangeFrom7d(prices_7d),
    chg_7d_pct: compute7dChange(prices_7d),

    points_7d,
    prices_7d,
    timestamps_7d,

    history_days,
    history_months_estimate,

    history_mode: history_days < 365 ? "SHORT" : "LONG_READY",
  };
}
