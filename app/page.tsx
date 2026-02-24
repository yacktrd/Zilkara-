// app/page.tsx
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
  confidence_global?: number | null; // 0-100
  stable_ratio?: number | null;
  transition_ratio?: number | null;
  volatile_ratio?: number | null;
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

function normalizeRegimeLabel(regime: Regime | null): string {
  if (!regime) return '—';
  return String(regime).toUpperCase();
}

function pickTradeUrl(a: ScanAsset): string | null {
  // IMPORTANT: ne jamais reconstruire. On prend celui donné par l’API.
  return safeString(a.affiliate_url) ?? safeString(a.binance_url) ?? null;
}

function regimeDotStyle(regime: Regime | null): React.CSSProperties {
  const r = String(regime ?? '').toUpperCase();
  // style neutre (tu peux mettre des couleurs exactes ensuite en CSS global)
  if (r === 'STABLE') return { background: 'rgba(34, 197, 94, 0.95)' }; // vert
  if (r === 'TRANSITION') return { background: 'rgba(245, 158, 11, 0.95)' }; // ambre
  if (r === 'VOLATILE') return { background: 'rgba(239, 68, 68, 0.95)' }; // rouge
  return { background: 'rgba(0,0,0,0.35)' };
}

function shortTs(tsIso: string | null): string | null {
  if (!tsIso) return null;
  // on garde ISO brut (fiable) mais compact en affichage
  // ex: 2026-02-24T11:17:36.082Z -> 2026-02-24 11:17
  const m = tsIso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? `${m[1]} ${m[2]}` : tsIso;
}

function AssetIcon({ symbol }: { symbol: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        background: 'rgba(0,0,0,0.06)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        fontWeight: 800,
        letterSpacing: 0.2,
        flex: '0 0 auto',
      }}
      title={symbol}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}

