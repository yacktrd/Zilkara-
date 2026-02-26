// app/api/scan/route.ts
import { NextResponse } from 'next/server';

/**
 * ZILKARA /api/scan
 * Objectifs (prod-ready):
 * - Réponse stable (schéma JSON constant)
 * - Typage strict (pas de undefined non prévu)
 * - Fallback garanti (même si provider down)
 * - Cache serveur + "last good snapshot"
 * - Prépare les besoins futurs (tri, limite, filtre, score_delta/trend)
 */

/* ----------------------------- Types ----------------------------- */

type Regime = 'STABLE' | 'TRANSITION' | 'VOLATILE';

type Market = 'crypto';
type Quote = 'USD' | 'USDT' | 'EUR';

type SortKey = 'score' | 'price';
type SortDir = 'asc' | 'desc';

type Trend = 'up' | 'down' | null;

export type ScanAsset = {
  id: string;
  symbol: string;
  name: string;

  price: number | null;
  chg_24h_pct: number | null;

  confidence_score: number | null;
  regime: Regime;

  binance_url: string | null;
  affiliate_url: string | null;

  market_cap: number | null;
  volume_24h: number | null;

  // UI helpers
  score_delta: number | null;
  score_trend: Trend;
};

export type ScanResponse = {
  ok: boolean;
  ts: string;

  source: 'provider' | 'cache' | 'fallback';
  market: Market;
  quote: Quote;

  count: number;
  data: ScanAsset[];

  message: string | null;
  error?: string;
};

/* ----------------------------- Utils ----------------------------- */

const NOW_ISO = () => new Date().toISOString();

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const asNum = (v: unknown): number | null => (isFiniteNum(v) ? v : null);
const asStr = (v: unknown): string | null =>
  typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;

function parseMarket(v: string | null): Market {
  // extensible plus tard (stocks, etc.)
  return 'crypto';
}

function parseQuote(v: string | null): Quote {
  const q = (v ?? 'USD').toUpperCase();
  if (q === 'EUR') return 'EUR';
  if (q === 'USDT') return 'USDT';
  return 'USD';
}

function parseSortKey(v: string | null): SortKey {
  const k = (v ?? 'score').toLowerCase();
  if (k === 'price') return 'price';
  return 'score';
}

function parseSortDir(v: string | null): SortDir {
  const d = (v ?? 'desc').toLowerCase();
  if (d === 'asc') return 'asc';
  return 'desc';
}

function parseLimit(v: string | null): number {
  const n = Number(v ?? 6);
  if (!Number.isFinite(n)) return 6;
  return clamp(Math.trunc(n), 1, 50);
}

function parseRegimeFilter(v: string | null): Regime | 'ALL' {
  const r = (v ?? 'ALL').toUpperCase();
  if (r === 'STABLE') return 'STABLE';
  if (r === 'TRANSITION') return 'TRANSITION';
  if (r === 'VOLATILE') return 'VOLATILE';
  return 'ALL';
}

/* ----------------------------- Links ----------------------------- */

// Binance (stable): utiliser USDT en quote par défaut si USD demandé.
function normalizeQuoteForBinance(quote: Quote): 'USDT' | 'EUR' {
  if (quote === 'EUR') return 'EUR';
  return 'USDT';
}

function toBinanceSymbol(baseSymbol: string, quote: Quote) {
  const q = normalizeQuoteForBinance(quote);
  return `${baseSymbol.toUpperCase()}${q}`;
}

function makeBinanceUrls(symbol: string, quote: Quote) {
  const pair = toBinanceSymbol(symbol, quote);

  // Spot trade page
  const binance_url = `https://www.binance.com/en/trade/${pair}`;

  // Affiliate (placeholder). Remplace YOUR_REF par ton code.
  // (Tu peux aussi le mettre en env plus tard.)
  const affiliate_url = `https://www.binance.com/en/trade/${pair}?ref=YOUR_REF`;

  return { binance_url, affiliate_url };
}

/* ----------------------------- Confidence Engine (V1 stable) ----------------------------- */
/**
 * V1 simple, robuste, déterministe.
 * - Base 50
 * - Bonus market cap (log scale)
 * - Pénalité volatilité forte (|chg| élevé) car "risque"
 * - Bonus léger si volume élevé (liquidité)
 *
 * (Tu pourras swapper ce bloc par ton moteur plus tard sans casser l’API)
 */
function computeRegime(chg24: number | null): Regime {
  if (chg24 === null) return 'TRANSITION';
  const a = Math.abs(chg24);
  if (a < 1) return 'STABLE';
  if (a > 4) return 'VOLATILE';
  return 'TRANSITION';
}

