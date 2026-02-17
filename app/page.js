"use client";

import { useEffect, useState } from "react";

export default function Home() {

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  async function fetchScan() {
    try {
      const res = await fetch("/api/scan", { cache: "no-store" });
      const json = await res.json();

      if (json?.data) {
        setData(json.data);
        setLastUpdate(new Date());
      }

    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {

    fetchScan();

    const interval = setInterval(() => {
      fetchScan();
    }, 60000);

    return () => clearInterval(interval);

  }, []);

  return (

    <main style={{
      padding: "20px",
      fontFamily: "system-ui",
      background: "#0b0f17",
      color: "#e6edf3",
      minHeight: "100vh"
    }}>

      <h1 style={{
        fontSize: "24px",
        marginBottom: "10px"
      }}>
        Zilkara Scanner
      </h1>

      <p style={{
        fontSize: "12px",
        color: "#8b949e",
        marginBottom: "20px"
      }}>
        Last update: {lastUpdate ? lastUpdate.toLocaleTimeString() : "..."}
      </p>

      {loading ? (

        <p>Loading...</p>

      ) : (

        <table style={{
          width: "100%",
          borderCollapse: "collapse"
        }}>

          <thead>
            <tr style={{
              borderBottom: "1px solid #30363d"
            }}>
              <th align="left">Symbol</th>
              <th align="right">Price</th>
              <th align="right">Score</th>
              <th align="center">Rating</th>
              <th align="center">Regime</th>
            </tr>
          </thead>

          <tbody>

            {data
              .sort((a, b) => b.score - a.score)
              .map((asset, index) => (

                <tr key={index} style={{
                  borderBottom: "1px solid #161b22"
                }}>

                  <td>{asset.symbol}</td>

                  <td align="right">
                    {asset.price?.toFixed?.(4) ?? "-"}
                  </td>

                  <td align="right">
                    {asset.score}
                  </td>

                  <td align="center">
                    {asset.rating}
                  </td>

                  <td align="center">
                    {asset.regime}
                  </td>

                </tr>

              ))}

          </tbody>

        </table>

      )}

    </main>

  );

}
