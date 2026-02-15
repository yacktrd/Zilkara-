'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type ApiError = { code?: string; message?: string };

type ScanMeta = {
  updatedAt?: number | null;
  count?: number;
  limit?: number;
};

type ScanAsset = {
  asset?: string | null;
  symbol?: string | null;
  name?: string | null;

  price?: number | null;

  chg_24h_pct?: number | null;
  chg_7d_pct?: number | null;
  chg_30d_pct?: number | null;

  stability_score?: number | null; // score principal
  rating?: string | null; // A/B/C...
  regime?: string | null; // STABLE / VOLATILE

  rupture_rate?: number | null;
  similarity?: number | null;
  reason?: string | null;

  // injecté côté API (affiliation Binance)
  binance_url?: string | null;
};

type ScanResponse = {
  ok: boolean;
  ts: number;
  data: ScanAsset[];
  error?: ApiError;
  meta?: ScanMeta;
};

const STORAGE_KEY = 'zilkara_scanner_v2';

function n2(v: number | null | undefined) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function fmtPriceEUR(n: number | null | undefined) {
  const v = n2(n);
  if (v == null) return '—';
  // Affichage adaptatif (petits prix lisibles)
  if (v < 0.01) {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 6 }).format(v) + ' €';
  }
  if (v < 1) {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 4 }).format(v) + ' €';
  }
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(v) + ' €';
}

function fmtPct(n: number | null | undefined) {
  const v = n2(n);
  if (v == null) return '—';
  const sign = v > 0 ? '+' : v < 0 ? '−' : '';
  const abs = Math.abs(v);
  return `${sign}${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(abs)}%`;
}

function fmtInt(n: number | null | undefined) {
  const v = n2(n);
  if (v == null) return '—';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v);
}

function fmtDateTime(ts: number | null | undefined) {
  const v = n2(ts);
  if (v == null) return '—';
  return new Date(v).toLocaleString('fr-FR');
}

function pctColorStyle(n: number | null | undefined): React.CSSProperties {
  const v = n2(n);
  if (v == null || v === 0) return { opacity: 0.9 };
  return v > 0 ? { color: '#1f9d55' } : { color: '#e55353' };
}

function badgeStyle(text: string | null | undefined): React.CSSProperties {
  const t = (text || '').toUpperCase().trim();
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    lineHeight: 1,
    border: '1px solid rgba(255,255,255,.10)',
    background: 'rgba(255,255,255,.06)',
    color: 'rgba(255,255,255,.85)',
    whiteSpace: 'nowrap',
  };

  if (t === 'A') return { ...base, background: 'rgba(31,157,85,.12)', border: '1px solid rgba(31,157,85,.25)', color: '#1f9d55' };
  if (t === 'B') return { ...base, background: 'rgba(255,178,55,.12)', border: '1px solid rgba(255,178,55,.25)', color: '#ffb237' };
  if (t === 'C') return { ...base, background: 'rgba(229,83,83,.12)', border: '1px solid rgba(229,83,83,.25)', color: '#e55353' };

  if (t === 'STABLE') return { ...base, background: 'rgba(99,179,237,.12)', border: '1px solid rgba(99,179,237,.25)', color: '#63b3ed' };
  if (t === 'VOLATILE') return { ...base, background: 'rgba(229,83,83,.10)', border: '1px solid rgba(229,83,83,.22)', color: '#e55353' };

  if (t === 'GOOD') return { ...base, background: 'rgba(31,157,85,.12)', border: '1px solid rgba(31,157,85,.25)', color: '#1f9d55' };
  if (t === 'OK') return { ...base, background: 'rgba(255,178,55,.12)', border: '1px solid rgba(255,178,55,.25)', color: '#ffb237' };
  if (t === 'BAD') return { ...base, background: 'rgba(229,83,83,.12)', border: '1px solid rgba(229,83,83,.25)', color: '#e55353' };

  return base;
}

function normalizeRating(rating: string | null | undefined) {
  const t = (rating || '').toUpperCase().trim();
  if (!t) return null;
  if (['A', 'B', 'C', 'D', 'E'].includes(t)) return t;
  return t;
}

