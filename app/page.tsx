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

  binance_url?: string | null;
  affiliate_url?: string | null;
};

type ScanResponse = {
  ok: boolean;
  ts?: string;
  data?: ScanAsset[];
  error?: string;
  message?: string;
};

type ContextResponse = {
  ok: boolean;
  ts?: string;
  market_regime?: string | null;
  confidence_global?: number | null;
  stable_ratio?: number | null;
  transition_ratio?: number | null;
  volatile_ratio?: number | null;
  error?: string;
  message?: string | null;
};

function safeNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}
function safeString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length ? s : null;
}
function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)));
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

function regimeLabel(regime: Regime | null): string {
  if (!regime) return '—';
  return String(regime).toUpperCase();
}

function pickTradeUrl(a: ScanAsset): string | null {
  // IMPORTANT: on consomme l’URL API. On ne reconstruit jamais.
  return safeString(a.affiliate_url) ?? safeString(a.binance_url) ?? null;
}

function initials(symbol: string) {
  const s = symbol.trim().toUpperCase();
  if (!s) return '—';
  return s.slice(0, 2);
}

function AssetCard({ asset }: { asset: ScanAsset }) {
  const symbol = safeString(asset.symbol) ?? '—';
  const name = safeString(asset.name) ?? symbol;

  const price = safeNumber(asset.price);
  const chg = safeNumber(asset.chg_24h_pct);
  const score = safeNumber(asset.confidence_score);
  const regime = asset.regime ?? null;

  const url = pickTradeUrl(asset);

  return (
    <div
      style={{
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 18,
        padding: 16,
        background: 'rgba(255,255,255,0.9)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div
            aria-hidden="true"
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              background: 'rgba(0,0,0,0.05)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
            }}
            title={symbol}
          >
            {initials(symbol)}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.1 }}>{symbol}</div>
            <div style={{ opacity: 0.7, fontSize: 13, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1 }}>{formatScore(score)}</div>
          <div style={{ opacity: 0.65, fontSize: 12, marginTop: 2 }}>Score</div>
        </div>
      </div>

      {/* mid row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontSize: 22, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
          {formatPrice(price)}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, opacity: 0.9, fontVariantNumeric: 'tabular-nums' }}>
          {formatPct(chg)}
        </div>
      </div>

      {/* regime + action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span
            aria-hidden="true"
            style={{
              width: 10,
              height: 10,
              borderRadius: 99,
              background: 'rgba(0,0,0,0.35)',
              display: 'inline-block',
            }}
          />
          <div style={{ fontWeight: 900, letterSpacing: 0.4 }}>{regimeLabel(regime)}</div>
        </div>

        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 14px',
              borderRadius: 14,
              border: '1px solid rgba(0,0,0,0.12)',
              textDecoration: 'none',
              fontWeight: 900,
              color: 'inherit',
              background: 'white',
              whiteSpace: 'nowrap',
            }}
          >
            Ouvrir Binance
          </a>
        ) : (
          <span style={{ opacity: 0.6 }}>—</span>
        )}
      </div>

      {/* reason (optionnel, ultra court) */}
      {safeString(asset.confidence_reason) ? (
        <div style={{ opacity: 0.7, fontSize: 13, lineHeight: 1.25 }}>
          {asset.confidence_reason}
        </div>
      ) : null}
    </div>
  );
}

export default function Page() {
  // UI minimal : on garde seulement le tri (tout le reste est API-side)
  const [sort, setSort] = useState<string>('confidence_score_desc');

  const [assets, setAssets] = useState<ScanAsset[]>([]);
  const [context, setContext] = useState<ContextResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const lastUpdated = useMemo(() => safeString(context?.ts) ?? null, [context]);

  const buildScanUrl = useCallback(() => {
    const params = new URLSearchParams();
    // V1: on charge "large" sans exposer de limite UI
    params.set('limit', '250');
    params.set('sort', sort);
    return `/api/scan?${params.toString()}`;
  }, [sort]);

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

      if (!scanRes.ok) throw new Error(`Scan HTTP ${scanRes.status}`);
      if (!ctxRes.ok) throw new Error(`Context HTTP ${ctxRes.status}`);

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
  }, [buildScanUrl]);

  useEffect(() => {
    fetchAll('initial');
  }, [fetchAll]);

  return (
    <main style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 34, fontWeight: 950, letterSpacing: -0.4 }}>Zilkara</div>
          <div style={{ opacity: 0.65, fontSize: 13 }}>
            {lastUpdated ? `Mis à jour : ${lastUpdated}` : ''}
          </div>
        </div>

        <button
          onClick={() => fetchAll('refresh')}
          disabled={isLoading || isRefreshing}
          style={{
            padding: '10px 14px',
            borderRadius: 14,
            border: '1px solid rgba(0,0,0,0.12)',
            background: 'white',
            fontWeight: 900,
            whiteSpace: 'nowrap',
          }}
        >
          {isRefreshing ? 'Refresh…' : 'Refresh'}
        </button>
      </div>

      {/* Context chips (discrets mais utiles) */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ padding: '10px 12px', borderRadius: 14, border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(0,0,0,0.03)' }}>
          <b>Confiance</b> : {context?.confidence_global != null ? `${clampInt(context.confidence_global, 0, 100)}%` : '—'}
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 14, border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(0,0,0,0.03)' }}>
          <b>Régime marché</b> : {safeString(context?.market_regime) ?? '—'}
        </div>
        <div style={{ opacity: 0.75, alignSelf: 'center' }}>
          Trier. Lire. Décider.
        </div>
      </div>

      {/* Controls (minimal) */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, opacity: 0.75 }}>Tri</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: 14, border: '1px solid rgba(0,0,0,0.12)', background: 'white', fontWeight: 800 }}
          >
            <option value="confidence_score_desc">Score (desc)</option>
            <option value="market_cap_desc">Market cap (desc)</option>
            <option value="volume_24h_desc">Volume 24h (desc)</option>
          </select>
        </label>

        <button
          onClick={() => fetchAll('refresh')}
          disabled={isLoading || isRefreshing}
          style={{
            padding: '10px 14px',
            borderRadius: 14,
            border: '1px solid rgba(0,0,0,0.12)',
            background: 'white',
            fontWeight: 900,
          }}
        >
          Appliquer
        </button>
      </div>

      {/* States */}
      {isLoading ? (
        <div style={{ padding: 14, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16 }}>Chargement…</div>
      ) : error ? (
        <div style={{ padding: 14, border: '1px solid rgba(255,0,0,0.25)', borderRadius: 16 }}>
          <div style={{ fontWeight: 950, marginBottom: 6 }}>Erreur</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{error}</div>
        </div>
      ) : assets.length === 0 ? (
        <div style={{ padding: 14, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16 }}>Aucun résultat.</div>
      ) : (
        // Cards grid (même UI partout)
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 14,
          }}
        >
          {assets.map((a, idx) => (
            <AssetCard key={`${safeString(a.id) ?? safeString(a.symbol) ?? 'asset'}-${idx}`} asset={a} />
          ))}
        </div>
      )}
    </main>
  );
}
