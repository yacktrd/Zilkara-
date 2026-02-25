// app/api/scan/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Regime = 'STABLE' | 'TRANSITION' | 'VOLATILE' | string;

export type ScanAsset = {
  id?: string;
  symbol?: string;
  name?: string;

  price?: number | null;
  chg_24h_pct?: number | null;

  confidence_score?: number | null;
  confidence_label?: string | null;
  confidence_reason?: string | null;

  regime?: Regime | null;

  // liens fournis (NE PAS reconstruire côté UI)
  binance_url?: string | null;
  affiliate_url?: string | null;

  // extras éventuels
  market_cap?: number | null;
  volume_24h?: number | null;

  // optionnels (si tu les ajoutes plus tard)
  score_delta?: number | null; // variation du score vs précédente exécution
  score_trend?: 'up' | 'down' | 'flat' | null;
};

type ScanResponse = {
  ok: boolean;
  ts: string;
  source: string;
  market: string;
  quote: string;
  count: number;
  data: ScanAsset[];
  error?: string;
  message?: string;
};

function asNullableNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function asNullableString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length ? s : null;
}

function toUpperSymbol(v: unknown): string | null {
  const s = asNullableString(v);
  return s ? s.toUpperCase() : null;
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function parseIntSafe(v: string | null, fallback: number, min: number, max: number) {
  const n = v ? Number(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return clampInt(n, min, max);
}

function normalizeAsset(raw: any): ScanAsset {
  // IMPORTANT : toujours renvoyer null (pas undefined) pour les champs "nullable"
  const asset: ScanAsset = {
    id: asNullableString(raw?.id) ?? undefined,
    symbol: toUpperSymbol(raw?.symbol) ?? undefined,
    name: asNullableString(raw?.name) ?? undefined,

    price: asNullableNumber(raw?.price),
    chg_24h_pct: asNullableNumber(raw?.chg_24h_pct),

    confidence_score: asNullableNumber(raw?.confidence_score),
    confidence_label: asNullableString(raw?.confidence_label),
    confidence_reason: asNullableString(raw?.confidence_reason),

    regime: (asNullableString(raw?.regime) ?? null) as Regime | null,

    binance_url: asNullableString(raw?.binance_url),
    affiliate_url: asNullableString(raw?.affiliate_url),

    market_cap: asNullableNumber(raw?.market_cap),
    volume_24h: asNullableNumber(raw?.volume_24h),

    score_delta: asNullableNumber(raw?.score_delta),
    score_trend:
      raw?.score_trend === 'up' || raw?.score_trend === 'down' || raw?.score_trend === 'flat'
        ? raw.score_trend
        : null,
  };

  // Petite sécurité : si symbol absent, on tente id
  if (!asset.symbol && asset.id) asset.symbol = asset.id.toUpperCase();

  return asset;
}

/**
 * 🔌 BRANCHE ICI ton pipeline actuel
 * - soit tu lis depuis KV / fichier / DB
 * - soit tu appelles ton “engine”
 *
 * Doit retourner un tableau brut (any[]), ensuite normalisé.
 */
async function getRawUniverse(): Promise<any[]> {
  // ✅ Par défaut, on ne casse jamais le build : retourne [] si rien.
  // Remplace cette partie par ton vrai générateur.
  return [];
}

function sortAssets(data: ScanAsset[], sortKey: string): ScanAsset[] {
  const copy = [...data];

  if (sortKey === 'price_asc') {
    copy.sort((a, b) => (a.price ?? -Infinity) - (b.price ?? -Infinity));
    return copy;
  }
  if (sortKey === 'price_desc') {
    copy.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    return copy;
  }
  if (sortKey === 'score_asc') {
    copy.sort((a, b) => (a.confidence_score ?? -Infinity) - (b.confidence_score ?? -Infinity));
    return copy;
  }

  // default: score desc
  copy.sort((a, b) => (b.confidence_score ?? -Infinity) - (a.confidence_score ?? -Infinity));
  return copy;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = parseIntSafe(url.searchParams.get('limit'), 200, 1, 500);

  // ✅ tes filtres actuels: Prix/Score asc/desc
  const sort = asNullableString(url.searchParams.get('sort')) ?? 'score_desc';

  try {
    const raw = await getRawUniverse();
    const normalized = (Array.isArray(raw) ? raw : []).map(normalizeAsset);

    const sorted = sortAssets(normalized, sort);

    const sliced = sorted.slice(0, limit);

    const res: ScanResponse = {
      ok: true,
      ts: new Date().toISOString(),
      source: 'scan',
      market: 'crypto',
      quote: 'USD',
      count: sliced.length,
      data: sliced,
    };

    return NextResponse.json(res, { status: 200 });
  } catch (e: any) {
    const res: ScanResponse = {
      ok: false,
      ts: new Date().toISOString(),
      source: 'scan',
      market: 'crypto',
      quote: 'USD',
      count: 0,
      data: [],
      error: e?.message ? String(e.message) : 'Scan failed',
    };

    return NextResponse.json(res, { status: 500 });
  }
}
