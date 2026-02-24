// app/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

type Regime = 'STABLE' | 'TRANSITION' | 'VOLATILE';

type ScanAsset = {
  id?: string;
  symbol?: string;
  name?: string;

  price?: number | string | null;
  chg_24h_pct?: number | string | null;

  confidence_score?: number | string | null;
  confidence_label?: string | null;
  confidence_reason?: string | null;

  regime?: Regime | string | null;

  // fournis par l’API : NE PAS reconstruire
  binance_url?: string | null;
  affiliate_url?: string | null;

  market_cap?: number | string | null;
  volume_24h?: number | string | null;
};

type ScanResponse = {
  ok: boolean;
  ts?: string;
  source?: string;
  market?: string;
  quote?: string;
  count?: number;
  data?: ScanAsset[];
  meta?: Record<string, unknown>;
  error?: string;
  message?: string;
};

type ContextResponse = {
  ok: boolean;
  ts?: string;
  source?: string;
  market?: string;
  quote?: string;

  market_regime?: string | null;
  confidence_global?: number | string | null;

  stable_ratio?: number | string | null;
  transition_ratio?: number | string | null;
  volatile_ratio?: number | string | null;

  meta?: Record<string, unknown>;
  error?: string;
  message?: string;
};

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toStringSafe(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length ? s : null;
}

