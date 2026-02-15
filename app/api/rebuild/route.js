// app/api/rebuild/route.js
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// même clé que /api/scan (tu l’as déjà : redis.get("assets_payload"))
const PAYLOAD_KEY = "assets_payload";

const PER_PAGE = 250;
const PAGES = 2; // 2 x 250 = 500 (sécurité, tu peux limiter à 250 ensuite)

let markets = [];

for (let page = 1; page <= PAGES; page++) {
  const url =
    "https://api.coingecko.com/api/v3/coins/markets" +
    `?vs_currency=eur` +
    `&order=market_cap_desc` +
    `&per_page=${PER_PAGE}` +
    `&page=${page}` +
    `&sparkline=false`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("CoinGecko fetch failed");
  }

  const data = await res.json();
  markets.push(...data);
}

// limiter à 250 exact
markets = markets.slice(0, 250);

// Auth: on garde ton mécanisme actuel (Bearer KV_REST_API_TOKEN)
// -> si tu veux un token dédié plus tard, on fera REBUILD_TOKEN.
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

// scoring simple (non-propriétaire) : stabilité vs amplitudes
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

  // “ruptures” = nb de seuils franchis
  let rupture = 0;
  if (a24 > 5) rupture++;
  if (a7 > 10) rupture++;
  if (a30 > 20) rupture++;

  const similarity = Math.max(0, Math.min(100, Math.round(100 - (a24 * 2 + a7))));

  const reason =
    regime === "STABLE"
      ? "Faible fréquence de ruptures, régime stable."
      : "Ruptures plus fréquentes, régime volatil.";

  return { stability_score: score, rating, regime, rupture_rate: rupture, similarity, reason };
}

export async function POST(req) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { ok: false, ts: Date.now(), data: [], error: { code: "UNAUTHORIZED", message: "Missing/invalid token." } },
        { status: 401 }
      );
    }

    // fetch CoinGecko avec timeout court
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);

    const r = await fetch(COINGECKO_URL, {
      headers: { accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(t);

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          ts: Date.now(),
          data: [],
          error: { code: "COINGECKO_ERROR", message: `CoinGecko ${r.status} ${txt?.slice(0, 160)}` },
        },
        { status: 502 }
      );
    }

    const rows = await r.json();

    const assets = Array.isArray(rows)
      ? rows.map((c) => {
          const symbol = (c?.symbol || "").toUpperCase();
          const name = c?.name ?? null;

          // CoinGecko renvoie les % dans ces champs
          const chg24 = safeNum(c?.price_change_percentage_24h_in_currency);
          const chg7 = safeNum(c?.price_change_percentage_7d_in_currency);
          const chg30 = safeNum(c?.price_change_percentage_30d_in_currency);

          const base = {
            asset: symbol || null,
            symbol: symbol || null,
            name,
            price: safeNum(c?.current_price),

            chg_24h_pct: chg24,
            chg_7d_pct: chg7,
            chg_30d_pct: chg30,
          };

          const computed = computeStability({ chg24, chg7, chg30 });

          return { ...base, ...computed };
        })
      : [];

    const payload = {
      assets,
      count: assets.length,
      payload_updatedAt: Date.now(),
      source: "coingecko",
      vs: "eur",
    };

    await redis.set(PAYLOAD_KEY, payload);

    return NextResponse.json({
      ok: true,
      route: "rebuild",
      ts: Date.now(),
      count: assets.length,
      updatedAt: payload.payload_updatedAt,
    });
  } catch (err) {
    console.error("[/api/rebuild] INTERNAL", err);
    return NextResponse.json(
      { ok: false, ts: Date.now(), data: [], error: { code: "INTERNAL", message: "Internal error" } },
      { status: 500 }
    );
  }
}

nano app/api/rebuild/route.js
