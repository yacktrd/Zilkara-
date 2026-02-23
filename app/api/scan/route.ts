// app/api/scan/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Regime = "STABLE" | "TRANSITION" | "VOLATILE";

const QUOTE = "usd";
const DEFAULT_LIMIT = 50;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function regimeFromAbs(abs: number): Regime {
  if (abs <= 5) return "STABLE";
  if (abs <= 12) return "TRANSITION";
  return "VOLATILE";
}

function stabilityScore(chg: number) {
  return clamp(100 - Math.abs(chg) * 4.5, 0, 100);
}

function liquidityScore(vol: number, cap: number) {
  const liqRaw =
    Math.log10(1 + vol) + 0.6 * Math.log10(1 + cap);
  return clamp((liqRaw - 6.2) * 14, 0, 100);
}

function shockPenalty(chg: number) {
  const abs = Math.abs(chg);
  if (abs > 15) return -15;
  if (abs > 10) return -8;
  return 0;
}

function stablecoinPenalty(symbol: string, chg: number, price: number) {
  if (
    ["USDT", "USDC", "DAI"].includes(symbol) ||
    (Math.abs(chg) < 0.2 && price > 0.8 && price < 1.2)
  ) {
    return -10;
  }
  return 0;
}

async function fetchMarket(limit: number) {
  const url =
    `https://api.coingecko.com/api/v3/coins/markets` +
    `?vs_currency=${QUOTE}` +
    `&order=volume_desc` +
    `&per_page=${limit}` +
    `&page=1&sparkline=false&price_change_percentage=24h`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("CoinGecko error");
  return res.json();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = clamp(
      Number(searchParams.get("limit")) || DEFAULT_LIMIT,
      1,
      250
    );

    const raw = await fetchMarket(limit);

    const { kv } = await import("@vercel/kv");
    const context = await kv.get<any>("market_context");

    const market_regime: Regime =
      context?.market_regime || "STABLE";

    const mapped = raw
      .map((coin: any) => {
        const symbol = String(coin.symbol || "").toUpperCase();
        const name = String(coin.name || "");
        const price = Number(coin.current_price || 0);
        const chg = Number(coin.price_change_percentage_24h || 0);
        const vol = Number(coin.total_volume || 0);
        const cap = Number(coin.market_cap || 0);

        if (!symbol || !name || price <= 0) return null;

        const regime = regimeFromAbs(Math.abs(chg));
        const S = stabilityScore(chg);
        const L = liquidityScore(vol, cap);
        const P = shockPenalty(chg);
        const SC = stablecoinPenalty(symbol, chg, price);

        const C =
          regime === market_regime ? 8 : -6;

        const confidence = clamp(
          S * 0.45 + L * 0.35 + C + P + SC,
          0,
          100
        );

        return {
          symbol,
          name,
          price,
          chg_24h_pct: Math.round(chg * 100) / 100,
          regime,
          confidence_score: Math.round(confidence),
        };
      })
      .filter(Boolean)
      .sort(
        (a: any, b: any) =>
          b.confidence_score - a.confidence_score
      );

    return NextResponse.json({
      ok: true,
      ts: Date.now(),
      market_regime,
      count: mapped.length,
      data: mapped,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "SCAN_FAILED" },
      { status: 500 }
    );
  }
}
