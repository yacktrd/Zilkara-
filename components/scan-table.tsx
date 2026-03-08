type ScanAsset = {
  id: string
  symbol: string
  name: string
  price: number
  h24: number
  chg_24h_pct: number
  market_cap?: number
  volume_24h?: number
  confidence_score: number
  regime: "STABLE" | "TRANSITION" | "VOLATILE"
  binance_url: string
  affiliate_url?: string
}

function formatPrice(n: number) {
  if (!Number.isFinite(n)) return "-"
  if (n >= 1000) return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })
  if (n >= 1) return n.toLocaleString("fr-FR", { maximumFractionDigits: 4 })
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 8 })
}

function formatPct(n: number) {
  if (!Number.isFinite(n)) return "-"
  const sign = n > 0 ? "+" : ""
  return `${sign}${n.toFixed(2)}%`
}

type Props = {
  items: ScanAsset[]
}

export default function ScanTable({ items }: Props) {
  if (!items.length) {
    return <p>Aucun résultat.</p>
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 14,
        }}
      >
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
            <th style={{ padding: "10px 8px" }}>Asset</th>
            <th style={{ padding: "10px 8px" }}>Price</th>
            <th style={{ padding: "10px 8px" }}>24h</th>
            <th style={{ padding: "10px 8px" }}>Score</th>
            <th style={{ padding: "10px 8px" }}>Regime</th>
            <th style={{ padding: "10px 8px" }}>Link</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.id}-${item.symbol}`} style={{ borderBottom: "1px solid #222" }}>
              <td style={{ padding: "10px 8px" }}>
                <div style={{ fontWeight: 600 }}>{item.symbol}</div>
                <div style={{ opacity: 0.75 }}>{item.name}</div>
              </td>
              <td style={{ padding: "10px 8px" }}>{formatPrice(item.price)}</td>
              <td style={{ padding: "10px 8px" }}>{formatPct(item.chg_24h_pct)}</td>
              <td style={{ padding: "10px 8px" }}>{item.confidence_score}</td>
              <td style={{ padding: "10px 8px" }}>{item.regime}</td>
              <td style={{ padding: "10px 8px" }}>
                <a
                  href={item.affiliate_url || item.binance_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Trade
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
