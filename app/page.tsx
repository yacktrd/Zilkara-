"use client";

import { useEffect, useState } from "react";

type Asset = {
  asset: string;
  symbol: string;
  price: number;
  chg_24h_pct: number;
  chg_7d_pct: number;
  chg_30d_pct: number;
  stability_score: number;
  rating: string;
  regime: string;
  binance_url: string;
};

export default function Home() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/scan?limit=250");
      const json = await res.json();
      setAssets(json.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <main style={{ padding: 20 }}>
        <h1>Zilkara</h1>
        Loading scanner...
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Zilkara Scanner</h1>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Asset</th>
            <th align="left">Price</th>
            <th align="left">24h</th>
            <th align="left">Score</th>
            <th align="left">Rating</th>
            <th align="left">Regime</th>
            <th align="left">Link</th>
          </tr>
        </thead>

        <tbody>
          {assets.map((a) => (
            <tr key={a.symbol}>
              <td>{a.symbol}</td>

              <td>
                {a.price?.toLocaleString("fr-FR", {
                  maximumFractionDigits: 2,
                })}
              </td>

              <td
                style={{
                  color:
                    a.chg_24h_pct > 0
                      ? "#16a34a"
                      : a.chg_24h_pct < 0
                      ? "#dc2626"
                      : "#666",
                }}
              >
                {a.chg_24h_pct?.toFixed(2)}%
              </td>

              <td>{a.stability_score}</td>

              <td>{a.rating}</td>

              <td>{a.regime}</td>

              <td>
                <a href={a.binance_url} target="_blank">
                  Binance
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
