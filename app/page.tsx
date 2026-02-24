k// app/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

type Regime = 'STABLE' | 'TRANSITION' | 'VOLATILE' | string;

type ScanAsset = {
  id?: string;
  symbol?: string;
  name?: string;

  price?: number | null;
  chg_24h_pct?: number | null;

  confidence_score?: number | null;
  confidence_label?: string | null;
  confidence_reason?: string | null;

  regime?: Regime | null;

  // liens fournis par l’API (NE PAS reconstruire)
  binance_url?: string | null;
  affiliate_url?: string | null;

  // optionnels
  market_cap?: number | null;
  volume_24h?: number | null;
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
  market_regime?: string | null;
  confidence_global?: number | null; // ex: 0-100
  message?: string | null;
  error?: string;
};

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function safeNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return null;
}

function safeString(v: unknown): string | null {
  if (typeof v === 'string') {
    const s = v.trim();
    return s.length ? s : null;
  }
  return null;
}

function formatPrice(v: number | null): string {
  if (v === null) return '—';
  // format simple; tu peux raffiner plus tard
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
  const n = clampInt(v, 0, 100);
  return String(n);
}

function regimeDot(regime: Regime | null): string {
  // Pastille (texte seulement pour éviter style/couleurs ici)
  // Tu mettras le style dans globals.css ensuite.
  if (!regime) return '•';
  const r = String(regime).toUpperCase();
  if (r === 'STABLE') return '●';
  if (r === 'TRANSITION') return '●';
  if (r === 'VOLATILE') return '●';
  return '●';
}

function regimeLabel(regime: Regime | null): string {
  if (!regime) return '—';
  return String(regime).toUpperCase();
}

function pickTradeUrl(a: ScanAsset): string | null {
  // IMPORTANT: ne jamais reconstruire. On prend celui donné par l’API.
  return safeString(a.affiliate_url) ?? safeString(a.binance_url) ?? null;
}

// (Option) logo via CoinGecko CDN basé sur symbol : risqué / pas fiable.
// Ici on ne fait RIEN => pas de trous visuels.
// Tu pourras ajouter plus tard un champ "logo_url" côté API.
function AssetCell({ asset }: { asset: ScanAsset }) {
  const symbol = safeString(asset.symbol) ?? '—';
  const name = safeString(asset.name) ?? symbol;

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
          fontWeight: 600,
        }}
        title={symbol}
      >
        {symbol.slice(0, 2)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <div style={{ fontWeight: 700 }}>{symbol}</div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>{name}</div>
      </div>
    </div>
  );
}

export default function Page() {
  // ✅ State UI minimal
  const [limit, setLimit] = useState<number>(50);
  const [sort, setSort] = useState<string>('confidence_score_desc');
  const [discipline, setDiscipline] = useState<boolean>(false);

  const [assets, setAssets] = useState<ScanAsset[]>([]);
  const [context, setContext] = useState<ContextResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const lastUpdated = useMemo(() => {
    const ts = safeString(context?.ts) ?? null;
    return ts;
  }, [context]);

  const buildScanUrl = useCallback(() => {
    const l = clampInt(limit, 1, 250);
    const params = new URLSearchParams();
    params.set('limit', String(l));
    params.set('sort', sort);
    if (discipline) params.set('discipline', '1');
    return `/api/scan?${params.toString()}`;
  }, [limit, sort, discipline]);

  const fetchAll = useCallback(async (mode: 'initial' | 'refresh') => {
    try {
      if (mode === 'initial') setIsLoading(true);
      if (mode === 'refresh') setIsRefreshing(true);
      setError(null);

      const scanUrl = buildScanUrl();

      const [scanRes, ctxRes] = await Promise.all([
        fetch(scanUrl, { cache: 'no-store' }),
        fetch('/api/context', { cache: 'no-store' }),
      ]);

      if (!scanRes.ok) {
        const txt = await scanRes.text().catch(() => '');
        throw new Error(`Scan HTTP ${scanRes.status} ${scanRes.statusText}${txt ? ` — ${txt}` : ''}`);
      }
      if (!ctxRes.ok) {
        const txt = await ctxRes.text().catch(() => '');
        throw new Error(`Context HTTP ${ctxRes.status} ${ctxRes.statusText}${txt ? ` — ${txt}` : ''}`);
      }

      const scanJson = (await scanRes.json()) as ScanResponse;
      const ctxJson = (await ctxRes.json()) as ContextResponse;

      if (!scanJson?.ok) throw new Error(scanJson?.error || scanJson?.message || 'Scan: réponse invalide.');
      if (!ctxJson?.ok) throw new Error(ctxJson?.error || ctxJson?.message || 'Context: réponse invalide.');

      const data = Array.isArray(scanJson.data) ? scanJson.data : [];
      setAssets(data);
      setContext(ctxJson);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : 'Erreur inconnue.');
      setAssets([]);
      setContext(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [buildScanUrl]);

  useEffect(() => {
    fetchAll('initial');
  }, [fetchAll]);

  // ✅ Rendu (zéro logique métier)
  return (
    <main style={{ padding: 16, maxWidth: 980, margin: '0 auto' }}>
      {/* Header Contexte */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.3 }}>Zilkara</div>
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
              fontWeight: 700,
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
            <b>Confiance</b> : {context?.confidence_global != null ? `${clampInt(context.confidence_global, 0, 100)}%` : '—'}
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
            <b>Régime marché</b> : {safeString(context?.market_regime) ?? '—'}
          </div>
          <div style={{ opacity: 0.75, fontSize: 13, alignSelf: 'center' }}>
            Objectif : filtrage & régulation du risque, lecture rapide, discipline d’abord.
          </div>
        </div>
      </div>

      {/* Controls (UI state minimal) */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
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
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: 10 }}
          >
            <option value="confidence_score_desc">confidence_score_desc</option>
            <option value="market_cap_desc">market_cap_desc</option>
            <option value="volume_24h_desc">volume_24h_desc</option>
          </select>
        </label>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={discipline}
            onChange={(e) => setDiscipline(e.target.checked)}
          />
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
            fontWeight: 700,
          }}
        >
          Appliquer
        </button>
      </div>

      {/* Loading / Error */}
      {isLoading ? (
        <div style={{ padding: 14, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 14 }}>
          Chargement…
        </div>
      ) : error ? (
        <div style={{ padding: 14, border: '1px solid rgba(255,0,0,0.25)', borderRadius: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Erreur</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{error}</div>
        </div>
      ) : assets.length === 0 ? (
        <div style={{ padding: 14, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 14 }}>
          Aucun résultat.
        </div>
      ) : (
        // Table
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
                const price = safeNumber(a.price);
                const chg = safeNumber(a.chg_24h_pct);
                const score = safeNumber(a.confidence_score);
                const regime = a.regime ?? null;
                const url = pickTradeUrl(a);

                return (
                  <tr key={`${safeString(a.id) ?? safeString(a.symbol) ?? 'asset'}-${idx}`} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <td style={{ padding: 12 }}>
                      <AssetCell asset={a} />
                    </td>
                    <td style={{ padding: 12, fontVariantNumeric: 'tabular-nums' }}>
                      {formatPrice(price)}
                    </td>
                    <td style={{ padding: 12, fontVariantNumeric: 'tabular-nums' }}>
                      {formatPct(chg)}
                    </td>
                    <td style={{ padding: 12, fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}>
                      {formatScore(score)}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span aria-hidden="true">{regimeDot(regime)}</span>
                        <span>{regimeLabel(regime)}</span>
                      </span>
                    </td>
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
                            fontWeight: 700,
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
