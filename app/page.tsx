// app/page.tsx
'use client';

import React, { useEffect, useState } from 'react';

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
};

export default function Page() {
  const [assets, setAssets] = useState<ScanAsset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /** Rafraîchit la liste en appelant l’API /api/scan */
  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/scan', { cache: 'no-store' });
      const json = (await res.json()) as ScanResponse;

      if (!json.ok) {
        throw new Error(json.error || json.message || 'Erreur de chargement');
      }

      setAssets(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur inconnue');
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Chargement initial
  useEffect(() => {
    load();
  }, []);

  /** Formatage du prix en fonction de sa magnitude */
  const formatPrice = (v: number | null): string => {
    if (v == null) return '—';
    if (v >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (v >= 1) return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return v.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  };

  /** Formatage du pourcentage de variation sur 24h */
  const formatPct = (v: number | null): string => {
    if (v == null) return '—';
    const sign = v > 0 ? '+' : '';
    return `${sign}${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  };

  /** Bornage et formatage du score de confiance (0–100) */
  const formatScore = (v: number | null): string => {
    if (v == null) return '—';
    const n = Math.max(0, Math.min(100, Math.round(v)));
    return String(n);
  };

  return (
    <main style={{ padding: 16, maxWidth: 980, margin: '0 auto' }}>
      {/* En‑tête : titre cliquable pour rafraîchir */}
      <header style={{ marginBottom: 16 }}>
        <h1
          style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.3, cursor: 'pointer' }}
          onClick={load}
        >
          Zilkara
        </h1>
      </header>

      {/* État de chargement ou d’erreur */}
      {isLoading ? (
        <div style={{ padding: 14 }}>Chargement…</div>
      ) : error ? (
        <div style={{ padding: 14, color: 'red' }}>{error}</div>
      ) : assets.length === 0 ? (
        <div style={{ padding: 14 }}>Aucun actif disponible.</div>
      ) : (
        // Tableau des actifs
        <div style={{ overflowX: 'auto', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ textAlign: 'left', fontSize: 12, opacity: 0.75 }}>
                <th style={{ padding: 12 }}>Actif</th>
                <th style={{ padding: 12 }}>Prix</th>
                <th style={{ padding: 12 }}>24h</th>
                <th style={{ padding: 12 }}>Score</th>
                <th style={{ padding: 12 }}>Régime</th>
                <th style={{ padding: 12 }}>Binance</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a, idx) => {
                const symbol = a.symbol?.toUpperCase() ?? '—';
                const name = a.name ?? symbol;
                const url = a.affiliate_url ?? a.binance_url ?? null;

                return (
                  <tr key={`${symbol}-${idx}`} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <td style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontWeight: 700 }}>{symbol}</span>
                      <span style={{ opacity: 0.7, fontSize: 12 }}>{name}</span>
                    </td>
                    <td style={{ padding: 12, fontVariantNumeric: 'tabular-nums' }}>
                      {formatPrice(a.price ?? null)}
                    </td>
                    <td style={{ padding: 12, fontVariantNumeric: 'tabular-nums' }}>
                      {formatPct(a.chg_24h_pct ?? null)}
                    </td>
                    <td style={{ padding: 12, fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}>
                      {formatScore(a.confidence_score ?? null)}
                    </td>
                    <td style={{ padding: 12 }}>{a.regime ? a.regime.toUpperCase() : '—'}</td>
                    <td style={{ padding: 12 }}>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            padding: '8px 10px',
                            borderRadius: 10,
                            border: '1px solid rgba(0,0,0,0.12)',
                            textDecoration: 'none',
                            fontWeight: 700,
                            color: 'inherit',
                          }}
                        >
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
      )}
    </main>
  );
}
