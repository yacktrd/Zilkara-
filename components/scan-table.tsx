// components/scan-table.tsx
type Regime = "STABLE" | "TRANSITION" | "VOLATILE";

export type ScanAsset = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  h24: number;
  chg_24h_pct: number;
  market_cap?: number;
  volume_24h?: number;
  confidence_score: number;
  regime: Regime;
  binance_url: string;
  affiliate_url?: string;
};

type Props = {
  items: ScanAsset[];
};

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formatPrice(value: number): string {
  const n = safeNumber(value, NaN);

  if (!Number.isFinite(n)) return "-";
  if (Math.abs(n) >= 1000) {
    return n.toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  if (Math.abs(n) >= 1) {
    return n.toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });
  }

  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  });
}

function formatPct(value: number): string {
  const n = safeNumber(value, NaN);
  if (!Number.isFinite(n)) return "-";

  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function formatCompactNumber(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";

  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function getTradeUrl(item: ScanAsset): string {
  const affiliate = item.affiliate_url?.trim();
  const binance = item.binance_url?.trim();

  if (affiliate) return affiliate;
  if (binance) return binance;
  return "https://www.binance.com/en/markets";
}

function getRegimeBadgeStyle(regime: Regime): React.CSSProperties {
  switch (regime) {
    case "STABLE":
      return {
        border: "1px solid rgba(34,197,94,0.25)",
        background: "rgba(34,197,94,0.10)",
        color: "#86efac",
      };

    case "TRANSITION":
      return {
        border: "1px solid rgba(250,204,21,0.25)",
        background: "rgba(250,204,21,0.10)",
        color: "#fde68a",
      };

    case "VOLATILE":
      return {
        border: "1px solid rgba(248,113,113,0.25)",
        background: "rgba(248,113,113,0.10)",
        color: "#fca5a5",
      };

    default:
      return {
        border: "1px solid rgba(115,115,115,0.25)",
        background: "rgba(115,115,115,0.10)",
        color: "#d4d4d4",
      };
  }
}

function getPctColor(value: number): string {
  if (!Number.isFinite(value)) return "#a3a3a3";
  if (value > 0) return "#86efac";
  if (value < 0) return "#fca5a5";
  return "#d4d4d4";
}

function getScoreColor(score: number): string {
  if (!Number.isFinite(score)) return "#a3a3a3";
  if (score >= 80) return "#86efac";
  if (score >= 60) return "#fde68a";
  if (score >= 40) return "#fdba74";
  return "#fca5a5";
}

function EmptyState() {
  return (
    <div
      style={{
        border: "1px solid #262626",
        background: "rgba(23,23,23,0.65)",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: "#f5f5f5" }}>
        Aucun résultat
      </div>
      <div style={{ marginTop: 6, fontSize: 14, color: "#a3a3a3" }}>
        Le scan a répondu, mais aucun actif exploitable n’a été retourné.
      </div>
    </div>
  );
}

function MobileCard({ item }: { item: ScanAsset }) {
  const pct = safeNumber(item.chg_24h_pct, NaN);
  const score = safeNumber(item.confidence_score, NaN);

  return (
    <div
      style={{
        border: "1px solid #262626",
        background: "rgba(23,23,23,0.65)",
        borderRadius: 16,
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#fafafa" }}>
            {item.symbol}
          </div>
          <div style={{ marginTop: 2, fontSize: 13, color: "#a3a3a3" }}>
            {item.name}
          </div>
        </div>

        <span
          style={{
            ...getRegimeBadgeStyle(item.regime),
            borderRadius: 999,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {item.regime}
        </span>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "#737373" }}>Prix</div>
          <div style={{ marginTop: 3, fontSize: 14, color: "#f5f5f5" }}>
            {formatPrice(item.price)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "#737373" }}>24h</div>
          <div
            style={{
              marginTop: 3,
              fontSize: 14,
              color: getPctColor(pct),
              fontWeight: 600,
            }}
          >
            {formatPct(pct)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "#737373" }}>Score</div>
          <div
            style={{
              marginTop: 3,
              fontSize: 14,
              color: getScoreColor(score),
              fontWeight: 700,
            }}
          >
            {Number.isFinite(score) ? score : "-"}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "#737373" }}>Volume 24h</div>
          <div style={{ marginTop: 3, fontSize: 14, color: "#d4d4d4" }}>
            {formatCompactNumber(item.volume_24h)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "#737373" }}>Market cap</div>
          <div style={{ marginTop: 3, fontSize: 14, color: "#d4d4d4" }}>
            {formatCompactNumber(item.market_cap)}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <a
          href={getTradeUrl(item)}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 38,
            padding: "0 14px",
            borderRadius: 10,
            border: "1px solid #404040",
            color: "#fafafa",
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Trade
        </a>
      </div>
    </div>
  );
}

