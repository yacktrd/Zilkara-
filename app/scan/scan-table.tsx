// app/scan/scan-table.tsx
"use client";

type ScanAsset = {
  symbol: string;
  name: string;
  price: number;
  chg_24h_pct: number;
  confidence_score: number;
  regime: string;
  binance_url: string;
  affiliate_url: string;
};

export default function ScanTable({ items }: { items: ScanAsset[] }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
        <thead>
          <tr style={{ textAlign: "left" }}>
            <th style={{ padding: 12 }}>Actif</th>
            <th style={{ padding: 12 }}>Prix</th>
            <th style={{ padding: 12 }}>24h</th>
            <th style={{ padding: 12 }}>Score</th>
            <th style={{ padding: 12 }}>Régime</th>
            <th style={{ padding: 12 }} />
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const href = row.affiliate_url || row.binance_url;
            return (
              <tr key={row.symbol} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <td style={{ padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>{row.symbol}</div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>{row.name}</div>
                </td>
                <td style={{ padding: 12 }}>{row.price}</td>
                <td style={{ padding: 12 }}>{row.chg_24h_pct}%</td>
                <td style={{ padding: 12, fontWeight: 800 }}>{Math.round(row.confidence_score)}</td>
                <td style={{ padding: 12 }}>{row.regime}</td>
                <td style={{ padding: 12 }}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.14)",
                      textDecoration: "none",
                    }}
                  >
                    Ouvrir
                  </a>
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: 16, opacity: 0.7 }}>
                Aucune donnée.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
