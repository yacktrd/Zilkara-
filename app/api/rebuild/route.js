import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function GET(req) {
  return handle(req);
}

export async function POST(req) {
  return handle(req);
}

async function handle(req) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = process.env.KV_REST_API_TOKEN;

    if (!auth || auth !== `Bearer ${token}`) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid token"
          }
        },
        { status: 401 }
      );
    }

    // Exemple payload minimal (remplace par ton vrai scanner)
    const assets = [
      {
        asset: "BTC",
        symbol: "BTC",
        price: 58539,
        chg_24h_pct: 4.77,
        chg_7d_pct: 8.12,
        chg_30d_pct: 12.45,
        stability_score: 92,
        rating: "A",
        regime: "STABLE",
        rupture_rate: 3,
        similarity: 84,
        reason: "Structure stable"
      },
      {
        asset: "ETH",
        symbol: "ETH",
        price: 1743,
        chg_24h_pct: 6.67,
        chg_7d_pct: 9.21,
        chg_30d_pct: 14.02,
        stability_score: 88,
        rating: "A",
        regime: "STABLE",
        rupture_rate: 5,
        similarity: 79,
        reason: "Volatilité contrôlée"
      }
    ];

    const payload = {
      assets,
      count: assets.length,
      updatedAt: Date.now()
    };

    await redis.set("assets_payload", payload);

    return NextResponse.json({
      ok: true,
      route: "rebuild",
      count: assets.length,
      ts: Date.now()
    });

  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL",
          message: err.message
        }
      },
      { status: 500 }
    );
  }
}