function deriveQualityBadge(a: ScanAsset): 'GOOD' | 'OK' | 'BAD' {
  const score = n2(a.stability_score);
  const r = normalizeRating(a.rating);
  // Simple, stable, lisible (pas de magie)
  if (r === 'A' || (score != null && score >= 75)) return 'GOOD';
  if (r === 'B' || (score != null && score >= 55)) return 'OK';
  return 'BAD';
}

function safeSymbol(a: ScanAsset) {
  return (a.symbol || a.asset || '—').toUpperCase();
}

function safeName(a: ScanAsset) {
  const nm = (a.name || '').trim();
  return nm || safeSymbol(a);
}

function openUrl(url: string) {
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    // ignore
  }
}

function buildBinanceHomeUrl(refCode: string) {
  return `https://www.binance.com/en?ref=${encodeURIComponent(refCode)}`;
}

export default function Page() {
  // UI state (persisté)
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'score_desc' | 'score_asc' | 'chg24_desc' | 'chg24_asc' | 'chg7_desc' | 'chg7_asc' | 'chg30_desc' | 'chg30_asc' | 'name_asc'>('score_desc');
  const [regime, setRegime] = useState<'ALL' | 'STABLE' | 'VOLATILE'>('ALL');
  const [rating, setRating] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  const [limit, setLimit] = useState<50 | 100 | 250>(250);
  const [noStore, setNoStore] = useState(true);

  // auto refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshSec, setRefreshSec] = useState<30 | 60 | 120>(60);

  // data state
  const [loading, setLoading] = useState(true);
  const [res, setRes] = useState<ScanResponse | null>(null);

  // affiliation (fallback hardcodé, + possibilité d’override via env)
  const BINANCE_REF = (process.env.NEXT_PUBLIC_BINANCE_REF_CODE || '1216069378').trim();

  // Restore state from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed.query === 'string') setQuery(parsed.query);
      if (typeof parsed.sort === 'string') setSort(parsed.sort);
      if (typeof parsed.regime === 'string') setRegime(parsed.regime);
      if (typeof parsed.rating === 'string') setRating(parsed.rating);
      if (parsed.limit === 50 || parsed.limit === 100 || parsed.limit === 250) setLimit(parsed.limit);
      if (typeof parsed.noStore === 'boolean') setNoStore(parsed.noStore);
      if (typeof parsed.autoRefresh === 'boolean') setAutoRefresh(parsed.autoRefresh);
      if (parsed.refreshSec === 30 || parsed.refreshSec === 60 || parsed.refreshSec === 120) setRefreshSec(parsed.refreshSec);
    } catch {
      // ignore
    }
  }, []);

  // Persist state
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          query,
          sort,
          regime,
          rating,
          limit,
          noStore,
          autoRefresh,
          refreshSec,
        }),
      );
    } catch {
      // ignore
    }
  }, [query, sort, regime, rating, limit, noStore, autoRefresh, refreshSec]);

  const abortRef = useRef<AbortController | null>(null);

  async function load() {
    setLoading(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const url = `/api/scan?limit=${limit}`;
      const r = await fetch(url, {
        method: 'GET',
        cache: noStore ? 'no-store' : 'default',
        signal: ac.signal,
      });
      const j = (await r.json()) as ScanResponse;
      setRes(j);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setRes({
        ok: false,
        ts: Date.now(),
        data: [],
        error: { code: 'NETWORK', message: 'Erreur réseau / fetch.' },
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, noStore]);

  // Auto refresh timer
  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      load();
    }, refreshSec * 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshSec, limit, noStore]);

  const filtered = useMemo(() => {
    const list = res?.data || [];

    const q = query.trim().toLowerCase();
    const withQ = q
      ? list.filter((a) => {
          const sym = safeSymbol(a).toLowerCase();
          const nm = (a.name || '').toLowerCase();
          return sym.includes(q) || nm.includes(q);
        })
      : list;

    const withRegime =
      regime === 'ALL'
        ? withQ
        : withQ.filter((a) => ((a.regime || '').toUpperCase().trim() || '') === regime);

    const withRating =
      rating === 'ALL'
        ? withRegime
        : withRegime.filter((a) => (normalizeRating(a.rating) || '') === rating);

    const sorted = [...withRating].sort((a, b) => {
      const scoreA = n2(a.stability_score) ?? -1;
      const scoreB = n2(b.stability_score) ?? -1;

      const c24A = n2(a.chg_24h_pct) ?? -9999;
      const c24B = n2(b.chg_24h_pct) ?? -9999;

      const c7A = n2(a.chg_7d_pct) ?? -9999;
      const c7B = n2(b.chg_7d_pct) ?? -9999;

      const c30A = n2(a.chg_30d_pct) ?? -9999;
      const c30B = n2(b.chg_30d_pct) ?? -9999;

      switch (sort) {
        case 'score_desc':
          return scoreB - scoreA;
        case 'score_asc':
          return scoreA - scoreB;
        case 'chg24_desc':
          return c24B - c24A;
        case 'chg24_asc':
          return c24A - c24B;
        case 'chg7_desc':
          return c7B - c7A;
        case 'chg7_asc':
          return c7A - c7B;
        case 'chg30_desc':
          return c30B - c30A;
        case 'chg30_asc':
          return c30A - c30B;
        case 'name_asc':
          return safeSymbol(a).localeCompare(safeSymbol(b));
        default:
          return scoreB - scoreA;
      }
    });

    return sorted;
  }, [res, query, regime, rating, sort]);

  const apiBadge = useMemo(() => {
    if (!res) return { text: 'API — …', ok: false };
    if (!res.ok) return { text: `API — ERROR`, ok: false };
    return { text: `API ${new Date(res.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, ok: true };
  }, [res]);

  const headerStyle: React.CSSProperties = {
    minHeight: '100vh',
    padding: '28px 16px 60px',
    color: 'rgba(255,255,255,.92)',
    background:
      'radial-gradient(1200px 600px at 20% 0%, rgba(99,179,237,.12), transparent 55%), radial-gradient(900px 500px at 80% 10%, rgba(122,92,255,.10), transparent 55%), linear-gradient(180deg, #0b1220 0%, #070b12 100%)',
  };

  const container: React.CSSProperties = {
    maxWidth: 980,
    margin: '0 auto',
  };

  const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,.06)',
    border: '1px solid rgba(255,255,255,.10)',
    borderRadius: 18,
    padding: 14,
    backdropFilter: 'blur(10px)',
  };

  const row: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' };

  const btn: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,.12)',
    background: 'rgba(255,255,255,.06)',
    color: 'rgba(255,255,255,.92)',
    cursor: 'pointer',
    fontSize: 14,
  };

  const btnPrimary: React.CSSProperties = {
    ...btn,
    background: 'rgba(122,92,255,.18)',
    border: '1px solid rgba(122,92,255,.28)',
  };

  const input: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,.12)',
    background: 'rgba(0,0,0,.18)',
    color: 'rgba(255,255,255,.92)',
    outline: 'none',
    fontSize: 14,
  };

  const select: React.CSSProperties = {
    ...input,
    paddingRight: 38,
  };

  const grid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
    gap: 12,
    marginTop: 14,
  };

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,.06)',
    border: '1px solid rgba(255,255,255,.10)',
    borderRadius: 18,
    padding: 14,
    backdropFilter: 'blur(10px)',
  };

  const kv: React.CSSProperties = {
    background: 'rgba(0,0,0,.18)',
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: 14,
    padding: 12,
    minHeight: 54,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  };

  return (
    <main style={headerStyle}>
      <div style={container}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>Zilkara</div>
            <div style={{ marginTop: 4, opacity: 0.82 }}>Market Scanner — EUR</div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ ...badgeStyle('MVP') }}>MVP</span>
            <span style={{ ...badgeStyle(res?.ok ? 'GOOD' : 'BAD') }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  display: 'inline-block',
                  marginRight: 8,
                  background: res?.ok ? '#1f9d55' : '#e55353',
                  boxShadow: res?.ok ? '0 0 10px rgba(31,157,85,.45)' : '0 0 10px rgba(229,83,83,.45)',
                }}
              />
              {apiBadge.text}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ ...glass, marginTop: 16 }}>
          <div style={{ ...row, justifyContent: 'space-between' }}>
            <div style={{ opacity: 0.85, fontSize: 14 }}>
              Source: <b>CoinGecko</b> • VS: <b>EUR</b>
              {res?.meta?.count != null ? (
                <>
                  {' '}
                  • Actifs: <b>{res.meta.count}</b>
                </>
              ) : null}
            </div>

            <div style={{ ...row }}>
              <button style={btnPrimary} onClick={() => openUrl(buildBinanceHomeUrl(BINANCE_REF))}>
                Ouvrir Binance
              </button>
              <button style={btn} onClick={() => load()} disabled={loading}>
                {loading ? 'Refresh…' : 'Refresh'}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
            Cache navigateur: <b>{noStore ? 'désactivé (no-store)' : 'activé (default)'}</b>
          </div>

          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(1, minmax(0, 1fr))', gap: 10 }}>
            {/* Search */}
            <div>
              <input
                style={input}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search (BTC, ETH...)"
                inputMode="search"
              />
            </div>

            {/* Selects row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <select style={select} value={sort} onChange={(e) => setSort(e.target.value as any)}>
                <option value="score_desc">Score Desc</option>
                <option value="score_asc">Score Asc</option>
                <option value="chg24_desc">24h Desc</option>
                <option value="chg24_asc">24h Asc</option>
                <option value="chg7_desc">7d Desc</option>
                <option value="chg7_asc">7d Asc</option>
                <option value="chg30_desc">30d Desc</option>
                <option value="chg30_asc">30d Asc</option>
                <option value="name_asc">Name A→Z</option>
              </select>

              <select style={select} value={regime} onChange={(e) => setRegime(e.target.value as any)}>
                <option value="ALL">All</option>
                <option value="STABLE">STABLE</option>
                <option value="VOLATILE">VOLATILE</option>
              </select>
            </div>

            {/* Selects row 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <select style={select} value={rating} onChange={(e) => setRating(e.target.value as any)}>
                <option value="ALL">Rating: All</option>
                <option value="A">Rating: A</option>
                <option value="B">Rating: B</option>
                <option value="C">Rating: C</option>
              </select>

              <select style={select} value={limit} onChange={(e) => setLimit(Number(e.target.value) as any)}>
                <option value={50}>Top 50</option>
                <option value={100}>Top 100</option>
                <option value={250}>Top 250</option>
              </select>
            </div>

            {/* Toggles */}
            <div style={{ ...row, justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={noStore} onChange={(e) => setNoStore(e.target.checked)} />
                <span style={{ opacity: 0.9, fontSize: 14 }}>Désactiver cache navigateur</span>
              </label>

              <div style={{ ...row }}>
                <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
                  <span style={{ opacity: 0.9, fontSize: 14 }}>Auto-refresh</span>
                </label>

                <select
                  style={{ ...select, width: 150 }}
                  value={refreshSec}
                  onChange={(e) => setRefreshSec(Number(e.target.value) as any)}
                  disabled={!autoRefresh}
                >
                  <option value={30}>30s</option>
                  <option value={60}>60s</option>
                  <option value={120}>120s</option>
                </select>
              </div>
            </div>

            <div style={{ opacity: 0.75, fontSize: 12 }}>
              Tip: <b>Cmd + Shift + R</b> (desktop) pour vider le cache. • Affiliation Binance: <b>{BINANCE_REF}</b>
            </div>
          </div>
        </div>

        {/* Error banner */}
        {!loading && res && !res.ok ? (
          <div style={{ marginTop: 14, ...glass, borderColor: 'rgba(229,83,83,.35)' }}>
            <div style={{ fontWeight: 700, color: '#e55353' }}>
              Erreur: {(res.error?.code || 'ERROR').toString()}
            </div>
            <div style={{ marginTop: 6, opacity: 0.9 }}>{res.error?.message || 'Une erreur est survenue.'}</div>
          </div>
        ) : null}

        {/* Results header */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ opacity: 0.9 }}>
            <b>{res?.ok ? 'OK' : '—'}</b> — <b>{filtered.length}</b> actifs
            {query.trim() ? (
              <>
                {' '}
                • filtre: <b>{query.trim()}</b>
              </>
            ) : null}
          </div>
          <div style={{ opacity: 0.75, fontSize: 13 }}>
            Timestamp: <b>{fmtDateTime(res?.meta?.updatedAt ?? res?.ts ?? null)}</b>
          </div>
        </div>

        {/* Cards grid */}
        <div
          style={{
            ...grid,
          }}
        >
          {filtered.map((a, idx) => {
            const sym = safeSymbol(a);
            const nm = safeName(a);
            const score = n2(a.stability_score);
            const qBadge = deriveQualityBadge(a);
            const rt = normalizeRating(a.rating);
            const rg = (a.regime || '').toUpperCase().trim() || null;

            return (
              <div key={`${sym}-${idx}`} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.4 }}>{sym}</div>
                    <div style={{ opacity: 0.78 }}>{nm}</div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span style={badgeStyle(qBadge)}>{qBadge}</span>
                    {rt ? <span style={badgeStyle(rt)}>{rt}</span> : null}
                    {rg ? <span style={badgeStyle(rg)}>{rg}</span> : null}
                  </div>
                </div>

                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                  <div style={kv}>
                    <div style={{ fontSize: 12, opacity: 0.7, letterSpacing: 0.6 }}>PRICE</div>
                    <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{fmtPriceEUR(a.price)}</div>
                  </div>

                  <div style={kv}>
                    <div style={{ fontSize: 12, opacity: 0.7, letterSpacing: 0.6 }}>SCORE</div>
                    <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{score == null ? '—' : fmtInt(score)}</div>
                  </div>

                  <div style={kv}>
                    <div style={{ fontSize: 12, opacity: 0.7, letterSpacing: 0.6 }}>24H</div>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6, ...pctColorStyle(a.chg_24h_pct) }}>{fmtPct(a.chg_24h_pct)}</div>
                  </div>

                  <div style={kv}>
                    <div style={{ fontSize: 12, opacity: 0.7, letterSpacing: 0.6 }}>7D</div>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6, ...pctColorStyle(a.chg_7d_pct) }}>{fmtPct(a.chg_7d_pct)}</div>
                  </div>

                  <div style={kv}>
                    <div style={{ fontSize: 12, opacity: 0.7, letterSpacing: 0.6 }}>30D</div>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6, ...pctColorStyle(a.chg_30d_pct) }}>{fmtPct(a.chg_30d_pct)}</div>
                  </div>

                  <div style={kv}>
                    <div style={{ fontSize: 12, opacity: 0.7, letterSpacing: 0.6 }}>RUPTURES</div>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{fmtInt(a.rupture_rate)}</div>
                  </div>
                </div>

                {a.reason ? (
                  <div style={{ marginTop: 10, opacity: 0.78, fontSize: 13, lineHeight: 1.35 }}>
                    {a.reason}
                  </div>
                ) : null}

                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                  <button
                    style={btnPrimary}
                    onClick={() => {
                      // “Trade” = vers la paire spot (si on a binance_url injecté). Sinon fallback Binance home.
                      const u = (a.binance_url || '').trim();
                      openUrl(u ? u : buildBinanceHomeUrl(BINANCE_REF));
                    }}
                  >
                    Trade
                  </button>

                  <button
                    style={btn}
                    onClick={() => {
                      const u = (a.binance_url || '').trim();
                      openUrl(u ? u : buildBinanceHomeUrl(BINANCE_REF));
                    }}
                  >
                    Binance
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer meta */}
        <div style={{ marginTop: 16, opacity: 0.7, fontSize: 12 }}>
          {res?.meta?.limit != null ? (
            <>
              API meta — limit: <b>{res.meta.limit}</b>
              {res.meta.count != null ? (
                <>
                  {' '}
                  • count: <b>{res.meta.count}</b>
                </>
              ) : null}
              {res.meta.updatedAt ? (
                <>
                  {' '}
                  • updatedAt: <b>{fmtDateTime(res.meta.updatedAt)}</b>
                </>
              ) : null}
            </>
          ) : (
            <>API meta — —</>
          )}
        </div>
      </div>

      {/* Responsive tweak (simple, sans dépendance CSS) */}
      <style jsx global>{`
        @media (min-width: 720px) {
          main div[style*='grid-template-columns: repeat(1'] {
            /* no-op (kept safe) */
          }
        }
      `}</style>

      <style jsx>{`
        @media (min-width: 720px) {
          div.__grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (min-width: 980px) {
          div.__grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
      `}</style>

      {/* Hack propre: on applique des classes sans dépendre de Tailwind */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              try {
                // Ajout de classes à la grille après render (sans casser TSX)
                const observer = new MutationObserver(function(){
                  const grids = document.querySelectorAll('div[style*="grid-template-columns: repeat(1"]');
                  grids.forEach(g=>{
                    if(!g.classList.contains('__grid')) g.classList.add('__grid');
                  });
                });
                observer.observe(document.documentElement, { childList:true, subtree:true });
              } catch(e){}
            })();
          `,
        }}
      />
    </main>
  );
}