function computeConfidenceScore(params: {
  chg24: number | null;
  marketCap: number | null;
  volume24: number | null;
}): number | null {
  const { chg24, marketCap, volume24 } = params;

  // Si rien, score neutre mais exploitable
  let score = 50;

  // Market cap: log10(cap) ~ 6..12+ => bonus 0..20
  if (marketCap !== null && marketCap > 0) {
    const bonusCap = clamp(Math.log10(marketCap) - 6, 0, 20);
    score += bonusCap;
  }

  // Volume: bonus 0..10
  if (volume24 !== null && volume24 > 0) {
    const bonusVol = clamp(Math.log10(volume24) - 5, 0, 10);
    score += bonusVol;
  }

  // Volatilité (risque): pénalité 0..25
  if (chg24 !== null) {
    const penalty = clamp(Math.abs(chg24) * 4, 0, 25);
    score -= penalty;
  }

  return clamp(Math.round(score), 0, 100);
}

/* ----------------------------- Provider (CoinGecko) ----------------------------- */

type ProviderCoinGecko = {
  id?: unknown;
  symbol?: unknown;
  name?: unknown;
  current_price?: unknown;
  price_change_percentage_24h?: unknown;
  market_cap?: unknown;
  total_volume?: unknown;
};

function coinGeckoUrl(vs: Quote) {
  // CoinGecko vs_currency: "usd", "eur"
  const vc = vs === 'EUR' ? 'eur' : 'usd';

  const url = new URL('https://api.coingecko.com/api/v3/coins/markets');
  url.searchParams.set('vs_currency', vc);
  url.searchParams.set('order', 'market_cap_desc');
  url.searchParams.set('per_page', '50');
  url.searchParams.set('page', '1');
  url.searchParams.set('price_change_percentage', '24h');
  return url.toString();
}

async function fetchCoinGecko(quote: Quote): Promise<ScanAsset[]> {
  const url = coinGeckoUrl(quote);

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

  const json = await res.json();
  if (!Array.isArray(json)) throw new Error('CoinGecko invalid payload');

  const assets: ScanAsset[] = json
    .map((raw: ProviderCoinGecko) => {
      const id = asStr(raw?.id);
      const symbol = asStr(raw?.symbol)?.toUpperCase();
      const name = asStr(raw?.name);

      if (!id || !symbol || !name) return null;

      const price = asNum(raw?.current_price);
      const chg24 = asNum(raw?.price_change_percentage_24h);
      const marketCap = asNum(raw?.market_cap);
      const volume24 = asNum(raw?.total_volume);

      const regime = computeRegime(chg24);
      const confidence = computeConfidenceScore({ chg24, marketCap, volume24 });

      const { binance_url, affiliate_url } = makeBinanceUrls(symbol, quote);

      const a: ScanAsset = {
        id,
        symbol,
        name,
        price,
        chg_24h_pct: chg24,

        confidence_score: confidence,
        regime,

        binance_url,
        affiliate_url,

        market_cap: marketCap,
        volume_24h: volume24,

        score_delta: null,
        score_trend: null,
      };

      return a;
    })
    .filter((x): x is ScanAsset => x !== null);

  return assets;
}

/* ----------------------------- Cache + Snapshot ----------------------------- */

type CacheEntry = {
  ts: number;
  data: ScanAsset[];
};

// 60s cache pour éviter rate limit
const CACHE_TTL_MS = 60_000;

// Cache mémoire (runtime server). Suffisant pour V1.
let CACHE: CacheEntry | null = null;

// Dernier snapshot "bon" (si provider down)
let LAST_GOOD: CacheEntry | null = null;

function withDeltaAndTrend(current: ScanAsset[], previous: ScanAsset[] | null): ScanAsset[] {
  if (!previous || previous.length === 0) return current;

  const prevMap = new Map<string, ScanAsset>();
  for (const p of previous) prevMap.set(p.id, p);

  return current.map((c) => {
    const p = prevMap.get(c.id);
    const cScore = c.confidence_score;
    const pScore = p?.confidence_score ?? null;

    if (cScore === null || pScore === null) {
      return { ...c, score_delta: null, score_trend: null };
    }

    const delta = cScore - pScore;
    const trend: Trend = delta > 0 ? 'up' : delta < 0 ? 'down' : null;

    return { ...c, score_delta: delta, score_trend: trend };
  });
}

/* ----------------------------- Fallback (UI stable 6 blocs) ----------------------------- */

