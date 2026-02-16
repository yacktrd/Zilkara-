"use client";

import { useEffect, useState } from "react";

type Asset = {
  asset: string;
  price: number;
  chg_24h_pct: number;
  stability_score: number;
  rating: string;
  regime: string;
};

export default function Scanner() {
  const [data, setData] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/scan")
      .then(res => res.json())
      .then(json => {
        setData(json.data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Zilkara Scanner</h1>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
  <thead>
<tr>
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
{data.map(asset => (
<tr key={asset.asset}>
  <td>{asset.asset}</td>

  <td>{asset.price.toLocaleString()}</td>

  <td style={{color: asset.chg_24h_pct >= 0 ? "green" : "red"}}>
    {asset.chg_24h_pct.toFixed(2)}%
  </td>

  <td style={{color: asset.chg_7d_pct >= 0 ? "green" : "red"}}>
    {asset.chg_7d_pct.toFixed(2)}%
  </td>

  <td>{asset.stability_score}</td>

  <td>{asset.rating}</td>

  <td>{asset.regime}</td>

</tr>
))}
</tbody>
