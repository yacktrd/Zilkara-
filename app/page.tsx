// app/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * ✅ Objectif V1 (frontend)
 * - Même interface mobile + desktop (mobile-first, grid responsive)
 * - Supprimer "Top Signals" (le tri fait le classement)
 * - Supprimer tout texte parasite (ex: "Trier. Lire. Décider.")
 * - Refresh = clic sur le titre "Zilkara" (pas besoin d’un gros bouton)
 * - Filtres ultra simples et utiles : Score minimum + Régime (ALL/STABLE/TRANSITION/VOLATILE)
 * - Liens Binance: NE PAS reconstruire côté UI (on utilise affiliate_url/binance_url fournis)
 * - Build TS strict: 0 null/undefined envoyé à des fonctions qui attendent number
 */

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
  confidence_global?: number | null; // 0-100
  stable_ratio?: number | null;
  transition_ratio?: number | null;
  volatile_ratio?: number | null;
  message?: string | null;
  error?: string;
};

/** =========================
 *  Helpers (null-safe strict)
 * ========================= */

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

function asIntOr(v: unknown, fallback: number, min = 0, max = 100): number {
  const n = safeNumber(v);
  if (n === null) return clampInt(fallback, min, max);
  return clampInt(Math.round(n), min, max);
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

/** ===============
 *  UI atoms (simple)
 * =============== */

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
        borderRadius: 14,
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
              borderRadius: 12,
              border: 'none',
              background: active ? 'white' : 'transparent',
              fontWeight: 900,
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

function SkeletonCard() {
  const box: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: 18,
    background: 'rgba(0,0,0,0.03)',
    padding: 16,
    minHeight: 104,
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
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(0,0,0,0.08)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={bar(34)} />
            <div style={bar(56)} />
          </div>
        </div>
        <div style={{ width: 56, height: 22, borderRadius: 999, background: 'rgba(0,0,0,0.08)' }} />
      </div>
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={bar(40)} />
        <div style={bar(28)} />
      </div>
    </div>
  );
}

function getRegimeKind(r: ReturnType<typeof regimeLabel>): 'stable' | 'transition' | 'volatile' | 'neutral' {
  if (r === 'STABLE') return 'stable';
  if (r === 'TRANSITION') return 'transition';
  if (r === 'VOLATILE') return 'volatile';
  return 'neutral';
}

function pillStyle(kind: 'neutral' | 'stable' | 'transition' | 'volatile') {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 900,
    border: '1px solid rgba(0,0,0,0.10)',
    background: 'rgba(0,0,0,0.03)',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  };
  // pas de couleurs codées ici (tu peux faire en CSS global plus tard)
  return base;
}

function dotStyle(kind: 'stable' | 'transition' | 'volatile' | 'neutral') {
  return {
    width: 9,
    height: 9,
    borderRadius: 99,
    background: 'rgba(0,0,0,0.25)',
    display: 'inline-block',
  } as React.CSSProperties;
}

/** =========================
 *  Page
 * ========================= */

