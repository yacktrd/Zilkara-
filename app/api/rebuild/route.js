import { kv } from "@vercel/kv";

export const runtime = "edge";

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/coins/markets";

const PER_PAGE = 250;

async function fetchCoins() {
  const url =
    `${COINGECKO_URL}?vs_currency=usd` +
    `&order=market_cap_desc` +
    `&per_page=${PER_PAGE}` +
    `&page=1` +
    `&sparkline=false` +
    `&price_change_percentage=24h,7d,30d`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`CoinGecko error ${res.status}`);
  }

  return res.json();
}

function transform(coin) {
  const price = coin.current_price ?? 0;

  const chg24 = coin.price_change_percentage_24h ?? 0;
  const chg7 = coin.price_change_percentage_7d_in_currency ?? 0;
  const chg30 = coin.price_change_percentage_30d_in_currency ?? 0;

  const stability =
    100 -
    Math.min(
      100,
      Math.abs(chg24) * 1.5 +
        Math.abs(chg7) * 0.8 +
        Math.abs(chg30) * 0.5
    );

  const rating =
    stability >= 80
      ? "A"
      : stability >= 60
      ? "B"
      : stability >= 40
      ? "C"
      : "D";

  const regime =
    stability >= 70
      ? "STABLE"
      : stability >= 40
      ? "VOLATILE"
      : "CHAOTIC";

  return {
    asset: coin.symbol.toUpperCase(),
    symbol: coin.symbol.toUpperCase(),

    price: price,

    chg_24h_pct: Number(chg24.toFixed(2)),
    chg_7d_pct: Number(chg7.toFixed(2)),
    chg_30d_pct: Number(chg30.toFixed(2)),

    stability_score: Math.round(stability),

    rating,
    regime,

    similarity: Math.round(stability),

    rupture_rate: Math.round(100 - stability),

    reason:
      regime === "STABLE"
        ? "Structure stable"
        : regime === "VOLATILE"
        ? "Volatilité contrôlée"
        : "Instabilité élevée",

    binance_url:
      `https://www.binance.com/en/trade/` +
      `${coin.symbol.toUpperCase()}_USDT?type=spot`,
  };
}

export async function POST(req) {
  try {
    const coins = await fetchCoins();

    if (!Array.isArray(coins)) {
      throw new Error("Invalid CoinGecko response");
    }

    const data = coins.map(transform);

    const payload = {
      ok: true,
      ts: Date.now(),
      data,
      meta: {
        updatedAt: Date.now(),
        count: data.length,
        limit: PER_PAGE,
      },
    };

    await kv.set("scan:latest", payload);

    return new Response(
      JSON.stringify({
        ok: true,
        route: "rebuild",
        written: true,
        count: data.length,
        ts: payload.ts,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
