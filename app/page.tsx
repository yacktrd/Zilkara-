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
  confidence_global?: number | null;
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
  const n = clampInt(v, 0, 100);
  return String(n);
}

function pickTradeUrl(a: ScanAsset): string | null {
  // IMPORTANT: ne jamais reconstruire. On prend celui donné par l’API.
  return safeString(a.affiliate_url) ?? safeString(a.binance_url) ?? null;
}

function initialsFromSymbol(symbol: string) {
  const s = symbol.trim().toUpperCase();
  if (!s) return '—';
  return s.slice(0, 2);
}

function regimeText(r: Regime | null): string {
  if (!r) return '—';
  return String(r).toUpperCase();
}

function regimeClass(r: Regime | null): string {
  const t = regimeText(r);
  if (t === 'STABLE') return 'tag stable';
  if (t === 'TRANSITION') return 'tag transition';
  if (t === 'VOLATILE') return 'tag volatile';
  return 'tag';
}

function dotClass(r: Regime | null): string {
  const t = regimeText(r);
  if (t === 'STABLE') return 'dot stable';
  if (t === 'TRANSITION') return 'dot transition';
  if (t === 'VOLATILE') return 'dot volatile';
  return 'dot';
}

function AssetMini({ a }: { a: ScanAsset }) {
  const symbol = safeString(a.symbol) ?? '—';
  const name = safeString(a.name) ?? symbol;

  return (
    <div className="assetMini">
      <div className="avatar" aria-hidden="true" title={symbol}>
        {initialsFromSymbol(symbol)}
      </div>
      <div className="assetMiniText">
        <div className="assetMiniSymbol">{symbol}</div>
        <div className="assetMiniName">{name}</div>
      </div>
    </div>
  );
}

function ContextCard({ ctx, total }: { ctx: ContextResponse | null; total: number }) {
  const conf = ctx?.confidence_global != null ? clampInt(ctx.confidence_global, 0, 100) : null;
  const regime = safeString(ctx?.market_regime) ?? null;

  // optionnel: stable X / Y (si ratios fournis)
  const stableRatio = safeNumber(ctx?.stable_ratio);
  const stableCount = stableRatio != null ? Math.round(stableRatio * total) : null;

  return (
    <section className="contextCard">
      <div className="contextTitle">RFS CONTEXT</div>
      <div className="contextMain">
        <div className="contextLeft">
          <div className="contextKpi">
            <div className="kpiLabel">Confidence</div>
            <div className="kpiValue">{conf != null ? `${conf}%` : '—'}</div>
          </div>
          <div className="contextSub">
            {stableCount != null ? `Stable ${stableCount} / ${total}` : `${total} actifs`}
          </div>
        </div>

        <div className="contextRight">
          <div className="contextRegime">
            <span className={dotClass(regime)} aria-hidden="true" />
            <span>{regime ?? '—'}</span>
          </div>
          <div className="contextHint">Trier. Lire. Décider.</div>
        </div>
      </div>
    </section>
  );
}

