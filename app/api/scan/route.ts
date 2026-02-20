// 
import { NextResponse } from "next/server";

type RawAsset = {
  asset: string;
  price?: number;
  chg_24h_pct?: number;
  chg_7d_pct?: number;
  chg_30d_pct?: number;
  stability_score?: number;
  rating?: string;
  regime?: string;
};

type UiAsset = {
  symbol: string;
  name?: string;
  price?: number;
  chg_24h_pct?: number;
  chg_7d_pct?: number;
  chg_30d_pct?: number;
  stability_score?: number;
  rating?: string;
  regime?: string;
  binance_url?: string;
};

function buildBinanceUrl(symbol: string) {
  // Par défaut, on suppose une paire USDT.
  const pair = `${symbol}_USDT`;

  // ✅ Affiliation : mets ton code dans une variable Vercel (ex: BINANCE_REF)
  // Vercel > Settings > Environment Variables
  const ref = process.env.BINANCE_REF?.trim();

  // Binance utilise selon les pages : ?ref= / ?refId= / etc.
  // On reste simple : ?ref=
  const base = `https://www.binance.com/en/trade/${pair}`;
  return ref ? `${base}?ref=${encodeURIComponent(ref)}` : base;
}

export async function GET() {
  try {
    // ⚠️ Ici tu récupères déjà ton rawData depuis ton système actuel
    // Exemple : const rawData: RawAsset[] = await getScan();
    const rawData: RawAsset[] = []; // <-- remplace par ton rawData réel

    const data: UiAsset[] = rawData.map((r) => ({
      symbol: r.asset,
      name: r.asset, // simple, tu pourras enrichir plus tard
      price: r.price,
      chg_24h_pct: r.chg_24h_pct,
      chg_7d_pct: r.chg_7d_pct,
      chg_30d_pct: r.chg_30d_pct,
      stability_score: r.stability_score,
      rating: r.rating,
      regime: r.regime,
      binance_url: buildBinanceUrl(r.asset),
    }));

    return NextResponse.json({
      ok: true,
      ts: Date.now(),
      data,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message || "Scan failed" } },
      { status: 500 }
    );
  }
}
