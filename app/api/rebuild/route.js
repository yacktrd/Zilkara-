import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function POST(req) {
  try {
    // Exemple payload (remplace plus tard par ton vrai scanner)
    const payload = {
      updatedAt: Date.now(),
      count: 2,
      assets: [
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
      ]
    };

    await redis.set("assets_payload", payload);

    return NextResponse.json({
      ok: true,
      route: "rebuild",
      ts: Date.now(),
      written: true
    });

  } catch (err) {

    return NextResponse.json({
      ok: false,
      error: {
        code: "REBUILD_FAILED",
        message: err.message
      }
    }, { status: 500 });

  }
}
