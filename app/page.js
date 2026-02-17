"use client";

import { useEffect, useState } from "react";

export default function Home() {

  const [data, setData] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const res = await fetch("/api/scan");
      const json = await res.json();

      if (json?.data) {

        // tri par score décroissant
        const sorted = json.data.sort((a, b) => b.score - a.score);

        setData(sorted);
        setLastUpdate(new Date());
      }

    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  }

  useEffect(() => {

    loadData();

    const interval = setInterval(loadData, 60000);

    return () => clearInterval(interval);

  }, []);

  function ratingColor(rating) {

    if (rating === "A") return "#16a34a";
    if (rating === "B") return "#ca8a04";
    if (rating === "C") return "#ea580c";
    if (rating === "D") return "#dc2626";

    return "#6b7280";
  }

  return (

    <main style={{
      padding: "20px",
      fontFamily: "system-ui",
      maxWidth: "700px",
      margin: "0 auto"
    }}>

      <h1 style={{
        fontSize: "28px",
        marginBottom: "5px"
      }}>
        Zilkara
      </h1>

      <div style={{
        fontSize: "14px",
        color: "#666",
        marginBottom: "20px"
      }}>
        {loading
          ? "Loading..."
          : `OK — ${data.length} actifs`
        }
      </div>

      <table style={{
        width: "100%",
        borderCollapse: "collapse"
      }}>

        <thead>
          <tr style={{
            textAlign: "left",
            fontSize: "13px",
            color: "#666"
          }}>
            <th>Asset</th>
            <th>Score</th>
            <th>Rating</th>
            <th>Regime</th>
          </tr>
        </thead>

        <tbody>

          {data.map((asset, i) => (

            <tr key={i} style={{
              borderTop: "1px solid #eee",
              fontSize: "15px"
            }}>

              <td style={{ padding: "8px 0" }}>
                {asset.symbol}
              </td>

              <td>
                {asset.score}
              </td>

              <td style={{
                color: ratingColor(asset.rating),
                fontWeight: "600"
              }}>
                {asset.rating}
              </td>

              <td style={{
                color: asset.regime === "STABLE"
                  ? "#16a34a"
                  : "#ea580c"
              }}>
                {asset.regime}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

      <div style={{
        marginTop: "15px",
        fontSize: "12px",
        color: "#999"
      }}>
        auto refresh 60s
      </div>

    </main>
  );
}