function TopSignalCard({ a }: { a: ScanAsset }) {
  const price = safeNumber(a.price);
  const chg = safeNumber(a.chg_24h_pct);
  const score = safeNumber(a.confidence_score);
  const regime = a.regime ?? null;
  const url = pickTradeUrl(a);

  return (
    <div className="signalCard">
      <div className="signalTop">
        <AssetMini a={a} />
        <div className="signalScore">{formatScore(score)}</div>
      </div>

      <div className="signalBottom">
        <div className="signalMeta">
          <span className={dotClass(regime)} aria-hidden="true" />
          <span className="signalRegime">{regimeText(regime)}</span>
        </div>
        <div className="signalNums">
          <span className="signalPct">{formatPct(chg)}</span>
          <span className="signalPrice">{formatPrice(price)}</span>
        </div>
      </div>

      <div className="signalAction">
        {url ? (
          <a className="btn" href={url} target="_blank" rel="noreferrer">
            Ouvrir Binance
          </a>
        ) : (
          <span className="muted">—</span>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  // ✅ State UI minimal (lecture)
  const [limit, setLimit] = useState<number>(50);
  const [sort, setSort] = useState<string>('confidence_score_desc');
  const [discipline, setDiscipline] = useState<boolean>(false);

  const [assets, setAssets] = useState<ScanAsset[]>([]);
  const [context, setContext] = useState<ContextResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const lastUpdated = useMemo(() => safeString(context?.ts) ?? null, [context]);

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
    },
    [buildScanUrl]
  );

  useEffect(() => {
    fetchAll('initial');
  }, [fetchAll]);

  const topSignals = useMemo(() => assets.slice(0, 5), [assets]);

  return (
    <main className="wrap">
      <style jsx global>{`
        :root {
          --bg: #ffffff;
          --text: rgba(0,0,0,0.92);
          --muted: rgba(0,0,0,0.56);
          --line: rgba(0,0,0,0.08);
          --card: rgba(0,0,0,0.03);
          --card2: rgba(0,0,0,0.02);
          --shadow: 0 8px 30px rgba(0,0,0,0.06);
          --radius: 18px;
          --radius2: 14px;
        }
        body {
          background: var(--bg);
          color: var(--text);
        }
        .wrap {
          padding: 16px;
          max-width: 1040px;
          margin: 0 auto;
        }

        /* Header */
        .headerRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }
        .title {
          font-size: 30px;
          font-weight: 900;
          letter-spacing: -0.5px;
          line-height: 1.05;
        }
        .subtitle {
          margin-top: 6px;
          font-size: 13px;
          color: var(--muted);
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid var(--line);
          background: #fff;
          font-weight: 800;
          text-decoration: none;
          color: inherit;
          white-space: nowrap;
        }
        .btn:disabled {
          opacity: 0.55;
        }

        /* Controls */
        .controls {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          margin: 12px 0 14px;
        }
        .control {
          display: inline-flex;
          gap: 8px;
          align-items: center;
        }
        .controlLabel {
          font-size: 13px;
          color: var(--muted);
        }
        select {
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid var(--line);
          background: #fff;
          font-weight: 700;
        }
        .toggle {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid var(--line);
          background: #fff;
          font-weight: 800;
        }
        .toggle input {
          transform: translateY(1px);
        }

        /* Context card */
        .contextCard {
          border: 1px solid var(--line);
          border-radius: var(--radius);
          background: linear-gradient(180deg, var(--card), var(--card2));
          padding: 14px;
          box-shadow: var(--shadow);
        }
        .contextTitle {
          font-size: 12px;
          letter-spacing: 0.12em;
          font-weight: 900;
          color: var(--muted);
          margin-bottom: 10px;
        }
        .contextMain {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }
        .kpiLabel {
          font-size: 13px;
          color: var(--muted);
          font-weight: 800;
        }
        .kpiValue {
          font-size: 22px;
          font-weight: 950;
          letter-spacing: -0.3px;
          margin-top: 2px;
        }
        .contextSub {
          margin-top: 6px;
          font-size: 13px;
          color: var(--muted);
          font-weight: 700;
        }
        .contextRegime {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 900;
          padding: 10px 12px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: #fff;
        }
        .contextHint {
          margin-top: 8px;
          text-align: right;
          font-size: 13px;
          color: var(--muted);
          font-weight: 700;
        }

        /* Dots & tags */
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(0,0,0,0.25);
          display: inline-block;
        }
        .dot.stable {
          background: rgba(0, 160, 90, 0.9);
        }
        .dot.transition {
          background: rgba(245, 158, 11, 0.95);
        }
        .dot.volatile {
          background: rgba(239, 68, 68, 0.92);
        }
        .tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: #fff;
          font-weight: 900;
          font-size: 12px;
        }

        /* Top signals */
        .sectionTitle {
          margin: 16px 0 10px;
          font-size: 16px;
          font-weight: 950;
          letter-spacing: -0.2px;
        }
        .signalsGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .signalCard {
          border: 1px solid var(--line);
          border-radius: var(--radius);
          background: #fff;
          padding: 14px;
          box-shadow: var(--shadow);
        }
        .signalTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .signalScore {
          font-size: 26px;
          font-weight: 950;
          letter-spacing: -0.4px;
        }
        .signalBottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 10px;
        }
        .signalMeta {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          font-weight: 900;
          color: rgba(0,0,0,0.78);
        }
        .signalNums {
          display: inline-flex;
          gap: 10px;
          align-items: baseline;
          font-weight: 900;
        }
        .signalPct {
          color: rgba(0,0,0,0.75);
          font-size: 13px;
        }
        .signalPrice {
          font-size: 14px;
        }
        .signalAction {
          margin-top: 12px;
        }

        /* Asset mini */
        .assetMini {
          display: flex;
          gap: 12px;
          align-items: center;
          min-width: 0;
        }
        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 14px;
          background: rgba(0,0,0,0.06);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 950;
          font-size: 12px;
        }
        .assetMiniText {
          display: flex;
          flex-direction: column;
          line-height: 1.08;
          min-width: 0;
        }
        .assetMiniSymbol {
          font-weight: 950;
          letter-spacing: -0.2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .assetMiniName {
          margin-top: 3px;
          font-size: 12px;
          color: var(--muted);
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 260px;
        }

        /* All assets: mobile list */
        .assetsList {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .assetRow {
          border: 1px solid var(--line);
          border-radius: var(--radius);
          background: #fff;
          padding: 14px;
          box-shadow: var(--shadow);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .assetRight {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          min-width: 120px;
        }
        .assetRightTop {
          display: inline-flex;
          gap: 10px;
          align-items: baseline;
          font-weight: 950;
        }
        .assetSmall {
          font-size: 12px;
          color: var(--muted);
          font-weight: 800;
        }

        /* Desktop table */
        .desktopOnly {
          display: none;
        }
        .tableWrap {
          border: 1px solid var(--line);
          border-radius: var(--radius);
          overflow: hidden;
          background: #fff;
          box-shadow: var(--shadow);
        }
        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 820px;
        }
        thead th {
          text-align: left;
          font-size: 12px;
          color: var(--muted);
          font-weight: 900;
          padding: 12px;
          border-bottom: 1px solid var(--line);
          background: rgba(0,0,0,0.02);
        }
        tbody td {
          padding: 12px;
          border-top: 1px solid rgba(0,0,0,0.05);
          vertical-align: middle;
        }
        .mono {
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum" 1;
        }

        /* Messages */
        .panel {
          padding: 14px;
          border-radius: var(--radius);
          border: 1px solid var(--line);
          background: rgba(0,0,0,0.02);
          margin-top: 14px;
        }
        .panelError {
          border-color: rgba(239, 68, 68, 0.35);
          background: rgba(239, 68, 68, 0.05);
        }
        .panelTitle {
          font-weight: 950;
          margin-bottom: 6px;
        }
        .muted {
          color: var(--muted);
          font-weight: 700;
        }

        /* Responsive: desktop upgrades */
        @media (min-width: 920px) {
          .signalsGrid {
            grid-template-columns: repeat(3, 1fr);
          }
          .assetMiniName {
            max-width: 420px;
          }
          .desktopOnly {
            display: block;
          }
          .mobileOnly {
            display: none;
          }
          .controls {
            margin-top: 14px;
          }
        }
      `}</style>

      {/* Header */}
      <div className="headerRow">
        <div>
          <div className="title">Zilkara</div>
          <div className="subtitle">
            {error ? 'Erreur' : 'OK'} — {assets.length} actifs
            {lastUpdated ? ` — Mis à jour : ${lastUpdated}` : ''}
          </div>
        </div>

        <button
          className="btn"
          onClick={() => fetchAll('refresh')}
          disabled={isLoading || isRefreshing}
        >
          {isRefreshing ? 'Refresh…' : 'Refresh'}
        </button>
      </div>

      {/* Context */}
      <ContextCard ctx={context} total={assets.length} />

      {/* Controls (UI minimal, pas de logique métier) */}
      <div className="controls">
        <div className="control">
          <span className="controlLabel">Limit</span>
          <select
            value={limit}
            onChange={(e) => setLimit(clampInt(Number(e.target.value), 1, 250))}
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={150}>150</option>
            <option value={200}>200</option>
          </select>
        </div>

        <div className="control">
          <span className="controlLabel">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="confidence_score_desc">confidence_score_desc</option>
            <option value="market_cap_desc">market_cap_desc</option>
            <option value="volume_desc">volume_desc</option>
            <option value="chg_24h_abs_asc">chg_24h_abs_asc</option>
            <option value="chg_24h_abs_desc">chg_24h_abs_desc</option>
          </select>
        </div>

        <label className="toggle">
          <input
            type="checkbox"
            checked={discipline}
            onChange={(e) => setDiscipline(e.target.checked)}
          />
          Mode Discipline
        </label>

        <button className="btn" onClick={() => fetchAll('refresh')} disabled={isLoading || isRefreshing}>
          Appliquer
        </button>
      </div>

      {/* Loading / Error */}
      {isLoading ? (
        <div className="panel">
          <div className="panelTitle">Chargement…</div>
          <div className="muted">Récupération du contexte et des signaux.</div>
        </div>
      ) : error ? (
        <div className="panel panelError">
          <div className="panelTitle">Erreur</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{error}</div>
        </div>
      ) : assets.length === 0 ? (
        <div className="panel">
          <div className="panelTitle">Aucun résultat</div>
          <div className="muted">Aucun actif reçu depuis /api/scan.</div>
        </div>
      ) : (
        <>
          {/* Top Signals (mobile-first, cards) */}
          <div className="sectionTitle">Top Signals</div>
          <div className="signalsGrid">
            {topSignals.map((a, idx) => (
              <TopSignalCard key={`${safeString(a.id) ?? safeString(a.symbol) ?? 'top'}-${idx}`} a={a} />
            ))}
          </div>

          {/* All assets */}
          <div className="sectionTitle">All Assets</div>

          {/* Mobile list */}
          <div className="assetsList mobileOnly">
            {assets.map((a, idx) => {
              const price = safeNumber(a.price);
              const chg = safeNumber(a.chg_24h_pct);
              const score = safeNumber(a.confidence_score);
              const regime = a.regime ?? null;
              const url = pickTradeUrl(a);

              return (
                <div key={`${safeString(a.id) ?? safeString(a.symbol) ?? 'm'}-${idx}`} className="assetRow">
                  <AssetMini a={a} />

                  <div className="assetRight">
                    <div className="assetRightTop">
                      <span className="mono">{formatScore(score)}</span>
                      <span className={dotClass(regime)} aria-hidden="true" title={regimeText(regime)} />
                    </div>
                    <div className="assetSmall mono">{formatPrice(price)}</div>
                    <div className="assetSmall mono">{formatPct(chg)}</div>
                    {url ? (
                      <a className="btn" href={url} target="_blank" rel="noreferrer">
                        Ouvrir
                      </a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="desktopOnly">
            <div className="tableWrap">
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Actif</th>
                      <th>Prix</th>
                      <th>24h</th>
                      <th>Score</th>
                      <th>Régime</th>
                      <th>Binance</th>
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
                        <tr key={`${safeString(a.id) ?? safeString(a.symbol) ?? 'd'}-${idx}`}>
                          <td>
                            <AssetMini a={a} />
                          </td>
                          <td className="mono">{formatPrice(price)}</td>
                          <td className="mono">{formatPct(chg)}</td>
                          <td className="mono" style={{ fontWeight: 950 }}>
                            {formatScore(score)}
                          </td>
                          <td>
                            <span className={regimeClass(regime)}>
                              <span className={dotClass(regime)} aria-hidden="true" />
                              {regimeText(regime)}
                            </span>
                          </td>
                          <td>
                            {url ? (
                              <a className="btn" href={url} target="_blank" rel="noreferrer">
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
            </div>
          </div>
        </>
      )}
    </main>
  );
}
