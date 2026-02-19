"use client";

import React, { useEffect, useMemo, useState } from "react";

type ScanAsset = {
  symbol?: string;
  name?: string;
  price?: number;

  chg_24h_pct?: number;
  chg_7d_pct?: number;
  chg_30d_pct?: number;

  stability_score?: number;
  rating?: string; // e.g. "A".."E"
  regime?: string; // e.g. "STABLE" | "TRANSITION" | "VOLATILE"

  binance_url?: string;

  similarity?: number;
  rupture_rate?: number;
  reason?: string;
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
      setData(Array.isArray(json.data) ? json.data : []);
      setLastTs(typeof json.ts === "number" ? json.ts : Date.now());
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

  const summary = useMemo(() => {
    const total = data.length;

    const stable = data.reduce((acc, a) => acc + (String(a.regime || "").toUpperCase() === "STABLE" ? 1 : 0), 0);

    const ratingA = data.reduce((acc, a) => acc + (String(a.rating || "").toUpperCase() === "A" ? 1 : 0), 0);

    const confidence = total > 0 ? Math.round((stable / total) * 100) : 0;

    // shortlist = gros mouvements 24h (valeur absolue), top 8
    const shortlist = [...data]
      .filter((a) => typeof a.chg_24h_pct === "number" && !Number.isNaN(a.chg_24h_pct))
      .sort((a, b) => Math.abs(b.chg_24h_pct as number) - Math.abs(a.chg_24h_pct as number))
      .slice(0, 8);

    return { total, stable, ratingA, confidence, shortlist };
  }, [data]);

  const shell: React.CSSProperties = {
    maxWidth: 640,
    margin: "0 auto",
    padding: "16px 14px 28px",
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Segoe UI, Roboto, Helvetica, Arial',
    color: "#111",
  };

  const h1: React.CSSProperties = {
    fontSize: 28,
    letterSpacing: -0.6,
    margin: "4px 0 2px",
    fontWeight: 800,
  };

  const sub: React.CSSProperties = {
    opacity: 0.75,
    fontSize: 13,
    margin: 0,
  };

  const card: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 14,
    padding: 14,
    background: "#fff",
  };

  const row: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };

  const pill: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    whiteSpace: "nowrap",
    background: "#fff",
  };

  const btn: React.CSSProperties = {
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  };

  const sectionTitle: React.CSSProperties = {
    margin: "16px 0 8px",
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: -0.2,
  };

  const smallNote: React.CSSProperties = {
    marginTop: 8,
    opacity: 0.78,
    fontSize: 12,
    lineHeight: 1.35,
  };

  const label: React.CSSProperties = {
    fontSize: 12,
    opacity: 0.72,
    fontWeight: 700,
  };

  const big: React.CSSProperties = {
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: -0.4,
  };

  const right: React.CSSProperties = { textAlign: "right" };

  return (
    <main style={shell}>
      {/* Header minimal */}
      <div style={{ ...row, marginBottom: 14 }}>
        <div>
          <div style={h1}>Zilkara</div>
          <p style={sub}>
            {loading ? "Chargement…" : err ? "Erreur" : "OK"} — {summary.total} actifs{" "}
            {lastTs ? `· ${nowHHMMSS(new Date(lastTs))}` : ""}
          </p>
        </div>

        <button
          style={btn}
          onClick={() => void load()}
          aria-label="Refresh"
          title="Refresh"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {/* Erreur */}
      {err ? (
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Impossible de charger</div>
          <div style={{ opacity: 0.85, fontSize: 13 }}>{err}</div>
        </div>
      ) : null}

      {/* Signal global dominant */}
      <div style={card}>
        <div style={{ ...row, marginBottom: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 14 }}>Signal global</div>
          <div style={pill}>Confiance: {summary.confidence}%</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={pill}>
            STABLE: {summary.stable}/{summary.total}
          </div>
          <div style={pill}>
            Rating A: {summary.ratingA}/{summary.total}
          </div>
        </div>

        <div style={smallNote}>
          Lecture rapide: on privilégie la discipline (stabilité) avant la chasse au mouvement.
        </div>
      </div>

      {/* Shortlist */}
      <div style={sectionTitle}>Shortlist (mouvements 24h)</div>

      {loading ? (
        <div style={{ ...card, opacity: 0.75 }}>Scan en cours…</div>
      ) : summary.shortlist.length === 0 ? (
        <div style={{ ...card, opacity: 0.75 }}>Aucun mouvement 24h exploitable.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {summary.shortlist.map((a, idx) => {
            const sym = safeStr(a.symbol || a.name);
            const pct = a.chg_24h_pct;
            const pctTxt = fmtPct(pct);
            const pctColor =
              typeof pct === "number" ? (pct > 0 ? "#0A7" : pct < 0 ? "#C33" : "#111") : "#111";

            return (
              <div key={`${sym}-${idx}`} style={card}>
                <div style={row}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6 }}>{sym}</div>
                    <div style={{ fontSize: 12, opacity: 0.78 }}>
                      Prix: {fmtPrice(a.price)} · Régime: {safeStr(a.regime)} · Rating:{" "}
                      {safeStr(a.rating)}
                    </div>
                  </div>

                  <div style={right}>
                    <div style={{ ...big, color: pctColor }}>{pctTxt}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>24h</div>
                  </div>
                </div>

                {a.binance_url ? (
                  <div style={{ marginTop: 10 }}>
                    <a
                      href={a.binance_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-block",
                        fontSize: 12,
                        fontWeight: 800,
                        textDecoration: "none",
                        color: "#111",
                        border: "1px solid rgba(0,0,0,0.10)",
                        padding: "8px 10px",
                        borderRadius: 12,
                        background: "#fff",
                      }}
                    >
                      Ouvrir le marché
                    </a>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* (Optionnel) aperçu compact si tu veux garder une vue liste très légère */}
      <div style={{ marginTop: 18, opacity: 0.7, fontSize: 12 }}>
        Astuce: si tu veux une vue “table” plus tard, on la mettra derrière un toggle. Pour l’instant: focus
        sur le signal et la shortlist.
      </div>
    </main>
  );
}
