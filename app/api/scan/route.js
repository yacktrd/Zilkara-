// app/api/scan/route.js
import { NextResponse } from "next/server";

import fs from "fs/promises";
import path from "path";

// IMPORTANT (Vercel / Next.js App Router)
// Cette route est DYNAMIQUE (lecture fichier + cache serveur).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Cache mémoire (sur instance)
let CACHE = null;
let CACHE_TS = 0;
const CACHE_DURATION_MS = 60_000; // 60s

function clampInt(v, min, max, fallback) {
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function safeUpper(v) {
  return String(v || "").trim().toUpperCase();
}

export async function GET(req) {
  try {
    // 1) Cache (si présent et pas expiré)
    const now = Date.now();
    if (CACHE && now - CACHE_TS < CACHE_DURATION_MS) {
      return NextResponse.json(CACHE, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    // 2) Paramètres (optionnels) : ?limit=20&minScore=90&mode=STABLE&ratings=A,B
    const url = new URL(req.url);

    const limit = clampInt(url.searchParams.get("limit"), 5, 50, 20);
    const minScore = clampInt(url.searchParams.get("minScore"), 0, 100, 90);

    const mode = safeUpper(url.searchParams.get("mode")); // ALL / STABLE / VOLATILE
    const ratingsParam = url.searchParams.get("ratings"); // ex "A,B"
    const allowedRatings = ratingsParam
      ? ratingsParam
          .split(",")
          .map((x) => safeUpper(x))
          .filter(Boolean)
      : ["A", "B"];

    // 3) Lecture fichier data/assets.json
    //    IMPORTANT : on lit depuis le root du projet en prod aussi.
    const filePath = path.join(process.cwd(), "data", "assets.json");

    let raw;
    try {
      raw = await fs.readFile(filePath, "utf-8");
    } catch (e) {
      return NextResponse.json(
        {
          ok: false,
          ts: Date.now(),
          error: "ASSETS_FILE_NOT_FOUND",
          details: `Impossible de lire ${filePath}`,
        },
        { status: 500 }
      );
    }

    let json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      return NextResponse.json(
        {
          ok: false,
          ts: Date.now(),
          error: "ASSETS_JSON_INVALID",
          details: "assets.json n'est pas un JSON valide",
        },
        { status: 500 }
      );
    }

    // Supporte 2 formats :
    // - { data: [...] }
    // - [...]
    const dataArray = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];

    // 4) Normalisation + filtres
    const cleaned = dataArray
      .map((a) => ({
        asset: a?.asset ?? a?.symbol ?? "",
        symbol: a?.symbol ?? a?.asset ?? "",
        price: Number(a?.price ?? 0),
        chg_24h_pct: Number(a?.chg_24h_pct ?? 0),
        chg_7d_pct: Number(a?.chg_7d_pct ?? 0),
        chg_30d_pct: Number(a?.chg_30d_pct ?? 0),
        stability_score: Number(a?.stability_score ?? a?.score ?? 0),
        rating: safeUpper(a?.rating ?? ""),
        regime: safeUpper(a?.regime ?? "UNKNOWN"),
        binance_url: a?.binance_url ?? null,
      }))
      .filter((a) => a.symbol);

    const filtered = cleaned
      .filter((a) => a.stability_score >= minScore)
      .filter((a) => (allowedRatings.length ? allowedRatings.includes(a.rating) : true))
      .filter((a) => {
        if (!mode || mode === "ALL") return true;
        return a.regime === mode;
      })
      .sort((x, y) => y.stability_score - x.stability_score)
      .slice(0, limit);

    // 5) Réponse
    const response = {
      ok: true,
      ts: Date.now(),
      count: filtered.length,
      params: {
        limit,
        minScore,
        mode: mode || "ALL",
        ratings: allowedRatings,
      },
      data: filtered,
    };

    // 6) Mise en cache mémoire
    CACHE = response;
    CACHE_TS = Date.now();

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        ts: Date.now(),
        error: "SCAN_INTERNAL_ERROR",
        details: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}
