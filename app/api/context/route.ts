// app/api/context/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUOTE = "usd";
const TOP_LIMIT = 200;
const CONTEXT_TTL = 600; // 10 min

type Regime = "STABLE" | "TRANSITION" | "VOLATILE";

type ContextSnapshot = {
  ts: number;
  market_regime: Regime;
  market_context_index: number;
  stable_ratio: number;
  transition_ratio: number;
  volatile_ratio: number;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function regimeFromAbs(abs: number): Regime {
  if (abs <= 5) return "STABLE";
  if (abs <= 12) return "TRANSITION";
  return "VOLATILE";
}

async function fetchMarket(): Promise<any[]> {
  const url =
    `https://api.coingecko.com/api/v3/coins/markets` +
    `?vs_currency=${QUOTE}` +
    `&order=volume_desc` +
    `&per_page=${TOP_LIMIT}` +
    `&page=1&sparkline=false&price_change_percentage=24h`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("CoinGecko error");

  return res.json();
}

export async function GET() {
  try {
    const raw = await fetchMarket();

    let stable = 0;
    let transition = 0;
    let volatile = 0;

    raw.forEach((c) => {
      const chg = Math.abs(Number(c.price_change_percentage_24h) || 0);
      const r = regimeFromAbs(chg);
      if (r === "STABLE") stable++;
      else if (r === "TRANSITION") transition++;
      else volatile++;
    });

    const total = raw.length || 1;

    const stable_ratio = stable / total;
    const transition_ratio = transition / total;
    const volatile_ratio = volatile / total;

    let market_regime: Regime = "STABLE";
    if (volatile_ratio > stable_ratio && volatile_ratio > transition_ratio)
      market_regime = "VOLATILE";
    else if (transition_ratio > stable_ratio)
      market_regime = "TRANSITION";

    const market_context_index = clamp(
      100 - volatile_ratio * 80,
      0,
      100
    );

    const snapshot: ContextSnapshot = {
      ts: Date.now(),
      market_regime,
      market_context_index: Math.round(market_context_index),
      stable_ratio,
      transition_ratio,
      volatile_ratio,
    };

    const { kv } = await import("@vercel/kv");
    await kv.set("market_context", snapshot, { ex: CONTEXT_TTL });

    return NextResponse.json(snapshot);
  } catch (err) {
    return NextResponse.json(
      { error: "CONTEXT_FAILED" },
      { status: 500 }
    );
  }
}
