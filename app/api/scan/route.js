// app/api/scan/route.js
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// ✅ IMPORTANT : ne pas mettre runtime="edge" ici si tu as eu des soucis d'env vars.
// Next Node runtime par défaut = OK.

const CACHE_S_MAXAGE = 30;               // cache CDN 30s
const CACHE_SWR = 120;                   // stale-while-revalidate 2 min
const RATE_LIMIT_WINDOW_MS = 60_000;     // 60s
const RATE_LIMIT_MAX = 60;               // 60 req/min/IP

function json(ok, payload, status = 200) {
  const res = NextResponse.json(
    { ok, ts: Date.now(), ...payload },
    { status }
  );
  // Cache CDN Vercel (simple, efficace, sans dépendances)
  res.headers.set(
    "Cache-Control",
    `s-maxage=${CACHE_S_MAXAGE}, stale-while-revalidate=${CACHE_SWR}`
  );
  return res;
}

function getIp(req) {
  // Vercel / proxies
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeAsset(a) {
  // Ne casse pas si certains champs manquent
  return {
    asset: a.asset ?? a.symbol ?? null,
    symbol: a.symbol ?? a.asset ?? null,

    price: safeNumber(a.price),

    chg_24h_pct: safeNumber(a.chg_24h_pct ?? a.change24h),
    chg_7d_pct: safeNumber(a.chg_7d_pct ?? a.change7d),
    chg_30d_pct: safeNumber(a.chg_30d_pct ?? a.change30d),

    stability_score: safeNumber(a.stability_score ?? a.score ?? a.stability),
    rating: a.rating ?? null,
    regime: a.regime ?? null,

    rupture_rate: safeNumber(a.rupture_rate),
    similarity: safeNumber(a.similarity),

    reason: a.reason ?? null,
  };
}

function buildBinanceUrl(symbol, refCode) {
  // Pair simple USDT pour MVP (tu pourras étendre plus tard)
  if (!symbol) return null;
  const pair = `${symbol.toUpperCase()}_USDT`;
  // Ref code Binance fourni par toi
  return `https://www.binance.com/en/trade/${pair}?type=spot&ref=${encodeURIComponent(
    refCode || ""
  )}`;
}

export async function GET(req) {
  try {
    // 0) Env vars KV
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (!url || !token) {
      return json(
        false,
        {
          data: [],
          error: {
            code: "KV_MISSING",
            message:
              "KV_REST_API_URL or KV_REST_API_TOKEN missing on Vercel (Production).",
          },
        },
        500
      );
    }

    const redis = new Redis({ url, token });

    // 1) Rate limit (clé par IP)
    const ip = getIp(req);
    const rlKey = `rl:scan:${ip}`;

    // incr + expire window
    const count = await redis.incr(rlKey);
    if (count === 1) await redis.pexpire(rlKey, RATE_LIMIT_WINDOW_MS);

    const remaining = Math.max(0, RATE_LIMIT_MAX - count);
    const resetAt = Date.now() + RATE_LIMIT_WINDOW_MS;

    if (count > RATE_LIMIT_MAX) {
      const res = json(
        false,
        {
          data: [],
          error: {
            code: "RATE_LIMIT",
            message: "Too many requests. Please retry in ~60 seconds.",
          },
        },
        429
      );
      res.headers.set("X-RateLimit-Remaining", String(remaining));
      res.headers.set("X-RateLimit-Reset", String(resetAt));
      return res;
    }

    // 2) Lire le payload KV
    const payload = await redis.get("assets_payload");

    if (!payload || typeof payload !== "object") {
      const res = json(
        false,
        {
          data: [],
          error: {
            code: "CACHE_MISSING",
            message:
              "Cache is empty. Call POST /api/rebuild (with token) to generate assets_payload.",
          },
        },
        503
      );
      res.headers.set("X-RateLimit-Remaining", String(remaining));
      res.headers.set("X-RateLimit-Reset", String(resetAt));
      return res;
    }

    const assets = Array.isArray(payload.assets) ? payload.assets : [];
    const limitParam = new URL(req.url).searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam || "50", 10) || 50, 1), 200);

    // 3) Normaliser + trier (stabilité d’abord)
    const normalized = assets
      .map(normalizeAsset)
      .filter((x) => x.asset); // garde uniquement les entrées valides

    normalized.sort((a, b) => (b.stability_score ?? -1) - (a.stability_score ?? -1));

    const sliced = normalized.slice(0, limit);

    // 4) Affiliation Binance (côté API, MVP)
    // Si tu préfères la garder uniquement UI, dis-le et je te fais la version "API pure".
    const BINANCE_REF = process.env.BINANCE_REF_CODE || "1216069378";
    const withAffiliate = sliced.map((a) => ({
      ...a,
      binance_url: buildBinanceUrl(a.symbol || a.asset, BINANCE_REF),
    }));

    // 5) Réponse OK
    const res = json(true, {
      data: withAffiliate,
      meta: {
        updatedAt: payload.updatedAt || null,
        count: payload.count ?? assets.length,
        limit,
      },
    });

    res.headers.set("X-RateLimit-Remaining", String(remaining));
    res.headers.set("X-RateLimit-Reset", String(resetAt));

    return res;
  } catch (err) {
    console.error("[/api/scan] INTERNAL", err);
    return json(
      false,
      {
        data: [],
        error: {
          code: "INTERNAL",
          message: err?.message || "Unknown error",
        },
      },
      500
    );
  }
}
