export const dynamic = "force-dynamic";

async function getScan() {
  try {
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000";

    // IMPORTANT: VERCEL_URL est souvent sans protocole -> on force https
    const normalizedBase = base.startsWith("http")
      ? base
      : `https://${base}`;

    const url = `${normalizedBase}/api/scan?limit=250`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { ok: false, data: [], meta: null };

    return res.json();
  } catch {
    return { ok: false, data: [], meta: null };
  }
}

function toDate(meta) {
  if (!meta?.updatedAt) return null;
  const ts = meta.updatedAt;
  // seconds vs ms
  const ms = ts > 1e12 ? ts : ts * 1000;
  return new Date(ms);
}

function fmtPrice(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function fmtPct(x) {
  if (x == null) return "—";
  const pct = Number(x) * 100;
  return `${pct.toFixed(2)}%`;
}

export default async function Home() {
  const json = await getScan();

  const data = (json?.data || [])
    .slice()
    .sort((a, b) => (b.stability_score ?? 0) - (a.stability_score ?? 0));

  const updated = toDate(json?.meta);

  return (
    <main style={{ padding: 16, background: "#0b0f1a", minHeight: "100vh", color: "white" }}>
      {/* Auto-refresh simple (server page reload) */}
      <meta httpEquiv="refresh" content="60" />

      <h2 style={{ margin: 0 }}>Zilkara Scanner</h2>

      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8, marginBottom: 12 }}>
        {json?.meta ? (
          <>
            Assets: {json.meta.count} | Updated: {updated ? updated.toLocaleTimeString() : "—"}
          </>
        ) : (
          "No meta"
        )}
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #1f2a44", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#101a33" }}>
              <th style={{ padding: 10 }}>Symbol</th>
              <th style={{ padding: 10, textAlign: "right" }}>Price</th>
              <th style={{ padding: 10, textAlign: "right" }}>24h</th>
              <th style={{ padding: 10, textAlign: "right" }}>7d</th>
              <th style={{ padding: 10, textAlign: "right" }}>30d</th>
              <th style={{ padding: 10, textAlign: "right" }}>Score</th>
              <th style={{ padding: 10 }}>Rating</th>
              <th style={{ padding: 10 }}>Regime</th>
            </tr>
          </thead>

          <tbody>
            {data.map((a, i) => (
              <tr key={i} style={{ borderTop: "1px solid #1f2a44" }}>
                <td style={{ padding: 10, whiteSpace: "nowrap" }}>{a.symbol}</td>
                <td style={{ padding: 10, textAlign: "right", whiteSpace: "nowrap" }}>{fmtPrice(a.price)}</td>
                <td style={{ padding: 10, textAlign: "right", whiteSpace: "nowrap" }}>{fmtPct(a.chg_24h_pct)}</td>
                <td style={{ padding: 10, textAlign: "right", whiteSpace: "nowrap" }}>{fmtPct(a.chg_7d_pct)}</td>
                <td style={{ padding: 10, textAlign: "right", whiteSpace: "nowrap" }}>{fmtPct(a.chg_30d_pct)}</td>
                <td style={{ padding: 10, textAlign: "right" }}>{a.stability_score ?? "—"}</td>
                <td style={{ padding: 10 }}>{a.rating ?? "—"}</td>
                <td style={{ padding: 10 }}>{a.regime ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!json?.ok && (
        <div style={{ marginTop: 12, color: "#ff6b6b", fontSize: 12 }}>
          API error: /api/scan not OK
        </div>
      )}
    </main>
  );
}
/page.js
