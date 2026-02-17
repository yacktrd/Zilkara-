// app/page.js
"use client";

import { useEffect, useMemo, useState } from "react";

function fmtPrice(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  // affichage simple, propre
  if (v >= 100) return v.toFixed(2);
  if (v >= 1) return v.toFixed(3);
  if (v >= 0.1) return v.toFixed(4);
  return v.toFixed(6);
}

function fmtPct(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

export default function Page() {
  const [assets, setAssets] = useState([]);
  const [status, setStatus] = useState("LOADING");
  const [count, setCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Mode UI
  const [mode, setMode] = useState("ALL"); // ALL / STABLE / VOLATILE

  // Settings UI (tu peux les rendre plus tard réglables)
  const limit = 20;
  const minScore = 90;
  const ratings = "A,B";

  const fetchData = async () => {
    try {
      setStatus("LOADING");

      const qs = new URLSearchParams({
        limit: String(limit),
        minScore: String(minScore),
        mode,
        ratings,
      });

      // no-store pour éviter cache navigateur
      const res = await fetch(`/api/scan?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json();

      if (!json?.ok) {
        setStatus("ERROR");
        setAssets([]);
        setCount(0);
        return;
      }

      setAssets(Array.isArray(json.data) ? json.data : []);
      setCount(Number(json.count || 0));
      setLastUpdate(new Date());
      setStatus("OK");
    } catch (e) {
      setStatus("ERROR");
      setAssets([]);
      setCount(0);
    }
  };

  // auto-refresh : 60s
  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const headerRight = useMemo(() => {
    if (status === "LOADING") return "Loading...";
    if (status === "ERROR") return "Error";
    return `OK — ${count} actifs`;
  }, [status, count]);

  return (
    <main style={styles.main}>
      <div style={styles.topbar}>
        <div>
          <div style={styles.title}>Zilkara</div>
          <div style={styles.sub}>
            {headerRight}
            {lastUpdate ? (
              <span style={styles.dot}>
                {" "}
                • {lastUpdate.toLocaleTimeString()}
              </span>
            ) : null}
          </div>
        </div>

        <button onClick={fetchData} style={styles.refreshBtn}>
          Refresh
        </button>
      </div>

      <div style={styles.filters}>
        <button
          onClick={() => setMode("ALL")}
          style={{ ...styles.filterBtn, ...(mode === "ALL" ? styles.filterBtnActive : {}) }}
        >
          ALL
        </button>
        <button
          onClick={() => setMode("STABLE")}
          style={{ ...styles.filterBtn, ...(mode === "STABLE" ? styles.filterBtnActive : {}) }}
        >
          STABLE
        </button>
        <button
          onClick={() => setMode("VOLATILE")}
          style={{ ...styles.filterBtn, ...(mode === "VOLATILE" ? styles.filterBtnActive : {}) }}
        >
          VOLATILE
        </button>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.thLeft}>Asset</th>
              <th style={styles.th}>Price</th>
              <th style={styles.th}>24h</th>
              <th style={styles.th}>7d</th>
              <th style={styles.th}>Score</th>
              <th style={styles.th}>Rating</th>
              <th style={styles.th}>Regime</th>
              <th style={styles.th}>Link</th>
            </tr>
          </thead>

          <tbody>
            {assets.map((a) => (
              <tr key={`${a.symbol}-${a.regime}-${a.rating}`} style={styles.tr}>
                <td style={styles.tdLeft}>
                  <span style={styles.asset}>{a.symbol}</span>
                </td>
                <td style={styles.td}>{fmtPrice(a.price)}</td>
                <td style={styles.td}>{fmtPct(a.chg_24h_pct)}</td>
                <td style={styles.td}>{fmtPct(a.chg_7d_pct)}</td>
                <td style={styles.td}>{Number(a.stability_score ?? 0)}</td>
                <td style={styles.td}>{a.rating}</td>
                <td style={styles.td}>{a.regime}</td>
                <td style={styles.td}>
                  {a.binance_url ? (
                    <a href={a.binance_url} target="_blank" rel="noreferrer" style={styles.link}>
                      Binance
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}

            {status === "OK" && assets.length === 0 ? (
              <tr>
                <td colSpan={8} style={styles.empty}>
                  Aucun résultat (filtres trop stricts ?)
                </td>
              </tr>
            ) : null}

            {status === "ERROR" ? (
              <tr>
                <td colSpan={8} style={styles.empty}>
                  Erreur API /scan
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div style={styles.footer}>
        <div style={styles.footerLine}>
          Params: limit={limit} • minScore={minScore} • ratings={ratings} • mode={mode}
        </div>
      </div>
    </main>
  );
}

const styles = {
  main: {
    maxWidth: 980,
    margin: "0 auto",
    padding: "28px 18px 40px",
    fontFamily:
      'ui-serif, "New York", "Iowan Old Style", "Palatino Linotype", Palatino, serif',
  },
  topbar: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 44,
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: "-0.5px",
  },
  sub: {
    marginTop: 6,
    fontSize: 14,
    opacity: 0.75,
  },
  dot: { opacity: 0.7 },
  refreshBtn: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.15)",
    background: "transparent",
    cursor: "pointer",
    fontSize: 14,
  },
  filters: {
    display: "flex",
    gap: 10,
    margin: "10px 0 16px",
  },
  filterBtn: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.15)",
    background: "transparent",
    cursor: "pointer",
    fontSize: 13,
  },
  filterBtnActive: {
    border: "1px solid rgba(0,0,0,0.35)",
    fontWeight: 700,
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
    borderTop: "1px solid rgba(0,0,0,0.08)",
    paddingTop: 10,
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: "0 14px",
    minWidth: 820, // force horizontal scroll sur mobile
  },
  thLeft: {
    textAlign: "left",
    fontSize: 13,
    opacity: 0.6,
    fontWeight: 600,
    paddingBottom: 6,
  },
  th: {
    textAlign: "left",
    fontSize: 13,
    opacity: 0.6,
    fontWeight: 600,
    paddingBottom: 6,
  },
  tr: {
    background: "transparent",
  },
  tdLeft: {
    padding: "10px 8px",
    fontSize: 16,
    fontWeight: 700,
  },
  td: {
    padding: "10px 8px",
    fontSize: 15,
  },
  asset: {
    letterSpacing: "0.2px",
  },
  link: {
    textDecoration: "underline",
  },
  empty: {
    padding: "18px 8px",
    opacity: 0.65,
  },
  footer: {
    marginTop: 18,
    opacity: 0.65,
    fontSize: 12,
  },
  footerLine: {},
};
