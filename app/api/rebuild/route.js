import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAYLOAD_KEY = "assets_payload";

const VS = "eur";
const PER_PAGE = 100;
const MAX_PAGES = 3; // 3x100 = 300 actifs récupérés
const LIMIT = 250;

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
  if (stability_score >= 85) rating = "A";
  else if (stability_score >= 70) rating = "B";

  let rupture_rate = 0;
  if (a24 > 5) rupture_rate++;
  if (a7 > 10) rupture_rate++;
  if (a30 > 20) rupture_rate++;

  const similarity =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(100 - (a24 * 2 + a7))
      )
    );

  const reason =
    regime === "STABLE"
      ? "Faible fréquence de ruptures, régime stable."
      : "Structure volatile.";

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
    `&price_change_percentage=24h,7d,30d`;

  const res = await fetch(url, {
    cache: "no-store",
  });

  if (!res.ok)
    throw new Error(
      `CoinGecko error ${res.status}`
    );

  return res.json();
}

async function fetchAllAssets() {

  const all = [];

  for (let page = 1; page <= MAX_PAGES; page++) {

    const data = await fetchPage(page);

    if (!Array.isArray(data) || data.length === 0)
      break;

    all.push(...data);

    await new Promise(r => setTimeout(r, 400));
  }

  return all;
}

export async function POST(req) {

  try {

    if (!isAuthorized(req))
      return json(false, { error: "Unauthorized" }, 401);

    const raw = await fetchAllAssets();

    const assets =
      raw
        .slice(0, LIMIT)
        .map(a => {

          const price =
            safeNum(a.current_price);

          const chg24 =
            safeNum(
              a.price_change_percentage_24h_in_currency
            );

          const chg7 =
            safeNum(
              a.price_change_percentage_7d_in_currency
            );

          const chg30 =
            safeNum(
              a.price_change_percentage_30d_in_currency
            );

          const score =
            computeStability({
              chg24,
              chg7,
              chg30,
            });

          return {

            asset: a.symbol?.toUpperCase(),
            symbol: a.symbol?.toUpperCase(),

            price,

            chg_24h_pct: chg24,
            chg_7d_pct: chg7,
            chg_30d_pct: chg30,

            ...score,

            binance_url:
              `https://www.binance.com/en/trade/${a.symbol?.toUpperCase()}_USDT?ref=${BINANCE_REF}`

          };
        });

    await fetch(
      `${process.env.KV_REST_API_URL}/set/${PAYLOAD_KEY}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          value: JSON.stringify({
            updatedAt: Date.now(),
            count: assets.length,
            limit: LIMIT,
            data: assets,
          }),
        }),
      }
    );

    return json(true, {
      route: "rebuild",
      written: true,
      count: assets.length,
    });

  } catch (e) {

    return json(
      false,
      { error: e.message },
      500
    );
  }
}
return json(true, { route: "rebuild", written: true, version: "rebuild-v250", count: assets.length });
