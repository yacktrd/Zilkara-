// app/api/scan/route.ts
import { NextResponse } from 'next/server';

/**
 * ZILKARA — /api/scan (V1 robuste + prêt pour V2)
 * Objectifs :
 * - Réponse stable, typée, lisible côté UI
 * - Fallback garanti (6 actifs) si pipeline vide / en panne
 * - Paramètres: market, quote, sort, order, limit
 * - Prépare les prochains besoins: CoinGecko / KV / score engine / deltas
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Market = 'crypto' | string;
type Quote = 'USD' | 'USDT' | 'EUR' | string;

type Regime = 'STABLE' | 'TRANSITION' | 'VOLATILE' | string;
type ScoreTrend = 'up' | 'down' | null;

export type ScanAsset = {
  id: string;
  symbol: string;
  name: string;

  price: number | null;
  chg_24h_pct: number | null;

  confidence_score: number | null;
  regime: Regime | null;

  // liens (UI peut rendre tout le bloc cliquable)
  binance_url: string | null;
  affiliate_url: string | null;

  // optionnels (V2+)
  market_cap: number | null;
  volume_24h: number | null;

  // UI helpers (optionnels)
  score_delta: number | null;
  score_trend: ScoreTrend;
};

export type ScanResponse = {
  ok: boolean;
  ts: string;

  source: 'scan' | 'fallback';
  market: Market;
  quote: Quote;

  count: number;
  data: ScanAsset[];

  // Contexte global (header)
  market_regime: Regime;
  confidence_global: number | null;
  stable_ratio: number;
  transition_ratio: number;
  volatile_ratio: number;

  message: string | null;
  error?: string;
};

const NOW_ISO = () => new Date().toISOString();

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const safeNum = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const safeStr = (v: unknown): string | null =>
  typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;

const sanitizeSymbol = (s: string) =>
  s
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 20);

const normalizeQuote = (q: string): Quote => {
  const up = q.toUpperCase();
  if (up === 'USD' || up === 'USDT' || up === 'EUR') return up;
  return up;
};

const normalizeMarket = (m: string): Market => (m || 'crypto').toLowerCase();

const normalizeSort = (s: string): 'score' | 'price' => {
  const v = (s || 'score').toLowerCase();
  return v === 'price' ? 'price' : 'score';
};

const normalizeOrder = (o: string): 'asc' | 'desc' => {
  const v = (o || 'desc').toLowerCase();
  return v === 'asc' ? 'asc' : 'desc';
};

const parseLimit = (v: string | null): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 6;
  return clamp(Math.trunc(n), 1, 200);
};

/** Binance */
function toBinancePair(base: string, quote: Quote) {
  // Pour V1: si quote = USD, on map en USDT (Binance spot)
  const q = quote === 'USD' ? 'USDT' : quote;
  return `${sanitizeSymbol(base)}${String(q).toUpperCase()}`;
}

function makeBinanceUrls(symbol: string, quote: Quote) {
  const pair = toBinancePair(symbol, quote);

  // URL “trade” (spot)
  const binance_url = `https://www.binance.com/en/trade/${pair}`;

  // Affiliate ref (env)
  const ref = process.env.BINANCE_REF?.trim();
  const affiliate_url = ref ? `https://www.binance.com/en/trade/${pair}?ref=${encodeURIComponent(ref)}` : binance_url;

  return { binance_url, affiliate_url };
}

/**
 * Fallback: univers minimal (6 blocs visibles)
 * IMPORTANT: sert à valider l’UI et éviter "aucun résultat" en V1.
 */
