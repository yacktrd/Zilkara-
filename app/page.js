"use client";

import { useEffect, useState } from "react";

export default function Home() {

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/state");
      const json = await res.json();

      setData(json);
      setLoading(false);

    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main style={{
      padding: "20px",
      fontFamily: "Arial",
      background: "#000",
      color: "#fff",
      minHeight: "100vh"
    }}>
      <h1>Zilkara — Market Scanner</h1>

      {loading && <p>Chargement...</p>}

      {data && data.assets && data.assets.map(asset => (

        <div key={asset.symbol} style={{
          border: "1px solid #333",
          padding: "10px",
          marginBottom: "10px"
        }}>

          <h2>{asset.name} ({asset.symbol})</h2>

          <p>Price: {asset.price}</p>
          <p>Score: {asset.stability_score}</p>
          <p>Rating: {asset.rating}</p>
          <p>Regime: {asset.regime}</p>

        </div>

      ))}

    </main>
  );
}
