export const dynamic = "force-dynamic";

async function getScan() {
  const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/scan`, {
    cache: "no-store",
  });
  if (!r.ok) throw new Error("Scan API failed");
  return r.json();
}

export default async function Page() {
  const data = await getScan();

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ margin: 0 }}>Zilkara</h1>
      <p style={{ marginTop: 8, opacity: 0.7 }}>
        Market Scanner — live snapshot
      </p>

      <div style={{ marginTop: 18, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
              <th style={{ padding: "10px 8px" }}>Pair</th>
              <th style={{ padding: "10px 8px" }}>Price</th>
              <th style={{ padding: "10px 8px" }}>24h %</th>
              <th style={{ padding: "10px 8px" }}>24h Vol (quote)</th>
              <th style={{ padding: "10px 8px" }}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((x) => (
              <tr key={x.symbol} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "10px 8px", fontWeight: 600 }}>
                  {x.symbol}
                </td>
                <td style={{ padding: "10px 8px" }}>{x.price}</td>
                <td style={{ padding: "10px 8px" }}>{x.change24hPct}</td>
                <td style={{ padding: "10px 8px" }}>{x.quoteVolume24h}</td>
                <td style={{ padding: "10px 8px", opacity: 0.7 }}>
                  {data.ts}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