function fallbackUniverse(quote: Quote): ScanAsset[] {
  const base = [
    { symbol: 'BTC', name: 'Bitcoin', price: 64456, chg: +0.03, score: 98, regime: 'STABLE' as Regime },
    { symbol: 'USDT', name: 'Tether', price: 1.0, chg: +0.02, score: 95, regime: 'STABLE' as Regime },
    { symbol: 'ETH', name: 'Ethereum', price: 1853, chg: +0.13, score: 92, regime: 'STABLE' as Regime },
    { symbol: 'XRP', name: 'XRP', price: 1.36, chg: -0.34, score: 86, regime: 'TRANSITION' as Regime },
    { symbol: 'BNB', name: 'BNB', price: 596.2, chg: +0.21, score: 89, regime: 'STABLE' as Regime },
    { symbol: 'SOL', name: 'Solana', price: 149.07, chg: +3.42, score: 88, regime: 'VOLATILE' as Regime },
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
      score_delta: null,
      score_trend: null,
    };
  });
}

/* ----------------------------- Sorting / Filtering ----------------------------- */

function sortAssets(data: ScanAsset[], key: SortKey, dir: SortDir): ScanAsset[] {
  const mul = dir === 'asc' ? 1 : -1;

  const get = (a: ScanAsset) => {
    if (key === 'price') return a.price ?? -Infinity;
    return a.confidence_score ?? -Infinity;
  };

  // tri stable: score desc par défaut
  return [...data].sort((a, b) => {
    const av = get(a);
    const bv = get(b);
    if (av === bv) return a.symbol.localeCompare(b.symbol);
    return (av - bv) * mul;
  });
}

function filterAssets(data: ScanAsset[], regimeFilter: Regime | 'ALL'): ScanAsset[] {
  if (regimeFilter === 'ALL') return data;
  return data.filter((a) => a.regime === regimeFilter);
}

/* ----------------------------- Handler ----------------------------- */

export async function GET(req: Request) {
  const ts = NOW_ISO();

  try {
    const url = new URL(req.url);

    const market = parseMarket(url.searchParams.get('market'));
    const quote = parseQuote(url.searchParams.get('quote'));

    const sortKey = parseSortKey(url.searchParams.get('sort'));
    const sortDir = parseSortDir(url.searchParams.get('dir'));

    const limit = parseLimit(url.searchParams.get('limit')); // 6 par défaut (UI)
    const regimeFilter = parseRegimeFilter(url.searchParams.get('regime')); // ALL par défaut

    // 1) Cache hit ?
    if (CACHE && Date.now() - CACHE.ts < CACHE_TTL_MS) {
      const enriched = withDeltaAndTrend(CACHE.data, LAST_GOOD?.data ?? null);
      const filtered = filterAssets(enriched, regimeFilter);
      const sorted = sortAssets(filtered, sortKey, sortDir).slice(0, limit);

      const res: ScanResponse = {
        ok: true,
        ts,
        source: 'cache',
        market,
        quote,
        count: sorted.length,
        data: sorted,
        message: null,
      };

      return NextResponse.json(res, { status: 200 });
    }

    // 2) Provider
    let providerData: ScanAsset[] = [];
    try {
      providerData = await fetchCoinGecko(quote);
    } catch {
      providerData = [];
    }

    // 3) Choix source + snapshot
    let source: ScanResponse['source'] = 'provider';
    let data: ScanAsset[] = providerData;

    if (data.length > 0) {
      // delta/trend basé sur LAST_GOOD
      data = withDeltaAndTrend(data, LAST_GOOD?.data ?? null);

      // update caches
      CACHE = { ts: Date.now(), data };
      LAST_GOOD = { ts: Date.now(), data };
    } else if (LAST_GOOD?.data?.length) {
      // Provider down -> last good
      source = 'cache';
      data = withDeltaAndTrend(LAST_GOOD.data, null);
      CACHE = { ts: Date.now(), data };
    } else {
      // Rien -> fallback garanti
      source = 'fallback';
      data = fallbackUniverse(quote);
      CACHE = { ts: Date.now(), data };
    }

    // 4) Filter + sort + limit (UI)
    const filtered = filterAssets(data, regimeFilter);
    const sorted = sortAssets(filtered, sortKey, sortDir).slice(0, limit);

    const res: ScanResponse = {
      ok: true,
      ts,
      source,
      market,
      quote,
      count: sorted.length,
      data: sorted,
      message: null,
    };

    return NextResponse.json(res, { status: 200 });
  } catch (e: any) {
    const res: ScanResponse = {
      ok: false,
      ts,
      source: 'fallback',
      market: 'crypto',
      quote: 'USD',
      count: 0,
      data: [],
      message: 'scan_failed',
      error: e?.message ?? 'Unknown error',
    };

    return NextResponse.json(res, { status: 500 });
  }
}
