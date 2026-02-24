// app/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';

type Regime = 'STABLE' | 'TRANSITION' | 'VOLATILE' | string;

type ScanAsset = {
  id?: string;
  symbol?: string;
  name?: string;
  price?: number | null;
  chg_24h_pct?: number | null;
  confidence_score?: number | null;
  regime?: Regime | null;
  binance_url?: string | null;
  affiliate_url?: string | null;
};

type ScanResponse = {
  ok: boolean;
  data?: ScanAsset[];
  error?: string;
  message?: string;
  meta?: {
    updated_at?: string;
    confidence?: number;
    regime?: Regime;
  };
};

type SortKey = 'score_desc' | 'score_asc' | 'chg_desc' | 'chg_asc' | 'price_desc' | 'price_asc';

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export default function Page() {
  const [assets, setAssets] = useState<ScanAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // barre d’info (comme sur la photo)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [globalConfidence, setGlobalConfidence] = useState<number | null>(null);
  const [globalRegime, setGlobalRegime] = useState<Regime | null>(null);

  // tri (ligne "Trier / Appliquer")
  const [sortKey, setSortKey] = useState<SortKey>('score_desc');
  const [appliedSortKey, setAppliedSortKey] = useState<SortKey>('score_desc');

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/scan', { cache: 'no-store' });
      const json = (await res.json()) as ScanResponse;

      if (!json.ok) throw new Error(json.error || json.message || 'Erreur de chargement');

      const arr = Array.isArray(json.data) ? json.data : [];
      setAssets(arr);

      const metaUpdated = json.meta?.updated_at;
      setUpdatedAt(metaUpdated ?? new Date().toISOString());

      const metaRegime = json.meta?.regime ?? guessRegime(arr);
      setGlobalRegime(metaRegime ?? null);

      const metaConf =
        typeof json.meta?.confidence === 'number' ? json.meta!.confidence! : computeGlobalConfidence(arr);
      setGlobalConfidence(Number.isFinite(metaConf) ? clamp(Math.round(metaConf), 0, 100) : null);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur inconnue');
      setAssets([]);
      setUpdatedAt(null);
      setGlobalConfidence(null);
      setGlobalRegime(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const displayAssets = useMemo(() => {
    const list = [...assets];
    const getNum = (v: number | null | undefined, fallback = -Infinity) =>
      typeof v === 'number' && Number.isFinite(v) ? v : fallback;

    switch (appliedSortKey) {
      case 'score_desc':
        list.sort((a, b) => getNum(b.confidence_score) - getNum(a.confidence_score));
        break;
      case 'score_asc':
        list.sort((a, b) => getNum(a.confidence_score) - getNum(b.confidence_score));
        break;
      case 'chg_desc':
        list.sort((a, b) => getNum(b.chg_24h_pct) - getNum(a.chg_24h_pct));
        break;
      case 'chg_asc':
        list.sort((a, b) => getNum(a.chg_24h_pct) - getNum(b.chg_24h_pct));
        break;
      case 'price_desc':
        list.sort((a, b) => getNum(b.price) - getNum(a.price));
        break;
      case 'price_asc':
        list.sort((a, b) => getNum(a.price) - getNum(b.price));
        break;
    }
    return list;
  }, [assets, appliedSortKey]);

  const applySort = () => setAppliedSortKey(sortKey);

  const formatUpdated = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toISOString();
  };

  const formatPrice = (v: number | null): string => {
    if (v == null || !Number.isFinite(v)) return '—';
    if (v >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (v >= 1) return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return v.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  };

  const formatPct = (v: number | null): string => {
    if (v == null || !Number.isFinite(v)) return '—';
    const sign = v > 0 ? '+' : '';
    return `${sign}${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  };

  const formatScore = (v: number | null): string => {
    if (v == null || !Number.isFinite(v)) return '—';
    return String(clamp(Math.round(v), 0, 100));
  };

  const topAffiliate = useMemo(() => {
    const u =
      assets.find((a) => a.affiliate_url)?.affiliate_url ??
      assets.find((a) => a.binance_url)?.binance_url ??
      null;
    return u;
  }, [assets]);

  return (
    <main className="wrap">
      <div className="container">
        {/* header */}
        <header className="header">
          <div className="h-left">
            <div className="title">Zilkara</div>
            <div className="updated">Mis à jour : {formatUpdated(updatedAt)}</div>
            <div className="meta">
              <span className="meta-item">
                <span className="meta-label">Confiance :</span>{' '}
                <span className="meta-value">{globalConfidence == null ? '—' : `${globalConfidence}%`}</span>
              </span>
              <span className="meta-sep" />
              <span className="meta-item">
                <span className="meta-label">Régime marché :</span>{' '}
                <span className="meta-value">{globalRegime ? String(globalRegime).toUpperCase() : '—'}</span>
              </span>
              <span className="meta-sep" />
              <span className="tagline">Trier. Lire. Décider.</span>
            </div>
          </div>

          <div className="h-right">
            {/* bouton Refresh à droite (photo) */}
            <button className="btn refresh" onClick={load} disabled={isLoading}>
              Refresh
            </button>
          </div>
        </header>

        {/* barre tri (photo) */}
        <div className="toolbar">
          <select
            className="select"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            disabled={isLoading}
            aria-label="Tri"
          >
            <option value="score_desc">Score (desc)</option>
            <option value="score_asc">Score (asc)</option>
            <option value="chg_desc">24h (desc)</option>
            <option value="chg_asc">24h (asc)</option>
            <option value="price_desc">Prix (desc)</option>
            <option value="price_asc">Prix (asc)</option>
          </select>

          <button className="btn apply" onClick={applySort} disabled={isLoading}>
            Appliquer
          </button>

          {/* lien Binance discret en header (tu voulais l’affiliation sur le header) */}
          {topAffiliate ? (
            <a className="link" href={topAffiliate} target="_blank" rel="noreferrer">
              Binance
            </a>
          ) : null}
        </div>

        {/* content */}
        {error ? <div className="error">{error}</div> : null}

        {/* grille cards façon photo */}
        <section className="grid">
          {isLoading
            ? Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)
            : displayAssets.length === 0
              ? Array.from({ length: 9 }).map((_, i) => <EmptyCard key={`em-${i}`} />)
              : displayAssets.map((a, idx) => {
                  const symbol = (a.symbol ?? '—').toUpperCase();
                  const name = a.name ?? symbol;
                  const url = a.affiliate_url ?? a.binance_url ?? null;
                  const chg = a.chg_24h_pct ?? null;
                  const score = a.confidence_score ?? null;

                  return (
                    <article className="card" key={`${symbol}-${idx}`}>
                      <div className="dot" aria-hidden="true" />

                      {/* zone “contenu” volontairement discrète pour rester proche de la photo */}
                      <div className="card-top">
                        <div className="badge">{symbol}</div>
                        <div className="sub">{name}</div>
                      </div>

                      <div className="stats">
                        <div className="stat">
                          <div className="k">Prix</div>
                          <div className="v mono">{formatPrice(a.price ?? null)}</div>
                        </div>
                        <div className="stat">
                          <div className="k">24h</div>
                          <div className={`v mono ${chg != null && chg < 0 ? 'neg' : chg != null && chg > 0 ? 'pos' : ''}`}>
                            {formatPct(chg)}
                          </div>
                        </div>
                        <div className="stat">
                          <div className="k">Score</div>
                          <div className="v mono strong">{formatScore(score)}</div>
                        </div>
                      </div>

                      <div className="card-actions">
                        <a
                          className={`btn binance ${url ? '' : 'disabled'}`}
                          href={url ?? undefined}
                          target={url ? '_blank' : undefined}
                          rel={url ? 'noreferrer' : undefined}
                          aria-disabled={!url}
                          onClick={(e) => {
                            if (!url) e.preventDefault();
                          }}
                        >
                          Ouvrir Binance
                        </a>
                      </div>
                    </article>
                  );
                })}
        </section>
      </div>

      <style jsx global>{`
        :root {
          color-scheme: dark;
        }

        html,
        body {
          height: 100%;
        }

        body {
          margin: 0;
          background: radial-gradient(1200px 700px at 40% -20%, rgba(255, 255, 255, 0.06), transparent 55%),
            radial-gradient(900px 500px at 90% 10%, rgba(255, 255, 255, 0.04), transparent 60%),
            #080a0f;
          color: rgba(255, 255, 255, 0.92);
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji',
            'Segoe UI Emoji';
        }

        * {
          box-sizing: border-box;
        }
      `}</style>

      <style jsx>{`
        .wrap {
          padding: 18px 14px 32px;
        }

        .container {
          max-width: 1120px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          padding: 8px 2px 10px;
        }

        .title {
          font-size: 34px;
          font-weight: 900;
          letter-spacing: -0.6px;
          line-height: 1.05;
          margin-top: 2px;
        }

        .updated {
          margin-top: 6px;
          font-size: 12px;
          opacity: 0.75;
        }

        .meta {
          margin-top: 10px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 14px;
        }

        .meta-item {
          display: inline-flex;
          gap: 6px;
          align-items: center;
        }

        .meta-label {
          opacity: 0.75;
        }

        .meta-value {
          font-weight: 800;
          letter-spacing: 0.1px;
        }

        .meta-sep {
          width: 1px;
          height: 14px;
          background: rgba(255, 255, 255, 0.12);
          display: inline-block;
        }

        .tagline {
          opacity: 0.75;
          letter-spacing: 0.2px;
        }

        .h-right {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-top: 6px;
        }

        .toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 8px;
          margin-bottom: 14px;
        }

        .select {
          height: 34px;
          padding: 0 10px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.92);
          outline: none;
        }

        .btn {
          height: 34px;
          padding: 0 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.92);
          font-weight: 800;
          cursor: pointer;
          user-select: none;
        }

        .btn:disabled {
          opacity: 0.55;
          cursor: default;
        }

        .refresh {
          border-radius: 16px;
          padding: 0 14px;
        }

        .apply {
          padding: 0 14px;
        }

        .link {
          margin-left: auto;
          font-size: 13px;
          text-decoration: none;
          opacity: 0.8;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          padding-bottom: 2px;
        }

        .link:hover {
          opacity: 1;
        }

        .error {
          margin: 10px 0 14px;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(255, 0, 0, 0.08);
          border: 1px solid rgba(255, 0, 0, 0.18);
          color: rgba(255, 210, 210, 0.98);
          font-weight: 700;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }

        @media (min-width: 720px) {
          .grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1040px) {
          .grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .card {
          position: relative;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
          padding: 16px;
          min-height: 150px;
          overflow: hidden;
        }

        .dot {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.22);
        }

        .card-top {
          padding-left: 18px; /* pour laisser respirer le point à gauche */
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .badge {
          width: fit-content;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.18);
          font-weight: 900;
          letter-spacing: 0.4px;
          font-size: 12px;
        }

        .sub {
          opacity: 0.7;
          font-size: 12px;
          line-height: 1.2;
          max-width: 95%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .stats {
          margin-top: 12px;
          padding-left: 18px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .stat .k {
          font-size: 11px;
          opacity: 0.65;
          margin-bottom: 4px;
        }

        .stat .v {
          font-size: 13px;
          opacity: 0.92;
        }

        .mono {
          font-variant-numeric: tabular-nums;
        }

        .strong {
          font-weight: 900;
        }

        .pos {
          opacity: 1;
        }

        .neg {
          opacity: 1;
        }

        .card-actions {
          margin-top: 14px;
          padding-left: 18px;
          display: flex;
          justify-content: flex-start;
        }

        .binance {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          height: 36px;
          padding: 0 14px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.08);
          font-weight: 900;
          color: rgba(255, 255, 255, 0.9);
        }

        .binance:hover {
          background: rgba(255, 255, 255, 0.10);
        }

        .binance.disabled {
          opacity: 0.55;
          cursor: default;
          pointer-events: none;
        }

        /* Skeleton / empty look très proche de la photo */
        .skeleton,
        .empty {
          background: rgba(255, 255, 255, 0.07);
        }

        .skeleton::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.06) 35%,
            rgba(255, 255, 255, 0) 70%
          );
          transform: translateX(-100%);
          animation: shimmer 1.2s infinite;
        }

        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }

        .ghost-btn {
          margin-top: 18px;
          margin-left: 18px;
          width: 170px;
          height: 36px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          opacity: 0.35;
        }
      `}</style>
    </main>
  );
}

/** Card skeleton (gris, vide, avec bouton fantôme “Ouvrir Binance”) */
function SkeletonCard() {
  return (
    <article className="card skeleton" aria-label="Chargement">
      <div className="dot" aria-hidden="true" />
      <div className="ghost-btn">Ouvrir Binance</div>
    </article>
  );
}

/** Card vide quand aucune donnée (même rendu que la photo) */
function EmptyCard() {
  return (
    <article className="card empty" aria-label="Aucun actif">
      <div className="dot" aria-hidden="true" />
      <div className="ghost-btn">Ouvrir Binance</div>
    </article>
  );
}

/** Heuristique si l’API ne renvoie pas meta.regime */
function guessRegime(arr: ScanAsset[]): Regime | null {
  const regimes = arr.map((a) => (a.regime ? String(a.regime).toUpperCase() : null)).filter(Boolean) as string[];
  if (regimes.length === 0) return null;
  const count = new Map<string, number>();
  for (const r of regimes) count.set(r, (count.get(r) ?? 0) + 1);
  const best = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return best ?? null;
}

/** Score global (moyenne des scores disponibles) */
function computeGlobalConfidence(arr: ScanAsset[]): number | null {
  const nums = arr
    .map((a) => (typeof a.confidence_score === 'number' && Number.isFinite(a.confidence_score) ? a.confidence_score : null))
    .filter((x): x is number => x != null);
  if (nums.length === 0) return null;
  const avg = nums.reduce((s, x) => s + x, 0) / nums.length;
  return avg;
}
