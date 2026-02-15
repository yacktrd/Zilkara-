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

    const res = await fetch(url, {
      cache: "no-store",
    });

    if (!res.ok) {
      return { ok: false, data: [] };
    }

    return res.json();

  } catch {
    return { ok: false, data: [] };
  }
}

function formatPrice(n) {
  return n?.toLocaleString("en-US", {
    maximumFractionDigits: 2
  });
}

function formatPct(n) {
  if (n == null) return "-";
  const color =
    n > 0 ? "#00ffa3" :
    n < 0 ? "#ff4d4f" :
    "#999";

  return (
    <span style={{ color }}>
      {n > 0 ? "+" : ""}{n.toFixed(2)}%
    </span>
  );
}

function getRatingColor(rating) {
  if (rating === "A") return "#00ffa3";
  if (rating === "B") return "#ffaa00";
  return "#999";
}

export default async function Home() {

  const json = await getScan();

  const data =
    json?.data
      ?.slice()
      ?.sort((a, b) =>
        b.stability_score - a.stability_score
      ) || [];

  return (
    <main style={{
      padding: 16,
      background: "#0b0f1a",
      minHeight: "100vh",
      color: "white",
      fontFamily: "system-ui"
    }}>

      <h1 style={{
        fontSize: 28,
        marginBottom: 16
      }}>
        Zilkara
      </h1>

      <div style={{
        overflowX: "auto"
      }}>

        <table style={{
          width: "100%",
          borderCollapse: "collapse"
        }}>

          <thead>
            <tr style={{
              textAlign: "left",
              borderBottom: "1px solid #222"
            }}>
              <th>Asset</th>
              <th>Price</th>
              <th>24h</th>
              <th>7d</th>
              <th>30d</th>
              <th>Score</th>
              <th>Rating</th>
            </tr>
          </thead>

          <tbody>

            {data.map(asset => (

              <tr
                key={asset.symbol}
                style={{
                  borderBottom: "1px solid #111"
                }}
              >

                <td>
                  <strong>{asset.symbol}</strong>
                </td>

                <td>
                  ${formatPrice(asset.price)}
                </td>

                <td>
                  {formatPct(asset.chg_24h_pct)}
                </td>

                <td>
                  {formatPct(asset.chg_7d_pct)}
                </td>

                <td>
                  {formatPct(asset.chg_30d_pct)}
                </td>

                <td>
                  {asset.stability_score}
                </td>

                <td>
                  <span style={{
                    color: getRatingColor(asset.rating),
                    fontWeight: "bold"
                  }}>
                    {asset.rating}
                  </span>
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </main>
  );
}
