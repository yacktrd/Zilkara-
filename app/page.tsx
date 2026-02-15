'use client';

import { useEffect, useMemo, useState } from 'react';

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

type ApiError = { code?: string; message?: string };

type ScanAsset = {
  symbol?: string;
  name?: string;
  price?: number;

  chg_24h_pct?: number;
  chg_7d_pct?: number;
  chg_30d_pct?: number;

  stability_score?: number;
  rating?: string;
  regime?: string;

  similarity?: number;
  rupture_rate?: number;
  reason?: string;

  // lien affilié déjà injecté côté API
  binance_url?: string;
};

type ScanMeta = {
  updatedAt?: number;
  count?: number;
  limit?: number;
};

type ScanResponse = {
  ok: boolean;
  ts: number;
  data: ScanAsset[];
  meta?: ScanMeta;
  error?: ApiError;
};

function clsPct(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return 'muted';
  return n > 0 ? 'pos' : n < 0 ? 'neg' : 'muted';
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [res, setRes] = useState<ScanResponse | null>(null);

  const data = useMemo(() => {
    const list = res?.data ?? [];
    // Tri: stabilité d'abord (fallback -1)
    return [...list].sort(
      (a, b) => (b.stability_score ?? -1) - (a.stability_score ?? -1)
    );
  }, [res]);

  async function load() {
    setLoading(true);
    try {
      // no-store : on veut refléter l'état réel, le cache est géré côté API (/api/scan)
      const r = await fetch('/api/scan', { cache: 'no-store' });
      const j = (await r.json()) as ScanResponse;

      // garde-fou minimal si l'API renvoie un format inattendu
      if (!j || typeof j.ok !== 'boolean' || !Array.isArray(j.data)) {
        setRes({
          ok: false,
          ts: Date.now(),
          data: [],
          error: { code: 'BAD_SHAPE', message: 'Invalid API response shape' },
        });
      } else {
        setRes(j);
      }
    } catch (e: any) {
      setRes({
        ok: false,
        ts: Date.now(),
        data: [],
        error: {
          code: 'FETCH_ERROR',
          message: e?.message || 'Network error',
        },
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000); // auto-refresh 30s
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusLabel = loading ? 'Loading…' : res?.ok ? 'ONLINE' : 'ERROR';

  const updatedAtLabel = res?.meta?.updatedAt
    ? new Date(res.meta.updatedAt).toLocaleString('fr-FR')
    : '—';

  const countLabel =
    res?.meta?.count != null ? fmtInt(res.meta.count) : fmtInt(data.length);

  const limitLabel =
    res?.meta?.limit != null ? fmtInt(res.meta.limit) : '—';

  return (
    <main className="wrap">
      <header className="head">
        <div className="titleRow">
          <h1 className="title">Zilkara</h1>

          <button className="btn" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        <div className="sub">
          <div className="pill">
            Status: <strong>{statusLabel}</strong>
          </div>
          <div className="pill">
            Updated: <strong>{updatedAtLabel}</strong>
          </div>
          <div className="pill">
            Count: <strong>{countLabel}</strong>
          </div>
          <div className="pill">
            Limit: <strong>{limitLabel}</strong>
          </div>
          <div className="pill">
            Timestamp: <strong>{res?.ts ? new Date(res.ts).toLocaleString('fr-FR') : '—'}</strong>
          </div>
        </div>

        {!loading && res && !res.ok && res.error && (
          <div className="errorBox">
            <div className="errorLine">
              Erreur: <strong>{res.error.code || 'ERROR'}</strong> —{' '}
              <span>{res.error.message || 'Unknown error'}</span>
            </div>
          </div>
        )}
      </header>

      <section className="card">
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Asset</th>
                <th className="right">Price</th>
                <th className="right">24h</th>
                <th className="right">7d</th>
                <th className="right">30d</th>
                <th className="right">Score</th>
                <th className="center">Rating</th>
                <th className="center">Regime</th>
              </tr>
            </thead>

            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty">
                    {loading ? 'Chargement…' : 'Aucune donnée.'}
                  </td>
                </tr>
              ) : (
                data.map((a, idx) => (
                  <tr key={`${a.symbol || a.name || 'asset'}-${idx}`}>
                    <td className="asset">
                      <div className="assetMain">
                        {a.binance_url ? (
                          <a
                            href={a.binance_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link"
                          >
                            {a.symbol || a.name || '—'}
                          </a>
                        ) : (
                          <span>{a.symbol || a.name || '—'}</span>
                        )}
                      </div>
                      {a.reason ? <div className="assetSub">{a.reason}</div> : null}
                    </td>

                    <td className="right mono">{fmtPrice(a.price)}</td>

                    <td className={`right mono ${clsPct(a.chg_24h_pct)}`}>
                      {fmtPct(a.chg_24h_pct)}
                    </td>
                    <td className={`right mono ${clsPct(a.chg_7d_pct)}`}>
                      {fmtPct(a.chg_7d_pct)}
                    </td>
                    <td className={`right mono ${clsPct(a.chg_30d_pct)}`}>
                      {fmtPct(a.chg_30d_pct)}
                    </td>

                    <td className="right mono">{fmtInt(a.stability_score)}</td>
                    <td className="center mono">{a.rating ?? '—'}</td>
                    <td className="center mono">{a.regime ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="foot">
          <div className="hint">
            Données servies via <code>/api/scan</code>. Cache, rate-limit et affiliation gérés côté backend.
          </div>
        </footer>
      </section>

      <style jsx>{`
        :global(body) {
          margin: 0;
        }

        .wrap {
          padding: 28px 18px;
          max-width: 1100px;
          margin: 0 auto;
          font-family: ui-serif, Georgia, 'Times New Roman', Times, serif;
        }

        .head {
          margin-bottom: 18px;
        }

        .titleRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .title {
          font-size: 44px;
          margin: 0;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .btn {
          border: 1px solid rgba(0, 0, 0, 0.15);
          background: white;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .sub {
          margin-top: 14px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .pill {
          border: 1px solid rgba(0, 0, 0, 0.12);
          padding: 8px 10px;
          border-radius: 999px;
          font-size: 14px;
          background: rgba(255, 255, 255, 0.7);
        }

        .errorBox {
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid rgba(180, 0, 0, 0.25);
          background: rgba(255, 0, 0, 0.04);
        }

        .errorLine {
          font-size: 16px;
        }

        .card {
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 16px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.7);
        }

        .tableWrap {
          width: 100%;
          overflow-x: auto;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          min-width: 840px;
        }

        thead th {
          text-align: left;
          font-size: 14px;
          font-weight: 700;
          padding: 14px 14px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          background: rgba(0, 0, 0, 0.03);
        }

        tbody td {
          padding: 14px 14px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          vertical-align: top;
        }

        tbody tr:hover td {
          background: rgba(0, 0, 0, 0.02);
        }

        .right {
          text-align: right;
        }

        .center {
          text-align: center;
        }

        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            'Liberation Mono', 'Courier New', monospace;
          font-size: 13px;
        }

        .asset {
          max-width: 360px;
        }

        .assetMain {
          font-weight: 700;
          font-size: 16px;
        }

        .assetSub {
          margin-top: 6px;
          font-size: 13px;
          opacity: 0.8;
        }

        .link {
          text-decoration: none;
          border-bottom: 1px solid rgba(0, 0, 0, 0.25);
          color: inherit;
        }
        .link:hover {
          border-bottom-color: rgba(0, 0, 0, 0.6);
        }

        .pos {
          color: #0a7a2f;
          font-weight: 700;
        }
        .neg {
          color: #b00020;
          font-weight: 700;
        }
        .muted {
          opacity: 0.85;
        }

        .empty {
          padding: 22px 14px;
          text-align: center;
          opacity: 0.75;
        }

        .foot {
          padding: 12px 14px;
        }

        .hint {
          font-size: 13px;
          opacity: 0.8;
        }

        @media (max-width: 520px) {
          .wrap {
            padding: 18px 14px;
          }
          .title {
            font-size: 38px;
          }
          .btn {
            padding: 9px 12px;
          }
        }
      `}</style>
    </main>
  );
}
