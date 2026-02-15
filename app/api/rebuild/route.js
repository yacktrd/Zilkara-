import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function POST() {
  try {

    // 1. Exemple assets (remplacer plus tard par ton vrai scanner)
    const assets = [
      {
        symbol: "BTC",
        name: "Bitcoin",
        price: 58539,
        chg_24h_pct: 4.77,
        chg_7d_pct: 8.12,
        chg_30d_pct: 12.45,
        stability_score: 92,
        rating: "A",
        regime: "STABLE",
        similarity: 84,
        rupture_rate: 3,
        reason: "Faible fréquence de ruptures, régime stable."
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        price: 1743,
        chg_24h_pct: 6.67,
        chg_7d_pct: 9.21,
        chg_30d_pct: 14.02,
        stability_score: 88,
        rating: "A",
        regime: "STABLE",
        similarity: 79,
        rupture_rate: 5,
        reason: "Structure stable avec volatilité contrôlée."
      }
    ];

    // 2. Construire payload
    const payload = {
      assets,
      count: assets.length,
      updatedAt: Date.now()
    };

    // 3. Écriture Redis (CRITIQUE)
    await redis.set("assets_payload", payload);

    return NextResponse.json({
      ok: true,
      route: "rebuild",
      count: assets.length,
      ts: Date.now()
    });

  } catch (err) {

    console.error("REBUILD ERROR:", err);

    return NextResponse.json({
      ok: false,
      error: "rebuild failed",
      ts: Date.now()
    }, { status: 500 });

  }
}