function fallbackUniverse(quote: Quote): ScanAsset[] {
  const base = [
    { symbol: 'BTC', name: 'Bitcoin', price: 64456, chg: +0.03, score: 98, regime: 'STABLE' as Regime, delta: -1, trend: 'down' as const },
    { symbol: 'USDT', name: 'Tether', price: 1.0, chg: +0.02, score: 95, regime: 'STABLE' as Regime, delta: -1, trend: 'down' as const },
    { symbol: 'ETH', name: 'Ethereum', price: 1853, chg: +0.13, score: 92, regime: 'STABLE' as Regime, delta: +1, trend: 'up' as const },
    { symbol: 'XRP', name: 'XRP', price: 1.36, chg: -0.34, score: 86, regime: 'TRANSITION' as Regime, delta: -1, trend: 'down' as const },
    { symbol: 'BNB', name: 'BNB', price: 596.2, chg: +0.21, score: 89, regime: 'STABLE' as Regime, delta: -1, trend: 'down' as const },
    { symbol: 'SOL', name: 'Solana', price: 149.07, chg: +3.42, score: 88, regime: 'VOLATILE' as Regime, delta: +1, trend: 'up' as const },
  ];

  return base.map((x) => {
    const { binance_url, affiliate_url } = makeBinanceUrls(x.symbol, quote);
    return {
      id: x.symbol,
      symbol: x.symbol,
      name: x.name,

      price: x.price,
      chg_24h_pct: x.chg,

      confidence_score: x.score,
      regime: x.regime,

      binance_url,
      affiliate_url,

      market_cap: null,
      volume_24h: null,

      score_delta: x.delta,
      score_trend: x.trend,
    };
  });
}

/**
 * V2/V3: brancher ici le vrai pipeline
 * - CoinGecko -> normalize()
 * - KV snapshot -> delta/trend
 * - Confidence Engine -> confidence_score + regime
 *
 * Pour V1: on renvoie [] => fallback automatique.
 */

async function getRawUniverse(market: Market, quote: Quote): Promise<any[]> {
  try {
    if (market !== 'crypto') return [];

    const vs = quote === 'USD' ? 'usd' : quote.toLowerCase();

    const url = new URL('https://api.coingecko.com/api/v3/coins/markets');
    url.searchParams.set('vs_currency', vs);
    url.searchParams.set('order', 'market_cap_desc');
    url.searchParams.set('per_page', '50');
    url.searchParams.set('page', '1');
    url.searchParams.set('price_change_percentage', '24h');

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 60 }, // cache 60s (propre pour Vercel)
    });

    if (!res.ok) return [];

    const json = await res.json();

    if (!Array.isArray(json)) return [];

    return json.map((c: any) => {
      const price = typeof c.current_price === 'number' ? c.current_price : null;
      const chg = typeof c.price_change_percentage_24h === 'number'
        ? c.price_change_percentage_24h
        : null;

      // Confidence V1 simple et stable
      let score = 50;

      if (chg !== null) {
        score += clamp(chg * 3, -20, 20);
      }

      if (typeof c.market_cap === 'number') {
        score += clamp(Math.log10(c.market_cap) - 6, 0, 20);
      }

      score = clamp(Math.round(score), 0, 100);

      let regime: Regime = 'TRANSITION';
      if (chg !== null) {
        if (Math.abs(chg) < 1) regime = 'STABLE';
        else if (Math.abs(chg) > 4) regime = 'VOLATILE';
      }

      return {
        id: c.id,
        symbol: c.symbol?.toUpperCase(),
        name: c.name,
        price,
        chg_24h_pct: chg,
        confidence_score: score,
        regime,
        market_cap: c.market_cap ?? null,
        volume_24h: c.total_volume ?? null,
      };
    });
  } catch {
    return [];
  }
}

