// app/page.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

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

  market_cap?: number | null;
  volume_24h?: number | null;

  score_delta?: number | null;
  score_trend?: 'up' | 'down' | null;
};

type ScanResponse = {
  ok: boolean;
  ts?: string;
  source?: string;
  market?: string;
  quote?: string;
  count?: number;
  data?: ScanAsset[];
  message?: string | null;
  error?: string;
};

type ContextResponse = {
  ok: boolean;
  ts?: string;
  market_regime?: Regime | null;

  // ✅ IMPORTANT: pas de confidence_global (supprimée)
  stable_ratio?: number | null;
  transition_ratio?: number | null;
  volatile_ratio?: number | null;

  message?: string | null;
  error?: string;
};

type SortMode = 'score_desc' | 'score_asc' | 'price_desc' | 'price_asc';

const DEFAULT_QUOTE = 'USD';
const DEFAULT_MARKET = 'crypto';

const fmtPrice = (n: number | null | undefined, quote: string) => {
  if (n == null || !Number.isFinite(n)) return '—';
  const isSmall = Math.abs(n) < 1 && n !== 0;
  const digits = isSmall ? 6 : n < 100 ? 2 : 0;
  try {
    // "USD" affiché par ton UI comme "$US"
    const suffix = quote === 'USD' ? '$US' : quote;
    const formatted = n.toLocaleString('fr-FR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    return `${formatted} ${suffix}`;
  } catch {
    return `${n} ${quote}`;
  }
};

const fmtPct = (n: number | null | undefined) => {
  if (n == null || !Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  // UI: H24 +0,03% (virgule FR)
  const formatted = n.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${formatted}%`;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const normStr = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const upper = (v: string) => v.toUpperCase();

function regimeLabel(r?: Regime | null) {
  if (!r) return '—';
  const x = upper(String(r));
  if (x === 'STABLE' || x === 'TRANSITION' || x === 'VOLATILE') return x;
  return x;
}

function regimeDotClass(r?: Regime | null) {
  const x = upper(String(r ?? ''));
  if (x === 'STABLE') return 'dot dot-stable';
  if (x === 'TRANSITION') return 'dot dot-transition';
  if (x === 'VOLATILE') return 'dot dot-volatile';
  return 'dot dot-unknown';
}

function safeNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function normalizeAsset(x: ScanAsset): ScanAsset {
  const symbol = normStr(x.symbol || x.id || '');
  const name = normStr(x.name || symbol);

  return {
    id: normStr(x.id || symbol),
    symbol,
    name,

    price: safeNum(x.price),
    chg_24h_pct: safeNum(x.chg_24h_pct),

    confidence_score: safeNum(x.confidence_score),
    regime: x.regime ?? null,

    binance_url: x.binance_url ?? null,
    affiliate_url: x.affiliate_url ?? null,

    market_cap: safeNum(x.market_cap),
    volume_24h: safeNum(x.volume_24h),

    score_delta: safeNum(x.score_delta),
    score_trend: x.score_trend === 'up' || x.score_trend === 'down' ? x.score_trend : null,
  };
}

function sortAssets(list: ScanAsset[], mode: SortMode) {
  const arr = [...list];
  arr.sort((a, b) => {
    const as = a.confidence_score ?? -1;
    const bs = b.confidence_score ?? -1;
    const ap = a.price ?? -1;
    const bp = b.price ?? -1;

    switch (mode) {
      case 'score_asc':
        return as - bs;
      case 'score_desc':
        return bs - as;
      case 'price_asc':
        return ap - bp;
      case 'price_desc':
        return bp - ap;
      default:
        return bs - as;
    }
  });
  return arr;
}

export default function Page() {
  // Data
  const [assets, setAssets] = useState<ScanAsset[]>([]);
  const [context, setContext] = useState<ContextResponse | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('score_desc');

  // Regime filter
  const [regimeFilter, setRegimeFilter] = useState<'ALL' | 'STABLE' | 'TRANSITION' | 'VOLATILE'>('ALL');

  // Mode demandé: exclude (on le supporte nativement)
  const [filterMode, setFilterMode] = useState<'include' | 'exclude'>('exclude');

  // Control
  const abortRef = useRef<AbortController | null>(null);

  async function fetchJSON<T>(path: string, signal: AbortSignal): Promise<T> {
    const res = await fetch(path, {
      method: 'GET',
      signal,
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    // IMPORTANT: gérer Vercel Deployment Protection (401) sans casser l’UI
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      // on évite d’afficher l’HTML brut dans l’UI
      const msg = `HTTP ${res.status}${text ? ' — ' + (text.includes('<html') ? 'Authentication required' : text.slice(0, 120)) : ''}`;
      throw new Error(msg);
    }

    return (await res.json()) as T;
  }

  async function refresh() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    const quote = DEFAULT_QUOTE;
    const market = DEFAULT_MARKET;

    try {
      // Scan + Context
      const [scanRes, ctxRes] = await Promise.allSettled([
        fetchJSON<ScanResponse>(`/api/scan?market=${encodeURIComponent(market)}&quote=${encodeURIComponent(quote)}`, controller.signal),
        fetchJSON<ContextResponse>(`/api/context?market=${encodeURIComponent(market)}&quote=${encodeURIComponent(quote)}`, controller.signal),
      ]);

      // Context
      if (ctxRes.status === 'fulfilled') {
        setContext({
          ok: !!ctxRes.value.ok,
          ts: ctxRes.value.ts,
          market_regime: ctxRes.value.market_regime ?? null,
          stable_ratio: ctxRes.value.stable_ratio ?? null,
          transition_ratio: ctxRes.value.transition_ratio ?? null,
          volatile_ratio: ctxRes.value.volatile_ratio ?? null,
          message: ctxRes.value.message ?? null,
          error: ctxRes.value.error,
        });
      } else {
        // context non-bloquant
        setContext({
          ok: false,
          market_regime: null,
          message: 'context_failed',
          error: ctxRes.reason?.message ?? String(ctxRes.reason ?? 'Unknown error'),
        });
      }

      // Scan
      if (scanRes.status === 'fulfilled') {
        const raw = Array.isArray(scanRes.value.data) ? scanRes.value.data : [];
        const normalized = raw.map(normalizeAsset).filter((x) => x.symbol);
        setAssets(normalized);

        // Si backend renvoie ok:true mais vide, on laisse l’UI afficher “Aucun résultat.”
        if (!scanRes.value.ok && scanRes.value.error) {
          setError(scanRes.value.error);
        }
      } else {
        setAssets([]);
        setError(scanRes.reason?.message ?? String(scanRes.reason ?? 'scan_failed'));
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setAssets([]);
      setError(e?.message ?? 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtering
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = assets;

    // Regime include/exclude
    if (regimeFilter !== 'ALL') {
      list =
        filterMode === 'include'
          ? list.filter((a) => upper(String(a.regime ?? '')) === regimeFilter)
          : list.filter((a) => upper(String(a.regime ?? '')) !== regimeFilter);
    }

    // Search
    if (q) {
      list = list.filter((a) => {
        const s = `${a.symbol ?? ''} ${a.name ?? ''}`.toLowerCase();
        return s.includes(q);
      });
    }

    // Sort
    list = sortAssets(list, sortMode);

    return list;
  }, [assets, query, sortMode, regimeFilter, filterMode]);

  // UI derived
  const ctxRegime = context?.ok ? context?.market_regime ?? null : null;

  return (
    <main className="wrap">
      <div className="hero">
        <div className="title">Zilkara</div>

        <div className="searchRow">
          <div className="search">
            <span className="searchIcon">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              aria-label="Rechercher"
            />
          </div>

          <div className="sortChip">
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              aria-label="Tri"
            >
              <option value="score_desc">Score ↓</option>
              <option value="score_asc">Score ↑</option>
              <option value="price_desc">Prix ↓</option>
              <option value="price_asc">Prix ↑</option>
            </select>
          </div>
        </div>

        {/* RFS CONTEXT (sans score global) */}
        <section className="card contextCard" aria-label="RFS Context">
          <div className="contextTop">
            <div className="contextMeta">
              <div className="contextKicker">RFS CONTEXT</div>
              <div className="contextTitle">Confiance</div>
            </div>

            {/* ✅ Pas de % global */}
            <div className="contextRight" />
          </div>

          <div className="contextBottom">
            <div className="pill">
              <span className={regimeDotClass(ctxRegime)} />
              <span className="pillText">{regimeLabel(ctxRegime)}</span>
            </div>

            <button className="ghostBtn" onClick={refresh} disabled={isLoading}>
              {isLoading ? '…' : 'Rafraîchir'}
            </button>
          </div>
        </section>

        {/* Filters */}
        <div className="filters">
          <div className="seg">
            <button
              className={regimeFilter === 'ALL' ? 'segBtn active' : 'segBtn'}
              onClick={() => setRegimeFilter('ALL')}
            >
              Tous
            </button>
            <button
              className={regimeFilter === 'STABLE' ? 'segBtn active' : 'segBtn'}
              onClick={() => setRegimeFilter('STABLE')}
            >
              Stable
            </button>
            <button
              className={regimeFilter === 'TRANSITION' ? 'segBtn active' : 'segBtn'}
              onClick={() => setRegimeFilter('TRANSITION')}
            >
              Transition
            </button>
            <button
              className={regimeFilter === 'VOLATILE' ? 'segBtn active' : 'segBtn'}
              onClick={() => setRegimeFilter('VOLATILE')}
            >
              Volatile
            </button>
          </div>

          {/* Mode: include / exclude (tu as demandé exclude) */}
          <div className="mode">
            <span className="modeLabel">Mode</span>
            <select value={filterMode} onChange={(e) => setFilterMode(e.target.value as any)}>
              <option value="exclude">exclude</option>
              <option value="include">include</option>
            </select>
          </div>
        </div>

        {/* Error (sans HTML brut) */}
        {error ? (
          <div className="errorBox" role="alert">
            <div className="errorTitle">Erreur</div>
            <div className="errorText">{error}</div>
          </div>
        ) : null}

        {/* List */}
        <section className="list">
          {isLoading ? (
            <div className="empty">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="empty">Aucun résultat.</div>
          ) : (
            filtered.map((a) => (
              <article key={a.id || a.symbol} className="card assetCard">
                <div className="left">
                  <div className="monogram">
                    {(a.symbol ?? '—').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="names">
                    <div className="sym">{(a.symbol ?? '—').toUpperCase()}</div>
                    <div className="nm">{a.name ?? '—'}</div>
                  </div>
                </div>

                <div className="mid">
                  <div className="price">{fmtPrice(a.price ?? null, DEFAULT_QUOTE)}</div>
                  <div className={((a.chg_24h_pct ?? 0) >= 0) ? 'h24 pos' : 'h24 neg'}>
                    H24 {fmtPct(a.chg_24h_pct ?? null)}
                  </div>
                </div>

                <div className="right">
                  <div className="scoreRow">
                    <div className="score">{a.confidence_score ?? '—'}</div>

                    {/* flèche = direction volatilité/score_trend (pas de caractères descriptifs) */}
                    <div
                      className={
                        a.score_trend === 'up' ? 'arrow up' : a.score_trend === 'down' ? 'arrow down' : 'arrow none'
                      }
                      aria-label={a.score_trend ?? 'none'}
                    >
                      {a.score_trend === 'up' ? '↑' : a.score_trend === 'down' ? '↓' : ''}
                    </div>
                  </div>

                  <div className="reg">{regimeLabel(a.regime)}</div>
                </div>

                {/* CTA (optionnel) */}
                {(a.affiliate_url || a.binance_url) ? (
                  <a
                    className="hit"
                    href={a.affiliate_url || a.binance_url || undefined}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Ouvrir ${a.symbol}`}
                  />
                ) : null}
              </article>
            ))
          )}
        </section>
      </div>

      {/* Styles: garantie d’un rendu proche du modèle (glass + cards) */}
      <style jsx>{`
        .wrap {
          min-height: 100vh;
          padding: 28px 18px 64px;
          background: radial-gradient(1200px 700px at 20% 10%, rgba(255,255,255,0.10), transparent 55%),
                      radial-gradient(900px 500px at 70% 30%, rgba(255,255,255,0.08), transparent 60%),
                      #0a0d14;
          color: rgba(255,255,255,0.92);
          display: flex;
          justify-content: center;
        }
        .hero {
          width: 100%;
          max-width: 760px;
        }
        .title {
          font-size: 44px;
          letter-spacing: -0.02em;
          font-weight: 700;
          margin: 6px 0 14px;
        }
        .searchRow {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 14px;
        }
        .search {
          flex: 1;
          position: relative;
        }
        .searchIcon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0.55;
          font-size: 14px;
        }
        .search input {
          width: 100%;
          border-radius: 18px;
          padding: 14px 14px 14px 40px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.92);
          outline: none;
        }
        .search input::placeholder {
          color: rgba(255,255,255,0.45);
        }
        .sortChip select {
          border-radius: 16px;
          padding: 12px 12px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.85);
          outline: none;
        }

        .card {
          position: relative;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.06);
          box-shadow: 0 18px 60px rgba(0,0,0,0.45);
          backdrop-filter: blur(12px);
          overflow: hidden;
        }

        .contextCard {
          padding: 16px;
          margin-bottom: 12px;
        }
        .contextTop {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
        }
        .contextKicker {
          font-size: 12px;
          letter-spacing: 0.16em;
          opacity: 0.55;
          font-weight: 600;
        }
        .contextTitle {
          margin-top: 6px;
          font-size: 18px;
          font-weight: 600;
          opacity: 0.9;
        }
        .contextBottom {
          margin-top: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.10);
        }
        .pillText {
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .ghostBtn {
          border-radius: 999px;
          padding: 10px 12px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.78);
          cursor: pointer;
        }
        .ghostBtn:disabled {
          opacity: 0.5;
          cursor: default;
        }

        .filters {
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: space-between;
          margin: 10px 0 12px;
        }
        .seg {
          display: inline-flex;
          gap: 6px;
          padding: 6px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.05);
        }
        .segBtn {
          border: 0;
          border-radius: 14px;
          padding: 10px 12px;
          background: transparent;
          color: rgba(255,255,255,0.70);
          cursor: pointer;
          font-weight: 600;
        }
        .segBtn.active {
          background: rgba(255,255,255,0.10);
          color: rgba(255,255,255,0.92);
        }
        .mode {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.05);
        }
        .modeLabel {
          opacity: 0.6;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
        }
        .mode select {
          border: 0;
          outline: none;
          background: transparent;
          color: rgba(255,255,255,0.85);
          font-weight: 700;
        }

        .errorBox {
          margin: 10px 0 12px;
          padding: 14px 14px;
          border-radius: 16px;
          border: 1px solid rgba(255,120,120,0.25);
          background: rgba(120,20,20,0.18);
        }
        .errorTitle {
          font-weight: 800;
          margin-bottom: 6px;
        }
        .errorText {
          opacity: 0.9;
          font-size: 13px;
          line-height: 1.35;
          word-break: break-word;
        }

        .list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 10px;
        }
        .empty {
          padding: 18px 6px;
          opacity: 0.7;
        }

        .assetCard {
          padding: 14px;
          display: grid;
          grid-template-columns: 1.2fr 1fr 0.8fr;
          gap: 12px;
          align-items: center;
        }
        .assetCard .hit {
          position: absolute;
          inset: 0;
        }

        .left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .monogram {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.12);
          font-weight: 800;
          letter-spacing: 0.06em;
          opacity: 0.9;
          flex: 0 0 auto;
        }
        .names {
          min-width: 0;
        }
        .sym {
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.02em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .nm {
          font-size: 13px;
          opacity: 0.55;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }

        .mid {
          text-align: center;
        }
        .price {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.01em;
        }
        .h24 {
          margin-top: 4px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .h24.pos {
          color: rgba(120, 255, 160, 0.95);
        }
        .h24.neg {
          color: rgba(255, 120, 120, 0.95);
        }

        .right {
          text-align: right;
          display: grid;
          gap: 6px;
          justify-items: end;
        }
        .scoreRow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .score {
          font-size: 34px;
          font-weight: 900;
          letter-spacing: -0.03em;
        }
        .arrow {
          font-size: 18px;
          font-weight: 900;
          width: 18px;
          text-align: center;
          opacity: 0.9;
        }
        .arrow.up {
          color: rgba(120, 255, 160, 0.95);
        }
        .arrow.down {
          color: rgba(255, 120, 120, 0.95);
        }
        .arrow.none {
          opacity: 0.25;
        }
        .reg {
          font-size: 12px;
          letter-spacing: 0.14em;
          opacity: 0.65;
          font-weight: 800;
        }

        /* Dots */
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          display: inline-block;
          box-shadow: 0 0 0 4px rgba(255,255,255,0.06);
        }
        .dot-stable {
          background: rgba(120,255,160,0.95);
        }
        .dot-transition {
          background: rgba(255,205,120,0.95);
        }
        .dot-volatile {
          background: rgba(255,120,120,0.95);
        }
        .dot-unknown {
          background: rgba(200,200,200,0.7);
        }

        /* Mobile */
        @media (max-width: 560px) {
          .title {
            font-size: 38px;
          }
          .assetCard {
            grid-template-columns: 1fr;
            gap: 10px;
            text-align: left;
          }
          .mid {
            text-align: left;
          }
          .right {
            justify-items: start;
            text-align: left;
          }
          .score {
            font-size: 30px;
          }
        }
      `}</style>
    </main>
  );
}
