"use client";

import React, { useEffect, useMemo, useState } from "react";

type ScanAsset = {
  // API may return either `symbol` or legacy `asset`
  symbol?: string;
  asset?: string;

  name?: string;
  price?: number;

  chg_24h_pct?: number;
  chg_7d_pct?: number;
  chg_30d_pct?: number;

  stability_score?: number;
  rating?: string; // "A".."E" (or similar)
  regime?: string; // "STABLE" | "TRANSITION" | "VOLATILE" | ...

  binance_url?: string; // affiliate link already built by API
};

type ApiError = { code?: string; message?: string };

type ScanResponse = {
  ok: boolean;
  ts?: number;
  data?: ScanAsset[];
  error?: ApiError;
};

function fmtPct(n?: number) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)}%`;
}

function fmtPrice(n?: number) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 8 }).format(n);
}

function safeStr(s?: string) {
  return s && s.trim().length ? s.trim() : "—";
}

function nowHHMMSS(d = new Date()) {
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function normalizeRegime(r?: string) {
  const v = String(r || "").toUpperCase().trim();
  if (!v) return "—";
  // keep original words if already correct
  if (v === "STABLE" || v === "TRANSITION" || v === "VOLATILE") return v;
  return v;
}

function regimeDotColor(regime?: string) {
  const v = String(regime || "").toUpperCase();
  if (v === "STABLE") return "#1A7F37"; // green-ish
  if (v === "TRANSITION") return "#B87333"; // bronze-ish
  if (v === "VOLATILE") return "#B42318"; // red-ish
  return "rgba(0,0,0,0.35)";
}

function pctColor(pct?: number) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return "#111";
  if (pct > 0) return "#1A7F37";
  if (pct < 0) return "#B42318";
  return "#111";
}

function resolveAssetLabel(a: ScanAsset) {
  // Priority: symbol > asset > name
  const sym = safeStr(a.symbol);
  if (sym !== "—") return sym;

  const legacy = safeStr(a.asset);
  if (legacy !== "—") return legacy;

  const nm = safeStr(a.name);
  return nm;
}

function resolveBinanceHref(a: ScanAsset) {
  const url = a.binance_url;
  if (url && url.startsWith("http")) return url;
  return null;
}

export default function Page() {
  const [data, setData] = useState<ScanAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [lastTs, setLastTs] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/scan", { cache: "no-store" });
      const json = (await res.json()) as ScanResponse;

      if (!json.ok) throw new Error(json.error?.message || "Scan failed");

      const rows = Array.isArray(json.data) ? json.data : [];
      setData(rows);

      const ts = typeof json.ts === "number" ? json.ts : Date.now();
      setLastTs(ts);
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = data.length;

    const stableCount = data.reduce((acc, a) => acc + (normalizeRegime(a.regime) === "STABLE" ? 1 : 0), 0);

    const ratingAorBCount = data.reduce((acc, a) => {
      const r = String(a.rating || "").toUpperCase();
      return acc + (r === "A" || r === "B" ? 1 : 0);
    }, 0);

    // Your current UI shows 73% as "Confiance".
    // Keep the logic: stable share (rounded).
    const confidence = total > 0 ? Math.round((stableCount / total) * 100) : 0;

    // "Mouvements 24h": show top movers by ABS(24h%) but keep the column sorted by abs change
    const movers24h = [...data]
      .filter((a) => typeof a.chg_24h_pct === "number" && !Number.isNaN(a.chg_24h_pct))
      .sort((a, b) => Math.abs((b.chg_24h_pct as number) ?? 0) - Math.abs((a.chg_24h_pct as number) ?? 0))
      .slice(0, 12);

    return { total, stableCount, ratingAorBCount, confidence, movers24h };
  }, [data]);

  // ---- Styles (Apple-like minimal, trading-grade clarity) ----
  const shell: React.CSSProperties = {
    maxWidth: 960,
    margin: "0 auto",
    padding: "18px 16px 32px",
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Segoe UI, Roboto, Helvetica, Arial',
    color: "#111",
    background: "transparent",
  };

  const topRow: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 14,
  };

  const h1: React.CSSProperties = {
    fontSize: 28,
    letterSpacing: -0.6,
    margin: "2px 0 4px",
    fontWeight: 800,
  };

  const sub: React.CSSProperties = {
    opacity: 0.75,
    fontSize: 13,
    margin: 0,
  };

  const btn: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    lineHeight: 1,
    minWidth: 92,
  };

  const card: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 14,
    padding: 14,
    background: "#fff",
  };

  const cardHeaderRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  };

  const sectionTitle: React.CSSProperties = {
    margin: "16px 0 10px",
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: -0.2,
  };

  const pill: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    whiteSpace: "nowrap",
    background: "#fff",
  };

  const muted: React.CSSProperties = { opacity: 0.78 };

  const note: React.CSSProperties = {
    marginTop: 8,
    opacity: 0.78,
    fontSize: 12,
    lineHeight: 1.35,
  };

  const tableWrap: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 14,
    background: "#fff",
    overflow: "hidden",
  };

  const table: React.CSSProperties = {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    fontSize: 13,
  };

  const th: React.CSSProperties = {
    textAlign: "left",
    fontSize: 12,
    opacity: 0.7,
    fontWeight: 800,
    padding: "12px 12px",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    background: "rgba(0,0,0,0.02)",
  };

  const td: React.CSSProperties = {
    padding: "12px 12px",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    verticalAlign: "middle",
  };

  const tdRight: React.CSSProperties = { ...td, textAlign: "right" };

  const assetCell: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  };

  const assetMark: React.CSSProperties = {
    width: 18,
    height: 4,
    borderRadius: 99,
    background: "rgba(0,0,0,0.22)",
    flex: "0 0 auto",
  };

  const assetText: React.CSSProperties = {
    fontWeight: 800,
    letterSpacing: -0.2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const regimeCell: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 800,
  };

  const dot: React.CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: 99,
    background: "rgba(0,0,0,0.35)",
    display: "inline-block",
  };

  const linkBtn: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 12,
    padding: "8px 10px",
    background: "#fff",
    fontWeight: 800,
    fontSize: 12,
    textDecoration: "none",
    color: "#111",
    whiteSpace: "nowrap",
  };

  const empty: React.CSSProperties = { ...card, opacity: 0.75 };

  // ---- UI ----
  return (
    <main style={shell}>
      <div style={topRow}>
        <div>
          <div style={h1}>Zilkara</div>
          <p style={sub}>
            {loading ? "Chargement…" : err ? "Erreur" : "OK"} — {stats.total} actifs{" "}
            {lastTs ? `· Mis à jour: ${nowHHMMSS(new Date(lastTs))}` : ""}
          </p>
        </div>

        <button style={btn} onClick={() => void load()} disabled={loading} aria-label="Refresh" title="Refresh">
          Refresh
        </button>
      </div>

      {err ? (
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Impossible de charger</div>
          <div style={{ opacity: 0.85, fontSize: 13 }}>{err}</div>
        </div>
      ) : null}

      {/* Indice contextuel */}
      <div style={card}>
        <div style={cardHeaderRow}>
          <div style={{ fontWeight: 900, fontSize: 14 }}>Indice contextuel</div>
          <div style={pill}>
            <span style={muted}>Confiance:</span> <span style={{ fontWeight: 900 }}>{stats.confidence}%</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={pill}>
            <span style={muted}>STABLE:</span> {stats.stableCount}/{stats.total}
          </div>
          <div style={pill}>
            <span style={muted}>Référence:</span> 24h
          </div>
          <div style={pill}>
            <span style={muted}>RFS:</span> Filtrage & régulation du risque
          </div>
        </div>

        <div style={note}>
          Objectif: filtrer le contexte et réguler le risque. Lecture rapide, discipline d’abord.
        </div>
      </div>

      {/* Table Mouvements 24h */}
      <div style={sectionTitle}>Mouvements 24h</div>

      {loading ? (
        <div style={empty}>Scan en cours…</div>
      ) : stats.movers24h.length === 0 ? (
        <div style={empty}>Aucun résultat compatible.</div>
      ) : (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Asset</th>
                <th style={th}>Price</th>
                <th style={th}>24h</th>
                <th style={th}>Score</th>
                <th style={th}>Régime</th>
                <th style={{ ...th, textAlign: "center" }}>Binance</th>
              </tr>
            </thead>

            <tbody>
              {stats.movers24h.map((a, i) => {
                const label = resolveAssetLabel(a);
                const pct = a.chg_24h_pct;
                const regime = normalizeRegime(a.regime);
                const href = resolveBinanceHref(a);
                const score =
                  typeof a.stability_score === "number" && !Number.isNaN(a.stability_score)
                    ? Math.round(a.stability_score)
                    : typeof (a as any).score === "number"
                      ? Math.round((a as any).score)
                      : "—";

                return (
                  <tr key={`${label}-${i}`}>
                    <td style={td}>
                      <div style={assetCell}>
                        <span style={assetMark} aria-hidden="true" />
                        <span style={assetText} title={label}>
                          {label}
                        </span>
                      </div>
                    </td>

                    <td style={td}>{fmtPrice(a.price)}</td>

                    <td style={{ ...td, fontWeight: 900, color: pctColor(pct) }}>{fmtPct(pct)}</td>

                    <td style={td}>{score}</td>

                    <td style={td}>
                      <span style={regimeCell}>
                        <span style={{ ...dot, background: regimeDotColor(regime) }} aria-hidden="true" />
                        {safeStr(regime)}
                      </span>
                    </td>

                    <td style={{ ...td, textAlign: "center" }}>
                      {href ? (
                        <a href={href} target="_blank" rel="noreferrer" style={linkBtn}>
                          Ouvrir
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
