// app/api/rebuild/route.js
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// IMPORTANT (retour d'expérience Vercel) : ne force pas runtime="edge" si tu as déjà eu des soucis d'env vars.
// Laisse Node par défaut.
export const runtime = "nodejs";

const redis = Redis.fromEnv();

// Même clé que /api/scan
const PAYLOAD_KEY = "assets_payload";

// CoinGecko (free) — top market cap — EUR — 250
const VS = "eur";
const PER_PAGE = 250; // CoinGecko max
const PAGES = 1; // 1 page = 250
const COINGECKO_URL = (page) =>
  "https://api.coingecko.com/api/v3/coins/markets" +
  `?vs_currency=${encodeURIComponent(VS)}` +
  "&order=market_cap_desc" +
  `&per_page=${PER_PAGE}` +
  `&page=${page}` +
  "&sparkline=false" +
  "&price_change_percentage=24h,7d,30d";

function json(ok, payload = {}, status = 200) {
  return NextResponse.json({ ok, ts: Date.now(), ...payload }, { status });
}

// Auth : on garde ton mécanisme actuel (Bearer KV_REST_API_TOKEN)
// -> plus tard si tu veux un token dédié, tu crées REBUILD_TOKEN.
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
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  const regime = a24 <= 5 && a7 <= 10 ? "STABLE" : "VOLATILE";

  let rating = "C";
  if (score >= 85) rating = "A";
  else if (score >= 70) rating = "B";

  // "ruptures" = nb de seuils franchis
  let rupture = 0;
  if (a24 > 5) rupture++;
  if (a7 > 10) rupture++;
  if (a30 > 20) rupture++;

  const similarity = Math.max(0, Math.min(100, Math.round(100 - (a24 * 2 + a7))));

  const reason =
    regime === "STABLE"
      ? "Faible fréquence de ruptures, régime stable."
      : "Ruptures plus fréquentes, régime volatil.";

  return {
    stability_score: score,
    rating,
    regime,
    rupture_rate: rupture,
    similarity,
    reason,
  };
}

async function fetchMarkets() {
  let markets = [];

  for (let page = 1; page <= PAGES; page++) {
    const res = await fetch(COINGECKO_URL(page), {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`CoinGecko fetch failed: ${res.status}`);
    }

    const data = await res.json();

    markets.push(...data);
  }

  markets = markets.slice(0, 250);

  return markets.map((coin) => {
    const symbol = coin.symbol?.toUpperCase() ?? null;

    const chg24 = safeNum(coin.price_change_percentage_24h);
    const chg7 = safeNum(coin.price_change_percentage_7d_in_currency);
    const chg30 = safeNum(coin.price_change_percentage_30d_in_currency);

    const stability = computeStability({
      chg24,
      chg7,
      chg30,
    });

    return {
      asset: symbol,
      symbol,
      name: coin.name ?? null,

      price: safeNum(coin.current_price),

      chg_24h_pct: chg24,
      chg_7d_pct: chg7,
      chg_30d_pct: chg30,

      stability_score: stability.stability_score,
      rating: stability.rating,
      regime: stability.regime,

      rupture_rate: stability.rupture_rate,
      similarity: stability.similarity,
      reason: stability.reason,

      binance_url: symbol
        ? `https://www.binance.com/en/trade/${symbol}_USDT?type=spot&ref=1216069378`
        : null,
    };
  });
}
