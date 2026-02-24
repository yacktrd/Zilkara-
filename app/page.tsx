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
  confidence_global?: number | null; // 0..100
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

function regimeLabel(regime: Regime | null): 'STABLE' | 'TRANSITION' | 'VOLATILE' | '—' {
  if (!regime) return '—';
  const r = String(regime).toUpperCase();
  if (r === 'STABLE' || r === 'TRANSITION' || r === 'VOLATILE') return r;
  return '—';
}

function pickTradeUrl(a: ScanAsset): string | null {
  // IMPORTANT: ne jamais reconstruire. On prend celui donné par l’API.
  return safeString(a.affiliate_url) ?? safeString(a.binance_url) ?? null;
}

function getRegimeKind(r: ReturnType<typeof regimeLabel>): 'stable' | 'transition' | 'volatile' | 'neutral' {
  if (r === 'STABLE') return 'stable';
  if (r === 'TRANSITION') return 'transition';
  if (r === 'VOLATILE') return 'volatile';
  return 'neutral';
}

function dotStyle(kind: 'stable' | 'transition' | 'volatile' | 'neutral') {
  const base: React.CSSProperties = {
    width: 10,
    height: 10,
    borderRadius: 99,
    background: 'rgba(0,0,0,0.22)',
    display: 'inline-block',
  };
  // (sans couleur explicite — tu pourras typer en CSS global plus tard)
  return base;
}

function pillStyle(): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 900,
    border: '1px solid rgba(0,0,0,0.10)',
    background: 'rgba(0,0,0,0.03)',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  };
}

