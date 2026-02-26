// app/api/scan/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Regime = 'STABLE' | 'TRANSITION' | 'VOLATILE' | string;

type ScanAsset = {
  id: string;
  symbol: string;
  name: string;

  price: number | null;
  chg_24h_pct: number | null;

  confidence_score: number | null;
  regime: Regime | null;

  binance_url: string | null;
  affiliate_url: string | null;

  score_delta: number | null;
  score_trend: 'up' | 'down' | null;
};

type ScanResponse = {
  ok: boolean;
  ts: string;
  source: 'scan' | 'fallback';
  market: string;
  quote: string;
  count: number;
  data: ScanAsset[];
  error?: string;
};

const NOW = () => new Date().toISOString();

const safeNum = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const safeStr = (v: unknown): string =>
  typeof v === 'string' ? v.trim() : '';

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

function toBinancePair(symbol: string, quote: string) {
  return `${symbol.toUpperCase()}${quote.toUpperCase()}`;
}

function makeBinanceUrls(symbol: string, quote: string) {
  const pair = toBinancePair(symbol, quote === 'USD' ? 'USDT' : quote);
  return {
    binance_url: `https://www.binance.com/en/trade/${pair}`,
    affiliate_url: `https://www.binance.com/en/trade/${pair}?ref=YOUR_REF`,
  };
}

/**
 * 🔒 Fallback stable pour éviter UI vide
 */
function fallbackUniverse(quote: string): ScanAsset[] {
  const base = [
    { symbol: 'BTC', name: 'Bitcoin', price: 64456, chg: 0.03, score: 98 },
    { symbol: 'ETH', name: 'Ethereum', price: 1853, chg: 0.13, score: 92 },
    { symbol: 'SOL', name: 'Solana', price: 149.07, chg: 3.42, score: 88 },
  ];

  return base.map((x) => {
    const { binance_url, affiliate_url } = makeBinanceUrls(
      x.symbol,
      quote
    );

    const delta = x.score > 90 ? 1 : -1;

    return {
      id: x.symbol,
      symbol: x.symbol,
      name: x.name,

      price: x.price,
      chg_24h_pct: x.chg,

      confidence_score: clamp(x.score, 0, 100),

      regime:
        x.score >= 85
          ? 'STABLE'
          : x.score >= 60
          ? 'TRANSITION'
          : 'VOLATILE',

      binance_url,
      affiliate_url,

      score_delta: delta,
      score_trend: delta > 0 ? 'up' : 'down',
    };
  });
}

/**
 * ⚙️ Pipeline futur (CoinGecko / KV)
 * Pour l’instant retourne vide -> fallback
 */
async function getRawUniverse(): Promise<any[]> {
  return [];
}

function normalizeAsset(raw: any, quote: string): ScanAsset | null {
  const symbol = safeStr(raw?.symbol || raw?.id);
  if (!symbol) return null;

  const name = safeStr(raw?.name || symbol);

  const price = safeNum(raw?.price);
  const chg = safeNum(raw?.chg_24h_pct);
  const score = clamp(safeNum(raw?.confidence_score) ?? 0, 0, 100);

  const delta = safeNum(raw?.score_delta) ?? 0;

  const { binance_url, affiliate_url } =
    raw?.binance_url || raw?.affiliate_url
      ? {
          binance_url: raw?.binance_url ?? null,
          affiliate_url: raw?.affiliate_url ?? null,
        }
      : makeBinanceUrls(symbol, quote);

  return {
    id: symbol,
    symbol,
    name,

    price,
    chg_24h_pct: chg,

    confidence_score: score,

    regime:
      score >= 85
        ? 'STABLE'
        : score >= 60
        ? 'TRANSITION'
        : 'VOLATILE',

    binance_url,
    affiliate_url,

    score_delta: delta,
    score_trend: delta > 0 ? 'up' : delta < 0 ? 'down' : null,
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const quote = (url.searchParams.get('quote') || 'USD').toUpperCase();
    const market = (url.searchParams.get('market') || 'crypto').toLowerCase();

    const raw = await getRawUniverse();

    const normalized =
      raw.length > 0
        ? raw
            .map((x) => normalizeAsset(x, quote))
            .filter(Boolean) as ScanAsset[]
        : [];

    const data =
      normalized.length > 0
        ? normalized
        : fallbackUniverse(quote === 'USD' ? 'USDT' : quote);

    // tri score desc par défaut
    data.sort(
      (a, b) =>
        (b.confidence_score ?? 0) - (a.confidence_score ?? 0)
    );

    const res: ScanResponse = {
      ok: true,
      ts: NOW(),
      source: normalized.length > 0 ? 'scan' : 'fallback',
      market,
      quote,
      count: data.length,
      data,
    };

    return NextResponse.json(res, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        ts: NOW(),
        source: 'fallback',
        market: 'crypto',
        quote: 'USD',
        count: 0,
        data: [],
        error: e?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}
