"use client";

import { useEffect, useState } from "react";

const API = "/api/scan";

function ratingColor(rating) {
  if (rating === "A") return "#16a34a"; // vert
  if (rating === "B") return "#ea580c"; // orange
  if (rating === "C") return "#6b7280"; // gris
  return "#6b7280";
}

function regimeColor(regime) {
  if (regime === "STABLE") return "#16a34a";
  if (regime === "VOLATILE") return "#dc2626";
  return "#6b7280";
}

export default function Page() {

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ts, setTs] = useState(null);

  async function load() {
    try {
      const res = await fetch(API, { cache: "no-store" });
      const json = await res.json();

      if (json?.data) {

        const sorted = json.data.sort(
          (a, b) => b.stability_score - a.stability_score
        );

        setData(sorted);
        setTs(json.ts);
      }

    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  }

  useEffect(() => {

    load();

    const interval = setInterval(load, 30000);

    return () => clearInterval(interval);

  }, []);

  return (
    <main style={{
      padding: 20,
      fontFamily: "serif",
      maxWidth: 900,
      margin: "0 auto"
    }}>

      {/* HEADER */}

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>

        <h1 style={{
          fontSize: 32,
          fontWeight: 600
        }}>
          Zilkara
        </h1>

        <button
          onClick={load}
          style={{
            fontSize: 14,
            cursor: "pointer"
          }}
        >
          Refresh
        </button>

      </div>

      <div style={{
        marginBottom: 20,
        color: "#666"
      }}>
        OK — {data.length} actifs
      </div>

      {/* TABLE */}

      <div style={{
        overflowX: "auto"
      }}>

        <table style={{
          width: "100%",
          borderCollapse: "collapse"
        }}>

          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>Asset</th>
              <th>Price</th>
              <th>24h</th>
              <th>7d</th>
              <th>Score</th>
              <th>Rating</th>
              <th>Regime</th>
            </tr>
          </thead>

          <tbody>

            {loading && (
              <tr>
                <td colSpan="7">Loading...</td>
              </tr>
            )}

            {!loading && data.map((a, i) => (

              <tr key={i}>

                <td>
                  <a
                    href={a.binance_url}
                    target="_blank"
                    style={{
                      textDecoration: "none",
                      color: "black",
                      fontWeight: 500
                    }}
                  >
                    {a.asset}
                  </a>
                </td>

                <td>
                  {a.price.toFixed(4)}
                </td>

                <td style={{
                  color: a.chg_24h_pct >= 0 ? "#16a34a" : "#dc2626"
                }}>
                  {a.chg_24h_pct.toFixed(2)}%
                </td>

                <td style={{
                  color: a.chg_7d_pct >= 0 ? "#16a34a" : "#dc2626"
                }}>
                  {a.chg_7d_pct.toFixed(2)}%
                </td>

                <td>
                  {a.stability_score}
                </td>

                <td style={{
                  color: ratingColor(a.rating),
                  fontWeight: 600
                }}>
                  {a.rating}
                </td>

                <td style={{
                  color: regimeColor(a.regime),
                  fontWeight: 600
                }}>
                  {a.regime}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {/* FOOTER */}

      {ts && (
        <div style={{
          marginTop: 20,
          fontSize: 12,
          color: "#888"
        }}>
          Updated: {new Date(ts).toLocaleTimeString()}
        </div>
      )}

    </main>
  );
}