/** Contexte global */
function computeContext(data: ScanAsset[]) {
  const total = data.length || 1;

  let stable = 0;
  let transition = 0;
  let volatile = 0;

  for (const a of data) {
    const r = (a.regime || '').toUpperCase();
    if (r === 'STABLE') stable++;
    else if (r === 'TRANSITION') transition++;
    else if (r === 'VOLATILE') volatile++;
  }

  const stable_ratio = stable / total;
  const transition_ratio = transition / total;
  const volatile_ratio = volatile / total;

  // Règle simple et stable (V1)
  let market_regime: Regime = 'TRANSITION';
  const max = Math.max(stable_ratio, transition_ratio, volatile_ratio);
  if (max === stable_ratio) market_regime = 'STABLE';
  else if (max === volatile_ratio) market_regime = 'VOLATILE';

  // Global confidence: moyenne des confidence_score valides (V1)
  const scores = data.map((d) => d.confidence_score).filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  const confidence_global =
    scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;

  return { market_regime, confidence_global, stable_ratio, transition_ratio, volatile_ratio };
}

/** Tri */
function sortData(data: ScanAsset[], sort: 'score' | 'price', order: 'asc' | 'desc') {
  const dir = order === 'asc' ? 1 : -1;

  data.sort((a, b) => {
    const av = sort === 'price' ? a.price : a.confidence_score;
    const bv = sort === 'price' ? b.price : b.confidence_score;

    const ax = typeof av === 'number' ? av : -Infinity;
    const bx = typeof bv === 'number' ? bv : -Infinity;

    if (ax === bx) {
      // tie-breaker stable: score desc puis symbol
      const as = a.confidence_score ?? -Infinity;
      const bs = b.confidence_score ?? -Infinity;
      if (as !== bs) return (bs - as) * dir;
      return a.symbol.localeCompare(b.symbol);
    }
    return (ax - bx) * dir;
  });
}

export async function GET(req: Request) {
  const ts = NOW_ISO();

  try {
    const url = new URL(req.url);

    const market = normalizeMarket(url.searchParams.get('market') || 'crypto');
    const quote = normalizeQuote(url.searchParams.get('quote') || 'USD');

    const sort = normalizeSort(url.searchParams.get('sort') || 'score');
    const order = normalizeOrder(url.searchParams.get('order') || 'desc');
    const limit = parseLimit(url.searchParams.get('limit'));

    const q = safeStr(url.searchParams.get('q'))?.toLowerCase() ?? null;

    const raw = await getRawUniverse(market, quote);
    const normalized = raw.map((x) => normalize(x, quote)).filter((x): x is ScanAsset => x !== null);

    // fallback garanti
    const source: 'scan' | 'fallback' = normalized.length > 0 ? 'scan' : 'fallback';
    let data = normalized.length > 0 ? normalized : fallbackUniverse(quote);

    // Recherche (minimaliste, rapide)
    if (q) {
      data = data.filter((a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
    }

    // Tri (par défaut: score desc, conforme à ta règle)
    sortData(data, sort, order);

    // Limite (UI veut 6 visibles fixes)
    data = data.slice(0, limit);

    const ctx = computeContext(data);

    const res: ScanResponse = {
      ok: true,
      ts,

      source,
      market,
      quote,

      count: data.length,
      data,

      market_regime: ctx.market_regime,
      confidence_global: ctx.confidence_global,
      stable_ratio: ctx.stable_ratio,
      transition_ratio: ctx.transition_ratio,
      volatile_ratio: ctx.volatile_ratio,

      message: null,
    };

    // Headers utiles (debug + anti-cache si besoin)
    return NextResponse.json(res, {
      status: 200,
      headers: {
        'cache-control': 'no-store',
      },
    });
  } catch (e: any) {
    const res: ScanResponse = {
      ok: false,
      ts,

      source: 'fallback',
      market: 'crypto',
      quote: 'USD',

      count: 0,
      data: [],

      market_regime: 'TRANSITION',
      confidence_global: null,
      stable_ratio: 0,
      transition_ratio: 0,
      volatile_ratio: 0,

      message: 'scan_failed',
      error: e?.message ?? 'Unknown error',
    };

    return NextResponse.json(res, { status: 500, headers: { 'cache-control': 'no-store' } });
  }
}
