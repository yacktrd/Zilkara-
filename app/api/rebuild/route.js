// app/api/rebuild/route.js

import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";

const redis = Redis.fromEnv();

const PAYLOAD_KEY = "assets_payload";

const VS = "eur";
const PER_PAGE = 100;
const PAGES = 3;

const BINANCE_REF = "1216069378";

function json(ok, payload = {}, status = 200) {
  return NextResponse.json(
    { ok, ts: Date.now(), ...payload },
    { status }
  );
}

function isAuthorized(req) {
  const auth = req.headers.get("authorization") || "";
  const expected = process.env.KV_REST_API_TOKEN;

  if (!expected) return false;

  return auth === `Bearer ${expected}`;
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function computeStability({ chg24, chg7, chg30 }) {
  const a24 = Math.abs(chg24 ?? 0);
  const a7 = Math.abs(chg7 ?? 0);
  const a30 = Math.abs(chg30 ?? 0);

  const penalty =
    a24 * 2.2 +
    a7 * 1.2 +
    a30 * 0.6;

  const stability_score =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(100 - penalty)
      )
    );

  const regime =
    a24 <= 5 && a7 <= 10
      ? "STABLE"
      : "VOLATILE";

  let rating = "C";

  if (stability_score >= 85)
    rating = "A";
  else if (stability_score >= 70)
    rating = "B";

  let rupture_rate = 0;

  if (a24 > 5) rupture_rate++;
  if (a7 > 10) rupture_rate++;
  if (a30 > 20) rupture_rate++;

  const similarity =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 - (a24 * 2 + a7)
        )
      )
    );

  const reason =
    regime === "STABLE"
      ? "Faible fréquence de ruptures, régime stable."
      : "Ruptures plus fréquentes, régime volatil.";

  return {
    stability_score,
    rating,
    regime,
    rupture_rate,
    similarity,
    reason,
  };
}

async function fetchPage(page) {
  const url =
    `https://api.coingecko.com/api/v3/coins/markets` +
    `?vs_currency=${VS}` +
    `&order=market_cap_desc` +
    `&per_page=${PER_PAGE}` +
    `&page=${page}` +
    `&sparkline=false` +
    `&price_change_percentage=24h,7d,30d`;

  const res = await fetch(url, {
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `CoinGecko error ${res.status}`
    );
  }

  return res.json();
}

export async function POST(req) {
  try {
    if (!isAuthorized(req)) {
      return json(
        false,
        { error: "unauthorized" },
        401
      );
    }

    let all = [];

    for (let page = 1; page <= PAGES; page++) {
      const data = await fetchPage(page);

      if (!Array.isArray(data))
        continue;

      all = all.concat(data);
    }

    const assets =
      all
        .slice(0, 250)
        .map((coin) => {
          const chg24 =
            safeNum(
              coin.price_change_percentage_24h
            );

          const chg7 =
            safeNum(
              coin.price_change_percentage_7d_in_currency
            );

          const chg30 =
            safeNum(
              coin.price_change_percentage_30d_in_currency
            );

          const stability =
            computeStability({
              chg24,
              chg7,
              chg30,
            });

          return {
            asset:
              coin.symbol?.toUpperCase(),
            symbol:
              coin.symbol?.toUpperCase(),
            price:
              safeNum(
                coin.current_price
              ),
            chg_24h_pct: chg24,
            chg_7d_pct: chg7,
            chg_30d_pct: chg30,
            stability_score:
              stability.stability_score,
            rating:
              stability.rating,
            regime:
              stability.regime,
            rupture_rate:
              stability.rupture_rate,
            similarity:
              stability.similarity,
            reason:
              stability.reason,
            binance_url:
              `https://www.binance.com/en/trade/${coin.symbol.toUpperCase()}_USDT?type=spot&ref=${BINANCE_REF}`,
          };
        });

    const payload = {
      assets,
      payload_updatedAt:
        Date.now(),
    };

    await redis.set(
      PAYLOAD_KEY,
      payload
    );

    return json(true, {
      written: assets.length,
    });
  } catch (err) {
    return json(
      false,
      { error: err.message },
      500
    );
  }
}
