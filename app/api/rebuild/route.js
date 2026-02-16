// app/api/rebuild/route.js
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// On reste sur Node (plus fiable que edge avec Upstash + fetch + env)
export const runtime = "nodejs";

const redis = Redis.fromEnv();

// Même clé que /api/scan (scan lit redis.get("assets_payload"))
const PAYLOAD_KEY = "assets_payload";

// CoinGecko (free) — pagination robuste (ne pas compter sur 250 d'un coup)
const VS = "eur";
const PER_PAGE = 100; // plus fiable que 250/page
const PAGES = 3; // 3*100=300 puis slice 250
const COINGECKO_URL = (page) =>
  `https://api.coingecko.com/api/v3/coins/markets` +
  `?vs_currency=${encodeURIComponent(VS)}` +
  `&order=market_cap_desc` +
  `&per_page=${PER_PAGE}` +
  `&page=${page}` +
  `&sparkline=false` +
  `&price_change_percentage=24h,7d,30d`;

const BINANCE_REF = "1216069378";

function json(ok, payload = {}, status = 200) {
  return NextResponse.json({ ok, ts: Date.now(), ...payload }, { status });
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

// Scoring simple (non-propriétaire) : stabilité vs amplitudes
function computeStability({ chg24, chg7, chg30 }) {
  const a24 = Math.abs(chg24 ?? 0);
  const a7 = Math.abs(chg7 ?? 0);
  const a30 = Math.abs(chg30 ?? 0);

  // pénalité pondérée (24h pèse plus)
  const penalty = a24 * 2.2 + a7 * 1.2 + a30 * 0.6;
  const stability_score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  const regime = a24 <= 5 && a7 <= 10 ? "STABLE" : "VOLATILE";

  let rating = "C";
  if (stability_score >= 85) rating = "A";
  else if (stability_score >= 70) rating = "B";

  // ruptures = nb de seuils franchis
  let rupture_rate = 0;
  if (a24 > 5) rupture_rate++;
  if (a7 > 10) rupture_rate++;
  if (a30 > 20) rupture_rate++;

  const similarity = Math.max(0, Math.min(100, Math.round(100 - (a24 * 2 + a7))));

  const reason =
    regime === "STABLE"
      ? "Faible fréquence de ruptures, régime stable."
      : "Ruptures plus fréquentes, régime volatil.";

  return { stability_score, rating, regime, rupture_rate, similarity, reason };
}

async function fetchMarkets250() {
  const markets = [];
  const seen = new Set();

  for (let page = 1; page <= PAGES; page++) {
    const res = await fetch(COINGECKO_URL(page), {
      cache: "no-store",
      headers: { accept: "application/json" },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`CoinGecko fetch failed: ${res.status} ${txt.slice(0, 120)}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) continue;

    for (const coin of data) {
      const symbol = (coin?.symbol || "").toUpperCase();
      if (!symbol) continue;
      if (seen.has(symbol)) continue; // dédoublonnage symbol
      seen.add(symbol);

      const chg24 = safeNum(coin?.price_change_percentage_24h);
      const chg7 = safeNum(coin?.price_change_percentage_7d_in_currency);
      const chg30 = safeNum(coin?.price_change_percentage_30d_in_currency);

      const score = computeStability({ chg24, chg7, chg30 });

      markets.push({
        asset: symbol,
        symbol,
        name: coin?.name ?? null,

        price: safeNum(coin?.current_price),

        chg_24h_pct: chg24,
        chg_7d_pct: chg7,
        chg_30d_pct: chg30,

        stability_score: score.stability_score,
        rating: score.rating,
        regime: score.regime,

        rupture_rate: score.rupture_rate,
        similarity: score.similarity,
        reason: score.reason,

        // affiliation Binance injectée côté API
        binance_url: `https://www.binance.com/en/trade/${symbol}_USDT?type=spot&ref=${BINANCE_REF}`,
      });

      if (markets.length >= 250) break;
    }

    if (markets.length >= 250) break;
  }

  // On force 250 max
  return markets.slice(0, 250);
}

export async function POST(req) {
  try {
    if (!isAuthorized(req)) {
      return json(
        false,
        {
          route: "rebuild",
          written: false,
          data: [],
          error: { code: "UNAUTHORIZED", message: "Invalid token" },
        },
        401
      );
    }

    const assets = await fetchMarkets250();

    // Payload exact que /api/scan doit relire
    const payload = {
      assets,
      payload_updatedAt: Date.now(),
    };

    await redis.set(PAYLOAD_KEY, payload);

    return json(true, {
      route: "rebuild",
      written: true,
      count: assets.length,
      updatedAt: payload.payload_updatedAt,
    });
  } catch (err) {
    console.error("[/api/rebuild] INTERNAL", err);
    return json(
      false,
      {
        route: "rebuild",
        written: false,
        data: [],
        error: { code: "INTERNAL", message: err?.message || "Internal error" },
      },
      500
    );
  }
}
