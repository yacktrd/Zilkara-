k'use client';

import React, { useEffect, useMemo, useState } from 'react';

type ApiError = { code?: string; message?: string };
type ScanMeta = { updatedAt?: number | null; count?: number; limit?: number };

type ScanAsset = {
  asset?: string | null;
  symbol?: string | null;
  name?: string | null;

  price?: number | null;

  chg_24h_pct?: number | null;
  chg_7d_pct?: number | null;
  chg_30d_pct?: number | null;

  stability_score?: number | null;
  rating?: string | null;
  regime?: string | null;

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

// ---------- format helpers ----------
function fmtPrice(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n);
}

function fmtPct(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n)}%`;
}

function fmtInt(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
}

function fmtDateTime(ts?: number | null) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('fr-FR');
  } catch {
    return '—';
  }
}

function pctStyle(n: number | null | undefined): React.CSSProperties {
  if (n == null || Number.isNaN(n) || n === 0) return { opacity: 0.9 };
  return n > 0 ? { color: '#1f9d55' } : { color: '#e55353' };
}

function badgeStyle(text: string | null | undefined): React.CSSProperties {
  const t = (text ?? '').toUpperCase();
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    letterSpacing: 0.4,
    border: '1px solid rgba(255,255,255,.12)',
    background: 'rgba(255,255,255,.06)',
    color: 'rgba(255,255,255,.85)',
    whiteSpace: 'nowrap',
  };

  if (t === 'A') return { ...base, border: '1px solid rgba(31,157,85,.35)', background: 'rgba(31,157,85,.12)', color: '#b7f7d1' };
  if (t === 'B') return { ...base, border: '1px solid rgba(255,178,55,.35)', background: 'rgba(255,178,55,.12)', color: '#ffd9a3' };
  if (t === 'C') return { ...base, border: '1px solid rgba(229,83,83,.35)', background: 'rgba(229,83,83,.12)', color: '#ffc1c1' };

  if (t === 'STABLE') return { ...base, border: '1px solid rgba(99,179,237,.35)', background: 'rgba(99,179,237,.12)', color: '#cfe7ff' };
  if (t === 'VOLATILE') return { ...base, border: '1px solid rgba(229,83,83,.35)', background: 'rgba(229,83,83,.12)', color: '#ffc1c1' };

  return base;
}

// ---------- UI ----------
type SortKey = 'score_desc' | 'score_asc' | 'price_desc' | 'price_asc';

const STORAGE_KEY = 'zilkara_settings_v1';

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [res, setRes] = useState<ScanResponse | null>(null);

  // Scanner settings (restaurent l'expérience complète)
  const [limit, setLimit] = useState<number>(250);
  const [search, setSearch] = useState<string>('');
  const [sort, setSort] = useState<SortKey>('score_desc');
  const [ratingFilter, setRatingFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  const [regimeFilter, setRegimeFilter] = useState<'ALL' | 'STABLE' | 'VOLATILE'>('ALL');

  // Indicateur “cache navigateur désactivé” (tu l’affichais avant)
  const [browserCacheDisabled, setBrowserCacheDisabled] = useState<boolean>(true);

  // 1) Restore local settings (évite de “perdre les paramètres d’avant”)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const s = JSON.parse(saved);

      if (typeof s.limit === 'number') setLimit(s.limit);
      if (typeof s.search === 'string') setSearch(s.search);
      if (typeof s.sort === 'string') setSort(s.sort as SortKey);
      if (typeof s.ratingFilter === 'string') setRatingFilter(s.ratingFilter);
      if (typeof s.regimeFilter === 'string') setRegimeFilter(s.regimeFilter);
    } catch {
      // ignore
    }
  }, []);

  // 2) Persist local settings
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ limit, search, sort, ratingFilter, regimeFilter })
      );
    } catch {
      // ignore
    }
  }, [limit, search, sort, ratingFilter, regimeFilter]);

  // 3) Load data
  async function load() {
    setLoading(true);
    try {
      // UI: désactive cache navigateur
      // (le backend a déjà son cache CDN/Redis)
      const r = await fetch(`/api/scan?limit=${encodeURIComponent(String(limit))}`, {
        cache: 'no-store',
      });
      const j = (await r.json()) as ScanResponse;
      setRes(j);
      setBrowserCacheDisabled(true);
    } catch (e: any) {
      setRes({
        ok: false,
        ts: Date.now(),
        data: [],
        error: { code: 'NETWORK', message: 'Network error' },
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // recharge à chaque changement de limit (top 50/100/250)
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  // 4) Filtering + sorting (client)
  const data = useMemo(() => {
    let list = res?.data ?? [];

    // search (symbol / asset / name)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((x) => {
        const sym = (x.symbol ?? x.asset ?? '').toLowerCase();
        const nm = (x.name ?? '').toLowerCase();
        return sym.includes(q) || nm.includes(q);
      });
    }

    if (ratingFilter !== 'ALL') {
      list = list.filter((x) => (x.rating ?? '').toUpperCase() === ratingFilter);
    }

    if (regimeFilter !== 'ALL') {
      list = list.filter((x) => (x.regime ?? '').toUpperCase() === regimeFilter);
    }

    const sorted = [...list].sort((a, b) => {
      const ascore = a.stability_score ?? -1;
      const bscore = b.stability_score ?? -1;

      const ap = a.price ?? 0;
      const bp = b.price ?? 0;

      switch (sort) {
        case 'score_desc':
          return bscore - ascore;
        case 'score_asc':
          return ascore - bscore;
        case 'price_desc':
          return bp - ap;
        case 'price_asc':
          return ap - bp;
        default:
          return 0;
      }
    });

    return sorted;
  }, [res, search, ratingFilter, regimeFilter, sort]);

  const ok = res?.ok ?? false;
  const apiTs = res?.ts ?? Date.now();
  const updatedAt = res?.meta?.updatedAt ?? null;

  // Binance buttons
  function openBinance(url?: string | null) {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={styles.titleRow}>
              <div style={styles.title}>Zilkara</div>
              <div style={styles.subtitle}>Market Scanner</div>
            </div>
            <div style={styles.pillsRow}>
              <span style={styles.pillMuted}>MVP</span>
              <span style={styles.pillApi}>
                <span style={styles.dot(ok ? 'ok' : 'ko')} />
                API {fmtDateTime(apiTs).slice(11, 16)}
              </span>
            </div>
          </div>
        </header>

        <section style={styles.panel}>
          <div style={styles.panelTop}>
            <div style={styles.panelLine}>
              <span style={styles.muted}>Source:</span> CoinGecko <span style={styles.muted}>•</span>{' '}
              <span style={styles.muted}>VS:</span> EUR
            </div>
            <div style={styles.panelLine}>
              <span style={styles.muted}>Cache navigateur:</span>{' '}
              {browserCacheDisabled ? 'désactivé' : 'actif'}
            </div>
          </div>

          <div style={styles.actions}>
            <button
              style={styles.btnPrimary}
              onClick={() => {
                // Ouvre Binance sur BTC par défaut si présent, sinon première ligne
                const u = res?.data?.[0]?.binance_url ?? null;
                if (u) openBinance(u);
              }}
              disabled={!res?.data?.length}
            >
              Ouvrir Binance
            </button>
            <button style={styles.btn} onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          <div style={styles.filters}>
            <input
              style={styles.input}
              placeholder="Search (BTC, ETH...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select style={styles.select} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="score_desc">Score Desc</option>
              <option value="score_asc">Score Asc</option>
              <option value="price_desc">Price Desc</option>
              <option value="price_asc">Price Asc</option>
            </select>

            <select
              style={styles.select}
              value={regimeFilter}
              onChange={(e) => setRegimeFilter(e.target.value as any)}
            >
              <option value="ALL">All</option>
              <option value="STABLE">STABLE</option>
              <option value="VOLATILE">VOLATILE</option>
            </select>

            <select
              style={styles.select}
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value as any)}
            >
              <option value="ALL">All</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>

            <select style={styles.select} value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
              <option value={250}>Top 250</option>
            </select>
          </div>
        </section>

        {/* Error banner */}
        {!ok && res?.error && (
          <section style={styles.errorBox}>
            <div style={styles.errorTitle}>
              Erreur: {res.error.code ?? 'ERROR'} — {res.error.message ?? 'Unknown error'}
            </div>
            <div style={styles.errorMeta}>Timestamp: {fmtDateTime(apiTs)}</div>
          </section>
        )}

        {/* Data table */}
        <section style={styles.tableWrap}>
          <div style={styles.tableHeaderRow}>
            <div style={styles.th('asset')}>Asset</div>
            <div style={styles.th('price')}>Price</div>
            <div style={styles.th('pct')}>24h</div>
            <div style={styles.th('pct')}>7d</div>
            <div style={styles.th('pct')}>30d</div>
            <div style={styles.th('score')}>Score</div>
            <div style={styles.th('badge')}>Rating</div>
            <div style={styles.th('badge')}>Régime</div>
            <div style={styles.th('actions')}></div>
          </div>

          <div style={styles.rows}>
            {data.length === 0 ? (
              <div style={styles.empty}>
                {loading ? 'Loading…' : ok ? 'No assets' : 'No data'}
              </div>
            ) : (
              data.map((a, idx) => {
                const sym = (a.symbol ?? a.asset ?? '—').toUpperCase();
                return (
                  <div key={`${sym}-${idx}`} style={styles.row}>
                    <div style={styles.td('asset')}>
                      <div style={styles.assetTop}>
                        <span style={styles.assetSymbol}>{sym}</span>
                        {a.name ? <span style={styles.assetName}>{a.name}</span> : null}
                      </div>
                      {a.reason ? (
                        <div style={styles.assetReason} title={a.reason}>
                          {a.reason}
                        </div>
                      ) : null}
                    </div>

                    <div style={styles.td('price')}>{fmtPrice(a.price)}</div>

                    <div style={{ ...styles.td('pct'), ...pctStyle(a.chg_24h_pct) }}>{fmtPct(a.chg_24h_pct)}</div>
                    <div style={{ ...styles.td('pct'), ...pctStyle(a.chg_7d_pct) }}>{fmtPct(a.chg_7d_pct)}</div>
                    <div style={{ ...styles.td('pct'), ...pctStyle(a.chg_30d_pct) }}>{fmtPct(a.chg_30d_pct)}</div>

                    <div style={styles.td('score')}>{fmtInt(a.stability_score)}</div>

                    <div style={styles.td('badge')}>
                      <span style={badgeStyle(a.rating)}>{(a.rating ?? '—').toString().toUpperCase()}</span>
                    </div>

                    <div style={styles.td('badge')}>
                      <span style={badgeStyle(a.regime)}>{(a.regime ?? '—').toString().toUpperCase()}</span>
                    </div>

                    <div style={styles.td('actions')}>
                      <button
                        style={styles.btnMini}
                        onClick={() => openBinance(a.binance_url)}
                        disabled={!a.binance_url}
                        title={a.binance_url ? 'Open Binance' : 'No Binance URL'}
                      >
                        Binance
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <footer style={styles.footer}>
          <div style={styles.footerLine}>
            Tip: Cmd + Shift + R pour vider le cache
          </div>
          <div style={styles.footerLine}>
            Dernière mise à jour: {fmtDateTime(updatedAt)}
            {res?.meta?.count != null ? ` • count: ${res.meta.count}` : ''}
            {res?.meta?.limit != null ? ` • limit: ${res.meta.limit}` : ''}
          </div>
        </footer>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(1200px 600px at 20% 0%, rgba(80,110,255,.18), transparent 60%), #0b1020',
    color: 'rgba(255,255,255,.92)',
    display: 'flex',
    justifyContent: 'center',
    padding: '26px 14px 40px',
  } as React.CSSProperties,

  shell: {
    width: '100%',
    maxWidth: 980,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  } as React.CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  } as React.CSSProperties,

  titleRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 14,
  } as React.CSSProperties,

  title: {
    fontSize: 44,
    fontWeight: 700,
    letterSpacing: -0.6,
  } as React.CSSProperties,

  subtitle: {
    fontSize: 18,
    opacity: 0.7,
  } as React.CSSProperties,

  pillsRow: {
    display: 'flex',
    gap: 10,
    marginTop: 8,
  } as React.CSSProperties,

  pillMuted: {
    padding: '8px 12px',
    borderRadius: 999,
    background: 'rgba(255,255,255,.06)',
    border: '1px solid rgba(255,255,255,.10)',
    fontSize: 13,
    opacity: 0.85,
  } as React.CSSProperties,

  pillApi: {
    padding: '8px 12px',
    borderRadius: 999,
    background: 'rgba(255,255,255,.06)',
    border: '1px solid rgba(255,255,255,.10)',
    fontSize: 13,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  } as React.CSSProperties,

  dot: (state: 'ok' | 'ko') =>
    ({
      width: 10,
      height: 10,
      borderRadius: 999,
      background: state === 'ok' ? '#1f9d55' : '#e55353',
      boxShadow: state === 'ok' ? '0 0 10px rgba(31,157,85,.5)' : '0 0 10px rgba(229,83,83,.5)',
    } as React.CSSProperties),

  panel: {
    borderRadius: 18,
    padding: 16,
    background: 'rgba(255,255,255,.05)',
    border: '1px solid rgba(255,255,255,.10)',
    backdropFilter: 'blur(10px)',
  } as React.CSSProperties,

  panelTop: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 14,
  } as React.CSSProperties,

  panelLine: {
    fontSize: 14,
    opacity: 0.9,
  } as React.CSSProperties,

  muted: { opacity: 0.7 } as React.CSSProperties,

  actions: {
    display: 'flex',
    gap: 10,
    marginBottom: 12,
  } as React.CSSProperties,

  btnPrimary: {
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px solid rgba(80,110,255,.35)',
    background: 'rgba(80,110,255,.22)',
    color: 'rgba(255,255,255,.92)',
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,

  btn: {
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,.14)',
    background: 'rgba(255,255,255,.06)',
    color: 'rgba(255,255,255,.92)',
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,

  btnMini: {
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,.14)',
    background: 'rgba(255,255,255,.06)',
    color: 'rgba(255,255,255,.92)',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  } as React.CSSProperties,

  filters: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
    gap: 10,
  } as React.CSSProperties,

  input: {
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,.12)',
    background: 'rgba(0,0,0,.18)',
    color: 'rgba(255,255,255,.92)',
    outline: 'none',
  } as React.CSSProperties,

  select: {
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,.12)',
    background: 'rgba(0,0,0,.18)',
    color: 'rgba(255,255,255,.92)',
    outline: 'none',
  } as React.CSSProperties,

  errorBox: {
    borderRadius: 16,
    padding: 14,
    background: 'rgba(229,83,83,.10)',
    border: '1px solid rgba(229,83,83,.28)',
  } as React.CSSProperties,

  errorTitle: {
    fontWeight: 700,
    marginBottom: 6,
  } as React.CSSProperties,

  errorMeta: {
    opacity: 0.85,
    fontSize: 13,
  } as React.CSSProperties,

  tableWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,.10)',
    background: 'rgba(255,255,255,.03)',
  } as React.CSSProperties,

  tableHeaderRow: {
    display: 'grid',
    gridTemplateColumns: '2.2fr 1.1fr .8fr .8fr .9fr .8fr .8fr .9fr 1fr',
    gap: 0,
    padding: '12px 14px',
    borderBottom: '1px solid rgba(255,255,255,.10)',
    background: 'rgba(255,255,255,.04)',
    fontSize: 13,
    letterSpacing: 0.4,
    opacity: 0.85,
  } as React.CSSProperties,

  th: (k: string) =>
    ({
      textTransform: 'none',
      fontWeight: 700,
      opacity: 0.85,
    } as React.CSSProperties),

  rows: {
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,

  row: {
    display: 'grid',
    gridTemplateColumns: '2.2fr 1.1fr .8fr .8fr .9fr .8fr .8fr .9fr 1fr',
    padding: '12px 14px',
    borderBottom: '1px solid rgba(255,255,255,.06)',
    alignItems: 'center',
    gap: 0,
  } as React.CSSProperties,

  td: (k: string) =>
    ({
      fontSize: 14,
    } as React.CSSProperties),

  assetTop: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 4,
  } as React.CSSProperties,

  assetSymbol: { fontWeight: 800, letterSpacing: 0.3 } as React.CSSProperties,
  assetName: { opacity: 0.7, fontSize: 13 } as React.CSSProperties,

  assetReason: {
    opacity: 0.62,
    fontSize: 12,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  } as React.CSSProperties,

  empty: {
    padding: 18,
    opacity: 0.75,
    textAlign: 'center',
  } as React.CSSProperties,

  footer: {
    marginTop: 6,
    opacity: 0.75,
    fontSize: 13,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '0 2px',
  } as React.CSSProperties,

  footerLine: {} as React.CSSProperties,
} as const;
