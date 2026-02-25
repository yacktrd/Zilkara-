// app/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';

type Regime = 'STABLE' | 'TRANSITION' | 'VOLATILE' | string;

type ScanAsset = {
  id: string;
  symbol: string;
  name: string;

  price: number | null;
  chg_24h_pct: number | null; // ex: 0.34 pour +0,34%

  confidence_score: number | null; // 0..100
  regime: Regime | null;

  binance_url: string | null;
  affiliate_url: string | null;

  // optionnels si ton API les expose (sinon null)
  score_delta?: number | null; // variation du score
  score_trend?: 'up' | 'down' | null; // direction du score
};

type ScanResponse = {
  ok: boolean;
  ts?: string;
  data?: ScanAsset[];
  count?: number;
  source?: string;
  market?: string;
  quote?: string;
  error?: string;
  message?: string;
};

type ContextResponse = {
  ok: boolean;
  ts?: string;
  market_regime?: Regime;
  confidence_global?: number | null;
  stable_ratio?: number;
  transition_ratio?: number;
  volatile_ratio?: number;
  error?: string;
  message?: string;
};

type SortMode = 'score_desc' | 'score_asc' | 'price_desc' | 'price_asc';

const MAX_VISIBLE = 6;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toStringSafe(v: unknown): string {
  return typeof v === 'string' ? v : String(v ?? '');
}

function safeRegime(v: unknown): Regime | null {
  const s = typeof v === 'string' ? v.toUpperCase() : '';
  if (s === 'STABLE' || s === 'TRANSITION' || s === 'VOLATILE') return s;
  return typeof v === 'string' && v.trim() ? v : null;
}

function formatPriceUSD(price: number | null): string {
  if (price === null) return '—';
  try {
    // compact mais lisible
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: price >= 1000 ? 0 : price >= 1 ? 2 : 6,
    }).format(price);
  } catch {
    return `${price}`;
  }
}