export function ScanTable({ items }: Props) {
  if (!Array.isArray(items) || items.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <div className="md:hidden" style={{ display: "grid", gap: 12 }}>
        {items.map((item) => (
          <MobileCard key={`${item.id}-${item.symbol}`} item={item} />
        ))}
      </div>

      <div
        className="hidden md:block"
        style={{
          display: "none",
        }}
      >
        <div
          style={{
            overflowX: "auto",
            border: "1px solid #262626",
            borderRadius: 18,
            background: "rgba(23,23,23,0.72)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
              minWidth: 980,
            }}
          >
            <thead>
              <tr
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #262626",
                  background: "rgba(10,10,10,0.55)",
                }}
              >
                <th style={{ padding: "14px 14px", color: "#a3a3a3", fontWeight: 600 }}>
                  Asset
                </th>
                <th style={{ padding: "14px 14px", color: "#a3a3a3", fontWeight: 600 }}>
                  Price
                </th>
                <th style={{ padding: "14px 14px", color: "#a3a3a3", fontWeight: 600 }}>
                  24h
                </th>
                <th style={{ padding: "14px 14px", color: "#a3a3a3", fontWeight: 600 }}>
                  Score
                </th>
                <th style={{ padding: "14px 14px", color: "#a3a3a3", fontWeight: 600 }}>
                  Regime
                </th>
                <th style={{ padding: "14px 14px", color: "#a3a3a3", fontWeight: 600 }}>
                  Market Cap
                </th>
                <th style={{ padding: "14px 14px", color: "#a3a3a3", fontWeight: 600 }}>
                  Volume 24h
                </th>
                <th style={{ padding: "14px 14px", color: "#a3a3a3", fontWeight: 600 }}>
                  Link
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => {
                const pct = safeNumber(item.chg_24h_pct, NaN);
                const score = safeNumber(item.confidence_score, NaN);

                return (
                  <tr
                    key={`${item.id}-${item.symbol}`}
                    style={{
                      borderBottom: "1px solid #1f1f1f",
                    }}
                  >
                    <td style={{ padding: "14px 14px" }}>
                      <div style={{ fontWeight: 700, color: "#fafafa" }}>
                        {item.symbol}
                      </div>
                      <div style={{ marginTop: 3, color: "#8a8a8a", fontSize: 13 }}>
                        {item.name}
                      </div>
                    </td>

                    <td style={{ padding: "14px 14px", color: "#e5e5e5" }}>
                      {formatPrice(item.price)}
                    </td>

                    <td
                      style={{
                        padding: "14px 14px",
                        color: getPctColor(pct),
                        fontWeight: 600,
                      }}
                    >
                      {formatPct(pct)}
                    </td>

                    <td
                      style={{
                        padding: "14px 14px",
                        color: getScoreColor(score),
                        fontWeight: 700,
                      }}
                    >
                      {Number.isFinite(score) ? score : "-"}
                    </td>

                    <td style={{ padding: "14px 14px" }}>
                      <span
                        style={{
                          ...getRegimeBadgeStyle(item.regime),
                          borderRadius: 999,
                          padding: "4px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.regime}
                      </span>
                    </td>

                    <td style={{ padding: "14px 14px", color: "#d4d4d4" }}>
                      {formatCompactNumber(item.market_cap)}
                    </td>

                    <td style={{ padding: "14px 14px", color: "#d4d4d4" }}>
                      {formatCompactNumber(item.volume_24h)}
                    </td>

                    <td style={{ padding: "14px 14px" }}>
                      <a
                        href={getTradeUrl(item)}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 34,
                          padding: "0 12px",
                          borderRadius: 10,
                          border: "1px solid #404040",
                          color: "#fafafa",
                          textDecoration: "none",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        Trade
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .md\\:hidden {
            display: none !important;
          }

          .md\\:block {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
