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

  // optionnel : déjà présent côté API si tu l’injectes
  binance_url?: string;

  // champs éventuels, ignorés si absents
  similarity?: number;
  rupture_rate?: number;
  reason?: string;
};

type ScanResponse = {
  ok: boolean;
  ts: number;
  data: ScanAsset[];
  error?: ApiError;
};

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [res, setRes] = useState<ScanResponse | null>(null);

  const data = useMemo(() => {
    const list = res?.data ?? [];
    // tri: stabilité d’abord, sinon fallback sur 0
    return [...list].sort(
      (a, b) => (b.stability_score ?? -1) - (a.stability_score ?? -1)
    );
  }, [res]);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/scan', { cache: 'no-store' });
      const j = (await r.json()) as ScanResponse;
      setRes(j);
    } catch (e: any) {
      setRes({
        ok: false,
        ts: Date.now(),
        data: [],
        error: { code: 'FETCH_FAILED', message: e?.message || 'Fetch failed' },
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const statusLine = (() => {
    if (loading) return 'Chargement…';
    if (!res) return '—';
    if (!res.ok) return `Erreur: ${res.error?.code || 'UNKNOWN'} — ${res.error?.message || ''}`;
    return `OK — ${data.length} actifs`;
  })();

  return (
    <main style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 34, margin: 0, fontWeight: 700 }}>Zilkara</h1>
        <div style={{ opacity: 0.8 }}>{statusLine}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={load}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,.15)',
              background: 'rgba(255,255,255,.06)',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,.12)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
            <thead>
              <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,.04)' }}>
                <Th>Asset</Th>
                <Th>Price</Th>
                <Th>24h</Th>
                <Th>7d</Th>
                <Th>30d</Th>
                <Th>Score</Th>
                <Th>Rating</Th>
                <Th>Regime</Th>
                <Th>Link</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((a, i) => {
                const sym = a.symbol || '—';
                const name = a.name || '';
                return (
                  <tr key={`${sym}-${i}`} style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
                    <Td>
                      <div style={{ fontWeight: 700 }}>{sym}</div>
                      <div style={{ opacity: 0.75, fontSize: 12 }}>{name}</div>
                    </Td>
                    <Td>{fmtPrice(a.price)}</Td>
                    <Td>{fmtPct(a.chg_24h_pct)}</Td>
                    <Td>{fmtPct(a.chg_7d_pct)}</Td>
                    <Td>{fmtPct(a.chg_30d_pct)}</Td>
                    <Td>{fmtInt(a.stability_score)}</Td>
                    <Td>{a.rating || '—'}</Td>
                    <Td>{a.regime || '—'}</Td>
                    <Td>
                      {a.binance_url ? (
                        <a
                          href={a.binance_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ textDecoration: 'underline', opacity: 0.9 }}
                        >
                          Binance
                        </a>
                      ) : (
                        '—'
                      )}
                    </Td>
                  </tr>
                );
              })}

              {!loading && res?.ok && data.length === 0 && (
                <tr>
                  <Td colSpan={9} style={{ opacity: 0.8 }}>
                    Aucun actif.
                  </Td>
                </tr>
              )}

              {!loading && res && !res.ok && (
                <tr>
                  <Td colSpan={9} style={{ opacity: 0.9 }}>
                    {res.error?.code || 'ERROR'} — {res.error?.message || 'Unknown error'}
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
        Timestamp: {res?.ts ? new Date(res.ts).toLocaleString('fr-FR') : '—'}
      </div>
    </main>
  );
}

function Th({ children }: { children: any }) {
  return (
    <th style={{ padding: '12px 12px', fontSize: 12, letterSpacing: 0.3, opacity: 0.8, whiteSpace: 'nowrap' }}>
      {children}
    </th>
  );
}

function Td({ children, colSpan, style }: { children: any; colSpan?: number; style?: any }) {
  return (
    <td style={{ padding: '12px 12px', verticalAlign: 'top', whiteSpace: 'nowrap', ...style }} colSpan={colSpan}>
      {children}
    </td>
  );
}