function AssetCard({ asset }: { asset: ScanAsset }) {
  const symbol = (safeString(asset.symbol) ?? '—').toUpperCase();
  const name = safeString(asset.name) ?? symbol;

  const price = safeNumber(asset.price);
  const chg = safeNumber(asset.chg_24h_pct);
  const score = safeNumber(asset.confidence_score);
  const regime = asset.regime ?? null;

  const url = pickTradeUrl(asset);

  return (
    <div
      style={{
        borderRadius: 18,
        border: '1px solid rgba(0,0,0,0.08)',
        background: 'rgba(0,0,0,0.02)',
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Top row: identité + score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <AssetIcon symbol={symbol} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.05 }}>{symbol}</div>
            <div style={{ opacity: 0.72, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
          <div style={{ fontSize: 34, fontWeight: 950, letterSpacing: -0.8, lineHeight: 1 }}>
            {formatScore(score)}
          </div>
          <div style={{ opacity: 0.6, fontSize: 12 }}>Score</div>
        </div>
      </div>

      {/* Mid row: régime + variations + prix */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, ...regimeDotStyle(regime) }} />
          <span style={{ fontWeight: 900, letterSpacing: 0.4 }}>{normalizeRegimeLabel(regime)}</span>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 14, fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ fontWeight: 900 }}>{formatPct(chg)}</span>
          <span style={{ opacity: 0.7, fontWeight: 800 }}>{formatPrice(price)}</span>
        </div>
      </div>

      {/* Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ opacity: 0.65, fontSize: 12, lineHeight: 1.2 }}>
          {safeString(asset.confidence_reason) ?? '—'}
        </div>

        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: '0 0 auto',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 12px',
              borderRadius: 14,
              border: '1px solid rgba(0,0,0,0.10)',
              background: 'white',
              textDecoration: 'none',
              fontWeight: 900,
              color: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            Ouvrir Binance
          </a>
        ) : (
          <span style={{ opacity: 0.55 }}>—</span>
        )}
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

  const lastUpdated = useMemo(() => shortTs(safeString(context?.ts) ?? null), [context]);

  const buildScanUrl = useCallback(() => {
    const l = clampInt(limit, 1, 250);
    const params = new URLSearchParams();
    params.set('limit', String(l));
    params.set('sort', sort);
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

        if (!scanRes.ok) {
          const txt = await scanRes.text().catch(() => '');
          throw new Error(`Scan HTTP ${scanRes.status}${txt ? ` — ${txt}` : ''}`);
        }
        if (!ctxRes.ok) {
          const txt = await ctxRes.text().catch(() => '');
          throw new Error(`Context HTTP ${ctxRes.status}${txt ? ` — ${txt}` : ''}`);
        }

        const scanJson = (await scanRes.json()) as ScanResponse;
        const ctxJson = (await ctxRes.json()) as ContextResponse;

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
    const n = safeNumber(context?.confidence_global);
    return n == null ? null : clampInt(n, 0, 100);
  }, [context]);

  const marketRegime = useMemo(() => safeString(context?.market_regime) ?? '—', [context]);

  // ✅ UI = même expérience mobile sur PC (colonne unique, cartes)
  return (
    <main style={{ padding: 16, maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 40, fontWeight: 950, letterSpacing: -1 }}>Zilkara</div>
          <div style={{ opacity: 0.7, fontSize: 14 }}>
            {error ? 'Erreur' : 'OK'} — {assets.length} actifs{lastUpdated ? ` — Mis à jour : ${lastUpdated}` : ''}
          </div>
        </div>

        <button
          onClick={() => fetchAll('refresh')}
          disabled={isLoading || isRefreshing}
          style={{
            padding: '10px 14px',
            borderRadius: 16,
            border: '1px solid rgba(0,0,0,0.10)',
            background: 'white',
            fontWeight: 900,
          }}
        >
          {isRefreshing ? 'Refresh…' : 'Refresh'}
        </button>
      </div>

      {/* Context card (Apple-like) */}
      <div
        style={{
          borderRadius: 22,
          border: '1px solid rgba(0,0,0,0.08)',
          background: 'rgba(0,0,0,0.02)',
          padding: 16,
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ opacity: 0.6, letterSpacing: 1.2, fontWeight: 900, fontSize: 12 }}>RFS CONTEXT</div>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Confidence</div>
          <div style={{ fontWeight: 950, fontSize: 44, letterSpacing: -1.2, lineHeight: 1 }}>
            {confidenceGlobal != null ? `${confidenceGlobal}%` : '—'}
          </div>
          <div style={{ opacity: 0.7, fontSize: 14 }}>
            Objectif : filtrage & régulation du risque, lecture rapide, discipline d’abord.
          </div>
        </div>

        <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 999,
              border: '1px solid rgba(0,0,0,0.10)',
              background: 'white',
              fontWeight: 950,
              letterSpacing: 0.4,
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 999, ...regimeDotStyle(marketRegime) }} />
            {marketRegime}
          </div>
          <div style={{ opacity: 0.6, fontSize: 13, marginTop: 8 }}>Trier. Lire. Décider.</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ opacity: 0.65, fontWeight: 800 }}>Limit</span>
            <select
              value={limit}
              onChange={(e) => setLimit(clampInt(Number(e.target.value), 1, 250))}
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                border: '1px solid rgba(0,0,0,0.10)',
                background: 'white',
                fontWeight: 900,
              }}
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={150}>150</option>
              <option value={200}>200</option>
            </select>
          </label>

          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ opacity: 0.65, fontWeight: 800 }}>Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                border: '1px solid rgba(0,0,0,0.10)',
                background: 'white',
                fontWeight: 900,
              }}
            >
              <option value="confidence_score_desc">confidence_score_desc</option>
              <option value="market_cap_desc">market_cap_desc</option>
              <option value="volume_24h_desc">volume_24h_desc</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 18,
              border: '1px solid rgba(0,0,0,0.10)',
              background: 'white',
              fontWeight: 900,
            }}
          >
            <input type="checkbox" checked={discipline} onChange={(e) => setDiscipline(e.target.checked)} />
            Mode Discipline
          </label>

          <button
            onClick={() => fetchAll('refresh')}
            disabled={isLoading || isRefreshing}
            style={{
              padding: '12px 16px',
              borderRadius: 18,
              border: '1px solid rgba(0,0,0,0.10)',
              background: 'white',
              fontWeight: 950,
            }}
          >
            Appliquer
          </button>
        </div>
      </div>

      {/* States */}
      {isLoading ? (
        <div style={{ padding: 14, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 18, background: 'rgba(0,0,0,0.02)' }}>
          Chargement…
        </div>
      ) : error ? (
        <div style={{ padding: 14, border: '1px solid rgba(255,0,0,0.25)', borderRadius: 18, background: 'rgba(255,0,0,0.03)' }}>
          <div style={{ fontWeight: 950, marginBottom: 6 }}>Erreur</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{error}</div>
        </div>
      ) : assets.length === 0 ? (
        <div style={{ padding: 14, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 18, background: 'rgba(0,0,0,0.02)' }}>
          Aucun résultat.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {assets.map((a, idx) => (
            <AssetCard key={`${safeString(a.id) ?? safeString(a.symbol) ?? 'asset'}-${idx}`} asset={a} />
          ))}
        </div>
      )}
    </main>
  );
}