function SkeletonCard() {
  const box: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: 22,
    background: 'rgba(0,0,0,0.03)',
    padding: 16,
    minHeight: 128,
  };

  const bar = (w: number): React.CSSProperties => ({
    height: 12,
    width: `${w}%`,
    borderRadius: 999,
    background: 'rgba(0,0,0,0.08)',
  });

  return (
    <div style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(0,0,0,0.08)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 180 }}>
            <div style={bar(40)} />
            <div style={bar(65)} />
          </div>
        </div>
        <div style={{ width: 56, height: 28, borderRadius: 12, background: 'rgba(0,0,0,0.08)' }} />
      </div>
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={bar(32)} />
        <div style={bar(28)} />
      </div>
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ width: 110, height: 34, borderRadius: 999, background: 'rgba(0,0,0,0.08)' }} />
        <div style={{ width: 140, height: 40, borderRadius: 16, background: 'rgba(0,0,0,0.08)' }} />
      </div>
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        border: '1px solid rgba(0,0,0,0.10)',
        background: 'rgba(0,0,0,0.03)',
        borderRadius: 16,
        padding: 4,
        gap: 4,
        overflow: 'hidden',
      }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 14,
              border: 'none',
              background: active ? 'white' : 'transparent',
              fontWeight: 950,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function Page() {
  // ✅ Interface identique mobile/desktop : une colonne, centrée
  // ✅ UI minimal (lecture): sort + discipline + (optionnel) filtres visuels
  const [sort, setSort] = useState<string>('confidence_score_desc');
  const [discipline, setDiscipline] = useState<boolean>(false);

  // filtres VISUELS (zéro logique métier)
  const [minScore, setMinScore] = useState<number>(0);
  const [regimeFilter, setRegimeFilter] = useState<'ALL' | 'STABLE' | 'TRANSITION' | 'VOLATILE'>('ALL');

  // backend safety (non affiché)
  const LIMIT_BACKEND = 250;

  const [assets, setAssets] = useState<ScanAsset[]>([]);
  const [context, setContext] = useState<ContextResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const lastUpdated = useMemo(() => safeString(context?.ts) ?? null, [context]);

  const buildScanUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set('limit', String(LIMIT_BACKEND));
    params.set('sort', sort);
    if (discipline) params.set('discipline', '1');
    return `/api/scan?${params.toString()}`;
  }, [sort, discipline]);

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

  // ✅ Filtrage purement visuel (aucune logique métier)
  const filteredAssets = useMemo(() => {
    const ms = clampInt(minScore, 0, 100);
    const rf = regimeFilter;

    return assets.filter((a) => {
      const score = safeNumber(a.confidence_score) ?? 0;
      const reg = regimeLabel(a.regime ?? null);

      if (score < ms) return false;
      if (rf !== 'ALL' && reg !== rf) return false;

      return true;
    });
  }, [assets, minScore, regimeFilter]);

  // ===== Styles (Apple-like, lisibilité, même rendu partout) =====
  const page: React.CSSProperties = {
    padding: 16,
  };

  // 1 seule colonne centrée pour PC = même interface que téléphone
  const shell: React.CSSProperties = {
    maxWidth: 560,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  };

  const headerRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  };

  const title: React.CSSProperties = {
    fontSize: 36,
    fontWeight: 950,
    letterSpacing: -0.7,
    lineHeight: 1,
    cursor: 'pointer', // “Home/Refresh” via clic sur le titre
  };

  const subtle: React.CSSProperties = { opacity: 0.62, fontSize: 13 };

  const contextCard: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: 24,
    background: 'rgba(0,0,0,0.02)',
    padding: 18,
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 14,
  };

  const contextLeft: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 170,
  };

  const bigMetric: React.CSSProperties = {
    fontSize: 44,
    fontWeight: 950,
    letterSpacing: -0.9,
    lineHeight: 1,
  };

  const filtersCard: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: 24,
    background: 'white',
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  };

  const row: React.CSSProperties = {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  };

  const select: React.CSSProperties = {
    padding: '10px 12px',
    borderRadius: 14,
    border: '1px solid rgba(0,0,0,0.10)',
    background: 'rgba(0,0,0,0.02)',
    fontWeight: 900,
  };

  const primaryBtn: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: 16,
    border: '1px solid rgba(0,0,0,0.12)',
    background: 'rgba(0,0,0,0.02)',
    fontWeight: 950,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  const list: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  };

  const card: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: 24,
    background: 'white',
    padding: 16,
  };

  const iconBox: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: 'rgba(0,0,0,0.04)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 950,
    fontSize: 13,
    flexShrink: 0,
  };

  const openBtn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 12px',
    borderRadius: 16,
    border: '1px solid rgba(0,0,0,0.12)',
    background: 'rgba(0,0,0,0.02)',
    textDecoration: 'none',
    fontWeight: 950,
    color: 'inherit',
    whiteSpace: 'nowrap',
  };

  const divider: React.CSSProperties = { height: 1, background: 'rgba(0,0,0,0.06)', margin: '12px 0' };

  const ctxReg = regimeLabel(context?.market_regime ?? null);
  const ctxRegKind = getRegimeKind(ctxReg);

  const confidenceGlobal =
    context?.confidence_global != null && Number.isFinite(Number(context.confidence_global))
      ? clampInt(Number(context.confidence_global), 0, 100)
      : null;

  const stablePct =
    context?.stable_ratio != null && Number.isFinite(Number(context.stable_ratio))
      ? clampInt(Math.round(Number(context.stable_ratio) * 100), 0, 100)
      : null;

  return (
    <main style={page}>
      <div style={shell}>
        {/* Header minimal (clic titre = refresh) */}
        <div style={headerRow}>
          <div>
            <div onClick={() => fetchAll('refresh')} title="Recharger" style={title}>
              Zilkara
            </div>
            <div style={subtle}>
              {error ? 'Erreur' : 'OK'}
              {lastUpdated ? ` — ${lastUpdated}` : ''}
              {isRefreshing ? ' — refresh…' : ''}
            </div>
          </div>

          {/* Bouton discret (optionnel), le titre fait déjà “home/refresh” */}
          <button onClick={() => fetchAll('refresh')} disabled={isLoading || isRefreshing} style={primaryBtn}>
            Refresh
          </button>
        </div>

        {/* Contexte (compact, utile, rapide à lire) */}
        <section style={contextCard}>
          <div style={contextLeft}>
            <div style={{ fontSize: 12, opacity: 0.55, fontWeight: 950, letterSpacing: 1 }}>
              RFS CONTEXT
            </div>
            <div style={{ fontSize: 14, opacity: 0.7, fontWeight: 950 }}>Confiance</div>
            <div style={bigMetric}>{confidenceGlobal != null ? `${confidenceGlobal}%` : '—'}</div>
            <div style={{ fontSize: 14, opacity: 0.7, fontWeight: 950 }}>
              {stablePct != null ? `Stable ${stablePct}%` : ' '}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            <div style={pillStyle()}>
              <span style={dotStyle(ctxRegKind)} aria-hidden="true" />
              {ctxReg !== '—' ? ctxReg : 'RÉGIME'}
            </div>

            <div style={{ fontSize: 13, opacity: 0.62, maxWidth: 260, textAlign: 'right', lineHeight: 1.3 }}>
              Filtrer vite. Comprendre vite.
            </div>
          </div>
        </section>

        {/* Filtres (simples, efficaces) — pas de “Top Signals” */}
        <section style={filtersCard}>
          <div style={row}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 13, opacity: 0.7, fontWeight: 950 }}>Tri</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)} style={select}>
                <option value="confidence_score_desc">Score (desc)</option>
                <option value="confidence_score_asc">Score (asc)</option>
                <option value="market_cap_desc">Market cap (desc)</option>
                <option value="volume_desc">Volume (desc)</option>
                <option value="chg_24h_abs_asc">Volatilité 24h (faible)</option>
                <option value="chg_24h_abs_desc">Volatilité 24h (forte)</option>
              </select>
            </label>

            <button onClick={() => fetchAll('refresh')} disabled={isLoading || isRefreshing} style={primaryBtn}>
              Appliquer
            </button>
          </div>

          <div style={row}>
            <label style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
              <input type="checkbox" checked={discipline} onChange={(e) => setDiscipline(e.target.checked)} />
              <span style={{ fontSize: 13, opacity: 0.8, fontWeight: 950 }}>Mode Discipline</span>
            </label>

            <Segmented
              value={regimeFilter}
              onChange={(v) => setRegimeFilter(v as any)}
              options={[
                { value: 'ALL', label: 'Tous' },
                { value: 'STABLE', label: 'Stable' },
                { value: 'TRANSITION', label: 'Transition' },
                { value: 'VOLATILE', label: 'Volatile' },
              ]}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
              <div style={{ fontSize: 13, opacity: 0.7, fontWeight: 950 }}>Score minimum</div>
              <div style={{ fontSize: 13, fontWeight: 950 }}>{clampInt(minScore, 0, 100)}</div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={clampInt(minScore, 0, 100)}
              onChange={(e) => setMinScore(Number(e.target.value))}
              aria-label="Score minimum"
            />
          </div>
        </section>

        {/* États */}
        {isLoading ? (
          <div style={list}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: 16, border: '1px solid rgba(255,0,0,0.25)', borderRadius: 20 }}>
            <div style={{ fontWeight: 950, marginBottom: 6 }}>Erreur</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{error}</div>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div style={{ padding: 16, border: '1px solid rgba(0,0,0,0.10)', borderRadius: 20 }}>
            Aucun résultat avec ces filtres.
          </div>
        ) : (
          <div style={list}>
            {filteredAssets.map((a, idx) => {
              const symbol = safeString(a.symbol) ?? '—';
              const name = safeString(a.name) ?? symbol;

              const score = safeNumber(a.confidence_score);
              const chg = safeNumber(a.chg_24h_pct);
              const price = safeNumber(a.price);

              const reg = regimeLabel(a.regime ?? null);
              const regKind = getRegimeKind(reg);

              const url = pickTradeUrl(a);

              return (
                <div key={`${safeString(a.id) ?? symbol}-${idx}`} style={card}>
                  {/* Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                      <div style={iconBox} title={symbol}>
                        {symbol.slice(0, 2)}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <div style={{ fontWeight: 950, fontSize: 18, lineHeight: 1.1 }}>{symbol}</div>
                        <div
                          style={{
                            opacity: 0.7,
                            fontSize: 13,
                            lineHeight: 1.2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={name}
                        >
                          {name}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontWeight: 950, fontSize: 36, letterSpacing: -0.7 }}>
                      {formatScore(score)}
                    </div>
                  </div>

                  <div style={divider} />

                  {/* Middle row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 950 }}>24h</div>
                      <div style={{ fontWeight: 950, fontVariantNumeric: 'tabular-nums' }}>{formatPct(chg)}</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'right' }}>
                      <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 950 }}>Prix</div>
                      <div style={{ fontWeight: 950, fontVariantNumeric: 'tabular-nums' }}>{formatPrice(price)}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div style={pillStyle()}>
                      <span style={dotStyle(regKind)} aria-hidden="true" />
                      {reg}
                    </div>

                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer" style={openBtn}>
                        Ouvrir Binance
                      </a>
                    ) : (
                      <span style={{ opacity: 0.6, fontWeight: 950 }}>—</span>
                    )}
                  </div>

                  {/* Reason (optionnel, ultra-court, utile) */}
                  {safeString(a.confidence_reason) ? (
                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.62, lineHeight: 1.35 }}>
                      {safeString(a.confidence_reason)}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