function formatPct(p: number | null): { text: string; sign: 'pos' | 'neg' | 'neu' } {
  if (p === null) return { text: 'H24 —', sign: 'neu' };
  const sign = p > 0 ? 'pos' : p < 0 ? 'neg' : 'neu';
  const abs = Math.abs(p);
  // p est en % (0.34 = 0,34%) => on garde % comme affichage
  const txt = `${p > 0 ? '+' : p < 0 ? '−' : ''}${abs.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
  return { text: `H24 ${txt}`, sign };
}

function normalizeAsset(x: any): ScanAsset {
  const symbolRaw = toStringSafe(x?.symbol || x?.id || '').trim();
  const symbol = symbolRaw.toUpperCase();

  const id = toStringSafe(x?.id || symbol).trim() || symbol || 'UNK';

  const nameRaw = toStringSafe(x?.name || symbol).trim();
  const name = nameRaw || symbol || 'Unknown';

  const price = toNumberOrNull(x?.price);
  const chg = toNumberOrNull(x?.chg_24h_pct);

  const confidence = toNumberOrNull(x?.confidence_score);
  const confidence_score = confidence === null ? null : clamp(confidence, 0, 100);

  const regime = safeRegime(x?.regime);

  const binance_url = x?.binance_url ? toStringSafe(x.binance_url) : null;
  const affiliate_url = x?.affiliate_url ? toStringSafe(x.affiliate_url) : null;

  const score_delta = toNumberOrNull(x?.score_delta);
  const score_trend =
    x?.score_trend === 'up' || x?.score_trend === 'down' ? x.score_trend : null;

  return {
    id,
    symbol,
    name,
    price,
    chg_24h_pct: chg,
    confidence_score,
    regime,
    binance_url,
    affiliate_url,
    score_delta,
    score_trend,
  };
}

function sortAssets(data: ScanAsset[], mode: SortMode) {
  const copy = [...data];
  const scoreVal = (a: ScanAsset) => (a.confidence_score ?? -1);
  const priceVal = (a: ScanAsset) => (a.price ?? -1);

  switch (mode) {
    case 'score_desc':
      return copy.sort((a, b) => scoreVal(b) - scoreVal(a));
    case 'score_asc':
      return copy.sort((a, b) => (a.confidence_score ?? 999) - (b.confidence_score ?? 999));
    case 'price_desc':
      return copy.sort((a, b) => priceVal(b) - priceVal(a));
    case 'price_asc':
      return copy.sort((a, b) => (a.price ?? 999999999) - (b.price ?? 999999999));
    default:
      return copy;
  }
}

function getScoreArrow(a: ScanAsset): { arrow: '↑' | '↓' | ''; tone: 'pos' | 'neg' | 'neu' } {
  // priorité à score_trend si fourni par l’API
  if (a.score_trend === 'up') return { arrow: '↑', tone: 'pos' };
  if (a.score_trend === 'down') return { arrow: '↓', tone: 'neg' };

  // sinon on déduit via score_delta si dispo
  const d = a.score_delta ?? null;
  if (d === null) return { arrow: '', tone: 'neu' };
  if (d > 0) return { arrow: '↑', tone: 'pos' };
  if (d < 0) return { arrow: '↓', tone: 'neg' };
  return { arrow: '', tone: 'neu' };
}

function regimeLabel(r: Regime | null): string {
  if (!r) return '';
  const s = String(r).toUpperCase();
  if (s === 'STABLE') return 'STABLE';
  if (s === 'TRANSITION') return 'TRANSITION';
  if (s === 'VOLATILE') return 'VOLATILE';
  return s;
}

export default function Page() {
  const [assets, setAssets] = useState<ScanAsset[]>([]);
  const [ts, setTs] = useState<string>('');
  const [context, setContext] = useState<ContextResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('score_desc');

  async function load() {
    setIsLoading(true);
    setError(null);

    try {
      const [scanRes, ctxRes] = await Promise.allSettled([
        fetch('/api/scan', { cache: 'no-store' }),
        fetch('/api/context', { cache: 'no-store' }),
      ]);

      // scan
      if (scanRes.status === 'fulfilled') {
        const json: ScanResponse = await scanRes.value.json();
        if (!json.ok) {
          setError(json.error || json.message || 'Scan error');
          setAssets([]);
          setTs(json.ts || '');
        } else {
          const normalized = Array.isArray(json.data) ? json.data.map(normalizeAsset) : [];
          setAssets(normalized);
          setTs(json.ts || '');
        }
      } else {
        setError('Scan fetch failed');
        setAssets([]);
      }

      // context
      if (ctxRes.status === 'fulfilled') {
        const cj: ContextResponse = await ctxRes.value.json();
        setContext(cj.ok ? cj : null);
      } else {
        setContext(null);
      }
    } catch (e: any) {
      setError(e?.message || 'Unexpected error');
      setAssets([]);
      setContext(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // auto-refresh léger (optionnel)
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) => {
      const s = `${a.symbol} ${a.name}`.toLowerCase();
      return s.includes(q);
    });
  }, [assets, query]);

  const sorted = useMemo(() => sortAssets(filtered, sortMode), [filtered, sortMode]);

  const visible = useMemo(() => sorted.slice(0, MAX_VISIBLE), [sorted]);

  const ctxRegime = regimeLabel(context?.market_regime ?? null);
  const ctxConfidence =
    context?.confidence_global === null || context?.confidence_global === undefined
      ? null
      : clamp(context.confidence_global, 0, 100);

  const sortLabel =
    sortMode === 'score_desc'
      ? 'Score ↓'
      : sortMode === 'score_asc'
      ? 'Score ↑'
      : sortMode === 'price_desc'
      ? 'Prix ↓'
      : 'Prix ↑';

  const toggleScore = () =>
    setSortMode((m) => (m === 'score_desc' ? 'score_asc' : 'score_desc'));
  const togglePrice = () =>
    setSortMode((m) => (m === 'price_desc' ? 'price_asc' : 'price_desc'));

  return (
    <main className="wrap">
      <header className="top">
        <div className="brandRow">
          <h1 className="brand">Zilkara</h1>
          <button className="refresh" onClick={load} aria-label="Rafraîchir">
            ⟳
          </button>
        </div>
        <div className="sub">
          {error ? <span className="err">{error}</span> : <span className="ok">OK</span>}
          <span className="ts">{ts ? `— ${ts}` : ''}</span>
        </div>
      </header>

      <section className="searchBox">
        <div className="search">
          <span className="icon">⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher…"
            aria-label="Rechercher un actif"
          />
        </div>

        <div className="sortBar" role="group" aria-label="Tri">
          <button
            className={`pill ${sortMode.startsWith('score') ? 'active' : ''}`}
            onClick={toggleScore}
            type="button"
            aria-label="Trier par score"
          >
            Score {sortMode === 'score_desc' ? '↓' : sortMode === 'score_asc' ? '↑' : ''}
          </button>

          <span className="sep">|</span>

          <button
            className={`pill ${sortMode.startsWith('price') ? 'active' : ''}`}
            onClick={togglePrice}
            type="button"
            aria-label="Trier par prix"
          >
            Prix {sortMode === 'price_desc' ? '↓' : sortMode === 'price_asc' ? '↑' : ''}
          </button>

          <span className="current">{sortLabel}</span>
        </div>
      </section>

      <section className="contextCard" aria-label="RFS Context">
        <div className="ctxHead">RFS CONTEXT</div>
        <div className="ctxLine">
          <div className="ctxTitle">Confiance</div>
          <div className="ctxValue">{ctxConfidence === null ? '—' : `${ctxConfidence}%`}</div>
        </div>
        <div className="ctxBadgeRow">
          <span className={`badge ${ctxRegime ? ctxRegime.toLowerCase() : ''}`}>
            <span className="dot" /> {ctxRegime || '—'}
          </span>
        </div>
      </section>

      <section className="list" aria-label="Liste des actifs">
        {isLoading ? (
          <>
            {Array.from({ length: MAX_VISIBLE }).map((_, i) => (
              <div className="row skeleton" key={i} />
            ))}
          </>
        ) : visible.length === 0 ? (
          <div className="empty">Aucun résultat.</div>
        ) : (
          visible.map((a) => {
            const href = a.affiliate_url || a.binance_url || '';
            const clickable = Boolean(href);
            const pct = formatPct(a.chg_24h_pct);
            const score = a.confidence_score === null ? '—' : `${Math.round(a.confidence_score)}`;
            const r = regimeLabel(a.regime);
            const sa = getScoreArrow(a);

            return (
              <a
                key={a.id}
                className={`row ${clickable ? 'clickable' : 'disabled'}`}
                href={href || undefined}
                target={href ? '_blank' : undefined}
                rel={href ? 'noreferrer noopener' : undefined}
                aria-label={href ? `Ouvrir ${a.symbol} sur Binance` : `${a.symbol}`}
              >
                <div className="left">
                  <div className="coin">
                    <span className="coinText">{a.symbol.slice(0, 2)}</span>
                  </div>
                  <div className="names">
                    <div className="sym">{a.symbol}</div>
                    <div className="nm">{a.name}</div>
                  </div>
                </div>

                <div className="mid">
                  <div className="price">{formatPriceUSD(a.price)}</div>
                  <div className={`h24 ${pct.sign}`}>{pct.text}</div>
                </div>

                <div className="right">
                  <div className="score">
                    <span className="scoreNum">{score}</span>
                    <span className={`trend ${sa.tone}`}>{sa.arrow}</span>
                  </div>
                  <div className="reg">{r || '—'}</div>
                </div>
              </a>
            );
          })
        )}
      </section>

      <style jsx>{`
        :global(html, body) {
          height: 100%;
        }
        :global(body) {
          margin: 0;
          background: radial-gradient(1200px 800px at 20% 0%, #1a1f2a 0%, #0a0d13 55%, #07090e 100%);
          color: rgba(255, 255, 255, 0.92);
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial,
            'Apple Color Emoji', 'Segoe UI Emoji';
        }

        .wrap {
          max-width: 560px;
          margin: 0 auto;
          padding: 22px 16px 28px;
        }

        .top {
          margin-bottom: 14px;
        }

        .brandRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .brand {
          font-size: 44px;
          letter-spacing: -1.2px;
          margin: 0;
          font-weight: 800;
        }

        .refresh {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.9);
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: transform 120ms ease, background 120ms ease, border 120ms ease;
        }
        .refresh:active {
          transform: scale(0.98);
        }
        .refresh:hover {
          background: rgba(255, 255, 255, 0.09);
          border-color: rgba(255, 255, 255, 0.18);
        }

        .sub {
          margin-top: 6px;
          display: flex;
          gap: 8px;
          align-items: center;
          color: rgba(255, 255, 255, 0.55);
          font-size: 14px;
        }
        .ok {
          color: rgba(255, 255, 255, 0.7);
        }
        .err {
          color: rgba(255, 120, 120, 0.95);
        }
        .ts {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .searchBox {
          margin: 10px 0 14px;
        }

        .search {
          height: 44px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        }
        .icon {
          opacity: 0.55;
        }
        .search input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: rgba(255, 255, 255, 0.9);
          font-size: 16px;
        }
        .search input::placeholder {
          color: rgba(255, 255, 255, 0.38);
        }

        .sortBar {
          margin-top: 10px;
          height: 42px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          padding: 0 10px;
          gap: 10px;
        }
        .pill {
          height: 30px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.86);
          font-size: 14px;
          cursor: pointer;
          transition: background 120ms ease, border 120ms ease;
        }
        .pill:hover {
          background: rgba(255, 255, 255, 0.09);
          border-color: rgba(255, 255, 255, 0.16);
        }
        .pill.active {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.18);
        }
        .sep {
          opacity: 0.35;
        }
        .current {
          margin-left: auto;
          font-size: 13px;
          opacity: 0.5;
        }

        .contextCard {
          margin-top: 10px;
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
          padding: 16px 16px 14px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
        }
        .ctxHead {
          font-size: 12px;
          letter-spacing: 2px;
          opacity: 0.55;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .ctxLine {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
        }
        .ctxTitle {
          font-size: 18px;
          opacity: 0.85;
          font-weight: 650;
        }
        .ctxValue {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.6px;
        }
        .ctxBadgeRow {
          margin-top: 10px;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          height: 34px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.05);
          font-weight: 700;
          letter-spacing: 0.5px;
          font-size: 13px;
          text-transform: uppercase;
          opacity: 0.92;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.35);
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.06);
        }
        .badge.stable .dot {
          background: rgba(120, 255, 160, 0.85);
          box-shadow: 0 0 0 3px rgba(120, 255, 160, 0.10);
        }
        .badge.transition .dot {
          background: rgba(255, 210, 120, 0.9);
          box-shadow: 0 0 0 3px rgba(255, 210, 120, 0.10);
        }
        .badge.volatile .dot {
          background: rgba(255, 120, 120, 0.9);
          box-shadow: 0 0 0 3px rgba(255, 120, 120, 0.10);
        }

        .list {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .row {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.05);
          padding: 14px 14px;
          display: grid;
          grid-template-columns: 1.2fr 1fr 0.7fr;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: inherit;
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.35);
          transition: transform 120ms ease, background 120ms ease, border 120ms ease;
        }

        .row.clickable:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(255, 255, 255, 0.16);
        }
        .row.clickable:active {
          transform: translateY(0px);
        }
        .row.disabled {
          opacity: 0.6;
          cursor: default;
          pointer-events: none;
        }

        .left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .coin {
          width: 44px;
          height: 44px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }
        .coinText {
          font-weight: 900;
          letter-spacing: 0.5px;
          opacity: 0.85;
        }

        .names {
          min-width: 0;
        }
        .sym {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -0.3px;
          line-height: 1.1;
        }
        .nm {
          font-size: 14px;
          opacity: 0.55;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          margin-top: 2px;
        }

        .mid {
          text-align: center;
        }
        .price {
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.6px;
          line-height: 1.1;
        }
        .h24 {
          margin-top: 6px;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.2px;
          opacity: 0.85;
        }
        .h24.pos {
          color: rgba(120, 255, 160, 0.90);
        }
        .h24.neg {
          color: rgba(255, 120, 120, 0.90);
        }
        .h24.neu {
          color: rgba(255, 255, 255, 0.6);
        }

        .right {
          text-align: right;
        }
        .score {
          display: inline-flex;
          align-items: baseline;
          gap: 6px;
          justify-content: flex-end;
        }
        .scoreNum {
          font-size: 34px;
          font-weight: 900;
          letter-spacing: -0.8px;
          line-height: 1;
        }
        .trend {
          font-size: 18px;
          font-weight: 900;
          opacity: 0.95;
        }
        .trend.pos {
          color: rgba(120, 255, 160, 0.92);
        }
        .trend.neg {
          color: rgba(255, 120, 120, 0.92);
        }
        .trend.neu {
          color: rgba(255, 255, 255, 0.45);
        }
        .reg {
          margin-top: 6px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.1px;
          text-transform: uppercase;
          opacity: 0.55;
        }

        .empty {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.04);
          padding: 18px 16px;
          opacity: 0.75;
        }

        .skeleton {
          height: 86px;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.03),
            rgba(255, 255, 255, 0.07),
            rgba(255, 255, 255, 0.03)
          );
          background-size: 220% 100%;
          animation: shimmer 1.2s infinite linear;
        }
        @keyframes shimmer {
          0% {
            background-position: 0% 0%;
          }
          100% {
            background-position: 220% 0%;
          }
        }

        @media (max-width: 390px) {
          .brand {
            font-size: 40px;
          }
          .row {
            grid-template-columns: 1.15fr 0.95fr 0.7fr;
          }
          .scoreNum {
            font-size: 32px;
          }
        }
      `}</style>
    </main>
  );
}
