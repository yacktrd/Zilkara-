import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function POST() {
  try {
    const items = [
      {
        symbol: "BTCUSDT",
        name: "Bitcoin",
        price: 64000,
        chg_24h_pct: 2.1,
        confidence_score: 87,
        regime: "STABLE",
      },
      {
        symbol: "SOLUSDT",
        name: "Solana",
        price: 80.5,
        chg_24h_pct: -1.4,
        confidence_score: 72,
        regime: "TRANSITION",
      },
    ];

    await kv.set("rfs:state:24h", items);

    return NextResponse.json({
      ok: true,
      written: items.length,
      key: "rfs:state:24h",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "unknown" },
      { status: 500 }
    );
  }
}