export default function Page() {
  // ✅ Filtres minimalistes (lecture / décision)
  const [minScore, setMinScore] = useState<number>(0);
  const [regimeFilter, setRegimeFilter] = useState<'ALL' | 'STABLE' | 'TRANSITION' | 'VOLATILE'>('ALL');

  // ✅ backend fetch (on évite les limites UI inutiles)
  const LIMIT_BACKEND = 250;
  const SORT_BACKEND = 'confidence_score_desc';

  const [assets, setAssets] = useState<ScanAsset[]>([]);
  const [context, setContext] = useState<ContextResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const lastUpdated = useMemo(() => safeString(context?.ts) ?? null, [context]);

  const buildScanUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set('limit', String(LIMIT_BACKEND));
    params.set('sort', SORT_BACKEND);
    // (discipline mode côté API pourrait être ajouté plus tard, mais UI supprimée pour lisibilité)
    return `/api/scan?${params.toString()}`;
  }, []);

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

  // ✅ Filtrage purement visuel
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

  // ✅ Contexte (null-safe 100%)
  const ctxReg = regimeLabel(context?.market_regime ?? null);
  const ctxRegKind = getRegimeKind(ctxReg);
  const confidenceGlobal = asIntOr(context?.confidence_global, 0, 0, 100);

  // ✅ Styles (mobile-first, identique PC/tel)
  const page: React.CSSProperties = {
    padding: 16,
    maxWidth: 980,
    margin: '0 auto',
  };

  const headerRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  };

  const title: React.CSSProperties = {
    fontSize: 34,
    fontWeight: 950,
    letterSpacing: -0.6,
    cursor: 'pointer', // Refresh = clic sur le titre
    userSelect: 'none',
  };

  const subtle: React.CSSProperties = { opacity: 0.68, fontSize: 13 };

  const contextCard: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: 22,
    background: 'rgba(0,0,0,0.02)',
    padding: 16,
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 14,
  };

  const contextLeft: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 180,
  };

  const bigMetric: React.CSSProperties = {
    fontSize: 42,
    fontWeight: 950,
    letterSpacing: -0.8,
    lineHeight: 1,
  };

  const controls: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  };

  const sliderWrap: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 220,
    flex: '1 1 240px',
  };

  const grid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 12,
  };

  const card: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: 22,
    background: 'white',
    padding: 16,
  };

  const iconBox: React.CSSProperties = {
    width: 42,
    height: 42,
    borderRadius: 14,
    background: 'rgba(0,0,0,0.04)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: 13,
    flexShrink: 0,
  };

  const openBtn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 12px',
    borderRadius: 14,
    border: '1px solid rgba(0,0,0,0.12)',
    background: 'rgba(0,0,0,0.02)',
    textDecoration: 'none',
    fontWeight: 900,
    color: 'inherit',
    whiteSpace: 'nowrap',
  };

  const divider: React.CSSProperties = {
    height: 1,
    background: 'rgba(0,0,0,0.06)',
    margin: '12px 0',
  };

  return (
    <main style={page}>
      {/* Header minimal (Refresh = clic sur le titre) */}
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
      </div>

      {/* Contexte (compact, utile) */}
      <section style={contextCard}>
        <div style={contextLeft}>
          <div style={{ fontSize: 12, opacity: 0.55, fontWeight: 900, letterSpacing: 1 }}>
            RFS CONTEXT
          </div>
          <div style={{ fontSize: 14, opacity: 0.7, fontWeight: 900 }}>Confiance</div>
          <div style={bigMetric}>{Number.isFinite(confidenceGlobal) ? `${confidenceGlobal}%` : '—'}</div>
          <div style={{ fontSize: 14, opacity: 0.7, fontWeight: 900 }}>{ctxReg}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <div style={pillStyle(ctxRegKind)}>
            <span style={dotStyle(ctxRegKind)} aria-hidden="true" />
            {ctxReg !== '—' ? ctxReg : 'RÉGIME'}
          </div>
        </div>
      </section>

      {/* Filtres (ultra simples) */}
      <section style={controls}>
        <div style={sliderWrap}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
            <div style={{ fontSize: 13, opacity: 0.7, fontWeight: 900 }}>Score minimum</div>
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
      </section>

      {/* États */}
      {isLoading ? (
        <div style={grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <div style={{ padding: 16, border: '1px solid rgba(255,0,0,0.25)', borderRadius: 18 }}>
          <div style={{ fontWeight: 950, marginBottom: 6 }}>Erreur</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{error}</div>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div style={{ padding: 16, border: '1px solid rgba(0,0,0,0.10)', borderRadius: 18 }}>
          Aucun résultat avec ces filtres.
        </div>
      ) : (
        <div style={grid}>
          {filteredAssets.map((a, idx) => {
            const symbol = safeString(a.symbol) ?? '—';
            const name = safeString(a.name) ?? symbol;

            const score = safeNumber(a.confidence_score);
            const chg = safeNumber(a.chg_24h_pct);
            const price = safeNumber(a.price);

            const reg = regimeLabel(a.regime ?? null);
            const regKind = getRegimeKind(reg);

            const url = pickTradeUrl(a);
            const reason = safeString(a.confidence_reason);

            return (
              <div key={`${safeString(a.id) ?? symbol}-${idx}`} style={card}>
                {/* Ligne haute */}
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
                      >
                        {name}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontWeight: 950, fontSize: 34, letterSpacing: -0.6 }}>
                    {formatScore(score)}
                  </div>
                </div>

                <div style={divider} />

                {/* Ligne métriques */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 900 }}>24h</div>
                    <div style={{ fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{formatPct(chg)}</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'right' }}>
                    <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 900 }}>Prix</div>
                    <div style={{ fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{formatPrice(price)}</div>
                  </div>
                </div>

                {/* Ligne action */}
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <div style={pillStyle(regKind)}>
                    <span style={dotStyle(regKind)} aria-hidden="true" />
                    {reg}
                  </div>

                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer" style={openBtn}>
                      Ouvrir Binance
                    </a>
                  ) : (
                    <span style={{ opacity: 0.6, fontWeight: 900 }}>Lien indisponible</span>
                  )}
                </div>

                {/* Reason (court, utile) */}
                {reason ? (
                  <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65, lineHeight: 1.35 }}>
                    {reason}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
