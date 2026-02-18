"use client";

import { useEffect, useMemo, useState } from "react";

function fmtNumberFR(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--";

  const abs = Math.abs(n);
  const digits = abs >= 1 ? 2 : abs >= 0.1 ? 4 : 6;

  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(n);
}

function fmtPctFR(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--";
  const sign = n > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)}%`;
}

export default function Page() {
  const [data, setData] = useState([]);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/scan", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      setOk(Boolean(json?.ok));
      setData(Array.isArray(json?.data) ? json.data : []);
    } catch (e) {
      setErr(e?.message || "Erreur");
      setOk(false);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    return (data || []).slice().sort((a, b) => {
      // tri stable : stability_score desc si présent, sinon asset asc
      const sa = Number(a?.stability_score);
      const sb = Number(b?.stability_score);
      const hasA = Number.isFinite(sa);
      const hasB = Number.isFinite(sb);
      if (hasA && hasB) return sb - sa;
      if (hasA && !hasB) return -1;
      if (!hasA && hasB) return 1;
      return String(a?.asset || "").localeCompare(String(b?.asset || ""));
    });
  }, [data]);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "32px 16px" }}>
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ fontSize: 44, lineHeight: 1.05, margin: 0 }}>Zilkara</h1>
          <div style={{ fontSize: 16, opacity: 0.7 }}>
            {loading ? "..." : ok ? "OK" : "KO"} — {rows.length} actifs
          </div>
        </div>
       <div style={{
            opacity: 0.6,
            fontSize: 12,
            marginBottom: 10
        }}>
        Live Market Scanner
        </div>

        <button
          onClick={load}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            background: "white",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </header>

      {err ? (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            border: "1px solid rgba(255,0,0,0.25)",
            background: "rgba(255,0,0,0.04)",
            marginBottom: 16,
          }}
        >
          Erreur: {err}
        </div>
      ) : null}

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 520,
          }}
        >
        <thead>
  <tr style={{ textAlign: "left", opacity: 0.85 }}>
    <th style={{ padding: "10px 0" }}>Asset</th>
    <th style={{ padding: "10px 0" }}>Score</th>
    <th style={{ padding: "10px 0" }}>Price</th>
    <th style={{ padding: "10px 0" }}>24h</th>
    <th style={{ padding: "10px 0" }}>7d</th>
    <th style={{ padding: "10px 0" }}>Regime</th>
    <th style={{ padding: "10px 0" }}>Trade</th>
  </tr>
</thead>
    <tbody>
{rows.map((r) => {

const score = Number(r.stability_score || 0)

const scoreColor =
score >= 90 ? "#16c784" :
score >= 75 ? "#f0b90b" :
"#ea3943"

const ratingBg =
r.rating === "A" ? "#16c784" :
r.rating === "B" ? "#f0b90b" :
"#ea3943"

return (

<tr key={r.asset} style={{
borderBottom: "1px solid rgba(255,255,255,0.06)",
cursor: "default"
}}>

<td style={{
fontWeight: 700,
fontSize: 16
}}>
{r.asset}
</td>

<td style={{
fontWeight: 800,
color: scoreColor,
fontSize: 18
}}>
{score}
</td>

<td>
<span style={{
background: ratingBg,
color: "white",
padding: "4px 8px",
borderRadius: 6,
fontWeight: 700,
fontSize: 12
}}>
{r.rating}
</span>
</td>

<td className="hide-mobile">
{fmtPctFR(r.chg_24h_pct)}
</td>

<td className="hide-mobile">
{fmtPctFR(r.chg_7d_pct)}
</td>

<td>

<a
href={r.binance_url}
target="_blank"
rel="noopener noreferrer"
style={{
background: "#f0b90b",
color: "black",
padding: "6px 12px",
borderRadius: 6,
fontWeight: 700,
textDecoration: "none"
}}
>

Trade

</a>

</td>

</tr>

)

})}
</tbody>
