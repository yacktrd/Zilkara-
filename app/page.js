export const dynamic = "force-dynamic";

async function getScan() {
  try {
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000";

    const url = base.startsWith("http")
      ? `${base}/api/scan`
      : `https://${base}/api/scan`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) return { ok: false, data: [] };

    return res.json();
  } catch {
    return { ok: false, data: [] };
  }
}

function colorScore(score) {
  if (score >= 95) return "#22c55e";
  if (score >= 85) return "#eab308";
  return "#ef4444";
}

export default async function Page() {
  const json = await getScan();
  const rows = json?.data || [];

  return (
    <main
      style={{
        background: "#0f172a",
        color: "#e5e7eb",
        minHeight: "100vh",
        padding: "24px",
        fontFamily: "system-ui"
      }}
    >
      <h1 style={{ fontSize: "28px", fontWeight: "700" }}>
        Zilkara — Market Scanner
      </h1>

      <div style={{ opacity: 0.6, marginBottom: 20 }}>
        {rows.length} assets detected
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ opacity: 0.6 }}>
            <tr>
              <th align="left">Asset</th>
              <th align="right">Price</th>
              <th align="right">24h</th>
              <th align="right">Score</th>
              <th align="center">Regime</th>
              <th align="center">Trade</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.asset} style={{ borderTop: "1px solid #1f2937" }}>
                <td>{r.asset}</td>

                <td align="right">
                  {Number(r.price).toLocaleString("en-US")}
                </td>

                <td align="right">{r.chg_24h_pct}%</td>

                <td
                  align="right"
                  style={{
                    color: colorScore(r.stability_score),
                    fontWeight: "700"
                  }}
                >
                  {r.stability_score}
                </td>

                <td align="center">{r.regime}</td>

                <td align="center">
                  <a
                    href={r.binance_url}
                    target="_blank"
                    style={{
                      color: "#3b82f6",
                      textDecoration: "none",
                      fontWeight: "600"
                    }}
                  >
                    Trade
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