function formatPrice(v: number | null): string {
  if (v === null) return '—';
  if (v >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (v >= 1) return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

function formatPct(v: number | null): string {
  if (v === null) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatScore(v: number | null): string {
  if (v === null) return '—';
  return String(clampInt(v, 0, 100));
}

function normalizeRegimeLabel(v: unknown): string {
  const s = (typeof v === 'string' ? v : '').toUpperCase().trim();
  if (s === 'STABLE' || s === 'TRANSITION' || s === 'VOLATILE') return s;
  return '—';
}

function pickTradeUrl(a: ScanAsset): string | null {
  // IMPORTANT: ne jamais reconstruire. On prend uniquement ce que l’API fournit.
  return toStringSafe(a.affiliate_url) ?? toStringSafe(a.binance_url) ?? null;
}

function AssetCell({ asset }: { asset: ScanAsset }) {
  const symbol = (toStringSafe(asset.symbol) ?? '—').toUpperCase();
  const name = toStringSafe(asset.name) ?? symbol;

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <div
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'rgba(0,0,0,0.06)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
        }}
        title={symbol}
      >
        {symbol.slice(0, 2)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <div style={{ fontWeight: 800 }}>{symbol}</div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>{name}</div>
      </div>
    </div>
  );
}

export default function Page() {
  // UI state minimal
  const [limit, setLimit] = useState<number>(50);
  const [sort, setSort] = useState<string>('confidence_score_desc');
  const [discipline, setDiscipline] = useState<boolean>(false);

  const [assets, setAssets] = useState<ScanAsset[]>([]);
  const [context, setContext] = useState<ContextResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const lastUpdated = useMemo(() => toStringSafe(context?.ts) ?? null, [context]);

  const buildScanUrl = useCallback(() => {
    const l = clampInt(limit, 1, 250);
    const params = new URLSearchParams();
    params.set('limit', String(l));
    params.set('sort', sort || 'confidence_score_desc');
    if (discipline) params.set('discipline', '1');
    return `/api/scan?${params.toString()}`;
  }, [limit, sort, discipline]);

  const fetchAll = useCallback(
    async (mode: 'initial' | 'refresh') => {
      try {
        if (mode === 'initial') setIsLoading(true);
        if (mode === 'refresh') setIsRefreshing(true);
        setError(null);

        const scanUrl = buildScanUrl();

        const [scanRes, ctxRes] = await Promise.all([
          fetch(scanUrl, { cache: 'no-store' }),
          fetch('/api/context', { cache: 'no-store' }),
        ]);

        const scanJson = (await scanRes.json().catch(() => null)) as ScanResponse | null;
        const ctxJson = (await ctxRes.json().catch(() => null)) as ContextResponse | null;

        if (!scanRes.ok) {
          throw new Error(scanJson?.error || scanJson?.message || `Scan HTTP ${scanRes.status}`);
        }
        if (!ctxRes.ok) {
          throw new Error(ctxJson?.error || ctxJson?.message || `Context HTTP ${ctxRes.status}`);
        }

        if (!scanJson?.ok) throw new Error(scanJson?.error || scanJson?.message || 'Scan: réponse invalide.');
        if (!ctxJson?.ok) throw new Error(ctxJson?.error || ctxJson?.message || 'Context: réponse invalide.');

        setAssets(Array.isArray(scanJson.data) ? scanJson.data : []);
        setContext(ctxJson);
      } catch (e: any) {
        setError(e?.message ? String(e.message) : 'Erreur inconnue.');
        setAssets([]);
        setContext(null);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [buildScanUrl]
  );

  useEffect(() => {
    fetchAll('initial');
  }, [fetchAll]);

  const confidenceGlobal = useMemo(() => {
    const n = toNumber(context?.confidence_global);
    return n === null ? null : clampInt(n, 0, 100);
  }, [context]);

  const marketRegime = useMemo(() => {
    const s = toStringSafe(context?.market_regime);
    return s ? s.toUpperCase() : null;
  }, [context]);

  return (
    <main style={{ padding: 16, maxWidth: 980, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.3 }}>Zilkara</div>
            <div style={{ opacity: 0.7, fontSize: 13 }}>
              {error ? 'Erreur' : 'OK'} — {assets.length} actifs{lastUpdated ? ` — Mis à jour : ${lastUpdated}` : ''}
            </div>
          </div>

          <button
            onClick={() => fetchAll('refresh')}
            disabled={isLoading || isRefreshing}
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.12)',
              background: 'white',
              fontWeight: 800,
            }}
          >
            {isRefreshing ? 'Refresh…' : 'Refresh'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '8px 10px',
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.10)',
              background: 'rgba(0,0,0,0.03)',
              fontSize: 13,
            }}
          >
            <b>Confiance</b> : {confidenceGlobal !== null ? `${confidenceGlobal}%` : '—'}
          </div>

          <div
            style={{
              padding: '8px 10px',
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.10)',
              background: 'rgba(0,0,0,0.03)',
              fontSize: 13,
            }}
          >
            <b>Régime marché</b> : {marketRegime ?? '—'}
          </div>

          <div style={{ opacity: 0.75, fontSize: 13, alignSelf: 'center' }}>
            Objectif : filtrage & régulation du risque, lecture rapide, discipline d’abord.
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, opacity: 0.75 }}>Limit</span>
          <select
            value={limit}
            onChange={(e) => setLimit(clampInt(Number(e.target.value), 1, 250))}
            style={{ padding: '8px 10px', borderRadius: 10 }}
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={150}>150</option>
            <option value={200}>200</option>
          </select>
        </label>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, opacity: 0.75 }}>Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: '8px 10px', borderRadius: 10 }}>
            <option value="confidence_score_desc">confidence_score_desc</option>
            <option value="market_cap_desc">market_cap_desc</option>
            <option value="volume_24h_desc">volume_24h_desc</option>
          </select>
        </label>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={discipline} onChange={(e) => setDiscipline(e.target.checked)} />
          <span style={{ fontSize: 13, opacity: 0.75 }}>Discipline</span>
        </label>

        <button
          onClick={() => fetchAll('refresh')}
          disabled={isLoading || isRefreshing}
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.12)',
            background: 'white',
            fontWeight: 800,
          }}
        >
          Appliquer
        </button>
      </div>

      {/* Loading / Error / Empty */}
      {isLoading ? (
        <div style={{ padding: 14, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 14 }}>Chargement…</div>
      ) : error ? (
        <div style={{ padding: 14, border: '1px solid rgba(255,0,0,0.25)', borderRadius: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Erreur</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{error}</div>
        </div>
      ) : assets.length === 0 ? (
        <div style={{ padding: 14, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 14 }}>Aucun résultat.</div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ textAlign: 'left', fontSize: 12, opacity: 0.75 }}>
                <th style={{ padding: 12 }}>Actif</th>
                <th style={{ padding: 12 }}>Prix</th>
                <th style={{ padding: 12 }}>24h</th>
                <th style={{ padding: 12 }}>Score</th>
                <th style={{ padding: 12 }}>Régime</th>
                <th style={{ padding: 12 }}>Binance</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a, idx) => {
                const price = toNumber(a.price);
                const chg = toNumber(a.chg_24h_pct);
                const score = toNumber(a.confidence_score);
                const regime = normalizeRegimeLabel(a.regime);
                const url = pickTradeUrl(a);

                const key = `${toStringSafe(a.id) ?? toStringSafe(a.symbol) ?? 'asset'}-${idx}`;

                return (
                  <tr key={key} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <td style={{ padding: 12 }}>
                      <AssetCell asset={a} />
                    </td>
                    <td style={{ padding: 12, fontVariantNumeric: 'tabular-nums' }}>{formatPrice(price)}</td>
                    <td style={{ padding: 12, fontVariantNumeric: 'tabular-nums' }}>{formatPct(chg)}</td>
                    <td style={{ padding: 12, fontVariantNumeric: 'tabular-nums', fontWeight: 900 }}>{formatScore(score)}</td>
                    <td style={{ padding: 12 }}>{regime}</td>
                    <td style={{ padding: 12 }}>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            padding: '8px 10px',
                            borderRadius: 10,
                            border: '1px solid rgba(0,0,0,0.12)',
                            textDecoration: 'none',
                            fontWeight: 800,
                            color: 'inherit',
                          }}
                        >
                          Ouvrir
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
