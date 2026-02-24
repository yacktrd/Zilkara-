import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET() {
  const testData = [
    { symbol: "BTC", name: "Bitcoin", price: 64000, chg_24h_pct: 2.3, regime: "STABLE", confidence_score: 78 },
    { symbol: "ETH", name: "Ethereum", price: 3400, chg_24h_pct: -1.2, regime: "TRANSITION", confidence_score: 62 },
  ];

  await kv.set("rfs:state:24h", testData);

  const readBack = await kv.get("rfs:state:24h");
  return NextResponse.json({ ok: true, wrote: testData.length, readBack });
}
